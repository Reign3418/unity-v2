"""Seed the brain's starting fleet into DynamoDB (BastionBots + BastionControl FLEET/CONFIG/KINGDOM).

Only characters with records are seeded:
  * bot_4021_m1  Governor236525888 on sidekick-mumu-1 (#4021). CH8 verified by CIPHER grow_city 2026-10-21T23:46:34Z.
  * bot_4194_m0  [Lova]lilfarmer on sidekick-mumu-0 (#4194). CH8 / power from legacy scanner/bastion_state.json roster.
Account slot records are NOT seeded here (Step 5 needs a confirmed per-account character inventory).

    python tools/seed_fleet.py --env-file .env.railway            # refuses to overwrite existing bots
    python tools/seed_fleet.py --env-file .env.railway --force    # overwrite (resets brain-owned state)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from brain.config import BrainConfig, load_env_file  # noqa: E402
from brain.rings import DEFAULT_CONFIG  # noqa: E402
from brain.store import DynamoStore  # noqa: E402
from contracts import validator as V  # noqa: E402

LEGACY_STATE = Path(__file__).resolve().parents[2] / "scanner" / "bastion_state.json"


def profile(start: int, end: int, gather):
    return {
        "timezone": "America/New_York", "sleep_window_start_hour": start, "sleep_window_end_hour": end,
        "max_session_minutes": 60, "min_break_minutes": 30, "daily_active_cap_minutes": 300,
        "active_minutes_today": 0, "target_ch_level": 16, "preferred_gather_types": gather,
    }


def build(legacy: dict):
    roster = {r.get("govId"): r for r in legacy.get("roster", [])}
    lil = roster.get("236264666", {})
    legacy_ts = (legacy.get("lastUpdated") or "2026-10-21T15:11:43Z").replace("+00:00", "Z")
    if "." in legacy_ts:
        legacy_ts = legacy_ts.split(".")[0] + "Z"
    bots = [
        {
            "bot_id": "bot_4021_m1", "account_id": "mumu-account-1", "instance_id": "sidekick-mumu-1",
            "adb_serial": "127.0.0.1:16416", "character_slot": 1, "kingdom_id": 4021,
            "governor_id": "236525888", "governor_name": "Governor236525888", "lifecycle_state": "ACTIVE",
            "verified_state": {"ch_level": 8, "power": 27800, "last_verified_at": "2026-10-21T23:46:34Z",
                               "last_screenshot_uri": "s3://bastion-evidence-379436538341-us-east-2/evidence/sidekick-mumu-1/job_smoke_cd2818640d.png"},
            "routine_profile": profile(1, 8, ["FOOD", "WOOD"]),
            "health": {"consecutive_failures": 0, "ban_suspected": False},
        },
        {
            "bot_id": "bot_4194_m0", "account_id": "mumu-account-0", "instance_id": "sidekick-mumu-0",
            "adb_serial": "127.0.0.1:16384", "character_slot": 1, "kingdom_id": 4194,
            "governor_id": "236264666", "governor_name": lil.get("name", "[Lova]lilfarmer"), "lifecycle_state": "ACTIVE",
            "verified_state": {"ch_level": int(lil.get("chLevel", 8)), "power": int(lil.get("power", 36558)),
                               "last_verified_at": legacy_ts},
            "routine_profile": profile(2, 9, ["STONE", "FOOD"]),
            "health": {"consecutive_failures": 0, "ban_suspected": False},
        },
    ]
    sched = {str(s.get("kingdom")): s for s in legacy.get("kingdomSchedules", [])}
    s4194 = sched.get("4194", {})
    return bots, {
        "FLEET": {"bot_ids": [b["bot_id"] for b in bots],
                  "active_by_instance": {"sidekick-mumu-0": "bot_4194_m0", "sidekick-mumu-1": "bot_4021_m1"}},
        "CONFIG": dict(DEFAULT_CONFIG, watched_kingdoms=[{
            "kingdom_id": 4194, "cadence_hours": float(s4194.get("cadenceHours", 12)),
            "source": f"legacy kingdomSchedules ({s4194.get('mode', 'default')})"}]),
        "KINGDOM#4194": {"last_scan_verified_at": (s4194.get("lastScanAt") or "").split(".")[0] + "Z" if s4194.get("lastScanAt") else None,
                         "source": "legacy bastion_state.json lastScanAt (not AUDIT-verified)"},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--env-file", required=True)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    cfg = BrainConfig.from_env(load_env_file(args.env_file))
    store = DynamoStore(cfg)
    legacy = json.loads(LEGACY_STATE.read_text(encoding="utf-8")) if LEGACY_STATE.exists() else {}
    bots, control = build(legacy)

    existing = store.get_bots([b["bot_id"] for b in bots])
    if existing and not args.force:
        print(f"Refusing to overwrite existing bots {sorted(existing)} (brain-owned state). Use --force.", file=sys.stderr)
        return 1
    for bot in bots:
        V.validate_bot(bot)
        store.put_bot(bot)
        print(f"bot   {bot['bot_id']:<12} {bot['governor_name']:<20} #{bot['kingdom_id']} {bot['instance_id']} CH{bot['verified_state']['ch_level']}")
    for key, item in control.items():
        store.put_control(key, item)
        print(f"ctrl  {key}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
