/**
 * ============================================================================
 * PROJECT HERMES — 1-CLICK DISCORD SERVER PROVISIONER (REST API v10)
 * ============================================================================
 * Idempotent Discord Guild Architect supporting:
 *   - Dry-Run Simulation & Blueprint Auditing (zero network mutation)
 *   - Live Discord REST v10 Provisioning (Roles, Categories, Channels,
 *     Cryptographic Permission Overwrites, Pinned Interactive Consoles)
 *   - Automatic Rate-Limit Backoff & Existing-Channel Deduplication
 * ============================================================================
 */

import {
  CHANNEL_TYPES,
  PINNED_CONSOLE_TEMPLATES,
  getBlueprintByType,
} from './blueprints.js';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

const PERMS = {
  ADMINISTRATOR: (1n << 3n).toString(),
  MANAGE_CHANNELS: (1n << 4n).toString(),
  MANAGE_GUILD: (1n << 5n).toString(),
  ADD_REACTIONS: (1n << 6n).toString(),
  VIEW_CHANNEL: (1n << 10n).toString(),
  SEND_MESSAGES: (1n << 11n).toString(),
  MANAGE_MESSAGES: (1n << 13n).toString(),
  EMBED_LINKS: (1n << 14n).toString(),
  ATTACH_FILES: (1n << 15n).toString(),
  READ_MESSAGE_HISTORY: (1n << 16n).toString(),
  CONNECT: (1n << 20n).toString(),
  SPEAK: (1n << 21n).toString(),
  USE_APPLICATION_COMMANDS: (1n << 31n).toString(),
  // KING_R5_COMMAND: Full war-room, ping (@everyone), voice mute/move, & message/thread control
  // WITHOUT ADMINISTRATOR (1<<3), MANAGE_CHANNELS (1<<4), MANAGE_GUILD (1<<5 - Server Template!), or MANAGE_ROLES (1<<28).
  // The true Discord Server Creator (guild.owner_id) keeps native Owner powers automatically, while co-R5s & R4s CANNOT export Server Templates or delete channels!
  KING_R5_COMMAND: (
    (1n << 6n) |
    (1n << 10n) |
    (1n << 11n) |
    (1n << 13n) |
    (1n << 14n) |
    (1n << 15n) |
    (1n << 16n) |
    (1n << 17n) |
    (1n << 20n) |
    (1n << 21n) |
    (1n << 22n) |
    (1n << 24n) |
    (1n << 27n) |
    (1n << 31n) |
    (1n << 35n) |
    (1n << 36n) |
    (1n << 40n)
  ).toString(),
  MODERATE_MEMBERS: (
    (1n << 10n) |
    (1n << 11n) |
    (1n << 13n) |
    (1n << 16n) |
    (1n << 40n)
  ).toString(),
  STANDARD: (
    (1n << 6n) |
    (1n << 10n) |
    (1n << 11n) |
    (1n << 14n) |
    (1n << 15n) |
    (1n << 16n) |
    (1n << 20n) |
    (1n << 21n) |
    (1n << 31n)
  ).toString(),
};

const BUTTON_STYLES = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Rate-limit aware Discord REST v10 caller
 */
