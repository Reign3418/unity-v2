import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';
import {
  getWatchlist,
  saveWatchlist,
  addTrackedTarget,
  pinTargetCoordinates,
  removeTrackedTarget,
  dispatchBlackOpsNotification,
  dispatchBastionPinpointRecon,
} from '@/lib/blackOpsTracker';
import { readLiveTelemetryCache } from '@/app/api/ingest/kingdom-scan/route';
import { enrichGovernorWithRatios } from '@/lib/telemetryAnalytics';

export const dynamic = 'force-dynamic';

function get4194Dataset() {
  const liveCache = readLiveTelemetryCache();
  const govsById = liveCache.governorsById || {};
  const list = Object.values(govsById).filter((g) => String(g.kingdomId || g.kingdom || '4194') === '4194');

  if (list.length > 0) {
    return list.map((g) => enrichGovernorWithRatios(g));
  }

  // Fallback to local JSON/CSV if liveCache is empty
  const jsonPath = path.join(process.cwd(), 'scanner', 'ram_accum_16384_4194.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return Array.isArray(raw) ? raw.map((g) => enrichGovernorWithRatios(g)) : [];
    } catch (e) {}
  }
  return [];
}

function buildEnrichedWatchlist(watchlist, dataset) {
  const targetMap = new Map();
  dataset.forEach((g) => {
    const id = String(g.govId || g.id || '');
    if (id) targetMap.set(id, g);
  });

  const enrichedTargets = Object.values(watchlist.targets || {}).map((target) => {
    const live = targetMap.get(String(target.govId)) || target.initialSnapshot || null;
    const pinnedOrLastCoords =
      target.lastKnownCoords ||
      live?.castlePos ||
      (live?.mapTileX && live?.mapTileY ? { X: Number(live.mapTileX), Y: Number(live.mapTileY) } : null);
    const enrichedLive = enrichGovernorWithRatios({
      ...(live || {}),
      govId: target.govId,
      name: target.name || live?.name,
      alliance: live?.alliance || target.lastKnownAlliance,
      castlePos: pinnedOrLastCoords,
      coordSource: target.coordSource || live?.coordSource,
    });
    return {
      ...target,
      liveTelemetry: enrichedLive,
      currentRank: enrichedLive?.rank || target.initialSnapshot?.rank || null,
      lastKnownPower: enrichedLive?.power || target.lastKnownPower || 0,
      lastKnownAlliance: enrichedLive?.alliance || target.lastKnownAlliance || 'None',
      lastKnownKp: enrichedLive?.killPoints || target.lastKnownKp || 0,
      lastKnownDeads: enrichedLive?.dead || target.lastKnownDeads || 0,
      lastKnownCoords:
        enrichedLive?.mapTileX && enrichedLive?.mapTileY
          ? { X: Number(enrichedLive.mapTileX), Y: Number(enrichedLive.mapTileY) }
          : pinnedOrLastCoords,
    };
  });

  return {
    ...watchlist,
    targetsList: enrichedTargets,
    totalTracked: enrichedTargets.length,
    bastionRingEvents: watchlist.bastionRingEvents || [],
  };
}

