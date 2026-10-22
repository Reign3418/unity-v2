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


if __name__ == "__main__":
    unittest.main()
