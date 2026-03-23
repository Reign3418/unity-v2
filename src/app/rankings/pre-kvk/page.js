"use client";

import { useState, useEffect } from "react";
import { 
    Trophy, RefreshCw, BarChart2, Zap, Shield, Target, Medal
} from "lucide-react";

export default function PreKvkRankings() {
  const [kd, setKd] = useState("3155");
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRankings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/pre-kvk?kd=${kd}`);
      const data = await res.json();
      
      if (res.ok && data.rankings) {
          // Exclude absolute 0 scores to keep leaderboard relevant to active pushers
          const filtered = data.rankings.filter(r => r.kvkScore > 0);
          setRankings(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [kd]);

  const formatNum = (num) => num ? Number(num).toLocaleString() : "0";
  const formatMillion = (num) => num ? (Number(num) / 1000000).toFixed(1) + 'M' : "0";
  const formatBillion = (num) => num ? (Number(num) / 1000000000).toFixed(2) + 'B' : "0";

  // Podium Array (Top 3)
  const podium = rankings.slice(0, 3);
  // Grid Array (Rest of leaderboard)
  const grid = rankings.slice(3);

  const getPodiumColor = (index) => {
      if (index === 0) return "text-amber-400 bg-amber-400/10 border-amber-400/20"; // Gold
      if (index === 1) return "text-slate-300 bg-slate-400/10 border-slate-400/20"; // Silver
      if (index === 2) return "text-amber-700 bg-amber-700/10 border-amber-700/20"; // Bronze
      return "";
  };
  const getPodiumShadow = (index) => {
      if (index === 0) return "shadow-[0_0_30px_rgba(251,191,36,0.15)]";
      if (index === 1) return "shadow-[0_0_30px_rgba(203,213,225,0.1)]";
      if (index === 2) return "shadow-[0_0_30px_rgba(180,83,9,0.1)]";
      return "";
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
          <div className="flex items-center gap-4">
             <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
               <Trophy className="text-rose-500" size={32} />
             </div>
             <div>
               <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                 Pre-KvK Rankings
               </h1>
               <p className="text-rose-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Chronological Preparedness Matrix</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
               value={kd}
               onChange={(e) => setKd(e.target.value)}
               className="bg-[#13161c] border border-[#1e222b] text-white focus:border-rose-500 px-4 py-2.5 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
             >
               {session?.user?.tenant?.allowedKingdoms?.map(kd => (
                  <option key={kd} value={kd}>KD {kd}</option>
               ))}
               {!session?.user?.tenant?.allowedKingdoms?.includes(targetKd) && targetKd && (
                  <option value={targetKd}>KD {targetKd}</option>
               )}
            </select>
            <button 
                onClick={fetchRankings}
                disabled={isLoading}
                className="p-2.5 bg-[#13161c] hover:bg-[#1e222b] text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
                <RefreshCw size={20} className={isLoading ? "animate-spin text-rose-500" : ""} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-rose-500 w-8 h-8" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <BarChart2 className="w-12 h-12 mb-4 opacity-50 text-rose-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Temporal Data</h3>
            <p className="text-sm">Cannot calculate algorithms. Ensure at least TWO chronological AWS Discord Scans have occurred.</p>
        </div>
      ) : (
        <>
            {/* The Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10 items-end">
                {/* 2nd Place */}
                {podium[1] && (
                    <div className={`bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 relative group overflow-hidden ${getPodiumShadow(1)} order-2 md:order-1 h-[85%]`}>
                        <div className="absolute top-0 w-full h-1 bg-slate-300 left-0"></div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-400/10 border border-slate-400/20 flex items-center justify-center mb-4 text-slate-300 font-black text-2xl">2</div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-1 truncate w-full px-2">{podium[1].name}</h2>
                            <p className="text-gray-500 text-xs font-mono mb-4">[{podium[1].alliance}] {formatBillion(podium[1].power)}</p>
                            
                            <div className="w-full bg-[#13161c] p-3 rounded-lg border border-[#1e222b] flex flex-col items-center">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Zap size={10} className="text-rose-500"/> Preparedness Score</span>
                                <span className="text-3xl font-black text-slate-300 font-mono">{formatNum(podium[1].kvkScore)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {podium[0] && (
                    <div className={`bg-[#13161c] border border-amber-500/30 rounded-xl p-8 relative group overflow-hidden ${getPodiumShadow(0)} order-1 md:order-2 h-full z-10 transform md:-translate-y-4`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-amber-600 left-0"></div>
                        <div className="flex flex-col items-center text-center relative z-20">
                            <div className="w-24 h-24 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-4">
                                <Trophy className="text-amber-400 w-12 h-12 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                            </div>
                            <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest mb-2 border border-amber-500/20">The Vanguard</span>
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-1 truncate w-full px-2">{podium[0].name}</h2>
                            <p className="text-amber-400/70 text-xs font-mono mb-6">[{podium[0].alliance}] {formatBillion(podium[0].power)}</p>
                            
                            <div className="w-full bg-[#0a0c0f] p-4 rounded-xl border border-[#1e222b] flex flex-col items-center shadow-inner">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Zap size={12} className="text-amber-500"/> Preparedness Score</span>
                                <span className="text-5xl font-black text-amber-400 font-mono drop-shadow-md">{formatNum(podium[0].kvkScore)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {podium[2] && (
                    <div className={`bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 relative group overflow-hidden ${getPodiumShadow(2)} order-3 h-[80%]`}>
                        <div className="absolute top-0 w-full h-1 bg-amber-700 left-0"></div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-700/10 border border-amber-700/20 flex items-center justify-center mb-4 text-amber-700 font-black text-2xl">3</div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-1 truncate w-full px-2">{podium[2].name}</h2>
                            <p className="text-gray-500 text-xs font-mono mb-4">[{podium[2].alliance}] {formatBillion(podium[2].power)}</p>
                            
                            <div className="w-full bg-[#13161c] p-3 rounded-lg border border-[#1e222b] flex flex-col items-center">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-1"><Zap size={10} className="text-rose-500"/> Preparedness Score</span>
                                <span className="text-3xl font-black text-amber-700 font-mono">{formatNum(podium[2].kvkScore)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* General Leaderboard Table */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
              <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                 <h2 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                   <Target size={18} className="text-rose-500" />
                   Global Field Rankings
                 </h2>
                 <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                    {grid.length + podium.length} Qualified Nodes
                 </span>
              </div>
              
              <div className="overflow-x-auto">
                 <table className="w-full whitespace-nowrap">
                    <thead className="bg-[#13161c]">
                       <tr>
                          <th className="px-4 py-3 w-16 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Rank</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Governor Name</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Score</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total Power</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Power Gained</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Kill Points Gained</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222b]">
                       {grid.map((gov, idx) => (
                           <tr key={gov.id} className="hover:bg-white/5 transition-colors group">
                               <td className="px-4 py-3 text-center">
                                  <div className="w-6 h-6 rounded bg-[#1e222b] text-gray-400 font-mono text-xs font-bold flex items-center justify-center mx-auto">
                                      {idx + 4}
                                  </div>
                               </td>
                               <td className="px-4 py-3">
                                  <div className="font-bold text-white group-hover:text-rose-400 transition-colors">{gov.name}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">[{gov.alliance}] ID: {gov.id}</div>
                               </td>
                               <td className="px-4 py-3 text-right">
                                  <div className="font-bold text-rose-500 font-mono text-lg bg-rose-500/10 px-2 py-0.5 rounded inline-block border border-rose-500/20 shadow-sm">{formatNum(gov.kvkScore)}</div>
                               </td>
                               <td className="px-4 py-3 text-right">
                                  <div className="font-bold text-gray-400 font-mono">{formatNum(gov.power)}</div>
                               </td>
                               <td className="px-4 py-3 text-right">
                                  {gov.pDelta > 0 ? (
                                      <div className="font-bold text-cyan-500 font-mono">+{formatNum(gov.pDelta)}</div>
                                  ) : gov.pDelta < 0 ? (
                                      <div className="font-bold text-rose-500 font-mono">{formatNum(gov.pDelta)}</div>
                                  ) : (
                                      <div className="font-bold text-gray-600 font-mono">0</div>
                                  )}
                               </td>
                               <td className="px-4 py-3 text-right">
                                  {gov.kDelta > 0 ? (
                                      <div className="font-bold text-amber-500 font-mono">+{formatNum(gov.kDelta)}</div>
                                  ) : (
                                      <div className="font-bold text-gray-600 font-mono">0</div>
                                  )}
                               </td>
                           </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </div>
        </>
      )}

    </div>
  );
}
