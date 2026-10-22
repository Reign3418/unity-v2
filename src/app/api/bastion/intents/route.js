import { NextResponse } from 'next/server';
import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { auth } from '@/lib/auth';

/**
 * Step 7 — Unity R5 & Demand Intake API (/api/bastion/intents).
 *   GET  ?kingdomId=4194 -> returns live Bastion verification status, stationed bots, cadence,
 *                           and the 5-stage Mission Pipeline (PENDING -> TRIAGED_BY_SCOUT ->
 *                           PLANNED_BY_TANK -> IN_PROGRESS -> VERIFIED_BY_AUDIT) for that kingdom.
 *   POST -> R5 / Leader / SuperAdmin intent submission (SCAN_KINGDOM, LOCATE_GOVERNOR,
 *           EXPAND_TO_KINGDOM, PRIORITIZE_GROWTH) into BastionIntents for Ring 1 (KENT).
 */

export const dynamic = 'force-dynamic';

const REGION = process.env.BASTION_AWS_REGION || 'us-east-2';
const CONTROL_TABLE = process.env.BASTION_CONTROL_TABLE || 'BastionControl';
const BOTS_TABLE = process.env.BASTION_BOTS_TABLE || 'BastionBots';
const INTENTS_TABLE = process.env.BASTION_INTENTS_TABLE || 'BastionIntents';
const VALID_INTENT_TYPES = ['SCAN_KINGDOM', 'LOCATE_GOVERNOR', 'EXPAND_TO_KINGDOM', 'PRIORITIZE_GROWTH'];
const VALID_SOURCES = ['R5_COMMAND_DESK', 'UNITY_API_DEMAND', 'DATA_LEAD_INGEST', 'OPERATOR_OVERRIDE'];

const db = new DynamoDBClient({ region: REGION });

function unmarshallValue(v) {
  if (v == null) return null;
  if ('S' in v) return v.S;
  if ('N' in v) return Number(v.N);
  if ('BOOL' in v) return v.BOOL;
  if ('NULL' in v) return null;
  if ('M' in v) return unmarshall(v.M);
  if ('L' in v) return v.L.map(unmarshallValue);
  if ('SS' in v) return [...v.SS];
  if ('NS' in v) return v.NS.map(Number);
  return null;
}

function unmarshall(item) {
  if (!item) return null;
  const out = {};
  for (const [k, v] of Object.entries(item)) out[k] = unmarshallValue(v);
  return out;
}

function marshallValue(v) {
  if (v === null || v === undefined) return { NULL: true };
  if (typeof v === 'string') return { S: v };
  if (typeof v === 'number') return { N: String(v) };
  if (typeof v === 'boolean') return { BOOL: v };
  if (Array.isArray(v)) return { L: v.map(marshallValue) };
  if (typeof v === 'object') {
    const m = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) m[k] = marshallValue(val);
    }
    return { M: m };
  }
  return { S: String(v) };
}

function marshall(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = marshallValue(v);
  }
  return out;
}

async function getControl(key) {
  const res = await db.send(
    new GetItemCommand({ TableName: CONTROL_TABLE, Key: { control_key: { S: key } }, ConsistentRead: true })
  );
  return unmarshall(res.Item);
}

async function getBot(botId) {
  const res = await db.send(
    new GetItemCommand({ TableName: BOTS_TABLE, Key: { bot_id: { S: botId } }, ConsistentRead: true })
  );
  return unmarshall(res.Item);
}

async function queryIntentsByStatus(status, limit = 25) {
  try {
    const res = await db.send(
      new QueryCommand({
        TableName: INTENTS_TABLE,
        IndexName: 'status-index',
        KeyConditionExpression: '#s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': { S: status } },
        ScanIndexForward: false,
        Limit: limit,
      })
    );
    return (res.Items || []).map(unmarshall);
  } catch {
    return [];
  }
}

