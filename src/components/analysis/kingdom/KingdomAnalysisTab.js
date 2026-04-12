"use client";

import { useState, useEffect } from "react";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { ShieldAlert, TrendingUp, Search } from "lucide-react";
import { useTranslations } from 'next-intl';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b'];

export default function KingdomAnalysisTab({ trends, rosterData, targetKd, startDate, endDate }) {
  const t = useTranslations('KingdomAnalysis');
  const [activeAlliance, setActiveAlliance] = useState("");


  // Derived Data for Alliance Pie Chart
  let alliancePieData = [];
  if (trends && trends.length > 0) {
      const latest = trends[trends.length - 1];
      const allTags = latest.summary?.alliances || {};
      const arr = Object.keys(allTags).map(tag => ({
          name: tag === 'None' ? t('label_unallied') : tag,
          value: allTags[tag]
      })).sort((a, b) => b.value - a.value);
      
      alliancePieData = arr.slice(0, 7);
      if (arr.length > 7) {
          const otherValue = arr.slice(7).reduce((acc, curr) => acc + curr.value, 0);
          if (otherValue > 0) alliancePieData.push({ name: t('label_other'), value: otherValue });
      }
  }

  // Data Filtering for Area Chart
  const actualTrends = (trends || []).map(trend => {
      let plotPower = trend.summary?.totalPower || 0;
      if (activeAlliance && activeAlliance !== t('label_other')) {
          const key = activeAlliance === t('label_unallied') ? 'None' : activeAlliance;
          plotPower = trend.summary?.alliances?.[key] || 0;
      } else if (activeAlliance === t('label_other')) {
           const top7Names = alliancePieData.slice(0,7).map(a => a.name === t('label_unallied') ? 'None' : a.name);
           plotPower = Object.keys(trend.summary?.alliances || {}).reduce((sum, tag) => {
               if (!top7Names.includes(tag)) sum += trend.summary?.alliances[tag];
               return sum;
           }, 0);
      }
      return {
          ...trend,
          dateStr: new Date(trend.scanDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          plotPower: plotPower,
          predictedPower: null,
          isPrediction: false
      };
  });

  const filteredTrends = actualTrends.filter(trend => {
      if (startDate && new Date(trend.scanDate) < new Date(startDate)) return false;
      if (endDate && new Date(trend.scanDate) > new Date(endDate + 'T23:59:59')) return false;
      return true;
  });

  // Linear Regression
  let regression = null;
  if (actualTrends.length >= 2) {
      const n = actualTrends.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      const startMs = new Date(actualTrends[0].scanDate).getTime();
      actualTrends.forEach(t => {
          const x = (new Date(t.scanDate).getTime() - startMs) / (1000 * 60 * 60 * 24);
          const y = t.plotPower;
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumXX += x * x;
      });
      const denominator = (n * sumXX - sumX * sumX);
      if (denominator !== 0) {
          const m = (n * sumXY - sumX * sumY) / denominator;
          const b = (sumY - m * sumX) / n;
          regression = { m, b, startMs };
      }
  }

  const predictionPoints = [];
  if (endDate && actualTrends.length > 0 && regression) {
      const parsedEnd = new Date(endDate + 'T23:59:59');
      const endMs = parsedEnd.getTime();
      const lastActualTrend = actualTrends[actualTrends.length - 1];
      const lastActualMs = new Date(lastActualTrend.scanDate).getTime();
      
      if (endMs > lastActualMs) {
          if (filteredTrends.length > 0 && filteredTrends[filteredTrends.length - 1].scanDate === lastActualTrend.scanDate) {
              filteredTrends[filteredTrends.length - 1].predictedPower = filteredTrends[filteredTrends.length - 1].plotPower;
          }
          
          let currentMs = lastActualMs + (1000 * 60 * 60 * 24);
          while (currentMs <= endMs) {
              const xDays = (currentMs - regression.startMs) / (1000 * 60 * 60 * 24);
              let predY = regression.m * xDays + regression.b;
              if (predY < 0) predY = 0;
              const dateObj = new Date(currentMs);
              predictionPoints.push({
                  scanDate: dateObj.toISOString(),
                  dateStr: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  plotPower: null,
                  predictedPower: predY,
                  isPrediction: true
              });
              currentMs += (1000 * 60 * 60 * 24);
          }
          if (predictionPoints.length > 0) {
              const lastPredMs = new Date(predictionPoints[predictionPoints.length - 1].scanDate).getTime();
              if (endMs - lastPredMs > (1000 * 60 * 60)) { 
                 const xDays = (endMs - regression.startMs) / (1000 * 60 * 60 * 24);
                 let predY = regression.m * xDays + regression.b;
                 if (predY < 0) predY = 0;
                 predictionPoints.push({
                      scanDate: parsedEnd.toISOString(),
                      dateStr: parsedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      plotPower: null,
                      predictedPower: predY,
                      isPrediction: true
                 });
              }
          }
      }
  }

  const finalChartData = [...filteredTrends, ...predictionPoints];
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
      const pData = payload[0].payload;
      let val = null;
      let isPred = false;
      if (pData.isPrediction) { val = pData.predictedPower; isPred = true; } 
      else { val = pData.plotPower; }
      if (val == null) return null;

      const displayVal = val >= 1000000000 ? (val / 1000000000).toFixed(3) + 'B' : (val / 1000000).toFixed(1) + 'M';
      return (
        <div className="bg-[#0f1115] border border-[#1e222b] p-4 rounded-lg shadow-xl outline-none">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            {label} {isPred && <span className="text-cyan-500 text-[9px] tracking-widest bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">{t('tooltip_projection')}</span>}
          </p>
          <p style={{ color: activeColor }} className="font-mono font-bold text-lg">{displayVal} {t('tooltip_power')}</p>
          <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-wider">
              {activeAlliance ? t('tooltip_metric_alliance', { alliance: activeAlliance }) : t('tooltip_metric_all')}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!trends || trends.length === 0) {
      return (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{t('no_telemetry_title')}</h3>
            <p className="text-sm">{t('no_telemetry_desc')}</p>
        </div>
      );
  }

  return (
    <div className="animate-fade-in space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Area Chart */}
            <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 relative overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 z-10 relative">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} style={{ color: activeColor }} />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">
                            {activeAlliance ? t('trajectory_title_alliance', { alliance: activeAlliance }) : t('trajectory_title_all')}
                        </h2>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-[300px] z-10 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={finalChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={activeColor} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={activeColor} stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e222b" vertical={false} />
                            <XAxis 
                                dataKey="dateStr" 
                                stroke="#4b5563" 
                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={20}
                            />
                            <YAxis 
                                stroke="#4b5563" 
                                tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatYAxis}
                                width={50}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2d323e', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            
                            <Area 
                                type="monotone" 
                                dataKey="plotPower" 
                                stroke={activeColor} 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorPower)" 
                                activeDot={{ r: 6, fill: activeColor, stroke: '#0f1115', strokeWidth: 2 }}
                                animationDuration={1000}
                                connectNulls
                            />
                            
                            <Area 
                                type="monotone" 
                                dataKey="predictedPower" 
                                stroke={activeColor} 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fillOpacity={1} 
                                fill="url(#colorPrediction)" 
                                activeDot={{ r: 4, fill: activeColor, stroke: '#0f1115', strokeWidth: 2 }}
                                connectNulls
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Alliance Hegemony Pie Chart */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 flex flex-col items-center relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2 w-full justify-center z-10">
                    <Search size={16} className="text-rose-500" />
                    <h2 className="text-white font-bold uppercase tracking-widest text-sm text-center">{t('hegemony_title')}</h2>
                </div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider text-center mb-6 z-10 w-full px-4">
                    {t('hegemony_desc')}
                </p>

                <div className="h-[240px] w-full relative z-10 flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip 
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-[#0f1115] border border-[#1e222b] p-3 rounded-lg shadow-xl outline-none text-center">
                                          <p className="text-white font-bold uppercase tracking-widest text-sm mb-1">{data.name}</p>
                                          <p className="font-mono text-xs text-gray-400">{(data.value / 1000000000).toFixed(2)}B {t('tooltip_power')}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                }}
                            />
                            <Pie
                                data={alliancePieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                onClick={(entry) => {
                                    if (activeAlliance === entry.name) {
                                        setActiveAlliance("");
                                    } else {
                                        setActiveAlliance(entry.name);
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {alliancePieData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]} 
                                        opacity={activeAlliance ? (activeAlliance === entry.name ? 1 : 0.2) : 0.8}
                                        className="transition-opacity duration-300 hover:opacity-100"
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Active Pie Chart Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-white">{activeAlliance || t('pie_center_all')}</span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest">
                            {activeAlliance ? t('pie_center_isolated') : t('pie_center_entities')}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mt-4 z-10 w-full">
                    <button 
                         onClick={() => setActiveAlliance("")}
                         className={`text-[10px] px-2 py-1 rounded transition-colors uppercase font-bold tracking-wider border ${
                             !activeAlliance 
                                 ? 'bg-gray-800 text-white border-gray-600' 
                                 : 'bg-transparent text-gray-500 border-[#1e222b] hover:border-gray-600 hover:text-gray-300'
                         }`}
                    >
                         {t('btn_reset')}
                    </button>
                    {alliancePieData.map((a, i) => (
                        <button
                             key={a.name}
                             onClick={() => setActiveAlliance(activeAlliance === a.name ? "" : a.name)}
                             className={`text-[10px] px-2 py-1 rounded transition-all uppercase font-bold tracking-wider border flex items-center gap-1.5 ${
                                 activeAlliance === a.name 
                                     ? 'bg-opacity-20 text-white shadow-sm' 
                                     : 'bg-transparent text-gray-500 border-[#1e222b] hover:border-gray-600 hover:text-gray-300'
                             }`}
                             style={{
                                 backgroundColor: activeAlliance === a.name ? `${COLORS[i % COLORS.length]}20` : 'transparent',
                                 borderColor: activeAlliance === a.name ? COLORS[i % COLORS.length] : undefined
                             }}
                        >
                             <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                             {a.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Dynamic Alliance Roster List */}
        {activeAlliance && rosterData && (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 animate-fade-in relative overflow-hidden">
                <div className="flex items-center gap-2 mb-6 border-b border-[#1e222b] pb-4">
                    <ShieldAlert size={18} style={{ color: activeColor }} />
                    <h2 className="text-white font-bold uppercase tracking-widest text-sm">
                        {t('roster_title', { alliance: activeAlliance === t('label_unallied') ? 'None' : activeAlliance })}
                    </h2>
                    <span className="ml-auto bg-[#13161c] text-gray-400 text-xs px-2 py-1 rounded border border-[#1e222b] font-mono shadow-inner">
                        {rosterData.filter(g => g.alliance === (activeAlliance === t('label_unallied') ? 'None' : activeAlliance)).length} {t('roster_members')}
                    </span>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#1e222b]">
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest">{t('col_governor')}</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest text-right">{t('col_power')}</th>
                                <th className="p-3 text-xs font-black text-gray-500 uppercase tracking-widest text-right">{t('col_killpoints')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rosterData
                                .filter(g => g.alliance === (activeAlliance === t('label_unallied') ? 'None' : activeAlliance))
                                .sort((a, b) => b.power - a.power)
                                .map((g, idx) => (
                                    <tr key={g.id || idx} className="border-b border-[#1e222b]/50 hover:bg-[#13161c] transition-colors">
                                        <td className="p-3">
                                            <div className="font-bold text-white text-sm">{g.name || t('roster_unknown')}</div>
                                            <div className="text-[10px] text-gray-500 font-mono tracking-widest">ID: {g.id}</div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="font-mono text-emerald-400 font-bold">{formatYAxis(g.power)}</div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="font-mono text-rose-400 font-bold">{formatYAxis(g.killPoints || 0)}</div>
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
