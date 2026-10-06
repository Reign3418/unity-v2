"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, BookOpen, AlertOctagon, Sparkles, Crown, Swords, 
  Wheat, Calculator, Check, ArrowRight, Zap, Target, Star, Flame,
  Clock, Shield, Award, Users, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { useTranslations } from "next-intl";

const RULE_CONFIGS = [
  { id: 1, badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
  { id: 2, badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  { id: 3, badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  { id: 4, badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  { id: 5, badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { id: 6, badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  { id: 7, badgeColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" }
];

const COMMANDER_CONFIGS = [
  { key: "sun", badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { key: "bjorn", badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { key: "joan", badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { key: "baibars", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { key: "pelagius", badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" }
];

export default function BeginnerPlaybook() {
  const t = useTranslations('BeginnerPlaybook');

  const [activeTab, setActiveTab] = useState("rules");
  const [expandedRule, setExpandedRule] = useState(1);

  // Auto-switch tabs and scroll based on URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hash === '#beginner-traps' || hash === '#7-traps' || hash === '#traps') {
        setActiveTab("rules");
        setTimeout(() => {
          const el = document.getElementById("beginner-traps") || document.getElementById("beginner-playbook");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 50);
      } else if (hash === '#speedup-calculator' || hash === '#live-math' || hash === '#calculator') {
        setActiveTab("calculator");
        setTimeout(() => {
          const el = document.getElementById("speedup-calculator") || document.getElementById("beginner-playbook");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 50);
      } else if (hash === '#top-commanders' || hash === '#commanders') {
        setActiveTab("commanders");
        setTimeout(() => {
          const el = document.getElementById("top-commanders") || document.getElementById("beginner-playbook");
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
  const [vipSpeed, setVipSpeed] = useState(15); // 0, 10, 15, 20
  const [helpsCount, setHelpsCount] = useState(30);

  // Calculation Math
  const totalSpeedBonusPct = hasRune + hasTitle + vipSpeed;
  const rawHours = baseDays * 24;
  const buffedHours = rawHours / (1 + totalSpeedBonusPct / 100);
  const helpDiscountMultiplier = Math.pow(0.99, helpsCount);
  const finalHours = buffedHours * helpDiscountMultiplier;
  const hoursSavedTotal = Math.max(0, rawHours - finalHours);
  const daysRemaining = (finalHours / 24).toFixed(1);

  return (
    <div id="beginner-playbook" className="w-full bg-[#0a0d14] text-slate-200 border-t border-[#1e222b] py-20 relative overflow-hidden font-sans scroll-mt-16">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-4">
            <Sparkles size={13} className="text-emerald-400" />
            {t('hero_pill')}
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase font-cinzel">
            {t('hero_title_prefix')}<span className="gold-gradient-text">{t('hero_title_highlight')}</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
            {t('hero_desc')}
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
              <AlertOctagon size={16} /> {t('tab_rules')}
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
              <Swords size={16} /> {t('tab_commanders')}
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
              <Calculator size={16} /> {t('tab_calculator')}
              <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[9px] font-mono font-bold tracking-wider">
                {t('badge_live_math')}
              </span>
            </button>
          </div>
        </div>

        {/* ── TAB 1: THE 7 GOLDEN TRAPS ── */}
        {activeTab === "rules" && (
          <div id="beginner-traps" className="space-y-4 animate-fade-in max-w-5xl mx-auto scroll-mt-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RULE_CONFIGS.map((rule) => {
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
                          {t(`rule_${rule.id}_tag`)}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                          {t('rule_num', { id: rule.id })}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      </div>
                      
                      <h3 className="text-base font-bold text-white mb-2 font-cinzel leading-snug">
                        {t(`rule_${rule.id}_title`)}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {t(`rule_${rule.id}_summary`)}
                      </p>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 leading-relaxed animate-in fade-in duration-200 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                        <span className="text-[#D4AF37] font-semibold block mb-1">{t('deep_advice_title')}</span>
                        {t(`rule_${rule.id}_detail`)}
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
                <span className="font-bold text-amber-300 uppercase mr-1">{t('veteran_advice_label')}</span>
                {t('veteran_advice_text')}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: TOP 5 EPIC COMMANDERS ── */}
        {activeTab === "commanders" && (
          <div id="top-commanders" className="space-y-4 animate-fade-in max-w-5xl mx-auto scroll-mt-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {COMMANDER_CONFIGS.map((cmd) => (
                <div 
                  key={cmd.key}
                  className="bg-[#121622] rounded-2xl border border-[#1E2638] hover:border-cyan-500/40 transition-all p-5 flex flex-col justify-between shadow-xl group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cmd.badgeColor}`}>
                        {t(`cmd_${cmd.key}_civ`)}
                      </span>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star size={12} fill="currentColor" />
                        <Star size={12} fill="currentColor" />
                        <Star size={12} fill="currentColor" />
                        <Star size={12} fill="currentColor" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 font-cinzel group-hover:text-cyan-300 transition-colors">
                      {t(`cmd_${cmd.key}_name`)}
                    </h3>
                    <div className="text-[11px] font-mono text-cyan-400 font-semibold mb-3">
                      {t(`cmd_${cmd.key}_role`)}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      {t(`cmd_${cmd.key}_why`)}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">{t('cmd_pair_lbl')}</span>
                    <span className="font-semibold text-white">{t(`cmd_${cmd.key}_pair`)}</span>
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
                    {t('card_talents_title')}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t('card_talents_desc')}
                  </p>
                </div>
                <div className="text-[11px] text-indigo-300 font-mono mt-4 pt-3 border-t border-indigo-500/20">
                  {t('card_talents_tip')}
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
                  {t('calc_header')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('calc_sub')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: Inputs */}
              <div className="space-y-5">
                <div>
                  <label className="flex justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    <span>{t('lbl_base_build_time')}</span>
                    <span dir="ltr" className="text-[#D4AF37] font-mono font-bold">{t('val_days_hours', { days: baseDays, hours: rawHours })}</span>
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
                      {t('lbl_building_rune')}
                    </label>
                    <select
                      value={hasRune}
                      onChange={(e) => setHasRune(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value={0}>{t('opt_no_rune')}</option>
                      <option value={10}>{t('opt_rune_10')}</option>
                      <option value={15}>{t('opt_rune_15')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {t('lbl_kingdom_title')}
                    </label>
                    <select
                      value={hasTitle}
                      onChange={(e) => setHasTitle(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value={0}>{t('opt_no_title')}</option>
                      <option value={5}>{t('opt_duke')}</option>
                      <option value={10}>{t('opt_architect')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {t('lbl_vip_level')}
                    </label>
                    <select
                      value={vipSpeed}
                      onChange={(e) => setVipSpeed(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value={0}>{t('opt_vip_0')}</option>
                      <option value={10}>{t('opt_vip_6')}</option>
                      <option value={15}>{t('opt_vip_9')}</option>
                      <option value={20}>{t('opt_vip_12')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {t('lbl_alliance_helps')}
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
                    {t('calc_breakdown_title')}
                  </span>
                  
                  <div className="flex items-baseline gap-2 mb-4">
                    <span dir="ltr" className="text-4xl font-extrabold text-[#D4AF37] font-mono">
                      {daysRemaining}
                    </span>
                    <span className="text-sm font-semibold text-slate-300">{t('lbl_days_remaining')}</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">{t('lbl_total_speed_buff')}</span>
                      <span dir="ltr" className="font-bold text-emerald-400">{t('val_faster', { val: totalSpeedBonusPct })}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">{t('lbl_time_slashed', { count: helpsCount })}</span>
                      <span dir="ltr" className="font-bold text-cyan-400">{t('val_erased', { pct: ((1 - helpDiscountMultiplier) * 100).toFixed(1) })}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">{t('lbl_total_saved')}</span>
                      <span dir="ltr" className="font-bold text-white font-mono">{t('val_hours_days_saved', { hours: hoursSavedTotal.toFixed(0), days: (hoursSavedTotal / 24).toFixed(1) })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-snug">
                  {t('calc_rule_helps', { count: helpsCount })}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
