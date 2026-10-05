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

if (!fs.existsSync(publicDocsDir)) {
    fs.mkdirSync(publicDocsDir, { recursive: true });
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Unity V2 System Architecture Blueprint</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        @page {
            size: A4 landscape;
            margin: 0;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            background-color: #06080e;
            color: #e2e8f0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .slide {
            width: 297mm;
            height: 210mm;
            page-break-after: always;
            position: relative;
            background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
                        radial-gradient(circle at 90% 80%, rgba(217, 70, 239, 0.08) 0%, transparent 40%),
                        #06080e;
            padding: 14mm 16mm 12mm 16mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .slide:last-child {
            page-break-after: auto;
        }

        /* Top Bar */
        .top-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 10px;
        }

        .brand-cluster {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .shield-badge {
            width: 42px;
            height: 42px;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: 'Cinzel', serif;
            font-weight: 900;
            font-size: 22px;
            box-shadow: 0 0 25px rgba(99, 102, 241, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .brand-title {
            font-family: 'Cinzel', serif;
            font-size: 19pt;
            font-weight: 900;
            letter-spacing: 3px;
            color: #ffffff;
            text-transform: uppercase;
            line-height: 1;
        }

        .brand-subtitle {
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 2px;
            color: #818cf8;
            text-transform: uppercase;
            margin-top: 3px;
        }

        .meta-tags {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .meta-pill {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7.5pt;
            font-weight: 700;
            padding: 5px 10px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .pill-red {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #f87171;
        }

        .pill-cyan {
            background: rgba(6, 182, 212, 0.12);
            border: 1px solid rgba(6, 182, 212, 0.35);
            color: #38bdf8;
        }

        /* Hero KPI Strip */
        .kpi-strip {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin: 12px 0;
        }

        .kpi-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 10px;
            padding: 10px 14px;
            position: relative;
            backdrop-filter: blur(10px);
        }

        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 14px;
            right: 14px;
            height: 2px;
            border-radius: 2px;
        }

        .kpi-card.indigo::before { background: linear-gradient(90deg, #6366f1, transparent); }
        .kpi-card.cyan::before { background: linear-gradient(90deg, #06b6d4, transparent); }
        .kpi-card.emerald::before { background: linear-gradient(90deg, #10b981, transparent); }
        .kpi-card.gold::before { background: linear-gradient(90deg, #f59e0b, transparent); }
        .kpi-card.purple::before { background: linear-gradient(90deg, #a855f7, transparent); }

        .kpi-value {
            font-family: 'JetBrains Mono', monospace;
            font-size: 17pt;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.1;
        }

        .kpi-label {
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #94a3b8;
            margin-top: 2px;
        }

        .kpi-sub {
            font-size: 7pt;
            color: #64748b;
            font-family: 'JetBrains Mono', monospace;
        }

        /* Main Architecture Flow */
        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .section-title {
            font-family: 'Cinzel', serif;
            font-size: 11pt;
            font-weight: 800;
            color: #f8fafc;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-title::before {
            content: '';
            width: 4px;
            height: 14px;
            background: #6366f1;
            border-radius: 2px;
        }

        .pipeline-track {
            display: grid;
            grid-template-columns: 1fr 24px 1fr 24px 1.2fr 24px 1.3fr 24px 1fr;
            align-items: center;
            gap: 0;
            margin: 8px 0;
        }

        .pipeline-node {
            background: #0d121f;
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 12px;
            height: 84mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            position: relative;
        }

        .pipeline-node.glow-cyan { border-color: rgba(6, 182, 212, 0.4); box-shadow: 0 0 20px rgba(6, 182, 212, 0.15); }
        .pipeline-node.glow-indigo { border-color: rgba(99, 102, 241, 0.4); box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
        .pipeline-node.glow-purple { border-color: rgba(168, 85, 247, 0.4); box-shadow: 0 0 20px rgba(168, 85, 247, 0.15); }
        .pipeline-node.glow-emerald { border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 0 20px rgba(16, 185, 129, 0.15); }
        .pipeline-node.glow-rose { border-color: rgba(244, 63, 94, 0.4); box-shadow: 0 0 20px rgba(244, 63, 94, 0.15); }

        .node-step {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7pt;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }

        .node-title {
            font-size: 10.5pt;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.2;
            margin-bottom: 6px;
        }

        .node-body {
            font-size: 7.5pt;
            color: #94a3b8;
            line-height: 1.45;
            flex-grow: 1;
        }

        .node-specs {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .spec-item {
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.8pt;
            color: #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .spec-item span:first-child { color: #64748b; }

        .pipeline-arrow {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #475569;
            font-size: 14pt;
            font-weight: 900;
        }

        /* Bottom Feature Highlights */
        .bottom-features {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-top: 6px;
        }

        .feature-box {
            background: rgba(13, 18, 31, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            padding: 8px 12px;
        }

        .feature-box-title {
            font-size: 8pt;
            font-weight: 800;
            color: #f1f5f9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 2px;
        }

        .feature-box-desc {
            font-size: 7pt;
            color: #94a3b8;
            line-height: 1.35;
        }

        /* Slide Footer */
        .slide-footer {
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: 'JetBrains Mono', monospace;
            font-size: 7pt;
            color: #64748b;
        }

        /* Grid for Page 2 */
        .intel-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 10px 0;
        }

        .intel-card {
            background: #0d121f;
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 48mm;
        }

        .intel-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .intel-card-title {
            font-size: 10pt;
            font-weight: 800;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .intel-tag {
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.5pt;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
        }

        .intel-card-desc {
            font-size: 7.5pt;
            color: #94a3b8;
            line-height: 1.4;
            margin-bottom: 6px;
        }

        .intel-stats {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 6px;
            padding: 6px 8px;
            display: flex;
            justify-content: space-between;
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.8pt;
        }

        /* Dynamo Table on Page 2 */
        .storage-box {
            background: #0d121f;
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 12px 14px;
            margin: 6px 0;
        }

        .dynamo-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 6px;
        }

        .dynamo-cell {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            padding: 6px 8px;
        }

        .pk-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7.2pt;
            font-weight: 700;
            color: #a78bfa;
        }

        .sk-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 6.5pt;
            color: #34d399;
            margin: 1px 0;
        }

        .cell-desc {
            font-size: 6.5pt;
            color: #64748b;
            line-height: 1.3;
        }
    </style>
</head>
<body>

    <!-- ========================================== -->
    <!-- SLIDE 1: END-TO-END PIPELINE ARCHITECTURE  -->
    <!-- ========================================== -->
    <div class="slide">
        
        <!-- Header -->
        <div class="top-nav">
            <div class="brand-cluster">
                <div class="shield-badge">U</div>
                <div>
                    <div class="brand-title">Unity V2 Sovereign Architecture</div>
                    <div class="brand-subtitle">Automated War Room & Kingdom Operations Blueprint</div>
                </div>
            </div>
            <div class="meta-tags">
                <span class="meta-pill pill-red">Classified • High Command</span>
                <span class="meta-pill pill-cyan">Zero-Cost Serverless ($0.00)</span>
            </div>
        </div>

        <!-- KPI Hero Strip -->
        <div class="kpi-strip">
            <div class="kpi-card indigo">
                <div class="kpi-value">139,064</div>
                <div class="kpi-label">Governors Tracked</div>
                <div class="kpi-sub">Cross-KD Census Network</div>
            </div>
            <div class="kpi-card cyan">
                <div class="kpi-value">163</div>
                <div class="kpi-label">Affiliated Kingdoms</div>
                <div class="kpi-sub">Global Migration Directory</div>
            </div>
            <div class="kpi-card emerald">
                <div class="kpi-value">$0.00</div>
                <div class="kpi-label">Serverless Cloud Cost</div>
                <div class="kpi-sub">Zero-Token Local Execution</div>
            </div>
            <div class="kpi-card gold">
                <div class="kpi-value">&lt; 10ms</div>
                <div class="kpi-label">DynamoDB Retrieval</div>
                <div class="kpi-sub">Single-Table Optimized Query</div>
            </div>
            <div class="kpi-card purple">
                <div class="kpi-value">12</div>
                <div class="kpi-label">Native Languages</div>
                <div class="kpi-sub">100% Verified i18n Parity</div>
            </div>
        </div>

        <!-- Pipeline Flow -->
        <div class="section-header">
            <div class="section-title">The End-to-End Operational Pipeline</div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; color: #818cf8;">Edge Browser ➔ Serverless Gateway ➔ Single-Table Storage ➔ War Room</div>
        </div>

        <div class="pipeline-track">
            <!-- Node 1 -->
            <div class="pipeline-node glow-cyan">
                <div>
                    <div class="node-step">Tier 1 • Client</div>
                    <div class="node-title">In-Game Mobile Capture</div>
                    <div class="node-body">Governors snap their Rise of Kingdoms profile card, KvK spreadsheet, or combat gear screenshots directly on mobile or desktop.</div>
                </div>
                <div class="node-specs">
                    <div class="spec-item"><span>Resolution</span><span>Up to 4K</span></div>
                    <div class="spec-item"><span>Format</span><span>PNG / WebP / XLSX</span></div>
                    <div class="spec-item"><span>Client</span><span>React 19 Edge</span></div>
                </div>
            </div>

            <div class="pipeline-arrow">➔</div>

            <!-- Node 2 -->
            <div class="pipeline-node glow-indigo">
                <div>
                    <div class="node-step">Tier 2 • AI Vision</div>
                    <div class="node-title">Multimodal Vision OCR</div>
                    <div class="node-body">Gemini 3.1 Flash-Lite & WebGPU optical heuristics extract numeric ID, name, alliance tag, power, and KP in &lt;600ms without brittle regex.</div>
                </div>
                <div class="node-specs">
                    <div class="spec-item"><span>AI Model</span><span>Gemini 3.1 Flash</span></div>
                    <div class="spec-item"><span>Fallback</span><span>WebGPU / Canvas</span></div>
                    <div class="spec-item"><span>Throughput</span><span>20 RPM / 1.5K RPD</span></div>
                </div>
            </div>

            <div class="pipeline-arrow">➔</div>

            <!-- Node 3 -->
            <div class="pipeline-node glow-purple">
                <div>
                    <div class="node-step">Tier 3 • Edge Engine</div>
                    <div class="node-title">ExcelJS & Auth Gateway</div>
                    <div class="node-body">Next.js 16 App Router sanitizes inputs, verifies 8-digit PIN against salted hash, filters Heroscrolls tabs, and batches 60,000-row KvK workbooks.</div>
                </div>
                <div class="node-specs">
                    <div class="spec-item"><span>Runtime</span><span>Next.js 16 App Router</span></div>
                    <div class="spec-item"><span>Engine</span><span>ExcelJS 4.4.0</span></div>
                    <div class="spec-item"><span>Auth</span><span>NextAuth v5 (PIN / Discord)</span></div>
                </div>
            </div>

            <div class="pipeline-arrow">➔</div>

            <!-- Node 4 -->
            <div class="pipeline-node glow-emerald">
                <div>
                    <div class="node-step">Tier 4 • Sovereign Vault</div>
                    <div class="node-title">AWS DynamoDB Core</div>
                    <div class="node-body">Single-table design partition indexing historical scans (SCAN#kd#date), player profiles, migration history, and 90-day telemetry with auto-expiry TTL.</div>
                </div>
                <div class="node-specs">
                    <div class="spec-item"><span>Table</span><span>unity-core-production</span></div>
                    <div class="spec-item"><span>Latency</span><span>Single-Digit ms</span></div>
                    <div class="spec-item"><span>Encryption</span><span>AWS KMS at Rest</span></div>
                </div>
            </div>

            <div class="pipeline-arrow">➔</div>

            <!-- Node 5 -->
            <div class="pipeline-node glow-rose">
                <div>
                    <div class="node-step">Tier 5 • Command</div>
                    <div class="node-title">War Room & Alert System</div>
                    <div class="node-body">High Command analyzes KvK battle radar, deadweight polygraphs, and fraud anomalies. Critical alerts dispatch in parallel across Discord webhooks & Railway bot.</div>
                </div>
                <div class="node-specs">
                    <div class="spec-item"><span>Alerts</span><span>Multi-Channel SOS</span></div>
                    <div class="spec-item"><span>Dispatch</span><span>Discord Webhook / Bot</span></div>
                    <div class="spec-item"><span>Clearance</span><span>SuperAdmin / Leader</span></div>
                </div>
            </div>
        </div>

        <!-- Bottom Feature Highlights -->
        <div class="bottom-features">
            <div class="feature-box">
                <div class="feature-box-title" style="color: #38bdf8;">⚡ Zero-Cost Serverless Standard</div>
                <div class="feature-box-desc">Eliminated cloud GPU hosting bills ($400+/mo). All vision and thinking runs on Google AI Studio Free Tier and client device WebGPU.</div>
            </div>
            <div class="feature-box">
                <div class="feature-box-title" style="color: #a78bfa;">🔒 Enterprise Security Hardening</div>
                <div class="feature-box-desc">ExcelJS streaming prevents prototype pollution CVEs. Argon2/SHA256 salted PIN hashes protect governor accounts without requiring Discord OAuth.</div>
            </div>
            <div class="feature-box">
                <div class="feature-box-title" style="color: #34d399;">🌍 Universal Global Parity</div>
                <div class="feature-box-desc">12 fully synchronized locales (en, ar, de, es, fr, id, ko, pt, ru, tr, vi, zh) verified by CI pre-commit parity gates.</div>
            </div>
        </div>

        <!-- Slide Footer -->
        <div class="slide-footer">
            <span>UNITY V2 INTELLIGENCE ENGINE • ARCHITECTURAL SYSTEM BLUEPRINT</span>
            <span>KINGDOM 3418 HIGH COMMAND OPERATIONS • PAGE 1 OF 2</span>
        </div>
    </div>

    <!-- ========================================== -->
    <!-- SLIDE 2: WAR ROOM INTELLIGENCE WEAPONS     -->
    <!-- ========================================== -->
    <div class="slide">
        
        <!-- Header -->
        <div class="top-nav">
            <div class="brand-cluster">
                <div class="shield-badge">U</div>
                <div>
                    <div class="brand-title">War Room Weapons & Intelligence Suites</div>
                    <div class="brand-subtitle">Governor Verification, Anomaly Classification & Combat Engines</div>
                </div>
            </div>
            <div class="meta-tags">
                <span class="meta-pill pill-red">Tactical Operations</span>
                <span class="meta-pill pill-cyan">Gemini 2.5 Flash Thinking</span>
            </div>
        </div>

        <!-- Section 1: Flagship Intelligence Tools -->
        <div class="section-header" style="margin-top: 6px;">
            <div class="section-title">High Command Intelligence Modules</div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; color: #a78bfa;">Multivariate Algorithmic Math & LLM Strategic Reasoning</div>
        </div>

        <div class="intel-grid">
            <!-- Tool 1 -->
            <div class="intel-card" style="border-top: 3px solid #6366f1;">
                <div>
                    <div class="intel-card-header">
                        <div class="intel-card-title">EK Polygraph</div>
                        <span class="intel-tag" style="background: rgba(99, 102, 241, 0.2); color: #818cf8;">Behavioral AI</span>
                    </div>
                    <div class="intel-card-desc">Audits 30-day ratios between power gains and kill points. Detects farm-trading, civil duelers, and deadweight who hoard power without fighting in war.</div>
                </div>
                <div class="intel-stats">
                    <span style="color: #94a3b8;">Metric: KP / Power Delta</span>
                    <span style="color: #818cf8;">Route: /tools/polygraph</span>
                </div>
            </div>

            <!-- Tool 2 -->
            <div class="intel-card" style="border-top: 3px solid #06b6d4;">
                <div>
                    <div class="intel-card-header">
                        <div class="intel-card-title">Player Hunter</div>
                        <span class="intel-tag" style="background: rgba(6, 182, 212, 0.2); color: #22d3ee;">Cross-KD Census</span>
                    </div>
                    <div class="intel-card-desc">Searches 139,000+ historical player profiles across 163 kingdoms. Allows officers to vet migration applicants and view previous alliance loyalties.</div>
                </div>
                <div class="intel-stats">
                    <span style="color: #94a3b8;">Coverage: 163 Kingdoms</span>
                    <span style="color: #22d3ee;">Route: /tools/hunter</span>
                </div>
            </div>

            <!-- Tool 3 -->
            <div class="intel-card" style="border-top: 3px solid #a855f7;">
                <div>
                    <div class="intel-card-header">
                        <div class="intel-card-title">Ghost Hunter</div>
                        <span class="intel-tag" style="background: rgba(168, 85, 247, 0.2); color: #c084fc;">Vitality Engine</span>
                    </div>
                    <div class="intel-card-desc">Detects completely dormant accounts (zero power & zero KP delta over 7–60 days). Grades kingdom activity vitality (A through F) and quantifies deadweight weight.</div>
                </div>
                <div class="intel-stats">
                    <span style="color: #94a3b8;">Output: Vitality Grade</span>
                    <span style="color: #c084fc;">Route: /tools/ghost-hunter</span>
                </div>
            </div>

            <!-- Tool 4 -->
            <div class="intel-card" style="border-top: 3px solid #f43f5e;">
                <div>
                    <div class="intel-card-header">
                        <div class="intel-card-title">Anomaly & Fraud Matrix</div>
                        <span class="intel-tag" style="background: rgba(244, 63, 94, 0.2); color: #fb7185;">Lab Prototype</span>
                    </div>
                    <div class="intel-card-desc">Multivariate math classifying stat-padders (&ge;70% T1 farm duel kills), automated farm bots, deadweight whales (&ge;65M), and account buyer risks before KvK locks.</div>
                </div>
                <div class="intel-stats">
                    <span style="color: #94a3b8;">Cost: $0.00 Serverless</span>
                    <span style="color: #fb7185;">Route: /creator/lab/anomaly</span>
                </div>
            </div>

            <!-- Tool 5 -->
            <div class="intel-card" style="border-top: 3px solid #f59e0b;">
                <div>
                    <div class="intel-card-header">
                        <div class="intel-card-title">Battle Predictor 2.5</div>
                        <span class="intel-tag" style="background: rgba(245, 158, 11, 0.2); color: #fcd34d;">Tactical Thinking</span>
                    </div>
                    <div class="intel-card-desc">Powered by Gemini 2.5 Flash Thinking. Compares up to 4 kingdoms head-to-head with radar charts, troop power density, T5 fighter ratios, and brutal odds verdicts.</div>
                </div>
                <div class="intel-stats">
                    <span style="color: #94a3b8;">Model: Gemini 2.5 Flash</span>
                    <span style="color: #fcd34d;">Route: /creator/lab/battle</span>
                </div>
            </div>

            <!-- Tool 6 -->
            <div class="intel-card" style="border-top: 3px solid #10b981;">
                <div>
                    <div class="intel-card-header">
                        <div class="intel-card-title">AI Combat Coach</div>
                        <span class="intel-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">Governor Mentor</span>
                    </div>
                    <div class="intel-card-desc">Personalized 1-on-1 performance coaching for every governor. Benchmarks personal deltas against power peers and dynamically adapts tone for peace vs war in 12 languages.</div>
                </div>
                <div class="intel-stats">
                    <span style="color: #94a3b8;">Locales: 12 Languages</span>
                    <span style="color: #34d399;">Route: /stats (AI Coach)</span>
                </div>
            </div>
        </div>

        <!-- Section 2: DynamoDB Single-Table Map -->
        <div class="storage-box">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <div class="section-title" style="font-size: 9pt;">AWS DynamoDB Partition Key (PK) & Sort Key (SK) Architecture</div>
                <div style="font-family: 'JetBrains Mono', monospace; font-size: 7pt; color: #64748b;">Table: unity-core-production</div>
            </div>

            <div class="dynamo-grid">
                <div class="dynamo-cell">
                    <div class="pk-label">PK: SCAN#{kd}#{date}</div>
                    <div class="sk-label">SK: GOV#{governorId}</div>
                    <div class="cell-desc">60,000+ governor nodes. Power, T1-T5, KP, Deads, Tech, Building Power.</div>
                </div>
                <div class="dynamo-cell">
                    <div class="pk-label">PK: DATES#{kd}</div>
                    <div class="sk-label">SK: DATE#{timestamp}</div>
                    <div class="cell-desc">Chronological index of every scan snapshot. Powers delta comparisons.</div>
                </div>
                <div class="dynamo-cell">
                    <div class="pk-label">PK: AUTH_GOVERNOR</div>
                    <div class="sk-label">SK: GOV#{governorId}</div>
                    <div class="cell-desc">8-digit ID, Argon2/SHA256 salted PIN hash, Discord ID, SuperAdmin / Leader roles.</div>
                </div>
                <div class="dynamo-cell">
                    <div class="pk-label">PK: EVENTS#{YYYY-MM-DD}</div>
                    <div class="sk-label">SK: EVENT#{ts}#{uuid}</div>
                    <div class="cell-desc">Universal platform telemetry with 90-day automatic DynamoDB TTL expiry.</div>
                </div>
            </div>
        </div>

        <!-- Slide Footer -->
        <div class="slide-footer">
            <span>UNITY V2 INTELLIGENCE ENGINE • WAR ROOM SPECIFICATION</span>
            <span>KINGDOM 3418 HIGH COMMAND OPERATIONS • PAGE 2 OF 2</span>
        </div>
    </div>

</body>
</html>
`;

fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');
console.log(`[1/3] Generated landscape infographic template: ${tempHtmlPath}`);

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (fs.existsSync(edgePath)) {
    console.log(`[2/3] Compiling executive PDF via Microsoft Edge Headless Engine...`);
    try {
        const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf-no-header --print-to-pdf="${outputPdfPath}" "file:///${tempHtmlPath.replace(/\\\\/g, '/')}"`;
        execSync(cmd, { stdio: 'inherit' });
        console.log(`[SUCCESS] PDF compiled to: ${outputPdfPath}`);

        fs.copyFileSync(outputPdfPath, rootPdfPath);
        console.log(`[SUCCESS] PDF copied to root: ${rootPdfPath}`);

        const brainDir = path.resolve('C:/Users/laure/.gemini/antigravity/brain/96559854-34ed-4b61-b391-06d9d507d838');
        if (fs.existsSync(brainDir)) {
            const artifactPdfPath = path.join(brainDir, 'Unity_V2_System_Architecture_Guide.pdf');
            fs.copyFileSync(outputPdfPath, artifactPdfPath);
            console.log(`[SUCCESS] PDF mirrored to Antigravity artifact: ${artifactPdfPath}`);
        }
    } catch (e) {
        console.error("[ERROR] Failed to compile PDF via Edge:", e.message);
    }
}

// Clean up temp
if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
}

console.log(`[3/3] Executive PDF compilation complete.`);
