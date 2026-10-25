import sys
import json
import re
import urllib.request
import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR

sys.stdout.reconfigure(encoding='utf-8')

OCR_ENGINE = RapidOCR()

def parse_int(s):
    digits = re.sub(r'[^0-9]', '', str(s or ''))
    return int(digits) if digits else 0

def classify_tile_resource(tile_bgr, denom):
    """
    Classifies a RoK resource card into food, wood, stone, gold, or chest
    using both denomination rules and center-icon HSV color signature.
    """
    # Unique stone denominations in RoK (75% of Food/Wood)
    if denom in (750, 7500, 37500, 112500, 375000, 1125000, 3750000):
        return 'stone'
    # Unique gold denominations in RoK
    if denom in (500, 3000, 15000, 200000, 600000, 2000000):
        return 'gold'

    # Shared denominations (1000, 10000, 50000, 150000, 500000, 1500000, 5000000):
    # Distinguish Food (green/yellow corn) vs Wood (reddish-brown log) vs Gold (50,000 coin)
    h, w = tile_bgr.shape[:2]
    center = tile_bgr[int(h*0.25):int(h*0.72), int(w*0.22):int(w*0.78)]
    if center.size == 0:
        return 'food'
    hsv = cv2.cvtColor(center, cv2.COLOR_BGR2HSV)
    hue = hsv[:, :, 0]
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]

    # Green pixels (Corn Husk: Hue 32..85, Sat > 60)
    green_ratio = np.mean((hue >= 32) & (hue <= 85) & (sat > 55) & (val > 50))
    if green_ratio > 0.08:
        return 'food'

    # Warm brown/orange pixels (Wood Log: Hue 5..22) vs bright Gold (Hue 20..32, high val)
    if denom == 50000:
        gold_ratio = np.mean((hue >= 18) & (hue <= 32) & (sat > 120) & (val > 180))
        if gold_ratio > 0.25:
            return 'gold'
    return 'wood'

