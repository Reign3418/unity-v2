#!/usr/bin/env python3
r"""
Kingdom #4194 Master Telemetry & Tactical Intelligence Exporter
==============================================================
Aggregates ALL available raw fields from:
  1. Live SIDEKICK RAM Accumulator (C:\UnityScanner\ram_accum_16384_4194.json)
  2. Baseline Telemetry (Kingdom_4194_Top1000_45Fields.csv)
  3. Unity Live Telemetry Cache (src/data/live_kingdom_telemetry.json)
  4. Black Ops Watchlist (src/data/black_ops_watchlist.json)

Computes tactical ratios, war kill indices, commander resolutions,
and territorial coordinates across 90+ telemetry columns.
Outputs UTF-8 BOM CSV files for immediate Excel inspection.
"""

import os
import sys
import json
import csv
import urllib.request
import base64
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

UNITY_ROOT = r"E:\Unity"
OUT_CSV = os.path.join(UNITY_ROOT, "Kingdom_4194_Full_Telemetry_AllFields.csv")
MASTER_CSV = os.path.join(UNITY_ROOT, "Kingdom_4194_Top1000_45Fields.csv")
COMMANDER_MAP_FILE = os.path.join(UNITY_ROOT, "src", "data", "rok_commander_ids.json")
WATCHLIST_FILE = os.path.join(UNITY_ROOT, "src", "data", "black_ops_watchlist.json")

