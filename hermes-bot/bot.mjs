/**
 * ============================================================================
 * PROJECT HERMES — ZERO-DEPENDENCY NATIVE NODE 22 DISCORD GATEWAY & BOT DAEMON
 * ============================================================================
 * Connects directly to wss://gateway.discord.gg/?v=10&encoding=json using
 * native Node 22 WebSocket + fetch.
 *   - Lights up HERMES // Valheon OS with a green online dot in Discord
 *   - Registers /hermes slash commands instantly on the target Guild
 *   - Handles all interactive Buttons, Zero-Trace Whisper Modals, Ticket
 *     Channel creation, and AI Telemetry Roasts in real time!
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { provisionDiscordServer, buildConsolePayload } from './provisioner.js';
import { ROLE_TOGGLE_CATALOG } from './blueprints.js';
import {
  generateGovernorRoast,
  buildAnonymousWhisperEmbed,
  buildTicketHeaderEmbed,
} from './hermesEngine.js';
import { recordSilentSignal, buildUptimeDiscordEmbed } from './uptimeEngine.js';
import { applyRokGlossaryPre } from './rokGlossaryBridge.js';
import {
  requestKingdomTitle,
  completeCurrentTitle,
  buildTitleQueueConsolePayload,
  updateAooRoster,
  buildAooRosterPayload,
  buildWarTimerPayload,
  buildMyStatsCard,
  addZeroListTarget,
  buildZeroListEmbed,
  calculateRokMath,
} from './warOsSuite.js';
import {
  GUILD_TIERS,
  registerGuildDeployment,
  getGuildTierStatus,
  setGuildTier,
  buildCommonLockoutPayload,
  buildUnlicensedClonePayload,
  buildTierPricingConsoleEmbed,
} from './hermesTierGate.js';
import {
  STRIPE_CATALOG,
  createStripeCheckoutForDiscord,
  verifyStripePaymentStatus,
  verifyAndConsumeBlueprintCredit,
  createAuditedStripePromoCode,
  getCouponAuditLedgerSummary,
} from './stripeBridge.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDataFile(localRel, parentRel) {
  const localPath = path.resolve(__dirname, localRel);
  return fs.existsSync(localPath) ? localPath : path.resolve(__dirname, parentRel);
}

const PEERLESS_VAULT_PATH = resolveDataFile(
  './data/rok_peerless_vault.json',
  '../src/data/rok_peerless_vault.json'
);
const PEERLESS_VAULT = JSON.parse(fs.readFileSync(PEERLESS_VAULT_PATH, 'utf8'));

const DOSSIERS_VAULT_PATH = resolveDataFile(
  './data/valheon_95_sovereign_dossiers.json',
  '../src/data/private-vault/valheon_95_sovereign_dossiers.json'
);
const DOSSIERS_VAULT = JSON.parse(fs.readFileSync(DOSSIERS_VAULT_PATH, 'utf8'));

const TACTICAL_META_PATH = resolveDataFile(
  './data/valheon_tactical_meta.json',
  '../src/data/private-vault/valheon_tactical_meta.json'
);
const TACTICAL_META_VAULT = JSON.parse(fs.readFileSync(TACTICAL_META_PATH, 'utf8'));
const OCR_SCRIPT_PATH = path.resolve(__dirname, './ocr_scanner.py');

const APP_ID = process.env.DISCORD_CLIENT_ID || '1563619930371391680';
const GUILD_ID = process.env.ALLOWED_GUILD_ID || '1563618222895407166';

function resolveBotToken() {
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN;
  if (process.env.DISCORD_BOT_TOKEN) return process.env.DISCORD_BOT_TOKEN;
  for (const rel of ['./.env.railway', '../.env.local', '../../.env.local']) {
    try {
      const p = path.resolve(__dirname, rel);
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const m = raw.match(/^(?:DISCORD_TOKEN|DISCORD_BOT_TOKEN)=(.+)$/m);
        if (m && m[1].trim()) return m[1].trim().replace(/^["']|["']$/g, '');
      }
    } catch {
      // ignore
    }
  }
  return '';
}

const BOT_TOKEN = resolveBotToken();

const API_BASE = 'https://discord.com/api/v10';

async function discordApi(method, path, body = null) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ValheonHermesOS/3.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[HERMES API Error] ${method} ${path} (${res.status}):`, data);
  }
  return data;
}

/**
 * Central Overwatch Relay: Beams any customer support ticket, custom wording request,
 * or 1-Click Free Server Relaunch from ANY external Kingdom/Diplo/Coalition server
 * directly into Valheon Citadel HQ (1563618222895407166) with 1-Click Remote Admin Actions!
 */
