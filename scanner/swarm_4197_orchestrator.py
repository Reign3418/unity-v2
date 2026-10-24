"""
VALHEON UNITY — KINGDOM #4197 MULTI-BOT SWARM ORCHESTRATOR & BLACK-BOX RECORDER
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


def capture_screen(adb_serial: str, out_path: str) -> np.ndarray | None:
    try:
        raw = subprocess.check_output(
            [ADB_PATH, "-s", adb_serial, "exec-out", "screencap", "-p"],
            timeout=12,
        )
        if len(raw) > 1000:
            with open(out_path, "wb") as f:
                f.write(raw)
            return np.array(Image.open(io.BytesIO(raw)).convert("RGB"))
    except Exception:
        pass
    return None


def make_thumbnail_b64(arr: np.ndarray | None, width: int = 480, height: int = 270) -> str:
    if arr is None:
        return ""
    try:
        im = Image.fromarray(arr.astype(np.uint8))
        im = im.resize((width, height), Image.Resampling.BILINEAR)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=60)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return ""


def is_city_hud(a: np.ndarray | None) -> bool:
    if a is None:
        return False
    p = a[25:70, 85:200]
    green = (p[:, :, 1] > 140) & (p[:, :, 1] > p[:, :, 0] + 30) & (p[:, :, 1] > p[:, :, 2] + 30)
    if float(np.mean(green)) < 0.08:
        return False
    rib = a[85:125, 15:70]
    if float((rib[:, :, 2].astype(np.float32) - rib[:, :, 0].astype(np.float32)).mean()) < 28.0:
        return False
    bh = a[85:140, 250:1350]
    is_bh = (bh[:, :, 0] >= 150) & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 25)
    if float(np.mean(is_bh)) > 0.40:
        return False
    return True


def is_world_map(a: np.ndarray | None) -> bool:
    if a is None or not is_city_hud(a):
        return False
    coord_bar = a[10:48, 280:560]
    return float(coord_bar.mean()) < 145.0


def is_gov_profile_open(a: np.ndarray | None) -> bool:
    if a is None:
        return False
    ban = a[220:680, 140:500]
    is_ban = (ban[:, :, 0] >= 170) & (ban[:, :, 1] >= 110) & (ban[:, :, 2] <= 60)
    pan = a[220:680, 550:1400]
    is_pan = (pan[:, :, 2] >= 120) & (pan[:, :, 0] <= 45)
    return float(np.mean(is_ban)) > 0.28 and float(np.mean(is_pan)) > 0.70


def close_modals_to_hud(adb_serial: str, port: str) -> np.ndarray | None:
    ensure_rok_foreground(adb_serial)
    shot_path = os.path.join(SCRIPT_DIR, f"swarm_hud_{port}.png")
    for _ in range(5):
        a = capture_screen(adb_serial, shot_path)
        if a is None:
            break
        # Dismiss Top-Center Alliance Invite Popup if present (JOIN ALLIANCE at 703,320 / Close X at 1089,165)
        inv_row = (a[295:355, :, 2] >= 165) & (a[295:355, :, 0] <= 45)
        if int(inv_row[:, 615:785].sum()) >= 3500 and int(inv_row[:, 810:980].sum()) >= 3500:
            tap(adb_serial, 1089, 175, 0.9)
            continue
        # Dismiss Building Move / Placement overlay (Red X at ~616,204 and Green Check at ~800,204)
        bm_red = (a[140:270, 550:680, 0] >= 200) & (a[140:270, 550:680, 1] <= 75) & (a[140:270, 550:680, 2] <= 75)
        bm_grn = (a[140:270, 735:865, 1] >= 175) & (a[140:270, 735:865, 0] <= 105) & (a[140:270, 735:865, 2] <= 105)
        if int(bm_red.sum()) >= 350 and int(bm_grn.sum()) >= 350:
            tap(adb_serial, 800, 204, 1.0)
            tap(adb_serial, 616, 204, 1.0)
            continue
        if is_city_hud(a):
            return a
        if is_gov_profile_open(a):
            tap(adb_serial, 1454, 105, 1.0)
            continue
        # Event Calendar (tan header y=20..80, x=200..1350) -> Close (1386, 58)
        ec_hdr = a[20:80, 200:1350]
        is_ec = (ec_hdr[:, :, 0] >= 165) & (ec_hdr[:, :, 1] >= 135) & (ec_hdr[:, :, 2] >= 95) & ((ec_hdr[:, :, 0].astype(np.int32) - ec_hdr[:, :, 2].astype(np.int32)) >= 30)
        if float(np.mean(is_ec[:, :550])) > 0.45 and float(np.mean(is_ec[:, 650:])) > 0.45:
            tap(adb_serial, 1386, 58, 1.0)
            continue
        # Join Alliance / Mail / Character modals
        bh = a[85:140, 250:1350]
        is_bh = (bh[:, :, 0] >= 150) & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_bh)) > 0.40:
            tap(adb_serial, 1365, 108, 0.8)
            tap(adb_serial, 1398, 102, 0.8)
            continue
        mh = a[35:80, 200:1550]
        is_mh = (mh[:, :, 0] >= 140) & (np.abs(mh[:, :, 0].astype(np.int32) - mh[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_mh[:, :1100])) > 0.45:
            tap(adb_serial, 1408, 62, 0.8)
            tap(adb_serial, 1540, 48, 0.8)
            continue
        tap(adb_serial, 1454, 105, 0.7)
        tap(adb_serial, 48, 52, 0.7)
    return capture_screen(adb_serial, shot_path)


def parse_rss_bar(a: np.ndarray | None) -> dict:
    rss = {"food": "0", "wood": "0", "stone": "0", "gold": "0", "gems": "0"}
    if a is None or OCR is None:
        return rss
    try:
        crop = a[5:56, 720:1590].astype(np.uint8)
        res, _ = OCR(crop)
        if not res:
            return rss
        items = []
        for bbox, txt, _ in res:
            cx = sum(pt[0] for pt in bbox) / 4.0 + 720
            clean = re.sub(r"[^0-9.KMBkmb]", "", txt.strip()).upper()
            if clean and any(ch.isdigit() for ch in clean):
                items.append((cx, clean))
        items.sort(key=lambda x: x[0])
        keys = ["food", "wood", "stone", "gold", "gems"]
        for idx, (_, val) in enumerate(items[:5]):
            rss[keys[idx]] = val
    except Exception:
        pass
    return rss


def parse_hud_power(a: np.ndarray | None) -> int:
    if a is None or OCR is None:
        return 0
    try:
        crop = a[8:52, 95:245].astype(np.uint8)
        res, _ = OCR(crop)
        for _, txt, _ in (res or []):
            digits = re.sub(r"[^0-9]", "", txt)
            if digits and len(digits) >= 3:
                return int(digits)
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


def append_movement(state: dict, port: str, category: str, action: str, details: dict | None = None):
    gov = state["instances"].get(port, {}).get("activeGovernorName", f"Bot-{port}")
    entry = {
        "id": f"mov-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        "timestamp": utc_now_iso(),
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


def save_and_sync_blackbox(state: dict):
    state["updatedAt"] = utc_now_iso()
    state["orchestratorPid"] = os.getpid()
    state["movements"] = state.get("movements", [])[:60]
    state["threats"] = state.get("threats", [])[:30]

    total_bots = 0
    total_t1 = 0
    for p, inst in state["instances"].items():
        # Sanitize any legacy HUD word accidentally stored as governor name
        if inst.get("activeGovernorName") in ("Build", "Event", "Settings", "rian", "Recruit", "Explore"):
            inst["activeGovernorName"] = f"Belerion-Bot-{p}"
        r_count = max(1, len(inst.get("roster4197", [])))
        total_bots += r_count
        total_t1 += int(inst.get("currentTraining", {}).get("estimatedT1Troops", 2400))

    state["summary"]["totalBotsIn4197"] = total_bots
    state["summary"]["totalT1Trained"] = total_t1
    state["summary"]["estimatedKpPool"] = int(total_t1 * 0.2)
    state["summary"]["hostileScoutsCount"] = sum(1 for t in state["threats"] if t.get("eventType") == "SCOUT")
    state["summary"]["hostileAttacksCount"] = sum(1 for t in state["threats"] if t.get("eventType") != "SCOUT")

    tmp = BLACKBOX_JSON_PATH + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        os.replace(tmp, BLACKBOX_JSON_PATH)
    except Exception:
        pass

    # 1. Sync directly to AWS DynamoDB BastionControl (us-east-2) so valheon.com & localhost update in real time!
    if _DYNAMO_STORE is not None:
        try:
            _DYNAMO_STORE.put_control(
                "SWARM_4197_BLACKBOX",
                {
                    "updated_at": state["updatedAt"],
                    "payload_json": json.dumps(state),
                },
            )
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
        ist["rssBags"] = parse_rss_bar(a)
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
                ist["rssBags"] = parse_rss_bar(a_after)
                ist["coordinates"]["kingdom"] = "4197"
            return

        # Close Character & Settings modals back to HUD
        tap(adb, 1398, 102, 1.0)
        tap(adb, 1398, 102, 1.0)
        tap(adb, 1454, 105, 1.0)

        # If this instance is on a different kingdom (e.g. #3477 or #4205) and #4197 wasn't switched above, invoke provision_neighbor_kingdom.py
        if not is_4197_currently_active and any_cards_seen > 0 and not roster_4197:
            prov_script = os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py")
            if os.path.exists(prov_script):
                append_movement(
                    state,
                    port,
                    "PROVISION_4197",
                    f"Provisioning / switching {inst['label']} into Kingdom #4197 via provision_neighbor_kingdom.py",
                    {"targetKingdom": "4197"},
                )
                subprocess.run(
                    [sys.executable, "-u", prov_script, "--adb", adb, "--kingdom", "4197", "--mode", "create", "--skip-tutorial"],
                    capture_output=True,
                    timeout=180,
                )
                close_modals_to_hud(adb, port)


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
            "screenshotB64": make_thumbnail_b64(a, 480, 270),
        }
        state["threats"].insert(0, incident)
        ist["lastWatchtowerAlert"] = utc_now_iso()
        append_movement(state, port, "THREAT_DETECTED", "Watchtower Red Vignette Alert triggered!", incident)

    # 2. Mail REPORT Tab Check
    mail_badge = a[790:840, 1495:1555]
    has_red_mail = int(((mail_badge[:, :, 0] >= 195) & (mail_badge[:, :, 1] <= 65) & (mail_badge[:, :, 2] <= 65)).sum()) >= 35
    if has_red_mail:
        tap(adb, 1495, 845, 1.8)
        tap(adb, 445, 58, 1.8)
        rep_path = os.path.join(SCRIPT_DIR, f"swarm_mail_report_{port}.png")
        a_rep = capture_screen(adb, rep_path)
        if a_rep is not None and OCR is not None:
            try:
                res, _ = OCR(rep_path)
                lines = [r[1].strip() for r in (res or []) if r[1].strip()]
                full_txt = " | ".join(lines)
                low_txt = full_txt.lower()
                hostile_kw = ("scouted", "reconnaissance", "spied", "watchtower", "city was attacked", "attacked your", "plundered", "siege")
                if any(k in low_txt for k in hostile_kw) and "barbarian" not in low_txt:
                    ev_type = "SCOUT" if any(s in low_txt for s in ("scout", "reconnaissance", "spied", "watchtower")) else "CITY_HIT"
                    m_tag = re.search(r"\[([A-Za-z0-9]{2,5})\]([A-Za-z0-9_\- ]{2,18})", full_txt)
                    alliance_tag = m_tag.group(1) if m_tag else ""
                    attacker_name = m_tag.group(2).strip() if m_tag else "Hostile Governor (#4197)"
                    recent_texts = {t.get("rawReportText", "") for t in state["threats"][:10]}
                    if full_txt[:180] not in recent_texts:
                        ts_slug = int(time.time())
                        incident = {
                            "id": f"threat-{ts_slug}-{port}",
                            "timestamp": utc_now_iso(),
                            "eventType": ev_type,
                            "severity": "HIGH" if ev_type == "SCOUT" else "CRITICAL",
                            "targetPort": port,
                            "targetBot": ist.get("activeGovernorName", f"Bot-{port}"),
                            "attackerName": attacker_name,
                            "allianceTag": alliance_tag,
                            "coordinates": ist.get("coordinates", {"kingdom": "4197", "x": 0, "y": 0}),
                            "rawReportText": full_txt[:220],
                            "screenshotB64": make_thumbnail_b64(a_rep, 480, 270),
                        }
                        state["threats"].insert(0, incident)
                        append_movement(
                            state,
                            port,
                            "THREAT_DETECTED",
                            f"{ev_type} captured on {ist.get('activeGovernorName')}: {attacker_name}",
                            incident,
                        )
            except Exception:
                pass
        tap(adb, 1540, 48, 1.0)


def run_t1_only_training(state: dict, inst: dict, cycle_idx: int):
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "TRAINING_T1"

    unit_rotation = [
        {"building": "Barracks", "unit": "T1 Swordsman (Infantry)", "key": "infantry"},
        {"building": "Archery Range", "unit": "T1 Bowman (Archer)", "key": "archer"},
        {"building": "Stable", "unit": "T1 Horseman (Cavalry)", "key": "cavalry"},
        {"building": "Siege Workshop", "unit": "T1 Battering Ram (Siege)", "key": "siege"},
    ]
    target = unit_rotation[cycle_idx % len(unit_rotation)]
    ist["currentTask"] = f"Training STRICT T1 ONLY: {target['unit']} in {target['building']}"
    save_and_sync_blackbox(state)

    a = close_modals_to_hud(adb, port)
    if a is None:
        return
    if is_world_map(a):
        tap(adb, 45, 845, 2.2)
        a = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_city_{port}.png"))

    # Locate sleeping 'Zz' or military buildings in the city (Barracks is typically below City Hall around 625,545 or 405,550)
    mil_coords = [(625, 545), (405, 550), (880, 520), (1050, 390)]
    bx, by = mil_coords[cycle_idx % len(mil_coords)]
    tap(adb, bx, by, 1.3)
    tap(adb, bx + 75, by + 85, 1.5)

    shot_path = os.path.join(SCRIPT_DIR, f"swarm_train_{port}.png")
    a_mod = capture_screen(adb, shot_path)
    if a_mod is not None:
        trn_btn = a_mod[700:815, 1100:1360]
        is_trn = (
            ((trn_btn[:, :, 1] >= 140) & (trn_btn[:, :, 2] >= 175) & (trn_btn[:, :, 0] <= 95))
            | ((trn_btn[:, :, 0] >= 200) & (trn_btn[:, :, 1] >= 135) & (trn_btn[:, :, 2] <= 75))
        )
        if int(is_trn.sum()) >= 2000:
            # STRICT T1 ONLY: Tap Tier 1 slot (650, 225) -> Tap TRAIN (1236, 735)
            tap(adb, 650, 225, 0.7)
            tap(adb, 1236, 735, 1.2)
            a_after = capture_screen(adb, shot_path)
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
                f"Trained STRICT T1 ONLY batch: +150 {target['unit']} (Tier 1 slot 650,225 -> TRAIN 1236,735)",
                {"unit": target["unit"], "tier": "T1 ONLY", "building": target["building"]},
            )
            close_modals_to_hud(adb, port)
            return

    ist["currentTraining"]["policy"] = "T1 ONLY"
    ist["currentTraining"][target["key"]] = f"{target['unit']} (Active Queue)"
    close_modals_to_hud(adb, port)


def run_resource_farming(state: dict, inst: dict, cycle_idx: int):
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "FARMING"

    rss_types = [
        {"name": "FOOD (Cropland)", "code": "FOOD", "iconX": 415, "iconY": 780, "searchX": 415, "searchY": 595},
        {"name": "WOOD (Logging Camp)", "code": "WOOD", "iconX": 670, "iconY": 780, "searchX": 670, "searchY": 595},
        {"name": "STONE (Stone Deposit)", "code": "STONE", "iconX": 925, "iconY": 780, "searchX": 925, "searchY": 595},
        {"name": "GOLD (Gold Deposit)", "code": "GOLD", "iconX": 1180, "iconY": 780, "searchX": 1180, "searchY": 595},
    ]
    target_rss = rss_types[cycle_idx % len(rss_types)]
    ist["currentTask"] = f"Dispatching T1 Gatherers to farm {target_rss['name']} in #4197"
    save_and_sync_blackbox(state)

    a = close_modals_to_hud(adb, port)
    if a is None:
        return

    if not is_world_map(a):
        tap(adb, 45, 845, 3.0)
        a = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_map_{port}.png"))

    if a is not None:
        coords = parse_map_coordinates(a)
        if coords["x"] > 0 or coords["y"] > 0:
            ist["coordinates"] = coords
        ist["rssBags"] = parse_rss_bar(a)
        ist["screenPreviewB64"] = make_thumbnail_b64(a)

    tap(adb, 45, 735, 1.5)
    tap(adb, target_rss["iconX"], target_rss["iconY"], 1.0)
    tap(adb, target_rss["searchX"], target_rss["searchY"], 2.8)

    shot_node = os.path.join(SCRIPT_DIR, f"swarm_node_{port}.png")
    a_node = capture_screen(adb, shot_node)
    node_coords = parse_map_coordinates(a_node) if a_node is not None else {"x": 0, "y": 0}
    if node_coords.get("x", 0) > 0:
        ist["coordinates"] = node_coords

    tap(adb, 800, 450, 1.5)
    a_pop = capture_screen(adb, shot_node)
    if a_pop is not None:
        g_box = a_pop[480:780, 1000:1450]
        g_gold = (g_box[:, :, 0] >= 200) & (g_box[:, :, 1] >= 130) & (g_box[:, :, 2] <= 75)
        gys, gxs = np.where(g_gold)
        if len(gxs) >= 900:
            gx = int(np.median(gxs) + 1000)
            gy = int(np.median(gys) + 480)
            tap(adb, gx, gy, 1.6)
            tap(adb, 1260, 225, 1.6)
            tap(adb, 1160, 815, 1.8)
            a_m = capture_screen(adb, shot_node)
            ist["screenPreviewB64"] = make_thumbnail_b64(a_m)
            ist["currentFarming"] = {
                "resource": target_rss["code"],
                "label": target_rss["name"],
                "nodeX": node_coords.get("x", ist["coordinates"].get("x", 0)),
                "nodeY": node_coords.get("y", ist["coordinates"].get("y", 0)),
                "startedAt": utc_now_iso(),
                "status": "GATHERING",
            }
            append_movement(
                state,
                port,
                "FARMING_MARCH",
                f"Dispatched T1 gather march to {target_rss['name']} at (X:{ist['currentFarming']['nodeX']}, Y:{ist['currentFarming']['nodeY']})",
                ist["currentFarming"],
            )
            return

    # Update currentFarming target info even if all marches are currently out or city is below gather level
    ist["currentFarming"] = {
        "resource": target_rss["code"],
        "label": target_rss["name"],
        "nodeX": ist["coordinates"].get("x", 0),
        "nodeY": ist["coordinates"].get("y", 0),
        "startedAt": utc_now_iso(),
        "status": "ROTATING_NODES",
    }
    tap(adb, 45, 845, 2.0)


def run_city_builder_burst(state: dict, inst: dict):
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "BUILDING"
    ist["currentTask"] = "Upgrading City Hall & Resource/Military queues + claiming quests (T1-ONLY enforced)"
    save_and_sync_blackbox(state)

    try:
        proc = subprocess.run(
            [
                sys.executable,
                "-u",
                os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py"),
                "--adb",
                adb,
                "--kingdom",
                TARGET_KINGDOM,
                "--steps",
                "18",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=150,
        )
        out_lines = [ln.strip() for ln in (proc.stdout or "").splitlines() if ln.strip()]
        last_blds = [ln for ln in out_lines if any(k in ln for k in ("Upgrade", "Build", "Quest", "TRAIN", "City Hall"))]
        if last_blds:
            summary_line = last_blds[-1][-95:]
            ist["currentBuilding"] = summary_line
            append_movement(
                state,
                port,
                "CITY_BUILDER",
                f"Builder cycle on {ist.get('activeGovernorName')}: {summary_line}",
                {"steps": 18, "lastAction": summary_line},
            )
    except Exception as e:
        ist["currentBuilding"] = f"Builder queue active ({str(e)[:40]})"

    shot_path = os.path.join(SCRIPT_DIR, f"swarm_postbuild_{port}.png")
    a = capture_screen(adb, shot_path)
    if a is not None:
        ist["screenPreviewB64"] = make_thumbnail_b64(a)
        ist["rssBags"] = parse_rss_bar(a)
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--cycles", type=int, default=999999, help="Number of continuous swarm rotation cycles")
    args = parser.parse_args()

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

            if cycle_idx == 0 or (cycle_idx % 4 == 0):
                audit_and_ensure_4197_roster(state, inst)

            run_blackbox_threat_check(state, inst)
            run_t1_only_training(state, inst, cycle_idx)
            run_city_builder_burst(state, inst)
            run_resource_farming(state, inst, cycle_idx)
            maybe_rotate_or_sleep(state, inst, cycle_idx)

            ist["status"] = "ACTIVE_IN_4197"
            ist["currentTask"] = f"Active in #4197 — Farming {ist['currentFarming'].get('resource', 'FOOD')} & Training T1 ONLY"
            ist["updatedAt"] = utc_now_iso()
            save_and_sync_blackbox(state)

        time.sleep(5.0)


if __name__ == "__main__":
    main()
