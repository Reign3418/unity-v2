"use client";
import { useState } from "react";
import { Ghost, RefreshCw, AlertTriangle, Search, TrendingDown, Skull, Shield } from "lucide-react";

const GRADE_COLOR = { A: "text-emerald-400", B: "text-cyan-400", C: "text-yellow-400", D: "text-orange-400", F: "text-rose-500" };
const GRADE_BG = { A: "bg-emerald-500/10 border-emerald-500/30", B: "bg-cyan-500/10 border-cyan-500/30", C: "bg-yellow-500/10 border-yellow-500/30", D: "bg-orange-500/10 border-orange-500/30", F: "bg-rose-500/10 border-rose-500/30" };

export default function GhostHunter() {
    const [kd, setKd] = useState("");
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async () => {
        if (!kd.trim()) return;
        setLoading(true); setError(null); setData(null);
        try {
            const res = await fetch(`/api/lab/ghost-hunter?kd=${kd}&days=${days}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setData(json);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const s = data?.summary;

    return (
        <div className="min-h-screen bg-[#06080a] p-6 text-white font-sans">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-xl"><Ghost size={22} className="text-violet-400"/></div>
                    <h1 className="text-2xl font-black tracking-tight">Ghost Hunter</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 rounded">Lab</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Detect inactive governors — zero power &amp; zero KP delta — ranked by the dead weight they carry.</p>

                {/* Controls */}
                <div className="flex gap-3 mb-8 flex-wrap">
                    <input value={kd} onChange={e => setKd(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="Kingdom ID (e.g. 4025)" className="bg-[#0f1115] border border-[#1e222b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 w-52"/>
                    {[7, 14, 30, 60].map(d => (
                        <button key={d} onClick={() => setDays(d)} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${days === d ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"}`}>{d}d</button>
                    ))}
                    <button onClick={run} disabled={loading || !kd} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                        {loading ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>} Scan
                    </button>
                </div>

                {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm mb-6">{error}</div>}

                {s && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className={`rounded-2xl border p-5 ${GRADE_BG[s.grade]}`}>
                                <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Vitality Grade</div>
                                <div className={`text-6xl font-black ${GRADE_COLOR[s.grade]}`}>{s.grade}</div>
                                <div className="text-gray-500 text-xs mt-1">{s.vitalityScore}% active</div>
                            </div>
                            <div className="rounded-2xl border border-[#1e222b] bg-[#0f1115] p-5">
                                <div className="text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Ghost size={10}/>Ghosts</div>
                                <div className="text-4xl font-black text-violet-400">{s.ghostCount.toLocaleString()}</div>
                                <div className="text-gray-500 text-xs mt-1">of {s.total} scanned</div>
                            </div>
                            <div className="rounded-2xl border border-[#1e222b] bg-[#0f1115] p-5">
                                <div className="text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingDown size={10}/>Dead Weight Power</div>
                                <div className="text-3xl font-black text-rose-400">{(s.ghostPower / 1e9).toFixed(1)}B</div>
                                <div className="text-gray-500 text-xs mt-1">{s.ghostPowerPct}% of kingdom power</div>
                            </div>
                            <div className="rounded-2xl border border-[#1e222b] bg-[#0f1115] p-5">
                                <div className="text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={10}/>Active Members</div>
                                <div className="text-4xl font-black text-emerald-400">{s.activeCount.toLocaleString()}</div>
                                <div className="text-gray-500 text-xs mt-1">actually growing</div>
                            </div>
                        </div>

                        {/* Ghost Table */}
                        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1e222b] flex items-center gap-2">
                                <Skull size={14} className="text-violet-400"/>
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Top {data.topGhosts.length} Ghosts — Ranked by Dead Weight Power</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-[#1e222b] text-gray-600 text-xs uppercase">
                                        <th className="px-5 py-3 text-left">Rank</th>
                                        <th className="px-5 py-3 text-left">Governor</th>
                                        <th className="px-5 py-3 text-right">Power</th>
                                        <th className="px-5 py-3 text-right">Power Δ</th>
                                        <th className="px-5 py-3 text-right">KP Δ</th>
                                        <th className="px-5 py-3 text-right">Status</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-[#1e222b]">
                                        {data.topGhosts.map((p, i) => (
                                            <tr key={p.id} className="hover:bg-[#0f1115] transition-colors">
                                                <td className="px-5 py-3 text-gray-600 font-mono text-xs">{i + 1}</td>
                                                <td className="px-5 py-3"><div className="text-white font-bold text-sm">{p.name}</div><div className="text-gray-600 text-xs font-mono">{p.id}</div></td>
                                                <td className="px-5 py-3 text-right text-gray-300 font-mono">{(p.power / 1e6).toFixed(1)}M</td>
                                                <td className="px-5 py-3 text-right text-rose-500 font-mono font-bold">0</td>
                                                <td className="px-5 py-3 text-right text-rose-500 font-mono font-bold">0</td>
                                                <td className="px-5 py-3 text-right"><span className="text-[10px] font-bold bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded">👻 GHOST</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
