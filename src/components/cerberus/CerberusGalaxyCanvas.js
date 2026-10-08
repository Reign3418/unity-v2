"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { 
    Orbit, RotateCcw, Compass, Sparkles, Eye, Shield, Users, 
    Layers, Zap, Play, Pause, Maximize2, Tag
} from "lucide-react";

export default function CerberusGalaxyCanvas({ galaxyData }) {
    const t = useTranslations("ProjectCerberus");
    const canvasRef = useRef(null);

    // Camera and Interactive Controls State
    const [yaw, setYaw] = useState(0.4);      // Horizontal 3D rotation
    const [pitch, setPitch] = useState(0.35);  // Vertical 3D rotation
    const [zoom, setZoom] = useState(1.1);     // Distance zoom factor
    const [wAngle, setWAngle] = useState(0);   // 4th Dimension Tesseract angle (radians)
    const [isAutoOrbit, setIsAutoOrbit] = useState(true);
    const [is4DDrifting, setIs4DDrifting] = useState(false);

    // Dimension Projection Modes
    const [geometryMode, setGeometryMode] = useState("pca"); // 'pca' | 'spiral'
    const [dim5Mode, setDim5Mode] = useState("naming");       // 'naming' | 'alliance' | 'spectral'

    // Interactive Selection / Hover
    const [hoveredStar, setHoveredStar] = useState(null);
    const [selectedStar, setSelectedStar] = useState(null);

    // Mouse drag interaction refs
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const screenNodesRef = useRef([]); // Stores projected 2D coordinates for hit testing

    // Background cosmic starfield particles
    const backgroundStars = useMemo(() => {
        const bg = [];
        for (let i = 0; i < 140; i++) {
            bg.push({
                x: (Math.random() - 0.5) * 1600,
                y: (Math.random() - 0.5) * 1000,
                r: Math.random() * 1.4 + 0.3,
                alpha: Math.random() * 0.7 + 0.2,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
            });
        }
        return bg;
    }, []);

    // Set initial selected star
    useEffect(() => {
        if (galaxyData?.stars?.length > 0 && !selectedStar) {
            setSelectedStar(galaxyData.stars[0]);
        }
    }, [galaxyData, selectedStar]);

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
            ctx.fillStyle = "#03070d";
            ctx.fillRect(0, 0, width, height);

            // Ambient Cosmic Dust Nebulae
            const grad1 = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.max(width, height) * 0.6);
            grad1.addColorStop(0, "rgba(14, 165, 233, 0.12)");   // Cyan galactic core
            grad1.addColorStop(0.3, "rgba(168, 85, 247, 0.08)"); // Violet mid nebula
            grad1.addColorStop(0.7, "rgba(6, 182, 212, 0.03)");  // Outer edge
            grad1.addColorStop(1, "rgba(3, 7, 13, 0.95)");
            ctx.fillStyle = grad1;
            ctx.fillRect(0, 0, width, height);

            // Twinkling background stars
            backgroundStars.forEach((star, idx) => {
                const tw = Math.sin(time * star.twinkleSpeed * 50 + idx) * 0.3 + 0.7;
                ctx.beginPath();
                ctx.arc(centerX + star.x, centerY + star.y, star.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * tw})`;
                ctx.fill();
            });

            // Draw Accretion Disc Faint Orbital Rings
            ctx.save();
            ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 12]);
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 280 * zoom, 110 * zoom, localYaw, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 440 * zoom, 170 * zoom, localYaw, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // 2. Project Nodes via 4D Tesseract Rotation & 3D Camera
            const cosYaw = Math.cos(localYaw);
            const sinYaw = Math.sin(localYaw);
            const cosPitch = Math.cos(localPitch);
            const sinPitch = Math.sin(localPitch);
            const cosW = Math.cos(localWAngle);
            const sinW = Math.sin(localWAngle);

            const fov = 750;
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
                if (zCam <= 10) return; // Behind camera clipping

                const k = fov / zCam;
                const screenX = centerX + xRot * k;
                const screenY = centerY + yRot * k;
                const screenR = Math.max(1.8, star.starSize * k * 0.35);

                const projectedObj = {
                    ...star,
                    xRot,
                    yRot,
                    zRot,
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

            // 5. Draw Celestial Stars with Radial Glow
            projectedStars.forEach(star => {
                const isHovered = hoveredStar?.id === star.id;
                const isSelected = selectedStar?.id === star.id;

                // Color resolution based on Dim 5 Mode
                let baseColor = star.spectralColor;
                if (dim5Mode === "alliance") {
                    baseColor = star.allianceColor;
                } else if (dim5Mode === "naming") {
                    baseColor = star.nebulaColor;
                }

                // Supernova / Corona Pulsation
                const pulse = Math.sin(time * 3 + star.id) * 0.15 + 1.0;
                const r = (isHovered || isSelected ? star.screenR * 1.6 : star.screenR) * pulse;

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
                ctx.fillStyle = isHovered || isSelected ? "#ffffff" : baseColor;
                ctx.fill();

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

                    // Mini Callout Tag
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 10px monospace";
                    ctx.fillText(`${star.name}`, star.screenX + bSize + 6, star.screenY - 2);

                    ctx.fillStyle = "#38bdf8";
                    ctx.font = "9px monospace";
                    ctx.fillText(`[${star.namingClan}] ${(star.power / 1e6).toFixed(1)}M`, star.screenX + bSize + 6, star.screenY + 11);

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
        galaxyData, yaw, pitch, zoom, wAngle, isAutoOrbit, is4DDrifting, 
        geometryMode, dim5Mode, hoveredStar, selectedStar, backgroundStars
    ]);

    // Interactive Mouse Handlers
    const handleMouseDown = useCallback((e) => {
        isDraggingRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Drag 3D Orbit
        if (isDraggingRef.current) {
            const dx = e.clientX - lastMousePosRef.current.x;
            const dy = e.clientY - lastMousePosRef.current.y;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };

            setYaw(prev => prev + dx * 0.006);
            setPitch(prev => Math.max(-1.4, Math.min(1.4, prev - dy * 0.006)));
            return;
        }

        // Raycasting / Hit-testing nearest node to mouse cursor
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let closest = null;
        let minDist = 18; // 18px hit radius

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
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.45, Math.min(2.8, prev + delta)));
    }, []);

    return (
        <div className="space-y-4 font-mono">
            {/* Control Bar & Dimensions Telemetry */}
            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* 5-Dimensional Telemetry Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                        <Orbit size={11} className="text-cyan-400 animate-spin" />
                        5D ASTRODYNAMICS
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
                </div>

                {/* 4D Tesseract Slider & Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* 4D Hyperplane Slider */}
                    <div className="flex items-center gap-2 bg-[#10161f] border border-[#1a2332] rounded-xl px-3 py-1.5 text-xs">
                        <span className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">
                            4D Hyperplane (W)
                        </span>
                        <input
                            type="range"
                            min="0"
                            max={Math.PI * 2}
                            step="0.05"
                            value={wAngle}
                            onChange={e => setWAngle(Number(e.target.value))}
                            className="w-20 sm:w-28 accent-purple-400 cursor-pointer"
                        />
                        <button
                            onClick={() => setIs4DDrifting(!is4DDrifting)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase cursor-pointer transition-all ${
                                is4DDrifting ? "bg-purple-500 text-black shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                            }`}
                        >
                            {is4DDrifting ? "Drifting..." : "4D Drift"}
                        </button>
                    </div>

                    {/* Orbit Action Buttons */}
                    <button
                        onClick={() => setIsAutoOrbit(!isAutoOrbit)}
                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isAutoOrbit 
                                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]" 
                                : "bg-[#10161f] border-[#1a2332] text-gray-400 hover:text-white"
                        }`}
                        title={t("btn_auto_orbit")}
                    >
                        {isAutoOrbit ? <Pause size={14} /> : <Play size={14} />}
                    </button>

                    <button
                        onClick={() => {
                            setYaw(0.4);
                            setPitch(0.35);
                            setZoom(1.1);
                            setWAngle(0);
                        }}
                        className="p-2 rounded-xl bg-[#10161f] border border-[#1a2332] text-gray-400 hover:text-white hover:border-gray-500 transition-colors cursor-pointer"
                        title={t("btn_reset_view")}
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* Interactive 3D Canvas Viewport */}
            <div className="relative w-full h-[520px] md:h-[600px] bg-[#03070d] border border-[#1a2332] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onClick={handleClick}
                    onWheel={handleWheel}
                    className="w-full h-full cursor-grab active:cursor-grabbing block"
                />

                {/* Corner Aerospace Coordinates HUD */}
                <div className="absolute top-4 left-4 pointer-events-none text-[10px] space-y-1 text-gray-400 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                        <Compass size={12} />
                        <span>QUANTUM ASTRODYNAMIC HUD</span>
                    </div>
                    <div>YAW: {(yaw % (Math.PI * 2)).toFixed(2)} rad | PITCH: {pitch.toFixed(2)} rad</div>
                    <div>ZOOM: {zoom.toFixed(2)}x | 4D TESSERACT: {(wAngle * (180 / Math.PI)).toFixed(0)}°</div>
                    <div className="text-gray-500 text-[9px] pt-1 border-t border-white/10">
                        Drag to rotate • Wheel to zoom • Click star to lock
                    </div>
                </div>

                {/* Top Right Quick Stats HUD */}
                <div className="absolute top-4 right-4 pointer-events-none text-[10px] text-right space-y-1 text-gray-400 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3">
                    <div className="text-emerald-400 font-bold">
                        {galaxyData.totalStars} CELESTIAL BODIES
                    </div>
                    <div>{galaxyData.recognizedClansCount} Naming Nebulae</div>
                    <div>{galaxyData.alliancesCount} Alliance Constellations</div>
                    <div className="text-[9px] text-gray-500 pt-1 border-t border-white/10">
                        Active Mode: <strong className="text-white uppercase">{dim5Mode}</strong>
                    </div>
                </div>

                {/* Bottom Left Dimension Guide */}
                <div className="absolute bottom-4 left-4 pointer-events-none hidden sm:flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-2 text-[9px]">
                    <div className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        X: War Orbit
                    </div>
                    <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Y: Power Altitude
                    </div>
                    <div className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        Z: Social Gravity
                    </div>
                    <div className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/30">
                        W: Combat Purity
                    </div>
                    <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        5D: Spectral/Clan
                    </div>
                </div>
            </div>

            {/* Target Hologram Inspection HUD Card */}
            {selectedStar ? (
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
            ) : (
                <div className="text-center text-xs text-gray-500 p-4 bg-[#090d12] border border-[#1a2332] rounded-2xl">
                    {t("hud_hint")}
                </div>
            )}
        </div>
    );
}
