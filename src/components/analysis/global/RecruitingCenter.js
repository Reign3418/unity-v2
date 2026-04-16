'use client';

import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
    Search, Target, Crosshair, RefreshCw, Download,
    Users, Shield, Swords, Sprout, TrendingUp,
    Zap, Star, ChevronDown, ChevronUp, HelpCircle, BookOpen
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ARCHETYPE_META = {
    HERO:    { label: 'Hero',    color: '#22c55e', icon: Star,    desc: 'Elite fighters — max kill point output relative to power. These are your most valuable combat assets.' },
    WARRIOR: { label: 'Warrior', color: '#eab308', icon: Swords,  desc: 'Active combat players with consistent kill output. Strong KvK contributors.' },
    FEEDER:  { label: 'Feeder',  color: '#8b5cf6', icon: Shield,  desc: 'Troop-heavy players with high army composition. Great for rallies and zeroing targets.' },
    FARMER:  { label: 'Farmer',  color: '#06b6d4', icon: Sprout,  desc: 'Builder profile — tech and infrastructure focused. Valuable for kingdom development.' },
    SLACKER: { label: 'Slacker', color: '#6b7280', icon: Users,   desc: 'Low activity signals. Minimal combat or growth detected in the scan window.' },
};

// Full-name radar dimension definitions (shown in legend + ECharts tooltip)
const VECTOR_DIMENSIONS = [
    { short: 'Power Growth',    full: 'Power Growth Rate',          desc: 'How fast the player\'s total power is increasing per day across the scan window.' },
    { short: 'KP Output',       full: 'Kill Point Output',          desc: 'How many kill points the player accumulated per day — raw combat production velocity.' },
    { short: 'Combat Density',  full: 'Combat Density',             desc: 'Total kill points relative to overall power. High = fighter. Low = builder.' },
    { short: 'T5 Eligibility',  full: 'T5 Troop Eligibility',       desc: 'Structural readiness to train Tier 5 troops. Based on tech and building power floors.' },
    { short: 'Activity',        full: 'Activity Signal',            desc: 'Power change relative to total power — how active the player is regardless of size.' },
    { short: 'Troop Ratio',     full: 'Troop Power Ratio',          desc: 'Percentage of total power made up by fielded troops. High = army-heavy roster.' },
    { short: 'Infrastructure',  full: 'Infrastructure Investment',  desc: 'Tech + building power as a share of total — how much the player has invested in their base.' },
    { short: 'Cmdr Depth',      full: 'Commander Depth',            desc: 'Commander power relative to total. Reflects investment in commander development and stars.' },
];

const VECTOR_LABELS = VECTOR_DIMENSIONS.map(d => d.short);

// Power slider config — 0 to 1B in steps of 10M
const POWER_MAX = 1_000_000_000;
const POWER_STEP = 10_000_000;

function formatPowerLabel(val) {
    if (!val) return 'Any Power';
    if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B+`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(0)}M+`;
    return `${val.toLocaleString()}+`;
}

