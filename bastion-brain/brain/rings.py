"""The three rings (deterministic v0 + Step 5 self-healing & character switching).

Ring 1 (KENT, NULL, SCOUT)  -> demands (signals). Never dispatches.
Ring 2 (TANK, BIG_JON, NUMNUM) -> plans, gates, and (mode permitting) dispatches typed jobs.
Ring 3 (DOZER, AUDIT) -> validates results, verifies facts, and is the only writer of bot state.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from contracts import validator as V
from contracts.validator import ContractValidationError

from . import numnum
from .events import iso, new_id

PLANNABLE_STATES = ("ACTIVE", "GROWING", "SLEEPING")
DISPATCH_HOLD_IN_SUPERVISED = frozenset({"provision_character"})
DEADLINE_MINUTES = {
    "probe_status": 15,
    "sleep": 10,
    "grow_city": 60,
    "scan_kingdom": 120,
    "switch_character": 15,
    "provision_character": 60,
    "gather": 20,
    "locate_governor": 30,
}
PROBE_STALE_MINUTES = 180
STALE_INFLIGHT_GRACE_MINUTES = 10
WAKE_RETRY_MINUTES = 10
SUSPECT_AFTER_FAILURES = 3
LOST_AFTER_FAILURES = 4
GROW_TARGET_CH = 8
SCAN_DEFAULT_RANKS = 300

DEFAULT_CONFIG = {
    "capabilities": list(numnum.DEFAULT_CAPABILITIES),
    "watched_kingdoms": [],
    "instances": list(V.INSTANCE_TO_ADB),
    "enforce_cross_instance_redundancy": False,
}

REDUNDANT_INSTANCE_PAIR = ("sidekick-mumu-0", "sidekick-mumu-1")
INSTANCE_TO_ACCOUNT = {v: k for k, v in V.ACCOUNT_TO_INSTANCE.items()}


@dataclass
class Demand:
    kind: str  # SCAN_REQUESTED (R5) | REDUNDANCY_GAP (NULL) | SCAN_DUE (NULL)
    kingdom_id: int
    priority: int
    correlation_id: str
    detail: Dict[str, Any] = field(default_factory=dict)
    intent_id: Optional[str] = None


def runtime_key(bot_id: str) -> str:
    return f"BOTRUNTIME#{bot_id}"


def instance_key(instance_id: str) -> str:
    return f"INSTANCE#{instance_id}"


def infer_account_slots(account_id: str, instance_id: str, adb_serial: str, fleet_bots: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """Fallback BastionAccountSlots record synthesized from known fleet bots when not explicitly stored."""
    kd_slots: Dict[str, List[str]] = {}
    for b in fleet_bots.values():
        if b.get("account_id") == account_id and b.get("lifecycle_state") != "RETIRED":
            kd_slots.setdefault(str(b["kingdom_id"]), []).append(b["bot_id"])
    return {
        "account_id": account_id,
        "instance_id": instance_id,
        "adb_serial": adb_serial,
        "account_status": "HEALTHY",
        "max_slots_per_kingdom": 2,
        "kingdom_slots": kd_slots,
    }


# =========================================================================== Ring 1

class Ring1:
    def __init__(self, store, emitter, clock, advisor=None, helpers=None):
        self.store, self.emitter, self.clock = store, emitter, clock
        self.advisor = advisor
        self.helpers = helpers

    def collect(self, config: Dict[str, Any], fleet_bots: Optional[Dict[str, Dict[str, Any]]] = None) -> List[Demand]:
        if config.get("enable_helpers") and self.helpers:
            for w in config.get("watched_kingdoms", []):
                if float(w.get("cadence_hours", 12)) <= 3:
                    k = int(w["kingdom_id"])
                    self.helpers.spawn_helper(
                        "R1_KINGDOM_WATCHER",
                        f"Monitor #{k} 3h surge cadence, scan staleness, and power/KP deltas.",
                        kingdom_id=k,
                        ttl_hours=12,
                    )
        return (
            self._kent_intents(config)
            + self._null_redundancy_gaps(config, fleet_bots or {})
            + self._null_staleness(config)
        )

    def _null_redundancy_gaps(self, config: Dict[str, Any], fleet_bots: Dict[str, Dict[str, Any]]) -> List[Demand]:
        if not config.get("enforce_cross_instance_redundancy"):
            return []
        inst_a, inst_b = REDUNDANT_INSTANCE_PAIR
        live = [b for b in fleet_bots.values() if b.get("lifecycle_state") not in ("RETIRED", "LOST")]
        by_kd_inst: Dict[Tuple[int, str], List[Dict[str, Any]]] = {}
        for b in live:
            if b["instance_id"] in REDUNDANT_INSTANCE_PAIR:
                by_kd_inst.setdefault((int(b["kingdom_id"]), b["instance_id"]), []).append(b)

        watched_order = [int(w["kingdom_id"]) for w in config.get("watched_kingdoms", [])]
        candidate_kds = list(dict.fromkeys(watched_order + sorted({int(b["kingdom_id"]) for b in live if int(b["kingdom_id"]) >= 4000})))
        out: List[Demand] = []
        for k in candidate_kds:
            bots_a = by_kd_inst.get((k, inst_a), [])
            bots_b = by_kd_inst.get((k, inst_b), [])
            if bool(bots_a) == bool(bots_b):
                continue  # Either both have governors (converged!) or neither does
            missing_inst = inst_b if bots_a else inst_a
            peer_inst = inst_a if bots_a else inst_b
            peer_bots = bots_a if bots_a else bots_b
            corr = f"corr_redundancy_{k}_{missing_inst[-1]}"
            peer_names = ", ".join(b["governor_name"] for b in peer_bots)
            if self.emitter.should_emit(f"REDUNDANCY_GAP:{k}:{missing_inst}"):
                self.emitter.emit(
                    ring="RING_1_INTEL", actor="NULL", event_type="SIGNAL", severity="NOTICE",
                    correlation_id=corr, kingdom_id=k, instance_id=missing_inst,
                    summary=f"#{k} has governor on {peer_inst} ({peer_names}) but no twin on {missing_inst}; convergence required",
                    why="Cross-instance redundancy rule: every active kingdom on sidekick-mumu-0 must also have a twin governor on sidekick-mumu-1 (and vice versa) for convergence and failover.",
                    trigger_inputs={
                        "signal": "REDUNDANCY_GAP",
                        "kingdom_id": k,
                        "peer_instance_id": peer_inst,
                        "peer_bot_ids": [b["bot_id"] for b in peer_bots],
                        "target_instance_id": missing_inst,
                    },
                )
            out.append(Demand(
                "REDUNDANCY_GAP", k, 65, corr,
                {"target_instance_id": missing_inst, "peer_instance_id": peer_inst, "peer_bots": peer_bots},
            ))
        return out

    def _kent_intents(self, config: Optional[Dict[str, Any]] = None) -> List[Demand]:
        demands: List[Demand] = []
        cfg = config if config is not None else {}
        supported_types = {
            "SCAN_KINGDOM": "SCAN_REQUESTED",
            "LOCATE_GOVERNOR": "LOCATE_REQUESTED",
            "EXPAND_TO_KINGDOM": "EXPAND_REQUESTED",
            "PRIORITIZE_GROWTH": "GROWTH_REQUESTED",
        }
        for intent in self.store.query_intents("PENDING"):
            try:
                V.validate_intent(intent)
            except ContractValidationError as exc:
                self.store.update_intent_status(intent["intent_id"], "REJECTED", {"rejected_reason": str(exc)[:200]})
                self.emitter.emit(ring="RING_1_INTEL", actor="KENT", event_type="INTENT_RECEIVED", severity="WARN",
                                  summary=f"Rejected malformed intent {intent.get('intent_id')}",
                                  why=f"Intent failed the contract: {exc}", trigger_inputs={"intent_id": intent.get("intent_id")})
                continue
            self.emitter.emit(ring="RING_1_INTEL", actor="KENT", event_type="INTENT_RECEIVED",
                              correlation_id=intent["correlation_id"], kingdom_id=intent.get("kingdom_id"),
                              summary=f"{intent['source']} intent {intent['intent_type']} for #{intent.get('kingdom_id')}",
                              why="New intent from Unity entered the brain; triaging into a signal.",
                              trigger_inputs={"intent_id": intent["intent_id"], "priority": intent["priority"], "payload": intent["payload"]})
            itype = intent["intent_type"]
            kd = intent.get("kingdom_id")
            if itype in supported_types and kd:
                sig_kind = supported_types[itype]
                kd_int = int(kd)
                if itype == "EXPAND_TO_KINGDOM":
                    stored_cfg = self.store.get_control("CONFIG") or dict(DEFAULT_CONFIG, **cfg)
                    watched = list(stored_cfg.get("watched_kingdoms") or [])
                    if not any(int(w["kingdom_id"]) == kd_int for w in watched):
                        cadence_h = float((intent.get("payload") or {}).get("cadence_hours", 12))
                        watched.append({"kingdom_id": kd_int, "cadence_hours": cadence_h, "source": f"{intent['source']}_EXPAND"})
                        stored_cfg["watched_kingdoms"] = watched
                        self.store.put_control("CONFIG", stored_cfg)
                        cfg["watched_kingdoms"] = watched
                if cfg.get("enable_helpers") and self.helpers:
                    self.helpers.spawn_helper(
                        "R1_LEAD_TRIAGE",
                        f"Triage {intent['source']} {itype} intent {intent['intent_id']} for #{kd_int}.",
                        kingdom_id=kd_int,
                        ttl_hours=4,
                        correlation_id=intent["correlation_id"],
                    )
                self.store.update_intent_status(intent["intent_id"], "TRIAGED_BY_SCOUT")
                why_text = {
                    "SCAN_KINGDOM": "R5 asked for a kingdom scan; missions preempt routine upkeep.",
                    "LOCATE_GOVERNOR": "R5 requested governor target verification in this kingdom.",
                    "EXPAND_TO_KINGDOM": "R5/Unity requested Bastion bot deployment into a new kingdom.",
                    "PRIORITIZE_GROWTH": "R5/Unity requested accelerated CH8 growth for this kingdom's bot.",
                }[itype]
                llm_tel = None
                if self.advisor:
                    why_text, llm_tel = self.advisor.advise(
                        "SCOUT",
                        f"Triage {itype} intent for #{kd_int}",
                        {"intent_id": intent["intent_id"], "priority": intent["priority"], "payload": intent["payload"]},
                        why_text,
                    )
                summary_text = (
                    f"R5 scan request for #{kd_int}"
                    if itype == "SCAN_KINGDOM"
                    else f"{intent['source']} {itype} signal for #{kd_int}"
                )
                self.emitter.emit(ring="RING_1_INTEL", actor="KENT", event_type="SIGNAL", correlation_id=intent["correlation_id"],
                                  kingdom_id=kd_int, summary=summary_text,
                                  why=why_text, llm_telemetry=llm_tel,
                                  trigger_inputs={"signal": sig_kind, "intent_id": intent["intent_id"], "intent_type": itype})
            else:
                self.store.update_intent_status(intent["intent_id"], "REJECTED", {"rejected_reason": f"Unsupported intent_type {itype}"})
                self.emitter.emit(ring="RING_1_INTEL", actor="KENT", event_type="SIGNAL", severity="NOTICE",
                                  correlation_id=intent["correlation_id"], kingdom_id=intent.get("kingdom_id"),
                                  summary=f"Intent {intent['intent_type']} not supported in brain v0",
                                  why="Only SCAN_KINGDOM, LOCATE_GOVERNOR, EXPAND_TO_KINGDOM, and PRIORITIZE_GROWTH intents are planned via BastionIntents.",
                                  trigger_inputs={"intent_id": intent["intent_id"]})
        for status_key in ("TRIAGED_BY_SCOUT", "PLANNED_BY_TANK"):
            for intent in self.store.query_intents(status_key):
                itype = intent.get("intent_type")
                if itype in supported_types and intent.get("kingdom_id"):
                    demands.append(Demand(
                        supported_types[itype],
                        int(intent["kingdom_id"]),
                        int(intent["priority"]),
                        intent["correlation_id"],
                        {"payload": intent.get("payload") or {}, "intent_type": itype, "source": intent.get("source")},
                        intent["intent_id"],
                    ))
        return demands

    def _null_staleness(self, config: Dict[str, Any]) -> List[Demand]:
        now = self.clock()
        out: List[Demand] = []
        for w in config.get("watched_kingdoms", []):
            k, cadence = int(w["kingdom_id"]), float(w.get("cadence_hours", 12))
            rec = self.store.get_control(f"KINGDOM#{k}") or {}
            last = numnum.parse_ts(rec.get("last_scan_verified_at"))
            age_h = None if last is None else round((now - last).total_seconds() / 3600, 1)
            if age_h is not None and age_h < cadence:
                continue
            corr = f"corr_scan_due_{k}"
            if self.emitter.should_emit(f"SCAN_DUE:{k}"):
                self.emitter.emit(ring="RING_1_INTEL", actor="NULL", event_type="SIGNAL", severity="NOTICE",
                                  correlation_id=corr, kingdom_id=k,
                                  summary=f"#{k} scan is due ({'never verified' if age_h is None else f'{age_h}h old'}; cadence {cadence:g}h)",
                                  why="Kingdom data is older than its scan cadence.",
                                  trigger_inputs={"signal": "SCAN_DUE", "last_scan_verified_at": rec.get("last_scan_verified_at"),
                                                  "age_hours": age_h, "cadence_hours": cadence,
                                                  "cadence_source": w.get("source")})
            out.append(Demand("SCAN_DUE", k, 40, corr, {"age_hours": age_h, "cadence_hours": cadence}))
        return out


# =========================================================================== Ring 2

class Ring2:
    def __init__(self, store, transport, emitter, clock, advisor=None, helpers=None):
        self.store, self.transport, self.emitter, self.clock = store, transport, emitter, clock
        self.advisor = advisor
        self.helpers = helpers
        self.recent_keys: List[str] = []

    def _consume_operator_approval(self, bot_id: str) -> bool:
        rec = self.store.get_control("APPROVED_PLANS") or {}
        ids = list(rec.get("bot_ids") or [])
        if bot_id in ids:
            rec["bot_ids"] = [b for b in ids if b != bot_id]
            self.store.put_control("APPROVED_PLANS", rec)
            return True
        return False

    def _is_operator_approved(self, bot_id: str) -> bool:
        rec = self.store.get_control("APPROVED_PLANS") or {}
        return bot_id in (rec.get("bot_ids") or [])

    def _ring_tokens(self, now: datetime) -> Optional[Tuple[int, int]]:
        return self.advisor.ring_budget("RING_2_OPS", now) if self.advisor else None

    def plan_instance(self, instance_id: str, bot: Optional[Dict[str, Any]], demands: List[Demand],
                      config: Dict[str, Any], mode: str,
                      fleet_bots: Optional[Dict[str, Dict[str, Any]]] = None) -> Optional[str]:
        """Plans at most one job for the instance's active bot. Returns an outcome label."""
        now = self.clock()
        all_bots = fleet_bots or ({bot["bot_id"]: bot} if bot else {})
        inst = self.store.get_control(instance_key(instance_id)) or {}
        if inst.get("in_flight"):
            in_f = inst["in_flight"]
            if in_f.get("job_type") in ("grow_city", "gather", "probe_status"):
                inst_kds = {int(b["kingdom_id"]) for b in all_bots.values() if b["instance_id"] == instance_id and b.get("lifecycle_state") != "RETIRED"}
                urgent = next(
                    (d for d in sorted(demands, key=lambda x: x.priority, reverse=True)
                     if d.kind in ("SCAN_REQUESTED", "LOCATE_REQUESTED", "SCAN_DUE") and int(d.kingdom_id) in inst_kds),
                    None,
                )
                if urgent is not None and not inst.get("preempt_requested_at"):
                    inst["preempt_requested_at"] = iso(now)
                    inst["preempt_reason"] = f"{urgent.kind}#{urgent.kingdom_id}"
                    self.store.put_control(instance_key(instance_id), inst)
            return "BUSY"
        lost_on_instance = next(
            (b for b in all_bots.values()
             if b["instance_id"] == instance_id and b["lifecycle_state"] == "LOST"
             and not b.get("health", {}).get("replaced_by_bot_id")),
            None,
        )
        if lost_on_instance is not None:
            return self._plan_replacement(instance_id, lost_on_instance, inst, config, mode, all_bots, now)

        if bot is None:
            return "NO_ACTIVE_BOT"

        if bot["lifecycle_state"] not in PLANNABLE_STATES:
            return f"STATE_{bot['lifecycle_state']}"

        if config.get("enable_helpers") and self.helpers:
            inst_bots = [b for b in all_bots.values() if b["instance_id"] == instance_id and b.get("lifecycle_state") != "RETIRED"]
            if len(inst_bots) >= 2:
                self.helpers.spawn_helper(
                    "R2_COHORT_SCHEDULER",
                    f"Coordinate human-like sleep/grow/scan rotation across {len(inst_bots)} characters on {instance_id}.",
                    instance_id=instance_id,
                    ttl_hours=12,
                )

        rt = numnum.fresh_runtime(self.store.get_control(runtime_key(bot["bot_id"])), bot, now)
        if bot["lifecycle_state"] == "SLEEPING":
            rt["session_started_at"] = None
            rt["last_session_end"] = None
        gap_demand = self._redundancy_gap_for(instance_id, bot, rt, demands, now, all_bots)
        if gap_demand is not None:
            twin_out = self._plan_redundancy_twin(instance_id, bot, gap_demand, inst, config, mode, all_bots, now)
            if twin_out != "DEDUPED":
                return twin_out

        choice = self._choose(bot, rt, demands, now, all_bots, config.get("capabilities", []))
        if choice is None:
            return "IDLE"
        job_type, args, priority, why, inputs, demand = choice
        job = self._build_job(job_type, args, priority, bot, demand, now)

        eval_bot = bot
        eval_rt = rt
        if job_type == "switch_character" and inputs.get("target_bot_id") and inputs["target_bot_id"] in all_bots:
            eval_bot = all_bots[inputs["target_bot_id"]]
            eval_rt = numnum.fresh_runtime(self.store.get_control(runtime_key(eval_bot["bot_id"])), eval_bot, now)
            eval_rt["session_started_at"] = None
            eval_rt["last_session_end"] = None

        ok, checks = numnum.evaluate(job, eval_bot, eval_rt, inst, now, config.get("capabilities", []), self.recent_keys,
                                     ring_tokens=self._ring_tokens(now))
        failed = sorted(c["rule_id"] for c in checks if not c["passed"])
        op_approved = self._is_operator_approved(bot["bot_id"]) or (
            job_type == "switch_character" and demand is not None and demand.intent_id is not None and demand.priority >= 80
        )
        will_dispatch = ok and mode in ("AUTONOMOUS", "SUPERVISED") and (
            mode == "AUTONOMOUS" or job_type not in DISPATCH_HOLD_IN_SUPERVISED or op_approved
        )
        fingerprint = None if will_dispatch else f"PLAN:{bot['bot_id']}:{job_type}:{ok}:{','.join(failed)}:{mode}"
        if not self.emitter.should_emit(fingerprint):
            return "DEDUPED"

        llm_tel = None
        if self.advisor:
            why, llm_tel = self.advisor.advise(
                "TANK",
                f"Plan {job_type} for {bot['governor_name']} (#{bot['kingdom_id']}) on {instance_id}",
                {"job_type": job_type, "args": args, "inputs": inputs},
                why,
            )

        common = dict(correlation_id=job["correlation_id"], kingdom_id=bot["kingdom_id"], bot_id=bot["bot_id"],
                      instance_id=instance_id, job_id=job["job_id"])
        self.emitter.emit(ring="RING_2_OPS", actor="TANK", event_type="PLAN_PROPOSED",
                          summary=f"TANK proposes {job_type} for {bot['governor_name']} (#{bot['kingdom_id']}) on {instance_id}",
                          why=why, llm_telemetry=llm_tel, trigger_inputs=dict(inputs, args=args, priority=priority), **common)
        if not ok:
            self.emitter.emit(ring="RING_2_OPS", actor="NUMNUM", event_type="PLAN_REJECTED", severity="NOTICE",
                              summary=f"NUMNUM held {job_type} for {bot['governor_name']}: {', '.join(failed)}",
                              why="One or more hard rules failed; nothing was sent to the emulator.",
                              numnum_checks=checks, trigger_inputs={"failed_rules": failed}, **common)
            return "REJECTED"
        approval = new_id("nn")
        job["issued_by"]["numnum_approval_id"] = approval
        self.emitter.emit(ring="RING_2_OPS", actor="NUMNUM", event_type="PLAN_APPROVED",
                          summary=f"NUMNUM approved {job_type} for {bot['governor_name']}"
                                  + ("" if will_dispatch else f" ({mode}: not dispatched)"),
                          why="All hard rules passed." + ("" if will_dispatch else f" Operating mode {mode} does not dispatch."),
                          numnum_checks=checks, trigger_inputs={"numnum_approval_id": approval, "mode": mode}, **common)
        if not will_dispatch:
            return "APPROVED_NOT_DISPATCHED"

        self._consume_operator_approval(bot["bot_id"])
        V.validate_job(job, now=now)
        self.transport.send_job(job)
        self.recent_keys = (self.recent_keys + [job["idempotency_key"]])[-500:]
        is_prep_switch = job_type == "switch_character" and demand is not None and demand.intent_id is not None
        inst.update({
            "in_flight": job,
            "dispatched_at": iso(now),
            "last_idempotency_key": job["idempotency_key"],
            "active_bot_id": inst.get("active_bot_id") or bot["bot_id"],
            "active_intent_id": None if is_prep_switch else (demand.intent_id if demand else None),
            "preempt_requested_at": None,
            "preempt_reason": None,
        })
        self.store.put_control(instance_key(instance_id), inst)
        if job_type in numnum.REST_JOB_TYPES:
            rt["session_started_at"] = None
            rt["last_session_end"] = iso(now)
            rt["sleep_until"] = iso(now + timedelta(minutes=args["duration_minutes"]))
        elif job_type == "switch_character":
            rt["session_started_at"] = None
            rt["last_session_end"] = iso(now)
            if inputs.get("mark_current_bot_rest_minutes"):
                rt["sleep_until"] = iso(now + timedelta(minutes=int(inputs["mark_current_bot_rest_minutes"])))
        elif not rt.get("session_started_at"):
            rt["session_started_at"] = iso(now)
        self.store.put_control(runtime_key(bot["bot_id"]), rt)
        if demand and demand.intent_id:
            if is_prep_switch:
                self.store.update_intent_status(
                    demand.intent_id,
                    "PLANNED_BY_TANK",
                    {
                        "planned_at": iso(now),
                        "switch_job_id": job["job_id"],
                        "instance_id": instance_id,
                        "target_kingdom_id": job["args"].get("target_kingdom_id"),
                    },
                )
            else:
                self.store.update_intent_status(
                    demand.intent_id,
                    "IN_PROGRESS",
                    {
                        "started_at": iso(now),
                        "job_id": job["job_id"],
                        "job_type": job_type,
                        "instance_id": instance_id,
                        "bot_id": bot["bot_id"],
                    },
                )
        self.emitter.emit(ring="RING_2_OPS", actor="TANK", event_type="JOB_DISPATCHED",
                          summary=f"Dispatched {job_type} to {instance_id} (deadline {job['deadline']})",
                          why="NUMNUM-approved job sent to bastion-jobs.fifo for CIPHER.",
                          trigger_inputs={"idempotency_key": job["idempotency_key"], "numnum_approval_id": approval,
                                          "deadline": job["deadline"]}, **common)
        return "DISPATCHED"

    # ------------------------------------------------------------------ Self-healing replacement planner
    def _plan_replacement(self, instance_id: str, lost_bot: Dict[str, Any], inst: Dict[str, Any],
                          config: Dict[str, Any], mode: str, all_bots: Dict[str, Dict[str, Any]], now: datetime) -> str:
        if lost_bot.get("health", {}).get("replaced_by_bot_id"):
            return "STATE_LOST"

        acct_id = lost_bot["account_id"]
        slots = self.store.get_account_slots(acct_id)
        if slots is None:
            slots = infer_account_slots(acct_id, instance_id, lost_bot["adb_serial"], all_bots)

        kd_str = str(lost_bot["kingdom_id"])
        existing = list(slots.get("kingdom_slots", {}).get(kd_str, []))
        occupied = len(existing)
        slot_num = min(2, occupied + 1)
        suffix = lost_bot["bot_id"].replace("bot_", "")[-8:]
        rep_bot_id = f"bot_{lost_bot['kingdom_id']}_rep_{suffix}"

        if config.get("enable_helpers") and self.helpers:
            self.helpers.spawn_helper(
                "R2_REPLACEMENT_PLANNER",
                f"Plan character slot allocation on {acct_id} to replace lost {lost_bot['bot_id']} in #{lost_bot['kingdom_id']}.",
                kingdom_id=int(lost_bot["kingdom_id"]),
                instance_id=instance_id,
                bot_id=lost_bot["bot_id"],
                ttl_hours=4,
            )

        args = {
            "target_kingdom_id": int(lost_bot["kingdom_id"]),
            "account_id": acct_id,
            "character_slot": slot_num,
            "preferred_civilization": "CHINA",
        }
        job = self._build_job("provision_character", args, 90, lost_bot, None, now, bot_id_override=rep_bot_id)
        fresh_rt = {"day": numnum.local_now(now, lost_bot["routine_profile"]["timezone"]).strftime("%Y-%m-%d"),
                    "active_minutes_today": 0, "session_started_at": None, "last_session_end": None, "sleep_until": None}
        ok, checks = numnum.evaluate(job, lost_bot, fresh_rt, inst, now, config.get("capabilities", []),
                                     self.recent_keys, account_slots=slots, ring_tokens=self._ring_tokens(now))
        failed = sorted(c["rule_id"] for c in checks if not c["passed"])
        op_approved = self._is_operator_approved(rep_bot_id) or self._is_operator_approved(lost_bot["bot_id"])
        will_dispatch = ok and (mode == "AUTONOMOUS" or (mode == "SUPERVISED" and op_approved))
        fingerprint = None if will_dispatch else f"REPLACE:{lost_bot['bot_id']}:{ok}:{','.join(failed)}:{mode}"
        if not self.emitter.should_emit(fingerprint):
            return "DEDUPED"

        common = dict(correlation_id=job["correlation_id"], kingdom_id=lost_bot["kingdom_id"], bot_id=rep_bot_id,
                      instance_id=instance_id, job_id=job["job_id"])
        self.emitter.emit(
            ring="RING_2_OPS", actor="TANK", event_type="PLAN_PROPOSED",
            summary=f"TANK proposes provision_character replacement {rep_bot_id} for lost {lost_bot['governor_name']} (#{lost_bot['kingdom_id']}) on {instance_id}",
            why=f"Self-healing: {lost_bot['bot_id']} is LOST; provisioning replacement in #{lost_bot['kingdom_id']} on {acct_id} (slot {slot_num}/2).",
            trigger_inputs={"replaces_bot_id": lost_bot["bot_id"], "account_id": acct_id, "occupied_slots": occupied, "args": args},
            **common,
        )
        if not ok:
            self.emitter.emit(
                ring="RING_2_OPS", actor="NUMNUM", event_type="PLAN_REJECTED", severity="WARN",
                summary=f"NUMNUM held replacement provision_character for #{lost_bot['kingdom_id']}: {', '.join(failed)}",
                why="Replacement provisioning blocked by NUMNUM hard rules.",
                numnum_checks=checks, trigger_inputs={"failed_rules": failed, "replaces_bot_id": lost_bot["bot_id"]},
                **common,
            )
            if "ACCOUNT_SLOT_LIMIT_2_PER_KINGDOM" in failed:
                self.emitter.emit(
                    ring="RING_2_OPS", actor="TANK", event_type="HUMAN_ACCOUNT_REQUIRED", severity="CRITICAL",
                    summary=f"Cannot auto-replace {lost_bot['governor_name']} in #{lost_bot['kingdom_id']}: {acct_id} has no healthy character slots left",
                    why="RoK limits each Google account to 2 characters per kingdom (or the account is not HEALTHY). Operator must log in a fresh Google account.",
                    numnum_checks=checks,
                    trigger_inputs={"account_id": acct_id, "kingdom_id": lost_bot["kingdom_id"], "occupied_slots": occupied,
                                    "account_status": slots.get("account_status")},
                    operator_action_required=True,
                    operator_instructions=f"Log in a new Google account on {instance_id} ({lost_bot['adb_serial']}) and reset BastionAccountSlots for {acct_id}.",
                    **common,
                )
            return "REJECTED"

        approval = new_id("nn")
        job["issued_by"]["numnum_approval_id"] = approval
        self.emitter.emit(
            ring="RING_2_OPS", actor="NUMNUM", event_type="PLAN_APPROVED",
            summary=f"NUMNUM approved replacement provision_character {rep_bot_id} in #{lost_bot['kingdom_id']}"
                    + ("" if will_dispatch else f" ({mode}: held for approval)"),
            why="All 8 NUMNUM rules (including 2-character/kingdom account slot cap) passed."
                + ("" if will_dispatch else f" Operating mode {mode} holds character creation."),
            numnum_checks=checks, trigger_inputs={"numnum_approval_id": approval, "mode": mode, "replaces_bot_id": lost_bot["bot_id"]},
            **common,
        )
        if not will_dispatch:
            return "APPROVED_NOT_DISPATCHED"

        self._consume_operator_approval(rep_bot_id)
        self._consume_operator_approval(lost_bot["bot_id"])
        V.validate_job(job, now=now)
        self.transport.send_job(job)
        self.recent_keys = (self.recent_keys + [job["idempotency_key"]])[-500:]
        inst.update({
            "in_flight": job,
            "dispatched_at": iso(now),
            "last_idempotency_key": job["idempotency_key"],
            "active_bot_id": rep_bot_id,
            "replacing_bot_id": lost_bot["bot_id"],
        })
        self.store.put_control(instance_key(instance_id), inst)
        self.emitter.emit(
            ring="RING_2_OPS", actor="TANK", event_type="JOB_DISPATCHED",
            summary=f"Dispatched replacement provision_character ({rep_bot_id}) to {instance_id}",
            why="NUMNUM-approved self-healing provisioning sent to bastion-jobs.fifo for CIPHER.",
            trigger_inputs={"idempotency_key": job["idempotency_key"], "numnum_approval_id": approval,
                            "replaces_bot_id": lost_bot["bot_id"], "deadline": job["deadline"]},
            **common,
        )
        return "DISPATCHED"

    # ------------------------------------------------------------------ Cross-instance twin & R5 expansion planner
    @staticmethod
    def _redundancy_gap_for(instance_id: str, bot: Dict[str, Any], rt: Dict[str, Any],
                            demands: List[Demand], now: datetime,
                            all_bots: Optional[Dict[str, Dict[str, Any]]] = None) -> Optional[Demand]:
        if bot["lifecycle_state"] != "ACTIVE" or bot["verified_state"]["ch_level"] < GROW_TARGET_CH:
            return None
        p = bot["routine_profile"]
        if numnum.in_sleep_window(now, p) or rt["active_minutes_today"] >= p["daily_active_cap_minutes"]:
            return None
        started = numnum.parse_ts(rt.get("session_started_at"))
        if started and numnum.minutes_between(started, now) >= p["max_session_minutes"]:
            return None
        if any(d.kind in ("SCAN_REQUESTED", "LOCATE_REQUESTED") and d.kingdom_id == bot["kingdom_id"] for d in demands):
            return None
        bots_map = all_bots or {}
        expands = sorted([d for d in demands if d.kind == "EXPAND_REQUESTED"], key=lambda d: d.priority, reverse=True)
        for exp in expands:
            pref_inst = (exp.detail.get("payload") or {}).get("instance_id")
            if pref_inst and pref_inst != instance_id:
                continue
            has_here = any(
                b["instance_id"] == instance_id and int(b["kingdom_id"]) == int(exp.kingdom_id)
                and b.get("lifecycle_state") not in ("RETIRED", "LOST")
                for b in bots_map.values()
            )
            if not has_here:
                return exp
        gaps = [d for d in demands if d.kind == "REDUNDANCY_GAP" and d.detail.get("target_instance_id") == instance_id]
        return gaps[0] if gaps else None

    def _plan_redundancy_twin(self, instance_id: str, current_bot: Dict[str, Any], gap: Demand,
                              inst: Dict[str, Any], config: Dict[str, Any], mode: str,
                              all_bots: Dict[str, Dict[str, Any]], now: datetime) -> str:
        acct_id = INSTANCE_TO_ACCOUNT.get(instance_id, current_bot["account_id"])
        slots = self.store.get_account_slots(acct_id)
        if slots is None:
            slots = infer_account_slots(acct_id, instance_id, current_bot["adb_serial"], all_bots)

        kd = int(gap.kingdom_id)
        kd_str = str(kd)
        existing = list(slots.get("kingdom_slots", {}).get(kd_str, []))
        occupied = len(existing)
        slot_num = min(2, occupied + 1)
        twin_bot_id = f"bot_{kd}_twin_m{instance_id[-1]}"
        peer_bots = (gap.detail.get("peer_bots") or []) if gap.kind == "REDUNDANCY_GAP" else None
        peer_names = ", ".join(b["governor_name"] for b in (peer_bots or [])) or gap.detail.get("peer_instance_id", "expansion")

        if config.get("enable_helpers") and self.helpers:
            self.helpers.spawn_helper(
                "R2_REPLACEMENT_PLANNER",
                f"Converge #{kd} on {instance_id} ({acct_id}) to pair with {gap.detail.get('peer_instance_id')}.",
                kingdom_id=kd,
                instance_id=instance_id,
                bot_id=twin_bot_id,
                ttl_hours=4,
            )

        args = {
            "target_kingdom_id": kd,
            "account_id": acct_id,
            "character_slot": slot_num,
            "preferred_civilization": "CHINA",
        }
        job = self._build_job("provision_character", args, gap.priority, current_bot, gap, now, bot_id_override=twin_bot_id)
        fresh_rt = {"day": numnum.local_now(now, current_bot["routine_profile"]["timezone"]).strftime("%Y-%m-%d"),
                    "active_minutes_today": 0, "session_started_at": None, "last_session_end": None, "sleep_until": None}
        ok, checks = numnum.evaluate(job, current_bot, fresh_rt, inst, now, config.get("capabilities", []),
                                     self.recent_keys, account_slots=slots, peer_bots=peer_bots,
                                     ring_tokens=self._ring_tokens(now))
        failed = sorted(c["rule_id"] for c in checks if not c["passed"])
        op_approved = self._is_operator_approved(twin_bot_id)
        will_dispatch = ok and (mode == "AUTONOMOUS" or (mode == "SUPERVISED" and op_approved))
        fingerprint = None if will_dispatch else f"TWIN:{twin_bot_id}:{ok}:{','.join(failed)}:{mode}"
        if not self.emitter.should_emit(fingerprint):
            return "DEDUPED"

        common = dict(correlation_id=job["correlation_id"], kingdom_id=kd, bot_id=twin_bot_id,
                      instance_id=instance_id, job_id=job["job_id"])
        self.emitter.emit(
            ring="RING_2_OPS", actor="TANK", event_type="PLAN_PROPOSED",
            summary=f"TANK proposes provision_character twin {twin_bot_id} in #{kd} on {instance_id} (pairing with {peer_names})",
            why=f"Cross-instance convergence & redundancy: {gap.detail.get('peer_instance_id')} has a governor in #{kd}, so {instance_id} ({acct_id}) must also have a twin governor in #{kd}.",
            trigger_inputs={"signal": "REDUNDANCY_GAP", "peer_instance_id": gap.detail.get("peer_instance_id"),
                            "account_id": acct_id, "occupied_slots": occupied, "args": args},
            **common,
        )
        if not ok:
            self.emitter.emit(
                ring="RING_2_OPS", actor="NUMNUM", event_type="PLAN_REJECTED", severity="WARN",
                summary=f"NUMNUM held twin provision_character for #{kd} on {instance_id}: {', '.join(failed)}",
                why="Twin provisioning held by NUMNUM hard rules.",
                numnum_checks=checks, trigger_inputs={"failed_rules": failed, "twin_bot_id": twin_bot_id},
                **common,
            )
            return "REJECTED"

        approval = new_id("nn")
        job["issued_by"]["numnum_approval_id"] = approval
        self.emitter.emit(
            ring="RING_2_OPS", actor="NUMNUM", event_type="PLAN_APPROVED",
            summary=f"NUMNUM approved twin provision_character {twin_bot_id} in #{kd} on {instance_id}"
                    + ("" if will_dispatch else f" ({mode}: held for approval)"),
            why="All NUMNUM hard rules (including 2-character/kingdom slot cap and CROSS_INSTANCE_REDUNDANCY) passed."
                + ("" if will_dispatch else f" Operating mode {mode} holds character creation."),
            numnum_checks=checks, trigger_inputs={"numnum_approval_id": approval, "mode": mode, "twin_bot_id": twin_bot_id},
            **common,
        )
        if not will_dispatch:
            return "APPROVED_NOT_DISPATCHED"

        self._consume_operator_approval(twin_bot_id)
        V.validate_job(job, now=now)
        self.transport.send_job(job)
        self.recent_keys = (self.recent_keys + [job["idempotency_key"]])[-500:]
        inst.update({
            "in_flight": job,
            "dispatched_at": iso(now),
            "last_idempotency_key": job["idempotency_key"],
            "active_bot_id": twin_bot_id,
            "replacing_bot_id": None,
            "active_intent_id": gap.intent_id,
        })
        self.store.put_control(instance_key(instance_id), inst)
        if gap.intent_id:
            self.store.update_intent_status(
                gap.intent_id,
                "IN_PROGRESS",
                {
                    "started_at": iso(now),
                    "job_id": job["job_id"],
                    "job_type": "provision_character",
                    "instance_id": instance_id,
                    "bot_id": twin_bot_id,
                },
            )
        self.emitter.emit(
            ring="RING_2_OPS", actor="TANK", event_type="JOB_DISPATCHED",
            summary=f"Dispatched twin provision_character ({twin_bot_id}) to {instance_id}",
            why="NUMNUM-approved cross-instance twin provisioning sent to bastion-jobs.fifo for CIPHER.",
            trigger_inputs={"idempotency_key": job["idempotency_key"], "numnum_approval_id": approval,
                            "deadline": job["deadline"]},
            **common,
        )
        return "DISPATCHED"

    # ------------------------------------------------------------------ TANK + BIG_JON (deterministic v0 + switch)
    def _choose(self, bot, rt, demands, now, all_bots: Dict[str, Dict[str, Any]],
                capabilities: Tuple[str, ...] = ()) -> Optional[Tuple[str, Dict[str, Any], int, str, Dict[str, Any], Optional[Demand]]]:
        caps = set(capabilities)
        p = bot["routine_profile"]
        tz = p["timezone"]
        state = bot["lifecycle_state"]
        base = {"lifecycle_state": state, "local_time": numnum.local_now(now, tz).strftime("%H:%M"),
                "active_minutes_today": rt["active_minutes_today"], "ch_level": bot["verified_state"]["ch_level"]}

        mission = self._mission_for(bot, demands) if bot["verified_state"]["ch_level"] >= GROW_TARGET_CH else None
        switch_target = self._sibling_for_r5_demand(bot, demands, all_bots, now)

        # 1. Urgent R5 sibling missions (priority >= 80, e.g. OPERATOR_OVERRIDE / R5_COMMAND_DESK scans & locates)
        # preempt a sleeping, resting, timer-waiting, or low-CH mounted bot immediately.
        if switch_target is not None:
            sib, sib_demand = switch_target
            local_prio = mission.priority if mission is not None else 0
            if sib_demand.priority >= 80 and sib_demand.priority > local_prio:
                sw_args: Dict[str, Any] = {"target_kingdom_id": int(sib["kingdom_id"])}
                if sib.get("governor_id"):
                    sw_args["target_governor_id"] = sib["governor_id"]
                if sib.get("governor_name"):
                    sw_args["target_governor_name"] = sib["governor_name"]
                return ("switch_character", sw_args, sib_demand.priority,
                        f"BIG_JON: {sib_demand.kind} for #{sib['kingdom_id']} requires switching {bot['instance_id']} to sibling bot {sib['governor_name']}.",
                        dict(base, target_bot_id=sib["bot_id"], demand=sib_demand.kind), sib_demand)

        # 2. Urgent R5 local mission (priority >= 80) on the mounted bot preempts sleep, breaks, and timers.
        if mission is not None and mission.priority >= 80:
            return self._mission_action(mission, base, caps)

        # 3. Rest checks (Quarantine/Suspect, Sleep Window, Sleeping, Daily Cap, Session Break) -> Rotate to an awake sibling if available!
        rest_reason: Optional[str] = None
        rest_mins: int = 0
        if (bot.get("health") or {}).get("ban_suspected"):
            rest_reason = "BAN_SUSPECTED_QUARANTINE"
            rest_mins = 720
        elif numnum.in_sleep_window(now, p):
            rest_reason = "SLEEP_WINDOW"
            rest_mins = max(5, min(720, numnum.minutes_until_local_hour(now, tz, p["sleep_window_end_hour"])))
        elif state == "SLEEPING":
            until = numnum.parse_ts(rt.get("sleep_until"))
            if until and now < until:
                rest_reason = "SLEEPING"
                rest_mins = max(5, int(math.ceil(numnum.minutes_between(now, until))))
        elif rt["active_minutes_today"] >= p["daily_active_cap_minutes"]:
            rest_reason = "DAILY_CAP_REACHED"
            rest_mins = max(5, min(720, numnum.minutes_until_local_hour(now, tz, p["sleep_window_end_hour"])))
        else:
            started = numnum.parse_ts(rt.get("session_started_at"))
            if started and numnum.minutes_between(started, now) >= p["max_session_minutes"]:
                rest_reason = "SESSION_BREAK"
                rest_mins = max(5, int(p["min_break_minutes"]))

        if rest_reason is not None:
            rot = self._next_awake_sibling_with_work(bot, demands, all_bots, now, caps)
            if rot is not None:
                sib, rot_reason, rot_demand, rot_prio = rot
                sw_args = {"target_kingdom_id": int(sib["kingdom_id"])}
                if sib.get("governor_id"):
                    sw_args["target_governor_id"] = sib["governor_id"]
                if sib.get("governor_name"):
                    sw_args["target_governor_name"] = sib["governor_name"]
                return (
                    "switch_character",
                    sw_args,
                    rot_prio,
                    f"BIG_JON: {bot['governor_name']} is resting ({rest_reason}); rotating {bot['instance_id']} to awake sibling {sib['governor_name']} (#{sib['kingdom_id']}) for {rot_reason}.",
                    dict(base, target_bot_id=sib["bot_id"], rotation_reason=rot_reason, rest_reason=rest_reason,
                         mark_current_bot_rest_minutes=rest_mins, **({"demand": rot_demand.kind} if rot_demand else {})),
                    rot_demand,
                )
            if rest_reason == "BAN_SUSPECTED_QUARANTINE":
                return None
            if rest_reason == "SLEEP_WINDOW":
                if state == "SLEEPING":
                    return None
                return ("sleep", {"duration_minutes": rest_mins, "close_app": True, "reason": "SLEEP_WINDOW"}, 60,
                        "Bot is inside its nightly sleep window; close the game like a real player going to bed.",
                        dict(base, sleep_window=[p["sleep_window_start_hour"], p["sleep_window_end_hour"]]), None)
            if rest_reason == "SLEEPING":
                return None
            if rest_reason == "DAILY_CAP_REACHED":
                return ("sleep", {"duration_minutes": rest_mins, "close_app": True, "reason": "DAILY_CAP_REACHED"}, 60,
                        "Daily active-minutes cap reached; rest until tomorrow's wake hour.", base, None)
            return ("sleep", {"duration_minutes": rest_mins, "close_app": True, "reason": "SESSION_BREAK"}, 60,
                    "Session hit its maximum length; take a human-length break.",
                    dict(base, session_started_at=rt.get("session_started_at")), None)

        if state == "SLEEPING":
            return ("probe_status", {"launch_if_closed": True, "capture_profile": True, "capture_resources": True}, 55,
                    "Sleep is over; wake the bot (launch the game) and confirm it reaches the city view.",
                    dict(base, sleep_until=rt.get("sleep_until")), None)

        # 4. Local scan / locate mission on this bot (always interrupts timers & routine growth/farming)
        if mission is not None:
            return self._mission_action(mission, base, caps)

        timer_until = numnum.parse_ts(rt.get("timer_ready_until"))
        timer_active = bool(timer_until and now < timer_until)
        growth_demand = next((d for d in demands if d.kind == "GROWTH_REQUESTED" and d.kingdom_id == bot["kingdom_id"]), None)
        g_prio = max(30, growth_demand.priority) if growth_demand else 30

        # 5. Sibling mission preemption (including SCAN_DUE, SCAN_REQUESTED, LOCATE_REQUESTED, GROWTH_REQUESTED)
        local_hold_prio = g_prio if (bot["verified_state"]["ch_level"] < GROW_TARGET_CH and not timer_active) else 0
        if switch_target is not None and switch_target[1].priority > local_hold_prio:
            sib, sib_demand = switch_target
            sw_args = {"target_kingdom_id": int(sib["kingdom_id"])}
            if sib.get("governor_id"):
                sw_args["target_governor_id"] = sib["governor_id"]
            if sib.get("governor_name"):
                sw_args["target_governor_name"] = sib["governor_name"]
            return ("switch_character", sw_args, sib_demand.priority,
                    f"BIG_JON: {sib_demand.kind} for #{sib['kingdom_id']} requires switching {bot['instance_id']} to sibling bot {sib['governor_name']}.",
                    dict(base, target_bot_id=sib["bot_id"], demand=sib_demand.kind), sib_demand)

        # 6. Active in-game building/gather timer: if nothing to build, farm first; then rotate to another character!
        if timer_active and growth_demand is None:
            if not rt.get("farmed_this_timer") and "gather" in caps:
                res_types = list(p.get("preferred_gather_types") or ["FOOD", "WOOD"])
                return (
                    "gather",
                    {"resource_types": res_types, "max_marches": 2},
                    35,
                    "Building queue is busy on an upgrade timer; nothing to build right now, so dispatch gathering marches to farm resources.",
                    dict(base, timer_ready_until=rt.get("timer_ready_until")),
                    None,
                )
            rot = self._next_awake_sibling_with_work(bot, demands, all_bots, now, caps)
            if rot is not None:
                sib, rot_reason, rot_demand, rot_prio = rot
                sw_args = {"target_kingdom_id": int(sib["kingdom_id"])}
                if sib.get("governor_id"):
                    sw_args["target_governor_id"] = sib["governor_id"]
                if sib.get("governor_name"):
                    sw_args["target_governor_name"] = sib["governor_name"]
                return (
                    "switch_character",
                    sw_args,
                    rot_prio,
                    f"BIG_JON: {bot['governor_name']} queues are ticking on a timer (until {rt.get('timer_ready_until')}); rotating {bot['instance_id']} to {sib['governor_name']} (#{sib['kingdom_id']}) for {rot_reason}.",
                    dict(base, target_bot_id=sib["bot_id"], rotation_reason=rot_reason, timer_ready_until=rt.get("timer_ready_until"),
                         **({"demand": rot_demand.kind} if rot_demand else {})),
                    rot_demand,
                )
            return None

        if bot["verified_state"]["ch_level"] < GROW_TARGET_CH:
            g_steps = max(5, min(60, int((growth_demand.detail.get("payload") or {}).get("max_steps", 15)))) if growth_demand else 15
            return ("grow_city", {"target_ch_level": GROW_TARGET_CH, "max_steps": g_steps}, g_prio,
                    f"City Hall is {bot['verified_state']['ch_level']}; keep growing toward CH{GROW_TARGET_CH} like a new player.",
                    dict(base, **({"demand": growth_demand.kind, "demand_detail": growth_demand.detail} if growth_demand else {})),
                    growth_demand)

        # 7. CH8+ ACTIVE bot with no local scan due: rotate to a sibling that needs growth/scan, or farm if gather is enabled!
        rot = self._next_awake_sibling_with_work(bot, demands, all_bots, now, caps)
        if rot is not None and rot[3] >= 30:
            sib, rot_reason, rot_demand, rot_prio = rot
            sw_args = {"target_kingdom_id": int(sib["kingdom_id"])}
            if sib.get("governor_id"):
                sw_args["target_governor_id"] = sib["governor_id"]
            if sib.get("governor_name"):
                sw_args["target_governor_name"] = sib["governor_name"]
            return (
                "switch_character",
                sw_args,
                rot_prio,
                f"BIG_JON: {bot['governor_name']} has no pending build or scan; rotating {bot['instance_id']} to {sib['governor_name']} (#{sib['kingdom_id']}) for {rot_reason}.",
                dict(base, target_bot_id=sib["bot_id"], rotation_reason=rot_reason,
                     **({"demand": rot_demand.kind} if rot_demand else {})),
                rot_demand,
            )

        if "gather" in caps and not timer_active:
            res_types = list(p.get("preferred_gather_types") or ["FOOD", "WOOD"])
            return (
                "gather",
                {"resource_types": res_types, "max_marches": 2},
                25,
                "No building upgrade or kingdom scan due on this governor; dispatch zero-gem gathering marches to farm resources.",
                base,
                None,
            )

        last = numnum.parse_ts(bot["verified_state"].get("last_verified_at"))
        age = None if last is None else int(numnum.minutes_between(last, now))
        if age is None or age >= PROBE_STALE_MINUTES:
            return ("probe_status", {"capture_profile": True, "capture_resources": True}, 20,
                    f"Bot state last verified {age}m ago (limit {PROBE_STALE_MINUTES}m); refresh with a read-only probe.",
                    dict(base, verified_age_minutes=age), None)
        return None

    @staticmethod
    def _mission_action(mission: Demand, base: Dict[str, Any], caps: set) -> Tuple[str, Dict[str, Any], int, str, Dict[str, Any], Demand]:
        payload = mission.detail.get("payload") or {}
        if mission.kind == "LOCATE_REQUESTED" and "locate_governor" in caps:
            loc_args: Dict[str, Any] = {"target_kingdom_id": int(mission.kingdom_id)}
            for k in ("target_governor_id", "target_governor_name", "target_alliance_tag"):
                if payload.get(k) is not None:
                    loc_args[k] = payload[k]
            return (
                "locate_governor",
                loc_args,
                mission.priority,
                f"BIG_JON: {mission.kind} for #{mission.kingdom_id} preempts routine upkeep; locating target governor in that kingdom.",
                dict(base, demand=mission.kind, demand_detail=mission.detail),
                mission,
            )
        ranks = int(payload.get("max_ranks", SCAN_DEFAULT_RANKS))
        ranks = max(10, min(1000, ranks))
        return (
            "scan_kingdom",
            {"target_kingdom_id": mission.kingdom_id, "max_ranks": ranks, "boards": ["INDIVIDUAL_POWER"]},
            mission.priority,
            f"BIG_JON: {mission.kind} for #{mission.kingdom_id} preempts routine upkeep; this bot lives in that kingdom.",
            dict(base, demand=mission.kind, demand_detail=mission.detail),
            mission,
        )

    def _next_awake_sibling_with_work(
        self,
        bot: Dict[str, Any],
        demands: List[Demand],
        all_bots: Dict[str, Dict[str, Any]],
        now: datetime,
        caps: set,
    ) -> Optional[Tuple[Dict[str, Any], str, Optional[Demand], int]]:
        candidates: List[Tuple[int, float, str, Dict[str, Any], str, Optional[Demand]]] = []
        for sib in all_bots.values():
            if sib["instance_id"] != bot["instance_id"] or sib["bot_id"] == bot["bot_id"]:
                continue
            if sib.get("lifecycle_state") not in ("ACTIVE", "GROWING", "SLEEPING"):
                continue
            if (sib.get("health") or {}).get("ban_suspected"):
                continue
            sp = sib["routine_profile"]
            if numnum.in_sleep_window(now, sp):
                continue
            s_rt = numnum.fresh_runtime(self.store.get_control(runtime_key(sib["bot_id"])), sib, now)
            if int(s_rt.get("active_minutes_today", 0)) + 20 > int(sp["daily_active_cap_minutes"]):
                continue
            s_until = numnum.parse_ts(s_rt.get("sleep_until"))
            if s_until and now < s_until:
                continue
            s_ended = numnum.parse_ts(s_rt.get("last_session_end"))
            if s_ended and numnum.minutes_between(s_ended, now) < int(sp["min_break_minutes"]):
                continue
            t_until = numnum.parse_ts(s_rt.get("timer_ready_until"))
            t_active = bool(t_until and now < t_until)

            last_v = numnum.parse_ts(sib["verified_state"].get("last_verified_at"))
            last_touch_dt = max([dt for dt in (s_ended, last_v) if dt is not None], default=None)
            last_touch_epoch = last_touch_dt.timestamp() if last_touch_dt is not None else 0.0

            sib_mission = self._mission_for(sib, demands) if sib["verified_state"]["ch_level"] >= GROW_TARGET_CH else None
            if sib_mission is not None:
                candidates.append((sib_mission.priority, -last_touch_epoch, sib["bot_id"], sib, f"{sib_mission.kind} in #{sib['kingdom_id']}", sib_mission))
                continue
            if sib["verified_state"]["ch_level"] < GROW_TARGET_CH and not t_active:
                g_dem = next((d for d in demands if d.kind == "GROWTH_REQUESTED" and d.kingdom_id == sib["kingdom_id"]), None)
                prio = max(35, g_dem.priority) if g_dem else 35
                candidates.append((prio, -last_touch_epoch, sib["bot_id"], sib, f"CH{sib['verified_state']['ch_level']}->CH{GROW_TARGET_CH} city growth", g_dem))
                continue
            if "gather" in caps and not (t_active and s_rt.get("farmed_this_timer")):
                candidates.append((25, -last_touch_epoch, sib["bot_id"], sib, "zero-gem resource farming", None))
                continue
            age_v = None if last_v is None else int(numnum.minutes_between(last_v, now))
            if age_v is None or age_v >= PROBE_STALE_MINUTES:
                candidates.append((20, -last_touch_epoch, sib["bot_id"], sib, "stale state verification probe", None))

        if not candidates:
            return None
        candidates.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)
        best_prio, _, _, best_sib, best_reason, best_dem = candidates[0]
        return best_sib, best_reason, best_dem, best_prio

    @staticmethod
    def _mission_for(bot, demands: List[Demand]) -> Optional[Demand]:
        mine = [d for d in demands if d.kingdom_id == bot["kingdom_id"] and d.kind in ("SCAN_REQUESTED", "LOCATE_REQUESTED", "SCAN_DUE")]
        return max(mine, key=lambda d: d.priority) if mine else None

    @staticmethod
    def _sibling_for_r5_demand(bot, demands: List[Demand], all_bots: Dict[str, Dict[str, Any]], now: datetime) -> Optional[Tuple[Dict[str, Any], Demand]]:
        r5_demands = sorted(
            [d for d in demands if d.kind in ("SCAN_REQUESTED", "LOCATE_REQUESTED", "SCAN_DUE", "GROWTH_REQUESTED") and d.kingdom_id != bot["kingdom_id"]],
            key=lambda d: d.priority,
            reverse=True,
        )
        for d in r5_demands:
            for sib in all_bots.values():
                if sib["instance_id"] != bot["instance_id"] or sib["kingdom_id"] != d.kingdom_id:
                    continue
                if d.kind == "GROWTH_REQUESTED":
                    if sib["lifecycle_state"] == "GROWING" and not numnum.in_sleep_window(now, sib["routine_profile"]):
                        return sib, d
                else:
                    if sib["verified_state"]["ch_level"] < GROW_TARGET_CH:
                        continue
                    if d.priority >= 80 and sib["lifecycle_state"] in ("ACTIVE", "SLEEPING"):
                        return sib, d
                    if sib["lifecycle_state"] == "ACTIVE" and not numnum.in_sleep_window(now, sib["routine_profile"]):
                        return sib, d
        return None

    def _build_job(self, job_type, args, priority, bot, demand: Optional[Demand], now,
                   bot_id_override: Optional[str] = None) -> Dict[str, Any]:
        stamp = now.strftime("%Y%m%dT%H%M")
        effective_bot_id = bot_id_override or bot["bot_id"]
        return {
            "job_id": new_id("job"),
            "idempotency_key": f"idem_{effective_bot_id}_{job_type}_{stamp}",
            "correlation_id": demand.correlation_id if demand else new_id("corr"),
            "job_type": job_type,
            "instance_id": bot["instance_id"],
            "adb_serial": bot["adb_serial"],
            "bot_id": effective_bot_id,
            "kingdom_id": int(args.get("target_kingdom_id", bot["kingdom_id"])),
            "priority": int(max(1, min(100, priority))),
            "issued_by": {"ring": "RING_2_OPS", "leader": "TANK", "numnum_approval_id": "nn_pending_gate"},
            "created_at": iso(now),
            "not_before": iso(now),
            "deadline": iso(now + timedelta(minutes=DEADLINE_MINUTES.get(job_type, 30))),
            "args": args,
        }


