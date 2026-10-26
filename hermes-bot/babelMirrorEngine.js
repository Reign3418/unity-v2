/**
 * ============================================================================
 * VALHEON SOVEREIGN 17-LANGUAGE OMNI-MATRIX ENGINE (`babelMirrorEngine.js`)
 * ============================================================================
 * EXCLUSIVE TO VALHEON CITADEL HQ (`1563618222895407166`) — DO NOT SHARE ON
 * EXTERNAL CUSTOMER SERVERS YET.
 * 100% Culturally & Religiously Neutral ("🪽 HERMES OMNI-LANGUAGE MATRIX").
 *
 * 4-Pillar Sovereign Scale Architecture (Built for the Full RoK Fanbase):
 *   1. Strict 1-Language Role + Live Presence Gate (Zero Offline Waste):
 *      Each member holds strictly 1 `@🌐 Language Role` at a time (switchable
 *      anytime in `#🌐-select-your-language`). Real-time chat translation ONLY
 *      fans out to languages that have >= 1 subscriber who is CURRENTLY AWAKE
 *      (active in the last 45 minutes via message/click/reaction/voice) — or
 *      when Founder Overwatch is toggled ON. If a language's users are offline,
 *      zero API calls and zero Webhooks are wasted!
 *   2. 1.2-Second Rapid-Fire Message Coalescer + Per-Channel Webhook Queue:
 *      Merges rapid-fire lines from the same speaker within 1,200ms into 1
 *      single translation & 1 Webhook post, queued at <= 2 posts/sec per room
 *      to guarantee zero Discord HTTP 429 rate limits.
 *   3. Server-Side `<4MB` Tier-0 RoK Instant Dictionary & LRU Cache:
 *      Resolves universal RoK tokens (`gg`, `lol`, `omw`, `ty`, coordinates
 *      `X:614 Y:588`, numbers, emojis) in `0.01ms` in `bot.mjs` RAM with zero
 *      outbound network calls.
 *   4. Bare-Metal Neural MT Hook (`VALHEON_MT_ENDPOINT`) + Cloud Failover:
 *      Routes through your self-hosted bare-metal CTranslate2 / NLLB-200 node
 *      when `VALHEON_MT_ENDPOINT` is set, with automatic zero-downtime failover
 *      to `clients5.google.com` + `mymemory` cloud endpoints.
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyRokGlossaryPre } from './rokGlossaryBridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BABEL_STATE_PATH = path.resolve(__dirname, './data/babel_state.json');

// Strict Flagship Lock — Only runs inside Valheon Citadel HQ
export const BABEL_EXCLUSIVE_GUILD_ID = '1563618222895407166';
export const VALHEON_PRINCIPAL_ID = '184977944433786880';

// Live Presence Window: 45 minutes since last Discord signal (msg, click, reaction, voice)
const LIVE_PRESENCE_WINDOW_MS = 45 * 60 * 1000;
// Rapid-Fire Coalescing Window: 1.2 seconds
const COALESCE_WINDOW_MS = 1200;

export const BABEL_LANGUAGES = [
  {
    code: 'en',
    roleKey: 'lang_en',
    roleName: '🇺🇸 English Speaker',
    buttonLabel: '🇺🇸 English',
    channelName: '💬-citadel-global-chat',
    channelTopic:
      '🇺🇸 Valheon Citadel Global Chat — Speak in English; HERMES seamlessly mirrors all 17 international languages into this room in real time.',
    color: 0x3b82f6,
    welcomeTitle: '🇺🇸 SERVER LANGUAGE SET TO ENGLISH (1/17)',
    welcomeBody:
      'Your sidebar has been tailored to **English**! Head into {CHANNEL} — everyone across all 17 languages will appear in English automatically, and anything you type will be mirrored to awake international governors in their own native language.',
    announcementHeader: '📢 OFFICIAL VALHEON CITADEL ANNOUNCEMENT',
  },
  {
    code: 'vi',
    roleKey: 'lang_vi',
    roleName: '🇻🇳 Tiếng Việt (Vietnamese)',
    buttonLabel: '🇻🇳 Tiếng Việt',
    channelName: '💬-trò-chuyện-đại-sảnh',
    channelTopic:
      '🇻🇳 Đại Sảnh Valheon Citadel — Trò chuyện bằng Tiếng Việt; mọi tin nhắn từ 17 ngôn ngữ quốc tế được dịch tự động theo thời gian thực.',
    color: 0xef4444,
    welcomeTitle: '🇻🇳 ĐÃ CHUYỂN NGÔN NGỮ MÁY CHỦ SANG TIẾNG VIỆT (2/17)',
    welcomeBody:
      'Thanh kênh bên trái của bạn đã được chuyển sang **Tiếng Việt**! Hãy vào {CHANNEL} — bạn chỉ cần nhắn bằng Tiếng Việt, mọi Thống đốc quốc tế (17 ngôn ngữ) sẽ tự động hiển thị bằng Tiếng Việt!',
    announcementHeader: '📢 THÔNG BÁO CHÍNH THỨC TỪ VALHEON CITADEL',
  },
  {
    code: 'ko',
    roleKey: 'lang_ko',
    roleName: '🇰🇷 한국어 (Korean)',
    buttonLabel: '🇰🇷 한국어',
    channelName: '💬-시타델-전체-채팅',
    channelTopic:
      '🇰🇷 발헤온 시타델 전체 채팅 — 한국어로 대화하세요. 전 세계 17개 언어 총독들의 메시지가 실시간 한국어로 자동 표시됩니다.',
    color: 0x06b6d4,
    welcomeTitle: '🇰🇷 서버 언어가 한국어로 설정되었습니다 (3/17)',
    welcomeBody:
      '사이드바가 **한국어** 전용으로 전환되었습니다! {CHANNEL} 채널로 이동하세요. 한국어로 편하게 대화하시면 전 세계 17개 언어 총독들과 실시간 모국어로 소통됩니다.',
    announcementHeader: '📢 발헤온 시타델 공식 공지사항',
  },
  {
    code: 'ru',
    roleKey: 'lang_ru',
    roleName: '🇷🇺 Русский (Russian)',
    buttonLabel: '🇷🇺 Русский',
    channelName: '💬-общий-чат-цитадели',
    channelTopic:
      '🇷🇺 Общий чат Цитадели Валхеон — общайтесь на русском языке; сообщения со всех 17 языков мира переводятся мгновенно.',
    color: 0x8b5cf6,
    welcomeTitle: '🇷🇺 ЯЗЫК СЕРВЕРА ПЕРЕКЛЮЧЕН НА РУССКИЙ (4/17)',
    welcomeBody:
      'Ваше меню каналов переключено на **Русский язык**! Переходите в {CHANNEL} — общайтесь на родном языке, а сообщения со всех 17 языков будут автоматически отображаться по-русски.',
    announcementHeader: '📢 ОФИЦИАЛЬНОЕ ОБЪЯВЛЕНИЕ ЦИТАДЕЛИ ВАЛХЕОН',
  },
  {
    code: 'ar',
    roleKey: 'lang_ar',
    roleName: '🇸🇦 العربية (Arabic)',
    buttonLabel: '🇸🇦 العربية',
    channelName: '💬-دردشة-القلعة-العامة',
    channelTopic:
      '🇸🇦 دردشة قلعة فالهيون العامة — تحدث باللغة العربية وسيتم عرض رسائل جميع الحكام من 17 لغة بالعربية تلقائياً.',
    color: 0x10b981,
    welcomeTitle: '🇸🇦 تم ضبط لغة الخادم إلى العربية (5/17)',
    welcomeBody:
      'تم تحويل قائمة القنوات الخاصة بك إلى **اللغة العربية**! انتقل إلى {CHANNEL} — تحدث بالعربية وستظهر رسائل جميع الحكام من 17 لغة بلغتك تلقائياً.',
    announcementHeader: '📢 إعلان رسمي من قلعة فالهيون',
  },
  {
    code: 'zh',
    roleKey: 'lang_zh',
    roleName: '🇨🇳 中文 (Chinese)',
    buttonLabel: '🇨🇳 中文',
    channelName: '💬-神殿全局聊天',
    channelTopic:
      '🇨🇳 瓦尔海恩神殿全局聊天 — 直接使用中文交流，全球17种语言执政官的发言将实时以中文呈现。',
    color: 0xf59e0b,
    welcomeTitle: '🇨🇳 服务器语言已切换为中文 (6/17)',
    welcomeBody:
      '您的左侧频道列表已切换为 **中文视图**！请前往 {CHANNEL} — 直接用中文发言，全球17种语言执政官的聊天都会自动显示为中文。',
    announcementHeader: '📢 瓦尔海恩神殿官方公告',
  },
  {
    code: 'ja',
    roleKey: 'lang_ja',
    roleName: '🇯🇵 日本語 (Japanese)',
    buttonLabel: '🇯🇵 日本語',
    channelName: '💬-シタデル総合チャット',
    channelTopic:
      '🇯🇵 ヴァルヘオン・シタデル総合チャット — 日本語のままで会話できます。世界17言語の総督の発言がリアルタイムで日本語表示されます。',
    color: 0xec4899,
    welcomeTitle: '🇯🇵 サーバー言語を日本語に設定しました (7/17)',
    welcomeBody:
      'チャンネル一覧が **日本語表示** に切り替わりました！ {CHANNEL} へどうぞ — 日本語でそのまま話すだけで、世界17言語の総督と母国語のまま会話できます。',
    announcementHeader: '📢 ヴァルヘオン・シタデル公式アナウンス',
  },
  {
    code: 'es',
    roleKey: 'lang_es',
    roleName: '🇪🇸 Español (Spanish)',
    buttonLabel: '🇪🇸 Español',
    channelName: '💬-chat-general-ciudadela',
    channelTopic:
      '🇪🇸 Chat General de la Ciudadela Valheon — Habla en español; los mensajes de los 17 idiomas aparecen en español en tiempo real.',
    color: 0xf97316,
    welcomeTitle: '🇪🇸 IDIOMA DEL SERVIDOR CAMBIADO A ESPAÑOL (8/17)',
    welcomeBody:
      '¡Tu barra lateral ahora está en **Español**! Entra a {CHANNEL} — escribe en tu idioma y verás a los gobernadores de los 17 idiomas en español automáticamente.',
    announcementHeader: '📢 ANUNCIO OFICIAL DE LA CIUDADELA VALHEON',
  },
  {
    code: 'tr',
    roleKey: 'lang_tr',
    roleName: '🇹🇷 Türkçe (Turkish)',
    buttonLabel: '🇹🇷 Türkçe',
    channelName: '💬-hisar-genel-sohbet',
    channelTopic:
      '🇹🇷 Valheon Hisarı Genel Sohbet — Türkçe konuşun; 17 dildeki tüm valilerin mesajları gerçek zamanlı olarak Türkçe görünür.',
    color: 0xe11d48,
    welcomeTitle: '🇹🇷 SUNUCU DİLİ TÜRKÇE OLARAK AYARLANDI (9/17)',
    welcomeBody:
      'Sol kanal listeniz **Türkçe** olarak güncellendi! {CHANNEL} kanalına geçin — kendi dilinizde yazın, 17 dildeki tüm oyuncuların mesajlarını Türkçe olarak görün.',
    announcementHeader: '📢 VALHEON HİSARI RESMİ DUYURUSU',
  },
  {
    code: 'id',
    roleKey: 'lang_id',
    roleName: '🇮🇩 Bahasa Indonesia',
    buttonLabel: '🇮🇩 Indonesia',
    channelName: '💬-obrolan-umum-benteng',
    channelTopic:
      '🇮🇩 Obrolan Umum Benteng Valheon — Mengobrol dalam Bahasa Indonesia; pesan dari 17 bahasa diterjemahkan secara real-time.',
    color: 0xdc2626,
    welcomeTitle: '🇮🇩 BAHASA SERVER DIATUR KE BAHASA INDONESIA (10/17)',
    welcomeBody:
      'Bilah sisi Anda telah disesuaikan ke **Bahasa Indonesia**! Masuk ke {CHANNEL} — ketik dalam Bahasa Indonesia dan semua gubernur dari 17 bahasa akan tampil dalam bahasa Anda.',
    announcementHeader: '📢 PENGUMUMAN RESMI BENTENG VALHEON',
  },
  {
    code: 'fr',
    roleKey: 'lang_fr',
    roleName: '🇫🇷 Français (French)',
    buttonLabel: '🇫🇷 Français',
    channelName: '💬-discussion-générale-citadelle',
    channelTopic:
      '🇫🇷 Discussion Générale de la Citadelle Valheon — Parlez en français ; les messages des 17 langues sont traduits en temps réel.',
    color: 0x2563eb,
    welcomeTitle: '🇫🇷 LANGUE DU SERVEUR RÉGLÉE SUR FRANÇAIS (11/17)',
    welcomeBody:
      'Votre barre latérale est maintenant en **Français** ! Rejoignez {CHANNEL} — discutez en français et voyez tous les gouverneurs des 17 langues dans votre langue.',
    announcementHeader: '📢 ANNONCE OFFICIELLE DE LA CITADELLE VALHEON',
  },
  {
    code: 'de',
    roleKey: 'lang_de',
    roleName: '🇩🇪 Deutsch (German)',
    buttonLabel: '🇩🇪 Deutsch',
    channelName: '💬-zitadelle-allgemeiner-chat',
    channelTopic:
      '🇩🇪 Allgemeiner Zitadellen-Chat — Schreib auf Deutsch; alle Nachrichten aus 17 Sprachen werden in Echtzeit auf Deutsch angezeigt.',
    color: 0xeab308,
    welcomeTitle: '🇩🇪 SERVERSPRACHE AUF DEUTSCH EINGESTELLT (12/17)',
    welcomeBody:
      'Deine Kanalliste wurde auf **Deutsch** umgestellt! Öffne {CHANNEL} — schreibe auf Deutsch und lies alle Gouverneure aus 17 Sprachen automatisch in deiner Muttersprache.',
    announcementHeader: '📢 OFFIZIELLE ANKÜNDIGUNG DER VALHEON-ZITADELLE',
  },
  {
    code: 'pt',
    roleKey: 'lang_pt',
    roleName: '🇧🇷 Português (Portuguese)',
    buttonLabel: '🇧🇷 Português',
    channelName: '💬-chat-geral-cidadela',
    channelTopic:
      '🇧🇷 Chat Geral da Cidadela Valheon — Converse em português; mensagens de 17 idiomas são traduzidas em tempo real.',
    color: 0x16a34a,
    welcomeTitle: '🇧🇷 IDIOMA DO SERVIDOR DEFINIDO PARA PORTUGUÊS (13/17)',
    welcomeBody:
      'Sua barra lateral foi ajustada para **Português**! Entre em {CHANNEL} — converse em português e veja todos os governadores dos 17 idiomas na sua língua automaticamente.',
    announcementHeader: '📢 ANÚNCIO OFICIAL DA CIDADELA VALHEON',
  },
  {
    code: 'th',
    roleKey: 'lang_th',
    roleName: '🇹🇭 ภาษาไทย (Thai)',
    buttonLabel: '🇹🇭 ภาษาไทย',
    channelName: '💬-แชทป้อมปราการหลัก',
    channelTopic:
      '🇹🇭 แชทป้อมปราการ Valheon — พูดคุยเป็นภาษาไทย ข้อความจากผู้ว่าการทั่วโลกทั้ง 17 ภาษาจะแสดงเป็นภาษาไทยแบบเรียลไทม์',
    color: 0x9333ea,
    welcomeTitle: '🇹🇭 ตั้งค่าภาษาของเซิร์ฟเวอร์เป็นภาษาไทยแล้ว (14/17)',
    welcomeBody:
      'แถบช่องด้านซ้ายของคุณเปลี่ยนเป็น **ภาษาไทย** เรียบร้อยแล้ว! เข้าไปที่ {CHANNEL} — พิมพ์ภาษาไทยตามปกติ และข้อความจากผู้เล่นทั้ง 17 ภาษาจะแปลเป็นภาษาไทยให้อัตโนมัติ',
    announcementHeader: '📢 ประกาศอย่างเป็นทางการจากป้อมปราการ VALHEON',
  },
  {
    code: 'pl',
    roleKey: 'lang_pl',
    roleName: '🇵🇱 Polski (Polish)',
    buttonLabel: '🇵🇱 Polski',
    channelName: '💬-czat-ogólny-cytadeli',
    channelTopic:
      '🇵🇱 Czat Ogólny Cytadeli Valheon — Rozmawiaj po polsku; wiadomości z 17 języków są tłumaczone w czasie rzeczywistym.',
    color: 0xf43f5e,
    welcomeTitle: '🇵🇱 JĘZYK SERWERA USTAWIONY NA POLSKI (15/17)',
    welcomeBody:
      'Twój pasek boczny został przełączony na **Język Polski**! Wejdź na {CHANNEL} — pisz po polsku, a wiadomości gubernatorów z 17 języków pojawią się automatycznie po polsku.',
    announcementHeader: '📢 OFICJALNE OGŁOSZENIE CYTADELI VALHEON',
  },
  {
    code: 'it',
    roleKey: 'lang_it',
    roleName: '🇮🇹 Italiano (Italian)',
    buttonLabel: '🇮🇹 Italiano',
    channelName: '💬-chat-generale-cittadella',
    channelTopic:
      '🇮🇹 Chat Generale della Cittadella Valheon — Parla in italiano; i messaggi da tutte le 17 lingue vengono tradotti in tempo reale.',
    color: 0x14b8a6,
    welcomeTitle: '🇮🇹 LINGUA DEL SERVER IMPOSTATA SU ITALIANO (16/17)',
    welcomeBody:
      'La tua barra laterale è ora in **Italiano**! Entra in {CHANNEL} — scrivi nella tua lingua e vedrai tutti i governatori delle 17 lingue in italiano automaticamente.',
    announcementHeader: '📢 ANNUNCIO UFFICIALE DELLA CITTADELLA VALHEON',
  },
  {
    code: 'ms',
    roleKey: 'lang_ms',
    roleName: '🇲🇾 Bahasa Melayu (Malay)',
    buttonLabel: '🇲🇾 Melayu',
    channelName: '💬-sembang-umum-kubu',
    channelTopic:
      '🇲🇾 Sembang Umum Kubu Valheon — Berbual dalam Bahasa Melayu; mesej daripada 17 bahasa diterjemahkan secara masa nyata.',
    color: 0x0ea5e9,
    welcomeTitle: '🇲🇾 BAHASA PELAYAN DITETAPKAN KEPADA BAHASA MELAYU (17/17)',
    welcomeBody:
      'Bar sisi anda telah ditukar kepada **Bahasa Melayu**! Masuk ke {CHANNEL} — taip dalam Bahasa Melayu dan semua gabenor daripada 17 bahasa akan dipaparkan dalam bahasa anda.',
    announcementHeader: '📢 PENGUMUMAN RASMI KUBU VALHEON',
  },
];

const LANG_BY_CODE = new Map(BABEL_LANGUAGES.map((l) => [l.code, l]));
const LANG_BY_CHANNEL_NAME = new Map(BABEL_LANGUAGES.map((l) => [l.channelName.toLowerCase(), l]));

// Pillar 3: Server-Side `<4MB` Tier-0 Instant RoK Short-Phrase & Token Dictionary (Zero Network Calls)
const TIER_0_INVARIANT_TOKENS = new Set([
  'gg', 'ggs', 'lol', 'lmao', 'rofl', 'ok', 'okay', 'k', 'kk', 'ty', 'thx', 'np', 'yw',
  'omw', 'brb', 'afk', 'wtf', 'omg', 'wow', 'nice', 'ez', 'rip', 'f', 'o7', '+1',
  'kvk', 'mge', 'aoo', 'dkp', 't1', 't2', 't3', 't4', 't5', 'ap', 'vip', 'gh', 'rss',
]);

// Cache channelId -> webhook { id, token }
const WEBHOOK_CACHE = new Map();
// Cache guild Omni channel map: channelId -> { guildId, langMeta }
const ACTIVE_BABEL_CHANNELS = new Map();
// Track guilds whose topology has been synced in this process lifetime
const SYNCED_GUILDS = new Set();
// Cache channelId -> channel metadata { id, name }
const CHANNEL_META_CACHE = new Map();
// Cache ticket channelId -> active applicant language code
const TICKET_LANG_CACHE = new Map();
// Translation LRU cache in bot.mjs RAM (<4MB): `${targetLang}::${text}` -> { translated, detected }
const FAST_TRANSLATE_CACHE = new Map();
// Pillar 1: In-memory live presence tracker (userId -> lastActiveEpochMs)
const USER_LAST_ACTIVE_MS = new Map();
// Pillar 2: Rapid-fire coalescing buffers (`${channelId}_${authorId}` -> { timer, lines, attachments, msgMeta })
const COALESCE_BUFFERS = new Map();
// Pillar 2: Per-channel Webhook rate queue (`channelId` -> Promise chain)
const WEBHOOK_CHANNEL_QUEUES = new Map();

function loadBabelState() {
  try {
    if (fs.existsSync(BABEL_STATE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(BABEL_STATE_PATH, 'utf8'));
      parsed.guilds = parsed.guilds || {};
      return parsed;
    }
  } catch {}
  return {
    userLocales: {},
    userLastActiveMs: {},
    founderOverwatchAll: true,
    channelIdsByLang: {},
    roleIdsByLang: {},
    webhooksByChannel: {},
    announcementChannelId: null,
    guilds: {},
  };
}

function getGuildBabelConfig(st, guildId) {
  const gid = String(guildId || BABEL_EXCLUSIVE_GUILD_ID);
  st.guilds = st.guilds || {};
  if (!st.guilds[gid]) {
    st.guilds[gid] = {
      channelIdsByLang: gid === BABEL_EXCLUSIVE_GUILD_ID ? { ...(st.channelIdsByLang || {}) } : {},
      roleIdsByLang: gid === BABEL_EXCLUSIVE_GUILD_ID ? { ...(st.roleIdsByLang || {}) } : {},
      announcementChannelId: gid === BABEL_EXCLUSIVE_GUILD_ID ? st.announcementChannelId || null : null,
      founderOverwatchAll: st.founderOverwatchAll !== false,
    };
  }
  return st.guilds[gid];
}

function saveBabelState(state) {
  try {
    fs.mkdirSync(path.dirname(BABEL_STATE_PATH), { recursive: true });
    fs.writeFileSync(BABEL_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch {}
}

/**
 * Stamps a user's live activity timestamp whenever they send a message, click a button,
 * react, or join voice so HERMES knows which language cohorts have awake human users!
 */
