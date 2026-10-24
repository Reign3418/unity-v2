#!/usr/bin/env python3
"""
extract_rok_locales.py — Valheon Sovereign Canonical Localization Extractor
───────────────────────────────────────────────────────────────────────────
Extracts 100% official Rise of Kingdoms localized string tables from
`MASS_Data/StreamingAssets/lc_*.dat` across all 17 Unity locales:
  en, vi, ar, ru, zh (cn), es, id (in), ko (kr), tr, fr, de, pt,
  ja (jp), it, pl, th, ms

Outputs:
  1. `src/data/rok_canonical_glossary.json` (Commanders, Equipment, Lyceum/Quiz, Core Terms)
  2. Enriches `src/data/rok_commander_ids.json` with `locales` dictionary while preserving backwards compatibility.
"""

import json
import os
import re
import struct
import sys
import zipfile

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

ROK_STREAMING_ASSETS = r"C:\Program Files (x86)\Rise of Kingdoms\Rise of Kingdoms Game\MASS_Data\StreamingAssets"
UNITY_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_GLOSSARY = os.path.join(UNITY_ROOT, "src", "data", "rok_canonical_glossary.json")
OUT_CMDR_IDS = os.path.join(UNITY_ROOT, "src", "data", "rok_commander_ids.json")

UNITY_TO_LILITH = {
    "en": "en",
    "vi": "vi",
    "ar": "ar",
    "ru": "ru",
    "zh": "cn",
    "es": "es",
    "id": "in",
    "ko": "kr",
    "tr": "tr",
    "fr": "fr",
    "de": "de",
    "pt": "pt",
    "ja": "jp",
    "it": "it",
    "pl": "pl",
    "th": "th",
    "ms": "ms",
}

UNITY_TAG_RE = re.compile(r"</?(?:color|size)[^>]*>", re.IGNORECASE)


def clean_lilith_str(val: str) -> str:
    if not val:
        return ""
    s = UNITY_TAG_RE.sub("", val)
    s = s.replace("\u00a0", " ").replace("\r\n", "\n").strip()
    return s


def read_lc_archive(dat_filename: str) -> dict:
    path = os.path.join(ROK_STREAMING_ASSETS, dat_filename)
    prefix = dat_filename.replace("lc_", "").replace(".dat", "")
    with zipfile.ZipFile(path, "r") as zf:
        idx_raw = zf.read(f"{prefix}.idx")
        xor_key = idx_raw[3]
        idx_dec = bytes(b ^ xor_key for b in idx_raw)

        keys = []
        pos = 2
        while pos + 2 <= len(idx_dec):
            ln = struct.unpack_from("<H", idx_dec, pos)[0]
            pos += 2
            keys.append(idx_dec[pos : pos + ln].decode("utf-8", errors="replace"))
            pos += ln

        result = {k: {} for k in keys}
        for unity_loc, lilith_loc in UNITY_TO_LILITH.items():
            bin_name = f"{prefix}_{lilith_loc}.bin"
            if bin_name not in zf.namelist():
                continue
            raw = zf.read(bin_name)
            dec = bytes(b ^ xor_key for b in raw)
            pos = 2
            for i in range(len(keys)):
                if pos + 2 > len(dec):
                    break
                ln = struct.unpack_from("<H", dec, pos)[0]
                pos += 2
                if pos + ln > len(dec):
                    break
                val = dec[pos : pos + ln].decode("utf-8", errors="replace")
                result[keys[i]][unity_loc] = clean_lilith_str(val)
                pos += ln
    return result


