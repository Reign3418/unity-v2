"""CIPHER executor tests: fully offline (fake queue, device, OCR, script runner)."""

import json
import os
import sys
import tempfile
import threading
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cipher import screen, skills  # noqa: E402
from cipher.adapters import FakeAdb, FakeGuard, FakeOcr, FakeRunner, MemoryEvidence, MemoryTransport, ReceivedJob, RunOutput  # noqa: E402
from cipher.config import CipherConfig, load_settings_file  # noqa: E402
from cipher.executor import Executor, fit_result_size  # noqa: E402
from cipher.ledger import Ledger  # noqa: E402
from contracts import validator as V  # noqa: E402

NOW = datetime(2026, 10, 21, 22, 0, 30, tzinfo=timezone.utc)


def make_job(job_type="probe_status", args=None, **over):
    default_args = {
        "probe_status": {"capture_profile": True, "capture_resources": True},
        "grow_city": {"target_ch_level": 8, "max_steps": 40},
        "sleep": {"duration_minutes": 60, "close_app": True, "reason": "SLEEP_WINDOW"},
        "switch_character": {"target_kingdom_id": 4194, "target_governor_id": "236425783", "target_governor_name": "[Lova]lilfarmer"},
        "provision_character": {"target_kingdom_id": 4021, "account_id": "mumu-account-1", "character_slot": 2, "preferred_civilization": "CHINA"},
        "scan_kingdom": {"target_kingdom_id": 4194, "max_ranks": 300, "boards": ["INDIVIDUAL_POWER"]},
        "gather": {"resource_types": ["FOOD"], "max_marches": 1},
        "locate_governor": {"target_kingdom_id": 4197, "target_governor_id": "236500111", "target_governor_name": "TargetGov"},
        "research": {"branch_preference": "ECONOMY"},
    }
    job = {
        "job_id": "job_test_000001", "idempotency_key": "idem_test_000001", "correlation_id": "corr_test_01",
        "job_type": job_type, "instance_id": "sidekick-mumu-1", "adb_serial": "127.0.0.1:16416",
        "bot_id": "bot_4021_slot1", "kingdom_id": 4021, "priority": 50,
        "issued_by": {"ring": "RING_2_OPS", "leader": "TANK", "numnum_approval_id": "nn_test_approval"},
        "created_at": "2026-10-21T22:00:00Z", "not_before": "2026-10-21T22:00:00Z",
        "deadline": "2026-10-21T23:00:00Z",
        "args": args if args is not None else default_args[job_type],
    }
    job.update(over)
    return job


GROW_OK = "[Step 01] Quest Sidebar\n[Step 02] Green Checkmark -> tap\n[Step 03] TARGET REACHED: City Hall Level 8 confirmed ('city hall level 8')! Exiting.\n"
GROW_PARTIAL = "[Step 01] Idle/Popup -> tap (800, 780)\n[Step 02] Idle/Popup -> tap (800, 780)\n"


class Rig:
    """Wires an Executor to fakes."""

    def __init__(self, bodies=(), runner=None, adb=None, ocr=None, guard=None, dry_run=False, **cfg_over):
        self.tmp = tempfile.TemporaryDirectory()
        self.cfg = CipherConfig(state_dir=Path(self.tmp.name), scanner_dir=Path(r"C:\UnityScanner"),
                                python_exe="python", dry_run=dry_run, **cfg_over)
        self.transport = MemoryTransport([b if isinstance(b, str) else json.dumps(b) for b in bodies])
        self.evidence = MemoryEvidence()
        self.adb = adb or FakeAdb()
        self.runner = runner or FakeRunner(GROW_OK)
        self.logs = []
        self.ledger = Ledger(self.cfg.ledger_path)
        self.ex = Executor(self.cfg, self.transport, self.evidence, self.adb, ocr or FakeOcr(["Kingdom"]),
                           self.runner, guard or FakeGuard(), self.ledger, clock=lambda: NOW,
                           sleeper=lambda s: None, log=self.logs.append)

    def run(self):
        out = []
        while True:
            rj = self.transport.receive_job(0)
            if rj is None:
                return out
            out.append(self.ex.process(rj))

    def results(self):
        return [json.loads(r) for r in self.transport.results]

    def close(self):
        self.tmp.cleanup()


