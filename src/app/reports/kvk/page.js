"use client";

import { useState, useEffect } from "react";
import { 
    FileText, RefreshCw, BarChart2, Shield, Target, 
    Skull, TrendingDown, TrendingUp, Medal
} from "lucide-react";

export default function KvkReport() {
  const [kd, setKd] = useState("3155");
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/kvk-report?kd=${kd}`);
      const data = await res.json();
      
      if (res.ok && data.report) {
          setReport(data.report);
      } else {
          setReport(null);
      }
    } catch (e) {
      console.error(e);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [kd]);

  const formatNum = (num) => num ? Number(num).toLocaleString() : "0";
  const formatMillion = (num) => num ? (Number(num) / 1000000).toFixed(1) + 'M' : "0";
  const formatBillion = (num) => num ? (Number(num) / 1000000000).toFixed(2) + 'B' : "0";

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                 <FileText className="text-cyan-500" size={32} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                   KvK After-Action Report
                 </h1>
                 <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Kingdom Performance Debrief</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2">
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-[#13161c] px-3 py-1 rounded border border-[#1e222b] hidden sm:block">
                  Chronological Mapping
               </span>
               <select 
                 value={kd}
                 onChange={(e) => setKd(e.target.value)}
                 className="bg-[#13161c] border border-[#1e222b] text-white focus:border-cyan-500 px-4 py-2.5 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
               >
                 <option value="3155">KD 3155</option>
                 <option value="3156">KD 3156</option>
               </select>
               <button 
                  onClick={fetchReport}
                  disabled={isLoading}
                   className="p-2.5 bg-[#13161c] hover:bg-[#1e222b] text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
               >
                  <RefreshCw size={20} className={isLoading ? "animate-spin text-cyan-500" : ""} />
               </button>
            </div>
         </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-cyan-500 w-8 h-8" />
        </div>
      ) : !report ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <BarChart2 className="w-12 h-12 mb-4 opacity-50 text-cyan-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Telemetry Recorded</h3>
            <p className="text-sm">Cannot compile After-Action reports. The central DynamoDB chronologies lack differential context for this target.</p>
        </div>
      ) : (
        <>
            {/* Core Kingdom Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-[#13161c] border border-[#1e222b] border-t-4 border-t-cyan-500 rounded-xl p-6 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[30px] -mr-10 -mt-10"></div>
                    <Target className="text-cyan-500 mb-3" size={24} />
                    <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total KP Gained (Kingdom)</h3>
                    <div className="text-5xl font-black text-white font-mono">{formatBillion(report.totals.kpGained)}</div>
                </div>
                
                <div className="bg-[#13161c] border border-[#1e222b] border-t-4 border-t-rose-500 rounded-xl p-6 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[30px] -mr-10 -mt-10"></div>
                    <Skull className="text-rose-500 mb-3" size={24} />
                    <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Combat Fatalities (Deads)</h3>
                    <div className="text-5xl font-black text-rose-500 font-mono">{formatMillion(report.totals.deadsLost)}</div>
                </div>

                <div className="bg-[#13161c] border border-[#1e222b] border-t-4 border-t-cyan-500 rounded-xl p-6 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[30px] -mr-10 -mt-10"></div>
                    {report.totals.powerDelta >= 0 ? 
                        <TrendingUp className="text-cyan-500 mb-3" size={24} /> : 
                        <TrendingDown className="text-rose-500 mb-3" size={24} />
                    }
                    <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Net Base Power Shift</h3>
                    <div className={`text-5xl font-black font-mono ${report.totals.powerDelta >= 0 ? "text-cyan-400" : "text-gray-400"}`}>
                        {report.totals.powerDelta >= 0 ? "+" : ""}{formatBillion(report.totals.powerDelta)}
                    </div>
                </div>
            </div>

            {/* Content Double Column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top 5 Alliance Hegemony */}
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden flex flex-col">
                     <div className="bg-[#0a0c0f] px-6 py-5 border-b border-[#1e222b] flex items-center gap-3">
                         <Shield size={18} className="text-cyan-500" />
                         <h2 className="text-white font-bold uppercase tracking-widest text-sm">Alliance Hegemony Output</h2>
                     </div>
                     <div className="p-2 flex-1">
                         {report.topAlliances.map((tagObj, i) => (
                             <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-lg transition-colors border-b border-[#1e222b]/50 last:border-0">
                                 <div className="flex items-center gap-4">
                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${i===0 ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'bg-[#13161c] text-gray-400 font-mono border border-[#1e222b]'}`}>
                                        {i+1}
                                     </div>
                                     <div>
                                         <h3 className="text-white font-black text-xl tracking-wider uppercase">[{tagObj.tag}]</h3>
                                         <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">Combat Core: {tagObj.activeMembers} Field Accs</p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-cyan-400 font-mono font-bold text-xl">{formatBillion(tagObj.kpGained)} KP</div>
                                     <div className="text-rose-500 font-mono text-xs">{formatMillion(tagObj.deadsLost)} Dead</div>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>

                {/* Top 10 Individual Warriors */}
                 <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden flex flex-col">
                     <div className="bg-[#0a0c0f] px-6 py-5 border-b border-[#1e222b] flex items-center justify-between gap-3">
                         <div className="flex items-center gap-3">
                             <Target size={18} className="text-cyan-500" />
                             <h2 className="text-white font-bold uppercase tracking-widest text-sm">The Vanguard (Top 10)</h2>
                         </div>
                         <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                            Most Lethal Operators
                         </span>
                     </div>
                     <div className="p-2 flex-1">
                         {report.topWarriors.map((gov, i) => (
                             <div key={i} className="flex items-center justify-between p-3.5 hover:bg-white/5 rounded-lg transition-colors border-b border-[#1e222b]/50 last:border-0 group">
                                 <div className="flex items-center gap-3">
                                     <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono text-gray-500 bg-[#13161c] border border-[#1e222b]">
                                        {i+1}
                                     </div>
                                     <div className="w-6 flex justify-center">
                                       {i === 0 && <Medal size={16} className="text-amber-400" />}
                                       {i === 1 && <Medal size={16} className="text-slate-300" />}
                                       {i === 2 && <Medal size={16} className="text-amber-700" />}
                                     </div>
                                     <div>
                                         <h3 className="text-white font-bold text-sm tracking-wider uppercase group-hover:text-cyan-400 transition-colors">{gov.name}</h3>
                                         <p className="text-[10px] text-gray-500 font-mono tracking-widest">[{gov.alliance}] ID: {gov.id}</p>
                                     </div>
                                 </div>
                                 <div className="text-right flex items-center gap-4">
                                     <div className="hidden sm:block">
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">KP Gained</div>
                                        <div className="text-cyan-400 font-mono font-bold text-sm">+{formatMillion(gov.kpGained)}</div>
                                     </div>
                                     <div className="text-right">
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Fatalities</div>
                                        <div className="text-rose-500 font-mono font-bold text-sm">{formatNum(gov.deadsLost)}</div>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>

            </div>
        </>
      )}

    </div>
  );
}
