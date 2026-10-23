'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Zap,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  TrendingUp,
  Layers,
  Award,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { ALL_35_FIELD_GROUPS, evaluateF2pGovernorReport } from '@/lib/f2pEfficiencyEngine';

const fmtNum = (val) => {
  const n = Number(val);
  if (!n && n !== 0) return '0';
  return n.toLocaleString();
};

const fmtCompact = (val) => {
  const n = Number(val) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

export default function F2pEfficiencyOptimizer({ initialGovId = '', initialKd = '4194' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedGov, setSelectedGov] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [activeTab, setActiveTab] = useState('diagnostics'); // diagnostics | spend | speedups | telemetry35
  const [customDaysInput, setCustomDaysInput] = useState(30);
  const [showAll35Expanded, setShowAll35Expanded] = useState(false);

  const fetchGovernors = async (searchStr = '') => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/aws/governor-search?q=${encodeURIComponent(searchStr)}&limit=50&_t=${Date.now()}`
      );
      if (res.ok) {
        const data = await res.json();
        const list = data.results || [];
        setResults(list);
        setUpdatedAt(data.updatedAt);
        if (list.length > 0) {
          if (initialGovId) {
            const match = list.find((g) => String(g.id) === String(initialGovId));
            setSelectedGov(match || list[0]);
          } else if (!selectedGov || searchStr) {
            setSelectedGov(list[0]);
          } else {
            const refreshed = list.find((g) => String(g.id) === String(selectedGov.id));
            setSelectedGov(refreshed || list[0]);
          }
        }
      }
    } catch (e) {
      console.error('[F2pEfficiencyOptimizer] Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernors('');
  }, [initialGovId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGovernors(query);
  };

  const report = useMemo(() => {
    if (!selectedGov) return null;
    return selectedGov.f2pReport || evaluateF2pGovernorReport(selectedGov);
  }, [selectedGov]);

  // Interactive custom speedup calculator math
  const customSpeedupCalc = useMemo(() => {
    if (!report) return null;
    const rawDays = Math.max(0.5, Number(customDaysInput) || 30);
    const baseMult = 1 + report.speedupPlaybook.currentEstBonusPct / 100;
    const fullMult = 1 + report.speedupPlaybook.fullStackBonusPct / 100;
    const unbuffedDays = +(rawDays / baseMult).toFixed(2);
    const withTitleAndRuneDays = +(rawDays / fullMult).toFixed(2);
    const after30HelpsDays = +(withTitleAndRuneDays * Math.pow(0.99, 30)).toFixed(2);
    const savedDays = Math.max(0, +(unbuffedDays - after30HelpsDays).toFixed(2));
    const savedHours = Math.round(savedDays * 24);
    const savedGemsEquiv = Math.round(savedHours * 50); // 1hr speedup = 50 Gems VIP shop baseline
    return {
      rawDays,
      unbuffedDays,
      withTitleAndRuneDays,
      after30HelpsDays,
      savedDays,
      savedHours,
      savedGemsEquiv,
    };
  }, [report, customDaysInput]);

  const gradeColors = {
    S: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    A: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    B: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
    C: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
    D: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  };

  return (
    <div className="bg-[#0b0e14] border border-cyan-500/25 rounded-2xl overflow-hidden shadow-2xl">
      {/* ── Top Live Telemetry & Instant Search Bar ─────────────────────── */}
      <div className="p-5 bg-gradient-to-r from-[#0f1420] via-[#0b0e14] to-[#111726] border-b border-[#1e2638]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 35-Field RAM Telemetry
              </span>
              {updatedAt && (
                <span className="text-[10px] font-mono text-slate-400">
                  Synced {new Date(updatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-black text-white mt-1.5 flex items-center gap-2">
              <Sparkles size={18} className="text-cyan-400" />
              Instant 35-Field Governor Finder &amp; F2P Efficiency Advisor
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Search any scanned player by Name, Governor ID, or Alliance Tag to inspect all 35 hidden RAM metrics, diagnose account bottlenecks, and optimize every $2 &amp; speedup.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchGovernors(query)}
            className="self-start md:self-center flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-[#1e2638] text-xs font-mono font-bold text-cyan-300 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Live Feed</span>
          </button>
        </div>

        {/* Search Input + Quick Governor Pills */}
        <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex items-center gap-2.5 bg-[#06080d] border border-[#1e2638] focus-within:border-cyan-400 rounded-xl px-3.5 py-2.5">
            <Search size={16} className="text-cyan-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) fetchGovernors('');
              }}
              placeholder="Find any Governor instantly by Name, ID (e.g. 235824876), Alliance (FaKE, FOTN, D-94)..."
              className="w-full bg-transparent text-xs md:text-sm font-mono text-white placeholder:text-slate-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0"
          >
            Find Governor
          </button>
        </form>

        {/* One-Click Live Scanned Governor Pills */}
        {results.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 shrink-0">
              Live Scanned ({results.length}):
            </span>
            {results.map((g) => {
              const isSelected = String(selectedGov?.id) === String(g.id);
              const rep = g.f2pReport || evaluateF2pGovernorReport(g);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGov(g)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : 'bg-[#06080d] border-[#1e2638] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-cyan-400 font-bold">[{g.alliance}]</span>
                  <span>{g.name}</span>
                  <span className="text-[10px] text-slate-400">{fmtCompact(g.power)}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-black border ${
                      gradeColors[rep?.efficiencyGrade || 'B']
                    }`}
                  >
                    {rep?.efficiencyGrade}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Selected Governor Hero Summary + Power Architecture Bar ──────── */}
      {selectedGov && report ? (
        <div className="p-5 space-y-5">
          {/* Identity & Hidden Power Architecture Card */}
          <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1e2638] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1e2638] pb-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 ${
                    gradeColors[report.efficiencyGrade]
                  }`}
                >
                  <span className="text-3xl font-black leading-none">{report.efficiencyGrade}</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider mt-0.5">
                    {report.efficiencyScore}/100
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
                      RANK #{selectedGov.rank || '-'} (PREV #{selectedGov.prevRank || selectedGov.rank || '-'}) • ID: {selectedGov.id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-300">
                      CH {selectedGov.cityHall || 25} • VIP {selectedGov.vipLevel ?? 0} • {selectedGov.civilization || 'China'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300">
                      KD #{selectedGov.kingdomId || '4194'}
                    </span>
                    {(selectedGov.mapTileX || selectedGov.castlePos?.X) && (
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[11px] font-mono font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                        📍 MAP TILE: X:{selectedGov.mapTileX ?? Math.round(selectedGov.castlePos.X / 6)}{' '}
                        Y:{selectedGov.mapTileY ?? Math.round(selectedGov.castlePos.Y / 6)} (World:{' '}
                        {selectedGov.worldX ?? selectedGov.castlePos.X}, {selectedGov.worldY ?? selectedGov.castlePos.Y})
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white mt-1.5">
                    [{selectedGov.alliance}] {selectedGov.name}{' '}
                    {selectedGov.allianceName && (
                      <span className="text-xs font-normal text-slate-400">
                        ({selectedGov.allianceName})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    Total Power: <strong className="text-white">{fmtNum(selectedGov.power)}</strong> • Kill Points:{' '}
                    <strong className="text-emerald-400">{fmtNum(selectedGov.killPoints)}</strong> • Dead:{' '}
                    <strong className="text-rose-400">{fmtNum(selectedGov.dead)}</strong> • Healed (RAM):{' '}
                    <strong className="text-cyan-400">{fmtNum(selectedGov.healedTroops)}</strong>
                  </p>
                  {(selectedGov.primaryCommanderStr || selectedGov.ralliesLed > 0 || selectedGov.ralliesJoined > 0) && (
                    <p className="text-[11px] font-mono text-amber-300/90 mt-1">
                      ⚔️ Rallies: <strong>{selectedGov.ralliesLed || 0} Led / {selectedGov.ralliesJoined || 0} Joined</strong>
                      {selectedGov.primaryCommanderStr && (
                        <> • Primary: <strong>{selectedGov.primaryCommanderStr}</strong></>
                      )}
                      {selectedGov.secondaryCommanderStr && (
                        <> + Secondary: <strong>{selectedGov.secondaryCommanderStr}</strong></>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* 4 Hidden RAM Power Sub-Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    label: 'Troop Power',
                    val: selectedGov.troopPower,
                    pct: report.ratios.troopPct,
                    tone: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
                  },
                  {
                    label: 'Tech Power',
                    val: selectedGov.techPower,
                    pct: report.ratios.techPct,
                    tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
                  },
                  {
                    label: 'Building Power',
                    val: selectedGov.buildingPower,
                    pct: report.ratios.buildPct,
                    tone: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
                  },
                  {
                    label: 'Cmdr Bloat',
                    val: selectedGov.commanderPower,
                    pct: report.ratios.cmdrPct,
                    tone: report.ratios.cmdrPct >= 16
                      ? 'text-rose-400 border-rose-500/40 bg-rose-500/10'
                      : 'text-purple-400 border-purple-500/30 bg-purple-500/5',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`px-3 py-2 rounded-xl border ${item.tone} flex flex-col justify-between`}
                  >
                    <span className="text-[10px] font-mono uppercase text-slate-400">{item.label}</span>
                    <span className="text-sm font-black font-mono text-white mt-0.5">
                      {fmtCompact(item.val)}
                    </span>
                    <span className="text-[10px] font-mono font-bold">{item.pct}% of Power</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Stacked Power Architecture Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>HIDDEN RAM POWER ARCHITECTURE (EXACT DECRYPTED LUA TABLE)</span>
                <span>
                  Sum ={' '}
                  {fmtNum(
                    (Number(selectedGov.troopPower) || 0) +
                      (Number(selectedGov.techPower) || 0) +
                      (Number(selectedGov.buildingPower) || 0) +
                      (Number(selectedGov.commanderPower) || 0)
                  )}{' '}
                  / {fmtNum(selectedGov.power)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#0d111a] overflow-hidden flex border border-[#1e2638]">
                <div
                  style={{ width: `${report.ratios.troopPct}%` }}
                  className="bg-cyan-500 h-full"
                  title={`Troop Power: ${report.ratios.troopPct}%`}
                />
                <div
                  style={{ width: `${report.ratios.techPct}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Tech Power: ${report.ratios.techPct}%`}
                />
                <div
                  style={{ width: `${report.ratios.cmdrPct}%` }}
                  className="bg-purple-500 h-full"
                  title={`Commander Power: ${report.ratios.cmdrPct}%`}
                />
                <div
                  style={{ width: `${report.ratios.buildPct}%` }}
                  className="bg-amber-500 h-full"
                  title={`Building Power: ${report.ratios.buildPct}%`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-400 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" /> Troops ({report.ratios.troopPct}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Academy Tech ({report.ratios.techPct}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Commanders ({report.ratios.cmdrPct}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Buildings ({report.ratios.buildPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* ── Navigation Tabs for the 4 F2P Empowerment Modules ─────────── */}
          <div className="flex flex-wrap gap-2 border-b border-[#1e2638] pb-3">
            {[
              {
                id: 'diagnostics',
                label: '1. What You Are Doing Wrong (Audit)',
                icon: AlertTriangle,
                badge: report.diagnostics.length,
              },
              {
                id: 'spend',
                label: '2. How to Spend $2–$5 Wisely (4,000% ROI)',
                icon: DollarSign,
              },
              {
                id: 'speedups',
                label: '3. Speedup & Buff-Stacking Optimizer',
                icon: Clock,
              },
              {
                id: 'telemetry35',
                label: '4. All 35 Live RAM Fields',
                icon: Layers,
                badge: '35',
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isAct = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    isAct
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                      : 'bg-[#07090e] text-slate-300 border-[#1e2638] hover:border-cyan-500/40'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        isAct ? 'bg-black/20 text-black' : 'bg-white/10 text-cyan-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── TAB 1: WHAT YOU ARE DOING WRONG (AUTOMATED DIAGNOSTICS) ──── */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              {report.diagnostics.map((d, i) => {
                const isCrit = d.severity === 'critical';
                const isOpt = d.severity === 'optimal';
                const boxStyle = isCrit
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : isOpt
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-amber-500/40 bg-amber-500/5';
                const badgeStyle = isCrit
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : isOpt
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                return (
                  <div key={i} className={`p-4 rounded-2xl border ${boxStyle} space-y-2`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isOpt ? (
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle
                            size={16}
                            className={isCrit ? 'text-rose-400 shrink-0' : 'text-amber-400 shrink-0'}
                          />
                        )}
                        <h4 className="text-sm font-black text-white">{d.title}</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeStyle}`}>
                        {d.metric}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{d.problem}</p>
                    <div className="p-3 rounded-xl bg-[#06080d]/90 border border-white/10">
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider text-cyan-400 block mb-0.5">
                        Actionable Fix for {selectedGov.name}:
                      </span>
                      <p className="text-xs text-white font-medium leading-relaxed">{d.fix}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TAB 2: HOW TO SPEND $2–$5 WISELY (MICRO-SPENDER PLAYBOOK) ── */}
          {activeTab === 'spend' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400">
                    F2P &amp; Low-Spender Capital Allocation Law
                  </div>
                  <h4 className="text-sm font-black text-white mt-0.5">
                    Never buy standard bundles or raw Gems. 95% of RoK bundles have terrible ROI—these 4 micro-buys give 10x–40x more permanent account power per dollar.
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {report.twoDollarPlaybook.map((item) => (
                  <div
                    key={item.rank}
                    className="p-4 rounded-2xl bg-[#07090e] border border-[#1e2638] hover:border-cyan-500/40 transition-colors flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono font-black text-emerald-400">
                          #{item.rank} • {item.price}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                          {item.roiBadge}
                        </span>
                      </div>
                      <h5 className="text-sm font-black text-white">{item.bundle}</h5>
                      <div className="text-xs font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2.5 py-1.5">
                        {item.valueBreakdown}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed border-t border-[#1e2638] pt-2.5">
                      <strong className="text-white">Why for {selectedGov.name}:</strong> {item.whyForYou}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 3: SPEEDUP & BUFF-STACKING EFFICIENCY CALCULATOR ─────── */}
          {activeTab === 'speedups' && customSpeedupCalc && (
            <div className="space-y-4">
              {/* Interactive Calculator Card */}
              <div className="p-4 rounded-2xl bg-[#07090e] border border-cyan-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2638] pb-3">
                  <div>
                    <div className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400">
                      Interactive Speedup &amp; 30-Help Compound Calculator
                    </div>
                    <h4 className="text-sm font-black text-white mt-0.5">
                      See how many Days &amp; Hours of Speedups {selectedGov.name} saves by stacking buffs BEFORE clicking Start:
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0b0e14] border border-cyan-500/40 rounded-xl px-3 py-1.5">
                    <span className="text-xs font-mono text-slate-300">Base Timer (Days):</span>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={customDaysInput}
                      onChange={(e) => setCustomDaysInput(e.target.value)}
                      className="w-16 bg-transparent text-sm font-mono font-black text-cyan-400 text-right outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#0b0e14] border border-[#1e2638]">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      1. Impatient Start (No Rune/Title)
                    </div>
                    <div className="text-lg font-black font-mono text-rose-400 mt-1">
                      {customSpeedupCalc.unbuffedDays} Days
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      +{report.speedupPlaybook.currentEstBonusPct}% Base Speed Only
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0b0e14] border border-[#1e2638]">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      2. With 15% Rune + Title + Kingdom Buff
                    </div>
                    <div className="text-lg font-black font-mono text-amber-400 mt-1">
                      {customSpeedupCalc.withTitleAndRuneDays} Days
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      +{report.speedupPlaybook.fullStackBonusPct}% Stacked Speed
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0b0e14] border border-emerald-500/30">
                    <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                      3. After Waiting for 30/30 Helps
                    </div>
                    <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                      {customSpeedupCalc.after30HelpsDays} Days
                    </div>
                    <div className="text-[10px] font-mono text-emerald-500/80">
                      Final Speedups Needed
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/40">
                    <div className="text-[10px] font-mono text-cyan-300 uppercase font-black">
                      Total Free Speedups Saved
                    </div>
                    <div className="text-lg font-black font-mono text-white mt-1">
                      {customSpeedupCalc.savedDays} Days ({customSpeedupCalc.savedHours}h)
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300">
                      ≈ {fmtNum(customSpeedupCalc.savedGemsEquiv)} Gems Value Saved!
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Golden Rules of Speedup Efficiency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.speedupPlaybook.steps.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#07090e] border border-[#1e2638] space-y-1.5">
                    <div className="text-xs font-mono font-black text-cyan-400">{s.step}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: ALL 35 LIVE RAM TELEMETRY FIELDS ───────────────────── */}
          {activeTab === 'telemetry35' && (
            <div className="space-y-4">
              {ALL_35_FIELD_GROUPS.map((grp) => (
                <div key={grp.group} className="p-4 rounded-2xl bg-[#07090e] border border-[#1e2638] space-y-3">
                  <div className="text-xs font-mono font-black text-cyan-400 uppercase tracking-wider">
                    {grp.group}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {grp.fields.map((f) => {
                      const rawVal = selectedGov[f.key];
                      let displayVal = '—';
                      if (f.format === 'number') {
                        displayVal = fmtNum(rawVal || 0);
                      } else if (f.format === 'level') {
                        displayVal = `Lv. ${rawVal ?? 0}`;
                      } else if (rawVal && typeof rawVal === 'object') {
                        if (rawVal.X !== undefined || rawVal.x !== undefined) {
                          displayVal = `X:${rawVal.X ?? rawVal.x}, Y:${rawVal.Y ?? rawVal.y}`;
                        } else if (rawVal.id !== undefined) {
                          displayVal = `Hero #${rawVal.id} (Lv${rawVal.level || 1}${rawVal.skills ? ` • ${rawVal.skills}` : ''})`;
                        } else {
                          displayVal = JSON.stringify(rawVal);
                        }
                      } else if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                        displayVal = String(rawVal);
                      }
                      return (
                        <div
                          key={f.key}
                          className="p-2.5 rounded-xl bg-[#0b0e14] border border-[#1e2638] flex flex-col justify-between"
                        >
                          <span className="text-[10px] font-mono text-slate-400">{f.label}</span>
                          <span className="text-xs font-mono font-black text-white mt-1 truncate" title={displayVal}>
                            {displayVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs font-mono">
          {loading ? 'Scanning live 35-field telemetry feed...' : 'No matching governor found.'}
        </div>
      )}
    </div>
  );
}