export function touchBabelUserActivity(userId) {
  if (!userId) return;
  const uid = String(userId);
  const now = Date.now();
  USER_LAST_ACTIVE_MS.set(uid, now);

  const st = loadBabelState();
  st.userLastActiveMs = st.userLastActiveMs || {};
  // Persist to disk at most once every 60s per user to avoid unnecessary disk I/O
  if (!st.userLastActiveMs[uid] || now - st.userLastActiveMs[uid] > 60_000) {
    st.userLastActiveMs[uid] = now;
    saveBabelState(st);
  }
}

export function getUserBabelLocale(userId) {
  const st = loadBabelState();
  return st.userLocales?.[String(userId)] || 'en';
}

export function setUserBabelLocale(userId, langCode) {
  const st = loadBabelState();
  const uid = String(userId);
  st.userLocales = st.userLocales || {};
  st.userLastActiveMs = st.userLastActiveMs || {};
  st.userLocales[uid] = langCode;
  st.userLastActiveMs[uid] = Date.now();
  USER_LAST_ACTIVE_MS.set(uid, Date.now());
  saveBabelState(st);
}

/**
 * Pillar 1: Returns the list of target languages that currently have >= 1 AWAKE human subscriber
 * (active within the last 45 minutes), OR all languages if Founder Overwatch is toggled ON.
 */
