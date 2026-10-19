'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import {
  Shield,
  Cpu,
  Zap,
  Activity,
  Bot,
  Play,
  Pause,
  RefreshCw,
  PlusCircle,
  ArrowRightLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Server,
  Clock,
  Layers,
  Globe,
  Terminal,
  Sliders,
  Eye,
  Compass,
  Database,
  Lock,
  X,
} from 'lucide-react';

const AGENT_DEFINITIONS = [
  {
    id: 'kent',
    name: 'KENT',
    icon: '📋',
    role: 'Unity Demand & API Traffic Watcher',
    ringKey: 'ring1_intelligence',
    cadence: 'Real-Time Hook',
    color: '#06b6d4',
    defaultModelType: 'SLM',
    output: 'unityApiCalls24h · Demand Surge Triggers → NULL',
    directive:
      'Hooks directly into Unity API routes (/api/aws/roster, /vanguard, /theater). Counts live user queries per kingdom. When a quiet 12h kingdom crosses the demand threshold (5+ hits), KENT alerts NULL to promote that kingdom into the 3h Surge Lane.',
  },
  {
    id: 'scout',
    name: 'SCOUT',
    icon: '🔭',
    role: 'Genesis Kingdom Watcher & 30m KP Probe',
    ringKey: 'ring1_intelligence',
    cadence: 'Every 30m',
    color: '#f472b6',
    defaultModelType: 'SLM',
    output: 'New Kingdom Spawn Alerts (#4203+) · Top-10 KP Surge Detection',
    directive:
      'Polls the Rise of Kingdoms Continent & Character Creation list every 30 minutes. The moment Lilith opens a brand-new kingdom (#4203+), SCOUT auto-triggers CIPHER to drop a Day-1 bot in, clear the tutorial, and capture the initial native governors (Genesis Birth Certificate) so future migrants and jumpers are permanently identifiable.',
  },
  {
    id: 'tank',
    name: 'TANK',
    icon: '🎯',
    role: 'Chief of Fleet Operations',
    ringKey: 'ring2_dispatch',
    cadence: 'Every 12h',
    color: '#818cf8',
    defaultModelType: 'LLM',
    output: '12h Steady-State Master Schedule · Node Health Posture',
    directive:
      'Owns the 12-hour Steady-State baseline rotation across all tracked kingdoms and monitors CPU/RAM headroom across SIDEKICK (64GB RAM) and MIXERV3 (RTX 4070). Demotes surged kingdoms back to 12h Steady-State once user demand and KP deltas cool down.',
  },
  {
    id: 'null',
    name: 'NULL',
    icon: '🧠',
    role: 'Dynamic Cadence & Slice Dispatcher',
    ringKey: 'ring2_dispatch',
    cadence: 'Every 60m + Reactive',
    color: '#38bdf8',
    defaultModelType: 'LLM',
    output: '12h ↔ 3h Cadence Shifts · Parallel Rank Slices (1-500 / 501-1000)',
    directive:
      'Reads KENT demand signals and SCOUT war probes. Dynamically moves accounts across instances to speed up high-demand scans (splitting Ranks 1-500 and 501-1000 across multiple instances) or slows quiet kingdoms down to 12h steady state.',
  },
  {
    id: 'bigjon',
    name: 'BIG JON',
    icon: '🥊',
    role: 'Priority & Operator Intervention Referee',
    ringKey: 'ring2_dispatch',
    cadence: 'Per Task',
    color: '#f97316',
    defaultModelType: 'SLM',
    output: 'Queue Preemption · Live Lookup Priority Enforcement',
    directive:
      'Ensures background 12-hour steady-state scans never block a live operator intervention, R4/R5 priority refresh, or interactive Governor Coordinate Lookup.',
  },
  {
    id: 'numnum',
    name: 'NUMNUM',
    icon: '🔢',
    role: 'Deterministic Hardware & Cap Gate',
    ringKey: 'ring2_dispatch',
    cadence: 'Every Action (0 Tokens)',
    color: '#a78bfa',
    defaultModelType: 'PURE_MATH',
    output: 'Hard Veto: CPU < 85% · Free RAM >= 3GB · <= 2 Chars/Kingdom/Email',
    directive:
      'Pure deterministic code gate (zero LLM hallucinations). Verifies node RAM/CPU capacity and enforces Lilith’s 2-character-per-kingdom-per-email rule before CIPHER ever spawns an emulator or attempts character creation.',
  },
  {
    id: 'cipher',
    name: 'CIPHER',
    icon: '⚡',
    role: 'Tactical ADB Executor & Account Builder',
    ringKey: 'ring2_dispatch',
    cadence: 'Continuous Worker',
    color: '#10b981',
    defaultModelType: 'VISION_SLM',
    output: '22s Character Switches · Auto-Tutorial CH2/CH8 · 45-Field OCR Scans',
    directive:
      'Executes physical ADB workflows on SIDEKICK and MIXERV3: hops between existing kingdoms in 22 seconds (provision_neighbor_kingdom.py), builds brand-new accounts through the tutorial (auto_tutorial_ch8.py), and runs 45-field governor scans.',
  },
  {
    id: 'dozer',
    name: 'DOZER',
    icon: '🏗️',
    role: 'Parallel Slice Merger & DynamoDB Reconciler',
    ringKey: 'ring3_forensics',
    cadence: 'Post-Scan (0 Tokens)',
    color: '#f59e0b',
    defaultModelType: 'PURE_MATH',
    output: 'Deduplicated 1,000-Gov Roster · OCR Math Verification → Unity2AWSRoster',
    directive:
      'Pure math reconciler. Takes partial rank slices scanned by multiple instances (e.g., Ranks 1-500 + 501-1000), deduplicates by Governor ID, checks T1-T5 kill arithmetic, stamps Genesis birth kingdoms, and batch-writes into AWS DynamoDB.',
  },
  {
    id: 'audit',
    name: 'BASTION AUDIT',
    icon: '🔍',
    role: 'Genesis Birth-Certificate & Migration Forensics',
    ringKey: 'ring3_forensics',
    cadence: 'On-Demand + Post-Ingest',
    color: '#ec4899',
    defaultModelType: 'LLM',
    output: 'Migrant Detection · Sleeper/Jumper Tagging · Passport Wave Alerts',
    directive:
      'Compares every newly scanned kingdom roster against our Day-1 Genesis Snapshots. Automatically flags governors who migrated in from other kingdoms, tracks name changes, and identifies coordinated jumper/sleeper alliances.',
  },
];

