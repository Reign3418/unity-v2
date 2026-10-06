"use client";

import { useState, useMemo } from "react";
import { 
  Castle, Shield, Zap, Search, CheckCircle, ChevronRight, AlertTriangle, 
  Crown, Sparkles, BookOpen, Clock, Building, Compass, ArrowRight,
  Flame, CheckSquare, Layers, Award, Target
} from "lucide-react";
import { useTranslations } from "next-intl";

// Master data for City Hall 1 to 25
const CH_DATA = [
  { level: 1, wall: 0, reqBuildingKey: "b_none", reqLevel: 0, depKey: "dep_1", perkKey: "perk_1", tier: "early" },
  { level: 2, wall: 1, reqBuildingKey: "b_farm", reqLevel: 1, depKey: "dep_2", perkKey: "perk_2", tier: "early" },
  { level: 3, wall: 2, reqBuildingKey: "b_lumber_mill", reqLevel: 2, depKey: "dep_3", perkKey: "perk_3", tier: "early" },
  { level: 4, wall: 3, reqBuildingKey: "b_archery_range", reqLevel: 3, depKey: "dep_4", perkKey: "perk_4", tier: "early" },
  { level: 5, wall: 4, reqBuildingKey: "b_hospital", reqLevel: 4, depKey: "dep_5", perkKey: "perk_5", tier: "early" },
  { level: 6, wall: 5, reqBuildingKey: "b_tavern", reqLevel: 5, depKey: "dep_6", perkKey: "perk_6", tier: "early" },
  { level: 7, wall: 6, reqBuildingKey: "b_quarry", reqLevel: 6, depKey: "dep_7", perkKey: "perk_7", tier: "early" },
  { level: 8, wall: 7, reqBuildingKey: "b_barracks", reqLevel: 7, depKey: "dep_8", perkKey: "perk_8", tier: "early" },
  { level: 9, wall: 8, reqBuildingKey: "b_alliance_center", reqLevel: 8, depKey: "dep_9", perkKey: "perk_9", tier: "early" },
  { level: 10, wall: 9, reqBuildingKey: "b_academy", reqLevel: 9, depKey: "dep_10", perkKey: "perk_10", tier: "early" },
  { level: 11, wall: 10, reqBuildingKey: "b_hospital", reqLevel: 10, depKey: "dep_11", perkKey: "perk_11", tier: "mid" },
  { level: 12, wall: 11, reqBuildingKey: "b_storehouse", reqLevel: 11, depKey: "dep_12", perkKey: "perk_12", tier: "mid" },
  { level: 13, wall: 12, reqBuildingKey: "b_archery_range", reqLevel: 12, depKey: "dep_13", perkKey: "perk_13", tier: "mid" },
  { level: 14, wall: 13, reqBuildingKey: "b_trading_post", reqLevel: 13, depKey: "dep_14", perkKey: "perk_14", tier: "mid" },
  { level: 15, wall: 14, reqBuildingKey: "b_scout_camp", reqLevel: 14, depKey: "dep_15", perkKey: "perk_15", tier: "mid" },
  { level: 16, wall: 15, reqBuildingKey: "b_academy", reqLevel: 15, depKey: "dep_16", perkKey: "perk_16", tier: "mid" },
  { level: 17, wall: 16, reqBuildingKey: "b_hospital", reqLevel: 16, depKey: "dep_17", perkKey: "perk_17", tier: "mid" },
  { level: 18, wall: 17, reqBuildingKey: "b_barracks", reqLevel: 17, depKey: "dep_18", perkKey: "perk_18", tier: "t4" },
  { level: 19, wall: 18, reqBuildingKey: "b_archery_range", reqLevel: 18, depKey: "dep_19", perkKey: "perk_19", tier: "t4" },
  { level: 20, wall: 19, reqBuildingKey: "b_siege_workshop", reqLevel: 19, depKey: "dep_20", perkKey: "perk_20", tier: "t4" },
  { level: 21, wall: 20, reqBuildingKey: "b_academy", reqLevel: 20, depKey: "dep_21", perkKey: "perk_21", tier: "t4" },
  { level: 22, wall: 21, reqBuildingKey: "b_hospital", reqLevel: 21, depKey: "dep_22", perkKey: "perk_22", tier: "endgame" },
  { level: 23, wall: 22, reqBuildingKey: "b_storehouse", reqLevel: 22, depKey: "dep_23", perkKey: "perk_23", tier: "endgame" },
  { level: 24, wall: 23, reqBuildingKey: "b_archery_range", reqLevel: 23, depKey: "dep_24", perkKey: "perk_24", tier: "endgame" },
  { level: 25, wall: 24, reqBuildingKey: "b_trading_post", reqLevel: 24, depKey: "dep_25", perkKey: "perk_25", tier: "endgame" }
];

