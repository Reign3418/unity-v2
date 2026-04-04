"use client";
import { useState } from "react";
import { Swords, RefreshCw, Zap, Plus, X } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

// Per-kingdom color palette
const KD_COLORS = ["#f43f5e", "#06b6d4", "#f59e0b", "#8b5cf6"];
const KD_LABELS = ["#f43f5e", "#06b6d4", "#f59e0b", "#8b5cf6"];
const PLACE_LABELS = ["🥇 1st", "🥈 2nd", "🥉 3rd", "4th"];

const FMT = (v, fmt) => {
    if (v === null || v === undefined) return "—";
    if (fmt === "pct") return `${v}%`;
    if (fmt === "score") return `${v}/100`;
    if (fmt === "count") return v.toLocaleString();
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    return v?.toLocaleString?.() ?? String(v);
};

const TOP_OPTIONS = [300, 400, 650, 1000];

export default function BattlePredictor() {
    const [kingdoms, setKingdoms] = useState(["", ""]);
    const [topN, setTopN] = useState(300);
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const addKingdom = () => {
        if (kingdoms.length < 4) setKingdoms(prev => [...prev, ""]);
    };
    const removeKingdom = (idx) => {
        setKingdoms(prev => prev.filter((_, i) => i !== idx));
        setData(null);
    };
    const setKd = (idx, val) => setKingdoms(prev => prev.map((k, i) => i === idx ? val : k));

    const run = async () => {
        const filled = kingdoms.filter(k => k.trim());
        if (filled.length < 2) return;
        setLoading(true); setError(null); setData(null);
        try {
            const params = new URLSearchParams({ days, top: topN });
            filled.forEach((kd, i) => params.set(`kd${i + 1}`, kd.trim()));
            const res = await fetch(`/api/lab/battle-predictor?${params}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setData(json);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    // Build radar data from API response (kingdoms ranked 1st place first)
    const radarData = data ? [
        { metric: "Combat Score",    ...Object.fromEntries(data.kingdoms.map(k => [k.kdId, k.stats.combatScore])) },
        { metric: "Fight Rate",      ...Object.fromEntries(data.kingdoms.map(k => [k.kdId, k.stats.lifetimeFightRate])) },
        { metric: "Activity",        ...Object.fromEntries(data.kingdoms.map(k => [k.kdId, k.stats.activityRate])) },
        { metric: "T5 Eligible %",   ...Object.fromEntries(data.kingdoms.map(k => [k.kdId, k.stats.t5EligiblePct])) },
        { metric: "Leadership",      ...Object.fromEntries(data.kingdoms.map(k => [k.kdId, k.stats.stabilityScore])) },
        { metric: "Ldr Activity",    ...Object.fromEntries(data.kingdoms.map(k => [k.kdId, k.stats.leadershipActivityRate])) },
    ] : [];

    // Map kdId → original color index (based on input order stored in kingdoms state)
    const colorMap = (kdId) => {
        if (!data) return KD_COLORS[0];
        const idx = data.kingdoms.findIndex(k => k.kdId === kdId);
        return KD_COLORS[idx] || KD_COLORS[0];
    };

    return (
        <div className="min-h-screen bg-[#06080a] p-6 text-white font-sans">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl"><Swords size={22} className="text-rose-400"/></div>
                    <h1 className="text-2xl font-black tracking-tight">Battle Predictor</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 rounded">Lab</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Compare up to 4 kingdoms head-to-head. Filter by roster depth to cut low-power account noise.</p>

                {/* Kingdom Inputs */}
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Kingdoms</span>
                        {kingdoms.length < 4 && (
                            <button onClick={addKingdom} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                                <Plus size={13}/> Add Kingdom
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {kingdoms.map((kd, i) => (
                            <div key={i} className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ background: KD_COLORS[i] }}/>
                                <input
                                    value={kd}
                                    onChange={e => setKd(i, e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && run()}
                                    placeholder={i < 2 ? `Kingdom ${i + 1}` : `Optional KD ${i + 1}`}
                                    className="w-full bg-[#13161c] border border-[#1e222b] rounded-xl pl-7 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/40 transition-colors font-mono"
                                />
                                {i >= 2 && (
                                    <button onClick={() => removeKingdom(i)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-rose-400 transition-colors">
                                        <X size={13}/>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex gap-3 mb-6 flex-wrap items-center">
                    <div className="flex items-center gap-1.5 mr-2">
                        <span className="text-gray-600 text-xs uppercase tracking-wider font-bold">Top</span>
                        {TOP_OPTIONS.map(n => (
                            <button key={n} onClick={() => setTopN(n)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${topN === n ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                    <div className="w-px h-8 bg-[#1e222b]"/>
                    <div className="flex items-center gap-1.5">
                        <span className="text-gray-600 text-xs uppercase tracking-wider font-bold">Window</span>
                        {[7, 14, 30, 60].map(d => (
                            <button key={d} onClick={() => setDays(d)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${days === d ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"}`}>
                                {d}d
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={run}
                        disabled={loading || kingdoms.filter(k => k.trim()).length < 2}
                        className="ml-auto px-6 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white rounded-xl text-sm font-black flex items-center gap-2 transition-all"
                    >
                        {loading ? <RefreshCw size={14} className="animate-spin"/> : <Swords size={14}/>} Predict
                    </button>
                </div>

                {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm mb-6">{error}</div>}

                {data && (
                    <>
                        {/* Rankings Banner */}
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 mb-6">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-4 font-bold">
                                Ranked by Combat Score — Top {data.topN} reviewed
                            </div>
                            <div className={`grid gap-4 ${data.kingdoms.length === 2 ? "grid-cols-2" : data.kingdoms.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
                                {data.kingdoms.map((kd, i) => {
                                    const color = KD_COLORS[i];
                                    return (
                                        <div key={kd.kdId} className="text-center relative">
                                            {i === 0 && <div className="absolute inset-0 rounded-2xl ring-1 pointer-events-none" style={{ boxShadow: `0 0 20px ${color}30`, borderColor: `${color}30` }}/>}
                                            <div className="text-xs font-bold mb-1" style={{ color }}>{PLACE_LABELS[i]}</div>
                                            <div className="text-5xl font-black mb-1" style={{ color: i === 0 ? color : "#6b7280" }}>{kd.stats.combatScore}</div>
                                            <div className="font-bold text-gray-300">KD {kd.kdId}</div>
                                            <div className="text-gray-600 text-xs mt-1">
                                                {kd.stats.t5EligibleCount} T5-eligible · {kd.stats.totalScoredRoster} scored
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* AI Verdict — per-kingdom cards */}
                        {(data.verdictSections || data.verdict) && (() => {
                            const sections = data.verdictSections;
                            const kdSections = sections?.filter(s => s.kdId !== "VERDICT") || [];
                            const finalVerdict = sections?.find(s => s.kdId === "VERDICT");

                            return (
                                <div className="mb-6 space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center gap-2">
                                        <Zap size={15} className="text-yellow-400"/>
                                        <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">AI Battle Assessment</span>
                                    </div>

                                    {/* Per-kingdom cards (parsed) */}
                                    {kdSections.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {kdSections.map((section) => {
                                                const kdObj = data.kingdoms.find(k => k.kdId === section.kdId);
                                                const rank = data.kingdoms.indexOf(kdObj);
                                                const color = KD_COLORS[rank] || KD_COLORS[0];
                                                const placeLabel = PLACE_LABELS[rank] || `#${rank + 1}`;
                                                return (
                                                    <div key={section.kdId} className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5 relative overflow-hidden">
                                                        {/* Color accent bar */}
                                                        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: color }}/>
                                                        {/* Kingdom header */}
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }}/>
                                                            <span className="font-black text-sm" style={{ color }}>KD {section.kdId}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ml-auto" style={{ color, borderColor: `${color}40`, background: `${color}10` }}>
                                                                {placeLabel}
                                                            </span>
                                                        </div>
                                                        {/* Assessment text */}
                                                        <p className="text-gray-300 text-sm leading-relaxed">{section.text}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Fallback: raw text if parsing failed */
                                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{data.verdict}</p>
                                        </div>
                                    )}

                                    {/* Final verdict bar */}
                                    {finalVerdict && (
                                        <div className="bg-gradient-to-r from-yellow-500/5 to-rose-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3">
                                            <Zap size={15} className="text-yellow-400 shrink-0 mt-0.5"/>
                                            <p className="text-yellow-300 text-sm font-bold leading-relaxed">{finalVerdict.text}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Radar */}
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Combat Radar</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="#1e222b"/>
                                        <PolarAngleAxis dataKey="metric" tick={{ fill: "#6b7280", fontSize: 11 }}/>
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false}/>
                                        {data.kingdoms.map((kd, i) => (
                                            <Radar
                                                key={kd.kdId}
                                                name={`KD ${kd.kdId}`}
                                                dataKey={kd.kdId}
                                                stroke={KD_COLORS[i]}
                                                fill={KD_COLORS[i]}
                                                fillOpacity={0.10}
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </RadarChart>
                                </ResponsiveContainer>
                                <div className="flex items-center justify-center gap-5 mt-2 flex-wrap">
                                    {data.kingdoms.map((kd, i) => (
                                        <span key={kd.kdId} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: KD_COLORS[i] }}>
                                            <span className="w-3 h-0.5 inline-block rounded" style={{ background: KD_COLORS[i] }}/>
                                            KD {kd.kdId}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Per-Metric Breakdown — multi-column */}
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Per-Metric Breakdown</h3>
                                <div className="space-y-3">
                                    {data.metricResults.map(m => {
                                        const maxVal = Math.max(...m.values.map(v => v.value));
                                        return (
                                            <div key={m.key}>
                                                <div className="flex items-baseline gap-2 mb-1.5">
                                                    <span className="text-xs text-gray-400 flex-1">{m.label}</span>
                                                    {m.note && <span className="text-[9px] text-gray-600 italic">{m.note}</span>}
                                                </div>
                                                <div className="flex gap-2">
                                                    {m.values.map((v, i) => {
                                                        const isWinner = v.value === maxVal && maxVal > 0;
                                                        const color = KD_COLORS[data.kingdoms.findIndex(k => k.kdId === v.kdId)];
                                                        const barPct = maxVal > 0 ? (v.value / maxVal) * 100 : 0;
                                                        return (
                                                            <div key={v.kdId} className="flex-1">
                                                                <div className="h-1.5 bg-[#1e222b] rounded-full mb-1 overflow-hidden">
                                                                    <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: color, opacity: isWinner ? 1 : 0.4 }}/>
                                                                </div>
                                                                <div className={`text-[10px] font-mono text-center ${isWinner ? "font-bold" : "text-gray-600"}`} style={{ color: isWinner ? color : undefined }}>
                                                                    {FMT(v.value, m.format)}
                                                                </div>
                                                                <div className="text-[9px] text-gray-700 text-center font-mono">KD {v.kdId}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Methodology */}
                        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 text-xs text-gray-600 leading-relaxed">
                            <span className="text-gray-500 font-bold">Scoring: </span>
                            Activity 30% · Lifetime Fight Rate 25% · Troop Density 20% · T5 Eligibility 15% · Leadership 10% ·
                            KP uses all-time career totals (not windowed deltas) ·
                            T5 Eligible = roster members with &gt;40M power ·
                            Only the top {data.topN} players by power are included in scoring
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
