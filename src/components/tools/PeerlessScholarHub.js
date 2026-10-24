'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BookOpen,
  Search,
  Zap,
  Trophy,
  Clock,
  Copy,
  Check,
  Sparkles,
  Globe,
  RotateCcw,
  Play,
  Layers,
  Award,
  X,
} from 'lucide-react';
import vaultData from '@/data/rok_peerless_vault.json';
import { localizeLyceumTerm } from '@/lib/rokCanonicalGlossary';
import { LOCALE_METADATA } from '@/lib/locales';

export default function PeerlessScholarHub() {
  const t = useTranslations('PeerlessScholar');
  const locale = useLocale();
  const searchInputRef = useRef(null);

  const [activeMode, setActiveMode] = useState('finals'); // 'finals' | 'early' | 'vault'
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [copiedPacket, setCopiedPacket] = useState(false);

  // 15-second Final Exam Pacing Timer
  const [timerLeft, setTimerLeft] = useState(15);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // Global keyboard shortcut: '/' or 'Escape' focuses and clears the Speed-Lock search bar
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setQuery('');
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const currentLocaleMeta = useMemo(
    () => LOCALE_METADATA.find((l) => l.code === locale) || LOCALE_METADATA[0],
    [locale]
  );

  const allQuestions = useMemo(() => vaultData?.questions || [], []);
  const midtermPacketIds = useMemo(
    () => new Set(vaultData?.midterm_early_packet_ids || []),
    []
  );

  const midtermPacket = useMemo(
    () => allQuestions.filter((item) => midtermPacketIds.has(item.id)),
    [allQuestions, midtermPacketIds]
  );

  const filteredQuestions = useMemo(() => {
    const qNorm = query.trim().toLowerCase();
    return allQuestions.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!qNorm) return true;

      const locQ = (item.q?.[locale] || '').toLowerCase();
      const locA = (item.a?.[locale] || '').toLowerCase();
      const enQ = (item.q?.en || '').toLowerCase();
      const enA = (item.a?.en || '').toLowerCase();

      // Multi-token instant matching (matches if all space-separated tokens appear in localized OR English Q/A)
      const tokens = qNorm.split(/\s+/).filter(Boolean);
      return tokens.every(
        (tok) =>
          locQ.includes(tok) ||
          locA.includes(tok) ||
          enQ.includes(tok) ||
          enA.includes(tok)
      );
    });
  }, [allQuestions, query, activeCategory, locale]);

  const handleCopyAnswer = (id, text) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleCopyMidtermPacket = () => {
    const lines = midtermPacket.map((item, idx) => {
      const qStr = item.q?.[locale] || item.q?.en || '';
      const aStr = item.a?.[locale] || item.a?.en || '';
      return `Q${idx + 1}: ${qStr}\n✅ ${aStr}`;
    });
    const header = `🏛️ [${localizeLyceumTerm('SPECIALQUIZ_TITLE', locale)} • peerless.early (${currentLocaleMeta.nativeLabel})]`;
    const payload = `${header}\n\n${lines.join('\n\n')}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload);
      setCopiedPacket(true);
      setTimeout(() => setCopiedPacket(false), 2000);
    }
  };

  const categories = [
    { id: 'all', label: t('lbl_cat_all') },
    { id: 'rok', label: t('lbl_cat_rok') },
    { id: 'history', label: t('lbl_cat_history') },
    { id: 'science', label: t('lbl_cat_science') },
    { id: 'geography', label: t('lbl_cat_geography') },
    { id: 'culture', label: t('lbl_cat_culture') },
    { id: 'civpedia', label: t('lbl_cat_civpedia') },
  ];

  const getStageBadge = (stage) => {
    if (stage === 'midterm') {
      return {
        label: localizeLyceumTerm('SPECIALQUIZ_TITLE', locale),
        cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      };
    }
    if (stage === 'prelim') {
      return {
        label: localizeLyceumTerm('COMMONQUIZ_TITLE', locale),
        cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      };
    }
    return {
      label: localizeLyceumTerm('LASTQUIZ_TITLE', locale),
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* =========================================================================
          HEADER & OFFICIAL LILITH LYCEUM STAGE STRIP
          ========================================================================= */}
      <div className="bg-gradient-to-br from-[#0e131d] via-[#0a0d14] to-[#070a0f] border border-[#1e2433] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles size={13} />
              <span>{t('badge_live')}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex flex-wrap items-center gap-3">
              <span>{t('title')}</span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                {currentLocaleMeta.flag} {currentLocaleMeta.nativeLabel} ({locale.toUpperCase()})
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 font-mono leading-relaxed">
              {t('subtitle')}
            </p>

            {/* Official In-Game Lilith (`lc_quiz.dat`) Stage Names for Current Locale */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-300">
                1. {localizeLyceumTerm('COMMONQUIZ_TITLE', locale)} (Mon–Fri)
              </span>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
                2. {localizeLyceumTerm('SPECIALQUIZ_TITLE', locale)} • peerless.early (Sat 02:30 & 12:30 UTC)
              </span>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300">
                3. {localizeLyceumTerm('LASTQUIZ_TITLE', locale)} • peerless.finals (Monthly Sat 14:30 UTC)
              </span>
            </div>
          </div>

          {/* 15-Second Exam Speed-Drill Widget */}
          <div className="bg-[#0b0e15] border border-[#1e2536] rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-[240px] shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                <Clock size={13} className="text-amber-400" />
                {t('lbl_timer_title')}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {localizeLyceumTerm('SUCCED_DESC', locale)}
              </span>
            </div>

            <div className="flex items-center justify-between my-2">
              <div
                dir="ltr"
                className={`text-4xl font-black font-mono ${
                  timerLeft <= 5
                    ? 'text-rose-400 animate-pulse'
                    : timerLeft <= 10
                    ? 'text-amber-300'
                    : 'text-cyan-300'
                }`}
              >
                00:{String(timerLeft).padStart(2, '0')}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTimerLeft(15);
                    setTimerRunning(true);
                    searchInputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Play size={12} />
                  <span>{t('lbl_timer_start')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerLeft(15);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer transition-all"
                  title={t('lbl_timer_reset')}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-500 ${
                  timerLeft <= 5 ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${(timerLeft / 15) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODE SWITCHER TABS (peerless.finals vs peerless.early vs Full Vault)
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('finals')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
              activeMode === 'finals'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                : 'bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white'
            }`}
          >
            <Zap size={14} />
            <span>{t('mode_finals')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('early')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
              activeMode === 'early'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={14} />
            <span>{t('mode_early')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('vault')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
              activeMode === 'vault'
                ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                : 'bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen size={14} />
            <span>{t('mode_vault')}</span>
          </button>
        </div>

        <div className="text-xs font-mono text-slate-400 px-2">
          {t('lbl_results_count', {
            count: activeMode === 'early' ? midtermPacket.length : filteredQuestions.length,
            lang: currentLocaleMeta.nativeLabel,
          })}
        </div>
      </div>

      {/* =========================================================================
          MODE 2: SATURDAY MIDTERM PACKET (`peerless.early` — Q1 to Q10)
          ========================================================================= */}
      {activeMode === 'early' && (
        <div className="space-y-4">
          <div className="bg-[#0b0f17] border border-cyan-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy size={18} className="text-cyan-400" />
                <span>{t('lbl_midterm_header')}</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {t('lbl_midterm_sub')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyMidtermPacket}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-all"
            >
              {copiedPacket ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedPacket ? t('lbl_copied') : 'Copy Q1–Q10 Alliance Packet'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {midtermPacket.map((item, idx) => {
              const qLocalized = item.q?.[locale] || item.q?.en;
              const aLocalized = item.a?.[locale] || item.a?.en;
              const isNonEn = locale !== 'en';

              return (
                <div
                  key={item.id}
                  className="bg-[#0b0e14] border border-[#1e2433] hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-black">
                        Q{idx + 1} / 10
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {localizeLyceumTerm('SPECIALQUIZ_TITLE', locale)} • {item.id}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {qLocalized}
                    </h3>

                    {isNonEn && (
                      <p className="text-xs font-mono text-slate-400 border-l-2 border-slate-700 pl-2.5">
                        EN: {item.q?.en}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1a2030] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                        {t('lbl_verified_answer')}
                      </span>
                      <div className="text-base sm:text-lg font-black text-emerald-300">
                        {aLocalized}
                        {isNonEn && item.a?.en && item.a.en !== aLocalized && (
                          <span className="text-xs font-mono text-slate-400 ml-2 font-normal">
                            ({item.a.en})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyAnswer(item.id, aLocalized)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedId === item.id ? t('lbl_copied') : t('lbl_copy')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 1 & MODE 3: INSTANT <5ms SPEED-LOCK SEARCH (`peerless.finals` & Vault)
          ========================================================================= */}
      {activeMode !== 'early' && (
        <div className="space-y-5">
          {/* Speed-Lock Search Bar + Category Filter Strip */}
          <div className="bg-[#0b0e14] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="relative flex items-center">
              <Search
                size={20}
                className="absolute left-4 text-amber-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full pl-12 pr-28 py-3.5 rounded-xl bg-[#111622] border border-[#252d40] focus:border-amber-400 text-white text-sm sm:text-base font-medium outline-none transition-all placeholder:text-slate-500"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X size={13} />
                  <span>{t('search_clear')}</span>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-[#10141f] border-[#1d2435] text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results Grid */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-10 text-center space-y-2">
              <p className="text-sm font-mono text-slate-400">{t('lbl_no_results')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuestions.map((item) => {
                const qLocalized = item.q?.[locale] || item.q?.en;
                const aLocalized = item.a?.[locale] || item.a?.en;
                const isNonEn = locale !== 'en';
                const stageBadge = getStageBadge(item.stage);

                return (
                  <div
                    key={item.id}
                    className="bg-[#0b0e14] border border-[#1e2433] hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${stageBadge.cls}`}
                        >
                          {stageBadge.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          #{item.id} • {item.category}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                        {qLocalized}
                      </h3>

                      {isNonEn && item.q?.en && item.q.en !== qLocalized && (
                        <p className="text-xs font-mono text-slate-400 border-l-2 border-slate-700 pl-2.5">
                          EN: {item.q.en}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1a2030] flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                          {t('lbl_verified_answer')}
                        </span>
                        <div className="text-base sm:text-lg font-black text-emerald-300">
                          {aLocalized}
                          {isNonEn && item.a?.en && item.a.en !== aLocalized && (
                            <span className="text-xs font-mono text-slate-400 ml-2 font-normal">
                              ({item.a.en})
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyAnswer(item.id, aLocalized)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                      >
                        {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedId === item.id ? t('lbl_copied') : t('lbl_copy')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
