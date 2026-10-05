"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, BookOpen, AlertOctagon, Sparkles, Crown, Swords, 
  Wheat, Calculator, Check, ArrowRight, Zap, Target, Star, Flame,
  Clock, Shield, Award, Users, ChevronDown, ChevronUp, Info
} from "lucide-react";

// Top 7 Golden Traps & Rules
const GOLDEN_RULES = [
  {
    id: 1,
    title: "Never Spend Gems on Tavern Gold Chests",
    tag: "Gem Discipline",
    severity: "Critical",
    summary: "Gold keys drop naturally every single day from dailies and events. Gems must go to VIP points.",
    detail: "On Day 1, dump free gems straight into VIP to hit VIP 6 immediately. This unlocks the permanent 2nd Builder Queue. After VIP 6, stockpile gems exclusively for the 'More Than Gems' (MTG) event to purchase 8-hour speedups, Master's Blueprints, or push toward VIP 10 (1 free gold head/day) and VIP 12 (2 free gold heads/day).",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30"
  },
  {
    id: 2,
    title: "The Universal Gold Sculpture Law",
    tag: "Commander Economy",
    severity: "Strict Rule",
    summary: "NEVER use universal gold heads on commanders obtainable from the golden tavern chest.",
    detail: "Commanders like Charles Martel, Julius Caesar, El Cid, Cao Cao, and Cleopatra can be unlocked and maxed over time for free from gold keys. Every universal gold head you acquire must be hoarded for Wheel of Fortune or Season of Conquest powerhouse commanders (e.g. YSG, Alexander the Great, Scipio Prime, Nevsky). Wasting 50 gold heads on Caesar early on permanently damages your late-game account.",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30"
  },
  {
    id: 3,
    title: "Always Max the 1st Skill Before Starring Up (5/1/1/1)",
    tag: "Skill Allocation",
    severity: "Mechanics",
    summary: "The active 1st skill is 80% of a commander's combat power. Never unlock star 2 until skill 1 is level 5.",
    detail: "When you upgrade a commander's star rating from 1 to 2 stars, all future skill upgrades are assigned randomly between skill 1 and skill 2. If skill 1 is only level 2 or 3, your precious sculptures might upgrade secondary utility skills instead of the primary nuke. Keep the commander at Level 10 / 1 Star until their 1st skill hits 5/5.",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30"
  },
  {
    id: 4,
    title: "Start as China for the 5% Construction Buff",
    tag: "Starting Civ",
    severity: "Account Meta",
    summary: "China gives you Sun Tzu (the best epic commander in the game) plus a permanent +5% building speed.",
    detail: "Building City Hall and prerequisite structures to level 25 takes hundreds of real-time days. China's passive +5% building speed buff shaves weeks of building speedups off your account progression. Once you reach City Hall 25, you can consume your free Civilization Swap token to switch to Germany (5% AP recovery + 5% training speed) or France (healing speed).",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30"
  },
  {
    id: 5,
    title: "Rush Gathering Commanders Straight to Level 37",
    tag: "Economy Engine",
    severity: "Gathering",
    summary: "Get Constance, Gaius Marius, Sarka, and Centurion to Level 37 to unlock the 'Superior Tools' talent.",
    detail: "You do not need military stats on gatherers. Invest green and blue commander exp to push each gathering commander to exactly Level 37. This grants enough talent points to reach the final node in the Gathering tree ('Superior Tools'), giving +25% gathering speed across all resource types plus 6% extra resources on completion.",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
  },
  {
    id: 6,
    title: "Never Let Action Points (AP) Sit at 1,000 Cap",
    tag: "Stamina Waste",
    severity: "Daily Routine",
    summary: "Capped AP is wasted commander experience, speedups, blueprints, and materials.",
    detail: "AP regenerates every second. If your bar is at 1,000/1,000, you are bleeding free resources. Use peacekeeping commanders (Lohar, Markswoman, Boudica, or Aethelflaed) to hunt barbarians. With Lohar's AP cost reduction and bonus experience, you can power-level commanders while stockpiling arrows, gems, and speedups.",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
  },
  {
    id: 7,
    title: "Create at Least One Dedicated Farm Account",
    tag: "War Logistics",
    severity: "Kingdom Longevity",
    summary: "One single city cannot generate enough food and gold to sustain serious KvK open-field fighting.",
    detail: "Create a 2nd character in your same kingdom right away. Keep this 'Farm' focused purely on resource production, gathering talents, and trading post upgrades. In KvK 1, a single hour of intensive fighting can cost 100M+ food and wood in hospital heal bills. Your farm account will provide the resources while your main account spends gems on combat tech.",
    badgeColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
  }
];

