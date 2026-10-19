#!/usr/bin/env python3
"""
===============================================================================
VALHEON UNITY — AUTONOMOUS TUTORIAL & CH1->CH8 AUTO-BUILDER (SIDEKICK MUMU 12)
File: E:\\Unity\\scanner\\auto_tutorial_ch8.py
===============================================================================
Uses:
  1. 2-Frame Animated Spearhead Locator (sx, sy)
  2. Animated Pure-White/Cyan/Gold Starburst Locator within 75..295px of (sx, sy)
     (automatically finds the exact target button in ANY 360-degree direction:
      up-left Back button, right 'New Troop' button, down-left 'SEARCH'/'Build',
      or vertical 'Upgrade'/'Confirm'/'Train')
  3. RapidOCR & Counselor Dialogue fallback.
===============================================================================
"""

import os
import sys
import time
import argparse
import subprocess
from PIL import Image
import numpy as np

try:
    from rapidocr_onnxruntime import RapidOCR
    OCR = RapidOCR()
except Exception:
    OCR = None

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ADB_BIN = os.path.join(SCRIPT_DIR, "platform-tools", "adb.exe")
if not os.path.exists(ADB_BIN):
    ADB_BIN = "adb"


def screencap_pair(serial: str, p1: str, p2: str):
    subprocess.run(
        [ADB_BIN, "-s", serial, "shell", "screencap -p /sdcard/s1.png && sleep 0.25 && screencap -p /sdcard/s2.png"],
        capture_output=True,
    )
    subprocess.run([ADB_BIN, "-s", serial, "pull", "/sdcard/s1.png", p1], capture_output=True)
    subprocess.run([ADB_BIN, "-s", serial, "pull", "/sdcard/s2.png", p2], capture_output=True)
    a1 = np.array(Image.open(p1).convert("RGB"), dtype=int)
    a2 = np.array(Image.open(p2).convert("RGB"), dtype=int)
    return a1, a2


def tap(serial: str, x: int, y: int, sleep_sec: float = 1.0):
    x = max(12, min(1588, int(x)))
    y = max(12, min(888, int(y)))
    subprocess.run([ADB_BIN, "-s", serial, "shell", "input", "tap", str(x), str(y)], capture_output=True)
    if sleep_sec > 0:
        time.sleep(sleep_sec)


def detect_counselor_dialogue(a: np.ndarray) -> bool:
    box = a[745:835, 480:1120]
    cream = (box[:, :, 0] > 220) & (box[:, :, 1] > 210) & (box[:, :, 2] > 195) & (np.abs(box[:, :, 0] - box[:, :, 1]) < 25)
    return float(np.mean(cream)) > 0.52


def detect_pick_civilization(a: np.ndarray) -> int:
    # Returns 1 for Welcome/PICK CIVILIZATION screen (must have green User Agreement checkbox at x=545..595, y=835..880)
    chk_agree = a[835:880, 545:595]
    has_green_box = (chk_agree[:, :, 1] >= 175) & (chk_agree[:, :, 0] <= 110) & (chk_agree[:, :, 2] <= 90)
    parch = a[250:550, 600:1200]
    is_parch = (parch[:, :, 0] >= 195) & (parch[:, :, 1] >= 175) & (parch[:, :, 2] >= 135)
    pick_btn = a[710:800, 760:1080]
    is_gold = (pick_btn[:, :, 0] >= 185) & (pick_btn[:, :, 1] >= 125) & ((pick_btn[:, :, 0] - pick_btn[:, :, 2]) >= 55)
    if float(np.mean(has_green_box)) > 0.20 and float(np.mean(is_parch)) > 0.55 and float(np.mean(is_gold)) > 0.22:
        return 1

    return 0


def is_city_hud(a: np.ndarray) -> bool:
    ribbon = a[85:125, 15:70]
    diff_br = ribbon[:, :, 2].astype(np.float32) - ribbon[:, :, 0].astype(np.float32)
    return float(diff_br.mean()) > 45.0


