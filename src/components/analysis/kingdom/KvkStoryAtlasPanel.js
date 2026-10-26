"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  Crosshair,
  Copy,
  Check,
  Compass,
  Clock,
  Terminal,
  Award,
  Layers,
} from "lucide-react";
import {
  KVK_STORY_MAP_ATLAS,
  ALLIANCE_LOG_OPCODES,
  ALLIANCE_OFFICER_POSTS,
  convertSubTileToMapCoords,
  calculateAllianceActivityScore,
} from "@/lib/kvkMapAtlas";

const STORY_KEYS = Object.keys(KVK_STORY_MAP_ATLAS);

const DEFAULT_KD_SEEDS = ["4197", "4194", "4200", "4198", "4193", "4195", "4196", "3606"];

export default function KvkStoryAtlasPanel() {
  const [selectedStoryKey, setSelectedStoryKey] = useState("S18");
  const [selectedCampIdx, setSelectedCampIdx] = useState(0);
  const [campAssignments, setCampAssignments] = useState({});
  const [copiedBrief, setCopiedBrief] = useState(false);

  // Sub-tile converter state
  const [rawSubX, setRawSubX] = useState("3684");
  const [rawSubY, setRawSubY] = useState("3528");

  // Activity score calculator state
  const [actForts, setActForts] = useState("42");
  const [actHelps, setActHelps] = useState("1450");
  const [actTech, setActTech] = useState("185000");
  const [actBuild, setActBuild] = useState("62000");

  const story = KVK_STORY_MAP_ATLAS[selectedStoryKey] || KVK_STORY_MAP_ATLAS.S18;
  const storyTitle = useMemo(() => {
    if (!story) return "Season of Conquest";
    if (Array.isArray(story.stories) && story.stories.length > 0) {
      return story.stories.join(" / ");
    }
    return story.name || story.code || selectedStoryKey;
  }, [story, selectedStoryKey]);

  const stageW = story?.stage?.w || 1600;
  const stageH = story?.stage?.h || 998;
  const mapBox = story?.map || { x: 80, y: 8, w: 1440, h: 990 };

  const campsList = useMemo(() => {
    if (!story || !story.camps) return [];
    const rawEntries = Array.isArray(story.camps)
      ? story.camps.map((c, i) => [String(i), c])
      : Object.entries(story.camps);

    return rawEntries.map(([slug, c], idx) => {
      const pinX = Array.isArray(c.pin)
        ? c.pin[0]
        : Array.isArray(c.coords)
        ? c.coords[0]
        : typeof c.x === "number"
        ? c.x
        : 800;
      const pinY = Array.isArray(c.pin)
        ? c.pin[1]
        : Array.isArray(c.coords)
        ? c.coords[1]
        : typeof c.y === "number"
        ? c.y
        : 500;
      const lkX = Math.max(
        0,
        Math.min(1000, Math.round(((pinX - mapBox.x) / mapBox.w) * 1000))
      );
      const lkY = Math.max(
        0,
        Math.min(1000, Math.round(((pinY - mapBox.y) / mapBox.h) * 1000))
      );
      return {
        slug,
        idx,
        name: c.name || slug,
        color: c.color || "#06b6d4",
        boxX: typeof c.x === "number" ? c.x : pinX,
        boxY: typeof c.y === "number" ? c.y : pinY,
        pinX,
        pinY,
        lkX,
        lkY,
      };
    });
  }, [story, mapBox.x, mapBox.y, mapBox.w, mapBox.h]);

  const convertedCoords = useMemo(() => {
    const rx = Number(rawSubX || 0);
    const ry = Number(rawSubY || 0);
    const x = Number.isFinite(rx) ? Math.floor(rx / 6 + 0.5) : 0;
    const y = Number.isFinite(ry) ? Math.floor(ry / 6 + 0.5) : 0;
    const formatted = convertSubTileToMapCoords(`1,${rx},${ry}`);
    return { x, y, formatted };
  }, [rawSubX, rawSubY]);

  const computedActivityScore = useMemo(() => {
    const res = calculateAllianceActivityScore({
      fortDestroy: Number(actForts || 0),
      helpCount: Number(actHelps || 0),
      techPoints: Number(actTech || 0),
      buildPoints: Number(actBuild || 0),
    });
    if (typeof res === "number") return Math.round(res);
    return res?.roundedScore ?? Math.round(res?.rawScore || 0);
  }, [actForts, actHelps, actTech, actBuild]);

  const opcodeEntries = useMemo(() => {
    return Object.entries(ALLIANCE_LOG_OPCODES || {}).map(([code, val]) => {
      const label = typeof val === "string" ? val : val?.label || String(val);
      const num = Number(code);
      const category =
        typeof val === "object" && val?.category
          ? val.category
          : num >= 300
          ? "WARFARE"
          : num >= 200
          ? "ROSTER"
          : "TERRITORY";
      return { code, label, category };
    });
  }, []);

  const getCampMeta = (idx) => {
    const key = `${selectedStoryKey}_${idx}`;
    return (
      campAssignments[key] || {
        kd: DEFAULT_KD_SEEDS[idx % DEFAULT_KD_SEEDS.length],
        stance: idx % 2 === 0 ? "COALITION A" : "COALITION B",
      }
    );
  };

  const updateCampMeta = (idx, field, value) => {
    const key = `${selectedStoryKey}_${idx}`;
    const current = getCampMeta(idx);
    setCampAssignments((prev) => ({
      ...prev,
      [key]: { ...current, [field]: value },
    }));
  };

  const handleCopyBriefing = () => {
    const lines = campsList.map((c, idx) => {
      const meta = getCampMeta(idx);
      return `| **${c.name}** | \`${c.color}\` | \`Pin [${c.pinX}, ${c.pinY}] (LK X:${c.lkX} Y:${c.lkY})\` | **KD #${meta.kd}** | \`${meta.stance}\` |`;
    });
    const md =
      `# 🗺️ ${story.code} — ${storyTitle} (${campsList.length}-Camp Lost Kingdom Atlas)\n\n` +
      `| Camp Faction | Hex Color | Starting Pin Coords | Assigned Kingdom | Coalition Stance |\n` +
      `| :--- | :---: | :---: | :---: | :---: |\n` +
      lines.join("\n") +
      `\n\n• **Ancient Ruins Cycle:** Every 40 Hours\n• **Altar of Darkness Cycle:** Every 86 Hours\n`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(md);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2500);
    }
  };

  const activeCamp = campsList[selectedCampIdx] || campsList[0];

  return (
    <div className="space-y-6 text-gray-200">
      {/* Header & 13-Story Selector Pills */}
      <div className="rounded-2xl border border-cyan-500/20 bg-[#0d1017] p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#1e2430]">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                13-Story SoC KvK Atlas (S4–S21)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {campsList.length} Starting Camps
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-white mt-1.5 tracking-tight">
              {story.code} — {storyTitle}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Interactive Season of Conquest Starting Camp Pin Coordinates, Official Lost Kingdom Minimap Overlay, Coalition Matchmaking &amp; KvK Chronicle Timers
            </p>
          </div>

          <button
            onClick={handleCopyBriefing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all self-start lg:self-auto"
          >
            {copiedBrief ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            <span>{copiedBrief ? "Copied Discord Briefing!" : "Copy KvK Camp Briefing"}</span>
          </button>
        </div>

        {/* 13 Story Selector Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {STORY_KEYS.map((key) => {
            const item = KVK_STORY_MAP_ATLAS[key];
            const itemTitle =
              Array.isArray(item?.stories) && item.stories.length > 0
                ? item.stories[0]
                : item?.name || key;
            const itemCampCount = Array.isArray(item?.camps)
              ? item.camps.length
              : Object.keys(item?.camps || {}).length;
            const active = key === selectedStoryKey;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedStoryKey(key);
                  setSelectedCampIdx(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  active
                    ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                    : "bg-[#141923] text-gray-300 border-[#252d3d] hover:border-cyan-500/40 hover:text-white"
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">{item?.code || key}</span>
                <span>{itemTitle}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    active ? "bg-black/20 text-black" : "bg-white/5 text-gray-400"
                  }`}
                >
                  {itemCampCount}C
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Interactive Lost Kingdom Camp Map + Right Camp Assignment Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Interactive Lost Kingdom Minimap & Camp Pin Radar */}
        <div className="xl:col-span-7 rounded-2xl border border-[#1e2430] bg-[#0b0e14] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                Lost Kingdom Starting Camp Pin Map ({story.code} — {storyTitle})
              </span>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              {stageW} × {stageH} Tactical Stage • Click any Camp Pin
            </span>
          </div>

          <div className="relative w-full rounded-2xl border border-[#222938] bg-gradient-to-br from-[#0d131f] via-[#090d14] to-[#111827] overflow-hidden shadow-inner">
            <svg
              viewBox={`0 0 ${stageW} ${stageH}`}
              className="w-full h-auto max-h-[540px] block mx-auto"
            >
              <defs>
                <radialGradient id="lkCoreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(245, 158, 11, 0.22)" />
                  <stop offset="55%" stopColor="rgba(6, 182, 212, 0.08)" />
                  <stop offset="100%" stopColor="rgba(10, 12, 18, 0)" />
                </radialGradient>
              </defs>

              {/* Official Lost Kingdom Minimap WebP Layer */}
              {story?.image && (
                <image
                  href={story.image}
                  x={mapBox.x}
                  y={mapBox.y}
                  width={mapBox.w}
                  height={mapBox.h}
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.88"
                />
              )}

              {/* Subtle Tactical Grid Overlay */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                <g key={ratio}>
                  <line
                    x1={mapBox.x + mapBox.w * ratio}
                    y1={mapBox.y}
                    x2={mapBox.x + mapBox.w * ratio}
                    y2={mapBox.y + mapBox.h}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={mapBox.x}
                    y1={mapBox.y + mapBox.h * ratio}
                    x2={mapBox.x + mapBox.w}
                    y2={mapBox.y + mapBox.h * ratio}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1.5"
                  />
                </g>
              ))}

              {/* Spokes from Center Ziggurat to Camp Pins */}
              {campsList.map((camp, idx) => (
                <line
                  key={`line_${camp.slug}`}
                  x1={stageW / 2}
                  y1={stageH / 2}
                  x2={camp.pinX}
                  y2={camp.pinY}
                  stroke={camp.color}
                  strokeOpacity={selectedCampIdx === idx ? 0.85 : 0.35}
                  strokeWidth={selectedCampIdx === idx ? 4 : 2}
                  strokeDasharray="8 6"
                />
              ))}

              {/* Central Great Ziggurat Marker */}
              <g transform={`translate(${stageW / 2}, ${stageH / 2})`}>
                <circle r="48" fill="url(#lkCoreGlow)" stroke="rgba(245,158,11,0.5)" strokeWidth="2" />
                <polygon
                  points="0,-22 20,0 0,22 -20,0"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
                <text
                  y="42"
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="20"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  🏛️ ZIGGURAT (KING&apos;S LAND)
                </text>
              </g>

              {/* Camp Pins */}
              {campsList.map((camp, idx) => {
                const isSelected = selectedCampIdx === idx;
                const meta = getCampMeta(idx);
                return (
                  <g
                    key={camp.slug}
                    transform={`translate(${camp.pinX}, ${camp.pinY})`}
                    onClick={() => setSelectedCampIdx(idx)}
                    className="cursor-pointer"
                  >
                    {/* Outer Pulse Ring */}
                    <circle
                      r={isSelected ? 48 : 34}
                      fill={camp.color}
                      fillOpacity={isSelected ? 0.35 : 0.18}
                      stroke={camp.color}
                      strokeWidth={isSelected ? 4 : 2}
                    />
                    {/* Core Pin Circle */}
                    <circle
                      r={22}
                      fill={camp.color}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 4 : 2.5}
                    />
                    <text
                      y="7"
                      textAnchor="middle"
                      fill="#090d14"
                      fontSize="18"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      {idx + 1}
                    </text>

                    {/* Label Pill */}
                    <g transform="translate(0, -40)">
                      <rect
                        x="-120"
                        y="-28"
                        width="240"
                        height="34"
                        rx="8"
                        fill="rgba(9, 13, 20, 0.92)"
                        stroke={camp.color}
                        strokeWidth="2.5"
                      />
                      <text
                        y="-6"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="18"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {camp.name.toUpperCase()} • #{meta.kd}
                      </text>
                    </g>

                    {/* Coordinate Subtitle */}
                    <g transform="translate(0, 44)">
                      <rect
                        x="-85"
                        y="-16"
                        width="170"
                        height="24"
                        rx="6"
                        fill="rgba(9, 13, 20, 0.85)"
                      />
                      <text
                        y="1"
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="15"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        LK X:{camp.lkX} Y:{camp.lkY}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Recurring KvK Chronicle Cycle Footer */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#121722] border border-[#232b3b] flex items-center gap-3">
              <Clock size={18} className="text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] font-mono uppercase text-gray-400">Ancient Ruins Cycle</div>
                <div className="text-xs font-bold text-white">Every 40 Hours (1h Hold)</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#121722] border border-[#232b3b] flex items-center gap-3">
              <Clock size={18} className="text-purple-400 shrink-0" />
              <div>
                <div className="text-[10px] font-mono uppercase text-gray-400">Altar of Darkness Cycle</div>
                <div className="text-xs font-bold text-white">Every 86 Hours (2h Control)</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#121722] border border-[#232b3b] flex items-center gap-3">
              <Crosshair size={18} className="text-cyan-400 shrink-0" />
              <div>
                <div className="text-[10px] font-mono uppercase text-gray-400">Selected Camp Pin</div>
                <div className="text-xs font-bold text-cyan-300">
                  {activeCamp
                    ? `${activeCamp.name} (LK X:${activeCamp.lkX} Y:${activeCamp.lkY})`
                    : "Select a Camp"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Camp Kingdom Assignment & Coalition Planner */}
        <div className="xl:col-span-5 rounded-2xl border border-[#1e2430] bg-[#0b0e14] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                Camp Faction Roster &amp; Kingdom Assignments
              </span>
            </div>
            <span className="text-[11px] font-mono text-amber-300">
              {campsList.length} Starting Zones
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            {campsList.map((camp, idx) => {
              const meta = getCampMeta(idx);
              const isSelected = selectedCampIdx === idx;
              return (
                <div
                  key={camp.slug}
                  onClick={() => setSelectedCampIdx(idx)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#161d2b] border-cyan-500/60 shadow-lg"
                      : "bg-[#11151f] border-[#1f2637] hover:border-[#2e384f]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                        style={{ backgroundColor: camp.color }}
                      />
                      <div>
                        <div className="text-sm font-black text-white flex items-center gap-2">
                          <span>
                            Camp {idx + 1}: {camp.name}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400">{camp.color}</span>
                        </div>
                        <div className="text-[11px] font-mono text-cyan-300">
                          Stage Pin: [{camp.pinX}, {camp.pinY}] • LK X:{camp.lkX} Y:{camp.lkY}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#0b0e14] border border-[#263044] rounded-lg px-2 py-1">
                        <span className="text-[10px] font-mono text-gray-400 mr-1">KD #</span>
                        <input
                          type="text"
                          value={meta.kd}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateCampMeta(idx, "kd", e.target.value)}
                          className="w-12 bg-transparent text-xs font-mono font-bold text-white outline-none"
                          maxLength={6}
                        />
                      </div>

                      <select
                        value={meta.stance}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateCampMeta(idx, "stance", e.target.value)}
                        className="bg-[#0b0e14] border border-[#263044] rounded-lg px-2 py-1 text-[11px] font-bold text-gray-200 outline-none"
                      >
                        <option value="COALITION A">🛡️ COALITION A</option>
                        <option value="COALITION B">⚔️ COALITION B</option>
                        <option value="HOME CAMP">👑 HOME CAMP</option>
                        <option value="NEUTRAL">🕊️ NEUTRAL</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Sub-Tile Coordinate Converter + Alliance Activity Score + Lilith Opcodes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sub-Tile Converter & Alliance Activity Score Calculator */}
        <div className="lg:col-span-5 rounded-2xl border border-[#1e2430] bg-[#0b0e14] p-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={16} className="text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Lilith Sub-Tile Coordinate Converter
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Converts raw internal sub-tile coordinates into exact in-game World Map{" "}
              <code className="text-emerald-300">(X, Y)</code> coordinates using{" "}
              <code className="text-cyan-300">Math.floor(raw / 6 + 0.5)</code>.
            </p>
            <div className="grid grid-cols-3 gap-2.5 items-center">
              <div className="bg-[#121722] border border-[#232b3b] rounded-xl p-2.5">
                <label className="text-[10px] font-mono uppercase text-gray-400 block">
                  Raw Sub-Tile X
                </label>
                <input
                  type="number"
                  value={rawSubX}
                  onChange={(e) => setRawSubX(e.target.value)}
                  className="w-full bg-transparent text-sm font-mono font-bold text-white outline-none mt-0.5"
                />
              </div>
              <div className="bg-[#121722] border border-[#232b3b] rounded-xl p-2.5">
                <label className="text-[10px] font-mono uppercase text-gray-400 block">
                  Raw Sub-Tile Y
                </label>
                <input
                  type="number"
                  value={rawSubY}
                  onChange={(e) => setRawSubY(e.target.value)}
                  className="w-full bg-transparent text-sm font-mono font-bold text-white outline-none mt-0.5"
                />
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-center">
                <div className="text-[10px] font-mono uppercase text-emerald-300">
                  World Map Pin
                </div>
                <div className="text-sm font-mono font-black text-white mt-0.5">
                  X:{convertedCoords.x} Y:{convertedCoords.y}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1e2430]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Alliance Activity Score Simulator
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Score: {Number(computedActivityScore || 0).toLocaleString()} pts
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#121722] border border-[#232b3b] rounded-xl p-2">
                <label className="text-[10px] font-mono text-gray-400 block">Forts (×10)</label>
                <input
                  type="number"
                  value={actForts}
                  onChange={(e) => setActForts(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none mt-0.5"
                />
              </div>
              <div className="bg-[#121722] border border-[#232b3b] rounded-xl p-2">
                <label className="text-[10px] font-mono text-gray-400 block">Helps (×1)</label>
                <input
                  type="number"
                  value={actHelps}
                  onChange={(e) => setActHelps(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none mt-0.5"
                />
              </div>
              <div className="bg-[#121722] border border-[#232b3b] rounded-xl p-2">
                <label className="text-[10px] font-mono text-gray-400 block">Tech Pts (÷1k)</label>
                <input
                  type="number"
                  value={actTech}
                  onChange={(e) => setActTech(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none mt-0.5"
                />
              </div>
              <div className="bg-[#121722] border border-[#232b3b] rounded-xl p-2">
                <label className="text-[10px] font-mono text-gray-400 block">Build Pts (÷1k)</label>
                <input
                  type="number"
                  value={actBuild}
                  onChange={(e) => setActBuild(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none mt-0.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lilith Alliance Log Reference & 12 Officer Posts */}
        <div className="lg:col-span-7 rounded-2xl border border-[#1e2430] bg-[#0b0e14] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Lilith Alliance Event Log Opcode Dictionary (101–308) &amp; Officer Posts
              </h3>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              {opcodeEntries.length} Event Opcodes • 12 Officer IDs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {opcodeEntries.map(({ code, label, category }) => (
              <div
                key={code}
                className="p-2 rounded-lg bg-[#121722] border border-[#202838] flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[10px] font-bold shrink-0">
                    #{code}
                  </span>
                  <span className="text-[11px] text-gray-200 truncate" title={label}>
                    {label}
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-400 shrink-0">
                  {category}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-[#1e2430] flex flex-wrap gap-1.5">
            {Object.entries(ALLIANCE_OFFICER_POSTS).map(([id, title]) => (
              <span
                key={id}
                className="px-2 py-0.5 rounded-md bg-[#141a26] border border-[#252f42] text-[10px] font-mono text-gray-300"
              >
                Post #{id}: <strong className="text-amber-300">{title}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