// Top 5 Epic Commanders
const TOP_EPIC_COMMANDERS = [
  {
    name: "Sun Tzu",
    role: "Infantry / Skill Nuke / Garrison",
    civ: "China",
    why: "The undisputed King of Epics. His active skill hits up to 5 targets for 800 damage factor each, restores 50 rage per target struck, and boosts all skill damage dealt by your army by +20%. He remains competitive even in KvK Season of Conquest!",
    topPair: "Bjorn Ironside (Primary) + Sun Tzu (Secondary)",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40"
  },
  {
    name: "Bjorn Ironside",
    role: "Infantry / Skill Debuffer",
    civ: "Vikings",
    why: "Deals direct damage to a single target and immediately amplifies all subsequent skill damage taken by the target by +10% for 3 seconds. When paired with Sun Tzu as secondary, Sun Tzu's massive AoE fires during this vulnerability window!",
    topPair: "Bjorn Ironside + Sun Tzu",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40"
  },
  {
    name: "Joan of Arc",
    role: "Support / Army Buff Engine",
    civ: "France",
    why: "Her active skill buffs all nearby friendly troops: Infantry HP +30%, Cavalry Defense +30%, Archer Attack +30%, and restores 200 rage over 4 seconds. She is the ultimate murder-ball multiplier for canyon, Ark of Osiris, and open field.",
    topPair: "Scipio Africanus + Joan of Arc",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40"
  },
  {
    name: "Baibars",
    role: "Cavalry / Open-Field AoE & Slow",
    civ: "Arabia",
    why: "The only epic cavalry commander with true AoE. Deals up to 1,000 damage factor to 5 targets and slows enemy march speed by 50% for 2 seconds. In addition, his passive grants +50% march speed after leaving battle, making him lethal for open field hit-and-run.",
    topPair: "Pelagius + Baibars",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
  },
  {
    name: "Pelagius",
    role: "Cavalry / Sustain & Rage Engine",
    civ: "Spain",
    why: "Offers consistent cavalry defense, steady healing over 2 turns, and rage restoration (100 rage over 2 seconds) upon skill cast. Highly reliable primary commander for early cavalry marches.",
    topPair: "Pelagius + Baibars or Belisarius",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
  }
];

