"""Local, AWS-free probe of the real CIPHER pipeline (real adb + OCR + HUD detectors, in-memory queue).

Read-only: takes a screenshot and checks whether the game is running. Never taps or launches anything.
    C:\\UnityScanner\\.venv\\Scripts\\python.exe tools\\local_probe.py [--instances sidekick-mumu-0 ...]
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cipher.adapters import Adb, FakeGuard, FakeRunner, MemoryTransport, RapidOcr  # noqa: E402
from cipher.config import CipherConfig  # noqa: E402
from cipher.executor import Executor  # noqa: E402
from cipher.ledger import Ledger  # noqa: E402
from cipher.screen import load_detectors  # noqa: E402
from contracts import validator as V  # noqa: E402
from tools.smoke_test import build_job  # noqa: E402


class LocalEvidence:
    def __init__(self, folder: Path):
        self.folder = folder
        folder.mkdir(parents=True, exist_ok=True)

    def put_png(self, instance_id: str, job_id: str, png: bytes) -> str:
        path = self.folder / f"{instance_id}_{job_id}.png"
        path.write_bytes(png)
        return str(path)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--instances", nargs="*", default=list(V.INSTANCE_TO_ADB))
    ap.add_argument("--out", default=str(Path(tempfile.gettempdir()) / "cipher_local_probe"))
    args = ap.parse_args()

    out = Path(args.out)
    cfg = CipherConfig(state_dir=out / "state")
    adb = Adb(cfg.resolved_adb())
    jobs = [
        build_job("probe_status", inst, 4021, f"bot_probe_{n:04d}", 10)
        for n, inst in enumerate(args.instances)
    ]
    transport = MemoryTransport([json.dumps(j) for j in jobs])
    ex = Executor(cfg, transport, LocalEvidence(out / "evidence"), adb, RapidOcr(), FakeRunner(), FakeGuard(),
                  Ledger(cfg.ledger_path), detectors=load_detectors(str(cfg.scanner_dir)))
    ex.log = lambda *a, **k: None  # keep stdout for the summary
    handled = ex.run_once()
    rc = 0
    print(f"handled={handled} results={len(transport.results)}")
    for body in transport.results:
        res = json.loads(body)
        V.validate_job_result(res)
        ev = res["evidence"]
        print(f"- {res['instance_id']}: {res['status']} screen={res['observed_state']['screen_state']} "
              f"kingdom={res['observed_state']['kingdom_id']} ocr_lines={len(ev['ocr_lines'])} "
              f"sha={str(ev['screenshot_sha256'])[:12]} png={ev['screenshot_uri']} err={res.get('error')}")
        if res["status"] != "SUCCEEDED":
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