function abbrNum(n) {
    if (!n) return '0';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// How It Works — collapsible intel brief
// ─────────────────────────────────────────────────────────────────────────────
function HowItWorks() {
    const [open, setOpen] = useState(false);
    return (
        <div className="mb-5 bg-[#0d1117] border border-[#1e222b] rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#131920] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <BookOpen size={13} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">How It Works — Intel Brief</span>
                </div>
                {open ? <ChevronUp size={13} className="text-gray-500" /> : <ChevronDown size={13} className="text-gray-500" />}
            </button>

            {open && (
                <div className="px-4 pb-4 border-t border-[#1e222b]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {/* Step 1 */}
                        <div className="bg-[#131920] rounded-xl p-3 border border-cyan-500/10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[9px] font-black text-cyan-400 shrink-0">1</span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Define Your Source Pool</p>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Add the kingdoms you already know — your alliance, your most trusted partners. The top X% of players here (by power) become your <span className="text-cyan-300 font-bold">ideal recruitment target</span>. This is the behavioral fingerprint we search for.</p>
                        </div>
                        {/* Step 2 */}
                        <div className="bg-[#131920] rounded-xl p-3 border border-indigo-500/10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-black text-indigo-400 shrink-0">2</span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Set Your Target Pool</p>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Add the kingdoms you want to <span className="text-indigo-300 font-bold">recruit FROM</span> — rival kingdoms, migration candidates, or kingdoms your team is evaluating. Every active player is scanned as a potential recruit.</p>
                        </div>
                        {/* Step 3 */}
                        <div className="bg-[#131920] rounded-xl p-3 border border-violet-500/10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[9px] font-black text-violet-400 shrink-0">3</span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Read the Match Score</p>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed">Each candidate gets a <span className="text-violet-300 font-bold">Match Score %</span> — how closely their behavior pattern matches your source fingerprint. <span className="text-emerald-400 font-bold">85%+</span> = diamond. <span className="text-yellow-400 font-bold">70%+</span> = solid pick. Below 55% = probably not worth the outreach.</p>
                        </div>
                    </div>

                    {/* Archetype guide */}
                    <div className="mt-4">
                        <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-2 font-black">Player Archetypes</p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {Object.entries(ARCHETYPE_META).map(([key, v]) => {
                                const Icon = v.icon;
                                return (
                                    <div key={key} className="bg-[#0d1117] rounded-lg p-2 border border-[#1e222b]">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Icon size={10} style={{ color: v.color }} />
                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: v.color }}>{v.label}</span>
                                        </div>
                                        <p className="text-[9px] text-gray-600 leading-relaxed">{v.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KingdomPill({ id, onRemove, color = 'cyan' }) {
    const cls = {
        cyan:   'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
        indigo: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono ${cls[color]}`}>
            KD {id}
            <button onClick={() => onRemove(id)} className="ml-0.5 hover:text-white transition-colors">×</button>
        </span>
    );
}

function PlayerCard({ player, rank }) {
    const meta = ARCHETYPE_META[player.archetype] || ARCHETYPE_META.SLACKER;
    const Icon = meta.icon;
    const simPct = player.similarityScore;
    const simColor = simPct >= 85 ? '#22c55e' : simPct >= 70 ? '#eab308' : simPct >= 55 ? '#f97316' : '#6b7280';

    return (
        <div className="relative bg-[#0d1117] border border-[#1e222b] rounded-xl p-3 hover:border-[#2d3748] transition-all group">
            <span className="absolute top-2 right-2 text-[9px] font-black text-gray-600 font-mono">#{rank}</span>

            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}40` }}>
                    <Icon size={13} style={{ color: meta.color }} />
                </div>
                <div className="min-w-0">
                    <p className="text-white text-xs font-bold truncate">{player.name}</p>
                    <p className="text-gray-500 text-[9px] font-mono">[{player.alliance}] · KD {player.kingdomId}</p>
                </div>
            </div>

            <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] uppercase tracking-widest text-gray-500">Match Score</span>
                    <span className="text-xs font-black font-mono" style={{ color: simColor }}>{simPct}%</span>
                </div>
                <div className="h-1 bg-[#1e222b] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${simPct}%`, backgroundColor: simColor }} />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1">
                {[
                    { label: 'Power', val: abbrNum(player.power) },
                    { label: 'KP Δ',  val: (player.kpDelta >= 0 ? '+' : '') + abbrNum(player.kpDelta) },
                    { label: 'Pwr Δ', val: (player.powerDelta >= 0 ? '+' : '') + abbrNum(player.powerDelta) },
                ].map(s => (
                    <div key={s.label} className="bg-[#131920] rounded-lg p-1.5 text-center">
                        <p className="text-[8px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                        <p className="text-[10px] font-bold text-gray-300 font-mono">{s.val}</p>
                    </div>
                ))}
            </div>

            <div className="mt-2 flex items-center gap-1">
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                    {meta.label}
                </span>
                {player.techPower > 22_000_000 && player.buildingPower > 14_000_000 && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">T5 Eligible</span>
                )}
            </div>
        </div>
    );
}

// Gap Radar — with ECharts tooltip + dimension legend table below
function GapRadar({ idealVector, sourcePoolCentroid }) {
    if (!idealVector || !sourcePoolCentroid) return null;

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            show: true,
            trigger: 'item',
            backgroundColor: '#0d1117',
            borderColor: '#1e222b',
            textStyle: { color: '#e5e7eb', fontSize: 11, fontFamily: 'monospace' },
            formatter: (params) => {
                if (!params.value) return '';
                return VECTOR_DIMENSIONS.map((dim, i) =>
                    `<div style="margin:2px 0"><span style="color:#6b7280;font-size:9px">${dim.full}</span>: <strong style="color:#fff">${(params.value[i] * 100).toFixed(0)}%</strong></div>`
                ).join('');
            }
        },
        legend: {
            show: true,
            bottom: 0,
            textStyle: { color: '#6b7280', fontFamily: 'monospace', fontSize: 9 },
        },
        radar: {
            indicator: VECTOR_DIMENSIONS.map(d => ({ name: d.short, max: 1 })),
            center: ['50%', '48%'],
            radius: '62%',
            axisName: { color: '#6b7280', fontSize: 9, fontFamily: 'monospace' },
            splitLine: { lineStyle: { color: '#1e222b' } },
            splitArea: { show: false },
            axisLine:  { lineStyle: { color: '#1e222b' } },
        },
        series: [{
            type: 'radar',
            data: [
                {
                    value: idealVector,
                    name: 'Target Profile',
                    lineStyle: { color: '#8b5cf6', width: 2 },
                    itemStyle: { color: '#8b5cf6' },
                    areaStyle: { color: '#8b5cf620' },
                },
                {
                    value: sourcePoolCentroid,
                    name: 'Current Pool',
                    lineStyle: { color: '#06b6d4', width: 2 },
                    itemStyle: { color: '#06b6d4' },
                    areaStyle: { color: '#06b6d415' },
                },
            ]
        }]
    };

    return (
        <div>
            <ReactECharts
                option={option}
                style={{ width: '100%', height: '240px' }}
                opts={{ renderer: 'canvas' }}
            />
            {/* Dimension legend table */}
            <div className="mt-2 border-t border-[#1e222b] pt-2 space-y-1">
                {VECTOR_DIMENSIONS.map(dim => (
                    <div key={dim.short} className="flex items-start gap-1.5">
                        <span className="text-[8px] font-black text-gray-400 whitespace-nowrap w-20 shrink-0 pt-px">{dim.short}</span>
                        <span className="text-[8px] text-gray-600 leading-relaxed">{dim.desc}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function RecruitingCenter({ session }) {
    const [sourceInput,     setSourceInput]     = useState('');
    const [targetInput,     setTargetInput]     = useState('');
    const [sourceKDs,       setSourceKDs]       = useState([]);
    const [targetKDs,       setTargetKDs]       = useState([]);
    const [dkpThreshold,    setDkpThreshold]    = useState(30);
    const [windowDays,      setWindowDays]      = useState(7);
    const [minPower,        setMinPower]        = useState(0);
    const [filterArchetype, setFilterArchetype] = useState('ALL');
    const [searchQuery,     setSearchQuery]     = useState('');
    const [sortBy,          setSortBy]          = useState('similarity');
    const [isLoading,       setIsLoading]       = useState(false);
    const [results,         setResults]         = useState(null);
    const [error,           setError]           = useState(null);

    const addKD = (val, list, setList, setInput) => {
        const ids = val.trim().split(/[\s,]+/).filter(Boolean);
        for (const id of ids) {
            if (id && !list.includes(id)) setList(prev => [...prev, id]);
        }
        setInput('');
    };

    const removeKD = (id, setList) => setList(prev => prev.filter(k => k !== id));

    const runAnalysis = async () => {
        if (sourceKDs.length === 0 || targetKDs.length === 0) {
            setError('Add at least one source and one target kingdom.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const resp = await fetch('/api/aws/recruiting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceKingdoms: sourceKDs, targetKingdoms: targetKDs, dkpThreshold, windowDays, minPower }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Analysis failed.');
            setResults(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCandidates = useMemo(() => {
        if (!results?.candidates) return [];
        let list = results.candidates;
        if (filterArchetype !== 'ALL') list = list.filter(c => c.archetype === filterArchetype);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c => c.name.toLowerCase().includes(q) || c.alliance.toLowerCase().includes(q) || c.id.toString().includes(q));
        }
        if (sortBy === 'power')      list = [...list].sort((a, b) => b.power - a.power);
        if (sortBy === 'kpDelta')    list = [...list].sort((a, b) => b.kpDelta - a.kpDelta);
        if (sortBy === 'similarity') list = [...list].sort((a, b) => b.similarityScore - a.similarityScore);
        return list;
    }, [results, filterArchetype, searchQuery, sortBy]);

    const exportCSV = () => {
        if (!filteredCandidates.length) return;
        const header = 'Rank,Name,Alliance,Kingdom,Power,KP Delta,Power Delta,Archetype,Match Score\n';
        const rows = filteredCandidates.map((c, i) =>
            `${i + 1},${c.name},[${c.alliance}],${c.kingdomId},${c.power},${c.kpDelta},${c.powerDelta},${c.archetype},${c.similarityScore}%`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `unity_recruits_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-[#090b0e] text-white p-4 md:p-6">

            {/* ── Page Header ───────────────────────────────────────────── */}
            <div className="mb-4">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Target size={16} className="text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white">Recruiting Center</h1>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Vector Intelligence</span>
                </div>
                <p className="text-gray-500 text-xs ml-11">Find diamonds in the rough — identify players from target kingdoms who match your top performers' behavioral fingerprint.</p>
            </div>

            {/* ── How It Works (collapsible) ────────────────────────────── */}
            <HowItWorks />

            {/* ── 3-Column Layout ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_280px_1fr] gap-4">

                {/* ── PANEL 1: Source + Target Pool ─────────────────────── */}
                <div className="space-y-4">
                    <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-2">
                            <Shield size={11} /> Source Pool <span className="text-gray-600">(your kingdoms)</span>
                        </h2>
                        <p className="text-[10px] text-gray-500 mb-2">
                            These kingdoms define the "ideal" player profile. Top {dkpThreshold}% by power becomes the recruitment target vector.
                        </p>
                        <div className="flex gap-2 mb-2">
                            <input
                                className="flex-1 bg-[#131920] border border-[#1e222b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                                placeholder="Kingdom ID (e.g. 3155)"
                                value={sourceInput}
                                onChange={e => setSourceInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addKD(sourceInput, sourceKDs, setSourceKDs, setSourceInput)}
                            />
                            <button onClick={() => addKD(sourceInput, sourceKDs, setSourceKDs, setSourceInput)}
                                className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs rounded-lg hover:bg-cyan-500/20 transition-colors font-bold">
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1 min-h-[24px]">
                            {sourceKDs.map(id => <KingdomPill key={id} id={id} color="cyan" onRemove={id => removeKD(id, setSourceKDs)} />)}
                        </div>
                    </div>

                    <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                            <Crosshair size={11} /> Target Pool <span className="text-gray-600">(search kingdoms)</span>
                        </h2>
                        <p className="text-[10px] text-gray-500 mb-2">These kingdoms will be scanned for candidates matching your source profile.</p>
                        <div className="flex gap-2 mb-2">
                            <input
                                className="flex-1 bg-[#131920] border border-[#1e222b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                                placeholder="Kingdom ID (e.g. 4025)"
                                value={targetInput}
                                onChange={e => setTargetInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addKD(targetInput, targetKDs, setTargetKDs, setTargetInput)}
                            />
                            <button onClick={() => addKD(targetInput, targetKDs, setTargetKDs, setTargetInput)}
                                className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs rounded-lg hover:bg-indigo-500/20 transition-colors font-bold">
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1 min-h-[24px]">
                            {targetKDs.map(id => <KingdomPill key={id} id={id} color="indigo" onRemove={id => removeKD(id, setTargetKDs)} />)}
                        </div>
                    </div>

                    {/* Run Button */}
                    <button
                        onClick={runAnalysis}
                        disabled={isLoading || sourceKDs.length === 0 || targetKDs.length === 0}
                        className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all
                            bg-emerald-500/10 border border-emerald-500/30 text-emerald-400
                            hover:bg-emerald-500/20 hover:border-emerald-400/50
                            disabled:opacity-40 disabled:cursor-not-allowed">
                        {isLoading
                            ? <><RefreshCw size={14} className="animate-spin" /> Scanning Vector Field...</>
                            : <><Zap size={14} /> Run Analysis</>
                        }
                    </button>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">{error}</div>
                    )}
                </div>

                {/* ── PANEL 2: Target Profile Config ────────────────────── */}
                <div className="space-y-4">
                    <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-4 flex items-center gap-2">
                            <TrendingUp size={11} /> Target Profile
                        </h2>

                        {/* DKP Threshold */}
                        <div className="mb-4">
                            <div className="flex justify-between mb-1">
                                <label className="text-[9px] uppercase tracking-widest text-gray-500">Elite Threshold</label>
                                <span className="text-xs font-black text-violet-400 font-mono">Top {dkpThreshold}%</span>
                            </div>
                            <input type="range" min={5} max={50} step={5} value={dkpThreshold}
                                onChange={e => setDkpThreshold(Number(e.target.value))}
                                className="w-full accent-violet-500" />
                            <p className="text-[9px] text-gray-600 mt-1">
                                Top {dkpThreshold}% of source kingdoms by power = the "ideal player" fingerprint.
                                <span className="text-gray-500"> Lower % = stricter standard.</span>
                            </p>
                        </div>

                        {/* Analysis Window */}
                        <div className="mb-4">
                            <label className="text-[9px] uppercase tracking-widest text-gray-500 block mb-1">Analysis Window</label>
                            <div className="grid grid-cols-3 gap-1">
                                {[3, 7, 14].map(d => (
                                    <button key={d} onClick={() => setWindowDays(d)}
                                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border ${windowDays === d ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'border-[#1e222b] text-gray-500 hover:text-gray-300'}`}>
                                        {d}d
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-gray-600 mt-1">How many days of history to include when computing player deltas.</p>
                        </div>

                        {/* Min Power — slider */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-[9px] uppercase tracking-widest text-gray-500">Min Power Floor</label>
                                <span className="text-xs font-black text-violet-400 font-mono">{formatPowerLabel(minPower)}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={POWER_MAX}
                                step={POWER_STEP}
                                value={minPower}
                                onChange={e => setMinPower(Number(e.target.value))}
                                className="w-full accent-violet-500"
                            />
                            <div className="flex justify-between text-[8px] text-gray-700 font-mono mt-0.5">
                                <span>Any</span>
                                <span>250M</span>
                                <span>500M</span>
                                <span>750M</span>
                                <span>1B</span>
                            </div>
                            <p className="text-[9px] text-gray-600 mt-1">Filter out players below this power. Set to Any for brand-new kingdoms or developing servers.</p>
                        </div>
                    </div>

                    {/* Gap Radar */}
                    {results && (
                        <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-4">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gap Radar</h2>
                                <div className="flex gap-2">
                                    <span className="flex items-center gap-1 text-[8px] text-violet-400"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Target</span>
                                    <span className="flex items-center gap-1 text-[8px] text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Pool</span>
                                </div>
                            </div>
                            <p className="text-[9px] text-gray-600 mb-2">Hover any shape to see exact values. Gaps between the lines = areas to recruit into.</p>
                            <GapRadar idealVector={results.idealVector} sourcePoolCentroid={results.sourcePoolCentroid} />
                        </div>
                    )}

                    {/* Archetype breakdown */}
                    {results?.archetypeStats && (
                        <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-4">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Candidate Archetypes</h2>
                            <div className="space-y-1.5">
                                {Object.entries(results.archetypeStats).map(([archetype, count]) => {
                                    const meta = ARCHETYPE_META[archetype];
                                    const Icon = meta.icon;
                                    const pct = results.totalCandidatesScored > 0
                                        ? Math.round(count / results.totalCandidatesScored * 100) : 0;
                                    return (
                                        <div key={archetype} className="flex items-center gap-2">
                                            <Icon size={10} style={{ color: meta.color }} className="shrink-0" />
                                            <span className="text-[9px] font-bold text-gray-400 w-16">{meta.label}</span>
                                            <div className="flex-1 h-1 bg-[#1e222b] rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                                            </div>
                                            <span className="text-[9px] font-mono text-gray-500 w-7 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── PANEL 3: Results ───────────────────────────────────── */}
                <div>
                    {!results && !isLoading && (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-[#1e222b] rounded-xl text-gray-600 px-8">
                            <Target size={32} className="mb-3 opacity-30" />
                            <p className="text-sm font-bold uppercase tracking-widest mb-2">Awaiting Mission Parameters</p>
                            <p className="text-xs text-center text-gray-700 leading-relaxed max-w-sm">
                                Add your source kingdoms (your alliance) and target kingdoms (hunting grounds), then hit <span className="text-emerald-500 font-bold">Run Analysis</span>. Results are ranked by behavioral similarity — highest match at the top.
                            </p>
                            <p className="text-[10px] text-gray-700 mt-4 text-center max-w-xs">
                                💡 Expand the <span className="text-emerald-500">Intel Brief</span> above for a full walkthrough of how this tool works.
                            </p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-emerald-500/20 rounded-xl text-emerald-500">
                            <RefreshCw size={32} className="mb-3 animate-spin opacity-60" />
                            <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Scanning Vector Field</p>
                            <p className="text-xs mt-1 text-emerald-600">Computing behavioral fingerprints across {sourceKDs.length + targetKDs.length} kingdoms...</p>
                        </div>
                    )}

                    {results && (
                        <div>
                            {/* Result header */}
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                <div>
                                    <p className="text-xs font-black text-white">
                                        {filteredCandidates.length} <span className="text-gray-500 font-normal">candidates</span>{' '}
                                        <span className="text-gray-600">of {results.totalCandidatesScored} scanned</span>
                                    </p>
                                    <p className="text-[9px] text-gray-600 font-mono">
                                        Ideal vector from top {results.eliteBaselineSize} players in source kingdoms
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                        className="bg-[#0d1117] border border-[#1e222b] text-gray-400 text-[10px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500/50">
                                        <option value="similarity">Sort: Match Score</option>
                                        <option value="power">Sort: Power</option>
                                        <option value="kpDelta">Sort: KP Growth</option>
                                    </select>
                                    <button onClick={exportCSV}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-[#0d1117] border border-[#1e222b] text-gray-400 text-[10px] rounded-lg hover:border-emerald-500/40 hover:text-emerald-400 transition-colors">
                                        <Download size={10} /> CSV
                                    </button>
                                </div>
                            </div>

                            {/* Filter toolbar */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <div className="relative">
                                    <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search name / alliance / ID..."
                                        className="pl-6 pr-3 py-1.5 bg-[#0d1117] border border-[#1e222b] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 w-48"
                                    />
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                    <button onClick={() => setFilterArchetype('ALL')}
                                        className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors ${filterArchetype === 'ALL' ? 'bg-white/10 border-white/20 text-white' : 'border-[#1e222b] text-gray-500 hover:text-gray-300'}`}>
                                        All
                                    </button>
                                    {Object.entries(ARCHETYPE_META).map(([k, v]) => (
                                        <button key={k} onClick={() => setFilterArchetype(k)}
                                            className="px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors"
                                            style={filterArchetype === k
                                                ? { backgroundColor: `${v.color}20`, borderColor: `${v.color}50`, color: v.color }
                                                : { borderColor: '#1e222b', color: '#6b7280' }}>
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Candidate grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                {filteredCandidates.map((player, i) => (
                                    <PlayerCard key={`${player.id}-${player.kingdomId}`} player={player} rank={i + 1} />
                                ))}
                                {filteredCandidates.length === 0 && (
                                    <div className="col-span-3 text-center py-12 text-gray-600 text-sm">No candidates match the current filters.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
