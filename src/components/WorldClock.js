"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";

export default function WorldClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatClock = (date, timeZone) => {
    try {
      const timeFmt = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);

      const dateFmt = new Intl.DateTimeFormat("en-US", {
        timeZone,
        month: "short",
        day: "numeric",
      }).format(date);

      return { time: timeFmt, date: dateFmt };
    } catch (e) {
      return { time: "--:--", date: "---" };
    }
  };

  const ClockBox = ({ tz, label, isMain = false }) => {
    const { time, date } = formatClock(currentTime, tz);
    
    if (isMain) {
      // Main UTC Clock
      const utcTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(currentTime);

      return (
        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl p-8 flex-1 text-center shadow-[0_0_30px_rgba(16,185,129,0.05)] border-t-2 border-t-emerald-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
          <div className="text-emerald-500 font-bold uppercase tracking-widest text-xs mb-4">Universal Coordinated Time (UTC)</div>
          <div className="text-5xl font-mono text-white tracking-tight mb-2 drop-shadow-md">{utcTime}</div>
          <div className="text-gray-500 font-medium">{formatClock(currentTime, "UTC").date}</div>
        </div>
      );
    }

    return (
      <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4 text-center hover:bg-[#1e222b]/50 transition-colors w-[140px] flex-shrink-0">
        <div className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-2 h-8 flex items-center justify-center">{label}</div>
        <div className="text-2xl font-mono text-white mb-1">{time}</div>
        <div className="text-gray-600 text-xs">{date}</div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#13161c] to-[#0a0c0f] border border-[#1e222b] p-8 shadow-2xl relative overflow-hidden mt-8">
      
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-8 relative z-10">
        <Globe className="text-emerald-500" size={28} />
        <h2 className="text-2xl font-bold text-white tracking-wide">Global Master Clock</h2>
      </div>

      <div className="flex flex-col gap-6 relative z-10">
        
        {/* Top Row Timezones */}
        <div className="flex flex-wrap justify-center gap-4">
          <ClockBox tz="America/Los_Angeles" label="Pacific (PT)" />
          <ClockBox tz="America/New_York" label="Eastern (ET)" />
          <ClockBox tz="Europe/Paris" label="Paris (CET)" />
          <ClockBox tz="Europe/Berlin" label="Germany (CET)" />
          <ClockBox tz="Europe/Warsaw" label="Poland (CET)" />
        </div>

        {/* Center UTC Block */}
        <div className="flex flex-wrap md:flex-nowrap justify-center gap-6 my-2 max-w-4xl mx-auto w-full">
          <ClockBox isMain={true} />
          
          {/* Converter Stub (Will attach logic if needed later) */}
          <div className="bg-[#0f1115] border border-dashed border-[#2d323e] rounded-2xl p-6 flex-1 flex flex-col justify-center text-center items-center">
             <div className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4">Time Converter (UTC)</div>
             <div className="flex items-center gap-3 w-full max-w-[250px]">
               <input type="time" className="bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-2 rounded-lg flex-1 text-lg font-mono text-center outline-none focus:border-indigo-500 transition-colors" />
               <button className="bg-[#1e222b] hover:bg-[#2d323e] text-white px-4 py-2 rounded-lg font-medium transition-colors">Clear</button>
             </div>
             <div className="text-gray-500 text-[10px] mt-4 uppercase">Enter a UTC time to freeze & convert</div>
          </div>
        </div>

        {/* Bottom Rows Timezones */}
        <div className="flex flex-wrap justify-center gap-4">
          <ClockBox tz="Asia/Riyadh" label="Riyadh (AST)" />
          <ClockBox tz="Asia/Ho_Chi_Minh" label="Vietnam (ICT)" />
          <ClockBox tz="Asia/Bangkok" label="Thailand (ICT)" />
          <ClockBox tz="Asia/Shanghai" label="China (CST)" />
          <ClockBox tz="Asia/Manila" label="Philippines (PHT)" />
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <ClockBox tz="Asia/Seoul" label="Korea (KST)" />
          <ClockBox tz="Asia/Tokyo" label="Japan (JST)" />
          <ClockBox tz="Australia/Sydney" label="Aus Eastern (AET)" />
        </div>

      </div>
    </div>
  );
}
