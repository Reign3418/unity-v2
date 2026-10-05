const fs = require('fs');
const https = require('https');
const path = require('path');

const targetUrl = 'https://unity-v2-azure.vercel.app/en?utm_source=rok_album&utm_medium=photo';
// Level H Error Correction: 30% damage tolerance
const qrApi = 'https://api.qrserver.com/v1/create-qr-code/?size=420x420&ecc=H&margin=12&color=000000&bgcolor=ffffff&data=' + encodeURIComponent(targetUrl);

https.get(qrApi, (res) => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const qrBase64 = Buffer.concat(chunks).toString('base64');
    
    // Build full 1080x1080 RoK Album Infographic SVG
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#111726" />
      <stop offset="100%" stop-color="#05070a" />
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#92400E" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="1080" height="1080" fill="url(#bgGlow)" />

  <!-- Outer Ornate Gold Border -->
  <rect x="30" y="30" width="1020" height="1020" rx="24" fill="none" stroke="url(#goldGrad)" stroke-width="4" opacity="0.85" />
  <rect x="44" y="44" width="992" height="992" rx="16" fill="none" stroke="#1E293B" stroke-width="2" />

  <!-- Corner Castle Accents -->
  <g stroke="url(#goldGrad)" stroke-width="3" fill="none">
    <path d="M 30 90 L 90 90 L 90 30" />
    <path d="M 1050 90 L 990 90 L 990 30" />
    <path d="M 30 990 L 90 990 L 90 1050" />
    <path d="M 1050 990 L 990 990 L 990 1050" />
  </g>

  <!-- Top Pill / Header Badge -->
  <rect x="340" y="65" width="400" height="36" rx="18" fill="#1E293B" stroke="url(#goldGrad)" stroke-width="1.5" />
  <text x="540" y="88" fill="#D4AF37" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" letter-spacing="3">
    KINGDOM 3418 • GOVERNOR CODEX
  </text>

  <!-- Grand Header Title -->
  <text x="540" y="150" fill="#FFFFFF" font-family="serif" font-size="42" font-weight="900" text-anchor="middle" letter-spacing="2">
    WAR INTELLIGENCE ARCHIVE
  </text>
  <text x="540" y="185" fill="#94A3B8" font-family="monospace" font-size="15" text-anchor="middle" letter-spacing="1">
    CITY HALL 25 ROADMAP • SOC COMMANDER BUILDS • SPEEDUP ENGINE
  </text>

  <!-- Divider Line with Diamond -->
  <line x1="240" y1="215" x2="840" y2="215" stroke="#334155" stroke-width="1" />
  <polygon points="540,208 548,215 540,222 532,215" fill="#D4AF37" />

  <!-- 3 Strategy Feature Cards Across Middle -->
  <!-- Card 1: CH 25 Rush -->
  <rect x="80" y="245" width="280" height="125" rx="14" fill="#0F172A" stroke="#334155" stroke-width="1.5" />
  <circle cx="120" cy="285" r="18" fill="#D4AF37" fill-opacity="0.15" stroke="#D4AF37" stroke-width="1" />
  <text x="120" y="291" fill="#D4AF37" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">CH</text>
  <text x="150" y="280" fill="#F8FAFC" font-family="sans-serif" font-size="15" font-weight="bold">City Hall 1-25</text>
  <text x="150" y="300" fill="#94A3B8" font-family="sans-serif" font-size="11">Prerequisites &amp; Walls Mapped</text>
  <text x="220" y="345" fill="#38BDF8" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">[ FREE RUSH PLANNER ]</text>

  <!-- Card 2: 7 Deadly Traps -->
  <rect x="400" y="245" width="280" height="125" rx="14" fill="#0F172A" stroke="#334155" stroke-width="1.5" />
  <circle cx="440" cy="285" r="18" fill="#10B981" fill-opacity="0.15" stroke="#10B981" stroke-width="1" />
  <text x="440" y="291" fill="#10B981" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">!</text>
  <text x="470" y="280" fill="#F8FAFC" font-family="sans-serif" font-size="15" font-weight="bold">The 7 Fatal Traps</text>
  <text x="470" y="300" fill="#94A3B8" font-family="sans-serif" font-size="11">Save Heads &amp; Gold Sculptures</text>
  <text x="540" y="345" fill="#34D399" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">[ SURVIVAL CODEX ]</text>

  <!-- Card 3: Gear & Pairings -->
  <rect x="720" y="245" width="280" height="125" rx="14" fill="#0F172A" stroke="#334155" stroke-width="1.5" />
  <circle cx="760" cy="285" r="18" fill="#A855F7" fill-opacity="0.15" stroke="#A855F7" stroke-width="1" />
  <text x="760" y="291" fill="#A855F7" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">⚔</text>
  <text x="790" y="280" fill="#F8FAFC" font-family="sans-serif" font-size="15" font-weight="bold">Early to SoC BiS</text>
  <text x="790" y="300" fill="#94A3B8" font-family="sans-serif" font-size="11">Pairings &amp; 30% Crit Math</text>
  <text x="860" y="345" fill="#C084FC" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle">[ ARMORY PROGRESSION ]</text>

  <!-- Central Seal Frame: Disguised as 'Official Verification Stamp' -->
  <g transform="translate(350, 420)">
    <!-- Ornate Frame Behind QR -->
    <rect x="-16" y="-16" width="412" height="412" rx="24" fill="#0B0F19" stroke="url(#goldGrad)" stroke-width="3" />
    <rect x="-8" y="-8" width="396" height="396" rx="18" fill="#FFFFFF" />

    <!-- Embedded High-Resolution QR Code -->
    <image href="data:image/png;base64,${qrBase64}" x="0" y="0" width="380" height="380" />

    <!-- Central Unity Crest Overlay (Safe with Level H 30% Error Correction) -->
    <circle cx="190" cy="190" r="34" fill="#070A0F" stroke="url(#goldGrad)" stroke-width="3" />
    <text x="190" y="196" fill="#38BDF8" font-family="sans-serif" font-size="15" font-weight="900" text-anchor="middle" letter-spacing="1">UN•TY</text>
    <text x="190" y="210" fill="#D4AF37" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">2.0</text>
  </g>

  <!-- Bottom Action Callout -->
  <rect x="240" y="870" width="600" height="64" rx="16" fill="#0F172A" stroke="url(#goldGrad)" stroke-width="1.5" />
  <text x="540" y="900" fill="#FDE047" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle" letter-spacing="1">
    ★ SCAN OFFICIAL SEAL TO ACCESS ACADEMY ★
  </text>
  <text x="540" y="922" fill="#94A3B8" font-family="monospace" font-size="11" text-anchor="middle">
    0 LOGIN REQUIRED • 100% FREE PUBLIC ACCESS FOR ALL GOVERNORS
  </text>

  <!-- Subtle Web URL at Base for Manual Entry -->
  <text x="540" y="980" fill="#64748B" font-family="monospace" font-size="13" text-anchor="middle" letter-spacing="2">
    PORTAL: unity-v2-azure.vercel.app
  </text>

  <!-- Footer Authenticity Stamp -->
  <text x="540" y="1025" fill="#334155" font-family="sans-serif" font-size="10" text-anchor="middle">
    ISSUED BY KINGDOM 3418 HIGH COMMAND • OSIRIS &amp; KVK INTEL
  </text>
</svg>`;

    const dest = path.join('public', 'qr', 'rok-album-disguise.svg');
    fs.writeFileSync(dest, svg);
    console.log('SUCCESS: Generated', dest);
  });
}).on('error', err => console.error(err));
