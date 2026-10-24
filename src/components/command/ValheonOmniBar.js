'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SUPPORTED_LOCALES } from '@/lib/locales';
import {
  Search,
  Shield,
  Atom,
  Swords,
  Users,
  Camera,
  X,
  ArrowRight,
  Sparkles,
  Activity,
  Ghost,
  Bot,
  Clock,
  Map as MapIcon,
  BarChart2,
  Target,
  Medal,
  Mail,
  QrCode,
  CheckSquare,
  MessageSquare,
  BookOpen,
  UserCheck,
  Terminal,
} from 'lucide-react';
import { useValheonCommand } from './ValheonCommandProvider';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import { formatCompactNumber } from '@/lib/valheonTrustEngine';

export default function ValheonOmniBar() {
  const t = useTranslations('Valheon');
  const router = useRouter();
  const pathname = usePathname();
  const { effectiveIsValheonFounder } = useRolePreview();
  const {
    isOmniOpen,
    setIsOmniOpen,
    governorPool,
    inspectGovernor,
    setIsOpticsOpen,
  } = useValheonCommand();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Extract current locale prefix if present
  const localePrefix = useMemo(() => {
    const seg = pathname?.split('/')[1];
    if (SUPPORTED_LOCALES.includes(seg)) {
      return `/${seg}`;
    }
    return '';
  }, [pathname]);

  const commandSuites = useMemo(
    () => [
      {
        id: 'suite-aegis',
        type: 'suite',
        code: '01 // AEGIS',
        title: t('suite_aegis_title'),
        desc: t('suite_aegis_desc'),
        href: '/aegis',
        icon: Shield,
        accent: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      },
      {
        id: 'suite-nexus',
        type: 'suite',
        code: '02 // NEXUS',
        title: t('suite_nexus_title'),
        desc: t('suite_nexus_desc'),
        href: '/nexus',
        icon: Atom,
        accent: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      },
      {
        id: 'suite-theater',
        type: 'suite',
        code: '03 // THEATER',
        title: t('suite_theater_title'),
        desc: t('suite_theater_desc'),
        href: '/theater',
        icon: Swords,
        accent: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      },
      {
        id: 'suite-vanguard',
        type: 'suite',
        code: '04 // VANGUARD',
        title: t('suite_vanguard_title'),
        desc: t('suite_vanguard_desc'),
        href: '/vanguard',
        icon: Users,
        accent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      },
      {
        id: 'suite-optics',
        type: 'suite',
        code: '05 // OPTICS',
        title: t('suite_optics_title'),
        desc: t('suite_optics_desc'),
        href: '/optics',
        icon: Camera,
        accent: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
      },
    ],
    [t]
  );

  const subTools = useMemo(
    () => [
      {
        id: 'tool-polygraph',
        type: 'tool',
        suite: 'AEGIS',
        title: 'EK Polygraph 3.0',
        keywords: 'polygraph deception spy deadweight health grade',
        href: '/tools/polygraph',
        icon: Activity,
      },
      {
        id: 'tool-ghost',
        type: 'tool',
        suite: 'AEGIS',
        title: 'Ghost & Alt Hunter',
        keywords: 'ghost inactive alt farm correlation',
        href: '/tools/ghost-hunter',
        icon: Ghost,
      },
      {
        id: 'tool-reseller',
        type: 'tool',
        suite: 'AEGIS',
        title: 'Reseller & Farm Bot Radar',
        keywords: 'reseller bot rss gatherer syndicate',
        href: '/tools/reseller-hunter',
        icon: Bot,
      },
      {
        id: 'tool-age',
        type: 'tool',
        suite: 'AEGIS',
        title: 'Account Age & Epoch Audit',
        keywords: 'account age id veteran migrant',
        href: '/tools/account-age',
        icon: Clock,
      },
      {
        id: 'tool-cerberus',
        type: 'tool',
        suite: 'NEXUS',
        title: 'Project Cerberus 5D Galaxy',
        keywords: 'cerberus 3d 5d galaxy webgl benford',
        href: '/creator/project-cerberus',
        icon: Atom,
      },
      {
        id: 'tool-kingdom',
        type: 'tool',
        suite: 'NEXUS',
        title: 'Kingdom Analysis Workbench (12 Tabs)',
        keywords: 'kingdom analysis overview scatter t5 merge',
        href: '/analysis/kingdom',
        icon: BarChart2,
      },
      {
        id: 'tool-dkp',
        type: 'tool',
        suite: 'NEXUS',
        title: 'DKP Leaderboard & HOH Overrides',
        keywords: 'dkp results kills deads honor',
        href: '/results/dkp',
        icon: Medal,
      },
      {
        id: 'tool-map',
        type: 'tool',
        suite: 'THEATER',
        title: '128-Node Crystal Map & MST Planner',
        keywords: 'map crystal bastion flag territory mst',
        href: '/tools/map-planner',
        icon: MapIcon,
      },
      {
        id: 'tool-kvk',
        type: 'tool',
        suite: 'THEATER',
        title: 'KvK Tactical Hub & Timelines',
        keywords: 'kvk pass ruin timeline heroic anthem',
        href: '/analysis/kvk',
        icon: Target,
      },
      {
        id: 'tool-battle',
        type: 'tool',
        suite: 'THEATER',
        title: 'AI Battle Predictor & Lanchester Engine',
        keywords: 'battle predictor combat lanchester rally',
        href: '/creator/lab/battle-predictor',
        icon: Swords,
      },
      {
        id: 'tool-hunter',
        type: 'tool',
        suite: 'VANGUARD',
        title: 'Player Hunter & Migrant Hitlist',
        keywords: 'hunter recruit migrant hitlist',
        href: '/tools/hunter',
        icon: Users,
      },
      {
        id: 'tool-mail',
        type: 'tool',
        suite: 'VANGUARD',
        title: 'RoK Colored Mail Studio',
        keywords: 'mail color broadcast template',
        href: '/mail',
        icon: Mail,
      },
      {
        id: 'tool-album',
        type: 'tool',
        suite: 'VANGUARD',
        title: 'Stealth Album Runic Seal QR Studio',
        keywords: 'album qr seal invite anti-ban',
        href: '/album-card',
        icon: QrCode,
      },
      {
        id: 'tool-scanner',
        type: 'tool',
        suite: 'OPTICS',
        title: 'Vision Ranking Scanner',
        keywords: 'scanner ocr screenshot ranking',
        href: '/tools/ranking-scanner',
        icon: Camera,
      },
      {
        id: 'tool-calc',
        type: 'tool',
        suite: 'OPTICS',
        title: '7 Audited RoK Calculators',
        keywords: 'calculator speedup ap flag resource gear',
        href: '/calculators',
        icon: CheckSquare,
      },
      {
        id: 'tool-translator',
        type: 'tool',
        suite: 'OPTICS',
        title: '17-Language Live Chat Translator',
        keywords: 'translator language chat',
        href: '/translator',
        icon: MessageSquare,
      },
      {
        id: 'tool-peerless',
        type: 'tool',
        suite: 'OPTICS',
        title: 'Peerless Scholar & Lyceum of Wisdom (peerless.early / finals)',
        keywords: 'peerless scholar lyceum quiz midterm finals trivia',
        href: '/tools/peerless',
        icon: BookOpen,
      },
      {
        id: 'tool-swarm-4197',
        type: 'tool',
        suite: 'BASTION',
        title: 'Kingdom #4197 Multi-Bot Swarm & Black-Box Command Deck (T1 ONLY)',
        keywords: 'swarm 4197 blackbox bot rotation t1 farming scout attack belerion',
        href: '/tools/swarm',
        icon: Bot,
      },
    ],
    []
  );

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        ...commandSuites,
        ...governorPool.slice(0, 3).map((g) => ({
          id: `gov-${g.id}`,
          type: 'governor',
          gov: g,
        })),
        ...subTools.slice(0, 6),
      ];
    }

    const matchedSuites = commandSuites.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
    );

    const matchedGovs = governorPool
      .filter(
        (g) =>
          String(g.id).toLowerCase().includes(q) ||
          String(g.name).toLowerCase().includes(q) ||
          String(g.alliance).toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((g) => ({
        id: `gov-${g.id}`,
        type: 'governor',
        gov: g,
      }));

    // If user typed a pure 6-to-10 digit Governor ID not in current pool, allow ad-hoc audit
    if (matchedGovs.length === 0 && /^\d{6,10}$/.test(q)) {
      matchedGovs.push({
        id: `gov-custom-${q}`,
        type: 'governor_custom',
        rawId: q,
      });
    }

    const matchedTools = subTools.filter(
      (tool) =>
        tool.title.toLowerCase().includes(q) ||
        tool.keywords.toLowerCase().includes(q) ||
        tool.suite.toLowerCase().includes(q)
    );

    return [...matchedSuites, ...matchedGovs, ...matchedTools];
  }, [query, commandSuites, governorPool, subTools]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOmniOpen]);

  const executeItem = (item) => {
    if (!item) return;
    if (item.type === 'governor') {
      setIsOmniOpen(false);
      inspectGovernor(item.gov);
    } else if (item.type === 'governor_custom') {
      setIsOmniOpen(false);
      inspectGovernor(item.rawId);
    } else if (item.href) {
      setIsOmniOpen(false);
      router.push(`${localePrefix}${item.href}`);
    }
  };

  if (!effectiveIsValheonFounder || !isOmniOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[10vh] bg-black/75 backdrop-blur-md animate-fade-in px-4"
      onClick={() => setIsOmniOpen(false)}
    >
      <div
        className="w-full max-w-3xl bg-[#06080d] border border-cyan-500/30 shadow-[0_25px_80px_rgba(0,0,0,0.9)] rounded-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-400" />

        {/* Omni Search Input Bar */}
        <div className="p-4 border-b border-[#1e2638] bg-[#0b0e17] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Search size={18} className="text-cyan-400" />
          </div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  filteredResults.length > 0
                    ? (prev + 1) % filteredResults.length
                    : 0
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  filteredResults.length > 0
                    ? (prev - 1 + filteredResults.length) %
                      filteredResults.length
                    : 0
                );
              } else if (e.key === 'Enter' && filteredResults[activeIndex]) {
                e.preventDefault();
                executeItem(filteredResults[activeIndex]);
              }
            }}
            placeholder={t('omni_placeholder')}
            className="w-full bg-transparent text-white placeholder:text-slate-500 font-mono text-sm sm:text-base outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setIsOmniOpen(false);
              setIsOpticsOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-xs font-mono shrink-0 transition-all"
          >
            <Camera size={13} />
            <span>{t('omni_btn_optics')}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsOmniOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Stream */}
        <div className="max-h-[62vh] overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-[#1e2638]">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              <Terminal size={28} className="mx-auto mb-2 text-cyan-500/40" />
              <div>{t('omni_no_results')}</div>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === activeIndex;

              if (item.type === 'suite') {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => executeItem(item)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : 'bg-[#0b0e17] border-[#1e2638] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.accent}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black tracking-wider text-cyan-400">
                            {item.code}
                          </span>
                          <span className="text-sm font-black text-white truncate">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 shrink-0">
                      <span className="hidden sm:inline">{t('omni_open_suite')}</span>
                      <ArrowRight size={14} />
                    </div>
                  </button>
                );
              }

              if (item.type === 'governor') {
                const g = item.gov;
                const badgeTone =
                  g.trustColor === 'emerald'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : g.trustColor === 'amber'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : g.trustColor === 'rose'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => executeItem(item)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/60'
                        : 'bg-[#0b0e17]/70 border-[#1e2638] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <UserCheck size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>
                            [{g.alliance}] {g.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {g.id}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {formatCompactNumber(g.power)} Power •{' '}
                          {formatCompactNumber(g.killPoints)} KP •{' '}
                          {formatCompactNumber(g.deads)} Dead
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-mono font-black ${badgeTone}`}
                      >
                        {g.trustIndex} TRUST
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 hidden sm:inline">
                        {t('omni_audit_gov')} →
                      </span>
                    </div>
                  </button>
                );
              }

              if (item.type === 'governor_custom') {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => executeItem(item)}
                    className="w-full text-left p-3 rounded-xl border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={18} className="text-amber-400" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {t('omni_audit_gov')}: ID #{item.rawId}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {t('forensics_subtitle')}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={15} className="text-cyan-400" />
                  </button>
                );
              }

              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => executeItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-white'
                      : 'bg-transparent border-transparent text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className="text-cyan-400" />
                    <span className="text-xs font-semibold">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0b0e17] border border-[#1e2638] text-slate-400">
                    {item.suite}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-[#0b0e17] border-t border-[#1e2638] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                ↑↓
              </kbd>{' '}
              {t('omni_hint_nav')}
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                Enter
              </kbd>{' '}
              {t('omni_hint_select')}
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                Ctrl+Shift+F
              </kbd>{' '}
              {t('forensics_tag')}
            </span>
          </div>
          <span className="text-cyan-400 font-bold">
            VALHEON // SOVEREIGN COMMAND OS
          </span>
        </div>
      </div>
    </div>
  );
}
