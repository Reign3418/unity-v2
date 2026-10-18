import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGlobalConfig, updateGlobalConfig } from '@/lib/awsDynamo';

export const maxDuration = 300;

async function isAuthorizedScanner(req, session) {
  if (session?.user?.isLeader || session?.user?.isSuperAdmin) {
    return true;
  }
  const headerKey = req.headers.get('x-unity-scanner-key');
  if (!headerKey) return false;
  const configuredKey =
    process.env.UNITY_SCANNER_KEY ||
    (await getGlobalConfig('UNITY_SCANNER_KEY')) ||
    'unity-local-node2-telemetry';
  return headerKey === configuredKey;
}

export async function POST(req) {
  try {
    const session = await auth();
    const authorized = await isAuthorizedScanner(req, session);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized rally watcher request.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { kingdomId, allianceTag, rallies } = body;

    if (!kingdomId || !Array.isArray(rallies)) {
      return NextResponse.json(
        { error: 'Invalid payload: kingdomId and rallies array required.' },
        { status: 400 }
      );
    }

    const configKey = `LIVE_RALLIES_${kingdomId}`;
    const existingRaw = await getGlobalConfig(configKey);
    let history = [];
    if (existingRaw) {
      try {
        history = JSON.parse(existingRaw).history || [];
      } catch (_e) {
        history = [];
      }
    }

    const nowIso = new Date().toISOString();
    const enriched = rallies.map((r) => ({
      ...r,
      kingdomId: String(kingdomId),
      allianceTag: allianceTag || 'ALL',
      ingestedAt: nowIso,
    }));

    // Merge and keep most recent 200 rally snapshots
    const mergedHistory = [...enriched, ...history].slice(0, 200);

    // Aggregate per-launcher fort/rally counts
    const launcherTotals = {};
    for (const item of mergedHistory) {
      const name = item.launcherName || 'Unknown';
      launcherTotals[name] = (launcherTotals[name] || 0) + 1;
    }

    const statePayload = {
      kingdomId: String(kingdomId),
      allianceTag: allianceTag || 'ALL',
      updatedAt: nowIso,
      activeRallies: enriched,
      launcherTotals,
      history: mergedHistory,
    };

    await updateGlobalConfig(configKey, JSON.stringify(statePayload));

    return NextResponse.json({
      success: true,
      message: `Synced ${enriched.length} active rallies for KD #${kingdomId} [${allianceTag || 'ALL'}].`,
      updatedAt: nowIso,
    });
  } catch (error) {
    console.error('[API/Ingest/Rallies] Failure:', error);
    return NextResponse.json({ error: 'Failed to ingest rally feed.' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await auth();
    const authorized = await isAuthorizedScanner(req, session);
    if (!authorized && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kd = searchParams.get('kd') || '3418';
    const raw = await getGlobalConfig(`LIVE_RALLIES_${kd}`);
    return NextResponse.json(
      raw
        ? JSON.parse(raw)
        : {
            kingdomId: kd,
            updatedAt: null,
            activeRallies: [],
            launcherTotals: {},
            history: [],
          }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