def scan_rok_image(image_url):
    if image_url.startswith('http://') or image_url.startswith('https://'):
        req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=15).read()
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    else:
        img = cv2.imread(image_url)
    if img is None:
        return {"error": "Could not decode image"}

    h, w = img.shape[:2]
    scale = 2.0 if max(h, w) < 1600 else 1.0
    work = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC) if scale != 1.0 else img

    res, _ = OCR_ENGINE(work)
    items = []
    for box, txt, conf in (res or []):
        x0 = int(min(p[0] for p in box) / scale)
        y0 = int(min(p[1] for p in box) / scale)
        x1 = int(max(p[0] for p in box) / scale)
        y1 = int(max(p[1] for p in box) / scale)
        items.append({
            "text": txt.strip(),
            "conf": float(conf),
            "x": (x0 + x1) // 2,
            "y": (y0 + y1) // 2,
            "box": [x0, y0, x1, y1]
        })

    # Detect if this is a Rise of Kingdoms GOVERNOR PROFILE Screenshot (Horizontal or Mobile Portrait)
    full_text = " ".join(it["text"] for it in items)
    id_match = None
    id_item = None
    gov_label_item = None
    for it in items:
        m = re.search(r'(?:ID|1D)\s*[:：]?\s*(\d{5,12})', it["text"], re.IGNORECASE)
        if m:
            id_match = m.group(1)
            id_item = it
        if re.match(r'^Governor\b', it["text"], re.IGNORECASE):
            gov_label_item = it

    if id_match or ("GOVERNOR" in full_text.upper() and ("KILL POINTS" in full_text.upper() or "ALLIANCE" in full_text.upper())):
        gov_id = id_match or ""
        gov_name = ""
        alliance_tag = ""
        alliance_full = ""
        civilization = ""
        power_val = 0
        kp_val = 0
        is_self_profile = False
        action_points = ""

        # 1. Extract Alliance [TAG]Name
        for it in items:
            am = re.search(r'[\[\(【]([^\]\)】]{2,6})[\]\)】]\s*(.*)', it["text"])
            if am:
                alliance_tag = am.group(1).strip()
                alliance_full = f"[{alliance_tag}]{am.group(2).strip()}" if am.group(2).strip() else f"[{alliance_tag}]"
                break

        # 2. Extract Action Points (Self-Profile Proof)
        for it in items:
            if "ACTION" in it["text"].upper() and "POINT" in it["text"].upper():
                is_self_profile = True
            apm = re.search(r'(\d[\d,]*\s*/\s*1[.,]?[05]00)', it["text"])
            if apm:
                is_self_profile = True
                action_points = apm.group(1).replace(" ", "")

        # 3. Extract Governor Name (located immediately below 'Governor' or 'Governor(ID:...)')
        anchor = gov_label_item or id_item
        if anchor:
            ax, ay = anchor["x"], anchor["y"]
            candidates = []
            for it in items:
                if it is anchor or it is id_item:
                    continue
                dy = it["y"] - ay
                dx = abs(it["x"] - ax)
                if 15 <= dy <= 65 and dx <= 160:
                    cleaned = re.sub(r'^[\s:：•·\-\*]+', '', it["text"]).strip()
                    if cleaned and not re.match(r'^(Civilization|Alliance|Power|Kill|Action)', cleaned, re.IGNORECASE):
                        candidates.append((dy, cleaned))
            if candidates:
                candidates.sort(key=lambda c: c[0])
                gov_name = candidates[0][1]

        # 4. Helper to find value either to the right (Portrait) or directly below (Horizontal) a label
        def find_stat_near_label(label_regex, numeric=True):
            lbl = next((it for it in items if re.search(label_regex, it["text"], re.IGNORECASE)), None)
            if not lbl:
                return 0 if numeric else ""
            lx, ly = lbl["x"], lbl["y"]
            best = []
            for it in items:
                if it is lbl:
                    continue
                dy = it["y"] - ly
                dx = it["x"] - lx
                # Horizontal layout: directly below label (10 <= dy <= 55, abs(dx) <= 95)
                is_below = (10 <= dy <= 55 and abs(dx) <= 95)
                # Portrait layout: same row to the right (abs(dy) <= 22, dx > 60)
                is_right = (abs(dy) <= 22 and dx > 60)
                if is_below or is_right:
                    if numeric:
                        val = parse_int(it["text"])
                        if val > 0:
                            best.append((abs(dy) + abs(dx) * 0.1, val))
                    else:
                        txt = it["text"].strip()
                        if txt and not re.search(r'^\d+$', txt):
                            best.append((abs(dy) + abs(dx) * 0.1, txt))
            if best:
                best.sort(key=lambda b: b[0])
                return best[0][1]
            return 0 if numeric else ""

        power_val = find_stat_near_label(r'^Power$')
        kp_val = find_stat_near_label(r'Kill\s*Points')
        civilization = find_stat_near_label(r'^Civilization$', numeric=False)

        return {
            "mode": "GOVERNOR_PROFILE",
            "gov_id": gov_id,
            "gov_name": gov_name or "Governor",
            "alliance_tag": alliance_tag,
            "alliance_full": alliance_full or (f"[{alliance_tag}]" if alliance_tag else "None"),
            "civilization": civilization or "Unknown",
            "power": power_val,
            "kill_points": kp_val,
            "is_self_profile": is_self_profile,
            "action_points": action_points,
            "lines": [it["text"] for it in items if it["conf"] >= 0.65][:30]
        }

    # Detect if this is a RoK Resource Inventory Bag Grid
    VALID_DENOMS = {
        500, 750, 1000, 3000, 5000, 7500, 10000, 15000, 37500, 50000,
        112500, 150000, 200000, 375000, 500000, 600000, 1125000, 1500000,
        2000000, 3750000, 5000000
    }

    denom_headers = []
    number_tokens = []
    for it in items:
        val = parse_int(it["text"])
        # Handle OCR dropping leading '1' on '1,500,000' or '1,125,000'
        if it["text"].startswith(",500,000") or val == 500000 and "500,000" in it["text"]:
            if ",500,000" in it["text"]:
                val = 1500000
        if val == 125000:
            val = 1125000
        if val > 0:
            it["val"] = val
            number_tokens.append(it)
            if val in VALID_DENOMS:
                denom_headers.append(it)

    if len(denom_headers) >= 3:
        # Estimate tile size from horizontal spacing of denomination headers
        totals = {"food": 0, "wood": 0, "stone": 0, "gold": 0, "chests": 0}
        breakdown = []

        # Sort headers top-to-bottom, left-to-right
        denom_headers.sort(key=lambda d: (d["y"] // 60, d["x"]))

        used_qty_ids = set()
        for idx, hdr in enumerate(denom_headers):
            denom = hdr["val"]
            hx, hy = hdr["x"], hdr["y"]
            # Find the quantity token located below and slightly right of the top denomination banner
            best_qty = None
            for q_idx, qt in enumerate(number_tokens):
                if q_idx in used_qty_ids or qt is hdr:
                    continue
                dy = qt["y"] - hy
                dx = qt["x"] - hx
                if 35 <= dy <= 135 and -45 <= dx <= 85:
                    best_qty = (q_idx, qt["val"])
                    break

            qty = 0
            if best_qty is not None:
                used_qty_ids.add(best_qty[0])
                qty = best_qty[1]
            else:
                # Fallback: crop the bottom-right corner of the card and OCR single-digit white numbers (e.g. 1, 3, 8)
                cy0 = max(0, hy + 40)
                cy1 = min(h, hy + 115)
                cx0 = max(0, hx - 10)
                cx1 = min(w, hx + 68)
                corner = img[cy0:cy1, cx0:cx1]
                if corner.size > 0:
                    corner_big = cv2.resize(corner, None, fx=4.0, fy=4.0, interpolation=cv2.INTER_CUBIC)
                    c_res, _ = OCR_ENGINE(corner_big)
                    for _, c_txt, _ in (c_res or []):
                        c_val = parse_int(c_txt)
                        if 0 < c_val < 100000:
                            qty = c_val
                            break

            if qty <= 0:
                qty = 1

            # Crop tile around header to classify resource type
            ty0 = max(0, hy - 15)
            ty1 = min(h, hy + 110)
            tx0 = max(0, hx - 55)
            tx1 = min(w, hx + 55)
            tile_bgr = img[ty0:ty1, tx0:tx1]
            rtype = classify_tile_resource(tile_bgr, denom)
            sub_total = denom * qty
            totals[rtype] += sub_total
            breakdown.append({
                "type": rtype,
                "denom": denom,
                "qty": qty,
                "total": sub_total
            })

        # Also check for Resource Chests (cards on the first row that have a bottom-right qty but no top denomination header)
        for q_idx, qt in enumerate(number_tokens):
            if q_idx in used_qty_ids:
                continue
            if qt["val"] not in VALID_DENOMS and qt["val"] > 0:
                # Check if any denom header is above this token
                has_hdr = any(35 <= (qt["y"] - dh["y"]) <= 135 and abs(qt["x"] - dh["x"]) <= 75 for dh in denom_headers)
                if not has_hdr:
                    totals["chests"] += qt["val"]
                    breakdown.append({
                        "type": "chest",
                        "denom": 1,
                        "qty": qt["val"],
                        "total": qt["val"]
                    })

        return {
            "mode": "RESOURCE_BAG",
            "totals": totals,
            "grand_total_rss": totals["food"] + totals["wood"] + totals["stone"] + totals["gold"],
            "breakdown": breakdown
        }

    # General RoK Screenshot / Profile / Battle Report OCR
    lines = [it["text"] for it in items if it["conf"] >= 0.65]
    return {
        "mode": "GENERAL_OCR",
        "lines": lines[:40]
    }

if __name__ == "__main__":
    url = sys.argv[1]
    print(json.dumps(scan_rok_image(url), ensure_ascii=False))
