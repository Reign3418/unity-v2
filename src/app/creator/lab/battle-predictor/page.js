"use client";
import { useState } from "react";
import { Swords, RefreshCw, Shield, Zap, TrendingUp } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

const FMT = (v, fmt) => {
    if (v === null || v === undefined) return "—";
    if (fmt === "pct") return `${v}%`;
    if (fmt === "score") return `${v}/100`;
    if (fmt === "count") return v.toLocaleString();
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
    return v?.toLocaleString?.() || v;
};

export default function BattlePredictor() {
    const [kd1, setKd1] = useState("");
    const [kd2, setKd2] = useState("");
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async () => {
        if (!kd1.trim() || !kd2.trim()) return;
        setLoading(true); setError(null); setData(null);
        try {
            const res = await fetch(`/api/lab/battle-predictor?kd1=${kd1}&kd2=${kd2}&days=${days}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setData(json);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const radarData = data ? [
        { metric: "Combat Score",    kd1: data.kd1Stats.combatScore,       kd2: data.kd2Stats.combatScore },
        { metric: "Fight Rate",      kd1: data.kd1Stats.lifetimeFightRate,  kd2: data.kd2Stats.lifetimeFightRate },
        { metric: "Activity",        kd1: data.kd1Stats.activityRate,       kd2: data.kd2Stats.activityRate },
        { metric: "T5 Eligible %",   kd1: data.kd1Stats.t5EligiblePct,      kd2: data.kd2Stats.t5EligiblePct },
        { metric: "Leadership",      kd1: data.kd1Stats.stabilityScore,     kd2: data.kd2Stats.stabilityScore },
        { metric: "Ldr Activity",    kd1: data.kd1Stats.leadershipActivityRate, kd2: data.kd2Stats.leadershipActivityRate },
    ] : [];

    return (
        <div className="min-h-screen bg-[#06080a] p-6 text-white font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl"><Swords size={22} className="text-rose-400"/></div>
                    <h1 className="text-2xl font-black tracking-tight">Battle Predictor</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 rounded">Lab</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Head-to-head combat strength comparison with AI odds assessment and per-metric winner breakdown.</p>

                <div className="flex gap-3 mb-8 flex-wrap">
                    <input value={kd1} onChange={e => setKd1(e.target.value)} placeholder="Kingdom 1 ID" className="bg-[#0f1115] border border-[#1e222b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50 w-44"/>
                    <span className="text-gray-600 flex items-center font-black text-xl">vs</span>
                    <input value={kd2} onChange={e => setKd2(e.target.value)} placeholder="Kingdom 2 ID" className="bg-[#0f1115] border border-[#1e222b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50 w-44"/>
                    {[7, 14, 30, 60].map(d => (
                        <button key={d} onClick={() => setDays(d)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${days === d ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"}`}>{d}d</button>
                    ))}
                    <button onClick={run} disabled={loading || !kd1 || !kd2} className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white rounded-xl text-sm font-black flex items-center gap-2 transition-all">
                        {loading ? <RefreshCw size={14} className="animate-spin"/> : <Swords size={14}/>} Predict
                    </button>
                </div>

                {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm mb-6">{error}</div>}

                {data && (
                    <>
                        {/* Score Banner */}
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 mb-6 flex items-center justify-between">
                            <div className="text-center flex-1">
                                <div className={`text-6xl font-black ${data.winner === data.kd1 ? "text-rose-400" : "text-gray-500"}`}>{data.kd1Stats.combatScore}</div>
                                <div className="text-gray-400 font-bold">KD {data.kd1}</div>
                                <div className="text-gray-600 text-xs mt-1">{data.kd1Stats.totalRoster} members · {data.kd1Stats.t5EligibleCount} T5-eligible</div>
                                {data.winner === data.kd1 && <div className="text-xs text-rose-400 font-bold mt-1">⚔️ WINNER</div>}
                            </div>
                            <div className="text-center px-8">
                                <div className="text-gray-600 text-2xl font-black">VS</div>
                                <div className="text-gray-600 text-xs mt-1">Margin: {data.margin} pts</div>
                            </div>
                            <div className="text-center flex-1">
                                <div className={`text-6xl font-black ${data.winner === data.kd2 ? "text-cyan-400" : "text-gray-500"}`}>{data.kd2Stats.combatScore}</div>
                                <div className="text-gray-400 font-bold">KD {data.kd2}</div>
                                <div className="text-gray-600 text-xs mt-1">{data.kd2Stats.totalRoster} members · {data.kd2Stats.t5EligibleCount} T5-eligible</div>
                                {data.winner === data.kd2 && <div className="text-xs text-cyan-400 font-bold mt-1">⚔️ WINNER</div>}
                            </div>
                        </div>

                        {/* AI Verdict */}
                        {data.verdict && (
                            <div className="bg-gradient-to-r from-rose-500/5 to-cyan-500/5 border border-rose-500/20 rounded-2xl p-5 mb-6 flex items-start gap-3">
                                <Zap size={18} className="text-yellow-400 shrink-0 mt-0.5"/>
                                <div>
                                    <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">AI Battle Assessment</div>
                                    <p className="text-gray-300 text-sm leading-relaxed">{data.verdict}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Radar */}
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Combat Radar</h3>
                                <ResponsiveContainer width="100%" height={260}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="#1e222b"/>
                                        <PolarAngleAxis dataKey="metric" tick={{ fill: "#6b7280", fontSize: 11 }}/>
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false}/>
                                        <Radar name={`KD ${data.kd1}`} dataKey="kd1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} strokeWidth={2}/>
                                        <Radar name={`KD ${data.kd2}`} dataKey="kd2" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2}/>
                                    </RadarChart>
                                </ResponsiveContainer>
                                <div className="flex items-center justify-center gap-6 mt-2">
                                    <span className="flex items-center gap-1.5 text-xs text-rose-400"><span className="w-3 h-0.5 bg-rose-400 inline-block rounded"/>KD {data.kd1}</span>
                                    <span className="flex items-center gap-1.5 text-xs text-cyan-400"><span className="w-3 h-0.5 bg-cyan-400 inline-block rounded"/>KD {data.kd2}</span>
                                </div>
                            </div>

                            {/* Metric Breakdown */}
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Per-Metric Breakdown</h3>
                                <div className="space-y-3">
                                    {data.metricResults.map(m => {
                                        const isTie = m.winner === "TIE";
                                        const totalVal = (m.kd1Value || 0) + (m.kd2Value || 0);
                                        const kd1Pct = totalVal > 0 ? (m.kd1Value / totalVal) * 100 : 50;
                                        return (
                                            <div key={m.key}>
                                                <div className="flex items-baseline gap-1 mb-1">
                                                    <span className="text-xs text-gray-400 flex-1">{m.label}</span>
                                                    {m.note && <span className="text-[9px] text-gray-600 italic">{m.note}</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`text-xs font-mono w-20 text-right ${m.winner === data.kd1 ? "text-rose-400 font-bold" : "text-gray-500"}`}>{FMT(m.kd1Value, m.format)}</div>
                                                    <div className="flex-1 h-1.5 bg-[#1e222b] rounded-full overflow-hidden">
                                                        <div className="h-full flex">
                                                            <div className="bg-rose-500/60 rounded-l transition-all" style={{ width: `${kd1Pct}%` }}/>
                                                            <div className="bg-cyan-500/60 rounded-r flex-1"/>
                                                        </div>
                                                    </div>
                                                    <div className={`text-xs font-mono w-20 ${m.winner === data.kd2 ? "text-cyan-400 font-bold" : "text-gray-500"}`}>{FMT(m.kd2Value, m.format)}</div>
                                                    <div className="text-[10px] w-14 text-center font-bold">
                                                        {isTie
                                                            ? <span className="text-gray-600">—</span>
                                                            : <span className={m.winner === data.kd1 ? "text-rose-400" : "text-cyan-400"}>KD {m.winner}</span>
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Scoring methodology note */}
                        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 text-xs text-gray-600 leading-relaxed">
                            <span className="text-gray-500 font-bold">Scoring methodology: </span>
                            Activity 30% · Lifetime Fight Rate 25% · Troop Density 20% · T5 Eligibility 15% · Leadership 10% ·
                            Kill Points use all-time totals (not windowed deltas) to avoid false zeroes during non-KvK periods ·
                            T5 Eligibility = % of top-300 with &gt;40M power
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
