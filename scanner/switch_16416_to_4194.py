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
TARGET = "127.0.0.1:16416"

def adb_shell(cmd):
    subprocess.run([ADB, "-s", TARGET, "shell", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tap(x, y, delay=1.5):
    print(f"[{TARGET}] Tap ({x}, {y})")
    adb_shell(f"input tap {x} {y}")
    time.sleep(delay)

def screencap(out_path):
    adb_shell("screencap -p /sdcard/sw16416.png")
    subprocess.run([ADB, "-s", TARGET, "pull", "/sdcard/sw16416.png", out_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def ocr_screen(img_path):
    ocr = RapidOCR()
    res, _ = ocr(img_path)
    items = []
    for box, text, conf in (res or []):
        cx = int(sum(p[0] for p in box) / 4)
        cy = int(sum(p[1] for p in box) / 4)
        items.append({"text": text, "x": cx, "y": cy})
    return items

snap = "C:\\UnityScanner\\sw_16416_step.png"
screencap(snap)
items = ocr_screen(snap)

# Currently 16416 should be on the scrolled character screen where 4194 was visible!
found_4194 = None
for it in items:
    if "4194" in it["text"]:
        found_4194 = it
        break

if found_4194:
    print(f"Found 4194 directly at {found_4194}")
    tap(found_4194["x"], found_4194["y"], 2.5)
else:
    print("4194 not on current viewport, tapping at (1114, 550)...")
    tap(1114, 550, 2.5)

# Check for YES button on login modal
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

print(f"Confirming character switch on 16416 (tapping YES at {yes_btn})...")
tap(yes_btn[0], yes_btn[1], 12.0)

# Check for TAP TO START splash screen
for i in range(5):
    screencap(snap)
    items = ocr_screen(snap)
    texts = " ".join([it["text"].upper() for it in items])
    if "TAP TO START" in texts:
        print(f"Detected TAP TO START splash screen (attempt {i+1}) -> tapping (800, 835)...")
        tap(800, 835, 6.0)
    elif any(k in texts for k in ["VIP", "BUILD", "RESEARCH", "ALLIANCE", "COMM"]):
        print("Successfully reached City HUD on 16416!")
        break
    else:
        print(f"Waiting for City HUD on 16416 (attempt {i+1})...")
        time.sleep(3.0)

screencap(snap)
items = ocr_screen(snap)
print("Final screen OCR sample on 16416:")
for it in items[:10]:
    print(f"  {it['text']} at ({it['x']}, {it['y']})")
