'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Shield,
  X,
  Activity,
  Ghost,
  Bot,
  Medal,
  Clock,
  Copy,
  Check,
  Search,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { useValheonCommand } from './ValheonCommandProvider';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import { formatCompactNumber } from '@/lib/valheonTrustEngine';

export default function ForensicsDrawer() {
  const t = useTranslations('Valheon');
  const { effectiveIsValheonFounder } = useRolePreview();
  const {
    isForensicsOpen,
    setIsForensicsOpen,
    selectedGovernor,
    governorPool,
    inspectGovernor,
  } = useValheonCommand();

  const [quickId, setQuickId] = useState('');
  const [copied, setCopied] = useState(false);

  if (!effectiveIsValheonFounder || !isForensicsOpen || !selectedGovernor) return null;

  const g = selectedGovernor;

  const toneClasses = (tone) => {
    if (tone === 'emerald') return 'text-emerald-400';
    if (tone === 'amber') return 'text-amber-400';
    if (tone === 'rose') return 'text-rose-400';
    return 'text-cyan-400';
  };

  const barClasses = (tone) => {
    if (tone === 'emerald') return 'bg-emerald-400';
    if (tone === 'amber') return 'bg-amber-400';
    if (tone === 'rose') return 'bg-rose-500';
    return 'bg-cyan-400';
  };

  const handleCopyDossier = () => {
    const summary = [
      `=== VALHEON AEGIS // 5-MODEL FORENSICS DOSSIER ===`,
      `Governor: [${g.alliance}] ${g.name} (ID: ${g.id})`,
      `Valheon Trust Index: ${g.trustIndex} / 100 (${g.trustTier})`,
      `Power: ${formatCompactNumber(g.power)} | KP: ${formatCompactNumber(g.killPoints)} | Deads: ${formatCompactNumber(g.deads)}`,
      `Est. Account Age: ~${g.ageDays.toLocaleString()} Days (${g.ageEpoch})`,
      `• EK Polygraph: ${g.sensors.polygraph.label} (${g.sensors.polygraph.sub})`,
      `• Ghost/Alt Sensor: ${g.sensors.ghost.label} (${g.sensors.ghost.sub})`,
      `• Reseller/Bot Radar: ${g.sensors.reseller.label} (${g.sensors.reseller.sub})`,
      `• KvK DKP Projection: ${g.sensors.dkp.label} (${g.sensors.dkp.sub})`,
      `${g.verdict}`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsForensicsOpen(false)}
    >
      <aside
        className="w-full max-w-xl h-full bg-[#06080d] border-l border-cyan-500/30 shadow-[-20px_0_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drawer Bar */}
        <div className="px-5 py-4 bg-[#0b0e17] border-b border-[#1e2638] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Shield size={17} />
            </div>
            <div>
              <div className="text-[11px] font-mono font-black tracking-widest text-cyan-400 uppercase">
                {t('forensics_tag')}
              </div>
              <div className="text-xs text-slate-400">
                {t('forensics_subtitle')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsForensicsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Instant Governor Selector & Quick Search */}
        <div className="px-5 py-3 bg-[#090c14] border-b border-[#1e2638] space-y-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (quickId.trim()) {
                inspectGovernor(quickId.trim());
                setQuickId('');
              }
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 bg-[#06080d] border border-[#1e2638] focus-within:border-cyan-500/50 rounded-lg px-3 py-1.5">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                value={quickId}
                onChange={(e) => setQuickId(e.target.value)}
                placeholder={t('forensics_search_placeholder')}
                className="w-full bg-transparent text-xs font-mono text-white placeholder:text-slate-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono transition-colors"
            >
              {t('forensics_btn_audit')}
            </button>
          </form>

          {/* Quick-Switch Governor Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {governorPool.slice(0, 5).map((cand) => {
              const isCurrent = String(cand.id) === String(g.id);
              const badgeColor =
                cand.trustColor === 'emerald'
                  ? 'text-emerald-400'
                  : cand.trustColor === 'amber'
                  ? 'text-amber-400'
                  : 'text-rose-400';
              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => inspectGovernor(cand)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono shrink-0 flex items-center gap-1.5 transition-all ${
                    isCurrent
                      ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold'
                      : 'bg-[#06080d] border-[#1e2638] text-slate-400 hover:text-white'
                  }`}
                >
                  <span>[{cand.alliance}] {cand.name}</span>
                  <span className={`font-black ${badgeColor}`}>
                    {cand.trustIndex}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Scrollable Dossier Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-[#1e2638]">
          {/* Hero Governor Trust Card */}
          <div className="p-4 rounded-2xl bg-[#0b0e17] border border-cyan-500/30 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-[#1e2638] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
                    ID: {g.id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                    {formatCompactNumber(g.power)} POWER
                  </span>
                </div>
                <h2 className="text-xl font-black text-white mt-1.5">
                  [{g.alliance}] {g.name}
                </h2>
                <div className="text-xs font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <Clock size={12} className="text-amber-400" />
                  <span>
                    {t('forensics_est_age')}: ~{g.ageDays.toLocaleString()}d ({g.ageEpoch})
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div
                  className={`text-3xl font-black font-mono ${toneClasses(
                    g.trustColor
                  )}`}
                >
                  {g.trustIndex} / 100
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {t('forensics_trust_index')}
                </div>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-black border ${
                    g.trustColor === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : g.trustColor === 'amber'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : g.trustColor === 'rose'
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  {g.trustTier}
                </span>
              </div>
            </div>

            {/* 4 Primary Sensor Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3.5">
              <div className="p-3 rounded-xl bg-[#06080d] border border-[#1e2638]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Activity size={13} className="text-cyan-400" />
                    {t('sensor_polygraph')}
                  </span>
                  <span
                    className={`font-bold ${toneClasses(
                      g.sensors.polygraph.tone
                    )}`}
                  >
                    {g.sensors.polygraph.label}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1.5 font-mono">
                  {g.sensors.polygraph.sub}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#06080d] border border-[#1e2638]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Ghost size={13} className="text-amber-400" />
                    {t('sensor_ghost')}
                  </span>
                  <span
                    className={`font-bold ${toneClasses(g.sensors.ghost.tone)}`}
                  >
                    {g.sensors.ghost.label}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1.5 font-mono">
                  {g.sensors.ghost.sub}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#06080d] border border-[#1e2638]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Bot size={13} className="text-rose-400" />
                    {t('sensor_reseller')}
                  </span>
                  <span
                    className={`font-bold ${toneClasses(
                      g.sensors.reseller.tone
                    )}`}
                  >
                    {g.sensors.reseller.label}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1.5 font-mono">
                  {g.sensors.reseller.sub}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#06080d] border border-[#1e2638]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Medal size={13} className="text-emerald-400" />
                    {t('sensor_dkp')}
                  </span>
                  <span
                    className={`font-bold ${toneClasses(g.sensors.dkp.tone)}`}
                  >
                    {g.sensors.dkp.label}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-1.5 font-mono">
                  {g.sensors.dkp.sub}
                </div>
              </div>
            </div>

            {/* Verdict Line */}
            <div className="pt-3 border-t border-[#1e2638] flex items-center justify-between gap-2">
              <span
                className={`text-xs font-mono font-bold ${toneClasses(
                  g.trustColor
                )}`}
              >
                {g.verdict}
              </span>
            </div>
          </div>

          {/* 5-Axis Behavioral Fingerprint Breakdown */}
          <div className="p-4 rounded-2xl bg-[#0b0e17] border border-[#1e2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                {t('forensics_5model_breakdown')}
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                $0.00 Client Telemetry
              </span>
            </div>

            {[
              {
                label: '01. EK Polygraph Combat Ratio',
                val: g.sensors.polygraph.score,
                tone: g.sensors.polygraph.tone,
              },
              {
                label: '02. Main Account Independence (Anti-Ghost)',
                val: g.sensors.ghost.score,
                tone: g.sensors.ghost.tone,
              },
              {
                label: '03. Organic Resource Integrity (Anti-Bot)',
                val: g.sensors.reseller.score,
                tone: g.sensors.reseller.tone,
              },
              {
                label: '04. KvK DKP Goal Readiness',
                val: g.sensors.dkp.score,
                tone: g.sensors.dkp.tone,
              },
              {
                label: '05. Chronological Epoch Maturity',
                val: g.radarVector[4] || 85,
                tone: 'cyan',
              },
            ].map((axis, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">{axis.label}</span>
                  <span className={`font-bold ${toneClasses(axis.tone)}`}>
                    {axis.val}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#06080d] overflow-hidden border border-[#1e2638]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barClasses(
                      axis.tone
                    )}`}
                    style={{ width: `${Math.max(4, Math.min(100, axis.val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 bg-[#0b0e17] border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopyDossier}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all cursor-pointer"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>
              {copied ? t('forensics_copied') : t('forensics_export_btn')}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              href="/vanguard"
              onClick={() => setIsForensicsOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold transition-all"
            >
              <Mail size={13} />
              <span>Vanguard CRM</span>
            </Link>
            <Link
              href="/aegis"
              onClick={() => setIsForensicsOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-[#1e2638] text-slate-200 hover:border-cyan-500/40 text-xs font-bold transition-all"
            >
              <span>{t('suite_aegis_title')}</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
