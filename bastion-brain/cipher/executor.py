"""CIPHER executor: receive -> validate -> dedupe -> run typed skill -> evidence -> validated result -> send -> delete.

Delivery guarantees:
  * A job is deleted only after its result was durably handed to the results queue.
  * The result is written to the local ledger *before* sending, so a crash between send and delete
    replays the stored result on redelivery instead of driving the device a second time.
  * Malformed jobs are released immediately so SQS moves them to the DLQ after 3 receives (alarm) rather
    than blocking an emulator's FIFO group for 30 minutes per attempt.
"""

from __future__ import annotations

import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from contracts import validator as V
from contracts.validator import ContractValidationError as CVE

from .adapters import DeviceOffline, ReceivedJob, sha256_hex
from .config import CipherConfig
from .ledger import Ledger
from .skills import SKILLS, SkillContext, SkillOutcome, err

OBSERVED_OPTIONAL = ("governor_id", "governor_name", "ch_level", "power", "kill_points", "action_points", "gems", "resources")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ts(value: str) -> datetime:
    ts = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def normalize_observed(obs: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {"kingdom_id": obs.get("kingdom_id"), "screen_state": obs.get("screen_state", "UNKNOWN")}
    for key in OBSERVED_OPTIONAL:
        if obs.get(key) is not None:
            out[key] = obs[key]
    return out


def fit_result_size(result: Dict[str, Any], max_bytes: int) -> Dict[str, Any]:
    """Keeps the result under the SQS limit by trimming steps and OCR lines (never identity or status)."""
    def size() -> int:
        return len(json.dumps(result).encode("utf-8"))

    result["evidence"]["ocr_lines"] = [l[:120] for l in result["evidence"]["ocr_lines"][:60]]
    for step in result["steps_executed"]:
        step["detail"] = step["detail"][:200]
    while size() > max_bytes and len(result["steps_executed"]) > 10:
        steps = result["steps_executed"]
        result["steps_executed"] = steps[:5] + steps[-(len(steps) // 2):]
    while size() > max_bytes and result["evidence"]["ocr_lines"]:
        result["evidence"]["ocr_lines"] = result["evidence"]["ocr_lines"][: len(result["evidence"]["ocr_lines"]) // 2]
    for i, step in enumerate(result["steps_executed"], start=1):
        step["step_index"] = i
    return result


class Executor:
    def __init__(self, cfg: CipherConfig, transport, evidence, adb, ocr, runner, guard, ledger: Ledger,
                 detectors=(None, None), clock=utcnow, sleeper=time.sleep, log=None):
        self.cfg, self.transport, self.evidence = cfg, transport, evidence
        self.adb, self.ocr, self.runner, self.guard = adb, ocr, runner, guard
        self.ledger, self.detectors, self.clock, self.sleeper = ledger, detectors, clock, sleeper
        self._log = log
        self._locks = {i: threading.Lock() for i in cfg.served_instances}
        self._log_lock = threading.Lock()

    # ------------------------------------------------------------------ logging
    def log(self, event: str, **fields: Any) -> None:
        record = {"ts": iso(self.clock()), "event": event, **fields}
        line = json.dumps(record, default=str)
        with self._log_lock:
            if self._log is not None:
                self._log(line)
            else:
                print(line, file=sys.stdout, flush=True)
                try:
                    self.cfg.state_dir.mkdir(parents=True, exist_ok=True)
                    with open(self.cfg.log_path, "a", encoding="utf-8") as fh:
                        fh.write(line + "\n")
                except OSError:
                    pass

    # ------------------------------------------------------------------ result building
    def build_result(self, job: Dict[str, Any], status: str, started: datetime, completed: datetime,
                     observed: Dict[str, Any], steps, evidence: Dict[str, Any], error: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "job_id": job["job_id"],
            "idempotency_key": job["idempotency_key"],
            "correlation_id": job["correlation_id"],
            "job_type": job["job_type"],
            "instance_id": job["instance_id"],
            "bot_id": job["bot_id"],
            "kingdom_id": job["kingdom_id"],
            "status": status,
            "started_at": iso(started),
            "completed_at": iso(completed),
            "duration_ms": max(0, int((completed - started).total_seconds() * 1000)),
            "observed_state": normalize_observed(observed),
            "steps_executed": list(steps),
            "evidence": evidence,
            "error": error,
        }

    @staticmethod
    def empty_evidence(metrics: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return {"screenshot_uri": None, "screenshot_sha256": None, "ocr_lines": [], "metrics": metrics or {}}

    def immediate_result(self, job: Dict[str, Any], status: str, error: Dict[str, Any], note: str) -> Dict[str, Any]:
        now = self.clock()
        step = {"step_index": 1, "action": "cipher_gate", "detail": note[:200], "timestamp": iso(now)}
        return self.build_result(job, status, now, now, {"screen_state": "UNKNOWN", "kingdom_id": None},
                                 [step], self.empty_evidence(), error)

    # ------------------------------------------------------------------ message handling
    def process(self, rj: ReceivedJob) -> str:
        """Handles one received message. Returns an outcome label (used by tests and the log)."""
        try:
            job = json.loads(rj.body)
            if not isinstance(job, dict):
                raise ValueError("job body is not an object")
        except ValueError:
            return self._poison(rj, "UNPARSEABLE_JSON", {})

        try:
            V.validate_job(job)
        except CVE as exc:
            try:
                result = self.immediate_result(job, "REJECTED_SCHEMA", err("SCHEMA_INVALID", str(exc), False), "job failed contract validation")
                V.validate_job_result(result)
            except Exception:
                return self._poison(rj, f"INVALID_AND_UNIDENTIFIABLE: {exc}", job)
            self.log("job_rejected_schema", job_id=job.get("job_id"), reason=str(exc)[:300])
            self._finish(rj, result)
            return "REJECTED"

        ids = {"job_id": job["job_id"], "correlation_id": job["correlation_id"],
               "instance_id": job["instance_id"], "bot_id": job["bot_id"], "job_type": job["job_type"]}

        if job["instance_id"] not in self.cfg.served_instances:
            self.transport.set_visibility(rj, 60)
            self.log("job_not_for_this_host", **ids)
            return "NOT_MINE"

        cached = self.ledger.get(job["idempotency_key"])
        if cached is not None:
            self.log("job_replayed_from_ledger", **ids)
            self._send_and_delete(rj, cached)
            return "REPLAYED"

        now = self.clock()
        not_before = parse_ts(job["not_before"])
        if not_before > now:
            wait = min(int((not_before - now).total_seconds()) + 1, 900)
            self.transport.set_visibility(rj, wait)
            self.log("job_deferred", wait_seconds=wait, **ids)
            return "DEFERRED"

        if parse_ts(job["deadline"]) <= now:
            result = self.immediate_result(job, "TIMEOUT", err("DEADLINE_PASSED", "deadline passed before CIPHER started the job", False), "expired before start")
            self.log("job_expired", **ids)
            self._finish(rj, result)
            return "EXPIRED"

        with self._locks[job["instance_id"]]:
            result = self._execute(job, rj, ids)
        self._finish(rj, result)
        return result["status"]

    def _poison(self, rj: ReceivedJob, reason: str, job: Dict[str, Any]) -> str:
        self.log("job_poison_released", reason=reason[:300], receive_count=rj.receive_count, message_id=rj.message_id)
        try:
            self.transport.set_visibility(rj, 0)
        except Exception as exc:  # pragma: no cover
            self.log("release_failed", error=str(exc)[:200])
        return "POISON"

    # ------------------------------------------------------------------ execution
    def _heartbeat(self, rj: ReceivedJob, stop: threading.Event) -> None:
        while not stop.wait(self.cfg.heartbeat_seconds):
            try:
                self.transport.set_visibility(rj, self.cfg.visibility_timeout)
            except Exception as exc:
                self.log("heartbeat_failed", error=str(exc)[:200])

    def _execute(self, job: Dict[str, Any], rj: ReceivedJob, ids: Dict[str, Any]) -> Dict[str, Any]:
        started = self.clock()
        deadline = parse_ts(job["deadline"])
        ctx = SkillContext(job, self.cfg, self.adb, self.ocr, self.runner, self.guard, deadline,
                           self.clock, self.sleeper, self.detectors)
        self.log("job_started", dry_run=self.cfg.dry_run, **ids)

        stop = threading.Event()
        hb = threading.Thread(target=self._heartbeat, args=(rj, stop), daemon=True)
        hb.start()
        try:
            if self.cfg.dry_run:
                ctx.step("dry_run", f"Would run skill '{job['job_type']}' on {job['adb_serial']}; no device actions taken")
                outcome = SkillOutcome("SUCCEEDED", {"screen_state": "UNKNOWN", "kingdom_id": None}, metrics={"dry_run": True})
            elif job["job_type"] not in SKILLS:
                outcome = SkillOutcome("FAILED", error=err("UNSUPPORTED_JOB_TYPE", f"{job['job_type']} is not implemented in CIPHER yet", False))
            else:
                outcome = SKILLS[job["job_type"]](ctx)
        except DeviceOffline as exc:
            self.log("device_offline", error=str(exc)[:300], **ids)
            outcome = SkillOutcome("FAILED", error=err("DEVICE_OFFLINE", str(exc), True))
        except Exception as exc:
            self.log("skill_exception", error=f"{type(exc).__name__}: {exc}"[:300], **ids)
            outcome = SkillOutcome("FAILED", error=err("INTERNAL_ERROR", f"{type(exc).__name__}: {exc}", False))
        finally:
            stop.set()

        evidence = self._collect_evidence(job, ctx, outcome)
        capture = ctx.last_capture
        if capture is not None and capture.screen_state == "BANNED_OR_SUSPENDED" and outcome.status != "ACCOUNT_LOCKED_OR_BANNED":
            outcome.status = "ACCOUNT_LOCKED_OR_BANNED"
            outcome.error = err("ACCOUNT_BANNED_SCREEN", f"Ban/suspension text detected: '{capture.matched_phrase}'", False)
        if capture is not None:
            outcome.observed.setdefault("screen_state", capture.screen_state)
            if outcome.observed.get("kingdom_id") is None and capture.kingdom_id is not None:
                outcome.observed["kingdom_id"] = capture.kingdom_id

        completed = self.clock()
        result = self.build_result(job, outcome.status, started, completed, outcome.observed, ctx.steps, evidence, outcome.error)
        result = fit_result_size(result, self.cfg.max_result_bytes)
        try:
            V.validate_job_result(result, job)
        except CVE as exc:
            self.log("result_invalid_internal", reason=str(exc)[:300], **ids)
            result = self.build_result(job, "FAILED", started, completed, {"screen_state": "UNKNOWN", "kingdom_id": None},
                                       ctx.steps[:5], self.empty_evidence(),
                                       err("RESULT_CONTRACT_VIOLATION", str(exc), False))
            V.validate_job_result(result, job)
        self.log("job_finished", status=result["status"], duration_ms=result["duration_ms"], **ids)
        return result

    def _collect_evidence(self, job: Dict[str, Any], ctx: SkillContext, outcome: SkillOutcome) -> Dict[str, Any]:
        metrics = dict(outcome.metrics)
        if self.cfg.dry_run:
            return self.empty_evidence(metrics)
        if ctx.last_capture is None or job["job_type"] != "probe_status":
            try:
                ctx.capture()
            except Exception as exc:
                ctx.step("evidence_capture_failed", f"{type(exc).__name__}: {exc}")
                return self.empty_evidence(metrics)
        cap = ctx.last_capture
        uri = None
        try:
            uri = self.evidence.put_png(job["instance_id"], job["job_id"], cap.png)
        except Exception as exc:
            ctx.step("evidence_upload_failed", f"{type(exc).__name__}: {exc}")
        return {"screenshot_uri": uri, "screenshot_sha256": sha256_hex(cap.png), "ocr_lines": cap.lines, "metrics": metrics}

    # ------------------------------------------------------------------ delivery
    def _finish(self, rj: ReceivedJob, result: Dict[str, Any]) -> None:
        if not self.cfg.dry_run:
            self.ledger.put(result["idempotency_key"], result)
        self._send_and_delete(rj, result)

    def _send_and_delete(self, rj: ReceivedJob, result: Dict[str, Any]) -> None:
        try:
            self.transport.send_result(json.dumps(result))
        except Exception as exc:
            self.log("result_send_failed", job_id=result.get("job_id"), error=f"{type(exc).__name__}: {exc}"[:300])
            return  # job stays queued; redelivery replays the ledger entry
        try:
            self.transport.delete_job(rj)
        except Exception as exc:
            self.log("job_delete_failed", job_id=result.get("job_id"), error=str(exc)[:300])

    # ------------------------------------------------------------------ loops
    def _safe_process(self, rj: ReceivedJob) -> None:
        try:
            self.process(rj)
        except Exception as exc:
            self.log("process_crashed", error=f"{type(exc).__name__}: {exc}"[:300], message_id=rj.message_id)
            try:
                self.transport.set_visibility(rj, 0)
            except Exception:
                pass

    def run_once(self) -> int:
        """Drains whatever is currently receivable, then returns the number of messages handled."""
        handled = 0
        with ThreadPoolExecutor(max_workers=len(self.cfg.served_instances)) as pool:
            futures = []
            while True:
                rj = self.transport.receive_job(self.cfg.poll_wait_seconds if handled == 0 else 1)
                if rj is None:
                    break
                handled += 1
                futures.append(pool.submit(self._safe_process, rj))
            for f in futures:
                f.result()
        return handled

    def run_forever(self, stop: threading.Event) -> None:
        self.log("cipher_started", instances=list(self.cfg.served_instances), dry_run=self.cfg.dry_run)
        backoff = 2
        with ThreadPoolExecutor(max_workers=len(self.cfg.served_instances)) as pool:
            while not stop.is_set():
                try:
                    rj = self.transport.receive_job(self.cfg.poll_wait_seconds)
                    backoff = 2
                except Exception as exc:
                    self.log("receive_failed", error=f"{type(exc).__name__}: {exc}"[:300], retry_in=backoff)
                    stop.wait(backoff)
                    backoff = min(backoff * 2, 60)
                    continue
                if rj is not None:
                    pool.submit(self._safe_process, rj)
        self.log("cipher_stopped")
