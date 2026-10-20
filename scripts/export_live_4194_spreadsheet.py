#!/usr/bin/env python3
"""
Kingdom #4194 Live Telemetric & Executive Spreadsheet Exporter
=============================================================
Fuses live RAM telemetry from SIDEKICK (127.0.0.1:16384) with Unity Live Cache
into a polished, Excel-ready CSV with all 45 fields, formatted with UTF-8 BOM.
"""

import os
import sys
import json
import csv
import urllib.request
from datetime import datetime, timezone

UNITY_ROOT = r"E:\Unity"
CSV_OUT = os.path.join(UNITY_ROOT, "Kingdom_4194_Live_Telemetric.csv")
EXEC_CSV_OUT = os.path.join(UNITY_ROOT, "Kingdom_4194_Executive_Spreadsheet.csv")

def run_remote(cmd, timeout=30):
    payload = json.dumps({"cmd": cmd, "timeoutMs": timeout * 1000}).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:8888/exec",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout + 5) as resp:
        return json.loads(resp.read().decode("utf-8"))

def fetch_sidekick_accum():
    cmd = "[Convert]::ToBase64String([System.IO.File]::ReadAllBytes('C:\\UnityScanner\\ram_accum_16384_4194.json'))"
    res = run_remote(cmd, timeout=25)
    b64 = (res.get("stdout") or "").strip()
    if b64:
        import base64
        data = base64.b64decode(b64).decode("utf-8", errors="replace")
        return json.loads(data)
    return []

def load_live_cache():
    p = os.path.join(UNITY_ROOT, "src", "data", "live_kingdom_telemetry.json")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            d = json.load(f)
            return list(d.get("governorsById", {}).values())
    return []

def load_baseline_csv():
    p = os.path.join(UNITY_ROOT, "Kingdom_4194_Top1000_45Fields.csv")
    govs = []
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                govs.append(row)
    return govs

