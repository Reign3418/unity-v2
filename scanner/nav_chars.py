import sys
import time
import json
import subprocess

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from rapidocr_onnxruntime import RapidOCR

ADB = "C:\\UnityScanner\\platform-tools\\adb.exe"

def adb_shell(target, cmd):
    subprocess.run([ADB, "-s", target, "shell", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tap(target, x, y, delay=1.5):
    print(f"[{target}] Tap ({x}, {y})")
    adb_shell(target, f"input tap {x} {y}")
    time.sleep(delay)

def screencap(target, out_path):
    adb_shell(target, "screencap -p /sdcard/inspect.png")
    subprocess.run([ADB, "-s", target, "pull", "/sdcard/inspect.png", out_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def ocr_screen(img_path):
    ocr = RapidOCR()
    res, _ = ocr(img_path)
    items = []
    for box, text, conf in (res or []):
        cx = int(sum(p[0] for p in box) / 4)
        cy = int(sum(p[1] for p in box) / 4)
        items.append({"text": text, "x": cx, "y": cy, "box": box})
    return items

def navigate_to_characters(target):
    snap = f"C:\\UnityScanner\\nav_{target.replace(':', '_')}.png"
    screencap(target, snap)
    items = ocr_screen(snap)
    texts = " ".join([i["text"].upper() for i in items])
    print(f"[{target}] Current screen text: {repr(texts[:100])}...")

    if "CHARACTER" in texts and ("CREATE NEW" in texts or "NORMAL CHARACTERS" in texts or "ROSTER" in texts):
        print(f"[{target}] Already on Character Management screen!")
        return items

    if "SETTINGS" in texts and ("GENERAL" in texts or "ACCOUNT" in texts or "CHARACTER" in texts):
        print(f"[{target}] In Settings screen, finding Character Management...")
        for it in items:
            if "CHARACTER" in it["text"].upper():
                tap(target, it["x"], it["y"] - 40, 3.5)
                screencap(target, snap)
                return ocr_screen(snap)
        tap(target, 1155, 255, 3.5)
        screencap(target, snap)
        return ocr_screen(snap)

    if "GOVERNOR PROFILE" in texts:
        print(f"[{target}] In Governor Profile, tapping Settings...")
        tap(target, 1357, 755, 2.5)
        screencap(target, snap)
        items = ocr_screen(snap)
        for it in items:
            if "CHARACTER" in it["text"].upper():
                tap(target, it["x"], it["y"] - 40, 3.5)
                screencap(target, snap)
                return ocr_screen(snap)
        tap(target, 1155, 255, 3.5)
        screencap(target, snap)
        return ocr_screen(snap)

    # From HUD
    print(f"[{target}] Navigating from HUD...")
    tap(target, 45, 45, 2.5)
    tap(target, 1357, 755, 2.5)
    screencap(target, snap)
    items = ocr_screen(snap)
    for it in items:
        if "CHARACTER" in it["text"].upper():
            tap(target, it["x"], it["y"] - 40, 3.5)
            screencap(target, snap)
            return ocr_screen(snap)
    tap(target, 1155, 255, 3.5)
    screencap(target, snap)
    return ocr_screen(snap)

port = sys.argv[1] if len(sys.argv) > 1 else "16384"
target = f"127.0.0.1:{port}"
items = navigate_to_characters(target)
print(f"[{target}] Visible items on Character Screen:")
for it in items:
    print(f"  {it['text']} at ({it['x']}, {it['y']})")
