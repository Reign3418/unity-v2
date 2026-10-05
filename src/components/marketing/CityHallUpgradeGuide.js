"use client";

import { useState, useMemo } from "react";
import { 
  Castle, Shield, Zap, Search, CheckCircle, ChevronRight, AlertTriangle, 
  Crown, Sparkles, BookOpen, Clock, Building, Compass, ArrowRight,
  Flame, CheckSquare, Layers, Award, Target
} from "lucide-react";

// Master data for City Hall 1 to 25
const CH_DATA = [
  { level: 1, wall: 0, reqBuilding: "None", reqLevel: 0, depNote: "Starting point", perks: "Initial Governor Settlement", tier: "early" },
  { level: 2, wall: 1, reqBuilding: "Farm", reqLevel: 1, depNote: "Free tutorial", perks: "Unlock Basic Gathering", tier: "early" },
  { level: 3, wall: 2, reqBuilding: "Lumber Mill", reqLevel: 2, depNote: "Wood Gathering", perks: "Scout Camp Level 3", tier: "early" },
  { level: 4, wall: 3, reqBuilding: "Archery Range", reqLevel: 3, depNote: "Lumber Mill 3", perks: "Archers & 2nd March Queue", tier: "early" },
  { level: 5, wall: 4, reqBuilding: "Hospital", reqLevel: 4, depNote: "Stone/Wood", perks: "Severely Wounded Capacity up", tier: "early" },
  { level: 6, wall: 5, reqBuilding: "Tavern", reqLevel: 5, depNote: "Quarry 5", perks: "Iron Age unlocked, +1 Scout Queue", tier: "early" },
  { level: 7, wall: 6, reqBuilding: "Quarry", reqLevel: 6, depNote: "Stone mine", perks: "Stone resource tiles available", tier: "early" },
  { level: 8, wall: 7, reqBuilding: "Barracks", reqLevel: 7, depNote: "Farm 7", perks: "Troop training capacity boost", tier: "early" },
  { level: 9, wall: 8, reqBuilding: "Alliance Center", reqLevel: 8, depNote: "Crucial for helps", perks: "More helps from alliance mates", tier: "early" },
  { level: 10, wall: 9, reqBuilding: "Academy", reqLevel: 9, depNote: "Barracks 9", perks: "Dark Age unlocked; Military Tech speed", tier: "early" },
  { level: 11, wall: 10, reqBuilding: "Hospital", reqLevel: 10, depNote: "Tavern 10", perks: "3rd March Queue Unlocked", tier: "mid" },
  { level: 12, wall: 11, reqBuilding: "Storehouse", reqLevel: 11, depNote: "Quarry 11", perks: "Plunder protection upgraded", tier: "mid" },
  { level: 13, wall: 12, reqBuilding: "Archery Range", reqLevel: 12, depNote: "Lumber Mill 12", perks: "Troop training scale", tier: "mid" },
  { level: 14, wall: 13, reqBuilding: "Trading Post", reqLevel: 13, depNote: "Alliance Center 13", perks: "Lower alliance resource transport tax", tier: "mid" },
  { level: 15, wall: 14, reqBuilding: "Scout Camp", reqLevel: 14, depNote: "Fog Clearing Speed", perks: "Kingdom fog clearing efficiency", tier: "mid" },
  { level: 16, wall: 15, reqBuilding: "Academy", reqLevel: 15, depNote: "Feudal Age", perks: "Feudal Age; Tier 3 (T3) Troops Unlocked", tier: "mid" },
  { level: 17, wall: 16, reqBuilding: "Hospital", reqLevel: 16, depNote: "Hospital Bed Expansion", perks: "4th March Queue Unlocked", tier: "mid" },
  { level: 18, wall: 17, reqBuilding: "Barracks", reqLevel: 17, depNote: "Farm 17", perks: "Higher power rating & troop queue", tier: "t4" },
  { level: 19, wall: 18, reqBuilding: "Archery Range", reqLevel: 18, depNote: "Lumber Mill 18", perks: "Preparation for Tier 4 research", tier: "t4" },
  { level: 20, wall: 19, reqBuilding: "Siege Workshop", reqLevel: 19, depNote: "Gold Mine 19", perks: "T4 Battering Ram access", tier: "t4" },
  { level: 21, wall: 20, reqBuilding: "Academy", reqLevel: 20, depNote: "Hospital 20, Watchtower 20", perks: "Tier 4 (T4) Troops Unlocked (Major Power Spike)", tier: "t4" },
  { level: 22, wall: 21, reqBuilding: "Hospital", reqLevel: 21, depNote: "Tavern 21", perks: "5th March Queue Unlocked (Maximum Regular Marches)", tier: "endgame" },
  { level: 23, wall: 22, reqBuilding: "Storehouse", reqLevel: 22, depNote: "Quarry 22", perks: "Higher resource protection & troop pool", tier: "endgame" },
  { level: 24, wall: 23, reqBuilding: "Archery Range", reqLevel: 23, depNote: "Lumber Mill 23", perks: "Training speed +20%, Final bridge to CH 25", tier: "endgame" },
  { level: 25, wall: 24, reqBuilding: "Trading Post", reqLevel: 24, depNote: "Watchtower 24, Gold Mine 24", perks: "Academy 25 Prereq, T5 Troops Gate, Max Base Stats", tier: "endgame" }
];

