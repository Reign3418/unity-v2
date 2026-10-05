"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Shield, Download, Sparkles, Crown, ArrowLeft, 
  CheckCircle2, Heart, Swords, Eye, Edit3, Key, Unlock
} from "lucide-react";

// Curated presets that bridge beginner warmth with veteran depth
const PRESETS = [
  {
    id: "conquest",
    label: "Day 1 to Conquest (Recommended)",
    pill: "PUBLIC ACADEMY & WAR SUITE",
    title: "FROM DAY 1 TO CONQUEST",
    subtitle: "DAY 1 ESSENTIALS • SPEEDUP CALCULATORS • ENDGAME WARFARE",
    tagline: "PROTECTING THE STARTERS • POWERING THE VETERANS"
  },
  {
    id: "brotherhood",
    label: "Grow Together, Fight As One",
    pill: "ALLIANCE BROTHERHOOD",
    title: "GROW TOGETHER • FIGHT AS ONE",
    subtitle: "EVERY GOVERNOR MATTERS • FROM FIRST WALL TO FINAL RUIN",
    tagline: "BUILT BY LONG-HAUL VETERANS FOR THE NEXT GENERATION"
  },
  {
    id: "mastery",
    label: "The Governor's Blueprint",
    pill: "PUBLIC ACADEMY & COMBAT FORGE",
    title: "THE GOVERNOR'S BLUEPRINT",
    subtitle: "STARTER TRAPS • RUSH PLANNER • KVK COMBAT MATH",
    tagline: "THE FOUNDATION FOR STARTERS • THE ARSENAL FOR MASTERS"
  }
];

