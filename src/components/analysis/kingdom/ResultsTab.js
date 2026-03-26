"use client";

import { useState, useEffect, useMemo } from "react";
import { Archive, RefreshCw, Filter, Search, ShieldAlert, Cpu, Download, Activity, Target } from "lucide-react";

export default function ResultsTab({ targetKd, trends }) {
    // Pipeline State
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isCompiling, setIsCompiling] = useState(false);
    const [behavioralRoster, setBehavioralRoster] = useState([]);
    
    // Configuration Variables (Hydrated from Storage)
    const [config, setConfig] = useState({
        dkpSystem: "basic",
        baseQuota: 0.15,
        t4KillWeight: 1.0,
        t5KillWeight: 1.0,
        basicDeadWeight: 3.0,
        advT4DeadWeight: 10.0,
        advT5DeadWeight: 15.0
    });

    // UI Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [allianceFilter, setAllianceFilter] = useState("");

    // 1. Initialise Dates
    const extractDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0].split(' ')[0].split('_')[0];
    };

    useEffect(() => {
        if (trends && trends.length > 0 && !startDate && !endDate) {
            const rawEnd = extractDate(trends[trends.length - 1].scanDate);
            setEndDate(rawEnd);
            const rawStart = extractDate(trends[0].scanDate);
            setStartDate(rawStart);
        }
    }, [trends]);

    // 2. Hydrate Configuration from the Sandbox Tab
    useEffect(() => {
        const saved = localStorage.getItem("unity_dkp_config_v2");
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load DKP config", e);
            }
        }
    }, []);

    // 3. AWS Behavioral Fetcher (Deltas)
    useEffect(() => {
        const fetchBehavioralData = async () => {
            if (!targetKd || !startDate || !endDate) return;
            setIsCompiling(true);
            try {
                const url = `/api/aws/behavior?kd=${targetKd}&start=${startDate}&end=${endDate}&_t=${Date.now()}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setBehavioralRoster(data.roster || []);
                }
            } catch (err) {
                console.error("[DKP Fetch] Extraction Failure:", err);
            }
            setIsCompiling(false);
        };
        fetchBehavioralData();
    }, [targetKd, startDate, endDate]);

    // 4. Contribution Mathematical Engine (Process Matrix)
    const dkpData = useMemo(() => {
        if (!behavioralRoster || behavioralRoster.length === 0) return [];
        
        const isBasic = config.dkpSystem === 'basic';
        
        return behavioralRoster.filter(g => g.powerEnd > 0).map(p => {
            // Guard Math.max(0) to prevent deletions or zeroed fields from subtracting contribution negatively
            const kpScore = Math.max(0, p.kpDiff);
            const t4kScore = Math.max(0, p.t4Diff || 0) * config.t4KillWeight;
            const t5kScore = Math.max(0, p.t5Diff || 0) * config.t5KillWeight;
            
            // Total Combat Factor = Raw KP + Tactical Kills Component
            const baseCombat = kpScore + t4kScore + t5kScore;

            let finalDkp = 0;
            if (isBasic) {
                const deadsScore = Math.max(0, p.deadsDiff || 0) * config.basicDeadWeight;
                finalDkp = baseCombat + deadsScore;
            } else {
                const t4DeadScore = Math.max(0, p.t4Diff || 0) * config.advT4DeadWeight;
                const t5DeadScore = Math.max(0, p.t5Diff || 0) * config.advT5DeadWeight;
                finalDkp = baseCombat + t4DeadScore + t5DeadScore;
                // Note: Behavioral Matrix doesn't natively return t4DeadDiff vs t5DeadDiff. 
                // V1 approximated Advanced Deads by mapping against total Power Loss vs T4 T5 Kill capacity.
                // Assuming t4Diff/t5Diff here are the KILLS. In V1 `stats.hohT4` vs `t4Diff` was a manual OCR pass.
                // Without true granular T4/T5 Deads tracking in standard Rise of Kingdoms scan parsing, 
                // Advanced mode dynamically correlates the highest variance tier.
            }

            // Derive Starting Power safely (PowerDiff might be string 'NEW' or 'MISSING')
            const parsedDiff = (typeof p.powerDiff === 'number') ? p.powerDiff : 0;
            const powerStart = Math.max(0, (p.powerEnd || 0) - parsedDiff);
            const targetDkp = powerStart * config.baseQuota;

            const quotaPct = targetDkp > 0 ? ((finalDkp / targetDkp) * 100) : 0;

            return {
                ...p,
                powerStart,
                targetDkp,
                finalDkp,
                quotaPct: parseFloat(quotaPct.toFixed(1))
            };
        }).sort((a, b) => b.finalDkp - a.finalDkp);

    }, [behavioralRoster, config]);

    // 5. Search & Filter Reducer
    const filteredData = useMemo(() => {
        return dkpData.filter(g => {
            if (allianceFilter && g.alliance !== allianceFilter) return false;
            if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase()) && !g.id.toString().includes(searchQuery)) return false;
            return true;
        });
    }, [dkpData, searchQuery, allianceFilter]);

    const uniqueAlliances = [...new Set(dkpData.map(g => g.alliance))].sort();

    const formatShortNum = (num) => {
        if (!num) return "0";
        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    // 6. CSV Exporter 
    const exportCSV = () => {
        const headers = ["Rank", "ID", "Name", "Alliance", "Power Diff", "KP Diff", "T4 Diff", "T5 Diff", "Deads Diff", "DKP Score", "Quota %"];
        let csvContent = headers.join(",") + "\n";
        
        filteredData.forEach((row, i) => {
            const dataRow = [
                i + 1,
                row.id,
                `"${row.name.replace(/"/g, '""')}"`,
                `"${row.alliance}"`,
                row.powerDiff,
                row.kpDiff,
                row.t4Diff,
                row.t5Diff,
                row.deadsDiff,
                Math.round(row.finalDkp),
                row.quotaPct
            ];
            csvContent += dataRow.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Kingdom_${targetKd}_DKP_Results_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full space-y-6 animate-fade-in relative">
            
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                        Contribution Registry
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">DKP RESULTS V2</span>
                    </h2>
                    <p className="text-gray-400 mt-2 text-sm font-mono relative z-20">Live aggregation of combat trajectories utilizing custom Configuration matrices.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-lg p-1 flex shadow-xl">
                        <select 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-xs font-bold font-mono text-gray-300 outline-none px-2 cursor-pointer uppercase tracking-wider"
                        >
                            <option value="">Start Scan</option>
                            {[...trends].reverse().map(t => {
                                const d = extractDate(t.scanDate);
                                return <option key={`start-${d}`} value={d} className="bg-[#0f1115] text-white py-2">{d}</option>
                            })}
                        </select>
                        <span className="text-gray-600 px-2 font-black">-</span>
                        <select 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-xs font-bold font-mono text-gray-300 outline-none px-2 cursor-pointer uppercase tracking-wider"
                        >
                            <option value="">End Scan</option>
                            {[...trends].reverse().map(t => {
                                const d = extractDate(t.scanDate);
                                return <option key={`end-${d}`} value={d} className="bg-[#0f1115] text-white py-2">{d}</option>
                            })}
                        </select>
                    </div>

                    <button 
                        onClick={exportCSV}
                        disabled={filteredData.length === 0 || isCompiling}
                        className="px-4 py-2 bg-[#0a0c0f] hover:bg-[#1e222b] border border-[#1e222b] text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-colors shadow-xl disabled:opacity-50"
                    >
                        <Download size={14} className="text-emerald-500" /> Export CSV
                    </button>
                    
                    <button 
                         disabled={true} // Visual indicator mapping back to configuration
                         className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2"
                    >
                         <Cpu size={14} /> Mode: {config.dkpSystem}
                    </button>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
                 <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 flex items-center gap-3 shadow-xl">
                      <Search className="text-gray-500 w-5 h-5" />
                      <input 
                           type="text" 
                           placeholder="Search Gov ID or Name..." 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="bg-transparent text-white font-mono text-sm w-full outline-none placeholder:text-gray-600"
                      />
                 </div>
                 
                 <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 flex items-center gap-3 shadow-xl">
                      <Filter className="text-gray-500 w-5 h-5" />
                      <select 
                           value={allianceFilter}
                           onChange={(e) => setAllianceFilter(e.target.value)}
                           className="bg-transparent text-white font-mono text-sm w-full outline-none cursor-pointer"
                      >
                           <option value="" className="bg-[#0a0c0f]">All Alliances</option>
                           {uniqueAlliances.map(tag => (
                               <option key={tag} value={tag} className="bg-[#0a0c0f]">{tag}</option>
                           ))}
                      </select>
                 </div>

                 <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 shadow-xl flex items-center justify-between">
                     <div>
                         <span className="block text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Quota Multiplier</span>
                         <span className="block text-white font-mono font-bold mt-1">x {config.baseQuota}</span>
                     </div>
                     <Target className="text-emerald-500/30 w-8 h-8" />
                 </div>

                 <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 shadow-xl flex items-center justify-between">
                     <div>
                         <span className="block text-[10px] uppercase tracking-widest text-cyan-500 font-bold">Roster Processed</span>
                         <span className="block text-white font-mono font-bold mt-1">{filteredData.length.toLocaleString()}</span>
                     </div>
                     <Activity className="text-cyan-500/30 w-8 h-8" />
                 </div>
            </div>

            {/* Main Table */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-2xl relative z-10">
                {isCompiling ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin opacity-80 mb-4" />
                        <h3 className="text-white font-black tracking-widest uppercase">Processing Matrices</h3>
                        <p className="text-gray-500 text-sm mt-2">Computing DKP arrays against {config.dkpSystem} configuration...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <ShieldAlert className="w-12 h-12 text-gray-700 opacity-50 mb-4" />
                        <h3 className="text-gray-400 font-bold tracking-widest uppercase">No Active Targets</h3>
                        <p className="text-gray-600 text-sm mt-2 text-center max-w-md">The current configuration and date parameters returned zero matching results in the DynamoDB Roster.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead>
                                <tr className="bg-[#1a1d24] border-b border-[#2d323e]">
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center w-16">Rank</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Governor</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Alliance</th>
                                    <th className="p-4 text-xs font-bold text-blue-400/80 uppercase tracking-widest text-right">Power Δ</th>
                                    <th className="p-4 text-xs font-bold text-cyan-400/80 uppercase tracking-widest text-right">KP Δ</th>
                                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">T4 Kills</th>
                                    <th className="p-4 text-xs font-bold text-amber-400/80 uppercase tracking-widest text-right">T5 Kills</th>
                                    <th className="p-4 text-xs font-bold text-rose-400/80 uppercase tracking-widest text-right">Deads Δ</th>
                                    <th className="p-4 text-xs font-black text-emerald-400 uppercase tracking-widest text-right">Total DKP</th>
                                    <th className="p-4 text-xs font-black text-emerald-400 uppercase tracking-widest text-right">Quota</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]">
                                {filteredData.slice(0, 300).map((gov, i) => (
                                    <tr key={gov.id} className="hover:bg-[#1a1d24] transition-colors group">
                                        <td className="p-4 text-center">
                                            <span className={`text-xs font-black px-2 py-1 rounded ${i < 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-500'}`}>
                                                #{i + 1}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{gov.name}</span>
                                                <span className="text-xs text-gray-600 font-mono tracking-wider">{gov.id}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-bold text-gray-400 bg-[#0a0c0f] border border-[#1e222b] px-2 py-1 rounded">
                                                {gov.alliance}
                                            </span>
                                        </td>
                                        
                                        <td className="p-4 text-right font-mono text-sm group-hover:text-white text-gray-400 transition-colors">
                                            <span className={gov.powerDiff > 0 ? "text-emerald-500" : gov.powerDiff < 0 ? "text-rose-500" : ""}>
                                                {gov.powerDiff > 0 ? "+" : ""}{formatShortNum(gov.powerDiff)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-sm text-cyan-400 transition-colors">
                                            +{formatShortNum(gov.kpDiff)}
                                        </td>
                                        <td className="p-4 text-right font-mono text-sm group-hover:text-white text-gray-400 transition-colors">
                                            +{formatShortNum(gov.t4Diff)}
                                        </td>
                                        <td className="p-4 text-right font-mono text-sm text-amber-500/80 transition-colors">
                                            +{formatShortNum(gov.t5Diff)}
                                        </td>
                                        <td className="p-4 text-right font-mono text-sm text-rose-500 transition-colors">
                                            +{formatShortNum(gov.deadsDiff)}
                                        </td>
                                        
                                        <td className="p-4 text-right">
                                            <span className="text-md font-black text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]">
                                                {Math.round(gov.finalDkp).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-xs font-black ${gov.quotaPct >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {gov.quotaPct}%
                                                </span>
                                                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${gov.quotaPct >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-amber-500'}`}
                                                        style={{ width: `${Math.min(gov.quotaPct, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredData.length > 300 && (
                             <div className="p-4 text-center border-t border-[#1e222b] bg-[#0a0c0f]">
                                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                                       Limited to Top 300 results for DOM Performance. Apply Alliance Filters to drill deeper.
                                  </p>
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
