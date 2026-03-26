"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false, loading: () => <div className="text-purple-500 font-mono text-sm animate-pulse text-center pt-32">Initializing 3D WebGL Canvas...</div> });
import { BrainCircuit, RefreshCw, AlertCircle, ShieldAlert, Crosshair } from "lucide-react";
import { PCA } from 'ml-pca';

export default function ScatterPlotTab({ targetKd, trends }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isPcaCompiling, setIsPcaCompiling] = useState(false);
    const [behavioralRoster, setBehavioralRoster] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Bulletproof Date Extractor (Handles "2026-03-21 20:29 UTC", "2025-11-26T15:31:00Z", etc.)
    const extractDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0].split(' ')[0].split('_')[0];
    };

    // Initialize Auto-Dates from Trends Feed
    useEffect(() => {
        if (trends && trends.length > 0 && !startDate && !endDate) {
            const rawEnd = extractDate(trends[trends.length - 1].scanDate);
            setEndDate(rawEnd);
            const rawStart = extractDate(trends[0].scanDate);
            setStartDate(rawStart);
        }
    }, [trends]);

    // Asynchronous Behavioral Fetcher
    useEffect(() => {
        const fetchBehavioralData = async () => {
            if (!targetKd || !startDate || !endDate) return;
            setIsPcaCompiling(true);
            try {
                const url = `/api/aws/behavior?kd=${targetKd}&start=${startDate}&end=${endDate}&_t=${Date.now()}`;
                console.log(`[ScatterPlot Fetch] Outbound: ${url}`);
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    console.log(`[ScatterPlot Fetch] Inbound Success! Roster payload length: ${data.roster ? data.roster.length : 'undefined'}`);
                    setBehavioralRoster(data.roster || []);
                } else {
                    console.warn(`[ScatterPlot Fetch] HTTP Error ${res.status}`);
                }
            } catch (err) {
                console.error("[ScatterPlot Fetch] Network Exception:", err);
            }
            setIsPcaCompiling(false);
        };
        fetchBehavioralData();
    }, [targetKd, startDate, endDate]);

    // Principal Component Analysis Pipeline
    const { chartData, statistics } = useMemo(() => {
        if (!behavioralRoster || behavioralRoster.length === 0) return { chartData: {}, statistics: {} };

        console.log(`[PCA Pipeline] Received behavioralRoster length: ${behavioralRoster.length}`);

        // 1. Sift Phantom Accounts (0 Power at End)
        const validRoster = behavioralRoster.filter(g => g.powerEnd > 0);
        console.log(`[PCA Pipeline] After phantom filter (powerEnd > 0): ${validRoster.length}`);
        
        if (validRoster.length === 0) return { chartData: {}, statistics: {} };

        // 2. Extract Raw Averages to determine Structural Archetypes (Heroes, Warriors, Feeders, Slackers, Farmers)
        const totalKp = validRoster.reduce((sum, g) => sum + g.kpRaw, 0);
        const totalDeads = validRoster.reduce((sum, g) => sum + g.deadsRaw, 0);
        const totalPowerDiff = validRoster.reduce((sum, g) => sum + (g.powerDiff || 0), 0);
        const avgKp = totalKp / validRoster.length;
        const avgDeads = totalDeads / validRoster.length;
        const avgPowerDiff = Math.max(0, totalPowerDiff / validRoster.length);

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

        console.log(`[PCA Pipeline] Prepared ${matrix.length}x${features.length} feature matrix. Running ML-PCA SVD...`);

        // 4. ML-PCA SVD Math Execution
        let pc1Array = [];
        let pc2Array = [];
        let pc3Array = [];
        try {
            const pca = new PCA(matrix);
            // 3 Components required for 3D XYZ Mapping
            const projected = pca.predict(matrix, { nComponents: 3 }).to2DArray();
            pc1Array = projected.map(p => p[0]);
            pc2Array = projected.map(p => p[1]);
            pc3Array = projected.map(p => p[2]);
            console.log(`[PCA Pipeline] PCA Math succeeded in 3D Mode.`);
        } catch(e) {
            console.error("[PCA Pipeline] PCA Math Error:", e);
            return { chartData: {}, statistics: {} };
        }

        // 5. Cluster Assignment & Payload Wrapping
        const clusters = {
            'Heroes': [], // Blue
            'Warriors': [], // Green
            'Feeders': [], // Red
            'Slackers': [], // Gray
            'Farmers': [] // Cyan
        };

        validRoster.forEach((gov, index) => {
             const xVal = parseFloat(pc1Array[index].toFixed(2));
             const yVal = parseFloat(pc2Array[index].toFixed(2));
             const zVal = parseFloat(pc3Array[index].toFixed(2));

             let archetype = 'Slackers';
             if (gov.kpRaw > avgKp && gov.deadsRaw > avgDeads) archetype = 'Warriors';
             else if (gov.kpRaw > avgKp && gov.deadsRaw <= avgDeads) archetype = 'Heroes';
             else if (gov.kpRaw <= avgKp && gov.deadsRaw > avgDeads) archetype = 'Feeders';
             else if (gov.powerDiff > avgPowerDiff) archetype = 'Farmers';

             clusters[archetype].push({
                 id: gov.id,
                 name: gov.name,
                 alliance: gov.alliance || 'None',
                 x: xVal,
                 y: yVal,
                 z: zVal,
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
        'Heroes': '#10b981', // Neon Emerald (Great)
        'Warriors': '#facc15', // Neon Yellow (Warning/Good)
        'Slackers': '#ffffff', // Pure White (Neutral)
        'Feeders': '#ef4444', // Neon Red (Terrible)
        'Farmers': '#06b6d4' // Neon Cyan (Hoarding)
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
                                    const rawDate = extractDate(t.scanDate);
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
                                    const rawDate = extractDate(t.scanDate);
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

                <div className="flex-1 w-full relative z-10 min-h-[600px]">
                    <Plot
                        data={Object.keys(chartData).map(key => ({
                            name: key.toUpperCase(),
                            x: chartData[key].map(d => d.x),
                            y: chartData[key].map(d => d.y),
                            z: chartData[key].map(d => d.z),
                            text: chartData[key].map(d => `${d.name} [${d.alliance}]<br>ID: ${d.id}<br>KP: ${formatShortNum(d.kpRaw)} | Deads: ${formatShortNum(d.deadsRaw)}`),
                            mode: 'markers',
                            type: 'scatter3d',
                            marker: {
                                size: chartData[key].map(d => {
                                    const q = searchQuery.toLowerCase();
                                    const match = q && (d.name.toLowerCase().includes(q) || d.id.toString().includes(q) || d.alliance.toLowerCase() === q);
                                    return match ? 13 : 5;
                                }),
                                color: chartData[key].map(d => {
                                    const q = searchQuery.toLowerCase();
                                    const match = q && (d.name.toLowerCase().includes(q) || d.id.toString().includes(q) || d.alliance.toLowerCase() === q);
                                    return match ? '#38bdf8' : CLUSTER_COLORS[key];
                                }),
                                opacity: chartData[key].map(d => {
                                    const q = searchQuery.toLowerCase();
                                    const activeSearch = q.length > 0;
                                    const match = activeSearch && (d.name.toLowerCase().includes(q) || d.id.toString().includes(q) || d.alliance.toLowerCase() === q);
                                    return activeSearch && !match ? 0.15 : 1;
                                }),
                                symbol: 'circle',
                                line: {
                                    color: chartData[key].map(d => {
                                        const q = searchQuery.toLowerCase();
                                        const match = q && (d.name.toLowerCase().includes(q) || d.id.toString().includes(q) || d.alliance.toLowerCase() === q);
                                        return match ? '#ffffff' : CLUSTER_COLORS[key];
                                    }),
                                    width: 1
                                }
                            },
                            hoverinfo: 'text'
                        }))}
                        layout={{
                            autosize: true,
                            margin: { l: 0, r: 0, b: 0, t: 0 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            showlegend: true,
                            legend: {
                                font: { color: '#9ca3af', family: 'monospace', size: 10 },
                                bgcolor: 'rgba(15,17,21,0.8)',
                                bordercolor: '#2d323e',
                                borderwidth: 1,
                                yanchor: 'top',
                                y: 0.99,
                                xanchor: 'left',
                                x: 0.01
                            },
                            scene: {
                                xaxis: { title: 'Volatility (PC1)', titlefont: { color: '#6b7280' }, tickfont: { color: '#6b7280' }, color: '#9ca3af', gridcolor: '#1e222b', zerolinecolor: '#ffffff', zerolinewidth: 2, backgroundcolor: 'rgba(0,0,0,0)' },
                                yaxis: { title: 'Efficiency (PC2)', titlefont: { color: '#6b7280' }, tickfont: { color: '#6b7280' }, color: '#9ca3af', gridcolor: '#1e222b', zerolinecolor: '#ffffff', zerolinewidth: 2, backgroundcolor: 'rgba(0,0,0,0)' },
                                zaxis: { title: 'Power Shift (PC3)', titlefont: { color: '#6b7280' }, tickfont: { color: '#6b7280' }, color: '#9ca3af', gridcolor: '#1e222b', zerolinecolor: '#ffffff', zerolinewidth: 2, backgroundcolor: 'rgba(0,0,0,0)' },
                                bgcolor: 'rgba(0,0,0,0)',
                                camera: { eye: { x: 1.6, y: -1.6, z: 1.2 } }
                            }
                        }}
                        style={{ width: '100%', height: '100%', minHeight: '600px' }}
                        config={{ displayModeBar: true, displaylogo: false }}
                    />
                </div>
            </div>

            {/* Explainer Key */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-[#0f1115] border border-emerald-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-emerald-500">
                    <h4 className="text-emerald-500 font-bold uppercase tracking-widest text-sm mb-1">Heroes</h4>
                    <p className="text-gray-500 leading-tight text-xs">High Kill Points, Low Deads compared to Kingdom Avg. The most efficient garrison fighters.</p>
                </div>
                <div className="bg-[#0f1115] border border-yellow-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-yellow-500">
                    <h4 className="text-yellow-500 font-bold uppercase tracking-widest text-sm mb-1">Warriors</h4>
                    <p className="text-gray-500 leading-tight text-xs">High Kill Points, High Deads. Brutal field commanders who trade raw power for domination.</p>
                </div>
                <div className="bg-[#0f1115] border border-white/20 rounded-xl p-4 flex flex-col border-t-2 border-t-white">
                    <h4 className="text-white font-bold uppercase tracking-widest text-sm mb-1">Slackers</h4>
                    <p className="text-gray-600 leading-tight text-xs">Neutral Baseline. Inactive, bubbled, plateaued accounts.</p>
                </div>
                <div className="bg-[#0f1115] border border-cyan-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-cyan-500">
                    <h4 className="text-cyan-500 font-bold uppercase tracking-widest text-sm mb-1">Farmers</h4>
                    <p className="text-gray-500 leading-tight text-xs">High Power Growth. Low/zero fighting. Actively hoarding infrastructure.</p>
                </div>
                <div className="bg-[#0f1115] border border-red-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-red-500">
                    <h4 className="text-red-500 font-bold uppercase tracking-widest text-sm mb-1">Feeders</h4>
                    <p className="text-gray-500 leading-tight text-xs">Low Kill Points, High Deads. Structurally broken behaviors that bleed Kingdom score.</p>
                </div>
            </div>

            {/* Concept Write-Up */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-cyan-500"></div>
                <h3 className="text-white text-lg font-black tracking-widest uppercase mb-4 flex items-center gap-2">
                    <BrainCircuit className="text-cyan-400" size={20} />
                    Understanding the Matrix
                </h3>
                
                <div className="space-y-4 text-gray-400 text-sm leading-relaxed">
                    <p>
                        The <span className="text-purple-400 font-bold">Behavioral PCA Engine</span> (Principal Component Analysis) is an advanced machine learning module designed to mathematically compress 8 dimensions of raw governor telemetry (Power, Kill Points, T4/T5 Deaths, Online Activity Vectors) into a digestible 2D visual coordinate plane.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#1e222b]">
                        <div>
                            <h4 className="text-gray-200 font-bold uppercase tracking-wider text-xs mb-2">The X-Axis: Activity Volatility (PC1)</h4>
                            <p className="text-xs text-justify">
                                The horizontal axis measures aggregate action volume. A governor placed far to the right (positive X) has exhibited a high magnitude of statistical volatility—meaning massive shifts in power, severe troop deaths, and skyrocketing kill points compared to the baseline population curve. A negative X placement indicates stagnation or extreme passivity relative to the kingdom average.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-gray-200 font-bold uppercase tracking-wider text-xs mb-2">The Y-Axis: Trading Efficiency (PC2)</h4>
                            <p className="text-xs text-justify">
                                The vertical axis computes raw sociological efficiency. Governors placed high on the matrix (positive Y) are scoring massive Kill Points while sustaining suspiciously low permanent troop deaths (T4/T5 Deads). Those mapped deep in the negative Y quadrant are "bleeding out"—absorbing catastrophic permanent troop losses for marginal competitive point gain, serving as structural feeders.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#1e222b] text-xs">
                        <strong className="text-gray-300 uppercase tracking-widest">The Four Quadrants:</strong>
                        <ul className="mt-3 space-y-2">
                            <li><span className="inline-block w-20 text-emerald-500 font-bold">Top Right</span> (Heroes) — High volatility, extreme efficiency. The ultimate elite garrison leaders.</li>
                            <li><span className="inline-block w-20 text-yellow-500 font-bold">Bot Right</span> (Warriors) — High volatility, terrible efficiency. Brutal field fighters absorbing massive losses to win.</li>
                            <li><span className="inline-block w-20 text-cyan-500 font-bold">Center</span> (Farmers) — Low volatility, high power consumption. Visually growing infrastructure but doing zero combat.</li>
                            <li><span className="inline-block w-20 text-white font-bold">Center Left</span> (Slackers) — Low volatility, zero growth. The truly plateaued dead-weight accounts.</li>
                            <li><span className="inline-block w-20 text-red-500 font-bold">Bot Left</span> (Feeders) — Low volatility, terrible efficiency. Structurally broken accounts bleeding infrastructure.</li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    );
}
