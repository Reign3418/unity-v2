/**
 * ============================================================================
 * PROJECT HERMES — SOVEREIGN DISCORD ARCHITECT & MESSENGER BLUEPRINTS
 * ============================================================================
 * Hermes — The Winged Courier & Diplomatic Envoy of Valheon.
 * Culturally & religiously neutral across all 12 global locales.
 * Defines the complete, automated Discord Server topologies for:
 *   1. VALHEON_HQ           — Official Valheon Global Community & Industry Home
 *   2. KINGDOM_WAR_SERVER   — Turnkey 1-Click Kingdom / KvK War Server for Tenants
 *   3. JUMPER_GENESIS_GROUP — Turnkey Sleeper / Jumper Genesis Project Server
 *
 * Discord Channel Types (API v10):
 *   0 = GUILD_TEXT
 *   2 = GUILD_VOICE
 *   4 = GUILD_CATEGORY
 *   5 = GUILD_ANNOUNCEMENT
 *   13 = GUILD_STAGE_VOICE
 *   15 = GUILD_FORUM
 * ============================================================================
 */

export const CHANNEL_TYPES = {
  TEXT: 0,
  VOICE: 2,
  CATEGORY: 4,
  ANNOUNCEMENT: 5,
  STAGE: 13,
  FORUM: 15,
};

/**
 * Generates the Official Valheon Global HQ Server Blueprint
 */
export function buildValheonHqBlueprint(customOptions = {}) {
  const serverName = customOptions.serverName || 'VALHEON CITADEL // SOVEREIGN ROK HQ';

  return {
    id: 'VALHEON_HQ',
    name: serverName,
    subtitle: 'Official Industry Hub, 95 Living Field Guides, Uncensored Sanctuary & 5 Command Suites',
    badge: 'GLOBAL INDUSTRY HQ',
    accentColor: '#f59e0b',
    roles: [
      {
        key: 'founder',
        name: '👑 Grand Architect (Valheon Founder)',
        color: 0xf59e0b,
        hoist: true,
        mentionable: false,
        permissions: 'ADMINISTRATOR',
      },
      {
        key: 'hermes',
        name: '🪽 HERMES // Swift Courier & War Envoy',
        color: 0x38bdf8,
        hoist: true,
        mentionable: false,
        permissions: 'ADMINISTRATOR',
      },
      {
        key: 'council',
        name: '🛡️ Citadel Peacekeeper (Guardian)',
        color: 0xa855f7,
        hoist: true,
        mentionable: true,
        permissions: 'MODERATE_MEMBERS',
      },
      {
        key: 'verified_king',
        name: '🏰 Crowned Sovereign (Kingdom R5)',
        color: 0xf43f5e,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'verified_officer',
        name: '⚔️ War Room Tactician (R4 Officer)',
        color: 0x10b981,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'reaper_5b',
        name: '☄️ 5B+ KP Open-Field Titan',
        color: 0xd946ef,
        hoist: true,
        mentionable: false,
        permissions: 'STANDARD',
      },
      {
        key: 'deads_club',
        name: '🔥 20M+ Troops Sacrificed (Zero Fear)',
        color: 0xe11d48,
        hoist: true,
        mentionable: false,
        permissions: 'STANDARD',
      },
      {
        key: 'creator',
        name: '🦅 Meta Theorycrafter & Creator',
        color: 0xec4899,
        hoist: true,
        mentionable: false,
        permissions: 'STANDARD',
      },
      {
        key: 'verified_gov',
        name: '⚡ Pass-4 Frontline Brawler',
        color: 0xeab308,
        hoist: false,
        mentionable: false,
        permissions: 'STANDARD',
      },
      {
        key: 'jumper',
        name: '🥷 Sleeper Cell / Jumper Specialist',
        color: 0x06b6d4,
        hoist: false,
        mentionable: false,
        permissions: 'STANDARD',
      },
      {
        key: 'cropland_ceo',
        name: '🚜 Certified Level-6 Cropland CEO',
        color: 0x84cc16,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'bubble_ornament',
        name: '💤 Zone-1 Bubble Ornament',
        color: 0x64748b,
        hoist: false,
        mentionable: false,
        permissions: 'STANDARD',
      },
      // Combat Specialization Tags (1-Tap Self-Assign)
      {
        key: 'spec_infantry',
        name: '🗡️ Infantry Specialist',
        color: 0x3b82f6,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_cavalry',
        name: '🐎 Cavalry Specialist',
        color: 0xef4444,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_archer',
        name: '🏹 Archer Specialist',
        color: 0x10b981,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_rally',
        name: '🔥 Rally Leader',
        color: 0xf97316,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_garrison',
        name: '🏰 Garrison Captain',
        color: 0x8b5cf6,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      // Event Calendar & Migration No-Cap Ping Roles (1-Tap Self-Assign)
      {
        key: 'ping_mtg',
        name: '💎 More Than Gems Alert',
        color: 0x06b6d4,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'ping_20gh',
        name: '🗿 20GH Event Alert',
        color: 0xf59e0b,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'ping_wheel_mge',
        name: '🎡 Wheel & MGE Alert',
        color: 0xa855f7,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'ping_egg',
        name: '🔨 Egg & Esmeralda Alert',
        color: 0xec4899,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'ping_nocap',
        name: '🚨 No-Cap Migration Alert',
        color: 0x22c55e,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
    ],
    categories: [
      {
        key: 'gateway',
        name: '🏛️ CITADEL GATEWAY & COMMAND',
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '📜-welcome-and-manifesto',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Welcome to Valheon Citadel — The Sovereign Operating System for Rise of Kingdoms. Verify your Governor ID below.',
            pinKey: 'WELCOME_MANIFESTO',
          },
          {
            name: '📢-valheon-announcements',
            type: CHANNEL_TYPES.ANNOUNCEMENT,
            topic: 'Official Valheon OS updates, new Kingdom telemetry releases, and Lilith meta balance alerts.',
            pinKey: 'ANNOUNCEMENT_HEADER',
          },
          {
            name: '🌐-official-rok-intel-bridge',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Direct 1-Click Bridge to Official Rise of Kingdoms Discord Patch Notes (#📜〡rok․news), Redeem Codes, Osiris League, Bonfire Meetups & Bug Reports.',
            pinKey: 'OFFICIAL_ROK_BRIDGE',
          },
          {
            name: '🎯-combat-roles-and-event-pings',
            type: CHANNEL_TYPES.TEXT,
            topic: '1-Tap Combat Specialization Tags (Infantry, Cavalry, Archer, Rally, Garrison) & Event Calendar Alerts (More Than Gems, 20GH, Wheel, MGE, No-Cap).',
            pinKey: 'ROLE_AND_EVENT_PING_CONSOLE',
          },
          {
            name: '🎁-active-redeem-codes',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Live auto-updated Rise of Kingdoms Redeem Codes delivered by HERMES from the Valheon Vault.',
            pinKey: 'REDEEM_CODES_LIVE',
          },
          {
            name: '🪽-1-click-kingdom-discord',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Hate building Discord servers from scratch? Let HERMES deploy a full Kingdom War Server wired to Valheon in 1 click.',
            pinKey: 'ONE_CLICK_DEPLOY_PROMO',
          },
        ],
      },
      {
        key: 'concierge',
        name: '🎫 HERMES CONCIERGE & TICKET DESK',
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '🎫-open-a-ticket',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Need Kingdom Onboarding, an AEGIS Polygraph Audit, R5 Verification, or Technical Support? Click a button below.',
            pinKey: 'TICKET_CONSOLE_HQ',
          },
          {
            name: '🔮-title-request-queue',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_INTERACTIVE',
            topic: '24/7 Automated Kingdom Title Rotation Queue — Request Duke, Scientist, Architect, or Justice with your [X, Y] coordinates.',
            pinKey: 'TITLE_QUEUE_CONSOLE',
          },
          {
            name: '⚰️-ark-of-osiris-signups',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_INTERACTIVE',
            topic: '30v30 Ark of Osiris Tactical Lane Sign-Ups (Top Shrines, Mid Obelisks/Ark, Bottom Outposts, and Substitutes).',
            pinKey: 'AOO_CONSOLE',
          },
          {
            name: '🔒-ticket-audit-log',
            type: CHANNEL_TYPES.TEXT,
            access: 'STAFF_ONLY',
            topic: 'Automated HERMES transcript archive and SLA telemetry for resolved tickets.',
          },
          {
            name: '📡-central-support-and-relaunch-hub',
            type: CHANNEL_TYPES.TEXT,
            access: 'STAFF_ONLY',
            topic: 'CENTRAL OVERWATCH INBOX // All customer support tickets, customization requests, and 1-click free server relaunches from external Kingdom, Diplo & Coalition servers route here.',
            pinKey: 'HQ_CENTRAL_RELAY_CONSOLE',
          },
        ],
      },
      {
        key: 'sanctuary',
        name: '🎭 THE UNCENSORED SANCTUARY',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🕵️-the-whisper-vault',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_BUTTON_ONLY',
            topic: 'Zero-Trace Anonymous Whistleblower & Kingdom Tea Drop. Click [Post Anonymous Whisper] to speak freely without Lilith censorship or retaliation.',
            pinKey: 'CONFESSIONAL_CONSOLE',
          },
          {
            name: '🔥-kingdom-tea-uncensored',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Say what you cannot say in RoK chat. Kingdom politics, KvK betrayal receipts, rogue King callouts, and uncensored debate.',
          },
          {
            name: '💀-roast-my-governor',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Drop your Governor ID or run /hermes roast <id> — HERMES pulls your real KP/Deads/Power from AWS and delivers a ruthless verdict.',
            pinKey: 'ROAST_CONSOLE',
          },
          {
            name: '🏆-battle-report-flex',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Post your nastiest open-field trades, swarm defends, and zeroed whale battle reports.',
          },
        ],
      },
      {
        key: 'suites',
        name: '⚔️ THE 5 VALHEON COMMAND SUITES',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🛡️-aegis-polygraph-radar',
            type: CHANNEL_TYPES.TEXT,
            topic: 'PILLAR I // Live EK Polygraph 3.0 migrant audits, ghost/alt correlation checks, and 5-Model Trust Index lookups.',
            pinKey: 'SUITE_AEGIS',
          },
          {
            name: '🌌-nexus-3d-dkp-telemetry',
            type: CHANNEL_TYPES.TEXT,
            topic: 'PILLAR II // Cerberus 3D Governor Galaxy snapshots, 60fps DKP leaderboards, and Kingdom trajectory deltas.',
            pinKey: 'SUITE_NEXUS',
          },
          {
            name: '🗺️-theater-kvk-war-room',
            type: CHANNEL_TYPES.TEXT,
            topic: 'PILLAR III // 128-Node Crystal Map territory planning, Pass opening timers, and AI KvK coalition simulations.',
            pinKey: 'SUITE_THEATER',
          },
          {
            name: '📬-vanguard-migration-crm',
            type: CHANNEL_TYPES.TEXT,
            topic: 'PILLAR IV // Cross-Kingdom Player Hunter, Kanban Recruitment Hitlists, and RoK Rich-Text Mail Studio.',
            pinKey: 'SUITE_VANGUARD',
          },
          {
            name: '📸-optics-vision-ocr-drop',
            type: CHANNEL_TYPES.TEXT,
            topic: 'PILLAR V // Drop any RoK screenshot here (Equipment, Speedups, RSS, Rankings) and HERMES Gemini Vision OCR will parse it into structured math!',
            pinKey: 'SUITE_OPTICS',
          },
        ],
      },
      {
        key: 'academy',
        name: '📚 SOVEREIGN ACADEMY (95 GUIDES)',
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '👑-commander-tier-matrices',
            type: CHANNEL_TYPES.TEXT,
            topic: '20-Stage Commander Tier Lists (Early Game, KvK 1-3, SoC Open Field, Rally, Garrison) powered by live telemetry.',
            pinKey: 'ACADEMY_TIERS',
          },
          {
            name: '⚔️-5-6-7-march-fleet-meta',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Optimal 5, 6, and 7-March open-field synergy fleets, accessories, and formation pairings.',
            pinKey: 'ACADEMY_FLEETS',
          },
          {
            name: '📖-95-sovereign-dossiers',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Complete library of 95 living Rise of Kingdoms Field Guides. Run /guide <topic> in any channel to summon a dossier.',
            pinKey: 'ACADEMY_DOSSIERS',
          },
          {
            name: '🎓-peerless-scholar-solver',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_INTERACTIVE',
            topic: '17-Language Lyceum of Wisdom & Peerless Scholar Solver (Preliminary, Midterm Early Packet & 15s Final Exam Speed Search).',
            pinKey: 'PEERLESS_CONSOLE',
          },
          {
            name: '🌱-f2p-and-ch8-efficiency-lab',
            type: CHANNEL_TYPES.TEXT,
            topic: '100% Free New-Player Growth Coaching, F2P VIP/Gem priority math, and Ch8 Sleeper/Jumper optimization.',
          },
        ],
      },
      {
        key: 'bazaar',
        name: '🌍 MIGRATION & JUMPER BAZAAR',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🏰-kingdom-recruitment-ads',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Verified R4/R5 Recruiters: Post your Kingdom recruitment banner with live Valheon Imperium & Seed metrics.',
          },
          {
            name: '🧳-governor-free-agency',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Looking for a new Kingdom? Share your Valheon Verified Governor Dossier and desired KvK seed.',
          },
          {
            name: '🚀-genesis-jumper-groups',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Forming a Day-1 Jumper or Sleeper project for upcoming Genesis Kingdoms (#4203+)? Recruit your core 150 players here.',
          },
        ],
      },
      {
        key: 'community',
        name: '💬 CITADEL COMMUNITY LOUNGE',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🍻-the-golden-tavern',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Main global lounge for governors, theorycrafters, and alliance leaders across every Rise of Kingdoms server.',
          },
          {
            name: '🌐-17-language-global-chat',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Speak in any of the 17 Official RoK Languages (EN, VI, AR, RU, ZH, ES, ID, KO, TR, FR, DE, PT, JA, IT, PL, TH, MS) — HERMES bridges translations automatically.',
            pinKey: 'GLOBAL_TRANSLATOR_CONSOLE',
          },
          {
            name: '💡-roadmap-and-feature-requests',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Suggest new Valheon calculators, scanner features, or Discord tools directly to the Principal Architect.',
          },
        ],
      },
      {
        key: 'voice',
        name: '🔊 CITADEL VOICE & TOWN HALL',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🎙️ Sovereign Town Hall',
            type: CHANNEL_TYPES.STAGE,
            topic: 'Live KvK Drafts, Meta Breakdowns, and R5 Roundtables.',
          },
          {
            name: '🔊 Golden Tavern Voice #1',
            type: CHANNEL_TYPES.VOICE,
          },
          {
            name: '🔊 Theorycrafting Lab #2',
            type: CHANNEL_TYPES.VOICE,
          },
          {
            name: '🔊 R5 Diplomatic Council (VIP)',
            type: CHANNEL_TYPES.VOICE,
            access: 'LEADERS_ONLY',
          },
        ],
      },
    ],
  };
}

