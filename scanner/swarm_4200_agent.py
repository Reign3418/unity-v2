"""
================================================================================
KINGDOM #4200 FAST INTERLEAVED DUAL-BOT AGENT (:16416 & :16448)
File: E:\\Unity\\scanner\\swarm_4200_agent.py
================================================================================
Leaves :16384 in #4197 100% untouched while driving :16416 and :16448 in #4200
with zero ONNX CPU contention:
  - Dedicated background 5-second WebP frame streamer keeps both :16416 and :16448
    updating live on the main dashboard every 5 seconds continuously.
  - Interleaves fast 20-25s micro-turns between :16416 (Governor236827905) and
    :16448 (Governor236827941) so both accounts move continuously without spawning
    competing RapidOCR processes.
  - Calibrated for Kingdom #4200's New Tutorial City Layout ('Build' anchor at
    (905, 175), Barracks (1215, 300), Stable (315, 650), Scout Camp (1390, 210)).
  - Triggers Full Top-300 Individual Power Leaderboard Scan (--mode kingdom-scan
    --kd 4200) the instant City Hall Level 8 unlocks Rankings.
================================================================================
"""

import io
import os
import socket
import subprocess
import sys
import threading
import time
import numpy as np
from PIL import Image

os.environ["OMP_NUM_THREADS"] = "2"
os.environ["MKL_NUM_THREADS"] = "2"
os.environ["OPENBLAS_NUM_THREADS"] = "2"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import swarm_4197_orchestrator as core
from solo_4197_agent import claim_completed_quests, merge_ground_truth_with_queue_badges

TARGET_KD = "4200"

# ==============================================================================
# LILITH INTERNAL ALLIANCE LOG OPCODE DICTIONARY (101 - 308) & SUB-TILE FORMULA
# ==============================================================================
ALLIANCE_LOG_OPCODES = {
    101: "JOINED_ALLIANCE",
    102: "LEFT_ALLIANCE",
    103: "PROMOTED_OR_DEMOTED_RANK",
    104: "APPOINTED_OFFICER",
    105: "TRANSFERRED_R5_LEADERSHIP",
    106: "KICKED_FROM_ALLIANCE",
    201: "ATTACKED_ALLIANCE_MEMBER_CITY",
    202: "SCOUTED_ALLIANCE_MEMBER_CITY",
    203: "LAUNCHED_RALLY",
    204: "CANCELLED_RALLY",
    205: "ATTACKED_ALLIANCE_BUILDING",
    206: "REINFORCED_ALLIANCE_STRUCTURE",
    207: "LOST_ALLIANCE_FLAG_OR_FORT",
    301: "BUILT_ALLIANCE_FORTRESS",
    302: "BUILT_ALLIANCE_FLAG",
    303: "DEMOLISHED_ALLIANCE_BUILDING",
    304: "RESEARCHED_ALLIANCE_TECHNOLOGY",
    305: "CLAIMED_HOLY_SITE_OR_PASS",
    306: "ACTIVATED_ALLIANCE_SKILL",
    307: "DONATED_TO_ALLIANCE_TREASURY",
    308: "UPDATED_ALLIANCE_MARKER",
}


def convert_subtile_to_map_coords(raw_x: float, raw_y: float) -> dict:
    """Converts Lilith raw mailcache sub-tile coordinates to standard RoK World Map (X, Y) coordinates."""
    return {
        "x": int(float(raw_x or 0) / 6.0 + 0.5),
        "y": int(float(raw_y or 0) / 6.0 + 0.5),
    }


def calculate_alliance_activity_score(forts: int = 0, helps: int = 0, tech_pts: int = 0, build_mins: int = 0) -> int:
    """Computes the composite Alliance Activity Score (Forts*10 + Helps*1 + Tech/1000 + Build/1000)."""
    return int(forts * 10 + helps * 1 + round(tech_pts / 1000.0) + round(build_mins / 1000.0))


INSTANCES_4200 = [
    {
        "port": "16416",
        "adb": "127.0.0.1:16416",
        "id": "sidekick-mumu-1",
        "label": "INSTANCE 02 (BRAVO · #4200)",
        "defaultGovId": "236827905",
        "defaultGovName": "Governor236827905",
        "camouflagePersona": "R5_FARM",
        "camouflageAlias": "ValkyrieBank",
        "camouflageAvatar": "SunTzu_GoldenHarvest_Frame",
        "camouflageBio": "R5 Resource Bank // DM main before trading",
    },
    {
        "port": "16448",
        "adb": "127.0.0.1:16448",
        "id": "sidekick-mumu-2",
        "id_tag": "CHARLIE_FARM",
        "label": "INSTANCE 03 (CHARLIE · #4200)",
        "defaultGovId": "236827941",
        "defaultGovName": "Governor236827941",
        "camouflagePersona": "R5_FARM",
        "camouflageAlias": "ClayVault",
        "camouflageAvatar": "JoanOfArc_Gatherer_Avatar",
        "camouflageBio": "Stone & Gold Farm // Auto-Help Active",
    },
]

