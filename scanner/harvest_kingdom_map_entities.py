import os
import sys
import json
from collections import Counter

sys.path.insert(0, r"E:\Unity\scanner")
from unity_autonomous_scanner import parse_rok_binary

SAVE_DIR = r"C:\Program Files (x86)\Rise of Kingdoms\Rise of Kingdoms Game\save"
MAIL_DIR = os.path.join(SAVE_DIR, "mailcache")
TELEMETRY_PATH = r"E:\Unity\src\data\live_kingdom_telemetry.json"
OUT_MAP_PATH = r"E:\Unity\src\data\live_kingdom_map_entities.json"


def to_tile(val):
    try:
        v = float(val)
        if v <= 0:
            return 0.0
        # RoK world engine is 0..7200 (6 world units = 1 km tile on 1200x1200 map)
        if v > 1200 or not float(v).is_integer():
            return round(v / 6.0, 1)
        return round(v, 1)
    except Exception:
        return 0.0


def main():
    cities_by_gov = {}
    forts_and_battles = {}
    alliance_structures = {}
    alliance_markers = {}
    holy_sites_and_ruins = {}
    rss_nodes = {}
    scout_discoveries = {}
    caves_and_villages = []

    # 1. Harvest ScoutFind_235693754_3194_* (2,144 Caves & Tribal Villages in #4194)
    for fn in os.listdir(SAVE_DIR):
        if fn.startswith("ScoutFind_") and "_3194_" in fn:
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
                                if 0 < tx <= 1200 and 0 < ty <= 1200:
                                    caves_and_villages.append({
                                        "id": f"cave_{k}",
                                        "type": "CAVE_VILLAGE",
                                        "x": tx,
                                        "y": ty,
                                        "worldX": wx,
                                        "worldY": wy,
                                    })
            except Exception as e:
                print("ScoutFind err:", e)

    # 2. Load existing #4194 telemetry roster for governor enrichment (do not pre-seed cities_by_gov so mailcache raw worldX/Y is always authoritative)
    roster_by_id = {}
    roster_by_name = {}
    if os.path.exists(TELEMETRY_PATH):
        try:
            raw_tel = json.load(open(TELEMETRY_PATH, "r", encoding="utf-8"))
            roster_by_id = raw_tel.get("kingdoms", {}).get("4194", {}).get("governors", {})
            for gid, g in roster_by_id.items():
                nm = str(g.get("name", "")).strip().lower()
                if nm:
                    roster_by_name[nm] = (str(gid), g)
        except Exception as e:
            print("Telemetry load err:", e)

    # 3. Walk all 2,435 Persistent.Mail.* files for every coordinate-bearing map object
    mail_files = [os.path.join(MAIL_DIR, f) for f in os.listdir(MAIL_DIR) if f.startswith("Persistent.Mail.")]
    for fp in mail_files:
        try:
            doc = parse_rok_binary(open(fp, "rb").read())
            if not isinstance(doc, dict):
                continue
            mtype = doc.get("type", "")
            srv = doc.get("serverId", 0)
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
                bx, by = 0.0, 0.0
                if isinstance(cpos, dict) and cpos.get("X") and cpos.get("Y"):
                    bx, by = round(float(cpos["X"]) / 6.0, 1), round(float(cpos["Y"]) / 6.0, 1)
                if isinstance(pos, dict) and pos.get("X") and pos.get("Y"):
                    wx, wy = float(pos["X"]), float(pos["Y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    key = f"{tx}_{ty}"
                    b_cat = (
                        "CENTER_FORTRESS" if "Fortress" in sub
                        else ("ALLIANCE_RESOURCE_PIT" if "Mother Lode" in sub
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
                            rss_nodes.setdefault(key, {
                                "id": f"pit_{key}",
                                "type": "ALLIANCE_RESOURCE_PIT",
                                "rssCategory": "PIT",
                                "resTypeId": 10,
                                "label": f"Alliance Resource Pit ({sub})",
                                "level": 10,
                                "isAlliancePit": True,
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
                    r4_key = f"r4_{tx}_{ty}"
                    if r4_key not in alliance_structures:
                        alliance_structures[r4_key] = {
                            "id": r4_key,
                            "type": "R4_BUILDER_CITY",
                            "label": "R4/R5 Flag Builder City",
                            "status": "ACTIVE",
                            "x": tx,
                            "y": ty,
                            "worldX": round(wx, 2),
                            "worldY": round(wy, 2),
                            "serverId": srv,
                            "timestamp": ts_sec,
                        }

            # B. Alliance Markers, Coalition Markers, Ruins & Holy Sites
            elif mtype == "Alliance":
                title = body.get("title", "")
                if "Marker" in title and kvs.get("x") and kvs.get("y"):
                    wx, wy = float(kvs["x"]), float(kvs["y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    mkey = f"{tx}_{ty}_{kvs.get('comment', '')}"
                    alliance_markers[mkey] = {
                        "id": f"marker_{tx}_{ty}",
                        "type": "COALITION_MARKER" if "Coalition" in title else "ALLIANCE_MARKER",
                        "comment": kvs.get("comment", "Tactical Marker"),
                        "author": kvs.get("name", "R4/R5 Officer"),
                        "x": tx,
                        "y": ty,
                        "worldX": wx,
                        "worldY": wy,
                        "serverId": kvs.get("server_id", srv),
                        "timestamp": ts_sec,
                    }
                spos = kvs.get("stronghold_pos")
                if isinstance(spos, dict) and spos.get("X") and spos.get("Y"):
                    wx, wy = float(spos["X"]), float(spos["Y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    hkey = f"{tx}_{ty}"
                    holy_sites_and_ruins[hkey] = {
                        "id": f"holy_{hkey}",
                        "type": "HOLY_SITE_STRONGHOLD",
                        "label": title or "Sanctum / Altar / Ruins",
                        "x": tx,
                        "y": ty,
                        "worldX": wx,
                        "worldY": wy,
                        "serverId": srv,
                        "timestamp": ts_sec,
                    }

            # C. Resource Nodes (Food, Wood, Stone, Gold, Gems, Crystal & Alliance Pits)
            elif mtype == "Rss":
                pos = content.get("Pos", {})
                if isinstance(pos, dict) and pos.get("X") and pos.get("Y"):
                    wx, wy = float(pos["X"]), float(pos["Y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    nkey = f"{tx}_{ty}"
                    rss_type_id = int(content.get("ResType") or content.get("Type") or 1)
                    lvl = int(content.get("Level") or 1)
                    res_val = int(content.get("ResValue") or 0)
                    talent_bonus = int(content.get("talentAdd") or 0)
                    crystal_val = int(content.get("ResCollectCrystal") or 0)
                    is_pit = lvl >= 10
                    rss_cat_map = {
                        1: "FOOD",
                        2: "WOOD",
                        3: "STONE",
                        4: "GOLD",
                        5: "GEMS",
                    }
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

            # D. ScoutReport (Direct City/Structure Scout with Wall HP, Watchtower, Lootable RSS, Garrison)
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
                    cities_by_gov[str(pid)] = {
                        **(cities_by_gov.get(str(pid), {})),
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

            # E. ScoutDiscoverReport (Discovered Caves / Villages / Passes / Altars)
            elif mtype == "ScoutDiscoverReport":
                pos = content.get("pos", {})
                if isinstance(pos, dict) and pos.get("x") and pos.get("y"):
                    wx, wy = float(pos["x"]), float(pos["y"])
                    tx, ty = round(wx / 6.0, 1), round(wy / 6.0, 1)
                    skey = f"{tx}_{ty}"
                    dtype = content.get("type", 0)
                    scout_discoveries[skey] = {
                        "id": f"disc_{skey}",
                        "type": "SCOUT_DISCOVERY",
                        "subType": dtype,
                        "caviId": content.get("caviId", 0),
                        "x": tx,
                        "y": ty,
                        "worldX": round(wx, 2),
                        "worldY": round(wy, 2),
                        "serverId": srv,
                        "timestamp": ts_sec,
                    }

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
                    pid = int(ch_dict.get("PId") or ch_dict.get("Id") or 0)
                    npc_t = int(ch_dict.get("NpcType") or 0)
                    npc_bt = int(ch_dict.get("NpcBType") or ch_dict.get("SubType") or 0)
                    if pid > 0:
                        existing_gov = roster_by_id.get(str(pid), {})
                        prev_c = cities_by_gov.get(str(pid), {})
                        prev_srv = prev_c.get("serverId", 0)
                        # Always prefer serverId == 3194 (Home Map #4194) over older/migrated server reports
                        should_update = (
                            not prev_c
                            or (srv == 3194 and prev_srv != 3194)
                            or (srv == prev_srv and ts_sec >= prev_c.get("timestamp", 0))
                        )
                        if should_update:
                            cities_by_gov[str(pid)] = {
                                **prev_c,
                                "id": str(pid),
                                "govId": pid,
                                "type": "GOVERNOR_CITY",
                                "name": ch_dict.get("PName") or ch_dict.get("Name") or existing_gov.get("name") or prev_c.get("name") or f"Gov_{pid}",
                                "alliance": existing_gov.get("alliance") or ch_dict.get("Abbr") or prev_c.get("alliance") or "None",
                                "allianceName": existing_gov.get("allianceName") or ch_dict.get("AName") or ch_dict.get("AN") or prev_c.get("allianceName") or "",
                                "power": existing_gov.get("power") or prev_c.get("power") or 0,
                                "killPoints": existing_gov.get("killPoints") or prev_c.get("killPoints") or 0,
                                "cityHall": int(ch_dict.get("CastleLevel") or ch_dict.get("L") or existing_gov.get("cityHall") or 25),
                                "x": tx,
                                "y": ty,
                                "worldX": round(wx, 2),
                                "worldY": round(wy, 2),
                                "source": "BATTLE_REPORT_MAILCACHE",
                                "serverId": srv,
                                "originServerId": int(ch_dict.get("COSId") or ch_dict.get("CosId") or 0),
                                "timestamp": ts_sec,
                            }
                    else:
                        fkey = f"{tx}_{ty}"
                        if npc_bt == 6:
                            # Holy Site Guardian -> also record under Holy Sites if not present
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

    # Correlate Alliance Markers with Alliance Flags at the same (x, y) to identify R4 Flag Builder Cities
    markers_by_pos = {}
    for m_obj in alliance_markers.values():
        markers_by_pos[f"{m_obj['x']}_{m_obj['y']}"] = m_obj.get("author")

    for st_obj in alliance_structures.values():
        if st_obj.get("type") != "R4_BUILDER_CITY" and st_obj.get("builderX") and st_obj.get("builderY"):
            pos_key = f"{st_obj['x']}_{st_obj['y']}"
            author_name = markers_by_pos.get(pos_key)
            if author_name:
                st_obj["builderName"] = author_name
                r4_key = f"r4_{st_obj['builderX']}_{st_obj['builderY']}"
                if r4_key in alliance_structures:
                    alliance_structures[r4_key]["label"] = f"R4 Officer City: {author_name}"
                    alliance_structures[r4_key]["officerName"] = author_name
                # Also enrich governor city if author_name matches #4194 roster
                nm_key = str(author_name).strip().lower()
                if nm_key in roster_by_name and st_obj.get("serverId") == 3194:
                    gid, g_obj = roster_by_name[nm_key]
                    bx, by = st_obj["builderX"], st_obj["builderY"]
                    cities_by_gov[gid] = {
                        **(cities_by_gov.get(gid, {})),
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
                        "serverId": 3194,
                        "timestamp": st_obj.get("timestamp", 0),
                    }

    payload = {
        "updatedAt": "2026-10-23T13:05:00Z",
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

    # Back-fill any newly discovered governor coordinates into live_kingdom_telemetry.json
    if os.path.exists(TELEMETRY_PATH):
        try:
            raw_tel = json.load(open(TELEMETRY_PATH, "r", encoding="utf-8"))
            govs_4194 = raw_tel.get("kingdoms", {}).get("4194", {}).get("governors", {})
            updated_gov_coords = 0
            for gid, c_obj in cities_by_gov.items():
                if gid in govs_4194:
                    g = govs_4194[gid]
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
                print(f"Enriched {updated_gov_coords} #4194 roster governors with exact in-game (X, Y) coordinates!")
        except Exception as e:
            print("Telemetry backfill err:", e)

    with open(OUT_MAP_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print("Saved live_kingdom_map_entities.json!")
    print("Counts:", json.dumps(payload["counts"], indent=2))


if __name__ == "__main__":
    main()
