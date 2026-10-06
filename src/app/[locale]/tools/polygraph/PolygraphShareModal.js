"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { 
  X, Copy, Check, Download, QrCode, Image as ImageIcon, 
  Sparkles, Shield, ExternalLink, Send, Flame, Eye, Palette, Crown, Sun
} from "lucide-react";

export default function PolygraphShareModal({
  isOpen,
  onClose,
  kd,
  data,
  endDate,
  timeframe = "24",
  depth = 300,
  locale = "en",
  t
}) {
  const [activeTab, setActiveTab] = useState("card"); // 'card' | 'links' | 'bbcode'
  const [cardMode, setCardMode] = useState("album"); // 'album' (anti-ban camouflage) | 'discord' (social link)
  const [sealStyle, setSealStyle] = useState("morphed"); // 'morphed' (Imperial Sun Seal) | 'cyber' | 'classic'
  const [theme, setTheme] = useState("gold"); // 'gold' | 'neon'
  const [copiedLink, setCopiedLink] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = useRef(null);


  const tr = (k, fallback) => {
    try {
      if (!t) return fallback;
      const v = t(k);
      return (v && v !== k) ? v : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const kdd = data?.kingdom;
  const ai = data?.ai;
  const me = kdd?.metrics;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://unity-v2-azure.vercel.app";
  const shortUrl = `${origin}/s/${kd}`;
  const windowShortUrl = `${origin}/qr?k=${kd}&e=${endDate || ""}&t=${timeframe}`;
  const directFullUrl = `${origin}/${locale}/shared/polygraph?kd=${kd}${endDate ? `&end=${endDate}` : ""}&tf=${timeframe}&depth=${depth}`;

  // Number formatting helper

  const fmt = (n) => {
    const abs = Math.abs(n || 0);
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(Math.round(n / 100) * 100 / 1e3).toFixed(0)}k`;
    return String(n || 0);
  };

  // Helper for drawing rounded rectangles with canvas fallback
  const drawRoundRect = (ctx, x, y, w, h, radius, fill = true, stroke = false) => {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  // Draw 1080x1080 RoK Photo Album Business Card
  const renderToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isGold = theme === "gold";
    const primaryColor = isGold ? "#D4AF37" : "#06B6D4"; // Gold or Cyan
    const accentColor = isGold ? "#F59E0B" : "#D946EF";  // Amber or Fuchsia

    // 1. Deep Obsidian Radial Background
    const bgGrad = ctx.createRadialGradient(540, 540, 100, 540, 540, 760);
    bgGrad.addColorStop(0, isGold ? "#101420" : "#0d111c");
    bgGrad.addColorStop(1, "#030508");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Subtle Hex Grid Accent
    ctx.strokeStyle = isGold ? "rgba(212, 175, 55, 0.04)" : "rgba(6, 182, 212, 0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1080);
      ctx.stroke();
    }
    for (let y = 0; y < 1080; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // 2. Ornate Double Borders
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, 1016, 1016);

    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2;
    ctx.strokeRect(46, 46, 988, 988);

    // Citadel Corner Brackets
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    const corners = [
      [[32, 85], [85, 85], [85, 32]],
      [[1048, 85], [995, 85], [995, 32]],
      [[32, 995], [85, 995], [85, 1048]],
      [[1048, 995], [995, 995], [995, 1048]]
    ];
    corners.forEach(c => {
      ctx.beginPath();
      ctx.moveTo(c[0][0], c[0][1]);
      ctx.lineTo(c[1][0], c[1][1]);
      ctx.lineTo(c[2][0], c[2][1]);
      ctx.stroke();
    });

    // 3. Header Pill Badge
    ctx.fillStyle = "#0B0F19";
    ctx.fillRect(280, 68, 520, 34);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(280, 68, 520, 34);

    ctx.fillStyle = primaryColor;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    if (cardMode === "album") {
      ctx.fillText(`★ KINGDOM ${kd} • ARCHIVAL MILITARY DOSSIER ★`, 540, 90);
    } else {
      ctx.fillText(`★ KINGDOM ${kd} • STRATEGIC INTELLIGENCE DOSSIER ★`, 540, 90);
    }

    // 4. Grand Title (Game Camouflage)
    ctx.fillStyle = "#FFFFFF";
    if (cardMode === "album") {
      ctx.font = "900 42px serif";
      ctx.textAlign = "center";
      ctx.fillText("KVK ALLIANCE BATTLE PASSPORT", 540, 155);
    } else {
      ctx.font = "900 46px serif";
      ctx.textAlign = "center";
      ctx.fillText("EARLY KINGDOM POLYGRAPH", 540, 155);
    }

    // Kingdom Meta Subtitle
    const ageLabel = kdd?.serverAgeDays !== null && kdd?.serverAgeDays !== undefined
      ? `AGE: ${kdd.serverAgeDays}d (${kdd.era || kdd.kingdomProgress || 'Nascent'})`
      : 'ALLIANCE COMBAT AUDIT';
    const integrityLabel = data?.anomalies?.integrityScore 
      ? `INTEGRITY: ${data.anomalies.integrityScore}/100`
      : 'COMBAT CALIBRATED';

    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`${ageLabel}  •  ${integrityLabel}  •  TOP ${depth} GOVERNORS`, 540, 190);

    // Divider Line with Center Diamond
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(220, 215);
    ctx.lineTo(860, 215);
    ctx.stroke();

    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(540, 208);
    ctx.lineTo(548, 215);
    ctx.lineTo(540, 222);
    ctx.lineTo(532, 215);
    ctx.fill();

    // 5. 4 Strategic Infographic Cards (Game Dossier Camouflage)
    const drawDossierCard = (x, y, w, h, icon, title, val, tag, color) => {
      ctx.fillStyle = "#0B0F19";
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      // Top corner mini-accent
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 4, h);

      // Icon & Title
      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${icon} ${title.toUpperCase()}`, x + 16, y + 26);

      // Large Value
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 24px monospace";
      ctx.fillText(val, x + 16, y + 60);

      // Bottom Tag
      ctx.fillStyle = color;
      ctx.font = "bold 10px monospace";
      ctx.fillText(tag, x + 16, y + 84);
    };

    const grade = ai?.grade || "A";
    const posture = ai?.posture || "Active Skirmishing";
    const civilWar = ai?.civilWarProbability !== undefined ? `${ai.civilWarProbability}%` : "0%";
    const riskStatus = parseInt(civilWar) > 50 ? "[ CRITICAL FLASHPOINT ]" : "[ COHESIVE & STABLE ]";
    const pace = me?.totalPowerGained ? `+${fmt(Math.round(me.totalPowerGained / Math.max(1, parseInt(timeframe) / 24)))}/d` : "+12.4M/d";
    const whalesCount = kdd?.whales?.length || me?.whalesCount || 0;

    drawDossierCard(80, 235, 215, 96, "🛡", "Polygraph", `Grade ${grade}`, `[ ${posture.slice(0, 16)} ]`, "#10B981");
    drawDossierCard(315, 235, 215, 96, "⚡", "Civil War", civilWar, riskStatus, parseInt(civilWar) > 50 ? "#F43F5E" : "#10B981");
    drawDossierCard(550, 235, 215, 96, "📈", "Velocity", pace, "[ MOBILIZATION PACE ]", "#06B6D4");
    drawDossierCard(785, 235, 215, 96, "👑", "Spenders", `${whalesCount} Whales`, "[ 500k+ SPRINT ROSTER ]", "#F59E0B");

    // 6. Central Stealth Morphed QR Seal / Medallion
    const isMorphed = sealStyle === "morphed" || sealStyle === "cyber" || cardMode === "album";
    const sealCx = 540;
    const sealCy = 550;

    if (isMorphed && sealStyle !== "classic") {
      const medRadius = 205;
      const isCyber = sealStyle === "cyber" || (!isGold && sealStyle !== "morphed");
      const sealThemeColor = isCyber ? "#06B6D4" : "#D4AF37";
      const sealAccentColor = isCyber ? "#D946EF" : "#F59E0B";

      // 6a. Outer Sunburst Rays (16 golden rays radiating around the perimeter)
      ctx.strokeStyle = isCyber ? "rgba(6, 182, 212, 0.45)" : "rgba(212, 175, 55, 0.45)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI * 2) / 16;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rayLen = (i % 2 === 0 ? 18 : 10);
        ctx.beginPath();
        ctx.moveTo(sealCx + cos * medRadius, sealCy + sin * medRadius);
        ctx.lineTo(sealCx + cos * (medRadius + rayLen), sealCy + sin * (medRadius + rayLen));
        ctx.stroke();
      }

      // 6b. Concentric Gilded Rims
      // Outer bronze rim
      ctx.strokeStyle = isCyber ? "#0E7490" : "#854D0E";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sealCx, sealCy, medRadius + 6, 0, Math.PI * 2);
      ctx.stroke();

      // Mid accent rim
      ctx.strokeStyle = sealThemeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sealCx, sealCy, medRadius + 3, 0, Math.PI * 2);
      ctx.stroke();

      // Dark groove
      ctx.strokeStyle = "#080C14";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sealCx, sealCy, medRadius + 1, 0, Math.PI * 2);
      ctx.stroke();

      // 6c. Medallion Interior: Royal Vellum / Sun-Gilded Parchment with radial gradient
      const vellumGrad = ctx.createRadialGradient(sealCx, sealCy, 20, sealCx, sealCy, medRadius);
      if (isCyber) {
        vellumGrad.addColorStop(0, "#F0FDF4");
        vellumGrad.addColorStop(0.7, "#E0F2FE");
        vellumGrad.addColorStop(1, "#BAE6FD");
      } else {
        vellumGrad.addColorStop(0, "#FCF8EC"); // warm luminous ivory
        vellumGrad.addColorStop(0.7, "#F5EAD2"); // golden parchment
        vellumGrad.addColorStop(1, "#E8D5AB"); // antique burnished edge
      }
      ctx.fillStyle = vellumGrad;
      ctx.beginPath();
      ctx.arc(sealCx, sealCy, medRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner filigree ring
      ctx.strokeStyle = sealThemeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sealCx, sealCy, medRadius - 4, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Citadel Corner Brackets framing the circular medallion
      ctx.strokeStyle = sealThemeColor;
      ctx.lineWidth = 2;
      const cornerOffsets = [
        [-175, -175], [175, -175], [-175, 175], [175, 175]
      ];
      cornerOffsets.forEach(([ox, oy]) => {
        const signX = Math.sign(ox);
        const signY = Math.sign(oy);
        ctx.beginPath();
        ctx.moveTo(sealCx + ox, sealCy + oy - signY * 18);
        ctx.lineTo(sealCx + ox, sealCy + oy);
        ctx.lineTo(sealCx + ox - signX * 18, sealCy + oy);
        ctx.stroke();
      });

      // Top Seal Ribbon
      ctx.fillStyle = "#0B0F19";
      ctx.fillRect(360, sealCy - medRadius - 32, 360, 24);
      ctx.strokeStyle = sealThemeColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(360, sealCy - medRadius - 32, 360, 24);

      ctx.fillStyle = sealThemeColor;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      if (cardMode === "album") {
        ctx.fillText("⚜ IMPERIAL HIGH COMMAND WAR CREST ⚜", sealCx, sealCy - medRadius - 16);
      } else {
        ctx.fillText("⚜ STRATEGIC INTELLIGENCE CYPHER ⚜", sealCx, sealCy - medRadius - 16);
      }

      if (sealStyle === "crest") {
        // 6d-ALT: Grand Kingdom High Command Citadel (NO QR CODE AT ALL)
        ctx.fillStyle = primaryColor;
        ctx.font = "34px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👑", sealCx, sealCy - 110);

        ctx.fillStyle = primaryColor;
        ctx.font = "900 36px serif";
        ctx.fillText(`KINGDOM ${kd}`, sealCx, sealCy - 66);

        // Grade Badge Pill
        ctx.fillStyle = "#0B0F19";
        drawRoundRect(ctx, sealCx - 95, sealCy - 44, 190, 36, 18, true, false);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        drawRoundRect(ctx, sealCx - 95, sealCy - 44, 190, 36, 18, false, true);

        ctx.fillStyle = grade === "A" ? "#10B981" : (grade === "B" ? "#06B6D4" : "#F59E0B");
        ctx.font = "900 18px monospace";
        ctx.fillText(`POLYGRAPH: GRADE ${grade}`, sealCx, sealCy - 26);

        // Metric Rows inside Plaque
        ctx.fillStyle = "#1E293B";
        ctx.font = "bold 13px monospace";
        ctx.fillText(`⚡ MOBILIZATION: ${pace}`, sealCx, sealCy + 16);

        ctx.fillStyle = sealAccentColor;
        ctx.font = "bold 13px monospace";
        ctx.fillText(`👑 SPENDERS: ${whalesCount} WHALES`, sealCx, sealCy + 42);

        ctx.fillStyle = parseInt(civilWar) > 50 ? "#F43F5E" : "#10B981";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`⚔️ CIVIL WAR: ${civilWar} ${riskStatus}`, sealCx, sealCy + 68);

        // Bottom Plaque Ribbon
        ctx.fillStyle = primaryColor;
        ctx.font = "bold 11px monospace";
        ctx.fillText("★ ALLIANCE HIGH COMMAND SEAL ★", sealCx, sealCy + 106);
      } else {
        // 6d. Render Morphed QR Matrix
        try {
          const qr = QRCode.create(shortUrl, { errorCorrectionLevel: 'H' });
          const modSize = qr.modules.size;
          const cSize = 7; // Exact 7px integer modules
          const qWidth = modSize * cSize; // ~259px
          const qStartX = Math.floor(sealCx - qWidth / 2);
          const qStartY = Math.floor(sealCy - qWidth / 2);
          const darkColor = isCyber ? "#0A1120" : "#141724"; // Deep obsidian bronze
          const lightColor = isCyber ? "#E0F2FE" : "#FCF8EC";

          const isFinderPattern = (r, c) => {
            if (r < 7 && c < 7) return true;
            if (r < 7 && c >= modSize - 7) return true;
            if (r >= modSize - 7 && c < 7) return true;
            return false;
          };

          const mid = Math.floor(modSize / 2);

          // Draw data modules as smooth rounded tiles
          ctx.fillStyle = darkColor;
          for (let r = 0; r < modSize; r++) {
            for (let c = 0; c < modSize; c++) {
              // Reserve 5x5 center area for shield crest
              if (Math.abs(r - mid) <= 2 && Math.abs(c - mid) <= 2) continue;
              if (isFinderPattern(r, c)) continue;

              if (qr.modules.get(r, c)) {
                drawRoundRect(ctx, qStartX + c * cSize, qStartY + r * cSize, cSize, cSize, 1.8, true, false);
              }
            }
          }

          // Draw 3 Corner Citadels (Finder Patterns with 1:1:3:1:1 ratio)
          const drawFinder = (cornerR, cornerC) => {
            const fx = qStartX + cornerC * cSize;
            const fy = qStartY + cornerR * cSize;
            const fw = 7 * cSize;

            // Outer 7x7 rounded rect
            ctx.fillStyle = darkColor;
            drawRoundRect(ctx, fx, fy, fw, fw, 3, true, false);
            // Inner 5x5 vellum
            ctx.fillStyle = lightColor;
            drawRoundRect(ctx, fx + cSize, fy + cSize, 5 * cSize, 5 * cSize, 2, true, false);
            // Center 3x3 core
            ctx.fillStyle = darkColor;
            drawRoundRect(ctx, fx + 2 * cSize, fy + 2 * cSize, 3 * cSize, 3 * cSize, 1.5, true, false);
            // Gilded center micro-rivet
            ctx.fillStyle = sealThemeColor;
            ctx.beginPath();
            ctx.arc(fx + 3.5 * cSize, fy + 3.5 * cSize, 1.5, 0, Math.PI * 2);
            ctx.fill();
          };

          drawFinder(0, 0);
          drawFinder(0, modSize - 7);
          drawFinder(modSize - 7, 0);

          // 6e. Center Imperial High Command Shield Crest
          ctx.fillStyle = darkColor;
          ctx.beginPath();
          ctx.arc(sealCx, sealCy, 21, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = sealThemeColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(sealCx, sealCy, 21, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "#0B0F19";
          ctx.beginPath();
          ctx.arc(sealCx, sealCy, 18, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = sealThemeColor;
          ctx.font = "bold 9px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`KD ${kd}`, sealCx, sealCy - 3);

          ctx.fillStyle = sealAccentColor;
          ctx.font = "bold 7px monospace";
          ctx.fillText(cardMode === "album" ? "★ SEAL ★" : "UN•TY", sealCx, sealCy + 7);

        } catch (err) {
          console.error("QR render error:", err);
        }
      }

    } else {
      // Classic Square Barcode (For Discord announcements & forum posts)
      const qrSize = 340;
      const qrX = (1080 - qrSize) / 2;
      const qrY = 380;

      ctx.fillStyle = "#070A12";
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.fillRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);
      ctx.strokeRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(qrX, qrY, qrSize, qrSize);

      try {
        const qr = QRCode.create(shortUrl, { errorCorrectionLevel: 'H' });
        const modSize = qr.modules.size;
        const cSize = Math.floor(qrSize / modSize);
        const pad = (qrSize - modSize * cSize) / 2;

        ctx.fillStyle = "#000000";
        for (let r = 0; r < modSize; r++) {
          for (let c = 0; c < modSize; c++) {
            if (qr.modules.get(r, c)) {
              ctx.fillRect(qrX + pad + c * cSize, qrY + pad + r * cSize, cSize, cSize);
            }
          }
        }

        // Center emblem
        const cx = 540;
        const cy = qrY + qrSize / 2;
        ctx.fillStyle = "#070A0F";
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = primaryColor;
        ctx.font = "900 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`KD ${kd}`, cx, cy - 2);

        ctx.fillStyle = "#38BDF8";
        ctx.font = "bold 9px monospace";
        ctx.fillText("UN•TY", cx, cy + 12);
      } catch (err) {
        console.error("Classic QR error:", err);
      }
    }

    finishCardDrawing(ctx, primaryColor, accentColor);
  }, [theme, cardMode, sealStyle, kd, kdd, ai, me, depth, timeframe, shortUrl]);


  const finishCardDrawing = (ctx, primaryColor, accentColor) => {
    // 7. Camouflage Frame Label under QR
    ctx.fillStyle = "#0B0F19";
    ctx.fillRect(240, 770, 600, 48);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(240, 770, 600, 48);

    if (cardMode === "album") {
      ctx.fillStyle = primaryColor;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("★ OFFICIAL ALLIANCE ROYAL SEAL ★", 540, 792);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "10px monospace";
      ctx.fillText("CROSS-ALLIANCE HEGEMONY • SPENDER SIGNATURES • BATTLE READY", 540, 808);
    } else {
      ctx.fillStyle = primaryColor;
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("★ SCAN CAMERA TO UNLOCK LIVE KINGDOM ROSTER ★", 540, 792);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "10px monospace";
      ctx.fillText("REAL-TIME SPENDER SIGNATURES • ALLIANCE TURMOIL • ROSTER VELOCITY", 540, 808);
    }

    // 8. Roster Summary Quote
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "italic 13px sans-serif";
    const diagText = cardMode === "album"
      ? `"Kingdom ${kd} longitudinal combat readiness verified. Roster integrity authenticated by Alliance High Command."`
      : (ai?.diagnosis ? `"${ai.diagnosis.slice(0, 110)}..."` : `"Verified Early Kingdom Polygraph analysis. Zero bot padding, full roster velocity."`);
    ctx.fillText(diagText, 540, 860);

    // 9. Bottom Strategic Callout Banner
    ctx.fillStyle = "#0D111C";
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 1.5;
    ctx.fillRect(160, 900, 760, 64);
    ctx.strokeRect(160, 900, 760, 64);

    if (cardMode === "album") {
      ctx.fillStyle = primaryColor;
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`KINGDOM ${kd} ALLIANCE WAR ROOM • OFFICIAL REGISTRY`, 540, 926);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`AUTHENTICATED BY HIGH COMMAND • ARCHIVAL CLUSTER: KD-${kd}-ALPHA`, 540, 948);

      // 10. Watermark
      ctx.fillStyle = "#475569";
      ctx.font = "10px sans-serif";
      ctx.fillText("CONFIDENTIAL RECORD • AUTHORIZED FOR ALLIANCE LEADERSHIP", 540, 1000);
    } else {
      ctx.fillStyle = "#38BDF8";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("UNITY COMBAT NETWORK • PUBLIC GOVERNOR WAR SUITE", 540, 926);

      ctx.fillStyle = "#64748B";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`PORTAL DIRECT SHORTLINK: ${shortUrl.replace("https://", "")}`, 540, 948);

      // 10. Watermark
      ctx.fillStyle = "#475569";
      ctx.font = "10px sans-serif";
      ctx.fillText("CONFIDENTIAL ALLIANCE RECORD • ZERO LOGIN • FREE TO ALL GOVERNORS", 540, 1000);
    }
  };

  useEffect(() => {
    if (isOpen) {
      renderToCanvas();
    }
  }, [isOpen, renderToCanvas]);

  // Download high-res PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDownloading(true);

    try {
      const link = document.createElement("a");
      link.download = cardMode === "album"
        ? `KD${kd}_Battle_Passport_Album.png`
        : `KD${kd}_Polygraph_Discord.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy image directly to clipboard
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.clipboard?.write) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopiedLink("image");
        setTimeout(() => setCopiedLink(null), 2500);
      });
    } catch (err) {
      console.error("Copy image failed:", err);
    }
  };

  // Copy text link
  const handleCopyLink = (url, key) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(key);
      setTimeout(() => setCopiedLink(null), 2500);
    });
  };

  // RoK BBCode formatted blast
  const bbcodeText = `[b]⚡ KINGDOM ${kd} EARLY POLYGRAPH BRIEF[/b]
[color=#00e5ff]Audit Window:[/color] ${endDate || "Latest"} (${timeframe}h window)
[color=#ffd700]Polygraph Grade:[/color] ${ai?.grade || "N/A"} | [color=#ff0055]Civil War Risk:[/color] ${ai?.civilWarProbability || 0}%
[color=#00ff88]Daily Mobilization:[/color] +${fmt(Math.round((me?.totalPowerGained || 0) / Math.max(1, parseInt(timeframe) / 24)))}/day
[color=#c084fc]Active Spenders:[/color] ${kdd?.whales?.length || 0} Whales
[b]Live Dossier & Anomaly Audit:[/b] ${shortUrl}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-[#0a0c12] border border-[#232838] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b202e] bg-[#0f131d]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                {tr("share_modal_title", `Kingdom ${kd} Business Card & Share Suite`)}
                <Sparkles size={14} className="text-amber-400 fill-amber-400/20" />
              </h2>
              <p className="text-[11px] text-gray-400 font-mono">
                {tr("share_modal_sub", "RoK Photo Album 1080×1080 Card • Structured Stealth QR Code • Short Links")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1a202c] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#1b202e] bg-[#0b0e15] px-6">
          <button
            onClick={() => setActiveTab("card")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "card"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <ImageIcon size={14} />
            {tr("tab_album_card", "Photo Album Business Card (1080×1080)")}
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "links"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <ExternalLink size={14} />
            {tr("tab_short_links", "Compact Short Links")}
          </button>
          <button
            onClick={() => setActiveTab("bbcode")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === "bbcode"
                ? "border-fuchsia-500 text-fuchsia-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Send size={14} />
            {tr("tab_bbcode", "RoK Mail & Discord BBCode")}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: Photo Album Card */}
          {activeTab === "card" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Card Canvas Preview (Left/Top) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-square rounded-xl overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.2)] border-2 border-[#D4AF37]/50 bg-black">
                  <canvas
                    ref={canvasRef}
                    width={1080}
                    height={1080}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-2 text-center">
                  Full 1080×1080 High-Res Square • Exact RoK In-Game Profile Album Format
                </div>
              </div>

              {/* Controls & Features (Right/Bottom) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Card Target Mode Selector */}
                <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase text-gray-300 tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={cardMode === "album" ? "text-emerald-400" : "text-cyan-400"} />
                      {tr("card_mode_title", "Card Purpose & Target")}
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      cardMode === "album"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                    }`}>
                      {cardMode === "album" ? tr("card_mode_album_badge", "Lilith Safe • Zero URLs") : tr("card_mode_discord_badge", "Direct URL Printed")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCardMode("album");
                        if (sealStyle === "classic") setSealStyle("morphed");
                      }}
                      className={`px-3 py-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                        cardMode === "album"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                          : "bg-[#141824] text-gray-400 border-[#232a3c] hover:text-white"
                      }`}
                    >
                      <span>🛡</span> {tr("card_mode_album", "RoK Photo Album")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardMode("discord")}
                      className={`px-3 py-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                        cardMode === "discord"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                          : "bg-[#141824] text-gray-400 border-[#232a3c] hover:text-white"
                      }`}
                    >
                      <span>⚡</span> {tr("card_mode_discord", "Discord / Web")}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    {cardMode === "album" 
                      ? tr("card_mode_album_desc", "Camouflaged as an official Kingdom Battle Passport. All URLs and advertising trigger words are removed to pass Lilith Games automated in-game image review. Governors screenshot and scan the Cypher Seal.")
                      : "Optimized for Discord announcements and WhatsApp groups with the direct shortlink printed on the card."
                    }
                  </p>
                </div>

                {/* Cypher Seal Disguise Selector */}
                <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase text-gray-300 tracking-wider flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun size={14} className="text-amber-400" />
                      {tr("card_seal_style_title", "Cypher Seal Disguise")}
                    </div>
                    {sealStyle === "crest" && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Zero QR Code • 100% Safe
                      </span>
                    )}
                    {sealStyle === "morphed" && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
                        Album Safe
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setSealStyle("crest")}
                      className={`px-2 py-2 rounded-lg text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-colors text-center ${
                        sealStyle === "crest"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                          : "bg-[#141824] text-gray-400 border-[#232a3c] hover:text-white"
                      }`}
                    >
                      <span className="text-sm">🛡️</span>
                      <span className="truncate w-full">{tr("card_seal_crest", "No QR Badge")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSealStyle("morphed")}
                      className={`px-2 py-2 rounded-lg text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-colors text-center ${
                        sealStyle === "morphed"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                          : "bg-[#141824] text-gray-400 border-[#232a3c] hover:text-white"
                      }`}
                    >
                      <span className="text-sm">👑</span>
                      <span className="truncate w-full">{tr("card_seal_morphed", "Imperial Sun")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSealStyle("cyber")}
                      className={`px-2 py-2 rounded-lg text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-colors text-center ${
                        sealStyle === "cyber"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                          : "bg-[#141824] text-gray-400 border-[#232a3c] hover:text-white"
                      }`}
                    >
                      <span className="text-sm">⚡</span>
                      <span className="truncate w-full">{tr("card_seal_cyber", "Cyber Neon")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSealStyle("classic")}
                      className={`px-2 py-2 rounded-lg text-[11px] font-bold border flex flex-col items-center justify-center gap-1 transition-colors text-center ${
                        sealStyle === "classic"
                          ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 shadow-sm"
                          : "bg-[#141824] text-gray-400 border-[#232a3c] hover:text-white"
                      }`}
                    >
                      <span className="text-sm">⬛</span>
                      <span className="truncate w-full">{tr("card_seal_classic", "Barcode")}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    {sealStyle === "crest" && tr("card_seal_crest_desc", "Replaces the QR code with an imposing Kingdom High Command War Citadel badge displaying Grade, Whales, and Velocity. 100% free of any barcode or scan patterns.")}
                    {sealStyle === "morphed" && tr("card_seal_morphed_desc", "Morphed into an authentic Kingdom Sun Medallion with rounded obsidian tiles, sunburst filigree, and high-command crest. Bypasses Lilith's computer-vision photo album filter.")}
                    {sealStyle === "cyber" && tr("card_seal_cyber_desc", "Luminous tactical cypher with cyber-styled framing for web and social posts.")}
                    {sealStyle === "classic" && tr("card_seal_classic_desc", "High-contrast square QR code for Discord recruitment posts and external media.")}
                  </p>
                </div>

                {/* Style Customizer */}
                <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold uppercase text-gray-300 tracking-wider flex items-center gap-2">
                    <Palette size={14} className="text-amber-400" />
                    {tr("card_theme_title", "Card Aesthetic Theme")}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme("gold")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                        theme === "gold"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                          : "bg-[#141824] text-gray-400 border-[#232a3c] hover:text-white"
                      }`}
                    >
                      <span>👑</span> {tr("card_theme_gold", "Royal Gold")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("neon")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                        theme === "neon"
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                          : "bg-[#141824] text-gray-400 border-[#232a3c] hover:text-white"
                      }`}
                    >
                      <span>⚡</span> {tr("card_theme_neon", "Cyber Neon")}
                    </button>
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all"
                  >
                    <Download size={15} />
                    {tr("btn_download_card", "Download Photo Album Card (1080×1080 PNG)")}
                  </button>

                  <button
                    onClick={handleCopyImage}
                    className="w-full bg-[#141824] hover:bg-[#1a2030] text-gray-200 border border-[#232a3c] font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    {copiedLink === "image" ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span className="text-emerald-400">{tr("image_copied", "Card Copied to Clipboard!")}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-gray-400" />
                        <span>{tr("btn_copy_image", "Copy Image to Clipboard")}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* In-Game Instructions */}
                <div className="text-[11px] text-gray-500 font-mono space-y-1 pt-1 border-t border-[#1b202e]">
                  <p>{tr("album_instructions_1", "• Save image → Open RoK Profile → Photo Album → Upload.")}</p>
                  <p>{tr("album_instructions_2", "• Players scanning your album avatar arrive directly at your Kingdom's Polygraph!")}</p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: Compact Short Links */}
          {activeTab === "links" && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400 leading-relaxed">
                Rise of Kingdoms in-game chat and kingdom mails break long links. Use these compact trackable links to share with recruitment leads and alliance leaders.
              </div>

              {/* Ultra Short Link */}
              <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} />
                    {tr("short_link_recommended", "Ultra-Short Kingdom Business Link (Recommended)")}
                  </div>
                  <span className="text-[10px] font-mono text-gray-500">28 chars</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shortUrl}
                    className="flex-1 bg-[#090b10] border border-[#232a3c] rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(shortUrl, "short")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 shrink-0 ${
                      copiedLink === "short"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                    }`}
                  >
                    {copiedLink === "short" ? <><Check size={13} /> {tr("link_copied", "Copied")}</> : <><Copy size={13} /> {tr("btn_copy_link", "Copy Link")}</>}
                  </button>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {tr("short_link_desc", `Automatically directs to the latest scan and live J.A.R.V.I.S. diagnosis for Kingdom ${kd}.`)}
                </div>
              </div>

              {/* Specific Scan Window Link */}
              <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-cyan-400 tracking-wider">
                    {tr("exact_window_link", `Exact Scan Window Link (${timeframe}h ending ${endDate || "latest"})`)}
                  </div>
                  <span className="text-[10px] font-mono text-gray-500">Short Trackable</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={windowShortUrl}
                    className="flex-1 bg-[#090b10] border border-[#232a3c] rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(windowShortUrl, "window")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 shrink-0 ${
                      copiedLink === "window"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-[#141824] text-gray-300 border-[#232a3c] hover:bg-[#1a2030]"
                    }`}
                  >
                    {copiedLink === "window" ? <><Check size={13} /> {tr("link_copied", "Copied")}</> : <><Copy size={13} /> {tr("btn_copy_link", "Copy Link")}</>}
                  </button>
                </div>
              </div>

              {/* Direct Full URL */}
              <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                  {tr("full_url_label", "Full Web Application URL")}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={directFullUrl}
                    className="flex-1 bg-[#090b10] border border-[#232a3c] rounded-lg px-3 py-2 text-xs font-mono text-gray-400 outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(directFullUrl, "full")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 shrink-0 ${
                      copiedLink === "full"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-[#141824] text-gray-300 border-[#232a3c] hover:bg-[#1a2030]"
                    }`}
                  >
                    {copiedLink === "full" ? <><Check size={13} /> {tr("link_copied", "Copied")}</> : <><Copy size={13} /> {tr("btn_copy_link", "Copy Link")}</>}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: RoK In-Game Mail & Notes (Unity Rich Text / HTML) */}
          {activeTab === "bbcode" && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400 leading-relaxed">
                Rise of Kingdoms uses Unity Rich Text tags (HTML-like <code className="text-amber-400">&lt;color&gt;</code> and <code className="text-amber-400">&lt;b&gt;</code>). Links inside RoK are not clickable, but these formatted snippets render styled colors and headers for in-game mail, alliance boards, and personal notes:
              </div>

              {/* 1. In-Game Mail Blast */}
              <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Send size={13} />
                    {tr("rok_mail_title", "RoK In-Game Mail Blast (Unity Rich Text)")}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Renders Colors in Mail
                  </span>
                </div>
                <div className="relative bg-[#090b10] border border-[#1e2434] rounded-xl p-3">
                  <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed select-all">
{`<size=22><b><color=#ffd700>👑 KINGDOM ${kd} EARLY POLYGRAPH BRIEF</color></b></size>
<color=#00e5ff>Window:</color> ${endDate || "Latest"} (${timeframe}h)
<color=#ffd700>Grade:</color> <b><color=lime>Grade ${ai?.grade || "N/A"}</color></b> | <color=#ff0055>Civil War:</color> <color=${parseInt(ai?.civilWarProbability || 0) > 50 ? "#ff0055" : "#00ff88"}>${ai?.civilWarProbability || 0}%</color>
<color=#00ff88>Daily Mobilization:</color> <b><color=#ffd700>+${fmt(Math.round((me?.totalPowerGained || 0) / Math.max(1, parseInt(timeframe) / 24)))}/d</color></b>
<color=#c084fc>Active Spenders:</color> <b><color=#c084fc>${kdd?.whales?.length || 0} Whales</color></b>
<color=#94a3b8>Live Kingdom Dossier:</color>
<size=18><b><color=#ffcc00>${shortUrl.replace("https://", "")}</color></b></size>`}
                  </pre>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleCopyLink(`<size=22><b><color=#ffd700>👑 KINGDOM ${kd} EARLY POLYGRAPH BRIEF</color></b></size>\n<color=#00e5ff>Window:</color> ${endDate || "Latest"} (${timeframe}h)\n<color=#ffd700>Grade:</color> <b><color=lime>Grade ${ai?.grade || "N/A"}</color></b> | <color=#ff0055>Civil War:</color> <color=${parseInt(ai?.civilWarProbability || 0) > 50 ? "#ff0055" : "#00ff88"}>${ai?.civilWarProbability || 0}%</color>\n<color=#00ff88>Daily Mobilization:</color> <b><color=#ffd700>+${fmt(Math.round((me?.totalPowerGained || 0) / Math.max(1, parseInt(timeframe) / 24)))}/d</color></b>\n<color=#c084fc>Active Spenders:</color> <b><color=#c084fc>${kdd?.whales?.length || 0} Whales</color></b>\n<color=#94a3b8>Live Kingdom Dossier:</color>\n<size=18><b><color=#ffcc00>${shortUrl.replace("https://", "")}</color></b></size>`, "mail_html")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                        copiedLink === "mail_html"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
                      }`}
                    >
                      {copiedLink === "mail_html" ? <><Check size={13} /> {tr("link_copied", "Copied")}</> : <><Copy size={13} /> Copy RoK Mail HTML</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Player Signature / Member Note */}
              <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                    <Eye size={13} />
                    {tr("rok_note_title", "Player Profile Signature / Alliance Note")}
                  </div>
                  <span className="text-[10px] font-mono text-gray-500">Compact 1-Liner</span>
                </div>
                <div className="relative bg-[#090b10] border border-[#1e2434] rounded-xl p-3">
                  <pre className="text-xs font-mono text-cyan-300 whitespace-pre-wrap select-all">
{`<b><color=#ffd700>KD${kd}</color></b> <color=lime>Grade ${ai?.grade || "A"}</color> | <color=#00e5ff>+${fmt(Math.round((me?.totalPowerGained || 0) / Math.max(1, parseInt(timeframe) / 24)))}/d</color> | <b><color=#ffcc00>${shortUrl.replace("https://", "")}</color></b>`}
                  </pre>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleCopyLink(`<b><color=#ffd700>KD${kd}</color></b> <color=lime>Grade ${ai?.grade || "A"}</color> | <color=#00e5ff>+${fmt(Math.round((me?.totalPowerGained || 0) / Math.max(1, parseInt(timeframe) / 24)))}/d</color> | <b><color=#ffcc00>${shortUrl.replace("https://", "")}</color></b>`, "note_html")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                        copiedLink === "note_html"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30"
                      }`}
                    >
                      {copiedLink === "note_html" ? <><Check size={13} /> {tr("link_copied", "Copied")}</> : <><Copy size={13} /> Copy Note HTML</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Discord Markdown Announcement */}
              <div className="bg-[#0f131d] border border-[#1e2434] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-fuchsia-400 tracking-wider">
                    {tr("discord_md_title", "Discord Leadership Announcement")}
                  </div>
                  <span className="text-[10px] font-mono text-gray-500">Markdown</span>
                </div>
                <div className="relative bg-[#090b10] border border-[#1e2434] rounded-xl p-3">
                  <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed select-all">
{`**⚡ KINGDOM ${kd} EARLY POLYGRAPH BRIEF**
> **Audit Window:** ${endDate || "Latest"} (${timeframe}h window)
> **Grade:** \`${ai?.grade || "N/A"}\` | **Civil War Risk:** \`${ai?.civilWarProbability || 0}%\`
> **Daily Mobilization:** \`+${fmt(Math.round((me?.totalPowerGained || 0) / Math.max(1, parseInt(timeframe) / 24)))}/day\`
> **Active Spenders:** \`${kdd?.whales?.length || 0} Whales\`
**Live Dossier:** <${shortUrl}>`}
                  </pre>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleCopyLink(`**⚡ KINGDOM ${kd} EARLY POLYGRAPH BRIEF**\n> **Audit Window:** ${endDate || "Latest"} (${timeframe}h window)\n> **Grade:** \`${ai?.grade || "N/A"}\` | **Civil War Risk:** \`${ai?.civilWarProbability || 0}%\`\n> **Daily Mobilization:** \`+${fmt(Math.round((me?.totalPowerGained || 0) / Math.max(1, parseInt(timeframe) / 24)))}/day\`\n> **Active Spenders:** \`${kdd?.whales?.length || 0} Whales\`\n**Live Dossier:** <${shortUrl}>`, "discord_md")}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                        copiedLink === "discord_md"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 hover:bg-fuchsia-500/30"
                      }`}
                    >
                      {copiedLink === "discord_md" ? <><Check size={13} /> {tr("link_copied", "Copied")}</> : <><Copy size={13} /> Copy Discord Text</>}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}


        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1b202e] bg-[#0c0f17] flex items-center justify-between text-xs text-gray-500 font-mono">
          <div>Verified for RoK Photo Album & In-Game Chat</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-gray-300 hover:text-white bg-[#141824] border border-[#232a3c] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