export default function BeginnerCodex() {
  const [activeTab, setActiveTab] = useState("rules");
  const [expandedRule, setExpandedRule] = useState(1);

  // Auto-switch tabs and scroll based on URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hash === '#beginner-traps' || hash === '#7-traps' || hash === '#traps') {
        setActiveTab("rules");
        setTimeout(() => {
          const el = document.getElementById("beginner-traps") || document.getElementById("beginner-codex");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 50);
      } else if (hash === '#speedup-calculator' || hash === '#live-math' || hash === '#calculator') {
        setActiveTab("calculator");
        setTimeout(() => {
          const el = document.getElementById("speedup-calculator") || document.getElementById("beginner-codex");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 50);
      } else if (hash === '#top-commanders' || hash === '#commanders') {
        setActiveTab("commanders");
        setTimeout(() => {
          const el = document.getElementById("top-commanders") || document.getElementById("beginner-codex");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Speedup Discount Calculator State
  const [baseDays, setBaseDays] = useState(10);
  const [hasRune, setHasRune] = useState(15); // 0, 10, 15
  const [hasTitle, setHasTitle] = useState(10); // 0, 5, 10
  const [vipSpeed, setVipSpeed] = useState(15); // 0, 5, 10, 15, 20
  const [helpsCount, setHelpsCount] = useState(30);

  // Calculation Math
  const totalSpeedBonusPct = hasRune + hasTitle + vipSpeed;
  const rawHours = baseDays * 24;
  // Speed bonus formula: Time = BaseTime / (1 + SpeedBonus/100)
  const buffedHours = rawHours / (1 + totalSpeedBonusPct / 100);
  // Each help cuts 1% of total remaining or 1 min minimum
  const helpDiscountMultiplier = Math.pow(0.99, helpsCount);
  const finalHours = buffedHours * helpDiscountMultiplier;
  const hoursSavedTotal = Math.max(0, rawHours - finalHours);
  const daysRemaining = (finalHours / 24).toFixed(1);

  return (
    <div id="beginner-codex" className="w-full bg-[#0a0d14] text-slate-200 border-t border-[#1e222b] py-20 relative overflow-hidden font-sans scroll-mt-16">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-4">
            <Sparkles size={13} className="text-emerald-400" />
            Governor Academy • 100% Free Public Intel
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase font-cinzel">
            The New Governor <span className="gold-gradient-text">Survival Codex</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
            Essential tactical fundamentals for new accounts and jumpers. Avoid irreversible mistakes, master commander investments, and calculate build times with mathematical precision.
          </p>

          {/* Quick Sub-Navigation Pills */}
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 mt-8">
            <button
              onClick={() => {
                setActiveTab("rules");
                window.location.hash = "#beginner-traps";
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "rules"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <AlertOctagon size={16} /> The 7 Deadly Traps
            </button>
            <button
              onClick={() => {
                setActiveTab("commanders");
                window.location.hash = "#top-commanders";
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "commanders"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Swords size={16} /> Top 5 Epic Commanders
            </button>
            <button
              onClick={() => {
                setActiveTab("calculator");
                window.location.hash = "#speedup-calculator";
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "calculator"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                  : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Calculator size={16} /> Speedup Discount Engine
              <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[9px] font-mono font-bold tracking-wider">
                LIVE MATH
              </span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: THE 7 GOLDEN TRAPS ── */}
        {activeTab === "rules" && (
          <div id="beginner-traps" className="space-y-4 animate-fade-in max-w-5xl mx-auto scroll-mt-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GOLDEN_RULES.map((rule) => {
                const isExpanded = expandedRule === rule.id;
                return (
                  <div
                    key={rule.id}
                    onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                    className={`bg-[#121622] rounded-2xl border transition-all p-5 cursor-pointer flex flex-col justify-between ${
                      isExpanded 
                        ? "border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.15)] bg-[#151a2a]" 
                        : "border-[#1E2638] hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${rule.badgeColor}`}>
                          {rule.tag}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                          Rule #{rule.id}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      </div>
                      
                      <h3 className="text-base font-bold text-white mb-2 font-cinzel leading-snug">
                        {rule.title}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {rule.summary}
                      </p>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 leading-relaxed animate-in fade-in duration-200 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                        <span className="text-[#D4AF37] font-semibold block mb-1">Deep Tactical Advice:</span>
                        {rule.detail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-transparent border border-amber-500/30 flex items-center gap-3.5 mt-6">
              <ShieldAlert className="text-amber-400 shrink-0" size={24} />
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-amber-300 uppercase mr-1">Veteran Advice:</span>
                Mistakes made in the first 14 days with universal gold sculptures or civilization swaps take months to recover from. Bookmark this guide to review before spending rare items.
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: TOP 5 EPIC COMMANDERS ── */}
        {activeTab === "commanders" && (
          <div id="top-commanders" className="space-y-4 animate-fade-in max-w-5xl mx-auto scroll-mt-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {TOP_EPIC_COMMANDERS.map((cmd) => (
                <div 
                  key={cmd.name}
                  className="bg-[#121622] rounded-2xl border border-[#1E2638] hover:border-cyan-500/40 transition-all p-5 flex flex-col justify-between shadow-xl group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cmd.badgeColor}`}>
                        {cmd.civ}
                      </span>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={12} fill="currentColor" />
                        <Star size={12} fill="currentColor" />
                        <Star size={12} fill="currentColor" />
                        <Star size={12} fill="currentColor" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 font-cinzel group-hover:text-cyan-300 transition-colors">
                      {cmd.name}
                    </h3>
                    <div className="text-[11px] font-mono text-cyan-400 font-semibold mb-3">
                      {cmd.role}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      {cmd.why}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Recommended Pair:</span>
                    <span className="font-semibold text-white">{cmd.topPair}</span>
                  </div>
                </div>
              ))}

              {/* Pair Strategy Card */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-[#121622] to-slate-900 rounded-2xl border border-indigo-500/30 p-5 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                    <Crown size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white font-cinzel mb-2">
                    Primary vs. Secondary Talents
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Remember: <strong>Only the Primary Commander's talents apply to your march!</strong> The Secondary Commander only contributes their active and passive skills. You do not need to level a secondary commander past Level 30 or 40.
                  </p>
                </div>
                <div className="text-[11px] text-indigo-300 font-mono mt-4 pt-3 border-t border-indigo-500/20">
                  Tip: Keep secondary commanders at 4 stars / Lv. 30 to unlock all 4 skills cheaply.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: SPEEDUP DISCOUNT ENGINE ── */}
        {activeTab === "calculator" && (
          <div id="speedup-calculator" className="animate-fade-in max-w-4xl mx-auto bg-[#121622] border border-[#1E2638] rounded-3xl p-6 sm:p-8 shadow-2xl scroll-mt-24">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-cinzel">
                  Speedup & Help Optimization Calculator
                </h3>
                <p className="text-xs text-slate-400">
                  Calculate your true remaining upgrade time after stacking Holy Site Runes, Kingdom Titles, VIP buff, and Alliance Helps.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: Inputs */}
              <div className="space-y-5">
                <div>
                  <label className="flex justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    <span>Base Build Duration</span>
                    <span className="text-[#D4AF37] font-mono font-bold">{baseDays} Days ({rawHours} Hours)</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="45" 
                    value={baseDays} 
                    onChange={(e) => setBaseDays(parseInt(e.target.value, 10))}
                    className="w-full accent-[#D4AF37] bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Building Rune
                    </label>
                    <select
                      value={hasRune}
                      onChange={(e) => setHasRune(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value={0}>No Rune (0%)</option>
                      <option value={10}>10% Guardian Rune</option>
                      <option value={15}>15% Shrine/Altar Rune</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Kingdom Title
                    </label>
                    <select
                      value={hasTitle}
                      onChange={(e) => setHasTitle(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value={0}>No Title (0%)</option>
                      <option value={5}>Duke (+5% Speed)</option>
                      <option value={10}>Architect (+10% Speed)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      VIP Level Buff
                    </label>
                    <select
                      value={vipSpeed}
                      onChange={(e) => setVipSpeed(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value={0}>VIP 0-5 (0%)</option>
                      <option value={10}>VIP 6-8 (10%)</option>
                      <option value={15}>VIP 9-11 (15%)</option>
                      <option value={20}>VIP 12+ (20%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Alliance Helps
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="35" 
                      value={helpsCount} 
                      onChange={(e) => setHelpsCount(Math.min(35, Math.max(0, parseInt(e.target.value || "0", 10))))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Output Card */}
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">
                    Calculated Breakdown
                  </span>
                  
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-[#D4AF37] font-mono">
                      {daysRemaining}
                    </span>
                    <span className="text-sm font-semibold text-slate-300">Days Remaining</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Total Speedup Buff:</span>
                      <span className="font-bold text-emerald-400">+{totalSpeedBonusPct}% Faster</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Time Slashed by Helps ({helpsCount}):</span>
                      <span className="font-bold text-cyan-400">~{((1 - helpDiscountMultiplier) * 100).toFixed(1)}% Erased</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">Total Hours Saved:</span>
                      <span className="font-bold text-white font-mono">{hoursSavedTotal.toFixed(0)} Hours ({(hoursSavedTotal / 24).toFixed(1)} Days)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-snug">
                  Rule: Never burn universal speedups until all <strong>{helpsCount} helps</strong> are clicked by alliance members!
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
