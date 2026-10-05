"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Shield, Download, Sparkles, Crown, ArrowLeft, 
  CheckCircle2, Info, Eye, Image as ImageIcon, Flame, Castle
} from "lucide-react";

export default function AlbumCardPage() {
  const [kingdomNum, setKingdomNum] = useState("3418");
  const [allianceTag, setAllianceTag] = useState("UN");
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrBase64, setQrBase64] = useState("");
  const canvasRef = useRef(null);

  // Load Level-H QR code
  useEffect(() => {
    const targetUrl = `https://unity-v2-azure.vercel.app/en?utm_source=rok_album&utm_medium=photo&utm_campaign=k${kingdomNum}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&ecc=H&margin=12&color=000000&bgcolor=ffffff&data=${encodeURIComponent(targetUrl)}`;
    
    // Fetch and convert to base64 for canvas rendering
    fetch(qrUrl)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => setQrBase64(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error("Error loading QR:", err));
  }, [kingdomNum]);

  // Handle PNG generation & direct download
  const handleDownloadPng = () => {
    setIsDownloading(true);

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    // 1. Draw Deep Obsidian Gradient Background
    const bgGrad = ctx.createRadialGradient(540, 432, 100, 540, 432, 700);
    bgGrad.addColorStop(0, "#111726");
    bgGrad.addColorStop(1, "#05070a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Draw Ornate Outer Borders
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
    ctx.fillRect(340, 65, 400, 36);
    ctx.strokeRect(340, 65, 400, 36);
    ctx.fillStyle = "#D4AF37";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`KINGDOM ${kingdomNum} • GOVERNOR CODEX`, 540, 88);

    // 4. Main Titles
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 42px serif";
    ctx.fillText("WAR INTELLIGENCE ARCHIVE", 540, 150);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "14px monospace";
    ctx.fillText("CITY HALL 25 ROADMAP • SOC COMMANDER BUILDS • SPEEDUP ENGINE", 540, 185);

    // Divider Line
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(240, 215);
    ctx.lineTo(840, 215);
    ctx.stroke();

    // 5. Strategy Cards Across Middle (Disguises image as strategy guide)
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

    drawCard(80, 245, 280, 125, "CH", "City Hall 1-25", "Prerequisites & Walls", "[ FREE RUSH PLANNER ]", "#38BDF8");
    drawCard(400, 245, 280, 125, "!", "The 7 Fatal Traps", "Save Heads & Sculptures", "[ SURVIVAL CODEX ]", "#34D399");
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

        // Central Crest Overlay (Safe with Level H 30% error correction)
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
        ctx.fillRect(240, 870, 600, 64);
        ctx.strokeRect(240, 870, 600, 64);

        ctx.fillStyle = "#FDE047";
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("★ SCAN OFFICIAL SEAL TO ACCESS ACADEMY ★", 540, 900);

        ctx.fillStyle = "#94A3B8";
        ctx.font = "11px monospace";
        ctx.fillText("0 LOGIN REQUIRED • 100% FREE PUBLIC ACCESS FOR ALL GOVERNORS", 540, 922);

        // Manual Entry URL
        ctx.fillStyle = "#64748B";
        ctx.font = "13px monospace";
        ctx.fillText("PORTAL: unity-v2-azure.vercel.app", 540, 980);

        ctx.fillStyle = "#334155";
        ctx.font = "10px sans-serif";
        ctx.fillText(`ISSUED BY KINGDOM ${kingdomNum} HIGH COMMAND • OSIRIS & KVK INTEL`, 540, 1025);

        // Download trigger
        const link = document.createElement("a");
        link.download = `rok-k${kingdomNum}-album-card.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setIsDownloading(false);
      };
      qrImg.src = qrBase64;
    } else {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Top Breadcrumb */}
      <div className="max-w-5xl mx-auto mb-8 flex items-center justify-between">
        <Link 
          href="/en"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> Back to Governor Academy
        </Link>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
          RoK Album Camouflage Studio
        </span>
      </div>

      {/* Main Studio Header */}
      <div className="max-w-5xl mx-auto text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          <Shield size={14} className="text-amber-400" />
          Anti-Bot Camouflage • Bypasses Lilith Automated Album Block
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-wider font-cinzel">
          In-Game RoK Album Disguise Card
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mt-2 font-mono leading-relaxed">
          Standard QR codes get rejected by Lilith's automated image filter. This generator disguises your QR code inside an authentic 1080x1080 <strong>Kingdom War Intelligence Codex</strong>.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls Column */}
        <div className="bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e2433] pb-3 flex items-center gap-2">
              <Crown size={16} className="text-[#D4AF37]" />
              Card Customization
            </h3>

            {/* Kingdom Number */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Kingdom Number
              </label>
              <input 
                type="text" 
                value={kingdomNum}
                onChange={(e) => setKingdomNum(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={5}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#D4AF37]"
                placeholder="3418"
              />
            </div>

            {/* Alliance Tag */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                Alliance Tag / Crest
              </label>
              <input 
                type="text" 
                value={allianceTag}
                onChange={(e) => setAllianceTag(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                placeholder="UN"
              />
            </div>

            {/* The 3 Anti-Bot Rules */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs">
              <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 size={13} /> Why This Bypasses The Filter
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>1. 85% Gaming Content:</strong> Surrounding the QR code with City Hall and commander stats convinces Tencent's AI filter that this is a fan-art strategy infographic rather than an ad.
              </p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong>2. Level-H Error Correction:</strong> Placing the circular crest in the dead-center breaks the raw barcode signature while allowing phone cameras to scan with 100% precision.
              </p>
            </div>
          </div>

          {/* Download Action */}
          <button
            onClick={handleDownloadPng}
            disabled={isDownloading || !qrBase64}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all shadow-[0_0_25px_rgba(212,175,55,0.3)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download size={16} />
            <span>{isDownloading ? "Generating 1080x1080 PNG..." : "Download RoK Album Card (PNG)"}</span>
          </button>
        </div>

        {/* Live Visual Preview Column */}
        <div className="lg:col-span-2 bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-4 border-b border-[#1e2433] pb-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={14} className="text-cyan-400" /> Live Album Card Preview (1080x1080)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              Ready for RoK Gallery Upload
            </span>
          </div>

          {/* Card Preview Container */}
          <div className="w-full max-w-[440px] aspect-square rounded-2xl border-2 border-[#D4AF37]/40 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden relative group">
            <img 
              src="/qr/rok-album-disguise.svg" 
              alt="RoK Album Disguise Card Preview"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              <button
                onClick={handleDownloadPng}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2"
              >
                <Download size={15} /> Save PNG to Device
              </button>
            </div>
          </div>

          <p className="text-[11px] font-mono text-slate-500 mt-4 text-center">
            Upload this exact square image to your in-game Governor Profile Photo Album. Other players can scan the central seal directly from their screen!
          </p>
        </div>

      </div>

    </div>
  );
}
