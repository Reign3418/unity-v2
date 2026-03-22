"use client";

import { BookOpen, Tag, Zap, Shield, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";

const CHANGELOG = [
  {
    version: "2.0.0",
    date: "March 2026",
    type: "major",
    label: "Unity V2 Launch",
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
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Changelog</h1>
            <p className="text-violet-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Unity Platform Version History</p>
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
                          <span className="text-[9px] bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Major</span>
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
