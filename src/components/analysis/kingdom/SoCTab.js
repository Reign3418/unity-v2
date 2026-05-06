import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MAP_TIMELINES, TIDES_SCHEDULE } from '../../../constants/soc_timelines';
import { Calendar, Crosshairs, Sword, Map, Settings, Save, MapPin, Loader2, Users, Camera, RefreshCw, Clock } from 'lucide-react';
import { addDays, addHours, format, isValid, parseISO } from 'date-fns';

const formatNum = (num) => {
  if (!num && num !== 0) return "0";
  return Number(num).toLocaleString();
};

const CAMP_TEMPLATES = [
    { id: 1, name: 'Brittany',  color: 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold',   kds: '' },
    { id: 2, name: 'Bourbon',   color: 'bg-green-500/10 text-green-400 border-green-500/30 font-bold', kds: '' },
    { id: 3, name: 'La Marche', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold',    kds: '' },
    { id: 4, name: 'Picardy',   color: 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold', kds: '' },
    { id: 5, name: 'Auvergne',  color: 'bg-gray-100/10 text-gray-200 border-gray-100/30 font-bold',    kds: '' },
    { id: 6, name: 'Poitou',    color: 'bg-red-500/10 text-red-400 border-red-500/30 font-bold',       kds: '' },
];

const TOW_CAMP_TEMPLATES = [
    { id: 1, name: 'Fire',  color: 'bg-red-500/10 text-red-400 border-red-500/30 font-bold',       kds: '' },
    { id: 2, name: 'Earth', color: 'bg-amber-700/10 text-amber-500 border-amber-700/30 font-bold', kds: '' },
    { id: 3, name: 'Water', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold',    kds: '' },
    { id: 4, name: 'Wind',  color: 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold', kds: '' },
];

const getCampTemplates = (mapName) =>
    mapName === 'Tides of War' ? TOW_CAMP_TEMPLATES : CAMP_TEMPLATES;

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
    const [baselineScan, setBaselineScan] = useState("");   // Locked → Marauders date — power baseline only
    const [dkpStartScan, setDkpStartScan] = useState("");   // Pass 4 open — DKP tracking begins here
    const [latestScan, setLatestScan] = useState("");       // Most recent scan — DKP tracking ends here
    const [isDatesLoading, setIsDatesLoading] = useState(false);
    const [campDkpRows, setCampDkpRows] = useState([]);
    const [isDkpLoading, setIsDkpLoading] = useState(false);
    const [governorCap, setGovernorCap]   = useState(0); // 0 = unlimited

    // AI Tactical Brief
    const [isBriefing, setIsBriefing]   = useState(false);
    const [aiBrief, setAiBrief]         = useState(null);
    const [briefError, setBriefError]   = useState(null);

    // Fetch available scan dates and default latest + DKP start
    useEffect(() => {
        if (!targetKd) return;
        setIsDatesLoading(true);
        fetch(`/api/aws/dkp/dates?kd=${targetKd}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.dates && data.dates.length > 0) {
              setAvailableDates(data.dates);
              setLatestScan(data.dates[data.dates.length - 1]);
              // DKP start defaults to midpoint until reg date is known
              if (data.dates.length > 1) {
                setDkpStartScan(data.dates[Math.floor(data.dates.length / 2)]);
              }
            }
          })
          .catch(err => console.error("Failed to fetch DKP dates:", err))
          .finally(() => setIsDatesLoading(false));
    }, [targetKd]);

    // Auto-lock Baseline to nearest scan at Marauders offset (KvK start power)
    // Auto-snap DKP Start to nearest scan at Pass 4 open (Hand in Hand, day 23.115)
    useEffect(() => {
        if (!regDate || availableDates.length === 0 || !selectedMap) return;

        const mapEvents = MAP_TIMELINES[selectedMap] || [];
        const baseDate  = parseISO(regDate);
        if (!isValid(baseDate)) return;

        const snapToNearest = (targetDate) => {
            let closest = availableDates[0];
            let minDiff = Infinity;
            for (const scan of availableDates) {
                const scanDate = parseISO(scan);
                if (isValid(scanDate)) {
                    const diff = Math.abs(scanDate.getTime() - targetDate.getTime());
                    if (diff < minDiff) { minDiff = diff; closest = scan; }
                }
            }
            return closest;
        };

        // 1️⃣ Baseline → Marauder(s) — matches both 'Marauders' (SoO) and 'Marauder' (ToW)
        const maraudersEvent = mapEvents.find(e => e.title.toLowerCase().startsWith('marauder'));
        if (maraudersEvent) {
            setBaselineScan(snapToNearest(addDays(baseDate, maraudersEvent.offsetDays)));
        }

        // 2️⃣ DKP Start → Pass 4 open (Hand in Hand — same name in both formats)
        const pass4Event = mapEvents.find(e => e.title.toLowerCase().includes('hand in hand'));
        if (pass4Event) {
            setDkpStartScan(snapToNearest(addDays(baseDate, pass4Event.offsetDays)));
        }
    }, [regDate, availableDates, selectedMap]);

    // ── Hydration: localStorage first (instant), AWS overrides on top ──────────
    useEffect(() => {
        if (!targetKd) { setIsLoading(false); return; }

        // 1. Pre-fill from localStorage immediately (no network wait)
        const lsKey = `unty_kvk_hub_${targetKd}`;
        try {
            const cached = JSON.parse(localStorage.getItem(lsKey) || 'null');
            if (cached) {
                if (cached.selectedMap) setSelectedMap(cached.selectedMap);
                if (cached.regDate)     setRegDate(cached.regDate);
                if (cached.camps?.length)      setCamps(cached.camps);
                if (cached.stratagems?.length) setStratagems(cached.stratagems);
            }
        } catch(e) { /* ignore corrupt cache */ }

        // 2. AWS fetch — overrides localStorage if cloud has data (authoritative)
        fetch(`/api/aws/admin/dkp-config?kd=${targetKd}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.config && Object.keys(data.config).length > 0) {
                    setGlobalConfig(data.config);
                    const loadedMap = data.config.socMap || 'Siege of Orleans';
                    if (data.config.socMap)    setSelectedMap(loadedMap);
                    if (data.config.socRegDate) setRegDate(data.config.socRegDate);
                    if (data.config.socStratagems?.length > 0) {
                        setStratagems(data.config.socStratagems);
                    }
                    if (data.config.socCamps?.length > 0) {
                        const templates    = getCampTemplates(loadedMap);
                        const hydratedCamps = templates.map(t => {
                            const saved = data.config.socCamps.find(c => c.id === t.id);
                            return saved ? { ...t, kds: saved.kds } : t;
                        });
                        setCamps(hydratedCamps);
                    }
                }
            })
            .catch(err => console.error('Failed to load SOC Config from AWS:', err))
            .finally(() => setIsLoading(false));
    }, [targetKd]);

    // ── Auto-save to localStorage on every state change ──────────────────────
    useEffect(() => {
        if (!targetKd) return;
        const lsKey = `unty_kvk_hub_${targetKd}`;
        localStorage.setItem(lsKey, JSON.stringify({ selectedMap, regDate, camps, stratagems }));
    }, [selectedMap, regDate, camps, stratagems, targetKd]);


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
            alert('✅ Tactical Plan Synced to Kingdom Cloud!');
        } catch(e) {
            console.error('Failed to sync to AWS', e);
            alert('❌ Network Error while saving.');
        }
        setIsSaving(false);
    };

    const runAiBrief = async () => {
        setIsBriefing(true);
        setAiBrief(null);
        setBriefError(null);
        try {
            // Find the current active phase from the timeline
            const timelineEvents = MAP_TIMELINES[selectedMap] || [];
            const baseDate = regDate ? parseISO(regDate) : null;
            let currentPhase = null;
            if (baseDate && isValid(baseDate)) {
                const now = new Date();
                const active = timelineEvents.filter(ev => {
                    const start = addDays(baseDate, ev.offsetDays);
                    const end   = addDays(baseDate, ev.offsetDays + (ev.durationDays || 1));
                    return start <= now && end > now;
                });
                if (active.length > 0) {
                    const ev = active[active.length - 1];
                    currentPhase = {
                        title: ev.title,
                        description: ev.description,
                        date: format(addDays(baseDate, ev.offsetDays), 'MMM do, yyyy'),
                    };
                }
            }

            const prefs = JSON.parse(localStorage.getItem('unty_prefs') || '{}');
            const headers = { 'Content-Type': 'application/json' };
            if (prefs.geminiKey) headers['x-gemini-key'] = prefs.geminiKey;

            const res = await fetch('/api/aws/admin/soc-brief', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    mapName: selectedMap,
                    regDate,
                    currentPhase,
                    camps: camps.map(c => ({ name: c.name, kds: c.kds })),
                    campDkpRows,
                }),
            });
            const data = await res.json();
            if (data.success && data.brief) {
                setAiBrief(data.brief);
            } else {
                setBriefError(data.error || 'AI core failed to respond.');
            }
        } catch(err) {
            setBriefError('Network fault — brief request failed.');
        } finally {
            setIsBriefing(false);
        }
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
            // Pass the currently active camp names so the prompt is format-aware
            const campNames = camps.map(c => c.name);
            try {
                const res = await fetch('/api/aws/admin/vision/soc-camps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64: base64Data, mimeType: file.type, campNames })
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
                    alert('Scan failed: ' + (data.error || 'Could not extract data from the image.'));
                }
            } catch(err) {
                alert('Network fault scanning image.');
            } finally {
                setIsScanning(false);
                 // Reset input so they can upload the identical file again if needed
                 if (fileInputRef.current) fileInputRef.current.value = "";
             }
        };
        reader.readAsDataURL(file);
    };

    const fetchCampDkp = useCallback(async () => {
        if (!dkpStartScan || !latestScan) return;
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
                      start: dkpStartScan,
                      end: latestScan,
                      t4: t4Pts,
                      t5: t5Pts,
                      deads: deadsPts,
                    });
                    
                    const res = await fetch(`/api/aws/dkp?${params.toString()}`);
                    const data = await res.json();
                    
                    if (!res.ok || !data.rankings) continue;

                    // Apply governor cap: sort by power desc, slice to N before aggregating
                    const sorted = [...data.rankings].sort((a, b) => (b.power || 0) - (a.power || 0));
                    const capped = governorCap > 0 ? sorted.slice(0, governorCap) : sorted;

                    // Sum this kingdom's players into the Camp Totals
                    const kdAgg = capped.reduce((acc, gov) => {
                        acc.totalPower += gov.power || 0;
                        acc.powerDelta += typeof gov.pDelta === "number" ? gov.pDelta : 0;
                        acc.t4Kills += typeof gov.t4Delta === "number" ? gov.t4Delta : 0;
                        acc.t5Kills += typeof gov.t5Delta === "number" ? gov.t5Delta : 0;
                        acc.totalDeads += typeof gov.dDelta === "number" ? gov.dDelta : 0;
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

    }, [camps, dkpStartScan, latestScan, globalConfig, governorCap]);

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

    // Dynamic Spawner Data
    const ruinsSchedule = [];
    const altarSchedule = [];

    if (hasValidDate && selectedMap === "Siege of Orleans") {
        const ruinsFirst = addDays(baseDate, 18.615);
        const altarFirst = addDays(baseDate, 31.615);
        const now = new Date();
        for (let i = 0; i < 15; i++) {
            const rd = addHours(ruinsFirst, i * 40);
            ruinsSchedule.push({ idx: i + 1, date: rd, isPast: rd < now, isActive: rd >= now && rd < addHours(now, 40) });
            const ad = addHours(altarFirst, i * 86);
            altarSchedule.push({ idx: i + 1, date: ad, isPast: ad < now, isActive: ad >= now && ad < addHours(now, 86) });
        }
    }

    // Tides of War — compute live tide schedule from reg date
    const tidesSchedule = [];
    if (hasValidDate && selectedMap === "Tides of War") {
        const now = new Date();
        TIDES_SCHEDULE.forEach((tide, i) => {
            const start = addDays(baseDate, tide.offsetDays);
            const end   = addDays(baseDate, tide.offsetDays + tide.durationDays);
            tidesSchedule.push({
                ...tide,
                idx: i + 1,
                start,
                end,
                isPast:   end   < now,
                isActive: start <= now && end > now,
            });
        });
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                <div>
                    <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600 uppercase tracking-tight">
                        KvK Operations Hub
                    </h2>
                    <p className="text-slate-400 mt-1 max-w-xl text-sm">
                        Global Tactical Workstation. Matchmaking, Phase Timelines, and Stratagems are synchronized across your Kingdom's cloud. Operations dynamically adapt to your selected campaign format.
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
                    <button
                        onClick={runAiBrief}
                        disabled={isBriefing || camps.every(c => !c.kds)}
                        className="bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-sm disabled:opacity-40 flex items-center gap-2 transition-all border border-cyan-500/40 hover:border-cyan-400/70 shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:shadow-[0_0_25px_rgba(34,211,238,0.3)]"
                        title={camps.every(c => !c.kds) ? 'Add kingdoms to coalitions first' : 'Generate AI tactical briefing'}
                    >
                        {isBriefing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base leading-none">⚡</span>}
                        {isBriefing ? 'Analyzing...' : 'AI Tactical Brief'}
                    </button>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1115] rounded-xl border border-slate-800">
                        <Map className="w-4 h-4 text-slate-400" />
                        <select 
                            className="bg-transparent text-slate-300 border-0 focus:ring-0 text-xs font-bold cursor-pointer"
                            value={selectedMap}
                            onChange={(e) => {
                                const newMap = e.target.value;
                                setSelectedMap(newMap);
                                setCamps(getCampTemplates(newMap)); // explicit user action → reset camps
                                setCampDkpRows([]);
                            }}
                        >
                            <option value="Siege of Orleans">Siege of Orleans</option>
                            <option value="Tides of War">Tides of War (Season of Conquest)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── J.A.R.V.I.S. AI Tactical Brief Panel ─────────────────────── */}
            {(aiBrief || briefError || isBriefing) && (
                <div className="relative bg-[#060810] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.08)] animate-in fade-in slide-in-from-top-2 duration-500">
                    {/* Header bar */}
                    <div className="absolute top-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
                    <div className="flex items-center justify-between px-6 py-3 border-b border-cyan-500/20 bg-cyan-500/5">
                        <div className="flex items-center gap-3">
                            <span className="text-cyan-400 font-black text-xs uppercase tracking-[0.25em]">⚡ J.A.R.V.I.S. — CLASSIFIED TACTICAL BRIEF</span>
                            {aiBrief?.classifiedLevel && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-400/80 border border-rose-500/30 px-2 py-0.5 rounded bg-rose-500/5">{aiBrief.classifiedLevel}</span>
                            )}
                        </div>
                        <button onClick={() => { setAiBrief(null); setBriefError(null); }} className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none">✕</button>
                    </div>

                    <div className="p-6">
                        {isBriefing && (
                            <div className="flex items-center gap-3 text-cyan-400/70">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm font-mono tracking-wider">Analyzing coalition intelligence... standby.</span>
                            </div>
                        )}
                        {briefError && (
                            <p className="text-rose-400 text-sm font-mono">⚠ {briefError}</p>
                        )}
                        {aiBrief && !isBriefing && (
                            <div className="space-y-5">
                                {/* Situation Assessment */}
                                {aiBrief.situationAssessment && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500/70 mb-1">Situation Assessment</p>
                                        <p className="text-slate-200 text-sm leading-relaxed border-l-2 border-cyan-500/40 pl-3">{aiBrief.situationAssessment}</p>
                                    </div>
                                )}

                                {/* Threat Matrix */}
                                {aiBrief.threatMatrix?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/70 mb-2">Threat Matrix</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {aiBrief.threatMatrix.map((t, i) => {
                                                const lvlColor = t.threatLevel === 'CRITICAL' ? 'border-rose-500/50 bg-rose-500/5'
                                                    : t.threatLevel === 'HIGH' ? 'border-orange-500/50 bg-orange-500/5'
                                                    : t.threatLevel === 'MODERATE' ? 'border-amber-500/50 bg-amber-500/5'
                                                    : 'border-slate-600 bg-slate-800/30';
                                                const lvlText = t.threatLevel === 'CRITICAL' ? 'text-rose-400'
                                                    : t.threatLevel === 'HIGH' ? 'text-orange-400'
                                                    : t.threatLevel === 'MODERATE' ? 'text-amber-400'
                                                    : 'text-slate-400';
                                                return (
                                                    <div key={i} className={`rounded-lg border p-3 ${lvlColor}`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-black text-slate-200 text-sm">{t.coalition}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${lvlText}`}>{t.threatLevel}</span>
                                                        </div>
                                                        <p className="text-slate-400 text-xs leading-relaxed mb-1">{t.assessment}</p>
                                                        {t.exploitableWeakness && (
                                                            <p className="text-emerald-400/80 text-[11px] italic">🎯 {t.exploitableWeakness}</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Your Position */}
                                {aiBrief.yourPosition && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/70 mb-1">Your Position</p>
                                        <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-amber-500/40 pl-3">{aiBrief.yourPosition}</p>
                                    </div>
                                )}

                                {/* Win Conditions */}
                                {aiBrief.winConditions?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 mb-2">Win Conditions — Execute Now</p>
                                        <ol className="space-y-1.5">
                                            {aiBrief.winConditions.map((w, i) => (
                                                <li key={i} className="flex gap-2 text-sm">
                                                    <span className="text-emerald-400 font-black shrink-0">{i + 1}.</span>
                                                    <span className="text-slate-300 leading-relaxed">{w}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {/* Critical Intel + Verdict */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {aiBrief.criticalIntel && (
                                        <div className="bg-rose-500/5 border border-rose-500/30 rounded-lg p-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400/80 mb-1">⚡ Critical Intel</p>
                                            <p className="text-slate-300 text-xs leading-relaxed">{aiBrief.criticalIntel}</p>
                                        </div>
                                    )}
                                    {aiBrief.commanderVerdict && (
                                        <div className="bg-cyan-500/5 border border-cyan-500/30 rounded-lg p-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400/80 mb-1">Commander Verdict</p>
                                            <p className="text-slate-200 text-xs leading-relaxed font-semibold italic">&ldquo;{aiBrief.commanderVerdict}&rdquo;</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

                        {/* 1️⃣ Baseline — locked to Marauders, power reference only */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-fuchsia-400" /> Baseline <span className="text-fuchsia-400/60 normal-case font-normal">(KvK Start Power 🔒)</span>
                            </span>
                            <select
                                value={baselineScan}
                                disabled={true}
                                title="Auto-locked to nearest scan at Marauders start. Records KvK starting power only — not used for DKP tracking."
                                className="bg-[#13161c] border border-fuchsia-500/30 text-fuchsia-400 text-[11px] font-mono font-bold px-3 py-1.5 rounded outline-none disabled:opacity-80 min-w-[180px] cursor-not-allowed shadow-[inset_0_0_10px_rgba(217,70,239,0.05)]"
                            >
                                {availableDates.length === 0 && <option>— Validating Network —</option>}
                                {availableDates.map((d) => (
                                    <option key={`b-${d}`} value={d}>{d}</option>
                                ))}
                            </select>
                            <span className="text-[9px] text-fuchsia-400/40 font-bold tracking-wide">Power snapshot only · not in DKP window</span>
                        </div>

                        {/* Arrow separator */}
                        <div className="flex flex-col items-center justify-end pb-6 text-slate-700 font-black text-lg select-none">→</div>

                        {/* 2️⃣ DKP Start — Pass 4 open, auto-snapped but adjustable */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-amber-400" /> DKP Start <span className="text-amber-400/60 normal-case font-normal">(Pass 4 Open)</span>
                            </span>
                            <select
                                value={dkpStartScan}
                                onChange={(e) => setDkpStartScan(e.target.value)}
                                disabled={isDatesLoading || availableDates.length === 0}
                                title="Auto-snapped to nearest scan at Pass 4 open (Hand in Hand). Kills, deaths, and KP are tracked FROM this date."
                                className="bg-[#13161c] border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold px-3 py-1.5 rounded outline-none focus:border-amber-500 disabled:opacity-40 min-w-[180px] shadow-[inset_0_0_10px_rgba(251,191,36,0.04)]"
                            >
                                {availableDates.length === 0 && <option>— Validating Network —</option>}
                                {availableDates.map((d) => (
                                    <option key={`p-${d}`} value={d}>{d}</option>
                                ))}
                            </select>
                            <span className="text-[9px] text-amber-400/40 font-bold tracking-wide">DKP tracking begins here</span>
                        </div>

                        {/* Arrow separator */}
                        <div className="flex flex-col items-center justify-end pb-6 text-slate-700 font-black text-lg select-none">→</div>

                        {/* 3️⃣ Latest Scan — current live state, end of DKP window */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-cyan-400" /> Latest Scan <span className="text-cyan-400/60 normal-case font-normal">(Current State)</span>
                            </span>
                            <select
                                value={latestScan}
                                onChange={(e) => setLatestScan(e.target.value)}
                                disabled={isDatesLoading || availableDates.length === 0}
                                className="bg-[#13161c] border border-cyan-500/40 text-cyan-300 text-[11px] font-mono px-3 py-1.5 rounded outline-none focus:border-cyan-500 disabled:opacity-40 min-w-[180px]"
                            >
                                {availableDates.length === 0 && <option>— Validating Network —</option>}
                                {availableDates.map((d) => (
                                    <option key={`l-${d}`} value={d}>{d}</option>
                                ))}
                            </select>
                            <span className="text-[9px] text-cyan-400/40 font-bold tracking-wide">DKP tracking ends here</span>
                        </div>

                        {/* Compute button + governor cap selector */}
                        <div className="flex flex-col items-center justify-end gap-2 pb-6">
                            <div className="flex items-center gap-1.5 bg-[#0f1115] border border-slate-700 rounded px-2 py-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Top</span>
                                <select
                                    value={governorCap}
                                    onChange={(e) => setGovernorCap(Number(e.target.value))}
                                    className="bg-transparent text-slate-300 text-[10px] font-mono border-0 focus:ring-0 cursor-pointer outline-none"
                                    title="Cap the number of governors counted per kingdom (sorted by power)"
                                >
                                    <option value={0}>All</option>
                                    <option value={300}>300</option>
                                    <option value={400}>400</option>
                                    <option value={650}>650</option>
                                    <option value={1000}>1000</option>
                                </select>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gov</span>
                            </div>
                            <button
                                onClick={fetchCampDkp}
                                disabled={isDkpLoading || !dkpStartScan || !latestScan}
                                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 hover:border-cyan-500/50 px-4 py-1.5 rounded font-bold uppercase tracking-widest text-[11px] transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={isDkpLoading ? "animate-spin text-cyan-400" : ""} />
                                Compute Data
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border border-[#1e222b] rounded-lg overflow-hidden bg-[#0a0c0f]">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-[12px]">
                            <thead className="bg-black/40 border-b border-[#1e222b]">
                                <tr>
                                    {["Camp", "Total Power", "Power +/-", "T4 Kills +/-", "T5 Kills +/-", "Deads +/-", "Total KP +/-", "Camp DKP"].map((h) => (
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


                    {/* ── Siege of Orleans Cyclical Spawners ────────────────────── */}
                    {hasValidDate && selectedMap === "Siege of Orleans" && ruinsSchedule.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-500">
                            {/* Ancient Ruins */}
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden relative max-h-[400px] flex flex-col shadow-lg">
                                <div className="absolute top-0 w-full h-1 bg-emerald-500/50" />
                                <div className="p-4 bg-emerald-500/5 flex items-center justify-between border-b border-[#1e222b]">
                                    <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Ancient Ruins
                                    </h4>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-[#6b7280]">40h Cycle</span>
                                </div>
                                <div className="overflow-y-auto w-full scrollbar-thin scrollbar-thumb-slate-800 flex-1">
                                    <table className="w-full text-xs box-border">
                                        <thead className="sticky top-0 bg-[#0a0c0f] border-b border-[#1e222b] z-10 shadow-sm">
                                            <tr>
                                                <th className="py-2.5 px-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[9px]">Spawn Time</th>
                                                <th className="py-2.5 px-4 text-right font-bold text-slate-500 uppercase tracking-widest text-[9px]">Active</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1e222b]">
                                            {ruinsSchedule.map(ruin => (
                                                <tr key={ruin.idx} className={`transition-colors ${ruin.isPast ? 'opacity-40' : ruin.isActive ? 'bg-emerald-500/10' : 'hover:bg-white/[0.02]'}`}>
                                                    <td className={`py-3 px-4 font-mono whitespace-nowrap text-[11px] ${ruin.isActive ? 'text-emerald-300 font-bold' : 'text-slate-300'}`}>
                                                        {format(ruin.date, "E, d.M. HH:mm")}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-black uppercase tracking-widest text-[10px]">
                                                        {ruin.isPast ? (
                                                            <span className="text-slate-600">FALSE</span>
                                                        ) : ruin.isActive ? (
                                                            <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">ACTIVE</span>
                                                        ) : (
                                                            <span className="text-slate-400">FALSE</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Altar of Darkness */}
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden relative max-h-[400px] flex flex-col shadow-lg">
                                <div className="absolute top-0 w-full h-1 bg-blue-500/50" />
                                <div className="p-4 bg-blue-500/5 flex items-center justify-between border-b border-[#1e222b]">
                                    <h4 className="font-bold text-blue-400 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Altar of Darkness
                                    </h4>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-[#6b7280]">86h Cycle</span>
                                </div>
                                <div className="overflow-y-auto w-full scrollbar-thin scrollbar-thumb-slate-800 flex-1">
                                    <table className="w-full text-xs box-border">
                                        <thead className="sticky top-0 bg-[#0a0c0f] border-b border-[#1e222b] z-10 shadow-sm">
                                            <tr>
                                                <th className="py-2.5 px-4 text-left font-bold text-slate-500 uppercase tracking-widest text-[9px]">Spawn Time</th>
                                                <th className="py-2.5 px-4 text-right font-bold text-slate-500 uppercase tracking-widest text-[9px]">Active</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1e222b]">
                                            {altarSchedule.map(altar => (
                                                <tr key={altar.idx} className={`transition-colors ${altar.isPast ? 'opacity-40' : altar.isActive ? 'bg-blue-500/10' : 'hover:bg-white/[0.02]'}`}>
                                                    <td className={`py-3 px-4 font-mono whitespace-nowrap text-[11px] ${altar.isActive ? 'text-blue-300 font-bold' : 'text-slate-300'}`}>
                                                        {format(altar.date, "E, d.M. HH:mm")}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-black uppercase tracking-widest text-[10px]">
                                                        {altar.isPast ? (
                                                            <span className="text-slate-600">FALSE</span>
                                                        ) : altar.isActive ? (
                                                            <span className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">ACTIVE</span>
                                                        ) : (
                                                            <span className="text-slate-400">FALSE</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right column: Tides of War rotation (ToW) or Stratagems (SoO) ── */}
                {selectedMap === "Tides of War" && hasValidDate && tidesSchedule.length > 0 && (
                    <div className="xl:col-span-5 space-y-4">
                        <div className="relative bg-[#0f1115] border border-[#1e222b] rounded-2xl overflow-hidden h-full flex flex-col shadow-lg">
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-rose-500/50" />
                            <div className="p-4 bg-cyan-500/5 flex items-center justify-between border-b border-[#1e222b]">
                                <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Tides Rotation Schedule
                                </h4>
                                <span className="text-[10px] uppercase font-black tracking-widest text-[#6b7280]">4-Day Cycle</span>
                            </div>
                            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-800">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-[#0a0c0f] border-b border-[#1e222b] z-10">
                                        <tr>
                                            <th className="py-2.5 px-3 text-left font-bold text-slate-500 uppercase tracking-widest text-[9px]">Tide</th>
                                            <th className="py-2.5 px-3 text-left font-bold text-slate-500 uppercase tracking-widest text-[9px]">Type</th>
                                            <th className="py-2.5 px-3 text-left font-bold text-slate-500 uppercase tracking-widest text-[9px]">Start → End</th>
                                            <th className="py-2.5 px-3 text-left font-bold text-slate-500 uppercase tracking-widest text-[9px]">Milestone</th>
                                            <th className="py-2.5 px-3 text-right font-bold text-slate-500 uppercase tracking-widest text-[9px]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1e222b]">
                                        {tidesSchedule.map(tide => {
                                            const typeColor = tide.type === 'pvp'
                                                ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                                                : tide.type === 'pve'
                                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                                : 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                                            return (
                                                <tr key={tide.idx} className={`transition-colors ${
                                                    tide.isPast ? 'opacity-35'
                                                    : tide.isActive ? 'bg-cyan-500/5 border-l-2 border-cyan-500'
                                                    : 'hover:bg-white/[0.02]'
                                                }`}>
                                                    <td className={`py-3 px-3 font-bold text-[11px] whitespace-nowrap ${ tide.isActive ? 'text-cyan-300' : 'text-slate-300' }`}>
                                                        {tide.title}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${typeColor}`}>{tide.type}</span>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-[10px] whitespace-nowrap">
                                                        <span className="text-slate-400">{format(tide.start, 'd MMM')}</span>
                                                        <span className="text-slate-600 mx-1">→</span>
                                                        <span className="text-slate-500">{format(tide.end, 'd MMM')}</span>
                                                    </td>
                                                    <td className="py-3 px-3 text-[10px] text-amber-400/80 font-bold">{tide.note || '—'}</td>
                                                    <td className="py-3 px-3 text-right font-black uppercase tracking-widest text-[10px]">
                                                        {tide.isPast
                                                            ? <span className="text-slate-600">DONE</span>
                                                            : tide.isActive
                                                            ? <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">ACTIVE</span>
                                                            : <span className="text-slate-500">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stratagems Panel — Siege of Orleans only */}
                {selectedMap === "Siege of Orleans" && <div className="xl:col-span-5 space-y-4">
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
                </div>}

            </div>

        </div>
    );
}
