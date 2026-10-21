"""I/O adapters for CIPHER. Every external dependency has a real and a fake implementation so the
executor is fully testable without AWS, ADB, or a device."""

from __future__ import annotations

import hashlib
import io
import json
import os
import subprocess
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from .config import APP_PACKAGE, CipherConfig


# --------------------------------------------------------------------------- queue transport

@dataclass
class ReceivedJob:
    receipt: str
    body: str
    message_id: str = ""
    receive_count: int = 1


class SqsTransport:
    """Real transport: jobs FIFO queue in, results queue out."""

    def __init__(self, cfg: CipherConfig):
        import boto3  # imported lazily so tests and --help work without boto3

        self.cfg = cfg
        self.sqs = boto3.client(
            "sqs",
            region_name=cfg.region,
            aws_access_key_id=cfg.access_key_id,
            aws_secret_access_key=cfg.secret_access_key,
        )

    def receive_job(self, wait_seconds: int) -> Optional[ReceivedJob]:
        resp = self.sqs.receive_message(
            QueueUrl=self.cfg.jobs_queue_url,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=wait_seconds,
            VisibilityTimeout=self.cfg.visibility_timeout,
            AttributeNames=["ApproximateReceiveCount"],
        )
        msgs = resp.get("Messages") or []
        if not msgs:
            return None
        m = msgs[0]
        return ReceivedJob(
            receipt=m["ReceiptHandle"],
            body=m["Body"],
            message_id=m.get("MessageId", ""),
            receive_count=int(m.get("Attributes", {}).get("ApproximateReceiveCount", "1")),
        )

    def delete_job(self, job: ReceivedJob) -> None:
        self.sqs.delete_message(QueueUrl=self.cfg.jobs_queue_url, ReceiptHandle=job.receipt)

    def set_visibility(self, job: ReceivedJob, seconds: int) -> None:
        self.sqs.change_message_visibility(
            QueueUrl=self.cfg.jobs_queue_url, ReceiptHandle=job.receipt, VisibilityTimeout=max(0, int(seconds))
        )

    def send_result(self, body: str) -> None:
        self.sqs.send_message(QueueUrl=self.cfg.results_queue_url, MessageBody=body)


class MemoryTransport:
    """In-memory transport for tests and offline dry runs."""

    def __init__(self, bodies: Sequence[str] = ()):
        self.pending: List[ReceivedJob] = [
            ReceivedJob(receipt=f"r{i}", body=b, message_id=f"m{i}") for i, b in enumerate(bodies)
        ]
        self.deleted: List[str] = []
        self.results: List[str] = []
        self.visibility: Dict[str, List[int]] = {}
        self.fail_send = False
        self._lock = threading.Lock()

    def receive_job(self, wait_seconds: int) -> Optional[ReceivedJob]:
        with self._lock:
            return self.pending.pop(0) if self.pending else None

    def delete_job(self, job: ReceivedJob) -> None:
        with self._lock:
            self.deleted.append(job.receipt)

    def set_visibility(self, job: ReceivedJob, seconds: int) -> None:
        with self._lock:
            self.visibility.setdefault(job.receipt, []).append(int(seconds))

    def send_result(self, body: str) -> None:
        if self.fail_send:
            raise RuntimeError("simulated results-queue outage")
        with self._lock:
            self.results.append(body)


# --------------------------------------------------------------------------- evidence

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class S3Evidence:
    def __init__(self, cfg: CipherConfig):
        import boto3

        self.bucket = cfg.evidence_bucket
        self.s3 = boto3.client(
            "s3",
            region_name=cfg.region,
            aws_access_key_id=cfg.access_key_id,
            aws_secret_access_key=cfg.secret_access_key,
        )

    def put_png(self, instance_id: str, job_id: str, png: bytes) -> str:
        key = f"evidence/{instance_id}/{job_id}.png"
        self.s3.put_object(
            Bucket=self.bucket, Key=key, Body=png, ContentType="image/png", ServerSideEncryption="AES256"
        )
        return f"s3://{self.bucket}/{key}"


class MemoryEvidence:
    def __init__(self):
        self.objects: Dict[str, bytes] = {}

    def put_png(self, instance_id: str, job_id: str, png: bytes) -> str:
        uri = f"memory://evidence/{instance_id}/{job_id}.png"
        self.objects[uri] = png
        return uri


# --------------------------------------------------------------------------- ADB

class DeviceOffline(RuntimeError):
    """The emulator is not reachable over adb (powered off, adb dropped, or serial not connected)."""


