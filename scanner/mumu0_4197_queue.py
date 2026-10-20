#!/usr/bin/env python3
"""
===============================================================================
VALHEON BASTION — SIDEKICK-MUMU-0 (127.0.0.1:16384) #4194 -> #4197 AUTO-CHAIN
File: E:\\Unity\\scanner\\mumu0_4197_queue.py
===============================================================================
Waits for the active #4194 scan on 127.0.0.1:16384 to reach Rank 650, then
immediately provisions a character in Kingdom #4197 and runs a full 650-rank
45-field leaderboard scan on #4197 (while sidekick-mumu-1 scans #4198 in parallel).
===============================================================================
"""

import os
import sys
import json
import time
import subprocess
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def log_msg(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [mumu0-4197-chain] {msg}"
    print(line, flush=True)
    try:
        with open(os.path.join(SCRIPT_DIR, "bastion_multi_queue.log"), "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def main():
    adb_serial = "127.0.0.1:16384"
    prog_path = os.path.join(SCRIPT_DIR, "scan_progress_16384.json")
    log_msg("Armed on 127.0.0.1:16384 — waiting for #4194 scan to reach Rank 650...")

    while True:
        try:
            if os.path.exists(prog_path):
                with open(prog_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                running = bool(data.get("running"))
                cur_rank = int(data.get("currentRank") or 0)
                tgt_rank = int(data.get("targetRanks") or 650)
                status = str(data.get("status") or "")
                if not running or status == "COMPLETED" or cur_rank >= tgt_rank:
                    log_msg(f"#4194 scan finished on 127.0.0.1:16384 (rank={cur_rank}/{tgt_rank}, status={status})!")
                    break
        except Exception:
            pass
        time.sleep(10)

    log_msg("Starting Kingdom #4197 character provisioning on 127.0.0.1:16384...")
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

    log_msg("Launching full 650-rank 45-field leaderboard scan on Kingdom #4197 (127.0.0.1:16384)...")
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
    log_msg("Completed 650-rank 45-field leaderboard scan on Kingdom #4197!")


if __name__ == "__main__":
    main()
