"use client";
import { useState } from "react";
import { Dna, RefreshCw, Search, Zap } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const ARCHETYPE_META = {
    Researcher:   { color: "#6366f1", emoji: "🔬" },
    Fighter:      { color: "#ef4444", emoji: "⚔️" },
    "Gem Spender":{ color: "#f59e0b", emoji: "💎" },
    Builder:      { color: "#10b981", emoji: "🏗️" },
    Balanced:     { color: "#8b5cf6", emoji: "⚖️" },
};

export default function SpendingSignatureLab() {
    const [kd, setKd] = useState("");
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async () => {
        if (!kd.trim()) return;
        setLoading(true); setError(null); setData(null);
        try {
            const res = await fetch(`/api/lab/spending-signature?kd=${kd}&days=${days}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setData(json);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#06080a] p-6 text-white font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"><Dna size={22} className="text-indigo-400"/></div>
                    <h1 className="text-2xl font-black tracking-tight">Spending Signature Lab</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 rounded">Lab</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Decode a kingdom's army DNA — how each governor spends, classified by dominant growth vector.</p>

                <div className="flex gap-3 mb-8 flex-wrap">
                    <input value={kd} onChange={e => setKd(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="Kingdom ID" className="bg-[#0f1115] border border-[#1e222b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 w-52"/>
                    {[7, 14, 30, 60].map(d => (
                        <button key={d} onClick={() => setDays(d)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${days === d ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"}`}>{d}d</button>
                    ))}
                    <button onClick={run} disabled={loading || !kd} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                        {loading ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>} Analyze DNA
                    </button>
                </div>

                {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm mb-6">{error}</div>}

                {data && (
                    <>
                        {/* DNA Label */}
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 mb-6 flex items-center justify-between">
                            <div>
                                <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">Kingdom DNA</div>
                                <div className="text-3xl font-black text-white">{data.dnaLabel}</div>
                                <div className="text-gray-500 text-sm mt-1">KD {data.kingdomId} · {data.totalActive} active governors · {data.whaleCount} whales detected</div>
                            </div>
                            <Zap size={48} className="text-indigo-400 opacity-30"/>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Pie Chart */}
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Governor Composition</h3>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={data.composition} dataKey="count" nameKey="archetype" cx="50%" cy="50%" outerRadius={90} label={({archetype, pct}) => `${archetype} ${pct}%`} labelLine={false}>
                                            {data.composition.map((entry) => (
                                                <Cell key={entry.archetype} fill={ARCHETYPE_META[entry.archetype]?.color || "#999"}/>
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: "#0f1115", border: "1px solid #1e222b", borderRadius: 8 }}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Composition Bars */}
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Archetype Breakdown</h3>
                                <div className="space-y-4">
                                    {data.composition.map(c => {
                                        const meta = ARCHETYPE_META[c.archetype] || {};
                                        return (
                                            <div key={c.archetype}>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-bold text-gray-300">{meta.emoji} {c.archetype}</span>
                                                    <span className="text-sm font-mono text-gray-400">{c.count} ({c.pct}%)</span>
                                                </div>
                                                <div className="h-2 bg-[#1e222b] rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, background: meta.color }}/>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Top Governors */}
                        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1e222b]"><h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Top Governors by Power Growth</h3></div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-[#1e222b] text-gray-600 text-xs uppercase">
                                    <th className="px-5 py-3 text-left">Governor</th>
                                    <th className="px-5 py-3 text-right">Power Δ</th>
                                    <th className="px-5 py-3 text-right">Tech</th>
                                    <th className="px-5 py-3 text-right">Troop</th>
                                    <th className="px-5 py-3 text-right">Cmdr</th>
                                    <th className="px-5 py-3 text-right">Build</th>
                                    <th className="px-5 py-3 text-right">Class</th>
                                </tr></thead>
                                <tbody className="divide-y divide-[#1e222b]">
                                    {data.governors.slice(0, 30).map(p => {
                                        const meta = ARCHETYPE_META[p.archetype] || {};
                                        return (
                                            <tr key={p.id} className="hover:bg-[#0f1115] transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {p.isWhale && <span title="Whale" className="text-xs">🐋</span>}
                                                        <div>
                                                            <div className="text-white font-bold text-sm">{p.name}</div>
                                                            <div className="text-gray-600 text-xs font-mono">{p.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right text-emerald-400 font-mono font-bold">+{(p.powerDelta / 1e6).toFixed(1)}M</td>
                                                <td className="px-5 py-3 text-right text-indigo-400 font-mono text-xs">{p.techPct}%</td>
                                                <td className="px-5 py-3 text-right text-rose-400 font-mono text-xs">{p.troopPct}%</td>
                                                <td className="px-5 py-3 text-right text-amber-400 font-mono text-xs">{p.cmdrPct}%</td>
                                                <td className="px-5 py-3 text-right text-emerald-400 font-mono text-xs">{p.buildPct}%</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${meta.color}20`, color: meta.color }}>{meta.emoji} {p.archetype}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
