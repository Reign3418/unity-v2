"""Regression suite for Bastion Brain contracts.

Run:  python bastion-brain/contracts/validator.py
  or: python -m unittest discover -s bastion-brain/tests -t bastion-brain
"""

import copy
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from contracts import validator as V  # noqa: E402
from contracts.validator import ContractValidationError as CVE  # noqa: E402


def good_job():
    return {
        "job_id": "job_4021_grow_0001",
        "idempotency_key": "idem_bot_4021_grow_ch8_20261021",
        "correlation_id": "corr_4021_selfheal_01",
        "job_type": "grow_city",
        "instance_id": "sidekick-mumu-1",
        "adb_serial": "127.0.0.1:16416",
        "bot_id": "bot_4021_slot1",
        "kingdom_id": 4021,
        "priority": 50,
        "issued_by": {"ring": "RING_2_OPS", "leader": "TANK", "numnum_approval_id": "nn_approved_99102"},
        "created_at": "2026-10-21T22:00:00Z",
        "not_before": "2026-10-21T22:00:00Z",
        "deadline": "2026-10-21T22:30:00Z",
        "args": {"target_ch_level": 8, "max_steps": 40, "claim_quests": True, "use_free_speedups": True},
    }


def good_result(job=None):
    job = job or good_job()
    return {
        "job_id": job["job_id"], "idempotency_key": job["idempotency_key"],
        "correlation_id": job["correlation_id"], "job_type": job["job_type"],
        "instance_id": job["instance_id"], "bot_id": job["bot_id"], "kingdom_id": job["kingdom_id"],
        "status": "SUCCEEDED",
        "started_at": "2026-10-21T22:00:05Z", "completed_at": "2026-10-21T22:12:00Z", "duration_ms": 715000,
        "observed_state": {"kingdom_id": 4021, "ch_level": 8, "power": 27800, "screen_state": "CITY_VIEW"},
        "steps_executed": [
            {"step_index": 1, "action": "claim_quest", "detail": "Claimed chapter quest",
             "timestamp": "2026-10-21T22:01:00Z"}
        ],
        "evidence": {"screenshot_uri": "s3://x/y.png", "screenshot_sha256": "a" * 64, "ocr_lines": ["City Hall 8"]},
        "error": None,
    }


def good_event():
    return {
        "event_id": "evt_20261021_0001", "correlation_id": "corr_4021_selfheal_01",
        "timestamp": "2026-10-21T22:00:01Z", "epoch_day": "2026-10-21",
        "operating_mode": "AUTONOMOUS", "ring": "RING_2_OPS", "actor": "NUMNUM",
        "event_type": "PLAN_APPROVED", "severity": "INFO", "kingdom_id": 4021,
        "bot_id": "bot_4021_slot1", "instance_id": "sidekick-mumu-1", "job_id": "job_4021_grow_0001",
        "summary": "NUMNUM approved TANK grow_city plan for bot_4021_slot1.",
        "oversight": {
            "why": "Outside sleep window and under the daily cap; instance idle.",
            "trigger_inputs": {"current_ch_level": 7, "target_ch_level": 8},
            "numnum_checks": [
                {"rule_id": "SLEEP_WINDOW_CHECK", "passed": True, "actual_value": "18:00",
                 "limit_value": "01:00-08:00", "detail": "Outside sleep window"}
            ],
            "llm_telemetry": {"model": "gemini-flash", "prompt_tokens": 620, "completion_tokens": 145, "latency_ms": 840},
            "evidence_refs": ["ch8_proof_4021.png"],
        },
    }


def good_bot():
    return {
        "bot_id": "bot_4021_slot1", "account_id": "mumu-account-1", "instance_id": "sidekick-mumu-1",
        "adb_serial": "127.0.0.1:16416", "character_slot": 1, "kingdom_id": 4021,
        "governor_id": "236525888", "governor_name": "Governor236525888", "lifecycle_state": "GROWING",
        "verified_state": {"ch_level": 8, "power": 27800, "last_verified_at": "2026-10-21T22:12:00Z"},
        "routine_profile": {
            "timezone": "America/New_York", "sleep_window_start_hour": 1, "sleep_window_end_hour": 8,
            "max_session_minutes": 60, "min_break_minutes": 30, "daily_active_cap_minutes": 300,
            "active_minutes_today": 95, "target_ch_level": 16, "preferred_gather_types": ["FOOD", "WOOD"],
        },
        "health": {"consecutive_failures": 0, "ban_suspected": False},
    }


