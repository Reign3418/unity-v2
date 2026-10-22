"""Brain runtime: one tick = resolve mode -> Ring 1 demand -> Ring 2 plans -> Ring 3 results -> heartbeat."""

from __future__ import annotations

import json
import sys
import threading
import traceback
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from . import __version__
from .config import VALID_MODES, BrainConfig
from .events import Emitter, iso
from .leaders import HelperManager, LeaderAdvisor
from .rings import DEFAULT_CONFIG, Ring1, Ring2, Ring3, instance_key


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
        self.ring1 = Ring1(store, self.emitter, clock, advisor=self.advisor, helpers=self.helpers)
        self.ring2 = Ring2(store, transport, self.emitter, clock, advisor=self.advisor, helpers=self.helpers)
        self.ring3 = Ring3(store, transport, self.emitter, clock, cfg.results_wait_seconds, advisor=self.advisor, helpers=self.helpers)
        self.force_mode = force_mode
        self.mode: Optional[str] = None
        self.tick_count = 0
        self.strict = strict_events

    def log(self, **fields: Any) -> None:
        self._log(json.dumps({"ts": iso(self.clock()), **fields}, default=str))

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
                                              "brain_version": __version__})
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
        summary: Dict[str, Any] = {"tick": self.tick_count, "errors": []}
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
            demands = guarded("ring1", lambda: self.ring1.collect(config, fleet["bots"])) or []
            summary["demands"] = [f"{d.kind}#{d.kingdom_id}" for d in demands]
            outcomes = {}
            for instance_id in instances:
                bot_id = fleet["active"].get(instance_id)
                bot = fleet["bots"].get(bot_id) if bot_id else None
                outcomes[instance_id] = guarded(f"ring2:{instance_id}",
                                                lambda i=instance_id, b=bot: self.ring2.plan_instance(i, b, demands, config, mode, fleet["bots"]))
            summary["plans"] = outcomes
        summary["results"] = guarded("ring3", lambda: self.ring3.process(instances)) or 0

        self.store.put_control("BRAIN_HEARTBEAT", {
            "ts": iso(self.clock()), "mode": mode, "version": __version__, "tick": self.tick_count,
            "bots": summary["bots"], "plans": summary.get("plans", {}), "last_errors": summary["errors"][-3:],
        })
        self.log(level="INFO", msg="tick", **{k: v for k, v in summary.items() if k != "tick"}, tick=self.tick_count)
        return summary

    def run_forever(self, stop: threading.Event) -> None:
        self.log(level="INFO", msg="brain started", version=__version__, boot_mode=self.cfg.boot_mode, tick_seconds=self.cfg.tick_seconds)
        while not stop.is_set():
            try:
                self.tick()
            except Exception as exc:  # never die: Railway restarts would lose dedupe state
                self.log(level="ERROR", msg="tick crashed", error=f"{type(exc).__name__}: {exc}", trace=traceback.format_exc()[-800:])
            stop.wait(self.cfg.tick_seconds)
        self.log(level="INFO", msg="brain stopped")