class Base(unittest.TestCase):
    def rig(self, *a, **k):
        r = Rig(*a, **k)
        self.addCleanup(r.close)
        return r


class Parsers(unittest.TestCase):
    def test_grow_output(self):
        p = skills.parse_grow_output(GROW_OK)
        self.assertTrue(p["reached"])
        self.assertEqual([s[0] for s in p["script_steps"]], [1, 2, 3])
        self.assertFalse(skills.parse_grow_output(GROW_PARTIAL)["reached"])
        self.assertFalse(skills.parse_grow_output("City Hall Level 8 mentioned in passing")["reached"])

    def test_ban_detection_is_strict(self):
        self.assertEqual(screen.classify(["Your account has been banned."], True)[0], "BANNED_OR_SUSPENDED")
        self.assertEqual(screen.classify(["Account", "has been", "suspended"], True)[0], "BANNED_OR_SUSPENDED")
        for benign in (["Account Settings"], ["Switch account"], ["Ban Hammer event"], ["Governor236525888"]):
            self.assertNotEqual(screen.classify(benign, True)[0], "BANNED_OR_SUSPENDED", benign)

    def test_closed_app_wins_and_other_states(self):
        self.assertEqual(screen.classify(["account has been banned"], False)[0], "SLEEP_APP_CLOSED")
        self.assertEqual(screen.classify(["Connection lost, reconnect"], True)[0], "NETWORK_DISCONNECTED")
        self.assertEqual(screen.classify(["Please complete the captcha"], True)[0], "VERIFICATION_POPUP")
        self.assertEqual(screen.classify(["hello"], True)[0], "UNKNOWN")

    def test_kingdom_parse_needs_coordinate_bar(self):
        self.assertEqual(screen.parse_kingdom(["#4194 X:123 Y:456"]), 4194)
        self.assertIsNone(screen.parse_kingdom(["Rank #1234 player"]))

    def test_detectors_map_to_states(self):
        class Arr:
            shape = (900, 1600, 3)
        self.assertEqual(screen.classify([], True, Arr(), lambda a: True, lambda a: True)[0], "WORLD_MAP")
        self.assertEqual(screen.classify([], True, Arr(), lambda a: True, lambda a: False)[0], "CITY_VIEW")
        class Small:
            shape = (10, 10, 3)
        self.assertEqual(screen.classify([], True, Small(), lambda a: True, lambda a: True)[0], "UNKNOWN")


