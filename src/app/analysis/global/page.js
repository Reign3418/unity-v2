"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  Globe2, RefreshCw, BarChart, ShieldAlert, Zap, Plus, X, Users, Save, List, Trash2
} from "lucide-react";
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function GlobalAnalysis() {
  const { data: session } = useSession();
  
  // Base Data from AWS
  const [globalStats, setGlobalStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tab Routing
  const [activeTab, setActiveTab] = useState('CAMP_BUILDER'); // 'CAMP_BUILDER' | 'DELTA'

  // Top N Filtering
  const [topNFilter, setTopNFilter] = useState('All');
  
  // Camp Builder State
  const [activeEntities, setActiveEntities] = useState([]); // Mixed array of 'KD 3155' and { id: 'c-1', name: 'Camp A', kds: ['KD 3155'] }
  const [newDomainInput, setNewDomainInput] = useState('');
  
  // Multi-select for Grouping
  const [stagedForCamp, setStagedForCamp] = useState([]);
  const [campNameInput, setCampNameInput] = useState('');
  
  // Cloud Saving
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delta Engine State
  const [startScan, setStartScan] = useState('');
  const [endScan, setEndScan] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  
  // Target Scope Routing (Delta)
  const [targetKds, setTargetKds] = useState([]);
  const [deltaTargetInput, setDeltaTargetInput] = useState('');

  const fetchGlobalStats = async () => {
    setIsLoading(true);
    try {
      let queryUrl = `/api/aws/global`;
      if (activeTab === 'DELTA') {
          queryUrl += `?mode=history`;
          if (targetKds.length > 0) queryUrl += `&kds=${targetKds.join(',')}`;
      }
      
      const res = await fetch(queryUrl);
      const data = await res.json();
      
      if (res.ok && data.globalStats) {
          setGlobalStats(data.globalStats);
          
          if (activeTab === 'DELTA') {
              // Extract unique string dates for dropdowns
              const dates = new Set();
              data.globalStats.forEach(kd => {
                 if (kd.history) {
                     kd.history.forEach(t => {
                         if (t.scanDate) {
                             dates.add(t.scanDate.split('T')[0]);
                         }
                     });
                 }
              });
              const sortedDates = Array.from(dates).sort((a,b) => new Date(a) - new Date(b));
              setAvailableDates(sortedDates);
              
              if (sortedDates.length > 0) {
                  let storedStart = null;
                  let storedEnd = null;
                  if (typeof window !== 'undefined') {
                      storedStart = localStorage.getItem('unty_global_startScan');
                      storedEnd = localStorage.getItem('unty_global_endScan');
                  }

                  if (storedStart && sortedDates.includes(storedStart)) {
                      setStartScan(storedStart);
                  } else if (!startScan || !sortedDates.includes(startScan)) {
                      setStartScan(sortedDates[0]); // Earliest available
                  }
                  
                  if (storedEnd && sortedDates.includes(storedEnd)) {
                      setEndScan(storedEnd);
                  } else if (!endScan || !sortedDates.includes(endScan)) {
                      setEndScan(sortedDates[sortedDates.length - 1]); // Most recent
                  }
              }
          } else {
              // Camp Builder Logic
              let savedActive = null;
              if (typeof window !== 'undefined') {
                  const str = localStorage.getItem('unty_global_entities');
                  if (str) try { savedActive = JSON.parse(str); } catch(e) {}
              }

              if (savedActive && Array.isArray(savedActive) && savedActive.length > 0) {
                  setActiveEntities(savedActive);
              } else {
                  const allKds = data.globalStats.map(s => s.kingdom);
                  setActiveEntities(allKds.length > 10 ? allKds.slice(0, 5) : allKds);
              }
          }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserCamps = async () => {
      try {
          const res = await fetch('/api/aws/user/camps');
          if (res.ok) {
              const data = await res.json();
              if (data.camps && Array.isArray(data.camps)) {
                  setSavedLayouts(data.camps);
              }
          }
      } catch (e) {
          console.error("Failed to load user camps", e);
      }
  };

  useEffect(() => {
    fetchGlobalStats();
    fetchUserCamps();
  }, [activeTab, targetKds]);

  // Initial State Hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sTab = localStorage.getItem('unty_global_tab');
      if (sTab) setActiveTab(sTab);
      
      const sTopN = localStorage.getItem('unty_global_topN');
      if (sTopN) setTopNFilter(sTopN);
      
      const sTargetKds = localStorage.getItem('unty_global_targetKds');
      if (sTargetKds) {
          try {
              const parsed = JSON.parse(sTargetKds);
              if (Array.isArray(parsed)) setTargetKds(parsed);
          } catch(e) {}
      }
    }
  }, []);

  // Sync Listeners
  useEffect(() => {
      if (typeof window !== 'undefined') localStorage.setItem('unty_global_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
      if (typeof window !== 'undefined') localStorage.setItem('unty_global_topN', topNFilter);
  }, [topNFilter]);

  useEffect(() => {
      if (typeof window !== 'undefined') localStorage.setItem('unty_global_targetKds', JSON.stringify(targetKds));
  }, [targetKds]);

  useEffect(() => {
      if (typeof window !== 'undefined' && startScan) localStorage.setItem('unty_global_startScan', startScan);
  }, [startScan]);

  useEffect(() => {
      if (typeof window !== 'undefined' && endScan) localStorage.setItem('unty_global_endScan', endScan);
  }, [endScan]);

  useEffect(() => {
      if (activeEntities && activeEntities.length > 0 && typeof window !== 'undefined') {
          localStorage.setItem('unty_global_entities', JSON.stringify(activeEntities));
      }
  }, [activeEntities]);

  const saveLayoutToCloud = async () => {
      setIsSaving(true);
      try {
          const newLayout = {
              id: `layout-${Date.now()}`,
              name: `Custom View (${new Date().toLocaleDateString()})`,
              entities: activeEntities
          };
          
          const updatedLayouts = [...savedLayouts, newLayout];
          
          const res = await fetch('/api/aws/user/camps', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ camps: updatedLayouts })
          });
          
          if (res.ok) {
              setSavedLayouts(updatedLayouts);
          }
      } catch (e) {
          console.error("Save failed", e);
      } finally {
          setIsSaving(false);
      }
  };

  const loadLayout = (layout) => {
      setActiveEntities(layout.entities);
  };
  
  const deleteLayout = async (layoutId) => {
      const updatedLayouts = savedLayouts.filter(l => l.id !== layoutId);
      setSavedLayouts(updatedLayouts);
      await fetch('/api/aws/user/camps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ camps: updatedLayouts })
      });
  };

  const handleAddDomain = (e) => {
      e.preventDefault();
      if (!newDomainInput.trim()) return;
      
      let kdName = newDomainInput.trim().toUpperCase();
      if (!kdName.startsWith("KD ")) {
          kdName = `KD ${kdName}`;
      }
      
      // Verify it exists in globalStats
      if (!globalStats.find(g => g.kingdom === kdName)) {
          alert(`Error: ${kdName} is not tracked in the Unity Database.`);
          return;
      }
      
      if (activeEntities.length >= 16) {
          alert("Maximum 16 comparison entities allowed at once.");
          return;
      }
      
      if (!activeEntities.includes(kdName)) {
          setActiveEntities([...activeEntities, kdName]);
      }
      setNewDomainInput('');
  };

  const handleAddDeltaTarget = (e) => {
      e.preventDefault();
      if (!deltaTargetInput.trim()) return;
      
      let kdName = deltaTargetInput.trim().toUpperCase().replace('KD ', '');
      
      if (!targetKds.includes(kdName)) {
          setTargetKds([...targetKds, kdName]);
      }
      setDeltaTargetInput('');
  };
  
  const removeDeltaTarget = (kd) => {
      setTargetKds(targetKds.filter(k => k !== kd));
  };

  const removeEntity = (entity) => {
      setActiveEntities(activeEntities.filter(e => e !== entity));
      setStagedForCamp(stagedForCamp.filter(e => e !== entity));
  };
  
  const toggleStaged = (entity) => {
      if (stagedForCamp.includes(entity)) {
          setStagedForCamp(stagedForCamp.filter(e => e !== entity));
      } else {
          setStagedForCamp([...stagedForCamp, entity]);
      }
  };

  const createCamp = () => {
      if (stagedForCamp.length < 2) return;
      
      const newCamp = {
          type: 'camp',
          id: `c-${Date.now()}`,
          name: campNameInput.trim() || `Camp ${stagedForCamp.length}`,
          kds: []
      };
      
      // Flatten any nested camps if user creates a camp out of camps
      stagedForCamp.forEach(entity => {
          if (typeof entity === 'string') {
              newCamp.kds.push(entity);
          } else if (entity.type === 'camp') {
              newCamp.kds.push(...entity.kds);
          }
      });
      
      // Remove the exact staged items from activeEntities and insert the new Camp
      const filteredEntities = activeEntities.filter(e => !stagedForCamp.includes(e));
      setActiveEntities([...filteredEntities, newCamp]);
      
      setStagedForCamp([]);
      setCampNameInput('');
  };

  // --- AGGREGATION ENGINE ---
  const formatMagnitude = (value) => {
      if (value == null || isNaN(value)) return "0";
      if (value >= 1000000000) return (value / 1000000000).toFixed(2) + 'B';
      if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
      if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
      return value.toString();
  };

  const extractStats = (kdName) => {
      const kd = globalStats.find(g => g.kingdom === kdName);
      if (!kd) return { power: 0, kp: 0, elements: 0 };
      
      if (topNFilter === 'All') {
          return { power: kd.basePower || 0, kp: kd.baseKP || 0, elements: kd.baseActive || 0 };
      } else {
          // Pre-calculated Top N slicer format
          if (kd.topSlices && kd.topSlices[topNFilter]) {
              return { 
                  power: kd.topSlices[topNFilter].power || 0, 
                  kp: kd.topSlices[topNFilter].kp || 0, 
                  elements: kd.topSlices[topNFilter].elements || parseInt(topNFilter) || 0
              };
          } else {
              // Legacy scans before Top Slices update default to 0 to prevent crashes
              return { power: 0, kp: 0, elements: 0 };
          }
      }
  };

  // Build the live Chart Data by aggregating active entities
  const chartData = activeEntities.map(entity => {
      if (typeof entity === 'string') {
          // Individual Kingdom
          const stats = extractStats(entity);
          return {
              name: entity,
              totalPower: stats.power,
              totalKP: stats.kp,
              activeGovernors: stats.elements,
              displayPower: formatMagnitude(stats.power)
          };
      } else if (entity.type === 'camp') {
          // Aggregated Camp
          let sumPower = 0;
          let sumKP = 0;
          let sumElements = 0;
          
          entity.kds.forEach(kd => {
              const stats = extractStats(kd);
              sumPower += stats.power;
              sumKP += stats.kp;
              sumElements += stats.elements;
          });
          
          return {
              name: entity.name,
              totalPower: sumPower,
              totalKP: sumKP,
              activeGovernors: sumElements,
              displayPower: formatMagnitude(sumPower),
              isCamp: true,
              kds: entity.kds.join(', ')
          };
      }
      return null;
  }).filter(Boolean);

  const formatYAxis = (tickItem) => {
      return formatMagnitude(tickItem);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1115] border border-[#1e222b] p-4 rounded-lg shadow-xl outline-none">
          <p className="text-white font-bold uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1">
             {payload.map((p, idx) => (
                 <p key={idx} style={{ color: p.fill }} className="font-mono font-bold flex justify-between gap-6">
                     <span>{p.name}:</span>
                     <span>
                         {formatMagnitude(p.value)}
                     </span>
                 </p>
             ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // --- DELTA ENGINE PROCESSING ---
  const processedDeltaData = useMemo(() => {
      if (activeTab !== 'DELTA' || !globalStats || !startScan || !endScan) return [];
      
      const results = [];
      const targetStart = new Date(startScan);
      const targetEnd = new Date(endScan);

      globalStats.forEach(kdData => {
          if (!kdData.history || kdData.history.length === 0) return;
          
          let startNode = null;
          let endNode = null;

          let closestStartDiff = Infinity;
          let closestEndDiff = Infinity;

          kdData.history.forEach(t => {
              if (!t.scanDate) return;
              const dateStr = t.scanDate.split('T')[0];
              const tDate = new Date(dateStr);
              
              const startDiff = Math.abs(tDate - targetStart);
              if (startDiff < closestStartDiff) {
                  closestStartDiff = startDiff;
                  startNode = t;
              }

              const endDiff = Math.abs(tDate - targetEnd);
              if (endDiff < closestEndDiff) {
                  closestEndDiff = endDiff;
                  endNode = t;
              }
          });

          if (!startNode || !endNode) return;

          let sPower = 0, sKp = 0, sDead = 0;
          let ePower = 0, eKp = 0, eDead = 0;

          if (topNFilter === 'All') {
              sPower = startNode.summary?.totalPower || 0;
              sKp = startNode.summary?.totalKP || 0;
              sDead = startNode.summary?.totalDeads || startNode.summary?.deadTroops || startNode.summary?.totalDead || 0;
              
              ePower = endNode.summary?.totalPower || 0;
              eKp = endNode.summary?.totalKP || 0;
              eDead = endNode.summary?.totalDeads || endNode.summary?.deadTroops || endNode.summary?.totalDead || 0;
          } else {
              sPower = startNode.summary?.topSlices?.[topNFilter]?.power || 0;
              sKp = startNode.summary?.topSlices?.[topNFilter]?.kp || 0;
              sDead = startNode.summary?.topSlices?.[topNFilter]?.deads || startNode.summary?.topSlices?.[topNFilter]?.deadTroops || startNode.summary?.topSlices?.[topNFilter]?.dead || 0;
              
              ePower = endNode.summary?.topSlices?.[topNFilter]?.power || 0;
              eKp = endNode.summary?.topSlices?.[topNFilter]?.kp || 0;
              eDead = endNode.summary?.topSlices?.[topNFilter]?.deads || endNode.summary?.topSlices?.[topNFilter]?.deadTroops || endNode.summary?.topSlices?.[topNFilter]?.dead || 0;
          }

          results.push({
              kingdom: kdData.kingdom.replace('KD ', ''),
              startPower: sPower,
              endPower: ePower,
              powerDelta: ePower - sPower,
              kpGained: eKp - sKp,
              deadsGained: eDead - sDead
          });
      });

      return results.sort((a,b) => b.powerDelta - a.powerDelta);
  }, [globalStats, startScan, endScan, topNFilter, activeTab]);

  const [deltaSort, setDeltaSort] = useState({ key: 'powerDelta', direction: 'desc' });
  const handleDeltaSort = (key) => {
      let direction = 'desc';
      if (deltaSort.key === key && deltaSort.direction === 'desc') direction = 'asc';
      setDeltaSort({ key, direction });
  };
  const sortedDeltaData = useMemo(() => {
      return [...processedDeltaData].sort((a, b) => {
          let aVal = a[deltaSort.key];
          let bVal = b[deltaSort.key];
          return deltaSort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
  }, [processedDeltaData, deltaSort]);

  const formatDeltaNum = (num) => num ? Number(num).toLocaleString() : "0";

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                 <Globe2 className="text-indigo-500" size={32} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-widest uppercase">Global Analysis</h1>
                 <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Cross-Server Macro Diagnostics</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3 self-start md:self-auto z-10">
                <select 
                    value={topNFilter}
                    onChange={(e) => setTopNFilter(e.target.value)}
                    className="bg-[#13161c] border border-[#1e222b] text-white text-sm font-bold uppercase tracking-wider rounded-lg p-2.5 outline-none focus:border-indigo-500"
                >
                    <option value="All">All Governors</option>
                    <option value="1000">Top 1000</option>
                    <option value="650">Top 650</option>
                    <option value="400">Top 400</option>
                    <option value="300">Top 300</option>
                    <option value="100">Top 100</option>
                </select>
                
                <button 
                    onClick={fetchGlobalStats}
                    disabled={isLoading}
                    title="Refresh Data"
                    className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg"
                >
                    <RefreshCw size={20} className={isLoading ? "animate-spin text-indigo-500" : ""} />
                </button>
            </div>
         </div>
      </div>

      {/* Horizontal Sub-Navigation Tab Array */}
      <div className="w-full overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
        <div className="flex items-center gap-3 min-w-max px-2">
           <button
             onClick={() => setActiveTab('CAMP_BUILDER')}
             className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
               activeTab === 'CAMP_BUILDER' 
                 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-[inset_4px_0_0_0_rgba(99,102,241,1)] shadow-lg' 
                 : 'bg-[#13161c] text-gray-500 border border-[#1e222b] hover:bg-[#1e222b] hover:text-gray-300'
             }`}
           >
             <Users size={14} /> Camp Builder
           </button>
           
           <button
             onClick={() => setActiveTab('DELTA')}
             className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
               activeTab === 'DELTA' 
                 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-[inset_4px_0_0_0_rgba(99,102,241,1)] shadow-lg' 
                 : 'bg-[#13161c] text-gray-500 border border-[#1e222b] hover:bg-[#1e222b] hover:text-gray-300'
             }`}
           >
             <BarChart size={14} /> Delta Analytics
           </button>
        </div>

      </div>

      {isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-indigo-500 w-8 h-8" />
        </div>
      ) : globalStats.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-indigo-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Global Architecture Verified</h3>
            <p className="text-sm">Cannot formulate models. Ensure the ingestion pipeline operates on multiple servers.</p>
        </div>
      ) : activeTab === 'CAMP_BUILDER' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Control Center */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 lg:col-span-1 space-y-6">
                
                {/* Save/Load Area */}
                <div className="flex items-center justify-between border-b border-[#1e222b] pb-4">
                    <h2 className="text-white font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                        <Save size={16} className="text-indigo-400" />
                        Configurations
                    </h2>
                    
                    <button 
                        onClick={saveLayoutToCloud}
                        disabled={isSaving || activeEntities.length === 0}
                        className="text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save View"}
                    </button>
                </div>
                
                {savedLayouts.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Saved Camps</div>
                        {savedLayouts.map(layout => (
                            <div key={layout.id} className="flex items-center justify-between bg-[#13161c] border border-[#1e222b] p-2 rounded">
                                <button onClick={() => loadLayout(layout)} className="text-sm font-bold text-gray-300 hover:text-white truncate flex-1 text-left">
                                    {layout.name}
                                </button>
                                <button onClick={() => deleteLayout(layout.id)} className="text-red-500/50 hover:text-red-500 p-1">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Camp Staging Area */}
                <div className="pt-2">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3">Active Workspace</div>
                    
                    <form onSubmit={handleAddDomain} className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={newDomainInput}
                            onChange={(e) => setNewDomainInput(e.target.value)}
                            placeholder="Enter KD #"
                            className="w-full bg-[#13161c] border border-[#1e222b] text-white text-sm font-bold uppercase p-2 rounded outline-none focus:border-indigo-500 placeholder-gray-600"
                        />
                        <button type="submit" className="bg-indigo-500/20 text-indigo-400 p-2 rounded hover:bg-indigo-500 hover:text-white transition-colors border border-indigo-500/30">
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {activeEntities.map((entity, idx) => {
                            const isCamp = typeof entity === 'object';
                            const displayName = isCamp ? entity.name : entity;
                            const isStaged = stagedForCamp.includes(entity);
                            
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => toggleStaged(entity)}
                                    className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
                                        isStaged 
                                        ? "bg-indigo-500/20 border-indigo-500" 
                                        : "bg-[#13161c] border-[#1e222b] hover:border-gray-600"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {isCamp ? <Users size={14} className="text-cyan-400 shrink-0" /> : <Globe2 size={14} className="text-indigo-400 shrink-0" />}
                                        <span className={`text-xs font-bold truncate ${isCamp ? "text-cyan-300" : "text-gray-300"}`}>
                                            {displayName}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeEntity(entity); }}
                                        className="text-gray-600 hover:text-red-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grouping Actions */}
                    {stagedForCamp.length > 1 && (
                        <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded flex flex-col gap-2 animate-fade-in">
                            <input 
                                type="text"
                                value={campNameInput}
                                onChange={(e) => setCampNameInput(e.target.value)}
                                placeholder="Camp Name (Optional)"
                                className="w-full bg-[#0f1115] border border-[#1e222b] text-white text-xs p-1.5 rounded outline-none"
                            />
                            <button 
                                onClick={createCamp}
                                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs uppercase tracking-wider py-1.5 rounded transition-colors"
                            >
                                Group {stagedForCamp.length} Entities
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Power Comparison Bar Chart */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 relative overflow-hidden lg:col-span-2 flex flex-col">
                <div className="flex items-center gap-2 mb-6 shrink-0">
                    <BarChart size={18} className="text-indigo-500" />
                    <h2 className="text-white font-bold uppercase tracking-widest text-sm">Hegemonic Vectors ({topNFilter === 'All' ? 'Full Scope' : `Top ${topNFilter}`})</h2>
                </div>
                
                {chartData.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-600 uppercase tracking-widest text-xs font-bold border border-dashed border-[#1e222b] rounded-lg">
                        Workspace Empty. Add Domains to Compare.
                    </div>
                ) : (
                    <div className="w-full flex-1" style={{ minHeight: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e222b" vertical={false} />
                                <XAxis dataKey="name" stroke="#475569" fontSize={12} fontStyle="bold" tickMargin={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#475569" fontSize={10} tickFormatter={formatYAxis} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#13161c'}} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Bar dataKey="totalPower" name="Raw Core Power" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                                <Bar dataKey="totalKP" name="Lethality Metrics (KP)" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={40} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Micro Stats List for Top Kingdoms */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {chartData.map((dataObj, idx) => (
                   <div key={idx} className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
                       
                       <div className="flex justify-between items-start mb-4 relative z-10 gap-2">
                           <div className="flex flex-col">
                               <div className={`text-2xl font-black tracking-widest uppercase truncate ${dataObj.isCamp ? "text-cyan-400" : "text-white"}`}>{dataObj.name}</div>
                               {dataObj.isCamp && (
                                   <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate max-w-[200px] mt-1">
                                       {dataObj.kds}
                                   </div>
                               )}
                           </div>
                           <div className="bg-[#13161c] px-3 py-1 border border-[#1e222b] text-indigo-400 font-bold text-[10px] uppercase tracking-wider rounded shrink-0">
                               {dataObj.isCamp ? 'Camp Coalition' : 'Verified Node'}
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 relative z-10">
                           <div>
                               <div className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                   <Zap size={10}/> Power Output
                               </div>
                               <div className="text-white font-mono font-bold text-lg">{dataObj.displayPower}</div>
                           </div>
                           <div>
                               <div className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                   <Users size={10}/> Entities Scanned
                               </div>
                               <div className="text-white font-mono font-bold text-lg">{dataObj.activeGovernors.toLocaleString()}</div>
                           </div>
                           <div className="col-span-2 bg-[#13161c] p-3 rounded-lg border border-[#1e222b] mt-2">
                               <div className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                                  <span>Efficiency Ratio</span>
                                  {topNFilter !== 'All' && <span className="text-indigo-400">Top {topNFilter} Baseline</span>}
                               </div>
                               <div className="flex items-center justify-between mt-1">
                                  <div className="text-cyan-400 font-mono font-bold capitalize">
                                      {dataObj.totalPower > 0 ? ((dataObj.totalKP / dataObj.totalPower) * 100).toFixed(2) : 0}% Lethality
                                  </div>
                                  <div className="w-2/3 bg-[#0a0c0f] rounded-full h-1.5 overflow-hidden ml-4">
                                     <div className="bg-cyan-500 h-full" style={{ width: `${Math.min(((dataObj.totalPower > 0 ? dataObj.totalKP / dataObj.totalPower : 0) * 100), 100)}%` }}></div>
                                  </div>
                               </div>
                           </div>
                       </div>
                   </div>
               ))}
            </div>

        </div>
      ) : (
        /* DELTA ANALYSIS TAB */
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl mt-6">
            <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex flex-col items-start gap-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                    <div className="flex flex-col">
                        <h2 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                           <BarChart size={18} className="text-indigo-500" />
                           All Kingdom Analysis
                        </h2>
                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">
                           Comprehensive Power & KP Deltas Across Selected Scans
                        </p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#13161c] border border-[#1e222b] rounded px-3 py-1.5">
                            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Start Scan:</span>
                            <select 
                                value={startScan}
                                onChange={(e) => setStartScan(e.target.value)}
                                className="bg-transparent text-indigo-400 font-mono text-xs font-bold outline-none cursor-pointer"
                            >
                                {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-[#13161c] border border-[#1e222b] rounded px-3 py-1.5">
                            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">End Scan:</span>
                            <select 
                                value={endScan}
                                onChange={(e) => setEndScan(e.target.value)}
                                className="bg-transparent text-indigo-400 font-mono text-xs font-bold outline-none cursor-pointer"
                            >
                                {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                
                {/* Target Scope Delta Filter */}
                <div className="w-full pt-4 border-t border-[#1e222b]">
                    <div className="flex flex-wrap items-center gap-3">
                        <form onSubmit={handleAddDeltaTarget} className="flex gap-2">
                            <input 
                                type="text"
                                value={deltaTargetInput}
                                onChange={(e) => setDeltaTargetInput(e.target.value)}
                                placeholder="Filter KD # (Optional)"
                                className="w-48 bg-[#13161c] border border-[#1e222b] text-white text-xs font-bold uppercase px-3 py-2 rounded outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
                            />
                            <button type="submit" className="bg-[#13161c] hover:bg-indigo-500 hover:text-white text-indigo-400 border border-[#1e222b] hover:border-indigo-500 px-3 py-2 rounded transition-colors font-bold flex items-center gap-1 shadow-lg">
                                <Plus size={14} /> Add
                            </button>
                        </form>

                        <div className="flex flex-wrap gap-2">
                            {targetKds.length === 0 ? (
                                <div className="text-gray-600 text-[10px] font-bold uppercase tracking-widest px-2 py-2 flex items-center gap-2">
                                    <Globe2 size={12} className="opacity-50" />
                                    No Active Scope Filter (Showing Full Array)
                                </div>
                            ) : (
                                targetKds.map(kd => (
                                    <div key={kd} className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-bold font-mono shadow-inner animate-zoom-in">
                                        KD {kd}
                                        <button onClick={() => removeDeltaTarget(kd)} className="hover:text-red-400 transition-colors p-0.5">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                    <thead className="bg-[#13161c] select-none">
                        <tr>
                            <th onClick={() => handleDeltaSort('kingdom')} className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors w-1/4">
                                Kingdom {deltaSort.key === 'kingdom' && (deltaSort.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleDeltaSort('startPower')} className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors">
                                Total Start Power {deltaSort.key === 'startPower' && (deltaSort.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleDeltaSort('endPower')} className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors">
                                Total End Power {deltaSort.key === 'endPower' && (deltaSort.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleDeltaSort('powerDelta')} className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors">
                                Power Δ {deltaSort.key === 'powerDelta' && (deltaSort.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleDeltaSort('kpGained')} className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors">
                                KP Gained {deltaSort.key === 'kpGained' && (deltaSort.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleDeltaSort('deadsGained')} className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-400 border-b border-[#1e222b] cursor-pointer hover:bg-white/5 transition-colors">
                                Dead Troops {deltaSort.key === 'deadsGained' && (deltaSort.direction === 'asc' ? '↑' : '↓')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222b]">
                        {sortedDeltaData.map((row, idx) => (
                            <tr key={row.kingdom} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-left">
                                    <div className="font-bold text-indigo-400 tracking-widest">Kingdom {row.kingdom}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-gray-400 font-mono tracking-wider">{formatDeltaNum(row.startPower)}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-gray-400 font-mono tracking-wider">{formatDeltaNum(row.endPower)}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {row.powerDelta > 0 ? (
                                        <div className="font-bold text-green-500 font-mono tracking-wider">+{formatDeltaNum(row.powerDelta)}</div>
                                    ) : row.powerDelta < 0 ? (
                                        <div className="font-bold text-rose-500 font-mono tracking-wider">{formatDeltaNum(row.powerDelta)}</div>
                                    ) : (
                                        <div className="font-bold text-gray-500 font-mono tracking-wider">0</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {row.kpGained > 0 ? (
                                        <div className="font-bold text-indigo-400 font-mono tracking-wider">+{formatDeltaNum(row.kpGained)}</div>
                                    ) : (
                                        <div className="font-bold text-gray-500 font-mono tracking-wider">0</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {row.deadsGained > 0 ? (
                                        <div className="font-bold text-amber-500 font-mono tracking-wider">+{formatDeltaNum(row.deadsGained)}</div>
                                    ) : (
                                        <div className="font-bold text-gray-500 font-mono tracking-wider">0</div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {sortedDeltaData.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                    Insufficient Scans to calculate Temporal Deltas
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}
