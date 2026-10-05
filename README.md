# Unity V2 — Kingdom Intelligence & Strategic Operations Engine

Unity V2 is an enterprise-grade intelligence platform, analytics suite, and automated war room engineered for **Rise of Kingdoms (RoK)** kingdom leadership, alliance management, and governor development.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **AWS DynamoDB**, and **Google Gemini Vision AI**, Unity combines instant zero-login public educational tools with high-security command portals for elite kingdom governance.

---

## 🏛️ Platform Architecture Overview

```
                                  ┌──────────────────────────────────────────────┐
                                  │            Unity V2 Gateway Router           │
                                  └──────┬───────────────────────────────┬───────┘
                                         │                               │
                      ┌──────────────────┴───────────────┐               │
                      ▼                                  ▼               ▼
           [Public Governor Academy]           [Governor Identity]  [Admin Console]
           • City Hall Rush Database           • 8-Digit ID + PIN   • Telemetry Feed
           • 7 Beginner Survival Traps         • Gemini Vision OCR  • Global Config
           • Commander Pairing Matrices        • SOS Officer Alerts • Webhook Broadcasts
           • 100% Free / Zero Login            • 13+ Age Compliance • Passcode Vault
                      │                                  │               │
                      └──────────────────┬───────────────┴───────────────┘
                                         ▼
                             [Core Intelligence Suite]
            • EK Polygraph (Account Anomaly & Dead-Weight Detector)
            • Player Hunter (139,000+ Cross-Kingdom Governor Directory)
            • Ghost Hunter (Inactive Member Dead Weight Pruning)
            • Recruitment Hit List (Departed Member Growth Tracker)
            • KvK Hub & Strategic Seed Matchmaker
            • Automated Calculators (Speedups, Resources, AP, Flags, Forge)
            • Map Planner & Real-Time Territory Predictor
```

---

## 🚀 Core Feature Suites

### 1. Governor Identity & Autonomous Self-Registration
* **Zero Discord Requirement:** Governors authenticate via their numeric RoK Governor ID and a 4-to-8 digit secret PIN.
* **Instant Profile OCR Scanner:** Upload a mobile screenshot of the RoK Governor Profile. Gemini Vision AI automatically parses Governor ID, Name, Kingdom #, and Alliance Tag.
* **Kingdom 3418 Eligibility Verification:** Cross-references scanned accounts against the Kingdom 3418 roster census and alliance membership (`[UN]`).
* **Automated Failure Pings:** System automatically triggers high-priority alerts to leadership on scan failures or ineligible access attempts.
* **Officer SOS Help Form:** Built-in support tab allowing frustrated players to dispatch direct pings to Kingdom High Command with their contact info.

### 2. Strategic War Room & Leadership Intelligence
* **EK Polygraph (`/tools/polygraph`):** Algorithmic audit comparing power deltas, kill points, and dead troop rates to unmask farm accounts, spies, and KvK dead weight.
* **Player Hunter (`/tools/hunter`):** Query historical trajectories across 163 kingdoms and 139,000+ governors to audit migration applicants.
* **Ghost Hunter (`/tools/ghost-hunter`):** Evaluates kingdom vitality by identifying dormant accounts carrying dead-weight power with zero activity deltas.
* **Recruitment Hit List (`/tools/recruitment-hitlist`):** Identifies high-velocity players who migrated away from your kingdom and are actively accelerating in power elsewhere.
* **Governor Anomaly & Fraud Engine (`/creator/lab/anomaly-detector` — Prototype):** Pure mathematical multivariate outlier detection identifying stat-padders (T1 duelers), scripted bot accounts, deadweight whales, and account buyer liabilities at `$0.00` serverless cost.
* **AI Vision Scanner (`/experimental/ocr` — Prototype):** Dual-engine OCR running zero-cost in-browser WebGPU / Canvas optical processing alongside serverless Gemini 3.1 Flash-Lite.
* **Tactical Battle Predictor (`/creator/lab/battle-predictor`):** Simulates head-to-head kingdom combat odds with radar charts and the Gemini 2.5 Flash Tactical Thinking Engine (Prototype).
* **KvK Scenario Predictor & Matchmaker:** Simulates bracket seeds and evaluates alliance combat odds using historical battle metadata.

### 3. Public Governor Academy & Calculators (Zero Login)
* **City Hall Rush Guide:** Prerequisite database and resource rush path across all 25 City Hall levels.
* **7 Beginner Survival Traps:** Tactical guidance on commander investments, gathering rules, and resource discipline.
* **Multi-Resource Calculators (`/calculators`):** Instant calculation and AI screenshot ingestion for speedups, resource tokens, AP recovery, alliance flag costs, and equipment forge materials.
* **Interactive Map Planner (`/tools/map-planner`):** Territory grid node planner for tactical bastion and pass control.

