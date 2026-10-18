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
  FileText,
  CheckSquare,
  Camera,
  Lock,
  Filter,
  ExternalLink,
} from 'lucide-react';

export default function ValheonFieldGuideVault() {
  const [vaultData, setVaultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuide, setActiveGuide] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch('/data/roknut_95_guides_scrubbed.json')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setVaultData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load scrubbed guides:', err);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const guides = vaultData?.guides || [];

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

  if (loading) {
    return (
      <div className="bg-[#0d0719] border border-amber-500/35 rounded-xl p-12 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono uppercase tracking-widest text-amber-300">
          Loading 95 Valheon Sovereign Intelligence Dossiers...
        </p>
      </div>
    );
  }

  // DETAIL READER VIEW
  if (activeGuide) {
    const readMins = Math.max(1, Math.round((activeGuide.word_count || 300) / 200));
    const related = guides
      .filter((x) => x.category_key === activeGuide.category_key && x.id !== activeGuide.id)
      .slice(0, 3);

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#110822] border border-amber-500/35 rounded-xl p-4 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveGuide(null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to All 95 Valheon Dossiers</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {activeGuide.valheon_route && (
              <Link
                href={activeGuide.valheon_route}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/25 to-purple-500/25 hover:from-amber-500/35 hover:to-purple-500/35 text-amber-200 border border-amber-400/50 text-[11px] font-mono font-bold uppercase shadow-[0_0_15px_rgba(234,179,8,0.2)]"
              >
                <Crown size={12} className="text-amber-400" />
                <span>Launch {activeGuide.valheon_suite_name || 'Valheon Suite'}</span>
              </Link>
            )}
            <Link
              href="/calculators"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/30 text-[11px] font-mono font-bold uppercase"
            >
              <CheckSquare size={12} />
              <span>AI Calculators</span>
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

        {/* Dossier Content Card */}
        <div className="bg-[#0b0616] border border-amber-500/30 rounded-2xl p-6 md:p-10 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-widest">
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">
              {activeGuide.category_label}
            </span>
            {activeGuide.valheon_pillar && (
              <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-200 border border-purple-400/35 font-bold">
                {activeGuide.valheon_pillar}
              </span>
            )}
            <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
              <Clock size={11} /> {readMins} min read ({activeGuide.word_count} words)
            </span>
            <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
              <Sparkles size={11} /> {activeGuide.ip_status || '100% Original Valheon IP'}
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black font-cinzel gold-gradient-text leading-tight">
            {activeGuide.title}
          </h2>

          {activeGuide.summary && (
            <div className="border-l-2 border-amber-400 pl-4 py-2 text-slate-200 text-sm leading-relaxed bg-amber-500/10 rounded-r-lg">
              {activeGuide.summary}
            </div>
          )}

          {/* Scoped Article Reader */}
          <div
            className="valheon-dossier-article prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-4 pt-4 border-t border-amber-500/20"
            dangerouslySetInnerHTML={{ __html: activeGuide.content_html }}
          />
        </div>

        {/* Related Guides in Same Category */}
        {related.length > 0 && (
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
              Related {activeGuide.category_label} Dossiers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => {
                    setActiveGuide(rel);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left p-4 rounded-xl bg-[#131720] hover:bg-[#19202e] border border-[#1e2638] hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <div className="text-[10px] font-mono text-amber-400 uppercase">
                    {rel.category_label} • {rel.word_count} words
                  </div>
                  <div className="text-sm font-bold text-white mt-1 line-clamp-2">
                    {rel.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
          .valheon-dossier-article .rok-callout {
            background: rgba(245, 158, 11, 0.06);
            border: 1px solid rgba(245, 158, 11, 0.25);
            border-left: 3px solid #f59e0b;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
          }
          .valheon-dossier-article .rok-callout-title {
            color: #fbbf24;
            font-family: monospace;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 0.75rem;
            margin-bottom: 0.4rem;
          }
        `}</style>
      </div>
    );
  }

  // GRID EXPLORER VIEW
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Founder Sovereign Vault Banner */}
      <div className="bg-gradient-to-r from-[#170a2c] via-[#100620] to-[#170a2c] border border-amber-500/40 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              <Crown size={11} className="text-amber-400" /> Valheon Sovereign Knowledge Vault
            </span>
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} /> 100% Original Valheon Synthesized IP (95 Dossiers)
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-black font-cinzel gold-gradient-text tracking-wide">
            Valheon Strategic Intelligence — 95 Telemetry-Linked RoK Dossiers
          </h2>
          <p className="text-xs text-slate-300/80">
            Re-synthesized in Valheon Sovereign Doctrine with zero competitor branding and direct 1-click links to your live Aegis, Nexus, Theater, Vanguard, and Optics calculators.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 95 commanders, KvK, events..."
            className="w-full bg-[#0a0514] border border-amber-500/40 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
          />
        </div>
      </div>

      {/* Category Filter Medallions */}
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
                  : 'bg-[#0d0719] text-slate-400 border-amber-500/20 hover:border-amber-400/50 hover:text-amber-200'
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

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
        <span>
          Showing <strong className="text-amber-300">{filteredGuides.length}</strong> of{' '}
          {guides.length} Valheon Sovereign Dossiers
        </span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-amber-400 hover:underline cursor-pointer"
          >
            Clear search
          </button>
        )}
      </div>

      {/* 95-Guide Card Grid */}
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
              className="bg-[#0e071b] hover:bg-[#150b28] border border-amber-500/25 hover:border-amber-400/60 rounded-xl p-5 flex flex-col justify-between transition-all cursor-pointer group shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {g.category_label}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300/90 flex items-center gap-1">
                    <Sparkles size={10} /> Valheon IP • {readMins}m
                  </span>
                </div>

                <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                  {g.title}
                </h3>

                <p className="text-xs text-slate-300/75 line-clamp-3 leading-relaxed">
                  {g.summary || 'Complete tactical breakdown, pairings, and optimization roadmap.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-amber-500/15 flex items-center justify-between text-[10px] font-mono font-bold text-amber-300/90 group-hover:text-amber-200">
                <span className="truncate">{g.valheon_pillar || 'VALHEON DOSSIER'}</span>
                <span className="group-hover:translate-x-1 transition-transform shrink-0">
                  OPEN DOSSIER →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
