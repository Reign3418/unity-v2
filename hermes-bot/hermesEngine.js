/**
 * ============================================================================
 * PROJECT HERMES — INTERACTIVE DISCORD BOT ENGINE (TICKETS, CONFESSIONAL, ROAST)
 * ============================================================================
 * Powers the interactive Discord buttons, modals, and slash commands for:
 *   1. Native R4/HQ Ticket Desk (with automatic AEGIS Telemetry injection)
 *   2. Zero-Trace Anonymous Confessional (Uncensored RoK Sanctuary)
 *   3. AI Telemetry Roaster & Sovereign Flex Card Generator
 *   4. 1-Click Server Architect (/hermes architect)
 *   5. 95 Field Guides & Live Redeem Code Summoner
 * ============================================================================
 */

import crypto from 'crypto';
import { provisionDiscordServer } from './provisioner.js';

/**
 * Deterministic Governor Roast / Trust Verdict Generator
 */
export function generateGovernorRoast(gov = {}) {
  const name = gov.name || gov.governorName || 'Unknown Governor';
  const id = gov.id || gov.governorId || '00000000';
  const power = Number(gov.power || 65_000_000);
  const kp = Number(gov.killPoints || gov.kp || 420_000_000);
  const deads = Number(gov.deads || gov.dead || 2_100_000);

  const kpRatio = power > 0 ? kp / power : 0;
  const deadRatio = power > 0 ? (deads * 10) / power : 0;
  const trustScore = Math.min(
    99,
    Math.max(12, Math.round(kpRatio * 1.8 + deadRatio * 22))
  );

  let tier = 'C-TIER // ZONE-1 CORN HARVESTER';
  let color = 0xf43f5e;
  let verdict = '';

  if (kpRatio >= 35 && deads >= 12_000_000) {
    tier = '👑 Z-TIER // SOVEREIGN OPEN-FIELD TITAN';
    color = 0xf59e0b;
    verdict =
      `HERMES tried to roast **${name}** (\`#${id}\`), but the telemetry broke our scale. ` +
      `Sitting at **${(kp / 1e9).toFixed(2)}B Kill Points** (${kpRatio.toFixed(1)}x Power) and **${(deads / 1e6).toFixed(1)}M Deads**, ` +
      `this governor doesn't farm nodes — they farm enemy alliances. Give them an MGE spot immediately.`;
  } else if (kpRatio >= 18 && deads >= 6_000_000) {
    tier = '⚔️ A-TIER // VANGUARD FRONTLINE BRUISER';
    color = 0x10b981;
    verdict =
      `**${name}** (\`#${id}\`) actually shows up when Pass 4 opens. With **${(kp / 1e9).toFixed(2)}B KP** (${kpRatio.toFixed(1)}x Power) ` +
      `and **${(deads / 1e6).toFixed(1)}M Deads**, they reinforce flags instead of hiding in Zone 1. Respectable warrior.`;
  } else if (kpRatio >= 8) {
    tier = '⚠️ B-TIER // CASUAL PART-TIME TOURIST';
    color = 0xeab308;
    verdict =
      `**${name}** (\`#${id}\`) has **${(power / 1e6).toFixed(1)}M Power** eating up Kingdom matchmaking weight, ` +
      `but only **${(kp / 1e6).toFixed(0)}M KP** (${kpRatio.toFixed(1)}x Power). Most of those kills probably came from hitting gatherers during MGE.`;
  } else {
    tier = '🚜 F-TIER // CERTIFIED LEVEL-6 CROPLAND CEO';
    color = 0xf43f5e;
    verdict =
      `🚨 **DEADWEIGHT ALERT:** **${name}** (\`#${id}\`) is hoarding **${(power / 1e6).toFixed(1)}M Power** with a tragic **${(kp / 1e6).toFixed(0)}M KP** (${kpRatio.toFixed(1)}x ratio) ` +
      `and barely **${(deads / 1e6).toFixed(2)}M Deads**. Their T5 troops have never seen sunlight outside of Pit level 3. Recommend immediate Zone-1 exile or zeroing.`;
  }

  return {
    name,
    id,
    power,
    kp,
    deads,
    kpRatio: Number(kpRatio.toFixed(2)),
    trustScore,
    tier,
    color,
    verdict,
    embed: {
      title: `💀 HERMES TELEMETRY ROAST // ${name} (#${id})`,
      description: verdict,
      color,
      fields: [
        { name: '⚡ Power Weight', value: `${(power / 1e6).toFixed(2)}M`, inline: true },
        { name: '⚔️ Kill Points', value: `${(kp / 1e9).toFixed(2)}B (${kpRatio.toFixed(1)}x)`, inline: true },
        { name: '🪦 Total Deads', value: `${(deads / 1e6).toFixed(2)}M`, inline: true },
        { name: '🛡️ AEGIS Trust Score', value: `**${trustScore} / 100**`, inline: true },
        { name: '🏷️ Forensic Classification', value: `**${tier}**`, inline: false },
      ],
      footer: { text: 'VALHEON AEGIS 5-MODEL FORENSICS // DELIVERED BY HERMES' },
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Formats an Anonymous Confessional Whisper Embed (Zero-Trace Protocol)
 */
export function buildAnonymousWhisperEmbed({
  category = '🔥 Kingdom Tea & Uncensored Truth',
  message = '',
  targetKingdom = 'Global',
  authorDiscordId = 'anonymous',
}) {
  const whisperNum = Math.floor(1000 + Math.random() * 9000);
  const modSalt = process.env.UNITY_INTERNAL_SECRET || 'valheon-sovereign-salt';
  const zeroTraceHash = crypto
    .createHmac('sha256', modSalt)
    .update(String(authorDiscordId))
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();

  const colorMap = {
    tea: 0xf43f5e,
    kvk: 0xf59e0b,
    council: 0xa855f7,
    confession: 0x38bdf8,
  };

  return {
    whisperId: `WHISPER-${whisperNum}`,
    zeroTraceHash,
    embed: {
      title: `🎭 SOVEREIGN WHISPER #${whisperNum} // [${category.toUpperCase()}]`,
      description: `> "${String(message).trim().slice(0, 1800)}"`,
      color: colorMap[category] || 0xa855f7,
      fields: [
        { name: '🌍 Sector / Kingdom', value: String(targetKingdom || 'Uncensored Global'), inline: true },
        { name: '🕵️ Identity Trace', value: '`REDACTED (Zero-Trace)`', inline: true },
        { name: '🛡️ Anti-Spam Sig', value: `\`SIG-${zeroTraceHash}\``, inline: true },
      ],
      footer: {
        text: 'HERMES UNCENSORED SANCTUARY // CLICK [🎭 Post Anonymous Whisper] TO REPLY ANONYMOUSLY',
      },
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Formats an Automated Ticket Header Embed with Pre-Loaded AEGIS Governor Telemetry
 */
export function buildTicketHeaderEmbed({
  ticketType = 'migrant',
  discordUsername = 'Governor',
  discordId = '',
  governorStats = null,
}) {
  const typeMeta = {
    migrant: {
      title: '🧳 MIGRATION APPLICATION & AEGIS DOSSIER',
      color: 0x10b981,
      intro: 'Welcome to the Migration Screening Desk. **🪽 HERMES** has automatically attached your live `Unity2AWSRoster` telemetry below for R4/R5 High Council review.',
    },
    mge: {
      title: '👑 MGE / HALL OF HEROES APPLICATION',
      color: 0xf59e0b,
      intro: 'Please state which Commander you are applying for, your current sculpture count, and drop a screenshot of your equipment & speedups below.',
    },
    onboard: {
      title: '🏰 1-CLICK KINGDOM DISCORD & VALHEON ONBOARDING',
      color: 0x38bdf8,
      intro: 'Welcome R4/R5 Leader! Provide your **Kingdom Number** and **Discord Server ID** below to link your Kingdom telemetry or run a 1-Click HERMES Discord Server build.',
    },
    aegis: {
      title: '🛡️ AEGIS POLYGRAPH & FORENSIC AUDIT REQUEST',
      color: 0xa855f7,
      intro: 'Provide the **Governor ID(s)** or **Kingdom Number** you need audited for alt-correlation, deadweight pruning, or migrant screening.',
    },
    court: {
      title: '⚖️ KING\'S COURT & DIPLOMACY TICKET',
      color: 0xf43f5e,
      intro: 'Please share coordinates, battle report screenshots, and a brief summary for the High Council.',
    },
    support: {
      title: '🛠️ VALHEON TECHNICAL SUPPORT DESK',
      color: 0x06b6d4,
      intro: 'Describe your question or bug report below. Our engineering team will review it shortly.',
    },
  };

  const meta = typeMeta[ticketType] || typeMeta.support;
  const fields = [
    { name: '👤 Applicant', value: `<@${discordId}> (\`${discordUsername}\`)`, inline: true },
    { name: '📂 Ticket Queue', value: `\`${ticketType.toUpperCase()}\``, inline: true },
  ];

  if (governorStats) {
    const roastEval = generateGovernorRoast(governorStats);
    fields.push(
      {
        name: '🆔 Linked RoK Governor',
        value: `**${roastEval.name}** (\`#${roastEval.id}\`)`,
        inline: true,
      },
      {
        name: '⚡ Power / KP / Deads',
        value: `**${(roastEval.power / 1e6).toFixed(1)}M** PWR • **${(roastEval.kp / 1e9).toFixed(2)}B** KP • **${(roastEval.deads / 1e6).toFixed(1)}M** Deads`,
        inline: false,
      },
      {
        name: '🛡️ AEGIS 5-Model Pre-Screen',
        value: `Trust Score: **${roastEval.trustScore}/100** — \`${roastEval.tier}\``,
        inline: false,
      }
    );
  } else {
    fields.push({
      name: '🔗 Telemetry Status',
      value: 'No linked Governor ID found yet. Run `/bind <governor_id>` inside this ticket to attach your live stats automatically!',
      inline: false,
    });
  }

  return {
    embed: {
      title: meta.title,
      description: meta.intro,
      color: meta.color,
      fields,
      footer: { text: 'HERMES CONCIERGE // CLICK [🔒 Close & Archive] WHEN RESOLVED' },
      timestamp: new Date().toISOString(),
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: '✅ Approve & Grant Verified Role',
            custom_id: `hermes_ticket_approve_${discordId}`,
          },
          {
            type: 2,
            style: 2,
            label: '🛡️ Run Deep AEGIS Polygraph',
            custom_id: `hermes_ticket_polygraph_${discordId}`,
          },
          {
            type: 2,
            style: 4,
            label: '🔒 Close & Archive Ticket',
            custom_id: 'hermes_ticket_close',
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5, // LINK BUTTON
            label: '🤖 Step 1: Invite HERMES to Your Blank Server',
            url: 'https://discord.com/oauth2/authorize?client_id=1563619930371391680&permissions=8&scope=bot%20applications.commands',
          },
          {
            type: 2,
            style: 1, // PRIMARY BUTTON
            label: '🪽 Step 2: Launch 1-Click Kingdom Server Builder',
            custom_id: 'hermes_launch_kd_modal',
          },
        ],
      },
    ],
  };
}

export { provisionDiscordServer };
