'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Crosshair,
  Search,
  Bell,
  Send,
  RefreshCw,
  MapPin,
  Zap,
  Radio,
  UserX,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Eye,
  Bot,
  Cpu,
  ShieldCheck,
  Radar,
  Copy,
  Check,
  Navigation,
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
    enriched.mapTileX && enriched.mapTileY
      ? { X: Number(enriched.mapTileX), Y: Number(enriched.mapTileY) }
      : enriched.castlePos || null;

  return {
    govId,
    id: String(govId),
    name: enriched.name || `Governor_${govId}`,
    kingdom: String(enriched.kingdomId || enriched.kingdom || '4194'),
    priority,
    addedAt: new Date().toISOString(),
    lastKnownCoords: coords,
    coordSource: enriched.coordSource || null,
    lastKnownPower: Number(enriched.power || 0),
    lastKnownAlliance: enriched.alliance || 'None',
    lastKnownKp: Number(enriched.killPoints || 0),
    lastKnownDeads: Number(enriched.dead || 0),
    currentRank: enriched.rank || null,
    liveTelemetry: enriched,
    movementHistory: [],
    deltas: { power: 0, kp: 0, deads: 0, moved: false },
    bastionStatus: {
      ring1Scout: 'SURGE_1H_ARMED',
      ring2Tank: 'SIDEKICK_NODE_0_LOCKED',
      ring2NumNum: 'PASS_0_TOKENS',
      ring3Dozer: 'SLICE_DELTA_WATCH',
    },
    active: true,
  };
}

