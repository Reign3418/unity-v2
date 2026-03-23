"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Star, Crosshair, Map, ShieldAlert, Clock, AlertTriangle, RefreshCw } from "lucide-react";

export default function EventsSchedule() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (data.events) {
            setEvents(data.events);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const getIcon = (type) => {
    if (type === 'KvK') return Crosshair;
    if (type === 'Competitive') return Star;
    return Map;
  };
  
  const getColor = (type) => {
    if (type === 'KvK') return "rose";
    if (type === 'Competitive') return "cyan";
    return "amber";
  };

  const getRelativeTime = (eventTime) => {
    const diff = new Date(eventTime).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    if (hours <= 0) return "Starting Now";
    if (hours < 24) return `In ${hours} Hours`;
    return `In ${Math.floor(hours / 24)} Days`;
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
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
            <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg border-t-2 border-t-cyan-500">
               <div className="p-6 text-center">
                  <Clock className="text-cyan-500 mx-auto mb-2" size={32} />
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Current UTC Time</div>
                  <div className="text-3xl font-black text-white font-mono tracking-widest">
                     {new Date().toISOString().substring(11, 16)} <span className="text-cyan-500 text-lg">UTC</span>
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
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                  <RefreshCw className="animate-spin mb-4" size={32} />
                  <p className="text-xs font-bold uppercase tracking-widest">Syncing Kingdom Schedule...</p>
               </div>
            ) : events.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-24 text-gray-600 bg-[#0f1115] border border-[#1e222b] rounded-xl">
                  <CalendarDays className="mb-4 opacity-40" size={48} />
                  <p className="text-sm font-bold uppercase tracking-widest">No Scheduled Events</p>
                  <p className="text-xs mt-2 text-center text-gray-500 max-w-sm">
                     Kingdom Management has not established the trajectory map yet. Events synced via the Discord Bot will reflect here automatically.
                  </p>
               </div>
            ) : events.map((ev) => {
               const IconCmp = getIcon(ev.type);
               const color = getColor(ev.type);
               return (
               <div key={ev.id} className={`bg-[#0f1115] border border-[#1e222b] hover:border-${color}-500/30 transition-colors rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/20 text-${color}-500`}>
                        <IconCmp size={24} />
                     </div>
                     <div>
                        <h3 className="text-white font-bold text-lg">{ev.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{ev.desc}</p>
                     </div>
                  </div>
                  <div className="shrink-0 text-left md:text-right w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-[#1e222b] md:border-0 pl-0 md:pl-4">
                     <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border border-${color}-500/30 text-${color}-400 bg-${color}-500/5`}>
                        {ev.type}
                     </span>
                     <div className="text-white font-bold text-sm tracking-wider font-mono bg-[#1a1d24] px-4 py-2 rounded-lg border border-[#2d323e]">
                        {getRelativeTime(ev.eventTime)}
                     </div>
                  </div>
               </div>
               );
            })}
         </div>
      </div>

    </div>
  );
}