class Happy(Base):
    def test_probe_round_trip(self):
        r = self.rig([make_job()], ocr=FakeOcr(["#4021 X:10 Y:20"]))
        self.assertEqual(r.run(), ["SUCCEEDED"])
        res = r.results()[0]
        V.validate_job_result(res, make_job())
        self.assertEqual(res["observed_state"]["kingdom_id"], 4021)
        self.assertEqual(len(res["evidence"]["screenshot_sha256"]), 64)
        self.assertTrue(res["evidence"]["screenshot_uri"].endswith("job_test_000001.png"))
        self.assertEqual(r.transport.deleted, ["r0"])
        self.assertEqual(r.runner.calls, [])  # probe never runs a script

    def test_grow_city_reached(self):
        r = self.rig([make_job("grow_city")])
        self.assertEqual(r.run(), ["SUCCEEDED"])
        res = r.results()[0]
        self.assertEqual(res["observed_state"]["ch_level"], 8)
        argv = r.runner.calls[0]["argv"]
        self.assertEqual(argv[1:], [str(Path(r"C:\UnityScanner") / "auto_tutorial_ch8.py"), "--adb", "127.0.0.1:16416",
                                    "--kingdom", "4021", "--steps", "40"])
        self.assertTrue(any(s["action"] == "skill_log" for s in res["steps_executed"]))

    def test_grow_city_partial_failed_and_timeout(self):
        r = self.rig([make_job("grow_city")], runner=FakeRunner(GROW_PARTIAL))
        self.assertEqual(r.run(), ["PARTIAL"])
        r = self.rig([make_job("grow_city")], runner=FakeRunner("boom\nTraceback", returncode=1))
        self.assertEqual(r.run(), ["FAILED"])
        self.assertTrue(r.results()[0]["error"]["retryable"])
        r = self.rig([make_job("grow_city")], runner=FakeRunner("", returncode=-1, timed_out=True))
        self.assertEqual(r.run(), ["TIMEOUT"])

    def test_grow_city_launches_closed_app(self):
        adb = FakeAdb(running=False)
        r = self.rig([make_job("grow_city")], adb=adb)
        r.run()
        self.assertIn(("launch", "127.0.0.1:16416"), adb.calls)

    def test_sleep_closes_app(self):
        adb = FakeAdb()
        r = self.rig([make_job("sleep")], adb=adb)
        self.assertEqual(r.run(), ["SUCCEEDED"])
        self.assertIn(("force_stop", "127.0.0.1:16416"), adb.calls)
        self.assertEqual(r.results()[0]["observed_state"]["screen_state"], "SLEEP_APP_CLOSED")

    def test_probe_wake_launches_closed_app_only_when_asked(self):
        adb = FakeAdb(running=False)
        r = self.rig([make_job("probe_status", {"launch_if_closed": True})], adb=adb)
        self.assertEqual(r.run(), ["SUCCEEDED"])
        self.assertIn(("launch", "127.0.0.1:16416"), adb.calls)
        adb2 = FakeAdb(running=False)
        r2 = self.rig([make_job("probe_status")], adb=adb2)
        r2.run()
        self.assertNotIn(("launch", "127.0.0.1:16416"), adb2.calls)
        self.assertEqual(r2.results()[0]["observed_state"]["screen_state"], "SLEEP_APP_CLOSED")


