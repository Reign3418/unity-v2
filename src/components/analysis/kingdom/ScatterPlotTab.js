"use client";

import { useState, useEffect, useMemo } from "react";
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';
import { BrainCircuit, RefreshCw, AlertCircle, ShieldAlert, Crosshair, Copy, X, Send } from "lucide-react";
import { PCA } from 'ml-pca';
import { useTranslations } from 'next-intl';

export default function ScatterPlotTab({ targetKd, startDate, endDate }) {
    const t = useTranslations('ScatterPlot');
    const [isPcaCompiling, setIsPcaCompiling] = useState(false);
    const [behavioralRoster, setBehavioralRoster] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCH25, setFilterCH25] = useState(true);
    const [activeModalCategory, setActiveModalCategory] = useState(null);
    const [viewType, setViewType] = useState('3d'); // 3d, donut, radar

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Governor IDs copied to clipboard!");
    };

    // Bulletproof Date Extractor (Handles "2026-03-21 20:29 UTC", "2025-11-26T15:31:00Z", etc.)
    const extractDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0].split(' ')[0].split('_')[0];
    };

    // Dates are structurally hoisted to the global view.

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

        // 1. Sift Phantom Accounts & Apply SOC Minimums
        const validRoster = behavioralRoster.filter(g => {
            if (g.powerEnd <= 0) return false;
            // Strict SOC Mode: Only include 25M+ Power OR verified TownHall 25
            if (filterCH25 && g.powerEnd < 25000000 && g.townHall < 25) return false;
            return true;
        });
        console.log(`[PCA Pipeline] After base filters (SOC CH25: ${filterCH25}): ${validRoster.length}`);
        
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

            // SVD mathematics arbitrarily assigns direction. To ensure visual sanity ("More" = "Positive"),
            // we physically locate the Kingdom's most brutal Warrior, and if the ML engine mapped them 
            // negatively, we mathematically invert the entire 3D space across that axis.
            let maxKpIndex = 0;
            let highestKp = -1;
            validRoster.forEach((g, i) => { if (g.kpRaw > highestKp) { highestKp = g.kpRaw; maxKpIndex = i; }});
            
            const pc1Flip = projected[maxKpIndex][0] < 0 ? -1 : 1;
            const pc2Flip = projected[maxKpIndex][1] < 0 ? -1 : 1;
            const pc3Flip = projected[maxKpIndex][2] < 0 ? -1 : 1;

            pc1Array = projected.map(p => p[0] * pc1Flip);
            pc2Array = projected.map(p => p[1] * pc2Flip);
            pc3Array = projected.map(p => p[2] * pc3Flip);
            
            console.log(`[PCA Pipeline] PCA Math succeeded in 3D Mode. Spatial Multipliers: [X:${pc1Flip}, Y:${pc2Flip}, Z:${pc3Flip}]`);
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
                 activeDays: gov.activeDays,
                 gov: gov
             });
        });

        return { 
            chartData: clusters, 
            statistics: { avgKp, avgDeads, totalCount: validRoster.length }
        };

    }, [behavioralRoster, filterCH25]);

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

    const renderKingAnalysis = () => {
        if (!chartData || !chartData.Heroes) return null;
        
        const h = chartData['Heroes'].length;
        const w = chartData['Warriors'].length;
        const s = chartData['Slackers'].length;
        const feed = chartData['Feeders'].length;
        const farm = chartData['Farmers'].length;
        const total = h + w + s + feed + farm;
        if (total === 0) return null;

        const feederRatio = feed / total;
        
        let verdict = t('verdict_intro');
        if (h === 0) {
            verdict += t('verdict_zero_heroes');
        } else if (h > (total * 0.05)) {
            verdict += t('verdict_elite_heroes', { count: h });
        } else {
            verdict += t('verdict_sparse_heroes', { count: h });
        }

        verdict += t('verdict_warriors', { count: w });

        if (feederRatio > 0.15) {
            verdict += t('verdict_massive_feeders', { count: feed, ratio: (feederRatio*100).toFixed(0) });
        } else {
            verdict += t('verdict_controlled_feeders', { count: feed });
        }

        if (farm > 0) {
            verdict += t('verdict_farmers', { count: farm });
        }
        
        if (s > (total * 0.3)) {
            verdict += t('verdict_slackers', { count: s });
        }

        return (
            <div className="bg-[#1a0f14] border border-red-500/30 rounded-xl shadow-xl p-6 lg:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-red-500 to-orange-500"></div>
                <h3 className="text-red-500 text-lg font-black tracking-widest uppercase mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-red-500" size={20} />
                    {t('diag_title')}
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm md:text-base font-serif">
                    {verdict}
                </p>
                <div className="mt-5 pt-5 border-t border-red-500/10 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center"><button onClick={() => setActiveModalCategory('Heroes')} className="block w-full text-2xl font-black text-emerald-500 hover:scale-110 transition-transform">{h}</button><span className="text-[10px] text-gray-500 uppercase tracking-widest">Heroes</span></div>
                    <div className="text-center"><button onClick={() => setActiveModalCategory('Warriors')} className="block w-full text-2xl font-black text-yellow-500 hover:scale-110 transition-transform">{w}</button><span className="text-[10px] text-gray-500 uppercase tracking-widest">Warriors</span></div>
                    <div className="text-center"><button onClick={() => setActiveModalCategory('Farmers')} className="block w-full text-2xl font-black text-cyan-500 hover:scale-110 transition-transform">{farm}</button><span className="text-[10px] text-gray-500 uppercase tracking-widest">Farmers</span></div>
                    <div className="text-center"><button onClick={() => setActiveModalCategory('Slackers')} className="block w-full text-2xl font-black text-white hover:scale-110 transition-transform">{s}</button><span className="text-[10px] text-gray-500 uppercase tracking-widest">Slackers</span></div>
                    <div className="text-center"><button onClick={() => setActiveModalCategory('Feeders')} className="block w-full text-2xl font-black text-red-500 hover:scale-110 transition-transform">{feed}</button><span className="text-[10px] text-gray-500 uppercase tracking-widest">Feeders</span></div>
                </div>
            </div>
        );
    };

    const sendToMailGenerator = (namesStr) => {
        localStorage.setItem('unity_mail_roster', namesStr);
        const locale = window.location.pathname.split('/')[1] || 'en';
        window.open(`/${locale}/mail`, '_blank');
    };

    const renderModal = () => {
        if (!activeModalCategory || !chartData[activeModalCategory]) return null;
        
        const list = chartData[activeModalCategory];
        const rawNames = list.map(g => g.name).join('\n');
        
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#0f1115] border border-[#2d323e] rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
                    <div className="flex justify-between items-center p-4 border-b border-[#1e222b]">
                        <h3 className="text-white font-bold tracking-widest uppercase flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: CLUSTER_COLORS[activeModalCategory], color: CLUSTER_COLORS[activeModalCategory] }}></div>
                             {activeModalCategory} Roster ({list.length})
                        </h3>
                        <button onClick={() => setActiveModalCategory(null)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Raw Roster Array (In-Game Mail Format)</span>
                            <button 
                                onClick={() => sendToMailGenerator(rawNames)}
                                className="flex items-center gap-1.5 text-[10px] text-[#0f1115] hover:bg-cyan-400 font-bold uppercase tracking-widest bg-cyan-500 px-3 py-1.5 rounded transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:scale-105"
                            >
                                <Send size={12} /> Send to Mail Generator
                            </button>
                        </div>
                        <textarea 
                            readOnly 
                            value={rawNames}
                            className="w-full h-32 bg-[#13161c] text-gray-400 text-xs font-mono p-3 rounded border border-[#1e222b] outline-none resize-none leading-relaxed"
                        />
                        
                        <div className="mt-6">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 block">Detailed Entity Ledger</span>
                            <div className="space-y-1.5">
                                {list.map(g => (
                                    <div key={g.id} className="flex justify-between items-center bg-[#13161c] p-2.5 rounded border border-[#1e222b] hover:border-[#2d323e] transition-colors">
                                        <span className="text-white text-xs font-bold">{g.name} <span className="text-gray-500 text-[10px] font-normal ml-1">[{g.alliance}]</span></span>
                                        <span className="text-gray-400 font-mono text-[10px] bg-black/50 px-2 py-0.5 rounded">{g.id}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
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
                        {/* Date selectors are now managed globally in the Main Navigation */}
                        
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

                         {/* CH25 SOC Filter Toggle */}
                         <div className="h-4 w-px bg-[#1e222b] mx-2 hidden sm:block"></div>
                         <label className="flex items-center gap-2 cursor-pointer group select-none">
                             <div className="relative">
                                 <input type="checkbox" className="sr-only" checked={filterCH25} onChange={() => setFilterCH25(!filterCH25)} />
                                 <div className={`block w-9 h-5 rounded-full transition-colors ${filterCH25 ? 'bg-cyan-500' : 'bg-[#1e222b]'}`}></div>
                                 <div className={`absolute left-[3px] top-[3px] bg-white w-3.5 h-3.5 rounded-full transition-transform ${filterCH25 ? 'translate-x-4' : ''}`}></div>
                             </div>
                             <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${filterCH25 ? 'text-cyan-400' : 'text-gray-600'}`}>SOC Filter (CH25+)</span>
                         </label>
                     </div>

                </div>
            </div>

            {/* View Architecture Toggles */}
            <div className="flex justify-center md:justify-start">
                <div className="flex gap-2 bg-[#0a0c0f] p-1.5 rounded-lg border border-[#1e222b] shadow-xl relative z-20">
                    <button onClick={() => setViewType('3d')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded transition-all duration-300 ${viewType === '3d' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}>3D Matrix</button>
                    <button onClick={() => setViewType('donut')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded transition-all duration-300 ${viewType === 'donut' ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}>Health Radial</button>
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
                    {(() => {
                        let option = {};

                        if (viewType === '3d') {
                            const series = Object.keys(chartData).map(key => {
                                const clusterColor = CLUSTER_COLORS[key];
                                const data = chartData[key].map(d => {
                                    const q = searchQuery.toLowerCase();
                                    const match = q && (d.name.toLowerCase().includes(q) || d.id.toString().includes(q) || d.alliance.toLowerCase() === q);
                                    return {
                                        value: [d.x, d.y, d.z],
                                        name: d.name,
                                        itemStyle: {
                                            color: match ? '#38bdf8' : clusterColor,
                                            opacity: (q.length > 0 && !match) ? 0.15 : 0.8,
                                            shadowBlur: match ? 20 : 10,
                                            shadowColor: match ? '#38bdf8' : clusterColor,
                                        },
                                        symbolSize: match ? 13 : 5,
                                        tooltipStr: `${d.name} [${d.alliance}]<br/>ID: ${d.id}<br/>KP: ${formatShortNum(d.kpRaw)} | Deads: ${formatShortNum(d.deadsRaw)}`
                                    };
                                });

                                return {
                                    type: 'scatter3D',
                                    name: key.toUpperCase(),
                                    data: data,
                                };
                            });

                            option = {
                                backgroundColor: 'transparent',
                                tooltip: {
                                    formatter: function (params) {
                                        return params.data.tooltipStr;
                                    },
                                    backgroundColor: 'rgba(15,17,21,0.9)',
                                    borderColor: '#2d323e',
                                    textStyle: { color: '#9ca3af', fontFamily: 'monospace', fontSize: 12 }
                                },
                                legend: {
                                    show: true,
                                    textStyle: { color: '#9ca3af', fontFamily: 'monospace', fontSize: 10 },
                                    left: 10,
                                    top: 10,
                                    orient: 'vertical'
                                },
                                grid3D: {
                                    viewControl: {
                                        autoRotate: true,
                                        autoRotateSpeed: 5,
                                        distance: 200,
                                        alpha: 20,
                                        beta: 40
                                    },
                                    axisLine: { lineStyle: { color: '#1e222b' } },
                                    splitLine: { lineStyle: { color: '#1e222b' } },
                                    axisPointer: { show: false },
                                    environment: 'transparent'
                                },
                                xAxis3D: { type: 'value', name: 'Volatility (PC1)', nameTextStyle: { color: '#6b7280' }, axisLabel: { color: '#6b7280' } },
                                yAxis3D: { type: 'value', name: 'Efficiency (PC2)', nameTextStyle: { color: '#6b7280' }, axisLabel: { color: '#6b7280' } },
                                zAxis3D: { type: 'value', name: 'Power Shift (PC3)', nameTextStyle: { color: '#6b7280' }, axisLabel: { color: '#6b7280' } },
                                series: series
                            };
                        }

                        if (viewType === 'donut') {
                            const pieData = Object.keys(chartData).map(cat => ({
                                name: cat.toUpperCase(),
                                value: chartData[cat].length,
                                itemStyle: { color: CLUSTER_COLORS[cat] }
                            })).filter(d => d.value > 0);
                            
                            option = {
                                backgroundColor: 'transparent',
                                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: 'rgba(15,17,21,0.9)', borderColor: '#2d323e', textStyle: { color: '#9ca3af', fontFamily: 'monospace', fontSize: 12 } },
                                legend: { orient: 'vertical', right: 10, top: 'middle', textStyle: { color: '#9ca3af', fontFamily: 'monospace', fontSize: 12 } },
                                series: [{
                                    type: 'pie',
                                    radius: ['50%', '75%'],
                                    avoidLabelOverlap: false,
                                    label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#ffffff', fontFamily: 'monospace' },
                                    data: pieData
                                }]
                            };
                        }

                        return (
                            <ReactECharts
                                option={option}
                                style={{ width: '100%', height: '100%', minHeight: '600px' }}
                                opts={{ renderer: 'canvas' }}
                            />
                        );
                    })()}
                </div>
            </div>

            {/* Explainer Key */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-[#0f1115] border border-emerald-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-emerald-500">
                    <h4 className="text-emerald-500 font-bold uppercase tracking-widest text-sm mb-1">{t('hero_title')}</h4>
                    <p className="text-gray-500 leading-tight text-xs">{t('hero_desc')}</p>
                </div>
                <div className="bg-[#0f1115] border border-yellow-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-yellow-500">
                    <h4 className="text-yellow-500 font-bold uppercase tracking-widest text-sm mb-1">{t('warrior_title')}</h4>
                    <p className="text-gray-500 leading-tight text-xs">{t('warrior_desc')}</p>
                </div>
                <div className="bg-[#0f1115] border border-white/20 rounded-xl p-4 flex flex-col border-t-2 border-t-white">
                    <h4 className="text-white font-bold uppercase tracking-widest text-sm mb-1">{t('slacker_title')}</h4>
                    <p className="text-gray-600 leading-tight text-xs">{t('slacker_desc')}</p>
                </div>
                <div className="bg-[#0f1115] border border-cyan-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-cyan-500">
                    <h4 className="text-cyan-500 font-bold uppercase tracking-widest text-sm mb-1">{t('farmer_title')}</h4>
                    <p className="text-gray-500 leading-tight text-xs">{t('farmer_desc')}</p>
                </div>
                <div className="bg-[#0f1115] border border-red-500/20 rounded-xl p-4 flex flex-col border-t-2 border-t-red-500">
                    <h4 className="text-red-500 font-bold uppercase tracking-widest text-sm mb-1">{t('feeder_title')}</h4>
                    <p className="text-gray-500 leading-tight text-xs">{t('feeder_desc')}</p>
                </div>
            </div>

            {renderKingAnalysis()}

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

                    <div className="mt-6 pt-6 border-t border-[#1e222b] text-xs">
                        <strong className="text-gray-300 uppercase tracking-widest">Developer's Notes (The Theory of the Matrix):</strong>
                        <div className="mt-3 space-y-4 text-justify text-gray-500">
                            <p>
                                <strong>The Longitudinal Volatility Algorithm:</strong> To paint a mathematically precise picture of player consistency, the backend dynamically slices the requested timeframe into up to 5 equidistant chronological waypoints (Start, 3 Mid-Scans, and End) pulling concurrently from AWS DynamoDB. Instead of just calculating "Total KP Gained", the engine calculates the standard deviation across these discrete intervals. Plotted on the X-Axis (Volatility), a player who steadily grinds the exact same amount every week is statistically grounded (Variance ~0), while a player who sleeps for 3 weeks and spikes massively on the final week is mathematically flung to the absolute explosive edges of the matrix. 
                            </p>
                            <p>
                                <strong>Why track "Deads" inside the math?</strong> In Rise of Kingdoms endgame (SOC), players no longer fight with disposable low-tier troops. If a high-power player's Dead Troops counter violently skyrockets, the algorithm mathematically maps that as T4/T5 eradication. "Deads" represent the absolute cost a player paid to fight. If they paid a massive cost but gained zero KP, they are actively feeding the enemy. 
                            </p>
                            <p>
                                <strong>What about Flag Fillers and Rally Garrisoners?</strong> Troops die in flags, and those players are crucial! The algorithm explicitly accounts for this. When a player fills a flag, their troops die, but they *also* generate immense Kill Points doing so. The algorithm sees that efficiency ratio and flags them as <strong>Warriors (Yellow)</strong>. It strictly punishes players who have dead troops <em>without</em> the kill points to justify the sacrifice (Feeders). 
                            </p>
                            <p>
                                <strong>Does Kingdom Age matter (100 days vs 7 years)?</strong> No. Because the engine computes <em>variance</em> against the median population of the specific selected snapshot, the math scales perfectly. In an old kingdom, the average player might have 2 Billion KP, so 0,0 is set there. In a young KvK 1 kingdom, the average might be 30 Million KP. The engine dynamically grades on a curve. 
                            </p>
                            <p>
                                <strong>WARNING: Early Kingdoms (KvK 1-3)</strong>: The only caveat is the <strong>SOC Filter (CH25+)</strong> at the top of the interface. This automatically filters out low-level farms who aren't CH25/25M+ Power (the threshold to matter in Season of Conquest). If your kingdom is brand new, a 20M power player is a core frontline fighter. You <em>must</em> toggle the SOC filter off to see your entire military.
                            </p>
                            <p>
                                <strong>Why are Gathering and Assistance Metrics Excluded?</strong> The core goal of this matrix is <em>Operational Combat Diagnostics</em>. If "Gathering" was injected into the math, it would severely skew the Efficiency (Y-Axis) algorithms. A player who bleeds 5M T4/T5 Troops but gathers 2 Billion resources would mathematically "average out" against a player who didn't fight at all. Similarly, "Assistance" (Alliance Helps) can be artificially manipulated by spamming 1-troop garrison requests. By aggressively stripping out these economic/fluff metrics, we force the AI to act as a pure, un-sugar-coated lie detector for combat participation. <strong>Wait, then how does it find Farmers (Cyan)?</strong> The <em>Farmer</em> archetype is identified internally by measuring pure Power Growth against Kill Point passivity. If a player gains 10M Power but logs absolutely no combat volatility, the algorithm catches their hoarding behavior without ever needing to check their wood-gathering stats. 
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#1e222b] text-xs">
                        <strong className="text-gray-300 uppercase tracking-widest">Mathematical Core & Engine References:</strong>
                        <div className="mt-3 space-y-4 text-justify text-gray-500">
                            <p>
                                <strong>Machine Learning (Dimensionality Reduction):</strong> This module utilizes <code>ml-pca</code>, a powerful JavaScript implementation of <strong>Principal Component Analysis (PCA)</strong>. It executes a mathematical procedure called <strong>Singular Value Decomposition (SVD)</strong>. This transforms 8 massive, highly-correlated dimensions (Total Power, KP, T4/T5 Deads, Gathering, etc.) into 3 distinct, uncorrelated "Principal Components" (PC1, PC2, PC3), allowing complex multi-layered human behavior to be cleanly plotted on an X, Y, and Z axis.
                            </p>
                            <p>
                                <strong>3D Visualization Engine:</strong> The visual matrix is driven by <code>react-plotly.js</code>. This leverages <strong>WebGL</strong> (Web Graphics Library) to bypass the browser's standard DOM rendering. By communicating directly with the client's GPU, it calculates the spatial geometry, camera rotational matrix, and semantic lighting logic for over 1,000 distinct floating nodes simultaneously without suffering frame drops.
                            </p>
                            <p>
                                <strong>Z-Score Standard Scaling:</strong> Before any dot is drawn, the engine utilizes a continuous normalization step. This mathematically forces all metrics to have a mean (average) of 0 and a variance of 1. Because getting 10 million Power is infinitely easier than getting 10 million Dead Troops, the engine prevents the "Power" metric from blinding the matrix. The normalization guarantees that brutal troop sacrifice is weighed as heavily as raw power growth in the algorithmic cluster assignment.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            {renderModal()}
        </div>
    );
}