def main():
    print("[EXPORTER] Aggregating Kingdom #4194 telemetry...")
    
    # 1. Fetch live SIDEKICK RAM accumulator
    try:
        sidekick_govs = fetch_sidekick_accum()
        print(f"  -> SIDEKICK RAM Accumulator: {len(sidekick_govs)} records")
    except Exception as e:
        print(f"  -> SIDEKICK RAM fetch warning: {e}")
        sidekick_govs = []

    # 2. Load Unity Live Telemetry Cache
    cache_govs = load_live_cache()
    print(f"  -> Unity Live Cache: {len(cache_govs)} records")

    # 3. Load Baseline Scan (38h baseline)
    baseline_govs = load_baseline_csv()
    print(f"  -> Baseline Scan (38h old): {len(baseline_govs)} records")

    # Merge by ID
    merged = {}
    for g in baseline_govs:
        gid = str(g.get("govId") or g.get("Governor ID") or g.get("id") or "")
        if gid:
            merged[gid] = dict(g)

    for g in cache_govs:
        gid = str(g.get("govId") or g.get("id") or "")
        if gid:
            if gid in merged:
                merged[gid].update(g)
            else:
                merged[gid] = dict(g)

    for g in sidekick_govs:
        gid = str(g.get("govId") or g.get("id") or "")
        if gid:
            if gid in merged:
                merged[gid].update(g)
            else:
                merged[gid] = dict(g)

    gov_list = list(merged.values())
    # Sort descending by power
    gov_list.sort(key=lambda x: int(float(x.get("power") or x.get("Power") or 0)), reverse=True)

    # Re-assign rank
    for idx, g in enumerate(gov_list, start=1):
        g["Rank"] = idx

    print(f"[EXPORTER] Unified Total: {len(gov_list)} governors in Kingdom #4194 roster.")

    # Write polished CSV with UTF-8 BOM
    headers = [
        "Rank", "Governor ID", "Governor Name", "Alliance Tag", "Alliance Name", "Power",
        "Highest Power", "City Hall", "VIP Level", "Civilization", "Kill Points", "Deads",
        "Healed Troops", "Total Units Killed", "T1 Kills", "T2 Kills", "T3 Kills", "T4 Kills", "T5 Kills",
        "T1 KP", "T2 KP", "T3 KP", "T4 KP", "T5 KP", "Ranged Points", "Victories", "Defeats",
        "Scout Times", "Resources Gathered", "Assistance", "Helps", "Troop Power", "Building Power",
        "Tech Power", "Commander Power", "Castle Coordinates (X, Y)", "Rallies Led", "Rallies Joined",
        "Primary Commander", "Secondary Commander", "Equipped Gear", "Telemetry Source", "Last Updated UTC"
    ]

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    for target_path in [CSV_OUT, EXEC_CSV_OUT]:
        with open(target_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(headers)

            for g in gov_list:
                pos = g.get("castlePos") or g.get("Castle Coordinates (X, Y)")
                pos_str = f"({pos.get('X')}, {pos.get('Y')})" if isinstance(pos, dict) else str(pos or "")

                cmdr1 = g.get("primaryCommander") or g.get("Primary Commander")
                cmdr1_str = f"#{cmdr1.get('id')}(Lv{cmdr1.get('level')})" if isinstance(cmdr1, dict) else str(cmdr1 or "")

                cmdr2 = g.get("secondaryCommander") or g.get("Secondary Commander")
                cmdr2_str = f"#{cmdr2.get('id')}(Lv{cmdr2.get('level')})" if isinstance(cmdr2, dict) else str(cmdr2 or "")

                writer.writerow([
                    g.get("Rank"),
                    g.get("govId") or g.get("Governor ID") or g.get("id"),
                    g.get("name") or g.get("Governor Name"),
                    g.get("alliance") or g.get("Alliance Tag") or "None",
                    g.get("allianceName") or g.get("Alliance Name") or "",
                    int(float(g.get("power") or g.get("Power") or 0)),
                    int(float(g.get("highestPower") or g.get("Highest Power") or g.get("power") or 0)),
                    g.get("cityHall") or g.get("City Hall") or 25,
                    g.get("vipLevel") or g.get("VIP Level") or 0,
                    g.get("civilization") or g.get("Civilization") or "Unknown",
                    int(float(g.get("killPoints") or g.get("Kill Points") or 0)),
                    int(float(g.get("dead") or g.get("Deads") or 0)),
                    int(float(g.get("healedTroops") or g.get("Healed Troops") or 0)),
                    int(float(g.get("totalUnitsKilled") or g.get("Total Units Killed") or 0)),
                    int(float(g.get("t1Kills") or g.get("T1 Kills") or 0)),
                    int(float(g.get("t2Kills") or g.get("T2 Kills") or 0)),
                    int(float(g.get("t3Kills") or g.get("T3 Kills") or 0)),
                    int(float(g.get("t4Kills") or g.get("T4 Kills") or 0)),
                    int(float(g.get("t5Kills") or g.get("T5 Kills") or 0)),
                    int(float(g.get("t1Kp") or g.get("T1 KP") or 0)),
                    int(float(g.get("t2Kp") or g.get("T2 KP") or 0)),
                    int(float(g.get("t3Kp") or g.get("T3 KP") or 0)),
                    int(float(g.get("t4Kp") or g.get("T4 KP") or 0)),
                    int(float(g.get("t5Kp") or g.get("T5 KP") or 0)),
                    int(float(g.get("rangedPoints") or g.get("Ranged Points") or 0)),
                    int(float(g.get("victories") or g.get("Victories") or 0)),
                    int(float(g.get("defeats") or g.get("Defeats") or 0)),
                    int(float(g.get("scoutTimes") or g.get("Scout Times") or 0)),
                    int(float(g.get("gathered") or g.get("Resources Gathered") or 0)),
                    int(float(g.get("assistance") or g.get("Assistance") or 0)),
                    int(float(g.get("helps") or g.get("Helps") or 0)),
                    int(float(g.get("troopPower") or g.get("Troop Power") or 0)),
                    int(float(g.get("buildingPower") or g.get("Building Power") or 0)),
                    int(float(g.get("techPower") or g.get("Tech Power") or 0)),
                    int(float(g.get("commanderPower") or g.get("Commander Power") or 0)),
                    pos_str,
                    g.get("ralliesLed") or g.get("Rallies Led") or 0,
                    g.get("ralliesJoined") or g.get("Rallies Joined") or 0,
                    cmdr1_str,
                    cmdr2_str,
                    g.get("equippedGear") or g.get("Equipped Gear") or "",
                    g.get("telemetrySource") or "HYBRID_LIVE_AND_BASELINE",
                    now_iso
                ])

    print(f"[EXPORTER] Wrote updated spreadsheet to:\n  - {CSV_OUT}\n  - {EXEC_CSV_OUT}")

if __name__ == "__main__":
    main()
