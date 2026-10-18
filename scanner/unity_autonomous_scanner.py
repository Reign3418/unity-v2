#!/usr/bin/env python3
"""
===============================================================================
UNITY AUTONOMOUS TELEMETRY AGENT (NODE 2 EMULATOR CLUSTER -> UNITY DYNAMODB)
File: E:\\Unity\\scanner\\unity_autonomous_scanner.py
===============================================================================
Captures:
  1. Full 17-Field Governor Profiles (without Excel sheets!):
     - Governor ID, Governor Name (via UTF-8 Clipboard), Alliance Tag
     - Power, Kill Points, Deads
     - 4 Power Sub-Components (More Info): Troop Power, Building Power, Tech Power, Commander Power
     - 5 Kill Tiers (Kill Split): T1, T2, T3, T4, T5 Kills
     - 3 Economy/Support Metrics: Resources Gathered, Resource Assistance, Alliance Helps
  2. Live Alliance Rallies & Barbarian Forts (10-second loop on Alliance -> War)
  3. Visual Calibration Overlay (--mode calibrate)

Usage on Node 2 (64GB RAM / NVIDIA Quadro Laptop):
  # 1. Verify emulator connection & draw bounding-box overlay:
  python unity_autonomous_scanner.py --mode calibrate --adb 127.0.0.1:5555

  # 2. Run Top-300 Kingdom Scan (or split 1..150 on Emulator 1 and 151..300 on Emulator 2):
  python unity_autonomous_scanner.py --mode kingdom-scan --kd 3418 --start-rank 1 --end-rank 300 --adb 127.0.0.1:5555

  # 3. Run 24/7 Alliance Rally & Barbarian Fort Watcher:
  python unity_autonomous_scanner.py --mode rally-watcher --kd 3418 --alliance VAL --adb 127.0.0.1:5555
===============================================================================
"""

import os
import re
import sys
import io
import json
import time
import argparse
import subprocess
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageOps
import numpy as np
import requests

