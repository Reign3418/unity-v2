"""
VALHEON UNITY // KINGDOM #4197 MULTI-BOT SWARM ORCHESTRATOR & BLACK-BOX RECORDER
===============================================================================
Dedicated exclusively to Kingdom #4197 (Kingdom of Belerion) on SIDEKICK:
  1. Respects active tasks before taking over any emulator port (:16384, :16416, :16448).
  2. Ensures Rise of Kingdoms (com.lilithgame.roc.gp) is in the foreground on all 3 VMs.
  3. Discovers & provisions all legal #4197 characters per account (up to 2/2 per emulator)
     and switches any instance on another kingdom (#3477/#4021/#4198) onto its #4197 bot.
  4. Enforces STRICT T1-ONLY troop training (taps Tier 1 unit slot (650, 225) before TRAIN
     (1236, 735) across Barracks, Archery Range, Stable, and Siege Workshop) so bots
     build high-load, fast-heal T1 armies for easy KP & RSS harvesting.
  5. Dispatches idle marches to farm Food, Wood, Stone, and Gold nodes in #4197 and records
     city & node coordinates + plunderable RSS bags.
  6. Syncs live state + base64 screenshots directly to DynamoDB BastionControl
     (control_key = 'SWARM_4197_BLACKBOX') so both valheon.com and localhost update live.
"""

import argparse
import base64
import io
import json
import os
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["MKL_NUM_THREADS"] = "2"
os.environ["OPENBLAS_NUM_THREADS"] = "2"
import random
import re
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone

import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ADB_Candidates = [
    os.path.join(SCRIPT_DIR, "platform-tools", "adb.exe"),
    r"C:\Program Files\Netease\MuMuPlayer\nx_main\adb.exe",
    r"C:\Program Files\Netease\MuMuPlayerGlobal-12.0\shell\adb.exe",
    r"C:\Program Files\Netease\MuMu Player 12\shell\adb.exe",
    "adb",
]
ADB_PATH = next((p for p in ADB_Candidates if os.path.exists(p)), "adb")

TARGET_KINGDOM = "4197"
BLACKBOX_JSON_PATH = os.path.join(SCRIPT_DIR, "4197_blackbox.json")
FLIGHT_LOG_PATH = os.path.join(SCRIPT_DIR, "4197_flight_recorder.jsonl")
CLUSTER_HUB_URL = "http://192.168.50.41:8888/swarm-blackbox"

INSTANCES = [
    {"id": "sidekick-mumu-0", "adb": "127.0.0.1:16384", "port": "16384", "vmIndex": 0, "label": "INSTANCE 01 (ALPHA)"},
    {"id": "sidekick-mumu-1", "adb": "127.0.0.1:16416", "port": "16416", "vmIndex": 1, "label": "INSTANCE 02 (BRAVO)"},
    {"id": "sidekick-mumu-2", "adb": "127.0.0.1:16448", "port": "16448", "vmIndex": 2, "label": "INSTANCE 03 (CHARLIE)"},
]

try:
    from rapidocr_onnxruntime import RapidOCR
    OCR = RapidOCR()
except Exception:
    OCR = None

# Initialize DynamoStore for direct BastionControl cloud telemetry sync
_DYNAMO_STORE = None
try:
    for _candidate in (SCRIPT_DIR, os.path.join(SCRIPT_DIR, "bastion-brain")):
        if os.path.exists(os.path.join(_candidate, "brain")):
            if _candidate not in sys.path:
                sys.path.insert(0, _candidate)
            from brain.config import BrainConfig, load_env_file
            from brain.store import DynamoStore
            env_path = os.path.join(SCRIPT_DIR, ".bastion_brain_env")
            if os.path.exists(env_path):
                _cfg = BrainConfig.from_env(load_env_file(env_path))
                _DYNAMO_STORE = DynamoStore(_cfg)
                print(f"[DynamoStore] Connected to BastionControl ({_cfg.region})")
            break
except Exception as _e:
    print(f"[DynamoStore Init Note] {_e}")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ensure_adb(adb_serial: str):
    try:
        subprocess.run([ADB_PATH, "connect", adb_serial], capture_output=True, timeout=8)
    except Exception:
        pass


def ensure_rok_foreground(adb_serial: str) -> bool:
    """Checks if Rise of Kingdoms (com.lilithgame.roc.gp) process is alive; launches it if not."""
    try:
        res = subprocess.run(
            [ADB_PATH, "-s", adb_serial, "shell", "pidof", "com.lilithgame.roc.gp"],
            capture_output=True,
            text=True,
            timeout=6,
        )
        pid_str = (res.stdout or "").strip()
        if not pid_str:
            print(f"[{adb_serial}] RoK process not running -> Launching com.lilithgame.roc.gp...")
            subprocess.run(
                [ADB_PATH, "-s", adb_serial, "shell", "monkey", "-p", "com.lilithgame.roc.gp", "-c", "android.intent.category.LAUNCHER", "1"],
                capture_output=True,
                timeout=10,
            )
            time.sleep(16.0)
            return True
    except Exception:
        pass
    return False


def tap(adb_serial: str, x: int, y: int, wait_s: float = 1.0):
    jx = max(5, min(1595, int(x + random.gauss(0, 2))))
    jy = max(5, min(895, int(y + random.gauss(0, 2))))
    try:
        subprocess.run(
            [ADB_PATH, "-s", adb_serial, "shell", "input", "tap", str(jx), str(jy)],
            capture_output=True,
            timeout=8,
        )
    except Exception:
        pass
    time.sleep(max(0.2, wait_s + random.uniform(0.0, 0.25)))


_LAST_HANDSHAKE_HIT = {}


def detect_and_hit_alliance_handshake(adb_serial: str, a: np.ndarray | None) -> tuple[int, int] | None:
    """Detects the Alliance Help Handshake bubble over the Alliance tab (1170, 735) or collapsed HUD (1432, 845) and fires an immediate ADB tap."""
    if a is None or not is_city_hud(a):
        return None
    try:
        # 1. Expanded bottom bar: Green-ringed cream Handshake square above Alliance shield tab at (1162, 796) [y=770..822, x=1125..1200]
        al_tab = a[825:880, 1130:1195]
        al_tab_blue = float(((al_tab[:, :, 2].astype(np.int32) - al_tab[:, :, 0].astype(np.int32) > 35) & (al_tab[:, :, 2] > 120)).mean())
        ah_box = a[770:822, 1125:1200]
        ah_cream = (ah_box[:, :, 0] >= 210) & (ah_box[:, :, 1] >= 210) & (ah_box[:, :, 2] >= 185)
        ah_grn_ring = (ah_box[:, :, 1] >= 145) & (ah_box[:, :, 1] > ah_box[:, :, 0] + 20) & (ah_box[:, :, 1] > ah_box[:, :, 2] + 40)
        ah_hands = (
            (ah_box[:, :, 0] >= 185)
            & (ah_box[:, :, 1] >= 105)
            & (ah_box[:, :, 2] <= 115)
            & ((ah_box[:, :, 0].astype(np.int32) - ah_box[:, :, 2].astype(np.int32)) >= 65)
        )
        if al_tab_blue > 0.35 and int(ah_cream.sum()) >= 320 and int(ah_grn_ring.sum()) >= 1100 and int(ah_hands.sum()) >= 60:
            tap(adb_serial, 1162, 796, 0.4)
            _LAST_HANDSHAKE_HIT[adb_serial] = (1162, 796, time.time())
            return (1162, 796)

        # 2. Collapsed bottom bar: Handshake bubble at (1432, 845)
        ah_col_red = (a[795:840, 1440:1480, 0] >= 185) & (a[795:840, 1440:1480, 1] <= 65) & (a[795:840, 1440:1480, 2] <= 65)
        ah_col_cream = float(a[825:875, 1405:1455, 0].mean()) > float(a[825:875, 1405:1455, 2].mean()) + 15.0
        if int(ah_col_red.sum()) >= 70 and ah_col_cream:
            tap(adb_serial, 1432, 845, 0.4)
            _LAST_HANDSHAKE_HIT[adb_serial] = (1432, 845, time.time())
            return (1432, 845)
    except Exception:
        pass
    return None


_ACTIVE_STATE_REF: dict | None = None
_LAST_LIVE_PREVIEW_SYNC: dict[str, float] = {}
_LAST_RED_BORDER_ALERT: dict[str, float] = {}
_IN_RED_BORDER_INTERRUPT: bool = False


def is_watchtower_red_vignette(arr: np.ndarray | None) -> bool:
    """Detects the 4-edge crimson Watchtower vignette when a city/march is being scouted or attacked."""
    if arr is None or arr.shape[0] < 900 or arr.shape[1] < 1600:
        return False
    try:
        top_r = float(((arr[0:16, 200:1400, 0] >= 185) & (arr[0:16, 200:1400, 1] <= 55) & (arr[0:16, 200:1400, 2] <= 55)).mean())
        if top_r < 0.18:
            return False
        bot_r = float(((arr[884:900, 200:1400, 0] >= 185) & (arr[884:900, 200:1400, 1] <= 55) & (arr[884:900, 200:1400, 2] <= 55)).mean())
        if bot_r < 0.18:
            return False
        left_r = float(((arr[180:720, 0:16, 0] >= 185) & (arr[180:720, 0:16, 1] <= 55) & (arr[180:720, 0:16, 2] <= 55)).mean())
        right_r = float(((arr[180:720, 1584:1600, 0] >= 185) & (arr[180:720, 1584:1600, 1] <= 55) & (arr[180:720, 1584:1600, 2] <= 55)).mean())
        return left_r >= 0.12 or right_r >= 0.12
    except Exception:
        return False


def _handle_red_border_interrupt(adb_serial: str, port_key: str, red_frame: np.ndarray):
    """Immediate priority interrupt when Watchtower red border is detected on any frame."""
    global _IN_RED_BORDER_INTERRUPT
    if _ACTIVE_STATE_REF is None or _IN_RED_BORDER_INTERRUPT:
        return
    ist = (_ACTIVE_STATE_REF.get("instances") or {}).get(port_key)
    if not ist:
        return
    _IN_RED_BORDER_INTERRUPT = True
    prev_status = ist.get("status", "ACTIVE_IN_4197")
    prev_task = ist.get("currentTask", "")
    try:
        now_iso = utc_now_iso()
        ist["status"] = "BLACKBOX_RECON"
        ist["currentTask"] = "🚨 RED BORDER DETECTED — Intercepting Live Watchtower & Mail Evidence!"
        ist["lastWatchtowerAlert"] = now_iso
        ist["screenPreviewB64"] = make_thumbnail_b64(red_frame)
        ist["updatedAt"] = now_iso
        save_and_sync_blackbox(_ACTIVE_STATE_REF)

        evidence_frame = red_frame
        attacker_name = "Watchtower Red Alert (Incoming March/Scout)"
        alliance_tag = ""
        ev_type = "INCOMING_ALERT"
        wt_coords = dict(ist.get("coordinates") or {"kingdom": "4197", "x": 0, "y": 0})
        raw_wt_text = "Real-time Watchtower red vignette border intercepted on HUD"

        # 1. Locate and tap the pulsing red Watchtower alert icon on the right HUD (x=1465..1590, y=150..420)
        wt_zone = red_frame[150:420, 1465:1590]
        is_wt_red = (wt_zone[:, :, 0] >= 185) & (wt_zone[:, :, 1] <= 65) & (wt_zone[:, :, 2] <= 65)
        wys, wxs = np.where(is_wt_red)
        if len(wxs) >= 180:
            wx = int(np.median(wxs) + 1465)
            wy = int(np.median(wys) + 150)
        else:
            wx, wy = 1535, 255
        tap(adb_serial, wx, wy, 1.5)
        wt_path = os.path.join(SCRIPT_DIR, f"swarm_wt_live_{port_key}.png")
        a_wt = capture_screen(adb_serial, wt_path)
        if a_wt is not None:
            bh = a_wt[60:145, 350:1250]
            is_bh = (bh[:, :, 0] >= 145) & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 25)
            if float(np.mean(is_bh)) > 0.40:
                evidence_frame = a_wt
                ist["screenPreviewB64"] = make_thumbnail_b64(a_wt)
                if OCR is not None:
                    try:
                        w_res, _ = OCR(a_wt[120:760, 200:1400].astype(np.uint8))
                        lines = [r[1].strip() for r in (w_res or []) if r[1].strip()]
                        if lines:
                            raw_wt_text = " | ".join(lines)[:240]
                            low_wt = raw_wt_text.lower()
                            if any(k in low_wt for k in ("scout", "reconnaissance")):
                                ev_type = "SCOUT"
                            elif any(k in low_wt for k in ("attack", "rally", "siege", "troops")):
                                ev_type = "CITY_HIT"
                            for ln in lines:
                                m_tag = re.search(r"\[([A-Za-z0-9~_\-]{2,6})\]\s*([A-Za-z0-9_\- ]{2,20})", ln)
                                if m_tag:
                                    alliance_tag = m_tag.group(1).strip()
                                    attacker_name = m_tag.group(2).strip()
                                    break
                            m_xy = re.search(r"X\s*[:;.]?\s*(\d{1,4})\s*Y\s*[:;.]?\s*(\d{1,4})", raw_wt_text, re.IGNORECASE)
                            if m_xy:
                                wt_coords = {"kingdom": "4197", "x": int(m_xy.group(1)), "y": int(m_xy.group(2))}
                    except Exception:
                        pass
                tap(adb_serial, 1365, 108, 0.9)

        ts_slug = int(time.time() * 1000)
        incident = {
            "id": f"threat-rt-{ts_slug}-{port_key}",
            "timestamp": utc_now_iso(),
            "eventType": ev_type,
            "severity": "HIGH" if ev_type == "SCOUT" else "CRITICAL",
            "targetPort": port_key,
            "targetBot": ist.get("activeGovernorName", f"Bot-{port_key}"),
            "attackerName": attacker_name,
            "allianceTag": alliance_tag,
            "coordinates": wt_coords,
            "rawReportText": raw_wt_text,
            "screenshotB64": make_thumbnail_b64(evidence_frame, 800, 450),
        }
        _ACTIVE_STATE_REF["threats"].insert(0, incident)
        append_movement(
            _ACTIVE_STATE_REF,
            port_key,
            "THREAT_DETECTED",
            f"🚨 REAL-TIME RED BORDER INTERCEPT on {ist.get('activeGovernorName')} (:{port_key}) -> {attacker_name}",
            incident,
        )
        save_and_sync_blackbox(_ACTIVE_STATE_REF)

        # 2. Immediate follow-up Mail REPORT sweep to capture the permanent Scout/Battle report card
        inst_obj = next((i for i in INSTANCES if str(i.get("port")) == str(port_key)), None)
        if inst_obj is not None:
            run_blackbox_threat_check(_ACTIVE_STATE_REF, inst_obj)
    except Exception as e_rt:
        print(f"[RedBorderInterrupt Warn] {e_rt}")
    finally:
        ist["status"] = prev_status
        if prev_task:
            ist["currentTask"] = prev_task
        _IN_RED_BORDER_INTERRUPT = False


def capture_screen(adb_serial: str, out_path: str) -> np.ndarray | None:
    try:
        raw = subprocess.check_output(
            [ADB_PATH, "-s", adb_serial, "exec-out", "screencap", "-p"],
            timeout=12,
        )
        if len(raw) > 1000:
            with open(out_path, "wb") as f:
                f.write(raw)
            arr = np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
            detect_and_hit_alliance_handshake(adb_serial, arr)
            if _ACTIVE_STATE_REF is not None and ":" in str(adb_serial):
                port_key = str(adb_serial).split(":")[-1].strip()
                now_ts = time.time()
                # Real-time Watchtower Red Border Filter + Priority Recon Interrupt (45s cooldown)
                if (
                    not _IN_RED_BORDER_INTERRUPT
                    and port_key in (_ACTIVE_STATE_REF.get("instances") or {})
                    and (now_ts - _LAST_RED_BORDER_ALERT.get(port_key, 0.0)) >= 45.0
                    and is_watchtower_red_vignette(arr)
                ):
                    _LAST_RED_BORDER_ALERT[port_key] = now_ts
                    _handle_red_border_interrupt(adb_serial, port_key, arr)
                # Live 5-second dashboard frame push
                elif port_key in (_ACTIVE_STATE_REF.get("instances") or {}) and (now_ts - _LAST_LIVE_PREVIEW_SYNC.get(port_key, 0.0)) >= 4.5:
                    _LAST_LIVE_PREVIEW_SYNC[port_key] = now_ts
                    try:
                        ist_ref = _ACTIVE_STATE_REF["instances"][port_key]
                        ist_ref["screenPreviewB64"] = make_thumbnail_b64(arr)
                        ist_ref["updatedAt"] = utc_now_iso()
                        save_and_sync_blackbox(_ACTIVE_STATE_REF)
                    except Exception:
                        pass
            return arr
    except Exception:
        pass
    return None


