"use client";
import { useState } from "react";
import { Target, RefreshCw, Search, TrendingUp, Zap, AlertTriangle, Users } from "lucide-react";

export default function RecruitmentHitList() {
    const [kd, setKd] = useState("3418");
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async () => {
        if (!kd.trim()) return;
        setLoading(true); setError(null); setData(null);
        try {
            const res = await fetch(`/api/lab/recruitment-hitlist?kd=${kd}&days=${days}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to load recruitment targets");
            setData(json);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#06080a] p-6 text-white font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <Target size={22} className="text-amber-400"/>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Recruitment Hit List</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
                        Officer Intelligence
                    </span>
                </div>
                <p className="text-gray-400 text-sm mb-6">
                    Track high-performing governors who previously departed your kingdom and are now accelerating in power elsewhere.
                </p>

                <div className="flex gap-3 mb-8 flex-wrap items-center">
                    <input 
                        value={kd} 
                        onChange={e => setKd(e.target.value)} 
                        onKeyDown={e => e.key === "Enter" && run()} 
                        placeholder="Source Kingdom ID" 
                        className="bg-[#0f1115] border border-[#1e222b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 w-52 font-mono"
                    />
                    {[7, 14, 30, 60].map(d => (
                        <button 
                            key={d} 
                            onClick={() => setDays(d)} 
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                                days === d 
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300" 
                                    : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                    <button 
                        onClick={run} 
                        disabled={loading || !kd} 
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black rounded-xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer"
                    >
                        {loading ? <RefreshCw size={14} className="animate-spin text-black"/> : <Search size={14} className="text-black"/>} 
                        <span>Generate Hit List</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm mb-6 flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {data && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">Total Departed</div>
                                <div className="text-4xl font-black text-amber-400 font-mono">{data.totalMigrantsOut}</div>
                                <div className="text-gray-500 text-xs mt-1 font-mono">migrated out of #{data.kingdomId}</div>
                            </div>
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">Active Targets</div>
                                <div className="text-4xl font-black text-emerald-400 font-mono">{data.activeTargets}</div>
                                <div className="text-gray-500 text-xs mt-1 font-mono">growing rapidly elsewhere</div>
                            </div>
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1 font-mono">Top Growth Velocity</div>
                                <div className="text-3xl font-black text-white font-mono">
                                    {data.hits[0] ? `+${(data.hits[0].powerGrowthSinceDeparture / 1e6).toFixed(1)}M` : "-"}
                                </div>
                                <div className="text-gray-500 text-xs mt-1 font-mono">peak growth target</div>
                            </div>
                        </div>

                        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-amber-400"/>
                                    <h3 className="text-gray-300 text-xs font-bold uppercase tracking-wider font-mono">
                                        Ranked Recruitment Targets
                                    </h3>
                                </div>
                                <span className="text-xs text-gray-500 font-mono">{data.hits.length} targets identified</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[#1e222b] text-gray-500 text-xs uppercase font-mono">
                                            <th className="px-5 py-3 text-left">#</th>
                                            <th className="px-5 py-3 text-left">Governor</th>
                                            <th className="px-5 py-3 text-right">Power at Departure</th>
                                            <th className="px-5 py-3 text-right">Growth Since</th>
                                            <th className="px-5 py-3 text-right">KP Δ</th>
                                            <th className="px-5 py-3 text-right">Priority</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1e222b]">
                                        {data.hits.map((p, i) => {
                                            const priority = i < 5 ? "🔴 HIGH" : i < 15 ? "🟡 MED" : "🟢 LOW";
                                            const priorityColor = i < 5 ? "text-rose-400" : i < 15 ? "text-yellow-400" : "text-emerald-400";
                                            return (
                                                <tr key={p.id} className="hover:bg-[#0f1115] transition-colors">
                                                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{i + 1}</td>
                                                    <td className="px-5 py-3">
                                                        <div className="text-white font-bold">{p.name}</div>
                                                        <div className="text-gray-500 text-xs font-mono">{p.id}</div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-gray-400 font-mono">{(p.powerAtDeparture / 1e6).toFixed(1)}M</td>
                                                    <td className="px-5 py-3 text-right text-emerald-400 font-bold font-mono">+{(p.powerGrowthSinceDeparture / 1e6).toFixed(1)}M</td>
                                                    <td className="px-5 py-3 text-right text-amber-400 font-mono">{(p.killPointsDelta / 1e6).toFixed(1)}M</td>
                                                    <td className={`px-5 py-3 text-right text-xs font-black font-mono ${priorityColor}`}>{priority}</td>
                                                </tr>
                                            );
                                        })}
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
