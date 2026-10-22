"""Brain configuration from environment variables (Railway service variables or a local env file)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Mapping, Optional

VALID_MODES = ("OFF", "DRY_RUN", "SUPERVISED", "AUTONOMOUS")


def load_env_file(path: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    p = Path(path)
    if not p.exists():
        return out
    for raw in p.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


@dataclass
class BrainConfig:
    region: str = "us-east-2"
    access_key_id: str = field(default="", repr=False)
    secret_access_key: str = field(default="", repr=False)
    jobs_queue_url: str = ""
    results_queue_url: str = ""
    bots_table: str = "BastionBots"
    events_table: str = "BastionEvents"
    intents_table: str = "BastionIntents"
    slots_table: str = "BastionAccountSlots"
    control_table: str = "BastionControl"
    boot_mode: str = "DRY_RUN"
    tick_seconds: int = 60
    results_wait_seconds: int = 10
    event_dedupe_minutes: int = 60
    event_retention_days: int = 90

    def problems(self) -> List[str]:
        out = []
        for name in ("jobs_queue_url", "results_queue_url"):
            if not getattr(self, name):
                out.append(f"missing setting: {name}")
        if self.boot_mode not in VALID_MODES:
            out.append(f"BRAIN_MODE must be one of {VALID_MODES}, got {self.boot_mode!r}")
        return out

    @classmethod
    def from_env(cls, env: Optional[Mapping[str, str]] = None) -> "BrainConfig":
        e = os.environ if env is None else env
        return cls(
            region=e.get("AWS_REGION", "us-east-2"),
            access_key_id=e.get("AWS_ACCESS_KEY_ID", ""),
            secret_access_key=e.get("AWS_SECRET_ACCESS_KEY", ""),
            jobs_queue_url=e.get("BASTION_JOBS_QUEUE_URL", ""),
            results_queue_url=e.get("BASTION_RESULTS_QUEUE_URL", ""),
            bots_table=e.get("BASTION_BOTS_TABLE", "BastionBots"),
            events_table=e.get("BASTION_EVENTS_TABLE", "BastionEvents"),
            intents_table=e.get("BASTION_INTENTS_TABLE", "BastionIntents"),
            slots_table=e.get("BASTION_ACCOUNT_SLOTS_TABLE", "BastionAccountSlots"),
            control_table=e.get("BASTION_CONTROL_TABLE", "BastionControl"),
            boot_mode=(e.get("BRAIN_MODE") or "DRY_RUN").strip().upper(),
            tick_seconds=int(e.get("BRAIN_TICK_SECONDS", "60")),
        )
