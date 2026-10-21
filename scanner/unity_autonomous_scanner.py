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


def decode_clean_lua_slot(raw_bytes: bytes, is_governor_name: bool = False) -> str:
    """
    Decodes a UTF-8 string from a Lua 8/16-byte inline buffer from left to right,
    stopping immediately at the first null byte, invalid UTF-8 sequence, control char,
    illegal RoK name symbol, or binary pointer tail.
    """
    had_null = b"\x00" in raw_bytes
    chunk = raw_bytes.split(b"\x00", 1)[0]
    out_chars = []
    i = 0
    n = len(chunk)
    illegal_chars = set('[]/\\{};%|<>"`$') if is_governor_name else set('\\{};|<>"`')
    while i < n:
        b0 = chunk[i]
        if b0 < 0x20 or b0 == 0x7F:
            break
        if b0 < 0x80:
            seq_len = 1
        elif (b0 & 0xE0) == 0xC0:
            seq_len = 2
        elif (b0 & 0xF0) == 0xE0:
            seq_len = 3
        elif (b0 & 0xF8) == 0xF0:
            seq_len = 4
        else:
            break
        if i + seq_len > n:
            break
        # If a multi-byte char is immediately followed by a stray continuation byte (0x80..0xBF),
        # this 4-byte chunk is a binary integer/pointer, not UTF-8 text.
        if seq_len >= 2 and (i + seq_len < n) and (0x80 <= chunk[i + seq_len] <= 0xBF):
            break
        try:
            ch = chunk[i : i + seq_len].decode("utf-8", errors="strict")
        except UnicodeDecodeError:
            break
        if not ch.isprintable() or ch in illegal_chars:
            break
        out_chars.append(ch)
        i += seq_len

    res = "".join(out_chars).strip()
    # If buffer was NOT null-terminated and ran into binary bytes (i < n), strip 1-3 trailing ASCII residual bytes after Cyrillic/CJK words
    if not had_null and i < n and len(res) >= 4:
        has_cyrillic = any(0x0400 <= ord(c) <= 0x04FF for c in res)
        if has_cyrillic:
            while len(res) > 2 and ord(res[-1]) < 0x80 and res[-1].isalpha():
                res = res[:-1]
    return res.strip()


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
        name_region = window[kp_marker + 4 :]
        clean = decode_clean_lua_slot(name_region, is_governor_name=True)
        if len(clean) >= 2 and any(c.isalnum() for c in clean):
            return clean

    # Fallback: scan null-separated chunks before idx
    parts = [p for p in window.split(b"\x00") if len(p) >= 2]
    for cand in reversed(parts):
        clean = decode_clean_lua_slot(cand, is_governor_name=True)
        if len(clean) >= 2 and any(c.isalnum() for c in clean):
            return clean
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


_MUMU_ARENA_CACHE = {}


