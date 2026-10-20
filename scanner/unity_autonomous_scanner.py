#!/usr/bin/env python3
"""
===============================================================================
UNITY AUTONOMOUS 35-FIELD TELEMETRY AGENT (NODE 2 EMULATOR CLUSTER -> UNITY)
File: E:\\Unity\\scanner\\unity_autonomous_scanner.py
Verified On: SIDEKICK (192.168.50.218) MuMu Player 12 (1600x900 @ 240 DPI)
===============================================================================
Captures ALL 35 Exact Fields per Governor via Hybrid ADB + Direct MuMuNxDevice
Lua Table Memory Extraction (Zero OCR Typos + Unlocks Hidden Power & Healed!):
  - Identity (8): id, name (UTF-8), alliance, allianceName, serverId, cityHall, vipLevel, civilization
  - Power Breakdown (6): power, highestPower, troopPower, buildingPower, techPower, commanderPower
  - Combat & Kills (17): killPoints, totalUnitsKilled, rangedPoints, dead, healedTroops,
    victories, defeats, scoutTimes, t1Kills..t5Kills, t1Kp..t5Kp
  - Economy & Support (3): gathered, assistance, helps
  - Career Telemetry (10): kvkHighestKp, kvkMostKills, kvkMostHealed, kvkMostDead, kvkCount,
    aooWins, aooLosses, aooLeaves, aooKillStocks, aooHighestScore
===============================================================================
"""

import os
import re
import sys
import io
import json
import time
import struct
import random
import ctypes
import ctypes.wintypes as wt
import argparse
import subprocess
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageOps
import numpy as np
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from rapidocr_onnxruntime import RapidOCR
    OCR_ENGINE = RapidOCR()
except ImportError:
    OCR_ENGINE = None

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
COORDS_FILE = os.path.join(SCRIPT_DIR, "rok_coordinates_1600x900.json")

CIV_NAMES = {
    1: "Rome",
    2: "Germany",
    3: "Britain",
    4: "France",
    5: "Spain",
    6: "China",
    7: "Japan",
    8: "Korea",
    9: "Arabia",
    10: "Ottoman",
    11: "Byzantium",
    12: "Vikings",
    14: "Egypt",
    15: "Greece",
    16: "Maya",
}

HASH_NAMES = {
    0x42810360: "govId",
    0x1231d4d3: "power",
    0x101786ad: "cityHall",
    0x1211eb7f: "vipLevel",
    0x913be88b: "civId",
    0x34d7f0ac: "serverId",
    0x6e31179d: "killPoints",
    0xbda820ff: "killPointsB",
    0x0074b362: "unitsKilled",
    0x54da7efa: "totalUnitsKilled",
    0x1e89dddc: "troopPower",
    0x23736388: "buildingPower",
    0xcf12bb74: "commanderPower",
    0xe6ce6b24: "techPower",
    0x1d5a7833: "rangedPoints",
    0x3b40ba29: "victories",
    0x6187ec4a: "scoutTimes",
    0x70172bbf: "highestPower",
    0x80861c5a: "defeats",
    0xaa61fd8c: "healedTroops",
    0xcd63e664: "dead",
    0x58e1ff62: "assistance",
    0x93df4bc2: "gathered",
    0x9c017191: "helps",
    0x007dc48b: "tierIndex",
    0x0074f9df: "kvkHighestKp",
    0x0c51ad9a: "kvkMostKills",
    0x15136460: "kvkMostHealed",
    0x397db12d: "kvkMostDead",
    0xc0d99b0d: "kvkCount",
    0x0051a2f9: "aooLeaves",
    0x7ca892b1: "aooWins",
    0x7cafd0f8: "aooLosses",
    0xaa54030a: "aooKillStocks",
    0xe1a2a665: "aooHighestScore",
}


class MEMORY_BASIC_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("BaseAddress", ctypes.c_void_p),
        ("AllocationBase", ctypes.c_void_p),
        ("AllocationProtect", wt.DWORD),
        ("PartitionId", wt.WORD),
        ("RegionSize", ctypes.c_size_t),
        ("State", wt.DWORD),
        ("Protect", wt.DWORD),
        ("Type", wt.DWORD),
    ]


