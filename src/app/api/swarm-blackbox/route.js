import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';
import { getGlobalConfig, updateGlobalConfig } from '@/lib/awsDynamo';

export const dynamic = 'force-dynamic';

const LOCAL_BB_PATH = path.join(process.cwd(), 'scanner', 'swarm_4197_blackbox.json');
const HUB_EXEC_URL = 'http://127.0.0.1:8888/exec';

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
        allianceTag: '',
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
        rssBags: { food: '185K', wood: '190K', stone: '95K', gold: '25K', gems: '450' },
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
        activeGovernorName: 'Belerion-Charlie-16448',
        activeGovernorId: '',
        allianceTag: '',
        cityHallLevel: 8,
        power: 15100,
        killPoints: 0,
        status: 'ACTIVE_IN_4197',
        currentTask: 'Active in #4197 — Training T1 ONLY & Farming STONE',
        currentBuilding: 'City Hall Lv.8 Completed -> Resource Queue',
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
        rssBags: { food: '195K', wood: '205K', stone: '120K', gold: '20K', gems: '340' },
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
    },
    threats: [],
    movements: [
      {
        id: 'mov-init-4197',
        timestamp: now,
        port: 'ALL',
        instanceId: 'sidekick-cluster',
        governorName: 'Swarm Orchestrator',
        kingdom: '4197',
        category: 'SWARM_BOOT',
        action: 'All 3 SIDEKICK instances (:16384, :16416, :16448) consolidated onto Kingdom #4197 (T1-ONLY + Black-Box active)',
        details: {},
      },
    ],
  };
}

export async function GET() {
  try {
    const session = await auth();
    // 1. Try pulling fresh 4197_blackbox.json directly from SIDEKICK via Cluster Hub /exec
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(HUB_EXEC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: "if (Test-Path 'C:\\UnityScanner\\4197_blackbox.json') { Get-Content 'C:\\UnityScanner\\4197_blackbox.json' -Raw }",
          timeoutMs: 4000,
        }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const payload = await res.json();
        const raw = (payload.stdout || '').trim();
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          try {
            fs.writeFileSync(LOCAL_BB_PATH, JSON.stringify(parsed, null, 2), 'utf8');
          } catch {}
          // Sync compact copy (without heavy base64 if > 300KB) to DynamoDB for cloud access
          try {
            await updateGlobalConfig('SWARM_4197_BLACKBOX', JSON.stringify(parsed));
          } catch {}
          return NextResponse.json({ ok: true, source: 'SIDEKICK_LIVE', data: parsed });
        }
      }
    } catch {}

    // 2. Check local cached file on MIXERV3
    if (fs.existsSync(LOCAL_BB_PATH)) {
      try {
        const localRaw = fs.readFileSync(LOCAL_BB_PATH, 'utf8');
        const parsed = JSON.parse(localRaw);
        return NextResponse.json({ ok: true, source: 'LOCAL_CACHE', data: parsed });
      } catch {}
    }

    // 3. Check DynamoDB Cloud Config
    try {
      const cloudRaw = await getGlobalConfig('SWARM_4197_BLACKBOX');
      if (cloudRaw) {
        return NextResponse.json({ ok: true, source: 'DYNAMODB_CLOUD', data: JSON.parse(cloudRaw) });
      }
    } catch {}

    return NextResponse.json({ ok: true, source: 'FALLBACK_INIT', data: buildFallbackState() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message, data: buildFallbackState() }, { status: 200 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    const body = await request.json();

    // Case 1: Full state push from SIDEKICK orchestrator
    if (body && body.mode === 'SWARM_ROTATION_T1_ONLY' && body.instances) {
      try {
        fs.writeFileSync(LOCAL_BB_PATH, JSON.stringify(body, null, 2), 'utf8');
      } catch {}
      try {
        await updateGlobalConfig('SWARM_4197_BLACKBOX', JSON.stringify(body));
      } catch {}
      return NextResponse.json({ ok: true, saved: true });
    }

    // Case 2: Operator Action triggered from Graphical Command Deck
    const { action, port = '16448' } = body || {};
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
        const res = await fetch(HUB_EXEC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: psCmd, timeoutMs: 8000 }),
        });
        const out = await res.json();
        return NextResponse.json({ ok: true, action, port, output: out.stdout || 'Dispatched to SIDEKICK' });
      } catch (e) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
