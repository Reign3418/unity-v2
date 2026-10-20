/**
 * Unity Telemetry Analytics & Strategic Ratio Engine
 * ==================================================
 * 100% Client & Server-side Algorithmic Math ($0.00 Tokens).
 * Calculates war kill percentages, T1 padding ratios, power distributions,
 * dead-to-power sacrifice indices, and tactical classifications from raw telemetry.
 */

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
  const cmdrPower = num(g.commanderPower || g.CommanderPower);

  const killPoints = num(g.killPoints || g.KillPoints);
  const totalKills = num(g.totalUnitsKilled || g.totalKills || g.TotalKills);
  const t1Kills = num(g.t1Kills || g.T1Kills);
  const t2Kills = num(g.t2Kills || g.T2Kills);
  const t3Kills = num(g.t3Kills || g.T3Kills);
  const t4Kills = num(g.t4Kills || g.T4Kills);
  const t5Kills = num(g.t5Kills || g.T5Kills);

  const dead = num(g.dead || g.Deads);
  const healed = num(g.healedTroops || g.HealedTroops);

  const victories = num(g.victories || g.Conqueror);
  const defeats = num(g.defeats || g.FailTimes);
  const totalBattles = victories + defeats;

  const gathered = num(g.gathered || g.rssGathered);
  const assistance = num(g.assistance || g.rssAssistance);
  const helps = num(g.helps || g.allianceHelps);

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

  const cmdrPowerPctNum = power > 0 ? (cmdrPower / power) * 100 : 0;
  const cmdrPowerPct = cmdrPowerPctNum.toFixed(1) + '%';

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

  return {
    ...g,
    power,
    highestPower,
    troopPower,
    techPower,
    buildingPower,
    commanderPower,
    killPoints,
    totalKills,
    t1Kills,
    t2Kills,
    t3Kills,
    t4Kills,
    t5Kills,
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

/**
 * Enriches an array of raw governor records with all strategic percentages.
 */
export function enrichRosterWithAnalytics(roster = []) {
  if (!Array.isArray(roster)) return [];
  return roster.map(enrichGovernorWithRatios);
}
