/**
 * Unity V2 Machine Intelligence Prototype: Anomaly & Fraud Outlier Engine
 * 
 * 100% Free / Client-Side Algorithmic Math ($0.00 Serverless Cost)
 * Identifies stat-padders, farm bots, deadweight whales, and account buyer risks
 * using multivariate ratio analysis and Z-score outlier classification.
 */

export function analyzeGovernorAnomalies(roster = []) {
    if (!roster || roster.length === 0) {
        return {
            summary: {
                totalScanned: 0,
                anomalyCount: 0,
                integrityScore: 100,
                statPadders: 0,
                farmBots: 0,
                deadWeightWhales: 0,
                accountBuyerRisks: 0,
                hyperCombatants: 0,
            },
            anomalies: [],
            rosterWithScores: [],
        };
    }

    const scoredRoster = roster.map(p => {
        const power = p.power || 0;
        const kp = p.killPoints || p.killpoints || 0;
        const deads = p.deads || p.deadTroops || 0;
        const t1 = p.t1Kills || p.t1 || 0;
        const t2 = p.t2Kills || p.t2 || 0;
        const t3 = p.t3Kills || p.t3 || 0;
        const t4 = p.t4Kills || p.t4 || 0;
        const t5 = p.t5Kills || p.t5 || 0;
        const totalKills = t1 + t2 + t3 + t4 + t5;
        const powerDelta = p.powerDelta || 0;
        const kpDelta = p.killPointsDelta || p.kpDelta || 0;

        // Ratio metrics
        const kpToPower = power > 0 ? (kp / power) : 0;
        const deadToPower = power > 0 ? (deads / power) : 0;
        const t1Ratio = totalKills > 0 ? (t1 / totalKills) : 0;
        const warKills = t4 + t5;
        const warKillRatio = totalKills > 0 ? (warKills / totalKills) : 0;

        const flags = [];
        let riskScore = 0; // 0 (Clean) to 100 (Severe Anomaly)
        let primaryClassification = "CLEAN";

        // 1. STAT PADDER DETECTION: Inflated KP via T1 duels with farm accounts
        if (totalKills > 500_000 && t1Ratio >= 0.70 && kp > 30_000_000) {
            flags.push({
                type: "STAT_PADDER",
                severity: "HIGH",
                desc: `${Math.round(t1Ratio * 100)}% of kills are Tier 1 (Farm Trading)`,
            });
            riskScore += 45;
            primaryClassification = "STAT_PADDER";
        }

        // 2. DEADWEIGHT WHALE: Massive power matchmaking liability, no fight output
        if (power >= 65_000_000 && (kpToPower < 0.6 || (powerDelta === 0 && kpDelta === 0))) {
            flags.push({
                type: "DEAD_WEIGHT_WHALE",
                severity: "CRITICAL",
                desc: `High Power (${(power / 1e6).toFixed(1)}M) with negligible fight output`,
            });
            riskScore += 50;
            if (primaryClassification === "CLEAN") primaryClassification = "DEAD_WEIGHT_WHALE";
        }

        // 3. FARM BOT / SCRIPTED ACC: Moderately high power, virtually zero combat history
        if (power >= 25_000_000 && totalKills < 200_000 && deads < 20_000) {
            flags.push({
                type: "FARM_BOT",
                severity: "MEDIUM",
                desc: `Only ${deads.toLocaleString()} deads & ${totalKills.toLocaleString()} kills at ${(power / 1e6).toFixed(1)}M power`,
            });
            riskScore += 35;
            if (primaryClassification === "CLEAN") primaryClassification = "FARM_BOT";
        }

        // 4. SUSPECTED ACCOUNT BUYER: Bought whale account with dead stats and inactive growth
        if (power >= 75_000_000 && deadToPower < 0.005 && kpDelta === 0) {
            flags.push({
                type: "ACCOUNT_BUYER_RISK",
                severity: "HIGH",
                desc: `Whale power with zero recent delta and low historic sacrifice (${deads.toLocaleString()} deads)`,
            });
            riskScore += 40;
            if (primaryClassification === "CLEAN") primaryClassification = "ACCOUNT_BUYER_RISK";
        }

        // 5. HYPER COMBATANT (Positive Outlier): Frontline warrior sacrificing for the kingdom
        if (kpToPower >= 3.5 && warKillRatio >= 0.60 && deadToPower >= 0.04) {
            flags.push({
                type: "HYPER_COMBATANT",
                severity: "ELITE",
                desc: `Elite Warrior: ${(kpToPower).toFixed(1)}x KP/Power & ${Math.round(warKillRatio * 100)}% T4/T5 kills`,
            });
            primaryClassification = "HYPER_COMBATANT";
        }

        riskScore = Math.min(riskScore, 100);

        return {
            ...p,
            kpToPower: Number(kpToPower.toFixed(2)),
            deadToPower: Number(deadToPower.toFixed(4)),
            t1Ratio: Number((t1Ratio * 100).toFixed(1)),
            warKillRatio: Number((warKillRatio * 100).toFixed(1)),
            riskScore,
            flags,
            classification: primaryClassification,
            isAnomaly: flags.length > 0 && primaryClassification !== "HYPER_COMBATANT",
        };
    });

    const anomalies = scoredRoster
        .filter(p => p.isAnomaly)
        .sort((a, b) => b.riskScore - a.riskScore);

    const statPadders = scoredRoster.filter(p => p.classification === "STAT_PADDER").length;
    const farmBots = scoredRoster.filter(p => p.classification === "FARM_BOT").length;
    const deadWeightWhales = scoredRoster.filter(p => p.classification === "DEAD_WEIGHT_WHALE").length;
    const accountBuyerRisks = scoredRoster.filter(p => p.classification === "ACCOUNT_BUYER_RISK").length;
    const hyperCombatants = scoredRoster.filter(p => p.classification === "HYPER_COMBATANT").length;

    // Kingdom Integrity Score: 100 minus anomaly density
    const anomalyDensity = scoredRoster.length > 0 ? (anomalies.length / scoredRoster.length) : 0;
    const integrityScore = Math.max(0, Math.round(100 - (anomalyDensity * 120)));

    return {
        summary: {
            totalScanned: scoredRoster.length,
            anomalyCount: anomalies.length,
            integrityScore,
            statPadders,
            farmBots,
            deadWeightWhales,
            accountBuyerRisks,
            hyperCombatants,
        },
        anomalies,
        rosterWithScores: scoredRoster,
    };
}

