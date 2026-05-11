"use client";

import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Shield, Swords, Users, Zap, Map, ArrowUp } from "lucide-react";

export default function KingdomHealthTab({ targetKd, startDate, endDate }) {
    const [depth, setDepth] = useState(300);
    const [healthData, setHealthData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!targetKd || !startDate || !endDate) return;

        const fetchHealthReport = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/aws/health-report?kd=${targetKd}&start=${startDate}&end=${endDate}&depth=${depth}`);
                const data = await res.json();
                
                if (res.ok && data.success) {
                    setHealthData(data);
                } else {
                    setError(data.error || "Failed to fetch health report.");
                    setHealthData(null);
                }
            } catch (e) {
                console.error(e);
                setError("Network error fetching health report.");
                setHealthData(null);
            }
            setIsLoading(false);
        };

        fetchHealthReport();
    }, [targetKd, startDate, endDate, depth]);

    if (!targetKd || !startDate || !endDate) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-[#0d1017] rounded-xl border border-[#1e222b]">
                <Activity className="text-gray-600 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-400">Select Date Range</h3>
                <p className="text-gray-500 mt-2 text-center text-sm max-w-md">
                    Please select a start and end date from the global controls above to generate the Kingdom Health Report.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-cyan-400" />
                        Kingdom Health Report
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Early Game Polygraph Test for KD {targetKd}
                    </p>
                </div>
                
                <div className="flex bg-[#0d1017] border border-[#1e222b] rounded-lg p-1">
                    <button 
                        onClick={() => setDepth(300)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${depth === 300 ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Top 300
                    </button>
                    <button 
                        onClick={() => setDepth(400)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${depth === 400 ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Top 400
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="flex flex-col items-center justify-center p-24 bg-[#0d1017] rounded-xl border border-[#1e222b]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
                    <p className="text-cyan-400 font-mono text-sm animate-pulse">Running AI Polygraph Diagnostics...</p>
                </div>
            )}

            {error && !isLoading && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-start gap-3">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>{error}</div>
                </div>
            )}

            {!isLoading && !error && healthData && (
                <>
                    {/* Executive Summary */}
                    {healthData.ai && (
                        <div className="bg-[#0d1017] rounded-xl border border-[#1e222b] overflow-hidden">
                            <div className="bg-[#15181e] px-5 py-3 border-b border-[#1e222b] flex items-center justify-between">
                                <h3 className="font-bold text-gray-200 flex items-center gap-2">
                                    <Zap size={16} className="text-amber-400" />
                                    J.A.R.V.I.S. Executive Assessment
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-mono px-2 py-1 bg-[#0a0c0f] rounded border border-[#1e222b] text-gray-400">
                                        CIVIL WAR PROB: <span className={parseInt(healthData.ai.civilWarProbability) > 50 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{healthData.ai.civilWarProbability}</span>
                                    </div>
                                    <div className={`text-xl font-black px-3 py-0.5 rounded ${
                                        healthData.ai.grade === 'A' || healthData.ai.grade === 'B' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                        healthData.ai.grade === 'C' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}>
                                        {healthData.ai.grade}
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Diagnosis</h4>
                                    <p className="text-gray-300 text-sm leading-relaxed">{healthData.ai.assessment}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#1e222b]/50">
                                    <div>
                                        <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Stability Index</h4>
                                        <p className="text-gray-400 text-xs">{healthData.ai.stabilityIndex}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Economic Intel</h4>
                                        <p className="text-gray-400 text-xs">{healthData.ai.economicIntel}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-[#0d1017] p-4 rounded-xl border border-[#1e222b] flex flex-col justify-center items-center text-center">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Power Gained</span>
                            <span className={`text-lg font-mono font-bold mt-1 ${healthData.metrics.totalPowerGained >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {healthData.metrics.totalPowerGained > 0 ? '+' : ''}{(healthData.metrics.totalPowerGained / 1000000).toFixed(2)}M
                            </span>
                        </div>
                        <div className="bg-[#0d1017] p-4 rounded-xl border border-[#1e222b] flex flex-col justify-center items-center text-center">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Troop Power</span>
                            <span className={`text-lg font-mono font-bold mt-1 ${healthData.metrics.totalTroopPowerGained >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                                {healthData.metrics.totalTroopPowerGained > 0 ? '+' : ''}{(healthData.metrics.totalTroopPowerGained / 1000000).toFixed(2)}M
                            </span>
                        </div>
                        <div className="bg-[#0d1017] p-4 rounded-xl border border-[#1e222b] flex flex-col justify-center items-center text-center">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Cmdr Power</span>
                            <span className={`text-lg font-mono font-bold mt-1 ${healthData.metrics.totalCmdPowerGained >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {healthData.metrics.totalCmdPowerGained > 0 ? '+' : ''}{(healthData.metrics.totalCmdPowerGained / 1000000).toFixed(2)}M
                            </span>
                        </div>
                        <div className="bg-[#0d1017] p-4 rounded-xl border border-[#1e222b] flex flex-col justify-center items-center text-center">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">KP Gained</span>
                            <span className="text-lg font-mono font-bold mt-1 text-fuchsia-400">
                                +{(healthData.metrics.totalKPGained / 1000000).toFixed(2)}M
                            </span>
                        </div>
                        <div className="bg-[#0d1017] p-4 rounded-xl border border-[#1e222b] flex flex-col justify-center items-center text-center relative overflow-hidden">
                            {healthData.metrics.totalDeadsGained > 0 && <div className="absolute inset-0 bg-rose-500/5" />}
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider relative z-10">Deads</span>
                            <span className={`text-lg font-mono font-bold mt-1 relative z-10 ${healthData.metrics.totalDeadsGained > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                                {healthData.metrics.totalDeadsGained > 0 ? `+${healthData.metrics.totalDeadsGained.toLocaleString()}` : '0'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Top Alliances */}
                        <div className="bg-[#0d1017] rounded-xl border border-[#1e222b] overflow-hidden">
                            <div className="bg-[#15181e] px-4 py-3 border-b border-[#1e222b] flex items-center gap-2">
                                <Shield size={16} className="text-cyan-400" />
                                <h3 className="font-bold text-gray-200 text-sm">Alliance Growth Engines</h3>
                            </div>
                            <div className="divide-y divide-[#1e222b]">
                                {healthData.topAlliances.map((all, idx) => (
                                    <div key={all.tag} className="flex justify-between items-center px-4 py-3 hover:bg-[#15181e]/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="text-gray-600 font-mono text-xs">{idx + 1}</div>
                                            <div>
                                                <div className="text-cyan-400 font-bold text-sm">[{all.tag}]</div>
                                                <div className="text-gray-500 text-[10px] flex items-center gap-1 mt-0.5"><Users size={10}/> {all.govCount} Governors</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono text-xs font-bold ${all.powerDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {all.powerDelta > 0 ? '+' : ''}{(all.powerDelta / 1000000).toFixed(1)}M
                                            </div>
                                            {all.deadsDelta > 0 && (
                                                <div className="text-rose-500 font-mono text-[10px] mt-0.5">+{all.deadsDelta.toLocaleString()} deads</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Migration Trackers & Whales */}
                        <div className="space-y-4">
                            <div className="bg-[#0d1017] rounded-xl border border-[#1e222b] overflow-hidden">
                                <div className="bg-[#15181e] px-4 py-3 border-b border-[#1e222b] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Map size={16} className="text-amber-400" />
                                        <h3 className="font-bold text-gray-200 text-sm">Alliance Switchers</h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">{healthData.metrics.switchersCount} Moved</span>
                                </div>
                                <div className="p-2 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                                    {healthData.switchers.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-xs italic">No alliance migrations detected.</div>
                                    ) : (
                                        healthData.switchers.map(s => (
                                            <div key={s.id} className="flex justify-between items-center p-2 rounded hover:bg-[#15181e] group transition-colors">
                                                <div className="text-xs text-gray-300 w-1/3 truncate">{s.name}</div>
                                                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                                    <span className="text-gray-400">[{s.from}]</span>
                                                    <span className="text-cyan-500">→</span>
                                                    <span className="text-cyan-400 font-bold">[{s.to}]</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-[#0d1017] rounded-xl border border-[#1e222b] overflow-hidden">
                                <div className="bg-[#15181e] px-4 py-3 border-b border-[#1e222b] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ArrowUp size={16} className="text-fuchsia-400" />
                                        <h3 className="font-bold text-gray-200 text-sm">Whale Surges (&gt;2M)</h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded">{healthData.metrics.whalesCount} Surging</span>
                                </div>
                                <div className="p-2 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                                    {healthData.whales.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-xs italic">No massive surges detected.</div>
                                    ) : (
                                        healthData.whales.map(w => (
                                            <div key={w.id} className="flex justify-between items-center p-2 rounded hover:bg-[#15181e] transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs text-gray-300 font-bold">{w.name}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono">[{w.alliance}]</div>
                                                </div>
                                                <div className="text-xs font-mono text-fuchsia-400 font-bold">
                                                    +{(w.powerDelta / 1000000).toFixed(2)}M
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
