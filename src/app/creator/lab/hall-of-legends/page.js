"use client";
import { useState } from "react";
import { Trophy, RefreshCw, TrendingUp, Sword, Skull } from "lucide-react";

const METRICS = [
    { key: "powerDelta", label: "Power Growth", icon: TrendingUp, color: "text-cyan-400" },
    { key: "killPointsDelta", label: "Kill Points", icon: Sword, color: "text-rose-400" },
    { key: "deadsDelta", label: "Troops Lost", icon: Skull, color: "text-orange-400" },
];

const MEDAL = ["🥇", "🥈", "🥉"];

export default function HallOfLegends() {
    const [metric, setMetric] = useState("powerDelta");
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async () => {
        setLoading(true); setError(null); setData(null);
        try {
            const res = await fetch(`/api/lab/hall-of-legends?metric=${metric}&days=${days}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setData(json);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const activeMetric = METRICS.find(m => m.key === metric);

    return (
        <div className="min-h-screen bg-[#06080a] p-6 text-white font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"><Trophy size={22} className="text-yellow-400"/></div>
                    <h1 className="text-2xl font-black tracking-tight">Hall of Legends</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 rounded">Lab</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">The greatest governors across every tracked kingdom — ranked by any metric.</p>

                <div className="flex gap-3 mb-8 flex-wrap">
                    {METRICS.map(m => (
                        <button key={m.key} onClick={() => setMetric(m.key)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${metric === m.key ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"}`}>
                            <m.icon size={13}/> {m.label}
                        </button>
                    ))}
                    <div className="w-px h-9 bg-[#1e222b]"/>
                    {[7, 14, 30, 60].map(d => (
                        <button key={d} onClick={() => setDays(d)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${days === d ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"}`}>{d}d</button>
                    ))}
                    <button onClick={run} disabled={loading} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-black rounded-xl text-sm font-black flex items-center gap-2 transition-all">
                        {loading ? <RefreshCw size={14} className="animate-spin"/> : <Trophy size={14}/>} Build Leaderboard
                    </button>
                </div>

                {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm mb-6">{error}</div>}

                {data && (
                    <>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Governors Ranked</div>
                                <div className="text-3xl font-black text-yellow-400">{data.totalGovernors.toLocaleString()}</div>
                            </div>
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Kingdoms Scanned</div>
                                <div className="text-3xl font-black text-white">{data.kingdomsScanned}</div>
                            </div>
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Top Legend</div>
                                <div className="text-xl font-black truncate text-white">{data.legends[0]?.name || "-"}</div>
                                <div className="text-gray-500 text-xs">KD {data.legends[0]?.kingdomId}</div>
                            </div>
                        </div>

                        {/* Top 3 Podium */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {data.legends.slice(0, 3).map((p, i) => (
                                <div key={p.id} className={`rounded-2xl border p-6 text-center ${i === 0 ? "bg-yellow-500/5 border-yellow-500/30" : i === 1 ? "bg-gray-400/5 border-gray-500/20" : "bg-amber-700/5 border-amber-700/20"}`}>
                                    <div className="text-4xl mb-2">{MEDAL[i]}</div>
                                    <div className="text-white font-black text-lg">{p.name}</div>
                                    <div className="text-gray-500 text-xs font-mono mb-2">KD {p.kingdomId}</div>
                                    <div className={`text-2xl font-black ${activeMetric?.color}`}>
                                        {metric === "powerDelta" ? `+${(p.metricValue / 1e6).toFixed(0)}M` : p.metricValue.toLocaleString()}
                                    </div>
                                    <div className="text-gray-600 text-xs">{activeMetric?.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Full Table */}
                        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1e222b]"><h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Full Rankings — Top {data.legends.length}</h3></div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-[#1e222b] text-gray-600 text-xs uppercase">
                                    <th className="px-5 py-3 text-left">Rank</th>
                                    <th className="px-5 py-3 text-left">Governor</th>
                                    <th className="px-5 py-3 text-right">Kingdom</th>
                                    <th className="px-5 py-3 text-right">Power</th>
                                    <th className="px-5 py-3 text-right">{activeMetric?.label}</th>
                                </tr></thead>
                                <tbody className="divide-y divide-[#1e222b]">
                                    {data.legends.map((p, i) => (
                                        <tr key={p.id} className="hover:bg-[#0f1115] transition-colors">
                                            <td className="px-5 py-3 font-mono text-gray-500 text-xs">{i < 3 ? MEDAL[i] : `#${i+1}`}</td>
                                            <td className="px-5 py-3"><div className="text-white font-bold">{p.name}</div><div className="text-gray-600 text-xs font-mono">{p.id}</div></td>
                                            <td className="px-5 py-3 text-right text-gray-400 font-mono">KD {p.kingdomId}</td>
                                            <td className="px-5 py-3 text-right text-gray-300 font-mono">{(p.power / 1e9).toFixed(2)}B</td>
                                            <td className={`px-5 py-3 text-right font-mono font-bold ${activeMetric?.color}`}>
                                                {metric === "powerDelta" ? `+${(p.metricValue / 1e6).toFixed(0)}M` : p.metricValue.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
