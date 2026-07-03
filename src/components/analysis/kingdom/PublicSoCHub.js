"use client";

import React, { useState, useEffect } from 'react';
import { Users, Loader2, ShieldAlert } from 'lucide-react';
import CampRosterTable from './CampRosterTable';

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
    (mapName === 'Tides of War' || mapName === 'Heroic Anthem') ? TOW_CAMP_TEMPLATES : CAMP_TEMPLATES;


export default function PublicSoCHub({ targetKd, baselineScan }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [globalConfig, setGlobalConfig] = useState({});
    const [camps, setCamps] = useState([]);
    const [campDkpRows, setCampDkpRows] = useState([]);
    const [campGovernors, setCampGovernors] = useState({});
    const [selectedRosterCamp, setSelectedRosterCamp] = useState(null);

    useEffect(() => {
        if (!targetKd || !baselineScan) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Config
                const configRes = await fetch(`/api/aws/admin/dkp-config?kd=${targetKd}`);
                const configData = await configRes.json();
                
                if (!configData || !configData.config) {
                    setError("Could not load configuration for this kingdom.");
                    setIsLoading(false);
                    return;
                }

                const loadedConfig = configData.config;
                setGlobalConfig(loadedConfig);
                
                const loadedMap = loadedConfig.socMap || 'Siege of Orleans';
                let hydratedCamps = [];
                if (loadedConfig.socCamps && loadedConfig.socCamps.length > 0) {
                    const templates = getCampTemplates(loadedMap);
                    hydratedCamps = templates.map(t => {
                        const saved = loadedConfig.socCamps.find(c => c.id === t.id);
                        return saved ? { ...t, kds: saved.kds } : t;
                    });
                } else {
                    hydratedCamps = getCampTemplates(loadedMap);
                }
                setCamps(hydratedCamps);

                // 2. Sweep AWS for Targets across all matched remote Kingdoms
                const newRows = [];
                const newCampGovernors = {};

                for (const camp of hydratedCamps) {
                    const kdsArray = camp.kds.split(',').map(k => k.trim()).filter(Boolean);
                    if (kdsArray.length === 0) continue;

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
                        totalDkp: 0,
                        targetDkp: 0,
                        targetDeads: 0
                    };

                    const tempGovs = [];

                    for (const kd of kdsArray) {
                        const params = new URLSearchParams({
                          kd,
                          baseline: baselineScan
                        });
                        
                        // We use the public targets endpoint here since this is a public page
                        const res = await fetch(`/api/aws/public/dkp-targets?${params.toString()}`);
                        const data = await res.json();
                        
                        if (!res.ok || !data.targets) continue;

                        const capped = [...data.targets].sort((a, b) => (b.power || 0) - (a.power || 0));

                        const kdAgg = capped.reduce((acc, gov) => {
                            const powerStart = gov.power || 0;
                            const targetDkp = gov.targetDkp || 0;
                            const targetDeads = gov.targetDeads || 0;
                            
                            tempGovs.push({
                                id: gov.id,
                                name: gov.name,
                                kd: kd,
                                status: gov.status || "Sleeper",
                                powerStart: powerStart,
                                powerDiff: 0,
                                t4Diff: 0,
                                t5Diff: 0,
                                t4t5Combined: 0,
                                deadsDiff: 0,
                                kvkKP: 0,
                                targetDkp: targetDkp,
                                targetDeads: targetDeads,
                                kpPercent: 0,
                                deadPercent: 0,
                                finalDkp: 0,
                                quotaPct: 0
                            });

                            acc.totalPower += powerStart;
                            acc.targetDkp += targetDkp;
                            acc.targetDeads += targetDeads;
                            return acc;
                        }, { totalPower: 0, powerDelta: 0, t4Kills: 0, t5Kills: 0, totalDeads: 0, totalKp: 0, totalDkp: 0, targetDkp: 0, targetDeads: 0 });

                        campAgg.totalPower += kdAgg.totalPower;
                        campAgg.targetDkp += kdAgg.targetDkp;
                        campAgg.targetDeads += kdAgg.targetDeads;
                    }
                    
                    newCampGovernors[camp.name] = tempGovs.sort((a,b) => b.powerStart - a.powerStart);
                    newRows.push(campAgg);
                }

                setCampGovernors(newCampGovernors);
                if (Object.keys(newCampGovernors).length > 0) {
                    setSelectedRosterCamp(Object.keys(newCampGovernors)[0]);
                }
                setCampDkpRows(newRows.sort((a, b) => b.targetDkp - a.targetDkp));

            } catch (err) {
                console.error(err);
                setError("Failed to fetch Coalition Data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [targetKd, baselineScan]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6 text-slate-400 font-mono">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-cyan-500" />
                <p className="uppercase tracking-widest text-xs font-bold mt-2">Assembling Global Coalition Data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6">
                <div className="max-w-md w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-8 text-center shadow-[0_0_50px_rgba(244,63,94,0.1)]">
                    <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
                    <h2 className="text-xl font-black text-rose-400 uppercase tracking-widest mb-2">Access Denied</h2>
                    <p className="text-rose-500/70 text-sm font-mono">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060810] text-slate-200 p-4 md:p-8 font-sans">
            <div className="max-w-[1920px] mx-auto space-y-8">
                
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase italic bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
                        KVK OPERATIONS HUB
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold font-mono">
                        Global Tactical Workstation — Read-Only Public Link
                    </p>
                </div>

                {/* Coalition Camp Matchmaker Map (Read Only) */}
                <div className="bg-[#0f1115] border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-400" />
                            Global Coalition Matchmaker
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {camps.map(camp => {
                            if (!camp.kds) return null;
                            return (
                                <div key={camp.id} className={`flex flex-col p-4 rounded-xl border ${camp.color} relative overflow-hidden group`}>
                                    <div className="absolute opacity-10 -right-4 -top-4 transform rotate-12 scale-150">
                                        <Users className="w-24 h-24" />
                                    </div>
                                    <span className="text-xs uppercase tracking-widest opacity-80 mb-2">{camp.name}</span>
                                    <div className="bg-slate-950/40 text-slate-100 font-mono py-2 px-3 rounded text-sm border border-current shadow-inner w-full relative z-10">
                                        {camp.kds}
                                    </div>
                                </div>
                            );
                        })}
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
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total DKP requirements aggregated across all detected kingdoms mapping to the Coalitions.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-[#1e222b] rounded-lg">
                        <table className="w-full text-left text-[11px] whitespace-nowrap">
                            <thead>
                                <tr className="bg-[#13161c] border-b border-[#1e222b]">
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest">Camp</th>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-right">Total Power</th>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-right">Target Deads</th>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-right">Target DKP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]">
                                {campDkpRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-[11px] font-bold uppercase tracking-widest text-slate-600">
                                            No Data Available.
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
                                            <td className="px-4 py-4 text-right font-mono text-slate-300">{formatNum(row.totalPower)}</td>
                                            <td className="px-4 py-4 text-right font-mono text-slate-400">{formatNum(row.targetDeads)}</td>
                                            <td className="px-4 py-4 text-right font-mono text-slate-400 font-bold">{formatNum(row.targetDkp)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Coalition Roster Tabbing */}
                {Object.keys(campGovernors).length > 0 && (
                    <div className="mt-8">
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4 overflow-x-auto custom-scrollbar">
                            {Object.keys(campGovernors).map((cName) => {
                                const isActive = selectedRosterCamp === cName;
                                const campDef = camps.find(c => c.name === cName);
                                const activeColor = campDef ? campDef.color.split(' ')[1] : 'text-slate-200';
                                
                                return (
                                    <button
                                        key={`tab-${cName}`}
                                        onClick={() => setSelectedRosterCamp(cName)}
                                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all whitespace-nowrap ${isActive ? `bg-[#1e222b] ${activeColor} shadow-inner` : 'text-slate-500 hover:bg-[#1a1d24] hover:text-slate-300'}`}
                                    >
                                        {cName}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedRosterCamp && campGovernors[selectedRosterCamp] && (
                            <CampRosterTable 
                                campName={selectedRosterCamp}
                                governors={campGovernors[selectedRosterCamp]} 
                                globalConfig={globalConfig} 
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
