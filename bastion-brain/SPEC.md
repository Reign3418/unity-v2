# Bastion Brain — System Specification (`SPEC.md`)

| Field | Value |
| :--- | :--- |
| **Service Name** | `bastion-brain` |
| **Runtime** | Python 3.11+ Asynchronous Worker on **Railway** (no inbound public HTTP port) |
| **Default Operating Mode** | `AUTONOMOUS` with full **Oversight & Decision Audit Logging** |
| **State & Transport** | AWS DynamoDB (`BastionBots`, `BastionEvents`, `BastionIntents`) + AWS SQS (`bastion-jobs.fifo`, `bastion-results`) |
| **Executor** | `CIPHER` on `SIDEKICK` (`sidekick-mumu-0`, `sidekick-mumu-1`, `sidekick-mumu-2`) |
| **Front Door** | **Unity** (`https://unity-v2-azure.vercel.app/bastion`) |

---

## 1. Architecture & Why This Directory Lives in the Repo

### 1.1 How Local Git vs. Cloud Production Works
During development, files are authored in `E:\Unity\bastion-brain\` and committed to GitHub (`github.com/Reign3418/unity-v2`).
- **`E:\Unity\` is only a local drafting folder.** Once committed and pushed to GitHub:
  - **Vercel** pulls from GitHub to deploy the Unity web dashboard and APIs.
  - **Railway** pulls `/bastion-brain` directly from GitHub to build and run the 24/7 Python brain in the cloud.
  - **SIDEKICK** runs the local emulator skills and pulls typed jobs from AWS SQS.
- **`MIXERV3` (`E:\`) is NOT in the runtime loop.** You can play games, work on other projects, or power `MIXERV3` completely off — the Bastion Brain continues running 24/7 on Railway.

### 1.2 Core Design Principles
1. **LLMs Plan; Deterministic Code Controls:** Ring leaders (`SCOUT`, `TANK`, `AUDIT`) emit structured JSON plans and evaluations. `NUMNUM` (rule-based gate) validates every plan against hard safety rules. `CIPHER` executes pre-vetted Python skills on `SIDEKICK`. No LLM ever generates raw shell commands or raw ADB coordinates.
2. **Unity Is the Single Front Door:** R5 requests, kingdom data leads, and operator controls enter through Unity (`BastionIntents`). All telemetry, bot states, and oversight logs flow back to Unity (`BastionBots`, `BastionEvents`).
3. **Strict Separation of Ring Authority:**
   - **Ring 1 (`SCOUT` + `KENT` + `NULL`):** Emits intelligence `SIGNAL` events only. Cannot dispatch jobs.
   - **Ring 2 (`TANK` + `BIG_JON` + `NUMNUM` + `CIPHER`):** Only ring authorized to propose plans and dispatch typed jobs to `bastion-jobs.fifo` after passing `NUMNUM`.
   - **Ring 3 (`AUDIT` + `DOZER`):** Only ring authorized to mark facts verified (`FACT_VERIFIED`), transition verified bot state (`BOT_STATE_CHANGED`), or declare a character lost (`BOT_LOST`).
4. **Full Operator Oversight (`AUTONOMOUS` Mode):** The rings operate autonomously by default, but every action emits a rich `BastionEvent` record with plain-English reasoning (`oversight.why`), triggering inputs, every `NUMNUM` rule check passed/failed, token usage, and screenshot/OCR proof.

---

## 2. The Bastion MoE Ring Roster

### 2.1 Ring Leaders (LLM / SLM)
| Ring | Leader | Default Model | Role & Authority |
| :--- | :--- | :--- | :--- |
| **Ring 1 — Intelligence** | **`SCOUT`** | `gemini-2.5-flash-lite` | Synthesizes R5 intents, API demand signals, and kingdom telemetry deltas into prioritized `SIGNAL` events. Can spawn Ring 1 helpers. |
| **Ring 2 — Operations** | **`TANK`** | `gemini-2.5-flash` | Converts `SIGNAL` events and bot routine schedules into concrete job plans (`probe_status`, `grow_city`, `scan_kingdom`, `gather`, `train_troops`, `research`, `sleep`, `locate_governor`). Can spawn Ring 2 helpers. |
| **Ring 3 — Forensics** | **`AUDIT`** | `gemini-2.5-pro` | Evaluates job results, OCR/screenshot evidence, and anomaly patterns. Transitions bot lifecycle states, verifies kingdom scans, and triggers self-healing via `BOT_LOST`. Can spawn Ring 3 helpers. |

### 2.2 Rule-Based Ring Members (Deterministic Python — 0 LLM Tokens)
| Member | Ring | Role |
| :--- | :--- | :--- |
| **`KENT`** | Ring 1 | Polls `BastionIntents` and Unity API traffic counters; normalizes R5 requests and user demand spikes into structured intake records. |
| **`NULL`** | Ring 1 | Computes scan-age staleness, power/KP delta thresholds, and new-kingdom opening timers. |
| **`BIG_JON`** | Ring 2 | Enforces emulator instance preemption and concurrency (1 active character per MuMu instance at a time; R5 missions preempt routine farming/upgrading; idle bots sleep). |
| **`NUMNUM`** | Ring 2 | Hard deterministic policy gate. Checks sleep windows, session duration caps, daily active-minute caps, job schema bounds, idempotency keys, and account-slot limits before any job reaches SQS. |
| **`CIPHER`** | Ring 2 (on SIDEKICK) | Long-polls `bastion-jobs.fifo`, validates incoming job JSON against `contracts/jobs.schema.json`, runs the mapped Python skill (`auto_tutorial_ch8.py`, `provision_neighbor_kingdom.py`, `unity_autonomous_scanner.py`, etc.), and posts `BastionJobResult` to `bastion-results`. |
| **`DOZER`** | Ring 3 | Runs deterministic OCR arithmetic checks, governor roster slice deduplication, and screenshot hash verification before `AUDIT` signs off. |

### 2.3 Bounded Helper Templates
Ring leaders may spawn temporary helpers from the fixed registry in [`contracts/helpers.schema.json`](./contracts/helpers.schema.json):
- **Ring 1 Helpers:** `R1_KINGDOM_WATCHER`, `R1_LEAD_TRIAGE`
- **Ring 2 Helpers:** `R2_COHORT_SCHEDULER`, `R2_REPLACEMENT_PLANNER`
- **Ring 3 Helpers:** `R3_MIGRATION_ANALYST`, `R3_BAN_INVESTIGATOR`

Guardrails enforced in code:
- Max **3 concurrent helpers** per ring.
- Helper model tier cannot exceed its parent ring leader's tier.
- Helpers cannot spawn sub-helpers (max depth = 1).
- Max TTL = **24 hours** or task completion.
- Every `HELPER_SPAWNED` and `HELPER_RETIRED` event is logged to the Oversight feed.

---

## 3. Account Pool & Self-Healing Boundary

Rise of Kingdoms allows each Google account to create **up to 2 characters per kingdom** across many different kingdoms.
1. **Existing Account Pool:** The fleet uses the Google accounts already signed into `SIDEKICK`'s MuMu instances (`mumu-account-0` on `127.0.0.1:16384`, `mumu-account-1` on `127.0.0.1:16416`, `mumu-account-2` on `127.0.0.1:16448`).
2. **Automatic Character Provisioning & Replacement:**
   - When `AUDIT` confirms a character is lost (`BOT_LOST`) or Unity requests coverage in a new kingdom, `TANK` invokes `R2_REPLACEMENT_PLANNER`.
   - `NUMNUM` inspects the `BastionAccountSlotPool` to find a healthy account with `< 2` characters in the target kingdom.
   - If a slot is available, `TANK` dispatches `provision_character` followed by `grow_city` (to CH8) and transitions the new character into `ACTIVE` service automatically.
3. **Human Escalation Boundary (`HUMAN_ACCOUNT_REQUIRED`):**
   - We do **not** automate Gmail creation or Google Play sign-in (which trigger SMS/CAPTCHA blocks).
   - If all accounts already hold 2 characters in the target kingdom, or if an entire Google account is locked/banned (`ACCOUNT_LOCKED_OR_BANNED`), the brain logs a `CRITICAL` `HUMAN_ACCOUNT_REQUIRED` event in Unity `/bastion` with exact instructions on which emulator instance needs a fresh login.

---

## 4. Living Like a New Player (Anti-Detection Routine)

Every bot in `BastionBots` carries a `routine_profile` enforced by `NUMNUM`:
- **Sleep Window:** Default 7–8 continuous hours per 24h in the bot's assigned timezone where no routine jobs may be scheduled.
- **Session Pacing:** Max session length (`45–90 min`), mandatory break between routine sessions (`20–60 min`), and daily active cap (`240–360 min/day`).
- **Organic Progression Loop:** When awake and not assigned an R5 mission (`scan_kingdom`, `locate_governor`), `TANK` cycles the bot through new-player progression:
  1. `collect_rewards` & `alliance_help`
  2. `grow_city` (buildings & City Hall toward target CH level)
  3. `research` & `train_troops`
  4. `gather` (send marches to resource nodes before going idle)
  5. `sleep` (close/idle game until next scheduled wake window)

---

## 5. Detailed Oversight & Decision Audit Log

Every decision across all three rings writes a structured `BastionEvent` (defined in [`contracts/events.schema.json`](./contracts/events.schema.json)) containing:
- `correlation_id`: Traces an entire chain end-to-end (`INTENT_RECEIVED` → `SIGNAL` → `PLAN_PROPOSED` → `PLAN_APPROVED` → `JOB_DISPATCHED` → `JOB_RESULT` → `FACT_VERIFIED`).
- `oversight.why`: Plain-English explanation of why the leader or rule member took the action.
- `oversight.trigger_inputs`: Key metrics/signals that triggered the decision.
- `oversight.numnum_checks`: Explicit pass/fail table for every safety rule checked (`SLEEP_WINDOW`, `DAILY_ACTIVE_CAP`, `INSTANCE_MUTEX`, `ACCOUNT_SLOT_CAP`, `JOB_COOLDOWN`, `TOKEN_BUDGET`).
- `oversight.evidence_refs`: Screenshot paths, SHA-256 hashes, and OCR extracts from `CIPHER` / `DOZER`.

---

## 6. Contract Files in `bastion-brain/contracts/`

| File | Purpose |
| :--- | :--- |
| [`contracts/jobs.schema.json`](./contracts/jobs.schema.json) | Typed job requests (`BastionJob`) and execution results (`BastionJobResult`) |
| [`contracts/events.schema.json`](./contracts/events.schema.json) | Ring events and Detailed Oversight Audit Log records (`BastionEvent`) |
| [`contracts/bots.schema.json`](./contracts/bots.schema.json) | Bot lifecycle state machine (`BastionBot`) and Google account slot tracking (`BastionAccountSlotPool`) |
| [`contracts/helpers.schema.json`](./contracts/helpers.schema.json) | Ring leaders, deterministic members, and bounded helper template definitions |
| [`contracts/validator.py`](./contracts/validator.py) | Shared Python contract validator and self-test suite used by Railway and SIDEKICK |
