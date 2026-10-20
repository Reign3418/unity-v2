import sys
import time
import subprocess
import json

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from rapidocr_onnxruntime import RapidOCR

ADB = "C:\\UnityScanner\\platform-tools\\adb.exe"
TARGET = "127.0.0.1:16384"

def adb_shell(cmd):
    subprocess.run([ADB, "-s", TARGET, "shell", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tap(x, y, delay=1.5):
    print(f"[{TARGET}] Tap ({x}, {y})")
    adb_shell(f"input tap {x} {y}")
    time.sleep(delay)

def screencap(out_path):
    adb_shell("screencap -p /sdcard/sw.png")
    subprocess.run([ADB, "-s", TARGET, "pull", "/sdcard/sw.png", out_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def ocr_screen(img_path):
    ocr = RapidOCR()
    res, _ = ocr(img_path)
    items = []
    for box, text, conf in (res or []):
        cx = int(sum(p[0] for p in box) / 4)
        cy = int(sum(p[1] for p in box) / 4)
        items.append({"text": text, "x": cx, "y": cy})
    return items

snap = "C:\\UnityScanner\\sw_step.png"
screencap(snap)
items = ocr_screen(snap)

# Find lilfarmer or 4194 card
target_tap = None
for it in items:
    t = it["text"].lower()
    if "lilfarmer" in t:
        target_tap = (it["x"], it["y"])
        print(f"Found lilfarmer by name at {target_tap}")
        break
    if "4194" in t and target_tap is None:
        target_tap = (it["x"], it["y"])
        print(f"Found 4194 by kingdom tag at {target_tap}")

if not target_tap:
    target_tap = (1100, 335)
    print(f"Using default lilfarmer card coords {target_tap}")

print(f"Tapping lilfarmer card at {target_tap}...")
tap(target_tap[0], target_tap[1], 2.5)

# Check for YES button on login confirmation dialog
screencap(snap)
items = ocr_screen(snap)
yes_btn = None
for it in items:
    if it["text"].strip().upper() == "YES":
        yes_btn = (it["x"], it["y"])
        print(f"Found YES button at {yes_btn}")
        break

if not yes_btn:
    yes_btn = (1035, 710)
    print(f"Using default YES button at {yes_btn}")

print(f"Confirming character switch (tapping YES at {yes_btn})...")
tap(yes_btn[0], yes_btn[1], 12.0)

# Handle potential "TAP TO START" splash screen
for i in range(5):
    screencap(snap)
    items = ocr_screen(snap)
    texts = " ".join([it["text"].upper() for it in items])
    if "TAP TO START" in texts:
        print(f"Detected TAP TO START splash screen (attempt {i+1}) -> tapping (800, 835)...")
        tap(800, 835, 6.0)
    elif "VIP" in texts or "BUILD" in texts or "COMM" in texts or "RESEARCH" in texts:
        print("Successfully reached City HUD!")
        break
    else:
        print(f"Waiting for City HUD (attempt {i+1})...")
        time.sleep(3.0)

screencap(snap)
items = ocr_screen(snap)
print("Final screen OCR sample:")
for it in items[:10]:
    print(f"  {it['text']} at ({it['x']}, {it['y']})")
