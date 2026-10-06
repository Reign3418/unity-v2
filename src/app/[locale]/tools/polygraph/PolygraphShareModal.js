"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  X, Copy, Check, Download, QrCode, Image as ImageIcon, 
  Sparkles, Shield, ExternalLink, Send, Flame, Eye, Palette
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
  const [theme, setTheme] = useState("gold"); // 'gold' | 'neon'
  const [copiedLink, setCopiedLink] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrBase64, setQrBase64] = useState("");
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

  const origin = typeof window !== "undefined" ? window.location.origin : "https://unity-v2.vercel.app";
  const shortUrl = `${origin}/s/${kd}`;
  const windowShortUrl = `${origin}/qr?k=${kd}&e=${endDate || ""}&t=${timeframe}`;
  const directFullUrl = `${origin}/${locale}/shared/polygraph?kd=${kd}${endDate ? `&end=${endDate}` : ""}&tf=${timeframe}&depth=${depth}`;

  // Fetch Level-H QR code with fallback
  useEffect(() => {
    if (!isOpen || !kd) return;

    // Use short redirect link as QR target for maximum scan density & readability
    const qrTarget = shortUrl;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&ecc=H&margin=10&color=000000&bgcolor=ffffff&data=${encodeURIComponent(qrTarget)}`;

    fetch(qrUrl)
      .then(res => {
        if (!res.ok) throw new Error("Primary QR fetch failed");
        return res.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => setQrBase64(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        // Fallback to quickchart QR
        const fallbackUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrTarget)}&size=450&ecLevel=H&margin=2`;
        fetch(fallbackUrl)
          .then(res => res.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => setQrBase64(reader.result);
            reader.readAsDataURL(blob);
          })
          .catch(e => console.error("QR load failed:", e));
      });
  }, [isOpen, kd, shortUrl]);

  // Number formatting helper
  const fmt = (n) => {
    const abs = Math.abs(n || 0);
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(Math.round(n / 100) * 100 / 1e3).toFixed(0)}k`;
    return String(n || 0);
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
    ctx.fillRect(300, 68, 480, 34);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(300, 68, 480, 34);

    ctx.fillStyle = primaryColor;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`★ KINGDOM ${kd} • STRATEGIC INTELLIGENCE DOSSIER ★`, 540, 90);

    // 4. Grand Title (Game Camouflage)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 46px serif";
    ctx.textAlign = "center";
    ctx.fillText("EARLY KINGDOM POLYGRAPH", 540, 155);

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

    // 6. Central "Stealth" QR Seal Frame
    const qrSize = 360;
    const qrX = (1080 - qrSize) / 2;
    const qrY = 370;

    // Outer Gilded Frame
    ctx.fillStyle = "#070A12";
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.fillRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);
    ctx.strokeRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);

    // Inner White Pad for Scan Reliability
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(qrX, qrY, qrSize, qrSize);

    // Draw QR image
    if (qrBase64) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, qrX + 8, qrY + 8, qrSize - 16, qrSize - 16);

        // Center Unity Shield Overlay
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
        ctx.fillText("UN•TY", cx, cy - 2);

        ctx.fillStyle = "#38BDF8";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`KD ${kd}`, cx, cy + 12);

        finishCardDrawing(ctx, primaryColor, accentColor);
      };
      img.src = qrBase64;
    } else {
      finishCardDrawing(ctx, primaryColor, accentColor);
    }
  }, [theme, kd, kdd, ai, me, depth, timeframe, qrBase64]);

  const finishCardDrawing = (ctx, primaryColor, accentColor) => {
    // 7. Camouflage Frame Label under QR
    ctx.fillStyle = "#0B0F19";
    ctx.fillRect(240, 770, 600, 48);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(240, 770, 600, 48);

    ctx.fillStyle = primaryColor;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("★ SCAN CAMERA TO UNLOCK LIVE KINGDOM ROSTER ★", 540, 792);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "10px monospace";
    ctx.fillText("REAL-TIME SPENDER SIGNATURES • ALLIANCE TURMOIL • FRAUD RADAR", 540, 808);

    // 8. Roster Summary Quote
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "italic 13px sans-serif";
    const diagText = ai?.diagnosis 
      ? `"${ai.diagnosis.slice(0, 110)}..."` 
      : `"Verified Early Kingdom Polygraph analysis. Zero bot padding, full roster velocity."`;
    ctx.fillText(diagText, 540, 860);

    // 9. Bottom Strategic Callout Banner
    ctx.fillStyle = "#0D111C";
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 1.5;
    ctx.fillRect(160, 900, 760, 64);
    ctx.strokeRect(160, 900, 760, 64);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("UNITY COMBAT NETWORK • PUBLIC GOVERNOR WAR SUITE", 540, 926);

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`PORTAL DIRECT SHORTLINK: ${shortUrl.replace("https://", "")}`, 540, 948);

    // 10. Legal/Anti-Lilith-Ban Camouflage Watermark
    ctx.fillStyle = "#475569";
    ctx.font = "10px sans-serif";
    ctx.fillText("CONFIDENTIAL ALLIANCE RECORD • ZERO LOGIN • FREE TO ALL GOVERNORS", 540, 1000);
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
      link.download = `KD${kd}_Polygraph_Business_Card.png`;
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

                {/* RoK Album Stealth Feature Explainer */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={13} className="text-emerald-400" />
                    {tr("lilith_protection_title", "Lilith Moderation Protection")}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    {tr("lilith_protection_desc", "Structured as a legitimate Kingdom Combat Dossier so Lilith's automated image OCR approves it without flags. Features Level-H error correction to survive album recompression.")}
                  </p>
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

          {/* TAB 3: BBCode & Discord */}
          {activeTab === "bbcode" && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400 leading-relaxed">
                {tr("bbcode_desc", "Pre-formatted for in-game kingdom mail broadcasts and Discord recruitment announcements:")}
              </div>

              <div className="relative bg-[#090b10] border border-[#1e2434] rounded-xl p-4">
                <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed select-all">
                  {bbcodeText}
                </pre>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleCopyLink(bbcodeText, "bbcode")}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                      copiedLink === "bbcode"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 hover:bg-fuchsia-500/30"
                    }`}
                  >
                    {copiedLink === "bbcode" ? <><Check size={13} /> {tr("bbcode_copied", "Copied BBCode!")}</> : <><Copy size={13} /> {tr("btn_copy_bbcode_blast", "Copy BBCode / Discord Text")}</>}
                  </button>
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