def good_slot():
    return {
        "account_id": "mumu-account-1", "instance_id": "sidekick-mumu-1", "adb_serial": "127.0.0.1:16416",
        "account_status": "HEALTHY", "max_slots_per_kingdom": 2,
        "kingdom_slots": {"4021": ["bot_4021_slot1"], "4194": ["bot_4194_slot1", "bot_4194_slot2"]},
    }


def good_helper():
    return {
        "helper_id": "HELPER:R2_REPLACE_4021", "template_id": "R2_REPLACEMENT_PLANNER",
        "parent_ring": "RING_2_OPS", "parent_leader": "TANK", "model_tier": "LLM_FLASH",
        "scope": {"kingdom_id": 4021, "instance_id": "sidekick-mumu-1", "objective": "Find an open slot in #4021."},
        "spawned_at": "2026-10-21T22:00:00Z", "expires_at": "2026-10-22T22:00:00Z",
        "hourly_token_cap": 12000, "tokens_used_this_hour": 0, "status": "ACTIVE",
    }


def mut(base, **changes):
    d = copy.deepcopy(base)
    for k, v in changes.items():
        d[k] = v
    return d


class SchemaIntegrity(unittest.TestCase):
    def test_all_schemas_are_valid_json_schema(self):
        from jsonschema import Draft202012Validator
        for name, doc in V.load_all_schemas().items():
            Draft202012Validator.check_schema(doc)

    def test_enums_in_sync_with_python_tables(self):
        s = V.load_all_schemas()
        self.assertEqual(
            set(s["events.schema.json"]["$defs"]["EventType"]["enum"]) >= set(V.EVENT_RING_AUTHORITY), True)
        self.assertEqual(set(V.INSTANCE_TO_ADB), set(s["jobs.schema.json"]["$defs"]["InstanceId"]["enum"]))
        self.assertEqual(set(V.INSTANCE_TO_ADB.values()), set(s["jobs.schema.json"]["$defs"]["AdbSerial"]["enum"]))
        self.assertEqual(set(V.ACCOUNT_TO_INSTANCE), set(s["bots.schema.json"]["$defs"]["BastionBot"]["properties"]["account_id"]["enum"]))

    def test_every_job_type_has_args_binding(self):
        jobs = V.load_all_schemas()["jobs.schema.json"]["$defs"]
        bound = set()
        for clause in jobs["BastionJob"]["allOf"]:
            const = clause["if"]["properties"].get("job_type", {}).get("const")
            if const:
                bound.add(const)
        self.assertEqual(bound, set(jobs["JobType"]["enum"]))


class Jobs(unittest.TestCase):
    def test_valid(self):
        V.validate_job(good_job())

    def rejects(self, job):
        with self.assertRaises(CVE):
            V.validate_job(job)

    def test_args_must_match_job_type(self):
        j = good_job(); j["args"] = {"target_kingdom_id": 4021, "max_ranks": 50}; self.rejects(j)
        j = good_job(); j["job_type"] = "sleep"; self.rejects(j)

    def test_rejects_shell_or_unknown_args(self):
        j = good_job(); j["args"]["shell_cmd"] = "rm -rf /"; self.rejects(j)

    def test_rejects_out_of_bounds_args(self):
        j = good_job(); j["args"]["max_steps"] = 9999; self.rejects(j)
        j = good_job(); j["args"] = {}; self.rejects(j)

    def test_every_job_type_accepts_minimal_valid_args(self):
        minimal = {
            "probe_status": {}, "switch_character": {"target_kingdom_id": 4194},
            "provision_character": {"target_kingdom_id": 4194, "account_id": "mumu-account-1", "character_slot": 2},
            "grow_city": {"target_ch_level": 8, "max_steps": 40},
            "scan_kingdom": {"target_kingdom_id": 4194, "max_ranks": 650},
            "sleep": {"duration_minutes": 60, "close_app": True},
            "collect_rewards": {}, "alliance_help": {},
            "gather": {"resource_types": ["FOOD"], "max_marches": 2},
            "train_troops": {"troop_types": ["INFANTRY"]},
            "research": {"branch_preference": "ECONOMY"},
            "locate_governor": {"target_kingdom_id": 4194},
        }
        for jt, args in minimal.items():
            j = good_job(); j["job_type"] = jt; j["args"] = args
            V.validate_job(j)

    def test_provision_account_must_live_on_job_instance(self):
        j = good_job(); j["job_type"] = "provision_character"
        j["args"] = {"target_kingdom_id": 4194, "account_id": "mumu-account-0", "character_slot": 1}
        self.rejects(j)  # mumu-account-0 lives on sidekick-mumu-0, job targets sidekick-mumu-1
        j["args"]["account_id"] = "mumu-account-1"
        V.validate_job(j)

    def test_ring1_and_helper_cannot_issue(self):
        j = good_job(); j["issued_by"]["ring"] = "RING_1_INTEL"; self.rejects(j)
        j = good_job(); j["issued_by"]["leader"] = "SCOUT"; self.rejects(j)

    def test_requires_numnum_approval(self):
        j = good_job(); j["issued_by"]["numnum_approval_id"] = "approved"; self.rejects(j)
        j = good_job(); del j["issued_by"]["numnum_approval_id"]; self.rejects(j)

    def test_serial_must_match_instance(self):
        self.rejects(mut(good_job(), adb_serial="127.0.0.1:16384"))
        self.rejects(mut(good_job(), adb_serial="127.0.0.1:5555"))

    def test_types_and_bounds(self):
        self.rejects(mut(good_job(), priority=True))
        self.rejects(mut(good_job(), priority=0))
        self.rejects(mut(good_job(), kingdom_id=99999))
        self.rejects(mut(good_job(), kingdom_id="4021"))
        self.rejects(mut(good_job(), idempotency_key="short77"))
        self.rejects(mut(good_job(), evil="x"))

    def test_time_logic(self):
        self.rejects(mut(good_job(), deadline="2020-01-01T00:00:00Z"))
        self.rejects(mut(good_job(), deadline="soon"))
        self.rejects(mut(good_job(), not_before="2026-10-21T21:00:00Z"))

    def test_expired_deadline_rejected_when_now_supplied(self):
        with self.assertRaises(CVE):
            V.validate_job(good_job(), now=datetime(2026, 10, 22, tzinfo=timezone.utc))
        V.validate_job(good_job(), now=datetime(2026, 10, 21, 22, 5, tzinfo=timezone.utc))


