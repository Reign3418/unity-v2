"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  BarChart2, RefreshCw, TrendingUp, ShieldAlert, Target, Users, Calendar
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

  // Interactive UI States
  const [activeAlliance, setActiveAlliance] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rosterData, setRosterData] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#84cc16'];

  const fetchTrends = async (overrideKd = null) => {
    setIsLoading(true);
    const kdToFetch = overrideKd || targetKd;
    try {
      const res = await fetch(`/api/aws/trends?kd=${kdToFetch}`);
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

  const fetchRoster = async (overrideKd = null) => {
      setIsLoadingRoster(true);
      const kdToFetch = overrideKd || targetKd;
      try {
          // Utilizing Deltas if available
          const res = await fetch(`/api/aws/roster?kd=${kdToFetch}`);
          const data = await res.json();
          if (res.ok && data.roster) {
              setRosterData(data.roster);
          }
      } catch(e) { console.error(e); }
      finally { setIsLoadingRoster(false); }
  }

  useEffect(() => {
    let activeKd = targetKd;
    if (typeof window !== 'undefined') {
        const storedKd = localStorage.getItem('unty_active_kd');
        if (storedKd) {
            activeKd = storedKd;
            setTargetKd(storedKd);
        } else if (session?.user?.tenant?.kingdomId) {
            activeKd = session.user.tenant.kingdomId;
            setTargetKd(activeKd);
        }
    }
    fetchTrends(activeKd);
    fetchRoster(activeKd);
    setActiveAlliance(null); // Reset drill-down on KD swap
  }, [session]);

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

  // Data Filtering for Area Chart
  const filteredTrends = trends.filter(t => {
      if (startDate && new Date(t.rawDate) < new Date(startDate)) return false;
      // Append time to end date so it includes the full day
      if (endDate && new Date(t.rawDate) > new Date(endDate + 'T23:59:59')) return false;
      return true;
  }).map(t => {
      let plotPower = t.totalPower;
      if (activeAlliance && activeAlliance !== 'Other') {
          const key = activeAlliance === 'Unallied' ? 'None' : activeAlliance;
          plotPower = t.alliances[key] || 0;
      } else if (activeAlliance === 'Other') {
           // Aggregate power of all non-top-7 alliances
           const top7Names = alliancePieData.slice(0,7).map(a => a.name === 'Unallied' ? 'None' : a.name);
           plotPower = Object.keys(t.alliances).reduce((sum, tag) => {
               if (!top7Names.includes(tag)) sum += t.alliances[tag];
               return sum;
           }, 0);
      }
      return {
          ...t,
          plotPower: plotPower
      };
  });

  const activeColorIndex = alliancePieData.findIndex(a => a.name === activeAlliance);
  const activeColor = activeColorIndex !== -1 ? COLORS[activeColorIndex % COLORS.length] : '#10b981';

  const formatYAxis = (tickItem) => {
      if (tickItem === 0) return '0';
      if (tickItem < 1000000) return (tickItem / 1000).toFixed(0) + 'K';
      if (tickItem < 1000000000) return (tickItem / 1000000).toFixed(1) + 'M';
      return (tickItem / 1000000000).toFixed(1) + 'B';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const displayVal = val >= 1000000000 ? (val / 1000000000).toFixed(3) + 'B' : (val / 1000000).toFixed(1) + 'M';
      return (
        <div className="bg-[#0f1115] border border-[#1e222b] p-4 rounded-lg shadow-xl outline-none">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
          <p style={{ color: activeColor }} className="font-mono font-bold text-lg">{displayVal} Power</p>
          <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-wider">
              {activeAlliance ? `[${activeAlliance}] Alliance Metric` : 'Kingdom Overall Metric'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
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
                 <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Interactive Macro Data</p>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <select 
                 value={targetKd}
                 onChange={(e) => {
                     const newKd = e.target.value;
                     setTargetKd(newKd);
                     if (typeof window !== 'undefined') localStorage.setItem('unty_active_kd', newKd);
                     fetchTrends(newKd);
                     fetchRoster(newKd);
                 }}
                 className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-cyan-500 px-4 py-2 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
               >
                 {session?.user?.allowedKingdoms?.map(kd => (
                    <option key={kd} value={kd}>Kingdom {kd}</option>
                 ))}
                 {!session?.user?.allowedKingdoms?.includes(targetKd) && targetKd && (
                    <option value={targetKd}>Kingdom {targetKd}</option>
                 )}
               </select>

               <button 
                 onClick={() => { fetchTrends(); fetchRoster(); }}
                 disabled={isLoading || isLoadingRoster}
                 className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg"
               >
                  <RefreshCw size={20} className={(isLoading || isLoadingRoster) ? "animate-spin text-cyan-500" : ""} />
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
            <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 relative overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 z-10 relative">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} style={{ color: activeColor }} />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">
                            {activeAlliance ? `[${activeAlliance}] Trajectory` : 'Chronological Power Trajectory'}
                        </h2>
                    </div>
                    
                    {/* Date Pickers */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 bg-[#13161c] border border-[#1e222b] rounded px-3 py-1.5 focus-within:border-cyan-500 transition-colors">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Start</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-transparent text-white text-xs outline-none font-mono cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-[#13161c] border border-[#1e222b] rounded px-3 py-1.5 focus-within:border-cyan-500 transition-colors">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">End</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)}
                                min={startDate}
                                className="bg-transparent text-white text-xs outline-none font-mono cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button 
                                onClick={() => { setStartDate(""); setEndDate(""); }} 
                                className="text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider bg-[#1e222b] hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="h-[350px] w-full mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={activeColor} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e222b" vertical={false} />
                            <XAxis dataKey="dateStr" stroke="#475569" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickFormatter={formatYAxis} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#2d323e', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area 
                                type="monotone" 
                                dataKey="plotPower" 
                                stroke={activeColor} 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorPower)" 
                                animationDuration={800}
                                animationEasing="ease-in-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    
                    {filteredTrends.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <Calendar className="w-8 h-8 text-gray-600 mb-2" />
                            <div className="text-gray-500 text-xs uppercase tracking-widest font-bold">No Data in Timeframe</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Alliance Distribution Pie Chart */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target size={18} className="text-blue-500" />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">Alliance Hegemony</h2>
                    </div>
                    {activeAlliance && (
                        <button 
                            onClick={() => setActiveAlliance(null)}
                            className="text-[9px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 hover:bg-cyan-500/20 transition"
                        >
                            Reset View
                        </button>
                    )}
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
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                                onClick={(data) => setActiveAlliance(activeAlliance === data.name ? null : data.name)}
                                className="cursor-pointer outline-none"
                            >
                                {alliancePieData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]} 
                                        style={{ 
                                            opacity: activeAlliance && activeAlliance !== entry.name ? 0.3 : 1,
                                            transition: 'opacity 0.3s ease'
                                        }}
                                    />
                                ))}
                            </Pie>
                            <RechartsTooltip 
                                formatter={(value) => [(value / 1000000000).toFixed(2) + 'B Power', 'Power Segment']}
                                contentStyle={{ backgroundColor: '#0f1115', borderColor: '#1e222b', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Inner Text */}
                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <div className="text-gray-500 text-[9px] uppercase tracking-wider font-bold mb-0.5">Focus Block</div>
                        <div className="text-white font-bold text-lg leading-none" style={{ color: activeColor }}>
                            {activeAlliance || "Kingdom"}
                        </div>
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
            
            {/* Dynamic Alliance Roster Payload */}
            {activeAlliance && activeAlliance !== 'Other' && (
                <div className="lg:col-span-3 bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 overflow-hidden animate-fade-in">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                         <div className="flex items-center gap-2">
                             <Users size={18} style={{ color: activeColor }} />
                             <h2 className="text-white font-bold uppercase tracking-widest text-sm">
                                 [{activeAlliance}] Combat Logistics Roster
                             </h2>
                         </div>
                         <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold bg-[#13161c] px-3 py-1.5 rounded border border-[#1e222b] flex items-center gap-2">
                             {isLoadingRoster && <RefreshCw size={12} className="animate-spin text-cyan-500" />}
                             <span>{rosterData.filter(p => (activeAlliance === 'Unallied' ? String(p.alliance) === 'None' : String(p.alliance) === activeAlliance)).length} Members Identified</span>
                         </div>
                     </div>
                     
                     <div className="overflow-x-auto rounded-lg border border-[#1e222b]">
                         <table className="w-full text-left border-collapse">
                             <thead>
                                 <tr className="border-b border-[#1e222b] text-gray-500 text-[10px] uppercase tracking-wider bg-[#13161c]">
                                     <th className="p-4 font-bold">Governor Protocol</th>
                                     <th className="p-4 font-bold">Raw Power</th>
                                     <th className="p-4 font-bold">Lethality Metrics (KP)</th>
                                     <th className="p-4 font-bold text-right">Delta Acceleration</th>
                                 </tr>
                             </thead>
                             <tbody className="text-sm font-mono">
                                 {rosterData
                                     .filter(p => (activeAlliance === 'Unallied' ? String(p.alliance) === 'None' : String(p.alliance) === activeAlliance))
                                     .sort((a, b) => b.power - a.power)
                                     .map((player, idx) => (
                                         <tr key={idx} className="border-b border-[#1e222b]/50 hover:bg-[#1e222b]/30 transition-colors group">
                                             <td className="p-4 text-white font-bold max-w-[200px] truncate" title={player.name}>
                                                 {player.name}
                                                 <div className="text-[10px] text-gray-500 group-hover:text-cyan-400 transition-colors">ID: {player.id}</div>
                                             </td>
                                             <td className="p-4 text-cyan-400">
                                                 {player.power.toLocaleString()}
                                             </td>
                                             <td className="p-4 text-pink-500">
                                                 {player.killPoints.toLocaleString()}
                                             </td>
                                             <td className="p-4 text-right">
                                                 {player.powerDelta > 0 ? (
                                                     <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded inline-block min-w-[60px] text-center border border-emerald-500/20">+{player.powerDelta.toLocaleString()}</span>
                                                 ) : player.powerDelta < 0 || player.powerDelta === 'MISSING' ? (
                                                     <span className="text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded inline-block min-w-[60px] text-center border border-red-500/20">{player.powerDelta.toLocaleString()}</span>
                                                 ) : player.powerDelta === 'NEW' ? (
                                                     <span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-1 rounded inline-block min-w-[60px] text-center border border-blue-500/20 font-bold tracking-widest">NEW</span>
                                                 ) : (
                                                     <span className="text-gray-600 text-xs inline-block min-w-[60px] text-center">-</span>
                                                 )}
                                             </td>
                                         </tr>
                                     ))}
                                
                                 {rosterData.filter(p => (activeAlliance === 'Unallied' ? String(p.alliance) === 'None' : String(p.alliance) === activeAlliance)).length === 0 && !isLoadingRoster && (
                                     <tr>
                                         <td colSpan="4" className="p-12 text-center text-gray-500 text-xs uppercase tracking-widest font-bold bg-[#13161c]">
                                             <ShieldAlert className="w-8 h-8 opacity-50 mx-auto mb-3" />
                                             <p>No governors mathematically mapped to {activeAlliance}</p>
                                         </td>
                                     </tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                </div>
            )}

        </div>
      )}
    </div>
  );
}

