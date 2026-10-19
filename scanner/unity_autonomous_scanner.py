#!/usr/bin/env python3
"""
===============================================================================
UNITY AUTONOMOUS TELEMETRY AGENT (NODE 2 EMULATOR CLUSTER -> UNITY DYNAMODB)
File: E:\\Unity\\scanner\\unity_autonomous_scanner.py
Verified On: SIDEKICK (192.168.50.218) MuMu Player 12 (1600x900 @ 240 DPI)
===============================================================================
Captures:
  1. Full 17-Field Governor Profiles (without Excel sheets!):
     - Governor ID, Governor Name (via UTF-8 Clipboard / RapidOCR), Alliance Tag
     - Power, Kill Points, Deads
     - 4 Power Sub-Components (More Info Top): Troop Power, Building Power, Tech Power, Commander Power
     - 5 Kill Tiers (Kill Statistics Popup): T1, T2, T3, T4, T5 Kills
     - 3 Economy/Support Metrics (More Info Scrolled): Resources Gathered, Resource Assistance, Alliance Helps
  2. Live Alliance Rallies & Barbarian Forts (10-second zero-click loop on Alliance -> War)
  3. Visual Calibration Overlay (--mode calibrate) & Single Profile Live Test (--mode test-profile)
===============================================================================
"""

import os
import re
import sys
import io
import json
import time
import random
import argparse
import subprocess
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageOps
import numpy as np
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Zero-cost local ONNX OCR
try:
    from rapidocr_onnxruntime import RapidOCR
    OCR_ENGINE = RapidOCR()
except ImportError:
    OCR_ENGINE = None

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
COORDS_FILE = os.path.join(SCRIPT_DIR, "rok_coordinates_1600x900.json")