def make_thumbnail_b64(arr: np.ndarray | None, width: int = 800, height: int = 450) -> str:
    if arr is None:
        return ""
    try:
        im = Image.fromarray(arr.astype(np.uint8))
        im = im.resize((width, height), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        try:
            im.save(buf, format="WEBP", quality=80)
            return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
        except Exception:
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=85)
            return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return ""


def is_counselor_dialogue(a: np.ndarray | None) -> bool:
    if a is None:
        return False
    dlg = a[735:855, 420:1180]
    is_cream = (
        (dlg[:, :, 0] >= 205)
        & (dlg[:, :, 1] >= 195)
        & (dlg[:, :, 2] >= 165)
        & (np.abs(dlg[:, :, 0].astype(np.int32) - dlg[:, :, 1].astype(np.int32)) <= 25)
    )
    return float(np.mean(is_cream)) > 0.55


def is_city_hud(a: np.ndarray | None) -> bool:
    if a is None:
        return False
    if is_counselor_dialogue(a):
        return False
    tl_back = a[18:82, 18:82]
    is_tl_silver = (
        (tl_back[:, :, 0] >= 150)
        & (tl_back[:, :, 1] >= 155)
        & (tl_back[:, :, 2] >= 160)
        & (np.abs(tl_back[:, :, 0].astype(np.int32) - tl_back[:, :, 2].astype(np.int32)) <= 25)
    )
    if float(np.mean(is_tl_silver)) > 0.45:
        return False
    gov_blue = float(((a[5:115, 5:80, 2].astype(np.float32) - a[5:115, 5:80, 0].astype(np.float32)) > 25).mean())
    if gov_blue < 0.20:
        return False
    bl_mean = float(a[800:890, 10:100].mean())
    if bl_mean < 45.0:
        return False
    br_btn = a[815:885, 1500:1580]
    br_blue = float(((br_btn[:, :, 2].astype(np.int32) - br_btn[:, :, 0].astype(np.int32) > 25) & (br_btn[:, :, 2] >= 100)).mean())
    if br_blue < 0.20 and not (gov_blue >= 0.50 and bl_mean >= 85.0):
        return False
    bh = a[85:140, 250:1350]
    is_bh = (
        (bh[:, :, 0] >= 150)
        & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 20)
        & (np.abs(bh[:, :, 1].astype(np.int32) - bh[:, :, 2].astype(np.int32)) < 25)
    )
    if float(np.mean(is_bh)) > 0.45:
        return False
    al_hdr = a[20:85, 200:1400]
    is_al = (
        (al_hdr[:, :, 0] >= 145)
        & (al_hdr[:, :, 0] <= 215)
        & (np.abs(al_hdr[:, :, 0].astype(np.int32) - al_hdr[:, :, 2].astype(np.int32)) < 22)
    )
    if float(np.mean(is_al)) > 0.55:
        return False
    return True


def is_world_map(a: np.ndarray | None) -> bool:
    if a is None or not is_city_hud(a):
        return False
    # Deterministic bottom-left button sprite check: Castle Tower (World Map) vs Folded Map Pin (City View)
    castle_vs_map_delta = float(a[833:839, 79:85].mean()) - float(a[842:848, 83:89].mean())
    if castle_vs_map_delta > 60.0:
        return True
    if castle_vs_map_delta < -60.0:
        return False
    star = a[8:40, 580:615]
    gold = (star[:, :, 0] >= 195) & (star[:, :, 1] >= 125) & (star[:, :, 2] <= 55)
    return float(np.mean(gold)) > 0.45


def has_world_map_unlocked(a: np.ndarray | None) -> bool:
    """Returns True if the bottom-left World Map / City toggle button (15..85, 810..885) is unlocked and visible."""
    if a is None:
        return False
    if is_world_map(a):
        return True
    bl = a[810:885, 15:85]
    bl_blue = (bl[:, :, 2].astype(np.int32) - bl[:, :, 0].astype(np.int32) > 25) & (bl[:, :, 2] > 110)
    return float(bl_blue.mean()) > 0.22


def is_gov_profile_open(a: np.ndarray | None) -> bool:
    if a is None:
        return False
    ban = a[220:680, 140:500]
    is_ban = (ban[:, :, 0] >= 170) & (ban[:, :, 1] >= 110) & (ban[:, :, 2] <= 60)
    pan = a[220:680, 550:1400]
    is_pan = (pan[:, :, 2] >= 120) & (pan[:, :, 0] <= 45)
    return float(np.mean(is_ban)) > 0.25 and float(np.mean(is_pan)) > 0.50


