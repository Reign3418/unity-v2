"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Search, Download, RefreshCw, AlertTriangle, ShieldAlert, Zap, UserMinus, UserPlus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function ActivityTracker() {
  const { data: session } = useSession();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const [targetKd, setTargetKd] = useState("3155");
  const [trends, setTrends] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [results, setResults] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'rawPower', direction: 'desc' });

  const extractDate = (dateStr) => {
      if (!dateStr) return "";
      return dateStr.split('T')[0].split(' ')[0].split('_')[0];
  };

  useEffect(() => {
    let activeKd = targetKd;
    if (typeof window !== 'undefined') {
        const storedKd = localStorage.getItem('unty_active_kd');
        if (storedKd) {
            activeKd = storedKd;
            setTargetKd(storedKd);
        } else if (session?.user?.tenant?.kingdomId) {
            activeKd = session.user.tenant.kingdomId;
            setTargetKd(activeKd);
        }
    }
  }, [session]);

  // Load Cached Results on Mount
  useEffect(() => {
     try {
         const cacheStr = localStorage.getItem('unity_tracker_cache');
         if (cacheStr) {
             const cache = JSON.parse(cacheStr);
             if (cache && cache.kd === targetKd && cache.results && cache.results.length > 0) {
                 setResults(cache.results);
                 setHasResults(true);
             }
         }
     } catch (e) {
         console.warn("Failed to load tracker cache", e);
     }
  }, [targetKd]);

  // Fetch Trends dynamically when KD changes to populate the Date picker dropdowns
  useEffect(() => {
     if (!targetKd) return;

     // Clear visual results immediately if KD doesn't match the cache
     try {
         const cacheStr = localStorage.getItem('unity_tracker_cache');
         if (cacheStr) {
             const cache = JSON.parse(cacheStr);
             if (cache.kd !== targetKd) {
                 setResults([]);
                 setHasResults(false);
             }
         }
     } catch (e) {}

     fetch(`/api/aws/trends?kd=${targetKd}`)
       .then(res => res.json())
       .then(data => {
           if (data.trends && data.trends.length > 0) {
               setTrends(data.trends);
               const reversed = [...data.trends].reverse();
               
               // Restore dates from cache if valid for this KD, otherwise use latest defaults
               try {
                   const cacheStr = localStorage.getItem('unity_tracker_cache');
                   if (cacheStr) {
                       const cache = JSON.parse(cacheStr);
                       if (cache.kd === targetKd && cache.start && cache.end) {
                           setStartDate(cache.start);
                           setEndDate(cache.end);
                           return; // Skip default assignment
                       }
                   }
               } catch(e) {}

               setStartDate(extractDate(reversed[1]?.scanDate || reversed[0].scanDate));
               setEndDate(extractDate(reversed[0].scanDate));
           } else {
               setTrends([]);
           }
       }).catch(console.error);
  }, [targetKd]);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = useMemo(() => {
    let sortable = [...results];
    if (sortConfig.key !== null) {
      sortable.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [results, sortConfig]);

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-400" /> : <ArrowDown size={12} className="text-indigo-400" />;
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setHasResults(false);
    
    try {
      const res = await fetch(`/api/aws/tracker?kd=${targetKd}&start=${startDate}&end=${endDate}`);
      const data = await res.json();
      
      if (data.roster) {
        const mapped = data.roster.map(gov => {
          let reason = gov.reason || "Active";
          let note = gov.note || "Normal Growth";

          // Legacy mapping overrides if API sends reason keys natively
          if (gov.type === 'NEW') {
            reason = "New";
            note = gov.note || "Newly detected arrival";
          } else if (gov.type === 'MISSING') {
            reason = "Missing";
            note = gov.note || "Not found in Latest Scan";
          } else if (gov.type === 'MIGRATED_OUT') {
            reason = "Migrated Out";
            note = gov.note;
          }

          const formatNum = (num) => typeof num === 'number' ? Number(num).toLocaleString() : "0";
          const formatShort = (num) => typeof num === 'number' ? (Number(num) / 1000000).toFixed(1) + 'M' : "0";

          let troopDeltaDisplay = gov.troopDelta;
          if (typeof gov.troopDelta === 'number') {
              troopDeltaDisplay = gov.troopDelta > 0 ? `+${formatNum(gov.troopDelta)}` : formatNum(gov.troopDelta);
          } else if (gov.powerDelta === 'NEW' || gov.powerDelta === 'MISSING') {
              troopDeltaDisplay = gov.powerDelta;
          }

          let latestPowerDisplay = formatNum(gov.latestPower || gov.powerRaw);
          if (reason === "Migrated Out" || reason === "Missing") {
              latestPowerDisplay = `${formatNum(gov.latestPower)} (Left)`;
          }

          return {
            id: gov.id,
            name: gov.name || "Unknown",
            reason,
            note,
            latestPower: latestPowerDisplay,
            rawPower: gov.latestPower || gov.powerRaw || 0,
            troopDelta: troopDeltaDisplay,
            rawDelta: typeof gov.powerDelta === 'number' ? gov.powerDelta : (gov.powerDelta === 'NEW' ? Infinity : -Infinity),
            troopBase: formatShort(gov.troopBase),
            troopLatest: formatShort(gov.troopLatest),
            cmdBase: formatShort(gov.cmdBase),
            cmdLatest: formatShort(gov.cmdLatest),
            rawCmdLatest: gov.cmdLatest || 0,
            gatheredDelta: gov.gatheredDelta > 0 ? `+${formatShort(gov.gatheredDelta)}` : formatShort(gov.gatheredDelta),
            kpDelta: gov.kpDelta > 0 ? `+${formatNum(gov.kpDelta)}` : formatNum(gov.kpDelta)
        };
        }).filter(gov => gov.reason !== "Active"); 
        
        setResults(mapped);
        setHasResults(true);

        // Cache the heavy computation locally to persist across page navigations
        try {
            localStorage.setItem('unity_tracker_cache', JSON.stringify({
                kd: targetKd,
                start: startDate,
                end: endDate,
                results: mapped
            }));
        } catch (e) {
            console.warn("Failed to save tracker cache block size", e);
        }

      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const StatusBadge = ({ reason }) => {
    switch (reason) {
      case "Low Activity":
        return <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><AlertTriangle size={12}/> Low Activity</span>;
      case "Asleep":
      case "Zero Growth":
        return <span className="flex items-center gap-1 text-gray-400 bg-gray-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><ShieldAlert size={12}/> Asleep</span>;
      case "Missing":
        return <span className="flex items-center gap-1 text-rose-500 bg-rose-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><UserMinus size={12}/> Missing / Zero</span>;
      case "Migrated Out":
      case "Migrated":
        return <span className="flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><UserMinus size={12}/> Migrated Out</span>;
      case "New":
      case "New Arrival":
        return <span className="flex items-center gap-1 text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><UserPlus size={12}/> Migrated In</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <Zap className="text-indigo-500" />
          Activity & Migration Engine
        </h1>
        <p className="text-gray-400 text-sm max-w-3xl mb-8">
          The engine analyzes millions of historical rows spanning weeks of AWS Scans to automatically isolate governors who have ceased growth, abandoned the kingdom, or newly migrated in.
        </p>

        {/* Control Desk */}
        <div className="flex flex-col sm:flex-row items-end gap-4 bg-[#13161c] p-4 rounded-xl border border-[#1e222b]">
          <div className="w-full sm:w-auto">
            <label className="block text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-2">Target Kingdom</label>
            <select 
               value={targetKd}
               onChange={(e) => setTargetKd(e.target.value)}
               className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg appearance-none font-bold focus:border-indigo-500 transition-colors cursor-pointer outline-none">
              {session?.user?.tenant?.allowedKingdoms?.map(kd => (
                 <option key={kd} value={kd}>Kingdom {kd}</option>
              ))}
              {!session?.user?.tenant?.allowedKingdoms?.includes(targetKd) && targetKd && (
                 <option value={targetKd}>Kingdom {targetKd}</option>
              )}
            </select>
          </div>

          <div className="flex-1 w-full flex items-center gap-2">
            <div className="flex-1">
                <label className="block text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-2">Baseline Start Date</label>
                <select 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg appearance-none font-bold focus:border-indigo-500 transition-colors cursor-pointer outline-none uppercase tracking-wider"
                >
                    <option value="">Start Scan</option>
                    {[...trends].reverse().map(t => {
                        const d = extractDate(t.scanDate);
                        return <option key={`start-${d}`} value={d} className="bg-[#0f1115] text-white py-2">{d}</option>
                    })}
                </select>
            </div>
            <span className="text-gray-600 px-2 font-black mt-6">-</span>
            <div className="flex-1">
                <label className="block text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-2">Final End Date</label>
                <select 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg appearance-none font-bold focus:border-indigo-500 transition-colors cursor-pointer outline-none uppercase tracking-wider"
                >
                    <option value="">End Scan</option>
                    {[...trends].reverse().map(t => {
                        const d = extractDate(t.scanDate);
                        return <option key={`end-${d}`} value={d} className="bg-[#0f1115] text-white py-2">{d}</option>
                    })}
                </select>
            </div>
          </div>
          
          <button 
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              isAnalyzing 
                ? 'bg-indigo-500/50 text-white/50 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]'
            }`}
          >
            {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
            {isAnalyzing ? 'Crunching AWS Data...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* Results Table View */}
      {hasResults && (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#13161c] border-b border-[#1e222b]">
                  <th onClick={() => handleSort('name')} className="cursor-pointer hover:text-white transition-colors py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold select-none whitespace-nowrap">
                    <div className="flex items-center gap-2">Governor {renderSortIcon('name')}</div>
                  </th>
                  <th onClick={() => handleSort('reason')} className="cursor-pointer hover:text-white transition-colors py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold select-none whitespace-nowrap">
                    <div className="flex items-center gap-2">Classification {renderSortIcon('reason')}</div>
                  </th>
                  <th onClick={() => handleSort('rawPower')} className="cursor-pointer hover:text-white transition-colors py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold select-none whitespace-nowrap">
                    <div className="flex items-center gap-2">Latest Power {renderSortIcon('rawPower')}</div>
                  </th>
                  <th onClick={() => handleSort('rawDelta')} className="cursor-pointer hover:text-white transition-colors py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold select-none whitespace-nowrap">
                    <div className="flex items-center gap-2">Power \ Troop Δ {renderSortIcon('rawDelta')}</div>
                  </th>
                  <th onClick={() => handleSort('rawCmdLatest')} className="cursor-pointer hover:text-white transition-colors py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold select-none whitespace-nowrap">
                    <div className="flex items-center gap-2">KP \ Gathered Δ {renderSortIcon('rawCmdLatest')}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]">
                {sortedResults.map((gov) => (
                  <tr key={gov.id} className="hover:bg-[#13161c]/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-sm">{gov.name}</div>
                      <div className="font-mono text-gray-500 text-[10px]">#{gov.id}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="mb-1"><StatusBadge reason={gov.reason} /></div>
                      <div className="text-gray-500 text-[10px] font-mono whitespace-nowrap break-words max-w-[200px] overflow-hidden truncate">{gov.note}</div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-white">
                      {gov.latestPower}
                    </td>
                    <td className="py-4 px-6">
                      {gov.reason === "New" ? (
                        <div className="text-gray-600">-</div>
                      ) : (
                        <div>
                          <div className={`font-mono text-xs font-bold ${gov.rawDelta === 0 ? 'text-gray-500' : (gov.rawDelta < 0 ? 'text-rose-500' : 'text-cyan-400')}`}>
                            {gov.rawDelta > 0 ? `+${gov.rawDelta.toLocaleString()}` : gov.rawDelta.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 flex flex-col gap-0.5">
                            <span className={gov.reason === "Migrated Out" || gov.reason === "Missing" ? "text-rose-500" : ""}>Troop: {gov.troopDelta}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {gov.reason === "New" ? (
                        <div className="text-gray-600">-</div>
                      ) : (
                        <div>
                          <div className={`font-mono text-xs font-bold ${gov.reason === "Migrated Out" || gov.reason === "Missing" ? "text-gray-600" : "text-amber-500"}`}>
                            {gov.kpDelta}
                          </div>
                          <div className={`font-mono text-[10px] mt-1 ${gov.reason === "Migrated Out" || gov.reason === "Missing" ? "text-gray-600" : "text-emerald-500"}`}>
                            Harvest: {gov.gatheredDelta}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-[#0a0c0f] border-t border-[#1e222b] text-center text-xs text-gray-500 flex items-center justify-between px-6">
            <span>Showing {results.length} anomalies tracked between {startDate || 'Auto'} and {endDate || 'Auto'}</span>
            <span className="text-indigo-500 font-bold">AWS Historical Sync Active</span>
          </div>
        </div>
      )}

    </div>
  );
}
