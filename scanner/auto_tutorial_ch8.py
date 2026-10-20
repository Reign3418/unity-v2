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

    # Returns 2 for Civilization Carousel screen (golden CONFIRM button at x=1235..1475, y=590..660 + gold banner + bright sky left)
    conf_btn = a[590:660, 1235:1475]
    is_conf_gold = (conf_btn[:, :, 0] >= 210) & (conf_btn[:, :, 1] >= 150) & (conf_btn[:, :, 2] <= 55)
    banner = a[50:400, 700:1450]
    is_banner_gold = (banner[:, :, 0] >= 165) & (banner[:, :, 1] >= 100) & (banner[:, :, 2] <= 40)
    sky_left = a[50:400, 20:200]
    is_sky = (sky_left[:, :, 2] >= 150) & (sky_left[:, :, 0] >= 120)
    if float(np.mean(is_conf_gold)) > 0.55 and float(np.mean(is_banner_gold)) > 0.18 and float(np.mean(is_sky)) > 0.65:
        return 2

    return 0


def is_city_hud(a: np.ndarray) -> bool:
    ribbon = a[85:125, 15:70]
    diff_br = ribbon[:, :, 2].astype(np.float32) - ribbon[:, :, 0].astype(np.float32)
    return float(diff_br.mean()) > 45.0


