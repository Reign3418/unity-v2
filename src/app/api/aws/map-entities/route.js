import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { auth } from '@/lib/auth';
import { analyzeGovernorDiagnostics } from '@/lib/telemetryAnalytics';

export const dynamic = 'force-dynamic';

const bastionDb = new DynamoDBClient({ region: process.env.BASTION_AWS_REGION || 'us-east-2' });

export async function GET(request) {
  try {
    // ZEUS Contextual Policy: Public/Guest GET is allowed (0s usability friction for Map UI),
    // while sensitive hardware/account identifiers (udid, lilithUid, workerSerial) are redacted unless SuperAdmin.
    const session = await auth();
    const isSuperAdmin = Boolean(session?.user?.isSuperAdmin || session?.user?.role === 'Admin');
    const { searchParams } = new URL(request.url);
    const kd = searchParams.get('kd') || '4197';
    const targetSrv = Number(kd) >= 3000 ? Number(kd) - 1000 : Number(kd);

    const mapPath = path.join(process.cwd(), 'src', 'data', 'live_kingdom_map_entities.json');
    const telPath = path.join(process.cwd(), 'src', 'data', 'live_kingdom_telemetry.json');

    let mapData = {
      updatedAt: new Date().toISOString(),
      mapScale: { widthKm: 1200, heightKm: 1200, engineScaleFactor: 6 },
      counts: {},
      governorCities: [],
      allianceStructures: [],
      allianceMarkers: [],
      holySitesAndRuins: [],
      barbarianForts: [],
      resourceNodes: [],
      cavesAndVillages: [],
    };

    if (fs.existsSync(/*turbopackIgnore: true*/ mapPath)) {
      mapData = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ mapPath, 'utf-8'));
    }

    let rosterById = {};
    let rosterList = [];
    if (fs.existsSync(/*turbopackIgnore: true*/ telPath)) {
      const rawTel = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ telPath, 'utf-8'));
      rosterById = rawTel?.kingdoms?.[String(kd)]?.governors || {};
      rosterList = Object.values(rosterById).map((g) => {
        const diag = analyzeGovernorDiagnostics(g);
        const safeGov = { ...g };
        if (!isSuperAdmin) {
          delete safeGov.udid;
          delete safeGov.lilithUid;
          delete safeGov.appUid;
          delete safeGov.workerSerial;
          delete safeGov.instanceId;
        }
        return {
          ...safeGov,
          id: String(g.govId || g.id),
          govId: Number(g.govId || g.id),
          commanderBloatPct: diag.commanderBloatPct,
          commanderBloatStatus: diag.commanderBloatStatus,
          commanderBloatLabel: diag.commanderBloatLabel,
          combatEfficiencyRatio: diag.combatEfficiencyRatio,
          kdRatio: diag.kdRatio,
          t4t5Kills: diag.t4t5Kills,
        };
      });
    }

    // Enrich governorCities with full telemetry + Commander Bloat diagnostics when matched
    const cityMap = new Map();
    for (const c of mapData.governorCities || []) {
      const g =
        Number(c.serverId) === targetSrv || Number(c.serverId) === Number(kd)
          ? rosterById[String(c.govId || c.id)]
          : null;
      if (!g) {
        cityMap.set(`${c.serverId}_${c.govId || c.id}`, c);
        continue;
      }
      const diag = analyzeGovernorDiagnostics(g);
      cityMap.set(`${c.serverId}_${c.govId || c.id}`, {
        ...c,
        name: g.name || c.name,
        alliance: g.alliance || c.alliance,
        allianceName: g.allianceName || c.allianceName,
        power: g.power || c.power || 0,
        matchmakingPower: g.matchmakingPower || 0,
        killPoints: g.killPoints || c.killPoints || 0,
        dead: g.dead || 0,
        healedTroops: g.healedTroops || 0,
        t4Kills: g.t4Kills || 0,
        t5Kills: g.t5Kills || 0,
        commanderPower: g.commanderPower || 0,
        troopPower: g.troopPower || 0,
        techPower: g.techPower || 0,
        buildingPower: g.buildingPower || 0,
        primaryCommander: g.primaryCommander || c.primaryCommander,
        secondaryCommander: g.secondaryCommander || c.secondaryCommander,
        ...(isSuperAdmin ? { udid: g.udid || '', lilithUid: g.lilithUid || '' } : {}),
        commanderBloatPct: diag.commanderBloatPct,
        commanderBloatStatus: diag.commanderBloatStatus,
        commanderBloatLabel: diag.commanderBloatLabel,
        combatEfficiencyRatio: diag.combatEfficiencyRatio,
      });
    }

    const rssList = [...(mapData.resourceNodes || [])];

    // Live overlay from BastionControl -> SWARM_4197_BLACKBOX when viewing Kingdom #4197
    if (String(kd) === '4197') {
      try {
        const bbRes = await bastionDb.send(
          new GetItemCommand({
            TableName: process.env.BASTION_CONTROL_TABLE || 'BastionControl',
            Key: { control_key: { S: 'SWARM_4197_BLACKBOX' } },
          })
        );
        const bbRaw = bbRes.Item?.payload_json?.S;
        if (bbRaw) {
          const bb = JSON.parse(bbRaw);
          for (const [port, inst] of Object.entries(bb.instances || {})) {
            const coords = inst.coordinates || {};
            const tx = Number(coords.x || 0);
            const ty = Number(coords.y || 0);
            if (tx > 0 && tx <= 1200 && ty > 0 && ty <= 1200 && String(coords.kingdom || '4197') === '4197') {
              const gname = inst.activeGovernorName || `SwarmBot_${port}`;
              const gidNum = Number(String(gname).replace(/[^0-9]/g, '') || port);
              cityMap.set(`3197_${gidNum}`, {
                id: String(gidNum),
                govId: gidNum,
                type: 'GOVERNOR_CITY',
                name: gname,
                alliance: inst.allianceTag || 'None',
                allianceName: 'Valheon #4197 Swarm',
                power: Number(inst.power || 0),
                killPoints: 0,
                cityHall: Number(inst.chLevel || 8),
                x: tx,
                y: ty,
                worldX: Math.round(tx * 6 * 100) / 100,
                worldY: Math.round(ty * 6 * 100) / 100,
                source: 'SWARM_4197_LIVE',
                serverId: 3197,
              });
            }
          }
          for (const mov of bb.movements || []) {
            if (mov.category === 'FARMING_MARCH' && String(mov.kingdom || '4197') === '4197') {
              const det = mov.details || {};
              const tx = Number(det.x || det.mapCoords?.x || 0);
              const ty = Number(det.y || det.mapCoords?.y || 0);
              const rcat = String(det.resource || 'FOOD').toUpperCase();
              if (tx > 0 && tx <= 1200 && ty > 0 && ty <= 1200) {
                const rid = `rss_3197_${tx}_${ty}_${rcat}`;
                if (!rssList.some((r) => r.id === rid)) {
                  rssList.push({
                    id: rid,
                    type: 'RESOURCE_NODE',
                    rssCategory: ['FOOD', 'WOOD', 'STONE', 'GOLD'].includes(rcat) ? rcat : 'FOOD',
                    resTypeId: { FOOD: 1, WOOD: 2, STONE: 3, GOLD: 4 }[rcat] || 1,
                    label: `Lv.2 ${det.nodeLabel || `${rcat} Node`}`,
                    level: 2,
                    isAlliancePit: false,
                    harvestedAmount: 0,
                    talentBonus: 0,
                    totalYield: 0,
                    x: tx,
                    y: ty,
                    worldX: Math.round(tx * 6 * 100) / 100,
                    worldY: Math.round(ty * 6 * 100) / 100,
                    serverId: 3197,
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        // Non-blocking fallback to static map entities
      }
    }

    const enrichedCities = Array.from(cityMap.values());

    return NextResponse.json({
      ok: true,
      kingdomId: String(kd),
      updatedAt: mapData.updatedAt,
      mapScale: mapData.mapScale,
      counts: mapData.counts,
      governorCities: enrichedCities,
      allianceStructures: mapData.allianceStructures || [],
      allianceMarkers: mapData.allianceMarkers || [],
      holySitesAndRuins: mapData.holySitesAndRuins || [],
      barbarianForts: mapData.barbarianForts || [],
      resourceNodes: rssList,
      cavesAndVillages: mapData.cavesAndVillages || [],
      rosterList,
    });
  } catch (err) {
    console.error('[API /aws/map-entities GET]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user || (!session.user.isSuperAdmin && !session.user.isLeader && session.user.role !== 'Admin')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Leadership or Admin session required.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, kd = '4197', targetGov = '', x = null, y = null, jump = false } = body;
    const safeKd = String(kd).replace(/[^0-9]/g, '') || '4197';

    const scannerScript = path.join(process.cwd(), 'scanner', 'unity_autonomous_scanner.py');
    const harvestScript = path.join(process.cwd(), 'scanner', 'harvest_kingdom_map_entities.py');
    if (action === 'map-sweep') {
      execFile('python', [harvestScript], { timeout: 20000 }, () => {});
      execFile('python', [scannerScript, '--mode', 'map-sweep', '--kd', safeKd], { timeout: 15000 }, () => {});
      return NextResponse.json({
        ok: true,
        message: `Triggered 7-layer map entity harvest for Kingdom #${safeKd}.`,
      });
    }

    if (action === 'hunt-governor') {
      const args = [scannerScript, '--mode', 'hunt-governor', '--kd', safeKd];
      if (x !== null && y !== null) {
        args.push('--target-x', String(Number(x) || 0), '--target-y', String(Number(y) || 0));
      } else {
        args.push('--target-gov', String(targetGov).replace(/[^a-zA-Z0-9_\-\s]/g, '').slice(0, 40));
      }
      if (jump) args.push('--jump');

      execFile('python', args, { timeout: 15000 });
      return NextResponse.json({
        ok: true,
        message: jump
          ? `Dispatched optical camera jump to ${targetGov || `X:${x} Y:${y}`} in Kingdom #${safeKd}.`
          : `Executed coordinate lock for ${targetGov || `X:${x} Y:${y}`}.`,
      });
    }

    if (action === 'hunt-rss') {
      const safeType = ['FOOD', 'WOOD', 'STONE', 'GOLD'].includes(String(body.rssType || '').toUpperCase())
        ? String(body.rssType).toUpperCase()
        : 'FOOD';
      const safeLvl = String(Math.max(1, Math.min(6, Number(body.rssLevel) || 5)));
      execFile(
        'python',
        [scannerScript, '--mode', 'hunt-rss', '--kd', safeKd, '--rss-type', safeType, '--rss-level', safeLvl],
        { timeout: 15000 }
      );
      return NextResponse.json({
        ok: true,
        message: `Dispatched bot to search Kingdom #${safeKd} for Lv.${safeLvl} ${safeType} nodes and capture live view.`,
      });
    }

    return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    console.error('[API /aws/map-entities POST]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