def detect_new_troop_modal(a: np.ndarray):
    # Gate rules 1-3 on the dark teal-blue right panel of the New Troop modal (x=700..1100, y=280..450)
    nt_panel = a[280:450, 700:1100]
    is_nt_panel = float(nt_panel[:, :, 0].mean()) < 45.0 and float(nt_panel[:, :, 2].mean()) > 80.0

    if is_nt_panel:
        # 1. Golden MARCH button at x=1010..1315, y=745..830 -> tap MARCH (1160, 785)
        march_btn = a[745:830, 1010:1315]
        gold_march = (march_btn[:, :, 0] >= 220) & (march_btn[:, :, 1] >= 145) & (march_btn[:, :, 2] <= 75)
        if float(np.mean(gold_march)) > 0.35:
            return (1160, 785, "New Troop -> Tap MARCH")

        # 2. "Please select me as commander." white speech bubble at x=115..395, y=230..295 -> tap Sun Tzu (60, 260)
        bubble = a[230:295, 115:395]
        white_bubble = (bubble[:, :, 0] >= 210) & (bubble[:, :, 1] >= 210) & (bubble[:, :, 2] >= 210)
        if float(np.mean(white_bubble)) > 0.60:
            return (60, 260, "New Troop -> Select Primary Commander (Sun Tzu)")

        # 3. Empty Primary Commander glowing white '+' circle at x=265..325, y=465..525 -> tap '+' (295, 495)
        plus = a[465:525, 265:325]
        white_plus = (plus[:, :, 0] >= 242) & (plus[:, :, 1] >= 248) & (plus[:, :, 2] >= 248)
        if float(np.mean(white_plus)) > 0.45:
            return (295, 495, "New Troop -> Tap Primary Commander '+' Slot")

    # 4. Scout Fog golden 'Send' button at x=1140..1375, y=185..270 with white speech bubble below -> tap (1260, 228)
    send_btn = a[185:270, 1140:1375]
    gold_send = (send_btn[:, :, 0] >= 220) & (send_btn[:, :, 1] >= 145) & (send_btn[:, :, 2] <= 75)
    send_bub = a[285:355, 920:1450]
    white_sb = (send_bub[:, :, 0] >= 210) & (send_bub[:, :, 1] >= 210) & (send_bub[:, :, 2] >= 210)
    if float(np.mean(gold_send)) > 0.40 and float(np.mean(white_sb)) > 0.50:
        return (1260, 228, "Scout Fog -> Tap Send")

    # 5. Tavern Golden Chest 'OPEN' button at x=1010..1275, y=710..775 with white speech bubble below -> tap (1143, 740)
    open_btn = a[710:775, 1010:1275]
    gold_open = (open_btn[:, :, 0] >= 220) & (open_btn[:, :, 1] >= 145) & (open_btn[:, :, 2] <= 75)
    open_bub = a[800:875, 800:1450]
    white_ob = (open_bub[:, :, 0] >= 210) & (open_bub[:, :, 1] >= 210) & (open_bub[:, :, 2] >= 210)
    if float(np.mean(gold_open)) > 0.40 and float(np.mean(white_ob)) > 0.50:
        return (1143, 740, "Tavern -> Tap Golden Chest OPEN")

    # 6. Vengeance Stage 1: Golden QUICK DEPLOY (x=530..770, y=755..830) + Cyan START (x=825..1065, y=755..830)
    qd_btn = a[755:830, 530:770]
    gold_qd = (qd_btn[:, :, 0] >= 195) & (qd_btn[:, :, 1] >= 130) & (qd_btn[:, :, 2] <= 70)
    st_btn = a[755:830, 825:1065]
    cyan_st = (st_btn[:, :, 2] >= 195) & (st_btn[:, :, 1] >= 140) & (st_btn[:, :, 0] <= 65)
    if float(np.mean(gold_qd)) > 0.35 and float(np.mean(cyan_st)) > 0.35:
        return (650, 790, "VENGEANCE_QUICK_DEPLOY_AND_START")

    return None


def spear_mask(a: np.ndarray) -> np.ndarray:
    return (
        (a[:, :, 0] >= 118)
        & (a[:, :, 0] <= 218)
        & (a[:, :, 1] >= 148)
        & (a[:, :, 1] <= 238)
        & (a[:, :, 2] >= 180)
        & (a[:, :, 2] <= 252)
        & ((a[:, :, 2] - a[:, :, 0]) >= 20)
        & (a[:, :, 2] > a[:, :, 1])
    )


