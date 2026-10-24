"""Ring 5 (RING_5_CONTEXT): Apex Contextual Reasoning & Situational Overwatch Ring (ZEUS + CORTEX).

Sits on the summit above Rings 1 (Intel), 2 (Ops), 3 (Audit), and 4 (Safety) to provide
panoramic situational awareness across four dimensions of context:
1. Episodic Memory & Anti-Metronome Behavioral Entropy (breaks repetitive state-machine patterns).
2. Visual Scene & Modal Context Grounding (distinguishes benign UI popups from anti-cheat threats).
3. Cross-Fleet Weather vs. Threat Correlation (calibrates Ring 4 risk penalties across instances).
4. Temporal & Instance Switch-Velocity Context (prevents rapid-fire account cycling).

Roster:
- ZEUS   (Apex Leader, LLM_PRO / 0-token deterministic fallback): Chief Contextual Overwatch Officer.
- CORTEX (Deterministic Context Engine, 0 tokens): Episodic memory, Shannon entropy & fleet correlator.
- Helpers: R5_SCENE_GROUNDER, R5_PERSONA_DIRECTOR.
"""

from __future__ import annotations

import math
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional

from . import numnum
from .events import Emitter, iso, new_id

WEATHER_CLEAR = "CLEAR_NOMINAL"
WEATHER_RESET = "UTC_DAILY_RESET_WINDOW"
WEATHER_MODAL_WAVE = "ENVIRONMENTAL_MODAL_WAVE"
WEATHER_THREAT_WAVE = "ACTIVE_TELEMETRY_SCAN_WAVE"

ROUTINE_STANDARD = "STANDARD"
ROUTINE_GATHER_FIRST = "GATHER_BEFORE_GROW"
ROUTINE_EARLY_ROTATE = "SKIP_GATHER_ROTATE"

BENIGN_MODAL_KEYWORDS = (
    "recharge",
    "bundle",
    "gift",
    "event",
    "mail",
    "personal",
    "report",
    "confirm",
    "character login",
    "vip",
    "chest",
)


def _shannon_entropy(actions: List[str]) -> float:
    """Computes normalized Shannon entropy (0.0 to 1.0) over a sequence of job types."""
    n = len(actions)
    if n <= 1:
        return 1.0
    counts = Counter(actions)
    if len(counts) == 1:
        return 0.0
    raw = -sum((c / n) * math.log2(c / n) for c in counts.values())
    max_ent = math.log2(min(n, 4))
    return round(min(1.0, raw / max_ent), 3) if max_ent > 0 else 1.0


def _has_metronome_pattern(actions: List[str]) -> bool:
    """Detects if a bot is repeating the exact same 1-step or 2-step sequence (e.g. grow->gather->grow->gather)."""
    non_switch = [a for a in actions if a != "switch_character"]
    if len(non_switch) >= 4:
        last4 = non_switch[-4:]
        if last4[0] == last4[2] and last4[1] == last4[3] and last4[0] != last4[1]:
            return True
    if len(non_switch) >= 3 and len(set(non_switch[-3:])) == 1 and non_switch[-1] in ("grow_city", "gather"):
        return True
    return False


