'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShieldAlert, Loader2, AlertTriangle, Target, Activity, Download, Cpu, Layers } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function PublicDkpResults() {
    const searchParams = useSearchParams();
    const kd = searchParams.get('kd');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const configB64 = searchParams.get('config');
    const enableSiphon = searchParams.get('siphon') === 'true';

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [behavioralRoster, setBehavioralRoster] = useState([]);
    const [familyLinks, setFamilyLinks] = useState({});
    
    const [searchQuery, setSearchQuery] = useState('');
    const [topLimit, setTopLimit] = useState(300);
    const [sortConfig, setSortConfig] = useState({ key: 'finalDkp', direction: 'desc' });
    
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

    useEffect(() => {
        if (!kd || !start || !end) {
            setError("Invalid Link: Missing required Kingdom ID, start date, or end date parameters.");
            setIsLoading(false);
            return;
        }

        if (configB64) {
            try {
                const decodedStr = atob(configB64);
                const parsed = JSON.parse(decodedStr);
                setConfig(parsed);
                // Also default sort based on config if basic vs advanced
                if (parsed.dkpSystem !== 'basic') {
                    setSortConfig({ key: 'quotaPct', direction: 'desc' });
                }
            } catch (err) {
                console.error("Failed to parse config from URL:", err);
            }
        }

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/aws/public/dkp-results?kd=${kd}&start=${start}&end=${end}`);
                const data = await res.json();
                
                if (data.error) {
                    setError(data.error);
                } else {
                    setBehavioralRoster(data.roster || []);
                    setFamilyLinks(data.links || {});
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch DKP Results. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [kd, start, end, configB64]);

    const dkpData = useMemo(() => {
        if (!behavioralRoster || behavioralRoster.length === 0) return [];
        
        const isBasic = config.dkpSystem === 'basic';
        const farmDeadsBaseline = config.farmDeadsBaseline || 500000;
        const farmKpBaseline = config.farmKpBaseline || 0;
        
        // Pass 1: Raw Output
        const baseCalculations = behavioralRoster.filter(g => g.powerEnd > 0).map(p => {
            const parsedDiff = (typeof p.powerDiff === 'number') ? p.powerDiff : 0;
            const powerStart = Math.max(0, (p.powerEnd || 0) - parsedDiff);
            const deadsDiff = Math.max(0, p.deadsDiff || 0);
            const t4Diff = Math.max(0, p.t4Diff || 0);
            const t5Diff = Math.max(0, p.t5Diff || 0);

            let rawKvkKP = 0;
            let targetDkp = 0;
            let targetDeads = 0;

            if (isBasic) {
                rawKvkKP = (t4Diff * (config.basicT4Points || 0)) + (t5Diff * (config.basicT5Points || 0));
                targetDkp = 0; 
                targetDeads = 0;
            } else if (config.dkpSystem === "bracketed") {
                const pM = powerStart / 1000000;
                let mult = config.b6Mult || 5.0;
                
                if (pM <= (config.b1Max || 24)) mult = (config.b1Mult || 1.5);
                else if (pM <= (config.b2Max || 35)) mult = (config.b2Mult || 2.0);
                else if (pM <= (config.b3Max || 45)) mult = (config.b3Mult || 2.5);
                else if (pM <= (config.b4Max || 55)) mult = (config.b4Mult || 3.0);
                else if (pM <= (config.b5Max || 70)) mult = (config.b5Mult || 4.0);

                rawKvkKP = (t4Diff * (config.advT4Points || 10)) + (t5Diff * (config.advT5Points || 20));
                targetDkp = powerStart * mult;
                targetDeads = powerStart * (config.bracketDeadsMultiplier || 0.02);
            } else if (config.dkpSystem === "hoh") {
                let estT4Deads, estT5Deads;
                
                if (g.hohT4Deads !== undefined && g.hohT5Deads !== undefined) {
                    // Use exact parsed HOH Deads if they exist for this governor
                    estT4Deads = g.hohT4Deads;
                    estT5Deads = g.hohT5Deads;
                } else {
                    // Fallback: estimate ratio based on kills
                    const totalKills = t4Diff + t5Diff;
                    const t4Ratio = totalKills > 0 ? (t4Diff / totalKills) : 1; 
                    estT4Deads = deadsDiff * t4Ratio;
                    estT5Deads = deadsDiff * (1 - t4Ratio);
                }
                
                rawKvkKP = (t4Diff * 1) + (t5Diff * 5) + (estT4Deads * 15) + (estT5Deads * 30);
                targetDkp = 0;
                targetDeads = 0;
            } else {
                rawKvkKP = (t4Diff * (config.advT4Points || 0)) + (t5Diff * (config.advT5Points || 0));
                const t4MixRatio = 1 - (config.t5MixRatio || 0);
                const kpTargetMultiplier = ((((config.t5MixRatio || 0) * (config.advT5Points || 0)) + (t4MixRatio * (config.advT4Points || 0))) * (config.kpMultiplier || 0)) / (config.kpPowerDivisor || 1);
                
                targetDkp = powerStart * kpTargetMultiplier;
                targetDeads = powerStart * (config.deadsMultiplier || 0);
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
                status,
                rawKvkKP,
                rawDeadsDiff: deadsDiff,
                t4t5Combined: (t4Diff + t5Diff),
                rolloverDeads: 0,
                rolloverKp: 0,
                isFarm: !!familyLinks[p.id]
            };
        });

        // Pass 2: The Overflow Siphon
        const govMap = {};
        baseCalculations.forEach(g => govMap[g.id] = g);

        Object.entries(familyLinks).forEach(([farmId, mainId]) => {
            const farm = govMap[farmId];
            const main = govMap[mainId];
            
            if (farm && main) {
                if (farm.rawDeadsDiff > farmDeadsBaseline) {
                    const excessDeads = farm.rawDeadsDiff - farmDeadsBaseline;
                    farm.rawDeadsDiff = farmDeadsBaseline;
                    main.rolloverDeads += excessDeads;
                }
                if (farm.rawKvkKP > farmKpBaseline) {
                    const excessKp = farm.rawKvkKP - farmKpBaseline;
                    farm.rawKvkKP = farmKpBaseline;
                    main.rolloverKp += excessKp;
                }
            }
        });

        // Pass 3: Final Aggregations
        return baseCalculations.map(g => {
            const totalEffectiveDeads = g.rawDeadsDiff + (enableSiphon ? g.rolloverDeads : 0);
            const totalEffectiveKp = g.rawKvkKP + (enableSiphon ? g.rolloverKp : 0);
            
            let finalDkp = 0;
            let quotaPct = 0;
            let kpPercent = 0;
            let deadPercent = 0;

            if (isBasic) {
                finalDkp = totalEffectiveKp + (totalEffectiveDeads * (config.basicDeadsPoints || 0));
            } else if (config.dkpSystem === "hoh") {
                finalDkp = totalEffectiveKp; 
            } else {
                kpPercent = g.targetDkp > 0 ? (totalEffectiveKp / g.targetDkp) * 100 : 0;
                deadPercent = g.targetDeads > 0 ? (totalEffectiveDeads / g.targetDeads) * 100 : 0;
                
                if (g.targetDkp > 0 && g.targetDeads > 0) {
                    quotaPct = (kpPercent + deadPercent) / 2;
                } else if (g.targetDkp > 0) {
                    quotaPct = kpPercent;
                } else if (g.targetDeads > 0) {
                    quotaPct = deadPercent;
                }
                finalDkp = totalEffectiveKp;
            }

            return {
                ...g,
                deadsDiff: totalEffectiveDeads, 
                kvkKP: totalEffectiveKp,
                finalDkp,
                quotaPct: parseFloat(quotaPct.toFixed(2)),
                kpPercent: parseFloat(kpPercent.toFixed(2)),
                deadPercent: parseFloat(deadPercent.toFixed(2))
            };
        });
    }, [behavioralRoster, config, familyLinks, enableSiphon]);

    const filteredData = useMemo(() => {
        let sorted = [...dkpData].filter(g => {
            if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase()) && !g.id.toString().includes(searchQuery)) return false;
            return true;
        });
        
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
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

    const extractDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0].split(' ')[0].split('_')[0];
    };

    const exportCSV = () => {
        const headers = ["Governor ID", "Governor Name", "Status", "Starting Power", "Power +/-", "Troop Power", "T1 Kills", "T2 Kills", "T3 Kills", "T4 Kills", "T5 Kills", "T4*T5 Combined", "KvK Deads", "RSS Gathered", "KvK KP", "Target DKP", "KP % Complete", "Target Deads", "Dead % Complete", config.dkpSystem === "basic" ? "Total DKP" : "Total DKP %"];
        let csvContent = headers.join(",") + "\\n";
        
        filteredData.forEach((row) => {
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
        link.setAttribute("download", `Kingdom_${kd}_DKP_Results_${start}_${end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6 text-slate-400 font-mono">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
                <p className="uppercase tracking-widest text-xs font-bold">Connecting to Unity Network...</p>
                <p className="text-[10px] mt-2 opacity-50">Retrieving KvK Contribution Results</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
                <h1 className="text-2xl font-black text-rose-400 uppercase tracking-widest mb-2">Access Denied</h1>
                <p className="text-slate-400 font-mono max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060810] text-slate-200 p-4 md:p-8 font-sans">
            <div className="max-w-[1800px] mx-auto w-full space-y-6 animate-fade-in relative">
                
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                            Contribution Registry
                            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">PUBLIC SHARE</span>
                        </h2>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                            Kingdom <span className="text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{kd}</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            Scan Window: {extractDate(start)} to {extractDate(end)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={exportCSV}
                            disabled={filteredData.length === 0}
                            className="px-4 py-2 bg-[#0a0c0f] hover:bg-[#1e222b] border border-[#1e222b] text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-colors shadow-xl disabled:opacity-50"
                        >
                            <Download size={14} className="text-emerald-500" /> Export CSV
                        </button>
                        
                        <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-xl">
                            <Cpu size={14} /> Mode: {config.dkpSystem}
                        </div>
                        <div className={`px-4 py-2 ${enableSiphon ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-gray-500/10 border-gray-500/30 text-gray-500'} border text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 shadow-xl`}>
                            <Layers size={14} /> Siphon: {enableSiphon ? 'ON' : 'OFF'}
                        </div>
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
                        <Loader2 className="text-gray-500 w-5 h-5" />
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

                    {config.dkpSystem !== "basic" && config.dkpSystem !== "hoh" && (
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
                    {filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32">
                            <ShieldAlert className="w-12 h-12 text-gray-700 opacity-50 mb-4" />
                            <h3 className="text-gray-400 font-bold tracking-widest uppercase">No Active Targets</h3>
                            <p className="text-gray-600 text-sm mt-2 text-center max-w-md">No matching results found for this scan window.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto overflow-y-auto max-h-[650px] border border-[#2d323e] rounded-xl custom-scrollbar bg-[#0f1115] shadow-2xl relative z-10">
                            <table className="w-full text-left border-collapse min-w-[1800px] text-[11px] relative">
                                <thead className="sticky top-0 z-20 shadow-md">
                                    <tr className="bg-[#1a1d24] border-b-2 border-purple-500/20">
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
                                        {(enableSiphon && config.dkpSystem !== 'basic') && <th className="p-3 font-bold text-amber-500 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("rolloverDeads")}>Farm Deads <SortIcon columnKey="rolloverDeads"/></th>}
                                        <th className="p-3 font-bold text-emerald-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("gatheredDiff")}>RSS Gathered <SortIcon columnKey="gatheredDiff"/></th>
                                        <th className="p-3 font-bold text-cyan-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("kvkKP")}>KvK KP <SortIcon columnKey="kvkKP"/></th>
                                        {(enableSiphon && config.dkpSystem !== 'basic') && <th className="p-3 font-bold text-amber-500 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("rolloverKp")}>Farm KP <SortIcon columnKey="rolloverKp"/></th>}
                                        {config.dkpSystem !== 'basic' && config.dkpSystem !== 'hoh' && (
                                            <>
                                                <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("targetDkp")}>Target DKP <SortIcon columnKey="targetDkp"/></th>
                                                <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("kpPercent")}>KP % Complete <SortIcon columnKey="kpPercent"/></th>
                                                <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("targetDeads")}>Target Deads <SortIcon columnKey="targetDeads"/></th>
                                                <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("deadPercent")}>Dead % Complete <SortIcon columnKey="deadPercent"/></th>
                                            </>
                                        )}
                                        <th className="p-3 font-black text-emerald-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort((config.dkpSystem === 'basic' || config.dkpSystem === 'hoh') ? "finalDkp" : "quotaPct")}>{(config.dkpSystem === 'basic' || config.dkpSystem === 'hoh') ? 'Total DKP' : 'Total DKP %'} <SortIcon columnKey={(config.dkpSystem === 'basic' || config.dkpSystem === 'hoh') ? "finalDkp" : "quotaPct"}/></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1e222b]">
                                    {filteredData.slice(0, topLimit).map((gov) => {
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
                                            <td className="p-3 text-white font-bold whitespace-nowrap">
                                                {gov.name}
                                                {(gov.rolloverDeads > 0 || gov.rolloverKp > 0) && <span className="ml-2 text-[10px] text-amber-500 bg-amber-500/10 px-1 py-0.5 border border-amber-500/30 rounded" title={`Includes pooled stats from Farm accounts!`}>+OVERFLOW</span>}
                                                {gov.isFarm && <span className="ml-2 text-[10px] text-gray-500 bg-gray-500/10 px-1 py-0.5 rounded" title="Farm Siphon Engine is evaluating this account for Overflow metric skimming.">FARM</span>}
                                            </td>
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
                                             {(enableSiphon && config.dkpSystem !== 'basic') && <td className="p-3 text-right font-mono text-amber-500">{(gov.rolloverDeads || 0).toLocaleString()}</td>}
                                             <td className="p-3 text-right font-mono text-emerald-500/80">{(gov.gatheredDiff || 0).toLocaleString()}</td>
                                             
                                             <td className="p-3 text-right font-mono text-cyan-400">{(Math.round(gov.kvkKP) || 0).toLocaleString()}</td>
                                             {(enableSiphon && config.dkpSystem !== 'basic') && <td className="p-3 text-right font-mono text-amber-500">{(gov.rolloverKp || 0).toLocaleString()}</td>}
                                            
                                            {config.dkpSystem !== 'basic' && config.dkpSystem !== 'hoh' && (
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
                                                {(config.dkpSystem === 'basic' || config.dkpSystem === 'hoh') ? (
                                                    <span className="text-sm font-black text-emerald-400">{(Math.round(gov.finalDkp) || 0).toLocaleString()}</span>
                                                ) : (
                                                    <span className={`text-sm font-black ${gov.quotaPct >= 100 ? "text-emerald-500 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]" : "text-amber-500"}`}>{gov.quotaPct}%</span>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            
                            {filteredData.length > topLimit && (
                                 <div className="p-4 text-center border-t border-[#1e222b] bg-[#0a0c0f]">
                                      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                                           Limited to Top {topLimit} results for DOM Performance. Apply Filters to drill deeper.
                                      </p>
                                 </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                    POWERED BY UNITY COMBAT INTELLIGENCE
                </div>
            </div>
        </div>
    );
}
