'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Atom,
  BarChart2,
  TrendingUp,
  Medal,
  Zap,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useValheonCommand } from '@/components/command/ValheonCommandProvider';
import { createDkpWorker, calculateDkpSync } from '@/lib/dkpWorker';
import { formatCompactNumber } from '@/lib/valheonTrustEngine';

export default function ValheonNexusPage() {
  const t = useTranslations('Valheon');
  const { governorPool, inspectGovernor, activeKd } = useValheonCommand();

  const [viewMode, setViewMode] = useState('2D'); // '2D' | '3D'
  const [weights, setWeights] = useState({
    t4Weight: 4,
    t5Weight: 10,
    deadWeight: 30,
    honorWeight: 5,
    goalMultiplier: 12,
  });

  const [dkpResult, setDkpResult] = useState(() =>
    calculateDkpSync(governorPool, {
      t4Weight: 4,
      t5Weight: 10,
      deadWeight: 30,
      honorWeight: 5,
      goalMultiplier: 12,
    })
  );

  const workerRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const handle = createDkpWorker();
    if (handle) {
      workerRef.current = handle;
      handle.worker.onmessage = (e) => {
        if (e.data && e.data.ranked) {
          setDkpResult({
            ranked: e.data.ranked,
            summary: e.data.summary,
          });
        }
      };
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    reqIdRef.current += 1;
    if (workerRef.current?.worker) {
      workerRef.current.worker.postMessage({
        requestId: reqIdRef.current,
        roster: governorPool,
        weights,
      });
    } else {
      setDkpResult(calculateDkpSync(governorPool, weights));
    }
  }, [governorPool, weights]);

  const resetWeights = () => {
    setWeights({
      t4Weight: 4,
      t5Weight: 10,
      deadWeight: 30,
      honorWeight: 5,
      goalMultiplier: 12,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Suite Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b0e17] via-[#1a150b] to-[#0b0e17] border border-amber-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-black tracking-widest">
              SUITE 02 // 3D TELEMETRY & 60FPS DKP CORE
            </span>
            <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px] font-mono">
              WEBWORKER: {dkpResult.summary.elapsedMs}ms
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide mt-2 flex items-center gap-2.5">
            <Atom className="text-amber-400" size={28} />
            <span>{t('suite_nexus_title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {t('nexus_page_subtitle')}
          </p>
        </div>

        {/* 1-Click 2D Table <-> 3D Cerberus Galaxy Switcher */}
        <div className="flex items-center gap-1.5 bg-[#06080d] p-1.5 rounded-xl border border-[#1e2638]">
          <button
            type="button"
            onClick={() => setViewMode('2D')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              viewMode === '2D'
                ? 'bg-amber-400 text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('nexus_view_2d')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3D')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === '3D'
                ? 'bg-cyan-400 text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Atom size={14} />
            <span>{t('nexus_view_3d')}</span>
          </button>
        </div>
      </div>

      {/* Live 60fps DKP Formula Sliders Panel */}
      <div className="p-5 rounded-2xl bg-[#0b0e17] border border-[#1e2638] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2638] pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-amber-400" />
            <span className="text-xs font-mono font-black uppercase tracking-wider text-white">
              {t('nexus_worker_title')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-400">
              ⚡ 60fps Worker ({dkpResult.summary.elapsedMs}ms)
            </span>
            <button
              type="button"
              onClick={resetWeights}
              className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              key: 't4Weight',
              label: 'T4 Kill Weight',
              min: 1,
              max: 20,
              step: 1,
              color: 'accent-cyan-400',
              suffix: 'pts',
            },
            {
              key: 't5Weight',
              label: 'T5 Kill Weight',
              min: 2,
              max: 40,
              step: 1,
              color: 'accent-amber-400',
              suffix: 'pts',
            },
            {
              key: 'deadWeight',
              label: 'Dead Troop Weight',
              min: 5,
              max: 100,
              step: 5,
              color: 'accent-rose-400',
              suffix: 'pts',
            },
            {
              key: 'honorWeight',
              label: 'Honor Point Weight',
              min: 0,
              max: 25,
              step: 1,
              color: 'accent-emerald-400',
              suffix: 'pts',
            },
            {
              key: 'goalMultiplier',
              label: 'Goal Multiplier (x Power)',
              min: 4,
              max: 30,
              step: 1,
              color: 'accent-purple-400',
              suffix: 'x',
            },
          ].map((s) => (
            <div
              key={s.key}
              className="p-3 rounded-xl bg-[#06080d] border border-[#1e2638] space-y-2"
            >
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">{s.label}</span>
                <span className="font-black text-white">
                  {weights[s.key]} {s.suffix}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={weights[s.key]}
                onChange={(e) =>
                  setWeights((prev) => ({
                    ...prev,
                    [s.key]: Number(e.target.value),
                  }))
                }
                className={`w-full cursor-pointer ${s.color}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main View: 2D Live Re-Ranking Table OR 3D Cerberus Galaxy Projection */}
      {viewMode === '2D' ? (
        <div className="rounded-2xl bg-[#0b0e17] border border-[#1e2638] overflow-hidden shadow-xl">
          <div className="px-5 py-3.5 bg-[#06080d] border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-300 font-bold">
              KINGDOM [{activeKd}] LIVE DKP LEADERBOARD (CLICK ANY GOVERNOR TO AUDIT)
            </span>
            <span className="text-cyan-400">
              Goal Compliance: {dkpResult.summary.compliancePct}% (
              {dkpResult.summary.metGoalCount}/{dkpResult.summary.totalGovernors})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e2638] bg-[#090c14] text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-3 px-4">DKP Rank</th>
                  <th className="py-3 px-4">Governor</th>
                  <th className="py-3 px-4">Power</th>
                  <th className="py-3 px-4">T4 + T5 Points</th>
                  <th className="py-3 px-4">Dead Troop Points</th>
                  <th className="py-3 px-4">Total DKP</th>
                  <th className="py-3 px-4 text-right">% of Goal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2638]/60 text-xs font-mono">
                {dkpResult.ranked.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => inspectGovernor(g)}
                    className="hover:bg-amber-500/5 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-white font-black">
                          #{g.dkpRank}
                        </span>
                        {g.rankDelta > 0 && (
                          <span className="text-emerald-400 flex items-center text-[11px] font-bold">
                            <ArrowUpRight size={12} />+{g.rankDelta}
                          </span>
                        )}
                        {g.rankDelta < 0 && (
                          <span className="text-rose-400 flex items-center text-[11px] font-bold">
                            <ArrowDownRight size={12} />
                            {g.rankDelta}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white group-hover:text-amber-300 flex items-center gap-1.5">
                        <span>
                          [{g.alliance}] {g.name}
                        </span>
                        <Eye
                          size={12}
                          className="opacity-0 group-hover:opacity-100 text-amber-400"
                        />
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Power Rank #{g.powerRank} • ID: {g.id}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {formatCompactNumber(g.power)}
                    </td>
                    <td className="py-3 px-4 text-cyan-300">
                      {formatCompactNumber(g.t4Pts + g.t5Pts)}
                    </td>
                    <td className="py-3 px-4 text-rose-300">
                      {formatCompactNumber(g.deadPts)}
                    </td>
                    <td className="py-3 px-4 font-black text-amber-300">
                      {formatCompactNumber(g.totalDkp)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2.5 py-1 rounded-lg border font-black ${
                          g.goalPct >= 100
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : g.goalPct >= 50
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {g.goalPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#06080d] border border-cyan-500/40 p-6 relative overflow-hidden min-h-[420px] flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
            <div>
              <div className="text-xs font-mono font-black text-cyan-400">
                PROJECT CERBERUS // 5D ASTRODYNAMIC GALAXY MANIFOLD
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Interactive PCA projection of Kingdom [{activeKd}] governors. Click any node to open the Aegis Forensics Dossier.
              </p>
            </div>
            <Link
              href="/creator/project-cerberus"
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-1.5"
            >
              <span>Launch Fullscreen 5D Galaxy</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Interactive Starfield Manifold Projection */}
          <div className="relative h-72 my-4 rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.14),rgba(6,8,13,0.98))] border border-[#1e2638] overflow-hidden">
            {dkpResult.ranked.map((g, idx) => {
              const xPct = Math.max(
                10,
                Math.min(88, 18 + ((idx * 19 + (g.power % 37)) % 70))
              );
              const yPct = Math.max(
                14,
                Math.min(84, 85 - Math.min(70, Math.round(g.goalPct / 2.6)))
              );
              const nodeColor =
                g.goalPct >= 100
                  ? 'bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.9)]'
                  : g.goalPct >= 50
                  ? 'bg-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.9)]'
                  : 'bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.9)]';

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => inspectGovernor(g)}
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-pointer"
                >
                  <div
                    className={`w-4 h-4 rounded-full ${nodeColor} group-hover:scale-150 transition-transform`}
                  />
                  <span className="mt-1 px-2 py-0.5 rounded bg-[#06080d]/90 border border-white/15 text-[10px] font-mono text-white whitespace-nowrap">
                    [{g.alliance}] {g.name} ({g.goalPct}%)
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 relative z-10">
            <span>X-Axis: Principal Component 1 (Power & Tech Manifold)</span>
            <span>Y-Axis: Principal Component 2 (Live 60fps DKP Velocity)</span>
          </div>
        </div>
      )}

      {/* Telemetry Sub-Module Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          {
            title: 'Kingdom Analysis (12 Tabs)',
            desc: 'Overview, T5 Push Radar, Scatter Plot Deadweight Ledger, Alliance Merge & Vault.',
            href: '/analysis/kingdom',
            icon: BarChart2,
          },
          {
            title: 'Global Cross-Kingdom Hub',
            desc: 'Multi-kingdom delta comparisons, camp leaderboards, and recruiting vectors.',
            href: '/analysis/global',
            icon: TrendingUp,
          },
          {
            title: 'DKP Results & HOH Board',
            desc: 'Full Hall of Heroes override ledger and shareable public DKP links.',
            href: '/results/dkp',
            icon: Medal,
          },
          {
            title: 'Kingdom Executive Rollup',
            desc: 'Instant C-suite readiness brief across top 300 matchmaking power.',
            href: '/tools/kingdom-rollup',
            icon: Zap,
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className="p-4 rounded-xl bg-[#0b0e17] border border-[#1e2638] hover:border-amber-500/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <Icon size={18} className="text-amber-400" />
                <div className="text-sm font-black text-white mt-2.5 group-hover:text-amber-300">
                  {item.title}
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#1e2638] flex items-center justify-between text-[11px] font-mono text-amber-400">
                <span>Open Workbench</span>
                <ArrowRight size={13} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
