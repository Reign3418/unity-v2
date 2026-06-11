"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, ShieldAlert, Cpu, Filter, Layers, RefreshCw, Loader2, AlertTriangle, CheckCircle2, GitMerge } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function SharedAllianceMerge() {
    const searchParams = useSearchParams();
    const kd = searchParams.get('kd');
    const secondary = searchParams.get('secondary');

    // States
    const [targets, setTargets] = useState([]);
    const [sourceAlliances, setSourceAlliances] = useState([]);
    const [roster, setRoster] = useState([]);
    const [secondaryRoster, setSecondaryRoster] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI Filtering State
    const [searchQuery, setSearchQuery] = useState("");
    const [algSortMethod, setAlgSortMethod] = useState("power"); // 'power' or 'kp'

    const fetchMergePlan = async () => {
        if (!kd) {
            setError("Invalid Link: Missing primary Kingdom ID (kd).");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            let url = `/api/aws/public/merge?kd=${kd}`;
            if (secondary) {
                url += `&secondary=${secondary}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.error) {
                setError(data.error);
            } else {
                setTargets(data.targets || []);
                setSourceAlliances(data.sourceAlliances || []);
                setRoster(data.roster || []);
                setSecondaryRoster(data.secondaryRoster || []);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to fetch Alliance Merge plan. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMergePlan();
    }, [kd, secondary]);

    // Merge primary + secondary rosters. Secondary players get _sourceKd tag
    // and namespaced IDs (e.g. "4023_123456") to prevent collisions.
    const mergedRosterData = useMemo(() => {
        const primary = (roster || []).map(p => ({ ...p, _sourceKd: kd }));
        if (!secondary || !secondaryRoster || secondaryRoster.length === 0) return primary;
        const sec = secondaryRoster.map(p => ({
            ...p,
            _sourceKd: secondary,
            id: `${secondary}_${p.id}`,
        }));
        return [...primary, ...sec];
    }, [roster, secondaryRoster, kd, secondary]);

    // Determine if a player is from the secondary stacked kingdom
    const isSecondary = (g) => secondary && g._sourceKd === secondary;

    // Derive the Available Pool of Players (connected source alliances and not assigned)
    const availablePool = useMemo(() => {
        if (!mergedRosterData || mergedRosterData.length === 0) return [];
        
        // 1. MUST currently be part of a Source Alliance
        let pool = mergedRosterData.filter(g => sourceAlliances.includes(g.alliance));

        // 2. Remove already assigned players
        const assignedIds = new Set();
        targets.forEach(t => (t.members || []).forEach(m => assignedIds.add(m.id)));
        pool = pool.filter(g => !assignedIds.has(g.id));

        // 3. Text Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            pool = pool.filter(g => 
                (g.name && g.name.toLowerCase().includes(q)) || 
                (String(g.id).includes(q))
            );
        }

        // 4. Sort Based on User Preference (Power vs Kill Points)
        return pool.sort((a, b) => {
            if (algSortMethod === 'kp') return (b.killPoints || 0) - (a.killPoints || 0);
            return (b.power || 0) - (a.power || 0);
        });
    }, [mergedRosterData, targets, sourceAlliances, searchQuery, algSortMethod]);

    // Number formatter
    const formatShortNum = (num) => {
        if (!num) return '0';
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(0);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6 text-slate-400 font-mono">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
                <p className="uppercase tracking-widest text-xs font-bold">Connecting to Unity Network...</p>
                <p className="text-[10px] mt-2 opacity-50">Retrieving Alliance Merge Plan for Kingdom {kd}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
                <h1 className="text-2xl font-black text-rose-400 uppercase tracking-widest mb-2">Access Denied</h1>
                <p className="text-slate-400 font-mono max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060810] text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
            <div className="max-w-[1800px] mx-auto w-full space-y-6 animate-fade-in relative">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-[#0f1115] p-6 rounded-2xl border border-[#1e222b] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent left-0" />
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                            <GitMerge className="text-indigo-400 w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black italic uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">
                                    Alliance Merge
                                </h1>
                                <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-indigo-500/20">
                                    PUBLIC SHARE
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Kingdom <span className="text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{kd}</span>
                                </h2>
                                {secondary && (
                                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5 text-xs font-mono font-bold text-amber-300">
                                        <Layers size={10} className="text-amber-400" />
                                        <span>Stacked KD {secondary}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={fetchMergePlan}
                            className="bg-[#13161c] border border-[#2d323e] hover:border-indigo-500 hover:text-indigo-400 text-gray-400 transition-all px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <RefreshCw size={14} /> Refresh Plan
                        </button>
                    </div>
                </div>

                {/* Sub layout container */}
                <div className="flex flex-col lg:flex-row gap-6 h-[80vh]">
                    
                    {/* LEFT PANEL: Available pool */}
                    <div className="w-full lg:w-1/3 xl:w-1/4 bg-[#0f1115]/80 backdrop-blur-md border border-[#1e222b] rounded-xl flex flex-col shadow-xl overflow-hidden">
                        <div className="p-5 border-b border-[#1e222b] bg-[#13161c]">
                            <h2 className="text-white font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Layers className="w-5 h-5 text-indigo-400" /> Unassigned Pool
                            </h2>
                            
                            {/* Connected Sources Chips (Read Only) */}
                            <div className="mb-4">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-2">Connected Source Alliances</span>
                                <div className="flex flex-wrap gap-2">
                                     {sourceAlliances.length === 0 && <span className="text-[10px] text-gray-600 uppercase tracking-widest block w-full py-1">No Sources Connected</span>}
                                     {sourceAlliances.map(tag => (
                                         <div key={`src-${tag}`} className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-xs font-bold text-indigo-300">
                                             [{tag}]
                                         </div>
                                     ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input 
                                        type="text"
                                        placeholder="Search Pool Roster..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#0a0c0f] border border-[#1e222b] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder-gray-600"
                                    />
                                </div>

                                <div className="flex items-center gap-2 bg-[#0a0c0f] border border-[#1e222b] px-3 py-1.5 rounded-lg">
                                     <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Sort Route</span>
                                     <select 
                                         value={algSortMethod}
                                         onChange={(e) => setAlgSortMethod(e.target.value)}
                                         className="bg-transparent text-white font-bold text-xs uppercase focus:outline-none appearance-none cursor-pointer flex-1 text-right pr-2"
                                     >
                                         <option value="power" className="bg-[#0a0c0f]">Total Power</option>
                                         <option value="kp" className="bg-[#0a0c0f]">Combat Kills (KP)</option>
                                     </select>
                                </div>
                            </div>
                        </div>

                        {/* Roster List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {availablePool.length === 0 ? (
                                <div className="text-center text-gray-600 text-xs uppercase tracking-widest mt-10">
                                    {sourceAlliances.length === 0 ? "No connected alliances" : "No Unassigned Governors Found"}
                                </div>
                            ) : (
                                availablePool.map(g => ( 
                                    <div 
                                        key={`pool-${g.id}`}
                                        className="bg-[#13161c] border border-[#1e222b] rounded-lg p-3 transition-colors group flex flex-col relative overflow-hidden opacity-90 hover:opacity-100"
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isSecondary(g) ? 'bg-amber-500/40' : 'bg-indigo-500/40'}`}></div>
                                        
                                        <div className="flex items-center justify-between mb-1 pl-1">
                                            <div className="font-bold text-gray-200 text-sm truncate flex items-center gap-1">
                                                <span className={`text-xs border-r pr-1 truncate max-w-[50px] font-mono ${isSecondary(g) ? 'text-amber-400 border-amber-500/20' : 'text-indigo-400 border-indigo-500/20'}`}>[{g.alliance}]</span>
                                                <span className="truncate">{g.name || 'Unknown'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {isSecondary(g) && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1 py-0.5 rounded">KD {g._sourceKd}</span>
                                                )}
                                                <div className="text-[9px] text-gray-600 font-mono tracking-widest">ID:{g.id.replace(/^\d+_/,'')}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 pl-1 text-xs">
                                             <div className="font-mono font-bold text-gray-400 flex items-center gap-1">
                                                 <span className="text-yellow-600">⚡</span> {formatShortNum(g.power)}
                                             </div>
                                             <div className="font-mono font-bold text-gray-400 flex items-center gap-1">
                                                 <span className="text-red-500/80">☠️</span> {formatShortNum(g.killPoints || 0)}
                                             </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT CANVAS: Alliance Shell Targets */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
                         {targets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#1e222b] rounded-xl text-gray-600">
                                <GitMerge className="w-12 h-12 mb-2 opacity-20 text-indigo-500" />
                                <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">No Structural Shells Defined</h3>
                                <p className="text-sm">R4/R5 leadership has not spawned any migration targets yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                                {targets.map(target => {
                                     const totalPwr = (target.members || []).reduce((sum, m) => sum + (m.power || 0), 0);
                                     const totalKp = (target.members || []).reduce((sum, m) => sum + (m.killPoints || 0), 0);
                                     const isFull = (target.members || []).length >= target.capacity;

                                     return (
                                         <div 
                                             key={target.id}
                                             className={`bg-[#0f1115] border ${isFull ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-[#2d323e]'} rounded-xl flex flex-col relative overflow-hidden h-[calc(80vh-20px)] shadow-lg`}
                                         >
                                              {/* Header */}
                                              <div className="p-4 border-b border-[#1e222b] bg-[#13161c] relative">
                                                  <div className={`absolute top-0 left-0 w-full h-1 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-indigo-700'}`}></div>
                                                  
                                                  <div className="flex items-center justify-between mb-3">
                                                      <span className="text-white font-black uppercase tracking-widest text-lg truncate w-2/3">
                                                          {target.name}
                                                      </span>
                                                      
                                                      <div className="flex items-center gap-1 bg-[#0a0c0f] border border-[#1e222b] px-2 py-1 rounded">
                                                          <span className="text-[9px] text-gray-500 uppercase tracking-widest mr-1">LIMIT</span>
                                                          <span className="text-white font-mono font-bold text-xs">{target.capacity}</span>
                                                      </div>
                                                  </div>

                                                  {/* Rollup Metrics */}
                                                  <div className="grid grid-cols-3 gap-2">
                                                      <div className="bg-[#0a0c0f] border border-[#1e222b] rounded p-2 text-center">
                                                          <span className="block text-[8px] uppercase tracking-widest text-gray-500 mb-0.5">Power ⚡</span>
                                                          <span className="font-mono font-bold text-white text-xs">{formatShortNum(totalPwr)}</span>
                                                      </div>
                                                      <div className="bg-[#0a0c0f] border border-[#1e222b] rounded p-2 text-center">
                                                          <span className="block text-[8px] uppercase tracking-widest text-gray-500 mb-0.5">Kills ☠️</span>
                                                          <span className="font-mono font-bold text-amber-400 text-xs">{formatShortNum(totalKp)}</span>
                                                      </div>
                                                      <div className={`border ${isFull ? 'bg-red-500/10 border-red-500/30' : 'bg-[#0a0c0f] border-[#1e222b]'} rounded p-2 text-center transition-colors`}>
                                                          <span className={`block text-[8px] uppercase tracking-widest mb-0.5 ${isFull ? 'text-red-400' : 'text-gray-500'}`}>Capacity 👥</span>
                                                          <span className={`font-mono font-bold text-xs ${isFull ? 'text-red-500' : 'text-indigo-400'}`}>
                                                              {(target.members || []).length}/{target.capacity}
                                                          </span>
                                                      </div>
                                                  </div>
                                              </div>

                                              {/* Assigned Members Area */}
                                              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/5 via-[#0f1115] to-[#0f1115]">
                                                   {(target.members || []).length === 0 ? (
                                                       <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
                                                           <span className="text-3xl mb-2 text-indigo-500">📥</span>
                                                           <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Empty Shell</p>
                                                       </div>
                                                   ) : (
                                                       (target.members || []).map(m => (
                                                           <div 
                                                               key={`tgt-${target.id}-m-${m.id}`}
                                                               className={`bg-[#1e222b]/50 border ${isFull ? 'border-red-500/20' : 'border-[#2d323e]'} rounded-lg p-2 relative group flex flex-col opacity-90`}
                                                           >
                                                                <div className="font-bold text-gray-300 text-sm truncate pr-2 mb-1">
                                                                    <span className={`text-xs font-mono mr-1 ${isSecondary(m) ? 'text-amber-400' : 'text-gray-500'}`}>[{m.alliance}]</span>
                                                                    {m.name || 'Unknown'}
                                                                </div>
                                                                <div className="flex items-center gap-3 text-[10px] font-mono font-bold text-gray-500">
                                                                    <span title="Power">⚡ {formatShortNum(m.power)}</span>
                                                                    <span title="Kill Points">☠️ {formatShortNum(m.killPoints || 0)}</span>
                                                                    {isSecondary(m) && (
                                                                        <span className="ml-auto text-[8px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1 py-0.5 rounded font-black uppercase">KD {m._sourceKd}</span>
                                                                    )}
                                                                </div>
                                                           </div>
                                                       ))
                                                   )}
                                              </div>
                                         </div>
                                     );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-700 mt-6 pb-12">
                     Powered by Unity Combat Intelligence · unity-v2.vercel.app
                </div>
            </div>
        </div>
    );
}