def close_modals_to_hud(adb_serial: str, port: str) -> np.ndarray | None:
    ensure_rok_foreground(adb_serial)
    shot_path = os.path.join(SCRIPT_DIR, f"swarm_hud_{port}.png")
    for _ in range(7):
        a = capture_screen(adb_serial, shot_path)
        if a is None:
            break
        # 0. Dismiss "Exit the game?" / Unwanted Confirm Modal (Red CANCEL at x=445..745, y=600..675 + Cyan CONFIRM at x=865..1165, y=600..675) -> Tap CANCEL (595, 637)
        cl_no = a[600:675, 445:745]
        cl_yes = a[600:675, 865:1165]
        is_cl_no_red = (cl_no[:, :, 0] >= 170) & (cl_no[:, :, 1] <= 70) & (cl_no[:, :, 2] <= 60)
        is_cl_yes_cy = (cl_yes[:, :, 2] >= 180) & (cl_yes[:, :, 1] >= 140) & (cl_yes[:, :, 0] <= 75)
        if int(is_cl_no_red.sum()) >= 7500 and int(is_cl_yes_cy.sum()) >= 8500:
            tap(adb_serial, 595, 637, 1.0)
            continue
        # 0a. Path of Vengeance "WARNING: Quit current mission?" (Red YES at x=445..745, y=665..748 + Cyan NO at x=865..1165, y=665..748) -> Tap YES (595, 706) + Lobby Back (48, 52)
        pv_yes = a[665:748, 445:745]
        pv_no = a[665:748, 865:1165]
        is_pv_yes_red = (pv_yes[:, :, 0] >= 170) & (pv_yes[:, :, 1] <= 70) & (pv_yes[:, :, 2] <= 60)
        is_pv_no_cy = (pv_no[:, :, 2] >= 180) & (pv_no[:, :, 1] >= 140) & (pv_no[:, :, 0] <= 75)
        if int(is_pv_yes_red.sum()) >= 7500 and int(is_pv_no_cy.sum()) >= 8500:
            tap(adb_serial, 595, 706, 2.0)
            tap(adb_serial, 48, 52, 1.2)
            continue
        # 0a2. Path of Vengeance VICTORY Screen (Red HOME at x=275..508, y=720..800 + Cyan CONTINUE at x=587..821, y=720..800) -> Tap HOME (392, 760) + Back (48, 52)
        pv_home = a[720:800, 275:508]
        pv_cont = a[720:800, 587:821]
        is_pv_home_red = (pv_home[:, :, 0] >= 170) & (pv_home[:, :, 1] <= 70) & (pv_home[:, :, 2] <= 60)
        is_pv_cont_cy = (pv_cont[:, :, 2] >= 180) & (pv_cont[:, :, 1] >= 140) & (pv_cont[:, :, 0] <= 75)
        if int(is_pv_home_red.sum()) >= 6000 and int(is_pv_cont_cy.sum()) >= 6000:
            tap(adb_serial, 392, 760, 2.0)
            tap(adb_serial, 48, 52, 1.2)
            continue
        # 0b. Dismiss Insufficient Gems / Spend Gems Notice Modal (grey header y=165..215, x=350..1250 -> Close X at 1263, 190)
        ig_hdr = a[165:215, 350:1250]
        is_ig_hdr = (ig_hdr[:, :, 0] >= 150) & (np.abs(ig_hdr[:, :, 0].astype(np.int32) - ig_hdr[:, :, 1].astype(np.int32)) < 20)
        ig_btn = a[600:775, 440:1177]
        is_ig_act = (ig_btn[:, :, 0] >= 195) | (ig_btn[:, :, 2] >= 180)
        if float(np.mean(is_ig_hdr)) > 0.60 and float(np.mean(is_ig_act)) > 0.08:
            tap(adb_serial, 1263, 190, 1.0)
            continue
        # 1. Counselor bottom dialogue box -> tap (800, 780)
        if is_counselor_dialogue(a):
            tap(adb_serial, 800, 780, 1.0)
            continue
        # 1b. Full-screen First Recharge / Growth Fund / VIP / World Map Search Bar with top-left silver Back arrow at (48, 52)
        tl_back = a[18:82, 18:82]
        is_tl_silver = (
            (tl_back[:, :, 0] >= 150)
            & (tl_back[:, :, 1] >= 155)
            & (tl_back[:, :, 2] >= 160)
            & (np.abs(tl_back[:, :, 0].astype(np.int32) - tl_back[:, :, 2].astype(np.int32)) <= 25)
        )
        if float(np.mean(is_tl_silver)) > 0.45:
            tap(adb_serial, 48, 52, 1.0)
            continue
        # 2. First Recharge Rewards scroll modal (gold $0.99 button at y=780..885, x=375..690) -> tap outside scroll (1520, 500)
        fr_gold = (a[780:885, 375:690, 0] >= 210) & (a[780:885, 375:690, 1] >= 135) & (a[780:885, 375:690, 2] <= 45)
        if int(fr_gold.sum()) >= 2000:
            tap(adb_serial, 1520, 500, 1.0)
            continue
        # 2b. Governor Profile Open -> Close (1454, 105) BEFORE generic grey-header check
        if is_gov_profile_open(a):
            tap(adb_serial, 1454, 105, 1.0)
            continue
        # 3. Standard Building / City Management / Quests / Training / Settings / Speed Up / Achievements modals (grey header y=60..135)
        bh = a[90:135, 360:1240]
        is_bh = (bh[:, :, 0] >= 145) & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_bh)) > 0.45:
            # Check if tall header (e.g. Achievements modal starting at y=60 with Close X at 1392, 96)
            bh_top = a[62:82, 500:1100]
            is_bh_top = (bh_top[:, :, 0] >= 150) & (np.abs(bh_top[:, :, 0].astype(np.int32) - bh_top[:, :, 1].astype(np.int32)) < 25)
            if float(np.mean(is_bh_top)) > 0.50:
                tap(adb_serial, 1392, 96, 1.0)
                continue
            bh_std = a[90:135, 1335:1390]
            is_bh_std = (bh_std[:, :, 0] >= 145) & (np.abs(bh_std[:, :, 0].astype(np.int32) - bh_std[:, :, 1].astype(np.int32)) < 25)
            if float(np.mean(is_bh_std)) > 0.30:
                tap(adb_serial, 1365, 108, 1.0)
            else:
                tap(adb_serial, 1306, 108, 1.0)
            continue
        # 3b. Dismiss/Accept Top-Center Alliance Invite Popup if present (JOIN ALLIANCE at 703,330 + Close X at 1089,175) — requires non-blue gap at x=788..808
        inv_row = (a[285:355, :, 2] >= 165) & (a[285:355, :, 0] <= 75)
        if int(inv_row[:, 615:785].sum()) >= 3500 and int(inv_row[:, 810:980].sum()) >= 3500 and int(inv_row[:, 788:808].sum()) < 200:
            tap(adb_serial, 703, 330, 1.0)
            tap(adb_serial, 1089, 175, 0.9)
            continue
        # 4. Dismiss Building Move / Placement overlay anywhere on screen (Red X + Green Checkmark pair)
        bm_red_top = (a[140:270, 550:680, 0] >= 200) & (a[140:270, 550:680, 1] <= 75) & (a[140:270, 550:680, 2] <= 75)
        bm_grn_top = (a[140:270, 735:865, 1] >= 175) & (a[140:270, 735:865, 0] <= 105) & (a[140:270, 735:865, 2] <= 105)
        if int(bm_red_top.sum()) >= 350 and int(bm_grn_top.sum()) >= 350:
            tap(adb_serial, 616, 204, 1.0)
            continue
        bm_red_bot = (a[640:860, 450:660, 0] >= 200) & (a[640:860, 450:660, 1] <= 75) & (a[640:860, 450:660, 2] <= 75)
        bm_grn_bot = (a[640:860, 660:870, 1] >= 175) & (a[640:860, 660:870, 0] <= 105) & (a[640:860, 660:870, 2] <= 105)
        if int(bm_red_bot.sum()) >= 400 and int(bm_grn_bot.sum()) >= 400:
            rys, rxs = np.where(bm_red_bot)
            tap(adb_serial, int(np.median(rxs) + 450), int(np.median(rys) + 640), 1.0)
            continue
        # 5. Governor Profile Open -> Close (1454, 105) ONCE
        if is_gov_profile_open(a):
            tap(adb_serial, 1454, 105, 1.0)
            continue
        # 6. Event Calendar / Adventurer's Choice (tan header y=20..80, x=550..1350, or dimmed when sub-popup like Mercantile Melee is open) -> Claim any green CLAIM button first, then Close (1396, 58)
        ec_hdr = a[20:80, 550:1350]
        is_ec = (ec_hdr[:, :, 0] >= 165) & (ec_hdr[:, :, 1] >= 135) & (ec_hdr[:, :, 2] >= 95) & ((ec_hdr[:, :, 0].astype(np.int32) - ec_hdr[:, :, 2].astype(np.int32)) >= 30)
        ec_dim = (ec_hdr[:, :, 0] >= 100) & (ec_hdr[:, :, 0] <= 165) & ((ec_hdr[:, :, 0].astype(np.int32) - ec_hdr[:, :, 2].astype(np.int32)) >= 18)
        ec_pop = (a[350:680, 460:1040, 0] >= 235) & (a[350:680, 460:1040, 1] >= 235) & (a[350:680, 460:1040, 2] >= 235)
        if float(np.mean(is_ec)) > 0.55 or (float(np.mean(ec_dim)) > 0.45 and float(np.mean(ec_pop)) > 0.45):
            ec_clm = a[460:860, 1180:1400]
            is_ec_grn = (ec_clm[:, :, 1] >= 145) & (ec_clm[:, :, 0] <= 75) & (ec_clm[:, :, 2] <= 65)
            eys, exs = np.where(is_ec_grn)
            if len(exs) >= 1000:
                tap(adb_serial, int(np.median(exs) + 1180), int(np.percentile(eys, 25) + 460), 0.9)
            tap(adb_serial, 1396, 58, 0.9)
            if float(np.mean(ec_pop)) > 0.45:
                tap(adb_serial, 1396, 58, 0.9)
            continue
        # 6b. Left Kingdom Chat Drawer Open (beige parchment on left half x=85..820, y=80..800) or Android bottom keyboard bar -> Tap right half (950, 450)
        chat_body = a[80:800, 85:820]
        is_chat = (
            (chat_body[:, :, 0] >= 195)
            & (chat_body[:, :, 1] >= 180)
            & (chat_body[:, :, 2] >= 145)
            & ((chat_body[:, :, 0].astype(np.int32) - chat_body[:, :, 2].astype(np.int32)) >= 15)
            & ((chat_body[:, :, 0].astype(np.int32) - chat_body[:, :, 2].astype(np.int32)) <= 65)
        )
        kb_bar = a[835:895, 100:1300]
        is_kb_white = (kb_bar[:, :, 0] >= 242) & (kb_bar[:, :, 1] >= 242) & (kb_bar[:, :, 2] >= 242)
        if float(np.mean(is_chat)) > 0.45 or float(np.mean(is_kb_white)) > 0.80:
            tap(adb_serial, 950, 450, 1.0)
            continue
        # 7. Full Alliance Screen / 'Join Your First Alliance' / 'More Info' Modal -> Tap outside (1545, 500) + Close X at (1392, 62)
        al_hdr = a[20:85, 200:1400]
        al_body = a[200:750, 650:1350]
        is_al_grey = (al_hdr[:, :, 0] >= 145) & (al_hdr[:, :, 0] <= 215) & (np.abs(al_hdr[:, :, 0].astype(np.int32) - al_hdr[:, :, 2].astype(np.int32)) < 22)
        is_al_teal = (al_body[:, :, 2] >= 90) & (al_body[:, :, 0] <= 45)
        if float(np.mean(is_al_grey)) > 0.55 and float(np.mean(is_al_teal)) > 0.40:
            tap(adb_serial, 1545, 500, 0.7)
            tap(adb_serial, 1392, 62, 0.9)
            continue
        # 9. Mail / Alliance Help / Joined Alliance / New Troop header (y=35..90) -> SINGLE tap on close X
        mh = a[35:90, 200:1550]
        is_mh = (mh[:, :, 0] >= 140) & (np.abs(mh[:, :, 0].astype(np.int32) - mh[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_mh[:, 100:1100])) > 0.45 or float(np.mean(is_mh[:, 450:1300])) > 0.50:
            if float(np.mean(is_mh[:, 1250:])) < 0.35:
                tap(adb_serial, 1395, 65, 1.0)
            else:
                tap(adb_serial, 1535, 55, 1.0)
            continue
        # 9b. Growth Fund / First Recharge / VIP Store with top-left silver Back arrow at (38, 38)
        tl_back = a[20:55, 25:60]
        is_tl_silver = (
            (tl_back[:, :, 0] >= 150)
            & (tl_back[:, :, 1] >= 155)
            & (tl_back[:, :, 2] >= 160)
            & (np.abs(tl_back[:, :, 0].astype(np.int32) - tl_back[:, :, 2].astype(np.int32)) <= 25)
        )
        if float(np.mean(is_tl_silver)) > 0.45:
            tap(adb_serial, 38, 38, 1.2)
            continue
        if is_city_hud(a):
            if not is_world_map(a):
                rib_chk = a[25:620, 175:1550]
                is_rib_chk = (rib_chk[:, :, 2] >= 145) & (rib_chk[:, :, 0] <= 55) & ((rib_chk[:, :, 2].astype(np.int32) - rib_chk[:, :, 0].astype(np.int32)) >= 100)
                is_wht_chk = (rib_chk[:, :, 0] >= 205) & (rib_chk[:, :, 1] >= 205) & (rib_chk[:, :, 2] >= 205)
                if int(is_rib_chk.sum()) >= 3000 and int(is_wht_chk.sum()) >= 80:
                    tap(adb_serial, 1420, 550, 0.7)
                    a = capture_screen(adb_serial, shot_path)
                    if a is None:
                        break
            return a
        # 10. Sub-screen with top-left Back button (Growth Fund / Commander / Tavern) where blue Governor ribbon is hidden
        gov_blue = float(((a[5:115, 5:80, 2].astype(np.float32) - a[5:115, 5:80, 0].astype(np.float32)) > 25).mean())
        if gov_blue < 0.15:
            tap(adb_serial, 38, 38, 1.0)
        else:
            tap(adb_serial, 1420, 550, 0.8)
    return capture_screen(adb_serial, shot_path)


def merge_rss_bar(prev_rss: dict | None, a: np.ndarray | None) -> dict:
    parsed = parse_rss_bar(a)
    if (parsed.get("food", "0") == "0" or parsed.get("wood", "0") == "0") and prev_rss:
        out = dict(prev_rss)
        if parsed.get("gems", "0") != "0":
            out["gems"] = parsed["gems"]
        return out
    return parsed


def parse_rss_bar(a: np.ndarray | None) -> dict:
    rss = {"food": "0", "wood": "0", "stone": "0", "gold": "0", "gems": "0"}
    if a is None or OCR is None or not is_city_hud(a):
        return rss
    try:
        crop = a[5:52, 850:1590].astype(np.uint8)
        res, _ = OCR(crop)
        if not res:
            return rss
        items = []
        for bbox, txt, _ in res:
            cx = sum(pt[0] for pt in bbox) / 4.0 + 850
            clean = re.sub(r"[^0-9.KMBkmb]", "", txt.strip()).upper()
            if clean and any(ch.isdigit() for ch in clean):
                items.append((cx, clean))
        items.sort(key=lambda x: x[0])
        non_gems = []
        for cx, val in items:
            if cx >= 1440:
                rss["gems"] = val
            else:
                non_gems.append((cx, val))
        keys = ["food", "wood", "stone", "gold"]
        for idx, (_, val) in enumerate(non_gems[:4]):
            rss[keys[idx]] = val
    except Exception:
        pass
    return rss


def parse_hud_power(a: np.ndarray | None) -> int:
    if a is None or OCR is None or not is_city_hud(a):
        return 0
    try:
        crop = a[6:58, 162:315].astype(np.uint8)
        res, _ = OCR(crop)
        for _, txt, _ in (res or []):
            digits = re.sub(r"[^0-9]", "", txt)
            if digits and len(digits) >= 4:
                val = int(digits)
                if 1500 <= val <= 500000:
                    return val
    except Exception:
        pass
    return 0


def parse_map_coordinates(a: np.ndarray | None) -> dict:
    coords = {"kingdom": TARGET_KINGDOM, "x": 0, "y": 0, "raw": ""}
    if a is None or OCR is None:
        return coords
    try:
        crop = a[4:58, 250:660].astype(np.uint8)
        res, _ = OCR(crop)
        if res:
            full = " ".join(r[1].strip() for r in res)
            coords["raw"] = full
            mx = re.search(r"X\s*[:;.]?\s*(\d{1,4})", full, re.IGNORECASE)
            my = re.search(r"Y\s*[:;.]?\s*(\d{1,4})", full, re.IGNORECASE)
            mk = re.search(r"#?(\d{4})", full)
            if mk:
                coords["kingdom"] = mk.group(1)
            if mx:
                coords["x"] = int(mx.group(1))
            if my:
                coords["y"] = int(my.group(1))
    except Exception:
        pass
    return coords


def load_blackbox() -> dict:
    if os.path.exists(BLACKBOX_JSON_PATH):
        try:
            with open(BLACKBOX_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "instances" in data:
                    return data
        except Exception:
            pass
    return {
        "kingdom": TARGET_KINGDOM,
        "kingdomName": "Kingdom of Belerion",
        "mode": "SWARM_ROTATION_T1_ONLY",
        "strictT1Only": True,
        "updatedAt": utc_now_iso(),
        "orchestratorPid": os.getpid(),
        "summary": {
            "totalBotsIn4197": 3,
            "activeInstances": 3,
            "totalT1Trained": 7200,
            "estimatedKpPool": 1440,
            "hostileScoutsCount": 0,
            "hostileAttacksCount": 0,
            "totalMovementsLogged": 0,
        },
        "instances": {
            inst["port"]: {
                "instanceId": inst["id"],
                "label": inst["label"],
                "adb": inst["adb"],
                "port": inst["port"],
                "vmIndex": inst["vmIndex"],
                "kingdom": TARGET_KINGDOM,
                "activeGovernorName": f"Belerion-Bot-{inst['port']}",
                "activeGovernorId": "",
                "allianceTag": "",
                "cityHallLevel": 5,
                "power": 4400,
                "killPoints": 0,
                "status": "INITIALIZING",
                "currentTask": "Initializing #4197 Swarm Rotation",
                "currentBuilding": "City Hall / Resource Queue",
                "currentFarming": {"resource": "FOOD", "label": "FOOD (Cropland)", "nodeX": 0, "nodeY": 0, "status": "READY"},
                "currentTraining": {
                    "policy": "T1 ONLY",
                    "infantry": "T1 Swordsman (Ready)",
                    "archer": "T1 Bowman (Ready)",
                    "cavalry": "T1 Horseman (Ready)",
                    "siege": "T1 Battering Ram (Ready)",
                    "lastTrainedUnit": "T1 Swordsman",
                    "t1BatchesCompleted": 0,
                    "estimatedT1Troops": 2400,
                },
                "rssBags": {"food": "90K", "wood": "95K", "stone": "550", "gold": "0", "gems": "350"},
                "coordinates": {"kingdom": TARGET_KINGDOM, "x": 0, "y": 0},
                "roster4197": [],
                "legalSlotsMax": 2,
                "shiftStartedAt": utc_now_iso(),
                "nextRotationAt": "",
                "sleepStatus": "AWAKE (ACTIVE SHIFT)",
                "lastWatchtowerAlert": None,
                "screenPreviewB64": "",
                "updatedAt": utc_now_iso(),
            }
            for inst in INSTANCES
        },
        "threats": [],
        "movements": [],
    }


PORT_TO_BASTION_BOT = {
    "16384": {"bot_id": "bot_4197_m0", "instance_id": "sidekick-mumu-0", "account_id": "mumu-account-0"},
    "16416": {"bot_id": "bot_4197_twin_m1", "instance_id": "sidekick-mumu-1", "account_id": "mumu-account-1"},
    "16448": {"bot_id": "bot_4197_m2", "instance_id": "sidekick-mumu-2", "account_id": "mumu-account-2"},
}


def append_movement(state: dict, port: str, category: str, action: str, details: dict | None = None):
    gov = state["instances"].get(port, {}).get("activeGovernorName", f"Bot-{port}")
    ts_now = utc_now_iso()
    entry = {
        "id": f"mov-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        "timestamp": ts_now,
        "port": port,
        "instanceId": state["instances"].get(port, {}).get("instanceId", f"mumu-{port}"),
        "governorName": gov,
        "kingdom": TARGET_KINGDOM,
        "category": category,
        "action": action,
        "details": details or {},
    }
    state["movements"].insert(0, entry)
    state["movements"] = state["movements"][:60]
    state["summary"]["totalMovementsLogged"] = int(state["summary"].get("totalMovementsLogged", 0)) + 1
    try:
        with open(FLIGHT_LOG_PATH, "a", encoding="utf-8") as lf:
            lf.write(json.dumps(entry) + "\n")
    except Exception:
        pass

    # Emit live 5-Ring MoE Audit Event into BastionEvents so /bastion and the #4197 Swarm Deck stay in 100% lockstep
    if _DYNAMO_STORE is not None and hasattr(_DYNAMO_STORE, "append_event"):
        try:
            meta = PORT_TO_BASTION_BOT.get(str(port), {})
            ring_map = {
                "THREAT_DETECTED": ("RING_4_SAFETY", "WARDEN", "HOSTILE_ATTACK_DETECTED", "CRITICAL"),
                "CHARACTER_SWITCH": ("RING_2_OPS", "CIPHER", "JOB_RESULT_RECEIVED", "NOTICE"),
                "PROVISION_4197": ("RING_2_OPS", "CIPHER", "JOB_RESULT_RECEIVED", "NOTICE"),
                "SWARM_BOOT": ("RING_5_CONTEXT", "ZEUS", "CONTEXT_DIRECTIVE", "NOTICE"),
            }
            ring_key, actor_key, ev_type, sev = ring_map.get(category, ("RING_2_OPS", "CIPHER", "JOB_RESULT_RECEIVED", "INFO"))
            if category == "THREAT_DETECTED" and isinstance(details, dict) and details.get("eventType") == "SCOUT":
                ring_key, actor_key, ev_type, sev = ("RING_1_INTEL", "SCOUT", "HOSTILE_SCOUT_DETECTED", "WARN")
            epoch_day = ts_now[:10]
            _DYNAMO_STORE.append_event(
                {
                    "epoch_day": epoch_day,
                    "event_id": entry["id"],
                    "timestamp": ts_now,
                    "correlation_id": f"corr_swarm4197_{port}",
                    "ring": ring_key,
                    "actor": actor_key,
                    "event_type": ev_type,
                    "severity": sev,
                    "operating_mode": "AUTONOMOUS",
                    "kingdom_id": 4197,
                    "instance_id": meta.get("instance_id") or entry["instanceId"],
                    "bot_id": meta.get("bot_id"),
                    "summary": f"[#4197 Swarm · {category}] {action}"[:280],
                    "oversight": {
                        "why": f"Kingdom #4197 5-Queue Living Player Loop executed {category} on {gov} (:{port}).",
                        "trigger_inputs": details or {"port": port, "category": category},
                        "numnum_checks": [],
                        "llm_telemetry": None,
                        "evidence_refs": [],
                        "operator_action_required": category == "THREAT_DETECTED",
                        "operator_instructions": (
                            f"Hostile {details.get('eventType', 'THREAT')} detected against {gov} (:{port}) by "
                            f"[{details.get('allianceTag', '')}] {details.get('attackerName', 'Unknown')} at "
                            f"X:{details.get('coordinates', {}).get('x', 0)} Y:{details.get('coordinates', {}).get('y', 0)}."
                        )
                        if category == "THREAT_DETECTED" and isinstance(details, dict)
                        else None,
                    },
                }
            )
        except Exception as e_ev:
            print(f"[BastionEvents Sync Warn] {e_ev}")


_OWNED_PORTS: set[str] | None = None


def save_and_sync_blackbox(state: dict):
    global _ACTIVE_STATE_REF
    _ACTIVE_STATE_REF = state
    if _OWNED_PORTS and os.path.exists(BLACKBOX_JSON_PATH):
        try:
            with open(BLACKBOX_JSON_PATH, "r", encoding="utf-8") as rf:
                disk_data = json.load(rf)
            disk_insts = (disk_data or {}).get("instances") or {}
            for dp, d_inst in disk_insts.items():
                if dp not in _OWNED_PORTS:
                    state["instances"][dp] = d_inst
        except Exception:
            pass
    state["updatedAt"] = utc_now_iso()
    state["orchestratorPid"] = os.getpid()
    state["movements"] = state.get("movements", [])[:60]
    state["threats"] = state.get("threats", [])[:30]

    total_bots = 0
    total_t1 = 0
    total_wounded = 0
    total_rss_gathered = 0
    total_helps = 0
    for p, inst in state["instances"].items():
        # Sanitize any legacy HUD word accidentally stored as governor name
        if inst.get("activeGovernorName") in ("Build", "Event", "Settings", "rian", "Recruit", "Explore"):
            inst["activeGovernorName"] = f"Belerion-Bot-{p}"
        r_count = max(1, len(inst.get("roster4197", [])))
        total_bots += r_count
        gt = inst.get("groundTruth") or {}
        if "totalTroops" in gt and gt.get("verifiedAt"):
            total_t1 += int(gt.get("totalTroops", 0))
            total_wounded += int(gt.get("hospitalWounded", 0))
            total_rss_gathered += int(gt.get("resourcesGathered", 0))
            total_helps += int(gt.get("allianceHelpTimes", 0))
        else:
            total_t1 += int(inst.get("currentTraining", {}).get("estimatedT1Troops", 2400))

    state["summary"]["totalBotsIn4197"] = total_bots
    state["summary"]["totalT1Trained"] = total_t1
    state["summary"]["totalWoundedInHospital"] = total_wounded
    state["summary"]["totalResourcesGathered"] = total_rss_gathered
    state["summary"]["totalAllianceHelps"] = total_helps
    state["summary"]["estimatedKpPool"] = int((total_t1 + total_wounded) * 0.2)
    state["summary"]["hostileScoutsCount"] = sum(1 for t in state["threats"] if t.get("eventType") == "SCOUT")
    state["summary"]["hostileAttacksCount"] = sum(1 for t in state["threats"] if t.get("eventType") != "SCOUT")

    tmp = f"{BLACKBOX_JSON_PATH}.tmp.{os.getpid()}"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        os.replace(tmp, BLACKBOX_JSON_PATH)
    except Exception:
        pass

    # 1. Sync directly to AWS DynamoDB BastionControl (us-east-2) AND synchronize Bastion 5-Ring MoE state!
    if _DYNAMO_STORE is not None:
        try:
            # Ensure every captured threat in state["threats"] has a corresponding 5-Ring event in BastionEvents
            if hasattr(_DYNAMO_STORE, "append_event"):
                for th in state.get("threats", []):
                    if not th.get("bastionEventSynced"):
                        try:
                            t_port = str(th.get("targetPort") or "16384")
                            t_meta = PORT_TO_BASTION_BOT.get(t_port, {})
                            t_ev = th.get("eventType") or "CITY_HIT"
                            t_ts = th.get("timestamp") or state["updatedAt"]
                            is_sc = t_ev == "SCOUT"
                            _DYNAMO_STORE.append_event(
                                {
                                    "epoch_day": t_ts[:10],
                                    "event_id": th.get("id") or f"threat_{int(time.time()*1000)}",
                                    "timestamp": t_ts,
                                    "correlation_id": f"corr_threat_{t_port}",
                                    "ring": "RING_1_INTEL" if is_sc else "RING_4_SAFETY",
                                    "actor": "SCOUT" if is_sc else "WARDEN",
                                    "event_type": "HOSTILE_SCOUT_DETECTED" if is_sc else "HOSTILE_ATTACK_DETECTED",
                                    "severity": "WARN" if is_sc else "CRITICAL",
                                    "operating_mode": "AUTONOMOUS",
                                    "kingdom_id": 4197,
                                    "instance_id": t_meta.get("instance_id") or f"sidekick-mumu-{t_port}",
                                    "bot_id": t_meta.get("bot_id"),
                                    "summary": (
                                        f"{'🔭 HOSTILE SCOUT' if is_sc else '🚨 HOSTILE ATTACK'} on {th.get('targetBot')} (:{t_port}) by "
                                        f"{'[' + th.get('allianceTag') + '] ' if th.get('allianceTag') else ''}{th.get('attackerName')} "
                                        f"(X:{th.get('coordinates', {}).get('x', 0)}, Y:{th.get('coordinates', {}).get('y', 0)})"
                                    )[:280],
                                    "oversight": {
                                        "why": f"Black-Box Watchtower & Mail REPORT OCR detected {t_ev} against {th.get('targetBot')} (:{t_port}).",
                                        "trigger_inputs": {
                                            "eventType": t_ev,
                                            "targetPort": t_port,
                                            "targetBot": th.get("targetBot"),
                                            "attackerName": th.get("attackerName"),
                                            "allianceTag": th.get("allianceTag"),
                                            "coordinates": th.get("coordinates"),
                                            "rawReportText": th.get("rawReportText"),
                                        },
                                        "numnum_checks": [],
                                        "llm_telemetry": None,
                                        "evidence_refs": [],
                                        "operator_action_required": True,
                                        "operator_instructions": (
                                            f"Hostile {t_ev} recorded on {th.get('targetBot')} (:{t_port}) by "
                                            f"[{th.get('allianceTag', '')}] {th.get('attackerName', '')} at "
                                            f"X:{th.get('coordinates', {}).get('x', 0)} Y:{th.get('coordinates', {}).get('y', 0)}."
                                        ),
                                    },
                                }
                            )
                            th["bastionEventSynced"] = True
                        except Exception as e_th:
                            print(f"[Threat Event Sync Warn] {e_th}")

            dyn_payload = json.dumps(state)
            if len(dyn_payload) > 365_000 and state.get("threats"):
                slim_state = dict(state)
                slim_threats = []
                for idx_t, t_obj in enumerate(state.get("threats", [])):
                    if t_obj.get("screenshotB64"):
                        t_copy = dict(t_obj)
                        t_copy["screenshotB64"] = ""
                        slim_threats.append(t_copy)
                    else:
                        slim_threats.append(t_obj)
                slim_state["threats"] = slim_threats
                dyn_payload = json.dumps(slim_state)
            _DYNAMO_STORE.put_control(
                "SWARM_4197_BLACKBOX",
                {
                    "updated_at": state["updatedAt"],
                    "payload_json": dyn_payload,
                },
            )
            # Keep BastionControl.INSTANCE#sidekick-mumu-0..2 & BastionBots synchronized in real time
            existing_bots = {}
            if hasattr(_DYNAMO_STORE, "get_bots"):
                try:
                    existing_bots = _DYNAMO_STORE.get_bots([m["bot_id"] for m in PORT_TO_BASTION_BOT.values()]) or {}
                except Exception:
                    existing_bots = {}

            future_deadline = datetime.fromtimestamp(time.time() + 1800, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            for p, meta in PORT_TO_BASTION_BOT.items():
                ist = state["instances"].get(p, {})
                bot_id = meta["bot_id"]
                inst_id = meta["instance_id"]
                _DYNAMO_STORE.put_control(
                    f"INSTANCE#{inst_id}",
                    {
                        "active_bot_id": bot_id,
                        "in_flight": {
                            "job_id": f"swarm4197_{p}",
                            "job_type": str(ist.get("status") or "ACTIVE_IN_4197"),
                            "task": str(ist.get("currentTask") or "Active in #4197 5-Queue Loop"),
                            "kingdom_id": 4197,
                            "deadline": future_deadline,
                        },
                        "replacing_bot_id": None,
                        "active_intent_id": None,
                        "preempt_reason": None,
                        "preempt_requested_at": None,
                        "dispatched_at": state["updatedAt"],
                        "last_result_at": state["updatedAt"],
                        "last_idempotency_key": f"idem_{bot_id}_swarm4197",
                    },
                )
                if hasattr(_DYNAMO_STORE, "put_bot") and bot_id in existing_bots:
                    b_rec = dict(existing_bots[bot_id])
                    b_rec["kingdom_id"] = 4197
                    b_rec["lifecycle_state"] = "ACTIVE"
                    g_name = str(ist.get("activeGovernorName") or "").strip()
                    if g_name and not g_name.startswith("Belerion-Bot-"):
                        b_rec["governor_name"] = g_name
                    g_id = str(ist.get("activeGovernorId") or "").strip()
                    if g_id:
                        b_rec["governor_id"] = g_id
                    vs = dict(b_rec.get("verified_state") or {})
                    if int(ist.get("cityHallLevel") or 0) > 0:
                        vs["ch_level"] = max(int(vs.get("ch_level") or 1), int(ist.get("cityHallLevel") or 5))
                    if int(ist.get("power") or 0) > 0:
                        vs["power"] = int(ist.get("power"))
                    gt_bot = ist.get("groundTruth") or {}
                    if gt_bot.get("verifiedAt"):
                        vs["ground_truth"] = gt_bot
                        vs["total_troops"] = int(gt_bot.get("totalTroops", 0))
                        vs["troop_power"] = int(gt_bot.get("troopPower", 0))
                        vs["resources_gathered"] = int(gt_bot.get("resourcesGathered", 0))
                        vs["hospital_wounded"] = int(gt_bot.get("hospitalWounded", 0))
                        vs["hospital_raw"] = str(gt_bot.get("hospitalRaw", "0/7,500"))
                        vs["march_queue"] = str(gt_bot.get("marchQueue", "0/2"))
                        vs["units_by_type"] = gt_bot.get("unitsByType") or {}
                    port_threats = [t for t in state.get("threats", []) if str(t.get("targetPort")) == str(p)]
                    vs["hostile_scouts_count"] = sum(1 for t in port_threats if t.get("eventType") == "SCOUT")
                    vs["hostile_attacks_count"] = sum(1 for t in port_threats if t.get("eventType") != "SCOUT")
                    if port_threats:
                        vs["last_threat"] = {
                            "eventType": port_threats[0].get("eventType"),
                            "attackerName": port_threats[0].get("attackerName"),
                            "allianceTag": port_threats[0].get("allianceTag"),
                            "timestamp": port_threats[0].get("timestamp"),
                        }
                    vs["last_verified_at"] = state["updatedAt"]
                    b_rec["verified_state"] = vs
                    _DYNAMO_STORE.put_bot(b_rec)
        except Exception as e:
            print(f"[DynamoStore Sync Warn] {e}")

    # 2. Also POST to MIXERV3 Cluster Hub if reachable
    try:
        req = urllib.request.Request(
            CLUSTER_HUB_URL,
            data=json.dumps(state).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=2.0)
    except Exception:
        pass


def audit_and_ensure_4197_roster(state: dict, inst: dict):
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "ROSTER_AUDIT"
    ist["currentTask"] = "Auditing #4197 Character Roster & Profile Telemetry"
    save_and_sync_blackbox(state)

    a = close_modals_to_hud(adb, port)
    if a is not None:
        ist["screenPreviewB64"] = make_thumbnail_b64(a)
        ist["rssBags"] = merge_rss_bar(ist.get("rssBags"), a)
        pwr = parse_hud_power(a)
        if pwr > 0:
            ist["power"] = pwr

    # Open Governor Profile (top-left avatar 55, 55)
    tap(adb, 55, 55, 2.2)
    prof_path = os.path.join(SCRIPT_DIR, f"swarm_prof_{port}.png")
    a_prof = capture_screen(adb, prof_path)
    if a_prof is not None and is_gov_profile_open(a_prof) and OCR is not None:
        ist["screenPreviewB64"] = make_thumbnail_b64(a_prof)
        try:
            # Governor Name box is at y=220..295, x=560..1015
            n_res, _ = OCR(a_prof[220:295, 560:1015].astype(np.uint8))
            if n_res:
                g_name = n_res[0][1].strip()
                if len(g_name) >= 3:
                    ist["activeGovernorName"] = g_name
            # Governor ID box is at y=185..235, x=560..980
            id_res, _ = OCR(a_prof[185:235, 560:980].astype(np.uint8))
            if id_res:
                id_txt = " ".join(r[1] for r in id_res)
                m_id = re.search(r"(\d{6,12})", id_txt)
                if m_id:
                    ist["activeGovernorId"] = m_id.group(1)
            # Power box is at y=330..395, x=1080..1350
            p_res, _ = OCR(a_prof[330:395, 1080:1350].astype(np.uint8))
            if p_res:
                p_digits = re.sub(r"[^0-9]", "", p_res[0][1])
                if p_digits:
                    ist["power"] = int(p_digits)
        except Exception:
            pass

        # Tap Settings (1325, 760) -> OCR-locate Characters (1155, 255 in young KDs or 435, 515 with Search Governor)
        tap(adb, 1325, 760, 2.2)
        set_path = os.path.join(SCRIPT_DIR, f"swarm_settings_{port}.png")
        a_set = capture_screen(adb, set_path)
        char_btn = (1155, 255)
        if a_set is not None and OCR is not None:
            try:
                s_res, _ = OCR(set_path)
                has_search_gov = False
                for s_box, s_txt, _ in (s_res or []):
                    su = s_txt.strip().upper()
                    if "SEARCH GOVERNOR" in su:
                        has_search_gov = True
                    if "CHARACTER" in su:
                        scx = int(sum(p[0] for p in s_box) / 4.0)
                        scy = int(sum(p[1] for p in s_box) / 4.0) - 45
                        if 180 <= scy <= 620:
                            char_btn = (scx, scy)
                            break
                else:
                    if has_search_gov:
                        char_btn = (435, 515)
            except Exception:
                pass
        tap(adb, char_btn[0], char_btn[1], 3.5)
        char_path = os.path.join(SCRIPT_DIR, f"swarm_chars_{port}.png")
        a_char = capture_screen(adb, char_path)
        roster_4197 = []
        switch_target = None
        any_cards_seen = 0

        if a_char is not None and OCR is not None:
            ist["screenPreviewB64"] = make_thumbnail_b64(a_char)
            try:
                res, _ = OCR(char_path)
                for bbox, txt, _ in (res or []):
                    t_clean = txt.strip()
                    if re.search(r"#?\d{4}", t_clean):
                        any_cards_seen += 1
                    if "4197" in t_clean:
                        cx = int(sum(pt[0] for pt in bbox) / 4.0)
                        cy = int(sum(pt[1] for pt in bbox) / 4.0)
                        x0 = 200 if cx < 800 else 800
                        x1 = 780 if cx < 800 else 1380
                        y0 = max(140, cy - 90)
                        y1 = min(860, cy + 90)
                        card = a_char[y0:y1, x0:x1]
                        grn = (card[:, :, 1] >= 170) & (card[:, :, 0] <= 95) & (card[:, :, 2] <= 95)
                        is_active_card = int(grn.sum()) >= 180
                        roster_4197.append({
                            "kingdom": "4197",
                            "cardX": cx,
                            "cardY": cy,
                            "active": is_active_card,
                            "label": t_clean,
                        })
                        if not is_active_card and switch_target is None:
                            switch_target = (cx, cy)
            except Exception:
                pass

        if roster_4197:
            ist["roster4197"] = roster_4197

        is_4197_currently_active = any(c["active"] for c in roster_4197)
        if is_4197_currently_active:
            ist["verifiedIn4197"] = True
            ist["coordinates"]["kingdom"] = "4197"

        # If #4197 is in the roster but NOT currently active -> Switch to it immediately!
        if not is_4197_currently_active and switch_target is not None:
            sx, sy = switch_target
            append_movement(
                state,
                port,
                "CHARACTER_SWITCH",
                f"Switching {inst['label']} into Kingdom #4197 character at ({sx}, {sy})",
                {"targetKingdom": "4197", "cardCoords": [sx, sy]},
            )
            tap(adb, sx, sy, 2.5)
            tap(adb, 979, 619, 1.0)
            tap(adb, 1016, 637, 18.0)
            a_after = close_modals_to_hud(adb, port)
            if a_after is not None:
                ist["screenPreviewB64"] = make_thumbnail_b64(a_after)
                ist["rssBags"] = merge_rss_bar(ist.get("rssBags"), a_after)
                ist["coordinates"]["kingdom"] = "4197"
                ist["verifiedIn4197"] = True
            return

        # Close Character & Settings modals back to HUD
        tap(adb, 1398, 102, 1.0)
        tap(adb, 1398, 102, 1.0)
        tap(adb, 1454, 105, 1.0)

        # If this instance drifted onto a different kingdom (e.g. #4198 or #4021) and #4197 wasn't switched above, invoke provision_neighbor_kingdom.py --mode switch
        if not is_4197_currently_active:
            prov_script = os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py")
            if os.path.exists(prov_script):
                ist["status"] = "ROTATING"
                ist["currentTask"] = f"Switching {inst['label']} back into Kingdom #4197..."
                save_and_sync_blackbox(state)
                append_movement(
                    state,
                    port,
                    "CHARACTER_SWITCH",
                    f"Switching {inst['label']} into Kingdom #4197 via provision_neighbor_kingdom.py",
                    {"targetKingdom": "4197", "mode": "switch"},
                )
                subprocess.run(
                    [sys.executable, "-u", prov_script, "--adb", adb, "--kingdom", "4197", "--mode", "switch"],
                    capture_output=True,
                    timeout=180,
                )
                a_post_prov = close_modals_to_hud(adb, port)
                if a_post_prov is not None:
                    ist["screenPreviewB64"] = make_thumbnail_b64(a_post_prov)
                    ist["rssBags"] = merge_rss_bar(ist.get("rssBags"), a_post_prov)
                    ist["coordinates"] = {"kingdom": "4197", "x": 0, "y": 0}
                    ist["verifiedIn4197"] = True


def run_blackbox_threat_check(state: dict, inst: dict):
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "BLACKBOX_RECON"
    ist["currentTask"] = "Scanning Watchtower & Mail Reports for hostile scouts/attacks"
    save_and_sync_blackbox(state)

    a = close_modals_to_hud(adb, port)
    if a is None:
        return
    ist["screenPreviewB64"] = make_thumbnail_b64(a)

    # 1. Watchtower Red Vignette Check
    top_edge = a[0:18, 200:1400]
    bot_edge = a[882:900, 200:1400]
    red_vig = (
        ((top_edge[:, :, 0] >= 200) & (top_edge[:, :, 1] <= 55) & (top_edge[:, :, 2] <= 55)).mean()
        + ((bot_edge[:, :, 0] >= 200) & (bot_edge[:, :, 1] <= 55) & (bot_edge[:, :, 2] <= 55)).mean()
    ) / 2.0
    if red_vig > 0.25:
        ts_slug = int(time.time())
        incident = {
            "id": f"threat-wt-{ts_slug}-{port}",
            "timestamp": utc_now_iso(),
            "eventType": "INCOMING_ALERT",
            "severity": "CRITICAL",
            "targetPort": port,
            "targetBot": ist.get("activeGovernorName", f"Bot-{port}"),
            "attackerName": "Watchtower Red Alert (Incoming March/Scout)",
            "allianceTag": "UNKNOWN",
            "coordinates": ist.get("coordinates", {"kingdom": "4197", "x": 0, "y": 0}),
            "rawReportText": "Watchtower red vignette triggered on HUD",
            "screenshotB64": make_thumbnail_b64(a, 800, 450),
        }
        state["threats"].insert(0, incident)
        ist["lastWatchtowerAlert"] = utc_now_iso()
        append_movement(state, port, "THREAT_DETECTED", "Watchtower Red Vignette Alert triggered!", incident)

    # 2. Deterministic Mail REPORT Tab Check (supports both Expanded HUD Mail at 1400,845 and Collapsed HUD Mail at 1495,845)
    rep_path = os.path.join(SCRIPT_DIR, f"swarm_mail_report_{port}.png")
    tap(adb, 1400, 845, 1.8)
    a_rep = capture_screen(adb, rep_path)
    mail_is_open = False
    if a_rep is not None:
        mh = a_rep[25:80, 150:1250]
        is_mh = (mh[:, :, 0] >= 140) & (np.abs(mh[:, :, 0].astype(np.int32) - mh[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_mh)) > 0.38:
            mail_is_open = True
    if not mail_is_open:
        tap(adb, 1495, 845, 1.8)
        a_rep = capture_screen(adb, rep_path)
        if a_rep is not None:
            mh = a_rep[25:80, 150:1250]
            is_mh = (mh[:, :, 0] >= 140) & (np.abs(mh[:, :, 0].astype(np.int32) - mh[:, :, 1].astype(np.int32)) < 25)
            mail_is_open = float(np.mean(is_mh)) > 0.38

    if mail_is_open and OCR is not None:
        # Select REPORT tab at (300, 48) (PERSONAL=120, REPORT=300, ALLIANCE=500, SYSTEM=700)
        tap(adb, 300, 48, 1.5)
        a_rep = capture_screen(adb, rep_path)
        if a_rep is not None:
            try:
                res, _ = OCR(rep_path)
                ocr_items = []
                for bbox, txt, _ in (res or []):
                    t_clean = txt.strip()
                    if not t_clean:
                        continue
                    cx = int(sum(pt[0] for pt in bbox) / 4.0)
                    cy = int(sum(pt[1] for pt in bbox) / 4.0)
                    ocr_items.append((cx, cy, t_clean))

                # Group left-sidebar report cards (cx < 500, 145 <= cy <= 780) into vertical bands (~110px per card)
                left_items = sorted([it for it in ocr_items if it[0] < 500 and 145 <= it[1] <= 780], key=lambda x: x[1])
                cards = []
                for cx, cy, txt in left_items:
                    if cards and (cy - cards[-1]["maxY"]) <= 46 and (cy - cards[-1]["minY"]) <= 95:
                        cards[-1]["lines"].append(txt)
                        cards[-1]["maxY"] = max(cards[-1]["maxY"], cy)
                        cards[-1]["cy"] = int((cards[-1]["minY"] + cards[-1]["maxY"]) / 2)
                    else:
                        cards.append({"minY": cy, "maxY": cy, "cy": cy, "lines": [txt]})

                def parse_right_pane_details(items_list, bot_gov_name):
                    right_lines = [it for it in items_list if it[0] >= 500 and 135 <= it[1] <= 795]
                    right_txt = " | ".join(it[2] for it in right_lines)
                    # Extract [AllianceTag] GovernorName (prefer right-column opposing player at cx >= 1000)
                    tag_found = ""
                    name_found = ""
                    candidates = []
                    for rcx, rcy, rtxt in right_lines:
                        for m_t in re.finditer(r"\[([A-Za-z0-9~_\-]{2,6})\]\s*([A-Za-z0-9_\- ]{2,20})", rtxt):
                            tg = m_t.group(1).strip()
                            nm = m_t.group(2).strip()
                            if bot_gov_name and bot_gov_name.lower() in nm.lower():
                                continue
                            candidates.append((rcx, tg, nm))
                    if candidates:
                        # Prefer opposing column at cx >= 1000, or clean OCR artifact if duplicate name exists
                        candidates.sort(key=lambda c: (1 if c[0] >= 1000 else 0, len(c[2])), reverse=True)
                        _, tag_found, name_found = candidates[0]
                        # If a shorter suffix of name_found also appears in candidates (e.g. 'gReign' vs 'Reign'), prefer the clean right-column one
                        for c_cx, c_tg, c_nm in candidates:
                            if c_cx >= 1000:
                                tag_found, name_found = c_tg, c_nm
                                break
                    # Extract coordinates (attacker at cx >= 1050, defender at cx < 1050)
                    atk_coords = {"kingdom": "4197", "x": 0, "y": 0}
                    def_coords = {"kingdom": "4197", "x": 0, "y": 0}
                    for rcx, rcy, rtxt in right_lines:
                        m_xy = re.search(r"X\s*[:;.]?\s*(\d{1,4})\s*Y\s*[:;.]?\s*(\d{1,4})", rtxt, re.IGNORECASE)
                        if m_xy:
                            cx_val, cy_val = int(m_xy.group(1)), int(m_xy.group(2))
                            if rcx >= 1050:
                                atk_coords = {"kingdom": "4197", "x": cx_val, "y": cy_val}
                            else:
                                def_coords = {"kingdom": "4197", "x": cx_val, "y": cy_val}
                    if def_coords["x"] > 0:
                        ist["coordinates"] = {"kingdom": "4197", "x": def_coords["x"], "y": def_coords["y"]}
                    return tag_found, name_found, atk_coords, def_coords, right_txt

                bot_gov = ist.get("activeGovernorName", f"Bot-{port}")
                existing_keys = {
                    (t.get("eventType", ""), str(t.get("targetPort", "")), str(t.get("attackerName", "")).lower())
                    for t in state.get("threats", [])
                }

                # First parse the initially open right pane (Card 0) so we know any attacker tag/coords already visible
                init_tag, init_name, init_atk_xy, init_def_xy, init_right_txt = parse_right_pane_details(ocr_items, bot_gov)

                for card_idx, card in enumerate(cards[:5]):
                    c_txt = " | ".join(card["lines"])
                    c_low = c_txt.lower()
                    # Skip PvE Barbarian / Exploration / Village cards so they NEVER poison PvP Scout or Attack cards
                    if any(pve in c_low for pve in ("barbarian", "exploration report", "tribal village", "mysterious cave", "neutral")):
                        continue

                    is_scout_card = any(
                        sk in c_low
                        for sk in ("scouted", "has been sc", "reconnaissance", "spied", "watchtower")
                    )
                    is_attack_card = not is_scout_card and any(
                        ak in c_low
                        for ak in ("battle report", "kill count", "city was attacked", "attacked your", "plundered", "siege", "defeat")
                    )

                    if not is_scout_card and not is_attack_card:
                        continue

                    ev_type = "SCOUT" if is_scout_card else "CITY_HIT"
                    card_shot = a_rep
                    c_tag, c_name, c_atk_xy, c_def_xy, c_right_txt = init_tag, init_name, init_atk_xy, init_def_xy, init_right_txt

                    # If this card is not the top card, tap it in the left sidebar to load its detail pane on the right
                    if card_idx > 0:
                        tap(adb, 250, card["cy"], 1.5)
                        sub_path = os.path.join(SCRIPT_DIR, f"swarm_mail_card_{port}_{card_idx}.png")
                        a_sub = capture_screen(adb, sub_path)
                        if a_sub is not None:
                            card_shot = a_sub
                            try:
                                sub_res, _ = OCR(sub_path)
                                sub_items = [
                                    (int(sum(pt[0] for pt in b) / 4.0), int(sum(pt[1] for pt in b) / 4.0), t.strip())
                                    for b, t, _ in (sub_res or [])
                                    if t.strip()
                                ]
                                s_tag, s_name, s_atk_xy, s_def_xy, s_right_txt = parse_right_pane_details(sub_items, bot_gov)
                                if s_name:
                                    c_tag, c_name = s_tag, s_name
                                if s_atk_xy.get("x", 0) > 0:
                                    c_atk_xy = s_atk_xy
                                if s_right_txt:
                                    c_right_txt = s_right_txt
                            except Exception:
                                pass

                    # For Scout cards like "Reign Scouted Our City", extract the player name directly from the card line if needed
                    if is_scout_card:
                        m_sc = re.search(r"([A-Za-z0-9_\-\[\]~]{2,20})\s+Scouted\s+(?:Our|Your)", c_txt, re.IGNORECASE)
                        if m_sc:
                            sc_name = m_sc.group(1).strip()
                            if not c_name or sc_name.lower() in c_name.lower():
                                c_name = sc_name

                    attacker_name = c_name or "Hostile Governor (#4197)"
                    alliance_tag = c_tag or ""
                    dedup_key = (ev_type, str(port), attacker_name.lower())
                    if dedup_key in existing_keys:
                        continue
                    existing_keys.add(dedup_key)

                    coords_to_store = c_atk_xy if c_atk_xy.get("x", 0) > 0 else ist.get("coordinates", {"kingdom": "4197", "x": 0, "y": 0})
                    if c_def_xy.get("x", 0) > 0:
                        coords_to_store = {
                            "kingdom": "4197",
                            "x": c_atk_xy.get("x") or c_def_xy["x"],
                            "y": c_atk_xy.get("y") or c_def_xy["y"],
                            "defenderX": c_def_xy["x"],
                            "defenderY": c_def_xy["y"],
                        }

                    ts_slug = int(time.time() * 1000) + card_idx
                    excerpt = f"{c_txt} // {c_right_txt}"[:240]
                    incident = {
                        "id": f"threat-{ts_slug}-{port}",
                        "timestamp": utc_now_iso(),
                        "eventType": ev_type,
                        "severity": "HIGH" if ev_type == "SCOUT" else "CRITICAL",
                        "targetPort": port,
                        "targetBot": bot_gov,
                        "attackerName": attacker_name,
                        "allianceTag": alliance_tag,
                        "coordinates": coords_to_store,
                        "rawReportText": excerpt,
                        "screenshotB64": make_thumbnail_b64(card_shot, 800, 450),
                    }
                    state["threats"].insert(0, incident)
                    append_movement(
                        state,
                        port,
                        "THREAT_DETECTED",
                        f"{'HOSTILE SCOUT' if ev_type == 'SCOUT' else 'HOSTILE ATTACK'} on {bot_gov} (:{port}) by "
                        f"{'[' + alliance_tag + '] ' if alliance_tag else ''}{attacker_name} "
                        f"(X:{coords_to_store.get('x', 0)}, Y:{coords_to_store.get('y', 0)})",
                        incident,
                    )
            except Exception as e:
                print(f"[ThreatCheck Warn] {e}")
        tap(adb, 1535, 52, 1.0)
        save_and_sync_blackbox(state)

    # 3. Ground-Truth In-Game Telemetry Audit (Governor Profile -> More Info + Troop Details)
    audit_bot_ground_truth_stats(state, inst)


def audit_bot_ground_truth_stats(state: dict, inst: dict):
    """
    Opens Governor Profile (55, 55) -> More Info & Troops to capture 100% ground-truth in-game telemetry:
      - Exact Resources Gathered, Resource Assistance, Alliance Help Times, Scout Times, Victories, Defeats, Dead
      - Exact Power Breakdown (Building Power, Tech Power, Troop Power, Commander Power, Highest Power)
      - Exact Troop Details (Total Number of Units, Troop Power, March Queue, Hospital Capacity, Infantry/Cavalry/Archer/Siege counts)
    """
    if OCR is None:
        return
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]

    a_hud = close_modals_to_hud(adb, port)
    if a_hud is None:
        return

    # Open Governor Profile (55, 55) and verify profile modal is open before tapping inner buttons
    prof_path = os.path.join(SCRIPT_DIR, f"swarm_gt_prof_{port}.png")
    a_prof = None
    for _ in range(3):
        tap(adb, 55, 55, 2.0)
        a_prof = capture_screen(adb, prof_path)
        if a_prof is not None and is_gov_profile_open(a_prof):
            break
        close_modals_to_hud(adb, port)
    if a_prof is None or not is_gov_profile_open(a_prof):
        close_modals_to_hud(adb, port)
        return

    mi_x, tr_x = 250, 912
    try:
        res_p, _ = OCR(prof_path)
        for bbox, txt, _ in (res_p or []):
            cx = int(sum(pt[0] for pt in bbox) / 4.0)
            cy = int(sum(pt[1] for pt in bbox) / 4.0)
            t_low = txt.strip().lower()
            if cy >= 730 and "more" in t_low:
                mi_x = cx
            elif cy >= 730 and "troop" in t_low:
                tr_x = cx
            elif 175 <= cy <= 220 and "id" in t_low:
                m_gid = re.search(r"(\d{6,12})", txt)
                if m_gid:
                    ist["activeGovernorId"] = m_gid.group(1)
            elif 315 <= cy <= 360 and 860 <= cx <= 1020:
                kp_d = re.sub(r"[^0-9]", "", txt)
                if kp_d:
                    ist["killPoints"] = int(kp_d)
            elif 315 <= cy <= 360 and 1080 <= cx <= 1300:
                pw_d = re.sub(r"[^0-9]", "", txt)
                if pw_d:
                    ist["power"] = int(pw_d)
    except Exception:
        pass

    gt = dict(ist.get("groundTruth") or {})
    gt.setdefault("totalTroops", int(ist.get("currentTraining", {}).get("estimatedT1Troops", 0)))
    gt.setdefault("troopPower", 0)
    gt.setdefault("buildingPower", 0)
    gt.setdefault("techPower", 0)
    gt.setdefault("commanderPower", 0)
    gt.setdefault("highestPower", int(ist.get("power", 0)))
    gt.setdefault("resourcesGathered", 0)
    gt.setdefault("resourceAssistance", 0)
    gt.setdefault("allianceHelpTimes", 0)
    gt.setdefault("scoutTimes", 0)
    gt.setdefault("victories", 0)
    gt.setdefault("defeats", 0)
    gt.setdefault("deadTroops", 0)
    gt.setdefault("marchQueue", "0/2")
    gt.setdefault("hospitalWounded", 0)
    gt.setdefault("hospitalCapacity", 7500)
    gt.setdefault("hospitalRaw", "0/7,500")
    gt.setdefault("unitsByType", {"infantry": 0, "cavalry": 0, "archer": 0, "siege": 0})

    # 1. Open More Info (mi_x, 760) -> Page 1 + Scroll Page 2
    tap(adb, mi_x, 760, 1.8)
    mi1_path = os.path.join(SCRIPT_DIR, f"swarm_gt_mi1_{port}.png")
    a_mi1 = capture_screen(adb, mi1_path)
    try:
        subprocess.run([ADB_PATH, "-s", adb, "shell", "input", "swipe", "800", "820", "800", "180", "600"], capture_output=True, timeout=6)
        time.sleep(1.3)
    except Exception:
        pass
    mi2_path = os.path.join(SCRIPT_DIR, f"swarm_gt_mi2_{port}.png")
    a_mi2 = capture_screen(adb, mi2_path)

    for a_page, p_path in ((a_mi1, mi1_path), (a_mi2, mi2_path)):
        if a_page is None:
            continue
        try:
            res_m, _ = OCR(p_path)
            for bbox, txt, _ in (res_m or []):
                cx = int(sum(pt[0] for pt in bbox) / 4.0)
                cy = int(sum(pt[1] for pt in bbox) / 4.0)
                if cx < 600 and 115 <= cy <= 865:
                    row_arr = a_page[max(0, cy - 24) : min(900, cy + 24), 260:1365].astype(np.uint8)
                    r_res, _ = OCR(row_arr)
                    if not r_res or len(r_res) < 2:
                        continue
                    lbl = " ".join(r[1].strip() for r in r_res[:-1]).lower()
                    val_str = re.sub(r"[^0-9]", "", r_res[-1][1])
                    if not val_str:
                        continue
                    val_num = int(val_str)
                    if "building" in lbl and "power" in lbl:
                        gt["buildingPower"] = val_num
                    elif "tech" in lbl and "power" in lbl:
                        gt["techPower"] = val_num
                    elif "troop" in lbl and "power" in lbl:
                        gt["troopPower"] = val_num
                    elif "commander" in lbl and "power" in lbl:
                        gt["commanderPower"] = val_num
                    elif "highest" in lbl:
                        gt["highestPower"] = val_num
                    elif "victory" in lbl:
                        gt["victories"] = val_num
                    elif "defeat" in lbl:
                        gt["defeats"] = val_num
                    elif "dead" in lbl:
                        gt["deadTroops"] = val_num
                    elif "scout" in lbl:
                        gt["scoutTimes"] = val_num
                    elif "gathered" in lbl:
                        gt["resourcesGathered"] = val_num
                    elif "assistance" in lbl:
                        gt["resourceAssistance"] = val_num
                    elif "alliance" in lbl and "help" in lbl:
                        gt["allianceHelpTimes"] = val_num
        except Exception:
            pass

    # Close More Info (1545, 500) + (1395, 55) back to Governor Profile -> Open Troops (tr_x, 760) -> Select 'Total Number of Units' tab (436, 315)
    tap(adb, 1545, 500, 0.8)
    tap(adb, 1395, 55, 0.8)
    tap(adb, tr_x, 760, 1.6)
    tap(adb, 436, 315, 1.0)
    tr_path = os.path.join(SCRIPT_DIR, f"swarm_gt_tr_{port}.png")
    a_tr = capture_screen(adb, tr_path)
    if a_tr is not None:
        try:
            res_t, _ = OCR(tr_path)
            unit_slots = {"infantry": 0, "cavalry": 0, "archer": 0, "siege": 0}
            for bbox, txt, _ in (res_t or []):
                cx = int(sum(pt[0] for pt in bbox) / 4.0)
                cy = int(sum(pt[1] for pt in bbox) / 4.0)
                t_clean = txt.strip()
                t_low = t_clean.lower()
                if "total" in t_low and "unit" in t_low and ":" in t_clean:
                    d = re.sub(r"[^0-9]", "", t_clean.split(":", 1)[1])
                    if d:
                        gt["totalTroops"] = int(d)
                elif "troop" in t_low and "power" in t_low and ":" in t_clean:
                    d = re.sub(r"[^0-9]", "", t_clean.split(":", 1)[1])
                    if d:
                        gt["troopPower"] = int(d)
                elif "march queue" in t_low and ":" in t_clean:
                    gt["marchQueue"] = t_clean.split(":", 1)[1].strip()
                elif "hospital" in t_low and ":" in t_clean:
                    h_part = t_clean.split(":", 1)[1].strip()
                    gt["hospitalRaw"] = h_part
                    if "/" in h_part:
                        w_str, c_str = h_part.split("/", 1)
                        w_d = re.sub(r"[^0-9]", "", w_str)
                        c_d = re.sub(r"[^0-9]", "", c_str)
                        if w_d:
                            gt["hospitalWounded"] = int(w_d)
                        if c_d:
                            gt["hospitalCapacity"] = int(c_d)
                elif 380 <= cy <= 485:
                    # Unit icon count row: strip leading 'x'/'X' multiplier symbol
                    u_clean = re.sub(r"^[xX]\s*", "", t_clean)
                    u_digits = re.sub(r"[^0-9]", "", u_clean)
                    if u_digits:
                        u_val = int(u_digits)
                        if cx < 580:
                            unit_slots["infantry"] = u_val
                        elif cx < 835:
                            unit_slots["cavalry"] = u_val
                        elif cx < 1105:
                            unit_slots["archer"] = u_val
                        else:
                            unit_slots["siege"] = u_val

            # Reconcile if RapidOCR read leading 'x' as a digit on any unit slot (e.g. 'x680' -> '2680' or 'x40' -> '640')
            tot_u = int(gt.get("totalTroops", 0))
            slot_sum = sum(unit_slots.values())
            if tot_u > 0 and slot_sum > tot_u:
                for k_u, v_u in list(unit_slots.items()):
                    s_v = str(v_u)
                    if len(s_v) >= 3:
                        alt_v = int(s_v[1:])
                        if (slot_sum - v_u + alt_v) == tot_u:
                            unit_slots[k_u] = alt_v
                            slot_sum = tot_u
                            break
            gt["unitsByType"] = unit_slots
        except Exception:
            pass

    # Close Troop Details (1545, 500) + (1395, 55) and Governor Profile (1454, 105)
    tap(adb, 1545, 500, 0.8)
    tap(adb, 1395, 55, 0.8)
    tap(adb, 1454, 105, 0.9)
    close_modals_to_hud(adb, port)

    gt["verifiedAt"] = utc_now_iso()
    ist["groundTruth"] = gt
    # Sync verified troop counts into currentTraining so all UI cards show 100% verified numbers
    tr_info = ist.get("currentTraining") or {}
    tr_info["estimatedT1Troops"] = int(gt.get("totalTroops", 0))
    tr_info["verifiedTotalTroops"] = int(gt.get("totalTroops", 0))
    tr_info["woundedInHospital"] = int(gt.get("hospitalWounded", 0))
    u_map = gt.get("unitsByType") or {}
    if sum(u_map.values()) > 0:
        tr_info["infantry"] = f"T1 Infantry: {u_map.get('infantry', 0):,}"
        tr_info["archer"] = f"T1 Archer: {u_map.get('archer', 0):,}"
        tr_info["cavalry"] = f"T1 Cavalry: {u_map.get('cavalry', 0):,}"
        tr_info["siege"] = f"T1 Siege: {u_map.get('siege', 0):,}"
    ist["currentTraining"] = tr_info
    save_and_sync_blackbox(state)


def _get_city_camera_offset(adb: str, port: str, a_img: np.ndarray | None, allow_recenter: bool = False) -> tuple[int, int]:
    """
    Measures the exact (dx, dy) City camera shift relative to the calibrated home anchor
    using floating 'Recruit' (Tavern) or 'Explore' (Scout Camp) labels.
    If allow_recenter=True and (|dx| > 110 or |dy| > 90), swipes the camera back toward home and re-measures.
    """
    if a_img is None or OCR is None:
        return 0, 0
    # On :16384 (Egypt layout), natural City entry puts 'Explore' at (818, 424) and 'Recruit' at (247, 366)
    ref_rec = (247, 366) if "16384" in port else (376, 378)
    ref_exp = (818, 424) if "16384" in port else (964, 430)

    def _measure(arr: np.ndarray) -> tuple[int, int, bool]:
        try:
            if "16384" not in port:
                crop_b = arr[30:540, 220:1380].astype(np.uint8)
                res_b, _ = OCR(crop_b)
                for bbox, txt, _ in (res_b or []):
                    t_low = txt.strip().lower()
                    cx = int(sum(pt[0] for pt in bbox) / 4.0 + 220)
                    cy = int(sum(pt[1] for pt in bbox) / 4.0 + 30)
                    if t_low == "build" and cx >= 300:
                        return cx - 925, cy - 225, True
            crop = arr[70:825, 5:1590].astype(np.uint8)
            res, _ = OCR(crop)
            for bbox, txt, _ in (res or []):
                t_low = txt.strip().lower()
                cx = int(sum(pt[0] for pt in bbox) / 4.0 + 5)
                cy = int(sum(pt[1] for pt in bbox) / 4.0 + 70)
                if t_low == "build" and "16384" not in port and cx >= 300:
                    return cx - 925, cy - 225, True
                if t_low == "explore":
                    return cx - ref_exp[0], cy - ref_exp[1], True
            for bbox, txt, _ in (res or []):
                t_low = txt.strip().lower()
                cx = int(sum(pt[0] for pt in bbox) / 4.0 + 5)
                cy = int(sum(pt[1] for pt in bbox) / 4.0 + 70)
                if t_low == "recruit":
                    return cx - ref_rec[0], cy - ref_rec[1], True
        except Exception:
            pass
        return 0, 0, False

    dx, dy, ok = _measure(a_img)
    if not ok and allow_recenter and "16384" not in port:
        try:
            subprocess.run([ADB_PATH, "-s", adb, "shell", "input", "swipe", "550", "240", "950", "560", "420"], capture_output=True, timeout=6)
            time.sleep(1.0)
            a_pull = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_hud_{port}.png"))
            if a_pull is not None:
                dx, dy, ok = _measure(a_pull)
        except Exception:
            pass
    if ok and allow_recenter and (abs(dx) > 110 or abs(dy) > 90):
        sx = max(220, min(1380, 800 + int(dx * 0.85)))
        sy = max(200, min(720, 450 + int(dy * 0.85)))
        try:
            subprocess.run([ADB_PATH, "-s", adb, "shell", "input", "swipe", str(sx), str(sy), "800", "450", "450"], capture_output=True, timeout=6)
            time.sleep(1.1)
            a_new = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_hud_{port}.png"))
            if a_new is not None:
                dx2, dy2, ok2 = _measure(a_new)
                if ok2:
                    return dx2, dy2
        except Exception:
            pass
    return dx, dy


def run_t1_only_training(state: dict, inst: dict, cycle_idx: int):
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "TRAINING_T1"

    a = close_modals_to_hud(adb, port)
    if a is None:
        return

    # Per-layout 1600x900 home coordinates (anchored to Explore=(818,424) / Recruit=(247,366) on :16384 Egypt layout):
    # - :16384 Egypt layout: Barracks (505,535) | Archery Range (355,705) | Stable (1145,380) | Siege Workshop (978,615)
    # - :16416 & :16448 #4200 New Tutorial layout (anchored to Build=(925,225)): Barracks (1255,340) | Stable (315,700) | Archery Range (1065,580) | Siege Workshop (475,540)
    if "16384" in port:
        unit_rotation = [
            {"building": "Barracks", "unit": "T1 Swordsman (Infantry)", "key": "infantry", "bx": 505, "by": 535},
            {"building": "Archery Range", "unit": "T1 Bowman (Archer)", "key": "archer", "bx": 355, "by": 705},
            {"building": "Stable", "unit": "T1 Horseman (Cavalry)", "key": "cavalry", "bx": 1145, "by": 380},
            {"building": "Siege Workshop", "unit": "T1 Battering Ram (Siege)", "key": "siege", "bx": 978, "by": 615},
        ]
    else:
        unit_rotation = [
            {"building": "Barracks", "unit": "T1 Swordsman (Infantry)", "key": "infantry", "bx": 1255, "by": 340},
            {"building": "Stable", "unit": "T1 Horseman (Cavalry)", "key": "cavalry", "bx": 315, "by": 700},
            {"building": "Archery Range", "unit": "T1 Bowman (Archer)", "key": "archer", "bx": 1065, "by": 580},
            {"building": "Siege Workshop", "unit": "T1 Battering Ram (Siege)", "key": "siege", "bx": 475, "by": 540},
        ]

    # Deficit-aware camp priority: visit camps with the lowest verified troop count first (giving Siege 2x priority weight for 4x gather load)
    gt_units = (ist.get("groundTruth") or {}).get("unitsByType") or {}
    if gt_units:
        unit_rotation.sort(key=lambda u: int(gt_units.get(u["key"], 0)) * (0.5 if u["key"] == "siege" else 1.0))

    ist["currentTask"] = "Training STRICT T1 ONLY across Barracks, Archery Range, Stable & Siege Workshop"
    save_and_sync_blackbox(state)

    # Ensure inside City at exact home camera position with NO building selected
    if "16384" in port and not is_world_map(a) and has_world_map_unlocked(a):
        tap(adb, 55, 845, 2.8)
        a = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_city_{port}.png"))
    for _ in range(3):
        if a is not None and not is_world_map(a):
            break
        # If 'City ENTER' card is open on the World Map (cyan ENTER button at 1160, 650), tap ENTER directly
        if a is not None:
            ent = a[600:700, 1020:1300]
            is_ent = (ent[:, :, 2] >= 180) & (ent[:, :, 1] >= 140) & (ent[:, :, 0] <= 80)
            if int(is_ent.sum()) >= 2500:
                tap(adb, 1160, 650, 2.8)
                a = close_modals_to_hud(adb, port)
                continue
        tap(adb, 55, 845, 2.8)
        a = close_modals_to_hud(adb, port)

    # Auto-Heal Hospital Wounded T1 Troops if red cross bubble is visible inside the City
    if a is not None:
        h_sub = a[160:760, 180:1380]
        h_red = (h_sub[:, :, 0] >= 195) & (h_sub[:, :, 1] <= 65) & (h_sub[:, :, 2] <= 65)
        h_ys, h_xs = np.where(h_red)
        if len(h_xs) >= 50:
            hx, hy = int(np.median(h_xs) + 180), int(np.median(h_ys) + 160)
            tap(adb, hx, hy, 1.6)
            shot_hosp = os.path.join(SCRIPT_DIR, f"swarm_hosp_{port}.png")
            a_hosp = capture_screen(adb, shot_hosp)
            if a_hosp is not None and OCR is not None:
                try:
                    res_h, _ = OCR(shot_hosp)
                    for bbox, txt, _ in (res_h or []):
                        cx = int(sum(pt[0] for pt in bbox) / 4.0)
                        cy = int(sum(pt[1] for pt in bbox) / 4.0)
                        if "heal" in txt.strip().lower() and cy >= 600:
                            tap(adb, cx, cy, 3.8)
                            tap(adb, hx, hy, 1.2)
                            append_movement(
                                state,
                                port,
                                "HOSPITAL_HEAL",
                                f"Auto-healed wounded T1 troops in Hospital on {ist.get('activeGovernorName')}",
                                {"port": port, "x": hx, "y": hy},
                            )
                            break
                except Exception:
                    pass
            close_modals_to_hud(adb, port)

    shot_ring = os.path.join(SCRIPT_DIR, f"swarm_ring_{port}.png")
    shot_path = os.path.join(SCRIPT_DIR, f"swarm_train_{port}.png")

    # Recenter camera and measure (cam_dx, cam_dy) ONCE before the 4-building pass
    a_init = close_modals_to_hud(adb, port)
    if a_init is not None and is_world_map(a_init):
        tap(adb, 55, 845, 2.5)
        a_init = close_modals_to_hud(adb, port)
    cam_dx, cam_dy = _get_city_camera_offset(adb, port, a_init, allow_recenter=True)
    builder_queues_full = False
    ch_lvl = max(5, int(ist.get("cityHallLevel", 8)))

    for idx_t, target in enumerate(unit_rotation):
        if idx_t > 0:
            a_pre = close_modals_to_hud(adb, port)
            if a_pre is not None and is_world_map(a_pre):
                tap(adb, 55, 845, 2.5)
                a_pre = close_modals_to_hud(adb, port)
                cam_dx, cam_dy = _get_city_camera_offset(adb, port, a_pre, allow_recenter=True)

        bx = max(160, min(1530, target["bx"] + cam_dx))
        by = max(160, min(830, target["by"] + cam_dy))
        # Never tap inside the top-right Event HUD icon bar (Pioneer / Event Calendar / Grand Prix at x >= 1080, y <= 215)
        if bx >= 1080 and by <= 215:
            by = 235

        # Tap #1 on building (collects finished T1 troops if bubble is present, or opens action ring)
        tap(adb, bx, by, 1.0)
        a_ring = capture_screen(adb, shot_ring)
        if a_ring is None:
            continue

        # Search below the building center for the middle Upgrade (green) or Speedup (yellow) hexagon
        y0, y1 = max(220, by + 95), min(899, by + 310)
        x0, x1 = max(80, bx - 95), min(1540, bx + 95)

        def _detect_mid_hex(arr: np.ndarray):
            nonlocal x0, x1, y0, y1
            # If blue building title ribbon is visible near (bx, by - 110), center horizontal search on the ribbon
            r_y0, r_y1 = max(25, by - 220), min(620, by + 40)
            r_x0, r_x1 = max(120, bx - 220), min(1550, bx + 220)
            r_sub = arr[r_y0:r_y1, r_x0:r_x1]
            is_r = (r_sub[:, :, 2] >= 145) & (r_sub[:, :, 0] <= 55) & ((r_sub[:, :, 2].astype(np.int32) - r_sub[:, :, 0].astype(np.int32)) >= 100)
            rys, rxs = np.where(is_r)
            if len(rxs) >= 1500:
                rcx = int(np.median(rxs) + r_x0)
                rcy = int(np.median(rys) + r_y0)
                x0, x1 = max(80, rcx - 95), min(1540, rcx + 95)
                y0, y1 = max(220, rcy + 140), min(899, rcy + 460)
            sub = arr[y0:y1, x0:x1]
            gm = (
                (sub[:, :, 1] >= 120)
                & (sub[:, :, 0] <= 95)
                & ((sub[:, :, 1].astype(np.int32) - sub[:, :, 0].astype(np.int32)) >= 40)
                & ((sub[:, :, 1].astype(np.int32) - sub[:, :, 2].astype(np.int32)) >= 30)
            )
            ym = (
                (sub[:, :, 0] >= 165)
                & (sub[:, :, 1] >= 115)
                & (sub[:, :, 2] <= 75)
                & ((sub[:, :, 0].astype(np.int32) - sub[:, :, 2].astype(np.int32)) >= 95)
            )
            return np.where(gm), np.where(ym), arr

        (gys, gxs), (yys, yxs), a_ring = _detect_mid_hex(a_ring)

        # If Tap #1 collected finished troops (neither green Upgrade nor yellow Speedup opened), Tap #2 opens the building's action ring
        if len(gxs) < 200 and len(yxs) < 400:
            tap(adb, bx, by, 1.0)
            a_ring = capture_screen(adb, shot_ring)
            if a_ring is not None:
                (gys, gxs), (yys, yxs), a_ring = _detect_mid_hex(a_ring)

        # If middle hex is yellow Speedup ('>>'), this building is already actively training!
        if len(gxs) < 200 and len(yxs) >= 400:
            ist["currentTraining"][target["key"]] = f"{target['unit']} (Active Queue)"
            tap(adb, 1420, 550, 0.5)
            continue

        if len(gxs) < 200 or a_ring is None:
            tap(adb, 1420, 550, 0.5)
            continue

        gx_c = int(np.median(gxs) + x0)
        gy_c = int(np.median(gys) + y0)

        # Verify via blue ribbon OCR that this is a military building (never tap right hex on City Hall or Wall!)
        camp_lvl = 0
        if OCR is not None:
            rib_sub = a_ring[25:580, 175:1550]
            is_rib = (rib_sub[:, :, 2] >= 145) & (rib_sub[:, :, 0] <= 55) & ((rib_sub[:, :, 2].astype(np.int32) - rib_sub[:, :, 0].astype(np.int32)) >= 100)
            rys, rxs = np.where(is_rib)
            if len(rxs) >= 1500:
                rcx, rcy = int(np.median(rxs) + 175), int(np.median(rys) + 25)
                try:
                    r_res, _ = OCR(a_ring[max(0, rcy - 50) : min(900, rcy + 50), max(0, rcx - 210) : min(1600, rcx + 210)].astype(np.uint8))
                    rib_title = " ".join(r[1].strip() for r in (r_res or [])).lower()
                    if any(bad in rib_title for bad in ("hall", "wall", "tavern", "quarry", "farm", "lumber", "mill", "scout", "hospital", "academy", "store", "alliance", "watch", "tower")):
                        tap(adb, 1420, 550, 0.5)
                        continue
                    m_clvl = re.search(r"(\d{1,2})", rib_title)
                    if m_clvl:
                        camp_lvl = int(m_clvl.group(1))
                except Exception:
                    pass

        # If this military camp is below City Hall level (e.g. Level 4 < CH 8) and a builder slot may be free,
        # attempt to upgrade the camp first (middle green hex gx_c, gy_c) to permanently increase T1 batch capacity!
        if not builder_queues_full and 1 <= camp_lvl < ch_lvl:
            tap(adb, gx_c, gy_c, 1.3)
            a_upg = capture_screen(adb, shot_path)
            if a_upg is not None:
                inst_b = a_upg[625:820, 780:1035]
                inst_g = (inst_b[:, :, 0] >= 200) & (inst_b[:, :, 1] >= 135) & (inst_b[:, :, 2] <= 95)
                upg_b = a_upg[625:820, 1110:1360]
                upg_c = (upg_b[:, :, 2] >= 175) & (upg_b[:, :, 1] >= 140) & (upg_b[:, :, 0] <= 90)
                uys, uxs = np.where(upg_c)
                if int(inst_g.sum()) >= 1500 and len(uxs) >= 1500:
                    ux, uy = int(np.median(uxs) + 1110), int(np.median(uys) + 625)
                    tap(adb, ux, uy, 1.5)
                    a_post_u = capture_screen(adb, shot_path)
                    if a_post_u is not None and is_city_hud(a_post_u):
                        tap(adb, bx, by, 0.8)
                        ist["currentBuilding"] = f"Upgraded {target['building']} (Lv.{camp_lvl} -> Lv.{camp_lvl+1}) to expand T1 batch capacity"
                        append_movement(
                            state,
                            port,
                            "CITY_BUILDER",
                            f"Upgraded {target['building']} (Lv.{camp_lvl} -> Lv.{camp_lvl+1}) on {ist.get('activeGovernorName')} to expand T1 batch size",
                            {"building": target["building"], "fromLevel": camp_lvl, "toLevel": camp_lvl + 1},
                        )
                        continue
            # Builder queues are currently full or upgrade prereq/resources pending -> close modal & immediately train T1 batch
            builder_queues_full = True
            close_modals_to_hud(adb, port)
            tap(adb, bx, by, 1.0)

        tx_hex = min(1560, gx_c + 165)
        ty_hex = max(180, gy_c - 16)
        # Never tap inside the bottom-left Chat Box (x < 860, y > 800); clamping to y=800 hits the upper half of the Train hex cleanly
        if tx_hex < 860 and ty_hex > 800:
            ty_hex = 800

        tap(adb, tx_hex, ty_hex, 1.4)
        a_mod = capture_screen(adb, shot_path)
        if a_mod is None:
            continue

        # Verify that the grey training modal header is open and the cyan/gold TRAIN button (x=1080..1370, y=685..790, centered at 1232,736) is visible
        bh = a_mod[85:140, 350:1250]
        is_bh = (bh[:, :, 0] >= 150) & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 25)
        trn_btn = a_mod[685:790, 1080:1370]
        is_trn = (
            ((trn_btn[:, :, 1] >= 135) & (trn_btn[:, :, 2] >= 170) & (trn_btn[:, :, 0] <= 95))
            | ((trn_btn[:, :, 0] >= 195) & (trn_btn[:, :, 1] >= 130) & (trn_btn[:, :, 2] <= 80))
        )
        if float(np.mean(is_bh)) > 0.40 and int(is_trn.sum()) >= 1500:
            # STRICT T1 ONLY: Tap Tier I unit portrait at (785, 235) (NEVER (650, 225) which is the 'i' Unit Info button!) -> Tap TRAIN (1232, 736)
            tap(adb, 785, 235, 0.7)
            tap(adb, 1232, 736, 1.4)
            a_after = capture_screen(adb, shot_path)
            if a_after is not None and not is_city_hud(a_after):
                # If Replenish Resources modal popped up, tap Quick Replenish (977, 632) + TRAIN (1232, 736)
                tap(adb, 977, 632, 1.0)
                tap(adb, 1232, 736, 1.3)
                a_after = capture_screen(adb, shot_path)
            if a_after is not None:
                ist["screenPreviewB64"] = make_thumbnail_b64(a_after)
            tr_info = ist["currentTraining"]
            tr_info["policy"] = "T1 ONLY"
            tr_info[target["key"]] = f"{target['unit']} (Training T1 Batch)"
            tr_info["lastTrainedUnit"] = target["unit"]
            tr_info["t1BatchesCompleted"] = int(tr_info.get("t1BatchesCompleted", 0)) + 1
            tr_info["estimatedT1Troops"] = int(tr_info.get("estimatedT1Troops", 2400)) + 150
            append_movement(
                state,
                port,
                "TRAIN_T1_ONLY",
                f"Trained STRICT T1 ONLY batch: +150 {target['unit']} (Tier 1 portrait 785,235 -> TRAIN 1232,736)",
                {"unit": target["unit"], "tier": "T1 ONLY", "building": target["building"]},
            )
            tap(adb, 1420, 550, 0.5)
        else:
            if float(np.mean(is_bh)) > 0.40:
                tap(adb, 1365, 108, 0.8)
            tap(adb, 1420, 550, 0.5)

    ist["currentTraining"]["policy"] = "T1 ONLY"
    close_modals_to_hud(adb, port)


def run_scouting_and_villages(state: dict, inst: dict, cycle_idx: int):
    """
    Active Scouting, Fog Exploration, Tribal Village Tech Claiming & Mysterious Cave Investigation.
    1. Checks left-rail Scout Notification / Telescope icon (x=42..95, y=260..540) or Scout Camp inside City.
    2. Opens Exploration Modal and taps any 'Explore', 'Visit' (Tribal Village), or 'Investigate' (Cave) button.
    3. Taps the target on the World Map to dispatch the Scout or claim free Tribal Village technology.
    """
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "SCOUTING"
    ist["currentTask"] = "Dispatching Scouts to Fog, Tribal Villages & Mysterious Caves in #4197"
    save_and_sync_blackbox(state)

    a = close_modals_to_hud(adb, port)
    if a is None:
        return

    shot_scout = os.path.join(SCRIPT_DIR, f"swarm_scout_{port}.png")

    # 1. Check Left HUD Rail for Idle Scout / Village / Cave notification icon (x=35..95, y=250..520)
    left_rail = a[250:520, 35:95]
    # Look for gold/cyan/red badge on the left scout button
    has_scout_rail = int(((left_rail[:, :, 0] >= 185) & (left_rail[:, :, 1] >= 120) & (left_rail[:, :, 2] <= 85)).sum()) >= 120
    if has_scout_rail:
        rys, rxs = np.where((left_rail[:, :, 0] >= 185) & (left_rail[:, :, 1] >= 120) & (left_rail[:, :, 2] <= 85))
        sx_rail = int(np.median(rxs) + 35)
        sy_rail = int(np.median(rys) + 250)
        tap(adb, sx_rail, sy_rail, 1.5)
    else:
        # Tap Scout Camp directly inside City using live camera offset
        if is_world_map(a):
            tap(adb, 55, 845, 2.5)
            a = close_modals_to_hud(adb, port)
        cam_dx, cam_dy = _get_city_camera_offset(adb, port, a, allow_recenter=True)
        base_scx, base_scy = (818, 520) if "16384" in port else (1420, 265)
        sc_x = max(180, min(1480, base_scx + cam_dx))
        sc_y = max(235 if sc_x >= 1080 else 180, min(790, base_scy + cam_dy))
        tap(adb, sc_x, sc_y, 1.2)
        a_sc = capture_screen(adb, shot_scout)
        if a_sc is not None:
            # Find the right-most Explore action hex on the selected Scout Camp
            hx0, hx1 = max(200, sc_x), min(1560, sc_x + 310)
            hy0, hy1 = max(260, sc_y + 60), min(880, sc_y + 340)
            hex_area = a_sc[hy0:hy1, hx0:hx1]
            exp_mask = (
                ((hex_area[:, :, 2] >= 165) & (hex_area[:, :, 1] >= 115) & (hex_area[:, :, 0] <= 85))
                | ((hex_area[:, :, 0] >= 195) & (hex_area[:, :, 1] >= 135) & (hex_area[:, :, 2] <= 80))
            )
            eys, exs = np.where(exp_mask)
            if len(exs) >= 200:
                tap(adb, int(np.median(exs) + hx0), int(np.median(eys) + hy0), 1.5)
            else:
                tap(adb, 1520, 320, 0.5)

    # 2. Check if the Exploration / Scout Camp Modal is now open
    a_mod = capture_screen(adb, shot_scout)
    if a_mod is not None:
        # Look for 'Explore', 'Visit', or 'Investigate' buttons in the modal right column (x=950..1380, y=180..790)
        btn_col = a_mod[180:790, 950:1380]
        btn_mask = (
            ((btn_col[:, :, 2] >= 165) & (btn_col[:, :, 1] >= 125) & (btn_col[:, :, 0] <= 90))
            | ((btn_col[:, :, 0] >= 195) & (btn_col[:, :, 1] >= 130) & (btn_col[:, :, 2] <= 80))
        )
        bys, bxs = np.where(btn_mask)
        if len(bxs) >= 450:
            bx = int(np.median(bxs) + 950)
            by = int(np.median(bys) + 180)
            tap(adb, bx, by, 2.4)
            # Now centered on Fog / Tribal Village / Mysterious Cave on World Map -> tap Explore / Send / Claim
            a_map = capture_screen(adb, shot_scout)
            if a_map is not None:
                # Check for center/right Explore or Investigate button (x=880..1420, y=380..790)
                m_box = a_map[380:790, 880:1420]
                m_btn = (
                    ((m_box[:, :, 2] >= 165) & (m_box[:, :, 1] >= 125) & (m_box[:, :, 0] <= 90))
                    | ((m_box[:, :, 0] >= 195) & (m_box[:, :, 1] >= 130) & (m_box[:, :, 2] <= 80))
                )
                mys, mxs = np.where(m_btn)
                if len(mxs) >= 450:
                    mx = int(np.median(mxs) + 880)
                    my = int(np.median(mys) + 380)
                    tap(adb, mx, my, 1.8)
                    # If Send Scout march confirmation modal opened, tap Send / March (1160, 760)
                    a_send = capture_screen(adb, shot_scout)
                    if a_send is not None and not is_city_hud(a_send):
                        tap(adb, 1160, 760, 1.6)
                    ist["currentScouting"] = {
                        "status": "EXPLORING_FOG_AND_VILLAGES",
                        "lastDispatchedAt": utc_now_iso(),
                    }
                    append_movement(
                        state,
                        port,
                        "SCOUT_EXPLORE",
                        f"Dispatched Scout / Claimed Tribal Village or Cave in #4197 on {ist.get('activeGovernorName')}",
                        {"port": port, "status": "EXPLORING"},
                    )
                else:
                    # Tap center tile (800, 450) in case it is a Tribal Village gift node
                    tap(adb, 800, 450, 1.5)
                    ist["currentScouting"] = {
                        "status": "VILLAGE_CHECKED",
                        "lastDispatchedAt": utc_now_iso(),
                    }

    close_modals_to_hud(adb, port)


def run_resource_farming(state: dict, inst: dict, cycle_idx: int):
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "FARMING"

    # Calibrated 1600x900 World Map Search coordinates (bottom icon row y=859, SEARCH button y=608)
    # Strict Resource Gathering (FOOD, WOOD, STONE, and GOLD at CH10+) to fund CH8 -> CH16 upgrades
    rss_types = [
        {"name": "FOOD (Cropland)", "code": "FOOD", "iconX": 557, "iconY": 859, "searchX": 559, "searchY": 608, "minusX": 423, "minusY": 490, "plusX": 698, "plusY": 490, "actionWord": "gather"},
        {"name": "WOOD (Logging Camp)", "code": "WOOD", "iconX": 797, "iconY": 859, "searchX": 797, "searchY": 608, "minusX": 660, "minusY": 490, "plusX": 934, "plusY": 490, "actionWord": "gather"},
        {"name": "STONE (Stone Deposit)", "code": "STONE", "iconX": 1037, "iconY": 859, "searchX": 1037, "searchY": 608, "minusX": 900, "minusY": 490, "plusX": 1176, "plusY": 490, "actionWord": "gather"},
    ]
    if int(ist.get("cityHallLevel", 8)) >= 10:
        rss_types.append({"name": "GOLD (Gold Deposit)", "code": "GOLD", "iconX": 1279, "iconY": 859, "searchX": 1279, "searchY": 608, "minusX": 1140, "minusY": 490, "plusX": 1416, "plusY": 490, "actionWord": "gather"})

    def _parse_rss_amount(val_str: str) -> float:
        s = re.sub(r"[^0-9.KMB]", "", str(val_str or "0").strip().upper())
        if not s:
            return 0.0
        mult = 1.0
        if s.endswith("B"):
            mult, s = 1_000_000_000.0, s[:-1]
        elif s.endswith("M"):
            mult, s = 1_000_000.0, s[:-1]
        elif s.endswith("K"):
            mult, s = 1_000.0, s[:-1]
        try:
            return float(s) * mult
        except Exception:
            return 0.0

    # Deficit-aware resource sorting: always dispatch to the lowest held resource in rssBags first
    cur_bags = ist.get("rssBags") or {}
    rss_types.sort(key=lambda r: _parse_rss_amount(cur_bags.get(r["code"].lower(), "0")) * (1.25 if r["code"] == "STONE" else 1.0))

    def _is_search_card_still_open(arr: np.ndarray | None, sx: int) -> bool:
        if arr is None:
            return False
        tl_back = arr[18:82, 18:82]
        is_tl_silver = (
            (tl_back[:, :, 0] >= 150)
            & (tl_back[:, :, 1] >= 155)
            & (tl_back[:, :, 2] >= 160)
            & (np.abs(tl_back[:, :, 0].astype(np.int32) - tl_back[:, :, 2].astype(np.int32)) <= 25)
        )
        if float(np.mean(is_tl_silver)) <= 0.45:
            return False
        s_box = arr[555:650, max(0, sx - 95) : min(1600, sx + 95)]
        cy_px = (s_box[:, :, 2] >= 180) & (s_box[:, :, 1] >= 140) & (s_box[:, :, 0] <= 80)
        return int(cy_px.sum()) >= 1800

    def _scan_node_popup(shot_file: str, act_word: str):
        if OCR is None or not os.path.exists(shot_file):
            return None, False
        found_xy = None
        is_gathering = False
        try:
            res_pop, _ = OCR(shot_file)
            pop_texts = []
            for bbox, txt, _ in (res_pop or []):
                cx = int(sum(pt[0] for pt in bbox) / 4.0)
                cy = int(sum(pt[1] for pt in bbox) / 4.0)
                t_low = txt.strip().lower()
                if cy >= 180 and cx >= 480:
                    pop_texts.append(t_low)
                if "recall" in t_low and cy >= 450:
                    is_gathering = True
                elif act_word in t_low and cy >= 400 and cx >= 750:
                    found_xy = (cx, cy)
            joined_pop = " ".join(pop_texts)
            if "unoccupied" in joined_pop or "teleport" in joined_pop:
                found_xy = None
        except Exception:
            found_xy = None
        return found_xy, is_gathering

    verified_troops = int(ist.get("currentTraining", {}).get("verifiedTotalTroops", 5000))
    max_marches = 1 if verified_troops < 12000 else 2

    for march_slot in range(max_marches):
        target_rss = rss_types[march_slot % len(rss_types)]
        ist["currentTask"] = f"Dispatching T1 March ({march_slot+1}/{max_marches}) to {target_rss['name']} in #4197"
        save_and_sync_blackbox(state)

        a = close_modals_to_hud(adb, port)
        if a is None:
            continue

        # Enter World Map (up to 2 taps on 55,845 in case a building was selected)
        for _ in range(2):
            if is_world_map(a):
                break
            tap(adb, 55, 845, 2.8)
            a = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_map_{port}.png"))
            if a is not None and is_counselor_dialogue(a):
                tap(adb, 800, 780, 1.0)
                tap(adb, 800, 780, 1.0)
                a = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_map_{port}.png"))

        if a is None or not is_world_map(a):
            continue

        coords = parse_map_coordinates(a)
        if coords["x"] > 0 or coords["y"] > 0:
            ist["coordinates"] = coords
        ist["rssBags"] = merge_rss_bar(ist.get("rssBags"), a)
        ist["screenPreviewB64"] = make_thumbnail_b64(a)

        # Check right-side active march queue indicator (cyan collapse button at x=1455..1510, y=180..228)
        mq_box = a[180:228, 1455:1510]
        is_mq_cyan = (mq_box[:, :, 2] >= 180) & (mq_box[:, :, 1] >= 130) & (mq_box[:, :, 0] <= 75)
        has_active_map_march = int(is_mq_cyan.sum()) >= 450
        if has_active_map_march and max_marches == 1:
            # Our primary gather march (carrying all city troops) is already actively gathering on the map!
            break

        # Open World Map Search bar (45, 735) and verify top-left silver Back arrow (18:82, 18:82) appears (in case 'City ENTER' swallowed tap #1)
        shot_node = os.path.join(SCRIPT_DIR, f"swarm_node_{port}.png")
        tap(adb, 45, 735, 1.3)
        a_sb = capture_screen(adb, shot_node)
        if a_sb is not None:
            tl_sb = a_sb[18:82, 18:82]
            is_sb_open = (
                (tl_sb[:, :, 0] >= 150)
                & (tl_sb[:, :, 1] >= 155)
                & (tl_sb[:, :, 2] >= 160)
                & (np.abs(tl_sb[:, :, 0].astype(np.int32) - tl_sb[:, :, 2].astype(np.int32)) <= 25)
            )
            if float(np.mean(is_sb_open)) <= 0.40:
                tap(adb, 45, 735, 1.3)
        tap(adb, target_rss["iconX"], target_rss["iconY"], 1.0)
        tap(adb, target_rss["searchX"], target_rss["searchY"], 2.8)

        a_node = capture_screen(adb, shot_node)

        # Smart Level Sweep: if no node exists at current level (SEARCH card stays open), try Level+1, Level+2, then Level 1
        if _is_search_card_still_open(a_node, target_rss["searchX"]):
            tap(adb, target_rss["plusX"], target_rss["plusY"], 0.6)
            tap(adb, target_rss["searchX"], target_rss["searchY"], 2.8)
            a_node = capture_screen(adb, shot_node)
        if _is_search_card_still_open(a_node, target_rss["searchX"]):
            tap(adb, target_rss["plusX"], target_rss["plusY"], 0.6)
            tap(adb, target_rss["searchX"], target_rss["searchY"], 2.8)
            a_node = capture_screen(adb, shot_node)
        if _is_search_card_still_open(a_node, target_rss["searchX"]):
            for _ in range(3):
                tap(adb, target_rss["minusX"], target_rss["minusY"], 0.4)
            tap(adb, target_rss["searchX"], target_rss["searchY"], 2.8)
            a_node = capture_screen(adb, shot_node)

        # Dismiss first-time Counselor resource point tutorial dialogue if present
        if a_node is not None and is_counselor_dialogue(a_node):
            for _ in range(3):
                tap(adb, 800, 780, 1.1)
                a_node = capture_screen(adb, shot_node)
                if a_node is None or not is_counselor_dialogue(a_node):
                    break

        node_coords = parse_map_coordinates(a_node) if a_node is not None else {"x": 0, "y": 0}
        if node_coords.get("x", 0) > 0:
            ist["coordinates"] = node_coords

        # IRONCLAD OCR GATE: Check if GATHER / ATTACK popup is already open; if not (and Search card closed), tap centered node (800, 450) once
        act_xy, already_gathering = _scan_node_popup(shot_node, target_rss["actionWord"])
        if act_xy is None and not already_gathering and not _is_search_card_still_open(a_node, target_rss["searchX"]):
            tap(adb, 800, 450, 1.6)
            a_node = capture_screen(adb, shot_node)
            act_xy, already_gathering = _scan_node_popup(shot_node, target_rss["actionWord"])

        if already_gathering:
            # Our troop is already actively gathering this node! Leave it undisturbed.
            ist["currentFarming"] = {
                "resource": target_rss["code"],
                "label": target_rss["name"],
                "nodeX": node_coords.get("x", ist["coordinates"].get("x", 0)),
                "nodeY": node_coords.get("y", ist["coordinates"].get("y", 0)),
                "startedAt": utc_now_iso(),
                "status": "GATHERING",
            }
            tap(adb, 250, 120, 0.6)
            break

        if act_xy is not None:
            tap(adb, act_xy[0], act_xy[1], 1.8)
            a_nt = capture_screen(adb, shot_node)
            if a_nt is not None and is_counselor_dialogue(a_nt):
                tap(adb, 800, 780, 1.1)
                a_nt = capture_screen(adb, shot_node)

            # Tap 'New Troop' cyan button (1263, 202 when 0/2 marches active, or lower when 1/2 active)
            # IMPORTANT: Never match the top cream text 'Dispatch a new troop from your city' at y=95!
            nt_x, nt_y = 1263, 202
            found_nt = False
            if a_nt is not None:
                nt_sub = a_nt[140:460, 1130:1395]
                is_nt_cy = (nt_sub[:, :, 2] >= 185) & (nt_sub[:, :, 1] >= 135) & (nt_sub[:, :, 0] <= 90)
                nys, nxs = np.where(is_nt_cy)
                if len(nxs) >= 1500:
                    nt_x, nt_y = int(np.median(nxs) + 1130), int(np.median(nys) + 140)
                    found_nt = True
            if not found_nt and a_nt is not None and OCR is not None:
                try:
                    res_nt, _ = OCR(shot_node)
                    for bbox, txt, _ in (res_nt or []):
                        cx = int(sum(pt[0] for pt in bbox) / 4.0)
                        cy = int(sum(pt[1] for pt in bbox) / 4.0)
                        t_low = txt.strip().lower()
                        if "new" in t_low and "troop" in t_low and "dispatch" not in t_low and cy >= 150:
                            nt_x, nt_y = cx, cy
                            found_nt = True
                            break
                except Exception:
                    pass

            tap(adb, nt_x, nt_y, 1.8)
            a_m = capture_screen(adb, shot_node)

            # Check if empty Primary Commander '+' slot is shown (e.g. second march slot without commander assigned yet)
            if a_m is not None:
                m_box_0 = a_m[740:845, 1005:1320]
                gold_m_0 = int(((m_box_0[:, :, 0] >= 200) & (m_box_0[:, :, 1] >= 125) & (m_box_0[:, :, 2] <= 75)).sum())
                if gold_m_0 < 2500:
                    plus_sub = a_m[415:500, 440:530]
                    if float(np.mean((plus_sub[:, :, 1] >= 200) & (plus_sub[:, :, 2] >= 210))) > 0.25:
                        tap(adb, 483, 457, 1.0)
                        tap(adb, 66, 250, 1.4)
                        a_m = capture_screen(adb, shot_node)

            has_city_troops = True
            march_x, march_y = 1162, 790
            if a_m is not None:
                m_box = a_m[740:845, 1005:1320]
                is_gold_m = (m_box[:, :, 0] >= 200) & (m_box[:, :, 1] >= 125) & (m_box[:, :, 2] <= 75)
                mys, mxs = np.where(is_gold_m)
                if len(mxs) >= 2500:
                    march_x, march_y = int(np.median(mxs) + 1005), int(np.median(mys) + 740)
                else:
                    has_city_troops = False
                if OCR is not None:
                    try:
                        res_m, _ = OCR(shot_node)
                        for bbox, txt, _ in (res_m or []):
                            t_low = txt.strip().lower()
                            if "don't have any troops" in t_low or "no units" in t_low or "units:0/" in t_low.replace(" ", ""):
                                has_city_troops = False
                    except Exception:
                        pass

            if not has_city_troops:
                # All troops are already out on the map in an active march! Close New Troop modal at (1395, 58) and stop.
                tap(adb, 1395, 58, 1.0)
                break

            tap(adb, march_x, march_y, 2.2)
            a_after_m = capture_screen(adb, shot_node)
            ist["screenPreviewB64"] = make_thumbnail_b64(a_after_m)
            ist["currentFarming"] = {
                "resource": target_rss["code"],
                "label": target_rss["name"],
                "nodeX": node_coords.get("x", ist["coordinates"].get("x", 0)),
                "nodeY": node_coords.get("y", ist["coordinates"].get("y", 0)),
                "startedAt": utc_now_iso(),
                "status": "HUNTING_BARBS" if target_rss["code"] == "BARBARIANS" else "GATHERING",
            }
            append_movement(
                state,
                port,
                "BARB_HUNT" if target_rss["code"] == "BARBARIANS" else "FARMING_MARCH",
                f"Dispatched T1 {'Barbarian hunt' if target_rss['code'] == 'BARBARIANS' else 'gather march'} to {target_rss['name']} at (X:{ist['currentFarming']['nodeX']}, Y:{ist['currentFarming']['nodeY']})",
                ist["currentFarming"],
            )
            continue

        tap(adb, 250, 120, 0.8)

    # Return cleanly to City after multi-march dispatch
    a_end = close_modals_to_hud(adb, port)
    if is_world_map(a_end):
        tap(adb, 55, 845, 2.2)

def run_city_builder_burst(state: dict, inst: dict, steps_count: int = 12):
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "BUILDING"
    ist["currentTask"] = f"Upgrading City Hall (Target CH16) & queues ({steps_count} steps, T1-ONLY enforced)"
    save_and_sync_blackbox(state)

    a_pre = close_modals_to_hud(adb, port)
    if is_world_map(a_pre):
        tap(adb, 55, 845, 2.2)

    try:
        proc = subprocess.Popen(
            [
                sys.executable,
                "-u",
                os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py"),
                "--adb",
                adb,
                "--kingdom",
                TARGET_KINGDOM,
                "--steps",
                str(steps_count),
                "--target-ch",
                "16",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        tut_f1_path = os.path.join(SCRIPT_DIR, f"auto_step_{port}.png")
        start_b_ts = time.time()
        max_wait_s = max(120, steps_count * 10)
        last_tut_mtime = 0.0
        while proc.poll() is None:
            if (time.time() - start_b_ts) > max_wait_s:
                proc.kill()
                break
            time.sleep(1.2)
            now_b = time.time()
            if (now_b - _LAST_LIVE_PREVIEW_SYNC.get(port, 0.0)) >= 4.5 and os.path.exists(tut_f1_path):
                try:
                    mt = os.path.getmtime(tut_f1_path)
                    if mt > last_tut_mtime:
                        last_tut_mtime = mt
                        _LAST_LIVE_PREVIEW_SYNC[port] = now_b
                        arr_tut = np.array(Image.open(tut_f1_path).convert("RGB"))
                        if (now_b - _LAST_RED_BORDER_ALERT.get(port, 0.0)) >= 45.0 and is_watchtower_red_vignette(arr_tut):
                            _LAST_RED_BORDER_ALERT[port] = now_b
                            proc.kill()
                            _handle_red_border_interrupt(adb, port, arr_tut)
                            break
                        ist["screenPreviewB64"] = make_thumbnail_b64(arr_tut)
                        ist["updatedAt"] = utc_now_iso()
                        save_and_sync_blackbox(state)
                except Exception:
                    pass
        stdout_str, _ = proc.communicate(timeout=5)
        out_lines = [ln.strip() for ln in (stdout_str or "").splitlines() if ln.strip()]
        for ln in out_lines:
            m_chl = re.search(r"\[CH_LEVEL\]\s*level=(\d{1,2})", ln)
            if m_chl:
                ist["cityHallLevel"] = int(m_chl.group(1))
        last_blds = [ln for ln in out_lines if any(k in ln for k in ("Upgrade", "Build", "Quest", "TRAIN", "City Hall", "Handshake"))]
        if last_blds:
            summary_line = last_blds[-1][-95:]
            ist["currentBuilding"] = summary_line
            append_movement(
                state,
                port,
                "CITY_BUILDER",
                f"Builder cycle on {ist.get('activeGovernorName')}: {summary_line}",
                {"steps": 10, "lastAction": summary_line},
            )
    except Exception:
        ist["currentBuilding"] = "City Hall & Resource/Military Queue Active"

    a = close_modals_to_hud(adb, port)
    if a is not None:
        ist["screenPreviewB64"] = make_thumbnail_b64(a)
        ist["rssBags"] = merge_rss_bar(ist.get("rssBags"), a)
        pwr = parse_hud_power(a)
        if pwr > 0:
            ist["power"] = pwr


def maybe_rotate_or_sleep(state: dict, inst: dict, cycle_idx: int):
    port = inst["port"]
    ist = state["instances"][port]
    roster = ist.get("roster4197", [])

    next_rot_ts = datetime.fromtimestamp(time.time() + 1800, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ist["nextRotationAt"] = next_rot_ts

    if len(roster) >= 2 and cycle_idx > 0 and (cycle_idx % 4 == 0):
        ist["status"] = "ROTATING"
        ist["currentTask"] = "Rotating to secondary legal #4197 character on this emulator"
        ist["sleepStatus"] = "ROTATING SHIFT (#4197 SLOT 1 <-> SLOT 2)"
        save_and_sync_blackbox(state)
        audit_and_ensure_4197_roster(state, inst)
    else:
        ist["sleepStatus"] = "AWAKE (ACTIVE SHIFT)"


def main():
    if os.path.exists(os.path.join(SCRIPT_DIR, "SOLO_4197_MODE.flag")) and "--force-swarm" not in sys.argv:
        import solo_4197_agent
        return solo_4197_agent.main()

    parser = argparse.ArgumentParser()
    parser.add_argument("--cycles", type=int, default=999999, help="Number of continuous swarm rotation cycles")
    args = parser.parse_args()

    try:
        flag_p = os.path.join(SCRIPT_DIR, "pause_swarm.flag")
        if os.path.exists(flag_p):
            os.remove(flag_p)
    except Exception:
        pass

    state = load_blackbox()
    for inst in INSTANCES:
        p = inst["port"]
        adb = inst["adb"]
        ensure_adb(adb)
        ensure_rok_foreground(adb)
        a_init = close_modals_to_hud(adb, p)
        if a_init is not None:
            state["instances"][p]["screenPreviewB64"] = make_thumbnail_b64(a_init)
            state["instances"][p]["rssBags"] = parse_rss_bar(a_init)
            pwr = parse_hud_power(a_init)
            if pwr > 0:
                state["instances"][p]["power"] = pwr
            coords = parse_map_coordinates(a_init)
            if coords["x"] > 0 or coords["y"] > 0:
                state["instances"][p]["coordinates"] = coords
    append_movement(
        state,
        "ALL",
        "SWARM_BOOT",
        "All 3 SIDEKICK instances connected & synced to BastionControl DynamoDB (Strict T1-ONLY + Black-Box active)",
        {"instances": [i["adb"] for i in INSTANCES]},
    )
    save_and_sync_blackbox(state)

    for cycle_idx in range(args.cycles):
        for inst in INSTANCES:
            port = inst["port"]
            adb = inst["adb"]
            ensure_adb(adb)
            ensure_rok_foreground(adb)
            ist = state["instances"][port]

            # 0. Kingdom Lock: Audit Character Management if not yet verified in #4197 OR if map coordinates ever drifted off #4197
            cur_kd_check = str(ist.get("coordinates", {}).get("kingdom", "4197"))
            if not ist.get("verifiedIn4197") or cur_kd_check != "4197":
                ist["verifiedIn4197"] = False
                audit_and_ensure_4197_roster(state, inst)
                ist["verifiedIn4197"] = True

            # 1. Queue #1 — Military Training (Barracks, Archery Range, Stable, Siege Workshop -> T1 ONLY)
            run_t1_only_training(state, inst, cycle_idx)

            # 2. Queue #2 — Active Scouting, Fog Exploration, Tribal Villages & Mysterious Caves
            run_scouting_and_villages(state, inst, cycle_idx)

            # 3. Queue #3 — Multi-March Resource Gathering (Fill open march slots on Food, Wood, Stone)
            a_check = close_modals_to_hud(adb, port)
            if a_check is not None and has_world_map_unlocked(a_check):
                run_resource_farming(state, inst, cycle_idx)

            # 4. Queue #4 — Smart City Hall & Academy Builder (Fast 6-step pass for idle builders/quests)
            run_city_builder_burst(state, inst, steps_count=6)

            # 5. Queue #5 — Watchtower & Mail Threat Recon + Ground-Truth More Info & Troop Audit
            run_blackbox_threat_check(state, inst)
            if not (ist.get("groundTruth") or {}).get("verifiedAt") or (cycle_idx % 2 == 0):
                audit_bot_ground_truth_stats(state, inst)
            ist["sleepStatus"] = "AWAKE (HARMONIOUS 5-QUEUE LOOP)"

            hs_hit = _LAST_HANDSHAKE_HIT.pop(adb, None)
            if hs_hit:
                append_movement(
                    state,
                    port,
                    "ALLIANCE_HELP",
                    f"Auto-tapped Alliance Help Handshake at ({hs_hit[0]}, {hs_hit[1]}) on {ist.get('activeGovernorName')}",
                    {"x": hs_hit[0], "y": hs_hit[1]},
                )
            cur_kd = str(ist.get("coordinates", {}).get("kingdom", "4197"))
            if cur_kd == "4197":
                ist["status"] = "ACTIVE_IN_4197"
                ist["currentTask"] = f"Active in #4197 // Farming {ist['currentFarming'].get('resource', 'FOOD')} & Training T1 ONLY"
            else:
                ist["status"] = "ROTATING"
                ist["currentTask"] = f"On #{cur_kd} // Provisioning / Switching into Kingdom #4197..."
            ist["updatedAt"] = utc_now_iso()
            save_and_sync_blackbox(state)

        time.sleep(5.0)


if __name__ == "__main__":
    main()
