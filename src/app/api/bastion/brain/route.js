import { NextResponse } from 'next/server';
import {
  DynamoDBClient,
  GetItemCommand,
  BatchGetItemCommand,
  QueryCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { auth } from '@/lib/auth';

/**
 * Bastion Brain oversight API (Step 4).
 *   GET  -> brain heartbeat, requested mode, fleet + bots, newest oversight events (SuperAdmin only)
 *   POST -> { action: 'SET_MODE', mode } writes BastionControl MODE; the brain picks it up next tick (SuperAdmin only)
 * Unity never writes bots or events: the brain (Ring 3) is the only writer of bot state and the oversight log.
 */

export const dynamic = 'force-dynamic';

const REGION = process.env.BASTION_AWS_REGION || 'us-east-2';
const CONTROL_TABLE = process.env.BASTION_CONTROL_TABLE || 'BastionControl';
const BOTS_TABLE = process.env.BASTION_BOTS_TABLE || 'BastionBots';
const EVENTS_TABLE = process.env.BASTION_EVENTS_TABLE || 'BastionEvents';
const VALID_MODES = ['OFF', 'DRY_RUN', 'SUPERVISED', 'AUTONOMOUS'];
const EVENT_LIMIT = 150;

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

async function requireSuperAdmin() {
  try {
    const session = await auth();
    if (session?.user?.isSuperAdmin) return session;
  } catch {
    /* fall through */
  }
  return null;
}

async function getControl(key) {
  const res = await db.send(
    new GetItemCommand({ TableName: CONTROL_TABLE, Key: { control_key: { S: key } }, ConsistentRead: true })
  );
  return unmarshall(res.Item);
}

async function queryDay(day, limit) {
  const res = await db.send(
    new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: 'epoch_day = :d',
      ExpressionAttributeValues: { ':d': { S: day } },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return (res.Items || []).map(unmarshall);
}

export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'SuperAdmin clearance required' }, { status: 403 });
  }
  try {
    const [mode, heartbeat, fleet, config] = await Promise.all([
      getControl('MODE'),
      getControl('BRAIN_HEARTBEAT'),
      getControl('FLEET'),
      getControl('CONFIG'),
    ]);

    let bots = [];
    const botIds = fleet?.bot_ids || [];
    if (botIds.length) {
      const res = await db.send(
        new BatchGetItemCommand({
          RequestItems: { [BOTS_TABLE]: { Keys: botIds.slice(0, 100).map((id) => ({ bot_id: { S: id } })) } },
        })
      );
      bots = (res.Responses?.[BOTS_TABLE] || []).map(unmarshall);
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    let events = await queryDay(today, EVENT_LIMIT);
    if (events.length < EVENT_LIMIT) events = events.concat(await queryDay(yesterday, EVENT_LIMIT - events.length));

    return NextResponse.json({
      heartbeat,
      requestedMode: mode,
      fleet,
      config,
      bots,
      events,
      serverTime: now.toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: `Brain state unavailable: ${err?.name || 'Error'}` }, { status: 502 });
  }
}

export async function POST(request) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'SuperAdmin clearance required' }, { status: 403 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (body?.action !== 'SET_MODE' || !VALID_MODES.includes(body?.mode)) {
    return NextResponse.json({ error: `action must be SET_MODE with mode in ${VALID_MODES.join(', ')}` }, { status: 400 });
  }
  const setBy = String(session.user?.email || session.user?.name || 'superadmin').slice(0, 120);
  await db.send(
    new PutItemCommand({
      TableName: CONTROL_TABLE,
      Item: {
        control_key: { S: 'MODE' },
        mode: { S: body.mode },
        set_by: { S: setBy },
        set_at: { S: new Date().toISOString() },
      },
    })
  );
  return NextResponse.json({ ok: true, mode: body.mode });
}