class Adb:
    """Thin, argv-list-only wrapper around adb (no shell strings built from job data)."""

    def __init__(self, adb_bin: str):
        self.adb_bin = adb_bin

    def _run(self, serial: str, *args: str, timeout: int = 30) -> subprocess.CompletedProcess:
        res = subprocess.run([self.adb_bin, "-s", serial, *args], capture_output=True, timeout=timeout)
        err_text = (res.stderr or b"").decode("utf-8", "replace").lower()
        if res.returncode != 0 and ("not found" in err_text or "offline" in err_text or "no devices" in err_text
                                    or "cannot connect" in err_text):
            raise DeviceOffline(f"{serial} unreachable: {err_text.strip()[:160]}")
        return res

    def screencap_png(self, serial: str) -> bytes:
        res = self._run(serial, "exec-out", "screencap", "-p")
        data = res.stdout or b""
        if not data.startswith(b"\x89PNG"):
            raise RuntimeError(f"screencap failed on {serial}: rc={res.returncode} {res.stderr[:200]!r}")
        return data

    def app_running(self, serial: str) -> bool:
        res = self._run(serial, "shell", "pidof", APP_PACKAGE)
        return bool((res.stdout or b"").strip())

    def force_stop_app(self, serial: str) -> None:
        self._run(serial, "shell", "am", "force-stop", APP_PACKAGE)

    def launch_app(self, serial: str) -> None:
        self._run(serial, "shell", "monkey", "-p", APP_PACKAGE, "-c", "android.intent.category.LAUNCHER", "1")


class FakeAdb:
    def __init__(self, png: bytes = b"\x89PNG-fake", running: bool = True):
        self.png = png
        self.running = running
        self.calls: List[tuple] = []

    def screencap_png(self, serial: str) -> bytes:
        self.calls.append(("screencap", serial))
        return self.png

    def app_running(self, serial: str) -> bool:
        return self.running

    def force_stop_app(self, serial: str) -> None:
        self.calls.append(("force_stop", serial))
        self.running = False

    def launch_app(self, serial: str) -> None:
        self.calls.append(("launch", serial))
        self.running = True


# --------------------------------------------------------------------------- OCR

class RapidOcr:
    """Lazy RapidOCR wrapper; returns [] (never raises) if OCR is unavailable. Thread-safe init."""

    def __init__(self):
        self._engine = None
        self._tried = False
        self._init_lock = threading.Lock()
        self._run_lock = threading.Lock()

    def _ensure_engine(self):
        with self._init_lock:
            if not self._tried:
                try:
                    from rapidocr_onnxruntime import RapidOCR

                    self._engine = RapidOCR()
                except Exception:
                    self._engine = None
                self._tried = True
        return self._engine

    def lines(self, png: bytes) -> List[str]:
        engine = self._ensure_engine()
        if engine is None:
            return []
        try:
            import numpy as np
            from PIL import Image

            arr = np.array(Image.open(io.BytesIO(png)).convert("RGB"))
            with self._run_lock:  # one OCR inference at a time; instances still run their skills in parallel
                res, _ = engine(arr)
            return [str(r[1]).strip() for r in (res or []) if str(r[1]).strip()]
        except Exception:
            return []


class FakeOcr:
    def __init__(self, lines: Sequence[str] = ()):
        self._lines = list(lines)

    def lines(self, png: bytes) -> List[str]:
        return list(self._lines)


# --------------------------------------------------------------------------- script runner / instance guard

@dataclass
class RunOutput:
    returncode: int
    stdout: str
    timed_out: bool = False


class SubprocessRunner:
    """Runs a skill script with an argv list (never a shell string) and a hard timeout."""

    def run(self, argv: Sequence[str], timeout: float, cwd: str) -> RunOutput:
        env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
        proc = subprocess.Popen(
            list(argv), cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace",
        )
        try:
            out, _ = proc.communicate(timeout=max(1.0, timeout))
            return RunOutput(proc.returncode, out or "")
        except subprocess.TimeoutExpired:
            if os.name == "nt":
                subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)
            else:
                proc.kill()
            out, _ = proc.communicate()
            return RunOutput(-1, out or "", timed_out=True)


class FakeRunner:
    def __init__(self, stdout: str = "", returncode: int = 0, timed_out: bool = False):
        self.stdout, self.returncode, self.timed_out = stdout, returncode, timed_out
        self.calls: List[Dict[str, Any]] = []

    def run(self, argv: Sequence[str], timeout: float, cwd: str) -> RunOutput:
        self.calls.append({"argv": list(argv), "timeout": timeout, "cwd": cwd})
        return RunOutput(self.returncode, self.stdout, self.timed_out)


_LEGACY_SCRIPTS = ("unity_autonomous_scanner", "provision_neighbor_kingdom", "bastion_genesis_probe", "auto_tutorial_ch8")


class PowerShellGuard:
    """Detects legacy scripts already driving an emulator so CIPHER never fights over a device."""

    def busy(self, serial: str) -> Optional[str]:
        port = serial.split(":")[-1]
        script = (
            "Get-CimInstance Win32_Process -Filter \"Name = 'python.exe'\" -ErrorAction SilentlyContinue | "
            "Select-Object -ExpandProperty CommandLine"
        )
        try:
            res = subprocess.run(
                ["powershell", "-NoProfile", "-Command", script], capture_output=True, text=True, timeout=15
            )
        except Exception:
            return None
        for line in (res.stdout or "").splitlines():
            if port in line and any(s in line for s in _LEGACY_SCRIPTS):
                return line.strip()[:200]
        return None


class FakeGuard:
    def __init__(self, busy: Optional[str] = None):
        self._busy = busy

    def busy(self, serial: str) -> Optional[str]:
        return self._busy
