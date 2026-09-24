"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  Map as MapIcon, Layers, Shield, Download, RefreshCw, ZoomIn, ZoomOut, 
  RotateCcw, Plus, Trash2, Edit3, Eye, EyeOff, Sparkles, Flag, Target, 
  Castle, Navigation, Share2, Copy, Check, FileText, ChevronRight, Sliders, Crosshair
} from "lucide-react";
import region8Data from "@/data/region8_nodes.json";

// Default Preset for 5 Ideal Crystal Mines
const DEFAULT_5_ALLIANCES = [
  {
    id: 1,
    name: "Apex Predators",
    tag: "A818",
    color: "#E53935",
    hub: "NW Highlands",
    role: "NW Backline Mine (Bastion A)",
    center: [582, 666],
    crystals: 26
  },
  {
    id: 2,
    name: "Reign Kingdom",
    tag: "3418",
    color: "#FBC02D",
    hub: "Pass 7 North Gate",
    role: "Pass 7 North Gatekeeper (Bastion B)",
    center: [1237, 1105],
    crystals: 26
  },
  {
    id: 3,
    name: "Vanguard Legion",
    tag: "VNG",
    color: "#00BCD4",
    hub: "Central Core",
    role: "Central Basin Bridge (Bastion C & D)",
    center: [645, 1966],
    crystals: 26
  },
  {
    id: 4,
    name: "XII Bloodline",
    tag: "XIIB",
    color: "#1E88E5",
    hub: "Pass 7 South Gate",
    role: "Pass 7 South Gatekeeper (Bastion F)",
    center: [1204, 2769],
    crystals: 25
  },
  {
    id: 5,
    name: "Eclipse Order",
    tag: "ECL",
    color: "#D81B60",
    hub: "SW Valley",
    role: "SW Valley Sheltered Mine (Bastion E)",
    center: [530, 3089],
    crystals: 25
  }
];

const PRESET_COLORS = [
  "#E53935", "#FBC02D", "#00BCD4", "#1E88E5", 
  "#D81B60", "#9C27B0", "#4CAF50", "#FF9800",
  "#00E676", "#FF5252", "#E040FB", "#00B0FF"
];

// Kruskal MST algorithm in JavaScript
function computeMST(points) {
  const n = points.length;
  if (n <= 1) return [];
  const edges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
      edges.push({ d, u: i, v: j });
    }
  }
  edges.sort((a, b) => a.d - b.d);
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(i) {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }
  const mst = [];
  for (const edge of edges) {
    const ru = find(edge.u);
    const rv = find(edge.v);
    if (ru !== rv) {
      parent[ru] = rv;
      mst.push([edge.u, edge.v]);
      if (mst.length === n - 1) break;
    }
  }
  return mst;
}

