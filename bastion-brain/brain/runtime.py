"""Brain runtime: one tick = resolve mode -> Ring 1 demand -> Ring 2 plans -> Ring 3 results -> heartbeat."""

from __future__ import annotations

import json
import sys
import threading
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

from . import __version__
from .config import VALID_MODES, BrainConfig
from .events import Emitter, iso
from .leaders import HelperManager, LeaderAdvisor
from .ring4_safety import POSTURE_GREEN, Ring4Safety
from .ring5_context import WEATHER_CLEAR, Ring5Context
from .rings import DEFAULT_CONFIG, Ring1, Ring2, Ring3, instance_key


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_iso(val: Any) -> Optional[datetime]:
    if not val or not isinstance(val, str):
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def resolve_mode(boot_mode: str, control: Optional[Dict[str, Any]]) -> str:
    """Railway `BRAIN_MODE=OFF` is a hard kill switch; otherwise Unity's MODE control wins, else the boot mode."""
    if boot_mode == "OFF":
        return "OFF"
    wanted = (control or {}).get("mode")
    return wanted if wanted in VALID_MODES else boot_mode


class Brain:
    def __init__(self, cfg: BrainConfig, store, transport, clock: Callable[[], datetime] = utcnow,
                 strict_events: bool = False, log: Optional[Callable[[str], None]] = None,
                 force_mode: Optional[str] = None, llm_fn=None):
        self.cfg, self.store, self.transport, self.clock = cfg, store, transport, clock
        self._log = log or (lambda line: print(line, file=sys.stdout, flush=True))
        self.emitter = Emitter(store, clock, strict=strict_events, dedupe_minutes=cfg.event_dedupe_minutes, log=self._log)
        self.advisor = LeaderAdvisor(store, clock, api_key=cfg.gemini_api_key, llm_fn=llm_fn)
        self.helpers = HelperManager(store, self.emitter, clock, advisor=self.advisor)
        self.ring4 = Ring4Safety(store, self.emitter, clock, advisor=self.advisor, helpers=self.helpers)
        self.ring5 = Ring5Context(store, self.emitter, clock, advisor=self.advisor, helpers=self.helpers)
        self.ring1 = Ring1(store, self.emitter, clock, advisor=self.advisor, helpers=self.helpers)
        self.ring2 = Ring2(store, transport, self.emitter, clock, advisor=self.advisor, helpers=self.helpers)
        self.ring3 = Ring3(store, transport, self.emitter, clock, cfg.results_wait_seconds, advisor=self.advisor, helpers=self.helpers, ring4=self.ring4, ring5=self.ring5)
        self.force_mode = force_mode
        self.mode: Optional[str] = None
        self.tick_count = 0
        self.strict = strict_events

    def log(self, **fields: Any) -> None:
        self._log(json.dumps({"ts": iso(self.clock()), **fields}, default=str))

    def _evaluate_and_update_lease(self, effective_mode: str) -> Dict[str, Any]:
        """Coordinate multi-node HA failover via BastionControl.BRAIN_LEASE and BastionControl.BRAIN_NODES."""
        now = self.clock()
        now_s = iso(now)
        ttl_s = max(60, int(self.cfg.lease_ttl_seconds or 180))
        expires_s = iso(now + timedelta(seconds=ttl_s))

        lease = self.store.get_control("BRAIN_LEASE") or {}
        holder_id = lease.get("holder_id")
        holder_role = lease.get("holder_role") or "PRIMARY"
        holder_prio = int(lease.get("holder_priority") or 1)
        expires_at = _parse_iso(lease.get("lease_expires_at"))
        forced_leader = (lease.get("forced_leader") or "AUTO").strip()
        failover_count = int(lease.get("failover_count") or 0)

        lease_expired = (expires_at is None) or (now >= expires_at)
        deadman_expired = (expires_at is None) or (now >= expires_at + timedelta(seconds=ttl_s))

        should_lead = False
        transition_reason: Optional[str] = None

        if forced_leader not in ("", "AUTO"):
            if forced_leader == self.cfg.node_id:
                should_lead = True
                if holder_id != self.cfg.node_id:
                    transition_reason = f"Operator pinned active Brain leader to {self.cfg.node_id}"
            elif lease_expired and deadman_expired:
                # Deadman safety: if pinned node has been offline for >2x TTL, allow standby to rescue
                should_lead = True
                if holder_id != self.cfg.node_id:
                    failover_count += 1
                    transition_reason = f"Pinned leader {forced_leader} unresponsive (>2x TTL); {self.cfg.node_id} assumed deadman failover"
            else:
                should_lead = False
        else:
            if not holder_id or holder_id == self.cfg.node_id:
                should_lead = True
            elif lease_expired:
                should_lead = True
                failover_count += 1
                transition_reason = f"FAILOVER PROMOTED: {self.cfg.node_id} ({self.cfg.node_role}) took over after {holder_id} lease expired"
            elif self.cfg.node_priority < holder_prio:
                should_lead = True
                transition_reason = f"PRIMARY RECLAIMED: {self.cfg.node_id} (priority {self.cfg.node_priority}) reclaimed leadership from standby {holder_id} (priority {holder_prio})"
            else:
                should_lead = False

        node_state = "ACTIVE_LEADER" if should_lead else "HOT_STANDBY"

        # Update BRAIN_NODES registry so /bastion sees all live primary & standby nodes
        nodes_ctrl = self.store.get_control("BRAIN_NODES") or {}
        nodes_map = dict(nodes_ctrl.get("nodes") or {})
        nodes_map[self.cfg.node_id] = {
            "node_id": self.cfg.node_id,
            "role": self.cfg.node_role,
            "priority": self.cfg.node_priority,
            "version": __version__,
            "state": node_state,
            "last_seen_at": now_s,
            "tick": self.tick_count,
        }
        self.store.put_control("BRAIN_NODES", {"nodes": nodes_map, "updated_at": now_s})

        if should_lead:
            new_lease = {
                "holder_id": self.cfg.node_id,
                "holder_role": self.cfg.node_role,
                "holder_priority": self.cfg.node_priority,
                "version": __version__,
                "acquired_at": lease.get("acquired_at") if holder_id == self.cfg.node_id and lease.get("acquired_at") else now_s,
                "renewed_at": now_s,
                "lease_expires_at": expires_s,
                "lease_ttl_seconds": ttl_s,
                "forced_leader": forced_leader,
                "failover_count": failover_count,
                "previous_holder": holder_id if holder_id and holder_id != self.cfg.node_id else lease.get("previous_holder"),
                "last_transition_reason": transition_reason or lease.get("last_transition_reason") or "Initial lease acquisition",
            }
            self.store.put_control("BRAIN_LEASE", new_lease)
            if transition_reason and holder_id and holder_id != self.cfg.node_id:
                self.emitter.mode = effective_mode
                self.emitter.emit(
                    ring="SYSTEM",
                    actor="OPERATOR",
                    event_type="MODE_CHANGED",
                    severity="WARN" if "FAILOVER" in transition_reason else "NOTICE",
                    summary=transition_reason[:275],
                    why=f"High-availability Brain lease transitioned from {holder_id} ({holder_role}) to {self.cfg.node_id} ({self.cfg.node_role}).",
                    trigger_inputs={
                        "previous_holder": holder_id,
                        "new_holder": self.cfg.node_id,
                        "new_role": self.cfg.node_role,
                        "priority": self.cfg.node_priority,
                        "failover_count": failover_count,
                        "forced_leader": forced_leader,
                    },
                )
            return {"leading": True, "lease": new_lease}

        return {"leading": False, "lease": lease}

    def _update_mode(self) -> str:
        control = self.store.get_control("MODE")
        mode = self.force_mode or resolve_mode(self.cfg.boot_mode, control)
        if mode != self.mode:
            previous = self.mode
            self.mode = mode
            self.emitter.mode = mode
            self.emitter.emit(ring="SYSTEM", actor="OPERATOR", event_type="MODE_CHANGED", severity="NOTICE",
                              summary=f"Brain mode {previous or '(boot)'} -> {mode}",
                              why=("Forced for this run." if self.force_mode else
                                   "Railway BRAIN_MODE=OFF kill switch." if self.cfg.boot_mode == "OFF" else
                                   "Unity /bastion mode control." if control and control.get("mode") == mode else
                                   "Railway BRAIN_MODE boot default (no Unity override set)."),
                              trigger_inputs={"boot_mode": self.cfg.boot_mode, "unity_control": control,
                                              "brain_version": __version__, "node_id": self.cfg.node_id})
        return mode

    def _fleet(self) -> Dict[str, Any]:
        fleet = self.store.get_control("FLEET") or {}
        bot_ids = list(fleet.get("bot_ids", []))
        bots = self.store.get_bots(bot_ids) if bot_ids else {}
        return {"bots": bots, "active": dict(fleet.get("active_by_instance", {}))}

    def declare_bot_lost(self, bot_id: str, why: str) -> Dict[str, Any]:
        """Helper to invoke Ring 3 AUDIT loss declaration by bot_id."""
        bot = self.store.get_bots([bot_id]).get(bot_id)
        if not bot:
            raise ValueError(f"Unknown bot_id: {bot_id}")
        self.ring3.declare_bot_lost(bot, why)
        return bot

    def tick(self) -> Dict[str, Any]:
        self.tick_count += 1
        summary: Dict[str, Any] = {"tick": self.tick_count, "node_id": self.cfg.node_id, "errors": []}
        raw_control = self.store.get_control("MODE")
        preview_mode = self.force_mode or resolve_mode(self.cfg.boot_mode, raw_control)

        lease_status = self._evaluate_and_update_lease(preview_mode)
        if not lease_status["leading"]:
            holder = (lease_status.get("lease") or {}).get("holder_id") or "unknown"
            summary["mode"] = "STANDBY_WATCH"
            summary["lease_holder"] = holder
            self.log(level="INFO", msg="standby_watch", node_id=self.cfg.node_id, lease_holder=holder, tick=self.tick_count)
            return summary

        mode = self._update_mode()
        summary["mode"] = mode
        config = dict(DEFAULT_CONFIG, **(self.store.get_control("CONFIG") or {}))
        instances: List[str] = list(config.get("instances", []))
        fleet = self._fleet()
        summary["bots"] = len(fleet["bots"])

        def guarded(name: str, fn):
            try:
                return fn()
            except Exception as exc:
                if self.strict:
                    raise
                summary["errors"].append(f"{name}: {type(exc).__name__}: {exc}")
                self.log(level="ERROR", ring=name, error=f"{type(exc).__name__}: {exc}", trace=traceback.format_exc()[-800:])
                return None

        if mode != "OFF":
            guarded("helpers:reap", self.helpers.reap_expired)
            pre_safety = self.store.get_control("SAFETY_STATE") or {}
            active_posture = pre_safety.get("posture") or POSTURE_GREEN
            effective_config = dict(config)
            effective_config["capabilities"] = self.ring4.filter_capabilities_for_posture(
                list(config.get("capabilities", [])), active_posture
            )
            demands = guarded("ring1", lambda: self.ring1.collect(effective_config, fleet["bots"])) or []
            summary["demands"] = [f"{d.kind}#{d.kingdom_id}" for d in demands]
            outcomes = {}
            for instance_id in instances:
                bot_id = fleet["active"].get(instance_id)
                bot = fleet["bots"].get(bot_id) if bot_id else None
                outcomes[instance_id] = guarded(f"ring2:{instance_id}",
                                                lambda i=instance_id, b=bot: self.ring2.plan_instance(i, b, demands, effective_config, mode, fleet["bots"]))
            summary["plans"] = outcomes
        summary["results"] = guarded("ring3", lambda: self.ring3.process(instances)) or 0
        refreshed_bots = self._fleet()["bots"] if summary["results"] > 0 else fleet["bots"]
        ctx_out = guarded("ring5", lambda: self.ring5.synthesize_overwatch(refreshed_bots)) or {}
        if ctx_out:
            summary["fleet_weather"] = ctx_out.get("fleet_weather", WEATHER_CLEAR)
            summary["behavioral_entropy"] = ctx_out.get("average_behavioral_entropy", 1.0)
        risk_mult = float(ctx_out.get("risk_penalty_multiplier", 1.0)) if ctx_out else 1.0
        safety_out = guarded("ring4", lambda: self.ring4.evaluate_fleet(refreshed_bots, config, mode, context_risk_multiplier=risk_mult)) or {}
        if safety_out:
            summary["safety_posture"] = safety_out.get("posture", POSTURE_GREEN)
            summary["residual_risk_score"] = safety_out.get("residual_risk_score")
            if safety_out.get("halted_mode"):
                mode = "OFF"
                summary["mode"] = "OFF"

        self.store.put_control("BRAIN_HEARTBEAT", {
            "ts": iso(self.clock()), "mode": mode, "version": __version__, "tick": self.tick_count,
            "node_id": self.cfg.node_id, "node_role": self.cfg.node_role, "node_priority": self.cfg.node_priority,
            "bots": summary["bots"], "plans": summary.get("plans", {}),
            "safety_posture": summary.get("safety_posture", POSTURE_GREEN),
            "residual_risk_score": summary.get("residual_risk_score"),
            "fleet_weather": summary.get("fleet_weather", WEATHER_CLEAR),
            "behavioral_entropy": summary.get("behavioral_entropy", 1.0),
            "last_errors": summary["errors"][-3:],
        })
        self.log(level="INFO", msg="tick", **{k: v for k, v in summary.items() if k != "tick"}, tick=self.tick_count)
        return summary

    def run_forever(self, stop: threading.Event) -> None:
        self.log(level="INFO", msg="brain started", version=__version__, node_id=self.cfg.node_id,
                 node_role=self.cfg.node_role, priority=self.cfg.node_priority,
                 boot_mode=self.cfg.boot_mode, tick_seconds=self.cfg.tick_seconds)
        while not stop.is_set():
            wait_s = self.cfg.tick_seconds
            try:
                summary = self.tick()
                plans = (summary or {}).get("plans") or {}
                idle_plans = bool(plans) and all(v in ("IDLE", "NO_ACTIVE_BOT", "DEDUPED", "REJECTED") for v in plans.values())
                if (summary or {}).get("mode") in ("OFF", "STANDBY_WATCH") or (idle_plans and (summary or {}).get("results", 0) == 0):
                    wait_s = max(self.cfg.tick_seconds, min(180, self.cfg.tick_seconds * 3))
                elif (summary or {}).get("results", 0) > 0:
                    wait_s = min(wait_s, 3)
            except Exception as exc:  # never die: Railway restarts would lose dedupe state
                self.log(level="ERROR", msg="tick crashed", error=f"{type(exc).__name__}: {exc}", trace=traceback.format_exc()[-800:])
            stop.wait(wait_s)
        self.log(level="INFO", msg="brain stopped", node_id=self.cfg.node_id)
