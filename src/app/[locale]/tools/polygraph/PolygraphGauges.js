"use client";

import { useState } from "react";
import { Zap, AlertTriangle, Scale, Swords, Check, Copy, ExternalLink, X, Shield, Crown, Sparkles, Activity, ChevronDown, ChevronUp, Search, TrendingUp, Cpu, UserPlus, Flame } from "lucide-react";
import { useRouter } from "next/navigation";

// Formatter helper
const fmt = (n) => {
  const abs = Math.abs(n || 0);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(Math.round(n / 100) * 100 / 1e3).toFixed(0)}k`;
  return String(n || 0);
};
const fd = (n) => (n > 0 ? "+" : "") + fmt(n);

/**
 * 1. Momentum Tachometer (Speedometer Gauge)
 */
export function MomentumTachometer({ velocityMetrics, serverAgeDays, t }) {
  if (!velocityMetrics) return null;

  const ratio = velocityMetrics.velocityRatio ?? 100;
  const clampedRatio = Math.max(0, Math.min(220, ratio));
  const needleAngle = -90 + (clampedRatio / 200) * 180;

  const status = velocityMetrics.momentumStatus || (ratio >= 130 ? 'SURGE' : ratio >= 85 ? 'NOMINAL' : 'SLOWDOWN');
  const statusColor = status === 'SURGE' 
    ? 'text-fuchsia-400 bg-fuchsia-500/20 border-fuchsia-500/40 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
    : status === 'NOMINAL' 
      ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
      : 'text-amber-400 bg-amber-500/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]';

  return (
    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5 shadow-xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: Info */}
        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{t("tachometer_title")}</h3>
              <p className="text-[11px] text-gray-400">{t("tachometer_desc")}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 font-mono text-xs text-gray-400">
            {serverAgeDays !== null && serverAgeDays !== undefined && (
              <span className="bg-[#151921] px-2.5 py-1 rounded-md border border-[#232834] text-cyan-300">
                Age: {serverAgeDays}d
              </span>
            )}
            <span className="bg-[#151921] px-2.5 py-1 rounded-md border border-[#232834]">
              Window: {velocityMetrics.windowDays}d
            </span>
            <span className={`px-2.5 py-1 rounded-md border uppercase font-bold text-[10px] ${statusColor}`}>
              {status}
            </span>
          </div>
        </div>

        {/* Center: SVG Gauge */}
        <div className="flex flex-col items-center justify-center shrink-0" dir="ltr">
          <div className="relative w-48 h-28 flex items-end justify-center overflow-hidden">
            <svg viewBox="0 0 200 110" className="w-48 h-28">
              <defs>
                <linearGradient id="tachoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="42%" stopColor="#10b981" />
                  <stop offset="70%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#1a1e28"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Gradient Track */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#tachoGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Needle */}
              <g transform={`rotate(${needleAngle} 100 100)`} className="transition-transform duration-700 ease-out">
                <line x1="100" y1="100" x2="100" y2="28" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                <polygon points="96,40 104,40 100,24" fill="#ffffff" />
                <circle cx="100" cy="100" r="7" fill="#d946ef" stroke="#ffffff" strokeWidth="2" />
              </g>
              {/* Scale Labels */}
              <text x="22" y="108" fill="#6b7280" fontSize="9" fontWeight="bold" textAnchor="middle">0%</text>
              <text x="100" y="32" fill="#9ca3af" fontSize="9" fontWeight="bold" textAnchor="middle">100%</text>
              <text x="178" y="108" fill="#d946ef" fontSize="9" fontWeight="bold" textAnchor="middle">200%+</text>
            </svg>
          </div>
          <div className="text-center -mt-2">
            <span className="text-2xl font-black font-mono text-white tracking-tight">{ratio}%</span>
            <span className="text-[10px] text-gray-500 font-bold uppercase block tracking-wider">{t("gauge_momentum_ratio")}</span>
          </div>
        </div>

        {/* Right: Metrics readout */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 shrink-0 w-full md:w-auto" dir="ltr">
          <div className="bg-[#12151d] border border-[#202533] rounded-lg px-4 py-2 min-w-[140px] text-center md:text-left">
            <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">{t("gauge_window_pace")}</div>
            <div className="text-sm font-black font-mono text-cyan-400">
              {velocityMetrics.windowPowerVelocity >= 0 ? '+' : ''}{fmt(velocityMetrics.windowPowerVelocity)}/d
            </div>
          </div>
          <div className="bg-[#12151d] border border-[#202533] rounded-lg px-4 py-2 min-w-[140px] text-center md:text-left">
            <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">{t("gauge_lifetime_pace")}</div>
            <div className="text-sm font-black font-mono text-slate-300">
              {velocityMetrics.lifetimePowerVelocity ? `+${fmt(velocityMetrics.lifetimePowerVelocity)}/d` : 'N/A'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * 2. Civil War Seismic Tension Gauge
 */
export function SeismicTensionGauge({ civilWarProbability, civilWarRationale, switchersCount, alliances, t }) {
  const risk = Math.max(0, Math.min(100, parseInt(civilWarProbability || '0', 10)));
  const isCritical = risk >= 55;
  const isElevated = risk >= 25 && risk < 55;
  
  const statusLabel = isCritical ? t("seismic_critical") : isElevated ? t("seismic_elevated") : t("seismic_unified");
  const badgeStyle = isCritical 
    ? 'text-rose-400 bg-rose-500/15 border-rose-500/30' 
    : isElevated 
      ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' 
      : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  const strokeColor = isCritical ? '#f43f5e' : isElevated ? '#f59e0b' : '#10b981';

  return (
    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg border ${badgeStyle}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">{t("seismic_title")}</h3>
            <p className="text-[11px] text-gray-400">{t("seismic_desc")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase flex items-center gap-1.5 ${badgeStyle}`}>
            <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-500 animate-ping' : isElevated ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {statusLabel}
          </span>
          <span className={`text-2xl font-black font-mono ${isCritical ? 'text-rose-400' : isElevated ? 'text-amber-400' : 'text-emerald-400'}`} dir="ltr">
            {risk}%
          </span>
        </div>
      </div>

      {/* Dynamic Seismograph Readout Bar */}
      <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-3 relative overflow-hidden" dir="ltr">
        <div className="h-10 w-full flex items-center justify-center">
          <svg viewBox="0 0 400 40" className="w-full h-10 preserve-3d">
            <path
              d={
                isCritical
                  ? "M 0 20 L 50 20 L 70 5 L 85 35 L 105 2 L 120 38 L 140 20 L 220 20 L 235 0 L 250 40 L 265 10 L 280 32 L 300 20 L 400 20"
                  : isElevated
                    ? "M 0 20 L 80 20 L 100 12 L 115 28 L 130 8 L 145 30 L 160 20 L 250 20 L 270 14 L 285 26 L 300 20 L 400 20"
                    : "M 0 20 L 120 20 L 135 17 L 145 23 L 155 18 L 165 22 L 180 20 L 310 20 L 325 18 L 335 22 L 350 20 L 400 20"
              }
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="w-full bg-[#161a22] h-1.5 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full transition-all duration-700 ${isCritical ? 'bg-rose-500' : isElevated ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${risk}%` }}
          />
        </div>
      </div>

      {/* Threat Faultline Factors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Roster Churn</div>
          <div className={`text-sm font-bold font-mono ${switchersCount > 5 ? 'text-rose-400' : 'text-gray-300'}`}>
            {switchersCount || 0} Switchers
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">Internal alliance defection count</div>
        </div>
        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Structural Groupings</div>
          <div className="text-sm font-bold font-mono text-cyan-400">
            {alliances?.length || 0} Active Tags
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">Major power groupings in roster</div>
        </div>
        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-3">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">AI Rationale</div>
          <p className="text-xs text-gray-300 truncate" title={civilWarRationale}>
            {civilWarRationale || "Command structure nominal."}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. Deception & Anomaly Radar Matrix
 */
export function DeceptionRadarCard({ anomalies, t, onInspect }) {
  const score = anomalies?.integrityScore ?? 92;
  const status = anomalies?.integrityStatus || (score >= 90 ? 'PRISTINE' : score >= 70 ? 'ELEVATED' : 'HIGH_SUSPICION');
  const seed = anomalies?.projectedSeed || 'Seed B';
  const deadweightRatio = anomalies?.deadweightRatio ?? 0;

  const statusColor = status === 'PRISTINE' ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    : status === 'ELEVATED' ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    : 'text-rose-400 bg-rose-500/15 border-rose-500/30';

  const statusText = status === 'PRISTINE' ? t("deception_clean")
    : status === 'ELEVATED' ? t("deception_elevated")
    : t("deception_fraud");

  const statPaddersCount = anomalies?.summary?.statPadderCount ?? 0;
  const sandbaggersCount = anomalies?.summary?.sandbaggerCount ?? 0;
  const deadweightWhalesCount = anomalies?.summary?.deadweightWhaleCount ?? 0;
  const hyperCombatantsCount = anomalies?.summary?.hyperCombatantCount ?? 0;

  const circleOffset = 251.3 - (251.3 * score) / 100;
  const ringStroke = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e222b]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              {t("deception_title")}
              <span className="text-[10px] font-mono text-fuchsia-400 border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 rounded-full">
                AI POLYGRAPH 2.0
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">{t("deception_subtitle")}</p>
          </div>
        </div>

        {/* Projected Seed Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{t("predicted_seed")}</div>
            <div className="text-sm font-black font-mono text-cyan-300">{seed}</div>
          </div>
          <div className="px-3.5 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider bg-gradient-to-r from-fuchsia-500/20 via-purple-500/20 to-cyan-500/20 border border-fuchsia-500/40 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.25)]">
            {seed}
          </div>
        </div>
      </div>

      {/* Main Grid: Integrity Score Radial + Anomaly Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Radial Meter */}
        <div className="md:col-span-4 bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 flex flex-col items-center justify-center text-center" dir="ltr">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="40"
                stroke="#1a1e28"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="40"
                stroke={ringStroke}
                strokeWidth="8"
                strokeDasharray="251.3"
                strokeDashoffset={circleOffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black font-mono text-white">{score}</span>
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest">/ 100</span>
            </div>
          </div>
          <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold border uppercase ${statusColor}`}>
            {statusText}
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-2">
            Deadweight Burden: {deadweightRatio}%
          </span>
        </div>

        {/* 4 Interactive Anomaly Pillars */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Stat-Padders */}
          <div 
            onClick={() => onInspect('statPadders')}
            className="bg-[#0a0c0f] border border-[#1e222b] hover:border-rose-500/50 rounded-xl p-3.5 transition-all cursor-pointer group hover:bg-[#12151e]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-300 group-hover:text-rose-400 transition-colors">
                {t("stat_padders_label")}
              </span>
              <span className={`text-sm font-black font-mono px-2 py-0.5 rounded ${statPaddersCount > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-gray-800 text-gray-400'}`}>
                {statPaddersCount}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">{t("stat_padders_desc")}</p>
            <div className="text-[10px] text-rose-400/80 font-mono mt-2 flex items-center gap-1 group-hover:underline">
              Inspect suspects &rarr;
            </div>
          </div>

          {/* Seed Sandbaggers */}
          <div 
            onClick={() => onInspect('sandbaggers')}
            className="bg-[#0a0c0f] border border-[#1e222b] hover:border-amber-500/50 rounded-xl p-3.5 transition-all cursor-pointer group hover:bg-[#12151e]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-300 group-hover:text-amber-400 transition-colors">
                {t("sandbaggers_label")}
              </span>
              <span className={`text-sm font-black font-mono px-2 py-0.5 rounded ${sandbaggersCount > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gray-800 text-gray-400'}`}>
                {sandbaggersCount}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">{t("sandbaggers_desc")}</p>
            <div className="text-[10px] text-amber-400/80 font-mono mt-2 flex items-center gap-1 group-hover:underline">
              Inspect suspects &rarr;
            </div>
          </div>

          {/* Deadweight Whales */}
          <div 
            onClick={() => onInspect('deadweightWhales')}
            className="bg-[#0a0c0f] border border-[#1e222b] hover:border-orange-500/50 rounded-xl p-3.5 transition-all cursor-pointer group hover:bg-[#12151e]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-300 group-hover:text-orange-400 transition-colors">
                {t("deadweight_label")}
              </span>
              <span className={`text-sm font-black font-mono px-2 py-0.5 rounded ${deadweightWhalesCount > 0 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-gray-800 text-gray-400'}`}>
                {deadweightWhalesCount}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">{t("deadweight_desc")}</p>
            <div className="text-[10px] text-orange-400/80 font-mono mt-2 flex items-center gap-1 group-hover:underline">
              Inspect suspects &rarr;
            </div>
          </div>

          {/* Hyper-Combatants */}
          <div 
            onClick={() => onInspect('hyperCombatants')}
            className="bg-[#0a0c0f] border border-[#1e222b] hover:border-cyan-500/50 rounded-xl p-3.5 transition-all cursor-pointer group hover:bg-[#12151e]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-300 group-hover:text-cyan-400 transition-colors">
                {t("hyper_combatants_label")}
              </span>
              <span className={`text-sm font-black font-mono px-2 py-0.5 rounded ${hyperCombatantsCount > 0 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-gray-800 text-gray-400'}`}>
                {hyperCombatantsCount}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">{t("hyper_combatants_desc")}</p>
            <div className="text-[10px] text-cyan-400/80 font-mono mt-2 flex items-center gap-1 group-hover:underline">
              View frontline heroes &rarr;
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * 4. Suspects Audit Modal
 */
export function SuspectsModal({ isOpen, onClose, category, list, t }) {
  if (!isOpen) return null;

  const titles = {
    statPadders: t("stat_padders_label"),
    sandbaggers: t("sandbaggers_label"),
    deadweightWhales: t("deadweight_label"),
    hyperCombatants: t("hyper_combatants_label")
  };

  const currentTitle = titles[category] || t("suspects_modal_title");
  const items = list || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d1017] border border-[#232834] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1e222b] flex items-center justify-between bg-[#13161f]">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Scale size={20} className="text-fuchsia-400" />
              {currentTitle} ({items.length})
            </h2>
            <p className="text-xs text-gray-400">{t("suspects_modal_desc")}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1f2430] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto p-6 flex-1">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-mono text-sm">
              No governors flagged in this category. Roster integrity is clean.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#1e222b] rounded-lg">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="bg-[#15181e] text-[10px] uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Governor</th>
                    <th className="p-3">Tag</th>
                    <th className="p-3 text-right">Power</th>
                    <th className="p-3 text-right">Power &Delta;</th>
                    <th className="p-3 text-right">KP &Delta;</th>
                    <th className="p-3 text-right">Deads &Delta;</th>
                    <th className="p-3">Flag Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e222b]">
                  {items.map((gov, idx) => (
                    <tr key={gov.id || idx} className="hover:bg-[#141720] transition-colors">
                      <td className="p-3 text-gray-600 font-bold">{idx + 1}</td>
                      <td className="p-3 font-bold text-gray-200">{gov.name}</td>
                      <td className="p-3 text-cyan-400">[{gov.alliance || 'NONE'}]</td>
                      <td className="p-3 text-right text-gray-300">{fmt(gov.powerEnd || gov.power || 0)}</td>
                      <td className={`p-3 text-right font-bold ${gov.powerDelta < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fd(gov.powerDelta || 0)}
                      </td>
                      <td className={`p-3 text-right font-bold ${gov.kpDelta > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                        {gov.kpDelta > 0 ? fd(gov.kpDelta) : '-'}
                      </td>
                      <td className={`p-3 text-right font-bold ${gov.deadsDelta > 0 ? 'text-rose-400' : 'text-gray-600'}`}>
                        {gov.deadsDelta > 0 ? fd(gov.deadsDelta) : '0'}
                      </td>
                      <td className="p-3 text-[11px] text-gray-400">
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                          {gov.reason || 'Flagged by heuristic detector'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1e222b] bg-[#13161f] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white bg-[#1a1f2c] border border-[#2d323e] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * 5. Mail Dispatch Bridge Modal
 */
export function MailDispatchModal({ isOpen, onClose, kd, kdd, ai, t, locale }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  if (!isOpen || !kdd) return null;

  const me = kdd.metrics;
  const anomalies = kdd.anomalies;
  const v = kdd.velocityMetrics;
  const seed = anomalies?.projectedSeed || 'Seed B';

  // Build RoK formatted BBCode string
  const rawBBCode = 
`<color=#00FFFF><b>[UNITY EK POLYGRAPH] KD ${kd}</b></color>
──────────────────────────────
<color=#FFD700>Grade:</color> <b>${ai?.grade || 'N/A'}</b> | <color=#FF4500>Civil War Risk:</color> <b>${ai?.civilWarProbability || 0}%</b>
<color=#00FFFF>Predicted Seed:</color> <b>${seed}</b>
<color=#32CD32>Posture:</color> <b>${ai?.posture || 'Balanced'}</b>
<color=#32CD32>Net Window Growth:</color> +${fmt(me?.totalPowerGained || 0)}${v?.windowPowerVelocity ? ` (+${fmt(v.windowPowerVelocity)}/d)` : ''}
${v?.velocityRatio ? `<color=#00FFFF>Momentum Ratio:</color> ${v.velocityRatio}% (${v.momentumStatus || 'NOMINAL'})\n` : ''}
<color=#FFD700><b>[DECEPTION AUDIT]</b></color>
• Integrity Score: ${anomalies?.integrityScore ?? 100}/100
• Stat-Padders: ${anomalies?.summary?.statPadderCount ?? 0}
• Seed Sandbaggers: ${anomalies?.summary?.sandbaggerCount ?? 0}
• Deadweight Whales: ${anomalies?.summary?.deadweightWhaleCount ?? 0}

<color=#FFD700><b>[J.A.R.V.I.S. VERDICT]</b></color>
${ai?.diagnosis || 'Roster telemetry analyzed.'}

<color=#00FFFF>Generated via UN.TY 2.0</color>`;

  const copyBBCode = () => {
    navigator.clipboard.writeText(rawBBCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const openInMailGenerator = () => {
    try {
      localStorage.setItem('unty_mail_roster', JSON.stringify([{
        customText: rawBBCode
      }]));
    } catch (e) {
      console.error(e);
    }
    router.push(`/${locale}/mail`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d1017] border border-[#232834] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e222b] flex items-center justify-between bg-[#13161f]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">{t("mail_modal_title")}</h2>
              <p className="text-xs text-gray-400">{t("mail_modal_desc")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1f2430] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Live Colored Preview */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Preview (In-Game Color Representation)</div>
          <div className="bg-[#050608] border border-[#1e222b] rounded-xl p-4 font-mono text-xs leading-relaxed space-y-2 text-gray-300">
            <div className="text-cyan-400 font-bold">[UNITY EK POLYGRAPH] KD {kd}</div>
            <div className="text-gray-600">──────────────────────────────</div>
            <div>
              <span className="text-amber-400 font-bold">Grade: </span>
              <span className="font-bold text-white">{ai?.grade || 'N/A'}</span>
              <span className="text-gray-500"> | </span>
              <span className="text-rose-400 font-bold">Civil War Risk: </span>
              <span className="font-bold text-white">{ai?.civilWarProbability || 0}%</span>
            </div>
            <div>
              <span className="text-cyan-400 font-bold">Predicted Seed: </span>
              <span className="font-bold text-white">{seed}</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Posture: </span>
              <span className="font-bold text-white">{ai?.posture || 'Balanced'}</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold">Net Window Growth: </span>
              <span className="font-bold text-white">+{fmt(me?.totalPowerGained || 0)}</span>
              {v?.windowPowerVelocity && <span className="text-gray-400"> (+{fmt(v.windowPowerVelocity)}/d)</span>}
            </div>
            {v?.velocityRatio && (
              <div>
                <span className="text-cyan-400 font-bold">Momentum Ratio: </span>
                <span className="font-bold text-white">{v.velocityRatio}% ({v.momentumStatus || 'NOMINAL'})</span>
              </div>
            )}
            <div className="pt-2 text-amber-400 font-bold">[DECEPTION AUDIT]</div>
            <div className="text-gray-400 pl-2">
              • Integrity Score: {anomalies?.integrityScore ?? 100}/100<br/>
              • Stat-Padders: {anomalies?.summary?.statPadderCount ?? 0}<br/>
              • Seed Sandbaggers: {anomalies?.summary?.sandbaggerCount ?? 0}<br/>
              • Deadweight Whales: {anomalies?.summary?.deadweightWhaleCount ?? 0}
            </div>
            <div className="pt-2 text-amber-400 font-bold">[J.A.R.V.I.S. VERDICT]</div>
            <div className="text-gray-300 pl-2 italic">{ai?.diagnosis || 'Roster telemetry analyzed.'}</div>
            <div className="pt-2 text-cyan-400 text-[10px]">Generated via UN.TY 2.0</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1e222b] bg-[#13161f] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={copyBBCode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-[#1a1f2c] text-white border-[#2d323e] hover:bg-[#252b3d]'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied BBCode!" : t("btn_copy_bbcode")}
          </button>
          
          <button
            onClick={openInMailGenerator}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(192,38,211,0.3)] transition-colors"
          >
            <ExternalLink size={16} />
            {t("btn_open_mail_gen")}
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * 6. KvK Opponent Clash War Room Modal
 */
export function KvKClashModal({ isOpen, onClose, primaryKd, initialOpponentKd, sweepResults, t }) {
  const [kdAId, setKdAId] = useState(primaryKd);
  const [kdBId, setKdBId] = useState(initialOpponentKd);

  if (!isOpen || !sweepResults || sweepResults.length === 0) return null;

  // Resolve Kingdom A and Kingdom B
  const resA = sweepResults.find(r => String(r.kingdom?.kd) === String(kdAId)) || sweepResults[0];
  const resB = sweepResults.find(r => String(r.kingdom?.kd) === String(kdBId)) || sweepResults[1] || sweepResults[0];

  const kddA = resA?.kingdom;
  const aiA = resA?.ai;
  const meA = kddA?.metrics;
  const anomA = kddA?.anomalies;
  const vA = kddA?.velocityMetrics;

  const kddB = resB?.kingdom;
  const aiB = resB?.ai;
  const meB = kddB?.metrics;
  const anomB = kddB?.anomalies;
  const vB = kddB?.velocityMetrics;

  // Tactical Advantage Math
  const paceA = vA?.windowPowerVelocity ?? (meA?.totalPowerGained ?? 0);
  const paceB = vB?.windowPowerVelocity ?? (meB?.totalPowerGained ?? 0);
  const scoreA = anomA?.integrityScore ?? 90;
  const scoreB = anomB?.integrityScore ?? 90;
  const riskA = parseInt(aiA?.civilWarProbability || '0', 10);
  const riskB = parseInt(aiB?.civilWarProbability || '0', 10);

  // Overall combat advantage index
  let pointsA = 0;
  let pointsB = 0;
  if (paceA > paceB) pointsA += 2; else if (paceB > paceA) pointsB += 2;
  if (scoreA > scoreB) pointsA += 1.5; else if (scoreB > scoreA) pointsB += 1.5;
  if (riskA < riskB) pointsA += 1.5; else if (riskB < riskA) pointsB += 1.5;

  const advantageVictor = pointsA > pointsB ? 'A' : pointsB > pointsA ? 'B' : 'TIE';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d1017] border border-[#232834] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e222b] flex items-center justify-between bg-[#13161f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-fuchsia-500/20 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <Swords size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                {t("clash_modal_title")}
              </h2>
              <p className="text-xs text-gray-400">{t("clash_modal_subtitle")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1f2430] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {/* Kingdom Selectors & VS Banner */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            
            {/* KD A Selector */}
            <div className="md:col-span-5 bg-[#12151e] border border-cyan-500/30 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Kingdom A (Home)</span>
                <select
                  value={kdAId}
                  onChange={e => setKdAId(e.target.value)}
                  className="bg-[#0a0c0f] border border-[#1e222b] text-white text-xs font-bold font-mono px-3 py-1 rounded-lg outline-none cursor-pointer"
                >
                  {sweepResults.map(r => (
                    <option key={r.kingdom.kd} value={r.kingdom.kd}>KD {r.kingdom.kd}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black font-mono text-white">KD {kddA?.kd}</div>
                  <div className="text-xs text-gray-400">{kddA?.kingdomName || 'Kingdom Roster'}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black px-2.5 py-1 rounded border border-cyan-500/40 text-cyan-300 bg-cyan-500/10">
                    {anomA?.projectedSeed || 'Seed B'}
                  </span>
                  <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">{aiA?.posture || 'Balanced'}</div>
                </div>
              </div>
            </div>

            {/* VS Badge */}
            <div className="md:col-span-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#1b1f2b] border border-[#2d323e] flex items-center justify-center text-sm font-black text-rose-400 shadow-lg">
                VS
              </div>
            </div>

            {/* KD B Selector */}
            <div className="md:col-span-5 bg-[#12151e] border border-fuchsia-500/30 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider">Kingdom B (Opponent)</span>
                <select
                  value={kdBId}
                  onChange={e => setKdBId(e.target.value)}
                  className="bg-[#0a0c0f] border border-[#1e222b] text-white text-xs font-bold font-mono px-3 py-1 rounded-lg outline-none cursor-pointer"
                >
                  {sweepResults.map(r => (
                    <option key={r.kingdom.kd} value={r.kingdom.kd}>KD {r.kingdom.kd}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black font-mono text-white">KD {kddB?.kd}</div>
                  <div className="text-xs text-gray-400">{kddB?.kingdomName || 'Opponent Roster'}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black px-2.5 py-1 rounded border border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-500/10">
                    {anomB?.projectedSeed || 'Seed B'}
                  </span>
                  <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">{aiB?.posture || 'Balanced'}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Tactical Comparison Matrix */}
          <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl overflow-hidden">
            <div className="p-3 bg-[#13161f] border-b border-[#1e222b] text-[10px] uppercase font-bold text-gray-400 tracking-wider text-center">
              Polygraph Head-to-Head Telemetry
            </div>

            <div className="divide-y divide-[#1e222b] text-xs font-mono" dir="ltr">
              
              {/* Stat 1: Power Growth */}
              <div className="p-3.5 flex items-center justify-between hover:bg-[#11141c] transition-colors">
                <div className={`font-black text-sm ${meA?.totalPowerGained >= (meB?.totalPowerGained || 0) ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {fd(meA?.totalPowerGained || 0)}
                </div>
                <div className="text-gray-400 uppercase font-bold text-[10px]">{t("clash_stat_growth")}</div>
                <div className={`font-black text-sm ${meB?.totalPowerGained >= (meA?.totalPowerGained || 0) ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {fd(meB?.totalPowerGained || 0)}
                </div>
              </div>

              {/* Stat 2: Daily Pace */}
              <div className="p-3.5 flex items-center justify-between hover:bg-[#11141c] transition-colors">
                <div className={`font-black text-sm ${paceA >= paceB ? 'text-cyan-400' : 'text-gray-400'}`}>
                  +{fmt(paceA)}/d
                </div>
                <div className="text-gray-400 uppercase font-bold text-[10px]">{t("clash_stat_daily")}</div>
                <div className={`font-black text-sm ${paceB >= paceA ? 'text-cyan-400' : 'text-gray-400'}`}>
                  +{fmt(paceB)}/d
                </div>
              </div>

              {/* Stat 3: Integrity Score */}
              <div className="p-3.5 flex items-center justify-between hover:bg-[#11141c] transition-colors">
                <div className={`font-black text-sm ${scoreA >= scoreB ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {scoreA}/100
                </div>
                <div className="text-gray-400 uppercase font-bold text-[10px]">{t("clash_stat_integrity")}</div>
                <div className={`font-black text-sm ${scoreB >= scoreA ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {scoreB}/100
                </div>
              </div>

              {/* Stat 4: Civil War Risk (lower is better!) */}
              <div className="p-3.5 flex items-center justify-between hover:bg-[#11141c] transition-colors">
                <div className={`font-black text-sm ${riskA <= riskB ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {riskA}%
                </div>
                <div className="text-gray-400 uppercase font-bold text-[10px]">{t("clash_stat_risk")}</div>
                <div className={`font-black text-sm ${riskB <= riskA ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {riskB}%
                </div>
              </div>

              {/* Stat 5: Whales */}
              <div className="p-3.5 flex items-center justify-between hover:bg-[#11141c] transition-colors">
                <div className="font-black text-sm text-amber-400">
                  {meA?.whalesCount || 0} Whales
                </div>
                <div className="text-gray-400 uppercase font-bold text-[10px]">{t("clash_stat_whales")}</div>
                <div className="font-black text-sm text-amber-400">
                  {meB?.whalesCount || 0} Whales
                </div>
              </div>

            </div>
          </div>

          {/* Tactical Advantage Forecast */}
          <div className="bg-[#12151e] border border-[#232834] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                {t("clash_advantage_forecast")}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                advantageVictor === 'A'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : advantageVictor === 'B'
                    ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {advantageVictor === 'A' 
                  ? t("clash_advantage_a", { kd: kddA?.kd })
                  : advantageVictor === 'B' 
                    ? t("clash_advantage_b", { kd: kddB?.kd })
                    : t("clash_advantage_tie")
                }
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {advantageVictor === 'A' 
                ? `KD ${kddA?.kd} enters this matchup with superior war readiness. With an integrity score of ${scoreA}/100 and daily pace of +${fmt(paceA)}/day, their combat roster exhibits cleaner fighting efficiency compared to KD ${kddB?.kd}.`
                : advantageVictor === 'B'
                  ? `KD ${kddB?.kd} displays stronger tactical mobilization (+${fmt(paceB)}/day) and lower structural friction. Officers facing KD ${kddB?.kd} should prepare for sustained pass-defense endurance.`
                  : `Both kingdoms display nearly identical strategic metrics. Victory will depend on field commander coordination and altar rally execution rather than roster discrepancies.`
              }
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1e222b] bg-[#13161f] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-300 hover:text-white bg-[#1a1f2c] border border-[#2d323e] rounded-lg transition-colors"
          >
            Close War Room
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * 7. Spenders Accordion List with J.A.R.V.I.S. Spending Diagnostics
 */
export function SpendersAccordionList({ whales = [], serverAgeDays, era, windowDays = 1, t }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");

  const filteredWhales = whales.filter(w => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (w.name || "").toLowerCase().includes(q) || (w.alliance || "").toLowerCase().includes(q);
  });

  const mb = (d) => {
    const m = Math.floor(d / 1e6);
    return m >= 3
      ? "bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.4)]"
      : m >= 2
      ? "bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(192,38,211,0.3)]"
      : m >= 1
      ? "bg-amber-500 text-black font-black"
      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  };

  const mbt = (d) => {
    const m = Math.floor(d / 1e6);
    return m >= 1 ? `${m}M+` : "500k+";
  };

  const getProfile = (w) => {
    const pDelta = w.powerDelta || 0;
    const days = Math.max(1, windowDays || 1);
    const hourlyPace = Math.round(pDelta / (days * 24));

    const troopD = Math.max(0, w.troopDelta || 0);
    const techD = Math.max(0, w.techDelta || 0);
    const buildD = Math.max(0, w.buildDelta || 0);
    const cmdD = Math.max(0, w.cmdDelta || 0);
    const kpD = Math.max(0, w.kpDelta || 0);
    const deadD = Math.max(0, w.deadsDelta || 0);

    const sumD = troopD + techD + buildD + cmdD;
    const baseDenom = sumD > 0 ? sumD : Math.max(1, pDelta);
    const troopPct = Math.round((troopD / baseDenom) * 100);
    const techPct = Math.round((techD / baseDenom) * 100);
    const buildPct = Math.round((buildD / baseDenom) * 100);
    const cmdPct = Math.round((cmdD / baseDenom) * 100);

    let archetypeKey = "archetype_multi";
    let badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";

    if (w.isMigrant) {
      archetypeKey = "archetype_jumper";
      badgeColor = "text-blue-400 bg-blue-500/10 border-blue-500/30";
    } else if (pDelta >= 3000000) {
      archetypeKey = "archetype_megalodon";
      badgeColor = "text-fuchsia-400 bg-fuchsia-500/20 border-fuchsia-500/40 shadow-[0_0_12px_rgba(217,70,239,0.25)]";
    } else if (troopPct >= 45) {
      archetypeKey = "archetype_troop_rusher";
      badgeColor = "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
    } else if (techPct >= 40) {
      archetypeKey = "archetype_tech_rusher";
      badgeColor = "text-violet-400 bg-violet-500/10 border-violet-500/30";
    } else if (buildPct >= 40) {
      archetypeKey = "archetype_ch_rusher";
      badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    }

    let rationale = "";
    const ageText = (serverAgeDays !== null && serverAgeDays !== undefined) ? `on Day ${serverAgeDays} of the kingdom` : "in this scan interval";

    if (w.isMigrant) {
      rationale = `Migrated into the kingdom during this window with ${fmt(w.powerEnd || pDelta)} power. Injects immediate external combat readiness and high-tier march capacity into [${w.alliance || "No Tag"}].`;
    } else if (serverAgeDays !== null && serverAgeDays <= 7) {
      rationale = `Gaining +${fmt(pDelta)} power in ${days * 24} hours (+${fmt(hourlyPace)}/hr) ${ageText} is mathematically impossible on baseline AP and free quest rewards. Generating this velocity requires extensive gem acceleration, VIP rank pushes, and premium bundles.`;
    } else if (troopPct >= 45) {
      rationale = `Surged +${fmt(troopD)} in troop power alone (${troopPct}% of delta), advancing at +${fmt(hourlyPace)} power/hr. Training this many battalions in ${days * 24}h requires dumping heavy reserves of training speedups and continuous gem-boosted queues.`;
    } else if (techPct >= 40) {
      rationale = `Invested +${fmt(techD)} power into Military & Economic Technology (${techPct}% of delta). High-tier research carries multi-week timers; instant completion confirms significant universal speedup and resource reserves.`;
    } else if (buildPct >= 40) {
      rationale = `Fast-tracked City Hall & prerequisite defensive structures for +${fmt(buildD)} building power (${buildPct}% of delta). Bypassed standard real-time construction bottlenecks using targeted construction speedups.`;
    } else {
      rationale = `Sustained aggressive multi-vector acceleration (+${fmt(hourlyPace)} power/hr pace) distributed across troops (+${fmt(troopD)}), tech (+${fmt(techD)}), and buildings (+${fmt(buildD)}). Growth velocity exceeds standard peacetime pace by more than 5x.`;
    }

    return {
      hourlyPace,
      troopD, techD, buildD, cmdD, kpD, deadD,
      troopPct, techPct, buildPct, cmdPct,
      archetypeKey, badgeColor,
      rationale
    };
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1017] border border-[#1e222b] rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_spenders_placeholder")}
            className="w-full bg-[#12151e] border border-[#232834] rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="text-[11px] font-mono text-gray-400">
          {t("showing_spenders_count", { filtered: filteredWhales.length, total: whales.length })}
        </div>
      </div>

      {whales.length === 0 ? (
        <div className="text-gray-600 text-sm italic text-center py-8">{t("no_spenders")}</div>
      ) : filteredWhales.length === 0 ? (
        <div className="text-gray-600 text-xs italic text-center py-8">No spenders match &quot;{search}&quot;</div>
      ) : (
        <div className="space-y-2">
          {filteredWhales.map((w, i) => {
            const isExpanded = expandedId === (w.id || i);
            const prof = getProfile(w);

            return (
              <div
                key={w.id || i}
                className="bg-[#0a0c0f] border border-[#1e222b] hover:border-[#2d323e] rounded-xl overflow-hidden transition-all duration-200 shadow-md"
              >
                {/* Clickable Header Row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : (w.id || i))}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#11141c] transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-gray-500 font-mono text-xs w-6 text-right font-bold">{i + 1}</span>
                    <span className="text-cyan-400 font-mono text-xs font-bold shrink-0">[{w.alliance}]</span>
                    <span className="text-gray-200 text-sm font-bold truncate">{w.name}</span>
                    {w.isMigrant && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                        NEW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${mb(w.powerDelta)}`}>
                      {mbt(w.powerDelta)}
                    </span>
                    <span className="text-emerald-400 font-mono font-bold text-xs sm:text-sm">
                      +{fmt(w.powerDelta)}
                    </span>
                    <div className={`text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </button>

                {/* Expanded Dropdown Drawer: Why AI Thinks It's a Spender */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#1e222b] bg-[#0d1017] space-y-4">
                    {/* Top Diagnosis Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${prof.badgeColor}`}>
                          {t(prof.archetypeKey)}
                        </span>
                        <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                          <Zap size={11} className="text-amber-400" />
                          {t("spender_pace_hourly", { pace: fmt(prof.hourlyPace) })}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-gray-400">
                        Total Power: <span className="font-bold text-white">{fmt(w.powerEnd || w.powerDelta)}</span>
                      </div>
                    </div>

                    {/* AI Assessment Callout Box */}
                    <div className="bg-[#121520] border border-amber-500/20 rounded-xl p-4 space-y-1.5 shadow-inner">
                      <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-400" />
                        {t("spender_ai_assessment")}
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-sans">
                        {prof.rationale}
                      </p>
                    </div>

                    {/* 4-Pillar Growth Matrix */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                        <Activity size={12} className="text-cyan-400" />
                        {t("spender_growth_vectors")}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Troop Growth */}
                        <div className="bg-[#090b10] border border-[#1e222b] rounded-lg p-2.5">
                          <div className="text-[10px] text-gray-500 font-mono flex items-center justify-between mb-1">
                            <span>{t("col_troops_delta")}</span>
                            <span className="text-cyan-400 font-bold">{prof.troopPct}%</span>
                          </div>
                          <div className="text-sm font-bold font-mono text-cyan-300">
                            {prof.troopD > 0 ? `+${fmt(prof.troopD)}` : "-"}
                          </div>
                        </div>

                        {/* Tech Growth */}
                        <div className="bg-[#090b10] border border-[#1e222b] rounded-lg p-2.5">
                          <div className="text-[10px] text-gray-500 font-mono flex items-center justify-between mb-1">
                            <span>{t("col_tech_delta")}</span>
                            <span className="text-violet-400 font-bold">{prof.techPct}%</span>
                          </div>
                          <div className="text-sm font-bold font-mono text-violet-300">
                            {prof.techD > 0 ? `+${fmt(prof.techD)}` : "-"}
                          </div>
                        </div>

                        {/* Building Growth */}
                        <div className="bg-[#090b10] border border-[#1e222b] rounded-lg p-2.5">
                          <div className="text-[10px] text-gray-500 font-mono flex items-center justify-between mb-1">
                            <span>{t("col_build_delta")}</span>
                            <span className="text-emerald-400 font-bold">{prof.buildPct}%</span>
                          </div>
                          <div className="text-sm font-bold font-mono text-emerald-300">
                            {prof.buildD > 0 ? `+${fmt(prof.buildD)}` : "-"}
                          </div>
                        </div>

                        {/* Commander Growth */}
                        <div className="bg-[#090b10] border border-[#1e222b] rounded-lg p-2.5">
                          <div className="text-[10px] text-gray-500 font-mono flex items-center justify-between mb-1">
                            <span>{t("col_cmd_delta")}</span>
                            <span className="text-amber-400 font-bold">{prof.cmdPct}%</span>
                          </div>
                          <div className="text-sm font-bold font-mono text-amber-300">
                            {prof.cmdD > 0 ? `+${fmt(prof.cmdD)}` : "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Combat & Field Footprint */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1b202c] text-xs font-mono">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Swords size={12} className="text-orange-400" />
                          <span className="text-gray-400">KP:</span>
                          <span className={`font-bold ${prof.kpD > 0 ? "text-orange-400" : "text-gray-500"}`}>
                            {prof.kpD > 0 ? `+${fmt(prof.kpD)}` : "0"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-rose-400 font-bold">☠</span>
                          <span className="text-gray-400">Deads:</span>
                          <span className={`font-bold ${prof.deadD > 0 ? "text-rose-400" : "text-gray-500"}`}>
                            {prof.deadD > 0 ? `+${fmt(prof.deadD)}` : "0"}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        prof.kpD > 5000 
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/30" 
                          : "bg-[#141722] text-gray-400 border-[#232837]"
                      }`}>
                        {prof.kpD > 5000 ? t("posture_frontline") : t("posture_peacetime")}
                      </span>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