export async function GET(req) {
  try {
    const session = await auth();
    const isSuperAdmin = Boolean(session?.user?.isSuperAdmin || session?.user?.isValheonFounder);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: SuperAdmin clearance required for Black Ops operations.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    const watchlist = await getWatchlist();
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

    const enrichedWatchlist = buildEnrichedWatchlist(watchlist, dataset);

    return NextResponse.json({
      success: true,
      watchlist: enrichedWatchlist,
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
    const session = await auth();
    const isSuperAdmin = Boolean(session?.user?.isSuperAdmin || session?.user?.isValheonFounder);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: SuperAdmin clearance required for Black Ops operations.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;
    const dataset = get4194Dataset();

    if (action === 'TRACK_TARGET') {
      const { govId, name, kingdom, priority, notes, initialData } = body;
      if (!govId) {
        return NextResponse.json({ success: false, error: 'govId is required' }, { status: 400 });
      }
      const fullRecord =
        dataset.find((g) => String(g.govId || g.id) === String(govId)) || initialData || {};

      const { target, watchlist, bastionSync } = await addTrackedTarget({
        govId,
        name: name || fullRecord.name,
        kingdom: kingdom || fullRecord.kingdomId || '4194',
        priority: priority || 'VIP',
        notes,
        initialData: fullRecord,
      });

      const enrichedWatchlist = buildEnrichedWatchlist(watchlist, dataset);
      const enrichedTarget =
        enrichedWatchlist.targetsList.find((t) => String(t.govId) === String(govId)) || target;

      return NextResponse.json({
        success: true,
        message: `Target ${target.name} locked on radar · Bastion Ring 1 (SCOUT) set to 1h Surge`,
        target: enrichedTarget,
        watchlist: enrichedWatchlist,
        bastionSync,
      });
    }

    if (action === 'PIN_COORDINATES') {
      const { govId, x, y, source = 'MANUAL_PIN' } = body;
      if (!govId) {
        return NextResponse.json({ success: false, error: 'govId is required' }, { status: 400 });
      }
      const { target, watchlist, movedDetail } = await pinTargetCoordinates({ govId, x, y, source });
      const enrichedWatchlist = buildEnrichedWatchlist(watchlist, dataset);
      const enrichedTarget =
        enrichedWatchlist.targetsList.find((t) => String(t.govId) === String(govId)) || target;

      return NextResponse.json({
        success: true,
        message: movedDetail || `Pinned Castle Coordinates at #4194 X:${x} Y:${y}`,
        target: enrichedTarget,
        watchlist: enrichedWatchlist,
      });
    }

    if (action === 'DISPATCH_BASTION_RECON') {
      const { target } = body;
      if (!target) {
        return NextResponse.json({ success: false, error: 'target is required' }, { status: 400 });
      }
      const reconRes = await dispatchBastionPinpointRecon(target);
      const watchlist = await getWatchlist();
      if (reconRes?.bastionEvent) {
        if (!Array.isArray(watchlist.bastionRingEvents)) watchlist.bastionRingEvents = [];
        watchlist.bastionRingEvents.unshift(reconRes.bastionEvent);
        await saveWatchlist(watchlist);
      }
      return NextResponse.json({
        success: true,
        message: `Bastion Ring 2 (TANK + CIPHER) dispatched on sidekick-mumu-0 for Rank Window #${reconRes.rankWindow}!`,
        recon: reconRes,
        watchlist: buildEnrichedWatchlist(watchlist, dataset),
      });
    }

    if (action === 'UNTRACK_TARGET') {
      const { govId } = body;
      if (!govId) {
        return NextResponse.json({ success: false, error: 'govId is required' }, { status: 400 });
      }
      const { watchlist } = await removeTrackedTarget(govId);
      const enrichedWatchlist = buildEnrichedWatchlist(watchlist, dataset);
      return NextResponse.json({
        success: true,
        message: `Target ${govId} removed from watchlist`,
        watchlist: enrichedWatchlist,
      });
    }

    if (action === 'SYNC_LOCAL_TARGETS') {
      const { localTargets = [] } = body;
      let watchlist = await getWatchlist();
      for (const lt of localTargets) {
        const gid = lt.govId || lt.id;
        if (gid && !watchlist.targets[String(gid)]) {
          const fullRecord =
            dataset.find((g) => String(g.govId || g.id) === String(gid)) || lt.liveTelemetry || lt;
          const res = await addTrackedTarget({
            govId: gid,
            name: lt.name || fullRecord.name,
            kingdom: lt.kingdom || '4194',
            priority: lt.priority || 'VIP',
            notes: lt.notes || '',
            initialData: fullRecord,
          });
          watchlist = res.watchlist;
        }
      }
      const enrichedWatchlist = buildEnrichedWatchlist(watchlist, dataset);
      return NextResponse.json({
        success: true,
        watchlist: enrichedWatchlist,
      });
    }

    const watchlist = await getWatchlist();

    if (action === 'UPDATE_SETTINGS') {
      const { webhookUrl, emailAlerts, pushAlerts } = body;
      if (typeof webhookUrl !== 'undefined') watchlist.webhookUrl = webhookUrl;
      if (typeof emailAlerts !== 'undefined') watchlist.emailAlerts = Boolean(emailAlerts);
      if (typeof pushAlerts !== 'undefined') watchlist.pushAlerts = Boolean(pushAlerts);
      await saveWatchlist(watchlist);
      return NextResponse.json({
        success: true,
        message: 'Black Ops alert routing updated',
        watchlist: buildEnrichedWatchlist(watchlist, dataset),
      });
    }

    if (action === 'TEST_ALERT') {
      const sampleAlert = {
        alertId: `test_${Date.now()}`,
        govId: body.govId || 235824876,
        name: body.name || '[FaKE] 么krp',
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
        power: 24269135,
        alliance: 'FaKE',
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