_FULL_LEADERBOARD_SCAN_DONE = False
_STATE_LOCK = threading.Lock()


def _live_5s_preview_daemon(state: dict):
    """Lightweight background thread (ZERO OCR) that grabs 800x450 WebP frames every 5s for both :16416 and :16448."""
    while True:
        time.sleep(4.8)
        for inst in INSTANCES_4200:
            p = inst["port"]
            adb = inst["adb"]
            try:
                res = subprocess.run(
                    [core.ADB_PATH, "-s", adb, "exec-out", "screencap", "-p"],
                    capture_output=True,
                    timeout=6,
                )
                if res.returncode == 0 and res.stdout and len(res.stdout) > 5000:
                    arr = np.array(Image.open(io.BytesIO(res.stdout)).convert("RGB"))
                    b64 = core.make_thumbnail_b64(arr)
                    with _STATE_LOCK:
                        ist = state["instances"][p]
                        ist["screenPreviewB64"] = b64
                        ist["updatedAt"] = core.utc_now_iso()
                        core._LAST_LIVE_PREVIEW_SYNC[p] = time.time()
            except Exception:
                pass
        try:
            with _STATE_LOCK:
                core.save_and_sync_blackbox(state)
        except Exception:
            pass


def run_full_4200_leaderboard_scan(state: dict, inst: dict):
    """Runs the full Top-300 Individual Power Leaderboard scan on #4200 once CH8 unlocks Rankings."""
    global _FULL_LEADERBOARD_SCAN_DONE
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    scanner_py = os.path.join(SCRIPT_DIR, "unity_autonomous_scanner.py")
    if not os.path.exists(scanner_py):
        return

    ist["status"] = "ROSTER_AUDIT"
    ist["currentTask"] = f"FAST DATA SCAN: Extracting Kingdom #{TARGET_KD} Top-300 Power Leaderboard on :{port}!"
    core.append_movement(
        state,
        port,
        "PROVISION_4197",
        f"Started Kingdom #{TARGET_KD} Top-300 Leaderboard Scan on :{port} ({ist.get('governorName')})",
        {"kingdom": TARGET_KD, "port": port},
    )
    core.save_and_sync_blackbox(state)

    try:
        proc = subprocess.run(
            [
                sys.executable,
                "-u",
                scanner_py,
                "--mode",
                "kingdom-scan",
                "--adb",
                adb,
                "--kd",
                TARGET_KD,
                "--end-rank",
                "300",
                "--skip-switch",
            ],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=900,
        )
        if proc.returncode == 0:
            _FULL_LEADERBOARD_SCAN_DONE = True
    except Exception as e_sc:
        print(f"[4200 Full Leaderboard Scan Warn] {e_sc}")


def _prep_inst_meta(state: dict, inst: dict):
    port = inst["port"]
    ist = state["instances"][port]
    ist["label"] = inst["label"]
    ist["kingdom"] = TARGET_KD
    ist["verifiedIn4197"] = True
    ist["verifiedIn4200"] = True
    if not ist.get("governorId") or str(ist.get("governorId")) == "None":
        ist["governorId"] = inst["defaultGovId"]
    if not ist.get("governorName") or str(ist.get("governorName")) == "None":
        ist["governorName"] = inst["defaultGovName"]
    ist["camouflagePersona"] = inst.get("camouflagePersona", "R5_FARM")
    ist["camouflageAlias"] = inst.get("camouflageAlias", "ValkyrieBank")
    ist["camouflageAvatar"] = inst.get("camouflageAvatar", "SunTzu_GoldenHarvest_Frame")
    ist["camouflageBio"] = inst.get("camouflageBio", "R5 Resource Bank")
    ist["allianceActivityScore"] = calculate_alliance_activity_score(
        forts=int(ist.get("allianceForts") or 12),
        helps=int(ist.get("allianceHelps") or 420),
        tech_pts=int(ist.get("allianceTechPts") or 58000),
        build_mins=int(ist.get("allianceBuildMins") or 24000),
    )
    if not isinstance(ist.get("coordinates"), dict):
        ist["coordinates"] = {"kingdom": TARGET_KD, "x": 0, "y": 0}
    else:
        ist["coordinates"]["kingdom"] = TARGET_KD
    return ist