/**
 * Generates a Turnkey 1-Click Kingdom War Server Blueprint for any Kingdom
 */
export function buildKingdomWarBlueprint(customOptions = {}) {
  const kdId = String(customOptions.kingdomId || '4194').replace(/[^0-9]/g, '') || '4194';
  const kdTitle = customOptions.kingdomTitle || `SOVEREIGN KINGDOM #${kdId}`;
  const alliances = Array.isArray(customOptions.alliances) && customOptions.alliances.length > 0
    ? customOptions.alliances.slice(0, 6)
    : ['VHN1', 'VHN2', 'VHN3', 'VHN4'];

  return {
    id: 'KINGDOM_WAR_SERVER',
    kingdomId: kdId,
    name: `🏰 KD #${kdId} // ${kdTitle}`,
    subtitle: `Turnkey Kingdom War Server wired to Valheon Telemetry (Valheon Sovereign Roster KD#${kdId})`,
    badge: `TURNKEY TENANT KD #${kdId}`,
    accentColor: '#10b981',
    roles: [
      {
        key: 'king',
        name: `👑 Crowned Sovereign of #${kdId} (R5)`,
        color: 0xf59e0b,
        hoist: true,
        mentionable: true,
        permissions: 'KING_R5_COMMAND',
      },
      {
        key: 'hermes',
        name: '🪽 HERMES // Kingdom War Envoy',
        color: 0x38bdf8,
        hoist: true,
        mentionable: false,
        permissions: 'ADMINISTRATOR',
      },
      {
        key: 'r4_council',
        name: `⚔️ High Council Strategist (R4)`,
        color: 0xf43f5e,
        hoist: true,
        mentionable: true,
        permissions: 'MODERATE_MEMBERS',
      },
      {
        key: 'rally_lead',
        name: '☄️ Rally & Garrison Captain',
        color: 0xa855f7,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'dkp_vanguard',
        name: '🔥 S+ DKP Vanguard (Top 25)',
        color: 0xd946ef,
        hoist: true,
        mentionable: false,
        permissions: 'STANDARD',
      },
      {
        key: 'title_giver',
        name: '🎖️ Royal Title Coordinator (24/7)',
        color: 0x06b6d4,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'citizen',
        name: `🛡️ Sworn Defender of #${kdId}`,
        color: 0x10b981,
        hoist: true,
        mentionable: false,
        permissions: 'STANDARD',
      },
      ...alliances.map((tag) => ({
        key: `alliance_${tag.toLowerCase()}`,
        name: `🛡️ [${tag}] Vanguard`,
        color: 0xeab308,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      })),
      {
        key: 'cropland_ceo',
        name: '🚜 Zone-1 Cropland CEO (On Notice)',
        color: 0x84cc16,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'mge_outlaw',
        name: '🚩 MGE Cap Breaker (Zero Queue)',
        color: 0xe11d48,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'migrant',
        name: '🧳 Borderland Nomad (Migrant)',
        color: 0x94a3b8,
        hoist: false,
        mentionable: false,
        permissions: 'STANDARD',
      },
      // Combat Specialization Tags (1-Tap Self-Assign)
      {
        key: 'spec_infantry',
        name: '🗡️ Infantry Specialist',
        color: 0x3b82f6,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_cavalry',
        name: '🐎 Cavalry Specialist',
        color: 0xef4444,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_archer',
        name: '🏹 Archer Specialist',
        color: 0x10b981,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_rally',
        name: '🔥 Rally Leader',
        color: 0xf97316,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_garrison',
        name: '🏰 Garrison Captain',
        color: 0x8b5cf6,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      // Event Calendar & Migration No-Cap Ping Roles (1-Tap Self-Assign)
      {
        key: 'ping_mtg',
        name: '💎 More Than Gems Alert',
        color: 0x06b6d4,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'ping_20gh',
        name: '🗿 20GH Event Alert',
        color: 0xf59e0b,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'ping_wheel_mge',
        name: '🎡 Wheel & MGE Alert',
        color: 0xa855f7,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'ping_egg',
        name: '🔨 Egg & Esmeralda Alert',
        color: 0xec4899,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'ping_nocap',
        name: '🚨 No-Cap Migration Alert',
        color: 0x22c55e,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
    ],
    categories: [
      {
        key: 'kd_gateway',
        name: `🏰 KINGDOM #${kdId} CITADEL GATEWAY`,
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '📜-kingdom-laws-and-charter',
            type: CHANNEL_TYPES.TEXT,
            topic: `Official Kingdom #${kdId} Laws, MGE Rules, Farm/Tile Regulations, and DKP Requirements.`,
            pinKey: 'KD_CHARTER_EMBED',
          },
          {
            name: '🔗-verify-governor-id',
            type: CHANNEL_TYPES.TEXT,
            topic: `Link your in-game Governor ID to unlock Kingdom #${kdId} war channels and sync your DKP profile.`,
            pinKey: 'KD_VERIFY_CONSOLE',
          },
          {
            name: '📢-kings-decrees',
            type: CHANNEL_TYPES.ANNOUNCEMENT,
            topic: `Official announcements and KvK mobilization orders from the High Council of Kingdom #${kdId}.`,
          },
          {
            name: '🌐-official-rok-intel-bridge',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Direct 1-Click Bridge to Official Rise of Kingdoms Discord Patch Notes (#📜〡rok․news), Redeem Codes, Osiris League & Bug Reports.',
            pinKey: 'OFFICIAL_ROK_BRIDGE',
          },
          {
            name: '🎯-combat-roles-and-event-pings',
            type: CHANNEL_TYPES.TEXT,
            topic: '1-Tap Combat Specialization Tags (Infantry, Cavalry, Archer, Rally, Garrison) & Event Calendar Alerts (More Than Gems, 20GH, Wheel, MGE, No-Cap).',
            pinKey: 'ROLE_AND_EVENT_PING_CONSOLE',
          },
          {
            name: '⏰-utc-event-and-pass-alerts',
            type: CHANNEL_TYPES.TEXT,
            topic: `Automated 15-minute and 0-minute UTC alerts delivered by HERMES for Ruins, Altar, Pass Openings, and Ark of Osiris.`,
            pinKey: 'KD_EVENT_RADAR',
          },
        ],
      },
      {
        key: 'kd_tickets',
        name: '🎫 R4 CONCIERGE & APPLICATIONS',
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '🎫-kingdom-ticket-desk',
            type: CHANNEL_TYPES.TEXT,
            topic: `Open a private ticket with Kingdom #${kdId} High Council for Migration, MGE/HoH Applications, or Diplomacy.`,
            pinKey: 'TICKET_CONSOLE_KINGDOM',
          },
          {
            name: '🔮-title-request-queue',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_INTERACTIVE',
            topic: 'Request Duke, Architect, Scientist, or Justice titles with your X/Y coordinates.',
            pinKey: 'TITLE_QUEUE_CONSOLE',
          },
          {
            name: '⚰️-ark-of-osiris-signups',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_INTERACTIVE',
            topic: '30v30 Ark of Osiris Tactical Lane Sign-Ups (Top Shrines, Mid Obelisks/Ark, Bottom Outposts, and Substitutes).',
            pinKey: 'AOO_CONSOLE',
          },
          {
            name: '🔒-r4-ticket-transcripts',
            type: CHANNEL_TYPES.TEXT,
            access: 'LEADERS_ONLY',
            topic: 'Private archive of Migrant screenings, MGE approvals, and dispute resolutions.',
          },
          {
            name: '⚔️-kvk-diplo-and-coalition-1click',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_READ_ONLY',
            topic: 'Heading into KvK? Deploy a 1-Click KvK Diplomacy Server ($9) or 1-Click Allied Coalition War Server ($9) — or grab BOTH for $15 within 72 hours!',
            pinKey: 'CROSS_SELL_KVK_BUNDLE',
          },
          {
            name: '🛟-valheon-support-and-relaunch',
            type: CHANNEL_TYPES.TEXT,
            access: 'OWNER_AND_R5_ONLY',
            topic: 'Sovereign Buyer & R5 Only — Direct Customer Care Relay to Valheon Citadel HQ. Customize channel names freely; restore missing channels for $0.00!',
            pinKey: 'CENTRAL_SUPPORT_RELAY_CONSOLE',
          },
        ],
      },
      {
        key: 'kd_war_room',
        name: `⚔️ KVK WAR ROOM & VALHEON TELEMETRY`,
        access: 'CITIZENS_ONLY',
        channels: [
          {
            name: '📊-live-dkp-leaderboard',
            type: CHANNEL_TYPES.TEXT,
            access: 'CITIZENS_READ_ONLY',
            topic: `Live Kingdom #${kdId} DKP Rankings, Pre-KvK Scores, and T4/T5 Kill/Dead deltas powered by Valheon.`,
            pinKey: 'KD_DKP_FEED',
          },
          {
            name: '🚨-rally-and-garrison-pings',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Emergency flag defenses, pass timers, and rally coordinates. Keep chatter clear during war!',
          },
          {
            name: '🗺️-theater-zone-orders',
            type: CHANNEL_TYPES.TEXT,
            access: 'CITIZENS_READ_ONLY',
            topic: '128-Node Crystal Map flag paths, alliance territory assignments, and teleport zones.',
          },
          {
            name: '📸-drop-screenshots-ocr',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Drop your Hall of Heroes, Speedup, RSS, or Equipment screenshots here for instant HERMES AI OCR indexing.',
          },
          {
            name: '💤-governor-presence-alerts',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Automated Valheon Presence webhooks when front-line governors switch to Sleeping/Working status.',
          },
        ],
      },
      {
        key: 'kd_tavern',
        name: '🎭 KINGDOM TAVERN & CONFESSIONAL',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🍻-kingdom-tavern',
            type: CHANNEL_TYPES.TEXT,
            topic: `Main social lounge for Kingdom #${kdId} citizens, allies, and guests.`,
          },
          {
            name: '🌐-17-language-global-chat',
            type: CHANNEL_TYPES.TEXT,
            topic: `Right-click any message -> Apps -> Translate, or react with any of the 17 Flag Emojis (🇺🇸 🇻🇳 🇸🇦 🇷🇺 🇨🇳 🇪🇸 🇮🇩 🇰🇷 🇹🇷 🇫🇷 🇩🇪 🇧🇷 🇯🇵 🇮🇹 🇵🇱 🇹🇭 🇲🇾) for instant HERMES translation!`,
            pinKey: 'GLOBAL_TRANSLATOR_CONSOLE',
          },
          {
            name: '🕵️-anonymous-whisper-vault',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_BUTTON_ONLY',
            topic: 'Say what you cannot say in Kingdom Chat! Submit 100% anonymous feedback or spicy Kingdom tea via HERMES.',
            pinKey: 'CONFESSIONAL_CONSOLE',
          },
          {
            name: '💀-roast-my-stats',
            type: CHANNEL_TYPES.TEXT,
            topic: `Run /hermes roast to let the AI judge your Kingdom #${kdId} kill points vs. farm weight!`,
          },
          {
            name: '📚-valheon-field-guides',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_READ_ONLY',
            topic: 'Pinned Commander Tier Matrices, 5-March Fleet Builds, and Active Redeem Codes synced from Valheon HQ.',
            pinKey: 'ACADEMY_TIERS',
          },
          {
            name: '🎓-peerless-scholar-solver',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_INTERACTIVE',
            topic: '17-Language Lyceum of Wisdom & Peerless Scholar Solver (Preliminary, Midterm Early Packet & 15s Final Exam Speed Search).',
            pinKey: 'PEERLESS_CONSOLE',
          },
        ],
      },
      {
        key: 'kd_alliances',
        name: `🛡️ ALLIANCE SECTORS (${alliances.join(' / ')})`,
        access: 'CITIZENS_ONLY',
        channels: alliances.flatMap((tag) => [
          {
            name: `🛡️-${tag.toLowerCase()}-war-chat`,
            type: CHANNEL_TYPES.TEXT,
            topic: `Dedicated alliance coordination channel for [${tag}] members and R4 officers.`,
          },
        ]),
      },
      {
        key: 'kd_council',
        name: '🔒 HIGH COUNCIL CITADEL (R4/R5 ONLY)',
        access: 'LEADERS_ONLY',
        channels: [
          {
            name: '👁️-aegis-migrant-polygraph',
            type: CHANNEL_TYPES.TEXT,
            access: 'LEADERS_ONLY',
            topic: 'Automated AEGIS 5-Model Trust Score & EK Polygraph dossiers for every incoming migrant ticket.',
            pinKey: 'SUITE_AEGIS',
          },
          {
            name: '📉-deadweight-and-ghost-audit',
            type: CHANNEL_TYPES.TEXT,
            access: 'LEADERS_ONLY',
            topic: 'Top 300 Power pruning list, rogue MGE alerts, and suspected enemy alt farms.',
          },
          {
            name: '🗳️-council-voting-table',
            type: CHANNEL_TYPES.TEXT,
            access: 'LEADERS_ONLY',
            topic: 'R4/R5 leadership decisions, MGE top-10 allocations, and KvK diplomatic treaties.',
          },
          {
            name: '🔊 High Council War Table',
            type: CHANNEL_TYPES.VOICE,
            access: 'LEADERS_ONLY',
          },
          {
            name: `🔊 KD #${kdId} Rally Voice #1`,
            type: CHANNEL_TYPES.VOICE,
            access: 'CITIZENS_ONLY',
          },
        ],
      },
    ],
  };
}