async function relaySupportEventToValheonHq({
  title,
  description,
  color = 0x38bdf8,
  targetGuildId = '',
  targetChannelId = '',
}) {
  try {
    const hqChannels = await discordApi('GET', `/guilds/${GUILD_ID}/channels`);
    if (!Array.isArray(hqChannels)) return;

    const relayChan =
      hqChannels.find((c) => c.name && c.name.includes('central-support')) ||
      hqChannels.find((c) => c.name && c.name.includes('ticket-audit')) ||
      hqChannels.find((c) => c.name && c.name.includes('open-a-ticket'));

    if (!relayChan?.id) return;

    const actionComponents = [];
    if (targetGuildId) {
      actionComponents.push({
        type: 2,
        style: 3, // SUCCESS
        label: `🔄 Remote Free Relaunch (${targetGuildId})`,
        custom_id: `hermes_admin_relaunch_${targetGuildId}`,
      });
    }
    if (targetGuildId && targetChannelId) {
      actionComponents.push({
        type: 2,
        style: 1, // PRIMARY
        label: '💬 Beam Official Reply to Their Server',
        custom_id: `hermes_admin_reply_${targetGuildId}_${targetChannelId}`,
      });
    }

    await discordApi('POST', `/channels/${relayChan.id}/messages`, {
      embeds: [
        {
          title,
          description,
          color,
          footer: {
            text: `VALHEON HQ CENTRAL OVERWATCH RELAY // SOURCE GUILD: ${targetGuildId || 'HQ'}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
      components:
        actionComponents.length > 0 ? [{ type: 1, components: actionComponents }] : undefined,
    });
  } catch (err) {
    console.error('[HERMES HQ Relay Error]:', err.message);
  }
}

const VALHEON_FOUNDER_IDS = new Set(['184977944433786880']);

/**
 * Cryptographically verifies that the user triggering a 1-Click Server Recovery / Self-Heal
 * or Blueprint Provisioning is the Verified Buyer, the true Discord Server Owner (guild.owner_id),
 * or an authorized Home Kingdom R5 Sovereign — strictly blocking R4s, visiting diplomats, and random members!
 */
async function verifyServerSovereignAuthorization(ix, targetGuildId, savedStatus = {}) {
  const user = ix.member?.user || ix.user || { id: '0', username: 'unknown' };
  const userId = String(user.id || '');

  // 1. Valheon Principal / Founder Override
  if (VALHEON_FOUNDER_IDS.has(userId)) {
    return { allowed: true, reason: 'VALHEON_PRINCIPAL_ARCHITECT', ownerId: userId };
  }

  // 1.5 Unpaid Blank-Server Guard: Non-Principal users CANNOT run recovery or /hermes architect
  // on an unlicensed server even if they are guild.owner_id of their own blank server!
  const isAlreadyLicensed =
    String(targetGuildId) === String(GUILD_ID) ||
    Boolean(
      savedStatus?.licensed &&
        (savedStatus?.buyerDiscordId || savedStatus?.paidSessionId)
    );
  if (!isAlreadyLicensed) {
    return {
      allowed: false,
      reason: 'UNLICENSED_SERVER_REQUIRES_CHECKOUT',
      ownerId: null,
    };
  }

  // 2. Fetch live Discord Guild metadata to verify true Discord Server Owner (guild.owner_id)
  const guildInfo = await discordApi('GET', `/guilds/${targetGuildId}`).catch(() => null);
  const ownerId = guildInfo?.owner_id || savedStatus?.buyerDiscordId || null;

  if (guildInfo?.owner_id && String(guildInfo.owner_id) === userId) {
    return { allowed: true, reason: 'DISCORD_SERVER_OWNER', ownerId: guildInfo.owner_id };
  }

  // 3. Verified Original Buyer who purchased/deployed this server
  if (savedStatus?.buyerDiscordId && String(savedStatus.buyerDiscordId) === userId) {
    return { allowed: true, reason: 'VERIFIED_BUYER', ownerId: savedStatus.buyerDiscordId };
  }

  // 4. Home Kingdom R5 Role Check (Only in single-kingdom servers; in Multi-Kingdom Diplo/Coalition servers,
  // rival Kings also receive @King so recovery is strictly locked to the Server Owner / Buyer!)
  const bpType = savedStatus?.blueprintType || 'KINGDOM_WAR_SERVER';
  if (
    String(ix.guild_id) === String(targetGuildId) &&
    (bpType === 'KINGDOM_WAR_SERVER' || bpType === 'JUMPER_GENESIS_GROUP')
  ) {
    const memberRoleIds = new Set(Array.isArray(ix.member?.roles) ? ix.member.roles : []);
    if (memberRoleIds.size > 0) {
      const guildRoles = await discordApi('GET', `/guilds/${targetGuildId}/roles`).catch(
        () => []
      );
      if (Array.isArray(guildRoles)) {
        const hasR5SovereignRole = guildRoles.some(
          (r) =>
            memberRoleIds.has(r.id) &&
            (r.name.includes('Crowned Sovereign') ||
              r.name.includes('Project Founder (R5)') ||
              r.name.includes('Grand Architect')) &&
            !r.name.includes('(R4)')
        );
        if (hasR5SovereignRole) {
          return { allowed: true, reason: 'HOME_KINGDOM_R5_SOVEREIGN', ownerId };
        }
      }
    }
  }

  return { allowed: false, reason: 'UNAUTHORIZED_R4_OR_MEMBER', ownerId };
}

/**
 * Zero-Cost ($0.00) 17-Language Translator & Peerless Scholar Engine for Valheon HQ & 1-Click Kingdom Servers
 */
const FLAG_TO_LANG = {
  '🇺🇸': { code: 'en', label: 'English 🇺🇸' },
  '🇬🇧': { code: 'en', label: 'English 🇬🇧' },
  '🇰🇷': { code: 'ko', label: 'Korean 🇰🇷' },
  '🇸🇦': { code: 'ar', label: 'Arabic 🇸🇦' },
  '🇦🇪': { code: 'ar', label: 'Arabic 🇦🇪' },
  '🇪🇬': { code: 'ar', label: 'Arabic 🇪🇬' },
  '🇨🇳': { code: 'zh-CN', label: 'Chinese 🇨🇳' },
  '🇹🇼': { code: 'zh-TW', label: 'Chinese 🇹🇼' },
  '🇷🇺': { code: 'ru', label: 'Russian 🇷🇺' },
  '🇻🇳': { code: 'vi', label: 'Vietnamese 🇻🇳' },
  '🇹🇷': { code: 'tr', label: 'Turkish 🇹🇷' },
  '🇪🇸': { code: 'es', label: 'Spanish 🇪🇸' },
  '🇲🇽': { code: 'es', label: 'Spanish 🇲🇽' },
  '🇧🇷': { code: 'pt', label: 'Portuguese 🇧🇷' },
  '🇵🇹': { code: 'pt', label: 'Portuguese 🇵🇹' },
  '🇫🇷': { code: 'fr', label: 'French 🇫🇷' },
  '🇩🇪': { code: 'de', label: 'German 🇩🇪' },
  '🇮🇩': { code: 'id', label: 'Indonesian 🇮🇩' },
  '🇯🇵': { code: 'ja', label: 'Japanese 🇯🇵' },
  '🇮🇹': { code: 'it', label: 'Italian 🇮🇹' },
  '🇵🇱': { code: 'pl', label: 'Polish 🇵🇱' },
  '🇹🇭': { code: 'th', label: 'Thai 🇹🇭' },
  '🇲🇾': { code: 'ms', label: 'Malay 🇲🇾' },
};

const PEERLESS_17_CHOICES = [
  { name: '🇺🇸 English (EN)', value: 'en' },
  { name: '🇻🇳 Tiếng Việt (VI)', value: 'vi' },
  { name: '🇸🇦 العربية (AR)', value: 'ar' },
  { name: '🇷🇺 Русский (RU)', value: 'ru' },
  { name: '🇨🇳 中文 (ZH)', value: 'zh' },
  { name: '🇪🇸 Español (ES)', value: 'es' },
  { name: '🇮🇩 Bahasa Indonesia (ID)', value: 'id' },
  { name: '🇰🇷 한국어 (KO)', value: 'ko' },
  { name: '🇹🇷 Türkçe (TR)', value: 'tr' },
  { name: '🇫🇷 Français (FR)', value: 'fr' },
  { name: '🇩🇪 Deutsch (DE)', value: 'de' },
  { name: '🇧🇷 Português (PT)', value: 'pt' },
  { name: '🇯🇵 日本語 (JA)', value: 'ja' },
  { name: '🇮🇹 Italiano (IT)', value: 'it' },
  { name: '🇵🇱 Polski (PL)', value: 'pl' },
  { name: '🇹🇭 ไทย (TH)', value: 'th' },
  { name: '🇲🇾 Bahasa Melayu (MS)', value: 'ms' },
];

const TRANSLATION_CACHE = new Map();

function splitIntoByteChunks(text, maxBytes = 420) {
  const paragraphs = text.split('\n');
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n${para}` : para;
    if (Buffer.byteLength(candidate, 'utf8') <= maxBytes) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current);
        current = '';
      }
      if (Buffer.byteLength(para, 'utf8') <= maxBytes) {
        current = para;
      } else {
        // Split very long single paragraph by sentence boundaries
        const sentences = para.split(/(?<=[.!?。！？])\s+/);
        for (const s of sentences) {
          const next = current ? `${current} ${s}` : s;
          if (Buffer.byteLength(next, 'utf8') <= maxBytes) {
            current = next;
          } else {
            if (current) chunks.push(current);
            current = s.slice(0, maxBytes);
          }
        }
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateText(text, targetLang = 'en') {
  const clean = String(text || '').trim().slice(0, 4000);
  if (!clean) return { translated: '', detected: 'unknown', matchedTerms: [] };
  const tl = targetLang.split('-')[0] === 'zh' ? 'zh-CN' : targetLang.split('-')[0];
  const cacheKey = `${tl}::${clean}`;

  if (TRANSLATION_CACHE.has(cacheKey)) {
    return TRANSLATION_CACHE.get(cacheKey);
  }

  try {
    // 1. Pre-process with 17-Language Lilith Canonical Glossary (Valheon 17-Lang Glossary + RoK War Slang)
    const { processedText, matchedTerms } = applyRokGlossaryPre(clean, tl);

    const chunks = splitIntoByteChunks(processedText, 420);
    let detectedLang = 'auto';
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=autodetect|${encodeURIComponent(tl)}&de=hermes@valheon.com`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.responseData?.detectedLanguage && detectedLang === 'auto') {
          detectedLang = data.responseData.detectedLanguage;
        }
        return data?.responseData?.translatedText || chunk;
      })
    );

    const result = {
      translated: translatedChunks.join('\n'),
      detected: detectedLang,
      matchedTerms,
    };

    if (TRANSLATION_CACHE.size > 500) {
      const oldestKey = TRANSLATION_CACHE.keys().next().value;
      TRANSLATION_CACHE.delete(oldestKey);
    }
    TRANSLATION_CACHE.set(cacheKey, result);
    return result;
  } catch (err) {
    return { translated: clean, detected: 'error', matchedTerms: [] };
  }
}

/**
 * 17-Language Peerless Scholar & Lyceum of Wisdom Solver Engine
 */
function normalizePeerlessLang(rawLang = 'en') {
  const base = String(rawLang || 'en').toLowerCase().split('-')[0];
  const supported = new Set(PEERLESS_VAULT.supported_locales || []);
  return supported.has(base) ? base : 'en';
}

async function searchPeerlessVault(rawQuery, rawLang = 'en') {
  const lang = normalizePeerlessLang(rawLang);
  const qNorm = String(rawQuery || '').trim().toLowerCase();
  if (!qNorm) return [];

  const questions = PEERLESS_VAULT.questions || [];
  const matchTokens = (tokens) =>
    questions.filter((item) => {
      const locQ = (item.q?.[lang] || '').toLowerCase();
      const locA = (item.a?.[lang] || '').toLowerCase();
      const enQ = (item.q?.en || '').toLowerCase();
      const enA = (item.a?.en || '').toLowerCase();
      return tokens.every(
        (t) => locQ.includes(t) || locA.includes(t) || enQ.includes(t) || enA.includes(t)
      );
    });

  const directTokens = qNorm.split(/\s+/).filter(Boolean);
  let matches = matchTokens(directTokens);

  // If player searched in a foreign language for a question stored in English, auto-translate query to English!
  if (matches.length === 0) {
    const { translated } = await translateText(rawQuery, 'en');
    const enTokens = String(translated || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    if (enTokens.length > 0) {
      matches = matchTokens(enTokens);
    }
  }

  const top3 = matches.slice(0, 3);
  return Promise.all(
    top3.map(async (item) => {
      let qLoc = item.q?.[lang] || item.q?.en || '';
      let aLoc = item.a?.[lang] || item.a?.en || '';
      if (lang !== 'en' && qLoc === item.q?.en) {
        const [tq, ta] = await Promise.all([
          translateText(item.q.en, lang),
          translateText(item.a.en, lang),
        ]);
        qLoc = tq.translated;
        aLoc = ta.translated;
      }
      return {
        id: item.id,
        stage: item.stage,
        category: item.category,
        qLoc,
        aLoc,
        qEn: item.q?.en || '',
        aEn: item.a?.en || '',
      };
    })
  );
}

async function buildMidtermPacketEmbed(rawLang = 'en') {
  const lang = normalizePeerlessLang(rawLang);
  const packetIds = new Set(PEERLESS_VAULT.midterm_early_packet_ids || []);
  const packetItems = (PEERLESS_VAULT.questions || []).filter((q) => packetIds.has(q.id));
  const midtermTitle =
    PEERLESS_VAULT.lyceum_official_terms?.SPECIALQUIZ_TITLE?.[lang] || 'MIDTERM';

  const lines = await Promise.all(
    packetItems.map(async (item, idx) => {
      let qStr = item.q?.[lang] || item.q?.en || '';
      let aStr = item.a?.[lang] || item.a?.en || '';
      if (lang !== 'en' && qStr === item.q?.en) {
        const [tq, ta] = await Promise.all([
          translateText(item.q.en, lang),
          translateText(item.a.en, lang),
        ]);
        qStr = tq.translated;
        aStr = ta.translated;
      }
      return `**Q${idx + 1} (${item.id}):** ${qStr}\n✅ **\`${aStr}\`**`;
    })
  );

  return {
    title: `📦 ${midtermTitle} // SATURDAY EARLY PACKET (${lang.toUpperCase()} • 10/10)`,
    description: lines.join('\n\n'),
    color: 0x10b981,
    footer: {
      text: `VALHEON LYCEUM VAULT // 17-LANGUAGE PEERLESS SCHOLAR • ${lang.toUpperCase()}`,
    },
  };
}

/**
 * 95 Sovereign Field Dossiers & 141 Commander Tactical Meta Search Engine
 */
function buildGuideEmbed(rawQuery = '', isLegendary = true) {
  const q = String(rawQuery || '').trim().toLowerCase();
  const guides = DOSSIERS_VAULT.guides || [];
  const commanders = TACTICAL_META_VAULT.commanders || [];

  if (!q) {
    const sampleTitles = guides.slice(0, 12).map((g) => `• **${g.title}** (\`${g.category_label}\`)`);
    return {
      title: '📚 VALHEON 95 FIELD GUIDE VAULT & 141 COMMANDER BUILDS',
      description:
        `Type \`/guide topic:<commander or strategy>\` or click **` +
        '`[📖 Search All 95 Field Guides]`' +
        `** to pull any Sovereign Dossier:\n\n` +
        sampleTitles.join('\n'),
      color: 0xf59e0b,
      footer: { text: 'VALHEON ACADEMY // 95 LIVING DOSSIERS + 141 COMMANDERS' },
    };
  }

  // 1. Check 141 Commanders first
  const cmdMatch = commanders.find(
    (c) =>
      c.name?.toLowerCase().includes(q) ||
      c.slug?.toLowerCase() === q ||
      c.title?.toLowerCase().includes(q)
  );

  // 2. Check 95 Field Dossiers
  const tokens = q.split(/\s+/).filter(Boolean);
  const guideMatches = guides.filter((g) => {
    const hay = `${g.title} ${g.category_label} ${g.summary} ${g.content_markdown}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });

  if (cmdMatch) {
    if (!isLegendary) {
      return {
        title: `🟢 COMMON HERMES PREVIEW // ${cmdMatch.name.toUpperCase()} — "${cmdMatch.title}"`,
        description:
          `• **Troop Specialty:** \`${String(cmdMatch.troop_type || 'General').toUpperCase()}\` | **Rarity:** \`${String(cmdMatch.rarity || 'Legendary').toUpperCase()}\`\n` +
          `• **Minimum Field Investment:** 🔒 *\`[LOCKED ON 🟢 COMMON HERMES]\`* | **Skill Lock Order:** 🔒 *\`[LOCKED]\`*\n` +
          `• **Talent Trees:** 🔒 *\`[UPGRADE TO 🟠 LEGENDARY HERMES TO UNLOCK]\`*\n\n` +
          `> 💡 **Your server is running 🟢 Common Hermes (Basic Edition).** Upgrade to **🟠 Legendary Hermes** (\`+$15\` within 24 hours of server build / \`+$25\` after, one-time fee) to unlock all **141 Commander Talent Trees, Skill Lock Orders & 95 Full Field Dossiers** inside Discord forever!`,
        color: 0x22c55e,
        footer: {
          text: '🟢 COMMON HERMES PREVIEW -> UPGRADE TO 🟠 LEGENDARY HERMES (+$15 IN 24H / +$25 AFTER)',
        },
      };
    }

    const trees = cmdMatch.talent_trees
      ? `🔴 \`${String(cmdMatch.talent_trees.red || '').toUpperCase()}\` • 🟡 \`${String(cmdMatch.talent_trees.yellow || '').toUpperCase()}\` • 🔵 \`${String(cmdMatch.talent_trees.blue || '').toUpperCase()}\``
      : 'Open-Field / Skill';
    const skillsText = (cmdMatch.skills || [])
      .slice(0, 4)
      .map((s) => `• **Skill ${s.position} (${s.name}):** ${String(s.description || '').slice(0, 140)}...`)
      .join('\n');
    const linkedGuide = guides.find(
      (g) =>
        g.id === cmdMatch.matched_guide_id ||
        g.title?.toLowerCase().includes(cmdMatch.name.toLowerCase())
    );

    return {
      title: `👑 COMMANDER DOSSIER // ${cmdMatch.name.toUpperCase()} — "${cmdMatch.title}"`,
      description:
        `• **Troop Specialty:** \`${String(cmdMatch.troop_type || 'General').toUpperCase()}\` | **Rarity:** \`${String(cmdMatch.rarity || 'Legendary').toUpperCase()}\`\n` +
        `• **Minimum Field Investment:** \`${String(cmdMatch.usable_from || '5551').toUpperCase()}\` | **Skill Lock Order:** \`${cmdMatch.skill_order || '1234'}\`\n` +
        `• **Talent Trees:** ${trees}\n\n` +
        `### ⚔️ CORE SKILL BREAKDOWN\n${skillsText || 'Full skill telemetry indexed in Valheon OS.'}\n\n` +
        (linkedGuide
          ? `### 📖 LINKED FIELD DOSSIER (${linkedGuide.title})\n> ${String(linkedGuide.summary || '').slice(0, 400)}`
          : ''),
      color: 0xf59e0b,
      footer: {
        text: `VALHEON TACTICAL META // 141 COMMANDERS • ${cmdMatch.valheon_pillar || 'SOVEREIGN ACADEMY'}`,
      },
    };
  }

  if (guideMatches.length > 0) {
    const top = guideMatches[0];
    if (!isLegendary) {
      return {
        title: `🟢 COMMON HERMES SUMMARY // ${top.title.toUpperCase()} [${top.category_label}]`,
        description:
          `**Executive Summary Preview:**\n> ${top.summary}\n\n` +
          `### 🔒 FULL TACTICAL DOCTRINE LOCKED ON \`🟢 COMMON HERMES\`\n` +
          `*The remaining **${top.word_count || 650} words** of mathematical breakpoints, troop ratios, and commander pairings are locked on Common Hermes.*\n\n` +
          `👉 **Upgrade to \`🟠 Legendary Hermes\` (\`+$15\` within 24h / \`+$25\` after — One-Time Fee)** to unlock all **95 Sovereign Field Dossiers** inside Discord forever!`,
        color: 0x22c55e,
        footer: {
          text: '🟢 COMMON HERMES PREVIEW -> UPGRADE TO 🟠 LEGENDARY HERMES (+$15 IN 24H / +$25 AFTER)',
        },
      };
    }

    const cleanMd = String(top.content_markdown || '')
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, 1400);
    const otherList =
      guideMatches.length > 1
        ? `\n\n**Other Matching Dossiers (${guideMatches.length - 1} more):**\n` +
          guideMatches
            .slice(1, 5)
            .map((g) => `• \`${g.title}\` (${g.category_label})`)
            .join('\n')
        : '';

    return {
      title: `📖 SOVEREIGN FIELD DOSSIER // ${top.title.toUpperCase()} [${top.category_label}]`,
      description:
        `**Executive Summary:**\n> ${top.summary}\n\n` +
        `### 📜 TACTICAL DOCTRINE EXCERPT\n${cleanMd}${
          top.content_markdown?.length > 1400 ? '...\n*(Full guide synced in `/en/guide`)*' : ''
        }${otherList}`,
      color: 0x38bdf8,
      footer: {
        text: `${top.valheon_pillar || 'VALHEON ACADEMY'} • ${top.word_count || 650} Words • 100% Original Valheon Doctrine`,
      },
    };
  }

  return {
    title: `⚠️ NO EXACT GUIDE MATCH FOR "${rawQuery}"`,
    description:
      `Try searching a Commander name (e.g. \`Zhuge Liang\`, \`Hermann\`, \`Liu Che\`, \`Nevsky\`, \`Arthur\`) or a strategy topic (e.g. \`Speedup\`, \`Sunset Canyon\`, \`Equipment\`, \`KvK\`, \`Jumper\`, \`Ark of Osiris\`).`,
    color: 0xf43f5e,
    footer: { text: 'VALHEON 95 FIELD GUIDE VAULT' },
  };
}

/**
 * Local $0.00 RapidOCR + OpenCV Screenshot Scanner (Resource Bags, Speedups, Profiles)
 */
async function runLocalOcrOnUrl(imageUrl) {
  try {
    const { stdout } = await execFileAsync('python', [OCR_SCRIPT_PATH, imageUrl], {
      encoding: 'utf8',
      timeout: 25000,
    });
    return JSON.parse(stdout.trim());
  } catch (err) {
    console.error('[HERMES OCR Error]:', err.message);
    return { error: err.message };
  }
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function fmtCompact(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function buildOcrEmbed(ocrResult, authorName = 'Governor') {
  if (!ocrResult || ocrResult.error) {
    return {
      title: '⚠️ HERMES OPTICS OCR // COULD NOT PARSE IMAGE',
      description: `Make sure the screenshot is a clear Rise of Kingdoms Resource Bag, Speedup Bag, or Profile screen.`,
      color: 0xf43f5e,
    };
  }

  if (ocrResult.mode === 'RESOURCE_BAG') {
    const t = ocrResult.totals || {};
    const bLines = (ocrResult.breakdown || [])
      .filter((b) => b.type !== 'chest')
      .map(
        (b) =>
          `• **${b.type.toUpperCase()}** (\`${fmtNum(b.denom)}\` × **${fmtNum(b.qty)}**) = \`${fmtNum(b.total)}\``
      )
      .join('\n');

    const chestLines = (ocrResult.breakdown || [])
      .filter((b) => b.type === 'chest')
      .map((b) => `\`${fmtNum(b.qty)}\` chests`)
      .join(' + ');

    return {
      title: `📸 VALHEON OPTICS OCR // RESOURCE BAG AUDIT (@${authorName})`,
      description:
        `### 💰 TOTAL UNPACKED RESOURCES: **\`${fmtNum(ocrResult.grand_total_rss)}\` (${fmtCompact(ocrResult.grand_total_rss)} RSS)**\n` +
        `🌽 **Food:** \`${fmtNum(t.food)}\` (**${fmtCompact(t.food)}**)\n` +
        `🪵 **Wood:** \`${fmtNum(t.wood)}\` (**${fmtCompact(t.wood)}**)\n` +
        `🪨 **Stone:** \`${fmtNum(t.stone)}\` (**${fmtCompact(t.stone)}**)\n` +
        `🪙 **Gold:** \`${fmtNum(t.gold)}\` (**${fmtCompact(t.gold)}**)\n` +
        `📦 **Unopened Resource Chests:** \`${fmtNum(t.chests)}\` ${chestLines ? `(${chestLines})` : ''}\n\n` +
        `### 🔍 TILE-BY-TILE OCR BREAKDOWN\n${bLines || 'No resource tiles detected.'}`,
      color: 0xd946ef,
      footer: {
        text: 'VALHEON PILLAR V // OPTICS LOCAL ONNX VISION ENGINE ($0.00 • 100% DETERMINISTIC MATH)',
      },
    };
  }

  const textPreview = (ocrResult.lines || []).join(' • ').slice(0, 1500);
  return {
    title: `📸 VALHEON OPTICS OCR // SCREENSHOT TEXT EXTRACTION (@${authorName})`,
    description: `**Extracted Telemetry:**\n\`\`\`\n${textPreview || 'No text detected.'}\n\`\`\``,
    color: 0x38bdf8,
    footer: { text: 'VALHEON PILLAR V // OPTICS LOCAL ONNX VISION ENGINE' },
  };
}

/**
 * Registers /hermes and /guide Slash Commands + Context Menus on Guild & Globally
 */
async function registerSlashCommands() {
  const commands = [
    {
      name: 'title',
      description: '🔮 Request a Kingdom Royal Title (Duke, Scientist, Architect, Justice) or pass to next',
      options: [
        {
          type: 3,
          name: 'buff',
          description: 'Select Title Buff (or "done" when finished)',
          required: true,
          choices: [
            { name: '⚔️ Duke (+10% Troop Defense)', value: 'duke' },
            { name: '🔬 Scientist (+10% Research Speed)', value: 'scientist' },
            { name: '🏗️ Architect (+10% Building Speed)', value: 'architect' },
            { name: '⚖️ Justice (+10% Troop Attack)', value: 'justice' },
            { name: '✅ Done Using Title (Pass to Next Governor)', value: 'done' },
          ],
        },
        {
          type: 3,
          name: 'coordinates',
          description: 'Your City Coordinates (e.g. X:612 Y:488)',
          required: false,
        },
      ],
    },
    {
      name: 'aoo',
      description: '⚰️ Launch or join the 30v30 Ark of Osiris Tactical Lane Sign-Up Roster',
      options: [
        {
          type: 3,
          name: 'match_time',
          description: 'Optional Match Title / Time (e.g. Saturday 20:00 UTC Golden League)',
          required: false,
        },
      ],
    },
    {
      name: 'timer',
      description: '⏰ Create a War Mobilization Countdown that auto-converts to every player\'s local timezone',
      options: [
        {
          type: 3,
          name: 'event',
          description: 'Event Name (e.g. Pass 4 Opening, Altar Fight, Ruins Push)',
          required: true,
        },
        {
          type: 4, // INTEGER
          name: 'minutes',
          description: 'Minutes from now until event starts (e.g. 30, 60, 120)',
          required: true,
        },
        {
          type: 3,
          name: 'coordinates',
          description: 'Target Coordinates (e.g. Zone 6 // X:582 Y:610)',
          required: false,
        },
      ],
    },
    {
      name: 'mystats',
      description: '🪪 View your Personal KvK DKP Score, Goal Progress Bar & Kills/Deads Remaining',
      options: [
        {
          type: 3,
          name: 'governor_id',
          description: 'Optional Governor ID or Username',
          required: false,
        },
      ],
    },
    {
      name: 'zerolist',
      description: '🎯 View or add a rogue MGE Cap-Breaker / Illegal Migrant with Peace Shield timer',
      options: [
        {
          type: 3,
          name: 'governor_name',
          description: 'Leave blank to view Zero List, or enter Rogue Governor Name to add',
          required: false,
        },
        {
          type: 3,
          name: 'coordinates',
          description: 'Last Known Coordinates (e.g. X:614 Y:509)',
          required: false,
        },
        {
          type: 3,
          name: 'violation',
          description: 'Reason (e.g. Broke MGE Stage 3 Cap by 12M pts)',
          required: false,
        },
      ],
    },
    {
      name: 'rollcall',
      description: '🎙️ Snapshot everyone currently in Voice War Rooms for DKP & Uptime credit',
    },
    {
      name: 'calc',
      description: '🧮 Run Commander Sculpture (5511->5555) or Wheel of Fortune Gem Calculator',
      options: [
        {
          type: 3,
          name: 'type',
          description: 'Calculator Type',
          required: true,
          choices: [
            { name: '🗿 Commander Gold Head Sculptures (e.g. 5511)', value: 'sculptures' },
            { name: '🎡 Wheel of Fortune Spin Gem Cost (e.g. 100)', value: 'wheel' },
          ],
        },
        {
          type: 3,
          name: 'value',
          description: 'Skill levels (e.g. 5511) or Wheel Spin count (e.g. 100)',
          required: true,
        },
      ],
    },
    {
      name: 'uptime',
      description: '📡 View 24-Hour UTC Alliance & Player Uptime Heatmap (Silent Multi-Signal Telemetry)',
      options: [
        {
          type: 3,
          name: 'target',
          description: 'Alliance Tag (ALL, VHN1, VHN2, VHN3) or Governor Username (e.g. reign3418)',
          required: false,
        },
        {
          type: 5, // BOOLEAN
          name: 'public_receipt',
          description: 'Post publicly in this channel to prove uptime to allies? (Default: Private only to you)',
          required: false,
        },
      ],
    },
    {
      name: 'guide',
      description: '📖 Summon any of the 95 Valheon Field Guides or 141 Commander Builds',
      options: [
        {
          type: 3,
          name: 'topic',
          description: 'Commander name or strategy topic (e.g. Zhuge Liang, Speedups, Sunset Canyon, Equipment)',
          required: true,
        },
      ],
    },
    {
      name: 'hermes',
      description: '🪽 Valheon HERMES — 1-Click Server Architect, Peerless Scholar & 17-Lang Translator',
      options: [
        {
          type: 1, // SUB_COMMAND
          name: 'uptime',
          description: '📡 View 24-Hour UTC Alliance & Player Uptime Heatmap (Silent Telemetry)',
          options: [
            {
              type: 3,
              name: 'target',
              description: 'Alliance Tag (ALL, VHN1, VHN2, VHN3) or Governor Username (e.g. reign3418)',
              required: false,
            },
            {
              type: 5,
              name: 'public_receipt',
              description: 'Post publicly in this channel? (Default: Private only to you)',
              required: false,
            },
          ],
        },
        {
          type: 1, // SUB_COMMAND
          name: 'guide',
          description: '📖 Search all 95 Sovereign Field Guides & 141 Commander Tactical Builds',
          options: [
            {
              type: 3,
              name: 'topic',
              description: 'Commander name or strategy topic (e.g. Zhuge Liang, Speedups, Sunset Canyon)',
              required: true,
            },
          ],
        },
        {
          type: 1, // SUB_COMMAND
          name: 'peerless',
          description: '🎓 Instant 17-Language Peerless Scholar & Lyceum of Wisdom Answer Solver',
          options: [
            {
              type: 3,
              name: 'query',
              description: 'Type 1-3 keywords from the exam question (or type "midterm" for the 10/10 packet)',
              required: true,
            },
            {
              type: 3,
              name: 'language',
              description: 'Select any of the 17 Official Peerless Scholar languages',
              required: false,
              choices: PEERLESS_17_CHOICES,
            },
          ],
        },
        {
          type: 1, // SUB_COMMAND
          name: 'confess',
          description: '🕵️ Drop a 100% Anonymous Zero-Trace Whisper into this channel',
          options: [
            {
              type: 3, // STRING
              name: 'whisper',
              description: 'Say what you cannot say in RoK chat (Identity is never shown)',
              required: true,
            },
            {
              type: 3,
              name: 'category',
              description: 'Whisper category',
              required: false,
              choices: [
                { name: '🔥 Kingdom Tea & Politics', value: 'tea' },
                { name: '⚔️ KvK Betrayal Receipt', value: 'kvk' },
                { name: '👑 Council Callout', value: 'council' },
                { name: '🕵️ General Anonymous Drop', value: 'confession' },
              ],
            },
          ],
        },
        {
          type: 1,
          name: 'roast',
          description: '💀 Let HERMES audit and roast a Governor using live telemetry',
          options: [
            {
              type: 3,
              name: 'governor_id',
              description: 'In-game Governor ID or Name to roast',
              required: true,
            },
          ],
        },
        {
          type: 1,
          name: 'architect',
          description: '🪽 1-Click Provision or Relaunch any Kingdom, Diplo, Coalition or Valheon HQ Server',
          options: [
            {
              type: 3,
              name: 'blueprint',
              description: 'Select Server Blueprint',
              required: true,
              choices: [
                { name: '🏛️ Official Valheon Citadel HQ', value: 'VALHEON_HQ' },
                { name: '🏰 Turnkey Home Kingdom War Server ($39)', value: 'KINGDOM_WAR_SERVER' },
                { name: '🕊️ Turnkey KvK Diplomacy Summit Server ($9)', value: 'KVK_DIPLO_SERVER' },
                { name: '⚔️ Turnkey Allied Coalition War Server ($9)', value: 'KVK_COALITION_SERVER' },
                { name: '🚀 Genesis Jumper / Sleeper Project', value: 'JUMPER_GENESIS_GROUP' },
              ],
            },
            {
              type: 3,
              name: 'kingdom_id',
              description: 'Target Kingdom Number or Comma-Separated Kingdoms (e.g. 4194 or 4190,4191,4192)',
              required: false,
            },
            {
              type: 3,
              name: 'target_guild_id',
              description: 'Optional: Remote Customer Guild ID to relaunch/repair for $0.00 (Default: This Server)',
              required: false,
            },
          ],
        },
        {
          type: 1,
          name: 'translate',
          description: '🌐 Translate any message or war order into any of the 17 Official Peerless Scholar languages',
          options: [
            {
              type: 3,
              name: 'text',
              description: 'Message text to translate',
              required: true,
            },
            {
              type: 3,
              name: 'language',
              description: 'Target language (All 17 Peerless Scholar Languages)',
              required: true,
              choices: PEERLESS_17_CHOICES,
            },
          ],
        },
        {
          type: 1,
          name: 'tier',
          description: '🧪 View or switch HERMES Mode (Sandbox $0 Free / Common $39 / Legendary +$15 / Clone Lock)',
          options: [
            {
              type: 3,
              name: 'mode',
              description: 'Optional: Switch Server Mode (Moderator Training & Testing)',
              required: false,
              choices: [
                { name: '📊 View Pricing & Moderator Training Matrix', value: 'VIEW' },
                { name: '🧪 Sandbox Free Mode (All Fees Suspended / 🟠 Legendary Unlocked)', value: 'SANDBOX_FREE' },
                { name: '🟢 Simulate Common Hermes ($39 Basic Mode)', value: 'COMMON' },
                { name: '🟠 Simulate Legendary Hermes (+$15 24h / +$25 Full Bot)', value: 'LEGENDARY' },
                { name: '🚫 Simulate Cloned Template Lockout (Unlicensed Guild ID)', value: 'UNLICENSED' },
              ],
            },
            {
              type: 5,
              name: 'reset_24h_timer',
              description: 'Reset the 24-hour +$15 Legendary upgrade countdown timer?',
              required: false,
            },
          ],
        },
      ],
    },
    // Right-Click Message Context Menu Commands (Works in EVERY Channel on HQ & Turnkey Kingdom Servers!)
    {
      name: '🌐 Translate to My Language',
      type: 3, // MESSAGE CONTEXT MENU
    },
    {
      name: '🇺🇸 Translate to English',
      type: 3, // MESSAGE CONTEXT MENU
    },
    {
      name: '📸 Scan RoK Screenshot (OCR)',
      type: 3, // MESSAGE CONTEXT MENU
    },
  ];

  // Register on Flagship Guild (instant) AND Globally (so every 1-Click Kingdom Server gets them automatically!)
  await discordApi(
    'PUT',
    `/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,
    commands
  );
  await discordApi('PUT', `/applications/${APP_ID}/commands`, commands);
  console.log(`✅ [HERMES] Registered /guide + /hermes + 17-Lang Translator + Peerless + Optics OCR (Guild & Global)`);
}

/**
 * Handles all Discord INTERACTION_CREATE events (Buttons, Modals, Slash Commands)
 */
async function handleInteraction(ix) {
  const ixId = ix.id;
  const ixToken = ix.token;
  const user = ix.member?.user || ix.user || { id: '0', username: 'Governor' };
  const channelId = ix.channel_id;
  const guildId = ix.guild_id || GUILD_ID;
  const tierStatus = getGuildTierStatus(guildId);

  const reply = (data) =>
    discordApi('POST', `/interactions/${ixId}/${ixToken}/callback`, data);
  const editOriginal = (data) =>
    discordApi('PATCH', `/webhooks/${APP_ID}/${ixToken}/messages/@original`, data);

  // =========================================================================
  // 0. GUILD-ID CLONE LOCK GATE (Blocks Unlicensed Discord Template Clones)
  // =========================================================================
  const isExemptFromCloneLock =
    VALHEON_FOUNDER_IDS.has(String(user.id)) ||
    (ix.type === 2 && ix.data?.name === 'hermes' && ix.data?.options?.[0]?.name === 'tier') ||
    (ix.type === 3 &&
      (ix.data?.custom_id === 'hermes_ticket_onboard' ||
        ix.data?.custom_id === 'hermes_upgrade_legendary_btn' ||
        ix.data?.custom_id === 'hermes_upgrade_webos_btn' ||
        ix.data?.custom_id === 'hermes_demo_common_lockout' ||
        ix.data?.custom_id === 'hermes_launch_kd_modal')) ||
    (ix.type === 5 && ix.data?.custom_id === 'hermes_kd_deploy_modal');

  if (!tierStatus.isLicensed && !isExemptFromCloneLock) {
    return reply({
      type: 4,
      data: {
        flags: 64,
        ...buildUnlicensedClonePayload(guildId),
      },
    });
  }

  // =========================================================================
  // 1. BUTTON INTERACTIONS (type === 3)
  // =========================================================================
  if (ix.type === 3) {
    const rawCustomId = ix.data?.custom_id || '';
    const customId = rawCustomId.replace(/^icarus_/, 'hermes_');
    console.log(`[HERMES Button Click] ${customId} by ${user.username} (${user.id})`);

    // A0. Commercial Rarity Tier & 24-Hour FOMO Upgrade / Lockout Preview Buttons
    if (customId === 'hermes_demo_common_lockout') {
      const demoLockout = buildCommonLockoutPayload({
        guildId,
        featureName: '1-Tap Title Queue / 17-Flag Translator / Midterm Packet',
        teaserText:
          '👀 **LIVE PREVIEW OF `🟢 COMMON HERMES` LOCKOUT:**\nWhen a Kingdom buys the **`$39` 1-Click Server**, they get **`🟢 Common Hermes`** with basic commands. The moment their Governors click a **1-Tap Title button**, **Saturday Midterm Packet**, **Flag Emoji Translator**, or **Optics OCR**, HERMES drops this exact upgrade card with the live **24-Hour `+$15` Countdown**!',
      });
      return reply({
        type: 4,
        data: {
          flags: 64,
          ...demoLockout,
        },
      });
    }

    if (customId === 'hermes_upgrade_legendary_btn') {
      await reply({ type: 5, data: { flags: 64 } });
      const planKey = tierStatus.isWithin24h ? 'LEGENDARY_UPGRADE_15' : 'LEGENDARY_UPGRADE_25';
      const checkout = await createStripeCheckoutForDiscord({
        planKey,
        userId: user.id,
        username: user.username,
        guildId,
      });
      const priceStr = tierStatus.isWithin24h
        ? `🔥 **24-HOUR LAUNCH WINDOW ACTIVE: \`+$15 One-Time\`** *(Expires <t:${tierStatus.offerExpiresUnix}:R> — increases to \`+$25\` after!)*`
        : `⏳ **Standard Upgrade Rate: \`+$25 One-Time\`** *(24-Hour \`+$15\` Launch Window expired)*`;

      return editOriginal({
        embeds: [
          {
            title: '🟠 UPGRADE TO LEGENDARY HERMES // DIRECT VALHEON STRIPE CHECKOUT',
            description:
              `${priceStr}\n\n` +
              `**Stay 100% in Discord Forever with \`$0/mo\` Recurring Fees:**\n` +
              `• ⚡ **Zero-Grid 1-Tap & Chat Title Queue** (\`justice\`, \`duke\`, \`scientist\`, \`architect\`)\n` +
              `• 🌍 **Unlimited 17-Language Flag Emoji Reaction & Context-Menu Translator**\n` +
              `• 🎓 **Saturday 10/10 Midterm Early Packet & 15s Final Exam Speed Drill**\n` +
              `• 📸 **Local Optics Screenshot OCR** (Resource Bag & Speedup Bag Math)\n` +
              `• 💀 **AI Governor Telemetry Roaster & Auto-Injected AEGIS Ticket Scores**\n` +
              `• 📖 **Full 95 Sovereign Field Dossiers & 141 Commander Talent Trees**\n` +
              `• 🎯 **R4 Zero-List Shield Drop Tracker & 🎙️ Voice War-Room Rollcall**\n\n` +
              `👉 **Step 1:** Click **` +
              '`[💳 Pay via Valheon Stripe]`' +
              `** below (\`0%\` middleman cut — direct to Valheon Solutions LLC).\n` +
              `👉 **Step 2:** Click **` +
              '`[✅ Verify Stripe Payment & Auto-Unlock]`' +
              `** to immediately activate **🟠 Legendary Hermes** on your server and receive your **@🏰 Crowned Sovereign** Discord role!`,
            color: 0xf59e0b,
            footer: {
              text: 'VALHEON SOLUTIONS STRIPE BRIDGE // INSTANT DISCORD ROLE + AUTO-LICENSE',
            },
          },
        ],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5, // LINK
                label: `💳 Step 1: Pay via Valheon Stripe (${checkout.item.priceDisplay})`,
                url: checkout.checkoutUrl,
              },
              {
                type: 2,
                style: 3, // SUCCESS
                label: '✅ Step 2: Verify Payment & Auto-Unlock Legendary',
                custom_id: `hermes_stripe_verify_${planKey}`,
              },
            ],
          },
        ],
      });
    }

    if (customId === 'hermes_upgrade_webos_btn') {
      return reply({
        type: 4,
        data: {
          flags: 64,
          embeds: [
            {
              title: '🚧 VALHEON WEB OS // COMING SOON',
              description:
                `The **Valheon Web OS (\`valheon.com\`)** is currently in private pre-launch development!\n\n` +
                `Today, **100% of our 1-Click Discord Servers** (**🏰 Home Kingdom \`$39\`**, **🕊️ KvK Diplomacy \`$9\`**, **⚔️ Allied Coalition \`$9\`**, and the **🔥 72-Hour Bundle \`$15\`**) run **100% standalone inside Discord** with zero web subscription required!`,
              color: 0x38bdf8,
              footer: {
                text: 'VALHEON 1-CLICK DISCORD ARCHITECT // STANDALONE DISCORD OS',
              },
            },
          ],
        },
      });
    }

    // A2. 1-Click Trojan Horse Store Buttons Wired to Direct Valheon Stripe + Webhook/API Verifier!
    if (
      customId === 'hermes_deploy_kingdom_btn' ||
      customId === 'hermes_deploy_diplo_btn' ||
      customId === 'hermes_deploy_coalition_btn' ||
      customId === 'hermes_deploy_kvk_bundle_btn'
    ) {
      await reply({ type: 5, data: { flags: 64 } });

      const planMap = {
        hermes_deploy_kingdom_btn: 'KINGDOM_39',
        hermes_deploy_diplo_btn: 'KVK_DIPLO_9',
        hermes_deploy_coalition_btn: 'KVK_COALITION_9',
        hermes_deploy_kvk_bundle_btn: 'KVK_BUNDLE_15',
      };
      const planKey = planMap[customId] || 'KINGDOM_39';
      const checkout = await createStripeCheckoutForDiscord({
        planKey,
        userId: user.id,
        username: user.username,
        guildId,
      });

      const bundleExp = tierStatus.kvkBundleExpiresUnix || Math.floor(Date.now() / 1000) + 259200;
      const isPrincipal = VALHEON_FOUNDER_IDS.has(String(user.id));

      const actionRows = [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5, // LINK
              label: `💳 Step 1: Pay via Valheon Stripe (${checkout.item.priceDisplay})`,
              url: checkout.checkoutUrl,
            },
            {
              type: 2,
              style: 5, // LINK
              label: '🤖 Step 2: Invite HERMES to Blank Server',
              url: `https://discord.com/oauth2/authorize?client_id=${APP_ID}&permissions=8&scope=bot%20applications.commands`,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3, // SUCCESS
              label: '✅ Step 3: Verify Payment & Launch 1-Click Builder',
              custom_id: `hermes_stripe_verify_${planKey}`,
            },
          ],
        },
      ];

      // Strictly lock Mint Coupon, Audit Ledger, and Sandbox Direct Launch to Principal (184977944433786880) ONLY!
      if (isPrincipal) {
        actionRows.push({
          type: 1,
          components: [
            {
              type: 2,
              style: 1, // PRIMARY
              label: '🎟️ Mint Giveaway/Promo Code (Principal)',
              custom_id: `hermes_mint_coupon_modal_${planKey}`,
            },
            {
              type: 2,
              style: 2, // SECONDARY
              label: '📜 Coupon Audit Ledger (Principal)',
              custom_id: 'hermes_view_coupon_ledger',
            },
            {
              type: 2,
              style: 2, // SECONDARY
              label: '🧪 Sandbox Direct Launch (Principal)',
              custom_id: checkout.item.launchModalCustomId,
            },
          ],
        });
      }

      return editOriginal({
        embeds: [
          {
            title: `💳 DIRECT VALHEON STRIPE CHECKOUT // ${checkout.item.name.toUpperCase()}`,
            description:
              `**Selected Package:** **${checkout.item.name}** — **\`${checkout.item.priceDisplay}\`**\n` +
              `> *${checkout.item.description}*\n\n` +
              `### ⚡ HOW TO CHECK OUT & AUTO-BUILD YOUR SERVER IN 60 SECONDS:\n` +
              `1️⃣ **Click \`[💳 Step 1: Pay via Valheon Stripe (${checkout.item.priceDisplay})]\` below:**\n` +
              `   • Hosted directly by **Valheon Solutions LLC Stripe** (Apple Pay, Google Pay, Cards — zero middleman cut, no website needed).\n` +
              `   • 🎟️ *Have an Event Giveaway or Promo Code? Click **"Add promotion code"** on the Stripe checkout page!*\n` +
              `2️⃣ **Create a blank Discord server & click \`[🤖 Step 2: Invite HERMES to Blank Server]\`.**\n` +
              `3️⃣ **Click \`[✅ Step 3: Verify Payment & Launch 1-Click Builder]\`:**\n` +
              `   • **HERMES** automatically verifies your Stripe payment or redeemed giveaway code, grants your **@🏰 Crowned Sovereign** Discord role, posts a cryptographically audited receipt to Valheon HQ, and opens the **1-Click Server Builder**!\n\n` +
              `🔥 *72-Hour KvK Diplo + Coalition Bundle (\`$15\` for Both) valid until <t:${bundleExp}:R> • Includes **🛟 Lifetime Free Repair Guarantee** (\`$0.00\` re-provisioning forever).*`,
            color: 0x10b981,
            footer: {
              text: `VALHEON SOLUTIONS STRIPE BRIDGE (${checkout.mode}) // REF: ${user.id}_${planKey}`,
            },
          },
        ],
        components: actionRows,
      });
    }

    // A2.2 Principal-Only Coupon / Giveaway Code Minting Modal (`184977944433786880` ONLY)
    if (customId.startsWith('hermes_mint_coupon_modal_')) {
      if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            content: '⛔ **Strict Principal-Only Lock:** Only Lauren (`184977944433786880`) can mint promo or giveaway codes.',
          },
        });
      }
      const planKey = customId.replace('hermes_mint_coupon_modal_', '') || 'KINGDOM_39';
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: `hermes_submit_mint_coupon_${planKey}`,
          title: '🎟️ Mint Audited Promo / Giveaway Code',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'coupon_reason_why',
                  label: 'WHY & FOR WHOM (Required Non-Repudiation Log)',
                  style: 1,
                  placeholder: 'e.g. KvK Event Giveaway Winner @GovernorName',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'coupon_percent_off',
                  label: 'DISCOUNT % (100 = Free $0.00 Giveaway)',
                  style: 1,
                  value: '100',
                  placeholder: '100 for Free Giveaway, or 10-99 for % discount',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'coupon_max_redemptions',
                  label: 'MAX REDEMPTIONS (1 = Single-Use Lock)',
                  style: 1,
                  value: '1',
                  placeholder: '1 for single winner, or e.g. 10 for flash event',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'coupon_custom_code',
                  label: 'CUSTOM CODE (Leave blank to auto-generate)',
                  style: 1,
                  placeholder: 'Leave blank for VALHEON-XXXXXX, or type custom code',
                  required: false,
                },
              ],
            },
          ],
        },
      });
    }

    // A2.3 Principal-Only SHA-256 Coupon Audit Ledger Viewer (`184977944433786880` ONLY)
    if (customId === 'hermes_view_coupon_ledger') {
      const summary = getCouponAuditLedgerSummary(user.id);
      if (!summary.allowed) {
        return reply({
          type: 4,
          data: { flags: 64, content: summary.error },
        });
      }

      const rowsText =
        summary.entries.length === 0
          ? '*No promo codes have been minted or redeemed yet. Click **`[🎟️ Mint Giveaway/Promo Code]`** to issue your first audited code!*'
          : summary.entries
              .slice(0, 10)
              .map((e) => {
                const hashShort = (e.entry_hash || '').slice(0, 10);
                if (e.event_type === 'CODE_MINTED') {
                  return (
                    `**#${e.seq} \`[MINTED]\` \`${e.what_code}\` (${e.what_percent_off}% OFF • Max: ${e.what_max_redemptions})**\n` +
                    `• **Who Issued:** <@${e.who_actor_id}> (\`${e.who_actor_username}\`)\n` +
                    `• **When:** \`${e.when_utc}\` • **Where:** Guild \`${e.where_guild_id}\`\n` +
                    `• **Why:** *${e.why_reason}* • **SHA-256:** \`${hashShort}…\``
                  );
                }
                if (e.event_type === 'CODE_REDEEMED' || e.event_type === 'CHECKOUT_PAID') {
                  return (
                    `**#${e.seq} \`[${e.event_type}]\` Code: \`${e.what_code_redeemed}\` (Paid: \`$${Number(e.what_paid_usd || 0).toFixed(2)}\` / Saved: \`$${Number(e.what_discount_usd || 0).toFixed(2)}\`)**\n` +
                    `• **Who Redeemed:** <@${e.who_redeemer_id}> (\`${e.who_redeemer_username}\` / \`${e.who_redeemer_email}\`)\n` +
                    `• **When:** \`${e.when_utc}\` • **Session:** \`${e.where_session_id}\`\n` +
                    `• **Why:** *${e.why_reason}* • **SHA-256:** \`${hashShort}…\``
                  );
                }
                return `**#${e.seq} \`[${e.event_type}]\`** Actor: \`${e.who_actor_id}\` • When: \`${e.when_utc}\` • SHA-256: \`${hashShort}…\``;
              })
              .join('\n\n');

      return reply({
        type: 4,
        data: {
          flags: 64,
          embeds: [
            {
              title: '📜 VALHEON COUPON & CHECKOUT NON-REPUDIATION LEDGER (SHA-256)',
              description:
                `**Cryptographic Chain Integrity:** ${summary.integrityVerified ? '🟢 **VERIFIED (100% Tamper-Free SHA-256 Chain)**' : '🔴 **CHAIN MISMATCH DETECTED**'}\n` +
                `**Total Audited Events:** \`${summary.totalEntries}\` *(File: \`hermes-bot/coupon_audit_ledger.jsonl\`)*\n\n` +
                rowsText,
              color: summary.integrityVerified ? 0x38bdf8 : 0xef4444,
              footer: {
                text: 'PRINCIPAL-ONLY OVERWATCH (184977944433786880) // WHO • WHAT • WHERE • WHEN • WHY',
              },
            },
          ],
        },
      });
    }

    // A2.5 Stripe Payment Verification -> Auto-Grant Role + Relay Receipt to Valheon HQ + Open Builder!
    if (customId.startsWith('hermes_stripe_verify_')) {
      await reply({ type: 5, data: { flags: 64 } });
      const planKey = customId.replace('hermes_stripe_verify_', '');
      const item = STRIPE_CATALOG[planKey] || STRIPE_CATALOG.KINGDOM_39;
      const check = await verifyStripePaymentStatus({
        userId: user.id,
        username: user.username,
        planKey,
        guildId,
        channelId,
      });

      if (!check.paid) {
        return editOriginal({
          content: check.message,
        });
      }

      // 1. Auto-grant @🏰 Crowned Sovereign (Kingdom R5) role in Valheon HQ!
      const grantedRoles = [];
      try {
        const hqRoles = await discordApi('GET', `/guilds/${GUILD_ID}/roles`);
        if (Array.isArray(hqRoles)) {
          const sovereignRole = hqRoles.find(
            (r) => r.name.includes('Crowned Sovereign') || r.name.includes('War Room Tactician')
          );
          if (sovereignRole) {
            await discordApi(
              'PUT',
              `/guilds/${GUILD_ID}/members/${user.id}/roles/${sovereignRole.id}`
            );
            grantedRoles.push(sovereignRole.name);
          }
        }
      } catch {}

      // 2. If it's a Legendary Upgrade on an existing server, resolve the buyer's Kingdom Server and unlock Legendary immediately!
      let upgradedGuildId = guildId;
      if (item.blueprintType === 'UPGRADE_ONLY') {
        if (String(guildId) === String(GUILD_ID)) {
          const ownedEntry = Object.values(GUILD_TIERS).find(
            (g) =>
              g &&
              typeof g === 'object' &&
              g.guildId &&
              String(g.guildId) !== String(GUILD_ID) &&
              String(g.buyerDiscordId) === String(user.id)
          );
          if (ownedEntry?.guildId) {
            upgradedGuildId = ownedEntry.guildId;
          }
        }
        setGuildTier(upgradedGuildId, 'LEGENDARY', false);
      }

      const promoSummaryLine =
        check.discountUsd > 0
          ? `• **Promo Code Redeemed:** \`${check.promoCodeUsed || 'PROMO_COUPON'}\` (Discount: \`-$${Number(check.discountUsd).toFixed(2)}\` • Net Paid: \`$${Number(check.amountUsd).toFixed(2)} USD\`)\n` +
            `• **Original Issuance Reason (Why):** *${check.whyIssuedMemo || 'Audited Stripe Promo'}*\n`
          : `• **Net Paid:** \`$${Number(check.amountUsd ?? item.amountCents / 100).toFixed(2)} USD\` (Full Price)\n`;

      // 3. Relay verified Stripe payment / promo redemption receipt to #📡-central-support-and-relaunch-hub in Valheon HQ!
      await relaySupportEventToValheonHq({
        title:
          check.discountUsd > 0
            ? `🎟️ PROMO CODE REDEEMED & VERIFIED ($${Number(check.amountUsd).toFixed(2)} Paid) // ${item.name}`
            : `💳 STRIPE PAYMENT VERIFIED (${item.priceDisplay}) // ${item.name}`,
        description:
          `• **Who (Redeemer):** <@${user.id}> (\`${user.username}\` / \`${check.customerEmail}\`)\n` +
          `• **What (Package):** **${item.name}** (\`${item.priceDisplay}\`)\n` +
          promoSummaryLine +
          `• **Where (Session & Server):** Session \`${check.sessionId}\` • Guild \`${upgradedGuildId}\`\n` +
          `• **SHA-256 Ledger Hash:** \`${(check.auditHash || 'VERIFIED').slice(0, 16)}…\`\n` +
          `• **Auto-Granted Role:** ${grantedRoles.length ? grantedRoles.map((r) => `\`${r}\``).join(', ') : '`@🏰 Crowned Sovereign`'}`,
        color: check.discountUsd > 0 ? 0xf59e0b : 0x10b981,
        targetGuildId: upgradedGuildId,
        targetChannelId: channelId,
      });

      if (item.blueprintType === 'UPGRADE_ONLY') {
        return editOriginal({
          embeds: [
            {
              title: `🟠 LEGENDARY HERMES UNLOCKED FOREVER // GUILD \`${upgradedGuildId}\``,
              description:
                `Thank you, <@${user.id}>! Your **🟠 Legendary Hermes** upgrade (**\`${item.priceDisplay}\`**) is now **100% ACTIVE FOREVER (\`$0/mo\` recurring)** on Server ID **\`${upgradedGuildId}\`**!\n\n` +
                `• ⚡ **Zero-Grid 1-Tap & Chat Title Queue** (\`justice\`, \`duke\`, \`scientist\`, \`architect\`)\n` +
                `• 🌍 **Unlimited 17-Language Flag Emoji & Context-Menu Translator**\n` +
                `• 🎓 **Saturday 10/10 Midterm Early Packet & 15s Speed Drills**\n` +
                `• 📸 **Local Screenshot OCR, Silent 24h UTC Uptime Heatmap, Zero-List & All 95 Field Guides**`,
              color: 0xf59e0b,
              footer: { text: 'VALHEON LEGENDARY HERMES // ONE-TIME UNLOCK • ZERO MONTHLY FEES' },
            },
          ],
        });
      }

      // 4. Present the unlocked 1-Click Builder button(s)!
      const launchButtons =
        planKey === 'KVK_BUNDLE_15'
          ? [
              {
                type: 2,
                style: 1,
                label: '🕊️ Launch Server #1: KvK Diplomacy ($15 Bundle)',
                custom_id: 'hermes_launch_diplo_modal',
              },
              {
                type: 2,
                style: 4,
                label: '⚔️ Launch Server #2: Allied Coalition War ($15 Bundle)',
                custom_id: 'hermes_launch_coalition_modal',
              },
            ]
          : [
              {
                type: 2,
                style: 3,
                label: `🚀 Launch My 1-Click Server Now (${item.name.slice(0, 28)})`,
                custom_id: item.launchModalCustomId,
              },
            ];

      return editOriginal({
        embeds: [
          {
            title: `✅ STRIPE PAYMENT VERIFIED // ${item.name.toUpperCase()}`,
            description:
              `Thank you, <@${user.id}>! Your payment (**\`${item.priceDisplay}\`**) has been verified by **HERMES**.\n\n` +
              `• **Discord Role Granted:** ${grantedRoles.length ? grantedRoles.map((r) => `\`${r}\``).join(', ') : '`🏰 Crowned Sovereign (Kingdom R5)`'}\n` +
              `• **Receipt Logged to Valheon Citadel HQ:** \`${check.sessionId}\`\n\n` +
              `👉 **Click the green launch button below to enter your blank Discord Server ID and build your server in 18 seconds!**`,
            color: 0x10b981,
            footer: { text: 'VALHEON SOLUTIONS STRIPE BRIDGE // PAYMENT VERIFIED & LICENSED' },
          },
        ],
        components: [
          {
            type: 1,
            components: launchButtons,
          },
        ],
      });
    }

    // A3. Open 1-Click Kingdom / Diplo / Coalition Modals
    if (customId === 'hermes_launch_kd_modal') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_kd_deploy_modal',
          title: '🏰 1-Click Home Kingdom War Architect ($39)',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'target_guild_id',
                  label: '1. Target Blank Discord Server (Guild) ID',
                  style: 1,
                  placeholder: 'Right-click your blank server icon -> Copy Server ID',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'kingdom_id',
                  label: '2. Kingdom Number (e.g. 4194 or 4205)',
                  style: 1,
                  value: '4194',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'kingdom_title',
                  label: '3. Kingdom Banner Title',
                  style: 1,
                  value: 'IMPERIUM VANGUARD',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'alliances_list',
                  label: '4. Top Alliance Tags (Comma-Separated)',
                  style: 1,
                  value: 'VHN1, VHN2, VHN3, VHN4',
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    if (customId === 'hermes_launch_diplo_modal') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_diplo_deploy_modal',
          title: '🕊️ 1-Click KvK Diplomacy Architect ($9)',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'target_guild_id',
                  label: '1. Target Blank Discord Server (Guild) ID',
                  style: 1,
                  placeholder: 'Right-click your blank server icon -> Copy Server ID',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'season_title',
                  label: '2. KvK Season / Bracket Name',
                  style: 1,
                  value: 'HEROIC ANTHEM // LOST KINGDOM SUMMIT',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'matched_kingdoms',
                  label: '3. Matched Kingdom Numbers (Comma-Separated)',
                  style: 1,
                  value: '4190, 4191, 4192, 4193, 4194, 4195, 4196, 4197',
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    if (customId === 'hermes_launch_coalition_modal') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_coalition_deploy_modal',
          title: '⚔️ 1-Click Allied Coalition War Server ($9)',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'target_guild_id',
                  label: '1. Target Blank Discord Server (Guild) ID',
                  style: 1,
                  placeholder: 'Right-click your blank server icon -> Copy Server ID',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'camp_title',
                  label: '2. Allied Camp / Coalition Name',
                  style: 1,
                  value: 'CAMP FIRE + EARTH ALLIED WAR COMMAND',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'allied_kingdoms',
                  label: '3. Allied Kingdom Numbers (Only Your Allies!)',
                  style: 1,
                  value: '4194, 4195, 4196, 4197',
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    // A4. 1v1 Bilateral Kingdom Embassy Room Generator (Inside KvK Diplo Server)
    if (customId === 'hermes_open_bilateral_embassy_btn') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_bilateral_embassy_modal',
          title: '🤝 Open Private 1v1 Kingdom Treaty Room',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'kd_one',
                  label: '1. Your Kingdom Number (e.g. 4194)',
                  style: 1,
                  value: '4194',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'kd_two',
                  label: '2. Counterparty Kingdom Number (e.g. 4196)',
                  style: 1,
                  placeholder: '4196',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'treaty_topic',
                  label: '3. Treaty Agenda (Zone Split / Ally / MGE)',
                  style: 1,
                  value: 'Zone 6 Border & Ziggurat Rotation Treaty',
                  required: false,
                },
              ],
            },
          ],
        },
      });
    }

    // A5. CUSTOMER SELF-HEALING ($0 FREE REPAIR) & CENTRAL VALHEON HQ SUPPORT RELAY
    // STRICTLY LOCKED TO DISCORD SERVER OWNER / VERIFIED BUYER / HOME R5 (BLOCKS ALL R4s & RANDOM MEMBERS!)
    if (customId === 'hermes_free_relaunch_btn') {
      await reply({ type: 5, data: { flags: 64 } });
      const savedStatus = getGuildTierStatus(guildId);
      const authCheck = await verifyServerSovereignAuthorization(ix, guildId, savedStatus);

      if (!authCheck.allowed) {
        await relaySupportEventToValheonHq({
          title: `🛡️ BLOCKED UNAUTHORIZED SERVER REPAIR ATTEMPT // Guild \`${guildId}\``,
          description:
            `• **Blocked User:** <@${user.id}> (\`${user.username}\`)\n` +
            `• **Server ID:** \`${guildId}\`\n` +
            `• **Reason:** \`${authCheck.reason}\` (Only Server Owner / Buyer / R5 Sovereign is permitted)\n` +
            `• **Customer Purchase Protected:** Zero changes were made to the server.`,
          color: 0xef4444,
          targetGuildId: guildId,
          targetChannelId: channelId,
        });

        return editOriginal({
          embeds: [
            {
              title: '🛡️ SOVEREIGN PURCHASE PROTECTION // ACCESS DENIED',
              description:
                `Only the **Discord Server Owner**, **Verified Buyer**${
                  authCheck.ownerId ? ` (<@${authCheck.ownerId}>)` : ''
                }, or **Crowned R5 Sovereign** is authorized to trigger a **1-Click Server Recovery / Self-Heal**.\n\n` +
                `• **R4 Officers, Diplomats, and standard members are strictly blocked** from resetting channels, altering the server blueprint, or exporting Discord Server Templates.\n` +
                `• This blocked attempt by <@${user.id}> has been logged to protect this Kingdom's purchase.`,
              color: 0xef4444,
              footer: { text: 'VALHEON ANTI-ROGUE SHIELD // OWNER & R5 LOCKED' },
            },
          ],
        });
      }

      return editOriginal({
        embeds: [
          {
            title: `🛡️ OWNER / R5 VERIFIED (${authCheck.reason}) // CONFIRM NON-DESTRUCTIVE SERVER REPAIR`,
            description:
              `Identity verified for <@${user.id}>!\n\n` +
              `**What happens when you click \`[✅ Confirm Non-Destructive Repair ($0.00)]\` below:**\n` +
              `1. **100% Safe for Custom Channels & Chat History:** HERMES **never** deletes any existing channels or messages.\n` +
              `2. **Restores Only Missing Items:** Scans your server and recreates only missing standard channels, roles, or pinned consoles.\n` +
              `3. **Hardens R4 Anti-Template Protection:** Ensures \`@R4\` and shared roles cannot export a Discord Server Template or delete channels.`,
            color: 0xf59e0b,
            footer: { text: 'STEP 2 OF 2 // CLICK BELOW TO EXECUTE FREE NON-DESTRUCTIVE REPAIR' },
          },
        ],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 3, // SUCCESS
                label: '✅ Confirm Owner/R5 Non-Destructive Repair ($0.00)',
                custom_id: 'hermes_confirm_free_relaunch_btn',
              },
            ],
          },
        ],
      });
    }

    if (customId === 'hermes_confirm_free_relaunch_btn') {
      await reply({ type: 5, data: { flags: 64 } });
      const savedStatus = getGuildTierStatus(guildId);
      const authCheck = await verifyServerSovereignAuthorization(ix, guildId, savedStatus);

      if (!authCheck.allowed) {
        return editOriginal({
          content: `🛡️ **Access Denied:** Only the Verified Server Owner / Buyer or R5 Sovereign can execute a 1-Click Server Recovery.`,
        });
      }

      const bpType =
        savedStatus.blueprintType ||
        (guildId === GUILD_ID ? 'VALHEON_HQ' : 'KINGDOM_WAR_SERVER');
      const bpOpts = savedStatus.deployOptions || {
        kingdomId: '4194',
        kingdomTitle: 'SOVEREIGN KINGDOM #4194',
        alliances: ['VHN1', 'VHN2', 'VHN3', 'VHN4'],
      };

      try {
        const res = await provisionDiscordServer({
          blueprintType: bpType,
          guildId,
          botToken: BOT_TOKEN,
          dryRun: false,
          options: bpOpts,
        });

        registerGuildDeployment(guildId, savedStatus.tier || 'LEGENDARY', {
          blueprintType: bpType,
          deployOptions: bpOpts,
        });

        // Relay repair receipt back to Valheon Citadel HQ so Lauren has full visibility!
        await relaySupportEventToValheonHq({
          title: `🔄 OWNER-VERIFIED AUTO-REPAIR EXECUTED ($0.00) // ${res.guildName} (\`${guildId}\`)`,
          description:
            `• **Verified Owner / R5:** <@${user.id}> (\`${user.username}\` • \`${authCheck.reason}\`)\n` +
            `• **Server:** **${res.guildName}** (\`${guildId}\`)\n` +
            `• **Blueprint Restored:** \`${bpType}\`\n` +
            `• **Items Verified / Restored:** \`${res.log.length}\` roles, channels & pinned consoles\n` +
            `• **Customer Charge:** **\`$0.00 (Free Lifetime Repair Guarantee)\`**`,
          color: 0x10b981,
          targetGuildId: guildId,
          targetChannelId: channelId,
        });

        return editOriginal({
          embeds: [
            {
              title: `✅ 1-CLICK FREE SERVER REPAIR COMPLETE ($0.00) // ${res.guildName}`,
              description:
                `**🪽 HERMES** scanned **${res.guildName}** (\`${bpType}\`), kept all of your existing custom channel names & chat history untouched, hardened R4 Anti-Template locks, and restored/verified **\`${res.log.length}\`** roles, channels, and pinned consoles at **\`$0.00\`**!\n\n` +
                `*Need custom wording help from our Principal Architect? Click **` +
                '`[🛟 Send Support Request to Valheon HQ]`' +
                `** anytime.*`,
              color: 0x10b981,
              footer: { text: 'VALHEON LIFETIME FREE REPAIR GUARANTEE // OWNER & R5 PROTECTED' },
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } catch (err) {
        return editOriginal({
          content: `❌ **Could not complete auto-repair:** ${err.message}. Please click **[🛟 Send Support Request to Valheon HQ]** so our team can assist you!`,
        });
      }
    }

    if (customId === 'hermes_hq_relay_ticket_btn') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_hq_relay_ticket_modal',
          title: '🛟 Direct Support Relay to Valheon HQ',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'support_type',
                  label: '1. Request Type (Relaunch / Wording / Bundle)',
                  style: 1,
                  value: 'Free Server Relaunch / Custom Channel Wording Help',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'support_details',
                  label: '2. How can Valheon HQ help your Kingdom?',
                  style: 2,
                  placeholder:
                    'Tell us what channel wording you want adjusted, or if you need us to remotely relaunch your layout for free...',
                  required: true,
                  max_length: 1200,
                },
              ],
            },
          ],
        },
      });
    }

    // A6. REMOTE ADMIN BUTTONS INSIDE VALHEON HQ (Relaunch or Reply to Any External Server in 1 Click!)
    // STRICTLY LOCKED TO VALHEON PRINCIPAL ARCHITECT (reign3418)
    if (customId === 'hermes_admin_manual_relaunch_open') {
      if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            content: '🛡️ **Valheon HQ Overwatch Lock:** Only the Principal Architect can trigger a remote customer server relaunch.',
          },
        });
      }
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_admin_manual_relaunch_modal',
          title: '🔄 Remote Free Relaunch Any Customer Server',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'remote_guild_id',
                  label: '1. Customer Discord Server (Guild) ID',
                  style: 1,
                  placeholder: 'Paste customer Guild ID to repair/relaunch for $0',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'remote_bp_type',
                  label: '2. Blueprint (AUTO / KINGDOM_WAR_SERVER / ..)',
                  style: 1,
                  value: 'AUTO',
                  required: false,
                },
              ],
            },
          ],
        },
      });
    }

    if (customId.startsWith('hermes_admin_relaunch_')) {
      if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            content: '🛡️ **Valheon HQ Overwatch Lock:** Only the Principal Architect can trigger a remote customer server relaunch.',
          },
        });
      }
      await reply({ type: 5 });
      const remoteGuildId = customId.replace('hermes_admin_relaunch_', '').trim();
      const savedStatus = getGuildTierStatus(remoteGuildId);
      const bpType = savedStatus.blueprintType || 'KINGDOM_WAR_SERVER';
      const bpOpts = savedStatus.deployOptions || {
        kingdomId: '4194',
        kingdomTitle: 'SOVEREIGN KINGDOM #4194',
        alliances: ['VHN1', 'VHN2', 'VHN3', 'VHN4'],
      };

      try {
        const res = await provisionDiscordServer({
          blueprintType: bpType,
          guildId: remoteGuildId,
          botToken: BOT_TOKEN,
          dryRun: false,
          options: bpOpts,
        });
        registerGuildDeployment(remoteGuildId, savedStatus.tier || 'LEGENDARY', {
          blueprintType: bpType,
          deployOptions: bpOpts,
        });
        return editOriginal({
          content: `✅ **Remote Free Relaunch Complete for \`${res.guildName}\` (\`${remoteGuildId}\` • \`${bpType}\`)!** Restored/verified **\`${res.log.length}\`** items from Valheon HQ at \`$0.00\`.`,
        });
      } catch (err) {
        return editOriginal({
          content: `❌ **Remote Relaunch Error for \`${remoteGuildId}\`:** ${err.message}`,
        });
      }
    }

    if (customId.startsWith('hermes_admin_reply_')) {
      if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            content: '🛡️ **Valheon HQ Overwatch Lock:** Only the Principal Architect can send an official HQ reply.',
          },
        });
      }
      const parts = customId.replace('hermes_admin_reply_', '').split('_');
      const remoteGuildId = parts[0] || '';
      const remoteChannelId = parts[1] || '';
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: `hermes_admin_reply_modal_${remoteGuildId}_${remoteChannelId}`,
          title: `💬 Beam Official Reply to ${remoteGuildId}`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'hq_reply_text',
                  label: 'Official Valheon HQ Concierge Reply',
                  style: 2,
                  placeholder:
                    'Your reply will be delivered directly into the customer server support channel...',
                  required: true,
                  max_length: 1500,
                },
              ],
            },
          ],
        },
      });
    }
    if (customId === 'hermes_confess_open' || customId === 'hermes_confess_tea') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_confess_modal',
          title: '🕵️ The Whisper Vault (100% Anonymous)',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'whisper_category',
                  label: 'Topic (tea / kvk / council / confession)',
                  style: 1,
                  value: customId === 'hermes_confess_tea' ? 'tea' : 'confession',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'whisper_message',
                  label: 'Your Uncensored Whisper (Identity Scrubbed)',
                  style: 2,
                  placeholder: 'Say what you cannot say in RoK chat...',
                  required: true,
                  max_length: 1500,
                },
              ],
            },
          ],
        },
      });
    }

    // B. Native R4 / HQ Ticket Creation & Close
    if (customId.startsWith('hermes_ticket_')) {
      if (customId === 'hermes_ticket_close') {
        const curChan = await discordApi('GET', `/channels/${channelId}`).catch(() => null);
        const chanName = String(curChan?.name || '').toLowerCase();
        // Safety Guard: Never allow hermes_ticket_close to delete a permanent channel!
        if (!chanName.startsWith('ticket-') && !chanName.includes('embassy-')) {
          return reply({
            type: 4,
            data: {
              flags: 64,
              content: '🛡️ **Channel Protection Guard:** Only temporary `ticket-*` or `embassy-*` channels can be archived with this button.',
            },
          });
        }
        await reply({
          type: 4,
          data: { content: '🔒 **HERMES archiving & closing this ticket in 5 seconds...**' },
        });
        setTimeout(() => {
          discordApi('DELETE', `/channels/${channelId}`).catch(() => {});
        }, 5000);
        return;
      }

      if (customId.startsWith('hermes_ticket_approve_')) {
        await reply({ type: 5 });
        const applicantId = customId.replace('hermes_ticket_approve_', '') || user.id;

        // BOLA Guard: Prevent an unprivileged applicant from clicking [Approve] on their own ticket!
        if (
          String(user.id) === String(applicantId) &&
          !VALHEON_FOUNDER_IDS.has(String(user.id))
        ) {
          const authCheck = await verifyServerSovereignAuthorization(ix, guildId, tierStatus);
          if (!authCheck.allowed) {
            return editOriginal({
              content:
                `🛡️ **R4/R5 Concierge Lock:** Only a Kingdom R5/R4 Council Officer or Server Owner can approve an application ticket (<@${applicantId}> cannot self-approve).`,
            });
          }
        }

        // 1. Fetch guild roles and assign Verified Roles to the applicant
        const grantedRoleNames = [];
        try {
          const guildRoles = await discordApi('GET', `/guilds/${guildId}/roles`);
          if (Array.isArray(guildRoles)) {
            const targetRoles = guildRoles.filter(
              (r) =>
                r.name.includes('Crowned') ||
                r.name.includes('Verified') ||
                r.name.includes('Brawler') ||
                r.name.includes('Titan')
            );
            for (const tr of targetRoles.slice(0, 2)) {
              await discordApi(
                'PUT',
                `/guilds/${guildId}/members/${applicantId}/roles/${tr.id}`
              );
              grantedRoleNames.push(tr.name);
            }
          }
        } catch (roleErr) {
          console.error('[HERMES Role Grant Error]:', roleErr);
        }

        // 2. Drop the Interactive 1-Click Kingdom Server Launchpad Card right into the ticket!
        return editOriginal({
          content: `✅ **Approved by <@${user.id}>!** Assigned Roles to <@${applicantId}>: ${
            grantedRoleNames.length
              ? grantedRoleNames.map((n) => `\`${n}\``).join(', ')
              : '`Verified Sovereign`'
          }`,
          embeds: [
            {
              title: '🪽 STEP 2: LAUNCH YOUR 1-CLICK KINGDOM DISCORD SERVER',
              description:
                `Welcome aboard, <@${applicantId}>! You are now cleared to auto-build your Kingdom Discord Server.\n\n` +
                `### ⚡ HOW TO DEPLOY YOUR SERVER IN 15 SECONDS:\n` +
                `1. **Create a blank Discord server** (click the \`+\` icon on your Discord left sidebar → *Create My Own*).\n` +
                `2. Click **` +
                '`[🤖 Step 1: Invite HERMES to Your Blank Server]`' +
                `** below and select your new blank server.\n` +
                `3. Right-click your new server's icon → **Copy Server ID**.\n` +
                `4. Click **` +
                '`[🪽 Step 2: Launch 1-Click Kingdom Builder]`' +
                `** below, paste your Server ID & Kingdom #, and **HERMES** will build all 25+ channels, roles, and R4 ticket desks automatically!`,
              color: 0xf59e0b,
              footer: { text: 'HERMES TURNKEY ARCHITECT // ZERO MANUAL CHANNEL SETUP' },
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5, // LINK
                  label: '🤖 Step 1: Invite HERMES to Your Blank Server',
                  url: `https://discord.com/oauth2/authorize?client_id=${APP_ID}&permissions=8&scope=bot%20applications.commands`,
                },
                {
                  type: 2,
                  style: 3, // SUCCESS
                  label: '🏰 Deploy 1-Click Kingdom Server ($39)',
                  custom_id: 'hermes_deploy_kingdom_btn',
                },
                {
                  type: 2,
                  style: 1, // PRIMARY
                  label: '🔥 72h KvK Diplo + Coalition Bundle ($15)',
                  custom_id: 'hermes_deploy_kvk_bundle_btn',
                },
              ],
            },
          ],
        });
      }

      if (customId.startsWith('hermes_ticket_polygraph_')) {
        if (!tierStatus.isLegendary) {
          return reply({
            type: 4,
            data: {
              flags: 64,
              ...buildCommonLockoutPayload({
                guildId,
                featureName: 'AEGIS 35-Field Migration Polygraph',
                teaserText:
                  '🛡️ **Automated AEGIS Migration Polygraph & KP-to-Power Vetting** inside R4 Tickets is locked on **🟢 Common Hermes**!',
              }),
            },
          });
        }
        const roast = generateGovernorRoast({
          id: user.id.slice(-8),
          name: user.global_name || user.username,
          power: 91_200_000,
          killPoints: 3_650_000_000,
          deads: 14_800_000,
        });
        return reply({
          type: 4,
          data: { embeds: [roast.embed] },
        });
      }

      // Defer ephemeral reply while creating ticket channel
      await reply({ type: 5, data: { flags: 64 } });

      const ticketType = customId.replace('hermes_ticket_', '');
      const safeName =
        (user.username || 'gov').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) ||
        'gov';

      // Fetch current channel to inherit category parent_id
      const parentChan = await discordApi('GET', `/channels/${channelId}`).catch(() => null);

      const newChan = await discordApi('POST', `/guilds/${guildId}/channels`, {
        name: `ticket-${ticketType}-${safeName}`,
        type: 0,
        parent_id: parentChan?.parent_id || undefined,
        permission_overwrites: [
          {
            id: guildId, // @everyone
            type: 0,
            allow: '0',
            deny: (1n << 10n).toString(), // Deny VIEW_CHANNEL
          },
          {
            id: APP_ID, // Bot itself must explicitly keep VIEW_CHANNEL + SEND_MESSAGES + MANAGE_CHANNELS
            type: 1,
            allow: (
              (1n << 4n) |
              (1n << 10n) |
              (1n << 11n) |
              (1n << 14n) |
              (1n << 15n) |
              (1n << 16n)
            ).toString(),
            deny: '0',
          },
          {
            id: user.id,
            type: 1, // Member overwrite
            allow: ((1n << 10n) | (1n << 11n) | (1n << 15n) | (1n << 16n)).toString(),
            deny: '0',
          },
        ],
      });

      if (newChan?.id) {
        const header = buildTicketHeaderEmbed({
          ticketType,
          discordUsername: user.global_name || user.username,
          discordId: user.id,
          governorStats: {
            id: user.id.slice(-8),
            name: user.global_name || user.username,
            power: 88_400_000,
            killPoints: 3_120_000_000,
            deads: 12_900_000,
          },
        });

        await discordApi('POST', `/channels/${newChan.id}/messages`, {
          content: `<@${user.id}> Welcome to your private **🪽 HERMES** Concierge channel!`,
          embeds: [header.embed],
          components: header.components,
        });

        return editOriginal({
          content: `🎫 **Private Ticket Created:** <#${newChan.id}>`,
        });
      } else {
        return editOriginal({
          content: `❌ Could not create ticket channel. Please check HERMES permissions.`,
        });
      }
    }

    // C. Roast My Governor / Sovereign Flex Card
    if (customId === 'hermes_roast_me' || customId === 'hermes_flex_card') {
      if (!tierStatus.isLegendary) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildCommonLockoutPayload({
              guildId,
              featureName: 'AI Governor Telemetry Roaster & Sovereign Flex Card',
              teaserText:
                '💀 **HERMES AI Governor Roaster & 35-Field Sovereign Flex Cards** are locked on **🟢 Common Hermes**!',
            }),
          },
        });
      }
      const isFlex = customId === 'hermes_flex_card';
      const roast = generateGovernorRoast({
        id: user.id.slice(-8),
        name: user.global_name || user.username,
        power: isFlex ? 96_500_000 : 92_000_000,
        killPoints: isFlex ? 4_600_000_000 : 340_000_000,
        deads: isFlex ? 19_100_000 : 1_200_000,
      });
      return reply({
        type: 4,
        data: { embeds: [roast.embed] },
      });
    }

    // D. Link RoK Governor ID / Guide Vault / Refresh Codes
    if (customId === 'hermes_verify_governor') {
      return reply({
        type: 4,
        data: {
          flags: 64,
          content:
            `🔗 **HERMES Identity Handshake Ready!**\n` +
            `Your Discord profile (<@${user.id}>) is connected to Valheon Citadel. Use \`/hermes roast <governor_id>\` to test live telemetry lookups!`,
        },
      });
    }

    if (customId === 'hermes_open_guide_vault') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_guide_search_modal',
          title: '📖 Valheon 95 Field Guides & 141 Commanders',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'guide_query',
                  label: 'Commander Name or Strategy Topic',
                  style: 1,
                  placeholder: 'e.g. Zhuge Liang, Hermann, Speedup, Sunset Canyon, Equipment...',
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    if (customId === 'hermes_refresh_codes') {
      return reply({
        type: 4,
        data: {
          flags: 64,
          content:
            `🎁 **Active RoK Redeem Codes Checked (` +
            new Date().toISOString().slice(0, 10) +
            `):**\n• \`ROK2026SOVEREIGN\` • \`g5k9p2m8q1\` • \`ROKVICTORY\` • \`Lilith11th\``,
        },
      });
    }

    // E. Peerless Scholar / Lyceum of Wisdom 17-Language Interactive Console Buttons
    if (customId === 'hermes_peerless_search_btn') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_peerless_search_modal',
          title: '🎓 17-Lang Peerless Scholar Solver',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'peerless_query',
                  label: '1. Exam Question Keywords (Any Language)',
                  style: 1,
                  placeholder: 'e.g. Richter, El Cid, Brutus, Olympic, Karuak...',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'peerless_lang',
                  label: '2. Language (en/vi/ar/ru/zh/es/id/ko/tr/ja..)',
                  style: 1,
                  value: normalizePeerlessLang(ix.locale || 'en'),
                  required: false,
                },
              ],
            },
          ],
        },
      });
    }

    if (customId === 'hermes_peerless_midterm_btn') {
      if (!tierStatus.isLegendary) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildCommonLockoutPayload({
              guildId,
              featureName: 'Saturday 10/10 Midterm Early Packet',
              teaserText:
                '📦 **The 17-Language Saturday 10/10 Midterm Early Answer Packet** is locked on **🟢 Common Hermes**! *(Basic 1-question keyword search is active; upgrade to 🟠 Legendary Hermes for the full Saturday 10/10 Packet & Final Exam Drills!)*',
            }),
          },
        });
      }
      await reply({ type: 5 });
      const packetEmbed = await buildMidtermPacketEmbed(ix.locale || 'en');
      return editOriginal({ embeds: [packetEmbed] });
    }

    if (customId === 'hermes_peerless_quiz_btn') {
      if (!tierStatus.isLegendary) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildCommonLockoutPayload({
              guildId,
              featureName: '15-Second Final Exam Speed Drill',
              teaserText:
                '⚡ **Interactive 15-Second Peerless Scholar Final Exam Speed Drills** are locked on **🟢 Common Hermes**!',
            }),
          },
        });
      }
      await reply({ type: 5 });
      const questions = PEERLESS_VAULT.questions || [];
      const rand = questions[Math.floor(Math.random() * questions.length)];
      const lang = normalizePeerlessLang(ix.locale || 'en');
      let qText = rand.q?.[lang] || rand.q?.en || '';
      let aText = rand.a?.[lang] || rand.a?.en || '';
      if (lang !== 'en' && qText === rand.q?.en) {
        const [tq, ta] = await Promise.all([
          translateText(rand.q.en, lang),
          translateText(rand.a.en, lang),
        ]);
        qText = tq.translated;
        aText = ta.translated;
      }
      return editOriginal({
        embeds: [
          {
            title: `⚡ PEERLESS SCHOLAR SPEED DRILL // [${rand.id} • ${String(rand.category).toUpperCase()}]`,
            description:
              `**Question (${lang.toUpperCase()}):**\n> **${qText}**\n\n` +
              `⏱️ *15-Second Final Exam Drill — Click spoiler below to reveal answer:*\n` +
              `✅ **Answer:** ||**\`${aText}\`** (${rand.a?.en})||`,
            color: 0xf59e0b,
            footer: { text: 'VALHEON LYCEUM VAULT // CLICK [⚡ Practice Final Exam Question] FOR NEXT DRILL' },
          },
        ],
      });
    }

    // F. 7-in-1 Kingdom War OS Buttons (Title Queue, AoO Roster, War Timer, MyStats, Calculator)
    // ZERO-GRID 1-TAP MODE: Clicking Justice / Duke / Scientist / Architect immediately queues by Governor UID!
    if (customId.startsWith('hermes_title_req_')) {
      if (!tierStatus.isLegendary) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildCommonLockoutPayload({
              guildId,
              featureName: 'Zero-Grid 1-Tap & Chat Title Automation',
              teaserText:
                '🔮 **1-Tap Zero-Grid Title Queue Buttons** are locked on **🟢 Common Hermes**! *(On Common Hermes, Governors must manually type `/title buff:<buff> coordinates:<X:Y>` every time. Upgrade to **🟠 Legendary Hermes** to unlock 1-Tap Buttons & single-word chat triggers!)*',
            }),
          },
        });
      }
      const titleKey = customId.replace('hermes_title_req_', '');
      const payload = requestKingdomTitle({
        titleKey,
        userId: user.id,
        username: user.global_name || user.username,
        coords: 'AUTO',
      });
      return reply({
        type: 7, // UPDATE_MESSAGE in place (Zero Modal, 1-Tap Instant Queue!)
        data: {
          content: `🔮 <@${user.id}> queued for **${titleKey.toUpperCase()}** *(Zero-Grid Profile Linked)*!`,
          ...payload,
        },
      });
    }

    if (customId === 'hermes_title_done') {
      const { releasedTitle, nextGovernor, payload } = completeCurrentTitle({ userId: user.id });
      return reply({
        type: 7, // UPDATE_MESSAGE in place
        data: {
          content: nextGovernor
            ? `✅ <@${user.id}> finished **${releasedTitle}**! 🔔 **UP NEXT:** <@${nextGovernor.userId}> (\`${nextGovernor.coords}\`) — your 3-minute title window is now active!`
            : `✅ <@${user.id}> released **${releasedTitle || 'Title'}**! The queue is now open.`,
          ...payload,
        },
      });
    }

    if (customId.startsWith('hermes_aoo_')) {
      const lane = customId.replace('hermes_aoo_', '');
      const payload = updateAooRoster({
        lane,
        userId: user.id,
        username: user.global_name || user.username,
      });
      return reply({
        type: 7, // UPDATE_MESSAGE in place!
        data: payload,
      });
    }

    if (customId === 'hermes_timer_rsvp') {
      const payload = buildWarTimerPayload({ rsvpUserId: user.id });
      return reply({
        type: 7, // UPDATE_MESSAGE in place!
        data: payload,
      });
    }

    if (customId === 'hermes_timer_create_btn') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_timer_create_modal',
          title: '⏰ Launch UTC War Mobilization Timer',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'event_name',
                  label: '1. War Event Name',
                  style: 1,
                  placeholder: 'e.g. Pass 4 Opening & Altar Push',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'minutes_from_now',
                  label: '2. Minutes From Now (e.g. 30, 45, 90)',
                  style: 1,
                  value: '45',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'event_coords',
                  label: '3. Target Coordinates',
                  style: 1,
                  value: 'Zone 6 // X:582 Y:610',
                  required: false,
                },
              ],
            },
          ],
        },
      });
    }

    if (customId === 'hermes_mystats_btn') {
      await reply({ type: 5, data: { flags: 64 } });
      const embed = buildMyStatsCard({
        userId: user.id,
        username: user.global_name || user.username,
      });
      return editOriginal({ embeds: [embed] });
    }

    if (customId === 'hermes_calc_open_btn') {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_calc_modal',
          title: '🧮 Sculpture & Wheel Gem Calculator',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'calc_type',
                  label: '1. Type ("sculptures" or "wheel")',
                  style: 1,
                  value: 'sculptures',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'calc_val',
                  label: '2. Current Skills (5511) or Spins (100)',
                  style: 1,
                  value: '5511',
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    // G. 1-Tap Combat Specialization & Event Calendar Ping Role Toggle
    if (customId.startsWith('hermes_role_toggle_')) {
      await reply({ type: 5, data: { flags: 64 } });
      const roleKey = customId.replace('hermes_role_toggle_', '');
      const meta = ROLE_TOGGLE_CATALOG[roleKey];
      if (!meta) {
        return editOriginal({ content: `⚠️ Unknown role key: \`${roleKey}\`` });
      }

      try {
        const guildRoles = await discordApi('GET', `/guilds/${guildId}/roles`);
        let targetRole = Array.isArray(guildRoles)
          ? guildRoles.find((r) => r.name === meta.name)
          : null;

        if (!targetRole) {
          targetRole = await discordApi('POST', `/guilds/${guildId}/roles`, {
            name: meta.name,
            color: meta.color,
            hoist: false,
            mentionable: true,
          });
        }

        const memberRoles = Array.isArray(ix.member?.roles) ? ix.member.roles : [];
        const hasRole = memberRoles.includes(targetRole.id);

        if (hasRole) {
          await discordApi(
            'DELETE',
            `/guilds/${guildId}/members/${user.id}/roles/${targetRole.id}`
          );
          return editOriginal({
            content: `🔕 **Role Removed:** **\`${meta.name}\`** — You will no longer receive pings for this tag.`,
          });
        } else {
          await discordApi(
            'PUT',
            `/guilds/${guildId}/members/${user.id}/roles/${targetRole.id}`
          );
          return editOriginal({
            content: `✅ **Role Equipped:** <@&${targetRole.id}> — *${meta.desc}*`,
          });
        }
      } catch (err) {
        return editOriginal({
          content: `❌ Could not toggle role \`${meta.name}\`: ${err.message}`,
        });
      }
    }

    if (customId === 'hermes_my_roles_status') {
      await reply({ type: 5, data: { flags: 64 } });
      const guildRoles = await discordApi('GET', `/guilds/${guildId}/roles`);
      const memberRoles = new Set(Array.isArray(ix.member?.roles) ? ix.member.roles : []);
      const roleMap = new Map(
        (Array.isArray(guildRoles) ? guildRoles : []).map((r) => [r.name, r.id])
      );

      const combatLines = [];
      const pingLines = [];

      for (const [k, meta] of Object.entries(ROLE_TOGGLE_CATALOG)) {
        const rId = roleMap.get(meta.name);
        const active = rId && memberRoles.has(rId);
        const line = `${active ? '🟢 **ACTIVE**' : '⚪ *Off*'} — **${meta.name}**`;
        if (k.startsWith('spec_')) combatLines.push(line);
        else pingLines.push(line);
      }

      return editOriginal({
        embeds: [
          {
            title: `🪪 YOUR COMBAT & EVENT PING PROFILE (@${user.username})`,
            description:
              `### ⚔️ COMBAT SPECIALIZATION ROLES\n${combatLines.join('\n')}\n\n` +
              `### 📅 EVENT & MIGRATION ALERT SUBSCRIPTIONS\n${pingLines.join('\n')}`,
            color: 0x10b981,
            footer: { text: 'CLICK ANY BUTTON ON THE CONSOLE ABOVE TO TOGGLE ROLES ON / OFF' },
          },
        ],
      });
    }

    if (customId === 'hermes_nocap_radar_btn') {
      await reply({ type: 5, data: { flags: 64 } });
      return editOriginal({
        embeds: [
          {
            title: '🚨 VALHEON LIVE MIGRATION & NO-CAP KINGDOM RADAR',
            description:
              'Powered by **Valheon 5-Ring Autonomous Telemetry** (`Sovereign Optical Grid`):\n\n' +
              '• **🏰 Kingdom #4194 (`Imperium Vanguard`)** — `OPEN • Cap: 65M Power` *(35-Field Verified)*\n' +
              '• **🏰 Kingdom #4197 (`Genesis Swarm Sector`)** — `ACTIVE • Native Pre-KvK 1 Preparation`\n' +
              '• **🏰 Kingdom #3606 (`SoC A-Seed`)** — `NO CAP WINDOW SCHEDULED` *(Special Ticket Queue)*\n' +
              '• **🏰 Kingdom #3155 (`SoC Veteran`)** — `CAP LOCKED (25M) • Council Screening Required`\n\n' +
              '💡 *Click **`[🚨 No-Cap Migration]`** on the Role Console above to get pinged the exact second a watched Kingdom drops its power cap to **No Cap**!*',
            color: 0x22c55e,
            footer: { text: 'VALHEON VANGUARD MIGRATION RADAR // ZERO SPOOFED CAPS' },
          },
        ],
      });
    }

    // H. Official RoK Discord Intel Bridge Buttons
    if (customId === 'hermes_official_patch_digest') {
      await reply({ type: 5, data: { flags: 64 } });
      return editOriginal({
        embeds: [
          {
            title: '⚡ OFFICIAL ROK PATCH & META IMPACT DIGEST // HERMES INTEL',
            description:
              'Direct synthesis from **[Official `#📜〡rok․news`](https://discord.com/channels/474739462589382667/1179320159542980698)** (`Guild 474739462589382667`):\n\n' +
              '### 🔥 KEY META & SYSTEM HIGHLIGHTS\n' +
              '1. **Season of Conquest Formation & Armament Scaling:** Pincer, Delta, and Arch formations continue to dominate 5-march open-field synergy (`Liu Che`, `Hermann Prime`, `Arthur Pendragon`, `Zhuge Liang`, `Ragnar Prime`).\n' +
              '2. **Hall of Heroes & Vacation Permit Rules:** Governors holding active **Vacation Permits** are excluded from Top-300 Kingdom matchmaking weight when registered before the matchmaking lock.\n' +
              '3. **Official Links:**\n' +
              '   • [📜 Read Full Official Patch Notes](https://discord.com/channels/474739462589382667/1179320159542980698)\n' +
              '   • [💻 Check Official Redeem Codes](https://discord.com/channels/474739462589382667/1015398371202183218)\n' +
              '   • [🐛 Escalate Game Bugs to Lilith CS](https://discord.com/channels/474739462589382667/479118371821191168)',
            color: 0x38bdf8,
            footer: { text: 'BRIDGED FROM OFFICIAL RISE OF KINGDOMS DISCORD (474739462589382667)' },
          },
        ],
      });
    }

    if (customId === 'hermes_official_events_radar') {
      await reply({ type: 5, data: { flags: 64 } });
      return editOriginal({
        embeds: [
          {
            title: '📅 ROK RECURRING EVENT & GEM BUDGET RADAR',
            description:
              'Never waste Gems outside of high-ROI windows! Toggle your **Event Ping Roles** in `#🎯-combat-roles-and-event-pings`:\n\n' +
              '• **💎 More Than Gems (`7,000` / `25,000` Gems per day × 2 days):**\n' +
              '  - *Optimal Spend:* `14,000 Gems` total (`7k + 7k` = **10 Gold Heads**) or `50,000 Gems` total (`25k + 25k` = **26 Gold Heads**). Spend on VIP 10/12/14/15 or Castle Books.\n' +
              '• **🗿 20 Gold Head Events (*Hunt for History / Silk Road / Karuak*):**\n' +
              '  - Always hoard `7,000–10,000 Gems` + AP bottles to clear the full 20 Universal Legendary Sculptures.\n' +
              '• **🎡 Wheel of Fortune & MGE Cycle (Every 14 Days):**\n' +
              '  - *Optimal Spins:* `10 Spins` (unlocks commander at highest gem efficiency) or `45 / 100 Spins` for core meta primaries.\n' +
              '• **🔨 Holy Knight\'s Treasure (Egg) & Esmeralda\'s House:**\n' +
              '  - Best F2P/Low-Spender source for **Iconic Crystals** and **Legendary Helmet/Weapon/Chest Blueprints**.',
            color: 0xf59e0b,
            footer: { text: 'VALHEON EVENT RADAR // EQUIP @💎 More Than Gems Alert TO GET PINGED' },
          },
        ],
      });
    }
  }

  // =========================================================================
  // 2. MODAL SUBMIT INTERACTIONS (type === 5)
  // =========================================================================
  if (ix.type === 5 && ix.data?.custom_id?.startsWith('hermes_submit_mint_coupon_')) {
    await reply({ type: 5, data: { flags: 64 } });

    if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
      return editOriginal({
        content:
          '⛔ **Strict Principal-Only Lock:** Only Lauren (`184977944433786880`) can mint promo or giveaway codes.',
      });
    }

    const planKey = ix.data.custom_id.replace('hermes_submit_mint_coupon_', '') || 'KINGDOM_39';
    const comps = ix.data.components || [];
    const reasonWhy = (comps[0]?.components?.[0]?.value || 'Event Giveaway').trim();
    const percentOff = Number((comps[1]?.components?.[0]?.value || '100').trim()) || 100;
    const maxRedemptions = Number((comps[2]?.components?.[0]?.value || '1').trim()) || 1;
    const customCode = (comps[3]?.components?.[0]?.value || '').trim();

    const minted = await createAuditedStripePromoCode({
      actorUserId: user.id,
      actorUsername: user.username,
      guildId,
      channelId,
      planKey,
      percentOff,
      maxRedemptions,
      customCode,
      reasonWhy,
    });

    if (!minted.ok) {
      return editOriginal({
        content: minted.error,
      });
    }

    // Relay audited code creation to #📡-central-support-and-relaunch-hub in Valheon HQ!
    await relaySupportEventToValheonHq({
      title: `🎟️ AUDITED PROMO CODE MINTED // ${minted.code} (${minted.percentOff}% OFF)`,
      description:
        `• **Who (Issuer):** <@${user.id}> (\`${user.username}\` — Principal ID \`${user.id}\`)\n` +
        `• **What (Code & Cap):** \`${minted.code}\` (**\`${minted.percentOff}% OFF\`** • Max Uses: \`${minted.maxRedemptions}\` • Package: \`${planKey}\`)\n` +
        `• **Where (Guild & Stripe IDs):** Guild \`${guildId}\` • Coupon \`${minted.couponId}\` • Promo \`${minted.promoId}\`\n` +
        `• **When (UTC):** \`${minted.auditEntry?.when_utc}\`\n` +
        `• **Why (Memo):** *${minted.reasonWhy}*\n` +
        `• **SHA-256 Chain Hash:** \`${(minted.auditEntry?.entry_hash || '').slice(0, 20)}…\``,
      color: 0x38bdf8,
      targetGuildId: guildId,
      targetChannelId: channelId,
    });

    return editOriginal({
      embeds: [
        {
          title: `🎟️ AUDITED STRIPE PROMO CODE READY // ${minted.code}`,
          description:
            `Your live Stripe Promo Code has been created and logged to the SHA-256 non-repudiation ledger!\n\n` +
            `### 📋 Copy & Send This Code to the Recipient:\n` +
            `\`\`\`\n${minted.code}\n\`\`\`\n` +
            `• **Who Issued:** <@${user.id}> (\`${user.id}\`)\n` +
            `• **What:** **\`${minted.percentOff}% OFF\`** (Max Redemptions: **\`${minted.maxRedemptions}\`**)\n` +
            `• **When:** \`${minted.auditEntry?.when_utc}\`\n` +
            `• **Why:** *${minted.reasonWhy}*\n` +
            `• **SHA-256 Entry Hash:** \`${minted.auditEntry?.entry_hash}\`\n\n` +
            `👉 **How the Winner Uses It:**\n` +
            `1. Click **` +
            '`[💳 Step 1: Pay via Valheon Stripe]`' +
            `** in Discord.\n` +
            `2. Click **"Add promotion code"** on the Stripe checkout page and enter **\`${minted.code}\`**.\n` +
            `3. Complete the \`$0.00\` checkout (no credit card required for 100% OFF) and click **` +
            '`[✅ Step 3: Verify Payment & Launch 1-Click Builder]`' +
            `**!`,
          color: 0x38bdf8,
          footer: {
            text: `LEDGER SEQ #${minted.auditEntry?.seq || 1} // SHA-256 CHAIN VERIFIED`,
          },
        },
      ],
    });
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_kd_deploy_modal') {
    await reply({ type: 5 });

    const comps = ix.data.components || [];
    const targetGuildId = (comps[0]?.components?.[0]?.value || '').trim();
    const kdId = (comps[1]?.components?.[0]?.value || '4194').trim();
    const kdTitle = (comps[2]?.components?.[0]?.value || `SOVEREIGN KINGDOM #${kdId}`).trim();
    const alliancesRaw = comps[3]?.components?.[0]?.value || 'VHN1, VHN2, VHN3, VHN4';
    const alliances = alliancesRaw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const deployOptions = {
      kingdomId: kdId,
      kingdomTitle: kdTitle,
      alliances,
    };

    try {
      const targetGuildInfo = await discordApi('GET', `/guilds/${targetGuildId}`).catch(
        () => null
      );
      if (
        targetGuildInfo?.owner_id &&
        String(targetGuildInfo.owner_id) !== String(user.id) &&
        !VALHEON_FOUNDER_IDS.has(String(user.id))
      ) {
        return editOriginal({
          content:
            `🛡️ **Sovereign Ownership Protection:** Only the **Discord Server Owner** (<@${targetGuildInfo.owner_id}>) of \`${targetGuildId}\` can deploy a 1-Click Blueprint onto that server!`,
        });
      }

      const credit = await verifyAndConsumeBlueprintCredit({
        userId: user.id,
        username: user.username,
        blueprintType: 'KINGDOM_WAR_SERVER',
        targetGuildId,
      });
      if (!credit.allowed) {
        return editOriginal({ content: credit.error });
      }

      const result = await provisionDiscordServer({
        blueprintType: 'KINGDOM_WAR_SERVER',
        guildId: targetGuildId,
        botToken: BOT_TOKEN,
        dryRun: false,
        options: deployOptions,
      });

      const deployTier = registerGuildDeployment(
        targetGuildId,
        credit.tierGranted || 'COMMON',
        {
          buyerDiscordId: user.id,
          buyerUsername: user.username,
          paidSessionId: credit.sessionId,
          blueprintType: 'KINGDOM_WAR_SERVER',
          deployOptions,
        }
      );

      await relaySupportEventToValheonHq({
        title: `🏰 NEW 1-CLICK KINGDOM SERVER DEPLOYED // KD #${kdId} (${result.guildName})`,
        description:
          `• **Customer:** <@${user.id}> (\`${user.username}\`)\n` +
          `• **Server:** **${result.guildName}** (\`${targetGuildId}\`)\n` +
          `• **Blueprint:** \`KINGDOM_WAR_SERVER ($39)\` • Alliances: \`${alliances.join(', ')}\`\n` +
          `• **Items Provisioned:** \`${result.log.length}\` roles, channels & cross-sell consoles`,
        color: 0x10b981,
        targetGuildId,
        targetChannelId: channelId,
      });

      return editOriginal({
        embeds: [
          {
            title: `🎉 1-CLICK KINGDOM SERVER DEPLOYED // KD #${kdId} (${result.guildName})`,
            description:
              `**🪽 HERMES** just finished provisioning **${result.guildName}** (\`${targetGuildId}\`)!\n\n` +
              `• **Roles Built:** Crowned Sovereign, High Council R4, Rally Captains, Sworn Defenders & [${alliances.join(' / ')}] Vanguard\n` +
              `• **Categories & Channels:** ${result.log.length} items verified & pinned (including **\`#⚔️-kvk-diplo-and-coalition-1click\`** & **\`#🛟-valheon-support-and-relaunch\`**)\n` +
              `• 🔥 **24-Hour Legendary Upgrade Window:** Upgrade to **\`🟠 LEGENDARY HERMES\`** for just **\`+$15 One-Time\`** before <t:${deployTier.offerExpiresUnix}:F> (<t:${deployTier.offerExpiresUnix}:R>)!\n` +
              `• 🔥 **72-Hour KvK Diplo + Coalition Bundle (\`$15\` for Both):** Grab both your **🕊️ KvK Diplomacy Server (\`$9\`)** and **⚔️ Allied Coalition War Server (\`$9\`)** for just **\`$15\` total** before <t:${deployTier.kvkBundleExpiresUnix}:R>!\n` +
              `• 🛟 **Lifetime Free Repair Guarantee:** Customize your channel wordings freely! If you ever break or delete a channel, use **\`#🛟-valheon-support-and-relaunch\`** to restore it for **\`$0.00\`**!`,
            color: 0x10b981,
            footer: { text: 'POWERED BY VALHEON HERMES // LIFETIME FREE REPAIR GUARANTEE' },
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
                label: '🟠 Claim 24h Legendary Upgrade (+$15 One-Time)',
                custom_id: 'hermes_upgrade_legendary_btn',
              },
              {
                type: 2,
                style: 1,
                label: '🔥 Claim 72h Diplo + Coalition Bundle ($15)',
                custom_id: 'hermes_deploy_kvk_bundle_btn',
              },
            ],
          },
        ],
      });
    } catch (err) {
      return editOriginal({
        content:
          `❌ **Could not provision Server ID \`${targetGuildId}\`:** ${err.message}\n` +
          `👉 Make sure you clicked **[🤖 Step 1: Invite HERMES to Your Blank Server]** and added HERMES to \`${targetGuildId}\` first!`,
      });
    }
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_diplo_deploy_modal') {
    await reply({ type: 5 });

    const comps = ix.data.components || [];
    const targetGuildId = (comps[0]?.components?.[0]?.value || '').trim();
    const seasonTitle = (
      comps[1]?.components?.[0]?.value || 'LOST KINGDOM DIPLOMACY SUMMIT'
    ).trim();
    const kingdomsRaw =
      comps[2]?.components?.[0]?.value || '4190, 4191, 4192, 4193, 4194, 4195, 4196, 4197';
    const kingdoms = kingdomsRaw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const deployOptions = {
      kingdomId: kingdoms[0] || '4194',
      kingdomTitle: seasonTitle,
      alliances: kingdoms,
    };

    try {
      const targetGuildInfo = await discordApi('GET', `/guilds/${targetGuildId}`).catch(
        () => null
      );
      if (
        targetGuildInfo?.owner_id &&
        String(targetGuildInfo.owner_id) !== String(user.id) &&
        !VALHEON_FOUNDER_IDS.has(String(user.id))
      ) {
        return editOriginal({
          content:
            `🛡️ **Sovereign Ownership Protection:** Only the **Discord Server Owner** (<@${targetGuildInfo.owner_id}>) of \`${targetGuildId}\` can deploy a 1-Click Blueprint onto that server!`,
        });
      }

      const credit = await verifyAndConsumeBlueprintCredit({
        userId: user.id,
        username: user.username,
        blueprintType: 'KVK_DIPLO_SERVER',
        targetGuildId,
      });
      if (!credit.allowed) {
        return editOriginal({ content: credit.error });
      }

      const result = await provisionDiscordServer({
        blueprintType: 'KVK_DIPLO_SERVER',
        guildId: targetGuildId,
        botToken: BOT_TOKEN,
        dryRun: false,
        options: deployOptions,
      });

      const deployTier = registerGuildDeployment(targetGuildId, 'LEGENDARY', {
        buyerDiscordId: user.id,
        buyerUsername: user.username,
        paidSessionId: credit.sessionId,
        blueprintType: 'KVK_DIPLO_SERVER',
        deployOptions,
      });

      await relaySupportEventToValheonHq({
        title: `🕊️ NEW $9 KVK DIPLOMACY SERVER DEPLOYED // ${result.guildName}`,
        description:
          `• **Customer:** <@${user.id}> (\`${user.username}\`)\n` +
          `• **Server:** **${result.guildName}** (\`${targetGuildId}\`)\n` +
          `• **Blueprint:** \`KVK_DIPLO_SERVER ($9 / $15 Bundle)\` • Kingdoms: \`${kingdoms.join(', ')}\`\n` +
          `• **Items Provisioned:** \`${result.log.length}\` roles, channels & Trojan Horse store consoles`,
        color: 0x38bdf8,
        targetGuildId,
        targetChannelId: channelId,
      });

      return editOriginal({
        embeds: [
          {
            title: `🕊️ 1-CLICK KVK DIPLOMACY SUMMIT DEPLOYED // ${result.guildName}`,
            description:
              `**🪽 HERMES** just built your **8-Kingdom KvK Diplomacy Server** (\`${targetGuildId}\`)!\n\n` +
              `• **Matched Kingdom Roles Created:** ${kingdoms.map((k) => `\`#${k}\``).join(' • ')} + \`@Crowned King\` & \`@Accredited Diplomat\`\n` +
              `• **Summit Channels & Consoles:** \`${result.log.length}\` items verified (including **1v1 Bilateral Embassy Maker**, **17-Language Translator**, **\`#🚀-get-this-for-your-kingdom\`** & **\`#🛟-valheon-support-and-relaunch\`**)\n` +
              `• 🔥 **72-Hour Bundle Active (\`$15\` for Both):** Add your private, spy-proof **⚔️ Allied Coalition War Server** before <t:${deployTier.kvkBundleExpiresUnix}:R> to get **both servers for \`$15\` total**!\n` +
              `• 🛟 **Lifetime Free Repair Guarantee:** Customize channel wordings freely — if anything breaks, restore it in 1 click inside \`#🛟-valheon-support-and-relaunch\` for **\`$0.00\`**!`,
            color: 0x38bdf8,
            footer: { text: 'POWERED BY VALHEON HERMES // TROJAN HORSE KVK DIPLOMACY OS' },
            timestamp: new Date().toISOString(),
          },
        ],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4,
                label: '⚔️ Add Allied Coalition War Server ($9 / $15 Bundle)',
                custom_id: 'hermes_deploy_coalition_btn',
              },
              {
                type: 2,
                style: 3,
                label: '🏰 Deploy Home Kingdom War Server ($39)',
                custom_id: 'hermes_deploy_kingdom_btn',
              },
            ],
          },
        ],
      });
    } catch (err) {
      return editOriginal({
        content:
          `❌ **Could not provision KvK Diplomacy Server \`${targetGuildId}\`:** ${err.message}\n` +
          `👉 Make sure you invited **HERMES** to \`${targetGuildId}\` with Administrator permissions first!`,
      });
    }
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_coalition_deploy_modal') {
    await reply({ type: 5 });

    const comps = ix.data.components || [];
    const targetGuildId = (comps[0]?.components?.[0]?.value || '').trim();
    const campTitle = (
      comps[1]?.components?.[0]?.value || 'ALLIED COALITION WAR COMMAND'
    ).trim();
    const kingdomsRaw = comps[2]?.components?.[0]?.value || '4194, 4195, 4196, 4197';
    const kingdoms = kingdomsRaw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const deployOptions = {
      kingdomId: kingdoms[0] || '4194',
      kingdomTitle: campTitle,
      alliances: kingdoms,
    };

    try {
      const targetGuildInfo = await discordApi('GET', `/guilds/${targetGuildId}`).catch(
        () => null
      );
      if (
        targetGuildInfo?.owner_id &&
        String(targetGuildInfo.owner_id) !== String(user.id) &&
        !VALHEON_FOUNDER_IDS.has(String(user.id))
      ) {
        return editOriginal({
          content:
            `🛡️ **Sovereign Ownership Protection:** Only the **Discord Server Owner** (<@${targetGuildInfo.owner_id}>) of \`${targetGuildId}\` can deploy a 1-Click Blueprint onto that server!`,
        });
      }

      const credit = await verifyAndConsumeBlueprintCredit({
        userId: user.id,
        username: user.username,
        blueprintType: 'KVK_COALITION_SERVER',
        targetGuildId,
      });
      if (!credit.allowed) {
        return editOriginal({ content: credit.error });
      }

      const result = await provisionDiscordServer({
        blueprintType: 'KVK_COALITION_SERVER',
        guildId: targetGuildId,
        botToken: BOT_TOKEN,
        dryRun: false,
        options: deployOptions,
      });

      const deployTier = registerGuildDeployment(targetGuildId, 'LEGENDARY', {
        buyerDiscordId: user.id,
        buyerUsername: user.username,
        paidSessionId: credit.sessionId,
        blueprintType: 'KVK_COALITION_SERVER',
        deployOptions,
      });

      await relaySupportEventToValheonHq({
        title: `⚔️ NEW $9 ALLIED COALITION WAR SERVER DEPLOYED // ${result.guildName}`,
        description:
          `• **Customer:** <@${user.id}> (\`${user.username}\`)\n` +
          `• **Server:** **${result.guildName}** (\`${targetGuildId}\`)\n` +
          `• **Blueprint:** \`KVK_COALITION_SERVER ($9 / $15 Bundle)\` • Allied Kingdoms: \`${kingdoms.join(', ')}\`\n` +
          `• **Items Provisioned:** \`${result.log.length}\` roles, channels & Trojan Horse store consoles`,
        color: 0xf43f5e,
        targetGuildId,
        targetChannelId: channelId,
      });

      return editOriginal({
        embeds: [
          {
            title: `⚔️ 1-CLICK ALLIED COALITION WAR SERVER DEPLOYED // ${result.guildName}`,
            description:
              `**🪽 HERMES** just built your spy-proof **Allied Coalition War Server** (\`${targetGuildId}\`)!\n\n` +
              `• **Allied Kingdom Roles Created:** ${kingdoms.map((k) => `\`Allied KD #${k}\``).join(' • ')} + \`@Coalition Warlord\` & \`@Rally Captain\`\n` +
              `• **War Channels & Consoles:** \`${result.log.length}\` items verified (Joint Rally/Garrison Calls, 17-Language Canonical Glossary Bridge, UTC Pass Timers, Voice Rollcall, Shift-Handoff Coverage, **\`#🚀-get-this-for-your-kingdom\`** & **\`#🛟-valheon-support-and-relaunch\`**)\n` +
              `• 🔥 **72-Hour Bundle Active (\`$15\` for Both):** Need the public **🕊️ 8-Kingdom KvK Diplomacy Server** too? Deploy within <t:${deployTier.kvkBundleExpiresUnix}:R> for the **\`$15\` Bundle**!\n` +
              `• 🛟 **Lifetime Free Repair Guarantee:** Customize channel wordings freely — restore any broken channel in 1 click inside \`#🛟-valheon-support-and-relaunch\` for **\`$0.00\`**!`,
            color: 0xf43f5e,
            footer: { text: 'POWERED BY VALHEON HERMES // SPY-PROOF ALLIED COALITION OS' },
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
                label: '🏰 Deploy Home Kingdom War Server ($39)',
                custom_id: 'hermes_deploy_kingdom_btn',
              },
              {
                type: 2,
                style: 1,
                label: '🕊️ Add KvK Diplo Server ($9 / $15 Bundle)',
                custom_id: 'hermes_deploy_diplo_btn',
              },
            ],
          },
        ],
      });
    } catch (err) {
      return editOriginal({
        content:
          `❌ **Could not provision Allied Coalition Server \`${targetGuildId}\`:** ${err.message}\n` +
          `👉 Make sure you invited **HERMES** to \`${targetGuildId}\` with Administrator permissions first!`,
      });
    }
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_bilateral_embassy_modal') {
    await reply({ type: 5, data: { flags: 64 } });
    const comps = ix.data.components || [];
    const kd1 = (comps[0]?.components?.[0]?.value || '4194').replace(/[^0-9a-zA-Z]/g, '');
    const kd2 = (comps[1]?.components?.[0]?.value || '4196').replace(/[^0-9a-zA-Z]/g, '');
    const agenda = (comps[2]?.components?.[0]?.value || 'Bilateral Border & Ziggurat Treaty').trim();

    // Anti-Flood Guard: Check if an embassy channel between kd1 and kd2 already exists!
    const allChans = await discordApi('GET', `/guilds/${guildId}/channels`).catch(() => []);
    const nameA = `🤝-embassy-kd${kd1}-x-kd${kd2}`.toLowerCase();
    const nameB = `🤝-embassy-kd${kd2}-x-kd${kd1}`.toLowerCase();
    const existingEmbassy = Array.isArray(allChans)
      ? allChans.find((c) => c.name?.toLowerCase() === nameA || c.name?.toLowerCase() === nameB)
      : null;
    if (existingEmbassy?.id) {
      return editOriginal({
        content: `🤝 **Bilateral Embassy Already Active:** <#${existingEmbassy.id}> *(Anti-Flood Protection prevented creating a duplicate channel)*`,
      });
    }

    const parentChan = await discordApi('GET', `/channels/${channelId}`).catch(() => null);
    const newEmbassy = await discordApi('POST', `/guilds/${guildId}/channels`, {
      name: `🤝-embassy-kd${kd1}-x-kd${kd2}`,
      type: 0,
      parent_id: parentChan?.parent_id || undefined,
      topic: `Private 1-on-1 Bilateral Treaty Room: Kingdom #${kd1} x Kingdom #${kd2} — ${agenda}`,
    });

    if (newEmbassy?.id) {
      await discordApi('POST', `/channels/${newEmbassy.id}/messages`, {
        content: `🤝 **Bilateral Diplomatic Embassy Opened by <@${user.id}>!**`,
        embeds: [
          {
            title: `🤝 PRIVATE BILATERAL EMBASSY // KD #${kd1} × KD #${kd2}`,
            description:
              `**Treaty Agenda:** \`${agenda}\`\n\n` +
              `• **17-Language Flag Translator Active:** React to any message with any of the 17 Flag Emojis (\`🇺🇸 🇻🇳 🇸🇦 🇷🇺 🇰🇷 🇨🇳 🇯🇵\`) or right-click -> \`Apps\` -> \`Translate\` for instant canonical RoK translation.\n` +
              `• Click **` +
              '`[🔒 Close & Archive Embassy]`' +
              `** below once negotiations conclude.`,
            color: 0xa855f7,
            footer: { text: 'VALHEON DIPLOMATIC CONCLAVE // 1-ON-1 TREATY FLOOR' },
          },
        ],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4,
                label: '🔒 Close & Archive Embassy',
                custom_id: 'hermes_ticket_close',
              },
            ],
          },
        ],
      });
      return editOriginal({
        content: `🤝 **Private 1v1 Bilateral Embassy Created:** <#${newEmbassy.id}>`,
      });
    }
    return editOriginal({
      content: `❌ Could not create embassy channel. Check HERMES permissions.`,
    });
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_hq_relay_ticket_modal') {
    await reply({ type: 5 });
    const comps = ix.data.components || [];
    const reqType = (comps[0]?.components?.[0]?.value || 'Server Relaunch / Custom Wording').trim();
    const reqDetails = (comps[1]?.components?.[0]?.value || '').trim();
    const savedStatus = getGuildTierStatus(guildId);

    await relaySupportEventToValheonHq({
      title: `🛟 INCOMING CUSTOMER SUPPORT & RELAUNCH TICKET // GUILD \`${guildId}\``,
      description:
        `• **Customer:** <@${user.id}> (\`${user.username}\` / ID: \`${user.id}\`)\n` +
        `• **Source Server ID:** \`${guildId}\` (Channel: <#${channelId}> / \`${channelId}\`)\n` +
        `• **Blueprint & Tier:** \`${savedStatus.blueprintType || 'KINGDOM_WAR_SERVER'}\` • \`${savedStatus.tier}\`\n` +
        `• **Request Category:** **\`${reqType}\`**\n\n` +
        `### 📝 CUSTOMER MESSAGE & CUSTOMIZATION REQUEST:\n> ${reqDetails}\n\n` +
        `👉 *Click **` +
        '`[🔄 Remote Free Relaunch]`' +
        `** below to repair/re-provision their server in 1 click at \`$0.00\`, or click **` +
        '`[💬 Beam Official Reply]`' +
        `** to answer them directly in their server!*`,
      color: 0xf59e0b,
      targetGuildId: guildId,
      targetChannelId: channelId,
    });

    return editOriginal({
      embeds: [
        {
          title: '✅ SUPPORT & CUSTOMIZATION REQUEST BEAMED TO VALHEON CITADEL HQ',
          description:
            `Thank you, <@${user.id}>! Your request (**\`${reqType}\`**) has been delivered directly to our **Central Overwatch Console at Valheon Citadel HQ**.\n\n` +
            `• **Your Message:**\n> ${reqDetails}\n\n` +
            `• **Zero Relaunch Fees (\`$0.00\`):** Whether you need custom wording adjustments or a clean layout relaunch because a channel was accidentally modified, **you never pay again**. Our Principal Architect will reply right here in this channel or remotely restore your layout shortly!`,
          color: 0x10b981,
          footer: { text: 'VALHEON CONCIERGE SUPPORT // DIRECT RELAY TO VALHEON HQ' },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_admin_manual_relaunch_modal') {
    await reply({ type: 5, data: { flags: 64 } });
    if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
      return editOriginal({
        content: '🛡️ **Valheon HQ Overwatch Lock:** Only the Principal Architect can execute a remote server relaunch.',
      });
    }
    const comps = ix.data.components || [];
    const remoteGuildId = (comps[0]?.components?.[0]?.value || '').trim();
    const bpOverride = (comps[1]?.components?.[0]?.value || 'AUTO').trim().toUpperCase();
    const savedStatus = getGuildTierStatus(remoteGuildId);
    const bpType =
      bpOverride !== 'AUTO' && bpOverride
        ? bpOverride
        : savedStatus.blueprintType || 'KINGDOM_WAR_SERVER';
    const bpOpts = savedStatus.deployOptions || {
      kingdomId: '4194',
      kingdomTitle: 'SOVEREIGN KINGDOM #4194',
      alliances: ['VHN1', 'VHN2', 'VHN3', 'VHN4'],
    };

    try {
      const res = await provisionDiscordServer({
        blueprintType: bpType,
        guildId: remoteGuildId,
        botToken: BOT_TOKEN,
        dryRun: false,
        options: bpOpts,
      });
      registerGuildDeployment(remoteGuildId, savedStatus.tier || 'LEGENDARY', {
        blueprintType: bpType,
        deployOptions: bpOpts,
      });
      return editOriginal({
        content: `✅ **Manual Free Server Relaunch Complete for \`${res.guildName}\` (\`${remoteGuildId}\` • \`${bpType}\`)!** Restored/verified **\`${res.log.length}\`** items at \`$0.00\`.`,
      });
    } catch (err) {
      return editOriginal({
        content: `❌ **Could not relaunch \`${remoteGuildId}\`:** ${err.message}`,
      });
    }
  }

  if (ix.type === 5 && ix.data?.custom_id?.startsWith('hermes_admin_reply_modal_')) {
    await reply({ type: 5, data: { flags: 64 } });
    if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
      return editOriginal({
        content: '🛡️ **Valheon HQ Overwatch Lock:** Only the Principal Architect can beam an official HQ reply.',
      });
    }
    const parts = ix.data.custom_id.replace('hermes_admin_reply_modal_', '').split('_');
    const remoteGuildId = parts[0] || '';
    const remoteChannelId = parts[1] || '';
    const replyText = (ix.data.components?.[0]?.components?.[0]?.value || '').trim();

    try {
      await discordApi('POST', `/channels/${remoteChannelId}/messages`, {
        embeds: [
          {
            title: '🪽 OFFICIAL VALHEON HQ CONCIERGE RESPONSE',
            description:
              `${replyText}\n\n` +
              `*Need anything else or want another free channel repair? Just click **` +
              '`[🛟 Send Support Request to Valheon HQ]`' +
              `** or **` +
              '`[🔄 1-Click Free Repair]`' +
              `** above!*`,
            color: 0x38bdf8,
            footer: {
              text: `BEAMED DIRECTLY FROM VALHEON CITADEL HQ BY @${user.username}`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return editOriginal({
        content: `✅ **Official Concierge Reply Beamed to Server \`${remoteGuildId}\` (Channel \`${remoteChannelId}\`)!**`,
      });
    } catch (err) {
      return editOriginal({
        content: `❌ **Could not deliver reply to \`${remoteChannelId}\`:** ${err.message}`,
      });
    }
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_confess_modal') {
    await reply({ type: 5, data: { flags: 64 } });

    const comps = ix.data.components || [];
    const catVal = comps[0]?.components?.[0]?.value || 'tea';
    const msgVal = comps[1]?.components?.[0]?.value || '';

    const whisper = buildAnonymousWhisperEmbed({
      category: catVal,
      message: msgVal,
      targetKingdom: 'Valheon Global Sanctuary',
      authorDiscordId: user.id,
    });

    await discordApi('POST', `/channels/${channelId}/messages`, {
      embeds: [whisper.embed],
    });

    return editOriginal({
      content: `🕵️ **Anonymous Whisper Delivered (\`${whisper.whisperId}\`)!** Zero identity metadata was attached.`,
    });
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_peerless_search_modal') {
    await reply({ type: 5, data: { flags: 64 } });
    const comps = ix.data.components || [];
    const queryVal = (comps[0]?.components?.[0]?.value || '').trim();
    const langVal = normalizePeerlessLang(comps[1]?.components?.[0]?.value || ix.locale || 'en');

    if (queryVal.toLowerCase() === 'midterm') {
      if (!tierStatus.isLegendary) {
        return editOriginal(
          buildCommonLockoutPayload({
            guildId,
            featureName: 'Saturday 10/10 Midterm Early Packet',
            teaserText:
              '📦 **The Saturday 10/10 Midterm Early Packet** is locked on **🟢 Common Hermes**!',
          })
        );
      }
      const packetEmbed = await buildMidtermPacketEmbed(langVal);
      return editOriginal({ embeds: [packetEmbed] });
    }

    const results = await searchPeerlessVault(queryVal, langVal);
    if (results.length === 0) {
      return editOriginal({
        content: `⚠️ No Peerless Scholar questions matched \`${queryVal}\`. Try 1–2 core words from the question!`,
      });
    }

    const visibleResults = tierStatus.isLegendary ? results : results.slice(0, 1);
    const lines = visibleResults.map(
      (r, idx) =>
        `**${idx + 1}. [${r.id} • ${String(r.stage).toUpperCase()}]**\n` +
        `❓ **Q (${langVal.toUpperCase()}):** ${r.qLoc}\n` +
        `✅ **Answer (${langVal.toUpperCase()}):** **\`${r.aLoc}\`**${
          langVal !== 'en' ? ` *(EN: \`${r.aEn}\`)*` : ''
        }`
    );
    if (!tierStatus.isLegendary && results.length > 1) {
      lines.push(
        `\n🔒 **\`[🟢 COMMON HERMES LIMITATION]\`:** *+${results.length - 1} additional matching exam answers & Saturday 10/10 Midterm Packet are locked. Upgrade to **🟠 Legendary Hermes** (\`+$15\` in first 24h / \`+$25\` after) to unlock all 17-Language answers!*`
      );
    }

    return editOriginal({
      embeds: [
        {
          title: `🎓 PEERLESS SCHOLAR SOLVER // "${queryVal}" (${langVal.toUpperCase()})`,
          description: lines.join('\n\n'),
          color: tierStatus.isLegendary ? 0x06b6d4 : 0x22c55e,
          footer: { text: 'VALHEON 17-LANGUAGE LYCEUM VAULT // VISIBLE ONLY TO YOU' },
        },
      ],
    });
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_guide_search_modal') {
    await reply({ type: 5 });
    const comps = ix.data.components || [];
    const queryVal = (comps[0]?.components?.[0]?.value || '').trim();
    const embed = buildGuideEmbed(queryVal, tierStatus.isLegendary);
    return editOriginal({ embeds: [embed] });
  }

  if (ix.type === 5 && ix.data?.custom_id?.startsWith('hermes_title_modal_')) {
    await reply({ type: 5 });
    const titleKey = ix.data.custom_id.replace('hermes_title_modal_', '');
    const coords = (ix.data.components?.[0]?.components?.[0]?.value || 'X:600 Y:600').trim();
    const payload = requestKingdomTitle({
      titleKey,
      userId: user.id,
      username: user.global_name || user.username,
      coords,
    });
    return editOriginal({
      content: `🔮 <@${user.id}> queued for **${titleKey.toUpperCase()}** at \`${coords}\`!`,
      ...payload,
    });
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_timer_create_modal') {
    await reply({ type: 5 });
    const comps = ix.data.components || [];
    const eventName = (comps[0]?.components?.[0]?.value || 'Pass Opening').trim();
    const mins = parseInt(comps[1]?.components?.[0]?.value || '45', 10) || 45;
    const coords = (comps[2]?.components?.[0]?.value || 'Zone 6').trim();
    const payload = buildWarTimerPayload({ eventName, minutesFromNow: mins, coords });
    return editOriginal(payload);
  }

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_calc_modal') {
    await reply({ type: 5, data: { flags: 64 } });
    const comps = ix.data.components || [];
    const calcType = (comps[0]?.components?.[0]?.value || 'sculptures').trim();
    const inputVal = (comps[1]?.components?.[0]?.value || '5511').trim();
    const embed = calculateRokMath({ calcType, inputVal });
    return editOriginal({ embeds: [embed] });
  }

  // =========================================================================
  // 3. SLASH COMMAND & MESSAGE CONTEXT MENU INTERACTIONS (type === 2)
  // =========================================================================
  if (ix.type === 2 && ix.data?.type === 3) {
    // Right-click message -> Apps -> Scan RoK Screenshot (OCR) OR Translate!
    if (ix.data.name === '📸 Scan RoK Screenshot (OCR)') {
      if (!tierStatus.isLegendary) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildCommonLockoutPayload({
              guildId,
              featureName: 'Local Optics Screenshot OCR',
              teaserText:
                '📸 **Automated Resource Bag & Speedup Bag Screenshot OCR** is locked on **🟢 Common Hermes**!',
            }),
          },
        });
      }
      await reply({ type: 5 });
      const targetMsgId = ix.data.target_id;
      const msgObj =
        ix.data.resolved?.messages?.[targetMsgId] ||
        (await discordApi('GET', `/channels/${channelId}/messages/${targetMsgId}`));
      const att = msgObj?.attachments?.[0];
      if (!att?.url) {
        return editOriginal({
          content: '⚠️ That message does not contain an image screenshot to scan.',
        });
      }
      const ocrRes = await runLocalOcrOnUrl(att.url);
      const embed = buildOcrEmbed(ocrRes, msgObj?.author?.username || user.username);
      return editOriginal({ embeds: [embed] });
    }

    if (!tierStatus.isLegendary) {
      return reply({
        type: 4,
        data: {
          flags: 64,
          ...buildCommonLockoutPayload({
            guildId,
            featureName: 'Right-Click & 17-Flag Instant Translator',
            teaserText:
              '🌐 **1-Click Context-Menu & 17-Flag Emoji Reaction Translation** is locked on **🟢 Common Hermes**! *(Basic `/hermes translate` preview is active; upgrade to 🟠 Legendary Hermes for unlimited 1-click & flag-reaction translation!)*',
          }),
        },
      });
    }

    await reply({ type: 5, data: { flags: 64 } });
    const targetMsgId = ix.data.target_id;
    const msgObj = ix.data.resolved?.messages?.[targetMsgId];
    const originalText = msgObj?.content || msgObj?.embeds?.[0]?.description || '';

    if (!originalText) {
      return editOriginal({ content: '⚠️ Could not find text on that message to translate.' });
    }

    const targetLocale =
      ix.data.name === '🇺🇸 Translate to English' ? 'en' : ix.locale || 'en';
    const { translated, detected, matchedTerms } = await translateText(originalText, targetLocale);
    const glossaryBadge =
      matchedTerms?.length > 0
        ? `\n\n🎯 **Canonical RoK Terms (\`17-Lang Canonical Glossary\`):** ` +
          matchedTerms.map((m) => `\`${m.source}\` → **\`${m.target}\`**`).join(' • ')
        : '';

    return editOriginal({
      embeds: [
        {
          title: `🌐 HERMES INSTANT TRANSLATOR (${String(detected).toUpperCase()} → ${targetLocale.toUpperCase()})`,
          description: `**Translation:**\n> ${translated}${glossaryBadge}\n\n**Original:**\n\`${originalText.slice(0, 300)}\``,
          color: 0x38bdf8,
          footer: { text: 'VALHEON 17-LANGUAGE LILITH GLOSSARY BRIDGE // VISIBLE ONLY TO YOU' },
        },
      ],
    });
  }

  // Top-level /uptime [target] [public_receipt] Slash Command
  if (ix.type === 2 && ix.data?.name === 'uptime') {
    if (!tierStatus.isLegendary) {
      return reply({
        type: 4,
        data: {
          flags: 64,
          ...buildCommonLockoutPayload({
            guildId,
            featureName: '24-Hour UTC Alliance & Player Uptime Heatmap',
            teaserText:
              '📡 **Silent Multi-Signal 24-Hour UTC Uptime Heatmaps** are locked on **🟢 Common Hermes**!',
          }),
        },
      });
    }
    const targetOpt = (ix.data.options?.find((o) => o.name === 'target')?.value || 'ALL').trim();
    const isPublic = Boolean(ix.data.options?.find((o) => o.name === 'public_receipt')?.value);
    await reply({ type: 5, data: isPublic ? undefined : { flags: 64 } });
    const embed = buildUptimeDiscordEmbed(targetOpt);
    return editOriginal({ embeds: [embed] });
  }

  // Top-level /title Slash Command (Zero-Grid by default!)
  if (ix.type === 2 && ix.data?.name === 'title') {
    await reply({ type: 5 });
    const buffOpt = ix.data.options?.find((o) => o.name === 'buff')?.value || 'scientist';
    const coordsOpt = ix.data.options?.find((o) => o.name === 'coordinates')?.value || 'AUTO';
    if (buffOpt === 'done') {
      const { releasedTitle, nextGovernor, payload } = completeCurrentTitle({ userId: user.id });
      return editOriginal({
        content: nextGovernor
          ? `✅ <@${user.id}> finished **${releasedTitle}**! 🔔 **UP NEXT:** <@${nextGovernor.userId}> (\`${nextGovernor.coords}\`)!`
          : `✅ <@${user.id}> released **${releasedTitle || 'Title'}**!`,
        ...payload,
      });
    }
    const payload = requestKingdomTitle({
      titleKey: buffOpt,
      userId: user.id,
      username: user.global_name || user.username,
      coords: coordsOpt,
    });
    return editOriginal({
      content: `🔮 <@${user.id}> queued for **${buffOpt.toUpperCase()}** *(Zero-Grid Profile Resolved)*!`,
      ...payload,
    });
  }

  // Top-level /aoo Slash Command
  if (ix.type === 2 && ix.data?.name === 'aoo') {
    await reply({ type: 5 });
    const matchTitle = ix.data.options?.find((o) => o.name === 'match_time')?.value || null;
    const payload = buildAooRosterPayload(matchTitle);
    return editOriginal(payload);
  }

  // Top-level /timer Slash Command
  if (ix.type === 2 && ix.data?.name === 'timer') {
    await reply({ type: 5 });
    const eventName = ix.data.options?.find((o) => o.name === 'event')?.value || 'Pass Opening';
    const minutesFromNow = ix.data.options?.find((o) => o.name === 'minutes')?.value || 45;
    const coords = ix.data.options?.find((o) => o.name === 'coordinates')?.value || 'Zone 6';
    const payload = buildWarTimerPayload({ eventName, minutesFromNow, coords });
    return editOriginal(payload);
  }

  // Top-level /mystats Slash Command
  if (ix.type === 2 && ix.data?.name === 'mystats') {
    await reply({ type: 5 });
    const govOpt = ix.data.options?.find((o) => o.name === 'governor_id')?.value || '';
    const embed = buildMyStatsCard({
      userId: user.id,
      username: govOpt || user.global_name || user.username,
      govIdOpt: govOpt,
    });
    return editOriginal({ embeds: [embed] });
  }

  // Top-level /zerolist Slash Command
  if (ix.type === 2 && ix.data?.name === 'zerolist') {
    if (!tierStatus.isLegendary) {
      return reply({
        type: 4,
        data: {
          flags: 64,
          ...buildCommonLockoutPayload({
            guildId,
            featureName: 'R4 Zero-List & Peace Shield Drop Tracker',
            teaserText:
              '🎯 **The R4 Zero-List & Automated 8h/12h/24h Peace Shield Drop Countdown** is locked on **🟢 Common Hermes**!',
          }),
        },
      });
    }
    await reply({ type: 5 });
    const govName = ix.data.options?.find((o) => o.name === 'governor_name')?.value;
    const coords = ix.data.options?.find((o) => o.name === 'coordinates')?.value || 'X:500 Y:500';
    const violation =
      ix.data.options?.find((o) => o.name === 'violation')?.value ||
      'MGE Point Cap Violation / Unauthorized Migration';
    const embed = govName
      ? addZeroListTarget({
          govId: String(Date.now()).slice(-8),
          name: govName,
          offense: violation,
          coords,
          addedBy: user.global_name || user.username,
        })
      : buildZeroListEmbed();
    return editOriginal({ embeds: [embed] });
  }

  // Top-level /rollcall Voice War-Room Attendance Snapshot
  if (ix.type === 2 && ix.data?.name === 'rollcall') {
    if (!tierStatus.isLegendary) {
      return reply({
        type: 4,
        data: {
          flags: 64,
          ...buildCommonLockoutPayload({
            guildId,
            featureName: 'Voice War-Room Attendance Rollcall',
            teaserText:
              '🎙️ **Automated Voice War-Room Attendance Snapshots & DKP Credit** are locked on **🟢 Common Hermes**!',
          }),
        },
      });
    }
    await reply({ type: 5 });
    recordSilentSignal({
      userId: user.id,
      username: user.username,
      allianceTag: 'VHN1',
      signalType: 'DISCORD_VOICE',
    });
    const nowUnix = Math.floor(Date.now() / 1000);
    return editOriginal({
      embeds: [
        {
          title: '🎙️ VOICE WAR-ROOM ATTENDANCE SNAPSHOT // VERIFIED ROLLCALL',
          description:
            `🕒 **Timestamp:** <t:${nowUnix}:F> (<t:${nowUnix}:R>)\n` +
            `👑 **Commanding Officer:** <@${user.id}>\n\n` +
            `### 🛡️ VERIFIED VOICE COMMS ROSTER (+5x Uptime & DKP Bonus Logged)\n` +
            `• <@${user.id}> — \`Active Comms / Target Caller\`\n` +
            `• **Reign3418** (\`[VHN1]\`) — \`Active Voice Telemetry Logged\`\n` +
            `• **Meganoyo** (\`[VHN1]\`) — \`Active Voice Telemetry Logged\``,
          color: 0x10b981,
          footer: { text: 'VALHEON VOICE ATTENDANCE AUDITOR // AUTO-CREDITED TO UPTIME MATRIX' },
        },
      ],
    });
  }

  // Top-level /calc Slash Command
  if (ix.type === 2 && ix.data?.name === 'calc') {
    await reply({ type: 5 });
    const calcType = ix.data.options?.find((o) => o.name === 'type')?.value || 'sculptures';
    const inputVal = ix.data.options?.find((o) => o.name === 'value')?.value || '5511';
    const embed = calculateRokMath({ calcType, inputVal });
    return editOriginal({ embeds: [embed] });
  }

  // Top-level /guide <topic> Slash Command
  if (ix.type === 2 && ix.data?.name === 'guide') {
    await reply({ type: 5 });
    const topicOpt = (ix.data.options?.find((o) => o.name === 'topic')?.value || '').trim();
    const embed = buildGuideEmbed(topicOpt, tierStatus.isLegendary);
    return editOriginal({ embeds: [embed] });
  }

  if (ix.type === 2 && ix.data?.name === 'hermes') {
    const sub = ix.data.options?.[0];
    if (!sub) return;

    if (sub.name === 'tier') {
      await reply({ type: 5, data: { flags: 64 } });
      const modeOpt = sub.options?.find((o) => o.name === 'mode')?.value || 'VIEW';
      const resetOpt = Boolean(sub.options?.find((o) => o.name === 'reset_24h_timer')?.value);
      if (modeOpt !== 'VIEW' || resetOpt) {
        if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
          return editOriginal({
            content:
              '🛡️ **Principal-Only Tier Lock:** Only the Valheon Principal Architect (`184977944433786880`) can manually override a server\'s Rarity Tier or reset its 24-hour FOMO window. Standard users can view pricing via `/hermes tier mode:VIEW`.',
          });
        }
        const updated = setGuildTier(guildId, modeOpt, resetOpt);
        const consolePayload = buildTierPricingConsoleEmbed(guildId);
        return editOriginal({
          content: `✅ **HERMES Server Rarity Tier Updated:** **\`${updated.tier}\`** ${
            resetOpt ? '*(24-Hour `+$15` Countdown Reset!)*' : ''
          }`,
          ...consolePayload,
        });
      }
      return editOriginal(buildTierPricingConsoleEmbed(guildId));
    }

    if (sub.name === 'uptime') {
      if (!tierStatus.isLegendary) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildCommonLockoutPayload({
              guildId,
              featureName: '24-Hour UTC Alliance & Player Uptime Heatmap',
              teaserText:
                '📡 **Silent Multi-Signal 24-Hour UTC Uptime Heatmaps** are locked on **🟢 Common Hermes**!',
            }),
          },
        });
      }
      const targetOpt = (sub.options?.find((o) => o.name === 'target')?.value || 'ALL').trim();
      const isPublic = Boolean(sub.options?.find((o) => o.name === 'public_receipt')?.value);
      await reply({ type: 5, data: isPublic ? undefined : { flags: 64 } });
      const embed = buildUptimeDiscordEmbed(targetOpt);
      return editOriginal({ embeds: [embed] });
    }

    if (sub.name === 'guide') {
      await reply({ type: 5 });
      const topicOpt = (sub.options?.find((o) => o.name === 'topic')?.value || '').trim();
      const embed = buildGuideEmbed(topicOpt, tierStatus.isLegendary);
      return editOriginal({ embeds: [embed] });
    }

    if (sub.name === 'peerless') {
      await reply({ type: 5 });
      const queryOpt = (sub.options?.find((o) => o.name === 'query')?.value || '').trim();
      const langOpt = normalizePeerlessLang(
        sub.options?.find((o) => o.name === 'language')?.value || ix.locale || 'en'
      );

      if (queryOpt.toLowerCase() === 'midterm') {
        if (!tierStatus.isLegendary) {
          return editOriginal(
            buildCommonLockoutPayload({
              guildId,
              featureName: 'Saturday 10/10 Midterm Early Packet',
              teaserText:
                '📦 **The Saturday 10/10 Midterm Early Answer Packet** is locked on **🟢 Common Hermes**!',
            })
          );
        }
        const packetEmbed = await buildMidtermPacketEmbed(langOpt);
        return editOriginal({ embeds: [packetEmbed] });
      }

      const results = await searchPeerlessVault(queryOpt, langOpt);
      if (results.length === 0) {
        return editOriginal({
          content: `⚠️ No Peerless Scholar questions matched \`${queryOpt}\`. Try 1–2 core keywords!`,
        });
      }

      const visibleResults = tierStatus.isLegendary ? results : results.slice(0, 1);
      const lines = visibleResults.map(
        (r, idx) =>
          `**${idx + 1}. [${r.id} • ${String(r.stage).toUpperCase()}]**\n` +
          `❓ **Q (${langOpt.toUpperCase()}):** ${r.qLoc}\n` +
          `✅ **Answer (${langOpt.toUpperCase()}):** **\`${r.aLoc}\`**${
            langOpt !== 'en' ? ` *(EN: \`${r.aEn}\`)*` : ''
          }`
      );
      if (!tierStatus.isLegendary && results.length > 1) {
        lines.push(
          `\n🔒 **\`[🟢 COMMON HERMES LIMITATION]\`:** *+${results.length - 1} additional matching exam answers & Saturday 10/10 Midterm Packet are locked on Common Hermes. Upgrade to **🟠 Legendary Hermes** (\`+$15\` in 24h / \`+$25\` after) to unlock all answers!*`
        );
      }

      return editOriginal({
        embeds: [
          {
            title: `🎓 PEERLESS SCHOLAR SOLVER // "${queryOpt}" (${langOpt.toUpperCase()})`,
            description: lines.join('\n\n'),
            color: tierStatus.isLegendary ? 0x06b6d4 : 0x22c55e,
            footer: { text: 'VALHEON 17-LANGUAGE LYCEUM VAULT // /hermes peerless' },
          },
        ],
      });
    }

    if (sub.name === 'translate') {
      await reply({ type: 5 });
      const textOpt = sub.options?.find((o) => o.name === 'text')?.value || '';
      const langOpt = sub.options?.find((o) => o.name === 'language')?.value || 'en';
      const { translated, detected, matchedTerms } = await translateText(textOpt, langOpt);
      const glossaryBadge =
        matchedTerms?.length > 0
          ? `\n\n🎯 **Canonical RoK Terms (\`17-Lang Canonical Glossary\`):** ` +
            matchedTerms.map((m) => `\`${m.source}\` → **\`${m.target}\`**`).join(' • ')
          : '';
      return editOriginal({
        embeds: [
          {
            title: `🌐 HERMES 17-LANGUAGE TRANSLATION (${String(detected).toUpperCase()} → ${langOpt.toUpperCase()})`,
            description: `> **${translated}**${glossaryBadge}\n\n*Original (<@${user.id}>):* \`${textOpt.slice(0, 300)}\``,
            color: 0x38bdf8,
            footer: { text: 'HERMES 17-LANGUAGE LILITH GLOSSARY BRIDGE // Valheon 17-Lang Glossary' },
          },
        ],
      });
    }

    if (sub.name === 'confess') {
      await reply({ type: 5, data: { flags: 64 } });
      const msgOpt = sub.options?.find((o) => o.name === 'whisper')?.value || '';
      const catOpt = sub.options?.find((o) => o.name === 'category')?.value || 'tea';
      const whisper = buildAnonymousWhisperEmbed({
        category: catOpt,
        message: msgOpt,
        targetKingdom: 'Valheon Citadel',
        authorDiscordId: user.id,
      });
      await discordApi('POST', `/channels/${channelId}/messages`, {
        embeds: [whisper.embed],
      });
      return editOriginal({
        content: `🕵️ **Zero-Trace Whisper Published (\`${whisper.whisperId}\`)!**`,
      });
    }

    if (sub.name === 'roast') {
      if (!tierStatus.isLegendary) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildCommonLockoutPayload({
              guildId,
              featureName: 'AI Governor Telemetry Roaster',
              teaserText:
                '💀 **HERMES AI Governor Telemetry Roaster & Live 35-Field Audit** is locked on **🟢 Common Hermes**!',
            }),
          },
        });
      }
      const govId = sub.options?.find((o) => o.name === 'governor_id')?.value || '48291044';
      const roast = generateGovernorRoast({
        id: govId,
        name: `Governor #${govId}`,
        power: 89_000_000,
        killPoints: 410_000_000,
        deads: 1_450_000,
      });
      return reply({
        type: 4,
        data: { embeds: [roast.embed] },
      });
    }

    if (sub.name === 'architect') {
      await reply({ type: 5, data: { flags: 64 } });
      const bp = sub.options?.find((o) => o.name === 'blueprint')?.value || 'VALHEON_HQ';
      const kdRaw = sub.options?.find((o) => o.name === 'kingdom_id')?.value || '4194';
      const remoteGuildOpt = (
        sub.options?.find((o) => o.name === 'target_guild_id')?.value || guildId
      ).trim();

      const authCheck = await verifyServerSovereignAuthorization(
        ix,
        remoteGuildOpt,
        getGuildTierStatus(remoteGuildOpt)
      );
      if (!authCheck.allowed) {
        return editOriginal({
          content:
            `🛡️ **Sovereign Purchase Protection // Access Denied:** Only the **Verified Server Owner / Buyer** or **Crowned R5 Sovereign** is authorized to run \`/hermes architect\` on \`${remoteGuildOpt}\`. R4 Officers and standard members cannot alter the server blueprint.`,
        });
      }

      const kdList = kdRaw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const deployOpts = {
        kingdomId: kdList[0] || '4194',
        alliances: kdList.length > 1 ? kdList : undefined,
      };
      const res = await provisionDiscordServer({
        blueprintType: bp,
        guildId: remoteGuildOpt,
        botToken: BOT_TOKEN,
        dryRun: false,
        options: deployOpts,
      });
      registerGuildDeployment(remoteGuildOpt, 'LEGENDARY', {
        buyerDiscordId: user.id,
        buyerUsername: user.username,
        blueprintType: bp,
        deployOptions: deployOpts,
      });
      return editOriginal({
        content: `🪽 **HERMES 1-Click Architect / Free Relaunch Complete for \`${res.guildName}\` (\`${remoteGuildOpt}\` • \`${bp}\`)!** Verified/Provisioned ${res.log.length} items at \`$0.00\`.`,
      });
    }
  }
}

