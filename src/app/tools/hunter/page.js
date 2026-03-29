"use client";

import { useState } from "react";
import { Crosshair, Search, ShieldAlert, Fingerprint, MapPin, FileText, Activity, Users, Download, Target, Table } from "lucide-react";

export default function PlayerHunter() {
  const [activeTab, setActiveTab] = useState("trajectory"); // "trajectory" or "talent"

  // Tab A State (Global Trajectory)
  const [inputText, setInputText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [hunterResults, setHunterResults] = useState([]);

  // Tab B State (Talent Acquisition)
  const [targetKingdoms, setTargetKingdoms] = useState("");
  const [minPower, setMinPower] = useState(0);
  const [maxPower, setMaxPower] = useState(200000000);
  const [isHunting, setIsHunting] = useState(false);
  const [talentResults, setTalentResults] = useState([]);
  const [hasTalentResults, setHasTalentResults] = useState(false);

  // Tab A: Trajectory Handler
  const handleSearch = async (e) => {
    e?.preventDefault();
    const queries = inputText.split("\n").map(n => n.trim()).filter(n => n !== "");
    if (queries.length === 0) return;

    setIsSearching(true);
    setHasResults(false);

    try {
      const fetchPromises = queries.map(async (query) => {
        try {
          const huntRes = await fetch(`/api/aws/hunter?q=${encodeURIComponent(query)}`);
          if (!huntRes.ok) throw new Error("Not Found");
          const huntData = await huntRes.json();
          
          if (!huntData.result) {
            return { query, status: 'Not Found', currentStatus: null, timeline: [], kingdomHistory: [], aliasHistory: [] };
          }
          
          const targets = Array.isArray(huntData.result) ? huntData.result : [huntData.result];
          
          const multiPromises = targets.map(async (target) => {
              const { id, name, lastSeenKingdom, lastSeenDate } = target;

              try {
                  const histRes = await fetch(`/api/aws/history?kd=GLOBAL&id=${id}&days=50&bypassCache=${Date.now()}`);
                  const histData = await histRes.json();
                  
                  const rawTimeline = histData.timeline || [];
                  const timelineData = rawTimeline.map((scan) => ({
                    date: scan.scanDate ? scan.scanDate.replace(/_/g, " ") : "Unknown",
                    kingdom: scan.kingdom || lastSeenKingdom,
                    power: scan.power ? (scan.power / 1000000).toFixed(1) + 'M' : "0",
                    name: scan.name || name,
                    note: "Historical Record"
                  })).sort((a, b) => b.date.localeCompare(a.date)); 

                  if (timelineData.length > 0) {
                    timelineData[0].note = "Latest Snapshot";
                  }

                  const kHistorySet = new Set();
                  const aHistorySet = new Set();
                  
                  kHistorySet.add(lastSeenKingdom); 
                  aHistorySet.add(name);

                  timelineData.forEach(t => {
                    if (t.kingdom) kHistorySet.add(t.kingdom);
                    if (t.name) aHistorySet.add(t.name);
                  });
                  
                  return {
                     query,
                     status: 'Resolved',
                     id: id,
                     currentStatus: {
                       name: timelineData.length > 0 ? timelineData[0].name : name,
                       kingdom: timelineData.length > 0 ? timelineData[0].kingdom : lastSeenKingdom,
                       power: timelineData.length > 0 ? timelineData[0].power : "Unverified",
                       lastDate: timelineData.length > 0 ? timelineData[0].date : (lastSeenDate ? new Date(lastSeenDate).toLocaleDateString() : "Unknown")
                     },
                     timeline: timelineData,
                     kingdomHistory: Array.from(kHistorySet),
                     aliasHistory: Array.from(aHistorySet)
                  };
              } catch (histErr) {
                  return { query, status: 'Not Found', currentStatus: null, timeline: [], kingdomHistory: [], aliasHistory: [] };
              }
          });
          
          const expandedResults = await Promise.all(multiPromises);
          return expandedResults;
          
        } catch (e) {
            return [{ query, status: 'Not Found', currentStatus: null, timeline: [], kingdomHistory: [], aliasHistory: [] }];
        }
      });

      const rawResults = await Promise.all(fetchPromises);
      const finalResults = rawResults.flat();
      setHunterResults(finalResults);
      setHasResults(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Tab B: Talent Acquisition Handler
  const handleTalentHunt = async (e) => {
    e?.preventDefault();
    if (!targetKingdoms) return;

    setIsHunting(true);
    setHasTalentResults(false);

    try {
        const res = await fetch(`/api/aws/hunter/talent?kingdoms=${encodeURIComponent(targetKingdoms)}&minPower=${minPower}&maxPower=${maxPower}`);
        const data = await res.json();
        
        if (res.ok) {
            setTalentResults(data.result || []);
            setHasTalentResults(true);
        } else {
            console.error("Talent Hunt Error:", data.error);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsHunting(false);
    }
  };

  const exportToExcel = () => {
    if (talentResults.length === 0) return;
    
    const headers = ["Governor ID", "Name", "Alliance", "Kingdom", "Power", "Kill Points", "Deads", "T4 Kills", "T5 Kills", "Gathered"]; 
    
    let csv = headers.join(",") + "\n";
    talentResults.forEach(r => {
      const safename = (r.name || "").replace(/"/g, '""'); // Escape CSV quotes
      csv += `"${r.id}","${safename}","${r.alliance}","${r.kingdom}","${r.power}","${r.killPoints}","${r.dead}","${r.t4Kills}","${r.t5Kills}","${r.gathered}"\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Talent_Acquisition_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12">
      
      {/* Header Selector Navigation */}
      <div className="flex flex-col md:flex-row gap-4 w-full">
         <button 
           onClick={() => setActiveTab("trajectory")}
           className={`flex-1 py-4 px-6 flex items-center justify-center gap-3 rounded-xl border-2 transition-all font-bold tracking-widest uppercase ${
             activeTab === "trajectory" 
               ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
               : 'bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-white hover:bg-white/5'
           }`}
         >
           <Crosshair size={20} /> Identity Trajectory
         </button>

         <button 
           onClick={() => setActiveTab("talent")}
           className={`flex-1 py-4 px-6 flex items-center justify-center gap-3 rounded-xl border-2 transition-all font-bold tracking-widest uppercase ${
             activeTab === "talent" 
               ? 'bg-fuchsia-500/10 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.15)]' 
               : 'bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-white hover:bg-white/5'
           }`}
         >
           <Target size={20} /> Talent Acquisition
         </button>
      </div>

      {activeTab === "talent" && (
        <div className="space-y-6 animate-fade-in">
          {/* Form Container */}
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 mb-8 pb-8 border-b border-[#1e222b]">
               <div>
                  <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    Player Hunter <Target className="text-fuchsia-500" size={28} />
                  </h1>
                  <p className="text-gray-400 text-sm max-w-xl">
                    Query the AWS Cloud Database to find players matching specific power criteria across multiple kingdoms in real time.
                  </p>
               </div>
               
               <button onClick={exportToExcel} disabled={talentResults.length === 0} className="flex items-center gap-2 px-6 py-3 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#6366f1]/30 disabled:text-white/30 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all uppercase tracking-wider text-sm">
                  <Download size={18} /> Export to Excel
               </button>
            </div>

            <form onSubmit={handleTalentHunt} className="space-y-6 relative z-10 w-full">
                
                <div className="w-full">
                  <label className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 block">
                    Target Kingdoms (Comma Separated)
                  </label>
                  <input 
                    type="text" 
                    value={targetKingdoms}
                    onChange={(e) => setTargetKingdoms(e.target.value)}
                    placeholder="e.g. 4023, 4024, 4025"
                    className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-fuchsia-500 text-white p-4 rounded-xl font-mono text-lg transition-all outline-none"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-6 w-full">
                   <div className="flex-1">
                      <label className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 block">
                        Min Power
                      </label>
                      <input 
                        type="number" 
                        value={minPower}
                        onChange={(e) => setMinPower(e.target.value)}
                        className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-fuchsia-500 text-white p-4 rounded-xl font-mono text-lg transition-all outline-none"
                      />
                   </div>
                   <div className="flex-1">
                      <label className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-2 block">
                        Max Power
                      </label>
                      <input 
                        type="number" 
                        value={maxPower}
                        onChange={(e) => setMaxPower(e.target.value)}
                        className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-fuchsia-500 text-white p-4 rounded-xl font-mono text-lg transition-all outline-none"
                      />
                   </div>
                </div>

                <button 
                  type="submit"
                  disabled={isHunting || !targetKingdoms}
                  className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                    isHunting || !targetKingdoms
                      ? 'bg-fuchsia-500/20 text-fuchsia-500/50 cursor-not-allowed'
                      : 'bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]'
                  }`}
                >
                  {isHunting ? <Activity className="animate-spin" size={18} /> : <Search size={18} />}
                  {isHunting ? 'Scanning AWS Target Nodes...' : 'Start Hunt'}
                </button>
            </form>
          </div>

          {/* Table Results */}
          {hasTalentResults && (
             <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl overflow-hidden shadow-xl animate-fade-in">
               <div className="p-6 border-b border-[#1e222b] bg-[#13161c] flex items-center gap-3">
                 <Table className="text-fuchsia-500" size={20} />
                 <h2 className="text-lg font-bold text-white tracking-wider">Acquisition Radar Candidates ({talentResults.length})</h2>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-[#0a0c0f] border-b border-[#1e222b]">
                          <th className="p-4 text-xs tracking-widest uppercase text-gray-500 font-bold whitespace-nowrap">Kingdom</th>
                          <th className="p-4 text-xs tracking-widest uppercase text-gray-500 font-bold whitespace-nowrap">ID</th>
                          <th className="p-4 text-xs tracking-widest uppercase text-gray-500 font-bold whitespace-nowrap">Tag</th>
                          <th className="p-4 text-xs tracking-widest uppercase text-gray-500 font-bold whitespace-nowrap w-2/12">Name</th>
                          <th className="p-4 text-xs tracking-widest uppercase text-gray-500 font-bold whitespace-nowrap text-right">Power</th>
                          <th className="p-4 text-xs tracking-widest uppercase text-gray-500 font-bold whitespace-nowrap text-right">Kill Points</th>
                       </tr>
                    </thead>
                    <tbody>
                       {talentResults.length === 0 && (
                          <tr>
                            <td colSpan="6" className="p-8 text-center bg-[#13161c]">
                               <ShieldAlert className="text-gray-600 mx-auto mb-3" size={32} />
                               <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">No candidates found in this bracket.</span>
                            </td>
                          </tr>
                       )}
                       {talentResults.map((player, idx) => (
                          <tr key={`${player.id}-${idx}`} className="border-b border-[#1e222b]/50 hover:bg-[#1a1e26] transition-colors">
                             <td className="p-4 font-mono font-bold text-gray-300">[{player.kingdom}]</td>
                             <td className="p-4 font-mono text-gray-400">{player.id}</td>
                             <td className="p-4 font-bold text-cyan-400">{player.alliance !== "None" ? `[${player.alliance}]` : ''}</td>
                             <td className="p-4 font-bold text-white truncate max-w-[200px]">{player.name}</td>
                             <td className="p-4 font-mono text-fuchsia-400 text-right">{player.power.toLocaleString()}</td>
                             <td className="p-4 font-mono text-gray-300 text-right">{player.killPoints.toLocaleString()}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
             </div>
          )}
        </div>
      )}

      {activeTab === "trajectory" && (
        <div className="space-y-6 animate-fade-in">
          {/* ... [Trajectory DOM] ... */}
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-3">
                  <Fingerprint className="text-cyan-500" size={28} />
                  Identity Trajectory Tracker
                </h1>
                <p className="text-gray-400 text-sm max-w-xl">
                  Paste a bulk list of Governor IDs or Player Names (one per line). The engine will cross-reference the AWS Global Timeline to disambiguate their permanent identities, mapping their migration history across all known kingdoms.
                </p>
              </div>

              <form onSubmit={handleSearch} className="w-full md:w-[400px]">
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter IDs or Names...&#10;135042283"
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
            <div className="space-y-6 animate-fade-in">
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
                             <div className="flex items-center gap-2 mb-4 text-cyan-400 font-bold uppercase tracking-widest text-xs">
                               <FileText size={16} /> Known Alias Evolution
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {result.aliasHistory.map((al, aIdx) => (
                                   <div key={aIdx} className="flex items-center gap-2">
                                     <span className="bg-[#13161c] border border-cyan-500/30 text-white font-bold px-3 py-1 rounded max-w-[150px] truncate" title={al}>
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
      )}

    </div>
  );
}
