"""
VALHEON UNITY — KINGDOM #4197 MULTI-BOT SWARM ORCHESTRATOR & BLACK-BOX RECORDER
===============================================================================
Dedicated exclusively to Kingdom #4197 (Kingdom of Belerion) on SIDEKICK:
  1. Respects active tasks before taking over any emulator port (:16384, :16416, :16448).
  2. Discovers & provisions all legal #4197 characters per account (up to 2/2 per emulator)
     and rotates them through humanized active shifts and sleep windows.
  3. Enforces STRICT T1-ONLY troop training (taps Tier 1 unit slot (650, 225) before TRAIN
     (1236, 735) across Barracks, Archery Range, Stable, and Siege Workshop) so bots
     build high-load, fast-heal T1 armies for easy KP & RSS harvesting.
  4. Dispatches idle marches to farm Food, Wood, Stone, and Gold nodes in #4197 and records
     city & node coordinates + plunderable RSS bags.
  5. Black-Box Threat & Flight Recorder: monitors Watchtower alerts & Mail REPORT tab via
     RapidOCR to capture any player who scouts or attacks the bots (Governor Name,
     [Alliance Tag], Event Type SCOUT / CITY_HIT / NODE_HIT, Coordinates, Screenshot proof)
     plus every bot movement, upgrade, T1 training batch, and rotation event.
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
    r"C:\Program Files\BlueStacks_nxt\HD-Adb.exe",
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


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ensure_adb(adb_serial: str):
    try:
        subprocess.run([ADB_PATH, "connect", adb_serial], capture_output=True, timeout=8)
    except Exception:
        pass


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


def swipe(adb_serial: str, x1: int, y1: int, x2: int, y2: int, dur_ms: int = 500, wait_s: float = 1.0):
    try:
        subprocess.run(
            [ADB_PATH, "-s", adb_serial, "shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(dur_ms)],
            capture_output=True,
            timeout=10,
        )
    except Exception:
        pass
    time.sleep(wait_s)


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
        im.save(buf, format="JPEG", quality=68)
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
    # Check top coordinate ribbon (globe/magnifying glass + K:4197 X:... Y:... at y=8..52, x=260..580)
    coord_bar = a[10:48, 280:560]
    has_dark_bar = float(coord_bar.mean()) < 145.0
    return has_dark_bar


def close_modals_to_hud(adb_serial: str, port: str):
    shot_path = os.path.join(SCRIPT_DIR, f"swarm_hud_{port}.png")
    for _ in range(5):
        a = capture_screen(adb_serial, shot_path)
        if a is None:
            break
        if is_city_hud(a):
            return a
        # Try common modal close X buttons and ESC/Back
        bh = a[85:140, 250:1350]
        is_bh = (bh[:, :, 0] >= 150) & (np.abs(bh[:, :, 0].astype(np.int32) - bh[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_bh)) > 0.40:
            tap(adb_serial, 1365, 108, 1.0)
            continue
        mh = a[35:80, 200:1550]
        is_mh = (mh[:, :, 0] >= 140) & (np.abs(mh[:, :, 0].astype(np.int32) - mh[:, :, 1].astype(np.int32)) < 25)
        if float(np.mean(is_mh[:, :1100])) > 0.45:
            tap(adb_serial, 1540, 48, 1.0)
            continue
        tap(adb_serial, 1454, 105, 0.8)
        tap(adb_serial, 48, 52, 0.8)
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
            mk = re.search(r"(\d{4})", full)
            if mk:
                coords["kingdom"] = mk.group(1)
            if mx:
                coords["x"] = int(mx.group(1))
            if my:
                coords["y"] = int(my.group(1))
            if coords["x"] == 0 and coords["y"] == 0:
                nums = [int(n) for n in re.findall(r"\b\d{2,4}\b", full) if n != "4197"]
                if len(nums) >= 2:
                    coords["x"], coords["y"] = nums[0], nums[1]
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
            "totalBotsIn4197": 0,
            "activeInstances": 3,
            "totalT1Trained": 0,
            "estimatedKpPool": 0,
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
                "power": 0,
                "killPoints": 0,
                "status": "INITIALIZING",
                "currentTask": "Waiting for current tasks to finish before #4197 Swarm Rotation",
                "currentBuilding": "City Hall / Resource Queue",
                "currentFarming": {"resource": "IDLE", "nodeX": 0, "nodeY": 0, "status": "READY"},
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
                "rssBags": {"food": "150K", "wood": "150K", "stone": "75K", "gold": "20K", "gems": "300"},
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
    entry = {
        "id": f"mov-{int(time.time() * 1000)}-{random.randint(100, 999)}",
        "timestamp": utc_now_iso(),
        "port": port,
        "instanceId": state["instances"].get(port, {}).get("instanceId", f"mumu-{port}"),
        "governorName": state["instances"].get(port, {}).get("activeGovernorName", f"Bot-{port}"),
        "kingdom": TARGET_KINGDOM,
        "category": category,
        "action": action,
        "details": details or {},
    }
    state["movements"].insert(0, entry)
    state["movements"] = state["movements"][:180]
    state["summary"]["totalMovementsLogged"] = int(state["summary"].get("totalMovementsLogged", 0)) + 1
    try:
        with open(FLIGHT_LOG_PATH, "a", encoding="utf-8") as lf:
            lf.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def save_and_sync_blackbox(state: dict):
    state["updatedAt"] = utc_now_iso()
    state["orchestratorPid"] = os.getpid()

    total_bots = 0
    total_t1 = 0
    for p, inst in state["instances"].items():
        r_count = max(1, len(inst.get("roster4197", [])))
        total_bots += r_count
        total_t1 += int(inst.get("currentTraining", {}).get("estimatedT1Troops", 0))

    state["summary"]["totalBotsIn4197"] = total_bots
    state["summary"]["totalT1Trained"] = total_t1
    # In RoK, 1 T1 kill = 0.2 KP (1 KP per 5 T1 troops)
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

    try:
        req = urllib.request.Request(
            CLUSTER_HUB_URL,
            data=json.dumps(state).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=2.5)
    except Exception:
        pass


def is_port_busy_with_external_task(port: str) -> bool:
    """Checks if an external auto_tutorial_ch8.py or provision_neighbor_kingdom.py is still running on this port."""
    prog_path = os.path.join(SCRIPT_DIR, f"scan_progress_{port}.json")
    if not os.path.exists(prog_path):
        return False
    try:
        with open(prog_path, "r", encoding="utf-8") as f:
            prog = json.load(f)
        if not prog.get("running"):
            return False
        updated_str = prog.get("updatedAt", "")
        if updated_str:
            dt = datetime.strptime(updated_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            age_sec = (datetime.now(timezone.utc) - dt).total_seconds()
            # Only treat as actively busy if updated within the last 45 seconds
            if age_sec < 45:
                return True
    except Exception:
        pass
    return False


def audit_and_ensure_4197_roster(state: dict, inst: dict):
    """
    Opens Governor Profile -> Settings -> Characters on the instance:
      - Reads current Governor Name, Power, Kill Points, CH Level, and Kingdom.
      - Discovers all #4197 characters in the account's Character Roster (up to 2 legal slots).
      - Switches to #4197 if currently on another kingdom (#4021/#4198), or spawns a #4197
        character if none exists yet.
    """
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

    # Open Governor Profile (top-left avatar 55, 55)
    tap(adb, 55, 55, 2.2)
    prof_path = os.path.join(SCRIPT_DIR, f"swarm_prof_{port}.png")
    a_prof = capture_screen(adb, prof_path)
    if a_prof is not None and OCR is not None:
        ist["screenPreviewB64"] = make_thumbnail_b64(a_prof)
        try:
            res, _ = OCR(a_prof[100:720, 200:1450].astype(np.uint8))
            texts = [r[1].strip() for r in (res or [])]
            joined = " | ".join(texts)
            m_id = re.search(r"ID\s*[:)]?\s*(\d{6,12})", joined, re.IGNORECASE)
            if m_id:
                ist["activeGovernorId"] = m_id.group(1)
            for t in texts:
                if "Governor" in t or len(t) >= 4:
                    if not any(k in t.lower() for k in ("governor profile", "power", "kill points", "alliance", "civilization", "id")):
                        if re.match(r"^[A-Za-z0-9_\-\[\] ]{3,22}$", t):
                            ist["activeGovernorName"] = t
                            break
        except Exception:
            pass

    # Tap Settings (1345, 795) -> Characters (412, 460)
    tap(adb, 1345, 795, 2.0)
    tap(adb, 412, 460, 3.0)
    char_path = os.path.join(SCRIPT_DIR, f"swarm_chars_{port}.png")
    a_char = capture_screen(adb, char_path)
    roster_4197 = []
    other_active = False
    switch_target = None

    if a_char is not None and OCR is not None:
        ist["screenPreviewB64"] = make_thumbnail_b64(a_char)
        try:
            res, _ = OCR(char_path)
            # Group OCR tokens by character card region:
            # Left column cards: x=200..780, Right column cards: x=800..1380
            # Row 1: y=200..440, Row 2: y=450..690, Row 3: y=690..860
            for bbox, txt, _ in (res or []):
                t_clean = txt.strip()
                if "4197" in t_clean:
                    cx = int(sum(pt[0] for pt in bbox) / 4.0)
                    cy = int(sum(pt[1] for pt in bbox) / 4.0)
                    # Check if this card has the green active checkmark on its right side
                    x0 = 200 if cx < 800 else 800
                    x1 = 780 if cx < 800 else 1380
                    y0 = max(140, cy - 90)
                    y1 = min(860, cy + 90)
                    card = a_char[y0:y1, x0:x1]
                    grn = (card[:, :, 1] >= 170) & (card[:, :, 0] <= 95) & (card[:, :, 2] <= 95)
                    is_active_card = int(grn.sum()) >= 180
                    slot_info = {
                        "kingdom": "4197",
                        "cardX": cx,
                        "cardY": cy,
                        "active": is_active_card,
                        "label": t_clean,
                    }
                    roster_4197.append(slot_info)
                    if not is_active_card and switch_target is None:
                        switch_target = (cx, cy)
                elif any(k in t_clean for k in ("4021", "4198", "4194", "4205")):
                    cx = int(sum(pt[0] for pt in bbox) / 4.0)
                    cy = int(sum(pt[1] for pt in bbox) / 4.0)
                    x0 = 200 if cx < 800 else 800
                    x1 = 780 if cx < 800 else 1380
                    y0 = max(140, cy - 90)
                    y1 = min(860, cy + 90)
                    card = a_char[y0:y1, x0:x1]
                    grn = (card[:, :, 1] >= 170) & (card[:, :, 0] <= 95) & (card[:, :, 2] <= 95)
                    if int(grn.sum()) >= 180:
                        other_active = True
        except Exception:
            pass

    if roster_4197:
        ist["roster4197"] = roster_4197

    # If currently active character is NOT in #4197, and we have a #4197 character in roster -> Switch to it!
    if other_active and switch_target is not None:
        sx, sy = switch_target
        append_movement(
            state,
            port,
            "CHARACTER_SWITCH",
            f"Switching {inst['label']} into Kingdom #4197 character at ({sx}, {sy})",
            {"targetKingdom": "4197", "cardCoords": [sx, sy]},
        )
        tap(adb, sx, sy, 2.0)
        tap(adb, 1016, 637, 18.0)  # Tap YES on "Log in as this character?"
        close_modals_to_hud(adb, port)
        return

    # Close Character & Settings modals back to HUD
    tap(adb, 1398, 102, 1.0)
    tap(adb, 1398, 102, 1.0)
    tap(adb, 1454, 105, 1.0)

    # If no #4197 character was found and we were on another kingdom, invoke provision_neighbor_kingdom.py for 4197
    if other_active and not roster_4197:
        append_movement(
            state,
            port,
            "PROVISION_4197",
            f"Provisioning legal #4197 character on {inst['label']}",
            {"targetKingdom": "4197"},
        )
        ist["status"] = "PROVISIONING_4197"
        ist["currentTask"] = "Spawning new legal #4197 character via Character Management"
        save_and_sync_blackbox(state)
        try:
            subprocess.run(
                [sys.executable, "-u", os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py"), "--adb", adb, "--kingdom", TARGET_KINGDOM, "--steps", "120"],
                timeout=600,
            )
        except Exception:
            pass


def run_blackbox_threat_check(state: dict, inst: dict):
    """
    Inspects Watchtower vignette and opens Mail -> REPORT tab to detect and OCR any
    hostile Scout or Attack reports against this bot in #4197.
    """
    port = inst["port"]
    adb = inst["adb"]
    ist = state["instances"][port]
    ist["status"] = "BLACKBOX_RECON"
    ist["currentTask"] = "Scanning Watchtower & Mail Reports for hostile scouts/attacks"
    save_and_sync_blackbox(state)

    a = close_modals_to_hud(adb, port)
    if a is None:
        return

    # 1. Check Watchtower red screen border alert vignette
    top_edge = a[0:18, 200:1400]
    bot_edge = a[882:900, 200:1400]
    red_vig = (
        ((top_edge[:, :, 0] >= 200) & (top_edge[:, :, 1] <= 55) & (top_edge[:, :, 2] <= 55)).mean()
        + ((bot_edge[:, :, 0] >= 200) & (bot_edge[:, :, 1] <= 55) & (bot_edge[:, :, 2] <= 55)).mean()
    ) / 2.0
    if red_vig > 0.25:
        ts_slug = int(time.time())
        alert_path = os.path.join(SCRIPT_DIR, f"blackbox_watchtower_{port}_{ts_slug}.png")
        capture_screen(adb, alert_path)
        b64_ev = make_thumbnail_b64(a, 640, 360)
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
            "screenshotB64": b64_ev,
        }
        state["threats"].insert(0, incident)
        state["threats"] = state["threats"][:100]
        ist["lastWatchtowerAlert"] = utc_now_iso()
        append_movement(state, port, "THREAT_DETECTED", "Watchtower Red Vignette Alert triggered!", incident)

    # 2. Check Mail icon unread badge at bottom-right (x=1460..1545, y=790..875)
    mail_badge = a[790:840, 1495:1555]
    has_red_mail = int(((mail_badge[:, :, 0] >= 195) & (mail_badge[:, :, 1] <= 65) & (mail_badge[:, :, 2] <= 65)).sum()) >= 35

    # Open Mail -> REPORT tab (445, 58) periodically or when unread badge is present
    if has_red_mail or random.random() < 0.45:
        tap(adb, 1495, 845, 1.8)  # Open Mail
        tap(adb, 445, 58, 1.8)    # Select REPORT tab
        rep_path = os.path.join(SCRIPT_DIR, f"swarm_mail_report_{port}.png")
        a_rep = capture_screen(adb, rep_path)
        if a_rep is not None and OCR is not None:
            ist["screenPreviewB64"] = make_thumbnail_b64(a_rep)
            try:
                res, _ = OCR(rep_path)
                lines = [r[1].strip() for r in (res or []) if r[1].strip()]
                full_txt = " | ".join(lines)
                low_txt = full_txt.lower()
                # Filter for hostile PvP scout / attack keywords and ignore barbarian PvE reports
                hostile_kw = ("scouted", "reconnaissance", "spied", "watchtower", "city was attacked", "attacked your", "plundered", "siege", "defeat")
                pve_kw = ("barbarian", "graves", "vengeance", "keeper")
                if any(k in low_txt for k in hostile_kw) and not all(p in low_txt for p in ("barbarian",)):
                    ev_type = "SCOUT" if any(s in low_txt for s in ("scout", "reconnaissance", "spied", "watchtower")) else "CITY_HIT"
                    if "gather" in low_txt or "resource" in low_txt or "node" in low_txt:
                        if ev_type != "SCOUT":
                            ev_type = "NODE_HIT"
                    # Extract [AllianceTag] and Attacker Name if present
                    m_tag = re.search(r"\[([A-Za-z0-9]{2,5})\]([A-Za-z0-9_\- ]{2,18})", full_txt)
                    alliance_tag = m_tag.group(1) if m_tag else ""
                    attacker_name = m_tag.group(2).strip() if m_tag else "Hostile Governor (#4197)"
                    if attacker_name == "Hostile Governor (#4197)":
                        for ln in lines:
                            if any(h in ln.lower() for h in ("scouted", "attacked", "reconnaissance")):
                                attacker_name = ln[:48]
                                break

                    # Avoid duplicate logging of the exact same report text within the last 10 threats
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
                            "rawReportText": full_txt[:260],
                            "screenshotB64": make_thumbnail_b64(a_rep, 640, 360),
                        }
                        state["threats"].insert(0, incident)
                        state["threats"] = state["threats"][:100]
                        append_movement(
                            state,
                            port,
                            "HOSTILE_" + ev_type,
                            f"{ev_type} captured on {ist.get('activeGovernorName')}: {attacker_name} {('[' + alliance_tag + ']') if alliance_tag else ''}",
                            incident,
                        )
            except Exception:
                pass
        # Close Mail modal
        tap(adb, 1540, 48, 1.2)


def run_t1_only_training(state: dict, inst: dict, cycle_idx: int):
    """
    Strictly trains Tier 1 (T1 ONLY) troops across Barracks, Archery Range, Stable, and Siege Workshop.
    Whenever the Training Modal is open, explicitly taps the Tier 1 slot at (650, 225) BEFORE tapping TRAIN (1236, 735).
    """
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
        tap(adb, 45, 845, 2.2)  # Return to City view
        a = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_city_{port}.png"))

    # Use auto_tutorial_ch8 City Hall anchor / building locator or Quest sidebar to trigger training
    # First check if any completed training bubble is floating over military buildings in the city (y=220..680, x=350..1250)
    # Tap around the military district to collect finished T1 troops and open the building menu
    mil_coords = [
        (680, 490),  # Barracks typical zone
        (880, 520),  # Archery Range typical zone
        (1050, 390), # Stable typical zone
        (520, 560),  # Siege Workshop typical zone
    ]
    bx, by = mil_coords[cycle_idx % len(mil_coords)]
    tap(adb, bx, by, 1.4)

    shot_path = os.path.join(SCRIPT_DIR, f"swarm_train_{port}.png")
    a_bld = capture_screen(adb, shot_path)
    # Look for the right-side "Train" circular button on the selected building ring (gold/cyan icon)
    # Or tap offset (+75, +85) from building click where the Train action bubble appears
    tap(adb, bx + 75, by + 85, 1.5)
    a_mod = capture_screen(adb, shot_path)

    if a_mod is not None:
        # Check if Troop Training Modal is open (cyan/gold TRAIN button at x=1100..1360, y=700..815)
        trn_btn = a_mod[700:815, 1100:1360]
        is_trn = (
            ((trn_btn[:, :, 1] >= 140) & (trn_btn[:, :, 2] >= 175) & (trn_btn[:, :, 0] <= 95))
            | ((trn_btn[:, :, 0] >= 200) & (trn_btn[:, :, 1] >= 135) & (trn_btn[:, :, 2] <= 75))
        )
        if int(is_trn.sum()) >= 2000:
            # STRICT T1 ONLY ENFORCEMENT:
            # 1. Tap Tier 1 unit icon slot at (650, 225)
            tap(adb, 650, 225, 0.7)
            # 2. Tap TRAIN button at (1236, 735)
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
                f"Trained STRICT T1 ONLY batch: +150 {target['unit']} (Selected Tier 1 slot 650,225 -> TRAIN 1236,735)",
                {"unit": target["unit"], "tier": "T1 ONLY", "building": target["building"]},
            )
            close_modals_to_hud(adb, port)
            return

    # Even if direct building tap hit an empty spot, record status and let the 25-step builder burst also trigger T1 training quests
    ist["currentTraining"]["policy"] = "T1 ONLY"
    ist["currentTraining"][target["key"]] = f"{target['unit']} (Active Queue)"
    close_modals_to_hud(adb, port)


def run_resource_farming(state: dict, inst: dict, cycle_idx: int):
    """
    Switches to the #4197 World Map, reads City/Map coordinates, searches for Food, Wood, Stone, or Gold
    via the Magnifying Glass Search (45, 735), and dispatches a gathering march.
    """
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

    # Switch from City to World Map if currently inside the City
    if not is_world_map(a):
        tap(adb, 45, 845, 3.0)
        a = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_map_{port}.png"))

    if a is not None:
        coords = parse_map_coordinates(a)
        if coords["x"] > 0 or coords["y"] > 0:
            ist["coordinates"] = coords
        ist["rssBags"] = parse_rss_bar(a)
        ist["screenPreviewB64"] = make_thumbnail_b64(a)

    # Tap Search magnifying glass (45, 735)
    tap(adb, 45, 735, 1.5)
    # Tap Resource Type icon (Food=415,780 | Wood=670,780 | Stone=925,780 | Gold=1180,780)
    tap(adb, target_rss["iconX"], target_rss["iconY"], 1.0)
    # Tap SEARCH button above the selected resource icon
    tap(adb, target_rss["searchX"], target_rss["searchY"], 2.8)

    # Camera has panned to the resource node at screen center (800, 450)
    shot_node = os.path.join(SCRIPT_DIR, f"swarm_node_{port}.png")
    a_node = capture_screen(adb, shot_node)
    node_coords = parse_map_coordinates(a_node) if a_node is not None else {"x": 0, "y": 0}

    # Tap the resource node at (800, 450)
    tap(adb, 800, 450, 1.5)
    a_pop = capture_screen(adb, shot_node)
    if a_pop is not None:
        # Look for golden GATHER button on the right half (x=1050..1420, y=520..760)
        g_box = a_pop[520:760, 1050:1420]
        g_gold = (g_box[:, :, 0] >= 200) & (g_box[:, :, 1] >= 130) & (g_box[:, :, 2] <= 75)
        gys, gxs = np.where(g_gold)
        if len(gxs) >= 1200:
            gx = int(np.median(gxs) + 1050)
            gy = int(np.median(gys) + 520)
            tap(adb, gx, gy, 1.6)
            # Tap NEW TROOP (1260, 225)
            tap(adb, 1260, 225, 1.6)
            # Tap MARCH (1160, 815)
            tap(adb, 1160, 815, 1.8)
            a_m = capture_screen(adb, shot_node)
            ist["screenPreviewB64"] = make_thumbnail_b64(a_m)
            ist["currentFarming"] = {
                "resource": target_rss["code"],
                "label": target_rss["name"],
                "nodeX": node_coords.get("x", 0),
                "nodeY": node_coords.get("y", 0),
                "startedAt": utc_now_iso(),
                "status": "GATHERING",
            }
            append_movement(
                state,
                port,
                "FARMING_MARCH",
                f"Dispatched T1 gather march to {target_rss['name']} at (X:{node_coords.get('x', 0)}, Y:{node_coords.get('y', 0)})",
                ist["currentFarming"],
            )
            return

    # Return to City HUD after farming check
    tap(adb, 45, 845, 2.0)


def run_city_builder_burst(state: dict, inst: dict):
    """
    Runs a focused 22-step burst of auto_tutorial_ch8.py (with T1-ONLY enforcement)
    to keep builders upgrading City Hall, Resource Mills, and Military Buildings,
    claim quests, and collect Alliance Help / VIP.
    """
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
                "22",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=180,
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
                {"steps": 22, "lastAction": summary_line},
            )
    except Exception as e:
        ist["currentBuilding"] = f"Builder queue active ({str(e)[:40]})"

    shot_path = os.path.join(SCRIPT_DIR, f"swarm_postbuild_{port}.png")
    a = capture_screen(adb, shot_path)
    if a is not None:
        ist["screenPreviewB64"] = make_thumbnail_b64(a)
        ist["rssBags"] = parse_rss_bar(a)


def maybe_rotate_or_sleep(state: dict, inst: dict, cycle_idx: int):
    """
    Implements humanized shift rotation:
      - If the account has 2 legal #4197 characters in its roster, rotates between them
        every 4 cycles (~45 minutes) so both #4197 bots stay active, farmed, and built!
      - Logs rotation and sleep/wake schedule to the Black-Box.
    """
    port = inst["port"]
    adb = inst["adb"]
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
        a_init = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_init_{p}.png"))
        if a_init is not None:
            state["instances"][p]["screenPreviewB64"] = make_thumbnail_b64(a_init)
            state["instances"][p]["rssBags"] = parse_rss_bar(a_init)
            coords = parse_map_coordinates(a_init)
            if coords["x"] > 0 or coords["y"] > 0:
                state["instances"][p]["coordinates"] = coords
    append_movement(
        state,
        "ALL",
        "SWARM_BOOT",
        "Started Kingdom #4197 Multi-Bot Swarm Orchestrator (Strict T1-ONLY + Black-Box Threat Recorder)",
        {"instances": [i["adb"] for i in INSTANCES], "adbPath": ADB_PATH},
    )
    save_and_sync_blackbox(state)

    for cycle_idx in range(args.cycles):
        for inst in INSTANCES:
            port = inst["port"]
            adb = inst["adb"]
            ensure_adb(adb)
            ist = state["instances"][port]

            # 1. Respect any currently running external task first!
            if is_port_busy_with_external_task(port):
                ist["status"] = "FINISHING_CURRENT_TASK"
                ist["currentTask"] = "Finishing in-progress task before entering #4197 Swarm Rotation"
                a_cur = capture_screen(adb, os.path.join(SCRIPT_DIR, f"swarm_wait_{port}.png"))
                if a_cur is not None:
                    ist["screenPreviewB64"] = make_thumbnail_b64(a_cur)
                save_and_sync_blackbox(state)
                continue

            # 2. On first cycle (or every 4th cycle), audit & ensure #4197 character is active
            if cycle_idx == 0 or (cycle_idx % 4 == 0):
                audit_and_ensure_4197_roster(state, inst)

            # 3. Run Black-Box Threat & Recon Check (Watchtower + Mail REPORT OCR)
            run_blackbox_threat_check(state, inst)

            # 4. Run Strict T1-ONLY Troop Training
            run_t1_only_training(state, inst, cycle_idx)

            # 5. Run City Builder & Quest/VIP/Help Maintenance Burst (22 steps)
            run_city_builder_burst(state, inst)

            # 6. Dispatch Resource Node Farming March in #4197 (Food/Wood/Stone/Gold)
            run_resource_farming(state, inst, cycle_idx)

            # 7. Check Rotation / Sleep schedule
            maybe_rotate_or_sleep(state, inst, cycle_idx)

            ist["status"] = "ACTIVE_IN_4197"
            ist["currentTask"] = f"Active in #4197 — Farming {ist['currentFarming'].get('resource', 'RSS')} & Training T1 ONLY"
            ist["updatedAt"] = utc_now_iso()
            save_and_sync_blackbox(state)

        # Short humanized pause between full 3-instance sweeps
        time.sleep(8.0)


if __name__ == "__main__":
    main()
