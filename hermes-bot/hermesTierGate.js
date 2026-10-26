/**
 * ============================================================================
 * PROJECT HERMES — 3-TIER RARITY GATE, CLONE LOCK & SANDBOX TRAINING ENGINE
 * ============================================================================
 * Implements the 3 Rarity Tiers of HERMES ("All prices subject to change"):
 *
 *   0. 🧪 SANDBOX & MODERATOR TRAINING OVERRIDE (billingSuspended = true):
 *      - Suspends all fees ($0.00) while stress-testing and training Moderators.
 *      - Moderators can simulate `COMMON`, `LEGENDARY`, `VALHEON`, or `UNLICENSED`
 *        at any time via `/hermes tier`!
 *
 *   1. 🚫 UNLICENSED CLONE LOCK (Guild-ID Hardware Lock):
 *      - Blocks servers cloned via Discord's "Server Template" that have not
 *        activated a 1-Click Server License.
 *
 *   2. 🟢 TIER 1: COMMON HERMES ($39 Flat Fee — Included with 1-Click Server):
 *      - Full 1-Click Discord Server Build (21 Roles, 29+ Channels, Honeypot)
 *      - Basic Commands Only (Basic R4 Tickets, manual /title, 30v30 AoO,
 *        War Timers, Redeem Codes, Calculator, 1-question Peerless/Guide preview).
 *
 *   3. 🟠 TIER 2: LEGENDARY HERMES (One-Time Bot Upgrade — Pure Discord Tools):
 *      - ⚡ 24-HOUR LAUNCH WINDOW ("Writer of History" Offer): +$15 Flat Fee ($54 total)
 *      - ⏳ AFTER 24 HOURS (Standard Upgrade): +$25 Flat Fee ($64 total)
 *      - Unlocks 100% of self-contained Discord Bot tools forever ($0/mo recurring):
 *        • 1-Tap & Single-Word Chat Title Queue (justice, duke, scientist, architect)
 *        • Unlimited 17-Language Flag Emoji Reaction & Context-Menu Translator
 *        • Full 17-Language Peerless Scholar + Saturday 10/10 Midterm Early Packet
 *        • 📸 Local Optics Screenshot OCR (Resource Bag & Speedup Bag Math)
 *        • All 95 Sovereign Field Dossiers, 141 Commander Builds, 🎯 Zero-List,
 *          🎙️ Voice Rollcall & 📡 24h Discord Uptime Heatmaps.
 *
 *   4. 👑 TIER 3: VALHEON HERMES ($45 / Month — Live Kingdom Scanner Bots + Web OS):
 *      - Deploys Autonomous Valheon Scanner Bots (`SIDEKICK` / `Unity2AWSRoster`)
 *        into the Kingdom + unlocks Live Scan Data in Discord & `valheon.com`:
 *        • 🤖 Automated Top-300 / Top-600 Kingdom Power, KP & Dead Troop Scans
 *        • 🪪 Live `/mystats` KvK DKP Scorecards & Kill/Dead Goal Progress
 *        • 💀 Live AI Governor Telemetry Roaster (Real T4/T5 Kills & Deads)
 *        • 🛡️ Auto-Injected AEGIS 35-Field Migration Polygraph in R4 Tickets
 *        • 🌐 Full Access to all 5 Webpage Suites on `valheon.com` (AEGIS, NEXUS 3D,
 *          THEATER 128-Node KvK Map, VANGUARD CRM & Web OPTICS).
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncGuildTiersToAws, hydrateGuildTiersFromAws } from './hermesAwsSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TIER_STATE_PATH = path.resolve(__dirname, './guild_tiers.json');

const HQ_GUILD_ID = process.env.ALLOWED_GUILD_ID || '1563618222895407166';

function loadTierStore() {
  try {
    if (fs.existsSync(TIER_STATE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(TIER_STATE_PATH, 'utf8'));
      parsed._globalConfig = { billingSuspended: false };
      return parsed;
    }
  } catch (err) {
    console.error('[HERMES TierGate] Error reading guild_tiers.json:', err.message);
  }
  return {
    _globalConfig: {
      billingSuspended: false, // FALSE = Production Paywall Active ($39 / $9 / $15 / $45/mo)
    },
    [HQ_GUILD_ID]: {
      guildId: HQ_GUILD_ID,
      tier: 'VALHEON',
      licensed: true,
      deployedAtUnix: Math.floor(Date.now() / 1000),
      offerExpiresUnix: Math.floor(Date.now() / 1000) + 86400,
      upgradedAtUnix: Math.floor(Date.now() / 1000),
      webOsActive: true,
    },
  };
}

function saveTierStore(store) {
  try {
    fs.writeFileSync(TIER_STATE_PATH, JSON.stringify(store, null, 2), 'utf8');
    syncGuildTiersToAws(store).catch(() => {});
  } catch (err) {
    console.error('[HERMES TierGate] Error saving guild_tiers.json:', err.message);
  }
}

export const GUILD_TIERS = loadTierStore();

hydrateGuildTiersFromAws(GUILD_TIERS, TIER_STATE_PATH)
  .then(() => {
    if (!GUILD_TIERS._globalConfig) GUILD_TIERS._globalConfig = {};
    // Force Production Paywall Active on startup so stale AWS sandbox flags never bypass the paywall
    GUILD_TIERS._globalConfig.billingSuspended = false;
  })
  .catch(() => {});

export function setBillingSuspended(suspended = true) {
  if (!GUILD_TIERS._globalConfig) GUILD_TIERS._globalConfig = {};
  GUILD_TIERS._globalConfig.billingSuspended = Boolean(suspended);
  saveTierStore(GUILD_TIERS);
  return GUILD_TIERS._globalConfig.billingSuspended;
}

export function registerGuildDeployment(guildId, startingTier = 'COMMON', extraMeta = {}) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const billingSuspended = GUILD_TIERS._globalConfig?.billingSuspended === true;
  const existing = GUILD_TIERS[guildId] || {};
  GUILD_TIERS[guildId] = {
    ...existing,
    ...extraMeta,
    guildId,
    tier: guildId === HQ_GUILD_ID || billingSuspended ? 'VALHEON' : startingTier,
    licensed: true,
    deployedAtUnix: nowUnix,
    offerExpiresUnix: nowUnix + 86400,
    kvkBundleExpiresUnix: nowUnix + 259200, // 72-hour KvK Diplo + Coalition bundle window
    upgradedAtUnix: startingTier !== 'COMMON' || billingSuspended ? nowUnix : null,
    webOsActive: guildId === HQ_GUILD_ID || billingSuspended,
  };
  saveTierStore(GUILD_TIERS);
  return GUILD_TIERS[guildId];
}

export function getGuildTierStatus(guildId) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const billingSuspended = GUILD_TIERS._globalConfig?.billingSuspended === true;
  let record = GUILD_TIERS[guildId];

  if (!record) {
    record = {
      guildId,
      tier: guildId === HQ_GUILD_ID ? 'VALHEON' : billingSuspended ? 'VALHEON' : 'UNLICENSED',
      licensed: guildId === HQ_GUILD_ID || billingSuspended,
      deployedAtUnix: nowUnix,
      offerExpiresUnix: nowUnix + 86400,
      upgradedAtUnix: null,
      webOsActive: guildId === HQ_GUILD_ID || billingSuspended,
    };
    GUILD_TIERS[guildId] = record;
    saveTierStore(GUILD_TIERS);
  }

  // Normalize legacy WEB_OS to VALHEON
  if (record.tier === 'WEB_OS') record.tier = 'VALHEON';

  const offerExpiresUnix = record.offerExpiresUnix || record.deployedAtUnix + 86400;
  const isWithin24h = nowUnix < offerExpiresUnix;
  const upgradePriceUsd = isWithin24h ? 15 : 25;
  const secondsRemaining = Math.max(0, offerExpiresUnix - nowUnix);

  const effectiveTier = record.simulationOverride
    ? record.tier
    : billingSuspended
    ? 'VALHEON'
    : record.tier;

  const isLicensed = effectiveTier !== 'UNLICENSED';
  const isLegendary = effectiveTier === 'LEGENDARY' || effectiveTier === 'VALHEON';
  const isValheon = effectiveTier === 'VALHEON';

  return {
    ...record,
    effectiveTier,
    billingSuspended,
    offerExpiresUnix,
    isWithin24h,
    upgradePriceUsd,
    secondsRemaining,
    isLicensed,
    isLegendary,
    isValheon,
  };
}

export function setGuildTier(guildId, newTier = 'VALHEON', resetTimer = false) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const existing = getGuildTierStatus(guildId);

  if (newTier === 'SANDBOX_FREE') {
    setBillingSuspended(true);
    GUILD_TIERS[guildId] = {
      ...existing,
      tier: 'VALHEON',
      licensed: true,
      simulationOverride: false,
      deployedAtUnix: resetTimer ? nowUnix : existing.deployedAtUnix,
      offerExpiresUnix: resetTimer ? nowUnix + 86400 : existing.offerExpiresUnix,
      webOsActive: true,
    };
    saveTierStore(GUILD_TIERS);
    return getGuildTierStatus(guildId);
  }

  const normalized = newTier === 'WEB_OS' ? 'VALHEON' : newTier;
  GUILD_TIERS[guildId] = {
    ...existing,
    tier: normalized,
    licensed: normalized !== 'UNLICENSED',
    simulationOverride:
      normalized === 'COMMON' || normalized === 'LEGENDARY' || normalized === 'UNLICENSED',
    deployedAtUnix: resetTimer ? nowUnix : existing.deployedAtUnix,
    offerExpiresUnix: resetTimer ? nowUnix + 86400 : existing.offerExpiresUnix,
    upgradedAtUnix: normalized !== 'COMMON' ? nowUnix : null,
    webOsActive: normalized === 'VALHEON',
  };
  saveTierStore(GUILD_TIERS);
  return getGuildTierStatus(guildId);
}

export function buildUnlicensedClonePayload(guildId) {
  return {
    embeds: [
      {
        title: `🚫 UNLICENSED DISCORD SERVER // CLONED TEMPLATE DETECTED`,
        description:
          `**HERMES** detected that Server ID **\`${guildId}\`** has **not** been provisioned through the official **Valheon 1-Click Kingdom Architect**.\n\n` +
          `### 🛡️ WHY THIS SERVER IS LOCKED:\n` +
          `• Discord's native *Server Template* feature only copies empty channel names—it **cannot** copy Valheon's cryptographic Guild-ID license, interactive button consoles, or HERMES bot authorization.\n` +
          `• Each **$39 1-Click Server Build** is cryptographically bound to **1 unique Discord Server ID (\`guildId\`)**.\n\n` +
          `👉 **To activate this Server ID (\`${guildId}\`) and auto-build all 29+ interactive consoles + \`🟢 Common Hermes\`, open an Onboarding Ticket below!**`,
        color: 0xf43f5e,
        footer: {
          text: 'VALHEON GUILD-ID HARDWARE LOCK // 1 LICENSE = 1 DISCORD SERVER ID',
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: '🟢 Activate 1-Click Server License ($39)',
            custom_id: 'hermes_ticket_onboard',
          },
          {
            type: 2,
            style: 1,
            label: '🟠 Activate + Legendary Hermes (+$15 / 24h)',
            custom_id: 'hermes_upgrade_legendary_btn',
          },
        ],
      },
    ],
  };
}

/**
 * Builds the "🟢 COMMON HERMES // FEATURE LOCKED" Teaser Embed
 */