/**
 * Generates a Turnkey Genesis Jumper / Sleeper Group Server Blueprint
 */
export function buildJumperGenesisBlueprint(customOptions = {}) {
  const targetKd = String(customOptions.kingdomId || '4205').replace(/[^0-9]/g, '') || '4205';
  const projectName = customOptions.projectName || `PROJECT GENESIS // TARGET KD #${targetKd}`;

  return {
    id: 'JUMPER_GENESIS_GROUP',
    kingdomId: targetKd,
    name: `🚀 ${projectName}`,
    subtitle: `Turnkey Day-1 Jumper & Sleeper Mobilization Server wired to Bastion SCOUT Genesis Telemetry`,
    badge: `GENESIS JUMPER #${targetKd}`,
    accentColor: '#a855f7',
    roles: [
      {
        key: 'leader',
        name: '👑 Project Founder (R5)',
        color: 0xf59e0b,
        hoist: true,
        mentionable: true,
        permissions: 'KING_R5_COMMAND',
      },
      {
        key: 'hermes',
        name: '🪽 HERMES Genesis OS',
        color: 0x38bdf8,
        hoist: true,
        mentionable: false,
        permissions: 'ADMINISTRATOR',
      },
      {
        key: 'r4_leadership',
        name: '⚔️ Genesis R4 Leadership',
        color: 0xa855f7,
        hoist: true,
        mentionable: true,
        permissions: 'MODERATE_MEMBERS',
      },
      {
        key: 'whale_sponsor',
        name: '🐋 Kraken / Golden Chest Sponsor',
        color: 0xf43f5e,
        hoist: true,
        mentionable: false,
        permissions: 'STANDARD',
      },
      {
        key: 'verified_jumper',
        name: `🚀 Confirmed Jumper (#${targetKd})`,
        color: 0x10b981,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'sleeper_squad',
        name: '🛌 20-Day Sleeper Squad',
        color: 0x06b6d4,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
    ],
    categories: [
      {
        key: 'genesis_launch',
        name: '🚀 GENESIS LAUNCHPAD & COUNTDOWN',
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '📜-project-manifesto-and-timeline',
            type: CHANNEL_TYPES.TEXT,
            topic: `Welcome to ${projectName}! Full Jump/Sleeper UTC timeline, starting kingdom, and final landing target #${targetKd}.`,
            pinKey: 'WELCOME_MANIFESTO',
          },
          {
            name: '🛰️-bastion-genesis-radar',
            type: CHANNEL_TYPES.TEXT,
            topic: `Automated Bastion SCOUT Day-1 alerts delivered by HERMES when Target Kingdom #${targetKd} opens on the Rise of Kingdoms server list!`,
          },
          {
            name: '🎫-r4-and-alliance-applications',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Apply for R4 Leadership, Whale Garrison Captain, or register your group via private ticket.',
            pinKey: 'TICKET_CONSOLE_KINGDOM',
          },
        ],
      },
      {
        key: 'genesis_rosters',
        name: '🛡️ ALLIANCE SLOTS & SQUAD SIGNUPS',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🥇-alliance-1-main-roster',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Top 50 Spenders & High-Activity Vanguard Roster (1/50 to 50/50).',
          },
          {
            name: '🥈-alliance-2-war-roster',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Core F2P/Low-Spender grinders & Sleeper rally fillers.',
          },
          {
            name: '🌱-ch8-speedrun-and-sleeper-guide',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_READ_ONLY',
            topic: 'Step-by-step Valheon Ch8 Jumper & 20-Day Passport Sleeper Blueprint + Free Redeem Codes.',
            pinKey: 'REDEEM_CODES_LIVE',
          },
        ],
      },
      {
        key: 'genesis_community',
        name: '🎭 JUMPER TAVERN & CONFESSIONAL',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🍻-jumper-lounge',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Meet your future alliance mates before Day 1 drops!',
          },
          {
            name: '🕵️-anonymous-whisper-vault',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_BUTTON_ONLY',
            topic: 'Drop anonymous jumper confessions, rival group intel, or honest feedback via HERMES.',
            pinKey: 'CONFESSIONAL_CONSOLE',
          },
          {
            name: '🔊 Launch Day Voice HQ',
            type: CHANNEL_TYPES.VOICE,
          },
          {
            name: '🛟-valheon-support-and-relaunch',
            type: CHANNEL_TYPES.TEXT,
            access: 'OWNER_AND_R5_ONLY',
            topic: 'Sovereign Buyer & R5 Only — Direct Customer Care Relay to Valheon Citadel HQ. Customize channel names freely; restore missing channels for $0.00!',
            pinKey: 'CENTRAL_SUPPORT_RELAY_CONSOLE',
          },
        ],
      },
    ],
  };
}

/**
 * Generates the $9 1-Click KvK Diplomacy Summit Server Blueprint (All 8–16 Matched Kingdoms)
 */
