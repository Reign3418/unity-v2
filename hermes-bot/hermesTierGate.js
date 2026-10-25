/**
 * ============================================================================
 * PROJECT HERMES — RARITY TIER GATE, CLONE LOCK & SANDBOX TRAINING ENGINE
 * ============================================================================
 * Implements:
 *   0. 🧪 SANDBOX & MODERATOR TRAINING OVERRIDE (billingSuspended = true):
 *      - Suspends all fees ($0.00) while stress-testing and training Moderators.
 *      - Moderators can still simulate `COMMON` or `UNLICENSED` (Clone Lock)
 *        at any time via `/hermes tier` or the Preview buttons!
 *
 *   1. 🚫 UNLICENSED CLONE LOCK (Guild-ID Hardware Lock):
 *      - Prevents anyone from using Discord's native "Server Template" to clone
 *        a server and invite HERMES for free. Unregistered Guild IDs are blocked
 *        until provisioned via the 1-Click Architect.
 *
 *   2. 🟢 COMMON HERMES ($39 Flat Fee — Included with 1-Click Discord Server):
 *      - Full 1-Click Discord Server Build (21 Roles, 28+ Channels, Permissions)
 *      - Basic Commands Only (Just enough to hook them & tease Legendary!)
 *
 *   3. 🟠 LEGENDARY HERMES (One-Time Bot Upgrade — Stay 100% in Discord Forever):
 *      - ⚡ 24-HOUR LAUNCH WINDOW ("Writer of History" Offer): +$15 Flat Fee ($54 total)
 *      - ⏳ AFTER 24 HOURS (Standard Upgrade): +$25 Flat Fee ($64 total)
 *
 *   4. 🌐 VALHEON WEBPAGE TOOLS ($45 / Month — Separate Web Add-On):
 *      - Webpage Tools Only (`valheon.com` — AEGIS, NEXUS 3D, THEATER 128-Node Map,
 *        VANGUARD CRM, Web OPTICS & Automated Kingdom Leaderboard Scans).
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TIER_STATE_PATH = path.resolve(__dirname, './guild_tiers.json');

const HQ_GUILD_ID = process.env.ALLOWED_GUILD_ID || '1563618222895407166';

function loadTierStore() {
  try {
    if (fs.existsSync(TIER_STATE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(TIER_STATE_PATH, 'utf8'));
      if (!parsed._globalConfig) {
        parsed._globalConfig = { billingSuspended: true };
      }
      return parsed;
    }
  } catch (err) {
    console.error('[HERMES TierGate] Error reading guild_tiers.json:', err.message);
  }
  return {
    _globalConfig: {
      billingSuspended: true, // TRUE = All Fees Suspended ($0.00 Moderator Training & Stress-Test Mode)
    },
    [HQ_GUILD_ID]: {
      guildId: HQ_GUILD_ID,
      tier: 'LEGENDARY',
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
  } catch (err) {
    console.error('[HERMES TierGate] Error saving guild_tiers.json:', err.message);
  }
}

export const GUILD_TIERS = loadTierStore();

/**
 * Toggles Global Sandbox / Fee Suspension Mode on or off
 */
export function setBillingSuspended(suspended = true) {
  if (!GUILD_TIERS._globalConfig) GUILD_TIERS._globalConfig = {};
  GUILD_TIERS._globalConfig.billingSuspended = Boolean(suspended);
  saveTierStore(GUILD_TIERS);
  return GUILD_TIERS._globalConfig.billingSuspended;
}

/**
 * Registers a legitimate 1-Click Server Deployment (authorizing its Guild ID against template clones
 * and saving its blueprintType + deployOptions for $0.00 1-Click Free Customer Repairs/Relaunches!)
 */
