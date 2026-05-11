"use client";

import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Shield, Users, Zap, Map, ArrowUp, ChevronDown, ChevronUp, Layers, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function MultiKingdomPolygraph() {
    const { data: session } = useSession();
    
    // Default to the first allowed kingdom or 2648
    const defaultKd = session?.user?.allowedKingdoms?.[0] || '2648';
    
    const [kingdomInput, setKingdomInput] = useState(defaultKd);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [depth, setDepth] = useState(300);
    
    const [healthData, setHealthData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'powerDelta', direction: 'desc' });

    // Try to pre-fill dates if recent trends exist
    useEffect(() => {
        if (!defaultKd) return;
        const fetchRecentTrends = async () => {
            try {
                const res = await fetch(`/api/aws/trends?kd=${defaultKd}`);
                const data = await res.json();
                if (res.ok && data.trends && data.trends.length > 0) {
                    const sorted = data.trends.sort((a,b) => new Date(a.scanDate) - new Date(b.scanDate));
                    const extractDate = (d) => d.split('T')[0].split(' ')[0].split('_')[0];
                    setStartDate(extractDate(sorted[0].scanDate));
                    setEndDate(extractDate(sorted[sorted.length - 1].scanDate));
                }
            } catch (e) {
                console.error("Failed to fetch initial dates", e);
            }
        };
        fetchRecentTrends();
    }, [defaultKd]);

    const runPolygraph = async () => {
        if (!kingdomInput || !startDate || !endDate) {
            setError("Please provide kingdoms and a date range.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setHealthData(null);

        // Sanitize input
        const kds = kingdomInput.split(',').map(k => k.trim()).filter(Boolean).join(',');

        try {
            const res = await fetch(`/api/aws/health-report?kds=${kds}&start=${startDate}&end=${endDate}&depth=${depth}`);
            const data = await res.json();
            
            if (res.ok && data.success) {
                setHealthData(data);
            } else {
                setError(data.error || "Failed to fetch multi-kingdom health report.");
            }
        } catch (e) {
            console.error(e);
            setError("Network error fetching health report.");
        }
        setIsLoading(false);
    };

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedAlliances = (alliances) => {
        return [...alliances].sort((a, b) => {
            const valA = a[sortConfig.key] || 0;
            const valB = b[sortConfig.key] || 0;
            if (typeof valA === 'string') {
                return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in p-4 md:p-8">
            
            {/* Header Controls */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                            <Activity className="text-fuchsia-500" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase">Polygraph</h1>
                            <p className="text-fuchsia-400 font-bold text-xs uppercase tracking-[0.2em] mt-0.5">Early Kingdom Stability Test</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider px-1">Kingdoms (Comma Separated)</label>
                            <input 
                                type="text" 
                                value={kingdomInput} 
                                onChange={(e) => setKingdomInput(e.target.value)}
                                placeholder="e.g. 2648, 2649, 2650"
                                className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-fuchsia-500 px-3 py-2 rounded-lg font-mono font-bold outline-none transition-colors w-64"
                            />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider px-1">Date Range</label>
                            <div className="flex items-center bg-[#0a0c0f] border border-[#1e222b] rounded-lg px-2 py-1.5 focus-within:border-fuchsia-500 transition-colors">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-white text-xs outline-none font-mono cursor-pointer" style={{ colorScheme: 'dark' }} />
                                <span className="text-gray-600 mx-1">/</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="bg-transparent text-white text-xs outline-none font-mono cursor-pointer" style={{ colorScheme: 'dark' }} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider px-1">Depth</label>
                            <div className="flex bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-1">
                                <button onClick={() => setDepth(300)} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${depth === 300 ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-500 hover:text-gray-300'}`}>300</button>
                                <button onClick={() => setDepth(400)} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${depth === 400 ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-gray-500 hover:text-gray-300'}`}>400</button>
                            </div>
                        </div>

                        <button 
                            onClick={runPolygraph}
                            disabled={isLoading}
                            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 mb-0 md:mb-0 shadow-[0_0_15px_rgba(192,38,211,0.3)] disabled:opacity-50 disabled:cursor-not-allowed h-[38px] mt-4 md:mt-0"
                        >
                            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Zap size={16} />}
                            Scan
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3 shadow-lg">
                    <AlertTriangle size={18} className="shrink-0" />
                    <div>{error}</div>
                </div>
            )}

            {/* Results */}
            {!isLoading && healthData && (
                <div className="space-y-6">
                    
                    {/* Comparative AI Assessment */}
                    {healthData.ai && healthData.ai.comparativeAssessment && (
                        <div className="bg-[#0d1017] rounded-xl border border-[#1e222b] overflow-hidden shadow-xl">
                            <div className="bg-gradient-to-r from-fuchsia-500/10 to-transparent px-5 py-4 border-b border-[#1e222b] flex items-center gap-2">
                                <Activity className="text-fuchsia-400" size={18} />
                                <h2 className="font-bold text-gray-200">J.A.R.V.I.S. Comparative Assessment</h2>
                            </div>
                            <div className="p-5">
                                <p className="text-gray-300 text-sm leading-relaxed">{healthData.ai.comparativeAssessment}</p>
                            </div>
                        </div>
                    )}

                    {/* Kingdom Cards */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {healthData.kingdoms.map(kd => {
                            const aiKd = healthData.ai?.kingdoms?.find(a => a.kd === kd.kd);
                            return (
                                <div key={kd.kd} className="bg-[#0d1017] rounded-xl border border-[#1e222b] overflow-hidden shadow-lg flex flex-col">
                                    {/* KD Header */}
                                    <div className="bg-[#15181e] px-5 py-4 border-b border-[#1e222b] flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-fuchsia-500/20 text-fuchsia-400 font-black text-xl px-3 py-1 rounded border border-fuchsia-500/30">
                                                {kd.kd}
                                            </div>
                                            <div>
                                                <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Roster Size</div>
                                                <div className="text-gray-300 font-mono text-sm">{kd.rosterSize} Govs Analyzed</div>
                                            </div>
                                        </div>

                                        {aiKd && (
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-0.5">Civil War Risk</div>
                                                    <div className={`font-mono text-sm font-bold ${parseInt(aiKd.civilWarProbability) > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                        {aiKd.civilWarProbability}%
                                                    </div>
                                                </div>
                                                <div className={`text-3xl font-black px-4 py-1 rounded ${
                                                    aiKd.grade === 'A' || aiKd.grade === 'B' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    aiKd.grade === 'C' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                    {aiKd.grade}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Context */}
                                    {aiKd && (
                                        <div className="p-5 bg-[#0f1115] border-b border-[#1e222b] space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{aiKd.posture}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 leading-relaxed">{aiKd.diagnosis}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#1e222b]/50">
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-1">Stability Index</div>
                                                    <p className="text-gray-500 text-xs">{aiKd.stabilityIndex}</p>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-1">Economic Intel</div>
                                                    <p className="text-gray-500 text-xs">{aiKd.economicIntel}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Metrics Array */}
                                    <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-[#1e222b] border-b border-[#1e222b] bg-[#0a0c0f]">
                                        <div className="p-3 text-center">
                                            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Power</div>
                                            <div className={`text-sm font-mono font-bold mt-1 ${kd.metrics.totalPowerGained >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {kd.metrics.totalPowerGained > 0 ? '+' : ''}{(kd.metrics.totalPowerGained / 1000000).toFixed(1)}M
                                            </div>
                                        </div>
                                        <div className="p-3 text-center">
                                            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Troops</div>
                                            <div className={`text-sm font-mono font-bold mt-1 ${kd.metrics.totalTroopPowerGained >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                                                {kd.metrics.totalTroopPowerGained > 0 ? '+' : ''}{(kd.metrics.totalTroopPowerGained / 1000000).toFixed(1)}M
                                            </div>
                                        </div>
                                        <div className="p-3 text-center">
                                            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Cmdr</div>
                                            <div className={`text-sm font-mono font-bold mt-1 ${kd.metrics.totalCmdPowerGained >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                {kd.metrics.totalCmdPowerGained > 0 ? '+' : ''}{(kd.metrics.totalCmdPowerGained / 1000000).toFixed(1)}M
                                            </div>
                                        </div>
                                        <div className="p-3 text-center">
                                            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Tech</div>
                                            <div className={`text-sm font-mono font-bold mt-1 ${kd.metrics.totalTechPowerGained >= 0 ? 'text-fuchsia-400' : 'text-rose-400'}`}>
                                                {kd.metrics.totalTechPowerGained > 0 ? '+' : ''}{(kd.metrics.totalTechPowerGained / 1000000).toFixed(1)}M
                                            </div>
                                        </div>
                                        <div className="p-3 text-center relative overflow-hidden">
                                            {kd.metrics.totalDeadsGained > 0 && <div className="absolute inset-0 bg-rose-500/10" />}
                                            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider relative z-10">Deads</div>
                                            <div className={`text-sm font-mono font-bold mt-1 relative z-10 ${kd.metrics.totalDeadsGained > 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                                                {kd.metrics.totalDeadsGained > 0 ? `+${(kd.metrics.totalDeadsGained/1000).toFixed(1)}k` : '0'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sortable Alliance Table */}
                                    <div className="flex-1 flex flex-col p-4 bg-[#0d1017]">
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <Shield size={16} className="text-cyan-400" />
                                            <h3 className="font-bold text-gray-200 text-sm">Alliance Matrix</h3>
                                        </div>
                                        <div className="overflow-x-auto border border-[#1e222b] rounded-lg custom-scrollbar">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-[#15181e] text-[10px] uppercase tracking-wider text-gray-500 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-2 font-bold cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('tag')}>Tag <span className="text-gray-600 ml-1">{sortConfig.key === 'tag' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : '↕'}</span></th>
                                                        <th className="p-2 font-bold text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('govCount')}>Govs <span className="text-gray-600 ml-1">{sortConfig.key === 'govCount' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : '↕'}</span></th>
                                                        <th className="p-2 font-bold text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('powerDelta')}>Power <span className="text-gray-600 ml-1">{sortConfig.key === 'powerDelta' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : '↕'}</span></th>
                                                        <th className="p-2 font-bold text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('troopDelta')}>Troop <span className="text-gray-600 ml-1">{sortConfig.key === 'troopDelta' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : '↕'}</span></th>
                                                        <th className="p-2 font-bold text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cmdDelta')}>Cmdr <span className="text-gray-600 ml-1">{sortConfig.key === 'cmdDelta' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : '↕'}</span></th>
                                                        <th className="p-2 font-bold text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('techDelta')}>Tech <span className="text-gray-600 ml-1">{sortConfig.key === 'techDelta' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : '↕'}</span></th>
                                                        <th className="p-2 font-bold text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('deadsDelta')}>Deads <span className="text-gray-600 ml-1">{sortConfig.key === 'deadsDelta' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : '↕'}</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#1e222b] text-xs font-mono">
                                                    {getSortedAlliances(kd.alliances).map(a => (
                                                        <tr key={a.tag} className="hover:bg-[#15181e] transition-colors">
                                                            <td className="p-2 font-bold text-cyan-400">[{a.tag}]</td>
                                                            <td className="p-2 text-right text-gray-400">{a.govCount}</td>
                                                            <td className={`p-2 text-right font-bold ${a.powerDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {(a.powerDelta / 1000000).toFixed(1)}M
                                                            </td>
                                                            <td className={`p-2 text-right ${a.troopDelta >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                                                                {(a.troopDelta / 1000000).toFixed(1)}M
                                                            </td>
                                                            <td className={`p-2 text-right ${a.cmdDelta >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                                {(a.cmdDelta / 1000000).toFixed(1)}M
                                                            </td>
                                                            <td className={`p-2 text-right ${a.techDelta >= 0 ? 'text-fuchsia-400' : 'text-rose-400'}`}>
                                                                {(a.techDelta / 1000000).toFixed(1)}M
                                                            </td>
                                                            <td className={`p-2 text-right ${a.deadsDelta > 0 ? 'text-rose-400 font-bold' : 'text-gray-600'}`}>
                                                                {a.deadsDelta > 0 ? (a.deadsDelta/1000).toFixed(1)+'k' : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