function getAwakeTargetLanguages(sourceLangCode, st, guildId = BABEL_EXCLUSIVE_GUILD_ID) {
  const guildCfg = getGuildBabelConfig(st, guildId);
  // If Founder Overwatch is ON, keep all 16 target rooms live for visual inspection/demos
  if (guildCfg.founderOverwatchAll !== false) {
    return BABEL_LANGUAGES.filter((l) => l.code !== sourceLangCode);
  }

  const now = Date.now();
  const awakeLangCodes = new Set(['en']); // Always keep English HQ awake
  const userLocales = st.userLocales || {};
  const persistedActive = st.userLastActiveMs || {};

  for (const [uid, langCode] of Object.entries(userLocales)) {
    const lastMs = USER_LAST_ACTIVE_MS.get(uid) || persistedActive[uid] || 0;
    if (now - lastMs <= LIVE_PRESENCE_WINDOW_MS) {
      awakeLangCodes.add(langCode);
    }
  }

  return BABEL_LANGUAGES.filter(
    (l) => l.code !== sourceLangCode && awakeLangCodes.has(l.code)
  );
}

/**
 * Pillar 3: Checks if a message is purely coordinates, numbers, emojis, URLs, or universal RoK shorthand (`0ms` local return)
 */
function isInvariantOrShorthand(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (TIER_0_INVARIANT_TOKENS.has(trimmed.toLowerCase())) return true;
  // Pure coordinates, numbers, punctuation, emojis, or Discord mentions/links
  if (/^[\d\s.,:;#@!?\-+/*()[\]<>xXyYkKmMbB%$€£¥\p{Emoji}\p{P}]+$/u.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Pillar 3 & 4: Fast, RoK-Glossary-Protected Translation:
 *   - Tier 0: Server-side `<4MB` RAM Cache & RoK Invariant Bypass (`0.01ms`)
 *   - Tier 1: Bare-Metal Neural MT (`process.env.VALHEON_MT_ENDPOINT` — CTranslate2/NLLB-200)
 *   - Tier 2: Cloud Failover (`clients5.google.com` -> `api.mymemory.translated.net`)
 */
export async function translateOmniMessage(rawText, targetLang = 'en') {
  const clean = String(rawText || '').trim().slice(0, 1800);
  if (!clean) return { translated: '', detected: 'en' };

  // Tier 0: Invariant gaming tokens, coordinates, numbers, emojis -> 0 network calls!
  if (isInvariantOrShorthand(clean)) {
    return { translated: clean, detected: 'en' };
  }

  const tl = targetLang === 'zh' ? 'zh-CN' : targetLang;
  const cacheKey = `${tl}::${clean}`;
  if (FAST_TRANSLATE_CACHE.has(cacheKey)) {
    return FAST_TRANSLATE_CACHE.get(cacheKey);
  }

  // Pre-substitute official Lilith Commander, Equipment, and RoK War Slang terms in target language
  const { processedText } = applyRokGlossaryPre(clean, targetLang);

  let translated = processedText;
  let detected = 'en';

  const bareMetalEndpoint = (process.env.VALHEON_MT_ENDPOINT || '').trim();
  let resolvedByBareMetal = false;

  // Tier 1: Self-Hosted Bare-Metal Neural MT Stack (if configured)
  if (bareMetalEndpoint) {
    try {
      const bmRes = await fetch(bareMetalEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: processedText, source: 'auto', target: tl }),
      });
      if (bmRes.ok) {
        const bmData = await bmRes.json();
        if (bmData?.translatedText) {
          translated = bmData.translatedText;
          detected = bmData.detectedLanguage || 'auto';
          resolvedByBareMetal = true;
        }
      }
    } catch {}
  }

  // Tier 2: Cloud Failover
  if (!resolvedByBareMetal) {
    try {
      const gUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(processedText)}`;
      const res = await fetch(gUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'string') {
          translated = data.map((item) => (Array.isArray(item) ? item[0] : item)).join('');
          if (typeof data[0][1] === 'string') {
            detected = data[0][1].split('-')[0].toLowerCase();
          }
        } else if (Array.isArray(data) && typeof data[0] === 'string') {
          translated = data[0];
        }
      } else {
        throw new Error(`clients5 HTTP ${res.status}`);
      }
    } catch {
      try {
        const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(processedText.slice(0, 450))}&langpair=autodetect|${encodeURIComponent(tl)}&de=hermes@valheon.com`;
        const mRes = await fetch(mUrl);
        const mData = await mRes.json();
        if (mData?.responseData?.translatedText) {
          translated = mData.responseData.translatedText;
        }
        if (mData?.responseData?.detectedLanguage) {
          detected = String(mData.responseData.detectedLanguage).split('-')[0].toLowerCase();
        }
      } catch {}
    }
  }

  const result = { translated, detected };
  if (FAST_TRANSLATE_CACHE.size > 2500) {
    const oldest = FAST_TRANSLATE_CACHE.keys().next().value;
    FAST_TRANSLATE_CACHE.delete(oldest);
  }
  FAST_TRANSLATE_CACHE.set(cacheKey, result);
  return result;
}

