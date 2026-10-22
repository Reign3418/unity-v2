"""Brain entrypoint.

Railway:  python -m brain                      (env vars from the service; runs forever)
Local:    python -m brain --env-file .env.railway --once [--simulate-time 2026-10-22T06:30:00Z]

--simulate-time always forces DRY_RUN so a simulated clock can never dispatch real jobs.
"""

from __future__ import annotations

import argparse
import os
import signal
import sys
import threading
from datetime import datetime, timezone

from .config import BrainConfig, load_env_file
from .runtime import Brain
from .store import DynamoStore
from .transport import SqsBrainTransport


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="brain")
    ap.add_argument("--env-file", default=None, help="KEY=VALUE file (local runs only)")
    ap.add_argument("--once", action="store_true", help="run a single tick and exit")
    ap.add_argument("--simulate-time", default=None, help="ISO UTC time for a DRY_RUN rehearsal tick")
    args = ap.parse_args(argv)

    env = dict(os.environ)
    if args.env_file:
        env.update(load_env_file(args.env_file))
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
    transport = SqsBrainTransport(cfg)
    if args.simulate_time:
        from .store import NullTransport, ReadOnlyOverlay

        store, transport = ReadOnlyOverlay(store), NullTransport()
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
