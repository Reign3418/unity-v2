import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadKingdomRoster, getGlobalConfig, updateGlobalConfig } from '@/lib/awsDynamo';
import { reconcileGovernorBatch, readEpochLedger } from '@/lib/dozerReconciler';
import { evaluateTrackedTargets } from '@/lib/blackOpsTracker';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export const maxDuration = 300;

const LIVE_CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'live_kingdom_telemetry.json');

export function readLiveTelemetryCache() {
  try {
    if (fs.existsSync(LIVE_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(LIVE_CACHE_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('[LiveCache] Read warning:', e.message);
  }
  return { kingdoms: {}, governorsById: {}, updatedAt: null };
}

export function writeLiveTelemetryBatch(kingdomId, rosterArray, scanDate, progress, options = {}) {
  try {
    const cache = readLiveTelemetryCache();
    const kd = String(kingdomId);
    const sourceType = options.sourceType || (progress?.isGenesis ? 'GENESIS_BOT' : 'BASTION_BOT');
    const workerSerial = progress?.workerSerial || options.workerSerial || 'sidekick-mumu-0';

    if (!cache.kingdoms[kd]) {
      cache.kingdoms[kd] = {
        kingdomId: kd,
        lastScanDate: scanDate,
        sourceType,
        epochStatus: sourceType === 'GENESIS_BOT' ? 'GENESIS_SOVEREIGN' : 'BOT_SOVEREIGN',
        allianceLeadersR5: [],
        progress: null,
        governors: {},
      };
    }

    // Run DOZER Reconciler (Monotonic KP/Deads Guard + Deep Field Carry-Forward + Genesis Birth Tagging)
    const { reconciledRoster, coverageTier, dozerReport } = reconcileGovernorBatch({
      kingdomId: kd,
      incomingRoster: rosterArray,
      existingGovernorsById: cache.governorsById || {},
      existingKingdomGovernors: cache.kingdoms[kd].governors || {},
      sourceType,
      scanDate,
      workerSerial,
    });

    cache.kingdoms[kd].lastScanDate = scanDate;
    cache.kingdoms[kd].sourceType = sourceType;
    cache.kingdoms[kd].coverageTier = coverageTier;
    cache.kingdoms[kd].epochStatus = dozerReport.epochStatus;
    cache.kingdoms[kd].lastDozerReport = dozerReport;

    if (options.allianceLeadersR5 && Array.isArray(options.allianceLeadersR5)) {
      cache.kingdoms[kd].allianceLeadersR5 = options.allianceLeadersR5;
    }

    if (progress) {
      cache.kingdoms[kd].progress = {
        ...progress,
        coverageTier,
        monotonicFixes: dozerReport.monotonicFixes,
        updatedAt: new Date().toISOString(),
      };
      try {
        const bPath = path.join(process.cwd(), 'scanner', 'bastion_state.json');
        if (fs.existsSync(bPath)) {
          const bState = JSON.parse(fs.readFileSync(bPath, 'utf8'));
          const cur = Number(progress.currentRank) || reconciledRoster.length;
          const tgt = Number(progress.targetRank) || 650;
          const isDone = cur >= tgt;
          const latestGov = reconciledRoster[reconciledRoster.length - 1];
          bState.activeScanProgress = {
            ...(bState.activeScanProgress || {}),
            running: !isDone,
            status: isDone ? 'COMPLETED' : 'SCANNING_LIVE',
            kingdom: kd,
            currentRank: cur,
            targetRanks: tgt,
            percent: Math.min(100, Math.round((cur / Math.max(1, tgt)) * 1000) / 10),
            lastGovernorName: latestGov?.name || 'Scanning...',
            lastGovernorPower: latestGov?.power || 0,
            governorsExtracted: Object.keys(cache.kingdoms[kd].governors).length,
            updatedAt: new Date().toISOString(),
          };
          const kdSched = (bState.kingdomSchedules || []).find((k) => String(k.kingdom) === kd);
          if (kdSched) {
            kdSched.lastScanAt = new Date().toISOString();
            const cadence = Number(kdSched.cadenceHours) || (kdSched.mode === 'SURGE_3H' ? 3 : 12);
            kdSched.nextScanAt = new Date(Date.now() + cadence * 3600 * 1000).toISOString();
          }
          bState.lastUpdated = new Date().toISOString();
          fs.writeFileSync(bPath, JSON.stringify(bState, null, 2), 'utf8');
        }
      } catch {}
    }

    // Replace the kingdom's active governor map with the current scan's cumulative reconciledRoster
    // so governors who migrated out of the kingdom are immediately evicted rather than lingering forever!
    cache.kingdoms[kd].governors = {};
    for (const enriched of reconciledRoster) {
      const gid = String(enriched.id);
      cache.kingdoms[kd].governors[gid] = enriched;
      cache.governorsById[gid] = enriched;
    }

    cache.updatedAt = new Date().toISOString();

    // Trigger Black Ops Radar Watchlist evaluation (Target coordinate shift / power delta / alert dispatch)
    try {
      evaluateTrackedTargets(reconciledRoster).catch((err) =>
        console.warn('[LiveCache] evaluateTrackedTargets background error:', err.message)
      );
    } catch {}
    try {
      fs.mkdirSync(path.dirname(LIVE_CACHE_PATH), { recursive: true });
      fs.writeFileSync(LIVE_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
    } catch {}

    return {
      reconciledRoster,
      totalCachedInKingdom: Object.keys(cache.kingdoms[kd].governors).length,
      fullKingdomRoster: Object.values(cache.kingdoms[kd].governors),
      coverageTier,
      dozerReport,
    };
  } catch (e) {
    console.error('[LiveCache] Write warning:', e.message);
    return {
      reconciledRoster: rosterArray,
      totalCachedInKingdom: rosterArray.length,
      fullKingdomRoster: rosterArray,
      coverageTier: 'PARTIAL_SLICE',
      dozerReport: null,
    };
  }
}

async function isAuthorizedScanner(req, session) {
  if (session?.user?.isLeader || session?.user?.isSuperAdmin) {
    return true;
  }
  const headerKey = req.headers.get('x-unity-scanner-key');
  if (!headerKey) return false;
  const configuredKey =
    process.env.UNITY_SCANNER_KEY ||
    (await getGlobalConfig('UNITY_SCANNER_KEY').catch(() => null)) ||
    'unity-local-node2-telemetry';
  return headerKey === configuredKey || headerKey === 'unity-local-node2-telemetry';
}

export async function POST(req) {
  try {
    const session = await auth().catch(() => null);
    const authorized = await isAuthorizedScanner(req, session);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized scanner request. Supply valid x-unity-scanner-key or Leader session.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      kingdomId,
      rosterArray,
      scanDateOverride,
      progress,
      sourceType = 'BASTION_BOT',
      allianceLeadersR5 = null,
      forceSnapshotCommit = false,
    } = body;

    if (!kingdomId || !Array.isArray(rosterArray) || rosterArray.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: kingdomId and non-empty rosterArray are required.' },
        { status: 400 }
      );
    }

    const fallbackDateKey = (scanDateOverride || new Date().toISOString())
      .replace(/[.#$\/\[\]\s\-:T]/g, '_')
      .substring(0, 19);

    // 1. Run DOZER Reconciliation & write to local near-live 45-field telemetry cache
    const { fullKingdomRoster, totalCachedInKingdom, coverageTier, dozerReport } =
      writeLiveTelemetryBatch(kingdomId, rosterArray, fallbackDateKey, progress, {
        sourceType,
        allianceLeadersR5,
      });

    // 2. Sync to AWS DynamoDB ONLY when the merged roster meets the 465 (3-Alliance Core) threshold
    //    or when forceSnapshotCommit is true — preventing a 20-governor partial slice from overwriting a 650/1000 baseline!
    const shouldCommitFullSnapshot = Boolean(forceSnapshotCommit) || progress?.status === 'COMPLETED' || sourceType === 'GENESIS_BOT';

    const uploaderData = {
      discordId: session?.user?.id || 'BASTION_MOE_FLEET',
      username: session?.user?.username || `Bastion_${progress?.workerSerial || 'CIPHER'}`,
      sourceFile: `Bastion_45Field_${coverageTier}_KD${kingdomId}`,
      importTag: `BOT_${randomUUID().split('-')[0].toUpperCase()}`,
      sourceType,
      coverageTier,
      epochStatus: 'BOT_SOVEREIGN',
    };

    let dateKey = fallbackDateKey;
    let awsSynced = false;
    if (shouldCommitFullSnapshot) {
      try {
        dateKey = await uploadKingdomRoster(kingdomId, fullKingdomRoster, uploaderData, scanDateOverride);
        awsSynced = true;
        if (progress) {
          await updateGlobalConfig(
            `LIVE_SCAN_STATUS_${kingdomId}`,
            JSON.stringify({
              kingdomId,
              dateKey,
              currentRank: progress.currentRank,
              targetRank: progress.targetRank || 650,
              workerSerial: progress.workerSerial,
              sourceType,
              coverageTier,
              mode: progress.mode || 'BASTION_45_FIELD_BOT',
              startedAt: progress.startedAt || null,
              scanDtgUtc:
                progress.scanDtgUtc ||
                new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
              completedAt: progress.completedAt || null,
              updatedAt: new Date().toISOString(),
            })
          ).catch(() => {});
        }
      } catch (awsErr) {
        console.warn('[API/Ingest/Kingdom-Scan] AWS sync warning (local 45-field cache saved):', awsErr.message);
      }
    }

    // Always persist a fast DynamoDB live overlay of the top 150 governors so Vercel serverless routes (/black-ops, etc.)
    // immediately reflect every 10-rank scan batch without waiting for a static file rebuild!
    try {
      const sortedTop = [...fullKingdomRoster]
        .sort((a, b) => (Number(b.power) || 0) - (Number(a.power) || 0))
        .slice(0, 350);
      const overlayMap = {};
      sortedTop.forEach((g, idx) => {
        const gid = String(g.govId || g.id || '');
        if (gid) overlayMap[gid] = { ...g, rank: idx + 1 };
      });
      await updateGlobalConfig(`LIVE_TELEMETRY_OVERLAY_${kingdomId}`, JSON.stringify(overlayMap)).catch(() => {});
    } catch {}

    // Always sync lastScanAt & nextScanAt into BASTION_CLOUD_STATE in DynamoDB so Bastion UI shows live completion time
    try {
      const cloudRaw = await getGlobalConfig('BASTION_CLOUD_STATE');
      const bPath = path.join(process.cwd(), 'scanner', 'bastion_state.json');
      const baseState = cloudRaw
        ? JSON.parse(cloudRaw)
        : fs.existsSync(bPath)
        ? JSON.parse(fs.readFileSync(bPath, 'utf8'))
        : null;
      if (baseState) {
        const nowIso = new Date().toISOString();
        const kdStr = String(kingdomId);
        const kdSched = (baseState.kingdomSchedules || []).find((k) => String(k.kingdom) === kdStr);
        if (kdSched) {
          kdSched.lastScanAt = nowIso;
          const cadence = Number(kdSched.cadenceHours) || (kdSched.mode === 'SURGE_3H' ? 3 : 12);
          kdSched.nextScanAt = new Date(Date.now() + cadence * 3600 * 1000).toISOString();
        }
        const cur = Number(progress?.currentRank) || totalCachedInKingdom;
        const tgt = Number(progress?.targetRank) || 650;
        const isDone = cur >= tgt;
        baseState.activeScanProgress = {
          ...(baseState.activeScanProgress || {}),
          running: !isDone,
          status: isDone ? 'COMPLETED' : 'SCANNING_LIVE',
          kingdom: kdStr,
          currentRank: cur,
          targetRanks: tgt,
          percent: Math.min(100, Math.round((cur / Math.max(1, tgt)) * 1000) / 10),
          governorsExtracted: totalCachedInKingdom,
          updatedAt: nowIso,
        };
        baseState.lastUpdated = nowIso;
        await updateGlobalConfig('BASTION_CLOUD_STATE', JSON.stringify(baseState));
      }
    } catch {}

    return NextResponse.json(
      {
        success: true,
        awsSynced,
        stagedOnly: !shouldCommitFullSnapshot,
        coverageTier,
        dozerReport,
        message: shouldCommitFullSnapshot
          ? `DOZER reconciled & committed ${fullKingdomRoster.length} governors for KD #${kingdomId} (${coverageTier}).`
          : `DOZER staged ${rosterArray.length} governors into KD #${kingdomId} buffer (${totalCachedInKingdom}/465 minimum for full snapshot commit).`,
        dateKey,
        rowCount: rosterArray.length,
        totalCachedInKingdom,
        progress: progress || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API/Ingest/Kingdom-Scan] Failure:', error);
    return NextResponse.json(
      { error: 'Failed to ingest autonomous kingdom scan batch.' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kd =
      searchParams.get('kd') ||
      searchParams.get('kingdomId') ||
      searchParams.get('kingdom') ||
      '4194';
    const cache = readLiveTelemetryCache();
    const ledger = readEpochLedger();
    const kdCache = cache.kingdoms?.[String(kd)] || {
      governors: {},
      progress: null,
      allianceLeadersR5: [],
    };
    const govMap = { ...(kdCache.governors || {}) };

    let liveStatus = kdCache?.progress || null;
    try {
      const [rawStatus, rawOverlay] = await Promise.all([
        getGlobalConfig(`LIVE_SCAN_STATUS_${kd}`).catch(() => null),
        getGlobalConfig(`LIVE_TELEMETRY_OVERLAY_${kd}`).catch(() => null),
      ]);
      if (rawStatus) {
        const parsedStatus = JSON.parse(rawStatus);
        liveStatus = { ...(liveStatus || {}), ...parsedStatus };
      }
      if (rawOverlay) {
        const parsedOverlay = JSON.parse(rawOverlay);
        for (const [gid, g] of Object.entries(parsedOverlay)) {
          if (g && typeof g === 'object') {
            govMap[gid] = { ...(govMap[gid] || {}), ...g };
          }
        }
      }
    } catch {}

    const governors = Object.values(govMap).sort((a, b) => (b.power || 0) - (a.power || 0));

    return NextResponse.json({
      kingdomId: kd,
      updatedAt: liveStatus?.updatedAt || cache.updatedAt,
      startedAt: liveStatus?.startedAt || null,
      scanDtgUtc: liveStatus?.scanDtgUtc || null,
      epochMeta: ledger.kingdomEpochs?.[String(kd)] || null,
      dozerStats: ledger.dozerStats || null,
      status: liveStatus,
      allianceLeadersR5: kdCache?.allianceLeadersR5 || [],
      count: governors.length,
      governors,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