export default function CityHallUpgradeGuide() {
  const [startLevel, setStartLevel] = useState(16);
  const [targetLevel, setTargetLevel] = useState(22);
  const [searchTerm, setSearchTerm] = useState("");
  const [eraFilter, setEraFilter] = useState("all");
  const [checkedSteps, setCheckedSteps] = useState({});

  // Dynamic calculations for planner
  const handleStartChange = (val) => {
    const s = parseInt(val, 10);
    setStartLevel(s);
    if (s >= targetLevel) {
      const nextTarget = Math.min(25, s + 1);
      setTargetLevel(nextTarget);
    }
  };

  const handleTargetChange = (val) => {
    const t = parseInt(val, 10);
    setTargetLevel(t);
    if (t <= startLevel) {
      const nextStart = Math.max(1, t - 1);
      setStartLevel(nextStart);
    }
  };

  const handleQuickRush = (start, target) => {
    setStartLevel(start);
    setTargetLevel(target);
  };

  const toggleStep = (lvl) => {
    setCheckedSteps(prev => ({
      ...prev,
      [lvl]: !prev[lvl]
    }));
  };

  // Planner steps
  const plannerSteps = useMemo(() => {
    return CH_DATA.filter(d => d.level > startLevel && d.level <= targetLevel);
  }, [startLevel, targetLevel]);

  // Bottlenecks en route
  const bottlenecks = useMemo(() => {
    const list = [];
    plannerSteps.forEach(s => {
      if (s.level === 21) list.push("Academy 21 & Hospital 20");
      if (s.level === 22) list.push("Hospital 21");
      if (s.level === 25) list.push("Trading Post 24 + Master's Blueprints");
    });
    return list.length ? list.join(", ") : "Standard resource progression";
  }, [plannerSteps]);

  // Goal Title & Description
  const goalInfo = useMemo(() => {
    if (targetLevel >= 25) {
      return {
        title: "The Pinnacle: Tier 5 Gateway (CH 25)",
        desc: "Reaching CH 25 unlocks max building buffs, 200,000 baseline troop capacity, and qualifies you for Academy 25 (T5 Troops). Note the 3 Master's Blueprints requirement."
      };
    } else if (targetLevel >= 22) {
      return {
        title: "Maximum March Utility (CH 22)",
        desc: "Unlocking your 5th march queue multiplies gathering income and battlefield influence by 25%. Rush straight here before maxing other production buildings."
      };
    } else if (targetLevel >= 21) {
      return {
        title: "Battlefield Spike: Tier 4 Troops (CH 21)",
        desc: "T4 units have drastically higher base stats and are mandatory for Ark of Osiris, Expedition, and Kingdom defense."
      };
    } else if (targetLevel >= 16) {
      return {
        title: "Feudal Era: Tier 3 Unlock (CH 16)",
        desc: "Reaching CH 16 gets you into the Feudal Age, unlocking T3 units and standard alliance center help scales."
      };
    }
    return {
      title: "Kingdom Foundations",
      desc: "Early economy rush. Keep your 2nd builder active 24/7 with VIP 6."
    };
  }, [targetLevel]);

  // Filtered table rows
  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return CH_DATA.filter(item => {
      if (item.level === 1) return false;
      const matchesTerm = (
        item.level.toString().includes(term) ||
        item.reqBuilding.toLowerCase().includes(term) ||
        item.perks.toLowerCase().includes(term) ||
        item.depNote.toLowerCase().includes(term)
      );
      const matchesEra = (eraFilter === 'all') || (item.tier === eraFilter);
      return matchesTerm && matchesEra;
    });
  }, [searchTerm, eraFilter]);

  return (
    <div id="city-hall-guide" className="w-full bg-[#070a0f] text-slate-200 border-t border-[#1e222b] relative overflow-hidden font-sans">
      
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08)_0%,transparent_70%)] pointer-events-none"></div>

      {/* ── SECTION 1: HEADER & MILESTONE BANNER ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
        
        {/* Navigation Bar inside the guide */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-10 border-b border-[#1e293b]/70 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#997A15] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-[#F3E5AB]/40">
              <Castle className="w-6 h-6 text-black" />
            </div>
            <div>
              <span className="font-cinzel text-xl font-bold tracking-wider gold-gradient-text">ROK MASTERY</span>
              <span className="hidden sm:inline-block text-[11px] uppercase tracking-widest text-slate-400 ml-3 border-l border-slate-700 pl-3 font-mono">
                City Hall Strategy Codex
              </span>
            </div>
          </div>
          
          <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <a href="#ch-milestones" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition">Milestones</a>
            <a href="#ch-planner" className="px-3 py-1.5 rounded-lg text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition flex items-center gap-1.5">
              <Sparkles size={12} /> Interactive Planner
            </a>
            <a href="#ch-roadmap" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition">Full Tree (1-25)</a>
            <a href="#ch-bottlenecks" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition">Bottlenecks</a>
            <a href="#ch-optimization" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition">Speedup Rules</a>
          </nav>
        </div>

        {/* Hero Title */}
        <div id="ch-milestones" className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping"></span>
            Public Free Tool • No Login Required
          </div>
          <h2 className="font-cinzel text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 text-white">
            CITY HALL <span className="gold-gradient-text">UPGRADE CODEX</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Rushing City Hall is the single most vital meta-strategy in Rise of Kingdoms. Unlock higher march queues, T4/T5 troop tiers, maximized Alliance Help efficiency, and territory dominance.
          </p>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="bg-[#121826]/90 p-5 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/40 transition group">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">Troop Breakthrough</span>
              <div className="text-2xl font-bold font-cinzel text-[#D4AF37] mt-1 group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">CH 16 / 21</div>
              <p className="text-xs text-slate-400 mt-1">T3 Troops at CH16; decisive T4 power spike at CH21.</p>
            </div>
            <div className="bg-[#121826]/90 p-5 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/40 transition group">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">March Capacity</span>
              <div className="text-2xl font-bold font-cinzel text-[#D4AF37] mt-1 group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">5 Marches</div>
              <p className="text-xs text-slate-400 mt-1">CH 22 permanently grants 5th march for gathering & combat.</p>
            </div>
            <div className="bg-[#121826]/90 p-5 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/40 transition group">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">Speedup Mastery</span>
              <div className="text-2xl font-bold font-cinzel text-[#D4AF37] mt-1 group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">30+ Helps</div>
              <p className="text-xs text-slate-400 mt-1">High Alliance Center cuts hundreds of hours per build.</p>
            </div>
            <div className="bg-[#121826]/90 p-5 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/40 transition group">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">Ultimate Peak</span>
              <div className="text-2xl font-bold font-cinzel text-[#D4AF37] mt-1 group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">CH 25</div>
              <p className="text-xs text-slate-400 mt-1">Unlocks Academy 25 requirement for Tier 5 military tech.</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── SECTION 2: INTERACTIVE PLANNER & CHECKLIST ── */}
      <div id="ch-planner" className="py-16 bg-[#0B0F19] border-t border-b border-[#1E293B] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#D4AF37] tracking-widest flex items-center gap-1.5">
                <Target size={14} /> Interactive Rush Tool
              </span>
              <h3 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">City Hall Rush Planner</h3>
              <p className="text-sm text-slate-400">Select your current level and target goal to discover the direct prerequisite chain.</p>
            </div>
            
            {/* Planner Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-[#121826] p-3 rounded-2xl border border-[#1E293B] shadow-xl">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Current CH</label>
                <select 
                  value={startLevel} 
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#D4AF37] font-mono cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map(lvl => (
                    <option key={lvl} value={lvl}>CH {lvl}</option>
                  ))}
                </select>
              </div>
              <div className="text-slate-500 font-bold self-end pb-1.5">➔</div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Target CH</label>
                <select 
                  value={targetLevel} 
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#D4AF37] font-mono cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 2).map(lvl => (
                    <option key={lvl} value={lvl}>CH {lvl}</option>
                  ))}
                </select>
              </div>

              {/* Quick Rush Action Buttons */}
              <div className="flex items-end gap-1.5 pt-4 sm:pt-0">
                <button 
                  onClick={() => handleQuickRush(16, 21)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
                    startLevel === 16 && targetLevel === 21
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  Rush 21 (T4)
                </button>
                <button 
                  onClick={() => handleQuickRush(16, 22)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
                    startLevel === 16 && targetLevel === 22
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  Rush 22 (5Q)
                </button>
                <button 
                  onClick={() => handleQuickRush(21, 25)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition font-bold ${
                    startLevel === 21 && targetLevel === 25
                      ? 'bg-[#D4AF37] text-black border-[#F3E5AB]'
                      : 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border-[#D4AF37]/40'
                  }`}
                >
                  Rush 25 (T5)
                </button>
              </div>
            </div>
          </div>

          {/* Planner Results Card */}
          <div className="bg-[#121826] rounded-3xl border border-[#1E293B] p-6 lg:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-8">
              
              {/* Summary Left Column */}
              <div className="lg:w-1/3 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Path Progression</span>
                    <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                      CH {startLevel} ➔ CH {targetLevel}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold font-cinzel text-white mb-2">{goalInfo.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {goalInfo.desc}
                  </p>

                  <div className="space-y-3">
                    <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Layers size={20} />
                        </span>
                        <div>
                          <div className="text-[11px] text-slate-400">Total CH Stages</div>
                          <div className="text-lg font-bold text-white font-mono">{plannerSteps.length} Upgrades</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle size={20} />
                        </span>
                        <div>
                          <div className="text-[11px] text-slate-400">Bottlenecks En Route</div>
                          <div className="text-xs font-semibold text-amber-300 mt-0.5">{bottlenecks}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Golden Rule Callout */}
                <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/10 to-transparent border-l-4 border-[#D4AF37] text-xs">
                  <span className="font-bold text-[#D4AF37] uppercase block mb-1 flex items-center gap-1.5">
                    <Crown size={14} /> Rushing Rule of Thumb
                  </span>
                  <span className="text-slate-300 leading-relaxed">
                    Only upgrade the exact mandatory secondary building required for the next CH. Do NOT level every farm or secondary barrack until your CH milestone is locked.
                  </span>
                </div>
              </div>

              {/* Dynamic Steps Right Column */}
              <div className="lg:w-2/3 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <CheckSquare size={16} className="text-[#D4AF37]" /> Required Upgrade Steps (Wall + Prerequisite)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Check off as you build in-game</span>
                </div>
                
                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                  {plannerSteps.map(step => {
                    const isChecked = !!checkedSteps[step.level];
                    return (
                      <div 
                        key={step.level}
                        onClick={() => toggleStep(step.level)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                          isChecked 
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300' 
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                            isChecked ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-slate-800 border-slate-600'
                          }`}>
                            {isChecked && <CheckCircle size={14} className="stroke-[3]" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold flex items-center gap-2">
                              <span className={isChecked ? 'line-through text-slate-500' : 'text-white'}>
                                Upgrade to CH {step.level}
                              </span>
                              <span className="text-[11px] font-normal text-slate-400">({step.perks})</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Build: <span className="text-[#D4AF37] font-semibold">Wall Lv. {step.wall}</span> + <span className="text-[#D4AF37] font-semibold">{step.reqBuilding} Lv. {step.reqLevel}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          Step {step.level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── SECTION 3: COMPLETE CITY HALL ROADMAP TABLE (1 - 25) ── */}
      <div id="ch-roadmap" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold uppercase text-[#D4AF37] tracking-widest flex items-center gap-1.5">
              <BookOpen size={14} /> Master Database
            </span>
            <h3 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">Complete City Hall Upgrade Tree (1 - 25)</h3>
            <p className="text-sm text-slate-400">Detailed requirements: Every City Hall level requires the Wall at the previous level plus one critical secondary building.</p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search (e.g. T4, Academy, Hospital)..." 
                className="bg-[#121826] border border-slate-700 text-sm rounded-xl px-4 py-2 w-64 text-white focus:outline-none focus:border-[#D4AF37] placeholder:text-slate-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            
            <select 
              value={eraFilter}
              onChange={(e) => setEraFilter(e.target.value)}
              className="bg-[#121826] border border-slate-700 text-sm rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="early">CH 1 - 10 (Early Age)</option>
              <option value="mid">CH 11 - 17 (T3 Push)</option>
              <option value="t4">CH 18 - 21 (T4 Unlock)</option>
              <option value="endgame">CH 22 - 25 (Endgame & T5)</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-[#121826] rounded-3xl border border-[#1E293B] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-[#1E293B]">
                  <th className="py-4 px-4 font-semibold text-center w-24">Target CH</th>
                  <th className="py-4 px-4 font-semibold">Wall Level</th>
                  <th className="py-4 px-4 font-semibold">Secondary Prerequisite</th>
                  <th className="py-4 px-4 font-semibold">Previous Chain Dep.</th>
                  <th className="py-4 px-6 font-semibold">Major Unlocks & Advantages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No building requirements found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(row => {
                    let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
                    if (row.level === 16) badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/40";
                    if (row.level === 21) badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/40";
                    if (row.level === 22) badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
                    if (row.level === 25) badgeColor = "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/50 font-bold shadow-[0_0_10px_rgba(212,175,55,0.2)]";

                    return (
                      <tr key={row.level} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold border ${badgeColor}`}>
                            CH {row.level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          Wall Lv. {row.wall}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white">{row.reqBuilding}</span>
                          <span className="text-xs text-[#D4AF37] font-mono ml-1.5 font-bold">Lv. {row.reqLevel}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {row.depNote}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="text-xs font-medium text-slate-200">{row.perks}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: BOTTLENECKS & SPECIAL ITEM GATES ── */}
      <div id="ch-bottlenecks" className="py-16 bg-[#090D15] border-t border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase text-rose-500 tracking-widest flex items-center justify-center gap-1.5">
              <AlertTriangle size={14} /> Critical Alert
            </span>
            <h3 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">The 3 Great Progression Walls</h3>
            <p className="text-sm text-slate-400 mt-2">Many governors get stuck for months by ignoring special items required for prerequisite structures. Prepare early.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bottleneck 1: Watchtower */}
            <div className="bg-[#121826] rounded-3xl p-6 border border-slate-800 hover:border-[#D4AF37]/50 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Watchtower Gate</span>
                  <span className="text-xs text-slate-400 font-mono">10 Gems each</span>
                </div>
                <h4 className="text-lg font-bold font-cinzel text-white mb-2">Arrows of Resistance</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Watchtower upgrades require Arrows of Resistance. Since Wall level is locked behind Watchtower at later levels, you cannot reach CH 25 without a Level 24 Watchtower.
                </p>
              </div>
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Main Acquisition:</span>
                  <span className="font-semibold text-white">Lohar & Barbs</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gem Cost:</span>
                  <span className="font-semibold text-rose-400">10 Gems / Arrow</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800 leading-relaxed">
                  Tip: Chain barbarian rallies during Lohar events to stockpile bone necklaces for free arrows without spending precious gems.
                </p>
              </div>
            </div>

            {/* Bottleneck 2: Castle */}
            <div className="bg-[#121826] rounded-3xl p-6 border border-slate-800 hover:border-[#D4AF37]/50 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">T5 Tech Prerequisite</span>
                  <span className="text-xs text-slate-400 font-mono">10 Gems each</span>
                </div>
                <h4 className="text-lg font-bold font-cinzel text-white mb-2">Books of Covenant</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Required to upgrade your Castle. While not directly needed for CH 25, Castle 25 is an absolute requirement for Academy 25 (the gateway to Tier 5 troops).
                </p>
              </div>
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Main Acquisition:</span>
                  <span className="font-semibold text-white">Barbarian Forts</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gem Cost:</span>
                  <span className="font-semibold text-rose-400">10 Gems / Book</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800 leading-relaxed">
                  Tip: Constantly launch and join level 4/5 Barbarian Forts with alliance members to passively stack books without bleeding gems.
                </p>
              </div>
            </div>

            {/* Bottleneck 3: Master Blueprint */}
            <div className="bg-[#121826] rounded-3xl p-6 border border-slate-800 hover:border-[#D4AF37]/50 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Building 25 Token</span>
                  <span className="text-xs text-slate-400 font-mono">2,000 Gems each</span>
                </div>
                <h4 className="text-lg font-bold font-cinzel text-white mb-2">Master's Blueprints</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Every building upgrade from Level 24 to 25 demands exactly 1 Master's Blueprint. To get CH 25, you need at least 3 blueprints (Trading Post, Wall, CH).
                </p>
              </div>
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Cost Per Item:</span>
                  <span className="font-semibold text-[#D4AF37]">2,000 Gems Flat</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Location:</span>
                  <span className="font-semibold text-white">Shop / VIP Shop</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800 leading-relaxed">
                  Tip: Buy these during "More Than Gems" (MTG) event to earn golden commander heads while fulfilling required purchases.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── SECTION 5: SPEEDUP PROTOCOL & VIP MULTIPLIERS ── */}
      <div id="ch-optimization" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase text-[#D4AF37] tracking-widest flex items-center justify-center gap-1.5">
            <Zap size={14} /> Efficiency Multipliers
          </span>
          <h3 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">Speedup & Buff Stacking Protocol</h3>
          <p className="text-sm text-slate-400 mt-2">Never start a multi-day building upgrade "raw". Applying buffs in correct order saves weeks of precious building speedups.</p>
        </div>

        {/* 4 Step Stacking Workflow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-[#121826] p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center font-bold text-[#D4AF37] mb-3">1</div>
            <h5 className="font-bold text-white text-sm mb-1">Building Rune</h5>
            <p className="text-xs text-slate-400">Defeat Holy Site guardians. Pick up a 10% to 15% Building Speed Rune immediately before initiating.</p>
          </div>

          <div className="bg-[#121826] p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center font-bold text-[#D4AF37] mb-3">2</div>
            <h5 className="font-bold text-white text-sm mb-1">Kingdom Titles</h5>
            <p className="text-xs text-slate-400">Request the <strong>Architect</strong> title (+10% Speed) or <strong>Duke</strong> (+5% speed) via Kingdom chat queue.</p>
          </div>

          <div className="bg-[#121826] p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center font-bold text-[#D4AF37] mb-3">3</div>
            <h5 className="font-bold text-white text-sm mb-1">Alliance Buff</h5>
            <p className="text-xs text-slate-400">Ensure your city is rooted on Alliance territory. Ask officers to activate the alliance building skill.</p>
          </div>

          <div className="bg-[#121826] p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center font-bold text-rose-400 mb-3">4</div>
            <h5 className="font-bold text-white text-sm mb-1">Helps First!</h5>
            <p className="text-xs text-slate-400"><strong>NEVER</strong> apply speedups immediately. Wait until Alliance helps hit 100% capacity before burning items.</p>
          </div>
        </div>

        {/* VIP Milestones & Alliance Center Math */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* VIP Priorities */}
          <div className="bg-[#121826] p-7 rounded-3xl border border-slate-800">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
                <Crown size={24} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-cinzel">VIP Milestones Priority</h4>
                <span className="text-xs text-slate-400">Where free gems should go early game</span>
              </div>
            </div>
            
            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[#D4AF37] font-bold font-mono">VIP 6:</span>
                <span><strong>Permanent 2nd Builder Queue.</strong> RUSH THIS WITH GEMS IMMEDIATELY. Never spend gems on tavern keys; rush VIP 6 on day 1 to double construction velocity forever.</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[#D4AF37] font-bold font-mono">VIP 10:</span>
                <span>Unlocks <strong>1 Free Legendary Commander Sculpture per day</strong> + 15% Building Speed buff.</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[#D4AF37] font-bold font-mono">VIP 12:</span>
                <span>Grants <strong>2 Free Legendary Commander Sculptures per day</strong>. The staple benchmark for competitive low-spenders.</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[#D4AF37] font-bold font-mono">VIP 14:</span>
                <span>Grants <strong>3 Free Legendary Commander Sculptures per day</strong>.</span>
              </li>
            </ul>
          </div>

          {/* Alliance Center Math */}
          <div className="bg-[#121826] p-7 rounded-3xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white font-cinzel">Alliance Center Math</h4>
                  <span className="text-xs text-slate-400">The hidden speedup engine</span>
                </div>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Each Alliance Help reduces remaining time by <span className="text-[#D4AF37] font-semibold">1% of total duration or 1 minute</span> (whichever is greater).
              </p>

              <div className="space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">At CH 20 (Alliance Center 20):</span>
                  <span className="font-bold text-white">24 Helps = ~21.5% reduction</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">At CH 25 (Alliance Center 25):</span>
                  <span className="font-bold text-[#D4AF37]">30 Helps = ~26.0% reduction</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 text-xs text-slate-300">
              <span className="font-bold text-blue-400 block mb-1">Example in Practice:</span>
              On a 10-day (240 hour) upgrade at level 25, 30 helps will automatically erase over <strong>62 hours of build time</strong> for free. If you use speedups first, you lose all that value!
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
