"""Local idempotency ledger: redelivered jobs replay the stored result instead of re-driving a device."""

from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

RETENTION_SECONDS = 7 * 24 * 3600
MAX_ENTRIES = 2000


class Ledger:
    def __init__(self, path: Path, clock=time.time):
        self.path = Path(path)
        self.clock = clock
        self._lock = threading.Lock()
        self._data: Dict[str, Dict[str, Any]] = {}
        if self.path.exists():
            try:
                self._data = json.loads(self.path.read_text(encoding="utf-8"))
            except Exception:
                corrupt = self.path.with_suffix(".corrupt")
                try:
                    os.replace(self.path, corrupt)
                except OSError:
                    pass
                self._data = {}

    def get(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            entry = self._data.get(idempotency_key)
            return entry["result"] if entry else None

    def put(self, idempotency_key: str, result: Dict[str, Any]) -> None:
        with self._lock:
            now = self.clock()
            self._data[idempotency_key] = {"stored_at": now, "result": result}
            cutoff = now - RETENTION_SECONDS
            self._data = {k: v for k, v in self._data.items() if v["stored_at"] >= cutoff}
            if len(self._data) > MAX_ENTRIES:
                keep = sorted(self._data.items(), key=lambda kv: kv[1]["stored_at"])[-MAX_ENTRIES:]
                self._data = dict(keep)
            self._flush()

    def _flush(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._data), encoding="utf-8")
        os.replace(tmp, self.path)
