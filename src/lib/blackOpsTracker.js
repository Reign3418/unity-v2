import fs from 'fs';
import os from 'os';
import path from 'path';
import { notifyAdmin } from './notifyAdmin.js';
import { getGlobalConfig, updateGlobalConfig } from './awsDynamo.js';

const LOCAL_WATCHLIST_PATH = path.join(process.cwd(), 'src', 'data', 'black_ops_watchlist.json');
const TMP_WATCHLIST_PATH = path.join(os.tmpdir(), 'black_ops_watchlist.json');
const DYNAMO_CONFIG_KEY = 'BLACK_OPS_WATCHLIST';
const BASTION_STATE_PATH = path.join(process.cwd(), 'scanner', 'bastion_state.json');
const CLUSTER_HUB_URL = 'http://127.0.0.1:8888';

if (!globalThis.__blackOpsWatchlistMemory) {
  globalThis.__blackOpsWatchlistMemory = null;
}

const DEFAULT_WATCHLIST = () => ({
  targets: {},
  alertHistory: [],
  bastionRingEvents: [],
  webhookUrl: null,
  emailAlerts: true,
  pushAlerts: true,
});

/**
 * Reads and updates the Bastion MoE Ring State (Local + AWS DynamoDB BASTION_CLOUD_STATE)
 * so Ring 1 (SCOUT), Ring 2 (TANK/CIPHER/NUMNUM/FORGE), and Ring 3 (DOZER/BASTION AUDIT)
 * stay synchronized with Black Ops Target Locks.
 */
