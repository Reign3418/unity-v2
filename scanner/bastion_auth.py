"""
Shared auth headers for SIDEKICK -> Vercel /api/bastion calls.

The secret is read from the BASTION_AGENT_SECRET environment variable, or from a
`.bastion_agent_secret` file next to this script (never committed; see .gitignore).
It must match the BASTION_AGENT_SECRET env var configured in Vercel.
"""

import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SECRET_FILE = os.path.join(_SCRIPT_DIR, ".bastion_agent_secret")


def load_agent_secret() -> str:
    secret = os.environ.get("BASTION_AGENT_SECRET", "").strip()
    if not secret and os.path.exists(_SECRET_FILE):
        try:
            with open(_SECRET_FILE, "r", encoding="utf-8") as f:
                secret = f.read().strip()
        except Exception:
            secret = ""
    return secret


def bastion_headers(user_agent: str) -> dict:
    headers = {"Content-Type": "application/json", "User-Agent": user_agent}
    secret = load_agent_secret()
    if secret:
        headers["Authorization"] = f"Bearer {secret}"
    else:
        print("[BASTION AUTH] WARNING: no BASTION_AGENT_SECRET found; cloud API will reject this request.")
    return headers