def detect_new_troop_modal(a: np.ndarray):
    # 0. Quests Modal Main Quest Cyan 'GO' button at x=1175..1340, y=295..355 with grey-cream Quests header at y=85..145
    q_hdr = a[85:145, 500:1100]
    is_q_hdr = (
        (q_hdr[:, :, 0] >= 150)
        & (q_hdr[:, :, 0] <= 220)
        & (q_hdr[:, :, 1] >= 150)
        & (q_hdr[:, :, 1] <= 220)
        & (q_hdr[:, :, 2] >= 140)
        & (np.abs(q_hdr[:, :, 0] - q_hdr[:, :, 1]) < 20)
    )
    q_go = a[295:355, 1175:1340]
    is_q_go = (q_go[:, :, 2] >= 170) & (q_go[:, :, 1] >= 135) & ((q_go[:, :, 2] - q_go[:, :, 0]) >= 55)
    if float(np.mean(is_q_hdr)) > 0.55 and float(np.mean(is_q_go)) > 0.35:
        return (1258, 325, "Quests Modal -> Tap Main Quest GO")

    # Gate rules 1-3 on the dark teal-blue right panel of the New Troop modal (x=700..1100, y=280..450)
    # AND ensure we are NOT inside the Quests modal (where q_hdr is grey-cream)
    nt_panel = a[280:450, 700:1100]
    is_nt_panel = (
        float(nt_panel[:, :, 0].mean()) < 45.0
        and float(nt_panel[:, :, 2].mean()) > 80.0
        and float(np.mean(is_q_hdr)) < 0.35
    )

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

    # 3b. City Hall Upgraded full-width golden ribbon at x=450..1150, y=85..205 -> tap (800, 830) to dismiss
    ch_rib = a[85:205, 450:1150]
    gold_rib = (ch_rib[:, :, 0] >= 215) & (ch_rib[:, :, 1] >= 135) & (ch_rib[:, :, 2] <= 75)
    if float(np.mean(gold_rib)) > 0.45:
        return (800, 830, "City Hall Upgraded Banner -> Tap (800, 830)")

    # 3c. Barbarians Search Panel: Cream panel at x=80..580, y=280..500 + Cyan SEARCH button at x=235..445, y=615..705
    b_pan = a[350:480, 100:550]
    is_b_pan = (b_pan[:, :, 0] >= 215) & (b_pan[:, :, 1] >= 200) & (b_pan[:, :, 2] >= 175)
    b_srch = a[615:705, 235:445]
    is_b_srch = (b_srch[:, :, 2] >= 195) & (b_srch[:, :, 1] >= 140) & ((b_srch[:, :, 2].astype(np.int32) - b_srch[:, :, 0].astype(np.int32)) >= 65)
    if float(np.mean(is_b_pan)) > 0.55 and float(np.mean(is_b_srch)) > 0.30:
        return (340, 660, "Barbarians Modal -> Tap SEARCH")

    # 4. Top-Right Map Popup Golden Button ('Send', 'New Troop', or 'March' at x=1140..1380, y=140..325)
    # Only valid when top-left Governor HUD ribbon is visible (never inside full-screen ITEMS/QUESTS modals)
    if is_city_hud(a):
        tr_box = a[140:325, 1140:1380]
        gold_tr = (tr_box[:, :, 0] >= 215) & (tr_box[:, :, 1] >= 140) & (tr_box[:, :, 2] <= 75)
        g_ys, g_xs = np.where(gold_tr)
        if len(g_xs) >= 1800:
            gy = int(np.median(g_ys) + 140)
            return (1260, gy, f"Map Popup Golden Button -> Tap (1260, {gy})")

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

    # 6b. Vengeance Stage 1 Active Skill Prompt: white bubble at x=215..750, y=280..335 + gold skill icon at x=215..285, y=380..450
    v_bub = a[280:335, 215:750]
    is_vbub = (v_bub[:, :, 0] >= 220) & (v_bub[:, :, 1] >= 220) & (v_bub[:, :, 2] >= 220)
    v_sk = a[380:450, 215:285]
    is_vsk = (v_sk[:, :, 0] >= 195) & (v_sk[:, :, 1] >= 135) & (v_sk[:, :, 2] <= 75)
    if float(np.mean(is_vbub)) > 0.55 and float(np.mean(is_vsk)) > 0.25:
        return (250, 415, "Vengeance -> Cast Active Skill")

    # 7. Tavern Chest Result: Cyan CONFIRM (x=490..760, y=845..900) + Golden OPEN ANOTHER (x=825..1105, y=845..900)
    t_conf = a[850:898, 495:755]
    cyan_conf = (t_conf[:, :, 2] >= 195) & (t_conf[:, :, 1] >= 140) & (t_conf[:, :, 0] <= 110)
    t_open = a[850:898, 830:1095]
    gold_open2 = (t_open[:, :, 0] >= 195) & (t_open[:, :, 1] >= 130) & (t_open[:, :, 2] <= 75)
    if float(np.mean(cyan_conf)) > 0.35 and float(np.mean(gold_open2)) > 0.35:
        return (625, 875, "Tavern Chest Result -> Tap CONFIRM")

    # 8. Quests Modal Main Quest Cyan 'GO' button at x=1175..1340, y=295..355 with cream Quests header at y=80..150
    q_hdr = a[85:145, 500:1100]
    is_q_hdr = (q_hdr[:, :, 0] >= 205) & (q_hdr[:, :, 1] >= 195) & (q_hdr[:, :, 2] >= 175) & (np.abs(q_hdr[:, :, 0] - q_hdr[:, :, 1]) < 25)
    q_go = a[295:355, 1175:1340]
    is_q_go = (q_go[:, :, 2] >= 200) & (q_go[:, :, 1] >= 145) & (q_go[:, :, 0] <= 110)
    if float(np.mean(is_q_hdr)) > 0.55 and float(np.mean(is_q_go)) > 0.35:
        return (1258, 325, "Quests Modal -> Tap Main Quest GO")

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
    # Exclude bottom-right HUD cyan icons (Items, Alliance, Commander, Mail, Menu at x>=850, y>=775)
    sp[775:, 850:] = False
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

    # Bottom-left HUD shortcuts (ONLY when on City HUD, never when Build Drawer is open where (45,845) is DECORATIVE)
    if is_city_hud(a2):
        if sx < 165 and 420 <= sy < 700:
            return (sx, sy), (45, 735), best_s
        if sx < 165 and 700 <= sy <= 860:
            return (sx, sy), (55, 845), best_s

    # Build Drawer Slot #1 & New Troop Primary Commander '+' slot shortcut
    if 280 <= sx <= 435 and 245 <= sy <= 430:
        return (sx, sy), (315, 515), best_s

    Y, X = np.ogrid[:H, :W]
    dist = np.sqrt((X - sx) ** 2 + (Y - sy) ** 2)
    # The RoK tutorial spear points downward (Y >= sy + 25) or rightward/leftward (|Y - sy| <= 95); exclude title bars above the spear (Y < sy - 35)
    valid_cone = (dist >= 55) & (dist <= 285) & (((Y >= sy + 25) & (np.abs(X - sx) <= 235)) | (np.abs(Y - sy) <= 95))

    # 1. Animated pulsing starburst / glow ring (ignores static white popups 100%)
    anim_burst = (
        (((a1[:, :, 0] >= 225) & (a1[:, :, 1] >= 200) & (a1[:, :, 2] >= 90))
         | ((a2[:, :, 0] >= 225) & (a2[:, :, 1] >= 200) & (a2[:, :, 2] >= 90)))
        & (diff >= 12)
        & (~sp)
        & valid_cone
    )
    # Exclude Build Drawer left flaming torch (x < 165, y = 140..440)
    anim_burst[140:440, :165] = False

    best_b, tx, ty = 0, None, None
    for gy in range(max(20, sy - 60), min(H - 50, sy + 265), 15):
        for gx in range(max(10, sx - 250), min(W - 60, sx + 250), 15):
            win = anim_burst[gy : min(H, gy + 85), gx : min(W, gx + 85)]
            c = int(win.sum())
            if c > best_b:
                best_b = c
                ys, xs = np.where(win)
                tx, ty = int(np.median(xs) + gx), int(np.median(ys) + gy)

    if best_b >= 45 and tx is not None:
        return (sx, sy), (tx, ty), best_b

    # 2. Static pure-white starburst fallback inside valid cone
    stat_burst = (a2[:, :, 0] >= 248) & (a2[:, :, 1] >= 250) & (a2[:, :, 2] >= 235) & valid_cone
    stat_burst[140:440, :165] = False
    for gy in range(max(20, sy - 60), min(H - 50, sy + 265), 15):
        for gx in range(max(10, sx - 250), min(W - 60, sx + 250), 15):
            win = stat_burst[gy : min(H, gy + 85), gx : min(W, gx + 85)]
            c = int(win.sum())
            if c > best_b:
                best_b = c
                ys, xs = np.where(win)
                tx, ty = int(np.median(xs) + gx), int(np.median(ys) + gy)

    if tx is not None and best_b >= 35:
        return (sx, sy), (tx, ty), best_b

    # 3. Default downward offset
    return (sx, sy), (sx, sy + 145), 0


