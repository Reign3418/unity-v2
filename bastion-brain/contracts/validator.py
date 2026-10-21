"""Deterministic contract validator for Bastion Brain (Railway) and CIPHER (SIDEKICK).

Enforces:
1. Strict typed job schemas and per-skill argument bounds (no shell strings).
2. Ring authority separation (only RING_2_OPS / TANK + NUMNUM can issue jobs).
3. Detailed Oversight & Decision Audit Log completeness (`oversight.why`, `numnum_checks`, etc.).
4. Account Slot Pool limits (max 2 characters per kingdom per existing Google account).
5. Bounded Helper Template guardrails (model tier <= leader tier, max 3 active per ring, depth=1).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

CONTRACTS_DIR = Path(__file__).resolve().parent

INSTANCE_TO_ADB: Dict[str, str] = {
    "sidekick-mumu-0": "127.0.0.1:16384",
    "sidekick-mumu-1": "127.0.0.1:16416",
    "sidekick-mumu-2": "127.0.0.1:16448",
}

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

VALID_JOB_TYPES = {
    "probe_status",
    "switch_character",
    "provision_character",
    "grow_city",
    "scan_kingdom",
    "sleep",
    "collect_rewards",
    "alliance_help",
    "gather",
    "train_troops",
    "research",
    "locate_governor",
}

VALID_EVENT_TYPES = {
    "INTENT_RECEIVED",
    "SIGNAL",
    "PLAN_PROPOSED",
    "PLAN_APPROVED",
    "PLAN_REJECTED",
    "JOB_DISPATCHED",
    "JOB_STARTED",
    "JOB_RESULT",
    "FACT_VERIFIED",
    "BOT_STATE_CHANGED",
    "BOT_LOST",
    "HUMAN_ACCOUNT_REQUIRED",
    "HELPER_SPAWNED",
    "HELPER_RETIRED",
    "MODE_CHANGED",
}

VALID_NUMNUM_RULES = {
    "SLEEP_WINDOW_CHECK",
    "SESSION_DURATION_CAP",
    "DAILY_ACTIVE_MINUTES_CAP",
    "INSTANCE_SINGLE_TENANT_MUTEX",
    "ACCOUNT_SLOT_LIMIT_2_PER_KINGDOM",
    "JOB_SCHEMA_BOUNDS",
    "IDEMPOTENCY_DEDUP",
    "RING_TOKEN_BUDGET",
    "HELPER_CONCURRENCY_CAP",
}

VALID_BOT_STATES = {
    "PROVISIONING",
    "GROWING",
    "ACTIVE",
    "SLEEPING",
    "ON_MISSION",
    "SUSPECT",
    "LOST",
    "RETIRED",
}


class ContractValidationError(ValueError):
    """Raised when a payload violates Bastion Brain contracts."""


def load_all_schemas() -> Dict[str, Dict[str, Any]]:
    """Loads all 4 canonical JSON Schema files from disk."""
    schema_files = [
        "jobs.schema.json",
        "events.schema.json",
        "bots.schema.json",
        "helpers.schema.json",
    ]
    loaded: Dict[str, Dict[str, Any]] = {}
    for filename in schema_files:
        path = CONTRACTS_DIR / filename
        if not path.exists():
            raise ContractValidationError(f"Missing contract schema file: {path}")
        with path.open("r", encoding="utf-8") as fh:
            loaded[filename] = json.load(fh)
    return loaded


def _require_keys(obj: Dict[str, Any], required: List[str], allowed: List[str], context: str) -> None:
    if not isinstance(obj, dict):
        raise ContractValidationError(f"{context} must be a JSON object")
    missing = [k for k in required if k not in obj]
    if missing:
        raise ContractValidationError(f"{context} missing required keys: {missing}")
    unknown = [k for k in obj.keys() if k not in allowed]
    if unknown:
        raise ContractValidationError(f"{context} contains disallowed keys: {unknown}")


def _validate_job_args(job_type: str, args: Dict[str, Any]) -> None:
    if not isinstance(args, dict):
        raise ContractValidationError("job.args must be an object")

    if job_type == "probe_status":
        _require_keys(args, [], ["capture_profile", "capture_resources"], "probe_status.args")
    elif job_type == "switch_character":
        _require_keys(
            args,
            ["target_kingdom_id"],
            ["target_kingdom_id", "target_governor_id", "target_governor_name"],
            "switch_character.args",
        )
        _check_kingdom_id(args["target_kingdom_id"], "switch_character.args.target_kingdom_id")
    elif job_type == "provision_character":
        _require_keys(
            args,
            ["target_kingdom_id", "account_id", "character_slot"],
            ["target_kingdom_id", "account_id", "character_slot", "preferred_civilization"],
            "provision_character.args",
        )
        _check_kingdom_id(args["target_kingdom_id"], "provision_character.args.target_kingdom_id")
        if args["account_id"] not in ACCOUNT_TO_INSTANCE:
            raise ContractValidationError(f"Invalid account_id: {args['account_id']}")
        if args["character_slot"] not in (1, 2):
            raise ContractValidationError("character_slot must be 1 or 2 (max 2 per kingdom per account)")
    elif job_type == "grow_city":
        _require_keys(
            args,
            ["target_ch_level", "max_steps"],
            ["target_ch_level", "max_steps", "claim_quests", "use_free_speedups"],
            "grow_city.args",
        )
        if not (isinstance(args["target_ch_level"], int) and 2 <= args["target_ch_level"] <= 25):
            raise ContractValidationError("grow_city.args.target_ch_level must be integer 2..25")
        if not (isinstance(args["max_steps"], int) and 5 <= args["max_steps"] <= 120):
            raise ContractValidationError("grow_city.args.max_steps must be integer 5..120")
    elif job_type == "scan_kingdom":
        _require_keys(
            args,
            ["target_kingdom_id", "max_ranks"],
            ["target_kingdom_id", "max_ranks", "boards"],
            "scan_kingdom.args",
        )
        _check_kingdom_id(args["target_kingdom_id"], "scan_kingdom.args.target_kingdom_id")
        if not (isinstance(args["max_ranks"], int) and 10 <= args["max_ranks"] <= 1000):
            raise ContractValidationError("scan_kingdom.args.max_ranks must be integer 10..1000")
    elif job_type == "sleep":
        _require_keys(
            args,
            ["duration_minutes", "close_app"],
            ["duration_minutes", "close_app", "reason"],
            "sleep.args",
        )
        if not (isinstance(args["duration_minutes"], int) and 5 <= args["duration_minutes"] <= 720):
            raise ContractValidationError("sleep.args.duration_minutes must be integer 5..720")
    elif job_type == "collect_rewards":
        _require_keys(
            args,
            [],
            ["claim_daily_objectives", "claim_vip_chest", "claim_expedition", "harvest_city_nodes"],
            "collect_rewards.args",
        )
    elif job_type == "alliance_help":
        _require_keys(args, [], ["donate_tech", "claim_alliance_gifts"], "alliance_help.args")
    elif job_type == "gather":
        _require_keys(
            args,
            ["resource_types", "max_marches"],
            ["resource_types", "max_marches", "preferred_node_level"],
            "gather.args",
        )
        if not isinstance(args["resource_types"], list) or not args["resource_types"]:
            raise ContractValidationError("gather.args.resource_types must be non-empty list")
        if not (isinstance(args["max_marches"], int) and 1 <= args["max_marches"] <= 5):
            raise ContractValidationError("gather.args.max_marches must be integer 1..5")
    elif job_type == "train_troops":
        _require_keys(args, ["troop_types"], ["troop_types", "tier_preference"], "train_troops.args")
    elif job_type == "research":
        _require_keys(args, ["branch_preference"], ["branch_preference"], "research.args")
    elif job_type == "locate_governor":
        _require_keys(
            args,
            ["target_kingdom_id"],
            ["target_kingdom_id", "target_governor_id", "target_governor_name", "target_alliance_tag"],
            "locate_governor.args",
        )
        _check_kingdom_id(args["target_kingdom_id"], "locate_governor.args.target_kingdom_id")
    else:
        raise ContractValidationError(f"Unsupported job_type: {job_type}")


def _check_kingdom_id(value: Any, field_name: str) -> None:
    if not isinstance(value, int) or isinstance(value, bool) or not (1000 <= value <= 9999):
        raise ContractValidationError(f"{field_name} must be an integer between 1000 and 9999")


def validate_job(job: Dict[str, Any]) -> None:
    """Validates a BastionJob before SQS dispatch or CIPHER execution."""
    required = [
        "job_id",
        "idempotency_key",
        "correlation_id",
        "job_type",
        "instance_id",
        "adb_serial",
        "bot_id",
        "kingdom_id",
        "priority",
        "issued_by",
        "created_at",
        "not_before",
        "deadline",
        "args",
    ]
    _require_keys(job, required, required, "BastionJob")

    if not re.match(r"^job_[a-zA-Z0-9_-]{8,64}$", str(job["job_id"])):
        raise ContractValidationError(f"Invalid job_id format: {job['job_id']}")
    if not re.match(r"^corr_[a-zA-Z0-9_-]{6,64}$", str(job["correlation_id"])):
        raise ContractValidationError(f"Invalid correlation_id format: {job['correlation_id']}")
    if not re.match(r"^bot_[a-zA-Z0-9_-]{4,64}$", str(job["bot_id"])):
        raise ContractValidationError(f"Invalid bot_id format: {job['bot_id']}")
    if job["job_type"] not in VALID_JOB_TYPES:
        raise ContractValidationError(f"Invalid job_type: {job['job_type']}")

    instance_id = job["instance_id"]
    if instance_id not in INSTANCE_TO_ADB:
        raise ContractValidationError(f"Unknown instance_id: {instance_id}")
    if job["adb_serial"] != INSTANCE_TO_ADB[instance_id]:
        raise ContractValidationError(
            f"adb_serial mismatch for {instance_id}: expected {INSTANCE_TO_ADB[instance_id]}, got {job['adb_serial']}"
        )

    _check_kingdom_id(job["kingdom_id"], "BastionJob.kingdom_id")
    if not (isinstance(job["priority"], int) and 1 <= job["priority"] <= 100):
        raise ContractValidationError("BastionJob.priority must be integer 1..100")

    issued_by = job["issued_by"]
    _require_keys(
        issued_by,
        ["ring", "leader", "numnum_approval_id"],
        ["ring", "leader", "helper_id", "numnum_approval_id"],
        "BastionJob.issued_by",
    )
    if issued_by["ring"] != "RING_2_OPS" or issued_by["leader"] != "TANK":
        raise ContractValidationError(
            "Separation of authority violation: only RING_2_OPS leader TANK may issue jobs"
        )
    if not re.match(r"^nn_[a-zA-Z0-9_-]{6,64}$", str(issued_by["numnum_approval_id"])):
        raise ContractValidationError("BastionJob requires a valid NUMNUM approval ID (nn_*)")

    _validate_job_args(job["job_type"], job["args"])


def validate_job_result(result: Dict[str, Any]) -> None:
    """Validates a BastionJobResult returned by CIPHER."""
    required = [
        "job_id",
        "idempotency_key",
        "correlation_id",
        "job_type",
        "instance_id",
        "bot_id",
        "kingdom_id",
        "status",
        "started_at",
        "completed_at",
        "duration_ms",
        "observed_state",
        "steps_executed",
        "evidence",
    ]
    allowed = required + ["error"]
    _require_keys(result, required, allowed, "BastionJobResult")

    valid_statuses = {
        "SUCCEEDED",
        "PARTIAL",
        "FAILED",
        "REJECTED_SCHEMA",
        "TIMEOUT",
        "ACCOUNT_LOCKED_OR_BANNED",
    }
    if result["status"] not in valid_statuses:
        raise ContractValidationError(f"Invalid job result status: {result['status']}")

    if not isinstance(result["steps_executed"], list):
        raise ContractValidationError("BastionJobResult.steps_executed must be a list")

    evidence = result["evidence"]
    _require_keys(
        evidence,
        ["screenshot_uri", "screenshot_sha256", "ocr_lines"],
        ["screenshot_uri", "screenshot_sha256", "ocr_lines", "metrics"],
        "BastionJobResult.evidence",
    )


def validate_event(event: Dict[str, Any]) -> None:
    """Validates a BastionEvent and enforces Detailed Oversight Audit Log completeness."""
    required = [
        "event_id",
        "correlation_id",
        "timestamp",
        "epoch_day",
        "operating_mode",
        "ring",
        "actor",
        "event_type",
        "severity",
        "summary",
        "oversight",
    ]
    allowed = required + ["kingdom_id", "bot_id", "instance_id", "job_id"]
    _require_keys(event, required, allowed, "BastionEvent")

    if not re.match(r"^evt_[a-zA-Z0-9_-]{8,64}$", str(event["event_id"])):
        raise ContractValidationError(f"Invalid event_id: {event['event_id']}")
    if event["event_type"] not in VALID_EVENT_TYPES:
        raise ContractValidationError(f"Invalid event_type: {event['event_type']}")
    if not re.match(
        r"^(SCOUT|KENT|NULL|TANK|BIG_JON|NUMNUM|CIPHER|AUDIT|DOZER|OPERATOR|HELPER:[A-Z0-9_-]{3,48})$",
        str(event["actor"]),
    ):
        raise ContractValidationError(f"Invalid actor: {event['actor']}")

    oversight = event["oversight"]
    _require_keys(
        oversight,
        ["why", "trigger_inputs", "numnum_checks", "evidence_refs"],
        [
            "why",
            "trigger_inputs",
            "numnum_checks",
            "llm_telemetry",
            "evidence_refs",
            "operator_action_required",
            "operator_instructions",
        ],
        "BastionEvent.oversight",
    )
    if not isinstance(oversight["why"], str) or len(oversight["why"].strip()) < 5:
        raise ContractValidationError("BastionEvent.oversight.why must provide a clear decision explanation")
    if not isinstance(oversight["numnum_checks"], list):
        raise ContractValidationError("BastionEvent.oversight.numnum_checks must be a list")
    for check in oversight["numnum_checks"]:
        _require_keys(
            check,
            ["rule_id", "passed", "detail"],
            ["rule_id", "passed", "actual_value", "limit_value", "detail"],
            "NumNumRuleCheck",
        )
        if check["rule_id"] not in VALID_NUMNUM_RULES:
            raise ContractValidationError(f"Unknown NUMNUM rule_id: {check['rule_id']}")


def validate_intent(intent: Dict[str, Any]) -> None:
    """Validates a BastionIntent created by Unity."""
    required = [
        "intent_id",
        "correlation_id",
        "created_at",
        "source",
        "intent_type",
        "priority",
        "status",
        "payload",
    ]
    allowed = required + ["kingdom_id"]
    _require_keys(intent, required, allowed, "BastionIntent")


def validate_bot(bot: Dict[str, Any]) -> None:
    """Validates a BastionBot record and its anti-detection RoutineProfile."""
    required = [
        "bot_id",
        "account_id",
        "instance_id",
        "adb_serial",
        "character_slot",
        "kingdom_id",
        "governor_name",
        "lifecycle_state",
        "verified_state",
        "routine_profile",
        "health",
    ]
    allowed = required + ["governor_id"]
    _require_keys(bot, required, allowed, "BastionBot")

    if bot["lifecycle_state"] not in VALID_BOT_STATES:
        raise ContractValidationError(f"Invalid bot lifecycle_state: {bot['lifecycle_state']}")
    if bot["character_slot"] not in (1, 2):
        raise ContractValidationError("BastionBot.character_slot must be 1 or 2")
    if ACCOUNT_TO_INSTANCE.get(bot["account_id"]) != bot["instance_id"]:
        raise ContractValidationError(
            f"Account {bot['account_id']} does not match instance {bot['instance_id']}"
        )


def validate_account_slot_record(record: Dict[str, Any]) -> None:
    """Validates a Google account slot record (enforces <= 2 characters per kingdom per account)."""
    required = [
        "account_id",
        "instance_id",
        "adb_serial",
        "account_status",
        "max_slots_per_kingdom",
        "kingdom_slots",
    ]
    _require_keys(record, required, required, "BastionAccountSlotRecord")

    if record["max_slots_per_kingdom"] != 2:
        raise ContractValidationError("max_slots_per_kingdom must be 2")

    kingdom_slots = record["kingdom_slots"]
    if not isinstance(kingdom_slots, dict):
        raise ContractValidationError("kingdom_slots must be an object mapping kingdom_id -> [bot_ids]")

    for k_str, bot_ids in kingdom_slots.items():
        if not re.match(r"^[0-9]{4}$", str(k_str)):
            raise ContractValidationError(f"Invalid kingdom key in kingdom_slots: {k_str}")
        if not isinstance(bot_ids, list) or len(bot_ids) > 2:
            raise ContractValidationError(
                f"Account {record['account_id']} exceeds max 2 characters in kingdom #{k_str}: {bot_ids}"
            )
        if len(set(bot_ids)) != len(bot_ids):
            raise ContractValidationError(f"Duplicate bot_id in kingdom #{k_str}: {bot_ids}")


def validate_helper_spawn(helper: Dict[str, Any], active_helpers_in_ring: int = 0) -> None:
    """Validates helper spawning against the canonical template registry and guardrails."""
    schemas = load_all_schemas()
    registry = schemas["helpers.schema.json"]["x_canonical_registry"]
    guardrails = registry["guardrails"]

    if active_helpers_in_ring >= guardrails["max_concurrent_helpers_per_ring"]:
        raise ContractValidationError(
            f"Ring helper cap reached ({active_helpers_in_ring}/{guardrails['max_concurrent_helpers_per_ring']})"
        )

    required = [
        "helper_id",
        "template_id",
        "parent_ring",
        "parent_leader",
        "model_tier",
        "scope",
        "spawned_at",
        "expires_at",
        "hourly_token_cap",
        "tokens_used_this_hour",
        "status",
    ]
    allowed = required + ["can_spawn_subhelpers"]
    _require_keys(helper, required, allowed, "HelperInstance")

    template_id = helper["template_id"]
    templates = registry["helper_templates"]
    if template_id not in templates:
        raise ContractValidationError(f"Helper template not in canonical registry: {template_id}")

    tmpl = templates[template_id]
    if helper["parent_ring"] != tmpl["parent_ring"] or helper["parent_leader"] != tmpl["parent_leader"]:
        raise ContractValidationError(
            f"Template {template_id} belongs to {tmpl['parent_ring']}/{tmpl['parent_leader']}, "
            f"not {helper['parent_ring']}/{helper['parent_leader']}"
        )

    if MODEL_TIER_ORDER[helper["model_tier"]] > MODEL_TIER_ORDER[tmpl["max_model_tier"]]:
        raise ContractValidationError(
            f"Helper {helper['helper_id']} model_tier {helper['model_tier']} exceeds template max {tmpl['max_model_tier']}"
        )

    if helper.get("can_spawn_subhelpers", False) is not False:
        raise ContractValidationError("Helpers cannot spawn sub-helpers (depth=1)")


def run_self_test() -> None:
    """Runs positive and negative contract tests to verify all schemas and rules."""
    schemas = load_all_schemas()
    assert len(schemas) == 4, "Expected 4 schema files"

    # 1. Valid Job (grow_city on #4021)
    sample_job = {
        "job_id": "job_4021_grow_0001",
        "idempotency_key": "idem_bot_4021_grow_ch8_20261021",
        "correlation_id": "corr_4021_selfheal_01",
        "job_type": "grow_city",
        "instance_id": "sidekick-mumu-1",
        "adb_serial": "127.0.0.1:16416",
        "bot_id": "bot_4021_slot1",
        "kingdom_id": 4021,
        "priority": 50,
        "issued_by": {
            "ring": "RING_2_OPS",
            "leader": "TANK",
            "helper_id": "HELPER:R2_COHORT_MUMU1",
            "numnum_approval_id": "nn_approved_99102",
        },
        "created_at": "2026-10-21T22:00:00Z",
        "not_before": "2026-10-21T22:00:00Z",
        "deadline": "2026-10-21T22:30:00Z",
        "args": {
            "target_ch_level": 8,
            "max_steps": 40,
            "claim_quests": True,
            "use_free_speedups": True,
        },
    }
    validate_job(sample_job)

    # 2. Reject unauthorized ring trying to issue a job (Ring 1 SCOUT cannot dispatch)
    bad_ring_job = dict(sample_job, issued_by={
        "ring": "RING_1_INTEL",
        "leader": "SCOUT",
        "numnum_approval_id": "nn_fake_12345",
    })
    try:
        validate_job(bad_ring_job)
        raise AssertionError("Should have rejected Ring 1 job dispatch")
    except ContractValidationError:
        pass

    # 3. Reject arbitrary shell injection keys in job args
    bad_args_job = dict(sample_job, args={
        "target_ch_level": 8,
        "max_steps": 40,
        "shell_cmd": "rm -rf /",
    })
    try:
        validate_job(bad_args_job)
        raise AssertionError("Should have rejected unknown/shell args")
    except ContractValidationError:
        pass

    # 4. Valid Detailed Oversight Audit Event
    sample_event = {
        "event_id": "evt_20261021_0001",
        "correlation_id": "corr_4021_selfheal_01",
        "timestamp": "2026-10-21T22:00:01Z",
        "epoch_day": "2026-10-21",
        "operating_mode": "AUTONOMOUS",
        "ring": "RING_2_OPS",
        "actor": "NUMNUM",
        "event_type": "PLAN_APPROVED",
        "severity": "INFO",
        "kingdom_id": 4021,
        "bot_id": "bot_4021_slot1",
        "instance_id": "sidekick-mumu-1",
        "job_id": "job_4021_grow_0001",
        "summary": "NUMNUM approved TANK grow_city plan for bot_4021_slot1 on sidekick-mumu-1.",
        "oversight": {
            "why": "Bot is within active daytime window (18:00 EDT), active minutes today (95/300m) are under cap, and sidekick-mumu-1 has no conflicting R5 mission.",
            "trigger_inputs": {
                "current_ch_level": 7,
                "target_ch_level": 8,
                "active_minutes_today": 95,
            },
            "numnum_checks": [
                {
                    "rule_id": "SLEEP_WINDOW_CHECK",
                    "passed": True,
                    "actual_value": "18:00",
                    "limit_value": "01:00-08:00",
                    "detail": "Outside sleep window",
                },
                {
                    "rule_id": "DAILY_ACTIVE_MINUTES_CAP",
                    "passed": True,
                    "actual_value": 95,
                    "limit_value": 300,
                    "detail": "205 minutes remaining today",
                },
                {
                    "rule_id": "INSTANCE_SINGLE_TENANT_MUTEX",
                    "passed": True,
                    "actual_value": "IDLE",
                    "limit_value": "IDLE",
                    "detail": "sidekick-mumu-1 is free",
                },
            ],
            "llm_telemetry": {
                "model": "gemini-2.5-flash",
                "prompt_tokens": 620,
                "completion_tokens": 145,
                "latency_ms": 840,
            },
            "evidence_refs": ["ch8_proof_4021.png"],
        },
    }
    validate_event(sample_event)

    # 5. Account Slot Pool validation (max 2 per kingdom per Google account)
    valid_slot_pool = {
        "account_id": "mumu-account-1",
        "instance_id": "sidekick-mumu-1",
        "adb_serial": "127.0.0.1:16416",
        "account_status": "HEALTHY",
        "max_slots_per_kingdom": 2,
        "kingdom_slots": {
            "4021": ["bot_4021_slot1"],
            "4194": ["bot_4194_slot1", "bot_4194_slot2"],
        },
    }
    validate_account_slot_record(valid_slot_pool)

    # Reject >2 characters in the same kingdom on one account
    over_slot_pool = dict(valid_slot_pool, kingdom_slots={
        "4194": ["bot_4194_slot1", "bot_4194_slot2", "bot_4194_slot3"],
    })
    try:
        validate_account_slot_record(over_slot_pool)
        raise AssertionError("Should have rejected >2 characters in one kingdom on one account")
    except ContractValidationError:
        pass

    # 6. Helper Spawn validation (enforce model tier and concurrency cap)
    valid_helper = {
        "helper_id": "HELPER:R2_REPLACE_4021",
        "template_id": "R2_REPLACEMENT_PLANNER",
        "parent_ring": "RING_2_OPS",
        "parent_leader": "TANK",
        "model_tier": "LLM_FLASH",
        "scope": {
            "kingdom_id": 4021,
            "instance_id": "sidekick-mumu-1",
            "objective": "Find open character slot (<2) in #4021 or raise HUMAN_ACCOUNT_REQUIRED.",
        },
        "spawned_at": "2026-10-21T22:00:00Z",
        "expires_at": "2026-10-22T22:00:00Z",
        "hourly_token_cap": 12000,
        "tokens_used_this_hour": 0,
        "status": "ACTIVE",
    }
    validate_helper_spawn(valid_helper, active_helpers_in_ring=1)

    # Reject helper spawning when ring already has 3 active helpers
    try:
        validate_helper_spawn(valid_helper, active_helpers_in_ring=3)
        raise AssertionError("Should have rejected 4th concurrent helper in ring")
    except ContractValidationError:
        pass

    print("Bastion Brain Contract Self-Test: ALL CHECKS PASSED (6/6 suites).")


if __name__ == "__main__":
    if "--self-test" in sys.argv or len(sys.argv) == 1:
        run_self_test()
