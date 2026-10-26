"""
================================================================================
KINGDOM #4197 SOLO FLAGSHIP AGENT (:16384 — Governor236483513)
File: E:\\Unity\\scanner\\solo_4197_agent.py
================================================================================
Purpose-built, cooldown-aware single-governor autonomous loop for :16384 in #4197:
  - Parks :16416 and :16448 so 100% of SIDEKICK CPU/RAM and ADB bandwidth
    serves :16384 (Governor236483513, Egypt layout, CH 8 -> CH 16).
  - Executes the 5-Queue Living Player Loop on a tight ~2.5-minute cadence:
      1. Military Training (Strict T1 ONLY across Barracks, Archery Range, Stable, Siege Workshop)
      2. Active Scouting (Scout Camp Explore -> Fog, Tribal Villages, Mysterious Caves)
      3. Smart Multi-March Gathering (Skips redundant World Map search when 2/2 marches are active)
      4. City Builder Burst (6-step CH 8 -> CH 16 progression + Alliance Help 1162,796)
      5. Optical Threat Recon & Ground-Truth Audit (Synced to 4197_blackbox.json & BastionControl)
================================================================================
"""

import argparse
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import swarm_4197_orchestrator as core

SOLO_INST = {
    "port": "16384",
    "adb": "127.0.0.1:16384",
    "id": "sidekick-mumu-0",
    "label": "FlagshipSolo-0",
}

PARKED_PORTS = ["16416", "16448"]


def mark_parked_instances(state: dict):
    """Syncs :16416 and :16448 from disk so :16384 (#4197) and :16416/:16448 (#4200) coexist cleanly without overwriting each other."""
    disk_st = core.load_blackbox()
    disk_insts = (disk_st or {}).get("instances") or {}
    for p in PARKED_PORTS:
        if p in disk_insts and disk_insts[p].get("status") != "PARKED":
            state["instances"][p] = disk_insts[p]
        elif p in state.get("instances", {}) and state["instances"][p].get("status") == "PARKED":
            pist = state["instances"][p]
            pist["currentTask"] = "Spinning up for Kingdom #4200 Recon & 5-Queue Loop..."


def merge_ground_truth_with_queue_badges(ist: dict):
    """
    Preserves '(Active Queue)' or '(Training T1 Batch)' status badges alongside
    verified ground-truth unit counts so the telemetry UI shows both verified count and queue state.
    """
    tr_info = ist.get("currentTraining") or {}
    gt = ist.get("groundTruth") or {}
    u_map = gt.get("unitsByType") or {}
    if sum(u_map.values()) <= 0:
        return

    labels = [
        ("infantry", "T1 Infantry", u_map.get("infantry", 0)),
        ("archer", "T1 Archer", u_map.get("archer", 0)),
        ("cavalry", "T1 Cavalry", u_map.get("cavalry", 0)),
        ("siege", "T1 Siege", u_map.get("siege", 0)),
    ]
    for key, prefix, count in labels:
        prev_val = str(tr_info.get(key, ""))
        badge = ""
        if "(Training T1 Batch)" in prev_val:
            badge = " (Training T1 Batch)"
        elif "(Active Queue)" in prev_val:
            badge = " (Active Queue)"
        tr_info[key] = f"{prefix}: {count:,}{badge}"
    ist["currentTraining"] = tr_info


_EMPTY_QUEST_COOLDOWN_UNTIL: dict[str, float] = {}
_BONUS_CLAIM_COOLDOWN_UNTIL: dict[str, float] = {"16416": time.time() + 600.0, "16448": time.time() + 600.0}


