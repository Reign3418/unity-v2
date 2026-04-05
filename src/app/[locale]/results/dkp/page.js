"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { 
    Medal, RefreshCw, Activity, Target, Settings2
} from "lucide-react";

export default function DkpResults() {
  const t = useTranslations('DKP');
  const { data: session } = useSession();
  
  // They can select multiple kingdoms now. We'll store an array. 
  // For simplicity, we initialize with what's in local storage or their tenant allowed.
  const [targetKds, setTargetKds] = useState([]);
  
  // Data State: Array of Kingdom Aggregation Objects
  const [kingdomData, setKingdomData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatesLoading, setIsDatesLoading] = useState(false);

  // U1 Constraints
  const [availableDates, setAvailableDates] = useState([]);
  const [startScan, setStartScan] = useState("");
  const [endScan, setEndScan] = useState("");
  
  const [t4Pts, setT4Pts] = useState(10); // Standardized to match screenshot
  const [t5Pts, setT5Pts] = useState(20);
  const [deadsPts, setDeadsPts] = useState(30);
  
  const [govCount, setGovCount] = useState("All"); // All, 1000, 650, 400, 300, 100

  // Grab available dates using the FIRST selected kingdom as a proxy, 
  // since tracking global dates for multiple KDs simultaneously is complex. Assumes generic KVK overlap.
  const fetchDates = async (proxyKd) => {
      setIsDatesLoading(true);
      try {
          const res = await fetch(`/api/aws/dkp/dates?kd=${proxyKd}`);
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
    if (targetKds.length === 0) return;
    setIsLoading(true);
    
    try {
      const results = [];
      
      // Fetch each Kingdom independently & aggregate
      for (const kd of targetKds) {
          const url = `/api/aws/dkp?kd=${kd}&start=${encodeURIComponent(startScan)}&end=${encodeURIComponent(endScan)}&t4=${t4Pts}&t5=${t5Pts}&deads=${deadsPts}`;
          const res = await fetch(url);
          const data = await res.json();
          
          if (res.ok && data.rankings) {
              let players = [...data.rankings];
              
              // Sort by power or DKP? DKP defines rank here
              players = players.sort((a, b) => b.dkpScore - a.dkpScore);
              
              if (govCount !== "All") {
                  const limit = parseInt(govCount);
                  players = players.slice(0, limit);
              }
              
              // Aggregate sum
              const agg = players.reduce((acc, gov) => {
                  acc.totalPower += (gov.power || 0);
                  acc.powerDelta += (gov.pDelta || 0);
                  acc.t4Kills += (gov.t4Kills || 0);
                  acc.t5Kills += (gov.t5Kills || 0);
                  acc.totalDeads += (gov.deads || 0); // Using Raw Deads for aggregation
                  acc.totalKp += (gov.kDelta || 0); // Using Delta for KP calculations
                  acc.totalDkp += (gov.dkpScore || 0);
                  return acc;
              }, {
                  kingdom: kd,
                  totalPower: 0,
                  powerDelta: 0,
                  t4Kills: 0,
                  t5Kills: 0,
                  totalDeads: 0,
                  totalKp: 0,
                  totalDkp: 0
              });
              
              results.push(agg);
          }
      }
      
      // Sort kingdoms by Total DKP
      setKingdomData(results.sort((a,b) => b.totalDkp - a.totalDkp));
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedKd = localStorage.getItem('unty_active_kd');
        if (storedKd) {
            setTargetKds([storedKd]);
            fetchDates(storedKd);
        } else if (session?.user?.tenant?.kingdomId) {
            setTargetKds([session.user.tenant.kingdomId]);
            fetchDates(session.user.tenant.kingdomId);
        }
    }
  }, [session]);

  useEffect(() => {
      if (startScan && endScan && targetKds.length > 0) {
          fetchRankings();
      }
  }, [startScan, endScan, t4Pts, t5Pts, deadsPts, govCount]);

  const toggleKingdom = (kdStr) => {
      setTargetKds(prev => {
          if (prev.includes(kdStr)) {
              return prev.filter(k => k !== kdStr);
          } else {
              const nu = [...prev, kdStr];
              if (prev.length === 0) fetchDates(kdStr); // Proxy fetch if first
              return nu;
          }
      });
  };

  const formatNum = (num) => num ? Number(num).toLocaleString() : "0";

  const [kdInput, setKdInput] = useState("");

  const handleAddKd = (e) => {
      e.preventDefault();
      if (!kdInput) return;
      const cleanKd = kdInput.replace(/[^0-9]/g, '');
      if (cleanKd && !targetKds.includes(cleanKd)) {
          setTargetKds(prev => [...prev, cleanKd]);
          if (targetKds.length === 0) fetchDates(cleanKd);
      }
      setKdInput("");
  };

  const removeKd = (kdStr) => {
      setTargetKds(prev => prev.filter(k => k !== kdStr));
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4 flex flex-col items-center">
      
      {/* Search Input Toolbar */}
      <div className="w-full max-w-7xl">
         <form onSubmit={handleAddKd} className="flex flex-wrap items-center gap-3">
             <input 
                 type="text" 
                 value={kdInput}
                 onChange={(e) => setKdInput(e.target.value)}
                 placeholder="FILTER KD (OPTIONAL)"
                 className="bg-[#13161c] border border-[#1e222b] text-gray-400 text-xs font-bold uppercase tracking-widest p-2 px-4 rounded outline-none focus:border-fuchsia-500 w-48"
             />
             <button type="submit" className="bg-[#13161c] border border-[#1e222b] hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 text-fuchsia-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors flex items-center gap-1">
                 + Add
             </button>

             {targetKds.map(k => (
                <div key={k} className="flex items-center gap-2 bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded">
                   KD {k}
                   <button type="button" onClick={() => removeKd(k)} className="text-fuchsia-400 hover:text-white ml-1">&times;</button>
                </div>
             ))}
         </form>
      </div>

      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden w-full max-w-7xl">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 relative z-10 w-full">
            
            {/* Title Details */}
            <div className="flex flex-col gap-2">
                 <h1 className="text-2xl font-black text-white tracking-widest uppercase">
                   All Kingdom DKP Results
                 </h1>
                 
                 <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Start Scan</span>
                    <select 
                       value={startScan}
                       onChange={(e) => setStartScan(e.target.value)}
                       disabled={isDatesLoading || availableDates.length === 0}
                       className="bg-[#13161c] border border-[#1e222b] text-white p-1.5 rounded text-xs font-mono disabled:opacity-50 outline-none"
                    >
                        {availableDates.map(d => <option key={`start-${d}`} value={d}>{d}</option>)}
                    </select>

                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-4">End Scan</span>
                    <select 
                       value={endScan}
                       onChange={(e) => setEndScan(e.target.value)}
                       disabled={isDatesLoading || availableDates.length === 0}
                       className="bg-[#13161c] border border-[#1e222b] text-white p-1.5 rounded text-xs font-mono disabled:opacity-50 outline-none"
                    >
                        {availableDates.map(d => <option key={`end-${d}`} value={d}>{d}</option>)}
                    </select>
                 </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center bg-[#13161c] p-2 px-3 rounded border border-[#1e222b] gap-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">DKP Mode</span>
                    <select className="bg-transparent text-white text-xs outline-none">
                        <option>Basic</option>
                        <option>Advanced (HoH Scan)</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-500 uppercase font-bold tracking-widest">T4 Pts:</span>
                    <input type="number" value={t4Pts} onChange={(e) => setT4Pts(parseFloat(e.target.value) || 0)} className="w-12 bg-[#13161c] text-white font-mono text-center text-sm font-bold border border-[#1e222b] rounded py-1 outline-none" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest">T5 Pts:</span>
                    <input type="number" value={t5Pts} onChange={(e) => setT5Pts(parseFloat(e.target.value) || 0)} className="w-12 bg-[#13161c] text-white font-mono text-center text-sm font-bold border border-[#1e222b] rounded py-1 outline-none" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-rose-500 uppercase font-bold tracking-widest">Deads Pts:</span>
                    <input type="number" value={deadsPts} onChange={(e) => setDeadsPts(parseFloat(e.target.value) || 0)} className="w-12 bg-[#13161c] text-white font-mono text-center text-sm font-bold border border-[#1e222b] rounded py-1 outline-none" />
                </div>

                <div className="flex items-center bg-[#13161c] p-2 px-3 rounded border border-[#1e222b] gap-2 ml-4">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Governor Count</span>
                    <select value={govCount} onChange={(e) => setGovCount(e.target.value)} className="bg-transparent text-white text-xs outline-none font-bold">
                        <option value="All">All Governors</option>
                        <option value="1000">Top 1000</option>
                        <option value="650">Top 650</option>
                        <option value="400">Top 400</option>
                        <option value="300">Top 300</option>
                        <option value="100">Top 100</option>
                    </select>
                </div>
                
                <button onClick={fetchRankings} disabled={isLoading || targetKds.length === 0} className="p-2 ml-2 bg-[#0a0c0f] hover:bg-[#1e222b] text-white border border-[#1e222b] rounded transition-colors disabled:opacity-50">
                  <RefreshCw size={16} className={isLoading ? "animate-spin text-fuchsia-500" : ""} />
               </button>
            </div>
        </div>

        {/* Global DKP Aggregation Table */}
        <div className="mt-8 border border-[#1e222b] rounded-lg overflow-hidden bg-[#0a0c0f]">
            <div className="overflow-x-auto">
                 <table className="w-full whitespace-nowrap">
                    <thead className="bg-[#13161c]">
                       <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Kingdom</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total Power</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Power +/-</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total T4 Kills</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total T5 Kills</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total Deads</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total KP</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total DKP</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222b]">
                       {kingdomData.length === 0 ? (
                           <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-500 italic">
                                  No Data - Change constraints to recalculate results
                              </td>
                           </tr>
                       ) : kingdomData.map((kdRow) => (
                           <tr key={`kdRow-${kdRow.kingdom}`} className="hover:bg-white/5 transition-colors">
                               <td className="px-4 py-4 text-left font-black text-white tracking-widest">{kdRow.kingdom}</td>
                               <td className="px-4 py-4 text-left font-mono font-bold text-gray-300">{formatNum(kdRow.totalPower)}</td>
                               <td className="px-4 py-4 text-left font-mono font-bold text-gray-300">{formatNum(kdRow.powerDelta)}</td>
                               <td className="px-4 py-4 text-left font-mono font-bold text-gray-300">{formatNum(kdRow.t4Kills)}</td>
                               <td className="px-4 py-4 text-left font-mono font-bold text-gray-300">{formatNum(kdRow.t5Kills)}</td>
                               <td className="px-4 py-4 text-left font-mono font-bold text-rose-500/80">{formatNum(kdRow.totalDeads)}</td>
                               <td className="px-4 py-4 text-right font-mono font-bold text-cyan-500/80">{formatNum(kdRow.totalKp)}</td>
                               <td className="px-4 py-4 text-right font-mono font-bold text-fuchsia-500 text-lg">{formatNum(kdRow.totalDkp)}</td>
                           </tr>
                       ))}
                    </tbody>
                 </table>
            </div>
            
            {/* Visual Bar at Bottom matching U1 */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent opacity-50"></div>
        </div>

      </div>
    </div>
  );
}
