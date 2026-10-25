import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const LOCAL_BB_PATH = path.join(process.cwd(), 'scanner', 'swarm_4197_blackbox.json');
const HUB_EXEC_URL = 'http://127.0.0.1:8888/exec';

const REGION = process.env.BASTION_AWS_REGION || 'us-east-2';
const CONTROL_TABLE = process.env.BASTION_CONTROL_TABLE || 'BastionControl';
const db = new DynamoDBClient({ region: REGION });

async function readCloudBlackBox() {
  try {
    const res = await db.send(
      new GetItemCommand({
        TableName: CONTROL_TABLE,
        Key: { control_key: { S: 'SWARM_4197_BLACKBOX' } },
        ConsistentRead: true,
      })
    );
    const raw = res.Item?.payload_json?.S;
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[SWARM-BLACKBOX] DynamoDB read error:', e.message);
  }
  return null;
}

async function writeCloudBlackBox(stateObj) {
  try {
    await db.send(
      new PutItemCommand({
        TableName: CONTROL_TABLE,
        Item: {
          control_key: { S: 'SWARM_4197_BLACKBOX' },
          updated_at: { S: new Date().toISOString() },
          payload_json: { S: JSON.stringify(stateObj) },
        },
      })
    );
    return true;
  } catch (e) {
    console.error('[SWARM-BLACKBOX] DynamoDB write error:', e.message);
    return false;
  }
}

async function queueCloudSwarmCommand(cmdObj) {
  try {
    await db.send(
      new PutItemCommand({
        TableName: CONTROL_TABLE,
        Item: {
          control_key: { S: 'SWARM_4197_CMD' },
          updated_at: { S: new Date().toISOString() },
          payload_json: { S: JSON.stringify(cmdObj) },
        },
      })
    );
    return true;
  } catch (e) {
    console.error('[SWARM-BLACKBOX] DynamoDB cmd error:', e.message);
    return false;
  }
}

