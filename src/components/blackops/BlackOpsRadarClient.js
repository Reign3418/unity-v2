'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Crosshair,
  Search,
  ShieldAlert,
  Bell,
  Send,
  Download,
  RefreshCw,
  MapPin,
  Activity,
  Zap,
  Radio,
  UserX,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Shield,
  Swords,
  Skull,
  Award,
  Flame,
  Eye,
} from 'lucide-react';
import { enrichGovernorWithRatios } from '@/lib/telemetryAnalytics';

const LOCAL_STORAGE_KEY = 'valheon_blackops_watchlist_v2';

function loadLocalTargets() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveLocalTargets(targetsList) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(targetsList || []));
  } catch (e) {}
}

function buildClientTargetObject(gov, priority = 'VIP') {
  const enriched = enrichGovernorWithRatios(gov);
  const govId = Number(enriched.govId || enriched.id || 0);
  const coords =
    enriched.castlePos ||
    (enriched.mapTileX && enriched.mapTileY
      ? { X: Number(enriched.mapTileX), Y: Number(enriched.mapTileY) }
      : null);

  return {
    govId,
    id: String(govId),
    name: enriched.name || `Governor_${govId}`,
    kingdom: String(enriched.kingdomId || enriched.kingdom || '4194'),
    priority,
    addedAt: new Date().toISOString(),
    lastKnownCoords: coords,
    lastKnownPower: Number(enriched.power || 0),
    lastKnownAlliance: enriched.alliance || 'None',
    lastKnownKp: Number(enriched.killPoints || 0),
    lastKnownDeads: Number(enriched.dead || 0),
    currentRank: enriched.rank || null,
    liveTelemetry: enriched,
    movementHistory: [],
    deltas: { power: 0, kp: 0, deads: 0, moved: false },
    active: true,
  };
}

