"use client";

import { Swords, Map, Activity, Crown, Flame, Skull, Target, ChevronRight } from "lucide-react";

export default function KvKReport() {
  const objectives = [
    { title: "Honor Points Required", value: "24.5M", status: "Critical", color: "rose" },
    { title: "Garrison Reinforcements", value: "1,204", status: "Stable", color: "emerald" },
    { title: "Coalition Bastions", value: "14/15", status: "Active", color: "amber" }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
          <div className="flex items-center gap-4">
             <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
               <Swords className="text-rose-500" size={32} />
             </div>
             <div>
               <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                 Light vs Dark <span className="text-rose-500 text-xl">Season 8</span>
               </h1>
               <p className="text-rose-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Camp Overview • Solaria Faction</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-4 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold uppercase tracking-widest rounded-md animate-pulse">
              Kingsland Opens: 4D 12H
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Dashboard */}
         <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-6 shadow-lg relative overflow-hidden">
               <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
                  <Map size={200} />
               </div>
               <h2 className="text-white font-bold mb-6 flex items-center gap-2 pb-4 border-b border-[#1e222b]">
                 <Flame className="text-amber-500" size={20} /> Frontline Tracking
               </h2>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {objectives.map((obj, i) => (
                   <div key={i} className="bg-[#0a0c0f] border border-[#1e222b] p-4 rounded-lg flex flex-col gap-2">
                     <span className={`text-[10px] font-bold uppercase tracking-widest text-${obj.color}-400`}>{obj.status}</span>
                     <p className="text-2xl font-black text-white font-mono">{obj.value}</p>
                     <h3 className="text-gray-500 text-xs font-bold uppercase">{obj.title}</h3>
                   </div>
                 ))}
               </div>
            </div>

            {/* DKP Leaderboard Stub */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
               <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                  <h2 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                    <Skull size={18} className="text-rose-500" />
                    Kingdom War Record (DKP)
                  </h2>
                  <button className="text-[10px] text-gray-500 hover:text-rose-400 font-bold uppercase tracking-widest transition-colors flex items-center">
                    Full Rankings <ChevronRight size={14} />
                  </button>
               </div>
               
               <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#13161c] border border-[#1e222b] mb-4">
                    <Target className="text-gray-600" size={24} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Damage Metrics Offline</h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                    Live tracking of DKP performance is temporarily suspended while the OCR parsing AI node is recalibrated for V2 metrics.
                  </p>
               </div>
            </div>

         </div>

         {/* Right Sidebar */}
         <div className="space-y-6">
            <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg border-t-2 border-t-amber-500">
               <div className="p-6">
                  <div className="flex items-center gap-2 text-amber-500 mb-4 border-b border-amber-500/20 pb-4">
                     <Crown size={20} />
                     <h2 className="font-bold text-sm uppercase tracking-widest">Enemy Command Map</h2>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="bg-[#0a0c0f] border border-[#1e222b] p-3 rounded-lg flex justify-between items-center group hover:border-rose-500/30 transition-colors">
                        <span className="text-white font-bold">Kingdom 3131</span>
                        <span className="text-rose-500 text-xs font-black uppercase tracking-widest">Hostile</span>
                     </div>
                     <div className="bg-[#0a0c0f] border border-[#1e222b] p-3 rounded-lg flex justify-between items-center bg-emerald-500/5 hover:border-emerald-500/30 transition-colors">
                        <span className="text-emerald-400 font-bold">Kingdom 3156</span>
                        <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">Friendly</span>
                     </div>
                     <div className="bg-[#0a0c0f] border border-[#1e222b] p-3 rounded-lg flex justify-between items-center bg-emerald-500/5 hover:border-emerald-500/30 transition-colors">
                        <span className="text-emerald-400 font-bold">Kingdom 3162</span>
                        <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">Friendly</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
}
