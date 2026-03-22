"use client";

import { useState } from "react";
import { Crosshair, Search, History, ShieldAlert, Fingerprint, CalendarDays, ExternalLink, Activity } from "lucide-react";

export default function PlayerHunter() {
  const [searchId, setSearchId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const [hunterResults, setHunterResults] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId) return;

    setIsSearching(true);
    setHasResults(false);

    try {
      // 1. Locate Governor Globally
      const huntRes = await fetch(`/api/aws/hunter?q=${searchId}`);
      const huntData = await huntRes.json();
      
      if (!huntData.result) {
        setIsSearching(false);
        alert("Target completely unverified. Not found in Global AWS Registry.");
        return;
      }
      
      const { id, name, lastSeenKingdom } = huntData.result;

      // 2. Extract chronological trajectory from their last known server
      const histRes = await fetch(`/api/aws/history?kd=${lastSeenKingdom}&id=${id}&days=10`);
      const histData = await histRes.json();
      
      const timelineData = (histData.timeline || []).map((scan, i) => ({
        date: scan.scanDate.replace(/_/g, " "),
        kingdom: lastSeenKingdom,
        power: scan.power ? (scan.power / 1000000).toFixed(1) + 'M' : "0",
        name: name,
        note: i === (histData.timeline.length - 1) ? "Latest Snapshot" : "Historical Record"
      })).reverse(); // Reverse so newest is at the top of the node tree

      setHunterResults({
        currentStatus: {
          name: name,
          kingdom: lastSeenKingdom,
          power: timelineData.length > 0 ? timelineData[0].power : "Unverified"
        },
        timeline: timelineData
      });
      
      setHasResults(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Header Search Console */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-3">
              <Crosshair className="text-cyan-500" size={28} />
              Cross-Kingdom Hunter
            </h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Input a permanent Governor ID to scan the global AWS timeline. The Hunter engine will extract their migration history, alias changes, and historical power trajectories across every kingdom.
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full md:w-[400px]">
            <div className="relative">
              <input 
                type="text" 
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Governor ID (e.g. 135042283)"
                className="w-full bg-[#0a0c0f] border-2 border-[#1e222b] focus:border-cyan-500 text-white pl-12 pr-4 py-4 rounded-xl font-mono text-lg transition-all outline-none placeholder:text-gray-600 shadow-inner"
              />
              <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            </div>
            
            <button 
              type="submit"
              disabled={isSearching || !searchId}
              className={`w-full mt-4 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                isSearching 
                  ? 'bg-cyan-500/20 text-cyan-500/50 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]'
              }`}
            >
              {isSearching ? <Activity className="animate-spin" size={18} /> : <Search size={18} />}
              {isSearching ? 'Scanning Global Database...' : 'Execute Trajectory Scan'}
            </button>
          </form>

        </div>
      </div>

      {/* Search Results Display */}
      {hasResults && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Identity Header */}
          <div className="bg-[#13161c] border border-[#1e222b] border-l-4 border-l-cyan-500 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0a0c0f] border-2 border-cyan-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <ShieldAlert className="text-cyan-500" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{hunterResults.currentStatus.name}</h2>
                <div className="text-gray-500 font-mono text-sm max-w-[200px] truncate">
                  Latest Known Alias
                </div>
              </div>
            </div>
            
            <div className="flex gap-6 text-center">
              <div>
                 <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Target KD</div>
                 <div className="text-lg font-mono font-bold text-white bg-[#0f1115] px-3 py-1 rounded border border-[#1e222b]">{hunterResults.currentStatus.kingdom}</div>
              </div>
              <div>
                 <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Latest Power</div>
                 <div className="text-lg font-mono font-bold text-cyan-400 bg-[#0f1115] px-3 py-1 rounded border border-[#1e222b]">{hunterResults.currentStatus.power}</div>
              </div>
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl overflow-hidden shadow-xl">
             <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
               <History className="text-gray-400" size={20} />
               <h3 className="text-white font-bold">Historical Trajectory</h3>
             </div>
             
             <div className="p-8">
                <div className="relative border-l border-cyan-500/30 ml-3 space-y-8">
                  
                  {hunterResults.timeline.map((event, index) => (
                    <div key={index} className="relative pl-8 group">
                      {/* Timeline Node */}
                      <div className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 transition-colors ${
                        index === 0 
                          ? 'bg-cyan-500 border-white shadow-[0_0_10px_rgba(6,182,212,0.8)]' 
                          : 'bg-[#0f1115] border-cyan-500/50 group-hover:bg-cyan-500/20 group-hover:border-cyan-500'
                      }`}></div>
                      
                      {/* Event Content */}
                      <div className={`bg-[#13161c] border rounded-xl p-5 shadow-sm transition-all ${
                        index === 0 ? 'border-cyan-500/30 shadow-[0_5px_20px_rgba(6,182,212,0.05)]' : 'border-[#1e222b] group-hover:border-gray-600'
                      }`}>
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2 text-cyan-500 text-sm font-bold uppercase tracking-wider">
                              <CalendarDays size={16} /> {event.date}
                            </div>
                            {event.kingdom !== hunterResults.currentStatus.kingdom && (
                              <span className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-1 rounded font-bold uppercase tracking-wider">
                                Migration Verified
                              </span>
                            )}
                         </div>

                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                               <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Located In</div>
                               <div className="text-white font-mono font-bold flex items-center gap-1">
                                 KD {event.kingdom} 
                                 {event.kingdom !== "3155" && <ExternalLink size={12} className="text-gray-600" />}
                               </div>
                            </div>
                            <div>
                               <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Recorded Alias</div>
                               <div className="text-white font-bold truncate max-w-[120px]" title={event.name}>{event.name}</div>
                            </div>
                            <div>
                               <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Extracted Power</div>
                               <div className="text-cyan-400 font-mono font-bold">{event.power}</div>
                            </div>
                            <div>
                               <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Engine Note</div>
                               <div className="text-gray-400 text-xs italic">{event.note}</div>
                            </div>
                         </div>
                      </div>
                    </div>
                  ))}

                </div>
             </div>
          </div>

        </div>
      )}

    </div>
  );
}
