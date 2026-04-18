"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowRight, Download, Search, Shield, Target, Activity, CheckCircle2, ChevronUp, TrendingUp, X } from "lucide-react";
import { useLocale } from "next-intl";

const T5_TECH_FLOOR = 22467131;
const T5_BUILDING_FLOOR = 14780832;

export default function T5TrackerTab({ targetKd, trends, startDate, endDate }) {
    const locale = useLocale();
    const [isCompiling, setIsCompiling] = useState(false);
    const [behavioralRoster, setBehavioralRoster] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch Behavioral Matrix data
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
                } else {
                    console.warn(`[T5Tracker Fetch] Error ${res.status}`);
                }
            } catch (err) {
                console.error("[T5Tracker Fetch] Exception: ", err);
            }
            setIsCompiling(false);
        };
        fetchBehavioralData();
    }, [targetKd, startDate, endDate]);

    // Process logic
    const t5Data = useMemo(() => {
        if (!behavioralRoster || behavioralRoster.length === 0) return [];

        // 1. Filter ONLY CH 25s
        let ch25s = behavioralRoster.filter(g => g.townHall === 25);

        // 2. Classify and compute progress
        return ch25s.map(p => {
            const currentTech = p.techPowerEnd || 0;
            const currentBld = p.bldPowerEnd || 0;
            const techDiff = p.techPowerDiff || 0;
            const bldDiff = p.bldPowerDiff || 0;
            const troopDiff = p.troopPowerDiff || 0;
            const currentTroop = p.troopPowerEnd || 0;

            const isEligible = currentTech >= T5_TECH_FLOOR && currentBld >= T5_BUILDING_FLOOR;
            const isPushing = !isEligible && (techDiff > 0 || bldDiff > 0);
            const isStagnant = !isEligible && techDiff <= 0 && bldDiff <= 0;

            const techPct = Math.min(100, Math.max(0, (currentTech / T5_TECH_FLOOR) * 100));
            const bldPct = Math.min(100, Math.max(0, (currentBld / T5_BUILDING_FLOOR) * 100));

            return {
                ...p,
                currentTech,
                currentBld,
                currentTroop,
                techDiff,
                bldDiff,
                troopDiff,
                isEligible,
                isPushing,
                isStagnant,
                techPct,
                bldPct,
                pushScore: techDiff + bldDiff // Used for sorting those actively pushing
            };
        }).sort((a, b) => b.pushScore - a.pushScore || b.powerEnd - a.powerEnd); // Active pushers first, then by power

    }, [behavioralRoster]);

    const filteredData = useMemo(() => {
        return t5Data.filter(g => {
            if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase()) && !g.id.toString().includes(searchQuery)) return false;
            return true;
        });
    }, [t5Data, searchQuery]);

    // Aggregates for top cards
    const totalCH25 = t5Data.length;
    const eligibleCount = t5Data.filter(g => g.isEligible).length;
    const pushingCount = t5Data.filter(g => g.isPushing).length;
    const stagnantCount = t5Data.filter(g => g.isStagnant).length;

    const formatShortNum = (num) => {
        if (!num) return "0";
        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    const handleExportCSV = () => {
        if (!filteredData || filteredData.length === 0) return;
        const headers = ["Governor ID", "Name", "Alliance", "CH", "Total Power", "Tech Power", "Tech Growth", "Building Power", "Building Growth", "Troop Power", "Troop Growth", "T5 Eligible"];
        const rows = filteredData.map(p => [
            p.id,
            `"${p.name.replace(/"/g, '""')}"`,
            p.alliance,
            p.townHall,
            p.powerEnd,
            p.currentTech,
            p.techDiff,
            p.currentBld,
            p.bldDiff,
            p.currentTroop,
            p.troopDiff,
            p.isEligible ? "Yes" : "No"
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Unity2_KD${targetKd}_T5_Push_Tracker.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] w-full max-w-[1600px] relative mt-4">
            {isCompiling && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#090b0e]/80 backdrop-blur-sm rounded-xl">
                    <div className="flex flex-col items-center gap-4">
                        <Activity className="w-8 h-8 text-cyan-500 animate-pulse" />
                        <span className="text-cyan-400 font-medium tracking-widest uppercase text-sm">Compiling T5 Radar...</span>
                    </div>
                </div>
            )}

            {/* Header Cards */}
            <div className="grid border border-[#1e222b] rounded-xl overflow-hidden shadow-2xl mb-4 bg-[#0d1117] relative">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                <div className="grid grid-cols-4 divide-x divide-[#1e222b]">
                    {/* CH 25s */}
                    <div className="p-4 flex flex-col justify-center items-center relative overflow-hidden group hover:bg-[#1a1e27] transition-colors">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Total CH 25s</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-white">{totalCH25}</span>
                            <span className="text-xs font-bold text-gray-500 mb-1">GOVS</span>
                        </div>
                    </div>
                    {/* Eligible */}
                    <div className="p-4 flex flex-col justify-center items-center relative overflow-hidden group hover:bg-[#1a1e27] transition-colors">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-2 flex items-center gap-1"><CheckCircle2 size={12}/> Eligible</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-white">{eligibleCount}</span>
                            <span className="text-xs font-bold text-gray-500 mb-1 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>{totalCH25 > 0 ? Math.round((eligibleCount/totalCH25)*100) : 0}%</span>
                        </div>
                    </div>
                    {/* Actively Pushing */}
                    <div className="p-4 flex flex-col justify-center items-center relative overflow-hidden group hover:bg-[#1a1e27] transition-colors">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 mb-2 flex items-center gap-1"><TrendingUp size={12}/> Pushing</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-white">{pushingCount}</span>
                            <span className="text-xs font-bold text-gray-500 mb-1 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-1 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>{totalCH25 > 0 ? Math.round((pushingCount/totalCH25)*100) : 0}%</span>
                        </div>
                    </div>
                    {/* Stagnant */}
                    <div className="p-4 flex flex-col justify-center items-center relative overflow-hidden group hover:bg-[#1a1e27] transition-colors">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Stagnant</span>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-white">{stagnantCount}</span>
                            <span className="text-xs font-bold text-gray-500 mb-1">{totalCH25 > 0 ? Math.round((stagnantCount/totalCH25)*100) : 0}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-[#1e222b] rounded-t-xl bg-[#0d1117] shrink-0">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#12161f] border border-[#1e222b] rounded-lg min-w-[200px]">
                        <Search size={14} className="text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search CH 25s..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none w-full"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={filteredData.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border border-[#1e222b] rounded-lg text-xs font-bold text-gray-300 hover:bg-[#1e222b] hover:text-white transition-colors disabled:opacity-50"
                    >
                        <Download size={14} />
                        EXPORT LIST
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="flex-1 border-x border-b border-[#1e222b] rounded-b-xl overflow-hidden bg-[#0a0d12] flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-[#1e222b]">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#0d1117] border-b border-[#1e222b] z-10 shadow-md">
                            <tr>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 w-[15%]">Governor</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right w-[10%]">Total Power</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/70 w-[20%]">Tech Power Progress</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/70 w-[20%]">Building Power Progress</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right w-[15%]">Troop Power & Growth</th>
                                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center w-[15%]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e222b]/50">
                            {filteredData.map((p) => (
                                <tr key={p.id} className="hover:bg-[#12161f] transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-200 text-sm truncate">{p.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="text-[10px] text-gray-600 bg-[#1e222b] px-1.5 py-0.5 rounded">ID: {p.id}</span>
                                                {p.alliance && p.alliance !== 'None' && (
                                                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">[{p.alliance}]</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-mono text-sm text-gray-300">{formatShortNum(p.powerEnd)}</div>
                                        {p.powerDiff > 0 && <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-0.5"><ChevronUp size={10}/>{formatShortNum(p.powerDiff)}</div>}
                                    </td>
                                    
                                    {/* Tech Progress */}
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-end">
                                                <span className="font-mono text-sm text-cyan-400">{formatShortNum(p.currentTech)}</span>
                                                <div className="flex items-center gap-2">
                                                    {p.techDiff > 0 && (
                                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded flex items-center"><ChevronUp size={10}/>{formatShortNum(p.techDiff)}</span>
                                                    )}
                                                    <span className="text-[10px] font-mono text-gray-600">/ 22.4M</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-[#1e222b] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${p.currentTech >= T5_TECH_FLOOR ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${p.techPct}%` }}></div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Building Progress */}
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-end">
                                                <span className="font-mono text-sm text-amber-400">{formatShortNum(p.currentBld)}</span>
                                                <div className="flex items-center gap-2">
                                                    {p.bldDiff > 0 && (
                                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded flex items-center"><ChevronUp size={10}/>{formatShortNum(p.bldDiff)}</span>
                                                    )}
                                                    <span className="text-[10px] font-mono text-gray-600">/ 14.7M</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-[#1e222b] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${p.currentBld >= T5_BUILDING_FLOOR ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${p.bldPct}%` }}></div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-right">
                                        <div className="font-mono text-sm text-rose-400/80">{formatShortNum(p.currentTroop)}</div>
                                        {p.troopDiff > 0 && (
                                            <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-0.5"><ChevronUp size={10}/>{formatShortNum(p.troopDiff)}</div>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        {p.isEligible ? (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                                <CheckCircle2 size={12} />
                                                Eligible
                                            </div>
                                        ) : p.isPushing ? (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-wider">
                                                <TrendingUp size={12} />
                                                Pushing
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e222b]/50 border border-[#1e222b] text-gray-500 text-[10px] font-black uppercase tracking-wider">
                                                Stagnant
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && !isCompiling && (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-500 font-medium">
                                        No CH 25 governors found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
