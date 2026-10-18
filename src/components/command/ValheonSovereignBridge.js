'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Shield,
  Atom,
  Swords,
  Users,
  Camera,
  BookOpen,
  Sparkles,
  Search,
  ArrowRight,
  Compass,
  Crown,
  Layers,
  EyeOff,
  Activity,
  Cpu,
  Radio,
  Lock,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { useValheonCommand } from './ValheonCommandProvider';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import WorldClock from '@/components/WorldClock';

export default function ValheonSovereignBridge() {
  const tValheon = useTranslations('Valheon');
  const {
    setIsOmniOpen,
    setIsForensicsOpen,
    setIsOpticsOpen,
    activeKd,
    governorPool,
  } = useValheonCommand();
  const { setOsMode } = useRolePreview();
  const [guideStats, setGuideStats] = useState({
    total: 95,
    published: 66,
    comingSoon: 29,
    featured: [],
  });
  const [activePillarHover, setActivePillarHover] = useState(0);

  useEffect(() => {
    fetch('/data/roknut_95_guides_scrubbed.json')
      .then((r) => r.json())
      .then((d) => {
        if (d?.guides) {
          setGuideStats({
            total: d.totalGuides || 95,
            published: d.publishedGuides || 66,
            comingSoon: d.comingSoonGuides || 29,
            featured: d.guides.filter((g) => !g.isComingSoon).slice(0, 6),
          });
        }
      })
      .catch(() => {});
  }, []);

  const pillars = [
    {
      num: 'I',
      code: 'PILLAR I // COUNTER-INTELLIGENCE',
      name: 'AEGIS',
      subtitle: '5-Model Deception & Deadweight Forensics',
      desc: 'EK Polygraph 3.0, Ghost/Alt Correlation Matrix, Reseller Bot Radar, and Account Epoch Forensics.',
      href: '/aegis',
      icon: Shield,
      gradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      border: 'border-amber-500/40 hover:border-amber-300',
      accentText: 'text-amber-300',
      badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
      metric: '5 AI Models Active',
      subLinks: [
        { label: 'EK Polygraph 3.0', href: '/tools/polygraph' },
        { label: 'Ghost & Alt Hunter', href: '/tools/ghost-hunter' },
        { label: 'Reseller Radar', href: '/tools/reseller-hunter' },
        { label: 'Account Age Audit', href: '/tools/account-age' },
      ],
    },
    {
      num: 'II',
      code: 'PILLAR II // 3D GALAXY TELEMETRY',
      name: 'NEXUS',
      subtitle: 'Cerberus 3D Topography & 60fps DKP Engine',
      desc: 'WebGL 3D Governor Scatter Galaxy, Off-Thread WebWorker DKP Scoring, and 12-Tab Kingdom Core.',
      href: '/nexus',
      icon: Atom,
      gradient: 'from-purple-500/25 via-fuchsia-500/10 to-transparent',
      border: 'border-purple-500/40 hover:border-purple-300',
      accentText: 'text-purple-300',
      badgeBg: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
      metric: '60fps WebWorker',
      subLinks: [
        { label: 'Kingdom 12-Tab Core', href: '/analysis/kingdom' },
        { label: 'DKP Scoreboard', href: '/results/dkp' },
        { label: 'Cerberus 3D Galaxy', href: '/creator/project-cerberus' },
        { label: 'Activity Tracker', href: '/tools/tracker' },
      ],
    },
    {
      num: 'III',
      code: 'PILLAR III // TACTICAL WAR ROOM',
      name: 'THEATER',
      subtitle: '128-Node Crystal Map & KvK Coalition Predictor',
      desc: 'Interactive territory map planner, AI KvK outcome simulator, Pass opening UTC timers, and Discord orders.',
      href: '/theater',
      icon: Swords,
      gradient: 'from-rose-500/25 via-orange-500/10 to-transparent',
      border: 'border-rose-500/40 hover:border-rose-300',
      accentText: 'text-rose-300',
      badgeBg: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
      metric: '128 Map Nodes',
      subLinks: [
        { label: '128-Node Map Planner', href: '/tools/map-planner' },
        { label: 'KvK War Hub', href: '/analysis/kvk' },
        { label: 'Pre-KvK Rankings', href: '/rankings/pre-kvk' },
        { label: 'Global Analysis', href: '/analysis/global' },
      ],
    },
    {
      num: 'IV',
      code: 'PILLAR IV // MIGRATION & DIPLOMACY',
      name: 'VANGUARD',
      subtitle: 'Kanban Recruitment CRM & RoK Mail Studio',
      desc: 'Migrant screening pipeline, cross-kingdom Player Hunter, formatted in-game mail generator, and QR Album Seals.',
      href: '/vanguard',
      icon: Users,
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      border: 'border-emerald-500/40 hover:border-emerald-300',
      accentText: 'text-emerald-300',
      badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
      metric: 'CRM + Mail Studio',
      subLinks: [
        { label: 'Recruitment Hitlist', href: '/tools/recruitment-hitlist' },
        { label: 'Player Hunter', href: '/tools/hunter' },
        { label: 'RoK Mail Studio', href: '/mail' },
        { label: 'Album QR Studio', href: '/album-card' },
      ],
    },
    {
      num: 'V',
      code: 'PILLAR V // AI VISION & CALCULATORS',
      name: 'OPTICS',
      subtitle: 'Gemini 3.1 Vision OCR & 7 Audited Calculators',
      desc: 'Ctrl+V clipboard screenshot parser, floating desktop scanner applet, 7 RoK calculators, and 12-language chat.',
      href: '/optics',
      icon: Camera,
      gradient: 'from-fuchsia-500/25 via-amber-500/10 to-transparent',
      border: 'border-fuchsia-500/40 hover:border-fuchsia-300',
      accentText: 'text-fuchsia-300',
      badgeBg: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40',
      metric: '$0.00 Local Vision',
      subLinks: [
        { label: '7 RoK Calculators', href: '/calculators' },
        { label: 'Ranking Scanner OCR', href: '/tools/ranking-scanner' },
        { label: 'Kingdom Rollup', href: '/tools/kingdom-rollup' },
        { label: '12-Lang Translator', href: '/translator' },
      ],
    },
  ];

  return (
    <div className="space-y-8 pb-16 relative">
      {/* =====================================================================
          HERO CITADEL DECK: ANIMATED ASTROLABE, IMPERIAL GOLD & AMETHYST HUD
          ===================================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/35 bg-gradient-to-br from-[#140d26] via-[#0b0716] to-[#1a0f1e] shadow-[0_25px_90px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(253,224,71,0.25)] p-6 sm:p-10">
        {/* Ambient Molten Gold & Royal Violet Flares */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-amber-500/15 blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />

        {/* Animated Orbital Astrolabe Graphic (Right Side Background / Decorative) */}
        <div className="hidden xl:flex items-center justify-center absolute right-8 top-1/2 -translate-y-1/2 w-[360px] h-[360px] pointer-events-none opacity-90">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <linearGradient id="valheonGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <radialGradient id="valheonCoreGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(234, 179, 8, 0.35)" />
                <stop offset="60%" stopColor="rgba(168, 85, 247, 0.12)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>
            </defs>

            {/* Core Nebula Glow */}
            <circle cx="200" cy="200" r="170" fill="url(#valheonCoreGlow)" />

            {/* Outer Rotating Astrolabe Ring (Clockwise) */}
            <g className="valheon-orbit-cw" style={{ transformOrigin: '200px 200px' }}>
              <circle
                cx="200"
                cy="200"
                r="165"
                fill="none"
                stroke="url(#valheonGoldGrad)"
                strokeWidth="1.5"
                strokeDasharray="10 6 2 6"
                opacity="0.55"
              />
              <polygon
                points="200,28 206,42 194,42"
                fill="#fde047"
                opacity="0.8"
              />
              <polygon
                points="200,372 206,358 194,358"
                fill="#a855f7"
                opacity="0.8"
              />
              <circle cx="365" cy="200" r="4" fill="#fde047" />
              <circle cx="35" cy="200" r="4" fill="#f43f5e" />
            </g>

            {/* Middle Counter-Rotating Sacred Geometry Ring */}
            <g className="valheon-orbit-ccw" style={{ transformOrigin: '200px 200px' }}>
              <circle
                cx="200"
                cy="200"
                r="128"
                fill="none"
                stroke="#eab308"
                strokeWidth="1.2"
                strokeDasharray="28 14"
                opacity="0.45"
              />
              <rect
                x="110"
                y="110"
                width="180"
                height="180"
                fill="none"
                stroke="url(#valheonGoldGrad)"
                strokeWidth="1"
                opacity="0.3"
                transform="rotate(45 200 200)"
              />
              <rect
                x="110"
                y="110"
                width="180"
                height="180"
                fill="none"
                stroke="#a855f7"
                strokeWidth="1"
                opacity="0.3"
              />
            </g>

            {/* Inner Telemetry Ring */}
            <circle
              cx="200"
              cy="200"
              r="76"
              fill="rgba(12, 7, 24, 0.85)"
              stroke="#fde047"
              strokeWidth="1.5"
              opacity="0.85"
            />
            {/* 5 Pillar Nodes on Orbit */}
            {[0, 72, 144, 216, 288].map((deg, idx) => {
              const rad = (deg * Math.PI) / 180;
              const cx = 200 + Math.cos(rad) * 128;
              const cy = 200 + Math.sin(rad) * 128;
              return (
                <g key={idx}>
                  <circle cx={cx} cy={cy} r="6" fill="#fde047" />
                  <circle
                    cx={cx}
                    cy={cy}
                    r="12"
                    fill="none"
                    stroke="#fde047"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                </g>
              );
            })}

            {/* Center Sovereign Monolith Crown */}
            <polygon
              points="200,148 238,200 200,252 162,200"
              fill="url(#valheonGoldGrad)"
              className="valheon-pulse-gold"
            />
            <text
              x="200"
              y="205"
              textAnchor="middle"
              fill="#090514"
              fontSize="14"
              fontWeight="900"
              fontFamily="monospace"
            >
              V-OS
            </text>
          </svg>
        </div>

        {/* Left Content Column */}
        <div className="relative z-10 max-w-3xl space-y-5">
          {/* Top Sovereign Status Strip */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-purple-500/20 border border-amber-400/50 text-amber-200 text-[11px] font-mono font-black tracking-[0.18em] uppercase shadow-[0_0_25px_rgba(234,179,8,0.25)]">
              <Crown size={13} className="text-amber-300" />
              <span>VALHEON SOVEREIGN CITADEL // FOUNDER EXCLUSIVE</span>
            </span>

            <button
              type="button"
              onClick={() => setOsMode('unity')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-cyan-500/20 border border-white/15 hover:border-cyan-400/50 text-slate-200 hover:text-cyan-200 text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Instantly switch to 100% pure Classic UN.TY with zero preview banners for taking screenshots (Hotkey: Alt+V)"
            >
              <EyeOff size={12} className="text-cyan-400" />
              <span>📸 Switch to Classic UN.TY (Screenshot Mode)</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-amber-300">
                Alt+V
              </kbd>
            </button>
          </div>

          {/* Imperial Cinzel Headline */}
          <div>
            <h1 className="font-cinzel text-3xl sm:text-5xl font-black tracking-[0.12em] uppercase leading-tight gold-gradient-text drop-shadow-[0_4px_25px_rgba(234,179,8,0.35)]">
              VALHEON SOVEREIGN OS
            </h1>
            <p className="text-sm sm:text-base text-purple-100/80 max-w-2xl mt-2.5 leading-relaxed font-sans">
              Next-Generation Kingdom Intelligence, 5-Model AI Deception Forensics, 60fps 3D Galaxy Telemetry, and the{' '}
              <span className="text-amber-300 font-bold">
                95 Scrubbed Rise of Kingdoms Field Guides Vault
              </span>{' '}
              — evolving in stealth inside your live infrastructure.
            </p>
          </div>

          {/* Live Sovereign Telemetry Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-[#090514]/85 border border-amber-500/30 shadow-inner">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80">
                Active Kingdom
              </div>
              <div className="text-2xl font-black font-mono text-amber-300 mt-0.5">
                #{activeKd || '3418'}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                ● DynamoDB Live Sync
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#090514]/85 border border-purple-500/30 shadow-inner">
              <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300/80">
                Command Suites
              </div>
              <div className="text-2xl font-black font-mono text-purple-200 mt-0.5">
                5 Pillars
              </div>
              <div className="text-[10px] font-mono text-purple-300/80 mt-0.5">
                71 Modules Unified
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#090514]/85 border border-amber-500/30 shadow-inner">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80">
                Scrubbed RoK Vault
              </div>
              <div className="text-2xl font-black font-mono text-amber-300 mt-0.5">
                {guideStats.total} Guides
              </div>
              <div className="text-[10px] font-mono text-amber-200/80 mt-0.5">
                {guideStats.published} Live • {guideStats.comingSoon} Gaps
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#090514]/85 border border-rose-500/30 shadow-inner">
              <div className="text-[10px] font-mono uppercase tracking-widest text-rose-300/80">
                Aegis Trust Pool
              </div>
              <div className="text-2xl font-black font-mono text-rose-200 mt-0.5">
                {governorPool?.length || 8} Govs
              </div>
              <div className="text-[10px] font-mono text-rose-300/80 mt-0.5">
                5-Model Vector Ready
              </div>
            </div>
          </div>

          {/* Primary Sovereign Action Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/guide?tab=valheon-vault"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-[#090514] font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(234,179,8,0.45)] transition-all flex items-center gap-2"
            >
              <Crown size={17} />
              <span>Open All 95 Scrubbed RoK Guides</span>
              <ArrowRight size={15} />
            </Link>

            <button
              type="button"
              onClick={() => setIsOmniOpen(true)}
              className="px-4 py-3 rounded-xl bg-[#160d29] hover:bg-[#21133d] border border-purple-400/40 hover:border-amber-400 text-amber-200 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <Search size={15} className="text-amber-300" />
              <span>Omni-Command</span>
              <kbd className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[10px]">
                Ctrl+K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsForensicsOpen(true)}
              className="px-4 py-3 rounded-xl bg-[#160d29] hover:bg-[#21133d] border border-amber-500/35 hover:border-amber-400 text-emerald-300 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <Shield size={15} className="text-emerald-400" />
              <span>5-Model Governor Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpticsOpen(true)}
              className="px-4 py-3 rounded-xl bg-[#160d29] hover:bg-[#21133d] border border-fuchsia-500/35 hover:border-fuchsia-400 text-fuchsia-200 font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera size={15} className="text-fuchsia-400" />
              <span>Optics Vision HUD (Ctrl+V)</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          THE 5 SOVEREIGN PILLARS — HOLOGRAPHIC IMPERIAL GOLD & AMETHYST DECK
          ===================================================================== */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <div className="text-[11px] font-mono font-black uppercase tracking-[0.25em] text-amber-400 flex items-center gap-2">
              <Sparkles size={13} />
              <span>SOVEREIGN ARCHITECTURE // 5 UNIFIED COMMAND SUITES</span>
            </div>
            <h2 className="font-cinzel text-2xl font-black text-white tracking-wider mt-0.5">
              Choose a Command Pillar
            </h2>
          </div>
          <span className="text-xs font-mono text-purple-200/70">
            Click any Pillar card to launch its unified workbench or jump directly to a sub-tool
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            const isHovered = activePillarHover === idx;
            return (
              <div
                key={p.name}
                onMouseEnter={() => setActivePillarHover(idx)}
                className={`rounded-2xl bg-gradient-to-b ${p.gradient} bg-[#0d0818]/95 border ${p.border} p-5 flex flex-col justify-between transition-all duration-300 shadow-[0_15px_45px_rgba(0,0,0,0.75)] hover:-translate-y-1.5 relative overflow-hidden group`}
              >
                {/* Top Corner Roman Numeral Crest */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${p.badgeBg}`}
                  >
                    PILLAR {p.num}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {p.metric}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div className="mt-4">
                  <Link
                    href={p.href}
                    className="flex items-center gap-2.5 group-hover:opacity-95"
                  >
                    <div className="w-10 h-10 rounded-xl bg-black/50 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Icon size={20} className={p.accentText} />
                    </div>
                    <div>
                      <div className="font-cinzel text-lg font-black text-white tracking-wider group-hover:text-amber-300 transition-colors">
                        {p.name}
                      </div>
                      <div className={`text-[11px] font-bold ${p.accentText}`}>
                        {p.subtitle}
                      </div>
                    </div>
                  </Link>

                  <p className="text-xs text-slate-300/85 mt-3 leading-relaxed">
                    {p.desc}
                  </p>
                </div>

                {/* Direct Sub-Module Jump Links */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
                    Integrated Modules:
                  </div>
                  {p.subLinks.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className="flex items-center justify-between text-xs font-mono text-slate-300 hover:text-amber-300 py-1 px-2 rounded-lg hover:bg-white/5 transition-all"
                    >
                      <span className="truncate">• {sub.label}</span>
                      <ArrowRight size={11} className="shrink-0 opacity-60" />
                    </Link>
                  ))}
                </div>

                {/* Launch Suite Footer CTA */}
                <Link
                  href={p.href}
                  className={`mt-4 w-full py-2.5 px-3 rounded-xl bg-black/50 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/50 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-between transition-all ${p.accentText}`}
                >
                  <span>Enter {p.name} Suite</span>
                  <ArrowRight
                    size={13}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          LIVE 95-GUIDE STRATEGIC INTELLIGENCE VAULT PREVIEW DECK
          ===================================================================== */}
      <div className="rounded-3xl border border-amber-500/35 bg-gradient-to-r from-[#130c24] via-[#0e091a] to-[#170d20] p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-black uppercase tracking-[0.2em] text-amber-300">
              <BookOpen size={14} />
              <span>COMPETITIVE INTELLIGENCE // 95 SCRUBBED ROK FIELD GUIDES</span>
            </div>
            <h3 className="font-cinzel text-2xl font-black text-white">
              Valheon Strategic Doctrine Vault ({guideStats.published} Published +{' '}
              {guideStats.comingSoon} Competitor Gaps)
            </h3>
          </div>

          <Link
            href="/guide?tab=valheon-vault"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_25px_rgba(245,158,11,0.35)]"
          >
            <span>Browse All 95 Guides</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* 6 Featured Guides Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {guideStats.featured.map((g) => (
            <Link
              key={g.id}
              href="/guide?tab=valheon-vault"
              className="p-4 rounded-2xl bg-[#090514]/90 border border-amber-500/25 hover:border-amber-400/70 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold uppercase">
                    {g.valheonPillar || g.category}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    ✓ {g.readTimeMinutes || 8}m Read
                  </span>
                </div>
                <div className="text-sm font-black text-white group-hover:text-amber-300 transition-colors mt-2.5">
                  {g.title}
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {g.summary}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-amber-300">
                <span>Read Full Guide in Vault</span>
                <ArrowRight
                  size={12}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Global Chronometer */}
      <WorldClock />
    </div>
  );
}
