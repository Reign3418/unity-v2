# Unity Changelog

All notable changes to the Unity V2 platform are documented in this file.

## [2.5.0] — 2026-10-05

### Added
- **Modern Spreadsheet Architecture (`exceljs: 4.4.0`):**
  - Replaced legacy SheetJS (`xlsx`) with modern `exceljs` via `@/lib/excelHelper`.
  - Added streaming workbook parser (`parseExcelWorkbook`), cell formula sanitization, and styled `.xlsx` export utilities (`downloadExcelFile`).
  - Completely resolved SheetJS security vulnerabilities and memory spikes on 60,000-row KvK roster spreadsheets.
- **Governor Anomaly & Fraud Outlier Engine (`/creator/lab/anomaly-detector`, `@/lib/anomalyDetector` — Prototype):**
  - 100% free serverless multivariate mathematical engine (`$0.00` compute cost).
  - Algorithmic classification for Stat-Padders (T1 farm duelers), Farm Bots, Deadweight Whales, and Account Buyer liabilities.
  - Interactive Lab audit table with risk scoring, filtering, and one-click `.xlsx` audit export.
- **AI Vision Scanner Dual-Engine Prototype (`/experimental/ocr`):**
  - Added zero-cost **In-Browser WebGPU / Canvas optical extractor** (`$0.00` / zero API tokens consumed / offline capable).
  - Dual-mode architecture supporting instant local client-side processing alongside serverless Gemini 3.1 Flash-Lite.
  - Added styled Excel export (`.xlsx`) in addition to CSV and Clipboard.
- **Battle Predictor Tactical Thinking Engine Prototype (`/creator/lab/battle-predictor`):**
  - Added AI Engine selector to toggle between **Gemini 3.1 Flash-Lite (Standard Free Recon)** and **Gemini 2.5 Flash Tactical Thinking Engine (Prototype)** for unforgiving tactical battle breakdowns.
  - Added dynamic prototype badging and model identification in the UI.

---

## [2.4.0] — 2026-10-05

### Added
- **Governor Identity & Autonomous Self-Registration Portal (`GovernorAuthModal.js`):**
  - Instant self-registration powered by Gemini Vision OCR reading in-game RoK Governor Profile screenshots.
  - Automated extraction of numeric Governor ID, Governor Name, Kingdom Number, Alliance Tag, Power, and Kill Points.
  - Self-selected 4-to-8 digit secret PIN for fast, credential-based login without requiring Discord.
  - Automated verification against Kingdom 3418 census records and alliance tags (`[UN]`).
  - Strict 13+ age compliance and account ownership confirmation gates.
- **Fail-Safe Multi-Channel Admin Alert Dispatcher (`notifyAdmin.js`):**
  - Automated high-priority alerts triggered on registration failures (missing ID, invalid format, ineligible kingdom, DB errors).
  - Built-in "Need Help? / SOS" support tab inside the Governor Identity Portal allowing frustrated players to ping officers with their contact handle.
  - Simultaneous dispatch across Discord Webhooks (`ADMIN_ALERT_WEBHOOK`), Railway Discord Bot (`/api/system/broadcast`), DynamoDB presence queue (`PENDING_PINGS`), and Admin Console (`SYSTEM_NOTIFICATIONS`).
- **Universal Tool Telemetry & Engagement Tracking:**
  - Deployed `/api/telemetry/log` client telemetry endpoint for fire-and-forget logging to DynamoDB (`EVENTS#YYYY-MM-DD`).
  - Instrumenting backend event logging across auth routes, support pings, ghost hunter, recruitment hit list, and calculators.
  - Overhauled **`/admin/analytics` ("Usage Intelligence")** to dynamically track, filter, and rank 18 distinct platform tools by real-time usage.
- **Promoted Leadership Tools (`/tools`):**
  - **Ghost Hunter (`/tools/ghost-hunter`):** Promoted from hidden Creator Lab into mainstream tools, accessible to both Super Admins and Kingdom Officers (`isLeader`). Ranks inactive governors with 0 power/KP deltas and calculates kingdom vitality grades.
  - **Recruitment Hit List (`/tools/recruitment-hitlist`):** Promoted into mainstream tools. Tracks departed governors who left the kingdom and are actively accelerating in power elsewhere.

### Changed
- **AI Vision Engine Standardization:**
  - Standardized all vision and OCR routes on **`gemini-3.1-flash-lite`** (20 RPM / 500 RPD) to provide maximum free-tier throughput and prevent 429 quota blocks.
  - Added dedicated **Personal Client Override** support in **Settings (`/settings`)** allowing Ultra / Paid API key holders to utilize **`gemini-2.5-pro`** (deep strategic reasoning) and **`gemini-3.5-flash`** (ultra-fast frontier vision) without impacting shared kingdom quotas.
- **Sidebar & Navigation De-Cluttering:**
  - Removed legacy "Experimental Lab" applet popouts (`/experimental/ocr`) and hidden whiteboard references.
  - Streamlined the Tools menu with Calculators, Ghost Hunter, Recruit Hitlist, Map Planner, Kingdom Mail, and Chat Translator.

---

## [2.3.0] — 2026-09-22

### Fixed
- **Activity Tracker:** Resolved issue where `killPoints` failed to map accurately due to inconsistent case-sensitivity parsing from AWS DynamoDB. Aligned matrix extraction logic strictly with the 'getBehavioralMatrix' standard.
- **Global Analysis (Delta Engine):** Fixed a critical structural mapping bug where calculating dead troop deltas across the `Top N` subsets would result in 0. The bot ingestion engine (`awsDynamo.js -> uploadKingdomRoster`) now explicitly tracks `.deads` when slicing roster metrics.
- **AWS DynamoDB Retroactive Patch:** Generated and successfully deployed a backend node script (`repair_deads_db.mjs`) to iterate completely across the `SYSTEM#CONFIG` Tracked Kingdoms and retroactively calculate and inject historical `deads` variables into the master data summaries globally.