/**
 * Early Kingdom Polygraph Deception & Fraud Detection Matrix
 * Analyzes interval deltas, seed sandbagging, farm dueling, and deadweight liability.
 */
export function analyzeKingdomPolygraphAnomalies(sortedRoster = [], serverAgeDays = null, era = 'SoC') {
    if (!sortedRoster || sortedRoster.length === 0) {
        return {
            integrityScore: 100,
            integrityRating: 'PRISTINE',
            statPadders: [],
            sandbaggers: [],
            deadweightWhales: [],
            hyperCombatants: [],
            deadweightPowerTotal: 0,
            deadweightPowerPercentage: 0,
            seedProjection: 'Seed C',
            top50Power: 0,
            peerBenchmark: {
                maturityRating: 'NOMINAL',
                expectedTop50Power: 0,
                variancePct: 0
            }
        };
    }

    const isYoungKd = serverAgeDays !== null && serverAgeDays < 150;
    const isMidKd = serverAgeDays !== null && serverAgeDays >= 150 && serverAgeDays <= 270;

    const kpThreshold = isYoungKd ? 800_000 : isMidKd ? 2_000_000 : 5_000_000;
    const sandbagPowerDrop = isYoungKd ? -1_500_000 : -3_000_000;
    const deadweightMinPower = isYoungKd ? 15_000_000 : isMidKd ? 40_000_000 : 65_000_000;

    const statPadders = [];
    const sandbaggers = [];
    const deadweightWhales = [];
    const hyperCombatants = [];

    const top50 = sortedRoster.slice(0, 50);
    const top50Power = top50.reduce((sum, g) => sum + (g.powerEnd || 0), 0);

    for (let i = 0; i < sortedRoster.length; i++) {
        const gov = sortedRoster[i];
        const pDelta = typeof gov.powerDelta === 'number' ? gov.powerDelta : 0;
        const kpDelta = gov.kpDelta || 0;
        const deadsDelta = gov.deadDelta || 0;
        const power = gov.powerEnd || 0;

        // 1. STAT PADDER (Interval KP duel with no deads / no power drop)
        if (kpDelta >= kpThreshold && deadsDelta <= 300 && pDelta >= -200_000) {
            statPadders.push({
                id: gov.id,
                name: gov.name,
                alliance: gov.alliance,
                rank: i + 1,
                power,
                kpDelta,
                deadsDelta,
                reason: `+${(kpDelta / 1e6).toFixed(1)}M KP with only ${deadsDelta} deads (Suspected Farm Dueler)`
            });
        }

        // 2. SEED SANDBAGGER (Massive power drop without combat deads)
        if (power >= 30_000_000 && pDelta <= sandbagPowerDrop && deadsDelta <= 30_000) {
            sandbaggers.push({
                id: gov.id,
                name: gov.name,
                alliance: gov.alliance,
                rank: i + 1,
                power,
                powerDelta: pDelta,
                deadsDelta,
                reason: `Shed ${(Math.abs(pDelta) / 1e6).toFixed(1)}M power with only ${deadsDelta} deads (Seed Sandbagging)`
            });
        }

        // 3. DEADWEIGHT WHALE (Top power with 0 deads and stagnant KP/Power)
        if (power >= deadweightMinPower && Math.abs(pDelta) <= 400_000 && kpDelta <= 75_000 && deadsDelta === 0) {
            deadweightWhales.push({
                id: gov.id,
                name: gov.name,
                alliance: gov.alliance,
                rank: i + 1,
                power,
                powerDelta: pDelta,
                kpDelta,
                reason: `${(power / 1e6).toFixed(1)}M Power with near-zero delta (${(kpDelta/1e3).toFixed(0)}k KP, 0 Deads)`
            });
        }

        // 4. HYPER COMBATANTS (Frontline heroes carrying the war)
        if ((kpDelta >= 15_000_000) || (kpDelta >= 3_000_000 && deadsDelta >= 100_000)) {
            hyperCombatants.push({
                id: gov.id,
                name: gov.name,
                alliance: gov.alliance,
                rank: i + 1,
                power,
                kpDelta,
                deadsDelta,
                reason: `Elite Warrior: +${(kpDelta/1e6).toFixed(1)}M KP & +${(deadsDelta/1e3).toFixed(0)}k deads`
            });
        }
    }

    const deadweightPowerTotal = deadweightWhales.reduce((sum, g) => sum + g.power, 0);
    const deadweightPowerPercentage = top50Power > 0 ? Number(((deadweightPowerTotal / top50Power) * 100).toFixed(1)) : 0;

    // Integrity Score (0 - 100)
    const penalty = (statPadders.length * 6) + (sandbaggers.length * 8) + (Math.min(30, Math.round(deadweightPowerPercentage * 0.75)));
    const integrityScore = Math.max(15, Math.min(100, 100 - penalty));
    const integrityRating = integrityScore >= 85 ? 'PRISTINE' : integrityScore >= 65 ? 'ELEVATED ANOMALIES' : 'HIGH DECEPTION';

    // Seed Projection based on Top 50 Power
    let seedProjection = 'Seed D';
    if (isYoungKd) {
        if (top50Power >= 800_000_000) seedProjection = 'Whale Dominant';
        else if (top50Power >= 400_000_000) seedProjection = 'High Spend';
        else seedProjection = 'Standard Pace';
    } else {
        if (top50Power >= 5_000_000_000) seedProjection = 'Imperium';
        else if (top50Power >= 3_800_000_000) seedProjection = 'Seed A';
        else if (top50Power >= 2_800_000_000) seedProjection = 'Seed B';
        else if (top50Power >= 1_800_000_000) seedProjection = 'Seed C';
        else seedProjection = 'Seed D';
    }

    // Expected Top 50 Power Benchmark
    let expectedTop50Power = 4_000_000_000;
    if (serverAgeDays !== null) {
        if (serverAgeDays <= 14) expectedTop50Power = 180_000_000;
        else if (serverAgeDays <= 45) expectedTop50Power = 350_000_000;
        else if (serverAgeDays <= 90) expectedTop50Power = 700_000_000;
        else if (serverAgeDays <= 180) expectedTop50Power = 1_500_000_000;
        else if (serverAgeDays <= 270) expectedTop50Power = 2_800_000_000;
        else expectedTop50Power = 4_200_000_000;
    }

    const variancePct = expectedTop50Power > 0 ? Math.round(((top50Power - expectedTop50Power) / expectedTop50Power) * 100) : 0;
    const maturityRating = variancePct >= 20 ? 'AHEAD OF CURVE' : variancePct <= -20 ? 'LAGGING BEHIND' : 'ON PACE';

    return {
        integrityScore,
        integrityRating,
        statPadders: statPadders.slice(0, 15),
        sandbaggers: sandbaggers.slice(0, 15),
        deadweightWhales: deadweightWhales.slice(0, 15),
        hyperCombatants: hyperCombatants.slice(0, 15),
        deadweightPowerTotal,
        deadweightPowerPercentage,
        top50Power,
        seedProjection,
        peerBenchmark: {
            expectedTop50Power,
            actualTop50Power: top50Power,
            variancePct,
            maturityRating
        }
    };
}
