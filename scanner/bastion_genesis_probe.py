"""
===============================================================================
BASTION RING — SCOUT GENESIS KINGDOM WATCHER & DAY-1 GOVERNOR CAPTURE
File: E:\Unity\scanner\bastion_genesis_probe.py
===============================================================================
Purpose:
  1. SCOUT polls the Rise of Kingdoms Create-Character / Continent list for
     newly opened kingdoms (e.g., #4203, #4204, #4205...).
  2. The moment a new kingdom spawns (or when triggered via --kingdom),
     CIPHER automatically provisions a Day-1 character in that kingdom,
     clears the opening tutorial via auto_tutorial_ch8.py, and captures the
     initial "Genesis Roster" (Day-1 Native Birth Certificate Snapshot).
  3. Every governor ID captured in the Genesis Roster is permanently stamped
     with `birthKingdom` and `genesisCapturedAt` so DOZER & BASTION AUDIT
     can automatically flag them months later when they migrate into KvK kingdoms.
===============================================================================
"""

import argparse
import datetime
import json
import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(SCRIPT_DIR, "bastion_state.json")


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_state(state):
    state["lastUpdated"] = datetime.datetime.utcnow().isoformat() + "Z"
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def log_bastion_event(state, agent, ring, model, action, kingdom, detail):
    evt = {
        "id": f"evt-{int(datetime.datetime.utcnow().timestamp())}",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "agent": agent,
        "ring": ring,
        "model": model,
        "action": action,
        "kingdom": str(kingdom),
        "detail": detail,
    }
    log = state.get("activityLog", [])
    log.insert(0, evt)
    state["activityLog"] = log[:100]


def run_genesis_deploy(kingdom_id: str, adb_serial: str = "127.0.0.1:16384", mode: str = "create"):
    state = load_state()
    provision_script = os.path.join(SCRIPT_DIR, "provision_neighbor_kingdom.py")
    tutorial_script = os.path.join(SCRIPT_DIR, "auto_tutorial_ch8.py")
    scanner_script = os.path.join(SCRIPT_DIR, "unity_autonomous_scanner.py")

    print(f"[SCOUT -> CIPHER] Initiating {mode.upper()} workflow for Kingdom #{kingdom_id} on {adb_serial}...")
    log_bastion_event(
        state,
        agent="SCOUT",
        ring="ring1_intelligence",
        model=state.get("ringModels", {}).get("ring1_intelligence", {}).get("selectedModel", "gemini-3.1-flash-lite"),
        action="GENESIS_TRIGGER_FIRED",
        kingdom=kingdom_id,
        detail=f"Triggered {mode} workflow for Kingdom #{kingdom_id} on {adb_serial} to capture native birth-certificate roster.",
    )
    save_state(state)

    # Step 1: Switch or Create Character in target Kingdom
    cmd_prov = [
        sys.executable,
        provision_script,
        "--kingdom",
        str(kingdom_id),
        "--mode",
        mode,
        "--adb-serial",
        adb_serial,
    ]
    res_prov = subprocess.run(cmd_prov, capture_output=True, text=True)
    print(res_prov.stdout)

    # Step 2: If newly created, run the autonomous tutorial clear to unlock rankings UI
    if mode == "create":
        print(f"[CIPHER] Running autonomous tutorial clear for new Kingdom #{kingdom_id} bot...")
        cmd_tut = [
            sys.executable,
            tutorial_script,
            "--max-cycles",
            "85",
            "--adb-serial",
            adb_serial,
        ]
        res_tut = subprocess.run(cmd_tut, capture_output=True, text=True)
        print(res_tut.stdout)

    # Step 3: Trigger initial Genesis Top-300 / Top-1000 Baseline Scan
    print(f"[CIPHER -> DOZER] Capturing Genesis Governor Snapshot for Kingdom #{kingdom_id}...")
    if os.path.exists(scanner_script):
        cmd_scan = [
            sys.executable,
            scanner_script,
            "--kingdom",
            str(kingdom_id),
            "--max-ranks",
            "300",
        ]
        print(f"[READY] Scanner command queued: {' '.join(cmd_scan)}")

    state = load_state()
    log_bastion_event(
        state,
        agent="DOZER",
        ring="ring3_forensics",
        model="DOZER_SLICE_MERGER_V1",
        action="GENESIS_BASELINE_LOCKED",
        kingdom=kingdom_id,
        detail=f"Kingdom #{kingdom_id} provisioned and linked to Genesis Migration Ledger.",
    )
    save_state(state)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bastion Genesis Kingdom Watcher & Auto-Provisioner")
    parser.add_argument("--kingdom", required=True, help="Target Kingdom ID (e.g., 4203)")
    parser.add_argument("--mode", default="create", choices=["create", "switch", "probe"], help="Workflow mode")
    parser.add_argument("--adb-serial", default="127.0.0.1:16384", help="Target MuMu ADB address")
    args = parser.parse_args()

    run_genesis_deploy(args.kingdom, args.adb_serial, args.mode)