def detect_green_checkmark(a: np.ndarray):
    sub = a[30:840, 200:1400]
    r_mask = (sub[:, :, 0] >= 195) & (sub[:, :, 1] <= 75) & (sub[:, :, 2] <= 75) & ((sub[:, :, 0] - sub[:, :, 1]) >= 125)
    rys, rxs = np.where(r_mask)
    if len(rxs) < 700:
        return None
    rx = int(np.median(rxs) + 200)
    ry = int(np.median(rys) + 30)
    # Green checkmark hexagon sits ~185px to the right of the Red X hexagon (even when glowing under starburst)
    g_patch = a[max(0, ry - 75) : min(900, ry + 75), max(0, rx + 100) : min(1600, rx + 270)]
    g_mask = (
        (g_patch[:, :, 1] >= 150)
        & ((g_patch[:, :, 1].astype(np.int32) - g_patch[:, :, 2].astype(np.int32)) >= 55)
        & ((g_patch[:, :, 1].astype(np.int32) - g_patch[:, :, 0].astype(np.int32)) >= 35)
    )
    gys, gxs = np.where(g_mask)
    if len(gxs) >= 350:
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
    if not is_city_hud(a):
        # Check if Build Drawer Slot #1 (x=320..450, y=755..800) has an unlocked bright-cyan card
        slot1 = a[755:800, 320:450]
        unlocked = (slot1[:, :, 0] >= 85) & (slot1[:, :, 1] >= 190) & (slot1[:, :, 2] >= 230)
        if float(np.mean(unlocked)) > 0.45:
            return (345, 560, "Build Drawer -> Tap Unlocked Slot #1")
        # If Build Drawer stone pillar is visible on left (x=10..80, y=500..850) with locked Slot #1, tap (800, 200) to close
        pillar = a[500:850, 10:80]
        if float(pillar.mean()) > 95.0 and float(np.mean(np.abs(pillar[:, :, 0] - pillar[:, :, 1]) < 25)) > 0.55:
            return (800, 200, "Build Drawer Locked -> Close (800, 200)")
        # If full-screen modal header bar (Items/Quests/Settings at y=75..145, x=500..1100) is open, tap top-right X (1415, 110)
        hdr = a[75:145, 500:1100]
        if float(hdr.mean()) > 125.0 and float(np.mean(np.abs(hdr[:, :, 0] - hdr[:, :, 1]) < 25)) > 0.60:
            return (1415, 110, "Modal Open -> Close (1415, 110)")
        # If top-left Back button (48, 52) is visible (Commander/Tavern view), tap (48, 52)
        back_btn = a[20:85, 20:85]
        if float(back_btn.mean()) > 110.0 and float(np.mean(np.abs(back_btn[:, :, 0] - back_btn[:, :, 1]) < 25)) > 0.55:
            return (48, 52, "Sub-Screen Open -> Tap Back (48, 52)")
        return None

    # 1. Check for completed Main or Side Quest pink gift icon at x=195..245, y=285..610 (pick topmost first)
    sub = a[285:610, 195:245]
    pink = (sub[:, :, 0] >= 200) & (sub[:, :, 1] <= 100) & (sub[:, :, 2] >= 170)
    ys, xs = np.where(pink)
    if len(xs) >= 35:
        gy = int(np.percentile(ys, 15) + 285)
        return (120, gy + 15, "Claim Completed Quest Gift")

    # 2. Tap Main Quest Card at (120, 325) only if the dark translucent Quest Card is visible (not green grass)
    quest_card = a[305:345, 50:180]
    if float(quest_card[:, :, 1].mean()) < 98.0:
        return (120, 325, "Tap Main Quest Card")
    return None