export async function syncWithBastionMoERing({
  agent = 'SCOUT + BASTION AUDIT',
  ring = 'RING 1 -> RING 3',
  model = 'NUMNUM_DETERMINISTIC_V2 (0 Tokens)',
  action = 'BLACK_OPS_SYNC',
  kingdom = '4194',
  detail = '',
  surgeCadenceHours = 1,
  lockedTargetsCount = 0,
}) {
  try {
    let state = null;
    try {
      const cloudRaw = await getGlobalConfig('BASTION_CLOUD_STATE');
      if (cloudRaw) state = JSON.parse(cloudRaw);
    } catch {}

    if (!state) {
      try {
        if (fs.existsSync(BASTION_STATE_PATH)) {
          state = JSON.parse(fs.readFileSync(BASTION_STATE_PATH, 'utf8'));
        }
      } catch {}
    }

    if (!state || typeof state !== 'object') {
      state = {
        systemStatus: 'HEALTHY',
        autopilotEnabled: true,
        kingdomSchedules: [],
        activityLog: [],
      };
    }

    const nowIso = new Date().toISOString();

    // 1. RING 1 (SCOUT): Automatically escalate Kingdom Schedule to SURGE mode when Black Ops targets are locked
    if (!Array.isArray(state.kingdomSchedules)) state.kingdomSchedules = [];
    const kdIdx = state.kingdomSchedules.findIndex((s) => String(s.kingdom) === String(kingdom));
    if (kdIdx >= 0) {
      state.kingdomSchedules[kdIdx] = {
        ...state.kingdomSchedules[kdIdx],
        mode: lockedTargetsCount > 0 ? 'BLACK_OPS_SURGE' : state.kingdomSchedules[kdIdx].mode || 'STEADY',
        cadenceHours: lockedTargetsCount > 0 ? surgeCadenceHours : 12,
        blackOpsLockedTargets: lockedTargetsCount,
        assignedAgents: ['SCOUT', 'TANK', 'CIPHER', 'NUMNUM', 'FORGE', 'DOZER'],
        lastBlackOpsSync: nowIso,
      };
    } else {
      state.kingdomSchedules.unshift({
        kingdom: Number(kingdom) || 4194,
        tier: 'TIER 1 · BLACK OPS PRIORITY',
        mode: lockedTargetsCount > 0 ? 'BLACK_OPS_SURGE' : 'STEADY',
        cadenceHours: lockedTargetsCount > 0 ? surgeCadenceHours : 12,
        blackOpsLockedTargets: lockedTargetsCount,
        assignedAgents: ['SCOUT', 'TANK', 'CIPHER', 'NUMNUM', 'FORGE', 'DOZER'],
        status: 'ACTIVE_MONITORING',
        lastBlackOpsSync: nowIso,
      });
    }

    // 2. RING 3 (BASTION AUDIT): Append entry to Bastion Activity Ledger
    const evt = {
      id: `bops-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowIso,
      agent,
      ring,
      model,
      action,
      kingdom: String(kingdom),
      detail,
    };
    state.activityLog = [evt, ...(state.activityLog || [])].slice(0, 80);
    state.lastUpdated = nowIso;

    try {
      await updateGlobalConfig('BASTION_CLOUD_STATE', JSON.stringify(state));
    } catch {}
    try {
      fs.writeFileSync(BASTION_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    } catch {}

    return { synced: true, event: evt, cadenceMode: lockedTargetsCount > 0 ? 'BLACK_OPS_SURGE (1h)' : 'STEADY' };
  } catch (e) {
    console.warn('[BlackOps->Bastion] Sync warning:', e.message);
    return { synced: false, error: e.message };
  }
}

/**
 * Commands Ring 2 (TANK + CIPHER + NUMNUM) to execute an immediate pinpoint telemetry sweep
 * on SIDEKICK (127.0.0.1:16384) via the Bastion Cloud Bus & LAN Cluster Hub.
 */
export async function dispatchBastionPinpointRecon(target = {}) {
  const govId = target.govId || target.id || 235824876;
  const name = target.name || `Governor_${govId}`;
  const kingdom = target.kingdom || '4194';
  const targetRank = Number(target.currentRank || target.liveTelemetry?.rank || 1);
  const startRank = Math.max(1, targetRank - 5);
  const endRank = Math.min(650, targetRank + 15);

  const psCommand = `Start-Process python -ArgumentList 'C:\\UnityScanner\\unity_autonomous_scanner.py --adb 127.0.0.1:16384 --kd ${kingdom} --mode kingdom-scan --start-rank ${startRank} --end-rank ${endRank} --skip-switch' -WindowStyle Hidden`;
  const cmdId = `bops-recon-${Date.now()}`;
  const scanProgressPayload = {
    running: true,
    status: 'BLACK_OPS_PINPOINT_RECON',
    kingdom: String(kingdom),
    currentRank: startRank,
    targetRanks: endRank,
    percent: 0,
    lastGovernorName: name,
    workerSerial: '127.0.0.1:16384',
    instanceId: 'sidekick-mumu-0',
    updatedAt: new Date().toISOString(),
  };

  let directLanOk = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${CLUSTER_HUB_URL}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cmdId, command: psCommand, cmd: psCommand, async: true }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) directLanOk = true;
  } catch {}

  try {
    await updateGlobalConfig(
      'BASTION_CLOUD_CMD',
      JSON.stringify({
        cmdId,
        command: psCommand,
        scanProgress: scanProgressPayload,
        dispatchedViaLan: directLanOk,
        pickedUpByCloudAgent: false,
        queuedAt: new Date().toISOString(),
      })
    );
  } catch {}

  const bastionSync = await syncWithBastionMoERing({
    agent: 'TANK + CIPHER (NUMNUM PASS)',
    ring: 'RING 2 (DISPATCH)',
    model: 'NUMNUM_DETERMINISTIC_V2 + RAM_DUMP',
    action: 'BLACK_OPS_PINPOINT_RECON',
    kingdom,
    detail: `NUMNUM Gate PASS (0 Tokens): Dispatched TANK & CIPHER on sidekick-mumu-0 (16384) for pinpoint Rank #${startRank}..#${endRank} sweep targeting [${target.lastKnownAlliance || 'None'}] ${name} (ID: ${govId}).`,
    surgeCadenceHours: 1,
    lockedTargetsCount: 1,
  });

  return {
    dispatched: true,
    cmdId,
    mode: directLanOk ? 'DIRECT_LAN_CLUSTER' : 'DYNAMO_CLOUD_BUS',
    rankWindow: `${startRank}..${endRank}`,
    bastionEvent: bastionSync.event,
  };
}

/**
 * Loads the active Black Ops Target Watchlist from DynamoDB, memory, /tmp, or local disk.
 */
