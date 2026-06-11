'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, X, Activity,
  BarChart2, TrendingUp, Map, Clock, Crosshair,
  Link, GitMerge, Trophy, Users, Link2, Archive,
  Cpu, Target, LayoutTemplate, Menu, Building2, Sparkles, Layers, Minus
} from 'lucide-react';

// Maps every tab name to its lucide icon
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
  'T5 Push Radar':    Target,
  'Kingdom Vault':    Building2,
};

// Tabs that receive merged roster + behavioral data when a secondary KD is stacked
const STACK_SUPPORTED = new Set([
  'Kingdom Analysis',
  'Scatter Plot',
  'T5 Push Radar',
  'Team Builder',
  'Fixed MGE',
  'Alliance Merge',
  'Roster View',
  'Roster Linker',
  'Fort Tracker',
]);

// Mission-category groupings — order matters
const CATEGORIES = [
  {
    name: 'Intelligence',
    colorClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
    bgActiveClass: 'bg-cyan-500/10 border-cyan-500/30',
    tabs: ['Overview', 'Compare', 'Kingdom Analysis', 'Growth Analysis', 'Scatter Plot', 'T5 Push Radar'],
  },
  {
    name: 'Planning',
    colorClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
    bgActiveClass: 'bg-indigo-500/10 border-indigo-500/30',
    tabs: ['Team Builder', 'Fixed MGE', 'Alliance Merge', 'War Room'],
  },
  {
    name: 'Recruiting',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    bgActiveClass: 'bg-emerald-500/10 border-emerald-500/30',
    tabs: ['Roster View', 'Roster Linker', 'Presence Radar', 'Alliance Duel'],
  },
  {
    name: 'Reports',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    bgActiveClass: 'bg-amber-500/10 border-amber-500/30',
    tabs: ['Results', 'Configuration', 'Fort Tracker', 'Kingdom Vault'],
  },
];

export default function WorkbenchSidebar({
  availableTabs,
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  secondaryKd,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Hydrate from localStorage + listen for resize
  useEffect(() => {
    const stored = localStorage.getItem('unty_sidebar_collapsed');
    if (stored !== null) setIsCollapsed(stored === 'true');

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('unty_sidebar_collapsed', String(next));
  };

  const availableTabNames = new Set(availableTabs.map(t => t.name));

  // ── INNER CONTENT (shared between desktop and mobile drawer) ────────────
  const sidebarBody = (
    <div
      className={`flex flex-col h-full bg-[#090b0e] border-r border-[#1e222b] transition-all duration-300 ease-in-out overflow-hidden ${
        isMobile ? 'w-64' : isCollapsed ? 'w-[52px]' : 'w-56'
      }`}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 py-3 border-b border-[#1e222b] min-h-[48px]">
        {(!isCollapsed || isMobile) && (
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600 pl-1">
            Workbench
          </span>
        )}
        {isMobile ? (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e222b] transition-colors"
          >
            <X size={15} />
          </button>
        ) : (
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="ml-auto p-1.5 rounded-lg text-gray-600 hover:text-cyan-400 hover:bg-[#1e222b] transition-colors"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* ── Category groups ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
        {CATEGORIES.map((cat, ci) => {
          const visibleTabs = cat.tabs.filter(t => availableTabNames.has(t));
          if (visibleTabs.length === 0) return null;

          return (
            <div key={cat.name} className={`px-1.5 ${ci > 0 ? 'mt-3' : ''}`}>

              {/* Category label */}
              {(!isCollapsed || isMobile) ? (
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <span className={`text-[8px] font-black uppercase tracking-[0.25em] ${cat.colorClass}`}>
                    {cat.name}
                  </span>
                  <div className={`flex-1 h-px ${cat.borderClass}`} />
                </div>
              ) : (
                <div className={`w-6 h-px mx-auto mb-1.5 ${cat.borderClass}`} />
              )}

              {/* Tab buttons */}
              {visibleTabs.map(tabName => {
                const Icon = ICON_MAP[tabName] || Activity;
                const isActive = activeTab === tabName;
                const isAi = tabName === 'Growth Analysis';
                const stackSupported = STACK_SUPPORTED.has(tabName);
                const stackActive = !!secondaryKd;
                return (
                  <button
                    key={tabName}
                    title={isCollapsed && !isMobile ? `${tabName}${isAi ? ' (AI-Powered)' : ''}${stackSupported ? ' · Stack KD supported' : ' · Single kingdom only'}` : undefined}
                    onClick={() => {
                      setActiveTab(tabName);
                      if (isMobile) setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all mb-0.5 border relative ${
                      isActive
                        ? `${cat.bgActiveClass} ${cat.colorClass} shadow-sm`
                        : 'text-gray-500 border-transparent hover:bg-[#1a1e27] hover:text-gray-300'
                    } ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
                  >
                    <Icon size={13} className="shrink-0" />
                    {(!isCollapsed || isMobile) && (
                      <span className="truncate leading-none flex items-center gap-1 flex-1">
                        {tabName}
                        {isAi && <Sparkles size={10} className="text-fuchsia-400 fill-fuchsia-400/20 shrink-0 ml-0.5" />}
                      </span>
                    )}

                    {/* Stack indicator */}
                    {(!isCollapsed || isMobile) && (
                      stackSupported ? (
                        <Layers
                          size={9}
                          title="Supports Kingdom Stack"
                          className={`shrink-0 transition-colors ${
                            stackActive ? 'text-amber-400' : 'text-amber-700/50'
                          }`}
                        />
                      ) : (
                        <Minus
                          size={9}
                          title="Single kingdom only"
                          className="shrink-0 text-gray-700"
                        />
                      )
                    )}

                    {/* Collapsed-mode dots */}
                    {isCollapsed && !isMobile && isAi && (
                      <div className="absolute right-1 top-1 w-1.5 h-1.5 bg-fuchsia-400 rounded-full" />
                    )}
                    {isCollapsed && !isMobile && stackSupported && stackActive && (
                      <div className="absolute right-1 bottom-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── MOBILE: overlay drawer ───────────────────────────────────────────────
  if (isMobile) {
    if (!isMobileOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex">
        {sidebarBody}
        {/* Scrim: tap outside to close */}
        <div
          className="flex-1 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      </div>
    );
  }

  // ── DESKTOP: inline sticky sidebar ──────────────────────────────────────
  return (
    <div className="hidden md:flex sticky top-0 h-screen self-start shrink-0">
      {sidebarBody}
    </div>
  );
}
