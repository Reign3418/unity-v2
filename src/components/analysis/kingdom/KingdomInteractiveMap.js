'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Map as MapIcon,
  Crosshair,
  Search,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Flag,
  Shield,
  Target,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Navigation,
  Eye,
  EyeOff,
  Compass,
  Users,
  Activity,
  Pickaxe,
  Camera,
} from 'lucide-react';

const MAP_SIZE = 1200; // 1200 x 1200 km RoK Kingdom Map

const ALLIANCE_COLORS = {
  'LW=A': '#06b6d4',
  'A~94': '#10b981',
  'I~94': '#3b82f6',
  'S~94': '#f59e0b',
  'TDF_': '#ec4899',
  'I94~': '#8b5cf6',
  'H94_': '#14b8a6',
  '94~M': '#f97316',
  '94~F': '#eab308',
  '94-1': '#22c55e',
  'M96T': '#ef4444',
  'MM64': '#a855f7',
  'VIKS': '#f43f5e',
};

const RSS_META = {
  FOOD: { label: 'Food (Cropland)', short: '🌽 Food', color: '#84cc16', stroke: '#1a2e05' },
  WOOD: { label: 'Wood (Logging Camp)', short: '🪵 Wood', color: '#d97706', stroke: '#451a03' },
  STONE: { label: 'Stone (Quarry)', short: '🪨 Stone', color: '#cbd5e1', stroke: '#1e293b' },
  GOLD: { label: 'Gold (Gold Mine)', short: '🪙 Gold', color: '#facc15', stroke: '#422006' },
  GEMS: { label: 'Gems / Crystal', short: '💎 Gems', color: '#f43f5e', stroke: '#4c0519' },
  PIT: { label: 'Alliance Resource Pit', short: '🏭 Pit', color: '#ec4899', stroke: '#500724' },
};

// Standard RoK Kingdom Pass Gate Choke-Points on the 1200x1200 Home Map
const KINGDOM_PASSES = [
  { id: 'pass_z1_nw', label: 'Pass Lv.1 (NW Gate)', level: 1, x: 360, y: 1020 },
  { id: 'pass_z1_ne', label: 'Pass Lv.1 (NE Gate)', level: 1, x: 840, y: 1020 },
  { id: 'pass_z1_sw', label: 'Pass Lv.1 (SW Gate)', level: 1, x: 360, y: 180 },
  { id: 'pass_z1_se', label: 'Pass Lv.1 (SE Gate)', level: 1, x: 840, y: 180 },
  { id: 'pass_z1_w', label: 'Pass Lv.2 (West Corridor)', level: 2, x: 180, y: 600 },
  { id: 'pass_z1_e', label: 'Pass Lv.2 (East Corridor)', level: 2, x: 1020, y: 600 },
  { id: 'pass_z3_n', label: "Pass Lv.3 (North King's Gate)", level: 3, x: 600, y: 820 },
  { id: 'pass_z3_s', label: "Pass Lv.3 (South King's Gate)", level: 3, x: 600, y: 380 },
  { id: 'pass_z3_w', label: "Pass Lv.3 (West King's Gate)", level: 3, x: 380, y: 600 },
  { id: 'pass_z3_e', label: "Pass Lv.3 (East King's Gate)", level: 3, x: 820, y: 600 },
];