export async function translateBabelMessage(rawText, targetLang = 'en') {
  const { translated } = await translateOmniMessage(rawText, targetLang);
  return translated;
}

/**
 * Discovers and caches all 17 Omni-Language channels + language roles + Announcement channel inside ANY server
 */
export async function syncBabelGuildTopology(discordApi, guildId = BABEL_EXCLUSIVE_GUILD_ID) {
  if (!guildId) return null;
  const gid = String(guildId);

  try {
    const [channels, roles] = await Promise.all([
      discordApi('GET', `/guilds/${gid}/channels`),
      discordApi('GET', `/guilds/${gid}/roles`),
    ]);

    const st = loadBabelState();
    const guildCfg = getGuildBabelConfig(st, gid);
    guildCfg.channelIdsByLang = guildCfg.channelIdsByLang || {};
    guildCfg.roleIdsByLang = guildCfg.roleIdsByLang || {};

    if (Array.isArray(channels)) {
      for (const ch of channels) {
        if (!ch?.name) continue;
        const lowerName = ch.name.toLowerCase();
        CHANNEL_META_CACHE.set(ch.id, { id: ch.id, name: lowerName });
        const langMeta = LANG_BY_CHANNEL_NAME.get(lowerName);
        if (langMeta) {
          ACTIVE_BABEL_CHANNELS.set(ch.id, { guildId: gid, langMeta });
          guildCfg.channelIdsByLang[langMeta.code] = ch.id;
          if (gid === BABEL_EXCLUSIVE_GUILD_ID) {
            st.channelIdsByLang = st.channelIdsByLang || {};
            st.channelIdsByLang[langMeta.code] = ch.id;
          }
        }
        if (
          lowerName.includes('valheon-announcements') ||
          lowerName.includes('kings-decrees') ||
          lowerName === 'announcements' ||
          lowerName === '📢-announcements'
        ) {
          guildCfg.announcementChannelId = ch.id;
          if (gid === BABEL_EXCLUSIVE_GUILD_ID) {
            st.announcementChannelId = ch.id;
          }
        }
      }
    }

    if (Array.isArray(roles)) {
      for (const r of roles) {
        if (!r?.name) continue;
        const matchedLang = BABEL_LANGUAGES.find(
          (l) => l.roleName.toLowerCase() === r.name.toLowerCase()
        );
        if (matchedLang) {
          guildCfg.roleIdsByLang[matchedLang.code] = r.id;
          if (gid === BABEL_EXCLUSIVE_GUILD_ID) {
            st.roleIdsByLang = st.roleIdsByLang || {};
            st.roleIdsByLang[matchedLang.code] = r.id;
          }
        }
      }
    }

    SYNCED_GUILDS.add(gid);
    saveBabelState(st);
    return st;
  } catch (err) {
    console.error(`[HERMES Omni-Language Topology Sync Error on ${gid}]:`, err.message);
    return null;
  }
}