export function registerGuildDeployment(
  guildId,
  startingTier = 'COMMON',
  blueprintMeta = {}
) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const billingSuspended = GUILD_TIERS._globalConfig?.billingSuspended !== false;
  const existing = GUILD_TIERS[guildId] || {};
  GUILD_TIERS[guildId] = {
    ...existing,
    guildId,
    buyerDiscordId: existing.buyerDiscordId || blueprintMeta.buyerDiscordId || null,
    buyerUsername: existing.buyerUsername || blueprintMeta.buyerUsername || null,
    blueprintType: blueprintMeta.blueprintType || existing.blueprintType || 'KINGDOM_WAR_SERVER',
    deployOptions: blueprintMeta.deployOptions || existing.deployOptions || {
      kingdomId: '4194',
      kingdomTitle: 'SOVEREIGN KINGDOM #4194',
      alliances: ['VHN1', 'VHN2', 'VHN3', 'VHN4'],
    },
    tier: guildId === HQ_GUILD_ID || billingSuspended ? 'LEGENDARY' : startingTier,
    licensed: true,
    deployedAtUnix: existing.deployedAtUnix || nowUnix,
    offerExpiresUnix: existing.offerExpiresUnix || nowUnix + 86400, // Exact 24-hour +$15 Legendary FOMO window
    kvkBundleExpiresUnix: existing.kvkBundleExpiresUnix || nowUnix + 259200, // Exact 72-hour $15 Diplo+Coalition Bundle window
    upgradedAtUnix: startingTier === 'LEGENDARY' || billingSuspended ? nowUnix : existing.upgradedAtUnix || null,
    webOsActive: guildId === HQ_GUILD_ID,
    relaunchCount: (existing.relaunchCount || 0) + (existing.deployedAtUnix ? 1 : 0),
    lastRelaunchedAtUnix: nowUnix,
  };
  saveTierStore(GUILD_TIERS);
  return GUILD_TIERS[guildId];
}

/**
 * Gets the current tier metadata, Guild-ID Clone Lock status, & live 24h / 72h pricing windows
 */
export function getGuildTierStatus(guildId) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const billingSuspended = GUILD_TIERS._globalConfig?.billingSuspended !== false;
  let record = GUILD_TIERS[guildId];

  if (!record) {
    // If Commercial Billing is LIVE (not suspended) and this Guild ID was never provisioned via 1-Click Architect,
    // it is a cloned template or unauthorized invite -> Lock as UNLICENSED!
    record = {
      guildId,
      blueprintType: guildId === HQ_GUILD_ID ? 'VALHEON_HQ' : 'KINGDOM_WAR_SERVER',
      deployOptions: {
        kingdomId: '4194',
        kingdomTitle: 'SOVEREIGN KINGDOM #4194',
        alliances: ['VHN1', 'VHN2', 'VHN3', 'VHN4'],
      },
      tier: guildId === HQ_GUILD_ID ? 'LEGENDARY' : billingSuspended ? 'LEGENDARY' : 'UNLICENSED',
      licensed: guildId === HQ_GUILD_ID || billingSuspended,
      deployedAtUnix: nowUnix,
      offerExpiresUnix: nowUnix + 86400,
      kvkBundleExpiresUnix: nowUnix + 259200,
      upgradedAtUnix: null,
      webOsActive: guildId === HQ_GUILD_ID,
    };
    GUILD_TIERS[guildId] = record;
    saveTierStore(GUILD_TIERS);
  }

  const offerExpiresUnix = record.offerExpiresUnix || record.deployedAtUnix + 86400;
  const kvkBundleExpiresUnix = record.kvkBundleExpiresUnix || record.deployedAtUnix + 259200;
  const isWithin24h = nowUnix < offerExpiresUnix;
  const isWithin72hBundle = nowUnix < kvkBundleExpiresUnix;
  const upgradePriceUsd = isWithin24h ? 15 : 25;
  const kvkBundlePriceUsd = isWithin72hBundle ? 15 : 18;
  const secondsRemaining = Math.max(0, offerExpiresUnix - nowUnix);

  // If a moderator explicitly set `record.simulationOverride` to test COMMON or UNLICENSED, respect that!
  const effectiveTier = record.simulationOverride
    ? record.tier
    : billingSuspended
    ? 'LEGENDARY'
    : record.tier;

  const isLicensed = effectiveTier !== 'UNLICENSED';
  const isLegendary = effectiveTier === 'LEGENDARY';

  return {
    ...record,
    effectiveTier,
    billingSuspended,
    offerExpiresUnix,
    kvkBundleExpiresUnix,
    isWithin24h,
    isWithin72hBundle,
    upgradePriceUsd,
    kvkBundlePriceUsd,
    secondsRemaining,
    isLicensed,
    isLegendary,
  };
}

