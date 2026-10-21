"""Contract validator for Bastion Brain (Railway) and CIPHER (SIDEKICK).

The JSON Schemas in this folder are the single source of truth for *shape*
(types, enums, bounds, per-job-type args, instance/serial/account consistency).
This module runs them with `jsonschema`, then layers the *semantic* rules a schema
cannot express:

1. Job timing: `not_before < deadline`, `created_at <= not_before`.
2. Ring authority: only RING_2_OPS / TANK may issue jobs; only RING_3_AUDIT may
   verify facts or change verified bot state; only RING_1_INTEL may emit SIGNALs;
   actors must belong to the ring they claim.
3. Account slot pool: max 2 characters per kingdom per account, no duplicate bots.
4. Helper guardrails: template registry, model tier <= template max, <= 3 active
   per ring, TTL <= 24h, no sub-helpers.
5. Job result must echo the dispatched job's identity (when the job is supplied).

Requires: `pip install -r bastion-brain/requirements.txt`
"""

from __future__ import annotations

import copy
import json
import sys
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

from jsonschema import Draft202012Validator

CONTRACTS_DIR = Path(__file__).resolve().parent

SCHEMA_FILES = (
    "jobs.schema.json",
    "events.schema.json",
    "bots.schema.json",
    "helpers.schema.json",
)

INSTANCE_TO_ADB: Dict[str, str] = {
    "sidekick-mumu-0": "127.0.0.1:16384",
    "sidekick-mumu-1": "127.0.0.1:16416",
    "sidekick-mumu-2": "127.0.0.1:16448",
}

# One Google account per emulator instance (confirmed by Principal).
ACCOUNT_TO_INSTANCE: Dict[str, str] = {
    "mumu-account-0": "sidekick-mumu-0",
    "mumu-account-1": "sidekick-mumu-1",
    "mumu-account-2": "sidekick-mumu-2",
}

MODEL_TIER_ORDER: Dict[str, int] = {
    "DETERMINISTIC_0_TOKEN": 0,
    "SLM_FLASH_LITE": 1,
    "LLM_FLASH": 2,
    "LLM_PRO": 3,
}

ACTOR_RING: Dict[str, str] = {
    "SCOUT": "RING_1_INTEL",
    "KENT": "RING_1_INTEL",
    "NULL": "RING_1_INTEL",
    "TANK": "RING_2_OPS",
    "BIG_JON": "RING_2_OPS",
    "NUMNUM": "RING_2_OPS",
    "CIPHER": "RING_2_OPS",
    "AUDIT": "RING_3_AUDIT",
    "DOZER": "RING_3_AUDIT",
}

# Event types only a given ring may emit (separation of authority).
EVENT_RING_AUTHORITY: Dict[str, str] = {
    "SIGNAL": "RING_1_INTEL",
    "PLAN_PROPOSED": "RING_2_OPS",
    "PLAN_APPROVED": "RING_2_OPS",
    "PLAN_REJECTED": "RING_2_OPS",
    "JOB_DISPATCHED": "RING_2_OPS",
    "FACT_VERIFIED": "RING_3_AUDIT",
    "BOT_STATE_CHANGED": "RING_3_AUDIT",
    "BOT_LOST": "RING_3_AUDIT",
}


class ContractValidationError(ValueError):
    """Raised when a payload violates Bastion Brain contracts."""


# --------------------------------------------------------------------------- schema plumbing

@lru_cache(maxsize=1)
def _schemas() -> Dict[str, Dict[str, Any]]:
    loaded: Dict[str, Dict[str, Any]] = {}
    for filename in SCHEMA_FILES:
        path = CONTRACTS_DIR / filename
        if not path.exists():
            raise ContractValidationError(f"Missing contract schema file: {path}")
        with path.open("r", encoding="utf-8") as fh:
            loaded[filename] = json.load(fh)
    return loaded


def load_all_schemas() -> Dict[str, Dict[str, Any]]:
    """Returns a copy of all canonical JSON Schema documents."""
    return copy.deepcopy(_schemas())


@lru_cache(maxsize=None)
def _validator(filename: str, defname: str) -> Draft202012Validator:
    doc = _schemas()[filename]
    wrapper = {
        "$schema": doc["$schema"],
        "$ref": f"#/$defs/{defname}",
        "$defs": doc["$defs"],
    }
    Draft202012Validator.check_schema(wrapper)
    return Draft202012Validator(wrapper)


