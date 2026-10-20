import fs from 'fs';
import path from 'path';
import { notifyAdmin } from './notifyAdmin.js';
import { readLiveTelemetryCache } from '../app/api/ingest/kingdom-scan/route.js';

const WATCHLIST_PATH = path.join(process.cwd(), 'src', 'data', 'black_ops_watchlist.json');

/**
 * Loads the active Black Ops Target Watchlist.
 */
export function getWatchlist() {
  try {
    if (fs.existsSync(WATCHLIST_PATH)) {
      return JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('[BlackOps] Watchlist read warning:', e.message);
  }
  return { targets: {}, alertHistory: [], webhookUrl: null, emailAlerts: true, pushAlerts: true };
}

/**
 * Saves the Black Ops Target Watchlist.
 */
export function saveWatchlist(data) {
  try {
    const dir = path.dirname(WATCHLIST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WATCHLIST_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[BlackOps] Failed to save watchlist:', e.message);
    return false;
  }
}

/**
 * Adds or updates a target governor in the tracking radar.
 */
export function addTrackedTarget({ govId, name, kingdom = '4194', priority = 'HIGH', notes = '', initialData = {} }) {
  const list = getWatchlist();
  const idStr = String(govId);

  const existing = list.targets[idStr] || {};
  list.targets[idStr] = {
    govId: Number(govId),
    id: idStr,
    name: name || existing.name || `Governor_${govId}`,
    kingdom: String(kingdom || existing.kingdom || '4194'),
    priority, // VIP, HIGH, MEDIUM, ENEMY_WHALE
    notes: notes || existing.notes || '',
    addedAt: existing.addedAt || new Date().toISOString(),
    lastAlertAt: existing.lastAlertAt || null,
    lastKnownCoords: initialData.castlePos || existing.lastKnownCoords || null,
    lastKnownPower: initialData.power || existing.lastKnownPower || 0,
    lastKnownAlliance: initialData.alliance || existing.lastKnownAlliance || 'None',
    lastKnownKp: initialData.killPoints || existing.lastKnownKp || 0,
    lastKnownDeads: initialData.dead || existing.lastKnownDeads || 0,
    movementHistory: existing.movementHistory || [],
    deltas: existing.deltas || { power: 0, kp: 0, deads: 0, moved: false },
    active: true,
  };

  saveWatchlist(list);
  return list.targets[idStr];
}

/**
 * Removes a target from active tracking.
 */
export function removeTrackedTarget(govId) {
  const list = getWatchlist();
  const idStr = String(govId);
  if (list.targets[idStr]) {
    delete list.targets[idStr];
    saveWatchlist(list);
    return true;
  }
  return false;
}

/**
 * Compares incoming scan telemetry against the active Black Ops Watchlist
 * and dispatches immediate tactical alerts if movement or major stat changes occur.
 */
export async function evaluateTrackedTargets(freshGovs = []) {
  const list = getWatchlist();
  const trackedIds = Object.keys(list.targets);
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
    let hasMovement = false;

    // 1. Coordinate Tracking (Territory Movement)
    const newCoords = fresh.castlePos;
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
        target.movementHistory.push({
          from: oldCoords,
          to: newCoords,
          distance: dist,
          timestamp: nowIso,
        });
        hasMovement = true;
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

  saveWatchlist(list);
  return { alertsDispatched: generatedAlerts.length, alerts: generatedAlerts };
}

/**
 * Dispatches a tactical alert payload to Mobile Web Push / Discord / Webhook.
 */
export async function dispatchBlackOpsNotification(alertItem, customWebhookUrl = null) {
  const coordStr = alertItem.coords ? `(${alertItem.coords.X}, ${alertItem.coords.Y})` : 'Unknown Grid';
  const changeSummary = alertItem.changes.map((c) => `• ${c.detail}`).join('\n');

  // Format Star Cluster Tactical Alert
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
