"use client";

import { CalendarDays, Star, Crosshair, Map, ShieldAlert, Clock, AlertTriangle } from "lucide-react";

export default function EventsSchedule() {
  const events = [
    { 
      id: 1, 
      name: "KvK Matchmaking", 
      type: "System", 
      time: "Starts in 48 Hours", 
      icon: Map, 
      color: "amber",
      desc: "Kingdom power locking in preparation for Light vs Dark matchmaking algorithms."
    },
    { 
      id: 2, 
      name: "Mightiest Governor", 
      type: "Competitive", 
      time: "Active (Stage 5)", 
      icon: Star, 
      color: "emerald",
      desc: "Kill Event active. Do not hit farms. Honor the Kingdom Title rotation."
    },
    { 
      id: 3, 
      name: "Bastion Ruins Open", 
      type: "KvK", 
      time: "Thursday 00:00 UTC", 
      icon: Crosshair, 
      color: "rose",
      desc: "March formations required at Sector 4 Ruins. Minimum T4 infantry."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10">
          <CalendarDays className="text-amber-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Global Event Trajectory</h1>
            <p className="text-amber-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Calendar & Synchronization Warnings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Left Side: Server Time / Warnings */}
         <div className="space-y-6">
            <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg border-t-2 border-t-emerald-500">
               <div className="p-6 text-center">
                  <Clock className="text-emerald-500 mx-auto mb-2" size={32} />
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Current UTC Time</div>
                  <div className="text-3xl font-black text-white font-mono tracking-widest">
                     {new Date().toISOString().substring(11, 16)} <span className="text-emerald-500 text-lg">UTC</span>
                  </div>
               </div>
            </div>

            <div className="bg-[#13161c] border border-rose-500/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(225,29,72,0.1)] border-t-2 border-t-rose-500">
               <div className="p-6">
                  <div className="flex items-center gap-2 text-rose-500 mb-2 border-b border-rose-500/20 pb-2">
                     <AlertTriangle size={18} />
                     <h2 className="font-bold text-xs uppercase tracking-widest">Kingdom Directives</h2>
                  </div>
                  <ul className="space-y-3 mt-4 text-xs text-rose-400 font-bold leading-relaxed">
                     <li className="flex gap-2"><span className="text-rose-600">•</span> Only hit designated rogue cities.</li>
                     <li className="flex gap-2"><span className="text-rose-600">•</span> Do not clear Level 5 resource nodes unless full.</li>
                     <li className="flex gap-2"><span className="text-rose-600">•</span> MGE KE Limits strictly enforced by Leadership.</li>
                  </ul>
               </div>
            </div>
         </div>

         {/* Right Side: Timeline */}
         <div className="lg:col-span-2 space-y-4">
            {events.map((ev) => (
               <div key={ev.id} className="bg-[#0f1115] border border-[#1e222b] hover:border-amber-500/30 transition-colors rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-lg bg-${ev.color}-500/10 border border-${ev.color}-500/20 text-${ev.color}-500`}>
                        <ev.icon size={24} />
                     </div>
                     <div>
                        <h3 className="text-white font-bold text-lg">{ev.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{ev.desc}</p>
                     </div>
                  </div>
                  <div className="shrink-0 text-left md:text-right w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-[#1e222b] md:border-0 pl-0 md:pl-4">
                     <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border border-${ev.color}-500/30 text-${ev.color}-400 bg-${ev.color}-500/5`}>
                        {ev.type}
                     </span>
                     <div className="text-white font-bold text-sm tracking-wider font-mono bg-[#1a1d24] px-4 py-2 rounded-lg border border-[#2d323e]">
                        {ev.time}
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

    </div>
  );
}
