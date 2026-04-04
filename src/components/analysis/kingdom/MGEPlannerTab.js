"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Trash2, Mail, ShieldAlert, X, Trophy, CloudUpload, CloudLightning, Zap, RefreshCw } from "lucide-react";

export default function MGEPlannerTab({ rosterData, targetKd, isLeader }) {
    // Master Cloud State
    const [targets, setTargets] = useState([]); 
    const [sourceAlliances, setSourceAlliances] = useState([]); 
    
    // UI Filtering State
    const [searchQuery, setSearchQuery] = useState("");
    
    // Cloud Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const syncTimeoutRef = useRef(null);
    const isInitialLoadRef = useRef(true);

    const fetchCloudMGE = async () => {
        if (!targetKd) return;
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/aws/admin/mge?kd=${targetKd}`);
            if (res.ok) {
                const data = await res.json();
                if (data.targets) setTargets(data.targets);
                if (data.sources) setSourceAlliances(data.sources);
                setLastSyncTime(new Date().toLocaleTimeString());
            }
        } catch (e) {
            console.error("Failed to load Cloud MGE State", e);
        } finally {
            setIsSyncing(false);
            setTimeout(() => { isInitialLoadRef.current = false; }, 1000);
        }
    };

    // Initial AWS Cloud Fetch
    useEffect(() => {
        fetchCloudMGE();
    }, [targetKd]);

    // AWS Cloud Auto-Sync (Debounced by 2 seconds to prevent AWS Spam)
    const triggerCloudSync = (newTargets, newSources) => {
        setTargets(newTargets);
        setSourceAlliances(newSources);
        
        if (!isLeader) return; // Fail-safe against unauthorized execution
        
        if (isInitialLoadRef.current) return;

        setIsSyncing(true);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(async () => {
            try {
                // Execute AWS Push
                const res = await fetch(`/api/aws/admin/mge?kd=${targetKd}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targets: newTargets, sources: newSources })
                });
                
                if (res.ok) {
                     setLastSyncTime(new Date().toLocaleTimeString());
                } else {
                     console.error("Cloud Sync Blocked (Likely Unauthorized User)");
                }
            } catch (e) {
                console.error("Failed to dispatch AWS MGE state", e);
            } finally {
                setIsSyncing(false);
            }
        }, 1500); // 1.5s delay before actually hitting the database
    };

    // Calculate Distinct Alliances existing in the DB to populate the available Pool Dropdown
    const uniqueAlliances = useMemo(() => {
        if (!rosterData || rosterData.length === 0) return [];
        return [...new Set(rosterData.map(g => g.alliance))].filter(a => a && a !== "Unknown").sort();
    }, [rosterData]);

    const handleAddSource = (tag) => {
        if (!isLeader || !tag || sourceAlliances.includes(tag)) return;
        triggerCloudSync(targets, [...sourceAlliances, tag]);
    };

    const handleRemoveSource = (tag) => {
        if (!isLeader) return;
        triggerCloudSync(targets, sourceAlliances.filter(t => t !== tag));
    };

    // Derive the Available Pool of Players
    const availablePool = useMemo(() => {
        if (!rosterData) return [];
        
        let pool = rosterData;
        if (sourceAlliances.length > 0) {
             pool = pool.filter(g => sourceAlliances.includes(g.alliance));
        }

        const assignedIds = new Set();
        targets.forEach(t => t.members.forEach(m => assignedIds.add(m.id)));
        pool = pool.filter(g => !assignedIds.has(g.id));

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            pool = pool.filter(g => 
                (g.name && g.name.toLowerCase().includes(q)) || 
                (String(g.id).includes(q))
            );
        }

        return pool.sort((a, b) => (b.power || 0) - (a.power || 0));
    }, [rosterData, targets, sourceAlliances, searchQuery]);

    // --- Actions ---

    const getCapacityForRank = (rankStr) => {
        if (rankStr === "11-15") return 5;
        if (rankStr === "16-25") return 10;
        if (rankStr === "Open") return 999;
        return 1; // Ranks 1-10
    };

    const createTarget = () => {
        if (!isLeader) return;
        let nextRank = "1";
        if (targets.length > 0) {
            const last = parseInt(targets[targets.length - 1].rank);
            if (!isNaN(last)) {
                nextRank = (last + 1).toString();
                if (last >= 10 && last < 15) nextRank = "11-15";
                else if (last >= 15) nextRank = "16-25";
            }
        }

        const newTargets = [...targets, { 
             id: `mge_${Date.now()}`, 
             rank: nextRank, 
             commander: "Open Choice", 
             limit: "", 
             capacity: getCapacityForRank(nextRank), 
             members: [] 
        }];
        triggerCloudSync(newTargets, sourceAlliances);
    };

    const deleteTarget = (targetId) => {
        if (!isLeader) return;
        triggerCloudSync(targets.filter(t => t.id !== targetId), sourceAlliances);
    };

    const clearAll = () => {
        if (!isLeader) return;
        if (!confirm('Clear all MGE assignments and wipe the global Cloud State?')) return;
        triggerCloudSync([], []);
    };

    const updateTargetField = (targetId, field, value) => {
        if (!isLeader) return;
        const newTargets = targets.map(t => {
            if (t.id === targetId) {
                const updated = { ...t, [field]: value };
                if (field === 'rank') {
                    updated.capacity = getCapacityForRank(value);
                    // Slice array to fit new capacity if it shrank
                    updated.members = updated.members.slice(0, updated.capacity);
                }
                return updated;
            }
            return t;
        });
        triggerCloudSync(newTargets, sourceAlliances);
    };

    const removeMember = (targetId, memberId) => {
        if (!isLeader) return;
        const newTargets = targets.map(tgt => {
            if (tgt.id === targetId) return { ...tgt, members: tgt.members.filter(m => m.id !== memberId) };
            return tgt;
        });
        triggerCloudSync(newTargets, sourceAlliances);
    };

    const sendToMail = () => {
        if (targets.length === 0) {
             alert("No Governors assigned. Build the MGE Framework first.");
             return;
        }

        let mailStr = `<size=40><b>MGE Plan - Kingdom ${targetKd}</b></size>\n<color=#555>────────────────────</color>\n\n`;

        const sortedTargets = [...targets].sort((a, b) => (parseInt(a.rank) || 99) - (parseInt(b.rank) || 99));

        sortedTargets.forEach(item => {
             const formattedLimit = (parseInt(item.limit) > 0) ? parseInt(item.limit).toLocaleString() : 'Open';
             
             mailStr += `<size=22><b>Rank ${item.rank}</b> — [${item.commander}]</size>\n`;
             mailStr += `<color=#ff8c00>Fixed Limit:</color> ${formattedLimit}\n`;
             
             if (item.members.length === 0) {
                 mailStr += `<color=#555><i>Unassigned</i></color>\n\n`;
             } else {
                 item.members.forEach((m, idx) => {
                      mailStr += `${idx + 1}. [${m.alliance}] ${m.name}\n`;
                 });
                 mailStr += `\n`;
             }
        });

        mailStr += `<i>Please respect the fixed deployment limits above. Structural violations are strictly penalized by Leadership.</i>`;

        const payload = {
            type: 'ROSTER_CUSTOM',
            timestamp: new Date().toISOString(),
            reportName: `MIGHTIEST GOVERNOR DEPLOYMENT`,
            data: [mailStr], // Inject as a single block to rely on its internal formatting
            summary: `Automated MGE Framework synchronized from AWS Cloud.`
        };

        localStorage.setItem('unty_mail_roster', JSON.stringify(payload));
        
        const navigationLinks = document.querySelectorAll('a[href="/mail"]');
        if (navigationLinks && navigationLinks.length > 0) {
             navigationLinks[0].click();
        } else {
             const locale = window.location.pathname.split('/')[1] || 'en';
             window.open(`/${locale}/mail`, '_blank');
        }
    };

    // --- Drag & Drop Handlers ---

    const [draggedItem, setDraggedItem] = useState(null); 

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

        if (!isLeader || !draggedItem) return;
        const { governor, sourceTargetId } = draggedItem;

        // Dropped to Pool = Remove from Target
        if (!destinationTargetId) {
            if (sourceTargetId) {
                const newTargets = targets.map(tgt => {
                    if (tgt.id === sourceTargetId) return { ...tgt, members: tgt.members.filter(m => m.id !== governor.id) };
                    return tgt;
                });
                triggerCloudSync(newTargets, sourceAlliances);
            }
            setDraggedItem(null);
            return;
        }

        if (sourceTargetId === destinationTargetId) {
            setDraggedItem(null);
            return;
        }

        const destTarget = targets.find(t => t.id === destinationTargetId);
        if (!destTarget) return;
        
        // Prevent Duplicate Entry
        if (destTarget.members.find(m => m.id === governor.id)) {
            setDraggedItem(null);
            return;
        }

        let newTargets = [...targets];

        // 1. Remove from source
        if (sourceTargetId) {
            newTargets = newTargets.map(tgt => {
                if (tgt.id === sourceTargetId) return { ...tgt, members: tgt.members.filter(m => m.id !== governor.id) };
                return tgt;
            });
        }

        // 2. Add to destination (Enforcing Capacity Overwrite Rules)
        newTargets = newTargets.map(tgt => {
             if (tgt.id === destinationTargetId) {
                 const newMembers = [...tgt.members];
                 if (newMembers.length >= tgt.capacity) {
                      // If capacity is 1, just overwrite the guy.
                      if (tgt.capacity === 1) {
                           return { ...tgt, members: [governor] };
                      }
                      // If >1, boot the last guy out of the array to make room for the new drop
                      newMembers.pop(); 
                 }
                 newMembers.push(governor);
                 return { ...tgt, members: newMembers };
             }
             return tgt;
        });

        triggerCloudSync(newTargets, sourceAlliances);
        setDraggedItem(null);
    };

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
                <p className="text-sm">Cannot initiate MGE Command Board. Ensure Kingdom Data Repository has published an active End Scan.</p>
            </div>
        );
    }

    const rankOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11-15", "16-25", "Open"];
    const cmdrOptions = ['Open Choice', 'Cavalry', 'Infantry', 'Archer', 'Leadership'];

    const sortedTargets = [...targets].sort((a, b) => {
        let rankA = parseInt(a.rank) || 99;
        let rankB = parseInt(b.rank) || 99;
        return rankA - rankB;
    });

    return (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-[85vh]">
            
            {/* LEFT SIDEBAR: THE SOURCE POOL */}
            <div 
                className="w-full lg:w-1/3 xl:w-1/4 bg-[#0f1115]/80 backdrop-blur-md border border-[#1e222b] rounded-xl flex flex-col shadow-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null)}
            >
                <div className="p-5 border-b border-[#1e222b] bg-[#13161c]">
                    <h2 className="text-white font-black uppercase tracking-widest flex items-center justify-between mb-4">
                        <span className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Source Pool</span>
                    </h2>
                    
                    <div className="mb-4">
                        {isLeader && (
                            <select 
                                value=""
                                onChange={(e) => handleAddSource(e.target.value)}
                                className="w-full bg-[#0a0c0f] border border-amber-500/30 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none cursor-pointer mb-2 font-bold"
                            >
                                <option value="" disabled>+ Filter by Alliance...</option>
                                <option value="ALL">Show All Alliances</option>
                                {uniqueAlliances.filter(tag => !sourceAlliances.includes(tag)).map(a => <option key={a} value={a}>[{a}]</option>)}
                            </select>
                        )}

                        <div className="flex flex-wrap gap-2">
                             {sourceAlliances.length === 0 && <span className="text-[10px] text-gray-500 uppercase tracking-widest block w-full text-center py-1">Displaying Full Kingdom</span>}
                             {sourceAlliances.map(tag => (
                                 <div key={`src-${tag}`} className="bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded text-xs font-bold text-amber-400 flex items-center gap-1">
                                     [{tag}]
                                     {isLeader && (
                                         <button onClick={() => handleRemoveSource(tag)} className="text-amber-500/50 hover:text-red-400 transition-colors">
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
                            placeholder="Manually Filter Governors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0a0c0f] border border-[#1e222b] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors placeholder-gray-600"
                        />
                    </div>
                </div>

                {/* Draggable Roster List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {availablePool.length === 0 ? (
                        <div className="text-center text-gray-600 text-xs uppercase tracking-widest mt-10">No Recruits Available</div>
                    ) : (
                        availablePool.slice(0, 150).map(g => ( 
                            <div 
                                key={`pool-${g.id}`}
                                draggable={isLeader ? "true" : "false"}
                                onDragStart={(e) => handleDragStart(e, g, null)}
                                onDragEnd={handleDragEnd}
                                className={`bg-[#13161c] border border-[#1e222b] rounded-lg p-3 transition-colors group flex flex-col relative overflow-hidden ${isLeader ? 'hover:border-amber-500/50 cursor-grab active:cursor-grabbing' : 'opacity-80 grayscale-[30%] cursor-default'}`}
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500/20 group-hover:bg-amber-500/80 transition-colors"></div>
                                
                                <div className="flex items-center justify-between mb-1 pl-1">
                                    <div className="font-bold text-gray-200 text-sm truncate flex items-center gap-1">
                                        <span className="text-xs text-amber-400/80 border-r border-amber-500/20 pr-1 truncate max-w-[50px] font-mono">[{g.alliance}]</span>
                                        <span className="truncate">{g.name || 'Unknown'}</span>
                                    </div>
                                    <div className="text-[9px] text-gray-600 font-mono tracking-widest">ID:{g.id}</div>
                                </div>
                                <div className="flex items-center justify-between pl-1 text-xs">
                                     <div className="font-mono font-bold text-gray-400">⚡ {formatShortNum(g.power)}</div>
                                     <div className="font-mono font-bold text-gray-500 flex items-center gap-2 text-[10px]">
                                         <span title="Troop Power">🏃 {formatShortNum(g.troopPower || g.power * 0.4)}</span>
                                         <span title="Commander Power">👑 {formatShortNum(g.commanderPower || g.power * 0.1)}</span>
                                     </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT WORKSPACE: CLOUD DEPLOYMENT CONSOLE */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                
                {/* CLOUD SYNC HEADER */}
                <div className="bg-[#0a0c0f] border border-[#2d323e] rounded-xl p-3 mb-6 flex items-center justify-between shadow-lg mx-2 z-20">
                    <div className="flex items-center gap-3">
                         {isSyncing ? (
                              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                                  <CloudUpload size={16} /> Syncing to DynamoDB...
                              </div>
                         ) : (
                              <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                  <CloudLightning size={16} className="text-amber-400" />
                                  Cloud State Synchronized {lastSyncTime && <span className="text-gray-600 font-mono bg-[#13161c] px-2 py-0.5 rounded ml-2">{lastSyncTime}</span>}
                              </div>
                         )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchCloudMGE}
                            disabled={isSyncing}
                            className="bg-[#13161c] border border-[#2d323e] hover:border-cyan-500 hover:text-cyan-400 text-gray-400 transition-all px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> Resync
                        </button>
                        <button 
                             onClick={sendToMail}
                             className={`bg-[#13161c] border border-[#2d323e] hover:border-amber-500 hover:text-amber-400 text-gray-400 transition-all px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2`}
                        >
                            <Mail size={16} /> Broadcast to Command Mail
                        </button>
                    </div>
                </div>

                {/* TARGET SHELL CANVAS */}
                {isLeader && (
                    <div className="flex items-center gap-3 mb-4 shrink-0 px-2">
                        <button 
                            onClick={createTarget}
                            className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500 transition-all px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        >
                            <Plus size={16} /> Allocate MGE Target Rank
                        </button>
                        <button 
                             onClick={clearAll}
                             className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500 transition-all px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ml-auto"
                        >
                             Wipe Infrastructure
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-12">
                     {targets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1e222b] rounded-xl text-gray-500 mt-10">
                            <Zap className="w-12 h-12 mb-2 opacity-20 text-amber-500" />
                            <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">No Active Governance Ranks</h3>
                            <p className="text-sm">Click "Allocate MGE Target Rank" to initialize the Command Framework.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                            {sortedTargets.map(target => {
                                 const isFull = target.members.length >= target.capacity;

                                 return (
                                     <div 
                                         key={target.id}
                                         onDragOver={handleDragOver}
                                         onDrop={(e) => handleDrop(e, target.id)}
                                         className={`bg-[#0f1115] border ${isFull ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-[#2d323e] hover:border-amber-500/50'} rounded-xl flex flex-col relative overflow-hidden group transition-colors min-h-[300px]`}
                                     >
                                          {/* Header */}
                                          <div className="p-4 border-b border-[#1e222b] bg-[#13161c] relative">
                                              <div className={`absolute top-0 left-0 w-full h-1 ${isFull ? 'bg-amber-500' : 'bg-gradient-to-r from-amber-600 to-amber-800'}`}></div>
                                              
                                              <div className="flex items-center justify-between mb-4">
                                                  <div className="flex flex-col">
                                                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Position Rank</span>
                                                      <select 
                                                          value={target.rank}
                                                          onChange={(e) => updateTargetField(target.id, 'rank', e.target.value)}
                                                          disabled={!isLeader}
                                                          className="bg-transparent text-amber-500 font-black text-xl uppercase tracking-widest outline-none border-b border-dashed border-amber-500/30 pb-1 cursor-pointer appearance-none disabled:opacity-80 disabled:cursor-not-allowed"
                                                      >
                                                           {rankOptions.map(r => <option key={r} value={r} className="bg-[#0a0c0f] text-sm">Target: {r}</option>)}
                                                      </select>
                                                  </div>
                                                  {isLeader && (
                                                      <div className="flex items-center gap-1 ml-2">
                                                           <button onClick={() => deleteTarget(target.id)} title="Delete Matrix Block" className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={16} /></button>
                                                      </div>
                                                  )}
                                              </div>

                                              {/* Ruleset Matrix */}
                                              <div className="grid grid-cols-2 gap-3 mb-1">
                                                  <div className="bg-[#0a0c0f] border border-[#1e222b] rounded p-2 focus-within:border-amber-500/50 transition-colors">
                                                      <span className="block text-[8px] uppercase tracking-widest text-gray-500 mb-0.5">Assigned Commander</span>
                                                      <select 
                                                          value={target.commander}
                                                          disabled={!isLeader}
                                                          onChange={(e) => updateTargetField(target.id, 'commander', e.target.value)}
                                                          className="w-full bg-transparent text-white text-xs font-bold outline-none cursor-pointer appearance-none disabled:opacity-80 disabled:cursor-not-allowed"
                                                      >
                                                           {cmdrOptions.map(c => <option key={c} value={c} className="bg-[#13161c] text-sm">{c}</option>)}
                                                      </select>
                                                  </div>
                                                  <div className="bg-[#0a0c0f] border border-[#1e222b] rounded p-2 focus-within:border-amber-500/50 transition-colors">
                                                      <span className="block text-[8px] uppercase tracking-widest text-gray-500 mb-0.5">Maximum Point Limit</span>
                                                      <input 
                                                          type="number"
                                                          placeholder="Unlimited"
                                                          value={target.limit}
                                                          disabled={!isLeader}
                                                          onChange={(e) => updateTargetField(target.id, 'limit', e.target.value)}
                                                          className="w-full bg-transparent text-white font-mono font-bold outline-none text-xs disabled:opacity-80 disabled:cursor-not-allowed"
                                                      />
                                                  </div>
                                              </div>
                                          </div>

                                          {/* Assigned Members Area */}
                                          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/5 via-[#0f1115] to-[#0f1115]">
                                               {target.members.length === 0 ? (
                                                   <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
                                                       <span className="text-3xl mb-2 text-amber-500">🛡️</span>
                                                       <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Empty Slot (0/{target.capacity})</p>
                                                   </div>
                                               ) : (
                                                   target.members.map(m => (
                                                       <div 
                                                           key={`tgt-${target.id}-m-${m.id}`}
                                                           draggable={isLeader ? "true" : "false"}
                                                           onDragStart={(e) => handleDragStart(e, m, target.id)}
                                                           onDragEnd={handleDragEnd}
                                                           className={`bg-[#1e222b]/60 border border-amber-500/30 rounded-lg p-3 transition-colors relative group flex flex-col shadow-[0_0_10px_rgba(245,158,11,0.05)] ${isLeader ? 'hover:border-amber-400 cursor-grab active:cursor-grabbing' : 'opacity-90 cursor-default'}`}
                                                       >
                                                            {isLeader && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); removeMember(target.id, m.id); }}
                                                                    className="absolute right-2 top-2 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}

                                                            <div className="font-bold text-gray-200 text-sm truncate pr-8 mb-2">
                                                                <span className="text-amber-500 text-xs font-mono mr-1">[{m.alliance}]</span>
                                                                {m.name || 'Unknown'}
                                                            </div>
                                                            <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-gray-500">
                                                                <span>⚡ {formatShortNum(m.power)}</span>
                                                                <span>👑 Cmdr: {formatShortNum(m.commanderPower || m.power * 0.1)}</span>
                                                            </div>
                                                       </div>
                                                   ))
                                               )}
                                               
                                               {target.members.length > 0 && target.members.length < target.capacity && (
                                                    <div className="border border-dashed border-[#2d323e] rounded-lg p-3 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                                                         + {target.capacity - target.members.length} Open Slots
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
        </div>
    );
}
