"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function WorldClock() {
  const t = useTranslations('WorldClock');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [converterInput, setConverterInput] = useState("");
  const [frozenTime, setFrozenTime] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayTime = frozenTime || currentTime;

  const handleTimeChange = (e) => {
    const val = e.target.value;
    setConverterInput(val);
    
    if (!val) {
      setFrozenTime(null);
      return;
    }
    
    const [hours, minutes] = val.split(':');
    
    // Create a new date based on today's UTC date, but with the requested time
    const now = new Date();
    const freezeDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      0
    ));
    
    setFrozenTime(freezeDate);
  };

  const handleClear = () => {
    setConverterInput("");
    setFrozenTime(null);
  };

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
    const { time, date } = formatClock(displayTime, tz);
    
    if (isMain) {
      // Main UTC Clock
      const utcTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: frozenTime ? undefined : "2-digit",
        hour12: false,
      }).format(displayTime);

      return (
        <div className={`bg-[#0a0c0f] border border-[#1e222b] rounded-2xl p-8 flex-1 text-center shadow-[0_0_30px_rgba(6,182,212,0.05)] border-t-2 ${frozenTime ? 'border-t-rose-500' : 'border-t-cyan-500'} relative overflow-hidden group transition-all`}>
          <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] pointer-events-none transition-colors ${frozenTime ? 'bg-rose-500/20 group-hover:bg-rose-500/30' : 'bg-cyan-500/10 group-hover:bg-cyan-500/20'}`}></div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
            <div className={`${frozenTime ? 'text-rose-500' : 'text-cyan-500'} font-bold uppercase tracking-widest text-xs transition-colors`}>{t('utc_label')}</div>
            {frozenTime && (
               <div className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-rose-500/30 shadow-sm">
                 {t('time_frozen')}
               </div>
            )}
          </div>

          <div className={`text-5xl font-mono text-white tracking-tight mb-2 drop-shadow-md ${frozenTime ? 'opacity-80' : ''}`}>{utcTime}{frozenTime ? ':00' : ''}</div>
          <div className="text-gray-500 font-medium">{formatClock(displayTime, "UTC").date}</div>
        </div>
      );
    }

    return (
      <div className={`bg-[#13161c] border border-[#1e222b] rounded-xl p-4 text-center hover:bg-[#1e222b]/50 transition-colors w-[140px] flex-shrink-0 ${frozenTime ? 'opacity-70 border-rose-500/20' : ''}`}>
        <div className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-2 h-8 flex items-center justify-center">{label}</div>
        <div className={`text-2xl font-mono mb-1 ${frozenTime ? 'text-rose-300' : 'text-white'}`}>{time}</div>
        <div className="text-gray-600 text-xs">{date}</div>
      </div>
    );
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-b from-[#13161c] to-[#0a0c0f] border ${frozenTime ? 'border-rose-500/30' : 'border-[#1e222b]'} p-8 shadow-2xl relative overflow-hidden mt-8 transition-colors`}>
      
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-8 relative z-10">
        <Globe className={frozenTime ? "text-rose-500" : "text-cyan-500"} size={28} />
        <h2 className="text-2xl font-bold text-white tracking-wide">
          {t('header')} {frozenTime && <span className="text-rose-500 opacity-70">{t('header_frozen')}</span>}
        </h2>
      </div>

      <div className="flex flex-col gap-6 relative z-10">
        
        {/* Top Row Timezones: Americas & Western Europe */}
        <div className="flex flex-wrap justify-center gap-4">
          <ClockBox tz="America/Los_Angeles" label="Pacific (PT)" />
          <ClockBox tz="America/Chicago" label="Central (CT)" />
          <ClockBox tz="America/New_York" label="Eastern (ET)" />
          <ClockBox tz="America/Sao_Paulo" label="Brazil (BRT)" />
          <ClockBox tz="Europe/London" label="London (GMT/BST)" />
          <ClockBox tz="Europe/Paris" label="Paris (CET)" />
          <ClockBox tz="Europe/Berlin" label="Germany (CET)" />
          <ClockBox tz="Europe/Warsaw" label="Poland (CET)" />
        </div>

        {/* Center UTC Block */}
        <div className="flex flex-wrap md:flex-nowrap justify-center gap-6 my-2 max-w-4xl mx-auto w-full">
          <ClockBox isMain={true} />
          
          {/* Converter Stub (Will attach logic if needed later) */}
          <div className={`bg-[#0f1115] border border-dashed ${frozenTime ? 'border-rose-500/50' : 'border-[#2d323e]'} rounded-2xl p-6 flex-1 flex flex-col justify-center text-center items-center transition-colors`}>
             <div className={`${frozenTime ? 'text-rose-400' : 'text-indigo-400'} font-bold uppercase tracking-widest text-xs mb-4`}>{t('converter_label')}</div>
             <div className="flex items-center gap-3 w-full max-w-[250px]">
               <input 
                 type="time" 
                 value={converterInput}
                 onChange={handleTimeChange}
                 className="bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-2 rounded-lg flex-1 text-lg font-mono text-center outline-none focus:border-indigo-500 transition-colors" 
               />
               <button 
                 onClick={handleClear}
                 className="bg-[#1e222b] hover:bg-[#2d323e] text-white px-4 py-2 rounded-lg font-medium transition-colors"
               >
                 {t('converter_btn')}
               </button>
             </div>
             <div className={`text-[10px] mt-4 uppercase ${frozenTime ? 'text-rose-500 font-bold' : 'text-gray-500'}`}>
               {frozenTime ? t('converter_frozen') : t('converter_placeholder')}
             </div>
          </div>
        </div>

        {/* Middle Row Timezones: Middle East & Eastern Europe */}
        <div className="flex flex-wrap justify-center gap-4">
          <ClockBox tz="Europe/Moscow" label="Moscow (MSK)" />
          <ClockBox tz="Europe/Istanbul" label="Turkey (TRT)" />
          <ClockBox tz="Asia/Riyadh" label="Riyadh (AST)" />
          <ClockBox tz="Asia/Dubai" label="Dubai (GST)" />
        </div>

        {/* Bottom Row Timezones: Asia-Pacific */}
        <div className="flex flex-wrap justify-center gap-4">
          <ClockBox tz="Asia/Ho_Chi_Minh" label="Vietnam (ICT)" />
          <ClockBox tz="Asia/Bangkok" label="Thailand (ICT)" />
          <ClockBox tz="Asia/Shanghai" label="China (CST)" />
          <ClockBox tz="Asia/Manila" label="Philippines (PHT)" />
          <ClockBox tz="Asia/Seoul" label="Korea (KST)" />
          <ClockBox tz="Asia/Tokyo" label="Japan (JST)" />
          <ClockBox tz="Australia/Sydney" label="Aus Eastern (AET)" />
        </div>

      </div>
    </div>
  );
}
