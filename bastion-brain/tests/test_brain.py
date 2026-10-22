"""Brain v0 tests: offline (memory store/transport), fixed clock, strict contract validation of every event."""

import copy
import json
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from brain import numnum  # noqa: E402
from brain.config import BrainConfig  # noqa: E402
from brain.rings import DEFAULT_CONFIG, instance_key, runtime_key  # noqa: E402
from brain.runtime import Brain, resolve_mode  # noqa: E402
from brain.store import MemoryStore, NullTransport, ReadOnlyOverlay, event_item, from_ddb, to_ddb  # noqa: E402
from brain.transport import MemoryBrainTransport  # noqa: E402
from contracts import validator as V  # noqa: E402

AWAKE = datetime(2026, 10, 22, 0, 0, tzinfo=timezone.utc)      # 20:00 EDT
NIGHT = datetime(2026, 10, 22, 6, 30, tzinfo=timezone.utc)     # 02:30 EDT (both bots asleep)
MORNING = datetime(2026, 10, 22, 13, 0, tzinfo=timezone.utc)   # 09:00 EDT (both windows over)


def profile(start, end):
    return {"timezone": "America/New_York", "sleep_window_start_hour": start, "sleep_window_end_hour": end,
            "max_session_minutes": 60, "min_break_minutes": 30, "daily_active_cap_minutes": 300,
            "active_minutes_today": 0, "target_ch_level": 16, "preferred_gather_types": ["FOOD"]}


def make_bot(bot_id, inst, serial, account, kingdom, ch=8, verified="2026-10-21T23:46:34Z", window=(1, 8), state="ACTIVE"):
    return {"bot_id": bot_id, "account_id": account, "instance_id": inst, "adb_serial": serial, "character_slot": 1,
            "kingdom_id": kingdom, "governor_id": "236525888", "governor_name": f"Gov{kingdom}", "lifecycle_state": state,
            "verified_state": {"ch_level": ch, "power": 27800, "last_verified_at": verified},
            "routine_profile": profile(*window), "health": {"consecutive_failures": 0, "ban_suspected": False}}


class Clock:
    def __init__(self, t):
        self.t = t

    def __call__(self):
        return self.t