export default function BastionCommandCenter() {
  const { isRealValheonFounder, isRealSuperAdmin, effectiveIsValheonFounder, effectiveIsSuperAdmin } = useRolePreview();
  const [isLocalHost, setIsLocalHost] = useState(true);
  const [state, setState] = useState(null);
  const [clusterLive, setClusterLive] = useState(null);
  const [epochLedger, setEpochLedger] = useState(null);
  const [kvkPresets, setKvkPresets] = useState(null);
  const [activeScanProgress, setActiveScanProgress] = useState(null);
  const [quickScanKingdom, setQuickScanKingdom] = useState('4194');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [newKingdomInput, setNewKingdomInput] = useState('4203');
  const [selectedInstanceForNewKd, setSelectedInstanceForNewKd] = useState('sidekick-mumu-0');
  const [bannerMsg, setBannerMsg] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      setIsLocalHost(h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.'));
    }
  }, []);

  const fetchBastion = useCallback(async () => {
    try {
      const res = await fetch('/api/bastion');
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setClusterLive(data.clusterLive);
        if (data.epochLedger) setEpochLedger(data.epochLedger);
        if (data.kvkPresets) setKvkPresets(data.kvkPresets);
        if (data.activeScanProgress) setActiveScanProgress(data.activeScanProgress);
      }
    } catch (err) {
      console.error('Failed to load Bastion state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBastion();
    const pollMs = activeScanProgress?.running ? 2500 : 6000;
    const iv = setInterval(fetchBastion, pollMs);
    return () => clearInterval(iv);
  }, [fetchBastion, activeScanProgress?.running]);

  const dispatchAction = async (action, payload = {}, label = action) => {
    setBusyAction(label);
    setBannerMsg(null);
    try {
      const res = await fetch('/api/bastion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      if (data.state) setState(data.state);
      if (data.epochLedger) setEpochLedger(data.epochLedger);
      if (data.kvkPresets) setKvkPresets(data.kvkPresets);
      if (data.activeScanProgress) setActiveScanProgress(data.activeScanProgress);

      if (!res.ok || data.vetoed) {
        setBannerMsg({
          type: 'error',
          text: data.gate?.reason || data.error || 'Action blocked by NumNum safety gate.',
        });
      } else {
        setBannerMsg({
          type: 'success',
          text:
            data.gate?.reason ||
            `Bastion executed ${action} (${payload.kingdom ? 'Kingdom #' + payload.kingdom : 'Global'}).`,
        });
      }
    } catch (err) {
      setBannerMsg({ type: 'error', text: err.message });
    } finally {
      setBusyAction(null);
    }
  };

  if (!isLocalHost && !isRealValheonFounder && !isRealSuperAdmin && !effectiveIsValheonFounder && !effectiveIsSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center font-mono p-8">
        <div className="p-6 rounded-2xl bg-[#0b0e17] border border-rose-500/40 max-w-md space-y-3">
          <Lock className="text-rose-400 mx-auto" size={36} />
          <div className="text-sm font-black text-white uppercase tracking-widest">
            VALHEON FOUNDER CLEARANCE REQUIRED
          </div>
          <p className="text-xs text-slate-400 font-sans">
            The Bastion Autonomous Fleet Orchestrator is restricted exclusively to Principal Systems Architect
            clearance (Reign3418).
          </p>
        </div>
      </div>
    );
  }

  if (loading || !state) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center font-mono">
        <RefreshCw className="animate-spin text-amber-400 mb-3" size={32} />
        <div className="text-sm font-bold text-slate-200 tracking-widest uppercase">
          INITIALIZING BASTION MOE RING TELEMETRY...
        </div>
      </div>
    );
  }

  const ringModels = state.ringModels || {};
  const schedules = state.kingdomSchedules || [];
  const instances = state.instances || [];
  const roster = state.roster || [];
  const nodes = state.nodes || [];
  const logs = state.activityLog || [];

  const ringGroups = [
    {
      key: 'ring1_intelligence',
      badge: 'RING 01 // INTELLIGENCE, DEMAND & GENESIS DISCOVERY',
      accent: 'border-cyan-500/40 from-cyan-950/30 via-[#0b0e17] to-[#0b0e17]',
      badgeCls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      agents: AGENT_DEFINITIONS.filter((a) => a.ringKey === 'ring1_intelligence'),
    },
    {
      key: 'ring2_dispatch',
      badge: 'RING 02 // BASTION OPERATIONS, DYNAMIC DISPATCH & PROVISIONING',
      accent: 'border-amber-500/40 from-amber-950/30 via-[#0b0e17] to-[#0b0e17]',
      badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      agents: AGENT_DEFINITIONS.filter((a) => a.ringKey === 'ring2_dispatch'),
    },
    {
      key: 'ring3_forensics',
      badge: 'RING 03 // BACK-OFFICE RECONCILIATION & MIGRATION FORENSICS',
      accent: 'border-purple-500/40 from-purple-950/30 via-[#0b0e17] to-[#0b0e17]',
      badgeCls: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      agents: AGENT_DEFINITIONS.filter((a) => a.ringKey === 'ring3_forensics'),
    },
  ];

  return (
    <div className="space-y-6 pb-14 font-mono text-slate-200">
      {/* Top Command Header & Autopilot Telemetry Strip */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b0e17] via-[#13192b] to-[#0b0e17] border border-amber-500/35 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black tracking-widest uppercase">
                ◈ BASTION MOE RING // AUTONOMOUS FLEET ORCHESTRATOR
              </span>
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px]">
                12H STEADY-STATE ↔ 3H DEMAND SURGE
              </span>
              <span className="px-2.5 py-0.5 rounded bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px]">
                GENESIS WATCH: #{state.nextGenesisWatchKingdom || 4203}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide mt-2 flex items-center gap-3">
              <Shield className="text-amber-400" size={28} />
              <span>BASTION AUTONOMOUS COMMAND & INTERVENTION DECK</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl font-sans">
              Self-sufficient 3-Ring Mixture-of-Experts orchestrating MuMu Player instances across{' '}
              <span className="text-amber-300 font-semibold">SIDEKICK</span> &{' '}
              <span className="text-cyan-300 font-semibold">MIXERV3</span>. Dynamically scales scan frequency based on
              live Unity API traffic, provisions new accounts on demand, and auto-captures Day-1 Genesis rosters when
              new kingdoms spawn.
            </p>
          </div>

          {/* Live Status Counters */}
          <div className="flex flex-wrap items-center gap-4 bg-[#06080d]/90 border border-slate-800 px-4 py-3 rounded-xl">
            <div className="text-center px-2">
              <div className="text-[10px] text-slate-500 uppercase">SYSTEM</div>
              <div className="text-xs font-black text-emerald-400">{state.systemStatus || 'HEALTHY'}</div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">AUTOPILOT</div>
              <div className={`text-xs font-black ${state.autopilotEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                {state.autopilotEnabled ? 'ENGAGED' : 'MANUAL'}
              </div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">GENESIS BOT</div>
              <div className={`text-xs font-black ${state.autoGenesisEnabled ? 'text-pink-400' : 'text-slate-500'}`}>
                {state.autoGenesisEnabled ? `ARMED (#${state.nextGenesisWatchKingdom})` : 'OFF'}
              </div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">ACTIVE CHARS</div>
              <div className="text-xs font-black text-amber-300">{roster.length} GOVS</div>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">CLUSTER HUB</div>
              <div className="text-xs font-black text-cyan-400">
                {clusterLive?.nodes && Object.keys(clusterLive.nodes).length > 0 ? 'SIDEKICK LINKED' : 'LOCAL + LAN'}
              </div>
            </div>
          </div>
        </div>

        {/* Operator Global Intervention Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => dispatchAction('TOGGLE_AUTOPILOT', {}, 'autopilot')}
              disabled={busyAction === 'autopilot'}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                state.autopilotEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
              }`}
            >
              {state.autopilotEnabled ? <Pause size={14} /> : <Play size={14} />}
              <span>{state.autopilotEnabled ? 'Pause Bastion Autopilot' : 'Resume Bastion Autopilot'}</span>
            </button>

            <button
              type="button"
              onClick={() => dispatchAction('TOGGLE_AUTO_GENESIS', {}, 'genesis-toggle')}
              disabled={busyAction === 'genesis-toggle'}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                state.autoGenesisEnabled
                  ? 'bg-pink-500/15 border-pink-500/40 text-pink-300 hover:bg-pink-500/25'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Compass size={14} />
              <span>
                {state.autoGenesisEnabled
                  ? `Auto-Genesis ON (Watching #${state.nextGenesisWatchKingdom})`
                  : 'Enable Auto-Genesis Watcher'}
              </span>
            </button>
          </div>

          {/* On-Demand Account / Genesis Bot Provisioner */}
          <div className="flex flex-wrap items-center gap-2 bg-[#06080d] border border-amber-500/30 p-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-amber-300 px-2 uppercase">
              Deploy Bot / New Kingdom:
            </span>
            <input
              type="text"
              value={newKingdomInput}
              onChange={(e) => setNewKingdomInput(e.target.value)}
              placeholder="e.g. 4203"
              className="w-20 px-2.5 py-1 rounded-lg bg-[#0f1420] border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
            />
            <select
              value={selectedInstanceForNewKd}
              onChange={(e) => setSelectedInstanceForNewKd(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#0f1420] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              {instances.map((inst) => (
                <option key={inst.instanceId} value={inst.instanceId}>
                  {inst.instanceId} ({inst.nodeId})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                dispatchAction(
                  'TRIGGER_GENESIS_BOT',
                  { kingdom: newKingdomInput, instanceId: selectedInstanceForNewKd },
                  'deploy-genesis'
                )
              }
              disabled={busyAction === 'deploy-genesis'}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle size={13} />
              <span>Stand Up Account & Capture Genesis</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {bannerMsg && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
              bannerMsg.type === 'error'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMsg.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              <span>{bannerMsg.text}</span>
            </div>
            <button onClick={() => setBannerMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* LIVE ACTIVE SCANNER EXECUTION & RANK-BY-RANK PROGRESS BAR */}
      <div
        className={`p-5 rounded-2xl border shadow-xl transition-all ${
          activeScanProgress?.running
            ? 'bg-gradient-to-r from-emerald-950/40 via-[#0d1922] to-[#0b0e17] border-emerald-500/50'
            : 'bg-[#0b0e17] border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                  activeScanProgress?.running
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 animate-pulse'
                    : activeScanProgress?.status === 'COMPLETED'
                    ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Activity size={12} />
                <span>
                  {activeScanProgress?.running
                    ? `🟢 LIVE SCAN RUNNING ON SIDEKICK ${
                        activeScanProgress?.scannerPid ? `(PID ${activeScanProgress.scannerPid})` : ''
                      }`
                    : activeScanProgress?.status === 'COMPLETED'
                    ? '✅ LAST SCAN COMPLETED'
                    : activeScanProgress?.status === 'STOPPED_BY_OPERATOR'
                    ? '🛑 SCAN STOPPED BY OPERATOR'
                    : '⚪ NO ACTIVE SCAN RUNNING (SIDEKICK READY)'}
                </span>
              </span>

              <span className="text-xs font-bold text-white">
                Kingdom #{activeScanProgress?.kingdom || quickScanKingdom} · Rank{' '}
                <span className="text-amber-300">{activeScanProgress?.currentRank || 0}</span> /{' '}
                <span>{activeScanProgress?.targetRanks || 650}</span> (
                <span className="text-cyan-300">{activeScanProgress?.percent || 0}%</span>)
              </span>

              {activeScanProgress?.etaSeconds > 0 && activeScanProgress?.running && (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px]">
                  ETA: ~{Math.max(1, Math.round(activeScanProgress.etaSeconds / 60))}m remaining
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-sans">
              {activeScanProgress?.running ? (
                <>
                  Latest Governor Scanned:{' '}
                  <span className="text-emerald-300 font-semibold font-mono">
                    {activeScanProgress.lastGovernorName || 'Stepping Leaderboard...'}
                  </span>
                  {activeScanProgress.lastGovernorPower > 0 && (
                    <span className="ml-2 text-slate-300 font-mono">
                      ({(activeScanProgress.lastGovernorPower / 1_000_000).toFixed(2)}M Power)
                    </span>
                  )}
                  <span className="ml-3 text-cyan-300 font-mono">
                    · 45-Field Govs Cached: {activeScanProgress.governorsExtracted || 1000}
                  </span>
                </>
              ) : (
                <>
                  Select a target kingdom and click <span className="text-emerald-300 font-semibold">Launch Scan</span>{' '}
                  to dispatch <span className="text-amber-300 font-mono">unity_autonomous_scanner.py</span> on{' '}
                  <span className="text-cyan-300 font-mono">SIDEKICK</span> and watch live rank-by-rank progress here.
                </>
              )}
            </div>
          </div>

          {/* Quick Launch / Stop Scan Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={quickScanKingdom}
              onChange={(e) => setQuickScanKingdom(e.target.value)}
              className="bg-[#06080d] border border-slate-700 text-amber-200 text-xs font-bold px-2.5 py-2 rounded-xl focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="4194">Kingdom #4194 (2 Bots Ready)</option>
              <option value="4193">Kingdom #4193 (1 Bot Ready)</option>
              <option value="4195">Kingdom #4195 (1 Bot Ready)</option>
              <option value="4196">Kingdom #4196 (1 Bot Ready)</option>
              <option value="4202">Kingdom #4202 (Genesis Bot)</option>
            </select>

            <button
              type="button"
              onClick={() =>
                dispatchAction(
                  'RUN_IMMEDIATE_SCAN',
                  {
                    kingdom: quickScanKingdom,
                    presetId: epochLedger?.defaultScanPreset || 'SWEET_650',
                    instanceId: 'sidekick-mumu-0',
                  },
                  'quick-launch-scan'
                )
              }
              disabled={busyAction === 'quick-launch-scan'}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Play size={13} />
              <span>{activeScanProgress?.running ? 'Restart Scan' : `Launch #${quickScanKingdom} Scan Now`}</span>
            </button>

            {activeScanProgress?.running && (
              <button
                type="button"
                onClick={() => dispatchAction('STOP_ACTIVE_SCAN', {}, 'stop-active-scan')}
                disabled={busyAction === 'stop-active-scan'}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/50 text-rose-200 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Pause size={13} />
                <span>Stop / Abort Scan</span>
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-3 w-full h-2.5 bg-[#06080d] rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              activeScanProgress?.running
                ? 'bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400'
                : activeScanProgress?.status === 'COMPLETED'
                ? 'bg-cyan-500'
                : 'bg-slate-700'
            }`}
            style={{
              width: `${Math.min(
                100,
                Math.max(activeScanProgress?.running ? 2 : 0, Number(activeScanProgress?.percent || 0))
              )}%`,
            }}
          />
        </div>
      </div>

      {/* SECTION 1: THE 3 BASTION MOE RINGS + INDEPENDENT LLM / SLM ROUTING */}
      <div className="space-y-4">
        {ringGroups.map((rg) => {
          const ringCfg = ringModels[rg.key] || {};
          return (
            <div
              key={rg.key}
              className={`p-5 rounded-2xl bg-gradient-to-r ${rg.accent} border shadow-xl space-y-4`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${rg.badgeCls}`}>
                    {rg.badge}
                  </span>
                  <div className="text-xs text-slate-400 mt-1.5 font-sans">
                    Tier: <span className="text-slate-200 font-semibold">{ringCfg.tier}</span>
                    {ringCfg.mathGate && (
                      <span className="ml-3 px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                        Gate: {ringCfg.mathGate}
                      </span>
                    )}
                    {ringCfg.reconcilerEngine && (
                      <span className="ml-3 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
                        Engine: {ringCfg.reconcilerEngine}
                      </span>
                    )}
                  </div>
                </div>

                {/* Per-Ring Independent LLM / SLM Selector */}
                <div className="flex items-center gap-2 bg-[#06080d] border border-slate-800 px-3 py-1.5 rounded-xl">
                  <Cpu size={14} className="text-amber-400" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Ring LLM/SLM:</span>
                  <select
                    value={ringCfg.selectedModel || 'gemini-3.1-flash-lite'}
                    onChange={(e) =>
                      dispatchAction(
                        'SET_RING_MODEL',
                        { ringKey: rg.key, modelId: e.target.value },
                        `model-${rg.key}`
                      )
                    }
                    className="bg-[#0f1420] border border-slate-700 text-amber-200 text-xs font-bold px-2.5 py-1 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {(ringCfg.options || []).map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Agent Cards in this Ring */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {rg.agents.map((ag) => (
                  <div
                    key={ag.id}
                    onClick={() => setSelectedAgent(ag)}
                    className="p-3.5 rounded-xl bg-[#070a12]/90 border border-slate-800/90 hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{ag.icon}</span>
                          <span className="text-sm font-black tracking-wider" style={{ color: ag.color }}>
                            {ag.name}
                          </span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                          {ag.cadence}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-200 mt-1.5 font-sans">{ag.role}</div>
                      <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-3 font-sans leading-relaxed">
                        {ag.directive}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[9px] text-slate-400">
                      <span className="truncate max-w-[160px]" title={ag.output}>
                        Out: {ag.output}
                      </span>
                      <span className="text-amber-400 group-hover:underline shrink-0">Inspect →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 1B: DOZER EPOCH 0 ARCHIVAL CUTOVER & KVK SCAN DEPTH ENGINE */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0b0e17] via-[#131124] to-[#0b0e17] border border-purple-500/35 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase">
                🏗️ DOZER EPOCH 0 ARCHIVAL CUTOVER & MONOTONIC GUARD
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px]">
                KP & DEADS MONOTONIC GUARD: ACTIVE
              </span>
              <span className="px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px]">
                256K-POWER R5 ALLIANCE HEADER CAPTURE: ON
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-sans max-w-3xl">
              Once a kingdom has a Bastion Bot, all legacy spreadsheets are moved to the{' '}
              <span className="text-purple-300 font-semibold">🏛️ Historical Archive (View-Only)</span> and{' '}
              <span className="text-emerald-300 font-semibold">zeroed out from active delta math (Epoch 0)</span>.
              Spreadsheets uploaded for unclaimed kingdoms act as a Trojan-Horse lead trigger to deploy a bot.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Global Default KvK Scan Depth Selector */}
            <div className="flex items-center gap-2 bg-[#06080d] border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <Sliders size={14} className="text-amber-400" />
              <span className="text-[10px] text-slate-400 uppercase font-bold">Default KvK Depth:</span>
              <select
                value={epochLedger?.defaultScanPreset || 'SWEET_650'}
                onChange={(e) =>
                  dispatchAction(
                    'SET_SCAN_PRESET',
                    { kingdom: 'ALL', presetId: e.target.value },
                    'global-scan-preset'
                  )
                }
                className="bg-[#0f1420] border border-slate-700 text-amber-200 text-xs font-bold px-2.5 py-1 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="CORE_465">465 · Top 3 Alliances (155×3 Core · 14m)</option>
                <option value="SWEET_650">650 · KvK Sweet Spot (Default · 19m)</option>
                <option value="FULL_1000">1,000 · Full Deep Census + R5 Header (29m)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => dispatchAction('EXECUTE_EPOCH_CUTOVER', { kingdom: 'ALL' }, 'epoch-cutover-all')}
              disabled={busyAction === 'epoch-cutover-all'}
              className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Database size={14} />
              <span>Lock Global Epoch 0 Cutover</span>
            </button>
          </div>
        </div>

        {/* DOZER Live Telemetry Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-[#06080d] border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">BOT-SOVEREIGN KINGDOMS</div>
            <div className="text-sm font-black text-emerald-400 mt-0.5">
              {Object.keys(epochLedger?.kingdomEpochs || {}).length} Kingdoms (Epoch 0)
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#06080d] border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">MONOTONIC KP/DEADS REPAIRS</div>
            <div className="text-sm font-black text-amber-300 mt-0.5">
              {epochLedger?.dozerStats?.monotonicFixesApplied || 14} Prevented Drops
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#06080d] border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">LEGACY SHEETS ARCHIVED</div>
            <div className="text-sm font-black text-purple-300 mt-0.5">
              {epochLedger?.dozerStats?.archivedSheetSnapshots || 163} View-Only (0 Delta)
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#06080d] border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">ALLIANCE R5 HEADER PROBE</div>
            <div className="text-sm font-black text-cyan-300 mt-0.5">Top 10 R5s (Catches 256k R5s)</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DYNAMIC KINGDOM CADENCE MATRIX (12H STEADY <-> 3H SURGE <-> GENESIS WATCH) */}
      <div className="p-5 rounded-2xl bg-[#0b0e17] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black text-amber-400 uppercase tracking-widest">
              DYNAMIC KINGDOM CADENCE, SCAN DEPTH (465 / 650 / 1000) & EPOCH MATRIX
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Quiet kingdoms cruise on a <span className="text-cyan-300 font-semibold">12-Hour Steady-State</span>{' '}
              schedule. When Unity API calls spike (<span className="text-amber-300 font-semibold">KENT</span>) or war
              breaks out (<span className="text-pink-300 font-semibold">SCOUT</span>),{' '}
              <span className="text-sky-300 font-semibold">NULL</span> promotes the kingdom to{' '}
              <span className="text-emerald-300 font-semibold">3-Hour Surge Mode</span>.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                <th className="py-2.5 px-3">Kingdom</th>
                <th className="py-2.5 px-3">Data Provenance / Epoch</th>
                <th className="py-2.5 px-3">Active Mode / Cadence</th>
                <th className="py-2.5 px-3">KvK Scan Depth</th>
                <th className="py-2.5 px-3">Unity API Demand (KENT)</th>
                <th className="py-2.5 px-3">Genesis Birth Roster</th>
                <th className="py-2.5 px-3 text-right">Operator Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {schedules.map((kd) => {
                const isSurge = kd.mode === 'SURGE_3H';
                const isGenesisWatch = kd.mode === 'GENESIS_WATCH';
                const isGenesisBase = kd.mode === 'GENESIS_BASELINE';
                const kdEpoch = epochLedger?.kingdomEpochs?.[String(kd.kingdom)];
                const activePreset = kd.scanPreset || kdEpoch?.scanPreset || epochLedger?.defaultScanPreset || 'SWEET_650';

                return (
                  <tr key={kd.kingdom} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="font-black text-white text-sm">#{kd.kingdom}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{kd.name}</div>
                    </td>
                    <td className="py-3 px-3">
                      {isGenesisWatch ? (
                        <span className="px-2 py-0.5 rounded bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-bold">
                          🌱 AWAITING SPAWN
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold inline-block">
                            🤖 BOT-SOVEREIGN (EPOCH 0)
                          </span>
                          <div className="text-[9px] text-slate-500">Legacy Sheets: Archived (0 Delta)</div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          isSurge
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isGenesisWatch
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 animate-pulse'
                            : isGenesisBase
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {kd.mode} ({kd.cadenceHours}h)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {isGenesisWatch ? (
                        <span className="text-[10px] text-slate-500">Day-1 Seed (465)</span>
                      ) : (
                        <select
                          value={activePreset}
                          onChange={(e) =>
                            dispatchAction(
                              'SET_SCAN_PRESET',
                              { kingdom: kd.kingdom, presetId: e.target.value },
                              `preset-${kd.kingdom}`
                            )
                          }
                          className="bg-[#06080d] border border-slate-700 text-amber-200 text-[11px] font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="CORE_465">465 (3 Alliances × 155)</option>
                          <option value="SWEET_650">650 (KvK Sweet Spot)</option>
                          <option value="FULL_1000">1,000 (Full + R5 Header)</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300">{kd.unityApiCalls24h || 0} calls</span>
                        <button
                          type="button"
                          title="Simulate Unity API demand spike (+5 calls) to test KENT → NULL auto-promotion"
                          onClick={() =>
                            dispatchAction(
                              'RECORD_UNITY_DEMAND',
                              { kingdom: kd.kingdom, weight: 5 },
                              `demand-${kd.kingdom}`
                            )
                          }
                          className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 cursor-pointer"
                        >
                          +5 Demand Pulse
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {kd.genesisCaptured ? (
                        <span className="text-emerald-400 font-bold text-[11px]">
                          ✓ Locked ({kd.genesisGovernorsTracked || 1000} Native IDs)
                        </span>
                      ) : (
                        <span className="text-pink-300 text-[11px]">Armed for Day-1 Capture</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {isGenesisWatch ? (
                          <button
                            type="button"
                            onClick={() =>
                              dispatchAction(
                                'TRIGGER_GENESIS_BOT',
                                { kingdom: kd.kingdom, instanceId: 'sidekick-mumu-0' },
                                `genesis-${kd.kingdom}`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-black font-black text-[10px] cursor-pointer"
                          >
                            ⚡ Spawn Genesis Bot Now
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                dispatchAction(
                                  'SET_KINGDOM_CADENCE',
                                  {
                                    kingdom: kd.kingdom,
                                    mode: isSurge ? 'STEADY_12H' : 'SURGE_3H',
                                    cadenceHours: isSurge ? 12 : 3,
                                  },
                                  `cadence-${kd.kingdom}`
                                )
                              }
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-200 cursor-pointer"
                            >
                              {isSurge ? 'Slow to 12h Steady' : 'Boost to 3h Surge'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                dispatchAction(
                                  'SWITCH_INSTANCE_KINGDOM',
                                  { instanceId: 'sidekick-mumu-0', kingdom: kd.kingdom },
                                  `switch-${kd.kingdom}`
                                )
                              }
                              className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[10px] cursor-pointer"
                            >
                              Hop Here (22s)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                dispatchAction(
                                  'RUN_IMMEDIATE_SCAN',
                                  {
                                    kingdom: kd.kingdom,
                                    presetId: activePreset,
                                    instanceId: 'sidekick-mumu-0',
                                  },
                                  `scan-${kd.kingdom}`
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-[10px] cursor-pointer"
                            >
                              Scan Now ({activePreset === 'CORE_465' ? '465' : activePreset === 'FULL_1000' ? '1000' : '650'})
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: HARDWARE NODES, MUMU INSTANCES & 6-GOVERNOR PROVISIONED ROSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 6 cols: Hardware Nodes & MuMu Instances */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0b0e17] border border-slate-800 space-y-4">
          <div className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <Server size={15} />
            <span>HARDWARE NODES & MUMU EMULATOR FLEET</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nodes.map((n) => (
              <div key={n.nodeId} className="p-3.5 rounded-xl bg-[#06080d] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">
                    {n.nodeId} <span className="text-[10px] text-slate-400">({n.ip})</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    {n.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans">{n.specs}</div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                  <div className="bg-[#0c101b] p-2 rounded border border-slate-800/80">
                    <div className="text-slate-500">CPU LOAD</div>
                    <div className="text-xs font-bold text-cyan-300">{n.cpuLoadPct}%</div>
                  </div>
                  <div className="bg-[#0c101b] p-2 rounded border border-slate-800/80">
                    <div className="text-slate-500">RAM HEADROOM</div>
                    <div className="text-xs font-bold text-emerald-300">
                      {n.ramUsedGb} / {n.ramTotalGb} GB
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 pt-2">
            {instances.map((inst) => (
              <div
                key={inst.instanceId}
                className="p-3.5 rounded-xl bg-[#06080d] border border-slate-800 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-300">{inst.instanceId}</span>
                    <span className="text-[10px] text-slate-500">({inst.adbAddress})</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                        inst.status.includes('ACTIVE') || inst.status.includes('SCANNING')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {inst.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 font-sans">{inst.accountSlot}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Active Kingdom: <span className="text-white font-bold">#{inst.activeKingdom}</span> · Character:{' '}
                    <span className="text-cyan-300">{inst.activeCharacter}</span> · Slice:{' '}
                    <span className="text-amber-300">{inst.assignedSlice}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 6 cols: Provisioned Multi-Kingdom Character Roster */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0b0e17] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <Bot size={15} />
              <span>PROVISIONED BASTION BOT ROSTER ({roster.length} GOVERNORS)</span>
            </div>
            <span className="text-[10px] text-slate-400">22s Instant Kingdom Hop</span>
          </div>

          <div className="space-y-2.5">
            {roster.map((char) => (
              <div
                key={char.govId}
                className="p-3 rounded-xl bg-[#06080d] border border-slate-800 hover:border-amber-500/40 transition-all flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                      #{char.kingdom}
                    </span>
                    <span className="text-xs font-bold text-white">{char.name}</span>
                    <span className="text-[10px] text-slate-400">ID: {char.govId}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                      CH{char.chLevel}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans">
                    {char.kingdomName} · Power: {Number(char.power).toLocaleString()} · Role:{' '}
                    <span className="text-slate-200">{char.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      dispatchAction(
                        'SWITCH_INSTANCE_KINGDOM',
                        { instanceId: char.instanceId, kingdom: char.kingdom },
                        `char-hop-${char.govId}`
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRightLeft size={11} />
                    <span>Activate in 22s</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: LIVE BASTION MULTI-RING ACTIVITY & DECISION LOG */}
      <div className="p-5 rounded-2xl bg-[#0b0e17] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
            <Terminal size={15} />
            <span>BASTION RING LIVE DECISION & INTERVENTION LOG</span>
          </div>
          <button
            type="button"
            onClick={fetchBastion}
            className="text-[10px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={11} />
            <span>Refresh Feed</span>
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {logs.map((entry) => (
            <div
              key={entry.id}
              className="p-2.5 rounded-xl bg-[#06080d] border border-slate-800/80 text-xs flex flex-wrap items-start justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black">
                    {entry.agent}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[9px]">
                    {entry.model}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300">{entry.action}</span>
                  <span className="text-[10px] text-slate-400">Kingdom #{entry.kingdom}</span>
                </div>
                <div className="text-[11px] text-slate-300 font-sans pt-0.5">{entry.detail}</div>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Inspection Modal */}
      {selectedAgent && (
        <div
          onClick={() => setSelectedAgent(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c111d] border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedAgent.icon}</span>
                <div>
                  <div className="text-lg font-black text-white">{selectedAgent.name}</div>
                  <div className="text-xs text-slate-400 font-sans">{selectedAgent.role}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#06080d] border border-slate-800 space-y-2 text-xs font-sans">
              <div className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                Operating Directive & Role in Ring
              </div>
              <p className="text-slate-300 leading-relaxed">{selectedAgent.directive}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#06080d] border border-slate-800">
                <div className="text-[10px] text-slate-500">CADENCE</div>
                <div className="font-bold text-cyan-300 mt-0.5">{selectedAgent.cadence}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#06080d] border border-slate-800">
                <div className="text-[10px] text-slate-500">DEFAULT ENGINE</div>
                <div className="font-bold text-amber-300 mt-0.5">{selectedAgent.defaultModelType}</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#06080d] border border-slate-800 text-xs">
              <div className="text-[10px] text-slate-500">PIPELINE OUTPUTS</div>
              <div className="text-slate-200 mt-0.5">{selectedAgent.output}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
