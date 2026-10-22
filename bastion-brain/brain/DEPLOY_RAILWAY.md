# Step 4 Runbook — Run the Bastion Brain on Railway

The brain is a background worker: no public port, outbound calls only (DynamoDB, SQS). It boots in
`DRY_RUN` (plans only) unless you change the mode in Unity `/bastion` or set `BRAIN_MODE`.

## 1. Create the service (~5 minutes)
1. Railway → **New Project → Deploy from GitHub repo** → `Reign3418/unity-v2`.
2. Service **Settings → Source → Root Directory**: `/bastion-brain`. Branch: `master`.
   (`railway.toml` sets the start command `python -m brain` and restart policy; `.python-version` pins 3.12.)
3. **Settings → Networking**: do **not** generate a domain (the brain needs none).
4. **Variables → Raw Editor**: paste the contents of `E:\Unity\bastion-brain\.env.railway`
   (gitignored file written by the provisioner — copy it from disk, never through chat).
5. Deploy. Logs should show `brain started` then one `tick` line per minute.

## 2. Verify
- Unity `/bastion` → **BASTION BRAIN** panel shows **ONLINE**, version `0.4.0-step4`, a tick count that rises.
- The decision audit log fills with `MODE_CHANGED`, `SIGNAL`, `PLAN_PROPOSED`, `PLAN_REJECTED/APPROVED` events.

## 3. Modes
| Where | Effect |
|---|---|
| Unity `/bastion` buttons | Writes `BastionControl.MODE`; applies on the next tick (≤ 60 s) |
| Railway `BRAIN_MODE=OFF` | Hard kill switch; overrides Unity |
| Railway `BRAIN_MODE` other values | Boot default used when Unity has not set a mode |

## 4. Local runs (development only)
```
python -m brain --env-file .env.railway --once                                   # one real DRY_RUN tick
python -m brain --env-file .env.railway --simulate-time 2026-10-22T06:30:00Z     # read-only rehearsal
python tools/seed_fleet.py --env-file .env.railway [--force]                     # (re)seed fleet state
```
Do not run a local brain loop while the Railway brain is running (two planners on one fleet).