def detect_spear_and_starburst(a1: np.ndarray, a2: np.ndarray):
    diff = np.abs(a1 - a2).sum(axis=2)
    sp = (spear_mask(a1) | spear_mask(a2)) & (diff >= 20)
    # Filter out full-screen moving Kingdom Fog clouds
    if int(sp.sum()) > 12000:
        return None, None, 0

    H, W = sp.shape
    best_s, sx, sy = 0, 0, 0
    for gy in range(20, H - 70, 15):
        for gx in range(20, W - 70, 15):
            c = int(sp[gy : gy + 75, gx : gx + 75].sum())
            if c > best_s:
                best_s = c
                ys, xs = np.where(sp[gy : gy + 75, gx : gx + 75])
                sx, sy = int(np.median(xs) + gx), int(np.median(ys) + gy)

    if best_s < 130:
        return None, None, 0

    # Top-left corner shortcut: City HUD Quest Scroll (40, 235) vs Modal Back Arrow (48, 52)
    if sx < 260 and sy < 250:
        if is_city_hud(a2):
            return (sx, sy), (40, 235), best_s
        return (sx, sy), (48, 52), best_s

    # Bottom-left HUD shortcuts: Build Hammer at (45, 735) vs Map/City toggle at (55, 845)
    if sx < 165 and 420 <= sy < 700:
        return (sx, sy), (45, 735), best_s
    if sx < 165 and 700 <= sy <= 860:
        return (sx, sy), (55, 845), best_s

    # Build Drawer Slot #1 & New Troop Primary Commander '+' slot shortcut
    if 290 <= sx <= 435 and 300 <= sy <= 430:
        return (sx, sy), (315, 515), best_s

    Y, X = np.ogrid[:H, :W]
    dist = np.sqrt((X - sx) ** 2 + (Y - sy) ** 2)
    annulus = (dist >= 75) & (dist <= 300)

    # 1. Animated pulsing starburst / glow ring (ignores static white popups 100%)
    anim_burst = (
        (((a1[:, :, 0] >= 225) & (a1[:, :, 1] >= 200) & (a1[:, :, 2] >= 90))
         | ((a2[:, :, 0] >= 225) & (a2[:, :, 1] >= 200) & (a2[:, :, 2] >= 90)))
        & (diff >= 12)
        & (~sp)
        & annulus
    )
    # Exclude Build Drawer left flaming torch (x < 165, y = 140..440)
    anim_burst[140:440, :165] = False

    best_b, tx, ty = 0, None, None
    for gy in range(max(20, sy - 290), min(H - 60, sy + 290), 15):
        for gx in range(max(10, sx - 290), min(W - 60, sx + 290), 15):
            win = anim_burst[gy : min(H, gy + 85), gx : min(W, gx + 85)]
            c = int(win.sum())
            if c > best_b:
                best_b = c
                ys, xs = np.where(win)
                tx, ty = int(np.median(xs) + gx), int(np.median(ys) + gy)

    if best_b >= 55 and tx is not None:
        return (sx, sy), (tx, ty), best_b

    # 2. Static pure-white starburst fallback
    stat_burst = (a2[:, :, 0] >= 248) & (a2[:, :, 1] >= 250) & (a2[:, :, 2] >= 235) & annulus
    stat_burst[140:440, :165] = False
    for gy in range(max(20, sy - 290), min(H - 60, sy + 290), 15):
        for gx in range(max(10, sx - 290), min(W - 60, sx + 290), 15):
            win = stat_burst[gy : min(H, gy + 85), gx : min(W, gx + 85)]
            c = int(win.sum())
            if c > best_b:
                best_b = c
                ys, xs = np.where(win)
                tx, ty = int(np.median(xs) + gx), int(np.median(ys) + gy)

    if tx is not None and best_b >= 40:
        return (sx, sy), (tx, ty), best_b

    # 3. Default downward offset
    return (sx, sy), (sx, sy + 150), 0


def detect_green_checkmark(a: np.ndarray):
    sub = a[30:840, 200:1400]
    r_mask = (sub[:, :, 0] >= 195) & (sub[:, :, 1] <= 75) & (sub[:, :, 2] <= 75) & ((sub[:, :, 0] - sub[:, :, 1]) >= 125)
    rys, rxs = np.where(r_mask)
    if len(rxs) < 700:
        return None
    rx = int(np.median(rxs) + 200)
    ry = int(np.median(rys) + 30)
    # Green checkmark hexagon sits ~185px to the right of the Red X hexagon
    g_patch = a[max(0, ry - 75) : min(900, ry + 75), max(0, rx + 100) : min(1600, rx + 270)]
    g_mask = (g_patch[:, :, 1] >= 150) & (g_patch[:, :, 0] <= 90) & (g_patch[:, :, 2] <= 70) & ((g_patch[:, :, 1] - g_patch[:, :, 0]) >= 80)
    gys, gxs = np.where(g_mask)
    if len(gxs) >= 400:
        gx = int(np.median(gxs) + max(0, rx + 100))
        gy = int(np.median(gys) + max(0, ry - 75))
        return (gx, gy)
    return None


