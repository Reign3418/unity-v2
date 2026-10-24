'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import {
  Bot,
  ShieldAlert,
  Crosshair,
  Hammer,
  Wheat,
  Swords,
  Moon,
  RefreshCw,
  Play,
  Eye,
  MapPin,
  Clock,
  Activity,
  Terminal,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sparkles,
  Maximize2,
  Lock,
  X,
} from 'lucide-react';

const STATUS_BADGE_MAP = {
  ACTIVE_IN_4197: {
    label: 'ACTIVE IN #4197',
    cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dot: 'bg-emerald-400 animate-pulse',
  },
  TRAINING_T1: {
    label: 'TRAINING T1 ONLY',
    cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    dot: 'bg-cyan-400 animate-ping',
  },
  FARMING: {
    label: 'FARMING RSS NODE',
    cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400 animate-pulse',
  },
  BUILDING: {
    label: 'UPGRADING CITY',
    cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    dot: 'bg-indigo-400 animate-pulse',
  },
  BLACKBOX_RECON: {
    label: 'BLACK-BOX RECON',
    cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dot: 'bg-rose-400 animate-ping',
  },
  ROTATING: {
    label: 'ROTATING #4197 BOT',
    cls: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    dot: 'bg-purple-400 animate-spin',
  },
  SLEEPING: {
    label: 'SLEEP WINDOW',
    cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    dot: 'bg-slate-400',
  },
  FINISHING_CURRENT_TASK: {
    label: 'FINISHING PRIOR TASK',
    cls: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    dot: 'bg-amber-400 animate-pulse',
  },
};

