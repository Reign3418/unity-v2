"use client";

import { useState, useEffect } from "react";
import { 
    Medal, RefreshCw, Activity, Zap, Shield, Target, ScrollText, Crosshair
} from "lucide-react";

export default function DkpResults() {
  const [kd, setKd] = useState("3155");
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRankings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/dkp?kd=${kd}`);
      const data = await res.json();
      
      if (res.ok && data.rankings) {
          // Exclude extreme zeroes to maintain combat relevance
          const filtered = data.rankings.filter(r => r.dkpScore > 0);
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
  const formatBillion = (num) => num ? (Number(num) / 1000000000).toFixed(2) + 'B' : "0";

  const getTierColors = (tier) => {
      switch(tier) {
          case 'S+': return 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.3)]';
          case 'S': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
          case 'A': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
          case 'B': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
          case 'C': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
      }
  };

  // Podium Array (Top 3)
  const podium = rankings.slice(0, 3);
  // Grid Array (Rest of leaderboard)
  const grid = rankings.slice(3);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                 <Medal className="text-fuchsia-500" size={32} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                   DKP Results
                 </h1>
                 <p className="text-fuchsia-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Dragon Kill Points (Post-KvK Aggregation)</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               <select 
                 value={kd}
                 onChange={(e) => setKd(e.target.value)}
                 className="bg-[#13161c] border border-[#1e222b] text-white focus:border-fuchsia-500 px-4 py-2.5 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
               >
                 <option value="3155">KD 3155</option>
                 <option value="3156">KD 3156</option>
               </select>
               <button 
                  onClick={fetchRankings}
                  disabled={isLoading}
                   className="p-2.5 bg-[#13161c] hover:bg-[#1e222b] text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
               >
                  <RefreshCw size={20} className={isLoading ? "animate-spin text-fuchsia-500" : ""} />
               </button>
            </div>
         </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-fuchsia-500 w-8 h-8" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <Activity className="w-12 h-12 mb-4 opacity-50 text-fuchsia-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Lethality Identified</h3>
            <p className="text-sm">Cannot calculate algorithmic models. Double check chronological mapping logic over the latest server timeline.</p>
        </div>
      ) : (
        <>
            {/* The MVP Highlight Podium (1st Place Only Highlight) */}
            {podium[0] && (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 relative overflow-hidden shadow-xl">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                 <h2 className="text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-6"><Trophy size={14} className="text-fuchsia-500" /> Undisputed Kingdom Vanguard</h2>
                 
                 <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full justify-between">
                     <div className="flex items-center gap-6 text-left">
                         <div className="w-24 h-24 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center">
                              <Medal className="text-fuchsia-500 w-12 h-12 drop-shadow-[0_0_10px_rgba(217,70,239,0.6)]" />
                         </div>
                         <div>
                             <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest mb-2 inline-block ${getTierColors(podium[0].tier)}`}>Tier {podium[0].tier} Output</span>
                             <h2 className="text-3xl font-black text-white uppercase tracking-widest leading-none mb-2">{podium[0].name}</h2>
                             <p className="text-gray-500 text-sm font-mono tracking-widest">[{podium[0].alliance}] <span className="text-fuchsia-400/80">{formatBillion(podium[0].power)}</span></p>
                         </div>
                     </div>
                     <div className="w-full md:w-auto bg-[#13161c] p-6 rounded-xl border border-[#1e222b] flex flex-col items-center md:items-end shadow-inner">
                          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-1"><Zap size={14} className="text-fuchsia-500"/> Calculated DKP Contribution</span>
                          <span className="text-5xl font-black text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{formatNum(podium[0].dkpScore)}</span>
                     </div>
                 </div>
            </div>
            )}

            {/* General Leaderboard Table */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
              <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                 <h2 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                   <Target size={18} className="text-fuchsia-500" />
                   Official KvK Commendations
                 </h2>
                 <span className="text-[10px] bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                    {grid.length + podium.length} Nodes Indexed
                 </span>
              </div>
              
              <div className="overflow-x-auto">
                 <table className="w-full whitespace-nowrap">
                    <thead className="bg-[#13161c]">
                       <tr>
                          <th className="px-4 py-3 w-16 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Rank</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Performance Grade</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Governor Name</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">DKP Total</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Core Drops (Deads)</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Kill Point Deltas</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222b]">
                       {rankings.map((gov, idx) => (
                           <tr key={gov.id} className="hover:bg-white/5 transition-colors group">
                               <td className="px-4 py-3 text-center">
                                  {idx === 0 ? <Medal size={20} className="text-amber-400 mx-auto drop-shadow-md" /> :
                                   idx === 1 ? <Medal size={20} className="text-slate-300 mx-auto drop-shadow-md" /> :
                                   idx === 2 ? <Medal size={20} className="text-amber-700 mx-auto drop-shadow-md" /> :
                                  <div className="w-6 h-6 rounded bg-[#1e222b] text-gray-400 font-mono text-xs font-bold flex items-center justify-center mx-auto">
                                      {idx + 1}
                                  </div>}
                               </td>
                               <td className="px-4 py-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-black font-mono tracking-widest inline-block w-8 text-center ${getTierColors(gov.tier)}`}>
                                      {gov.tier}
                                  </span>
                               </td>
                               <td className="px-4 py-3">
                                  <div className="font-bold text-white group-hover:text-fuchsia-400 transition-colors uppercase tracking-widest">{gov.name}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">[{gov.alliance}] ID: {gov.id}</div>
                               </td>
                               <td className="px-4 py-3 text-right">
                                  <div className="font-bold text-fuchsia-500 font-mono text-lg">{formatNum(gov.dkpScore)}</div>
                               </td>
                               <td className="px-4 py-3 text-right">
                                  {gov.dDelta > 0 ? (
                                      <div className="font-bold text-rose-500 font-mono">{formatNum(gov.dDelta)} <span className="text-[10px] text-gray-500 uppercase tracking-widest">(+{formatNum(gov.dDelta * 0.20)} DKP)</span></div>
                                  ) : (
                                      <div className="font-bold text-gray-600 font-mono">0</div>
                                  )}
                               </td>
                               <td className="px-4 py-3 text-right">
                                  {gov.kDelta > 0 ? (
                                      <div className="font-bold text-emerald-500 font-mono">+{formatNum(gov.kDelta)} <span className="text-[10px] text-gray-500 uppercase tracking-widest">(+{formatNum(Math.floor(gov.kDelta * 0.05))} DKP)</span></div>
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
