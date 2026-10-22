"""Brain configuration from environment variables (Railway service variables or a local env file)."""

from __future__ import annotations

import os
import socket
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Mapping, Optional

VALID_MODES = ("OFF", "DRY_RUN", "SUPERVISED", "AUTONOMOUS")
VALID_NODE_ROLES = ("PRIMARY", "STANDBY")


def _default_node_id(env: Mapping[str, str]) -> str:
    if env.get("BRAIN_NODE_ID"):
        return env["BRAIN_NODE_ID"].strip()
    if env.get("RAILWAY_ENVIRONMENT") or env.get("RAILWAY_PROJECT_ID") or env.get("RAILWAY_SERVICE_NAME"):
        return (env.get("RAILWAY_SERVICE_NAME") or "railway-primary").strip().lower()
    try:
        return socket.gethostname().strip().lower() or "local-node"
    except Exception:
        return "local-node"


def _default_node_role(env: Mapping[str, str], node_id: str) -> str:
    raw = (env.get("BRAIN_NODE_ROLE") or "").strip().upper()
    if raw in VALID_NODE_ROLES:
        return raw
    if env.get("RAILWAY_ENVIRONMENT") or env.get("RAILWAY_PROJECT_ID") or "railway" in node_id:
        return "PRIMARY"
    return "STANDBY"


def _default_node_priority(env: Mapping[str, str], node_id: str, node_role: str) -> int:
    raw = (env.get("BRAIN_NODE_PRIORITY") or "").strip()
    if raw.isdigit():
        return max(1, min(100, int(raw)))
    if node_role == "PRIMARY" or "railway" in node_id:
        return 1
    if "sidekick" in node_id:
        return 2
    return 3


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
    gemini_api_key: str = field(default="", repr=False)
    node_id: str = "railway-primary"
    node_role: str = "PRIMARY"
    node_priority: int = 1
    lease_ttl_seconds: int = 180

    def problems(self) -> List[str]:
        out = []
        for name in ("jobs_queue_url", "results_queue_url"):
            if not getattr(self, name):
                out.append(f"missing setting: {name}")
        if self.boot_mode not in VALID_MODES:
            out.append(f"BRAIN_MODE must be one of {VALID_MODES}, got {self.boot_mode!r}")
        if self.node_role not in VALID_NODE_ROLES:
            out.append(f"BRAIN_NODE_ROLE must be one of {VALID_NODE_ROLES}, got {self.node_role!r}")
        return out

    @classmethod
    def from_env(cls, env: Optional[Mapping[str, str]] = None) -> "BrainConfig":
        e = os.environ if env is None else env
        node_id = _default_node_id(e)
        node_role = _default_node_role(e, node_id)
        node_priority = _default_node_priority(e, node_id, node_role)
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
            gemini_api_key=e.get("GEMINI_API_KEY") or e.get("GOOGLE_GENERATIVE_AI_API_KEY") or "",
            node_id=node_id,
            node_role=node_role,
            node_priority=node_priority,
            lease_ttl_seconds=int(e.get("BRAIN_LEASE_TTL_SECONDS", "180")),
        )