export default function SwarmBlackBoxHub() {
  const { effectiveIsValheonFounder, effectiveIsSuperAdmin } = useRolePreview();
  const [stateData, setStateData] = useState(null);
  const [source, setSource] = useState('LOADING');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [dispatchingAction, setDispatchingAction] = useState(null);
  const [actionBanner, setActionBanner] = useState(null);

  const hasClearance = Boolean(effectiveIsValheonFounder || effectiveIsSuperAdmin);

  const fetchBlackBox = useCallback(async () => {
    if (!hasClearance) return;
    try {
      const res = await fetch('/api/swarm-blackbox', { cache: 'no-store' });
      const json = await res.json();
      if (json?.data) {
        setStateData(json.data);
        setSource(json.source || 'LIVE');
      }
    } catch (e) {
      console.error('Failed to fetch #4197 Swarm Black-Box state:', e);
    } finally {
      setLoading(false);
    }
  }, [hasClearance]);

  useEffect(() => {
    fetchBlackBox();
  }, [fetchBlackBox]);

  useEffect(() => {
    if (!autoRefresh || !hasClearance) return undefined;
    const timer = setInterval(fetchBlackBox, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, hasClearance, fetchBlackBox]);

  if (!hasClearance) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center font-mono p-8">
        <div className="p-6 rounded-2xl bg-[#0b0e17] border border-rose-500/40 max-w-md space-y-3">
          <Lock className="text-rose-400 mx-auto" size={36} />
          <div className="text-sm font-black text-white uppercase tracking-widest">
            SUPERADMIN / FOUNDER CLEARANCE REQUIRED
          </div>
          <p className="text-xs text-slate-400 font-sans">
            The Kingdom #4197 Multi-Bot Swarm & Black-Box Command Deck is restricted exclusively to SuperAdmin and
            Principal Systems Architect clearance.
          </p>
        </div>
      </div>
    );
  }

  const triggerOperatorAction = async (action, port = '16448') => {
    setDispatchingAction(`${action}-${port}`);
    setActionBanner(null);
    try {
      const res = await fetch('/api/swarm-blackbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, port }),
      });
      const out = await res.json();
      setActionBanner(out.output || `Dispatched ${action} on :${port}`);
      setTimeout(() => fetchBlackBox(), 1800);
    } catch (e) {
      setActionBanner(`Error: ${e.message}`);
    } finally {
      setDispatchingAction(null);
    }
  };

  const instancesObj = stateData?.instances || {};
  const instanceList = ['16384', '16416', '16448'].map(
    (p) =>
      instancesObj[p] || {
        port: p,
        label: `INSTANCE :${p}`,
        adb: `127.0.0.1:${p}`,
        activeGovernorName: `Belerion-Bot-${p}`,
        status: 'INITIALIZING',
        currentTask: 'Syncing with SIDEKICK...',
        currentBuilding: 'City Hall Queue',
        currentFarming: { resource: 'FOOD', nodeX: 0, nodeY: 0, status: 'READY' },
        currentTraining: {
          policy: 'T1 ONLY',
          infantry: 'T1 Swordsman',
          archer: 'T1 Bowman',
          cavalry: 'T1 Horseman',
          siege: 'T1 Battering Ram',
          estimatedT1Troops: 2400,
        },
        rssBags: { food: '0', wood: '0', stone: '0', gold: '0', gems: '0' },
        coordinates: { kingdom: '4197', x: 0, y: 0 },
        roster4197: [],
        sleepStatus: 'AWAKE',
      }
  );

  const threats = stateData?.threats || [];
  const movements = stateData?.movements || [];
  const summary = stateData?.summary || {
    totalBotsIn4197: 3,
    activeInstances: 3,
    totalT1Trained: 7200,
    estimatedKpPool: 1440,
    hostileScoutsCount: 0,
    hostileAttacksCount: 0,
    totalMovementsLogged: movements.length,
  };

  const filteredMovements = movements.filter((m) => {
    if (activeCategory !== 'ALL' && m.category !== activeCategory) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const hay = `${m.governorName || ''} ${m.action || ''} ${m.category || ''} ${m.port || ''}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16 text-gray-100">
      {/* Top Executive Command Header */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0b111e] via-[#0f1626] to-[#131124] p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <Radio size={12} className="animate-pulse text-cyan-400" />
                KINGDOM #4197 (BELERION)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Swords size={12} />
                STRICT T1-ONLY FACTORY
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <ShieldAlert size={12} />
                BLACK-BOX THREAT RECORDER
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Source: <strong className="text-cyan-300">{source}</strong> • Updated:{' '}
                {stateData?.updatedAt ? new Date(stateData.updatedAt).toLocaleTimeString() : 'Live'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Bot className="text-cyan-400" size={28} />
              Kingdom #4197 Multi-Bot Swarm & Black-Box Command Deck
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-4xl">
              Live graphical telemetry across all 3 SIDEKICK emulators (<code>:16384</code>, <code>:16416</code>,{' '}
              <code>:16448</code>). Every bot rotates exclusively inside <strong>#4197</strong>, farms plunderable
              Food/Wood/Stone/Gold, trains <strong>Tier 1 (T1) troops ONLY</strong> for effortless KP & RSS raiding,
              and records every player who scouts or attacks them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800/70 text-slate-400 border-slate-700'
              }`}
            >
              <Activity size={14} className={autoRefresh ? 'animate-pulse text-emerald-400' : ''} />
              {autoRefresh ? 'AUTO-POLL: 5s ON' : 'AUTO-POLL: PAUSED'}
            </button>

            <button
              type="button"
              onClick={fetchBlackBox}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sync Now
            </button>

            <button
              type="button"
              disabled={dispatchingAction === 'RESTART_SWARM-16448'}
              onClick={() => triggerOperatorAction('RESTART_SWARM', '16448')}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Play size={14} />
              Cycle Swarm Loop
            </button>
          </div>
        </div>

        {actionBanner && (
          <div className="mt-4 px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-xs font-mono text-cyan-200 flex items-center justify-between">
            <span>{actionBanner}</span>
            <button type="button" onClick={() => setActionBanner(null)} className="text-cyan-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* 6 KPI Summary Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl bg-black/40 border border-white/10 p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Active #4197 Bots</div>
            <div className="mt-1 text-2xl font-black text-cyan-400 font-mono">
              {summary.totalBotsIn4197} <span className="text-xs font-normal text-slate-400">/ 6 max</span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">Across 3 MuMu 12 VMs</div>
          </div>

          <div className="rounded-xl bg-black/40 border border-emerald-500/25 p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">T1-Only Troop Pool</div>
            <div className="mt-1 text-2xl font-black text-emerald-400 font-mono">
              {Number(summary.totalT1Trained || 0).toLocaleString()}
            </div>
            <div className="mt-0.5 text-[10px] text-emerald-300/80">100% Tier 1 (Zero T2+)</div>
          </div>

          <div className="rounded-xl bg-black/40 border border-amber-500/25 p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">Harvestable KP Pool</div>
            <div className="mt-1 text-2xl font-black text-amber-400 font-mono">
              +{Number(summary.estimatedKpPool || 0).toLocaleString()} KP
            </div>
            <div className="mt-0.5 text-[10px] text-amber-300/80">Instant-heal T1 fodder</div>
          </div>

          <div className="rounded-xl bg-black/40 border border-rose-500/25 p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300">Hostile Scouts Caught</div>
            <div className="mt-1 text-2xl font-black text-rose-400 font-mono">{summary.hostileScoutsCount || 0}</div>
            <div className="mt-0.5 text-[10px] text-rose-300/80">Watchtower + Mail OCR</div>
          </div>

          <div className="rounded-xl bg-black/40 border border-red-500/30 p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-red-300">Hostile Attacks Caught</div>
            <div className="mt-1 text-2xl font-black text-red-400 font-mono">{summary.hostileAttacksCount || 0}</div>
            <div className="mt-0.5 text-[10px] text-red-300/80">City & Node Battle Logs</div>
          </div>

          <div className="rounded-xl bg-black/40 border border-indigo-500/25 p-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">Black-Box Movements</div>
            <div className="mt-1 text-2xl font-black text-indigo-400 font-mono">
              {Number(summary.totalMovementsLogged || movements.length).toLocaleString()}
            </div>
            <div className="mt-0.5 text-[10px] text-indigo-300/80">Full chronological ledger</div>
          </div>
        </div>
      </div>

      {/* 3-Instance Graphical Emulator Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {instanceList.map((inst) => {
          const stMeta = STATUS_BADGE_MAP[inst.status] || {
            label: inst.status || 'ACTIVE',
            cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
            dot: 'bg-cyan-400',
          };
          const rss = inst.rssBags || {};
          const tr = inst.currentTraining || {};
          const fm = inst.currentFarming || {};
          const coords = inst.coordinates || { kingdom: '4197', x: 0, y: 0 };
          const roster = inst.roster4197 || [];

          return (
            <div
              key={inst.port}
              className="rounded-2xl border border-[#1e2638] bg-[#0d1119] overflow-hidden shadow-xl flex flex-col justify-between"
            >
              {/* Instance Top Bar */}
              <div>
                <div className="p-4 border-b border-[#1a2030] bg-[#0a0d14] flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{inst.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                        :{inst.port}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-white truncate">{inst.activeGovernorName}</h2>
                      {inst.activeGovernorId && (
                        <span className="text-[10px] font-mono text-slate-400">ID: {inst.activeGovernorId}</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${stMeta.cls}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${stMeta.dot}`} />
                    {stMeta.label}
                  </span>
                </div>

                {/* Live Emulator Screen Preview */}
                <div className="relative aspect-video bg-[#06080c] border-b border-[#1a2030] overflow-hidden group">
                  {inst.screenPreviewB64 ? (
                    <>
                      <img
                        src={inst.screenPreviewB64}
                        alt={`${inst.activeGovernorName} live screen`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            title: `${inst.label} (${inst.activeGovernorName}) — :${inst.port}`,
                            src: inst.screenPreviewB64,
                          })
                        }
                        className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-black/70 hover:bg-black text-cyan-300 border border-cyan-500/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Expand Live Screen"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono gap-2">
                      <CameraPlaceholder />
                      <span>Capturing live frame from 127.0.0.1:{inst.port}...</span>
                    </div>
                  )}

                  {/* Coordinate & Kingdom Overlay Pill */}
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-[11px] font-mono text-cyan-200 flex items-center gap-1.5">
                    <MapPin size={12} className="text-cyan-400" />
                    <span>
                      #4197 • X:{coords.x || '---'} Y:{coords.y || '---'}
                    </span>
                  </div>

                  {/* Strict T1 Lock Overlay Pill */}
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-400" />
                    {tr.policy || 'T1 ONLY'}
                  </div>
                </div>

                {/* Current Task Banner */}
                <div className="px-4 py-2.5 bg-cyan-500/10 border-b border-cyan-500/20 text-xs font-mono text-cyan-200 flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-400 shrink-0" />
                  <span className="truncate">{inst.currentTask}</span>
                </div>

                {/* Plunderable Resource Bags Strip */}
                <div className="p-3.5 border-b border-[#1a2030] bg-[#0a0d14]/60">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Plunderable RSS Held (Raid Target Value)</span>
                    <span className="text-amber-300 font-bold"> Gems: {rss.gems || '0'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center font-mono">
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-1.5">
                      <div className="text-[9px] text-amber-300/80">FOOD</div>
                      <div className="text-xs font-bold text-amber-200">{rss.food || '0'}</div>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-1.5">
                      <div className="text-[9px] text-emerald-300/80">WOOD</div>
                      <div className="text-xs font-bold text-emerald-200">{rss.wood || '0'}</div>
                    </div>
                    <div className="rounded-lg bg-slate-400/10 border border-slate-400/25 p-1.5">
                      <div className="text-[9px] text-slate-300/80">STONE</div>
                      <div className="text-xs font-bold text-slate-200">{rss.stone || '0'}</div>
                    </div>
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/25 p-1.5">
                      <div className="text-[9px] text-yellow-300/80">GOLD</div>
                      <div className="text-xs font-bold text-yellow-200">{rss.gold || '0'}</div>
                    </div>
                  </div>
                </div>

                {/* 4 Telemetry Quadrant Rows: Building, Farming, T1-Only Training, Sleep/Rotation */}
                <div className="p-4 space-y-3 text-xs">
                  {/* 1. What It's Building */}
                  <div className="rounded-xl bg-[#121723] border border-[#1f293d] p-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-indigo-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Hammer size={12} className="text-indigo-400" />
                        What It&apos;s Building
                      </span>
                      <span>CH Lv.{inst.cityHallLevel || 8}</span>
                    </div>
                    <div className="font-mono text-gray-200 text-xs truncate">
                      {inst.currentBuilding || 'Upgrading City Hall & Resource Mills'}
                    </div>
                  </div>

                  {/* 2. What It's Farming */}
                  <div className="rounded-xl bg-[#121723] border border-[#1f293d] p-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-amber-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Wheat size={12} className="text-amber-400" />
                        What It&apos;s Farming
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                        {fm.status || 'GATHERING'}
                      </span>
                    </div>
                    <div className="font-mono text-gray-200 text-xs flex items-center justify-between">
                      <span>{fm.label || fm.resource || 'FOOD / WOOD Rotation'}</span>
                      <span className="text-slate-400">
                        Node X:{fm.nodeX || '---'} Y:{fm.nodeY || '---'}
                      </span>
                    </div>
                  </div>

                  {/* 3. What Troops It's Training (STRICT T1 ONLY) */}
                  <div className="rounded-xl bg-emerald-950/25 border border-emerald-500/30 p-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-emerald-300 mb-2">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Swords size={12} className="text-emerald-400" />
                        Troop Training (STRICT T1 ONLY)
                      </span>
                      <span className="text-emerald-200 font-bold">
                        ~{Number(tr.estimatedT1Troops || 2400).toLocaleString()} T1 (
                        {Math.round(Number(tr.estimatedT1Troops || 2400) * 0.2)} KP)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                      <div className="px-2 py-1 rounded bg-black/40 border border-white/5 text-slate-200 truncate">
                        🛡️ {tr.infantry || 'T1 Swordsman'}
                      </div>
                      <div className="px-2 py-1 rounded bg-black/40 border border-white/5 text-slate-200 truncate">
                        🏹 {tr.archer || 'T1 Bowman'}
                      </div>
                      <div className="px-2 py-1 rounded bg-black/40 border border-white/5 text-slate-200 truncate">
                        🐎 {tr.cavalry || 'T1 Horseman'}
                      </div>
                      <div className="px-2 py-1 rounded bg-black/40 border border-white/5 text-slate-200 truncate">
                        🪵 {tr.siege || 'T1 Battering Ram'}
                      </div>
                    </div>
                  </div>

                  {/* 4. When It's Sleeping / Rotating & Legal #4197 Slots */}
                  <div className="rounded-xl bg-[#121723] border border-[#1f293d] p-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-purple-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Moon size={12} className="text-purple-400" />
                        Rotation &amp; Sleep Schedule
                      </span>
                      <span>
                        #4197 Legal Bots: {Math.max(1, roster.length)} / {inst.legalSlotsMax || 2}
                      </span>
                    </div>
                    <div className="font-mono text-gray-300 text-[11px] flex items-center justify-between">
                      <span>{inst.sleepStatus || 'AWAKE (ACTIVE SHIFT)'}</span>
                      {inst.nextRotationAt && (
                        <span className="text-slate-400">
                          Next Shift: {new Date(inst.nextRotationAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Instance Operator Action Footer */}
              <div className="p-3 border-t border-[#1a2030] bg-[#090c12] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => triggerOperatorAction('FORCE_BUILDER_BURST', inst.port)}
                  disabled={dispatchingAction === `FORCE_BUILDER_BURST-${inst.port}`}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-200 transition-all cursor-pointer"
                >
                  ⚡ Run T1+Builder Burst
                </button>
                <button
                  type="button"
                  onClick={() => triggerOperatorAction('PROVISION_SECOND_4197', inst.port)}
                  disabled={dispatchingAction === `PROVISION_SECOND_4197-${inst.port}`}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[11px] font-mono font-bold text-purple-200 transition-all cursor-pointer"
                >
                  🔄 Switch / Spawn #4197 Slot
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Black-Box Hostile Scout & Attack Radar */}
      <div className="rounded-2xl border border-rose-500/30 bg-[#0d1119] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-rose-500/20 bg-rose-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="text-rose-400" size={20} />
            <div>
              <h2 className="text-base font-extrabold text-white">
                Black-Box Hostile Recon &amp; Attack Recorder (Who Scouted or Hit Our Bots)
              </h2>
              <p className="text-xs text-slate-400">
                Real-time OCR capture from Watchtower alerts and Mail Battle/Scout Reports across all #4197 bots.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/40">
            {threats.length} Hostile Incident{threats.length === 1 ? '' : 's'} Logged
          </span>
        </div>

        <div className="p-4">
          {threats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700/70 bg-black/20 p-6 text-center space-y-1.5">
              <Eye className="mx-auto text-emerald-400" size={24} />
              <div className="text-sm font-bold text-slate-200">
                Zero Hostile Scouts or Attacks Detected Yet in #4197
              </div>
              <div className="text-xs text-slate-400 max-w-xl mx-auto">
                The Black-Box OCR daemon checks Watchtower borders and Mail <code>REPORT</code> tabs on every rotation
                sweep. The moment any player scouts or hits any bot, their Governor Name, Alliance Tag, Coordinates, and
                screenshot proof are locked here permanently.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Target Bot</th>
                    <th className="py-2.5 px-3">Hostile Player &amp; Alliance</th>
                    <th className="py-2.5 px-3">Coordinates</th>
                    <th className="py-2.5 px-3">OCR Report Excerpt</th>
                    <th className="py-2.5 px-3 text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {threats.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'Live'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                            t.eventType === 'SCOUT'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/25 text-rose-200 border-rose-500/50'
                          }`}
                        >
                          {t.eventType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300 font-bold">
                        {t.targetBot} (:{t.targetPort})
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold">
                        {t.allianceTag ? <span className="text-rose-400 mr-1">[{t.allianceTag}]</span> : null}
                        {t.attackerName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        X:{t.coordinates?.x || 0} Y:{t.coordinates?.y || 0}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-md truncate">{t.rawReportText}</td>
                      <td className="py-2.5 px-3 text-right">
                        {t.screenshotB64 && (
                          <button
                            type="button"
                            onClick={() =>
                              setZoomedImage({
                                title: `${t.eventType} on ${t.targetBot} by ${t.attackerName}`,
                                src: t.screenshotB64,
                              })
                            }
                            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[10px] cursor-pointer"
                          >
                            View Proof
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Chronological Bot Movement & Flight Recorder Ledger */}
      <div className="rounded-2xl border border-[#1e2638] bg-[#0d1119] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1a2030] bg-[#0a0d14] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="text-cyan-400" size={20} />
            <div>
              <h2 className="text-base font-extrabold text-white">
                Black-Box Bot Movement &amp; Action Flight Recorder
              </h2>
              <p className="text-xs text-slate-400">
                Every single movement, T1 training batch, resource node march, building upgrade, and character rotation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'TRAIN_T1_ONLY', 'FARMING_MARCH', 'CITY_BUILDER', 'CHARACTER_SWITCH', 'THREAT_DETECTED'].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter bot or action..."
              className="px-3 py-1 rounded-lg bg-black/50 border border-slate-700 text-xs font-mono text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
          {filteredMovements.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No movement entries match the current filter.</div>
          ) : (
            filteredMovements.map((m) => (
              <div key={m.id} className="px-4 py-2.5 hover:bg-white/5 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-slate-500 text-[11px] shrink-0">
                  {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ''}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold shrink-0">
                  :{m.port} • {m.governorName}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 text-[10px] shrink-0">
                  {m.category}
                </span>
                <span className="text-gray-200 flex-1">{m.action}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="max-w-5xl w-full rounded-2xl border border-cyan-500/40 bg-[#0b0f17] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300">{zoomedImage.title}</span>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <img src={zoomedImage.src} alt={zoomedImage.title} className="w-full h-auto max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function CameraPlaceholder() {
  return (
    <svg className="w-8 h-8 text-slate-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}