export function buildCommonLockoutPayload({
  guildId,
  featureName = 'Legendary Command',
  teaserText = 'This advanced Discord automation module is locked on **🟢 Common Hermes**.',
}) {
  const status = getGuildTierStatus(guildId);
  if (status.effectiveTier === 'UNLICENSED') {
    return buildUnlicensedClonePayload(guildId);
  }

  const priceTag = status.isWithin24h
    ? `🔥 **24-HOUR LAUNCH OFFER ACTIVE: \`+$15 Flat Fee\`** *(Expires <t:${status.offerExpiresUnix}:R> — increases to \`$25\` after!)*`
    : `⏳ **24-Hour Launch Window Expired:** Standard One-Time Upgrade is **\`+$25 Flat Fee\`** *(was \`$15\` in first 24h)*.`;

  return {
    embeds: [
      {
        title: `🟢 COMMON HERMES LIMITATION // 🔒 [${featureName.toUpperCase()}]`,
        description:
          `${teaserText}\n\n` +
          `Your server is currently running **🟢 Common Hermes (Basic Edition)** included with the \`$39\` 1-Click Server Build.\n\n` +
          `### 🟠 UPGRADE TO LEGENDARY HERMES (ONE-TIME DISCORD UNLOCK)\n` +
          `${priceTag}\n\n` +
          `**What 🟠 Legendary Hermes Unlocks Forever in Discord (\`$0/mo\` recurring):**\n` +
          `• ✅ **1-Tap & Chat Title Queue** (\`justice\`, \`duke\`, \`scientist\`, \`architect\` zero-grid triggers)\n` +
          `• ✅ **17-Language Flag Emoji Reaction Translator** (unlimited across all channels)\n` +
          `• ✅ **Saturday 10/10 Midterm Early Packet & 15s Final Exam Speed Drill**\n` +
          `• ✅ **📸 Local Optics Screenshot OCR** (instant Resource & Speedup Bag math)\n` +
          `• ✅ **Full 95 Sovereign Field Dossiers & 141 Commander Skill/Talent Trees**\n` +
          `• ✅ **🎯 R4 Zero-List Shield Drop Tracker, 🎙️ Voice Rollcall & 📡 24h Uptime Heatmaps**\n\n` +
          `*(Need **Live Kingdom Scanner Bots, Live DKP \`/mystats\`, Live Governor Roasts & Full \`valheon.com\` Webpage Access**? Upgrade to **👑 Valheon Hermes** for **\`$45/mo\`**!)*`,
        color: 0x22c55e,
        footer: {
          text: '🟢 COMMON HERMES -> 🟠 LEGENDARY HERMES -> 👑 VALHEON HERMES // ALL PRICES SUBJECT TO CHANGE',
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: status.isWithin24h
              ? '🟠 Claim 24h Legendary Upgrade (+$15 One-Time)'
              : '🟠 Upgrade to Legendary Hermes (+$25 One-Time)',
            custom_id: 'hermes_upgrade_legendary_btn',
          },
          {
            type: 2,
            style: 1,
            label: '👑 Upgrade to Valheon Hermes ($45/mo)',
            custom_id: 'hermes_upgrade_webos_btn',
          },
        ],
      },
    ],
  };
}