class Safety(Base):
    def test_unsupported_ch_never_runs_script(self):
        r = self.rig([make_job("grow_city", {"target_ch_level": 12, "max_steps": 40})])
        self.assertEqual(r.run(), ["FAILED"])
        self.assertEqual(r.results()[0]["error"]["code"], "UNSUPPORTED_ARGS")
        self.assertEqual(r.runner.calls, [])

    def test_unsupported_job_type(self):
        r = self.rig([make_job("research")])
        self.assertEqual(r.run(), ["FAILED"])
        self.assertEqual(r.results()[0]["error"]["code"], "UNSUPPORTED_JOB_TYPE")

    def test_busy_instance_blocks_run(self):
        r = self.rig([make_job("grow_city")], guard=FakeGuard("python auto_tutorial_ch8.py --adb 127.0.0.1:16416"))
        self.assertEqual(r.run(), ["FAILED"])
        self.assertEqual(r.results()[0]["error"]["code"], "INSTANCE_BUSY")
        self.assertEqual(r.runner.calls, [])

    def test_shell_injection_args_rejected_before_anything_runs(self):
        bad = make_job("grow_city", {"target_ch_level": 8, "max_steps": 40, "shell_cmd": "calc.exe"})
        r = self.rig([bad])
        self.assertEqual(r.run(), ["REJECTED"])
        res = r.results()[0]
        self.assertEqual(res["status"], "REJECTED_SCHEMA")
        self.assertEqual(r.runner.calls, [])
        self.assertEqual(r.transport.deleted, ["r0"])

    def test_ring1_job_rejected(self):
        bad = make_job()
        bad["issued_by"] = {"ring": "RING_1_INTEL", "leader": "SCOUT", "numnum_approval_id": "nn_test_approval"}
        r = self.rig([bad])
        self.assertEqual(r.run(), ["REJECTED"])

    def test_poison_messages_released_not_deleted(self):
        r = self.rig(["{not json", json.dumps({"hello": "world"}), json.dumps([1, 2])])
        self.assertEqual(r.run(), ["POISON"] * 3)
        self.assertEqual(r.transport.deleted, [])
        self.assertEqual(r.transport.results, [])
        self.assertTrue(all(v == [0] for v in r.transport.visibility.values()))

    def test_ban_screen_upgrades_status(self):
        r = self.rig([make_job()], ocr=FakeOcr(["Your account has been banned"]))
        self.assertEqual(r.run(), ["ACCOUNT_LOCKED_OR_BANNED"])
        res = r.results()[0]
        self.assertEqual(res["error"]["code"], "ACCOUNT_BANNED_SCREEN")
        self.assertFalse(res["error"]["retryable"])

    def test_skill_exception_is_contained(self):
        class Boom(FakeRunner):
            def run(self, *a, **k):
                raise OSError("disk on fire")
        r = self.rig([make_job("grow_city")], runner=Boom())
        self.assertEqual(r.run(), ["FAILED"])
        self.assertEqual(r.results()[0]["error"]["code"], "INTERNAL_ERROR")
        self.assertEqual(r.transport.deleted, ["r0"])

    def test_offline_device_is_retryable_not_internal_error(self):
        from cipher.adapters import DeviceOffline

        class Offline(FakeAdb):
            def screencap_png(self, serial):
                raise DeviceOffline(f"{serial} unreachable")
            def app_running(self, serial):
                raise DeviceOffline(f"{serial} unreachable")
        r = self.rig([make_job()], adb=Offline())
        self.assertEqual(r.run(), ["FAILED"])
        err = r.results()[0]["error"]
        self.assertEqual((err["code"], err["retryable"]), ("DEVICE_OFFLINE", True))
        self.assertEqual(r.transport.deleted, ["r0"])

    def test_adb_wrapper_maps_unreachable_serial_to_device_offline(self):
        import subprocess
        from unittest import mock
        from cipher.adapters import Adb, DeviceOffline
        fake = subprocess.CompletedProcess([], 1, stdout=b"", stderr=b"error: device '127.0.0.1:16448' not found\r\n")
        with mock.patch("cipher.adapters.subprocess.run", return_value=fake):
            with self.assertRaises(DeviceOffline):
                Adb("adb").screencap_png("127.0.0.1:16448")

    def test_ocr_init_is_thread_safe(self):
        import types
        from cipher.adapters import RapidOcr
        calls = []

        class Engine:
            def __init__(self):
                calls.append(1)
                time.sleep(0.2)
            def __call__(self, arr):
                return ([[None, "ok"]], None)

        mod = types.ModuleType("rapidocr_onnxruntime")
        mod.RapidOCR = Engine
        sys.modules["rapidocr_onnxruntime"] = mod
        try:
            ocr = RapidOcr()
            outs = []
            ts = [threading.Thread(target=lambda: outs.append(ocr._ensure_engine())) for _ in range(3)]
            [t.start() for t in ts]; [t.join() for t in ts]
            self.assertEqual(len(calls), 1)
            self.assertTrue(all(o is not None for o in outs))  # nobody saw a half-initialised engine
        finally:
            del sys.modules["rapidocr_onnxruntime"]

    def test_evidence_failure_does_not_fail_job(self):
        r = self.rig([make_job()])
        r.evidence.put_png = lambda *a: (_ for _ in ()).throw(RuntimeError("s3 down"))
        self.assertEqual(r.run(), ["SUCCEEDED"])
        res = r.results()[0]
        self.assertIsNone(res["evidence"]["screenshot_uri"])
        self.assertEqual(len(res["evidence"]["screenshot_sha256"]), 64)