/**
 * Upgrades or sets a Guild's HERMES Rarity Tier ('SANDBOX_FREE' | 'COMMON' | 'LEGENDARY' | 'UNLICENSED' | 'WEB_OS')
 */
export function setGuildTier(guildId, newTier = 'LEGENDARY', resetTimer = false) {
  const nowUnix = Math.floor(Date.now() / 1000);
  const existing = getGuildTierStatus(guildId);

  if (newTier === 'SANDBOX_FREE') {
    setBillingSuspended(true);
    GUILD_TIERS[guildId] = {
      ...existing,
      tier: 'LEGENDARY',
      licensed: true,
      simulationOverride: false,
      deployedAtUnix: resetTimer ? nowUnix : existing.deployedAtUnix,
      offerExpiresUnix: resetTimer ? nowUnix + 86400 : existing.offerExpiresUnix,
    };
    saveTierStore(GUILD_TIERS);
    return getGuildTierStatus(guildId);
  }

  GUILD_TIERS[guildId] = {
    ...existing,
    tier: newTier,
    licensed: newTier !== 'UNLICENSED',
    simulationOverride: newTier === 'COMMON' || newTier === 'UNLICENSED',
    deployedAtUnix: resetTimer ? nowUnix : existing.deployedAtUnix,
    offerExpiresUnix: resetTimer ? nowUnix + 86400 : existing.offerExpiresUnix,
    upgradedAtUnix: newTier === 'LEGENDARY' ? nowUnix : null,
    webOsActive: newTier === 'WEB_OS',
  };
  saveTierStore(GUILD_TIERS);
  return getGuildTierStatus(guildId);
}

/**
 * Builds the "🚫 UNLICENSED SERVER CLONE DETECTED" Embed when someone copies a Discord Template
 * and invites HERMES without purchasing a 1-Click Server License
 */
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
          `👉 **To activate this Server ID (\`${guildId}\`) and auto-build all 28+ interactive consoles + \`🟢 Common Hermes\`, open an Onboarding Ticket below!**`,
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
            style: 3, // SUCCESS
            label: '🟢 Activate 1-Click Server License ($39)',
            custom_id: 'hermes_ticket_onboard',
          },
          {
            type: 2,
            style: 1, // PRIMARY
            label: '🟠 Activate + Legendary Hermes (+$15 / 24h)',
            custom_id: 'hermes_upgrade_legendary_btn',
          },
        ],
      },
    ],
  };
}

/**
 * Builds the "🟢 COMMON HERMES // FEATURE LOCKED" Teaser Embed when a user on a
 * Common Hermes server clicks a Legendary feature (creating instant FOMO!)
 */
