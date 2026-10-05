'use client';

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Shield, Zap, TrendingUp, UploadCloud, Globe, X, Key, Cpu, Database, 
  Activity, Terminal, ChevronDown, Box, Castle, BookOpen, Swords, 
  Sparkles, ArrowRight, Lock, Award, Users, CheckSquare, Clock, Flame, QrCode
} from "lucide-react";
import WorldClock from "@/components/WorldClock";
import AnimatedLogo from "@/components/AnimatedLogo";
import LandingTopography from "@/components/marketing/LandingTopography";
import CityHallUpgradeGuide from "@/components/marketing/CityHallUpgradeGuide";
import BeginnerPlaybook from "@/components/marketing/BeginnerPlaybook";
import EquipmentGuide from "@/components/marketing/EquipmentGuide";
import AccessMatrix from "@/components/marketing/AccessMatrix";
import GovernorAuthModal from "@/components/auth/GovernorAuthModal";
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

export default function Home() {
  const pathname = usePathname();
  const t = useTranslations('HomePage');
  const { data: session } = useSession();
  const [isExploding, setIsExploding] = useState(false);
  const [fireworks, setFireworks] = useState([]);
  const [isGuestModalOpen, setGuestModalOpen] = useState(false);
  const [isGovModalOpen, setGovModalOpen] = useState(false);
  const [govModalTab, setGovModalTab] = useState("register");
  const [isApplyModalOpen, setApplyModalOpen] = useState(false);
  const [guestPasscode, setGuestPasscode] = useState("");

  useEffect(() => {
    if (isExploding) {
      // Generate 50 random fullscreen fireworks
      const newFireworks = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: 50 + (Math.random() - 0.5) * 40 + '%', // Cluster slightly around center
        top: 40 + (Math.random() - 0.5) * 40 + '%',
        size: Math.random() * 8 + 4 + 'px',
        color: ['#06b6d4', '#38bdf8', '#2dd4bf', '#818cf8', '#a5f3fc', '#D4AF37'][Math.floor(Math.random() * 6)],
        delay: Math.random() * 0.4 + 's',
        duration: Math.random() * 0.8 + 0.6 + 's',
        tx: (Math.random() - 0.5) * 600 + 'px',
        ty: (Math.random() - 0.5) * 600 + 'px',
      }));
      setFireworks(newFireworks);
    } else {
      setFireworks([]);
    }
  }, [isExploding]);

  // ========================================================
  // UNAUTHENTICATED PUBLIC PORTAL: FREE ACADEMY & WAR ROOM
  // ========================================================
  if (!session) {
    return (
      <div className="flex flex-col bg-[#05070a] min-h-screen relative overflow-y-auto overflow-x-hidden font-sans selection:bg-cyan-500/30 scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
        
        {/* Sticky Top Navigation Header */}
        <header className="sticky top-0 z-50 w-full bg-[#0a0c10]/90 backdrop-blur-xl border-b border-[#1e222b] transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo-smooth-dark.png" alt="Unity Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
              <div className="flex items-baseline gap-1">
                <span className="font-black text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">UN.TY</span>
                <span className="text-[10px] font-mono text-cyan-500 font-bold">2.0</span>
              </div>
            </div>

            {/* Public Quick Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold">
              <a href="#city-hall-guide" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-white/5 transition flex items-center gap-1.5">
                <Castle size={14} className="text-[#D4AF37]" /> City Hall Rush
              </a>
              <a href="#beginner-playbook" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-white/5 transition flex items-center gap-1.5">
                <BookOpen size={14} className="text-emerald-400" /> Beginner Playbook
              </a>
              <a href="#equipment-guide" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-white/5 transition flex items-center gap-1.5">
                <Swords size={14} className="text-amber-400" /> Equipment & Pairings
              </a>
              <a href="#access-matrix" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-white/5 transition flex items-center gap-1.5">
                <Key size={14} className="text-cyan-400" /> Free vs. Login
              </a>
              <Link href="/album-card" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-white/5 transition flex items-center gap-1.5">
                <QrCode size={14} className="text-amber-400" /> RoK Album Seal
              </Link>
              <a href="#war-room-suite" className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-white/5 transition flex items-center gap-1.5">
                <Shield size={14} className="text-cyan-400" /> War Room Suite
              </a>
            </nav>

            {/* Right Controls: Language & Enter War Room CTA */}
            <div className="flex items-center gap-3">
              
              {/* Language Switcher */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1e222b] bg-[#0f1115] rounded-full text-xs hover:border-cyan-500/30 transition-colors">
                <Globe size={13} className="text-gray-400" />
                <select
                  className="bg-transparent text-gray-300 font-bold text-[10px] uppercase tracking-wider outline-none cursor-pointer"
                  value={pathname?.split('/')[1] || 'en'}
                  onChange={(e) => {
                    const newLocale = e.target.value;
                    const segments = pathname.split('/');
                    if (segments.length >= 2 && ['en', 'vi', 'ar', 'ru', 'zh', 'es', 'id', 'ko', 'tr', 'fr', 'de', 'pt'].includes(segments[1])) {
                        segments[1] = newLocale; 
                        window.location.href = segments.join('/');
                    } else {
                        window.location.href = `/${newLocale}${pathname}`;
                    }
                  }}
                >
                  <option value="en" className="bg-[#0f1115] text-white">English (EN)</option>
                  <option value="es" className="bg-[#0f1115] text-white">Español (ES)</option>
                  <option value="fr" className="bg-[#0f1115] text-white">Français (FR)</option>
                  <option value="zh" className="bg-[#0f1115] text-white">中文 (ZH)</option>
                  <option value="ar" className="bg-[#0f1115] text-white">العربية (AR)</option>
                  <option value="ru" className="bg-[#0f1115] text-white">Русский (RU)</option>
                  <option value="vi" className="bg-[#0f1115] text-white">Tiếng Việt (VI)</option>
                  <option value="ko" className="bg-[#0f1115] text-white">한국어 (KO)</option>
                  <option value="tr" className="bg-[#0f1115] text-white">Türkçe (TR)</option>
                  <option value="de" className="bg-[#0f1115] text-white">Deutsch (DE)</option>
                  <option value="pt" className="bg-[#0f1115] text-white">Português (PT)</option>
                  <option value="id" className="bg-[#0f1115] text-white">Indonesia (ID)</option>
                </select>
              </div>

              {/* Enter War Room Quick Button */}
              <a 
                href="#war-room-suite"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
              >
                <Zap size={13} />
                <span>Enter War Room</span>
              </a>
            </div>

          </div>
        </header>

        {/* Fullscreen Fireworks Engine */}
        {fireworks.map((fw) => (
          <div
            key={fw.id}
            className="absolute rounded-full pointer-events-none z-0"
            style={{
              left: fw.left,
              top: fw.top,
              width: fw.size,
              height: fw.size,
              backgroundColor: fw.color,
              boxShadow: `0 0 15px ${fw.color}`,
              animation: `page-explode ${fw.duration} cubic-bezier(0.1, 0.8, 0.3, 1) ${fw.delay} forwards`,
              '--tx': fw.tx,
              '--ty': fw.ty,
            }}
          />
        ))}

        <style>
          {`
            @keyframes page-explode {
              0% { transform: translate(0, 0) scale(0); opacity: 1; }
              40% { opacity: 0.9; }
              100% { transform: translate(var(--tx), var(--ty)) scale(2.5); opacity: 0; }
            }
          `}
        </style>

        {/* Deep Atmospheric Blobs */}
        <div className="fixed top-[10%] right-[10%] w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none mix-blend-screen animate-pulse z-0" style={{ animationDuration: '6s' }}></div>
        <div className="fixed bottom-[10%] left-[10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none mix-blend-screen animate-pulse z-0" style={{ animationDuration: '8s' }}></div>

        {/* Ethereal Grid Floor */}
        <div className="fixed inset-0 w-full h-full bg-[linear-gradient(to_bottom,transparent_90%,rgba(6,182,212,0.02)_100%),linear-gradient(to_right,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_top,black,transparent)] pointer-events-none z-0"></div>

        {/* ========================================================
            HERO SECTION: DUAL PUBLIC ACADEMY & WAR ROOM PRESENTATION
            ======================================================== */}
        <div className="relative min-h-[85vh] flex flex-col items-center justify-center p-6 w-full z-10 pt-16 pb-24 text-center">
            
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              Public Governor Academy & Enterprise War Room
            </div>

            {/* Grand Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-gray-500 uppercase tracking-widest max-w-5xl leading-tight drop-shadow-md">
              The Complete Rise of Kingdoms <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-300">
                Intelligence Platform
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed mt-5">
              Explore 100% free interactive City Hall rush calculators, beginner survival rules, and commander pairings with <strong>zero login required</strong>. Backed by an enterprise AI analytics suite for elite kingdom leadership.
            </p>

            {/* Dual Main Call-To-Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <a 
                href="#public-academy" 
                className="px-6 py-3.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 hover:border-[#D4AF37]/80 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(212,175,55,0.2)] hover:shadow-[0_0_35px_rgba(212,175,55,0.4)] flex items-center gap-2 group"
              >
                <Castle size={18} className="group-hover:scale-110 transition-transform" />
                <span>Explore Free Governor Academy</span>
                <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
              </a>

              <a 
                href="#war-room-suite" 
                className="px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-xl text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] flex items-center gap-2 group"
              >
                <Zap size={18} className="text-black" />
                <span>Enter War Room (Discord & Passcode)</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Live Metrics / Interactive Value Teleport Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mt-14 w-full text-left">
              
              {/* Card 1: City Hall Guide */}
              <a 
                href="#city-hall-guide"
                className="group bg-[#0f1115]/80 hover:bg-[#131720] p-4 rounded-xl border border-[#1e222b] hover:border-[#D4AF37]/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(212,175,55,0.2)] block text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider group-hover:text-amber-400 transition-colors">
                    City Hall Database
                  </span>
                  <ArrowRight size={13} className="text-slate-600 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
                </div>
                <div className="text-xl font-extrabold text-[#D4AF37] font-mono mt-1">25 Levels</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Every wall & prerequisite mapped</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] mt-2 group-hover:underline">
                  Explore Rush Path &rarr;
                </span>
              </a>

              {/* Card 2: 7 Deadly Traps */}
              <a 
                href="#beginner-traps"
                onClick={() => {
                  window.location.hash = "#beginner-traps";
                  window.dispatchEvent(new HashChangeEvent("hashchange"));
                }}
                className="group bg-[#0f1115]/80 hover:bg-[#131720] p-4 rounded-xl border border-[#1e222b] hover:border-emerald-500/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] block text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider group-hover:text-emerald-400 transition-colors">
                    Beginner Survival
                  </span>
                  <ArrowRight size={13} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">7 Traps</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Avoid fatal early game mistakes</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-2 group-hover:underline">
                  Read 7 Fatal Mistakes &rarr;
                </span>
              </a>

              {/* Card 3: Live Math Calculator */}
              <a 
                href="#speedup-calculator"
                onClick={() => {
                  window.location.hash = "#speedup-calculator";
                  window.dispatchEvent(new HashChangeEvent("hashchange"));
                }}
                className="group bg-[#0f1115]/80 hover:bg-[#131720] p-4 rounded-xl border border-[#1e222b] hover:border-cyan-500/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] block text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider group-hover:text-cyan-400 transition-colors">
                    Calculators
                  </span>
                  <ArrowRight size={13} className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="text-xl font-extrabold text-cyan-400 font-mono mt-1">Live Math</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Runes, titles & alliance helps</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 mt-2 group-hover:underline">
                  Launch Discount Engine &rarr;
                </span>
              </a>

              {/* Card 4: Equipment & Pairings */}
              <a 
                href="#equipment-guide"
                className="group bg-[#0f1115]/80 hover:bg-[#131720] p-4 rounded-xl border border-[#1e222b] hover:border-purple-500/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] block text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider group-hover:text-purple-400 transition-colors">
                    Public Armory
                  </span>
                  <ArrowRight size={13} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="text-xl font-extrabold text-purple-400 font-mono mt-1">0 Login</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Early to SoC BiS gear & pairings</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 mt-2 group-hover:underline">
                  Explore Forge & Pairings &rarr;
                </span>
              </a>

            </div>

            {/* Scroll Indicator */}
            <a 
              href="#public-academy"
              className="mt-12 flex flex-col items-center gap-1 animate-bounce opacity-70 hover:opacity-100 transition-opacity cursor-pointer group"
            >
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Scroll To Explore</span>
              <ChevronDown size={20} className="text-cyan-400" />
            </a>

        </div>

        {/* ========================================================
            SECTION: ACCESS MATRIX (100% FREE VS. RESTRICTED WAR ROOM)
            ======================================================== */}
        <AccessMatrix />

        {/* ========================================================
            SECTION: FREE PUBLIC GOVERNOR ACADEMY (NO LOGIN REQUIRED)
            ======================================================== */}
        <div id="public-academy" className="relative z-10 w-full">
          
          {/* Academy Sub-header */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 mb-3">
              <Award size={13} />
              Open Source Governor Academy • Free Tools
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase font-cinzel">
              Master The Game From Day 1
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mt-2">
              Use our interactive City Hall rush planner, beginner survival playbook, and equipment progression matrix below to fast-track your progression.
            </p>
          </div>

          {/* Module 1: City Hall Upgrade Blueprint & Rush Planner */}
          <CityHallUpgradeGuide />

          {/* Module 2: The New Governor Survival Playbook */}
          <BeginnerPlaybook />

          {/* Module 3: Equipment Progression & Commander Synergy Matrix */}
          <EquipmentGuide />

          {/* Module 4: RoK Album Disguise Studio Showcase */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-20">
            <div className="bg-gradient-to-r from-[#0c101a] via-[#111726] to-[#0c101a] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-[#D4AF37] transition-all">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="flex-1 space-y-3 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Shield size={13} className="text-amber-400" />
                  Anti-Bot Camouflage • In-Game Album Ready
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-cinzel">
                  In-Game RoK Album QR Studio
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed max-w-2xl">
                  Standard QR codes get rejected by Lilith&apos;s automated image filter. Use our Studio to generate an authentic 1080x1080 <strong>Kingdom Strategy Card</strong> with an embedded verification seal that safely passes in-game gallery review.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] font-mono">
                  <span className="text-emerald-400 flex items-center gap-1">
                    ✓ 1080x1080 Square Dimensions
                  </span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    ✓ Level-H 30% Damage Tolerance
                  </span>
                  <span className="text-amber-300 flex items-center gap-1">
                    ✓ Custom Kingdom &amp; Tag
                  </span>
                </div>
              </div>

              <div className="relative z-10 shrink-0">
                <Link
                  href="/album-card"
                  className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all flex items-center gap-2.5"
                >
                  <QrCode size={18} />
                  <span>Launch Album Studio</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================
            SECTION: THE WAR ROOM & HARDCORE COMMAND CENTER (#war-room-suite)
            ======================================================== */}
        <div id="war-room-suite" className="relative z-10 w-full border-t border-[#1e222b] bg-[#070a0e] pt-24 pb-20">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto px-6 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
              <Lock size={13} className="text-rose-400" />
              Classified Intelligence • For Leaders & Hardcore Governors
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 uppercase tracking-widest mb-4">
              War Room Command Portal
            </h2>
            <p className="text-sm md:text-base text-gray-400 font-mono leading-relaxed">
              Automate your KvK DKP tracking, run mathematical player diagnostics with Google Gemini Vision OCR, and deploy interactive territory maps. Log in with Discord or enter your Kingdom Passcode below.
            </p>
          </div>

          {/* Central Glassmorphic Card & Hologram Wrappers */}
          <div className="flex flex-col xl:flex-row items-center justify-center gap-12 w-full max-w-[1400px] mx-auto px-6 perspective-1000">

             {/* LEFT HOLOGRAPHIC PANEL */}
             <div className="hidden xl:flex flex-col opacity-60 hover:opacity-100 transition-duration-700 hover:-translate-y-2 backdrop-blur-md border border-cyan-500/20 bg-cyan-500/5 p-8 rounded-3xl transform rotate-y-[15deg] rotate-z-[2deg] shadow-[-20px_0_50px_rgba(6,182,212,0.1)] w-[320px]">
                 <h3 className="text-cyan-400 font-bold tracking-widest uppercase mb-8 flex items-center gap-3 border-b border-cyan-500/20 pb-4 text-sm shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                   <Cpu size={18} className="animate-pulse"/> Scanner Array
                 </h3>
                 
                 <div className="space-y-6 flex-1 flex flex-col justify-center">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest font-mono text-gray-500"><span>Optical Engine</span><span className="text-cyan-400">Online</span></div>
                      <div className="h-1 bg-[#1e222b] rounded overflow-hidden"><div className="h-full w-full bg-cyan-500 opacity-50 relative overflow-hidden"><div className="absolute inset-0 bg-white/30 animate-[translateX_2s_infinite]"></div></div></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest font-mono text-gray-500"><span>DKP Extractor</span><span className="text-emerald-400">Synced</span></div>
                      <div className="h-1 bg-[#1e222b] rounded overflow-hidden"><div className="h-full w-full bg-emerald-500 opacity-50 relative overflow-hidden"><div className="absolute inset-0 bg-white/30 animate-[translateX_3s_infinite]"></div></div></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest font-mono text-gray-500"><span>AWS Core Node</span><span className="text-amber-400">Stable</span></div>
                      <div className="h-1 bg-[#1e222b] rounded overflow-hidden"><div className="h-full w-[90%] bg-amber-500 opacity-50"></div></div>
                    </div>
                 </div>

                 <div className="mt-8 pt-4 border-t border-cyan-500/20 flex items-center justify-between opacity-50 text-[10px] font-mono text-cyan-400">
                    <span>SYS.NODE.X9</span>
                    <Activity size={12} className="animate-bounce" />
                 </div>
             </div>

             {/* CENTRAL LOGIN TERMINAL */}
             <div className="relative z-10 flex flex-col items-center bg-[#0a0c10]/80 backdrop-blur-3xl border border-cyan-500/20 p-8 sm:p-12 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.9)] transform hover:-translate-y-1 transition-all duration-500 w-full max-w-[440px]">
                
                <div 
                  className="mb-6 w-32 h-32 sm:w-36 sm:h-36 relative group cursor-pointer"
                  onMouseEnter={() => setIsExploding(true)}
                  onMouseLeave={() => setIsExploding(false)}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/25 transition-all duration-700"></div>
                  <AnimatedLogo className="w-full h-full" />
                </div>
                
                <div className="text-center group mb-8 flex flex-col items-center">
                  <div className="font-black text-4xl sm:text-5xl tracking-[0.25em] mb-3 drop-shadow-sm transition-all duration-700 group-hover:tracking-[0.3em] flex flex-col items-center gap-1 cursor-default">
                     <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 w-[260px]">
                       <div className="text-right text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">UN</div>
                       <div className="text-center text-sky-400 font-bold -translate-y-[1px]">.</div>
                       <div className="text-left text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">TY</div>
                     </div>
                     <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 w-[260px] text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] text-[3rem] tracking-[0.2em] transform -translate-x-[2px]">
                       <div className="text-right">2</div>
                       <div className="text-center font-bold text-gray-200 -translate-y-[2px]">.</div>
                       <div className="text-left">0</div>
                     </div>
                  </div>

                  <p className="text-sky-500/60 font-medium tracking-[0.15em] text-[10px] sm:text-xs uppercase drop-shadow-[0_0_5px_rgba(14,165,233,0.3)] font-mono">
                    {t('subtitle_prefix')} <span className="text-cyan-400 font-bold lowercase text-sm">i</span> {t('subtitle_suffix')}
                  </p>
                </div>

                {/* Discord Login Button */}
                <button 
                  onClick={() => signIn("discord")}
                  className="group relative flex items-center justify-center gap-3 w-full px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(88,101,242,0.6)] hover:shadow-[0_15px_40px_-5px_rgba(88,101,242,0.8)] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-150%] skew-x-[-15deg] transition-transform duration-700 ease-in-out group-hover:translate-x-[150%]"></div>
                  <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="currentColor" className="transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                     <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.67,77.67,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.1,46,96,53,91.08,65.69,84.69,65.69Z"/>
                  </svg>
                  <span className="tracking-widest uppercase text-sm drop-shadow-md">{t('login_discord')}</span>
                </button>

                {/* RoK Autonomous Self-Registration & ID Login */}
                <div className="w-full space-y-2.5 mt-3">
                  <button 
                    onClick={() => {
                      setGovModalTab("register");
                      setGovModalOpen(true);
                    }}
                    className="group relative flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-400/30 border border-amber-500/50 hover:border-amber-400 text-amber-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)] cursor-pointer"
                  >
                    <Sparkles size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Self-Register via RoK Profile</span>
                    <span className="text-[9px] font-mono bg-amber-500 text-black px-1.5 py-0.5 rounded font-black">AI</span>
                  </button>

                  <button 
                    onClick={() => {
                      setGovModalTab("login");
                      setGovModalOpen(true);
                    }}
                    className="w-full py-2.5 bg-[#121622] hover:bg-[#181f30] border border-[#232b3e] hover:border-cyan-500/40 text-slate-300 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Key size={14} className="text-cyan-400" />
                    <span>Governor ID &amp; PIN Login</span>
                  </button>
                </div>

                {/* Separator */}
                <div className="flex items-center w-full my-4 opacity-60">
                  <div className="flex-grow border-t border-gray-700"></div>
                  <span className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('missing_discord')}</span>
                  <div className="flex-grow border-t border-gray-700"></div>
                </div>

                {/* Secondary Access Buttons */}
                <div className="w-full space-y-2.5">
                   <button 
                      onClick={() => setGuestModalOpen(true)}
                      className="w-full py-3 bg-[#161a23] hover:bg-[#1c212d] border border-[#2a3041] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 group"
                   >
                      <div className="w-4 h-2.5 bg-rose-500 rounded-[2px] relative flex items-center justify-center before:content-[''] before:w-1 before:h-1 before:bg-[#161a23] before:rounded-full after:content-[''] after:w-1 after:h-1 after:bg-[#161a23] after:rounded-full gap-[1px]"></div>
                      {t('use_guest')}
                   </button>

                   <button 
                      onClick={() => signIn("freemode")}
                      className="w-full py-2.5 bg-transparent border border-dashed border-[#2a3041] hover:border-cyan-500/50 text-gray-400 hover:text-cyan-400 rounded-xl text-xs transition-all flex items-center justify-center gap-2 group"
                   >
                      <Globe size={14} className="opacity-50 group-hover:opacity-100" /> {t('try_freemode')}
                   </button>

                   <div className="pt-2 w-full">
                      <button 
                        onClick={() => setApplyModalOpen(true)}
                        className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                      >
                        <Zap size={14} /> {t('request_setup')}
                      </button>
                   </div>
                </div>

             </div>

             {/* RIGHT HOLOGRAPHIC PANEL */}
             <div className="hidden xl:flex flex-col opacity-60 hover:opacity-100 transition-duration-700 hover:-translate-y-2 backdrop-blur-md border border-indigo-500/20 bg-indigo-500/5 p-8 rounded-3xl transform -rotate-y-[15deg] -rotate-z-[2deg] shadow-[20px_0_50px_rgba(99,102,241,0.1)] w-[320px]">
                 <h3 className="text-indigo-400 font-bold tracking-widest uppercase mb-6 flex items-center gap-3 border-b border-indigo-500/20 pb-4 text-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                   <Database size={18} className="animate-pulse"/> Network Access
                 </h3>
                 
                 <div className="space-y-4 flex-1 flex flex-col justify-center">
                    <div className="border border-indigo-500/10 bg-[#0a0c10]/50 rounded p-3 text-[10px] font-mono text-indigo-300">
                       <div>&gt; _Discord Handshake ...</div>
                       <div className="text-indigo-500">Authorized.</div>
                    </div>
                    <div className="border border-indigo-500/10 bg-[#0a0c10]/50 rounded p-3 text-[10px] font-mono text-indigo-300">
                       <div>&gt; _Fetch Guild Topology ...</div>
                       <div className="text-emerald-500">3 Nodes Discovered.</div>
                    </div>
                    <div className="border border-indigo-500/10 bg-[#0a0c10]/50 rounded p-3 text-[10px] font-mono text-indigo-300">
                       <div>&gt; _Awaiting Auth Payload ...</div>
                       <div className="text-indigo-500 animate-pulse">Standby.</div>
                    </div>
                 </div>

                 <div className="mt-8 pt-4 border-t border-indigo-500/20 flex items-center justify-between opacity-50 text-[10px] font-mono text-indigo-400">
                    <span>SECURE PIPELINE</span>
                    <Terminal size={12} />
                 </div>
             </div>

          </div>

          {/* Guest Passcode Modal Overlay */}
          {isGuestModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl w-full max-w-sm p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                 <button onClick={() => setGuestModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
                 
                 <div className="flex justify-center mb-6">
                   <div className="w-16 h-16 bg-[#161a23] rounded-full border border-[#2a3041] flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                      <Key className="text-rose-500" size={28} />
                   </div>
                 </div>

                 <h2 className="text-center text-white font-bold text-xl tracking-widest uppercase mb-2">{t('access_key_title')}</h2>
                 <p className="text-center text-gray-400 text-xs mb-8">{t('access_key_desc')}</p>
                 
                 <input
                   type="text"
                   value={guestPasscode}
                   onChange={(e) => setGuestPasscode(e.target.value.toUpperCase())}
                   placeholder="XXXXXX"
                   maxLength={6}
                   className="w-full bg-[#0a0c10] border-2 border-[#1e222b] focus:border-rose-500 h-14 rounded-lg text-center text-2xl tracking-[0.5em] font-mono text-white outline-none transition-colors mb-6 placeholder:text-[#1e222b]"
                 />

                 <button
                   onClick={() => signIn("guest", { passcode: guestPasscode })}
                   disabled={guestPasscode.length !== 6}
                   className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg uppercase tracking-widest text-sm transition-all"
                 >
                   {t('btn_verify')}
                 </button>
              </div>
            </div>
          )}

          {/* Governor ID & Profile OCR Modal */}
          <GovernorAuthModal
            isOpen={isGovModalOpen}
            onClose={() => setGovModalOpen(false)}
            initialTab={govModalTab}
          />

          {/* Apply for Access Modal */}
          {isApplyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#0f1115] border border-cyan-500/30 rounded-2xl w-full max-w-sm p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] relative animate-in fade-in zoom-in duration-200">
                 <button onClick={() => setApplyModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
                 
                 <div className="flex justify-center mb-6">
                   <div className="w-16 h-16 bg-[#161a23] rounded-full border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                      <Zap className="text-cyan-400" size={28} />
                   </div>
                 </div>

                 <h2 className="text-center text-white font-bold text-xl tracking-widest uppercase mb-2">{t('req_access_title')}</h2>
                 <p className="text-center text-gray-400 text-xs mb-8 leading-relaxed">
                   {t('req_access_desc')}
                 </p>
                 
                 <div className="bg-[#0a0c10] border-2 border-[#1e222b] rounded-xl p-4 flex flex-col items-center mb-6">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{t('discord_contact')}</span>
                    <span className="text-xl text-white tracking-widest font-mono font-bold select-all">reign3418</span>
                 </div>

                 <button
                   onClick={() => setApplyModalOpen(false)}
                   className="w-full bg-[#1e222b] hover:bg-[#2d323e] text-white font-bold py-3.5 rounded-lg uppercase tracking-widest text-sm transition-all"
                 >
                   {t('btn_acknowledge')}
                 </button>
              </div>
            </div>
          )}

          {/* ========================================================
              MARKETING FEATURE MATRIX: WHAT AWAITS BEHIND THE LOGIN
              ======================================================== */}
          <div className="w-full max-w-5xl mx-auto px-6 pt-24 space-y-28">
              
              {/* Feature 1: OCR */}
              <div className="flex flex-col md:flex-row items-center gap-12 group">
                <div className="flex-1 space-y-4">
                   <div className="w-12 h-12 bg-indigo-500/10 rounded-xl border border-indigo-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                     <UploadCloud className="text-indigo-400" size={24} />
                   </div>
                   <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest">{t('mkt_feat_1_title')}</h3>
                   <p className="text-gray-400 leading-relaxed font-mono text-sm max-w-lg">{t('mkt_feat_1_desc')}</p>
                </div>
                <div className="flex-1 w-full bg-[#0a0c10] border border-[#1e222b] rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-colors relative">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent z-0 opacity-50"></div>
                   <div className="h-[250px] w-full rounded-xl bg-[#0f1115] border border-[#1e222b] flex flex-col items-center justify-center relative overflow-hidden z-10 p-6">
                      <div className="absolute w-[200%] h-[20px] bg-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.5)] rotate-12 animate-pulse top-1/2 -translate-y-1/2 pointer-events-none"></div>
                      <span className="font-mono text-xs text-indigo-400 tracking-widest mb-4 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">[ GEMINI VISION ACTIVE ]</span>
                      <div className="w-full h-8 bg-[#1e222b]/50 rounded mb-2 border border-[#2a3041]/50"></div>
                      <div className="w-3/4 h-8 bg-[#1e222b]/50 rounded border border-[#2a3041]/50"></div>
                   </div>
                </div>
              </div>

              {/* Feature 2: Algorithms */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
                <div className="flex-1 space-y-4 md:pl-12">
                   <div className="w-12 h-12 bg-rose-500/10 rounded-xl border border-rose-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                     <TrendingUp className="text-rose-400" size={24} />
                   </div>
                   <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest">{t('mkt_feat_2_title')}</h3>
                   <p className="text-gray-400 leading-relaxed font-mono text-sm max-w-lg">{t('mkt_feat_2_desc')}</p>
                </div>
                <div className="flex-1 w-full bg-[#0a0c10] border border-[#1e222b] rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-colors relative">
                   <div className="absolute inset-0 bg-gradient-to-bl from-rose-500/10 to-transparent z-0 opacity-50"></div>
                   <div className="h-[250px] w-full rounded-xl bg-[#0f1115] border border-[#1e222b] flex items-center justify-center relative overflow-hidden z-10">
                      <div className="w-48 h-48 rounded-full border border-rose-500/20 border-dashed absolute animate-[spin_20s_linear_infinite]"></div>
                      <div className="w-32 h-32 rounded-full border border-sky-500/20 border-dotted absolute animate-[spin_15s_linear_infinite_reverse]"></div>
                      <span className="font-mono text-xs text-rose-400 tracking-widest bg-[#0a0c10] px-3 py-1 rounded-full border border-[#1e222b] z-20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">ALGORITHMIC TRAJECTORY</span>
                   </div>
                </div>
              </div>

              {/* Feature 3: Discord Integration */}
              <div className="flex flex-col md:flex-row items-center gap-12 group">
                <div className="flex-1 space-y-4">
                   <div className="w-12 h-12 bg-sky-500/10 rounded-xl border border-sky-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                     <Shield className="text-sky-400" size={24} />
                   </div>
                   <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest">{t('mkt_feat_3_title')}</h3>
                   <p className="text-gray-400 leading-relaxed font-mono text-sm max-w-lg">{t('mkt_feat_3_desc')}</p>
                </div>
                <div className="flex-1 w-full bg-[#0a0c10] border border-[#1e222b] rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-colors relative">
                   <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 to-transparent z-0 opacity-50"></div>
                   <div className="h-[250px] w-full rounded-xl bg-[#0f1115] border border-[#1e222b] flex flex-col items-center justify-center relative overflow-hidden z-10 gap-3">
                      <div className="w-3/4 bg-[#5865F2]/10 border border-[#5865F2]/30 p-3 rounded-lg flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 shrink-0"></div>
                         <div className="space-y-1">
                            <div className="w-24 h-3 rounded bg-white/20"></div>
                            <div className="w-40 h-2.5 rounded bg-gray-500/50"></div>
                         </div>
                      </div>
                      <div className="w-3/4 bg-[#1e222b]/30 border border-[#1e222b] p-3 rounded-lg flex items-center gap-3 ml-8">
                         <div className="w-8 h-8 rounded-full bg-[#161a23] shrink-0 border border-cyan-500/30"></div>
                         <div className="space-y-1">
                            <div className="w-32 h-3 rounded bg-cyan-400/50"></div>
                            <div className="w-24 h-2.5 rounded bg-gray-500/50"></div>
                         </div>
                      </div>
                      <span className="font-mono text-xs text-sky-400 tracking-widest mt-2 uppercase shadow-[0_0_15px_rgba(14,165,233,0.1)]">IDENTITY MATRIX SYNCED</span>
                   </div>
                </div>
              </div>

              {/* Feature 4: Web Passcodes for Restricted Regions */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
                <div className="flex-1 space-y-4 md:pl-12">
                   <div className="w-12 h-12 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                     <Key className="text-amber-400" size={24} />
                   </div>
                   <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest">{t('mkt_feat_4_title')}</h3>
                   <p className="text-gray-400 leading-relaxed font-mono text-sm max-w-lg">{t('mkt_feat_4_desc')}</p>
                </div>
                <div className="flex-1 w-full bg-[#0a0c10] border border-[#1e222b] rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-colors relative">
                   <div className="absolute inset-0 bg-gradient-to-bl from-amber-500/10 to-transparent z-0 opacity-50"></div>
                   <div className="h-[250px] w-full rounded-xl bg-[#0f1115] border border-[#1e222b] flex items-center justify-center relative overflow-hidden z-10">
                      <div className="flex flex-col gap-4 w-3/4 mx-auto blur-[1px]">
                         <div className="h-10 border border-amber-500/30 bg-amber-500/5 rounded-lg flex items-center justify-center font-mono text-amber-500 tracking-widest">
                            [ GUEST PASS ALGORITHM ]
                         </div>
                         <div className="h-10 border border-[#1e222b] bg-[#161920] rounded-lg"></div>
                      </div>
                      <div className="absolute z-20 w-48 h-48 border border-amber-500/30 rounded-full animate-[spin_10s_linear_infinite] flex items-center justify-center">
                         <Shield size={64} className="text-amber-500/20" />
                      </div>
                   </div>
                </div>
              </div>

              {/* Feature 5: 3D Scatter Plot */}
              <div className="flex flex-col md:flex-row items-center gap-12 group">
                <div className="flex-1 space-y-4">
                   <div className="w-12 h-12 bg-purple-500/10 rounded-xl border border-purple-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                     <Box className="text-purple-400" size={24} />
                   </div>
                   <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest">{t('mkt_feat_5_title')}</h3>
                   <p className="text-gray-400 leading-relaxed font-mono text-sm max-w-lg">{t('mkt_feat_5_desc')}</p>
                </div>
                <div className="flex-1 w-full bg-[#0a0c10] border border-[#1e222b] rounded-2xl p-2 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-colors relative">
                   <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent z-0 opacity-50 pointer-events-none"></div>
                   <div className="h-[250px] w-full rounded-xl bg-[#0f1115] border border-[#1e222b] relative overflow-hidden z-10 flex items-center justify-center">
                      <LandingTopography />
                   </div>
                </div>
              </div>

          </div>

        </div>

        {/* ========================================================
            SECTION 3: SPONSORSHIP TIER & FOOTER
            ======================================================== */}
        <div className="relative z-10 w-full bg-[#0a0c10] border-t border-[#1e222b] py-16">
            <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-8">
                    <Zap className="text-emerald-400" size={32} />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">{t('mkt_kofi_title')}</h2>
                <p className="text-gray-400 text-sm font-mono leading-relaxed max-w-2xl mx-auto mb-8">
                    {t('mkt_kofi_desc')}
                </p>
                
                <a 
                   href="https://ko-fi.com/ReignsPlace" 
                   target="_blank" 
                   rel="noreferrer" 
                   className="inline-flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 px-8 py-4 rounded-xl transition-all duration-300 font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(16,185,129,0.15)] group"
                >
                   <span className="group-hover:-scale-x-100 transition-transform duration-500">☕</span>
                   {t('btn_support_us')}
                </a>
            </div>
            
            <div className="max-w-6xl mx-auto mt-24 border-t border-[#1e222b] pt-8 flex flex-col md:flex-row items-center justify-between text-xs font-mono text-gray-500 px-6 pb-8 gap-4 text-center md:text-left">
                <span>© {new Date().getFullYear()} Reversing Technologies, LLC. By Kingdom 3418.</span>
                <div className="flex gap-4 uppercase font-bold tracking-widest">
                    <Link href="/terms" className="hover:text-cyan-400 transition-colors">Terms</Link>
                    <Link href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy</Link>
                    <Link href="/contact" className="hover:text-cyan-400 transition-colors">Contact</Link>
                </div>
            </div>
        </div>

      </div>
    );
  }

  // ========================================================
  // AUTHENTICATED DASHBOARD (SHOWN TO LOGGED-IN USERS)
  // ========================================================
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f1115] border border-[#1e222b] p-10 text-center shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <h2 className="text-3xl font-bold text-white mb-4">{t('welcome_title')}</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-lg">
          {t('welcome_desc')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link 
            href="/upload" 
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
          >
            <UploadCloud size={20} />
            {t('btn_upload')}
          </Link>
          <Link 
            href="/album-card" 
            className="inline-flex items-center gap-2 bg-[#121622] hover:bg-[#1a2233] text-amber-300 border border-[#D4AF37]/40 hover:border-[#D4AF37] px-6 py-3 rounded-lg font-bold transition-all"
          >
            <QrCode size={18} className="text-amber-400" />
            <span>RoK Album QR Studio</span>
          </Link>
        </div>
      </div>

      {/* Global Master Clock */}
      <WorldClock />

      {/* SaaS Philosophy Cards */}
      <div className="rounded-2xl border-t-2 border-cyan-500 bg-gradient-to-b from-[#13161c] to-[#0a0c0f] p-10 border border-[#1e222b] shadow-2xl relative overflow-hidden">
        
        <div className="text-center mb-12 relative z-10">
          <h2 className="text-2xl font-bold text-cyan-400 mb-3">{t('saas_title')}</h2>
          <p className="text-gray-400 max-w-3xl mx-auto text-sm leading-relaxed">
            {t('saas_desc_prefix')} <span className="text-white font-bold">{t('saas_desc_highlight')}</span> {t('saas_desc_suffix')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          
          {/* Card 1 */}
          <div className="bg-[#0f1115] p-8 rounded-xl border border-[#1e222b] hover:border-indigo-500/50 transition-colors text-center group">
            <div className="w-14 h-14 mx-auto bg-[#0a0c0f] rounded-full border border-[#1e222b] flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(99,102,241,0.1)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.2)] transition-shadow">
              <Shield className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-3">{t('card_1_title')}</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              {t('card_1_desc')}
            </p>
          </div>

          {/* Card 2 (Highlight) */}
          <div className="bg-[#0f1115] p-8 rounded-xl border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-center relative transform -translate-y-2">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)]"></div>
            <div className="w-14 h-14 mx-auto bg-[#0a0c0f] rounded-full border border-cyan-500/50 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Zap className="text-cyan-400" size={24} fill="currentColor" fillOpacity={0.2} />
            </div>
            <h3 className="text-cyan-400 font-bold mb-3">{t('card_2_title')}</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              {t('card_2_desc')}
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0f1115] p-8 rounded-xl border border-[#1e222b] hover:border-green-500/50 transition-colors text-center group">
            <div className="w-14 h-14 mx-auto bg-[#0a0c0f] rounded-full border border-[#1e222b] flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(34,197,94,0.1)] group-hover:shadow-[0_0_25px_rgba(34,197,94,0.2)] transition-shadow">
              <TrendingUp className="text-green-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-3">{t('card_3_title')}</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              {t('card_3_desc')}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