class Scheduling(Base):
    def test_not_before_in_future_is_deferred(self):
        job = make_job(not_before="2026-10-21T22:10:00Z")
        r = self.rig([job])
        self.assertEqual(r.run(), ["DEFERRED"])
        self.assertEqual(r.transport.deleted, [])
        self.assertEqual(r.transport.visibility["r0"], [571])

    def test_expired_deadline_reports_timeout(self):
        job = make_job(deadline="2026-10-21T22:00:10Z")
        r = self.rig([job])
        self.assertEqual(r.run(), ["EXPIRED"])
        self.assertEqual(r.results()[0]["error"]["code"], "DEADLINE_PASSED")
        self.assertEqual(r.runner.calls, [])

    def test_other_hosts_job_is_bounced(self):
        r = self.rig([make_job()], served_instances=("sidekick-mumu-0",))
        self.assertEqual(r.run(), ["NOT_MINE"])
        self.assertEqual(r.transport.deleted, [])


class Idempotency(Base):
    def test_redelivery_replays_without_rerunning(self):
        r = self.rig([make_job("grow_city"), make_job("grow_city")])
        self.assertEqual(r.run(), ["SUCCEEDED", "REPLAYED"])
        self.assertEqual(len(r.runner.calls), 1)
        a, b = r.results()
        self.assertEqual(a, b)
        self.assertEqual(r.transport.deleted, ["r0", "r1"])

    def test_results_queue_outage_keeps_job_then_recovers(self):
        r = self.rig([make_job("grow_city")])
        r.transport.fail_send = True
        self.assertEqual(r.run(), ["SUCCEEDED"])
        self.assertEqual(r.transport.deleted, [])  # not acknowledged
        self.assertEqual(r.transport.results, [])
        r.transport.fail_send = False
        r.transport.pending.append(ReceivedJob("r9", json.dumps(make_job("grow_city"))))  # SQS redelivery
        self.assertEqual(r.run(), ["REPLAYED"])
        self.assertEqual(len(r.runner.calls), 1)  # device NOT driven twice
        self.assertEqual(len(r.results()), 1)
        self.assertEqual(r.transport.deleted, ["r9"])

    def test_ledger_survives_restart_and_recovers_from_corruption(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "ledger.json"
            Ledger(p).put("k1", {"x": 1})
            self.assertEqual(Ledger(p).get("k1"), {"x": 1})
            p.write_text("{corrupt", encoding="utf-8")
            self.assertIsNone(Ledger(p).get("k1"))

    def test_ledger_prunes_old_entries(self):
        with tempfile.TemporaryDirectory() as d:
            t = [1_000_000.0]
            lg = Ledger(Path(d) / "l.json", clock=lambda: t[0])
            lg.put("old", {"a": 1})
            t[0] += 8 * 24 * 3600
            lg.put("new", {"b": 2})
            self.assertIsNone(lg.get("old"))
            self.assertEqual(lg.get("new"), {"b": 2})


class DryRunAndLimits(Base):
    def test_dry_run_touches_nothing(self):
        adb = FakeAdb()
        r = self.rig([make_job("grow_city")], adb=adb, dry_run=True)
        self.assertEqual(r.run(), ["SUCCEEDED"])
        self.assertEqual(adb.calls, [])
        self.assertEqual(r.runner.calls, [])
        self.assertIsNone(r.ledger.get("idem_test_000001"))
        self.assertTrue(r.results()[0]["evidence"]["metrics"]["dry_run"])

    def test_oversized_result_is_trimmed_under_limit(self):
        r = self.rig([make_job("grow_city")], runner=FakeRunner("\n".join(f"[Step {i:03d}] " + "x" * 400 for i in range(1, 900))))
        r.cfg.max_steps_in_result = 900
        r.ex.ocr = FakeOcr(["line " * 40] * 300)
        r.run()
        self.assertLessEqual(len(r.transport.results[0].encode()), r.cfg.max_result_bytes)
        V.validate_job_result(r.results()[0], make_job("grow_city"))

    def test_fit_result_size_unit(self):
        res = {"steps_executed": [{"step_index": i, "action": "a", "detail": "d" * 200, "timestamp": "t"} for i in range(1, 400)],
               "evidence": {"ocr_lines": ["x" * 300] * 100}}
        fit_result_size(res, 20_000)
        self.assertLessEqual(len(json.dumps(res)), 20_000)
        self.assertEqual([s["step_index"] for s in res["steps_executed"]], list(range(1, len(res["steps_executed"]) + 1)))


class Heartbeat(Base):
    def test_long_job_extends_visibility(self):
        class Slow(FakeRunner):
            def run(self, argv, timeout, cwd):
                time.sleep(0.35)
                return RunOutput(0, GROW_OK)
        r = self.rig([make_job("grow_city")], runner=Slow(), heartbeat_seconds=0.1)
        r.run()
        self.assertGreaterEqual(len(r.transport.visibility.get("r0", [])), 2)
        self.assertTrue(all(v == r.cfg.visibility_timeout for v in r.transport.visibility["r0"]))


class Concurrency(Base):
    def test_run_once_handles_each_instance_in_parallel(self):
        starts = []

        class Track(FakeRunner):
            def run(self, argv, timeout, cwd):
                starts.append((argv[argv.index("--adb") + 1], time.time()))
                time.sleep(0.3)
                return RunOutput(0, GROW_OK)

        jobs = []
        for n, (inst, serial) in enumerate(V.INSTANCE_TO_ADB.items()):
            jobs.append(make_job("grow_city", instance_id=inst, adb_serial=serial,
                                 job_id=f"job_par_00000{n}", idempotency_key=f"idem_par_0000{n}", bot_id=f"bot_par_000{n}"))
        r = self.rig(jobs, runner=Track())
        self.assertEqual(r.ex.run_once(), 3)
        self.assertEqual(len(r.results()), 3)
        # All three skills must have been in flight together (sequential starts would be >= 0.3s apart).
        self.assertEqual(len({s for s, _ in starts}), 3)
        self.assertLess(max(t for _, t in starts) - min(t for _, t in starts), 0.25)


class Config(unittest.TestCase):
    def test_settings_file_env_override_and_secret_hidden(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / ".creds"
            p.write_text("# c\nAWS_ACCESS_KEY_ID = AKIAFILE\nAWS_SECRET_ACCESS_KEY=\"s3cr3t\"\nBASTION_JOBS_QUEUE_URL=https://q/jobs\n"
                         "BASTION_RESULTS_QUEUE_URL=https://q/res\nBASTION_EVIDENCE_BUCKET=b\n", encoding="utf-8")
            self.assertEqual(load_settings_file(str(p))["AWS_SECRET_ACCESS_KEY"], "s3cr3t")
            cfg = CipherConfig.load(str(p), env={"AWS_ACCESS_KEY_ID": "AKIAENV"})
            self.assertEqual(cfg.access_key_id, "AKIAENV")
            self.assertEqual(cfg.problems(), [])
            self.assertNotIn("s3cr3t", repr(cfg))
            self.assertNotIn("AKIAENV", repr(cfg))

    def test_missing_settings_reported(self):
        cfg = CipherConfig.load(r"Z:\nope", env={})
        self.assertIn("missing setting: access_key_id", cfg.problems())


class Step5Skills(Base):
    def test_switch_character_succeeded_and_not_found(self):
        sw_ok = "[1/6] Opening Governor Profile\n[5/6] Switching to #4194\nActive on Kingdom #4194\n"
        r = self.rig([make_job("switch_character")], runner=FakeRunner(sw_ok))
        self.assertEqual(r.run(), ["SUCCEEDED"])
        res = r.results()[0]
        V.validate_job_result(res, make_job("switch_character"))
        self.assertEqual(res["observed_state"]["kingdom_id"], 4194)
        self.assertEqual(res["observed_state"]["governor_id"], "236425783")

        sw_miss = "[3/6] Searching Character Roster\nCharacter for #4194 not found in roster\n"
        r2 = self.rig([make_job("switch_character")], runner=FakeRunner(sw_miss))
        self.assertEqual(r2.run(), ["FAILED"])
        self.assertEqual(r2.results()[0]["error"]["code"], "CHARACTER_NOT_FOUND")
        self.assertFalse(r2.results()[0]["error"]["retryable"])

    def test_provision_character_succeeded_and_tutorial_partial(self):
        prov_ok = "[1/6] Opening Profile\n[4/6] Confirming Character Creation\n[DONE] Provisioned #4021 character (Governor236999111, ID=236999111).\n"
        r = self.rig([make_job("provision_character")], runner=FakeRunner(prov_ok))
        self.assertEqual(r.run(), ["SUCCEEDED"])
        res = r.results()[0]
        V.validate_job_result(res, make_job("provision_character"))
        self.assertEqual((res["observed_state"]["governor_id"], res["observed_state"]["ch_level"]), ("236999111", 2))

        prov_part = "[6/6] Running tutorial\n[WARN] Governor Profile was not accessible to extract live ID. Character tutorial may still be in progress.\n"
        r2 = self.rig([make_job("provision_character")], runner=FakeRunner(prov_part))
        self.assertEqual(r2.run(), ["PARTIAL"])
        self.assertEqual(r2.results()[0]["observed_state"]["screen_state"], "TUTORIAL_OVERLAY")

    def test_scan_kingdom_skill(self):
        scan_out = "Synced 300 accumulated #4194 governors (@ Rank 300/300).\n#4194 scan completed!\n"
        r = self.rig([make_job("scan_kingdom")], runner=FakeRunner(scan_out))
        self.assertEqual(r.run(), ["SUCCEEDED"])
        res = r.results()[0]
        V.validate_job_result(res, make_job("scan_kingdom"))
        self.assertEqual(res["observed_state"]["screen_state"], "RANKINGS_BOARD")
        self.assertEqual(res["evidence"]["metrics"]["governors_extracted"], 300)

    def test_gather_and_locate_governor_and_grow_timer_parsing(self):
        gather_out = "[VALHEON FORGE] March successfully dispatched to resource node!\n[VALHEON FORGE] Verified City HUD active.\n"
        r_g = self.rig([make_job("gather")], runner=FakeRunner(gather_out))
        self.assertEqual(r_g.run(), ["SUCCEEDED"])
        res_g = r_g.results()[0]
        V.validate_job_result(res_g, make_job("gather"))
        self.assertTrue(res_g["evidence"]["metrics"]["march_dispatched"])

        loc_out = "Synced 300 accumulated #4197 governors (@ Rank 300/300).\n#4197 scan completed!\n"
        r_l = self.rig([make_job("locate_governor")], runner=FakeRunner(loc_out))
        self.assertEqual(r_l.run(), ["SUCCEEDED"])
        res_l = r_l.results()[0]
        V.validate_job_result(res_l, make_job("locate_governor"))
        self.assertEqual(res_l["evidence"]["metrics"]["governors_extracted"], 300)

        grow_timer_out = '[Step 05] [TIMER_ACTIVE] seconds=720 building="city hall level 4"\n[Step 06] [TIMER_HANDOFF] seconds=720 farmed=True\n'
        parsed_g = skills.parse_grow_output(grow_timer_out)
        self.assertEqual(parsed_g["timer_seconds"], 720)
        self.assertEqual(parsed_g["timer_building"], "city hall level 4")
        self.assertTrue(parsed_g["farmed"])


if __name__ == "__main__":
    unittest.main()