# Optional RapidOCR (0.00 cost local ONNX OCR)
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

    def __init__(self, serial="127.0.0.1:5555", adb_bin="adb"):
        self.serial = serial
        self.adb_bin = adb_bin
        self._connect()

    def _connect(self):
        if ":" in self.serial:
            subprocess.run([self.adb_bin, "connect", self.serial], capture_output=True)

    def tap(self, x, y, sleep_sec=0.35):
        subprocess.run(
            [self.adb_bin, "-s", self.serial, "shell", "input", "tap", str(int(x)), str(int(y))],
            capture_output=True,
        )
        if sleep_sec > 0:
            time.sleep(sleep_sec)

    def swipe(self, x1, y1, x2, y2, duration_ms=650, sleep_sec=0.55):
        subprocess.run(
            [
                self.adb_bin,
                "-s",
                self.serial,
                "shell",
                "input",
                "swipe",
                str(int(x1)),
                str(int(y1)),
                str(int(x2)),
                str(int(y2)),
                str(int(duration_ms)),
            ],
            capture_output=True,
        )
        if sleep_sec > 0:
            time.sleep(sleep_sec)

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
        """Reads Android clipboard (or host clipboard on shared-clipboard emulators like MuMu/LDPlayer)."""
        # Method 1: Android service call / cmd clipboard
        proc = subprocess.run(
            [self.adb_bin, "-s", self.serial, "shell", "cmd", "clipboard", "get-text"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
        )
        text = (proc.stdout or "").strip()
        if text and "Error" not in text and "unknown" not in text.lower():
            return text
        # Method 2: Windows host clipboard fallback (MuMu 12 & LDPlayer 9 automatically sync Android Copy -> Windows Clipboard)
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
    # Upscale 2x with padding for maximum OCR accuracy on small RoK numbers
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
    """Extracts [TAG] from '[TAG] Alliance Name' or returns raw string."""
    if not raw_alliance:
        return "None"
    m = re.search(r"\[([^\]]+)\]", raw_alliance)
    if m:
        return m.group(1).strip()
    cleaned = raw_alliance.strip()
    return cleaned[:8] if cleaned else "None"


def scan_single_governor(driver: AdbEmulatorDriver, coords: dict, row_x: int, row_y: int, rank: int) -> dict:
    """
    Executes the 3-screen tap sequence for a single governor row:
      1. Tap row -> Governor Profile (Copy Name, Gov ID, Alliance, Power, KP)
      2. Tap (?) -> Kill Split Popup (T1, T2, T3, T4, T5 Kills)
      3. Tap More Info -> Detailed Stats (Troop Power, Building Power, Tech Power, Commander Power, Deads, Gathered, Assistance, Helps)
    """
    prof_cfg = coords["governor_profile"]
    kill_cfg = coords["kill_split_popup"]
    more_cfg = coords["more_info_modal"]

    # Step 1: Open Governor Profile
    driver.tap(row_x, row_y, sleep_sec=0.55)
    frame_profile = driver.screenshot()

    # Tap Copy Name icon to get 100% exact UTF-8 Governor Name
    copy_x, copy_y = prof_cfg["taps"]["copy_name_button"]
    driver.tap(copy_x, copy_y, sleep_sec=0.20)
    gov_name = driver.read_clipboard()

    gov_id = ocr_crop(frame_profile, prof_cfg["crops"]["gov_id"], numeric_only=True)
    if not gov_name:
        gov_name = ocr_crop(frame_profile, prof_cfg["crops"]["gov_name_fallback"], numeric_only=False) or f"Governor_{gov_id or rank}"

    raw_alliance = ocr_crop(frame_profile, prof_cfg["crops"]["alliance_tag"], numeric_only=False)
    alliance = parse_alliance_tag(raw_alliance)
    power = parse_int(ocr_crop(frame_profile, prof_cfg["crops"]["power"], numeric_only=True))
    kill_points = parse_int(ocr_crop(frame_profile, prof_cfg["crops"]["kill_points"], numeric_only=True))

    # Step 2: Tap Kill Points (?) icon to reveal T1..T5 Kills
    kp_x, kp_y = prof_cfg["taps"]["kill_points_details_button"]
    driver.tap(kp_x, kp_y, sleep_sec=0.40)
    frame_kills = driver.screenshot()

    t1_kills = parse_int(ocr_crop(frame_kills, kill_cfg["crops"]["t1_kills"], numeric_only=True))
    t2_kills = parse_int(ocr_crop(frame_kills, kill_cfg["crops"]["t2_kills"], numeric_only=True))
    t3_kills = parse_int(ocr_crop(frame_kills, kill_cfg["crops"]["t3_kills"], numeric_only=True))
    t4_kills = parse_int(ocr_crop(frame_kills, kill_cfg["crops"]["t4_kills"], numeric_only=True))
    t5_kills = parse_int(ocr_crop(frame_kills, kill_cfg["crops"]["t5_kills"], numeric_only=True))

    # Step 3: Tap 'More Info' button (bottom-left of profile)
    mi_x, mi_y = prof_cfg["taps"]["more_info_button"]
    driver.tap(mi_x, mi_y, sleep_sec=0.50)
    frame_more = driver.screenshot()

    troop_power = parse_int(ocr_crop(frame_more, more_cfg["crops"]["troop_power"], numeric_only=True))
    building_power = parse_int(ocr_crop(frame_more, more_cfg["crops"]["building_power"], numeric_only=True))
    tech_power = parse_int(ocr_crop(frame_more, more_cfg["crops"]["tech_power"], numeric_only=True))
    commander_power = parse_int(ocr_crop(frame_more, more_cfg["crops"]["commander_power"], numeric_only=True))
    dead = parse_int(ocr_crop(frame_more, more_cfg["crops"]["dead"], numeric_only=True))
    gathered = parse_int(ocr_crop(frame_more, more_cfg["crops"]["gathered"], numeric_only=True))
    assistance = parse_int(ocr_crop(frame_more, more_cfg["crops"]["assistance"], numeric_only=True))
    helps = parse_int(ocr_crop(frame_more, more_cfg["crops"]["helps"], numeric_only=True))

    # Step 4: Close More Info, then Close Profile back to Leaderboard
    cmi_x, cmi_y = more_cfg["taps"]["close_more_info_button"]
    driver.tap(cmi_x, cmi_y, sleep_sec=0.35)
    cp_x, cp_y = prof_cfg["taps"]["close_profile_button"]
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


def push_batch_to_unity(unity_url: str, scanner_key: str, payload: dict):
    """Pushes a scanned batch or rally update directly to Unity's /api/ingest/* endpoint."""
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

    print(f"==================================================================")
    print(f"  UNITY KINGDOM DEEP SCANNER | KD #{args.kd} | Ranks {args.start_rank}..{args.end_rank}")
    print(f"  ADB Emulator: {args.adb} | Scan ID: {scan_date_iso}")
    print(f"==================================================================")

    lb_cfg = coords["leaderboard"]
    row_x = lb_cfg["row_x"]
    visible_ys = lb_cfg["visible_rows_y"]
    settled_y = lb_cfg["scroll_settled_y"]
    swipe_cfg = lb_cfg["swipe_drag"]

    batch = []
    seen_gov_ids = set()

    for rank in range(args.start_rank, args.end_rank + 1):
        if rank <= 4:
            target_y = visible_ys[rank - 1]
        else:
            target_y = settled_y

        t0 = time.time()
        gov = scan_single_governor(driver, coords, row_x, target_y, rank)
        elapsed = time.time() - t0

        # Scroll down 1 row if rank >= 4
        if rank >= 4:
            driver.swipe(
                swipe_cfg["start_x"],
                swipe_cfg["start_y"],
                swipe_cfg["end_x"],
                swipe_cfg["end_y"],
                swipe_cfg["duration_ms"],
            )

        print(
            f"[#{rank:03d}] {gov['name']} ({gov['id']}) [{gov['alliance']}] | "
            f"Pwr: {gov['power']:,} (Troop: {gov['troopPower']:,} | Tech: {gov['techPower']:,} | Bldg: {gov['buildingPower']:,}) | "
            f"KP: {gov['killPoints']:,} (T4: {gov['t4Kills']:,} | T5: {gov['t5Kills']:,}) | Deads: {gov['dead']:,} [{elapsed:.2f}s]"
        )

        if gov["id"] not in seen_gov_ids:
            seen_gov_ids.add(gov["id"])
            batch.append(gov)

        # Stream to Unity AWS DynamoDB every 25 governors (or on final rank)
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


def run_rally_watcher(args):
    coords = load_coords()
    driver = AdbEmulatorDriver(serial=args.adb)
    ingest_url = f"{args.unity_url.rstrip('/')}/api/ingest/rallies"
    slots = coords["alliance_war_rallies"]["slots"]

    print(f"==================================================================")
    print(f"  UNITY 24/7 RALLY & BARBARIAN FORT WATCHER | KD #{args.kd} [{args.alliance}]")
    print(f"  Polling every {args.interval}s on ADB {args.adb} -> {ingest_url}")
    print(f"==================================================================")

    while True:
        try:
            frame = driver.screenshot()
            detected_rallies = []
            for slot in slots:
                launcher = ocr_crop(frame, slot["launcher_name"], numeric_only=False)
                target = ocr_crop(frame, slot["target_name"], numeric_only=False)
                capacity = ocr_crop(frame, slot["troop_capacity"], numeric_only=False)
                timer = ocr_crop(frame, slot["timer"], numeric_only=False)

                if launcher and target:
                    detected_rallies.append(
                        {
                            "slotIndex": slot["slot_index"],
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
                    print(f"  • {r['launcherName']} -> {r['targetName']} ({r['troopCapacity']}) [{r['timer']}]")
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

    # Draw Profile crops in Cyan, Kill Split crops in Amber, More Info crops in Emerald
    for name, box in coords["governor_profile"]["crops"].items():
        draw.rectangle(box, outline=(6, 182, 212), width=2)
        draw.text((box[0], box[1] - 14), f"prof:{name}", fill=(6, 182, 212))

    for name, pt in coords["governor_profile"]["taps"].items():
        r = 8
        draw.ellipse((pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r), outline=(244, 63, 94), width=3)
        draw.text((pt[0] + 10, pt[1] - 6), f"tap:{name}", fill=(244, 63, 94))

    for name, box in coords["kill_split_popup"]["crops"].items():
        draw.rectangle(box, outline=(245, 158, 11), width=2)
        draw.text((box[0], box[1] - 14), f"kill:{name}", fill=(245, 158, 11))

    for name, box in coords["more_info_modal"]["crops"].items():
        draw.rectangle(box, outline=(16, 185, 129), width=2)
        draw.text((box[0], box[1] - 14), f"more:{name}", fill=(16, 185, 129))

    out_path = os.path.join(SCRIPT_DIR, "calibration_preview.png")
    frame.save(out_path)
    print(f"[CALIBRATION] Saved annotated 1600x900 overlay to: {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unity Autonomous RoK Telemetry Scanner (Node 2 ADB Cluster)")
    parser.add_argument("--mode", choices=["calibrate", "kingdom-scan", "rally-watcher"], default="calibrate")
    parser.add_argument("--adb", default="127.0.0.1:5555", help="ADB serial (e.g. 127.0.0.1:5555 or 192.168.50.x:5555)")
    parser.add_argument("--kd", default="3418", help="Target 4-digit Kingdom ID")
    parser.add_argument("--alliance", default="VAL", help="Alliance tag for rally watcher")
    parser.add_argument("--start-rank", type=int, default=1)
    parser.add_argument("--end-rank", type=int, default=300)
    parser.add_argument("--interval", type=int, default=10, help="Polling interval in seconds for rally-watcher")
    parser.add_argument("--scan-date", default=None, help="Optional scanDateIso override (YYYY-MM-DD_HHMM)")
    parser.add_argument("--unity-url", default=os.environ.get("UNITY_URL", "http://192.168.50.41:3000"))
    parser.add_argument("--scanner-key", default=os.environ.get("UNITY_SCANNER_KEY", "unity-local-node2-telemetry"))
    args = parser.parse_args()

    if args.mode == "calibrate":
        run_calibrate(args)
    elif args.mode == "kingdom-scan":
        run_kingdom_scan(args)
    elif args.mode == "rally-watcher":
        run_rally_watcher(args)
