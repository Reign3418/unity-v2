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
    "adb": "valheon-edge-ingest.internal",
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


def claim_completed_quests(state: dict, inst: dict):
    """
    Checks the CH8+ left Quest Scroll icon (28, 290) or #4200's (38, 320) for a notification badge,
    opens the Quests modal, claims batches of green CLAIM buttons on both the Quests tab and Daily Objectives tab,
    and claims Daily Activity chests before closing cleanly.
    """
    import numpy as np

    port = inst["port"]
    adb = inst["adb"]
    if time.time() < _EMPTY_QUEST_COOLDOWN_UNTIL.get(port, 0.0):
        return
    a = core.close_modals_to_hud(adb, port)
    if a is None:
        return

    q_badge_hi = a[235:278, 25:75]
    red_hi = int(((q_badge_hi[:, :, 0] >= 185) & (q_badge_hi[:, :, 1] <= 65) & (q_badge_hi[:, :, 2] <= 65)).sum())
    q_badge_4200_top = a[250:275, 68:98]
    wht_top = int(((q_badge_4200_top[:, :, 0] >= 220) & (q_badge_4200_top[:, :, 1] >= 220) & (q_badge_4200_top[:, :, 2] >= 220)).sum())
    q_badge_4200 = a[260:305, 35:85]
    red_lo = int(((q_badge_4200[:, :, 0] >= 165) & (q_badge_4200[:, :, 1] <= 55) & (q_badge_4200[:, :, 2] <= 55)).sum())
    has_4200_badge = wht_top >= 12 or red_lo >= 55
    if red_hi < 45 and not has_4200_badge:
        return
    scroll_x, scroll_y = (28, 290) if red_hi >= 45 else (38, 320)

    ist = state["instances"][port]
    ist["status"] = "CLAIMING_QUESTS"
    ist["currentTask"] = f"Claiming completed Main/Side Quests & Daily Objectives from left scroll ({scroll_x}, {scroll_y})"
    core.save_and_sync_blackbox(state)

    shot_q = os.path.join(SCRIPT_DIR, f"swarm_quests_{port}.png")
    core.tap(adb, scroll_x, scroll_y, 1.6)
    a_q = core.capture_screen(adb, shot_q)
    if a_q is not None:
        bh = a_q[85:140, 350:1250]
        is_bh = (bh[:, :, 0] >= 145) & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_bh)) < 0.35:
            core.tap(adb, 1420, 550, 0.6)
            core.tap(adb, scroll_x, scroll_y, 1.6)

    claimed_count = 0

    # Claim completed Main & Side Quests on Tab 1 (Quests) — strictly 1 verified tap per screen capture so it NEVER clicks a blue GO button
    for _ in range(16):
        a_q = core.capture_screen(adb, shot_q)
        if a_q is None:
            break
        bh_chk = a_q[85:140, 350:1250]
        is_bh_chk = (bh_chk[:, :, 0] >= 145) & (np.abs(bh_chk[:, :, 0].astype(np.int32) - bh_chk[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_bh_chk)) < 0.40:
            break
        q_clm = a_q[275:865, 1170:1345]
        is_grn = (q_clm[:, :, 1] >= 148) & (q_clm[:, :, 0] <= 78) & (q_clm[:, :, 2] <= 68)
        ys, xs = np.where(is_grn)
        if len(xs) < 1100:
            break
        cy = int(np.percentile(ys, 20) + 275)
        core.tap(adb, 1258, cy, 0.55)
        claimed_count += 1

    # Always check Tab 2 (Daily Objectives at 85, 415) when Quests modal is open
    core.tap(adb, 85, 415, 1.0)
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
            core.tap(adb, 800, 750, 0.35)

    core.tap(adb, 1520, 500, 0.8)
    core.tap(adb, 1365, 108, 0.8)
    core.close_modals_to_hud(adb, port)
    if claimed_count == 0:
        _EMPTY_QUEST_COOLDOWN_UNTIL[port] = time.time() + 75.0
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