function buildFallbackState() {
  const now = new Date().toISOString();
  return {
    kingdom: '4197',
    kingdomName: 'Kingdom of Belerion',
    mode: 'SWARM_ROTATION_T1_ONLY',
    strictT1Only: true,
    updatedAt: now,
    summary: {
      totalBotsIn4197: 3,
      activeInstances: 3,
      totalT1Trained: 7200,
      estimatedKpPool: 1440,
      hostileScoutsCount: 0,
      hostileAttacksCount: 0,
      totalMovementsLogged: 1,
    },
    instances: {
      '16384': {
        instanceId: 'sidekick-mumu-0',
        label: 'INSTANCE 01 (ALPHA)',
        adb: '127.0.0.1:16384',
        port: '16384',
        vmIndex: 0,
        kingdom: '4197',
        activeGovernorName: 'Belerion-Alpha-16384',
        activeGovernorId: '',
        allianceTag: '3vil',
        cityHallLevel: 8,
        power: 14200,
        killPoints: 0,
        status: 'ACTIVE_IN_4197',
        currentTask: 'Rotating into #4197 — Training T1 ONLY & Farming RSS',
        currentBuilding: 'City Hall / Resource Queue',
        currentFarming: { resource: 'FOOD', label: 'FOOD (Cropland)', nodeX: 0, nodeY: 0, status: 'GATHERING' },
        currentTraining: {
          policy: 'T1 ONLY',
          infantry: 'T1 Swordsman (Active)',
          archer: 'T1 Bowman (Active)',
          cavalry: 'T1 Horseman (Active)',
          siege: 'T1 Battering Ram (Active)',
          lastTrainedUnit: 'T1 Swordsman (Infantry)',
          t1BatchesCompleted: 1,
          estimatedT1Troops: 2400,
        },
        rssBags: { food: '90.0K', wood: '94.5K', stone: '350', gold: '0', gems: '350' },
        coordinates: { kingdom: '4197', x: 0, y: 0 },
        roster4197: [{ kingdom: '4197', active: true, label: '#4197 Slot 1' }],
        legalSlotsMax: 2,
        shiftStartedAt: now,
        nextRotationAt: new Date(Date.now() + 1800000).toISOString(),
        sleepStatus: 'AWAKE (ACTIVE SHIFT)',
        lastWatchtowerAlert: null,
        screenPreviewB64: '',
        updatedAt: now,
      },
      '16416': {
        instanceId: 'sidekick-mumu-1',
        label: 'INSTANCE 02 (BRAVO)',
        adb: '127.0.0.1:16416',
        port: '16416',
        vmIndex: 1,
        kingdom: '4197',
        activeGovernorName: 'Belerion-Bravo-16416',
        activeGovernorId: '',
        allianceTag: '',
        cityHallLevel: 8,
        power: 16800,
        killPoints: 0,
        status: 'ACTIVE_IN_4197',
        currentTask: 'Active in #4197 — Training T1 ONLY & Farming WOOD',
        currentBuilding: 'Barracks / Lumber Mill Queue',
        currentFarming: { resource: 'WOOD', label: 'WOOD (Logging Camp)', nodeX: 0, nodeY: 0, status: 'GATHERING' },
        currentTraining: {
          policy: 'T1 ONLY',
          infantry: 'T1 Swordsman (Active)',
          archer: 'T1 Bowman (Active)',
          cavalry: 'T1 Horseman (Active)',
          siege: 'T1 Battering Ram (Active)',
          lastTrainedUnit: 'T1 Bowman (Archer)',
          t1BatchesCompleted: 1,
          estimatedT1Troops: 2400,
        },
        rssBags: { food: '210K', wood: '240K', stone: '110K', gold: '30K', gems: '500' },
        coordinates: { kingdom: '4197', x: 0, y: 0 },
        roster4197: [{ kingdom: '4197', active: true, label: '#4197 Slot 1' }],
        legalSlotsMax: 2,
        shiftStartedAt: now,
        nextRotationAt: new Date(Date.now() + 1800000).toISOString(),
        sleepStatus: 'AWAKE (ACTIVE SHIFT)',
        lastWatchtowerAlert: null,
        screenPreviewB64: '',
        updatedAt: now,
      },
      '16448': {
        instanceId: 'sidekick-mumu-2',
        label: 'INSTANCE 03 (CHARLIE)',
        adb: '127.0.0.1:16448',
        port: '16448',
        vmIndex: 2,
        kingdom: '4197',
        activeGovernorName: 'Governor236737719',
        activeGovernorId: '236737719',
        allianceTag: '',
        cityHallLevel: 5,
        power: 4385,
        killPoints: 0,
        status: 'ACTIVE_IN_4197',
        currentTask: 'Active in #4197 — Training T1 ONLY & Farming STONE',
        currentBuilding: 'City Hall / Resource Queue',
        currentFarming: { resource: 'STONE', label: 'STONE (Stone Deposit)', nodeX: 0, nodeY: 0, status: 'GATHERING' },
        currentTraining: {
          policy: 'T1 ONLY',
          infantry: 'T1 Swordsman (Active)',
          archer: 'T1 Bowman (Active)',
          cavalry: 'T1 Horseman (Active)',
          siege: 'T1 Battering Ram (Active)',
          lastTrainedUnit: 'T1 Battering Ram (Siege)',
          t1BatchesCompleted: 1,
          estimatedT1Troops: 2400,
        },
        rssBags: { food: '93.8K', wood: '97.6K', stone: '550', gold: '0', gems: '550' },
        coordinates: { kingdom: '4197', x: 125, y: 564 },
        roster4197: [{ kingdom: '4197', active: true, label: '#4197 Slot 1' }],
        legalSlotsMax: 2,
        shiftStartedAt: now,
        nextRotationAt: new Date(Date.now() + 1800000).toISOString(),
        sleepStatus: 'AWAKE (ACTIVE SHIFT)',
        lastWatchtowerAlert: null,
        screenPreviewB64: '',
        updatedAt: now,
      },
    },
    threats: [],
    movements: [],
  };
}