def load_commander_map():
    if os.path.exists(COMMANDER_MAP_FILE):
        try:
            with open(COMMANDER_MAP_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {int(k): v.get("name", f"Commander_{k}") for k, v in data.items() if str(k).isdigit()}
        except Exception:
            pass
    return {}

def fetch_sidekick_ram():
    local_path = os.path.join(UNITY_ROOT, "scanner", "ram_accum_16384_4194_live.json")
    # Try fetching fresh via cluster hub
    payload = json.dumps({
        "cmd": "[Convert]::ToBase64String([System.IO.File]::ReadAllBytes('C:\\UnityScanner\\ram_accum_16384_4194.json'))",
        "timeoutMs": 20000
    }).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8888/exec", data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            b64 = (res.get("stdout") or "").strip()
            if b64:
                raw = base64.b64decode(b64).decode("utf-8", errors="replace")
                with open(local_path, "w", encoding="utf-8") as f:
                    f.write(raw)
                return json.loads(raw)
    except Exception as e:
        print(f"  [WARN] Remote fetch from SIDEKICK failed: {e}")

    # Fallback to local live file or scanner accum
    for p in [local_path, os.path.join(UNITY_ROOT, "scanner", "ram_accum_16384_4194.json")]:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8-sig") as f:
                    return json.load(f)
            except Exception:
                pass
    return []

def load_live_cache():
    p = os.path.join(UNITY_ROOT, "src", "data", "live_kingdom_telemetry.json")
    if os.path.exists(p):
        try:
            with open(p, "r", encoding="utf-8") as f:
                d = json.load(f)
                return list(d.get("governorsById", {}).values())
        except Exception:
            pass
    return []

def load_baseline():
    p = os.path.join(UNITY_ROOT, "Kingdom_4194_Top1000_45Fields.csv")
    govs = {}
    if os.path.exists(p):
        try:
            with open(p, "r", encoding="utf-8-sig", errors="replace") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    gid = str(row.get("id") or row.get("govId") or "")
                    if gid:
                        govs[gid] = row
        except Exception:
            pass
    return govs

def load_watchlist():
    if os.path.exists(WATCHLIST_FILE):
        try:
            with open(WATCHLIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f).get("targets", {})
        except Exception:
            pass
    return {}

def classify_governor(power, kp, dead, t4k, t5k, ch):
    if power >= 20000000:
        return "ALPHA_WHALE"
    if power >= 12000000:
        return "MEGA_WHALE"
    if power >= 7000000:
        return "WAR_WHALE"
    if (t4k + t5k) >= 1000000:
        return "COMBAT_SPECIALIST"
    if dead >= 500000:
        return "GARRISON_SACRIFICE"
    if ch >= 21 and kp < 50000:
        return "FARM_ACCOUNT"
    return "REGULAR_FIGHTER"

def format_commander(cmdr_data, cmdr_map):
    if not cmdr_data:
        return "", ""
    if isinstance(cmdr_data, dict):
        cid = int(cmdr_data.get("id") or 0)
        cname = cmdr_map.get(cid, f"Commander #{cid}") if cid > 0 else "None"
        lv = cmdr_data.get("level") or cmdr_data.get("HLv") or 0
        star = cmdr_data.get("star") or cmdr_data.get("HSt") or 0
        skills = cmdr_data.get("skills") or ""
        build_str = f"{cname} Lv{lv} ({star}★) [{skills}]" if skills else f"{cname} Lv{lv} ({star}★)"
        return str(cid) if cid > 0 else "", build_str
    return "", str(cmdr_data)

def main():
    print("==================================================================")
    print("  VALHEON SOLUTIONS — MASTER 90-FIELD TELEMETRY EXPORTER (#4194)  ")
    print("==================================================================")

    cmdr_map = load_commander_map()
    print(f"Loaded {len(cmdr_map)} commander name mappings.")

    baseline_by_id = load_baseline()
    print(f"Loaded {len(baseline_by_id)} baseline records (38h old).")

    live_cache = load_live_cache()
    print(f"Loaded {len(live_cache)} live cache records.")

    sidekick_ram = fetch_sidekick_ram()
    print(f"Loaded {len(sidekick_ram)} SIDEKICK live RAM records.")

    watchlist = load_watchlist()
    print(f"Loaded {len(watchlist)} Black Ops watchlist targets.")

    # Unify records into a master dictionary keyed by Governor ID
    unified = {}

    # 1. Baseline seed
    for gid, b in baseline_by_id.items():
        unified[gid] = dict(b)
        unified[gid]["baselinePower"] = int(float(b.get("power") or 0))
        unified[gid]["baselineRank"] = int(float(b.get("rank") or 0))
        unified[gid]["baselineAlliance"] = b.get("alliance") or "None"

    # 2. Merge Live Cache
    for c in live_cache:
        gid = str(c.get("govId") or c.get("id") or "")
        if gid:
            if gid in unified:
                unified[gid].update(c)
            else:
                unified[gid] = dict(c)

    # 3. Merge SIDEKICK RAM (highest fidelity, real-time memory dumps)
    for r in sidekick_ram:
        gid = str(r.get("govId") or r.get("id") or "")
        if gid:
            if gid in unified:
                for k, v in r.items():
                    if v is not None and v != "" and v != "None":
                        unified[gid][k] = v
            else:
                unified[gid] = dict(r)

    govs = list(unified.values())
    print(f"Total Unified Governor Records: {len(govs)}")

    # Sort descending by current live power
    def get_num(g, *keys):
        for k in keys:
            v = g.get(k)
            if v is not None and v != "":
                try:
                    return float(v)
                except Exception:
                    pass
        return 0.0

    govs.sort(key=lambda g: get_num(g, "power", "Power"), reverse=True)

    # Calculate live ranks and deltas
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    columns = [
        # --- Core Identity & Hierarchy (15) ---
        ("rank", "Rank (Live)"),
        ("prevRank", "Previous Rank"),
        ("rankDelta", "Rank Delta"),
        ("id", "Governor ID"),
        ("name", "Governor Name (UTF-8)"),
        ("alliance", "Alliance Tag"),
        ("allianceName", "Alliance Name"),
        ("allianceChange", "Alliance Changed?"),
        ("kingdomId", "Kingdom Number"),
        ("serverId", "Server ID"),
        ("internalServerId", "Internal Server ID"),
        ("cityHall", "City Hall Level"),
        ("vipLevel", "VIP Level"),
        ("civId", "Civilization ID"),
        ("civilization", "Civilization"),

        # --- Territory & Spatial Telemetry (7) ---
        ("mapTileX", "Map Tile X"),
        ("mapTileY", "Map Tile Y"),
        ("worldX", "World X"),
        ("worldY", "World Y"),
        ("locationCoords", "Castle Coordinates (X, Y)"),
        ("zoneEstimate", "Territory Zone Estimate"),
        ("relocated", "Castle Relocated?"),

        # --- Power & Power Distribution (12) ---
        ("power", "Current Power"),
        ("baselinePower", "Power (38h Baseline)"),
        ("powerDelta", "Power Delta (+/-)"),
        ("powerDeltaPct", "Power Delta (%)"),
        ("highestPower", "Highest Power"),
        ("troopPower", "Troop Power"),
        ("buildingPower", "Building Power"),
        ("techPower", "Tech Power"),
        ("commanderPower", "Commander Power"),
        ("troopPowerPct", "Troop Power Ratio (%)"),
        ("techPowerPct", "Tech Power Ratio (%)"),
        ("buildingPowerPct", "Building Power Ratio (%)"),

        # --- Combat & Kill Telemetry (23) ---
        ("killPoints", "Kill Points (KP)"),
        ("kpToPowerRatio", "KP to Power Efficiency"),
        ("totalUnitsKilled", "Total Units Killed"),
        ("t1Kills", "T1 Kills"),
        ("t2Kills", "T2 Kills"),
        ("t3Kills", "T3 Kills"),
        ("t4Kills", "T4 Kills"),
        ("t5Kills", "T5 Kills"),
        ("t1Kp", "T1 KP"),
        ("t2Kp", "T2 KP"),
        ("t3Kp", "T3 KP"),
        ("t4Kp", "T4 KP"),
        ("t5Kp", "T5 KP"),
        ("warKills", "War Kills (T4 + T5)"),
        ("warKillRatioPct", "War Kill Ratio (%)"),
        ("t5KillPct", "T5 Kill (%)"),
        ("t4KillPct", "T4 Kill (%)"),
        ("t1PaddingPct", "T1 Farm Padding (%)"),
        ("rangedPoints", "Ranged Combat Points"),
        ("dead", "Dead Troops"),
        ("deadToPowerPct", "Dead to Power Ratio (%)"),
        ("healedTroops", "Healed Troops"),
        ("scoutTimes", "Scout Times"),

        # --- Battle Record & Win Rates (4) ---
        ("victories", "Victories"),
        ("defeats", "Defeats"),
        ("totalBattles", "Total Battles"),
        ("winRatePct", "Win Rate (%)"),

        # --- Economy & Support (6) ---
        ("gathered", "Resources Gathered"),
        ("gatheredToPowerRatio", "Gathered to Power Ratio"),
        ("assistance", "Resources Assisted"),
        ("assistanceToPowerRatio", "Assistance to Power Ratio"),
        ("helps", "Alliance Helps"),
        ("helpsPerDayEst", "Helps Intensity"),

        # --- KvK Career Telemetry (5) ---
        ("kvkHighestKp", "KvK Highest KP"),
        ("kvkMostKills", "KvK Most Kills"),
        ("kvkMostDead", "KvK Most Dead"),
        ("kvkMostHealed", "KvK Most Healed"),
        ("kvkCount", "KvK Campaigns Count"),

        # --- Ark of Osiris Telemetry (7) ---
        ("aooWins", "AoO Wins"),
        ("aooLosses", "AoO Losses"),
        ("aooLeaves", "AoO Leaves"),
        ("aooTotalMatches", "AoO Total Matches"),
        ("aooWinRatePct", "AoO Win Rate (%)"),
        ("aooHighestScore", "AoO Highest Score"),
        ("aooKillStocks", "AoO Kill Stocks"),

        # --- Military Leadership & Commanders (7) ---
        ("ralliesLed", "Rallies Led"),
        ("ralliesJoined", "Rallies Joined"),
        ("primaryCommanderId", "Primary Commander ID"),
        ("primaryCommanderName", "Primary Commander Build"),
        ("secondaryCommanderId", "Secondary Commander ID"),
        ("secondaryCommanderName", "Secondary Commander Build"),
        ("equippedGear", "Equipped Armaments / Gear"),

        # --- Intelligence & System Metadata (8) ---
        ("tacticalClassification", "Tactical Classification"),
        ("blackOpsTracked", "Black Ops Radar Locked?"),
        ("udid", "UDID (Hardware Hash)"),
        ("appUid", "App UID"),
        ("clientPlatform", "Client Platform"),
        ("telemetrySource", "Telemetry Source"),
        ("lastScanDate", "Last Scanned At"),
        ("exportedAt", "Export Timestamp (UTC)")
    ]

    header_keys = [c[0] for c in columns]
    header_labels = [c[1] for c in columns]

    rows = []
    for idx, g in enumerate(govs, start=1):
        cur_rank = idx
        prev_r = int(get_num(g, "prevRank", "baselineRank") or cur_rank)
        r_delta = prev_r - cur_rank
        rank_delta_str = f"+{r_delta}" if r_delta > 0 else (str(r_delta) if r_delta < 0 else "=")

        gid = str(g.get("id") or g.get("govId") or "")
        name = str(g.get("name") or g.get("Governor Name") or f"Governor_{gid}")
        cur_all = str(g.get("alliance") or g.get("Alliance Tag") or "None")
        base_all = str(g.get("baselineAlliance") or cur_all)
        all_changed = "YES" if (base_all != "None" and cur_all != "None" and base_all != cur_all) else "NO"

        # Spatial Coordinates
        pos = g.get("castlePos") or {}
        tile_x = int(get_num(g, "mapTileX") or (pos.get("X") if isinstance(pos, dict) else 0) or 0)
        tile_y = int(get_num(g, "mapTileY") or (pos.get("Y") if isinstance(pos, dict) else 0) or 0)
        world_x = int(get_num(g, "worldX") or 0)
        world_y = int(get_num(g, "worldY") or 0)
        loc_coords = f"({tile_x}, {tile_y})" if (tile_x > 0 or tile_y > 0) else ""

        zone_est = "Zone 1 (Outer)"
        if 400 <= tile_x <= 800 and 400 <= tile_y <= 800:
            zone_est = "Zone 3 (Core / Holy Sites)"
        elif 250 <= tile_x <= 950 and 250 <= tile_y <= 950:
            zone_est = "Zone 2 (Middle)"

        # Power Breakdown & Deltas
        cur_power = int(get_num(g, "power", "Power"))
        base_power = int(get_num(g, "baselinePower") or cur_power)
        pwr_delta = cur_power - base_power
        pwr_delta_pct = round((pwr_delta / base_power * 100.0), 2) if base_power > 0 else 0.0

        troop_pwr = int(get_num(g, "troopPower", "Troop Power"))
        bldg_pwr = int(get_num(g, "buildingPower", "Building Power"))
        tech_pwr = int(get_num(g, "techPower", "Tech Power"))
        cmdr_pwr = int(get_num(g, "commanderPower", "Commander Power"))

        troop_pct = round((troop_pwr / cur_power * 100.0), 1) if cur_power > 0 else 0.0
        tech_pct = round((tech_pwr / cur_power * 100.0), 1) if cur_power > 0 else 0.0
        bldg_pct = round((bldg_pwr / cur_power * 100.0), 1) if cur_power > 0 else 0.0

        # Combat Telemetry
        kp = int(get_num(g, "killPoints", "Kill Points"))
        kp_ratio = round((kp / cur_power), 2) if cur_power > 0 else 0.0
        total_kills = int(get_num(g, "totalUnitsKilled", "Total Units Killed"))
        t1k = int(get_num(g, "t1Kills", "T1 Kills"))
        t2k = int(get_num(g, "t2Kills", "T2 Kills"))
        t3k = int(get_num(g, "t3Kills", "T3 Kills"))
        t4k = int(get_num(g, "t4Kills", "T4 Kills"))
        t5k = int(get_num(g, "t5Kills", "T5 Kills"))

        t1kp = int(get_num(g, "t1Kp", "T1 KP"))
        t2kp = int(get_num(g, "t2Kp", "T2 KP"))
        t3kp = int(get_num(g, "t3Kp", "T3 KP"))
        t4kp = int(get_num(g, "t4Kp", "T4 KP"))
        t5kp = int(get_num(g, "t5Kp", "T5 KP"))

        war_kills = t4k + t5k
        war_kill_pct = round((war_kills / total_kills * 100.0), 1) if total_kills > 0 else 0.0
        t5_pct = round((t5k / total_kills * 100.0), 1) if total_kills > 0 else 0.0
        t4_pct = round((t4k / total_kills * 100.0), 1) if total_kills > 0 else 0.0
        t1_padding_pct = round((t1k / total_kills * 100.0), 1) if total_kills > 0 else 0.0

        dead = int(get_num(g, "dead", "Deads"))
        dead_pct = round((dead / cur_power * 100.0), 2) if cur_power > 0 else 0.0
        healed = int(get_num(g, "healedTroops", "Healed Troops"))
        scouts = int(get_num(g, "scoutTimes", "Scout Times"))
        ranged = int(get_num(g, "rangedPoints", "Ranged Points"))

        # Battles & Win Rates
        vic = int(get_num(g, "victories", "Victories"))
        defeats = int(get_num(g, "defeats", "Defeats"))
        tot_battles = vic + defeats
        win_rate = round((vic / tot_battles * 100.0), 1) if tot_battles > 0 else 0.0

        # Economy & Support
        gathered = int(get_num(g, "gathered", "Resources Gathered"))
        gath_ratio = round((gathered / cur_power), 2) if cur_power > 0 else 0.0
        assisted = int(get_num(g, "assistance", "Resources Assisted"))
        asst_ratio = round((assisted / cur_power), 2) if cur_power > 0 else 0.0
        helps = int(get_num(g, "helps", "Alliance Helps"))
        helps_intensity = "HIGH" if helps >= 5000 else ("MEDIUM" if helps >= 1000 else "LOW")

        # KvK Career Telemetry
        kvk_kp = int(get_num(g, "kvkHighestKp", "KvK Highest KP"))
        kvk_kills = int(get_num(g, "kvkMostKills", "KvK Most Kills"))
        kvk_dead = int(get_num(g, "kvkMostDead", "KvK Most Dead"))
        kvk_healed = int(get_num(g, "kvkMostHealed", "KvK Most Healed"))
        kvk_count = int(get_num(g, "kvkCount", "KvK Count"))

        # AoO Competitive Telemetry
        aoo_w = int(get_num(g, "aooWins", "AoO Wins"))
        aoo_l = int(get_num(g, "aooLosses", "AoO Losses"))
        aoo_leaves = int(get_num(g, "aooLeaves", "AoO Leaves"))
        aoo_matches = aoo_w + aoo_l + aoo_leaves
        aoo_win_rate = round((aoo_w / (aoo_w + aoo_l) * 100.0), 1) if (aoo_w + aoo_l) > 0 else 0.0
        aoo_score = int(get_num(g, "aooHighestScore", "AoO Highest Score"))
        aoo_stocks = int(get_num(g, "aooKillStocks", "AoO Kill Stocks"))

        # Commanders
        c1_id, c1_str = format_commander(g.get("primaryCommander") or g.get("primaryCommanderStr"), cmdr_map)
        c2_id, c2_str = format_commander(g.get("secondaryCommander") or g.get("secondaryCommanderStr"), cmdr_map)

        ch = int(get_num(g, "cityHall", "City Hall") or 25)
        vip = int(get_num(g, "vipLevel", "VIP Level") or 0)
        classification = classify_governor(cur_power, kp, dead, t4k, t5k, ch)
        is_tracked = "LOCKED_RADAR" if gid in watchlist else "NO"

        row = {
            "rank": cur_rank,
            "prevRank": prev_r,
            "rankDelta": rank_delta_str,
            "id": gid,
            "name": name,
            "alliance": cur_all,
            "allianceName": str(g.get("allianceName") or ""),
            "allianceChange": all_changed,
            "kingdomId": str(g.get("kingdomId") or "4194"),
            "serverId": str(g.get("serverId") or "3194"),
            "internalServerId": str(g.get("internalServerId") or "3194"),
            "cityHall": ch,
            "vipLevel": vip,
            "civId": int(get_num(g, "civId") or 6),
            "civilization": str(g.get("civilization") or "China"),

            "mapTileX": tile_x if tile_x > 0 else "",
            "mapTileY": tile_y if tile_y > 0 else "",
            "worldX": world_x if world_x > 0 else "",
            "worldY": world_y if world_y > 0 else "",
            "locationCoords": loc_coords,
            "zoneEstimate": zone_est,
            "relocated": "YES" if (g.get("castlePos") and (tile_x > 0 or tile_y > 0)) else "NO",

            "power": cur_power,
            "baselinePower": base_power,
            "powerDelta": pwr_delta,
            "powerDeltaPct": f"{pwr_delta_pct}%",
            "highestPower": int(get_num(g, "highestPower", "Highest Power") or cur_power),
            "troopPower": troop_pwr,
            "buildingPower": bldg_pwr,
            "techPower": tech_pwr,
            "commanderPower": cmdr_pwr,
            "troopPowerPct": f"{troop_pct}%",
            "techPowerPct": f"{tech_pct}%",
            "buildingPowerPct": f"{bldg_pct}%",

            "killPoints": kp,
            "kpToPowerRatio": kp_ratio,
            "totalUnitsKilled": total_kills,
            "t1Kills": t1k,
            "t2Kills": t2k,
            "t3Kills": t3k,
            "t4Kills": t4k,
            "t5Kills": t5k,
            "t1Kp": t1kp,
            "t2Kp": t2kp,
            "t3Kp": t3kp,
            "t4Kp": t4kp,
            "t5Kp": t5kp,
            "warKills": war_kills,
            "warKillRatioPct": f"{war_kill_pct}%",
            "t5KillPct": f"{t5_pct}%",
            "t4KillPct": f"{t4_pct}%",
            "t1PaddingPct": f"{t1_padding_pct}%",
            "rangedPoints": ranged,
            "dead": dead,
            "deadToPowerPct": f"{dead_pct}%",
            "healedTroops": healed,
            "scoutTimes": scouts,

            "victories": vic,
            "defeats": defeats,
            "totalBattles": tot_battles,
            "winRatePct": f"{win_rate}%",

            "gathered": gathered,
            "gatheredToPowerRatio": gath_ratio,
            "assistance": assisted,
            "assistanceToPowerRatio": asst_ratio,
            "helps": helps,
            "helpsPerDayEst": helps_intensity,

            "kvkHighestKp": kvk_kp,
            "kvkMostKills": kvk_kills,
            "kvkMostDead": kvk_dead,
            "kvkMostHealed": kvk_healed,
            "kvkCount": kvk_count,

            "aooWins": aoo_w,
            "aooLosses": aoo_l,
            "aooLeaves": aoo_leaves,
            "aooTotalMatches": aoo_matches,
            "aooWinRatePct": f"{aoo_win_rate}%",
            "aooHighestScore": aoo_score,
            "aooKillStocks": aoo_stocks,

            "ralliesLed": int(get_num(g, "ralliesLed") or 0),
            "ralliesJoined": int(get_num(g, "ralliesJoined") or 0),
            "primaryCommanderId": c1_id,
            "primaryCommanderName": c1_str,
            "secondaryCommanderId": c2_id,
            "secondaryCommanderName": c2_str,
            "equippedGear": str(g.get("equippedGear") or ""),

            "tacticalClassification": classification,
            "blackOpsTracked": is_tracked,
            "udid": str(g.get("udid") or ""),
            "appUid": str(g.get("appUid") or ""),
            "clientPlatform": str(g.get("clientPlatform") or "com.lilithgame.roc.gp"),
            "telemetrySource": str(g.get("telemetrySource") or "MUMU_45_FIELD_UNIFIED_RAM_AND_SAVE"),
            "lastScanDate": str(g.get("lastScanDate") or g.get("updatedAt") or now_iso),
            "exportedAt": now_iso
        }
        rows.append(row)

    print(f"Compiled {len(rows)} fully enriched telemetry rows across {len(columns)} fields.")

    # Export to both files with UTF-8 BOM
    for out_file in [OUT_CSV, MASTER_CSV]:
        with open(out_file, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(header_labels)
            for r in rows:
                writer.writerow([r.get(k, "") for k in header_keys])
        print(f"  -> Successfully generated: {out_file} ({len(rows)} rows, {len(columns)} columns)")

    print("==================================================================")
    print("  EXECUTIVE SUMMARY OF TOP WHALES & TELEMETRY FIELDS")
    print("==================================================================")
    for r in rows[:6]:
        print(
            f"  [#{r['rank']:02d}] {r['name']} [{r['alliance']}] | "
            f"Power: {r['power']:,} ({r['powerDelta']:+,} / {r['powerDeltaPct']}) | "
            f"KP: {r['killPoints']:,} (War Kills: {r['warKills']:,}, {r['warKillRatioPct']}) | "
            f"Dead: {r['dead']:,} | Class: {r['tacticalClassification']} | Pos: {r['locationCoords'] or 'N/A'}"
        )

if __name__ == "__main__":
    main()
