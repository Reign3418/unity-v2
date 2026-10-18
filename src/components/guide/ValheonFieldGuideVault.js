'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  Shield,
  Swords,
  Crown,
  Sparkles,
  ArrowLeft,
  Clock,
  CheckSquare,
  Camera,
  Lock,
  Layers,
  Users,
  Gift,
  Copy,
  Check,
  Award,
  Flame,
  Crosshair,
  ChevronRight,
} from 'lucide-react';

const TIER_COLORS = {
  Z: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/50 shadow-[0_0_12px_rgba(217,70,239,0.25)]',
  S: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
  A: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  B: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
  C: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
};

const TROOP_BADGES = {
  infantry: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  cavalry: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  archer: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  leadership: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  engineering: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export default function ValheonFieldGuideVault({ initialSection = 'tiers' }) {
  const [vaultData, setVaultData] = useState(null);
  const [metaData, setMetaData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Top-level sub-module switcher: 'tiers' | 'commanders' | 'fleets' | 'dossiers'
  const [activeSection, setActiveSection] = useState(initialSection);

  // Module 1: 95 Dossiers state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuide, setActiveGuide] = useState(null);

  // Module 2: 20 Stage Tier Matrices state
  const [selectedStage, setSelectedStage] = useState('soc');
  const [selectedListSlug, setSelectedListSlug] = useState('field');

  // Module 3: 141 Commander Roster state
  const [cmdSearch, setCmdSearch] = useState('');
  const [cmdTroopFilter, setCmdTroopFilter] = useState('all');
  const [cmdRarityFilter, setCmdRarityFilter] = useState('all');
  const [activeCommander, setActiveCommander] = useState(null);

  // Module 4: 5/6/7-March Fleets & Codes state
  const [fleetCountFilter, setFleetCountFilter] = useState('all');
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const sec = sp.get('section');
      if (sec && ['tiers', 'commanders', 'fleets', 'dossiers'].includes(sec)) {
        setActiveSection(sec);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch('/data/roknut_95_guides_scrubbed.json').then((r) => r.json()).catch(() => null),
      fetch('/data/valheon_tactical_meta.json').then((r) => r.json()).catch(() => null),
    ]).then(([guidesJson, metaJson]) => {
      if (mounted) {
        setVaultData(guidesJson);
        setMetaData(metaJson);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const guides = vaultData?.guides || [];
  const commanders = metaData?.commanders || [];
  const tierMatrices = metaData?.tier_matrices || {};
  const marchFleets = metaData?.march_fleets || [];
  const redeemCodes = metaData?.redeem_codes || { active: [], expired_recent: [] };

  // Commander lookup by slug
  const commanderBySlug = useMemo(() => {
    const map = {};
    for (const c of commanders) {
      map[c.slug] = c;
    }
    return map;
  }, [commanders]);

  // Guide lookup by id
  const guideById = useMemo(() => {
    const map = {};
    for (const g of guides) {
      map[g.id] = g;
    }
    return map;
  }, [guides]);

  const categoryCounts = useMemo(() => {
    const counts = { all: guides.length };
    for (const g of guides) {
      const k = g.category_key || 'other';
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [guides]);

  const categoriesList = useMemo(() => {
    const rawCats = vaultData?.categories || {};
    const items = [{ key: 'all', label: 'All Dossiers', count: guides.length }];
    for (const [k, v] of Object.entries(rawCats)) {
      if (categoryCounts[k]) {
        items.push({
          key: k,
          label: v.label || k,
          count: categoryCounts[k] || 0,
        });
      }
    }
    return items;
  }, [vaultData, guides.length, categoryCounts]);

  const filteredGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return guides.filter((g) => {
      if (selectedCategory !== 'all' && g.category_key !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const hay = `${g.title || ''} ${g.summary || ''} ${g.category_label || ''} ${g.content_markdown || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [guides, selectedCategory, searchQuery]);

  // Stage-filtered tier lists
  const stageTierLists = useMemo(() => {
    return Object.values(tierMatrices).filter((tl) => tl.stage_key === selectedStage);
  }, [tierMatrices, selectedStage]);

  useEffect(() => {
    if (stageTierLists.length > 0 && !stageTierLists.some((x) => x.slug === selectedListSlug)) {
      setSelectedListSlug(stageTierLists[0].slug);
    }
  }, [stageTierLists, selectedListSlug]);

  const currentTierMatrix = tierMatrices[selectedListSlug] || stageTierLists[0] || null;

  // Filtered 141 Commanders
  const filteredCommanders = useMemo(() => {
    const q = cmdSearch.trim().toLowerCase();
    return commanders.filter((c) => {
      if (cmdTroopFilter !== 'all' && c.troop_type !== cmdTroopFilter) return false;
      if (cmdRarityFilter !== 'all' && c.rarity !== cmdRarityFilter) return false;
      if (!q) return true;
      const hay = `${c.name} ${c.title} ${c.civilization} ${c.troop_type} ${(c.damage_types || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [commanders, cmdSearch, cmdTroopFilter, cmdRarityFilter]);

  // Filtered March Fleets
  const filteredFleets = useMemo(() => {
    if (fleetCountFilter === 'all') return marchFleets;
    if (fleetCountFilter === 'swarming') return marchFleets.filter((m) => m.mode === 'swarming');
    const n = Number(fleetCountFilter);
    return marchFleets.filter((m) => m.mode === 'field' && m.march_count === n);
  }, [marchFleets, fleetCountFilter]);

  const handleCopyCode = (code) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const openCommanderDossier = (slug) => {
    const cmd = commanderBySlug[slug];
    if (cmd) {
      setActiveGuide(null);
      setActiveCommander(cmd);
      setActiveSection('commanders');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const openGuideById = (id) => {
    const g = guideById[id];
    if (g) {
      setActiveCommander(null);
      setActiveGuide(g);
      setActiveSection('dossiers');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0d1117] border border-amber-500/30 rounded-xl p-12 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono uppercase tracking-widest text-amber-300">
          Decrypting 95 Field Dossiers + 141 Commander Tactical Matrices...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SuperAdmin Command Header Banner + 4-Module Tactical Switcher */}
      <div className="bg-gradient-to-r from-[#130c24] via-[#0e091a] to-[#170d20] border border-amber-500/40 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Lock size={10} /> Valheon Tactical Meta &amp; Doctrine Vault
              </span>
              <span className="px-2.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 font-mono text-[10px] font-black uppercase tracking-widest">
                20 Stage Tier Matrices
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-black uppercase tracking-widest">
                141 Commanders • 694 Skills • 74pt Builds
              </span>
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-black uppercase tracking-widest">
                19 Multi-March Fleets • 95 Dossiers
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide font-cinzel">
              Valheon Tactical Meta &amp; Field Guide Vault
            </h2>
            <p className="text-xs text-slate-300">
              Select any of the 4 intelligence modules below: Pre-KvK to SoC Tier Matrices, 141 Commander 74-point Talent Builds, 5/6/7-March Fleet Lineups &amp; Active Codes, or the 95 Written Field Dossiers.
            </p>
          </div>
        </div>

        {/* 4-Card Tactical Module Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'tiers',
              label: '20 Stage Tier Matrices',
              sub: 'Pre-KvK • KvK 1 • KvK 2 • KvK 3 • SoC',
              badge: 'Z–C TIERS',
              icon: Layers,
            },
            {
              id: 'commanders',
              label: '141 Commanders & Builds',
              sub: '694 Skills • 74pt Talents • Gear & Formations',
              badge: '141 CMDRS',
              icon: Shield,
            },
            {
              id: 'fleets',
              label: '5/6/7-March Fleets & Codes',
              sub: '19 Multi-March Lineups • 4 Active Gift Codes',
              badge: '19 FLEETS',
              icon: Swords,
            },
            {
              id: 'dossiers',
              label: '95 Written Field Dossiers',
              sub: 'Full Scrubbed Playbooks & Mechanics',
              badge: '95 GUIDES',
              icon: BookOpen,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveSection(tab.id);
                  setActiveGuide(null);
                  setActiveCommander(null);
                }}
                className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-br from-amber-500/25 via-amber-500/10 to-[#140d26] text-white border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-[#090514]/90 text-slate-300 border-white/10 hover:border-amber-500/50 hover:bg-[#120b24]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isActive
                          ? 'bg-amber-400 text-black'
                          : 'bg-white/5 text-amber-300'
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <span className="font-mono text-[10px] font-black uppercase tracking-wider text-amber-300">
                      {tab.badge}
                    </span>
                  </div>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-mono text-[9px] font-black uppercase">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-white">
                    {tab.label}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                    {tab.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MODULE 1: 95 SCRUBBED FIELD GUIDE DOSSIERS
      ===================================================================== */}
      {activeSection === 'dossiers' && activeGuide && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d1117] border border-amber-500/30 rounded-xl p-4">
            <button
              type="button"
              onClick={() => setActiveGuide(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161b24] hover:bg-[#1e2636] text-amber-300 border border-amber-500/30 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to All 95 Dossiers</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/calculators"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/30 text-[11px] font-mono font-bold uppercase"
              >
                <CheckSquare size={12} />
                <span>Launch AI Calculators</span>
              </Link>
              <Link
                href="/optics"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-bold uppercase"
              >
                <Camera size={12} />
                <span>Valheon Optics OCR</span>
              </Link>
            </div>
          </div>

          <div className="bg-[#0b0e14] border border-[#1e2638] rounded-2xl p-6 md:p-10 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-widest">
              <span className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                {activeGuide.category_label}
              </span>
              <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                <Clock size={11} /> {Math.max(1, Math.round((activeGuide.word_count || 300) / 200))} min read ({activeGuide.word_count} words)
              </span>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <Lock size={11} /> Scrubbed Archive Vault
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
              {activeGuide.title}
            </h2>

            {activeGuide.summary && (
              <div className="border-l-2 border-amber-500/60 pl-4 py-1 text-slate-300 text-sm leading-relaxed bg-amber-500/5 rounded-r-lg">
                {activeGuide.summary}
              </div>
            )}

            <div
              className="valheon-dossier-article prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-4 pt-4 border-t border-[#1e2638]"
              dangerouslySetInnerHTML={{ __html: activeGuide.content_html }}
            />
          </div>

          <style jsx global>{`
            .valheon-dossier-article h1,
            .valheon-dossier-article h2,
            .valheon-dossier-article h3 {
              color: #fbbf24;
              font-weight: 800;
              margin-top: 1.5rem;
              margin-bottom: 0.75rem;
              letter-spacing: 0.03em;
            }
            .valheon-dossier-article h1 {
              font-size: 1.35rem;
              border-bottom: 1px solid #1e2638;
              padding-bottom: 0.5rem;
            }
            .valheon-dossier-article h2 {
              font-size: 1.15rem;
              color: #38bdf8;
            }
            .valheon-dossier-article h3 {
              font-size: 1rem;
              color: #f8fafc;
            }
            .valheon-dossier-article p {
              margin-bottom: 0.9rem;
              color: #cbd5e1;
            }
            .valheon-dossier-article ul,
            .valheon-dossier-article ol {
              padding-left: 1.4rem;
              margin-bottom: 1rem;
              color: #cbd5e1;
            }
            .valheon-dossier-article li {
              margin-bottom: 0.4rem;
            }
            .valheon-dossier-article strong {
              color: #ffffff;
              font-weight: 700;
            }
            .valheon-dossier-article table {
              width: 100%;
              border-collapse: collapse;
              margin: 1rem 0;
              background: #0f131c;
              border: 1px solid #1e2638;
              border-radius: 0.5rem;
              overflow: hidden;
              font-size: 0.8rem;
            }
            .valheon-dossier-article th {
              background: #161c28;
              color: #fbbf24;
              text-transform: uppercase;
              font-family: monospace;
              font-size: 0.72rem;
              padding: 0.65rem 0.85rem;
              text-align: left;
              border-bottom: 1px solid #2a3448;
            }
            .valheon-dossier-article td {
              padding: 0.6rem 0.85rem;
              border-bottom: 1px solid #1a202c;
              color: #cbd5e1;
            }
          `}</style>
        </div>
      )}

      {activeSection === 'dossiers' && !activeGuide && (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {categoriesList.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-2 cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-[#0d1117] text-slate-400 border-[#1e2638] hover:border-amber-500/30 hover:text-white'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        active ? 'bg-amber-400/20 text-amber-200' : 'bg-white/5 text-slate-500'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-80 shrink-0">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 95 dossiers, KvK, events..."
                className="w-full bg-[#0a0c10] border border-amber-500/30 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuides.map((g) => {
              const readMins = Math.max(1, Math.round((g.word_count || 300) / 200));
              return (
                <div
                  key={g.id}
                  onClick={() => {
                    setActiveGuide(g);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-[#0d1117] hover:bg-[#121824] border border-[#1e2638] hover:border-amber-500/50 rounded-xl p-5 flex flex-col justify-between transition-all cursor-pointer group shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {g.category_label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock size={11} /> {readMins}m ({g.word_count}w)
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                      {g.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {g.summary || 'Complete tactical breakdown, pairings, and optimization roadmap.'}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono font-bold text-cyan-400 group-hover:text-amber-300">
                    <span>OPEN DOSSIER</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 2: 20 STAGE TIER MATRICES (PRE-KVK -> SEASON OF CONQUEST)
      ===================================================================== */}
      {activeSection === 'tiers' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#0d1117] border border-[#1e2638] rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Layers size={16} className="text-amber-400" />
                  <span>Kingdom Stage &amp; Combat Role Tier Matrices</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a Kingdom KvK Stage, then inspect the mathematical pairings, formations, accessories, and 74-point talent splits.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'soc', label: 'Season of Conquest (SoC)' },
                  { key: 'kvk2', label: 'KvK 2' },
                  { key: 'kvk1', label: 'KvK 1' },
                  { key: 'early', label: 'Pre-KvK (Early)' },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setSelectedStage(st.key)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase border transition-all cursor-pointer ${
                      selectedStage === st.key
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                        : 'bg-[#080a0f] text-slate-400 border-[#1e2638] hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {stageTierLists.map((tl) => (
                <button
                  key={tl.slug}
                  type="button"
                  onClick={() => setSelectedListSlug(tl.slug)}
                  className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    currentTierMatrix?.slug === tl.slug
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                      : 'bg-[#090c12] text-slate-400 border-[#1e2638] hover:border-amber-500/30 hover:text-white'
                  }`}
                >
                  {tl.name}
                </button>
              ))}
            </div>
          </div>

          {currentTierMatrix && (
            <div className="space-y-4">
              {currentTierMatrix.tiers.map((tGroup) => (
                <div
                  key={tGroup.tier}
                  className="bg-[#0b0e14] border border-[#1e2638] rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-center gap-3 border-b border-[#1e2638] pb-3">
                    <span
                      className={`px-3 py-1 rounded-lg font-mono text-sm font-black border ${
                        TIER_COLORS[tGroup.tier] || TIER_COLORS.C
                      }`}
                    >
                      TIER {tGroup.tier}
                    </span>
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      {tGroup.entries.length} Validated {currentTierMatrix.kind === 'single' ? 'Commanders' : 'Pairings'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {tGroup.entries.map((entry, idx) => (
                      <div
                        key={`${entry.primary_slug}-${entry.secondary_slug || idx}`}
                        className="bg-[#111622] border border-[#1e2638] hover:border-amber-500/40 rounded-xl p-4 space-y-3 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => openCommanderDossier(entry.primary_slug)}
                              className="text-sm font-black text-white hover:text-amber-300 transition-colors text-left cursor-pointer"
                            >
                              {entry.primary_name}
                            </button>
                            {entry.secondary_name && (
                              <div className="text-xs font-bold text-cyan-300 mt-0.5 flex items-center gap-1">
                                <span className="text-slate-500 font-mono">with</span>
                                <button
                                  type="button"
                                  onClick={() => openCommanderDossier(entry.secondary_slug)}
                                  className="hover:underline cursor-pointer"
                                >
                                  {entry.secondary_name}
                                </button>
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                              TROOP_BADGES[entry.primary_troop] || TROOP_BADGES.leadership
                            }`}
                          >
                            {entry.primary_troop}
                          </span>
                        </div>

                        {(entry.formation || (entry.accessories && entry.accessories.length > 0)) && (
                          <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] font-mono">
                            {entry.formation && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span className="text-slate-500">Formation:</span>
                                <span className="text-amber-300 font-bold">{entry.formation}</span>
                              </div>
                            )}
                            {entry.accessories?.length > 0 && (
                              <div className="flex items-center justify-between text-slate-300 gap-2">
                                <span className="text-slate-500 shrink-0">Accessories:</span>
                                <span className="text-emerald-300 text-right truncate">
                                  {entry.accessories.join(' + ')}
                                </span>
                              </div>
                            )}
                            {entry.talent_points && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span className="text-slate-500">74pt Talents:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    R:{entry.talent_points.red || 0}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Y:{entry.talent_points.yellow || 0}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                    B:{entry.talent_points.blue || 0}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODULE 3: 141 COMMANDER ROSTER & BUILDS
      ===================================================================== */}
      {activeSection === 'commanders' && activeCommander && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d1117] border border-amber-500/30 rounded-xl p-4">
            <button
              type="button"
              onClick={() => setActiveCommander(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161b24] hover:bg-[#1e2636] text-amber-300 border border-amber-500/30 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to All 141 Commanders</span>
            </button>

            {activeCommander.matched_guide_id && (
              <button
                type="button"
                onClick={() => openGuideById(activeCommander.matched_guide_id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
              >
                <BookOpen size={14} />
                <span>Open Written Field Guide: {activeCommander.matched_guide_title}</span>
              </button>
            )}
          </div>

          <div className="bg-[#0b0e14] border border-[#1e2638] rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e2638] pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border font-bold ${
                      TROOP_BADGES[activeCommander.troop_type] || TROOP_BADGES.leadership
                    }`}
                  >
                    {activeCommander.troop_type}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    {activeCommander.rarity}
                  </span>
                  {activeCommander.civilization && (
                    <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                      Civ: {activeCommander.civilization}
                    </span>
                  )}
                  {activeCommander.release_year && (
                    <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-white/5 text-slate-400">
                      Release: {activeCommander.release_year}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">
                  {activeCommander.name}
                </h2>
                {activeCommander.title && (
                  <p className="text-sm font-mono text-amber-400 mt-0.5">{activeCommander.title}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 bg-[#111622] border border-[#1e2638] rounded-xl p-3.5 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Min Benchmark</div>
                  <div className="text-emerald-400 font-black uppercase mt-0.5">
                    {activeCommander.usable_from || '5511 / Max'}
                  </div>
                </div>
                {activeCommander.skill_order && (
                  <div className="border-l border-[#1e2638] pl-3">
                    <div className="text-[10px] text-slate-500 uppercase">Skill Lock Order</div>
                    <div className="text-cyan-300 font-black mt-0.5">{activeCommander.skill_order}</div>
                  </div>
                )}
                <div className="border-l border-[#1e2638] pl-3">
                  <div className="text-[10px] text-slate-500 uppercase">Talent Trees</div>
                  <div className="text-amber-300 font-bold uppercase mt-0.5">
                    {[
                      activeCommander.talent_trees?.red,
                      activeCommander.talent_trees?.yellow,
                      activeCommander.talent_trees?.blue,
                    ]
                      .filter(Boolean)
                      .join(' / ')}
                  </div>
                </div>
              </div>
            </div>

            {Object.keys(activeCommander.builds || {}).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-black uppercase tracking-widest text-amber-400">
                  Validated 74-Point Talent Builds, Formations &amp; Accessories
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(activeCommander.builds).map(([mode, b]) => (
                    <div
                      key={mode}
                      className="bg-[#111622] border border-[#1e2638] rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-mono font-black uppercase text-cyan-300">
                          Mode: {mode}
                        </span>
                        <span className="text-xs font-mono text-amber-300 font-bold">
                          Formation: {b.formation}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <span className="text-slate-400">
                          Accessories:{' '}
                          <strong className="text-emerald-300">
                            {b.accessories?.length ? b.accessories.join(' + ') : 'Standard Troop Set'}
                          </strong>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {activeCommander.talent_trees?.red || 'Red'}: {b.talent_points?.red || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {activeCommander.talent_trees?.yellow || 'Yellow'}: {b.talent_points?.yellow || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {activeCommander.talent_trees?.blue || 'Blue'}: {b.talent_points?.blue || 0}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {['red', 'yellow', 'blue'].map((col) => {
                          const list = b.named_talents?.[col] || [];
                          if (!list.length) return null;
                          const badgeColor =
                            col === 'red'
                              ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                              : col === 'yellow'
                              ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                              : 'text-sky-300 border-sky-500/30 bg-sky-500/10';
                          return (
                            <div key={col} className="flex flex-wrap gap-1.5">
                              {list.map((nt) => (
                                <span
                                  key={`${col}-${nt.node}`}
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}`}
                                >
                                  {nt.name} ({nt.points}/{nt.max})
                                </span>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCommander.skills?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-black uppercase tracking-widest text-cyan-400">
                  In-Game Skill Multipliers &amp; Mechanics ({activeCommander.skills.length} Skills)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCommander.skills.map((sk) => (
                    <div
                      key={sk.position}
                      className="bg-[#101520] border border-[#1e2638] rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">
                          Skill {sk.position}: {sk.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                          {sk.position === 5 ? 'Expertise' : `Slot #${sk.position}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{sk.description}</p>
                      {sk.stats && Object.keys(sk.stats).length > 0 && (
                        <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
                          {Object.entries(sk.stats).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-cyan-300"
                            >
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCommander.placements?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400">
                  Validated Tier Placements &amp; Pairings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activeCommander.placements.map((pl, idx) => (
                    <div
                      key={idx}
                      className="bg-[#111622] border border-[#1e2638] rounded-xl p-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{pl.list_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Role: <span className="text-slate-200 uppercase">{pl.role}</span>
                          {pl.partner_name && (
                            <>
                              {' '}
                              • with{' '}
                              <button
                                type="button"
                                onClick={() => openCommanderDossier(pl.partner_slug)}
                                className="text-cyan-300 hover:underline cursor-pointer font-bold"
                              >
                                {pl.partner_name}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded font-mono text-xs font-black border ${
                          TIER_COLORS[pl.tier] || TIER_COLORS.C
                        }`}
                      >
                        {pl.tier}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'commanders' && !activeCommander && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#0d1117] border border-[#1e2638] rounded-xl p-4">
            <div className="flex flex-wrap gap-2">
              {['all', 'infantry', 'cavalry', 'archer', 'leadership', 'engineering'].map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setCmdTroopFilter(tr)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase border transition-all cursor-pointer ${
                    cmdTroopFilter === tr
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                      : 'bg-[#080a0f] text-slate-400 border-[#1e2638] hover:text-white'
                  }`}
                >
                  {tr === 'all' ? 'All Troops (141)' : tr}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={cmdRarityFilter}
                onChange={(e) => setCmdRarityFilter(e.target.value)}
                className="bg-[#080a0f] border border-[#1e2638] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none"
              >
                <option value="all">All Rarities</option>
                <option value="legendary">Legendary</option>
                <option value="epic">Epic</option>
                <option value="elite">Elite</option>
                <option value="advanced">Advanced</option>
              </select>

              <div className="relative flex-1 lg:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  type="text"
                  value={cmdSearch}
                  onChange={(e) => setCmdSearch(e.target.value)}
                  placeholder="Search 141 commanders..."
                  className="w-full bg-[#080a0f] border border-amber-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredCommanders.map((cmd) => (
              <div
                key={cmd.slug}
                onClick={() => setActiveCommander(cmd)}
                className="bg-[#0d1117] hover:bg-[#131926] border border-[#1e2638] hover:border-amber-500/50 rounded-xl p-4 flex flex-col justify-between transition-all cursor-pointer group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                        TROOP_BADGES[cmd.troop_type] || TROOP_BADGES.leadership
                      }`}
                    >
                      {cmd.troop_type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {cmd.rarity} {cmd.release_year ? `• ${cmd.release_year}` : ''}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                      {cmd.name}
                    </h3>
                    {cmd.title && (
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {cmd.title}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cmd.usable_from && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Min: {cmd.usable_from.toUpperCase()}
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                      {cmd.skills?.length || 0} Skills
                    </span>
                    {Object.keys(cmd.builds || {}).length > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                        {Object.keys(cmd.builds).length} Builds
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono font-bold text-amber-400">
                  <span>{cmd.matched_guide_id ? '★ HAS WRITTEN DOSSIER' : 'INSPECT SKILLS & BUILDS'}</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODULE 4: 5/6/7-MARCH FLEET PRESETS & ACTIVE GIFT CODES
      ===================================================================== */}
      {activeSection === 'fleets' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#0d1117] border border-emerald-500/30 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2638] pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Gift size={16} className="text-emerald-400" />
                  <span>Active Rise of Kingdoms Redeem Codes ({redeemCodes.active.length} Verified)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any active gift code to copy it to your clipboard for in-game redemption (Governor Profile → Settings → Redeem).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {redeemCodes.active.map((c) => (
                <div
                  key={c.code}
                  className="bg-[#101722] border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-mono font-black tracking-wider text-emerald-300">
                      {c.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(c.code)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode === c.code ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedCode === c.code ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.rewards.map((rw, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10"
                      >
                        {rw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#1e2638] rounded-xl p-5 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1e2638] pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Swords size={16} className="text-amber-400" />
                  <span>Multi-March Fleet Presets (Zero Commander Overlap)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Optimal 5, 6, and 7-march open-field and swarming lineups engineered for maximum AoE synergy without commander collisions.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All Lineups (19)' },
                  { key: '5', label: '5-March Fleets' },
                  { key: '6', label: '6-March Fleets' },
                  { key: '7', label: '7-March Fleets' },
                  { key: 'swarming', label: 'Swarming Fleets' },
                ].map((flt) => (
                  <button
                    key={flt.key}
                    type="button"
                    onClick={() => setFleetCountFilter(flt.key)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase border transition-all cursor-pointer ${
                      fleetCountFilter === flt.key
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : 'bg-[#080a0f] text-slate-400 border-[#1e2638] hover:text-white'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFleets.map((fleet) => (
                <div
                  key={`${fleet.mode}-${fleet.slug}`}
                  className="bg-[#111622] border border-[#1e2638] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div>
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {fleet.march_count}-March {fleet.mode === 'swarming' ? 'Swarm' : 'Open Field'} — {fleet.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-bold">
                      {fleet.march_count} Marches
                    </span>
                  </div>

                  <div className="space-y-2">
                    {fleet.pairs.map((p) => (
                      <div
                        key={p.slot}
                        className="flex items-center justify-between bg-[#0a0d14] border border-[#1e2638] rounded-lg px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            M{p.slot}
                          </span>
                          <button
                            type="button"
                            onClick={() => openCommanderDossier(p.primary_slug)}
                            className="font-bold text-white hover:text-amber-300 cursor-pointer"
                          >
                            {p.primary_name}
                          </button>
                          <span className="text-slate-500 font-mono">+</span>
                          <button
                            type="button"
                            onClick={() => openCommanderDossier(p.secondary_slug)}
                            className="font-bold text-cyan-300 hover:underline cursor-pointer"
                          >
                            {p.secondary_name}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                              TROOP_BADGES[p.troop_type] || TROOP_BADGES.leadership
                            }`}
                          >
                            {p.troop_type}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${
                              TIER_COLORS[p.tier] || TIER_COLORS.C
                            }`}
                          >
                            {p.tier}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
