/**
 * Unity Telemetry Analytics & Strategic Ratio Engine
 * ==================================================
 * 100% Client & Server-side Algorithmic Math ($0.00 Tokens).
 * Calculates war kill percentages, T1 padding ratios, power distributions,
 * dead-to-power sacrifice indices, in-game (X, Y) tile coordinates,
 * and tactical classifications from raw telemetry.
 */

// Known Kingdom #4194 Alliance Hive Sectors (1200x1200 RoK Map Scale)
const KINGDOM_4194_ALLIANCE_HIVES = {
  'LW=A': { x: 165, y: 1018, zone: 'Zone 1 (NW Outer Province)' },
  '94-1': { x: 184, y: 762, zone: 'Zone 1 (West Outer Province)' },
  WOM: { x: 158, y: 765, zone: 'Zone 1 (West Outer Province)' },
  'I~94': { x: 240, y: 770, zone: 'Zone 2 (West Inner Province)' },
  'S~94': { x: 265, y: 785, zone: 'Zone 2 (West-Central Province)' },
  '5-MS': { x: 298, y: 185, zone: 'Zone 1 (SW Outer Province)' },
  FaKE: { x: 640, y: 580, zone: 'Zone 3 / Inner Sanctum Border' },
  'D-94': { x: 560, y: 630, zone: 'Zone 3 / Central War Sector' },
  DP94: { x: 480, y: 520, zone: 'Zone 2 (NW Inner Province)' },
  FOTN: { x: 690, y: 490, zone: 'Zone 2 (NE Inner Province)' },
  'A~94': { x: 720, y: 680, zone: 'Zone 2 (SE Inner Province)' },
  OE94: { x: 530, y: 710, zone: 'Zone 2 (South Inner Province)' },
  'C~94': { x: 430, y: 640, zone: 'Zone 2 (SW Inner Province)' },
  'I94~': { x: 390, y: 560, zone: 'Zone 2 (West Inner Province)' },
  D94: { x: 585, y: 655, zone: 'Zone 3 / Central War Sector' },
  TDF_: { x: 820, y: 540, zone: 'Zone 2 (East Inner Province)' },
};

export function resolveMapZone(x, y) {
  if (!x || !y) return 'Unmapped Sector';
  const cx = Math.abs(x - 600);
  const cy = Math.abs(y - 600);
  const maxDist = Math.max(cx, cy);

  const ns = y >= 700 ? 'North' : y <= 500 ? 'South' : 'Central';
  const ew = x <= 500 ? 'West' : x >= 700 ? 'East' : 'Central';
  const compass = ns === 'Central' && ew === 'Central' ? 'Center' : `${ns}-${ew}`.replace('-Central', '').replace('Central-', '');

  if (maxDist <= 180) return `Zone 3 · King's Land (${compass})`;
  if (maxDist <= 380) return `Zone 2 · Inner Province (${compass})`;
  return `Zone 1 · Outer Province (${compass})`;
}

export function normalizeInGameCoords(g = {}) {
  const num = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  let rawTileX = num(g.mapTileX || g.tileX);
  let rawTileY = num(g.mapTileY || g.tileY);

  let cPos = g.castlePos || g.lastKnownCoords;
  if (typeof cPos === 'string' && cPos.startsWith('{')) {
    try { cPos = JSON.parse(cPos); } catch {}
  }
  if ((!rawTileX || !rawTileY) && cPos && typeof cPos === 'object') {
    const cx = num(cPos.X ?? cPos.x);
    const cy = num(cPos.Y ?? cPos.y);
    if (cx > 0 && cy > 0) {
      // In RoK world coordinate space, raw coordinates are 0..7200 (6x map tile 0..1200).
      if (cx > 1200 || cy > 1200 || !Number.isInteger(cx) || !Number.isInteger(cy)) {
        rawTileX = Math.round(cx / 6);
        rawTileY = Math.round(cy / 6);
      } else {
        rawTileX = Math.round(cx);
        rawTileY = Math.round(cy);
      }
    }
  }

  if (rawTileX > 0 && rawTileY > 0 && rawTileX <= 1200 && rawTileY <= 1200) {
    return {
      mapTileX: rawTileX,
      mapTileY: rawTileY,
      displayX: rawTileX,
      displayY: rawTileY,
      coordPrecision: g.coordSource === 'MANUAL_PIN' ? 'PINNED_TILE' : 'EXACT_TILE',
      coordLabel: `#${g.kingdomId || g.kingdom || '4194'} X:${rawTileX} Y:${rawTileY}`,
      mapZone: resolveMapZone(rawTileX, rawTileY),
    };
  }

  // Fallback: Estimate Alliance Hive Sector + Deterministic offset within hive
  const alliance = String(g.alliance || g.lastKnownAlliance || 'None').trim();
  const hive = KINGDOM_4194_ALLIANCE_HIVES[alliance];
  const gid = num(g.govId || g.id || 1);
  const jitterX = ((gid % 29) - 14);
  const jitterY = (((Math.floor(gid / 29)) % 29) - 14);

  if (hive) {
    const estX = Math.min(1180, Math.max(20, hive.x + jitterX));
    const estY = Math.min(1180, Math.max(20, hive.y + jitterY));
    return {
      mapTileX: null,
      mapTileY: null,
      displayX: estX,
      displayY: estY,
      coordPrecision: 'ALLIANCE_HIVE_SECTOR',
      coordLabel: `~X:${estX} Y:${estY} ([${alliance}] Hive)`,
      mapZone: hive.zone,
    };
  }

  const fallbackX = 200 + (gid % 800);
  const fallbackY = 200 + ((Math.floor(gid / 100)) % 800);
  return {
    mapTileX: null,
    mapTileY: null,
    displayX: fallbackX,
    displayY: fallbackY,
    coordPrecision: 'UNMAPPED_LEADERBOARD',
    coordLabel: 'Unpinned (Leaderboard Only)',
    mapZone: resolveMapZone(fallbackX, fallbackY),
  };
}

