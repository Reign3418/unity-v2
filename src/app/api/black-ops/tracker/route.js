import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getWatchlist,
  saveWatchlist,
  addTrackedTarget,
  removeTrackedTarget,
  dispatchBlackOpsNotification,
} from '@/lib/blackOpsTracker';
import { readLiveTelemetryCache } from '@/app/api/ingest/kingdom-scan/route';

export const dynamic = 'force-dynamic';

function get4194Dataset() {
  const liveCache = readLiveTelemetryCache();
  const govsById = liveCache.governorsById || {};
  const list = Object.values(govsById).filter((g) => String(g.kingdomId || g.kingdom || '4194') === '4194');

  if (list.length > 0) {
    return list;
  }

  // Fallback to local JSON/CSV if liveCache is empty
  const jsonPath = path.join(process.cwd(), 'scanner', 'ram_accum_16384_4194.json');
  if (fs.existsSync(jsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {}
  }
  return [];
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const action = searchParams.get('action');

    const watchlist = getWatchlist();
    const dataset = get4194Dataset();

    // If query provided, return matching governors for autocomplete / instant search
    let searchResults = [];
    if (query) {
      searchResults = dataset
        .filter((g) => {
          const name = String(g.name || '').toLowerCase();
          const id = String(g.govId || g.id || '');
          const alliance = String(g.alliance || '').toLowerCase();
          return name.includes(query) || id.includes(query) || alliance.includes(query);
        })
        .slice(0, 25);
    }

    // Attach latest live telemetry to all tracked targets
    const targetMap = new Map();
    dataset.forEach((g) => {
      const id = String(g.govId || g.id || '');
      if (id) targetMap.set(id, g);
    });

    const enrichedTargets = Object.values(watchlist.targets || {}).map((target) => {
      const live = targetMap.get(String(target.govId));
      return {
        ...target,
        liveTelemetry: live || null,
        currentRank: live?.rank || null,
      };
    });

    return NextResponse.json({
      success: true,
      watchlist: {
        ...watchlist,
        targetsList: enrichedTargets,
        totalTracked: enrichedTargets.length,
      },
      searchResults,
      totalKnownGovernors: dataset.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[BlackOps API GET] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    const watchlist = getWatchlist();

    if (action === 'TRACK_TARGET') {
      const { govId, name, kingdom, priority, notes, initialData } = body;
      if (!govId) {
        return NextResponse.json({ success: false, error: 'govId is required' }, { status: 400 });
      }
      const target = addTrackedTarget({ govId, name, kingdom, priority, notes, initialData });
      return NextResponse.json({ success: true, message: `Target ${target.name} locked on radar`, target });
    }

    if (action === 'UNTRACK_TARGET') {
      const { govId } = body;
      if (!govId) {
        return NextResponse.json({ success: false, error: 'govId is required' }, { status: 400 });
      }
      removeTrackedTarget(govId);
      return NextResponse.json({ success: true, message: `Target ${govId} removed from watchlist` });
    }

    if (action === 'UPDATE_SETTINGS') {
      const { webhookUrl, emailAlerts, pushAlerts } = body;
      if (typeof webhookUrl !== 'undefined') watchlist.webhookUrl = webhookUrl;
      if (typeof emailAlerts !== 'undefined') watchlist.emailAlerts = Boolean(emailAlerts);
      if (typeof pushAlerts !== 'undefined') watchlist.pushAlerts = Boolean(pushAlerts);
      saveWatchlist(watchlist);
      return NextResponse.json({ success: true, message: 'Black Ops alert routing updated' });
    }

    if (action === 'TEST_ALERT') {
      const sampleAlert = {
        alertId: `test_${Date.now()}`,
        govId: body.govId || 236264666,
        name: body.name || '[D-94] 么krp (TEST WHALE)',
        kingdom: '4194',
        priority: 'ENEMY_WHALE',
        timestamp: new Date().toISOString(),
        changes: [
          {
            type: 'TERRITORY_RELOCATION',
            detail: 'Relocated from Zone 1 (293, 1016) to Zone 3 Pass (640, 810) [Distance: 398 tiles]',
          },
          {
            type: 'POWER_SPIKE',
            detail: 'Power surged +420,000 (23.9M -> 24.3M)',
          },
          {
            type: 'COMBAT_ENGAGEMENT',
            detail: 'Engaged in combat: +2.1M KP delta on Holy Site rally',
          },
        ],
        coords: { X: 640, Y: 810 },
        power: 24270921,
        alliance: 'D-94',
      };

      await dispatchBlackOpsNotification(sampleAlert, body.webhookUrl || watchlist.webhookUrl);
      return NextResponse.json({
        success: true,
        message: 'Tactical Star Cluster alert successfully dispatched to phone/webhook!',
        alert: sampleAlert,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('[BlackOps API POST] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
