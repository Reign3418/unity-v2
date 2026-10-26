#!/usr/bin/env python3
"""
ROLLING HOMEROOM & CONVERGENT 1000-RANK SPLICE ORCHESTRATOR
============================================================
Manages the 3 MuMu instances on SIDEKICK (:16384, :16416, :16448):
1. HOMEROOM MODE (Default 90% of the day):
   - Each bot lives in its assigned Homeroom Kingdom (#4197 or #4200), growing, farming,
     training T1 troops, scouting fog/villages, upgrading toward CH16, and tapping Alliance Help.
2. CONVERGENT SPLICED SCAN MODE (Rolling 12h 2x/day schedule, auto-scalable down to 3h Surge):
   - When a kingdom is due for a scan, available bots (1, 2, or all 3) converge on that kingdom,
     splice the 1..1000 leaderboard with randomized slice boundaries under a single shared
     `scanDateOverride` (finishing in ~9 minutes with 3 bots or ~14 minutes with 2 bots),
     and immediately return to their Homeroom Kingdom to resume farming and growing.
"""

import argparse
import json
import os
import random
import subprocess
import sys
import time
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_PATH = os.path.join(SCRIPT_DIR, "homeroom_rolling_schedule.json")

# Default Fleet Topology & Homeroom Assignments on SIDEKICK
FLEET_INSTANCES = [
    {
        "slot": 0,
        "serial": "127.0.0.1:16384",
        "homeroomKd": "4197",
        "supportedKingdoms": ["4197", "4200"],
    },
    {
        "slot": 1,
        "serial": "127.0.0.1:16416",
        "homeroomKd": "4200",
        "supportedKingdoms": ["4200", "4197"],
    },
    {
        "slot": 2,
        "serial": "127.0.0.1:16448",
        "homeroomKd": "4200",
        "supportedKingdoms": ["4200", "4197"],
    },
]


def load_schedule_state(rolling_hours: float = 12.0) -> dict:
    now_ts = time.time()
    default_state = {
        "rollingCadenceHours": rolling_hours,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "instances": {inst["serial"]: {"homeroomKd": inst["homeroomKd"], "currentKd": inst["homeroomKd"], "state": "HOMEROOM_OPS"} for inst in FLEET_INSTANCES},
        "kingdoms": {
            "4197": {
                "kingdom": "4197",
                "cadenceHours": rolling_hours,
                "lastScanEpoch": 0,
                "nextScanEpoch": now_ts,  # Ready immediately if never scanned in current cycle
                "lastSessionId": None,
            },
            "4200": {
                "kingdom": "4200",
                "cadenceHours": rolling_hours,
                "lastScanEpoch": 0,
                "nextScanEpoch": now_ts + 1800,  # Staggered 30m after #4197 so bots rest in Homeroom between splices
                "lastSessionId": None,
            },
        },
    }
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH, "r", encoding="utf-8") as rf:
                loaded = json.load(rf)
            loaded["rollingCadenceHours"] = rolling_hours
            for kd_id, kd_cfg in default_state["kingdoms"].items():
                if kd_id not in loaded.get("kingdoms", {}):
                    loaded.setdefault("kingdoms", {})[kd_id] = kd_cfg
                else:
                    loaded["kingdoms"][kd_id]["cadenceHours"] = rolling_hours
            return loaded
        except Exception:
            pass
    return default_state


def save_schedule_state(state: dict):
    state["updatedAt"] = datetime.now(timezone.utc).isoformat()
    try:
        with open(STATE_PATH, "w", encoding="utf-8") as wf:
            json.dump(state, wf, indent=2)
    except Exception:
        pass


def get_online_adb_serials() -> set:
    adb_candidates = [
        r"C:\Program Files\Netease\MuMuPlayerGlobal-12.0\shell\adb.exe",
        r"C:\Program Files\Netease\MuMuPlayer-12.0\shell\adb.exe",
        "adb",
    ]
    adb_bin = next((p for p in adb_candidates if p == "adb" or os.path.exists(p)), "adb")
    online = set()
    try:
        out = subprocess.check_output([adb_bin, "devices"], text=True, timeout=8)
        for line in out.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and parts[1] == "device":
                online.add(parts[0])
    except Exception:
        pass
    return online


def compute_randomized_slices(num_bots: int, total_ranks: int = 1000) -> list:
    """
    Splits 1..1000 across 1, 2, or 3 converging bots with randomized human slice boundaries
    so no two spliced scans ever divide at static ranks (e.g. 333/666 or 500).
    """
    if num_bots <= 1:
        return [(1, total_ranks)]
    if num_bots == 2:
        cut1 = 500 + random.randint(-24, 24)
        return [(1, cut1), (cut1 + 1, total_ranks)]
    # 3+ bots: 3-way randomized splice (~333 ranks per bot = ~8-10 minutes total wall-clock!)
    cut1 = 333 + random.randint(-19, 19)
    cut2 = 666 + random.randint(-19, 19)
    return [(1, cut1), (cut1 + 1, cut2), (cut2 + 1, total_ranks)]


