"use client";

import { useState } from "react";
import { Target, Activity, Zap, TrendingUp, Trophy, AlertTriangle, Crosshair, ArrowRight, Clock } from "lucide-react";

export default function Matchmaker() {
    const [targetKds, setTargetKds] = useState("");
    const [timeframe, setTimeframe] = useState("30");
    const [isScanning, setIsScanning] = useState(false);
    const [matchResult, setMatchResult] = useState(null);
    const [rawStats, setRawStats] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    const handleExecute = async (e) => {
        e.preventDefault();
        setErrorMsg("");
        setMatchResult(null);
        setRawStats(null);

        const kingdoms = targetKds
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        if (kingdoms.length < 2) {
            setErrorMsg("Please specify at least 2 kingdoms to compare.");
            return;
        }

        setIsScanning(true);

        try {
            let customGeminiKey = "";
            if (typeof window !== 'undefined') {
                try {
                    const prefs = JSON.parse(localStorage.getItem('unty_prefs') || "{}");
                    customGeminiKey = prefs.geminiKey || "";
                } catch(e) {}
            }

            const res = await fetch("/api/aws/matchmaker", {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(customGeminiKey ? { 'x-gemini-key': customGeminiKey } : {})
                },
                body: JSON.stringify({ kingdoms, timeframeDays: timeframe })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setMatchResult(data.aiReport);
                setRawStats(data.rawStats);
            } else {
                setErrorMsg(data.error || "AI Engine failed to process matrix.");
            }
        } catch (err) {
            setErrorMsg("Network Timeout communicating with AWS / Vision API.");
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="w-full mx-auto space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 mb-8 pb-8 border-b border-[#1e222b]/50">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Target className="text-fuchsia-500" size={28} /> AI Kingdom Matchmaker
                        </h1>
                        <p className="text-gray-400 text-sm max-w-2xl">
                            Deploy Gemini capabilities alongside the AWS Data Engine to evaluate Power Growth over time, Tech/Building Power totals, and high-activity spender indicators. 
                        </p>
                    </div>
                </div>

                <form onSubmit={handleExecute} className="space-y-6 relative z-10 w-full max-w-3xl">
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                        <div className="flex-1">
                            <label className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 block">
                                Target Kingdoms (Comma Separated)
                            </label>
                            <input 
                                type="text" 
                                value={targetKds}
                                onChange={(e) => setTargetKds(e.target.value)}
                                placeholder="e.g. 4022, 4023, 4025"
                                className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-fuchsia-500 text-white p-4 rounded-xl font-mono text-lg transition-all outline-none"
                                disabled={isScanning}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                                <Clock size={12}/> Temporal Scope
                            </label>
                            <select 
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value)}
                                className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-fuchsia-500 text-white p-4 rounded-xl font-mono text-lg transition-all outline-none appearance-none"
                                disabled={isScanning}
                            >
                                <option value="1">24 Hours</option>
                                <option value="7">7 Days</option>
                                <option value="30">30 Days</option>
                                <option value="720">All-Time</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            type="submit"
                            disabled={isScanning || !targetKds}
                            className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                                isScanning || !targetKds
                                    ? 'bg-fuchsia-500/20 text-fuchsia-500/50 cursor-not-allowed'
                                    : 'bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]'
                            }`}
                        >
                            {isScanning ? <Activity className="animate-spin" size={18} /> : <Zap size={18} />}
                            {isScanning ? 'Compiling AWS Matrices & AI Models...' : 'Execute Matchmaker Scan'}
                        </button>
                        
                        {errorMsg && (
                            <span className="text-rose-500 font-bold text-sm flex items-center gap-2 bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/20">
                                <AlertTriangle size={16}/> {errorMsg}
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {/* Results */}
            {matchResult && rawStats && (
                <div className="space-y-6 animate-fade-in w-full">

                    {/* Kingdom Comparison Cards - Hero Row */}
                    <div className={`grid gap-4 ${rawStats.length <= 2 ? 'grid-cols-2' : rawStats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
                        {rawStats.map((kdSt, idx) => {
                            const isWinner = String(kdSt.kingdomId) === String(matchResult.winner);
                            return (
                                <div key={idx} className={`rounded-2xl overflow-hidden border transition-all ${isWinner ? 'border-fuchsia-500/60 shadow-[0_0_30px_rgba(217,70,239,0.2)]' : 'border-[#1e222b]'}`}>
                                    <div className={`px-5 py-4 flex items-center justify-between ${isWinner ? 'bg-gradient-to-r from-fuchsia-500/20 to-[#0f1115]' : 'bg-[#13161c]'}`}>
                                        <div className="flex items-center gap-3">
                                            {isWinner && <Trophy size={16} className="text-fuchsia-400"/>}
                                            <span className="text-white font-mono font-black text-xl">KD {kdSt.kingdomId}</span>
                                        </div>
                                        {isWinner && <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400 border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-0.5 rounded">Winner</span>}
                                    </div>
                                    <div className="bg-[#0f1115] p-4 space-y-2 text-xs font-mono">
                                        <div className="flex justify-between items-center py-2 border-b border-[#1e222b]">
                                            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Power Δ Overall</span>
                                            <span className={`font-bold text-sm ${(kdSt.growthMetrics?.powerDeltaOverall || 0) >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                                                {(kdSt.growthMetrics?.powerDeltaOverall || 0) >= 0 ? '+' : ''}{(kdSt.growthMetrics?.powerDeltaOverall || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center px-1 py-1">
                                            <span className="text-gray-600">Tech Power</span>
                                            <span className="text-cyan-400 font-bold">{(kdSt.growthMetrics?.totalTechPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-1 py-1">
                                            <span className="text-gray-600">Commander Power</span>
                                            <span className="text-purple-400 font-bold">{(kdSt.growthMetrics?.totalCommanderPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-1 py-1 border-b border-[#1e222b] pb-3 mb-1">
                                            <span className="text-gray-600">Building Power</span>
                                            <span className="text-amber-400 font-bold">{(kdSt.growthMetrics?.totalBuildingPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-green-500/5 border border-green-500/10 px-2 py-1.5 rounded">
                                            <span className="text-green-500/70">↑ Recruited In</span>
                                            <span className="text-green-400 font-bold">+{(kdSt.behavioralMatrix?.migrantsInRecruitedPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-rose-500/5 border border-rose-500/10 px-2 py-1.5 rounded">
                                            <span className="text-rose-500/70">↓ Exodus Out</span>
                                            <span className="text-rose-400 font-bold">-{(kdSt.behavioralMatrix?.migrantsOutExodusPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-orange-500/5 border border-orange-500/10 px-2 py-1.5 rounded">
                                            <span className="text-orange-500/60">☾ Sleeping</span>
                                            <span className="text-orange-400 font-bold">{(kdSt.behavioralMatrix?.sleepingDeadWeightPower || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#13161c] px-4 py-3 border-t border-[#1e222b] flex justify-between items-center">
                                        <span className="text-gray-600 text-[10px] uppercase tracking-wider">Net Migration</span>
                                        {(() => {
                                            const net = (kdSt.behavioralMatrix?.migrantsInRecruitedPower || 0) - (kdSt.behavioralMatrix?.migrantsOutExodusPower || 0);
                                            return <span className={`font-mono font-bold text-sm ${net >= 0 ? 'text-green-400' : 'text-rose-400'}`}>{net >= 0 ? '+' : ''}{net.toLocaleString()}</span>;
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* AI Verdict - Full Width Below */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="border border-fuchsia-500/30 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(217,70,239,0.15)] flex flex-col">
                            <div className="bg-gradient-to-b from-[#1a1025] to-[#0f1115] p-8 text-center flex-1 flex flex-col justify-center items-center">
                                <Trophy className="text-fuchsia-500 mb-4 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]" size={48} />
                                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-2">Ideal Migration Choice</p>
                                <h3 className="text-5xl font-black text-white font-mono">[{matchResult.winner}]</h3>
                            </div>
                            <div className="bg-[#13161c] p-5 text-center border-t border-fuchsia-500/20">
                                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1">AI Confidence</span>
                                <span className="text-2xl font-bold text-fuchsia-400 font-mono">{matchResult.confidenceScore}</span>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-2xl shadow-xl p-8 flex flex-col gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Crosshair size={20} className="text-fuchsia-500" />
                                    <h3 className="text-xl font-bold text-white">Executive Verdict</h3>
                                </div>
                                <p className="text-gray-300 leading-relaxed italic border-l-4 border-fuchsia-500/50 pl-4">"{matchResult.verdictSummary}"</p>
                            </div>
                            <div>
                                <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <TrendingUp size={12}/> Spending Signature
                                </h4>
                                <div className="bg-fuchsia-500/5 border border-fuchsia-500/20 p-4 rounded-xl text-fuchsia-300/80 text-sm leading-relaxed">
                                    {matchResult.spendingSignature}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Activity size={12}/> Competitive Analysis
                                </h4>
                                <div className="space-y-2">
                                    {matchResult.competitiveAnalysis && matchResult.competitiveAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-[#13161c] border border-[#1e222b] p-4 rounded-lg flex items-start gap-3">
                                            <div className="bg-[#1e222b] text-white font-mono font-bold px-2 py-0.5 rounded text-xs shrink-0 mt-0.5">KD {item.kd}</div>
                                            <div className="text-gray-400 text-xs leading-relaxed">{item.assessment}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