export default function KvKMapPlanner() {
  const canvasRef = useRef(null);
  const mapImageRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Alliances & Spots State
  const [spotsCount, setSpotsCount] = useState(5);
  const [alliances, setAlliances] = useState(DEFAULT_5_ALLIANCES);
  const [selectedAllianceId, setSelectedAllianceId] = useState(null);
  const [editingAllianceId, setEditingAllianceId] = useState(null);

  // Custom User Pins / Marks
  const [customPins, setCustomPins] = useState([]);
  const [activeTool, setActiveTool] = useState(null);

  // Canvas Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: 280, y: 30 });
  const [zoom, setZoom] = useState(0.24);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Layer Visibility
  const [layers, setLayers] = useState({
    crystals: true,
    flagPaths: true,
    fortresses: true,
    bastions: true,
    passes: true,
    territory: true,
    secondary: false,
    customPins: true,
    territoryOpacity: 0.25
  });

  const [copiedBriefing, setCopiedBriefing] = useState(false);

  // Load Map Background
  useEffect(() => {
    const img = new Image();
    img.src = "/maps/region8_map.jpg";
    img.onload = () => {
      mapImageRef.current = img;
      setMapLoaded(true);
    };
  }, []);

  // Center on mount and resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const mapW = region8Data.mapWidth;
      const mapH = region8Data.mapHeight;
      const targetZoom = Math.min((cw - 80) / mapW, (ch - 60) / mapH, 0.26);
      const initX = Math.max(20, (cw - mapW * targetZoom) / 2);
      const initY = Math.max(20, (ch - mapH * targetZoom) / 2);
      setZoom(targetZoom);
      setPan({ x: initX, y: initY });
    };

    // Small delay to ensure container client dimensions are settled
    const timer = setTimeout(handleResize, 100);
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Cluster assignment: Assign 128 crystals to alliances based on nearest distance
  const clusterAssignments = useMemo(() => {
    const crystals = region8Data.crystals;
    const k = alliances.length;
    if (k === 0) return {};

    const centers = alliances.map(a => a.center || [930, 1880]);
    const assignments = {};
    for (let i = 0; i < k; i++) assignments[alliances[i].id] = [];

    crystals.forEach((pt) => {
      let bestDist = Infinity;
      let bestId = alliances[0].id;
      alliances.forEach((a, idx) => {
        const c = centers[idx];
        const d = Math.hypot(pt[0] - c[0], pt[1] - c[1]);
        if (d < bestDist) {
          bestDist = d;
          bestId = a.id;
        }
      });
      assignments[bestId].push(pt);
    });

    return assignments;
  }, [alliances]);

  // Compute MST flag networks for each alliance
  const flagNetworks = useMemo(() => {
    const networks = {};
    alliances.forEach(a => {
      const pts = clusterAssignments[a.id] || [];
      if (pts.length > 0) {
        const mstEdges = computeMST(pts);
        networks[a.id] = { pts, edges: mstEdges };
      }
    });
    return networks;
  }, [alliances, clusterAssignments]);

  // Main Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapLoaded || !mapImageRef.current) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Deep Dark Tactical Background
    ctx.fillStyle = "#07090c";
    ctx.fillRect(0, 0, width, height);

    // Apply Pan & Zoom transformation
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Dynamic scale factor for text and icons so they remain readable at any zoom level
    const scaleFactor = Math.max(1.0, 0.38 / zoom);

    // 1. Draw Map Image
    const mapW = region8Data.mapWidth; // 1860
    const mapH = region8Data.mapHeight; // 3760
    ctx.drawImage(mapImageRef.current, 0, 0, mapW, mapH);

    // 2. Draw Territory Radial Sectors
    if (layers.territory && alliances.length > 0) {
      ctx.save();
      ctx.globalAlpha = layers.territoryOpacity;
      alliances.forEach(a => {
        const cx = a.center[0];
        const cy = a.center[1];
        const grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 780);
        grad.addColorStop(0, a.color);
        grad.addColorStop(0.7, a.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 780, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // 3. Draw Flag Constellation Paths (MST)
    if (layers.flagPaths) {
      alliances.forEach(a => {
        const net = flagNetworks[a.id];
        if (!net) return;
        const isSelected = selectedAllianceId === null || selectedAllianceId === a.id;
        const alpha = isSelected ? 1.0 : 0.25;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Outer dark shadow line
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.lineWidth = (isSelected ? 8 : 5) * Math.min(1.5, Math.max(1.0, 0.3 / zoom));
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        net.edges.forEach(([u, v]) => {
          const p1 = net.pts[u];
          const p2 = net.pts[v];
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        });

        // Inner colored path
        ctx.strokeStyle = a.color;
        ctx.lineWidth = (isSelected ? 3.5 : 2.2) * Math.min(1.5, Math.max(1.0, 0.3 / zoom));
        net.edges.forEach(([u, v]) => {
          const p1 = net.pts[u];
          const p2 = net.pts[v];
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        });

        ctx.restore();
      });
    }

    // 4. Draw Bastions
    if (layers.bastions) {
      region8Data.bastions.forEach(b => {
        ctx.save();
        const cx = b.x;
        const cy = b.y;

        // Draw 5-point star
        ctx.fillStyle = "#A748AF";
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3 * scaleFactor;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = (i % 2 === 0 ? 26 : 11) * scaleFactor;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Label box
        const tw = 100 * scaleFactor;
        const th = 28 * scaleFactor;
        ctx.fillStyle = "rgba(12, 16, 24, 0.94)";
        ctx.strokeStyle = "#A748AF";
        ctx.lineWidth = 2 * scaleFactor;
        ctx.fillRect(cx - tw / 2, cy + 30 * scaleFactor, tw, th);
        ctx.strokeRect(cx - tw / 2, cy + 30 * scaleFactor, tw, th);

        ctx.fillStyle = "#EBB4FF";
        ctx.font = `bold ${Math.round(14 * scaleFactor)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(b.name, cx, cy + 50 * scaleFactor);

        ctx.restore();
      });
    }

    // 5. Draw Pass 7 & Pass 4 Gates
    if (layers.passes) {
      region8Data.passes.forEach(p => {
        ctx.save();
        const cx = p.x;
        const cy = p.y;
        const isPass7 = p.type === "gate";

        ctx.strokeStyle = isPass7 ? "#00E5FF" : "#B0BEC5";
        ctx.lineWidth = (isPass7 ? 4 : 2) * scaleFactor;
        const pw = (isPass7 ? 120 : 80) * scaleFactor;
        const ph = (isPass7 ? 75 : 45) * scaleFactor;
        ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);

        // Label
        const lw = 135 * scaleFactor;
        const lh = 30 * scaleFactor;
        ctx.fillStyle = "rgba(10, 15, 22, 0.95)";
        ctx.fillRect(cx - pw / 2 - lw - 6, cy - lh / 2, lw, lh);
        ctx.strokeStyle = isPass7 ? "#00E5FF" : "#B0BEC5";
        ctx.lineWidth = 2 * scaleFactor;
        ctx.strokeRect(cx - pw / 2 - lw - 6, cy - lh / 2, lw, lh);

        ctx.fillStyle = isPass7 ? "#00E5FF" : "#FFFFFF";
        ctx.font = `bold ${Math.round(13 * scaleFactor)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(p.name, cx - pw / 2 - lw / 2 - 6, cy + 5 * scaleFactor);

        // Advance arrow for Pass 7
        if (isPass7) {
          ctx.strokeStyle = "#00E5FF";
          ctx.lineWidth = 3.5 * scaleFactor;
          ctx.setLineDash([8 * scaleFactor, 6 * scaleFactor]);
          ctx.beginPath();
          ctx.moveTo(cx + pw / 2 + 5, cy);
          ctx.lineTo(cx + pw / 2 + 70 * scaleFactor, cy);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "#00E5FF";
          ctx.beginPath();
          ctx.moveTo(cx + pw / 2 + 70 * scaleFactor, cy - 12 * scaleFactor);
          ctx.lineTo(cx + pw / 2 + 90 * scaleFactor, cy);
          ctx.lineTo(cx + pw / 2 + 70 * scaleFactor, cy + 12 * scaleFactor);
          ctx.fill();
        }

        ctx.restore();
      });
    }

    // 6. Draw Alliance Fortress Hub Boxes with Custom Tags & Names
    if (layers.fortresses) {
      alliances.forEach(a => {
        const isSelected = selectedAllianceId === null || selectedAllianceId === a.id;
        ctx.save();
        ctx.globalAlpha = isSelected ? 1.0 : 0.35;

        const cx = a.center[0];
        const cy = a.center[1];
        const bw = 170 * scaleFactor;
        const bh = 105 * scaleFactor;

        // Fortress Boundary Box
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 3.5 * scaleFactor;
        ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);

        // Header Tag badge
        const tagText = `[${a.tag}] ${a.name}`;
        ctx.font = `bold ${Math.round(20 * scaleFactor)}px sans-serif`;
        const tw = ctx.measureText(tagText).width + 26 * scaleFactor;
        const th = 38 * scaleFactor;
        const bx = cx - bw / 2;
        const by = cy - bh / 2 - th - 8 * scaleFactor;

        ctx.fillStyle = "rgba(10, 14, 20, 0.96)";
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 2.5 * scaleFactor;
        ctx.fillRect(bx, by, tw, th);
        ctx.strokeRect(bx, by, tw, th);

        ctx.fillStyle = a.color;
        ctx.textAlign = "left";
        ctx.fillText(tagText, bx + 12 * scaleFactor, by + 26 * scaleFactor);

        ctx.restore();
      });
    }

    // 7. Draw Crystal Nodes (The Hot Item!)
    if (layers.crystals) {
      region8Data.crystals.forEach(([cx, cy]) => {
        ctx.save();
        const r = 9 * scaleFactor;

        // Shadow outline
        ctx.fillStyle = "rgba(5, 10, 20, 0.95)";
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Main royal blue circle
        ctx.fillStyle = "#3C4BD7";
        ctx.strokeStyle = "#87B9FF";
        ctx.lineWidth = 2.5 * scaleFactor;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White core reflection dot
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    // 8. Draw Custom User Pins
    if (layers.customPins && customPins.length > 0) {
      customPins.forEach((pin, idx) => {
        ctx.save();
        const px = pin.x;
        const py = pin.y;
        const pr = 14 * scaleFactor;

        ctx.fillStyle = pin.color || "#00E5FF";
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3 * scaleFactor;
        ctx.stroke();

        // Pin label
        const lw = 140 * scaleFactor;
        const lh = 28 * scaleFactor;
        ctx.fillStyle = "rgba(12, 16, 24, 0.94)";
        ctx.strokeStyle = pin.color || "#00E5FF";
        ctx.lineWidth = 2 * scaleFactor;
        ctx.fillRect(px - lw / 2, py - 46 * scaleFactor, lw, lh);
        ctx.strokeRect(px - lw / 2, py - 46 * scaleFactor, lw, lh);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${Math.round(13 * scaleFactor)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(pin.label || `Marker #${idx + 1}`, px, py - 28 * scaleFactor);

        ctx.restore();
      });
    }

    ctx.restore();
  }, [mapLoaded, pan, zoom, layers, alliances, clusterAssignments, flagNetworks, selectedAllianceId, customPins]);

  // Request Animation Frame on render
  useEffect(() => {
    let animId;
    const loop = () => {
      renderCanvas();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  // Mouse / Touch Event Handlers
  const handleMouseDown = (e) => {
    if (activeTool) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - pan.x) / zoom;
      const clickY = (e.clientY - rect.top - pan.y) / zoom;

      const newPin = {
        id: Date.now(),
        x: Math.round(clickX),
        y: Math.round(clickY),
        type: activeTool,
        label: activeTool === 'fortress' ? 'AF DROP' : activeTool === 'flag' ? 'FLAG PATH' : 'WAR PIN',
        color: '#00E5FF'
      };
      setCustomPins(prev => [...prev, newPin]);
      setActiveTool(null);
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.12), 3.5);
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Center on Region 8
  const handleResetView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const mapW = region8Data.mapWidth;
    const mapH = region8Data.mapHeight;
    const targetZoom = Math.min((cw - 80) / mapW, (ch - 60) / mapH, 0.26);
    const initX = Math.max(20, (cw - mapW * targetZoom) / 2);
    const initY = Math.max(20, (ch - mapH * targetZoom) / 2);
    setZoom(targetZoom);
    setPan({ x: initX, y: initY });
    setSelectedAllianceId(null);
  };

  // Alliance editing handlers
  const handleUpdateAlliance = (id, field, value) => {
    setAlliances(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // Switch between 5 Spots and 8 Spots
  const handleSetSpotsCount = (count) => {
    setSpotsCount(count);
    if (count === 5) {
      setAlliances(DEFAULT_5_ALLIANCES);
    } else if (count === 8) {
      const yCoords = [650, 1100, 1950, 2750];
      const new8 = [];
      const tags = ["3418", "A818", "VNG", "XIIB", "ECL", "ROY", "LEG", "WAR"];
      const names = [
        "Reign Kingdom", "Apex Predators", "Vanguard", "XII Bloodline",
        "Eclipse Order", "Royal Guard", "Legionnaire", "Warlords"
      ];
      for (let i = 0; i < 8; i++) {
        const isWest = i % 2 === 0;
        const row = Math.floor(i / 2);
        new8.push({
          id: i + 1,
          name: names[i],
          tag: tags[i],
          color: PRESET_COLORS[i % PRESET_COLORS.length],
          hub: `${isWest ? "West" : "East"} Sector ${row + 1}`,
          role: `Mining Sector #${i + 1}`,
          center: [isWest ? 520 : 1240, yCoords[row]],
          crystals: 16
        });
      }
      setAlliances(new8);
    }
  };

  // Copy Tactical Briefing Markdown
  const handleCopyBriefing = () => {
    let md = `# Region #8 KvK Crystal Mining & Territory Briefing\n\n`;
    md += `| Tag | Alliance / Kingdom | Color | Role / Hub | Crystals Allocated |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: |\n`;
    alliances.forEach(a => {
      const cCount = clusterAssignments[a.id]?.length || 0;
      md += `| **[${a.tag}]** | ${a.name} | ${a.color} | ${a.role} | **${cCount} 💎** |\n`;
    });
    md += `\n**Total Region #8 Crystals:** 128\n`;
    md += `**Bastions:** 6 Quest Hubs (A through F)\n`;
    md += `**Pass 7 Gates:** North Gate & South Gate into Zone 2\n`;

    navigator.clipboard.writeText(md);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  // Export Canvas Image Download
  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `KvK_Region8_${spotsCount}_Alliances_Plan.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0a0c0f] text-gray-200 overflow-hidden select-none">
      
      {/* Top Tactical Control Ribbon */}
      <div className="h-14 px-6 border-b border-[#1e222b] bg-[#0f1115] flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <MapIcon size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              KVK CRYSTAL MAP &amp; ALLIANCE PLANNER
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                Region #8
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">128 Crystal Nodes • Minimum Spanning Tree Constellations</p>
          </div>
        </div>

        {/* Spot Switcher & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Spots count selector */}
          <div className="flex items-center bg-[#161a22] p-1 rounded-lg border border-[#262c38]">
            <button
              onClick={() => handleSetSpotsCount(5)}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                spotsCount === 5 
                  ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              5 Ideal Mines
            </button>
            <button
              onClick={() => handleSetSpotsCount(8)}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                spotsCount === 8 
                  ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              8 Alliances
            </button>
          </div>

          <div className="h-5 w-px bg-[#262c38] mx-1" />

          {/* Tactical Pin Tools */}
          <div className="flex items-center gap-1 bg-[#161a22] p-1 rounded-lg border border-[#262c38]">
            <button
              onClick={() => setActiveTool(activeTool === 'fortress' ? null : 'fortress')}
              title="Drop Alliance Fortress"
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                activeTool === 'fortress' ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-gray-400 hover:text-white"
              }`}
            >
              <Castle size={15} />
              <span className="text-[11px]">Drop AF</span>
            </button>
            <button
              onClick={() => setActiveTool(activeTool === 'flag' ? null : 'flag')}
              title="Drop Flag Path Marker"
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                activeTool === 'flag' ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-gray-400 hover:text-white"
              }`}
            >
              <Flag size={15} />
              <span className="text-[11px]">Pin Flag</span>
            </button>
            <button
              onClick={() => setActiveTool(activeTool === 'rally' ? null : 'rally')}
              title="Drop War Target"
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                activeTool === 'rally' ? "bg-red-500/20 text-red-300 border border-red-500/40" : "text-gray-400 hover:text-white"
              }`}
            >
              <Target size={15} />
              <span className="text-[11px]">Rally</span>
            </button>
          </div>

          <div className="h-5 w-px bg-[#262c38] mx-1" />

          {/* Export / Copy Briefing */}
          <button
            onClick={handleCopyBriefing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161a22] hover:bg-[#1e2430] border border-[#262c38] text-xs text-gray-300 hover:text-white transition-colors"
          >
            {copiedBriefing ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedBriefing ? "Copied!" : "Briefing"}</span>
          </button>

          <button
            onClick={handleExportImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-colors"
          >
            <Download size={14} />
            <span>Export Map</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Alliance / Kingdom Customization Drawer */}
        <div className="w-80 bg-[#0d1015] border-r border-[#1e222b] flex flex-col shrink-0 z-10 overflow-hidden">
          <div className="p-3 border-b border-[#1e222b] flex items-center justify-between bg-[#0a0c0f]">
            <span className="text-xs font-bold tracking-wider text-gray-300 uppercase flex items-center gap-1.5">
              <Shield size={14} className="text-cyan-400" />
              Alliances &amp; Kingdoms ({alliances.length})
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              128 Crystals
            </span>
          </div>

          {/* Alliances List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {alliances.map((alliance) => {
              const count = clusterAssignments[alliance.id]?.length || 0;
              const isSelected = selectedAllianceId === alliance.id;
              const isEditing = editingAllianceId === alliance.id;

              return (
                <div
                  key={alliance.id}
                  onClick={() => setSelectedAllianceId(isSelected ? null : alliance.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${
                    isSelected 
                      ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "bg-[#141820] border-[#222733] hover:border-[#353d50]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px]" 
                        style={{ backgroundColor: alliance.color, boxShadow: `0 0 8px ${alliance.color}` }}
                      />
                      <span className="font-bold text-xs font-mono text-white">
                        [{alliance.tag}]
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
                        {count} 💎
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAllianceId(isEditing ? null : alliance.id);
                        }}
                        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Name and Role */}
                  <div className="text-xs font-semibold text-gray-200 truncate">
                    {alliance.name}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate mt-0.5">
                    {alliance.role}
                  </div>

                  {/* Inline Editor Drawer */}
                  {isEditing && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      className="mt-3 pt-3 border-t border-[#262c38] space-y-2 text-xs"
                    >
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Alliance Name</label>
                        <input
                          type="text"
                          value={alliance.name}
                          onChange={(e) => handleUpdateAlliance(alliance.id, 'name', e.target.value)}
                          className="w-full bg-[#0a0c0f] border border-[#2a303d] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <div className="w-1/2">
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Tag</label>
                          <input
                            type="text"
                            value={alliance.tag}
                            onChange={(e) => handleUpdateAlliance(alliance.id, 'tag', e.target.value)}
                            className="w-full bg-[#0a0c0f] border border-[#2a303d] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="w-1/2">
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={alliance.color}
                              onChange={(e) => handleUpdateAlliance(alliance.id, 'color', e.target.value)}
                              className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                            />
                            <span className="font-mono text-[11px] text-gray-300">{alliance.color}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Tactical Role</label>
                        <input
                          type="text"
                          value={alliance.role}
                          onChange={(e) => handleUpdateAlliance(alliance.id, 'role', e.target.value)}
                          className="w-full bg-[#0a0c0f] border border-[#2a303d] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Color Palette Suggestions */}
                      <div className="pt-1 flex flex-wrap gap-1">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => handleUpdateAlliance(alliance.id, 'color', c)}
                            className="w-4 h-4 rounded-full border border-black/40 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Markers List */}
          {customPins.length > 0 && (
            <div className="p-3 border-t border-[#1e222b] max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase font-mono">Custom Marks ({customPins.length})</span>
                <button 
                  onClick={() => setCustomPins([])}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-1">
                {customPins.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between text-xs bg-[#141820] p-1.5 rounded border border-[#222733]">
                    <span className="truncate">{p.label} ({p.x}, {p.y})</span>
                    <button 
                      onClick={() => setCustomPins(prev => prev.filter(item => item.id !== p.id))}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Interactive Map Canvas */}
        <div className="flex-1 relative bg-[#07090c] overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className={`w-full h-full ${activeTool ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          />

          {/* Active Tool Hint Banner */}
          {activeTool && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-black font-bold px-4 py-1.5 rounded-full shadow-lg text-xs flex items-center gap-2 animate-bounce">
              <Crosshair size={14} />
              <span>Click anywhere on Region #8 to place your {activeTool.toUpperCase()} marker</span>
              <button 
                onClick={() => setActiveTool(null)}
                className="ml-2 text-black/70 hover:text-black font-black"
              >
                ✕
              </button>
            </div>
          )}

          {/* Floating Canvas Controls (Zoom & Reset) */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-[#12151c]/90 backdrop-blur border border-[#222733] p-1.5 rounded-xl shadow-2xl z-10">
            <button
              onClick={() => setZoom(prev => Math.min(prev * 1.25, 3.5))}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.12))}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              title="Reset View"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* Floating Layer Toggles Bar */}
          <div className="absolute top-4 right-6 bg-[#12151c]/90 backdrop-blur border border-[#222733] px-3 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs z-10">
            <div className="flex items-center gap-1.5 font-bold text-gray-300 uppercase font-mono text-[10px] mr-1">
              <Layers size={13} className="text-cyan-400" />
              Layers:
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.crystals}
                onChange={(e) => setLayers(l => ({ ...l, crystals: e.target.checked }))}
                className="rounded border-[#2a303d] text-cyan-500 focus:ring-0"
              />
              <span>💎 Crystals</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.flagPaths}
                onChange={(e) => setLayers(l => ({ ...l, flagPaths: e.target.checked }))}
                className="rounded border-[#2a303d] text-cyan-500 focus:ring-0"
              />
              <span>🚩 Flags</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.fortresses}
                onChange={(e) => setLayers(l => ({ ...l, fortresses: e.target.checked }))}
                className="rounded border-[#2a303d] text-cyan-500 focus:ring-0"
              />
              <span>🏰 AFs</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.bastions}
                onChange={(e) => setLayers(l => ({ ...l, bastions: e.target.checked }))}
                className="rounded border-[#2a303d] text-cyan-500 focus:ring-0"
              />
              <span>🌟 Bastions</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.passes}
                onChange={(e) => setLayers(l => ({ ...l, passes: e.target.checked }))}
                className="rounded border-[#2a303d] text-cyan-500 focus:ring-0"
              />
              <span>🛡️ Passes</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.territory}
                onChange={(e) => setLayers(l => ({ ...l, territory: e.target.checked }))}
                className="rounded border-[#2a303d] text-cyan-500 focus:ring-0"
              />
              <span>🗺️ Shading</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