export default function BlackOpsRadarClient({ locale = 'en' }) {
  const [watchlist, setWatchlist] = useState({
    targetsList: [],
    alertHistory: [],
    bastionRingEvents: [],
    webhookUrl: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [webhookInput, setWebhookInput] = useState('');
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [isDispatchingRecon, setIsDispatchingRecon] = useState(false);
  const [testAlertStatus, setTestAlertStatus] = useState(null);
  const [liveScannerStatus, setLiveScannerStatus] = useState(null);
  const [bastionTelemetry, setBastionTelemetry] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [lockFeedback, setLockFeedback] = useState(null);
  const [pinX, setPinX] = useState('');
  const [pinY, setPinY] = useState('');
  const [isPinningCoords, setIsPinningCoords] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [hoverMapCoords, setHoverMapCoords] = useState(null);

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

  // Update pinX / pinY inputs when selectedTarget changes
  useEffect(() => {
    if (selectedTarget) {
      const enriched = enrichGovernorWithRatios({
        ...(selectedTarget.liveTelemetry || {}),
        govId: selectedTarget.govId,
        alliance: selectedTarget.lastKnownAlliance,
        castlePos: selectedTarget.lastKnownCoords || selectedTarget.liveTelemetry?.castlePos,
        coordSource: selectedTarget.coordSource,
      });
      setPinX(String(enriched.mapTileX || enriched.displayX || ''));
      setPinY(String(enriched.mapTileY || enriched.displayY || ''));
    }
  }, [selectedTarget?.govId, selectedTarget?.lastKnownCoords?.X, selectedTarget?.lastKnownCoords?.Y]);

  // 1. Fetch Watchlist & Merge with Local Persistence
  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/black-ops/tracker');
      const data = await res.json();
      if (data.success && data.watchlist) {
        const serverList = data.watchlist.targetsList || [];
        const localList = loadLocalTargets();

        const mergedMap = new Map();
        localList.forEach((t) => mergedMap.set(String(t.govId), t));
        serverList.forEach((t) => {
          const prevLocal = mergedMap.get(String(t.govId));
          // Preserve locally pinned coordinates if server hasn't caught up yet
          if (prevLocal?.coordSource === 'MANUAL_PIN' && prevLocal?.lastKnownCoords && !t.lastKnownCoords) {
            mergedMap.set(String(t.govId), {
              ...t,
              lastKnownCoords: prevLocal.lastKnownCoords,
              coordSource: prevLocal.coordSource || 'MANUAL_PIN',
              movementHistory: prevLocal.movementHistory || t.movementHistory || [],
            });
          } else {
            mergedMap.set(String(t.govId), t);
          }
        });

        let mergedList = Array.from(mergedMap.values());
        const serverIds = new Set(serverList.map((s) => String(s.govId)));
        const hasUnsyncedLocal = localList.some((l) => !serverIds.has(String(l.govId)));

        if (hasUnsyncedLocal) {
          try {
            const syncRes = await fetch('/api/black-ops/tracker', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'SYNC_LOCAL_TARGETS',
                localTargets: mergedList,
              }),
            });
            const syncData = await syncRes.json();
            if (syncData?.success && syncData?.watchlist?.targetsList) {
              mergedList = syncData.watchlist.targetsList;
            }
          } catch {}
        }

        saveLocalTargets(mergedList);

        setWatchlist({
          ...data.watchlist,
          targetsList: mergedList,
          bastionRingEvents: data.watchlist.bastionRingEvents || [],
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

  // 2. Poll Bastion MoE Ring State & Scanner Progress
  const pollBastionRing = async () => {
    try {
      const res = await fetch('/api/bastion');
      if (res.ok) {
        const data = await res.json();
        if (data?.activeScanProgress) {
          setLiveScannerStatus(data.activeScanProgress);
        }
        if (data?.state) {
          setBastionTelemetry(data.state);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchWatchlist();
    pollBastionRing();
    const interval = setInterval(() => {
      fetchWatchlist();
      pollBastionRing();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  // 4. Lock / Track Target + Command Bastion MoE Ring
  const handleTrackTarget = async (gov, priority = 'VIP') => {
    const optimisticTarget = buildClientTargetObject(gov, priority);

    const optimisticBastionEvt = {
      id: `evt-local-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agent: 'SCOUT + NUMNUM + DOZER',
      ring: 'RING 1 -> RING 2 -> RING 3',
      action: 'BLACK_OPS_TARGET_LOCK',
      kingdom: '4194',
      detail: `Locked [${optimisticTarget.lastKnownAlliance}] ${optimisticTarget.name} (ID: ${optimisticTarget.govId}). SCOUT escalated #4194 to 1h Surge Cadence; DOZER armed for slice delta interception.`,
    };

    setWatchlist((prev) => {
      const filtered = (prev.targetsList || []).filter(
        (t) => String(t.govId) !== String(optimisticTarget.govId)
      );
      const nextList = [optimisticTarget, ...filtered];
      saveLocalTargets(nextList);
      return {
        ...prev,
        targetsList: nextList,
        bastionRingEvents: [optimisticBastionEvt, ...(prev.bastionRingEvents || [])].slice(0, 30),
      };
    });

    setSelectedTarget(optimisticTarget);
    setSearchQuery('');
    setSearchResults([]);
    setLockFeedback(
      `BASTION RING LOCK ACQUIRED: [${optimisticTarget.lastKnownAlliance}] ${optimisticTarget.name} -> SCOUT 1h Surge Armed + DOZER Delta Watch`
    );
    setTimeout(() => setLockFeedback(null), 5000);

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
        pollBastionRing();
      }
    } catch (e) {
      console.error('Track target server sync error:', e);
    }
  };

  // 4b. Pin / Update Exact In-Game Castle Tile Coordinates (X, Y)
  const handlePinCoordinates = async (customX = null, customY = null) => {
    if (!selectedTarget) return;
    const xVal = Math.max(0, Math.min(1200, Math.round(Number(customX ?? pinX) || 0)));
    const yVal = Math.max(0, Math.min(1200, Math.round(Number(customY ?? pinY) || 0)));
    if (!xVal || !yVal) return;

    setIsPinningCoords(true);
    const newCoords = { X: xVal, Y: yVal };

    // Optimistic update in UI & localStorage
    setWatchlist((prev) => {
      const nextList = (prev.targetsList || []).map((t) => {
        if (String(t.govId) !== String(selectedTarget.govId)) return t;
        const old = t.lastKnownCoords;
        const history = [...(t.movementHistory || [])];
        if (old && old.X && old.Y && (old.X !== xVal || old.Y !== yVal)) {
          const dist = Math.round(Math.sqrt((xVal - old.X) ** 2 + (yVal - old.Y) ** 2));
          history.push({
            from: old,
            to: newCoords,
            distance: dist,
            timestamp: new Date().toISOString(),
          });
        }
        const updatedTarget = {
          ...t,
          lastKnownCoords: newCoords,
          coordSource: 'MANUAL_PIN',
          movementHistory: history,
          liveTelemetry: {
            ...(t.liveTelemetry || {}),
            mapTileX: xVal,
            mapTileY: yVal,
            castlePos: newCoords,
            coordSource: 'MANUAL_PIN',
          },
        };
        setSelectedTarget(updatedTarget);
        return updatedTarget;
      });
      saveLocalTargets(nextList);
      return { ...prev, targetsList: nextList };
    });

    setLockFeedback(
      `IN-GAME CASTLE TILE LOCKED: [${selectedTarget.lastKnownAlliance}] ${selectedTarget.name} pinned at #4194 X:${xVal} Y:${yVal}`
    );

    try {
      const res = await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PIN_COORDINATES',
          govId: selectedTarget.govId,
          x: xVal,
          y: yVal,
          source: 'MANUAL_PIN',
        }),
      });
      const data = await res.json();
      if (data.success && data.target) {
        setSelectedTarget(data.target);
        if (data.watchlist) {
          setWatchlist((prev) => ({
            ...prev,
            bastionRingEvents: data.watchlist.bastionRingEvents || prev.bastionRingEvents,
          }));
        }
      }
    } catch (e) {
      console.error('Pin coordinates error:', e);
    } finally {
      setIsPinningCoords(false);
      setTimeout(() => setLockFeedback(null), 4000);
    }
  };

  // 5. Dispatch Bastion Pinpoint Recon (Ring 2: TANK + CIPHER)
  const handleDispatchBastionRecon = async (targetToScan = null) => {
    const tgt = targetToScan || selectedTarget;
    if (!tgt) return;
    setIsDispatchingRecon(true);
    setLockFeedback(
      `COMMANDING BASTION RING 2 (TANK + CIPHER): Dispatching pinpoint RAM sweep for [${tgt.lastKnownAlliance}] ${tgt.name}...`
    );

    try {
      const res = await fetch('/api/black-ops/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISPATCH_BASTION_RECON',
          target: tgt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLockFeedback(data.message);
        if (data.watchlist) {
          setWatchlist((prev) => ({
            ...prev,
            bastionRingEvents: data.watchlist.bastionRingEvents || prev.bastionRingEvents,
          }));
        }
        pollBastionRing();
      }
    } catch (e) {
      console.error('Bastion recon dispatch error:', e);
    } finally {
      setIsDispatchingRecon(false);
      setTimeout(() => setLockFeedback(null), 5000);
    }
  };

  // 6. Untrack Target
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
      pollBastionRing();
    } catch (err) {
      console.error('Untrack error:', err);
    }
  };

  // 7. Send Test / Target Alert to Phone
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

  // 8. Save Webhook Settings
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

  // 9. 2D Interactive Star Cluster Canvas (1200x1200 In-Game Map Coordinate System)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = (canvas.width = canvas.parentElement.clientWidth);
    const height = (canvas.height = 460);

    let pulse = 0;

    const render = () => {
      pulse += 0.04;
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, width, height);

      // Draw Zone 1 / Zone 2 / Zone 3 Rings
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.09)';
      ctx.lineWidth = 1;
      for (let r = 50; r < Math.max(width, height); r += 65) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Coordinate Axis Lines & Labels (0..1200 RoK Grid)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // Draw Map Axis Labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('NW (X:0, Y:1200)', 8, 14);
      ctx.fillText('SW (X:0, Y:0)', 8, height - 36);
      ctx.textAlign = 'right';
      ctx.fillText('NE (X:1200, Y:1200)', width - 8, 14);
      ctx.fillText('SE (X:1200, Y:0)', width - 8, height - 36);
      ctx.textAlign = 'center';
      ctx.fillText('LOST TEMPLE (X:600, Y:600)', width / 2, height / 2 - 6);

      // Radar Sweep Cone
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

      const targets = watchlist.targetsList || [];
      const clickableNodes = [];

      targets.forEach((target, idx) => {
        const enriched = enrichGovernorWithRatios({
          ...(target.liveTelemetry || {}),
          govId: target.govId,
          name: target.name,
          alliance: target.lastKnownAlliance,
          castlePos: target.lastKnownCoords || target.liveTelemetry?.castlePos,
          coordSource: target.coordSource,
        });

        const tileX = enriched.displayX || 600;
        const tileY = enriched.displayY || 600;

        // Convert RoK 0..1200 (where Y=1200 is North/Top) into Canvas X, Y
        const x = Math.min(width - 28, Math.max(28, (tileX / 1200) * width));
        const y = Math.min(height - 32, Math.max(28, ((1200 - tileY) / 1200) * height));

        clickableNodes.push({ x, y, target, tileX, tileY });

        const isSelected = String(selectedTarget?.govId) === String(target.govId);
        const isExact = enriched.coordPrecision === 'EXACT_TILE' || enriched.coordPrecision === 'PINNED_TILE';
        const starRadius = isSelected ? 8 : 6;
        const glowRadius = starRadius * (1.6 + Math.sin(pulse + idx) * 0.4);

        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius * 3.5);
        const color = isSelected
          ? '6, 182, 212'
          : isExact
          ? '16, 185, 129'
          : '245, 158, 11';
        glow.addColorStop(0, `rgba(${color}, 0.9)`);
        glow.addColorStop(0.5, `rgba(${color}, 0.25)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, starRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${color}, ${isSelected ? 0.95 : 0.55 + Math.sin(pulse * 2) * 0.35})`;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(x, y, starRadius + 9 + Math.sin(pulse * 3) * 3, 0, Math.PI * 2);
        ctx.stroke();

        if (isSelected) {
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

        // Smart Label Alignment so right-side targets NEVER clip off the canvas edge
        const placeLeft = x > width - 220;
        ctx.textAlign = placeLeft ? 'right' : 'left';
        const labelX = placeLeft ? x - 16 : x + 16;

        ctx.fillStyle = isSelected ? '#22d3ee' : '#f8fafc';
        ctx.font = isSelected ? 'bold 11px monospace' : 'bold 10px monospace';
        ctx.fillText(`[${target.lastKnownAlliance || 'None'}] ${target.name}`, labelX, y - 4);

        ctx.fillStyle = isExact ? '#34d399' : '#fbbf24';
        ctx.font = 'bold 10px monospace';
        const coordText = isExact
          ? `#4194 X:${tileX} Y:${tileY} (EXACT)`
          : `#4194 ~X:${tileX} Y:${tileY} ([${target.lastKnownAlliance}] Hive)`;
        ctx.fillText(coordText, labelX, y + 10);
      });

      ctx.textAlign = 'left';
      renderedStarsRef.current = clickableNodes;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [watchlist, selectedTarget]);

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const mapX = Math.max(0, Math.min(1200, Math.round((clickX / canvas.width) * 1200)));
    const mapY = Math.max(0, Math.min(1200, Math.round(((canvas.height - clickY) / canvas.height) * 1200)));
    setHoverMapCoords({ X: mapX, Y: mapY });
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 1. Check if user clicked an existing star node
    for (const node of renderedStarsRef.current) {
      const dx = clickX - node.x;
      const dy = clickY - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 28) {
        setSelectedTarget(node.target);
        return;
      }
    }

    // 2. Otherwise, populate pinX / pinY with the clicked map coordinate for quick pinning
    const mapX = Math.max(0, Math.min(1200, Math.round((clickX / canvas.width) * 1200)));
    const mapY = Math.max(0, Math.min(1200, Math.round(((canvas.height - clickY) / canvas.height) * 1200)));
    setPinX(String(mapX));
    setPinY(String(mapY));
  };

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
        castlePos: selectedTarget.lastKnownCoords || selectedTarget.liveTelemetry?.castlePos,
        coordSource: selectedTarget.coordSource || selectedTarget.liveTelemetry?.coordSource,
      })
    : null;

  const handleCopyBookmark = () => {
    if (!activeDossier) return;
    const str = `#4194 X:${activeDossier.displayX} Y:${activeDossier.displayY}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(str);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2500);
    }
  };

  const lockedCount = watchlist.targetsList?.length || 0;
  const combinedRingEvents = [
    ...(watchlist.bastionRingEvents || []),
    ...((bastionTelemetry?.activityLog || []).filter(
      (e) => String(e.action || '').includes('BLACK_OPS') || String(e.kingdom) === '4194'
    )),
  ].slice(0, 12);

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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                <Bot className="w-3 h-3" /> BASTION MOE RING LINKED
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Crosshair className="w-7 h-7 text-emerald-400" />
              GOV HUNTER & STAR CLUSTER RADAR
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              In-Game Coordinate Tracking (#4194 X/Y) • Two-Way Bastion MoE Command Loop • Instant Mobile Dispatch
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
                BASTION WORKER: {liveScannerStatus?.status || 'READY (650/650)'}
              </div>
              <div className="text-xs font-mono font-bold text-white">
                Rank {liveScannerStatus?.currentRank || 650} / {liveScannerStatus?.targetRanks || 650} (
                {liveScannerStatus?.percent || 100}%)
              </div>
            </div>

            <button
              type="button"
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

        {/* BASTION MOE RING TWO-WAY COMMAND UPLINK BAR */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
          <div className="p-3 rounded-xl bg-slate-900/70 border border-cyan-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                <Radar className="w-3.5 h-3.5" /> RING 1: SCOUT & KENT
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                {lockedCount > 0
                  ? `SURGE CADENCE ACTIVE (1h Sweep · ${lockedCount} Locked)`
                  : 'STEADY CADENCE (12h Sweep · Standby)'}
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                lockedCount > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {lockedCount > 0 ? 'SURGE ON' : 'STEADY'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> RING 2: TANK · CIPHER · NUMNUM · FORGE
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                SIDEKICK (Node-01 Recon · Node-02 Forge)
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              0 TOKENS PASS
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/70 border border-purple-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-purple-400 font-bold uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> RING 3: DOZER & BASTION AUDIT
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                Slice Delta Reconciler & Teleport Intercept
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              ARMED
            </span>
          </div>
        </div>

        {/* Instant Lock Confirmation Banner */}
        {lockFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {lockFeedback}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-emerald-400 shrink-0 ml-2">
              Bastion Uplink Synced
            </span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search, Watchlist & Bastion Ring Feed */}
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
                  const enriched = enrichGovernorWithRatios(gov);
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
                          ID: {gov.govId || gov.id} • {((gov.power || 0) / 1e6).toFixed(2)}M Pwr •{' '}
                          <span className="text-cyan-300 font-bold">
                            #4194 X:{enriched.displayX} Y:{enriched.displayY}
                          </span>
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
              <span className="text-[10px] font-mono text-emerald-400">SCOUT + DOZER ARMED</span>
            </div>

            {!watchlist.targetsList || watchlist.targetsList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs">
                No targets locked yet. Search above and click TRACK to lock a governor onto the Bastion radar.
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {watchlist.targetsList.map((target) => {
                  const isSelected = String(selectedTarget?.govId) === String(target.govId);
                  const enriched = enrichGovernorWithRatios({
                    ...(target.liveTelemetry || {}),
                    govId: target.govId,
                    name: target.name,
                    alliance: target.lastKnownAlliance,
                    castlePos: target.lastKnownCoords || target.liveTelemetry?.castlePos,
                    coordSource: target.coordSource,
                  });
                  const isExact =
                    enriched.coordPrecision === 'EXACT_TILE' || enriched.coordPrecision === 'PINNED_TILE';

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

                      {/* Prominent In-Game Location Pill inside Watchlist Card */}
                      <div className="mt-2 p-2 rounded-lg bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between font-mono text-[10px]">
                        <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          #4194 · X: {enriched.displayX} · Y: {enriched.displayY}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            isExact
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isExact ? 'EXACT TILE' : `[${target.lastKnownAlliance}] HIVE`}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-mono">
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
                          <span className="text-slate-400 block text-[9px]">BASTION RING</span>
                          <span className="text-cyan-300 font-bold">1h SURGE</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bastion MoE Ring Live Command & Intercept Ledger */}
          <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-sm shadow-xl font-mono">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h2 className="text-xs font-bold uppercase text-cyan-300 flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                BASTION MOE RING INTERCEPT LOG
              </h2>
              <span className="text-[9px] text-slate-400">RING 1 · 2 · 3</span>
            </div>

            {combinedRingEvents.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Lock a target above to trigger SCOUT, TANK, and DOZER operations.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-[10px]">
                {combinedRingEvents.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-bold text-cyan-400">{evt.agent || 'BASTION RING'}</span>
                      <span className="text-emerald-400">{evt.action}</span>
                    </div>
                    <div className="text-slate-300 leading-relaxed">{evt.detail}</div>
                  </div>
                ))}
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
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> TARGET LOCKED ON RADAR
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      SCOUT: 1H SURGE ARMED
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isDispatchingRecon}
                    onClick={() => handleDispatchBastionRecon(selectedTarget)}
                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-400/50 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Bot className={`w-3.5 h-3.5 ${isDispatchingRecon ? 'animate-spin' : ''}`} />
                    {isDispatchingRecon ? 'DISPATCHING TANK...' : 'DISPATCH BASTION RECON (TANK)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendTestAlert(selectedTarget)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> PING TO PHONE
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleUntrackTarget(activeDossier.govId, e)}
                    className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" /> RELEASE
                  </button>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* IN-GAME LOCATION, MAP COORDINATES & TELEPORT TRACKER BANNER           */}
              {/* ===================================================================== */}
              <div className="mb-4 p-4 rounded-xl bg-slate-950/90 border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.12)] font-mono">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5" /> IN-GAME KINGDOM & MAP COORDINATES
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          activeDossier.coordPrecision === 'EXACT_TILE' ||
                          activeDossier.coordPrecision === 'PINNED_TILE'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {activeDossier.coordPrecision === 'EXACT_TILE'
                          ? 'VERIFIED CASTLE TILE (OPTICAL VECTOR)'
                          : activeDossier.coordPrecision === 'PINNED_TILE'
                          ? 'SUPERADMIN PINNED TILE'
                          : `ALLIANCE HIVE SECTOR ESTIMATE ([${activeDossier.alliance || 'None'}])`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-3 pt-1">
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        <span className="text-emerald-400">#4194</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-cyan-300">X: {activeDossier.displayX}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-cyan-300">Y: {activeDossier.displayY}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyBookmark}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedCoords ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> COPIED TO CLIPBOARD
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-cyan-400" /> COPY #4194 X:{activeDossier.displayX} Y:
                            {activeDossier.displayY}
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 pt-0.5">
                      <span className="text-slate-300 font-bold">{activeDossier.mapZone}</span> • Alliance:{' '}
                      <span className="text-emerald-400 font-bold">
                        [{activeDossier.alliance || 'None'}] {activeDossier.allianceName || ''}
                      </span>
                      {activeDossier.coordPrecision === 'ALLIANCE_HIVE_SECTOR' && (
                        <span className="block text-[10px] text-amber-300/90 mt-0.5">
                          Note: RoK Leaderboards conceal exact castle tiles until map/report contact. Showing [
                          {activeDossier.alliance}] Hive Sector — pin exact X/Y on the right whenever sighted!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Coordinate Pin / Update Control */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col gap-2 shrink-0">
                    <div className="text-[9px] font-bold uppercase text-cyan-300 flex items-center justify-between gap-2">
                      <span>PIN / UPDATE EXACT IN-GAME TILE (0–1200)</span>
                      <span className="text-slate-500">DOZER TELEPORT WATCH</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1">
                        <span className="text-[10px] text-emerald-400 font-bold mr-1.5">X:</span>
                        <input
                          type="number"
                          min="0"
                          max="1200"
                          value={pinX}
                          onChange={(e) => setPinX(e.target.value)}
                          placeholder="640"
                          className="w-14 bg-transparent text-xs text-white font-bold focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1">
                        <span className="text-[10px] text-emerald-400 font-bold mr-1.5">Y:</span>
                        <input
                          type="number"
                          min="0"
                          max="1200"
                          value={pinY}
                          onChange={(e) => setPinY(e.target.value)}
                          placeholder="580"
                          className="w-14 bg-transparent text-xs text-white font-bold focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isPinningCoords}
                        onClick={() => handlePinCoordinates()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-[10px] rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                      >
                        {isPinningCoords ? 'LOCKING...' : 'LOCK COORDS'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Teleport / Relocation History Trail */}
                {selectedTarget?.movementHistory && selectedTarget.movementHistory.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> TELEPORT TRAIL:
                    </span>
                    {selectedTarget.movementHistory.slice(-3).map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-200"
                      >
                        ({m.from?.X}, {m.from?.Y}) → ({m.to?.X}, {m.to?.Y}) [{m.distance} tiles]
                      </span>
                    ))}
                  </div>
                )}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-800 pb-2 gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-mono font-bold uppercase text-slate-200">
                  TACTICAL STAR CLUSTER & TERRITORY RADAR (1200x1200 IN-GAME GRID)
                </h2>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Verified Castle Tile
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Alliance Hive Sector
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Active Selection
                </span>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-800/80 bg-[#020408]">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoverMapCoords(null)}
                className="w-full block cursor-crosshair"
              />
              <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-300">
                Kingdom #4194 Map (0–1200) • Locked Targets:{' '}
                <span className="text-emerald-400 font-bold">{watchlist.targetsList?.length || 0}</span>
              </div>
              {hoverMapCoords && (
                <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-cyan-500/40 px-3 py-1.5 rounded-lg text-[10px] font-mono text-cyan-300">
                  Cursor: #4194 X:{hoverMapCoords.X} Y:{hoverMapCoords.Y} (Click to populate Pin X/Y)
                </div>
              )}
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
              When DOZER detects any tracked governor moving coordinates, spiking power, or changing alliance,
              Valheon Black Ops immediately transmits an emergency dispatch payload to your mobile device.
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
