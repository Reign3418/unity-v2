"use client";

import { useState, useMemo, useEffect } from "react";
import { ShieldAlert, Activity, Swords, RefreshCw } from "lucide-react";

export default function AllianceDuelTab({ targetKd, trends, startDate, endDate }) {
    const [allianceA, setAllianceA] = useState("");
    const [allianceB, setAllianceB] = useState("");
    
    const [isCompiling, setIsCompiling] = useState(false);
    const [behavioralData, setBehavioralData] = useState([]);
    
    // DKP View State
    const [viewMode, setViewMode] = useState("growth");
    const [familyLinks, setFamilyLinks] = useState({});
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

    useEffect(() => {
        const fetchLinks = async () => {
            if (!targetKd) return;
            try {
                const res = await fetch(`/api/aws/admin/links?kd=${targetKd}`);
                if (res.ok) {
                    const data = await res.json();
                    setFamilyLinks(data || {});
                }
            } catch (err) {
                console.error("Failed to load family links", err);
            }
        };
        fetchLinks();
    }, [targetKd]);



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

    const processedBehavioralData = useMemo(() => {
        if (!behavioralData || behavioralData.length === 0) return [];
        
        const isBasic = config.dkpSystem === 'basic';
        const farmDeadsBaseline = config.farmDeadsBaseline || 500000;
        const farmKpBaseline = config.farmKpBaseline || 0;
        
        // Pass 1: Raw Output
        const baseCalculations = behavioralData.filter(g => g.powerEnd > 0).map(p => {
            const parsedDiff = (typeof p.powerDiff === 'number') ? p.powerDiff : 0;
            const powerStart = Math.max(0, (p.powerEnd || 0) - parsedDiff);
            const deadsDiff = Math.max(0, p.deadsDiff || 0);
            const t4Diff = Math.max(0, p.t4Diff || 0);
            const t5Diff = Math.max(0, p.t5Diff || 0);

            let rawKvkKP = 0;
            let targetDkp = 0;

            if (isBasic) {
                rawKvkKP = (t4Diff * (config.basicT4Points || 0)) + (t5Diff * (config.basicT5Points || 0));
                targetDkp = 0; 
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
            } else {
                rawKvkKP = (t4Diff * (config.advT4Points || 0)) + (t5Diff * (config.advT5Points || 0));
                const t4MixRatio = 1 - (config.t5MixRatio || 0);
                const kpTargetMultiplier = ((((config.t5MixRatio || 0) * (config.advT5Points || 0)) + (t4MixRatio * (config.advT4Points || 0))) * (config.kpMultiplier || 0)) / (config.kpPowerDivisor || 1);
                
                targetDkp = powerStart * kpTargetMultiplier;
            }

            return {
                ...p,
                targetDkp,
                rawKvkKP,
                rawDeadsDiff: deadsDiff,
                t4Diff,
                t5Diff,
                rolloverDeads: 0,
                rolloverKp: 0
            };
        });

        // Pass 2: The Overflow Siphon
        const govMap = {};
        baseCalculations.forEach(g => govMap[g.id] = g);

        Object.entries(familyLinks).forEach(([farmId, mainId]) => {
            const farm = govMap[farmId];
            const main = govMap[mainId];
            
            if (farm && main) {
                // Siphon Deads
                if (farm.rawDeadsDiff > farmDeadsBaseline) {
                    const excessDeads = farm.rawDeadsDiff - farmDeadsBaseline;
                    farm.rawDeadsDiff = farmDeadsBaseline;
                    main.rolloverDeads += excessDeads;
                }
                
                // Siphon KP
                if (farm.rawKvkKP > farmKpBaseline) {
                    const excessKp = farm.rawKvkKP - farmKpBaseline;
                    farm.rawKvkKP = farmKpBaseline;
                    main.rolloverKp += excessKp;
                }
            }
        });

        // Pass 3: Final Aggregations
        return baseCalculations.map(g => {
            const totalEffectiveDeads = g.rawDeadsDiff + g.rolloverDeads;
            const totalEffectiveKp = g.rawKvkKP + g.rolloverKp;
            
            let finalDkp = 0;

            if (isBasic) {
                finalDkp = totalEffectiveKp + (totalEffectiveDeads * (config.basicDeadsPoints || 0));
            } else {
                finalDkp = totalEffectiveKp;
            }

            return {
                ...g,
                finalDkp,
                targetDkp: g.targetDkp || 0
            };
        });
    }, [behavioralData, config, familyLinks]);

    const statsDetail = useMemo(() => {
        if (!processedBehavioralData) return { A: null, B: null };

        const calculateStats = (tag) => {
            if (!tag) return null;
            const rows = processedBehavioralData.filter(g => g.alliance === tag);
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
                latestBuilding: rows.reduce((sum, r) => sum + (r.bldEnd || 0), 0),

                totalDkp: rows.reduce((sum, r) => sum + (r.finalDkp || 0), 0),
                targetDkp: rows.reduce((sum, r) => sum + (r.targetDkp || 0), 0),
                t4Kills: rows.reduce((sum, r) => sum + (r.t4Diff || 0), 0),
                t5Kills: rows.reduce((sum, r) => sum + (r.t5Diff || 0), 0),
            };
        };

        return {
            A: calculateStats(allianceA),
            B: calculateStats(allianceB)
        };
    }, [processedBehavioralData, allianceA, allianceB]);

    const formatShortNum = (num) => {
        if (!num) return '0';
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        if (absNum >= 1000000000) return sign + (absNum / 1000000000).toFixed(2) + 'B';
        if (absNum >= 1000000) return sign + (absNum / 1000000).toFixed(1) + 'M';
        if (absNum >= 1000) return sign + (absNum / 1000).toFixed(1) + 'K';
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
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl flex flex-col justify-start space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 flex">
                            <div className="h-full w-1/2 bg-blue-500/50"></div>
                            <div className="h-full w-1/2 bg-red-500/50"></div>
                        </div>

                        {/* Flip Switch */}
                        <div className="flex bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-1 mx-auto w-fit z-10 shadow-inner">
                            <button 
                                onClick={() => setViewMode("growth")} 
                                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === "growth" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md" : "text-gray-500 hover:text-white"}`}
                            >
                                Growth Matrix
                            </button>
                            <button 
                                onClick={() => setViewMode("dkp")} 
                                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === "dkp" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-md" : "text-gray-500 hover:text-white"}`}
                            >
                                DKP Matrix
                            </button>
                        </div>

                        <h3 className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2 flex items-center justify-center gap-2">
                            <Activity className="w-4 h-4" /> {viewMode === 'growth' ? 'Growth Dominance' : 'DKP Dominance'} Matrix
                        </h3>
                        
                        {viewMode === 'growth' ? (
                            <>
                                {renderCompactBar('Power Growth', statsDetail.A.powerGrowth, statsDetail.B.powerGrowth)}
                                {renderCompactBar('Kill Points Gained', statsDetail.A.kpGrowth, statsDetail.B.kpGrowth)}
                                {renderCompactBar('Casualties (Deads)', statsDetail.A.deadsGrowth, statsDetail.B.deadsGrowth)}
                                {renderCompactBar('Tech Growth', statsDetail.A.techGrowth, statsDetail.B.techGrowth)}
                                {renderCompactBar('Building Growth', statsDetail.A.buildingGrowth, statsDetail.B.buildingGrowth)}
                                {renderCompactBar('Combat Ready Roster', statsDetail.A.members, statsDetail.B.members, false)}
                            </>
                        ) : (
                            <>
                                {renderCompactBar('Total DKP Score', statsDetail.A.totalDkp, statsDetail.B.totalDkp)}
                                {config.dkpSystem !== 'basic' && renderCompactBar('Target DKP', statsDetail.A.targetDkp, statsDetail.B.targetDkp)}
                                {renderCompactBar('T4 Kills Gained', statsDetail.A.t4Kills, statsDetail.B.t4Kills)}
                                {renderCompactBar('T5 Kills Gained', statsDetail.A.t5Kills, statsDetail.B.t5Kills)}
                                {renderCompactBar('Casualties (Deads)', statsDetail.A.deadsGrowth, statsDetail.B.deadsGrowth)}
                                {renderCompactBar('Combat Ready Roster', statsDetail.A.members, statsDetail.B.members, false)}
                            </>
                        )}
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
