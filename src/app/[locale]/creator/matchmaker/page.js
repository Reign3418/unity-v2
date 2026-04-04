"use client";

import { useState } from "react";
import { Target, Activity, Zap, TrendingUp, Trophy, AlertTriangle, Crosshair, Clock, Shield, Users } from "lucide-react";

const Tooltip = ({ children, tip }) => {
    const [pos, setPos] = useState(null);
    return (
        <span
            className="relative inline-flex items-center gap-1 cursor-help"
            onMouseEnter={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                setPos({ x: rect.left + rect.width / 2, y: rect.top });
            }}
            onMouseLeave={() => setPos(null)}
        >
            <span className="border-b border-dotted border-gray-600">{children}</span>
            {pos && (
                <span
                    style={{
                        position: 'fixed',
                        left: pos.x,
                        top: pos.y - 8,
                        transform: 'translateX(-50%) translateY(-100%)',
                        zIndex: 9999,
                        width: '224px',
                        pointerEvents: 'none',
                    }}
                    className="bg-[#1a1d26] border border-[#2a3040] text-gray-300 text-[10px] leading-relaxed rounded-xl px-3 py-2.5 shadow-2xl"
                >
                    {tip}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2a3040]" />
                </span>
            )}
        </span>
    );
};


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
                                            <Tooltip tip="Net power change across all top 300 players. New recruits count as +power; exiting players count as -power. High growth = active spenders driving the kingdom forward.">
                                                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Power Δ Overall</span>
                                            </Tooltip>
                                            <span className={`font-bold text-sm ${(kdSt.growthMetrics?.powerDeltaOverall || 0) >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                                                {(kdSt.growthMetrics?.powerDeltaOverall || 0) >= 0 ? '+' : ''}{(kdSt.growthMetrics?.powerDeltaOverall || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center px-1 py-1">
                                            <Tooltip tip="Total technology research power of the Top 300. High tech power signals an organized kingdom that invests in permanent kingdom-wide upgrades.">
                                                <span className="text-gray-600">Tech Power</span>
                                            </Tooltip>
                                            <span className="text-cyan-400 font-bold">{(kdSt.growthMetrics?.totalTechPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-1 py-1">
                                            <Tooltip tip="Total commander star/skill power across the Top 300. Leveling commanders is gem-intensive — high values confirm players are actively spending.">
                                                <span className="text-gray-600">Commander Power</span>
                                            </Tooltip>
                                            <span className="text-purple-400 font-bold">{(kdSt.growthMetrics?.totalCommanderPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-1 py-1">
                                            <Tooltip tip="Total troop training power. Training T5 troops is extremely resource-heavy — this is arguably the strongest individual spending signal in the entire dataset.">
                                                <span className="text-gray-600">Troop Power</span>
                                            </Tooltip>
                                            <span className="text-red-400 font-bold">{(kdSt.growthMetrics?.totalTroopPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-1 py-1 border-b border-[#1e222b] pb-3 mb-1">
                                            <Tooltip tip="Total city construction power of the Top 300. Core progression metric — reflects how many players are actively building and upgrading their cities.">
                                                <span className="text-gray-600">Building Power</span>
                                            </Tooltip>
                                            <span className="text-amber-400 font-bold">{(kdSt.growthMetrics?.totalBuildingPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-green-500/5 border border-green-500/10 px-2 py-1.5 rounded">
                                            <Tooltip tip="Power of players who appear in the latest snapshot but not the historical one. Indicates active recruitment of strong governors — a sign of a healthy, growing kingdom.">
                                                <span className="text-green-500/70">↑ Recruited In</span>
                                            </Tooltip>
                                            <span className="text-green-400 font-bold">+{(kdSt.behavioralMatrix?.migrantsInRecruitedPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-rose-500/5 border border-rose-500/10 px-2 py-1.5 rounded">
                                            <Tooltip tip="Power of players present in the old snapshot who are completely gone now. High exodus strongly signals a leadership failure, coup, or mass defection event.">
                                                <span className="text-rose-500/70">↓ Exodus Out</span>
                                            </Tooltip>
                                            <span className="text-rose-400 font-bold">-{(kdSt.behavioralMatrix?.migrantsOutExodusPower || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-orange-500/5 border border-orange-500/10 px-2 py-1.5 rounded">
                                            <Tooltip tip="Power held by Top 300 players with zero power AND zero KP gain during the entire timeframe. These players are completely inactive — dead weight that hurts kingdom culture and motivation.">
                                                <span className="text-orange-500/60">☾ Sleeping</span>
                                            </Tooltip>
                                            <span className="text-orange-400 font-bold">{(kdSt.behavioralMatrix?.sleepingDeadWeightPower || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#13161c] px-4 py-3 border-t border-[#1e222b] flex justify-between items-center">
                                        <Tooltip tip="Recruited In minus Exodus Out power. Positive = the kingdom is a net winner of player movement. Negative = they are losing more power than they are gaining through migration.">
                                            <span className="text-gray-600 text-[10px] uppercase tracking-wider">Net Migration</span>
                                        </Tooltip>
                                        {(() => {
                                            const net = (kdSt.behavioralMatrix?.migrantsInRecruitedPower || 0) - (kdSt.behavioralMatrix?.migrantsOutExodusPower || 0);
                                            return <span className={`font-mono font-bold text-sm ${net >= 0 ? 'text-green-400' : 'text-rose-400'}`}>{net >= 0 ? '+' : ''}{net.toLocaleString()}</span>;
                                        })()}
                                    </div>

                                    {/* Leadership Intelligence Block */}
                                    {kdSt.leadershipIntel && (
                                        <div className="bg-[#0a0c0f] border-t border-[#1e222b] p-4 space-y-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Shield size={12} className="text-indigo-400" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Leadership Intel</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                                <div className={`px-2 py-2 rounded border text-center ${
                                                    kdSt.leadershipIntel.stabilityScore >= 80 ? 'bg-green-500/10 border-green-500/20' :
                                                    kdSt.leadershipIntel.stabilityScore >= 60 ? 'bg-yellow-500/10 border-yellow-500/20' :
                                                    'bg-rose-500/10 border-rose-500/20'
                                                }`}>
                                                    <div className={`text-lg font-black ${
                                                        kdSt.leadershipIntel.stabilityScore >= 80 ? 'text-green-400' :
                                                        kdSt.leadershipIntel.stabilityScore >= 60 ? 'text-yellow-400' : 'text-rose-400'
                                                    }`}>{kdSt.leadershipIntel.stabilityScore}%</div>
                                                    <Tooltip tip="% of the old Top 20 leaders still in the current Top 20. ≥80% = stable leadership. 60-79% = some churn. Below 60% = RED FLAG — likely a coup, defection wave, or forced leadership change.">
                                                        <div className="text-gray-600 text-[9px] uppercase tracking-wide mt-0.5">Stability</div>
                                                    </Tooltip>
                                                </div>
                                                <div className={`px-2 py-2 rounded border text-center ${
                                                    kdSt.leadershipIntel.activityRate >= 70 ? 'bg-green-500/10 border-green-500/20' :
                                                    kdSt.leadershipIntel.activityRate >= 50 ? 'bg-yellow-500/10 border-yellow-500/20' :
                                                    'bg-rose-500/10 border-rose-500/20'
                                                }`}>
                                                    <div className={`text-lg font-black ${
                                                        kdSt.leadershipIntel.activityRate >= 70 ? 'text-green-400' :
                                                        kdSt.leadershipIntel.activityRate >= 50 ? 'text-yellow-400' : 'text-rose-400'
                                                    }`}>{kdSt.leadershipIntel.activityRate}%</div>
                                                    <Tooltip tip="% of the current Top 20 leaders who gained power or KP during the timeframe. Below 70% = leadership is checked out. Below 50% = catastrophic — the people supposed to lead are not playing.">
                                                        <div className="text-gray-600 text-[9px] uppercase tracking-wide mt-0.5">Active</div>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center px-2 py-1.5 bg-indigo-500/5 border border-indigo-500/10 rounded">
                                                <Tooltip tip="% of the Top 300's total power held by just the Top 10 players. Very high (>40%) = kingdom depends on a tiny whale core. Moderate (15-30%) = healthier distributed strength.">
                                                    <span className="text-gray-600 text-[10px]">Pwr Concentration</span>
                                                </Tooltip>
                                                <span className="text-indigo-300 font-bold text-xs">{kdSt.leadershipIntel.powerConcentration}%</span>
                                            </div>
                                            <div className="flex justify-between items-center px-2 py-1.5">
                                                <Tooltip tip="How many of the original Top 20 leaders from the historical snapshot are still present in the latest one. Low count = significant leadership turnover has occurred.">
                                                    <span className="text-gray-600 text-[10px]">Surviving Leaders</span>
                                                </Tooltip>
                                                <span className="text-white font-bold text-xs">{kdSt.leadershipIntel.survivingLeaderCount} / 20</span>
                                            </div>
                                            {kdSt.leadershipIntel.sleepingLeaderPower > 0 && (
                                                <div className="flex justify-between items-center px-2 py-1.5 bg-orange-500/5 border border-orange-500/10 rounded">
                                                    <Tooltip tip="Raw power held by Top 20 leaders with zero activity during the timeframe. Inactive leaders are a catastrophic signal — they demoralize the kingdom and signal organizational rot at the top.">
                                                        <span className="text-orange-500/60 text-[10px]">Sleeping Leader Pwr</span>
                                                    </Tooltip>
                                                    <span className="text-orange-400 font-bold text-xs">{kdSt.leadershipIntel.sleepingLeaderPower.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
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

                            {matchResult.leadershipVerdicts && matchResult.leadershipVerdicts.length > 0 && (
                                <div>
                                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Shield size={12}/> Leadership Accountability Report
                                    </h4>
                                    <div className="space-y-2">
                                        {matchResult.leadershipVerdicts.map((lv, idx) => (
                                            <div key={idx} className="bg-[#13161c] border border-[#1e222b] p-4 rounded-lg">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="bg-[#1e222b] text-white font-mono font-bold px-2 py-0.5 rounded text-xs shrink-0">KD {lv.kd}</div>
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <span className="text-[10px] text-gray-600 uppercase tracking-wider">Stability</span>
                                                        <span className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                                                            ['A+','A','A-'].includes(lv.stabilityGrade) ? 'text-green-400 bg-green-500/10' :
                                                            ['B+','B','B-'].includes(lv.stabilityGrade) ? 'text-yellow-400 bg-yellow-500/10' :
                                                            'text-rose-400 bg-rose-500/10'
                                                        }`}>{lv.stabilityGrade}</span>
                                                        <span className="text-[10px] text-gray-600 uppercase tracking-wider ml-2">Activity</span>
                                                        <span className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                                                            ['A+','A','A-'].includes(lv.activityGrade) ? 'text-green-400 bg-green-500/10' :
                                                            ['B+','B','B-'].includes(lv.activityGrade) ? 'text-yellow-400 bg-yellow-500/10' :
                                                            'text-rose-400 bg-rose-500/10'
                                                        }`}>{lv.activityGrade}</span>
                                                    </div>
                                                </div>
                                                <p className="text-gray-400 text-xs leading-relaxed">{lv.leadershipAssessment}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