def _validate_shape(filename: str, defname: str, payload: Any) -> None:
    errors = sorted(_validator(filename, defname).iter_errors(payload), key=lambda e: list(e.path))
    if errors:
        top = errors[0]
        where = "/".join(str(p) for p in top.absolute_path) or "<root>"
        more = f" (+{len(errors) - 1} more)" if len(errors) > 1 else ""
        raise ContractValidationError(f"{defname} invalid at {where}: {top.message}{more}")


def _parse_ts(value: str, field: str) -> datetime:
    try:
        ts = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ContractValidationError(f"{field} is not a valid timestamp: {value!r}") from exc
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


# --------------------------------------------------------------------------- validators

def validate_job(job: Dict[str, Any], now: Optional[datetime] = None) -> None:
    """Validates a BastionJob before SQS dispatch or CIPHER execution.

    Pass `now` (timezone-aware) to additionally reject jobs whose deadline has already passed.
    """
    _validate_shape("jobs.schema.json", "BastionJob", job)

    created = _parse_ts(job["created_at"], "created_at")
    not_before = _parse_ts(job["not_before"], "not_before")
    deadline = _parse_ts(job["deadline"], "deadline")
    if not_before < created:
        raise ContractValidationError("BastionJob.not_before must be >= created_at")
    if deadline <= not_before:
        raise ContractValidationError("BastionJob.deadline must be after not_before")
    if now is not None and deadline <= now:
        raise ContractValidationError("BastionJob.deadline has already passed")

    if job["job_type"] == "provision_character":
        account_id = job["args"]["account_id"]
        if ACCOUNT_TO_INSTANCE[account_id] != job["instance_id"]:
            raise ContractValidationError(
                f"provision_character account {account_id} lives on {ACCOUNT_TO_INSTANCE[account_id]}, "
                f"not {job['instance_id']}"
            )


def validate_job_result(result: Dict[str, Any], job: Optional[Dict[str, Any]] = None) -> None:
    """Validates a BastionJobResult. If the originating `job` is supplied, the result must echo its identity."""
    _validate_shape("jobs.schema.json", "BastionJobResult", result)

    started = _parse_ts(result["started_at"], "started_at")
    completed = _parse_ts(result["completed_at"], "completed_at")
    if completed < started:
        raise ContractValidationError("BastionJobResult.completed_at precedes started_at")

    if result["status"] == "SUCCEEDED" and result.get("error"):
        raise ContractValidationError("BastionJobResult SUCCEEDED must not carry an error")
    if result["status"] in ("FAILED", "REJECTED_SCHEMA", "TIMEOUT", "ACCOUNT_LOCKED_OR_BANNED") and not result.get("error"):
        raise ContractValidationError(f"BastionJobResult {result['status']} must carry an error object")

    if job is not None:
        for key in ("job_id", "idempotency_key", "correlation_id", "job_type", "instance_id", "bot_id", "kingdom_id"):
            if result[key] != job[key]:
                raise ContractValidationError(
                    f"BastionJobResult.{key} {result[key]!r} does not match dispatched job {job[key]!r}"
                )


def validate_event(event: Dict[str, Any]) -> None:
    """Validates a BastionEvent: oversight completeness + actor/ring/authority consistency."""
    _validate_shape("events.schema.json", "BastionEvent", event)

    actor, ring, etype = event["actor"], event["ring"], event["event_type"]
    if actor in ACTOR_RING and ring != ACTOR_RING[actor]:
        raise ContractValidationError(f"Actor {actor} belongs to {ACTOR_RING[actor]}, not {ring}")
    required_ring = EVENT_RING_AUTHORITY.get(etype)
    if required_ring and actor != "OPERATOR" and ring != required_ring:
        raise ContractValidationError(
            f"Separation of authority: {etype} may only be emitted by {required_ring}, not {ring}"
        )
    if etype == "HUMAN_ACCOUNT_REQUIRED" and not event["oversight"].get("operator_action_required"):
        raise ContractValidationError("HUMAN_ACCOUNT_REQUIRED must set oversight.operator_action_required=true")
    _parse_ts(event["timestamp"], "timestamp")


