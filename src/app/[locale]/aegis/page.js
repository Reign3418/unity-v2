'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Shield,
  Activity,
  Ghost,
  Bot,
  Clock,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FlaskConical,
  Eye,
} from 'lucide-react';
import { useValheonCommand } from '@/components/command/ValheonCommandProvider';
import {
  evaluateKingdomTrustMatrix,
  formatCompactNumber,
} from '@/lib/valheonTrustEngine';

export default function ValheonAegisPage() {
  const t = useTranslations('Valheon');
  const { governorPool, inspectGovernor, activeKd } = useValheonCommand();

  const [filterMode, setFilterMode] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const trustMatrix = useMemo(
    () => evaluateKingdomTrustMatrix(governorPool),
    [governorPool]
  );

  const filteredGovernors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trustMatrix.governors.filter((g) => {
      if (
        q &&
        !String(g.name).toLowerCase().includes(q) &&
        !String(g.id).toLowerCase().includes(q) &&
        !String(g.alliance).toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterMode === 'PILLAR') return g.trustIndex >= 80;
      if (filterMode === 'RISK') return g.trustIndex >= 35 && g.trustIndex < 62;
      if (filterMode === 'THREAT') return g.trustIndex < 35;
      return true;
    });
  }, [trustMatrix.governors, searchQuery, filterMode]);

  const subModules = [
    {
      title: 'EK Polygraph 3.0',
      desc: 'Multi-kingdom stability index, whale surge detection & AI civil war risk grading.',
      href: '/tools/polygraph',
      icon: Activity,
      badge: 'AI DIAGNOSTIC',
    },
    {
      title: 'Ghost & Alt Hunter',
      desc: 'Identifies dormant matchmaking weight and correlated alt-account login curves.',
      href: '/tools/ghost-hunter',
      icon: Ghost,
      badge: 'VITALITY RADAR',
    },
    {
      title: 'Reseller & Bot Radar',
      desc: 'Unmasks commercial RSS selling syndicates and automated gathering bot hives.',
      href: '/tools/reseller-hunter',
      icon: Bot,
      badge: 'SYNDICATE SCAN',
    },
    {
      title: 'Account Age & Epoch Audit',
      desc: 'Chronological Governor ID interpolation exposing bought accounts and migrant anomalies.',
      href: '/tools/account-age',
      icon: Clock,
      badge: 'EPOCH ENGINE',
    },
    {
      title: 'Anomaly & Spend Lab',
      desc: 'Multivariate Z-score outlier detection for T1 duelers and spending signatures.',
      href: '/creator/lab/anomaly-detector',
      icon: FlaskConical,
      badge: '$0.00 MATH',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Suite Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b0e17] via-[#0d1424] to-[#0b0e17] border border-cyan-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-black tracking-widest">
              SUITE 01 // COUNTER-INTEL
            </span>
            <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px] font-mono">
              TARGET KD: [{activeKd}]
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide mt-2 flex items-center gap-2.5">
            <Shield className="text-cyan-400" size={28} />
            <span>{t('suite_aegis_title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {t('aegis_page_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => inspectGovernor(trustMatrix.governors[0])}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
        >
          <Sparkles size={15} />
          <span>{t('forensics_btn_audit')}</span>
        </button>
      </div>

      {/* 4 Telemetry Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0b0e17] border border-[#1e2638]">
          <div className="text-[11px] font-mono uppercase text-slate-400">
            {t('aegis_kpi_trust')}
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
            {trustMatrix.summary.avgTrust} / 100
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {trustMatrix.summary.totalGovernors} Governors Audited
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0b0e17] border border-emerald-500/30">
          <div className="text-[11px] font-mono uppercase text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            <span>{t('aegis_kpi_pillars')}</span>
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {trustMatrix.summary.corePillars}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Trust Index ≥ 80 (Frontline Cleared)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0b0e17] border border-amber-500/30">
          <div className="text-[11px] font-mono uppercase text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={13} />
            <span>{t('aegis_kpi_risks')}</span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-300 mt-1">
            {trustMatrix.summary.deadweightRisks}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Deadweight / Suspected Alt Match
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0b0e17] border border-rose-500/30">
          <div className="text-[11px] font-mono uppercase text-rose-400 flex items-center gap-1.5">
            <Bot size={13} />
            <span>{t('aegis_kpi_threats')}</span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-400 mt-1">
            {trustMatrix.summary.criticalThreats}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Reseller / Farm Bot Signatures
          </div>
        </div>
      </div>

      {/* Unified 5-Model Governor Trust Table */}
      <div className="rounded-2xl bg-[#0b0e17] border border-[#1e2638] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: t('aegis_filter_all') },
              { id: 'PILLAR', label: t('aegis_kpi_pillars') },
              { id: 'RISK', label: t('aegis_kpi_risks') },
              { id: 'THREAT', label: t('aegis_kpi_threats') },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-cyan-500 text-black'
                    : 'bg-[#06080d] text-slate-400 hover:text-white border border-[#1e2638]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-[#06080d] border border-[#1e2638] rounded-lg px-3 py-1.5 w-full sm:w-64">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('forensics_search_placeholder')}
              className="w-full bg-transparent text-xs font-mono text-white placeholder:text-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2638] bg-[#06080d] text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Governor</th>
                <th className="py-3 px-4">Power / KP</th>
                <th className="py-3 px-4">EK Polygraph</th>
                <th className="py-3 px-4">Ghost / Alt</th>
                <th className="py-3 px-4">Reseller / Bot</th>
                <th className="py-3 px-4">Account Age</th>
                <th className="py-3 px-4 text-right">Valheon Trust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638]/60 text-xs font-mono">
              {filteredGovernors.map((g) => {
                const badgeClass =
                  g.trustColor === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : g.trustColor === 'amber'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : g.trustColor === 'rose'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';

                return (
                  <tr
                    key={g.id}
                    onClick={() => inspectGovernor(g)}
                    className="hover:bg-cyan-500/5 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                        <span>
                          [{g.alliance}] {g.name}
                        </span>
                        <Eye
                          size={12}
                          className="opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity"
                        />
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ID: {g.id}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-semibold">
                        {formatCompactNumber(g.power)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatCompactNumber(g.killPoints)} KP •{' '}
                        {formatCompactNumber(g.deads)} Dead
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          g.sensors.polygraph.tone === 'emerald'
                            ? 'text-emerald-400'
                            : g.sensors.polygraph.tone === 'amber'
                            ? 'text-amber-400'
                            : g.sensors.polygraph.tone === 'rose'
                            ? 'text-rose-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {g.sensors.polygraph.label}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        {g.kpToPower}x KP/Pwr
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          g.sensors.ghost.tone === 'emerald'
                            ? 'text-emerald-400'
                            : g.sensors.ghost.tone === 'amber'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {g.sensors.ghost.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${
                          g.sensors.reseller.tone === 'emerald'
                            ? 'text-emerald-400'
                            : g.sensors.reseller.tone === 'amber'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {g.sensors.reseller.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>~{g.ageDays.toLocaleString()}d</div>
                      <div className="text-[10px] text-slate-500">
                        {g.ageEpoch}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-black ${badgeClass}`}
                      >
                        <span>{g.trustIndex}</span>
                        <span className="text-[9px]">/100</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Specialized Forensics Sub-Module Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {subModules.map((m, i) => {
          const Icon = m.icon;
          return (
            <Link
              key={i}
              href={m.href}
              className="p-4 rounded-xl bg-[#0b0e17] border border-[#1e2638] hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Icon size={18} className="text-cyan-400" />
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {m.badge}
                  </span>
                </div>
                <div className="text-sm font-black text-white mt-2.5 group-hover:text-cyan-300 transition-colors">
                  {m.title}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  {m.desc}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#1e2638] flex items-center justify-between text-[11px] font-mono text-cyan-400">
                <span>Launch Module</span>
                <ArrowRight
                  size={13}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