export async function getWatchlist() {
  // 1. Try AWS DynamoDB first (persistent across Vercel serverless instances)
  try {
    if (process.env.AWS_TABLE_NAME) {
      const rawDynamo = await getGlobalConfig(DYNAMO_CONFIG_KEY);
      if (rawDynamo) {
        const parsed = JSON.parse(rawDynamo);
        if (parsed && typeof parsed === 'object') {
          globalThis.__blackOpsWatchlistMemory = {
            ...DEFAULT_WATCHLIST(),
            ...parsed,
            targets: parsed.targets || {},
            alertHistory: parsed.alertHistory || [],
            bastionRingEvents: parsed.bastionRingEvents || [],
          };
          return globalThis.__blackOpsWatchlistMemory;
        }
      }
    }
  } catch (e) {
    console.warn('[BlackOps] DynamoDB watchlist read fallback:', e.message);
  }

  // 2. Try warm memory cache
  if (globalThis.__blackOpsWatchlistMemory) {
    return globalThis.__blackOpsWatchlistMemory;
  }

  // 3. Try /tmp or local disk
  for (const filePath of [LOCAL_WATCHLIST_PATH, TMP_WATCHLIST_PATH]) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          globalThis.__blackOpsWatchlistMemory = {
            ...DEFAULT_WATCHLIST(),
            ...parsed,
            targets: parsed.targets || {},
            alertHistory: parsed.alertHistory || [],
            bastionRingEvents: parsed.bastionRingEvents || [],
          };
          return globalThis.__blackOpsWatchlistMemory;
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  }

  globalThis.__blackOpsWatchlistMemory = DEFAULT_WATCHLIST();
  return globalThis.__blackOpsWatchlistMemory;
}

/**
 * Saves the Black Ops Target Watchlist to DynamoDB, memory, /tmp, and local disk (if writable).
 */
export async function saveWatchlist(data) {
  const cleanData = {
    ...DEFAULT_WATCHLIST(),
    ...data,
    targets: data?.targets || {},
    alertHistory: data?.alertHistory || [],
    bastionRingEvents: (data?.bastionRingEvents || []).slice(0, 40),
    updatedAt: new Date().toISOString(),
  };

  // 1. Update warm memory cache immediately
  globalThis.__blackOpsWatchlistMemory = cleanData;

  const jsonStr = JSON.stringify(cleanData, null, 2);

  // 2. Persist to AWS DynamoDB (production persistence on Vercel)
  try {
    if (process.env.AWS_TABLE_NAME) {
      await updateGlobalConfig(DYNAMO_CONFIG_KEY, JSON.stringify(cleanData));
    }
  } catch (e) {
    console.warn('[BlackOps] DynamoDB save warning:', e.message);
  }

  // 3. Write to /tmp (always writable on Vercel Lambda)
  try {
    fs.writeFileSync(TMP_WATCHLIST_PATH, jsonStr, 'utf8');
  } catch (e) {}

  // 4. Write to local src/data if on local workstation (ignore EROFS on Vercel)
  try {
    const dir = path.dirname(LOCAL_WATCHLIST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_WATCHLIST_PATH, jsonStr, 'utf8');
  } catch (e) {}

  return true;
}

/**
 * Adds or updates a target governor in the tracking radar AND signals the Bastion MoE Ring.
 */