async function discordRequest(botToken, method, endpoint, body = null) {
  const url = `${DISCORD_API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'ValheonHermesArchitect/3.0',
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      const retryData = await res.json().catch(() => ({}));
      const waitMs = Math.ceil((retryData.retry_after || 1.5) * 1000) + 250;
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(
        `Discord API ${method} ${endpoint} failed (${res.status}): ${errText}`
      );
    }

    if (res.status === 204) return null;
    return await res.json();
  }

  throw new Error(`Discord API rate-limit retries exhausted for ${endpoint}`);
}

/**
 * Computes Discord permission_overwrites array for a category or channel
 */
function buildPermissionOverwrites(accessMode, guildId, roleIdByKey, chDef = null) {
  const everyoneId = guildId;
  const overwrites = [];

  const leaderRoleIds = [
    roleIdByKey.founder,
    roleIdByKey.king,
    roleIdByKey.leader,
    roleIdByKey.council,
    roleIdByKey.r4_council,
    roleIdByKey.r4_leadership,
    roleIdByKey.hermes,
  ].filter(Boolean);

  const citizenRoleIds = [
    roleIdByKey.citizen,
    roleIdByKey.verified_gov,
    roleIdByKey.verified_king,
    roleIdByKey.verified_officer,
    roleIdByKey.verified_jumper,
  ].filter(Boolean);

  const sovereignOnlyRoleIds = [
    roleIdByKey.founder,
    roleIdByKey.king,
    roleIdByKey.leader,
    roleIdByKey.hermes,
  ].filter(Boolean);

  const r4RoleIds = [
    roleIdByKey.r4_council,
    roleIdByKey.r4_leadership,
    roleIdByKey.council,
  ].filter(Boolean);

  if (accessMode === 'OWNER_AND_R5_ONLY' || accessMode === 'KINGS_ONLY') {
    overwrites.push({
      id: everyoneId,
      type: 0,
      allow: '0',
      deny: PERMS.VIEW_CHANNEL,
    });
    for (const r4Id of r4RoleIds) {
      overwrites.push({
        id: r4Id,
        type: 0,
        allow: '0',
        deny: PERMS.VIEW_CHANNEL,
      });
    }
    for (const rId of sovereignOnlyRoleIds) {
      overwrites.push({
        id: rId,
        type: 0,
        allow: (
          BigInt(PERMS.VIEW_CHANNEL) |
          BigInt(PERMS.SEND_MESSAGES) |
          BigInt(PERMS.READ_MESSAGE_HISTORY) |
          BigInt(PERMS.USE_APPLICATION_COMMANDS) |
          BigInt(PERMS.CONNECT) |
          BigInt(PERMS.SPEAK)
        ).toString(),
        deny: '0',
      });
    }
  } else if (accessMode === 'PUBLIC_SCREENSHOT_VERIFY') {
    overwrites.push({
      id: everyoneId,
      type: 0,
      allow: (
        BigInt(PERMS.VIEW_CHANNEL) |
        BigInt(PERMS.SEND_MESSAGES) |
        BigInt(PERMS.ATTACH_FILES) |
        BigInt(PERMS.READ_MESSAGE_HISTORY) |
        BigInt(PERMS.USE_APPLICATION_COMMANDS)
      ).toString(),
      deny: (
        BigInt(PERMS.ADD_REACTIONS) |
        (1n << 35n) | // CREATE_PUBLIC_THREADS
        (1n << 36n)   // CREATE_PRIVATE_THREADS
      ).toString(),
    });
    for (const rId of leaderRoleIds) {
      overwrites.push({
        id: rId,
        type: 0,
        allow: (
          BigInt(PERMS.VIEW_CHANNEL) |
          BigInt(PERMS.SEND_MESSAGES) |
          BigInt(PERMS.ATTACH_FILES) |
          BigInt(PERMS.MANAGE_MESSAGES)
        ).toString(),
        deny: '0',
      });
    }
  } else if (accessMode === 'PUBLIC_READ_ONLY' || accessMode === 'PUBLIC_BUTTON_ONLY') {
    overwrites.push({
      id: everyoneId,
      type: 0,
      allow: (
        BigInt(PERMS.VIEW_CHANNEL) |
        BigInt(PERMS.READ_MESSAGE_HISTORY) |
        BigInt(PERMS.USE_APPLICATION_COMMANDS)
      ).toString(),
      deny: (
        BigInt(PERMS.SEND_MESSAGES) |
        BigInt(PERMS.ADD_REACTIONS) |
        (1n << 35n) | // CREATE_PUBLIC_THREADS
        (1n << 36n)   // CREATE_PRIVATE_THREADS
      ).toString(),
    });
    for (const rId of leaderRoleIds) {
      overwrites.push({
        id: rId,
        type: 0,
        allow: (
          BigInt(PERMS.VIEW_CHANNEL) |
          BigInt(PERMS.SEND_MESSAGES) |
          BigInt(PERMS.MANAGE_MESSAGES)
        ).toString(),
        deny: '0',
      });
    }
  } else if (accessMode === 'LEADERS_ONLY' || accessMode === 'STAFF_ONLY') {
    overwrites.push({
      id: everyoneId,
      type: 0,
      allow: '0',
      deny: PERMS.VIEW_CHANNEL,
    });
    for (const rId of leaderRoleIds) {
      overwrites.push({
        id: rId,
        type: 0,
        allow: (
          BigInt(PERMS.VIEW_CHANNEL) |
          BigInt(PERMS.SEND_MESSAGES) |
          BigInt(PERMS.READ_MESSAGE_HISTORY) |
          BigInt(PERMS.CONNECT) |
          BigInt(PERMS.SPEAK)
        ).toString(),
        deny: '0',
      });
    }
  } else if (accessMode === 'ALLIANCE_ONLY') {
    overwrites.push({
      id: everyoneId,
      type: 0,
      allow: '0',
      deny: PERMS.VIEW_CHANNEL,
    });
    const specificAllianceRoleId = chDef?.allianceRoleKey
      ? roleIdByKey[chDef.allianceRoleKey]
      : null;
    const allowedIds = [
      ...(specificAllianceRoleId ? [specificAllianceRoleId] : citizenRoleIds),
      ...leaderRoleIds,
    ].filter(Boolean);
    for (const rId of new Set(allowedIds)) {
      overwrites.push({
        id: rId,
        type: 0,
        allow: (
          BigInt(PERMS.VIEW_CHANNEL) |
          BigInt(PERMS.SEND_MESSAGES) |
          BigInt(PERMS.READ_MESSAGE_HISTORY) |
          BigInt(PERMS.CONNECT) |
          BigInt(PERMS.SPEAK)
        ).toString(),
        deny: '0',
      });
    }
  } else {
    // Default / CITIZENS_ONLY / CITIZENS_READ_ONLY / CITIZENS_BUTTON_ONLY / PUBLIC_INTERACTIVE:
    // Strictly hide from unverified @everyone!
    const isReadOnlyOrButton =
      accessMode === 'CITIZENS_READ_ONLY' || accessMode === 'CITIZENS_BUTTON_ONLY';
    overwrites.push({
      id: everyoneId,
      type: 0,
      allow: '0',
      deny: PERMS.VIEW_CHANNEL,
    });
    for (const rId of new Set([...citizenRoleIds, ...leaderRoleIds])) {
      overwrites.push({
        id: rId,
        type: 0,
        allow: isReadOnlyOrButton
          ? (
              BigInt(PERMS.VIEW_CHANNEL) |
              BigInt(PERMS.READ_MESSAGE_HISTORY) |
              BigInt(PERMS.USE_APPLICATION_COMMANDS)
            ).toString()
          : (
              BigInt(PERMS.VIEW_CHANNEL) |
              BigInt(PERMS.SEND_MESSAGES) |
              BigInt(PERMS.READ_MESSAGE_HISTORY) |
              BigInt(PERMS.USE_APPLICATION_COMMANDS) |
              BigInt(PERMS.CONNECT) |
              BigInt(PERMS.SPEAK)
            ).toString(),
        deny: isReadOnlyOrButton ? PERMS.SEND_MESSAGES : '0',
      });
    }
    for (const rId of leaderRoleIds) {
      overwrites.push({
        id: rId,
        type: 0,
        allow: (
          BigInt(PERMS.VIEW_CHANNEL) |
          BigInt(PERMS.SEND_MESSAGES) |
          BigInt(PERMS.MANAGE_MESSAGES) |
          BigInt(PERMS.READ_MESSAGE_HISTORY)
        ).toString(),
        deny: '0',
      });
    }
  }

  return overwrites;
}

/**
 * Builds the Discord message payload (Embed + ActionRow Buttons) for a pinKey
 */
export function buildConsolePayload(pinKey, blueprint) {
  const tpl = PINNED_CONSOLE_TEMPLATES[pinKey];
  if (!tpl) {
    return {
      embeds: [
        {
          title: `🪽 ${blueprint.name}`,
          description: `Channel initialized by **HERMES Sovereign Discord Architect**.`,
          color: 0xf59e0b,
          footer: { text: 'VALHEON COMMAND OS // HERMES v3.0' },
        },
      ],
    };
  }

  const payload = {
    embeds: [
      {
        ...tpl.embed,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  if (Array.isArray(tpl.buttonRows) && tpl.buttonRows.length > 0) {
    payload.components = tpl.buttonRows.slice(0, 5).map((row) => ({
      type: 1,
      components: row.slice(0, 5).map((btn) =>
        btn.style === 'LINK' && btn.url
          ? {
              type: 2,
              style: BUTTON_STYLES.LINK,
              label: btn.label,
              url: btn.url,
            }
          : {
              type: 2,
              style: BUTTON_STYLES[btn.style] || 1,
              label: btn.label,
              custom_id: btn.customId,
            }
      ),
    }));
  } else if (Array.isArray(tpl.buttons) && tpl.buttons.length > 0) {
    payload.components = [
      {
        type: 1,
        components: tpl.buttons.slice(0, 5).map((btn) =>
          btn.style === 'LINK' && btn.url
            ? {
                type: 2,
                style: BUTTON_STYLES.LINK,
                label: btn.label,
                url: btn.url,
              }
            : {
                type: 2,
                style: BUTTON_STYLES[btn.style] || 1,
                label: btn.label,
                custom_id: btn.customId,
              }
        ),
      },
    ];
  }

  return payload;
}

/**
 * Main Provisioning Function
 */
export async function provisionDiscordServer({
  blueprintType = 'VALHEON_HQ',
  guildId = '',
  botToken = '',
  dryRun = true,
  options = {},
}) {
  const blueprint = getBlueprintByType(blueprintType, options);

  const totalChannels = blueprint.categories.reduce(
    (sum, cat) => sum + cat.channels.length,
    0
  );
  const totalPinnedConsoles = blueprint.categories.reduce(
    (sum, cat) => sum + cat.channels.filter((c) => Boolean(c.pinKey)).length,
    0
  );

  if (dryRun) {
    const executionSteps = [];
    let stepOrder = 1;

    for (const r of blueprint.roles) {
      executionSteps.push({
        step: stepOrder++,
        phase: 'ROLE_PROVISION',
        action: `POST /guilds/{guildId}/roles`,
        target: r.name,
        details: `Color: #${r.color.toString(16).padStart(6, '0')} | Hoist: ${r.hoist} | Perms: ${r.permissions}`,
      });
    }

    for (const cat of blueprint.categories) {
      executionSteps.push({
        step: stepOrder++,
        phase: 'CATEGORY_CREATE',
        action: `POST /guilds/{guildId}/channels (type=4)`,
        target: cat.name,
        details: `Access Policy: ${cat.access}`,
      });

      for (const ch of cat.channels) {
        executionSteps.push({
          step: stepOrder++,
          phase: 'CHANNEL_CREATE',
          action: `POST /guilds/{guildId}/channels (type=${ch.type})`,
          target: `#${ch.name}`,
          details: `${ch.topic || 'Voice / Stage Channel'}${ch.pinKey ? ` + Pin [${ch.pinKey}]` : ''}`,
        });
      }
    }

    return {
      ok: true,
      mode: 'DRY_RUN_PREVIEW',
      blueprint,
      summary: {
        blueprintId: blueprint.id,
        serverName: blueprint.name,
        rolesCount: blueprint.roles.length,
        categoriesCount: blueprint.categories.length,
        channelsCount: totalChannels,
        pinnedConsolesCount: totalPinnedConsoles,
        estimatedDeploySeconds: Math.ceil(
          (blueprint.roles.length + blueprint.categories.length + totalChannels) * 0.35
        ),
      },
      executionSteps,
    };
  }

  const cleanGuildId = String(guildId || '').trim();
  const cleanToken = String(botToken || '')
    .replace(/['"]/g, '')
    .trim();

  if (!cleanGuildId || !/^\d{15,22}$/.test(cleanGuildId)) {
    throw new Error('Valid 17-20 digit Discord Guild ID is required for live provisioning.');
  }
  if (!cleanToken) {
    throw new Error('DISCORD_TOKEN is required for live server provisioning.');
  }

  const log = [];
  const roleIdByKey = {};
  let notificationChannelId = null;

  const guildInfo = await discordRequest(cleanToken, 'GET', `/guilds/${cleanGuildId}`);
  log.push(`Connected to Guild: ${guildInfo.name} (${cleanGuildId})`);

  const existingRoles = await discordRequest(
    cleanToken,
    'GET',
    `/guilds/${cleanGuildId}/roles`
  );
  const existingChannels = await discordRequest(
    cleanToken,
    'GET',
    `/guilds/${cleanGuildId}/channels`
  );

  const usedRoleIds = new Set();
  for (const ch of existingChannels) {
    for (const ow of ch.permission_overwrites || []) {
      if (ow.type === 0) usedRoleIds.add(ow.id);
    }
  }

  for (const roleDef of blueprint.roles) {
    const desiredPerms = PERMS[roleDef.permissions] || PERMS.STANDARD;
    const matches = existingRoles.filter(
      (er) => !er.managed && er.name.toLowerCase() === roleDef.name.toLowerCase()
    );
    if (matches.length > 0) {
      matches.sort((a, b) => (usedRoleIds.has(b.id) ? 1 : 0) - (usedRoleIds.has(a.id) ? 1 : 0));
      const found = matches[0];
      roleIdByKey[roleDef.key] = found.id;

      // Auto-prune any duplicate role copies with the same name
      for (const dupRole of matches.slice(1)) {
        await discordRequest(cleanToken, 'DELETE', `/guilds/${cleanGuildId}/roles/${dupRole.id}`).catch(() => {});
        log.push(`[Duplicate Role Pruned] ${dupRole.name} (${dupRole.id})`);
        await sleep(180);
      }

      // Harden existing roles (strip MANAGE_GUILD / ADMINISTRATOR from R4 and shared R5 roles so no R4 can export a Server Template!)
      if (
        roleDef.permissions !== 'ADMINISTRATOR' &&
        found.permissions &&
        found.permissions !== desiredPerms
      ) {
        await discordRequest(
          cleanToken,
          'PATCH',
          `/guilds/${cleanGuildId}/roles/${found.id}`,
          { permissions: desiredPerms }
        ).catch(() => {});
        log.push(`[Role Hardened] ${roleDef.name} (${found.id}) — Template & Channel Delete Locked`);
      } else {
        log.push(`[Role Exists] ${roleDef.name} (${found.id})`);
      }
      continue;
    }

    const createdRole = await discordRequest(
      cleanToken,
      'POST',
      `/guilds/${cleanGuildId}/roles`,
      {
        name: roleDef.name,
        color: roleDef.color,
        hoist: Boolean(roleDef.hoist),
        mentionable: Boolean(roleDef.mentionable),
        permissions: desiredPerms,
      }
    );
    roleIdByKey[roleDef.key] = createdRole.id;
    log.push(`[Role Created] ${roleDef.name} (${createdRole.id})`);
    await sleep(220);
  }

  // Active Anti-Template Shield: Purge any Discord native Server Templates so nobody can clone the server!
  try {
    const existingTemplates = await discordRequest(
      cleanToken,
      'GET',
      `/guilds/${cleanGuildId}/templates`
    );
    if (Array.isArray(existingTemplates) && existingTemplates.length > 0) {
      for (const tpl of existingTemplates) {
        if (tpl?.code) {
          await discordRequest(
            cleanToken,
            'DELETE',
            `/guilds/${cleanGuildId}/templates/${tpl.code}`
          ).catch(() => {});
          log.push(`[Anti-Template Shield] Revoked Discord Server Template (${tpl.code})`);
        }
      }
    }
  } catch {
    // Ignore if no template exists or endpoint restricted
  }

  for (const catDef of blueprint.categories) {
    let categoryChannel = existingChannels.find(
      (c) =>
        c.type === CHANNEL_TYPES.CATEGORY &&
        c.name.toLowerCase() === catDef.name.toLowerCase()
    );

    const catOverwrites = buildPermissionOverwrites(
      catDef.access,
      cleanGuildId,
      roleIdByKey
    );

    if (!categoryChannel) {
      categoryChannel = await discordRequest(
        cleanToken,
        'POST',
        `/guilds/${cleanGuildId}/channels`,
        {
          name: catDef.name,
          type: CHANNEL_TYPES.CATEGORY,
          permission_overwrites: catOverwrites,
        }
      );
      log.push(`[Category Created] ${catDef.name}`);
      await sleep(220);
    } else {
      await discordRequest(
        cleanToken,
        'PATCH',
        `/channels/${categoryChannel.id}`,
        { permission_overwrites: catOverwrites }
      ).catch(() => {});
      log.push(`[Category Hardened] ${catDef.name}`);
    }

    for (const chDef of catDef.channels) {
      let channelObj = existingChannels.find(
        (c) =>
          c.parent_id === categoryChannel.id &&
          c.name.toLowerCase() === chDef.name.toLowerCase()
      );

      const chOverwrites = buildPermissionOverwrites(
        chDef.access || catDef.access,
        cleanGuildId,
        roleIdByKey,
        chDef
      );

      if (!channelObj) {
        const isCommunity = Boolean(guildInfo.features?.includes('COMMUNITY'));
        let resolvedType = chDef.type;
        if (!isCommunity && chDef.type === CHANNEL_TYPES.ANNOUNCEMENT) {
          resolvedType = CHANNEL_TYPES.TEXT;
        } else if (!isCommunity && chDef.type === CHANNEL_TYPES.STAGE) {
          resolvedType = CHANNEL_TYPES.VOICE;
        }

        const createBody = {
          name: chDef.name,
          type: resolvedType,
          parent_id: categoryChannel.id,
          permission_overwrites: chOverwrites,
        };
        if (chDef.topic && createBody.type === CHANNEL_TYPES.TEXT) {
          createBody.topic = chDef.topic;
        }

        channelObj = await discordRequest(
          cleanToken,
          'POST',
          `/guilds/${cleanGuildId}/channels`,
          createBody
        );
        log.push(`[Channel Created] #${chDef.name} (${channelObj.id})`);
        await sleep(250);

        if (chDef.pinKey && createBody.type === CHANNEL_TYPES.TEXT) {
          try {
            const payload = buildConsolePayload(chDef.pinKey, blueprint);
            const msg = await discordRequest(
              cleanToken,
              'POST',
              `/channels/${channelObj.id}/messages`,
              payload
            );
            if (msg?.id) {
              await discordRequest(
                cleanToken,
                'PUT',
                `/channels/${channelObj.id}/pins/${msg.id}`
              ).catch(() => {});
            }
            log.push(`  ↳ Pinned Interactive Console [${chDef.pinKey}] in #${chDef.name}`);
            await sleep(250);
          } catch (pinErr) {
            log.push(`  ↳ Warning: Could not post console in #${chDef.name}: ${pinErr.message}`);
          }
        }
      } else {
        const patchBody = { permission_overwrites: chOverwrites };
        if (chDef.topic && channelObj.type === CHANNEL_TYPES.TEXT) {
          patchBody.topic = chDef.topic;
        }
        await discordRequest(
          cleanToken,
          'PATCH',
          `/channels/${channelObj.id}`,
          patchBody
        ).catch(() => {});
        log.push(`[Channel Hardened] #${chDef.name} (${channelObj.id}) — Access: ${chDef.access || catDef.access}`);
        await sleep(120);

        if (chDef.pinKey && channelObj.type === CHANNEL_TYPES.TEXT && options.refreshConsoles !== false) {
          try {
            const payload = buildConsolePayload(chDef.pinKey, blueprint);
            const recentMsgs = await discordRequest(
              cleanToken,
              'GET',
              `/channels/${channelObj.id}/messages?limit=15`
            ).catch(() => []);
            const botMsg = (Array.isArray(recentMsgs) ? recentMsgs : []).find(
              (m) => m.author?.bot && Array.isArray(m.embeds) && m.embeds.length > 0
            );
            if (botMsg?.id) {
              await discordRequest(
                cleanToken,
                'PATCH',
                `/channels/${channelObj.id}/messages/${botMsg.id}`,
                payload
              );
              log.push(`  ↳ Refreshed Pinned Console [${chDef.pinKey}] in #${chDef.name}`);
            } else {
              const msg = await discordRequest(
                cleanToken,
                'POST',
                `/channels/${channelObj.id}/messages`,
                payload
              );
              if (msg?.id) {
                await discordRequest(
                  cleanToken,
                  'PUT',
                  `/channels/${channelObj.id}/pins/${msg.id}`
                ).catch(() => {});
              }
              log.push(`  ↳ Posted & Pinned Console [${chDef.pinKey}] in #${chDef.name}`);
            }
            await sleep(200);
          } catch (refreshErr) {
            log.push(`  ↳ Warning: Could not refresh console in #${chDef.name}: ${refreshErr.message}`);
          }
        }
      }

      if (
        chDef.name.includes('event-and-pass-alerts') ||
        chDef.name.includes('announcements')
      ) {
        notificationChannelId = channelObj.id;
      }
    }
  }

  // Clean up default Discord blank-server starter channels ("Text Channels", "Voice Channels", "general", "delete-chat-after-testing")
  const starterBloatNames = new Set([
    'text channels',
    'voice channels',
    'general',
    'delete-chat-after-testing',
  ]);
  for (const ch of existingChannels) {
    const lowerName = String(ch.name || '').trim().toLowerCase();
    if (starterBloatNames.has(lowerName)) {
      await discordRequest(cleanToken, 'DELETE', `/channels/${ch.id}`).catch(() => {});
      log.push(`[Starter Bloat Pruned] Removed default channel "${ch.name}" (${ch.id})`);
      await sleep(150);
    }
  }

  return {
    ok: true,
    mode: 'LIVE_PROVISIONED',
    guildId: cleanGuildId,
    guildName: guildInfo.name,
    notificationChannelId,
    roleIdByKey,
    log,
  };
}