/**
 * Builds the "👑 VALHEON HERMES REQUIRED // LIVE KINGDOM SCANNER GATE" Embed
 * when a server on Common or Legendary tries to pull Live Kingdom Scan Data
 * (/mystats DKP, 💀 Governor Roast, or 🛡️ AEGIS 35-Field Ticket Polygraph)
 */
export function buildValheonLockoutPayload({
  guildId,
  featureName = 'Live Kingdom Scan Telemetry',
  teaserText = 'This feature requires active **Valheon Scanner Bots** deployed in your Kingdom.',
}) {
  const status = getGuildTierStatus(guildId);
  if (status.effectiveTier === 'UNLICENSED') {
    return buildUnlicensedClonePayload(guildId);
  }

  return {
    embeds: [
      {
        title: `👑 VALHEON HERMES REQUIRED // 🛰️ [${featureName.toUpperCase()}]`,
        description:
          `${teaserText}\n\n` +
          `Your server is currently running **\`${status.effectiveTier} HERMES\`** (Discord-Only Mode). Commands that pull **live in-game Kingdom Scan Data** require **👑 Valheon Hermes (\`$45/mo\`)**.\n\n` +
          `### 👑 WHAT \`VALHEON HERMES\` ($45/MO) UNLOCKS IN YOUR KINGDOM:\n` +
          `• 🤖 **Autonomous Scanner Bots Deployed in Your Kingdom:** Automated Top-300 / Top-600 Power, T4/T5 Kills & Dead Troop scans\n` +
          `• 🪪 **Live \`/mystats\` KvK DKP Scorecards:** Real-time Kill/Dead goal progress bars inside Discord\n` +
          `• 💀 **Live AI Governor Telemetry Roaster:** Exposes 90M-power farm lords using real scan history\n` +
          `• 🛡️ **Auto-Injected AEGIS 35-Field Migration Polygraph:** Instant migrant vetting inside R4 Tickets\n` +
          `• 🌐 **Full Access to All 5 Webpage Suites (\`valheon.com\`):** AEGIS Dashboard, NEXUS 3D Galaxy, THEATER 128-Node KvK Map, VANGUARD CRM & Web OPTICS!`,
        color: 0xa855f7, // Sovereign Purple / Gold
        footer: {
          text: '👑 VALHEON HERMES // LIVE KINGDOM SCANNER BOTS + WEBPAGE SUITE ($45/MO • SUBJECT TO CHANGE)',
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: '👑 Activate Valheon Hermes ($45/mo)',
            custom_id: 'hermes_upgrade_webos_btn',
          },
          {
            type: 2,
            style: 5,
            label: '🌐 Explore Valheon.com Suites',
            url: 'https://valheon.com',
          },
        ],
      },
    ],
  };
}