/**
 * Gets or creates a Discord Webhook for a target channel so HERMES can clone speaker Avatar + Name
 */
async function getOrCreateChannelWebhook(discordApi, channelId) {
  if (WEBHOOK_CACHE.has(channelId)) {
    return WEBHOOK_CACHE.get(channelId);
  }

  const st = loadBabelState();
  if (st.webhooksByChannel?.[channelId]?.id && st.webhooksByChannel?.[channelId]?.token) {
    WEBHOOK_CACHE.set(channelId, st.webhooksByChannel[channelId]);
    return st.webhooksByChannel[channelId];
  }

  try {
    const existing = await discordApi('GET', `/channels/${channelId}/webhooks`);
    if (Array.isArray(existing)) {
      const found = existing.find(
        (w) => w.token && (w.name === 'HERMES Omni-Language' || w.name === 'HERMES Babel Mirror')
      );
      if (found) {
        const wh = { id: found.id, token: found.token };
        WEBHOOK_CACHE.set(channelId, wh);
        st.webhooksByChannel = st.webhooksByChannel || {};
        st.webhooksByChannel[channelId] = wh;
        saveBabelState(st);
        return wh;
      }
    }

    const created = await discordApi('POST', `/channels/${channelId}/webhooks`, {
      name: 'HERMES Omni-Language',
    });
    if (created?.id && created?.token) {
      const wh = { id: created.id, token: created.token };
      WEBHOOK_CACHE.set(channelId, wh);
      st.webhooksByChannel = st.webhooksByChannel || {};
      st.webhooksByChannel[channelId] = wh;
      saveBabelState(st);
      return wh;
    }
  } catch (err) {
    console.error(`[HERMES Omni Webhook Error on ${channelId}]:`, err.message);
  }
  return null;
}

