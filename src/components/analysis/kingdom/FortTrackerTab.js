"use client";

import { useState, useEffect, useMemo } from "react";
import { UploadCloud, FileSpreadsheet, Activity, Target, Users, ShieldAlert, Crosshair, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import Papa from "papaparse";

export default function FortTrackerTab({ targetKd, rosterData }) {
    const [links, setLinks] = useState({});
    const [isParsing, setIsParsing] = useState(false);
    const [rawForts, setRawForts] = useState([]);
    
    const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'descending' });
    const [expandedGovId, setExpandedGovId] = useState(null);

    // Build Gov Dictionary for Names
    const govDictionary = useMemo(() => {
        const dict = {};
        if (rosterData && rosterData.length > 0) {
            rosterData.forEach(g => {
                dict[g.id] = g.name;
            });
        }
        return dict;
    }, [rosterData]);

    const getGovName = (id, fallback) => govDictionary[id] || fallback || id;

    // Fetch Link mappings
    useEffect(() => {
        const fetchLinks = async () => {
            if (!targetKd) return;
            try {
                const res = await fetch(`/api/aws/admin/links?kd=${targetKd}`);
                if (res.ok) {
                    const data = await res.json();
                    setLinks(data || {});
                }
            } catch (err) {
                console.error("Failed to load links:", err);
            }
        };
        fetchLinks();
    }, [targetKd]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsParsing(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setRawForts(results.data);
                setIsParsing(false);
            },
            error: (err) => {
                console.error("Parse Error:", err);
                setIsParsing(false);
                alert("Failed to parse CSV file.");
            }
        });
    };

    const aggregatedData = useMemo(() => {
        if (!rawForts || rawForts.length === 0) return [];
        
        const getActiveId = (id) => links[id] || id; // Resolve Farm -> Main
        let governorStats = {};

        rawForts.forEach(row => {
            if (!row.id) return;
            const rawId = row.governor_id;
            if (!rawId) return;

            const activeId = getActiveId(rawId);
            
            if (!governorStats[activeId]) {
                governorStats[activeId] = {
                    id: activeId,
                    name: getGovName(activeId, row.governor_name),
                    total: 0,
                    success: 0,
                    failed: 0,
                    commands: {},
                    levels: [],
                    participants: new Set(),
                    farmsUsed: new Set()
                };
            }

            // Track main vs farm usage
            if (rawId !== activeId) {
                governorStats[activeId].farmsUsed.add(row.governor_name || rawId);
            }

            governorStats[activeId].total += 1;
            
            // The file has 'cancelled' as "True" or "False" strings
            const isCancelled = row.cancelled === 'True' || row.cancelled === true;
            if (isCancelled) {
                governorStats[activeId].failed += 1;
            } else {
                governorStats[activeId].success += 1;
            }

            // Commands
            if (row.primary && row.secondary) {
                const cmdKey = `${row.primary} & ${row.secondary}`;
                governorStats[activeId].commands[cmdKey] = (governorStats[activeId].commands[cmdKey] || 0) + 1;
            }

            // Levels
            const lvl = parseInt(row.target_level) || 0;
            if (lvl > 0) governorStats[activeId].levels.push(lvl);

            // Participants Network
            if (row.governors) {
                row.governors.split(';').forEach(p => {
                    if (p && p !== rawId) governorStats[activeId].participants.add(p);
                });
            }
        });

        const mapped = Object.values(governorStats).map(s => {
            const avgLvl = s.levels.length ? (s.levels.reduce((a,b) => a+b, 0) / s.levels.length).toFixed(1) : "0.0";
            
            let topCmd = 'Unknown';
            let topCount = 0;
            Object.entries(s.commands).forEach(([k, v]) => {
                if (v > topCount) { topCount = v; topCmd = k; }
            });

            s.avgLevel = avgLvl;
            s.topCommanders = topCmd;
            s.uniqueParticipants = s.participants.size;
            s.successRate = s.total > 0 ? ((s.success / s.total) * 100).toFixed(1) : "0.0";
            return s;
        });

        // Apply Sorting
        mapped.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
                aVal = Number(aVal);
                bVal = Number(bVal);
            } else if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return mapped;
    }, [rawForts, links, govDictionary, sortConfig]);

    const handleSort = (key) => {
        let direction = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ sortKey, title, className }) => {
        const isActive = sortConfig.key === sortKey;
        return (
            <th 
                className={`py-3 px-4 uppercase cursor-pointer select-none group hover:bg-white/[0.05] transition-colors ${className}`}
                onClick={() => handleSort(sortKey)}
            >
                <div className={`flex items-center gap-1 ${className?.includes('text-right') ? 'justify-end' : ''}`}>
                    {title}
                    {isActive ? (
                        <span className="text-cyan-500 font-black">{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>
                    ) : (
                        <span className="opacity-0 group-hover:opacity-30 text-white font-black">▼</span>
                    )}
                </div>
            </th>
        );
    };

    return (
        <div className="w-full space-y-6 animate-fade-in relative">

            {rawForts.length === 0 ? (
                // UPLOAD STATE
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-2xl p-12 flex flex-col items-center justify-center relative overflow-hidden transition-all hover:border-cyan-500/30">
                    <div className="absolute inset-0 bg-cyan-500/5 blur-[120px] pointer-events-none"></div>
                    
                    <div className="bg-[#1a1d24] p-4 rounded-full border border-[#2d323e] mb-6 shadow-xl relative z-10">
                        {isParsing ? (
                            <RefreshCw className="w-16 h-16 text-cyan-400 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="w-16 h-16 text-cyan-500" />
                        )}
                    </div>
                    
                    <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-2 relative z-10 text-center">
                        {isParsing ? 'Processing Vector Data...' : 'Drop Fort Telemetry'}
                    </h2>
                    <p className="text-gray-400 font-mono mb-8 max-w-lg text-center relative z-10 text-sm">
                        {isParsing 
                            ? 'Parsing local spreadsheet and aggregating Governor Linker data...' 
                            : 'Upload your 10-day fort analysis CSV. The engine will instantly aggregate thousands of forts natively in your browser.'}
                    </p>

                    <div className="relative z-10">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            disabled={isParsing}
                            className="hidden"
                            id="csv_upload"
                        />
                        <label 
                            htmlFor="csv_upload"
                            className={`px-8 py-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black tracking-widest uppercase text-sm rounded-lg hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] ${isParsing ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
                        >
                            Select SpreadSheet
                        </label>
                    </div>
                </div>
            ) : (
                // DATAGRID STATE
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-2xl overflow-hidden flex flex-col">
                    
                    <div className="p-6 border-b border-[#1e222b] flex items-center justify-between bg-[#13161c]">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
                                <Target className="text-rose-500" /> Fort Extraction Hub
                            </h2>
                            <p className="text-xs text-gray-500 font-mono mt-1 uppercase tracking-widest">Processed {rawForts.length.toLocaleString()} raw inputs across {aggregatedData.length} Governor Networks</p>
                        </div>
                        <button 
                            onClick={() => setRawForts([])}
                            className="bg-rose-500/10 text-rose-500 border border-rose-500/30 px-4 py-2 rounded font-bold uppercase tracking-widest text-xs hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 block"
                        >
                            <Trash2 size={14} className="hidden" /> Flush Memory
                        </button>
                    </div>

                    <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent max-h-[700px]">
                        <table className="w-full text-left border-collapse min-w-[1400px] text-[12px] font-mono">
                            <thead className="sticky top-0 bg-[#0a0c0f] z-20 shadow-md border-b border-[#1e222b] text-gray-500 font-bold tracking-widest">
                                <tr>
                                    <th className="py-3 px-4 font-bold tracking-widest uppercase">Rank</th>
                                    <SortableHeader sortKey="name" title="Governor Fleet" />
                                    <th className="py-3 px-4 font-bold tracking-widest uppercase text-center border-r border-[#1e222b]">Accounts Used</th>
                                    
                                    <SortableHeader sortKey="total" title="Total Launched" className="text-cyan-500/50 text-right" />
                                    <SortableHeader sortKey="success" title="Success" className="text-emerald-500/50 text-right" />
                                    <SortableHeader sortKey="failed" title="Failed" className="text-rose-500/50 text-right" />
                                    <SortableHeader sortKey="successRate" title="Win Rate" className="font-black text-white text-right border-r border-[#1e222b]" />
                                    
                                    <SortableHeader sortKey="avgLevel" title="Avg Lvl" className="text-amber-500/50 text-center" />
                                    <SortableHeader sortKey="topCommanders" title="Meta Command" className="text-purple-500/50 border-r border-[#1e222b]" />
                                    
                                    <SortableHeader sortKey="uniqueParticipants" title="Unique Riders" className="text-right" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]/50">
                                {aggregatedData.map((gov, idx) => (
                                 <>
                                    <tr 
                                        key={gov.id} 
                                        onClick={() => setExpandedGovId(expandedGovId === gov.id ? null : gov.id)}
                                        className="hover:bg-cyan-500/10 transition-colors group h-[48px] cursor-pointer"
                                    >
                                        <td className="py-2 px-4 text-gray-500 border-l-[3px] border-transparent group-hover:border-cyan-500">#{idx + 1}</td>
                                        <td className="py-2 px-4 text-white font-sans font-bold flex flex-col justify-center h-full">
                                            {gov.name}
                                            <span className="text-[10px] text-gray-600 font-mono tracking-widest">{gov.id}</span>
                                        </td>
                                        
                                        <td className="py-2 px-4 text-gray-400 text-center border-r border-[#1e222b]">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="text-cyan-400 font-bold">{1 + gov.farmsUsed.size}</span>
                                                {gov.farmsUsed.size > 0 && (
                                                    <span title={Array.from(gov.farmsUsed).join(', ')} className="text-[10px] bg-[#1e222b] px-1 py-0.5 rounded cursor-help">+{gov.farmsUsed.size} FARMS</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="py-2 px-4 text-cyan-400 text-right font-bold">{gov.total.toLocaleString()}</td>
                                        <td className="py-2 px-4 text-emerald-400 text-right">{gov.success.toLocaleString()}</td>
                                        <td className="py-2 px-4 text-rose-400 text-right">{gov.failed.toLocaleString()}</td>
                                        
                                        <td className="py-2 px-4 text-white text-right font-black border-r border-[#1e222b]">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-1.5 bg-[#1e222b] rounded-full overflow-hidden">
                                                    <div className={`h-full ${gov.successRate >= 90 ? 'bg-emerald-500' : gov.successRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${gov.successRate}%`}}></div>
                                                </div>
                                                {gov.successRate}%
                                            </div>
                                        </td>

                                        <td className="py-2 px-4 text-amber-400 text-center">Lv.{gov.avgLevel}</td>
                                        <td className="py-2 px-4 text-gray-300 truncate max-w-[200px] border-r border-[#1e222b]">{gov.topCommanders}</td>
                                        
                                        <td className="py-2 px-4 text-gray-400 text-right">
                                            <span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs">
                                                <Users size={12} className="inline mr-1 text-gray-500" />
                                                {gov.uniqueParticipants.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                    
                                    {expandedGovId === gov.id && (
                                        <tr className="bg-[#13161c] border-b border-[#1e222b]">
                                            <td colSpan="10" className="p-4">
                                                <div className="flex flex-col space-y-4 animate-fade-in pl-8 border-l-2 border-cyan-500/30">
                                                    <div>
                                                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Users size={14} className="text-cyan-500" />
                                                            {gov.uniqueParticipants.toLocaleString()} Unique Riders Joined {gov.name}'s Forts
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-[#2d323e]">
                                                            {Array.from(gov.participants).map(pId => (
                                                                <span key={pId} className="bg-[#1a1d24] border border-[#2d323e] px-2 py-1 rounded text-xs text-gray-400 font-sans truncate max-w-[150px]" title={pId}>
                                                                    {getGovName(pId, 'Unknown Rider')}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