export function enrichGovernorWithRatios(g = {}) {
  const num = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const power = num(g.power || g.Power);
  const highestPower = num(g.highestPower || g.HighestPower || power);
  const troopPower = num(g.troopPower || g.TroopPower);
  const techPower = num(g.techPower || g.TechPower);
  const buildingPower = num(g.buildingPower || g.BuildingPower);
  const commanderPower = num(g.commanderPower || g.CommanderPower);
  const matchmakingPower = num(g.matchmakingPower || g.MatchmakingPower) || (troopPower + techPower + buildingPower > 0 ? troopPower + techPower + buildingPower : Math.max(0, power - commanderPower));

  const killPoints = num(g.killPoints || g.KillPoints);
  const totalKills = num(g.totalUnitsKilled || g.totalKills || g.TotalKills);
  const t1Kills = num(g.t1Kills || g.T1Kills);
  const t2Kills = num(g.t2Kills || g.T2Kills);
  const t3Kills = num(g.t3Kills || g.T3Kills);
  const t4Kills = num(g.t4Kills || g.T4Kills);
  const t5Kills = num(g.t5Kills || g.T5Kills);

  const dead = num(g.dead || g.Deads);
  const healedTroops = num(g.healedTroops || g.HealedTroops);

  const victories = num(g.victories || g.Conqueror);
  const defeats = num(g.defeats || g.FailTimes);
  const totalBattles = victories + defeats;

  const rssGathered = num(g.gathered || g.rssGathered);
  const rssAssistance = num(g.assistance || g.rssAssistance);
  const allianceHelps = num(g.helps || g.allianceHelps);

  const aooWins = num(g.aooWins);
  const aooLosses = num(g.aooLosses);

  // --- Strategic Derived Ratios ---
  const warKills = t4Kills + t5Kills;
  const warKillRatioNum = totalKills > 0 ? (warKills / totalKills) * 100 : 0;
  const warKillRatio = warKillRatioNum.toFixed(1) + '%';

  const t1PaddingRatioNum = totalKills > 0 ? (t1Kills / totalKills) * 100 : 0;
  const t1PaddingRatio = t1PaddingRatioNum.toFixed(1) + '%';

  const t4KillPctNum = totalKills > 0 ? (t4Kills / totalKills) * 100 : 0;
  const t4KillPct = t4KillPctNum.toFixed(1) + '%';

  const t5KillPctNum = totalKills > 0 ? (t5Kills / totalKills) * 100 : 0;
  const t5KillPct = t5KillPctNum.toFixed(1) + '%';

  const kpToPowerRatioNum = power > 0 ? killPoints / power : 0;
  const kpToPowerRatio = kpToPowerRatioNum.toFixed(2);

  const deadToPowerPctNum = power > 0 ? (dead / power) * 100 : 0;
  const deadToPowerPct = deadToPowerPctNum.toFixed(2) + '%';

  const troopPowerPctNum = power > 0 ? (troopPower / power) * 100 : 0;
  const troopPowerPct = troopPowerPctNum.toFixed(1) + '%';

  const techPowerPctNum = power > 0 ? (techPower / power) * 100 : 0;
  const techPowerPct = techPowerPctNum.toFixed(1) + '%';

  const buildingPowerPctNum = power > 0 ? (buildingPower / power) * 100 : 0;
  const buildingPowerPct = buildingPowerPctNum.toFixed(1) + '%';

  const cmdrPowerPctNum = power > 0 ? (commanderPower / power) * 100 : 0;
  const cmdrPowerPct = cmdrPowerPctNum.toFixed(1) + '%';
  const cmdrBloatPctNum = cmdrPowerPctNum;
  const cmdrBloatPct = cmdrPowerPct;
  const cmdrBloatStatus = cmdrPowerPctNum >= 16 ? 'PEACEKEEPER_BLOATED' : cmdrPowerPctNum <= 10 ? 'LEAN_FIGHTER' : 'BALANCED';

  const winRateNum = totalBattles > 0 ? (victories / totalBattles) * 100 : 0;
  const winRatePct = winRateNum.toFixed(1) + '%';

  const aooTotalMatches = aooWins + aooLosses;
  const aooWinRateNum = aooTotalMatches > 0 ? (aooWins / aooTotalMatches) * 100 : 0;
  const aooWinRatePct = aooWinRateNum.toFixed(1) + '%';

  // --- Tactical Classification ---
  let classification = 'REGULAR_FIGHTER';
  if (power >= 20_000_000) {
    classification = 'ALPHA_WHALE';
  } else if (power >= 12_000_000) {
    classification = 'MEGA_WHALE';
  } else if (power >= 7_000_000) {
    classification = 'WAR_WHALE';
  } else if (warKills >= 1_000_000) {
    classification = 'COMBAT_SPECIALIST';
  } else if (dead >= 500_000) {
    classification = 'GARRISON_SACRIFICE';
  } else if (num(g.cityHall || g.ch) >= 21 && killPoints < 50_000) {
    classification = 'FARM_ACCOUNT';
  }

  const coordData = normalizeInGameCoords(g);

  return {
    ...g,
    ...coordData,
    power,
    highestPower,
    troopPower,
    techPower,
    buildingPower,
    commanderPower,
    matchmakingPower,
    killPoints,
    totalKills,
    t1Kills,
    t2Kills,
    t3Kills,
    t4Kills,
    t5Kills,
    dead,
    healedTroops,
    rssGathered,
    rssAssistance,
    allianceHelps,
    warKills,
    warKillRatio,
    warKillRatioNum,
    t1PaddingRatio,
    t1PaddingRatioNum,
    t4KillPct,
    t5KillPct,
    kpToPowerRatio,
    kpToPowerRatioNum,
    deadToPowerPct,
    deadToPowerPctNum,
    troopPowerPct,
    techPowerPct,
    buildingPowerPct,
    cmdrPowerPct,
    cmdrPowerPctNum,
    cmdrBloatPct,
    cmdrBloatPctNum,
    cmdrBloatStatus,
    victories,
    defeats,
    totalBattles,
    winRatePct,
    winRateNum,
    aooWinRatePct,
    aooWinRateNum,
    tacticalClassification: classification,
  };
}

export function analyzeGovernorDiagnostics(g = {}) {
  const enriched = enrichGovernorWithRatios(g);
  const bloatPct = Number(enriched.cmdrBloatPctNum?.toFixed(1) || 0);
  const labelMap = {
    PEACEKEEPER_BLOATED: 'Peacekeeper / Gatherer Bloated',
    LEAN_FIGHTER: 'Lean Combat Fighter',
    BALANCED: 'Balanced Roster',
  };
  return {
    ...enriched,
    commanderBloatPct: bloatPct,
    commanderBloatStatus: enriched.cmdrBloatStatus,
    commanderBloatLabel: labelMap[enriched.cmdrBloatStatus] || 'Balanced Roster',
    combatEfficiencyRatio: enriched.kpToPowerRatioNum,
    kdRatio: enriched.dead > 0 ? Number((enriched.warKills / enriched.dead).toFixed(2)) : enriched.warKills,
    t4t5Kills: enriched.warKills,
  };
}

/**
 * Enriches an array of raw governor records with all strategic percentages.
 */
export function enrichRosterWithAnalytics(roster = []) {
  if (!Array.isArray(roster)) return [];
  return roster.map(enrichGovernorWithRatios);
}
