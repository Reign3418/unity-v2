"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Trash2, Mail, GripVertical, ShieldAlert, Cpu, Filter, X, Zap, Layers, RefreshCw, CloudLightning, CloudUpload } from "lucide-react";

export default function AllianceMergeTab({ rosterData, targetKd, isLeader }) {
    // Master State
    const [targets, setTargets] = useState([]); // { id, name, capacity, members: [] }
    const [sourceAlliances, setSourceAlliances] = useState([]); // Currently pooled tags
    
    // UI Filtering State
    const [searchQuery, setSearchQuery] = useState("");
    const [algSortMethod, setAlgSortMethod] = useState("power"); // 'power' or 'kp'
    const [algMinPower, setAlgMinPower] = useState(0);

    // Cloud Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const syncTimeoutRef = useRef(null);
    const isInitialLoadRef = useRef(true);

    const fetchCloudState = async () => {
        if (!targetKd) return;
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/aws/admin/merge?kd=${targetKd}`);
            if (res.ok) {
                const data = await res.json();
                if (data.targets) setTargets(data.targets);
                if (data.sourceAlliances) setSourceAlliances(data.sourceAlliances);
                setLastSyncTime(new Date().toLocaleTimeString());
            }
        } catch (e) {
            console.error("Failed to load Cloud Merge State", e);
        } finally {
            setIsSyncing(false);
            setTimeout(() => { isInitialLoadRef.current = false; }, 1000);
        }
    };

    // Load from Cloud
    useEffect(() => {
        fetchCloudState();
    }, [targetKd]);

    // Push to Cloud
    const saveState = (newTargets, newSources) => {
        const payloadTargets = newTargets !== undefined ? newTargets : targets;
        const payloadSources = newSources !== undefined ? newSources : sourceAlliances;
        
        if (newTargets !== undefined) setTargets(newTargets);
        if (newSources !== undefined) setSourceAlliances(newSources);
        
        if (!isLeader) return;
        if (isInitialLoadRef.current) return;

        setIsSyncing(true);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(async () => {
             try {
                 const res = await fetch(`/api/aws/admin/merge?kd=${targetKd}`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ targets: payloadTargets, sourceAlliances: payloadSources })
                 });
                 if (res.ok) setLastSyncTime(new Date().toLocaleTimeString());
             } catch (e) {
                 console.error("Failed to sync Merge State", e);
             } finally {
                 setIsSyncing(false);
             }
        }, 1500);
    };

    // Calculate Distinct Alliances existing in the DB to populate the available Pool Dropdown
    const uniqueAlliances = useMemo(() => {
        if (!rosterData || rosterData.length === 0) return [];
        return [...new Set(rosterData.map(g => g.alliance))].filter(a => a && a !== "Unknown").sort();
    }, [rosterData]);

    const handleAddSource = (tag) => {
        if (!isLeader) return;
        if (!tag || sourceAlliances.includes(tag)) return;
        saveState(undefined, [...sourceAlliances, tag]);
    };

    const handleRemoveSource = (tag) => {
        if (!isLeader) return;
        saveState(undefined, sourceAlliances.filter(t => t !== tag));
    };

    // Derive the Available Pool of Players
    const availablePool = useMemo(() => {
        if (!rosterData) return [];
        
        // 1. MUST currently be part of a Source Alliance
        let pool = rosterData.filter(g => sourceAlliances.includes(g.alliance));

        // 2. Remove already assigned players
        const assignedIds = new Set();
        targets.forEach(t => t.members.forEach(m => assignedIds.add(m.id)));
        pool = pool.filter(g => !assignedIds.has(g.id));

        // 3. Text Search Filter (UI Only, does not affect auto-fill)
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
    }, [rosterData, targets, sourceAlliances, searchQuery, algSortMethod]);

    // --- Actions ---

    const createTarget = () => {
        if (!isLeader) return;
        const newId = `tgt_${Date.now()}`;
        const newTargets = [...targets, { id: newId, name: `New Alliance ${targets.length + 1}`, capacity: 155, members: [] }];
        saveState(newTargets, undefined);
    };

    const deleteTarget = (targetId) => {
        if (!isLeader) return;
        if (!confirm('Are you sure you want to delete this target? Associated members will return to the pool.')) return;
        saveState(targets.filter(t => t.id !== targetId), undefined);
    };

    const clearAll = () => {
        if (!isLeader) return;
        if (!confirm('Clear all structural targets and reboot the Merge Pipeline?')) return;
        saveState([], []);
    };

    const renameTarget = (targetId, newName) => {
        if (!isLeader) return;
        saveState(targets.map(t => t.id === targetId ? { ...t, name: newName } : t), undefined);
    };

    const updateCapacity = (targetId, newCapStr) => {
        if (!isLeader) return;
        const cap = parseInt(newCapStr, 10);
        if (isNaN(cap) || cap < 1) return;
        saveState(targets.map(t => t.id === targetId ? { ...t, capacity: cap } : t), undefined);
    };

    const removeMember = (targetId, memberId) => {
        if (!isLeader) return;
        saveState(targets.map(tgt => {
            if (tgt.id === targetId) return { ...tgt, members: tgt.members.filter(m => m.id !== memberId) };
            return tgt;
        }), undefined);
    };

    const sendToMail = (target) => {
        if (target.members.length === 0) {
            alert('Cannot dispatch an empty shell to the Command Center.');
            return;
        }

        const totalPower = target.members.reduce((sum, m) => sum + (m.power || 0), 0);
        
        let reportData = target.members.map((m, idx) => {
            let pwrFormat = (m.power / 1000000).toFixed(1) + 'M';
            let kpFormat = ((m.killPoints || 0) / 1000000).toFixed(1) + 'M';
            return `${idx + 1}. [${m.alliance}] ${m.name || 'Unknown'} — (⚡ ${pwrFormat} | ☠️ ${kpFormat})`;
        });

        const payload = {
            type: 'ROSTER_CUSTOM',
            timestamp: new Date().toISOString(),
            reportName: `MERGED ROSTER: ${target.name}`,
            data: reportData,
            summary: `Shell Density: ${target.members.length}/${target.capacity} | Target Mass: ${(totalPower/1000000000).toFixed(2)}B Power | Auto-Generated Migration Structure.`
        };

        localStorage.setItem('unty_mail_roster', JSON.stringify(payload));
        
        const navigationLinks = document.querySelectorAll('a[href="/mail"]');
        if (navigationLinks && navigationLinks.length > 0) {
             navigationLinks[0].click();
        } else {
             window.open('/mail', '_blank');
        }
    };

    // --- Algorithmic Auto Fill ---
    const executeAutoFill = () => {
        if (!isLeader) return;
        if (targets.length === 0) {
            alert('CRITICAL: Insufficient Shells. You must spawn at least one Target Alliance before engaging Auto-Fill sequences.');
            return;
        }

        // We completely rebuild the 'true' available array, bypassing the UI 'search query' limitation
        let algPool = rosterData.filter(g => sourceAlliances.includes(g.alliance));
        
        const assignedIds = new Set();
        targets.forEach(t => t.members.forEach(m => assignedIds.add(m.id)));
        algPool = algPool.filter(g => !assignedIds.has(g.id));

        // Threshold Truncation
        if (algMinPower > 0) {
            algPool = algPool.filter(g => (g.power || 0) >= algMinPower);
        }

        // Sorting Trajectory
        algPool.sort((a, b) => {
            if (algSortMethod === 'kp') return (b.killPoints || 0) - (a.killPoints || 0);
            return (b.power || 0) - (a.power || 0);
        });

        if (algPool.length === 0) {
            alert('ALGORITHM ABORT: Zero Governors match your specified Filter Thresholds within the designated Source Alliances.');
            return;
        }

        // Execute Distribution Cascade
        let distributedCount = 0;
        let constructedTargets = [...targets];

        for (let t = 0; t < constructedTargets.length; t++) {
            let activeShell = constructedTargets[t];
            let availableSlots = activeShell.capacity - activeShell.members.length;
            
            while (availableSlots > 0 && algPool.length > 0) {
                // Shift removes the highest priority member from the Array and immediately pushes it into the active target
                const governor = algPool.shift(); 
                activeShell.members.push(governor);
                availableSlots--;
                distributedCount++;
            }
        }

        saveState(constructedTargets, undefined);
        alert(`DISTRIBUTION COMPLETE: The Migration Algorithm successfully routed [${distributedCount}] Governors into Target Shells.`);
    };

    // --- Drag & Drop Handlers ---

    const [draggedItem, setDraggedItem] = useState(null); // { id: governorId, sourceId: null | targetId }

    const handleDragStart = (e, governor, sourceTargetId = null) => {
        if (!isLeader) {
            e.preventDefault();
            return;
        }
        setDraggedItem({ governor, sourceTargetId });
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedItem(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, destinationTargetId) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem) return;
        const { governor, sourceTargetId } = draggedItem;

        // Dropped to Pool = Remove from Target
        if (!destinationTargetId) {
            if (sourceTargetId) {
                saveState(targets.map(tgt => {
                    if (tgt.id === sourceTargetId) return { ...tgt, members: tgt.members.filter(m => m.id !== governor.id) };
                    return tgt;
                }), undefined);
            }
            setDraggedItem(null);
            return;
        }

        // Protect from identical source/destination drops
        if (sourceTargetId === destinationTargetId) {
            setDraggedItem(null);
            return;
        }

        const destTarget = targets.find(t => t.id === destinationTargetId);
        if (!destTarget) return;
        
        // Block duplicates
        if (destTarget.members.find(m => m.id === governor.id)) {
            setDraggedItem(null);
            return;
        }

        // Warn on overflow, but allow it because it's a structural migration planner
        if (destTarget.members.length >= destTarget.capacity) {
            const override = confirm(`WARNING: Target Capacity [${destTarget.capacity}] exceeded. System highly recommends spawning additional shells. Proceed anyway?`);
            if (!override) {
                 setDraggedItem(null);
                 return;
            }
        }

        // Update Matrix
        let newTargets = targets.map(tgt => {
            if (sourceTargetId && tgt.id === sourceTargetId) {
                return { ...tgt, members: tgt.members.filter(m => m.id !== governor.id) };
            }
            if (tgt.id === destinationTargetId) {
                return { ...tgt, members: [...tgt.members, governor].sort((a,b) => b.power - a.power) };
            }
            return tgt;
        });

        saveState(newTargets, undefined);
        setDraggedItem(null);
    };

    // Number formatter
    const formatShortNum = (num) => {
        if (!num) return '0';
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(0);
    };

    if (!rosterData || rosterData.length === 0) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500 animate-fade-in shadow-xl">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-rose-500" />
                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">System Offline</h3>
                <p className="text-sm">Cannot initiate Alliance Merge. Ensure Kingdom Data Repository has published an active End Scan.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-[85vh]">
            
            {/* LEFT SIDEBAR: THE SOURCE POOL */}
            <div 
                className="w-full lg:w-1/3 xl:w-1/4 bg-[#0f1115]/80 backdrop-blur-md border border-[#1e222b] rounded-xl flex flex-col shadow-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null)}
            >
                <div className="p-5 border-b border-[#1e222b] bg-[#13161c]">
                    <h2 className="text-white font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Layers className="w-5 h-5 text-indigo-400" /> Source Array
                    </h2>
                    
                    {/* Add Source Alliance Selector */}
                    <div className="mb-4">
                        <select 
                            value=""
                            disabled={!isLeader}
                            onChange={(e) => handleAddSource(e.target.value)}
                            className="w-full bg-[#0a0c0f] border border-indigo-500/30 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer mb-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="" disabled>+ Connect Source Alliance...</option>
                            {uniqueAlliances.filter(tag => !sourceAlliances.includes(tag)).map(a => <option key={a} value={a}>[{a}]</option>)}
                        </select>

                        {/* Connected Sources Chips */}
                        <div className="flex flex-wrap gap-2">
                             {sourceAlliances.length === 0 && <span className="text-[10px] text-gray-600 uppercase tracking-widest block w-full text-center py-2">No Sources Connected</span>}
                             {sourceAlliances.map(tag => (
                                 <div key={`src-${tag}`} className={`bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded text-xs font-bold text-indigo-300 flex items-center gap-1 ${isLeader ? 'group' : ''}`}>
                                     [{tag}]
                                     {isLeader && (
                                         <button onClick={() => handleRemoveSource(tag)} className="text-indigo-500/50 hover:text-red-400 transition-colors">
                                             <X size={12} />
                                         </button>
                                     )}
                                 </div>
                             ))}
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input 
                            type="text"
                            placeholder="Manually Filter Roster..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0c0f] border border-[#1e222b] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder-gray-600"
                        />
                    </div>
                </div>

                {/* Draggable Roster List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {availablePool.length === 0 ? (
                        <div className="text-center text-gray-600 text-xs uppercase tracking-widest mt-10">
                            {sourceAlliances.length === 0 ? "Connect Alliances to View Roster" : "No Unassigned Governors Found"}
                        </div>
                    ) : (
                        availablePool.slice(0, 150).map(g => ( 
                            <div 
                                key={`pool-${g.id}`}
                                draggable={isLeader ? "true" : "false"}
                                onDragStart={(e) => handleDragStart(e, g, null)}
                                onDragEnd={handleDragEnd}
                                className={`bg-[#13161c] border border-[#1e222b] rounded-lg p-3 transition-colors group flex flex-col relative overflow-hidden ${isLeader ? 'hover:border-indigo-500/50 cursor-grab active:cursor-grabbing' : 'opacity-80 grayscale-[30%] cursor-default'}`}
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500/20 group-hover:bg-indigo-500/80 transition-colors"></div>
                                
                                <div className="flex items-center justify-between mb-1 pl-1">
                                    <div className="font-bold text-gray-200 text-sm truncate flex items-center gap-1">
                                        <span className="text-xs text-indigo-400 border-r border-indigo-500/20 pr-1 truncate max-w-[50px] font-mono">[{g.alliance}]</span>
                                        <span className="truncate">{g.name || 'Unknown'}</span>
                                    </div>
                                    <div className="text-[9px] text-gray-600 font-mono tracking-widest">ID:{g.id}</div>
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

            {/* RIGHT WORKSPACE: MIGRATION CONSOLE */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* ALGORITHMIC CONTROL RIBBON */}
                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4 mb-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 z-20">
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0">
                         <div className="flex items-center gap-2 bg-[#0a0c0f] border border-[#2d323e] px-3 py-1.5 rounded-lg shrink-0">
                             <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Sort Route</span>
                             <select 
                                 value={algSortMethod}
                                 onChange={(e) => setAlgSortMethod(e.target.value)}
                                 className="bg-transparent text-white font-bold text-xs uppercase focus:outline-none appearance-none cursor-pointer"
                             >
                                 <option value="power">Total Power</option>
                                 <option value="kp">Combat Kills (KP)</option>
                             </select>
                         </div>

                         <div className="flex items-center gap-2 bg-[#0a0c0f] border border-[#2d323e] px-3 py-1.5 rounded-lg shrink-0">
                             <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Min Power Cutoff</span>
                             <input 
                                 type="number"
                                 value={algMinPower || ""}
                                 onChange={(e) => setAlgMinPower(parseInt(e.target.value, 10) || 0)}
                                 placeholder="0"
                                 className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none w-24"
                             />
                         </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <button 
                             onClick={executeAutoFill}
                             disabled={!isLeader || targets.length === 0 || sourceAlliances.length === 0}
                             className={`bg-indigo-600 hover:bg-indigo-500 text-white transition-all px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.4)] ${(!isLeader || targets.length === 0 || sourceAlliances.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Cpu size={16} /> Execute Auto-Merge
                        </button>
                    </div>
                </div>

                {/* TARGET SHELL CANVAS */}
                <div className="flex items-center gap-3 mb-4 shrink-0 bg-[#0a0c0f] border border-[#2d323e] rounded-xl p-3 shadow-lg z-20">
                     <div className="flex items-center gap-3 mr-auto">
                          {isSyncing ? (
                               <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                                   <CloudUpload size={16} /> Syncing...
                               </div>
                          ) : (
                               <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                   <CloudLightning size={16} className="text-indigo-400" />
                                   Cloud State {lastSyncTime && <span className="text-gray-600 font-mono bg-[#13161c] px-2 py-0.5 rounded ml-2">{lastSyncTime}</span>}
                               </div>
                          )}
                     </div>

                    {isLeader && (
                        <>
                            <button 
                                onClick={createTarget}
                                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500 transition-all px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                            >
                                <Plus size={16} /> Spawn Target Shell
                            </button>
                            <button 
                                 onClick={clearAll}
                                 className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500 transition-all px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ml-auto"
                            >
                                 Annihilate Grid
                            </button>
                        </>
                    )}
                    <button
                        onClick={fetchCloudState}
                        disabled={isSyncing}
                        className="bg-[#13161c] border border-[#2d323e] hover:border-indigo-500 hover:text-indigo-400 text-gray-400 transition-all px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 ml-2"
                    >
                        <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> Resync
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-12">
                     {targets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1e222b] rounded-xl text-gray-500">
                            <Zap className="w-12 h-12 mb-2 opacity-20 text-indigo-500" />
                            <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">No Structural Shells</h3>
                            <p className="text-sm">Click "Spawn Target Shell" to initialize a migration target.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                            {targets.map(target => {
                                 const totalPwr = target.members.reduce((sum, m) => sum + (m.power || 0), 0);
                                 const totalKp = target.members.reduce((sum, m) => sum + (m.killPoints || 0), 0);
                                 const isFull = target.members.length >= target.capacity;

                                 return (
                                     <div 
                                         key={target.id}
                                         onDragOver={handleDragOver}
                                         onDrop={(e) => handleDrop(e, target.id)}
                                         className={`bg-[#0f1115] border ${isFull ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-[#2d323e] hover:border-indigo-500/50'} rounded-xl flex flex-col relative overflow-hidden group transition-colors h-[450px] shadow-lg`}
                                     >
                                          {/* Header */}
                                          <div className="p-4 border-b border-[#1e222b] bg-[#13161c] relative">
                                              <div className={`absolute top-0 left-0 w-full h-1 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-indigo-700'}`}></div>
                                              
                                              <div className="flex items-center justify-between mb-3">
                                                  <input 
                                                      type="text" 
                                                      value={target.name}
                                                      disabled={!isLeader}
                                                      onChange={(e) => renameTarget(target.id, e.target.value)}
                                                      className="bg-transparent border-b border-transparent focus:border-indigo-500/50 text-white font-black uppercase tracking-widest text-lg outline-none w-1/2 transition-colors truncate disabled:opacity-80 disabled:cursor-not-allowed"
                                                  />
                                                  
                                                  <div className="flex items-center gap-1 bg-[#0a0c0f] border border-[#1e222b] px-2 py-1 rounded">
                                                      <span className="text-[9px] text-gray-500 uppercase tracking-widest">MAX</span>
                                                      <input 
                                                          type="number"
                                                          value={target.capacity}
                                                          disabled={!isLeader}
                                                          onChange={(e) => updateCapacity(target.id, e.target.value)}
                                                          className="w-10 bg-transparent text-white font-mono font-bold text-right outline-none text-xs disabled:opacity-80 disabled:cursor-not-allowed"
                                                      />
                                                  </div>

                                                  <div className="flex items-center gap-1 ml-2">
                                                       <button onClick={() => sendToMail(target)} title="Dispatch Merge Roster" className="p-1.5 rounded-md text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"><Mail size={16} /></button>
                                                       {isLeader && <button onClick={() => deleteTarget(target.id)} title="Disband Shell" className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={16} /></button>}
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
                                                          {target.members.length}/{target.capacity}
                                                      </span>
                                                  </div>
                                              </div>
                                          </div>

                                          {/* Assigned Members Area */}
                                          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/5 via-[#0f1115] to-[#0f1115]">
                                               {target.members.length === 0 ? (
                                                   <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
                                                       <span className="text-3xl mb-2 text-indigo-500">📥</span>
                                                       <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Execute Merge to populate this Shell</p>
                                                   </div>
                                               ) : (
                                                   target.members.map(m => (
                                                       <div 
                                                           key={`tgt-${target.id}-m-${m.id}`}
                                                           draggable={isLeader ? "true" : "false"}
                                                           onDragStart={(e) => handleDragStart(e, m, target.id)}
                                                           onDragEnd={handleDragEnd}
                                                           className={`bg-[#1e222b]/50 border ${isFull ? 'border-red-500/20 hover:border-red-500/50' : 'border-[#2d323e] hover:border-indigo-500/50'} rounded-lg p-2 transition-colors relative group flex flex-col ${isLeader ? 'cursor-grab active:cursor-grabbing' : 'opacity-90 cursor-default'}`}
                                                       >
                                                            {isLeader && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); removeMember(target.id, m.id); }}
                                                                    className="absolute right-2 top-2 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}

                                                            <div className="font-bold text-gray-300 text-sm truncate pr-6 mb-1">
                                                                <span className="text-gray-500 text-xs font-mono mr-1">[{m.alliance}]</span>
                                                                {m.name || 'Unknown'}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[10px] font-mono font-bold text-gray-500">
                                                                <span title="Power">⚡ {formatShortNum(m.power)}</span>
                                                                <span title="Kill Points">☠️ {formatShortNum(m.killPoints || 0)}</span>
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
        </div>
    );
}
