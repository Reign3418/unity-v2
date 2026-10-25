import os
import sys
import json
from datetime import datetime, timezone

sys.path.insert(0, r"E:\Unity\scanner")
from unity_autonomous_scanner import parse_rok_binary

SAVE_DIR = r"C:\Program Files (x86)\Rise of Kingdoms\Rise of Kingdoms Game\save"
MAIL_DIR = os.path.join(SAVE_DIR, "mailcache")
TELEMETRY_PATH = r"E:\Unity\src\data\live_kingdom_telemetry.json"
BLACKBOX_4197_PATH = r"E:\Unity\scanner\swarm_4197_blackbox.json"
OUT_MAP_PATH = r"E:\Unity\src\data\live_kingdom_map_entities.json"


def to_tile(val):
    try:
        v = float(val)
        if v <= 0:
            return 0.0
        if v > 1200 or not float(v).is_integer():
            return round(v / 6.0, 1)
        return round(v, 1)
    except Exception:
        return 0.0


def srv_to_kd(srv):
    try:
        s = int(srv)
        if 2000 <= s <= 4000:
            return str(s + 1000)
        return str(s)
    except Exception:
        return "4197"


def main():
    cities_by_gov = {}
    forts_and_battles = {}
    alliance_structures = {}
    alliance_markers = {}
    holy_sites_and_ruins = {}
    rss_nodes = {}
    scout_discoveries = {}
    caves_and_villages = []

    # 1. Harvest ALL ScoutFind_<govId>_<serverId>_* files (e.g. _3197_ for #4197, _3194_ for #4194, _3198_ for #4198)
    seen_caves = set()
    if os.path.exists(SAVE_DIR):
        for fn in os.listdir(SAVE_DIR):
            if fn.startswith("ScoutFind_"):
                parts_fn = fn.split("_")
                srv_id = 3197
                if len(parts_fn) >= 3 and parts_fn[2].isdigit():
                    srv_id = int(parts_fn[2])
                fp = os.path.join(SAVE_DIR, fn)
                try:
                    doc = parse_rok_binary(open(fp, "rb").read())
                    if isinstance(doc, dict):
                        for k in doc.keys():
                            if "_" in str(k):
                                parts = str(k).split("_")
                                if len(parts) == 2:
                                    wx, wy = float(parts[0]), float(parts[1])
                                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                                    ckey = f"{srv_id}_{tx}_{ty}"
                                    if 0 < tx <= 1200 and 0 < ty <= 1200 and ckey not in seen_caves:
                                        seen_caves.add(ckey)
                                        caves_and_villages.append({
                                            "id": f"cave_{srv_id}_{k}",
                                            "type": "CAVE_VILLAGE",
                                            "x": tx,
                                            "y": ty,
                                            "worldX": wx,
                                            "worldY": wy,
                                            "serverId": srv_id,
                                        })
                except Exception as e:
                    print("ScoutFind err:", e)

    # 2. Load telemetry rosters across all kingdoms (#4197, #4194, #4198, etc.) for governor enrichment
    roster_by_kd_id = {}
    roster_by_kd_name = {}
    if os.path.exists(TELEMETRY_PATH):
        try:
            raw_tel = json.load(open(TELEMETRY_PATH, "r", encoding="utf-8"))
            for kd_key, kd_obj in (raw_tel.get("kingdoms") or {}).items():
                govs = kd_obj.get("governors") or {}
                roster_by_kd_id[str(kd_key)] = govs
                roster_by_kd_name[str(kd_key)] = {}
                for gid, g in govs.items():
                    nm = str(g.get("name", "")).strip().lower()
                    if nm:
                        roster_by_kd_name[str(kd_key)][nm] = (str(gid), g)
        except Exception as e:
            print("Telemetry load err:", e)

    # 3. Walk all Persistent.Mail.* files for every coordinate-bearing map object across all servers (#4197 = 3197, #4194 = 3194, etc.)
    mail_files = []
    if os.path.exists(MAIL_DIR):
        mail_files = [os.path.join(MAIL_DIR, f) for f in os.listdir(MAIL_DIR) if f.startswith("Persistent.Mail.")]

    for fp in mail_files:
        try:
            doc = parse_rok_binary(open(fp, "rb").read())
            if not isinstance(doc, dict):
                continue
            mtype = doc.get("type", "")
            srv = int(doc.get("serverId") or 0)
            kd_str = srv_to_kd(srv)
            kd_roster_by_id = roster_by_kd_id.get(kd_str, {})
            kd_roster_by_name = roster_by_kd_name.get(kd_str, {})
            mtime = doc.get("time", 0)
            ts_sec = int(mtime / 1_000_000) if mtime > 1e14 else (int(mtime / 1000) if mtime > 1e11 else int(mtime))
            body = doc.get("body", {}) if isinstance(doc.get("body"), dict) else {}
            content = body.get("content", {}) if isinstance(body.get("content"), dict) else {}
            kvs = body.get("kvs", {}) if isinstance(body.get("kvs"), dict) else {}

            # A. Alliance Flags, Crusader Flags, Center Fortresses, Mother Lodes (Alliance Resource Pits)
            if mtype == "AllianceBuilding":
                sub = body.get("subTitle", "Alliance Structure")
                pos = kvs.get("pos", {})
                cpos = kvs.get("creator_pos") or kvs.get("oper_pos") or {}
                creator_name = kvs.get("creator_name") or kvs.get("oper_name") or ""
                bx, by = 0.0, 0.0
                if isinstance(cpos, dict) and cpos.get("X") and cpos.get("Y"):
                    bx, by = round(float(cpos["X"]) / 6.0, 1), round(float(cpos["Y"]) / 6.0, 1)
                if isinstance(pos, dict) and pos.get("X") and pos.get("Y"):
                    wx, wy = float(pos["X"]), float(pos["Y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    key = f"{srv}_{tx}_{ty}"
                    b_cat = (
                        "CENTER_FORTRESS" if "Fortress" in sub
                        else ("ALLIANCE_RESOURCE_PIT" if ("Mother Lode" in sub or "Pit" in sub)
                        else ("CRUSADER_FLAG" if "Crusader" in sub else "ALLIANCE_FLAG"))
                    )
                    is_demolished = "Demolished" in sub
                    prev = alliance_structures.get(key)
                    if not prev or ts_sec >= prev.get("timestamp", 0):
                        alliance_structures[key] = {
                            "id": f"struct_{key}",
                            "type": b_cat,
                            "label": sub,
                            "status": "DEMOLISHED" if is_demolished else "ACTIVE",
                            "builderName": creator_name,
                            "x": tx,
                            "y": ty,
                            "worldX": round(wx, 2),
                            "worldY": round(wy, 2),
                            "builderX": bx,
                            "builderY": by,
                            "serverId": srv,
                            "timestamp": ts_sec,
                        }
                        if b_cat == "ALLIANCE_RESOURCE_PIT":
                            pit_cat = (
                                "STONE" if "Stone" in sub
                                else ("WOOD" if "Wood" in sub
                                else ("GOLD" if "Gold" in sub else "FOOD"))
                            )
                            rss_nodes.setdefault(key, {
                                "id": f"pit_{key}",
                                "type": "ALLIANCE_RESOURCE_PIT",
                                "rssCategory": "PIT",
                                "resTypeId": 10,
                                "label": f"Alliance Resource Pit ({sub})",
                                "level": 10,
                                "isAlliancePit": True,
                                "pitResource": pit_cat,
                                "harvestedAmount": 0,
                                "talentBonus": 0,
                                "totalYield": 0,
                                "x": tx,
                                "y": ty,
                                "worldX": round(wx, 2),
                                "worldY": round(wy, 2),
                                "serverId": srv,
                                "timestamp": ts_sec,
                            })
                if isinstance(cpos, dict) and cpos.get("X") and cpos.get("Y"):
                    wx, wy = float(cpos["X"]), float(cpos["Y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    r4_key = f"r4_{srv}_{tx}_{ty}"
                    alliance_structures[r4_key] = {
                        "id": r4_key,
                        "type": "R4_BUILDER_CITY",
                        "label": f"R4 Officer City: {creator_name}" if creator_name else "R4/R5 Flag Builder City",
                        "officerName": creator_name,
                        "status": "ACTIVE",
                        "x": tx,
                        "y": ty,
                        "worldX": round(wx, 2),
                        "worldY": round(wy, 2),
                        "serverId": srv,
                        "timestamp": ts_sec,
                    }
                    if creator_name:
                        nm_low = creator_name.strip().lower()
                        gid_match, g_obj = kd_roster_by_name.get(nm_low, (f"r4_{srv}_{int(tx)}_{int(ty)}", {}))
                        ckey = f"{srv}_{gid_match}"
                        cities_by_gov[ckey] = {
                            **(cities_by_gov.get(ckey, {})),
                            "id": str(gid_match),
                            "govId": int(gid_match) if str(gid_match).isdigit() else gid_match,
                            "type": "GOVERNOR_CITY",
                            "name": g_obj.get("name") or creator_name,
                            "alliance": g_obj.get("alliance") or "None",
                            "allianceName": g_obj.get("allianceName") or "",
                            "power": g_obj.get("power") or 0,
                            "killPoints": g_obj.get("killPoints") or 0,
                            "cityHall": g_obj.get("cityHall") or 25,
                            "x": tx,
                            "y": ty,
                            "worldX": round(wx, 2),
                            "worldY": round(wy, 2),
                            "source": "R4_FLAG_BUILDER_POS",
                            "serverId": srv,
                            "timestamp": ts_sec,
                        }

            # B. Alliance Markers, Coalition Markers, Ruins & Holy Sites
            elif mtype == "Alliance":
                title = body.get("title", "")
                m_srv = int(kvs.get("server_id") or srv)
                if "Marker" in title and kvs.get("x") and kvs.get("y"):
                    wx, wy = float(kvs["x"]), float(kvs["y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    if 0 < tx <= 1200 and 0 < ty <= 1200:
                        mkey = f"{m_srv}_{tx}_{ty}_{kvs.get('comment', '')}"
                        alliance_markers[mkey] = {
                            "id": f"marker_{m_srv}_{tx}_{ty}",
                            "type": "COALITION_MARKER" if "Coalition" in title else "ALLIANCE_MARKER",
                            "comment": kvs.get("comment", "Tactical Marker"),
                            "author": kvs.get("name", "R4/R5 Officer"),
                            "x": tx,
                            "y": ty,
                            "worldX": wx,
                            "worldY": wy,
                            "serverId": m_srv,
                            "timestamp": ts_sec,
                        }
                spos = kvs.get("stronghold_pos")
                if isinstance(spos, dict) and spos.get("X") and spos.get("Y"):
                    wx, wy = float(spos["X"]), float(spos["Y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    hkey = f"{m_srv}_{tx}_{ty}"
                    holy_sites_and_ruins[hkey] = {
                        "id": f"holy_{hkey}",
                        "type": "HOLY_SITE_STRONGHOLD",
                        "label": title or "Sanctum / Altar / Ruins",
                        "x": tx,
                        "y": ty,
                        "worldX": wx,
                        "worldY": wy,
                        "serverId": m_srv,
                        "timestamp": ts_sec,
                    }

            # C. Resource Nodes (Food, Wood, Stone, Gold, Gems, Crystal & Alliance Pits)
            elif mtype == "Rss":
                pos = content.get("Pos", {})
                if isinstance(pos, dict) and pos.get("X") and pos.get("Y"):
                    wx, wy = float(pos["X"]), float(pos["Y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    nkey = f"{srv}_{tx}_{ty}"
                    rss_type_id = int(content.get("ResType") or content.get("Type") or 1)
                    lvl = int(content.get("Level") or 1)
                    res_val = int(content.get("ResValue") or 0)
                    talent_bonus = int(content.get("talentAdd") or 0)
                    crystal_val = int(content.get("ResCollectCrystal") or 0)
                    is_pit = lvl >= 10
                    rss_cat_map = {1: "FOOD", 2: "WOOD", 3: "STONE", 4: "GOLD", 5: "GEMS"}
                    rss_cat = "GEMS" if crystal_val > 0 else rss_cat_map.get(rss_type_id, "FOOD")
                    rss_label_map = {
                        "FOOD": "Alliance Food Pit (Mother Lode)" if is_pit else f"Lv.{lvl} Cropland (Food)",
                        "WOOD": "Alliance Wood Pit (Mother Lode)" if is_pit else f"Lv.{lvl} Logging Camp (Wood)",
                        "STONE": "Alliance Stone Pit (Mother Lode)" if is_pit else f"Lv.{lvl} Stone Deposit (Quarry)",
                        "GOLD": "Alliance Gold Pit (Mother Lode)" if is_pit else f"Lv.{lvl} Gold Deposit (Mine)",
                        "GEMS": f"Lv.{lvl} Gem / Crystal Deposit",
                    }
                    rss_nodes[nkey] = {
                        "id": f"rss_{nkey}",
                        "type": "ALLIANCE_RESOURCE_PIT" if is_pit else "RESOURCE_NODE",
                        "rssCategory": rss_cat,
                        "resTypeId": rss_type_id,
                        "label": rss_label_map.get(rss_cat, f"Lv.{lvl} Resource Node"),
                        "level": lvl,
                        "isAlliancePit": is_pit,
                        "harvestedAmount": res_val,
                        "talentBonus": talent_bonus,
                        "totalYield": res_val + talent_bonus,
                        "x": tx,
                        "y": ty,
                        "worldX": round(wx, 2),
                        "worldY": round(wy, 2),
                        "serverId": srv,
                        "timestamp": ts_sec,
                    }

            # D. ScoutReport (Direct City/Structure Scout)
            elif mtype == "ScoutReport":
                ch = content.get("char", {})
                pos = ch.get("pos", {})
                pid = int(content.get("playerId") or ch.get("id") or 0)
                if isinstance(pos, dict) and pos.get("x") and pos.get("y") and pid > 0:
                    wx, wy = float(pos["x"]), float(pos["y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    troop = content.get("troop", {}) if isinstance(content.get("troop"), dict) else {}
                    pname = troop.get("playerName") or content.get("scoutPlayerName") or f"Gov_{pid}"
                    all_obj = ch.get("alliance", {}) if isinstance(ch.get("alliance"), dict) else {}
                    abbr = all_obj.get("abbr") or troop.get("abbr") or "None"
                    dur = content.get("durability", {}) if isinstance(content.get("durability"), dict) else {}
                    twr = content.get("tower", {}) if isinstance(content.get("tower"), dict) else {}
                    ckey = f"{srv}_{pid}"
                    cities_by_gov[ckey] = {
                        **(cities_by_gov.get(ckey, {})),
                        "id": str(pid),
                        "govId": pid,
                        "type": "GOVERNOR_CITY",
                        "name": pname,
                        "alliance": abbr,
                        "x": tx,
                        "y": ty,
                        "worldX": round(wx, 2),
                        "worldY": round(wy, 2),
                        "wallHp": dur.get("num", 0),
                        "wallMaxHp": dur.get("max", 0),
                        "watchtowerLevel": twr.get("level", 0),
                        "source": "SCOUT_REPORT",
                        "serverId": srv,
                        "timestamp": ts_sec,
                    }

            # E. ScoutDiscoverReport (Discovered Caves / Villages / Passes / Altars / Shrines)
            elif mtype == "ScoutDiscoverReport":
                pos = content.get("pos", {})
                if isinstance(pos, dict) and pos.get("x") and pos.get("y"):
                    wx, wy = float(pos["x"]), float(pos["y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    skey = f"{srv}_{tx}_{ty}"
                    dtype = int(content.get("type") or 0)
                    cavi_id = int(content.get("caviId") or 0)
                    scout_discoveries[skey] = {
                        "id": f"disc_{skey}",
                        "type": "SCOUT_DISCOVERY",
                        "subType": dtype,
                        "caviId": cavi_id,
                        "x": tx,
                        "y": ty,
                        "worldX": round(wx, 2),
                        "worldY": round(wy, 2),
                        "serverId": srv,
                        "timestamp": ts_sec,
                    }
                    if dtype in (4, 5, 16):
                        holy_label = (
                            "Sanctum / Altar (Scouted)" if dtype == 4
                            else ("Kingdom Pass / Gate (Scouted)" if dtype == 5 else f"Kingdom Monument / Shrine (#{cavi_id})")
                        )
                        holy_sites_and_ruins.setdefault(skey, {
                            "id": f"holy_disc_{skey}",
                            "type": "HOLY_SITE_STRONGHOLD",
                            "label": holy_label,
                            "x": tx,
                            "y": ty,
                            "worldX": round(wx, 2),
                            "worldY": round(wy, 2),
                            "serverId": srv,
                            "timestamp": ts_sec,
                        })
                    elif dtype in (10, 11) and skey not in seen_caves and 0 < tx <= 1200 and 0 < ty <= 1200:
                        seen_caves.add(skey)
                        caves_and_villages.append({
                            "id": f"cave_disc_{skey}",
                            "type": "CAVE_VILLAGE",
                            "x": tx,
                            "y": ty,
                            "worldX": round(wx, 2),
                            "worldY": round(wy, 2),
                            "serverId": srv,
                        })

            # F. Battle Reports (Governor Cities + Barbarian Forts + Open-Field Clash Sites)
            elif mtype in ("Battle", "BarbaricHold", "Attack"):
                def extract_char_city(ch_dict, fallback_pos=None):
                    if not isinstance(ch_dict, dict):
                        return
                    cpos = ch_dict.get("CastlePos") or fallback_pos
                    if not isinstance(cpos, dict) or not (cpos.get("X") and cpos.get("Y")):
                        return
                    wx, wy = float(cpos["X"]), float(cpos["Y"])
                    if wx <= 0 or wy <= 0:
                        return
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    if tx > 1200 or ty > 1200:
                        return
                    pid = int(ch_dict.get("PId") or ch_dict.get("Id") or 0)
                    npc_t = int(ch_dict.get("NpcType") or 0)
                    npc_bt = int(ch_dict.get("NpcBType") or ch_dict.get("SubType") or 0)
                    if pid > 0:
                        existing_gov = kd_roster_by_id.get(str(pid), {})
                        ckey = f"{srv}_{pid}"
                        prev_c = cities_by_gov.get(ckey, {})
                        if not prev_c or ts_sec >= prev_c.get("timestamp", 0):
                            cities_by_gov[ckey] = {
                                **prev_c,
                                "id": str(pid),
                                "govId": pid,
                                "type": "GOVERNOR_CITY",
                                "name": ch_dict.get("PName") or ch_dict.get("Name") or existing_gov.get("name") or prev_c.get("name") or f"Gov_{pid}",
                                "alliance": ch_dict.get("Abbr") or existing_gov.get("alliance") or prev_c.get("alliance") or "None",
                                "allianceName": ch_dict.get("AName") or ch_dict.get("AN") or existing_gov.get("allianceName") or prev_c.get("allianceName") or "",
                                "power": existing_gov.get("power") or prev_c.get("power") or 0,
                                "killPoints": existing_gov.get("killPoints") or prev_c.get("killPoints") or 0,
                                "cityHall": int(ch_dict.get("CastleLevel") or ch_dict.get("L") or existing_gov.get("cityHall") or 25),
                                "x": tx,
                                "y": ty,
                                "worldX": round(wx, 2),
                                "worldY": round(wy, 2),
                                "source": "BATTLE_REPORT_MAILCACHE",
                                "serverId": srv,
                                "originServerId": int(ch_dict.get("COSId") or ch_dict.get("CosId") or srv),
                                "timestamp": ts_sec,
                            }
                    else:
                        fkey = f"{srv}_{tx}_{ty}"
                        if npc_bt == 6:
                            holy_sites_and_ruins.setdefault(fkey, {
                                "id": f"holy_{fkey}",
                                "type": "HOLY_SITE_GUARDIAN",
                                "label": f"Sanctum / Altar Guardian (Type {npc_t})",
                                "x": tx,
                                "y": ty,
                                "worldX": round(wx, 2),
                                "worldY": round(wy, 2),
                                "serverId": srv,
                                "timestamp": ts_sec,
                            })
                        npc_label_map = {
                            2: f"Barbarian Fort (ID {npc_t})",
                            6: f"Holy Site Guardian (ID {npc_t})",
                            16: f"Lohar / Event Boss (ID {npc_t})",
                            38: f"Marauder Encampment (ID {npc_t})",
                            41: f"Barbarian Camp / Keep (ID {npc_t})",
                            47: f"KvK Marauder Fort / Stronghold (ID {npc_t})",
                            1: f"Barbarian Patrol (Lv/ID {npc_t})",
                        }
                        label = npc_label_map.get(npc_bt, f"Barbarian / NPC Target (Type {npc_bt}:{npc_t})")
                        forts_and_battles[fkey] = {
                            "id": f"fort_{fkey}",
                            "type": "BARBARIAN_FORT" if npc_bt in (2, 41, 47) else "NPC_BATTLE_SITE",
                            "subType": npc_bt,
                            "npcType": npc_t,
                            "label": label,
                            "level": int(ch_dict.get("HLv") or ch_dict.get("CastleLevel") or 0),
                            "x": tx,
                            "y": ty,
                            "worldX": round(wx, 2),
                            "worldY": round(wy, 2),
                            "serverId": srv,
                            "timestamp": ts_sec,
                        }

                extract_char_city(content.get("SelfChar"))
                extract_char_city(content.get("Defenser"))
                atks = content.get("Attacks")
                if isinstance(atks, dict):
                    for atk in atks.values():
                        if isinstance(atk, dict):
                            extract_char_city(atk.get("CIdt"), fallback_pos=atk.get("Pos"))
                cidt = content.get("CIdt")
                if isinstance(cidt, dict):
                    for v in cidt.values():
                        extract_char_city(v)
                elif isinstance(cidt, list):
                    for v in cidt:
                        extract_char_city(v)
        except Exception:
            pass

    # 4. Merge live #4197 Bot Swarm Cities & Harvested Resource Nodes from swarm_4197_blackbox.json
    if os.path.exists(BLACKBOX_4197_PATH):
        try:
            bb = json.load(open(BLACKBOX_4197_PATH, "r", encoding="utf-8"))
            for port, inst in (bb.get("instances") or {}).items():
                coords = inst.get("coordinates") or {}
                tx, ty = float(coords.get("x") or 0), float(coords.get("y") or 0)
                gname = inst.get("activeGovernorName") or f"SwarmBot_{port}"
                if 0 < tx <= 1200 and 0 < ty <= 1200 and str(coords.get("kingdom", "4197")) == "4197":
                    gid_num = int("".join(ch for ch in gname if ch.isdigit()) or port)
                    ckey = f"3197_{gid_num}"
                    cities_by_gov[ckey] = {
                        "id": str(gid_num),
                        "govId": gid_num,
                        "type": "GOVERNOR_CITY",
                        "name": gname,
                        "alliance": inst.get("allianceTag") or "None",
                        "allianceName": "Valheon 4197 Swarm",
                        "power": int(inst.get("power") or 0),
                        "killPoints": 0,
                        "cityHall": int(inst.get("chLevel") or 8),
                        "x": tx,
                        "y": ty,
                        "worldX": round(tx * 6.0, 2),
                        "worldY": round(ty * 6.0, 2),
                        "source": "SWARM_4197_BLACKBOX",
                        "serverId": 3197,
                        "timestamp": int(datetime.now(timezone.utc).timestamp()),
                    }
            for mov in (bb.get("movements") or []):
                if mov.get("category") == "FARMING_MARCH" and str(mov.get("kingdom", "4197")) == "4197":
                    det = mov.get("details") or {}
                    mc = det.get("mapCoords") or {}
                    tx = float(det.get("x") or mc.get("x") or 0)
                    ty = float(det.get("y") or mc.get("y") or 0)
                    rcat = str(det.get("resource") or "FOOD").upper()
                    rlabel = det.get("nodeLabel") or f"{rcat.title()} Node"
                    if 0 < tx <= 1200 and 0 < ty <= 1200:
                        nkey = f"3197_{tx}_{ty}_{rcat}"
                        rss_nodes.setdefault(nkey, {
                            "id": f"rss_{nkey}",
                            "type": "RESOURCE_NODE",
                            "rssCategory": rcat if rcat in ("FOOD", "WOOD", "STONE", "GOLD") else "FOOD",
                            "resTypeId": {"FOOD": 1, "WOOD": 2, "STONE": 3, "GOLD": 4}.get(rcat, 1),
                            "label": f"Lv.2 {rlabel}",
                            "level": 2,
                            "isAlliancePit": False,
                            "harvestedAmount": 0,
                            "talentBonus": 0,
                            "totalYield": 0,
                            "x": tx,
                            "y": ty,
                            "worldX": round(tx * 6.0, 2),
                            "worldY": round(ty * 6.0, 2),
                            "serverId": 3197,
                            "timestamp": int(datetime.now(timezone.utc).timestamp()),
                        })
        except Exception as e:
            print("Blackbox 4197 merge err:", e)

    # 5. Correlate Alliance Markers with Alliance Flags at the same (srv, x, y) to identify R4 Flag Builder Cities
    markers_by_pos = {}
    for m_obj in alliance_markers.values():
        markers_by_pos[f"{m_obj.get('serverId')}_{m_obj['x']}_{m_obj['y']}"] = m_obj.get("author")

    for st_obj in alliance_structures.values():
        srv = st_obj.get("serverId", 3197)
        kd_str = srv_to_kd(srv)
        kd_roster_by_name = roster_by_kd_name.get(kd_str, {})
        if st_obj.get("type") != "R4_BUILDER_CITY" and st_obj.get("builderX") and st_obj.get("builderY"):
            pos_key = f"{srv}_{st_obj['x']}_{st_obj['y']}"
            author_name = st_obj.get("builderName") or markers_by_pos.get(pos_key)
            if author_name:
                st_obj["builderName"] = author_name
                r4_key = f"r4_{srv}_{st_obj['builderX']}_{st_obj['builderY']}"
                if r4_key in alliance_structures:
                    alliance_structures[r4_key]["label"] = f"R4 Officer City: {author_name}"
                    alliance_structures[r4_key]["officerName"] = author_name
                nm_key = str(author_name).strip().lower()
                if nm_key in kd_roster_by_name:
                    gid, g_obj = kd_roster_by_name[nm_key]
                    bx, by = st_obj["builderX"], st_obj["builderY"]
                    ckey = f"{srv}_{gid}"
                    cities_by_gov[ckey] = {
                        **(cities_by_gov.get(ckey, {})),
                        "id": gid,
                        "govId": int(gid),
                        "type": "GOVERNOR_CITY",
                        "name": g_obj.get("name", author_name),
                        "alliance": g_obj.get("alliance", "None"),
                        "allianceName": g_obj.get("allianceName", ""),
                        "power": g_obj.get("power", 0),
                        "killPoints": g_obj.get("killPoints", 0),
                        "cityHall": g_obj.get("cityHall", 25),
                        "x": bx,
                        "y": by,
                        "worldX": round(bx * 6.0, 2),
                        "worldY": round(by * 6.0, 2),
                        "source": "R4_FLAG_BUILDER_POS",
                        "serverId": srv,
                        "timestamp": st_obj.get("timestamp", 0),
                    }

    payload = {
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mapScale": {"widthKm": 1200, "heightKm": 1200, "engineScaleFactor": 6},
        "counts": {
            "governorCities": len(cities_by_gov),
            "allianceStructures": len(alliance_structures),
            "allianceMarkers": len(alliance_markers),
            "holySitesAndRuins": len(holy_sites_and_ruins),
            "barbarianForts": len(forts_and_battles),
            "resourceNodes": len(rss_nodes),
            "scoutDiscoveries": len(scout_discoveries),
            "cavesAndVillages": len(caves_and_villages),
            "totalMapEntities": (
                len(cities_by_gov)
                + len(alliance_structures)
                + len(alliance_markers)
                + len(holy_sites_and_ruins)
                + len(forts_and_battles)
                + len(rss_nodes)
                + len(caves_and_villages)
            ),
        },
        "governorCities": list(cities_by_gov.values()),
        "allianceStructures": list(alliance_structures.values()),
        "allianceMarkers": list(alliance_markers.values()),
        "holySitesAndRuins": list(holy_sites_and_ruins.values()),
        "barbarianForts": list(forts_and_battles.values()),
        "resourceNodes": list(rss_nodes.values()),
        "cavesAndVillages": caves_and_villages,
    }

    # Back-fill discovered governor coordinates into live_kingdom_telemetry.json for each kingdom (#4197, #4194, etc.)
    if os.path.exists(TELEMETRY_PATH):
        try:
            raw_tel = json.load(open(TELEMETRY_PATH, "r", encoding="utf-8"))
            updated_gov_coords = 0
            for c_obj in cities_by_gov.values():
                kd_str = srv_to_kd(c_obj.get("serverId", 3197))
                gid = str(c_obj.get("govId") or c_obj.get("id"))
                govs_kd = raw_tel.get("kingdoms", {}).get(kd_str, {}).get("governors", {})
                if gid in govs_kd:
                    g = govs_kd[gid]
                    g["castlePos"] = {
                        "X": c_obj["x"],
                        "Y": c_obj["y"],
                        "worldX": c_obj["worldX"],
                        "worldY": c_obj["worldY"],
                    }
                    if c_obj.get("wallHp"):
                        g["wallHp"] = c_obj["wallHp"]
                        g["wallMaxHp"] = c_obj.get("wallMaxHp", 0)
                    if c_obj.get("watchtowerLevel"):
                        g["watchtowerLevel"] = c_obj["watchtowerLevel"]
                    updated_gov_coords += 1
            if updated_gov_coords > 0:
                with open(TELEMETRY_PATH, "w", encoding="utf-8") as tf:
                    json.dump(raw_tel, tf, indent=2, ensure_ascii=False)
                print(f"Enriched {updated_gov_coords} roster governors with exact in-game (X, Y) coordinates!")
        except Exception as e:
            print("Telemetry backfill err:", e)

    with open(OUT_MAP_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print("Saved live_kingdom_map_entities.json!")
    print("Counts:", json.dumps(payload["counts"], indent=2))


if __name__ == "__main__":
    main()