def resolve_instance_id(adb_serial: str) -> str:
    s = str(adb_serial or "127.0.0.1:16384")
    if "16416" in s:
        return "sidekick-mumu-1"
    if "16448" in s:
        return "sidekick-mumu-2"
    return "sidekick-mumu-0"


def report_tut_progress(adb_serial: str, kingdom: str, step: int, total_steps: int, detail: str, running: bool = True):
    import json as _json
    pct = round((step / max(1, total_steps)) * 100.0, 1)
    adb_port = str(adb_serial or "127.0.0.1:16384").split(":")[-1]
    inst_id = resolve_instance_id(adb_serial)
    payload = {
        "running": running,
        "status": "PROVISIONING_BOT" if running else "COMPLETED",
        "kingdom": str(kingdom or "4194"),
        "preset": "BOT_PROVISION",
        "currentRank": step,
        "targetRanks": total_steps,
        "percent": pct,
        "governorsExtracted": step,
        "lastGovernorName": detail,
        "workerSerial": str(adb_serial),
        "adbPort": adb_port,
        "instanceId": inst_id,
        "pid": os.getpid(),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    try:
        per_port_path = os.path.join(SCRIPT_DIR, f"scan_progress_{adb_port}.json")
        with open(per_port_path, "w", encoding="utf-8") as f:
            _json.dump(payload, f, indent=2)
    except Exception:
        pass
    try:
        import urllib.request
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
    parser.add_argument("--kingdom", default="4194")
    parser.add_argument("--steps", type=int, default=40)
    args = parser.parse_args()

    adb_port = str(args.adb).split(":")[-1]
    p1 = os.path.join(SCRIPT_DIR, f"auto_step_{adb_port}.png")
    p2 = os.path.join(SCRIPT_DIR, f"auto_step2_{adb_port}.png")
    last_spear = None
    repeat_cnt = 0

    for step in range(1, args.steps + 1):
        report_tut_progress(args.adb, args.kingdom, step, args.steps, f"[Tutorial {args.adb}] Autonomous Unlock — Step {step}/{args.steps}...")
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

    _, a_final = screencap_pair(args.adb, p1, p2)
    chk_final = detect_green_checkmark(a_final)
    if chk_final:
        print(f"[Final Cleanup] Completing pending building placement at {chk_final}")
        tap(args.adb, chk_final[0], chk_final[1], 1.2)


if __name__ == "__main__":
    main()

