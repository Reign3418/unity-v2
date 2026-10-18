/**
 * VALHEON AEGIS — Unified 5-Model Governor Trust & Forensics Engine
 *
 * Combines 5 independent mathematical & behavioral models into a single
 * 0–100 Valheon Trust Index ($0.00 serverless / client-side execution):
 *   1. EK Polygraph Combat Integrity (KP:Power, Dead:Power, T4/T5 vs T1 ratio)
 *   2. Ghost / Alt Correlation Sensor (Delta vitality & alt-account signature)
 *   3. Reseller & Bot Syndicate Radar (Gathering overdrive & RSS export velocity)
 *   4. Chronological Account Age Audit (Governor ID epoch vs combat maturity)
 *   5. KvK DKP & Lanchester Attrition Projection (Frontline combat readiness)
 */

import { estimateGovernorAge } from './governorAgeEstimator';

export const BENCHMARK_GOVERNORS = [
  {
    id: '48291044',
    name: 'SovereignReign',
    alliance: '3418',
    power: 98_400_000,
    killPoints: 4_820_000_000,
    deads: 18_200_000,
    t1Kills: 4_200_000,
    t4Kills: 142_000_000,
    t5Kills: 168_000_000,
    gathered: 2_100_000_000,
    assistance: 640_000_000,
    powerDelta: 2_400_000,
    kpDelta: 480_000_000,
    deadsDelta: 1_450_000,
  },
  {
    id: '51920384',
    name: 'ValkyrieSpear',
    alliance: '3418',
    power: 89_200_000,
    killPoints: 3_650_000_000,
    deads: 14_100_000,
    t1Kills: 2_800_000,
    t4Kills: 118_000_000,
    t5Kills: 121_000_000,
    gathered: 1_850_000_000,
    assistance: 510_000_000,
    powerDelta: 1_100_000,
    kpDelta: 360_000_000,
    deadsDelta: 980_000,
  },
  {
    id: '74829102',
    name: 'IronVanguard',
    alliance: '3418',
    power: 74_500_000,
    killPoints: 2_190_000_000,
    deads: 9_400_000,
    t1Kills: 3_100_000,
    t4Kills: 88_000_000,
    t5Kills: 64_000_000,
    gathered: 1_420_000_000,
    assistance: 380_000_000,
    powerDelta: 850_000,
    kpDelta: 215_000_000,
    deadsDelta: 620_000,
  },
  {
    id: '91048211',
    name: 'ShadowFarmer99',
    alliance: 'A818',
    power: 84_100_000,
    killPoints: 310_000_000,
    deads: 1_100_000,
    t1Kills: 18_500_000,
    t4Kills: 9_200_000,
    t5Kills: 3_100_000,
    gathered: 4_200_000_000,
    assistance: 190_000_000,
    powerDelta: 4_800_000,
    kpDelta: 4_200_000,
    deadsDelta: 12_000,
  },
  {
    id: '118492030',
    name: 'RSS_Vault_X7',
    alliance: 'VNG',
    power: 62_000_000,
    killPoints: 14_000_000,
    deads: 80_000,
    t1Kills: 1_200_000,
    t4Kills: 400_000,
    t5Kills: 0,
    gathered: 18_500_000_000,
    assistance: 14_200_000_000,
    powerDelta: 0,
    kpDelta: 0,
    deadsDelta: 0,
  },
  {
    id: '104928172',
    name: 'DuelKing_T1',
    alliance: 'A818',
    power: 71_300_000,
    killPoints: 1_420_000_000,
    deads: 820_000,
    t1Kills: 245_000_000,
    t4Kills: 19_000_000,
    t5Kills: 4_500_000,
    gathered: 980_000_000,
    assistance: 95_000_000,
    powerDelta: 1_900_000,
    kpDelta: 18_000_000,
    deadsDelta: 5_000,
  },
];