export default function AlbumCardPage() {
  const [selectedPreset, setSelectedPreset] = useState("conquest");
  const [kingdomNum, setKingdomNum] = useState("3418");
  const [allianceTag, setAllianceTag] = useState("UN");
  
  // Custom text overrides
  const [customTitle, setCustomTitle] = useState(PRESETS[0].title);
  const [customSubtitle, setCustomSubtitle] = useState(PRESETS[0].subtitle);
  const [customTagline, setCustomTagline] = useState(PRESETS[0].tagline);
  const [customPill, setCustomPill] = useState(PRESETS[0].pill);

  const [isDownloading, setIsDownloading] = useState(false);
  const [qrBase64, setQrBase64] = useState("");
  const canvasRef = useRef(null);

  // Switch preset
  const handleSelectPreset = (p) => {
    setSelectedPreset(p.id);
    setCustomTitle(p.title);
    setCustomSubtitle(p.subtitle);
    setCustomTagline(p.tagline);
    setCustomPill(p.pill);
  };

  // Fetch Level-H QR code
  useEffect(() => {
    const targetUrl = `https://unity-v2-azure.vercel.app/en?utm_source=rok_album&utm_medium=photo&utm_campaign=k${kingdomNum}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&ecc=H&margin=12&color=000000&bgcolor=ffffff&data=${encodeURIComponent(targetUrl)}`;
    
    fetch(qrUrl)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => setQrBase64(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error("Error loading QR:", err));
  }, [kingdomNum]);

  // Draw full 1080x1080 canvas
  const renderToCanvas = useCallback((targetCanvas) => {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    // 1. Deep Obsidian Gradient Background
    const bgGrad = ctx.createRadialGradient(540, 432, 100, 540, 432, 700);
    bgGrad.addColorStop(0, "#111726");
    bgGrad.addColorStop(1, "#05070a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Ornate Outer Borders
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1020, 1020);

    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, 992, 992);

    // Corner Castle Accents
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3;
    const corners = [
      [[30, 90], [90, 90], [90, 30]],
      [[1050, 90], [990, 90], [990, 30]],
      [[30, 990], [90, 990], [90, 1050]],
      [[1050, 990], [990, 990], [990, 1050]]
    ];
    corners.forEach(c => {
      ctx.beginPath();
      ctx.moveTo(c[0][0], c[0][1]);
      ctx.lineTo(c[1][0], c[1][1]);
      ctx.lineTo(c[2][0], c[2][1]);
      ctx.stroke();
    });

    // 3. Top Header Pill
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(290, 65, 500, 36);
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(290, 65, 500, 36);
    ctx.fillStyle = "#D4AF37";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`KINGDOM ${kingdomNum} • ${customPill}`, 540, 88);

    // 4. Grand Title (Emotional hook bridging beginners & veterans)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 44px serif";
    ctx.textAlign = "center";
    ctx.fillText(customTitle, 540, 150);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "14px monospace";
    ctx.fillText(customSubtitle, 540, 185);

    // Divider Line with Diamond
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(240, 215);
    ctx.lineTo(840, 215);
    ctx.stroke();

    // Diamond
    ctx.fillStyle = "#D4AF37";
    ctx.beginPath();
    ctx.moveTo(540, 208);
    ctx.lineTo(548, 215);
    ctx.lineTo(540, 222);
    ctx.lineTo(532, 215);
    ctx.fill();

    // 5. Strategy Cards Across Middle (Provides 85% game-infographic camouflage)
    const drawCard = (x, y, w, h, iconText, title, sub, tag, color) => {
      ctx.fillStyle = "#0F172A";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);

      // Icon circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 40, y + 40, 18, 0, Math.PI * 2);
      ctx.fill();

      // Title & Sub
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(title, x + 70, y + 36);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "11px sans-serif";
      ctx.fillText(sub, x + 70, y + 56);

      ctx.fillStyle = color;
      ctx.font = "bold 10px monospace";
      ctx.fillText(tag, x + 15, y + 100);
    };

    drawCard(80, 245, 280, 125, "CH", "City Hall 1-25", "Prerequisites & Rush Route", "[ FREE RUSH PLANNER ]", "#38BDF8");
    drawCard(400, 245, 280, 125, "!", "The 7 Fatal Traps", "Save Heads & Sculptures", "[ SURVIVAL PLAYBOOK ]", "#34D399");
    drawCard(720, 245, 280, 125, "⚔", "Early to SoC BiS", "Pairings & 30% Crit Math", "[ ARMORY PROGRESSION ]", "#C084FC");

    // 6. Draw Central QR Seal
    if (qrBase64) {
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.onload = () => {
        // Frame behind QR
        ctx.fillStyle = "#0B0F19";
        ctx.strokeStyle = "#D4AF37";
        ctx.lineWidth = 3;
        ctx.fillRect(334, 404, 412, 412);
        ctx.strokeRect(334, 404, 412, 412);

        // White canvas
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(342, 412, 396, 396);

        // QR Image
        ctx.drawImage(qrImg, 350, 420, 380, 380);

        // Central Unity Crest Overlay (Safe with Level H 30% error correction)
        ctx.fillStyle = "#070A0F";
        ctx.strokeStyle = "#D4AF37";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(540, 610, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#38BDF8";
        ctx.font = "900 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("UN•TY", 540, 606);

        ctx.fillStyle = "#D4AF37";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`[${allianceTag}]`, 540, 620);

        // 7. Bottom Callout
        ctx.fillStyle = "#0F172A";
        ctx.strokeStyle = "#D4AF37";
        ctx.lineWidth = 1.5;
        ctx.fillRect(190, 870, 700, 66);
        ctx.strokeRect(190, 870, 700, 66);

        ctx.fillStyle = "#FDE047";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("★ PUBLIC ACADEMY: 100% FREE & ZERO LOGIN ★", 540, 897);

        ctx.fillStyle = "#94A3B8";
        ctx.font = "10.5px monospace";
        ctx.fillText("ALLIANCE WAR ROOM & OCR INTEL SUITE: VERIFIED KINGDOM ACCESS", 540, 921);

        // Heart & Veteran Tagline
        ctx.fillStyle = "#E2E8F0";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(customTagline, 540, 978);

        // Manual Entry URL
        ctx.fillStyle = "#64748B";
        ctx.font = "12px monospace";
        ctx.fillText("PORTAL: unity-v2-azure.vercel.app", 540, 1005);

        ctx.fillStyle = "#334155";
        ctx.font = "10px sans-serif";
        ctx.fillText(`ISSUED BY KINGDOM ${kingdomNum} HIGH COMMAND • OSIRIS & KVK INTEL`, 540, 1035);
      };
      qrImg.src = qrBase64;
    }
  }, [kingdomNum, allianceTag, customTitle, customSubtitle, customTagline, customPill, qrBase64]);

  // Redraw preview canvas whenever state changes
  useEffect(() => {
    if (canvasRef.current && qrBase64) {
      renderToCanvas(canvasRef.current);
    }
  }, [renderToCanvas, qrBase64]);

  // Handle high-res PNG download
  const handleDownloadPng = () => {
    setIsDownloading(true);
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1080;
    exportCanvas.height = 1080;
    
    renderToCanvas(exportCanvas);

    // Wait a frame for image draw to flush
    setTimeout(() => {
      const link = document.createElement("a");
      link.download = `rok-k${kingdomNum}-governor-blueprint.png`;
      link.href = exportCanvas.toDataURL("image/png");
      link.click();
      setIsDownloading(false);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Top Breadcrumb */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <Link 
          href="/#public-academy"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> Back to Governor Academy
        </Link>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
          RoK Album Camouflage Studio
        </span>
      </div>

      {/* Main Studio Header */}
      <div className="max-w-4xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <Heart size={14} className="text-rose-400 fill-rose-500/20" />
          <Swords size={14} className="text-amber-400" />
          The Heart to Guide Starters • The Depth to Power Veterans
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-wider font-cinzel">
          In-Game RoK Album Disguise Studio
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mt-2 font-mono leading-relaxed">
          Naked QR codes get blocked by Lilith&apos;s automated filter. This studio disguises your link inside a 1080x1080 <strong>Kingdom War &amp; Academy Card</strong> that welcomes beginners while commanding the respect of long-haul veterans.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Tone & Phrasing Presets */}
            <div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                <Crown size={14} className="text-[#D4AF37]" />
                1. Select Phrasing Vibe:
              </span>
              <div className="space-y-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full p-3 rounded-xl text-left transition-all border text-xs font-bold flex flex-col gap-0.5 ${
                      selectedPreset === preset.id
                        ? "bg-amber-500/15 border-amber-500/80 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "bg-[#121622] border-[#1e2638] text-slate-400 hover:text-white hover:border-slate-600"
                    }`}
                  >
                    <span className="text-amber-300 font-bold">{preset.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">{preset.tagline}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kingdom & Tag Customization */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1e2433]">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Kingdom #
                </label>
                <input 
                  type="text" 
                  value={kingdomNum}
                  onChange={(e) => setKingdomNum(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={5}
                  className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-[#D4AF37]"
                  placeholder="3418"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Alliance Tag
                </label>
                <input 
                  type="text" 
                  value={allianceTag}
                  onChange={(e) => setAllianceTag(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                  placeholder="UN"
                />
              </div>
            </div>

            {/* Custom Text Fine-Tuning Accordion */}
            <div className="pt-2 border-t border-[#1e2433] space-y-3">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
                <Edit3 size={13} className="text-slate-500" />
                Customize Exact Words:
              </span>
              
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Headline</label>
                <input 
                  type="text" 
                  value={customTitle}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    setSelectedPreset("custom");
                  }}
                  className="w-full bg-[#121622] border border-[#1e2638] rounded-lg px-3 py-1.5 text-xs text-white font-serif font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Heart &amp; Veteran Tagline</label>
                <input 
                  type="text" 
                  value={customTagline}
                  onChange={(e) => {
                    setCustomTagline(e.target.value);
                    setSelectedPreset("custom");
                  }}
                  className="w-full bg-[#121622] border border-[#1e2638] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Why This Bypasses Lilith's Filter */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 size={13} /> The Anti-Bot Camouflage
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>85% Game Infographic:</strong> Tencent&apos;s filter sees City Hall milestones, commander pairs, and kingdom shields, cataloging it as fan art rather than an ad.
              </p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>Center Crest (Level-H):</strong> The central crest breaks the barcode pattern for Lilith&apos;s bot, yet smartphone cameras read it effortlessly.
              </p>
            </div>

            {/* Access Clarity Notice */}
            <div className="p-3.5 rounded-xl bg-[#0c1017] border border-[#1e2638] space-y-2 text-xs">
              <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <Key size={13} /> What Governors Receive
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong className="text-emerald-400">🟢 100% Free (Zero Login):</strong> Anyone scanning gets instant access to City Hall Rush, 7 Fatal Traps, Live Math Speedups, and Equipment Progression.
              </p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                <strong className="text-cyan-400">🔒 War Room (Clearance):</strong> Automated OCR Roster Scanner, KvK DKP tracking, and Tactical Maps require Discord authentication and kingdom role permissions.
              </p>
            </div>

          </div>

          {/* Download Action */}
          <button
            onClick={handleDownloadPng}
            disabled={isDownloading || !qrBase64}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            <Download size={16} />
            <span>{isDownloading ? "Rendering 1080x1080 PNG..." : "Download RoK Album Card (PNG)"}</span>
          </button>
        </div>

        {/* Live Visual Preview Column (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-between relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-4 border-b border-[#1e2433] pb-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={14} className="text-cyan-400" /> Live 1080x1080 Card Preview
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              Updates in Real-Time
            </span>
          </div>

          {/* High-Res Dynamic Canvas Container */}
          <div className="w-full max-w-[480px] aspect-square rounded-2xl border-2 border-[#D4AF37]/50 shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-hidden relative group bg-[#05070a]">
            <canvas 
              ref={canvasRef} 
              width={1080} 
              height={1080} 
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              <button
                onClick={handleDownloadPng}
                className="px-6 py-3 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2"
              >
                <Download size={16} /> Save 1080x1080 PNG
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#10141f] border border-[#1d2435] text-center w-full max-w-[480px]">
            <p className="text-[11px] font-mono text-slate-400">
              💡 <strong>How to upload:</strong> Save this image to your phone roll $\rightarrow$ Open RoK $\rightarrow$ Tap your Governor Profile $\rightarrow$ <strong>Photo Album</strong> $\rightarrow$ Upload!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
