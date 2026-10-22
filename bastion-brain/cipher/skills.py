"""Typed skills. A skill receives only a validated job and returns a SkillOutcome; it never builds
commands from free-form job text. Supported in Step 3: probe_status, grow_city (to CH8), sleep.
Everything else returns UNSUPPORTED_JOB_TYPE until its roadmap step lands."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from . import screen
from .adapters import sha256_hex

MAX_SUPPORTED_CH = 8
APP_BOOT_WAIT_SECONDS = 45
_STEP_RE = re.compile(r"^\[Step\s+(\d+)\]\s*(.*)$")
CH_REACHED_MARKER = "TARGET REACHED: City Hall Level 8"


def err(code: str, message: str, retryable: bool) -> Dict[str, Any]:
    return {"code": code, "message": message[:300], "retryable": retryable}


@dataclass
class Capture:
    png: bytes
    lines: List[str]
    screen_state: str
    matched_phrase: Optional[str]
    kingdom_id: Optional[int]


@dataclass
class SkillOutcome:
    status: str
    observed: Dict[str, Any] = field(default_factory=dict)
    error: Optional[Dict[str, Any]] = None
    metrics: Dict[str, Any] = field(default_factory=dict)


class SkillContext:
    def __init__(self, job, cfg, adb, ocr, runner, guard, deadline: datetime, clock, sleeper, detectors=(None, None)):
        self.job, self.cfg, self.adb, self.ocr = job, cfg, adb, ocr
        self.runner, self.guard = runner, guard
        self.deadline, self.clock, self.sleeper = deadline, clock, sleeper
        self.is_city_hud, self.is_world_map = detectors
        self.steps: List[Dict[str, Any]] = []
        self.last_capture: Optional[Capture] = None

    @property
    def serial(self) -> str:
        return self.job["adb_serial"]

    def step(self, action: str, detail: str) -> None:
        self.steps.append(
            {
                "step_index": len(self.steps) + 1,
                "action": action[:60],
                "detail": detail[:200],
                "timestamp": self.clock().strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
        )

    def seconds_left(self) -> float:
        return (self.deadline - self.clock()).total_seconds()

    def capture(self) -> Capture:
        png = self.adb.screencap_png(self.serial)
        lines = self.ocr.lines(png)
        running = self.adb.app_running(self.serial)
        arr = None
        try:
            import io

            import numpy as np
            from PIL import Image

            arr = np.array(Image.open(io.BytesIO(png)).convert("RGB"), dtype=int)
        except Exception:
            arr = None
        state, phrase = screen.classify(lines, running, arr, self.is_city_hud, self.is_world_map)
        cap = Capture(png, lines, state, phrase, screen.parse_kingdom(lines))
        self.last_capture = cap
        return cap


# --------------------------------------------------------------------------- parsers (pure, unit-tested)

def parse_grow_output(stdout: str) -> Dict[str, Any]:
    steps = []
    for line in stdout.splitlines():
        m = _STEP_RE.match(line.strip())
        if m:
            steps.append((int(m.group(1)), m.group(2)))
    return {"reached": CH_REACHED_MARKER in stdout, "script_steps": steps}


# --------------------------------------------------------------------------- skills

def probe_status(ctx: SkillContext) -> SkillOutcome:
    if ctx.job["args"].get("launch_if_closed") and not ctx.adb.app_running(ctx.serial):
        ctx.adb.launch_app(ctx.serial)
        ctx.step("launch_app", f"Wake: app was closed; launched and waiting {APP_BOOT_WAIT_SECONDS}s")
        ctx.sleeper(APP_BOOT_WAIT_SECONDS)
    cap = ctx.capture()
    ctx.step("capture", f"screen_state={cap.screen_state} ocr_lines={len(cap.lines)}")
    observed = {"screen_state": cap.screen_state, "kingdom_id": cap.kingdom_id}
    return SkillOutcome("SUCCEEDED", observed, metrics={"matched_phrase": cap.matched_phrase})


def sleep_instance(ctx: SkillContext) -> SkillOutcome:
    args = ctx.job["args"]
    if args["close_app"]:
        ctx.adb.force_stop_app(ctx.serial)
        ctx.step("force_stop_app", "Closed Rise of Kingdoms")
    ctx.step("sleep_marked", f"duration_minutes={args['duration_minutes']} reason={args.get('reason', 'unspecified')}")
    return SkillOutcome(
        "SUCCEEDED",
        {"screen_state": "SLEEP_APP_CLOSED" if args["close_app"] else "UNKNOWN", "kingdom_id": None},
        metrics={"duration_minutes": args["duration_minutes"], "app_closed": bool(args["close_app"])},
    )


def grow_city(ctx: SkillContext) -> SkillOutcome:
    args = ctx.job["args"]
    if args["target_ch_level"] > MAX_SUPPORTED_CH:
        return SkillOutcome(
            "FAILED",
            error=err("UNSUPPORTED_ARGS", f"grow_city supports target_ch_level <= {MAX_SUPPORTED_CH} (got {args['target_ch_level']})", False),
        )
    busy = ctx.guard.busy(ctx.serial)
    if busy:
        return SkillOutcome("FAILED", error=err("INSTANCE_BUSY", f"another script is driving {ctx.serial}: {busy}", True))

    if not ctx.adb.app_running(ctx.serial):
        ctx.adb.launch_app(ctx.serial)
        ctx.step("launch_app", f"App was closed; launched and waiting {APP_BOOT_WAIT_SECONDS}s")
        ctx.sleeper(APP_BOOT_WAIT_SECONDS)

    budget = ctx.seconds_left() - 30
    if budget < 60:
        return SkillOutcome("TIMEOUT", error=err("DEADLINE_TOO_CLOSE", "less than 90s left before the job deadline", False))

    script = str(ctx.cfg.scanner_dir / "auto_tutorial_ch8.py")
    argv = [
        ctx.cfg.python_exe, script,
        "--adb", ctx.serial,
        "--kingdom", str(ctx.job["kingdom_id"]),
        "--steps", str(args["max_steps"]),
    ]
    ctx.step("run_skill", f"auto_tutorial_ch8.py --steps {args['max_steps']} (timeout {int(budget)}s)")
    out = ctx.runner.run(argv, timeout=budget, cwd=str(ctx.cfg.scanner_dir))
    parsed = parse_grow_output(out.stdout)

    for idx, text in parsed["script_steps"][-ctx.cfg.max_steps_in_result:]:
        ctx.step("skill_log", f"[Step {idx:02d}] {text}")

    metrics = {"script_steps": len(parsed["script_steps"]), "returncode": out.returncode}
    if out.timed_out:
        return SkillOutcome("TIMEOUT", error=err("SKILL_TIMEOUT", f"auto_tutorial_ch8 exceeded {int(budget)}s", True), metrics=metrics)
    if out.returncode != 0:
        tail = out.stdout.strip().splitlines()[-1:] or [""]
        return SkillOutcome("FAILED", error=err("SKILL_EXIT_NONZERO", f"rc={out.returncode}: {tail[0]}", True), metrics=metrics)
    if parsed["reached"]:
        metrics["ch_level_source"] = "skill_stdout"
        return SkillOutcome("SUCCEEDED", {"ch_level": 8, "screen_state": "CITY_VIEW", "kingdom_id": None}, metrics=metrics)
    return SkillOutcome("PARTIAL", {"screen_state": "UNKNOWN", "kingdom_id": None}, metrics=metrics)


SKILLS: Dict[str, Callable[[SkillContext], SkillOutcome]] = {
    "probe_status": probe_status,
    "sleep": sleep_instance,
    "grow_city": grow_city,
}