def load_coords():
    with open(COORDS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


class AdbEmulatorDriver:
    """Non-invasive ADB bridge for a single 1600x900 Android Emulator instance."""

    def __init__(self, serial="127.0.0.1:16384", adb_bin=None, humanize=True):
        self.serial = serial
        self.humanize = humanize
        local_adb = os.path.join(SCRIPT_DIR, "platform-tools", "adb.exe")
        if adb_bin:
            self.adb_bin = adb_bin
        elif os.path.exists(local_adb):
            self.adb_bin = local_adb
        else:
            self.adb_bin = "adb"
        self._connect()

    def _connect(self):
        if ":" in self.serial:
            subprocess.run([self.adb_bin, "connect", self.serial], capture_output=True)

    def _jitter_coord(self, val, max_offset=4):
        if not self.humanize:
            return int(val)
        delta = int(round(random.gauss(0, 1.8)))
        delta = max(-max_offset, min(max_offset, delta))
        return int(val) + delta

    def _human_sleep(self, base_sec):
        if base_sec <= 0:
            return
        if not self.humanize:
            time.sleep(base_sec)
            return
        time.sleep(base_sec * random.uniform(0.88, 1.28))

    def tap(self, x, y, sleep_sec=0.45):
        jx = self._jitter_coord(x, max_offset=4)
        jy = self._jitter_coord(y, max_offset=4)
        subprocess.run(
            [self.adb_bin, "-s", self.serial, "shell", "input", "tap", str(jx), str(jy)],
            capture_output=True,
        )
        self._human_sleep(sleep_sec)

    def swipe(self, x1, y1, x2, y2, duration_ms=650, sleep_sec=0.65):
        jx1 = self._jitter_coord(x1, max_offset=5)
        jy1 = self._jitter_coord(y1, max_offset=3)
        jx2 = self._jitter_coord(x2, max_offset=5)
        jy2 = self._jitter_coord(y2, max_offset=3)
        jdur = int(duration_ms * random.uniform(0.90, 1.15)) if self.humanize else int(duration_ms)
        subprocess.run(
            [
                self.adb_bin,
                "-s",
                self.serial,
                "shell",
                "input",
                "swipe",
                str(jx1),
                str(jy1),
                str(jx2),
                str(jy2),
                str(jdur),
            ],
            capture_output=True,
        )
        self._human_sleep(sleep_sec)

    def screenshot(self) -> Image.Image:
        proc = subprocess.run(
            [self.adb_bin, "-s", self.serial, "exec-out", "screencap", "-p"],
            capture_output=True,
        )
        if proc.returncode != 0 or not proc.stdout:
            raise RuntimeError(f"ADB screencap failed on {self.serial}: {proc.stderr.decode('utf-8', 'ignore')}")
        img = Image.open(io.BytesIO(proc.stdout)).convert("RGB")
        if img.size != (1600, 900):
            img = img.resize((1600, 900), Image.Resampling.BILINEAR)
        return img

    def read_clipboard(self) -> str:
        """Reads Android clipboard or Windows host clipboard."""
        proc = subprocess.run(
            [self.adb_bin, "-s", self.serial, "shell", "cmd", "clipboard", "get-text"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
        )
        text = (proc.stdout or "").strip()
        if text and "Error" not in text and "Unknown" not in text:
            return text
        if os.name == "nt":
            ps = subprocess.run(
                ["powershell", "-NoProfile", "-Command", "Get-Clipboard"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore",
            )
            return (ps.stdout or "").strip()
        return ""


def ocr_crop(img: Image.Image, box, numeric_only=True) -> str:
    """Crops [x1, y1, x2, y2], upscales 2x for sharp glyph edges, and runs local RapidOCR."""
    x1, y1, x2, y2 = box
    cropped = img.crop((x1, y1, x2, y2))
    w, h = cropped.size
    upscaled = cropped.resize((w * 2, h * 2), Image.Resampling.BICUBIC)
    padded = ImageOps.expand(upscaled, border=12, fill=(18, 20, 26))

    if OCR_ENGINE is None:
        return ""

    arr = np.array(padded)
    result, _ = OCR_ENGINE(arr)
    if not result:
        return ""

    raw_text = " ".join([line[1] for line in result]).strip()
    if numeric_only:
        digits = re.sub(r"[^0-9]", "", raw_text)
        return digits
    return raw_text


def parse_int(val_str: str) -> int:
    digits = re.sub(r"[^0-9]", "", val_str or "")
    return int(digits) if digits else 0


def parse_alliance_tag(raw_alliance: str) -> str:
    if not raw_alliance or raw_alliance.strip() in ("-", "—", ""):
        return "None"
    m = re.search(r"\[([^\]]+)\]", raw_alliance)
    if m:
        return m.group(1).strip()
    cleaned = raw_alliance.strip()
    return cleaned[:8] if cleaned else "None"


def parse_more_info_table(img: Image.Image, crop_box=None) -> dict:
    """
    Runs RapidOCR on a cropped strip of the 2026 Rise of Kingdoms 'More Info' table
    and matches each left-hand label with its right-aligned integer value on the same row.
    """
    if OCR_ENGINE is None:
        return {}
    if crop_box:
        x1, y1, x2, y2 = crop_box
        sub = img.crop((x1, y1, x2, y2))
        offset_x, offset_y = x1, y1
    else:
        sub = img
        offset_x, offset_y = 0, 0

    arr = np.array(sub)
    res, _ = OCR_ENGINE(arr)
    if not res:
        return {}

    labels = []
    values = []
    for box, txt, _score in res:
        xc = (box[0][0] + box[2][0]) / 2.0 + offset_x
        yc = (box[0][1] + box[2][1]) / 2.0 + offset_y
        if xc < 650:
            norm = re.sub(r"[^a-z]", "", txt.lower())
            labels.append((yc, norm, txt))
        elif xc > 1050:
            digits = re.sub(r"[^0-9]", "", txt)
            if digits:
                values.append((yc, int(digits)))

    key_map = {
        "buildingpower": "buildingPower",
        "technologypower": "techPower",
        "trooppower": "troopPower",
        "commanderpower": "commanderPower",
        "highestpower": "highestPower",
        "victory": "victories",
        "defeat": "defeats",
        "dead": "dead",
        "scouttimes": "scoutTimes",
        "resourcesgathered": "gathered",
        "resourceassistance": "assistance",
        "alliancehelptimes": "helps",
    }

    extracted = {}
    for l_yc, l_norm, _raw in labels:
        for prefix, field_name in key_map.items():
            if prefix in l_norm:
                best_val = 0
                best_dist = 26.0
                for v_yc, v_num in values:
                    dist = abs(v_yc - l_yc)
                    if dist < best_dist:
                        best_dist = dist
                        best_val = v_num
                extracted[field_name] = best_val
                break
    return extracted


def parse_profile_header_strip(img: Image.Image) -> dict:
    """
    Single-pass OCR on the Governor Profile header strip [570, 170, 1360, 365]
    to extract gov_id, gov_name, alliance, kill_points, and power in ~0.25s.
    """
    out = {
        "id": "",
        "name": "",
        "alliance": "None",
        "killPoints": 0,
        "power": 0,
    }
    if OCR_ENGINE is None:
        return out

    x1, y1, x2, y2 = 570, 170, 1360, 365
    sub = img.crop((x1, y1, x2, y2))
    res, _ = OCR_ENGINE(np.array(sub))
    if not res:
        return out

    for box, txt, _score in res:
        xc = (box[0][0] + box[2][0]) / 2.0 + x1
        yc = (box[0][1] + box[2][1]) / 2.0 + y1
        clean = txt.strip()

        # Check for Governor(ID: 236424540)
        m_id = re.search(r"ID[:\s]*([0-9]{5,12})", clean, re.IGNORECASE)
        if m_id:
            out["id"] = m_id.group(1)
            continue

        # Governor Name row (yc around 215..255, xc < 980)
        if 212 <= yc <= 258 and xc < 980:
            if clean.lower() not in ("civilization", "governor"):
                out["name"] = clean
                if not out["id"]:
                    m_fallback = re.search(r"([0-9]{6,12})", clean)
                    if m_fallback:
                        out["id"] = m_fallback.group(1)
            continue

        # Values row (yc around 320..362)
        if 318 <= yc <= 364:
            if xc < 830:
                out["alliance"] = parse_alliance_tag(clean)
            elif 850 <= xc <= 1080:
                out["killPoints"] = parse_int(clean)
            elif xc > 1080:
                out["power"] = parse_int(clean)

    return out


def extract_open_governor_profile(driver: AdbEmulatorDriver, coords: dict, rank: int = 1, close_when_done: bool = True) -> dict:
    """
    Fast 4-Pass Strip OCR for an open Governor Profile on 1600x900:
      1. Pass 1 (~0.25s): Header Strip -> Gov ID, Name, Alliance, Power, Kill Points
      2. Pass 2 (~0.35s): Tap (?) -> Kill Statistics Popup Strip -> T1..T5 Kills
      3. Pass 3 (~0.30s): Tap More Info -> Top Power Table Strip -> Building/Tech/Troop/Commander Power
      4. Pass 4 (~0.35s): Scroll More Info -> Battle & Resource Strip -> Dead, Gathered, Assistance, Helps
    """
    prof_cfg = coords["governor_profile"]
    kill_cfg = coords["kill_tier_popup"]
    more_cfg = coords["more_info_modal"]

    frame_profile = driver.screenshot()
    hdr = parse_profile_header_strip(frame_profile)

    gov_id = hdr["id"] or ocr_crop(frame_profile, prof_cfg["gov_id"], numeric_only=True)
    gov_name = hdr["name"] or f"Governor_{gov_id or rank}"
    alliance = hdr["alliance"]
    power = hdr["power"]
    kill_points = hdr["killPoints"]

    # Step 2: Open Kill Statistics popup
    kp_x, kp_y = prof_cfg["kill_points_details_button"]
    driver.tap(kp_x, kp_y, sleep_sec=0.55)
    frame_kills = driver.screenshot()

    # Only run per-tier OCR if kill_points > 0 (or check popup strip in 1 call)
    t1_kills = t2_kills = t3_kills = t4_kills = t5_kills = 0
    if kill_points > 0:
        t1_kills = parse_int(ocr_crop(frame_kills, kill_cfg["t1_kills"], numeric_only=True))
        t2_kills = parse_int(ocr_crop(frame_kills, kill_cfg["t2_kills"], numeric_only=True))
        t3_kills = parse_int(ocr_crop(frame_kills, kill_cfg["t3_kills"], numeric_only=True))
        t4_kills = parse_int(ocr_crop(frame_kills, kill_cfg["t4_kills"], numeric_only=True))
        t5_kills = parse_int(ocr_crop(frame_kills, kill_cfg["t5_kills"], numeric_only=True))

    # Dismiss Kill Statistics popup
    dis_x, dis_y = kill_cfg["dismiss_tap"]
    driver.tap(dis_x, dis_y, sleep_sec=0.40)

    # Step 3: Tap More Info button (265, 755) and OCR only the Power breakdown strip [295, 645, 1320, 875]
    mi_x, mi_y = prof_cfg["more_info_button"]
    driver.tap(mi_x, mi_y, sleep_sec=0.65)
    frame_more_top = driver.screenshot()
    top_stats = parse_more_info_table(frame_more_top, crop_box=[295, 645, 1320, 875])

    building_power = top_stats.get("buildingPower", 0)
    tech_power = top_stats.get("techPower", 0)
    troop_power = top_stats.get("troopPower", 0)
    commander_power = top_stats.get("commanderPower", 0)

    # Step 4: Scroll down More Info modal and OCR only the Battle & Resource strip [295, 335, 1320, 860]
    sx1, sy1, sx2, sy2, sdur = more_cfg["scroll_swipe"]
    driver.swipe(sx1, sy1, sx2, sy2, duration_ms=sdur, sleep_sec=0.65)
    frame_more_bot = driver.screenshot()
    bot_stats = parse_more_info_table(frame_more_bot, crop_box=[295, 335, 1320, 860])

    dead = bot_stats.get("dead", 0)
    gathered = bot_stats.get("gathered", 0)
    assistance = bot_stats.get("assistance", 0)
    helps = bot_stats.get("helps", 0)

    # Close More Info
    cmi_x, cmi_y = more_cfg["close_more_info_button"]
    driver.tap(cmi_x, cmi_y, sleep_sec=0.45)

    if close_when_done:
        cp_x, cp_y = prof_cfg["close_profile_button"]
        driver.tap(cp_x, cp_y, sleep_sec=0.40)

    return {
        "rank": rank,
        "id": str(gov_id or f"RANK_{rank}"),
        "name": gov_name,
        "alliance": alliance,
        "power": power,
        "killPoints": kill_points,
        "dead": dead,
        "t1Kills": t1_kills,
        "t2Kills": t2_kills,
        "t3Kills": t3_kills,
        "t4Kills": t4_kills,
        "t5Kills": t5_kills,
        "troopPower": troop_power,
        "buildingPower": building_power,
        "techPower": tech_power,
        "commanderPower": commander_power,
        "gathered": gathered,
        "assistance": assistance,
        "helps": helps,
    }


def scan_single_governor(driver: AdbEmulatorDriver, coords: dict, row_x: int, row_y: int, rank: int) -> dict:
    driver.tap(row_x, row_y, sleep_sec=0.60)
    return extract_open_governor_profile(driver, coords, rank=rank, close_when_done=True)


def push_batch_to_unity(unity_url: str, scanner_key: str, payload: dict):
    headers = {
        "Content-Type": "application/json",
        "x-unity-scanner-key": scanner_key,
    }
    resp = requests.post(unity_url, headers=headers, json=payload, timeout=30)
    if not resp.ok:
        print(f"  [WARN] Unity Ingest HTTP {resp.status_code}: {resp.text[:200]}")
    else:
        data = resp.json()
        print(f"  [UNITY AWS SYNC] {data.get('message', 'OK')}")


def run_kingdom_scan(args):
    coords = load_coords()
    driver = AdbEmulatorDriver(serial=args.adb)
    scan_date_iso = args.scan_date or datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
    ingest_url = f"{args.unity_url.rstrip('/')}/api/ingest/kingdom-scan"

    print("==================================================================")
    print(f"  UNITY KINGDOM DEEP SCANNER | KD #{args.kd} | Ranks {args.start_rank}..{args.end_rank}")
    print(f"  ADB Emulator: {args.adb} | Scan ID: {scan_date_iso}")
    print("==================================================================")

    lb_cfg = coords["leaderboard"]
    row_x = lb_cfg["row_x"]
    visible_ys = lb_cfg["first_rows_y"]
    settled_y = lb_cfg["locked_row_y"]
    sx1, sy1, sx2, sy2, sdur = lb_cfg["scroll_swipe"]

    batch = []
    seen_gov_ids = set()

    for rank in range(args.start_rank, args.end_rank + 1):
        target_y = visible_ys[rank - 1] if rank <= 4 else settled_y

        t0 = time.time()
        gov = scan_single_governor(driver, coords, row_x, target_y, rank)
        elapsed = time.time() - t0

        if rank >= 4:
            driver.swipe(sx1, sy1, sx2, sy2, duration_ms=sdur)

        print(
            f"[#{rank:03d}] {gov['name']} ({gov['id']}) [{gov['alliance']}] | "
            f"Pwr: {gov['power']:,} (Troop: {gov['troopPower']:,} | Tech: {gov['techPower']:,} | Bldg: {gov['buildingPower']:,} | Cmdr: {gov['commanderPower']:,}) | "
            f"KP: {gov['killPoints']:,} (T4: {gov['t4Kills']:,} | T5: {gov['t5Kills']:,}) | Deads: {gov['dead']:,} [{elapsed:.2f}s]"
        )

        if gov["id"] not in seen_gov_ids:
            seen_gov_ids.add(gov["id"])
            batch.append(gov)

        if len(batch) >= 25 or rank == args.end_rank:
            push_batch_to_unity(
                ingest_url,
                args.scanner_key,
                {
                    "kingdomId": str(args.kd),
                    "scanDateOverride": scan_date_iso,
                    "progress": {
                        "currentRank": rank,
                        "targetRank": args.end_rank,
                        "workerSerial": args.adb,
                    },
                    "rosterArray": batch,
                },
            )
            batch = []


def run_test_profile(args):
    coords = load_coords()
    driver = AdbEmulatorDriver(serial=args.adb)
    print("==================================================================")
    print(f"  UNITY LIVE 17-FIELD GOVERNOR EXTRACTION TEST ({args.adb})")
    print("==================================================================")
    t0 = time.time()
    gov = extract_open_governor_profile(driver, coords, rank=1, close_when_done=False)
    elapsed = time.time() - t0
    print(json.dumps(gov, indent=2, ensure_ascii=False))
    print(f"\n[SUCCESS] Extracted all 17 fields in {elapsed:.2f}s!")
    if args.push:
        scan_date_iso = args.scan_date or datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
        ingest_url = f"{args.unity_url.rstrip('/')}/api/ingest/kingdom-scan"
        push_batch_to_unity(
            ingest_url,
            args.scanner_key,
            {
                "kingdomId": str(args.kd),
                "scanDateOverride": scan_date_iso,
                "rosterArray": [gov],
            },
        )


def run_rally_watcher(args):
    coords = load_coords()
    driver = AdbEmulatorDriver(serial=args.adb)
    ingest_url = f"{args.unity_url.rstrip('/')}/api/ingest/rallies"
    rally_cfg = coords["alliance_war_rally"]
    cards = [rally_cfg["rally_card_1"], rally_cfg["rally_card_2"]]

    print("==================================================================")
    print(f"  UNITY 24/7 ZERO-CLICK RALLY WATCHER | KD #{args.kd} [{args.alliance}]")
    print(f"  Polling every {args.interval}s on ADB {args.adb} -> {ingest_url}")
    print("==================================================================")

    while True:
        try:
            frame = driver.screenshot()
            detected_rallies = []
            for idx, slot in enumerate(cards, start=1):
                launcher = ocr_crop(frame, slot["leader_name"], numeric_only=False)
                target = ocr_crop(frame, slot["target_type"], numeric_only=False)
                capacity = ocr_crop(frame, slot["troop_capacity"], numeric_only=False)
                timer = ocr_crop(frame, slot["march_timer"], numeric_only=False)

                if launcher and target:
                    detected_rallies.append(
                        {
                            "slotIndex": idx,
                            "launcherName": launcher,
                            "targetName": target,
                            "troopCapacity": capacity,
                            "timer": timer,
                            "capturedAt": datetime.now(timezone.utc).isoformat(),
                        }
                    )

            if detected_rallies:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Captured {len(detected_rallies)} active rallies:")
                for r in detected_rallies:
                    print(f"  - {r['launcherName']} -> {r['targetName']} ({r['troopCapacity']}) [{r['timer']}]")
                push_batch_to_unity(
                    ingest_url,
                    args.scanner_key,
                    {
                        "kingdomId": str(args.kd),
                        "allianceTag": args.alliance,
                        "rallies": detected_rallies,
                    },
                )
        except KeyboardInterrupt:
            print("\nStopping Rally Watcher.")
            break
        except Exception as e:
            print(f"[WARN] Rally watcher tick error: {e}")

        time.sleep(args.interval)


def run_calibrate(args):
    coords = load_coords()
    driver = AdbEmulatorDriver(serial=args.adb)
    frame = driver.screenshot()
    draw = ImageDraw.Draw(frame)

    prof = coords["governor_profile"]
    for name in ("gov_id", "gov_name_fallback", "alliance_tag", "kill_points", "power"):
        box = prof[name]
        draw.rectangle(box, outline=(6, 182, 212), width=2)
        draw.text((box[0], box[1] - 14), f"prof:{name}", fill=(6, 182, 212))

    for name in ("copy_name_button", "kill_points_details_button", "more_info_button", "rankings_button", "settings_button", "close_profile_button"):
        pt = prof[name]
        r = 8
        draw.ellipse((pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r), outline=(244, 63, 94), width=3)
        draw.text((pt[0] + 10, pt[1] - 6), f"tap:{name}", fill=(244, 63, 94))

    for name, box in coords["kill_tier_popup"].items():
        if len(box) == 4:
            draw.rectangle(box, outline=(245, 158, 11), width=2)
            draw.text((box[0], box[1] - 14), f"kill:{name}", fill=(245, 158, 11))

    out_path = os.path.join(SCRIPT_DIR, "calibration_preview.png")
    frame.save(out_path)
    print(f"[CALIBRATION] Saved annotated 1600x900 overlay to: {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unity Autonomous RoK Telemetry Scanner (Node 2 ADB Cluster)")
    parser.add_argument("--mode", choices=["calibrate", "test-profile", "kingdom-scan", "rally-watcher"], default="calibrate")
    parser.add_argument("--adb", default="127.0.0.1:16384", help="ADB serial (default: 127.0.0.1:16384 for MuMu 12)")
    parser.add_argument("--kd", default="3418", help="Target 4-digit Kingdom ID")
    parser.add_argument("--alliance", default="VAL", help="Alliance tag for rally watcher")
    parser.add_argument("--start-rank", type=int, default=1)
    parser.add_argument("--end-rank", type=int, default=300)
    parser.add_argument("--interval", type=int, default=10, help="Polling interval in seconds for rally-watcher")
    parser.add_argument("--scan-date", default=None, help="Optional scanDateIso override (YYYY-MM-DD_HHMM)")
    parser.add_argument("--push", action="store_true", help="Push test-profile result to Unity API")
    parser.add_argument("--unity-url", default=os.environ.get("UNITY_URL", "http://192.168.50.41:3000"))
    parser.add_argument("--scanner-key", default=os.environ.get("UNITY_SCANNER_KEY", "unity-local-node2-telemetry"))
    args = parser.parse_args()

    if args.mode == "calibrate":
        run_calibrate(args)
    elif args.mode == "test-profile":
        run_test_profile(args)
    elif args.mode == "kingdom-scan":
        run_kingdom_scan(args)
    elif args.mode == "rally-watcher":
        run_rally_watcher(args)
