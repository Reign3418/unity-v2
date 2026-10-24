"""Step 6: Ring Leaders (SCOUT, TANK, AUDIT) structured Gemini advisor + Bounded Helper lifecycle manager.

Design principles (SPEC.md):
- One LLM/SLM per Ring Leader:
  * Ring 1 SCOUT -> gemini-2.5-flash-lite (SLM_FLASH_LITE): emits signals & triages leads.
  * Ring 2 TANK  -> gemini-2.5-flash (LLM_FLASH): proposes plans & spawns ops helpers.
  * Ring 3 AUDIT -> gemini-2.5-pro (LLM_PRO): verifies facts & investigates suspect/lost bots.
- LLM plans, never controls: structured rationale + helper spawning pass through NUMNUM and contract validation.
- Zero-token resilient fallback: when GEMINI_API_KEY is unset or a ring's hourly token budget is exhausted,
  deterministic ring rules continue uninterrupted with 0 tokens.
"""

from __future__ import annotations

import json
import re
import time
import urllib.request
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Tuple

from contracts import validator as V
from contracts.validator import ContractValidationError

from . import numnum
from .events import iso, new_id

RING_HOURLY_TOKEN_CAP: Dict[str, int] = {
    "RING_1_INTEL": 30000,
    "RING_2_OPS": 50000,
    "RING_3_AUDIT": 40000,
    "RING_4_SAFETY": 25000,
}


def _registry() -> Dict[str, Any]:
    return V.load_all_schemas()["helpers.schema.json"]["x_canonical_registry"]


def _clean_tag(raw: str) -> str:
    cleaned = re.sub(r"[^A-Z0-9_-]", "", raw.upper())
    return cleaned[:16] or "01"


class LeaderAdvisor:
    """Manages per-ring hourly token budgets and optional structured Gemini calls for SCOUT, TANK, and AUDIT."""

    def __init__(
        self,
        store,
        clock: Callable[[], datetime],
        api_key: str = "",
        llm_fn: Optional[Callable[[str, str, Dict[str, Any]], Tuple[Dict[str, Any], Dict[str, Any]]]] = None,
    ):
        self.store = store
        self.clock = clock
        self.api_key = (api_key or "").strip()
        self.llm_fn = llm_fn
        self.registry = _registry()

    def ring_budget(self, ring: str, now: Optional[datetime] = None) -> Tuple[int, int]:
        """Returns (tokens_used_this_hour, hourly_cap) for the given ring."""
        t = now or self.clock()
        hour_key = t.strftime("%Y-%m-%dT%H")
        rec = self.store.get_control("RING_BUDGET") or {}
        if rec.get("hour") != hour_key:
            rec = {
                "hour": hour_key,
                "rings": {r: {"used": 0, "cap": cap} for r, cap in RING_HOURLY_TOKEN_CAP.items()},
            }
        rings = rec.get("rings") or {}
        r_info = rings.get(ring) or {"used": 0, "cap": RING_HOURLY_TOKEN_CAP.get(ring, 30000)}
        return int(r_info.get("used", 0)), int(r_info.get("cap", RING_HOURLY_TOKEN_CAP.get(ring, 30000)))

    def record_tokens(self, ring: str, tokens: int, now: Optional[datetime] = None) -> Tuple[int, int]:
        t = now or self.clock()
        hour_key = t.strftime("%Y-%m-%dT%H")
        rec = self.store.get_control("RING_BUDGET") or {}
        if rec.get("hour") != hour_key:
            rec = {
                "hour": hour_key,
                "rings": {r: {"used": 0, "cap": cap} for r, cap in RING_HOURLY_TOKEN_CAP.items()},
            }
        rings = rec.setdefault("rings", {})
        entry = rings.setdefault(ring, {"used": 0, "cap": RING_HOURLY_TOKEN_CAP.get(ring, 30000)})
        entry["used"] = int(entry.get("used", 0)) + max(0, int(tokens))
        self.store.put_control("RING_BUDGET", rec)
        return int(entry["used"]), int(entry["cap"])

    def advise(
        self,
        leader: str,
        objective: str,
        context: Dict[str, Any],
        fallback_why: str,
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """Queries the Ring Leader LLM (or injected test callable) if configured and within ring token budget."""
        leader_meta = self.registry["leaders"].get(leader)
        if not leader_meta:
            return fallback_why, None

        ring = leader_meta["ring"]
        model = leader_meta["default_model"]
        used, cap = self.ring_budget(ring)
        if used >= cap:
            return fallback_why, None
        if not self.llm_fn and not self.api_key:
            return fallback_why, None

        try:
            if self.llm_fn:
                parsed, telemetry = self.llm_fn(leader, model, {"objective": objective, "context": context})
            else:
                parsed, telemetry = self._call_gemini(leader, model, objective, context)
            total_tokens = int(telemetry.get("prompt_tokens", 0)) + int(telemetry.get("completion_tokens", 0))
            if used + total_tokens > cap:
                return fallback_why, None
            self.record_tokens(ring, total_tokens)
            why = str(parsed.get("why") or fallback_why).strip()
            if len(why) < 5:
                why = fallback_why
            return why[:400], {
                "model": str(telemetry.get("model") or model),
                "prompt_tokens": max(0, int(telemetry.get("prompt_tokens", 0))),
                "completion_tokens": max(0, int(telemetry.get("completion_tokens", 0))),
                "latency_ms": max(0, int(telemetry.get("latency_ms", 0))),
            }
        except Exception:
            return fallback_why, None

    def _call_gemini(
        self,
        leader: str,
        model: str,
        objective: str,
        context: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        t0 = time.monotonic()
        prompt = (
            f"You are {leader}, Ring Leader in the Bastion Autonomous Fleet Orchestrator.\n"
            f"Objective: {objective}\n"
            f"Context JSON: {json.dumps(context, default=str)}\n"
            'Respond ONLY with compact JSON: {"why": "<1-2 sentence executive rationale>"}'
        )
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 140,
                "responseMimeType": "application/json",
            },
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
        latency_ms = int((time.monotonic() - t0) * 1000)
        text = (
            raw.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "{}")
        )
        usage = raw.get("usageMetadata") or {}
        parsed = json.loads(text) if isinstance(text, str) else {}
        return parsed, {
            "model": model,
            "prompt_tokens": int(usage.get("promptTokenCount", 120)),
            "completion_tokens": int(usage.get("candidatesTokenCount", 35)),
            "latency_ms": latency_ms,
        }


