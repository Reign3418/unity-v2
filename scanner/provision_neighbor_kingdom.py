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


def inspect_kingdom_viewport(img_path: str, kingdom_num: str):
    import re
    ocr = get_ocr()
    res, _ = ocr(img_path)
    if not res:
        return None, [], False
    target_tag = f"#{kingdom_num}"
    visible_kds = []
    already_in_kd_list = False
    found_target = None
    for box, text, conf in res:
        t = text.strip()
        tu = t.upper()
        if "KINGDOM LIST" in tu or "CREATE CHARACTER" in tu or "KINGDOM CALENDAR" in tu:
            already_in_kd_list = True
        for m in re.findall(r"#(\d{4})", t):
            visible_kds.append(int(m))
        if target_tag in t or re.search(rf"\b{re.escape(str(kingdom_num))}\b", t):
            xs = [p[0] for p in box]
            ys = [p[1] for p in box]
            cx = int(sum(xs) / 4.0)
            cy = int(sum(ys) / 4.0)
            if 280 <= cy <= 860:
                if found_target is None or cy < found_target[1]:
                    found_target = (cx, cy, t)
    return found_target, sorted(set(visible_kds)), already_in_kd_list


def tap_characters_in_settings(adb_target: str, snap_path: str):
    """Handles both young kingdoms (Characters at 1155,255) and older/SoC kingdoms with Search Governor (Characters at 435,515)."""
    screencap(adb_target, snap_path)
    ocr = get_ocr()
    res, _ = ocr(snap_path)
    char_coords = None
    has_search_gov = False
    for box, text, conf in (res or []):
        tu = text.strip().upper()
        if "SEARCH GOVERNOR" in tu:
            has_search_gov = True
        if "CHARACTER" in tu:
            xs = [p[0] for p in box]
            ys = [p[1] for p in box]
            cx = int(sum(xs) / 4.0)
            cy = int(sum(ys) / 4.0) - 45
            if 180 <= cy <= 620:
                char_coords = (cx, cy)
                break
    if char_coords:
        print(f"  -> Found Characters icon via OCR at {char_coords}")
        tap(adb_target, char_coords[0], char_coords[1], 3.5)
    elif has_search_gov:
        print("  -> Search Governor detected in Settings; tapping Characters at (435, 515)")
        tap(adb_target, 435, 515, 3.5)
    else:
        print("  -> Standard Settings layout; tapping Characters at (1155, 255)")
        tap(adb_target, 1155, 255, 3.5)


def find_kingdom_coords(img_path: str, kingdom_num: str):
    found, _, _ = inspect_kingdom_viewport(img_path, kingdom_num)
    return found


