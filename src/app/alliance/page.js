"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    Shield, Users, Activity, Target, ShieldPlus, 
    RefreshCw, Search, Trophy, ShieldAlert
} from "lucide-react";

export default function AllianceDashboard() {
  const { data: session } = useSession();
  
  const [kd, setKd] = useState("3155");
  const [tagInput, setTagInput] = useState("V-T");
  const [activeTag, setActiveTag] = useState("V-T");
  
  const [roster, setRoster] = useState([]);
  const [stats, setStats] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlliance = async (targetTag) => {
    if (!targetTag) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/alliance?kd=${kd}&tag=${encodeURIComponent(targetTag)}`);
      const data = await res.json();
      
      if (res.ok) {
          setRoster(data.roster || []);
          setStats(data.stats);
          setActiveTag(targetTag.toUpperCase());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlliance(activeTag);
  }, []);

  const handleSearch = (e) => {
      e.preventDefault();
      fetchAlliance(tagInput);
  };

  const formatNum = (num) => num ? Number(num).toLocaleString() : "0";
  const formatBillion = (num) => num ? (Number(num) / 1000000000).toFixed(2) + 'B' : "0";

  const renderStats = () => {
      if (!stats) return null;
      
      const grid = [
        { label: "Overall Power", value: formatBillion(stats.totalPower), icon: Activity, color: "emerald", growth: "Active" },
        { label: "Combat Members", value: `${stats.activeMembers}`, icon: Users, color: "indigo", growth: "Live" },
        { label: "Total Kill Points", value: formatBillion(stats.totalKP), icon: Target, color: "amber", growth: "Lethal" },
        { label: "Top Vanguard", value: stats.topName, icon: Trophy, color: "fuchsia", growth: formatBillion(stats.topPower) }
      ];

      return grid.map((stat, i) => (
          <div key={i} className={`bg-[#13161c] border border-[#1e222b] rounded-xl p-6 shadow-lg border-t-2 border-t-${stat.color}-500 hover:-translate-y-1 transition-transform cursor-default group`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-${stat.color}-400 bg-${stat.color}-500/10 uppercase tracking-widest`}>
                {stat.growth}
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</h3>
            <p className={`text-2xl font-black text-white ${stat.label === "Top Vanguard" ? "" : "font-mono"} truncate`}>{stat.value}</p>
          </div>
      ));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
          <div className="flex items-center gap-4">
             <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
               <Shield className="text-emerald-400" size={32} />
             </div>
             <div>
               <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                 [{activeTag}] Architecture
               </h1>
               <p className="text-emerald-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Combat Shell • Kingdom {kd}</p>
             </div>
          </div>
          
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <select 
               value={kd}
               onChange={(e) => setKd(e.target.value)}
               className="bg-[#13161c] border border-[#1e222b] text-white focus:border-emerald-500 px-4 py-2.5 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
             >
               <option value="3155">KD 3155</option>
               <option value="3156">KD 3156</option>
            </select>
            <div className="relative w-32">
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Tag"
                  className="w-full bg-[#13161c] border border-[#1e222b] focus:border-emerald-500 text-white pl-8 pr-4 py-2.5 rounded-lg font-bold uppercase transition-all outline-none"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            </div>
            <button 
                type="submit"
                disabled={isLoading || !tagInput}
                className="p-2.5 bg-[#13161c] hover:bg-[#1e222b] text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg disabled:opacity-50"
            >
                <RefreshCw size={20} className={isLoading ? "animate-spin text-emerald-500" : ""} />
            </button>
          </form>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-emerald-500 w-8 h-8" />
        </div>
      ) : roster.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-emerald-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">Target Alliance Nonexistent</h3>
            <p className="text-sm">Cannot formulate models. Ensure the ingestion pipeline has mapped this Tag.</p>
        </div>
      ) : (
        <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderStats()}
            </div>

            {/* Alliance Roster Stub */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
              <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                 <h2 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                   <Users size={18} className="text-emerald-500" />
                   Active Combat Roster
                 </h2>
                 <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                    {roster.length} Nodes Rendered
                 </span>
              </div>
              
              <div className="overflow-x-auto">
                 <table className="w-full whitespace-nowrap">
                    <thead className="bg-[#13161c]">
                       <tr>
                          <th className="px-4 py-3 w-16 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Governor Name</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total Power</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Power Delta</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Kill Points</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222b]">
                       {roster.sort((a,b) => b.power - a.power).map((gov, index) => (
                           <tr key={gov.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-4 py-3 text-center text-xs text-gray-600 font-bold">{index + 1}</td>
                              <td className="px-4 py-3">
                                 <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{gov.name}</div>
                                 <div className="text-[10px] text-gray-500 font-mono">ID: {gov.id}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <div className="font-bold text-white font-mono">{formatNum(gov.power)}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                 {typeof gov.powerDelta === 'number' && gov.powerDelta > 0 ? (
                                     <div className="font-bold text-emerald-500 font-mono">+{formatNum(gov.powerDelta)}</div>
                                 ) : typeof gov.powerDelta === 'number' && gov.powerDelta < 0 ? (
                                     <div className="font-bold text-rose-500 font-mono">{formatNum(gov.powerDelta)}</div>
                                 ) : typeof gov.powerDelta === 'string' ? (
                                     <div className="font-bold text-indigo-400 font-mono text-[10px]">{gov.powerDelta}</div>
                                 ) : (
                                     <div className="font-bold text-gray-500 font-mono">0</div>
                                 )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <div className="text-amber-500 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded inline-block">{formatNum(gov.killPoints)}</div>
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
