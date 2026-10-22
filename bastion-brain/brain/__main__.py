"""Brain entrypoint.

Railway / Daemon: python -m brain                      (env vars from the service; runs forever)
Local single tick: python -m brain --env-file .env.railway --once [--simulate-time 2026-10-22T06:30:00Z]
Self-heal rehearsal: python -m brain --env-file .env.railway --simulate-bot-lost bot_4021_m1

--simulate-time and --simulate-bot-lost always use ReadOnlyOverlay + in-memory transport so a rehearsal
never writes to DynamoDB or dispatches real jobs to SQS.
"""

from __future__ import annotations

import argparse
import os
import signal
import sys
import threading
from datetime import datetime, timedelta, timezone

from .config import BrainConfig, load_env_file
from .runtime import Brain
from .store import DynamoStore
from .transport import SqsBrainTransport


def _run_loss_rehearsal(base_store, cfg: BrainConfig, bot_id: str, clock) -> int:
    from .store import ReadOnlyOverlay
    from .transport import MemoryBrainTransport

    store = ReadOnlyOverlay(base_store)
    store.put_control("BRAIN_LEASE", {"holder_id": cfg.node_id, "forced_leader": cfg.node_id})
    transport = MemoryBrainTransport()
    cfg.results_wait_seconds = 0
    brain = Brain(cfg, store, transport, **({"clock": clock} if clock else {}), strict_events=True, force_mode="AUTONOMOUS")

    bots = store.get_bots([bot_id])
    target = bots.get(bot_id)
    if not target:
        print(f"rehearsal error: bot {bot_id!r} not found in BastionBots", file=sys.stderr)
        return 2

    brain._update_mode()
    brain.ring3.declare_bot_lost(
        target,
        why=f"Rehearsal simulation: {bot_id} declared LOST by AUDIT to verify self-healing replacement loop.",
        inputs={"simulation": True},
    )

    # Tick 1: Ring 2 proposes & dispatches provision_character (or emits HUMAN_ACCOUNT_REQUIRED if 2/2 full)
    s1 = brain.tick()
    prov_jobs = [j for j in transport.sent if j["job_type"] == "provision_character" and j["instance_id"] == target["instance_id"]]
    if prov_jobs:
        pjob = prov_jobs[-1]
        t0 = brain.clock()
        transport.push_result({
            "job_id": pjob["job_id"],
            "idempotency_key": pjob["idempotency_key"],
            "correlation_id": pjob["correlation_id"],
            "job_type": "provision_character",
            "instance_id": pjob["instance_id"],
            "bot_id": pjob["bot_id"],
            "kingdom_id": pjob["kingdom_id"],
            "status": "SUCCEEDED",
            "started_at": t0.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "completed_at": (t0 + timedelta(minutes=8)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "duration_ms": 8 * 60000,
            "observed_state": {
                "screen_state": "CITY_VIEW",
                "kingdom_id": pjob["kingdom_id"],
                "ch_level": 2,
                "power": 2400,
                "governor_id": "236999888",
                "governor_name": f"GovRep{pjob['kingdom_id']}",
            },
            "steps_executed": [{"step_index": 1, "action": "provision_character", "detail": "spawned replacement", "timestamp": t0.strftime("%Y-%m-%dT%H:%M:%SZ")}],
            "evidence": {"screenshot_uri": f"s3://rehearsal/{pjob['job_id']}.png", "screenshot_sha256": "b" * 64, "ocr_lines": ["City"]},
            "error": None,
        })
        # Tick 2: Ring 3 verifies replacement (PROVISIONING -> GROWING, old LOST -> RETIRED);
        # then Tick 3: Ring 2 dispatches grow_city -> Ring 3 verifies CH8 (GROWING -> ACTIVE)
        brain.tick()
        brain.tick()
        grow_jobs = [j for j in transport.sent if j["job_type"] == "grow_city" and j["instance_id"] == target["instance_id"]]
        if grow_jobs:
            gjob = grow_jobs[-1]
            transport.push_result({
                "job_id": gjob["job_id"],
                "idempotency_key": gjob["idempotency_key"],
                "correlation_id": gjob["correlation_id"],
                "job_type": "grow_city",
                "instance_id": gjob["instance_id"],
                "bot_id": gjob["bot_id"],
                "kingdom_id": gjob["kingdom_id"],
                "status": "SUCCEEDED",
                "started_at": t0.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "completed_at": (t0 + timedelta(minutes=25)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "duration_ms": 17 * 60000,
                "observed_state": {"screen_state": "CITY_VIEW", "kingdom_id": gjob["kingdom_id"], "ch_level": 8, "power": 28500},
                "steps_executed": [{"step_index": 1, "action": "grow_city", "detail": "reached CH8", "timestamp": t0.strftime("%Y-%m-%dT%H:%M:%SZ")}],
                "evidence": {"screenshot_uri": f"s3://rehearsal/{gjob['job_id']}.png", "screenshot_sha256": "c" * 64, "ocr_lines": ["CH8"]},
                "error": None,
            })
            brain.tick()

    print(f"\nSELF-HEALING REHEARSAL for {bot_id} (read-only overlay: nothing written to AWS, nothing dispatched)")
    for ev in store.events:
        print(f"  [{ev['actor']:>7}] {ev['event_type']:<22} {ev['summary']}")
        for c in ev["oversight"].get("numnum_checks", []):
            if c["rule_id"] == "ACCOUNT_SLOT_LIMIT_2_PER_KINGDOM" or not c["passed"]:
                print(f"            {'PASS' if c['passed'] else 'FAIL'} {c['rule_id']}: {c['detail']}")
    return 1 if s1["errors"] else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="brain")
    ap.add_argument("--env-file", default=None, help="KEY=VALUE file (local runs only)")
    ap.add_argument("--node-id", default=None, help="Override BRAIN_NODE_ID (e.g., railway-primary, sidekick, mixerv3)")
    ap.add_argument("--node-role", default=None, help="Override BRAIN_NODE_ROLE (PRIMARY or STANDBY)")
    ap.add_argument("--node-priority", type=int, default=None, help="Override BRAIN_NODE_PRIORITY (1=Primary, 2=Sidekick, 3=MixerV3)")
    ap.add_argument("--once", action="store_true", help="run a single tick and exit")
    ap.add_argument("--simulate-time", default=None, help="ISO UTC time for a DRY_RUN rehearsal tick")
    ap.add_argument("--simulate-bot-lost", default=None, help="bot_id for a read-only self-healing replacement rehearsal")
    args = ap.parse_args(argv)

    env = dict(os.environ)
    if args.env_file:
        env.update(load_env_file(args.env_file))
    if args.node_id:
        env["BRAIN_NODE_ID"] = args.node_id
    if args.node_role:
        env["BRAIN_NODE_ROLE"] = args.node_role
    if args.node_priority is not None:
        env["BRAIN_NODE_PRIORITY"] = str(args.node_priority)
    cfg = BrainConfig.from_env(env)
    problems = cfg.problems()
    if problems:
        print("brain cannot start: " + "; ".join(problems), file=sys.stderr)
        return 2

    clock = None
    force_mode = None
    if args.simulate_time:
        fixed = datetime.fromisoformat(args.simulate_time.replace("Z", "+00:00")).astimezone(timezone.utc)
        clock = lambda: fixed  # noqa: E731
        force_mode = "DRY_RUN"
        cfg.results_wait_seconds = 1

    store = DynamoStore(cfg)
    if args.simulate_bot_lost:
        return _run_loss_rehearsal(store, cfg, args.simulate_bot_lost, clock)

    transport = SqsBrainTransport(cfg)
    if args.simulate_time:
        from .store import NullTransport, ReadOnlyOverlay

        store, transport = ReadOnlyOverlay(store), NullTransport()
        store.put_control("BRAIN_LEASE", {"holder_id": cfg.node_id, "forced_leader": cfg.node_id})
    brain = Brain(cfg, store, transport, **({"clock": clock} if clock else {}), force_mode=force_mode)

    if args.simulate_time:
        summary = brain.tick()
        print(f"\nREHEARSAL at {args.simulate_time} (read-only: nothing written to AWS, nothing dispatched)")
        for ev in store.events:
            print(f"  [{ev['actor']:>7}] {ev['event_type']:<15} {ev['summary']}")
            for c in ev["oversight"].get("numnum_checks", []):
                print(f"            {'PASS' if c['passed'] else 'FAIL'} {c['rule_id']}: {c['detail']}")
        return 1 if summary["errors"] else 0

    if args.once:
        summary = brain.tick()
        return 1 if summary["errors"] else 0

    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, lambda *_: stop.set())
        except ValueError:
            pass
    brain.run_forever(stop)
    return 0


if __name__ == "__main__":
    sys.exit(main())