export default function BlackOpsRadarClient({ locale = 'en' }) {
  const [watchlist, setWatchlist] = useState({
    targetsList: [],
    alertHistory: [],
    webhookUrl: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [webhookInput, setWebhookInput] = useState('');
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [testAlertStatus, setTestAlertStatus] = useState(null);
  const [liveScannerStatus, setLiveScannerStatus] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [lockFeedback, setLockFeedback] = useState(null);

  const canvasRef = useRef(null);
  const renderedStarsRef = useRef([]);

  // Hydrate from localStorage immediately on mount
  useEffect(() => {
    const localList = loadLocalTargets();
    if (localList.length > 0) {
      setWatchlist((prev) => ({
        ...prev,
        targetsList: localList,
      }));
      setSelectedTarget((prev) => prev || localList[0]);
    }
  }, []);

  // 1. Fetch Watchlist & Merge with Local Persistence
  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/black-ops/tracker');
      const data = await res.json();
      if (data.success && data.watchlist) {
        const serverList = data.watchlist.targetsList || [];
        const localList = loadLocalTargets();

        // Merge server targets with any local targets so targets never vanish on serverless cold starts
        const mergedMap = new Map();
        localList.forEach((t) => mergedMap.set(String(t.govId), t));
        serverList.forEach((t) => mergedMap.set(String(t.govId), t));

        const mergedList = Array.from(mergedMap.values());
        saveLocalTargets(mergedList);

        // If local had targets that server didn't know about, sync them up in the background
        if (localList.length > serverList.length) {
          fetch('/api/black-ops/tracker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'SYNC_LOCAL_TARGETS',
              localTargets: mergedList,
            }),
          }).catch(() => {});
        }

        setWatchlist({
          ...data.watchlist,
          targetsList: mergedList,
        });

        setSelectedTarget((prev) => {
          if (!prev && mergedList.length > 0) return mergedList[0];
          if (prev) {
            const updated = mergedList.find((t) => String(t.govId) === String(prev.govId));
            return updated || prev;
          }
          return null;
        });

        if (data.watchlist.webhookUrl && !webhookInput) {
          setWebhookInput(data.watchlist.webhookUrl);
        }
      }
    } catch (e) {
      console.warn('Watchlist fetch error:', e);
    }
  };

  // 2. Poll Scanner Progress
  const pollScanner = async () => {
    try {
      const res = await fetch('/api/bastion');
      if (res.ok) {
        const data = await res.json();
        if (data?.scanProgress) {
          setLiveScannerStatus(data.scanProgress);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchWatchlist();
    pollScanner();
    const interval = setInterval(() => {
      fetchWatchlist();
      pollScanner();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check Notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setPushEnabled(perm === 'granted');
      if (perm === 'granted') {
        new Notification('🛰️ Black Ops Star Cluster Radar Online', {
          body: 'Mobile Push Notifications active for Kingdom #4194 VIP target shifts.',
          icon: '/logo-smooth-dark.png',
        });
      }
    }
  };

  // 3. Search Governors (Instant Filter)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/black-ops/tracker?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.searchResults || []);
        }
      } catch (e) {
        console.warn('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 4. Lock / Track Target (Optimistic + Persistent)
  const handleTrackTarget = async (gov, priority = 'VIP') => {
    const optimisticTarget = buildClientTargetObject(gov, priority);

    // Immediately lock target in UI & localStorage so it never disappears
    setWatchlist((prev) => {
      const filtered = (prev.targetsList || []).filter(
        (t) => String(t.govId) !== String(optimisticTarget.govId)
      );
      const nextList = [optimisticTarget, ...filtered];
      saveLocalTargets(nextList);
      return {
        ...prev,
        targetsList: nextList,
      };
    });

    setSelectedTarget(optimisticTarget);
    setSearchQuery('');
    setSearchResults([]);
    setLockFeedback(`RADAR LOCK ACQUIRED: [${optimisticTarget.lastKnownAlliance}] ${optimisticTarget.name}`);
    setTimeout(() => setLockFeedback(null), 4000);

    try {
      const res = await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRACK_TARGET',
          govId: optimisticTarget.govId,
          name: optimisticTarget.name,
          kingdom: optimisticTarget.kingdom,
          priority,
          initialData: gov,
        }),
      });
      const data = await res.json();
      if (data.success && data.target) {
        setSelectedTarget(data.target);
        if (data.watchlist?.targetsList) {
          const localList = loadLocalTargets();
          const mergedMap = new Map();
          localList.forEach((t) => mergedMap.set(String(t.govId), t));
          data.watchlist.targetsList.forEach((t) => mergedMap.set(String(t.govId), t));
          const merged = Array.from(mergedMap.values());
          saveLocalTargets(merged);
          setWatchlist({
            ...data.watchlist,
            targetsList: merged,
          });
        }
      }
    } catch (e) {
      console.error('Track target server sync error:', e);
    }
  };

  // 5. Untrack Target
  const handleUntrackTarget = async (govId, e) => {
    if (e) e.stopPropagation();
    const idStr = String(govId);

    setWatchlist((prev) => {
      const nextList = (prev.targetsList || []).filter((t) => String(t.govId) !== idStr);
      saveLocalTargets(nextList);
      if (String(selectedTarget?.govId) === idStr) {
        setSelectedTarget(nextList[0] || null);
      }
      return {
        ...prev,
        targetsList: nextList,
      };
    });

    try {
      await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UNTRACK_TARGET', govId }),
      });
    } catch (err) {
      console.error('Untrack error:', err);
    }
  };

  // 6. Send Test / Target Alert to Phone
  const handleSendTestAlert = async (customTarget = null) => {
    setIsDispatchingTest(true);
    setTestAlertStatus(null);
    const activeTgt = customTarget || selectedTarget;
    try {
      const res = await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_ALERT',
          webhookUrl: webhookInput,
          govId: activeTgt?.govId || 235824876,
          name: activeTgt
            ? `[${activeTgt.lastKnownAlliance || 'None'}] ${activeTgt.name}`
            : '[FaKE] 么krp',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestAlertStatus({ success: true, message: data.message });
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 [BLACK OPS RADAR] Target Shift Detected', {
            body: `Target ${activeTgt ? activeTgt.name : '么krp'} locked on Star Cluster Radar! Power: ${(
              (activeTgt?.lastKnownPower || 24269135) / 1e6
            ).toFixed(2)}M`,
            icon: '/logo-smooth-dark.png',
          });
        }
      } else {
        setTestAlertStatus({ success: false, message: data.error || 'Failed to dispatch alert' });
      }
    } catch (e) {
      setTestAlertStatus({ success: false, message: e.message });
    } finally {
      setIsDispatchingTest(false);
    }
  };

  // 7. Save Webhook Settings
  const handleSaveSettings = async () => {
    try {
      await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SETTINGS',
          webhookUrl: webhookInput,
        }),
      });
      setTestAlertStatus({ success: true, message: 'Webhook endpoint saved and armed!' });
    } catch (e) {
      setTestAlertStatus({ success: false, message: 'Error updating settings: ' + e.message });
    }
  };

  // 8. 2D Interactive Star Cluster Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = (canvas.width = canvas.parentElement.clientWidth);
    const height = (canvas.height = 460);

    const clusterCenters = {
      'D-94': { x: width * 0.35, y: height * 0.4, color: '#ef4444' },
      FaKE: { x: width * 0.65, y: height * 0.35, color: '#f59e0b' },
      FOTN: { x: width * 0.5, y: height * 0.7, color: '#3b82f6' },
      DP94: { x: width * 0.25, y: height * 0.65, color: '#8b5cf6' },
      'A~94': { x: width * 0.75, y: height * 0.65, color: '#10b981' },
      OE94: { x: width * 0.45, y: height * 0.28, color: '#06b6d4' },
      DEFAULT: { x: width * 0.5, y: height * 0.5, color: '#10b981' },
    };

    let pulse = 0;

    const render = () => {
      pulse += 0.04;
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid / Radar Coordinate Rings
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1;
      for (let r = 50; r < Math.max(width, height); r += 65) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshairs
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // Radar Sweep line
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(pulse * 0.5);
      const gradient = ctx.createLinearGradient(0, 0, width * 0.5, 0);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, width * 0.6, 0, 0.35);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();

      // Render Tracked Targets as Glowing Star Nodes
      const targets = watchlist.targetsList || [];
      const clickableNodes = [];

      targets.forEach((target, idx) => {
        const alliance = target.lastKnownAlliance || 'DEFAULT';
        const center = clusterCenters[alliance] || clusterCenters.DEFAULT;
        const seed = Number(target.govId || idx + 1);
        const angle = ((seed % 360) * Math.PI) / 180;
        const radius = 25 + ((seed % 100) / 100) * 95;

        const x =
          target.lastKnownCoords && target.lastKnownCoords.X
            ? Math.min(width - 40, Math.max(40, (target.lastKnownCoords.X / 1200) * width))
            : Math.min(width - 60, Math.max(60, center.x + Math.cos(angle) * radius));
        const y =
          target.lastKnownCoords && target.lastKnownCoords.Y
            ? Math.min(height - 30, Math.max(30, (target.lastKnownCoords.Y / 1200) * height))
            : Math.min(height - 40, Math.max(40, center.y + Math.sin(angle) * radius));

        clickableNodes.push({ x, y, target });

        const isSelected = String(selectedTarget?.govId) === String(target.govId);
        const isWhale = (target.lastKnownPower || 0) > 10000000;
        const starRadius = isSelected ? 8 : isWhale ? 6.5 : 4.5;
        const glowRadius = starRadius * (1.6 + Math.sin(pulse + idx) * 0.4);

        // Glow halo
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius * 3.5);
        const color = isSelected
          ? '6, 182, 212'
          : target.priority === 'ENEMY_WHALE'
          ? '239, 68, 68'
          : '16, 185, 129';
        glow.addColorStop(0, `rgba(${color}, 0.9)`);
        glow.addColorStop(0.5, `rgba(${color}, 0.25)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Star Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, starRadius, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Target Lock Reticle
        ctx.strokeStyle = `rgba(${color}, ${isSelected ? 0.9 : 0.45 + Math.sin(pulse * 2) * 0.35})`;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(x, y, starRadius + 9 + Math.sin(pulse * 3) * 3, 0, Math.PI * 2);
        ctx.stroke();

        if (isSelected) {
          // Crosshair ticks around selected target
          const rOuter = starRadius + 18;
          ctx.beginPath();
          ctx.moveTo(x - rOuter, y);
          ctx.lineTo(x - starRadius - 6, y);
          ctx.moveTo(x + starRadius + 6, y);
          ctx.lineTo(x + rOuter, y);
          ctx.moveTo(x, y - rOuter);
          ctx.lineTo(x, y - starRadius - 6);
          ctx.moveTo(x, y + starRadius + 6);
          ctx.lineTo(x, y + rOuter);
          ctx.stroke();
        }

        // Target Label
        ctx.fillStyle = isSelected ? '#22d3ee' : '#f8fafc';
        ctx.font = isSelected ? 'bold 11px monospace' : '10px monospace';
        ctx.fillText(`[${target.lastKnownAlliance || 'None'}] ${target.name}`, x + 14, y - 4);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(
          `${((target.lastKnownPower || 0) / 1e6).toFixed(2)}M Pwr • ${
            target.lastKnownCoords
              ? `(${target.lastKnownCoords.X}, ${target.lastKnownCoords.Y})`
              : `Zone Sector [${alliance}]`
          }`,
          x + 14,
          y + 9
        );
      });

      renderedStarsRef.current = clickableNodes;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [watchlist, selectedTarget]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (const node of renderedStarsRef.current) {
      const dx = clickX - node.x;
      const dy = clickY - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 28) {
        setSelectedTarget(node.target);
        break;
      }
    }
  };

  // Enrich selectedTarget's liveTelemetry with ratios ($0 tokens)
  const activeDossier = selectedTarget
    ? enrichGovernorWithRatios({
        ...(selectedTarget.liveTelemetry || {}),
        govId: selectedTarget.govId,
        name: selectedTarget.name,
        alliance: selectedTarget.lastKnownAlliance,
        power: selectedTarget.liveTelemetry?.power || selectedTarget.lastKnownPower,
        killPoints: selectedTarget.liveTelemetry?.killPoints || selectedTarget.lastKnownKp,
        dead: selectedTarget.liveTelemetry?.dead || selectedTarget.lastKnownDeads,
        rank: selectedTarget.currentRank || selectedTarget.liveTelemetry?.rank,
      })
    : null;

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 font-sans p-4 md:p-8">
      {/* Top Tactical Status HUD */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-emerald-500/20 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <Radio className="w-3 h-3 animate-pulse" /> CLASSIFIED BLACK OPS
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Compass className="w-3 h-3" /> RADAR ACTIVE • KD #4194
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Crosshair className="w-7 h-7 text-emerald-400" />
              GOV HUNTER & STAR CLUSTER RADAR
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Live Coordinate Shift Detection • Whale Power Spikes • Instant Mobile Alert Dispatch
            </p>
          </div>

          {/* Quick Actions & Scanner Live Status */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-right">
              <div className="text-[10px] font-mono text-slate-400 flex items-center justify-end gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    liveScannerStatus?.running ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'
                  }`}
                />
                LIVE SCANNER: {liveScannerStatus?.status || 'SCANNING_LIVE'}
              </div>
              <div className="text-xs font-mono font-bold text-white">
                Rank {liveScannerStatus?.currentRank || 650} / {liveScannerStatus?.targetRanks || 650} (
                {liveScannerStatus?.percent || 100}%)
              </div>
            </div>

            <button
              onClick={requestPushPermission}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                pushEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <Bell className="w-4 h-4" />
              {pushEnabled ? 'PHONE PUSH: ARMED' : 'ENABLE PHONE PUSH'}
            </button>
          </div>
        </div>

        {/* Instant Lock Confirmation Banner */}
        {lockFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center justify-between animate-pulse">
            <span className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lockFeedback}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-emerald-400">
              Telemetry Dossier & Reticle Active
            </span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Target Watchlist */}
        <div className="space-y-6">
          {/* Target Search Box */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm shadow-xl">
            <label className="text-xs font-mono uppercase text-slate-400 font-bold mb-2 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-emerald-400" /> SEARCH GOVERNOR ID OR NAME
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter ID (e.g. 235824876) or name (e.g. krp)..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Instant Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/80">
                {searchResults.map((gov) => {
                  const isAlreadyTracked = (watchlist.targetsList || []).some(
                    (t) => String(t.govId) === String(gov.govId || gov.id)
                  );
                  return (
                    <div
                      key={gov.id || gov.govId}
                      onClick={() => handleTrackTarget(gov, 'VIP')}
                      className="pt-2 flex items-center justify-between text-xs hover:bg-slate-800/60 p-2 rounded-lg transition-all cursor-pointer group"
                    >
                      <div>
                        <div className="font-bold text-white font-mono flex items-center gap-1.5 group-hover:text-emerald-300">
                          <span className="text-emerald-400">[{gov.alliance || 'None'}]</span> {gov.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {gov.govId || gov.id} • {((gov.power || 0) / 1e6).toFixed(2)}M Pwr • KP:{' '}
                          {((gov.killPoints || 0) / 1e6).toFixed(2)}M •{' '}
                          {gov.castlePos ? `(${gov.castlePos.X}, ${gov.castlePos.Y})` : 'Grid Locked'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrackTarget(gov, 'VIP');
                        }}
                        className={`px-2.5 py-1 font-mono font-bold text-[10px] rounded border transition-all flex items-center gap-1 cursor-pointer ${
                          isAlreadyTracked
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border-emerald-500/40'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" /> {isAlreadyTracked ? 'VIEW LOCK' : 'TRACK'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Target Watchlist */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h2 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                ACTIVE WATCHLIST ({watchlist.targetsList?.length || 0})
              </h2>
              <span className="text-[10px] font-mono text-emerald-400">RADAR LOCK ARMED</span>
            </div>

            {!watchlist.targetsList || watchlist.targetsList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs">
                No targets locked yet. Search above and click TRACK to lock a governor onto the radar.
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {watchlist.targetsList.map((target) => {
                  const isSelected = String(selectedTarget?.govId) === String(target.govId);
                  const enriched = enrichGovernorWithRatios(target.liveTelemetry || target);
                  return (
                    <div
                      key={target.govId}
                      onClick={() => setSelectedTarget(target)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/30 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                          : 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                            <span className="text-emerald-400">[{target.lastKnownAlliance || 'None'}]</span>
                            {target.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>ID: {target.govId}</span>
                            <span>•</span>
                            <span>Rank #{target.currentRank || enriched.rank || '--'}</span>
                            <span>•</span>
                            <span className="text-cyan-400">{enriched.tacticalClassification}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleUntrackTarget(target.govId, e)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          title="Remove Target"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-2.5 grid grid-cols-3 gap-2 text-[10px] font-mono">
                        <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[9px]">POWER</span>
                          <span className="text-white font-bold">
                            {((target.lastKnownPower || 0) / 1e6).toFixed(2)}M
                          </span>
                        </div>
                        <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[9px]">WAR KILL %</span>
                          <span className="text-emerald-400 font-bold">{enriched.warKillRatio}</span>
                        </div>
                        <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[9px]">GRID POS</span>
                          <span className="text-cyan-300 font-bold">
                            {target.lastKnownCoords
                              ? `(${target.lastKnownCoords.X}, ${target.lastKnownCoords.Y})`
                              : 'Sector Lock'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center / Right Columns: Locked Target Dossier, Star Cluster Canvas & Mobile Webhook Station */}
        <div className="lg:col-span-2 space-y-6">
          {/* LOCKED TARGET INTELLIGENCE DOSSIER */}
          {activeDossier && (
            <div className="bg-slate-900/80 border border-cyan-500/40 rounded-2xl p-5 backdrop-blur-sm shadow-[0_0_30px_rgba(6,182,212,0.12)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> TARGET LOCKED ON RADAR
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {activeDossier.tacticalClassification}
                    </span>
                    {activeDossier.rank && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        RANK #{activeDossier.rank}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
                    <span className="text-emerald-400">[{activeDossier.alliance || 'None'}]</span>
                    <span>{activeDossier.name}</span>
                    <span className="text-xs font-normal text-slate-400">(ID: {activeDossier.govId})</span>
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendTestAlert(selectedTarget)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> PING TARGET TO PHONE
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleUntrackTarget(activeDossier.govId, e)}
                    className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" /> RELEASE LOCK
                  </button>
                </div>
              </div>

              {/* 6-Card Strategic War Ratios ($0 Token Math) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mb-4 font-mono">
                <div className="p-2.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl">
                  <div className="text-[9px] text-slate-400 uppercase">War Kill Ratio</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {activeDossier.warKillRatio}
                  </div>
                  <div className="text-[9px] text-slate-500">T4+T5 / Total Kills</div>
                </div>

                <div className="p-2.5 bg-slate-950/80 border border-amber-500/30 rounded-xl">
                  <div className="text-[9px] text-slate-400 uppercase">T1 Farm Padding</div>
                  <div className="text-base font-black text-amber-400 mt-0.5">
                    {activeDossier.t1PaddingRatio}
                  </div>
                  <div className="text-[9px] text-slate-500">T1 / Total Kills</div>
                </div>

                <div className="p-2.5 bg-slate-950/80 border border-cyan-500/30 rounded-xl">
                  <div className="text-[9px] text-slate-400 uppercase">KP / Power Ratio</div>
                  <div className="text-base font-black text-cyan-400 mt-0.5">
                    {activeDossier.kpToPowerRatio}x
                  </div>
                  <div className="text-[9px] text-slate-500">Combat Efficiency</div>
                </div>

                <div className="p-2.5 bg-slate-950/80 border border-rose-500/30 rounded-xl">
                  <div className="text-[9px] text-slate-400 uppercase">Sacrifice / Dead %</div>
                  <div className="text-base font-black text-rose-400 mt-0.5">
                    {activeDossier.deadToPowerPct}
                  </div>
                  <div className="text-[9px] text-slate-500">Deads / Power</div>
                </div>

                <div className="p-2.5 bg-slate-950/80 border border-purple-500/30 rounded-xl">
                  <div className="text-[9px] text-slate-400 uppercase">Troop / Tech Split</div>
                  <div className="text-xs font-black text-purple-300 mt-1">
                    {activeDossier.troopPowerPct} / {activeDossier.techPowerPct}
                  </div>
                  <div className="text-[9px] text-slate-500">Bldg: {activeDossier.buildingPowerPct}</div>
                </div>

                <div className="p-2.5 bg-slate-950/80 border border-blue-500/30 rounded-xl">
                  <div className="text-[9px] text-slate-400 uppercase">Battle Win Rate</div>
                  <div className="text-base font-black text-blue-400 mt-0.5">
                    {activeDossier.winRatePct}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {activeDossier.victories.toLocaleString()}W / {activeDossier.defeats.toLocaleString()}L
                  </div>
                </div>
              </div>

              {/* Raw Telemetry Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">TOTAL POWER / PEAK</span>
                  <span className="text-white font-bold">{activeDossier.power.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">
                    Peak: {activeDossier.highestPower.toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">KILL POINTS / WAR KILLS</span>
                  <span className="text-emerald-400 font-bold">{activeDossier.killPoints.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">
                    T4+T5 Kills: {activeDossier.warKills.toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">DEADS / HEALED TROOPS</span>
                  <span className="text-rose-400 font-bold">{activeDossier.dead.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">
                    Healed: {activeDossier.healedTroops.toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">RSS GATHERED / ASSIST</span>
                  <span className="text-amber-300 font-bold">
                    {(activeDossier.rssGathered / 1e6).toFixed(1)}M
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Assist: {(activeDossier.rssAssistance / 1e6).toFixed(1)}M • Helps:{' '}
                    {activeDossier.allianceHelps.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Tier-by-Tier Kill Ledger */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-5 gap-2 text-center font-mono text-[10px]">
                <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800/60">
                  <span className="text-slate-500 block">T1 KILLS</span>
                  <span className="text-slate-300 font-bold">{activeDossier.t1Kills.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800/60">
                  <span className="text-slate-500 block">T2 KILLS</span>
                  <span className="text-slate-300 font-bold">{activeDossier.t2Kills.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800/60">
                  <span className="text-slate-500 block">T3 KILLS</span>
                  <span className="text-slate-300 font-bold">{activeDossier.t3Kills.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-emerald-500/20">
                  <span className="text-emerald-400 block">T4 KILLS ({activeDossier.t4KillPct})</span>
                  <span className="text-emerald-300 font-bold">{activeDossier.t4Kills.toLocaleString()}</span>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-rose-500/20">
                  <span className="text-rose-400 block">T5 KILLS ({activeDossier.t5KillPct})</span>
                  <span className="text-rose-300 font-bold">{activeDossier.t5Kills.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tactical Star Cluster Canvas */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-mono font-bold uppercase text-slate-200">
                  TACTICAL STAR CLUSTER & TERRITORY RADAR (1200x1200 GRID)
                </h2>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> [D-94]
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> [FaKE]
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> [FOTN]
                </span>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-800/80 bg-[#020408]">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full block cursor-crosshair"
              />
              <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300">
                Radar Range: Complete Kingdom #4194 Field • Locked Targets:{' '}
                <span className="text-emerald-400 font-bold">{watchlist.targetsList?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Mobile Webhook & Star Cluster Alert Dispatcher */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-mono font-bold uppercase text-slate-200">
                  MOBILE DISPATCH: SEND STAR CLUSTER ALERTS TO PHONE
                </h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                INSTANT DISCORD / PUSHOVER / WEBHOOK
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mb-4">
              When any tracked governor moves coordinates, spikes power, or changes alliance, Valheon Black Ops
              immediately transmits an emergency dispatch payload to your mobile device.
            </p>

            <div className="flex flex-col md:flex-row gap-3 items-center mb-3">
              <input
                type="text"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="Enter Discord Webhook URL / Pushover endpoint..."
                className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono w-full"
              />
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer"
              >
                SAVE WEBHOOK
              </button>
              <button
                type="button"
                onClick={() => handleSendTestAlert()}
                disabled={isDispatchingTest}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {isDispatchingTest ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                SEND TEST ALERT TO PHONE
              </button>
            </div>

            {testAlertStatus && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  testAlertStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {testAlertStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                {testAlertStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