class Results(unittest.TestCase):
    def test_valid(self):
        V.validate_job_result(good_result(), good_job())

    def test_garbage_rejected(self):
        r = good_result()
        r.update(job_type="nope", kingdom_id=-5, duration_ms=-1, observed_state="lol")
        with self.assertRaises(CVE):
            V.validate_job_result(r)

    def test_bad_hash_and_time_order(self):
        r = good_result(); r["evidence"]["screenshot_sha256"] = "zz"
        with self.assertRaises(CVE): V.validate_job_result(r)
        r = good_result(); r["completed_at"] = "2026-10-21T21:00:00Z"
        with self.assertRaises(CVE): V.validate_job_result(r)

    def test_status_error_consistency(self):
        r = good_result(); r["status"] = "FAILED"; r["error"] = None
        with self.assertRaises(CVE): V.validate_job_result(r)
        r = good_result(); r["error"] = {"code": "X", "message": "m", "retryable": False}
        with self.assertRaises(CVE): V.validate_job_result(r)

    def test_must_echo_dispatched_job(self):
        r = good_result(); r["bot_id"] = "bot_other_9999"
        with self.assertRaises(CVE): V.validate_job_result(r, good_job())


class Events(unittest.TestCase):
    def test_valid(self):
        V.validate_event(good_event())

    def test_junk_rejected(self):
        for change in ({"operating_mode": "YOLO"}, {"severity": "LOL"}, {"ring": "RING_9"},
                       {"timestamp": "x"}, {"epoch_day": "x"}):
            with self.assertRaises(CVE, msg=str(change)):
                V.validate_event(mut(good_event(), **change))

    def test_oversight_required_and_nontrivial(self):
        e = good_event(); e["oversight"]["why"] = ""
        with self.assertRaises(CVE): V.validate_event(e)
        e = good_event(); del e["oversight"]
        with self.assertRaises(CVE): V.validate_event(e)
        e = good_event(); e["oversight"]["numnum_checks"][0]["rule_id"] = "MADE_UP"
        with self.assertRaises(CVE): V.validate_event(e)

    def test_actor_must_match_ring(self):
        with self.assertRaises(CVE): V.validate_event(mut(good_event(), actor="SCOUT"))

    def test_separation_of_authority(self):
        # Ring 1 cannot dispatch, Ring 2 cannot verify facts, Ring 3 cannot emit SIGNAL.
        with self.assertRaises(CVE):
            V.validate_event(mut(good_event(), ring="RING_1_INTEL", actor="SCOUT", event_type="JOB_DISPATCHED"))
        with self.assertRaises(CVE):
            V.validate_event(mut(good_event(), event_type="FACT_VERIFIED"))
        with self.assertRaises(CVE):
            V.validate_event(mut(good_event(), ring="RING_3_AUDIT", actor="AUDIT", event_type="SIGNAL"))
        V.validate_event(mut(good_event(), ring="RING_3_AUDIT", actor="AUDIT", event_type="FACT_VERIFIED"))

    def test_human_account_required_flags_operator(self):
        e = mut(good_event(), actor="TANK", event_type="HUMAN_ACCOUNT_REQUIRED", severity="CRITICAL")
        with self.assertRaises(CVE): V.validate_event(e)
        e["oversight"]["operator_action_required"] = True
        e["oversight"]["operator_instructions"] = "Sign a fresh Google account into sidekick-mumu-2."
        V.validate_event(e)