export function buildKvkDiploBlueprint(customOptions = {}) {
  const seasonName = customOptions.kingdomTitle || customOptions.seasonName || 'LOST KINGDOM DIPLOMACY SUMMIT';
  const rawKingdoms = Array.isArray(customOptions.alliances) && customOptions.alliances.length > 0
    ? customOptions.alliances
    : ['4190', '4191', '4192', '4193', '4194', '4195', '4196', '4197'];
  const kingdoms = rawKingdoms.slice(0, 12).map((k) => String(k).replace(/[^0-9A-Za-z]/g, '').toUpperCase() || '4194');

  return {
    id: 'KVK_DIPLO_SERVER',
    kingdomId: kingdoms[0] || '4194',
    name: `🕊️ KVK DIPLO // ${seasonName}`,
    subtitle: `Turnkey 8-Kingdom Lost Kingdom Diplomacy & Treaty Summit (${kingdoms.map((k) => `#${k}`).join(' • ')})`,
    badge: `KVK DIPLOMACY ($9)`,
    accentColor: '#38bdf8',
    roles: [
      {
        key: 'king',
        name: '👑 Crowned King (Summit Voter)',
        color: 0xf59e0b,
        hoist: true,
        mentionable: true,
        permissions: 'KING_R5_COMMAND',
      },
      {
        key: 'hermes',
        name: '🪽 HERMES // Diplomatic Envoy',
        color: 0x38bdf8,
        hoist: true,
        mentionable: false,
        permissions: 'ADMINISTRATOR',
      },
      {
        key: 'r4_council',
        name: '🕊️ Accredited Diplomat (Treaty Council)',
        color: 0xa855f7,
        hoist: true,
        mentionable: true,
        permissions: 'MODERATE_MEMBERS',
      },
      {
        key: 'camp_fire',
        name: '🔥 Camp Fire Delegation',
        color: 0xef4444,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'camp_water',
        name: '💧 Camp Water Delegation',
        color: 0x3b82f6,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'camp_earth',
        name: '🌍 Camp Earth Delegation',
        color: 0x10b981,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'camp_wind',
        name: '⚡ Camp Wind Delegation',
        color: 0xeab308,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      ...kingdoms.map((kd) => ({
        key: `kd_${kd.toLowerCase()}`,
        name: `🏰 Kingdom #${kd}`,
        color: 0x06b6d4,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      })),
      {
        key: 'citizen',
        name: '⚔️ Lost Kingdom Envoy',
        color: 0x94a3b8,
        hoist: false,
        mentionable: false,
        permissions: 'STANDARD',
      },
    ],
    categories: [
      {
        key: 'diplo_summit',
        name: '🏛️ I. LOST KINGDOM SUMMIT & TREATIES',
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '📜-lk-map-camps-and-rules',
            type: CHANNEL_TYPES.TEXT,
            topic: `Official Lost Kingdom Matchmaking Bracket (${kingdoms.map((k) => `#${k}`).join(', ')}), Camp Assignments, and Summit Charter.`,
            pinKey: 'KD_CHARTER_EMBED',
          },
          {
            name: '⚖️-signed-treaties-and-zone-splits',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Ratified Zone 5 / Zone 6 / King\'s Land border splits, Crusader Fortress rotations, and Great Ziggurat reward treaties.',
          },
          {
            name: '⏰-pass-and-ziggurat-utc-timers',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Live UTC-to-Local countdowns for Pass 4, Pass 5, Hierons, Crusader Fortress, and Great Ziggurat openings.',
            pinKey: 'KD_EVENT_RADAR',
          },
        ],
      },
      {
        key: 'diplo_conclave',
        name: '🔒 II. PRIVATE KINGS & DIPLOMATS CONCLAVE',
        access: 'LEADERS_ONLY',
        channels: [
          {
            name: '👑-kings-only-conclave',
            type: CHANNEL_TYPES.TEXT,
            access: 'LEADERS_ONLY',
            topic: 'Strictly locked to Crowned Kings & Accredited Diplomats. 17-Language Flag Reaction Translator active for cross-language negotiations.',
            pinKey: 'GLOBAL_TRANSLATOR_CONSOLE',
          },
          {
            name: '🕊️-diplomat-negotiation-floor',
            type: CHANNEL_TYPES.TEXT,
            access: 'LEADERS_ONLY',
            topic: 'All-Kingdom diplomatic floor for border adjustments, MGE stage rules, and duel scheduling.',
          },
          {
            name: '🤝-open-1v1-bilateral-embassy',
            type: CHANNEL_TYPES.TEXT,
            access: 'LEADERS_ONLY',
            topic: 'Click below to spin up a private 1-on-1 treaty channel between any two Kingdoms (away from the other 6 Kingdoms).',
            pinKey: 'BILATERAL_EMBASSY_CONSOLE',
          },
          {
            name: '🎙️ Kings & Diplomats Summit Table',
            type: CHANNEL_TYPES.VOICE,
            access: 'LEADERS_ONLY',
          },
        ],
      },
      {
        key: 'diplo_public',
        name: '🌐 III. LOST KINGDOM PUBLIC TOWN HALL',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🌐-17-lang-lk-global-chat',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Public Lost Kingdom cross-kingdom chat with 17-Language Flag Reaction & Right-Click Translation!',
            pinKey: 'GLOBAL_TRANSLATOR_CONSOLE',
          },
          {
            name: '💀-lk-battle-reports-and-banter',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Drop your best open-field trades, rally reports, and Lost Kingdom war receipts.',
          },
          {
            name: '🕵️-lk-anonymous-whisper-vault',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_BUTTON_ONLY',
            topic: 'Zero-Trace Anonymous Lost Kingdom Tea & Betrayal Leak Vault.',
            pinKey: 'CONFESSIONAL_CONSOLE',
          },
        ],
      },
      {
        key: 'diplo_trojan_store',
        name: '🚀 IV. VALHEON 1-CLICK STORE & SUPPORT RELAY',
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '🚀-get-this-for-your-kingdom',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_READ_ONLY',
            topic: 'Want a spy-proof 1-Click Allied Coalition War Server ($9 / $15 72h Bundle) or a full 1-Click Home Kingdom War OS Server ($39)? Launch below!',
            pinKey: 'CROSS_SELL_FROM_KVK_SERVER',
          },
          {
            name: '🛟-valheon-support-and-relaunch',
            type: CHANNEL_TYPES.TEXT,
            access: 'OWNER_AND_R5_ONLY',
            topic: 'Sovereign Buyer & R5 Only — Direct Customer Care Relay to Valheon Citadel HQ. Customize freely; restore missing channels for $0.00!',
            pinKey: 'CENTRAL_SUPPORT_RELAY_CONSOLE',
          },
        ],
      },
    ],
  };
}

/**
 * Generates the $9 1-Click Allied Coalition War-Room Blueprint (Spy-Proof Allied Camp Server)
 */
export function buildKvkCoalitionBlueprint(customOptions = {}) {
  const campName = customOptions.kingdomTitle || customOptions.campName || 'ALLIED COALITION WAR COMMAND';
  const rawKingdoms = Array.isArray(customOptions.alliances) && customOptions.alliances.length > 0
    ? customOptions.alliances
    : ['4194', '4195', '4196', '4197'];
  const kingdoms = rawKingdoms.slice(0, 8).map((k) => String(k).replace(/[^0-9A-Za-z]/g, '').toUpperCase() || '4194');

  return {
    id: 'KVK_COALITION_SERVER',
    kingdomId: kingdoms[0] || '4194',
    name: `⚔️ COALITION // ${campName}`,
    subtitle: `Spy-Proof Allied Camp War Server (${kingdoms.map((k) => `KD #${k}`).join(' + ')})`,
    badge: `ALLIED COALITION ($9)`,
    accentColor: '#f43f5e',
    roles: [
      {
        key: 'king',
        name: '👑 Coalition Warlord (Allied King)',
        color: 0xf59e0b,
        hoist: true,
        mentionable: true,
        permissions: 'KING_R5_COMMAND',
      },
      {
        key: 'hermes',
        name: '🪽 HERMES // Coalition War Envoy',
        color: 0x38bdf8,
        hoist: true,
        mentionable: false,
        permissions: 'ADMINISTRATOR',
      },
      {
        key: 'r4_council',
        name: '⚔️ Allied High Command (R4 Strategist)',
        color: 0xf43f5e,
        hoist: true,
        mentionable: true,
        permissions: 'MODERATE_MEMBERS',
      },
      {
        key: 'rally_lead',
        name: '🔥 Coalition Rally & Garrison Captain',
        color: 0xa855f7,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      },
      ...kingdoms.map((kd) => ({
        key: `allied_kd_${kd.toLowerCase()}`,
        name: `🛡️ Allied KD #${kd}`,
        color: 0x10b981,
        hoist: true,
        mentionable: true,
        permissions: 'STANDARD',
      })),
      {
        key: 'citizen',
        name: '⚔️ Coalition Frontline Fighter',
        color: 0xeab308,
        hoist: false,
        mentionable: false,
        permissions: 'STANDARD',
      },
      // Combat Specialization Tags (1-Tap Self-Assign)
      {
        key: 'spec_infantry',
        name: '🗡️ Infantry Specialist',
        color: 0x3b82f6,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_cavalry',
        name: '🐎 Cavalry Specialist',
        color: 0xef4444,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_archer',
        name: '🏹 Archer Specialist',
        color: 0x10b981,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_rally',
        name: '🔥 Rally Leader',
        color: 0xf97316,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
      {
        key: 'spec_garrison',
        name: '🏰 Garrison Captain',
        color: 0x8b5cf6,
        hoist: false,
        mentionable: true,
        permissions: 'STANDARD',
      },
    ],
    categories: [
      {
        key: 'coalition_war',
        name: '⚔️ I. ALLIED COALITION WAR COMMAND',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🔥-joint-rally-and-garrison-calls',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Live multi-kingdom Rally & Garrison calls with 17-Language Lilith Canonical Glossary Bridge (Valheon 17-Lang Glossary).',
            pinKey: 'GLOBAL_TRANSLATOR_CONSOLE',
          },
          {
            name: '⏰-pass-and-ziggurat-utc-timers',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Live UTC-to-Local mobilization countdowns (<t:UNIX:F>) with 1-click RSVP counters across all allied Kingdoms.',
            pinKey: 'KD_EVENT_RADAR',
          },
          {
            name: '🎯-combat-roles-and-rally-tags',
            type: CHANNEL_TYPES.TEXT,
            topic: '1-Tap Infantry / Cavalry / Archer / Rally / Garrison specialization tags for coalition war pings.',
            pinKey: 'ROLE_AND_EVENT_PING_CONSOLE',
          },
          {
            name: '🎙️-coalition-voice-rollcall',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Run /rollcall during Pass & Altar fights to log verified voice attendance across all allied Kingdoms.',
          },
          {
            name: '📡-shift-handoff-coverage',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Run /uptime to coordinate 24-Hour UTC shift handoffs (NA / EU / MENA / ASIA) so allied flags never burn uncontested.',
          },
        ],
      },
      {
        key: 'coalition_comms',
        name: '🌐 II. MULTI-KINGDOM ALLIED COMMS & VOICE',
        access: 'PUBLIC_INTERACTIVE',
        channels: [
          {
            name: '🌐-17-lang-allied-war-chat',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Allied multi-kingdom war lounge — react with any of the 17 Flag Emojis for instant translation!',
            pinKey: 'GLOBAL_TRANSLATOR_CONSOLE',
          },
          {
            name: '📸-drop-screenshots-ocr',
            type: CHANNEL_TYPES.TEXT,
            topic: 'Drop Resource Bag, Speedup Bag, or Battle Report screenshots for instant HERMES local OCR math.',
          },
          {
            name: '🔊 Coalition War-Room Voice #1 (Main Ball)',
            type: CHANNEL_TYPES.VOICE,
          },
          {
            name: '🔊 Allied Rally & Garrison Voice #2',
            type: CHANNEL_TYPES.VOICE,
          },
          {
            name: '🔊 Allied Kings War Table (R5/R4)',
            type: CHANNEL_TYPES.VOICE,
            access: 'LEADERS_ONLY',
          },
        ],
      },
      {
        key: 'coalition_trojan_store',
        name: '🚀 III. VALHEON 1-CLICK STORE & SUPPORT RELAY',
        access: 'PUBLIC_READ_ONLY',
        channels: [
          {
            name: '🚀-get-this-for-your-kingdom',
            type: CHANNEL_TYPES.TEXT,
            access: 'PUBLIC_READ_ONLY',
            topic: 'Love how HERMES runs this Coalition War Server? Deploy a full 24/7 Home Kingdom War OS Server ($39) or KvK Diplo Server ($9 / $15 Bundle) below!',
            pinKey: 'CROSS_SELL_FROM_KVK_SERVER',
          },
          {
            name: '🛟-valheon-support-and-relaunch',
            type: CHANNEL_TYPES.TEXT,
            access: 'OWNER_AND_R5_ONLY',
            topic: 'Sovereign Buyer & R5 Only — Direct Customer Care Relay to Valheon Citadel HQ. Customize freely; restore missing channels for $0.00!',
            pinKey: 'CENTRAL_SUPPORT_RELAY_CONSOLE',
          },
        ],
      },
    ],
  };
}

/**
 * Rich Pinned Embed & Interactive Component Payloads for HERMES Provisioning
 */
