"""The three rings (deterministic v0).

Ring 1 (KENT, NULL, SCOUT)  -> demands (signals). Never dispatches.
Ring 2 (TANK, BIG_JON, NUMNUM) -> plans, gates, and (mode permitting) dispatches typed jobs.
Ring 3 (DOZER, AUDIT) -> validates results, verifies facts, and is the only writer of bot state.
"""

from __future__ import annotations

import json
import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from contracts import validator as V
from contracts.validator import ContractValidationError

from . import numnum
from .events import iso, new_id

PLANNABLE_STATES = ("ACTIVE", "GROWING", "SLEEPING")
DISPATCH_HOLD_IN_SUPERVISED = frozenset({"provision_character", "switch_character"})
DEADLINE_MINUTES = {"probe_status": 15, "sleep": 10, "grow_city": 60, "scan_kingdom": 120}
PROBE_STALE_MINUTES = 180
STALE_INFLIGHT_GRACE_MINUTES = 10
WAKE_RETRY_MINUTES = 10
SUSPECT_AFTER_FAILURES = 3
GROW_TARGET_CH = 8
SCAN_DEFAULT_RANKS = 300

DEFAULT_CONFIG = {
    "capabilities": list(numnum.DEFAULT_CAPABILITIES),
    "watched_kingdoms": [],
    "instances": list(V.INSTANCE_TO_ADB),
}


@dataclass
class Demand:
    kind: str  # SCAN_REQUESTED (R5) | SCAN_DUE (NULL)
    kingdom_id: int
    priority: int
    correlation_id: str
    detail: Dict[str, Any] = field(default_factory=dict)
    intent_id: Optional[str] = None


def runtime_key(bot_id: str) -> str:
    return f"BOTRUNTIME#{bot_id}"


def instance_key(instance_id: str) -> str:
    return f"INSTANCE#{instance_id}"


# =========================================================================== Ring 1

