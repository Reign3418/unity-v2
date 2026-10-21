"""CIPHER configuration. Secrets live in a gitignored settings file on SIDEKICK and are never logged."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Mapping, Optional, Tuple

APP_PACKAGE = "com.lilithgame.roc.gp"
ALL_INSTANCES: Tuple[str, ...] = ("sidekick-mumu-0", "sidekick-mumu-1", "sidekick-mumu-2")
DEFAULT_SETTINGS_FILE = r"C:\UnityScanner\.bastion_aws_credentials"

_ENV_KEYS = (
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "BASTION_JOBS_QUEUE_URL",
    "BASTION_RESULTS_QUEUE_URL",
    "BASTION_EVIDENCE_BUCKET",
)


def load_settings_file(path: str) -> Dict[str, str]:
    """Parses KEY=VALUE lines (# comments and blank lines ignored, optional quotes)."""
    out: Dict[str, str] = {}
    p = Path(path)
    if not p.exists():
        return out
    for raw in p.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


@dataclass
class CipherConfig:
    jobs_queue_url: str = ""
    results_queue_url: str = ""
    evidence_bucket: str = ""
    region: str = "us-east-2"
    access_key_id: str = field(default="", repr=False)
    secret_access_key: str = field(default="", repr=False)

    scanner_dir: Path = Path(r"C:\UnityScanner")
    python_exe: str = sys.executable
    adb_bin: str = ""
    state_dir: Path = Path(r"C:\UnityScanner\cipher_state")
    served_instances: Tuple[str, ...] = ALL_INSTANCES

    visibility_timeout: int = 1800
    heartbeat_seconds: int = 300
    poll_wait_seconds: int = 20
    max_result_bytes: int = 200_000
    max_steps_in_result: int = 120
    dry_run: bool = False

    @property
    def ledger_path(self) -> Path:
        return self.state_dir / "idempotency_ledger.json"

    @property
    def log_path(self) -> Path:
        return self.state_dir / "cipher.log.jsonl"

    def resolved_adb(self) -> str:
        if self.adb_bin:
            return self.adb_bin
        bundled = self.scanner_dir / "platform-tools" / "adb.exe"
        return str(bundled) if bundled.exists() else "adb"

    def problems(self, need_aws: bool = True) -> List[str]:
        out: List[str] = []
        if need_aws:
            for name in ("jobs_queue_url", "results_queue_url", "evidence_bucket", "access_key_id", "secret_access_key"):
                if not getattr(self, name):
                    out.append(f"missing setting: {name}")
        return out

    @classmethod
    def load(cls, settings_path: Optional[str] = None, env: Optional[Mapping[str, str]] = None, **overrides) -> "CipherConfig":
        env = os.environ if env is None else env
        merged: Dict[str, str] = load_settings_file(settings_path or DEFAULT_SETTINGS_FILE)
        for key in _ENV_KEYS:  # environment wins over file
            if env.get(key):
                merged[key] = env[key]
        cfg = cls(
            jobs_queue_url=merged.get("BASTION_JOBS_QUEUE_URL", ""),
            results_queue_url=merged.get("BASTION_RESULTS_QUEUE_URL", ""),
            evidence_bucket=merged.get("BASTION_EVIDENCE_BUCKET", ""),
            region=merged.get("AWS_REGION", "us-east-2"),
            access_key_id=merged.get("AWS_ACCESS_KEY_ID", ""),
            secret_access_key=merged.get("AWS_SECRET_ACCESS_KEY", ""),
        )
        for k, v in overrides.items():
            setattr(cfg, k, v)
        return cfg