class Intents(unittest.TestCase):
    def good(self):
        return {"intent_id": "int_12345678", "correlation_id": "corr_123456", "created_at": "2026-10-21T22:00:00Z",
                "source": "R5_COMMAND_DESK", "intent_type": "SCAN_KINGDOM", "kingdom_id": 4194, "priority": 80,
                "status": "PENDING", "payload": {}}

    def test_valid_and_junk(self):
        V.validate_intent(self.good())
        for change in ({"source": "HACK"}, {"intent_type": "RM_RF"}, {"priority": 9999}, {"created_at": "x"}):
            with self.assertRaises(CVE, msg=str(change)):
                V.validate_intent(mut(self.good(), **change))


class Bots(unittest.TestCase):
    def test_valid(self):
        V.validate_bot(good_bot())

    def test_empty_nested_rejected(self):
        for field in ("verified_state", "routine_profile", "health"):
            with self.assertRaises(CVE, msg=field):
                V.validate_bot(mut(good_bot(), **{field: {}}))

    def test_account_instance_serial_consistency(self):
        with self.assertRaises(CVE): V.validate_bot(mut(good_bot(), account_id="mumu-account-0"))
        with self.assertRaises(CVE): V.validate_bot(mut(good_bot(), adb_serial="127.0.0.1:16384"))

    def test_routine_profile_semantics(self):
        b = good_bot(); b["routine_profile"]["sleep_window_end_hour"] = 1
        with self.assertRaises(CVE): V.validate_bot(b)
        b = good_bot(); b["routine_profile"]["active_minutes_today"] = 301
        with self.assertRaises(CVE): V.validate_bot(b)

    def test_slot_record(self):
        V.validate_account_slot_record(good_slot())
        over = mut(good_slot(), kingdom_slots={"4194": ["bot_4194_slot1", "bot_4194_slot2", "bot_4194_slot3"]})
        with self.assertRaises(CVE): V.validate_account_slot_record(over)
        dup = mut(good_slot(), kingdom_slots={"4021": ["bot_x_0001"], "4194": ["bot_x_0001"]})
        with self.assertRaises(CVE): V.validate_account_slot_record(dup)
        with self.assertRaises(CVE): V.validate_account_slot_record(mut(good_slot(), instance_id="sidekick-mumu-2"))
        with self.assertRaises(CVE): V.validate_account_slot_record(mut(good_slot(), kingdom_slots={"41": []}))


class Helpers(unittest.TestCase):
    def test_valid(self):
        V.validate_helper_spawn(good_helper(), active_helpers_in_ring=2)

    def test_ring_cap(self):
        with self.assertRaises(CVE): V.validate_helper_spawn(good_helper(), active_helpers_in_ring=3)

    def test_template_ring_mismatch(self):
        h = good_helper(); h["parent_ring"] = "RING_3_AUDIT"; h["parent_leader"] = "AUDIT"
        with self.assertRaises(CVE): V.validate_helper_spawn(h)

    def test_tier_cannot_exceed_template(self):
        h = good_helper(); h["model_tier"] = "LLM_PRO"
        with self.assertRaises(CVE): V.validate_helper_spawn(h)

    def test_no_subhelpers_ttl_and_budget(self):
        h = good_helper(); h["can_spawn_subhelpers"] = True
        with self.assertRaises(CVE): V.validate_helper_spawn(h)
        h = good_helper(); h["expires_at"] = "2026-10-24T00:00:00Z"
        with self.assertRaises(CVE): V.validate_helper_spawn(h)
        h = good_helper(); h["tokens_used_this_hour"] = 99999
        with self.assertRaises(CVE): V.validate_helper_spawn(h)


if __name__ == "__main__":
    unittest.main()
