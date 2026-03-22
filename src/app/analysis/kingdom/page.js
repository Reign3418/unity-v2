"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  BarChart2, RefreshCw, TrendingUp, ShieldAlert, Target, Users
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function KingdomAnalysis() {
  const { data: session } = useSession();
  
  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetKd, setTargetKd] = useState("3155");

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#84cc16'];

  const fetchTrends = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/trends?kd=${targetKd}`);
      const data = await res.json();
      
      if (res.ok && data.trends) {
          // Format data for Recharts
          const formatted = data.trends.map(t => {
              const summary = t.summary || { totalPower: 0, activeGovernors: 0, alliances: {} };
              // Format date: "2026_03_23_10_00_00" -> "Mar 23"
              const dateObj = new Date(t.scanDate);
              const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              return {
                  rawDate: t.scanDate,
                  dateStr,
                  totalPower: summary.totalPower,
                  displayPower: (summary.totalPower / 1000000000).toFixed(2) + 'B',
                  activeGovernors: summary.activeGovernors,
                  alliances: summary.alliances
              };
          });
          setTrends(formatted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [targetKd]);

  // Derived Data for Alliance Pie Chart (Latest Data Point)
  let alliancePieData = [];
  if (trends.length > 0) {
      const latest = trends[trends.length - 1];
      const allTags = latest.alliances;
      // Convert to array and sort by power
      const arr = Object.keys(allTags).map(tag => ({
          name: tag === 'None' ? 'Unallied' : tag,
          value: allTags[tag]
      })).sort((a, b) => b.value - a.value);
      
      // Top 7 alliances, group rest into "Other"
      alliancePieData = arr.slice(0, 7);
      if (arr.length > 7) {
          const otherValue = arr.slice(7).reduce((acc, curr) => acc + curr.value, 0);
          if (otherValue > 0) alliancePieData.push({ name: 'Other', value: otherValue });
      }
  }

  const formatYAxis = (tickItem) => {
      return (tickItem / 1000000000).toFixed(1) + 'B';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1115] border border-[#1e222b] p-4 rounded-lg shadow-xl outline-none">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
          <p className="text-cyan-400 font-mono font-bold text-lg">{(payload[0].value / 1000000000).toFixed(3)}B Power</p>
          <p className="text-gray-500 text-[10px] mt-1">Based on AWS Data Ingestion Matrix</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                 <BarChart2 className="text-cyan-500" size={32} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-widest uppercase">Kingdom Analysis</h1>
                 <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Macro Data & Telemetry</p>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <select 
                 value={targetKd}
                 onChange={(e) => setTargetKd(e.target.value)}
                 className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-cyan-500 px-4 py-2 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
               >
                 <option value="3155">Kingdom 3155</option>
                 <option value="3156">Kingdom 3156</option>
               </select>

               <button 
                 onClick={fetchTrends}
                 disabled={isLoading}
                 className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg"
               >
                  <RefreshCw size={20} className={isLoading ? "animate-spin text-cyan-500" : ""} />
               </button>
            </div>
         </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-cyan-500 w-8 h-8" />
        </div>
      ) : trends.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Telemetry Verified</h3>
            <p className="text-sm">Cannot formulate models. Ensure the ingestion pipeline has processed at least one scan for this server.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Area Chart (Takes up 2 cols on big screens) */}
            <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-cyan-500" />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">Chronological Power Trajectory</h2>
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold bg-[#13161c] px-3 py-1 rounded border border-[#1e222b]">
                        Over {trends.length} Scans
                    </div>
                </div>
                
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e222b" vertical={false} />
                            <XAxis dataKey="dateStr" stroke="#475569" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickFormatter={formatYAxis} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="totalPower" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPower)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alliance Distribution Pie Chart */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                    <Target size={18} className="text-blue-500" />
                    <h2 className="text-white font-bold uppercase tracking-widest text-sm">Alliance Hegemony</h2>
                </div>
                
                <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={alliancePieData}
                                cx="50%"
                                cy="45%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                {alliancePieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip 
                                formatter={(value) => [(value / 1000000000).toFixed(2) + 'B Power', 'Power']}
                                contentStyle={{ backgroundColor: '#0f1115', borderColor: '#1e222b', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Inner Text */}
                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <div className="text-gray-500 text-[9px] uppercase tracking-wider font-bold mb-0.5">Top Alliance</div>
                        <div className="text-white font-bold text-lg leading-none">{alliancePieData.length > 0 ? alliancePieData[0].name : "N/A"}</div>
                    </div>
                </div>
            </div>

            {/* Micro Stats Grid */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5 shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                        <TrendingUp className="text-cyan-500" size={20} />
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Total Server Power</div>
                        <div className="text-white font-mono font-bold text-xl">{trends.length > 0 ? trends[trends.length - 1].displayPower : "0"}</div>
                    </div>
                </div>
                
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5 shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Users className="text-blue-500" size={20} />
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Active Core Governors</div>
                        <div className="text-white font-mono font-bold text-xl">{trends.length > 0 ? trends[trends.length - 1].activeGovernors.toLocaleString() : "0"}</div>
                    </div>
                </div>

                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5 shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Target className="text-purple-500" size={20} />
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Major Hegemony</div>
                        <div className="text-white font-mono font-bold text-xl">{Object.keys(trends.length > 0 ? trends[trends.length - 1].alliances : {}).length} Alliances</div>
                    </div>
                </div>
            </div>

        </div>
      )}
    </div>
  );
}
