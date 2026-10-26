import { NextResponse } from 'next/server';
import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { auth } from '@/lib/auth';

/**
 * Bastion Brain Command & Oversight API (Step 4+).
 *   GET  -> brain heartbeat, requested mode, fleet, config, bots, accountSlots, instance states,
 *           bot runtimes, watched kingdom verification timestamps, active intents, and oversight events.
 *   POST -> SuperAdmin controls:
 *           - { action: 'SET_MODE', mode }
 *           - { action: 'SUBMIT_INTENT', intent_type: 'SCAN_KINGDOM', kingdom_id, priority, max_ranks }
 *           - { action: 'SET_ACTIVE_BOT', instance_id, bot_id }
 *           - { action: 'SET_KINGDOM_CADENCE', kingdom_id, cadence_hours, source }
 * Unity never directly mutates BastionBots or BastionEvents: Ring 3 (AUDIT) is the sole writer of verified bot state.
 */

export const dynamic = 'force-dynamic';

const REGION = process.env.BASTION_AWS_REGION || 'us-east-2';
const CONTROL_TABLE = process.env.BASTION_CONTROL_TABLE || 'BastionControl';
const BOTS_TABLE = process.env.BASTION_BOTS_TABLE || 'BastionBots';
const SLOTS_TABLE = process.env.BASTION_ACCOUNT_SLOTS_TABLE || 'BastionAccountSlots';
const INTENTS_TABLE = process.env.BASTION_INTENTS_TABLE || 'BastionIntents';
const EVENTS_TABLE = process.env.BASTION_EVENTS_TABLE || 'BastionEvents';
const VALID_MODES = ['OFF', 'DRY_RUN', 'SUPERVISED', 'AUTONOMOUS'];
const VALID_INSTANCES = ['sidekick-mumu-0', 'sidekick-mumu-1', 'sidekick-mumu-2'];
const DEFAULT_ACCOUNT_IDS = ['mumu-account-0', 'mumu-account-1', 'mumu-account-2'];
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

async function getBot(botId) {
  const res = await db.send(
    new GetItemCommand({ TableName: BOTS_TABLE, Key: { bot_id: { S: botId } }, ConsistentRead: true })
  );
  return unmarshall(res.Item);
}