def switch_bot_to_kingdom(serial: str, target_kd: str, current_kd: str) -> bool:
    if str(target_kd) == str(current_kd):
        return True
    prov_script = os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py")
    if not os.path.exists(prov_script):
        return False
    print(f"  [SWARM ROUTER] Switching {serial} -> Kingdom #{target_kd} ...")
    res = subprocess.run(
        [sys.executable, prov_script, "--mode", "switch", "--kingdom", str(target_kd), "--adb", serial],
        timeout=210,
        check=False,
    )
    return res.returncode == 0


def return_bots_to_homeroom(bots: list, scanned_kd: str, state: dict):
    """Returns each participating bot back to its assigned Homeroom Kingdom after a spliced scan finishes."""
    for bot in bots:
        serial = bot["serial"]
        homeroom_kd = bot["homeroomKd"]
        if str(homeroom_kd) != str(scanned_kd):
            print(f"  [HOMEROOM RETURN] Sending {serial} from #{scanned_kd} back to Homeroom #{homeroom_kd} to resume farming & growth...")
            switch_bot_to_kingdom(serial, homeroom_kd, scanned_kd)
        else:
            print(f"  [HOMEROOM READY] {serial} is already in Homeroom #{homeroom_kd}; resuming 5-Queue living player ops.")
        state.setdefault("instances", {}).setdefault(serial, {})["currentKd"] = homeroom_kd
        state["instances"][serial]["state"] = "HOMEROOM_OPS"
    save_schedule_state(state)


