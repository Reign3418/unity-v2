"""Ring 4 (RING_4_SAFETY): Sovereign Risk & Safety Overwatch Ring (AEGIS + WARDEN).

Separates fleet-wide Risk Assessment & Deterministic Safety Interlocks from Ring 1 (Intel),
Ring 2 (Operations), and Ring 3 (Per-Result Audit) so the operational rings are never overwhelmed
and cross-ring control-loop hazards (MIT STPA 'unspoken risks') are caught by an independent observer.

Roster:
- AEGIS  (Leader, LLM_PRO / 0-token deterministic fallback): Risk & Unspoken-Assumption Officer.
- WARDEN (Deterministic Rule Member, 0 tokens):
    1. STPA Control-Loop Velocity Watchdog (catches rc=0 zero-progress loops across ticks).
    2. Quantitative 5-Layer Risk Ledger (Inherent -> Mitigated -> Residual vs. Acceptable -> Accepted).
    3. 3-Tier Safety Posture Governor (GREEN_NOMINAL -> AMBER_CAUTIOUS auto-throttle -> RED_HALT kill-switch).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Tuple

from . import numnum
from .events import Emitter, iso, new_id
from .rings import runtime_key

POSTURE_GREEN = "GREEN_NOMINAL"
POSTURE_AMBER = "AMBER_CAUTIOUS"
POSTURE_RED = "RED_HALT"

# Baseline FAIR-inspired risk parameters (0-100 scale)
INHERENT_RISK_SCORE = 85.0
CONTROL_MITIGATION_SCORE = 68.0
BASE_RESIDUAL_RISK_SCORE = 17.0  # Inherent (85) - Controls (68) = 17% baseline grey-area residual risk
AMBER_RISK_THRESHOLD = 38.0
RED_RISK_THRESHOLD = 55.0

ACTIVE_SAFETY_MECHANISMS = [
    "NUMNUM_8_RULE_PREFLIGHT_INTERLOCK",
    "PIXEL_3X_SPATIAL_CIRCUIT_BREAKER",
    "SDCARD_EPHEMERAL_TRACE_SCRUB",
    "ROVING_GUARD_LRU_ SIBLING_PATROL",
    "WARDEN_STPA_VELOCITY_WATCHDOG",
    "WARDEN_3_TIER_RISK_BUDGET_GOVERNOR",
]

STPA_ZERO_DELTA_TRIP_COUNT = 3
STPA_COOLDOWN_MINUTES = 30


class Ring4Safety:
    """Independent Ring 4 Safety Instrumented System (SIS) watching Rings 1, 2, and 3."""

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
        raw = self.store.get_control("SAFETY_STATE") or {}
        return {
            "posture": raw.get("posture") or POSTURE_GREEN,
            "bot_velocity": dict(raw.get("bot_velocity") or {}),
            "incidents": list(raw.get("incidents") or []),
            "known_suspect_bots": list(raw.get("known_suspect_bots") or []),
            "risk_ledger": dict(raw.get("risk_ledger") or {}),
            "updated_at": raw.get("updated_at"),
        }

    def _save_state(self, state: Dict[str, Any], now: datetime) -> None:
        cutoff_24h = now - timedelta(hours=24)
        kept_incidents = []
        for inc in state.get("incidents") or []:
            ts = numnum.parse_ts(inc.get("ts"))
            if ts is not None and ts >= cutoff_24h:
                kept_incidents.append(inc)
        state["incidents"] = kept_incidents[-200:]
        state["updated_at"] = iso(now)
        self.store.put_control("SAFETY_STATE", state)

    # ------------------------------------------------------------------ per-result STPA hook (called after Ring 3)
    def record_job_outcome(
        self,
        bot: Dict[str, Any],
        job: Dict[str, Any],
        result: Dict[str, Any],
        prev_ch: int,
        prev_power: int,
        enable_helpers: bool = False,
    ) -> Optional[str]:
        """Audits a completed job result for STPA unspoken control-loop drift or ban signals.

        Returns the interlock code if a safety breaker tripped, else None.
        """
        now = self.clock()
        state = self._load_state()
        bot_id = bot["bot_id"]
        jt = result.get("job_type")
        status = result.get("status")
        obs = result.get("observed_state") or {}
        ev_metrics = (result.get("evidence") or {}).get("metrics") or {}
        corr_id = result.get("correlation_id") or new_id("corr")

        # 1. Check explicit ban / lock status
        if status == "ACCOUNT_LOCKED_OR_BANNED":
            state["incidents"].append({
                "ts": iso(now),
                "kind": "ACCOUNT_BAN_SIGNAL",
                "bot_id": bot_id,
                "account_id": bot.get("account_id"),
                "instance_id": bot.get("instance_id"),
                "kingdom_id": bot.get("kingdom_id"),
                "job_id": result.get("job_id"),
            })
            if bot_id not in state["known_suspect_bots"]:
                state["known_suspect_bots"].append(bot_id)
            if enable_helpers and self.helpers:
                self.helpers.spawn_helper(
                    "R4_CONTAINMENT_OFFICER",
                    f"Verify blast-radius containment and twin coverage after ban signal on {bot_id} (#{bot['kingdom_id']}).",
                    kingdom_id=int(bot["kingdom_id"]),
                    instance_id=bot["instance_id"],
                    bot_id=bot_id,
                    ttl_hours=6,
                    correlation_id=corr_id,
                )
            self._save_state(state, now)
            return "ACCOUNT_BAN_CONTAINMENT"

        # 2. STPA Unspoken Control-Loop Velocity Watchdog (catches rc=0 zero-progress loops)
        if jt in ("grow_city", "gather") and status in ("SUCCEEDED", "PARTIAL"):
            new_ch = int(obs.get("ch_level") or prev_ch)
            new_power = int(obs.get("power") or prev_power)
            t_sec = int(ev_metrics.get("timer_seconds") or 0)
            g_mins = int(ev_metrics.get("gather_timer_minutes") or 0)
            stuck_reason = ev_metrics.get("stuck_reason")

            made_progress = (
                (new_ch > prev_ch)
                or (new_power > prev_power)
                or (t_sec > 0)
                or (jt == "gather" and status == "SUCCEEDED" and g_mins > 0 and not stuck_reason)
            )

            vel = dict(state["bot_velocity"].get(bot_id) or {"zero_delta_streak": 0, "stuck_trips": 0})
            if stuck_reason or not made_progress:
                vel["zero_delta_streak"] = int(vel.get("zero_delta_streak", 0)) + 1
                if stuck_reason:
                    vel["stuck_trips"] = int(vel.get("stuck_trips", 0)) + 1
                vel["last_zero_delta_at"] = iso(now)
                vel["last_stuck_reason"] = stuck_reason or "ZERO_WORLD_STATE_DELTA"
            else:
                vel["zero_delta_streak"] = 0
                vel["stuck_trips"] = 0
                vel["last_progress_at"] = iso(now)

            state["bot_velocity"][bot_id] = vel

            if vel["zero_delta_streak"] >= STPA_ZERO_DELTA_TRIP_COUNT or int(vel.get("stuck_trips", 0)) >= 2:
                reason_code = vel.get("last_stuck_reason") or "STPA_ZERO_VELOCITY_LOOP"
                streak = vel["zero_delta_streak"]
                vel["zero_delta_streak"] = 0
                vel["stuck_trips"] = 0
                state["bot_velocity"][bot_id] = vel
                state["incidents"].append({
                    "ts": iso(now),
                    "kind": "STPA_DRIFT",
                    "bot_id": bot_id,
                    "account_id": bot.get("account_id"),
                    "instance_id": bot.get("instance_id"),
                    "kingdom_id": bot.get("kingdom_id"),
                    "reason": reason_code,
                })

                # Lock a 30-minute safety cooldown on this bot so Ring 2 rotates to a healthy sibling
                rt = numnum.fresh_runtime(self.store.get_control(runtime_key(bot_id)), bot, now)
                rt["timer_ready_until"] = iso(now + timedelta(minutes=STPA_COOLDOWN_MINUTES))
                rt["farmed_this_timer"] = True
                rt["last_timer_label"] = f"warden_stpa_interlock:{reason_code}"[:64]
                self.store.put_control(runtime_key(bot_id), rt)

                fallback_why = (
                    f"STPA Velocity Watchdog tripped: {bot['governor_name']} completed {streak} slices of {jt} "
                    f"with zero world-state delta ({reason_code}). Enforced {STPA_COOLDOWN_MINUTES}m safety cooldown "
                    f"and sibling rotation."
                )
                why, llm_tel = (fallback_why, None)
                if self.advisor:
                    why, llm_tel = self.advisor.advise(
                        "AEGIS",
                        f"Explain STPA control-loop interlock on {bot_id} after {streak} zero-delta slices",
                        {"bot_id": bot_id, "job_type": jt, "streak": streak, "reason": reason_code},
                        fallback_why,
                    )

                self.emitter.emit(
                    ring="RING_4_SAFETY",
                    actor="WARDEN",
                    event_type="SAFETY_INTERLOCK_TRIPPED",
                    severity="WARN",
                    correlation_id=corr_id,
                    kingdom_id=bot["kingdom_id"],
                    bot_id=bot_id,
                    instance_id=bot["instance_id"],
                    job_id=result.get("job_id"),
                    summary=f"WARDEN tripped STPA Velocity Breaker on {bot['governor_name']} (#{bot['kingdom_id']}) -> {STPA_COOLDOWN_MINUTES}m cooldown",
                    why=why,
                    llm_telemetry=llm_tel,
                    trigger_inputs={
                        "interlock": "WARDEN_STPA_VELOCITY_WATCHDOG",
                        "zero_delta_streak": streak,
                        "reason": reason_code,
                        "cooldown_minutes": STPA_COOLDOWN_MINUTES,
                    },
                )
                if enable_helpers and self.helpers:
                    self.helpers.spawn_helper(
                        "R4_STPA_LOOP_HUNTER",
                        f"Audit control-loop drift on {bot_id} (#{bot['kingdom_id']}): {reason_code}.",
                        kingdom_id=int(bot["kingdom_id"]),
                        instance_id=bot["instance_id"],
                        bot_id=bot_id,
                        ttl_hours=4,
                        correlation_id=corr_id,
                    )
                self._save_state(state, now)
                return "STPA_VELOCITY_INTERLOCK"

        self._save_state(state, now)
        return None

    # ------------------------------------------------------------------ tick-level Fleet Risk & Safety Evaluation
    def evaluate_fleet(
        self,
        bots: Dict[str, Dict[str, Any]],
        config: Dict[str, Any],
        current_mode: str,
        context_risk_multiplier: float = 1.0,
    ) -> Dict[str, Any]:
        """Computes the 5-Layer Risk Ledger and enforces the 3-Tier Safety Posture (GREEN / AMBER / RED)."""
        now = self.clock()
        state = self._load_state()
        prev_posture = state.get("posture") or POSTURE_GREEN
        known_suspect = set(state.get("known_suspect_bots") or [])

        # Sync any newly SUSPECT bots that haven't been recorded as incidents yet
        current_suspect_ids: List[str] = []
        for b in bots.values():
            if b.get("lifecycle_state") == "SUSPECT" or (b.get("health") or {}).get("ban_suspected"):
                current_suspect_ids.append(b["bot_id"])
                if b["bot_id"] not in known_suspect:
                    known_suspect.add(b["bot_id"])
                    # Baseline historical suspect bots at boot don't count as fresh 6h spikes unless they just happened
                    last_v = numnum.parse_ts((b.get("verified_state") or {}).get("last_verified_at"))
                    if last_v and (now - last_v) <= timedelta(hours=2):
                        state["incidents"].append({
                            "ts": iso(last_v),
                            "kind": "SUSPECT_BOT_DETECTED",
                            "bot_id": b["bot_id"],
                            "account_id": b.get("account_id"),
                            "instance_id": b.get("instance_id"),
                            "kingdom_id": b.get("kingdom_id"),
                        })
        state["known_suspect_bots"] = sorted(known_suspect)

        # Rolling window incident counts
        cutoff_6h = now - timedelta(hours=6)
        cutoff_12h = now - timedelta(hours=12)

        ban_6h_bots = set()
        ban_6h_accounts = set()
        suspect_12h_bots = set()
        stpa_6h_count = 0

        for inc in state.get("incidents") or []:
            ts = numnum.parse_ts(inc.get("ts"))
            if ts is None:
                continue
            kind = inc.get("kind")
            if ts >= cutoff_6h:
                if kind in ("ACCOUNT_BAN_SIGNAL", "SUSPECT_BOT_DETECTED"):
                    if inc.get("bot_id"):
                        ban_6h_bots.add(inc["bot_id"])
                    if inc.get("account_id") and kind == "ACCOUNT_BAN_SIGNAL":
                        ban_6h_accounts.add(inc["account_id"])
                elif kind == "STPA_DRIFT":
                    stpa_6h_count += 1
            if ts >= cutoff_12h and kind in ("ACCOUNT_BAN_SIGNAL", "SUSPECT_BOT_DETECTED"):
                if inc.get("bot_id"):
                    suspect_12h_bots.add(inc["bot_id"])

        # Quantitative 5-Layer Risk Calculation (0-100 scale, modulated by Ring 5 ZEUS context multiplier)
        incident_penalty = (
            len(suspect_12h_bots) * 14.0
            + len(ban_6h_accounts) * 18.0
            + (stpa_6h_count * 6.0 * float(context_risk_multiplier))
        )
        residual_score = round(min(100.0, BASE_RESIDUAL_RISK_SCORE + incident_penalty), 1)

        # Determine 3-Tier Safety Posture
        if len(ban_6h_bots) >= 3 or len(ban_6h_accounts) >= 2 or residual_score >= RED_RISK_THRESHOLD:
            new_posture = POSTURE_RED
            posture_reason = (
                f"Acceptable risk ceiling ({RED_RISK_THRESHOLD}%) breached: "
                f"residual_risk={residual_score}%, ban_bots_6h={len(ban_6h_bots)}, ban_accounts_6h={len(ban_6h_accounts)}."
            )
        elif len(suspect_12h_bots) >= 2 or stpa_6h_count >= 3 or residual_score >= AMBER_RISK_THRESHOLD:
            new_posture = POSTURE_AMBER
            posture_reason = (
                f"Approaching acceptable risk boundary ({AMBER_RISK_THRESHOLD}%): "
                f"residual_risk={residual_score}%, suspect_bots_12h={len(suspect_12h_bots)}, stpa_trips_6h={stpa_6h_count}. "
                f"Throttling routine growth/gathering to stealth scan-only mode."
            )
        else:
            new_posture = POSTURE_GREEN
            posture_reason = (
                f"Residual risk ({residual_score}%) is within Accepted Risk budget (<={AMBER_RISK_THRESHOLD}%). "
                f"All 6 deterministic safety mechanisms nominal."
            )

        risk_ledger = {
            "inherent_risk_score": INHERENT_RISK_SCORE,
            "control_mitigation_score": CONTROL_MITIGATION_SCORE,
            "residual_risk_score": residual_score,
            "acceptable_risk_amber_ceiling": AMBER_RISK_THRESHOLD,
            "acceptable_risk_red_ceiling": RED_RISK_THRESHOLD,
            "accepted_risk_signed_off": residual_score < RED_RISK_THRESHOLD,
            "active_suspect_bots": current_suspect_ids,
            "rolling_12h_suspect_count": len(suspect_12h_bots),
            "rolling_6h_ban_accounts": len(ban_6h_accounts),
            "rolling_6h_stpa_interceptions": stpa_6h_count,
            "active_safety_mechanisms": ACTIVE_SAFETY_MECHANISMS,
        }
        state["posture"] = new_posture
        state["risk_ledger"] = risk_ledger

        # Emit SAFETY_POSTURE_CHANGED when transitioning between GREEN / AMBER / RED
        if new_posture != prev_posture:
            sev = "CRITICAL" if new_posture == POSTURE_RED else ("WARN" if new_posture == POSTURE_AMBER else "NOTICE")
            actor = "AEGIS" if self.advisor else "WARDEN"
            why, llm_tel = (posture_reason, None)
            if self.advisor:
                why, llm_tel = self.advisor.advise(
                    "AEGIS",
                    f"Transition Fleet Safety Posture from {prev_posture} to {new_posture}",
                    {"previous": prev_posture, "new": new_posture, "risk_ledger": risk_ledger},
                    posture_reason,
                )
            self.emitter.emit(
                ring="RING_4_SAFETY",
                actor=actor,
                event_type="SAFETY_POSTURE_CHANGED",
                severity=sev,
                summary=f"RING 4 SAFETY posture {prev_posture} -> {new_posture} (Residual Risk {residual_score}%)",
                why=why,
                llm_telemetry=llm_tel,
                operator_action_required=(new_posture == POSTURE_RED),
                operator_instructions=(
                    "Review BastionEvents flight recorder in /en/bastion before clearing SAFETY_STATE and re-enabling MODE."
                    if new_posture == POSTURE_RED else None
                ),
                trigger_inputs={"previous_posture": prev_posture, "new_posture": new_posture, "risk_ledger": risk_ledger},
            )

        # Enforce RED_HALT Kill-Switch Protocol if triggered while fleet is active
        halted_mode = False
        if new_posture == POSTURE_RED and current_mode not in ("OFF", "DRY_RUN"):
            self.store.put_control("MODE", {
                "mode": "OFF",
                "updated_at": iso(now),
                "updated_by": "RING_4_SAFETY:WARDEN",
                "reason": posture_reason,
            })
            halted_mode = True

        self._save_state(state, now)
        return {
            "posture": new_posture,
            "residual_risk_score": residual_score,
            "halted_mode": halted_mode,
            "risk_ledger": risk_ledger,
        }

    @staticmethod
    def filter_capabilities_for_posture(capabilities: List[str], posture: str) -> List[str]:
        """In AMBER_CAUTIOUS posture, strips routine grow_city and gather so only essential scans/switches run."""
        if posture == POSTURE_AMBER:
            return [c for c in capabilities if c not in ("grow_city", "gather")]
        if posture == POSTURE_RED:
            return []
        return list(capabilities)