def load_coords():
    with open(COORDS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_utf8_name_from_header(header_bytes: bytes) -> str:
    """
    Extracts exact UTF-8 Governor Name from the Lua table header preceding
    '{"avatar' or 'http://imimg.lilithcdn.com'.
    """
    idx = header_bytes.find(b'{"avatar')
    if idx == -1:
        idx = header_bytes.find(b"http://imimg")
    if idx <= 0:
        return ""

    window = header_bytes[max(0, idx - 64) : idx]
    kp_marker = window.rfind(b"\xff\x20\xa8\xbd")
    if kp_marker != -1:
        # Right after the 4-byte key hash 0xbda820ff is the governor's UTF-8 name!
        name_region = window[kp_marker + 4 :]
        # Try decoding prefixes of name_region from longest to shortest
        for end_pos in range(len(name_region), 1, -1):
            sub = name_region[:end_pos].rstrip(b"\x00")
            if len(sub) < 2:
                continue
            # If the last byte right before '{"avatar' was a 1-byte Lua tag (e.g. 'n' after 'krp\xc5n')
            try:
                txt = sub.decode("utf-8")
                if all(c.isprintable() for c in txt) and any(c.isalnum() for c in txt):
                    return txt.strip()
            except UnicodeDecodeError:
                continue

    # Fallback: scan null-separated chunks before idx
    parts = [p for p in window.split(b"\x00") if len(p) >= 2]
    for cand in reversed(parts):
        for trim_start in range(0, min(6, len(cand) - 1)):
            for trim_end in range(0, min(4, len(cand) - trim_start - 1)):
                sub = cand[trim_start : len(cand) - trim_end]
                try:
                    txt = sub.decode("utf-8").strip()
                    if len(txt) >= 2 and all(c.isprintable() for c in txt) and any(c.isalnum() for c in txt):
                        return txt
                except UnicodeDecodeError:
                    continue
    return ""


def parse_tier_and_more_block(block: bytes) -> dict:
    """Parses Healed, Dead, T1..T5 Kills & KP, RSS, Helps, KvK, AoO from a Lua table block."""
    res = {
        "healedTroops": 0,
        "dead": 0,
        "t1Kills": 0,
        "t2Kills": 0,
        "t3Kills": 0,
        "t4Kills": 0,
        "t5Kills": 0,
        "t1Kp": 0,
        "t2Kp": 0,
        "t3Kp": 0,
        "t4Kp": 0,
        "t5Kp": 0,
        "assistance": 0,
        "gathered": 0,
        "helps": 0,
        "kvkHighestKp": 0,
        "kvkMostKills": 0,
        "kvkMostHealed": 0,
        "kvkMostDead": 0,
        "kvkCount": 0,
        "aooLeaves": 0,
        "aooWins": 0,
        "aooLosses": 0,
        "aooKillStocks": 0,
        "aooHighestScore": 0,
    }
    pending_kills = None
    pending_tier_for_kp = None
    for off in range(0, len(block) - 16, 8):
        vl, vh, tg, k = struct.unpack_from("<4I", block, off)
        if (tg & 0x3F) != 0x32:
            continue
        val = vl + ((vh & 0xFFFF) << 32) if vh < 0x10000 else vl
        fname = HASH_NAMES.get(k)
        if not fname:
            continue
        if fname in res:
            res[fname] = val
        elif fname == "unitsKilled" and off >= 400:
            pending_kills = val
        elif fname == "tierIndex":
            tier = val
            if 1 <= tier <= 5:
                if pending_kills is not None:
                    res[f"t{tier}Kills"] = pending_kills
                    pending_kills = None
                else:
                    pending_tier_for_kp = tier
        elif fname == "killPointsB" and off >= 800:
            if pending_tier_for_kp is not None:
                res[f"t{pending_tier_for_kp}Kp"] = val
                pending_tier_for_kp = None
    return res


def extract_all_governors_from_ram(exclude_gov_ids=None) -> list:
    """
    Scans MuMuNxDevice.exe's Lua heap (MEM_PRIVATE | PAGE_READWRITE) and extracts
    all 35-field Governor records currently resident in memory.
    """
    if exclude_gov_ids is None:
        exclude_gov_ids = {236425783}  # Exclude our CH8 scout account lilfarmer by default

    PROCESS_QUERY_INFORMATION = 0x0400
    PROCESS_VM_READ = 0x0010
    MEM_COMMIT = 0x1000
    PAGE_READWRITE = 0x04
    MEM_PRIVATE = 0x20000

    k32 = ctypes.windll.kernel32
    k32.OpenProcess.argtypes = [wt.DWORD, wt.BOOL, wt.DWORD]
    k32.OpenProcess.restype = wt.HANDLE
    k32.VirtualQueryEx.argtypes = [wt.HANDLE, ctypes.c_void_p, ctypes.POINTER(MEMORY_BASIC_INFORMATION), ctypes.c_size_t]
    k32.VirtualQueryEx.restype = ctypes.c_size_t
    k32.ReadProcessMemory.argtypes = [wt.HANDLE, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
    k32.ReadProcessMemory.restype = wt.BOOL
    k32.CloseHandle.argtypes = [wt.HANDLE]

    out = subprocess.check_output('tasklist /FI "IMAGENAME eq MuMuNxDevice.exe"', shell=True).decode(errors="ignore")
    pids = re.findall(r"MuMuNxDevice\.exe\s+(\d+)", out)
    if not pids:
        raise RuntimeError("MuMuNxDevice.exe process not found!")
    pid = int(pids[0])
    h = k32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, pid)
    if not h:
        raise RuntimeError(f"Failed to open MuMuNxDevice.exe (PID {pid})")

    mbi = MEMORY_BASIC_INFORMATION()
    addr = 0x25000000000
    max_addr = 0x25500000000
    needle_troop = struct.pack("<I", 0x1e89dddc)
    needle_helps = struct.pack("<I", 0x9c017191)

    gov_by_id = {}
    detached_more_blocks = []

    try:
        while addr < max_addr and k32.VirtualQueryEx(h, ctypes.c_void_p(addr), ctypes.byref(mbi), ctypes.sizeof(mbi)):
            if (
                mbi.State == MEM_COMMIT
                and mbi.Protect == PAGE_READWRITE
                and mbi.Type == MEM_PRIVATE
                and mbi.RegionSize <= 16 * 1024 * 1024
            ):
                buf = ctypes.create_string_buffer(mbi.RegionSize)
                br = ctypes.c_size_t(0)
                if k32.ReadProcessMemory(h, ctypes.c_void_p(addr), buf, mbi.RegionSize, ctypes.byref(br)):
                    raw = buf.raw[: br.value]

                    # 1. Collect all AllianceHelps / Tier blocks
                    idx2 = raw.find(needle_helps)
                    while idx2 != -1:
                        if idx2 >= 12:
                            vl, vh, tg, k = struct.unpack_from("<4I", raw, idx2 - 12)
                            if (tg & 0x3F) == 0x32:
                                b_start = max(0, (idx2 - 12) - 1232)
                                b_end = min(len(raw), b_start + 1800)
                                parsed_b = parse_tier_and_more_block(raw[b_start:b_end])
                                detached_more_blocks.append(parsed_b)
                        idx2 = raw.find(needle_helps, idx2 + 4)

                    # 2. Collect all Governor TroopPower records
                    idx = raw.find(needle_troop)
                    while idx != -1:
                        if idx >= 12:
                            vl, vh, tg, k = struct.unpack_from("<4I", raw, idx - 12)
                            if (tg & 0x3F) == 0x32:
                                base_off = idx - 12
                                hdr_start = max(0, base_off - 720)
                                hdr = raw[hdr_start:base_off]
                                body = raw[base_off : min(len(raw), base_off + 1800)]

                                gov = {
                                    "govId": 0,
                                    "name": "",
                                    "alliance": "None",
                                    "allianceName": "",
                                    "serverId": 3194,
                                    "cityHall": 25,
                                    "vipLevel": 0,
                                    "civId": 0,
                                    "civilization": "Unknown",
                                    "power": 0,
                                    "highestPower": 0,
                                    "killPoints": 0,
                                    "totalUnitsKilled": 0,
                                    "troopPower": 0,
                                    "buildingPower": 0,
                                    "commanderPower": 0,
                                    "techPower": 0,
                                    "rangedPoints": 0,
                                    "victories": 0,
                                    "defeats": 0,
                                    "scoutTimes": 0,
                                }
                                for off in range(0, len(hdr) - 16, 8):
                                    v_l, v_h, t_g, k_h = struct.unpack_from("<4I", hdr, off)
                                    if (t_g & 0x3F) == 0x32 and k_h in HASH_NAMES:
                                        val = v_l + ((v_h & 0xFFFF) << 32) if v_h < 0x10000 else v_l
                                        fn = HASH_NAMES[k_h]
                                        if fn in gov:
                                            gov[fn] = val
                                for off in range(0, min(300, len(body) - 16), 8):
                                    v_l, v_h, t_g, k_h = struct.unpack_from("<4I", body, off)
                                    if (t_g & 0x3F) == 0x32 and k_h in HASH_NAMES:
                                        val = v_l + ((v_h & 0xFFFF) << 32) if v_h < 0x10000 else v_l
                                        fn = HASH_NAMES[k_h]
                                        if fn in gov:
                                            gov[fn] = val

                                calc_power = (
                                    gov["troopPower"]
                                    + gov["buildingPower"]
                                    + gov["commanderPower"]
                                    + gov["techPower"]
                                )
                                if gov["power"] == 0 or abs(gov["power"] - calc_power) > calc_power * 0.25:
                                    gov["power"] = calc_power
                                if gov["highestPower"] < gov["power"]:
                                    gov["highestPower"] = gov["power"]

                                gov["civilization"] = CIV_NAMES.get(gov["civId"], "China")
                                gov["name"] = extract_utf8_name_from_header(hdr)

                                # Extract Alliance Full Name & 4-char Tag
                                al_marker = hdr.find(b"\x93\xe6\xbb\x4e")
                                if al_marker != -1:
                                    al_slice = hdr[al_marker + 4 :]
                                    al_parts = [p for p in al_slice.split(b"\x00") if len(p) >= 2]
                                    if al_parts:
                                        gov["allianceName"] = al_parts[0].decode("utf-8", "ignore").strip()
                                tag_raw = hdr[-64:-60] if len(hdr) >= 64 else b""
                                tag_str = "".join(chr(b) for b in tag_raw if 32 <= b <= 126).strip()
                                if tag_str:
                                    gov["alliance"] = tag_str
                                    # Clean trailing tag if concatenated onto allianceName
                                    if gov["allianceName"].endswith(tag_str) and len(gov["allianceName"]) > len(tag_str):
                                        gov["allianceName"] = gov["allianceName"][: -len(tag_str)].strip()

                                more = parse_tier_and_more_block(body)
                                for mk, mv in more.items():
                                    if mv > 0 or mk not in gov:
                                        gov[mk] = mv

                                gid = gov["govId"]
                                if gid > 1000000 and gid not in exclude_gov_ids:
                                    gov["id"] = str(gid)
                                    if not gov["name"]:
                                        gov["name"] = f"Governor_{gid}"
                                    # Merge with any earlier record for same gid (keep non-zero values)
                                    if gid in gov_by_id:
                                        existing = gov_by_id[gid]
                                        for fk, fv in gov.items():
                                            if fv and (not existing.get(fk) or existing.get(fk) == "None" or existing.get(fk) == f"Governor_{gid}"):
                                                existing[fk] = fv
                                    else:
                                        gov_by_id[gid] = gov
                        idx = raw.find(needle_troop, idx + 4)
            addr = (mbi.BaseAddress or addr) + mbi.RegionSize
    finally:
        k32.CloseHandle(h)

    gov_list = list(gov_by_id.values())

    # Link any detached More Info block where t1..t5 kills == totalUnitsKilled or t1..t5 kp == killPoints
    for g in gov_list:
        sum_kills = g["t1Kills"] + g["t2Kills"] + g["t3Kills"] + g["t4Kills"] + g["t5Kills"]
        if sum_kills == 0 and g["totalUnitsKilled"] > 0:
            for b in detached_more_blocks:
                b_kills = b["t1Kills"] + b["t2Kills"] + b["t3Kills"] + b["t4Kills"] + b["t5Kills"]
                b_kp = b["t1Kp"] + b["t2Kp"] + b["t3Kp"] + b["t4Kp"] + b["t5Kp"]
                if b_kills == g["totalUnitsKilled"] or (g["killPoints"] > 0 and b_kp == g["killPoints"]):
                    for bk, bv in b.items():
                        if bv > 0 and g.get(bk, 0) == 0:
                            g[bk] = bv
                    break

    # Sort descending by power and assign rank
    gov_list.sort(key=lambda x: x.get("power", 0), reverse=True)
    for i, g in enumerate(gov_list, start=1):
        g["rank"] = i

    return gov_list


class AdbEmulatorDriver:
    """Non-invasive ADB bridge for a single 1600x900 Android Emulator instance."""

    def __init__(self, serial="127.0.0.1:16384", adb_bin=None, humanize=True):
        self.serial = serial
        self.humanize = humanize
        local_adb = os.path.join(SCRIPT_DIR, "platform-tools", "adb.exe")
        if adb_bin:
            self.adb_bin = adb_bin
        elif os.path.exists(local_adb):
            self.adb_bin = local_adb
        else:
            self.adb_bin = "adb"
        self._connect()

    def _connect(self):
        if ":" in self.serial:
            subprocess.run([self.adb_bin, "connect", self.serial], capture_output=True)

    def _jitter_coord(self, val, max_offset=4):
        if not self.humanize:
            return int(val)
        delta = int(round(random.gauss(0, 1.8)))
        delta = max(-max_offset, min(max_offset, delta))
        return int(val) + delta

    def _human_sleep(self, base_sec):
        if base_sec <= 0:
            return
        if not self.humanize:
            time.sleep(base_sec)
            return
        time.sleep(base_sec * random.uniform(0.88, 1.18))

    def tap(self, x, y, sleep_sec=0.45):
        jx = self._jitter_coord(x, max_offset=4)
        jy = self._jitter_coord(y, max_offset=4)
        subprocess.run(
            [self.adb_bin, "-s", self.serial, "shell", "input", "tap", str(jx), str(jy)],
            capture_output=True,
        )
        self._human_sleep(sleep_sec)

    def swipe(self, x1, y1, x2, y2, duration_ms=650, sleep_sec=0.65):
        jx1 = self._jitter_coord(x1, max_offset=5)
        jy1 = self._jitter_coord(y1, max_offset=3)
        jx2 = self._jitter_coord(x2, max_offset=5)
        jy2 = self._jitter_coord(y2, max_offset=3)
        jdur = int(duration_ms * random.uniform(0.90, 1.12)) if self.humanize else int(duration_ms)
        subprocess.run(
            [
                self.adb_bin,
                "-s",
                self.serial,
                "shell",
                "input",
                "swipe",
                str(jx1),
                str(jy1),
                str(jx2),
                str(jy2),
                str(jdur),
            ],
            capture_output=True,
        )
        self._human_sleep(sleep_sec)

    def screenshot(self) -> Image.Image:
        proc = subprocess.run(
            [self.adb_bin, "-s", self.serial, "exec-out", "screencap", "-p"],
            capture_output=True,
        )
        if proc.returncode != 0 or not proc.stdout:
            raise RuntimeError(f"ADB screencap failed on {self.serial}: {proc.stderr.decode('utf-8', 'ignore')}")
        img = Image.open(io.BytesIO(proc.stdout)).convert("RGB")
        if img.size != (1600, 900):
            img = img.resize((1600, 900), Image.Resampling.BILINEAR)
        return img


def parse_rok_binary(data: bytes) -> dict:
    """Decodes Lilith's 0x05 binary Lua table format from MuMu GLGData/com_lilithgame_roc_gp/doc/."""
    def read_val(pos: int):
        if pos >= len(data):
            return None, pos
        t = data[pos]
        pos += 1
        if t == 0x01:
            return bool(data[pos]), pos + 1
        elif t == 0x03:
            val = struct.unpack(">d", data[pos:pos + 8])[0]
            return (int(val) if val.is_integer() else round(val, 2)), pos + 8
        elif t == 0x04:
            slen = struct.unpack("<I", data[pos:pos + 4])[0]
            pos += 4
            return data[pos:pos + slen].decode("utf-8", errors="replace"), pos + slen
        elif t == 0x05:
            tbl = {}
            while pos < len(data) and data[pos] != 0xFF:
                k, pos = read_val(pos)
                if k is None or pos >= len(data):
                    break
                v, pos = read_val(pos)
                tbl[str(k)] = v
            if pos < len(data) and data[pos] == 0xFF:
                pos += 1
            return tbl, pos
        return None, len(data)

    if len(data) > 9 and data[9] == 0x05:
        res, _ = read_val(9)
        return res or {}
    return {}


MUMU_DOC_REMOTE = "/storage/emulated/0/Android/data/com.lilithgame.roc.gp/files/GLGData/com_lilithgame_roc_gp/doc"


def extract_mumu_binary_save_telemetry(adb_bin: str, serial: str = "127.0.0.1:16384") -> dict:
    """
    Pulls and decodes Lilith's 0x05 binary Lua tables directly from MuMu's Android container:
      /storage/emulated/0/Android/data/com.lilithgame.roc.gp/files/GLGData/com_lilithgame_roc_gp/doc/mailcache/
    Merges with any baseline seed in C:\\UnityScanner\\mailcache_baseline_seed.json.
    Returns dict keyed by integer Governor ID (PId).
    """
    sync_dir = os.path.join(SCRIPT_DIR, "mumu_doc_sync")
    mail_dir = os.path.join(sync_dir, "mailcache")
    os.makedirs(mail_dir, exist_ok=True)

    # Pull live mailcache and local_avatar from MuMu via ADB
    try:
        subprocess.run(
            [adb_bin, "-s", serial, "pull", f"{MUMU_DOC_REMOTE}/mailcache", sync_dir],
            capture_output=True,
            timeout=25,
        )
        subprocess.run(
            [adb_bin, "-s", serial, "pull", f"{MUMU_DOC_REMOTE}/local_avatar", os.path.join(sync_dir, "local_avatar")],
            capture_output=True,
            timeout=10,
        )
    except Exception as e:
        print(f"  [WARN] MuMu doc ADB pull warning: {e}")

    govs = {}
    # Load baseline mailcache seed if present
    seed_path = os.path.join(SCRIPT_DIR, "mailcache_baseline_seed.json")
    if os.path.exists(seed_path):
        try:
            with open(seed_path, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    pid = int(item.get("govId") or item.get("id") or 0)
                    if pid > 0:
                        govs[pid] = dict(item)
        except Exception:
            pass

    # Decode live MuMu Persistent.Mail.* binary files
    if os.path.exists(mail_dir):
        for mf in os.listdir(mail_dir):
            if not mf.startswith("Persistent.Mail."):
                continue
            fp = os.path.join(mail_dir, mf)
            try:
                with open(fp, "rb") as f:
                    doc = parse_rok_binary(f.read())
                content = doc.get("body", {}).get("content", {})
                if not isinstance(content, dict):
                    continue
                for ck in ("SelfChar", "CIdt"):
                    ch = content.get(ck, {})
                    if isinstance(ch, dict) and ch.get("PId") and int(ch["PId"]) > 0:
                        pid = int(ch["PId"])
                        cur = govs.get(pid, {"id": str(pid), "govId": pid, "ralliesLed": 0, "ralliesJoined": 0})
                        cur["ralliesLed"] = int(cur.get("ralliesLed") or 0) + 1
                        if ch.get("PName"):
                            cur["name"] = ch["PName"]
                        if ch.get("Abbr"):
                            cur["alliance"] = ch["Abbr"]
                        if ch.get("AName"):
                            cur["allianceName"] = ch["AName"]
                        if ch.get("CastleLevel"):
                            cur["cityHall"] = int(ch["CastleLevel"])
                        if ch.get("CastlePos"):
                            cur["castlePos"] = ch["CastlePos"]
                        if ch.get("COSId"):
                            cur["internalServerId"] = int(ch["COSId"])
                        if ch.get("HId"):
                            hss = ch.get("HSS", {})
                            skills = (
                                "-".join(str(hss.get(str(i), {}).get("SkillLevel", 0)) for i in range(1, 5))
                                if isinstance(hss, dict) and hss
                                else ""
                            )
                            cur["primaryCommander"] = {
                                "id": ch.get("HId"),
                                "level": ch.get("HLv"),
                                "star": ch.get("HSt"),
                                "skills": skills,
                            }
                        if ch.get("HId2"):
                            hss2 = ch.get("HSS2", {})
                            skills2 = (
                                "-".join(str(hss2.get(str(i), {}).get("SkillLevel", 0)) for i in range(1, 5))
                                if isinstance(hss2, dict) and hss2
                                else ""
                            )
                            cur["secondaryCommander"] = {
                                "id": ch.get("HId2"),
                                "level": ch.get("HLv2"),
                                "star": ch.get("HSt2"),
                                "skills": skills2,
                            }
                        if ch.get("HEq") and ch.get("HEq") != "{}":
                            cur["equippedGear"] = ch["HEq"]
                        if ch.get("Udid"):
                            cur["udid"] = ch["Udid"]
                        if ch.get("AppUid"):
                            cur["appUid"] = ch["AppUid"]
                        if ch.get("PkgNameNew"):
                            cur["clientPlatform"] = ch["PkgNameNew"]
                        govs[pid] = cur
                for tk in ("STs", "OTs"):
                    ts = content.get(tk, {})
                    if isinstance(ts, dict):
                        for _, j in ts.items():
                            if isinstance(j, dict) and j.get("PId") and int(j["PId"]) > 0:
                                pid = int(j["PId"])
                                cur = govs.get(pid, {"id": str(pid), "govId": pid, "ralliesLed": 0, "ralliesJoined": 0})
                                cur["ralliesJoined"] = int(cur.get("ralliesJoined") or 0) + 1
                                if j.get("PName") and not cur.get("name"):
                                    cur["name"] = j["PName"]
                                if j.get("Abbr") and not cur.get("alliance"):
                                    cur["alliance"] = j["Abbr"]
                                if j.get("HId") and not cur.get("primaryCommander"):
                                    cur["primaryCommander"] = {"id": j.get("HId"), "level": j.get("HLv")}
                                if j.get("HId2") and not cur.get("secondaryCommander"):
                                    cur["secondaryCommander"] = {"id": j.get("HId2"), "level": j.get("HLv2")}
                                govs[pid] = cur
            except Exception:
                pass

    return govs


def merge_ram_and_mumu_save_telemetry(ram_govs: list, save_govs_by_id: dict) -> list:
    """
    Fuses 35-field MuMu Lua RAM telemetry with 10-field MuMu doc/mailcache binary save telemetry
    into a unified 45-field Governor roster.
    """
    merged_by_id = {}
    for g in ram_govs:
        pid = int(g.get("govId") or g.get("id") or 0)
        if pid <= 0:
            continue
        rec = dict(g)
        s = save_govs_by_id.get(pid)
        if s:
            for k in (
                "castlePos",
                "ralliesLed",
                "ralliesJoined",
                "primaryCommander",
                "secondaryCommander",
                "equippedGear",
                "udid",
                "appUid",
                "clientPlatform",
                "internalServerId",
            ):
                if s.get(k) is not None:
                    rec[k] = s[k]
            if not rec.get("allianceName") and s.get("allianceName"):
                rec["allianceName"] = s["allianceName"]
        rec["telemetrySource"] = "MUMU_45_FIELD_RAM_AND_SAVE" if s else "MUMU_35_FIELD_RAM"
        merged_by_id[pid] = rec

    # Include mailcache-discovered governors not yet tapped on the Top-N leaderboard
    for pid, s in save_govs_by_id.items():
        if pid not in merged_by_id and s.get("name"):
            merged_by_id[pid] = {
                "id": str(pid),
                "govId": pid,
                "name": s.get("name", f"Governor_{pid}"),
                "alliance": s.get("alliance", "None"),
                "allianceName": s.get("allianceName", ""),
                "power": int(s.get("power") or 0),
                "highestPower": int(s.get("highestPower") or 0),
                "troopPower": int(s.get("troopPower") or 0),
                "techPower": int(s.get("techPower") or 0),
                "buildingPower": int(s.get("buildingPower") or 0),
                "commanderPower": int(s.get("commanderPower") or 0),
                "killPoints": int(s.get("killPoints") or 0),
                "dead": int(s.get("dead") or 0),
                "healedTroops": int(s.get("healedTroops") or 0),
                "gathered": int(s.get("gathered") or 0),
                "assistance": int(s.get("assistance") or 0),
                "helps": int(s.get("helps") or 0),
                "cityHall": int(s.get("cityHall") or 21),
                "vipLevel": int(s.get("vipLevel") or 0),
                "civilization": s.get("civilization", "Unknown"),
                "castlePos": s.get("castlePos"),
                "ralliesLed": int(s.get("ralliesLed") or 0),
                "ralliesJoined": int(s.get("ralliesJoined") or 0),
                "primaryCommander": s.get("primaryCommander"),
                "secondaryCommander": s.get("secondaryCommander"),
                "equippedGear": s.get("equippedGear"),
                "udid": s.get("udid"),
                "appUid": s.get("appUid"),
                "clientPlatform": s.get("clientPlatform"),
                "internalServerId": s.get("internalServerId", 3194),
                "telemetrySource": "MUMU_BINARY_MAILCACHE",
            }

    final_list = list(merged_by_id.values())
    final_list.sort(
        key=lambda x: (
            x.get("power", 0),
            (x.get("ralliesLed", 0) + x.get("ralliesJoined", 0)),
        ),
        reverse=True,
    )
    for idx, item in enumerate(final_list, start=1):
        item["rank"] = idx
    return final_list


CLOUD_UNITY_URL = os.environ.get("UNITY_CLOUD_URL", "https://unity-v2-azure.vercel.app")


def push_batch_to_unity(unity_url: str, scanner_key: str, payload: dict):
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "x-unity-scanner-key": scanner_key,
    }
    body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    target_urls = [f"{CLOUD_UNITY_URL.rstrip('/')}/api/ingest/kingdom-scan"]
    if unity_url and not unity_url.startswith(CLOUD_UNITY_URL):
        target_urls.append(unity_url)

    for url in target_urls:
        try:
            resp = requests.post(url, headers=headers, data=body_bytes, timeout=20)
            if resp.ok:
                data = resp.json()
                print(f"  [UNITY 45-FIELD SYNC -> {url}] {data.get('message', 'OK')}")
            else:
                print(f"  [WARN] Unity Ingest ({url}) HTTP {resp.status_code}: {resp.text[:160]}")
        except Exception as e:
            if "192.168." not in url and "127.0.0.1" not in url:
                print(f"  [WARN] Cloud Ingest ({url}) unreachable: {e}")



def run_ram_dump(args):
    driver = AdbEmulatorDriver(serial=args.adb)
    t0 = time.time()
    ram_govs = extract_all_governors_from_ram()
    save_govs = extract_mumu_binary_save_telemetry(driver.adb_bin, args.adb)
    merged_govs = merge_ram_and_mumu_save_telemetry(ram_govs, save_govs)
    elapsed = time.time() - t0
    print(
        f"Extracted {len(ram_govs)} 35-field RAM governors + {len(save_govs)} MuMu binary save/mailcache governors "
        f"-> {len(merged_govs)} unified 45-field governors in {elapsed:.2f}s:"
    )
    for g in merged_govs[:18]:
        pos_str = f" @ ({g['castlePos'].get('X')},{g['castlePos'].get('Y')})" if isinstance(g.get("castlePos"), dict) else ""
        cmdr_str = (
            f" | Cmdr: #{g['primaryCommander'].get('id')}(Lv{g['primaryCommander'].get('level')} {g['primaryCommander'].get('skills','')})"
            if isinstance(g.get("primaryCommander"), dict)
            else ""
        )
        print(
            f"  [#{g['rank']:02d}] {g['name']} (ID: {g['id']}) [{g.get('alliance','')}]{pos_str} | "
            f"CH{g.get('cityHall',0)} VIP{g.get('vipLevel',0)} {g.get('civilization','')} | "
            f"Pwr: {g.get('power',0):,} (Troop: {g.get('troopPower',0):,}, Tech: {g.get('techPower',0):,}) | "
            f"KP: {g.get('killPoints',0):,} | Rallies: {g.get('ralliesLed',0)}L/{g.get('ralliesJoined',0)}J{cmdr_str}"
        )
    if args.push and merged_govs:
        scan_date_iso = args.scan_date or datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
        ingest_url = f"{args.unity_url.rstrip('/')}/api/ingest/kingdom-scan"
        push_batch_to_unity(
            ingest_url,
            args.scanner_key,
            {
                "kingdomId": str(args.kd),
                "scanDateOverride": scan_date_iso,
                "progress": {
                    "currentRank": len(ram_govs),
                    "targetRank": args.end_rank,
                    "workerSerial": args.adb,
                    "mode": "MUMU_45_FIELD_UNIFIED_RAM_AND_SAVE",
                },
                "rosterArray": merged_govs,
            },
        )


PROGRESS_FILE = os.path.join(SCRIPT_DIR, "scan_progress.json")
HUB_URL = os.environ.get("UNITY_HUB_URL", "http://192.168.50.41:8888")


def write_scan_progress(payload):
    try:
        payload["pid"] = os.getpid()
        payload["updatedAt"] = datetime.now(timezone.utc).isoformat()
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass
    try:
        requests.post(f"{HUB_URL}/scan-progress", json=payload, timeout=1.5)
    except Exception:
        pass


def kill_other_scanner_instances():
    """Ensures only a single unity_autonomous_scanner.py process can run at a time."""
    my_pid = os.getpid()
    ps_cmd = (
        f"Get-CimInstance Win32_Process -Filter \"Name = 'python.exe'\" -ErrorAction SilentlyContinue | "
        f"Where-Object {{ $_.ProcessId -ne {my_pid} -and $_.CommandLine -like '*unity_autonomous_scanner*' }} | "
        f"ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}"
    )
    try:
        subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, timeout=4)
    except Exception:
        pass


