"use client";

import { BookOpen, Tag, Zap, Shield, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

const CHANGELOG = [
  {
    version: "2.2.1",
    date: "Late March 2026",
    type: "patch",
    label: "Global Analytics Patches & Feature Expansion",
    highlights: [
      "Secured data integrity globally by permanently fixing Activity Tracker KP drops and missing Dead Troop summaries",
      "Overhauled the Discord Server commands route handling to properly mount the /bind Farm Siphoning mechanics"
    ],
    changes: [
      { type: "fix", text: "Global Analytics (Delta Engine) — Repaired structural mapping bug where calculating dead troop deltas strictly resolved to zero." },
      { type: "fix", text: "Activity Tracker Data Normalization — Resolved a case-sensitivity parsing drop from AWS DynamoDB to properly extract kill points." },
      { type: "fix", text: "Discord Bot Data Retrieval — Corrected an outdated timestamp mapping pattern that inadvertently blocked /jarvis and /stats API queries." },
      { type: "new", text: "Activity Tracker Wildcards — Upgraded the tracker's dashboard API to permit unbounded cross-kingdom trajectory retrieval." },
      { type: "new", text: "AWS DynamoDB Retroactive Injection — Executed a master system patch to backfill historically missing 'Deads' metrics directly into the chronological data pools." },
      { type: "new", text: "Discord Slash Commands — Overhauled the native Discord /help UI embed and fully mounted the Farm Authentication bindings logic." }
    ]
  },
  {
    version: "2.2.0",
    date: "Late March 2026",
    type: "minor",
    label: "Advanced Data Sandbox & Cloud Forensics",
    highlights: [
      "Engineered a robust Data Sandbox for real-time dynamic mapping of legacy Excel files to native JSON parameters",
      "Built end-to-end data audit tracking, permanently linking uploaded Source Files directly into the AWS DynamoDB Global Matrix"
    ],
    changes: [
      { type: "new", text: "Sandbox Raw Data Inspector — Admins can dynamically map unrecognizable legacy Excel headers into strict Unity variable structures" },
      { type: "new", text: "Explicit DTG Master Control — HTML5 Datetime-local inputs integrated to manually inject exact historical Scan Date times" },
      { type: "new", text: "Global Cloud Audit Log Expansion — A new Source Origin column natively tracks and renders the actual Excel file names used to trigger Cloud uploads" },
      { type: "security", text: "Origin File Signatures — All Sandbox cloud ingestions are permanently branded with their forensic Filename directly inside the DynamoDB DATES partition key" },
      { type: "fix", text: "Excel Target Interception — The Sandbox matrix bypasses generic Sheet Names to extract root Kingdom IDs directly from the OS Filename" }
    ]
  },
  {
    version: "2.1.0",
    date: "Late March 2026",
    type: "minor",
    label: "Event & Presence Matrix",
    highlights: [
      "Deployed the Global Event Trajectory AWS engine, securely bridging Web UI and Discord cron jobs",
      "Built the Governor Presence tracking architecture for live status webhook routing"
    ],
    changes: [
      { type: "new", text: "Global Event Trajectory UI — Web Admins can now map out Competitive schedules natively" },
      { type: "new", text: "Governor Presence Modal — Players can sync Working/Sleeping/Vacation schedules directly to AWS" },
      { type: "new", text: "Discord Webhook Router — Event cron jobs aggressively ping target channels precisely 15m and 0m before events" },
      { type: "new", text: "/event schedule (Discord) — Implemented native Timezone Offset logic to eliminate UTC paradoxes" },
      { type: "new", text: "/config channel (Discord) — Administrators can designate exact channels for Pipeline routing" },
      { type: "fix", text: "Repaired the /bind Discord module and flushed the missing Slash Command arrays into production" }
    ]
  },
  {
    version: "2.0.0",
    date: "March 2026",
    type: "major",
    label: "The V2 Platform Rewrite",
    highlights: [
      "Full platform rebuild on Next.js + AWS DynamoDB — zero legacy dependencies",
      "Discord OAuth authentication replacing manual token flows",
      "All pages now server-side rendered with isolated API routes (no exposed secrets)",
      "Recharts data visualizations across Kingdom, Global, Pre-KvK and DKP dashboards",
    ],
    changes: [
      { type: "new", text: "Kingdom Vault — Leader-only RSS economic reserve tracker" },
      { type: "new", text: "Pre-KvK Rankings — Algorithmic Preparedness Score leaderboard with podium" },
      { type: "new", text: "DKP Results Board — Post-KvK Tier grading system (S+ through F)" },
      { type: "new", text: "KvK After-Action Report — Alliance Hegemony output and Top 10 Vanguard Warriors" },
      { type: "new", text: "Kingdom Analysis (Area Charts) — Chronological Power trajectory visualization" },
      { type: "new", text: "All Kingdom Stats (Bar Charts) — Multi-KD comparative Power and KP metrics" },
      { type: "new", text: "My Alliance Hub — Dynamic roster filtered by Alliance Tag via AWS query" },
      { type: "new", text: "Activity Tracker — Chronological delta comparison (NEW / MISSING / GROWTH)" },
      { type: "new", text: "Player Hunter — Cross-Kingdom search via DynamoDB GOV_PROFILE index" },
      { type: "new", text: "Mail Generator — KvK Push, Rally, and General message templates" },
      { type: "new", text: "Calculators — RSS estimation and Speedup math tools" },
      { type: "new", text: "Admin Panel — AWS Cloud Control, Tenant Management, Upload Triggers" },
      { type: "fix", text: "Replaced monolithic 4,716-line index.html with modular Next.js pages" },
      { type: "fix", text: "Replaced 4,711-line render-blocking style.css with Tailwind CSS" },
      { type: "fix", text: "Eliminated 3× exposed credential vulnerabilities from public stages" },
      { type: "fix", text: "Migrated from self-hosted MySQL to serverless AWS DynamoDB" },
      { type: "security", text: "All secrets now strictly server-side via .env.local — never bundled to client" },
      { type: "security", text: "Role-based access control on all leader routes (isLeader + Admin gates)" },
    ]
  },
  {
    version: "1.5.x",
    date: "Late 2025",
    type: "patch",
    label: "Final V1 Patches",
    changes: [
      { type: "new", text: "AI/Gemini Vision OCR engine for Discord RSS screenshot scanning" },
      { type: "new", text: "DKP tracking Discord bot commands (/dkp, /stats, /forge)" },
      { type: "fix", text: "Alliance tag normalization in CSV ingestion pipeline" },
    ]
  },
  {
    version: "1.0.0",
    date: "2025",
    type: "major",
    label: "Unity V1 Launch",
    changes: [
      { type: "new", text: "Initial Discord bot with /bind, /stats, /roster slash commands" },
      { type: "new", text: "Express.js API server with Discord OAuth" },
      { type: "new", text: "MySQL database for DKP rosters and governor data" },
      { type: "new", text: "Single-page HTML dashboard (index.html 4,716 lines)" },
    ]
  }
];
const TypeIcon = ({ type }) => {
  const map = {
    new: <Zap size={12} className="text-cyan-400" />,
    fix: <Wrench size={12} className="text-blue-400" />,
    security: <Shield size={12} className="text-amber-400" />,
  };
  return map[type] || <CheckCircle2 size={12} className="text-gray-400" />;
};

const TypeLabel = ({ type }) => {
  const colors = {
    new: "text-cyan-400",
    fix: "text-blue-400",
    security: "text-amber-400",
  };
  return (
    <span className={`font-bold uppercase text-[9px] tracking-widest ${colors[type] || "text-gray-400"}`}>
      {type}
    </span>
  );
};

export default function Changelog() {
  const t = useTranslations('Changelog');
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">

      {/* Header */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
            <BookOpen className="text-violet-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">{t('title')}</h1>
            <p className="text-violet-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Releases */}
      <div className="relative">
        {/* Timeline vertical bar */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/40 via-[#1e222b] to-transparent" />

        <div className="space-y-6 pl-14">
          {CHANGELOG.map((release, idx) => (
            <div key={idx} className="relative">
              {/* Dot */}
              <div className={`absolute -left-[2.85rem] top-5 w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${release.type === "major" ? "border-violet-500 bg-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.5)]" : "border-[#2d323e] bg-[#13161c]"}`}
              />

              <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
                {/* Version Header */}
                <div className={`px-6 py-5 border-b border-[#1e222b] flex items-center justify-between ${release.type === "major" ? "bg-[#0d1018] border-l-4 border-l-violet-500" : "bg-[#0a0c0f]"}`}>
                  <div className="flex items-center gap-3">
                    <Tag size={16} className={release.type === "major" ? "text-violet-400" : "text-gray-500"} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black font-mono text-lg">v{release.version}</span>
                        {release.type === "major" && (
                          <span className="text-[9px] bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">{t('label_major')}</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs font-bold tracking-wider mt-0.5">{release.label}</p>
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs font-mono">{release.date}</span>
                </div>

                {/* Highlights */}
                {release.highlights && (
                  <div className="px-6 py-4 bg-violet-500/5 border-b border-[#1e222b]">
                    <ul className="space-y-1.5">
                      {release.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300 text-xs">
                          <CheckCircle2 size={13} className="text-violet-400 mt-0.5 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Change Items */}
                <div className="p-4">
                  <ul className="space-y-2">
                    {release.changes.map((c, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-400 text-xs hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-white/5">
                        <div className="flex items-center gap-1.5 pt-0.5 w-16 shrink-0">
                          <TypeIcon type={c.type} />
                          <TypeLabel type={c.type} />
                        </div>
                        <span>{c.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