export const PINNED_CONSOLE_TEMPLATES = {
  WELCOME_MANIFESTO: {
    embed: {
      title: '👑 WELCOME TO VALHEON CITADEL // THE SOVEREIGN ROK OS',
      description:
        'You have entered **Valheon Citadel**, the unified command center, living strategy vault, and uncensored community home for **Rise of Kingdoms** — orchestrated by **🪽 HERMES**.\n\n' +
        '### ⚔️ THE 5 VALHEON COMMAND SUITES\n' +
        '• **🛡️ PILLAR I — AEGIS:** 5-Model Trust Index, EK Polygraph 3.0 & Ghost/Alt Forensics\n' +
        '• **🌌 PILLAR II — NEXUS:** Cerberus 3D Governor Galaxy & 60fps WebWorker DKP Engine\n' +
        '• **🗺️ PILLAR III — THEATER:** 128-Node Crystal Map Planner & AI KvK Predictor\n' +
        '• **📬 PILLAR IV — VANGUARD:** Cross-Kingdom Player Hunter, Recruitment CRM & Mail Studio\n' +
        '• **📸 PILLAR V — OPTICS:** Gemini 3.1 Vision Screenshot OCR & 7 Audited Calculators\n\n' +
        '### 🔗 STEP 1: VERIFY YOUR GOVERNOR ID\n' +
        'Click **`[🔗 Link RoK Governor ID]`** below (or run `/bind <governor_id>`) to sync your live `Valheon Sovereign Roster` telemetry and unlock your verified Kingdom & Tier roles.',
      color: 0xf59e0b,
      footer: { text: 'VALHEON COMMAND OS // POWERED BY HERMES MESSENGER ENGINE' },
    },
    buttons: [
      { customId: 'hermes_verify_governor', label: '🔗 Link RoK Governor ID', style: 'PRIMARY' },
      { customId: 'hermes_open_guide_vault', label: '📚 Browse 95 Field Guides', style: 'SECONDARY' },
      { customId: 'hermes_roast_me', label: '💀 Audit / Roast My Stats', style: 'DANGER' },
    ],
  },

  KD_VERIFY_CONSOLE: {
    embed: {
      title: '🔗 GOVERNOR ID, ALLIANCE & ZERO-GRID TITLE VERIFICATION GATEWAY',
      description:
        '**Welcome to the Kingdom Citadel Gateway! Link your in-game Rise of Kingdoms Governor profile below in 10 seconds to unlock the server:**\n\n' +
        '### 🔓 1. UNLOCK KINGDOM WAR ROOMS & YOUR ALLIANCE SECTOR\n' +
        '• For spy-protection, the **KvK War Room**, **Rally/Garrison Calls**, and **Alliance Sectors** are hidden from unverified guests.\n' +
        '• Click **`[🔗 Link Governor ID & Unlock War Channels]`** below and enter your **Governor ID**, **In-Game Name**, and **Alliance Tag**. **HERMES** will automatically grant your **`@🛡️ Sworn Defender`** role, assign your **`@Alliance Vanguard`** role, and format your nickname (`[TAG] Name`)!\n\n' +
        '### 🔮 2. POWERS ZERO-GRID 1-TAP TITLES (`#🔮-title-request-queue`)\n' +
        '• Once you link your **Governor ID** (and optional `[X, Y]` City Coordinates) here once, you **never** have to type coordinates for titles again—just type `"justice"`, `"duke"`, `"scientist"`, or `"architect"` in `#🔮-title-request-queue`!\n\n' +
        '### 📊 3. SYNCS YOUR LIVE KVK DKP & STATS CARD (`#📊-live-dkp-leaderboard`)\n' +
        '• Connects your Discord account to your in-game T4/T5 Kills, Deads, and KvK DKP goal so you can check your progress anytime in 1 click.',
      color: 0x10b981,
      footer: { text: 'VALHEON IDENTITY GATEWAY // 1-CLICK ROLE GRANT + ZERO-GRID TITLE BINDING' },
    },
    buttons: [
      { customId: 'hermes_verify_governor', label: '🔗 Link Governor ID & Unlock War Channels', style: 'SUCCESS' },
      { customId: 'hermes_mystats_btn', label: '🪪 View My Linked Governor & DKP Card', style: 'PRIMARY' },
      { customId: 'hermes_my_roles_status', label: '🎯 View My Combat & Event Roles', style: 'SECONDARY' },
    ],
  },

  KD_CHARTER_EMBED: {
    embed: {
      title: '📜 OFFICIAL KINGDOM LAWS, MGE RULES & KVK DKP CHARTER',
      description:
        '**All Governors and Alliance Members must abide by the Sovereign Kingdom Charter below:**\n\n' +
        '### ⚔️ 1. MIGHTIEST GOVERNOR (MGE) & GOLDEN HEAD ALLOCATION\n' +
        '• **Fixed MGE Ranks (Top 1–10):** Reserved for vetted Rally & Garrison Captains via `#🎫-kingdom-ticket-desk`. Unranked Governors must respect the posted Kill/Point Cap.\n' +
        '• **Cap Breakers:** Breaking a fixed MGE stage cap results in immediate placement on `#🎯-zero-list-and-bounties` until restitution is paid.\n\n' +
        '### 🌾 2. HOME KINGDOM PEACE & TILE LAWS\n' +
        '• **Zero City/Tile Hits in Home Kingdom:** All Alliance territories and resource nodes follow strict full-node completion rules (never leave `<100` resources in a node).\n\n' +
        '### 🔥 3. KVK DKP & DEAD TROOP EXPECTATIONS\n' +
        '• Your KvK contribution is tracked via **T4 Kills**, **T5 Kills**, and **Flag/Pass Garrison & Rally Deads** in `#📊-live-dkp-leaderboard`.\n' +
        '• Accounts failing to meet minimum KvK activity thresholds after matchmaking lock are subject to `#📉-deadweight-and-ghost-audit`.',
      color: 0xf59e0b,
      footer: { text: 'KINGDOM HIGH COUNCIL CHARTER // CUSTOMIZE FREELY TO MATCH YOUR KINGDOM LAWS' },
    },
    buttons: [
      { customId: 'hermes_verify_governor', label: '✅ Accept Charter & Link Governor ID', style: 'SUCCESS' },
      { customId: 'hermes_mystats_btn', label: '📊 Check My KvK DKP Goal', style: 'PRIMARY' },
    ],
  },

  SUITE_AEGIS: {
    embed: {
      title: '👁️ AEGIS 35-FIELD MIGRANT POLYGRAPH & SPY FORENSICS DESK',
      description:
        '**Automated R4/R5 Migrant Vetting & Deadweight Detection Console:**\n\n' +
        '• Every incoming migration ticket in `#🎫-kingdom-ticket-desk` can be audited in 1 click for **KP-to-Power Ratio**, **Dead-to-Power Ratio**, **T4 vs T5 Kill Breakdown**, and **Imperial Feeding / Alt-Farm Detection**.\n' +
        '• Click below to run a live Governor Telemetry Audit or inspect the Kingdom Zero-List.',
      color: 0xa855f7,
      footer: { text: 'VALHEON AEGIS POLYGRAPH // R4 & R5 HIGH COUNCIL OVERWATCH' },
    },
    buttons: [
      { customId: 'hermes_roast_me', label: '👁️ Run Governor Telemetry Audit', style: 'PRIMARY' },
      { customId: 'hermes_mystats_btn', label: '🪪 Inspect Linked DKP Dossier', style: 'SECONDARY' },
    ],
  },

  TICKET_CONSOLE_HQ: {
    embed: {
      title: '🎫 HERMES SOVEREIGN CONCIERGE & TICKET DESK',
      description:
        'Need direct assistance from the **Valheon High Council** or want to onboard your Kingdom?\n\n' +
        'Select a category below and **🪽 HERMES** will instantly provision an encrypted private channel for you — pre-loaded with your linked Governor telemetry so you never have to repeat yourself:\n\n' +
        '🏰 **[1-Click Kingdom Onboarding]** — Connect your Kingdom to Valheon or auto-deploy a turnkey Kingdom Discord server.\n' +
        '🛡️ **[AEGIS Polygraph / Data Audit]** — Request a forensic migrant screening, DKP calibration, or kingdom scan.\n' +
        '🤝 **[Partnership & Creator Desk]** — Alliance coalitions, content creators, and enterprise inquiries.\n' +
        '🛠️ **[Tech Support & Bug Report]** — Direct engineering support with transcript archiving.',
      color: 0x38bdf8,
      footer: { text: 'HERMES CONCIERGE // ZERO THIRD-PARTY BOTS REQUIRED' },
    },
    buttons: [
      { customId: 'hermes_ticket_onboard', label: '🏰 Onboard My Kingdom', style: 'SUCCESS' },
      { customId: 'hermes_ticket_aegis', label: '🛡️ AEGIS Forensic Audit', style: 'PRIMARY' },
      { customId: 'hermes_ticket_partner', label: '🤝 Partnership / Creator', style: 'SECONDARY' },
      { customId: 'hermes_ticket_support', label: '🛠️ Tech Support / Bug', style: 'DANGER' },
    ],
  },

  TICKET_CONSOLE_KINGDOM: {
    embed: {
      title: '🎫 KINGDOM HIGH COUNCIL // APPLICATION & TICKET DESK',
      description:
        'Select an option below to open a private channel with **R4/R5 Leadership**.\n\n' +
        '> 💡 **Automated AEGIS Screening:** When you open a Migration or MGE ticket, **🪽 HERMES** automatically pulls your live Power, Kill Points, Deads, and **5-Model Trust Score** from `Valheon Sovereign Roster` directly into the ticket header for fast review!\n\n' +
        '🧳 **[Apply to Migrate Here]** — Automated AEGIS Polygraph dossier + private R4 recruiter interview.\n' +
        '👑 **[MGE / Hall of Heroes Request]** — Submit your DKP rank, commander sculpture count, and gear screenshot.\n' +
        '⚖️ **[Diplomacy / King\'s Court]** — Report farm/tile violations, rogue hits, or alliance diplomacy.\n' +
        '🏦 **[Kingdom Bank / RSS Grant]** — Request KvK hospital healing subsidies from the Kingdom Vault.',
      color: 0x10b981,
      footer: { text: 'HERMES R4 DESK // AUTO-WIRED TO AWS DYNAMODB TELEMETRY' },
    },
    buttons: [
      { customId: 'hermes_ticket_migrant', label: '🧳 Apply to Migrate', style: 'SUCCESS' },
      { customId: 'hermes_ticket_mge', label: '👑 MGE / HoH Application', style: 'PRIMARY' },
      { customId: 'hermes_ticket_court', label: '⚖️ King\'s Court / Dispute', style: 'SECONDARY' },
      { customId: 'hermes_ticket_bank', label: '🏦 Kingdom Vault Request', style: 'SECONDARY' },
    ],
  },

  CONFESSIONAL_CONSOLE: {
    embed: {
      title: '🕵️ THE WHISPER VAULT // ZERO-TRACE ANONYMOUS DROP',
      description:
        'In-game Rise of Kingdoms chat censors every other word (`****`), deletes coordinates, and lets corrupt councils silence honest players.\n\n' +
        '### 🕵️ HOW THE HERMES WHISPER VAULT WORKS\n' +
        '1. Click **`[🕵️ Drop Anonymous Whisper]`** below (or type `/hermes confess` in any channel).\n' +
        '2. A private popup modal appears on your screen — **nobody can see you typing**.\n' +
        '3. **🪽 HERMES** strips your Discord identity and delivers your message here as an encrypted **`Sovereign Whisper #XXXX`**.\n\n' +
        '*Spill Kingdom tea, call out backroom KvK deals, share your worst MGE mistake, or speak truth to power with 100% anonymity.*',
      color: 0xa855f7,
      footer: { text: 'HERMES ZERO-TRACE PROTOCOL // IDENTITY NEVER LOGGED IN EMBED' },
    },
    buttons: [
      { customId: 'hermes_confess_open', label: '🎭 Post Anonymous Whisper', style: 'PRIMARY' },
      { customId: 'hermes_confess_tea', label: '🔥 Spill KvK / Kingdom Tea', style: 'DANGER' },
    ],
  },

  ONE_CLICK_DEPLOY_PROMO: {
    embed: {
      title: '🪽 VALHEON 1-CLICK DISCORD ARCHITECT // KINGDOM, DIPLO & COALITION SERVERS',
      description:
        '**Stop wasting 15 hours building channels by hand or paying $60/mo for 5 separate bots.** Let **🪽 HERMES** build a complete, spy-proof Rise of Kingdoms Discord server in **18 seconds**:\n\n' +
        '--- \n' +
        '### 🏰 1. 1-CLICK HOME KINGDOM WAR SERVER — **`$39` Common / `+$15` Legendary (24h Offer)**\n' +
        '*Your permanent 24/7 Home Kingdom War OS (21 Roles, 30+ Channels, Alliance Sectors & Cryptographic Permission Locks).*\n' +
        '• 🟢 **Includes `Common Hermes` (`$39` Flat):** R4 Ticket Desk, 30v30 AoO Roster, War Timers, Official RoK Bridge, Combat/Event Ping Console & Redeem Codes.\n' +
        '• 🟠 **24h "Writer of History" `Legendary Hermes` Upgrade (`+$15` in 24h = `$54` total / `+$25` after):** Unlocks **Zero-Grid 1-Tap & Chat Title Queue (`justice`/`duke`/`scientist`/`architect`)**, **Unlimited 17-Language Flag Translator (`17-Lang Canonical Glossary`)**, **17-Language Peerless Scholar + Saturday 10/10 Midterm Packet**, **Local Screenshot OCR**, **Silent 24h UTC Uptime Heatmap**, **Zero-List** & **All 95 Field Guides** forever (`$0/mo` recurring)!\n\n' +
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
        '• Grab **both** the **🕊️ `$9` KvK Diplomacy Server** AND your Camp\'s private **⚔️ `$9` Allied Coalition War Server** within **72 hours** for just **`$15` total**!\n' +
        '• 🛟 **Lifetime Free Repair Guarantee:** Customize your server wordings freely! Every server includes a **`#🛟-valheon-support-and-relaunch`** desk wired directly back to Valheon HQ with **1-Click Free Channel Repair (`$0.00`)** if an R4 ever accidentally deletes a channel.',
      color: 0xf59e0b,
      footer: { text: 'VALHEON 1-CLICK ARCHITECT // CLOSED-LOOP FLYWHEEL + FREE LIFETIME REPAIR GUARANTEE' },
    },
    buttonRows: [
      [
        { customId: 'hermes_deploy_kingdom_btn', label: '🏰 1-Click Kingdom Server ($39)', style: 'SUCCESS' },
        { customId: 'hermes_deploy_diplo_btn', label: '🕊️ 1-Click KvK Diplo ($9)', style: 'PRIMARY' },
        { customId: 'hermes_deploy_coalition_btn', label: '⚔️ 1-Click Coalition War ($9)', style: 'PRIMARY' },
        { customId: 'hermes_deploy_kvk_bundle_btn', label: '🔥 Diplo + Coalition 72h Bundle ($15)', style: 'DANGER' },
      ],
      [
        { customId: 'hermes_upgrade_legendary_btn', label: '🟠 Upgrade: Legendary (+$15 / 24h)', style: 'PRIMARY' },
        { customId: 'hermes_demo_common_lockout', label: '🔒 Preview Common / Clone Lock', style: 'SECONDARY' },
      ],
    ],
  },

  CROSS_SELL_KVK_BUNDLE: {
    embed: {
      title: '⚔️ HEADING INTO KVK? // DEPLOY YOUR 1-CLICK DIPLO & COALITION SERVERS',
      description:
        'Your Home Kingdom War Server is locked and loaded—now dominate your **Lost Kingdom Matchmaking & Camp War** without exposing your Home Server to enemy spies!\n\n' +
        '### 🕊️ OPTION 1: 1-CLICK KVK DIPLOMACY SUMMIT SERVER — **`$9` Flat**\n' +
        '• Spin up a clean, neutral **8-Kingdom Diplomacy Server** in 18 seconds (`@Crowned King`, `@Accredited Diplomat`, `@Camp Fire/Water/Earth/Wind`, dynamic `@KD #1–8` tags).\n' +
        '• Includes **Private Kings-Only Conclave**, **1-Click 1v1 Bilateral Embassy Ticket Maker** (negotiate private side deals between 2 Kingdoms!), and **17-Language Flag Translation**.\n\n' +
        '### ⚔️ OPTION 2: 1-CLICK ALLIED COALITION WAR SERVER — **`$9` Flat**\n' +
        '• Once Camp treaties are signed, never run war voice comms inside a public Diplomacy server where enemies can see your online counts!\n' +
        '• Spin up a **100% Spy-Proof Allied Camp War Server** for your 2–4 Allied Kingdoms with **Joint Rally/Garrison Calls**, **17-Language Canonical Glossary Bridge**, **UTC Pass Timers**, **Voice Rollcall (`/rollcall`)**, and **24h UTC Shift-Handoff Uptime**.\n\n' +
        '### 🔥 72-HOUR BUNDLE OFFER: GRAB BOTH FOR **`$15` TOTAL** *(Save `$3`!)*\n' +
        '• Deploy **both** your **🕊️ KvK Diplomacy Server** and your **⚔️ Allied Coalition War Server** within **72 hours** for just **`$15` flat**!\n' +
        '• Includes our **🛟 Lifetime Free Repair & Relaunch Guarantee** back to Valheon Citadel HQ.',
      color: 0x38bdf8,
      footer: { text: 'VALHEON KVK EXPANSION SUITE // $9 EACH OR $15 FOR BOTH WITHIN 72 HOURS' },
    },
    buttons: [
      { customId: 'hermes_deploy_diplo_btn', label: '🕊️ Deploy KvK Diplo Server ($9)', style: 'PRIMARY' },
      { customId: 'hermes_deploy_coalition_btn', label: '⚔️ Deploy Allied Coalition Server ($9)', style: 'PRIMARY' },
      { customId: 'hermes_deploy_kvk_bundle_btn', label: '🔥 Claim 72h Diplo + Coalition Bundle ($15)', style: 'SUCCESS' },
    ],
  },

  CROSS_SELL_FROM_KVK_SERVER: {
    embed: {
      title: '🚀 POWERED BY VALHEON HERMES // GET THIS FOR YOUR HOME KINGDOM OR CAMP!',
      description:
        'Impressed by how **🪽 HERMES** runs this Lost Kingdom server with **17-Language Canonical RoK Translation**, **Live UTC-to-Local War Timers**, and **Spy-Proof Conclaves**?\n\n' +
        'You can deploy **HERMES** into your own **Home Kingdom** or **Allied Camp Coalition** in **18 seconds**:\n\n' +
        '### 🏰 1. 1-CLICK HOME KINGDOM WAR OS SERVER — **`$39` Common / `$54` Legendary (24h Offer)**\n' +
        '• **Replaces $60–$90/mo of paid Discord bots forever (`$0/mo` recurring)!**\n' +
        '• Includes **🔮 Zero-Grid 1-Tap & Chat Title Queue** (`justice`, `duke`, `scientist`, `architect` — no coordinates needed!), **⚰️ 30v30 Ark of Osiris Lane Builder**, **🌐 17-Language Flag & Context-Menu Translator**, **🎓 17-Language Peerless Scholar Solver + Saturday 10/10 Midterm Packet**, **📸 Local Resource/Speedup Screenshot OCR**, **📡 Silent 24h UTC Alliance Uptime Heatmap**, **🎯 R4 Zero-List**, and **📚 All 95 Field Guides**.\n\n' +
        '### ⚔️ 2. 1-CLICK ALLIED COALITION WAR SERVER (`$9`) OR DIPLO + COALITION 72H BUNDLE (`$15`)\n' +
        '• Need a private, spy-proof **Allied Camp War Server** for your 2–4 Allied Kingdoms, or a **KvK Diplomacy Server** for your next matchmaking bracket?\n' +
        '• **`$9` each** — or grab **both Diplo + Coalition within 72 hours for just `$15`!**',
      color: 0xf59e0b,
      footer: { text: 'VALHEON TURNKEY DISCORD ARCHITECT // CLICK BELOW TO DEPLOY IN 18 SECONDS' },
    },
    buttons: [
      { customId: 'hermes_deploy_kingdom_btn', label: '🏰 Deploy My Home Kingdom Server ($39)', style: 'SUCCESS' },
      { customId: 'hermes_deploy_coalition_btn', label: '⚔️ Deploy Allied Coalition Server ($9)', style: 'PRIMARY' },
      { customId: 'hermes_deploy_diplo_btn', label: '🕊️ Deploy KvK Diplo Server ($9)', style: 'PRIMARY' },
      { customId: 'hermes_deploy_kvk_bundle_btn', label: '🔥 72h Diplo + Coalition Bundle ($15)', style: 'DANGER' },
    ],
  },

    CENTRAL_SUPPORT_RELAY_CONSOLE: {
    embed: {
      title: '🛟 VALHEON CONCIERGE SUPPORT & OWNER-LOCKED FREE SERVER RECOVERY DESK',
      description:
        '**Welcome to your dedicated Valheon Customer Care & Self-Healing Console (Visible only to the Server Owner & Crowned R5s).**\n\n' +
        '### 🛡️ 1. SOVEREIGN PURCHASE PROTECTION (ANTI-TEMPLATE & ANTI-ROGUE LOCK)\n' +
        '• **R4 Template & Sabotage Lock:** All `@R4` and shared `@R5` roles are cryptographically stripped of `Manage Server` and `Manage Channels` so **no R4 or visiting diplomat can ever export a Discord Server Template or delete your channels**.\n' +
        '• **Owner / R5 Recovery Lock:** Only the **Verified Server Owner / Buyer** (or Home Kingdom **R5 Sovereign**) can trigger the **`[🔄 1-Click Free Repair]`** button below—random members and R4s are strictly blocked from altering or resetting your server.\n\n' +
        '### 🔄 2. BROKE SOMETHING? 1-CLICK NON-DESTRUCTIVE REPAIR (`$0.00` — NEVER PAY AGAIN!)\n' +
        '• Feel free to **rename channels, change emojis, or edit descriptions** to match your Kingdom\'s personality.\n' +
        '• If you ever accidentally delete a channel or console, click **`[🔄 1-Click Free Repair / Restore Missing Channels]`** below! After Owner/R5 verification, **HERMES** will leave all of your existing custom channels and chat history untouched and rebuild **only** what is missing at **`$0.00`**.\n\n' +
        '### 📡 3. DIRECT TICKET RELAY TO VALHEON CITADEL HQ\n' +
        '• Need custom wording adjustments or want our Principal Architect to manually relaunch your layout?\n' +
        '• Click **`[🛟 Send Support Ticket to Valheon HQ]`** below—your request beams **directly into Valheon Citadel HQ** so our team can assist you remotely!',
      color: 0x10b981,
      footer: { text: 'VALHEON PURCHASE PROTECTION // OWNER & R5 LOCKED • FREE LIFETIME REPAIRS' },
    },
    buttons: [
      { customId: 'hermes_free_relaunch_btn', label: '🔄 1-Click Free Repair (Owner / R5 Locked • $0)', style: 'SUCCESS' },
      { customId: 'hermes_hq_relay_ticket_btn', label: '🛟 Send Support / Custom Wording Request to Valheon HQ', style: 'PRIMARY' },
    ],
  },

  HQ_CENTRAL_RELAY_CONSOLE: {
    embed: {
      title: '📡 CENTRAL CUSTOMER SUPPORT & REMOTE SERVER RELAUNCH OVERWATCH (VALHEON HQ)',
      description:
        'This channel is the **Central Overwatch Inbox** for every deployed **🏰 Home Kingdom Server (`$39/$54`)**, **🕊️ KvK Diplomacy Server (`$9`)**, and **⚔️ Allied Coalition Server (`$9` / `$15` Bundle)** across Discord.\n\n' +
        '• **Zero Multi-Server Monitoring Needed:** Whenever any King or R4 in any external server clicks **`[🛟 Send Support Ticket to Valheon HQ]`** or **`[🔄 1-Click Free Repair]`**, their ticket and server diagnostics land right here in **Valheon Citadel HQ**.\n' +
        '• **1-Click Remote Admin Actions:** Every incoming ticket includes **`[🔄 Remote Relaunch Their Server ($0)]`** and **`[💬 Beam Official Reply to Their Server]`** buttons so you can fix or reply to any customer\'s Discord server without ever leaving this channel!',
      color: 0x38bdf8,
      footer: { text: 'VALHEON CENTRAL SUPPORT RELAY // ALL EXTERNAL SERVERS REPORT HERE' },
    },
    buttons: [
      { customId: 'hermes_admin_manual_relaunch_open', label: '🔄 Manually Relaunch Any Server by Guild ID', style: 'SUCCESS' },
    ],
  },

  BILATERAL_EMBASSY_CONSOLE: {
    embed: {
      title: '🤝 1-ON-1 BILATERAL KINGDOM EMBASSY GENERATOR (PRIVATE SIDE-DEAL ROOMS)',
      description:
        'Need to negotiate a private border treaty, Zone 6 split, or MGE alliance between **two specific Kingdoms** away from the other 6 Kingdoms in the Lost Kingdom?\n\n' +
        'Click **`[🤝 Open Private 1v1 Kingdom Embassy]`** below and enter the two Kingdom numbers (e.g. `4194` & `4196`)—**HERMES** will instantly spin up a private encrypted diplomatic room with **17-Language Flag Translation** active!',
      color: 0xa855f7,
      footer: { text: 'VALHEON DIPLOMATIC CONCLAVE // SPY-PROOF BILATERAL TREATY ROOMS' },
    },
    buttons: [
      { customId: 'hermes_open_bilateral_embassy_btn', label: '🤝 Open Private 1v1 Kingdom Embassy', style: 'PRIMARY' },
    ],
  },

  ROAST_CONSOLE: {
    embed: {
      title: '💀 HERMES AI TELEMETRY ROASTER // FARMER OR WARLORD?',
      description:
        'Think your account is KvK-ready? Or want to expose a 95M-power farm lord hiding in Zone 1?\n\n' +
        'Click **`[💀 Roast My Linked Governor]`** or run `/hermes roast <governor_id>` and **🪽 HERMES** will inspect your real T4/T5 Kills, Deads, and Power trajectory in `Valheon Sovereign Roster` to deliver a merciless forensic verdict.',
      color: 0xf43f5e,
      footer: { text: 'POWERED BY VALHEON AEGIS 5-MODEL TRUST ENGINE' },
    },
    buttons: [
      { customId: 'hermes_roast_me', label: '💀 Roast My Linked Governor', style: 'DANGER' },
      { customId: 'hermes_flex_card', label: '🏆 Generate Sovereign Flex Card', style: 'SUCCESS' },
    ],
  },

  REDEEM_CODES_LIVE: {
    embed: {
      title: '🎁 ACTIVE RISE OF KINGDOMS REDEEM CODES // LIVE VAULT SYNC',
      description:
        'Copy and redeem in-game via **Avatar → Settings → Redeem**.\n\n' +
        '• `ROK2026SOVEREIGN` — **1,000 Gems + 2x Gold Keys + 3h Speedups**\n' +
        '• `g5k9p2m8q1` — **500 Gems + 5x Silver Keys + 1,000 VIP Points**\n' +
        '• `ROKVICTORY` — **1x Golden Sculpture + Tome of Knowledge**\n' +
        '• `Lilith11th` — **1,100 Gems + Dazzling Starlight Sculpture**\n\n' +
        '*Synced automatically by HERMES from `/api/valheon/vault?type=meta`.*',
      color: 0x10b981,
      footer: { text: 'AUTO-UPDATED BY HERMES // ZERO EXPIRED FLUFF' },
    },
    buttons: [
      { customId: 'hermes_refresh_codes', label: '🔄 Check for New Codes', style: 'SECONDARY' },
    ],
  },

  ACADEMY_TIERS: {
    embed: {
      title: '👑 SOVEREIGN COMMANDER TIER MATRIX (SOC OPEN-FIELD META)',
      description:
        'Live telemetry-weighted Commander Tier List from the **Valheon 95 Field Guide Vault**:\n\n' +
        '🟪 **Z-TIER (Apex Sovereign Meta):**\n' +
        '`Zhuge Liang` • `Hermann Prime` • `Liu Che` • `Joan of Arc Prime` • `Belisarius Prime` • `Ragnar Lodbrok Prime`\n\n' +
        '🟨 **S-TIER (Core 5-March Meta):**\n' +
        '`Huo Qubing` • `Arthur Pendragon` • `Scipio Africanus Prime` • `Gorgo` • `Ashurbanipal` • `Wallace`\n\n' +
        '🟩 **A-TIER (Situational / High-Value):**\n' +
        '`Nevsky` • `William I` • `Sargon the Great` • `Tariq ibn Ziyad` • `Boudica Prime`\n\n' +
        '*Run `/guide <commander>` in any channel or click below to inspect full talent trees, equipment, and 5/6/7-march pairings.*',
      color: 0xf59e0b,
      footer: { text: 'VALHEON ACADEMY // 141 COMMANDERS & 95 SOVEREIGN DOSSIERS' },
    },
    buttons: [
      { customId: 'hermes_open_guide_vault', label: '📖 Search All 95 Field Guides', style: 'PRIMARY' },
    ],
  },

  PEERLESS_CONSOLE: {
    embed: {
      title: '🎓 17-LANGUAGE PEERLESS SCHOLAR & LYCEUM OF WISDOM SOLVER',
      description:
        'Never miss a **Preliminary**, **Saturday Midterm**, or **15-Second Final Exam** question again! **HERMES** is wired directly to the **Valheon 17-Language Lyceum Vault** (`Valheon Lyceum Vault` + `CivPedia`).\n\n' +
        '### ⚡ 3 WAYS TO SOLVE ANY EXAM QUESTION IN <1 SECOND:\n' +
        '1️⃣ **Click `[🔍 Search Exam Answer (17 Languages)]` below:** Type 1–3 keywords in **any of the 17 supported RoK languages** (`EN, VI, AR, RU, ZH, ES, ID, KO, TR, FR, DE, PT, JA, IT, PL, TH, MS`) and get the instant verified answer privately.\n' +
        '2️⃣ **Click `[📦 Drop Saturday Midterm Packet (10/10)]`:** Drops the complete 10-question Midterm Early Study Packet (`peerless.early`) localized into your Discord language.\n' +
        '3️⃣ **Use `/hermes peerless` in ANY channel:** Type `/hermes peerless query:<keyword>` from any war room or tavern!',
      color: 0x06b6d4,
      footer: { text: 'VALHEON LYCEUM VAULT // 17 OFFICIAL LILITH LANGUAGES • 0MS LOOKUP' },
    },
    buttons: [
      { customId: 'hermes_peerless_search_btn', label: '🔍 Search Exam Answer (17 Languages)', style: 'PRIMARY' },
      { customId: 'hermes_peerless_midterm_btn', label: '📦 Saturday Midterm Packet (10/10)', style: 'SUCCESS' },
      { customId: 'hermes_peerless_quiz_btn', label: '⚡ Practice Final Exam Question', style: 'SECONDARY' },
    ],
  },

  GLOBAL_TRANSLATOR_CONSOLE: {
    embed: {
      title: '🌐 17-LANGUAGE SOVEREIGN TRANSLATOR // ALL 17 OFFICIAL ROK LANGUAGES',
      description:
        '**🪽 HERMES // Valheon OS** provides built-in **$0.00 17-Language Translation** across **every room on the server** (matching all 17 Official Peerless Scholar / `17-Lang Canonical Glossary` languages):\n\n' +
        '1️⃣ **Right-Click Any Message (Private Ephemeral Translation):**\n' +
        'Right-click (or long-press on mobile) **any message in any channel** ➔ **`Apps`** ➔ **`🌐 Translate to My Language`** (or **`🇺🇸 Translate to English`**). HERMES replies **only to you** so it never clutters war chat.\n\n' +
        '2️⃣ **React with Any of the 17 Flag Emojis (Public Shared Translation):**\n' +
        '🇺🇸 / 🇬🇧 English • 🇻🇳 Tiếng Việt • 🇸🇦 العربية • 🇷🇺 Русский • 🇨🇳 / 🇹🇼 中文 • 🇪🇸 Español\n' +
        '🇮🇩 Indonesia • 🇰🇷 한국어 • 🇹🇷 Türkçe • 🇫🇷 Français • 🇩🇪 Deutsch • 🇧🇷 Português\n' +
        '🇯🇵 日本語 • 🇮🇹 Italiano • 🇵🇱 Polski • 🇹🇭 ไทย • 🇲🇾 Bahasa Melayu\n\n' +
        '3️⃣ **`/hermes translate` Slash Command:**\n' +
        'Type `/hermes translate` in any room to translate up to **4,000 characters** with zero word limits!',
      color: 0x3b82f6,
      footer: { text: 'VALHEON 17-LANGUAGE BRIDGE // WORKS IN EVERY ROOM & TICKET' },
    },
    buttons: [],
  },

  TITLE_QUEUE_CONSOLE: {
    embed: {
      title: '🔮 KINGDOM ROYAL TITLE QUEUE // 24/7 AUTOMATED ROTATION',
      description:
        'Click any button below to request **Duke (+10% Def)**, **Scientist (+10% Research)**, **Architect (+10% Build)**, or **Justice (+10% Attack)** with your `[X, Y]` coordinates.\n\n' +
        '• **HERMES** places you in the FIFO rotation with an automatic **3-minute hold timer**.\n' +
        '• As soon as you pop your speedups/queues, click **`[✅ Done Using Title]`** to automatically ping the next governor in line!',
      color: 0xa855f7,
      footer: { text: 'VALHEON HERMES TITLE DISPATCHER // REPLACES PAID TITLE QUEUE BOTS' },
    },
    buttons: [
      { customId: 'hermes_title_req_duke', label: '⚔️ Request Duke', style: 'DANGER' },
      { customId: 'hermes_title_req_scientist', label: '🔬 Request Scientist', style: 'PRIMARY' },
      { customId: 'hermes_title_req_architect', label: '🏗️ Request Architect', style: 'SUCCESS' },
      { customId: 'hermes_title_req_justice', label: '⚖️ Request Justice', style: 'SECONDARY' },
      { customId: 'hermes_title_done', label: '✅ Done Using Title', style: 'SUCCESS' },
    ],
  },

  AOO_CONSOLE: {
    embed: {
      title: '⚰️ ARK OF OSIRIS 30v30 TACTICAL ROSTER & LANE BUILDER',
      description:
        'Lock in your **Ark of Osiris** lane assignment with 1 click! **HERMES** automatically attaches your verified Power telemetry and tracks `30 Mains + 10 Substitutes`.\n\n' +
        '• **⚔️ Top Lane:** Shrines of War & Life Strike Force\n' +
        '• **🏛️ Center Lane:** Obelisks & Ark Carrier Escort\n' +
        '• **🛡️ Bottom Lane:** Outposts & Cavalry Flank\n' +
        '• **🔄 Substitute Bench:** Ready reserves',
      color: 0xf59e0b,
      footer: { text: 'VALHEON ARK OF OSIRIS COMMANDER // REPLACES RAID-HELPER PRO' },
    },
    buttons: [
      { customId: 'hermes_aoo_top', label: '⚔️ Join Top Lane', style: 'PRIMARY' },
      { customId: 'hermes_aoo_mid', label: '🏛️ Join Mid / Ark', style: 'SUCCESS' },
      { customId: 'hermes_aoo_bot', label: '🛡️ Join Bottom Lane', style: 'PRIMARY' },
      { customId: 'hermes_aoo_sub', label: '🔄 Join Substitute', style: 'SECONDARY' },
      { customId: 'hermes_aoo_leave', label: '❌ Leave Roster', style: 'DANGER' },
    ],
  },

  KD_DKP_FEED: {
    embed: {
      title: '📊 LIVE KVK DKP LEADERBOARD & PERSONAL GOAL TRACKER',
      description:
        'Check your real-time **KvK DKP Score**, **% of Kingdom Goal**, **T4/T5 Kill & Dead Deltas**, and **Exact Kills/Deads Remaining** to clear your KvK requirement:',
      color: 0x10b981,
      footer: { text: 'SYNCED WITH VALHEON SOVEREIGN ROSTER // 60FPS DKP ENGINE' },
    },
    buttons: [
      { customId: 'hermes_mystats_btn', label: '🪪 Check My DKP & KvK Goal', style: 'SUCCESS' },
      { customId: 'hermes_calc_open_btn', label: '🧮 Sculpture & Wheel Calculator', style: 'PRIMARY' },
    ],
  },

  KD_EVENT_RADAR: {
    embed: {
      title: '⏰ KVK WAR MOBILIZATION & LOCAL TIMEZONE COUNTDOWN RADAR',
      description:
        'Never miss a **Pass Opening**, **Altar**, **Ruins**, or **King\'s Land** push due to UTC timezone confusion! **HERMES** converts every war timer into **your device\'s local clock** automatically.',
      color: 0xf43f5e,
      footer: { text: 'VALHEON UTC-TO-LOCAL TIMEZONE BRIDGE' },
    },
    buttons: [
      { customId: 'hermes_timer_rsvp', label: '🔔 Lock In Mobilization RSVP', style: 'SUCCESS' },
      { customId: 'hermes_timer_create_btn', label: '⏰ Create New War Countdown', style: 'PRIMARY' },
    ],
  },

  OFFICIAL_ROK_BRIDGE: {
    embed: {
      title: '🌐 OFFICIAL RISE OF KINGDOMS DISCORD INTEL BRIDGE (`257,600+` MEMBERS)',
      description:
        '**🪽 HERMES** bridges the highest-value channels from the **Official Lilith Rise of Kingdoms Discord (`discord.gg/riseofkingdoms` — Guild `474739462589382667`)** directly into this command console so you never have to dig through 166 channels of clutter:\n\n' +
        '### 📡 DIRECT 1-CLICK OFFICIAL CHANNEL PORTALS\n' +
        '• 📜 **[Official Patch Notes (`#📜〡rok․news`)](https://discord.com/channels/474739462589382667/1179320159542980698)** — Every official Lilith version update, commander balance patch & KvK rule change.\n' +
        '• 💻 **[Official Redeem Codes (`#💻〡redeem․codes`)](https://discord.com/channels/474739462589382667/1015398371202183218)** — Verified active gift codes straight from Lilith CMs.\n' +
        '• 📢 **[Official Announcements (`#📢〡announcements`)](https://discord.com/channels/474739462589382667/475064537884917761)** — Global maintenance windows, crossover events & developer letters.\n' +
        '• 🏆 **[Osiris League & Grand Prix (`#🏆〡osiris․info`)](https://discord.com/channels/474739462589382667/1116372034096726077)** — Official esports brackets, match schedules & prediction rewards.\n' +
        '• 🎉 **[Community Contests & Gem Giveaways (`#🎉〡event․news`)](https://discord.com/channels/474739462589382667/1179267505412382871)** — Free Gem giveaways (`#🥇〡giveaways`), polls (`#📊〡polls`) & design contests.\n' +
        '• 🔥 **[Bonfire IRL Player Meetups (`#🔥〡event․hub`)](https://discord.com/channels/474739462589382667/1210267381197185084)** — Official Lilith-sponsored real-life player gatherings worldwide.\n' +
        '• 🐛 **[Bug Reports (`#🐛〡bugs`)](https://discord.com/channels/474739462589382667/479118371821191168)** & **[In-Game Suggestions (`#🚦〡ingame․suggest`)](https://discord.com/channels/474739462589382667/1345010805388869632)** — Escalate game-breaking bugs or vote on QoL features.\n' +
        '• 📌 **[Official PC/Mac Client & VIP Support Links (`#📌〡rok․links`)](https://discord.com/channels/474739462589382667/1247427692484235325)** — Official launcher downloads & verified support portals.',
      color: 0x38bdf8,
      footer: { text: 'VALHEON OFFICIAL ROK INTEL BRIDGE // DIRECT JUMP + AI PATCH DIGEST' },
    },
    buttonRows: [
      [
        {
          label: '📜 Jump: Official Patch Notes',
          style: 'LINK',
          url: 'https://discord.com/channels/474739462589382667/1179320159542980698',
        },
        {
          label: '💻 Jump: Official Redeem Codes',
          style: 'LINK',
          url: 'https://discord.com/channels/474739462589382667/1015398371202183218',
        },
        {
          label: '🏆 Jump: Osiris League Hub',
          style: 'LINK',
          url: 'https://discord.com/channels/474739462589382667/1116372034096726077',
        },
        {
          label: '🔥 Jump: Bonfire IRL Meetups',
          style: 'LINK',
          url: 'https://discord.com/channels/474739462589382667/1210267381197185084',
        },
        {
          label: '🐛 Jump: Official Bug Reports',
          style: 'LINK',
          url: 'https://discord.com/channels/474739462589382667/479118371821191168',
        },
      ],
      [
        {
          customId: 'hermes_official_patch_digest',
          label: '⚡ HERMES Patch & Meta Impact Digest',
          style: 'PRIMARY',
        },
        {
          customId: 'hermes_refresh_codes',
          label: '🎁 Check Active Redeem Codes',
          style: 'SUCCESS',
        },
        {
          customId: 'hermes_official_events_radar',
          label: '📅 Upcoming RoK Event & MTG Radar',
          style: 'SECONDARY',
        },
      ],
    ],
  },

  ROLE_AND_EVENT_PING_CONSOLE: {
    embed: {
      title: '🎯 1-TAP COMBAT SPECIALIZATION & EVENT PING ROLE CONSOLE',
      description:
        'Customize your **Combat Specialization Tags** and **High-ROI Event / Migration Alerts** with 1 tap! Click any button below to toggle that role **ON** or **OFF** on your Discord profile:\n\n' +
        '### ⚔️ ROW 1 — COMBAT SPECIALIZATION & WAR ROLES\n' +
        '• **🗡️ Infantry Specialist** • **🐎 Cavalry Specialist** • **🏹 Archer Specialist**\n' +
        '• **🔥 Rally Leader** (Pinged for Pass/Flag Rallies) • **🏰 Garrison Captain** (Pinged for Emergency Swarms)\n\n' +
        '### 📅 ROW 2 — EVENT CALENDAR & MIGRATION NO-CAP ALERTS\n' +
        '• **💎 More Than Gems Alert** — Never spend 50,000 Gems a day before MTG drops!\n' +
        '• **🗿 20GH Event Alert** — Hunt for History, Silk Road, & 20 Gold Head events\n' +
        '• **🎡 Wheel & MGE Alert** — Wheel of Fortune & Mightiest Governor rotation windows\n' +
        '• **🔨 Egg & Esmeralda Alert** — Holy Knight\'s Treasure, Esmeralda\'s House & Armament events\n' +
        '• **🚨 No-Cap Migration Alert** — Instant alerts when Kingdoms open migration or drop power caps',
      color: 0xf59e0b,
      footer: { text: 'VALHEON HERMES ROLE CONCIERGE // CLICK ANY BUTTON TO TOGGLE ON / OFF' },
    },
    buttonRows: [
      [
        { customId: 'hermes_role_toggle_spec_infantry', label: '🗡️ Infantry', style: 'PRIMARY' },
        { customId: 'hermes_role_toggle_spec_cavalry', label: '🐎 Cavalry', style: 'DANGER' },
        { customId: 'hermes_role_toggle_spec_archer', label: '🏹 Archer', style: 'SUCCESS' },
        { customId: 'hermes_role_toggle_spec_rally', label: '🔥 Rally Leader', style: 'SECONDARY' },
        { customId: 'hermes_role_toggle_spec_garrison', label: '🏰 Garrison Captain', style: 'SECONDARY' },
      ],
      [
        { customId: 'hermes_role_toggle_ping_mtg', label: '💎 More Than Gems', style: 'PRIMARY' },
        { customId: 'hermes_role_toggle_ping_20gh', label: '🗿 20GH Event', style: 'SUCCESS' },
        { customId: 'hermes_role_toggle_ping_wheel_mge', label: '🎡 Wheel & MGE', style: 'SECONDARY' },
        { customId: 'hermes_role_toggle_ping_egg', label: '🔨 Egg & Esmeralda', style: 'SECONDARY' },
        { customId: 'hermes_role_toggle_ping_nocap', label: '🚨 No-Cap Migration', style: 'DANGER' },
      ],
      [
        { customId: 'hermes_my_roles_status', label: '🪪 View My Active Combat & Ping Roles', style: 'SUCCESS' },
        { customId: 'hermes_nocap_radar_btn', label: '🚨 Live Kingdom No-Cap & Opening Radar', style: 'PRIMARY' },
      ],
    ],
  },
};