function getAllianceColor(tag) {
  if (!tag || tag === 'None') return '#38bdf8';
  if (ALLIANCE_COLORS[tag]) return ALLIANCE_COLORS[tag];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 80%, 60%)`;
}

export default function KingdomInteractiveMap({ targetKd = '4194', rosterData = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [mapPayload, setMapPayload] = useState(null);
  const [theatre, setTheatre] = useState('HOME_3194'); // 'HOME_3194' | 'KVK_16130' | 'ALL'
  const [mapVisualStyle, setMapVisualStyle] = useState('IN_GAME_TERRAIN'); // 'IN_GAME_TERRAIN' | 'TACTICAL_RADAR'
  const [directoryTab, setDirectoryTab] = useState('CITIES'); // 'CITIES' | 'RSS_NODES'
  const [searchQuery, setSearchQuery] = useState('');
  const [allianceFilter, setAllianceFilter] = useState('ALL');

  // Fine-Tuned Resource Node Filters
  const [rssTypeFilter, setRssTypeFilter] = useState('ALL'); // 'ALL' | 'FOOD' | 'WOOD' | 'STONE' | 'GOLD' | 'PIT'
  const [rssMinLevel, setRssMinLevel] = useState(1); // 1..6 or 10 (Alliance Pit)
  const [huntRssLevel, setHuntRssLevel] = useState(5);

  const [selectedEntity, setSelectedEntity] = useState(null);
  const [hoveredEntity, setHoveredEntity] = useState(null);
  const [cursorTile, setCursorTile] = useState({ x: 600, y: 600 });
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [botStatusMsg, setBotStatusMsg] = useState('');
  const [isSweeping, setIsSweeping] = useState(false);
  const [liveViewportStamp, setLiveViewportStamp] = useState(null);

  // Viewport Pan & Zoom
  const [zoom, setZoom] = useState(0.62);
  const [pan, setPan] = useState({ x: 80, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // 7 Toggleable Coordinate Layers
  const [layers, setLayers] = useState({
    cities: true,
    structures: true,
    markers: true,
    holySites: true,
    forts: true,
    resources: true,
    caves: true,
    zones: true,
    territoryOverlay: true,
  });

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/aws/map-entities?kd=${targetKd || '4194'}`);
      const data = await res.json();
      if (data.ok) {
        setMapPayload(data);
      }
    } catch (err) {
      console.error('Failed to load map entities:', err);
    } finally {
      setLoading(false);
    }
  }, [targetKd]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // Filter entities by selected theatre (Home Map #4194 = 3194, KvK = 16130, or ALL)
  const matchServer = useCallback(
    (srvId) => {
      if (theatre === 'ALL') return true;
      if (theatre === 'HOME_3194') return !srvId || Number(srvId) === 3194 || Number(srvId) === 4194;
      if (theatre === 'KVK_16130') return Number(srvId) === 16130;
      return true;
    },
    [theatre]
  );

  // Build Alliance Hive Centroids from known cities + R4 builder cities + markers
  const allianceCentroids = useMemo(() => {
    if (!mapPayload) return {};
    const buckets = {};
    for (const c of mapPayload.governorCities || []) {
      if (!matchServer(c.serverId)) continue;
      const a = c.alliance;
      if (a && a !== 'None' && c.x > 0 && c.y > 0) {
        if (!buckets[a]) buckets[a] = [];
        buckets[a].push({ x: c.x, y: c.y });
      }
    }
    const centroids = {};
    for (const [ally, pts] of Object.entries(buckets)) {
      if (pts.length > 0) {
        const avgX = Math.round((pts.reduce((s, p) => s + p.x, 0) / pts.length) * 10) / 10;
        const avgY = Math.round((pts.reduce((s, p) => s + p.y, 0) / pts.length) * 10) / 10;
        centroids[ally] = { x: avgX, y: avgY, count: pts.length };
      }
    }
    return centroids;
  }, [mapPayload, matchServer]);

  const filteredData = useMemo(() => {
    if (!mapPayload) {
      return {
        cities: [],
        structures: [],
        markers: [],
        holySites: [],
        forts: [],
        resources: [],
        caves: [],
      };
    }

    const q = searchQuery.trim().toLowerCase();

    const cities = (mapPayload.governorCities || []).filter((c) => {
      if (!matchServer(c.serverId)) return false;
      if (allianceFilter !== 'ALL' && c.alliance !== allianceFilter) return false;
      if (q) {
        const hit =
          String(c.govId || '').toLowerCase().includes(q) ||
          String(c.name || '').toLowerCase().includes(q) ||
          String(c.alliance || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    const structures = (mapPayload.allianceStructures || []).filter((s) => {
      if (!matchServer(s.serverId)) return false;
      if (q) {
        const hit =
          String(s.label || '').toLowerCase().includes(q) ||
          String(s.officerName || '').toLowerCase().includes(q) ||
          String(s.builderName || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    const markers = (mapPayload.allianceMarkers || []).filter((m) => {
      if (!matchServer(m.serverId)) return false;
      if (q) {
        const hit =
          String(m.comment || '').toLowerCase().includes(q) ||
          String(m.author || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    const holySites = [
      ...(theatre === 'HOME_3194' || theatre === 'ALL'
        ? [
            {
              id: 'lost_temple_600_600',
              type: 'LOST_TEMPLE',
              label: 'The Lost Temple (Kingdom #4194 Z3 Heart)',
              x: 600.0,
              y: 600.0,
              worldX: 3600.0,
              worldY: 3600.0,
              serverId: 3194,
            },
            ...KINGDOM_PASSES.map((p) => ({
              ...p,
              type: 'KINGDOM_PASS',
              worldX: p.x * 6,
              worldY: p.y * 6,
              serverId: 3194,
            })),
          ]
        : []),
      ...(mapPayload.holySitesAndRuins || []).filter((h) => matchServer(h.serverId)),
    ];

    const forts = (mapPayload.barbarianForts || []).filter((f) => matchServer(f.serverId));

    // Fine-Tuned Resource Node Filtering (by Category + Minimum Level)
    const resources = (mapPayload.resourceNodes || [])
      .filter((r) => {
        if (!matchServer(r.serverId)) return false;
        const cat = r.rssCategory || (r.isAlliancePit ? 'PIT' : 'FOOD');
        const lvl = Number(r.level || 1);
        if (rssTypeFilter !== 'ALL') {
          if (rssTypeFilter === 'PIT') {
            if (!r.isAlliancePit && cat !== 'PIT' && cat !== 'GEMS') return false;
          } else if (cat !== rssTypeFilter) {
            return false;
          }
        }
        if (lvl < rssMinLevel) return false;
        if (q) {
          const hit =
            String(r.label || '').toLowerCase().includes(q) ||
            String(cat).toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => Number(b.level || 0) - Number(a.level || 0) || Number(b.totalYield || 0) - Number(a.totalYield || 0));

    const caves = theatre === 'KVK_16130' ? [] : mapPayload.cavesAndVillages || [];

    return { cities, structures, markers, holySites, forts, resources, caves };
  }, [mapPayload, matchServer, allianceFilter, searchQuery, theatre, rssTypeFilter, rssMinLevel]);

  // Resource node breakdown counts for the fine-tuning bar
  const rssCategoryCounts = useMemo(() => {
    const counts = { ALL: 0, FOOD: 0, WOOD: 0, STONE: 0, GOLD: 0, PIT: 0 };
    for (const r of mapPayload?.resourceNodes || []) {
      if (!matchServer(r.serverId)) continue;
      if (Number(r.level || 1) < rssMinLevel) continue;
      counts.ALL += 1;
      const cat = r.rssCategory || (r.isAlliancePit ? 'PIT' : 'FOOD');
      if (r.isAlliancePit || cat === 'PIT' || cat === 'GEMS') {
        counts.PIT += 1;
      } else if (counts[cat] !== undefined) {
        counts[cat] += 1;
      }
    }
    return counts;
  }, [mapPayload, matchServer, rssMinLevel]);

  // Universal Search Results across ALL 300 #4194 governors + map entities
  const universalSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !mapPayload) return [];

    const results = [];
    const seenGovIds = new Set();

    for (const c of mapPayload.governorCities || []) {
      if (
        String(c.govId || '').toLowerCase().includes(q) ||
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.alliance || '').toLowerCase().includes(q)
      ) {
        seenGovIds.add(String(c.govId));
        results.push({
          ...c,
          coordStatus: Number(c.serverId) === 3194 ? 'VERIFIED_4194_TILE' : `VERIFIED_SRV_${c.serverId}`,
        });
      }
    }

    for (const s of mapPayload.allianceStructures || []) {
      if (
        s.type === 'R4_BUILDER_CITY' &&
        (String(s.officerName || '').toLowerCase().includes(q) ||
          String(s.label || '').toLowerCase().includes(q))
      ) {
        results.push({
          ...s,
          name: s.officerName || s.label,
          coordStatus: 'R4_BUILDER_LOCK',
        });
      }
    }

    const fullRoster = mapPayload.rosterList?.length ? mapPayload.rosterList : rosterData;
    for (const g of fullRoster || []) {
      const gid = String(g.govId || g.id);
      if (seenGovIds.has(gid)) continue;
      if (
        gid.toLowerCase().includes(q) ||
        String(g.name || '').toLowerCase().includes(q) ||
        String(g.alliance || '').toLowerCase().includes(q)
      ) {
        const cpos = g.castlePos;
        const hasPos = cpos && Number(cpos.X) > 0 && Number(cpos.Y) > 0;
        const hive = allianceCentroids[g.alliance];
        results.push({
          ...g,
          id: gid,
          govId: Number(gid),
          type: 'GOVERNOR_CITY',
          x: hasPos ? Number(cpos.X) : hive ? hive.x : null,
          y: hasPos ? Number(cpos.Y) : hive ? hive.y : null,
          worldX: hasPos ? Number(cpos.worldX || cpos.X * 6) : null,
          worldY: hasPos ? Number(cpos.worldY || cpos.Y * 6) : null,
          coordStatus: hasPos
            ? 'VERIFIED_4194_TILE'
            : hive
            ? `HIVE_TRIANGULATED (${g.alliance})`
            : 'ROSTER_TRACKED_NO_TILE_YET',
        });
      }
    }

    return results.slice(0, 12);
  }, [searchQuery, mapPayload, rosterData, allianceCentroids]);

  const availableAlliances = useMemo(() => {
    const s = new Set();
    for (const c of mapPayload?.governorCities || []) {
      if (c.alliance && c.alliance !== 'None') s.add(c.alliance);
    }
    for (const g of mapPayload?.rosterList || []) {
      if (g.alliance && g.alliance !== 'None') s.add(g.alliance);
    }
    return Array.from(s).sort();
  }, [mapPayload]);

  const focusOnTile = useCallback((tileX, tileY, targetZoom = 1.65) => {
    if (tileX === null || tileY === null || isNaN(tileX) || isNaN(tileY)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = Number(tileX);
    const cy = MAP_SIZE - Number(tileY);
    setZoom(targetZoom);
    setPan({
      x: rect.width / 2 - cx * targetZoom,
      y: rect.height / 2 - cy * targetZoom,
    });
  }, []);

  const resetViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const fitZoom = Math.min((rect.width - 40) / MAP_SIZE, (rect.height - 40) / MAP_SIZE, 0.72);
    setZoom(fitZoom);
    setPan({
      x: (rect.width - MAP_SIZE * fitZoom) / 2,
      y: (rect.height - MAP_SIZE * fitZoom) / 2,
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(resetViewport, 80);
    return () => clearTimeout(t);
  }, [resetViewport]);

  const screenToTile = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const wx = (sx - pan.x) / zoom;
      const wy = (sy - pan.y) / zoom;
      const tileX = Math.max(0, Math.min(MAP_SIZE, Math.round(wx * 10) / 10));
      const tileY = Math.max(0, Math.min(MAP_SIZE, Math.round((MAP_SIZE - wy) * 10) / 10));
      return { x: tileX, y: tileY };
    },
    [pan, zoom]
  );

  const findEntityAtScreenPos = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;

      const hitRadiusPx = 12;
      let best = null;
      let bestDist = hitRadiusPx;

      const checkList = (items, enabled) => {
        if (!enabled) return;
        for (const item of items) {
          if (item.x == null || item.y == null) continue;
          const ix = pan.x + item.x * zoom;
          const iy = pan.y + (MAP_SIZE - item.y) * zoom;
          const d = Math.hypot(sx - ix, sy - iy);
          if (d <= bestDist) {
            bestDist = d;
            best = item;
          }
        }
      };

      checkList(filteredData.cities, layers.cities);
      checkList(filteredData.resources, layers.resources);
      checkList(filteredData.holySites, layers.holySites);
      checkList(filteredData.structures, layers.structures);
      checkList(filteredData.markers, layers.markers);
      checkList(filteredData.forts, layers.forts);
      if (!best && zoom >= 1.1) {
        checkList(filteredData.caves, layers.caves);
      }

      return best;
    },
    [filteredData, layers, pan, zoom]
  );

  // Canvas Render Loop (Supports Both In-Game Terrain View & Tactical Cyber Radar)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const isInGameView = mapVisualStyle === 'IN_GAME_TERRAIN';

    // 1. Viewport Canvas Background
    ctx.fillStyle = isInGameView ? '#0e1712' : '#07090d';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 2. 1200 x 1200 Kingdom Surface (In-Game Biome Topography vs Dark Radar)
    if (isInGameView) {
      // Zone 1 Outer Emerald Forest Terrain
      const z1Grad = ctx.createRadialGradient(600, 600, 120, 600, 600, 860);
      z1Grad.addColorStop(0, '#3d4426'); // Zone 3 Sacred Golden-Olive Basin
      z1Grad.addColorStop(0.32, '#2d4528'); // Zone 2 Lush Valley Plains
      z1Grad.addColorStop(0.7, '#1f3622'); // Zone 1 Outer Highlands
      z1Grad.addColorStop(1, '#162819');
      ctx.fillStyle = z1Grad;
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      // Subtle River Waterways cutting across the Kingdom Basin
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.28)';
      ctx.lineWidth = 14 / zoom;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 320);
      ctx.bezierCurveTo(280, 360, 360, 420, 380, 600);
      ctx.moveTo(1200, 880);
      ctx.bezierCurveTo(920, 840, 840, 780, 820, 600);
      ctx.stroke();
    } else {
      const grad = ctx.createRadialGradient(600, 600, 40, 600, 600, 750);
      grad.addColorStop(0, '#131c2e');
      grad.addColorStop(0.55, '#0d131f');
      grad.addColorStop(1, '#090d14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    }

    // 3. Zone 1 / Zone 2 / Zone 3 Mountain Ridge Boundaries & Resource Level Contours
    if (layers.zones) {
      if (isInGameView) {
        // Zone 2 Mountain Range Ridge
        ctx.strokeStyle = 'rgba(120, 113, 108, 0.65)';
        ctx.lineWidth = 6 / zoom;
        ctx.strokeRect(180, 180, 840, 840);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([10 / zoom, 6 / zoom]);
        ctx.strokeRect(180, 180, 840, 840);

        // Zone 3 (King's Land) High Mountain Range & Golden Sanctum Border
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(234, 179, 8, 0.06)';
        ctx.fillRect(380, 380, 440, 440);
        ctx.strokeStyle = 'rgba(168, 162, 158, 0.75)';
        ctx.lineWidth = 7 / zoom;
        ctx.strokeRect(380, 380, 440, 440);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(380, 380, 440, 440);
      } else {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([8 / zoom, 6 / zoom]);
        ctx.strokeRect(180, 180, 840, 840);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.fillStyle = 'rgba(245, 158, 11, 0.03)';
        ctx.fillRect(380, 380, 440, 440);
        ctx.strokeRect(380, 380, 440, 440);
        ctx.setLineDash([]);
      }

      // Zone & Resource Tier Labels
      ctx.font = `bold ${Math.max(11, 13 / zoom)}px monospace`;
      ctx.fillStyle = isInGameView ? 'rgba(217, 249, 157, 0.6)' : 'rgba(148, 163, 184, 0.35)';
      ctx.fillText('ZONE 1 · OUTER PROVINCES (RSS LV.1–4)', 24, 34);
      ctx.fillStyle = isInGameView ? 'rgba(167, 243, 208, 0.7)' : 'rgba(56, 189, 248, 0.4)';
      ctx.fillText('ZONE 2 · INNER VALLEYS (RSS LV.3–5 · PASS LV.1/2)', 195, 204);
      ctx.fillStyle = isInGameView ? 'rgba(253, 224, 71, 0.85)' : 'rgba(245, 158, 11, 0.55)';
      ctx.fillText("ZONE 3 · KING'S LAND & LOST TEMPLE (RSS LV.5–6 · PASS LV.3)", 395, 404);
    }

    // Coordinate Grid Lines every 100 km
    ctx.strokeStyle = isInGameView ? 'rgba(255, 255, 255, 0.08)' : 'rgba(30, 41, 59, 0.55)';
    ctx.lineWidth = 1 / zoom;
    ctx.font = `${Math.max(9, 10 / zoom)}px monospace`;
    ctx.fillStyle = isInGameView ? 'rgba(226, 232, 240, 0.55)' : 'rgba(100, 116, 139, 0.65)';
    for (let g = 0; g <= MAP_SIZE; g += 100) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, MAP_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(MAP_SIZE, g);
      ctx.stroke();

      if (g % 200 === 0) {
        ctx.fillText(`X:${g}`, g + 4 / zoom, MAP_SIZE - 6 / zoom);
        ctx.fillText(`Y:${MAP_SIZE - g}`, 6 / zoom, g - 4 / zoom);
      }
    }

    // Outer Map Border
    ctx.strokeStyle = isInGameView ? 'rgba(250, 204, 21, 0.55)' : 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 2.5 / zoom;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

    // 3B. In-Game Style Alliance Territory Polygons around Flags & Hives
    if (layers.territoryOverlay && layers.structures && filteredData.structures.length > 0) {
      const territorySpan = 16; // 16x16 km flag footprint
      ctx.fillStyle = isInGameView ? 'rgba(59, 130, 246, 0.16)' : 'rgba(99, 102, 241, 0.10)';
      ctx.strokeStyle = isInGameView ? 'rgba(96, 165, 250, 0.45)' : 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 1 / zoom;
      for (const s of filteredData.structures) {
        if (s.status === 'DEMOLISHED') continue;
        const sx = s.x;
        const sy = MAP_SIZE - s.y;
        ctx.fillRect(sx - territorySpan / 2, sy - territorySpan / 2, territorySpan, territorySpan);
        ctx.strokeRect(sx - territorySpan / 2, sy - territorySpan / 2, territorySpan, territorySpan);
      }
    }

    // 4. LAYER: 2,144 Caves & Tribal Villages
    if (layers.caves && filteredData.caves.length > 0) {
      ctx.fillStyle = isInGameView ? 'rgba(253, 230, 138, 0.28)' : 'rgba(45, 212, 191, 0.28)';
      const caveSize = Math.max(1.8, 2.2 / zoom);
      ctx.beginPath();
      for (const c of filteredData.caves) {
        const cx = c.x;
        const cy = MAP_SIZE - c.y;
        ctx.rect(cx - caveSize / 2, cy - caveSize / 2, caveSize, caveSize);
      }
      ctx.fill();
    }

    // 5. LAYER: Fine-Tuned Resource Nodes (Food / Wood / Stone / Gold / Gems / Pits)
    if (layers.resources && filteredData.resources.length > 0) {
      for (const r of filteredData.resources) {
        const rx = r.x;
        const ry = MAP_SIZE - r.y;
        const cat = r.rssCategory || (r.isAlliancePit ? 'PIT' : 'FOOD');
        const meta = RSS_META[cat] || RSS_META.FOOD;
        const lvl = Number(r.level || 1);
        const rRadius = r.isAlliancePit ? Math.max(6, 8 / zoom) : Math.max(4, (3.5 + lvl * 0.45) / zoom);

        ctx.fillStyle = meta.color;
        ctx.strokeStyle = meta.stroke;
        ctx.lineWidth = 1.4 / zoom;

        // Draw Hexagon for Resource Nodes, Diamond for Pits
        ctx.beginPath();
        if (r.isAlliancePit) {
          ctx.rect(rx - rRadius, ry - rRadius, rRadius * 2, rRadius * 2);
        } else {
          ctx.arc(rx, ry, rRadius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Show Node Level & Type Tag when zoomed in or when RSS is being filtered
        if (zoom > 0.75 || rssTypeFilter !== 'ALL' || rssMinLevel >= 4) {
          ctx.font = `bold ${Math.max(8, 9.5 / zoom)}px monospace`;
          ctx.fillStyle = '#ffffff';
          const badgeText = r.isAlliancePit ? `PIT (${cat})` : `${cat[0]}·Lv.${lvl}`;
          ctx.fillText(badgeText, rx + rRadius + 3 / zoom, ry + 3 / zoom);
        }
      }
    }

    // 6. LAYER: Barbarian Forts & NPC Battle Sites
    if (layers.forts && filteredData.forts.length > 0) {
      const fRadius = Math.max(4, 5.5 / zoom);
      for (const f of filteredData.forts) {
        const fx = f.x;
        const fy = MAP_SIZE - f.y;
        const isFort = f.type === 'BARBARIAN_FORT';
        ctx.fillStyle = isFort ? 'rgba(239, 68, 68, 0.9)' : 'rgba(249, 115, 22, 0.8)';
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 1.2 / zoom;
        ctx.beginPath();
        ctx.arc(fx, fy, fRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 7. LAYER: Alliance Flags, Center Fortresses, Resource Pits & R4 Builder Cities
    if (layers.structures && filteredData.structures.length > 0) {
      for (const s of filteredData.structures) {
        const sx = s.x;
        const sy = MAP_SIZE - s.y;
        const isR4City = s.type === 'R4_BUILDER_CITY';
        const isFortress = s.type === 'CENTER_FORTRESS';
        const isDemolished = s.status === 'DEMOLISHED';

        if (!isR4City && s.builderX && s.builderY && zoom > 0.9) {
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
          ctx.lineWidth = 1 / zoom;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(s.builderX, MAP_SIZE - s.builderY);
          ctx.stroke();
        }

        const sz = isFortress ? Math.max(7.5, 9.5 / zoom) : Math.max(4.5, 6 / zoom);
        ctx.fillStyle = isR4City
          ? '#a855f7'
          : isDemolished
          ? 'rgba(100, 116, 139, 0.6)'
          : isFortress
          ? '#3b82f6'
          : '#6366f1';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 / zoom;
        ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
        ctx.strokeRect(sx - sz / 2, sy - sz / 2, sz, sz);

        if ((isR4City || isFortress) && zoom > 0.85) {
          ctx.font = `bold ${Math.max(8, 10 / zoom)}px sans-serif`;
          ctx.fillStyle = '#e9d5ff';
          ctx.fillText(s.officerName || s.label, sx + sz / 2 + 3 / zoom, sy + 3 / zoom);
        }
      }
    }

    // 8. LAYER: R4/R5 Tactical Map Markers
    if (layers.markers && filteredData.markers.length > 0) {
      const mSize = Math.max(4.5, 6 / zoom);
      for (const m of filteredData.markers) {
        const mx = m.x;
        const my = MAP_SIZE - m.y;
        ctx.fillStyle = m.type === 'COALITION_MARKER' ? '#f43f5e' : '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(mx, my - mSize);
        ctx.lineTo(mx + mSize, my);
        ctx.lineTo(mx, my + mSize);
        ctx.lineTo(mx - mSize, my);
        ctx.closePath();
        ctx.fill();

        if (zoom > 1.15 && m.comment) {
          ctx.font = `bold ${Math.max(8, 9.5 / zoom)}px sans-serif`;
          ctx.fillStyle = '#fde68a';
          ctx.fillText(`📌 ${m.comment.slice(0, 24)}`, mx + mSize + 3 / zoom, my + 3 / zoom);
        }
      }
    }

    // 9. LAYER: Holy Sites, Sanctums, Passes & Lost Temple
    if (layers.holySites && filteredData.holySites.length > 0) {
      for (const h of filteredData.holySites) {
        const hx = h.x;
        const hy = MAP_SIZE - h.y;
        const isTemple = h.type === 'LOST_TEMPLE';
        const isPass = h.type === 'KINGDOM_PASS';
        const r = isTemple ? Math.max(9.5, 12.5 / zoom) : isPass ? Math.max(5.5, 7 / zoom) : Math.max(6, 8 / zoom);

        ctx.fillStyle = isTemple ? '#fbbf24' : isPass ? '#fb923c' : '#c084fc';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / zoom;
        ctx.beginPath();
        ctx.arc(hx, hy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isTemple || zoom > 0.65) {
          ctx.font = `bold ${Math.max(8.5, 10.5 / zoom)}px sans-serif`;
          ctx.fillStyle = isTemple ? '#fde047' : isPass ? '#fed7aa' : '#f3e8ff';
          ctx.fillText(h.label, hx + r + 4 / zoom, hy + 3 / zoom);
        }
      }
    }

    // 10. LAYER: Governor Cities (Highest Priority Foreground)
    if (layers.cities && filteredData.cities.length > 0) {
      for (const c of filteredData.cities) {
        const cx = c.x;
        const cy = MAP_SIZE - c.y;
        const color = getAllianceColor(c.alliance);
        const r = Math.max(5.5, 7.5 / zoom);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#090b0e';
        ctx.lineWidth = 1.6 / zoom;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (zoom > 0.55) {
          const tag = c.alliance && c.alliance !== 'None' ? `[${c.alliance}] ` : '';
          ctx.font = `bold ${Math.max(8.5, 10.5 / zoom)}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${tag}${c.name}`, cx + r + 4 / zoom, cy + 3 / zoom);
        }
      }
    }

    // 11. Highlight Selected / Hovered Target Crosshair Reticle
    const activeTarget = selectedEntity || hoveredEntity;
    if (activeTarget && activeTarget.x != null && activeTarget.y != null) {
      const tx = activeTarget.x;
      const ty = MAP_SIZE - activeTarget.y;
      const pulseR = Math.max(14, 18 / zoom);

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.2 / zoom;
      ctx.beginPath();
      ctx.arc(tx, ty, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tx - pulseR * 1.4, ty);
      ctx.lineTo(tx + pulseR * 1.4, ty);
      ctx.moveTo(tx, ty - pulseR * 1.4);
      ctx.lineTo(tx, ty + pulseR * 1.4);
      ctx.stroke();
    }

    ctx.restore();
  }, [filteredData, layers, pan, zoom, selectedEntity, hoveredEntity, mapVisualStyle, rssTypeFilter, rssMinLevel]);

  const handleMouseDown = (e) => {
    const hit = findEntityAtScreenPos(e.clientX, e.clientY);
    if (hit) {
      setSelectedEntity(hit);
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e) => {
    const tile = screenToTile(e.clientX, e.clientY);
    setCursorTile(tile);

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    } else {
      const hit = findEntityAtScreenPos(e.clientX, e.clientY);
      setHoveredEntity(hit);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
    const nextZoom = Math.max(0.3, Math.min(6.0, zoom * zoomFactor));

    const wx = (mx - pan.x) / zoom;
    const wy = (my - pan.y) / zoom;

    setZoom(nextZoom);
    setPan({
      x: mx - wx * nextZoom,
      y: my - wy * nextZoom,
    });
  };

  const handleCopyCoord = (entity) => {
    if (!entity || entity.x == null || entity.y == null) return;
    const text = `#${targetKd || '4194'} X:${Math.round(entity.x)} Y:${Math.round(entity.y)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 1800);
  };

  const handleDispatchBotJump = async (entity) => {
    if (!entity) return;
    setBotStatusMsg('Dispatching SIDEKICK Camera Jump & Capturing Live In-Game View...');
    try {
      const res = await fetch('/api/aws/map-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hunt-governor',
          kd: targetKd || '4194',
          targetGov: entity.name || entity.govId || '',
          x: entity.x,
          y: entity.y,
          jump: true,
        }),
      });
      const data = await res.json();
      setBotStatusMsg(data.message || 'Coordinate jump dispatched.');
      setTimeout(() => {
        setLiveViewportStamp(Date.now());
      }, 2800);
      setTimeout(() => setBotStatusMsg(''), 5000);
    } catch (err) {
      setBotStatusMsg('Failed to dispatch bot jump.');
    }
  };

  const handleHuntLiveRss = async () => {
    const targetType = rssTypeFilter === 'ALL' || rssTypeFilter === 'PIT' ? 'GOLD' : rssTypeFilter;
    setBotStatusMsg(`Dispatching bot to search Kingdom #${targetKd || '4194'} for Lv.${huntRssLevel} ${targetType} nodes...`);
    try {
      const res = await fetch('/api/aws/map-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hunt-rss',
          kd: targetKd || '4194',
          rssType: targetType,
          rssLevel: huntRssLevel,
        }),
      });
      const data = await res.json();
      setBotStatusMsg(data.message || 'Dispatched RSS search.');
      setTimeout(async () => {
        await fetchMapData();
        setLiveViewportStamp(Date.now());
      }, 3000);
      setTimeout(() => setBotStatusMsg(''), 5500);
    } catch (err) {
      setBotStatusMsg('Failed to dispatch RSS hunter.');
    }
  };

  const handleRunMapSweep = async () => {
    setIsSweeping(true);
    setBotStatusMsg('Harvesting 7-layer map coordinates via Valheon Optical Telemetry...');
    try {
      await fetch('/api/aws/map-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'map-sweep', kd: targetKd || '4194' }),
      });
      setTimeout(async () => {
        await fetchMapData();
        setIsSweeping(false);
        setBotStatusMsg('Map entities refreshed!');
        setTimeout(() => setBotStatusMsg(''), 3000);
      }, 2200);
    } catch (err) {
      setIsSweeping(false);
      setBotStatusMsg('Map sweep error.');
    }
  };

  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      {/* Top Control & Telemetry Ribbon */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Compass size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  Kingdom #{targetKd || '4194'} Interactive Map (1200 × 1200 km)
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    WorldPos ÷ 6 Calibrated
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  In-Game Kingdom Terrain &amp; Territory View + Fine-Tuned Resource Node Radar
                </p>
              </div>
            </div>
          </div>

          {/* Map Visual Style Toggle + Theatre Selector + Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            {/* In-Game Map View vs Dark Tactical Radar */}
            <div className="flex items-center bg-[#090b0e] border border-[#1e222b] rounded-lg p-1 text-xs font-bold">
              <button
                onClick={() => setMapVisualStyle('IN_GAME_TERRAIN')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  mapVisualStyle === 'IN_GAME_TERRAIN'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🎮 In-Game Terrain View
              </button>
              <button
                onClick={() => setMapVisualStyle('TACTICAL_RADAR')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  mapVisualStyle === 'TACTICAL_RADAR'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🛰️ Dark Radar
              </button>
            </div>

            <div className="flex items-center bg-[#090b0e] border border-[#1e222b] rounded-lg p-1 text-xs font-bold">
              <button
                onClick={() => setTheatre('HOME_3194')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  theatre === 'HOME_3194'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Home Map #4194
              </button>
              <button
                onClick={() => setTheatre('KVK_16130')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  theatre === 'KVK_16130'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                KvK Map (LK #16130)
              </button>
              <button
                onClick={() => setTheatre('ALL')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  theatre === 'ALL'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({mapPayload?.counts?.totalMapEntities || 2936})
              </button>
            </div>

            <button
              onClick={handleRunMapSweep}
              disabled={isSweeping}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all"
            >
              <RefreshCw size={14} className={isSweeping ? 'animate-spin' : ''} />
              {isSweeping ? 'Harvesting...' : 'Sync Map Cache'}
            </button>
          </div>
        </div>

        {/* Universal Target Search + Layer Toggle Pills */}
        <div className="mt-4 pt-3 border-t border-[#1e222b] flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[260px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find & Track ANY Governor (Name, ID, Alliance Tag, R4 Marker, RSS Node)..."
                className="w-full pl-9 pr-8 py-2 bg-[#090b0e] border border-[#1e222b] focus:border-cyan-500 rounded-lg text-xs text-white outline-none font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}

              {universalSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#0b0e14] border border-cyan-500/40 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-[#1e222b]">
                  {universalSearchResults.map((item, idx) => (
                    <button
                      key={`${item.id || item.govId}_${idx}`}
                      onClick={() => {
                        setSelectedEntity(item);
                        if (item.x != null && item.y != null) {
                          if (item.serverId === 16130 && theatre === 'HOME_3194') {
                            setTheatre('ALL');
                          }
                          focusOnTile(item.x, item.y, 1.8);
                        }
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-cyan-500/10 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="text-cyan-400">
                            {item.alliance && item.alliance !== 'None' ? `[${item.alliance}]` : ''}
                          </span>
                          <span>{item.name}</span>
                          {item.govId && (
                            <span className="text-[10px] font-mono text-gray-500">#{item.govId}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                          {item.power > 0 && <span>Power: {(item.power / 1e6).toFixed(2)}M</span>}
                          {item.commanderBloatPct !== undefined && (
                            <span
                              className={
                                item.commanderBloatPct >= 16
                                  ? 'text-red-400 font-bold'
                                  : 'text-emerald-400'
                              }
                            >
                              Cmdr Bloat: {item.commanderBloatPct}%
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {item.x != null && item.y != null ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                            <Crosshair size={11} /> X:{item.x} Y:{item.y}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                            Dispatch Bot Lock
                          </span>
                        )}
                        <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                          {item.coordStatus}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              value={allianceFilter}
              onChange={(e) => setAllianceFilter(e.target.value)}
              className="bg-[#090b0e] border border-[#1e222b] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Alliances</option>
              {availableAlliances.map((a) => (
                <option key={a} value={a}>
                  [{a}]
                </option>
              ))}
            </select>
          </div>

          {/* 7 Layer Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              {
                key: 'cities',
                label: `Cities (${filteredData.cities.length})`,
                color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/15',
              },
              {
                key: 'structures',
                label: `Flags & Pits (${filteredData.structures.length})`,
                color: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/15',
              },
              {
                key: 'markers',
                label: `R4 Markers (${filteredData.markers.length})`,
                color: 'border-amber-500/40 text-amber-300 bg-amber-500/15',
              },
              {
                key: 'holySites',
                label: `Holy Sites & Passes (${filteredData.holySites.length})`,
                color: 'border-purple-500/40 text-purple-300 bg-purple-500/15',
              },
              {
                key: 'forts',
                label: `Forts & NPCs (${filteredData.forts.length})`,
                color: 'border-red-500/40 text-red-300 bg-red-500/15',
              },
              {
                key: 'resources',
                label: `RSS Nodes (${filteredData.resources.length})`,
                color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/15',
              },
              {
                key: 'caves',
                label: `Caves/Villages (${filteredData.caves.length})`,
                color: 'border-teal-500/40 text-teal-300 bg-teal-500/15',
              },
            ].map((l) => (
              <button
                key={l.key}
                onClick={() => toggleLayer(l.key)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 ${
                  layers[l.key]
                    ? l.color
                    : 'border-[#1e222b] bg-[#090b0e] text-gray-500 opacity-60'
                }`}
              >
                {layers[l.key] ? <Eye size={11} /> : <EyeOff size={11} />}
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fine-Tuned Resource Node Radar Bar (Hone In by Resource Type, Node Level & Active Bot Search) */}
        <div className="mt-3 pt-3 border-t border-[#1e222b] flex flex-wrap items-center justify-between gap-3 bg-[#090b0e]/80 rounded-xl px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1 mr-1">
              <Pickaxe size={13} /> Fine-Tune RSS Nodes:
            </span>
            {[
              { id: 'ALL', label: `All RSS (${rssCategoryCounts.ALL})` },
              { id: 'FOOD', label: `🌽 Food (${rssCategoryCounts.FOOD})` },
              { id: 'WOOD', label: `🪵 Wood (${rssCategoryCounts.WOOD})` },
              { id: 'STONE', label: `🪨 Stone (${rssCategoryCounts.STONE})` },
              { id: 'GOLD', label: `🪙 Gold (${rssCategoryCounts.GOLD})` },
              { id: 'PIT', label: `🏭 Alliance Pits (${rssCategoryCounts.PIT})` },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  setRssTypeFilter(btn.id);
                  setLayers((prev) => ({ ...prev, resources: true }));
                  setDirectoryTab('RSS_NODES');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                  rssTypeFilter === btn.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-[#0f1115] text-gray-400 border-[#1e222b] hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Minimum Node Level Filter */}
            <div className="flex items-center gap-1 bg-[#0f1115] border border-[#1e222b] rounded-lg px-2 py-1 text-[11px] font-mono">
              <span className="text-gray-500">Min Level:</span>
              {[1, 3, 4, 5, 6, 10].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setRssMinLevel(lvl);
                    setDirectoryTab('RSS_NODES');
                  }}
                  className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                    rssMinLevel === lvl
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {lvl === 1 ? 'All' : lvl === 10 ? 'Pit' : `Lv.${lvl}+`}
                </button>
              ))}
            </div>

            {/* Active Bot In-Game RSS Node Hunter */}
            <div className="flex items-center gap-1">
              <select
                value={huntRssLevel}
                onChange={(e) => setHuntRssLevel(Number(e.target.value))}
                className="bg-[#0f1115] border border-[#1e222b] rounded-lg px-2 py-1 text-[11px] text-amber-300 font-mono outline-none"
              >
                {[6, 5, 4, 3, 2, 1].map((l) => (
                  <option key={l} value={l}>
                    Hunt Lv.{l}
                  </option>
                ))}
              </select>
              <button
                onClick={handleHuntLiveRss}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all"
              >
                <Target size={12} />
                Bot Hunt RSS
              </button>
            </div>
          </div>
        </div>

        {botStatusMsg && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <Activity size={14} className="animate-pulse" />
            {botStatusMsg}
          </div>
        )}
      </div>

      {/* Main Map Viewport + Right-Hand Tactical Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1200 x 1200 Interactive Map Canvas (8 cols) */}
        <div
          ref={containerRef}
          className="lg:col-span-8 bg-[#090b0e] border border-[#1e222b] rounded-xl relative overflow-hidden shadow-2xl"
          style={{ height: '680px' }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full cursor-crosshair block"
          />

          {/* Floating Map Zoom & Reset Controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-[#0f1115]/90 backdrop-blur-md border border-[#1e222b] p-1.5 rounded-xl shadow-lg">
            <button
              onClick={() => setZoom((z) => Math.min(6.0, z * 1.25))}
              title="Zoom In"
              className="p-2 rounded-lg hover:bg-[#1e222b] text-gray-300 hover:text-cyan-400 transition-colors"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
              title="Zoom Out"
              className="p-2 rounded-lg hover:bg-[#1e222b] text-gray-300 hover:text-cyan-400 transition-colors"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={resetViewport}
              title="Reset Full 1200x1200 Kingdom View"
              className="p-2 rounded-lg hover:bg-[#1e222b] text-gray-300 hover:text-cyan-400 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => focusOnTile(600, 600, 1.5)}
              title="Center on The Lost Temple (600, 600)"
              className="p-2 rounded-lg hover:bg-[#1e222b] text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Target size={16} />
            </button>
          </div>

          {/* Live Cursor Telemetry Overlay (Bottom-Left) */}
          <div className="absolute bottom-3 left-3 bg-[#0f1115]/90 backdrop-blur-md border border-[#1e222b] rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-gray-500 mr-1.5">IN-GAME TILE:</span>
              <span className="text-cyan-400 font-bold">
                X:{cursorTile.x.toFixed(1)} Y:{cursorTile.y.toFixed(1)}
              </span>
            </div>
            <div className="border-l border-[#1e222b] pl-3">
              <span className="text-gray-500 mr-1.5">ENGINE WORLD:</span>
              <span className="text-gray-300">
                {(cursorTile.x * 6).toFixed(0)}, {(cursorTile.y * 6).toFixed(0)}
              </span>
            </div>
            <div className="border-l border-[#1e222b] pl-3">
              <span className="text-gray-500 mr-1.5">ZOOM:</span>
              <span className="text-emerald-400">{(zoom * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Hover Tooltip Pill */}
          {hoveredEntity && (
            <div className="absolute top-3 left-3 bg-[#0f1115]/95 border border-cyan-500/40 rounded-xl px-3.5 py-2.5 shadow-xl max-w-xs pointer-events-none">
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                {hoveredEntity.alliance && hoveredEntity.alliance !== 'None' && (
                  <span className="text-cyan-400">[{hoveredEntity.alliance}]</span>
                )}
                <span>{hoveredEntity.name || hoveredEntity.label || hoveredEntity.comment || 'Map Entity'}</span>
              </div>
              <div className="text-[11px] font-mono text-cyan-300 mt-0.5">
                Tile X:{hoveredEntity.x} Y:{hoveredEntity.y}{' '}
                <span className="text-gray-500">
                  (World {hoveredEntity.worldX}, {hoveredEntity.worldY})
                </span>
              </div>
              {hoveredEntity.totalYield > 0 && (
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                  Harvested Yield: {hoveredEntity.totalYield.toLocaleString()}
                </div>
              )}
              {hoveredEntity.author && (
                <div className="text-[10px] text-amber-300 mt-0.5">Officer: {hoveredEntity.author}</div>
              )}
            </div>
          )}
        </div>

        {/* Right-Hand Target Dossier & Dual-Mode Directory (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Target Dossier Card */}
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1e222b] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Crosshair size={16} className="text-cyan-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">
                  Target Coordinate Dossier
                </h3>
              </div>
              {selectedEntity && (
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-[10px] text-gray-500 hover:text-white font-mono"
                >
                  CLEAR
                </button>
              )}
            </div>

            {selectedEntity ? (
              <div className="space-y-3">
                <div className="bg-[#090b0e] border border-[#1e222b] rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {selectedEntity.type || 'MAP_ENTITY'}
                      </span>
                      <h4 className="text-base font-black text-white mt-1.5">
                        {selectedEntity.alliance && selectedEntity.alliance !== 'None'
                          ? `[${selectedEntity.alliance}] `
                          : ''}
                        {selectedEntity.name ||
                          selectedEntity.label ||
                          selectedEntity.comment ||
                          selectedEntity.id}
                      </h4>
                      {selectedEntity.govId && (
                        <div className="text-xs font-mono text-gray-400">
                          Governor ID: <span className="text-white">{selectedEntity.govId}</span>
                        </div>
                      )}
                    </div>

                    {selectedEntity.x != null && selectedEntity.y != null && (
                      <button
                        onClick={() => handleCopyCoord(selectedEntity)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all"
                      >
                        {copiedCoord ? <Check size={13} /> : <Copy size={13} />}
                        X:{Math.round(selectedEntity.x)} Y:{Math.round(selectedEntity.y)}
                      </button>
                    )}
                  </div>

                  {/* Coordinate Breakdown */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#1e222b] text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-gray-500">IN-GAME TILE (0..1200)</div>
                      <div className="text-cyan-400 font-bold">
                        {selectedEntity.x != null
                          ? `X: ${selectedEntity.x} , Y: ${selectedEntity.y}`
                          : 'Pending Hive Sweep'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">ENGINE WORLD (÷ 6)</div>
                      <div className="text-gray-300">
                        {selectedEntity.worldX != null
                          ? `${selectedEntity.worldX} , ${selectedEntity.worldY}`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resource Node Telemetry Details */}
                {(selectedEntity.type === 'RESOURCE_NODE' ||
                  selectedEntity.type === 'ALLIANCE_RESOURCE_PIT') && (
                  <div className="bg-[#090b0e] border border-[#1e222b] rounded-lg p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Resource Category:</span>
                      <span className="text-emerald-400 font-bold">
                        {RSS_META[selectedEntity.rssCategory]?.label || selectedEntity.rssCategory}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Node Level:</span>
                      <span className="text-amber-300 font-bold">
                        {selectedEntity.isAlliancePit
                          ? 'Lv. 10 (Alliance Mother Lode)'
                          : `Level ${selectedEntity.level}`}
                      </span>
                    </div>
                    {selectedEntity.totalYield > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Recorded Yield:</span>
                        <span className="text-white font-bold">
                          {selectedEntity.totalYield.toLocaleString()}
                          {selectedEntity.talentBonus > 0
                            ? ` (+${selectedEntity.talentBonus.toLocaleString()} Bonus)`
                            : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Governor Telemetry + Commander Bloat Diagnostics */}
                {selectedEntity.type === 'GOVERNOR_CITY' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#090b0e] border border-[#1e222b] rounded-lg p-2.5">
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Power</div>
                        <div className="text-sm font-black text-white font-mono">
                          {Number(selectedEntity.power || 0).toLocaleString()}
                        </div>
                        {selectedEntity.matchmakingPower > 0 && (
                          <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                            MM: {Number(selectedEntity.matchmakingPower).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="bg-[#090b0e] border border-[#1e222b] rounded-lg p-2.5">
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Kill Points</div>
                        <div className="text-sm font-black text-emerald-400 font-mono">
                          {Number(selectedEntity.killPoints || 0).toLocaleString()}
                        </div>
                        {selectedEntity.dead > 0 && (
                          <div className="text-[10px] text-red-400 font-mono mt-0.5">
                            Dead: {Number(selectedEntity.dead).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedEntity.commanderBloatPct !== undefined && (
                      <div className="bg-[#090b0e] border border-[#1e222b] rounded-lg p-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-300">
                            Commander Bloat % (Peacekeeper / Gatherer Inflation)
                          </span>
                          <span
                            className={`font-mono font-black ${
                              selectedEntity.commanderBloatPct >= 16
                                ? 'text-red-400'
                                : selectedEntity.commanderBloatPct >= 12
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {selectedEntity.commanderBloatPct}% ({selectedEntity.commanderBloatLabel})
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#1e222b] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              selectedEntity.commanderBloatPct >= 16
                                ? 'bg-red-500'
                                : selectedEntity.commanderBloatPct >= 12
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, selectedEntity.commanderBloatPct * 3)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons: Zoom to Tile & Capture Live In-Game View */}
                <div className="flex items-center gap-2 pt-1">
                  {selectedEntity.x != null && selectedEntity.y != null && (
                    <button
                      onClick={() => focusOnTile(selectedEntity.x, selectedEntity.y, 2.0)}
                      className="flex-1 py-2 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Crosshair size={14} />
                      Zoom to Tile
                    </button>
                  )}
                  <button
                    onClick={() => handleDispatchBotJump(selectedEntity)}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Camera size={14} />
                    Live In-Game View
                  </button>
                </div>

                {/* Live Captured In-Game Viewport Preview */}
                {liveViewportStamp && (
                  <div className="mt-2 bg-[#090b0e] border border-emerald-500/40 rounded-lg p-2">
                    <div className="text-[10px] font-mono text-emerald-400 mb-1 flex items-center justify-between">
                      <span>LIVE IN-GAME VIEWPORT (SIDEKICK)</span>
                      <button
                        onClick={() => setLiveViewportStamp(Date.now())}
                        className="underline hover:text-white"
                      >
                        Refresh Frame
                      </button>
                    </div>
                    <img
                      src={`/maps/live_viewport_capture.png?t=${liveViewportStamp}`}
                      alt="Live In-Game Viewport"
                      className="w-full rounded border border-[#1e222b]"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5 text-gray-500 text-xs">
                Click any Governor City, Resource Node, Alliance Flag, R4 Marker, Holy Site, or Pass on
                the 1200 × 1200 map to inspect its dossier or capture a live in-game viewport.
              </div>
            )}
          </div>

          {/* Dual-Tab Directory: Verified Governor Castles vs Fine-Tuned Resource Nodes */}
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-1.5 bg-[#090b0e] border border-[#1e222b] p-1 rounded-lg mb-3">
              <button
                onClick={() => setDirectoryTab('CITIES')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  directoryTab === 'CITIES'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users size={13} />
                Cities ({filteredData.cities.length})
              </button>
              <button
                onClick={() => setDirectoryTab('RSS_NODES')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  directoryTab === 'RSS_NODES'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Pickaxe size={13} />
                RSS Nodes ({filteredData.resources.length})
              </button>
            </div>

            {directoryTab === 'CITIES' ? (
              <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-[#1e222b]">
                {filteredData.cities.map((c) => (
                  <button
                    key={c.id || c.govId}
                    onClick={() => {
                      setSelectedEntity(c);
                      focusOnTile(c.x, c.y, 2.0);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between ${
                      selectedEntity?.govId === c.govId
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-white'
                        : 'bg-[#090b0e] border-[#1e222b] hover:border-cyan-500/30 text-gray-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getAllianceColor(c.alliance) }}
                        />
                        {c.alliance && c.alliance !== 'None' && (
                          <span className="text-cyan-400 font-mono">[{c.alliance}]</span>
                        )}
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        ID: {c.govId} · {c.source === 'R4_FLAG_BUILDER_POS' ? 'R4 Flag Builder' : 'Battle/Scout'}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <div className="text-xs font-bold text-cyan-300">
                        X:{c.x} Y:{c.y}
                      </div>
                      <div className="text-[9px] text-gray-500">Srv {c.serverId}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-[#1e222b]">
                {filteredData.resources.map((r) => {
                  const cat = r.rssCategory || (r.isAlliancePit ? 'PIT' : 'FOOD');
                  const meta = RSS_META[cat] || RSS_META.FOOD;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedEntity(r);
                        focusOnTile(r.x, r.y, 2.2);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between ${
                        selectedEntity?.id === r.id
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                          : 'bg-[#090b0e] border-[#1e222b] hover:border-emerald-500/30 text-gray-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span>{r.label}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {r.totalYield > 0
                            ? `Yield: ${r.totalYield.toLocaleString()} (${meta.short})`
                            : `${meta.short} · Srv ${r.serverId}`}
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-xs font-bold text-emerald-300">
                          X:{r.x} Y:{r.y}
                        </div>
                        <div className="text-[9px] text-amber-400 font-bold">
                          {r.isAlliancePit ? 'PIT (Lv.10)' : `Lv.${r.level}`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