def get_screen_ocr_text(driver) -> str:
    """Captures a screenshot and returns all uppercase OCR text on screen."""
    if OCR_ENGINE is None:
        return ""
    try:
        img = driver.screenshot()
        res, _ = OCR_ENGINE(np.array(img))
        if not res:
            return ""
        return " | ".join([item[1].strip().upper() for item in res])
    except Exception as e:
        print(f"  [WARN] OCR check failed: {e}")
        return ""


def ensure_individual_power_leaderboard_open(driver, target_kd: str, skip_switch: bool = False) -> bool:
    """
    Guarantees the emulator is on the target kingdom character AND that the
    INDIVIDUAL POWER RANKINGS modal is open before any row taps begin.
    """
    screen_txt = get_screen_ocr_text(driver)
    if skip_switch and "INDIVIDUAL POWER RANKINGS" in screen_txt:
        return True

    if not skip_switch:
        prov_script = os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py")
        if os.path.exists(prov_script):
            print(f"  [PREAMBLE] Verifying / switching active character to Kingdom #{target_kd}...")
            subprocess.run(
                [sys.executable, prov_script, "--mode", "switch", "--kingdom", str(target_kd), "--adb", driver.serial],
                timeout=90,
                check=False,
            )

    for attempt in range(1, 4):
        screen_txt = get_screen_ocr_text(driver)
        if "INDIVIDUAL POWER RANKINGS" in screen_txt:
            print(f"  [PREAMBLE] Verified INDIVIDUAL POWER RANKINGS is open (attempt {attempt}).")
            return True

        if "ALLIANCE POWER" in screen_txt and "INDIVIDUAL POWER" in screen_txt:
            print("  [PREAMBLE] On Rankings 9-card menu -> tapping Individual Power (380, 560)...")
            driver.tap(380, 560, sleep_sec=2.2)
            if "INDIVIDUAL POWER RANKINGS" in get_screen_ocr_text(driver):
                return True

        print(f"  [PREAMBLE] Navigating HUD -> Avatar (45,45) -> Rankings -> Individual Power (attempt {attempt})...")
        for _ in range(3):
            subprocess.run([driver.adb_bin, "-s", driver.serial, "shell", "input", "keyevent", "4"], capture_output=True)
            time.sleep(0.7)

        driver.tap(45, 45, sleep_sec=2.2)
        prof_txt = get_screen_ocr_text(driver)
        rank_x = 475 if "ACHIEVEMENTS" in prof_txt else 530
        driver.tap(rank_x, 755, sleep_sec=2.2)
        driver.tap(380, 560, sleep_sec=2.4)

        if "INDIVIDUAL POWER RANKINGS" in get_screen_ocr_text(driver):
            print("  [PREAMBLE] Verified INDIVIDUAL POWER RANKINGS is open!")
            return True

    print("  [ERROR] Could not verify INDIVIDUAL POWER RANKINGS modal after 3 attempts; aborting scan to prevent misclicks.")
    return False


