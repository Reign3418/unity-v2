'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, ArrowUp, ArrowDown, CornerDownLeft,
  BarChart2, TrendingUp, Map, Clock, Crosshair,
  Link, GitMerge, Trophy, Users, Link2, Archive,
  Cpu, Target, LayoutTemplate, Activity
} from 'lucide-react';

const ICON_MAP = {
  'Overview':         LayoutTemplate,
  'Compare':          Users,
  'Kingdom Analysis': BarChart2,
  'Growth Analysis':  TrendingUp,
  'Scatter Plot':     Map,
  'Team Builder':     Link,
  'Fixed MGE':        Trophy,
  'Alliance Merge':   GitMerge,
  'War Room':         Map,
  'Roster View':      Users,
  'Roster Linker':    Link2,
  'Presence Radar':   Clock,
  'Alliance Duel':    Crosshair,
  'Results':          Archive,
  'Configuration':    Cpu,
  'Fort Tracker':     Target,
};

const CATEGORY_MAP = {
  'Overview':         { label: 'Intelligence', color: 'text-cyan-400 bg-cyan-500/10' },
  'Compare':          { label: 'Intelligence', color: 'text-cyan-400 bg-cyan-500/10' },
  'Kingdom Analysis': { label: 'Intelligence', color: 'text-cyan-400 bg-cyan-500/10' },
  'Growth Analysis':  { label: 'Intelligence', color: 'text-cyan-400 bg-cyan-500/10' },
  'Scatter Plot':     { label: 'Intelligence', color: 'text-cyan-400 bg-cyan-500/10' },
  'Team Builder':     { label: 'Planning',     color: 'text-indigo-400 bg-indigo-500/10' },
  'Fixed MGE':        { label: 'Planning',     color: 'text-indigo-400 bg-indigo-500/10' },
  'Alliance Merge':   { label: 'Planning',     color: 'text-indigo-400 bg-indigo-500/10' },
  'War Room':         { label: 'Planning',     color: 'text-indigo-400 bg-indigo-500/10' },
  'Roster View':      { label: 'Recruiting',   color: 'text-emerald-400 bg-emerald-500/10' },
  'Roster Linker':    { label: 'Recruiting',   color: 'text-emerald-400 bg-emerald-500/10' },
  'Presence Radar':   { label: 'Recruiting',   color: 'text-emerald-400 bg-emerald-500/10' },
  'Alliance Duel':    { label: 'Recruiting',   color: 'text-emerald-400 bg-emerald-500/10' },
  'Results':          { label: 'Reports',      color: 'text-amber-400 bg-amber-500/10' },
  'Configuration':    { label: 'Reports',      color: 'text-amber-400 bg-amber-500/10' },
  'Fort Tracker':     { label: 'Reports',      color: 'text-amber-400 bg-amber-500/10' },
};

export default function CommandPalette({ availableTabs, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fuzzy filter — matches any substring of tab name or category
  const filtered = availableTabs.filter(tab => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const cat = CATEGORY_MAP[tab.name]?.label?.toLowerCase() || '';
    return tab.name.toLowerCase().includes(q) || cat.includes(q);
  });

  // Reset cursor when results change
  useEffect(() => {
    setCursor(0);
  }, [query]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      if (filtered[cursor]) {
        onSelect(filtered[cursor].name);
        onClose();
      }
    }
  }, [filtered, cursor, onSelect, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[cursor];
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="w-full max-w-xl bg-[#0f1115] border border-[#2a3041] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e222b]">
          <Search size={16} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tools... (e.g. scatter, roster, DKP)"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600 font-mono"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-600 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[9px] font-bold text-gray-600 border border-[#2a3041] rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[340px] overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-600">
              <Activity size={24} className="mb-3 opacity-40" />
              <p className="text-xs font-mono">No tools match &quot;{query}&quot;</p>
            </div>
          ) : (
            filtered.map((tab, i) => {
              const Icon = ICON_MAP[tab.name] || Activity;
              const cat = CATEGORY_MAP[tab.name];
              const isActive = i === cursor;
              return (
                <button
                  key={tab.name}
                  onClick={() => { onSelect(tab.name); onClose(); }}
                  onMouseEnter={() => setCursor(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                    isActive ? 'bg-[#1a1e27] text-white' : 'text-gray-400 hover:bg-[#13161c]'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-[#2a3041]' : 'bg-[#161920]'}`}>
                    <Icon size={13} className={isActive ? 'text-cyan-400' : 'text-gray-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider truncate">{tab.name}</p>
                  </div>
                  {cat && (
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${cat.color}`}>
                      {cat.label}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#1e222b] text-[9px] font-mono text-gray-600 uppercase tracking-widest">
          <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> Navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={10} /> Select</span>
          <span className="flex items-center gap-1"><kbd className="border border-[#2a3041] rounded px-1">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
