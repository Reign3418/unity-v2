"""NUMNUM — the deterministic policy gate. Pure functions: same inputs, same verdict, zero tokens.

Every job TANK proposes is evaluated here before it can reach SQS. Each rule returns a check record
(rule, pass/fail, actual vs limit, plain-English detail) that is written verbatim to the oversight log.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple
from zoneinfo import ZoneInfo

from contracts import validator as V
from contracts.validator import ContractValidationError

REST_JOB_TYPES = frozenset({"sleep"})
EST_MINUTES: Dict[str, int] = {
    "probe_status": 2,
    "sleep": 0,
    "grow_city": 20,
    "scan_kingdom": 45,
    "switch_character": 5,
    "provision_character": 30,
    "collect_rewards": 5,
    "alliance_help": 3,
    "gather": 5,
    "train_troops": 5,
    "research": 5,
    "locate_governor": 15,
}
DEFAULT_CAPABILITIES: Tuple[str, ...] = ("probe_status", "grow_city", "sleep")


# --------------------------------------------------------------------------- time helpers

def local_now(now: datetime, tz: str) -> datetime:
    return now.astimezone(ZoneInfo(tz))


def in_window(hour: int, start: int, end: int) -> bool:
    if start == end:
        return False
    if start < end:
        return start <= hour < end
    return hour >= start or hour < end


def in_sleep_window(now: datetime, profile: Dict[str, Any]) -> bool:
    return in_window(local_now(now, profile["timezone"]).hour, profile["sleep_window_start_hour"], profile["sleep_window_end_hour"])


def minutes_until_local_hour(now: datetime, tz: str, hour: int) -> int:
    loc = local_now(now, tz)
    target = loc.replace(hour=hour, minute=0, second=0, microsecond=0)
    if target <= loc:
        target += timedelta(days=1)
    return max(1, int((target - loc).total_seconds() // 60))


def parse_ts(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    ts = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def minutes_between(a: datetime, b: datetime) -> float:
    return (b - a).total_seconds() / 60.0


def fresh_runtime(runtime: Optional[Dict[str, Any]], bot: Dict[str, Any], now: datetime) -> Dict[str, Any]:
    """Per-bot runtime counters (session, daily minutes), rolled over at local midnight."""
    rt = dict(runtime or {})
    today = local_now(now, bot["routine_profile"]["timezone"]).strftime("%Y-%m-%d")
    if rt.get("day") != today:
        rt["day"] = today
        rt["active_minutes_today"] = 0
    rt.setdefault("active_minutes_today", 0)
    rt.setdefault("session_started_at", None)
    rt.setdefault("last_session_end", None)
    rt.setdefault("sleep_until", None)
    return rt


# --------------------------------------------------------------------------- rules

def _check(rule_id: str, passed: bool, actual: Any, limit: Any, detail: str) -> Dict[str, Any]:
    return {"rule_id": rule_id, "passed": bool(passed), "actual_value": actual, "limit_value": limit, "detail": detail[:240]}


def evaluate(job: Dict[str, Any], bot: Dict[str, Any], runtime: Dict[str, Any], instance_state: Dict[str, Any],
             now: datetime, capabilities: Iterable[str], recent_keys: Iterable[str]) -> Tuple[bool, List[Dict[str, Any]]]:
    checks: List[Dict[str, Any]] = []
    jt = job["job_type"]
    profile = bot["routine_profile"]
    active = jt not in REST_JOB_TYPES
    est = EST_MINUTES.get(jt, 15)

    try:
        V.validate_job(job, now=now)
        checks.append(_check("JOB_SCHEMA_BOUNDS", True, jt, "contracts/jobs.schema.json", "Job matches the typed contract and its time window is valid"))
    except ContractValidationError as exc:
        checks.append(_check("JOB_SCHEMA_BOUNDS", False, jt, "contracts/jobs.schema.json", str(exc)))

    caps = set(capabilities)
    checks.append(_check("EXECUTOR_CAPABILITY", jt in caps, jt, ",".join(sorted(caps)),
                         "CIPHER can execute this job type" if jt in caps else f"CIPHER has no '{jt}' skill yet; plan held"))

    in_flight = instance_state.get("in_flight")
    checks.append(_check("INSTANCE_SINGLE_TENANT_MUTEX", not in_flight,
                         in_flight["job_id"] if in_flight else "IDLE", "IDLE",
                         f"{job['instance_id']} is free" if not in_flight else f"{job['instance_id']} is running {in_flight['job_type']}"))

    dup = job["idempotency_key"] in set(recent_keys)
    checks.append(_check("IDEMPOTENCY_DEDUP", not dup, job["idempotency_key"], "unique", "First issue of this idempotency key" if not dup else "Duplicate job key"))

    loc = local_now(now, profile["timezone"])
    window = f"{profile['sleep_window_start_hour']:02d}:00-{profile['sleep_window_end_hour']:02d}:00 {profile['timezone']}"
    sleeping_now = in_sleep_window(now, profile)
    if active:
        checks.append(_check("SLEEP_WINDOW_CHECK", not sleeping_now, loc.strftime("%H:%M"), window,
                             "Outside the bot's sleep window" if not sleeping_now else "Bot is inside its sleep window; no sessions allowed"))
        used = int(runtime.get("active_minutes_today", 0))
        cap = int(profile["daily_active_cap_minutes"])
        checks.append(_check("DAILY_ACTIVE_MINUTES_CAP", used + est <= cap, used + est, cap,
                             f"{used}m used + ~{est}m for {jt} vs {cap}m daily cap"))
        started = parse_ts(runtime.get("session_started_at"))
        max_s = int(profile["max_session_minutes"])
        if started:
            sess = int(minutes_between(started, now))
            checks.append(_check("SESSION_DURATION_CAP", sess + est <= max_s, sess + est, max_s,
                                 f"Session open {sess}m + ~{est}m vs {max_s}m max session"))
        else:
            ended = parse_ts(runtime.get("last_session_end"))
            gap = int(minutes_between(ended, now)) if ended else None
            min_b = int(profile["min_break_minutes"])
            ok = gap is None or gap >= min_b
            checks.append(_check("SESSION_DURATION_CAP", ok, gap if gap is not None else "no prior session", min_b,
                                 "New session allowed" if ok else f"Only {gap}m since last session; {min_b}m break required"))
    else:
        checks.append(_check("SLEEP_WINDOW_CHECK", True, loc.strftime("%H:%M"), window, "Rest job: always allowed"))

    checks.append(_check("RING_TOKEN_BUDGET", True, 0, "ring budget", "Deterministic v0 planner: 0 LLM tokens"))
    return all(c["passed"] for c in checks), checks
