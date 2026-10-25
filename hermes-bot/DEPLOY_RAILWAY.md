# Runbook — Deploy `HERMES // Valheon OS` 24/7 on Railway (`/hermes-bot`)

Matches the exact `bastion-brain` Railway worker architecture in `Reign3418/unity-v2`:
- **No public port required** (outbound Discord Gateway v10 WebSocket + REST v10 + Stripe API + AWS DynamoDB).
- **100% independent of `MIXERV3`** — you can power off all studio PCs and `HERMES` stays **🟢 Online 24/7/365** on Railway.

## 1. Add the Service in Railway (~60 Seconds)
1. Open your existing **Railway Project** (`Reign3418/unity-v2`) → **+ New → GitHub Repo → `Reign3418/unity-v2`**.
2. Go to **Settings → Source → Root Directory**: set to **`/hermes-bot`** (Branch: `master`).
   - `railway.toml` automatically sets `startCommand = "node bot.mjs"` and `restartPolicyType = "ALWAYS"`.
   - `.nvmrc` pins **Node 22**.
3. Go to **Variables → Raw Editor** and paste the contents of `E:\Unity\hermes-bot\.env.railway`.
4. Click **Deploy**. Logs will show:
   - `🪽 [HERMES Gateway] Connected to Discord WebSocket v10`
   - `🟢 [HERMES READY] Logged in as HERMES // Valheon OS (1563619930371391680) — ONLINE!`
