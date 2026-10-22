"""Seed the brain's verified fleet + account slot pool into DynamoDB (BastionBots, BastionAccountSlots, BastionControl).

Discovered from SIDEKICK Character Management OCR & CIPHER live evidence:
  * mumu-account-0 (sidekick-mumu-0 / 127.0.0.1:16384): 8 characters across 7 kingdoms (#4194 x2, #4197, #4196, #4044, #4193, #4195, #4202)
  * mumu-account-1 (sidekick-mumu-1 / 127.0.0.1:16416): 7 tracked characters across 7 kingdoms (#4021, #4198, #4194, #3707, #3155, #3477, #3218)
  * mumu-account-2 (sidekick-mumu-2 / 127.0.0.1:16448): Standby reserve account (LOGGED_OUT until sidekick-mumu-2 is launched)

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


def make_bot(
    bot_id: str,
    account_id: str,
    instance_id: str,
    adb_serial: str,
    character_slot: int,
    kingdom_id: int,
    governor_id: str | None,
    governor_name: str,
    ch_level: int,
    power: int,
    last_verified_at: str,
    sleep_hours: tuple[int, int] = (1, 8),
    gather: list[str] | None = None,
    alliance_tag: str | None = None,
    screenshot_uri: str | None = None,
    lifecycle_state: str | None = None,
) -> dict:
    verified = {
        "ch_level": ch_level,
        "power": power,
        "last_verified_at": last_verified_at,
    }
    if alliance_tag:
        verified["alliance_tag"] = alliance_tag
    if screenshot_uri:
        verified["last_screenshot_uri"] = screenshot_uri
    return {
        "bot_id": bot_id,
        "account_id": account_id,
        "instance_id": instance_id,
        "adb_serial": adb_serial,
        "character_slot": character_slot,
        "kingdom_id": kingdom_id,
        "governor_id": governor_id,
        "governor_name": governor_name,
        "lifecycle_state": lifecycle_state or ("ACTIVE" if ch_level >= 8 else "GROWING"),
        "verified_state": verified,
        "routine_profile": profile(sleep_hours[0], sleep_hours[1], gather or ["FOOD", "WOOD"]),
        "health": {"consecutive_failures": 0, "ban_suspected": False},
    }


def build(legacy: dict):
    roster = {r.get("govId"): r for r in legacy.get("roster", [])}
    lil = roster.get("236264666", {})
    legacy_ts = (legacy.get("lastUpdated") or "2026-10-21T15:11:43Z").replace("+00:00", "Z")
    if "." in legacy_ts:
        legacy_ts = legacy_ts.split(".")[0] + "Z"

    bots = [
        # --- mumu-account-0 (sidekick-mumu-0 / 127.0.0.1:16384): 8 characters across 7 kingdoms ---
        make_bot(
            bot_id="bot_4194_m0", account_id="mumu-account-0", instance_id="sidekick-mumu-0",
            adb_serial="127.0.0.1:16384", character_slot=1, kingdom_id=4194,
            governor_id="236425783", governor_name=lil.get("name", "[Lova]lilfarmer"),
            ch_level=int(lil.get("chLevel", 8)), power=max(int(lil.get("power", 36558)), 38987),
            last_verified_at="2026-10-22T00:18:52Z", sleep_hours=(2, 9), gather=["STONE", "FOOD"],
            alliance_tag="Lova",
            screenshot_uri="s3://bastion-evidence-379436538341-us-east-2/evidence/sidekick-mumu-0/job_smoke_328a07103c.png",
            lifecycle_state="ACTIVE",
        ),
        make_bot(
            bot_id="bot_4194_m0_s2", account_id="mumu-account-0", instance_id="sidekick-mumu-0",
            adb_serial="127.0.0.1:16384", character_slot=2, kingdom_id=4194,
            governor_id="236449685", governor_name="Governor236449685",
            ch_level=3, power=4880, last_verified_at=legacy_ts, sleep_hours=(2, 9), gather=["FOOD", "WOOD"],
        ),
        make_bot(
            bot_id="bot_4197_m0", account_id="mumu-account-0", instance_id="sidekick-mumu-0",
            adb_serial="127.0.0.1:16384", character_slot=1, kingdom_id=4197,
            governor_id="236483513", governor_name="[Vx97]Governor236483513",
            ch_level=4, power=14245, last_verified_at=legacy_ts, sleep_hours=(2, 9), gather=["WOOD", "STONE"],
            alliance_tag="Vx97",
        ),
        make_bot(
            bot_id="bot_4196_m0", account_id="mumu-account-0", instance_id="sidekick-mumu-0",
            adb_serial="127.0.0.1:16384", character_slot=1, kingdom_id=4196,
            governor_id="236459441", governor_name="Governor236459441",
            ch_level=2, power=4292, last_verified_at=legacy_ts, sleep_hours=(2, 9),
        ),
        make_bot(
            bot_id="bot_4044_m0", account_id="mumu-account-0", instance_id="sidekick-mumu-0",
            adb_serial="127.0.0.1:16384", character_slot=1, kingdom_id=4044,
            governor_id="236465943", governor_name="Governor236465943",
            ch_level=2, power=4287, last_verified_at=legacy_ts, sleep_hours=(2, 9),
        ),
        make_bot(
            bot_id="bot_4193_m0", account_id="mumu-account-0", instance_id="sidekick-mumu-0",
            adb_serial="127.0.0.1:16384", character_slot=1, kingdom_id=4193,
            governor_id="236455452", governor_name="Governor236455452",
            ch_level=2, power=4287, last_verified_at=legacy_ts, sleep_hours=(2, 9),
        ),
        make_bot(
            bot_id="bot_4195_m0", account_id="mumu-account-0", instance_id="sidekick-mumu-0",
            adb_serial="127.0.0.1:16384", character_slot=1, kingdom_id=4195,
            governor_id="236457194", governor_name="Governor236457194",
            ch_level=2, power=1047, last_verified_at=legacy_ts, sleep_hours=(2, 9),
        ),
        make_bot(
            bot_id="bot_4202_m0", account_id="mumu-account-0", instance_id="sidekick-mumu-0",
            adb_serial="127.0.0.1:16384", character_slot=1, kingdom_id=4202,
            governor_id="236434540", governor_name="Governor236434540",
            ch_level=2, power=1647, last_verified_at=legacy_ts, sleep_hours=(2, 9),
        ),

        # --- mumu-account-1 (sidekick-mumu-1 / 127.0.0.1:16416): 7 tracked characters across 7 kingdoms ---
        make_bot(
            bot_id="bot_4021_m1", account_id="mumu-account-1", instance_id="sidekick-mumu-1",
            adb_serial="127.0.0.1:16416", character_slot=1, kingdom_id=4021,
            governor_id="236525888", governor_name="Governor236525888",
            ch_level=8, power=27800, last_verified_at="2026-10-21T23:46:34Z",
            sleep_hours=(1, 8), gather=["FOOD", "WOOD"],
            screenshot_uri="s3://bastion-evidence-379436538341-us-east-2/evidence/sidekick-mumu-1/job_smoke_cd2818640d.png",
            lifecycle_state="ACTIVE",
        ),
        make_bot(
            bot_id="bot_4198_m1", account_id="mumu-account-1", instance_id="sidekick-mumu-1",
            adb_serial="127.0.0.1:16416", character_slot=1, kingdom_id=4198,
            governor_id="236482768", governor_name="[DTRK]Governor236482768",
            ch_level=4, power=15485, last_verified_at=legacy_ts, sleep_hours=(1, 8),
            alliance_tag="DTRK",
        ),
        make_bot(
            bot_id="bot_4194_m1", account_id="mumu-account-1", instance_id="sidekick-mumu-1",
            adb_serial="127.0.0.1:16416", character_slot=1, kingdom_id=4194,
            governor_id=None, governor_name="Governor (4194 M1)",
            ch_level=4, power=9163, last_verified_at=legacy_ts, sleep_hours=(1, 8),
        ),
        make_bot(
            bot_id="bot_3707_m1", account_id="mumu-account-1", instance_id="sidekick-mumu-1",
            adb_serial="127.0.0.1:16416", character_slot=1, kingdom_id=3707,
            governor_id="196853283", governor_name="Governor196853283",
            ch_level=8, power=357279, last_verified_at=legacy_ts, sleep_hours=(1, 8),
        ),
        make_bot(
            bot_id="bot_3155_m1", account_id="mumu-account-1", instance_id="sidekick-mumu-1",
            adb_serial="127.0.0.1:16416", character_slot=1, kingdom_id=3155,
            governor_id="158522372", governor_name="Governor158522372",
            ch_level=8, power=305774, last_verified_at=legacy_ts, sleep_hours=(1, 8),
        ),
        make_bot(
            bot_id="bot_3477_m1", account_id="mumu-account-1", instance_id="sidekick-mumu-1",
            adb_serial="127.0.0.1:16416", character_slot=1, kingdom_id=3477,
            governor_id="182194875", governor_name="[tcHo]Governor182194875",
            ch_level=8, power=215393, last_verified_at=legacy_ts, sleep_hours=(1, 8),
            alliance_tag="tcHo",
        ),
        make_bot(
            bot_id="bot_3218_m1", account_id="mumu-account-1", instance_id="sidekick-mumu-1",
            adb_serial="127.0.0.1:16416", character_slot=1, kingdom_id=3218,
            governor_id="160123358", governor_name="Governor160123358",
            ch_level=8, power=61384, last_verified_at=legacy_ts, sleep_hours=(1, 8),
        ),
    ]

    slots_by_account: dict[str, dict[str, list[str]]] = {
        "mumu-account-0": {},
        "mumu-account-1": {},
        "mumu-account-2": {},
    }
    for b in bots:
        kd_key = str(b["kingdom_id"])
        slots_by_account[b["account_id"]].setdefault(kd_key, []).append(b["bot_id"])

    account_slots = [
        {
            "account_id": "mumu-account-0",
            "instance_id": "sidekick-mumu-0",
            "adb_serial": "127.0.0.1:16384",
            "account_status": "HEALTHY",
            "max_slots_per_kingdom": 2,
            "kingdom_slots": slots_by_account["mumu-account-0"],
        },
        {
            "account_id": "mumu-account-1",
            "instance_id": "sidekick-mumu-1",
            "adb_serial": "127.0.0.1:16416",
            "account_status": "HEALTHY",
            "max_slots_per_kingdom": 2,
            "kingdom_slots": slots_by_account["mumu-account-1"],
        },
        {
            "account_id": "mumu-account-2",
            "instance_id": "sidekick-mumu-2",
            "adb_serial": "127.0.0.1:16448",
            "account_status": "LOGGED_OUT",
            "max_slots_per_kingdom": 2,
            "kingdom_slots": slots_by_account["mumu-account-2"],
        },
    ]

    sched = {str(s.get("kingdom")): s for s in legacy.get("kingdomSchedules", [])}
    watched = [
        {"kingdom_id": 4194, "cadence_hours": float(sched.get("4194", {}).get("cadenceHours", 3)), "source": "SURGE_3H (#4194 Primary Anchor)"},
        {"kingdom_id": 4021, "cadence_hours": 12.0, "source": "STEADY_12H (#4021 CH8 Anchor)"},
        {"kingdom_id": 4197, "cadence_hours": 12.0, "source": "STEADY_12H (#4197 Belerion)"},
        {"kingdom_id": 4198, "cadence_hours": 12.0, "source": "STEADY_12H (#4198 Scheria)"},
        {"kingdom_id": 4193, "cadence_hours": 12.0, "source": "STEADY_12H (#4193 Zanoni)"},
        {"kingdom_id": 4195, "cadence_hours": 12.0, "source": "STEADY_12H (#4195 Biarmia)"},
        {"kingdom_id": 4196, "cadence_hours": 12.0, "source": "STEADY_12H (#4196 Skuld)"},
        {"kingdom_id": 4044, "cadence_hours": 12.0, "source": "STEADY_12H (#4044 Kaismann)"},
        {"kingdom_id": 4202, "cadence_hours": 12.0, "source": "GENESIS_BASELINE (#4202 Vanaheim)"},
    ]
    control = {
        "FLEET": {
            "bot_ids": [b["bot_id"] for b in bots],
            "active_by_instance": {
                "sidekick-mumu-0": "bot_4194_m0",
                "sidekick-mumu-1": "bot_4021_m1",
            },
            "account_ids": [a["account_id"] for a in account_slots],
        },
        "CONFIG": dict(DEFAULT_CONFIG, watched_kingdoms=watched),
    }
    for w in watched:
        kd_str = str(w["kingdom_id"])
        s_entry = sched.get(kd_str, {})
        last_scan = (s_entry.get("lastScanAt") or "").split(".")[0] + "Z" if s_entry.get("lastScanAt") else None
        control[f"KINGDOM#{kd_str}"] = {
            "last_scan_verified_at": last_scan,
            "source": w["source"],
        }
    return bots, account_slots, control


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--env-file", required=True)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    cfg = BrainConfig.from_env(load_env_file(args.env_file))
    store = DynamoStore(cfg)
    legacy = json.loads(LEGACY_STATE.read_text(encoding="utf-8")) if LEGACY_STATE.exists() else {}
    bots, account_slots, control = build(legacy)

    existing = store.get_bots([b["bot_id"] for b in bots])
    if existing and not args.force:
        print(f"Refusing to overwrite existing bots {sorted(existing)} (brain-owned state). Use --force.", file=sys.stderr)
        return 1
    for bot in bots:
        V.validate_bot(bot)
        store.put_bot(bot)
        print(f"bot   {bot['bot_id']:<15} {bot['governor_name']:<24} #{bot['kingdom_id']} {bot['instance_id']} CH{bot['verified_state']['ch_level']}")
    for slot in account_slots:
        V.validate_account_slot_record(slot)
        store.put_account_slots(slot)
        total_chars = sum(len(v) for v in slot["kingdom_slots"].values())
        print(f"slot  {slot['account_id']:<15} {slot['instance_id']:<16} status={slot['account_status']:<12} kingdoms={len(slot['kingdom_slots'])} chars={total_chars}")
    for key, item in control.items():
        store.put_control(key, item)
        print(f"ctrl  {key}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