class Ring1:
    def __init__(self, store, emitter, clock):
        self.store, self.emitter, self.clock = store, emitter, clock

    def collect(self, config: Dict[str, Any]) -> List[Demand]:
        return self._kent_intents() + self._null_staleness(config)

    def _kent_intents(self) -> List[Demand]:
        demands: List[Demand] = []
        for intent in self.store.query_intents("PENDING"):
            try:
                V.validate_intent(intent)
            except ContractValidationError as exc:
                self.store.update_intent_status(intent["intent_id"], "REJECTED")
                self.emitter.emit(ring="RING_1_INTEL", actor="KENT", event_type="INTENT_RECEIVED", severity="WARN",
                                  summary=f"Rejected malformed intent {intent.get('intent_id')}",
                                  why=f"Intent failed the contract: {exc}", trigger_inputs={"intent_id": intent.get("intent_id")})
                continue
            self.emitter.emit(ring="RING_1_INTEL", actor="KENT", event_type="INTENT_RECEIVED",
                              correlation_id=intent["correlation_id"], kingdom_id=intent.get("kingdom_id"),
                              summary=f"{intent['source']} intent {intent['intent_type']} for #{intent.get('kingdom_id')}",
                              why="New intent from Unity entered the brain; triaging into a signal.",
                              trigger_inputs={"intent_id": intent["intent_id"], "priority": intent["priority"], "payload": intent["payload"]})
            if intent["intent_type"] == "SCAN_KINGDOM" and intent.get("kingdom_id"):
                self.store.update_intent_status(intent["intent_id"], "TRIAGED_BY_SCOUT")
                self.emitter.emit(ring="RING_1_INTEL", actor="KENT", event_type="SIGNAL", correlation_id=intent["correlation_id"],
                                  kingdom_id=intent["kingdom_id"], summary=f"R5 scan request for #{intent['kingdom_id']}",
                                  why="R5 asked for a kingdom scan; missions preempt routine upkeep.",
                                  trigger_inputs={"signal": "SCAN_REQUESTED", "intent_id": intent["intent_id"]})
            else:
                self.store.update_intent_status(intent["intent_id"], "REJECTED")
                self.emitter.emit(ring="RING_1_INTEL", actor="KENT", event_type="SIGNAL", severity="NOTICE",
                                  correlation_id=intent["correlation_id"], kingdom_id=intent.get("kingdom_id"),
                                  summary=f"Intent {intent['intent_type']} not supported in brain v0",
                                  why="Only SCAN_KINGDOM intents are planned in the deterministic v0 brain.",
                                  trigger_inputs={"intent_id": intent["intent_id"]})
        for intent in self.store.query_intents("TRIAGED_BY_SCOUT"):
            if intent["intent_type"] == "SCAN_KINGDOM" and intent.get("kingdom_id"):
                demands.append(Demand("SCAN_REQUESTED", int(intent["kingdom_id"]), int(intent["priority"]),
                                      intent["correlation_id"], {"payload": intent["payload"]}, intent["intent_id"]))
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
    def __init__(self, store, transport, emitter, clock):
        self.store, self.transport, self.emitter, self.clock = store, transport, emitter, clock
        self.recent_keys: List[str] = []

    def plan_instance(self, instance_id: str, bot: Optional[Dict[str, Any]], demands: List[Demand],
                      config: Dict[str, Any], mode: str) -> Optional[str]:
        """Plans at most one job for the instance's active bot. Returns an outcome label."""
        now = self.clock()
        inst = self.store.get_control(instance_key(instance_id)) or {}
        if inst.get("in_flight"):
            return "BUSY"
        if bot is None:
            return "NO_ACTIVE_BOT"
        if bot["lifecycle_state"] not in PLANNABLE_STATES:
            return f"STATE_{bot['lifecycle_state']}"

        rt = numnum.fresh_runtime(self.store.get_control(runtime_key(bot["bot_id"])), bot, now)
        choice = self._choose(bot, rt, demands, now)
        if choice is None:
            return "IDLE"
        job_type, args, priority, why, inputs, demand = choice
        job = self._build_job(job_type, args, priority, bot, demand, now)

        ok, checks = numnum.evaluate(job, bot, rt, inst, now, config.get("capabilities", []), self.recent_keys)
        failed = sorted(c["rule_id"] for c in checks if not c["passed"])
        will_dispatch = ok and mode in ("AUTONOMOUS", "SUPERVISED") and not (
            mode == "SUPERVISED" and job_type in DISPATCH_HOLD_IN_SUPERVISED)
        fingerprint = None if will_dispatch else f"PLAN:{bot['bot_id']}:{job_type}:{ok}:{','.join(failed)}:{mode}"
        if not self.emitter.should_emit(fingerprint):
            return "DEDUPED"

        common = dict(correlation_id=job["correlation_id"], kingdom_id=bot["kingdom_id"], bot_id=bot["bot_id"],
                      instance_id=instance_id, job_id=job["job_id"])
        self.emitter.emit(ring="RING_2_OPS", actor="TANK", event_type="PLAN_PROPOSED",
                          summary=f"TANK proposes {job_type} for {bot['governor_name']} (#{bot['kingdom_id']}) on {instance_id}",
                          why=why, trigger_inputs=dict(inputs, args=args, priority=priority), **common)
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

        V.validate_job(job, now=now)
        self.transport.send_job(job)
        self.recent_keys = (self.recent_keys + [job["idempotency_key"]])[-500:]
        inst.update({"in_flight": job, "dispatched_at": iso(now), "last_idempotency_key": job["idempotency_key"],
                     "active_bot_id": inst.get("active_bot_id") or bot["bot_id"]})
        self.store.put_control(instance_key(instance_id), inst)
        if job_type in numnum.REST_JOB_TYPES:
            rt["session_started_at"] = None
            rt["last_session_end"] = iso(now)
            rt["sleep_until"] = iso(now + timedelta(minutes=args["duration_minutes"]))
        elif not rt.get("session_started_at"):
            rt["session_started_at"] = iso(now)
        self.store.put_control(runtime_key(bot["bot_id"]), rt)
        if demand and demand.intent_id:
            self.store.update_intent_status(demand.intent_id, "IN_PROGRESS")
        self.emitter.emit(ring="RING_2_OPS", actor="TANK", event_type="JOB_DISPATCHED",
                          summary=f"Dispatched {job_type} to {instance_id} (deadline {job['deadline']})",
                          why="NUMNUM-approved job sent to bastion-jobs.fifo for CIPHER.",
                          trigger_inputs={"idempotency_key": job["idempotency_key"], "numnum_approval_id": approval,
                                          "deadline": job["deadline"]}, **common)
        return "DISPATCHED"

    # ------------------------------------------------------------------ TANK + BIG_JON (deterministic v0)
    def _choose(self, bot, rt, demands, now) -> Optional[Tuple[str, Dict[str, Any], int, str, Dict[str, Any], Optional[Demand]]]:
        p = bot["routine_profile"]
        tz = p["timezone"]
        state = bot["lifecycle_state"]
        base = {"lifecycle_state": state, "local_time": numnum.local_now(now, tz).strftime("%H:%M"),
                "active_minutes_today": rt["active_minutes_today"], "ch_level": bot["verified_state"]["ch_level"]}

        if numnum.in_sleep_window(now, p):
            if state == "SLEEPING":
                return None
            mins = min(720, numnum.minutes_until_local_hour(now, tz, p["sleep_window_end_hour"]))
            return ("sleep", {"duration_minutes": max(5, mins), "close_app": True, "reason": "SLEEP_WINDOW"}, 60,
                    "Bot is inside its nightly sleep window; close the game like a real player going to bed.",
                    dict(base, sleep_window=[p["sleep_window_start_hour"], p["sleep_window_end_hour"]]), None)

        if state == "SLEEPING":
            until = numnum.parse_ts(rt.get("sleep_until"))
            if until and now < until:
                return None
            return ("probe_status", {"launch_if_closed": True, "capture_profile": True, "capture_resources": True}, 55,
                    "Sleep is over; wake the bot (launch the game) and confirm it reaches the city view.",
                    dict(base, sleep_until=rt.get("sleep_until")), None)

        if rt["active_minutes_today"] >= p["daily_active_cap_minutes"]:
            mins = min(720, numnum.minutes_until_local_hour(now, tz, p["sleep_window_end_hour"]))
            return ("sleep", {"duration_minutes": max(5, mins), "close_app": True, "reason": "DAILY_CAP_REACHED"}, 60,
                    "Daily active-minutes cap reached; rest until tomorrow's wake hour.", base, None)

        started = numnum.parse_ts(rt.get("session_started_at"))
        if started and numnum.minutes_between(started, now) >= p["max_session_minutes"]:
            return ("sleep", {"duration_minutes": max(5, int(p["min_break_minutes"])), "close_app": True, "reason": "SESSION_BREAK"}, 60,
                    "Session hit its maximum length; take a human-length break.",
                    dict(base, session_started_at=rt.get("session_started_at")), None)

        mission = self._mission_for(bot, demands)
        if mission is not None:
            ranks = int((mission.detail.get("payload") or {}).get("max_ranks", SCAN_DEFAULT_RANKS))
            ranks = max(10, min(1000, ranks))
            return ("scan_kingdom", {"target_kingdom_id": mission.kingdom_id, "max_ranks": ranks, "boards": ["INDIVIDUAL_POWER"]},
                    mission.priority,
                    f"BIG_JON: {mission.kind} for #{mission.kingdom_id} preempts routine upkeep; this bot lives in that kingdom.",
                    dict(base, demand=mission.kind, demand_detail=mission.detail), mission)

        if bot["verified_state"]["ch_level"] < GROW_TARGET_CH:
            return ("grow_city", {"target_ch_level": GROW_TARGET_CH, "max_steps": 40}, 30,
                    f"City Hall is {bot['verified_state']['ch_level']}; keep growing toward CH{GROW_TARGET_CH} like a new player.", base, None)

        last = numnum.parse_ts(bot["verified_state"].get("last_verified_at"))
        age = None if last is None else int(numnum.minutes_between(last, now))
        if age is None or age >= PROBE_STALE_MINUTES:
            return ("probe_status", {"capture_profile": True, "capture_resources": True}, 20,
                    f"Bot state last verified {age}m ago (limit {PROBE_STALE_MINUTES}m); refresh with a read-only probe.",
                    dict(base, verified_age_minutes=age), None)
        return None

    @staticmethod
    def _mission_for(bot, demands: List[Demand]) -> Optional[Demand]:
        mine = [d for d in demands if d.kingdom_id == bot["kingdom_id"]]
        return max(mine, key=lambda d: d.priority) if mine else None

    def _build_job(self, job_type, args, priority, bot, demand: Optional[Demand], now) -> Dict[str, Any]:
        stamp = now.strftime("%Y%m%dT%H%M")
        return {
            "job_id": new_id("job"),
            "idempotency_key": f"idem_{bot['bot_id']}_{job_type}_{stamp}",
            "correlation_id": demand.correlation_id if demand else new_id("corr"),
            "job_type": job_type,
            "instance_id": bot["instance_id"],
            "adb_serial": bot["adb_serial"],
            "bot_id": bot["bot_id"],
            "kingdom_id": bot["kingdom_id"],
            "priority": int(max(1, min(100, priority))),
            "issued_by": {"ring": "RING_2_OPS", "leader": "TANK", "numnum_approval_id": "nn_pending_gate"},
            "created_at": iso(now),
            "not_before": iso(now),
            "deadline": iso(now + timedelta(minutes=DEADLINE_MINUTES.get(job_type, 30))),
            "args": args,
        }