export function buildCommonLockoutPayload({
  guildId,
  featureName = 'Legendary Command',
  teaserText = 'This advanced automation module is locked on **🟢 Common Hermes**.',
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
          `### 🟠 UPGRADE TO LEGENDARY HERMES (ONE-TIME BOT UNLOCK)\n` +
          `${priceTag}\n\n` +
          `**What 🟠 Legendary Hermes Unlocks Forever in Discord (\`$0/mo\` recurring):**\n` +
          `• ✅ **1-Tap & Chat Title Queue** (\`justice\`, \`duke\`, \`scientist\`, \`architect\` zero-grid triggers)\n` +
          `• ✅ **17-Language Flag Emoji Reaction Translator** (unlimited across all channels)\n` +
          `• ✅ **Saturday 10/10 Midterm Early Packet & 15s Final Exam Speed Drill**\n` +
          `• ✅ **📸 Local Optics Screenshot OCR** (instant Resource & Speedup Bag math)\n` +
          `• ✅ **💀 AI Governor Telemetry Roaster & Auto-Injected AEGIS Ticket Scores**\n` +
          `• ✅ **Full 95 Sovereign Field Dossiers & 141 Commander Skill/Talent Trees**\n` +
          `• ✅ **🎯 R4 Zero-List Shield Drop Tracker & 🎙️ Voice War-Room Rollcall**`,
        color: 0x22c55e, // RoK Common Green!
        footer: {
          text: '🟢 COMMON HERMES -> 🟠 LEGENDARY HERMES // ALL PRICES SUBJECT TO CHANGE',
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
            style: 3, // SUCCESS
            label: status.isWithin24h
              ? '🟠 Claim 24h Legendary Upgrade (+$15 One-Time)'
              : '🟠 Upgrade to Legendary Hermes (+$25 One-Time)',
            custom_id: 'hermes_upgrade_legendary_btn',
          },
        ],
      },
    ],
  };
}

/**
 * Builds the Master Pricing & 24h / 72h FOMO Comparison Embed for #🪽-1-click-kingdom-discord
 */