/**
 * Pillar 2: Rate-limited Per-Channel Webhook Dispatcher (`<= 2 posts/sec` per channel, automatic 429 retry)
 */
function enqueueWebhookPost(channelId, taskFn) {
  const prev = WEBHOOK_CHANNEL_QUEUES.get(channelId) || Promise.resolve();
  const next = prev
    .then(async () => {
      await taskFn();
      await new Promise((r) => setTimeout(r, 450));
    })
    .catch(() => {});
  WEBHOOK_CHANNEL_QUEUES.set(channelId, next);
  return next;
}

/**
 * Handles the 1-Click Language Role Switch when a user clicks any of the 17 Flag Buttons in `#🌐-select-your-language`
 * Strictly enforces `1 Member = 1 Active Language Role` (switchable anytime!).
 */
export async function handleBabelLanguageSelect({
  discordApi,
  guildId,
  user,
  member,
  langCode,
}) {
  const gid = String(guildId || BABEL_EXCLUSIVE_GUILD_ID);
  const st = await syncBabelGuildTopology(discordApi, gid);
  const langMeta = LANG_BY_CODE.get(langCode) || LANG_BY_CODE.get('en');
  if (!st || !langMeta) {
    return { ok: false, content: '⚠️ Could not load Omni-Language topology.' };
  }

  const guildCfg = getGuildBabelConfig(st, gid);
  const currentRoles = new Set(Array.isArray(member?.roles) ? member.roles : []);
  const allLangRoleIds = new Set(Object.values(guildCfg.roleIdsByLang || {}).filter(Boolean));
  const targetRoleId = guildCfg.roleIdsByLang?.[langMeta.code];

  // Enforce strict 1-Language Role rule: strip any previous language role and assign ONLY the new one
  const updatedRoles = [...currentRoles].filter((rId) => !allLangRoleIds.has(rId));
  if (targetRoleId) {
    updatedRoles.push(targetRoleId);
  }

  try {
    await discordApi('PATCH', `/guilds/${gid}/members/${user.id}`, {
      roles: [...new Set(updatedRoles)],
    });
  } catch {
    if (targetRoleId) {
      await discordApi('PUT', `/guilds/${gid}/members/${user.id}/roles/${targetRoleId}`).catch(() => {});
    }
  }

  setUserBabelLocale(user.id, langMeta.code);

  const targetChannelId = guildCfg.channelIdsByLang?.[langMeta.code];
  const channelMention = targetChannelId ? `<#${targetChannelId}>` : `**#${langMeta.channelName}**`;

  return {
    ok: true,
    embed: {
      title: langMeta.welcomeTitle,
      description: langMeta.welcomeBody.replace('{CHANNEL}', channelMention),
      color: langMeta.color,
      footer: {
        text: `🪽 HERMES 17-LANGUAGE OMNI-MATRIX // ACTIVE ROLE: ${langMeta.roleName}`,
      },
    },
  };
}