def execute_convergent_spliced_scan(
    target_kd: str,
    unity_url: str,
    scanner_key: str,
    scan_mode: str = "kingdom-scan",
    max_bots: int = 3,
    state: dict = None,
) -> bool:
    """
    Auto-scales 1..3 available bots on SIDEKICK to converge on `target_kd`,
    splices Ranks 1..1000 in parallel under a shared `scanDateOverride`,
    and returns all bots to their Homeroom Kingdom when complete.
    """
    if state is None:
        state = load_schedule_state()

    online_serials = get_online_adb_serials()
    candidate_bots = [
        inst for inst in FLEET_INSTANCES
        if inst["serial"] in online_serials and str(target_kd) in inst["supportedKingdoms"]
    ]
    # Prefer bots whose Homeroom is already `target_kd` first, then scale out with neighbor bots
    candidate_bots.sort(key=lambda b: (0 if str(b["homeroomKd"]) == str(target_kd) else 1, b["slot"]))
    active_bots = candidate_bots[: max(1, min(3, max_bots))]

    if not active_bots:
        print(f"[SPLICE SCHEDULER] No online bots available for Kingdom #{target_kd} (online={list(online_serials)}).")
        return False

    slices = compute_randomized_slices(len(active_bots), total_ranks=1000)
    shared_session_id = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
    scanner_script = os.path.join(SCRIPT_DIR, "unity_autonomous_scanner.py")

    print("================================================================================")
    print(f"  CONVERGENT SPLICED SCAN | KD #{target_kd} | Session: {shared_session_id} | Bots: {len(active_bots)}")
    for idx, (b, (s_rk, e_rk)) in enumerate(zip(active_bots, slices), 1):
        print(f"    -> Bot #{idx} ({b['serial']} | Homeroom #{b['homeroomKd']}): Slice Ranks {s_rk}..{e_rk}")
    print("================================================================================")

    procs = []
    participating_bots = []
    for idx, (bot, (s_rk, e_rk)) in enumerate(zip(active_bots, slices)):
        serial = bot["serial"]
        homeroom_kd = bot["homeroomKd"]
        cur_kd = state.get("instances", {}).get(serial, {}).get("currentKd", homeroom_kd)

        # If bot is in a different kingdom, attempt character switch; if character doesn't exist yet on that bot,
        # auto-scale gracefully using the remaining bots!
        already_in_kd = str(cur_kd) == str(target_kd)
        if not already_in_kd:
            switched = switch_bot_to_kingdom(serial, target_kd, cur_kd)
            if not switched:
                print(f"  [AUTO-SCALE] {serial} does not have an active CH8+ character on #{target_kd} yet; skipping this bot.")
                continue
            already_in_kd = True

        state.setdefault("instances", {}).setdefault(serial, {})["currentKd"] = str(target_kd)
        state["instances"][serial]["state"] = f"SPLICING_KD_{target_kd}_{s_rk}_{e_rk}"
        participating_bots.append(bot)

    if not participating_bots:
        print(f"[SPLICE SCHEDULER] Could not mount any bot onto Kingdom #{target_kd}.")
        return False

    # Recompute exact slices for the verified mounted bots so 1..1000 has 0 gaps!
    verified_slices = compute_randomized_slices(len(participating_bots), total_ranks=1000)
    save_schedule_state(state)

    for bot, (s_rk, e_rk) in zip(participating_bots, verified_slices):
        serial = bot["serial"]
        # Each bot gets a randomized deep-tap ceiling (~285..365 taps inside its own slice)
        slice_deep_limit = s_rk + random.randint(278, 365)
        cmd = [
            sys.executable,
            scanner_script,
            "--mode",
            scan_mode,
            "--adb",
            serial,
            "--kd",
            str(target_kd),
            "--start-rank",
            str(s_rk),
            "--end-rank",
            str(e_rk),
            "--deep-ranks",
            str(slice_deep_limit),
            "--max-duration-sec",
            "960",
            "--scan-date",
            shared_session_id,
            "--unity-url",
            unity_url,
            "--scanner-key",
            scanner_key,
            "--skip-switch",
            "--fresh-slice",
        ]
        log_file = os.path.join(SCRIPT_DIR, f"splice_{serial.split(':')[-1]}_{target_kd}.log")
        lf = open(log_file, "w", encoding="utf-8")
        p = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT)
        procs.append((bot, p, lf, s_rk, e_rk))
        time.sleep(random.uniform(1.8, 3.6))  # Stagger bot launches by 2-3s so RPCs never align on the same millisecond

    # Wait for all slice workers (hard cap 17 minutes)
    t_wait_start = time.time()
    for bot, p, lf, s_rk, e_rk in procs:
        rem_timeout = max(30, int(1020 - (time.time() - t_wait_start)))
        try:
            p.wait(timeout=rem_timeout)
            print(f"  [SPLICE DONE] {bot['serial']} finished Ranks {s_rk}..{e_rk} (exit={p.returncode})")
        except subprocess.TimeoutExpired:
            print(f"  [SPLICE TIMEOUT] Terminating {bot['serial']} slice {s_rk}..{e_rk} after 17m guard.")
            p.kill()
        finally:
            try:
                lf.close()
            except Exception:
                pass

    # Update rolling schedule timestamps (12h default or 3h surge + ±18m human jitter)
    now_epoch = time.time()
    cadence_h = float(state.get("rollingCadenceHours", 12.0) or 12.0)
    jitter_sec = random.randint(-900, 900)  # ±15 min schedule jitter so scans never start at the exact same minute daily
    kd_entry = state.setdefault("kingdoms", {}).setdefault(str(target_kd), {})
    kd_entry["lastScanEpoch"] = now_epoch
    kd_entry["nextScanEpoch"] = now_epoch + (cadence_h * 3600.0) + jitter_sec
    kd_entry["lastSessionId"] = shared_session_id
    save_schedule_state(state)

    # Return bots to their Homeroom Kingdom to resume farming, training, and growing
    return_bots_to_homeroom(participating_bots, str(target_kd), state)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rolling Homeroom & Convergent 1000-Rank Splice Scheduler")
    parser.add_argument("--kd", default=None, help="Run an immediate convergent spliced scan on this Kingdom (e.g. 4197 or 4200)")
    parser.add_argument("--rolling-hours", type=float, default=12.0, help="Rolling schedule interval in hours (default 12h = 2x/day; set 3 for 3h Surge)")
    parser.add_argument("--scan-mode", choices=["kingdom-scan", "seed-sweep"], default="kingdom-scan")
    parser.add_argument("--max-bots", type=int, default=3, help="Max instances to auto-scale into the spliced scan (1..3)")
    parser.add_argument("--unity-url", default=os.environ.get("UNITY_URL", "https://www.ks-unity.com"))
    parser.add_argument("--scanner-key", default=os.environ.get("UNITY_SCANNER_KEY", "unity-local-node2-telemetry"))
    args = parser.parse_args()

    sched_state = load_schedule_state(rolling_hours=args.rolling_hours)
    if args.kd:
        execute_convergent_spliced_scan(
            target_kd=str(args.kd),
            unity_url=args.unity_url,
            scanner_key=args.scanner_key,
            scan_mode=args.scan_mode,
            max_bots=args.max_bots,
            state=sched_state,
        )
    else:
        # Check if any kingdom in the rolling rotation is due for its scheduled spliced scan
        now_ts = time.time()
        due_kds = [
            kd_id for kd_id, cfg in sched_state.get("kingdoms", {}).items()
            if now_ts >= float(cfg.get("nextScanEpoch", 0) or 0)
        ]
        due_kds.sort(key=lambda k: float(sched_state["kingdoms"][k].get("nextScanEpoch", 0) or 0))
        if due_kds:
            next_kd = due_kds[0]
            print(f"[ROLLING SCHEDULER] Kingdom #{next_kd} is due for its {args.rolling_hours}h rolling spliced scan!")
            execute_convergent_spliced_scan(
                target_kd=str(next_kd),
                unity_url=args.unity_url,
                scanner_key=args.scanner_key,
                scan_mode=args.scan_mode,
                max_bots=args.max_bots,
                state=sched_state,
            )
        else:
            print("[ROLLING SCHEDULER] All kingdoms are within their current scan window; bots remain in Homeroom farming/growing.")