---

## 🤖 AI Architecture: Google Gemini Engine

Unity supports multi-tier AI vision analysis with high-throughput defaults and personal client overrides:

| Model | Role | Free Tier Quotas | Paid / Ultra Key Quotas |
| :--- | :--- | :--- | :--- |
| **`gemini-3.1-flash-lite`** | **Global Default / Standard** | **20 RPM / 500 RPD** | 1,000+ RPM / Unlimited |
| **`gemini-3.5-flash`** | **Ultra Vision & High-Speed OCR** | 5 RPM / 20 RPD | 1,000+ RPM / Unlimited |
| **`gemini-2.5-pro`** | **Ultra Strategic Reasoning & Coaching** | 2 RPM / 50 RPD | 360+ RPM / Millions TPM |

* **Client Override Support:** Individual governors with their own Google AI Studio key can plug it into **Settings (`/settings`)** to route their personal requests through `gemini-2.5-pro` or `gemini-3.5-flash` without impacting kingdom shared quotas.

---

## 📊 Universal Telemetry & Event Logging

Every platform interaction is recorded asynchronously into AWS DynamoDB (`PK: EVENTS#YYYY-MM-DD`, 90-day auto-expiry):
* **Admin Analytics (`/admin/analytics`):** Real-time stream of all platform events, filtered by feature and kingdom.
* **AI Usage Dashboard (`/creator/usage`):** Daily quota countdowns, token usage breakdown, and quota alerts.
* **Client Telemetry Endpoint (`/api/telemetry/log`):** Non-blocking client logger capturing tool views and calculator engagement.

---

## 🌍 Internationalization (i18n)

Unity natively supports **12 languages** via `next-intl` with 100% key parity enforced via CI pre-commit hooks:
* English (`en`), Arabic (`ar`), German (`de`), Spanish (`es`), French (`fr`), Indonesian (`id`), Korean (`ko`), Portuguese (`pt`), Russian (`ru`), Turkish (`tr`), Vietnamese (`vi`), Chinese (`zh`).

Run the verification test anytime:
```bash
npm run check:i18n
```

---

## 🛠️ Technology Stack & Dependencies

```json
{
  "framework": "Next.js 16.2.1 (App Router, Server Components & Server Actions)",
  "runtime": "React 19.2.4 & React DOM 19.2.4",
  "styling": "Tailwind CSS v4 with PostCSS",
  "database": "AWS DynamoDB (@aws-sdk/client-dynamodb 3.1014.0, @aws-sdk/client-sts)",
  "authentication": "NextAuth.js v5.0.0-beta.30 (Discord OAuth & Governor ID Credentials)",
  "internationalization": "next-intl 4.9.0 (12 locales)",
  "charts_and_viz": "ECharts 6.0.0, echarts-for-react 3.0.6, Recharts 3.8.0",
  "telemetry": "@vercel/analytics 2.0.1 & Custom DynamoDB Event Logger",
  "icons": "Lucide React 0.577.0",
  "realtime": "Socket.io Client 4.8.3",
  "data_parsing": "PapaParse 5.5.3, ExcelJS 4.4.0 (migrated from SheetJS)"
}
```

---

## 🔐 Environment Variables Configuration

Create a `.env.local` file in the root directory (or configure within Vercel Project Settings):

```bash
# === AWS DynamoDB Infrastructure ===
AWS_REGION=us-east-2
AWS_TABLE_NAME=unity-core-production
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# === Google Gemini AI Engine ===
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.1-flash-lite

# === NextAuth v5 Authentication ===
AUTH_SECRET=your_nextauth_jwt_secret_hex
NEXTAUTH_URL=https://your-domain.vercel.app

# === Discord Integration (Optional / R5 Enrollment) ===
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
ADMIN_ALERT_WEBHOOK=https://discord.com/api/webhooks/...

# === Railway Discord Presence Bot Bridge ===
RAILWAY_BOT_URL=https://unity-app-production.up.railway.app/api/system/broadcast
UNITY_INTERNAL_SECRET=your_internal_bot_secret
```

---

## 💻 Local Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Run i18n parity check
npm run check:i18n

# 3. Start local development server
npm run dev

# 4. Production build verification
npm run build
```

---

## 🛡️ License & High Command Notice
Designed and maintained exclusively for **Kingdom 3418 High Command** and partner alliance leadership. All rights reserved.
