"""CIPHER entrypoint.   python -m cipher [--check] [--once] [--dry-run] [--settings PATH]

Run from the bastion-brain directory (so `contracts` and `cipher` import), using the SIDEKICK venv:
    cd C:\\UnityScanner\\bastion-brain
    C:\\UnityScanner\\.venv\\Scripts\\python.exe -m cipher --check
"""

from __future__ import annotations

import argparse
import signal
import sys
import threading
from pathlib import Path

from . import __version__
from .adapters import Adb, PowerShellGuard, RapidOcr, S3Evidence, SqsTransport, SubprocessRunner
from .config import ALL_INSTANCES, DEFAULT_SETTINGS_FILE, CipherConfig
from .executor import Executor
from .ledger import Ledger
from .screen import load_detectors


def build_executor(cfg: CipherConfig) -> Executor:
    transport = SqsTransport(cfg)
    evidence = S3Evidence(cfg)
    adb = Adb(cfg.resolved_adb())
    detectors = load_detectors(str(cfg.scanner_dir))
    return Executor(cfg, transport, evidence, adb, RapidOcr(), SubprocessRunner(), PowerShellGuard(),
                    Ledger(cfg.ledger_path), detectors=detectors)


def run_check(cfg: CipherConfig) -> int:
    """Read-only preflight: settings, AWS reachability (no messages consumed), adb, skill scripts."""
    ok = True

    def line(label: str, good: bool, detail: str = "") -> None:
        nonlocal ok
        ok = ok and good
        print(f"[{'OK' if good else 'FAIL'}] {label}{(' - ' + detail) if detail else ''}")

    problems = cfg.problems()
    line("settings", not problems, "; ".join(problems) or f"region={cfg.region}")
    if not problems:
        try:
            t = SqsTransport(cfg)
            for name, url in (("jobs queue", cfg.jobs_queue_url), ("results queue", cfg.results_queue_url)):
                attrs = t.sqs.get_queue_attributes(QueueUrl=url, AttributeNames=["ApproximateNumberOfMessages"])
                line(name, True, f"visible={attrs['Attributes']['ApproximateNumberOfMessages']}")
        except Exception as exc:
            line("sqs", False, f"{type(exc).__name__}: {str(exc)[:160]}")
    adb = Adb(cfg.resolved_adb())
    online_emulators = 0
    for inst in cfg.served_instances:
        from contracts.validator import INSTANCE_TO_ADB

        serial = INSTANCE_TO_ADB[inst]
        try:
            running = adb.app_running(serial)
            online_emulators += 1
            line(f"adb {inst} ({serial})", True, f"RoK running={running}")
        except Exception as exc:
            print(f"[WARN] adb {inst} ({serial}) - powered off or unreachable ({str(exc)[:100]})")
    line("emulator fleet", online_emulators > 0, f"{online_emulators}/{len(cfg.served_instances)} instance(s) online")
    for script in ("auto_tutorial_ch8.py",):
        line(f"skill script {script}", (cfg.scanner_dir / script).exists())
    print("PREFLIGHT " + ("PASSED" if ok else "FAILED"))
    return 0 if ok else 1


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="cipher", description=f"CIPHER executor v{__version__}")
    p.add_argument("--settings", default=DEFAULT_SETTINGS_FILE, help="KEY=VALUE settings/credentials file")
    p.add_argument("--check", action="store_true", help="read-only preflight, then exit")
    p.add_argument("--once", action="store_true", help="drain currently queued jobs, then exit")
    p.add_argument("--dry-run", action="store_true", help="validate and acknowledge jobs without touching any emulator")
    p.add_argument("--instances", nargs="*", default=None, help="restrict to these instance ids")
    args = p.parse_args(argv)

    cfg = CipherConfig.load(args.settings, dry_run=args.dry_run)
    if args.instances:
        cfg.served_instances = tuple(args.instances)

    if args.check:
        return run_check(cfg)
    problems = cfg.problems()
    if problems:
        print("CIPHER cannot start: " + "; ".join(problems), file=sys.stderr)
        return 2

    ex = build_executor(cfg)
    if args.once:
        n = ex.run_once()
        print(f"handled {n} job(s)")
        return 0

    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, lambda *_: stop.set())
        except ValueError:
            pass
    ex.run_forever(stop)
    return 0


if __name__ == "__main__":
    sys.exit(main())
