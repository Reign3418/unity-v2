"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ZAxis, Legend, Cell, ReferenceLine
} from 'recharts';
import { BrainCircuit, RefreshCw, AlertCircle, ShieldAlert, Crosshair } from "lucide-react";
import { PCA } from 'ml-pca';

export default function ScatterPlotTab({ targetKd, trends }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isPcaCompiling, setIsPcaCompiling] = useState(false);
    const [behavioralRoster, setBehavioralRoster] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Initialize Auto-Dates from Trends Feed
    useEffect(() => {
        if (trends && trends.length > 0 && !startDate && !endDate) {
            const rawEnd = trends[trends.length - 1].scanDate.split('T')[0].split('_')[0];
            setEndDate(rawEnd);
            
            const rawStart = trends[0].scanDate.split('T')[0].split('_')[0];
            setStartDate(rawStart);
        }
    }, [trends]);

    // Asynchronous Behavioral Fetcher
    useEffect(() => {
        const fetchBehavioralData = async () => {
            if (!targetKd || !startDate || !endDate) return;
            setIsPcaCompiling(true);
            try {
                const url = `/api/aws/behavior?kd=${targetKd}&start=${startDate}&end=${endDate}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setBehavioralRoster(data.roster || []);
                }
            } catch (err) {
                console.error("Failed to load behavioral matrix", err);
            }
            setIsPcaCompiling(false);
        };
        fetchBehavioralData();
    }, [targetKd, startDate, endDate]);

    // Principal Component Analysis Pipeline
    const { chartData, statistics } = useMemo(() => {
        if (!behavioralRoster || behavioralRoster.length === 0) return { chartData: {}, statistics: {} };

        // 1. Sift Phantom Accounts (0 Power at End)
        const validRoster = behavioralRoster.filter(g => g.powerEnd > 0);
        if (validRoster.length === 0) return { chartData: {}, statistics: {} };

        // 2. Extract Raw Averages to determine Structural Archetypes (Heroes, Warriors, Feeders, Slackers)
        const totalKp = validRoster.reduce((sum, g) => sum + g.kpRaw, 0);
        const totalDeads = validRoster.reduce((sum, g) => sum + g.deadsRaw, 0);
        const avgKp = totalKp / validRoster.length;
        const avgDeads = totalDeads / validRoster.length;

        // 3. Define the 8 Dimensions for PCA Dimensionality Reduction
        const features = ['powerDiff', 'troopPowerDiff', 'deadsDiff', 't4Diff', 't5Diff', 'kpDiff', 'activeDays', 'kpVolatility'];
        const matrix = [];
        
        // Compute Mean and Standard Deviation per continuous feature
        const means = {};
        const stds = {};
        features.forEach(f => {
            let sum = 0;
            validRoster.forEach(g => sum += g[f] || 0);
            means[f] = sum / validRoster.length;
            
            let varianceSum = 0;
            validRoster.forEach(g => varianceSum += Math.pow((g[f] || 0) - means[f], 2));
            stds[f] = Math.sqrt(varianceSum / validRoster.length) || 1; // Prevent Div0
        });

        // Generate Z-Score Transposed Dataset
        validRoster.forEach(g => {
             const row = features.map(f => ((g[f] || 0) - means[f]) / stds[f]);
             matrix.push(row);
        });

        // 4. ML-PCA SVD Math Execution
        let pc1Array = [];
        let pc2Array = [];
        try {
            const pca = new PCA(matrix);
            const projected = pca.predict(matrix, { nComponents: 2 }).to2DArray();
            pc1Array = projected.map(p => p[0]);
            pc2Array = projected.map(p => p[1]);
        } catch(e) {
            console.error("PCA Math Error", e);
            return { chartData: {}, statistics: {} };
        }

        // 5. Cluster Assignment & Payload Wrapping
        const clusters = {
            'Heroes': [], // Blue
            'Warriors': [], // Green
            'Feeders': [], // Red
            'Slackers': [] // Gray
        };

        validRoster.forEach((gov, index) => {
             const xVal = parseFloat(pc1Array[index].toFixed(2));
             const yVal = parseFloat(pc2Array[index].toFixed(2));

             let archetype = 'Slackers';
             if (gov.kpRaw > avgKp && gov.deadsRaw > avgDeads) archetype = 'Warriors';
             else if (gov.kpRaw > avgKp && gov.deadsRaw <= avgDeads) archetype = 'Heroes';
             else if (gov.kpRaw <= avgKp && gov.deadsRaw > avgDeads) archetype = 'Feeders';

             clusters[archetype].push({
                 id: gov.id,
                 name: gov.name,
                 alliance: gov.alliance || 'None',
                 x: xVal,
                 y: yVal,
                 z: 1,
                 kpRaw: gov.kpRaw,
                 deadsRaw: gov.deadsRaw,
                 archetype: archetype,
                 activeDays: gov.activeDays
             });
        });

        return { 
            chartData: clusters, 
            statistics: { avgKp, avgDeads, totalCount: validRoster.length }
        };

    }, [behavioralRoster]);

    const formatShortNum = (num) => {
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
        return num.toLocaleString();
    };

    const CLUSTER_COLORS = {
        'Heroes': '#3b82f6', // Blue
        'Warriors': '#10b981', // Green
        'Feeders': '#ef4444', // Red
        'Slackers': '#64748b' // Gray
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const bgClass =
                data.archetype === 'Heroes' ? 'bg-blue-500/10 border-blue-500/30' :
                data.archetype === 'Warriors' ? 'bg-green-500/10 border-green-500/30' :
                data.archetype === 'Feeders' ? 'bg-red-500/10 border-red-500/30' :
                'bg-gray-500/10 border-gray-500/30';

            const txtClass = 
                data.archetype === 'Heroes' ? 'text-blue-400' :
                data.archetype === 'Warriors' ? 'text-green-400' :
                data.archetype === 'Feeders' ? 'text-red-400' :
                'text-gray-400';

            return (
                <div className={`border p-4 rounded-lg shadow-2xl backdrop-blur-md outline-none ${bgClass}`}>
                    <p className="text-white font-black text-lg flex items-center gap-2 mb-1 uppercase tracking-wider">
                        {data.name} 
                        <span className={`${txtClass} text-[10px] tracking-widest px-1.5 py-0.5 rounded border ml-2`}>[{data.alliance}]</span>
                    </p>
                    <p className="text-gray-500 font-mono text-xs tracking-widest mb-3 flex items-center gap-2">
                        ID: {data.id} <span className="opacity-50">|</span> <span className={`${txtClass} font-bold uppercase`}>{data.archetype}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-md p-2">
                             <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Raw Kill Points</span>
                             <span className="text-white font-mono text-sm">{formatShortNum(data.kpRaw)}</span>
                        </div>
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-md p-2">
                             <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Raw Deads</span>
                             <span className="text-white font-mono text-sm">{formatShortNum(data.deadsRaw)}</span>
                        </div>
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-md p-2">
                             <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Volumetric Variance (X)</span>
                             <span className="text-gray-400 font-mono text-sm">{data.x > 0 ? '+' : ''}{data.x}σ</span>
                        </div>
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-md p-2">
                             <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1">Efficiency Variance (Y)</span>
                             <span className="text-gray-400 font-mono text-sm">{data.y > 0 ? '+' : ''}{data.y}σ</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-fade-in space-y-6">
            
            {/* Control Dashboard */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                    
                    {/* Header Info */}
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                             <BrainCircuit className="text-purple-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-none">Behavioral PCA Engine</h2>
                            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-bold flex items-center gap-1">
                                {startDate && endDate && startDate === endDate ? 
                                    <span className="text-red-400">Error: Select 2 Distinct Dates</span> :
                                    statistics.totalCount ? 
                                        `${statistics.totalCount.toLocaleString()} Entities Analyzed` : 
                                        'Awaiting Matrix...'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Timeline Controls */}
                    <div className="flex flex-wrap items-center gap-4 bg-[#0a0c0f] border border-[#1e222b] p-3 rounded-xl shadow-inner">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Scan Range:</span>
                            <select 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                className="bg-[#13161c] text-white text-xs border border-[#2d323e] rounded p-1.5 focus:border-cyan-500 outline-none"
                            >
                                {trends && trends.map(t => {
                                    const rawDate = t.scanDate.split('T')[0].split('_')[0];
                                    const parsedDate = new Date(rawDate);
                                    const displayDate = !isNaN(parsedDate) ? parsedDate.toLocaleDateString() : rawDate;
                                    return <option key={`start-${t.scanDate}`} value={rawDate}>{displayDate}</option>
                                })}
                            </select>
                            <span className="text-gray-600">-</span>
                            <select 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                                className="bg-[#13161c] text-white text-xs border border-[#2d323e] rounded p-1.5 focus:border-cyan-500 outline-none"
                            >
                                {trends && trends.map(t => {
                                    const rawDate = t.scanDate.split('T')[0].split('_')[0];
                                    const parsedDate = new Date(rawDate);
                                    const displayDate = !isNaN(parsedDate) ? parsedDate.toLocaleDateString() : rawDate;
                                    return <option key={`end-${t.scanDate}`} value={rawDate}>{displayDate}</option>
                                })}
                            </select>
                        </div>
                        
                        {/* Search Node Feature */}
                        <div className="h-4 w-px bg-[#1e222b] mx-2 hidden sm:block"></div>
                        <div className="flex items-center gap-2 relative">
                             <Crosshair className="text-gray-500 w-4 h-4 absolute left-2" />
                             <input 
                                 type="text" 
                                 placeholder="LOCATE GOVERNOR/TAG..." 
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 className="bg-[#13161c] text-white text-xs font-mono border border-[#2d323e] rounded py-1.5 pl-8 pr-3 focus:border-yellow-500 outline-none w-48 uppercase"
                             />
                        </div>
                    </div>

                </div>
            </div>

            {/* Neural Matrix Plot Viewer */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-2xl p-4 lg:p-8 min-h-[600px] flex flex-col relative overflow-hidden">
                
                {isPcaCompiling && (
                    <div className="absolute inset-0 bg-[#0f1115]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                        <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                        <h3 className="text-white font-black tracking-widest uppercase text-xl animate-pulse">Computing Matrix</h3>
                        <p className="text-purple-400 font-mono text-xs tracking-widest uppercase mt-2">Running Principal Component Analysis on 8 Dimensions...</p>
                    </div>
                )}

                {!isPcaCompiling && behavioralRoster.length === 0 && (
                    <div className="absolute inset-0 z-40 bg-[#0f1115] flex flex-col items-center justify-center text-gray-500">
                        <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">Insufficient Temporal Data</h3>
                        <p className="text-sm">Please expand the scan range to compile a valid longitudinal variance mapping.</p>
                    </div>
                )}

                <div className="absolute inset-0 bg-[linear-gradient(to_right,#13161c_1px,transparent_1px),linear-gradient(to_bottom,#13161c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-50"></div>

                <div className="flex-1 w-full relative z-10">
                    <ResponsiveContainer width="100%" height={600}>
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e222b" opacity={0.6} />
                            
                            <XAxis 
                                type="number" 
                                dataKey="x" 
                                name="Activity Volatility (PC1)" 
                                stroke="#4b5563"
                                tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                                axisLine={{ stroke: '#2d323e' }}
                            >
                                 <label value="STANDARD DEVIATION: ACTIVITY VOLUME (PC1)" position="insideBottom" offset={-15} fill="#4b5563" fontSize={10} fontWeight="bold" letterSpacing={2} />
                            </XAxis>
                            
                            <YAxis 
                                type="number" 
                                dataKey="y" 
                                name="Trading Efficiency (PC2)" 
                                stroke="#4b5563"
                                tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                                axisLine={{ stroke: '#2d323e' }}
                            >
                                <label value="EFFICIENCY VARANCE (PC2)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} offset={10} fill="#4b5563" fontSize={10} fontWeight="bold" letterSpacing={2} />
                            </YAxis>
                            
                            <ZAxis type="number" dataKey="z" range={[50, 400]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#a855f7', opacity: 0.3 }} />
                            
                            <ReferenceLine x={0} stroke="#4b5563" strokeDasharray="3 3" opacity={0.5} />
                            <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" opacity={0.5} />

                            <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="circle"
                                formatter={(value) => <span className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">{value}</span>}
                            />

                            {Object.keys(chartData).map(key => (
                                <Scatter 
                                    key={key} 
                                    name={key} 
                                    data={chartData[key]} 
                                    fill={CLUSTER_COLORS[key]}
                                    shape="circle"
                                >
                                    {chartData[key].map((entry, index) => {
                                        // Real-Time Search Lighting
                                        const query = searchQuery.toLowerCase();
                                        const isMatch = query && (
                                            entry.name.toLowerCase().includes(query) || 
                                            entry.id.toString().includes(query) || 
                                            entry.alliance.toLowerCase() === query
                                        );
                                        const isActiveSearch = query.length > 0;
                                        
                                        const nodeColor = isMatch ? '#eab308' : CLUSTER_COLORS[key];
                                        const nodeOpacity = isActiveSearch && !isMatch ? 0.1 : (isMatch ? 1 : 0.8);
                                        
                                        // Enlarge matched cells drastically
                                        const effectiveZ = isMatch ? 8 : entry.z;
                                        return <Cell key={`cell-${index}`} fill={nodeColor} fillOpacity={nodeOpacity} style={{ r: effectiveZ }} />;
                                    })}
                                </Scatter>
                            ))}
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Explainer Key */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0f1115] border border-blue-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-blue-500">
                    <h4 className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-1">Heroes</h4>
                    <p className="text-gray-500 leading-tight text-xs">High Kill Points, Low Deads compared to Kingdom Avg. The most efficient garrison fighters.</p>
                </div>
                <div className="bg-[#0f1115] border border-green-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-green-500">
                    <h4 className="text-green-500 font-bold uppercase tracking-widest text-sm mb-1">Warriors</h4>
                    <p className="text-gray-500 leading-tight text-xs">High Kill Points, High Deads. Brutal field commanders who trade raw power for domination.</p>
                </div>
                <div className="bg-[#0f1115] border border-red-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-red-500">
                    <h4 className="text-red-500 font-bold uppercase tracking-widest text-sm mb-1">Feeders</h4>
                    <p className="text-gray-500 leading-tight text-xs">Low Kill Points, High Deads. Structurally broken behaviors that bleed Kingdom score.</p>
                </div>
                <div className="bg-[#0f1115] border border-gray-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-gray-500">
                    <h4 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-1">Slackers</h4>
                    <p className="text-gray-600 leading-tight text-xs">Below average overall. Inactive, bubbled, or strictly hoarding infrastructure.</p>
                </div>
            </div>

        </div>
    );
}
