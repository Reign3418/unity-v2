"use client";

import { useState } from "react";
import { Timer, Wheat, Zap, Crown, BookOpen, Clock, AlertCircle, Trash2 } from "lucide-react";

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState("speedups");

  // State hooks for all calculators
  const [speedups, setSpeedups] = useState({ 
    "1m": 0, "5m": 0, "10m": 0, "15m": 0, 
    "30m": 0, "60m": 0, "3h": 0, "8h": 0, 
    "15h": 0, "24h": 0, "3d": 0, "7d": 0, "30d": 0 
  });
  
  const [resources, setResources] = useState({
    food: { "1K": 0, "10K": 0, "50K": 0, "150K": 0, "500K": 0, "1.5M": 0, "5M": 0 },
    wood: { "1K": 0, "10K": 0, "50K": 0, "150K": 0, "500K": 0, "1.5M": 0, "5M": 0 },
    stone: { "750": 0, "7.5K": 0, "37.5K": 0, "112.5K": 0, "375K": 0, "1.125M": 0, "3.75M": 0 },
    gold: { "500": 0, "5K": 0, "15K": 0, "50K": 0, "200K": 0, "600K": 0, "2M": 0 }
  });

  const [ap, setAp] = useState({ "50": 0, "100": 0, "500": 0, "1000": 0 });

  // Math engines
  const calculateTotalSpeedups = () => {
    let totalMinutes = 0;
    totalMinutes += (speedups["1m"] || 0) * 1;
    totalMinutes += (speedups["5m"] || 0) * 5;
    totalMinutes += (speedups["10m"] || 0) * 10;
    totalMinutes += (speedups["15m"] || 0) * 15;
    totalMinutes += (speedups["30m"] || 0) * 30;
    totalMinutes += (speedups["60m"] || 0) * 60;
    totalMinutes += (speedups["3h"] || 0) * 180;
    totalMinutes += (speedups["8h"] || 0) * 480;
    totalMinutes += (speedups["15h"] || 0) * 900;
    totalMinutes += (speedups["24h"] || 0) * 1440;
    totalMinutes += (speedups["3d"] || 0) * 4320;
    totalMinutes += (speedups["7d"] || 0) * 10080;
    totalMinutes += (speedups["30d"] || 0) * 43200;
    
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    
    return { days, hours, minutes, totalMinutes };
  };

  const speedupTotals = calculateTotalSpeedups();

  const handleSpeedupChange = (tier, val) => {
    setSpeedups(prev => ({ ...prev, [tier]: parseInt(val) || 0 }));
  };

  const handleApChange = (tier, val) => {
    setAp(prev => ({ ...prev, [tier]: parseInt(val) || 0 }));
  };

  const handleResourceChange = (type, tier, val) => {
    setResources(prev => ({
      ...prev,
      [type]: { ...prev[type], [tier]: parseInt(val) || 0 }
    }));
  };

  const calculateTotalRes = (type) => {
    let total = 0;
    const tierMap = {
      food: { "1K": 1000, "10K": 10000, "50K": 50000, "150K": 150000, "500K": 500000, "1.5M": 1500000, "5M": 5000000 },
      wood: { "1K": 1000, "10K": 10000, "50K": 50000, "150K": 150000, "500K": 500000, "1.5M": 1500000, "5M": 5000000 },
      stone: { "750": 750, "7.5K": 7500, "37.5K": 37500, "112.5K": 112500, "375K": 375000, "1.125M": 1125000, "3.75M": 3750000 },
      gold: { "500": 500, "5K": 5000, "15K": 15000, "50K": 50000, "200K": 200000, "600K": 600000, "2M": 2000000 }
    };

    for (const [tier, multiplier] of Object.entries(tierMap[type])) {
      total += (resources[type][tier] || 0) * multiplier;
    }
    return total;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  // UI Components
  const TabButton = ({ id, icon: Icon, label, color }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold transition-all duration-200 ${
        activeTab === id 
        ? `border-${color}-500 text-${color}-400 bg-${color}-500/5` 
        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10 w-full mb-2">
          <BookOpen className="text-indigo-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Unified Calculators</h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Inventory Projection Systems</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-[#0a0c0f] border border-[#1e222b] rounded-xl overflow-hidden px-2">
        <TabButton id="speedups" icon={Timer} label="Speedups" color="indigo" />
        <TabButton id="resources" icon={Wheat} label="Resources" color="amber" />
        <TabButton id="ap" icon={Zap} label="Action Points" color="emerald" />
      </div>

      {/* Content Area */}
      {activeTab === "speedups" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-[#1e222b] pb-4">
              <Timer className="text-indigo-500" size={20} /> Speedup Inventory Matrix
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Object.keys(speedups).map((tier) => (
                <div key={tier} className="bg-[#0a0c0f] border border-[#1e222b] p-3 rounded-lg flex flex-col items-center gap-2 group hover:border-indigo-500/40 transition-colors">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{tier} Items</div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={speedups[tier] || ""}
                    onChange={(e) => handleSpeedupChange(tier, e.target.value)}
                    className="w-full text-center bg-[#13161c] border border-[#1e222b] text-white font-mono rounded py-2 text-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={() => setSpeedups({ "1m": 0, "5m": 0, "10m": 0, "15m": 0, "30m": 0, "60m": 0, "3h": 0, "8h": 0, "15h": 0, "24h": 0, "3d": 0, "7d": 0, "30d": 0 })}
              className="mt-6 text-xs text-rose-500 hover:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear Form
            </button>
          </div>

          {/* Results Panel */}
          <div className="bg-[#13161c] border-x border-b border-t-2 border-t-indigo-500 rounded-xl p-6 shadow-xl sticky top-6">
            <h2 className="text-indigo-400 font-black text-xl mb-6 uppercase tracking-widest text-center">Total Time Yield</h2>
            
            <div className="space-y-4">
              <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-5 text-center shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] border-l-4 border-l-indigo-500">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Standard Display</div>
                <div className="text-2xl font-black text-white font-mono">
                  {speedupTotals.days}d {speedupTotals.hours}h {speedupTotals.minutes}m
                </div>
              </div>

              <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Hours</div>
                <div className="text-xl font-bold text-gray-300 font-mono">
                  {(speedupTotals.totalMinutes / 60).toLocaleString(undefined, {maximumFractionDigits: 1})} hrs
                </div>
              </div>

               <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Minutes</div>
                <div className="text-xl font-bold text-gray-300 font-mono">
                  {speedupTotals.totalMinutes.toLocaleString()} m
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "resources" && (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6">
            
            <div className="flex-1 space-y-8">
              {['food', 'wood', 'stone', 'gold'].map(type => (
                <div key={type} className="border border-[#1e222b] bg-[#0a0c0f] rounded-xl p-5 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    type === 'food' ? 'bg-amber-500' : type === 'wood' ? 'bg-emerald-600' : type === 'stone' ? 'bg-gray-400' : 'bg-yellow-400'
                  }`}></div>
                  
                  <div className="flex justify-between items-center mb-4 pl-4 border-b border-[#1e222b] pb-3">
                    <h3 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                       <Wheat size={16} className={
                         type === 'food' ? 'text-amber-500' : type === 'wood' ? 'text-emerald-600' : type === 'stone' ? 'text-gray-400' : 'text-yellow-400'
                       } /> 
                       {type}
                    </h3>
                    <div className="bg-[#1e222b] px-4 py-1.5 rounded-full font-mono font-black text-sm text-white shadow-lg">
                      {formatNumber(calculateTotalRes(type))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 pl-4">
                    {Object.keys(resources[type]).map(tier => (
                      <div key={tier} className="flex flex-col items-center gap-1 group">
                        <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{tier}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={resources[type][tier] || ""}
                          onChange={(e) => handleResourceChange(type, tier, e.target.value)}
                          className="w-full text-center bg-[#13161c] border border-[#1e222b] group-hover:border-amber-500/30 text-white font-mono rounded py-1.5 text-sm focus:border-amber-500 outline-none transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {activeTab === "ap" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-[#1e222b] pb-4">
              <Zap className="text-emerald-500" size={20} /> Action Point Reserve Math
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['50', '100', '500', '1000'].map(tier => (
                <div key={tier} className="bg-[#0a0c0f] border border-[#1e222b] p-4 rounded-lg flex flex-col items-center gap-2 group hover:border-emerald-500/40 transition-colors">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{tier} AP Vials</div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={ap[tier] || ""}
                    onChange={(e) => handleApChange(tier, e.target.value)}
                    className="w-full text-center bg-[#13161c] border border-[#1e222b] text-white font-mono rounded py-2 text-xl focus:border-emerald-500 outline-none"
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-8 bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg flex items-start gap-4">
               <AlertCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" />
               <p className="text-xs text-emerald-400 font-bold leading-relaxed">
                 During KvK and major hunting events, you should aim to maintain at least 150,000 Action Points in reserves to secure honor targets.
               </p>
            </div>
          </div>

          <div className="bg-[#13161c] border-x border-b border-t-2 border-t-emerald-500 rounded-xl p-6 shadow-xl sticky top-6">
            <h2 className="text-emerald-400 font-black text-xl mb-6 uppercase tracking-widest text-center">Total Reserves</h2>
            
            <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-6 text-center shadow-[inset_0_0_30px_rgba(16,185,129,0.05)] border-l-4 border-l-emerald-500 mb-6">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Total Action Points</div>
              <div className="text-4xl font-black text-white font-mono break-all line-clamp-1">
                {((ap['50']||0)*50 + (ap['100']||0)*100 + (ap['500']||0)*500 + (ap['1000']||0)*1000).toLocaleString()} <span className="text-emerald-500">AP</span>
              </div>
            </div>

            <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 text-center">
               <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Max Marauder Marches (140 AP)</div>
               <div className="text-xl font-bold text-gray-300 font-mono">
                 {Math.floor(((ap['50']||0)*50 + (ap['100']||0)*100 + (ap['500']||0)*500 + (ap['1000']||0)*1000) / 140).toLocaleString()}
               </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