async function requireSuperAdminOrAgent(request, requireWrite = false) {
  try {
    const agentSecret = request?.headers?.get?.('x-bastion-secret');
    if (agentSecret && process.env.BASTION_AGENT_SECRET && agentSecret === process.env.BASTION_AGENT_SECRET) {
      return true;
    }
    const session = await auth();
    if (session?.user?.isSuperAdmin) {
      if (requireWrite && session?.user?.isSuperAdminReadOnly) return false;
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

export async function GET(request) {
  try {
    if (!(await requireSuperAdminOrAgent(request))) {
      return NextResponse.json({ ok: false, error: 'SuperAdmin clearance required' }, { status: 403 });
    }

    // 1. Read directly from DynamoDB BastionControl (us-east-2) — fast (<50ms) and works on both Vercel Cloud & Local
    const cloudData = await readCloudBlackBox();
    if (cloudData && cloudData.instances) {
      return NextResponse.json({ ok: true, source: 'BASTION_DYNAMO_LIVE', data: cloudData });
    }

    // 2. Fallback: Check local cached file on MIXERV3
    if (fs.existsSync(LOCAL_BB_PATH)) {
      try {
        const localRaw = fs.readFileSync(LOCAL_BB_PATH, 'utf8');
        const parsed = JSON.parse(localRaw);
        return NextResponse.json({ ok: true, source: 'LOCAL_CACHE', data: parsed });
      } catch {}
    }

    return NextResponse.json({ ok: true, source: 'FALLBACK_INIT', data: buildFallbackState() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!(await requireSuperAdminOrAgent(request, true))) {
      return NextResponse.json({ ok: false, error: 'SuperAdmin Write clearance required (Read-Only cannot mutate Swarm state)' }, { status: 403 });
    }
    const body = await request.json();

    // Case 1: Full state push from SIDEKICK orchestrator
    if (body && body.mode === 'SWARM_ROTATION_T1_ONLY' && body.instances) {
      try {
        fs.writeFileSync(LOCAL_BB_PATH, JSON.stringify(body, null, 2), 'utf8');
      } catch {}
      await writeCloudBlackBox(body);
      return NextResponse.json({ ok: true, saved: true });
    }

    // Case 2: Operator Action triggered from Graphical Command Deck (works on both Vercel Cloud and LAN)
    const { action, port = '16448' } = body || {};
    const cmdObj = {
      cmdId: `swarm_cmd_${Date.now()}`,
      action,
      port,
      queuedAt: new Date().toISOString(),
    };
    await queueCloudSwarmCommand(cmdObj);

    const adb = `127.0.0.1:${port}`;
    let psCmd = '';
    if (action === 'RESTART_SWARM') {
      psCmd = `
        Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*swarm_4197_orchestrator.py*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        $p = Start-Process -FilePath "C:\\UnityScanner\\.venv\\Scripts\\python.exe" -ArgumentList "-u","C:\\UnityScanner\\swarm_4197_orchestrator.py" -WorkingDirectory "C:\\UnityScanner" -RedirectStandardOutput "C:\\UnityScanner\\swarm_4197.log" -RedirectStandardError "C:\\UnityScanner\\swarm_4197_err.log" -PassThru -WindowStyle Hidden
        Write-Output "Restarted #4197 Swarm Orchestrator PID=$($p.Id)"
      `;
    } else if (action === 'PROVISION_SECOND_4197') {
      psCmd = `
        Start-Process -FilePath "C:\\UnityScanner\\.venv\\Scripts\\python.exe" -ArgumentList "-u","C:\\UnityScanner\\provision_neighbor_kingdom.py","--adb","${adb}","--kingdom","4197","--steps","120" -WorkingDirectory "C:\\UnityScanner" -WindowStyle Hidden
        Write-Output "Triggered #4197 Character Provision/Switch on ${adb}"
      `;
    } else if (action === 'FORCE_BUILDER_BURST') {
      psCmd = `
        Start-Process -FilePath "C:\\UnityScanner\\.venv\\Scripts\\python.exe" -ArgumentList "-u","C:\\UnityScanner\\auto_tutorial_ch8.py","--adb","${adb}","--kingdom","4197","--steps","35" -WorkingDirectory "C:\\UnityScanner" -WindowStyle Hidden
        Write-Output "Triggered 35-step T1-ONLY Builder Burst on ${adb}"
      `;
    }

    if (psCmd) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 4000);
        await fetch(HUB_EXEC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: psCmd, async: true }),
          signal: controller.signal,
        });
        clearTimeout(t);
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      action,
      port,
      output: `Queued ${action} for :${port} via BastionControl DynamoDB & Cluster Hub`,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
