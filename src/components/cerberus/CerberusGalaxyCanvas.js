"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
    Orbit, RotateCcw, Compass, Sparkles, Eye, Shield,
    Play, Pause, Maximize2, Minimize2, Tag, Search, X, BookOpen,
} from "lucide-react";
import CerberusAxisGuide from "@/components/cerberus/CerberusAxisGuide";
import CerberusGalaxyCodex from "@/components/cerberus/CerberusGalaxyCodex";
import { StarHudCard, StarDetailPanel } from "@/components/cerberus/CerberusStarDetails";

// Camera defaults & tuning
const DEFAULT_YAW = 0.4;
const DEFAULT_PITCH = 0.35;
const DEFAULT_ZOOM = 1.1;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 7.5;
const FLY_ZOOM = 2.6;          // minimum zoom when flying to a commander
const LERP = 0.08;             // per-frame easing factor for fly-to / reset
const HUD_THROTTLE_MS = 250;   // telemetry readout refresh interval
const TAU = Math.PI * 2;

const MODE_LABEL_KEYS = {
    naming: "mode_naming",
    alliance: "mode_alliance",
    spectral: "mode_spectral",
};

export default function CerberusGalaxyCanvas({ galaxyData }) {
    const t = useTranslations("ProjectCerberus");
    const containerRef = useRef(null);
    const canvasRef = useRef(null);

    // UI state (changes here never restart the render loop)
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showCodex, setShowCodex] = useState(false);
    const [isAutoOrbit, setIsAutoOrbit] = useState(true);
    const [is4DDrifting, setIs4DDrifting] = useState(false);
    const [geometryMode, setGeometryMode] = useState("pca");   // 'pca' | 'spiral'
    const [dim5Mode, setDim5Mode] = useState("naming");        // 'naming' | 'alliance' | 'spectral'
    const [labelMode, setLabelMode] = useState("leaders");     // 'leaders' | 'all' | 'hover'
    const [searchQuery, setSearchQuery] = useState("");
    const [isHudExpanded, setIsHudExpanded] = useState(true);
    const [selectedStar, setSelectedStar] = useState(null);

    // Throttled copy of the camera, for the telemetry readout + 4D slider only
    const [hud, setHud] = useState({
        yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH, zoom: DEFAULT_ZOOM, panX: 0, panY: 0, wAngle: 0,
    });

    // The camera lives in a ref so the animation loop keeps running smoothly across re-renders.
    // focusX/Y/Z is a world-space point subtracted before rotation, which is what lets the camera
    // orbit around (and fly to) a specific commander.
    const camRef = useRef({
        yaw: DEFAULT_YAW,
        pitch: DEFAULT_PITCH,
        zoom: DEFAULT_ZOOM,
        panX: 0,
        panY: 0,
        wAngle: 0,
        focusX: 0,
        focusY: 0,
        focusZ: 0,
        flyTargetId: null, // star id the focus is tracking
        flyOrigin: false,  // easing focus back to the galactic core
        flyZoom: null,     // zoom level being eased toward
        panHome: false,    // easing pan back to 0
    });
    const liveRef = useRef({});          // latest UI state, read by the render loop
    const hoveredRef = useRef(null);     // hovered star (no React state → no re-render per mouse move)
    const dragRef = useRef({ active: false, mode: "orbit", lastX: 0, lastY: 0, moved: 0 });
    const screenNodesRef = useRef([]);   // projected nodes for hit testing

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

    // Pre-translated strings drawn directly onto the canvas
    const canvasText = useMemo(() => {
        const bhSub = new Map();
        (galaxyData?.stars || []).forEach(s => {
            if (s.isBlackHole) {
                bhSub.set(s.id, t("canvas_black_hole_sub", { deads: ((s.deads || 0) / 1e6).toFixed(1) }));
            }
        });
        return {
            singularity: t("canvas_singularity_tag"),
            solitary: t("clan_solitary"),
            bhSub,
        };
    }, [t, galaxyData]);

    // Keep the selected star valid (and fresh) when the dataset changes
    useEffect(() => {
        const stars = galaxyData?.stars || [];
        setSelectedStar(prev => {
            if (!stars.length) return null;
            const match = prev && stars.find(s => String(s.id) === String(prev.id));
            return match || stars[0];
        });
    }, [galaxyData]);

    // Fullscreen: Escape for the CSS fallback, and sync when the browser exits native fullscreen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") setIsFullscreen(false);
        };
        const handleFsChange = () => {
            if (!document.fullscreenElement) setIsFullscreen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        document.addEventListener("fullscreenchange", handleFsChange);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("fullscreenchange", handleFsChange);
        };
    }, []);

    // Search matches
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

    const matchingStarIds = useMemo(() => new Set(searchMatches.map(m => m.id)), [searchMatches]);

    // Publish latest UI state to the render loop
    useEffect(() => {
        liveRef.current = {
            isAutoOrbit,
            is4DDrifting,
            geometryMode,
            dim5Mode,
            labelMode,
            selectedId: selectedStar?.id ?? null,
            matchingStarIds,
            canvasText,
        };
    }, [isAutoOrbit, is4DDrifting, geometryMode, dim5Mode, labelMode, selectedStar, matchingStarIds, canvasText]);

    // Fly the camera to a star: focus eases onto it (and keeps tracking it), pan eases home, zoom eases in
    const warpToStar = useCallback((star) => {
        if (!star) return;
        const cam = camRef.current;
        setSelectedStar(star);
        setIsAutoOrbit(false);
        cam.flyTargetId = star.id;
        cam.flyOrigin = false;
        cam.flyZoom = Math.max(cam.zoom, FLY_ZOOM);
        cam.panHome = true;
    }, []);

    const resetView = useCallback(() => {
        const cam = camRef.current;
        cam.yaw = DEFAULT_YAW;
        cam.pitch = DEFAULT_PITCH;
        cam.wAngle = 0;
        cam.flyTargetId = null;
        cam.flyOrigin = true;
        cam.flyZoom = DEFAULT_ZOOM;
        cam.panHome = true;
        setIs4DDrifting(false);
        setHud(h => ({ ...h, yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH, wAngle: 0 }));
    }, []);

    // ── Animation & 3D render loop (restarts only when the dataset changes) ──
    useEffect(() => {
        const canvas = canvasRef.current;
        const stars = galaxyData?.stars;
        if (!canvas || !stars?.length) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cam = camRef.current;
        const n = stars.length;
        const idIndex = new Map(stars.map((s, i) => [s.id, i]));
        const px = new Float64Array(n);
        const py = new Float64Array(n);
        const pz = new Float64Array(n);
        const nodes = stars.map((star, i) => ({
            star, seed: i * 1.37, sx: 0, sy: 0, sr: 0, zRot: 0, zCam: 0, visible: false,
        }));

        let animationFrameId;
        let time = 0;
        let lastHud = 0;

        const render = (now) => {
            time += 0.02;
            const live = liveRef.current;
            const text = live.canvasText || { singularity: "", solitary: "", bhSub: new Map() };
            const matching = live.matchingStarIds || new Set();

            if (live.isAutoOrbit && !dragRef.current.active) cam.yaw += 0.003;
            if (live.is4DDrifting) cam.wAngle = (cam.wAngle + 0.008) % TAU;

            // High DPI
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
                canvas.width = Math.round(rect.width * dpr);
                canvas.height = Math.round(rect.height * dpr);
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const width = rect.width;
            const height = rect.height;
            const centerX = width / 2;
            const centerY = height / 2;

            // 1. 4D → 3D (X-W hyperplane rotation + stereographic divisor). PCA mode only.
            const usePca = live.geometryMode !== "spiral";
            const cosW = Math.cos(cam.wAngle);
            const sinW = Math.sin(cam.wAngle);
            for (let i = 0; i < n; i++) {
                const s = stars[i];
                if (usePca) {
                    const x4D = s.x * cosW - s.w * sinW;
                    const w4D = s.x * sinW + s.w * cosW;
                    const s4D = 4 / (4 - (w4D / 120));
                    px[i] = x4D * s4D;
                    py[i] = s.y * s4D;
                    pz[i] = s.z * s4D;
                } else {
                    px[i] = s.spiralX;
                    py[i] = s.spiralY;
                    pz[i] = s.spiralZ;
                }
            }

            // 2. Camera easing: fly-to focus / return to core / zoom / pan
            if (cam.flyTargetId != null) {
                const ti = idIndex.get(cam.flyTargetId);
                if (ti === undefined) {
                    cam.flyTargetId = null;
                } else {
                    cam.focusX += (px[ti] - cam.focusX) * LERP;
                    cam.focusY += (py[ti] - cam.focusY) * LERP;
                    cam.focusZ += (pz[ti] - cam.focusZ) * LERP;
                }
            } else if (cam.flyOrigin) {
                cam.focusX -= cam.focusX * LERP;
                cam.focusY -= cam.focusY * LERP;
                cam.focusZ -= cam.focusZ * LERP;
                if (Math.abs(cam.focusX) + Math.abs(cam.focusY) + Math.abs(cam.focusZ) < 0.5) {
                    cam.focusX = cam.focusY = cam.focusZ = 0;
                    cam.flyOrigin = false;
                }
            }
            if (cam.flyZoom != null) {
                cam.zoom += (cam.flyZoom - cam.zoom) * LERP;
                if (Math.abs(cam.flyZoom - cam.zoom) < 0.01) {
                    cam.zoom = cam.flyZoom;
                    cam.flyZoom = null;
                }
            }
            if (cam.panHome) {
                cam.panX -= cam.panX * LERP;
                cam.panY -= cam.panY * LERP;
                if (Math.abs(cam.panX) + Math.abs(cam.panY) < 0.5) {
                    cam.panX = cam.panY = 0;
                    cam.panHome = false;
                }
            }

            const { yaw, pitch, zoom, panX, panY, focusX, focusY, focusZ } = cam;

            // 3. Deep space background
            ctx.fillStyle = "#020509";
            ctx.fillRect(0, 0, width, height);

            const grad1 = ctx.createRadialGradient(
                centerX + panX * 0.2, centerY + panY * 0.2, 10,
                centerX + panX * 0.2, centerY + panY * 0.2, Math.max(width, height) * 0.7
            );
            grad1.addColorStop(0, "rgba(14, 165, 233, 0.15)");
            grad1.addColorStop(0.35, "rgba(168, 85, 247, 0.09)");
            grad1.addColorStop(0.7, "rgba(6, 182, 212, 0.04)");
            grad1.addColorStop(1, "rgba(2, 5, 9, 0.98)");
            ctx.fillStyle = grad1;
            ctx.fillRect(0, 0, width, height);

            backgroundStars.forEach((star, idx) => {
                const tw = Math.sin(time * star.twinkleSpeed * 50 + idx) * 0.3 + 0.7;
                ctx.beginPath();
                ctx.arc(centerX + star.x + panX * 0.08, centerY + star.y + panY * 0.08, star.r, 0, TAU);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * tw})`;
                ctx.fill();
            });

            // 4. Project to screen
            const cosYaw = Math.cos(yaw);
            const sinYaw = Math.sin(yaw);
            const cosPitch = Math.cos(pitch);
            const sinPitch = Math.sin(pitch);
            const fov = 850;
            const camDist = 650 / zoom;

            const project = (x, y, z) => {
                const xRot = x * cosYaw + z * sinYaw;
                const z1 = -x * sinYaw + z * cosYaw;
                const yRot = y * cosPitch - z1 * sinPitch;
                const zRot = y * sinPitch + z1 * cosPitch;
                const zCam = zRot + camDist;
                const k = fov / Math.max(zCam, 0.0001);
                return { sx: centerX + xRot * k + panX, sy: centerY + yRot * k + panY, zRot, zCam, k };
            };

            // Faint orbital rings around the galactic core
            const core = project(-focusX, -focusY, -focusZ);
            if (core.zCam > 8) {
                ctx.save();
                ctx.strokeStyle = "rgba(56, 189, 248, 0.14)";
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 14]);
                ctx.beginPath();
                ctx.ellipse(core.sx, core.sy, 280 * zoom, 110 * zoom, yaw, 0, TAU);
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(core.sx, core.sy, 440 * zoom, 170 * zoom, yaw, 0, TAU);
                ctx.stroke();
                ctx.restore();
            }

            for (let i = 0; i < n; i++) {
                const node = nodes[i];
                const p = project(px[i] - focusX, py[i] - focusY, pz[i] - focusZ);
                node.visible = p.zCam > 8;
                if (!node.visible) continue;
                node.sx = p.sx;
                node.sy = p.sy;
                node.zRot = p.zRot;
                node.zCam = p.zCam;
                node.sr = Math.max(1.8, node.star.starSize * p.k * 0.38);
            }

            const hovered = hoveredRef.current;
            const selectedIdx = live.selectedId != null ? idIndex.get(live.selectedId) : undefined;
            const focusStar = hovered || (selectedIdx !== undefined ? stars[selectedIdx] : null);

            // 5. Constellation filaments
            const drawFilaments = (filaments, isNaming) => {
                ctx.save();
                const activeKey = isNaming
                    ? ((focusStar?.isRecognizedClan && focusStar?.namingClan !== "Solitary") ? focusStar.namingClan : null)
                    : ((focusStar?.alliance && focusStar.alliance !== "None") ? focusStar.alliance : null);
                if (isNaming) ctx.setLineDash([2, 4]);
                filaments.forEach(fil => {
                    const a = nodes[idIndex.get(fil.sourceId)];
                    const b = nodes[idIndex.get(fil.targetId)];
                    if (!a?.visible || !b?.visible) return;
                    const isFocus = activeKey && (isNaming ? fil.clan : fil.alliance) === activeKey;
                    ctx.beginPath();
                    ctx.moveTo(a.sx, a.sy);
                    ctx.lineTo(b.sx, b.sy);
                    ctx.strokeStyle = fil.color || (isNaming ? "#a855f7" : "#06b6d4");
                    ctx.globalAlpha = isNaming
                        ? (isFocus ? 0.95 : (focusStar ? 0.14 : 0.42))
                        : (isFocus ? 0.90 : (focusStar ? 0.12 : 0.28));
                    ctx.lineWidth = isNaming ? (isFocus ? 2.5 : 1.5) : (isFocus ? 2.4 : 1.2);
                    ctx.stroke();
                });
                ctx.restore();
            };
            if (live.dim5Mode === "alliance" && galaxyData.allianceFilaments?.length) {
                drawFilaments(galaxyData.allianceFilaments, false);
            } else if (live.dim5Mode === "naming" && galaxyData.namingFilaments?.length) {
                drawFilaments(galaxyData.namingFilaments, true);
            }

            // 6. Painter's algorithm
            const order = nodes.filter(nd => nd.visible).sort((a, b) => b.zRot - a.zRot);
            screenNodesRef.current = order;

            // 7. Stars & nameplates
            order.forEach(node => {
                const star = node.star;
                const sx = node.sx;
                const sy = node.sy;
                const isHovered = hovered?.id === star.id;
                const isSelected = live.selectedId === star.id;
                const isSearchMatch = matching.has(star.id);

                let baseColor = star.spectralColor;
                if (live.dim5Mode === "alliance") baseColor = star.allianceColor;
                else if (live.dim5Mode === "naming") baseColor = star.nebulaColor;

                const pulse = Math.sin(time * (star.pulseSpeed || 3.0) + node.seed) * (star.pulseAmp || 0.15) + 1.0;
                const r = (isHovered || isSelected || isSearchMatch ? node.sr * 1.8 : node.sr) * pulse;

                if (isSearchMatch) {
                    ctx.save();
                    ctx.strokeStyle = "#00f0ff";
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.arc(sx, sy, r * 4.5, 0, TAU);
                    ctx.stroke();
                    ctx.restore();
                }

                if (star.isBlackHole) {
                    ctx.save();

                    // Gravitational lensing ripple
                    const lensWave = (time * 1.8 + node.seed * 0.7) % 3;
                    ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0, 0.4 - lensWave * 0.12)})`;
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.arc(sx, sy, r * (1.8 + lensWave * 1.1), 0, TAU);
                    ctx.stroke();

                    // Rotating accretion disk
                    ctx.save();
                    ctx.translate(sx, sy);
                    ctx.rotate(0.38);
                    const diskGrad = ctx.createLinearGradient(-r * 3.6, 0, r * 3.6, 0);
                    diskGrad.addColorStop(0, "rgba(0, 240, 255, 0.95)");
                    diskGrad.addColorStop(0.3, "rgba(168, 85, 247, 0.85)");
                    diskGrad.addColorStop(0.7, "rgba(244, 63, 94, 0.75)");
                    diskGrad.addColorStop(1, "rgba(0, 240, 255, 0.95)");
                    ctx.strokeStyle = diskGrad;
                    ctx.lineWidth = Math.max(2.5, r * 0.55);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r * 3.4, r * 1.15, time * 0.5, 0, TAU);
                    ctx.stroke();
                    ctx.restore();

                    // Photon sphere
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2.0;
                    ctx.shadowColor = "#00f0ff";
                    ctx.shadowBlur = 14;
                    ctx.beginPath();
                    ctx.arc(sx, sy, r * 1.25, 0, TAU);
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Event horizon
                    ctx.fillStyle = "#000000";
                    ctx.beginPath();
                    ctx.arc(sx, sy, r * 1.2, 0, TAU);
                    ctx.fill();

                    // Polar jets
                    const jetLen = r * (2.8 + Math.sin(time * 6 + node.seed) * 0.6);
                    ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - r * 1.2);
                    ctx.lineTo(sx, sy - r * 1.2 - jetLen);
                    ctx.moveTo(sx, sy + r * 1.2);
                    ctx.lineTo(sx, sy + r * 1.2 + jetLen);
                    ctx.stroke();

                    ctx.restore();
                } else {
                    const starLum = star.luminosity || 0.8;
                    ctx.save();
                    ctx.globalAlpha = Math.max(0.2, starLum);

                    const glowRadius = r * (2.5 + starLum * 2.2);
                    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRadius);
                    glow.addColorStop(0, baseColor);
                    glow.addColorStop(0.35, baseColor + (starLum > 0.7 ? "88" : "33"));
                    glow.addColorStop(1, "transparent");
                    ctx.beginPath();
                    ctx.arc(sx, sy, glowRadius, 0, TAU);
                    ctx.fillStyle = glow;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(sx, sy, r, 0, TAU);
                    if (isHovered || isSelected || isSearchMatch || starLum >= 0.82) {
                        ctx.fillStyle = "#ffffff";
                    } else if (starLum <= 0.35) {
                        ctx.fillStyle = "#475569";
                    } else {
                        ctx.fillStyle = baseColor;
                    }
                    ctx.fill();
                    ctx.restore();
                }

                // Nameplate
                const shouldShowLabel =
                    isHovered ||
                    isSelected ||
                    isSearchMatch ||
                    live.labelMode === "all" ||
                    (live.labelMode === "leaders" && (star.power >= 70_000_000 || star.spectralCode === "O" || star.isBlackHole));

                if (shouldShowLabel) {
                    const labelAlpha = Math.max(0.2, Math.min(1.0, (1200 - node.zCam) / 600));
                    ctx.save();
                    ctx.globalAlpha = labelAlpha;

                    const allianceTag = star.alliance !== "None" ? `[${star.alliance}] ` : "";
                    const fullLabel = star.isBlackHole ? `${text.singularity} ${star.name}` : `${allianceTag}${star.name}`;
                    const clanText = star.namingClan === "Solitary" ? text.solitary : star.namingClan;
                    const subtext = star.isBlackHole
                        ? (text.bhSub.get(star.id) || "")
                        : `${((star.power || 0) / 1e6).toFixed(1)}M • ${clanText}`;

                    ctx.font = isSelected || isHovered ? "bold 11px monospace" : "10px monospace";
                    const mainWidth = ctx.measureText(fullLabel).width;
                    ctx.font = "8px monospace";
                    const subWidth = ctx.measureText(subtext).width;
                    const tagWidth = Math.max(mainWidth, subWidth) + 12;

                    const pillX = sx + r + 6;
                    const pillY = sy - 14;
                    ctx.fillStyle = star.isBlackHole
                        ? (isSelected ? "rgba(0, 0, 0, 0.9)" : "rgba(0, 0, 0, 0.8)")
                        : (isSelected ? "rgba(6, 182, 212, 0.4)" : "rgba(9, 13, 18, 0.78)");
                    ctx.strokeStyle = star.isBlackHole
                        ? "#00f0ff"
                        : (isSelected ? "#00f0ff" : (isSearchMatch ? "#38bdf8" : "rgba(255, 255, 255, 0.2)"));
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(pillX, pillY, tagWidth, 24, 4);
                    else ctx.rect(pillX, pillY, tagWidth, 24);
                    ctx.fill();
                    ctx.stroke();

                    ctx.font = isSelected || isHovered ? "bold 11px monospace" : "10px monospace";
                    ctx.fillStyle = isSelected ? "#ffffff" : (isHovered ? "#38bdf8" : (star.isBlackHole ? "#00f0ff" : "#e2e8f0"));
                    ctx.fillText(fullLabel, pillX + 6, pillY + 11);

                    ctx.font = "8px monospace";
                    ctx.fillStyle = star.isBlackHole ? "#a855f7" : baseColor;
                    ctx.fillText(subtext, pillX + 6, pillY + 21);
                    ctx.restore();
                }

                // Targeting reticle
                if (isSelected || isHovered) {
                    ctx.save();
                    ctx.strokeStyle = isSelected ? "#00f0ff" : "#ffffff";
                    ctx.lineWidth = 1.5;
                    const reticleR = r * 3.2;
                    ctx.beginPath();
                    ctx.arc(sx, sy, reticleR, 0, TAU);
                    ctx.stroke();

                    const b = reticleR + 6;
                    ctx.beginPath();
                    ctx.moveTo(sx - b, sy - b + 5); ctx.lineTo(sx - b, sy - b); ctx.lineTo(sx - b + 5, sy - b);
                    ctx.moveTo(sx + b - 5, sy - b); ctx.lineTo(sx + b, sy - b); ctx.lineTo(sx + b, sy - b + 5);
                    ctx.moveTo(sx - b, sy + b - 5); ctx.lineTo(sx - b, sy + b); ctx.lineTo(sx - b + 5, sy + b);
                    ctx.moveTo(sx + b - 5, sy + b); ctx.lineTo(sx + b, sy + b); ctx.lineTo(sx + b, sy + b - 5);
                    ctx.stroke();
                    ctx.restore();
                }
            });

            // 8. Throttled telemetry readout (only re-renders React when values actually moved)
            if (now - lastHud > HUD_THROTTLE_MS) {
                lastHud = now;
                setHud(prev => {
                    const changed =
                        Math.abs(prev.yaw - cam.yaw) > 0.005 ||
                        Math.abs(prev.pitch - cam.pitch) > 0.005 ||
                        Math.abs(prev.zoom - cam.zoom) > 0.005 ||
                        Math.abs(prev.panX - cam.panX) > 0.5 ||
                        Math.abs(prev.panY - cam.panY) > 0.5 ||
                        Math.abs(prev.wAngle - cam.wAngle) > 0.005;
                    return changed
                        ? { yaw: cam.yaw, pitch: cam.pitch, zoom: cam.zoom, panX: cam.panX, panY: cam.panY, wAngle: cam.wAngle }
                        : prev;
                });
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationFrameId);
    }, [galaxyData, backgroundStars]);

    // Wheel zoom: attached manually as non-passive so preventDefault actually stops page scroll
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e) => {
            e.preventDefault();
            const cam = camRef.current;
            cam.flyZoom = null;
            const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12;
            cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoom * factor));
        };
        canvas.addEventListener("wheel", onWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", onWheel);
    }, []);

    // Mouse: orbit / pan / hover / click
    const handleMouseDown = useCallback((e) => {
        const isPan = e.button === 2 || e.button === 1 || e.shiftKey;
        dragRef.current = { active: true, mode: isPan ? "pan" : "orbit", lastX: e.clientX, lastY: e.clientY, moved: 0 };
        if (isPan) {
            // Manual pan releases the commander lock (focus stays where it is)
            camRef.current.flyTargetId = null;
            camRef.current.panHome = false;
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const drag = dragRef.current;
        const cam = camRef.current;

        if (drag.active) {
            const dx = e.clientX - drag.lastX;
            const dy = e.clientY - drag.lastY;
            drag.lastX = e.clientX;
            drag.lastY = e.clientY;
            drag.moved += Math.abs(dx) + Math.abs(dy);
            if (drag.mode === "pan") {
                cam.panX += dx;
                cam.panY += dy;
            } else {
                cam.yaw += dx * 0.006;
                cam.pitch = Math.max(-1.4, Math.min(1.4, cam.pitch - dy * 0.006));
            }
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        let closest = null;
        let minDist = 22;
        const nodes = screenNodesRef.current;
        for (let i = 0; i < nodes.length; i++) {
            const d = Math.hypot(nodes[i].sx - mouseX, nodes[i].sy - mouseY);
            if (d < minDist) {
                minDist = d;
                closest = nodes[i].star;
            }
        }
        if ((closest?.id ?? null) !== (hoveredRef.current?.id ?? null)) {
            hoveredRef.current = closest;
            canvas.style.cursor = closest ? "pointer" : "";
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        dragRef.current.active = false;
    }, []);

    const handleMouseLeave = useCallback(() => {
        dragRef.current.active = false;
        hoveredRef.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = "";
    }, []);

    const handleClick = useCallback(() => {
        if (dragRef.current.moved > 4) return; // it was a drag, not a click
        if (hoveredRef.current) setSelectedStar(hoveredRef.current);
    }, []);

    const handleWSlider = useCallback((value) => {
        camRef.current.wAngle = value;
        setHud(h => ({ ...h, wAngle: value }));
    }, []);

    const toggleFullscreen = useCallback(() => {
        const next = !isFullscreen;
        setIsFullscreen(next);
        try {
            if (next) {
                containerRef.current?.requestFullscreen?.()?.catch?.(() => {});
            } else if (document.fullscreenElement) {
                document.exitFullscreen?.()?.catch?.(() => {});
            }
        } catch {
            // Native fullscreen unavailable — the CSS fixed-inset fallback still applies
        }
    }, [isFullscreen]);

    if (!galaxyData) return null;

    const yawDisplay = (((hud.yaw % TAU) + TAU) % TAU).toFixed(2);

    return (
        <div
            ref={containerRef}
            className={isFullscreen
                ? "fixed inset-0 z-50 bg-[#020509] flex flex-col w-screen h-screen overflow-hidden p-3 md:p-6 font-mono"
                : "space-y-4 font-mono"
            }
        >
            {/* Control Bar */}
            <div className="bg-[#090d12]/90 backdrop-blur-md border border-[#1a2332] rounded-2xl p-3 md:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 shadow-lg">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                        <Orbit size={11} className="text-cyan-400 animate-spin" />
                        {t("badge_star_flight")}
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

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Commander search */}
                    <div className="relative">
                        <div className="flex items-center gap-1.5 bg-[#10161f] border border-[#1a2332] rounded-xl px-2.5 py-1 text-xs">
                            <Search size={12} className="text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && searchMatches[0]) {
                                        warpToStar(searchMatches[0]);
                                        setSearchQuery("");
                                    }
                                }}
                                placeholder={t("search_placeholder_galaxy")}
                                className="w-32 sm:w-44 bg-transparent text-white text-[11px] focus:outline-none placeholder-gray-500 font-mono"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-white cursor-pointer">
                                    <X size={12} />
                                </button>
                            )}
                        </div>

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
                                            <span dir="ltr">{(m.power / 1e6).toFixed(1)}M</span> • {m.alliance !== "None" ? m.alliance : t("no_alliance")}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4D hyperplane slider (PCA mode only) */}
                    <div className={`hidden sm:flex items-center gap-2 bg-[#10161f] border border-[#1a2332] rounded-xl px-2.5 py-1 text-xs ${geometryMode === "spiral" ? "opacity-40 pointer-events-none" : ""}`}>
                        <span className="text-[9px] text-purple-400 uppercase tracking-wider font-bold">
                            {t("slider_4d")}
                        </span>
                        <input
                            type="range"
                            min="0"
                            max={TAU}
                            step="0.05"
                            value={hud.wAngle}
                            onChange={e => handleWSlider(Number(e.target.value))}
                            className="w-16 accent-purple-400 cursor-pointer"
                        />
                        <button
                            onClick={() => setIs4DDrifting(v => !v)}
                            className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase cursor-pointer transition-all ${
                                is4DDrifting ? "bg-purple-500 text-black shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                            }`}
                            title={t("btn_4d_drift")}
                        >
                            {t("btn_drift")}
                        </button>
                    </div>

                    {/* Auto orbit */}
                    <button
                        onClick={() => setIsAutoOrbit(v => !v)}
                        className={`p-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isAutoOrbit
                                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                : "bg-[#10161f] border-[#1a2332] text-gray-400 hover:text-white"
                        }`}
                        title={t("btn_auto_orbit")}
                    >
                        {isAutoOrbit ? <Pause size={13} /> : <Play size={13} />}
                    </button>

                    {/* Codex */}
                    <button
                        onClick={() => setShowCodex(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#10161f] border border-cyan-500/40 text-cyan-400 hover:text-white hover:bg-cyan-500/10 hover:border-cyan-400 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                        title={t("legend_btn_title")}
                    >
                        <BookOpen size={13} />
                        <span className="hidden sm:inline">{t("legend_btn_title")}</span>
                    </button>

                    {/* Reset view */}
                    <button
                        onClick={resetView}
                        className="p-1.5 rounded-xl bg-[#10161f] border border-[#1a2332] text-gray-400 hover:text-white hover:border-gray-500 transition-colors cursor-pointer"
                        title={t("btn_reset_view")}
                    >
                        <RotateCcw size={13} />
                    </button>

                    {/* Fullscreen */}
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

            {/* 3D viewport */}
            <div
                className={`relative w-full bg-[#020509] border border-[#1a2332] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] ${
                    isFullscreen ? "flex-1 h-full min-h-[400px] mt-3" : "h-[540px] md:h-[640px]"
                }`}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    onContextMenu={e => e.preventDefault()}
                    className="w-full h-full cursor-grab active:cursor-grabbing block"
                />

                {/* Telemetry HUD */}
                <div className="absolute top-4 left-4 pointer-events-none text-[10px] space-y-1 text-gray-400 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                        <Compass size={12} />
                        <span>{t("hud_telemetry_title")}</span>
                    </div>
                    <div dir="ltr">
                        {t("hud_telemetry_line1", { yaw: yawDisplay, pitch: hud.pitch.toFixed(2), zoom: hud.zoom.toFixed(2) })}
                    </div>
                    <div dir="ltr">
                        {t("hud_telemetry_line2", {
                            panX: hud.panX.toFixed(0),
                            panY: hud.panY.toFixed(0),
                            w: (hud.wAngle * (180 / Math.PI)).toFixed(0),
                        })}
                    </div>
                    <div className="text-gray-500 text-[9px] pt-1 border-t border-white/10">
                        {t("flight_controls_hint")}
                    </div>
                </div>

                {/* Quick stats HUD */}
                <div className="absolute top-4 right-4 pointer-events-none text-[10px] text-right space-y-1 text-gray-400 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl">
                    <div className="text-emerald-400 font-bold">
                        {t("hud_bodies", { count: galaxyData.totalStars })}
                    </div>
                    {galaxyData.blackHolesCount > 0 && (
                        <div className="text-cyan-400 font-bold flex items-center justify-end gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-black border border-cyan-400 shadow-[0_0_8px_#00f0ff] inline-block animate-ping"></span>
                            <span>{t("hud_singularities", { count: galaxyData.blackHolesCount })}</span>
                        </div>
                    )}
                    <div>{t("hud_nebulae", { count: galaxyData.recognizedClansCount })}</div>
                    <div>{t("hud_constellations", { count: galaxyData.alliancesCount })}</div>
                    <div className="text-[9px] text-gray-500 pt-1 border-t border-white/10">
                        {t("hud_active_mode")} <strong className="text-white uppercase">{t(MODE_LABEL_KEYS[dim5Mode])}</strong>
                    </div>
                </div>

                {selectedStar && (
                    <StarHudCard
                        star={selectedStar}
                        galaxyData={galaxyData}
                        expanded={isHudExpanded}
                        onToggle={() => setIsHudExpanded(v => !v)}
                        onCenter={() => warpToStar(selectedStar)}
                    />
                )}

                <CerberusAxisGuide
                    axes={galaxyData.axes || []}
                    excludedFeatures={galaxyData.excludedFeatures || []}
                    geometryMode={geometryMode}
                    onOpenCodex={() => setShowCodex(true)}
                />
            </div>

            {!isFullscreen && selectedStar && (
                <StarDetailPanel star={selectedStar} galaxyData={galaxyData} />
            )}

            {showCodex && (
                <CerberusGalaxyCodex galaxyData={galaxyData} onClose={() => setShowCodex(false)} />
            )}
        </div>
    );
}