# =========================================================================== Ring 3

class Ring3:
    def __init__(self, store, transport, emitter, clock, wait_seconds: int = 10, advisor=None, helpers=None):
        self.store, self.transport, self.emitter, self.clock = store, transport, emitter, clock
        self.wait_seconds = wait_seconds
        self.advisor = advisor
        self.helpers = helpers

    def process(self, instances: List[str]) -> int:
        handled = 0
        for receipt, body in self.transport.receive_results(self.wait_seconds):
            try:
                self._handle(body)
                self.transport.delete_result(receipt)
                handled += 1
            except Exception as exc:  # leave on queue -> redelivery, DLQ after 5
                self.emitter.emit(ring="RING_3_AUDIT", actor="DOZER", event_type="JOB_RESULT", severity="WARN",
                                  summary="Result could not be processed; left on queue for retry",
                                  why=f"{type(exc).__name__}: {exc}"[:400], trigger_inputs={"body_prefix": body[:200]})
        self._release_stale(instances)
        return handled

    def declare_bot_lost(self, bot: Dict[str, Any], why: str, correlation_id: Optional[str] = None,
                         inputs: Optional[Dict[str, Any]] = None, evidence_refs: Optional[List[str]] = None) -> None:
        """AUDIT authority: transitions a SUSPECT/ACTIVE/GROWING bot to LOST and emits BOT_LOST."""
        common = dict(
            correlation_id=correlation_id or new_id("corr"),
            kingdom_id=bot["kingdom_id"],
            bot_id=bot["bot_id"],
            instance_id=bot["instance_id"],
            evidence_refs=evidence_refs or [],
        )
        self._set_state(bot, "LOST", why, common, severity="CRITICAL", inputs=inputs)
        self.emitter.emit(
            ring="RING_3_AUDIT", actor="AUDIT", event_type="BOT_LOST", severity="CRITICAL",
            summary=f"BOT_LOST declared for {bot['governor_name']} (#{bot['kingdom_id']}) on {bot['instance_id']}",
            why=why,
            trigger_inputs=dict(inputs or {}, bot_id=bot["bot_id"], account_id=bot["account_id"], kingdom_id=bot["kingdom_id"]),
            **common,
        )
        V.validate_bot(bot)
        self.store.put_bot(bot)

    # ------------------------------------------------------------------ result handling
    def _handle(self, body: str) -> None:
        result = json.loads(body)
        inst = self.store.get_control(instance_key(result.get("instance_id", ""))) or {}
        job = inst.get("in_flight")
        matched = bool(job and job.get("job_id") == result.get("job_id"))
        V.validate_job_result(result, job if matched else None)

        dozer = self._dozer(result)
        ev = result["evidence"]
        common = dict(correlation_id=result["correlation_id"], kingdom_id=result["kingdom_id"], bot_id=result["bot_id"],
                      instance_id=result["instance_id"], job_id=result["job_id"],
                      evidence_refs=[ev.get("screenshot_uri")] if ev.get("screenshot_uri") else [])
        sev = {"SUCCEEDED": "INFO", "PARTIAL": "NOTICE", "ACCOUNT_LOCKED_OR_BANNED": "CRITICAL", "REJECTED_SCHEMA": "CRITICAL"}.get(result["status"], "WARN")
        self.emitter.emit(ring="RING_2_OPS", actor="CIPHER", event_type="JOB_RESULT", severity=sev,
                          summary=f"CIPHER {result['status']}: {result['job_type']} on {result['instance_id']} in {result['duration_ms'] // 1000}s"
                                  + ("" if matched else " (not a brain-dispatched job)"),
                          why="Executor returned a contract-valid result." if matched
                              else "Result does not match this instance's in-flight job (manual/smoke test or already released); recorded only.",
                          trigger_inputs={"status": result["status"], "observed_state": result["observed_state"],
                                          "error": result.get("error"), "steps": len(result["steps_executed"]),
                                          "screenshot_sha256": ev.get("screenshot_sha256"), "dozer_checks": dozer},
                          **common)
        if not matched:
            return

        replacing_bot_id = inst.get("replacing_bot_id")
        active_intent_id = inst.get("active_intent_id")
        inst["in_flight"] = None
        inst["replacing_bot_id"] = None
        inst["active_intent_id"] = None
        inst["last_result_at"] = result["completed_at"]
        self.store.put_control(instance_key(result["instance_id"]), inst)

        if result["job_type"] == "provision_character":
            self._audit_provision(job, result, replacing_bot_id, dozer, common, active_intent_id=active_intent_id)
            return

        bots = self.store.get_bots([result["bot_id"]])
        bot = bots.get(result["bot_id"])
        if bot is None:
            return
        now = self.clock()
        rt = numnum.fresh_runtime(self.store.get_control(runtime_key(bot["bot_id"])), bot, now)
        if result["job_type"] not in numnum.REST_JOB_TYPES:
            rt["active_minutes_today"] = int(rt["active_minutes_today"]) + max(1, math.ceil(result["duration_ms"] / 60000))
        self._audit(bot, job, result, rt, dozer, common, active_intent_id=active_intent_id)
        self.store.put_control(runtime_key(bot["bot_id"]), rt)

    def _audit_provision(self, job: Dict[str, Any], result: Dict[str, Any], replacing_bot_id: Optional[str],
                         dozer: Dict[str, Any], common: Dict[str, Any],
                         active_intent_id: Optional[str] = None) -> None:
        status = result["status"]
        obs = result["observed_state"]
        now = self.clock()
        fleet = self.store.get_control("FLEET") or {"bot_ids": [], "active_by_instance": {}}
        lost_bot = self.store.get_bots([replacing_bot_id]).get(replacing_bot_id) if replacing_bot_id else None

        if status not in ("SUCCEEDED", "PARTIAL"):
            if active_intent_id:
                self.store.update_intent_status(
                    active_intent_id,
                    "FAILED",
                    {
                        "failed_at": result["completed_at"],
                        "job_id": result["job_id"],
                        "job_type": "provision_character",
                        "status": status,
                        "error": result.get("error"),
                    },
                )
            if lost_bot:
                inst = self.store.get_control(instance_key(result["instance_id"])) or {}
                inst["active_bot_id"] = lost_bot["bot_id"]
                self.store.put_control(instance_key(result["instance_id"]), inst)
            self.emitter.emit(
                ring="RING_3_AUDIT", actor="AUDIT", event_type="FACT_VERIFIED", severity="WARN",
                summary=f"Replacement provision_character {result['bot_id']} failed ({status}); lost bot remains queued for retry",
                why="CIPHER could not confirm new character creation; no replacement bot written to BastionBots.",
                trigger_inputs={"status": status, "error": result.get("error"), "replaces_bot_id": replacing_bot_id},
                **common,
            )
            return

        ch_level = int(obs.get("ch_level") or 2)
        gov_id = obs.get("governor_id") if isinstance(obs.get("governor_id"), str) else None
        gov_name = obs.get("governor_name") or f"Governor ({result['kingdom_id']} S{job['args']['character_slot']})"
        peer_bot = None
        if not lost_bot:
            all_known = self.store.get_bots(fleet.get("bot_ids", []))
            peer_bot = next(
                (b for b in all_known.values()
                 if int(b["kingdom_id"]) == int(result["kingdom_id"]) and b["instance_id"] != result["instance_id"]
                 and b.get("lifecycle_state") not in ("RETIRED", "LOST")),
                None,
            )
        if lost_bot:
            base_profile = dict(lost_bot["routine_profile"], active_minutes_today=0)
        elif peer_bot:
            pp = peer_bot["routine_profile"]
            base_profile = dict(
                pp,
                sleep_window_start_hour=(int(pp["sleep_window_start_hour"]) + 3) % 24,
                sleep_window_end_hour=(int(pp["sleep_window_end_hour"]) + 3) % 24,
                active_minutes_today=0,
            )
        else:
            base_profile = {
                "timezone": "America/New_York", "sleep_window_start_hour": 1, "sleep_window_end_hour": 8,
                "max_session_minutes": 60, "min_break_minutes": 30, "daily_active_cap_minutes": 300,
                "active_minutes_today": 0, "target_ch_level": 16, "preferred_gather_types": ["FOOD", "WOOD"],
            }
        used_mins = max(1, math.ceil(result["duration_ms"] / 60000))
        base_profile["active_minutes_today"] = min(used_mins, int(base_profile["daily_active_cap_minutes"]))

        verified: Dict[str, Any] = {
            "ch_level": ch_level,
            "power": int(obs.get("power") or 1500),
            "last_verified_at": result["completed_at"],
        }
        if result["evidence"].get("screenshot_uri"):
            verified["last_screenshot_uri"] = result["evidence"]["screenshot_uri"]

        new_state = "ACTIVE" if ch_level >= GROW_TARGET_CH else "GROWING"
        rep_bot: Dict[str, Any] = {
            "bot_id": result["bot_id"],
            "account_id": job["args"]["account_id"],
            "instance_id": result["instance_id"],
            "adb_serial": job["adb_serial"],
            "character_slot": int(job["args"]["character_slot"]),
            "kingdom_id": int(result["kingdom_id"]),
            "governor_id": gov_id,
            "governor_name": gov_name,
            "lifecycle_state": new_state,
            "verified_state": verified,
            "routine_profile": base_profile,
            "health": {
                "consecutive_failures": 0,
                "ban_suspected": False,
                **({"replaces_bot_id": replacing_bot_id} if replacing_bot_id else {}),
            },
        }
        V.validate_bot(rep_bot)
        self.store.put_bot(rep_bot)

        rt = numnum.fresh_runtime(None, rep_bot, now)
        rt["active_minutes_today"] = used_mins
        rt["session_started_at"] = result["started_at"]
        self.store.put_control(runtime_key(rep_bot["bot_id"]), rt)

        # Update BastionAccountSlots
        acct_id = rep_bot["account_id"]
        slots = self.store.get_account_slots(acct_id)
        if slots is None:
            all_bots = self.store.get_bots(fleet.get("bot_ids", []))
            slots = infer_account_slots(acct_id, rep_bot["instance_id"], rep_bot["adb_serial"], all_bots)
        kd_str = str(rep_bot["kingdom_id"])
        kd_list = list(slots.get("kingdom_slots", {}).get(kd_str, []))
        if rep_bot["bot_id"] not in kd_list:
            kd_list.append(rep_bot["bot_id"])
        slots.setdefault("kingdom_slots", {})[kd_str] = kd_list[:2]
        V.validate_account_slot_record(slots)
        self.store.put_account_slots(slots)

        # Update FLEET and retire lost_bot
        bot_ids = list(dict.fromkeys(list(fleet.get("bot_ids", [])) + [rep_bot["bot_id"]]))
        active_map = dict(fleet.get("active_by_instance", {}))
        active_map[rep_bot["instance_id"]] = rep_bot["bot_id"]
        fleet.update({"bot_ids": bot_ids, "active_by_instance": active_map})
        self.store.put_control("FLEET", fleet)

        self.emitter.emit(
            ring="RING_3_AUDIT", actor="AUDIT", event_type="FACT_VERIFIED", severity="NOTICE",
            summary=f"Verified new replacement character {rep_bot['governor_name']} ({rep_bot['bot_id']}) in #{rep_bot['kingdom_id']} at CH{ch_level}",
            why="CIPHER provision_character returned valid screenshot evidence; replacement bot written to BastionBots and BastionAccountSlots.",
            trigger_inputs={"observed_state": obs, "replaces_bot_id": replacing_bot_id, "character_slot": rep_bot["character_slot"], "dozer_checks": dozer},
            **common,
        )
        self.emitter.emit(
            ring="RING_3_AUDIT", actor="AUDIT", event_type="BOT_STATE_CHANGED", severity="NOTICE",
            summary=f"{rep_bot['governor_name']}: PROVISIONING -> {new_state}",
            why=f"Replacement character created in #{rep_bot['kingdom_id']}; ready for CH{GROW_TARGET_CH} growth progression.",
            trigger_inputs={"from_state": "PROVISIONING", "to_state": new_state, "replaces_bot_id": replacing_bot_id},
            **common,
        )

        if lost_bot:
            lost_bot["health"]["replaced_by_bot_id"] = rep_bot["bot_id"]
            old_common = dict(common, bot_id=lost_bot["bot_id"])
            self._set_state(
                lost_bot, "RETIRED",
                f"Replaced by verified bot {rep_bot['bot_id']} ({rep_bot['governor_name']}) on slot {rep_bot['character_slot']}/2.",
                old_common, severity="NOTICE", inputs={"replaced_by_bot_id": rep_bot["bot_id"]},
            )
            V.validate_bot(lost_bot)
            self.store.put_bot(lost_bot)

        if active_intent_id:
            self.store.update_intent_status(
                active_intent_id,
                "VERIFIED_BY_AUDIT",
                {
                    "verified_at": result["completed_at"],
                    "verified_by_job": result["job_id"],
                    "bot_id": rep_bot["bot_id"],
                    "governor_name": rep_bot["governor_name"],
                    "instance_id": rep_bot["instance_id"],
                    "kingdom_id": rep_bot["kingdom_id"],
                    "job_type": "provision_character",
                    "status": status,
                    "ch_level": ch_level,
                    "screenshot_uri": result["evidence"].get("screenshot_uri"),
                },
            )

    @staticmethod
    def _dozer(result: Dict[str, Any]) -> Dict[str, Any]:
        ev = result["evidence"]
        sha = ev.get("screenshot_sha256")
        return {
            "screenshot_present": bool(ev.get("screenshot_uri")),
            "sha256_well_formed": bool(sha and len(sha) == 64),
            "ocr_line_count": len(ev.get("ocr_lines") or []),
            "steps_reported": len(result.get("steps_executed") or []),
        }

    def _set_state(self, bot, new_state: str, why: str, common, severity="NOTICE", inputs=None) -> None:
        old = bot["lifecycle_state"]
        if old == new_state:
            return
        bot["lifecycle_state"] = new_state
        self.emitter.emit(ring="RING_3_AUDIT", actor="AUDIT", event_type="BOT_STATE_CHANGED", severity=severity,
                          summary=f"{bot['governor_name']}: {old} -> {new_state}", why=why,
                          trigger_inputs=dict(inputs or {}, from_state=old, to_state=new_state), **common)

    def _audit(self, bot, job, result, rt, dozer, common, active_intent_id: Optional[str] = None) -> None:
        status, jt = result["status"], result["job_type"]
        obs = result["observed_state"]
        now = self.clock()
        health = bot["health"]
        ev_metrics = result["evidence"].get("metrics") or {}

        if status == "ACCOUNT_LOCKED_OR_BANNED":
            if active_intent_id:
                self.store.update_intent_status(
                    active_intent_id,
                    "FAILED",
                    {
                        "failed_at": result["completed_at"],
                        "job_id": result["job_id"],
                        "job_type": jt,
                        "status": status,
                        "error": result.get("error"),
                    },
                )
            already_suspect = bot["lifecycle_state"] == "SUSPECT" or bool(health.get("ban_suspected"))
            health["ban_suspected"] = True
            health["last_error"] = (result.get("error") or {}).get("message", "ban screen")[:200]
            if already_suspect:
                self._set_state(bot, "LOST", "Second ban/suspension confirmation in evidence; declaring BOT_LOST for self-healing replacement.",
                                common, severity="CRITICAL", inputs={"error": result.get("error")})
                self.emitter.emit(
                    ring="RING_3_AUDIT", actor="AUDIT", event_type="BOT_LOST", severity="CRITICAL",
                    summary=f"BOT_LOST declared for {bot['governor_name']} (#{bot['kingdom_id']}) on {bot['instance_id']}",
                    why="Ban/suspension screen confirmed on already-SUSPECT bot; triggering Ring 2 replacement planning.",
                    trigger_inputs={"bot_id": bot["bot_id"], "account_id": bot["account_id"], "kingdom_id": bot["kingdom_id"], "error": result.get("error")},
                    **common,
                )
            else:
                self._set_state(bot, "SUSPECT", "Ban/suspension screen detected in evidence; bot pulled from rotation pending investigation (Step 5 decides LOST).",
                                common, severity="CRITICAL", inputs={"error": result.get("error")})
        elif status in ("SUCCEEDED", "PARTIAL"):
            vs = bot["verified_state"]
            changes = {}
            if isinstance(obs.get("ch_level"), int) and obs["ch_level"] != vs["ch_level"]:
                changes["ch_level"] = [vs["ch_level"], obs["ch_level"]]
                vs["ch_level"] = obs["ch_level"]
            if isinstance(obs.get("power"), int) and obs["power"] != vs["power"]:
                changes["power"] = [vs["power"], obs["power"]]
                vs["power"] = obs["power"]
            vs["last_verified_at"] = result["completed_at"]
            if result["evidence"].get("screenshot_uri"):
                vs["last_screenshot_uri"] = result["evidence"]["screenshot_uri"]
            health["consecutive_failures"] = 0
            health["last_error"] = None
            self.emitter.emit(ring="RING_3_AUDIT", actor="AUDIT", event_type="FACT_VERIFIED",
                              summary=f"Verified {bot['governor_name']}: screen {obs['screen_state']}"
                                      + (f", changes {changes}" if changes else ""),
                              why="Observed state is backed by a contract-valid result and screenshot evidence.",
                              trigger_inputs={"observed_state": obs, "changes": changes, "dozer_checks": dozer}, **common)
            screen = obs["screen_state"]
            if jt == "sleep" and screen == "SLEEP_APP_CLOSED":
                self._set_state(bot, "SLEEPING", "Sleep job closed the game.", common, inputs={"reason": job["args"].get("reason")})
            elif screen in ("CITY_VIEW", "WORLD_MAP") and bot["lifecycle_state"] in ("SLEEPING", "SUSPECT"):
                rt["sleep_until"] = None
                health["ban_suspected"] = False
                target_state = "ACTIVE" if vs["ch_level"] >= GROW_TARGET_CH else "GROWING"
                self._set_state(bot, target_state, "Game is running and in-world again.", common)
            elif jt == "probe_status" and job["args"].get("launch_if_closed") and screen not in ("CITY_VIEW", "WORLD_MAP"):
                health["consecutive_failures"] = int(health["consecutive_failures"]) + 1
                rt["session_started_at"] = None
                rt["sleep_until"] = iso(now + timedelta(minutes=WAKE_RETRY_MINUTES))
                health["last_error"] = f"wake did not reach the world (screen {screen})"
            if bot["lifecycle_state"] == "GROWING" and vs["ch_level"] >= GROW_TARGET_CH:
                self._set_state(bot, "ACTIVE", f"Reached CH{vs['ch_level']}.", common)
                rt["timer_ready_until"] = None
                rt["farmed_this_timer"] = False
            elif jt == "grow_city":
                t_sec = int(ev_metrics.get("timer_seconds") or 0)
                stuck_reason = ev_metrics.get("stuck_reason")
                if t_sec > 0:
                    rt["timer_ready_until"] = iso(now + timedelta(seconds=min(t_sec, 1800)))
                    rt["farmed_this_timer"] = bool(ev_metrics.get("farmed_on_timer", False))
                    if ev_metrics.get("timer_building"):
                        rt["last_timer_label"] = str(ev_metrics["timer_building"])[:64]
                elif stuck_reason:
                    rt["timer_ready_until"] = iso(now + timedelta(minutes=15))
                    rt["farmed_this_timer"] = True
                    rt["last_timer_label"] = f"stuck_cooldown:{stuck_reason}"[:64]
                elif status == "PARTIAL" and int(ev_metrics.get("script_steps") or 0) > 0:
                    rt["timer_ready_until"] = iso(now + timedelta(minutes=10))
                    rt["farmed_this_timer"] = False
                    rt["last_timer_label"] = "roving_guard_slice_cooldown"
                else:
                    rt["timer_ready_until"] = None
                    rt["farmed_this_timer"] = False
            elif jt == "gather":
                rt["farmed_this_timer"] = True
                rt["last_gather_at"] = result["completed_at"]
                g_mins = max(5, min(60, int(ev_metrics.get("gather_timer_minutes") or 20)))
                existing_until = numnum.parse_ts(rt.get("timer_ready_until"))
                candidate_until = now + timedelta(minutes=g_mins)
                if not existing_until or existing_until < candidate_until:
                    rt["timer_ready_until"] = iso(candidate_until)
            if jt == "scan_kingdom" and status == "SUCCEEDED":
                kd_rec: Dict[str, Any] = {
                    "last_scan_verified_at": result["completed_at"],
                    "verified_by_job": result["job_id"],
                    "verified_by_bot": bot["bot_id"],
                }
                if active_intent_id:
                    kd_rec["verified_by_intent"] = active_intent_id
                if ev_metrics.get("governors_extracted") is not None:
                    kd_rec["governors_extracted"] = ev_metrics["governors_extracted"]
                if result["evidence"].get("screenshot_uri"):
                    kd_rec["last_screenshot_uri"] = result["evidence"]["screenshot_uri"]
                self.store.put_control(f"KINGDOM#{result['kingdom_id']}", kd_rec)
                cfg_ctl = self.store.get_control("CONFIG") or {}
                if cfg_ctl.get("enable_helpers") and self.helpers:
                    self.helpers.spawn_helper(
                        "R3_MIGRATION_ANALYST",
                        f"Reconcile leaderboard scan snapshot from {result['job_id']} in #{result['kingdom_id']}.",
                        kingdom_id=int(result["kingdom_id"]),
                        bot_id=bot["bot_id"],
                        ttl_hours=6,
                        correlation_id=result["correlation_id"],
                    )
            if jt == "switch_character" and status == "SUCCEEDED":
                rt["session_started_at"] = None
                rt["last_session_end"] = result["completed_at"]
                s_until = numnum.parse_ts(rt.get("sleep_until"))
                if s_until and now < s_until and bot["lifecycle_state"] in ("ACTIVE", "GROWING"):
                    self._set_state(bot, "SLEEPING", "Rotated to sibling character while this bot rests.", common)
                self._apply_switch(bot, job, result)
            if active_intent_id and jt != "switch_character":
                self.store.update_intent_status(
                    active_intent_id,
                    "VERIFIED_BY_AUDIT",
                    {
                        "verified_at": result["completed_at"],
                        "verified_by_job": result["job_id"],
                        "bot_id": bot["bot_id"],
                        "governor_name": bot["governor_name"],
                        "instance_id": result["instance_id"],
                        "kingdom_id": result["kingdom_id"],
                        "job_type": jt,
                        "status": status,
                        "ch_level": vs["ch_level"],
                        "power": vs["power"],
                        "screenshot_uri": result["evidence"].get("screenshot_uri"),
                        **({"governors_extracted": ev_metrics["governors_extracted"]} if ev_metrics.get("governors_extracted") is not None else {}),
                    },
                )
        else:
            if active_intent_id:
                self.store.update_intent_status(
                    active_intent_id,
                    "FAILED",
                    {
                        "failed_at": result["completed_at"],
                        "job_id": result["job_id"],
                        "job_type": jt,
                        "status": status,
                        "error": result.get("error"),
                    },
                )
            err = result.get("error") or {}
            health["last_error"] = f"{err.get('code')}: {err.get('message', '')}"[:200]
            if err.get("code") not in ("DEVICE_OFFLINE", "INSTANCE_BUSY", "UNSUPPORTED_JOB_TYPE"):
                health["consecutive_failures"] = int(health["consecutive_failures"]) + 1

        if int(health["consecutive_failures"]) >= LOST_AFTER_FAILURES and bot["lifecycle_state"] == "SUSPECT":
            self._set_state(bot, "LOST", f"{health['consecutive_failures']} consecutive failures on SUSPECT bot; declaring LOST for self-healing replacement.",
                            common, severity="CRITICAL", inputs={"last_error": health.get("last_error")})
            self.emitter.emit(
                ring="RING_3_AUDIT", actor="AUDIT", event_type="BOT_LOST", severity="CRITICAL",
                summary=f"BOT_LOST declared for {bot['governor_name']} (#{bot['kingdom_id']}) after {health['consecutive_failures']} failures",
                why="Bot failed repeatedly after entering SUSPECT; triggering Ring 2 self-healing replacement.",
                trigger_inputs={"bot_id": bot["bot_id"], "consecutive_failures": health["consecutive_failures"], "last_error": health.get("last_error")},
                **common,
            )
        elif int(health["consecutive_failures"]) >= SUSPECT_AFTER_FAILURES and bot["lifecycle_state"] in PLANNABLE_STATES:
            self._set_state(bot, "SUSPECT", f"{health['consecutive_failures']} consecutive failures; pulled from rotation.",
                            common, severity="WARN", inputs={"last_error": health.get("last_error")})

        if bot["lifecycle_state"] in ("SUSPECT", "LOST") and self.helpers:
            cfg_ctl = self.store.get_control("CONFIG") or {}
            if cfg_ctl.get("enable_helpers"):
                self.helpers.spawn_helper(
                    "R3_BAN_INVESTIGATOR",
                    f"Inspect failure/ban evidence on {bot['bot_id']} ({bot['lifecycle_state']}) in #{bot['kingdom_id']}.",
                    kingdom_id=int(bot["kingdom_id"]),
                    instance_id=bot["instance_id"],
                    bot_id=bot["bot_id"],
                    ttl_hours=8,
                )

        prof = bot["routine_profile"]
        prof["active_minutes_today"] = min(int(rt["active_minutes_today"]), int(prof["daily_active_cap_minutes"]))
        V.validate_bot(bot)
        self.store.put_bot(bot)

    def _apply_switch(self, current_bot: Dict[str, Any], job: Dict[str, Any], result: Dict[str, Any]) -> None:
        target_kd = int(job["args"]["target_kingdom_id"])
        fleet = self.store.get_control("FLEET") or {}
        all_bots = self.store.get_bots(fleet.get("bot_ids", []))
        target_bot = next(
            (b for b in all_bots.values()
             if b["instance_id"] == current_bot["instance_id"] and int(b["kingdom_id"]) == target_kd and b["lifecycle_state"] != "RETIRED"),
            None,
        )
        if target_bot:
            active_map = dict(fleet.get("active_by_instance", {}))
            active_map[current_bot["instance_id"]] = target_bot["bot_id"]
            fleet["active_by_instance"] = active_map
            self.store.put_control("FLEET", fleet)
            t_rt = numnum.fresh_runtime(self.store.get_control(runtime_key(target_bot["bot_id"])), target_bot, self.clock())
            t_rt["session_started_at"] = result["completed_at"]
            t_rt["last_session_end"] = None
            t_rt["sleep_until"] = None
            self.store.put_control(runtime_key(target_bot["bot_id"]), t_rt)
            if target_bot.get("lifecycle_state") == "SLEEPING":
                wake_state = "ACTIVE" if int(target_bot["verified_state"].get("ch_level") or 1) >= GROW_TARGET_CH else "GROWING"
                t_common = dict(
                    correlation_id=result["correlation_id"],
                    kingdom_id=target_bot["kingdom_id"],
                    bot_id=target_bot["bot_id"],
                    instance_id=target_bot["instance_id"],
                    job_id=result["job_id"],
                )
                self._set_state(target_bot, wake_state, "Switched to character on emulator; bot is now active in-world.", t_common)
                V.validate_bot(target_bot)
                self.store.put_bot(target_bot)

    def _release_stale(self, instances: List[str]) -> None:
        now = self.clock()
        for instance_id in instances:
            inst = self.store.get_control(instance_key(instance_id)) or {}
            job = inst.get("in_flight")
            if not job:
                continue
            deadline = numnum.parse_ts(job["deadline"])
            if now < deadline + timedelta(minutes=STALE_INFLIGHT_GRACE_MINUTES):
                continue
            stale_intent_id = inst.get("active_intent_id")
            inst["in_flight"] = None
            inst["replacing_bot_id"] = None
            inst["active_intent_id"] = None
            self.store.put_control(instance_key(instance_id), inst)
            if stale_intent_id:
                self.store.update_intent_status(
                    stale_intent_id,
                    "FAILED",
                    {
                        "failed_at": iso(now),
                        "job_id": job["job_id"],
                        "job_type": job["job_type"],
                        "status": "TIMEOUT",
                        "error": {"code": "DEADLINE_EXPIRED", "message": "No result from CIPHER before deadline + grace."},
                    },
                )
            self.emitter.emit(ring="RING_3_AUDIT", actor="AUDIT", event_type="JOB_RESULT", severity="WARN",
                              correlation_id=job["correlation_id"], kingdom_id=job["kingdom_id"], bot_id=job["bot_id"],
                              instance_id=instance_id, job_id=job["job_id"],
                              summary=f"No result for {job['job_type']} on {instance_id} by deadline; instance released",
                              why="CIPHER did not report before deadline + grace (offline or crashed). The job may still run; its late result will be recorded but not applied.",
                              trigger_inputs={"deadline": job["deadline"], "grace_minutes": STALE_INFLIGHT_GRACE_MINUTES})
            bots = self.store.get_bots([job["bot_id"]])
            bot = bots.get(job["bot_id"])
            if bot:
                bot["health"]["consecutive_failures"] = int(bot["health"]["consecutive_failures"]) + 1
                bot["health"]["last_error"] = f"no result for {job['job_type']} before deadline"
                V.validate_bot(bot)
                self.store.put_bot(bot)
