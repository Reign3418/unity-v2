# Valheon Bot Swarm (`#4197`) — 5-Queue Living Player Loop & Offsite Hardware Runbook

> **Cluster Target:** `SIDEKICK` (`192.168.50.218`) — 3x MuMu Android Instances (`127.0.0.1:16384`, `127.0.0.1:16416`, `127.0.0.1:16448`)
> **Primary Orchestrator:** [`scanner/swarm_4197_orchestrator.py`](./swarm_4197_orchestrator.py)
> **Builder & Tutorial Engine:** [`scanner/auto_tutorial_ch8.py`](./auto_tutorial_ch8.py)
> **Cluster Hub Daemon:** [`scanner/node1_cluster_hub.js`](./node1_cluster_hub.js)

---

## 1. Root Cause Analysis: Why the Swarm Looked Disharmonious Prior to `1bd49d0`

Prior to the `1bd49d0` lock, **four separate Python processes** were running simultaneously on `SIDEKICK` (`192.168.50.218`) and fighting over the same three MuMu ADB ports:

1. **Daemon Respawn Loop (`worker.ps1` in `node1_cluster_hub.js`):**
   - Every 15 loop ticks (`~18 seconds`), `worker.ps1` checked if `python -m cipher` was running and automatically relaunched it alongside `swarm_4197_orchestrator.py`.
2. **Legacy Neighbor-Kingdom Leases (`cipher` -> `provision_neighbor_kingdom.py`):**
   - `cipher` pulled older `#4021` and `#4198` `switch_character` / `provision_character` leases from DynamoDB and executed `provision_neighbor_kingdom.py --adb 127.0.0.1:16416 --kingdom 4021 --mode switch`, hijacking the screen into `Settings -> Character Management` while the `#4197` orchestrator was mid-action.
3. **Orphaned Macro Runner (`step_runner.py 0 farm`):**
   - A legacy macro process was still firing blind taps on `:16384`.
4. **Inverted Queue Priority inside `swarm_4197_orchestrator.py`:**
   - Previously, the orchestrator ran a slow 14-step `auto_tutorial_ch8.py` builder pass *before* troop training or gathering, only dispatched 1 gather march per cycle, had no dedicated Scout Camp / Village / Cave explorer, and re-opened Character Management every 4–8 cycles.

---

## 2. The Harmonious "5-Queue Living Player Loop" Architecture

To behave like a disciplined human governor in Kingdom `#4197` ("something training, something gathering, something building, and something scouting at all times"), `SIDEKICK` now enforces a **Single-Process Lock** and executes five sequential queues per instance every cycle:

### Step 0 — Single-Process & Kingdom `#4197` Lock
- **Single-Process Guard (`node1_cluster_hub.js`):** `worker.ps1` checks for `swarm_4197_orchestrator.py` before considering `cipher`. When `swarm_4197_orchestrator.py` is active, `cipher` is never spawned.
- **Kingdom `#4197` Lock (`verifiedIn4197`):** Once an instance's active governor is verified in `#4197`, `audit_and_ensure_4197_roster` sets `verifiedIn4197 = True` and never re-opens `Settings -> Character Management` or calls `provision_neighbor_kingdom.py --mode create`.

### Queue #1 — Military Training (`run_t1_only_training`)
- Runs **first** in every cycle while inside City View.
- Taps each military building (`Barracks`, `Archery Range`, `Stable`, `Siege Workshop`) to collect any finished troop bubbles (`+150` T1 units).
- Opens the training modal via the building's Train button (`gx + 165, gy - 15` or fixed HUD fallback), explicitly selects **Tier 1 Slot `(650, 225)`**, and taps **TRAIN `(1215, 760)`**.
- Strictly trains **T1 ONLY** (instant healing, zero hospital clogging, reliable resource gathering load).