export async function addTrackedTarget({
  govId,
  name,
  kingdom = '4194',
  priority = 'VIP',
  notes = '',
  initialData = {},
}) {
  const list = await getWatchlist();
  const idStr = String(govId);

  const existing = list.targets[idStr] || {};
  const coords =
    initialData.castlePos ||
    (initialData.mapTileX && initialData.mapTileY
      ? { X: Number(initialData.mapTileX), Y: Number(initialData.mapTileY) }
      : existing.lastKnownCoords || null);

  const resolvedName = name || initialData.name || existing.name || `Governor_${govId}`;
  const resolvedAlliance = initialData.alliance || existing.lastKnownAlliance || 'None';
  const resolvedKingdom = String(kingdom || initialData.kingdomId || existing.kingdom || '4194');
  const resolvedPower = Number(initialData.power || existing.lastKnownPower || 0);

  list.targets[idStr] = {
    govId: Number(govId),
    id: idStr,
    name: resolvedName,
    kingdom: resolvedKingdom,
    priority: priority || existing.priority || 'VIP',
    notes: notes || existing.notes || '',
    addedAt: existing.addedAt || new Date().toISOString(),
    lastAlertAt: existing.lastAlertAt || null,
    lastKnownCoords: coords,
    lastKnownPower: resolvedPower,
    lastKnownAlliance: resolvedAlliance,
    lastKnownKp: Number(initialData.killPoints || existing.lastKnownKp || 0),
    lastKnownDeads: Number(initialData.dead || existing.lastKnownDeads || 0),
    initialSnapshot: initialData || existing.initialSnapshot || {},
    movementHistory: existing.movementHistory || [],
    deltas: existing.deltas || { power: 0, kp: 0, deads: 0, moved: false },
    bastionStatus: {
      ring1Scout: 'SURGE_1H_ARMED',
      ring2Tank: 'SIDEKICK_MUMU_0_LOCKED',
      ring2NumNum: 'PASS_0_TOKENS',
      ring3Dozer: 'SLICE_DELTA_WATCH',
    },
    active: true,
  };

  const totalLocked = Object.keys(list.targets).length;

  // Signal Bastion MoE Ring (SCOUT + NUMNUM + DOZER + BASTION AUDIT)
  const bastionRes = await syncWithBastionMoERing({
    agent: 'SCOUT + NUMNUM + DOZER',
    ring: 'RING 1 -> RING 2 -> RING 3',
    model: 'NUMNUM_DETERMINISTIC_V2 (0 Tokens)',
    action: 'BLACK_OPS_TARGET_LOCK',
    kingdom: resolvedKingdom,
    detail: `Black Ops Radar locked [${resolvedAlliance}] ${resolvedName} (ID: ${govId}, ${(resolvedPower / 1e6).toFixed(2)}M Pwr). SCOUT escalated #${resolvedKingdom} to 1h Surge Cadence; DOZER armed for coordinate/power delta interception.`,
    surgeCadenceHours: 1,
    lockedTargetsCount: totalLocked,
  });

  if (bastionRes?.event) {
    if (!Array.isArray(list.bastionRingEvents)) list.bastionRingEvents = [];
    list.bastionRingEvents.unshift(bastionRes.event);
  }

  await saveWatchlist(list);
  return { target: list.targets[idStr], watchlist: list, bastionSync: bastionRes };
}

/**
 * Removes a target from active tracking and updates Bastion MoE Ring schedule.
 */
export async function removeTrackedTarget(govId) {
  const list = await getWatchlist();
  const idStr = String(govId);
  const removedTarget = list.targets[idStr];
  if (removedTarget) {
    delete list.targets[idStr];
    const remaining = Object.keys(list.targets).length;
    const bastionRes = await syncWithBastionMoERing({
      agent: 'SCOUT + BASTION AUDIT',
      ring: 'RING 1 -> RING 3',
      model: 'NUMNUM_DETERMINISTIC_V2 (0 Tokens)',
      action: 'BLACK_OPS_TARGET_RELEASE',
      kingdom: removedTarget.kingdom || '4194',
      detail: `Released Black Ops lock on [${removedTarget.lastKnownAlliance || 'None'}] ${removedTarget.name} (ID: ${govId}). Active watchlist count: ${remaining}.`,
      surgeCadenceHours: remaining > 0 ? 1 : 12,
      lockedTargetsCount: remaining,
    });
    if (bastionRes?.event) {
      if (!Array.isArray(list.bastionRingEvents)) list.bastionRingEvents = [];
      list.bastionRingEvents.unshift(bastionRes.event);
    }
    await saveWatchlist(list);
  }
  return { removed: true, watchlist: list };
}

/**
 * Compares incoming scan telemetry against the active Black Ops Watchlist
 * and dispatches immediate tactical alerts if movement or major stat changes occur.
 */
