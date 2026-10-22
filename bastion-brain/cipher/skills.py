"""Typed skills. A skill receives only a validated job and returns a SkillOutcome; it never builds
commands from free-form job text.

Supported in Step 5:
  * probe_status         — screenshot + OCR + HUD/map classification (optional wake)
  * sleep                — force-stop app and mark instance resting
  * grow_city            — auto_tutorial_ch8.py up to CH8
  * switch_character     — provision_neighbor_kingdom.py --mode switch
  * provision_character  — provision_neighbor_kingdom.py --mode create
  * scan_kingdom         — unity_autonomous_scanner.py --mode kingdom-scan
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from . import screen
from .adapters import sha256_hex

MAX_SUPPORTED_CH = 8
APP_BOOT_WAIT_SECONDS = 45
PROVISION_TUTORIAL_STEPS = 60
_STEP_RE = re.compile(r"^\[(?:Step\s+)?(\d+)(?:/\d+)?\]\s*(.*)$")
_PROV_DONE_RE = re.compile(r"\[DONE\]\s*Provisioned\s+#(\d{4})\s+character\s+\(([^,]+),\s*ID=(\d{5,15})\)")
_SWITCH_DONE_RE = re.compile(r"(?:Active on Kingdom|Already active on Kingdom)\s+#(\d{4})|already active \(green checkmark\)", re.IGNORECASE)
_SCAN_SYNC_RE = re.compile(r"Synced\s+(\d+)\s+accumulated|governorsExtracted[\"']?\s*:\s*(\d+)", re.IGNORECASE)
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


def parse_switch_output(stdout: str) -> Dict[str, Any]:
    steps = []
    for line in stdout.splitlines():
        m = _STEP_RE.match(line.strip())
        if m:
            steps.append((int(m.group(1)), m.group(2)))
    lower = stdout.lower()
    not_found = "not found in roster" in lower or "switch_not_found" in lower
    switched = bool(_SWITCH_DONE_RE.search(stdout)) and not not_found
    return {"switched": switched, "not_found": not_found, "script_steps": steps}


def parse_provision_output(stdout: str) -> Dict[str, Any]:
    steps = []
    for line in stdout.splitlines():
        m = _STEP_RE.match(line.strip())
        if m:
            steps.append((int(m.group(1)), m.group(2)))
    m_done = _PROV_DONE_RE.search(stdout)
    gov_name = m_done.group(2).strip() if m_done else None
    gov_id = m_done.group(3).strip() if m_done else None
    lower = stdout.lower()
    tutorial_incomplete = "tutorial_incomplete" in lower or "governor profile was not accessible" in lower
    not_found = "could not locate #" in lower or "needs_continent_select" in lower
    return {
        "provisioned": bool(m_done),
        "governor_id": gov_id,
        "governor_name": gov_name,
        "tutorial_incomplete": tutorial_incomplete,
        "kingdom_not_found": not_found,
        "script_steps": steps,
    }


def parse_scan_output(stdout: str) -> Dict[str, Any]:
    counts = [int(m.group(1) or m.group(2)) for m in _SCAN_SYNC_RE.finditer(stdout) if (m.group(1) or m.group(2))]
    completed = "completed" in stdout.lower() or "100.0%" in stdout.lower() or bool(counts)
    return {"completed": completed, "governors_extracted": max(counts) if counts else 0}


# --------------------------------------------------------------------------- helpers

def _ensure_ready_and_budget(ctx: SkillContext, min_budget: float = 60.0, margin: float = 30.0) -> Optional[SkillOutcome]:
    busy = ctx.guard.busy(ctx.serial)
    if busy:
        return SkillOutcome("FAILED", error=err("INSTANCE_BUSY", f"another script is driving {ctx.serial}: {busy}", True))
    if not ctx.adb.app_running(ctx.serial):
        ctx.adb.launch_app(ctx.serial)
        ctx.step("launch_app", f"App was closed; launched and waiting {APP_BOOT_WAIT_SECONDS}s")
        ctx.sleeper(APP_BOOT_WAIT_SECONDS)
    budget = ctx.seconds_left() - margin
    if budget < min_budget:
        return SkillOutcome("TIMEOUT", error=err("DEADLINE_TOO_CLOSE", f"less than {int(min_budget + margin)}s left before the job deadline", False))
    return None


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
    early = _ensure_ready_and_budget(ctx, min_budget=60.0, margin=30.0)
    if early is not None:
        return early

    budget = ctx.seconds_left() - 30
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


def switch_character(ctx: SkillContext) -> SkillOutcome:
    args = ctx.job["args"]
    target_kd = int(args["target_kingdom_id"])
    early = _ensure_ready_and_budget(ctx, min_budget=30.0, margin=15.0)
    if early is not None:
        return early

    budget = min(ctx.seconds_left() - 15, 240.0)
    script = str(ctx.cfg.scanner_dir / "provision_neighbor_kingdom.py")
    argv = [
        ctx.cfg.python_exe, script,
        "--adb", ctx.serial,
        "--kingdom", str(target_kd),
        "--mode", "switch",
    ]
    ctx.step("run_skill", f"provision_neighbor_kingdom.py --mode switch --kingdom {target_kd} (timeout {int(budget)}s)")
    out = ctx.runner.run(argv, timeout=budget, cwd=str(ctx.cfg.scanner_dir))
    parsed = parse_switch_output(out.stdout)

    for idx, text in parsed["script_steps"][-ctx.cfg.max_steps_in_result:]:
        ctx.step("skill_log", f"[{idx}/6] {text}")

    metrics = {"target_kingdom_id": target_kd, "returncode": out.returncode, "script_steps": len(parsed["script_steps"])}
    if out.timed_out:
        return SkillOutcome("TIMEOUT", error=err("SKILL_TIMEOUT", f"switch_character exceeded {int(budget)}s", True), metrics=metrics)
    if parsed["not_found"]:
        return SkillOutcome("FAILED", error=err("CHARACTER_NOT_FOUND", f"No character for #{target_kd} on {ctx.serial}", False), metrics=metrics)
    if out.returncode != 0:
        tail = out.stdout.strip().splitlines()[-1:] or [""]
        return SkillOutcome("FAILED", error=err("SKILL_EXIT_NONZERO", f"rc={out.returncode}: {tail[0]}", True), metrics=metrics)
    if parsed["switched"]:
        observed: Dict[str, Any] = {"screen_state": "CITY_VIEW", "kingdom_id": target_kd}
        if args.get("target_governor_id"):
            observed["governor_id"] = args["target_governor_id"]
        if args.get("target_governor_name"):
            observed["governor_name"] = args["target_governor_name"]
        return SkillOutcome("SUCCEEDED", observed, metrics=metrics)
    return SkillOutcome("PARTIAL", {"screen_state": "UNKNOWN", "kingdom_id": None}, metrics=metrics)


def provision_character(ctx: SkillContext) -> SkillOutcome:
    args = ctx.job["args"]
    target_kd = int(args["target_kingdom_id"])
    early = _ensure_ready_and_budget(ctx, min_budget=60.0, margin=30.0)
    if early is not None:
        return early

    budget = ctx.seconds_left() - 30
    script = str(ctx.cfg.scanner_dir / "provision_neighbor_kingdom.py")
    argv = [
        ctx.cfg.python_exe, script,
        "--adb", ctx.serial,
        "--kingdom", str(target_kd),
        "--mode", "create",
        "--tutorial-steps", str(PROVISION_TUTORIAL_STEPS),
    ]
    ctx.step("run_skill", f"provision_neighbor_kingdom.py --mode create --kingdom {target_kd} (timeout {int(budget)}s)")
    out = ctx.runner.run(argv, timeout=budget, cwd=str(ctx.cfg.scanner_dir))
    parsed = parse_provision_output(out.stdout)

    for idx, text in parsed["script_steps"][-ctx.cfg.max_steps_in_result:]:
        ctx.step("skill_log", f"[Step {idx:02d}] {text}")

    metrics = {
        "target_kingdom_id": target_kd,
        "account_id": args["account_id"],
        "character_slot": args["character_slot"],
        "returncode": out.returncode,
        "script_steps": len(parsed["script_steps"]),
    }
    if out.timed_out:
        return SkillOutcome("TIMEOUT", error=err("SKILL_TIMEOUT", f"provision_character exceeded {int(budget)}s", True), metrics=metrics)
    if parsed["kingdom_not_found"]:
        return SkillOutcome("FAILED", error=err("KINGDOM_NOT_FOUND", f"Kingdom #{target_kd} not located in Kingdom List", True), metrics=metrics)
    if out.returncode != 0:
        tail = out.stdout.strip().splitlines()[-1:] or [""]
        return SkillOutcome("FAILED", error=err("SKILL_EXIT_NONZERO", f"rc={out.returncode}: {tail[0]}", True), metrics=metrics)
    if parsed["provisioned"]:
        observed = {
            "screen_state": "CITY_VIEW",
            "kingdom_id": target_kd,
            "ch_level": 2,
            "governor_id": parsed["governor_id"],
            "governor_name": parsed["governor_name"],
        }
        return SkillOutcome("SUCCEEDED", observed, metrics=metrics)
    if parsed["tutorial_incomplete"]:
        return SkillOutcome(
            "PARTIAL",
            {"screen_state": "TUTORIAL_OVERLAY", "kingdom_id": target_kd, "ch_level": 2},
            metrics=metrics,
        )
    return SkillOutcome("PARTIAL", {"screen_state": "UNKNOWN", "kingdom_id": target_kd}, metrics=metrics)


def scan_kingdom(ctx: SkillContext) -> SkillOutcome:
    args = ctx.job["args"]
    target_kd = int(args["target_kingdom_id"])
    max_ranks = int(args["max_ranks"])
    early = _ensure_ready_and_budget(ctx, min_budget=60.0, margin=30.0)
    if early is not None:
        return early

    budget = ctx.seconds_left() - 30
    script = str(ctx.cfg.scanner_dir / "unity_autonomous_scanner.py")
    argv = [
        ctx.cfg.python_exe, script,
        "--adb", ctx.serial,
        "--mode", "kingdom-scan",
        "--kd", str(target_kd),
        "--end-rank", str(max_ranks),
        "--skip-switch",
        "--push",
    ]
    ctx.step("run_skill", f"unity_autonomous_scanner.py --kd {target_kd} --end-rank {max_ranks} (timeout {int(budget)}s)")
    out = ctx.runner.run(argv, timeout=budget, cwd=str(ctx.cfg.scanner_dir))
    parsed = parse_scan_output(out.stdout)

    metrics = {
        "target_kingdom_id": target_kd,
        "max_ranks": max_ranks,
        "governors_extracted": parsed["governors_extracted"],
        "returncode": out.returncode,
    }
    if out.timed_out:
        return SkillOutcome("TIMEOUT", error=err("SKILL_TIMEOUT", f"scan_kingdom exceeded {int(budget)}s", True), metrics=metrics)
    if out.returncode != 0:
        tail = out.stdout.strip().splitlines()[-1:] or [""]
        return SkillOutcome("FAILED", error=err("SKILL_EXIT_NONZERO", f"rc={out.returncode}: {tail[0]}", True), metrics=metrics)
    return SkillOutcome("SUCCEEDED", {"screen_state": "RANKINGS_BOARD", "kingdom_id": target_kd}, metrics=metrics)


SKILLS: Dict[str, Callable[[SkillContext], SkillOutcome]] = {
    "probe_status": probe_status,
    "sleep": sleep_instance,
    "grow_city": grow_city,
    "switch_character": switch_character,
    "provision_character": provision_character,
    "scan_kingdom": scan_kingdom,
}