def is_colored_button(a: np.ndarray, cx: int, cy: int) -> bool:
    H, W, _ = a.shape
    patch = a[max(0, cy - 12) : min(H, cy + 12), max(0, cx - 28) : min(W, cx + 28)]
    if patch.size == 0:
        return False
    sat = np.max(patch, axis=2) - np.min(patch, axis=2)
    return float(np.mean(sat >= 55)) >= 0.45


def detect_ocr_action(img_path: str, a: np.ndarray):
    if OCR is None:
        return None
    res, _ = OCR(img_path)
    if not res:
        return None
    priority_keywords = [
        "SKIP",
        "HOME",
        "QUICK DEPLOY",
        "START",
        "New Troop",
        "MARCH",
        "March",
        "SEARCH",
        "Search",
        "ATTACK",
        "Attack",
        "Free",
        "FREE",
        "Go",
        "GO",
        "Upgrade",
        "UPGRADE",
        "Build",
        "BUILD",
        "Confirm",
        "CONFIRM",
        "Claim",
        "CLAIM",
        "Open",
        "OPEN",
        "Send",
        "SEND",
        "Investigate",
        "INVESTIGATE",
        "Visit",
        "VISIT",
        "Recruit",
        "Train",
        "Explore",
        "Create",
        "Help",
        "Speed Up",
        "Use",
    ]
    for kw in priority_keywords:
        for box, txt, score in res:
            t_clean = txt.strip()
            if len(t_clean) > 14:
                continue
            is_match = (kw.lower() == t_clean.lower()) or (
                kw.lower() in ("new troop", "speed up", "free") and kw.lower() in t_clean.lower()
            )
            if is_match:
                xs = [pt[0] for pt in box]
                ys = [pt[1] for pt in box]
                cx, cy = int(sum(xs) / 4), int(sum(ys) / 4)
                if kw == "SKIP" and cy < 120:
                    return (cx, cy, t_clean)
                # Ignore left quest tracker text (x < 260, y < 650) and top status bar (y <= 100)
                if (cx < 260 and cy < 650) or cy <= 100:
                    continue
                # Passive city labels ('Build', 'Recruit', 'Explore') float in upper-middle city; real buttons are cy >= 430 (or Go/Free/Use/Claim)
                if kw.lower() in ("build", "recruit", "explore", "upgrade", "train") and cy < 430:
                    continue
                if is_colored_button(a, cx, cy):
                    return (cx, cy, t_clean)
    return None


def detect_quest_sidebar_action(a: np.ndarray, step: int):
    # Ensure Main HUD Top-Left Avatar (15..75, 15..75) is visible (not hidden by Build Drawer or full-screen modal)
    avatar_patch = a[15:75, 15:75]
    if float(avatar_patch.mean()) < 75.0:
        # Check if Build Drawer Slot #1 (x=320..450, y=755..800) has an unlocked bright-cyan card
        slot1 = a[755:800, 320:450]
        unlocked = (slot1[:, :, 0] >= 85) & (slot1[:, :, 1] >= 190) & (slot1[:, :, 2] >= 230)
        if float(np.mean(unlocked)) > 0.45:
            return (345, 560, "Build Drawer -> Tap Unlocked Slot #1")
        return None

    # 1. Check for completed Side Quest pink gift icon at x=195..245, y=355..610
    sub = a[355:610, 195:245]
    pink = (sub[:, :, 0] >= 200) & (sub[:, :, 1] <= 100) & (sub[:, :, 2] >= 170)
    ys, xs = np.where(pink)
    if len(xs) >= 35:
        gy = int(np.median(ys) + 355)
        return (120, gy + 15, "Claim Completed Side Quest")

    # 2. Tap Main Quest Card at (120, 325) only if the dark translucent Quest Card is visible (not green grass)
    quest_card = a[305:345, 50:180]
    if float(quest_card[:, :, 1].mean()) < 98.0:
        return (120, 325, "Tap Main Quest Card")
    return None