class HelperManager:
    """Spawns, tracks, and retires bounded helpers under SCOUT, TANK, and AUDIT."""

    def __init__(self, store, emitter, clock: Callable[[], datetime], advisor: Optional[LeaderAdvisor] = None):
        self.store = store
        self.emitter = emitter
        self.clock = clock
        self.advisor = advisor
        self.registry = _registry()

    def _load(self) -> Dict[str, List[Dict[str, Any]]]:
        raw = self.store.get_control("HELPERS") or {}
        return {
            "active": list(raw.get("active") or []),
            "recent_retired": list(raw.get("recent_retired") or []),
        }

    def _save(self, state: Dict[str, List[Dict[str, Any]]]) -> None:
        state["recent_retired"] = state["recent_retired"][-25:]
        self.store.put_control("HELPERS", state)

    def active_helpers(self, ring: Optional[str] = None) -> List[Dict[str, Any]]:
        act = self._load()["active"]
        return [h for h in act if ring is None or h["parent_ring"] == ring]

    def reap_expired(self) -> int:
        """Retires any helper whose TTL has elapsed or whose hourly token cap is exhausted."""
        now = self.clock()
        state = self._load()
        keep: List[Dict[str, Any]] = []
        reaped = 0
        for h in state["active"]:
            exp = numnum.parse_ts(h.get("expires_at"))
            reason = None
            if exp and now >= exp:
                h["status"] = "EXPIRED_TTL"
                reason = f"Helper {h['helper_id']} reached its TTL ({h['expires_at']}) and was automatically retired."
            elif int(h.get("tokens_used_this_hour", 0)) >= int(h.get("hourly_token_cap", 10000)):
                h["status"] = "BUDGET_EXHAUSTED"
                reason = f"Helper {h['helper_id']} reached its hourly token cap ({h['hourly_token_cap']}) and was retired."
            if reason:
                reaped += 1
                state["recent_retired"].append(h)
                scope = h.get("scope") or {}
                self.emitter.emit(
                    ring=h["parent_ring"],
                    actor=h["parent_leader"],
                    event_type="HELPER_RETIRED",
                    severity="INFO",
                    kingdom_id=scope.get("kingdom_id"),
                    bot_id=scope.get("bot_id"),
                    instance_id=scope.get("instance_id"),
                    summary=f"{h['parent_leader']} retired {h['helper_id']} ({h['status']})",
                    why=reason,
                    trigger_inputs={"helper_id": h["helper_id"], "template_id": h["template_id"], "status": h["status"]},
                )
            else:
                keep.append(h)
        if reaped:
            state["active"] = keep
            self._save(state)
        return reaped

    def spawn_helper(
        self,
        template_id: str,
        objective: str,
        *,
        kingdom_id: Optional[int] = None,
        instance_id: Optional[str] = None,
        bot_id: Optional[str] = None,
        ttl_hours: float = 6.0,
        model_tier: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], bool]:
        """Spawns a bounded helper from the canonical template registry if not already active and under ring cap."""
        tmpl = self.registry["helper_templates"].get(template_id)
        if not tmpl:
            raise ContractValidationError(f"Unknown helper template: {template_id}")

        state = self._load()
        for existing in state["active"]:
            sc = existing.get("scope") or {}
            if (
                existing["template_id"] == template_id
                and sc.get("kingdom_id") == kingdom_id
                and sc.get("instance_id") == instance_id
                and sc.get("bot_id") == bot_id
            ):
                return existing, False

        now = self.clock()
        parent_ring = tmpl["parent_ring"]
        parent_leader = tmpl["parent_leader"]
        ring_active = [h for h in state["active"] if h["parent_ring"] == parent_ring]
        max_per_ring = int(self.registry["guardrails"]["max_concurrent_helpers_per_ring"])

        tag_parts = [str(kingdom_id or ""), str(bot_id or instance_id or "")]
        tag = _clean_tag("_".join(p for p in tag_parts if p) or new_id("H")[-6:])
        helper_id = f"HELPER:{template_id}_{tag}"[:55]

        scope: Dict[str, Any] = {"objective": objective[:240]}
        if kingdom_id is not None:
            scope["kingdom_id"] = int(kingdom_id)
        if instance_id is not None:
            scope["instance_id"] = str(instance_id)
        if bot_id is not None:
            scope["bot_id"] = str(bot_id)

        helper: Dict[str, Any] = {
            "helper_id": helper_id,
            "template_id": template_id,
            "parent_ring": parent_ring,
            "parent_leader": parent_leader,
            "model_tier": model_tier or tmpl["max_model_tier"],
            "scope": scope,
            "spawned_at": iso(now),
            "expires_at": iso(now + timedelta(hours=ttl_hours)),
            "hourly_token_cap": int(tmpl["default_hourly_token_cap"]),
            "tokens_used_this_hour": 0,
            "can_spawn_subhelpers": False,
            "status": "ACTIVE",
        }

        used_tokens, ring_cap = self.advisor.ring_budget(parent_ring, now) if self.advisor else (0, 50000)
        checks = [
            numnum._check(
                "HELPER_CONCURRENCY_CAP",
                len(ring_active) < max_per_ring,
                len(ring_active),
                max_per_ring,
                f"{len(ring_active)}/{max_per_ring} active helpers in {parent_ring}",
            ),
            numnum._check(
                "RING_TOKEN_BUDGET",
                used_tokens < ring_cap,
                used_tokens,
                ring_cap,
                f"{used_tokens}/{ring_cap} hourly tokens used in {parent_ring}",
            ),
        ]
        if not all(c["passed"] for c in checks):
            return None, False

        V.validate_helper_spawn(helper, active_helpers_in_ring=len(ring_active))
        state["active"].append(helper)
        self._save(state)

        self.emitter.emit(
            ring=parent_ring,
            actor=parent_leader,
            event_type="HELPER_SPAWNED",
            severity="INFO",
            correlation_id=correlation_id or new_id("corr"),
            kingdom_id=kingdom_id,
            bot_id=bot_id,
            instance_id=instance_id,
            summary=f"{parent_leader} spawned {helper_id} ({helper['model_tier']}, TTL {ttl_hours:g}h)",
            why=f"{tmpl['description']} Objective: {scope['objective']}",
            numnum_checks=checks,
            trigger_inputs={"helper": helper},
        )
        return helper, True

    def retire_matching(
        self,
        template_id: str,
        *,
        kingdom_id: Optional[int] = None,
        bot_id: Optional[str] = None,
        reason: str = "Objective completed.",
        status: str = "COMPLETED",
    ) -> int:
        state = self._load()
        keep: List[Dict[str, Any]] = []
        retired = 0
        for h in state["active"]:
            sc = h.get("scope") or {}
            match = (
                h["template_id"] == template_id
                and (kingdom_id is None or sc.get("kingdom_id") == kingdom_id)
                and (bot_id is None or sc.get("bot_id") == bot_id)
            )
            if match:
                h["status"] = status
                state["recent_retired"].append(h)
                retired += 1
                self.emitter.emit(
                    ring=h["parent_ring"],
                    actor=h["parent_leader"],
                    event_type="HELPER_RETIRED",
                    severity="INFO",
                    kingdom_id=sc.get("kingdom_id"),
                    bot_id=sc.get("bot_id"),
                    instance_id=sc.get("instance_id"),
                    summary=f"{h['parent_leader']} retired {h['helper_id']} ({status})",
                    why=reason,
                    trigger_inputs={"helper_id": h["helper_id"], "template_id": template_id, "status": status},
                )
            else:
                keep.append(h)
        if retired:
            state["active"] = keep
            self._save(state)
        return retired
