"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Trophy, ChevronDown, ChevronUp, Search, Database, RefreshCw, AlertTriangle } from "lucide-react";

export default function DKPLeaderboards() {
  const { data: session } = useSession();
  
  const [roster, setRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [targetKd, setTargetKd] = useState("3155");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("power");
  const [sortDirection, setSortDirection] = useState("desc");

  const fetchRoster = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/aws/roster?kd=${targetKd}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch AWS Leaderboard.");
      setRoster(data.roster || []);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRoster();
    }
  }, [session, targetKd]);

  const handleSort = (field) => {
    if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        setSortDirection('desc');
    }
  };

  const getSortedRoster = () => {
    let filtered = [...roster];
    
    // 1. Search filter
    if (searchQuery) {
       const q = searchQuery.toLowerCase();
       filtered = filtered.filter(gov => 
         (gov.name?.toLowerCase().includes(q)) || 
         (gov.id?.toString().includes(q)) ||
         (gov.alliance?.toLowerCase().includes(q))
       );
    }
    
    // 2. Sort
    filtered.sort((a, b) => {
       const aVal = a[sortField];
       const bVal = b[sortField];
       
       if (typeof aVal === 'number' && typeof bVal === 'number') {
           return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
       }
       
       const aStr = String(aVal).toLowerCase();
       const bStr = String(bVal).toLowerCase();
       if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
       if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
       return 0;
    });
    
    return filtered;
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} className="text-emerald-500" /> : <ChevronDown size={14} className="text-emerald-500" />;
  };

  const TheadTh = ({ label, field, right = false }) => (
    <th 
      onClick={() => handleSort(field)}
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer group hover:bg-white/5 transition-colors select-none ${right ? 'text-right' : 'text-left'}`}
    >
      <div className={`flex items-center gap-1 ${right ? 'justify-end' : 'justify-start'}`}>
        {label} <SortIcon field={field} />
      </div>
    </th>
  );

  const formatNumber = (num) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toLocaleString() || "0";
  };

  const displayedRoster = getSortedRoster();

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                 <Trophy className="text-emerald-500" size={32} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-widest uppercase">Global Leaderboards</h1>
                 <p className="text-emerald-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Live DynamoDB Trajectory Mapping</p>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <select 
                 value={targetKd}
                 onChange={(e) => setTargetKd(e.target.value)}
                 className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-emerald-500 px-4 py-2 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
               >
                 <option value="3155">Kingdom 3155</option>
                 <option value="3156">Kingdom 3156</option>
               </select>

               <button 
                 onClick={fetchRoster}
                 disabled={isLoading}
                 className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg"
                 title="Force Sync"
               >
                  <RefreshCw size={20} className={isLoading ? "animate-spin text-emerald-500" : ""} />
               </button>
            </div>
         </div>
      </div>

      {errorMsg ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 flex flex-col items-center justify-center text-rose-500 shadow-xl gap-2">
           <AlertTriangle size={32} />
           <p className="font-bold">{errorMsg}</p>
        </div>
      ) : (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden flex flex-col">
          
          {/* Table Toolbar */}
          <div className="p-4 border-b border-[#1e222b] bg-[#0a0c0f] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
               <input 
                 type="text" 
                 placeholder="Search Name or ID..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-[#13161c] border border-[#1e222b] text-white pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:border-emerald-500 transition-colors"
               />
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="text-xs font-bold text-gray-500 tracking-widest uppercase flex items-center gap-2">
              <Database size={14} className="text-emerald-500" />
              {isLoading ? 'Scanning Cluster...' : `${displayedRoster.length} Nodes Rendered`}
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
             <table className="w-full whitespace-nowrap min-w-[1024px]">
                <thead className="bg-[#0a0c0f] sticky top-0 z-10 shadow-sm">
                   <tr>
                      <th className="px-4 py-3 w-16 text-center text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">#</th>
                      <TheadTh label="Governor" field="name" />
                      <TheadTh label="Alliance" field="alliance" />
                      <TheadTh label="Total Power" field="power" right />
                      <TheadTh label="Kill Points" field="killPoints" right />
                      <TheadTh label="Dead Troops" field="dead" right />
                      <TheadTh label="T4 Kills" field="t4Kills" right />
                      <TheadTh label="T5 Kills" field="t5Kills" right />
                   </tr>
                </thead>
                <tbody className="divide-y divide-[#1e222b] bg-[#13161c]">
                   {isLoading ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                          <RefreshCw size={32} className="animate-spin text-emerald-500 mx-auto mb-4" />
                          <div className="font-bold uppercase tracking-widest text-sm text-emerald-400">Decrypting AWS Architecture</div>
                          <div className="text-xs mt-1">Downloading 10,000+ Table Nodes</div>
                        </td>
                      </tr>
                   ) : displayedRoster.length === 0 ? (
                      <tr>
                         <td colSpan="8" className="px-6 py-8 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">
                            No Records Found
                         </td>
                      </tr>
                   ) : (
                      displayedRoster.map((gov, index) => (
                         <tr key={gov.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-4 py-3 text-center text-xs text-gray-600 font-bold">{index + 1}</td>
                            <td className="px-4 py-3">
                               <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{gov.name}</div>
                               <div className="text-[10px] text-gray-500 font-mono">ID: {gov.id}</div>
                            </td>
                            <td className="px-4 py-3">
                               <span className={`px-2 py-0.5 rounded text-xs font-bold border ${!gov.alliance || gov.alliance === 'None' ? 'bg-gray-800/50 text-gray-500 border-gray-700/50' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 uppercase tracking-widest'}`}>
                                  {gov.alliance || 'NONE'}
                               </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <div className="font-bold text-white font-mono">{formatNumber(gov.power)}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <div className="font-bold text-amber-500 font-mono bg-amber-500/5 px-2 py-0.5 rounded inline-block">{formatNumber(gov.killPoints)}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <div className="font-bold text-rose-500 font-mono">{formatNumber(gov.dead)}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <div className="text-gray-400 font-mono">{formatNumber(gov.t4Kills)}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <div className="text-gray-300 font-mono font-bold">{formatNumber(gov.t5Kills)}</div>
                            </td>
                         </tr>
                      ))
                   )}
                </tbody>
             </table>
          </div>
        </div>
      )}

    </div>
  );
}
