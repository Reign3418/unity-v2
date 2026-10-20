#!/usr/bin/env python3
"""
===============================================================================
VALHEON BASTION — AUTONOMOUS MULTI-EMULATOR QUEUE ORCHESTRATOR (SIDEKICK)
File: E:\\Unity\\scanner\\bastion_multi_queue.py
===============================================================================
Coordinates simultaneous tasks across:
  - sidekick-mumu-0 (127.0.0.1:16384):
      1. Finishes live 650-rank scan on #4194 (while background accumulator
         captures every RAM governor into ram_accum_16384_4194.json).
      2. Claims #4198 (if not yet claimed), provisions #4198 bot, and runs
         full 650-rank 45-field scan on #4198.
  - sidekick-mumu-1 (127.0.0.1:16416):
      1. Registers #4194 Bot #2 (unlocked HUD) in Bastion Cloud Roster.
      2. Provisions #4197 bot and runs full 650-rank 45-field scan on #4197.
      3. Claims #4198 (if not already claimed by mumu-0), otherwise switches
         back to #4194 to complete CH8 upgrades (auto_tutorial_ch8.py) and
         run a verification scan on #4194.
===============================================================================
"""

import os
import re
import sys
import json
import time
import threading
import subprocess
import urllib.request
from datetime import datetime, timezone
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import unity_autonomous_scanner as scanner
from provision_neighbor_kingdom import get_ocr, tap, screencap

CLOUD_BASTION_URL = "https://unity-v2-azure.vercel.app/api/bastion"
CLOUD_INGEST_URL = "https://unity-v2-azure.vercel.app/api/ingest/kingdom-scan"
SCANNER_KEY = os.environ.get("UNITY_SCANNER_KEY", "unity-local-node2-telemetry")

_LOCK = threading.Lock()
_CLAIMED_KINGDOMS = set()


def claim_kingdom_job(kd: str) -> bool:
    with _LOCK:
        if kd in _CLAIMED_KINGDOMS:
            return False
        _CLAIMED_KINGDOMS.add(kd)
        return True