def report_progress(kingdom: str, step: int, total_steps: int, status_label: str, detail: str, running: bool = True):
    import json as _json
    pct = round((step / max(1, total_steps)) * 100.0, 1)
    payload = {
        "running": running,
        "status": status_label,
        "kingdom": str(kingdom),
        "preset": "BOT_PROVISION",
        "currentRank": step,
        "targetRanks": total_steps,
        "percent": pct,
        "governorsExtracted": step,
        "lastGovernorName": detail,
        "pid": os.getpid(),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    try:
        prog_path = os.path.join(SCRIPT_DIR, "scan_progress.json")
        with open(prog_path, "w", encoding="utf-8") as f:
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
    parser.add_argument("--adb", "--adb-serial", dest="adb", default="127.0.0.1:16384")
    parser.add_argument("--kingdom", required=True, help="Target kingdom number, e.g. 4044 or 4195")
    parser.add_argument("--mode", default="create", choices=["create", "switch", "probe"])
    parser.add_argument("--tutorial-steps", type=int, default=55, help="Autonomous tutorial steps to run after spawn")
    args = parser.parse_args()

    snap_path = os.path.join(SCRIPT_DIR, "prov_step.png")
    report_progress(args.kingdom, 1, 6, "PROVISIONING_BOT", f"[1/6] Checking screen state on {args.adb}...")

    a0 = screencap(args.adb, snap_path)
    init_found, init_vis, already_in_kd_list = inspect_kingdom_viewport(snap_path, str(args.kingdom))

    if not already_in_kd_list or args.mode == "switch":
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
        tap_characters_in_settings(args.adb, snap_path)

        if args.mode == "switch":
            report_progress(args.kingdom, 3, 6, "SWITCHING_CHARACTER", f"[3/6] Searching Character Roster for #{args.kingdom}...")
            for sw_idx in range(4):
                screencap(args.adb, snap_path)
                found_char = find_kingdom_coords(snap_path, str(args.kingdom))
                if found_char:
                    cx, cy, ctext = found_char
                    report_progress(args.kingdom, 5, 6, "SWITCHING_CHARACTER", f"[5/6] Switching to {ctext} in #{args.kingdom} (~20s)...")
                    tap(args.adb, cx, cy, 2.5)
                    screencap(args.adb, snap_path)
                    ocr = get_ocr()
                    res_confirm, _ = ocr(snap_path)
                    confirm_texts = " ".join([item[1].upper() for item in (res_confirm or [])])
                    if "NORMAL CHARACTERS" in confirm_texts or "CREATE NEW CHARACTER" in confirm_texts:
                        print(f"  -> Character {ctext} in #{args.kingdom} is ALREADY active (green checkmark)! Closing modals...")
                        for _ in range(3):
                            adb_shell(args.adb, "input keyevent 4")
                            time.sleep(0.8)
                        report_progress(args.kingdom, 6, 6, "COMPLETED", f"Already active on Kingdom #{args.kingdom}", running=False)
                        return
                    tap(args.adb, 1016, 639, 14.0)
                    # Handle "Tap to Start" splash screen if present during character reload
                    for _ in range(3):
                        screencap(args.adb, snap_path)
                        res_tts, _ = ocr(snap_path)
                        tts_texts = " ".join([item[1].upper() for item in (res_tts or [])])
                        if "TAP TO START" in tts_texts:
                            print("  -> Detected 'Tap to Start' splash screen -> tapping (800, 835)...")
                            tap(args.adb, 800, 835, 8.0)
                        else:
                            break
                    report_progress(args.kingdom, 6, 6, "COMPLETED", f"Active on Kingdom #{args.kingdom}", running=False)
                    return
                if sw_idx < 3:
                    swipe(args.adb, 800, 680, 800, 280, 650, 1.8)
            report_progress(args.kingdom, 6, 6, "SWITCH_NOT_FOUND", f"Character for #{args.kingdom} not found in roster", running=False)
            return

        tap(args.adb, 504, 333, 4.5)      # + Create New Character
    else:
        print(f"[1/6] Already on Create Character Kingdom List (visible: {init_vis}) -> resuming seek for #{args.kingdom}...")

    print(f"[2/6] Proportional Seek in Kingdom List for #{args.kingdom}...")
    target_num = int(args.kingdom)
    found = None
    for scroll_idx in range(45):
        screencap(args.adb, snap_path)
        found, vis_kds, _ = inspect_kingdom_viewport(snap_path, str(args.kingdom))
        if found:
            break
        if vis_kds:
            min_vis, max_vis = min(vis_kds), max(vis_kds)
            report_progress(
                args.kingdom,
                3,
                6,
                "PROVISIONING_BOT",
                f"[3/6] Seeking #{args.kingdom} — Currently passing #{max_vis}..#{min_vis}...",
            )
            if target_num < min_vis:
                gap = min_vis - target_num
                burst = min(5, max(1, gap // 10))
                print(f"  -> Seeking #{target_num} below #{min_vis} (gap={gap}, burst={burst} swipes)...")
                for _ in range(burst):
                    adb_shell(args.adb, "input swipe 800 760 800 320 450")
                    time.sleep(0.55)
                time.sleep(1.0)
            elif target_num > max_vis:
                gap = target_num - max_vis
                burst = min(3, max(1, gap // 10))
                print(f"  -> Overshot #{target_num} (at #{max_vis}), scrolling UP {burst}x...")
                for _ in range(burst):
                    adb_shell(args.adb, "input swipe 800 360 800 760 550")
                    time.sleep(0.65)
                time.sleep(1.0)
            else:
                swipe(args.adb, 800, 650, 800, 480, 600, 1.5)
        else:
            report_progress(
                args.kingdom,
                3,
                6,
                "PROVISIONING_BOT",
                f"[3/6] Scanning Kingdom List for #{args.kingdom} (Step {scroll_idx + 1})...",
            )
            swipe(args.adb, 800, 720, 800, 360, 650, 1.6)

    if not found:
        print(f"[ERROR] Could not locate #{args.kingdom} in Kingdom List.")
        report_progress(
            args.kingdom,
            3,
            6,
            "NEEDS_CONTINENT_SELECT",
            f"Kingdom #{args.kingdom} not found after proportional seek — ready on Create Character screen",
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
    tap(args.adb, 155, 860, 2.0)      # Select China
    tap(args.adb, 1352, 700, 4.0)     # Tap CONFIRM
    tap(args.adb, 1488, 38, 6.0)      # Tap SKIP intro cutscene

    if args.tutorial_steps > 0:
        print(f"[6/6] Running {args.tutorial_steps} autonomous tutorial steps in #{args.kingdom}...")
        report_progress(args.kingdom, 6, 6, "PROVISIONING_BOT", f"[6/6] Clearing Ch.1 Tutorial in #{args.kingdom} ({args.tutorial_steps} steps)...")
        tut_script = os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py")
        subprocess.run(
            [sys.executable, tut_script, "--adb", args.adb, "--steps", str(args.tutorial_steps)],
            check=False,
        )
    # Open Governor Profile (45, 45), OCR Governor ID & Name, and register in Bastion Cloud Roster
    gov_id = f"BOT-{args.kingdom}"
    gov_name = f"Governor (#{args.kingdom})"
    try:
        tap(args.adb, 45, 45, 2.2)
        screencap(args.adb, snap_path)
        tap(args.adb, 1365, 108, 1.0)
        import re, json, urllib.request
        ocr = get_ocr()
        arr = np.array(Image.open(snap_path).convert("RGB"))
        res, _ = ocr(arr)
        for item in res or []:
            txt = item[1].strip()
            m_id = re.search(r"ID\s*[:\uff1a]?\s*(\d{7,11})", txt, re.IGNORECASE)
            if m_id:
                gov_id = m_id.group(1)
            m_name = re.search(r"(Governor\d{7,11})", txt)
            if m_name:
                gov_name = m_name.group(1)
                if gov_id.startswith("BOT-"):
                    gov_id = gov_name.replace("Governor", "")
        if gov_name.startswith("Governor (") and gov_id.isdigit():
            gov_name = f"Governor{gov_id}"

        payload_bytes = json.dumps({
            "action": "REGISTER_PROVISIONED_BOT",
            "payload": {
                "kingdom": str(args.kingdom),
                "govId": gov_id,
                "name": gov_name,
                "chLevel": 2,
                "power": 4287,
                "instanceId": "sidekick-mumu-0",
            },
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://unity-v2-azure.vercel.app/api/bastion",
            data=payload_bytes,
            headers={"Content-Type": "application/json", "User-Agent": "BastionProvisioner/2.0"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=8).read()
    except Exception as e:
        print(f"[WARN] Could not auto-register bot in cloud: {e}")

    report_progress(args.kingdom, 6, 6, "COMPLETED", f"Provisioned {gov_name} in Kingdom #{args.kingdom}", running=False)
    print(f"[DONE] Provisioned #{args.kingdom} character ({gov_name}, ID={gov_id}).")


if __name__ == "__main__":
    main()

