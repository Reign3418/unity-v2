#!/usr/bin/env python3
"""
Unattended Neighboring Kingdom Character Provisioner (1600x900 MuMu Player 12)
==============================================================================
Navigates from any active character's city HUD:
  Avatar (45, 45) -> Settings (1325, 760) -> Characters (1155, 255)
  -> Create New Character (504, 333) -> Scroll & RapidOCR locate #<KINGDOM>
  -> Confirm YES (1016, 639) -> Select Civilization (China) -> Skip Intro
  -> Run auto_tutorial_ch8.py to unlock full HUD & level up City Hall.
"""

import argparse
import os
import subprocess
import sys
import time
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ADB_EXE = os.path.join(SCRIPT_DIR, "platform-tools", "adb.exe")
if not os.path.exists(ADB_EXE):
    ADB_EXE = "adb"

_OCR_ENGINE = None


def get_ocr():
    global _OCR_ENGINE
    if _OCR_ENGINE is None:
        from rapidocr_onnxruntime import RapidOCR
        _OCR_ENGINE = RapidOCR()
    return _OCR_ENGINE


def adb_shell(adb_target: str, cmd: str):
    subprocess.run(
        [ADB_EXE, "-s", adb_target, "shell", cmd],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def tap(adb_target: str, x: int, y: int, delay: float = 1.5):
    adb_shell(adb_target, f"input tap {int(x)} {int(y)}")
    time.sleep(delay)


def swipe(adb_target: str, x1: int, y1: int, x2: int, y2: int, duration_ms: int = 800, delay: float = 1.8):
    adb_shell(adb_target, f"input swipe {x1} {y1} {x2} {y2} {duration_ms}")
    time.sleep(delay)


def screencap(adb_target: str, local_path: str) -> np.ndarray:
    adb_shell(adb_target, "screencap -p /sdcard/prov_step.png")
    subprocess.run(
        [ADB_EXE, "-s", adb_target, "pull", "/sdcard/prov_step.png", local_path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return np.array(Image.open(local_path).convert("RGB"))


def find_kingdom_coords(img_path: str, kingdom_num: str):
    ocr = get_ocr()
    res, _ = ocr(img_path)
    if not res:
        return None
    target_tag = f"#{kingdom_num}"
    for box, text, conf in res:
        t = text.strip()
        if target_tag in t or kingdom_num in t:
            xs = [p[0] for p in box]
            ys = [p[1] for p in box]
            cx = int(sum(xs) / 4.0)
            cy = int(sum(ys) / 4.0)
            return (cx, cy, t)
    return None


def report_progress(kingdom: str, step: int, total_steps: int, status_label: str, detail: str, running: bool = True):
    try:
        import urllib.request
        import json as _json
        payload = {
            "running": running,
            "status": status_label,
            "kingdom": str(kingdom),
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
        urllib.request.urlopen(req, timeout=2.0)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--adb", "--adb-serial", dest="adb", default="127.0.0.1:16384")
    parser.add_argument("--kingdom", required=True, help="Target kingdom number, e.g. 4044 or 4195")
    parser.add_argument("--mode", default="create", choices=["create", "switch", "probe"])
    parser.add_argument("--tutorial-steps", type=int, default=55, help="Autonomous tutorial steps to run after spawn")
    args = parser.parse_args()

    snap_path = os.path.join(SCRIPT_DIR, "prov_step.png")
    report_progress(args.kingdom, 1, 6, "PROVISIONING_BOT", f"[1/6] Checking City HUD on {args.adb}...")

    a0 = screencap(args.adb, snap_path)
    ribbon = a0[85:125, 15:70]
    diff_br = float((ribbon[:, :, 2].astype(np.float32) - ribbon[:, :, 0].astype(np.float32)).mean())
    if diff_br < 45.0:
        print("[0/6] Returning to City HUD (closing any open modals)...")
        report_progress(args.kingdom, 1, 6, "PROVISIONING_BOT", "[1/6] Returning to City HUD (closing open modals)...")
        tap(args.adb, 1365, 108, 1.8)
        tap(args.adb, 1396, 83, 1.8)

    print(f"[1/6] Opening Governor Profile -> Settings -> Characters...")
    report_progress(args.kingdom, 2, 6, "PROVISIONING_BOT", f"[2/6] Opening Profile -> Settings -> Characters for #{args.kingdom}...")
    tap(args.adb, 45, 45, 2.2)        # Top-left Avatar
    tap(args.adb, 1325, 760, 2.2)     # Settings gear
    tap(args.adb, 1155, 255, 3.8)     # Characters icon

    if args.mode == "switch":
        report_progress(args.kingdom, 3, 6, "SWITCHING_CHARACTER", f"[3/6] Searching Character Roster for #{args.kingdom}...")
        screencap(args.adb, snap_path)
        found_char = find_kingdom_coords(snap_path, str(args.kingdom))
        if found_char:
            cx, cy, ctext = found_char
            report_progress(args.kingdom, 5, 6, "SWITCHING_CHARACTER", f"[5/6] Switching to {ctext} in #{args.kingdom}...")
            tap(args.adb, cx, cy, 2.5)
            tap(args.adb, 1016, 639, 18.0)
            report_progress(args.kingdom, 6, 6, "COMPLETED", f"Active on Kingdom #{args.kingdom}", running=False)
            return

    tap(args.adb, 504, 333, 4.5)      # + Create New Character

    print(f"[2/6] Searching Kingdom List for #{args.kingdom}...")
    found = None
    for scroll_idx in range(18):
        report_progress(
            args.kingdom,
            3,
            6,
            "PROVISIONING_BOT",
            f"[3/6] Scanning Kingdom List for #{args.kingdom} (Viewport {scroll_idx + 1}/18)...",
        )
        screencap(args.adb, snap_path)
        found = find_kingdom_coords(snap_path, str(args.kingdom))
        if found:
            break
        print(f"  -> #{args.kingdom} not in current viewport (scroll {scroll_idx + 1}/18)...")
        swipe(args.adb, 800, 720, 800, 360, 750, 2.0)

    if not found:
        print(f"[ERROR] Could not locate #{args.kingdom} in Kingdom List.")
        report_progress(
            args.kingdom,
            3,
            6,
            "NEEDS_CONTINENT_SELECT",
            f"Kingdom #{args.kingdom} not in current continent viewport — ready on Create Character screen",
            running=False,
        )
        sys.exit(1)

    kx, ky, ktext = found
    print(f"[3/6] Found '{ktext}' at ({kx}, {ky}) -> tapping kingdom card...")
    report_progress(args.kingdom, 4, 6, "PROVISIONING_BOT", f"[4/6] Found #{args.kingdom} at ({kx},{ky}) -> Confirming Spawn...")
    tap(args.adb, kx + 40, ky, 2.2)

    print(f"[4/6] Confirming Character Creation in #{args.kingdom} -> tap YES (1016, 639)...")
    tap(args.adb, 1016, 639, 25.0)

    print(f"[5/6] Selecting China civilization & skipping intro cutscene...")
    report_progress(args.kingdom, 5, 6, "PROVISIONING_BOT", f"[5/6] Selecting China Civilization & Skipping Cutscene in #{args.kingdom}...")
    tap(args.adb, 580, 755, 2.2)      # Tap PICK CIVILIZATION
    tap(args.adb, 240, 800, 2.0)      # Select China
    tap(args.adb, 1352, 630, 4.0)     # Tap CONFIRM
    tap(args.adb, 1488, 38, 6.0)      # Tap SKIP intro cutscene

    if args.tutorial_steps > 0:
        print(f"[6/6] Running {args.tutorial_steps} autonomous tutorial steps in #{args.kingdom}...")
        report_progress(args.kingdom, 6, 6, "PROVISIONING_BOT", f"[6/6] Clearing Ch.1 Tutorial in #{args.kingdom} ({args.tutorial_steps} steps)...")
        tut_script = os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py")
        subprocess.run(
            [sys.executable, tut_script, "--adb", args.adb, "--steps", str(args.tutorial_steps)],
            check=False,
        )
    screencap(args.adb, snap_path)
    report_progress(args.kingdom, 6, 6, "COMPLETED", f"Provisioned Bot in Kingdom #{args.kingdom}", running=False)
    print(f"[DONE] Provisioned #{args.kingdom} character.")


if __name__ == "__main__":
    main()

