"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { 
    Medal, RefreshCw, Activity, Zap, Target, Trophy, Settings2
} from "lucide-react";

export default function DkpResults() {
  const t = useTranslations('DKP');
  const { data: session } = useSession();
  
  const [kd, setKd] = useState("3155");
  const [rankings, setRankings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatesLoading, setIsDatesLoading] = useState(true);

  // U1 Constraints
  const [availableDates, setAvailableDates] = useState([]);
  const [startScan, setStartScan] = useState("");
  const [endScan, setEndScan] = useState("");
  
  const [t4Pts, setT4Pts] = useState(1);
  const [t5Pts, setT5Pts] = useState(2);
  const [deadsPts, setDeadsPts] = useState(10);

  const fetchDates = async (targetKd) => {
      setIsDatesLoading(true);
      try {
          const res = await fetch(`/api/aws/dkp/dates?kd=${targetKd}`);
          const data = await res.json();
          if (res.ok && data.dates) {
              setAvailableDates(data.dates);
              if (data.dates.length >= 2) {
                  setStartScan(data.dates[0]);
                  setEndScan(data.dates[data.dates.length - 1]);
              }
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsDatesLoading(false);
      }
  };

  const fetchRankings = async () => {
    setIsLoading(true);
    try {
      const url = `/api/aws/dkp?kd=${kd}&start=${encodeURIComponent(startScan)}&end=${encodeURIComponent(endScan)}&t4=${t4Pts}&t5=${t5Pts}&deads=${deadsPts}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok && data.rankings) {
          const filtered = data.rankings.filter(r => r.dkpScore > 0);
          setRankings(filtered);
      } else {
          setRankings([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let activeKd = kd;
    if (typeof window !== 'undefined') {
        const storedKd = localStorage.getItem('unty_active_kd');
        if (storedKd) {
            activeKd = storedKd;
            setKd(storedKd);
        } else if (session?.user?.tenant?.kingdomId) {
            activeKd = session.user.tenant.kingdomId;
            setKd(activeKd);
        }
    }
    fetchDates(activeKd);
  }, [session]);

  // Handle re-fetching automatically when scan dates are fully mounted
  useEffect(() => {
      if (startScan && endScan) {
          fetchRankings();
      }
  }, [kd, startScan, endScan, t4Pts, t5Pts, deadsPts]); // Auto-update on algorithm changes

  const handleKdChange = (newKd) => {
      setKd(newKd);
      fetchDates(newKd); // Pull timeline for new KD
  };

  const formatNum = (num) => num ? Number(num).toLocaleString() : "0";
  const formatBillion = (num) => num ? (Number(num) / 1000000000).toFixed(2) + 'B' : "0";

  const getTierColors = (tier) => {
      switch(tier) {
          case 'S+': return 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.3)]';
          case 'S': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
          case 'A': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
          case 'B': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
          case 'C': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
          default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
      }
  };

  const podium = rankings.slice(0, 3);
  const grid = rankings.slice(3);

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4 flex flex-col items-center">
      
      {/* V2 Header Panel with Internal U1 Controls */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden w-full max-w-7xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        {/* Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full border-b border-[#1e222b] pb-6 mb-6">
            <div className="flex items-center gap-4">
               <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                 <Medal className="text-fuchsia-500" size={32} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                   {t('title')}
                 </h1>
                 <p className="text-fuchsia-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">{t('subtitle')}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               <select 
                 value={kd}
                 onChange={(e) => handleKdChange(e.target.value)}
                 className="bg-[#13161c] border border-[#1e222b] text-white focus:border-fuchsia-500 px-4 py-2.5 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
               >
                 {session?.user?.tenant?.allowedKingdoms?.map(k => (
                    <option key={k} value={k}>KD {k}</option>
                 ))}
                 {!session?.user?.tenant?.allowedKingdoms?.includes(kd) && kd && (
                    <option value={kd}>KD {kd}</option>
                 )}
               </select>
               <button 
                  onClick={fetchRankings}
                  disabled={isLoading || isDatesLoading}
                   className="p-2.5 bg-[#13161c] hover:bg-[#1e222b] text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
               >
                  <RefreshCw size={20} className={isLoading ? "animate-spin text-fuchsia-500" : ""} />
               </button>
            </div>
        </div>

        {/* U1 Style Constraints Bar */}
        <div className="relative z-10 w-full flex flex-col lg:flex-row items-center gap-6 justify-between bg-[#0a0c0f] p-4 rounded-lg border border-[#1e222b]">
            <div className="flex flex-col gap-2 w-full lg:w-1/3">
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1">
                    <Settings2 size={12} className="text-fuchsia-500"/>
                    Algorithmic Start Scan
                </span>
                <select 
                   value={startScan}
                   onChange={(e) => setStartScan(e.target.value)}
                   disabled={isDatesLoading || availableDates.length === 0}
                   className="w-full bg-[#13161c] border border-[#1e222b] text-white p-2 rounded text-xs font-mono disabled:opacity-50 outline-none focus:border-fuchsia-500"
                >
                    {availableDates.map(d => <option key={`start-${d}`} value={d}>{d}</option>)}
                    {availableDates.length === 0 && <option value="">No Active Scans</option>}
                </select>
                
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1 left-2">Algorithmic End Scan</span>
                <select 
                   value={endScan}
                   onChange={(e) => setEndScan(e.target.value)}
                   disabled={isDatesLoading || availableDates.length === 0}
                   className="w-full bg-[#13161c] border border-[#1e222b] text-white p-2 rounded text-xs font-mono disabled:opacity-50 outline-none focus:border-fuchsia-500"
                >
                    {availableDates.map(d => <option key={`end-${d}`} value={d}>{d}</option>)}
                    {availableDates.length === 0 && <option value="">No Active Scans</option>}
                </select>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto h-full justify-center">
                <div className="flex flex-col items-center bg-[#13161c] p-3 rounded-lg border border-[#1e222b]">
                    <span className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest mb-1">T4 Pts</span>
                    <input 
                        type="number" 
                        value={t4Pts}
                        onChange={(e) => setT4Pts(parseFloat(e.target.value) || 0)}
                        className="w-16 bg-transparent text-white font-mono text-center font-bold outline-none border-b border-transparent focus:border-cyan-500 transition-colors"
                    />
                </div>
                <div className="flex flex-col items-center bg-[#13161c] p-3 rounded-lg border border-[#1e222b]">
                    <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest mb-1">T5 Pts</span>
                    <input 
                        type="number" 
                        value={t5Pts}
                        onChange={(e) => setT5Pts(parseFloat(e.target.value) || 0)}
                        className="w-16 bg-transparent text-white font-mono text-center font-bold outline-none border-b border-transparent focus:border-indigo-500 transition-colors"
                    />
                </div>
                <div className="flex flex-col items-center bg-[#13161c] p-3 rounded-lg border border-[#1e222b]">
                    <span className="text-[10px] text-rose-500 uppercase font-bold tracking-widest mb-1">Deads Pts</span>
                    <input 
                        type="number" 
                        value={deadsPts}
                        onChange={(e) => setDeadsPts(parseFloat(e.target.value) || 0)}
                        className="w-16 bg-transparent text-white font-mono text-center font-bold outline-none border-b border-transparent focus:border-rose-500 transition-colors"
                    />
                </div>
            </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center w-full max-w-7xl">
            <RefreshCw className="animate-spin text-fuchsia-500 w-8 h-8" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500 w-full max-w-7xl">
            <Activity className="w-12 h-12 mb-4 opacity-50 text-fuchsia-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{t('no_lethality')}</h3>
            <p className="text-sm text-center">Cannot calculate algorithms. Target constraints may be too narrow or point weights may be 0.</p>
        </div>
      ) : (
        <div className="w-full max-w-7xl gap-6 flex flex-col">
            {/* The MVP Highlight Podium */}
            {podium[0] && (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 relative overflow-hidden shadow-xl">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                 <h2 className="text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-6"><Trophy size={14} className="text-fuchsia-500" /> {t('top_vanguard')}</h2>
                 
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
                          <span className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-1"><Zap size={14} className="text-fuchsia-500"/> {t('calculated_dkp')}</span>
                          <span className="text-5xl font-black text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{formatNum(podium[0].dkpScore)}</span>
                     </div>
                 </div>
            </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
              <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                 <h2 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                   <Target size={18} className="text-fuchsia-500" />
                   {t('official_commendations')}
                 </h2>
                 <span className="text-[10px] bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                    Indexed Output: {grid.length + podium.length}
                 </span>
              </div>
              
              <div className="overflow-x-auto">
                 <table className="w-full whitespace-nowrap">
                    <thead className="bg-[#13161c]">
                       <tr>
                          <th className="px-4 py-3 w-16 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Rank</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Grade</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Governor</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">DKP Score</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Deads Delta</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">T4 Delta</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">T5 Delta</th>
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
                                      <div className="font-bold text-rose-500 font-mono">{formatNum(gov.dDelta)} <span className="text-[10px] text-gray-500 uppercase tracking-widest">(+{formatNum(gov.dDelta * deadsPts)} DKP)</span></div>
                                  ) : (
                                      <div className="font-bold text-gray-600 font-mono">0</div>
                                  )}
                               </td>
                               <td className="px-4 py-3 text-right">
                                  {gov.t4Delta > 0 ? (
                                      <div className="font-bold text-cyan-500 font-mono">+{formatNum(gov.t4Delta)} <span className="text-[10px] text-gray-500 uppercase tracking-widest">(+{formatNum(Math.floor(gov.t4Delta * t4Pts))} DKP)</span></div>
                                  ) : (
                                      <div className="font-bold text-gray-600 font-mono">0</div>
                                  )}
                               </td>
                               <td className="px-4 py-3 text-right">
                                  {gov.t5Delta > 0 ? (
                                      <div className="font-bold text-indigo-400 font-mono">+{formatNum(gov.t5Delta)} <span className="text-[10px] text-gray-500 uppercase tracking-widest">(+{formatNum(Math.floor(gov.t5Delta * t5Pts))} DKP)</span></div>
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
        </div>
      )}

    </div>
  );
}
