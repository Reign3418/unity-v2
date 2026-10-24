'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslations } from 'next-intl';
import {
  Map as MapIcon,
  Columns,
  Compass,
  FileText,
  Sparkles,
  RotateCcw,
  Copy,
  Printer,
  Search,
  ExternalLink,
  Maximize2,
  Minimize2,
  Check,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

const BUCKET_META = {
  unity_core: {
    id: 'unity_core',
    label: '🟢 1. Unity 3.0 Core',
    shortLabel: '🟢 Unity Core',
    sub: 'Public & Governor Daily Driver. Fast, intuitive, zero overwhelm.',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    wire: 'rgba(16, 185, 129, 0.35)',
  },
  r5_command: {
    id: 'r5_command',
    label: '🟣 2. R4 / R5 Suite',
    shortLabel: '🟣 R4/R5 Suite',
    sub: 'Kingdom Leadership Workbench: DKP, MGE, KvK Prep, Recruiting CRM.',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    wire: 'rgba(168, 85, 247, 0.35)',
  },
  valheon: {
    id: 'valheon',
    label: '🔵 3. Move to Valheon',
    shortLabel: '🔵 Valheon',
    sub: 'Sovereign Intel & AI Fleet: Bastion Bots, Zeus, UDID Alt Graph, Sleep Radar.',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    wire: 'rgba(6, 182, 212, 0.35)',
  },
  merge: {
    id: 'merge',
    label: '🟡 4. Merge Into Tab',
    shortLabel: '🟡 Merge',
    sub: 'Remove from top nav & embed inside a parent hub so users are not flooded.',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    wire: 'rgba(245, 158, 11, 0.32)',
  },
  cut: {
    id: 'cut',
    label: '🔴 5. Cut / Take Out',
    shortLabel: '🔴 Cut',
    sub: 'Duplicate /creator/lab/* routes, legacy views, or noise to retire.',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    wire: 'rgba(244, 63, 94, 0.28)',
  },
};

const BUCKET_ORDER = ['unity_core', 'r5_command', 'valheon', 'merge', 'cut'];

const INITIAL_SURFACES = [
  // 1. CORE PUBLIC & NAVIGATION PAGES
  { id: 'rt_home', name: 'Landing & Global Topography', route: '/', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav', note: 'Main entry portal & 3D topography hero' },
  { id: 'rt_global', name: 'Global Kingdom Directory', route: '/analysis/global', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> Kingdoms', note: 'Continent directory, power tiers & seed rankings' },
  { id: 'rt_kd_wb', name: 'Kingdom Workbench (Master Hub)', route: '/analysis/kingdom', group: 'Top-Level Route', role: 'Public / R5', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> Kingdom', note: 'Core Kingdom Analytics Hub (currently holds 19 tabs)' },
  { id: 'rt_kvk', name: 'KvK Matchup & Theater Analytics', route: '/analysis/kvk', group: 'Top-Level Route', role: 'Public / R5', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> KvK Hub', note: 'KvK camp comparison & matchmaking analytics' },
  { id: 'rt_calcs', name: 'RoK Calculator Suite (8-in-1)', route: '/calculators', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> Calculators', note: 'Speedups, Troops, RSS, EXP, Forge, VIP, AP, Crystal' },
  { id: 'rt_guide', name: 'Commander & Equipment Guides', route: '/guide', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> Academy', note: '95 scrubbed RoK guides, CH upgrade & beginner playbooks' },
  { id: 'rt_events', name: 'Global RoK Event Calendar', route: '/events', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> Events', note: 'MGE, Wheel of Fortune, Egg/Hammer & KvK timers' },
  { id: 'rt_recruiting', name: 'Global Migration & Recruiting Board', route: '/analysis/global/recruiting', group: 'Top-Level Route', role: 'Public / R5', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> Migration', note: 'Public recruitment marketplace & kingdom ads' },

  // 2. KINGDOM WORKBENCH 19 SUB-TABS
  { id: 'tab_overview', name: 'Tab: Kingdom Overview & Vital Signs', route: '/analysis/kingdom#overview', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Kingdom Hub -> Overview', note: 'High-level KPIs, power distribution & top alliances' },
  { id: 'tab_trajectory', name: 'Tab: Chronological Power Trajectory', route: '/analysis/kingdom#analysis', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Kingdom Hub -> Overview', note: '3H Surge / 12H Steady historical power & KP chart' },
  { id: 'tab_roster', name: 'Tab: 67-Field Governor Roster', route: '/analysis/kingdom#roster', group: 'Kingdom Workbench Tab', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Kingdom Hub -> Roster', note: 'Searchable governor table with deep stats' },
  { id: 'tab_compare', name: 'Tab: Snapshot Delta Comparison', route: '/analysis/kingdom#compare', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> DKP & Deltas', note: 'Start-scan vs. End-scan delta engine' },
  { id: 'tab_results', name: 'Tab: KvK DKP Leaderboard & Grades', route: '/analysis/kingdom#results', group: 'Kingdom Workbench Tab', role: 'Public / R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> DKP & Deltas', note: 'Scored DKP rankings, kill/dead goals & exports' },
  { id: 'tab_growth', name: 'Tab: Governor Growth Velocity', route: '/analysis/kingdom#growth', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into Overview / Roster Tab', note: 'Power & KP growth curves over time' },
  { id: 'tab_scatter', name: 'Tab: Power vs. KP Scatter Matrix', route: '/analysis/kingdom#scatter', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into Overview Tab', note: 'Visual outlier scatter plot' },
  { id: 'tab_t5', name: 'Tab: T4/T5 Troop Readiness Tracker', route: '/analysis/kingdom#t5-tracker', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> War Prep', note: 'Tracks T5 unlocks & troop power depth' },
  { id: 'tab_mge', name: 'Tab: MGE Allocation Planner', route: '/analysis/kingdom#mge', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> MGE & Governance', note: 'Mightiest Governor sculpture cap & rank assignments' },
  { id: 'tab_duel', name: 'Tab: Alliance Duel / Showdown', route: '/analysis/kingdom#duel', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into R5 War Prep', note: 'Alliance vs. Alliance head-to-head comparison' },
  { id: 'tab_merge', name: 'Tab: Alliance & Camp Merger Optimizer', route: '/analysis/kingdom#alliance-merge', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> War Prep', note: '155-slot KvK alliance roster optimizer' },
  { id: 'tab_team', name: 'Tab: Ark of Osiris Squad Builder', route: '/analysis/kingdom#team-builder', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> AoO & Events', note: 'Top/Mid/Bot lane assignment & time-zone matcher' },
  { id: 'tab_fort', name: 'Tab: Barbarian Fort & Rally Tracker', route: '/analysis/kingdom#fort-tracker', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into Roster Activity Column', note: 'Rallies led vs. rallies joined activity audit' },
  { id: 'tab_warroom', name: 'Tab: Live KvK War Room', route: '/analysis/kingdom#war-room', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> War Room', note: 'Tactical KvK zone status & coalition timers' },
  { id: 'tab_map', name: 'Tab: Interactive Kingdom Castle Map', route: '/analysis/kingdom#map', group: 'Kingdom Workbench Tab', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Spatial Map Recon', note: 'Plots live X/Y Castle Pos coordinates from MuMu save' },
  { id: 'tab_radar', name: 'Tab: Presence & Sleep Window Radar', route: '/analysis/kingdom#presence-radar', group: 'Kingdom Workbench Tab', role: 'Sovereign', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> SIGINT & Sleep Radar', note: '24h UTC activity heatmap & 6h vulnerability window' },
  { id: 'tab_linker', name: 'Tab: UDID / Alt / Spy Graph Unmasker', route: '/analysis/kingdom#account-linker', group: 'Kingdom Workbench Tab', role: 'Sovereign', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Counter-Intelligence', note: 'Links mains, farms & spies via UDID / LilithUID / MD5' },
  { id: 'tab_soc', name: 'Tab: Season of Conquest Camp Hub', route: '/analysis/kingdom#soc', group: 'Kingdom Workbench Tab', role: 'Public / R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into KvK Hub (/analysis/kvk)', note: 'SoC camp allocation & crystal tech tracking' },
  { id: 'tab_config', name: 'Tab: DKP Algorithm & Weights Config', route: '/analysis/kingdom#config', group: 'Kingdom Workbench Tab', role: 'R5 Admin', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Settings', note: 'Custom T4/T5/Dead point formulas & thresholds' },

  // 3. SOVEREIGN & BASTION FLEET MODULES
  { id: 'rt_bastion', name: 'Bastion 5-Ring Command Center', route: '/bastion', group: 'Top-Level Route', role: 'Sovereign', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Bastion Fleet Ops', note: 'SIDEKICK MuMu fleet, Cadence Matrix (12H/3H) & Zeus Brain' },
  { id: 'comp_r5desk', name: 'R5 Bastion Mission Desk', route: '/bastion#mission-desk', group: 'Command Module', role: 'R5 / Sovereign', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Bastion Fleet Ops', note: '1-click 1000-rank scan & target locate dispatch' },
  { id: 'comp_brain', name: 'Zeus & 5-Ring Brain Oversight Panel', route: '/bastion#brain', group: 'Command Module', role: 'Sovereign', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Bastion Fleet Ops', note: 'Live Ring 1-5 telemetry, NUMNUM guard & lease status' },
  { id: 'rt_blackops', name: 'Black Ops Target Watchlist & Radar', route: '/black-ops', group: 'Top-Level Route', role: 'Sovereign', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Counter-Intelligence', note: 'Tracks name-changes, kingdom jumps & priority targets' },
  { id: 'rt_cerberus', name: 'Project Cerberus (3D Galaxy Intel)', route: '/creator/project-cerberus', group: 'Top-Level Route', role: 'Sovereign', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Cerberus Galaxy', note: '3D star-map of every governor & cross-kingdom cluster' },

  // 4. TACTICAL CODENAME ROUTES
  { id: 'rt_aegis', name: 'Aegis (Kingdom Defense Shield)', route: '/aegis', group: 'Top-Level Route', role: 'R5 / Sovereign', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into Valheon Counter-Intel', note: 'Duplicate codename surface — fold into Valheon' },
  { id: 'rt_nexus', name: 'Nexus (Coalition Diplomacy Hub)', route: '/nexus', group: 'Top-Level Route', role: 'R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into KvK Hub (/analysis/kvk)', note: 'Cross-kingdom coalition coordination — fold into KvK Hub' },
  { id: 'rt_optics', name: 'Optics (Visual OCR & Forensics)', route: '/optics', group: 'Top-Level Route', role: 'Public / R5', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into Single Scanner Hub', note: 'Overlap with /experimental/ocr & /tools/ranking-scanner' },
  { id: 'rt_theater', name: 'Theater (Global KvK Map View)', route: '/theater', group: 'Top-Level Route', role: 'Public / R5', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into KvK Hub (/analysis/kvk)', note: 'Overlap with /analysis/kvk — fold into KvK Hub' },
  { id: 'rt_vanguard', name: 'Vanguard (Rally & Garrison Readiness)', route: '/vanguard', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into R5 War Prep Tab', note: 'Rally lead & garrison audit — fold into R5 Suite' },
  { id: 'rt_vault', name: 'Vault (Field Guide Knowledge Base)', route: '/vault', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /guide (Single Academy)', note: 'Duplicate of /guide — combine into one Academy route', isDuplicate: true },
  { id: 'rt_whiteboard', name: 'Tactical Map Whiteboard', route: '/whiteboard', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge with /tools/map-planner', note: 'Overlap with /tools/map-planner — combine into 1 Map Planner', isDuplicate: true },

  // 5. STANDALONE /tools/* ROUTES
  { id: 'tl_gov_tel', name: 'Governor Deep Dossier Lookup', route: '/tools/governor-telemetry', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> Governor Search', note: 'Global player search by ID or name across all kingdoms' },
  { id: 'tl_polygraph', name: 'Governor Polygraph (Fraud & Padding)', route: '/tools/polygraph', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Fraud & Polygraph', note: 'Detects T1 duelers, farm killers & deadweight whales', isDuplicate: true },
  { id: 'tl_ghost', name: 'Ghost & Sleeper Migrant Hunter', route: '/tools/ghost-hunter', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Counter-Intelligence', note: 'Detects unannounced immigrants & sleeper infiltrators', isDuplicate: true },
  { id: 'tl_reseller', name: 'Account Buyer & RMT Reseller Hunter', route: '/tools/reseller-hunter', group: 'Top-Level Route', role: 'Sovereign', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Fraud & Polygraph', note: 'Flags sudden playstyle/timezone/name flips after RMT sale', isDuplicate: true },
  { id: 'tl_hitlist', name: 'Recruitment Hitlist Generator', route: '/tools/recruitment-hitlist', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Recruiting CRM', note: 'Auto-scores top migration targets from losing KvK kingdoms', isDuplicate: true },
  { id: 'tl_rollup', name: 'Multi-Kingdom Continent Rollup', route: '/tools/kingdom-rollup', group: 'Top-Level Route', role: 'Public / R5', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /analysis/global', note: 'Compares Imperium / A / B / C / D seed brackets', isDuplicate: true },
  { id: 'tl_acct_age', name: 'Governor ID Account Age Estimator', route: '/tools/account-age', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into Calculators / Dossier', note: 'Estimates account birth date & era from Governor ID' },
  { id: 'tl_map_plan', name: 'KvK Flag & Territory Map Planner', route: '/tools/map-planner', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> War Room', note: 'Interactive KvK zone & flag path planner', isDuplicate: true },
  { id: 'tl_peerless', name: 'Peerless Scholar Trivia Search', route: '/tools/peerless', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Unity Top Nav -> Academy', note: 'Instant search for Lyceum of Wisdom questions' },
  { id: 'tl_rank_scan', name: 'Video / Screenshot Ranking Scanner', route: '/tools/ranking-scanner', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Merge into /upload (Unified Ingest)', note: 'Overlap with /experimental/ocr & /optics', isDuplicate: true },
  { id: 'tl_tracker', name: 'Personal Governor Progress Tracker', route: '/tools/tracker', group: 'Top-Level Route', role: 'Member', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into Member Portal', note: 'Personal power/KP goal tracking' },
  { id: 'tl_hunter', name: 'Target Coordinate Hunter', route: '/tools/hunter', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'valheon', targetParent: 'Valheon -> Spatial Map Recon', note: 'Coordinate lookup & tile reconnaissance' },
  { id: 'rt_exp_ocr', name: 'Experimental WebGPU + Gemini OCR', route: '/experimental/ocr', group: 'Top-Level Route', role: 'Public / R5', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /upload (Unified Ingest)', note: 'Zero-cost browser OCR prototype — merge with /upload', isDuplicate: true },

  // 6. CREATOR LAB & R&D PROTOTYPES (/creator/*)
  { id: 'lab_hub', name: 'Creator R&D Lab Index', route: '/creator/lab', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> R&D Lab', note: 'Private staging ground for experimental engines' },
  { id: 'lab_anomaly', name: 'Lab: Multivariate Anomaly Detector', route: '/creator/lab/anomaly-detector', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Keep /tools/polygraph)', note: 'Duplicate of /tools/polygraph', isDuplicate: true },
  { id: 'lab_battle', name: 'Lab: AI Battle Predictor Engine', route: '/creator/lab/battle-predictor', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Tactical AI', note: 'Gemini 2.5/3.1 rally & open-field trade simulator' },
  { id: 'lab_ghost', name: 'Lab: Ghost Hunter Prototype', route: '/creator/lab/ghost-hunter', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Keep /tools/ghost-hunter)', note: 'Exact duplicate of /tools/ghost-hunter', isDuplicate: true },
  { id: 'lab_legends', name: 'Lab: Hall of Legends Archive', route: '/creator/lab/hall-of-legends', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'merge', targetParent: 'Merge into Global Directory', note: 'All-time top whales & KvK record holders' },
  { id: 'lab_rollup', name: 'Lab: Kingdom Rollup Prototype', route: '/creator/lab/kingdom-rollup', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Keep /analysis/global)', note: 'Exact duplicate of /tools/kingdom-rollup', isDuplicate: true },
  { id: 'lab_radar', name: 'Lab: Activity Radar Prototype', route: '/creator/lab/radar', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Keep PresenceRadarTab)', note: 'Duplicate of Kingdom Presence Radar tab', isDuplicate: true },
  { id: 'lab_hitlist', name: 'Lab: Recruitment Hitlist Prototype', route: '/creator/lab/recruitment-hitlist', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Keep Recruiting CRM)', note: 'Exact duplicate of /tools/recruitment-hitlist', isDuplicate: true },
  { id: 'lab_reseller', name: 'Lab: Reseller Hunter Prototype', route: '/creator/lab/reseller-hunter', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut Duplicate (Keep Valheon Fraud)', note: 'Exact duplicate of /tools/reseller-hunter', isDuplicate: true },
  { id: 'lab_spend', name: 'Lab: Whale Spending Signature Estimator', route: '/creator/lab/spending-signature', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Financial Forensics', note: 'Estimates VIP/gear/armament spend velocity ($)' },
  { id: 'lab_replay', name: 'Lab: KvK Timeline Replay Scrubber', route: '/creator/lab/timeline-replay', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'valheon', targetParent: 'Valheon -> Spatial Map Recon', note: 'Time-lapse playback of kingdom power & territory shifts' },
  { id: 'cr_area51', name: 'Creator: Area 51 Classified Sandbox', route: '/creator/area-51', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut / Fold into /bastion', note: 'Legacy experimental dashboard — superseded by /bastion', isDuplicate: true },
  { id: 'cr_match', name: 'Creator: KvK Matchmaker Simulator', route: '/creator/matchmaker', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'merge', targetParent: 'Merge into /analysis/kvk', note: 'Predicts KvK matchmaking pools by top-300 power' },
  { id: 'cr_sandbox', name: 'Creator: UI Component Sandbox', route: '/creator/sandbox', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'cut', targetParent: 'Cut from Production Nav', note: 'Internal dev test page' },
  { id: 'cr_usage', name: 'Creator: API & Quota Usage Monitor', route: '/creator/usage', group: 'Top-Level Route', role: 'Creator', currentBucket: 'valheon', recBucket: 'merge', targetParent: 'Merge into /admin/analytics', note: 'Gemini API & DynamoDB throughput monitor', isDuplicate: true },

  // 7. SHARED LINKS, RESULTS & MEMBER UTILITIES
  { id: 'rt_upload', name: 'Spreadsheet & Scan Upload Portal', route: '/upload', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Data Ingest', note: 'ExcelJS multi-sheet importer with Trojan Horse Epoch Guard' },
  { id: 'rt_rankings_pre', name: 'Pre-KvK Marauder & Stage Rankings', route: '/rankings/pre-kvk', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /analysis/kvk', note: 'Pre-KvK individual & kingdom stage points' },
  { id: 'rt_res_dkp', name: 'Public DKP Results Viewer', route: '/results/dkp', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge with /shared/dkp', note: 'Duplicate of /shared/dkp & /shared/dkp-results', isDuplicate: true },
  { id: 'sh_dkp', name: 'Shared DKP Link (/shared/dkp)', route: '/shared/dkp', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Read-Only Share Permalink', note: 'Shareable read-only DKP link for Discord' },
  { id: 'sh_dkp_res', name: 'Shared DKP Results (/shared/dkp-results)', route: '/shared/dkp-results', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'cut', targetParent: 'Cut Duplicate (Redirect to /shared/dkp)', note: 'Redundant with /shared/dkp', isDuplicate: true },
  { id: 'sh_merge', name: 'Shared Alliance Merge Link', route: '/shared/alliance-merge', group: 'Top-Level Route', role: 'Public', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Permalink under AllianceMergeTab', note: 'Read-only share link for alliance merge sheets' },
  { id: 'sh_poly', name: 'Shared Polygraph Report Link', route: '/shared/polygraph', group: 'Top-Level Route', role: 'Public', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Permalink under Polygraph', note: 'Read-only shareable governor audit link' },
  { id: 'sh_soc', name: 'Shared SoC Camp Link', route: '/shared/soc', group: 'Top-Level Route', role: 'Public', currentBucket: 'r5_command', recBucket: 'merge', targetParent: 'Permalink under KvK Hub', note: 'Read-only Season of Conquest camp link' },
  { id: 'rt_album', name: 'Governor Shareable Album Card', route: '/album-card', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Embed button inside Governor Dossier', note: 'Generates Discord-ready PNG trading card for a governor' },
  { id: 'rt_mail', name: 'In-Game Mail & Broadcast Formatter', route: '/mail', group: 'Top-Level Route', role: 'R4/R5', currentBucket: 'r5_command', recBucket: 'r5_command', targetParent: 'R5 Suite -> Comms & Mail', note: 'RoK rich-text color/hex mail generator with templates' },
  { id: 'rt_trans', name: 'Alliance Chat 12-Language Translator', route: '/translator', group: 'Top-Level Route', role: 'Public', currentBucket: 'unity_core', recBucket: 'merge', targetParent: 'Merge into /mail (Comms Studio)', note: 'RoK slang-aware multi-language translator' },

  // 8. CALCULATOR SUB-TOOLS (/calculators)
  { id: 'calc_speed', name: 'Calc: Universal & Building Speedups', route: '/calculators#speedups', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'Converts days/hours/minutes of speedups' },
  { id: 'calc_troop', name: 'Calc: T4/T5 Troop Training & MGE Points', route: '/calculators#troops', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'RSS, speedups & MGE/Pre-KvK points per batch' },
  { id: 'calc_rss', name: 'Calc: Resource Pack & Bag Inventory', route: '/calculators#resources', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'Totals Food/Wood/Stone/Gold chests in bag' },
  { id: 'calc_cmdr', name: 'Calc: Gold Heads & Commander EXP', route: '/calculators#commander', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'Sculptures & stars needed to 5555 expertise' },
  { id: 'calc_forge', name: 'Calc: Equipment Material Forge', route: '/calculators#equipment', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'Legendary blueprint & material crafting time' },
  { id: 'calc_vip', name: 'Calc: VIP Level & Gem Optimizer', route: '/calculators#vip', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'Gems required for VIP 12 / 14 / 17 during MTG' },
  { id: 'calc_ap', name: 'Calc: Action Points & Marauder Yield', route: '/calculators#ap', group: 'Calculator Sub-Tool', role: 'Public', currentBucket: 'unity_core', recBucket: 'unity_core', targetParent: 'Calculators Suite', note: 'AP bottle conversion for Pre-KvK Marauders' },
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

function computeDefaultPositions(items) {
  const next = items.map((x) => ({ ...x }));
  BUCKET_ORDER.forEach((b, colIdx) => {
    const bucketItems = next.filter((i) => i.bucket === b);
    const baseX = 35 + colIdx * 465;
    bucketItems.forEach((item, idx) => {
      const subCol = idx % 2;
      const row = Math.floor(idx / 2);
      item.x = baseX + subCol * 218;
      item.y = 140 + row * 94;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [dropTargetBucket, setDropTargetBucket] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
    return items.filter((it) => {
      if (groupFilter === 'DUPLICATES' && !it.isDuplicate) return false;
      if (
        groupFilter !== 'ALL' &&
        groupFilter !== 'DUPLICATES' &&
        it.group !== groupFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.route.toLowerCase().includes(q) ||
        it.note.toLowerCase().includes(q) ||
        it.targetParent.toLowerCase().includes(q)
      );
    });
  }, [items, groupFilter, searchQuery]);

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
        lines.push(
          `- **${it.name}** (\`${it.route}\`) -> *${it.targetParent}* — ${it.note}`
        );
      });
      lines.push('');
    });
    return lines.join('\n');
  }, [items]);

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
                  94 Total Surfaces Mapped (58 Routes · 19 Kingdom Tabs · 8 Calculators · 9 Command Modules)
                </span>
              </div>
              <h1 className="text-xl font-bold text-white mt-1">
                Unity 3.0 vs. Valheon Sovereign — Interactive Drag &amp; Drop Navigation Studio
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag cards across the 5 columns (or pan &amp; drag nodes on the Visio Canvas) to decide what stays in{' '}
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

          {/* FILTER & SEARCH BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[#1e222b]">
            <div className="flex flex-wrap items-center gap-2">
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
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-[#0a0c0f] text-white border border-[#1e222b] w-72 focus:outline-none focus:border-cyan-400"
              />
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
                        <div className="flex items-center justify-between gap-1 mt-1">
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
                <strong>Interactive Visio Canvas:</strong> Click &amp; drag any card anywhere on the grid. Click the bucket badge on any node to cycle its destination hub (`Unity Core` → `R4/R5 Suite` → `Valheon` → `Merge` → `Cut`).
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
                style={{ width: '2400px', height: '1650px' }}
              >
                {/* Bezier Wires SVG */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={2400}
                  height={1650}
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
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleVisioMouseDown(e, item.id)}
                      style={{
                        left: `${item.x || 0}px`,
                        top: `${item.y || 0}px`,
                        width: '210px',
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
                        <span className="text-xs text-slate-400 truncate">
                          {item.role}
                        </span>
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => cycleBucket(item.id)}
                          className="px-1.5 py-0.5 rounded text-xs font-semibold bg-[#141821] border border-[#242936] hover:border-cyan-400 text-slate-200 cursor-pointer"
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
                    .map((i) => (
                      <div
                        key={i.id}
                        className="text-xs p-2 rounded bg-[#0f1115] border border-[#1e222b] flex justify-between items-center gap-2"
                      >
                        <span className="text-slate-200 truncate">{i.name}</span>
                        <code className="text-cyan-400 font-mono shrink-0">
                          {i.route}
                        </code>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-[#0a0c0f] border border-purple-500/30 rounded-lg p-3">
                <div className="text-xs font-bold text-purple-400 uppercase mb-2">
                  Tier 2 — R4 / R5 Leadership Workbench ({counts.r5_command} surfaces)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {items
                    .filter((x) => x.bucket === 'r5_command')
                    .map((i) => (
                      <div
                        key={i.id}
                        className="text-xs p-2 rounded bg-[#0f1115] border border-[#1e222b] flex justify-between items-center gap-2"
                      >
                        <span className="text-slate-200 truncate">{i.name}</span>
                        <code className="text-purple-300 font-mono shrink-0">
                          {i.route}
                        </code>
                      </div>
                    ))}
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
                        <code className="text-cyan-400 font-mono shrink-0">
                          {i.route}
                        </code>
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
                  <th className="py-2 px-2">Type</th>
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
                    <td className="py-2 px-2 text-xs text-slate-400">
                      {it.group}
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
                Copy this Markdown blueprint and paste it into chat when you are ready for us to execute your exact route consolidation and Valheon split.
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
