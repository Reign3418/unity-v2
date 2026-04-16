'use client';

import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
    Search, Target, Crosshair, RefreshCw, Download,
    Users, Shield, Swords, Sprout, TrendingUp, TrendingDown,
    ChevronDown, ChevronUp, Zap, Star
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ARCHETYPE_META = {
    HERO:    { label: 'Hero',    color: '#22c55e', icon: Star,    desc: 'Elite fighters — max KP output relative to power' },
    WARRIOR: { label: 'Warrior', color: '#eab308', icon: Swords,  desc: 'Active combat players with consistent kill output' },
    FEEDER:  { label: 'Feeder',  color: '#8b5cf6', icon: Shield,  desc: 'Troop-heavy — high army composition, moderate kills' },
    FARMER:  { label: 'Farmer',  color: '#06b6d4', icon: Sprout,  desc: 'Builder profile — tech/infrastructure focused' },
    SLACKER: { label: 'Slacker', color: '#6b7280', icon: Users,   desc: 'Low activity — minimal combat or growth signals' },
};

const VECTOR_LABELS = [
    'Power Growth', 'KP Output', 'Combat Density',
    'T5 Eligibility', 'Activity Signal', 'Troop Ratio',
    'Infra Ratio', 'Cmdr Depth'
];

function abbrNum(n) {
    if (!n) return '0';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toString();
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
            {/* Rank badge */}
            <span className="absolute top-2 right-2 text-[9px] font-black text-gray-600 font-mono">#{rank}</span>

            {/* Header row */}
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}40` }}>
                    <Icon size={13} style={{ color: meta.color }} />
                </div>
                <div className="min-w-0">
                    <p className="text-white text-xs font-bold truncate">{player.name}</p>
                    <p className="text-gray-500 text-[9px] font-mono">[{player.alliance}] · KD {player.kingdomId}</p>
                </div>
            </div>

            {/* Similarity bar */}
            <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] uppercase tracking-widest text-gray-500">Match Score</span>
                    <span className="text-xs font-black font-mono" style={{ color: simColor }}>{simPct}%</span>
                </div>
                <div className="h-1 bg-[#1e222b] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${simPct}%`, backgroundColor: simColor }} />
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-1">
                {[
                    { label: 'Power', val: abbrNum(player.power) },
                    { label: 'KP Δ', val: (player.kpDelta >= 0 ? '+' : '') + abbrNum(player.kpDelta) },
                    { label: 'Pwr Δ', val: (player.powerDelta >= 0 ? '+' : '') + abbrNum(player.powerDelta) },
                ].map(s => (
                    <div key={s.label} className="bg-[#131920] rounded-lg p-1.5 text-center">
                        <p className="text-[8px] text-gray-600 uppercase tracking-wider">{s.label}</p>
                        <p className="text-[10px] font-bold text-gray-300 font-mono">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Archetype badge */}
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

function GapRadar({ idealVector, sourcePoolCentroid }) {
    if (!idealVector || !sourcePoolCentroid) return null;

    const option = {
        backgroundColor: 'transparent',
        legend: {
            show: true,
            bottom: 5,
            textStyle: { color: '#6b7280', fontFamily: 'monospace', fontSize: 9 },
        },
        radar: {
            indicator: VECTOR_LABELS.map(name => ({ name, max: 1 })),
            center: ['50%', '50%'],
            radius: '68%',
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
        <ReactECharts
            option={option}
            style={{ width: '100%', height: '260px' }}
            opts={{ renderer: 'canvas' }}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function RecruitingCenter({ session }) {
    // ── State ────────────────────────────────────────────────────────────────
    const [sourceInput,   setSourceInput]   = useState('');
    const [targetInput,   setTargetInput]   = useState('');
    const [sourceKDs,     setSourceKDs]     = useState([]);
    const [targetKDs,     setTargetKDs]     = useState([]);
    const [dkpThreshold,  setDkpThreshold]  = useState(30);
    const [windowDays,    setWindowDays]    = useState(7);
    const [minPower,      setMinPower]      = useState(0);
    const [filterArchetype, setFilterArchetype] = useState('ALL');
    const [searchQuery,   setSearchQuery]   = useState('');
    const [sortBy,        setSortBy]        = useState('similarity');
    const [isLoading,     setIsLoading]     = useState(false);
    const [results,       setResults]       = useState(null);
    const [error,         setError]         = useState(null);

    // ── Kingdom pill helpers ──────────────────────────────────────────────
    const addKD = (val, list, setList, setInput) => {
        const ids = val.trim().split(/[\s,]+/).filter(Boolean);
        for (const id of ids) {
            if (id && !list.includes(id)) setList(prev => [...prev, id]);
        }
        setInput('');
    };

    const removeKD = (id, setList) => setList(prev => prev.filter(k => k !== id));

    // ── Run analysis ──────────────────────────────────────────────────────
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

    // ── Filtered + sorted candidates ──────────────────────────────────────
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

    // ── Export CSV ────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#090b0e] text-white p-4 md:p-6">

            {/* ── Page Header ────────────────────────────────────────────── */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <Target size={16} className="text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-black uppercase tracking-widest text-white">Recruiting Center</h1>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Vector Intelligence</span>
                </div>
                <p className="text-gray-500 text-xs ml-11">Find diamonds in the rough — identify players from target kingdoms who match your top performers' behavioral fingerprint.</p>
            </div>

            {/* ── 3-Column Layout ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_260px_1fr] gap-4">

                {/* ── PANEL 1: Source + Target Pool ────────────────────── */}
                <div className="space-y-4">
                    <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-2">
                            <Shield size={11} /> Source Pool <span className="text-gray-600">(your kingdoms)</span>
                        </h2>
                        <p className="text-[10px] text-gray-500 mb-2">These kingdoms define the "ideal" player profile. Top {dkpThreshold}% by power becomes the recruitment target vector.</p>
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

                {/* ── PANEL 2: Target Profile Config ───────────────────── */}
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
                            <p className="text-[9px] text-gray-600 mt-1">Top {dkpThreshold}% of your source kingdoms by power defines the "ideal" player vector</p>
                        </div>

                        {/* Window */}
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
                        </div>

                        {/* Min Power */}
                        <div className="mb-2">
                            <label className="text-[9px] uppercase tracking-widest text-gray-500 block mb-1">Min Power Floor</label>
                            <div className="grid grid-cols-2 gap-1">
                                {[0, 50, 100, 200].map(m => (
                                    <button key={m} onClick={() => setMinPower(m * 1_000_000)}
                                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border ${minPower === m * 1_000_000 ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'border-[#1e222b] text-gray-500 hover:text-gray-300'}`}>
                                        {m === 0 ? 'Any' : `${m}M+`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Gap Radar */}
                    {results && (
                        <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-4">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Gap Radar</h2>
                            <GapRadar idealVector={results.idealVector} sourcePoolCentroid={results.sourcePoolCentroid} />
                            <div className="flex gap-2 mt-1 justify-center">
                                <span className="flex items-center gap-1 text-[9px] text-violet-400"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Target Profile</span>
                                <span className="flex items-center gap-1 text-[9px] text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Current Pool</span>
                            </div>
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

                {/* ── PANEL 3: Results ──────────────────────────────────── */}
                <div>
                    {!results && !isLoading && (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-[#1e222b] rounded-xl text-gray-600">
                            <Target size={32} className="mb-3 opacity-30" />
                            <p className="text-sm font-bold uppercase tracking-widest">Awaiting Mission Parameters</p>
                            <p className="text-xs mt-1">Configure source + target kingdoms, then run analysis.</p>
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
                                        Ideal vector derived from top {results.eliteBaselineSize} players in source kingdoms
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Sort */}
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
                                            className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors`}
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