def report_tut_progress(step: int, total_steps: int, detail: str, running: bool = True):
    try:
        import urllib.request
        import json as _json
        payload = {
            "running": running,
            "status": "PROVISIONING_BOT" if running else "COMPLETED",
            "preset": "BOT_PROVISION",
            "currentRank": step,
            "targetRanks": total_steps,
            "governorsExtracted": step,
            "lastGovernorName": detail,
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        req = urllib.request.Request(
            "http://192.168.50.41:8888/scan-progress",
            data=_json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=1.5)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adb", default="127.0.0.1:16384")
    parser.add_argument("--steps", type=int, default=40)
    args = parser.parse_args()

    p1 = os.path.join(SCRIPT_DIR, "auto_step.png")
    p2 = os.path.join(SCRIPT_DIR, "auto_step2.png")
    last_spear = None
    repeat_cnt = 0

    for step in range(1, args.steps + 1):
        report_tut_progress(step, args.steps, f"[6/6] Autonomous Tutorial Unlock — Step {step}/{args.steps}...")
        a1, a2 = screencap_pair(args.adb, p1, p2)

        pc = detect_pick_civilization(a2)
        if pc > 0:
            print(f"[Step {step:02d}] Pick Civilization (mode={pc}) -> Selecting China & Skipping Intro")
            if pc == 1:
                tap(args.adb, 830, 755, 2.2)
            tap(args.adb, 240, 800, 2.0)
            tap(args.adb, 1352, 630, 4.0)
            tap(args.adb, 1488, 38, 6.0)
            last_spear = None
            repeat_cnt = 0
            continue

        if detect_counselor_dialogue(a2):
            print(f"[Step {step:02d}] Counselor Dialogue -> tap (800, 780)")
            tap(args.adb, 800, 780, 0.8)
            last_spear = None
            repeat_cnt = 0
            continue

        chk = detect_green_checkmark(a2)
        if chk:
            print(f"[Step {step:02d}] Green Checkmark -> tap {chk}")
            tap(args.adb, chk[0], chk[1], 1.1)
            last_spear = None
            repeat_cnt = 0
            continue

        nt = detect_new_troop_modal(a2)
        if nt:
            if nt[2] == "VENGEANCE_QUICK_DEPLOY_AND_START":
                print(f"[Step {step:02d}] Vengeance Stage 1 -> Sun Tzu (110,265) + QUICK DEPLOY (650,790) + START (945,790)")
                tap(args.adb, 110, 265, 1.2)
                tap(args.adb, 650, 790, 1.2)
                tap(args.adb, 945, 790, 11.0)
                tap(args.adb, 800, 780, 1.5)
            else:
                print(f"[Step {step:02d}] {nt[2]} -> tap ({nt[0]}, {nt[1]})")
                tap(args.adb, nt[0], nt[1], 1.1)
            last_spear = None
            repeat_cnt = 0
            continue

        spear_xy, target_xy, bcnt = detect_spear_and_starburst(a1, a2)
        if spear_xy and target_xy:
            sx, sy = spear_xy
            tx, ty = target_xy
            if last_spear and abs(sx - last_spear[0]) < 35 and abs(sy - last_spear[1]) < 35:
                repeat_cnt += 1
            else:
                repeat_cnt = 0
            last_spear = spear_xy

            if repeat_cnt == 2:
                act = detect_ocr_action(p2, a2)
                if act:
                    print(f"[Step {step:02d}] Retry OCR Override '{act[2]}' -> tap ({act[0]}, {act[1]})")
                    tap(args.adb, act[0], act[1], 1.1)
                    continue
            elif repeat_cnt >= 3:
                shifts = [(0, 35), (0, -35), (45, 0), (-45, 0)]
                dx, dy = shifts[(repeat_cnt - 3) % len(shifts)]
                tx, ty = tx + dx, ty + dy

            print(f"[Step {step:02d}] Spear({sx},{sy}) + Starburst({bcnt}px r={repeat_cnt}) -> tap ({tx}, {ty})")
            tap(args.adb, tx, ty, 1.0)
            continue

        act = detect_ocr_action(p2, a2)
        if act:
            print(f"[Step {step:02d}] OCR '{act[2]}' -> tap ({act[0]}, {act[1]})")
            tap(args.adb, act[0], act[1], 1.1)
            continue

        q_act = detect_quest_sidebar_action(a2, step)
        if q_act:
            print(f"[Step {step:02d}] Quest Sidebar '{q_act[2]}' -> tap ({q_act[0]}, {q_act[1]})")
            tap(args.adb, q_act[0], q_act[1], 1.1)
            continue

        print(f"[Step {step:02d}] Idle/Popup -> tap (800, 780)")
        tap(args.adb, 800, 780, 0.85)

    screencap_pair(args.adb, p1, p2)


if __name__ == "__main__":
    main()

