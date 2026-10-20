import fs from 'fs';
import os from 'os';
import path from 'path';
import { notifyAdmin } from './notifyAdmin.js';
import { getGlobalConfig, updateGlobalConfig } from './awsDynamo.js';

const LOCAL_WATCHLIST_PATH = path.join(process.cwd(), 'src', 'data', 'black_ops_watchlist.json');
const TMP_WATCHLIST_PATH = path.join(os.tmpdir(), 'black_ops_watchlist.json');
const DYNAMO_CONFIG_KEY = 'BLACK_OPS_WATCHLIST';

if (!globalThis.__blackOpsWatchlistMemory) {
  globalThis.__blackOpsWatchlistMemory = null;
}

const DEFAULT_WATCHLIST = () => ({
  targets: {},
  alertHistory: [],
  webhookUrl: null,
  emailAlerts: true,
  pushAlerts: true,
});

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
  } catch (e) {
    // Ignore /tmp errors
  }

  // 4. Write to local src/data if on local workstation (ignore EROFS on Vercel)
  try {
    const dir = path.dirname(LOCAL_WATCHLIST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_WATCHLIST_PATH, jsonStr, 'utf8');
  } catch (e) {
    // Expected on Vercel read-only filesystem
  }

  return true;
}

/**
 * Adds or updates a target governor in the tracking radar.
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

  list.targets[idStr] = {
    govId: Number(govId),
    id: idStr,
    name: name || initialData.name || existing.name || `Governor_${govId}`,
    kingdom: String(kingdom || initialData.kingdomId || existing.kingdom || '4194'),
    priority: priority || existing.priority || 'VIP',
    notes: notes || existing.notes || '',
    addedAt: existing.addedAt || new Date().toISOString(),
    lastAlertAt: existing.lastAlertAt || null,
    lastKnownCoords: coords,
    lastKnownPower: Number(initialData.power || existing.lastKnownPower || 0),
    lastKnownAlliance: initialData.alliance || existing.lastKnownAlliance || 'None',
    lastKnownKp: Number(initialData.killPoints || existing.lastKnownKp || 0),
    lastKnownDeads: Number(initialData.dead || existing.lastKnownDeads || 0),
    initialSnapshot: initialData || existing.initialSnapshot || {},
    movementHistory: existing.movementHistory || [],
    deltas: existing.deltas || { power: 0, kp: 0, deads: 0, moved: false },
    active: true,
  };

  await saveWatchlist(list);
  return { target: list.targets[idStr], watchlist: list };
}

/**
 * Removes a target from active tracking.
 */
export async function removeTrackedTarget(govId) {
  const list = await getWatchlist();
  const idStr = String(govId);
  if (list.targets[idStr]) {
    delete list.targets[idStr];
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

    // If changes occurred, trigger Alert
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
            footer: { text: 'Valheon Solutions LLC • Tactical Reconnaissance' },
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