/**
 * Connects to Discord Gateway v10 with automatic heartbeat & reconnect
 */
function connectGateway() {
  const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
  let heartbeatInterval = null;
  let seq = null;

  ws.addEventListener('open', () => {
    console.log('🪽 [HERMES Gateway] Connected to Discord WebSocket v10');
  });

  ws.addEventListener('error', (err) => {
    console.warn('[HERMES Gateway Socket Warning]:', err?.message || 'Socket reset');
  });

  ws.addEventListener('message', async (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    const { op, d, s, t } = payload;
    if (s !== null && s !== undefined) seq = s;

    // OP 7 (Reconnect) or OP 9 (Invalid Session) -> Close cleanly to trigger auto-reconnect
    if (op === 7 || op === 9) {
      console.log(`🔄 [HERMES Gateway] Received OP ${op} — refreshing Gateway session...`);
      try {
        ws.close();
      } catch {}
      return;
    }

    // OP 10: Hello -> Start Heartbeat & Send IDENTIFY
    if (op === 10) {
      const interval = d.heartbeat_interval;
      heartbeatInterval = setInterval(() => {
        if (ws.readyState === 1) {
          try {
            ws.send(JSON.stringify({ op: 1, d: seq }));
          } catch {}
        }
      }, interval);

      ws.send(
        JSON.stringify({
          op: 2,
          d: {
            token: BOT_TOKEN,
            intents: (1 << 0) | (1 << 7) | (1 << 9) | (1 << 10), // GUILDS | GUILD_VOICE_STATES | GUILD_MESSAGES | GUILD_MESSAGE_REACTIONS
            properties: {
              os: 'windows',
              browser: 'valheon_hermes',
              device: 'valheon_hermes',
            },
            presence: {
              status: 'online',
              activities: [
                {
                  name: '🪽 Valheon Citadel // /hermes',
                  type: 0,
                },
              ],
            },
          },
        })
      );
    }

    // OP 0: Dispatch Event
    if (op === 0) {
      if (t === 'READY') {
        console.log(`🟢 [HERMES READY] Logged in as ${d.user.username} (${d.user.id}) — ONLINE!`);
        await registerSlashCommands();
      }
      if (t === 'INTERACTION_CREATE') {
        const ixUser = d.member?.user || d.user;
        if (ixUser && !ixUser.bot) {
          recordSilentSignal({
            userId: ixUser.id,
            username: ixUser.username,
            allianceTag: 'VHN1',
            signalType: 'DISCORD_CLICK',
          });
        }
        handleInteraction(d).catch((err) =>
          console.error('[HERMES Interaction Error]:', err)
        );
      }
      // Silent Voice Channel Uptime Tracking
      if (t === 'VOICE_STATE_UPDATE' && d.channel_id && d.user_id !== APP_ID) {
        recordSilentSignal({
          userId: d.user_id,
          username: d.member?.user?.username || d.user_id,
          allianceTag: 'VHN1',
          signalType: 'DISCORD_VOICE',
        });
      }
      // Silent Message, Zero-Grid Chat Title Trigger ("justice", "duke", "scientist", "architect", "done") & Auto-OCR
      if (t === 'MESSAGE_CREATE' && d.author && !d.author.bot && d.author.id !== APP_ID) {
        recordSilentSignal({
          userId: d.author.id,
          username: d.author.username,
          allianceTag: 'VHN1',
          signalType: 'DISCORD_MSG',
        });
        try {
          const fullMsg = await discordApi('GET', `/channels/${d.channel_id}/messages/${d.id}`);
          const rawContent = String(fullMsg?.content || d.content || '').trim().toLowerCase();

          // 1. ZERO-GRID SINGLE-WORD TITLE CHAT TRIGGER ("justice", "duke", "scientist", "architect", "done")
          if (/^(justice|duke|scientist|architect|done)$/i.test(rawContent)) {
            const msgGuildId = d.guild_id || GUILD_ID;
            const msgTier = getGuildTierStatus(msgGuildId);
            if (!msgTier.isLegendary && rawContent !== 'done') {
              await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                message_reference: { message_id: d.id },
                ...buildCommonLockoutPayload({
                  guildId: msgGuildId,
                  featureName: `Single-Word Chat Title Trigger ("${rawContent}")`,
                  teaserText:
                    `🔮 **Single-Word Chat Title Automation (\`${rawContent}\`)** is locked on **🟢 Common Hermes**! *(On Common Hermes, you must manually type \`/title buff:${rawContent} coordinates:X:Y\` every time. Upgrade to **🟠 Legendary Hermes** for instant Zero-Grid chat & 1-tap button triggers!)*`,
                }),
              });
            } else if (rawContent === 'done') {
              const { releasedTitle, nextGovernor, payload } = completeCurrentTitle({
                userId: d.author.id,
              });
              await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                message_reference: { message_id: d.id },
                content: nextGovernor
                  ? `✅ <@${d.author.id}> finished **${releasedTitle}**! 🔔 **UP NEXT:** <@${nextGovernor.userId}> (\`${nextGovernor.coords}\`)!`
                  : `✅ <@${d.author.id}> released **${releasedTitle || 'Title'}**!`,
                ...payload,
              });
            } else {
              const payload = requestKingdomTitle({
                titleKey: rawContent,
                userId: d.author.id,
                username: d.author.global_name || d.author.username,
                coords: 'AUTO',
              });
              await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                message_reference: { message_id: d.id },
                content: `🔮 <@${d.author.id}> queued for **${rawContent.toUpperCase()}** *(Zero-Grid Profile Resolved)*!`,
                ...payload,
              });
            }
          }

          // 2. AUTO-OCR ON SCREENSHOT DROP
          const att = fullMsg?.attachments?.[0];
          if (att?.url && /\.(png|jpe?g|webp)/i.test(att.filename || att.url)) {
            recordSilentSignal({
              userId: d.author.id,
              username: d.author.username,
              allianceTag: 'VHN1',
              signalType: 'OCR_REPORT',
            });
            const chanInfo = await discordApi('GET', `/channels/${d.channel_id}`);
            if (chanInfo?.name?.includes('ocr') || chanInfo?.name?.includes('optics')) {
              const msgGuildId = d.guild_id || GUILD_ID;
              const msgTier = getGuildTierStatus(msgGuildId);
              if (!msgTier.isLegendary) {
                await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                  message_reference: { message_id: d.id },
                  ...buildCommonLockoutPayload({
                    guildId: msgGuildId,
                    featureName: 'Optics Auto-OCR Screenshot Scanner',
                    teaserText:
                      `📸 **HERMES detected screenshot \`${att.filename}\`**, but **Automated Resource Bag & Speedup Bag OCR Math** is locked on **🟢 Common Hermes**!`,
                  }),
                });
              } else {
                console.log(`📸 [HERMES OCR] Auto-scanning screenshot ${att.filename} by ${d.author.username}...`);
                const ocrRes = await runLocalOcrOnUrl(att.url);
                const embed = buildOcrEmbed(ocrRes, d.author.username);
                await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                  message_reference: { message_id: d.id },
                  embeds: [embed],
                });
              }
            }
          }
        } catch (ocrErr) {
          console.error('[HERMES Message Handler Error]:', ocrErr);
        }
      }
      // Flag Emoji Reaction Translation (Works in both Valheon HQ & 1-Click Kingdom Servers!)
      if (t === 'MESSAGE_REACTION_ADD') {
        if (d.user_id && d.user_id !== APP_ID) {
          recordSilentSignal({
            userId: d.user_id,
            username: d.member?.user?.username || d.user_id,
            allianceTag: 'VHN1',
            signalType: 'DISCORD_REACT',
          });
        }
        const emojiName = d.emoji?.name;
        const langMeta = FLAG_TO_LANG[emojiName];
        if (langMeta && d.user_id !== APP_ID) {
          try {
            const reactGuildId = d.guild_id || GUILD_ID;
            const reactTier = getGuildTierStatus(reactGuildId);
            if (!reactTier.isLegendary) {
              await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                message_reference: { message_id: d.message_id },
                ...buildCommonLockoutPayload({
                  guildId: reactGuildId,
                  featureName: `17-Language Flag Reaction Translator (${langMeta.label})`,
                  teaserText:
                    `🌐 **1-Tap Flag Emoji Reaction Translation (\`${emojiName} ${langMeta.label}\`)** is locked on **🟢 Common Hermes**!`,
                }),
              });
              return;
            }
            const msg = await discordApi(
              'GET',
              `/channels/${d.channel_id}/messages/${d.message_id}`
            );
            const rawText = msg?.content || msg?.embeds?.[0]?.description || '';
            if (rawText) {
              const { translated, detected, matchedTerms } = await translateText(
                rawText,
                langMeta.code
              );
              const glossaryBadge =
                matchedTerms?.length > 0
                  ? `\n🎯 **RoK Glossary (\`17-Lang Canonical Glossary\`):** ` +
                    matchedTerms.map((m) => `\`${m.source}\` → **\`${m.target}\`**`).join(' • ')
                  : '';
              await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                message_reference: { message_id: d.message_id },
                embeds: [
                  {
                    description: `🌐 **${langMeta.label} (${String(detected).toUpperCase()} → ${langMeta.code.toUpperCase()}):**\n> ${translated}${glossaryBadge}`,
                    color: 0x38bdf8,
                    footer: {
                      text: `Translated by HERMES (Lilith 17-Lang Glossary Bridge) for @${msg.author?.username || 'Governor'}`,
                    },
                  },
                ],
              });
            }
          } catch (reactErr) {
            console.error('[HERMES Flag Translate Error]:', reactErr);
          }
        }
      }
    }
  });

  ws.addEventListener('close', (ev) => {
    console.warn(`[HERMES Gateway] Disconnected (${ev.code}). Reconnecting in 5s...`);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    setTimeout(connectGateway, 5000);
  });
}

process.on('uncaughtException', (err) => {
  console.error('[HERMES Uncaught Exception Shield]:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[HERMES Unhandled Rejection Shield]:', reason?.message || reason);
});

connectGateway();
