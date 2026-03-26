"use client";

import { useState, useEffect, useMemo } from "react";
import { Archive, RefreshCw, Filter, Search, ShieldAlert, Cpu, Download, Activity, Target } from "lucide-react";

export default function ResultsTab({ targetKd, trends }) {
    // Pipeline State
    const [startDate, setStartDate] = useState(() => localStorage.getItem("unity_dkp_start") || "");
    const [endDate, setEndDate] = useState(() => localStorage.getItem("unity_dkp_end") || "");
    const [isCompiling, setIsCompiling] = useState(false);
    const [behavioralRoster, setBehavioralRoster] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: "finalDkp", direction: "desc" });
    
    // Configuration Variables (Hydrated from Storage)
    const [config, setConfig] = useState({
        dkpSystem: "advanced",
        basicT4Points: 10,
        basicT5Points: 20,
        basicDeadsPoints: 30,
        deadsMultiplier: 0.02,
        deadsWeight: 50,
        kpPowerDivisor: 3,
        t5MixRatio: 0.7,
        kpMultiplier: 1.25,
        advT4Points: 10,
        advT5Points: 20
    });

    // UI Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [topLimit, setTopLimit] = useState(300);

    // 1. Initialise Dates
    const extractDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0].split(' ')[0].split('_')[0];
    };

    useEffect(() => {
        if (trends && trends.length > 0 && !startDate && !endDate) {
            const rawEnd = extractDate(trends[trends.length - 1].scanDate);
            setEndDate(rawEnd);
            localStorage.setItem("unity_dkp_end", rawEnd);
            const rawStart = extractDate(trends[0].scanDate);
            setStartDate(rawStart);
            localStorage.setItem("unity_dkp_start", rawStart);
        }
    }, [trends]);

    const handleStartDateChange = (val) => {
        setStartDate(val);
        localStorage.setItem("unity_dkp_start", val);
    };

    const handleEndDateChange = (val) => {
        setEndDate(val);
        localStorage.setItem("unity_dkp_end", val);
    };

    // 2. Hydrate Configuration from the Sandbox Tab
    useEffect(() => {
        const saved = localStorage.getItem("unity_dkp_config_v2");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.dkpSystem) parsed.dkpSystem = "advanced";
                setConfig(parsed);
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
            // Derive Starting Power safely (PowerDiff might be string 'NEW' or 'MISSING')
            const parsedDiff = (typeof p.powerDiff === 'number') ? p.powerDiff : 0;
            const powerStart = Math.max(0, (p.powerEnd || 0) - parsedDiff);
            const deadsDiff = Math.max(0, p.deadsDiff || 0);
            const t4Diff = Math.max(0, p.t4Diff || 0);
            const t5Diff = Math.max(0, p.t5Diff || 0);

            let finalDkp = 0;
            let targetDkp = 0;
            let targetDeads = 0;
            let quotaPct = 0;
            let kvkKP = 0;
            let kpPercent = 0;
            let deadPercent = 0;

            if (isBasic) {
                // Basic System Logic
                kvkKP = (t4Diff * (config.basicT4Points || 0)) + (t5Diff * (config.basicT5Points || 0));
                finalDkp = kvkKP + (deadsDiff * (config.basicDeadsPoints || 0));
                targetDkp = 0; 
                quotaPct = 0; 
                kpPercent = 0;
                deadPercent = 0;
            } else {
                // Advanced System Logic
                kvkKP = (t4Diff * (config.advT4Points || 0)) + (t5Diff * (config.advT5Points || 0));
                const t4MixRatio = 1 - (config.t5MixRatio || 0);
                const kpTargetMultiplier = ((((config.t5MixRatio || 0) * (config.advT5Points || 0)) + (t4MixRatio * (config.advT4Points || 0))) * (config.kpMultiplier || 0)) / (config.kpPowerDivisor || 1);
                
                targetDkp = powerStart * kpTargetMultiplier;
                targetDeads = powerStart * (config.deadsMultiplier || 0);
                
                kpPercent = targetDkp > 0 ? (kvkKP / targetDkp) * 100 : 0;
                deadPercent = targetDeads > 0 ? (deadsDiff / targetDeads) * 100 : 0;
                
                if (targetDkp > 0 && targetDeads > 0) {
                    quotaPct = (kpPercent + deadPercent) / 2;
                } else if (targetDkp > 0) {
                    quotaPct = kpPercent;
                } else if (targetDeads > 0) {
                    quotaPct = deadPercent;
                }
                
                finalDkp = kvkKP; // Treat kvkKP as their "Total KP/DKP" nominal score
            }

            let status = 'Sleeper';
            if ((p.kpDiff || 0) > 0) status = 'Fighter';
            else if ((p.gatheredDiff || 0) > 0) status = 'Farmer';
            else if ((p.powerDiff || 0) > 0) status = 'Grower';
            else if ((p.powerDiff || 0) < 0) status = 'Dropped';

            return {
                ...p,
                powerStart,
                targetDkp,
                targetDeads,
                finalDkp,
                quotaPct: parseFloat(quotaPct.toFixed(2)),
                kpPercent: parseFloat(kpPercent.toFixed(2)),
                deadPercent: parseFloat(deadPercent.toFixed(2)),
                status,
                kvkKP,
                t4t5Combined: (t4Diff + t5Diff)
            };
        });
    }, [behavioralRoster, config]);

    // 5. Search & Filter Reducer + Sorter
    const filteredData = useMemo(() => {
        let sorted = [...dkpData].filter(g => {
            if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase()) && !g.id.toString().includes(searchQuery)) return false;
            return true;
        });
        
        // Sorting Logic
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                // Normalise text for sorting
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }
        
        return sorted;
    }, [dkpData, searchQuery, sortConfig]);

    const requestSort = (key) => {
        let direction = "desc";
        if (sortConfig.key === key && sortConfig.direction === "desc") {
            direction = "asc";
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return null;
        return <span className="ml-1 text-[10px] text-purple-400">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const uniqueAlliances = [...new Set(dkpData.map(g => g.alliance))].sort();

    const formatShortNum = (num) => {
        if (num === null || num === undefined) return "0";
        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    // 6. CSV Exporter 
    const exportCSV = () => {
        const headers = ["Governor ID", "Governor Name", "Status", "Starting Power", "Power +/-", "Troop Power", "T1 Kills", "T2 Kills", "T3 Kills", "T4 Kills", "T5 Kills", "T4*T5 Combined", "KvK Deads", "RSS Gathered", "KvK KP", "Target DKP", "KP % Complete", "Target Deads", "Dead % Complete", config.dkpSystem === "basic" ? "Total DKP" : "Total DKP %"];
        let csvContent = headers.join(",") + "\\n";
        
        filteredData.forEach((row, i) => {
            const dataRow = [
                row.id,
                `"${row.name.replace(/"/g, '""')}"`,
                row.status,
                row.powerStart || 0,
                row.powerDiff || 0,
                row.troopPowerDiff || 0,
                row.t1Diff || 0,
                row.t2Diff || 0,
                row.t3Diff || 0,
                row.t4Diff || 0,
                row.t5Diff || 0,
                (row.t4Diff || 0) + (row.t5Diff || 0),
                row.deadsDiff || 0,
                row.gatheredDiff || 0,
                Math.round(row.kvkKP) || 0,
                Math.round(row.targetDkp) || 0,
                row.kpPercent || 0,
                Math.round(row.targetDeads) || 0,
                row.deadPercent || 0,
                config.dkpSystem === "basic" ? Math.round(row.finalDkp) || 0 : row.quotaPct || 0
            ];
            csvContent += dataRow.join(",") + "\\n";
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
                            onChange={(e) => handleStartDateChange(e.target.value)}
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
                            onChange={(e) => handleEndDateChange(e.target.value)}
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
                         onClick={() => {
                             const newSys = config.dkpSystem === "basic" ? "advanced" : "basic";
                             const newConf = { ...config, dkpSystem: newSys };
                             setConfig(newConf);
                             localStorage.setItem("unity_dkp_config_v2", JSON.stringify(newConf));
                         }}
                         className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 transition-colors border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 cursor-pointer shadow-xl"
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
                           value={topLimit}
                           onChange={(e) => setTopLimit(parseInt(e.target.value))}
                           className="bg-transparent text-white font-mono text-sm w-full outline-none cursor-pointer"
                      >
                           <option value={100} className="bg-[#0a0c0f]">Top 100</option>
                           <option value={300} className="bg-[#0a0c0f]">Top 300</option>
                           <option value={400} className="bg-[#0a0c0f]">Top 400</option>
                           <option value={650} className="bg-[#0a0c0f]">Top 650</option>
                           <option value={1000} className="bg-[#0a0c0f]">Top 1000</option>
                           <option value={10000} className="bg-[#0a0c0f]">All Players</option>
                      </select>
                 </div>

                 {config.dkpSystem === "advanced" && (
                     <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 shadow-xl flex items-center justify-between">
                         <div>
                             <span className="block text-[10px] uppercase tracking-widest text-emerald-500 font-bold">KP Multiplier</span>
                             <span className="block text-white font-mono font-bold mt-1">x {config.kpMultiplier}</span>
                         </div>
                         <Target className="text-emerald-500/30 w-8 h-8" />
                     </div>
                 )}

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
                        <table className="w-full text-left border-collapse min-w-[1800px] text-[11px]">
                            <thead>
                                <tr className="bg-[#1a1d24] border-b border-[#2d323e]">
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("id")}>Governor ID <SortIcon columnKey="id"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("name")}>Governor Name <SortIcon columnKey="name"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("status")}>Status <SortIcon columnKey="status"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("powerStart")}>Starting Power <SortIcon columnKey="powerStart"/></th>
                                    <th className="p-3 font-bold text-blue-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("powerDiff")}>Power +/- <SortIcon columnKey="powerDiff"/></th>
                                    <th className="p-3 font-bold text-blue-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("troopPowerDiff")}>Troop Power <SortIcon columnKey="troopPowerDiff"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("t1Diff")}>T1 Kills <SortIcon columnKey="t1Diff"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("t2Diff")}>T2 Kills <SortIcon columnKey="t2Diff"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("t3Diff")}>T3 Kills <SortIcon columnKey="t3Diff"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("t4Diff")}>T4 Kills <SortIcon columnKey="t4Diff"/></th>
                                    <th className="p-3 font-bold text-amber-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("t5Diff")}>T5 Kills <SortIcon columnKey="t5Diff"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("t4t5Combined")}>T4*T5 Combined <SortIcon columnKey="t4t5Combined"/></th>
                                    <th className="p-3 font-bold text-rose-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("deadsDiff")}>KvK Deads <SortIcon columnKey="deadsDiff"/></th>
                                    <th className="p-3 font-bold text-emerald-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("gatheredDiff")}>RSS Gathered <SortIcon columnKey="gatheredDiff"/></th>
                                    <th className="p-3 font-bold text-cyan-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("kvkKP")}>KvK KP <SortIcon columnKey="kvkKP"/></th>
                                    {config.dkpSystem === 'advanced' && (
                                        <>
                                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("targetDkp")}>Target DKP <SortIcon columnKey="targetDkp"/></th>
                                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("kpPercent")}>KP % Complete <SortIcon columnKey="kpPercent"/></th>
                                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("targetDeads")}>Target Deads <SortIcon columnKey="targetDeads"/></th>
                                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("deadPercent")}>Dead % Complete <SortIcon columnKey="deadPercent"/></th>
                                        </>
                                    )}
                                    <th className="p-3 font-black text-emerald-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort(config.dkpSystem === 'basic' ? "finalDkp" : "quotaPct")}>{config.dkpSystem === 'basic' ? 'Total DKP' : 'Total DKP %'} <SortIcon columnKey={config.dkpSystem === 'basic' ? "finalDkp" : "quotaPct"}/></th>
                                    <th className="p-3 font-bold text-gray-500 uppercase tracking-widest text-right whitespace-nowrap">Bonus</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]">
                                {filteredData.slice(0, topLimit).map((gov, i) => {
                                    const statusColors = {
                                        'Fighter': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                                        'Farmer': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                                        'Grower': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                                        'Dropped': 'text-rose-400 bg-rose-400/10 border-rose-400/20',
                                        'Sleeper': 'text-gray-400 bg-gray-400/10 border-gray-400/20'
                                    };
                                    
                                    return (
                                    <tr key={gov.id} className="hover:bg-[#1a1d24] transition-colors group">
                                        <td className="p-3 text-gray-400 font-mono">{gov.id}</td>
                                        <td className="p-3 text-white font-bold whitespace-nowrap">{gov.name}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest ${statusColors[gov.status] || statusColors['Sleeper']}`}>
                                                {gov.status}
                                            </span>
                                        </td>
                                        
                                        <td className="p-3 text-right text-gray-300 font-mono">{(gov.powerStart || 0).toLocaleString()}</td>
                                        
                                        <td className="p-3 text-right font-mono transition-colors">
                                            <span className={gov.powerDiff > 0 ? "text-emerald-500" : gov.powerDiff < 0 ? "text-rose-500" : "text-gray-500"}>
                                                {gov.powerDiff > 0 ? "+" : ""}{(gov.powerDiff || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono transition-colors">
                                            <span className={gov.troopPowerDiff > 0 ? "text-emerald-500" : gov.troopPowerDiff < 0 ? "text-rose-500" : "text-gray-500"}>
                                                {gov.troopPowerDiff > 0 ? "+" : ""}{(gov.troopPowerDiff || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        
                                        <td className="p-3 text-right font-mono text-gray-400">{(gov.t1Diff || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right font-mono text-gray-400">{(gov.t2Diff || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right font-mono text-gray-400">{(gov.t3Diff || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right font-mono text-gray-300">{(gov.t4Diff || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right font-mono text-amber-500/90">{(gov.t5Diff || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right font-mono text-gray-300">{(gov.t4t5Combined || 0).toLocaleString()}</td>
                                        
                                        <td className="p-3 text-right font-mono text-rose-500">{(gov.deadsDiff || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right font-mono text-emerald-500/80">{(gov.gatheredDiff || 0).toLocaleString()}</td>
                                        
                                        <td className="p-3 text-right font-mono text-cyan-400">{(Math.round(gov.kvkKP) || 0).toLocaleString()}</td>
                                        
                                        {config.dkpSystem === 'advanced' && (
                                            <>
                                                <td className="p-3 text-right font-mono text-gray-400">{(Math.round(gov.targetDkp) || 0).toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono">
                                                    <span className={gov.kpPercent >= 100 ? "text-emerald-500 font-bold" : "text-rose-400"}>{gov.kpPercent}%</span>
                                                </td>
                                                <td className="p-3 text-right font-mono text-gray-400">{(Math.round(gov.targetDeads) || 0).toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono">
                                                    <span className={gov.deadPercent >= 100 ? "text-emerald-500 font-bold" : "text-rose-400"}>{gov.deadPercent}%</span>
                                                </td>
                                            </>
                                        )}

                                        <td className="p-3 text-right font-mono">
                                            {config.dkpSystem === 'basic' ? (
                                                <span className="text-sm font-black text-emerald-400">{(Math.round(gov.finalDkp) || 0).toLocaleString()}</span>
                                            ) : (
                                                <span className={`text-sm font-black ${gov.quotaPct >= 100 ? "text-emerald-500 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]" : "text-amber-500"}`}>{gov.quotaPct}%</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <input type="number" defaultValue="0" className="w-16 bg-[#0a0c0f] border border-[#2a2f3a] rounded text-white text-xs p-1 text-center outline-none focus:border-purple-500" />
                                        </td>
                                    </tr>
                                    );
                                })}
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
