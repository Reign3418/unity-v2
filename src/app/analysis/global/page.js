"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Globe2, RefreshCw, BarChart, ShieldAlert, Zap
} from "lucide-react";
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function GlobalAnalysis() {
  const { data: session } = useSession();
  
  const [globalStats, setGlobalStats] = useState([]);
  const [selectedKds, setSelectedKds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGlobalStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/global`);
      const data = await res.json();
      
      if (res.ok && data.globalStats) {
          setGlobalStats(data.globalStats);
          // Auto-select all by default if less than 10, otherwise just the top 5
          const allKds = data.globalStats.map(s => s.kingdom);
          setSelectedKds(allKds.length > 10 ? allKds.slice(0, 5) : allKds);
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

  const formatYAxis = (tickItem) => {
      return (tickItem / 1000000000).toFixed(1) + 'B';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1115] border border-[#1e222b] p-4 rounded-lg shadow-xl outline-none">
          <p className="text-white font-bold uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1">
             {payload.map((p, idx) => (
                 <p key={idx} style={{ color: p.fill }} className="font-mono font-bold flex justify-between gap-6">
                     <span>{p.name}:</span>
                     <span>
                         {p.name.includes("Power") 
                            ? (p.value / 1000000000).toFixed(2) + 'B' 
                            : (p.value / 1000000000).toFixed(2) + 'B'}
                     </span>
                 </p>
             ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                 <Globe2 className="text-indigo-500" size={32} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-widest uppercase">All Kingdom Stats</h1>
                 <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Cross-Server Macro Diagnostics</p>
               </div>
            </div>
            
            <button 
                onClick={fetchGlobalStats}
                disabled={isLoading}
                className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg"
            >
                <RefreshCw size={20} className={isLoading ? "animate-spin text-indigo-500" : ""} />
            </button>
         </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-indigo-500 w-8 h-8" />
        </div>
      ) : globalStats.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-indigo-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Global Architecture Verified</h3>
            <p className="text-sm">Cannot formulate models. Ensure the ingestion pipeline operates on multiple servers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Global Power Comparison Bar Chart */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 relative overflow-hidden lg:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <BarChart size={18} className="text-indigo-500" />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">Hegemonic Power Vectors (Active)</h2>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 max-w-2xl justify-end">
                        <div className="w-full text-right text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Select Domains to Compare:</div>
                        {globalStats.map(kd => (
                            <button 
                                key={kd.kingdom}
                                onClick={() => {
                                    if (selectedKds.includes(kd.kingdom)) {
                                        setSelectedKds(prev => prev.filter(k => k !== kd.kingdom));
                                    } else {
                                        setSelectedKds(prev => [...prev, kd.kingdom]);
                                    }
                                }}
                                className={`px-3 py-1 text-xs font-bold rounded-md border transition-colors ${selectedKds.includes(kd.kingdom) ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-[#13161c] text-gray-500 border-[#1e222b] hover:border-gray-500 hover:text-gray-300'}`}
                            >
                                {kd.kingdom}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={globalStats.filter(g => selectedKds.includes(g.kingdom))} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e222b" vertical={false} />
                            <XAxis dataKey="kingdom" stroke="#475569" fontSize={12} fontStyle="bold" tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickFormatter={formatYAxis} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#13161c'}} />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Bar dataKey="totalPower" name="Raw Core Power" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="totalKP" name="Lethality Metrics (KP)" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={40} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Micro Stats List for Top Kingdoms */}
            <div className="space-y-4 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {globalStats.filter(g => selectedKds.includes(g.kingdom)).map((kd, idx) => (
                   <div key={idx} className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-colors mt-0">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
                       
                       <div className="flex justify-between items-center mb-4 relative z-10">
                           <div className="text-2xl font-black text-white tracking-widest uppercase">{kd.kingdom}</div>
                           <div className="bg-[#13161c] px-3 py-1 border border-[#1e222b] text-indigo-400 font-bold text-[10px] uppercase tracking-wider rounded">
                               Verified Node
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 relative z-10">
                           <div>
                               <div className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                   <Zap size={10}/> Total Power Output
                               </div>
                               <div className="text-white font-mono font-bold text-lg">{kd.displayPower}</div>
                           </div>
                           <div>
                               <div className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                   <Zap size={10}/> Active Field Elements
                               </div>
                               <div className="text-white font-mono font-bold text-lg">{kd.activeGovernors.toLocaleString()}</div>
                           </div>
                           <div className="col-span-2 bg-[#13161c] p-3 rounded-lg border border-[#1e222b] mt-2">
                               <div className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">Global KP / Power Efficiency Ratio</div>
                               <div className="flex items-center justify-between">
                                  <div className="text-cyan-400 font-mono font-bold capitalize">
                                      {((kd.totalKP / kd.totalPower) * 100).toFixed(2)}% Lethality
                                  </div>
                                  <div className="w-2/3 bg-[#0a0c0f] rounded-full h-1.5 overflow-hidden">
                                     <div className="bg-cyan-500 h-full" style={{ width: `${Math.min(((kd.totalKP / kd.totalPower) * 100), 100)}%` }}></div>
                                  </div>
                               </div>
                           </div>
                       </div>
                   </div>
               ))}
            </div>

        </div>
      )}
    </div>
  );
}
