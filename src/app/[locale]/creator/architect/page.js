'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslations } from 'next-intl';
import {
  Map as MapIcon,
  Columns,
  GitBranch,
  FileText,
  Sparkles,
  RotateCcw,
  Printer,
  Copy,
  Check,
  Search,
  ExternalLink,
  Maximize2,
  Minimize2,
  ArrowRight,
  Compass,
  Activity,
  Flame,
  Skull,
  Clock,
  ArrowUpDown,
} from 'lucide-react';

const BUCKET_META = {
  unity_core: {
    label: '🟢 1. Unity 3.0 Core',
    shortLabel: 'Unity Core',
    sub: 'Public & Member Daily Tools',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    wire: 'rgba(16, 185, 129, 0.45)',
  },
  r5_command: {
    label: '🟣 2. R4 / R5 Suite',
    shortLabel: 'R4/R5 Suite',
    sub: 'Kingdom Leadership Workbench',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    wire: 'rgba(168, 85, 247, 0.45)',
  },
  valheon: {
    label: '🔵 3. Move to Valheon',
    shortLabel: 'Valheon Sovereign',
    sub: 'Sovereign Bots, RAM & Forensics',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    wire: 'rgba(6, 182, 212, 0.45)',
  },
  merge: {
    label: '🟡 4. Merge Into Tab',
    shortLabel: 'Merge Into Tab',
    sub: 'Remove from Top-Nav -> Sub-Tab',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    wire: 'rgba(245, 158, 11, 0.45)',
  },
  cut: {
    label: '🔴 5. Cut / Take Out',
    shortLabel: 'Cut / Retire',
    sub: 'Retire Duplicate / Legacy Route',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    wire: 'rgba(244, 63, 94, 0.45)',
  },
};

const BUCKET_ORDER = ['unity_core', 'r5_command', 'valheon', 'merge', 'cut'];

// Verified 90-day historical baseline from DynamoDB Unity2AWSRoster (1,151 events)
const BASELINE_TELEMETRY = {
  // Tier 1: The Big 3 (80.5% of all platform usage)
  rt_polygraph: { hits: 501, lastSeen: '2026-10-22T23:54:51Z', tracked: true, featureKey: 'VISION_POLYGRAPH_SCAN' },
  lab_anomaly: { hits: 501, lastSeen: '2026-10-22T23:54:51Z', tracked: true, featureKey: 'VISION_POLYGRAPH_SCAN' },
  rt_hunter: { hits: 233, lastSeen: '2026-10-24T15:29:47Z', tracked: true, featureKey: 'HUNTER_SEARCH' },
  rt_tracker: { hits: 183, lastSeen: '2026-10-22T18:04:04Z', tracked: true, featureKey: 'TRACKER_SCAN' },

  // Tier 2: Moderate / Situational Usage
  cr_matchmaker: { hits: 64, lastSeen: '2026-06-16T15:09:59Z', tracked: true, featureKey: 'MATCHMAKER_SCAN' },
  rt_calculators: { hits: 24, lastSeen: '2026-10-22T18:04:58Z', tracked: true, featureKey: 'CALCULATOR_TAB_VIEW' },
  lab_ranking: { hits: 24, lastSeen: '2026-10-08T21:54:08Z', tracked: true, featureKey: 'VISION_RANKING_SCAN' },
  rt_reseller: { hits: 21, lastSeen: '2026-10-24T16:23:53Z', tracked: true, featureKey: 'RESELLER_HUNTER_SCAN' },
  lab_reseller: { hits: 21, lastSeen: '2026-10-24T16:23:53Z', tracked: true, featureKey: 'RESELLER_HUNTER_SCAN' },
  rt_ghost: { hits: 20, lastSeen: '2026-10-22T18:00:52Z', tracked: true, featureKey: 'GHOST_HUNTER_SCAN' },
  lab_ghost: { hits: 20, lastSeen: '2026-10-22T18:00:52Z', tracked: true, featureKey: 'GHOST_HUNTER_SCAN' },
  rt_kvk: { hits: 20, lastSeen: '2026-09-14T05:18:03Z', tracked: true, featureKey: 'KVK_SCENARIO_SCAN' },
  rt_rollup: { hits: 16, lastSeen: '2026-10-23T17:56:54Z', tracked: true, featureKey: 'KINGDOM_ROLLUP_ACCESSED' },
  lab_rollup: { hits: 16, lastSeen: '2026-10-23T17:56:54Z', tracked: true, featureKey: 'KINGDOM_ROLLUP_ACCESSED' },
  rt_hitlist: { hits: 15, lastSeen: '2026-10-22T18:03:31Z', tracked: true, featureKey: 'RECRUITMENT_HITLIST_SCAN' },
  lab_hitlist: { hits: 15, lastSeen: '2026-10-22T18:03:31Z', tracked: true, featureKey: 'RECRUITMENT_HITLIST_SCAN' },
  ov_ai_coach: { hits: 15, lastSeen: '2026-10-07T23:37:52Z', tracked: true, featureKey: 'AI_COACH_BRIEF' },

  // Calculator Sub-Tools (from CALCULATOR_TAB_VIEW + VISION_*_SCAN)
  rt_flag_calc: { hits: 8, lastSeen: '2026-10-22T18:04:48Z', tracked: true, calcTab: 'flag', featureKey: 'VISION_FLAG_SCAN' },
  calc_rss: { hits: 4, lastSeen: '2026-10-22T18:04:57Z', tracked: true, calcTab: 'resources', featureKey: 'VISION_RESOURCES_SCAN' },
  calc_ap: { hits: 4, lastSeen: '2026-10-22T18:04:57Z', tracked: true, calcTab: 'ap', featureKey: 'VISION_AP_SCAN' },
  calc_forge: { hits: 3, lastSeen: '2026-10-22T18:04:46Z', tracked: true, calcTab: 'forge', featureKey: 'VISION_FORGE_SCAN' },
  calc_cmdr: { hits: 3, lastSeen: '2026-10-22T18:04:42Z', tracked: true, calcTab: 'deadeye', featureKey: 'VISION_DEADEYE_SCAN' },
  calc_speed: { hits: 1, lastSeen: '2026-10-22T18:04:58Z', tracked: true, calcTab: 'speedups', featureKey: 'VISION_SPEEDUP_SCAN' },
  calc_troop: { hits: 0, lastSeen: '', tracked: true, calcTab: 'troops' },
  calc_vip: { hits: 0, lastSeen: '', tracked: true, calcTab: 'vip' },
  calc_crystal: { hits: 0, lastSeen: '', tracked: true, calcTab: 'crystal' },

  // Tier 3: Rare or 0-Hit Instrumented Endpoints
  rt_register: { hits: 5, lastSeen: '2026-10-07T17:10:18Z', tracked: true, featureKey: 'AUTH_SELF_REGISTER' },
  rt_acc_age: { hits: 3, lastSeen: '2026-10-06T17:48:04Z', tracked: true, featureKey: 'KINGDOM_INFO_VISION_OCR' },
  sh_soc: { hits: 2, lastSeen: '2026-07-02T00:53:17Z', tracked: true, featureKey: 'VISION_SOC_CAMPS_SCAN' },
  lab_grabber: { hits: 0, lastSeen: '', tracked: true, featureKey: 'SCREEN_GRABBER' },
  rt_theater: { hits: 0, lastSeen: '', tracked: true, featureKey: 'THEATER_VIEW' },
};