/**
 * Builds the Master 3-Tier Comparison Embed for #🪽-1-click-kingdom-discord
 */
export function buildTierPricingConsoleEmbed(guildId) {
  const status = getGuildTierStatus(guildId);
  const sandboxBanner = status.billingSuspended
    ? `> 🧪 **SANDBOX & MODERATOR TRAINING MODE ACTIVE (\`ALL FEES CURRENTLY SUSPENDED — $0.00\`)**\n` +
      `> *All 1-Click Server Deployments, \`🟠 Legendary Hermes\`, and \`👑 Valheon Hermes\` modules are currently **100% unlocked for free** while our Sovereign & Moderator team stress-tests the platform! Use \`/hermes tier\` or the Preview buttons below to test each tier.*\n\n`
    : '';

  return {
    embeds: [
      {
        title: '🪽 HERMES 1-CLICK DISCORD ARCHITECT & 3-TIER RARITY MATRIX',
        description:
          sandboxBanner +
          'Deploy a complete, battle-ready **Kingdom War Server** in **18 seconds** — and choose your **HERMES** Rarity Tier:\n\n' +
          '--- \n' +
          '### 🟢 TIER 1: `COMMON HERMES` (+ 1-Click Discord Server) — **`$39` One-Time Flat Fee**\n' +
          '*One-and-done server build bound to 1 Discord Server ID (`guildId`). Stay in Discord with `$0/mo` recurring.*\n' +
          '• 🏗️ **Instant 1-Click Server Build:** 21 Roles, 29+ Channels, `#⚠️-trap-channel-⚠️` Anti-Spambot Honeypot & Permission Locks\n' +
          '• 🌐 **Pinned Official RoK Intel Bridge** & **🎯 1-Tap Combat/Event Ping Role Console**\n' +
          '• 🟢 **Includes `Common Hermes` (Starter Bot):** Basic R4 Tickets, manual `/title`, 30v30 AoO signups, War Timers, Redeem Codes & 1-question Peerless/Guide previews\n\n' +
          '--- \n' +
          '### 🟠 TIER 2: `LEGENDARY HERMES` (Pure Discord Bot Unlock) — **`+$15` (First 24h) / `+$25` (After 24h)**\n' +
          '*🔥 **"Writer of History" 24-Hour Twist:** Upgrade within **24 hours** of server build for **`+$15` one-time** (`$54` total), or **`+$25` one-time** after 24 hours (`$64` total). Unlocks all self-contained Discord automation forever (`$0/mo` recurring):*\n' +
          '• ⚡ **1-Tap & Single-Word Chat Title Queue** (`justice`, `duke`, `scientist`, `architect`)\n' +
          '• 🌍 **Unlimited 17-Language Flag Emoji & Right-Click Translator** (`lc_*.dat` RoK Glossary)\n' +
          '• 🎓 **Full 17-Language Peerless Scholar Vault** + **Saturday 10/10 Midterm Early Packet**\n' +
          '• 📸 **Optics Screenshot OCR Scanner** (Drop Resource/Speedup bags in Discord for instant math)\n' +
          '• 📖 **All 95 Sovereign Field Dossiers**, **141 Commander Builds**, **🎯 Zero-List** & **🎙️ Voice Rollcall**\n\n' +
          '--- \n' +
          '### 👑 TIER 3: `VALHEON HERMES` (Live Kingdom Scanner Bots + Webpage Suite) — **`$45 / Month`**\n' +
          '*Deploys **Valheon Scanner Bots** into your Kingdom + links your Discord & **Valheon Webpage (`valheon.com`)** to live scan data:*\n' +
          '• 🤖 **Automated Top-300/600 Kingdom Scans:** Live Power, T4/T5 Kills & Dead Troop tracking in your Kingdom\n' +
          '• 🪪 **LiveScan-Powered Discord Commands:** Unlocks live **`/mystats` DKP Scorecards**, **💀 Live Governor Roasts** & **Auto-Injected AEGIS 35-Field Ticket Polygraphs**\n' +
          '• 🌐 **All 5 Webpage Suites (`valheon.com`):** AEGIS Dashboard, NEXUS 3D Galaxy, THEATER 128-Node KvK Map, VANGUARD CRM & Web OPTICS\n\n' +
          `> ⏱️ **Active Server Tier:** **\`${
            status.billingSuspended && !status.simulationOverride
              ? 'SANDBOX FREE (👑 VALHEON HERMES UNLOCKED)'
              : status.effectiveTier + ' HERMES'
          }\`** • 24h \`+$15\` Legendary Window: <t:${status.offerExpiresUnix}:R>`,
        color: status.billingSuspended ? 0x10b981 : 0xf59e0b,
        footer: {
          text: '🟢 COMMON ($39) -> 🟠 LEGENDARY (+$15/$25) -> 👑 VALHEON ($45/MO) // ALL PRICES SUBJECT TO CHANGE',
        },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: '🟢 1-Click Server + Common ($39)',
            custom_id: 'hermes_ticket_onboard',
          },
          {
            type: 2,
            style: 1,
            label: '🟠 Legendary Hermes (+$15 / 24h)',
            custom_id: 'hermes_upgrade_legendary_btn',
          },
          {
            type: 2,
            style: 2,
            label: '👑 Valheon Hermes ($45/mo Scans+Web)',
            custom_id: 'hermes_upgrade_webos_btn',
          },
          {
            type: 2,
            style: 4,
            label: '🔒 Preview Tier Lockouts',
            custom_id: 'hermes_demo_common_lockout',
          },
        ],
      },
    ],
  };
}
