import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDocsDir = path.join(rootDir, 'public', 'docs');
const tempHtmlPath = path.join(rootDir, 'scripts', 'temp_architecture_doc.html');
const outputPdfPath = path.join(publicDocsDir, 'Unity_V2_System_Architecture_Guide.pdf');
const rootPdfPath = path.join(rootDir, 'Unity_V2_System_Architecture_Guide.pdf');

// Ensure output directories exist
if (!fs.existsSync(publicDocsDir)) {
    fs.mkdirSync(publicDocsDir, { recursive: true });
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Unity V2 System Architecture & Operational Blueprint</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background-color: #080a0f;
            color: #cbd5e1;
            font-size: 9.5pt;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page {
            page-break-after: always;
            position: relative;
            padding-bottom: 20px;
        }

        .page:last-child {
            page-break-after: auto;
        }

        /* Top Header Banner */
        .header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #312e81;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }

        .logo-group {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .crest-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #4f46e5, #9333ea);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Cinzel', serif;
            font-weight: 900;
            font-size: 18px;
            box-shadow: 0 0 15px rgba(79, 70, 229, 0.4);
        }

        .brand-title {
            font-family: 'Cinzel', serif;
            font-size: 16pt;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .brand-sub {
            font-size: 7.5pt;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #818cf8;
            text-transform: uppercase;
        }

        .badge-clearance {
            background: rgba(225, 29, 72, 0.15);
            border: 1px solid rgba(225, 29, 72, 0.4);
            color: #fb7185;
            font-family: 'JetBrains Mono', monospace;
            font-size: 7pt;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Section Headlines */
        h2 {
            font-family: 'Cinzel', serif;
            font-size: 13pt;
            font-weight: 800;
            color: #f8fafc;
            border-left: 3px solid #6366f1;
            padding-left: 8px;
            margin: 14px 0 8px 0;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        h3 {
            font-size: 10pt;
            font-weight: 700;
            color: #38bdf8;
            margin: 10px 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        p {
            margin-bottom: 8px;
            color: #94a3b8;
        }

        /* Diagram / Flow Box */
        .diagram-container {
            background: #0f1219;
            border: 1px solid #1e2538;
            border-radius: 8px;
            padding: 12px;
            margin: 12px 0;
        }

        .flow-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-top: 8px;
        }

        .flow-card {
            background: #141926;
            border: 1px solid #232d42;
            border-radius: 6px;
            padding: 10px;
        }

        .flow-card.accent-indigo { border-top: 3px solid #6366f1; }
        .flow-card.accent-cyan { border-top: 3px solid #06b6d4; }
        .flow-card.accent-emerald { border-top: 3px solid #10b981; }
        .flow-card.accent-rose { border-top: 3px solid #f43f5e; }
        .flow-card.accent-amber { border-top: 3px solid #f59e0b; }
        .flow-card.accent-purple { border-top: 3px solid #a855f7; }

        .flow-title {
            font-size: 8.5pt;
            font-weight: 800;
            color: #f1f5f9;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .flow-desc {
            font-size: 7.5pt;
            color: #94a3b8;
            line-height: 1.4;
        }

        .flow-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 6px;
        }

        .flow-tag {
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.5pt;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            padding: 1px 4px;
            border-radius: 3px;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            margin: 10px 0;
            background: #0f1219;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #1e2538;
        }

        th {
            background: #171d2b;
            color: #38bdf8;
            text-align: left;
            padding: 6px 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #232d42;
        }

        td {
            padding: 6px 8px;
            border-bottom: 1px solid #182030;
            color: #cbd5e1;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:nth-child(even) td {
            background: rgba(255, 255, 255, 0.015);
        }

        .pk-key {
            font-family: 'JetBrains Mono', monospace;
            color: #a78bfa;
            font-weight: 700;
        }

        .sk-key {
            font-family: 'JetBrains Mono', monospace;
            color: #34d399;
        }

        /* Metrics highlight pill */
        .metric-pill {
            display: inline-block;
            font-family: 'JetBrains Mono', monospace;
            font-size: 7.5pt;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .pill-free { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; }
        .pill-gold { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; }
        .pill-purple { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc; }

        /* Footer */
        .doc-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #1e2538;
            padding-top: 6px;
            font-size: 7pt;
            color: #64748b;
            font-family: 'JetBrains Mono', monospace;
        }
    </style>
</head>
<body>

    <!-- PAGE 1: ARCHITECTURAL BLUEPRINT -->
    <div class="page">
        <div class="header-bar">
            <div class="logo-group">
                <div class="crest-icon">U</div>
                <div>
                    <div class="brand-title">Unity V2 Intelligence Engine</div>
                    <div class="brand-sub">Platform Architecture & Data Storage Blueprint</div>
                </div>
            </div>
            <div class="badge-clearance">Confidential • Kingdom 3418 High Command</div>
        </div>

        <h2>1. Executive Platform Topology</h2>
        <p>
            Unity V2 is an enterprise intelligence operations engine engineered for Rise of Kingdoms. It decouples high-speed public tools from private war-room portals, routing operations through serverless Next.js edge handlers to AWS DynamoDB single-table storage and zero-cost Google Gemini multimodal LLM inference.
        </p>

        <div class="diagram-container">
            <div style="font-size: 8.5pt; font-weight: 800; color: #f8fafc; text-transform: uppercase; margin-bottom: 6px;">
                End-to-End Operational Pipeline
            </div>
            <div class="flow-grid">
                <div class="flow-card accent-indigo">
                    <div class="flow-title">1. Governor Client</div>
                    <div class="flow-desc">Edge React 19 browser interface. HTML5 Canvas WebGPU in-browser optical processing, LocalStorage session caching, and 12-language localization.</div>
                    <div class="flow-tags">
                        <span class="flow-tag">React 19</span>
                        <span class="flow-tag">WebGPU / Canvas</span>
                        <span class="flow-tag">12 Locales</span>
                    </div>
                </div>
                <div class="flow-card accent-cyan">
                    <div class="flow-title">2. Edge Serverless</div>
                    <div class="flow-desc">Next.js 16 App Router handlers executing non-blocking telemetry logging, ExcelJS streaming roster ingestion, and multimodal OCR payloads.</div>
                    <div class="flow-tags">
                        <span class="flow-tag">Next.js 16</span>
                        <span class="flow-tag">ExcelJS 4.4</span>
                        <span class="flow-tag">NextAuth v5</span>
                    </div>
                </div>
                <div class="flow-card accent-emerald">
                    <div class="flow-title">3. AWS DynamoDB Core</div>
                    <div class="flow-desc">High-throughput Single-Table schema (unity-core-production) indexing 139,000+ governors across 163 kingdoms with sub-10ms queries.</div>
                    <div class="flow-tags">
                        <span class="flow-tag">Single Table</span>
                        <span class="flow-tag">90d TTL</span>
                        <span class="flow-tag">Sub-10ms</span>
                    </div>
                </div>
            </div>
        </div>

        <h2>2. AWS DynamoDB Single-Table Storage Specification</h2>
        <p>
            All kingdom scans, player credentials, profiles, dossiers, and telemetry write to a single DynamoDB partition topology. This eliminates relational joins and allows instantaneous roster retrieval:
        </p>

        <table>
            <thead>
                <tr>
                    <th>Data Domain</th>
                    <th>Partition Key (PK)</th>
                    <th>Sort Key (SK)</th>
                    <th>Payload & Operational Lifecycle</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Roster Census</strong></td>
                    <td><span class="pk-key">SCAN#{kd}#{date}</span></td>
                    <td><span class="sk-key">GOV#{governorId}</span></td>
                    <td>Power, Kill Points, T1-T5 kills, Deads, Tech, Building Power, Alliance Tag. Permanent storage.</td>
                </tr>
                <tr>
                    <td><strong>Snapshot Index</strong></td>
                    <td><span class="pk-key">DATES#{kd}</span></td>
                    <td><span class="sk-key">DATE#{timestamp}</span></td>
                    <td>Chronological index of every uploaded scan for that kingdom. Powers timeline scrubbing.</td>
                </tr>
                <tr>
                    <td><strong>Governor Auth</strong></td>
                    <td><span class="pk-key">AUTH_GOVERNOR</span></td>
                    <td><span class="sk-key">GOV#{governorId}</span></td>
                    <td>Argon2/SHA256 salted PIN hash, affiliated Kingdom, clearance roles (SuperAdmin / Leader).</td>
                </tr>
                <tr>
                    <td><strong>Cross-KD Intel</strong></td>
                    <td><span class="pk-key">GOV_PROFILE#{id}</span></td>
                    <td><span class="sk-key">PROFILE</span></td>
                    <td>Lifetime career trajectory across 163 tracked kingdoms, migration history, gear audit tags.</td>
                </tr>
                <tr>
                    <td><strong>Officer Dossiers</strong></td>
                    <td><span class="pk-key">GOV_NOTE#{id}</span></td>
                    <td><span class="sk-key">NOTE#{timestamp}</span></td>
                    <td>Officer intelligence briefs, suspicious behavior flags, rally performance tags, blacklist logs.</td>
                </tr>
                <tr>
                    <td><strong>Telemetry Log</strong></td>
                    <td><span class="pk-key">EVENTS#{YYYY-MM-DD}</span></td>
                    <td><span class="sk-key">EVENT#{ts}#{uuid}</span></td>
                    <td>Universal event logging tracking tool engagement. Auto-purged by AWS after 90 days via TTL.</td>
                </tr>
                <tr>
                    <td><strong>High Command SOS</strong></td>
                    <td><span class="pk-key">PENDING_PINGS</span></td>
                    <td><span class="sk-key">PING#{id}</span></td>
                    <td>Active officer alert queue dispatched across Discord Webhook, Railway bot, and Admin feed.</td>
                </tr>
                <tr>
                    <td><strong>Global Config</strong></td>
                    <td><span class="pk-key">GLOBAL_CONFIG</span></td>
                    <td><span class="sk-key">CONFIG#{key}</span></td>
                    <td>System telemetry calibration cache (139k governors, 163 kingdoms), API models, and keys.</td>
                </tr>
            </tbody>
        </table>

        <h2>3. Zero-Cost Engine Matrix ($0.00 Serverless Standard)</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
            <div style="background: #0f1219; border: 1px solid #1e2538; padding: 8px 10px; border-radius: 6px;">
                <div style="font-weight: 700; color: #f8fafc; font-size: 8.5pt;">ExcelJS Streaming Engine</div>
                <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">
                    Replaced vulnerable SheetJS (xlsx) with ExcelJS 4.4. Zero memory leaks on 60,000-row KvK workbooks. <span class="metric-pill pill-free">$0.00 / Open Source</span>
                </div>
            </div>
            <div style="background: #0f1219; border: 1px solid #1e2538; padding: 8px 10px; border-radius: 6px;">
                <div style="font-weight: 700; color: #f8fafc; font-size: 8.5pt;">Google Gemini Flash-Lite & 2.5</div>
                <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">
                    Multimodal OCR & tactical battle reasoning on Google AI Studio Free Tier (20 RPM / 1,500 RPD). <span class="metric-pill pill-free">$0.00 / Free Tier</span>
                </div>
            </div>
        </div>

        <div class="doc-footer">
            <span>UNITY V2 SYSTEM ARCHITECTURE SPECIFICATION</span>
            <span>SECTION 1 OF 2 • SYSTEM CORE & STORAGE</span>
        </div>
    </div>

    <!-- PAGE 2: COGNITIVE INTELLIGENCE & WAR ROOM TOOLS -->
    <div class="page">
        <div class="header-bar">
            <div class="logo-group">
                <div class="crest-icon">U</div>
                <div>
                    <div class="brand-title">Unity V2 Intelligence Engine</div>
                    <div class="brand-sub">Cognitive AI Pipeline & Strategic War Room Tools</div>
                </div>
            </div>
            <div class="badge-clearance">Document: DOC-ARCH-2026-V2</div>
        </div>

        <h2>4. The Cognitive AI Architecture (Google Gemini)</h2>
        <p>
            Unity replaces brittle legacy Python OCR scripts and expensive dedicated GPU servers with serverless multimodal LLMs running at <strong>$0.00 cost</strong> on Google's generous free tier:
        </p>

        <div class="flow-grid">
            <div class="flow-card accent-rose">
                <div class="flow-title">1. Vision OCR Scanner</div>
                <div class="flow-desc"><strong>gemini-3.1-flash-lite:</strong> Scans mobile profile screenshots during autonomous self-registration. Extracts numeric ID, Name, Kingdom, Alliance, Power, and KP in milliseconds.</div>
                <div class="flow-tags">
                    <span class="flow-tag">Instant OCR</span>
                    <span class="flow-tag">Zero Regex</span>
                    <span class="flow-tag">Free Quota</span>
                </div>
            </div>
            <div class="flow-card accent-amber">
                <div class="flow-title">2. AI Combat Coach</div>
                <div class="flow-desc"><strong>gemini-3.1-flash-lite / 2.5-pro:</strong> 1-on-1 mentor on /stats. Compares player deltas against peer averages. Adapts tone depending on whether the Kingdom is at Peace or War in 12 languages.</div>
                <div class="flow-tags">
                    <span class="flow-tag">Peer Delta</span>
                    <span class="flow-tag">Multi-Lingual</span>
                    <span class="flow-tag">Dynamic Tone</span>
                </div>
            </div>
            <div class="flow-card accent-purple">
                <div class="flow-title">3. Tactical Battle Predictor</div>
                <div class="flow-desc"><strong>gemini-2.5-flash (Prototype):</strong> Head-to-head combat reasoning. Analyzes troop density, T5 fighter percentages, and KvK combat frequency to write ruthless tactical verdicts.</div>
                <div class="flow-tags">
                    <span class="flow-tag">Thinking LLM</span>
                    <span class="flow-tag">Combat Odds</span>
                    <span class="flow-tag">Radar Metrics</span>
                </div>
            </div>
        </div>

        <h2>5. Specialized Intelligence & War Room Suites</h2>
        <table>
            <thead>
                <tr>
                    <th>Module / Route</th>
                    <th>Intelligence Model</th>
                    <th>Operational Purpose in Kingdom Governance</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>EK Polygraph</strong><br/><span style="font-size:7pt; color:#64748b;">/tools/polygraph</span></td>
                    <td>Behavioral Delta Matrix</td>
                    <td>Calculates 30-day ratios between power gain and kill points to unmask farm duelers, spies, and zeroed dead weight.</td>
                </tr>
                <tr>
                    <td><strong>Player Hunter</strong><br/><span style="font-size:7pt; color:#64748b;">/tools/hunter</span></td>
                    <td>Cross-KD Indexer</td>
                    <td>Directory across 139,000+ governors in 163 kingdoms. Allows officers to vet migration applicants before accepting passports.</td>
                </tr>
                <tr>
                    <td><strong>Ghost Hunter</strong><br/><span style="font-size:7pt; color:#64748b;">/tools/ghost-hunter</span></td>
                    <td>Vitality Delta Engine</td>
                    <td>Detects completely dormant accounts (zero power & KP delta) and calculates Kingdom Vitality Grades (A through F).</td>
                </tr>
                <tr>
                    <td><strong>Recruitment Hit List</strong><br/><span style="font-size:7pt; color:#64748b;">/tools/recruitment-hitlist</span></td>
                    <td>Velocity Tracker</td>
                    <td>Tracks departed governors who left your kingdom and are actively accelerating in power elsewhere for re-recruitment.</td>
                </tr>
                <tr>
                    <td><strong>Anomaly & Fraud Engine</strong><br/><span style="font-size:7pt; color:#64748b;">/creator/lab/anomaly-detector</span></td>
                    <td>Multivariate Outlier (Prototype)</td>
                    <td>Algorithmic detection flagging stat-padders (>=70% T1 farm kills), scripted bot accounts, and account-buyer liabilities.</td>
                </tr>
                <tr>
                    <td><strong>AI Vision Scanner</strong><br/><span style="font-size:7pt; color:#64748b;">/experimental/ocr</span></td>
                    <td>WebGPU / Canvas (Prototype)</td>
                    <td>Dual-engine OCR running optical feature extraction directly on the client GPU with zero API tokens consumed.</td>
                </tr>
            </tbody>
        </table>

        <h2>6. Fail-Safe Alert & High Command Security Pipeline</h2>
        <p>
            When players experience registration hurdles, system anomalies occur, or emergency support is requested, Unity's multi-channel fail-safe dispatcher fires in parallel:
        </p>
        <div style="background: #0f1219; border: 1px solid #1e2538; padding: 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; color: #94a3b8;">
            <div style="color: #38bdf8; font-weight: 700; margin-bottom: 4px;">DISPATCHER PIPELINE: notifyAdmin({ type: "FAILED_REGISTRATION", ... })</div>
            • <strong style="color:#f1f5f9;">Discord Webhook:</strong> Real-time high-priority embed posted to leadership war channel.<br/>
            • <strong style="color:#f1f5f9;">Railway Bot Bridge:</strong> Automated ping dispatched via /api/system/broadcast.<br/>
            • <strong style="color:#f1f5f9;">DynamoDB Presence Queue:</strong> Logged to PENDING_PINGS partition for in-dashboard badge indicator.<br/>
            • <strong style="color:#f1f5f9;">Admin Telemetry Feed:</strong> Instant reviewable event card on /admin/analytics.
        </div>

        <div class="doc-footer">
            <span>UNITY V2 SYSTEM ARCHITECTURE SPECIFICATION</span>
            <span>SECTION 2 OF 2 • COGNITIVE ENGINES & WAR ROOM</span>
        </div>
    </div>

</body>
</html>
`;

// 1. Write the HTML template to disk
fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');
console.log(`[1/3] Generated architecture document template at: ${tempHtmlPath}`);

// 2. Render to PDF using Microsoft Edge Headless
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (fs.existsSync(edgePath)) {
    console.log(`[2/3] Compiling vector PDF via Microsoft Edge Headless Engine...`);
    try {
        const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outputPdfPath}" "file:///${tempHtmlPath.replace(/\\\\/g, '/')}"`;
        execSync(cmd, { stdio: 'inherit' });
        console.log(`[SUCCESS] PDF compiled to public docs: ${outputPdfPath}`);

        // Also copy to root directory for easy access
        fs.copyFileSync(outputPdfPath, rootPdfPath);
        console.log(`[SUCCESS] PDF mirrored to root directory: ${rootPdfPath}`);

        // Copy to artifact directory if brain path is present
        const brainDir = path.resolve('C:/Users/laure/.gemini/antigravity/brain/96559854-34ed-4b61-b391-06d9d507d838');
        if (fs.existsSync(brainDir)) {
            const artifactPdfPath = path.join(brainDir, 'Unity_V2_System_Architecture_Guide.pdf');
            fs.copyFileSync(outputPdfPath, artifactPdfPath);
            console.log(`[SUCCESS] PDF copied to Antigravity artifact directory: ${artifactPdfPath}`);
        }
    } catch (e) {
        console.error("[ERROR] Failed to compile PDF via Edge:", e.message);
    }
} else {
    console.error(`[ERROR] Edge executable not found at: ${edgePath}`);
}

console.log(`[3/3] PDF compilation workflow finished.`);
