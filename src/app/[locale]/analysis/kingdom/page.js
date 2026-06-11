"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { BarChart2, RefreshCw, ShieldAlert, FileText, Target, Crosshair, Map, Activity, LayoutTemplate, Layers, Clock, Zap, Cpu, Archive, TrendingUp, Link, GitMerge, Trophy, Link2, Users, Search, Menu, PanelLeft, Building2, X } from "lucide-react";
import KingdomAnalysisTab from "@/components/analysis/kingdom/KingdomAnalysisTab";
import OverviewTab from "@/components/analysis/kingdom/OverviewTab";
import ScatterPlotTab from "@/components/analysis/kingdom/ScatterPlotTab";
import GrowthAnalysisTab from "@/components/analysis/kingdom/GrowthAnalysisTab";
import AllianceDuelTab from "@/components/analysis/kingdom/AllianceDuelTab";
import TeamBuilderTab from "@/components/analysis/kingdom/TeamBuilderTab";
import AllianceMergeTab from "@/components/analysis/kingdom/AllianceMergeTab";
import MGEPlannerTab from "@/components/analysis/kingdom/MGEPlannerTab";
import ConfigurationTab from "@/components/analysis/kingdom/ConfigurationTab";
import ResultsTab from "@/components/analysis/kingdom/ResultsTab";
import AccountLinkerTab from "@/components/analysis/kingdom/AccountLinkerTab";
import WarRoomTab from "@/components/analysis/kingdom/WarRoomTab";
import PresenceRadarTab from "@/components/analysis/kingdom/PresenceRadarTab";
import RosterViewTab from "@/components/analysis/kingdom/RosterViewTab";
import FortTrackerTab from "@/components/analysis/kingdom/FortTrackerTab";
import T5TrackerTab from "@/components/analysis/kingdom/T5TrackerTab";
import CompareTab from "@/components/analysis/kingdom/CompareTab";
import WorkbenchSidebar from "@/components/analysis/kingdom/WorkbenchSidebar";
import CommandPalette from "@/components/analysis/kingdom/CommandPalette";
import MemberPortal from "@/components/member/MemberPortal";
import { useTranslations } from "next-intl";
import KingdomVault from "@/app/[locale]/vault/page";

const TABS = [
  { name: "Overview", icon: LayoutTemplate },
  { name: "Compare", icon: Users },
  { name: "Kingdom Analysis", icon: BarChart2 },
  { name: "Growth Analysis", icon: TrendingUp },
  { name: "Presence Radar", icon: Clock },
  { name: "Alliance Duel", icon: Crosshair },
  { name: "Scatter Plot", icon: Map },
  { name: "War Room", icon: Map },
  { name: "Team Builder", icon: Link },
  { name: "Alliance Merge", icon: GitMerge },
  { name: "Fixed MGE", icon: Trophy },
  { name: "Roster Linker", icon: Link2 },
  { name: "Configuration", icon: Cpu },
  { name: "Roster View", icon: Users },
  { name: "Fort Tracker", icon: Target },
  { name: "T5 Push Radar", icon: Target },
  { name: "Results", icon: Archive },
  { name: "Kingdom Vault", icon: Building2 }
];

const snapToNearestDate = (targetDateStr, availableDates) => {
  if (!targetDateStr || !availableDates || availableDates.length === 0) return targetDateStr;
  const targetTime = new Date(targetDateStr + 'T00:00:00').getTime();
  let closestDate = availableDates[0];
  let minDiff = Infinity;
  
  for (const dateStr of availableDates) {
    const time = new Date(dateStr + 'T00:00:00').getTime();
    const diff = Math.abs(time - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestDate = dateStr;
    }
  }
  return closestDate;
};