def validate_intent(intent: Dict[str, Any]) -> None:
    """Validates a BastionIntent created by Unity."""
    _validate_shape("events.schema.json", "BastionIntent", intent)
    _parse_ts(intent["created_at"], "created_at")


def validate_bot(bot: Dict[str, Any]) -> None:
    """Validates a BastionBot record and its anti-detection RoutineProfile."""
    _validate_shape("bots.schema.json", "BastionBot", bot)
    prof = bot["routine_profile"]
    if prof["sleep_window_start_hour"] == prof["sleep_window_end_hour"]:
        raise ContractValidationError("routine_profile sleep window start and end must differ")
    if prof["active_minutes_today"] > prof["daily_active_cap_minutes"]:
        raise ContractValidationError("routine_profile.active_minutes_today exceeds daily_active_cap_minutes")
    if prof["min_break_minutes"] >= prof["daily_active_cap_minutes"]:
        raise ContractValidationError("routine_profile.min_break_minutes must be below the daily cap")
    _parse_ts(bot["verified_state"]["last_verified_at"], "verified_state.last_verified_at")


def validate_account_slot_record(record: Dict[str, Any]) -> None:
    """Validates a Google account slot record (<= 2 characters per kingdom per account)."""
    _validate_shape("bots.schema.json", "BastionAccountSlotRecord", record)
    seen: Dict[str, str] = {}
    for kingdom, bot_ids in record["kingdom_slots"].items():
        for bot_id in bot_ids:
            if bot_id in seen:
                raise ContractValidationError(
                    f"Bot {bot_id} listed in both kingdom #{seen[bot_id]} and #{kingdom}"
                )
            seen[bot_id] = kingdom


def validate_helper_spawn(helper: Dict[str, Any], active_helpers_in_ring: int = 0) -> None:
    """Validates helper spawning against the canonical template registry and guardrails."""
    registry = _schemas()["helpers.schema.json"]["x_canonical_registry"]
    guardrails = registry["guardrails"]

    _validate_shape("helpers.schema.json", "HelperInstance", helper)

    if active_helpers_in_ring >= guardrails["max_concurrent_helpers_per_ring"]:
        raise ContractValidationError(
            f"Ring helper cap reached ({active_helpers_in_ring}/{guardrails['max_concurrent_helpers_per_ring']})"
        )

    tmpl = registry["helper_templates"][helper["template_id"]]
    if helper["parent_ring"] != tmpl["parent_ring"] or helper["parent_leader"] != tmpl["parent_leader"]:
        raise ContractValidationError(
            f"Template {helper['template_id']} belongs to {tmpl['parent_ring']}/{tmpl['parent_leader']}, "
            f"not {helper['parent_ring']}/{helper['parent_leader']}"
        )
    if MODEL_TIER_ORDER[helper["model_tier"]] > MODEL_TIER_ORDER[tmpl["max_model_tier"]]:
        raise ContractValidationError(
            f"Helper model_tier {helper['model_tier']} exceeds template max {tmpl['max_model_tier']}"
        )
    if helper.get("can_spawn_subhelpers", False) is not False:
        raise ContractValidationError("Helpers cannot spawn sub-helpers (depth=1)")

    spawned = _parse_ts(helper["spawned_at"], "spawned_at")
    expires = _parse_ts(helper["expires_at"], "expires_at")
    ttl_hours = (expires - spawned).total_seconds() / 3600
    if ttl_hours <= 0:
        raise ContractValidationError("Helper expires_at must be after spawned_at")
    if ttl_hours > guardrails["max_helper_ttl_hours"]:
        raise ContractValidationError(
            f"Helper TTL {ttl_hours:.1f}h exceeds max {guardrails['max_helper_ttl_hours']}h"
        )
    if helper["tokens_used_this_hour"] > helper["hourly_token_cap"]:
        raise ContractValidationError("Helper tokens_used_this_hour exceeds hourly_token_cap")


def run_self_test() -> None:
    """Runs the regression suite in bastion-brain/tests/test_contracts.py."""
    import unittest

    tests_dir = CONTRACTS_DIR.parent / "tests"
    suite = unittest.defaultTestLoader.discover(str(tests_dir), pattern="test_contracts.py", top_level_dir=str(CONTRACTS_DIR.parent))
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)


if __name__ == "__main__":
    run_self_test()
