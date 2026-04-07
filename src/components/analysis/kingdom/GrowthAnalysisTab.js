"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, RefreshCw, ShieldAlert, FileText, Download, Target, Search, Filter, Sparkles, Crosshair, Bot, X, Loader2 } from "lucide-react";

export default function GrowthAnalysisTab({ targetKd, trends }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isCompiling, setIsCompiling] = useState(false);
    const [behavioralRoster, setBehavioralRoster] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [allianceFilter, setAllianceFilter] = useState("");
    const [gradeFilter, setGradeFilter] = useState("ALL");

    // Coach State
    // Coach State
    const [coachModal, setCoachModal] = useState({ isOpen: false, data: null, isLoading: false, advice: "" });
    const [kingdomState, setKingdomState] = useState("Peace");

    // Bulletproof Date Extractor
    const extractDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0].split(' ')[0].split('_')[0];
    };

    // Auto-Set Dates 
    useEffect(() => {
        if (trends && trends.length > 0 && !startDate && !endDate) {
            const rawEnd = extractDate(trends[trends.length - 1].scanDate);
            setEndDate(rawEnd);
            const rawStart = extractDate(trends[0].scanDate);
            setStartDate(rawStart);
        }
    }, [trends]);

    // Async Fetcher (Same Pipeline as ScatterPlot)
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
                    console.warn(`[Growth Fetch] Error ${res.status}`);
                }
            } catch (err) {
                console.error("[Growth Fetch] Match Exception: ", err);
            }
            setIsCompiling(false);
        };
        fetchBehavioralData();
    }, [targetKd, startDate, endDate]);

    // ----------------------------------------------------------------------
    // MATHEMATICAL GRADING ENGINE (V1 Port -> V2 React Hook)
    // ----------------------------------------------------------------------
    const growthData = useMemo(() => {
        if (!behavioralRoster || behavioralRoster.length === 0) return [];

        // Exclude strictly 0-power ghosts
        const validRoster = behavioralRoster.filter(g => g.powerEnd > 0);
        
        // 95th Percentile Baselines (Protects against anomalous Whales warping the grading curve)
        const getPercentile = (arr, valFn, p = 0.95) => {
            const values = arr.map(valFn).sort((a, b) => a - b);
            if (values.length === 0) return 1;
            const index = Math.floor(values.length * p);
            return values[index] || values[values.length - 1] || 1;
        };

        // Extract Baselines (Ensuring we don't divide by zero if kingdom is dead)
        const maxKP = Math.max(1, getPercentile(validRoster, p => p.kpDiff));
        const maxDeads = Math.max(1, getPercentile(validRoster, p => p.deadsDiff));
        const maxTech = Math.max(1, getPercentile(validRoster, p => p.techPowerDiff));
        const maxBld = Math.max(1, getPercentile(validRoster, p => p.bldPowerDiff));
        const maxTroop = Math.max(1, getPercentile(validRoster, p => p.troopPowerDiff));
        const maxGathered = Math.max(1, getPercentile(validRoster, p => p.gatheredDiff));

        // Growth Configuration (Legacy Weights)
        const WEIGHTS = { TECH: 25, BLD: 25, TROOP: 25, KP: 12, DEADS: 8, GATHERED: 5 };
        const CAP = 1.25; // 125% Maximum structural overflow limit

        const determineGrade = (score) => {
            if (score >= 80) return 'S';
            if (score >= 60) return 'A';
            if (score >= 40) return 'B';
            if (score >= 20) return 'C';
            return 'D';
        };

        const determineArchetype = (p, mxKP, mxDeads, mxFarm) => {
            const isHighKP = p.kpDiff > (mxKP * 0.4);
            const isHighDeads = p.deadsDiff > (mxDeads * 0.4);
            const isHighFarm = p.gatheredDiff > (mxFarm * 0.5);

            if (isHighKP && isHighDeads) return 'Warrior';
            if (isHighKP) return 'Brawler';
            if (isHighDeads) return 'Meatshield';
            if (isHighFarm) return 'Harvester';
            if (p.powerDiff > 0) return 'Grower';
            return 'Casual';
        };

        // Evaluate Array
        return validRoster.map(p => {
            // Guard Math.max(0) to prevent negative growth/deletions from artificially tanking parallel score arrays
            const sTech = Math.min(CAP, Math.max(0, p.techPowerDiff) / maxTech) * WEIGHTS.TECH;
            const sBld = Math.min(CAP, Math.max(0, p.bldPowerDiff) / maxBld) * WEIGHTS.BLD;
            const sTroop = Math.min(CAP, Math.max(0, p.troopPowerDiff) / maxTroop) * WEIGHTS.TROOP;
            
            const sKP = Math.min(CAP, Math.max(0, p.kpDiff) / maxKP) * WEIGHTS.KP;
            const sDeads = Math.min(CAP, Math.max(0, p.deadsDiff) / maxDeads) * WEIGHTS.DEADS;
            const sGathered = Math.min(CAP, Math.max(0, p.gatheredDiff) / maxGathered) * WEIGHTS.GATHERED;

            let finalScore = Math.max(0, Math.min(100, sKP + sDeads + sTech + sBld + sTroop + sGathered));
            
            return { 
                ...p, 
                finalScore, 
                grade: determineGrade(finalScore), 
                archetype: determineArchetype(p, maxKP * 1.5, maxDeads * 1.5, maxGathered * 1.5) 
            };
        }).sort((a, b) => b.finalScore - a.finalScore); // Default Stack Ranking

    }, [behavioralRoster]);

    const filteredData = useMemo(() => {
        return growthData.filter(g => {
            if (gradeFilter !== "ALL" && g.grade !== gradeFilter) return false;
            if (allianceFilter && g.alliance !== allianceFilter) return false;
            if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase()) && !g.id.toString().includes(searchQuery)) return false;
            return true;
        });
    }, [growthData, searchQuery, allianceFilter, gradeFilter]);

    const sTierCount = filteredData.filter(g => g.grade === 'S').length;
    const aTierCount = filteredData.filter(g => g.grade === 'A').length;
    const bTierCount = filteredData.filter(g => g.grade === 'B').length;
    const cTierCount = filteredData.filter(g => g.grade === 'C').length;
    const dTierCount = filteredData.filter(g => g.grade === 'D').length;
    const uniqueAlliances = [...new Set(growthData.map(g => g.alliance))].sort();

    const formatShortNum = (num) => {
        if (!num) return "0";
        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    // ----------------------------------------------------------------------
    // MAIL GENERATOR BRIDGE (V2 Pipeline)
    // ----------------------------------------------------------------------
    const generateReport = (type) => {
        if (!filteredData || filteredData.length === 0) return;

        let sorted = [...filteredData];
        if (type === 'gathering') {
            sorted.sort((a, b) => b.gatheredDiff - a.gatheredDiff);
        }

        let topMovers = 3;
        let bottomReview = 10;
        
        if (type === 'gathering') {
            topMovers = 5;
            bottomReview = 20; 
        }

        const topList = sorted.slice(0, topMovers);
        const bottomList = sorted.slice(-bottomReview).reverse(); 

        const allianceName = allianceFilter || "All Alliances";
        let reportTitle = type === 'combat' ? "Combat Report ⚔️" : type === 'growth' ? "Growth Report 📈" : "Gathering Report 🌾";
        
        let report = `${reportTitle}: <color=#000000><b>${allianceName}</b></color>\nScan Period: (${startDate} to ${endDate})\n\n`;

        if (type === 'gathering' && allianceFilter) {
            const totalGathered = filteredData.reduce((sum, p) => sum + (p.gatheredDiff || 0), 0);
            const totalAssistance = filteredData.reduce((sum, p) => sum + (p.assistDiff || 0), 0);
            report += `<b>Alliance Totals:</b>\n`;
            report += `Total Gathered: <color=#D2691E><b>${formatShortNum(totalGathered)}</b></color>\n`;
            report += `Total Assistance: <b>${formatShortNum(totalAssistance)}</b>\n\n`;
        }

        const formatRow = (p) => {
            const fmt = formatShortNum;
            if (type === 'growth') {
                return `(Tech:+${fmt(p.techPowerDiff)} Cdr:+${fmt(p.cmdPowerDiff)} Bld:+${fmt(p.bldPowerDiff)} RSS:+${fmt(p.gatheredDiff)} Asst:+${fmt(p.assistDiff)})`;
            } else if (type === 'gathering') {
                return `(Gathered: <color=#D2691E>+${fmt(p.gatheredDiff)}</color> | Asst: +${fmt(p.assistDiff)})`;
            } else {
                return `(Pwr:${p.powerDiff > 0 ? '+' : ''}${fmt(p.powerDiff)} KP:+${fmt(p.kpDiff)} Dds:+${fmt(p.deadsDiff)})`;
            }
        };

        const showTag = !allianceFilter; 

        let topHeader = (type === 'gathering') ? "🌾 TOP 5 HARVESTERS" : "🏆 TOP 3 MOVERS";
        report += `<color=#32CD32><b>${topHeader}</b></color>\n`;

        topList.forEach((p, i) => {
            let metricText = type === 'gathering' ? '' : `Sc:<color=#32CD32>${p.finalScore.toFixed(1)}</color> `;
            report += `${i + 1}. <b>${p.name}</b>${showTag ? ` [${p.alliance}]` : ''} ${metricText}${formatRow(p)}\n`;
        });

        let bottomHeader = (type === 'gathering') ? "⚠️ BOTTOM 20 GATHERERS (Review)" : "⚠️ BOTTOM 10 (Review)";
        report += `\n<color=#FF4500><b>${bottomHeader}</b></color>\n`;

        bottomList.forEach((p, i) => {
            let metricText = type === 'gathering' ? '' : `Sc:<color=#FF4500>${p.finalScore.toFixed(1)}</color> `;
            report += `${i + 1}. <b>${p.name}</b>${showTag ? ` [${p.alliance}]` : ''} ${metricText}${formatRow(p)}\n`;
        });

        report += `\nGenerated by Unity V2`;

        // Dispatch precisely mapped payload to the Mail Generator
        localStorage.setItem('unity_mail_roster', JSON.stringify([{
            name: 'Stack Ranking Extractor',
            customText: report
        }]));
        
        const locale = window.location.pathname.split('/')[1] || 'en';
        window.open(`/${locale}/mail`, '_blank');
    };

    const handleCoachClick = async (p) => {
        setCoachModal({ isOpen: true, data: p, isLoading: true, advice: "" });

        // Calculate Peer Averages (+/- 20% power band)
        const powerBand = (p.powerEnd || 0) * 0.20;
        const minPwr = (p.powerEnd || 0) - powerBand;
        const maxPwr = (p.powerEnd || 0) + powerBand;
        
        // Exclude the player themselves
        const peers = growthData.filter(g => g.id !== p.id && g.powerEnd >= minPwr && g.powerEnd <= maxPwr);

        let peerAvg = null;
        if (peers.length > 0) {
            peerAvg = {
                count: peers.length,
                powerDiff: Math.round(peers.reduce((acc, curr) => acc + (curr.powerDiff || 0), 0) / peers.length),
                kpDiff: Math.round(peers.reduce((acc, curr) => acc + (curr.kpDiff || 0), 0) / peers.length),
                deadsDiff: Math.round(peers.reduce((acc, curr) => acc + (curr.deadsDiff || 0), 0) / peers.length),
                techPowerDiff: Math.round(peers.reduce((acc, curr) => acc + (curr.techPowerDiff || 0), 0) / peers.length),
                cmdPowerDiff: Math.round(peers.reduce((acc, curr) => acc + (curr.cmdPowerDiff || 0), 0) / peers.length),
                bldPowerDiff: Math.round(peers.reduce((acc, curr) => acc + (curr.bldPowerDiff || 0), 0) / peers.length),
                troopPowerDiff: Math.round(peers.reduce((acc, curr) => acc + (curr.troopPowerDiff || 0), 0) / peers.length),
                gatheredDiff: Math.round(peers.reduce((acc, curr) => acc + (curr.gatheredDiff || 0), 0) / peers.length)
            };
        }

        try {
            const payload = {
                ...p,
                kingdomState,
                startDate,
                endDate,
                peerAvg
            };
            const res = await fetch('/api/aws/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setCoachModal(prev => ({ ...prev, isLoading: false, advice: data.advice }));
            } else {
                setCoachModal(prev => ({ ...prev, isLoading: false, advice: "ERROR: Failed to connect to AI Coach Engine." }));
            }
        } catch (err) {
            console.error("Coach API error:", err);
            setCoachModal(prev => ({ ...prev, isLoading: false, advice: "ERROR: Network unreachable." }));
        }
    };

    return (
        <div className="w-full space-y-6 animate-fade-in relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                        Growth & Grading
                        <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded border border-purple-500/20">V2 AI-ENGINE</span>
                    </h2>
                    <p className="text-gray-400 mt-2 text-sm font-mono relative z-20">AI-driven analysis of player growth, activity, and combat trajectory.</p>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                    <button 
                        onClick={() => setKingdomState(s => s === "Peace" ? "War" : "Peace")}
                        className={`px-4 flex items-center justify-center rounded-lg border text-xs font-black uppercase tracking-widest transition-colors ${
                            kingdomState === "Peace" 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                        }`}
                        title="Toggles whether AI should care about kill points and deads"
                    >
                        {kingdomState === "Peace" ? "🕊️ At Peace" : "⚔️ At War"}
                    </button>
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
                </div>
            </div>

            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-2xl p-6 relative overflow-hidden">
                {isCompiling && (
                    <div className="absolute inset-0 bg-[#0f1115]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                        <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                        <h3 className="text-white font-black tracking-widest uppercase text-xl animate-pulse">Computing Baseline Grades</h3>
                        <p className="text-purple-400 font-mono text-xs tracking-widest uppercase mt-2">Running 95th Percentile Evaluation Matrix...</p>
                    </div>
                )}

                {/* Filters & Actions Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 flex gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Search Governor..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#13161c] border border-[#1e222b] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-purple-500 outline-none transition-colors"
                            />
                        </div>
                        <select 
                            value={allianceFilter}
                            onChange={(e) => setAllianceFilter(e.target.value)}
                            className="bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-2 text-sm text-white focus:border-purple-500 outline-none cursor-pointer"
                        >
                            <option value="">All Alliances</option>
                            {uniqueAlliances.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={() => generateReport('combat')} className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">
                            <Crosshair className="w-4 h-4" />
                            Combat Report
                        </button>
                        <button onClick={() => generateReport('growth')} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">
                            <TrendingUp className="w-4 h-4" />
                            Growth Report
                        </button>
                        <button onClick={() => generateReport('gathering')} className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">
                            <Sparkles className="w-4 h-4" />
                            Gathering Report
                        </button>
                    </div>
                </div>

                {/* Trophy Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    <div 
                        onClick={() => setGradeFilter(gradeFilter === 'S' ? 'ALL' : 'S')}
                        className={`bg-[#13161c] border ${gradeFilter === 'S' ? 'border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-[#1e222b]'} rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-amber-500/50 transition-all cursor-pointer`}
                    >
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
                        <h3 className="text-amber-400/80 font-bold uppercase tracking-widest text-[10px] mb-1 flex items-center gap-1">
                            S-Tier (Gods) {gradeFilter === 'S' && <Sparkles className="w-3 h-3 text-amber-400" />}
                        </h3>
                        <div className="text-3xl font-black text-white group-hover:scale-110 transition-transform">{sTierCount}</div>
                    </div>
                    <div 
                        onClick={() => setGradeFilter(gradeFilter === 'A' ? 'ALL' : 'A')}
                        className={`bg-[#13161c] border ${gradeFilter === 'A' ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-[#1e222b]'} rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-500/50 transition-all cursor-pointer`}
                    >
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                        <h3 className="text-emerald-400/80 font-bold uppercase tracking-widest text-[10px] mb-1 flex items-center gap-1">
                            A-Tier (Elite) {gradeFilter === 'A' && <Sparkles className="w-3 h-3 text-emerald-400" />}
                        </h3>
                        <div className="text-3xl font-black text-white group-hover:scale-110 transition-transform">{aTierCount}</div>
                    </div>
                    <div 
                        onClick={() => setGradeFilter(gradeFilter === 'B' ? 'ALL' : 'B')}
                        className={`bg-[#13161c] border ${gradeFilter === 'B' ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-[#1e222b]'} rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500/50 transition-all cursor-pointer`}
                    >
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                        <h3 className="text-blue-400/80 font-bold uppercase tracking-widest text-[10px] mb-1 flex items-center gap-1">
                            B-Tier (Vanguard) {gradeFilter === 'B' && <Sparkles className="w-3 h-3 text-blue-400" />}
                        </h3>
                        <div className="text-3xl font-black text-white group-hover:scale-110 transition-transform">{bTierCount}</div>
                    </div>
                    <div 
                        onClick={() => setGradeFilter(gradeFilter === 'C' ? 'ALL' : 'C')}
                        className={`bg-[#13161c] border ${gradeFilter === 'C' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-[#1e222b]'} rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-orange-500/50 transition-all cursor-pointer`}
                    >
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>
                        <h3 className="text-orange-400/80 font-bold uppercase tracking-widest text-[10px] mb-1 flex items-center gap-1">
                            C-Tier (Reserve) {gradeFilter === 'C' && <Sparkles className="w-3 h-3 text-orange-400" />}
                        </h3>
                        <div className="text-3xl font-black text-white group-hover:scale-110 transition-transform">{cTierCount}</div>
                    </div>
                    <div 
                        onClick={() => setGradeFilter(gradeFilter === 'D' ? 'ALL' : 'D')}
                        className={`bg-[#13161c] border ${gradeFilter === 'D' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-[#1e222b]'} rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-red-500/50 transition-all cursor-pointer`}
                    >
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
                        <h3 className="text-red-500/80 font-bold uppercase tracking-widest text-[10px] mb-1 flex items-center gap-1">
                            D-Tier (Review) {gradeFilter === 'D' && <Sparkles className="w-3 h-3 text-red-500" />}
                        </h3>
                        <div className="text-3xl font-black text-white group-hover:scale-110 transition-transform">{dTierCount}</div>
                    </div>
                </div>

                {/* Main Data Table View */}
                <div className="w-full overflow-x-auto border-t border-[#1e222b] pt-4">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#1e222b]">
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">Governor</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">Growth Score</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">Grade</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">Archetype</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">Power Δ</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">KP Δ</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">Deads Δ</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">Gathered Δ</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest text-center">AI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(p => {
                                let gradeColor = "text-gray-500 border-gray-500/20 bg-gray-500/10";
                                if (p.grade === 'S') gradeColor = "text-amber-400 border-amber-400/20 bg-amber-400/10";
                                if (p.grade === 'A') gradeColor = "text-emerald-400 border-emerald-400/20 bg-emerald-400/10";
                                if (p.grade === 'B') gradeColor = "text-blue-400 border-blue-400/20 bg-blue-400/10";
                                if (p.grade === 'C') gradeColor = "text-orange-400 border-orange-400/20 bg-orange-400/10";
                                if (p.grade === 'D') gradeColor = "text-red-500 border-red-500/20 bg-red-500/10";

                                let archColor = "text-gray-400 bg-gray-500/10 border-gray-500/20";
                                if (p.archetype === 'Warrior') archColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                                if (p.archetype === 'Brawler') archColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                                if (p.archetype === 'Meatshield') archColor = "text-red-400 bg-red-500/10 border-red-500/20";
                                if (p.archetype === 'Harvester') archColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
                                if (p.archetype === 'Grower') archColor = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";

                                return (
                                    <tr key={p.id} className="border-b border-[#1e222b] hover:bg-[#13161c] transition-colors">
                                        <td className="p-3">
                                            <div className="font-bold text-white text-sm">{p.name}</div>
                                            <div className="text-xs text-cyan-500 font-mono tracking-wider">[{p.alliance}]</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-black text-white text-lg">{p.finalScore.toFixed(1)}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-3 py-1 rounded text-xs font-black border tracking-widest ${gradeColor}`}>
                                                {p.grade}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded border tracking-wider uppercase ${archColor}`}>
                                                {p.archetype}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className={`font-bold font-mono text-sm ${p.powerDiff >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                                {p.powerDiff > 0 ? '+' : ''}{formatShortNum(p.powerDiff)}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono">Troop: {formatShortNum(p.troopPowerDiff)}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold font-mono text-sm text-emerald-400">+{formatShortNum(p.kpDiff)}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">Tech: {formatShortNum(p.techPowerDiff)}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold font-mono text-sm text-red-500">+{formatShortNum(p.deadsDiff)}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">Cmdr: {formatShortNum(p.cmdPowerDiff)}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold font-mono text-sm text-yellow-500">+{formatShortNum(p.gatheredDiff)}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">Asst: {formatShortNum(p.assistDiff)}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => handleCoachClick(p)}
                                                className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 transition-all flex items-center justify-center group relative overflow-hidden"
                                                title="AI Coach Recommendations"
                                            >
                                                <Bot className="w-4 h-4 group-hover:scale-110 transition-transform relative z-10" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredData.length === 0 && !isCompiling && (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                        No structural growth data matches your current interval or filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Coach Modal */}
            {coachModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#0f1115] border-2 border-indigo-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                        {/* Header */}
                        <div className="bg-indigo-950/40 p-4 border-b border-indigo-500/30 flex justify-between items-center relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/50">
                                    <Bot className="text-indigo-400 w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black tracking-widest uppercase text-sm">V2 AI-Engine Coach</h3>
                                    <p className="text-indigo-300/70 text-[10px] font-mono uppercase tracking-wider">Analyzing: {coachModal.data?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setCoachModal({ isOpen: false, data: null, isLoading: false, advice: "" })} className="text-gray-400 hover:text-white p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 relative min-h-[200px] flex flex-col justify-center">
                            {coachModal.isLoading ? (
                                <div className="flex flex-col items-center justify-center text-indigo-400">
                                    <Loader2 className="w-8 h-8 flex-shrink-0 animate-spin mb-4" />
                                    <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Consulting Tactical Database...</p>
                                </div>
                            ) : (
                                <div className="text-gray-300 font-sans text-sm leading-relaxed whitespace-pre-line prose prose-invert prose-indigo">
                                    {/* Using a simple custom parser to render bold asterisks as HTML */}
                                    <div dangerouslySetInnerHTML={{ __html: coachModal.advice.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-bold">$1</span>') }} />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-[#0a0c0f] p-4 border-t border-[#1e222b] flex justify-end">
                             <button 
                                onClick={() => setCoachModal({ isOpen: false, data: null, isLoading: false, advice: "" })}
                                className="px-6 py-2 bg-[#13161c] hover:bg-[#1e222b] text-gray-300 border border-[#2d323e] rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                             >
                                 Dismiss
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