def run_kingdom_scan(args):
    kill_other_scanner_instances()
    driver = AdbEmulatorDriver(serial=args.adb)
    scan_date_iso = args.scan_date or datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
    ingest_url = f"{args.unity_url.rstrip('/')}/api/ingest/kingdom-scan"
    started_at_iso = datetime.now(timezone.utc).isoformat()
    t_start = time.time()

    print("==================================================================")
    print(f"  UNITY 45-FIELD MUMU RAM + BINARY SAVE SCANNER | KD #{args.kd} | Ranks {args.start_rank}..{args.end_rank}")
    print(f"  ADB Emulator: {args.adb} | Scan ID: {scan_date_iso}")
    print("==================================================================")

    first_rows_y = [315, 430, 545, 660, 775]
    settled_y = 775
    last_gov_name = "Preparing Leaderboard..."
    last_gov_power = 0
    total_extracted = 0

    write_scan_progress({
        "running": True,
        "status": "PREPARING_LEADERBOARD",
        "kingdom": str(args.kd),
        "currentRank": 0,
        "targetRanks": args.end_rank,
        "percent": 0.0,
        "lastGovernorName": f"Switching to #{args.kd} & opening Individual Power Rankings...",
        "lastGovernorPower": 0,
        "governorsExtracted": 0,
        "startedAt": started_at_iso,
        "etaSeconds": int((args.end_rank - args.start_rank + 1) * 3.1),
        "workerSerial": args.adb,
    })

    if not ensure_individual_power_leaderboard_open(driver, str(args.kd), skip_switch=getattr(args, "skip_switch", False)):
        write_scan_progress({
            "running": False,
            "status": "LEADERBOARD_NAV_FAILED",
            "kingdom": str(args.kd),
            "currentRank": 0,
            "targetRanks": args.end_rank,
            "percent": 0.0,
            "lastGovernorName": f"Could not open Individual Power Rankings on #{args.kd}",
            "lastGovernorPower": 0,
            "governorsExtracted": 0,
            "startedAt": started_at_iso,
            "etaSeconds": 0,
            "workerSerial": args.adb,
        })
        return

    for rank in range(args.start_rank, args.end_rank + 1):
        ry = first_rows_y[rank - 1] if rank <= 5 else settled_y
        print(f"  -> Stepping Rank #{rank} (y={ry})...")
        driver.tap(600, ry, sleep_sec=0.58)
        driver.tap(240, 755, sleep_sec=0.58)
        driver.tap(1395, 55, sleep_sec=0.42)
        driver.tap(1415, 100, sleep_sec=0.48)

        if rank >= 5:
            driver.swipe(600, 780, 600, 665, duration_ms=550, sleep_sec=0.55)

        elapsed = max(1.0, time.time() - t_start)
        done_steps = max(1, rank - args.start_rank + 1)
        avg_sec = elapsed / done_steps
        rem_steps = max(0, args.end_rank - rank)
        pct = round((rank / max(1, args.end_rank)) * 100, 1)

        if rank % 10 == 0 or rank == args.end_rank or rank == 1:
            if rank < args.end_rank and "INDIVIDUAL POWER" not in get_screen_ocr_text(driver):
                print(f"  [SELF-HEAL @ Rank #{rank}] Leaderboard modal out of focus; restoring INDIVIDUAL POWER RANKINGS...")
                ensure_individual_power_leaderboard_open(driver, str(args.kd), skip_switch=True)
            ram_govs = extract_all_governors_from_ram()
            save_govs = extract_mumu_binary_save_telemetry(driver.adb_bin, args.adb)
            merged_govs = merge_ram_and_mumu_save_telemetry(ram_govs, save_govs)
            total_extracted = len(merged_govs)
            if merged_govs:
                top_latest = merged_govs[min(rank - 1, len(merged_govs) - 1)]
                last_gov_name = top_latest.get("name", last_gov_name)
                last_gov_power = top_latest.get("power", last_gov_power)
            print(
                f"  [MUMU 45-FIELD SWEEP @ Rank #{rank}] {len(ram_govs)} RAM + {len(save_govs)} Save -> {len(merged_govs)} governors!"
            )
            if merged_govs and (rank % 10 == 0 or rank == args.end_rank):
                push_batch_to_unity(
                    ingest_url,
                    args.scanner_key,
                    {
                        "kingdomId": str(args.kd),
                        "scanDateOverride": scan_date_iso,
                        "progress": {
                            "currentRank": rank,
                            "targetRank": args.end_rank,
                            "workerSerial": args.adb,
                            "mode": "MUMU_45_FIELD_UNIFIED_RAM_AND_SAVE",
                        },
                        "rosterArray": merged_govs,
                    },
                )

        write_scan_progress({
            "running": True,
            "status": "SCANNING_LIVE",
            "kingdom": str(args.kd),
            "currentRank": rank,
            "targetRanks": args.end_rank,
            "percent": pct,
            "lastGovernorName": last_gov_name,
            "lastGovernorPower": last_gov_power,
            "governorsExtracted": total_extracted,
            "startedAt": started_at_iso,
            "etaSeconds": int(rem_steps * avg_sec),
            "workerSerial": args.adb,
        })

    write_scan_progress({
        "running": False,
        "status": "COMPLETED",
        "kingdom": str(args.kd),
        "currentRank": args.end_rank,
        "targetRanks": args.end_rank,
        "percent": 100.0,
        "lastGovernorName": last_gov_name,
        "lastGovernorPower": last_gov_power,
        "governorsExtracted": total_extracted,
        "startedAt": started_at_iso,
        "etaSeconds": 0,
        "workerSerial": args.adb,
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unity Autonomous 45-Field MuMu RAM + Binary Save Telemetry Scanner")
    parser.add_argument("--mode", choices=["ram-dump", "kingdom-scan"], default="kingdom-scan")
    parser.add_argument("--adb", default="127.0.0.1:16384", help="ADB serial")
    parser.add_argument("--kd", "--kingdom", dest="kd", default="4194", help="Target Kingdom ID")
    parser.add_argument("--start-rank", type=int, default=1)
    parser.add_argument("--end-rank", "--max-ranks", dest="end_rank", type=int, default=650)
    parser.add_argument("--scan-date", default=None)
    parser.add_argument("--push", action="store_true", default=True, help="Push extracted 45-field governors to Unity API")
    parser.add_argument("--unity-url", default=os.environ.get("UNITY_URL", "http://192.168.50.41:3000"))
    parser.add_argument("--scanner-key", default=os.environ.get("UNITY_SCANNER_KEY", "unity-local-node2-telemetry"))
    parser.add_argument("--skip-switch", action="store_true", default=False, help="Skip character switch if already on target kingdom")
    args = parser.parse_args()

    if args.mode == "ram-dump":
        run_ram_dump(args)
    elif args.mode == "kingdom-scan":
        run_kingdom_scan(args)


