"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { 
    Orbit, RotateCcw, Compass, Sparkles, Eye, Shield, Users, 
    Layers, Zap, Play, Pause, Maximize2, Minimize2, Tag,
    Search, X, Crosshair, ZoomIn, ZoomOut, ChevronDown, ChevronUp
} from "lucide-react";

export default function CerberusGalaxyCanvas({ galaxyData }) {
    const t = useTranslations("ProjectCerberus");
    const containerRef = useRef(null);
    const canvasRef = useRef(null);

    // Fullscreen Immersive State
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Camera and Interactive Controls State
    const [yaw, setYaw] = useState(0.4);        // Horizontal 3D rotation
    const [pitch, setPitch] = useState(0.35);    // Vertical 3D rotation
    const [zoom, setZoom] = useState(1.1);       // Distance warp zoom factor (0.2x to 8.0x)
    const [panX, setPanX] = useState(0);         // Lateral camera pan X
    const [panY, setPanY] = useState(0);         // Lateral camera pan Y
    const [wAngle, setWAngle] = useState(0);     // 4th Dimension Tesseract angle (radians)
    const [isAutoOrbit, setIsAutoOrbit] = useState(true);
    const [is4DDrifting, setIs4DDrifting] = useState(false);

    // Dimension Projection & Label Modes
    const [geometryMode, setGeometryMode] = useState("pca"); // 'pca' | 'spiral'
    const [dim5Mode, setDim5Mode] = useState("naming");       // 'naming' | 'alliance' | 'spectral'
    const [labelMode, setLabelMode] = useState("leaders");   // 'leaders' | 'all' | 'hover'

    // Search and Commander Warp
    const [searchQuery, setSearchQuery] = useState("");
    const [isHudExpanded, setIsHudExpanded] = useState(true);

    // Interactive Selection / Hover
    const [hoveredStar, setHoveredStar] = useState(null);
    const [selectedStar, setSelectedStar] = useState(null);

    // Mouse drag interaction refs
    const isDraggingRef = useRef(false);
    const dragModeRef = useRef("orbit"); // 'orbit' | 'pan'
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const screenNodesRef = useRef([]); // Stores projected 2D coordinates for hit testing

    // Background cosmic starfield particles
    const backgroundStars = useMemo(() => {
        const bg = [];
        for (let i = 0; i < 180; i++) {
            bg.push({
                x: (Math.random() - 0.5) * 2400,
                y: (Math.random() - 0.5) * 1600,
                r: Math.random() * 1.5 + 0.3,
                alpha: Math.random() * 0.75 + 0.2,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
            });
        }
        return bg;
    }, []);

    // Synchronize selected star with active galaxy dataset
    useEffect(() => {
        if (galaxyData?.stars?.length > 0) {
            const exists = selectedStar && galaxyData.stars.some(s => String(s.id) === String(selectedStar.id));
            if (!exists) {
                setSelectedStar(galaxyData.stars[0]);
            }
        }
    }, [galaxyData, selectedStar]);

    // Handle Fullscreen Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen]);

    // Search matches calculation
    const searchMatches = useMemo(() => {
        if (!searchQuery.trim() || !galaxyData?.stars?.length) return [];
        const q = searchQuery.toLowerCase().trim();
        return galaxyData.stars.filter(s => 
            s.name.toLowerCase().includes(q) ||
            s.alliance.toLowerCase().includes(q) ||
            s.namingClan.toLowerCase().includes(q) ||
            String(s.id).includes(q)
        ).slice(0, 10);
    }, [searchQuery, galaxyData]);

    const matchingStarIds = useMemo(() => {
        return new Set(searchMatches.map(m => m.id));
    }, [searchMatches]);

    // Warp camera smoothly to a specific star
    const warpToStar = useCallback((star) => {
        if (!star) return;
        setSelectedStar(star);
        setIsAutoOrbit(false);
        setZoom(prev => Math.max(1.8, prev));
        // Reset pan so star is in focal center
        setPanX(0);
        setPanY(0);
    }, []);

    // Animation & 3D Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !galaxyData?.stars?.length) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId;
        let localYaw = yaw;
        let localPitch = pitch;
        let localWAngle = wAngle;
        let time = 0;

        const render = () => {
            time += 0.02;

            // Auto-orbit rotation update
            if (isAutoOrbit && !isDraggingRef.current) {
                localYaw += 0.003;
            }

            // 4D Hyperspace Drift
            if (is4DDrifting) {
                localWAngle = (localWAngle + 0.008) % (Math.PI * 2);
            }

            // Handle high DPI
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
            }
            ctx.resetTransform?.();
            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;
            const centerX = width / 2;
            const centerY = height / 2;

            // 1. Draw Deep Space Celestial Background
            ctx.fillStyle = "#020509";
            ctx.fillRect(0, 0, width, height);

            // Ambient Cosmic Dust Nebulae
            const grad1 = ctx.createRadialGradient(
                centerX + panX * 0.2, centerY + panY * 0.2, 10, 
                centerX + panX * 0.2, centerY + panY * 0.2, Math.max(width, height) * 0.7
            );
            grad1.addColorStop(0, "rgba(14, 165, 233, 0.15)");   // Cyan galactic core
            grad1.addColorStop(0.35, "rgba(168, 85, 247, 0.09)"); // Violet mid nebula
            grad1.addColorStop(0.7, "rgba(6, 182, 212, 0.04)");  // Outer edge
            grad1.addColorStop(1, "rgba(2, 5, 9, 0.98)");
            ctx.fillStyle = grad1;
            ctx.fillRect(0, 0, width, height);

            // Twinkling background stars
            backgroundStars.forEach((star, idx) => {
                const tw = Math.sin(time * star.twinkleSpeed * 50 + idx) * 0.3 + 0.7;
                ctx.beginPath();
                ctx.arc(centerX + star.x + panX * 0.08, centerY + star.y + panY * 0.08, star.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * tw})`;
                ctx.fill();
            });

            // Draw Accretion Disc Faint Orbital Rings
            ctx.save();
            ctx.strokeStyle = "rgba(56, 189, 248, 0.14)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 14]);
            ctx.beginPath();
            ctx.ellipse(centerX + panX, centerY + panY, 280 * zoom, 110 * zoom, localYaw, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(centerX + panX, centerY + panY, 440 * zoom, 170 * zoom, localYaw, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // 2. Project Nodes via 4D Tesseract Rotation & 3D Camera
            const cosYaw = Math.cos(localYaw);
            const sinYaw = Math.sin(localYaw);
            const cosPitch = Math.cos(localPitch);
            const sinPitch = Math.sin(localPitch);
            const cosW = Math.cos(localWAngle);
            const sinW = Math.sin(localWAngle);

            const fov = 850;
            const camDist = 650 / zoom;

            const projectedStars = [];
            const starMap = new Map();

            galaxyData.stars.forEach(star => {
                // Coordinate selection
                const rawX = geometryMode === "pca" ? star.x : star.spiralX;
                const rawY = geometryMode === "pca" ? star.y : star.spiralY;
                const rawZ = geometryMode === "pca" ? star.z : star.spiralZ;
                const rawW = star.w;

                // Step 1: 4D Hyperplane Tesseract Rotation (X-W plane)
                const x4D = rawX * cosW - rawW * sinW;
                const w4D = rawX * sinW + rawW * cosW;

                // Stereographic 4D perspective divisor
                const s4D = 4 / (4 - (w4D / 120));
                const x3D = x4D * s4D;
                const y3D = rawY * s4D;
                const z3D = rawZ * s4D;

                // Step 2: 3D Camera Rotation (Yaw & Pitch)
                const xRot = x3D * cosYaw + z3D * sinYaw;
                const z1 = -x3D * sinYaw + z3D * cosYaw;

                const yRot = y3D * cosPitch - z1 * sinPitch;
                const zRot = y3D * sinPitch + z1 * cosPitch;

                // Step 3: 3D-to-2D Perspective Projection
                const zCam = zRot + camDist;
                if (zCam <= 8) return; // Behind camera clipping

                const k = fov / zCam;
                const screenX = centerX + xRot * k + panX;
                const screenY = centerY + yRot * k + panY;
                const screenR = Math.max(1.8, star.starSize * k * 0.38);

                const projectedObj = {
                    ...star,
                    xRot,
                    yRot,
                    zRot,
                    zCam,
                    screenX,
                    screenY,
                    screenR,
                    k,
                };

                projectedStars.push(projectedObj);
                starMap.set(star.id, projectedObj);
            });

            screenNodesRef.current = projectedStars;

            // 3. Draw Constellation Filaments (Dim 5: Alliance or Naming Nebulae)
            if (dim5Mode === "alliance" && galaxyData.allianceFilaments?.length) {
                ctx.save();
                galaxyData.allianceFilaments.forEach(fil => {
                    const s1 = starMap.get(fil.sourceId);
                    const s2 = starMap.get(fil.targetId);
                    if (!s1 || !s2) return;

                    ctx.beginPath();
                    ctx.moveTo(s1.screenX, s1.screenY);
                    ctx.lineTo(s2.screenX, s2.screenY);
                    ctx.strokeStyle = fil.color || "#06b6d4";
                    ctx.globalAlpha = 0.28;
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                });
                ctx.restore();
            } else if (dim5Mode === "naming" && galaxyData.namingFilaments?.length) {
                ctx.save();
                galaxyData.namingFilaments.forEach(fil => {
                    const s1 = starMap.get(fil.sourceId);
                    const s2 = starMap.get(fil.targetId);
                    if (!s1 || !s2) return;

                    ctx.beginPath();
                    ctx.moveTo(s1.screenX, s1.screenY);
                    ctx.lineTo(s2.screenX, s2.screenY);
                    ctx.strokeStyle = fil.color || "#a855f7";
                    ctx.globalAlpha = 0.42;
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([2, 4]);
                    ctx.stroke();
                });
                ctx.restore();
            }

            // 4. Sort Stars by Depth (Z descending - Painter's Algorithm)
            projectedStars.sort((a, b) => b.zRot - a.zRot);

            // 5. Draw Celestial Stars & Nameplates
            projectedStars.forEach(star => {
                const isHovered = hoveredStar?.id === star.id;
                const isSelected = selectedStar?.id === star.id;
                const isSearchMatch = matchingStarIds.has(star.id);

                // Color resolution based on Dim 5 Mode
                let baseColor = star.spectralColor;
                if (dim5Mode === "alliance") {
                    baseColor = star.allianceColor;
                } else if (dim5Mode === "naming") {
                    baseColor = star.nebulaColor;
                }

                // Supernova / Corona Pulsation
                const pulse = Math.sin(time * 3 + star.id) * 0.15 + 1.0;
                const r = (isHovered || isSelected || isSearchMatch ? star.screenR * 1.8 : star.screenR) * pulse;

                // Search Highlight Beacon
                if (isSearchMatch) {
                    ctx.save();
                    ctx.strokeStyle = "#00f0ff";
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.arc(star.screenX, star.screenY, r * 4.5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }

                // Outer Radiant Halo
                const glow = ctx.createRadialGradient(star.screenX, star.screenY, 0, star.screenX, star.screenY, r * 4.2);
                glow.addColorStop(0, baseColor);
                glow.addColorStop(0.35, baseColor + "66");
                glow.addColorStop(1, "transparent");

                ctx.beginPath();
                ctx.arc(star.screenX, star.screenY, r * 4.2, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();

                // Bright Incandescent Core
                ctx.beginPath();
                ctx.arc(star.screenX, star.screenY, r, 0, Math.PI * 2);
                ctx.fillStyle = isHovered || isSelected || isSearchMatch ? "#ffffff" : baseColor;
                ctx.fill();

                // Dynamic Floating Nameplate (See people!)
                const shouldShowLabel = 
                    isHovered || 
                    isSelected || 
                    isSearchMatch ||
                    labelMode === "all" || 
                    (labelMode === "leaders" && (star.power >= 70_000_000 || star.spectralType === "O-Hypergiant"));

                if (shouldShowLabel) {
                    // Alpha falloff based on camera distance
                    const labelAlpha = Math.max(0.2, Math.min(1.0, (1200 - star.zCam) / 600));

                    ctx.save();
                    ctx.globalAlpha = labelAlpha;

                    const nameText = star.name;
                    const allianceTag = star.alliance !== "None" ? `[${star.alliance}] ` : "";
                    const fullLabel = `${allianceTag}${nameText}`;
                    const powerText = `${(star.power / 1e6).toFixed(1)}M`;

                    ctx.font = isSelected || isHovered ? "bold 11px monospace" : "10px monospace";
                    const textMetrics = ctx.measureText(fullLabel);
                    const tagWidth = textMetrics.width + 12;

                    // Holographic Pill Background
                    const pillX = star.screenX + r + 6;
                    const pillY = star.screenY - 14;
                    ctx.fillStyle = isSelected ? "rgba(6, 182, 212, 0.4)" : "rgba(9, 13, 18, 0.78)";
                    ctx.strokeStyle = isSelected ? "#00f0ff" : (isSearchMatch ? "#38bdf8" : "rgba(255, 255, 255, 0.2)");
                    ctx.lineWidth = 1;

                    ctx.beginPath();
                    ctx.roundRect?.(pillX, pillY, tagWidth, 24, 4);
                    ctx.fill();
                    ctx.stroke();

                    // Commander Name
                    ctx.fillStyle = isSelected ? "#ffffff" : (isHovered ? "#38bdf8" : "#e2e8f0");
                    ctx.fillText(fullLabel, pillX + 6, pillY + 11);

                    // Power & Clan Subtext
                    ctx.font = "8px monospace";
                    ctx.fillStyle = baseColor;
                    ctx.fillText(`${powerText} • ${star.namingClan}`, pillX + 6, pillY + 21);

                    ctx.restore();
                }

                // Aerospace HUD Targeting Reticle for Locked / Hovered Target
                if (isSelected || isHovered) {
                    ctx.save();
                    ctx.strokeStyle = isSelected ? "#00f0ff" : "#ffffff";
                    ctx.lineWidth = 1.5;

                    // Targeting crosshairs
                    const reticleR = r * 3.2;
                    ctx.beginPath();
                    ctx.arc(star.screenX, star.screenY, reticleR, 0, Math.PI * 2);
                    ctx.stroke();

                    // Corner brackets
                    const bSize = reticleR + 6;
                    ctx.beginPath();
                    // Top-Left
                    ctx.moveTo(star.screenX - bSize, star.screenY - bSize + 5);
                    ctx.lineTo(star.screenX - bSize, star.screenY - bSize);
                    ctx.lineTo(star.screenX - bSize + 5, star.screenY - bSize);
                    // Top-Right
                    ctx.moveTo(star.screenX + bSize - 5, star.screenY - bSize);
                    ctx.lineTo(star.screenX + bSize, star.screenY - bSize);
                    ctx.lineTo(star.screenX + bSize, star.screenY - bSize + 5);
                    // Bottom-Left
                    ctx.moveTo(star.screenX - bSize, star.screenY + bSize - 5);
                    ctx.lineTo(star.screenX - bSize, star.screenY + bSize);
                    ctx.lineTo(star.screenX - bSize + 5, star.screenY + bSize);
                    // Bottom-Right
                    ctx.moveTo(star.screenX + bSize - 5, star.screenY + bSize);
                    ctx.lineTo(star.screenX + bSize, star.screenY + bSize);
                    ctx.lineTo(star.screenX + bSize, star.screenY + bSize - 5);
                    ctx.stroke();

                    ctx.restore();
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [
        galaxyData, yaw, pitch, zoom, panX, panY, wAngle, isAutoOrbit, is4DDrifting, 
        geometryMode, dim5Mode, labelMode, hoveredStar, selectedStar, backgroundStars,
        matchingStarIds
    ]);

    // Interactive Mouse Handlers (Orbit & Pan)
    const handleMouseDown = useCallback((e) => {
        isDraggingRef.current = true;
        // Right click (2) or Shift key = Pan mode, otherwise Orbit mode
        dragModeRef.current = (e.button === 2 || e.shiftKey || e.button === 1) ? "pan" : "orbit";
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Active Dragging
        if (isDraggingRef.current) {
            const dx = e.clientX - lastMousePosRef.current.x;
            const dy = e.clientY - lastMousePosRef.current.y;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };

            if (dragModeRef.current === "pan") {
                // Pan lateral camera view
                setPanX(prev => prev + dx);
                setPanY(prev => prev + dy);
            } else {
                // 3D Orbit camera
                setYaw(prev => prev + dx * 0.006);
                setPitch(prev => Math.max(-1.4, Math.min(1.4, prev - dy * 0.006)));
            }
            return;
        }

        // Raycasting / Hit-testing nearest node to mouse cursor
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let closest = null;
        let minDist = 22; // 22px hit radius

        screenNodesRef.current.forEach(star => {
            const dist = Math.hypot(star.screenX - mouseX, star.screenY - mouseY);
            if (dist < minDist) {
                minDist = dist;
                closest = star;
            }
        });

        setHoveredStar(closest);
    }, []);

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    const handleClick = useCallback(() => {
        if (hoveredStar) {
            setSelectedStar(hoveredStar);
        }
    }, [hoveredStar]);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setZoom(prev => Math.max(0.2, Math.min(7.5, prev + delta)));
    }, []);

    // Toggle native browser / component fullscreen
    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => {
            const next = !prev;
            if (next) {
                try {
                    containerRef.current?.requestFullscreen?.().catch(() => {});
                } catch {}
            } else {
                try {
                    if (document.fullscreenElement) {
                        document.exitFullscreen?.().catch(() => {});
                    }
                } catch {}
            }
            return next;
        });
    }, []);

    return (
        <div 
            ref={containerRef}
            className={isFullscreen 
                ? "fixed inset-0 z-50 bg-[#020509] flex flex-col w-screen h-screen overflow-hidden p-3 md:p-6" 
                : "space-y-4 font-mono"
            }
        >
            {/* Control Bar & Dimensions Telemetry */}
            <div className="bg-[#090d12]/90 backdrop-blur-md border border-[#1a2332] rounded-2xl p-3 md:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 shadow-lg">
                
                {/* 5-Dimensional Telemetry Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                        <Orbit size={11} className="text-cyan-400 animate-spin" />
                        5D STAR FLIGHT
                    </span>

                    <div className="flex items-center gap-1 bg-[#10161f] border border-[#1a2332] rounded-lg p-1 text-[10px]">
                        <button
                            onClick={() => setGeometryMode("pca")}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                geometryMode === "pca" ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            {t("geom_pca")}
                        </button>
                        <button
                            onClick={() => setGeometryMode("spiral")}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                geometryMode === "spiral" ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            {t("geom_spiral")}
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-[#10161f] border border-[#1a2332] rounded-lg p-1 text-[10px]">
                        <button
                            onClick={() => setDim5Mode("naming")}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                                dim5Mode === "naming" ? "bg-purple-500/20 text-purple-400 font-bold border border-purple-500/40" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <Tag size={10} />
                            {t("mode_naming")}
                        </button>
                        <button
                            onClick={() => setDim5Mode("alliance")}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                                dim5Mode === "alliance" ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <Shield size={10} />
                            {t("mode_alliance")}
                        </button>
                        <button
                            onClick={() => setDim5Mode("spectral")}
                            className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                                dim5Mode === "spectral" ? "bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <Sparkles size={10} />
                            {t("mode_spectral")}
                        </button>
                    </div>

                    {/* Labels Display Mode Button */}
                    <div className="flex items-center gap-1 bg-[#10161f] border border-[#1a2332] rounded-lg p-1 text-[10px]">
                        <button
                            onClick={() => setLabelMode(prev => prev === "leaders" ? "all" : (prev === "all" ? "hover" : "leaders"))}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
                        >
                            <Eye size={10} />
                            <span>
                                {labelMode === "leaders" ? t("label_mode_leaders") : (labelMode === "all" ? t("label_mode_all") : t("label_mode_hover"))}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Search Bar & 4D / Fullscreen Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Live Commander Search Box */}
                    <div className="relative">
                        <div className="flex items-center gap-1.5 bg-[#10161f] border border-[#1a2332] rounded-xl px-2.5 py-1 text-xs">
                            <Search size={12} className="text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={t("search_placeholder_galaxy")}
                                className="w-32 sm:w-44 bg-transparent text-white text-[11px] focus:outline-none placeholder-gray-500 font-mono"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-white">
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Search Matches Dropdown */}
                        {searchMatches.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-[#090d12] border border-[#1a2332] rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto p-1 font-mono text-xs">
                                {searchMatches.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => {
                                            warpToStar(m);
                                            setSearchQuery("");
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 flex items-center justify-between text-[11px] transition-colors cursor-pointer"
                                    >
                                        <span className="font-bold truncate">{m.name}</span>
                                        <span className="text-[9px] text-gray-500 shrink-0">
                                            {(m.power / 1e6).toFixed(1)}M • {m.alliance}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4D Hyperplane Slider */}
                    <div className="hidden sm:flex items-center gap-2 bg-[#10161f] border border-[#1a2332] rounded-xl px-2.5 py-1 text-xs">
                        <span className="text-[9px] text-purple-400 uppercase tracking-wider font-bold">
                            4D (W)
                        </span>
                        <input
                            type="range"
                            min="0"
                            max={Math.PI * 2}
                            step="0.05"
                            value={wAngle}
                            onChange={e => setWAngle(Number(e.target.value))}
                            className="w-16 accent-purple-400 cursor-pointer"
                        />
                        <button
                            onClick={() => setIs4DDrifting(!is4DDrifting)}
                            className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase cursor-pointer transition-all ${
                                is4DDrifting ? "bg-purple-500 text-black shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                            }`}
                        >
                            {is4DDrifting ? "Drift" : "Drift"}
                        </button>
                    </div>

                    {/* Auto Orbit */}
                    <button
                        onClick={() => setIsAutoOrbit(!isAutoOrbit)}
                        className={`p-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isAutoOrbit 
                                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]" 
                                : "bg-[#10161f] border-[#1a2332] text-gray-400 hover:text-white"
                        }`}
                        title={t("btn_auto_orbit")}
                    >
                        {isAutoOrbit ? <Pause size={13} /> : <Play size={13} />}
                    </button>

                    {/* Reset View */}
                    <button
                        onClick={() => {
                            setYaw(0.4);
                            setPitch(0.35);
                            setZoom(1.1);
                            setPanX(0);
                            setPanY(0);
                            setWAngle(0);
                        }}
                        className="p-1.5 rounded-xl bg-[#10161f] border border-[#1a2332] text-gray-400 hover:text-white hover:border-gray-500 transition-colors cursor-pointer"
                        title={t("btn_reset_view")}
                    >
                        <RotateCcw size={13} />
                    </button>

                    {/* FULLSCREEN TOGGLE BUTTON */}
                    <button
                        onClick={toggleFullscreen}
                        className={`p-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isFullscreen 
                                ? "bg-emerald-500 text-black border-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                                : "bg-cyan-600 hover:bg-cyan-500 text-black font-bold border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                        }`}
                        title={isFullscreen ? t("btn_exit_fullscreen") : t("btn_fullscreen")}
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                </div>
            </div>

            {/* Interactive 3D Canvas Viewport */}
            <div 
                className={`relative w-full bg-[#020509] border border-[#1a2332] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] ${
                    isFullscreen ? "flex-1 h-full min-h-[400px]" : "h-[540px] md:h-[640px]"
                }`}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={handleClick}
                    onWheel={handleWheel}
                    onContextMenu={e => e.preventDefault()}
                    className="w-full h-full cursor-grab active:cursor-grabbing block"
                />

                {/* Corner Aerospace Coordinates HUD */}
                <div className="absolute top-4 left-4 pointer-events-none text-[10px] space-y-1 text-gray-400 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                        <Compass size={12} />
                        <span>STAR FLIGHT TELEMETRY</span>
                    </div>
                    <div>YAW: {(yaw % (Math.PI * 2)).toFixed(2)} | PITCH: {pitch.toFixed(2)} | WARP: {zoom.toFixed(2)}x</div>
                    <div>PAN: ({panX.toFixed(0)}, {panY.toFixed(0)}) | 4D TESSERACT: {(wAngle * (180 / Math.PI)).toFixed(0)}°</div>
                    <div className="text-gray-500 text-[9px] pt-1 border-t border-white/10">
                        {t("flight_controls_hint")}
                    </div>
                </div>

                {/* Top Right Quick Stats HUD */}
                <div className="absolute top-4 right-4 pointer-events-none text-[10px] text-right space-y-1 text-gray-400 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl">
                    <div className="text-emerald-400 font-bold">
                        {galaxyData.totalStars} CELESTIAL BODIES
                    </div>
                    <div>{galaxyData.recognizedClansCount} Naming Nebulae</div>
                    <div>{galaxyData.alliancesCount} Alliance Constellations</div>
                    <div className="text-[9px] text-gray-500 pt-1 border-t border-white/10">
                        Active Mode: <strong className="text-white uppercase">{dim5Mode}</strong>
                    </div>
                </div>

                {/* Floating Target Hologram Card (Collapsible in Fullscreen) */}
                {selectedStar && (
                    <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md bg-[#090d12]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_35px_rgba(6,182,212,0.2)] font-mono text-xs">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 rounded">
                                    {t("hud_locked_target")}
                                </span>
                                <span className="font-bold text-white text-sm truncate max-w-[180px]">
                                    {selectedStar.name}
                                </span>
                                <span className="text-gray-500 text-[10px]">
                                    [ID: {selectedStar.id}]
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => warpToStar(selectedStar)}
                                    className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[9px] font-bold cursor-pointer"
                                    title="Center on Commander"
                                >
                                    <Crosshair size={12} />
                                </button>
                                <button
                                    onClick={() => setIsHudExpanded(!isHudExpanded)}
                                    className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
                                >
                                    {isHudExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </button>
                            </div>
                        </div>

                        {isHudExpanded && (
                            <div className="space-y-3 pt-1 border-t border-[#1a2332]">
                                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                    <span 
                                        className="px-2 py-0.5 rounded border font-bold"
                                        style={{ 
                                            color: selectedStar.nebulaColor, 
                                            borderColor: selectedStar.nebulaColor + "55",
                                            backgroundColor: selectedStar.nebulaColor + "15"
                                        }}
                                    >
                                        Clan: {selectedStar.namingClan}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-[#10161f] border border-[#1a2332] text-gray-300">
                                        {selectedStar.alliance !== "None" ? selectedStar.alliance : "No Alliance"}
                                    </span>
                                    <span className="text-gray-400">
                                        Type: <strong className="text-white">{selectedStar.spectralType}</strong>
                                    </span>
                                </div>

                                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                                    <div className="bg-[#10161f] border border-[#1a2332] rounded-lg p-1.5">
                                        <span className="text-gray-500 text-[8px] block">POWER</span>
                                        <span className="text-white font-bold">{(selectedStar.power / 1e6).toFixed(1)}M</span>
                                    </div>
                                    <div className="bg-[#10161f] border border-[#1a2332] rounded-lg p-1.5">
                                        <span className="text-gray-500 text-[8px] block">KP</span>
                                        <span className="text-cyan-400 font-bold">{(selectedStar.killPoints / 1e6).toFixed(1)}M</span>
                                    </div>
                                    <div className="bg-[#10161f] border border-[#1a2332] rounded-lg p-1.5">
                                        <span className="text-gray-500 text-[8px] block">DEADS</span>
                                        <span className="text-amber-400 font-bold">{(selectedStar.deads / 1e3).toFixed(0)}k</span>
                                    </div>
                                    <div className="bg-[#10161f] border border-[#1a2332] rounded-lg p-1.5">
                                        <span className="text-gray-500 text-[8px] block">TENSOR</span>
                                        <span className="text-purple-300 font-bold text-[9px]">
                                            ({selectedStar.x.toFixed(0)}, {selectedStar.y.toFixed(0)})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Target Card (Rendered only when not in Fullscreen) */}
            {!isFullscreen && selectedStar && (
                <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    <div 
                        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
                        style={{ backgroundColor: selectedStar.nebulaColor + "15" }}
                    />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 rounded">
                                    {t("hud_locked_target")}
                                </span>
                                <h3 className="text-lg md:text-xl font-black text-white">
                                    {selectedStar.name}
                                </h3>
                                <span className="text-gray-500 text-xs">
                                    [ID: {selectedStar.id}]
                                </span>
                                <span 
                                    className="px-2.5 py-0.5 rounded border text-[10px] font-bold"
                                    style={{ 
                                        color: selectedStar.nebulaColor, 
                                        borderColor: selectedStar.nebulaColor + "55",
                                        backgroundColor: selectedStar.nebulaColor + "15"
                                    }}
                                >
                                    Clan: {selectedStar.namingClan}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#10161f] border border-[#1a2332] text-[10px] text-gray-300">
                                    {selectedStar.alliance !== "None" ? selectedStar.alliance : "No Alliance"}
                                </span>
                            </div>

                            <p className="text-gray-400 text-xs">
                                Stellar Class: <strong className="text-white">{selectedStar.spectralType}</strong> • 
                                War Contribution: <strong className="text-cyan-400">{selectedStar.warRatio}%</strong> • 
                                T1 Duel Padding: <strong className={selectedStar.t1Ratio > 60 ? "text-rose-400" : "text-emerald-400"}>{selectedStar.t1Ratio}%</strong>
                            </p>
                        </div>

                        {/* 5D Hologram Tensor Coordinates */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right shrink-0">
                            <div className="bg-[#10161f] border border-[#1a2332] rounded-xl p-2.5">
                                <span className="text-gray-500 text-[9px] block">POWER</span>
                                <span className="text-white font-bold text-sm">{(selectedStar.power / 1e6).toFixed(1)}M</span>
                            </div>
                            <div className="bg-[#10161f] border border-[#1a2332] rounded-xl p-2.5">
                                <span className="text-gray-500 text-[9px] block">KILL POINTS</span>
                                <span className="text-cyan-400 font-bold text-sm">{(selectedStar.killPoints / 1e6).toFixed(1)}M</span>
                            </div>
                            <div className="bg-[#10161f] border border-[#1a2332] rounded-xl p-2.5">
                                <span className="text-gray-500 text-[9px] block">DEAD TROOPS</span>
                                <span className="text-amber-400 font-bold text-sm">{selectedStar.deads.toLocaleString()}</span>
                            </div>
                            <div className="bg-[#10161f] border border-[#1a2332] rounded-xl p-2.5">
                                <span className="text-gray-500 text-[9px] block">5D TENSOR</span>
                                <span className="text-purple-300 text-xs block font-bold">
                                    ({selectedStar.x.toFixed(0)}, {selectedStar.y.toFixed(0)}, {selectedStar.z.toFixed(0)}, {selectedStar.w.toFixed(0)})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
