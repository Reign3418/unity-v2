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
  bindGovernorProfile,
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
  buildValheonLockoutPayload,
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
import {
  BABEL_EXCLUSIVE_GUILD_ID,
  syncBabelGuildTopology,
  touchBabelUserActivity,
  handleBabelLanguageSelect,
  handleBabelFounderAllLanguages,
  handleBabelMirrorMessage,
} from './babelMirrorEngine.js';

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
 * Pure-Node fallback parser for Governor Profile OCR text lines
 */
function parseGovernorProfileFromRawText(rawLines = []) {
  const lines = rawLines.map((l) => String(l || '').trim()).filter(Boolean);
  const fullText = lines.join(' ');
  const idMatch = fullText.match(/(?:ID|1D)\s*[:：]?\s*(\d{5,12})/i);
  if (
    !idMatch &&
    !(
      /GOVERNOR/i.test(fullText) &&
      (/KILL\s*POINTS/i.test(fullText) || /ALLIANCE/i.test(fullText))
    )
  ) {
    return { mode: 'GENERAL_OCR', lines: lines.slice(0, 40) };
  }

  const govId = idMatch ? idMatch[1] : '';
  let allianceTag = '';
  let allianceFull = '';
  for (const line of lines) {
    const am = line.match(/[\[\(【]([^\]\)】]{2,6})[\]\)】]\s*(.*)/);
    if (am) {
      allianceTag = am[1].trim();
      allianceFull = am[2]?.trim() ? `[${allianceTag}] ${am[2].trim()}` : `[${allianceTag}]`;
      break;
    }
  }
  // Fallback when OCR reads opening '[' as L, I, l, 1, |, or '{' (e.g. "LE~97] Empire Of Mars")
  if (!allianceTag) {
    for (const line of lines) {
      const am2 = line.match(/^(?:[\[\(【\{]|[LIl1\|])([A-Za-z0-9~_\-#!.*+=]{3,5})[\]\)】\}\|]\s*(.+)$/);
      if (am2) {
        let rawT = am2[1].trim();
        if (rawT.length === 5 && /^[LIl1\|]/.test(rawT)) {
          rawT = rawT.slice(1);
        }
        allianceTag = rawT;
        allianceFull = `[${allianceTag}] ${am2[2].trim()}`;
        break;
      }
    }
  }

  const isSelfProfile =
    /Action\s*Points/i.test(fullText) || /\d[\d,]*\s*\/\s*1[.,]?[05]00/.test(fullText);
  const apMatch = fullText.match(/(\d[\d,]*\s*\/\s*1[.,]?[05]00)/);
  const actionPoints = apMatch ? apMatch[1].replace(/\s+/g, '') : '';

  let govName = 'Governor';
  // Prefer the exact "Governor(ID: ...)" line rather than "GOVERNOR PROFILE" header
  let govIdx = lines.findIndex((l) => /Governor\s*[\(\[]?\s*(?:ID|1D)|\b(?:ID|1D)\s*[:：]?\s*\d{5,12}/i.test(l));
  if (govIdx === -1) {
    govIdx = lines.findIndex((l) => /^Governor\b/i.test(l) && !/PROFILE/i.test(l));
  }
  if (govIdx !== -1) {
    for (let i = govIdx + 1; i <= Math.min(lines.length - 1, govIdx + 3); i++) {
      let cleaned = lines[i]
        .replace(/^[\s:：•·\-\*]+/, '')
        .replace(/\s+[U©®]$/, '')
        .trim();
      if (
        cleaned &&
        !/^(Civilization|Alliance|Power|Kill|Action|Governor|\(ID)/i.test(cleaned) &&
        !/PROFILE|ID\s*[:：]/i.test(cleaned) &&
        !/^\d[\d,./]*$/.test(cleaned)
      ) {
        govName = cleaned;
        break;
      }
    }
  }

  // Extract Power, Kill Points, and Civilization near their labels when possible
  let power = 0;
  let killPoints = 0;
  let civilization = 'Unknown';
  const powIdx = lines.findIndex((l) => /^Power$/i.test(l));
  if (powIdx !== -1 && lines[powIdx + 1]) {
    const pVal = Number(lines[powIdx + 1].replace(/[^0-9]/g, ''));
    if (pVal >= 1000) power = pVal;
  }
  const kpIdx = lines.findIndex((l) => /^Kill\s*Points$/i.test(l));
  if (kpIdx !== -1 && lines[kpIdx + 1]) {
    const kVal = Number(lines[kpIdx + 1].replace(/[^0-9]/g, ''));
    if (kVal >= 100) killPoints = kVal;
  }
  const civIdx = lines.findIndex((l) => /^Civilization$/i.test(l));
  if (civIdx !== -1 && lines[civIdx + 1]) {
    const cVal = lines[civIdx + 1].replace(/^[^A-Za-z]+/, '').trim();
    if (cVal && !/^(Alliance|Power|Kill)/i.test(cVal)) civilization = cVal;
  }

  const numLines = lines
    .map((l) => Number(l.replace(/[^0-9]/g, '')))
    .filter((n) => n >= 10000 && String(n) !== govId);
  if (!power) power = numLines[0] || 0;
  if (!killPoints) killPoints = numLines.find((n) => n !== power) || numLines[1] || 0;

  return {
    mode: 'GOVERNOR_PROFILE',
    gov_id: govId,
    gov_name: govName,
    alliance_tag: allianceTag,
    alliance_full: allianceFull || (allianceTag ? `[${allianceTag}]` : 'None'),
    civilization,
    power,
    kill_points: killPoints,
    is_self_profile: isSelfProfile,
    action_points: actionPoints,
    lines: lines.slice(0, 30),
  };
}

/**
 * Local $0.00 RapidOCR + OpenCV Screenshot Scanner (Resource Bags, Speedups, Profiles)
 * Works on Windows (python), Railway Linux Docker (python3/python), + Pure-Node Cloud Fallback!
 */
async function runLocalOcrOnUrl(imageUrl) {
  for (const pyBin of ['python', 'python3']) {
    try {
      const { stdout } = await execFileAsync(pyBin, [OCR_SCRIPT_PATH, imageUrl], {
        encoding: 'utf8',
        timeout: 25000,
      });
      return JSON.parse(stdout.trim());
    } catch {
      // try next python binary or pure-node fallback
    }
  }

  try {
    const apiUrl = `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}&OCREngine=2`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    const rawText = data?.ParsedResults?.[0]?.ParsedText || '';
    const rawLines = rawText.split(/\r?\n/).filter(Boolean);
    return parseGovernorProfileFromRawText(rawLines);
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

  if (ocrResult.mode === 'GOVERNOR_PROFILE') {
    return {
      title: `📸 VALHEON OPTICS OCR // GOVERNOR PROFILE DOSSIER (@${authorName})`,
      description:
        `### 🪪 SCANNED GOVERNOR: **\`${ocrResult.gov_name || 'Governor'}\`** (UID: **\`#${ocrResult.gov_id || 'Unknown'}\`**)\n` +
        `• **🏰 Alliance:** \`${ocrResult.alliance_full || '[' + (ocrResult.alliance_tag || 'NONE') + ']'}\` (Tag: **\`${ocrResult.alliance_tag || 'NONE'}\`**)\n` +
        `• **⚡ Power:** \`${fmtNum(ocrResult.power)}\` (**${fmtCompact(ocrResult.power)}**)\n` +
        `• **⚔️ Kill Points:** \`${fmtNum(ocrResult.kill_points)}\` (**${fmtCompact(ocrResult.kill_points)}**)\n` +
        `• **🏛️ Civilization:** \`${ocrResult.civilization || 'Unknown'}\`\n` +
        `• **🛡️ Self-Profile Proof:** ${
          ocrResult.is_self_profile
            ? `🟢 **Verified Own Account** (Action Points: \`${ocrResult.action_points || 'Visible'}\`)`
            : 'ℹ️ **Standard Profile View**'
        }`,
      color: 0x10b981,
      footer: {
        text: 'VALHEON PILLAR V // OPTICS LOCAL ONNX GOVERNOR PROFILE PARSER',
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
async function registerSlashCommands(targetGuildIdOnly = null) {
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
          description: '🪽 1-Click Provision or Relaunch any Kingdom, Diplo, Coalition or 17-Language Omni-Matrix Server',
          options: [
            {
              type: 3,
              name: 'blueprint',
              description: 'Select Server Blueprint',
              required: true,
              choices: [
                { name: '🪽 17-Language Omni-Matrix Add-On (Existing or New Server)', value: 'OMNI_LANGUAGE_MATRIX_ONLY' },
                { name: '🏰 Turnkey Home Kingdom War Server ($39)', value: 'KINGDOM_WAR_SERVER' },
                { name: '🕊️ Turnkey KvK Diplomacy Summit Server ($9)', value: 'KVK_DIPLO_SERVER' },
                { name: '⚔️ Turnkey Allied Coalition War Server ($9)', value: 'KVK_COALITION_SERVER' },
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
              name: 'alliances',
              description: 'Optional: Comma-Separated Alliance Tags (e.g. E~97, E~98, E~99) for Alliance Roles & Auto-Approval',
              required: false,
            },
            {
              type: 3,
              name: 'target_guild_id',
              description: 'Optional: Remote Customer Guild ID to relaunch/repair for $0.00 (Default: This Server)',
              required: false,
            },
            {
              type: 5, // BOOLEAN
              name: 'include_trap_channel',
              description: 'Include #⚠️-trap-channel-⚠️ anti-spambot honeypot? (Default: False / Left Out)',
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
          description: '🧪 View or switch HERMES Tier (Sandbox $0 / Common $39 / Legendary +$15 / Valheon $45/mo)',
          options: [
            {
              type: 3,
              name: 'mode',
              description: 'Optional: Switch Server Mode (Moderator Training & Testing)',
              required: false,
              choices: [
                { name: '📊 View Pricing & Moderator Training Matrix', value: 'VIEW' },
                { name: '🧪 Sandbox Free Mode (All Fees Suspended / 👑 Valheon Unlocked)', value: 'SANDBOX_FREE' },
                { name: '🟢 Simulate Common Hermes ($39 Starter Bot)', value: 'COMMON' },
                { name: '🟠 Simulate Legendary Hermes (+$15 24h / +$25 Discord Bot)', value: 'LEGENDARY' },
                { name: '👑 Simulate Valheon Hermes ($45/mo Live Scanner Bots + Webpage)', value: 'VALHEON' },
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

  if (targetGuildIdOnly) {
    await discordApi(
      'PUT',
      `/applications/${APP_ID}/guilds/${targetGuildIdOnly}/commands`,
      commands
    ).catch(() => {});
    console.log(`✅ [HERMES] Instant-synced slash commands to Guild ${targetGuildIdOnly}`);
    return;
  }

  // Register Globally AND on every Guild the bot is currently in (0ms instant update on all servers!)
  await discordApi('PUT', `/applications/${APP_ID}/commands`, commands).catch(() => {});
  const allGuilds = await discordApi('GET', '/users/@me/guilds').catch(() => []);
  const guildIdsToSync = new Set([
    GUILD_ID,
    ...(Array.isArray(allGuilds) ? allGuilds.map((g) => g.id).filter(Boolean) : []),
  ]);
  for (const gid of guildIdsToSync) {
    await discordApi('PUT', `/applications/${APP_ID}/guilds/${gid}/commands`, commands).catch(
      () => {}
    );
  }
  console.log(
    `✅ [HERMES] Registered /guide + /hermes + 17-Lang Omni-Matrix (${guildIdsToSync.size} Guilds + Global)`
  );
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
    (ix.type === 2 &&
      ix.data?.name === 'hermes' &&
      (ix.data?.options?.[0]?.name === 'tier' || ix.data?.options?.[0]?.name === 'architect')) ||
    (ix.type === 3 &&
      (ix.data?.custom_id === 'hermes_ticket_onboard' ||
        ix.data?.custom_id === 'hermes_upgrade_legendary_btn' ||
        ix.data?.custom_id === 'hermes_upgrade_webos_btn' ||
        ix.data?.custom_id === 'hermes_demo_common_lockout' ||
        ix.data?.custom_id === 'hermes_launch_kd_modal' ||
        ix.data?.custom_id?.startsWith('hermes_deploy_') ||
        ix.data?.custom_id?.startsWith('hermes_stripe_verify_') ||
        ix.data?.custom_id?.startsWith('hermes_principal_force_arch|'))) ||
    (ix.type === 5 &&
      (ix.data?.custom_id === 'hermes_kd_deploy_modal' ||
        ix.data?.custom_id === 'hermes_diplo_deploy_modal' ||
        ix.data?.custom_id === 'hermes_coalition_deploy_modal' ||
        ix.data?.custom_id === 'hermes_submit_deploy_omni_matrix'));

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

    // ZERO-ROLE BORDER GATE INTERCEPTOR:
    // If an unverified newcomer (0 roles) clicks any feature/role button before verifying,
    // immediately pop open the Governor ID Verification Modal right on their screen!
    const memberRoles = Array.isArray(ix.member?.roles) ? ix.member.roles : [];
    const isExemptFromBorderGate =
      VALHEON_FOUNDER_IDS.has(String(user.id)) ||
      (tierStatus.buyerDiscordId && String(tierStatus.buyerDiscordId) === String(user.id)) ||
      customId === 'hermes_verify_governor' ||
      customId.startsWith('hermes_deploy_') ||
      customId.startsWith('hermes_stripe_verify_') ||
      customId.startsWith('hermes_upgrade_') ||
      customId.startsWith('hermes_launch_') ||
      customId === 'hermes_demo_common_lockout' ||
      customId.startsWith('hermes_babel_') ||
      customId.startsWith('hermes_welcome_') ||
      customId.startsWith('hermes_role_toggle_') ||
      customId === 'hermes_my_roles_status' ||
      customId === 'hermes_ticket_onboard' ||
      customId === 'hermes_ticket_migrant' ||
      customId === 'hermes_ticket_court' ||
      customId === 'hermes_ticket_support' ||
      customId === 'hermes_ticket_close';

    if (memberRoles.length === 0 && !isExemptFromBorderGate) {
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_bind_governor_modal',
          title: '🛡️ Verify Governor ID to Unlock Server',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'gov_id',
                  label: '1. In-Game Governor ID (Numeric UID)',
                  style: 1,
                  placeholder: 'e.g. 41940001 (Tap your avatar in Rise of Kingdoms)',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'gov_name',
                  label: '2. In-Game Governor Name',
                  style: 1,
                  value: (user.global_name || user.username || '').slice(0, 32),
                  placeholder: 'e.g. Reign3418',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'alliance_tag',
                  label: '3. Alliance Tag or Kingdom #',
                  style: 1,
                  placeholder: 'e.g. VHN1, VHN2, or 4194',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'city_coords',
                  label: '4. City Coordinates (Optional — Title Queue)',
                  style: 1,
                  placeholder: 'e.g. X:614 Y:588 (Leave blank for UID-only lookup)',
                  required: false,
                },
              ],
            },
          ],
        },
      });
    }

    // A0.0 4-STEP ONBOARDING FLOW: 1) Language -> 2) Translate & Accept Rules -> 3) Screenshot Verify (R4 or Auto-OCR) -> 4) Active Roles
    if (customId === 'hermes_welcome_open_lang_picker') {
      return reply({
        type: 4,
        data: {
          flags: 64,
          embeds: [
            {
              title: '🌍 STEP 1 // PICK YOUR LANGUAGE & TRANSLATE THE RULES',
              description:
                'Tap your native flag below first! **🪽 HERMES** will:\n' +
                '1️⃣ Unlock your native-language chat room under **`🪽 HERMES OMNI-LANGUAGE MATRIX`**.\n' +
                '2️⃣ **Automatically translate the Kingdom Rules & Charter into your language** so you can read and accept **Step 2** right here!',
              color: 0x38bdf8,
              footer: { text: 'STEP 1 OF 4 // SELECT YOUR NATIVE LANGUAGE BELOW' },
            },
          ],
          components: [
            {
              type: 1,
              components: [
                { type: 2, style: 1, label: '🇺🇸 English', custom_id: 'hermes_babel_lang_en' },
                { type: 2, style: 1, label: '🇻🇳 Tiếng Việt', custom_id: 'hermes_babel_lang_vi' },
                { type: 2, style: 1, label: '🇰🇷 한국어', custom_id: 'hermes_babel_lang_ko' },
                { type: 2, style: 1, label: '🇷🇺 Русский', custom_id: 'hermes_babel_lang_ru' },
                { type: 2, style: 1, label: '🇸🇦 العربية', custom_id: 'hermes_babel_lang_ar' },
              ],
            },
            {
              type: 1,
              components: [
                { type: 2, style: 1, label: '🇨🇳 中文', custom_id: 'hermes_babel_lang_zh' },
                { type: 2, style: 1, label: '🇯🇵 日本語', custom_id: 'hermes_babel_lang_ja' },
                { type: 2, style: 1, label: '🇪🇸 Español', custom_id: 'hermes_babel_lang_es' },
                { type: 2, style: 1, label: '🇹🇷 Türkçe', custom_id: 'hermes_babel_lang_tr' },
                { type: 2, style: 1, label: '🇮🇩 Indonesia', custom_id: 'hermes_babel_lang_id' },
              ],
            },
            {
              type: 1,
              components: [
                { type: 2, style: 1, label: '🇫🇷 Français', custom_id: 'hermes_babel_lang_fr' },
                { type: 2, style: 1, label: '🇩🇪 Deutsch', custom_id: 'hermes_babel_lang_de' },
                { type: 2, style: 1, label: '🇧🇷 Português', custom_id: 'hermes_babel_lang_pt' },
                { type: 2, style: 1, label: '🇹🇭 ภาษาไทย', custom_id: 'hermes_babel_lang_th' },
                { type: 2, style: 1, label: '🇵🇱 Polski', custom_id: 'hermes_babel_lang_pl' },
              ],
            },
            {
              type: 1,
              components: [
                { type: 2, style: 1, label: '🇮🇹 Italiano', custom_id: 'hermes_babel_lang_it' },
                { type: 2, style: 1, label: '🇲🇾 Melayu', custom_id: 'hermes_babel_lang_ms' },
              ],
            },
          ],
        },
      });
    }

    if (customId.startsWith('hermes_babel_lang_')) {
      const langCode = customId.replace('hermes_babel_lang_', '').trim();
      await reply({ type: 5, data: { flags: 64 } });
      const res = await handleBabelLanguageSelect({
        discordApi,
        guildId,
        user,
        member: ix.member,
        langCode,
      });

      const baseRulesText =
        '1. MGE & Event Caps: Respect all posted Mightiest Governor (MGE) point caps. Fixed ranks are assigned only to vetted Rally & Garrison Captains.\n' +
        '2. Home Kingdom Peace & Nodes: Zero city or tile hits in Home Kingdom. Always farm resource tiles completely to 0.\n' +
        '3. KvK Mobilization & DKP: Join Pass/Flag rallies and garrisons, and meet your KvK DKP & Dead troop targets.';

      let translatedRules = baseRulesText;
      if (langCode !== 'en') {
        try {
          const tr = await translateRoKMessage(baseRulesText, langCode);
          if (tr?.translated) translatedRules = tr.translated;
        } catch {}
      }

      const rulesEmbed = {
        title: `📜 STEP 2 // READ & ACCEPT KINGDOM RULES (${langCode.toUpperCase()})`,
        description:
          `${translatedRules}\n\n` +
          `👉 **Click \`[✅ Step 2: I Have Read & Accept the Rules]\` below to proceed to Step 3 (Governor Screenshot Verification)!**`,
        color: 0x10b981,
        footer: { text: 'STEP 2 OF 4 // TRANSLATED BY HERMES 17-LANGUAGE ENGINE' },
      };

      const embeds = res.ok && res.embed ? [res.embed, rulesEmbed] : [rulesEmbed];
      return editOriginal({
        content: !res.ok ? res.content : undefined,
        embeds,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 3, // SUCCESS
                label: '✅ Step 2: I Have Read & Accept the Rules',
                custom_id: 'hermes_welcome_accept_rules',
              },
            ],
          },
        ],
      });
    }

    if (customId === 'hermes_welcome_accept_rules') {
      const approvalModeText = tierStatus.isLegendary
        ? '🟠 **Legendary / Valheon Hermes Active (`1-Second Auto-Approval`):** As soon as you drop your in-game Governor Profile screenshot in **`#🔗-verify-governor-id`**, HERMES Vision OCR automatically reads your Governor ID, Name & `[TAG]` and **approves you in 1 second**!'
        : '🟢 **Common Hermes Active (`R4 Officer Approval Queue`):** Drop your in-game Governor Profile screenshot in **`#🔗-verify-governor-id`** — HERMES posts it with **1-Click R4/R5 Approval Buttons** so an officer can approve and unlock your roles!';

      return reply({
        type: 4,
        data: {
          flags: 64,
          embeds: [
            {
              title: '✅ STEP 2 COMPLETE // NOW UPLOAD YOUR IN-GAME SCREENSHOT (STEP 3)',
              description:
                `Thank you, <@${user.id}>! You have accepted the **Kingdom Rules & Charter**.\n\n` +
                `### 📸 STEP 3: ADD YOUR IN-GAME PLAYER SCREENSHOT\n` +
                `1. Open **` +
                '`#🔗-verify-governor-id`' +
                `** in the left sidebar and **upload a screenshot of your in-game Governor Profile**.\n` +
                `2. ${approvalModeText}\n` +
                `3. *(If screenshot upload isn't working or you need help, you can type freely inside **` +
                '`#💬-newcomer-lobby-chat`' +
                `**!)*\n\n` +
                `### 🎯 STEP 4: PICK YOUR ACTIVE ROLES\n` +
                `• After uploading your screenshot, tap your **Combat Specialization Roles** (\`🗡️ Infantry\`, \`🐎 Cavalry\`, \`🏹 Archer\`, \`🔥 Rally\`, \`🏰 Garrison\`) & **Event Alerts** (\`💎 More Than Gems\`, \`🗿 20GH\`, \`🎡 Wheel & MGE\`) right on the Welcome screen!`,
              color: 0x10b981,
              footer: { text: 'STEP 2 OF 4 COMPLETE // NEXT: DROP SCREENSHOT IN #verify-governor-id' },
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3, // SUCCESS
                  label: '📸 Step 3: Screenshot Verification Guide',
                  custom_id: 'hermes_welcome_step3_guide',
                },
                {
                  type: 2,
                  style: 2, // SECONDARY
                  label: '🔗 Optional: Manual ID Entry',
                  custom_id: 'hermes_verify_governor',
                },
              ],
            },
          ],
        },
      });
    }

    if (customId === 'hermes_welcome_step3_guide') {
      const approvalModeText = tierStatus.isLegendary
        ? '🟠 **1-Second Auto-Approval Active (Legendary / Valheon Hermes):** HERMES AI Vision OCR reads your Governor ID, Name, Alliance `[TAG]`, Power & Kill Points and **auto-approves you in 1 second**!'
        : '🟢 **R4 Officer Approval Active (Common Hermes):** HERMES queues your screenshot with **1-Click R4/R5 Officer Approval Buttons** (`[✅ Approve & Grant Citizen Role]`) so leadership can verify and approve you!';

      return reply({
        type: 4,
        data: {
          flags: 64,
          embeds: [
            {
              title: '📸 STEP 3 // UPLOAD YOUR IN-GAME GOVERNOR SCREENSHOT',
              description:
                `### 👉 HOW TO VERIFY YOUR PLAYER PROFILE:\n` +
                `1. Click **` +
                '`#🔗-verify-governor-id`' +
                `** in the channel list on the left.\n` +
                `2. Upload or paste a screenshot of your in-game **Rise of Kingdoms Governor Profile** (showing your Governor ID, Name, and Alliance).\n` +
                `3. ${approvalModeText}\n` +
                `4. **Step 4:** Once approved, tap your **Active Combat & Event Roles** (\`🗡️ Infantry\`, \`🐎 Cavalry\`, \`🏹 Archer\`, \`💎 More Than Gems\`) on the Welcome Console!\n\n` +
                `💬 *Having trouble or need to talk to an R4? Head into **` +
                '`#💬-newcomer-lobby-chat`' +
                `** — everyone can type and ask questions there!*`,
              color: 0x38bdf8,
              footer: { text: 'STEP 3 OF 4 // UPLOAD SCREENSHOT IN #verify-governor-id' },
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 2, // SECONDARY
                  label: '🔗 Fallback: Enter Governor ID Manually',
                  custom_id: 'hermes_verify_governor',
                },
              ],
            },
          ],
        },
      });
    }

    if (customId === 'hermes_babel_founder_all') {
      if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            content: '⛔ **Strict Principal-Only Lock:** Only Lauren (`184977944433786880`) can toggle All-Languages Founder Overwatch.',
          },
        });
      }
      await reply({ type: 5, data: { flags: 64 } });
      const res = await handleBabelFounderAllLanguages({
        discordApi,
        guildId,
        user,
        member: ix.member,
      });
      return editOriginal({ content: res.content });
    }

    if (customId === 'hermes_deploy_omni_matrix_open') {
      if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            content: '⛔ **Strict Principal-Only Lock:** Only Lauren (`184977944433786880`) can deploy the 17-Language Omni-Matrix directly.',
          },
        });
      }
      return reply({
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_submit_deploy_omni_matrix',
          title: '🪽 Deploy 17-Lang Omni-Matrix (New/Existing)',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'target_guild_id',
                  label: '1. Target Discord Server (Guild) ID',
                  style: 1,
                  placeholder: 'Paste New or Existing Server ID (Right-Click Server -> Copy ID)',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'deploy_mode',
                  label: '2. Mode (ADDON = Existing Server / FULL_KD)',
                  style: 1,
                  value: 'ADDON',
                  placeholder: 'ADDON (keeps existing channels) or FULL_KD (full Kingdom Server)',
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
                  label: '3. Kingdom # (Used if FULL_KD mode)',
                  style: 1,
                  value: '4194',
                  required: false,
                },
              ],
            },
          ],
        },
      });
    }

    if (customId.startsWith('hermes_principal_force_arch|')) {
      if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            content: '⛔ **Strict Principal-Only Lock:** Only Lauren (`184977944433786880`) can use the Principal Direct Deploy override.',
          },
        });
      }
      await reply({ type: 5, data: { flags: 64 } });
      const [, bpType, kdId, targetGid] = customId.split('|');
      const deployOpts = {
        kingdomId: kdId || '4194',
        keepExistingStarterChannels: bpType === 'OMNI_LANGUAGE_MATRIX_ONLY',
      };
      try {
        const res = await provisionDiscordServer({
          blueprintType: bpType,
          guildId: targetGid || guildId,
          botToken: BOT_TOKEN,
          dryRun: false,
          options: deployOpts,
        });
        registerGuildDeployment(targetGid || guildId, 'LEGENDARY', {
          buyerDiscordId: user.id,
          buyerUsername: user.username,
          paidSessionId: `principal_override_${Date.now()}`,
          blueprintType: bpType,
          deployOptions: deployOpts,
        });
        await syncBabelGuildTopology(discordApi, targetGid || guildId);
        return editOriginal({
          content: `👑 **Principal Direct Deploy Complete for \`${res.guildName}\` (\`${targetGid || guildId}\` • \`${bpType}\`)!** Provisioned/verified **\`${res.log.length}\`** items (including the **17-Language Omni-Matrix**) at \`$0.00\`.`,
        });
      } catch (err) {
        return editOriginal({
          content: `❌ **Could not deploy \`${bpType}\` to \`${targetGid || guildId}\`:** ${err.message}`,
        });
      }
    }

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
              title: '👑 VALHEON HERMES // LIVE KINGDOM SCANNER BOTS + WEBPAGE SUITE ($45/MO)',
              description:
                `Upgrade your Kingdom to **👑 Valheon Hermes (\`$45/mo\`)** to deploy **Autonomous Valheon Scanner Bots** into your Kingdom and unlock live telemetry across Discord & **\`valheon.com\`**:\n\n` +
                `• 🤖 **Live In-Game Scanner Bots Deployed in Your Kingdom:** Automated Top-300 / Top-600 Power, T4/T5 Kills & Dead Troop scans\n` +
                `• 🪪 **Live \`/mystats\` KvK DKP Scorecards** & **💀 Live AI Governor Telemetry Roasts** inside Discord\n` +
                `• 🛡️ **Auto-Injected AEGIS 35-Field Migration Polygraphs** inside R4 Migrant Tickets\n` +
                `• 🌐 **Full Access to All 5 Webpage Suites (\`valheon.com\`):** AEGIS Dashboard, NEXUS 3D Galaxy, THEATER 128-Node KvK Map, VANGUARD CRM & Web OPTICS!\n\n` +
                `> 💡 *While **🟢 Common Hermes (\`$39\`)** and **🟠 Legendary Hermes (\`+$15\` in 24h / \`+$25\` after)** are one-time fees for Discord-only automation, **👑 Valheon Hermes (\`$45/mo\`)** powers active in-game Kingdom scanning & the Web Command Suite. (All prices subject to change)*`,
              color: 0xa855f7,
              footer: {
                text: '👑 VALHEON HERMES // LIVE KINGDOM SCANNER BOTS + WEBPAGE SUITE ($45/MO)',
              },
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: '🎫 Request Valheon Hermes Scanner Deployment ($45/mo)',
                  custom_id: 'hermes_ticket_onboard',
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
        if (!tierStatus.isValheon) {
          return reply({
            type: 4,
            data: {
              flags: 64,
              ...buildValheonLockoutPayload({
                guildId,
                featureName: 'AEGIS 35-Field Live Scan Polygraph',
                teaserText:
                  '🛡️ **Automated AEGIS Migration Polygraph & Live T4/T5 Kill-to-Power Vetting** requires **👑 Valheon Hermes (`$45/mo` Live Kingdom Scanner Link)**!',
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
      const targetTicketName = `ticket-${ticketType}-${safeName}`;

      // Idempotency Guard: If an open ticket channel with this exact name already exists, reuse it instead of creating a duplicate!
      const guildChans = (await discordApi('GET', `/guilds/${guildId}/channels`).catch(() => [])) || [];
      const existingTicket = guildChans.find((c) => c.name === targetTicketName);
      if (existingTicket?.id) {
        return editOriginal({
          content: `🎫 **Your Ticket is Already Open:** <#${existingTicket.id}>`,
        });
      }

      // Fetch current channel to inherit category parent_id
      const parentChan = guildChans.find((c) => c.id === channelId) || (await discordApi('GET', `/channels/${channelId}`).catch(() => null));

      const newChan = await discordApi('POST', `/guilds/${guildId}/channels`, {
        name: targetTicketName,
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

    // C. Roast My Governor / Sovereign Flex Card (Requires 👑 Valheon Hermes Live Scan Data!)
    if (customId === 'hermes_roast_me' || customId === 'hermes_flex_card') {
      if (!tierStatus.isValheon) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildValheonLockoutPayload({
              guildId,
              featureName: 'Live AI Governor Telemetry Roaster & Flex Card',
              teaserText:
                '💀 **Live AI Governor Telemetry Roasts & 35-Field Sovereign Flex Cards** require active Kingdom Scan Data via **👑 Valheon Hermes (`$45/mo`)**!',
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
        type: 9, // MODAL
        data: {
          custom_id: 'hermes_bind_governor_modal',
          title: '🔗 Bind Governor ID & Unlock War Rooms',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'gov_id',
                  label: '1. In-Game Governor ID (Numeric UID)',
                  style: 1,
                  placeholder: 'e.g. 41940001 (Tap your avatar in Rise of Kingdoms)',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'gov_name',
                  label: '2. In-Game Governor Name',
                  style: 1,
                  value: (user.global_name || user.username || '').slice(0, 32),
                  placeholder: 'e.g. Reign3418',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'alliance_tag',
                  label: '3. Alliance Tag (Unlocks Alliance Sector)',
                  style: 1,
                  placeholder: 'e.g. VHN1, VHN2, VHN3, VHN4',
                  required: true,
                },
              ],
            },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'city_coords',
                  label: '4. City Coordinates (Optional — Title Queue)',
                  style: 1,
                  placeholder: 'e.g. X:614 Y:588 (Leave blank for UID-only lookup)',
                  required: false,
                },
              ],
            },
          ],
        },
      });
    }

    // D2. R4/R5 1-Click Manual Approval (or Adopt New Alliance Role) for Sister-Alliance / Manual Screenshot Drops
    if (
      customId.startsWith('hermes_ocr_approve_') ||
      customId.startsWith('hermes_ocr_adopt_') ||
      customId.startsWith('hermes_ocr_reject_')
    ) {
      await reply({ type: 5, data: { flags: 64 } });
      const isReject = customId.startsWith('hermes_ocr_reject_');
      const isAdoptAlliance = customId.startsWith('hermes_ocr_adopt_');
      const payloadStr = customId.replace(/^hermes_ocr_(?:approve|adopt|reject)_/, '');
      const parts = payloadStr.split('_');
      const targetUserId = parts[0] || '';
      const govId = parts[1] || '00000000';
      const rawTag = decodeURIComponent(parts[2] || 'ALLY');
      const govName = decodeURIComponent(parts.slice(3).join('_') || 'Governor');

      // Security Check: Verify the clicker is an R4, R5, Server Owner, or Valheon Founder (never let an unverified user self-approve!)
      let isOfficerOrOwner = VALHEON_FOUNDER_IDS.has(String(user.id));
      if (!isOfficerOrOwner) {
        const authCheck = await verifyServerSovereignAuthorization(ix, guildId, tierStatus);
        if (authCheck.allowed) {
          isOfficerOrOwner = true;
        } else {
          // Also allow R4 Council / MODERATE_MEMBERS officers to approve sister-alliance members!
          const permsBig = BigInt(ix.member?.permissions || '0');
          if ((permsBig & (1n << 40n)) !== 0n || (permsBig & (1n << 13n)) !== 0n) {
            isOfficerOrOwner = true;
          }
        }
      }

      if (!isOfficerOrOwner || (String(user.id) === String(targetUserId) && !VALHEON_FOUNDER_IDS.has(String(user.id)))) {
        return editOriginal({
          content: `🛡️ **R4/R5 Officer Lock:** Only a Kingdom **R5 Sovereign**, **R4 High Council Officer**, or **Server Owner** can approve or reject a pending Sister-Alliance / Manual Screenshot verification!`,
        });
      }

      if (isReject) {
        await discordApi('POST', `/channels/${channelId}/messages`, {
          content: `❌ <@${targetUserId}> Your screenshot verification was reviewed by R4/R5 Officer <@${user.id}>. Please drop a **fresh in-game screenshot** showing your current Kingdom alliance tag in <#${channelId}>!`,
        }).catch(() => null);
        return editOriginal({
          content: `✅ Requested a fresh screenshot from <@${targetUserId}>.`,
        });
      }

      // Grant @Sworn Defender (Citizen) + matching Alliance role if any, and format nickname!
      bindGovernorProfile({
        userId: targetUserId,
        username: govName,
        govId,
        govName,
        alliance: rawTag,
        coords: `UID:${govId} (No Grid Needed)`,
      });

      const grantedRoles = [];
      try {
        const roles = (await discordApi('GET', `/guilds/${guildId}/roles`)) || [];
        const citizenRole = roles.find(
          (r) =>
            r.name.toLowerCase().includes('sworn defender') ||
            r.name.toLowerCase().includes('frontline brawler') ||
            r.name.toLowerCase().includes('frontline fighter') ||
            r.name.toLowerCase().includes('confirmed jumper') ||
            r.name.toLowerCase().includes('lost kingdom envoy') ||
            r.name.toLowerCase().includes('verified')
        );
        if (citizenRole) {
          await discordApi('PUT', `/guilds/${guildId}/members/${targetUserId}/roles/${citizenRole.id}`).catch(() => null);
          grantedRoles.push(`<@&${citizenRole.id}>`);
        }

        let allianceRole = roles.find(
          (r) =>
            r.name.toUpperCase().includes(`[${rawTag.toUpperCase()}]`) ||
            r.name.toUpperCase().includes(`#${rawTag.toUpperCase()}`)
        );

        // If Officer clicked "Approve & Add [TAG] as Server Alliance Role" (or if default VHN1..4 placeholder exists), adopt or create it!
        if (!allianceRole && isAdoptAlliance && rawTag && rawTag !== 'MANUAL' && rawTag !== 'ALLY') {
          const upperTag = rawTag.toUpperCase();
          const placeholderRole = roles.find((r) => /\[VHN[1-4]\]/i.test(r.name));
          if (placeholderRole) {
            const oldTagMatch = placeholderRole.name.match(/\[(VHN[1-4])\]/i)?.[1];
            const newRoleName = placeholderRole.name.replace(/\[VHN[1-4]\]/i, `[${upperTag}]`);
            const updatedRole = await discordApi('PATCH', `/guilds/${guildId}/roles/${placeholderRole.id}`, {
              name: newRoleName,
            }).catch(() => null);
            allianceRole = updatedRole || placeholderRole;
            if (oldTagMatch) {
              const guildChans = (await discordApi('GET', `/guilds/${guildId}/channels`).catch(() => [])) || [];
              const oldSlug = oldTagMatch.toLowerCase();
              const newSlug = upperTag.toLowerCase().replace(/[^a-z0-9-]/g, '');
              for (const ch of guildChans) {
                if (ch.name && ch.name.toLowerCase().includes(oldSlug)) {
                  await discordApi('PATCH', `/channels/${ch.id}`, {
                    name: ch.name.replace(new RegExp(oldTagMatch, 'ig'), newSlug || upperTag),
                  }).catch(() => null);
                }
              }
            }
          } else {
            const createdRole = await discordApi('POST', `/guilds/${guildId}/roles`, {
              name: `🛡️ [${upperTag}] Vanguard`,
              color: 0x3b82f6,
              hoist: true,
              mentionable: true,
            }).catch(() => null);
            if (createdRole?.id) allianceRole = createdRole;
          }
        }

        if (allianceRole) {
          await discordApi('PUT', `/guilds/${guildId}/members/${targetUserId}/roles/${allianceRole.id}`).catch(() => null);
          grantedRoles.push(`<@&${allianceRole.id}>`);
        }

        const formattedNick = (
          rawTag && rawTag !== 'MANUAL' ? `[${rawTag}] ${govName}` : govName
        ).slice(0, 32);
        await discordApi('PATCH', `/guilds/${guildId}/members/${targetUserId}`, {
          nick: formattedNick,
        }).catch(() => null);
      } catch {}

      const displayLabel =
        rawTag && rawTag !== 'MANUAL' ? `[${rawTag}] ${govName}` : govName;
      await discordApi('POST', `/channels/${channelId}/messages`, {
        content: `✅ <@${targetUserId}> Your Governor Profile (**\`${displayLabel}\`**${govId && govId !== '00000000' ? ` • UID \`#${govId}\`` : ''}) has been **approved by R4/R5 Officer <@${user.id}>**! War Rooms & Kingdom Channels are now unlocked.`,
      }).catch(() => null);

      return editOriginal({
        content: `✅ **Approved <@${targetUserId}> (\`${displayLabel}\`)!** Granted roles: ${grantedRoles.join(' • ') || 'Verified Citizen'}.`,
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
      if (!tierStatus.isValheon) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildValheonLockoutPayload({
              guildId,
              featureName: 'Live KvK DKP Scorecard (/mystats)',
              teaserText:
                '🪪 **Live KvK DKP Scorecards & Real-Time Kill/Dead Goal Tracking** require active Kingdom Scan Data via **👑 Valheon Hermes (`$45/mo`)**!',
            }),
          },
        });
      }
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
  if (ix.type === 5 && ix.data?.custom_id === 'hermes_submit_deploy_omni_matrix') {
    await reply({ type: 5, data: { flags: 64 } });

    if (!VALHEON_FOUNDER_IDS.has(String(user.id))) {
      return editOriginal({
        content: '⛔ **Strict Principal-Only Lock:** Only Lauren (`184977944433786880`) can deploy the 17-Language Omni-Matrix directly.',
      });
    }

    const comps = ix.data.components || [];
    const targetGuildId = (comps[0]?.components?.[0]?.value || '').trim();
    const rawMode = (comps[1]?.components?.[0]?.value || 'ADDON').trim().toUpperCase();
    const kdId = (comps[2]?.components?.[0]?.value || '4194').trim();

    const bpType =
      rawMode === 'FULL_KD' || rawMode === 'KINGDOM_WAR_SERVER'
        ? 'KINGDOM_WAR_SERVER'
        : 'OMNI_LANGUAGE_MATRIX_ONLY';

    const deployOpts = {
      kingdomId: kdId,
      keepExistingStarterChannels: bpType === 'OMNI_LANGUAGE_MATRIX_ONLY',
    };

    try {
      const result = await provisionDiscordServer({
        blueprintType: bpType,
        guildId: targetGuildId,
        botToken: BOT_TOKEN,
        dryRun: false,
        options: deployOpts,
      });

      registerGuildDeployment(targetGuildId, 'LEGENDARY', {
        buyerDiscordId: user.id,
        buyerUsername: user.username,
        blueprintType: bpType,
        deployOptions: deployOpts,
      });

      await syncBabelGuildTopology(discordApi, targetGuildId);

      return editOriginal({
        embeds: [
          {
            title: `🪽 17-LANGUAGE OMNI-MATRIX DEPLOYED // ${result.guildName}`,
            description:
              `**🪽 HERMES** just deployed **\`${bpType}\`** onto **${result.guildName}** (\`${targetGuildId}\`)!\n\n` +
              `• **Mode:** \`${bpType === 'OMNI_LANGUAGE_MATRIX_ONLY' ? 'Non-Destructive Existing-Server Add-On (0 existing channels touched)' : 'Full Turnkey Kingdom War Server + 17-Language Omni-Matrix'}\`\n` +
              `• **Provisioned & Verified:** \`${result.log.length}\` roles, channels, and pinned consoles\n` +
              `• **Live 4-Pillar Scale Engine:** Active immediately across all 17 languages!`,
            color: 0x38bdf8,
            footer: { text: 'VALHEON HERMES OMNI-LANGUAGE ENGINE // READY FOR LIVE TESTING' },
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (err) {
      return editOriginal({
        content:
          `❌ **Could not deploy to Server ID \`${targetGuildId}\`:** ${err.message}\n\n` +
          `👉 **Step 1:** Make sure you invited **HERMES** to that server first using this link:\n` +
          `https://discord.com/oauth2/authorize?client_id=1563619930371391680&permissions=8&scope=bot%20applications.commands`,
      });
    }
  }

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
    await reply({ type: 5, data: { flags: 64 } });

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
        return editOriginal({
          content: credit.error,
          components: VALHEON_FOUNDER_IDS.has(String(user.id))
            ? [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 1,
                      label: '👑 Principal Override: Install Kingdom Server Free ($0)',
                      custom_id: `hermes_principal_force_arch|KINGDOM_WAR_SERVER|${kdId}|${targetGuildId}`,
                    },
                  ],
                },
              ]
            : [],
        });
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

      await syncBabelGuildTopology(discordApi, targetGuildId);

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
    await reply({ type: 5, data: { flags: 64 } });

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
        return editOriginal({
          content: credit.error,
          components: VALHEON_FOUNDER_IDS.has(String(user.id))
            ? [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 1,
                      label: '👑 Principal Override: Install KvK Diplo Free ($0)',
                      custom_id: `hermes_principal_force_arch|KVK_DIPLO_SERVER|${kingdoms[0] || '4194'}|${targetGuildId}`,
                    },
                  ],
                },
              ]
            : [],
        });
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

      await syncBabelGuildTopology(discordApi, targetGuildId);

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
    await reply({ type: 5, data: { flags: 64 } });

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
        return editOriginal({
          content: credit.error,
          components: VALHEON_FOUNDER_IDS.has(String(user.id))
            ? [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 1,
                      label: '👑 Principal Override: Install Coalition Free ($0)',
                      custom_id: `hermes_principal_force_arch|KVK_COALITION_SERVER|${kingdoms[0] || '4194'}|${targetGuildId}`,
                    },
                  ],
                },
              ]
            : [],
        });
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

      await syncBabelGuildTopology(discordApi, targetGuildId);

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
      await syncBabelGuildTopology(discordApi, remoteGuildId);
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

  if (ix.type === 5 && ix.data?.custom_id === 'hermes_bind_governor_modal') {
    await reply({ type: 5, data: { flags: 64 } });
    const comps = ix.data.components || [];
    const govId = (comps[0]?.components?.[0]?.value || '').trim();
    const govName = (comps[1]?.components?.[0]?.value || user.global_name || user.username || 'Governor').trim();
    const rawAlliance = (comps[2]?.components?.[0]?.value || 'VHN1').trim().replace(/[\[\]]/g, '').toUpperCase();
    const coords = (comps[3]?.components?.[0]?.value || '').trim();

    const bound = bindGovernorProfile({
      userId: user.id,
      username: user.global_name || user.username,
      govId,
      govName,
      alliance: rawAlliance,
      coords: coords || `UID:${govId} (No Grid Needed)`,
    });

    const memberRoles = Array.isArray(ix.member?.roles) ? ix.member.roles : [];
    const isKingdomServer = String(guildId) !== String(GUILD_ID);

    // In a Customer's Kingdom Discord: Unverified newcomers (0 roles) cannot bypass verification by typing text!
    // - On 🟢 Common Hermes: Manual R4/R5 Approval Queue (with a 🟠 Legendary AI Auto-OCR upgrade button for Officers)
    // - On 🟠 Legendary Hermes: Prompts them to drop a screenshot for 1-second AI OCR Auto-Approval (or R4 1-Click fallback)
    if (isKingdomServer && memberRoles.length === 0 && !VALHEON_FOUNDER_IDS.has(String(user.id))) {
      const safeTag = encodeURIComponent((rawAlliance || 'ALLY').slice(0, 8));
      const safeName = encodeURIComponent(govName.slice(0, 16));

      const queueComponents = [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: `✅ R4/R5: Approve [${rawAlliance}] ${govName.slice(0, 14)}`,
              custom_id: `hermes_ocr_approve_${user.id}_${govId}_${safeTag}_${safeName}`,
            },
            {
              type: 2,
              style: 4,
              label: '❌ R4/R5: Request In-Game Screenshot',
              custom_id: `hermes_ocr_reject_${user.id}`,
            },
          ],
        },
      ];

      if (!tierStatus.isLegendary) {
        queueComponents.push({
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: tierStatus.isWithin24h
                ? '🟠 Tired of Manual Clicking? Unlock 1-Sec AI Auto-OCR (+$15 / 24h)'
                : '🟠 Tired of Manual Clicking? Unlock 1-Sec AI Auto-OCR (+$25)',
              custom_id: 'hermes_upgrade_legendary_btn',
            },
          ],
        });
      }

      await discordApi('POST', `/channels/${channelId}/messages`, {
        embeds: [
          {
            title: tierStatus.isLegendary
              ? '⏳ MANUAL ID SUBMITTED // AWAITING SCREENSHOT OR R4/R5 APPROVAL'
              : '🛡️ MANUAL VERIFICATION QUEUE (🟢 COMMON HERMES // R4/R5 APPROVAL)',
            description: tierStatus.isLegendary
              ? `<@${user.id}> submitted a manual Governor ID entry (**\`[${rawAlliance}] ${govName}\`** • UID \`#${govId}\`).\n\n` +
                `📸 **Want Instant 1-Second Auto-Approval?**\n` +
                `Drop your in-game **Governor Profile Screenshot** right here in <#${channelId}>! **🟠 HERMES AI Vision OCR** will automatically approve you if you are in one of this Kingdom's primary alliances.\n\n` +
                `🛡️ **Visiting a Sister/Support Alliance or No Screenshot?**\n` +
                `Any **R4 Officer** or **R5 Sovereign** of this Kingdom can click **` +
                '`[✅ R4/R5: Approve]`' +
                `** below to unlock your war channels manually!`
              : `<@${user.id}> submitted a Governor verification request (**\`[${rawAlliance}] ${govName}\`** • UID \`#${govId}\`).\n\n` +
                `🛡️ **R4 / R5 Officers:** Click **` +
                '`[✅ R4/R5: Approve]`' +
                `** below to manually unlock this Governor's Kingdom War Rooms & **` +
                `\`[${rawAlliance}]\`` +
                `** Alliance Sector.\n\n` +
                `> 💡 **R5/R4 Upgrade Tip:** On **🟢 Common Hermes**, officers verify members manually. Upgrade to **🟠 Legendary Hermes** (\`+$15\` in 24h) to unlock **1-Second AI Vision OCR Auto-Approval** from screenshots!`,
            color: tierStatus.isLegendary ? 0xf59e0b : 0x22c55e,
            fields: [
              { name: '🆔 Entered Governor ID', value: `\`#${govId}\``, inline: true },
              { name: '👤 Entered Name', value: `\`${govName}\``, inline: true },
              { name: '🏰 Entered Alliance', value: `\`[${rawAlliance}]\``, inline: true },
              { name: '📍 Title Queue Coords', value: `\`${bound.coords}\``, inline: false },
            ],
            footer: {
              text: tierStatus.isLegendary
                ? '🟠 LEGENDARY HERMES // DROP SCREENSHOT FOR AI AUTO-OCR OR WAIT FOR R4 APPROVAL'
                : '🟢 COMMON HERMES // MANUAL R4/R5 OFFICER VERIFICATION QUEUE',
            },
            timestamp: new Date().toISOString(),
          },
        ],
        components: queueComponents,
      }).catch(() => null);

      return editOriginal({
        embeds: [
          {
            title: tierStatus.isLegendary
              ? '📸 DROP YOUR SCREENSHOT FOR INSTANT AI AUTO-APPROVAL (OR WAIT FOR R4/R5)'
              : '⏳ QUEUED FOR MANUAL R4/R5 OFFICER APPROVAL (🟢 COMMON HERMES)',
            description: tierStatus.isLegendary
              ? `Your Governor ID (**\`#${bound.govId}\`**) and Title Queue Coordinates (**\`${bound.coords}\`**) have been saved!\n\n` +
                `• **🟠 Instant AI Vision OCR Auto-Approval:** Simply **upload/paste a screenshot of your in-game Governor Profile** right in <#${channelId}> — if **HERMES** sees you in one of this Kingdom's alliances, it unlocks your War Channels immediately!\n` +
                `• **🟡 Sister/Support Alliance or Older Picture?** We also posted your card in <#${channelId}> so any **R4/R5 Officer** in this Kingdom can approve you in 1 click.`
              : `Your Governor ID (**\`#${bound.govId}\`**), Alliance (**\`[${bound.alliance}]\`**), and Title Coordinates (**\`${bound.coords}\`**) have been submitted to the **R4/R5 High Council Queue** in <#${channelId}>!\n\n` +
                `• **📸 Speed Up R4 Review:** You can also drop a screenshot of your in-game **Governor Profile** in <#${channelId}> so an R4/R5 Officer can visually confirm your account and click **\`[✅ Approve]\`**.`,
            color: tierStatus.isLegendary ? 0xf59e0b : 0x22c55e,
            footer: {
              text: tierStatus.isLegendary
                ? '🟠 LEGENDARY BORDER GATE // AI SCREENSHOT AUTO-OCR + R4 FALLBACK'
                : '🟢 COMMON BORDER GATE // MANUAL R4/R5 OFFICER APPROVAL QUEUE',
            },
          },
        ],
      });
    }

    const grantedRoles = [];
    try {
      const roles = (await discordApi('GET', `/guilds/${guildId}/roles`)) || [];
      const citizenRole = roles.find(
        (r) =>
          r.name.toLowerCase().includes('sworn defender') ||
          r.name.toLowerCase().includes('frontline brawler') ||
          r.name.toLowerCase().includes('frontline fighter') ||
          r.name.toLowerCase().includes('confirmed jumper') ||
          r.name.toLowerCase().includes('lost kingdom envoy') ||
          r.name.toLowerCase().includes('verified') ||
          r.name.toLowerCase().includes('coalition fighter') ||
          r.name.toLowerCase().includes('summit delegate')
      );
      if (citizenRole) {
        await discordApi('PUT', `/guilds/${guildId}/members/${user.id}/roles/${citizenRole.id}`).catch(() => null);
        grantedRoles.push(`<@&${citizenRole.id}>`);
      }

      const allianceRole = roles.find(
        (r) =>
          r.name.toUpperCase().includes(`[${rawAlliance}]`) ||
          r.name.toUpperCase().includes(`#${rawAlliance}`) ||
          r.name.toUpperCase().includes(`${rawAlliance} `)
      );
      if (allianceRole) {
        await discordApi('PUT', `/guilds/${guildId}/members/${user.id}/roles/${allianceRole.id}`).catch(() => null);
        grantedRoles.push(`<@&${allianceRole.id}>`);
      }

      const formattedNick = `[${rawAlliance}] ${govName}`.slice(0, 32);
      await discordApi('PATCH', `/guilds/${guildId}/members/${user.id}`, {
        nick: formattedNick,
      }).catch(() => null);
    } catch {
      // Ignore role/nick errors if bot role hierarchy or Server Owner prevents nickname edit
    }

    return editOriginal({
      embeds: [
        {
          title: '✅ GOVERNOR PROFILE & TITLE COORDINATES UPDATED',
          description:
            `Your Zero-Grid Title Queue profile is synced for **[${bound.alliance}] ${bound.name}** (<@${user.id}>)!`,
          color: 0x10b981,
          fields: [
            {
              name: '🆔 Bound Governor UID',
              value: `\`#${bound.govId}\``,
              inline: true,
            },
            {
              name: '🏰 Alliance Sector',
              value: `\`[${bound.alliance}]\``,
              inline: true,
            },
            {
              name: '📍 Zero-Grid Title Coords',
              value: `\`${bound.coords}\``,
              inline: true,
            },
          ],
          footer: {
            text: 'VALHEON SOVEREIGN IDENTITY ENGINE // ZERO-GRID PROFILE LINKED',
          },
          timestamp: new Date().toISOString(),
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

  // Top-level /mystats Slash Command (Requires 👑 Valheon Hermes Live Kingdom Scanner Link!)
  if (ix.type === 2 && ix.data?.name === 'mystats') {
    if (!tierStatus.isValheon) {
      return reply({
        type: 4,
        data: {
          flags: 64,
          ...buildValheonLockoutPayload({
            guildId,
            featureName: 'Live KvK DKP Scorecard (/mystats)',
            teaserText:
              '🪪 **Live KvK DKP Scorecards & Real-Time Kill/Dead Goal Tracking** require active Kingdom Scan Data via **👑 Valheon Hermes (`$45/mo`)**!',
          }),
        },
      });
    }
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
      if (!tierStatus.isValheon) {
        return reply({
          type: 4,
          data: {
            flags: 64,
            ...buildValheonLockoutPayload({
              guildId,
              featureName: 'AI Governor Live Scan Roaster',
              teaserText:
                '💀 **HERMES AI Governor Telemetry Roaster & Live 35-Field Scan Audit** requires **👑 Valheon Hermes (`$45/mo` Live Kingdom Scanner Bots)**!',
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
      const bp = sub.options?.find((o) => o.name === 'blueprint')?.value || 'KINGDOM_WAR_SERVER';
      const kdRaw = sub.options?.find((o) => o.name === 'kingdom_id')?.value || '4194';
      const alliancesRaw = (sub.options?.find((o) => o.name === 'alliances')?.value || '').trim();
      const remoteGuildOpt = (
        sub.options?.find((o) => o.name === 'target_guild_id')?.value || guildId
      ).trim();
      const includeTrapOpt = Boolean(
        sub.options?.find((o) => o.name === 'include_trap_channel')?.value
      );

      if (bp === 'VALHEON_HQ' && String(remoteGuildOpt) !== String(GUILD_ID)) {
        return editOriginal({
          content: '🛡️ **Valheon Citadel Exclusive Lock:** The `VALHEON_HQ` blueprint is strictly locked to the official Valheon Citadel HQ server (`1563618222895407166`).',
        });
      }

      const kdList = kdRaw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const customAlliances = alliancesRaw
        ? alliancesRaw
            .split(',')
            .map((s) => s.trim().replace(/^\[|\]$/g, '').toUpperCase())
            .filter(Boolean)
        : kdList.length > 1
        ? kdList
        : undefined;

      const targetStatus = getGuildTierStatus(remoteGuildOpt);
      const isPrincipal = VALHEON_FOUNDER_IDS.has(String(user.id));
      const hasPaidLicense =
        isPrincipal ||
        String(remoteGuildOpt) === String(GUILD_ID) ||
        Boolean(targetStatus?.licensed && targetStatus?.paidSessionId);

      // Strict Stripe Checkout Paywall for all non-Principal users on unlicensed servers!
      // (Lauren 184977944433786880 has Silent Principal Auto-Bypass -> installs immediately for $0.00 and is done!)
      if (!hasPaidLicense) {
        const planKey =
          bp === 'KVK_DIPLO_SERVER'
            ? 'KVK_DIPLO_9'
            : bp === 'KVK_COALITION_SERVER'
            ? 'KVK_COALITION_9'
            : 'KINGDOM_39';
        const checkout = await createStripeCheckoutForDiscord({
          planKey,
          userId: user.id,
          username: user.username,
          guildId: remoteGuildOpt,
        });

        const components = [
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
                label: '✅ Step 2: Verify Payment & Launch Builder',
                custom_id: `hermes_stripe_verify_${planKey}`,
              },
            ],
          },
        ];

        return editOriginal({
          embeds: [
            {
              title: `💳 VALHEON 1-CLICK ARCHITECT PAYWALL // ${checkout.item.name.toUpperCase()}`,
              description:
                `Server **\`${remoteGuildOpt}\`** requires an active **Valheon 1-Click Server License** (**\`${checkout.item.priceDisplay}\`**) before provisioning **\`${bp}\`**.\n\n` +
                `• **What's Included:** ${checkout.item.description} + **🪽 17-Language Omni-Matrix**!\n` +
                `• **Have a Giveaway / Promo Code?** Click **"Add promotion code"** on the Stripe checkout page.\n\n` +
                `👉 **Step 1:** Click **` +
                '`[💳 Step 1: Pay via Valheon Stripe]`' +
                `** below.\n` +
                `👉 **Step 2:** Click **` +
                '`[✅ Step 2: Verify Payment & Launch Builder]`' +
                `** to unlock and build your server in 18 seconds!`,
              color: 0xf59e0b,
              footer: {
                text: 'VALHEON STRIPE PAYWALL // 1 LICENSE = 1 DISCORD SERVER ID',
              },
            },
          ],
          components,
        });
      }

      const authCheck = await verifyServerSovereignAuthorization(
        ix,
        remoteGuildOpt,
        targetStatus
      );
      if (!authCheck.allowed) {
        return editOriginal({
          content:
            `🛡️ **Sovereign Purchase Protection // Access Denied:** Only the **Verified Server Owner / Buyer** or **Crowned R5 Sovereign** is authorized to run \`/hermes architect\` on \`${remoteGuildOpt}\`. R4 Officers and standard members cannot alter the server blueprint.`,
        });
      }

      const deployOpts = {
        kingdomId: kdList[0] || '4194',
        alliances: customAlliances,
        keepExistingStarterChannels: bp === 'OMNI_LANGUAGE_MATRIX_ONLY',
        includeTrapChannel: includeTrapOpt,
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
        paidSessionId: targetStatus?.paidSessionId || `principal_direct_${Date.now()}`,
        blueprintType: bp,
        deployOptions: deployOpts,
      });
      await syncBabelGuildTopology(discordApi, remoteGuildOpt);
      return editOriginal({
        content: `👑 **HERMES 1-Click Architect Complete for \`${res.guildName}\` (\`${remoteGuildOpt}\` • \`${bp}\`)!** Provisioned/verified **\`${res.log.length}\`** items (including the **17-Language Omni-Matrix**) at \`$0.00\`.`,
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
        await syncBabelGuildTopology(discordApi, BABEL_EXCLUSIVE_GUILD_ID);
      }
      if (t === 'GUILD_CREATE' && d?.id) {
        registerSlashCommands(d.id).catch(() => {});
        syncBabelGuildTopology(discordApi, d.id).catch(() => {});
      }
      if (t === 'INTERACTION_CREATE') {
        const ixUser = d.member?.user || d.user;
        if (ixUser && !ixUser.bot) {
          touchBabelUserActivity(ixUser.id);
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
        touchBabelUserActivity(d.user_id);
        recordSilentSignal({
          userId: d.user_id,
          username: d.member?.user?.username || d.user_id,
          allianceTag: 'VHN1',
          signalType: 'DISCORD_VOICE',
        });
      }
      // Silent Message, Zero-Grid Chat Title Trigger ("justice", "duke", "scientist", "architect", "done") & Auto-OCR
      if (t === 'MESSAGE_CREATE' && d.author && !d.author.bot && d.author.id !== APP_ID) {
        touchBabelUserActivity(d.author.id);
        recordSilentSignal({
          userId: d.author.id,
          username: d.author.username,
          allianceTag: 'VHN1',
          signalType: 'DISCORD_MSG',
        });
        try {
          const fullMsg = await discordApi('GET', `/channels/${d.channel_id}/messages/${d.id}`);
          const rawContent = String(fullMsg?.content || d.content || '').trim().toLowerCase();

          // 0. HERMES 17-LANGUAGE OMNI-MATRIX REAL-TIME WEBHOOK AVATAR-CLONED TRANSLATOR (MULTI-GUILD)
          if (d.guild_id && !d.webhook_id) {
            await handleBabelMirrorMessage(discordApi, {
              ...d,
              content: fullMsg?.content ?? d.content ?? '',
              attachments: fullMsg?.attachments ?? d.attachments ?? [],
            });
          }

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

          // 2. AUTO-OCR ON SCREENSHOT DROP + ANTI-SPAMBOT HONEYPOT (#⚠️-trap-channel-⚠️)
          const chanInfo = await discordApi('GET', `/channels/${d.channel_id}`).catch(() => null);
          const chanName = String(chanInfo?.name || '').toLowerCase();

          // 🛡️ AUTOMATED ANTI-SPAMBOT HONEYPOT INTERCEPTOR (#⚠️-trap-channel-⚠️)
          if (chanName.includes('trap-channel') || chanName.includes('honeypot')) {
            const msgGuildId = d.guild_id || GUILD_ID;
            // 1. Immediately purge the spam message
            await discordApi('DELETE', `/channels/${d.channel_id}/messages/${d.id}`).catch(() => null);

            // 2. Protect Principal / Server Owners from accidental self-kick while testing
            const isProtectedSovereign = VALHEON_FOUNDER_IDS.has(String(d.author.id));
            if (!isProtectedSovereign) {
              await discordApi(
                'DELETE',
                `/guilds/${msgGuildId}/members/${d.author.id}`
              ).catch(() => null);
            }

            const trapAlert = await discordApi('POST', `/channels/${d.channel_id}/messages`, {
              content: isProtectedSovereign
                ? `🛡️ **[HERMES HONEYPOT TEST PASSED]:** Purged test message from Sovereign <@${d.author.id}> in <100ms! *(Auto-Kick bypassed for Sovereign Owner safety; standard raid/spambot accounts are immediately kicked).*`
                : `🛡️ **[HERMES HONEYPOT TRIGGERED]:** Purged spam payload & ejected compromised/bot account **@${d.author.username}** (\`${d.author.id}\`)!`,
            }).catch(() => null);

            if (trapAlert?.id) {
              setTimeout(() => {
                discordApi('DELETE', `/channels/${d.channel_id}/messages/${trapAlert.id}`).catch(() => null);
              }, 10000);
            }
            return;
          }

          const isVerifyGateChan =
            chanName.includes('verify-governor-id') || chanName.includes('welcome-and-manifesto');
          const att = fullMsg?.attachments?.[0];

          // Keep #🔗-verify-governor-id clean: if an unverified user types plain text without a screenshot, auto-clean it!
          if (isVerifyGateChan && (!att?.url || !/\.(png|jpe?g|webp)/i.test(att.filename || att.url))) {
            if (!VALHEON_FOUNDER_IDS.has(String(d.author.id))) {
              setTimeout(() => {
                discordApi('DELETE', `/channels/${d.channel_id}/messages/${d.id}`).catch(() => null);
              }, 1500);
              const reminder = await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                content: `📸 <@${d.author.id}> **Drop a screenshot of your in-game Governor Profile** right here for 1-second Auto-OCR Verification, or click **\`[🔗 Manual ID Entry]\`** on the pinned card above!`,
              }).catch(() => null);
              if (reminder?.id) {
                setTimeout(() => {
                  discordApi('DELETE', `/channels/${d.channel_id}/messages/${reminder.id}`).catch(() => null);
                }, 9000);
              }
            }
          }

          if (att?.url && /\.(png|jpe?g|webp)/i.test(att.filename || att.url)) {
            recordSilentSignal({
              userId: d.author.id,
              username: d.author.username,
              allianceTag: 'VHN1',
              signalType: 'OCR_REPORT',
            });

            if (isVerifyGateChan) {
              const msgGuildId = d.guild_id || GUILD_ID;
              const msgTier = getGuildTierStatus(msgGuildId);

              // 🟢 COMMON HERMES: Manual R4/R5 Officer Verification Queue (AI Vision Auto-OCR is an 🟠 Legendary Hermes feature!)
              if (!msgTier.isLegendary) {
                const roles = (await discordApi('GET', `/guilds/${msgGuildId}/roles`).catch(() => [])) || [];
                const serverAllianceTags = roles
                  .map((r) => r.name.match(/\[([^\]]+)\]/)?.[1])
                  .filter(Boolean)
                  .slice(0, 3);
                const savedBound = ROK_IDENTITY_STORE.get(d.author.id);
                const fallbackGovId = savedBound?.govId || '00000000';
                const fallbackName = savedBound?.name || d.author.global_name || d.author.username || 'Governor';
                const safeFallbackName = encodeURIComponent(String(fallbackName).slice(0, 16));

                const manualButtons = serverAllianceTags.map((tag) => ({
                  type: 2,
                  style: 3, // SUCCESS
                  label: `✅ R4/R5: Approve [${tag}]`,
                  custom_id: `hermes_ocr_approve_${d.author.id}_${fallbackGovId}_${encodeURIComponent(tag)}_${safeFallbackName}`,
                }));

                manualButtons.push({
                  type: 2,
                  style: manualButtons.length === 0 ? 3 : 2,
                  label: '✅ R4/R5: Approve Citizen',
                  custom_id: `hermes_ocr_approve_${d.author.id}_${fallbackGovId}_MANUAL_${safeFallbackName}`,
                });

                manualButtons.push({
                  type: 2,
                  style: 4, // DANGER
                  label: '❌ Reject',
                  custom_id: `hermes_ocr_reject_${d.author.id}`,
                });

                await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                  message_reference: { message_id: d.id },
                  embeds: [
                    {
                      title: '🛡️ SCREENSHOT QUEUED // MANUAL R4/R5 OFFICER APPROVAL (🟢 COMMON HERMES)',
                      description:
                        `<@${d.author.id}> uploaded a **Governor Profile Screenshot** for verification!\n\n` +
                        `• **🛡️ R4 / R5 High Council:** Please visually inspect the screenshot above and click the matching **` +
                        '`[✅ R4/R5: Approve]`' +
                        `** button below to grant **\`@🛡️ Sworn Defender\`** + their **Alliance Sector** role.\n\n` +
                        `### 🟠 TIRED OF MANUALLY CLICKING APPROVE ON 300+ MEMBERS?\n` +
                        `This server is running **🟢 Common Hermes (Manual R4 Approval Gate)**. Upgrade to **🟠 Legendary Hermes** (${
                          msgTier.isWithin24h
                            ? `**\`+$15 One-Time\`** in first 24h — expires <t:${msgTier.offerExpiresUnix}:R>`
                            : `**\`+$25 One-Time\`**`
                        } • \`$0/mo\` recurring) to unlock **1-Second AI Vision OCR Auto-Verification**:\n` +
                        `• 🤖 **Auto-Reads Screenshot:** Extracts \`Governor ID\`, \`Name\`, \`Alliance [TAG]\`, \`Power\`, \`Kill Points\` & \`Action Points\` in 1 second.\n` +
                        `• ⚡ **Zero-Click Role & Nickname Grant:** Automatically unlocks War Rooms & assigns \`@Alliance Vanguard\` roles if their \`[TAG]\` matches your Kingdom!`,
                      color: 0x22c55e,
                      footer: {
                        text: '🟢 COMMON HERMES (MANUAL R4 QUEUE) -> UPGRADE TO 🟠 LEGENDARY FOR 1-SEC AI AUTO-OCR',
                      },
                      timestamp: new Date().toISOString(),
                    },
                  ],
                  components: [
                    {
                      type: 1,
                      components: manualButtons.slice(0, 5),
                    },
                    {
                      type: 1,
                      components: [
                        {
                          type: 2,
                          style: 1, // PRIMARY
                          label: msgTier.isWithin24h
                            ? '🟠 Unlock 1-Sec AI Vision Auto-OCR (+$15 / 24h)'
                            : '🟠 Unlock 1-Sec AI Vision Auto-OCR (+$25 One-Time)',
                          custom_id: 'hermes_upgrade_legendary_btn',
                        },
                      ],
                    },
                  ],
                });
              } else {
                // 🟠 LEGENDARY HERMES: 1-Second AI Vision OCR Auto-Verification & Auto-Role Assignment!
                console.log(`📸 [HERMES Verify Gate OCR] Scanning profile screenshot ${att.filename} by ${d.author.username}...`);
                const ocrRes = await runLocalOcrOnUrl(att.url);

                if (ocrRes?.mode === 'GOVERNOR_PROFILE' && ocrRes.gov_id) {
                  const govId = String(ocrRes.gov_id).trim();
                  const govName = String(ocrRes.gov_name || d.author.global_name || d.author.username || 'Governor').trim();
                  const rawTag = String(ocrRes.alliance_tag || '').trim();
                  const upperTag = rawTag.toUpperCase();

                  const roles = (await discordApi('GET', `/guilds/${msgGuildId}/roles`).catch(() => [])) || [];
                  const citizenRole = roles.find(
                    (r) =>
                      r.name.toLowerCase().includes('sworn defender') ||
                      r.name.toLowerCase().includes('frontline brawler') ||
                      r.name.toLowerCase().includes('frontline fighter') ||
                      r.name.toLowerCase().includes('confirmed jumper') ||
                      r.name.toLowerCase().includes('lost kingdom envoy') ||
                      r.name.toLowerCase().includes('verified')
                  );

                  // Extract all Alliance roles configured on this server (e.g. "🛡️ [VHN1] Vanguard")
                  const serverAllianceRoles = roles.filter((r) => /\[[^\]]+\]/.test(r.name));
                  let matchedAllianceRole = upperTag
                    ? serverAllianceRoles.find((r) => r.name.toUpperCase().includes(`[${upperTag}]`))
                    : null;

                  // SMART DEFAULT PLACEHOLDER ADOPTION:
                  // If the server was deployed via /hermes architect without custom alliance tags (so it still has
                  // uncustomized [VHN1]..[VHN4] template roles) and the player's screenshot has a real [TAG] (e.g. [E~97]),
                  // automatically adopt their [TAG] into the first available [VHN1..4] slot so they are auto-approved!
                  const hasOnlyDefaultTemplateAlliances =
                    serverAllianceRoles.length === 0 ||
                    serverAllianceRoles.every((r) => /\[VHN[1-4]\]/i.test(r.name));

                  if (!matchedAllianceRole && upperTag && !/^VHN[1-4]$/i.test(upperTag)) {
                    const defaultPlaceholderRole = serverAllianceRoles.find((r) => /\[VHN[1-4]\]/i.test(r.name));
                    if (defaultPlaceholderRole) {
                      const oldTagMatch = defaultPlaceholderRole.name.match(/\[(VHN[1-4])\]/i)?.[1];
                      const newRoleName = defaultPlaceholderRole.name.replace(/\[VHN[1-4]\]/i, `[${upperTag}]`);
                      const updatedRole = await discordApi(
                        'PATCH',
                        `/guilds/${msgGuildId}/roles/${defaultPlaceholderRole.id}`,
                        { name: newRoleName }
                      ).catch(() => null);
                      matchedAllianceRole = updatedRole || defaultPlaceholderRole;

                      if (oldTagMatch) {
                        const guildChans = (await discordApi('GET', `/guilds/${msgGuildId}/channels`).catch(() => [])) || [];
                        const oldSlug = oldTagMatch.toLowerCase();
                        const newSlug = upperTag.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        for (const ch of guildChans) {
                          if (ch.name && ch.name.toLowerCase().includes(oldSlug)) {
                            await discordApi('PATCH', `/channels/${ch.id}`, {
                              name: ch.name.replace(new RegExp(oldTagMatch, 'ig'), newSlug || upperTag),
                            }).catch(() => null);
                          }
                        }
                      }
                    }
                  }

                  // Auto-approve if:
                  //   (a) The screenshot's [TAG] matches (or was auto-adopted into) one of this Kingdom server's Alliance Roles, OR
                  //   (b) No custom alliances were baked into this server yet (only default VHN1..4 placeholders), OR
                  //   (c) This is Valheon Global HQ (where players from all Kingdoms/Alliances verify by Governor ID)
                  const isValheonHq = String(msgGuildId) === String(GUILD_ID);
                  const shouldAutoApprove =
                    Boolean(matchedAllianceRole) ||
                    (hasOnlyDefaultTemplateAlliances && Boolean(govId)) ||
                    (isValheonHq && Boolean(govId));

                  if (shouldAutoApprove) {
                    const finalTag = rawTag || 'ROK';
                    bindGovernorProfile({
                      userId: d.author.id,
                      username: d.author.global_name || d.author.username,
                      govId,
                      govName,
                      alliance: finalTag,
                      coords: `UID:${govId} (No Grid Needed)`,
                    });

                    const grantedRoles = [];
                    if (citizenRole) {
                      await discordApi('PUT', `/guilds/${msgGuildId}/members/${d.author.id}/roles/${citizenRole.id}`).catch(() => null);
                      grantedRoles.push(`<@&${citizenRole.id}>`);
                    }
                    if (matchedAllianceRole) {
                      await discordApi('PUT', `/guilds/${msgGuildId}/members/${d.author.id}/roles/${matchedAllianceRole.id}`).catch(() => null);
                      grantedRoles.push(`<@&${matchedAllianceRole.id}>`);
                    }

                    const formattedNick = `[${finalTag}] ${govName}`.slice(0, 32);
                    await discordApi('PATCH', `/guilds/${msgGuildId}/members/${d.author.id}`, {
                      nick: formattedNick,
                    }).catch(() => null);

                    await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                      message_reference: { message_id: d.id },
                      embeds: [
                        {
                          title: '✅ AI VISION OCR VERIFIED & AUTO-APPROVED! (🟠 LEGENDARY HERMES)',
                          description:
                            `Welcome aboard, **[${finalTag}] ${govName}** (<@${d.author.id}>)!\n` +
                            `**🟠 HERMES AI Vision OCR** scanned your Governor Profile screenshot, verified your alliance membership, and unlocked your war channels automatically.`,
                          color: 0x10b981,
                          fields: [
                            { name: '🆔 Scanned Governor ID', value: `\`#${govId}\``, inline: true },
                            { name: '👤 In-Game Name', value: `\`${govName}\``, inline: true },
                            { name: '🏰 Verified Alliance', value: `\`${ocrRes.alliance_full || '[' + finalTag + ']'}\``, inline: true },
                            { name: '⚡ Scanned Power', value: `\`${fmtNum(ocrRes.power)}\` (**${fmtCompact(ocrRes.power)}**)`, inline: true },
                            { name: '⚔️ Scanned Kill Points', value: `\`${fmtNum(ocrRes.kill_points)}\` (**${fmtCompact(ocrRes.kill_points)}**)`, inline: true },
                            {
                              name: '🛡️ Self-Profile Check',
                              value: ocrRes.is_self_profile
                                ? `🟢 **Own Account (${ocrRes.action_points || 'AP Visible'})**`
                                : '🟢 **Profile Card Verified**',
                              inline: true,
                            },
                            {
                              name: '🔓 Unlocked Discord Roles',
                              value: grantedRoles.join(' • ') || '✅ Verified Citizen & War Channels Unlocked',
                              inline: false,
                            },
                          ],
                          footer: {
                            text: '🟠 LEGENDARY HERMES // AI VISION AUTO-VERIFIER • ZERO-GRID PROFILE BOUND',
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
                              style: 2,
                              label: '📍 Optional: Set City X/Y Coords for Title Queue',
                              custom_id: 'hermes_verify_governor',
                            },
                          ],
                        },
                      ],
                    });
                  } else {
                    // SISTER ALLIANCE / SUPPORT JUMP / OLDER SCREENSHOT -> HOLD FOR 1-CLICK R4/R5 MANUAL APPROVAL!
                    const safeTag = encodeURIComponent((rawTag || 'ALLY').slice(0, 8));
                    const safeName = encodeURIComponent(govName.slice(0, 16));
                    const expectedTags =
                      serverAllianceRoles
                        .map((r) => r.name.match(/\[([^\]]+)\]/)?.[1])
                        .filter(Boolean)
                        .map((t) => `\`[${t}]\``)
                        .join(', ') || '`[VHN1]`, `[VHN2]`';

                    const approvalButtons = [
                      {
                        type: 2,
                        style: 3, // SUCCESS
                        label: `✅ R4/R5: Approve [${rawTag || 'ALLY'}] ${govName.slice(0, 14)} (Sister/Support)`,
                        custom_id: `hermes_ocr_approve_${d.author.id}_${govId}_${safeTag}_${safeName}`,
                      },
                    ];
                    if (rawTag && rawTag !== 'NONE') {
                      approvalButtons.push({
                        type: 2,
                        style: 1, // PRIMARY
                        label: `🏰 R4/R5: Approve & Add [${rawTag}] Role to Server`,
                        custom_id: `hermes_ocr_adopt_${d.author.id}_${govId}_${safeTag}_${safeName}`,
                      });
                    }
                    approvalButtons.push({
                      type: 2,
                      style: 4, // DANGER
                      label: '❌ R4/R5: Request Fresh Screenshot',
                      custom_id: `hermes_ocr_reject_${d.author.id}`,
                    });

                    const approvalPayload = {
                      message_reference: { message_id: d.id },
                      embeds: [
                        {
                          title: '⏳ AI OCR SCANNED // PENDING R4/R5 SISTER-ALLIANCE APPROVAL',
                          description:
                            `**🟠 HERMES AI Vision OCR** successfully extracted your Governor Profile (<@${d.author.id}>), but your screenshot's alliance tag (**\`[${rawTag || 'NONE'}]\`**) is not one of this server's primary auto-approve sectors (${expectedTags}).\n\n` +
                            `💡 **Jumping to a Sister/Support Alliance to help, or using an older picture?**\n` +
                            `No problem! Your profile is queued below — any **R4 Officer** or **R5 Sovereign** can approve your access (or add **\`[${rawTag || 'ALLY'}]\`** as an official server alliance) in **1 click**!`,
                          color: 0xf59e0b,
                          fields: [
                            { name: '🆔 Scanned Governor ID', value: `\`#${govId}\``, inline: true },
                            { name: '👤 In-Game Name', value: `\`${govName}\``, inline: true },
                            { name: '🏰 Screenshot Alliance', value: `\`${ocrRes.alliance_full || '[' + (rawTag || 'NONE') + ']'}\``, inline: true },
                            { name: '⚡ Scanned Power', value: `\`${fmtNum(ocrRes.power)}\` (**${fmtCompact(ocrRes.power)}**)`, inline: true },
                            { name: '⚔️ Scanned Kill Points', value: `\`${fmtNum(ocrRes.kill_points)}\` (**${fmtCompact(ocrRes.kill_points)}**)`, inline: true },
                            {
                              name: '🛡️ Self-Profile Check',
                              value: ocrRes.is_self_profile
                                ? `🟢 **Own Account (${ocrRes.action_points || 'AP Visible'})**`
                                : 'ℹ️ **Standard Profile View**',
                              inline: true,
                            },
                          ],
                          footer: {
                            text: 'R4 / R5 OFFICERS: CLICK [✅ Approve] OR [🏰 Approve & Add Role] BELOW TO UNLOCK WAR CHANNELS',
                          },
                          timestamp: new Date().toISOString(),
                        },
                      ],
                      components: [
                        {
                          type: 1,
                          components: approvalButtons,
                        },
                      ],
                    };

                    await discordApi('POST', `/channels/${d.channel_id}/messages`, approvalPayload);
                  }
                } else {
                  await discordApi('POST', `/channels/${d.channel_id}/messages`, {
                    message_reference: { message_id: d.id },
                    content:
                      `⚠️ <@${d.author.id}> **HERMES Vision OCR** couldn't find a clear \`Governor (ID: ...)\` on that image. Please upload an uncropped **Governor Profile** screenshot (showing your **ID**, **Name**, **Alliance**, **Power**, and **Kill Points**), or click **\`[🔗 Manual ID Entry]\`** above!`,
                  });
                }
              }
            } else if (chanName.includes('ocr') || chanName.includes('optics')) {
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