class World:
    def __init__(self, t=AWAKE, boot_mode="DRY_RUN", control_mode=None, bots=None, kingdom_last="2026-10-21T15:11:43Z"):
        self.clock = Clock(t)
        self.store = MemoryStore()
        self.transport = MemoryBrainTransport()
        bots = bots if bots is not None else [
            make_bot("bot_4021_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021, window=(1, 8)),
            make_bot("bot_4194_m0", "sidekick-mumu-0", "127.0.0.1:16384", "mumu-account-0", 4194, window=(2, 9)),
        ]
        for b in bots:
            V.validate_bot(b)
            self.store.put_bot(b)
        self.store.put_control("FLEET", {"bot_ids": [b["bot_id"] for b in bots],
                                         "active_by_instance": {b["instance_id"]: b["bot_id"] for b in bots}})
        self.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[{"kingdom_id": 4194, "cadence_hours": 3}]))
        if kingdom_last:
            self.store.put_control("KINGDOM#4194", {"last_scan_verified_at": kingdom_last})
        if control_mode:
            self.store.put_control("MODE", {"mode": control_mode})
        self.lines = []
        self.brain = Brain(BrainConfig(jobs_queue_url="q", results_queue_url="r", boot_mode=boot_mode),
                           self.store, self.transport, clock=self.clock, strict_events=True, log=self.lines.append)

    def tick(self):
        return self.brain.tick()

    def types(self):
        return [(e["actor"], e["event_type"]) for e in self.store.events]

    def events(self, etype):
        return [e for e in self.store.events if e["event_type"] == etype]

    def bot(self, bot_id):
        return self.store.bots[bot_id]

    def result_for(self, job, status="SUCCEEDED", screen="CITY_VIEW", ch=None, error=None, duration_ms=60000):
        start = self.clock()
        obs = {"kingdom_id": None, "screen_state": screen}
        if ch is not None:
            obs["ch_level"] = ch
        return {"job_id": job["job_id"], "idempotency_key": job["idempotency_key"], "correlation_id": job["correlation_id"],
                "job_type": job["job_type"], "instance_id": job["instance_id"], "bot_id": job["bot_id"],
                "kingdom_id": job["kingdom_id"], "status": status,
                "started_at": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "completed_at": (start + timedelta(milliseconds=duration_ms)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "duration_ms": duration_ms, "observed_state": obs,
                "steps_executed": [{"step_index": 1, "action": "x", "detail": "y", "timestamp": start.strftime("%Y-%m-%dT%H:%M:%SZ")}],
                "evidence": {"screenshot_uri": "s3://b/e.png", "screenshot_sha256": "a" * 64, "ocr_lines": ["City"]},
                "error": error}


class DryRun(unittest.TestCase):
    def test_awake_scan_due_is_proposed_but_held_for_missing_skill(self):
        w = World()
        s = w.tick()
        self.assertEqual(s["mode"], "DRY_RUN")
        self.assertEqual(w.transport.sent, [])
        self.assertIn(("NULL", "SIGNAL"), w.types())
        props = w.events("PLAN_PROPOSED")
        self.assertEqual([(e["bot_id"], e["oversight"]["trigger_inputs"]["args"]["target_kingdom_id"]) for e in props], [("bot_4194_m0", 4194)])
        rej = w.events("PLAN_REJECTED")[0]
        failed = [c["rule_id"] for c in rej["oversight"]["numnum_checks"] if not c["passed"]]
        self.assertEqual(failed, ["EXECUTOR_CAPABILITY"])
        self.assertEqual(s["plans"]["sidekick-mumu-1"], "IDLE")  # verified 14 minutes ago, nothing to do
        self.assertIn("BRAIN_HEARTBEAT", w.store.control)

    def test_identical_decisions_are_deduplicated(self):
        w = World()
        w.tick()
        n = len(w.store.events)
        w.clock.t += timedelta(minutes=1)
        self.assertEqual(w.tick()["plans"]["sidekick-mumu-0"], "DEDUPED")
        self.assertEqual(len(w.store.events), n)
        w.clock.t += timedelta(minutes=61)
        w.tick()
        self.assertGreater(len(w.events("PLAN_PROPOSED")), 1)

    def test_night_plans_sleep_for_both_without_dispatch(self):
        w = World(t=NIGHT)
        w.tick()
        self.assertEqual(w.transport.sent, [])
        approved = w.events("PLAN_APPROVED")
        self.assertEqual(sorted(e["bot_id"] for e in approved), ["bot_4021_m1", "bot_4194_m0"])
        self.assertTrue(all("not dispatched" in e["summary"] for e in approved))
        args = {e["bot_id"]: e["oversight"]["trigger_inputs"]["args"] for e in w.events("PLAN_PROPOSED")}
        self.assertEqual(args["bot_4021_m1"], {"duration_minutes": 330, "close_app": True, "reason": "SLEEP_WINDOW"})  # until 08:00 EDT
        self.assertEqual(args["bot_4194_m0"]["duration_minutes"], 390)  # until 09:00 EDT
        self.assertEqual(w.events("JOB_DISPATCHED"), [])


class Autonomous(unittest.TestCase):
    def test_sleep_cycle_dispatch_mutex_audit_and_wake(self):
        w = World(t=NIGHT, control_mode="AUTONOMOUS")
        w.tick()
        self.assertEqual(len(w.transport.sent), 2)
        job = next(j for j in w.transport.sent if j["bot_id"] == "bot_4021_m1")
        V.validate_job(job)
        self.assertTrue(job["issued_by"]["numnum_approval_id"].startswith("nn_"))
        self.assertEqual(w.store.control[instance_key("sidekick-mumu-1")]["in_flight"]["job_id"], job["job_id"])

        w.clock.t += timedelta(minutes=1)
        self.assertEqual(w.tick()["plans"]["sidekick-mumu-1"], "BUSY")
        self.assertEqual(len(w.transport.sent), 2)

        w.transport.push_result(w.result_for(job, screen="SLEEP_APP_CLOSED", duration_ms=3000))
        w.tick()
        self.assertEqual(w.bot("bot_4021_m1")["lifecycle_state"], "SLEEPING")
        self.assertIsNone(w.store.control[instance_key("sidekick-mumu-1")]["in_flight"])
        self.assertEqual(w.bot("bot_4021_m1")["routine_profile"]["active_minutes_today"], 0)  # rest job: no active minutes
        self.assertEqual(w.tick()["plans"]["sidekick-mumu-1"], "IDLE")  # asleep inside window

        w.clock.t = MORNING
        w.tick()
        wake = w.transport.sent[-1] if w.transport.sent[-1]["bot_id"] == "bot_4021_m1" else w.transport.sent[-2]
        self.assertEqual((wake["job_type"], wake["args"]["launch_if_closed"]), ("probe_status", True))
        w.transport.push_result(w.result_for(wake, screen="CITY_VIEW"))
        w.tick()
        self.assertEqual(w.bot("bot_4021_m1")["lifecycle_state"], "ACTIVE")
        rt = w.store.control[runtime_key("bot_4021_m1")]
        self.assertGreaterEqual(rt["active_minutes_today"], 1)
        self.assertIsNotNone(rt["session_started_at"])

    def test_failed_wake_counts_and_backs_off(self):
        w = World(t=MORNING, control_mode="AUTONOMOUS",
                  bots=[make_bot("bot_4021_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021, state="SLEEPING")],
                  kingdom_last=None)
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w.tick()
        wake = w.transport.sent[-1]
        w.transport.push_result(w.result_for(wake, screen="SLEEP_APP_CLOSED"))
        w.tick()
        b = w.bot("bot_4021_m1")
        self.assertEqual((b["lifecycle_state"], b["health"]["consecutive_failures"]), ("SLEEPING", 1))
        self.assertEqual(w.tick()["plans"]["sidekick-mumu-1"], "IDLE")  # backing off 10 minutes
        w.clock.t += timedelta(minutes=11)
        self.assertEqual(w.tick()["plans"]["sidekick-mumu-1"], "DISPATCHED")

    def test_grow_city_and_fact_verification(self):
        w = World(control_mode="AUTONOMOUS", kingdom_last=None,
                  bots=[make_bot("bot_new_0001", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021, ch=5, state="GROWING")])
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w.tick()
        job = w.transport.sent[0]
        self.assertEqual((job["job_type"], job["args"]["target_ch_level"]), ("grow_city", 8))
        w.transport.push_result(w.result_for(job, ch=8, duration_ms=18 * 60000))
        w.tick()
        b = w.bot("bot_new_0001")
        self.assertEqual((b["verified_state"]["ch_level"], b["lifecycle_state"]), (8, "ACTIVE"))
        fv = w.events("FACT_VERIFIED")[-1]
        self.assertEqual(fv["oversight"]["trigger_inputs"]["changes"], {"ch_level": [5, 8]})
        self.assertEqual(fv["oversight"]["evidence_refs"], ["s3://b/e.png"])
        self.assertEqual(w.store.control[runtime_key("bot_new_0001")]["active_minutes_today"], 18)

    def test_ban_screen_moves_bot_to_suspect_and_out_of_rotation(self):
        w = World(t=NIGHT, control_mode="AUTONOMOUS")
        w.tick()
        job = next(j for j in w.transport.sent if j["bot_id"] == "bot_4021_m1")
        w.transport.push_result(w.result_for(job, status="ACCOUNT_LOCKED_OR_BANNED", screen="BANNED_OR_SUSPENDED",
                                             error={"code": "ACCOUNT_BANNED_SCREEN", "message": "banned", "retryable": False}))
        w.tick()
        b = w.bot("bot_4021_m1")
        self.assertEqual((b["lifecycle_state"], b["health"]["ban_suspected"]), ("SUSPECT", True))
        crit = [e for e in w.store.events if e["severity"] == "CRITICAL" and e["event_type"] == "BOT_STATE_CHANGED"]
        self.assertEqual(len(crit), 1)
        self.assertEqual(w.tick()["plans"]["sidekick-mumu-1"], "STATE_SUSPECT")

    def test_three_real_failures_suspect_but_offline_device_does_not_count(self):
        w = World(t=NIGHT, control_mode="AUTONOMOUS")
        offline = {"code": "DEVICE_OFFLINE", "message": "unreachable", "retryable": True}
        boom = {"code": "SKILL_EXIT_NONZERO", "message": "rc=1", "retryable": True}
        for i in range(5):
            w.clock.t += timedelta(minutes=1)
            w.tick()
            job = w.store.control[instance_key("sidekick-mumu-1")]["in_flight"]
            if job is None:
                break
            w.transport.push_result(w.result_for(job, status="FAILED", screen="UNKNOWN", error=offline if i < 2 else boom))
            w.tick()
        b = w.bot("bot_4021_m1")
        self.assertEqual(b["lifecycle_state"], "SUSPECT")
        self.assertEqual(b["health"]["consecutive_failures"], 3)

    def test_supervised_dispatches_routine(self):
        w = World(t=NIGHT, control_mode="SUPERVISED")
        w.tick()
        self.assertEqual(len(w.transport.sent), 2)


class Modes(unittest.TestCase):
    def test_resolution_rules(self):
        self.assertEqual(resolve_mode("OFF", {"mode": "AUTONOMOUS"}), "OFF")
        self.assertEqual(resolve_mode("DRY_RUN", {"mode": "AUTONOMOUS"}), "AUTONOMOUS")
        self.assertEqual(resolve_mode("DRY_RUN", {"mode": "BOGUS"}), "DRY_RUN")
        self.assertEqual(resolve_mode("SUPERVISED", None), "SUPERVISED")

    def test_off_stops_planning_but_finishes_in_flight(self):
        w = World(t=NIGHT, control_mode="AUTONOMOUS")
        w.tick()
        job = next(j for j in w.transport.sent if j["bot_id"] == "bot_4021_m1")
        w.store.put_control("MODE", {"mode": "OFF"})
        n_props = len(w.events("PLAN_PROPOSED"))
        w.transport.push_result(w.result_for(job, screen="SLEEP_APP_CLOSED"))
        s = w.tick()
        self.assertEqual(s["mode"], "OFF")
        self.assertNotIn("plans", s)
        self.assertEqual(len(w.events("PLAN_PROPOSED")), n_props)
        self.assertEqual(w.bot("bot_4021_m1")["lifecycle_state"], "SLEEPING")

    def test_mode_changed_emitted_once_per_change(self):
        w = World()
        w.tick(); w.tick()
        self.assertEqual(len(w.events("MODE_CHANGED")), 1)
        w.store.put_control("MODE", {"mode": "AUTONOMOUS"})
        w.tick()
        self.assertEqual([e["summary"] for e in w.events("MODE_CHANGED")][-1], "Brain mode DRY_RUN -> AUTONOMOUS")


class Ring3Edges(unittest.TestCase):
    def test_stale_in_flight_released(self):
        w = World(t=NIGHT, control_mode="AUTONOMOUS")
        w.tick()
        w.clock.t += timedelta(minutes=25)  # sleep deadline 10m + grace 10m
        w.store.put_control("MODE", {"mode": "OFF"})
        w.tick()
        self.assertIsNone(w.store.control[instance_key("sidekick-mumu-1")]["in_flight"])
        self.assertEqual(w.bot("bot_4021_m1")["health"]["consecutive_failures"], 1)
        self.assertTrue(any("by deadline" in e["summary"] for e in w.events("JOB_RESULT")))

    def test_unmatched_result_recorded_not_applied(self):
        w = World()
        fake = {"job_id": "job_smoke_abcdef12", "idempotency_key": "idem_smoke_xyz1", "correlation_id": "corr_smoke_1",
                "job_type": "probe_status", "instance_id": "sidekick-mumu-1", "bot_id": "bot_4021_m1", "kingdom_id": 4021}
        w.transport.push_result(w.result_for(fake))
        before = copy.deepcopy(w.bot("bot_4021_m1"))
        w.tick()
        self.assertEqual(w.transport.deleted, ["rr1"])
        self.assertEqual(w.bot("bot_4021_m1"), before)
        self.assertIn("not a brain-dispatched job", w.events("JOB_RESULT")[0]["summary"])

    def test_garbage_result_left_for_retry(self):
        w = World()
        w.transport.results.append(("rrX", "{not json"))
        w.tick()
        self.assertEqual(w.transport.deleted, [])
        self.assertTrue(any(e["severity"] == "WARN" for e in w.events("JOB_RESULT")))


class Intents(unittest.TestCase):
    def intent(self, **over):
        i = {"intent_id": "int_r5scan_0001", "correlation_id": "corr_r5_0001", "created_at": "2026-10-21T23:00:00Z",
             "source": "R5_COMMAND_DESK", "intent_type": "SCAN_KINGDOM", "kingdom_id": 4021, "priority": 80,
             "status": "PENDING", "payload": {"max_ranks": 150}}
        i.update(over)
        return i

    def test_r5_scan_intent_triaged_and_planned_with_its_correlation(self):
        w = World(kingdom_last=None)
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w.store.intents["int_r5scan_0001"] = self.intent()
        w.tick()
        self.assertEqual(w.store.intents["int_r5scan_0001"]["status"], "TRIAGED_BY_SCOUT")
        self.assertIn(("KENT", "INTENT_RECEIVED"), w.types())
        prop = [e for e in w.events("PLAN_PROPOSED") if e["bot_id"] == "bot_4021_m1"][0]
        self.assertEqual(prop["correlation_id"], "corr_r5_0001")
        self.assertEqual(prop["oversight"]["trigger_inputs"]["args"]["max_ranks"], 150)

    def test_malformed_and_unsupported_intents_rejected(self):
        w = World()
        w.store.intents["int_bad_00001"] = self.intent(intent_id="int_bad_00001", source="HACK")
        w.store.intents["int_pause_0001"] = self.intent(intent_id="int_pause_0001", intent_type="PAUSE_INSTANCE")
        w.tick()
        self.assertEqual(w.store.intents["int_bad_00001"]["status"], "REJECTED")
        self.assertEqual(w.store.intents["int_pause_0001"]["status"], "REJECTED")


class NumNumRules(unittest.TestCase):
    def setUp(self):
        self.bot = make_bot("bot_4021_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021, window=(22, 6))

    def job(self, jt="probe_status", args=None, now=AWAKE):
        return {"job_id": "job_unit_000001", "idempotency_key": "idem_unit_00001", "correlation_id": "corr_unit_01",
                "job_type": jt, "instance_id": "sidekick-mumu-1", "adb_serial": "127.0.0.1:16416", "bot_id": "bot_4021_m1",
                "kingdom_id": 4021, "priority": 20, "issued_by": {"ring": "RING_2_OPS", "leader": "TANK", "numnum_approval_id": "nn_pending_gate"},
                "created_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "not_before": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "deadline": (now + timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ"), "args": args or {}}

    def verdict(self, job, rt=None, inst=None, now=AWAKE, caps=numnum.DEFAULT_CAPABILITIES, keys=()):
        rt = numnum.fresh_runtime(rt, self.bot, now)
        ok, checks = numnum.evaluate(job, self.bot, rt, inst or {}, now, caps, keys)
        return ok, {c["rule_id"]: c["passed"] for c in checks}

    def test_wraparound_window(self):
        late = datetime(2026, 10, 22, 3, 30, tzinfo=timezone.utc)  # 23:30 EDT, inside 22-06
        ok, c = self.verdict(self.job(now=late), now=late)
        self.assertFalse(c["SLEEP_WINDOW_CHECK"])
        ok, c = self.verdict(self.job("sleep", {"duration_minutes": 60, "close_app": True}, now=late), now=late)
        self.assertTrue(ok)
        self.assertTrue(numnum.in_window(23, 22, 6) and numnum.in_window(5, 22, 6) and not numnum.in_window(6, 22, 6))

    def test_daily_cap_session_cap_and_break(self):
        self.assertFalse(self.verdict(self.job(), rt={"day": "2026-10-21", "active_minutes_today": 299})[1]["DAILY_ACTIVE_MINUTES_CAP"])
        long_session = {"day": "2026-10-21", "session_started_at": "2026-10-21T23:00:00Z"}
        self.assertFalse(self.verdict(self.job(), rt=long_session)[1]["SESSION_DURATION_CAP"])
        short_break = {"day": "2026-10-21", "last_session_end": "2026-10-21T23:50:00Z"}
        self.assertFalse(self.verdict(self.job(), rt=short_break)[1]["SESSION_DURATION_CAP"])
        self.assertTrue(self.verdict(self.job())[0])

    def test_day_rollover_resets_minutes(self):
        rt = numnum.fresh_runtime({"day": "2026-10-20", "active_minutes_today": 300}, self.bot, AWAKE)
        self.assertEqual(rt["active_minutes_today"], 0)

    def test_capability_mutex_dedup_schema(self):
        self.assertFalse(self.verdict(self.job("scan_kingdom", {"target_kingdom_id": 4021, "max_ranks": 50}))[1]["EXECUTOR_CAPABILITY"])
        self.assertFalse(self.verdict(self.job(), inst={"in_flight": {"job_id": "job_x", "job_type": "grow_city"}})[1]["INSTANCE_SINGLE_TENANT_MUTEX"])
        self.assertFalse(self.verdict(self.job(), keys=["idem_unit_00001"])[1]["IDEMPOTENCY_DEDUP"])
        self.assertFalse(self.verdict(self.job(args={"rm": "-rf"}))[1]["JOB_SCHEMA_BOUNDS"])

    def test_routine_daily_cap_and_session_break_choose_sleep(self):
        w = World(control_mode="AUTONOMOUS", kingdom_last=None, bots=[make_bot("bot_4021_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021)])
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w.store.put_control(runtime_key("bot_4021_m1"), {"day": "2026-10-21", "active_minutes_today": 300})
        w.tick()
        self.assertEqual(w.transport.sent[-1]["args"]["reason"], "DAILY_CAP_REACHED")
        w2 = World(control_mode="AUTONOMOUS", kingdom_last=None, bots=[make_bot("bot_4021_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021)])
        w2.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w2.store.put_control(runtime_key("bot_4021_m1"), {"day": "2026-10-21", "active_minutes_today": 60, "session_started_at": "2026-10-21T22:30:00Z"})
        w2.tick()
        self.assertEqual((w2.transport.sent[-1]["args"]["reason"], w2.transport.sent[-1]["args"]["duration_minutes"]), ("SESSION_BREAK", 30))


class StoreHelpers(unittest.TestCase):
    def test_event_item_and_decimal_roundtrip(self):
        w = World()
        w.tick()
        ev = w.store.events[0]
        self.assertTrue(ev["sort_key"].startswith(ev["timestamp"] + "#"))
        self.assertGreater(ev["expires_at_epoch"], int(AWAKE.timestamp()) + 89 * 86400)
        self.assertNotIn("bot_id", ev)  # MODE_CHANGED has no bot: top-level nulls dropped for GSI safety
        self.assertEqual(from_ddb(to_ddb({"a": 1.5, "b": 2, "c": [3.0]})), {"a": 1.5, "b": 2, "c": [3]})

    def test_rehearsal_overlay_never_writes_base(self):
        base = World(t=NIGHT, control_mode="AUTONOMOUS")
        snapshot = (copy.deepcopy(base.store.control), copy.deepcopy(base.store.bots), len(base.store.events))
        overlay = ReadOnlyOverlay(base.store)
        transport = NullTransport()
        b = Brain(BrainConfig(jobs_queue_url="q", results_queue_url="r"), overlay, transport,
                  clock=base.clock, strict_events=True, log=lambda *_: None, force_mode="DRY_RUN")
        b.tick()
        self.assertEqual((base.store.control, base.store.bots, len(base.store.events)), snapshot)
        self.assertEqual(transport.sent, [])
        self.assertTrue(any(e["event_type"] == "PLAN_APPROVED" for e in overlay.events))


class SelfHealingAndSwitching(unittest.TestCase):
    def _account(self, account_id, inst, serial, kingdom_slots):
        rec = {
            "account_id": account_id,
            "instance_id": inst,
            "adb_serial": serial,
            "account_status": "HEALTHY",
            "max_slots_per_kingdom": 2,
            "kingdom_slots": kingdom_slots,
        }
        V.validate_account_slot_record(rec)
        return rec

    def test_self_healing_replacement_and_ch8_growth(self):
        w = World(control_mode="AUTONOMOUS", kingdom_last=None)
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w.store.put_account_slots(self._account(
            "mumu-account-1", "sidekick-mumu-1", "127.0.0.1:16416",
            {"4021": ["bot_4021_m1"]},
        ))
        w.brain.declare_bot_lost("bot_4021_m1", "confirmed ban in #4021")
        self.assertEqual(w.bot("bot_4021_m1")["lifecycle_state"], "LOST")
        self.assertEqual(len(w.events("BOT_LOST")), 1)

        # Tick 1: Ring 2 proposes provision_character, NUMNUM approves (1/2 slots used), dispatches
        s1 = w.tick()
        self.assertEqual(s1["plans"]["sidekick-mumu-1"], "DISPATCHED")
        prov_job = w.transport.sent[-1]
        self.assertEqual(prov_job["job_type"], "provision_character")
        self.assertEqual(prov_job["args"]["target_kingdom_id"], 4021)
        self.assertEqual(prov_job["args"]["character_slot"], 2)
        new_id = prov_job["bot_id"]
        self.assertNotIn(new_id, w.store.bots)  # Single-writer invariant: Ring 2 did not write BastionBots

        # CIPHER finishes provision_character at CH2 -> Ring 3 creates GROWING bot, retires LOST bot, Ring 2 dispatches grow_city
        res = w.result_for(prov_job, screen="CITY_VIEW", ch=2, duration_ms=120000)
        res["observed_state"]["kingdom_id"] = 4021
        res["observed_state"]["governor_id"] = "237099999"
        res["observed_state"]["governor_name"] = "Rep4021"
        res["observed_state"]["power"] = 1800
        w.transport.push_result(res)

        s2 = w.tick()
        self.assertEqual(s2["plans"]["sidekick-mumu-1"], "BUSY")
        self.assertEqual(w.bot("bot_4021_m1")["lifecycle_state"], "RETIRED")
        self.assertEqual(w.bot(new_id)["lifecycle_state"], "GROWING")
        self.assertEqual(w.bot(new_id)["verified_state"]["ch_level"], 2)
        self.assertEqual(w.store.control["FLEET"]["active_by_instance"]["sidekick-mumu-1"], new_id)
        acct = w.store.get_account_slots("mumu-account-1")
        self.assertEqual(acct["kingdom_slots"]["4021"], ["bot_4021_m1", new_id])

        # Tick 3: Ring 2 plans & dispatches grow_city to CH8 for the new GROWING bot
        s3 = w.tick()
        self.assertEqual(s3["plans"]["sidekick-mumu-1"], "DISPATCHED")
        grow_job = w.transport.sent[-1]
        self.assertEqual((grow_job["job_type"], grow_job["bot_id"], grow_job["args"]["target_ch_level"]),
                         ("grow_city", new_id, 8))

        # CIPHER finishes grow_city at CH8 -> Ring 3 transitions GROWING -> ACTIVE
        w.transport.push_result(w.result_for(grow_job, screen="CITY_VIEW", ch=8, duration_ms=300000))
        w.tick()
        self.assertEqual(w.bot(new_id)["lifecycle_state"], "ACTIVE")
        self.assertEqual(w.bot(new_id)["verified_state"]["ch_level"], 8)

    def test_slot_limit_2_per_kingdom_rejects_and_requests_human_account(self):
        w = World(control_mode="AUTONOMOUS", kingdom_last=None)
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w.store.put_account_slots(self._account(
            "mumu-account-0", "sidekick-mumu-0", "127.0.0.1:16384",
            {"4194": ["bot_4194_m0", "bot_4194_alt_m0"]},
        ))
        w.brain.declare_bot_lost("bot_4194_m0", "confirmed ban in #4194")
        s = w.tick()
        self.assertEqual(s["plans"]["sidekick-mumu-0"], "REJECTED")
        rej = [e for e in w.events("PLAN_REJECTED") if e.get("instance_id") == "sidekick-mumu-0"][-1]
        failed = [c["rule_id"] for c in rej["oversight"]["numnum_checks"] if not c["passed"]]
        self.assertIn("ACCOUNT_SLOT_LIMIT_2_PER_KINGDOM", failed)
        human_evs = w.events("HUMAN_ACCOUNT_REQUIRED")
        self.assertEqual(len(human_evs), 1)
        self.assertEqual(human_evs[0]["kingdom_id"], 4194)

    def test_second_ban_confirms_suspect_to_lost(self):
        b = make_bot("bot_4021_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021, state="SUSPECT")
        b["health"] = {"consecutive_failures": 1, "ban_suspected": True}
        w = World(control_mode="AUTONOMOUS", kingdom_last=None, bots=[b])
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        fake_job = {
            "job_id": "job_ban_confirm1", "idempotency_key": "idem_ban_confirm1", "correlation_id": "corr_ban_confirm01",
            "job_type": "probe_status", "instance_id": "sidekick-mumu-1", "adb_serial": "127.0.0.1:16416",
            "bot_id": "bot_4021_m1", "kingdom_id": 4021, "deadline": "2026-10-22T01:00:00Z",
        }
        w.store.put_control(instance_key("sidekick-mumu-1"), {"in_flight": fake_job, "recent_keys": []})
        w.transport.push_result(w.result_for(
            fake_job, status="ACCOUNT_LOCKED_OR_BANNED", screen="BANNED_OR_SUSPENDED",
            error={"code": "ACCOUNT_BANNED_SCREEN", "message": "banned", "retryable": False},
        ))
        w.tick()
        self.assertEqual(w.bot("bot_4021_m1")["lifecycle_state"], "LOST")
        self.assertEqual(len(w.events("BOT_LOST")), 1)

    def test_supervised_holds_provision_character(self):
        w = World(control_mode="SUPERVISED", kingdom_last=None)
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w.store.put_account_slots(self._account(
            "mumu-account-1", "sidekick-mumu-1", "127.0.0.1:16416",
            {"4021": ["bot_4021_m1"]},
        ))
        w.brain.declare_bot_lost("bot_4021_m1", "test supervised hold")
        s = w.tick()
        self.assertEqual(s["plans"]["sidekick-mumu-1"], "APPROVED_NOT_DISPATCHED")
        self.assertEqual(w.transport.sent, [])

    def test_sibling_switch_character_on_r5_scan_demand(self):
        b1 = make_bot("bot_4021_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021)
        b2 = make_bot("bot_4198_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4198)
        w = World(control_mode="AUTONOMOUS", kingdom_last=None, bots=[b1, b2])
        w.store.put_control("FLEET", {"bot_ids": ["bot_4021_m1", "bot_4198_m1"],
                                      "active_by_instance": {"sidekick-mumu-1": "bot_4021_m1"}})
        w.store.put_control("CONFIG", dict(DEFAULT_CONFIG, watched_kingdoms=[]))
        w.store.intents["int_r5scan_4198"] = {
            "intent_id": "int_r5scan_4198", "correlation_id": "corr_r5_4198_scan",
            "created_at": "2026-10-21T23:00:00Z", "source": "R5_COMMAND_DESK",
            "intent_type": "SCAN_KINGDOM", "kingdom_id": 4198, "priority": 80,
            "status": "PENDING", "payload": {"max_ranks": 100},
        }
        s1 = w.tick()
        self.assertEqual(s1["plans"]["sidekick-mumu-1"], "DISPATCHED")
        sw_job = w.transport.sent[-1]
        self.assertEqual(sw_job["job_type"], "switch_character")
        self.assertEqual(sw_job["args"]["target_governor_name"], "Gov4198")
        self.assertEqual(sw_job["args"]["target_kingdom_id"], 4198)

        res = w.result_for(sw_job, screen="CITY_VIEW", ch=8, duration_ms=25000)
        res["observed_state"]["kingdom_id"] = 4198
        w.transport.push_result(res)
        w.tick()
        self.assertEqual(w.store.control["FLEET"]["active_by_instance"]["sidekick-mumu-1"], "bot_4198_m1")

    def test_cross_instance_redundancy_provisions_twin_with_staggered_sleep(self):
        b_m0 = make_bot("bot_4197_m0", "sidekick-mumu-0", "127.0.0.1:16384", "mumu-account-0", 4197, ch=5, state="GROWING", window=(2, 9))
        b_m1 = make_bot("bot_4021_m1", "sidekick-mumu-1", "127.0.0.1:16416", "mumu-account-1", 4021, ch=8, state="ACTIVE", window=(1, 8))
        w = World(control_mode="AUTONOMOUS", kingdom_last=None, bots=[b_m0, b_m1])
        w.store.put_control("CONFIG", dict(
            DEFAULT_CONFIG,
            watched_kingdoms=[{"kingdom_id": 4197, "cadence_hours": 12}],
            enforce_cross_instance_redundancy=True,
        ))
        w.store.put_account_slots(self._account("mumu-account-0", "sidekick-mumu-0", "127.0.0.1:16384", {"4197": ["bot_4197_m0"]}))
        w.store.put_account_slots(self._account("mumu-account-1", "sidekick-mumu-1", "127.0.0.1:16416", {"4021": ["bot_4021_m1"]}))

        # Tick 1: sidekick-mumu-0 grows bot_4197_m0 (CH5->CH8), while sidekick-mumu-1 provisions twin bot_4197_twin_m1 in #4197
        s1 = w.tick()
        self.assertIn("REDUNDANCY_GAP#4197", s1["demands"])
        self.assertEqual(s1["plans"]["sidekick-mumu-0"], "DISPATCHED")
        self.assertEqual(s1["plans"]["sidekick-mumu-1"], "DISPATCHED")
        twin_job = next(j for j in w.transport.sent if j["instance_id"] == "sidekick-mumu-1")
        self.assertEqual((twin_job["job_type"], twin_job["bot_id"], twin_job["args"]["target_kingdom_id"]),
                         ("provision_character", "bot_4197_twin_m1", 4197))
        app_ev = [e for e in w.events("PLAN_APPROVED") if e.get("bot_id") == "bot_4197_twin_m1"][-1]
        rules = {c["rule_id"]: c["passed"] for c in app_ev["oversight"]["numnum_checks"]}
        self.assertTrue(rules["CROSS_INSTANCE_REDUNDANCY"])
        self.assertTrue(rules["ACCOUNT_SLOT_LIMIT_2_PER_KINGDOM"])

        # CIPHER completes twin provision_character -> Ring 3 creates bot_4197_twin_m1 with staggered sleep window (5, 12)
        res = w.result_for(twin_job, screen="CITY_VIEW", ch=2, duration_ms=120000)
        res["observed_state"]["kingdom_id"] = 4197
        res["observed_state"]["governor_id"] = "237041971"
        res["observed_state"]["governor_name"] = "Twin4197M1"
        w.transport.push_result(res)
        w.tick()
        twin = w.bot("bot_4197_twin_m1")
        self.assertEqual(twin["lifecycle_state"], "GROWING")
        self.assertEqual((twin["routine_profile"]["sleep_window_start_hour"], twin["routine_profile"]["sleep_window_end_hour"]), (5, 12))
        self.assertEqual(w.bot("bot_4021_m1")["lifecycle_state"], "ACTIVE")  # existing bot on mumu-1 is NOT retired!

        # Next tick: sidekick-mumu-1 immediately dispatches grow_city to CH8 for bot_4197_twin_m1
        s3 = w.tick()
        self.assertEqual(s3["plans"]["sidekick-mumu-1"], "DISPATCHED")
        grow_job = w.transport.sent[-1]
        self.assertEqual((grow_job["job_type"], grow_job["bot_id"]), ("grow_city", "bot_4197_twin_m1"))


class Stage6LeadersAndHelpers(unittest.TestCase):
    def test_llm_leaders_structured_advice_and_token_budget_tracking(self):
        def fake_llm(leader, model, req):
            return (
                {"why": f"{leader} LLM rationale: execute {req['objective']}"},
                {"model": model, "prompt_tokens": 350, "completion_tokens": 90, "latency_ms": 185},
            )

        w = World(t=NIGHT, control_mode="AUTONOMOUS")
        w.brain = Brain(
            BrainConfig(jobs_queue_url="q", results_queue_url="r", boot_mode="DRY_RUN"),
            w.store, w.transport, clock=w.clock, strict_events=True, log=w.lines.append, llm_fn=fake_llm,
        )
        w.tick()
        prop = w.events("PLAN_PROPOSED")[0]
        self.assertEqual(prop["oversight"]["llm_telemetry"]["model"], "gemini-2.5-flash")
        self.assertEqual(prop["oversight"]["llm_telemetry"]["prompt_tokens"], 350)
        self.assertIn("TANK LLM rationale:", prop["oversight"]["why"])
        used, cap = w.brain.advisor.ring_budget("RING_2_OPS", w.clock())
        self.assertEqual(used, 880)  # 2 instances planned x 440 tokens each

        # Exhaust RING_2_OPS hourly token budget -> NUMNUM rejects with RING_TOKEN_BUDGET
        w.brain.advisor.record_tokens("RING_2_OPS", cap, w.clock())
        w.store.put_control(instance_key("sidekick-mumu-1"), {"in_flight": None})
        w.clock.t += timedelta(minutes=2)
        s2 = w.tick()
        self.assertEqual(s2["plans"]["sidekick-mumu-1"], "REJECTED")
        rej = [e for e in w.events("PLAN_REJECTED") if e.get("instance_id") == "sidekick-mumu-1"][-1]
        failed = [c["rule_id"] for c in rej["oversight"]["numnum_checks"] if not c["passed"]]
        self.assertIn("RING_TOKEN_BUDGET", failed)

    def test_bounded_helper_spawning_cap_and_ttl_retirement(self):
        b1 = make_bot("bot_4194_m0", "sidekick-mumu-0", "127.0.0.1:16384", "mumu-account-0", 4194)
        b2 = make_bot("bot_4197_m0", "sidekick-mumu-0", "127.0.0.1:16384", "mumu-account-0", 4197)
        w = World(control_mode="AUTONOMOUS", bots=[b1, b2])
        w.store.put_control("CONFIG", dict(
            DEFAULT_CONFIG,
            capabilities=list(numnum.STAGE6_CAPABILITIES),
            watched_kingdoms=[{"kingdom_id": 4194, "cadence_hours": 3}],
            enable_helpers=True,
        ))
        w.tick()
        spawned = w.events("HELPER_SPAWNED")
        templates = {e["oversight"]["trigger_inputs"]["helper"]["template_id"] for e in spawned}
        self.assertIn("R1_KINGDOM_WATCHER", templates)
        self.assertIn("R2_COHORT_SCHEDULER", templates)

        # Enforce max 3 helpers per ring (RING_1_INTEL already has 1 active)
        h2, ok2 = w.brain.helpers.spawn_helper("R1_KINGDOM_WATCHER", "Watch #4021", kingdom_id=4021)
        h3, ok3 = w.brain.helpers.spawn_helper("R1_LEAD_TRIAGE", "Triage #4198", kingdom_id=4198)
        h4, ok4 = w.brain.helpers.spawn_helper("R1_KINGDOM_WATCHER", "Watch #4044 (4th should block)", kingdom_id=4044)
        self.assertTrue(ok2 and ok3)
        self.assertIsNone(h4)
        self.assertFalse(ok4)

        # Advance clock past helper TTL -> all 3 expired helpers reaped & fresh #4194 surge watcher spawned
        w.clock.t += timedelta(hours=13)
        w.tick()
        self.assertGreaterEqual(len(w.events("HELPER_RETIRED")), 3)
        self.assertEqual(len(w.brain.helpers.active_helpers("RING_1_INTEL")), 1)

    def test_supervised_operator_approval_dispatches_held_provision_and_scan_spawns_analyst(self):
        w = World(control_mode="SUPERVISED", kingdom_last=None)
        w.store.put_control("CONFIG", dict(
            DEFAULT_CONFIG,
            capabilities=list(numnum.STAGE6_CAPABILITIES),
            watched_kingdoms=[{"kingdom_id": 4194, "cadence_hours": 3}],
            enable_helpers=True,
        ))
        w.store.put_account_slots({
            "account_id": "mumu-account-1", "instance_id": "sidekick-mumu-1", "adb_serial": "127.0.0.1:16416",
            "account_status": "HEALTHY", "max_slots_per_kingdom": 2, "kingdom_slots": {"4021": ["bot_4021_m1"]},
        })
        w.brain.declare_bot_lost("bot_4021_m1", "test supervised approval")

        # Tick 1: sidekick-mumu-0 auto-dispatches scan_kingdom (#4194) in SUPERVISED; sidekick-mumu-1 holds provision_character
        s1 = w.tick()
        self.assertEqual(s1["plans"]["sidekick-mumu-0"], "DISPATCHED")
        self.assertEqual(s1["plans"]["sidekick-mumu-1"], "APPROVED_NOT_DISPATCHED")
        scan_job = w.transport.sent[0]
        self.assertEqual(scan_job["job_type"], "scan_kingdom")

        # Operator clicks Approve & Dispatch on bot_4021_rep_4021_m1 -> next tick dispatches in SUPERVISED!
        w.store.put_control("APPROVED_PLANS", {"bot_ids": ["bot_4021_rep_4021_m1"]})
        w.transport.push_result(w.result_for(scan_job, screen="RANKINGS_BOARD", duration_ms=90000))
        s2 = w.tick()
        self.assertEqual(s2["plans"]["sidekick-mumu-1"], "DISPATCHED")
        self.assertEqual(w.store.get_control("APPROVED_PLANS")["bot_ids"], [])
        self.assertTrue(any(
            e["oversight"]["trigger_inputs"]["helper"]["template_id"] == "R3_MIGRATION_ANALYST"
            for e in w.events("HELPER_SPAWNED")
        ))


if __name__ == "__main__":
    unittest.main()