export default function CityHallUpgradeGuide() {
  const t = useTranslations('CityHallGuide');

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
    const tVal = parseInt(val, 10);
    setTargetLevel(tVal);
    if (tVal <= startLevel) {
      const nextStart = Math.max(1, tVal - 1);
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
      if (s.level === 21) list.push(t('bn_step_21'));
      if (s.level === 22) list.push(t('bn_step_22'));
      if (s.level === 25) list.push(t('bn_step_25'));
    });
    return list.length ? list.join(", ") : t('bn_none');
  }, [plannerSteps, t]);

  // Goal Title & Description
  const goalInfo = useMemo(() => {
    if (targetLevel >= 25) {
      return {
        title: t('goal_25_title'),
        desc: t('goal_25_desc')
      };
    } else if (targetLevel >= 22) {
      return {
        title: t('goal_22_title'),
        desc: t('goal_22_desc')
      };
    } else if (targetLevel >= 21) {
      return {
        title: t('goal_21_title'),
        desc: t('goal_21_desc')
      };
    } else if (targetLevel >= 16) {
      return {
        title: t('goal_16_title'),
        desc: t('goal_16_desc')
      };
    }
    return {
      title: t('goal_early_title'),
      desc: t('goal_early_desc')
    };
  }, [targetLevel, t]);

  // Filtered table rows
  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return CH_DATA.filter(item => {
      if (item.level === 1) return false;
      const reqBuildingName = t(item.reqBuildingKey);
      const perkText = t(item.perkKey);
      const depText = t(item.depKey);
      const matchesTerm = (
        item.level.toString().includes(term) ||
        reqBuildingName.toLowerCase().includes(term) ||
        perkText.toLowerCase().includes(term) ||
        depText.toLowerCase().includes(term)
      );
      const matchesEra = (eraFilter === 'all') || (item.tier === eraFilter);
      return matchesTerm && matchesEra;
    });
  }, [searchTerm, eraFilter, t]);

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
              <span className="font-cinzel text-xl font-bold tracking-wider gold-gradient-text">{t('brand_title')}</span>
              <span className="hidden sm:inline-block text-[11px] uppercase tracking-widest text-slate-400 ml-3 border-l border-slate-700 pl-3 font-mono">
                {t('brand_sub')}
              </span>
            </div>
          </div>
          
          <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <a href="#ch-milestones" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition">{t('nav_milestones')}</a>
            <a href="#ch-planner" className="px-3 py-1.5 rounded-lg text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition flex items-center gap-1.5">
              <Sparkles size={12} /> {t('nav_planner')}
            </a>
            <a href="#ch-roadmap" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition">{t('nav_roadmap')}</a>
            <a href="#ch-bottlenecks" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition">{t('nav_bottlenecks')}</a>
            <a href="#ch-optimization" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition">{t('nav_optimization')}</a>
          </nav>
        </div>

        {/* Hero Title */}
        <div id="ch-milestones" className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping"></span>
            {t('pill_free_tool')}
          </div>
          <h2 className="font-cinzel text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 text-white">
            {t('hero_title_prefix')}<span className="gold-gradient-text">{t('hero_title_highlight')}</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            {t('hero_desc')}
          </p>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="bg-[#121826]/90 p-5 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/40 transition group">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">{t('card_troop_title')}</span>
              <div dir="ltr" className="text-2xl font-bold font-cinzel text-[#D4AF37] mt-1 group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">{t('card_troop_val')}</div>
              <p className="text-xs text-slate-400 mt-1">{t('card_troop_desc')}</p>
            </div>
            <div className="bg-[#121826]/90 p-5 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/40 transition group">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">{t('card_march_title')}</span>
              <div dir="ltr" className="text-2xl font-bold font-cinzel text-[#D4AF37] mt-1 group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">{t('card_march_val')}</div>
              <p className="text-xs text-slate-400 mt-1">{t('card_march_desc')}</p>
            </div>
            <div className="bg-[#121826]/90 p-5 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/40 transition group">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">{t('card_speedup_title')}</span>
              <div dir="ltr" className="text-2xl font-bold font-cinzel text-[#D4AF37] mt-1 group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">{t('card_speedup_val')}</div>
              <p className="text-xs text-slate-400 mt-1">{t('card_speedup_desc')}</p>
            </div>
            <div className="bg-[#121826]/90 p-5 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/40 transition group">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">{t('card_peak_title')}</span>
              <div dir="ltr" className="text-2xl font-bold font-cinzel text-[#D4AF37] mt-1 group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">{t('card_peak_val')}</div>
              <p className="text-xs text-slate-400 mt-1">{t('card_peak_desc')}</p>
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
                <Target size={14} /> {t('planner_pill')}
              </span>
              <h3 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">{t('planner_title')}</h3>
              <p className="text-sm text-slate-400">{t('planner_desc')}</p>
            </div>
            
            {/* Planner Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-[#121826] p-3 rounded-2xl border border-[#1E293B] shadow-xl">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{t('lbl_current_ch')}</label>
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
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{t('lbl_target_ch')}</label>
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
                  {t('btn_rush_21')}
                </button>
                <button 
                  onClick={() => handleQuickRush(16, 22)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
                    startLevel === 16 && targetLevel === 22
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {t('btn_rush_22')}
                </button>
                <button 
                  onClick={() => handleQuickRush(21, 25)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition font-bold ${
                    startLevel === 21 && targetLevel === 25
                      ? 'bg-[#D4AF37] text-black border-[#F3E5AB]'
                      : 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border-[#D4AF37]/40'
                  }`}
                >
                  {t('btn_rush_25')}
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
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{t('lbl_path_progression')}</span>
                    <span dir="ltr" className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
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
                          <div className="text-[11px] text-slate-400">{t('lbl_total_stages')}</div>
                          <div dir="ltr" className="text-lg font-bold text-white font-mono">{plannerSteps.length} {t('lbl_upgrades_suffix')}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle size={20} />
                        </span>
                        <div>
                          <div className="text-[11px] text-slate-400">{t('lbl_bottlenecks_route')}</div>
                          <div className="text-xs font-semibold text-amber-300 mt-0.5">{bottlenecks}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Golden Rule Callout */}
                <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/10 to-transparent border-l-4 border-[#D4AF37] text-xs">
                  <span className="font-bold text-[#D4AF37] uppercase block mb-1 flex items-center gap-1.5">
                    <Crown size={14} /> {t('rushing_rule_title')}
                  </span>
                  <span className="text-slate-300 leading-relaxed">
                    {t('rushing_rule_desc')}
                  </span>
                </div>
              </div>

              {/* Dynamic Steps Right Column */}
              <div className="lg:w-2/3 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <CheckSquare size={16} className="text-[#D4AF37]" /> {t('lbl_required_steps')}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{t('lbl_check_off')}</span>
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
                                {t('upgrade_to', { level: step.level })}
                              </span>
                              <span className="text-[11px] font-normal text-slate-400">({t(step.perkKey)})</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {t('build_label', { wall: step.wall, building: t(step.reqBuildingKey), reqLevel: step.reqLevel })}
                            </div>
                          </div>
                        </div>
                        <span dir="ltr" className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {t('step_num', { level: step.level })}
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
              <BookOpen size={14} /> {t('tree_pill')}
            </span>
            <h3 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">{t('tree_title')}</h3>
            <p className="text-sm text-slate-400">{t('tree_desc')}</p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_placeholder')} 
                className="bg-[#121826] border border-slate-700 text-sm rounded-xl px-4 py-2 w-64 text-white focus:outline-none focus:border-[#D4AF37] placeholder:text-slate-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            
            <select 
              value={eraFilter}
              onChange={(e) => setEraFilter(e.target.value)}
              className="bg-[#121826] border border-slate-700 text-sm rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">{t('era_all')}</option>
              <option value="early">{t('era_early')}</option>
              <option value="mid">{t('era_mid')}</option>
              <option value="t4">{t('era_t4')}</option>
              <option value="endgame">{t('era_endgame')}</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-[#121826] rounded-3xl border border-[#1E293B] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider border-b border-[#1E293B]">
                  <th className="py-4 px-4 font-semibold text-center w-24">{t('th_target_ch')}</th>
                  <th className="py-4 px-4 font-semibold">{t('th_wall_lvl')}</th>
                  <th className="py-4 px-4 font-semibold">{t('th_secondary_prereq')}</th>
                  <th className="py-4 px-4 font-semibold">{t('th_chain_dep')}</th>
                  <th className="py-4 px-6 font-semibold">{t('th_major_unlocks')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      {t('no_results')}
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
                          <span dir="ltr" className={`inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold border ${badgeColor}`}>
                            CH {row.level}
                          </span>
                        </td>
                        <td dir="ltr" className="py-3.5 px-4 font-mono text-slate-300">
                          Wall Lv. {row.wall}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white">{t(row.reqBuildingKey)}</span>
                          <span dir="ltr" className="text-xs text-[#D4AF37] font-mono ml-1.5 font-bold">Lv. {row.reqLevel}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {t(row.depKey)}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="text-xs font-medium text-slate-200">{t(row.perkKey)}</div>
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
              <AlertTriangle size={14} /> {t('walls_pill')}
            </span>
            <h3 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">{t('walls_title')}</h3>
            <p className="text-sm text-slate-400 mt-2">{t('walls_desc')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bottleneck 1: Watchtower */}
            <div className="bg-[#121826] rounded-3xl p-6 border border-slate-800 hover:border-[#D4AF37]/50 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('wall_1_gate')}</span>
                  <span dir="ltr" className="text-xs text-slate-400 font-mono">{t('wall_1_cost')}</span>
                </div>
                <h4 className="text-lg font-bold font-cinzel text-white mb-2">{t('wall_1_title')}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {t('wall_1_desc')}
                </p>
              </div>
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>{t('wall_1_acq_lbl')}</span>
                  <span className="font-semibold text-white">{t('wall_1_acq_val')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{t('wall_1_gem_lbl')}</span>
                  <span dir="ltr" className="font-semibold text-rose-400">{t('wall_1_gem_val')}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800 leading-relaxed">
                  {t('wall_1_tip')}
                </p>
              </div>
            </div>

            {/* Bottleneck 2: Castle */}
            <div className="bg-[#121826] rounded-3xl p-6 border border-slate-800 hover:border-[#D4AF37]/50 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">{t('wall_2_gate')}</span>
                  <span dir="ltr" className="text-xs text-slate-400 font-mono">{t('wall_2_cost')}</span>
                </div>
                <h4 className="text-lg font-bold font-cinzel text-white mb-2">{t('wall_2_title')}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {t('wall_2_desc')}
                </p>
              </div>
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>{t('wall_2_acq_lbl')}</span>
                  <span className="font-semibold text-white">{t('wall_2_acq_val')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{t('wall_2_gem_lbl')}</span>
                  <span dir="ltr" className="font-semibold text-rose-400">{t('wall_2_gem_val')}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800 leading-relaxed">
                  {t('wall_2_tip')}
                </p>
              </div>
            </div>

            {/* Bottleneck 3: Master Blueprint */}
            <div className="bg-[#121826] rounded-3xl p-6 border border-slate-800 hover:border-[#D4AF37]/50 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">{t('wall_3_gate')}</span>
                  <span dir="ltr" className="text-xs text-slate-400 font-mono">{t('wall_3_cost')}</span>
                </div>
                <h4 className="text-lg font-bold font-cinzel text-white mb-2">{t('wall_3_title')}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {t('wall_3_desc')}
                </p>
              </div>
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>{t('wall_3_acq_lbl')}</span>
                  <span dir="ltr" className="font-semibold text-[#D4AF37]">{t('wall_3_acq_val')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>{t('wall_3_gem_lbl')}</span>
                  <span className="font-semibold text-white">{t('wall_3_gem_val')}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800 leading-relaxed">
                  {t('wall_3_tip')}
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
            <Zap size={14} /> {t('opt_pill')}
          </span>
          <h3 className="text-2xl sm:text-3xl font-cinzel font-bold text-white mt-1">{t('opt_title')}</h3>
          <p className="text-sm text-slate-400 mt-2">{t('opt_desc')}</p>
        </div>

        {/* 4 Step Stacking Workflow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-[#121826] p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center font-bold text-[#D4AF37] mb-3">1</div>
            <h5 className="font-bold text-white text-sm mb-1">{t('step_1_title')}</h5>
            <p className="text-xs text-slate-400">{t('step_1_desc')}</p>
          </div>

          <div className="bg-[#121826] p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center font-bold text-[#D4AF37] mb-3">2</div>
            <h5 className="font-bold text-white text-sm mb-1">{t('step_2_title')}</h5>
            <p className="text-xs text-slate-400">{t('step_2_desc')}</p>
          </div>

          <div className="bg-[#121826] p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center font-bold text-[#D4AF37] mb-3">3</div>
            <h5 className="font-bold text-white text-sm mb-1">{t('step_3_title')}</h5>
            <p className="text-xs text-slate-400">{t('step_3_desc')}</p>
          </div>

          <div className="bg-[#121826] p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center font-bold text-rose-400 mb-3">4</div>
            <h5 className="font-bold text-white text-sm mb-1">{t('step_4_title')}</h5>
            <p className="text-xs text-slate-400">{t('step_4_desc')}</p>
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
                <h4 className="text-base font-bold text-white font-cinzel">{t('vip_priorities_title')}</h4>
                <span className="text-xs text-slate-400">{t('vip_priorities_sub')}</span>
              </div>
            </div>
            
            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[#D4AF37] font-bold font-mono">VIP 6:</span>
                <span>{t('vip_6_desc')}</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[#D4AF37] font-bold font-mono">VIP 10:</span>
                <span>{t('vip_10_desc')}</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[#D4AF37] font-bold font-mono">VIP 12:</span>
                <span>{t('vip_12_desc')}</span>
              </li>
              <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[#D4AF37] font-bold font-mono">VIP 14:</span>
                <span>{t('vip_14_desc')}</span>
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
                  <h4 className="text-base font-bold text-white font-cinzel">{t('alliance_math_title')}</h4>
                  <span className="text-xs text-slate-400">{t('alliance_math_sub')}</span>
                </div>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {t('alliance_math_desc')}
              </p>

              <div className="space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('alliance_math_ch20')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('alliance_math_ch25')}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 text-xs text-slate-300">
              <span className="font-bold text-blue-400 block mb-1">{t('alliance_example_title')}</span>
              {t('alliance_example_desc')}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
