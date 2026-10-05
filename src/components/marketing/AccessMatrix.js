"use client";

import { 
  Check, Lock, Unlock, Shield, Zap, Sparkles, ArrowRight, 
  HelpCircle, ChevronDown, Award, Users, Database, Globe,
  Cpu, FileText, Castle, Swords, BookOpen, QrCode, Key, Eye
} from "lucide-react";

export default function AccessMatrix() {
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
            Platform Access Architecture • Transparency Protocol
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight font-cinzel">
            What Is <span className="gold-gradient-text">100% Free</span> vs. <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">Restricted</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-4 leading-relaxed font-mono">
            Unity serves both the general Rise of Kingdoms player base with open tactical tools, and verified kingdom coalitions with secure war intelligence. Review our clear access boundary below.
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
                  <Unlock size={13} /> Tier 1: Public Academy
                </span>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  0 Login Required
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-cinzel mb-2 flex items-center gap-3">
                <Castle className="text-[#D4AF37]" size={28} />
                Open Governor Academy
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-8 leading-relaxed font-mono">
                Immediate, unrestricted access for <strong>any governor, jumper, or new player</strong> across all kingdoms worldwide. No Discord connection, no passcode, and no sign-up required.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-4 border-t border-[#1e2433] pt-6 mb-8">
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">City Hall 1-25 Rush Route</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Full wall and building requirements, speedup estimates, and bottleneck alerts.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">The 7 Fatal Starter Traps</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Permanent account protection: universal gold head laws, VIP 6 rush, China start, 5/1/1/1 skill rules.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Live Math Speedup Calculator</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time discount engine factoring runes (10-15%), kingdom architect/scientist titles, and alliance helps.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Early to Season of Conquest Armory</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Infantry, Cavalry, and Archer equipment progression from Epic sets to BiS Legendaries and 30% crit math.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">RoK In-Game Album QR Studio</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Dynamic 1080x1080 camouflage image generator that bypasses automated gallery filters.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Freemode Demo Sandbox</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Preview mock analytics dashboards and public UI without saving state or linking accounts.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Tier 1 CTA */}
            <a 
              href="#public-academy"
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2"
            >
              <span>Explore Free Academy Tools</span>
              <ChevronDown size={16} />
            </a>

          </div>

          {/* TIER 2: CLASSIFIED ALLIANCE WAR ROOM (RESTRICTED) */}
          <div className="bg-gradient-to-b from-[#0e121d] to-[#080b12] rounded-3xl border-2 border-cyan-500/40 p-8 sm:p-10 shadow-[0_0_50px_rgba(6,182,212,0.1)] flex flex-col justify-between relative group hover:border-cyan-400 transition-all duration-300">
            
            {/* Top Badge */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <Lock size={13} /> Tier 2: War Room Suite
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  Discord &amp; Role Clearance
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-cinzel mb-2 flex items-center gap-3">
                <Shield className="text-cyan-400" size={28} />
                Kingdom War Command
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-8 leading-relaxed font-mono">
                Classified operational infrastructure restricted to <strong>Kingdom High Command, Alliance R4/R5 Officers, and verified coalition members</strong>.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-4 border-t border-[#1e2433] pt-6 mb-8">
                
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Google Gemini Vision OCR Scanner</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Batch upload governor screenshots to automatically parse power, kill points, and dead troops into the database.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">KvK DKP &amp; Kill Quota Enforcement</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Automated DKP scores, dead troop honor audits, and merit penalty calculations across all coalition alliances.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Full Kingdom Roster Census &amp; Inactive Audits</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Identifies zero-contributor accounts, tracks migration power fluctuations, and audits dead weight.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Tactical Frontline Map &amp; Pass Timers</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Zone 4-7 pass openings, crusader fortress schedules, and real-time coalition coordinate whiteboard.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">EK Polygraph &amp; Player Hunter</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Combat telemetry checking for suspicious kill point spikes, feed detection, and rogue behavior.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                    <Lock size={11} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Automated Discord Dispatcher &amp; Mail</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Instant ping alerts, emergency coalition broadcasts, and live multi-language translation.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Tier 2 Roles Breakdown & CTA */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span className="text-cyan-400 font-bold">Role Hierarchy:</span>
                <span>Member $\rightarrow$ Analyst $\rightarrow$ Officer $\rightarrow$ King</span>
              </div>
              <a 
                href="#war-room-suite"
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] flex items-center justify-center gap-2"
              >
                <span>Authenticate With Discord / Passcode</span>
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
            <h4 className="text-white font-bold text-sm sm:text-base font-cinzel">Why are these systems separated?</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-mono">
              Educational fundamentals like City Hall rush math and 7 fatal traps should be <strong>free and open to the entire RoK community</strong>. Conversely, kingdom rosters, kill point tracking, and battle whiteboards contain sensitive competitive intel that must be <strong>safeguarded behind verified Discord authentication</strong>.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
