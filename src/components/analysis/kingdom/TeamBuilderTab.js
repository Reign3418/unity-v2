"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, Trash2, Mail, GripVertical, ShieldAlert, Sparkles, Filter, X, Users, RefreshCw, CloudLightning, CloudUpload } from "lucide-react";

export default function TeamBuilderTab({ rosterData, targetKd, isLeader }) {
    // Master State
    const [squads, setSquads] = useState([]);
    
    // Pool Filtering
    const [searchQuery, setSearchQuery] = useState("");
    const [allianceFilter, setAllianceFilter] = useState("ALL");

    // Cloud Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const syncTimeoutRef = useRef(null);
    const isInitialLoadRef = useRef(true);

    const fetchCloudTeams = async () => {
        if (!targetKd) return;
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/aws/admin/teams?kd=${targetKd}`);
            if (res.ok) {
                const data = await res.json();
                if (data.squads) setSquads(data.squads);
                setLastSyncTime(new Date().toLocaleTimeString());
            }
        } catch (e) {
            console.error("Failed to load Cloud Team Builder State", e);
        } finally {
            setIsSyncing(false);
            setTimeout(() => { isInitialLoadRef.current = false; }, 1000);
        }
    };

    // Load from Cloud
    useEffect(() => {
        fetchCloudTeams();
    }, [targetKd]);

    // Push to Cloud
    const triggerCloudSync = (newSquads) => {
        setSquads(newSquads);
        
        if (!isLeader) return;
        
        if (isInitialLoadRef.current) return;

        setIsSyncing(true);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/aws/admin/teams?kd=${targetKd}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ squads: newSquads })
                });
                
                if (res.ok) {
                     setLastSyncTime(new Date().toLocaleTimeString());
                } else {
                     console.error("Team Builder Cloud Sync Blocked.");
                }
            } catch (e) {
                console.error("Failed to dispatch AWS Teams state", e);
            } finally {
                setIsSyncing(false);
            }
        }, 1500);
    };

    // Calculate Distinct Alliances for the Pool Filter
    const uniqueAlliances = useMemo(() => {
        if (!rosterData || rosterData.length === 0) return [];
        return [...new Set(rosterData.map(g => g.alliance))].filter(a => a && a !== "Unknown").sort();
    }, [rosterData]);

    // Derive the Available Pool of Players
    const availablePool = useMemo(() => {
        if (!rosterData) return [];
        
        // Flatten all assigned IDs across all squads
        const assignedIds = new Set();
        squads.forEach(sq => sq.members.forEach(m => assignedIds.add(m.id)));

        // Remove assigned players from pool
        let pool = rosterData.filter(g => !assignedIds.has(g.id));

        // Text Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            pool = pool.filter(g => 
                (g.name && g.name.toLowerCase().includes(q)) || 
                (g.alliance && g.alliance.toLowerCase().includes(q)) || 
                (String(g.id).includes(q))
            );
        }

        // Alliance Filter
        if (allianceFilter !== "ALL") {
            pool = pool.filter(g => g.alliance === allianceFilter);
        }

        // Sort by Power exactly like U1
        return pool.sort((a, b) => (b.power || 0) - (a.power || 0));
    }, [rosterData, squads, searchQuery, allianceFilter]);

    // --- Actions ---

    const createSquad = () => {
        if (!isLeader) return;
        const newId = `squad_${Date.now()}`;
        const newSquads = [...squads, { id: newId, name: `New Squad ${squads.length + 1}`, members: [] }];
        triggerCloudSync(newSquads);
    };

    const deleteSquad = (squadId) => {
        if (!isLeader) return;
        if (!confirm('Are you sure you want to delete this squad? All members will be returned to the pool.')) return;
        triggerCloudSync(squads.filter(s => s.id !== squadId));
    };

    const clearAll = () => {
        if (!isLeader) return;
        if (!confirm('Clear all squads and return everyone to the pool?')) return;
        triggerCloudSync([]);
    };

    const renameSquad = (squadId, newName) => {
        if (!isLeader) return;
        triggerCloudSync(squads.map(s => s.id === squadId ? { ...s, name: newName } : s));
    };

    const removeMember = (squadId, memberId) => {
        if (!isLeader) return;
        triggerCloudSync(squads.map(sq => {
            if (sq.id === squadId) {
                return { ...sq, members: sq.members.filter(m => m.id !== memberId) };
            }
            return sq;
        }));
    };

    const sendToMail = (squad) => {
        if (squad.members.length === 0) {
            alert('Cannot dispatch an empty squad to the Command Center.');
            return;
        }

        const totalPower = squad.members.reduce((sum, m) => sum + (m.power || 0), 0);
        
        let reportData = squad.members.map((m, idx) => {
            let pwrFormat = (m.power / 1000000).toFixed(1) + 'M';
            let kpFormat = ((m.killPoints || 0) / 1000000).toFixed(1) + 'M';
            return `${idx + 1}. [${m.alliance || 'NONE'}] ${m.name || 'Unknown'} — (Power: ${pwrFormat} | KP: ${kpFormat})`;
        });

        const payload = {
            type: 'ROSTER_CUSTOM',
            timestamp: new Date().toISOString(),
            reportName: `SQUAD DEPLOYMENT: ${squad.name}`,
            data: reportData,
            summary: `Squad Size: ${squad.members.length}/30 | Mass: ${(totalPower/1000000000).toFixed(2)}B Power | Unified Telemetry Acquired.`
        };

        localStorage.setItem('unty_mail_roster', JSON.stringify(payload));
        
        // Find and click the Mail Generator tab in the parent navigation if it exists
        const navigationLinks = document.querySelectorAll('a[href="/mail"]');
        if (navigationLinks && navigationLinks.length > 0) {
             navigationLinks[0].click();
        } else {
             // Fallback routing
             window.open('/mail', '_blank');
        }
    };

    // --- Drag & Drop Handlers ---

    const [draggedItem, setDraggedItem] = useState(null); // { id: governorId, sourceId: null | squadId }

    const handleDragStart = (e, governor, sourceSquadId = null) => {
        if (!isLeader) {
            e.preventDefault();
            return;
        }
        // We track the dragged governor explicitly in React State to bypass complex HTML5 dataTransfer serialization bugs.
        setDraggedItem({ governor, sourceSquadId });
        e.dataTransfer.effectAllowed = "move";
        // Ghost image wrapper 
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

    const handleDrop = (e, targetSquadId) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem) return;
        
        const { governor, sourceSquadId } = draggedItem;

        // If dropped back into the Pool (no targetSquadId)
        if (!targetSquadId) {
            if (sourceSquadId) {
                // Remove from the source squad
                triggerCloudSync(squads.map(sq => {
                    if (sq.id === sourceSquadId) return { ...sq, members: sq.members.filter(m => m.id !== governor.id) };
                    return sq;
                }));
            }
            setDraggedItem(null);
            return;
        }

        // We dropped it into a VALID Squad Board.
        const targetSquad = squads.find(s => s.id === targetSquadId);
        if (!targetSquad) return;
        
        // Protection from adding to the same squad twice
        if (targetSquad.members.find(m => m.id === governor.id)) {
            setDraggedItem(null);
            return;
        }

        // Cap limit 30
        if (targetSquad.members.length >= 30) {
            alert('Squad Maximum Capacity Reached (30/30). Cannot assign additional Governors.');
            setDraggedItem(null);
            return;
        }

        // Construct new squad state simultaneously removing from source and pushing to target
        let newSquads = squads.map(sq => {
            // Remove from Source Array
            if (sourceSquadId && sq.id === sourceSquadId) {
                return { ...sq, members: sq.members.filter(m => m.id !== governor.id) };
            }
            // Add to Target Array
            if (sq.id === targetSquadId) {
                return { ...sq, members: [...sq.members, governor].sort((a,b) => b.power - a.power) };
            }
            return sq;
        });

        triggerCloudSync(newSquads);
        setDraggedItem(null);
    };

    // Number formatter for cards
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
                <p className="text-sm">Cannot initiate Team Builder. Ensure Kingdom Data Repository has published an active End Scan.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-[85vh]">
            
            {/* LEFT SIDEBAR: ACTIVE PLAYER POOL */}
            <div 
                className="w-full lg:w-1/3 xl:w-1/4 bg-[#0f1115]/80 backdrop-blur-md border border-[#1e222b] rounded-xl flex flex-col shadow-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null)} // Drop to pool removes from squad
            >
                <div className="p-5 border-b border-[#1e222b]">
                    <h2 className="text-white font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-cyan-400" /> Player Pool
                    </h2>
                    
                    {/* Filters */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input 
                                type="text"
                                placeholder="Search Governors or IDs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#0a0c0f] border border-[#1e222b] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder-gray-600"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <select 
                                value={allianceFilter}
                                onChange={(e) => setAllianceFilter(e.target.value)}
                                className="w-full bg-[#0a0c0f] border border-[#1e222b] rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="ALL">All Alliances</option>
                                {uniqueAlliances.map(a => <option key={a} value={a}>[{a}]</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Draggable Roster List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {availablePool.length === 0 ? (
                        <div className="text-center text-gray-600 text-xs uppercase tracking-widest mt-10">No Recruits Available</div>
                    ) : (
                        availablePool.slice(0, 150).map(g => ( // Limit DOM render count
                            <div 
                                key={`pool-${g.id}`}
                                draggable={isLeader ? "true" : "false"}
                                onDragStart={(e) => handleDragStart(e, g, null)}
                                onDragEnd={handleDragEnd}
                                className={`bg-[#13161c] border border-[#1e222b] rounded-lg p-3 transition-colors group flex flex-col relative overflow-hidden ${isLeader ? 'hover:border-cyan-500/50 cursor-grab active:cursor-grabbing' : 'opacity-80 grayscale-[30%] cursor-default'}`}
                            >
                                {/* Left Drag Indicator Grip */}
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500/20 group-hover:bg-cyan-500/80 transition-colors"></div>
                                
                                <div className="flex items-center justify-between mb-1 pl-1">
                                    <div className="font-bold text-gray-200 text-sm truncate flex items-center gap-1">
                                        {allianceFilter === 'ALL' && <span className="text-xs text-cyan-500/70 border-r border-cyan-500/20 pr-1 truncate max-w-[50px] font-mono">[{g.alliance}]</span>}
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
                <div className="p-3 border-t border-[#1e222b] text-[10px] text-gray-500 uppercase tracking-widest text-center">
                    Drag recruits from pool to assign to squads.
                </div>
            </div>

            {/* RIGHT WORKSPACE: SQUAD DASHBOARD */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                
                {/* Workspace Header Actions */}
                <div className="flex items-center gap-3 mb-6 bg-[#0a0c0f] border border-[#2d323e] rounded-xl p-3 shadow-lg z-20">
                    <div className="flex items-center gap-3 mr-auto">
                         {isSyncing ? (
                              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                                  <CloudUpload size={16} /> Syncing...
                              </div>
                         ) : (
                              <div className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                  <CloudLightning size={16} className="text-cyan-400" />
                                  Cloud State {lastSyncTime && <span className="text-gray-600 font-mono bg-[#13161c] px-2 py-0.5 rounded ml-2">{lastSyncTime}</span>}
                              </div>
                         )}
                    </div>
                
                    {isLeader && (
                        <>
                            <button 
                                onClick={createSquad}
                                className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                            >
                                <Plus size={16} /> Standard Squad
                            </button>
                            <button 
                                 onClick={clearAll}
                                 className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500 transition-all px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest ml-auto"
                            >
                                 Clear Board
                            </button>
                        </>
                    )}
                    
                    <button
                        onClick={fetchCloudTeams}
                        disabled={isSyncing}
                        className="bg-[#13161c] border border-[#2d323e] hover:border-cyan-500 hover:text-cyan-400 text-gray-400 transition-all px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 ml-2"
                    >
                        <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> Resync
                    </button>
                </div>

                {/* Squad Canvas Grid */}
                {squads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1e222b] rounded-xl text-gray-500 hover:border-[#2d323e] transition-colors">
                        <GripVertical className="w-12 h-12 mb-2 opacity-20" />
                        <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">No Active Squads</h3>
                        <p className="text-sm">Click "Standard Squad" above to initialize a deployment group.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {squads.map(squad => {
                             const totalPwr = squad.members.reduce((sum, m) => sum + (m.power || 0), 0);
                             const totalKp = squad.members.reduce((sum, m) => sum + (m.killPoints || 0), 0);

                             return (
                                 <div 
                                     key={squad.id}
                                     onDragOver={handleDragOver}
                                     onDrop={(e) => handleDrop(e, squad.id)}
                                     className="bg-[#0f1115] border border-[#2d323e] rounded-xl flex flex-col relative overflow-hidden group shadow-lg transition-colors hover:border-purple-500/50 h-[450px]"
                                 >
                                      {/* Squad Card Header */}
                                      <div className="p-4 border-b border-[#1e222b] bg-[#13161c] relative">
                                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-fuchsia-600"></div>
                                          
                                          <div className="flex items-center justify-between mb-3">
                                              <input 
                                                  type="text" 
                                                  value={squad.name}
                                                  disabled={!isLeader}
                                                  onChange={(e) => renameSquad(squad.id, e.target.value)}
                                                  className="bg-transparent border-b border-transparent focus:border-purple-500/50 text-white font-black uppercase tracking-widest text-lg outline-none w-2/3 transition-colors disabled:opacity-80 disabled:cursor-not-allowed"
                                              />
                                              <div className="flex items-center gap-1">
                                                   <button 
                                                       onClick={() => sendToMail(squad)}
                                                       title="Dispatch to Command Mail Center"
                                                       className="p-1.5 rounded-md text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                                   >
                                                       <Mail size={16} />
                                                   </button>
                                                   {isLeader && (
                                                       <button 
                                                           onClick={() => deleteSquad(squad.id)}
                                                           title="Disband Squad"
                                                           className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                       >
                                                           <Trash2 size={16} />
                                                       </button>
                                                   )}
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
                                              <div className="bg-[#0a0c0f] border border-[#1e222b] rounded p-2 text-center">
                                                  <span className="block text-[8px] uppercase tracking-widest text-gray-500 mb-0.5">Capacity 👥</span>
                                                  <span className={`font-mono font-bold text-xs ${squad.members.length >= 30 ? 'text-red-400' : 'text-cyan-400'}`}>
                                                      {squad.members.length}/30
                                                  </span>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Assigned Members Area */}
                                      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/5 via-[#0f1115] to-[#0f1115]">
                                           {squad.members.length === 0 ? (
                                               <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
                                                   <span className="text-3xl mb-2">📥</span>
                                                   <p className="text-xs font-bold uppercase tracking-widest text-white">Awaiting Deployment</p>
                                                   <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Drag Governors Here</p>
                                               </div>
                                           ) : (
                                               squad.members.map(m => (
                                                   <div 
                                                       key={`sq-${squad.id}-m-${m.id}`}
                                                       draggable={isLeader ? "true" : "false"}
                                                       onDragStart={(e) => handleDragStart(e, m, squad.id)}
                                                       onDragEnd={handleDragEnd}
                                                       className={`bg-[#1e222b]/50 border border-[#2d323e] rounded-lg p-2 transition-colors relative group flex flex-col ${isLeader ? 'hover:border-purple-500/50 cursor-grab active:cursor-grabbing' : 'opacity-90 cursor-default'}`}
                                                   >
                                                        {isLeader && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); removeMember(squad.id, m.id); }}
                                                                className="absolute right-2 top-2 p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                                title="Remove From Squad"
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
    );
}