def resolve_mumu_pid_and_arena(adb_serial: str = "127.0.0.1:16384"):
    """
    Maps an emulator ADB port (16384 -> -v 0, 16416 -> -v 1, 16448 -> -v 2, 16480 -> -v 3)
    to its exact MuMuNxDevice.exe PID and discovers its 64GB ASLR guest RAM arena via VirtualQueryEx.
    """
    from collections import Counter

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
    k32.CloseHandle.argtypes = [wt.HANDLE]

    port_str = str(adb_serial or "127.0.0.1:16384").split(":")[-1]
    try:
        adb_port = int(port_str)
    except ValueError:
        adb_port = 16384
    vm_idx = max(0, (adb_port - 16384) // 32)

    cached = _MUMU_ARENA_CACHE.get(adb_port)
    if cached:
        c_pid, c_start, c_end = cached
        h_test = k32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, c_pid)
        if h_test:
            k32.CloseHandle(h_test)
            return c_pid, c_start, c_end

    target_pid = None
    try:
        ps_cmd = (
            "Get-CimInstance Win32_Process -Filter \"Name = 'MuMuNxDevice.exe'\" | "
            "Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress"
        )
        proc_out = subprocess.check_output(
            ["powershell", "-NoProfile", "-Command", ps_cmd],
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).decode("utf-8", errors="ignore").strip()
        if proc_out:
            parsed = json.loads(proc_out)
            if isinstance(parsed, dict):
                parsed = [parsed]
            for item in parsed:
                cmd_line = str(item.get("CommandLine") or "")
                pid_val = int(item.get("ProcessId") or 0)
                if pid_val > 0 and (
                    f"-v {vm_idx} " in f"{cmd_line} "
                    or f"15.0-{vm_idx}" in cmd_line
                    or f"12.0-{vm_idx}" in cmd_line
                ):
                    target_pid = pid_val
                    break
            if target_pid is None and parsed:
                idx_clamped = min(vm_idx, len(parsed) - 1)
                target_pid = int(parsed[idx_clamped].get("ProcessId") or 0)
    except Exception:
        pass

    if not target_pid:
        out = subprocess.check_output('tasklist /FI "IMAGENAME eq MuMuNxDevice.exe"', shell=True).decode(errors="ignore")
        pids = [int(x) for x in re.findall(r"MuMuNxDevice\.exe\s+(\d+)", out)]
        if not pids:
            raise RuntimeError("MuMuNxDevice.exe process not found!")
        target_pid = pids[min(vm_idx, len(pids) - 1)]

    h = k32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, target_pid)
    if not h:
        raise RuntimeError(f"Failed to open MuMuNxDevice.exe (PID {target_pid}) for {adb_serial}")

    buckets = Counter()
    mbi = MEMORY_BASIC_INFORMATION()
    addr = 0x10000
    max_user_addr = 0x7FFFFFFFFFFF
    try:
        while addr < max_user_addr and k32.VirtualQueryEx(h, ctypes.c_void_p(addr), ctypes.byref(mbi), ctypes.sizeof(mbi)):
            if (
                mbi.State == MEM_COMMIT
                and mbi.Protect == PAGE_READWRITE
                and mbi.Type == MEM_PRIVATE
                and mbi.RegionSize <= 16 * 1024 * 1024
            ):
                buckets[addr >> 36] += mbi.RegionSize
            nxt = (mbi.BaseAddress or addr) + mbi.RegionSize
            if nxt <= addr:
                break
            addr = nxt
    finally:
        k32.CloseHandle(h)

    if buckets:
        best_prefix = buckets.most_common(1)[0][0]
        start_addr = best_prefix << 36
        end_addr = start_addr + 0x600000000
    else:
        start_addr = 0x25000000000
        end_addr = 0x25500000000

    _MUMU_ARENA_CACHE[adb_port] = (target_pid, start_addr, end_addr)
    print(f"  [MUMU ARENA] Mapped {adb_serial} (vm={vm_idx}) -> PID {target_pid} @ {hex(start_addr)}..{hex(end_addr)}")
    return target_pid, start_addr, end_addr