export async function evaluateTrackedTargets(freshGovs = []) {
  const list = await getWatchlist();
  const trackedIds = Object.keys(list.targets || {});
  if (trackedIds.length === 0) return { alertsDispatched: 0 };

  const freshMap = new Map();
  for (const g of freshGovs) {
    const id = String(g.govId || g.id || '');
    if (id) freshMap.set(id, g);
  }

  const generatedAlerts = [];
  const nowIso = new Date().toISOString();

  for (const idStr of trackedIds) {
    const target = list.targets[idStr];
    const fresh = freshMap.get(idStr);
    if (!fresh) continue;

    const changes = [];

    // 1. Coordinate Tracking (Territory Movement)
    const newCoords =
      fresh.castlePos ||
      (fresh.mapTileX && fresh.mapTileY ? { X: Number(fresh.mapTileX), Y: Number(fresh.mapTileY) } : null);
    if (newCoords && typeof newCoords === 'object') {
      const oldCoords = target.lastKnownCoords;
      if (oldCoords && (oldCoords.X !== newCoords.X || oldCoords.Y !== newCoords.Y)) {
        const dx = newCoords.X - oldCoords.X;
        const dy = newCoords.Y - oldCoords.Y;
        const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
        changes.push({
          type: 'TERRITORY_RELOCATION',
          detail: `Relocated from (${oldCoords.X}, ${oldCoords.Y}) to (${newCoords.X}, ${newCoords.Y}) [Distance: ${dist} tiles]`,
          from: oldCoords,
          to: newCoords,
          distance: dist,
        });
        if (!Array.isArray(target.movementHistory)) target.movementHistory = [];
        target.movementHistory.push({
          from: oldCoords,
          to: newCoords,
          distance: dist,
          timestamp: nowIso,
        });
      }
      target.lastKnownCoords = newCoords;
    }

    // 2. Power Delta Tracking
    const freshPower = Number(fresh.power || 0);
    if (target.lastKnownPower && freshPower !== target.lastKnownPower) {
      const pwrDiff = freshPower - target.lastKnownPower;
      if (Math.abs(pwrDiff) >= 50000) {
        changes.push({
          type: pwrDiff > 0 ? 'POWER_SPIKE' : 'POWER_DROP',
          detail: `Power shifted ${pwrDiff > 0 ? '+' : ''}${(pwrDiff / 1e6).toFixed(2)}M (${(target.lastKnownPower / 1e6).toFixed(2)}M -> ${(freshPower / 1e6).toFixed(2)}M)`,
          delta: pwrDiff,
        });
      }
    }
    if (freshPower > 0) target.lastKnownPower = freshPower;

    // 3. Alliance Migration Tracking
    const freshAlliance = fresh.alliance || 'None';
    if (target.lastKnownAlliance && freshAlliance !== target.lastKnownAlliance) {
      changes.push({
        type: 'ALLIANCE_MIGRATION',
        detail: `Migrated alliance from [${target.lastKnownAlliance}] to [${freshAlliance}]`,
        oldAlliance: target.lastKnownAlliance,
        newAlliance: freshAlliance,
      });
      target.lastKnownAlliance = freshAlliance;
    }

    // 4. Combat / Kill Points & Deads Tracking
    const freshKp = Number(fresh.killPoints || 0);
    const freshDeads = Number(fresh.dead || 0);
    if (target.lastKnownKp && freshKp > target.lastKnownKp) {
      const kpDiff = freshKp - target.lastKnownKp;
      const deadDiff = freshDeads - (target.lastKnownDeads || 0);
      changes.push({
        type: 'COMBAT_ENGAGEMENT',
        detail: `Combat active: +${(kpDiff / 1e6).toFixed(2)}M KP | +${deadDiff.toLocaleString()} Dead Troops`,
        kpDelta: kpDiff,
        deadDelta: deadDiff,
      });
    }
    if (freshKp > 0) target.lastKnownKp = freshKp;
    if (freshDeads > 0) target.lastKnownDeads = freshDeads;

    // If changes occurred, trigger Alert & log into Bastion Ring 3 (DOZER + BASTION AUDIT)
    if (changes.length > 0) {
      const alertItem = {
        alertId: `alert_${Date.now()}_${target.govId}`,
        govId: target.govId,
        name: target.name,
        kingdom: target.kingdom,
        priority: target.priority,
        timestamp: nowIso,
        changes,
        coords: target.lastKnownCoords,
        power: target.lastKnownPower,
        alliance: target.lastKnownAlliance,
      };

      list.alertHistory.unshift(alertItem);
      if (list.alertHistory.length > 100) list.alertHistory.pop();
      target.lastAlertAt = nowIso;
      generatedAlerts.push(alertItem);

      const bastionRes = await syncWithBastionMoERing({
        agent: 'DOZER + BASTION AUDIT',
        ring: 'RING 3 (FORENSICS)',
        model: 'DOZER_SLICE_MERGER_V1 (0 Tokens)',
        action: 'BLACK_OPS_INTERCEPT',
        kingdom: target.kingdom || '4194',
        detail: `DOZER intercepted telemetry shift on [${target.lastKnownAlliance}] ${target.name} (${target.govId}): ${changes.map((c) => c.detail).join(' | ')}`,
        surgeCadenceHours: 1,
        lockedTargetsCount: trackedIds.length,
      });

      if (bastionRes?.event) {
        if (!Array.isArray(list.bastionRingEvents)) list.bastionRingEvents = [];
        list.bastionRingEvents.unshift(bastionRes.event);
      }

      // Dispatch Mobile / Webhook Notification
      await dispatchBlackOpsNotification(alertItem, list.webhookUrl);
    }
  }

  await saveWatchlist(list);
  return { alertsDispatched: generatedAlerts.length, alerts: generatedAlerts };
}