# =========================================================================== Ring 3

class Ring3:
    def __init__(self, store, transport, emitter, clock, wait_seconds: int = 10):
        self.store, self.transport, self.emitter, self.clock = store, transport, emitter, clock
        self.wait_seconds = wait_seconds

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

        inst["in_flight"] = None
        inst["last_result_at"] = result["completed_at"]
        self.store.put_control(instance_key(result["instance_id"]), inst)

        bots = self.store.get_bots([result["bot_id"]])
        bot = bots.get(result["bot_id"])
        if bot is None:
            return
        now = self.clock()
        rt = numnum.fresh_runtime(self.store.get_control(runtime_key(bot["bot_id"])), bot, now)
        if result["job_type"] not in numnum.REST_JOB_TYPES:
            rt["active_minutes_today"] = int(rt["active_minutes_today"]) + max(1, math.ceil(result["duration_ms"] / 60000))
        self._audit(bot, job, result, rt, dozer, common)
        self.store.put_control(runtime_key(bot["bot_id"]), rt)

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

    def _audit(self, bot, job, result, rt, dozer, common) -> None:
        status, jt = result["status"], result["job_type"]
        obs = result["observed_state"]
        now = self.clock()
        health = bot["health"]

        if status == "ACCOUNT_LOCKED_OR_BANNED":
            health["ban_suspected"] = True
            health["last_error"] = (result.get("error") or {}).get("message", "ban screen")[:200]
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
            elif screen in ("CITY_VIEW", "WORLD_MAP") and bot["lifecycle_state"] == "SLEEPING":
                rt["sleep_until"] = None
                self._set_state(bot, "ACTIVE", "Game is running and in-world again.", common)
            elif jt == "probe_status" and job["args"].get("launch_if_closed") and screen not in ("CITY_VIEW", "WORLD_MAP"):
                health["consecutive_failures"] = int(health["consecutive_failures"]) + 1
                rt["sleep_until"] = iso(now + timedelta(minutes=WAKE_RETRY_MINUTES))
                health["last_error"] = f"wake did not reach the world (screen {screen})"
            if bot["lifecycle_state"] == "GROWING" and vs["ch_level"] >= GROW_TARGET_CH:
                self._set_state(bot, "ACTIVE", f"Reached CH{vs['ch_level']}.", common)
            if jt == "scan_kingdom" and status == "SUCCEEDED":
                self.store.put_control(f"KINGDOM#{result['kingdom_id']}", {"last_scan_verified_at": result["completed_at"],
                                                                           "verified_by_job": result["job_id"]})
        else:
            err = result.get("error") or {}
            health["last_error"] = f"{err.get('code')}: {err.get('message', '')}"[:200]
            if err.get("code") not in ("DEVICE_OFFLINE", "INSTANCE_BUSY", "UNSUPPORTED_JOB_TYPE"):
                health["consecutive_failures"] = int(health["consecutive_failures"]) + 1

        if int(health["consecutive_failures"]) >= SUSPECT_AFTER_FAILURES and bot["lifecycle_state"] in PLANNABLE_STATES:
            self._set_state(bot, "SUSPECT", f"{health['consecutive_failures']} consecutive failures; pulled from rotation.",
                            common, severity="WARN", inputs={"last_error": health.get("last_error")})

        prof = bot["routine_profile"]
        prof["active_minutes_today"] = min(int(rt["active_minutes_today"]), int(prof["daily_active_cap_minutes"]))
        V.validate_bot(bot)
        self.store.put_bot(bot)

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
            inst["in_flight"] = None
            self.store.put_control(instance_key(instance_id), inst)
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