class Ring5Context:
    """Apex Ring 5 Contextual Overwatch (ZEUS + CORTEX) governing Rings 1-4."""

    def __init__(
        self,
        store,
        emitter: Emitter,
        clock: Callable[[], datetime],
        advisor=None,
        helpers=None,
    ):
        self.store = store
        self.emitter = emitter
        self.clock = clock
        self.advisor = advisor
        self.helpers = helpers

    # ------------------------------------------------------------------ state persistence
    def _load_state(self) -> Dict[str, Any]:
        raw = self.store.get_control("CONTEXT_STATE") or {}
        return {
            "fleet_weather": raw.get("fleet_weather") or WEATHER_CLEAR,
            "risk_penalty_multiplier": float(raw.get("risk_penalty_multiplier") or 1.0),
            "episodic_by_bot": dict(raw.get("episodic_by_bot") or {}),
            "routine_variants": dict(raw.get("routine_variants") or {}),
            "switch_log_by_instance": dict(raw.get("switch_log_by_instance") or {}),
            "scene_classifications": list(raw.get("scene_classifications") or []),
            "updated_at": raw.get("updated_at"),
        }

    def _save_state(self, state: Dict[str, Any], now: datetime) -> None:
        cutoff_6h = now - timedelta(hours=6)
        cutoff_1h = now - timedelta(hours=1)
        state["scene_classifications"] = [
            s for s in (state.get("scene_classifications") or [])
            if (numnum.parse_ts(s.get("ts")) or now) >= cutoff_6h
        ][-120:]
        sw_map = {}
        for inst_id, ts_list in (state.get("switch_log_by_instance") or {}).items():
            sw_map[inst_id] = [
                t for t in (ts_list or [])
                if (numnum.parse_ts(t) or now) >= cutoff_1h
            ][-30:]
        state["switch_log_by_instance"] = sw_map
        state["updated_at"] = iso(now)
        self.store.put_control("CONTEXT_STATE", state)

    # ------------------------------------------------------------------ Scene & Episodic Ingestion (after Ring 3)
    def observe_result(
        self,
        bot: Dict[str, Any],
        job: Dict[str, Any],
        result: Dict[str, Any],
        enable_helpers: bool = False,
    ) -> Dict[str, Any]:
        """Ingests a completed job into CORTEX episodic memory and classifies visual/temporal context."""
        now = self.clock()
        state = self._load_state()
        bot_id = bot["bot_id"]
        inst_id = bot["instance_id"]
        jt = result.get("job_type") or job.get("job_type") or "unknown"
        status = result.get("status") or "UNKNOWN"
        ev = result.get("evidence") or {}
        ev_metrics = ev.get("metrics") or {}
        ocr_blob = " ".join(str(x) for x in (ev.get("ocr_lines") or [])).lower()
        stuck_reason = str(ev_metrics.get("stuck_reason") or "").lower()
        corr_id = result.get("correlation_id") or new_id("corr")

        # 1. Track emulator switch velocity
        if jt == "switch_character" and status == "SUCCEEDED":
            sw_list = list(state["switch_log_by_instance"].get(inst_id) or [])
            sw_list.append(iso(now))
            state["switch_log_by_instance"][inst_id] = sw_list

        # 2. Update Bot Episodic Memory & Behavioral Entropy
        ep = dict(state["episodic_by_bot"].get(bot_id) or {"recent_jobs": [], "entropy": 1.0})
        recent_jobs = list(ep.get("recent_jobs") or [])
        recent_jobs.append(jt)
        recent_jobs = recent_jobs[-12:]
        entropy = _shannon_entropy(recent_jobs)
        metronome = _has_metronome_pattern(recent_jobs)
        ep.update({
            "recent_jobs": recent_jobs,
            "entropy": entropy,
            "metronome_detected": metronome,
            "last_job_type": jt,
            "last_updated_at": iso(now),
        })
        state["episodic_by_bot"][bot_id] = ep

        # If metronome pattern detected, ZEUS prescribes a routine permutation for Ring 2's next turn
        directive_issued = None
        if metronome:
            variant = ROUTINE_GATHER_FIRST if jt == "grow_city" else ROUTINE_EARLY_ROTATE
            state["routine_variants"][bot_id] = variant
            directive_issued = variant
            fallback_why = (
                f"ZEUS & CORTEX detected a repetitive behavioral sequence on {bot['governor_name']} "
                f"(recent={recent_jobs[-4:]}, entropy={entropy}). Prescribing {variant} on next cycle to humanize telemetry."
            )
            why, llm_tel = (fallback_why, None)
            if self.advisor:
                why, llm_tel = self.advisor.advise(
                    "ZEUS",
                    f"Prescribe behavioral entropy permutation for {bot_id}",
                    {"bot_id": bot_id, "recent_jobs": recent_jobs[-6:], "entropy": entropy, "variant": variant},
                    fallback_why,
                )
            self.emitter.emit(
                ring="RING_5_CONTEXT",
                actor="ZEUS" if self.advisor else "CORTEX",
                event_type="CONTEXT_DIRECTIVE",
                severity="INFO",
                correlation_id=corr_id,
                kingdom_id=bot["kingdom_id"],
                bot_id=bot_id,
                instance_id=inst_id,
                job_id=result.get("job_id"),
                summary=f"ZEUS Context Directive: permute {bot['governor_name']} (#{bot['kingdom_id']}) routine -> {variant} (entropy {entropy})",
                why=why,
                llm_telemetry=llm_tel,
                trigger_inputs={
                    "directive": "ROUTINE_ENTROPY_PERMUTATION",
                    "variant": variant,
                    "recent_jobs": recent_jobs[-6:],
                    "entropy": entropy,
                },
            )
            if enable_helpers and self.helpers:
                self.helpers.spawn_helper(
                    "R5_PERSONA_DIRECTOR",
                    f"Humanize session cadence for {bot_id} (#{bot['kingdom_id']}) via {variant}.",
                    kingdom_id=int(bot["kingdom_id"]),
                    instance_id=inst_id,
                    bot_id=bot_id,
                    ttl_hours=4,
                    correlation_id=corr_id,
                )
        elif state["routine_variants"].get(bot_id) and jt in ("gather", "switch_character"):
            # Variant was consumed; reset to STANDARD
            state["routine_variants"].pop(bot_id, None)

        # 3. Classify Visual & Temporal Scene Context on anomalies/stalls
        scene_class = "NOMINAL_PROGRESS"
        if status == "ACCOUNT_LOCKED_OR_BANNED":
            scene_class = "CONFIRMED_TELEMETRY_THREAT"
        elif stuck_reason or status not in ("SUCCEEDED", "PARTIAL"):
            in_utc_reset = (now.hour == 0 and now.minute <= 35)
            combined_text = f"{ocr_blob} {stuck_reason}"
            if in_utc_reset and status != "ACCOUNT_LOCKED_OR_BANNED":
                scene_class = "DAILY_RESET_POPUP_WEATHER"
            elif any(k in combined_text for k in BENIGN_MODAL_KEYWORDS) or "repeated_tap" in stuck_reason:
                scene_class = "BENIGN_UI_MODAL_TRAP"
            else:
                scene_class = "UNCLASSIFIED_SCENE_FRICTION"

            state["scene_classifications"].append({
                "ts": iso(now),
                "bot_id": bot_id,
                "instance_id": inst_id,
                "kingdom_id": bot["kingdom_id"],
                "scene_class": scene_class,
                "stuck_reason": stuck_reason or status,
            })
            if enable_helpers and self.helpers and scene_class in ("BENIGN_UI_MODAL_TRAP", "UNCLASSIFIED_SCENE_FRICTION"):
                self.helpers.spawn_helper(
                    "R5_SCENE_GROUNDER",
                    f"Ground modal context on {bot_id} (#{bot['kingdom_id']}): {scene_class} ({stuck_reason or status}).",
                    kingdom_id=int(bot["kingdom_id"]),
                    instance_id=inst_id,
                    bot_id=bot_id,
                    ttl_hours=4,
                    correlation_id=corr_id,
                )

        self._save_state(state, now)
        return {
            "scene_class": scene_class,
            "entropy": entropy,
            "metronome_detected": metronome,
            "routine_variant": state["routine_variants"].get(bot_id, ROUTINE_STANDARD),
            "directive_issued": directive_issued,
        }

    # ------------------------------------------------------------------ Tick-level Apex Overwatch Synthesis
    def synthesize_overwatch(self, bots: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Evaluates panoramic fleet weather, switch velocity, and risk-weight modifiers for Rings 1-4."""
        now = self.clock()
        state = self._load_state()
        cutoff_1h = now - timedelta(hours=1)

        recent_scenes = [
            s for s in (state.get("scene_classifications") or [])
            if (numnum.parse_ts(s.get("ts")) or now) >= cutoff_1h
        ]
        threat_count = sum(1 for s in recent_scenes if s.get("scene_class") == "CONFIRMED_TELEMETRY_THREAT")
        modal_bots = {s.get("bot_id") for s in recent_scenes if s.get("scene_class") in ("BENIGN_UI_MODAL_TRAP", "DAILY_RESET_POPUP_WEATHER")}

        in_utc_reset = (now.hour == 0 and now.minute <= 35)
        if threat_count > 0:
            weather = WEATHER_THREAT_WAVE
            risk_mult = 1.35
        elif len(modal_bots) >= 2:
            weather = WEATHER_MODAL_WAVE
            risk_mult = 0.5  # Dampen false-positive risk spike when multiple bots hit a global game modal
        elif in_utc_reset:
            weather = WEATHER_RESET
            risk_mult = 0.75
        else:
            weather = WEATHER_CLEAR
            risk_mult = 1.0

        state["fleet_weather"] = weather
        state["risk_penalty_multiplier"] = risk_mult
        self._save_state(state, now)

        avg_entropy = 1.0
        ent_vals = [float(v.get("entropy", 1.0)) for v in state["episodic_by_bot"].values() if isinstance(v, dict)]
        if ent_vals:
            avg_entropy = round(sum(ent_vals) / len(ent_vals), 3)

        return {
            "fleet_weather": weather,
            "risk_penalty_multiplier": risk_mult,
            "average_behavioral_entropy": avg_entropy,
            "active_routine_variants": dict(state.get("routine_variants") or {}),
            "switches_last_hour": {
                k: len(v) for k, v in (state.get("switch_log_by_instance") or {}).items()
            },
        }
