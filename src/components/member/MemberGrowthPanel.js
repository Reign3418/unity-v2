'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Sparkles, Shield, Sword, Zap, RefreshCw, Bot, X, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';

// ─────────────────────────────────────────────────────────────────────────────
// Exact grading engine from GrowthAnalysisTab — same math, same grades
// ─────────────────────────────────────────────────────────────────────────────
function computeGrowthData(behavioralRoster, kingdomState = 'Peace') {
    if (!behavioralRoster || behavioralRoster.length === 0) return [];

    const validRoster = behavioralRoster.filter(g => g.powerEnd > 0);

    const getPercentile = (arr, valFn, p = 0.95) => {
        const values = arr.map(valFn).sort((a, b) => a - b);
        if (values.length === 0) return 1;
        const index = Math.floor(values.length * p);
        return values[index] || values[values.length - 1] || 1;
    };

    const maxKP       = Math.max(1, getPercentile(validRoster, p => p.kpDiff));
    const maxDeads    = Math.max(1, getPercentile(validRoster, p => p.deadsDiff));
    const maxTech     = Math.max(1, getPercentile(validRoster, p => p.techPowerDiff));
    const maxBld      = Math.max(1, getPercentile(validRoster, p => p.bldPowerDiff));
    const maxTroop    = Math.max(1, getPercentile(validRoster, p => p.troopPowerDiff));
    const maxGathered = Math.max(1, getPercentile(validRoster, p => p.gatheredDiff));

    const WEIGHTS = kingdomState === 'Peace'
        ? { TECH: 32, BLD: 30, TROOP: 28, KP: 0, DEADS: 0, GATHERED: 10 }
        : { TECH: 25, BLD: 25, TROOP: 25, KP: 12, DEADS: 8, GATHERED: 5 };
    const CAP = 1.25;

    const determineGrade = (score) => {
        if (score >= 80) return 'S';
        if (score >= 60) return 'A';
        if (score >= 40) return 'B';
        if (score >= 20) return 'C';
        return 'D';
    };

    const determineArchetype = (p, mxKP, mxDeads, mxFarm) => {
        const isHighKP    = p.kpDiff      > (mxKP * 0.4);
        const isHighDeads = p.deadsDiff   > (mxDeads * 0.4);
        const isHighFarm  = p.gatheredDiff > (mxFarm * 0.5);
        if (isHighKP && isHighDeads) return 'Warrior';
        if (isHighKP)                return 'Brawler';
        if (isHighDeads)             return 'Meatshield';
        if (isHighFarm)              return 'Harvester';
        if (p.powerDiff > 0)         return 'Grower';
        return 'Casual';
    };

    return validRoster.map(p => {
        const sTech    = Math.min(CAP, Math.max(0, p.techPowerDiff) / maxTech) * WEIGHTS.TECH;
        const sBld     = Math.min(CAP, Math.max(0, p.bldPowerDiff) / maxBld) * WEIGHTS.BLD;
        const sTroop   = Math.min(CAP, Math.max(0, p.troopPowerDiff) / maxTroop) * WEIGHTS.TROOP;
        const sKP      = Math.min(CAP, Math.max(0, p.kpDiff) / maxKP) * WEIGHTS.KP;
        const sDeads   = Math.min(CAP, Math.max(0, p.deadsDiff) / maxDeads) * WEIGHTS.DEADS;
        const sGathered = Math.min(CAP, Math.max(0, p.gatheredDiff) / maxGathered) * WEIGHTS.GATHERED;
        const finalScore = Math.max(0, Math.min(100, sKP + sDeads + sTech + sBld + sTroop + sGathered));

        return {
            ...p,
            finalScore,
            grade: determineGrade(finalScore),
            archetype: determineArchetype(p, maxKP * 1.5, maxDeads * 1.5, maxGathered * 1.5),
        };
    }).sort((a, b) => b.finalScore - a.finalScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => {
    if (!n && n !== 0) return '0';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '+';
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`;
    return `${sign}${abs}`;
};

const GRADE_CONFIG = {
    S: { label: 'S — Gods',    color: 'text-amber-400',   bar: 'bg-amber-400',   glow: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]'  },
    A: { label: 'A — Elite',   color: 'text-emerald-400', bar: 'bg-emerald-400', glow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]'  },
    B: { label: 'B — Vanguard',color: 'text-blue-400',    bar: 'bg-blue-400',    glow: 'shadow-[0_0_8px_rgba(96,165,250,0.4)]'  },
    C: { label: 'C — Reserve', color: 'text-orange-400',  bar: 'bg-orange-400',  glow: ''                                        },
    D: { label: 'D — Review',  color: 'text-red-500',     bar: 'bg-red-500',     glow: ''                                        },
};

const ARCHETYPE_CONFIG = {
    Warrior:    { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: '⚔️' },
    Brawler:    { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',       icon: '🥊' },
    Meatshield: { color: 'text-red-400 bg-red-500/10 border-red-500/30',             icon: '🛡️' },
    Harvester:  { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',    icon: '🌾' },
    Grower:     { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',          icon: '📈' },
    Casual:     { color: 'text-gray-400 bg-gray-500/10 border-gray-500/30',          icon: '😴' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function MemberGrowthPanel({ govId, kingdomId, session }) {
    const locale = useLocale();
    const [loading, setLoading]               = useState(true);
    const [error, setError]                   = useState(null);
    const [startDate, setStartDate]           = useState('');
    const [endDate, setEndDate]               = useState('');
    const [behavioralRoster, setBehavioralRoster] = useState([]);
    const [kingdomState, setKingdomState]     = useState('Peace');
    const [coachModal, setCoachModal]         = useState({ isOpen: false, data: null, isLoading: false, advice: '' });

    const extractDate = (d) => d ? d.split('T')[0].split(' ')[0].split('_')[0] : '';

    // ── Fetch: trends → dates → behavior ────────────────────────────────────
    useEffect(() => {
        if (!kingdomId) return;
        setLoading(true);
        setError(null);

        fetch(`/api/aws/trends?kd=${kingdomId}`)
            .then(r => r.ok ? r.json() : null)
            .then(async (d) => {
                const trends = d?.trends || [];
                if (trends.length < 2) {
                    setError('Not enough scan data available for growth analysis.');
                    setLoading(false);
                    return;
                }
                const sDate = extractDate(trends[0].scanDate);
                const eDate = extractDate(trends[trends.length - 1].scanDate);
                setStartDate(sDate);
                setEndDate(eDate);

                const bRes = await fetch(`/api/aws/behavior?kd=${kingdomId}&start=${sDate}&end=${eDate}&_t=${Date.now()}`);
                if (!bRes.ok) throw new Error('Behavior fetch failed');
                const bData = await bRes.json();
                setBehavioralRoster(bData.roster || []);
            })
            .catch(() => setError('Growth data unavailable right now.'))
            .finally(() => setLoading(false));
    }, [kingdomId]);

    // ── Compute grades ───────────────────────────────────────────────────────
    const growthData = useMemo(() => computeGrowthData(behavioralRoster, kingdomState), [behavioralRoster, kingdomState]);

    // ── Find member in roster (match by govId) ───────────────────────────────
    const myEntry = useMemo(() => {
        if (!govId || growthData.length === 0) return null;
        return growthData.find(g => String(g.id) === String(govId)) || null;
    }, [growthData, govId]);

    // ── Kingdom ranking ──────────────────────────────────────────────────────
    const myKingdomRank = useMemo(() => {
        if (!myEntry) return null;
        return growthData.findIndex(g => String(g.id) === String(govId)) + 1;
    }, [growthData, myEntry, govId]);

    // ── Alliance standings ───────────────────────────────────────────────────
    const allianceStandings = useMemo(() => {
        if (growthData.length === 0) return [];
        const map = {};
        for (const g of growthData) {
            const tag = g.alliance || '—';
            if (!map[tag]) map[tag] = { tag, total: 0, count: 0 };
            map[tag].total += g.finalScore;
            map[tag].count++;
        }
        return Object.values(map)
            .map(a => ({ ...a, avg: a.total / a.count }))
            .sort((a, b) => b.avg - a.avg);
    }, [growthData]);

    const myAllianceTag     = myEntry?.alliance || null;
    const myAllianceRank    = useMemo(() => {
        if (!myAllianceTag) return null;
        return allianceStandings.findIndex(a => a.tag === myAllianceTag) + 1;
    }, [allianceStandings, myAllianceTag]);

    const myAllianceEntry   = allianceStandings.find(a => a.tag === myAllianceTag);
    const myAllianceMembers = growthData.filter(g => g.alliance === myAllianceTag);
    const myAllianceRankIn  = myAllianceMembers.findIndex(g => String(g.id) === String(govId)) + 1;

    // ── Grade distribution ───────────────────────────────────────────────────
    const total = growthData.length || 1;
    const gradeCounts = useMemo(() => {
        const c = { S: 0, A: 0, B: 0, C: 0, D: 0 };
        for (const g of growthData) if (c[g.grade] !== undefined) c[g.grade]++;
        return c;
    }, [growthData]);

    // ── AI Coach (single-player, contextual) ─────────────────────────────────
    const handleCoach = async () => {
        if (!myEntry) return;
        setCoachModal({ isOpen: true, data: myEntry, isLoading: true, advice: '' });

        const powerBand = (myEntry.powerEnd || 0) * 0.20;
        const peers = growthData.filter(g =>
            g.id !== myEntry.id &&
            g.powerEnd >= (myEntry.powerEnd || 0) - powerBand &&
            g.powerEnd <= (myEntry.powerEnd || 0) + powerBand
        );
        const peerAvg = peers.length > 0 ? {
            count:          peers.length,
            powerDiff:      Math.round(peers.reduce((a, c) => a + (c.powerDiff || 0), 0) / peers.length),
            kpDiff:         Math.round(peers.reduce((a, c) => a + (c.kpDiff || 0), 0) / peers.length),
            deadsDiff:      Math.round(peers.reduce((a, c) => a + (c.deadsDiff || 0), 0) / peers.length),
            techPowerDiff:  Math.round(peers.reduce((a, c) => a + (c.techPowerDiff || 0), 0) / peers.length),
            cmdPowerDiff:   Math.round(peers.reduce((a, c) => a + (c.cmdPowerDiff || 0), 0) / peers.length),
            bldPowerDiff:   Math.round(peers.reduce((a, c) => a + (c.bldPowerDiff || 0), 0) / peers.length),
            troopPowerDiff: Math.round(peers.reduce((a, c) => a + (c.troopPowerDiff || 0), 0) / peers.length),
            gatheredDiff:   Math.round(peers.reduce((a, c) => a + (c.gatheredDiff || 0), 0) / peers.length),
        } : null;

        try {
            const res = await fetch('/api/aws/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...myEntry, kingdomState, startDate, endDate, peerAvg, locale }),
            });
            const data = await res.json();
            setCoachModal(prev => ({ ...prev, isLoading: false, advice: data.success ? data.advice : 'AI Coach unavailable.' }));
        } catch {
            setCoachModal(prev => ({ ...prev, isLoading: false, advice: 'Network error reaching AI Coach.' }));
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* ── Section Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Growth Intelligence</h2>
                    {startDate && endDate && (
                        <p className="text-[10px] text-gray-600 mt-0.5 font-mono">{startDate} → {endDate}</p>
                    )}
                </div>
                <button
                    onClick={() => setKingdomState(s => s === 'Peace' ? 'War' : 'Peace')}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider transition-colors ${
                        kingdomState === 'Peace'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                >
                    {kingdomState === 'Peace' ? '🕊️ Peace' : '⚔️ War'}
                </button>
            </div>

            {/* ── Loading ─────────────────────────────────────────────────── */}
            {loading && (
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-10 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                    <p className="text-xs text-gray-500 uppercase tracking-widest animate-pulse font-bold">Computing Growth Grades...</p>
                </div>
            )}

            {/* ── Error ───────────────────────────────────────────────────── */}
            {!loading && error && (
                <div className="bg-[#0f1115] border border-dashed border-[#2d323e] rounded-xl p-8 text-center">
                    <p className="text-sm text-gray-500">{error}</p>
                </div>
            )}

            {/* ── Main Panels ─────────────────────────────────────────────── */}
            {!loading && !error && growthData.length > 0 && (
                <div className="space-y-4">

                    {/* ── Panel 1: Kingdom Health ─────────────────────────── */}
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg border border-purple-500/30 bg-purple-500/5">
                                <Sparkles size={15} className="text-purple-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Kingdom Health</p>
                                <p className="text-[10px] text-gray-700 font-mono">{growthData.length} governors graded</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {['S', 'A', 'B', 'C', 'D'].map(grade => {
                                const cfg = GRADE_CONFIG[grade];
                                const count = gradeCounts[grade];
                                const pct = Math.round((count / total) * 100);
                                return (
                                    <div key={grade} className="flex items-center gap-3">
                                        <span className={`w-10 text-[10px] font-black uppercase tracking-wider ${cfg.color} shrink-0`}>
                                            {grade}
                                        </span>
                                        <div className="flex-1 bg-[#13161c] rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-500 w-14 text-right shrink-0">
                                            {count} <span className="text-gray-700">({pct}%)</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Top 3 performers */}
                        <div className="mt-4 pt-4 border-t border-[#1e222b]">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2">Top Performers</p>
                            <div className="space-y-1.5">
                                {growthData.slice(0, 3).map((g, i) => (
                                    <div key={g.id} className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-600 w-4">{i + 1}.</span>
                                        <span className="text-xs font-bold text-white truncate flex-1">{g.name}</span>
                                        <span className="text-[10px] font-mono text-gray-500">[{g.alliance}]</span>
                                        <span className={`text-[10px] font-black ${GRADE_CONFIG[g.grade].color}`}>{g.grade}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Panel 2: Alliance Standings ─────────────────────── */}
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                                <TrendingUp size={15} className="text-cyan-400" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Alliance Standings</p>
                        </div>

                        <div className="space-y-1.5">
                            {allianceStandings.slice(0, 8).map((a, i) => {
                                const isMe = a.tag === myAllianceTag;
                                return (
                                    <div
                                        key={a.tag}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                            isMe
                                                ? 'bg-cyan-500/10 border border-cyan-500/20'
                                                : 'bg-[#13161c] border border-transparent'
                                        }`}
                                    >
                                        <span className={`text-[10px] font-black w-5 shrink-0 ${isMe ? 'text-cyan-400' : 'text-gray-600'}`}>
                                            {i + 1}.
                                        </span>
                                        <span className={`font-mono font-bold text-sm flex-1 truncate ${isMe ? 'text-cyan-300' : 'text-gray-300'}`}>
                                            [{a.tag}]
                                        </span>
                                        <span className="text-[10px] text-gray-600 font-mono shrink-0">{a.count}m</span>
                                        <div className="w-20 bg-[#0a0c0f] rounded-full h-1.5 shrink-0">
                                            <div
                                                className={`h-full rounded-full ${isMe ? 'bg-cyan-400' : 'bg-gray-600'}`}
                                                style={{ width: `${Math.round(a.avg)}%` }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-black font-mono w-8 text-right shrink-0 ${isMe ? 'text-cyan-400' : 'text-gray-500'}`}>
                                            {a.avg.toFixed(0)}
                                        </span>
                                        {isMe && <span className="text-[9px] font-black text-cyan-500 uppercase tracking-wider shrink-0">YOU</span>}
                                    </div>
                                );
                            })}
                            {allianceStandings.length > 8 && (
                                <p className="text-center text-[10px] text-gray-700 pt-1">+{allianceStandings.length - 8} more alliances</p>
                            )}
                        </div>
                    </div>

                    {/* ── Panel 3: Your Standing ───────────────────────────── */}
                    {myEntry ? (
                        <div className={`bg-[#0f1115] border rounded-xl p-5 relative overflow-hidden ${GRADE_CONFIG[myEntry.grade].glow || 'border-[#1e222b]'}`}
                            style={{ borderColor: myEntry.grade === 'S' ? 'rgba(251,191,36,0.4)' : myEntry.grade === 'A' ? 'rgba(52,211,153,0.4)' : myEntry.grade === 'B' ? 'rgba(96,165,250,0.4)' : undefined }}
                        >
                            {/* Grade glow background */}
                            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2 opacity-20 ${
                                myEntry.grade === 'S' ? 'bg-amber-400' :
                                myEntry.grade === 'A' ? 'bg-emerald-400' :
                                myEntry.grade === 'B' ? 'bg-blue-400' : 'bg-gray-600'
                            }`} />

                            <div className="relative z-10">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-0.5">Your Standing</p>
                                        <p className="text-base font-bold text-white">{myEntry.name}</p>
                                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider mt-1 ${ARCHETYPE_CONFIG[myEntry.archetype]?.color || 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                                            {ARCHETYPE_CONFIG[myEntry.archetype]?.icon} {myEntry.archetype}
                                        </span>
                                    </div>
                                    {/* Big grade badge */}
                                    <div className="text-center shrink-0">
                                        <div className={`text-5xl font-black leading-none ${GRADE_CONFIG[myEntry.grade].color}`}>
                                            {myEntry.grade}
                                        </div>
                                        <div className="text-[10px] font-mono text-gray-500 mt-1">
                                            {myEntry.finalScore.toFixed(1)} pts
                                        </div>
                                    </div>
                                </div>

                                {/* Rank cards */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="bg-[#13161c] rounded-lg p-3 text-center border border-[#1e222b]">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-600 mb-1">Kingdom Rank</p>
                                        <p className="text-lg font-black text-white">{myKingdomRank}</p>
                                        <p className="text-[9px] text-gray-600 font-mono">of {growthData.length}</p>
                                    </div>
                                    <div className="bg-[#13161c] rounded-lg p-3 text-center border border-[#1e222b]">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-600 mb-1">Alliance Rank</p>
                                        <p className="text-lg font-black text-white">{myAllianceRankIn || '—'}</p>
                                        <p className="text-[9px] text-gray-600 font-mono">of {myAllianceMembers.length} in [{myAllianceTag}]</p>
                                    </div>
                                    <div className="bg-[#13161c] rounded-lg p-3 text-center border border-[#1e222b]">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-600 mb-1">Alliance Rank</p>
                                        <p className="text-lg font-black text-white">#{myAllianceRank}</p>
                                        <p className="text-[9px] text-gray-600 font-mono">of {allianceStandings.length} alliances</p>
                                    </div>
                                </div>

                                {/* Key deltas */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                    {[
                                        { label: 'Power Δ',    val: myEntry.powerDiff,     color: myEntry.powerDiff >= 0 ? 'text-emerald-400' : 'text-red-500' },
                                        { label: 'KP Δ',       val: myEntry.kpDiff,         color: 'text-emerald-400' },
                                        { label: 'Deads Δ',    val: myEntry.deadsDiff,     color: 'text-red-400' },
                                        { label: 'Gathered Δ', val: myEntry.gatheredDiff,  color: 'text-yellow-400' },
                                    ].map(({ label, val, color }) => (
                                        <div key={label} className="bg-[#13161c] rounded-lg p-2.5 border border-[#1e222b]">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-gray-600 mb-1">{label}</p>
                                            <p className={`text-sm font-black font-mono ${color}`}>{fmt(val)}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* AI Coach button */}
                                <button
                                    onClick={handleCoach}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-colors"
                                >
                                    <Bot size={14} />
                                    Get AI Coaching — Personalized Growth Advice
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Governor not found in scan */
                        <div className="bg-[#0f1115] border border-dashed border-[#2d323e] rounded-xl p-8 text-center">
                            <Shield size={22} className="text-gray-600 mx-auto mb-3" />
                            <p className="text-sm font-bold text-gray-400 mb-1">Your Governor Not Found in Latest Scan</p>
                            <p className="text-xs text-gray-600">Your Governor ID may not be in Kingdom {kingdomId}'s scan data yet. Make sure your card is linked in Settings.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Empty state ─────────────────────────────────────────────── */}
            {!loading && !error && growthData.length === 0 && (
                <div className="bg-[#0f1115] border border-dashed border-[#2d323e] rounded-xl p-8 text-center">
                    <p className="text-sm text-gray-500">No growth data available for this kingdom yet.</p>
                </div>
            )}

            {/* ── AI Coach Modal ───────────────────────────────────────────── */}
            {coachModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#0f1115] border-2 border-indigo-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                        <div className="bg-indigo-950/40 p-4 border-b border-indigo-500/30 flex justify-between items-center relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/50">
                                    <Bot className="text-indigo-400 w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black tracking-widest uppercase text-sm">V2 AI-Engine Coach</h3>
                                    <p className="text-indigo-300/70 text-[10px] font-mono uppercase tracking-wider">Analyzing: {coachModal.data?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setCoachModal({ isOpen: false, data: null, isLoading: false, advice: '' })} className="text-gray-400 hover:text-white p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 relative min-h-[200px] flex flex-col justify-center">
                            {coachModal.isLoading ? (
                                <div className="flex flex-col items-center justify-center text-indigo-400">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                    <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Consulting Tactical Database...</p>
                                </div>
                            ) : (
                                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                    <div dangerouslySetInnerHTML={{ __html: coachModal.advice.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-bold">$1</span>') }} />
                                </div>
                            )}
                        </div>

                        <div className="bg-[#0a0c0f] p-4 border-t border-[#1e222b] flex justify-end">
                            <button
                                onClick={() => setCoachModal({ isOpen: false, data: null, isLoading: false, advice: '' })}
                                className="px-6 py-2 bg-[#13161c] hover:bg-[#1e222b] text-gray-300 border border-[#2d323e] rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