def claim_completed_quests(state: dict, inst: dict):
    """
    Checks the CH8+ left Quest Scroll icon (28, 290) or #4200's (38, 320) for a notification badge,
    opens the Quests modal, claims batches of green CLAIM buttons on both the Quests tab and Daily Objectives tab,
    and claims Daily Activity chests before closing cleanly.
    """
    import numpy as np

    port = inst["port"]
    adb = inst["adb"]
    a = core.close_modals_to_hud(adb, port)
    if a is None:
        return

    # Tap Alliance Help handshake bubble at (1164, 744) or (1164, 810) if visible above bottom bar
    help_bub = a[718:772, 1135:1192]
    help_bub_lo = a[780:838, 1135:1192]
    if float(help_bub.mean()) > 175.0:
        core.tap(adb, 1164, 744, 0.45)
        a = core.close_modals_to_hud(adb, port)
        if a is None:
            return
    elif float(help_bub_lo.mean()) > 165.0:
        core.tap(adb, 1164, 810, 0.45)
        a = core.close_modals_to_hud(adb, port)
        if a is None:
            return
    if float(a[710:768, 1320:1380].mean()) > 175.0:
        core.tap(adb, 1350, 740, 0.45)
        a = core.close_modals_to_hud(adb, port)
        if a is None:
            return

    # Once every 10 minutes, claim VIP daily points + free VIP chest and System Mail rewards
    if time.time() >= _BONUS_CLAIM_COOLDOWN_UNTIL.get(port, 0.0):
        _BONUS_CLAIM_COOLDOWN_UNTIL[port] = time.time() + 600.0
        vip_bdg = a[48:82, 132:178]
        vip_red = int(((vip_bdg[:, :, 0] >= 175) & (vip_bdg[:, :, 1] <= 65) & (vip_bdg[:, :, 2] <= 65)).sum())
        if vip_red >= 18:
            core.tap(adb, 125, 85, 1.4)
            core.tap(adb, 1260, 225, 1.4)
            core.tap(adb, 800, 750, 0.8)
            core.tap(adb, 1145, 495, 1.2)
            core.tap(adb, 800, 750, 0.8)
            core.tap(adb, 1520, 500, 0.8)
            a = core.close_modals_to_hud(adb, port)
            if a is None:
                return
        mail_bdg = a[785:835, 1410:1465]
        mail_red = int(((mail_bdg[:, :, 0] >= 175) & (mail_bdg[:, :, 1] <= 65) & (mail_bdg[:, :, 2] <= 65)).sum())
        if mail_red >= 18:
            core.tap(adb, 1405, 845, 1.4)
            core.tap(adb, 710, 58, 1.0)
            core.tap(adb, 145, 845, 0.9)
            core.tap(adb, 800, 750, 0.8)
            core.tap(adb, 1540, 48, 0.9)
            a = core.close_modals_to_hud(adb, port)
            if a is None:
                return

    if float(a[780:838, 1135:1192].mean()) > 165.0:
        core.tap(adb, 1164, 810, 0.7)
        a = core.close_modals_to_hud(adb, port)
        if a is None:
            return
    if float(a[815:875, 1395:1455].mean()) > 165.0:
        core.tap(adb, 1425, 845, 0.7)
        a = core.close_modals_to_hud(adb, port)
        if a is None:
            return
    if float(a[710:768, 1320:1380].mean()) > 175.0:
        core.tap(adb, 1350, 740, 0.7)
        a = core.close_modals_to_hud(adb, port)
        if a is None:
            return

    if time.time() < _EMPTY_QUEST_COOLDOWN_UNTIL.get(port, 0.0):
        return

    qb_slice = a[185:325, 25:88]
    qb_red = (qb_slice[:, :, 0] >= 180) & (qb_slice[:, :, 1] <= 58) & (qb_slice[:, :, 2] <= 58)
    qb_wht = (qb_slice[:, :, 0] >= 215) & (qb_slice[:, :, 1] >= 215) & (qb_slice[:, :, 2] >= 215)
    rys_qb, rxs_qb = np.where(qb_red)
    col_dgt = a[275:310, 40:64]
    has_col_dgt = int(((col_dgt[:, :, 0] >= 185) & (col_dgt[:, :, 1] >= 185) & (col_dgt[:, :, 2] >= 165)).sum()) >= 25
    if (len(rxs_qb) < 20 or int(qb_wht.sum()) < 3) and not has_col_dgt:
        return
    scroll_x = 28 if "16384" in str(port) else 38
    scroll_y = int(np.median(rys_qb) + 185 + 22) if len(rys_qb) >= 20 else 325

    ist = state["instances"][port]
    ist["status"] = "CLAIMING_QUESTS"
    ist["currentTask"] = f"Claiming completed Main/Side Quests & Daily Objectives from left scroll ({scroll_x}, {scroll_y})"
    core.save_and_sync_blackbox(state)

    shot_q = os.path.join(SCRIPT_DIR, f"swarm_quests_{port}.png")
    core.tap(adb, scroll_x, scroll_y, 1.6)
    a_q = core.capture_screen(adb, shot_q)
    if a_q is None:
        return
    bh = a_q[85:140, 350:1250]
    is_bh = (bh[:, :, 0] >= 145) & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 25)
    q_tab = a_q[165:500, 30:155].astype(np.int32)
    has_q_tab = float(np.mean((q_tab[:, :, 2] >= 165) & (q_tab[:, :, 0] <= 75) & ((q_tab[:, :, 2] - q_tab[:, :, 0]) >= 95))) > 0.14
    if float(np.mean(is_bh)) < 0.45 or not has_q_tab:
        _EMPTY_QUEST_COOLDOWN_UNTIL[port] = time.time() + 300.0
        return

    claimed_count = 0

    # Ensure Tab 1 (Quests at 145, 245) is selected first, then claim completed Main & Side Quests
    core.tap(adb, 145, 245, 0.8)
    shot_q_tab1 = os.path.join(SCRIPT_DIR, f"swarm_quests_tab1_{port}.png")
    for idx_q in range(16):
        a_q = core.capture_screen(adb, shot_q_tab1 if idx_q == 0 else shot_q)
        if a_q is None:
            break
        bh_chk = a_q[85:140, 350:1250]
        is_bh_chk = (bh_chk[:, :, 0] >= 145) & (np.abs(bh_chk[:, :, 0].astype(np.int32) - bh_chk[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_bh_chk)) < 0.40:
            break
        q_clm = a_q[165:865, 1170:1345]
        is_grn = (q_clm[:, :, 1] >= 148) & (q_clm[:, :, 0] <= 78) & (q_clm[:, :, 2] <= 68)
        ys, xs = np.where(is_grn)
        if len(xs) < 1100:
            break
        cy = int(np.percentile(ys, 20) + 165)
        core.tap(adb, 1258, cy, 0.55)
        claimed_count += 1

    # Always check Tab 2 (Daily Objectives at 145, 415) when Quests modal is open
    core.tap(adb, 145, 415, 1.0)
    daily_claimed = 0
    for _ in range(10):
        a_d = core.capture_screen(adb, shot_q)
        if a_d is None:
            break
        d_clm = a_d[275:865, 1170:1345]
        is_d_grn = (d_clm[:, :, 1] >= 150) & (d_clm[:, :, 0] <= 75) & (d_clm[:, :, 2] <= 65)
        dys, dxs = np.where(is_d_grn)
        if len(dxs) < 1100:
            break
        dcy = int(np.percentile(dys, 20) + 275)
        core.tap(adb, 1258, dcy, 0.55)
        claimed_count += 1
        daily_claimed += 1
    if daily_claimed > 0:
        for cx_chest in (460, 660, 860, 1060, 1260):
            core.tap(adb, cx_chest, 240, 0.35)
            core.tap(adb, 1520, 500, 0.35)

    core.tap(adb, 1520, 500, 0.8)
    core.close_modals_to_hud(adb, port)
    if claimed_count == 0:
        _EMPTY_QUEST_COOLDOWN_UNTIL[port] = time.time() + 300.0
    if claimed_count > 0:
        core.append_movement(
            state,
            port,
            "QUEST_CLAIM",
            f"Claimed {claimed_count} completed Quests & Daily Objectives from left scroll (28, 290)",
            {"claimedCount": claimed_count},
        )
        core.save_and_sync_blackbox(state)


def main():
    import socket

    if os.path.exists(os.path.join(SCRIPT_DIR, "pause_swarm.flag")):
        print("[SoloAgent] pause_swarm.flag is active; exiting cleanly so scanner has 100% exclusive control.")
        return

    # Enforce strict single-process lock on SIDEKICK via local TCP port 44197
    _lock_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        _lock_sock.bind(("127.0.0.1", 44197))
    except OSError:
        print("[SoloAgent] Another solo_4197_agent instance is already holding port 44197. Exiting cleanly.")
        return

    parser = argparse.ArgumentParser()
    parser.add_argument("--cycles", type=int, default=999999, help="Number of continuous solo cycles")
    args, _ = parser.parse_known_args()

    port = SOLO_INST["port"]
    adb = SOLO_INST["adb"]
    core._OWNED_PORTS = {port}

    state = core.load_blackbox()
    mark_parked_instances(state)

    core.ensure_adb(adb)
    core.ensure_rok_foreground(adb)
    a_init = core.close_modals_to_hud(adb, port)
    if a_init is not None:
        ist = state["instances"][port]
        ist["screenPreviewB64"] = core.make_thumbnail_b64(a_init)
        ist["rssBags"] = core.merge_rss_bar(ist.get("rssBags"), a_init)
        pwr = core.parse_hud_power(a_init)
        if pwr > 0:
            ist["power"] = pwr
        coords = core.parse_map_coordinates(a_init)
        if coords["x"] > 0 or coords["y"] > 0:
            ist["coordinates"] = coords

    core.append_movement(
        state,
        port,
        "SWARM_BOOT",
        "Solo Flagship Mode active on :16384 (Governor236483513) — :16416 & :16448 parked for 100% hardware focus",
        {"soloInstance": adb, "parkedInstances": PARKED_PORTS},
    )
    core.save_and_sync_blackbox(state)

    last_farm_check_ts = 0.0

    for cycle_idx in range(args.cycles):
        mark_parked_instances(state)
        core.ensure_adb(adb)
        core.ensure_rok_foreground(adb)
        ist = state["instances"][port]

        # 0. Kingdom #4197 Lock
        cur_kd_check = str(ist.get("coordinates", {}).get("kingdom", "4197"))
        if not ist.get("verifiedIn4197") or cur_kd_check != "4197":
            ist["verifiedIn4197"] = False
            core.audit_and_ensure_4197_roster(state, SOLO_INST)
            ist["verifiedIn4197"] = True

        # 0b. Claim Completed Quests & Daily Objectives FIRST so red scroll badges (28, 290) drain immediately
        claim_completed_quests(state, SOLO_INST)

        # 1. Queue #1 — Strict T1 Military Training across all 4 camps
        core.run_t1_only_training(state, SOLO_INST, cycle_idx)
        merge_ground_truth_with_queue_badges(ist)
        core.save_and_sync_blackbox(state)

        # 2. Queue #2 — Active Scouting, Fog Exploration, Tribal Villages & Mysterious Caves
        core.run_scouting_and_villages(state, SOLO_INST, cycle_idx)

        # 3. Queue #3 — Cooldown-Aware Multi-March Resource Gathering
        gt = ist.get("groundTruth") or {}
        march_q = str(gt.get("marchQueue", "")).strip()
        now_ts = time.time()
        # If Ground-Truth confirmed 2/2 marches active within the last 4 minutes, skip redundant World Map search
        if march_q.startswith("2/") and (now_ts - last_farm_check_ts) < 240.0 and cycle_idx > 0:
            ist["status"] = "FARMING"
            ist["currentTask"] = f"2/2 Gather Marches Confirmed Active ({ist.get('currentFarming', {}).get('label', 'FOOD/WOOD')}) — Skipping redundant Map Search"
            core.save_and_sync_blackbox(state)
        else:
            a_check = core.close_modals_to_hud(adb, port)
            if a_check is not None and core.has_world_map_unlocked(a_check):
                core.run_resource_farming(state, SOLO_INST, cycle_idx)
                last_farm_check_ts = time.time()

        # 4. Queue #4 — Claim newly completed Quests + City Builder Burst (Target CH 16)
        claim_completed_quests(state, SOLO_INST)
        core.run_city_builder_burst(state, SOLO_INST, steps_count=6)

        # 5. Queue #5 — Watchtower & Mail Threat Recon + Ground-Truth Optical Audit
        core.run_blackbox_threat_check(state, SOLO_INST)
        if not (ist.get("groundTruth") or {}).get("verifiedAt") or (cycle_idx % 2 == 0):
            # Preserve active queue badges across ground-truth sync
            prev_badges = dict(ist.get("currentTraining") or {})
            core.audit_bot_ground_truth_stats(state, SOLO_INST)
            for k in ("infantry", "archer", "cavalry", "siege"):
                if k in prev_badges:
                    if "(Training T1 Batch)" in str(prev_badges[k]):
                        ist["currentTraining"][k] = f"{ist['currentTraining'].get(k, '')} (Training T1 Batch)"
                    elif "(Active Queue)" in str(prev_badges[k]):
                        ist["currentTraining"][k] = f"{ist['currentTraining'].get(k, '')} (Active Queue)"

        ist["sleepStatus"] = "AWAKE (SOLO FLAGSHIP 5-QUEUE LOOP)"

        hs_hit = core._LAST_HANDSHAKE_HIT.pop(adb, None)
        if hs_hit:
            core.append_movement(
                state,
                port,
                "ALLIANCE_HELP",
                f"Auto-tapped Alliance Help Handshake at ({hs_hit[0]}, {hs_hit[1]}) on {ist.get('activeGovernorName')}",
                {"x": hs_hit[0], "y": hs_hit[1]},
            )

        ist["status"] = "ACTIVE_IN_4197"
        ist["currentTask"] = (
            f"Solo Flagship #4197 // Power {ist.get('power', 0):,} · "
            f"{ist.get('currentTraining', {}).get('verifiedTotalTroops', 0):,} T1 Troops · "
            f"Farming {ist.get('currentFarming', {}).get('resource', 'WOOD')}"
        )
        ist["updatedAt"] = core.utc_now_iso()
        mark_parked_instances(state)
        core.save_and_sync_blackbox(state)

        # Tight 15-second breath before next solo pass
        time.sleep(15.0)


if __name__ == "__main__":
    main()