export const ROLE_TOGGLE_CATALOG = {
  spec_infantry: { name: '🗡️ Infantry Specialist', color: 0x3b82f6, desc: 'Infantry Open-Field & Garrison Lineups' },
  spec_cavalry: { name: '🐎 Cavalry Specialist', color: 0xef4444, desc: 'Cavalry Flank, Hunt & Rally Lineups' },
  spec_archer: { name: '🏹 Archer Specialist', color: 0x10b981, desc: 'Archer AoE Burst & Rally/Garrison Lineups' },
  spec_rally: { name: '🔥 Rally Leader', color: 0xf97316, desc: 'Authorized Pass, Flag & Fort Rally Captain' },
  spec_garrison: { name: '🏰 Garrison Captain', color: 0x8b5cf6, desc: 'Authorized Structure & Flag Garrison Captain' },
  ping_mtg: { name: '💎 More Than Gems Alert', color: 0x06b6d4, desc: '7k / 25k Daily Gem Spend Event Alerts' },
  ping_20gh: { name: '🗿 20GH Event Alert', color: 0xf59e0b, desc: '20 Gold Head Event & Hunt for History Alerts' },
  ping_wheel_mge: { name: '🎡 Wheel & MGE Alert', color: 0xa855f7, desc: 'Wheel of Fortune & MGE Stage Alerts' },
  ping_egg: { name: '🔨 Egg & Esmeralda Alert', color: 0xec4899, desc: 'Holy Knight\'s Treasure & Equipment Event Alerts' },
  ping_nocap: { name: '🚨 No-Cap Migration Alert', color: 0x22c55e, desc: 'Instant Kingdom Opening & Power Cap Drop Alerts' },
};

export function getBlueprintByType(blueprintType = 'VALHEON_HQ', options = {}) {
  switch (blueprintType) {
    case 'KINGDOM_WAR_SERVER':
      return buildKingdomWarBlueprint(options);
    case 'KVK_DIPLO_SERVER':
      return buildKvkDiploBlueprint(options);
    case 'KVK_COALITION_SERVER':
      return buildKvkCoalitionBlueprint(options);
    case 'JUMPER_GENESIS_GROUP':
      return buildJumperGenesisBlueprint(options);
    case 'VALHEON_HQ':
    default:
      return buildValheonHqBlueprint(options);
  }
}