async function getAccountSlot(accountId) {
  const res = await db.send(
    new GetItemCommand({ TableName: SLOTS_TABLE, Key: { account_id: { S: accountId } }, ConsistentRead: true })
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

export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'SuperAdmin clearance required' }, { status: 403 });
  }
  try {
    const [mode, heartbeat, fleet, config, helpersCtrl, ringBudgetCtrl, approvedPlansCtrl, brainLease, brainNodesCtrl, safetyStateCtrl, contextStateCtrl, sidekickWatchdogCtrl, swarmBbCtrl] =
      await Promise.all([
        getControl('MODE'),
        getControl('BRAIN_HEARTBEAT'),
        getControl('FLEET'),
        getControl('CONFIG'),
        getControl('HELPERS'),
        getControl('RING_BUDGET'),
        getControl('APPROVED_PLANS'),
        getControl('BRAIN_LEASE'),
        getControl('BRAIN_NODES'),
        getControl('SAFETY_STATE'),
        getControl('CONTEXT_STATE'),
        getControl('WATCHDOG#sidekick'),
        getControl('SWARM_4197_BLACKBOX'),
      ]);

    let swarmBlackbox = null;
    if (swarmBbCtrl?.payload_json) {
      try {
        swarmBlackbox = JSON.parse(swarmBbCtrl.payload_json);
      } catch {
        swarmBlackbox = null;
      }
    } else if (swarmBbCtrl?.instances) {
      swarmBlackbox = swarmBbCtrl;
    }

    const botIds = fleet?.bot_ids || [];
    const accountIds = fleet?.account_ids || DEFAULT_ACCOUNT_IDS;
    const instanceIds = config?.instances || VALID_INSTANCES;
    const watchedKingdoms = config?.watched_kingdoms || [];
    const activeBotIds = Object.values(fleet?.active_by_instance || {}).filter(Boolean);

    const [
      rawBots,
      rawSlots,
      rawInstances,
      rawRuntimes,
      rawKingdoms,
      pendingIntents,
      triagedIntents,
      plannedIntents,
      inProgIntents,
      verifiedIntents,
      failedIntents,
      rejectedIntents,
    ] = await Promise.all([
      Promise.all(botIds.slice(0, 50).map((id) => getBot(id))),
      Promise.all(accountIds.map((id) => getAccountSlot(id))),
      Promise.all(instanceIds.map((inst) => getControl(`INSTANCE#${inst}`))),
      Promise.all(activeBotIds.map((bId) => getControl(`BOTRUNTIME#${bId}`))),
      Promise.all(watchedKingdoms.map((w) => getControl(`KINGDOM#${w.kingdom_id}`))),
      queryIntentsByStatus('PENDING', 20),
      queryIntentsByStatus('TRIAGED_BY_SCOUT', 20),
      queryIntentsByStatus('PLANNED_BY_TANK', 20),
      queryIntentsByStatus('IN_PROGRESS', 20),
      queryIntentsByStatus('VERIFIED_BY_AUDIT', 25),
      queryIntentsByStatus('FAILED', 15),
      queryIntentsByStatus('REJECTED', 10),
    ]);

    const bots = rawBots.filter(Boolean);
    const accountSlots = rawSlots.filter(Boolean);

    const instances = {};
    instanceIds.forEach((inst, idx) => {
      instances[inst] = rawInstances[idx] || { control_key: `INSTANCE#${inst}`, in_flight: null };
    });

    const botRuntimes = {};
    activeBotIds.forEach((bId, idx) => {
      if (rawRuntimes[idx]) botRuntimes[bId] = rawRuntimes[idx];
    });

    const kingdomRecords = {};
    watchedKingdoms.forEach((w, idx) => {
      kingdomRecords[String(w.kingdom_id)] = rawKingdoms[idx] || {
        control_key: `KINGDOM#${w.kingdom_id}`,
        last_scan_verified_at: null,
      };
    });

    const intents = [
      ...inProgIntents,
      ...plannedIntents,
      ...triagedIntents,
      ...pendingIntents,
      ...verifiedIntents,
      ...failedIntents,
      ...rejectedIntents,
    ].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    let events = await queryDay(today, EVENT_LIMIT);
    if (events.length < EVENT_LIMIT) events = events.concat(await queryDay(yesterday, EVENT_LIMIT - events.length));

    return NextResponse.json({
      heartbeat,
      requestedMode: mode,
      brainLease: brainLease || null,
      brainNodes: brainNodesCtrl?.nodes || {},
      safetyState: safetyStateCtrl || null,
      contextState: contextStateCtrl || null,
      sidekickWatchdog: sidekickWatchdogCtrl || null,
      swarmBlackbox,
      fleet,
      config,
      helpers: helpersCtrl?.active || helpersCtrl?.helpers || [],
      ringBudget: ringBudgetCtrl?.rings || {},
      approvedPlans: approvedPlansCtrl?.bot_ids || [],
      bots,
      accountSlots,
      instances,
      botRuntimes,
      kingdomRecords,
      intents,
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

  const setBy = String(session.user?.email || session.user?.name || 'superadmin').slice(0, 120);
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  if (body?.action === 'SET_MODE') {
    if (!VALID_MODES.includes(body?.mode)) {
      return NextResponse.json({ error: `mode must be one of ${VALID_MODES.join(', ')}` }, { status: 400 });
    }
    await db.send(
      new PutItemCommand({
        TableName: CONTROL_TABLE,
        Item: marshall({
          control_key: 'MODE',
          mode: body.mode,
          set_by: setBy,
          set_at: nowIso,
        }),
      })
    );
    return NextResponse.json({ ok: true, action: 'SET_MODE', mode: body.mode });
  }

  if (body?.action === 'SUBMIT_INTENT') {
    const kingdomId = Number(body?.kingdom_id);
    if (!Number.isInteger(kingdomId) || kingdomId < 1000 || kingdomId > 9999) {
      return NextResponse.json({ error: 'kingdom_id must be a 4-digit integer (1000-9999)' }, { status: 400 });
    }
    const validTypes = ['SCAN_KINGDOM', 'LOCATE_GOVERNOR', 'EXPAND_TO_KINGDOM', 'PRIORITIZE_GROWTH'];
    const intentType = validTypes.includes(body?.intent_type) ? body.intent_type : 'SCAN_KINGDOM';
    const validSources = ['R5_COMMAND_DESK', 'UNITY_API_DEMAND', 'DATA_LEAD_INGEST', 'OPERATOR_OVERRIDE'];
    const source = validSources.includes(body?.source) ? body.source : 'OPERATOR_OVERRIDE';
    const maxRanks = Math.max(10, Math.min(1000, Number(body?.max_ranks || 1000)));
    const priority = Math.max(1, Math.min(100, Number(body?.priority || 80)));

    // Deduplicate against currently active intents for the same (kingdom_id, intent_type)
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
        action: 'SUBMIT_INTENT',
        deduped: true,
        intent: existingActive,
      });
    }

    const tag = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const payloadObj = {
      requested_by: setBy,
      ...(intentType === 'SCAN_KINGDOM' || intentType === 'LOCATE_GOVERNOR' ? { max_ranks: maxRanks } : {}),
      ...(body?.target_governor_id ? { target_governor_id: String(body.target_governor_id).slice(0, 32) } : {}),
      ...(body?.target_governor_name ? { target_governor_name: String(body.target_governor_name).slice(0, 64) } : {}),
      ...(intentType === 'EXPAND_TO_KINGDOM' ? { cadence_hours: Number(body?.cadence_hours || 12) } : {}),
      ...(intentType === 'PRIORITIZE_GROWTH' ? { max_steps: Number(body?.max_steps || 40) } : {}),
    };
    const intent = {
      intent_id: `int_ui_${tag}`,
      correlation_id: `corr_ui_${tag}`,
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
    return NextResponse.json({ ok: true, action: 'SUBMIT_INTENT', intent });
  }

  if (body?.action === 'SET_ACTIVE_BOT') {
    const instanceId = String(body?.instance_id || '');
    const botId = String(body?.bot_id || '');
    if (!VALID_INSTANCES.includes(instanceId) || !botId) {
      return NextResponse.json({ error: 'Valid instance_id and bot_id required' }, { status: 400 });
    }
    const [fleet, bot] = await Promise.all([getControl('FLEET'), getBot(botId)]);
    if (!bot) {
      return NextResponse.json({ error: `Bot ${botId} not found in BastionBots` }, { status: 404 });
    }
    if (bot.instance_id !== instanceId) {
      return NextResponse.json(
        { error: `Bot ${botId} belongs to ${bot.instance_id}, cannot bind to ${instanceId}` },
        { status: 400 }
      );
    }
    const updatedFleet = {
      ...(fleet || {}),
      control_key: 'FLEET',
      bot_ids: fleet?.bot_ids || [botId],
      active_by_instance: {
        ...(fleet?.active_by_instance || {}),
        [instanceId]: botId,
      },
      updated_by: setBy,
      updated_at: nowIso,
    };
    await db.send(
      new PutItemCommand({
        TableName: CONTROL_TABLE,
        Item: marshall(updatedFleet),
      })
    );
    return NextResponse.json({ ok: true, action: 'SET_ACTIVE_BOT', instance_id: instanceId, bot_id: botId });
  }

  if (body?.action === 'SET_KINGDOM_CADENCE') {
    const kingdomId = Number(body?.kingdom_id);
    const cadenceHours = Number(body?.cadence_hours);
    if (!Number.isInteger(kingdomId) || kingdomId < 1000 || kingdomId > 9999) {
      return NextResponse.json({ error: 'kingdom_id must be 1000-9999' }, { status: 400 });
    }
    if (!Number.isFinite(cadenceHours) || cadenceHours < 1 || cadenceHours > 72) {
      return NextResponse.json({ error: 'cadence_hours must be 1-72' }, { status: 400 });
    }
    const config = (await getControl('CONFIG')) || {
      capabilities: ['probe_status', 'sleep', 'grow_city'],
      instances: VALID_INSTANCES,
      watched_kingdoms: [],
    };
    const watched = Array.isArray(config.watched_kingdoms) ? [...config.watched_kingdoms] : [];
    const idx = watched.findIndex((w) => Number(w.kingdom_id) === kingdomId);
    const entry = {
      kingdom_id: kingdomId,
      cadence_hours: cadenceHours,
      source: String(body?.source || (cadenceHours <= 3 ? `SURGE_3H (set by ${setBy})` : `STEADY_${cadenceHours}H (set by ${setBy})`)),
    };
    if (idx >= 0) {
      watched[idx] = entry;
    } else {
      watched.push(entry);
    }
    const updatedConfig = {
      ...config,
      control_key: 'CONFIG',
      watched_kingdoms: watched,
      updated_by: setBy,
      updated_at: nowIso,
    };
    await db.send(
      new PutItemCommand({
        TableName: CONTROL_TABLE,
        Item: marshall(updatedConfig),
      })
    );
    return NextResponse.json({ ok: true, action: 'SET_KINGDOM_CADENCE', kingdom: entry });
  }

  if (body?.action === 'APPROVE_HELD_PLAN') {
    const botId = String(body?.bot_id || '').trim();
    if (!botId || !botId.startsWith('bot_')) {
      return NextResponse.json({ error: 'Valid bot_id (bot_*) required' }, { status: 400 });
    }
    const existing = (await getControl('APPROVED_PLANS')) || { control_key: 'APPROVED_PLANS', bot_ids: [] };
    const botIds = Array.from(new Set([...(existing.bot_ids || []), botId]));
    await db.send(
      new PutItemCommand({
        TableName: CONTROL_TABLE,
        Item: marshall({
          control_key: 'APPROVED_PLANS',
          bot_ids: botIds,
          updated_by: setBy,
          updated_at: nowIso,
        }),
      })
    );
    return NextResponse.json({ ok: true, action: 'APPROVE_HELD_PLAN', bot_id: botId, bot_ids: botIds });
  }

  if (body?.action === 'SET_BRAIN_LEASE_OVERRIDE') {
    const validForced = ['AUTO', 'railway-primary', 'sidekick', 'mixerv3'];
    const forcedLeader = String(body?.forced_leader || 'AUTO').trim();
    if (!validForced.includes(forcedLeader)) {
      return NextResponse.json(
        { error: `forced_leader must be one of ${validForced.join(', ')}` },
        { status: 400 }
      );
    }
    const existingLease = (await getControl('BRAIN_LEASE')) || { control_key: 'BRAIN_LEASE' };
    const updatedLease = {
      ...existingLease,
      control_key: 'BRAIN_LEASE',
      forced_leader: forcedLeader,
      updated_by: setBy,
      updated_at: nowIso,
    };
    await db.send(
      new PutItemCommand({
        TableName: CONTROL_TABLE,
        Item: marshall(updatedLease),
      })
    );
    return NextResponse.json({ ok: true, action: 'SET_BRAIN_LEASE_OVERRIDE', forced_leader: forcedLeader });
  }

  return NextResponse.json(
    {
      error:
        'Unsupported action. Expected SET_MODE, SUBMIT_INTENT, SET_ACTIVE_BOT, SET_KINGDOM_CADENCE, APPROVE_HELD_PLAN, or SET_BRAIN_LEASE_OVERRIDE.',
    },
    { status: 400 }
  );
}
