"use client";

import { useState, useMemo, useEffect } from "react";
import { ShieldAlert, Activity, Swords, RefreshCw } from "lucide-react";

export default function AllianceDuelTab({ targetKd, trends }) {
    const [allianceA, setAllianceA] = useState("");
    const [allianceB, setAllianceB] = useState("");
    
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isCompiling, setIsCompiling] = useState(false);
    const [behavioralData, setBehavioralData] = useState([]);

    const extractDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0].split(' ')[0].split('_')[0];
    };

    useEffect(() => {
        if (trends && trends.length > 0 && !startDate && !endDate) {
            setEndDate(extractDate(trends[trends.length - 1].scanDate));
            setStartDate(extractDate(trends[0].scanDate));
        }
    }, [trends]);

    useEffect(() => {
        const fetchBehavioralData = async () => {
            if (!targetKd || !startDate || !endDate) return;
            setIsCompiling(true);
            try {
                const res = await fetch(`/api/aws/behavior?kd=${targetKd}&start=${startDate}&end=${endDate}&_t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    setBehavioralData(data.roster || []);
                }
            } catch (err) {
                console.error("[Duel Fetch] Exception: ", err);
            }
            setIsCompiling(false);
        };
        fetchBehavioralData();
    }, [targetKd, startDate, endDate]);

    const uniqueAlliances = useMemo(() => {
        if (!behavioralData || behavioralData.length === 0) return [];
        return [...new Set(behavioralData.map(g => g.alliance))].filter(a => a && a !== 'Unknown').sort();
    }, [behavioralData]);

    const statsDetail = useMemo(() => {
        if (!behavioralData) return { A: null, B: null };

        const calculateStats = (tag) => {
            if (!tag) return null;
            const rows = behavioralData.filter(g => g.alliance === tag);
            if (rows.length === 0) return null;

            return {
                tag,
                members: rows.length,
                powerGrowth: rows.reduce((sum, r) => sum + (r.powerDiff || 0), 0),
                kpGrowth: rows.reduce((sum, r) => sum + (r.kpDiff || 0), 0),
                deadsGrowth: rows.reduce((sum, r) => sum + (r.deadsDiff || 0), 0),
                techGrowth: rows.reduce((sum, r) => sum + (r.techPowerDiff || 0), 0),
                buildingGrowth: rows.reduce((sum, r) => sum + (r.bldPowerDiff || 0), 0),
                commanderGrowth: rows.reduce((sum, r) => sum + (r.commanderPowerDiff || 0), 0),
                
                latestPower: rows.reduce((sum, r) => sum + (r.powerEnd || 0), 0),
                latestTech: rows.reduce((sum, r) => sum + (r.techEnd || 0), 0),
                latestBuilding: rows.reduce((sum, r) => sum + (r.bldEnd || 0), 0)
            };
        };

        return {
            A: calculateStats(allianceA),
            B: calculateStats(allianceB)
        };
    }, [behavioralData, allianceA, allianceB]);

    const formatShortNum = (num) => {
        if (!num) return '0';
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(0);
    };

    const renderCompactBar = (label, valA, valB, format = true) => {
        const total = Math.abs(valA) + Math.abs(valB);
        const perA = total === 0 ? 50 : (Math.abs(valA) / total) * 100;
        const perB = total === 0 ? 50 : (Math.abs(valB) / total) * 100;
        
        const displayA = format ? formatShortNum(valA) : valA;
        const displayB = format ? formatShortNum(valB) : valB;

        let titleColor = "text-gray-400";
        if (valA > valB) titleColor = "text-blue-400";
        if (valB > valA) titleColor = "text-red-400";

        return (
            <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-[#2d323e] transition-colors">
                 <div className="flex justify-between items-center mb-3">
                     <span className="text-blue-400 font-mono font-bold text-sm bg-blue-500/10 px-2 py-0.5 rounded outline outline-1 outline-blue-500/20">{displayA}</span>
                     <span className={`text-[10px] uppercase tracking-widest font-black ${titleColor}`}>{label}</span>
                     <span className="text-red-400 font-mono font-bold text-sm bg-red-500/10 px-2 py-0.5 rounded outline outline-1 outline-red-500/20">{displayB}</span>
                 </div>
                 <div className="flex w-full h-3 rounded-full bg-[#0a0c0f] overflow-hidden border border-[#2d323e]">
                     <div style={{ width: `${perA}%` }} className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000 relative">
                        <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                     </div>
                     <div style={{ width: `${perB}%` }} className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-1000 relative">
                        <div className="absolute inset-0 bg-black/10 w-full"></div>
                     </div>
                 </div>
                 <div className="flex justify-between mt-1 text-[8px] font-bold text-gray-500 tracking-widest">
                     <span>{perA.toFixed(1)}% DOMINANCE</span>
                     <span>{perB.toFixed(1)}% DOMINANCE</span>
                 </div>
            </div>
        );
    };

    if (isCompiling) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-cyan-500 animate-pulse shadow-xl">
                <RefreshCw className="w-12 h-12 mb-4 animate-spin opacity-50" />
                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">Synchronizing Matrix</h3>
                <p className="text-sm">Calculating Kingdom Longitudinal Growth Patterns...</p>
            </div>
        );
    }

    if (!behavioralData || behavioralData.length === 0) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500 animate-fade-in shadow-xl">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-rose-500" />
                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">System Offline</h3>
                <p className="text-sm">Cannot initiate Duel protocol. Ensure Behavioral Longitudinal matrices are synchronized.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            {/* The Arena Selectors */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent"></div>
                
                {/* Alliance A (Blue) */}
                <div className="w-full md:w-1/3 z-10">
                    <label className="block text-[10px] font-bold text-blue-400 mb-2 uppercase tracking-widest">Combatant Alpha</label>
                    <select 
                        value={allianceA} 
                        onChange={(e) => setAllianceA(e.target.value)}
                        className="w-full bg-[#13161c] text-white border border-blue-500/50 rounded-lg p-3 outline-none font-bold uppercase tracking-wider text-sm focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all appearance-none cursor-pointer"
                    >
                        <option value="">-- SELECT ALLIANCE --</option>
                        {uniqueAlliances.map(a => (
                            <option key={`a-${a}`} value={a} disabled={a === allianceB}>{a}</option>
                        ))}
                    </select>
                </div>

                {/* VS Badge */}
                <div className="shrink-0 flex flex-col items-center justify-center z-10">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.5)] border-4 border-[#0f1115]">
                        <Swords className="w-8 h-8 text-black" />
                    </div>
                </div>

                {/* Alliance B (Red) */}
                <div className="w-full md:w-1/3 z-10 text-right">
                    <label className="block text-[10px] font-bold text-red-500 mb-2 uppercase tracking-widest">Combatant Beta</label>
                    <select 
                        value={allianceB} 
                        onChange={(e) => setAllianceB(e.target.value)}
                        className="w-full bg-[#13161c] text-white border border-red-500/50 rounded-lg p-3 outline-none font-bold uppercase tracking-wider text-sm focus:border-red-400 focus:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all appearance-none cursor-pointer text-right"
                        dir="rtl"
                    >
                        <option value="">-- SELECT ALLIANCE --</option>
                        {uniqueAlliances.map(a => (
                            <option key={`b-${a}`} value={a} disabled={a === allianceA}>{a}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Duel Analysis Grid */}
            {statsDetail.A && statsDetail.B && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                    
                    {/* Combatant A Card */}
                    <div className="bg-[#0f1115] border border-blue-500/30 rounded-xl p-8 shadow-[0_0_40px_rgba(59,130,246,0.1)] relative overflow-hidden flex flex-col items-center justify-center">
                        <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-blue-400 to-blue-700"></div>
                        <div className="w-24 h-24 rounded-2xl bg-[#13161c] border border-blue-500/50 flex items-center justify-center text-4xl font-black text-blue-400/80 mb-6 shadow-inner tracking-tighter">
                            {statsDetail.A.tag.substring(0,3)}
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">{statsDetail.A.tag}</h2>
                        <span className="text-xs text-blue-400 font-bold uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-8">
                            Alliance Alpha
                        </span>

                        <div className="w-full bg-[#13161c] rounded-xl border border-[#1e222b] p-4 text-center mb-4">
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block mb-1">Total Power Footprint</span>
                            <span className="text-3xl font-black text-white font-mono">{formatShortNum(statsDetail.A.latestPower)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 w-full text-center">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest block mb-1">Structure</span>
                                <span className="text-sm font-black text-emerald-400 font-mono">{formatShortNum(statsDetail.A.latestBuilding)}</span>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest block mb-1">Research</span>
                                <span className="text-sm font-black text-purple-400 font-mono">{formatShortNum(statsDetail.A.latestTech)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Head to Head Sliders */}
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl flex flex-col justify-center space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 flex">
                            <div className="h-full w-1/2 bg-blue-500/50"></div>
                            <div className="h-full w-1/2 bg-red-500/50"></div>
                        </div>
                        <h3 className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                            <Activity className="w-4 h-4" /> Growth Dominance Matrix
                        </h3>
                        
                        {renderCompactBar('Power Growth', statsDetail.A.powerGrowth, statsDetail.B.powerGrowth)}
                        {renderCompactBar('Kill Points Gained', statsDetail.A.kpGrowth, statsDetail.B.kpGrowth)}
                        {renderCompactBar('Casualties (Deads)', statsDetail.A.deadsGrowth, statsDetail.B.deadsGrowth)}
                        {renderCompactBar('Tech Growth', statsDetail.A.techGrowth, statsDetail.B.techGrowth)}
                        {renderCompactBar('Building Growth', statsDetail.A.buildingGrowth, statsDetail.B.buildingGrowth)}
                        {renderCompactBar('Combat Ready Roster', statsDetail.A.members, statsDetail.B.members, false)}
                    </div>

                    {/* Combatant B Card */}
                    <div className="bg-[#0f1115] border border-red-500/30 rounded-xl p-8 shadow-[0_0_40px_rgba(239,68,68,0.1)] relative overflow-hidden flex flex-col items-center justify-center">
                        <div className="absolute top-0 w-full h-2 bg-gradient-to-l from-red-400 to-red-700"></div>
                        <div className="w-24 h-24 rounded-2xl bg-[#13161c] border border-red-500/50 flex items-center justify-center text-4xl font-black text-red-500/80 mb-6 shadow-inner tracking-tighter">
                            {statsDetail.B.tag.substring(0,3)}
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">{statsDetail.B.tag}</h2>
                        <span className="text-xs text-red-400 font-bold uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 mb-8">
                            Alliance Beta
                        </span>

                        <div className="w-full bg-[#13161c] rounded-xl border border-[#1e222b] p-4 text-center mb-4">
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block mb-1">Total Power Footprint</span>
                            <span className="text-3xl font-black text-white font-mono">{formatShortNum(statsDetail.B.latestPower)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 w-full text-center">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest block mb-1">Structure</span>
                                <span className="text-sm font-black text-emerald-400 font-mono">{formatShortNum(statsDetail.B.latestBuilding)}</span>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest block mb-1">Research</span>
                                <span className="text-sm font-black text-purple-400 font-mono">{formatShortNum(statsDetail.B.latestTech)}</span>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