function parseNumeric(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatCompactNumber(num) {
  const n = parseNumeric(num);
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/**
 * Evaluates a single governor record across all 5 Valheon Forensics models.
 *
 * @param {object} rawGov - Governor telemetry record
 * @param {object} [dkpWeights] - Optional custom DKP weights
 * @returns {object} Complete 5-Model Valheon Forensics Dossier
 */
export function evaluateGovernorTrust(rawGov = {}, dkpWeights = {}) {
  const id = String(
    rawGov.id ||
      rawGov.govId ||
      rawGov.governorId ||
      rawGov['Governor ID'] ||
      '48291044'
  ).trim();
  const name = String(
    rawGov.name ||
      rawGov.governorName ||
      rawGov['Governor Name'] ||
      'Unknown Governor'
  ).trim();
  const alliance = String(
    rawGov.alliance || rawGov.allianceTag || rawGov['Alliance Tag'] || '3418'
  )
    .replace(/[\[\]]/g, '')
    .trim();

  const power = parseNumeric(rawGov.power ?? rawGov.Power ?? 0);
  const kp = parseNumeric(
    rawGov.killPoints ??
      rawGov.killpoints ??
      rawGov.kp ??
      rawGov.kpRaw ??
      rawGov['Kill Points'] ??
      0
  );
  const deads = parseNumeric(
    rawGov.deads ??
      rawGov.dead ??
      rawGov.deadTroops ??
      rawGov.deadsRaw ??
      rawGov['Dead Troops'] ??
      0
  );
  const t1 = parseNumeric(rawGov.t1Kills ?? rawGov.t1 ?? rawGov['T1 Kills'] ?? 0);
  const t2 = parseNumeric(rawGov.t2Kills ?? rawGov.t2 ?? rawGov['T2 Kills'] ?? 0);
  const t3 = parseNumeric(rawGov.t3Kills ?? rawGov.t3 ?? rawGov['T3 Kills'] ?? 0);
  const t4 = parseNumeric(rawGov.t4Kills ?? rawGov.t4 ?? rawGov['T4 Kills'] ?? 0);
  const t5 = parseNumeric(rawGov.t5Kills ?? rawGov.t5 ?? rawGov['T5 Kills'] ?? 0);
  const gathered = parseNumeric(
    rawGov.gathered ??
      rawGov.resourcesGathered ??
      rawGov['Resources Gathered'] ??
      0
  );
  const assistance = parseNumeric(
    rawGov.assistance ?? rawGov.rssAssisted ?? rawGov['Resources Given'] ?? 0
  );

  const powerDelta = parseNumeric(rawGov.powerDelta ?? rawGov.powerDiff ?? 0);
  const kpDelta = parseNumeric(
    rawGov.kpDelta ?? rawGov.killPointsDelta ?? rawGov.kpDiff ?? 0
  );
  const deadsDelta = parseNumeric(rawGov.deadsDelta ?? rawGov.deadsDiff ?? 0);

  // =========================================================================
  // 1. EK POLYGRAPH MODEL (Combat Efficiency & T1 Padding Check)
  // =========================================================================
  const kpToPower = power > 0 ? kp / power : 0;
  const deadToPower = power > 0 ? deads / power : 0;
  const totalTierKills = t1 + t2 + t3 + t4 + t5;
  const warKills = t4 + t5;
  const t1Ratio = totalTierKills > 0 ? t1 / totalTierKills : 0;
  const warKillRatio = totalTierKills > 0 ? warKills / totalTierKills : 0.85;

  let polygraphScore = 50;
  // KP-to-Power contribution (up to +35)
  polygraphScore += Math.min(35, (kpToPower / 25) * 35);
  // Dead-to-Power sacrifice contribution (up to +25)
  polygraphScore += Math.min(25, (deadToPower / 0.12) * 25);

  // Penalties for T1 farm-kill padding or whale deadweight
  if (totalTierKills > 500_000 && t1Ratio >= 0.65) {
    polygraphScore -= 35;
  }
  if (power >= 65_000_000 && kpToPower < 4.0) {
    polygraphScore -= 28;
  }
  if (power >= 50_000_000 && deadToPower < 0.02) {
    polygraphScore -= 20;
  }
  polygraphScore = Math.max(5, Math.min(100, Math.round(polygraphScore)));

  let polygraphLabel = 'STANDARD COMBATANT';
  let polygraphTone = 'cyan';
  if (polygraphScore >= 85) {
    polygraphLabel = 'ELITE WARRIOR';
    polygraphTone = 'emerald';
  } else if (totalTierKills > 500_000 && t1Ratio >= 0.65) {
    polygraphLabel = 'T1 STAT-PADDER';
    polygraphTone = 'amber';
  } else if (polygraphScore <= 42 && power >= 55_000_000) {
    polygraphLabel = 'DEADWEIGHT RISK';
    polygraphTone = 'amber';
  } else if (polygraphScore <= 25) {
    polygraphLabel = 'NON-COMBATANT';
    polygraphTone = 'rose';
  }

  // =========================================================================
  // 2. GHOST / ALT CORRELATION SENSOR
  // =========================================================================
  let ghostCorrelationPct = 4; // Low correlation = independent main account
  let ghostLabel = 'MAIN ACCOUNT';
  let ghostTone = 'emerald';
  let ghostSub = 'Independent combat & growth trajectory';

  if (power >= 45_000_000 && kpToPower < 2.0 && deads < 500_000) {
    ghostCorrelationPct = 88;
    ghostLabel = '88% BOT / SHELL';
    ghostTone = 'rose';
    ghostSub = 'Matches automated shell farm behavioral curve';
  } else if (
    power >= 55_000_000 &&
    powerDelta > 2_000_000 &&
    kpDelta < 10_000_000 &&
    deadToPower < 0.025
  ) {
    ghostCorrelationPct = 68;
    ghostLabel = '68% ALT MATCH';
    ghostTone = 'amber';
    ghostSub = 'High power hoarding with minimal frontline activity';
  } else if (power >= 40_000_000 && powerDelta === 0 && kpDelta === 0 && kpToPower < 8) {
    ghostCorrelationPct = 54;
    ghostLabel = 'DORMANT GHOST';
    ghostTone = 'amber';
    ghostSub = 'Zero recent power or combat delta across window';
  } else {
    ghostCorrelationPct = Math.max(
      1,
      Math.min(18, Math.round(15 - Math.min(14, kpToPower / 4)))
    );
    ghostLabel = `${ghostCorrelationPct}% (MAIN)`;
    ghostTone = 'emerald';
  }

  const ghostIntegrityScore = Math.max(5, 100 - ghostCorrelationPct);

  // =========================================================================
  // 3. RESELLER & FARM BOT SYNDICATE RADAR
  // =========================================================================
  const farmingRatio = power > 0 ? gathered / power : 0;
  const assistRatio = gathered > 0 ? assistance / gathered : 0;
  let resellerRisk = 0;

  if (farmingRatio >= 140 && kpToPower < 1.5) resellerRisk += 55;
  else if (farmingRatio >= 65 && kpToPower < 3.0) resellerRisk += 30;

  if (assistance >= 5_000_000_000 && kpToPower < 2.0) resellerRisk += 40;
  else if (assistance >= 1_500_000_000 && kpToPower < 4.0) resellerRisk += 20;

  if (kp < 25_000_000 && gathered > 2_000_000_000) resellerRisk += 30;
  if (warKills > 50_000_000 && deadToPower >= 0.05) resellerRisk = Math.max(0, resellerRisk - 45);

  resellerRisk = Math.max(0, Math.min(99, Math.round(resellerRisk)));
  const botIntegrityScore = 100 - resellerRisk;

  let botLabel = 'CLEAN';
  let botTone = 'emerald';
  let botSub =
    gathered > 0
      ? `${formatCompactNumber(gathered)} gathered • Natural RSS flow`
      : 'Verified organic combat-to-resource footprint';

  if (resellerRisk >= 70) {
    botLabel = `${resellerRisk}% RESELLER`;
    botTone = 'rose';
    botSub = `${formatCompactNumber(gathered)} gathered / ${formatCompactNumber(assistance)} exported`;
  } else if (resellerRisk >= 38) {
    botLabel = 'HOARDER / FARM';
    botTone = 'amber';
    botSub = `Elevated harvest ratio (${farmingRatio.toFixed(0)}x power)`;
  }

  // =========================================================================
  // 4. CHRONOLOGICAL ACCOUNT AGE & EPOCH AUDIT
  // =========================================================================
  const ageInfo = estimateGovernorAge(id);
  const ageDays = ageInfo?.ageDays || 1250;
  const ageEpoch = ageInfo?.generation?.label || 'SoC Veteran';
  const expectedKpForAge = Math.max(50_000_000, ageDays * 450_000);
  const ageMaturityScore = Math.max(
    15,
    Math.min(100, Math.round((kp / expectedKpForAge) * 75 + (power >= 60_000_000 ? 25 : 15)))
  );

  // =========================================================================
  // 5. KVK DKP & LANCHESTER ATTRITION PROJECTION
  // =========================================================================
  const t4Weight = dkpWeights.t4Weight ?? 4;
  const t5Weight = dkpWeights.t5Weight ?? 10;
  const deadWeight = dkpWeights.deadWeight ?? 30;

  // Estimate effective war score from either period deltas or career baseline
  const effectiveT4 = t4 > 0 ? t4 : Math.round((kp * 0.35) / 10);
  const effectiveT5 = t5 > 0 ? t5 : Math.round((kp * 0.55) / 20);
  const dkpPoints = Math.round(
    effectiveT4 * t4Weight + effectiveT5 * t5Weight + deads * deadWeight
  );

  // Target DKP goal scales by governor power
  const dkpGoal = Math.max(10_000_000, Math.round(power * 12));
  const dkpGoalPct = Math.max(1, Math.min(350, Math.round((dkpPoints / dkpGoal) * 100)));

  let dkpLabel = `${dkpGoalPct}% OF GOAL`;
  let dkpTone = dkpGoalPct >= 100 ? 'cyan' : dkpGoalPct >= 65 ? 'amber' : 'rose';
  if (dkpGoalPct >= 140) dkpTone = 'emerald';

  // =========================================================================
  // COMPOSITE VALHEON TRUST INDEX (0 - 100)
  // =========================================================================
  const rawTrust =
    polygraphScore * 0.36 +
    ghostIntegrityScore * 0.22 +
    botIntegrityScore * 0.22 +
    Math.min(100, dkpGoalPct) * 0.12 +
    ageMaturityScore * 0.08;

  const trustIndex = Math.max(1, Math.min(99, Math.round(rawTrust)));

  let trustTier = 'CORE PILLAR';
  let trustColor = 'emerald';
  let verdict = '✓ VERDICT: Core Pillar — Priority MGE & Crystal Allocation';

  if (resellerRisk >= 70) {
    trustTier = 'THREAT // BOT';
    trustColor = 'rose';
    verdict = '🚨 VERDICT: Commercial RSS Seller / Bot Signature — Zero & Exile';
  } else if (trustIndex < 35) {
    trustTier = 'HIGH LIABILITY';
    trustColor = 'rose';
    verdict = '🚨 VERDICT: Severe Matchmaking Liability — Immediate Migration Order';
  } else if (trustIndex < 62) {
    trustTier = 'FARMER // RISK';
    trustColor = 'amber';
    verdict = '⚠ VERDICT: Deadweight / Alt Risk — Inflating Top-300 Matchmaking Power';
  } else if (trustIndex < 80) {
    trustTier = 'ACTIVE GARRISON';
    trustColor = 'cyan';
    verdict = '✓ VERDICT: Reliable Field Combatant — Cleared for Standard KvK Deployment';
  }

  return {
    id,
    name,
    alliance,
    power,
    killPoints: kp,
    deads,
    t1Kills: t1,
    t4Kills: t4,
    t5Kills: t5,
    gathered,
    assistance,
    powerDelta,
    kpDelta,
    deadsDelta,
    kpToPower: Number(kpToPower.toFixed(2)),
    deadToPower: Number((deadToPower * 100).toFixed(2)),
    t1RatioPct: Number((t1Ratio * 100).toFixed(1)),
    warKillRatioPct: Number((warKillRatio * 100).toFixed(1)),
    trustIndex,
    trustTier,
    trustColor,
    verdict,
    dkpPoints,
    dkpGoal,
    dkpGoalPct,
    ageDays,
    ageEpoch,
    ageFormatted: ageInfo?.ageFormatted || '~3.4y',
    sensors: {
      polygraph: {
        score: polygraphScore,
        label: polygraphLabel,
        tone: polygraphTone,
        sub: `${formatCompactNumber(kp)} KP • ${formatCompactNumber(deads)} Dead (${kpToPower.toFixed(1)}x Power)`,
      },
      ghost: {
        score: ghostIntegrityScore,
        correlationPct: ghostCorrelationPct,
        label: ghostLabel,
        tone: ghostTone,
        sub: ghostSub,
      },
      reseller: {
        score: botIntegrityScore,
        riskPct: resellerRisk,
        label: botLabel,
        tone: botTone,
        sub: botSub,
      },
      dkp: {
        score: Math.min(100, dkpGoalPct),
        label: dkpLabel,
        tone: dkpTone,
        sub: `${formatCompactNumber(dkpPoints)} Weighted DKPPts (${dkpGoalPct}% of Target)`,
      },
    },
    radarVector: [
      polygraphScore,
      ghostIntegrityScore,
      botIntegrityScore,
      Math.min(100, dkpGoalPct),
      ageMaturityScore,
    ],
  };
}

/**
 * Evaluates an entire Kingdom roster and computes aggregate Aegis Counter-Intel metrics.
 */
export function evaluateKingdomTrustMatrix(roster = [], dkpWeights = {}) {
  const sourceRoster =
    Array.isArray(roster) && roster.length > 0 ? roster : BENCHMARK_GOVERNORS;

  const evaluated = sourceRoster
    .map((gov) => evaluateGovernorTrust(gov, dkpWeights))
    .sort((a, b) => b.power - a.power);

  const totalGovernors = evaluated.length;
  const avgTrust =
    totalGovernors > 0
      ? Math.round(
          evaluated.reduce((acc, g) => acc + g.trustIndex, 0) / totalGovernors
        )
      : 100;

  const corePillars = evaluated.filter((g) => g.trustIndex >= 80).length;
  const deadweightRisks = evaluated.filter(
    (g) => g.trustIndex >= 35 && g.trustIndex < 62
  ).length;
  const criticalThreats = evaluated.filter((g) => g.trustIndex < 35).length;

  return {
    summary: {
      totalGovernors,
      avgTrust,
      corePillars,
      deadweightRisks,
      criticalThreats,
    },
    governors: evaluated,
  };
}
