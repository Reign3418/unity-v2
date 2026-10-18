import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadKingdomRoster, getGlobalConfig, updateGlobalConfig } from '@/lib/awsDynamo';
import { randomUUID } from 'crypto';

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
        { error: 'Unauthorized scanner request. Supply valid x-unity-scanner-key or Leader session.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { kingdomId, rosterArray, scanDateOverride, progress } = body;

    if (!kingdomId || !Array.isArray(rosterArray) || rosterArray.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: kingdomId and non-empty rosterArray are required.' },
        { status: 400 }
      );
    }

    const uploaderData = {
      discordId: session?.user?.id || 'NODE2_ADB_CLUSTER',
      username: session?.user?.username || `Node2_ADB_${progress?.workerSerial || 'Worker'}`,
      sourceFile: `Node2_Autonomous_Scan_KD${kingdomId}`,
      importTag: `ADB_${randomUUID().split('-')[0].toUpperCase()}`,
    };

    const dateKey = await uploadKingdomRoster(kingdomId, rosterArray, uploaderData, scanDateOverride);

    if (progress) {
      await updateGlobalConfig(
        `LIVE_SCAN_STATUS_${kingdomId}`,
        JSON.stringify({
          kingdomId,
          dateKey,
          currentRank: progress.currentRank,
          targetRank: progress.targetRank,
          workerSerial: progress.workerSerial,
          updatedAt: new Date().toISOString(),
        })
      ).catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        message: `Ingested ${rosterArray.length} governors for KD #${kingdomId} (${dateKey}).`,
        dateKey,
        rowCount: rosterArray.length,
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
    const session = await auth();
    const authorized = await isAuthorizedScanner(req, session);
    if (!authorized && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const kd = searchParams.get('kd') || '3418';
    const raw = await getGlobalConfig(`LIVE_SCAN_STATUS_${kd}`);
    return NextResponse.json({
      kingdomId: kd,
      status: raw ? JSON.parse(raw) : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