def extract_all_governors_from_ram(exclude_gov_ids=None, adb_serial: str = "127.0.0.1:16384") -> list:
    """
    Scans the target emulator's MuMuNxDevice.exe Lua heap (MEM_PRIVATE | PAGE_READWRITE)
    and extracts all 35-field Governor records currently resident in memory.
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

    pid, addr, max_addr = resolve_mumu_pid_and_arena(adb_serial)
    h = k32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, pid)
    if not h:
        raise RuntimeError(f"Failed to open MuMuNxDevice.exe (PID {pid})")

    mbi = MEMORY_BASIC_INFORMATION()
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

                                # Extract Alliance Full Name & 4-char Tag (ONLY when 0x4ebbe693 alliance marker exists in header)
                                al_marker = hdr.find(b"\x93\xe6\xbb\x4e")
                                if al_marker != -1:
                                    al_end = len(hdr) - 64 if len(hdr) >= 64 and al_marker + 4 < len(hdr) - 64 else al_marker + 20
                                    al_slice = hdr[al_marker + 4 : al_end]
                                    gov["allianceName"] = decode_clean_lua_slot(al_slice, is_governor_name=True)
                                    tag_raw = hdr[-64:-60] if len(hdr) >= 64 else b""
                                    tag_str = "".join(chr(b) for b in tag_raw if 32 <= b <= 126).strip()
                                    if tag_str:
                                        gov["alliance"] = tag_str
                                        if gov["allianceName"].endswith(tag_str) and len(gov["allianceName"]) > len(tag_str):
                                            gov["allianceName"] = gov["allianceName"][: -len(tag_str)].strip()
                                else:
                                    gov["alliance"] = "None"
                                    gov["allianceName"] = ""

                                more = parse_tier_and_more_block(body)
                                for mk, mv in more.items():
                                    if mv > 0 or mk not in gov:
                                        gov[mk] = mv

                                gid = gov["govId"]
                                if gid > 1000000 and gid not in exclude_gov_ids:
                                    gov["id"] = str(gid)
                                    if not gov["name"]:
                                        gov["name"] = f"Governor_{gid}"
                                    # Merge with any earlier record for same gid (keep latest alliance/power + non-zero deep stats)
                                    if gid in gov_by_id:
                                        existing = gov_by_id[gid]
                                        for fk, fv in gov.items():
                                            if fk == "name":
                                                if fv and fv != f"Governor_{gid}":
                                                    old_n = existing.get("name", "")
                                                    if old_n and old_n != f"Governor_{gid}":
                                                        cp = os.path.commonprefix([old_n, fv]).strip()
                                                        existing["name"] = cp if len(cp) >= 3 else fv
                                                    else:
                                                        existing["name"] = fv
                                            elif fk == "alliance":
                                                existing["alliance"] = fv
                                            elif fk == "allianceName":
                                                if gov.get("alliance") == "None":
                                                    existing["allianceName"] = ""
                                                elif fv:
                                                    old_an = existing.get("allianceName", "")
                                                    if old_an and existing.get("alliance") == gov.get("alliance"):
                                                        cp = os.path.commonprefix([old_an, fv]).strip()
                                                        existing["allianceName"] = cp if len(cp) >= 3 else fv
                                                    else:
                                                        existing["allianceName"] = fv
                                            elif isinstance(fv, (int, float)):
                                                if fv > 0:
                                                    existing[fk] = fv
                                            elif fv:
                                                existing[fk] = fv
                                    else:
                                        gov_by_id[gid] = gov
                        idx = raw.find(needle_troop, idx + 4)
            addr = (mbi.BaseAddress or addr) + mbi.RegionSize
    finally:
        k32.CloseHandle(h)

    gov_list = list(gov_by_id.values())

    # Consensus-clean allianceName across members sharing the same 4-char alliance tag
    by_tag = {}
    for g in gov_list:
        tag = g.get("alliance")
        an = g.get("allianceName") or ""
        if tag and tag != "None" and len(an) >= 3:
            by_tag.setdefault(tag, []).append(an)
    clean_tag_names = {}
    for tag, names in by_tag.items():
        if len(names) >= 2:
            cp = os.path.commonprefix(names).strip()
            if len(cp) >= 3:
                clean_tag_names[tag] = cp
    for g in gov_list:
        tag = g.get("alliance")
        if tag in clean_tag_names:
            g["allianceName"] = clean_tag_names[tag]
        elif tag == "None":
            g["allianceName"] = ""

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

    def tap(self, x, y, sleep_sec=0.45, max_offset=2):
        jx = self._jitter_coord(x, max_offset=max_offset)
        jy = self._jitter_coord(y, max_offset=max_offset)
        subprocess.run(
            [self.adb_bin, "-s", self.serial, "shell", "input", "tap", str(jx), str(jy)],
            capture_output=True,
        )
        self._human_sleep(sleep_sec)

    def swipe(self, x1, y1, x2, y2, duration_ms=950, sleep_sec=0.48):
        # For vertical leaderboard scrolling, keep y1, y2, and duration exact so 101.0px row pitch never accumulates random-walk drift
        jx1 = self._jitter_coord(x1, max_offset=3)
        jy1 = int(y1)
        jx2 = self._jitter_coord(x2, max_offset=3)
        jy2 = int(y2)
        jdur = int(duration_ms)
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


def extract_mumu_binary_save_telemetry(adb_bin: str, serial: str = "127.0.0.1:16384", target_kd: str = "4194") -> dict:
    """
    Pulls and decodes Lilith's 0x05 binary Lua tables directly from MuMu's Android container:
      /storage/emulated/0/Android/data/com.lilithgame.roc.gp/files/GLGData/com_lilithgame_roc_gp/doc/mailcache/
    Merges with any baseline seed in C:\\UnityScanner\\mailcache_baseline_seed.json (only for #4194).
    Returns dict keyed by integer Governor ID (PId).
    """
    adb_port = str(serial or "127.0.0.1:16384").split(":")[-1]
    sync_dir = os.path.join(SCRIPT_DIR, f"mumu_doc_sync_{adb_port}")
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
    # Load baseline mailcache seed ONLY when scanning Kingdom #4194
    seed_path = os.path.join(SCRIPT_DIR, "mailcache_baseline_seed.json")
    if str(target_kd) == "4194" and os.path.exists(seed_path):
        try:
            with open(seed_path, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    pid = int(item.get("govId") or item.get("id") or 0)
                    if pid > 0:
                        govs[pid] = dict(item)
        except Exception:
            pass

    expected_cos_id = None
    try:
        kd_int = int(target_kd)
        if kd_int > 1000:
            expected_cos_id = kd_int - 1000
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
                        if expected_cos_id and ch.get("COSId") and int(ch["COSId"]) != expected_cos_id:
                            continue
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
                                if expected_cos_id and j.get("COSId") and int(j["COSId"]) != expected_cos_id:
                                    continue
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
            if (
                not rec.get("allianceName")
                and s.get("allianceName")
                and rec.get("alliance") not in (None, "", "None")
                and rec.get("alliance") == s.get("alliance")
            ):
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
    ram_govs = extract_all_governors_from_ram(adb_serial=args.adb)
    save_govs = extract_mumu_binary_save_telemetry(driver.adb_bin, args.adb, target_kd=str(args.kd))
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


def resolve_instance_id(adb_serial: str) -> str:
    s = str(adb_serial or "127.0.0.1:16384")
    if "16416" in s:
        return "sidekick-mumu-1"
    if "16448" in s:
        return "sidekick-mumu-2"
    return "sidekick-mumu-0"


def write_scan_progress(payload):
    try:
        adb_serial = str(payload.get("workerSerial") or "127.0.0.1:16384")
        adb_port = adb_serial.split(":")[-1]
        inst_id = resolve_instance_id(adb_serial)
        payload["workerSerial"] = adb_serial
        payload["adbPort"] = adb_port
        payload["instanceId"] = inst_id
        payload["pid"] = os.getpid()
        payload["updatedAt"] = datetime.now(timezone.utc).isoformat()
        per_port_file = os.path.join(SCRIPT_DIR, f"scan_progress_{adb_port}.json")
        with open(per_port_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass
    try:
        requests.post(f"{HUB_URL}/scan-progress", json=payload, timeout=1.5)
    except Exception:
        pass


def kill_other_scanner_instances(adb_serial: str = "127.0.0.1:16384"):
    """Ensures only a single unity_autonomous_scanner.py process tree runs per emulator ADB port (preserving venv parent stub)."""
    my_pid = os.getpid()
    my_ppid = os.getppid()
    adb_port = str(adb_serial or "127.0.0.1:16384").split(":")[-1]
    if adb_port == "16384":
        port_filter = "($_.CommandLine -like '*16384*' -or $_.CommandLine -notlike '*--adb*')"
    else:
        port_filter = f"($_.CommandLine -like '*{adb_port}*')"
    ps_cmd = (
        f"Get-CimInstance Win32_Process -Filter \"Name = 'python.exe'\" -ErrorAction SilentlyContinue | "
        f"Where-Object {{ $_.ProcessId -ne {my_pid} -and $_.ProcessId -ne {my_ppid} -and $_.ParentProcessId -ne {my_pid} -and ($_.CommandLine -like '*unity_autonomous_scanner*' -or $_.CommandLine -like '*auto_tutorial_ch8*' -or $_.CommandLine -like '*provision_neighbor_kingdom*') -and {port_filter} }} | "
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


def ensure_individual_power_leaderboard_open(
    driver, target_kd: str, skip_switch: bool = False, reset_to_top: bool = True
) -> bool:
    """
    Guarantees the emulator is on the target kingdom character AND that the
    INDIVIDUAL POWER RANKINGS modal is open (and reset to Rank #1 when reset_to_top=True)
    before any row taps begin.
    """
    screen_txt = get_screen_ocr_text(driver)
    if skip_switch and "INDIVIDUAL POWER RANKINGS" in screen_txt:
        if reset_to_top:
            print("  [PREAMBLE] INDIVIDUAL POWER RANKINGS already open -> closing (1396,58) & reopening (380,560) to reset scroll to Rank #1...")
            driver.tap(1396, 58, sleep_sec=1.5)
            driver.tap(380, 560, sleep_sec=2.2)
            if "INDIVIDUAL POWER RANKINGS" in get_screen_ocr_text(driver):
                return True
        else:
            return True

    if not skip_switch:
        prov_script = os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py")
        if os.path.exists(prov_script):
            print(f"  [PREAMBLE] Verifying / switching active character to Kingdom #{target_kd}...")
            try:
                subprocess.run(
                    [sys.executable, prov_script, "--mode", "switch", "--kingdom", str(target_kd), "--adb", driver.serial],
                    timeout=240,
                    check=False,
                )
            except subprocess.TimeoutExpired:
                print(f"  [WARN] Character switch subprocess timed out after 240s; continuing preamble check...")

    for attempt in range(1, 120):
        screen_txt = get_screen_ocr_text(driver)
        if "INDIVIDUAL POWER RANKINGS" in screen_txt:
            if reset_to_top and attempt == 1:
                print("  [PREAMBLE] Resetting INDIVIDUAL POWER RANKINGS scroll to Rank #1 (1396,58 -> 380,560)...")
                driver.tap(1396, 58, sleep_sec=1.5)
                driver.tap(380, 560, sleep_sec=2.2)
            print(f"  [PREAMBLE] Verified INDIVIDUAL POWER RANKINGS is open (attempt {attempt}).")
            return True

        if "ALLIANCE POWER" in screen_txt and "INDIVIDUAL POWER" in screen_txt:
            print("  [PREAMBLE] On Rankings 9-card menu -> tapping Individual Power (380, 560)...")
            driver.tap(380, 560, sleep_sec=2.2)
            if "INDIVIDUAL POWER RANKINGS" in get_screen_ocr_text(driver):
                return True

        print(f"  [PREAMBLE] Navigating HUD -> Avatar (45,45) -> Rankings -> Individual Power (attempt {attempt}/119)...")
        def _clear_hud_for_avatar():
            try:
                arr = np.array(driver.screenshot())
                sub = arr[30:840, 200:1400]
                r_mask = (sub[:, :, 0] >= 195) & (sub[:, :, 1] <= 75) & (sub[:, :, 2] <= 75) & ((sub[:, :, 0] - sub[:, :, 1]) >= 125)
                rys, rxs = np.where(r_mask)
                if len(rxs) >= 700:
                    rx, ry = int(np.median(rxs) + 200), int(np.median(rys) + 30)
                    g_patch = arr[max(0, ry - 75) : min(900, ry + 75), max(0, rx + 100) : min(1600, rx + 270)]
                    g_mask = (
                        (g_patch[:, :, 1] >= 150)
                        & ((g_patch[:, :, 1].astype(np.int32) - g_patch[:, :, 2].astype(np.int32)) >= 55)
                        & ((g_patch[:, :, 1].astype(np.int32) - g_patch[:, :, 0].astype(np.int32)) >= 35)
                    )
                    gys, gxs = np.where(g_mask)
                    if len(gxs) >= 350:
                        gx = int(np.median(gxs) + max(0, rx + 100))
                        gy = int(np.median(gys) + max(0, ry - 75))
                        driver.tap(gx, gy, sleep_sec=1.2)
                        arr = np.array(driver.screenshot())
                rib = arr[85:125, 15:70]
                if float((rib[:, :, 2].astype(np.float32) - rib[:, :, 0].astype(np.float32)).mean()) > 45.0:
                    return
                for _ in range(3):
                    subprocess.run([driver.adb_bin, "-s", driver.serial, "shell", "input", "keyevent", "4"], capture_output=True)
                    time.sleep(0.6)
                arr = np.array(driver.screenshot())
                rib = arr[85:125, 15:70]
                if float((rib[:, :, 2].astype(np.float32) - rib[:, :, 0].astype(np.float32)).mean()) > 45.0:
                    return
                for cx_c, cy_c in [(1388, 56), (1363, 110), (1455, 88)]:
                    driver.tap(cx_c, cy_c, sleep_sec=1.0)
                    arr = np.array(driver.screenshot())
                    rib = arr[85:125, 15:70]
                    if float((rib[:, :, 2].astype(np.float32) - rib[:, :, 0].astype(np.float32)).mean()) > 45.0:
                        return
            except Exception:
                pass

        _clear_hud_for_avatar()
        driver.tap(45, 45, sleep_sec=2.2)
        prof_txt = get_screen_ocr_text(driver)
        if not any(k in prof_txt for k in ("GOVERNOR PROFILE", "SETTINGS", "RANKINGS", "MORE INFO", "ACHIEVEMENTS")):
            print(f"  [PREAMBLE] Avatar (45,45) blocked by remaining tutorial on #{target_kd}; running 45 tutorial steps...")
            tut_script = os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py")
            if os.path.exists(tut_script):
                subprocess.run(
                    [sys.executable, tut_script, "--adb", driver.serial, "--kingdom", str(target_kd), "--steps", "45"],
                    check=False,
                )
            _clear_hud_for_avatar()
            driver.tap(45, 45, sleep_sec=2.2)
            prof_txt = get_screen_ocr_text(driver)

        rank_x = 475 if "ACHIEVEMENTS" in prof_txt else 530
        driver.tap(rank_x, 755, sleep_sec=2.2)
        after_rank_txt = get_screen_ocr_text(driver)
        if "LEVEL 8" in after_rank_txt or "VIEW RANKINGS" in after_rank_txt or "GOVERNOR PROFILE" in after_rank_txt:
            print(f"  [PREAMBLE] Rankings requires City Hall Level 8 on #{target_kd} -> running 65 CH8 upgrade steps (attempt {attempt}/14)...")
            driver.tap(1454, 105, sleep_sec=1.0)
            tut_script = os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py")
            if os.path.exists(tut_script):
                subprocess.run(
                    [sys.executable, tut_script, "--adb", driver.serial, "--kingdom", str(target_kd), "--steps", "65"],
                    check=False,
                )
            continue

        driver.tap(380, 560, sleep_sec=2.4)

        if "INDIVIDUAL POWER RANKINGS" in get_screen_ocr_text(driver):
            print("  [PREAMBLE] Verified INDIVIDUAL POWER RANKINGS is open!")
            return True

        print(f"  [PREAMBLE] INDIVIDUAL POWER RANKINGS not open yet on #{target_kd} -> running 65 CH8 upgrade steps (attempt {attempt}/119)...")
        driver.tap(1454, 105, sleep_sec=1.0)
        tut_script = os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py")
        if os.path.exists(tut_script):
            subprocess.run(
                [sys.executable, tut_script, "--adb", driver.serial, "--kingdom", str(target_kd), "--steps", "65"],
                check=False,
            )

    print("  [ERROR] Could not verify INDIVIDUAL POWER RANKINGS modal after 3 attempts; aborting scan to prevent misclicks.")
    return False


def detect_bottom_card_center_y(driver, target_y: int = 780) -> int:
    """
    Measures the exact vertical center of the blue row card closest to target_y (780)
    along column x=600 so settled_y never lands in the 12px dark gap between rows.
    """
    try:
        a = np.array(driver.screenshot())
        col = a[250:855, 600]
        is_card = (col[:, 2] > 125) & (col[:, 0] < 65)
        centers = []
        start = None
        for i, v in enumerate(is_card):
            y = 250 + i
            if v and start is None:
                start = y
            elif not v and start is not None:
                if y - start >= 65:
                    centers.append(int((start + y - 1) // 2))
                start = None
        if start is not None and 855 - start >= 65:
            centers.append(int((start + 854) // 2))
        if centers:
            return min(centers, key=lambda cy: abs(cy - target_y))
    except Exception:
        pass
    return target_y


def run_kingdom_scan(args):
    kill_other_scanner_instances(args.adb)
    driver = AdbEmulatorDriver(serial=args.adb)
    scan_date_iso = args.scan_date or datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
    ingest_url = f"{args.unity_url.rstrip('/')}/api/ingest/kingdom-scan"
    started_at_iso = datetime.now(timezone.utc).isoformat()
    t_start = time.time()

    print("==================================================================")
    print(f"  UNITY 45-FIELD MUMU RAM + BINARY SAVE SCANNER | KD #{args.kd} | Ranks {args.start_rank}..{args.end_rank}")
    print(f"  ADB Emulator: {args.adb} | Scan ID: {scan_date_iso}")
    print("==================================================================")

    # Exact measured row card centers on 1600x900 Individual Power Rankings (101px row pitch)
    first_rows_y = [290, 384, 485, 585, 686, 785]
    settled_y = 780
    last_gov_name = "Preparing Leaderboard..."
    last_gov_power = 0
    total_extracted = 0

    adb_port = str(args.adb or "127.0.0.1:16384").split(":")[-1]
    accum_path = os.path.join(SCRIPT_DIR, f"ram_accum_{adb_port}_{args.kd}.json")
    cumulative_ram_by_id = {}
    if os.path.exists(accum_path):
        try:
            with open(accum_path, "r", encoding="utf-8-sig") as rf:
                loaded_accum = json.load(rf)
            if isinstance(loaded_accum, dict):
                cumulative_ram_by_id = {int(k): v for k, v in loaded_accum.items() if int(k) > 0}
            elif isinstance(loaded_accum, list):
                for item in loaded_accum:
                    gid = int(item.get("govId") or item.get("id") or 0)
                    if gid > 0:
                        cumulative_ram_by_id[gid] = item
            print(f"  [ACCUMULATOR] Loaded {len(cumulative_ram_by_id)} pre-accumulated RAM governors from {accum_path}")
        except Exception:
            pass

    write_scan_progress({
        "running": True,
        "status": "PREPARING_LEADERBOARD",
        "kingdom": str(args.kd),
        "currentRank": 0,
        "targetRanks": args.end_rank,
        "percent": 0.0,
        "lastGovernorName": f"Switching to #{args.kd} & opening Individual Power Rankings...",
        "lastGovernorPower": 0,
        "governorsExtracted": len(cumulative_ram_by_id),
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
            "governorsExtracted": len(cumulative_ram_by_id),
            "startedAt": started_at_iso,
            "etaSeconds": 0,
            "workerSerial": args.adb,
        })
        return

    for rank in range(args.start_rank, args.end_rank + 1):
        ry = first_rows_y[rank - 1] if rank <= 6 else settled_y
        print(f"  -> Stepping Rank #{rank} (y={ry})...")
        driver.tap(600, ry, sleep_sec=0.78)        # Open Governor Profile from Leaderboard row
        driver.tap(240, 755, sleep_sec=0.74)       # Open More Info
        driver.tap(1395, 55, sleep_sec=0.45)       # Close More Info (X at 1395, 55)
        driver.tap(1455, 88, sleep_sec=0.48)       # Close Governor Profile (X at 1455, 88)

        if rank >= 6:
            # 82px drag over 950ms advances exactly 101.0px (1.00 row) with zero inertia coasting
            driver.swipe(600, 780, 600, 698, duration_ms=950, sleep_sec=0.45)

        elapsed = max(1.0, time.time() - t_start)
        done_steps = max(1, rank - args.start_rank + 1)
        avg_sec = elapsed / done_steps
        rem_steps = max(0, args.end_rank - rank)
        pct = round((rank / max(1, args.end_rank)) * 100, 1)

        if rank % 10 == 0 or rank == args.end_rank or rank == 1:
            if rank < args.end_rank and "INDIVIDUAL POWER" not in get_screen_ocr_text(driver):
                print(f"  [SELF-HEAL @ Rank #{rank}] Leaderboard modal out of focus; restoring INDIVIDUAL POWER RANKINGS...")
                ensure_individual_power_leaderboard_open(driver, str(args.kd), skip_switch=True, reset_to_top=False)
            if rank >= 6 and rank < args.end_rank:
                settled_y = detect_bottom_card_center_y(driver, target_y=780)
            ram_govs = extract_all_governors_from_ram(adb_serial=args.adb)
            for rg in ram_govs:
                gid = int(rg.get("govId") or rg.get("id") or 0)
                if gid <= 0:
                    continue
                if gid in cumulative_ram_by_id:
                    existing = cumulative_ram_by_id[gid]
                    for fk, fv in rg.items():
                        if fk == "name":
                            if fv and fv != f"Governor_{gid}":
                                existing["name"] = fv
                        elif fk in ("alliance", "allianceName", "civilization"):
                            existing[fk] = fv
                        elif isinstance(fv, (int, float)) and fv > 0:
                            existing[fk] = fv
                        elif fv and not existing.get(fk):
                            existing[fk] = fv
                else:
                    cumulative_ram_by_id[gid] = dict(rg)
            try:
                with open(accum_path, "w", encoding="utf-8") as wf:
                    json.dump(list(cumulative_ram_by_id.values()), wf, ensure_ascii=False)
            except Exception:
                pass
            accum_ram_list = list(cumulative_ram_by_id.values())
            save_govs = extract_mumu_binary_save_telemetry(driver.adb_bin, args.adb, target_kd=str(args.kd))
            merged_govs = merge_ram_and_mumu_save_telemetry(accum_ram_list, save_govs)
            total_extracted = len(merged_govs)
            if ram_govs:
                cur_live = ram_govs[min(rank - 1, len(ram_govs) - 1)]
                last_gov_name = cur_live.get("name", last_gov_name)
                last_gov_power = cur_live.get("power", last_gov_power)
            elif merged_govs:
                top_latest = merged_govs[min(rank - 1, len(merged_govs) - 1)]
                last_gov_name = top_latest.get("name", last_gov_name)
                last_gov_power = top_latest.get("power", last_gov_power)
            print(
                f"  [MUMU 45-FIELD SWEEP @ Rank #{rank}] {len(ram_govs)} live RAM ({len(accum_ram_list)} accum) + {len(save_govs)} Save -> {len(merged_govs)} governors!"
            )
            if merged_govs and (rank % 10 == 0 or rank == args.end_rank):
                push_batch_to_unity(
                    ingest_url,
                    args.scanner_key,
                    {
                        "kingdomId": str(args.kd),
                        "scanDateOverride": scan_date_iso,
                        "forceSnapshotCommit": bool(rank == args.end_rank or rank % 50 == 0 or str(args.kd) != "4194"),
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


