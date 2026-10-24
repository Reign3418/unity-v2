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
  X,
  Mic,
  MicOff,
  Minimize2,
  Maximize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import vaultData from '@/data/rok_peerless_vault.json';
import { localizeLyceumTerm } from '@/lib/rokCanonicalGlossary';
import { LOCALE_METADATA } from '@/lib/locales';

const SPEECH_LANG_MAP = {
  en: 'en-US',
  vi: 'vi-VN',
  ar: 'ar-SA',
  ru: 'ru-RU',
  zh: 'zh-CN',
  es: 'es-ES',
  id: 'id-ID',
  ko: 'ko-KR',
  tr: 'tr-TR',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  ja: 'ja-JP',
  it: 'it-IT',
  pl: 'pl-PL',
  th: 'th-TH',
  ms: 'ms-MY',
};

export default function PeerlessScholarHub() {
  const t = useTranslations('PeerlessScholar');
  const routeLocale = useLocale();
  const searchInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Instant 0ms in-tool language switcher (defaults to route locale, switches without page reload)
  const [quizLang, setQuizLang] = useState(routeLocale || 'en');
  const [activeMode, setActiveMode] = useState('finals'); // 'finals' | 'early' | 'vault'
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [copiedPacket, setCopiedPacket] = useState(false);

  // Mobile & Split-Screen Compact HUD State
  const [compactHud, setCompactHud] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // 15-second Final Exam Pacing Timer
  const [timerLeft, setTimerLeft] = useState(15);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    setQuizLang(routeLocale || 'en');
  }, [routeLocale]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('applet') === 'true' || window.innerWidth < 640) {
        setCompactHud(true);
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        setSpeechSupported(true);
      }
    }
  }, []);

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

  const toggleVoiceSearch = () => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const rec = new SR();
      rec.lang = SPEECH_LANG_MAP[quizLang] || 'en-US';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setQuery('');
      };
      rec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuery(transcript.trim());
      };
      rec.onerror = () => {
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  const currentLocaleMeta = useMemo(
    () => LOCALE_METADATA.find((l) => l.code === quizLang) || LOCALE_METADATA[0],
    [quizLang]
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

      const locQ = (item.q?.[quizLang] || '').toLowerCase();
      const locA = (item.a?.[quizLang] || '').toLowerCase();
      const enQ = (item.q?.en || '').toLowerCase();
      const enA = (item.a?.en || '').toLowerCase();

      const tokens = qNorm.split(/\s+/).filter(Boolean);
      return tokens.every(
        (tok) =>
          locQ.includes(tok) ||
          locA.includes(tok) ||
          enQ.includes(tok) ||
          enA.includes(tok)
      );
    });
  }, [allQuestions, query, activeCategory, quizLang]);

  const topMatch = useMemo(() => {
    if (!query.trim() || filteredQuestions.length === 0) return null;
    return filteredQuestions[0];
  }, [query, filteredQuestions]);

  const handleCopyAnswer = (id, text) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleCopyMidtermPacket = () => {
    const lines = midtermPacket.map((item, idx) => {
      const qStr = item.q?.[quizLang] || item.q?.en || '';
      const aStr = item.a?.[quizLang] || item.a?.en || '';
      return `Q${idx + 1}: ${qStr}\n✅ ${aStr}`;
    });
    const header = `🏛️ [${localizeLyceumTerm('SPECIALQUIZ_TITLE', quizLang)} • peerless.early (${currentLocaleMeta.nativeLabel})]`;
    const payload = `${header}\n\n${lines.join('\n\n')}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload);
      setCopiedPacket(true);
      setTimeout(() => setCopiedPacket(false), 2000);
    }
  };

  const handleNextQuestionReset = () => {
    setQuery('');
    setTimerLeft(15);
    setTimerRunning(true);
    searchInputRef.current?.focus();
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
        label: localizeLyceumTerm('SPECIALQUIZ_TITLE', quizLang),
        cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      };
    }
    if (stage === 'prelim') {
      return {
        label: localizeLyceumTerm('COMMONQUIZ_TITLE', quizLang),
        cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      };
    }
    return {
      label: localizeLyceumTerm('LASTQUIZ_TITLE', quizLang),
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* =========================================================================
          TOP COMPACT MOBILE / SPLIT-SCREEN TOOLBAR (Always accessible on phones)
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b0e14] border border-[#1e2433] rounded-2xl px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sparkles size={14} />
            <span className="hidden sm:inline">{t('title')}</span>
            <span className="sm:hidden">Peerless HUD</span>
          </span>

          {/* Instant 0ms 17-Language Selector Pill (Works on Mobile & Desktop without reload) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Globe size={13} className="text-cyan-400 shrink-0" />
            <select
              aria-label="Quiz Language Selector"
              value={quizLang}
              onChange={(e) => setQuizLang(e.target.value)}
              className="bg-transparent text-cyan-300 font-mono font-bold text-xs outline-none cursor-pointer"
            >
              {LOCALE_METADATA.map((loc) => (
                <option key={loc.code} value={loc.code} className="bg-[#0f1115] text-white">
                  {loc.flag} {loc.nativeLabel} ({loc.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Compact HUD Toggle (Collapses Hero Banner on Mobile so keyboard never covers answers) */}
          <button
            type="button"
            onClick={() => setCompactHud(!compactHud)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border flex items-center gap-1 cursor-pointer transition-all ${
              compactHud
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#121722] border-[#1e2536] text-slate-400 hover:text-white'
            }`}
          >
            {compactHud ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            <span>{compactHud ? 'Expand Header' : 'Mobile HUD'}</span>
          </button>

          {/* Pop-out Floating Mini-HUD Window (Desktop / Tablet Split-Screen) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(
                  `/${quizLang}/tools/peerless?applet=true`,
                  'PeerlessScholarHUD',
                  'width=410,height=740,toolbar=0,menubar=0,location=0,resizable=1'
                );
              }
            }}
            className="hidden sm:inline-flex px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 items-center gap-1 cursor-pointer transition-all"
            title="Pop out compact floating window next to Rise of Kingdoms"
          >
            <span>Mini-HUD</span>
            <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          COLLAPSIBLE HERO HEADER & 15s TIMER (Hidden in Compact Mobile HUD Mode)
          ========================================================================= */}
      {!compactHud && (
        <div className="bg-gradient-to-br from-[#0e131d] via-[#0a0d14] to-[#070a0f] border border-[#1e2433] rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-2xl">
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
                  {currentLocaleMeta.flag} {currentLocaleMeta.nativeLabel} ({quizLang.toUpperCase()})
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 font-mono leading-relaxed">
                {t('subtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-300">
                  1. {localizeLyceumTerm('COMMONQUIZ_TITLE', quizLang)} (Mon–Fri)
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
                  2. {localizeLyceumTerm('SPECIALQUIZ_TITLE', quizLang)} • peerless.early (Sat 02:30 & 12:30 UTC)
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300">
                  3. {localizeLyceumTerm('LASTQUIZ_TITLE', quizLang)} • peerless.finals (Monthly Sat 14:30 UTC)
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
                  {localizeLyceumTerm('SUCCED_DESC', quizLang)}
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
      )}

      {/* =========================================================================
          MODE SWITCHER TABS (peerless.finals vs peerless.early vs Full Vault)
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-2.5">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveMode('finals')}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activeMode === 'finals'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                : 'bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white'
            }`}
          >
            <Zap size={13} className="shrink-0" />
            <span className="truncate">Finals (15s)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('early')}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activeMode === 'early'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={13} className="shrink-0" />
            <span className="truncate">Early (Q1–10)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('vault')}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activeMode === 'vault'
                ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                : 'bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen size={13} className="shrink-0" />
            <span className="truncate">All ({allQuestions.length})</span>
          </button>
        </div>

        <div className="hidden sm:block text-xs font-mono text-slate-400 px-2">
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
          <div className="bg-[#0b0f17] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Trophy size={18} className="text-cyan-400 shrink-0" />
                <span>{t('lbl_midterm_header')}</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {t('lbl_midterm_sub')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyMidtermPacket}
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-all"
            >
              {copiedPacket ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedPacket ? t('lbl_copied') : 'Copy Q1–Q10 Alliance Packet'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {midtermPacket.map((item, idx) => {
              const qLocalized = item.q?.[quizLang] || item.q?.en;
              const aLocalized = item.a?.[quizLang] || item.a?.en;
              const isNonEn = quizLang !== 'en';

              return (
                <div
                  key={item.id}
                  className="bg-[#0b0e14] border border-[#1e2433] hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-black">
                        Q{idx + 1} / 10
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {localizeLyceumTerm('SPECIALQUIZ_TITLE', quizLang)} • {item.id}
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

                  <div className="mt-3.5 pt-3 border-t border-[#1a2030] flex items-center justify-between gap-3">
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
          MODE 1 & MODE 3: STICKY MOBILE SPEED-HUD + VOICE SEARCH (`peerless.finals`)
          ========================================================================= */}
      {activeMode !== 'early' && (
        <div className="space-y-4">
          {/* STICKY TOP SEARCH + INSTANT #1 ANSWER BANNER (Stays above mobile keyboard!) */}
          <div className="sticky top-0 z-30 bg-[#0b0e14]/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-3 sm:p-4 space-y-3 shadow-[0_12px_35px_rgba(0,0,0,0.85)]">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Search
                  size={18}
                  className="absolute left-3.5 text-amber-400 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={query}
                  onFocus={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      setCompactHud(true);
                    }
                  }}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-10 pr-20 py-3 rounded-xl bg-[#111622] border border-[#252d40] focus:border-amber-400 text-white text-sm sm:text-base font-medium outline-none transition-all placeholder:text-slate-500"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* 1-Tap Hands-Free Voice Search (Web Speech API) */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  title="Hands-Free Voice Search (Speak keywords from the question)"
                  className={`p-3 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                    isListening
                      ? 'bg-rose-500/25 border-rose-500 text-rose-300 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                      : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300'
                  }`}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  <span className="hidden sm:inline">
                    {isListening ? 'Listening...' : 'Voice'}
                  </span>
                </button>
              )}
            </div>

            {/* INSTANT TOP #1 MATCH SPEED-CARD (Locked right under the input, above mobile keyboard!) */}
            {topMatch && (
              <div className="bg-gradient-to-r from-emerald-950/60 via-[#0e1920] to-[#0d131d] border-2 border-emerald-500/60 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-black uppercase">
                      #1 BEST MATCH ({filteredQuestions.length} found)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {topMatch.q?.[quizLang] || topMatch.q?.en}
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-300 tracking-tight break-words">
                    ✅ {topMatch.a?.[quizLang] || topMatch.a?.en}
                    {quizLang !== 'en' && topMatch.a?.en && topMatch.a.en !== topMatch.a?.[quizLang] && (
                      <span className="text-xs font-mono text-slate-300 ml-2 font-normal">
                        ({topMatch.a.en})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyAnswer(
                        topMatch.id,
                        topMatch.a?.[quizLang] || topMatch.a?.en
                      )
                    }
                    className="flex-1 sm:flex-initial justify-center px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === topMatch.id ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedId === topMatch.id ? t('lbl_copied') : t('lbl_copy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextQuestionReset}
                    className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-mono font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Next Q</span>
                  </button>
                </div>
              </div>
            )}

            {/* Category Filter Pills (Horizontally scrollable on mobile) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border shrink-0 cursor-pointer ${
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
            <div className="bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm font-mono text-slate-400">{t('lbl_no_results')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredQuestions.map((item) => {
                const qLocalized = item.q?.[quizLang] || item.q?.en;
                const aLocalized = item.a?.[quizLang] || item.a?.en;
                const isNonEn = quizLang !== 'en';
                const stageBadge = getStageBadge(item.stage);

                return (
                  <div
                    key={item.id}
                    className="bg-[#0b0e14] border border-[#1e2433] hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-lg"
                  >
                    <div className="space-y-2">
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

                    <div className="mt-3.5 pt-3 border-t border-[#1a2030] flex items-center justify-between gap-3">
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