def main():
    print("⚡ Extracting canonical 17-language tables from Rise of Kingdoms client...")
    hero_tbl = read_lc_archive("lc_hero.dat")
    equip_tbl = read_lc_archive("lc_equipment.dat")
    quiz_tbl = read_lc_archive("lc_quiz.dat")
    civ_tbl = read_lc_archive("lc_civpedia.dat")
    form_tbl = read_lc_archive("lc_formation.dat")

    # 1. Build Commanders Map (by ID and by normalized English name)
    # Prime Commander IDs in lc_hero.dat:
    # 140 = Scipio Africanus Prime, 146 = Boudica Prime, 148 = Joan of Arc Prime, 187 = Hermann Prime
    PRIME_IDS = {"140", "146", "148", "187"}
    PRIME_SUFFIX = {
        "en": "Prime",
        "vi": "Prime",
        "ar": "برايم",
        "ru": "Прайм",
        "zh": "（SP）",
        "es": "Prime",
        "id": "Prime",
        "ko": "(프라임)",
        "tr": "Prime",
        "fr": "Prime",
        "de": "Prime",
        "pt": "Prime",
        "ja": "（覚醒）",
        "it": "Prime",
        "pl": "Prime",
        "th": "ไพรม์",
        "ms": "Prime",
    }

    commanders_by_id = {}
    commanders_by_en = {}

    for k, locs in hero_tbl.items():
        m = re.match(r"^NAME_(\d+)$", k)
        if not m:
            continue
        cid = m.group(1)
        en_name = locs.get("en", "").strip()
        if not en_name or "Test" in en_name:
            continue
        title_locs = hero_tbl.get(f"TITLE_{cid}", {})

        is_prime = cid in PRIME_IDS
        localized_names = {}
        for u_loc in UNITY_TO_LILITH:
            base_nm = locs.get(u_loc) or en_name
            if is_prime:
                sfx = PRIME_SUFFIX.get(u_loc, "Prime")
                localized_names[u_loc] = f"{base_nm}{sfx}" if sfx.startswith(("（", "(")) else f"{base_nm} {sfx}"
            else:
                localized_names[u_loc] = base_nm

        canonical_en = f"{en_name} Prime" if is_prime else en_name
        commanders_by_id[cid] = {
            "id": int(cid),
            "name": canonical_en,
            "title": title_locs.get("en", ""),
            "names": localized_names,
            "titles": {u_loc: title_locs.get(u_loc, title_locs.get("en", "")) for u_loc in UNITY_TO_LILITH},
        }
        commanders_by_en[canonical_en.lower()] = localized_names

    # Add common shorthand / colloquial aliases for Commanders
    CMDR_ALIASES = {
        "bjorn ironside": "björn ironside",
        "nevsky": "alexander nevsky",
        "ysg": "yi seong-gye",
        "mina": "minamoto no yoshitsune",
        "alex": "alexander the great",
        "edward": "edward of woodstock",
        "scipio prime": "scipio africanus prime",
        "joan prime": "joan of arc prime",
    }
    for alias, target in CMDR_ALIASES.items():
        if target in commanders_by_en:
            commanders_by_en[alias] = commanders_by_en[target]

    # 2. Build Equipment Map (by ID and by normalized English name)
    equipment_by_en = {}
    for k, locs in equip_tbl.items():
        if not re.match(r"^N_\d+$", k):
            continue
        en_name = locs.get("en", "").strip()
        if not en_name:
            continue
        equipment_by_en[en_name.lower()] = {u_loc: locs.get(u_loc) or en_name for u_loc in UNITY_TO_LILITH}

    # Add colloquial EquipmentGuide aliases -> Official Lilith Equipment names
    EQUIP_ALIASES = {
        "bow of the dragon's breath": "dragon's breath bow",
        "helm of the dragon's breath": "dragon's breath helm",
        "robes of the dragon's breath": "dragon's breath plate",
        "bracers of the dragon's breath": "dragon's breath vambraces",
        "legguards of the dragon's breath": "dragon's breath tassets",
        "boots of the dragon's breath": "dragon's breath boots",
        "helm of the eternal empire": "gold helm of the eternal empire",
        "eternal empire greaves": "greaves of the eternal empire",
        "eternal empire stompers": "sturdy boots of the eternal empire",
        "helm of the hellish wasteland": "war helm of the hellish wasteland",
        "revival wings": "revival plate",
        "revival bracers": "revival gauntlets",
        "revival boots": "revival greaves",
        "cloud striders": "cloud racers",
        "flame greaves": "flame treads",
        "flame dragon's bow": "blazing axe",
        "plate greaves": "milanese plate",
        "cloth boots": "sturdy boots",
        "wind scar": "wind scars",
        "stiletto / staff of the lost": "staff of the lost",
    }
    for alias, target in EQUIP_ALIASES.items():
        if target in equipment_by_en:
            equipment_by_en[alias] = equipment_by_en[target]

    # 3. Extract Official Lyceum of Wisdom (`lc_quiz.dat`) & Core UI Terms
    QUIZ_KEYS = [
        "COMMONQUIZ_TITLE",
        "SPECIALQUIZ_TITLE",
        "LASTQUIZ_TITLE",
        "MINIMIZ_PROGRESS_TITLE",
        "CALENDAR_TITLE",
        "RULE_TITLE",
        "COMMONQUIZ_TIME_TITLE",
        "SPECIALQUIZ_TIME_TITLE",
        "LASTQUIZ_TIME_TITLE",
        "SUCCED_DESC",
        "ANSWER_TIME_REMAIN",
        "WAIT_TIME",
        "SHARE_TITLE",
        "SHARE_CONTEXT",
        "PLAYER_NUMBER_TITLE",
    ]
    lyceum_terms = {k: quiz_tbl[k] for k in QUIZ_KEYS if k in quiz_tbl}

    HERO_UI_KEYS = [
        "HERO",
        "RARE_1",
        "RARE_2",
        "RARE_3",
        "RARE_4",
        "RARE_5",
        "TITLE_STAR",
        "TITLE_LEVEL",
        "TITLE_NAME",
        "TITLE_RARE",
        "MY_HERO",
        "MARCH_CAPACITY",
        "SKILL",
        "UPGRADE",
    ]
    ui_terms = {k: hero_tbl[k] for k in HERO_UI_KEYS if k in hero_tbl}

    # 4. Extract Civilization Pedia Questions (`lc_civpedia.dat`) across all 17 languages
    civpedia_questions = []
    for k, locs in civ_tbl.items():
        if k.endswith("_QUESTION") and locs.get("en"):
            title_k = k.replace("_QUESTION", "_TITLE")
            desc_k = k.replace("_QUESTION", "_DESC")
            civpedia_questions.append({
                "id": k,
                "question": locs,
                "title": civ_tbl.get(title_k, {}),
                "summary": {u: (civ_tbl.get(desc_k, {}).get(u, "")[:180]) for u in UNITY_TO_LILITH},
            })

    glossary = {
        "schema_version": "1.0.0",
        "source": "Rise of Kingdoms Official StreamingAssets (lc_hero.dat, lc_equipment.dat, lc_quiz.dat, lc_civpedia.dat)",
        "supported_locales": list(UNITY_TO_LILITH.keys()),
        "unity_to_lilith_locale": UNITY_TO_LILITH,
        "ui_terms": ui_terms,
        "lyceum_terms": lyceum_terms,
        "commanders": commanders_by_en,
        "equipment": equipment_by_en,
        "civpedia_entries": civpedia_questions[:60],
    }

    with open(OUT_GLOSSARY, "w", encoding="utf-8") as f:
        json.dump(glossary, f, ensure_ascii=False, indent=2)

    # Also update rok_commander_ids.json while keeping backwards compatibility
    if os.path.isfile(OUT_CMDR_IDS):
        with open(OUT_CMDR_IDS, "r", encoding="utf-8") as f:
            existing_cmdrs = json.load(f)
        for cid, cobj in existing_cmdrs.items():
            if cid in commanders_by_id:
                cobj["names"] = commanders_by_id[cid]["names"]
                cobj["titles"] = commanders_by_id[cid]["titles"]
        with open(OUT_CMDR_IDS, "w", encoding="utf-8") as f:
            json.dump(existing_cmdrs, f, ensure_ascii=False, indent=2)

    print(f"✅ Wrote {OUT_GLOSSARY}")
    print(f"   • Commanders indexed : {len(commanders_by_en)} (across 17 locales)")
    print(f"   • Equipment indexed  : {len(equipment_by_en)} (across 17 locales)")
    print(f"   • Lyceum UI strings  : {len(lyceum_terms)} (across 17 locales)")
    print(f"   • CivPedia entries   : {len(civpedia_questions[:60])} (across 17 locales)")


if __name__ == "__main__":
    main()
