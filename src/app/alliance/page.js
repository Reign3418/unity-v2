"use client";

import { Shield, Users, Activity, Target, ShieldPlus, ChevronRight } from "lucide-react";

export default function AllianceDashboard() {
  const stats = [
    { label: "Overall Power", value: "24.5B", icon: Activity, color: "emerald", growth: "+1.2%" },
    { label: "Active Members", value: "148/150", icon: Users, color: "indigo", growth: "Stable" },
    { label: "Gift Level", value: "32", icon: Target, color: "amber", growth: "32%" },
    { label: "Daily Activity", value: "94%", icon: ShieldPlus, color: "rose", growth: "+4%" }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
          <div className="flex items-center gap-4">
             <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
               <Shield className="text-indigo-400" size={32} />
             </div>
             <div>
               <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                 [V-T] Void Vanguard
               </h1>
               <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Primary Combat Shell • Kingdom 3155</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest rounded-full">
              Status: Operational
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-[#13161c] border border-[#1e222b] rounded-xl p-6 shadow-lg border-t-2 border-t-${stat.color}-500 hover:-translate-y-1 transition-transform cursor-default group`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-${stat.color}-400 bg-${stat.color}-500/10`}>
                {stat.growth}
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</h3>
            <p className="text-3xl font-black text-white font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Alliance Roster Stub */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
           <h2 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
             <Users size={18} className="text-indigo-500" />
             Active Combat Roster
           </h2>
           <button className="text-[10px] text-gray-500 hover:text-indigo-400 font-bold uppercase tracking-widest transition-colors flex items-center">
             View All <ChevronRight size={14} />
           </button>
        </div>
        
        <div className="p-12 text-center">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#13161c] border border-[#1e222b] mb-4">
             <Shield className="text-gray-600" size={24} />
           </div>
           <h3 className="text-white font-bold text-lg mb-2">Roster Integration Pending</h3>
           <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
             Alliance roster parsing will be enabled in a future system update once the primary DynamoDB Discord Webhook architecture is finalized.
           </p>
        </div>
      </div>

    </div>
  );
}