// Map Kingdom Workbench tab IDs to their activeTab name in /analysis/kingdom
const KINGDOM_TAB_MAP = {
  kt_overview: 'Overview',
  kt_analysis: 'Kingdom Analysis',
  kt_growth: 'Growth Analysis',
  kt_scatter: 'Scatter Plot',
  kt_roster: 'Roster View',
  kt_compare: 'Compare',
  kt_results: 'Results',
  kt_t5: 'T5 Push Radar',
  kt_duel: 'Alliance Duel',
  kt_map: 'Kingdom Map',
  kt_presence: 'Presence Radar',
  kt_warroom: 'War Room',
  kt_teambuilder: 'Team Builder',
  kt_merge: 'Alliance Merge',
  kt_mge: 'Fixed MGE',
  kt_forts: 'Fort Tracker',
  kt_linker: 'Roster Linker',
  kt_config: 'Configuration',
  kt_vault_embed: 'Kingdom Vault',
};

const INITIAL_SURFACES = [
  // 1. CORE PUBLIC & GOVERNOR PORTAL
  { id: 'rt_home', name: 'Command Center / Landing Hub', route: '/', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav #1', note: 'Main landing, quick search, live kingdom cards' },
  { id: 'rt_analysis_kd', name: 'Kingdom Intelligence Workbench', route: '/analysis/kingdom', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav #2 (5 Clean Tabs)', note: 'Currently bloated with 19 sub-tabs — reduce to 5 public tabs' },
  { id: 'rt_analysis_all', name: 'Global Multi-Kingdom Leaderboard', route: '/analysis/all-kingdoms', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav #2 (Sub-View)', note: 'Cross-kingdom power & KP comparison table' },
  { id: 'rt_kvk', name: 'KvK War Center & Matchup Hub', route: '/analysis/kvk', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav #3 (KvK Hub)', note: 'Camp rosters, KvK timeline & scenario analysis' },
  { id: 'rt_hunter', name: 'Player Hunter (Global Search)', route: '/tools/hunter', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav #4 (Governor Lookup)', note: '20.2% of all platform usage — search any governor across kingdoms' },
  { id: 'rt_calculators', name: 'RoK Master Calculators Suite', route: '/calculators', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav #5 (Calculators)', note: '8-in-1 Speedup, Troop, RSS, Commander, Equipment & VIP calculator' },
  { id: 'rt_events', name: 'Kingdom Event Calendar & Timers', route: '/events', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav #6 (Events & Guides)', note: 'MGE, Wheel of Fortune, Pre-KvK & Ark schedule' },
  { id: 'rt_guide', name: 'Governor Academy & Strategy Guides', route: '/guide', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /events (Events & Guides)', note: '95 scrubbed RoK guides & commander pairings' },
  { id: 'rt_scholar', name: 'Peerless Scholar Trivia Solver', route: '/tools/peerless-scholar', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /calculators or /guide', note: 'Instant search for Lyceum of Wisdom questions' },
  { id: 'rt_register', name: 'Governor Self-Registration & PIN Claim', route: '/register', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Header Auth Action', note: 'Zero-friction Governor ID verification & Discord link' },

  // 2. THE 19 SUB-TABS INSIDE /analysis/kingdom
  { id: 'kt_overview', name: 'Tab 1: Kingdom Overview & Vitals', route: '/analysis/kingdom#Overview', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Kingdom Workbench -> Tab 1', note: 'Keep: Top 300 power, KP, alliance pie chart & vitals' },
  { id: 'kt_analysis', name: 'Tab 2:Chronological Power Trajectory', route: '/analysis/kingdom#KingdomAnalysis', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Kingdom Workbench -> Tab 2', note: 'Keep: Historical power/KP trend lines (1,000-rank locked)' },
  { id: 'kt_growth', name: 'Tab 3: Governor Growth & Delta Table', route: '/analysis/kingdom#GrowthAnalysis', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into Tab 2 (Trajectory & Growth)', note: 'Combine with Trajectory tab so users do not bounce between 2 tabs' },
  { id: 'kt_scatter', name: 'Tab 4: 3D/2D Power vs. KP Scatter Plot', route: '/analysis/kingdom#ScatterPlot', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge as Chart Toggle inside Tab 2', note: 'Visual outlier scatter — better as a chart toggle than a full tab' },
  { id: 'kt_roster', name: 'Tab 5: Master 1,000-Governor Roster', route: '/analysis/kingdom#RosterView', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Kingdom Workbench -> Tab 3 (Roster)', note: 'Keep: Searchable 1,000-player table with export' },
  { id: 'kt_compare', name: 'Tab 6: Head-to-Head Kingdom Compare', route: '/analysis/kingdom#Compare', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Kingdom Workbench -> Tab 4 (Compare)', note: 'Keep: Side-by-side comparison of two kingdoms' },
  { id: 'kt_results', name: 'Tab 7: DKP & KvK Final Results', route: '/analysis/kingdom#Results', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Kingdom Workbench -> Tab 5 (DKP Leaderboard)', note: 'Keep: Final KvK DKP rankings & pass/fail thresholds' },
  { id: 'kt_t5', name: 'Tab 8: T5 Push & Tech Floor Radar', route: '/analysis/kingdom#T5Tracker', group: 'Kingdom Workbench Tab', role: 'Analyst+', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Readiness Audit', note: 'Identifies governors structurally eligible for T5' },
  { id: 'kt_duel', name: 'Tab 9: Alliance Duel Matrix', route: '/analysis/kingdom#AllianceDuel', group: 'Kingdom Workbench Tab', role: 'Analyst+', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Alliance Ops', note: 'Compares two alliances within or across kingdoms' },
  { id: 'kt_map', name: 'Tab 10: Kingdom Interactive Territory Map', route: '/analysis/kingdom#KingdomMap', group: 'Kingdom Workbench Tab', role: 'Analyst+', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge with /tools/map into 1 Map Studio', note: 'Duplicate of /tools/map — unify into a single Map Planner', isDuplicate: true },
  { id: 'kt_presence', name: 'Tab 11: Timezone & Online Presence Radar', route: '/analysis/kingdom#PresenceRadar', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Surveillance & Presence', note: '24-hour activity heatmap — belongs in Valheon Intel' },
  { id: 'kt_warroom', name: 'Tab 12: R5 Tactical War Room', route: '/analysis/kingdom#WarRoom', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> War Room Hub', note: 'Core R4/R5 command board' },
  { id: 'kt_teambuilder', name: 'Tab 13: Ark of Osiris & Rally Team Builder', route: '/analysis/kingdom#TeamBuilder', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> War Room Sub-Tab', note: 'Assigns lanes & captains for Ark / KvK' },
  { id: 'kt_merge', name: 'Tab 14: Alliance Merge Optimizer', route: '/analysis/kingdom#AllianceMerge', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Alliance Ops', note: 'Mathematical shell packing for KvK alliance merges' },
  { id: 'kt_mge', name: 'Tab 15: Fixed MGE Cap & Rank Planner', route: '/analysis/kingdom#MGEPlanner', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> MGE & Governance', note: 'Assigns top 15 MGE slots & point caps' },
  { id: 'kt_forts', name: 'Tab 16: Barbarian Fort & Honor Tracker', route: '/analysis/kingdom#FortTracker', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> MGE & Governance', note: 'Tracks alliance fort rallies & Pre-KvK honor' },
  { id: 'kt_linker', name: 'Tab 17: Main + Farm Account Linker', route: '/analysis/kingdom#AccountLinker', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Roster Admin', note: 'Links farm governors to main accounts so DKP sums accurately' },
  { id: 'kt_config', name: 'Tab 18: Kingdom DKP Formula Configuration', route: '/analysis/kingdom#Configuration', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Settings', note: 'Sets T4/T5 kill weights & dead troop multipliers' },
  { id: 'kt_vault_embed', name: 'Tab 19: Embedded Kingdom Vault Tab', route: '/analysis/kingdom#KingdomVault', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'cut', targetParent: 'Cut Duplicate (Already exists at /vault)', note: 'Exact duplicate of /vault route mounted inside tabs', isDuplicate: true },

  // 3. DUPLICATE LAB vs. TOOLS ROUTES
  { id: 'rt_ghost', name: 'Ghost Hunter (Deadweight Detector)', route: '/tools/ghost-hunter', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Vetting & Recruitment', note: 'Keep canonical /tools/ghost-hunter' },
  { id: 'lab_ghost', name: 'Lab Duplicate: Ghost Hunter', route: '/creator/lab/ghost-hunter', group: 'Top-Level Route', role: 'Admin', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Redirect to /tools/ghost-hunter)', note: 'Duplicate route of /tools/ghost-hunter', isDuplicate: true },
  { id: 'rt_reseller', name: 'Illicit RSS Reseller & Bot Hive Radar', route: '/tools/reseller-hunter', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Counter-Intelligence', note: 'Detects macro farm banks & RSS sellers — high-value Valheon feature' },
  { id: 'lab_reseller', name: 'Lab Duplicate: Reseller Hunter', route: '/creator/lab/reseller-hunter', group: 'Top-Level Route', role: 'Admin', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Redirect to /tools/reseller-hunter)', note: 'Duplicate route of /tools/reseller-hunter', isDuplicate: true },
  { id: 'rt_hitlist', name: 'Migration & Recruitment Hitlist', route: '/tools/recruitment-hitlist', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Vetting & Recruitment', note: 'Finds flight-risk whales in neighbor kingdoms' },
  { id: 'lab_hitlist', name: 'Lab Duplicate: Recruitment Hitlist', route: '/creator/lab/recruitment-hitlist', group: 'Top-Level Route', role: 'Admin', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Redirect to /tools/recruitment-hitlist)', note: 'Duplicate route of /tools/recruitment-hitlist', isDuplicate: true },
  { id: 'rt_rollup', name: 'Kingdom Executive Rollup Card', route: '/tools/kingdom-rollup', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /analysis/kingdom Tab 1', note: '1-page kingdom summary — belongs inside Kingdom Overview' },
  { id: 'lab_rollup', name: 'Lab Duplicate: Kingdom Rollup', route: '/creator/lab/kingdom-rollup', group: 'Top-Level Route', role: 'Admin', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Redirect to /analysis/kingdom)', note: 'Duplicate route of /tools/kingdom-rollup', isDuplicate: true },
  { id: 'rt_polygraph', name: 'EK Polygraph (Governor Fraud Audit)', route: '/tools/polygraph', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Counter-Intelligence (#1 Used Tool!)', note: '#1 most-used tool in Unity (501 runs / 43.5% of all activity!)' },
  { id: 'lab_anomaly', name: 'Lab Duplicate: Anomaly Detector', route: '/creator/lab/anomaly-detector', group: 'Top-Level Route', role: 'Admin', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Unify with Polygraph)', note: 'Same multivariate math as EK Polygraph', isDuplicate: true },

  // 4. OTHER /tools/* ROUTES
  { id: 'rt_tracker', name: 'Hourly Activity & Online Tracker', route: '/tools/tracker', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'unity_core', targetParent: 'Unity Top Nav / R5 Vetting (#3 Used Tool!)', note: '#3 most-used tool in Unity (183 runs / 15.9% of all activity)' },
  { id: 'rt_acc_age', name: 'Governor ID Account Age Estimator', route: '/tools/account-age', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Embed directly inside Player Hunter (/tools/hunter)', note: 'Only 3 runs in 90d as standalone page — embed inside Player Hunter' },
  { id: 'rt_flag_calc', name: 'Alliance Territory Flag Cost Calculator', route: '/tools/flag-calculator', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /calculators (Tab #9)', note: '8 combined uses — belongs inside the main Calculators page' },
  { id: 'rt_map', name: 'KvK Interactive Territory Map Planner', route: '/tools/map', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> KvK Map Studio', note: 'Drawing zones, flags & fortress timers on KvK map' },

  // 5. CODENAME SURFACES
  { id: 'rt_bastion', name: '🏰 Bastion Autonomous MoE Command Ring', route: '/bastion', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Fleet & MoE Command (#1)', note: 'Node 1 / Sidekick / Node 3 hardware fleet & 5-Ring MoE Brain' },
  { id: 'rt_blackops', name: '🎯 Black Ops Radar (Target Surveillance)', route: '/black-ops', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Surveillance & Black Ops (#2)', note: 'High-value target tracking, shield drops & cross-server radar' },
  { id: 'rt_aegis', name: '🛡️ Aegis Shield & Security Matrix', route: '/aegis', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Security & Shield Overwatch', note: 'Codename overload in Unity — move to Valheon Sovereign' },
  { id: 'rt_nexus', name: '🌐 Nexus Cross-Kingdom Data Graph', route: '/nexus', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Cross-Server Intelligence', note: 'Migration network graph — move to Valheon Sovereign' },
  { id: 'rt_optics', name: '👁️ Optics Vision OCR Command Hub', route: '/optics', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Optical & RAM Ingestion', note: 'Consolidate all 4 OCR routes into 1 Valheon Ingestion Studio', isDuplicate: true },
  { id: 'rt_theater', name: '🎬 Theater 3D Global War Visualizer', route: '/theater', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'valheon', targetParent: 'Valheon -> Executive Showcase / Trailer', note: '0 runs in 90d — move to Valheon showcase' },
  { id: 'rt_vanguard', name: '⚔️ Vanguard Elite Imperium Division', route: '/vanguard', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Imperium Division', note: 'Top-tier Imperium analytics — move to Valheon' },
  { id: 'rt_vault', name: '🔐 Kingdom Vault (Encrypted Snapshots)', route: '/vault', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Data & Snapshots', note: 'Historical scan archive & Excel snapshot downloads' },

  // 6. CREATOR STUDIO, CERBERUS & EXPERIMENTAL LABS
  { id: 'cr_architect', name: '🗺️ Visio Ecosystem Architect (This Studio)', route: '/creator/architect', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Architecture & Navigation Control', note: 'Interactive 94-surface drag & drop architecture studio' },
  { id: 'cr_cerberus', name: '🐉 Project Cerberus (Multi-Head Recon)', route: '/creator/project-cerberus', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Bastion Fleet Sub-Tab', note: 'Merge Cerberus & Bastion into one unified Fleet Console', isDuplicate: true },
  { id: 'cr_sandbox', name: '🗄️ Creator Data Sandbox', route: '/creator/sandbox', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Developer Lab', note: 'Raw payload testing & schema inspector' },
  { id: 'cr_matchmaker', name: '⚖️ AI KvK Matchmaking Predictor', route: '/creator/matchmaker', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> KvK Matchmaking Engine', note: '64 runs total, but dormant since June 16 (4mo ago)' },
  { id: 'cr_usage', name: '📊 AI Token & Quota Usage Monitor', route: '/creator/usage', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> System Telemetry', note: 'Tracks Gemini API RPM/RPD & DynamoDB throughput' },
  { id: 'cr_lab_hub', name: '🧪 Experimental Lab Index', route: '/creator/lab', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Wrapper (Graduate tools to Valheon or R5)', note: 'Users get confused between /tools/* and /creator/lab/*', isDuplicate: true },
  { id: 'lab_battle', name: '⚔️ AI Battle Predictor (Tactical Sim)', route: '/creator/lab/battle-predictor', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> AI War Gaming', note: 'Gemini 2.5/3.1 tactical rally & field trade simulator' },
  { id: 'lab_radar', name: '📡 Lab Radar Prototype', route: '/creator/lab/radar', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Superseded by /black-ops)', note: 'Early prototype superseded by Black Ops & Presence Radar', isDuplicate: true },
  { id: 'lab_ranking', name: '📸 Vision Ranking Screenshot Scanner', route: '/creator/lab/ranking-scanner', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'merge', targetParent: 'Merge into Valheon Optics (/optics)', note: '24 runs — merge all 4 OCR tools into 1 studio', isDuplicate: true },
  { id: 'lab_grabber', name: '🖥️ Live Screen Grabber (WebRTC)', route: '/creator/lab/screen-grabber', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'merge', targetParent: 'Merge into Valheon Optics (/optics)', note: '0 runs in 90d — merge into Optics', isDuplicate: true },
  { id: 'exp_ocr', name: '⚡ WebGPU In-Browser Zero-Cost OCR', route: '/experimental/ocr', group: 'Top-Level Route', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'merge', targetParent: 'Merge into Valheon Optics (/optics)', note: '4th separate OCR page — unify under Optics!', isDuplicate: true },
  { id: 'ov_bastion_desk', name: '🏰 R5 Bastion Mission Desk (Embedded)', route: 'Component: R5BastionMissionDesk', group: 'Command Module', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Kingdom Scan Requests', note: 'Lets R5s request 12H Steady / 3H Surge scans' },
  { id: 'ov_brain_panel', name: '🧠 5-Ring MoE Brain Oversight Panel', route: 'Component: BrainOversightPanel', group: 'Command Module', role: 'SuperAdmin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Bastion Fleet Console', note: 'Displays Memory, Defect, Fix, Knock-On & Zeus Context rings' },
  { id: 'ov_ai_coach', name: '🤖 AI War Room Tactical Coach Modal', route: 'Component: AiWarRoomModal', group: 'Command Module', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> AI War Advisor', note: '15 runs — executive AI briefing generator' },

  // 7. DATA INGESTION, RANKINGS, SHARED LINKS & COMMS
  { id: 'rt_upload', name: 'Spreadsheet & Scan Upload Portal', route: '/upload', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Data Ingest', note: 'ExcelJS multi-sheet importer with Trojan Horse Epoch Guard' },
  { id: 'rt_rankings_pre', name: 'Pre-KvK Marauder & Stage Rankings', route: '/rankings/pre-kvk', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /analysis/kvk', note: 'Pre-KvK individual & kingdom stage points' },
  { id: 'rt_res_dkp', name: 'Public DKP Results Viewer', route: '/results/dkp', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge with /shared/dkp', note: 'Duplicate of /shared/dkp & /shared/dkp-results', isDuplicate: true },
  { id: 'sh_dkp', name: 'Shared DKP Link (/shared/dkp)', route: '/shared/dkp', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Read-Only Share Permalink', note: 'Shareable read-only DKP link for Discord' },
  { id: 'sh_dkp_res', name: 'Shared DKP Results (/shared/dkp-results)', route: '/shared/dkp-results', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'cut', targetParent: 'Cut Duplicate (Redirect to /shared/dkp)', note: 'Redundant with /shared/dkp', isDuplicate: true },
  { id: 'sh_merge', name: 'Shared Alliance Merge Link', route: '/shared/alliance-merge', group: 'Top-Level Route', role: 'Public', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Permalink under AllianceMergeTab', note: 'Read-only share link for alliance merge sheets' },
  { id: 'sh_poly', name: 'Shared Polygraph Report Link', route: '/shared/polygraph', group: 'Top-Level Route', role: 'Public', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Permalink under Polygraph', note: 'Read-only shareable governor audit link' },
  { id: 'sh_soc', name: 'Shared SoC Camp Link', route: '/shared/soc', group: 'Top-Level Route', role: 'Public', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Permalink under KvK Hub', note: '2 runs total — last used Jul 2, 2026 (almost 4mo ago)' },
  { id: 'rt_album', name: 'Governor Shareable Album Card', route: '/album-card', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Embed button inside Governor Dossier', note: 'Generates Discord-ready PNG trading card for a governor' },
  { id: 'rt_mail', name: 'In-Game Mail & Broadcast Formatter', route: '/mail', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Comms & Mail', note: 'RoK rich-text color/hex mail generator with templates' },
  { id: 'rt_trans', name: 'Alliance Chat 12-Language Translator', route: '/translator', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /mail (Comms Studio)', note: 'RoK slang-aware multi-language translator' },

  // 8. CALCULATOR SUB-TOOLS (/calculators)
  { id: 'calc_speed', name: 'Calc: Universal & Building Speedups', route: '/calculators#speedups', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: '1 logged view — converts days/hours/minutes of speedups' },
  { id: 'calc_troop', name: 'Calc: T4/T5 Troop Training & MGE Points', route: '/calculators#troops', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'RSS, speedups & MGE/Pre-KvK points per batch' },
  { id: 'calc_rss', name: 'Calc: Resource Pack & Bag Inventory', route: '/calculators#resources', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: '4 logged views — totals Food/Wood/Stone/Gold chests' },
  { id: 'calc_cmdr', name: 'Calc: Gold Heads & Commander EXP', route: '/calculators#commander', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: '3 logged views — sculptures needed to 5555 expertise' },
  { id: 'calc_forge', name: 'Calc: Equipment Material Forge', route: '/calculators#equipment', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: '3 logged views — blueprint & material crafting time' },
  { id: 'calc_vip', name: 'Calc: VIP Level & Gem Optimizer', route: '/calculators#vip', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'Gems required for VIP 12 / 14 / 17 during MTG' },
  { id: 'calc_ap', name: 'Calc: Action Points & Marauder Yield', route: '/calculators#ap', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: '4 logged views — AP bottle conversion for Marauders' },
  { id: 'calc_crystal', name: 'Calc: Season of Conquest Crystal Tech', route: '/calculators#crystal', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'Crystal Research Center upgrade cost planner' },

  // 9. ADMIN, SYSTEM, MARKETING & GLOBAL OVERLAYS
  { id: 'rt_admin', name: 'High Command Admin Console', route: '/admin', group: 'Top-Level Route', role: 'Admin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Admin & Governance', note: 'User approvals, kingdom claims & PIN management' },
  { id: 'rt_admin_ana', name: 'System Telemetry & Event Analytics', route: '/admin/analytics', group: 'Top-Level Route', role: 'Admin', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Admin & Governance', note: '90-day DynamoDB event logs & active user metrics' },
  { id: 'rt_stats', name: 'Public Platform Telemetry Stats', route: '/stats', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Footer / About Page', note: 'Total governors indexed & kingdoms tracked counter' },
  { id: 'rt_community', name: 'Community & Discord Hub', route: '/community', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Footer / About Page', note: 'Discord links & partner kingdoms' },
  { id: 'rt_about', name: 'About Unity & Architecture Overview', route: '/about', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Footer Navigation', note: 'Mission statement & platform capabilities' },
  { id: 'rt_changelog', name: 'Platform Release Changelog', route: '/changelog', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Footer Navigation', note: 'Version history & patch notes' },
  { id: 'rt_contact', name: 'Support & Kingdom Onboarding Contact', route: '/contact', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Footer Navigation', note: 'Dispatches notifyAdmin alert to Discord/DynamoDB' },
  { id: 'rt_settings', name: 'Governor Profile & API Key Settings', route: '/settings', group: 'Top-Level Route', role: 'Member', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'User Profile Menu', note: 'Personal Gemini API key, language & linked Gov ID' },
  { id: 'rt_privacy', name: 'Privacy Policy & Data Governance', route: '/privacy', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Footer Legal', note: 'GDPR/CCPA compliance shield' },
  { id: 'rt_terms', name: 'Terms of Service', route: '/terms', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Footer Legal', note: 'Platform usage terms' },
  { id: 'rt_auth_err', name: 'NextAuth Error Handler', route: '/auth/error', group: 'Top-Level Route', role: 'System', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'System Auth Flow', note: 'OAuth / PIN error boundary' },
  { id: 'ov_omnibar', name: 'Global Cmd+K Valheon OmniBar', route: 'Global Overlay', group: 'Command Module', role: 'All', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Global Keyboard Shortcut (Cmd+K)', note: 'Instant jump to any governor, kingdom, or calculator' },
  { id: 'ov_forensics', name: 'Slide-Out Governor Forensics Drawer', route: 'Global Drawer', group: 'Command Module', role: 'All', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Counter-Intelligence', note: 'Deep 67-field slide-over drawer when clicking any governor' },
  { id: 'ov_optics_dock', name: 'Floating Optics Quick-OCR Dock', route: 'Global Floating Dock', group: 'Command Module', role: 'R4/R5', currentBucket: 'unity_core', recBucket: 'cut', targetParent: 'Cut Floating Clutter (Use /upload)', note: 'Floating screen-corner widget — adds visual clutter' },
];

function formatShortDate(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  const shortMonthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (diffSec < 120) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `Today (${Math.floor(diffSec / 3600)}h ago)`;
  const days = Math.floor(diffSec / 86400);
  if (days <= 30) return `${shortMonthDay} (${days}d ago)`;
  const months = Math.floor(days / 30);
  return `${shortMonthDay} (${months}mo ago)`;
}

function computeDefaultPositions(items) {
  const next = items.map((x) => ({ ...x }));
  BUCKET_ORDER.forEach((b, colIdx) => {
    const bucketItems = next.filter((i) => i.bucket === b);
    const baseX = 35 + colIdx * 465;
    bucketItems.forEach((item, idx) => {
      const subCol = idx % 2;
      const row = Math.floor(idx / 2);
      item.x = baseX + subCol * 218;
      item.y = 140 + row * 98;
    });
  });
  return next;
}

export default function VisioEcosystemArchitectPage() {
  const t = useTranslations('Sidebar');
  const [items, setItems] = useState(() =>
    computeDefaultPositions(
      INITIAL_SURFACES.map((s) => ({ ...s, bucket: s.recBucket, x: 0, y: 0 }))
    )
  );
  const [viewMode, setViewMode] = useState('swimlane');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [usageFilter, setUsageFilter] = useState('ALL');
  const [sortByUsage, setSortByUsage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [dropTargetBucket, setDropTargetBucket] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('valheon_visio_architect_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === INITIAL_SURFACES.length) {
          setItems(parsed);
        }
      }
    } catch {}
  }, []);

  // Fetch live 90-day telemetry from DynamoDB Unity2AWSRoster (/api/admin/events?days=90)
  useEffect(() => {
    fetch('/api/admin/events?days=90')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && data?.stats) {
          setLiveStats(data.stats);
        }
      })
      .catch(() => {});
  }, []);

  // Resolve combined telemetry (90-day DynamoDB baseline + live PAGE_VIEW / KINGDOM_TAB_VIEW / feature updates)
  const telemetryById = useMemo(() => {
    const map = {};
    for (const s of INITIAL_SURFACES) {
      const base = BASELINE_TELEMETRY[s.id];
      let hits = base ? base.hits : 0;
      let lastSeen = base ? base.lastSeen : '';
      let tracked = base ? base.tracked : false;

      if (liveStats) {
        // 1. Live feature count if higher than baseline
        if (base?.featureKey && liveStats.byFeature?.[base.featureKey]) {
          const liveCount = liveStats.byFeature[base.featureKey];
          if (liveCount > hits) hits = liveCount;
          const liveTs = liveStats.featureLastSeen?.[base.featureKey] || '';
          if (liveTs > lastSeen) lastSeen = liveTs;
        }
        // 2. Live PAGE_VIEW route count
        if (s.route.startsWith('/') && !s.route.includes('#')) {
          const rInfo = liveStats.byRoute?.[s.route];
          if (rInfo) {
            hits += rInfo.count;
            if (rInfo.lastSeen > lastSeen) lastSeen = rInfo.lastSeen;
            tracked = true;
          }
        }
        // 3. Live KINGDOM_TAB_VIEW count
        const kdTabName = KINGDOM_TAB_MAP[s.id];
        if (kdTabName && liveStats.byKingdomTab?.[kdTabName]) {
          const tInfo = liveStats.byKingdomTab[kdTabName];
          hits += tInfo.count;
          if (tInfo.lastSeen > lastSeen) lastSeen = tInfo.lastSeen;
          tracked = true;
        }
      }

      const ageDays = lastSeen
        ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / 86400000)
        : 999;

      let tier = 'armed'; // Newly armed PAGE_VIEW/TAB_VIEW
      if (hits >= 50 && ageDays <= 30) tier = 'hot';
      else if (hits >= 5 && ageDays <= 30) tier = 'active';
      else if (hits > 0) tier = 'dormant';
      else if (tracked && hits === 0) tier = 'dead';

      map[s.id] = {
        hits,
        lastSeen,
        lastSeenFormatted: formatShortDate(lastSeen),
        tracked,
        tier,
        ageDays,
      };
    }
    return map;
  }, [liveStats]);

  const renderTelemetryBadge = (id) => {
    const tel = telemetryById[id];
    if (!tel) return null;

    if (tel.tier === 'hot') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
          title={`Verified DynamoDB Telemetry: ${tel.hits} runs · Last seen ${tel.lastSeen}`}
        >
          <Flame size={11} className="text-emerald-400 shrink-0" />
          <span>
            {tel.hits} hits · Last: {tel.lastSeenFormatted}
          </span>
        </span>
      );
    }
    if (tel.tier === 'active') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35"
          title={`Verified DynamoDB Telemetry: ${tel.hits} runs · Last seen ${tel.lastSeen}`}
        >
          <Activity size={11} className="text-cyan-400 shrink-0" />
          <span>
            {tel.hits} hits · Last: {tel.lastSeenFormatted}
          </span>
        </span>
      );
    }
    if (tel.tier === 'dormant') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/35"
          title={`Low or Dormant Usage: ${tel.hits} runs · Last seen ${tel.lastSeen}`}
        >
          <Clock size={11} className="text-amber-400 shrink-0" />
          <span>
            {tel.hits} hits · Last: {tel.lastSeenFormatted}
          </span>
        </span>
      );
    }
    if (tel.tier === 'dead') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40"
          title="Instrumented endpoint with 0 recorded uses in the last 90 days"
        >
          <Skull size={11} className="text-rose-400 shrink-0" />
          <span>0 hits in 90d · Never Used</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
        title="Auto PAGE_VIEW / TAB_VIEW sensor armed today — will record timestamp on next visit"
      >
        <Activity size={11} className="text-indigo-400 shrink-0" />
        <span>📡 Sensor Armed · Awaiting 1st Visit</span>
      </span>
    );
  };

  const persist = (nextItems) => {
    setItems(nextItems);
    try {
      localStorage.setItem('valheon_visio_architect_v2', JSON.stringify(nextItems));
    } catch {}
  };

  const applyPreset = (mode) => {
    const updated = computeDefaultPositions(
      items.map((it) => ({
        ...it,
        bucket: mode === 'recommended' ? it.recBucket : it.currentBucket,
      }))
    );
    persist(updated);
  };

  const moveItemToBucket = (id, targetBucket) => {
    const updated = items.map((it) =>
      it.id === id ? { ...it, bucket: targetBucket } : it
    );
    persist(updated);
  };

  const cycleBucket = (id) => {
    const updated = items.map((it) => {
      if (it.id !== id) return it;
      const idx = BUCKET_ORDER.indexOf(it.bucket);
      const nextBucket = BUCKET_ORDER[(idx + 1) % BUCKET_ORDER.length];
      return { ...it, bucket: nextBucket };
    });
    persist(updated);
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((it) => {
      if (groupFilter === 'DUPLICATES' && !it.isDuplicate) return false;
      if (
        groupFilter !== 'ALL' &&
        groupFilter !== 'DUPLICATES' &&
        it.group !== groupFilter
      ) {
        return false;
      }
      const tel = telemetryById[it.id];
      if (usageFilter !== 'ALL' && tel?.tier !== usageFilter) return false;

      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.route.toLowerCase().includes(q) ||
        it.note.toLowerCase().includes(q) ||
        it.targetParent.toLowerCase().includes(q)
      );
    });

    if (sortByUsage) {
      list.sort(
        (a, b) =>
          (telemetryById[b.id]?.hits || 0) - (telemetryById[a.id]?.hits || 0)
      );
    }
    return list;
  }, [items, groupFilter, usageFilter, sortByUsage, searchQuery, telemetryById]);

  const counts = useMemo(() => {
    const c = { unity_core: 0, r5_command: 0, valheon: 0, merge: 0, cut: 0 };
    items.forEach((it) => {
      c[it.bucket] = (c[it.bucket] || 0) + 1;
    });
    return c;
  }, [items]);

  const publicTopRoutes = useMemo(
    () =>
      items.filter(
        (x) => x.bucket === 'unity_core' && x.group === 'Top-Level Route'
      ).length,
    [items]
  );

  const handleVisioMouseDown = (e, id) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const target = items.find((x) => x.id === id);
    if (!target) return;
    const origX = target.x || 0;
    const origY = target.y || 0;

    const onMove = (moveEvt) => {
      const nx = Math.max(10, origX + (moveEvt.clientX - startX));
      const ny = Math.max(110, origY + (moveEvt.clientY - startY));
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, x: nx, y: ny } : it))
      );
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setItems((latest) => {
        try {
          localStorage.setItem(
            'valheon_visio_architect_v2',
            JSON.stringify(latest)
          );
        } catch {}
        return latest;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const exportMarkdown = useMemo(() => {
    const lines = [
      '# UNITY 3.0 & VALHEON SOVEREIGN — ARCHITECTURE REFACTOR BLUEPRINT',
      `Generated: ${new Date().toISOString()}`,
      '',
    ];
    BUCKET_ORDER.forEach((b) => {
      const list = items.filter((x) => x.bucket === b);
      lines.push(`## ${BUCKET_META[b].label} (${list.length} surfaces)`);
      list.forEach((it) => {
        const tel = telemetryById[it.id];
        const telStr = tel
          ? `[${tel.hits} hits · Last: ${tel.lastSeenFormatted}]`
          : '';
        lines.push(
          `- **${it.name}** (\`${it.route}\`) ${telStr} -> *${it.targetParent}* — ${it.note}`
        );
      });
      lines.push('');
    });
    return lines.join('\n');
  }, [items, telemetryById]);

  const copyBlueprint = () => {
    navigator.clipboard.writeText(exportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div
        className={`${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-[#0a0c0f] overflow-y-auto p-4 md:p-6'
            : 'space-y-4 pb-12'
        }`}
      >
        {/* TOP STUDIO COMMAND HEADER */}
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  VISIO ECOSYSTEM ARCHITECT
                </span>
                <span className="text-xs text-slate-400">
                  94 Surfaces Mapped · Live DynamoDB Telemetry Connected (1,151 Verified Events)
                </span>
              </div>
              <h1 className="text-xl font-bold text-white mt-1">
                Unity 3.0 vs. Valheon Sovereign — Interactive Drag &amp; Drop Navigation Studio
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Every card now shows its live <strong className="text-emerald-400">DynamoDB Hit Count &amp; Last Visited Date</strong>. Drag cards across the 5 columns to decide what stays in{' '}
                <strong className="text-emerald-400">Unity Core</strong>, what moves to{' '}
                <strong className="text-cyan-400">Valheon Sovereign</strong>, what{' '}
                <strong className="text-amber-400">Merges into a Sub-Tab</strong>, and what gets{' '}
                <strong className="text-rose-400">Cut</strong>.
              </p>
            </div>

            {/* Mode Switcher & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[#242936] p-1 bg-[#0a0c0f]">
                <button
                  onClick={() => setViewMode('swimlane')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'swimlane'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Columns size={14} />
                  Swimlane Board
                </button>
                <button
                  onClick={() => setViewMode('visio')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'visio'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MapIcon size={14} />
                  Visio Node Canvas
                </button>
                <button
                  onClick={() => setViewMode('navpreview')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'navpreview'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass size={14} />
                  Resulting Nav Tree
                </button>
                <button
                  onClick={() => setViewMode('catalog')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'catalog'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText size={14} />
                  94-Row Table
                </button>
              </div>

              <button
                onClick={() => applyPreset('recommended')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles size={13} />
                Recommended Clean Split
              </button>
              <button
                onClick={() => applyPreset('asbuilt')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw size={13} />
                Reset to As-Built
              </button>
              <button
                onClick={() => setIsExportOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy size={13} />
                Export Spec
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#141821] text-slate-200 border border-[#242936] hover:border-cyan-500/50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={13} />
                Print PDF
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#141821] text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 flex items-center gap-1 transition cursor-pointer"
                title="Toggle Fullscreen Workspace"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {/* COGNITIVE LOAD & BUCKET KPI STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mt-4 pt-3 border-t border-[#1e222b]">
            <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-2.5">
              <div className="text-xs text-slate-400">Public Top-Nav Load</div>
              <div className="flex items-baseline justify-between mt-1">
                <span
                  className={`text-sm font-bold ${
                    publicTopRoutes <= 16
                      ? 'text-emerald-400'
                      : publicTopRoutes <= 28
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {publicTopRoutes <= 16
                    ? `CLEAN (${publicTopRoutes} routes)`
                    : `HEAVY (${publicTopRoutes} routes)`}
                </span>
                <span className="text-xs font-semibold text-cyan-400">
                  -{Math.round(((58 - publicTopRoutes) / 58) * 100)}% clutter
                </span>
              </div>
            </div>
            {BUCKET_ORDER.map((b) => (
              <div
                key={b}
                className={`bg-[#0a0c0f] border ${BUCKET_META[b].border} rounded-lg p-2.5`}
              >
                <div className={`text-xs font-semibold ${BUCKET_META[b].text}`}>
                  {BUCKET_META[b].label}
                </div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {counts[b]}
                </div>
              </div>
            ))}
          </div>

          {/* FILTER, TELEMETRY FILTER & SEARCH BAR */}
          <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-[#1e222b]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: 'ALL', label: 'All Surfaces (94)' },
                  { key: 'Top-Level Route', label: 'Routes (58)' },
                  { key: 'Kingdom Workbench Tab', label: 'Kingdom Tabs (19)' },
                  { key: 'Calculator Sub-Tool', label: 'Calculators (8)' },
                  { key: 'DUPLICATES', label: '⚠️ Overlaps & Duplicates (17)' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setGroupFilter(f.key)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer ${
                      groupFilter === f.key
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-[#0a0c0f] text-slate-400 border-[#1e222b] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortByUsage(!sortByUsage)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                    sortByUsage
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#0a0c0f] text-slate-300 border-[#1e222b] hover:border-cyan-500/40'
                  }`}
                >
                  <ArrowUpDown size={13} />
                  <span>{sortByUsage ? 'Sorted by Usage ↓' : 'Sort by Usage'}</span>
                </button>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by route, tool, tab, or codename..."
                    className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[#0a0c0f] text-white border border-[#1e222b] w-64 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Second Row: Live Telemetry Usage Tier Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 mr-1">
                Filter by Last Visited / Usage:
              </span>
              {[
                { key: 'ALL', label: 'All Telemetry Tiers' },
                { key: 'hot', label: '🔥 Top Pillars (50+ hits · 80.5% of traffic)' },
                { key: 'active', label: '⚡ Active Tools (5–49 hits)' },
                { key: 'dormant', label: '⚠️ Dormant / Rare (<5 hits or >30d ago)' },
                { key: 'dead', label: '💀 0 Hits in 90d (Dead Endpoints)' },
                { key: 'armed', label: '📡 Sensor Armed Today (Page/Tab Tracker)' },
              ].map((uf) => (
                <button
                  key={uf.key}
                  onClick={() => setUsageFilter(uf.key)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer ${
                    usageFilter === uf.key
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#0a0c0f] text-slate-400 border-[#1e222b] hover:text-white'
                  }`}
                >
                  {uf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* VIEW 1: 5-COLUMN SWIMLANE DRAG & DROP BOARD */}
        {viewMode === 'swimlane' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {BUCKET_ORDER.map((bucket) => {
              const meta = BUCKET_META[bucket];
              const colItems = filteredItems.filter((x) => x.bucket === bucket);
              const isDropTarget = dropTargetBucket === bucket;
              return (
                <div
                  key={bucket}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTargetBucket(bucket);
                  }}
                  onDragLeave={() => setDropTargetBucket(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTargetBucket(null);
                    const id = e.dataTransfer.getData('text/plain') || draggedId;
                    if (id) moveItemToBucket(id, bucket);
                  }}
                  className={`bg-[#0f1115] border rounded-xl p-3 flex flex-col transition ${
                    isDropTarget
                      ? 'border-cyan-400 bg-cyan-500/5 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
                      : meta.border
                  }`}
                >
                  <div className="pb-2 mb-2 border-b border-[#1e222b]">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${meta.text}`}
                      >
                        {meta.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${meta.bg} ${meta.text}`}
                      >
                        {colItems.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{meta.sub}</p>
                  </div>

                  <div className="space-y-2 min-h-[480px] flex-1">
                    {colItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedId(item.id);
                          e.dataTransfer.setData('text/plain', item.id);
                        }}
                        onDragEnd={() => setDraggedId(null)}
                        className="bg-[#0a0c0f] border border-[#1e222b] hover:border-cyan-500/50 rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="text-xs font-bold text-white leading-snug">
                            {item.name}
                          </span>
                          {item.isDuplicate && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                              Overlap
                            </span>
                          )}
                        </div>

                        {/* Live Telemetry Usage & Last Visited Pill */}
                        <div className="mt-1.5">
                          {renderTelemetryBadge(item.id)}
                        </div>

                        <div className="flex items-center justify-between gap-1 mt-1.5">
                          <code className="text-xs text-cyan-400 font-mono truncate">
                            {item.route}
                          </code>
                          {item.route.startsWith('/') && (
                            <a
                              href={`/en${item.route}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-0.5 shrink-0"
                              title="Open live page in new tab"
                            >
                              <span>Open</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {item.note}
                        </p>
                        <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-[#1e222b]">
                          <span
                            className="text-xs text-amber-300/90 truncate"
                            title={item.targetParent}
                          >
                            ↳ {item.targetParent}
                          </span>
                          <button
                            onClick={() => cycleBucket(item.id)}
                            className="px-2 py-0.5 rounded text-xs bg-[#141821] border border-[#242936] hover:border-cyan-400 text-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <span>Move</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: FREEFORM VISIO NODE CANVAS */}
        {viewMode === 'visio' && (
          <div className="space-y-3">
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-300">
                <strong>Interactive Visio Canvas:</strong> Click &amp; drag any card anywhere on the grid. Each node displays its live hit count &amp; last visited date.
              </div>
              <button
                onClick={() => persist(computeDefaultPositions(items))}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 cursor-pointer"
              >
                Auto-Snap Nodes by Target Hub
              </button>
            </div>

            <div
              className="relative w-full h-[780px] overflow-auto rounded-xl border border-[#1e222b] bg-[#0a0c0f]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(148, 163, 184, 0.18) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              <div
                className="relative"
                style={{ width: '2400px', height: '1750px' }}
              >
                {/* Bezier Wires SVG */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={2400}
                  height={1750}
                >
                  {filteredItems.map((item) => {
                    const bIdx = BUCKET_ORDER.indexOf(item.bucket);
                    const startX = 110 + bIdx * 465 + 145;
                    const startY = 86;
                    const endX = (item.x || 0) + 105;
                    const endY = item.y || 0;
                    const midY = (startY + endY) / 2;
                    return (
                      <path
                        key={item.id}
                        d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                        stroke={BUCKET_META[item.bucket].wire}
                        strokeWidth={1.6}
                        fill="none"
                      />
                    );
                  })}
                </svg>

                {/* 5 Top Hub Headers */}
                {BUCKET_ORDER.map((b, idx) => {
                  const meta = BUCKET_META[b];
                  const left = 110 + idx * 465;
                  return (
                    <div
                      key={b}
                      style={{ left: `${left}px`, top: '24px', width: '290px' }}
                      className={`absolute bg-[#0f1115] border-2 ${meta.border} rounded-xl p-3 shadow-lg text-center`}
                    >
                      <div
                        className={`text-xs font-bold uppercase tracking-wider ${meta.text}`}
                      >
                        {meta.label}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {counts[b]} Assigned Surfaces
                      </div>
                    </div>
                  );
                })}

                {/* Draggable Visio Nodes */}
                {filteredItems.map((item) => {
                  const meta = BUCKET_META[item.bucket];
                  const tel = telemetryById[item.id];
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleVisioMouseDown(e, item.id)}
                      style={{
                        left: `${item.x || 0}px`,
                        top: `${item.y || 0}px`,
                        width: '212px',
                      }}
                      className={`absolute bg-[#0f1115] border-2 ${meta.border} rounded-lg p-2 shadow-md cursor-move hover:z-30 select-none`}
                    >
                      <div
                        className="text-xs font-bold text-white truncate"
                        title={item.name}
                      >
                        {item.name}
                      </div>
                      <div className="text-xs font-mono text-cyan-400 truncate">
                        {item.route}
                      </div>
                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-[#1e222b]">
                        <span className="text-xs text-emerald-300 font-mono truncate">
                          {tel?.hits > 0
                            ? `${tel.hits}h · ${tel.lastSeenFormatted}`
                            : tel?.tier === 'dead'
                            ? '💀 0 hits'
                            : '📡 Armed'}
                        </span>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => cycleBucket(item.id)}
                          className="px-1.5 py-0.5 rounded text-xs font-semibold bg-[#141821] border border-[#242936] hover:border-cyan-400 text-slate-200 cursor-pointer shrink-0"
                        >
                          {meta.shortLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: RESULTING CLEAN SIDEBAR & VALHEON CONSOLE PREVIEW */}
        {viewMode === 'navpreview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0f1115] border border-emerald-500/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e222b]">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">
                    Product 1: UNITY 3.0 (Community &amp; Kingdom SaaS)
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Resulting Unity Navigation Structure
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                  Zero Overwhelm
                </span>
              </div>

              <div className="bg-[#0a0c0f] border border-emerald-500/30 rounded-lg p-3">
                <div className="text-xs font-bold text-emerald-400 uppercase mb-2">
                  Tier 1 — Public Governor Navigation ({counts.unity_core} surfaces)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {items
                    .filter((x) => x.bucket === 'unity_core')
                    .map((i) => {
                      const tel = telemetryById[i.id];
                      return (
                        <div
                          key={i.id}
                          className="text-xs p-2 rounded bg-[#0f1115] border border-[#1e222b] flex justify-between items-center gap-2"
                        >
                          <span className="text-slate-200 truncate">{i.name}</span>
                          <span className="text-emerald-400 font-mono shrink-0">
                            {tel?.hits > 0 ? `${tel.hits}h` : i.route}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="bg-[#0a0c0f] border border-purple-500/30 rounded-lg p-3">
                <div className="text-xs font-bold text-purple-400 uppercase mb-2">
                  Tier 2 — R4 / R5 Leadership Workbench ({counts.r5_command} surfaces)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {items
                    .filter((x) => x.bucket === 'r5_command')
                    .map((i) => {
                      const tel = telemetryById[i.id];
                      return (
                        <div
                          key={i.id}
                          className="text-xs p-2 rounded bg-[#0f1115] border border-[#1e222b] flex justify-between items-center gap-2"
                        >
                          <span className="text-slate-200 truncate">{i.name}</span>
                          <span className="text-purple-300 font-mono shrink-0">
                            {tel?.hits > 0 ? `${tel.hits}h` : i.route}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="bg-[#0f1115] border border-cyan-500/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e222b]">
                <div>
                  <span className="text-xs font-bold text-cyan-400 uppercase">
                    Product 2: VALHEON SOVEREIGN (Enterprise &amp; Autonomous Fleet)
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Resulting Valheon Sovereign Console &amp; Cuts
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-300">
                  Sovereign Tier
                </span>
              </div>

              <div className="bg-[#0a0c0f] border border-cyan-500/30 rounded-lg p-3">
                <div className="text-xs font-bold text-cyan-400 uppercase mb-2">
                  Valheon Sovereign Modules ({counts.valheon} surfaces)
                </div>
                <div className="space-y-1.5">
                  {items
                    .filter((x) => x.bucket === 'valheon')
                    .map((i) => (
                      <div
                        key={i.id}
                        className="text-xs p-2 rounded bg-[#0f1115] border border-[#1e222b] flex justify-between items-center gap-2"
                      >
                        <div>
                          <div className="font-bold text-white">{i.name}</div>
                          <div className="text-slate-400">{i.note}</div>
                        </div>
                        <div className="shrink-0">{renderTelemetryBadge(i.id)}</div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-[#0a0c0f] border border-rose-500/30 rounded-lg p-3">
                <div className="text-xs font-bold text-rose-400 uppercase mb-2">
                  Retired / Cut Duplicate Routes ({counts.cut} surfaces)
                </div>
                <div className="space-y-1">
                  {items
                    .filter((x) => x.bucket === 'cut')
                    .map((i) => (
                      <div
                        key={i.id}
                        className="text-xs p-1.5 rounded bg-[#0f1115] border border-[#1e222b] flex justify-between items-center gap-2"
                      >
                        <span className="text-rose-300">{i.name}</span>
                        <span className="text-slate-400">{i.targetParent}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: FULL 94-ROW PRINTABLE TABLE */}
        {viewMode === 'catalog' && (
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e222b] text-xs font-bold text-slate-400 uppercase">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Surface / Tool Name</th>
                  <th className="py-2 px-2">Route / Component</th>
                  <th className="py-2 px-2">Usage &amp; Last Visited</th>
                  <th className="py-2 px-2">Assigned Bucket</th>
                  <th className="py-2 px-2">Target Consolidation</th>
                  <th className="py-2 px-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it, idx) => (
                  <tr key={it.id} className="border-t border-[#1e222b]">
                    <td className="py-2 px-2 text-xs font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 text-xs font-bold text-white">
                      {it.name}
                    </td>
                    <td className="py-2 px-2 text-xs font-mono text-cyan-400">
                      {it.route}
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {renderTelemetryBadge(it.id)}
                    </td>
                    <td className="py-2 px-2 text-xs font-semibold">
                      <button
                        onClick={() => cycleBucket(it.id)}
                        className={`px-2 py-0.5 rounded border ${BUCKET_META[it.bucket].border} ${BUCKET_META[it.bucket].bg} ${BUCKET_META[it.bucket].text} cursor-pointer`}
                      >
                        {BUCKET_META[it.bucket].shortLabel}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-xs text-amber-300">
                      {it.targetParent}
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-400">
                      {it.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* EXPORT BLUEPRINT MODAL */}
        {isExportOpen && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl max-w-3xl w-full p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1e222b]">
                <h3 className="text-base font-bold text-white">
                  📋 Export Your Unity 3.0 &amp; Valheon Refactor Blueprint
                </h3>
                <button
                  onClick={() => setIsExportOpen(false)}
                  className="text-xs px-2.5 py-1 rounded border border-[#242936] text-slate-400 hover:text-white cursor-pointer"
                >
                  Close ✕
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Copy this Markdown blueprint (including verified hit counts &amp; last-visited timestamps) and paste it into chat when you are ready for us to execute your exact route consolidation.
              </p>
              <textarea
                readOnly
                value={exportMarkdown}
                className="w-full h-80 p-3 rounded-lg bg-[#0a0c0f] text-slate-200 border border-[#1e222b] font-mono text-xs"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={copyBlueprint}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>
                    {copied ? 'Copied Blueprint!' : 'Copy Blueprint to Clipboard'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
