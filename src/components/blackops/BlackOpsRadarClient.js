'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Flame,
  UserX,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Sliders,
  ExternalLink,
} from 'lucide-react';

export default function BlackOpsRadarClient({ locale = 'en' }) {
  const [watchlist, setWatchlist] = useState({ targetsList: [], alertHistory: [], webhookUrl: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [webhookInput, setWebhookInput] = useState('');
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [testAlertStatus, setTestAlertStatus] = useState(null);
  const [liveScannerStatus, setLiveScannerStatus] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('radar'); // 'radar', 'watchlist', 'alerts', 'settings'

  const canvasRef = useRef(null);

  // 1. Fetch Watchlist & Telemetry
  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/black-ops/tracker');
      const data = await res.json();
      if (data.success) {
        setWatchlist(data.watchlist);
        if (data.watchlist.webhookUrl) {
          setWebhookInput(data.watchlist.webhookUrl);
        }
      }
    } catch (e) {
      console.warn('Watchlist fetch error:', e);
    }
  };

  // 2. Poll Scanner Progress from Cluster Hub
  const pollScanner = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8888/status');
      const data = await res.json();
      if (data.liveScanProgress) {
        setLiveScannerStatus(data.liveScanProgress);
      }
    } catch (e) {
      // Hub might be on internal port or proxied
    }
  };

  useEffect(() => {
    fetchWatchlist();
    pollScanner();
    const interval = setInterval(() => {
      fetchWatchlist();
      pollScanner();
    }, 4000);
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
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 4. Lock / Track Target
  const handleTrackTarget = async (gov, priority = 'VIP') => {
    try {
      const res = await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRACK_TARGET',
          govId: gov.govId || gov.id,
          name: gov.name,
          kingdom: gov.kingdomId || gov.kingdom || '4194',
          priority,
          initialData: gov,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchWatchlist();
        setSearchQuery('');
        setSearchResults([]);
        setSelectedTarget(data.target);
      }
    } catch (e) {
      console.error('Track target error:', e);
    }
  };

  // 5. Untrack Target
  const handleUntrackTarget = async (govId) => {
    try {
      const res = await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UNTRACK_TARGET', govId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchWatchlist();
        if (selectedTarget?.govId === govId) setSelectedTarget(null);
      }
    } catch (e) {
      console.error('Untrack error:', e);
    }
  };

  // 6. Send Test Alert to Phone
  const handleSendTestAlert = async () => {
    setIsDispatchingTest(true);
    setTestAlertStatus(null);
    try {
      const res = await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_ALERT',
          webhookUrl: webhookInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestAlertStatus({ success: true, message: data.message });
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 [BLACK OPS RADAR] Target Shift Detected', {
            body: 'Target [D-94] 么krp relocated from (293, 1016) to Zone 3 (640, 810)! Power: 24.3M (+420K)',
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
      alert('Webhook route successfully synchronized!');
    } catch (e) {
      alert('Error updating settings: ' + e.message);
    }
  };

  // 8. 2D Interactive Star Cluster Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = (canvas.width = canvas.parentElement.clientWidth);
    const height = (canvas.height = 550);

    // Pre-calculate stars based on watchlist targets + mock cluster
    const clusterCenters = {
      'D-94': { x: width * 0.35, y: height * 0.4, color: '#ef4444' }, // Red (Dominant War Alliance)
      FaKE: { x: width * 0.65, y: height * 0.35, color: '#f59e0b' }, // Amber
      FOTN: { x: width * 0.5, y: height * 0.7, color: '#3b82f6' }, // Blue
      DP94: { x: width * 0.25, y: height * 0.65, color: '#8b5cf6' }, // Purple
      'A~94': { x: width * 0.75, y: height * 0.65, color: '#10b981' }, // Emerald
      DEFAULT: { x: width * 0.5, y: height * 0.5, color: '#64748b' },
    };

    let pulse = 0;

    const render = () => {
      pulse += 0.04;
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid / Radar Coordinate Rings
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1;
      for (let r = 50; r < Math.max(width, height); r += 70) {
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
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
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
      targets.forEach((target, idx) => {
        const alliance = target.lastKnownAlliance || 'DEFAULT';
        const center = clusterCenters[alliance] || clusterCenters.DEFAULT;
        const angle = (idx * 1.618 * Math.PI * 2) % (Math.PI * 2);
        const radius = 30 + ((target.govId % 100) / 100) * 80;

        const x = target.lastKnownCoords
          ? (target.lastKnownCoords.X / 1200) * width
          : center.x + Math.cos(angle) * radius;
        const y = target.lastKnownCoords
          ? (target.lastKnownCoords.Y / 1200) * height
          : center.y + Math.sin(angle) * radius;

        const isWhale = (target.lastKnownPower || 0) > 10000000;
        const starRadius = isWhale ? 6.5 : 4.0;
        const glowRadius = starRadius * (1.5 + Math.sin(pulse + idx) * 0.4);

        // Glow halo
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius * 3);
        const color = target.priority === 'ENEMY_WHALE' ? '239, 68, 68' : '16, 185, 129';
        glow.addColorStop(0, `rgba(${color}, 0.8)`);
        glow.addColorStop(0.5, `rgba(${color}, 0.2)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Star Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, starRadius, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Reticle for active target
        ctx.strokeStyle = `rgba(${color}, ${0.4 + Math.sin(pulse * 2) * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, starRadius + 8 + Math.sin(pulse * 3) * 3, 0, Math.PI * 2);
        ctx.stroke();

        // Target Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px monospace';
        ctx.fillText(`[${target.lastKnownAlliance || 'None'}] ${target.name}`, x + 12, y - 4);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(
          `${(target.lastKnownPower / 1e6).toFixed(1)}M • (${target.lastKnownCoords ? `${target.lastKnownCoords.X},${target.lastKnownCoords.Y}` : 'Locked'})`,
          x + 12,
          y + 8
        );
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [watchlist]);

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
                    liveScannerStatus?.running ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                LIVE SCANNER: {liveScannerStatus?.status || 'ONLINE'}
              </div>
              <div className="text-xs font-mono font-bold text-white">
                Rank {liveScannerStatus?.currentRank || 32} / {liveScannerStatus?.targetRanks || 650} (
                {liveScannerStatus?.percent || 4.9}%)
              </div>
            </div>

            <button
              onClick={requestPushPermission}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
                pushEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <Bell className="w-4 h-4" />
              {pushEnabled ? 'PHONE PUSH: ARMED' : 'ENABLE PHONE PUSH'}
            </button>

            <a
              href="/api/black-ops/tracker?export=csv"
              download="Kingdom_4194_Live_Telemetric.csv"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              EXPORT CSV
            </a>
          </div>
        </div>
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
                placeholder="Enter ID (e.g. 236264666) or name..."
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
              <div className="mt-3 max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800">
                {searchResults.map((gov) => (
                  <div
                    key={gov.id || gov.govId}
                    className="pt-2 flex items-center justify-between text-xs hover:bg-slate-800/40 p-2 rounded-lg transition-all"
                  >
                    <div>
                      <div className="font-bold text-white font-mono flex items-center gap-1.5">
                        <span className="text-emerald-400">[{gov.alliance || 'None'}]</span> {gov.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {gov.govId || gov.id} • {((gov.power || 0) / 1e6).toFixed(2)}M Pwr •{' '}
                        {gov.castlePos ? `(${gov.castlePos.X}, ${gov.castlePos.Y})` : 'Grid Locked'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleTrackTarget(gov, 'VIP')}
                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-mono font-bold text-[10px] rounded border border-emerald-500/40 transition-all flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3" /> TRACK
                    </button>
                  </div>
                ))}
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

            {(!watchlist.targetsList || watchlist.targetsList.length === 0) ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs">
                No targets locked yet. Search above to put a tracking radar on any governor.
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {watchlist.targetsList.map((target) => (
                  <div
                    key={target.govId}
                    className="p-3 bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 rounded-xl transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                          <span className="text-emerald-400">[{target.lastKnownAlliance || 'None'}]</span>
                          {target.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {target.govId} • Rank #{target.currentRank || '--'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUntrackTarget(target.govId)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove Target"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                        <span className="text-slate-400">Power:</span>{' '}
                        <span className="text-white font-bold">
                          {((target.lastKnownPower || 0) / 1e6).toFixed(2)}M
                        </span>
                      </div>
                      <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                        <span className="text-slate-400">Grid Pos:</span>{' '}
                        <span className="text-emerald-400 font-bold">
                          {target.lastKnownCoords
                            ? `(${target.lastKnownCoords.X}, ${target.lastKnownCoords.Y})`
                            : 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Movement History / Coordinate Shifts */}
                    {target.movementHistory && target.movementHistory.length > 0 && (
                      <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] font-mono text-rose-300">
                        <div className="font-bold flex items-center gap-1 mb-0.5">
                          <MapPin className="w-3 h-3 text-rose-400" /> COORDINATE SHIFT DETECTED
                        </div>
                        {target.movementHistory.slice(-2).map((m, idx) => (
                          <div key={idx} className="text-[9px] text-slate-300">
                            Jumped {m.distance} tiles to ({m.to?.X}, {m.to?.Y})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center / Right Columns: Star Cluster Canvas & Mobile Webhook Station */}
        <div className="lg:col-span-2 space-y-6">
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
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> War Alliance [D-94]
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
              <canvas ref={canvasRef} className="w-full block" />
              <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300">
                Radar Range: Complete Kingdom #4194 Field
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
                onClick={handleSaveSettings}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap"
              >
                SAVE WEBHOOK
              </button>
              <button
                onClick={handleSendTestAlert}
                disabled={isDispatchingTest}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
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
