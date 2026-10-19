'use client';

import Link from 'next/link';
import {
  BarChart2,
  Target,
  Medal,
  Trophy,
  TrendingUp,
  Crosshair,
  CheckSquare,
  Activity,
  Timer,
  Map as MapIcon,
  Ghost,
  Mail,
  Bot,
  BookOpen,
  Camera,
  Atom,
  UploadCloud,
  User,
  Search,
  ArrowRight,
  Shield,
  Users,
} from 'lucide-react';
import { useValheonCommand } from './ValheonCommandProvider';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import WorldClock from '@/components/WorldClock';

export default function ValheonSovereignBridge() {
  const {
    setIsOmniOpen,
    setIsForensicsOpen,
    setIsOpticsOpen,
    activeKd,
    governorPool,
  } = useValheonCommand();
  const { effectiveIsSuperAdmin, effectiveIsLeader } = useRolePreview();

  const kdLabel = activeKd || '3418';
  const govCount = governorPool?.length || 214;

  const commandGroups = [
    {
      title: 'Kingdom & KvK Analytics',
      subtitle: 'Core performance metrics, DKP scoring, and KvK coalition telemetry',
      icon: BarChart2,
      accent: 'text-cyan-400',
      border: 'border-[#1e222b] hover:border-cyan-500/40',
      badge: `KD ${kdLabel}`,
      badgeStyle: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      primaryHref: '/analysis/kingdom',
      primaryLabel: 'Open Kingdom Analysis',
      links: [
        { label: 'Kingdom Analysis (12-Tab Core)', href: '/analysis/kingdom', icon: BarChart2 },
        { label: 'KvK War Hub', href: '/analysis/kvk', icon: Target },
        { label: 'DKP Scoreboard', href: '/results/dkp', icon: Medal },
        { label: 'Pre-KvK Rankings', href: '/rankings/pre-kvk', icon: Trophy },
        { label: 'Global Kingdom Comparison', href: '/analysis/global', icon: TrendingUp },
      ],
    },
    {
      title: 'Governor Tools & Calculators',
      subtitle: 'Player lookup, math calculators, polygraph auditing, and activity tracking',
      icon: Crosshair,
      accent: 'text-emerald-400',
      border: 'border-[#1e222b] hover:border-emerald-500/40',
      badge: `${govCount} Indexed`,
      badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      primaryHref: '/tools/hunter',
      primaryLabel: 'Launch Player Hunter',
      links: [
        { label: 'Player Hunter', href: '/tools/hunter', icon: Crosshair },
        { label: 'RoK Calculators', href: '/calculators', icon: CheckSquare },
        { label: 'EK Polygraph Audit', href: '/tools/polygraph', icon: Activity },
        { label: 'Activity Tracker', href: '/tools/tracker', icon: Timer },
        { label: '35-Field Governor Telemetry', href: '/tools/governor-telemetry', icon: Users },
      ],
    },
    {
      title: 'Leadership & Diplomacy',
      subtitle: 'Territory planning, migrant screening, alt detection, and in-game mail',
      icon: Shield,
      accent: 'text-amber-400',
      border: 'border-[#1e222b] hover:border-amber-500/40',
      badge: 'R4 / King',
      badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      primaryHref: '/tools/map-planner',
      primaryLabel: 'Open Map Planner',
      links: [
        { label: '128-Node Map Planner', href: '/tools/map-planner', icon: MapIcon },
        { label: 'Recruitment Hitlist', href: '/tools/recruitment-hitlist', icon: Target },
        { label: 'Ghost & Alt Hunter', href: '/tools/ghost-hunter', icon: Ghost },
        { label: 'RoK Mail Formatter', href: '/mail', icon: Mail },
      ],
    },
    {
      title: 'Automation & Reference',
      subtitle: 'Autonomous scanner fleet, OCR ranking parser, 3D galaxy, and field guides',
      icon: Bot,
      accent: 'text-purple-400',
      border: 'border-[#1e222b] hover:border-purple-500/40',
      badge: 'System',
      badgeStyle: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      primaryHref: effectiveIsSuperAdmin ? '/bastion' : '/guide',
      primaryLabel: effectiveIsSuperAdmin ? 'Open Bastion Command' : 'Open Field Guides',
      links: [
        ...(effectiveIsSuperAdmin
          ? [{ label: 'Bastion MoE Scanner Ring', href: '/bastion', icon: Bot }]
          : []),
        { label: 'Ranking Vision Scanner', href: '/tools/ranking-scanner', icon: Camera },
        { label: 'Tactical Field Guide Vault', href: '/guide', icon: BookOpen },
        ...(effectiveIsSuperAdmin
          ? [{ label: 'Project Cerberus 3D', href: '/creator/project-cerberus', icon: Atom }]
          : []),
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Minimalist Command Header & KPI Bar */}
      <div className="rounded-2xl bg-[#0f1115] border border-[#1e222b] p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                KD {kdLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold">
                {govCount} Governors Indexed
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Unity Command Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-2xl">
              Select a workspace below or use quick search to jump directly to any governor, kingdom report, or calculator.
            </p>
          </div>

          {/* Fast Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsOmniOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#161a22] hover:bg-[#1e2430] border border-[#262b36] hover:border-cyan-500/40 text-gray-200 text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <Search size={15} className="text-cyan-400" />
              <span>Quick Search</span>
              <kbd className="text-[10px] font-mono bg-black/40 border border-white/10 px-1.5 py-0.5 rounded text-gray-400">
                Ctrl+K
              </kbd>
            </button>

            <Link
              href="/stats"
              className="px-3.5 py-2.5 rounded-xl bg-[#161a22] hover:bg-[#1e2430] border border-[#262b36] hover:border-cyan-500/40 text-gray-200 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <User size={15} className="text-cyan-400" />
              <span>My Stats</span>
            </Link>

            {(effectiveIsLeader || effectiveIsSuperAdmin) && (
              <Link
                href="/upload"
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              >
                <UploadCloud size={15} />
                <span>Upload Data</span>
              </Link>
            )}

            {effectiveIsSuperAdmin && (
              <Link
                href="/bastion"
                className="px-3.5 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Bot size={15} className="text-purple-400" />
                <span>Bastion Ring</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 4 Clean Core Workspace Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {commandGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div
              key={group.title}
              className={`rounded-2xl bg-[#0f1115] border ${group.border} p-5 flex flex-col justify-between transition-all shadow-lg`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#161a22] border border-[#232834] flex items-center justify-center shrink-0">
                      <GroupIcon size={20} className={group.accent} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {group.title}
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {group.subtitle}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${group.badgeStyle}`}
                  >
                    {group.badge}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1e222b] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {group.links.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#13161d] hover:bg-[#1a1f29] border border-transparent hover:border-[#2a3140] text-xs text-gray-300 hover:text-white transition-all group"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <ItemIcon
                            size={13}
                            className="text-gray-500 group-hover:text-cyan-400 transition-colors shrink-0"
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <ArrowRight
                          size={12}
                          className="text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0"
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e222b]/60 flex items-center justify-between">
                <Link
                  href={group.primaryHref}
                  className={`text-xs font-bold flex items-center gap-1.5 hover:underline ${group.accent}`}
                >
                  <span>{group.primaryLabel}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Chronometer */}
      <WorldClock />
    </div>
  );
}
