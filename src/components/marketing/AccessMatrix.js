"use client";

import { useTranslations } from "next-intl";
import { 
  Check, Lock, Unlock, Shield, Zap, Sparkles, ArrowRight, 
  HelpCircle, ChevronDown, Award, Users, Database, Globe,
  Cpu, FileText, Castle, Swords, BookOpen, QrCode, Key, Eye
} from "lucide-react";

export default function AccessMatrix() {
  const t = useTranslations('AccessMatrix');

  return (
    <section id="access-matrix" className="w-full bg-[#07090e] border-t border-[#1e222b] py-20 relative overflow-hidden font-sans scroll-mt-16">
      
      {/* Background Radial Glows */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <Key size={13} className="text-cyan-400" />
            {t('pill_architecture')}
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-cinzel">
            {t('title_prefix')}<span className="gold-gradient-text">{t('title_free')}</span>{t('title_vs')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">{t('title_restricted')}</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-4 leading-relaxed font-mono">
            {t('subtitle')}
          </p>
        </div>

        {/* 2-Tier Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-16">
          
          {/* TIER 1: PUBLIC GOVERNOR ACADEMY (100% FREE) */}
          <div className="bg-gradient-to-b from-[#0f131c] to-[#0a0d14] rounded-3xl border-2 border-amber-500/40 p-8 sm:p-10 shadow-[0_0_50px_rgba(212,175,55,0.08)] flex flex-col justify-between relative group hover:border-amber-400 transition-all duration-300">
            
            {/* Top Badge */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Unlock size={13} /> {t('tier1_pill')}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {t('tier1_login_badge')}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-cinzel mb-2 flex items-center gap-3">
                <Castle className="text-[#D4AF37]" size={28} />
                {t('tier1_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-8 leading-relaxed font-mono">
                {t('tier1_desc')}
              </p>

              {/* Feature Checklist */}
              <div className="space-y-4 border-t border-[#1e2433] pt-6 mb-8">
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_ch_rush_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_ch_rush_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_traps_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_traps_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_speedup_calc_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_speedup_calc_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_armory_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_armory_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_album_qr_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_album_qr_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_freemode_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_freemode_desc')}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Tier 1 CTA */}
            <a 
              href="#public-academy"
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2"
            >
              <span>{t('tier1_cta')}</span>
              <ChevronDown size={16} />
            </a>

          </div>

          {/* TIER 2: CLASSIFIED ALLIANCE WAR ROOM (RESTRICTED) */}
          <div className="bg-gradient-to-b from-[#0e121d] to-[#080b12] rounded-3xl border-2 border-cyan-500/40 p-8 sm:p-10 shadow-[0_0_50px_rgba(6,182,212,0.1)] flex flex-col justify-between relative group hover:border-cyan-400 transition-all duration-300">
            
            {/* Top Badge */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <Lock size={13} /> {t('tier2_pill')}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  {t('tier2_auth_badge')}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-cinzel mb-2 flex items-center gap-3">
                <Shield className="text-cyan-400" size={28} />
                {t('tier2_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-8 leading-relaxed font-mono">
                {t('tier2_desc')}
              </p>

              {/* Feature Checklist */}
              <div className="space-y-4 border-t border-[#1e2433] pt-6 mb-8">
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_ocr_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_ocr_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_dkp_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_dkp_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_census_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_census_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_map_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_map_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_polygraph_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_polygraph_desc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{t('feat_discord_dispatcher_title')}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{t('feat_discord_dispatcher_desc')}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Tier 2 Roles Breakdown & CTA */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span className="text-cyan-400 font-bold">{t('tier2_role_hierarchy_label')}</span>
                <span>{t('tier2_role_hierarchy_value')}</span>
              </div>
              <a 
                href="#war-room-suite"
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] flex items-center justify-center gap-2"
              >
                <span>{t('tier2_cta')}</span>
                <ArrowRight size={16} />
              </a>
            </div>

          </div>

        </div>

        {/* Why The Distinction Exists Callout */}
        <div className="bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <HelpCircle size={24} />
          </div>
          <div className="text-left space-y-1.5 flex-1">
            <h4 className="text-white font-bold text-sm sm:text-base font-cinzel">{t('why_separated_title')}</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-mono">
              {t('why_separated_desc')}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
