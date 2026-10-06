<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Unity V2 Development Guidelines & Agent Architecture

## 1. Core Framework & Versioning
- **Next.js:** `16.2.1` (App Router architecture with Server Components and Route Handlers)
- **React:** `19.2.4` & `react-dom: 19.2.4`
- **Styling:** Tailwind CSS `v4` with `@tailwindcss/postcss`
- **Authentication:** `next-auth: 5.0.0-beta.30`
- **Database:** AWS DynamoDB (`@aws-sdk/client-dynamodb: 3.1014.0`)
- **Spreadsheet Engine:** `exceljs: 4.4.0` (modern streaming parsing & export via `@/lib/excelHelper`)
- **Internationalization:** `next-intl: 4.9.0` (12 languages)
- **Icons:** `lucide-react: 0.577.0`

## 2. Next.js 16 Critical Conventions
- **Asynchronous Route Parameters:** In Next.js 16, `params` and `searchParams` in layouts, pages, and route handlers are **Promises**. Always resolve them asynchronously:
  ```javascript
  // Layout / Page
  export default async function Page({ params }) {
    const { locale } = await params;
    // ...
  }
  ```
- **Serverless Route Timeouts:** For intensive OCR or multi-kingdom queries, declare `export const maxDuration = 300;` at the top of the route file.

## 3. Internationalization (i18n) Rules
- Supported locales: `en`, `ar`, `de`, `es`, `fr`, `id`, `ko`, `pt`, `ru`, `tr`, `vi`, `zh`.
- All JSON files are located in `src/messages/<locale>.json`.
- **Mandatory On-Creation Rule:** Whenever any new UI component, modal, banner, page, button, or user-facing element is created or modified, internationalization is a **strict prerequisite**. No hardcoded English copy may be left in JSX. All user-facing strings must use `useTranslations('<Namespace>')` and be synchronized across all 12 platform locales with contextual accuracy.
- **RTL Support:** For Arabic (`ar`), ensure proper bidirectional handling (`dir="rtl"`) on the page while enforcing `dir="ltr"` on numeric identifiers (IDs, PINs, stats, phone inputs) and brand logos (`UN.TY 2.0`) to prevent character flipping.
- **Pre-commit Gate:** Whenever editing translation keys or UI text, run:
  ```bash
  node scripts/check-i18n.js
  ```
  All 12 languages must maintain 100% key parity before committing.

## 4. Telemetry & Event Logging Architecture
- All user and system engagement must be tracked asynchronously without blocking responses:
  - **Backend Route Handlers:** Import and invoke `logEvent(eventType, metadata, context)` from `@/lib/eventLogger`.
  - **Client-Side Components:** Post non-blocking payloads to `/api/telemetry/log`:
    ```javascript
    fetch('/api/telemetry/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'MY_TOOL_EVENT', metadata: { ... } })
    }).catch(() => {});
    ```
- All site events write to DynamoDB partition `PK: EVENTS#YYYY-MM-DD` with a 90-day auto-expiry TTL.

## 5. Admin & High Command Alert Pipeline
- For registration exceptions, system errors, or user support requests, use the multi-channel fail-safe dispatcher:
  ```javascript
  import { notifyAdmin } from "@/lib/notifyAdmin";

  await notifyAdmin({
    type: "FAILED_REGISTRATION", // or "GOVERNOR_SUPPORT_REQUEST"
    title: "Alert Headline",
    message: "Description of the event",
    details: { governorId, reason, ... },
    contact: "Contact handle if provided"
  });
  ```
- Dispatches across Discord Webhooks (`ADMIN_ALERT_WEBHOOK`), Railway Bot endpoint (`/api/system/broadcast`), DynamoDB `PENDING_PINGS`, and `SYSTEM_NOTIFICATIONS`.

## 6. AI Model Standards (Google Gemini)
- **Standard Default:** `gemini-3.1-flash-lite` (20 RPM / 500 RPD) — optimal for high throughput and zero rate-limit blocks on shared keys.
- **Client Overrides:** Respect `x-gemini-key` and `x-gemini-model` headers for governors with personal Ultra / Paid keys (`gemini-2.5-pro` for deep reasoning, `gemini-3.5-flash` for high-resolution OCR).
- **Never use deprecated models:** Do NOT reference `gemini-1.5-flash` or `gemini-2.0-flash` as primary defaults (discontinued by Google).

## 7. Zero-Cost Modernization & Prototype Standards ($0.00 Serverless)
- **Spreadsheet Processing:** Always use `@/lib/excelHelper` (`exceljs`) for parsing multi-sheet workbooks and generating styled `.xlsx` exports. Eliminates memory leaks and prototype pollution vulnerabilities on 60k+ KvK rosters at `$0.00` cost.
- **In-Browser Vision OCR Prototype (`/experimental/ocr`):** Operates on dual engines: Local WebGPU / HTML5 Canvas optical processing (`$0.00` / zero API tokens consumed / offline capable) and Cloud Fast-Track (`gemini-3.1-flash-lite` free quota).
- **Governor Anomaly & Fraud Outlier Engine (`/creator/lab/anomaly-detector`, `@/lib/anomalyDetector`):** 100% free client-side multivariate math detecting stat-padders (T1 farm duelers), scripted bot accounts, deadweight whales, and account buyer liabilities before KvK matchmaking.
- **Battle Predictor Tactical Thinking Engine Prototype (`/creator/lab/battle-predictor`):** Supports `gemini-2.5-flash` deep reasoning scenarios alongside high-throughput `gemini-3.1-flash-lite`.
