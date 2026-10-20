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


def swipe(serial: str, x1: int, y1: int, x2: int, y2: int, dur_ms: int = 450, sleep_sec: float = 1.0):
    subprocess.run(
        [ADB_BIN, "-s", serial, "shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(dur_ms)],
        capture_output=True,
    )
    if sleep_sec > 0:
        time.sleep(sleep_sec)


def select_city_hall_via_anchor(serial: str, img_path: str = None):
    is_16384 = "16384" in str(serial)

    def _try_ocr_ch(path: str) -> bool:
        if not path or OCR is None or not os.path.exists(path):
            return False
        try:
            res, _ = OCR(path)
            if res:
                for box, txt, _ in res:
                    tc = txt.strip().lower()
                    cx = int(sum(pt[0] for pt in box) / 4)
                    cy = int(sum(pt[1] for pt in box) / 4)
                    if tc == "recruit" and 130 < cx <= 1380 and 150 <= cy <= 780:
                        chx, chy = (cx + 180, cy - 50) if is_16384 else (cx + 155, cy - 90)
                        print(f"  [CH-Locator] Found 'Recruit' at ({cx},{cy}) -> Tap City Hall ({chx},{chy})")
                        tap(serial, chx, chy, 1.2)
                        return True
                for box, txt, _ in res:
                    tc = txt.strip().lower()
                    cx = int(sum(pt[0] for pt in box) / 4)
                    cy = int(sum(pt[1] for pt in box) / 4)
                    if tc == "build" and cx > 450 and 55 <= cy <= 680:
                        chx, chy = (cx - 365, cy + 75) if is_16384 else (cx - 390, cy + 50)
                        print(f"  [CH-Locator] Found 'Build' at ({cx},{cy}) -> Tap City Hall ({chx},{chy})")
                        tap(serial, chx, chy, 1.2)
                        return True
                if is_16384:
                    for box, txt, _ in res:
                        tc = txt.strip().lower()
                        cx = int(sum(pt[0] for pt in box) / 4)
                        cy = int(sum(pt[1] for pt in box) / 4)
                        if tc == "research" and 130 < cx <= 1250 and 85 <= cy <= 780:
                            chx, chy = cx + 295, cy + 40
                            print(f"  [CH-Locator] Found 'Research' at ({cx},{cy}) -> Tap City Hall ({chx},{chy})")
                            tap(serial, chx, chy, 1.2)
                            return True
        except Exception:
            pass
        return False

    ch_path = os.path.join(SCRIPT_DIR, f"auto_ch_{str(serial).split(':')[-1]}.png")
    if not img_path or not os.path.exists(img_path):
        subprocess.run([ADB_BIN, "-s", serial, "shell", "screencap -p /sdcard/s_ch.png"], capture_output=True)
        subprocess.run([ADB_BIN, "-s", serial, "pull", "/sdcard/s_ch.png", ch_path], capture_output=True)
        img_path = ch_path

    # 1. Check if camera is pinned at top-left boundary stop
    overpanned_top_left = False
    try:
        arr = np.array(Image.open(img_path).convert("RGB"))
        patch = arr[180:520, 280:850]
        grass = (
            (patch[:, :, 1] >= 145)
            & (patch[:, :, 0] >= 115)
            & (patch[:, :, 0] <= 185)
            & (patch[:, :, 2] <= 95)
            & ((patch[:, :, 1].astype(np.int32) - patch[:, :, 2].astype(np.int32)) >= 65)
        )
        overpanned_top_left = float(np.mean(grass)) > 0.65
    except Exception:
        pass

    # 2. If not overpanned top-left, check 'Recruit' or 'Build' immediately before swiping
    if (not overpanned_top_left) and _try_ocr_ch(img_path):
        return

    if overpanned_top_left:
        swipe(serial, 1250, 700, 500, 280, 450, 1.0)
    else:
        swipe(serial, 350, 280, 1050, 600, 400, 1.0)

    subprocess.run([ADB_BIN, "-s", serial, "shell", "screencap -p /sdcard/s_ch.png"], capture_output=True)
    subprocess.run([ADB_BIN, "-s", serial, "pull", "/sdcard/s_ch.png", ch_path], capture_output=True)
    if _try_ocr_ch(ch_path):
        return

    # 3. Second up-left pan toward top-left City Hall if still not visible
    swipe(serial, 350, 280, 1050, 600, 400, 1.0)
    subprocess.run([ADB_BIN, "-s", serial, "shell", "screencap -p /sdcard/s_ch.png"], capture_output=True)
    subprocess.run([ADB_BIN, "-s", serial, "pull", "/sdcard/s_ch.png", ch_path], capture_output=True)
    if _try_ocr_ch(ch_path):
        return

    if "16384" in str(serial):
        tap(serial, 1095, 455, 1.2)
    else:
        tap(serial, 1055, 290, 1.2)


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


def is_world_map(a: np.ndarray) -> bool:
    if not is_city_hud(a):
        return False
    # On the World Map, the top coordinate bar (#4194 X:... Y:...) has a gold Star bookmark icon at (597, 22)
    star = a[8:40, 580:615]
    gold = (star[:, :, 0] >= 195) & (star[:, :, 1] >= 125) & (star[:, :, 2] <= 55)
    return float(np.mean(gold)) > 0.45


def detect_new_troop_modal(a: np.ndarray):
    # 0. Quests / Daily Objectives Modal at y=85..145 with left blue ribbon tab at x=30..160, y=165..500
    q_hdr = a[85:145, 500:1100]
    is_q_hdr = (
        (q_hdr[:, :, 0] >= 150)
        & (q_hdr[:, :, 0] <= 225)
        & (q_hdr[:, :, 1] >= 150)
        & (q_hdr[:, :, 1] <= 225)
        & (q_hdr[:, :, 2] >= 140)
        & (np.abs(q_hdr[:, :, 0] - q_hdr[:, :, 1]) < 22)
    )
    q_tab = a[165:500, 30:155]
    is_q_tab = (q_tab[:, :, 2] >= 165) & (q_tab[:, :, 0] <= 75) & ((q_tab[:, :, 2].astype(np.int32) - q_tab[:, :, 0].astype(np.int32)) >= 95)
    q_tab3 = a[520:665, 30:155]
    is_q_tab3 = (q_tab3[:, :, 2] >= 120) & (q_tab3[:, :, 0] <= 75) & ((q_tab3[:, :, 2].astype(np.int32) - q_tab3[:, :, 0].astype(np.int32)) >= 65)
    if float(np.mean(is_q_hdr)) > 0.55 and float(np.mean(is_q_tab)) > 0.14:
        q_hdr_txt = ""
        if OCR is not None:
            try:
                qh_res, _ = OCR(a[85:145, 480:1120].astype(np.uint8))
                if qh_res:
                    q_hdr_txt = " ".join(r[1].strip() for r in qh_res).lower()
            except Exception:
                pass
        if "alliance" in q_hdr_txt:
            j_area = a[280:845, 1100:1375]
            is_j_cyan = (
                (j_area[:, :, 2] >= 180)
                & (j_area[:, :, 1] >= 135)
                & (j_area[:, :, 0] <= 80)
                & ((j_area[:, :, 2].astype(np.int32) - j_area[:, :, 0].astype(np.int32)) >= 95)
            )
            jys, jxs = np.where(is_j_cyan)
            if len(jxs) >= 900:
                jy = int(np.percentile(jys, 20) + 280)
                jx = int(np.median(jxs) + 1100)
                return (jx, jy, "ALLIANCE_JOIN_AND_CLOSE")
            return (1380, 108, "Alliance Modal (No Open Join) -> Close (1380, 108)")
        if "replenish" in q_hdr_txt or "resource" in q_hdr_txt or (float(np.mean(is_q_tab3)) > 0.14 and "quest" not in q_hdr_txt and "objective" not in q_hdr_txt):
            return (1355, 112, "Replenish Resources Modal -> Close (1355, 112)")
        # Check for any golden CLAIM button (Quests tab) OR green CLAIM button (Daily Objectives tab) at x=1170..1345, y=275..865
        q_claims = a[275:865, 1170:1345]
        is_gold_claim = (q_claims[:, :, 0] >= 200) & (q_claims[:, :, 1] >= 135) & (q_claims[:, :, 2] <= 75)
        is_grn_claim = (
            (q_claims[:, :, 1] >= 155)
            & (q_claims[:, :, 0] <= 75)
            & (q_claims[:, :, 2] <= 65)
            & ((q_claims[:, :, 1].astype(np.int32) - q_claims[:, :, 0].astype(np.int32)) >= 95)
        )
        cys, cxs = np.where(is_gold_claim | is_grn_claim)
        if len(cxs) >= 1200:
            cy = int(np.percentile(cys, 15) + 275)
            return (1258, cy, "QUESTS_MODAL_CLAIM")
        # Check if the other left tab (Tab 2 Daily Objectives at y=310..360 or Tab 1 Quests at y=155..205) has a red notification badge
        tab2_red = (a[310:360, 45:95, 0] >= 180) & (a[310:360, 45:95, 1] <= 65) & (a[310:360, 45:95, 2] <= 65)
        tab1_active = float(np.mean(is_q_tab[:150, :])) > float(np.mean(is_q_tab[150:, :]))
        if tab1_active and int(tab2_red.sum()) >= 120:
            return (85, 415, "Quests Modal -> Switch to Daily Objectives Tab (85, 415)")
        tab1_red = (a[155:205, 45:95, 0] >= 180) & (a[155:205, 45:95, 1] <= 65) & (a[155:205, 45:95, 2] <= 65)
        if (not tab1_active) and int(tab1_red.sum()) >= 120:
            return (85, 240, "Quests Modal -> Switch to Quests Tab (85, 240)")
        # Otherwise check if Main Quest is City Hall ('Power Through' / 'City Hall'); if it's Vengeance ('Digging Two Graves'), close Quests modal!
        mq_txt = ""
        if OCR is not None and tab1_active:
            try:
                m_res, _ = OCR(a[215:360, 235:900].astype(np.uint8))
                if m_res:
                    mq_txt = " ".join(r[1].strip() for r in m_res).lower()
            except Exception:
                pass
        if mq_txt.strip() != "" and not any(bad in mq_txt for bad in ("graves", "vengeance", "stage 20", "barbarian", "buster", "defeat")):
            return (1258, 325, "QUESTS_MODAL_MAIN_GO")
        return (1380, 108, "QUESTS_MODAL_CLOSE")

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
    # ONLY valid on the World Map (is_world_map(a)), never inside the City where (1260, 225) is the Stable roof!
    if is_world_map(a):
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

    # 6b. Vengeance Stage 1 Active Skill Prompt: white bubble at x=215..750, y=315..405 + gold skill icon at x=215..295, y=405..475
    v_bub = a[315:405, 215:750]
    is_vbub = (v_bub[:, :, 0] >= 215) & (v_bub[:, :, 1] >= 215) & (v_bub[:, :, 2] >= 215)
    v_sk = a[405:475, 215:295]
    is_vsk = (v_sk[:, :, 0] >= 185) & (v_sk[:, :, 1] >= 125) & (v_sk[:, :, 2] <= 115)
    if float(np.mean(is_vbub)) > 0.35 and float(np.mean(is_vsk)) > 0.14:
        return (256, 437, "VENGEANCE_CAST_SKILL_AND_EXIT")

    # 6c. Vengeance VICTORY Screen: Red HOME button (x=275..508, y=720..800) + Cyan CONTINUE button (x=587..821, y=720..800)
    vh_btn = a[720:800, 275:508]
    is_vh_red = (vh_btn[:, :, 0] >= 175) & (vh_btn[:, :, 1] <= 80) & (vh_btn[:, :, 2] <= 80)
    vc_btn = a[720:800, 587:821]
    is_vc_cyan = (vc_btn[:, :, 2] >= 180) & (vc_btn[:, :, 1] >= 140) & (vc_btn[:, :, 0] <= 80)
    if float(np.mean(is_vh_red)) > 0.45 and float(np.mean(is_vc_cyan)) > 0.45:
        return (392, 760, "Vengeance Victory -> Tap HOME (392, 760)")

    # 7. Tavern Chest Result: Cyan CONFIRM (x=490..760) + Golden OPEN ANOTHER (x=825..1105) at y=845..898 or y=765..845
    for y_lo, y_hi, y_tap in [(845, 898, 875), (765, 845, 805)]:
        t_conf = a[y_lo:y_hi, 495:755]
        cyan_conf = (t_conf[:, :, 2] >= 185) & (t_conf[:, :, 1] >= 135) & (t_conf[:, :, 0] <= 110)
        t_open = a[y_lo:y_hi, 830:1095]
        gold_open2 = (t_open[:, :, 0] >= 190) & (t_open[:, :, 1] >= 125) & (t_open[:, :, 2] <= 80)
        if float(np.mean(cyan_conf)) > 0.35 and float(np.mean(gold_open2)) > 0.35:
            return (628, y_tap, "TAVERN_CONFIRM_AND_EXIT")

    # 7b. Insufficient Gems Popup Modal (grey header y=165..215, x=350..1250 + centered golden Purchase button y=620..698, x=680..920)
    ig_hdr = a[165:215, 350:1250]
    is_ig_hdr = (ig_hdr[:, :, 0] >= 150) & (np.abs(ig_hdr[:, :, 0].astype(np.int32) - ig_hdr[:, :, 1].astype(np.int32)) < 20)
    ig_btn = a[620:698, 680:920]
    is_ig_gold = (ig_btn[:, :, 0] >= 200) & (ig_btn[:, :, 1] >= 135) & (ig_btn[:, :, 2] <= 65)
    if float(np.mean(is_ig_hdr)) > 0.65 and float(np.mean(is_ig_gold)) > 0.45:
        return (1263, 190, "INSUFFICIENT_GEMS_CLOSE_AND_EXIT")

    # 7c. Spend Gems Notice Modal (grey header y=165..215, x=350..1250 + left gold CONFIRM x=440..740, y=600..750 + right cyan NO x=875..1177, y=600..750)
    no_btn = a[600:750, 875:1177]
    is_no_cyan = (no_btn[:, :, 2] >= 180) & (no_btn[:, :, 1] >= 135) & (no_btn[:, :, 0] <= 75)
    cf_btn = a[600:750, 440:740]
    is_cf_gold = (cf_btn[:, :, 0] >= 195) & (cf_btn[:, :, 1] >= 130) & (cf_btn[:, :, 2] <= 75)
    back_btn = a[20:85, 20:85]
    is_back_grey = (back_btn[:, :, 0] >= 115) & (np.abs(back_btn[:, :, 0] - back_btn[:, :, 1]) < 25)
    if float(np.mean(is_ig_hdr)) > 0.65 and float(np.mean(is_no_cyan)) > 0.30 and float(np.mean(is_cf_gold)) > 0.30:
        if float(np.mean(is_back_grey)) > 0.50:
            return (1027, 675, "NOTICE_NO_AND_EXIT")
        return (590, 675, "Spend Gems Speedup Notice -> Tap CONFIRM (590, 675)")

    # 9a. Commander Upgrade / Building Speed Up Modal ('QUICK LEVEL'/'QUICK USE' gold button at x=1075..1340, y=310..412 + cyan 'USE' or shifted gold 'PURCHASE&USE' rows)
    spd_hdr = a[75:145, 300:1300]
    is_spd_hdr = (spd_hdr[:, :, 0] >= 150) & (np.abs(spd_hdr[:, :, 0].astype(np.int32) - spd_hdr[:, :, 1].astype(np.int32)) < 25)
    ql_gold = a[310:412, 1075:1340]
    is_ql_gold = (ql_gold[:, :, 0] >= 200) & (ql_gold[:, :, 1] >= 130) & (ql_gold[:, :, 2] <= 55)
    use1_cy = a[295:405, 1075:1315]
    is_use1_cy = (use1_cy[:, :, 2] >= 200) & (use1_cy[:, :, 1] >= 145) & (use1_cy[:, :, 0] <= 75)
    use_cy = a[485:595, 1075:1340]
    is_use_cy = (use_cy[:, :, 2] >= 200) & (use_cy[:, :, 1] >= 145) & (use_cy[:, :, 0] <= 75)
    p1_gold = a[270:365, 1075:1315]
    is_p1_gold = (p1_gold[:, :, 0] >= 195) & (p1_gold[:, :, 1] >= 125) & (p1_gold[:, :, 2] <= 60)
    p2_gold = a[430:525, 1075:1315]
    is_p2_gold = (p2_gold[:, :, 0] >= 195) & (p2_gold[:, :, 1] >= 125) & (p2_gold[:, :, 2] <= 60)
    p3_gold = a[590:685, 1075:1315]
    is_p3_gold = (p3_gold[:, :, 0] >= 195) & (p3_gold[:, :, 1] >= 125) & (p3_gold[:, :, 2] <= 60)
    if float(np.mean(is_ql_gold)) > 0.35 and float(np.mean(is_use_cy)) > 0.35:
        if float(np.mean(is_back_grey)) > 0.55:
            return (1225, 371, "COMMANDER_UPGRADE_MODAL")
        return (1225, 371, "BUILDING_SPEEDUP_MODAL")
    if not is_city_hud(a) and float(np.mean(is_spd_hdr)) > 0.60 and float(np.mean(is_use1_cy)) > 0.35 and float(np.mean(is_back_grey)) < 0.40 and float(a[175:235, 600:1000].mean()) < 85.0:
        return (1195, 355, "ROW1_USE_SPEEDUP_MODAL")
    if float(np.mean(is_p1_gold)) > 0.40 and float(np.mean(is_p2_gold)) > 0.40 and float(np.mean(is_back_grey)) < 0.40:
        # All free speedups exhausted -> check top-right Gems & remaining timer
        gems = 0
        rem_mins = 10
        if OCR is not None:
            try:
                import re as _re
                g_res, _ = OCR(a[0:58, 1350:1598].astype(np.uint8))
                if g_res:
                    for gbox, gtxt, _ in g_res:
                        gcx = sum(pt[0] for pt in gbox) / 4.0
                        if 100.0 <= gcx <= 200.0:
                            digits = _re.sub(r"[^0-9]", "", gtxt)
                            if digits:
                                gems = int(digits)
                                break
                t_res, _ = OCR(a[165:245, 600:1000].astype(np.uint8))
                if t_res:
                    t_str = " ".join(r[1].strip() for r in t_res)
                    parts = [int(p) for p in _re.findall(r"\d+", t_str)]
                    if len(parts) >= 3:
                        rem_mins = parts[0] * 60 + parts[1] + (1 if parts[2] >= 30 else 0)
                    elif len(parts) == 2:
                        rem_mins = parts[0]
            except Exception:
                pass
        if gems >= 120 and rem_mins >= 48 and float(np.mean(is_p3_gold)) > 0.40:
            if rem_mins > 63:
                return (1194, 636, "BUILDING_SPEEDUP_GEM_60M_KEEP_OPEN")
            return (1194, 636, "BUILDING_SPEEDUP_GEM_60M")
        if gems >= 40 and rem_mins >= 4:
            if rem_mins > 18:
                return (1195, 478, "BUILDING_SPEEDUP_GEM_15M_KEEP_OPEN")
            return (1195, 478, "BUILDING_SPEEDUP_GEM_15M")
        if gems >= 9 and 2 <= rem_mins <= 15:
            return (1196, 320, "BUILDING_SPEEDUP_GEM_1M")
        return (1380, 108, "SPEED_UP_OUT_OF_FREE_ITEMS")

    # 9b. Commander Screen ('SKILLS' cyan button at x=1220..1415 or TALENTS+SKILLS at x=1095..1555, y=725..795 + top-left grey Back button at x=20..85, y=20..85)
    sk_btn = a[725:795, 1220:1415]
    is_sk_cyan = (sk_btn[:, :, 2] >= 200) & (sk_btn[:, :, 1] >= 145) & (sk_btn[:, :, 0] <= 75)
    tal_btn = a[725:795, 1095:1300]
    is_tal_cyan = (tal_btn[:, :, 2] >= 200) & (tal_btn[:, :, 1] >= 145) & (tal_btn[:, :, 0] <= 75)
    sk2_btn = a[725:795, 1350:1555]
    is_sk2_cyan = (sk2_btn[:, :, 2] >= 200) & (sk2_btn[:, :, 1] >= 145) & (sk2_btn[:, :, 0] <= 75)
    if float(np.mean(is_back_grey)) > 0.55:
        if float(np.mean(is_tal_cyan)) > 0.45 and float(np.mean(is_sk2_cyan)) > 0.45:
            sk_rb = a[690:750, 1515:1575]
            is_sk_red = (sk_rb[:, :, 0] >= 200) & (sk_rb[:, :, 1] <= 60) & (sk_rb[:, :, 2] <= 60)
            sk_sp = a[550:725, 1380:1530]
            is_sk_sp = (sk_sp[:, :, 2] >= 180) & ((sk_sp[:, :, 2].astype(np.int32) - sk_sp[:, :, 0].astype(np.int32)) >= 20)
            if int(is_sk_red.sum()) >= 250 or int(is_sk_sp.sum()) >= 1000:
                return (1448, 761, "COMMANDER_SKILL_UPGRADE")
            up2 = a[200:245, 175:210]
            gr2 = (up2[:, :, 1] >= 170) & (up2[:, :, 0] <= 110) & (up2[:, :, 2] <= 80)
            if int(gr2.sum()) < 50:
                return (235, 255, "COMMANDER_SLOT2_LEVEL_UP_5")
            return (48, 52, "Commander Screen -> Tap Back (48, 52)")
        if float(np.mean(is_sk_cyan)) > 0.45:
            sk_rb1 = a[690:750, 1380:1445]
            is_sk_red1 = (sk_rb1[:, :, 0] >= 200) & (sk_rb1[:, :, 1] <= 60) & (sk_rb1[:, :, 2] <= 60)
            if int(is_sk_red1.sum()) >= 250:
                return (1315, 761, "COMMANDER_SKILL_UPGRADE")
            lvl_btn = a[340:390, 1480:1555]
            is_lvl_green = (lvl_btn[:, :, 1] >= 165) & (lvl_btn[:, :, 0] <= 80) & (lvl_btn[:, :, 2] <= 80)
            if float(np.mean(is_lvl_green)) > 0.30:
                return (1515, 363, "COMMANDER_LEVEL_UP_5")
            return (48, 52, "Commander Screen -> Tap Back (48, 52)")
        # 9c. Commander Skills Upgrade Sub-Screen (dark background + cyan UPGRADE button at x=1100..1340, y=765..865)
        sk_upg = a[765:865, 1100:1340]
        is_sk_upg = (
            (sk_upg[:, :, 2] >= 180)
            & (sk_upg[:, :, 1] >= 140)
            & (sk_upg[:, :, 0] <= 85)
            & ((sk_upg[:, :, 2].astype(np.int32) - sk_upg[:, :, 0].astype(np.int32)) >= 95)
        )
        if int(is_sk_upg.sum()) >= 8000 and float(a[200:500, 350:600].mean()) < 75.0:
            return (1217, 812, "COMMANDER_SKILL_MODAL_UPGRADE")

    # 10. Gem Store / Pack Shop Screen (left dark reddish-brown tab bar x=10..250, y=270..750 + top-left grey Back button at 48, 52)
    shop_bar = a[270:750, 10:250]
    is_shop_brown = (
        (shop_bar[:, :, 0] >= 75)
        & ((shop_bar[:, :, 0].astype(np.int32) - shop_bar[:, :, 2].astype(np.int32)) >= 45)
        & ((shop_bar[:, :, 0].astype(np.int32) - shop_bar[:, :, 1].astype(np.int32)) >= 22)
    )
    if float(np.mean(is_shop_brown)) > 0.18 and float(np.mean(is_back_grey)) > 0.55:
        return (48, 52, "Gem Store / Pack Shop Open -> Tap Back (48, 52)")

    # 11. Governor Profile Modal (gold banner left x=140..500, y=220..680 + blue panel right x=550..1400, y=220..680) -> Close (1454, 105)
    ban = a[220:680, 140:500]
    is_ban = (ban[:, :, 0] >= 170) & (ban[:, :, 1] >= 110) & (ban[:, :, 2] <= 60)
    pan = a[220:680, 550:1400]
    is_pan = (pan[:, :, 2] >= 120) & (pan[:, :, 0] <= 45)
    if float(np.mean(is_ban)) > 0.28 and float(np.mean(is_pan)) > 0.80:
        return (1454, 105, "Governor Profile Open -> Close (1454, 105)")

    # 11b. Building Upgrade Modal (grey header y=85..140, x=250..1350 + left teal 3D building panel x=220..650, y=200..750)
    b_hdr = a[85:140, 250:1350]
    is_b_hdr = (b_hdr[:, :, 0] >= 160) & (np.abs(b_hdr[:, :, 0].astype(np.int32) - b_hdr[:, :, 1].astype(np.int32)) < 22)
    b_lpan = a[200:750, 220:650]
    is_b_lteal = (b_lpan[:, :, 2] >= 95) & (b_lpan[:, :, 0] <= 45) & ((b_lpan[:, :, 2].astype(np.int32) - b_lpan[:, :, 0].astype(np.int32)) >= 65)
    inst_btn = a[625:820, 780:1035]
    inst_gold = (inst_btn[:, :, 0] >= 200) & (inst_btn[:, :, 1] >= 135) & (inst_btn[:, :, 2] <= 95) & ((inst_btn[:, :, 0].astype(np.int32) - inst_btn[:, :, 2].astype(np.int32)) >= 110)
    if (
        not is_city_hud(a)
        and float(np.mean(is_b_hdr)) > 0.50
        and float(np.mean(is_ql_gold)) < 0.25
        and (int(inst_gold.sum()) >= 1500 or float(np.mean(is_b_lteal)) > 0.28)
    ):
        hdr_title = ""
        if OCR is not None:
            try:
                h_res, _ = OCR(a[85:140, 480:1120].astype(np.uint8))
                if h_res:
                    hdr_title = " ".join(r[1].strip() for r in h_res)
            except Exception:
                pass
        if "vip" in hdr_title.lower():
            vip_clm = a[465:528, 1085:1200]
            is_vip_grn = (vip_clm[:, :, 1] >= 145) & (vip_clm[:, :, 0] <= 75) & (vip_clm[:, :, 2] <= 65)
            if float(np.mean(is_vip_grn)) > 0.35:
                return (1145, 495, "VIP_CLAIM_FREE_CHEST_AND_CLOSE")
            return (1380, 108, "VIP Modal Open -> Close (1380, 108)")
        if "speed" in hdr_title.lower():
            if float(np.mean(is_use1_cy)) > 0.35:
                return (1195, 355, "ROW1_USE_SPEEDUP_MODAL")
            return (1380, 108, "SPEED_UP_OUT_OF_FREE_ITEMS")
        if "busy" in hdr_title.lower():
            return (1365, 110, "CLOSE_BUSY_AND_SELECT_CH")
        yes_btn = a[665:745, 445:725]
        no_btn = a[665:745, 875:1155]
        is_yes_cy = (yes_btn[:, :, 2] >= 180) & (yes_btn[:, :, 1] >= 140) & (yes_btn[:, :, 0] <= 85)
        is_no_cy = (no_btn[:, :, 2] >= 180) & (no_btn[:, :, 1] >= 140) & (no_btn[:, :, 0] <= 85)
        if float(np.mean(is_yes_cy)) > 0.30 and (float(np.mean(is_no_cy)) > 0.30 or "notice" in hdr_title.lower()):
            return (582, 704, "Notice Beginner's Teleport Confirm -> Tap Yes (582, 704)")
        allowed_ch8 = ("city hall", "wall", "tavern", "quarry", "storehouse", "scout", "sentry", "barracks", "rack", "farm")
        ht_low = hdr_title.lower()
        if hdr_title.strip() and (
            not any(b in ht_low for b in allowed_ch8)
            or ("level 8" in ht_low and "city hall" not in ht_low)
            or "management" in ht_low
        ):
            return (1365, 110, "CLOSE_STABLE_AND_SELECT_CH")
        if int(inst_gold.sum()) >= 1500:
            upg_btn = a[625:820, 1110:1360]
            upg_cyan = (upg_btn[:, :, 2] >= 175) & (upg_btn[:, :, 1] >= 140) & (upg_btn[:, :, 0] <= 90) & ((upg_btn[:, :, 2].astype(np.int32) - upg_btn[:, :, 0].astype(np.int32)) >= 85)
            uys, uxs = np.where(upg_cyan)
            if len(uxs) >= 1500:
                ux, uy = int(np.median(uxs) + 1110), int(np.median(uys) + 625)
                return (ux, uy, f"BUILDING_UPGRADE_START:{hdr_title}")
        prereq_go = a[460:840, 800:1355]
        go_cyan = (prereq_go[:, :, 2] >= 180) & (prereq_go[:, :, 1] >= 140) & (prereq_go[:, :, 0] <= 85) & ((prereq_go[:, :, 2].astype(np.int32) - prereq_go[:, :, 0].astype(np.int32)) >= 95)
        gys, gxs = np.where(go_cyan)
        if len(gxs) >= 250:
            x_left = int(np.percentile(gxs, 5))
            first_btn = gxs <= (x_left + 145)
            gx, gy = int(np.median(gxs[first_btn]) + 800), int(np.median(gys[first_btn]) + 460)
            return (gx, gy, f"Building Upgrade Prereq ({hdr_title}) -> Tap Go ({gx}, {gy})")

    # 11c. Notice Board Wooden Modal (brown wooden header y=25..90, x=300..1300 + parchment body y=150..750, x=600..1300) -> Close (1414, 55)
    nb_hdr = a[25:90, 300:1300]
    is_nb_hdr = (
        (nb_hdr[:, :, 0] >= 130)
        & (nb_hdr[:, :, 0] <= 190)
        & (nb_hdr[:, :, 1] >= 95)
        & (nb_hdr[:, :, 1] <= 150)
        & (nb_hdr[:, :, 2] >= 50)
        & (nb_hdr[:, :, 2] <= 105)
        & ((nb_hdr[:, :, 0].astype(np.int32) - nb_hdr[:, :, 2].astype(np.int32)) >= 55)
    )
    nb_body = a[150:750, 600:1300]
    is_nb_body = (
        (nb_body[:, :, 0] >= 155)
        & (nb_body[:, :, 1] >= 135)
        & (nb_body[:, :, 2] >= 125)
        & (np.abs(nb_body[:, :, 0].astype(np.int32) - nb_body[:, :, 1].astype(np.int32)) <= 35)
    )
    if float(np.mean(is_nb_hdr)) > 0.55 and float(np.mean(is_nb_body)) > 0.55:
        return (1414, 55, "Notice Board Modal -> Close (1414, 55)")

    # 11c1. Left Kingdom Chat Drawer Open (beige chat parchment on left half x=85..820, y=80..800 + right half has no top modal header) -> Tap (860, 500)
    chat_body = a[80:800, 85:820]
    is_chat_parch = (
        (chat_body[:, :, 0] >= 195)
        & (chat_body[:, :, 1] >= 180)
        & (chat_body[:, :, 2] >= 145)
        & ((chat_body[:, :, 0].astype(np.int32) - chat_body[:, :, 2].astype(np.int32)) >= 15)
        & ((chat_body[:, :, 0].astype(np.int32) - chat_body[:, :, 2].astype(np.int32)) <= 65)
    )
    r_hdr_chk = a[20:85, 920:1350]
    is_r_hdr = (r_hdr_chk[:, :, 0] >= 150) & (np.abs(r_hdr_chk[:, :, 0].astype(np.int32) - r_hdr_chk[:, :, 1].astype(np.int32)) < 30)
    if float(np.mean(is_chat_parch)) > 0.45 and float(np.mean(is_r_hdr)) < 0.25:
        return (860, 500, "Kingdom Chat Drawer Open -> Close (860, 500)")

    # 11c2. Event Calendar Parchment Modal (tan header y=20..80, x=200..1350 spanning both left & right halves) -> Close (1386, 58) x2
    if not is_city_hud(a):
        ec_hdr = a[20:80, 200:1350]
        is_ec_hdr = (
            (ec_hdr[:, :, 0] >= 165)
            & (ec_hdr[:, :, 1] >= 135)
            & (ec_hdr[:, :, 2] >= 95)
            & ((ec_hdr[:, :, 0].astype(np.int32) - ec_hdr[:, :, 2].astype(np.int32)) >= 30)
        )
        if float(np.mean(is_ec_hdr[:, :550])) > 0.50 and float(np.mean(is_ec_hdr[:, 650:])) > 0.50:
            return (1386, 58, "EVENT_CALENDAR_CLOSE")

    # 11c3. Items Bag Modal (right beige parchment card x=1005..1365, y=200..780 + left blue grid x=130..980, y=200..780)
    if not is_city_hud(a):
        rcard = a[200:780, 1005:1365]
        is_rparch = (
            (rcard[:, :, 0] >= 185)
            & (rcard[:, :, 1] >= 170)
            & (rcard[:, :, 2] >= 135)
            & ((rcard[:, :, 0].astype(np.int32) - rcard[:, :, 2].astype(np.int32)) >= 20)
        )
        lgrid = a[200:780, 130:980]
        is_lblue = (lgrid[:, :, 2] >= 120) & (lgrid[:, :, 0] <= 65) & ((lgrid[:, :, 2].astype(np.int32) - lgrid[:, :, 0].astype(np.int32)) >= 65)
        if float(np.mean(is_rparch)) > 0.32 and float(np.mean(is_lblue)) > 0.25:
            for x0, x1, cx in [(210, 360, 285), (410, 560, 483), (605, 755, 680), (800, 950, 875)]:
                slot_red = (a[220:370, x0:x1, 0] >= 180) & (a[220:370, x0:x1, 1] <= 55) & (a[220:370, x0:x1, 2] <= 55)
                if int(slot_red.sum()) >= 500:
                    return (cx, 284, "ITEMS_REDEEM_GEMS_AND_CLOSE")
            return (1390, 112, "Items Bag Open -> Close (1390, 112)")

    # 11c4. Mail / Alliance Modal Open (grey tab bar at y=35..80, x=200..1580)
    if not is_city_hud(a):
        m_hdr = a[35:80, 200:1580]
        is_m_hdr = (m_hdr[:, :, 0] >= 150) & (np.abs(m_hdr[:, :, 0].astype(np.int32) - m_hdr[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_m_hdr[:, :1150])) > 0.55:
            if float(np.mean(is_m_hdr[:, 1260:])) < 0.35:
                return (1395, 58, "Joined Alliance Modal Open -> Close (1395, 58)")
            sys_red = (a[5:40, 470:510, 0] >= 185) & (a[5:40, 470:510, 1] <= 65) & (a[5:40, 470:510, 2] <= 65)
            if int(sys_red.sum()) >= 40:
                return (445, 58, "MAIL_CLAIM_SYSTEM_AND_CLOSE")
            return (1563, 58, "Mail Modal Open -> Close (1563, 58)")

    # 11d. Build Drawer Open (City HUD top-left hidden + left stone tab bar visible + no top modal header)
    if not is_city_hud(a):
        top_hdr = a[85:140, 250:1350]
        is_top_hdr = (top_hdr[:, :, 0] >= 150) & (np.abs(top_hdr[:, :, 0].astype(np.int32) - top_hdr[:, :, 1].astype(np.int32)) < 25)
        top_hdr2 = a[35:80, 250:1350]
        is_top_hdr2 = (top_hdr2[:, :, 0] >= 150) & (np.abs(top_hdr2[:, :, 0].astype(np.int32) - top_hdr2[:, :, 1].astype(np.int32)) < 25)
        pillar = a[500:850, 10:80]
        is_grey_pillar = float(np.mean(np.abs(pillar[:, :, 0].astype(np.int32) - pillar[:, :, 1].astype(np.int32)) < 18)) > 0.65
        if float(np.mean(is_top_hdr)) < 0.40 and float(np.mean(is_top_hdr2)) < 0.40 and float(pillar.mean()) > 80.0 and is_grey_pillar and float(a[470:510, 200:1400].mean()) > 60.0:
            slot1 = a[755:800, 320:450]
            unlocked = (slot1[:, :, 0] >= 85) & (slot1[:, :, 1] >= 190) & (slot1[:, :, 2] >= 230)
            if float(np.mean(unlocked)) > 0.40:
                return (345, 560, "Build Drawer -> Tap Unlocked Slot #1 (345, 560)")
            mil_red = ((a[570:625, 0:45, 0] >= 180) & (a[570:625, 0:45, 1] <= 70) & (a[570:625, 0:45, 2] <= 70)).sum()
            econ_yel = ((a[485:580, 15:80, 0] >= 200) & (a[485:580, 15:80, 1] >= 160) & (a[485:580, 15:80, 2] <= 70)).sum()
            if int(mil_red) >= 150 and int(econ_yel) >= 200:
                return (45, 650, "Build Drawer -> Switch to Military Tab (45, 650)")
            return (800, 200, "BUILD_DRAWER_LOCKED_SELECT_CH")

    # 12. Decorative Info / Non-Actionable Grey Modal (e.g. ELM, OAK, MORE INFO, DLC, MAIL) with no action buttons on the right half
    for y_lo, y_hi, y_c in [(85, 140, 105), (35, 80, 58)]:
        hdr = a[y_lo:y_hi, 220:1580]
        is_hdr = (hdr[:, :, 0] >= 165) & (np.abs(hdr[:, :, 0] - hdr[:, :, 1]) < 22) & (np.abs(hdr[:, :, 1] - hdr[:, :, 2]) < 28)
        col_r = np.mean(is_hdr, axis=0)
        cols = np.where(col_r > 0.55)[0]
        if float(np.mean(is_hdr[:, :900])) > 0.45 and len(cols) > 400:
            rbody = a[250:830, 750:1400]
            rgold = (rbody[:, :, 0] >= 195) & (rbody[:, :, 1] >= 130) & (rbody[:, :, 2] <= 70)
            rcyan = (rbody[:, :, 2] >= 215) & (rbody[:, :, 1] >= 165) & (rbody[:, :, 0] <= 55)
            if int(rgold.sum()) < 500 and int(rcyan.sum()) < 500:
                right_edge = 220 + int(cols[-1])
                return (right_edge - 38, y_c, f"Info Modal Open -> Close ({right_edge - 38}, {y_c})")

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
    # Exclude bottom-right HUD cyan icons & bouncing resource cart (Items, Alliance, Commander, Mail, Menu at x>=850, y>=720)
    sp[720:, 850:] = False
    # Exclude bottom-left HUD blue Build/Map buttons themselves (x<=115, y>=685; spears pointing at them sit at y=520..665)
    sp[685:, :115] = False
    # Exclude bottom-center marching soldiers & chat bar (x=165..850, y>=685) and top-right event/pack icons (x>=1100, y<=215)
    if is_city_hud(a2):
        sp[685:, 165:850] = False
        sp[:215, 1100:] = False
    if is_world_map(a2):
        sp[:, 260:] = False
        sp[:550, :] = False
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

    if best_s < 220:
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
    # Exclude Build Drawer left flaming torch (x < 165, y = 140..440), bottom chat box (y >= 785, x = 100..850), and top-right event icons
    anim_burst[140:440, :165] = False
    anim_burst[785:, 100:850] = False
    anim_burst[:215, 1100:] = False

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
    stat_burst[785:, 100:850] = False
    stat_burst[:215, 1100:] = False
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
    # Never trigger inside a modal with a grey top header or top-left grey Back button (e.g. Items Bag / Pack Shop)
    top_hdr = a[55:145, 200:1400]
    is_hdr = (top_hdr[:, :, 0] >= 150) & (np.abs(top_hdr[:, :, 0].astype(np.int32) - top_hdr[:, :, 1].astype(np.int32)) < 25)
    back_btn = a[15:85, 10:90]
    is_back = (back_btn[:, :, 0] >= 115) & (np.abs(back_btn[:, :, 0].astype(np.int32) - back_btn[:, :, 1].astype(np.int32)) < 25)
    if float(np.mean(is_hdr)) > 0.35 or float(np.mean(is_back)) > 0.45:
        return None
    r_mask = (a[:, :, 0] >= 195) & (a[:, :, 1] <= 85) & (a[:, :, 2] <= 85) & ((a[:, :, 0].astype(np.int32) - a[:, :, 1].astype(np.int32)) >= 120)
    r_mask[:60, :] = False
    r_mask[:185, 1120:] = False
    r_mask[755:, :] = False
    r_mask[:, :180] = False
    best_score, best_pt = 0, None
    for gy in range(55, 680, 20):
        for gx in range(180, 1450, 20):
            w = r_mask[gy : gy + 85, gx : gx + 85]
            c = int(w.sum())
            if c >= 380:
                ys, xs = np.where(w)
                rx, ry = int(np.median(xs) + gx), int(np.median(ys) + gy)
                y0_g, y1_g = max(60, ry - 32), min(900, ry + 32)
                x0_g, x1_g = max(0, rx + 72), min(1600, rx + 165)
                g_patch = a[y0_g:y1_g, x0_g:x1_g]
                g_mask = (
                    (g_patch[:, :, 1] >= 158)
                    & (g_patch[:, :, 0] <= 105)
                    & ((g_patch[:, :, 1].astype(np.int32) - g_patch[:, :, 2].astype(np.int32)) >= 60)
                    & ((g_patch[:, :, 1].astype(np.int32) - g_patch[:, :, 0].astype(np.int32)) >= 60)
                )
                gys, gxs = np.where(g_mask)
                if len(gxs) >= 380 and (c + len(gxs)) > best_score:
                    px = int(np.median(gxs) + x0_g)
                    py = int(np.median(gys) + y0_g)
                    if abs(py - ry) <= 22 and 80 <= (px - rx) <= 148:
                        best_score = c + len(gxs)
                        best_pt = (px, py)
    return best_pt


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
        "SEARCH",
        "Search",
        "ATTACK",
        "Attack",
        "Free",
        "FREE",
        "Go",
        "GO",
        "Bronze Age",
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
                kw.lower() in ("new troop", "speed up", "free", "bronze age") and kw.lower() in t_clean.lower()
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
                if kw.lower() == "help" and cy < 720:
                    continue
                if is_colored_button(a, cx, cy):
                    return (cx, cy, t_clean)
    return None


def detect_quest_sidebar_action(a: np.ndarray, step: int):
    # Ensure Main HUD Top-Left Avatar (15..75, 15..75) is visible (not hidden by Build Drawer or full-screen modal)
    if not is_city_hud(a):
        # If full-screen or top-aligned modal header bar (Items/Quests/Settings/ELM/Governor/DLC/Mail/Train) is open, tap its exact X button (right_edge - 38)
        for y_center in (105, 58):
            row = a[y_center - 15 : y_center + 15, 500:1590]
            is_hdr = (row.mean(axis=2) > 125.0) & (np.abs(row[:, :, 0] - row[:, :, 1]) < 25)
            xs_hdr = np.where(is_hdr.mean(axis=0) > 0.50)[0]
            if len(xs_hdr) > 400:
                right_edge = int(xs_hdr.max() + 500)
                if right_edge < 1585 or y_center == 58:
                    x_close = right_edge - 38
                    return (x_close, y_center, f"Modal Open -> Close ({x_close}, {y_center})")
        # Check if Build Drawer Slot #1 (x=320..450, y=755..800) has an unlocked bright-cyan card
        slot1 = a[755:800, 320:450]
        unlocked = (slot1[:, :, 0] >= 85) & (slot1[:, :, 1] >= 190) & (slot1[:, :, 2] >= 230)
        if float(np.mean(unlocked)) > 0.45:
            return (345, 560, "Build Drawer -> Tap Unlocked Slot #1")
        # If Build Drawer stone pillar is visible on left (x=10..80, y=500..850) with locked Slot #1, tap (800, 200) to close
        pillar = a[500:850, 10:80]
        if float(pillar.mean()) > 95.0 and float(np.mean(np.abs(pillar[:, :, 0] - pillar[:, :, 1]) < 25)) > 0.55:
            return (800, 200, "Build Drawer Locked -> Close (800, 200)")
        # If top-left Back button (48, 52) is visible (Commander/Tavern view), tap (48, 52)
        back_btn = a[20:85, 20:85]
        if float(back_btn.mean()) > 110.0 and float(np.mean(np.abs(back_btn[:, :, 0] - back_btn[:, :, 1]) < 25)) > 0.55:
            return (48, 52, "Sub-Screen Open -> Tap Back (48, 52)")
        return None

    # 0. If idle on the World Map (no spear, no barbarian search, no map popup), return to City (55, 845)
    if is_world_map(a):
        return (55, 845, "World Map Idle -> Return to City (55, 845)")

    # 1. Check for completed Main or Side Quest pink gift icon at x=195..245, y=285..640 (pick topmost first)
    sub = a[285:640, 195:245]
    pink = (sub[:, :, 0] >= 200) & (sub[:, :, 1] <= 100) & (sub[:, :, 2] >= 170)
    ys, xs = np.where(pink)
    if len(xs) >= 35:
        gy = int(np.percentile(ys, 15) + 285)
        return (120, gy + 15, "Claim Completed Quest Gift")

    # 2. Anchor on Main Quest Card (120, 325) & Swipe to Select City Hall directly
    quest_card = a[305:345, 50:180]
    if float(quest_card[:, :, 1].mean()) < 98.0:
        return (120, 325, "SELECT_CITY_HALL_VIA_ANCHOR")
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
    log_path = os.path.join(SCRIPT_DIR, f"auto_tut_{adb_port}.log")
    import builtins as _builtins
    _orig_print = _builtins.print
    def print(*p_args, **p_kwargs):
        _orig_print(*p_args, **p_kwargs)
        try:
            msg = " ".join(str(x) for x in p_args)
            with open(log_path, "a", encoding="utf-8", errors="replace") as lf:
                lf.write(f"[{time.strftime('%H:%M:%S')}] {msg}\n")
        except Exception:
            pass

    last_spear = None
    repeat_cnt = 0
    speedup_cooldown = 0
    quest_scroll_cooldown = 0
    cavalry_cooldown = 0
    checked_items_bag = False
    checked_vip_chest = False
    checked_alliance_join = False
    checked_mail = False
    last_rib_xy = None
    rib_retry_cnt = 0
    chk_repeat = 0

    for step in range(1, args.steps + 1):
        if speedup_cooldown > 0:
            speedup_cooldown -= 1
        if quest_scroll_cooldown > 0:
            quest_scroll_cooldown -= 1
        if cavalry_cooldown > 0:
            cavalry_cooldown -= 1
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
            chk_repeat += 1
            if chk_repeat >= 2:
                rx_cancel = max(180, chk[0] - 108)
                print(f"[Step {step:02d}] Green Checkmark Repeated ({chk_repeat}x) -> Tap Check {chk} + Cancel Red X ({rx_cancel}, {chk[1]})")
                tap(args.adb, chk[0], chk[1], 0.9)
                tap(args.adb, rx_cancel, chk[1], 1.0)
                chk_repeat = 0
            else:
                print(f"[Step {step:02d}] Green Checkmark -> tap {chk}")
                tap(args.adb, chk[0], chk[1], 1.1)
            last_spear = None
            repeat_cnt = 0
            continue
        chk_repeat = 0

        nt = detect_new_troop_modal(a2)
        if nt:
            if nt[2] == "VENGEANCE_QUICK_DEPLOY_AND_START":
                print(f"[Step {step:02d}] Vengeance -> Cmdr1 (110,265) + Cmdr2 (265,265) + QUICK DEPLOY (650,790) + START (945,790)")
                tap(args.adb, 110, 265, 1.0)
                tap(args.adb, 265, 265, 1.0)
                tap(args.adb, 650, 790, 1.2)
                tap(args.adb, 945, 790, 6.0)
            elif nt[2] == "VENGEANCE_CAST_SKILL_AND_EXIT":
                print(f"[Step {step:02d}] Vengeance Active Skill (256,437) -> Wait Victory -> HOME (392,760) + Exit (48,52)")
                tap(args.adb, 256, 437, 8.5)
                tap(args.adb, 392, 760, 2.0)
                tap(args.adb, 48, 52, 1.5)
            elif nt[2] == "COMMANDER_UPGRADE_MODAL":
                print(f"[Step {step:02d}] Commander Upgrade Modal -> QUICK LEVEL (1225,371)x6 + Close (1380,112) + Back (48,52)")
                for _ in range(6):
                    tap(args.adb, 1225, 371, 0.45)
                time.sleep(0.6)
                tap(args.adb, 1380, 112, 1.0)
                tap(args.adb, 48, 52, 1.1)
            elif nt[2] == "BUILDING_SPEEDUP_MODAL":
                print(f"[Step {step:02d}] Building Speed Up Modal -> QUICK USE (1225,371) + Row 2 USE (1225,525) + CONFIRM (590,675)")
                tap(args.adb, 1225, 371, 1.0)
                tap(args.adb, 1225, 525, 0.85)
                tap(args.adb, 590, 675, 0.85)
            elif nt[2] == "ROW1_USE_SPEEDUP_MODAL":
                print(f"[Step {step:02d}] Row 1 USE Speed Up Modal -> USE (1195,355) + CONFIRM (590,675)")
                tap(args.adb, 1195, 355, 0.85)
                tap(args.adb, 590, 675, 0.85)
            elif nt[2] == "BUILDING_SPEEDUP_GEM_60M_KEEP_OPEN":
                print(f"[Step {step:02d}] Building Speed Up (60m Gem 120, Keep Open) -> PURCHASE&USE (1194,636) + CONFIRM (590,675)")
                tap(args.adb, 1194, 636, 1.0)
                tap(args.adb, 590, 675, 1.0)
            elif nt[2] == "BUILDING_SPEEDUP_GEM_60M":
                print(f"[Step {step:02d}] Building Speed Up (60m Gem 120) -> PURCHASE&USE (1194,636) + CONFIRM (590,675)x2")
                tap(args.adb, 1194, 636, 1.0)
                tap(args.adb, 590, 675, 0.9)
                tap(args.adb, 590, 675, 0.9)
            elif nt[2] == "BUILDING_SPEEDUP_GEM_15M_KEEP_OPEN":
                print(f"[Step {step:02d}] Building Speed Up (15m Gem 40, Keep Open) -> PURCHASE&USE (1195,478) + CONFIRM (590,675)")
                tap(args.adb, 1195, 478, 1.0)
                tap(args.adb, 590, 675, 1.0)
            elif nt[2] == "BUILDING_SPEEDUP_GEM_15M":
                print(f"[Step {step:02d}] Building Speed Up (15m Gem 40) -> PURCHASE&USE (1195,478) + CONFIRM (590,675)x2")
                tap(args.adb, 1195, 478, 1.0)
                tap(args.adb, 590, 675, 0.9)
                tap(args.adb, 590, 675, 0.9)
            elif nt[2] == "BUILDING_SPEEDUP_GEM_1M":
                print(f"[Step {step:02d}] Building Speed Up (1m Gem 3) -> PURCHASE&USE (1196,320) + CONFIRM (590,675)")
                tap(args.adb, 1196, 320, 1.0)
                tap(args.adb, 590, 675, 1.0)
            elif nt[2] == "QUESTS_MODAL_CLAIM":
                print(f"[Step {step:02d}] Quests Modal -> Claiming Completed Quests ({nt[0]}, {nt[1]}) x5 + Activity Chests + Reset Speedup Cooldown")
                speedup_cooldown = 0
                for _ in range(5):
                    tap(args.adb, nt[0], nt[1], 0.48)
                if nt[1] >= 390:
                    for cx_chest in (440, 650, 875, 1095, 1300):
                        tap(args.adb, cx_chest, 275, 0.45)
                        tap(args.adb, 800, 750, 0.35)
            elif nt[2] == "QUESTS_MODAL_MAIN_GO":
                print(f"[Step {step:02d}] Quests Modal -> Tap Main Quest GO (1258, 325)")
                quest_scroll_cooldown = 10
                tap(args.adb, 1258, 325, 1.4)
            elif nt[2] == "QUESTS_MODAL_CLOSE":
                print(f"[Step {step:02d}] Quests Modal (No Claim) -> Close (1380, 108)")
                quest_scroll_cooldown = 8
                tap(args.adb, 1380, 108, 1.0)
            elif nt[2] == "SPEED_UP_OUT_OF_FREE_ITEMS":
                speedup_cooldown = 12
                tap(args.adb, 1380, 108, 1.0)
                if not checked_items_bag:
                    checked_items_bag = True
                    print(f"[Step {step:02d}] Speed Up Out of Free Items -> Close (1380,108) + Check Items Bag RESOURCES (1045,845)->(200,112)")
                    tap(args.adb, 1045, 845, 1.2)
                    tap(args.adb, 200, 112, 0.8)
                elif quest_scroll_cooldown == 0:
                    print(f"[Step {step:02d}] Speed Up Out of Free Items -> Close (1380,108) + Open Quest Scroll (45,225) + Daily Objectives (85,415)")
                    tap(args.adb, 45, 225, 1.2)
                    tap(args.adb, 85, 415, 1.0)
                else:
                    print(f"[Step {step:02d}] Speed Up Out of Free Items -> Close (1380,108)")
            elif nt[2] == "CLOSE_BUSY_AND_SELECT_CH":
                if speedup_cooldown == 0:
                    print(f"[Step {step:02d}] Builders Busy Modal -> Direct Tap Queue #1 SPEED UP (1163, 433)")
                    tap(args.adb, 1163, 433, 1.1)
                else:
                    print(f"[Step {step:02d}] Builders Busy Modal (cooldown={speedup_cooldown}) -> Close Busy (1365,110) + Close Upgrade (1365,110)")
                    tap(args.adb, 1365, 110, 0.9)
                    tap(args.adb, 1365, 110, 1.0)
                    if quest_scroll_cooldown == 0:
                        tap(args.adb, 45, 225, 1.2)
                        tap(args.adb, 85, 415, 1.0)
            elif nt[2].startswith("BUILDING_UPGRADE_START"):
                if "city hall" in nt[2].lower() and ("level 8" in nt[2].lower() or "lv.8" in nt[2].lower() or "lv. 8" in nt[2].lower()):
                    print(f"[Step {step:02d}] City Hall Level 8 Upgrade ({nt[2]}) -> Tap Upgrade ({nt[0]}, {nt[1]}) + Confirm Beginner's Teleport Yes (582, 704) + Help (1170, 735)")
                    tap(args.adb, nt[0], nt[1], 1.4)
                    tap(args.adb, 582, 704, 1.4)
                    tap(args.adb, 1170, 735, 1.0)
                else:
                    sel_x, sel_y = (420, 360) if ("city hall" in nt[2].lower() and "16416" in str(args.adb)) else (800, 420)
                    print(f"[Step {step:02d}] Building Upgrade Modal ({nt[2]}) -> Tap Upgrade ({nt[0]}, {nt[1]}) + Free/Select ({sel_x}, {sel_y})")
                    tap(args.adb, nt[0], nt[1], 1.4)
                    tap(args.adb, sel_x, sel_y, 1.0)
            elif nt[2] == "CLOSE_STABLE_AND_SELECT_CH":
                print(f"[Step {step:02d}] Upgrade Stable Modal -> Close (1365, 110) + Select City Hall via Anchor")
                tap(args.adb, 1365, 110, 1.0)
                select_city_hall_via_anchor(args.adb, None)
            elif nt[2] == "BUILD_DRAWER_LOCKED_SELECT_CH":
                print(f"[Step {step:02d}] Build Drawer Locked -> Close (800, 200) + Select City Hall via Anchor")
                tap(args.adb, 800, 200, 1.0)
                select_city_hall_via_anchor(args.adb, None)
            elif nt[2] == "ITEMS_REDEEM_GEMS_AND_CLOSE":
                print(f"[Step {step:02d}] Items Bag Free Gems -> Redeem ({nt[0]},{nt[1]}) x2 (+340 Gems) + Close (1390, 112)")
                speedup_cooldown = 0
                for _ in range(2):
                    tap(args.adb, nt[0], nt[1], 0.8)
                    tap(args.adb, 1332, 668, 0.5)
                    tap(args.adb, 1210, 775, 1.0)
                tap(args.adb, 1390, 112, 1.0)
            elif nt[2] == "EVENT_CALENDAR_CLOSE":
                print(f"[Step {step:02d}] Event Calendar Open -> Close (1386, 58) x2")
                tap(args.adb, 1386, 58, 0.8)
                tap(args.adb, 1386, 58, 1.0)
            elif nt[2] == "MAIL_CLAIM_SYSTEM_AND_CLOSE":
                print(f"[Step {step:02d}] Mail Open (System Badge) -> Tap SYSTEM (445,58) + Read/Claim + Close (1563,58)")
                tap(args.adb, 445, 58, 1.0)
                tap(args.adb, 145, 845, 0.8)
                tap(args.adb, 800, 750, 0.8)
                tap(args.adb, 250, 200, 0.8)
                tap(args.adb, 1420, 820, 0.8)
                tap(args.adb, 800, 750, 0.8)
                tap(args.adb, 1563, 58, 1.0)
            elif nt[2] == "VIP_CLAIM_FREE_CHEST_AND_CLOSE":
                print(f"[Step {step:02d}] VIP Modal Open -> Claim Free Daily Chest (1145,495) + Dismiss (800,750) + Close (1380,108)")
                speedup_cooldown = 0
                tap(args.adb, 1260, 225, 2.2)
                tap(args.adb, 1145, 495, 1.4)
                tap(args.adb, 800, 750, 1.0)
                tap(args.adb, 1380, 108, 1.0)
            elif nt[2] == "ALLIANCE_JOIN_AND_CLOSE":
                print(f"[Step {step:02d}] Alliance Modal Open -> Join Open Alliance ({nt[0]}, {nt[1]}) + Close (1380,108)/(1563,58)")
                speedup_cooldown = 0
                quest_scroll_cooldown = 0
                tap(args.adb, nt[0], nt[1], 2.2)
                tap(args.adb, 1380, 108, 1.0)
                tap(args.adb, 1563, 58, 1.0)
            elif nt[2] == "COMMANDER_LEVEL_UP_5":
                print(f"[Step {step:02d}] Commander Screen -> Level Up (1515,363) + QUICK LEVEL (1225,371)x6 + Close (1380,112) + Back (48,52)")
                tap(args.adb, 1515, 363, 1.2)
                for _ in range(6):
                    tap(args.adb, 1225, 371, 0.45)
                time.sleep(0.6)
                tap(args.adb, 1380, 112, 1.0)
                tap(args.adb, 48, 52, 1.1)
            elif nt[2] == "COMMANDER_SLOT2_LEVEL_UP_5":
                print(f"[Step {step:02d}] Commander Slot #2 -> Clear Star-Up Spear (1515,363)+(1366,112) + Select Slot #2 (235,255) + Level Up (1515,363) + QUICK LEVEL x6 + Close (1380,112) + Back (48,52)")
                tap(args.adb, 1515, 363, 1.0)
                tap(args.adb, 1366, 112, 1.0)
                tap(args.adb, 235, 255, 1.2)
                tap(args.adb, 1515, 363, 1.2)
                for _ in range(6):
                    tap(args.adb, 1225, 371, 0.45)
                time.sleep(0.6)
                tap(args.adb, 1380, 112, 1.0)
                tap(args.adb, 48, 52, 1.1)
            elif nt[2] == "COMMANDER_SKILL_UPGRADE":
                print(f"[Step {step:02d}] Commander Skill Upgrade -> SKILLS ({nt[0]},{nt[1]}) + Dialogue (800,780) + UPGRADE (1217,812) + Back (48,52)x2")
                tap(args.adb, nt[0], nt[1], 1.5)
                tap(args.adb, 800, 780, 1.0)
                tap(args.adb, 1217, 812, 1.5)
                tap(args.adb, 48, 52, 1.2)
                tap(args.adb, 48, 52, 1.2)
            elif nt[2] == "COMMANDER_SKILL_MODAL_UPGRADE":
                print(f"[Step {step:02d}] Commander Skill Modal -> Dialogue (800,780) + UPGRADE (1217,812) + Back (48,52)x2")
                tap(args.adb, 800, 780, 1.0)
                tap(args.adb, 1217, 812, 1.5)
                tap(args.adb, 48, 52, 1.2)
                tap(args.adb, 48, 52, 1.2)
            elif nt[2] == "TAVERN_CONFIRM_AND_EXIT":
                print(f"[Step {step:02d}] Tavern Chest Result -> Confirm ({nt[0]},{nt[1]}) + Back (48,52)")
                tap(args.adb, nt[0], nt[1], 1.2)
                tap(args.adb, 48, 52, 1.2)
            elif nt[2] == "NOTICE_NO_AND_EXIT":
                print(f"[Step {step:02d}] Notice Modal -> NO (1027,675) + Back (48,52)")
                tap(args.adb, 1027, 675, 1.0)
                tap(args.adb, 48, 52, 1.2)
            elif nt[2] == "INSUFFICIENT_GEMS_CLOSE_AND_EXIT":
                print(f"[Step {step:02d}] Insufficient Gems -> Close (1263,190) + Confirm Chest (628,805) + Back (48,52)")
                tap(args.adb, 1263, 190, 1.0)
                tap(args.adb, 628, 805, 1.2)
                tap(args.adb, 48, 52, 1.2)
            else:
                print(f"[Step {step:02d}] {nt[2]} -> tap ({nt[0]}, {nt[1]})")
                tap(args.adb, nt[0], nt[1], 1.1)
            last_spear = None
            repeat_cnt = 0
            continue

        spear_xy, target_xy, bcnt = detect_spear_and_starburst(a1, a2)

        # Claim completed Main/Side Quest pink gift icon BEFORE following passive building-selection spears
        if is_city_hud(a2) and not is_world_map(a2) and not (spear_xy and spear_xy[0] < 260):
            sub_q = a2[285:640, 195:245]
            pink_q = (sub_q[:, :, 0] >= 200) & (sub_q[:, :, 1] <= 100) & (sub_q[:, :, 2] >= 170)
            qys, qxs = np.where(pink_q)
            if len(qxs) >= 35:
                gy = int(np.percentile(qys, 15) + 285)
                print(f"[Step {step:02d}] Completed Quest Gift -> tap (120, {gy + 15})")
                tap(args.adb, 120, gy + 15, 1.1)
                last_spear = None
                repeat_cnt = 0
                continue
            # Also check for Alliance Help red badge on bottom HUD (expanded at 1170,735 or collapsed at 1432,845)
            ah_exp_red_g = (a2[680:740, 1170:1220, 0] >= 185) & (a2[680:740, 1170:1220, 1] <= 65) & (a2[680:740, 1170:1220, 2] <= 65)
            if int(ah_exp_red_g.sum()) >= 80:
                print(f"[Step {step:02d}] Expanded Alliance Help Bubble ({int(ah_exp_red_g.sum())}px) -> Tap (1170, 735)")
                if "16384" in str(args.adb):
                    tap(args.adb, 1515, 495, 0.8)
                tap(args.adb, 1170, 735, 1.0)
                last_spear = None
                repeat_cnt = 0
                continue
            ah_col_red_g = (a2[795:840, 1440:1480, 0] >= 185) & (a2[795:840, 1440:1480, 1] <= 65) & (a2[795:840, 1440:1480, 2] <= 65)
            ah_col_cream_g = float(a2[825:875, 1405:1455, 0].mean()) > float(a2[825:875, 1405:1455, 2].mean()) + 15.0
            if int(ah_col_red_g.sum()) >= 80 and ah_col_cream_g:
                print(f"[Step {step:02d}] Collapsed Alliance Help Bubble ({int(ah_col_red_g.sum())}px) -> Tap (1432, 845)")
                tap(args.adb, 1432, 845, 1.0)
                last_spear = None
                repeat_cnt = 0
                continue
            # Also check if the top-left Quest Scroll icon (45, 225) has a red notification badge (completed quests inside modal)
            if quest_scroll_cooldown == 0:
                q_badge = a2[165:215, 45:100]
                is_q_red = (q_badge[:, :, 0] >= 190) & (q_badge[:, :, 1] <= 60) & (q_badge[:, :, 2] <= 60)
                if int(is_q_red.sum()) >= 120:
                    print(f"[Step {step:02d}] Quest Scroll Red Badge ({int(is_q_red.sum())}px) -> Open Quests Modal (45, 225)")
                    tap(args.adb, 45, 225, 1.3)
                    last_spear = None
                    repeat_cnt = 0
                    continue
            # If a City Building or Obstacle is selected (blue title ribbon at y=25..600, x=175..1550)
            rib = a2[25:600, 175:1550]
            is_rib = (rib[:, :, 2] >= 145) & (rib[:, :, 0] <= 55) & ((rib[:, :, 2].astype(np.int32) - rib[:, :, 0].astype(np.int32)) >= 100)
            best_r, rib_cx, rib_cy = 0, None, None
            for ry in range(0, is_rib.shape[0] - 85, 25):
                for rx in range(0, is_rib.shape[1] - 360, 45):
                    rw = is_rib[ry : ry + 95, rx : rx + 390]
                    rc = int(rw.sum())
                    if rc > best_r:
                        best_r = rc
                        rys, rxs = np.where(rw)
                        rib_cx, rib_cy = int(np.median(rxs) + 175 + rx), int(np.median(rys) + 25 + ry)
            if best_r >= 3500 and rib_cx is not None and rib_cy is not None:
                y_lo, y_hi = max(180, rib_cy + 130), min(895, rib_cy + 500)
                x_lo, x_hi = max(160, rib_cx - 240), min(1580, rib_cx + 240)
                hex_sub = a2[y_lo:y_hi, x_lo:x_hi]
                is_pure_grn = (
                    (hex_sub[:, :, 1] >= 155)
                    & (hex_sub[:, :, 0] <= 105)
                    & ((hex_sub[:, :, 1].astype(np.int32) - hex_sub[:, :, 0].astype(np.int32)) >= 60)
                    & ((hex_sub[:, :, 1].astype(np.int32) - hex_sub[:, :, 2].astype(np.int32)) >= 40)
                )
                is_yel_spd = (
                    (hex_sub[:, :, 0] >= 200)
                    & (hex_sub[:, :, 1] >= 150)
                    & (hex_sub[:, :, 2] <= 75)
                    & ((hex_sub[:, :, 0].astype(np.int32) - hex_sub[:, :, 2].astype(np.int32)) >= 125)
                )
                is_purp_free = (
                    (hex_sub[:, :, 0] >= 145)
                    & (hex_sub[:, :, 2] >= 175)
                    & (hex_sub[:, :, 1] <= 95)
                    & ((hex_sub[:, :, 2].astype(np.int32) - hex_sub[:, :, 1].astype(np.int32)) >= 85)
                )
                is_blue_info = (
                    (hex_sub[:, :, 2] >= 170)
                    & (hex_sub[:, :, 1] >= 110)
                    & (hex_sub[:, :, 0] <= 65)
                    & ((hex_sub[:, :, 2].astype(np.int32) - hex_sub[:, :, 0].astype(np.int32)) >= 115)
                )
                best_g, gx, gy = 0, None, None
                best_p, px, py = 0, None, None
                best_y, yx, yy = 0, None, None
                best_i = 0
                for wy in range(0, max(1, hex_sub.shape[0] - 80), 15):
                    for wx in range(0, max(1, hex_sub.shape[1] - 80), 15):
                        wg = is_pure_grn[wy : wy + 85, wx : wx + 85]
                        cg = int(wg.sum())
                        if cg > best_g:
                            best_g = cg
                            wys, wxs = np.where(wg)
                            gx, gy = int(np.median(wxs) + x_lo + wx), int(np.median(wys) + y_lo + wy)
                        wp = is_purp_free[wy : wy + 85, wx : wx + 85]
                        cp = int(wp.sum())
                        if cp > best_p:
                            best_p = cp
                            wys, wxs = np.where(wp)
                            px, py = int(np.median(wxs) + x_lo + wx), int(np.median(wys) + y_lo + wy)
                        wy_w = is_yel_spd[wy : wy + 85, wx : wx + 85]
                        cy = int(wy_w.sum())
                        if cy > best_y and (x_lo + wx) <= rib_cx + 120:
                            best_y = cy
                            wys, wxs = np.where(wy_w)
                            yx, yy = int(np.median(wxs) + x_lo + wx), int(np.median(wys) + y_lo + wy)
                        ci = int(is_blue_info[wy : wy + 85, wx : wx + 85].sum())
                        if ci > best_i:
                            best_i = ci
                if best_p >= 380 and px is not None and py is not None:
                    print(f"[Step {step:02d}] Selected Upgrading Building Free Hex ({best_p}px) -> tap ({px}, {py})")
                    tap(args.adb, px, py, 1.2)
                    last_spear = None
                    repeat_cnt = 0
                    continue
                rib_title = ""
                if OCR is not None and (best_g >= 240 or best_y >= 350):
                    try:
                        r_res, _ = OCR(a2[max(0, rib_cy - 55) : min(900, rib_cy + 55), max(0, rib_cx - 210) : min(1600, rib_cx + 210)].astype(np.uint8))
                        if r_res:
                            rib_title = " ".join(r[1].strip() for r in r_res).lower()
                    except Exception:
                        pass
                allowed_ch8_rib = ("city hall", "cityhall", "hall", "yh", "wall", "tavern", "vern", "quarry", "storehouse", "store", "scout", "sentry", "arry", "barracks", "rack", "farm", "stable", "siege", "workshop")
                is_ch_selected = ("hall" in rib_title) or ("yh" in rib_title) or (rib_title.strip() == "" and best_y >= 1800)
                rib_nospace = rib_title.replace(" ", "").replace(".", "")
                is_already_lv7_prereq = (not is_ch_selected) and ("level7" in rib_nospace or "evel7" in rib_nospace)
                is_non_ch8_rib = is_already_lv7_prereq or ((not is_ch_selected) and rib_title.strip() != "" and not any(b in rib_title for b in allowed_ch8_rib))
                if is_non_ch8_rib and (best_g >= 240 or best_y >= 350):
                    print(f"[Step {step:02d}] Non-CH8/Duplicate Building Selected ('{rib_title}') -> Select City Hall via Anchor")
                    select_city_hall_via_anchor(args.adb, p2)
                    last_spear = None
                    repeat_cnt = 0
                    continue
                if any(k in rib_title for k in ("stable", "siege", "workshop")) and gx is not None and gy is not None:
                    tx_tr, ty_tr = min(1560, gx + 135), max(180, gy - 25)
                    print(f"[Step {step:02d}] Troop Building Selected ('{rib_title}') -> Tap Train Hex ({tx_tr}, {ty_tr}) + TRAIN (1215, 760)")
                    tap(args.adb, tx_tr, ty_tr, 1.4)
                    tap(args.adb, 1215, 760, 1.2)
                    select_city_hall_via_anchor(args.adb, None)
                    last_spear = None
                    repeat_cnt = 0
                    continue
                if best_y >= 850 and best_y > best_g and yx is not None and yy is not None:
                    if speedup_cooldown == 0:
                        print(f"[Step {step:02d}] Selected Building SpeedUp Hex ({best_y}px, '{rib_title}') -> tap ({yx}, {yy})")
                        tap(args.adb, yx, yy, 1.2)
                    elif quest_scroll_cooldown == 0:
                        print(f"[Step {step:02d}] Selected Building Actively Upgrading (cooldown={speedup_cooldown}) -> Open Quest Scroll (45,225) + Daily Objectives (85,415)")
                        tap(args.adb, 45, 225, 1.2)
                        tap(args.adb, 85, 415, 1.0)
                    else:
                        ah_col_red = (a2[795:840, 1440:1480, 0] >= 185) & (a2[795:840, 1440:1480, 1] <= 65) & (a2[795:840, 1440:1480, 2] <= 65)
                        ah_col_cream = float(a2[825:875, 1405:1455, 0].mean()) > float(a2[825:875, 1405:1455, 2].mean()) + 15.0
                        ah_exp_red = (a2[680:740, 1170:1220, 0] >= 185) & (a2[680:740, 1170:1220, 1] <= 65) & (a2[680:740, 1170:1220, 2] <= 65)
                        vip_red = (a2[55:80, 130:160, 0] >= 185) & (a2[55:80, 130:160, 1] <= 65) & (a2[55:80, 130:160, 2] <= 65)
                        mail_red = (a2[775:825, 1430:1475, 0] >= 185) & (a2[775:825, 1430:1475, 1] <= 65) & (a2[775:825, 1430:1475, 2] <= 65)
                        mq_side_txt = ""
                        if "16384" in str(args.adb) and cavalry_cooldown == 0 and OCR is not None:
                            try:
                                mq_res, _ = OCR(a2[280:385, 10:190].astype(np.uint8))
                                if mq_res:
                                    mq_side_txt = " ".join(r[1].strip() for r in mq_res).lower()
                            except Exception:
                                pass
                        if int(ah_col_red.sum()) >= 80 and ah_col_cream:
                            print(f"[Step {step:02d}] Building Actively Upgrading (cooldown={speedup_cooldown}) -> Tap Collapsed Alliance Help Bubble (1432, 845)")
                            tap(args.adb, 1432, 845, 1.0)
                        elif int(ah_exp_red.sum()) >= 80:
                            print(f"[Step {step:02d}] Building Actively Upgrading (cooldown={speedup_cooldown}) -> Tap Expanded Alliance Help Bubble (1170, 735)")
                            if "16384" in str(args.adb):
                                tap(args.adb, 1515, 495, 0.8)
                            tap(args.adb, 1170, 735, 1.0)
                        elif (not checked_vip_chest) and int(vip_red.sum()) >= 45:
                            checked_vip_chest = True
                            print(f"[Step {step:02d}] Building Actively Upgrading -> Claim Free Daily VIP Points & Chests (115, 80)")
                            tap(args.adb, 115, 80, 1.5)
                            tap(args.adb, 1260, 225, 2.5)
                            tap(args.adb, 1145, 495, 1.4)
                            tap(args.adb, 800, 750, 1.0)
                            tap(args.adb, 1380, 108, 1.0)
                        elif (not checked_mail) and int(mail_red.sum()) >= 45:
                            checked_mail = True
                            print(f"[Step {step:02d}] Building Actively Upgrading -> Check Mail Rewards (1415, 845)")
                            tap(args.adb, 1415, 845, 1.4)
                        elif any(w in mq_side_txt for w in ("cavalry", "siege", "behemoth", "together", "alliance")):
                            cavalry_cooldown = 16
                            print(f"[Step {step:02d}] Building Actively Upgrading -> Tap Main Quest '{mq_side_txt[:24]}' (80, 330)")
                            tap(args.adb, 80, 330, 1.4)
                        else:
                            print(f"[Step {step:02d}] Building Actively Upgrading (cooldown={speedup_cooldown}, '{rib_title}') -> Waiting on Timer")
                            time.sleep(2.0)
                    last_spear = None
                    repeat_cnt = 0
                    continue
                if (best_g >= 550 or (best_g >= 240 and best_i >= 500)) and gx is not None and gy is not None:
                    gy_safe = min(785, gy)
                    print(f"[Step {step:02d}] Selected Building Pure-Green Upgrade Hex ({best_g}px, '{rib_title}') -> tap ({gx}, {gy_safe})")
                    tap(args.adb, gx, gy_safe, 1.2)
                    last_spear = None
                    repeat_cnt = 0
                    continue
                # If NO Info hexagon is open yet (best_i < 600), the building was highlighted by 'GO' -> pan if near bottom/right edge or tap below ribbon!
                if best_i < 600:
                    if last_rib_xy and abs(rib_cx - last_rib_xy[0]) < 45 and abs(rib_cy - last_rib_xy[1]) < 45:
                        rib_retry_cnt += 1
                    else:
                        rib_retry_cnt = 0
                    last_rib_xy = (rib_cx, rib_cy)
                    if rib_retry_cnt >= 2:
                        print(f"[Step {step:02d}] Building Stuck Without Info Hex ({rib_cx},{rib_cy}) -> Select City Hall via Anchor")
                        last_rib_xy = None
                        rib_retry_cnt = 0
                        select_city_hall_via_anchor(args.adb, p2)
                    elif rib_cy >= 520 or rib_cx >= 1260:
                        print(f"[Step {step:02d}] Building Near Bottom/Right Edge ({rib_cx},{rib_cy}) -> Swipe Up-Left (1150,650)->(650,350)")
                        swipe(args.adb, 1150, 650, 650, 350, 400, 1.0)
                    else:
                        y_off = 105 if rib_retry_cnt == 0 else 75
                        bx_tap, by_tap = rib_cx, min(790, rib_cy + y_off)
                        print(f"[Step {step:02d}] Building Highlighted by GO ({rib_cx},{rib_cy}, retry={rib_retry_cnt}) -> Tap Building ({bx_tap}, {by_tap})")
                        tap(args.adb, bx_tap, by_tap, 1.2)
                    last_spear = None
                    repeat_cnt = 0
                    continue
                last_rib_xy = None
                rib_retry_cnt = 0
                # Otherwise a decorative tree/obstacle (e.g. Elm/Road with only Info hex) is selected -> Select City Hall via Anchor (unless a tutorial spear is active)
                if not (spear_xy and target_xy):
                    print(f"[Step {step:02d}] Decorative Obstacle Selected (Only Info Hex) -> Select City Hall via Anchor")
                    select_city_hall_via_anchor(args.adb, p2)
                    last_spear = None
                    repeat_cnt = 0
                    continue
            # If no building is selected, periodically check for an active building upgrade lime-green square badge (to speed it up or Free finish)
            if speedup_cooldown == 0 and step % 2 == 1 and not (spear_xy and target_xy):
                sub_l = a2[120:892, 165:1350]
                lime = (
                    (sub_l[:, :, 1] >= 195)
                    & (sub_l[:, :, 0] <= 75)
                    & (sub_l[:, :, 2] <= 35)
                    & ((sub_l[:, :, 1].astype(np.int32) - sub_l[:, :, 0].astype(np.int32)) >= 130)
                )
                lime[680:, :360] = False
                lime[660:, 685:] = False
                best_l, bx, by = 0, None, None
                for gy in range(0, lime.shape[0] - 35, 15):
                    for gx in range(0, lime.shape[1] - 35, 15):
                        c = int(lime[gy : gy + 35, gx : gx + 35].sum())
                        if c >= 85:
                            cand_x, cand_y = gx + 165 + 17, gy + 120 + 17
                            score = c * 2 if (480 <= cand_x <= 650 and 380 <= cand_y <= 520) else c
                            if score > best_l:
                                best_l = score
                                bx, by = cand_x, cand_y
                if best_l >= 85 and bx is not None and by is not None:
                    print(f"[Step {step:02d}] Active Building Upgrade Badge ({bx},{by}) -> Select Building ({bx + 55}, {by - 55})")
                    tap(args.adb, bx + 55, by - 55, 1.1)
                    last_spear = None
                    repeat_cnt = 0
                    continue

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
            if q_act[2] == "SELECT_CITY_HALL_VIA_ANCHOR":
                print(f"[Step {step:02d}] Quest Sidebar -> Select City Hall via Anchor")
                select_city_hall_via_anchor(args.adb, p2)
            else:
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