/**
 * Dispatches a tactical alert payload to Mobile Web Push / Discord / Webhook.
 */
export async function dispatchBlackOpsNotification(alertItem, customWebhookUrl = null) {
  const coordStr = alertItem.coords ? `(${alertItem.coords.X}, ${alertItem.coords.Y})` : 'Unknown Grid';
  const changeSummary = alertItem.changes.map((c) => `• ${c.detail}`).join('\n');

  const title = `🚨 [BLACK OPS RADAR] Target Alert: ${alertItem.name} [#${alertItem.kingdom}]`;
  const message = `**Target Locked:** ${alertItem.name} (ID: ${alertItem.govId})\n**Alliance:** [${alertItem.alliance}] | **Power:** ${(alertItem.power / 1e6).toFixed(1)}M\n**Coordinates:** ${coordStr}\n\n**Telemetry Shifts Detected:**\n${changeSummary}`;

  // 1. Send via Universal notifyAdmin
  try {
    await notifyAdmin({
      type: 'ALERT',
      title,
      message,
      details: {
        governorId: alertItem.govId,
        governorName: alertItem.name,
        kingdomNumber: alertItem.kingdom,
        allianceTag: alertItem.alliance,
        coordinates: coordStr,
        reason: alertItem.changes.map((c) => c.type).join(', '),
      },
    });
  } catch (e) {
    console.warn('[BlackOps] notifyAdmin dispatch error:', e.message);
  }

  // 2. Direct Custom Webhook (Discord / Pushover / Mobile Phone Webhook)
  const webhook = customWebhookUrl || process.env.BLACK_OPS_WEBHOOK_URL || process.env.ADMIN_ALERT_WEBHOOK;
  if (webhook && webhook.startsWith('http')) {
    try {
      const payload = {
        username: 'Valheon Black Ops Radar',
        avatar_url: 'https://unity-v2-azure.vercel.app/logo-valheon-dark.png',
        content: `🛰️ **[BLACK OPS SATELLITE RADAR] Star Cluster Alert Dispatch**`,
        embeds: [
          {
            title: `🎯 TARGET SHIFT: ${alertItem.name} (ID: ${alertItem.govId})`,
            color: alertItem.priority === 'ENEMY_WHALE' ? 0xef4444 : 0x10b981,
            description: message,
            fields: [
              { name: 'Kingdom', value: `#${alertItem.kingdom}`, inline: true },
              { name: 'Coordinates', value: coordStr, inline: true },
              { name: 'Priority', value: alertItem.priority, inline: true },
            ],
            footer: { text: 'Valheon Solutions LLC • Bastion MoE Ring Telemetry' },
            timestamp: new Date().toISOString(),
          },
        ],
      };
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (whErr) {
      console.warn('[BlackOps] Custom webhook dispatch failed:', whErr.message);
    }
  }
}
