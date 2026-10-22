"""Oversight event emitter: every decision becomes a contract-validated BastionEvent.

Repeated identical decisions (same bot, same plan, same outcome) are emitted at most once per dedupe
window so the oversight log stays readable and DynamoDB writes stay small.
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

from contracts import validator as V
from contracts.validator import ContractValidationError


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


class Emitter:
    def __init__(self, store, clock: Callable[[], datetime], strict: bool = False,
                 dedupe_minutes: int = 60, log: Optional[Callable[[str], None]] = None):
        self.store, self.clock, self.strict = store, clock, strict
        self.dedupe = timedelta(minutes=dedupe_minutes)
        self.mode = "DRY_RUN"
        self._seen: Dict[str, datetime] = {}
        self._log = log or (lambda line: print(line, file=sys.stdout, flush=True))
        self.emitted: List[Dict[str, Any]] = []
        self.errors: List[str] = []

    def should_emit(self, fingerprint: Optional[str]) -> bool:
        if not fingerprint:
            return True
        now = self.clock()
        last = self._seen.get(fingerprint)
        if last is not None and now - last < self.dedupe:
            return False
        self._seen[fingerprint] = now
        if len(self._seen) > 5000:
            cutoff = now - self.dedupe
            self._seen = {k: v for k, v in self._seen.items() if v >= cutoff}
        return True

    def emit(self, *, ring: str, actor: str, event_type: str, summary: str, why: str,
             severity: str = "INFO", correlation_id: Optional[str] = None,
             trigger_inputs: Optional[Dict[str, Any]] = None, numnum_checks: Optional[List[Dict[str, Any]]] = None,
             evidence_refs: Optional[List[str]] = None, kingdom_id: Optional[int] = None,
             bot_id: Optional[str] = None, instance_id: Optional[str] = None, job_id: Optional[str] = None,
             operator_action_required: bool = False, operator_instructions: Optional[str] = None) -> Optional[Dict[str, Any]]:
        now = self.clock()
        oversight: Dict[str, Any] = {
            "why": why,
            "trigger_inputs": trigger_inputs or {},
            "numnum_checks": numnum_checks or [],
            "llm_telemetry": None,
            "evidence_refs": [r for r in (evidence_refs or []) if r],
        }
        if operator_action_required:
            oversight["operator_action_required"] = True
            oversight["operator_instructions"] = operator_instructions
        event = {
            "event_id": new_id("evt"),
            "correlation_id": correlation_id or new_id("corr"),
            "timestamp": iso(now),
            "epoch_day": now.astimezone(timezone.utc).strftime("%Y-%m-%d"),
            "operating_mode": self.mode,
            "ring": ring,
            "actor": actor,
            "event_type": event_type,
            "severity": severity,
            "kingdom_id": kingdom_id,
            "bot_id": bot_id,
            "instance_id": instance_id,
            "job_id": job_id,
            "summary": summary[:280],
            "oversight": oversight,
        }
        try:
            V.validate_event(event)
        except ContractValidationError as exc:
            msg = f"event contract violation ({event_type} by {actor}): {exc}"
            self.errors.append(msg)
            self._log(json.dumps({"ts": event["timestamp"], "level": "ERROR", "msg": msg}))
            if self.strict:
                raise
            return None
        self.store.append_event(event)
        self.emitted.append(event)
        self._log(json.dumps({"ts": event["timestamp"], "event": event_type, "actor": actor, "severity": severity,
                              "bot_id": bot_id, "summary": event["summary"]}))
        return event