async function requireLeaderOrAdmin() {
  try {
    const session = await auth();
    if (session?.user && (session.user.isSuperAdmin || session.user.isLeader || session.user.isValheonFounder)) {
      return session;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export async function GET(request) {
  const session = await requireLeaderOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'R5 / Kingdom Leader or SuperAdmin clearance required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kingdomIdParam = searchParams.get('kingdomId');
  const kingdomId = kingdomIdParam ? Number(kingdomIdParam) : null;

  try {
    const [heartbeat, fleet, config, kdRecord, pList, tList, plList, ipList, vList, fList, rList] = await Promise.all([
      getControl('BRAIN_HEARTBEAT'),
      getControl('FLEET'),
      getControl('CONFIG'),
      kingdomId ? getControl(`KINGDOM#${kingdomId}`) : Promise.resolve(null),
      queryIntentsByStatus('PENDING', 20),
      queryIntentsByStatus('TRIAGED_BY_SCOUT', 20),
      queryIntentsByStatus('PLANNED_BY_TANK', 20),
      queryIntentsByStatus('IN_PROGRESS', 20),
      queryIntentsByStatus('VERIFIED_BY_AUDIT', 25),
      queryIntentsByStatus('FAILED', 15),
      queryIntentsByStatus('REJECTED', 10),
    ]);

    const botIds = fleet?.bot_ids || [];
    const rawBots = await Promise.all(botIds.slice(0, 50).map((id) => getBot(id)));
    const allBots = rawBots.filter(Boolean);
    const stationedBots = kingdomId
      ? allBots.filter((b) => Number(b.kingdom_id) === kingdomId && b.lifecycle_state !== 'RETIRED')
      : allBots;

    const watchedEntry = kingdomId
      ? (config?.watched_kingdoms || []).find((w) => Number(w.kingdom_id) === kingdomId) || null
      : null;

    const allIntents = [...ipList, ...plList, ...tList, ...pList, ...vList, ...fList, ...rList].sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );
    const intents = kingdomId ? allIntents.filter((i) => Number(i.kingdom_id) === kingdomId) : allIntents;

    const nowMs = Date.now();
    const brainOnline = Boolean(heartbeat?.ts && nowMs - new Date(heartbeat.ts).getTime() < 180000);

    return NextResponse.json({
      kingdomId,
      brainOnline,
      effectiveMode: heartbeat?.mode || 'SUPERVISED',
      lastTickAt: heartbeat?.ts || null,
      kingdomRecord: kdRecord || (kingdomId ? { control_key: `KINGDOM#${kingdomId}`, last_scan_verified_at: null } : null),
      cadence: watchedEntry,
      stationedBots: stationedBots.map((b) => ({
        bot_id: b.bot_id,
        governor_name: b.governor_name,
        governor_id: b.governor_id,
        instance_id: b.instance_id,
        lifecycle_state: b.lifecycle_state,
        verified_state: b.verified_state,
        isActiveOnInstance: fleet?.active_by_instance?.[b.instance_id] === b.bot_id,
      })),
      intents: intents.slice(0, 25),
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: `Bastion intake unavailable: ${err?.name || 'Error'}` }, { status: 502 });
  }
}

export async function POST(request) {
  const session = await requireLeaderOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'R5 / Kingdom Leader or SuperAdmin clearance required' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const kingdomId = Number(body?.kingdom_id);
  if (!Number.isInteger(kingdomId) || kingdomId < 1000 || kingdomId > 9999) {
    return NextResponse.json({ error: 'kingdom_id must be a 4-digit integer (1000-9999)' }, { status: 400 });
  }

  const isSuper = Boolean(session.user?.isSuperAdmin || session.user?.isValheonFounder);
  const allowedKds = (session.user?.allowedKingdoms || []).map((k) => Number(k));
  if (!isSuper && allowedKds.length > 0 && !allowedKds.includes(kingdomId)) {
    return NextResponse.json(
      { error: `R5 clearance is scoped to Kingdom(s) ${allowedKds.join(', ')}. Cannot dispatch missions for #${kingdomId}.` },
      { status: 403 }
    );
  }

  const intentType = VALID_INTENT_TYPES.includes(body?.intent_type) ? body.intent_type : 'SCAN_KINGDOM';
  const source = VALID_SOURCES.includes(body?.source)
    ? body.source
    : isSuper && body?.source === 'OPERATOR_OVERRIDE'
    ? 'OPERATOR_OVERRIDE'
    : 'R5_COMMAND_DESK';

  // Deduplicate active intents for the same (kingdom_id, intent_type)
  const [pList, tList, plList, ipList] = await Promise.all([
    queryIntentsByStatus('PENDING', 20),
    queryIntentsByStatus('TRIAGED_BY_SCOUT', 20),
    queryIntentsByStatus('PLANNED_BY_TANK', 20),
    queryIntentsByStatus('IN_PROGRESS', 20),
  ]);
  const existingActive = [...pList, ...tList, ...plList, ...ipList].find(
    (i) => Number(i.kingdom_id) === kingdomId && i.intent_type === intentType
  );
  if (existingActive) {
    return NextResponse.json({
      ok: true,
      deduped: true,
      intent: existingActive,
    });
  }

  const maxRanks = Math.max(10, Math.min(1000, Number(body?.max_ranks || 650)));
  const defaultPrio = intentType === 'EXPAND_TO_KINGDOM' ? 88 : intentType === 'LOCATE_GOVERNOR' ? 85 : 85;
  const priority = Math.max(1, Math.min(100, Number(body?.priority || defaultPrio)));
  const requestedBy = String(session.user?.email || session.user?.name || 'r5_leader').slice(0, 120);
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const tag = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const payloadObj = {
    requested_by: requestedBy,
    ...(intentType === 'SCAN_KINGDOM' || intentType === 'LOCATE_GOVERNOR' ? { max_ranks: maxRanks } : {}),
    ...(body?.target_governor_id ? { target_governor_id: String(body.target_governor_id).trim().slice(0, 32) } : {}),
    ...(body?.target_governor_name ? { target_governor_name: String(body.target_governor_name).trim().slice(0, 64) } : {}),
    ...(intentType === 'EXPAND_TO_KINGDOM' ? { cadence_hours: Math.max(1, Math.min(72, Number(body?.cadence_hours || 12))) } : {}),
    ...(intentType === 'PRIORITIZE_GROWTH' ? { max_steps: Math.max(5, Math.min(60, Number(body?.max_steps || 40))) } : {}),
  };

  const intent = {
    intent_id: `int_r5_${tag}`,
    correlation_id: `corr_r5_${tag}`,
    created_at: nowIso,
    source,
    intent_type: intentType,
    kingdom_id: kingdomId,
    priority,
    status: 'PENDING',
    payload: payloadObj,
  };

  await db.send(
    new PutItemCommand({
      TableName: INTENTS_TABLE,
      Item: marshall(intent),
    })
  );

  return NextResponse.json({
    ok: true,
    deduped: false,
    intent,
  });
}