export default function KingdomAnalysis() {
  const tTabs = useTranslations('Tabs');
  const { data: session } = useSession();
  
  const [targetKd, setTargetKd] = useState("");
  const [trends, setTrends] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rosterData, setRosterData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);

  // ── Secondary Kingdom Stack ──────────────────────────────────────────────
  const [secondaryKd, setSecondaryKd] = useState('');
  const [secondaryRosterData, setSecondaryRosterData] = useState([]);
  const [isLoadingSecondaryRoster, setIsLoadingSecondaryRoster] = useState(false);
  const [showSecondaryInput, setShowSecondaryInput] = useState(false);
  const [secondaryKdInput, setSecondaryKdInput] = useState('');

  // ── Navigation UI State ────────────────────────────────────────────────
  // Tab Routing State
  const [activeTab, setActiveTab] = useState("Kingdom Analysis");
  // Layout Mode: 'sidebar' = new grouped sidebar | 'classic' = legacy horizontal tabs (kill switch)
  const [layoutMode, setLayoutMode] = useState('sidebar');
  // Command Palette (Ctrl+K / Search button)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  // Mobile sidebar drawer
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Persist layout mode preference
  useEffect(() => {
    const stored = localStorage.getItem('unty_layout_mode');
    if (stored === 'classic' || stored === 'sidebar') setLayoutMode(stored);
  }, []);

  const toggleLayoutMode = () => {
    const next = layoutMode === 'sidebar' ? 'classic' : 'sidebar';
    setLayoutMode(next);
    localStorage.setItem('unty_layout_mode', next);
  };

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Role tier resolution (additive hierarchy) ─────────────────────────
  const isAnalyst    = session?.user?.isAnalyst    || false;
  const isLeader     = session?.user?.isLeader     || false;
  const isSuperAdmin = session?.user?.isSuperAdmin || false;

  // ── Tab permission matrix ──────────────────────────────────────────────
  // minRole: 'analyst' = analyst+leader+admin | 'leader' = leader+admin only
  const LEADER_ONLY = new Set(['War Room', 'Team Builder', 'Alliance Merge', 'Fixed MGE', 'Roster Linker', 'Fort Tracker', 'Kingdom Vault']);

  const availableTabs = useMemo(() => {
    return TABS.filter(t => {
      if (LEADER_ONLY.has(t.name)) return isLeader || isSuperAdmin;  // Leader+ only
      return isAnalyst || isLeader || isSuperAdmin;                   // Analyst+ (all intelligence tabs)
    });
  }, [isAnalyst, isLeader, isSuperAdmin]);

  const fetchTrends = async (forceKd = null) => {
    const kd = forceKd || targetKd;
    if (!kd) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/trends?kd=${kd}`);
      const data = await res.json();
      if (res.ok) setTrends(data.trends || []);
      else setTrends([]);
    } catch (e) {
      console.error(e);
      setTrends([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoster = async (forceKd = null) => {
      const kd = forceKd || targetKd;
      if (!kd) return;

      setIsLoadingRoster(true);
      try {
          const res = await fetch(`/api/aws/roster?kd=${kd}`);
          const data = await res.json();
          if (res.ok && data.roster) {
              setRosterData(data.roster);
          } else {
              setRosterData([]);
          }
      } catch (e) {
          console.error(e);
          setRosterData([]);
      } finally {
          setIsLoadingRoster(false);
      }
  };

  const fetchSecondaryRoster = async (kd) => {
      if (!kd) { setSecondaryRosterData([]); return; }
      setIsLoadingSecondaryRoster(true);
      try {
          const res = await fetch(`/api/aws/roster?kd=${kd}`);
          const data = await res.json();
          if (res.ok && data.roster) {
              setSecondaryRosterData(data.roster);
          } else {
              setSecondaryRosterData([]);
          }
      } catch (e) {
          console.error('Secondary roster fetch failed:', e);
          setSecondaryRosterData([]);
      } finally {
          setIsLoadingSecondaryRoster(false);
      }
  };

  // Merge primary + secondary rosters. Secondary players get _sourceKd tag
  // and namespaced IDs (e.g. "4023_123456") to prevent collisions.
  const mergedRosterData = useMemo(() => {
      const primary = rosterData.map(p => ({ ...p, _sourceKd: targetKd }));
      if (!secondaryKd || secondaryRosterData.length === 0) return primary;
      const secondary = secondaryRosterData.map(p => ({
          ...p,
          _sourceKd: secondaryKd,
          id: `${secondaryKd}_${p.id}`,
      }));
      return [...primary, ...secondary];
  }, [rosterData, secondaryRosterData, targetKd, secondaryKd]);

  useEffect(() => {
    let initialKd = "";
    if (typeof window !== 'undefined') {
        const storedKd = localStorage.getItem('unty_active_kd');
        if (storedKd) initialKd = storedKd;
        else if (session?.user?.allowedKingdoms?.[0]) initialKd = session.user.allowedKingdoms[0];
    }
    
    if (initialKd && !targetKd) {
        setTargetKd(initialKd);
        fetchTrends(initialKd);
        fetchRoster(initialKd);
    }
  }, [session]);

  const extractDate = (dateStr) => {
      if (!dateStr) return "";
      return dateStr.split('T')[0].split(' ')[0].split('_')[0];
  };

  useEffect(() => {
      if (trends && trends.length > 0) {
          const availableDateStrings = trends.map(t => extractDate(t.scanDate)).filter(Boolean);
          if (availableDateStrings.length > 0) {
              const latestDateStr = availableDateStrings[availableDateStrings.length - 1];
              setEndDate(latestDateStr);

              // Default start date to 5 days prior to the latest scan date, snapped to closest scan date
              const latestDate = new Date(latestDateStr + 'T00:00:00');
              const fiveDaysPrior = new Date(latestDate.getTime() - 5 * 24 * 60 * 60 * 1000);
              const fiveDaysPriorStr = fiveDaysPrior.toISOString().split('T')[0];
              const snappedStart = snapToNearestDate(fiveDaysPriorStr, availableDateStrings);
              setStartDate(snappedStart);
          }
      }
  }, [trends]);

  const renderActiveTab = () => {
      switch (activeTab) {
          case 'Kingdom Analysis':
              return (
                  <KingdomAnalysisTab 
                      trends={trends} 
                      rosterData={mergedRosterData} 
                      targetKd={targetKd} 
                      startDate={startDate}
                      endDate={endDate}
                  />
              );
          case 'Overview':
              return (
                  <OverviewTab 
                      targetKd={targetKd}
                      trends={trends}
                      startDate={startDate}
                      endDate={endDate}
                  />
              );
          case 'Compare':
              return (
                  <CompareTab 
                      targetKd={targetKd}
                      trends={trends}
                      startDate={startDate}
                      endDate={endDate}
                  />
              );
          case 'War Room':
              return (
                  <WarRoomTab 
                      targetKd={targetKd}
                  />
              );
          case 'Presence Radar':
              return (
                  <PresenceRadarTab 
                      targetKd={targetKd}
                  />
              );
          case 'Growth Analysis':
              return (
                  <GrowthAnalysisTab 
                      targetKd={targetKd}
                      trends={trends}
                      startDate={startDate}
                      endDate={endDate}
                  />
              );
          case 'T5 Push Radar':
              return (
                  <T5TrackerTab 
                      targetKd={targetKd}
                      secondaryKd={secondaryKd}
                      trends={trends}
                      startDate={startDate}
                      endDate={endDate}
                  />
              );
          case 'Alliance Duel':
              return (
                  <AllianceDuelTab 
                      targetKd={targetKd}
                      trends={trends}
                      startDate={startDate}
                      endDate={endDate}
                  />
              );
          case 'Scatter Plot':
              return (
                  <ScatterPlotTab 
                      rosterData={mergedRosterData}
                      targetKd={targetKd}
                      startDate={startDate}
                      endDate={endDate}
                      isLeader={isLeader || isSuperAdmin}
                  />
              );
          case 'Team Builder':
              return (
                  <TeamBuilderTab 
                      rosterData={mergedRosterData}
                      targetKd={targetKd}
                      isLeader={session?.user?.isLeader || session?.user?.isSuperAdmin}
                  />
              );
          case 'Alliance Merge':
              return (
                  <AllianceMergeTab 
                      rosterData={mergedRosterData}
                      targetKd={targetKd}
                      secondaryKd={secondaryKd}
                      isLeader={session?.user?.isLeader || session?.user?.isSuperAdmin}
                  />
              );
          case 'Fixed MGE':
              return (
                  <MGEPlannerTab
                      rosterData={mergedRosterData}
                      targetKd={targetKd}
                      isLeader={session?.user?.isLeader || session?.user?.isSuperAdmin}
                  />
              );
          case 'Configuration':
              return (
                  <ConfigurationTab targetKd={targetKd} />
              );
          case 'Results':
              return (
                  <ResultsTab 
                      targetKd={targetKd}
                      trends={trends}
                  />
              );
          case 'Roster View':
              return (
                  <RosterViewTab
                      rosterData={mergedRosterData}
                      isLoading={isLoadingRoster}
                  />
              );
          case 'Roster Linker':
              return (
                  <AccountLinkerTab
                      rosterData={mergedRosterData}
                      targetKd={targetKd}
                  />
              );
          case 'Fort Tracker':
              return (
                  <FortTrackerTab 
                      targetKd={targetKd}
                      rosterData={mergedRosterData}
                  />
              );
          case 'Kingdom Vault':
              return (
                  <KingdomVault 
                      hideHeader={true}
                      targetKd={targetKd}
                  />
              );
          default:
              return (
                  <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500 shadow-xl">
                      <Activity className="w-12 h-12 mb-4 opacity-50 text-cyan-500" />
                      <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{tTabs('tab_in_dev')}</h3>
                      <p className="text-sm">{tTabs('tab_in_dev_desc')}</p>
                  </div>
              );
      }
  };

  // ── Shared header JSX (used in both layout modes) ─────────────────────
  const renderHeader = (showMobileMenuBtn = false) => (
    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 w-full">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger — only in sidebar mode */}
          {showMobileMenuBtn && (
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 bg-[#1e222b] border border-[#2d323e] rounded-lg text-gray-400 hover:text-white transition-colors"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
          )}
          <div className="bg-[#1e222b] p-2.5 rounded-xl border border-[#2d323e]">
            <BarChart2 className="text-cyan-500" size={26} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase">{tTabs('workbench_title')}</h1>
            <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-0.5">{tTabs('workbench_subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap justify-end gap-2 md:gap-3">
          {/* Date Range */}
          {trends.length > 0 && (
            <div className="flex items-center gap-2 bg-[#0a0c0f] border border-[#1e222b] rounded-lg px-3 py-2 border-l-4 border-l-cyan-500 shadow-lg shrink-0">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">START</span>
              <input type="date" value={startDate} onChange={e => {
                const availableDateStrings = trends.map(t => extractDate(t.scanDate)).filter(Boolean);
                const snapped = snapToNearestDate(e.target.value, availableDateStrings);
                setStartDate(snapped);
              }}
                className="bg-transparent text-white text-xs outline-none font-mono cursor-pointer" style={{ colorScheme: 'dark' }} />
              <span className="text-gray-600 mx-1">/</span>
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">END</span>
              <input type="date" value={endDate} onChange={e => {
                const availableDateStrings = trends.map(t => extractDate(t.scanDate)).filter(Boolean);
                const snapped = snapToNearestDate(e.target.value, availableDateStrings);
                setEndDate(snapped);
              }} min={startDate}
                className="bg-transparent text-white text-xs outline-none font-mono cursor-pointer" style={{ colorScheme: 'dark' }} />
            </div>
          )}

          {/* Primary Kingdom Selector */}
          <select value={targetKd}
            onChange={(e) => {
              const newKd = e.target.value;
              setTargetKd(newKd);
              if (typeof window !== 'undefined') localStorage.setItem('unty_active_kd', newKd);
              fetchTrends(newKd);
              fetchRoster(newKd);
              // Clear secondary if same kingdom selected
              if (secondaryKd === newKd) { setSecondaryKd(''); setSecondaryRosterData([]); }
            }}
            className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-cyan-500 px-3 py-2 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg text-sm"
          >
            {session?.user?.allowedKingdoms?.map(kd => (
              <option key={kd} value={kd} className="bg-[#0f1115] text-white">Kingdom {kd}</option>
            ))}
            {!session?.user?.allowedKingdoms?.includes(targetKd) && targetKd && (
              <option value={targetKd} className="bg-[#0f1115] text-white">Kingdom {targetKd}</option>
            )}
          </select>

          {/* ── Secondary Kingdom Stacker ── */}
          {secondaryKd ? (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-amber-300 shadow-lg shrink-0">
              <Layers size={12} className="text-amber-400 shrink-0" />
              <span>+KD {secondaryKd}</span>
              {isLoadingSecondaryRoster && <RefreshCw size={10} className="animate-spin ml-0.5" />}
              <button
                onClick={() => { setSecondaryKd(''); setSecondaryRosterData([]); setShowSecondaryInput(false); }}
                className="ml-1 text-amber-500/50 hover:text-red-400 transition-colors"
                title="Remove stacked kingdom"
              >
                <X size={12} />
              </button>
            </div>
          ) : showSecondaryInput ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="text"
                placeholder="KD#..."
                value={secondaryKdInput}
                onChange={e => setSecondaryKdInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && secondaryKdInput.trim() && secondaryKdInput.trim() !== targetKd) {
                    const kd = secondaryKdInput.trim();
                    setSecondaryKd(kd);
                    setShowSecondaryInput(false);
                    setSecondaryKdInput('');
                    fetchSecondaryRoster(kd);
                  }
                  if (e.key === 'Escape') { setShowSecondaryInput(false); setSecondaryKdInput(''); }
                }}
                className="bg-[#0a0c0f] border border-amber-500/40 text-white text-xs font-mono rounded-lg px-2 py-2 outline-none focus:border-amber-400 w-24 transition-colors"
                autoFocus
              />
              <button
                onClick={() => { setShowSecondaryInput(false); setSecondaryKdInput(''); }}
                className="p-1.5 text-gray-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSecondaryInput(true)}
              title="Stack a second kingdom's roster into Alliance Merge & planning tools"
              className="flex items-center gap-1.5 p-2.5 bg-[#0a0c0f] hover:bg-amber-500/10 text-gray-500 hover:text-amber-400 border border-[#1e222b] hover:border-amber-500/30 rounded-lg transition-colors shadow-lg text-xs font-bold shrink-0"
            >
              <Layers size={15} />
              <span className="hidden lg:inline">Stack KD</span>
            </button>
          )}

          {/* Search / Command Palette */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            title="Search tools (Ctrl+K)"
            className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-cyan-400 border border-[#1e222b] rounded-lg transition-colors shadow-lg"
          >
            <Search size={17} />
          </button>

          {/* Refresh */}
          <button onClick={() => { fetchTrends(); fetchRoster(); }}
            disabled={isLoading || isLoadingRoster}
            className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg"
          >
            <RefreshCw size={17} className={(isLoading || isLoadingRoster) ? 'animate-spin text-cyan-500' : ''} />
          </button>

          {/* ── KILL SWITCH: Layout Mode Toggle ── */}
          <button
            onClick={toggleLayoutMode}
            title={layoutMode === 'sidebar' ? 'Switch to classic tab view' : 'Switch to sidebar view'}
            className={`p-2.5 border rounded-lg transition-colors shadow-lg text-xs font-bold ${
              layoutMode === 'sidebar'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-[#0a0c0f] border-[#1e222b] text-gray-500 hover:text-white hover:bg-[#1e222b]'
            }`}
          >
            <PanelLeft size={17} />
          </button>
        </div>
      </div>
    </div>
  );

  // ── MEMBER PORTAL: Base members see personal dashboard only ──────────────
  if (!isAnalyst && !isLeader && !isSuperAdmin) {
    return <MemberPortal session={session} />;
  }

  // ── SIDEBAR LAYOUT ──────────────────────────────────────────────────────
  if (layoutMode === 'sidebar') {
    return (
      <div className="w-full flex gap-0 animate-fade-in mt-4 relative" style={{ minHeight: '80vh' }}>
        {/* Command Palette (global overlay) */}
        {isPaletteOpen && (
          <CommandPalette
            availableTabs={availableTabs}
            onSelect={(name) => setActiveTab(name)}
            onClose={() => setIsPaletteOpen(false)}
          />
        )}

        {/* Sidebar (desktop inline + mobile drawer) */}
        <WorkbenchSidebar
          availableTabs={availableTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileDrawerOpen}
          setIsMobileOpen={setIsMobileDrawerOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-4 pb-12 px-3 md:px-5">
          {renderHeader(true)}
          <div className="min-h-[500px]">
            {renderActiveTab()}
          </div>
        </div>
      </div>
    );
  }

  // ── CLASSIC LAYOUT (Kill Switch Active) ────────────────────────────────
  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      {/* Command Palette (global overlay) */}
      {isPaletteOpen && (
        <CommandPalette
          availableTabs={availableTabs}
          onSelect={(name) => setActiveTab(name)}
          onClose={() => setIsPaletteOpen(false)}
        />
      )}

      {renderHeader(false)}

      {/* Legacy Horizontal Sub-Navigation Tab Array — untouched */}
      <div className="w-full overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
        <div className="flex items-center gap-3 min-w-max px-2">
          {availableTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[inset_4px_0_0_0_rgba(6,182,212,1)] shadow-lg'
                    : 'bg-[#13161c] text-gray-500 border border-[#1e222b] hover:bg-[#1e222b] hover:text-gray-300'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-gray-600'} />
                {tab.label || tTabs(tab.name) || tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Virtual Tab Component */}
      <div className="min-h-[500px]">
        {renderActiveTab()}
      </div>
    </div>
  );
}