### Queue #2 — Active Scouting, Fog Exploration, Villages & Caves (`run_scouting_and_villages`)
- Inspects the left-rail notification column (`x=35..95, y=250..520`) for an idle Scout Camp / spyglass badge, or taps the Scout Camp directly inside the city (`(1045, 420)` on `:16384`, `(895, 385)` on `:16416` / `:16448`).
- When the Scout Camp or Exploration panel opens, OCRs and taps cyan/gold action buttons (`Explore`, `Visit`, `Investigate`, `Claim`, `Send`) and dispatches the scout onto the `#4197` World Map (`(1160, 620)` / `(800, 450)`), then returns cleanly to City HUD.
- Never relies on CH11 "Auto-Explore" — works on fresh CH4–CH10 governors.

### Queue #3 — Multi-March Resource Gathering (`run_resource_farming`)
- Loops across **2 march slots per cycle** (`for march_slot in range(2)`) so multiple gather marches stay active on the `#4197` World Map simultaneously.
- Rotates across `FOOD` (Cropland `(565, 825)`), `WOOD` (Logging Camp `(790, 825)`), and `STONE` (Stone Deposit `(1015, 825)`).
- Searches via the magnifying glass `(62, 690)`, decrements node level if needed to ensure nearby nodes in fog, taps `Gather`, selects `New Troops`, and dispatches the march.

### Queue #4 — Smart Fast Builder & Alliance Help (`run_city_builder_burst`)
- Runs `auto_tutorial_ch8.py --steps 6 --target-ch 16` (a fast **6-step pass** instead of 14 steps) so building upgrades and prerequisite unlocks (`Wall`, `Tavern`, `Quarry`, `Academy`, `City Hall`) progress steadily without blocking troop training or farming queues.
- Automatically detects and taps the **Alliance Help Handshake** bubble at `(1162, 796)` during HUD checks.

### Queue #5 — Watchtower & Mail Threat Recon (`run_blackbox_threat_check`)
- Performs an optical check for Watchtower red-edge screen glow and Mail unread badges (`(1538, 845)`), logging any incoming scout or attack into `C:\UnityScanner\4197_flight_recorder.jsonl` and syncing live state to DynamoDB (`BastionControl` -> `SWARM_4197_BLACKBOX`).

---

## 3. Offsite Cloud / Bare-Metal Hardware Matrix (Power & Relocation Resilience)

To decouple the bot swarm from home power/ISP dependencies while avoiding AWS/GCP GPU virtualization markups and datacenter ASN bans:

| Option | Provider & Spec | Monthly Cost | Capacity | Latency & Ban-Safety Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Option 1 (Best Raw Hardware Value)** | **Hetzner Dedicated `EX44`** (`Intel Core i5-13500` 14c/20t with **Intel UHD 770 iGPU**, `64 GB DDR4`, `2x 512 GB NVMe`) | **~$49–$54/mo** (`€44/mo`, zero egress fees) | **8–10 simultaneous MuMu instances** at 30 FPS | ~85–110ms from US-East (fine for automated ADB loops; route outbound game traffic via a $3/mo US Residential ISP static proxy so Lilith sees a US home ISP IP). |
| **Option 2 (Lowest US Latency)** | **ReliableSite (Miami / NYC) or OVHcloud US (Vint Hill, VA)** Bare-Metal (`Intel i5-12500` / `i7-12700` w/ Intel UHD iGPU, `64 GB RAM`) | **~$79–$99/mo** | **8–10 simultaneous MuMu instances** | **12–22ms ping** from US-East (`150+ FPS` smooth remote Parsec/RustDesk view). Pair with a static US residential proxy for clean residential ASN reputation. |
| **Option 3 (Zero-Maintenance Cloud Android)** | **LDCloud / Redfinger / UgPhone** (Dedicated Cloud Android 12 Virtual Phones) | **~$8–$10/mo per instance** | 1 governor per cloud phone | 100% immune to home power loss, built-in residential-style mobile routing, but does not expose local ADB over LAN without an overlay tunnel (Tailscale/ADB bridge). |
| **Option 4 (Home UPS + Tailscale Bridge)** | **1500VA Pure Sine Wave UPS** on `SIDEKICK` + Router | **~$160 one-time** | Current 3–6 MuMu instances | Keeps `SIDEKICK` and fiber gateway alive through 45–60 min power flickers with `0ms` LAN latency and 100% organic home residential IP. |
