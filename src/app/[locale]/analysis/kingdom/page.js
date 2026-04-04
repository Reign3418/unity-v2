"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { BarChart2, RefreshCw, ShieldAlert, FileText, Target, Crosshair, Map, Activity, LayoutTemplate, Layers, Clock, Zap, Cpu, Archive, TrendingUp, Link, GitMerge, Trophy, Link2 } from "lucide-react";
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
import { useTranslations } from "next-intl";

const TABS = [
  { name: "Overview", icon: LayoutTemplate },
  { name: "War Room", icon: Map },
  { name: "Growth Analysis", icon: TrendingUp },
  { name: "Kingdom Analysis", icon: BarChart2 },
  { name: "Alliance Duel", icon: Crosshair },
  { name: "Scatter Plot", icon: Map },
  { name: "Hall of Legends", icon: ShieldAlert },
  { name: "Team Builder", icon: Link },
  { name: "Alliance Merge", icon: GitMerge },
  { name: "Fixed MGE", icon: Trophy },
  { name: "Roster Linker", icon: Link2 },
  { name: "Configuration", icon: Cpu },
  { name: "Results", icon: Archive }
];

export default function KingdomAnalysis() {
  const tTabs = useTranslations('Tabs');
  const { data: session } = useSession();
  
  const [targetKd, setTargetKd] = useState("");
  const [trends, setTrends] = useState([]);
  const [rosterData, setRosterData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  
  // Tab Routing State
  const [activeTab, setActiveTab] = useState("Kingdom Analysis"); // Defaulting to Kingdom Analysis to maintain immediate compatibility until Overview is built.

  // Dynamic Array mapping to wipe restricted components from the view entirely for standard users
  const availableTabs = useMemo(() => {
     const isLeader = session?.user?.isLeader || session?.user?.isSuperAdmin;
     return TABS.filter(t => {
         if (!isLeader && (t.name === "Scatter Plot" || t.name === "Roster Linker")) return false;
         return true;
     });
  }, [session]);

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

  const renderActiveTab = () => {
      switch (activeTab) {
          case 'Kingdom Analysis':
              return (
                  <KingdomAnalysisTab 
                      trends={trends} 
                      rosterData={rosterData} 
                      targetKd={targetKd} 
                  />
              );
          case 'Overview':
              return (
                  <OverviewTab 
                      targetKd={targetKd}
                      trends={trends}
                  />
              );
          case 'War Room':
              return (
                  <WarRoomTab 
                      targetKd={targetKd}
                  />
              );
          case 'Growth Analysis':
              return (
                  <GrowthAnalysisTab 
                      targetKd={targetKd}
                      trends={trends}
                  />
              );
          case 'Alliance Duel':
              return (
                  <AllianceDuelTab 
                      targetKd={targetKd}
                      trends={trends}
                  />
              );
          case 'Scatter Plot':
              if (!session?.user?.isLeader && !session?.user?.isSuperAdmin) {
                  return (
                      <div className="bg-[#0f1115] border border-rose-500/30 rounded-xl p-12 flex flex-col items-center justify-center text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                          <ShieldAlert className="w-12 h-12 mb-4 opacity-80" />
                          <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{tTabs('r4_clearance')}</h3>
                          <p className="text-sm text-gray-400">{tTabs('r4_desc')}</p>
                      </div>
                  );
              }
              return (
                  <ScatterPlotTab 
                      rosterData={rosterData}
                      targetKd={targetKd}
                      trends={trends}
                  />
              );
          case 'Team Builder':
              return (
                  <TeamBuilderTab 
                      rosterData={rosterData}
                      targetKd={targetKd}
                      isLeader={session?.user?.isLeader || session?.user?.isSuperAdmin}
                  />
              );
          case 'Alliance Merge':
              return (
                  <AllianceMergeTab 
                      rosterData={rosterData}
                      targetKd={targetKd}
                      isLeader={session?.user?.isLeader || session?.user?.isSuperAdmin}
                  />
              );
          case 'Fixed MGE':
              return (
                  <MGEPlannerTab
                      rosterData={rosterData}
                      targetKd={targetKd}
                      isLeader={session?.user?.isLeader || session?.user?.isSuperAdmin}
                  />
              );
          case 'Configuration':
              return (
                  <ConfigurationTab />
              );
          case 'Results':
              return (
                  <ResultsTab 
                      targetKd={targetKd}
                      trends={trends}
                  />
              );
          case 'Roster Linker':
              if (!session?.user?.isLeader && !session?.user?.isSuperAdmin) {
                  return (
                      <div className="bg-[#0f1115] border border-rose-500/30 rounded-xl p-12 flex flex-col items-center justify-center text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                          <ShieldAlert className="w-12 h-12 mb-4 opacity-80" />
                          <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{tTabs('r4_clearance')}</h3>
                          <p className="text-sm text-gray-400">{tTabs('r4_desc')}</p>
                      </div>
                  );
              }
              return (
                  <AccountLinkerTab
                      rosterData={rosterData}
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

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                 <BarChart2 className="text-cyan-500" size={32} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-white tracking-widest uppercase">{tTabs('workbench_title')}</h1>
                 <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">{tTabs('workbench_subtitle')}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <select 
                 value={targetKd}
                 onChange={(e) => {
                     const newKd = e.target.value;
                     setTargetKd(newKd);
                     if (typeof window !== 'undefined') localStorage.setItem('unty_active_kd', newKd);
                     fetchTrends(newKd);
                     fetchRoster(newKd);
                 }}
                 className="bg-[#0a0c0f] border border-[#1e222b] text-white focus:border-cyan-500 px-4 py-2 rounded-lg font-mono font-bold outline-none cursor-pointer transition-colors shadow-lg"
               >
                 {session?.user?.allowedKingdoms?.map(kd => (
                    <option key={kd} value={kd} className="bg-[#0f1115] text-white">Kingdom {kd}</option>
                 ))}
                 {!session?.user?.allowedKingdoms?.includes(targetKd) && targetKd && (
                    <option value={targetKd} className="bg-[#0f1115] text-white">Kingdom {targetKd}</option>
                 )}
               </select>

               <button 
                 onClick={() => { fetchTrends(); fetchRoster(); }}
                 disabled={isLoading || isLoadingRoster}
                 className="p-2.5 bg-[#0a0c0f] hover:bg-[#1e222b] text-gray-400 hover:text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg"
               >
                  <RefreshCw size={20} className={(isLoading || isLoadingRoster) ? "animate-spin text-cyan-500" : ""} />
               </button>
            </div>
         </div>
      </div>

      {/* Legacy Horizontal Sub-Navigation Tab Array */}
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
                  {tTabs(tab.name) || tab.name}
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
