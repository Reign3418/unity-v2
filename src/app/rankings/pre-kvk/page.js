"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Trophy, RefreshCw, BarChart2, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

export default function PreKvkRankings() {
  const { data: session } = useSession();
  const [globalStats, setGlobalStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [topNFilter, setTopNFilter] = useState('300'); // Default to Top 300
  const [sortConfig, setSortConfig] = useState({ key: 'power', direction: 'desc' });

  const fetchGlobalStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/global`);
      const data = await res.json();
      
      if (res.ok && data.globalStats) {
          setGlobalStats(data.globalStats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const formatNum = (num) => num ? Number(num).toLocaleString() : "0";

  // Process data based on Top N filter
  const processedData = useMemo(() => {
      if (!globalStats || globalStats.length === 0) return [];

      // 1. Extract the raw numerical slice
      let extracted = globalStats.map(kd => {
          let power = 0;
          let kp = 0;

          if (topNFilter === 'All') {
              power = kd.basePower || 0;
              kp = kd.baseKP || 0;
          } else {
              if (kd.topSlices && kd.topSlices[topNFilter]) {
                  power = kd.topSlices[topNFilter].power || 0;
                  kp = kd.topSlices[topNFilter].kp || 0;
              }
          }

          return {
              kingdom: kd.kingdom.replace('KD ', ''), // e.g., '3155'
              power,
              kp
          };
      });

      // 2. Calculate Power Rank
      const sortedByPower = [...extracted].sort((a, b) => b.power - a.power);
      sortedByPower.forEach((item, index) => {
          const original = extracted.find(e => e.kingdom === item.kingdom);
          if (original) original.powerRank = index + 1;
      });

      // 3. Calculate KP Rank
      const sortedByKp = [...extracted].sort((a, b) => b.kp - a.kp);
      sortedByKp.forEach((item, index) => {
          const original = extracted.find(e => e.kingdom === item.kingdom);
          if (original) original.kpRank = index + 1;
      });

      // 4. Apply User Sorting
      extracted.sort((a, b) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];
          
          if (sortConfig.direction === 'asc') {
              return aVal > bVal ? 1 : -1;
          } else {
              return aVal < bVal ? 1 : -1;
          }
      });

      return extracted;
  }, [globalStats, topNFilter, sortConfig]);

  const handleSort = (key) => {
      let direction = 'desc';
      if (sortConfig.key === key && sortConfig.direction === 'desc') {
          direction = 'asc';
      }
      setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
      if (sortConfig.key !== columnKey) return <span className="text-gray-600 ml-1">↕</span>;
      return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="inline ml-1 text-rose-400" /> : <ChevronDown size={14} className="inline ml-1 text-rose-400" />;
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
               <p className="text-rose-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Global Top {topNFilter === 'All' ? 'Field' : topNFilter} Comparison</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-2">
                <span className="text-gray-500 text-xs font-bold tracking-widest uppercase">Governor Count:</span>
                <select 
                   value={topNFilter}
                   onChange={(e) => setTopNFilter(e.target.value)}
                   className="bg-transparent text-white font-mono font-bold outline-none cursor-pointer"
                 >
                    <option value="All">All Scope</option>
                    <option value="1000">Top 1000</option>
                    <option value="650">Top 650</option>
                    <option value="400">Top 400</option>
                    <option value="300">Top 300</option>
                    <option value="100">Top 100</option>
                </select>
            </div>
            
            <button 
                onClick={fetchGlobalStats}
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
      ) : processedData.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <BarChart2 className="w-12 h-12 mb-4 opacity-50 text-rose-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Global Data</h3>
            <p className="text-sm">Cannot calculate algorithms. Ensure the tracking pipeline is indexing multiple kingdoms.</p>
        </div>
      ) : (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl mt-6">
            <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                <h2 className="text-white font-bold uppercase tracking-widest text-sm">Target Scope: {processedData.length} Kingdoms</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                    <thead className="bg-[#13161c] select-none">
                        <tr>
                            <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] w-20">
                                Rank
                            </th>
                            <th 
                                onClick={() => handleSort('kingdom')}
                                className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                Kingdom <SortIcon columnKey="kingdom" />
                            </th>
                            <th 
                                onClick={() => handleSort('power')}
                                className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                Top {topNFilter === 'All' ? 'Field' : topNFilter} Power <SortIcon columnKey="power" />
                            </th>
                            <th 
                                onClick={() => handleSort('kp')}
                                className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                Total KP <SortIcon columnKey="kp" />
                            </th>
                            <th 
                                onClick={() => handleSort('powerRank')}
                                className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                Power Rank <SortIcon columnKey="powerRank" />
                            </th>
                            <th 
                                onClick={() => handleSort('kpRank')}
                                className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                KP Rank <SortIcon columnKey="kpRank" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222b]">
                        {processedData.map((kd, idx) => (
                            <tr key={kd.kingdom} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4 text-center">
                                    <div className="w-7 h-7 rounded border border-[#2d323e] bg-[#1e222b] text-gray-400 font-black flex items-center justify-center mx-auto text-sm">
                                        {idx + 1}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white tracking-widest">{kd.kingdom}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-gray-300 font-mono tracking-wider">{formatNum(kd.power)}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-rose-400 font-mono tracking-wider">{formatNum(kd.kp)}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-gray-400 font-mono px-3 py-1 bg-gray-500/10 border border-gray-500/20 rounded inline-block text-sm">{kd.powerRank}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-rose-400 font-mono px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded inline-block text-sm">{kd.kpRank}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}
