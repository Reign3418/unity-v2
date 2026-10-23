import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { analyzeGovernorDiagnostics } from '@/lib/telemetryAnalytics';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const kd = searchParams.get('kd') || '4194';

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
        return {
          ...g,
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

    // Enrich governorCities with full 67-field telemetry + Commander Bloat diagnostics when matched
    const enrichedCities = (mapData.governorCities || []).map((c) => {
      const g = rosterById[String(c.govId || c.id)];
      if (!g) return c;
      const diag = analyzeGovernorDiagnostics(g);
      return {
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
        udid: g.udid || '',
        lilithUid: g.lilithUid || '',
        commanderBloatPct: diag.commanderBloatPct,
        commanderBloatStatus: diag.commanderBloatStatus,
        commanderBloatLabel: diag.commanderBloatLabel,
        combatEfficiencyRatio: diag.combatEfficiencyRatio,
      };
    });

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
      resourceNodes: mapData.resourceNodes || [],
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
    const body = await request.json();
    const { action, kd = '4194', targetGov = '', x = null, y = null, jump = false } = body;

    const scannerScript = path.join(process.cwd(), 'scanner', 'unity_autonomous_scanner.py');
    if (action === 'map-sweep') {
      exec(`python "${scannerScript}" --mode map-sweep --kd ${kd}`, { timeout: 15000 });
      return NextResponse.json({
        ok: true,
        message: `Triggered 7-layer map entity harvest for Kingdom #${kd}.`,
      });
    }

    if (action === 'hunt-governor') {
      const jumpFlag = jump ? '--jump' : '';
      const coordFlags =
        x !== null && y !== null
          ? `--target-x ${Number(x)} --target-y ${Number(y)}`
          : `--target-gov "${String(targetGov).replace(/"/g, '')}"`;
      exec(
        `python "${scannerScript}" --mode hunt-governor --kd ${kd} ${coordFlags} ${jumpFlag}`,
        { timeout: 15000 }
      );
      return NextResponse.json({
        ok: true,
        message: jump
          ? `Dispatched SIDEKICK camera jump to ${targetGov || `X:${x} Y:${y}`} in Kingdom #${kd}.`
          : `Executed coordinate lock for ${targetGov || `X:${x} Y:${y}`}.`,
      });
    }

    return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    console.error('[API /aws/map-entities POST]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
