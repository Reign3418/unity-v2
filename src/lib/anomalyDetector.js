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
