import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MAP_TIMELINES } from '../../../constants/soc_timelines';
import { Calendar, Crosshairs, Sword, Map, Settings, Save, MapPin, Loader2, Users, Camera, RefreshCw } from 'lucide-react';
import { addDays, format, isValid, parseISO } from 'date-fns';

const formatNum = (num) => {
  if (!num && num !== 0) return "0";
  return Number(num).toLocaleString();
};

const CAMP_TEMPLATES = [
    { id: 1, name: 'Brittany', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold', kds: '' },
    { id: 2, name: 'Bourbon', color: 'bg-green-500/10 text-green-400 border-green-500/30 font-bold', kds: '' },
    { id: 3, name: 'La Marche', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold', kds: '' },
    { id: 4, name: 'Picardy', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold', kds: '' },
    { id: 5, name: 'Auvergne', color: 'bg-gray-100/10 text-gray-200 border-gray-100/30 font-bold', kds: '' },
    { id: 6, name: 'Poitou', color: 'bg-red-500/10 text-red-400 border-red-500/30 font-bold', kds: '' }
];

export default function SoCTab({ targetKd }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef(null);
    
    // AWS Full Global State Payload
    const [globalConfig, setGlobalConfig] = useState({});
    
    // Deconstructed States (Hydrated from Global)
    const [selectedMap, setSelectedMap] = useState("Siege of Orleans");
    const [regDate, setRegDate] = useState("");
    const [stratagems, setStratagems] = useState([]);
    const [camps, setCamps] = useState(CAMP_TEMPLATES);

    // --- Camp DKP States ---
    const [availableDates, setAvailableDates] = useState([]);
    const [startScan, setStartScan] = useState("");
    const [endScan, setEndScan] = useState("");
    const [isDatesLoading, setIsDatesLoading] = useState(false);
    const [campDkpRows, setCampDkpRows] = useState([]);
    const [isDkpLoading, setIsDkpLoading] = useState(false);

    // Fetch dates on mount
    useEffect(() => {
        if (!targetKd) return;
        setIsDatesLoading(true);
        fetch(`/api/aws/dkp/dates?kd=${targetKd}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.dates && data.dates.length > 0) {
              setAvailableDates(data.dates);
              setStartScan(data.dates[0]);
              setEndScan(data.dates[data.dates.length - 1]);
            }
          })
          .catch(err => console.error("Failed to fetch DKP dates:", err))
          .finally(() => setIsDatesLoading(false));
    }, [targetKd]);

    // Hydrate from AWS DynamoDB
    useEffect(() => {
        if (!targetKd) {
            setIsLoading(false);
            return;
        }
        
        fetch(`/api/aws/admin/dkp-config?kd=${targetKd}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.config && Object.keys(data.config).length > 0) {
                    setGlobalConfig(data.config);
                    
                    // Populate explicit local states if they exist in DB
                    if (data.config.socMap) setSelectedMap(data.config.socMap);
                    if (data.config.socRegDate) setRegDate(data.config.socRegDate);
                    
                    if (data.config.socStratagems && data.config.socStratagems.length > 0) {
                        setStratagems(data.config.socStratagems);
                    } else {
                        setStratagems([
                            { id: 1, title: 'Early Expansion', content: 'Secure Tier 1 passes immediately upon opening.' },
                            { id: 2, title: 'Ruin Control', content: 'Rotate garrisons every 4 hours during Ancient Ruins.' }
                        ]);
                    }
                    
                    if (data.config.socCamps && data.config.socCamps.length > 0) {
                        // Merge saved KDs but assert authentic camp names and colors
                        const hydratedCamps = CAMP_TEMPLATES.map(template => {
                            const saved = data.config.socCamps.find(c => c.id === template.id);
                            return saved ? { ...template, kds: saved.kds } : template;
                        });
                        setCamps(hydratedCamps);
                    }
                }
            })
            .catch(err => console.error("Failed to load SOC Config from AWS:", err))
            .finally(() => setIsLoading(false));
    }, [targetKd]);

    const saveTacticalPlan = async () => {
        setIsSaving(true);
        const updatedConfig = {
            ...globalConfig,
            socMap: selectedMap,
            socRegDate: regDate,
            socStratagems: stratagems,
            socCamps: camps
        };
        
        setGlobalConfig(updatedConfig);
        
        try {
            await fetch(`/api/aws/admin/dkp-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kd: targetKd, configData: updatedConfig })
            });
            alert("✅ Tactical Plan Synced to Kingdom Cloud!");
        } catch(e) {
            console.error("Failed to sync to AWS", e);
            alert("❌ Network Error while saving.");
        }
        setIsSaving(false);
    };

    const handleStratagemChange = (id, field, value) => {
        setStratagems(stratagems.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const addStratagem = () => {
        setStratagems([...stratagems, { id: Date.now(), title: 'New Stratagem', content: '' }]);
    };
    
    const removeStratagem = (id) => {
        setStratagems(stratagems.filter(s => s.id !== id));
    };
    
    const updateCampKds = (id, newKds) => {
        setCamps(camps.map(c => c.id === id ? { ...c, kds: newKds } : c));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
             const base64Data = reader.result.split(',')[1];
             try {
                const res = await fetch('/api/aws/admin/vision/soc-camps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64: base64Data, mimeType: file.type })
                });
                const data = await res.json();
                if (data.success && data.camps) {
                    setCamps(prevCamps => prevCamps.map(camp => {
                        if (data.camps[camp.name]) {
                            return { ...camp, kds: data.camps[camp.name] };
                        }
                        return camp;
                    }));
                } else {
                    alert("Failure: " + (data.error || "Could not extract data from the image."));
                }
             } catch(err) {
                 alert("Network fault scanning image.");
             } finally {
                 setIsScanning(false);
                 // Reset input so they can upload the identical file again if needed
                 if (fileInputRef.current) fileInputRef.current.value = "";
             }
        };
        reader.readAsDataURL(file);
    };

    const fetchCampDkp = useCallback(async () => {
        if (!startScan || !endScan) return;
        setIsDkpLoading(true);
        
        // Use global multipliers, default to Basic
        const t4Pts = globalConfig.advT4Points || 10;
        const t5Pts = globalConfig.advT5Points || 20;
        const deadsPts = globalConfig.deadsPoints || 30; // standard DKP uses 30 for deads default in missing global

        const newRows = [];

        try {
            for (const camp of camps) {
                // Parse Kingdom numbers, ignoring # and spacing
                const kdsArray = camp.kds.split(',').map(k => k.replace(/\D/g, '').trim()).filter(k => k.length > 0);
                
                if (kdsArray.length === 0) continue;

                // Aggregate logic for the entire Camp
                let campAgg = {
                    campName: camp.name,
                    color: camp.color,
                    kds: camp.kds,
                    totalPower: 0,
                    powerDelta: 0,
                    t4Kills: 0,
                    t5Kills: 0,
                    totalDeads: 0,
                    totalKp: 0,
                    totalDkp: 0
                };

                // Sweep AWS across all matched remote Kingdoms
                for (const kd of kdsArray) {
                    const params = new URLSearchParams({
                      kd,
                      start: startScan,
                      end: endScan,
                      t4: t4Pts,
                      t5: t5Pts,
                      deads: deadsPts,
                    });
                    
                    const res = await fetch(`/api/aws/dkp?${params.toString()}`);
                    const data = await res.json();
                    
                    if (!res.ok || !data.rankings) continue;

                    // Sum this kingdom's players into the Camp Totals
                    const kdAgg = data.rankings.reduce((acc, gov) => {
                        acc.totalPower += gov.power || 0;
                        acc.powerDelta += typeof gov.pDelta === "number" ? gov.pDelta : 0;
                        acc.t4Kills += gov.t4Kills || 0;
                        acc.t5Kills += gov.t5Kills || 0;
                        acc.totalDeads += gov.deads || 0;
                        acc.totalKp += gov.kDelta || 0;
                        acc.totalDkp += gov.dkpScore || 0;
                        return acc;
                    }, { totalPower: 0, powerDelta: 0, t4Kills: 0, t5Kills: 0, totalDeads: 0, totalKp: 0, totalDkp: 0 });

                    campAgg.totalPower += kdAgg.totalPower;
                    campAgg.powerDelta += kdAgg.powerDelta;
                    campAgg.t4Kills += kdAgg.t4Kills;
                    campAgg.t5Kills += kdAgg.t5Kills;
                    campAgg.totalDeads += kdAgg.totalDeads;
                    campAgg.totalKp += kdAgg.totalKp;
                    campAgg.totalDkp += kdAgg.totalDkp;
                }
                
                newRows.push(campAgg);
            }
            
            setCampDkpRows(newRows.sort((a, b) => b.totalDkp - a.totalDkp));
        } catch(e) {
            console.error("Failed to sequence Camp DKP Leaderboards", e);
        } finally {
            setIsDkpLoading(false);
        }

    }, [camps, startScan, endScan, globalConfig]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-slate-400">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-fuchsia-500" />
                <p>Hydrating Tactical Server...</p>
            </div>
        );
    }

    const timelineData = MAP_TIMELINES[selectedMap] || [];
    const baseDate = parseISO(regDate);
    const hasValidDate = isValid(baseDate);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                <div>
                    <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600 uppercase tracking-tight">
                        SOC Hub
                    </h2>
                    <p className="text-slate-400 mt-1 max-w-xl text-sm">
                        Global Tactical Workstation. Matchmaking, Phase Timelines, and Stratagems are synchronized across your Kingdom's cloud. Save your progress so leadership sees the exact same map alignment.
                    </p>
                </div>

                <div className="flex flex-col gap-3 items-end">
                    <button 
                        onClick={saveTacticalPlan}
                        disabled={isSaving}
                        className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-sm disabled:opacity-50 flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)] border border-fuchsia-400/50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? "Syncing..." : "Sync to Cloud"}
                    </button>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1115] rounded-xl border border-slate-800">
                        <Map className="w-4 h-4 text-slate-400" />
                        <select 
                            className="bg-transparent text-slate-300 border-0 focus:ring-0 text-xs font-bold cursor-pointer"
                            value={selectedMap}
                            onChange={(e) => setSelectedMap(e.target.value)}
                        >
                            <option value="Siege of Orleans">Siege of Orleans</option>
                            <option value="King of the Nile" disabled>King of the Nile (WIP)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Coalition Camp Matchmaker Map */}
            <div className="bg-[#0f1115] border border-slate-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-400" />
                        Global Coalition Matchmaker
                    </h3>
                    <div className="flex items-center">
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleImageUpload} 
                        />
                        <button 
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            disabled={isScanning}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            {isScanning ? "Scanning Image..." : "Parse from Screenshot"}
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {camps.map(camp => (
                        <div key={camp.id} className={`flex flex-col p-4 rounded-xl border ${camp.color} relative overflow-hidden group`}>
                            <div className="absolute opacity-10 -right-4 -top-4 transform rotate-12 scale-150">
                                <Users className="w-24 h-24" />
                            </div>
                            <span className="text-xs uppercase tracking-widest opacity-80 mb-2">{camp.name}</span>
                            <input 
                                type="text"
                                value={camp.kds}
                                onChange={(e) => updateCampKds(camp.id, e.target.value)}
                                placeholder="E.g. #1224, #2294, #3492"
                                className="bg-slate-950/40 text-slate-100 font-mono py-2 px-3 rounded text-sm outline-none border border-current shadow-inner w-full relative z-10"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Tactical Timeline Explorer */}
                <div className="xl:col-span-7 space-y-4">
                    <div className="bg-[#0f1115] border border-slate-800 rounded-2xl p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-400" />
                                Interactive Timeline
                            </h3>
                            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 shadow-inner">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Date</span>
                                <input 
                                    type="date"
                                    value={regDate}
                                    onChange={(e) => setRegDate(e.target.value)}
                                    className="bg-transparent text-white text-sm focus:outline-none font-mono"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>

                        {!hasValidDate ? (
                            <div className="py-24 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                                <h4 className="text-lg font-bold text-slate-300">Awaiting Calibration</h4>
                                <p className="text-slate-500 text-sm mt-1">Select your KvK Registration Start Date to compute phase trajectories.</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-slate-800 ml-4 space-y-8 py-4">
                                {timelineData.map((ev, idx) => {
                                    const eventDate = addDays(baseDate, ev.offsetDays);
                                    const isPast = eventDate < new Date();
                                    
                                    return (
                                        <div key={idx} className="relative pl-8 group">
                                            {/* Node Marker */}
                                            <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full transition-all duration-300 border-[3px] border-[#0f1115] ${isPast ? 'bg-slate-600' : 'bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]'}`} />
                                            
                                            <div className={`transition-all duration-300 ${isPast ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                                    <h4 className={`text-md font-bold ${isPast ? 'text-slate-300' : 'text-slate-100'}`}>
                                                        {ev.title}
                                                    </h4>
                                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-fuchsia-300/80 border border-slate-700/50">
                                                        {format(eventDate, "MMMM do, yyyy")}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400 leading-relaxed">{ev.description}</p>
                                                {ev.durationDays > 0 && (
                                                    <div className="flex gap-4 mt-2">
                                                        <span className="text-[11px] uppercase tracking-wider text-fuchsia-500/70 font-black">
                                                            Phase Duration: {ev.durationDays < 1 ? Math.round(ev.durationDays * 24) + " Hours" : ev.durationDays + " Days"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stratagems Panel */}
                <div className="xl:col-span-5 space-y-4">
                    <div className="bg-[#0f1115] border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Sword className="w-5 h-5 text-rose-500" />
                                Stratagems Board
                            </h3>
                            <button 
                                onClick={addStratagem}
                                className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wider"
                            >
                                + Add Order
                            </button>
                        </div>
                        
                        <div className="space-y-4 flex-1">
                            {stratagems.length === 0 ? (
                                <div className="text-slate-500 text-sm text-center py-12 flex flex-col items-center">
                                    <MapPin className="w-8 h-8 mb-3 opacity-30" />
                                    <p>No Stratagems recorded on the cloud. Create tactical orders above to share with leadership.</p>
                                </div>
                            ) : (
                                stratagems.map((strat) => (
                                    <div key={strat.id} className="group relative bg-slate-900/50 border border-slate-800 rounded-xl p-4 overflow-hidden transition-all focus-within:border-rose-500/50 focus-within:bg-slate-900 shadow-inner">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/30 group-focus-within:bg-rose-500 transition-colors" />
                                        
                                        <div className="flex justify-between items-center mb-3">
                                            <input 
                                                type="text"
                                                value={strat.title}
                                                onChange={(e) => handleStratagemChange(strat.id, 'title', e.target.value)}
                                                className="bg-transparent text-slate-200 font-bold outline-none w-full placeholder-slate-600 focus:text-rose-100 transition-colors"
                                                placeholder="Phase Title..."
                                            />
                                            <button 
                                                onClick={() => removeStratagem(strat.id)}
                                                className="text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded px-2 py-1 transition-colors"
                                                title="Delete Order"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        
                                        <textarea 
                                            value={strat.content}
                                            onChange={(e) => handleStratagemChange(strat.id, 'content', e.target.value)}
                                            className="w-full bg-transparent text-sm text-slate-400 outline-none resize-none min-h-[80px] placeholder-slate-700 leading-relaxed"
                                            placeholder="Specify tactical directives, marching routes, and garrison rotation sequences here..."
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Camp Matchmaking DKP Aggregator */}
            <div className="bg-[#0f1115] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent left-0" />
                
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-6">
                    <div>
                        <h3 className="text-xl font-black flex items-center gap-2 mb-1 uppercase tracking-widest">
                            Camp Leaderboard
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total DKP aggregated across all detected kingdoms mapping to the 6 Coalitions.</p>
                    </div>

                    <div className="flex items-end gap-3 flex-wrap">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Start Scan</span>
                            <select
                                value={startScan}
                                onChange={(e) => setStartScan(e.target.value)}
                                disabled={isDatesLoading || availableDates.length === 0}
                                className="bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-mono px-3 py-1.5 rounded outline-none focus:border-cyan-500 disabled:opacity-40 min-w-[180px]"
                            >
                                {availableDates.length === 0 && <option>— Validating Network —</option>}
                                {availableDates.map((d) => (
                                    <option key={`s-${d}`} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">End Scan</span>
                            <select
                                value={endScan}
                                onChange={(e) => setEndScan(e.target.value)}
                                disabled={isDatesLoading || availableDates.length === 0}
                                className="bg-[#13161c] border border-[#1e222b] text-white text-[11px] font-mono px-3 py-1.5 rounded outline-none focus:border-cyan-500 disabled:opacity-40 min-w-[180px]"
                            >
                                {availableDates.length === 0 && <option>— Validating Network —</option>}
                                {availableDates.map((d) => (
                                    <option key={`e-${d}`} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={fetchCampDkp}
                            disabled={isDkpLoading}
                            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 hover:border-cyan-500/50 px-4 py-1.5 rounded font-bold uppercase tracking-widest text-[11px] transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isDkpLoading ? "animate-spin text-cyan-400" : ""} />
                            Compute Data
                        </button>
                    </div>
                </div>

                <div className="border border-[#1e222b] rounded-lg overflow-hidden bg-[#0a0c0f]">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-[12px]">
                            <thead className="bg-black/40 border-b border-[#1e222b]">
                                <tr>
                                    {["Camp", "Total Power", "Power +/-", "Total T4 Kills", "Total T5 Kills", "Total Deads", "Total KP", "Camp DKP"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]">
                                {isDkpLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center">
                                            <RefreshCw size={24} className="animate-spin text-cyan-400 mx-auto mb-3" />
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                                Interrogating AWS Network For All Kingdoms...
                                            </p>
                                        </td>
                                    </tr>
                                ) : campDkpRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-[11px] font-bold uppercase tracking-widest text-slate-600">
                                            Click "Compute Data" to aggregate the Kingdom Coalitions.
                                        </td>
                                    </tr>
                                ) : (
                                    campDkpRows.map((row) => (
                                        <tr key={row.campName} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`font-black uppercase tracking-widest text-[13px] ${row.color.split(' ')[1]}`}>
                                                        {row.campName}
                                                    </span>
                                                    <span className="text-[10px] text-slate-600 font-mono tracking-widest">{row.kds}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-slate-300">{formatNum(row.totalPower)}</td>
                                            <td className={`px-4 py-4 font-mono font-bold ${row.powerDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                {row.powerDelta >= 0 ? "+" : ""}{formatNum(row.powerDelta)}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-slate-300">{formatNum(row.t4Kills)}</td>
                                            <td className="px-4 py-4 font-mono text-slate-300">{formatNum(row.t5Kills)}</td>
                                            <td className="px-4 py-4 font-mono text-rose-400 font-bold">{formatNum(row.totalDeads)}</td>
                                            <td className="px-4 py-4 font-mono text-cyan-400">{formatNum(row.totalKp)}</td>
                                            <td className="px-4 py-4 font-mono font-black text-white text-[15px] drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                                {formatNum(row.totalDkp)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
