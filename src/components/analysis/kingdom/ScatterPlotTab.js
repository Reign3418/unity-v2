"use client";

import { useState, useMemo } from "react";
import { 
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ZAxis, Legend, Cell
} from 'recharts';
import { Map, TrendingUp, AlertCircle, ShieldAlert } from "lucide-react";

// Standard Unity Alliance Hex Palette
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b'];

const METRICS = [
    { id: 'power', label: 'Total Power' },
    { id: 'killPoints', label: 'Kill Points' },
    { id: 'dead', label: 'Deads' },
    { id: 't4Kills', label: 'T4 Kills' },
    { id: 't5Kills', label: 'T5 Kills' },
    { id: 'gathered', label: 'RSS Gathered' },
    { id: 'assistance', label: 'Assistance' },
    { id: 'techPower', label: 'Tech Power' },
    { id: 'commanderPower', label: 'Commander Power' }
];

export default function ScatterPlotTab({ rosterData }) {
    const [xAxisMetric, setXAxisMetric] = useState('power');
    const [yAxisMetric, setYAxisMetric] = useState('killPoints');

    // Derived Statistics and Sorting
    const { chartData, topAlliances } = useMemo(() => {
        if (!rosterData || rosterData.length === 0) return { chartData: [], topAlliances: [] };

        // 1. Calculate Alliance Hegemony to define top 7 alliances
        const allianceMap = {};
        let totalEntities = 0;
        
        rosterData.forEach(gov => {
            if (gov.power === 0) return; // Ignore zero-power phantom accounts
            const tag = gov.alliance || 'None';
            if (!allianceMap[tag]) allianceMap[tag] = 0;
            allianceMap[tag] += gov.power;
            totalEntities++;
        });

        const sortedTags = Object.keys(allianceMap)
            .map(tag => ({ name: tag, power: allianceMap[tag] }))
            .sort((a, b) => b.power - a.power);

        const top7 = sortedTags.slice(0, 7).map(a => a.name);

        // 2. Format Data into Distinct Arrays for <Scatter> layers
        const seriesData = {};
        
        // Ensure "Unallied" is treated individually
        top7.forEach(tag => seriesData[tag] = []);
        seriesData['Other'] = [];
        
        if (!top7.includes('None')) {
            seriesData['Unallied'] = [];
        }

        rosterData.forEach(gov => {
            if (gov.power === 0) return;

            const xVal = gov[xAxisMetric] || 0;
            const yVal = gov[yAxisMetric] || 0;
            
            // Only plot points that have non-zero data (avoids clustering at 0,0)
            if (xVal === 0 && yVal === 0) return;

            let tagKey = gov.alliance || 'None';
            if (tagKey === 'None' && !top7.includes('None')) {
                tagKey = 'Unallied';
            } else if (!top7.includes(tagKey) && tagKey !== 'None') {
                tagKey = 'Other';
            }

            if (!seriesData[tagKey]) seriesData[tagKey] = [];
            
            seriesData[tagKey].push({
                x: xVal,
                y: yVal,
                z: 1, // Fixed node radius weight
                name: gov.name,
                alliance: gov.alliance || 'None',
                id: gov.id
            });
        });

        // Delete empty arrays
        Object.keys(seriesData).forEach(key => {
            if (seriesData[key].length === 0) delete seriesData[key];
        });

        return { chartData: seriesData, topAlliances: Object.keys(seriesData) };
    }, [rosterData, xAxisMetric, yAxisMetric]);

    if (!rosterData || rosterData.length === 0) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500 shadow-xl">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Roster Infrastructure</h3>
                <p className="text-sm">Cannot formulate scatter vectors without an active Snapshot Map.</p>
            </div>
        );
    }

    const formatAxisLabel = (value) => {
        if (value === 0) return '0';
        if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
        if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
        return value.toString();
    };

    const getMetricLabel = (key) => METRICS.find(m => m.id === key)?.label || key;

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-[#13161c] border border-[#2d323e] p-4 rounded-lg shadow-2xl backdrop-blur-md outline-none">
                    <p className="text-white font-black text-lg flex items-center gap-2 mb-1 uppercase tracking-wider">
                        {data.name} 
                        <span className="text-cyan-500 text-[10px] tracking-widest bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 ml-2">[{data.alliance}]</span>
                    </p>
                    <p className="text-gray-500 font-mono text-xs tracking-widest mb-3">ID: {data.id}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-md p-2">
                             <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">X: {getMetricLabel(xAxisMetric)}</span>
                             <span className="text-cyan-400 font-mono text-sm">{data.x.toLocaleString()}</span>
                        </div>
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-md p-2">
                             <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Y: {getMetricLabel(yAxisMetric)}</span>
                             <span className="text-cyan-400 font-mono text-sm">{data.y.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-fade-in space-y-6">
            
            {/* Header Control Panel */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between p-6 gap-6 relative overflow-hidden">
                <div className="flex items-center gap-4 z-10 relative">
                    <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
                         <Map className="text-cyan-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-none">Scatter Engine</h2>
                        <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold flex items-center gap-1"><TrendingUp size={12}/> {rosterData.length.toLocaleString()} Tracked Entities</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 z-10 relative">
                    {/* X-Axis Selector */}
                    <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-2 px-4 shadow-lg border-b-4 border-b-blue-500">
                         <label className="block text-[10px] text-blue-500 font-black uppercase tracking-wider mb-1">X-Axis Mapping</label>
                         <select 
                             value={xAxisMetric} 
                             onChange={e => setXAxisMetric(e.target.value)}
                             className="bg-transparent text-white text-sm outline-none font-bold uppercase cursor-pointer w-full"
                         >
                             {METRICS.map(m => <option key={m.id} value={m.id} className="bg-[#0f1115]">{m.label}</option>)}
                         </select>
                    </div>

                    {/* Y-Axis Selector */}
                    <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-2 px-4 shadow-lg border-l-4 border-l-cyan-500">
                         <label className="block text-[10px] text-cyan-500 font-black uppercase tracking-wider mb-1">Y-Axis Mapping</label>
                         <select 
                             value={yAxisMetric} 
                             onChange={e => setYAxisMetric(e.target.value)}
                             className="bg-transparent text-white text-sm outline-none font-bold uppercase cursor-pointer w-full"
                         >
                             {METRICS.map(m => <option key={m.id} value={m.id} className="bg-[#0f1115]">{m.label}</option>)}
                         </select>
                    </div>
                </div>
                
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Cartesian Scatter Grid */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-2xl p-4 lg:p-8 min-h-[600px] flex flex-col relative overflow-hidden">
                 
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#13161c_1px,transparent_1px),linear-gradient(to_bottom,#13161c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-50"></div>

                 <div className="flex-1 w-full relative z-10">
                     <ResponsiveContainer width="100%" height={500}>
                         <ScatterChart margin={{ top: 30, right: 30, bottom: 20, left: 30 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#1e222b" opacity={0.5} />
                             
                             <XAxis 
                                 type="number" 
                                 dataKey="x" 
                                 name={getMetricLabel(xAxisMetric)} 
                                 stroke="#4b5563"
                                 tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                                 tickFormatter={formatAxisLabel}
                                 tickLine={false}
                                 axisLine={{ stroke: '#2d323e' }}
                             >
                                 <label value={getMetricLabel(xAxisMetric).toUpperCase()} position="insideBottom" offset={-15} fill="#4b5563" fontSize={11} fontWeight="bold" letterSpacing={1} />
                             </XAxis>
                             
                             <YAxis 
                                 type="number" 
                                 dataKey="y" 
                                 name={getMetricLabel(yAxisMetric)}
                                 stroke="#4b5563"
                                 tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                                 tickFormatter={formatAxisLabel}
                                 tickLine={false}
                                 axisLine={{ stroke: '#2d323e' }}
                             />
                             
                             <ZAxis type="number" dataKey="z" range={[50, 50]} />
                             
                             <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#3b82f6', opacity: 0.5 }} />
                             
                             <Legend 
                                 wrapperStyle={{ paddingTop: '20px' }}
                                 iconType="circle"
                                 formatter={(value) => <span className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">{value}</span>}
                             />

                             {/* Render individual scatter series for each Alliance category */}
                             {topAlliances.map((allianceKey, index) => {
                                 // Default colors: Unallied = grey, Other = deep blue/grey, standard 7 = sequence
                                 let color = COLORS[index % COLORS.length];
                                 if (allianceKey === 'Unallied') color = '#64748b';
                                 else if (allianceKey === 'Other') color = '#334155';
                                 
                                 return (
                                     <Scatter 
                                         key={allianceKey} 
                                         name={allianceKey === 'None' ? 'Unallied' : allianceKey} 
                                         data={chartData[allianceKey]} 
                                         fill={color}
                                         shape="circle"
                                         fillOpacity={0.7}
                                     >
                                         {chartData[allianceKey].map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={color} />
                                         ))}
                                     </Scatter>
                                 );
                             })}
                         </ScatterChart>
                     </ResponsiveContainer>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 flex flex-col justify-center">
                    <h4 className="text-white font-bold uppercase tracking-widest text-sm mb-2 opacity-80 flex items-center gap-2">
                        <AlertCircle className="text-blue-500" size={16} /> Data Interpretation
                    </h4>
                    <p className="text-gray-500 text-xs leading-relaxed">
                        The Scatter Engine maps statistical differentials between any two selected arrays on a Cartesian plane. It natively separates clusters globally to detect structural alliance anomalies.
                    </p>
                </div>
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 flex flex-col justify-center">
                    <h4 className="text-white font-bold uppercase tracking-widest text-sm mb-2 opacity-80 flex items-center gap-2">
                        <TrendingUp className="text-cyan-500" size={16} /> Node Identification
                    </h4>
                    <p className="text-gray-500 text-xs leading-relaxed">
                        Nodes located in high-growth quadrants indicate overachieving governors. Hovering over any structural node instantly decrypts its origin tag, Governor ID, and specific numeric payload footprint.
                    </p>
                </div>
            </div>

        </div>
    );
}
