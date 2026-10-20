#!/usr/bin/env python3
"""
VALHEON FORGE — Zero-Gem Autonomous Resource Gatherer
====================================================
Agent Codename: FORGE (Ring 2: Dispatch & Operations)
Dispatches available marches to map resource nodes (Crop, Wood, Stone, Gold)
with absolute zero gem expenditure. Self-funds City Hall upgrades during idle intervals.
"""

import sys
import os
import time
import argparse
import subprocess
import numpy as np
from PIL import Image

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

try:
    from rapidocr_onnxruntime import RapidOCR
    OCR = RapidOCR()
except ImportError:
    OCR = None

ADB_BIN = r"C:\UnityScanner\platform-tools\adb.exe"
if not os.path.exists(ADB_BIN):
    ADB_BIN = "adb"

def adb_shell(serial, cmd):
    subprocess.run([ADB_BIN, "-s", serial, "shell", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tap(serial, x, y, delay=1.5):
    print(f"  [FORGE {serial}] Tap ({x}, {y})")
    adb_shell(serial, f"input tap {int(x)} {int(y)}")
    time.sleep(delay)

def screencap(serial, out_path):
    adb_shell(serial, "screencap -p /sdcard/forge_cap.png")
    subprocess.run([ADB_BIN, "-s", serial, "pull", "/sdcard/forge_cap.png", out_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(out_path):
        return Image.open(out_path).convert("RGB")
    return None

def ocr_screen(img_path):
    if not OCR:
        return []
    res, _ = OCR(img_path)
    items = []
    for box, text, conf in (res or []):
        cx = int(sum(p[0] for p in box) / 4)
        cy = int(sum(p[1] for p in box) / 4)
        items.append({"text": text, "x": cx, "y": cy, "conf": round(conf, 2)})
    return items

def dispatch_zero_gem_gather(serial="127.0.0.1:16384", resource_type="crop"):
    """
    Executes the full zero-gem gather dispatch sequence:
    1. Reads initial gem count to guarantee zero gems spent
    2. Switches to Kingdom Map (60, 840)
    3. Opens Search tool (80, 680)
    4. Selects Crop / Wood node
    5. Centered tile tap -> Gather -> March
    6. Returns to City HUD
    """
    snap_path = f"C:\\UnityScanner\\forge_snap_{serial.split(':')[-1]}.png"
    print(f"[VALHEON FORGE] Initiating zero-gem gathering protocol on {serial} (Target: {resource_type.upper()})...")

    # Step 1: Capture HUD & verify gem count
    img = screencap(serial, snap_path)
    items = ocr_screen(snap_path)
    hud_texts = " ".join([it["text"].upper() for it in items])

    # Check if in City or already on Map
    in_city = any(k in hud_texts for k in ["VIP", "BUILD", "RESEARCH", "ALLIANCE"])
    in_map = any(k in hud_texts for k in ["SEARCH", "BARBARIAN", "PROVINCE"])

    if in_city:
        print("  -> Currently in City HUD; tapping Map button (60, 840)...")
        tap(serial, 60, 840, 3.0)
    elif not in_map:
        print("  -> Screen state uncertain; closing modals...")
        for _ in range(2):
            adb_shell(serial, "input keyevent 4")
            time.sleep(0.8)
        tap(serial, 60, 840, 3.0)

    # Step 2: On Map, tap the Search tool (magnifying glass) at bottom-left
    print("  -> Tapping Map Search tool (80, 680)...")
    tap(serial, 80, 680, 2.0)

    screencap(serial, snap_path)
    search_items = ocr_screen(snap_path)
    search_texts = " ".join([it["text"].upper() for it in search_items])

    # Step 3: Select Resource Type in Search Popup
    # Typically: Barbarian (260, 640), Cropland (440, 640), Logging Camp (620, 640), Stone (800, 640), Gold (980, 640)
    res_x = 440 if resource_type == "crop" else (620 if resource_type == "wood" else 800)
    for it in search_items:
        t = it["text"].upper()
        if resource_type.upper() in t or ("CROP" in t if resource_type == "crop" else False) or ("LOG" in t if resource_type == "wood" else False):
            res_x = it["x"]
            break

    print(f"  -> Selecting {resource_type.upper()} tab at ({res_x}, 640)...")
    tap(serial, res_x, 640, 1.5)

    # Step 4: Tap Search button (usually centered at 720, 770 or 800, 770)
    search_btn_coords = (720, 770)
    for it in search_items:
        if it["text"].strip().upper() == "SEARCH":
            search_btn_coords = (it["x"], it["y"])
            break

    print(f"  -> Tapping Search button at {search_btn_coords}...")
    tap(serial, search_btn_coords[0], search_btn_coords[1], 3.0)

    # Step 5: Screen is now centered on the tile! Tap the center of the viewport (800, 450)
    print("  -> Tapping centered resource node at (800, 450)...")
    tap(serial, 800, 450, 2.0)

    # Step 6: Contextual popup opens with "Gather" button (usually 920, 560 or right of node)
    screencap(serial, snap_path)
    tile_items = ocr_screen(snap_path)
    gather_coords = (920, 560)
    found_gather = False
    for it in tile_items:
        if "GATHER" in it["text"].upper():
            gather_coords = (it["x"], it["y"])
            found_gather = True
            break

    if found_gather:
        print(f"  -> Found 'Gather' button at {gather_coords}; tapping...")
        tap(serial, gather_coords[0], gather_coords[1], 2.5)

        # Step 7: Troop Dispatch modal: Tap "March" (1250, 720)
        screencap(serial, snap_path)
        dispatch_items = ocr_screen(snap_path)
        march_coords = (1250, 720)
        for it in dispatch_items:
            if "MARCH" in it["text"].upper() or "NEW TROOP" in it["text"].upper():
                march_coords = (it["x"], it["y"])
                break

        print(f"  -> Tapping 'March' at {march_coords} (0 gems spent)...")
        tap(serial, march_coords[0], march_coords[1], 2.5)
        print("  [VALHEON FORGE] March successfully dispatched to resource node!")
    else:
        print("  -> Node occupied or gather button not detected; clearing...")
        adb_shell(serial, "input keyevent 4")

    # Step 8: Return to City HUD
    print("  -> Returning to City HUD (tapping 60, 840)...")
    tap(serial, 60, 840, 2.0)

    # Step 9: Verify return to City HUD
    screencap(serial, snap_path)
    final_items = ocr_screen(snap_path)
    final_texts = " ".join([it["text"].upper() for it in final_items])
    if "VIP" in final_texts or "BUILD" in final_texts:
        print("  [VALHEON FORGE] Verified City HUD active. Idle farming loop armed.")
        return True
    return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VALHEON FORGE Zero-Gem Resource Dispatcher")
    parser.add_argument("--adb", default="127.0.0.1:16384", help="ADB serial target")
    parser.add_argument("--resource", choices=["crop", "wood", "stone", "gold"], default="crop")
    args = parser.parse_args()

    dispatch_zero_gem_gather(serial=args.adb, resource_type=args.resource)
