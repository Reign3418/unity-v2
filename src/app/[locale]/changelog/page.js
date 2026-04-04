"use client";

import { BookOpen, Tag, Zap, Shield, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Changelog() {
  const t = useTranslations('Changelog');
  const releases = t.raw('releases');

  const CHANGELOG = [
    {
      version: "2.2.1",
      date: releases["2_2_1"].date,
      type: "patch",
      label: releases["2_2_1"].label,
      highlights: [releases["2_2_1"].h1, releases["2_2_1"].h2].filter(Boolean),
      changes: [
        { type: "fix", text: releases["2_2_1"].c1 },
        { type: "fix", text: releases["2_2_1"].c2 },
        { type: "fix", text: releases["2_2_1"].c3 },
        { type: "new", text: releases["2_2_1"].c4 },
        { type: "new", text: releases["2_2_1"].c5 },
        { type: "new", text: releases["2_2_1"].c6 }
      ]
    },
    {
      version: "2.2.0",
      date: releases["2_2_0"].date,
      type: "minor",
      label: releases["2_2_0"].label,
      highlights: [releases["2_2_0"].h1, releases["2_2_0"].h2].filter(Boolean),
      changes: [
        { type: "new", text: releases["2_2_0"].c1 },
        { type: "new", text: releases["2_2_0"].c2 },
        { type: "new", text: releases["2_2_0"].c3 },
        { type: "security", text: releases["2_2_0"].c4 },
        { type: "fix", text: releases["2_2_0"].c5 }
      ]
    },
    {
      version: "2.1.0",
      date: releases["2_1_0"].date,
      type: "minor",
      label: releases["2_1_0"].label,
      highlights: [releases["2_1_0"].h1, releases["2_1_0"].h2].filter(Boolean),
      changes: [
        { type: "new", text: releases["2_1_0"].c1 },
        { type: "new", text: releases["2_1_0"].c2 },
        { type: "new", text: releases["2_1_0"].c3 },
        { type: "new", text: releases["2_1_0"].c4 },
        { type: "new", text: releases["2_1_0"].c5 },
        { type: "fix", text: releases["2_1_0"].c6 }
      ]
    },
    {
      version: "2.0.0",
      date: releases["2_0_0"].date,
      type: "major",
      label: releases["2_0_0"].label,
      highlights: [releases["2_0_0"].h1, releases["2_0_0"].h2, releases["2_0_0"].h3, releases["2_0_0"].h4].filter(Boolean),
      changes: [
        { type: "new", text: releases["2_0_0"].c1 },
        { type: "new", text: releases["2_0_0"].c2 },
        { type: "new", text: releases["2_0_0"].c3 },
        { type: "new", text: releases["2_0_0"].c4 },
        { type: "new", text: releases["2_0_0"].c5 },
        { type: "new", text: releases["2_0_0"].c6 },
        { type: "new", text: releases["2_0_0"].c7 },
        { type: "new", text: releases["2_0_0"].c8 },
        { type: "new", text: releases["2_0_0"].c9 },
        { type: "new", text: releases["2_0_0"].c10 },
        { type: "new", text: releases["2_0_0"].c11 },
        { type: "new", text: releases["2_0_0"].c12 },
        { type: "fix", text: releases["2_0_0"].c13 },
        { type: "fix", text: releases["2_0_0"].c14 },
        { type: "fix", text: releases["2_0_0"].c15 },
        { type: "fix", text: releases["2_0_0"].c16 },
        { type: "security", text: releases["2_0_0"].c17 },
        { type: "security", text: releases["2_0_0"].c18 }
      ]
    },
    {
      version: "1.5.x",
      date: releases["1_5_x"].date,
      type: "patch",
      label: releases["1_5_x"].label,
      changes: [
        { type: "new", text: releases["1_5_x"].c1 },
        { type: "new", text: releases["1_5_x"].c2 },
        { type: "fix", text: releases["1_5_x"].c3 }
      ]
    },
    {
      version: "1.0.0",
      date: releases["1_0_0"].date,
      type: "major",
      label: releases["1_0_0"].label,
      changes: [
        { type: "new", text: releases["1_0_0"].c1 },
        { type: "new", text: releases["1_0_0"].c2 },
        { type: "new", text: releases["1_0_0"].c3 },
        { type: "new", text: releases["1_0_0"].c4 }
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
