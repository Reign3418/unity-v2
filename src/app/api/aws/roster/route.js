import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';
import { getKingdomRoster, getGlobalConfig } from '@/lib/awsDynamo';
import { readLiveTelemetryCache } from '@/app/api/ingest/kingdom-scan/route';
import { readEpochLedger } from '@/lib/dozerReconciler';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function recordKentDemandPulse(kingdomId) {
  try {
    if (!kingdomId || kingdomId === 'GLOBAL') return;
    const statePath = path.join(process.cwd(), 'scanner', 'bastion_state.json');
    if (!fs.existsSync(statePath)) return;
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const kdEntry = (state.kingdomSchedules || []).find((k) => String(k.kingdom) === String(kingdomId));
    if (kdEntry) {
      kdEntry.unityApiCalls24h = (kdEntry.unityApiCalls24h || 0) + 1;
      if (
        state.autopilotEnabled &&
        kdEntry.mode === 'STEADY_12H' &&
        kdEntry.unityApiCalls24h >= (state.demandThresholdForSurge || 5)
      ) {
        kdEntry.mode = 'SURGE_3H';
        kdEntry.cadenceHours = 3;
        kdEntry.reason = `KENT detected live Unity API surge (${kdEntry.unityApiCalls24h} calls) → NULL auto-promoted to 3h Surge Mode`;
      }
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    }
  } catch {}
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');
    const sourceMode = searchParams.get('sourceMode') || 'bot_sovereign'; // 'bot_sovereign' | 'archive'

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing 'kd' (Kingdom ID) parameter." }, { status: 400 });
    }

    // KENT Demand Pulse Hook: Track live Unity demand to dynamically speed up or slow down Bastion scans
    recordKentDemandPulse(kingdomId);

    const ledger = readEpochLedger();
    const epochMeta = ledger.kingdomEpochs?.[String(kingdomId)] || {
      kingdomId: String(kingdomId),
      status: 'ARCHIVED_VIEW_ONLY',
      scanPreset: ledger.defaultScanPreset || 'SWEET_650',
      activeBaselineSource: 'ARCHIVED_SHEET',
      legacySheetsArchived: true,
      legacyBaselineZeroed: true,
    };

    // 1. If in Bot-Sovereign Mode (default), check Local 45-Field Bastion Bot Telemetry Cache + DynamoDB Live Overlay first
    const cache = readLiveTelemetryCache();
    const localKd = cache?.kingdoms?.[String(kingdomId)];
    const mergedGovMap = { ...(localKd?.governors || {}) };
    let liveProgress = localKd?.progress || null;
    if (sourceMode !== 'archive' && kingdomId !== 'GLOBAL') {
      try {
        const [rawOverlay, rawStatus] = await Promise.all([
          getGlobalConfig(`LIVE_TELEMETRY_OVERLAY_${kingdomId}`).catch(() => null),
          getGlobalConfig(`LIVE_SCAN_STATUS_${kingdomId}`).catch(() => null),
        ]);
        if (rawOverlay) {
          const parsedOverlay = JSON.parse(rawOverlay);
          for (const [gid, g] of Object.entries(parsedOverlay)) {
            if (g && typeof g === 'object') {
              const al = String(g.alliance || '');
              if (String(kingdomId) === '4197' && /94|Lova|TDF_|VALH|GoD|LW=A|tcHo/.test(al)) continue;
              mergedGovMap[gid] = { ...(mergedGovMap[gid] || {}), ...g };
            }
          }
        }
        if (rawStatus) {
          liveProgress = { ...(liveProgress || {}), ...JSON.parse(rawStatus) };
        }
      } catch {}
    }

    if (
      sourceMode !== 'archive' &&
      Object.keys(mergedGovMap).length > 0
    ) {
      const localRoster = Object.values(mergedGovMap)
        .map((g) => ({
          ...g,
          sourceType: g.sourceType || 'BASTION_BOT',
          sourceBadge:
            g.sourceBadge ||
            (g.birthKingdomId && String(g.birthKingdomId) !== String(kingdomId)
              ? `🌱 MIGRANT FROM #${g.birthKingdomId}`
              : '🤖 BASTION BOT'),
          birthKingdomId: g.birthKingdomId || String(kingdomId),
        }))
        .sort(
          (a, b) =>
            (Number(b.power) || 0) - (Number(a.power) || 0) ||
            (Number(a.rank) || 999999) - (Number(b.rank) || 999999)
        )
        .map((g, idx) => ({ ...g, rank: idx + 1 }));

      return NextResponse.json(
        {
          roster: localRoster,
          progress: liveProgress,
          lastScanDate: liveProgress?.updatedAt || localKd?.lastScanDate || cache.updatedAt,
          source: 'BASTION_BOT_45_FIELD_TELEMETRY',
          sourceType: 'BASTION_BOT',
          epochMeta: {
            ...epochMeta,
            status: 'BOT_SOVEREIGN',
            activeBaselineSource: 'BASTION_BOT',
          },
          dozerStats: ledger.dozerStats,
          allianceLeadersR5: localKd?.allianceLeadersR5 || [],
        },
        { status: 200 }
      );
    }

    // 2. Fallback or Historical Archive View from AWS DynamoDB
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    if (
      !session.user.isSuperAdmin &&
      kingdomId !== 'GLOBAL' &&
      !session.user.allowedKingdoms?.includes(kingdomId)
    ) {
      return NextResponse.json(
        { error: 'Access Denied. Cross-Kingdom requests are strictly prohibited by your clearance level.' },
        { status: 403 }
      );
    }

    let rosterData = [];
    const isBotEpoch = epochMeta.status === 'BOT_SOVEREIGN' || epochMeta.status === 'GENESIS_SOVEREIGN';

    if (kingdomId === 'GLOBAL') {
      const allowed = session.user.allowedKingdoms || [];
      for (const kd of allowed) {
        const kdRoster = await getKingdomRoster(kd);
        const taggedRoster = kdRoster.map((r) => ({
          ...r,
          alliance: r.alliance === 'None' ? `[${kd}] Unallied` : `[${kd}] ${r.alliance}`,
          name: `[${kd}] ${r.name}`,
          sourceType: 'BASTION_BOT',
          sourceBadge: '🤖 BASTION BOT',
        }));
        rosterData.push(...taggedRoster);
      }
    } else {
      const rawRoster = await getKingdomRoster(kingdomId);
      rosterData = rawRoster.map((r) => ({
        ...r,
        sourceType: isBotEpoch && sourceMode !== 'archive' ? 'BASTION_BOT' : 'ARCHIVED_SHEET',
        sourceBadge:
          isBotEpoch && sourceMode !== 'archive' ? '🤖 BASTION BOT' : '🏛️ ARCHIVE (VIEW-ONLY)',
        // If viewing an archived pre-Bot sheet, zero out active deltas per Twist 3
        powerDelta: sourceMode === 'archive' || !isBotEpoch ? 0 : r.powerDelta,
        kpDelta: sourceMode === 'archive' || !isBotEpoch ? 0 : r.kpDelta,
        deadsDelta: sourceMode === 'archive' || !isBotEpoch ? 0 : r.deadsDelta,
      }));
    }

    return NextResponse.json(
      {
        roster: rosterData,
        source: isBotEpoch && sourceMode !== 'archive' ? 'BASTION_BOT_AWS' : 'HISTORICAL_ARCHIVE_VIEW_ONLY',
        sourceType: isBotEpoch && sourceMode !== 'archive' ? 'BASTION_BOT' : 'ARCHIVED_SHEET',
        epochMeta,
        dozerStats: ledger.dozerStats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API/AWS/Roster] Fatal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error retrieving AWS Roster.' }, { status: 500 });
  }
}