def log_msg(tag: str, msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [{tag}] {msg}"
    print(line, flush=True)
    try:
        with open(os.path.join(SCRIPT_DIR, "bastion_multi_queue.log"), "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def register_bot_on_screen(adb_serial: str, kingdom: str, ch_level: int = 3):
    adb_port = adb_serial.split(":")[-1]
    snap_path = os.path.join(SCRIPT_DIR, f"reg_bot_{adb_port}.png")
    gov_id = f"BOT-{kingdom}-{adb_port}"
    gov_name = f"Governor (#{kingdom})"
    try:
        subprocess.run([scanner.ADB_PATH, "-s", adb_serial, "shell", "input", "keyevent", "4"], capture_output=True)
        time.sleep(0.8)
        tap(adb_serial, 45, 45, 2.2)
        screencap(adb_serial, snap_path)
        subprocess.run([scanner.ADB_PATH, "-s", adb_serial, "shell", "input", "keyevent", "4"], capture_output=True)
        time.sleep(1.0)
        ocr = get_ocr()
        arr = np.array(Image.open(snap_path).convert("RGB"))
        res, _ = ocr(arr)
        for item in res or []:
            txt = item[1].strip()
            m_id = re.search(r"ID\s*[:\uff1a]?\s*(\d{7,11})", txt, re.IGNORECASE)
            if m_id:
                gov_id = m_id.group(1)
            m_name = re.search(r"(Governor\d{7,11})", txt)
            if m_name:
                gov_name = m_name.group(1)
                if gov_id.startswith("BOT-"):
                    gov_id = gov_name.replace("Governor", "")
        if gov_name.startswith("Governor (") and gov_id.isdigit():
            gov_name = f"Governor{gov_id}"

        inst_id = "sidekick-mumu-1" if "16416" in adb_serial else "sidekick-mumu-0"
        payload_bytes = json.dumps({
            "action": "REGISTER_PROVISIONED_BOT",
            "payload": {
                "kingdom": str(kingdom),
                "govId": gov_id,
                "name": gov_name,
                "chLevel": ch_level,
                "power": 4500,
                "instanceId": inst_id,
            },
        }).encode("utf-8")
        req = urllib.request.Request(
            CLOUD_BASTION_URL,
            data=payload_bytes,
            headers={"Content-Type": "application/json", "User-Agent": "BastionMultiQueue/1.0"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10).read()
        log_msg(inst_id, f"Registered #{kingdom} bot: {gov_name} (ID={gov_id}, CH{ch_level})")
    except Exception as e:
        log_msg(adb_serial, f"Warning registering #{kingdom} bot: {e}")


def is_mumu0_scan_running() -> tuple:
    prog_path = os.path.join(SCRIPT_DIR, "scan_progress_16384.json")
    try:
        if os.path.exists(prog_path):
            with open(prog_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            running = bool(data.get("running"))
            cur_rank = int(data.get("currentRank") or 0)
            tgt_rank = int(data.get("targetRanks") or 650)
            status = str(data.get("status") or "")
            if running and status == "SCANNING_LIVE" and cur_rank < tgt_rank:
                return True, cur_rank, tgt_rank
    except Exception:
        pass
    return False, 0, 650


def mumu0_worker():
    adb_serial = "127.0.0.1:16384"
    accum_path = os.path.join(SCRIPT_DIR, "ram_accum_16384_4194.json")
    accum_by_id = {}
    if os.path.exists(accum_path):
        try:
            with open(accum_path, "r", encoding="utf-8-sig") as f:
                for g in json.load(f):
                    gid = int(g.get("govId") or g.get("id") or 0)
                    if gid > 0:
                        accum_by_id[gid] = g
            log_msg("sidekick-mumu-0", f"Loaded {len(accum_by_id)} seeded #4194 governors into accumulator.")
        except Exception as e:
            log_msg("sidekick-mumu-0", f"Seed load warning: {e}")

    last_push_time = 0
    seed_path = os.path.join(SCRIPT_DIR, "ram_accum_seed_4194.json")
    while True:
        running, cur_rank, tgt_rank = is_mumu0_scan_running()
        try:
            if len(accum_by_id) < 500 and os.path.exists(seed_path):
                with open(seed_path, "r", encoding="utf-8-sig") as sf:
                    for sg in json.load(sf):
                        sgid = int(sg.get("govId") or sg.get("id") or 0)
                        if sgid > 0 and sgid not in accum_by_id:
                            accum_by_id[sgid] = sg
            live_ram = scanner.extract_all_governors_from_ram(adb_serial=adb_serial)
            for rg in live_ram:
                gid = int(rg.get("govId") or rg.get("id") or 0)
                if gid <= 0:
                    continue
                if gid in accum_by_id:
                    ex = accum_by_id[gid]
                    for fk, fv in rg.items():
                        if fv and (not ex.get(fk) or ex.get(fk) == "None" or ex.get(fk) == f"Governor_{gid}"):
                            ex[fk] = fv
                        elif isinstance(fv, (int, float)) and fv > 0:
                            ex[fk] = fv
                else:
                    accum_by_id[gid] = dict(rg)
            with open(accum_path, "w", encoding="utf-8") as wf:
                json.dump(list(accum_by_id.values()), wf, ensure_ascii=False)
        except Exception as e:
            log_msg("sidekick-mumu-0", f"RAM harvest warning: {e}")

        now = time.time()
        if (now - last_push_time >= 75 or not running) and accum_by_id:
            last_push_time = now
            try:
                roster_list = sorted(accum_by_id.values(), key=lambda x: x.get("power", 0), reverse=True)
                for idx, item in enumerate(roster_list, start=1):
                    item["rank"] = idx
                scanner.push_batch_to_unity(
                    "http://192.168.50.41:3000/api/ingest/kingdom-scan",
                    SCANNER_KEY,
                    {
                        "kingdomId": "4194",
                        "forceSnapshotCommit": True,
                        "progress": {
                            "currentRank": cur_rank if running else tgt_rank,
                            "targetRank": tgt_rank,
                            "workerSerial": adb_serial,
                            "mode": "MUMU_45_FIELD_UNIFIED_RAM_AND_SAVE",
                        },
                        "rosterArray": roster_list,
                    },
                )
                log_msg("sidekick-mumu-0", f"Synced {len(roster_list)} accumulated #4194 governors (@ Rank {cur_rank}/{tgt_rank}).")
            except Exception as e:
                log_msg("sidekick-mumu-0", f"Cloud sync warning: {e}")

        if not running:
            log_msg("sidekick-mumu-0", "#4194 scan completed on 127.0.0.1:16384!")
            break
        time.sleep(22)

    # sidekick-mumu-0 (127.0.0.1:16384) has completed #4194 (650/650) -> now provision & scan #4197
    if claim_kingdom_job("4197"):
        log_msg("sidekick-mumu-0", "Claimed Kingdom #4197 -> Provisioning #4197 character on 127.0.0.1:16384...")
        subprocess.run(
            [
                sys.executable,
                os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py"),
                "--adb",
                adb_serial,
                "--kingdom",
                "4197",
                "--mode",
                "create",
                "--tutorial-steps",
                "85",
            ],
            check=False,
        )
        register_bot_on_screen(adb_serial, "4197", ch_level=2)
        log_msg("sidekick-mumu-0", "Starting full 650-rank 45-field scan on Kingdom #4197...")
        subprocess.run(
            [
                sys.executable,
                os.path.join(SCRIPT_DIR, "unity_autonomous_scanner.py"),
                "--adb",
                adb_serial,
                "--mode",
                "kingdom-scan",
                "--kd",
                "4197",
                "--end-rank",
                "650",
                "--skip-switch",
                "--push",
            ],
            check=False,
        )
        log_msg("sidekick-mumu-0", "Completed 650-rank scan on Kingdom #4197!")


def mumu1_worker():
    adb_serial = "127.0.0.1:16416"
    if claim_kingdom_job("4198"):
        log_msg("sidekick-mumu-1", "Step 1: Registering #4198 bot & running full 650-rank 45-field scan on Kingdom #4198...")
        register_bot_on_screen(adb_serial, "4198", ch_level=2)
        subprocess.run(
            [
                sys.executable,
                os.path.join(SCRIPT_DIR, "unity_autonomous_scanner.py"),
                "--adb",
                adb_serial,
                "--mode",
                "kingdom-scan",
                "--kd",
                "4198",
                "--end-rank",
                "650",
                "--skip-switch",
                "--push",
            ],
            check=False,
        )
        log_msg("sidekick-mumu-1", "Completed 650-rank scan on Kingdom #4198!")

    # Switch back to #4194 on sidekick-mumu-1 to finish building CH8 #2 and run #4194 scan
    log_msg("sidekick-mumu-1", "Switching back to #4194 on 127.0.0.1:16416 to complete CH8 upgrades...")
    subprocess.run(
        [
            sys.executable,
            os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py"),
            "--adb",
            adb_serial,
            "--kingdom",
            "4194",
            "--mode",
            "switch",
        ],
        check=False,
    )
    subprocess.run(
        [
            sys.executable,
            os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py"),
            "--adb",
            adb_serial,
            "--kingdom",
            "4194",
            "--steps",
            "200",
        ],
        check=False,
    )
    register_bot_on_screen(adb_serial, "4194", ch_level=8)
    log_msg("sidekick-mumu-1", "Running #4194 scan with CH8 #2 on 127.0.0.1:16416...")
    subprocess.run(
        [
            sys.executable,
            os.path.join(SCRIPT_DIR, "unity_autonomous_scanner.py"),
            "--adb",
            adb_serial,
            "--mode",
            "kingdom-scan",
            "--kd",
            "4194",
            "--end-rank",
            "650",
            "--skip-switch",
            "--push",
        ],
        check=False,
    )


def main():
    log_msg("ORCHESTRATOR", "Starting Bastion Multi-Emulator Queue Orchestrator (#4194 x2 CH8 + #4197 + #4198)...")
    t0 = threading.Thread(target=mumu0_worker, daemon=False)
    t1 = threading.Thread(target=mumu1_worker, daemon=False)
    t0.start()
    t1.start()
    t0.join()
    t1.join()
    log_msg("ORCHESTRATOR", "All queued multi-emulator provisioning and 650-rank scan tasks finished!")


if __name__ == "__main__":
    main()
