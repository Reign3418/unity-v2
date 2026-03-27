"use client";

import { useState } from "react";
import { Crosshair, Search, History, ShieldAlert, Fingerprint, CalendarDays, ExternalLink, Activity, MapPin, FileText } from "lucide-react";

export default function PlayerHunter() {
  const [inputText, setInputText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [hunterResults, setHunterResults] = useState([]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const queries = inputText.split("\n").map(n => n.trim()).filter(n => n !== "");
    if (queries.length === 0) return;

    setIsSearching(true);
    setHasResults(false);

    try {
      const fetchPromises = queries.map(async (query) => {
        try {
          // 1. Locate Target Globally (Accepts both Name and ID)
          const huntRes = await fetch(`/api/aws/hunter?q=${encodeURIComponent(query)}`);
          if (!huntRes.ok) throw new Error("Not Found");
          const huntData = await huntRes.json();
          
          if (!huntData.result) {
            return {
              query,
              status: 'Not Found',
              currentStatus: null,
              timeline: [],
              kingdomHistory: [],
              aliasHistory: []
            };
          }
          
          const { id, name, lastSeenKingdom, lastSeenDate } = huntData.result;

          // 2. Extract chronological trajectory using a massive 50-scan concurrent lookup
          // We pass kd=GLOBAL to trigger the backend scatter-gather engine across ALL known AWS partitions
          const histRes = await fetch(`/api/aws/history?kd=GLOBAL&id=${id}&days=50&bypassCache=${Date.now()}`);
          const histData = await histRes.json();
          console.error("DEBUG HUNTER SERVER PAYLOAD:", histData.debug_info);
          
          const rawTimeline = histData.timeline || [];
          const timelineData = rawTimeline.map((scan, i) => ({
            date: scan.scanDate.replace(/_/g, " "),
            kingdom: scan.kingdom || lastSeenKingdom, // Prefer scan kingdom if available
            power: scan.power ? (scan.power / 1000000).toFixed(1) + 'M' : "0",
            name: scan.name || name,
            note: i === (rawTimeline.length - 1) ? "Latest Snapshot" : "Historical Record"
          })).reverse(); 

          // 3. Extract distinct Kingdom and Alias histories
          const kHistorySet = new Set();
          const aHistorySet = new Set();
          
          // Pre-populate with the current global profile base just in case the history table is missing data
          kHistorySet.add(lastSeenKingdom); 
          aHistorySet.add(name);

          // The timeline array goes from Newest (index 0) to Oldest (index N) since we reversed it.
          // Wait, the chronologies usually come newest to oldest or oldest to newest? The original reversed to put newest at the top.
          timelineData.forEach(t => {
            if (t.kingdom) kHistorySet.add(t.kingdom);
            if (t.name) aHistorySet.add(t.name);
          });
          
          const kingdomHistory = Array.from(kHistorySet);
          const aliasHistory = Array.from(aHistorySet);

          return {
             query,
             status: 'Resolved',
             id: id,
             currentStatus: {
               name: name,
               kingdom: lastSeenKingdom,
               power: timelineData.length > 0 ? timelineData[0].power : "Unverified",
               lastDate: lastSeenDate ? new Date(lastSeenDate).toLocaleDateString() : "Unknown"
             },
             timeline: timelineData,
             kingdomHistory,
             aliasHistory
          };
          
        } catch (e) {
            return {
              query,
              status: 'Not Found',
              currentStatus: null,
              timeline: [],
              kingdomHistory: [],
              aliasHistory: []
            };
        }
      });

      const finalResults = await Promise.all(fetchPromises);
      setHunterResults(finalResults);
      setHasResults(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Header Search Console */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-3">
              <Crosshair className="text-cyan-500" size={28} />
              Global Hunter Engine
            </h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Paste a bulk list of Governor IDs or Player Names (one per line). The engine will cross-reference the AWS Global Timeline to disambiguate their permanent identities, mapping their migration history and explicit alias changes across all known kingdoms.
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full md:w-[400px]">
             
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter IDs or Names...&#10;135042283&#10;Reign"
              className="w-full h-32 bg-[#0a0c0f] border-2 border-[#1e222b] focus:border-cyan-500 text-white p-4 rounded-xl font-mono text-lg transition-all outline-none placeholder:text-gray-600 shadow-inner resize-none"
            />
            
            <button 
              type="submit"
              disabled={isSearching || !inputText}
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
        <div className="space-y-12 animate-fade-in">
          {hunterResults.map((result, idx) => (
             <div key={idx} className="border border-[#1e222b] rounded-2xl overflow-hidden shadow-2xl relative">
                
                {/* Status Overlay */}
                {result.status === 'Not Found' ? (
                   <div className="bg-[#13161c] p-8 text-center border-t-4 border-t-rose-500">
                     <ShieldAlert className="text-rose-500 mx-auto mb-4" size={32} />
                     <h2 className="text-2xl font-black text-white">{result.query}</h2>
                     <p className="text-rose-500/80 mt-2 font-mono">Target Completely Unverified / Not in Global Registry</p>
                   </div>
                ) : (
                  <>
                    {/* Identity Header */}
                    <div className="bg-[#111318] border-b border-[#1e222b] border-l-4 border-l-cyan-500 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-full bg-[#0a0c0f] border-2 border-cyan-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)] shrink-0">
                          <Fingerprint className="text-cyan-500" size={28} />
                        </div>
                        <div className="text-center sm:text-left">
                          <h2 className="text-3xl font-black text-white mb-1 flex items-center justify-center sm:justify-start gap-2">
                             {result.currentStatus.name}
                          </h2>
                          <div className="text-cyan-500 font-mono font-bold">
                            ID: {result.id} <span className="text-gray-600 mx-2">|</span> Query: {result.query}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 text-center items-center justify-center w-full md:w-auto mt-4 md:mt-0">
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-lg p-3 min-w-[120px]">
                           <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Latest KD</div>
                           <div className="text-xl font-mono font-bold text-white">{result.currentStatus.kingdom}</div>
                           <div className="text-gray-600 text-[8px] mt-1">{result.currentStatus.lastDate}</div>
                        </div>
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-lg p-3 min-w-[120px]">
                           <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Latest Power</div>
                           <div className={`text-xl font-mono font-bold ${result.currentStatus.power === 'Unverified' ? 'text-rose-500' : 'text-cyan-400'}`}>
                              {result.currentStatus.power}
                           </div>
                           {result.currentStatus.power === 'Unverified' && (
                             <div className="text-rose-500/50 text-[8px] mt-1">NO RECENT SCANS</div>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* Historical Extraction Panels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1e222b]">
                       
                       <div className="bg-[#0a0c0f] p-6">
                         <div className="flex items-center gap-2 mb-4 text-cyan-500 font-bold uppercase tracking-widest text-xs">
                           <MapPin size={16} /> Kingdom Migration Trajectory
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {result.kingdomHistory.map((kd, kIdx) => (
                               <div key={kIdx} className="flex items-center gap-2">
                                 <span className="bg-[#13161c] border border-cyan-500/30 text-white font-mono px-3 py-1 rounded">
                                   {kd}
                                 </span>
                                 {kIdx < result.kingdomHistory.length - 1 && <span className="text-gray-600 text-xs">→</span>}
                               </div>
                            ))}
                         </div>
                       </div>

                       <div className="bg-[#0a0c0f] p-6">
                         <div className="flex items-center gap-2 mb-4 text-fuchsia-400 font-bold uppercase tracking-widest text-xs">
                           <FileText size={16} /> Known Alias Evolution
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {result.aliasHistory.map((al, aIdx) => (
                               <div key={aIdx} className="flex items-center gap-2">
                                 <span className="bg-[#13161c] border border-fuchsia-500/30 text-white font-bold px-3 py-1 rounded max-w-[150px] truncate" title={al}>
                                   {al}
                                 </span>
                                 {aIdx < result.aliasHistory.length - 1 && <span className="text-gray-600 text-xs">→</span>}
                               </div>
                            ))}
                         </div>
                       </div>

                    </div>

                    {/* Timeline Feed */}
                    <div className="bg-[#0f1115] p-6">
                       <h3 className="text-gray-500 uppercase font-bold tracking-widest text-[10px] mb-6">Raw AWS Timeline Scans</h3>
                       <div className="relative border-l border-cyan-500/20 ml-3 space-y-4">
                         
                         {result.timeline.map((event, index) => (
                           <div key={index} className="relative pl-6 group">
                             <div className="absolute -left-1.5 top-2 w-3 h-3 rounded-full bg-[#13161c] border border-cyan-500/50 group-hover:bg-cyan-500 transition-colors"></div>
                             
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-[#13161c] border border-[#1e222b] rounded-lg p-3 hover:border-gray-700 transition-all">
                                <div className="text-xs text-cyan-500 font-bold tracking-widest flex items-center gap-2 mb-2 sm:mb-0 min-w-[140px]">
                                   {event.date}
                                </div>
                                <div className="grid grid-cols-3 gap-6 flex-1 text-sm">
                                   <div className="flex items-center gap-2"><span className="text-gray-500">KD:</span> <span className="text-white font-mono font-bold">{event.kingdom}</span></div>
                                   <div className="flex items-center gap-2 truncate"><span className="text-gray-500">Alias:</span> <span className="text-white font-bold truncate">{event.name}</span></div>
                                   <div className="flex items-center gap-2"><span className="text-gray-500">Pwr:</span> <span className="text-cyan-400 font-mono font-bold">{event.power}</span></div>
                                </div>
                             </div>
                           </div>
                         ))}

                       </div>
                    </div>
                  </>
                )}
             </div>
          ))}
        </div>
      )}

    </div>
  );
}