def main():
    _lock_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        _lock_sock.bind(("127.0.0.1", 44200))
    except OSError:
        print("[Swarm4200] Another swarm_4200_agent is already holding lock 44200. Exiting.")
        return

    core.TARGET_KINGDOM = TARGET_KD
    core._OWNED_PORTS = {"16416", "16448"}

    state = core.load_blackbox()
    for inst in INSTANCES_4200:
        ist = _prep_inst_meta(state, inst)
        ist["status"] = "ACTIVE_IN_4197"
        ist["sleepStatus"] = f"AWAKE (#{TARGET_KD} 5-QUEUE LOOP)"
        ist["currentTask"] = f"Kingdom #{TARGET_KD} Active // {ist.get('governorName')} · 5-Queue Living Loop"
    core.save_and_sync_blackbox(state)

    # Start lightweight 5-second WebP preview daemon thread for both :16416 and :16448
    t_prev = threading.Thread(target=_live_5s_preview_daemon, args=(state,), daemon=True)
    t_prev.start()

    # Clear modals & capture initial HUD stats on both #4200 instances
    for inst in INSTANCES_4200:
        p = inst["port"]
        adb = inst["adb"]
        core.ensure_adb(adb)
        core.ensure_rok_foreground(adb)
        a0 = core.close_modals_to_hud(adb, p)
        if a0 is not None:
            ist = state["instances"][p]
            ist["screenPreviewB64"] = core.make_thumbnail_b64(a0)
            ist["rssBags"] = core.merge_rss_bar(ist.get("rssBags"), a0)
            pwr = core.parse_hud_power(a0)
            if pwr > 0:
                ist["power"] = pwr
            core.save_and_sync_blackbox(state)

    # Interleaved fast micro-turns so BOTH :16416 and :16448 move every 20-25 seconds!
    for cycle_idx in range(999999):
        # Micro-Turn A: Fast Quest Claim + 10-Step City Builder Burst on :16416, then :16448
        for inst in INSTANCES_4200:
            port = inst["port"]
            adb = inst["adb"]
            ist = _prep_inst_meta(state, inst)
            core.ensure_adb(adb)
            core.ensure_rok_foreground(adb)
            ch_now = int(ist.get("cityHallLevel") or 0)
            if ch_now >= 8:
                claim_completed_quests(state, inst)
            b_steps = 10 if ch_now < 8 else 6
            core.run_city_builder_burst(state, inst, steps_count=b_steps)
            if int(ist.get("cityHallLevel") or 0) >= 8:
                claim_completed_quests(state, inst)
            ist["status"] = "ACTIVE_IN_4197"
            ist["sleepStatus"] = f"AWAKE (#{TARGET_KD} 5-QUEUE LOOP)"
            ist["currentTask"] = (
                f"Kingdom #{TARGET_KD} Active // {ist.get('governorName')} · "
                f"Power {int(ist.get('power') or 0):,} · CH{ist.get('cityHallLevel') or 6} · 5-Queue Loop"
            )
            core.save_and_sync_blackbox(state)
            if not _FULL_LEADERBOARD_SCAN_DONE and int(ist.get("cityHallLevel") or 0) >= 8:
                run_full_4200_leaderboard_scan(state, inst)

        # While rushing to CH8 for Leaderboard Scan, stay focused on fast CH8 builder bursts (run farming/training every 6th cycle)
        all_ch8 = all(int(state["instances"][i["port"]].get("cityHallLevel") or 0) >= 8 for i in INSTANCES_4200)
        if not all_ch8 and (cycle_idx % 6 != 5):
            continue

        # Micro-Turn B: T1 Training + Scouting on :16416, then :16448
        for inst in INSTANCES_4200:
            port = inst["port"]
            adb = inst["adb"]
            ist = _prep_inst_meta(state, inst)
            core.run_t1_only_training(state, inst, cycle_idx)
            merge_ground_truth_with_queue_badges(ist)
            core.save_and_sync_blackbox(state)
            core.run_scouting_and_villages(state, inst, cycle_idx)

        # Micro-Turn C: Deficit-Aware Resource Gathering + Threat Check on :16416, then :16448
        for inst in INSTANCES_4200:
            port = inst["port"]
            adb = inst["adb"]
            ist = _prep_inst_meta(state, inst)
            a_chk = core.close_modals_to_hud(adb, port)
            if a_chk is not None and core.has_world_map_unlocked(a_chk):
                core.run_resource_farming(state, inst, cycle_idx)
            core.run_blackbox_threat_check(state, inst)
            if cycle_idx % 2 == 1:
                core.audit_bot_ground_truth_stats(state, inst)
                merge_ground_truth_with_queue_badges(ist)
            ist["status"] = "ACTIVE_IN_4197"
            ist["sleepStatus"] = f"AWAKE (#{TARGET_KD} 5-QUEUE LOOP)"
            ist["currentTask"] = (
                f"Kingdom #{TARGET_KD} Active // {ist.get('governorName')} · "
                f"Power {int(ist.get('power') or 0):,} · CH{ist.get('cityHallLevel') or 6} · 5-Queue Loop"
            )
            ist["updatedAt"] = core.utc_now_iso()
            core.save_and_sync_blackbox(state)
        time.sleep(3.0)


if __name__ == "__main__":
    main()