/**
 * Toggles All-17-Languages Overwatch vs. Awake-Only Mode for the Principal/Founder (`184977944433786880`)
 */
export async function handleBabelFounderAllLanguages({
  discordApi,
  guildId,
  user,
  member,
}) {
  const gid = String(guildId || BABEL_EXCLUSIVE_GUILD_ID);
  const st = await syncBabelGuildTopology(discordApi, gid);
  const guildCfg = getGuildBabelConfig(st, gid);
  const allLangRoleIds = Object.values(guildCfg?.roleIdsByLang || {}).filter(Boolean);
  const currentRoles = new Set(Array.isArray(member?.roles) ? member.roles : []);

  const nextOverwatchState = guildCfg.founderOverwatchAll === false;
  guildCfg.founderOverwatchAll = nextOverwatchState;
  if (gid === BABEL_EXCLUSIVE_GUILD_ID) {
    st.founderOverwatchAll = nextOverwatchState;
  }
  saveBabelState(st);

  let updatedRoles;
  let modeLabel;

  if (!nextOverwatchState) {
    updatedRoles = [...currentRoles].filter((id) => !allLangRoleIds.includes(id));
    if (guildCfg?.roleIdsByLang?.en) updatedRoles.push(guildCfg.roleIdsByLang.en);
    modeLabel =
      '⚡ **Awake-Cohort Smart Mode Engaged (Production Scale Mode)** — HERMES now ONLY translates into language rooms that have `>= 1` human subscriber active in the last 45 minutes! Asleep/empty rooms consume `0` API calls and `0` Webhooks.';
  } else {
    updatedRoles = [...new Set([...currentRoles, ...allLangRoleIds])];
    modeLabel =
      '👁️ **Founder Demo Overwatch Engaged (All 17 Rooms Live)** — HERMES is broadcasting into all 17 rooms simultaneously so you can demo or inspect every language at once!';
  }

  await discordApi('PATCH', `/guilds/${gid}/members/${user.id}`, {
    roles: updatedRoles,
  }).catch(() => {});

  return {
    ok: true,
    content: modeLabel,
  };
}

/**
 * Flushes a 1.2s coalesced message batch from a speaker across all awake target language rooms
 */