export function buildTierPricingConsoleEmbed(guildId) {
  const status = getGuildTierStatus(guildId);
  const sandboxBanner = status.billingSuspended
    ? `> 🧪 **SANDBOX & MODERATOR TRAINING MODE ACTIVE (\`ALL FEES CURRENTLY SUSPENDED — $0.00\`)**\n` +
      `> *All 1-Click Server Deployments (\`🏰 Kingdom\`, \`🕊️ KvK Diplo\`, \`⚔️ Coalition War\`) and \`🟠 Legendary Hermes\` commands are currently **100% unlocked for free** while our Sovereign & Moderator team stress-tests the platform! Use \`/hermes tier\` or the Preview button below to test the upcoming commercial gates.*\n\n`
    : '';

  return {
    embeds: [
      {
        title: '🪽 VALHEON 1-CLICK DISCORD ARCHITECT // KINGDOM, DIPLO & COALITION LINEUP',
        description:
          sandboxBanner +
          'Deploy a complete, battle-ready **Home Kingdom War Server**, **8-Kingdom KvK Diplomacy Server**, or **Spy-Proof Allied Coalition War Server** in **18 seconds** — protected by **Cryptographic Guild-ID Clone Lock** and our **🛟 Lifetime Free Repair Guarantee**:\n\n' +
          '--- \n' +
          '### 🏰 1. 1-CLICK HOME KINGDOM WAR SERVER — **`$39` Common / `+$15` Legendary (24h Offer)**\n' +
          '*One-and-done server build bound to 1 Discord Server ID (`guildId`). Stay in Discord with zero monthly fees.*\n' +
          '• 🟢 **Includes `Common Hermes` (`$39` Flat):** 21 Roles, 30+ Channels, R4 Ticket Desk, 30v30 AoO Lane Builder, War Timers, Official RoK Bridge & Combat/Event Ping Console.\n' +
          '• 🟠 **24-Hour "Writer of History" `Legendary Hermes` Upgrade (`+$15` in 24h = `$54` total / `+$25` after):** Unlocks **Zero-Grid 1-Tap & Chat Title Queue (`justice`/`duke`/`scientist`/`architect`)**, **Unlimited 17-Language Flag Translator (`lc_*.dat`)**, **17-Language Peerless Scholar + Saturday 10/10 Midterm Packet**, **Local Screenshot OCR**, **Silent 24h UTC Uptime Heatmap**, **Zero-List** & **All 95 Field Guides** forever (`$0/mo` recurring)!\n\n' +
          '--- \n' +
          '### 🕊️ 2. 1-CLICK KVK DIPLOMACY SUMMIT SERVER — **`$9` Flat**\n' +
          '*Built for Matchmaking Night across all **8–16 Matched Kingdoms**.*\n' +
          '• `@Crowned King` + `@Accredited Diplomat` + `@Camp Fire/Water/Earth/Wind` + Dynamic `@KD #1–8` Roles\n' +
          '• **Private Kings-Only Conclave** + **1-Click 1v1 Bilateral Embassy Ticket Maker** (cut secret side deals between 2 Kingdoms!) + **17-Language Flag Translator**\n\n' +
          '--- \n' +
          '### ⚔️ 3. 1-CLICK ALLIED COALITION WAR SERVER — **`$9` Flat**\n' +
          '*100% Spy-Proof Allied Camp War Server for your **2–4 Allied Kingdoms** once teams lock.*\n' +
          '• **Joint Multi-Kingdom Rally & Garrison Calls** (with 17-Language Canonical Commander/Gear Glossary Bridge)\n' +
          '• **Live UTC-to-Local Pass/Ziggurat Timers**, **Voice War-Room Rollcall (`/rollcall`)** & **24h UTC Shift-Handoff Uptime**\n\n' +
          '--- \n' +
          '### 🔥 72-HOUR KVK DIPLO + COALITION BUNDLE — **`$15` FOR BOTH (Save `$3`!)**\n' +
          `• Buy **both** the **🕊️ \`$9\` KvK Diplomacy Server** AND your Camp's private **⚔️ \`$9\` Allied Coalition War Server** within **72 hours** for just **\`$15\` total**! *(72h Bundle Window Preview: <t:${status.kvkBundleExpiresUnix}:R>)*\n` +
          '• 🛟 **Lifetime Free Repair & Central Valheon HQ Support Relay:** Rename channels and customize wordings freely! Every server includes `#🛟-valheon-support-and-relaunch` with **1-Click Free Channel Repair (`$0.00` — never pay again!)** and direct ticket relay back to **Valheon Citadel HQ**.\n\n' +
          `> ⏱️ **Active Mode:** **\`${
            status.billingSuspended && !status.simulationOverride
              ? 'SANDBOX FREE (🟠 LEGENDARY UNLOCKED)'
              : status.effectiveTier
          }\`** • 24h \`+$15\` Legendary Window: <t:${status.offerExpiresUnix}:R> • 72h \`$15\` KvK Bundle Window: <t:${status.kvkBundleExpiresUnix}:R>`,
        color: status.billingSuspended ? 0x10b981 : 0xf59e0b,
        footer: {
          text: 'VALHEON COMMERCIAL OS // CLOSED-LOOP TROJAN HORSE FLYWHEEL + FREE LIFETIME REPAIR GUARANTEE',
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
            style: 3, // SUCCESS
            label: '🏰 1-Click Kingdom Server ($39)',
            custom_id: 'hermes_deploy_kingdom_btn',
          },
          {
            type: 2,
            style: 1, // PRIMARY
            label: '🕊️ 1-Click KvK Diplo ($9)',
            custom_id: 'hermes_deploy_diplo_btn',
          },
          {
            type: 2,
            style: 1, // PRIMARY
            label: '⚔️ 1-Click Coalition War ($9)',
            custom_id: 'hermes_deploy_coalition_btn',
          },
          {
            type: 2,
            style: 4, // DANGER
            label: '🔥 72h Diplo + Coalition Bundle ($15)',
            custom_id: 'hermes_deploy_kvk_bundle_btn',
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1, // PRIMARY
            label: '🟠 Upgrade: Legendary (+$15 / 24h)',
            custom_id: 'hermes_upgrade_legendary_btn',
          },
          {
            type: 2,
            style: 2, // SECONDARY
            label: '🔒 Preview Common / Clone Lockout',
            custom_id: 'hermes_demo_common_lockout',
          },
        ],
      },
    ],
  };
}