async function flushCoalescedBabelBatch(discordApi, bufferKey) {
  const batch = COALESCE_BUFFERS.get(bufferKey);
  if (!batch) return;
  COALESCE_BUFFERS.delete(bufferKey);

  const { guildId, sourceLangMeta, displayName, avatarUrl, lines, attachmentUrls, channelId } = batch;
  const combinedRaw = lines.filter(Boolean).join('\n').trim();
  if (!combinedRaw && attachmentUrls.length === 0) return;

  const st = loadBabelState();
  const guildCfg = getGuildBabelConfig(st, guildId);
  const targetLangs = getAwakeTargetLanguages(sourceLangMeta.code, st, guildId);

  await Promise.allSettled(
    targetLangs.map(async (targetLang) => {
      const targetChannelId = guildCfg.channelIdsByLang?.[targetLang.code];
      if (!targetChannelId || targetChannelId === channelId) return;

      const translatedText = combinedRaw
        ? await translateBabelMessage(combinedRaw, targetLang.code)
        : '';

      const finalContent = [translatedText, ...attachmentUrls]
        .filter(Boolean)
        .join('\n')
        .slice(0, 1990);

      if (!finalContent) return;

      await enqueueWebhookPost(targetChannelId, async () => {
        const wh = await getOrCreateChannelWebhook(discordApi, targetChannelId);
        if (wh?.id && wh?.token) {
          const res = await fetch(`https://discord.com/api/v10/webhooks/${wh.id}/${wh.token}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'ValheonHermesArchitect/3.0',
            },
            body: JSON.stringify({
              username: displayName.slice(0, 80),
              avatar_url: avatarUrl,
              content: finalContent,
              allowed_mentions: { parse: [] },
            }),
          });
          if (res.status === 429) {
            const d = await res.json().catch(() => ({}));
            await new Promise((r) => setTimeout(r, Math.ceil((d.retry_after || 1.5) * 1000) + 200));
          }
        } else {
          await discordApi('POST', `/channels/${targetChannelId}/messages`, {
            content: `**${displayName}:** ${finalContent}`,
            allowed_mentions: { parse: [] },
          });
        }
      });
    })
  );
}

/**
 * Master Multi-Guild Omni-Language Message Router:
 *   1. If posted in one of the 17 Native Mirror rooms -> 1.2s Coalescer + Awake-Only Webhook Broadcast
 *   2. If posted in `#📢-valheon-announcements` / `#📢-kings-decrees` -> 17-Language Gold Announcement Broadcast into all 17 rooms
 *   3. If posted in `#ticket-*` -> 2-Way Automatic Ticket Interpreter (Applicant Native Language <-> English)
 */
export async function handleBabelMirrorMessage(discordApi, msg) {
  if (!msg || !msg.guild_id) {
    return false;
  }
  if (msg.author?.bot || msg.webhook_id) {
    return false;
  }

  const gid = String(msg.guild_id);

  // Stamp speaker's live activity timestamp
  touchBabelUserActivity(msg.author.id);

  if (!SYNCED_GUILDS.has(gid)) {
    await syncBabelGuildTopology(discordApi, gid);
  }

  const rawContent = String(msg.content || '').trim();
  const attachmentUrls = Array.isArray(msg.attachments)
    ? msg.attachments.map((a) => a.url).filter(Boolean)
    : [];

  if (!rawContent && attachmentUrls.length === 0) {
    return false;
  }

  const displayName =
    msg.member?.nick ||
    msg.author?.global_name ||
    msg.author?.username ||
    'Governor';

  const avatarUrl = msg.author?.avatar
    ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(msg.author?.id || '0') >> 22n) % 6}.png`;

  const st = loadBabelState();
  const guildCfg = getGuildBabelConfig(st, gid);

  // ==========================================================================
  // ROUTE 1: 17-LANGUAGE NATIVE GLOBAL CHAT MIRROR (1.2s Coalescer + Awake Gate)
  // ==========================================================================
  const channelEntry = ACTIVE_BABEL_CHANNELS.get(msg.channel_id);
  const sourceLangMeta = channelEntry?.langMeta || channelEntry;
  if (sourceLangMeta && sourceLangMeta.code) {
    // Auto-record that this speaker is active in this language channel
    setUserBabelLocale(msg.author.id, sourceLangMeta.code);

    const bufferKey = `${msg.channel_id}_${msg.author.id}`;
    const existing = COALESCE_BUFFERS.get(bufferKey);
    if (existing) {
      clearTimeout(existing.timer);
      if (rawContent) existing.lines.push(rawContent);
      if (attachmentUrls.length > 0) existing.attachmentUrls.push(...attachmentUrls);
      existing.timer = setTimeout(() => {
        flushCoalescedBabelBatch(discordApi, bufferKey).catch(() => {});
      }, COALESCE_WINDOW_MS);
    } else {
      const timer = setTimeout(() => {
        flushCoalescedBabelBatch(discordApi, bufferKey).catch(() => {});
      }, COALESCE_WINDOW_MS);
      COALESCE_BUFFERS.set(bufferKey, {
        guildId: gid,
        sourceLangMeta,
        displayName,
        avatarUrl,
        lines: rawContent ? [rawContent] : [],
        attachmentUrls: [...attachmentUrls],
        channelId: msg.channel_id,
        timer,
      });
    }
    return true;
  }

  // ==========================================================================
  // ROUTE 2: `#📢-valheon-announcements` / `#📢-kings-decrees` -> 17-LANGUAGE AUTO-BROADCAST
  // ==========================================================================
  if (guildCfg.announcementChannelId && msg.channel_id === guildCfg.announcementChannelId && rawContent) {
    await Promise.allSettled(
      BABEL_LANGUAGES.map(async (targetLang) => {
        const targetChannelId = guildCfg.channelIdsByLang?.[targetLang.code];
        if (!targetChannelId) return;

        const translatedText =
          targetLang.code === 'en'
            ? rawContent
            : await translateBabelMessage(rawContent, targetLang.code);

        const embedPayload = {
          title: targetLang.announcementHeader || '📢 OFFICIAL VALHEON CITADEL ANNOUNCEMENT',
          description: translatedText.slice(0, 3900),
          color: 0xf59e0b,
          footer: {
            text: `🪽 HERMES OMNI-LANGUAGE BROADCAST (${targetLang.buttonLabel}) // BY ${displayName.toUpperCase()}`,
          },
          timestamp: new Date().toISOString(),
        };

        await enqueueWebhookPost(targetChannelId, async () => {
          const wh = await getOrCreateChannelWebhook(discordApi, targetChannelId);
          if (wh?.id && wh?.token) {
            await fetch(`https://discord.com/api/v10/webhooks/${wh.id}/${wh.token}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ValheonHermesArchitect/3.0',
              },
              body: JSON.stringify({
                username: `${displayName} // Valheon High Council`.slice(0, 80),
                avatar_url: avatarUrl,
                embeds: [embedPayload],
                allowed_mentions: { parse: [] },
              }),
            });
          } else {
            await discordApi('POST', `/channels/${targetChannelId}/messages`, {
              embeds: [embedPayload],
            });
          }
        });
      })
    );
    return true;
  }

  // ==========================================================================
  // ROUTE 3: `#ticket-*` 2-WAY AUTOMATIC TICKET INTERPRETER
  // ==========================================================================
  let chMeta = CHANNEL_META_CACHE.get(msg.channel_id);
  if (!chMeta) {
    try {
      const chInfo = await discordApi('GET', `/channels/${msg.channel_id}`);
      if (chInfo?.name) {
        chMeta = { id: chInfo.id, name: chInfo.name.toLowerCase() };
        CHANNEL_META_CACHE.set(msg.channel_id, chMeta);
      }
    } catch {}
  }

  if (chMeta?.name?.startsWith('ticket-') && rawContent.length >= 2) {
    const isPrincipalMsg = String(msg.author.id) === VALHEON_PRINCIPAL_ID;
    const savedAuthorLang = getUserBabelLocale(msg.author.id);

    if (!isPrincipalMsg) {
      const { translated, detected } = await translateOmniMessage(rawContent, 'en');
      const effectiveLang =
        detected && detected !== 'en' ? detected : savedAuthorLang !== 'en' ? savedAuthorLang : 'en';

      if (effectiveLang !== 'en' && translated.toLowerCase() !== rawContent.toLowerCase()) {
        TICKET_LANG_CACHE.set(msg.channel_id, effectiveLang);
        const langMeta = LANG_BY_CODE.get(effectiveLang);
        const flagBadge = langMeta ? langMeta.buttonLabel : effectiveLang.toUpperCase();

        await discordApi('POST', `/channels/${msg.channel_id}/messages`, {
          message_reference: { message_id: msg.id },
          embeds: [
            {
              description: `🪽 **HERMES Omni-Interpreter (${flagBadge} → 🇺🇸 English):**\n> ${translated}`,
              color: 0x38bdf8,
            },
          ],
          allowed_mentions: { parse: [] },
        });
        return true;
      }
    } else {
      const targetTicketLang = TICKET_LANG_CACHE.get(msg.channel_id);
      if (targetTicketLang && targetTicketLang !== 'en') {
        const { translated } = await translateOmniMessage(rawContent, targetTicketLang);
        const langMeta = LANG_BY_CODE.get(targetTicketLang);
        const flagBadge = langMeta ? langMeta.buttonLabel : targetTicketLang.toUpperCase();

        await discordApi('POST', `/channels/${msg.channel_id}/messages`, {
          message_reference: { message_id: msg.id },
          embeds: [
            {
              description: `🪽 **HERMES Omni-Interpreter (🇺🇸 English → ${flagBadge}):**\n> ${translated}`,
              color: 0xf59e0b,
            },
          ],
          allowed_mentions: { parse: [] },
        });
        return true;
      }
    }
  }

  return false;
}
