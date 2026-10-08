/**
 * Unity V2 Reseller & Farm Bot Syndicate Intelligence Engine
 * 
 * Multivariate forensic scoring (0 - 100%) to detect commercial resource sellers,
 * automated gathering bot networks, and shell farm alliances in Rise of Kingdoms.
 * 
 * 100% Free / Client-Side Algorithmic Math ($0.00 Serverless Cost)
 */

export function detectResellers(roster = [], options = {}) {
    const {
        maxPower = 75_000_000,
        minGathered = 50_000_000,
        maxKp = 25_000_000,
        minConfidence = 35,
    } = options;

    if (!roster || roster.length === 0) {
        return {
            summary: {
                totalScanned: 0,
                totalSuspected: 0,
                totalIllicitRss: 0,
                averagePower: 0,
                averageFarmingRatio: 0,
                hiveAllianceCount: 0,
                syndicateThreatLevel: "CLEAR",
                totalKingdomGathered: 0,
                totalFarmers: 0,
            },
            allianceHives: [],
            resellers: [],
            allCandidates: [],
            topGatherers: [],
            allAllianceHarvest: [],
        };
    }

    // Step 1: Pre-process each governor & calculate baseline individual indicators
    const candidates = roster.map((g, idx) => {
        const id = String(g.id || g.governorId || g['Governor ID'] || `gov_${idx}`);
        const name = String(g.name || g.governorName || g['Governor Name'] || 'Unknown');
        const alliance = String(g.alliance || g['Alliance Tag'] || 'None').trim();
        const power = Number(g.power ?? g.Power) || 0;
        const kp = Number(g.killPoints ?? g.killpoints ?? g.KillPoints ?? g.kp ?? g.KP) || 0;
        const gathered = Number(g.gathered ?? g.resourcesGathered ?? g.ResourcesGathered ?? g['Resources Gathered'] ?? g['Gathered'] ?? g['RSS Gathered']) || 0;
        const assistance = Number(g.assistance ?? g.rssAssisted ?? g['Assistance'] ?? g['Resources Given']) || 0;
        const deads = Number(g.deads ?? g.dead ?? g.Deads ?? g.Dead ?? g.deadTroops) || 0;
        const t4 = Number(g.t4Kills || g.t4 || g['T4 Kills']) || 0;
        const t5 = Number(g.t5Kills || g.t5 || g['T5 Kills']) || 0;
        const warKills = t4 + t5;

        const farmingRatio = power > 0 ? (gathered / power) : 0;
        const kpToPower = power > 0 ? (kp / power) : 0;

        const flags = [];
        let score = 0;

        // Vector 1: Farming Overdrive (Gathered to Power Ratio)
        if (farmingRatio >= 150) {
            score += 35;
            flags.push({ code: "FARMING_OVERDRIVE", weight: 35, val: `${Math.round(farmingRatio)}x power` });
        } else if (farmingRatio >= 60) {
            score += 25;
            flags.push({ code: "HIGH_FARM_OUTPUT", weight: 25, val: `${Math.round(farmingRatio)}x power` });
        } else if (farmingRatio >= 25) {
            score += 15;
            flags.push({ code: "ELEVATED_FARMING", weight: 15, val: `${Math.round(farmingRatio)}x power` });
        }

        // Vector 2: Pure Gathering Volume
        if (gathered >= 3_000_000_000) {
            score += 25;
            flags.push({ code: "GIGANTIC_STOCKPILE", weight: 25, val: `${(gathered / 1e9).toFixed(1)}B RSS` });
        } else if (gathered >= 1_000_000_000) {
            score += 20;
            flags.push({ code: "BILLION_GATHERED", weight: 20, val: `${(gathered / 1e9).toFixed(1)}B RSS` });
        } else if (gathered >= 250_000_000) {
            score += 12;
            flags.push({ code: "HIGH_GATHERED", weight: 12, val: `${(gathered / 1e6).toFixed(0)}M RSS` });
        } else if (gathered >= minGathered) {
            score += 6;
            flags.push({ code: "HIGH_GATHERED", weight: 6, val: `${(gathered / 1e6).toFixed(0)}M RSS` });
        }

        // Vector 3: Combat Pacifism (Zero War Footprint)
        if (kp < 100_000 && warKills === 0 && deads < 2_000) {
            score += 30;
            flags.push({ code: "ZERO_WAR_FOOTPRINT", weight: 30, val: "0 War Kills, <2k Deads" });
        } else if (kpToPower < 0.08 && warKills < 50_000) {
            score += 20;
            flags.push({ code: "PACIFIST_COMBAT_RATIO", weight: 20, val: `${(kpToPower).toFixed(2)}x KP/Power` });
        } else if (kpToPower < 0.20) {
            score += 10;
            flags.push({ code: "LOW_WAR_ACTIVITY", weight: 10, val: `${(kpToPower).toFixed(2)}x KP/Power` });
        }

        // Vector 4: Power Brackets (Low-level bots vs senior farm accounts)
        if (power >= 1_500_000 && power <= 25_000_000) {
            score += 15;
            flags.push({ code: "FARM_POWER_TIER", weight: 15, val: `${(power / 1e6).toFixed(1)}M Power` });
        } else if (power > 25_000_000 && power <= 65_000_000) {
            score += 10;
            flags.push({ code: "SENIOR_FARM_TIER", weight: 10, val: `${(power / 1e6).toFixed(1)}M Senior Farm` });
        }

        // Vector 5: Heavy Resource Export Velocity (Caravan Assistance)
        if (assistance >= 1_000_000_000) {
            score += 25;
            flags.push({ code: "MASSIVE_RSS_EXPORTER", weight: 25, val: `${(assistance / 1e9).toFixed(1)}B Assisted` });
        } else if (assistance >= 200_000_000) {
            score += 15;
            flags.push({ code: "HIGH_RSS_ASSIST", weight: 15, val: `${(assistance / 1e6).toFixed(0)}M Assisted` });
        }

        // Negative Penalties (Combatants / Legitimate Fighters)
        // Only heavily penalize players with genuine high combat footprint
        if (warKills > 500_000) score -= 40;
        else if (warKills > 200_000) score -= 25;

        if (kpToPower > 2.0) score -= 35;
        else if (kpToPower > 1.0) score -= 20;

        if (deads > 250_000) score -= 30;
        else if (deads > 100_000) score -= 15;

        if (power > 100_000_000 && kpToPower > 0.4) score -= 35;

        return {
            id,
            name,
            alliance,
            power,
            killPoints: kp,
            gathered,
            assistance,
            deads,
            t4,
            t5,
            warKills,
            farmingRatio,
            kpToPower,
            initialScore: Math.max(0, score),
            flags,
        };
    });

    // Step 2: Alliance Hive Clustering Analysis
    const allianceMap = new Map();
    candidates.forEach(c => {
        const tag = c.alliance;
        if (!allianceMap.has(tag)) {
            allianceMap.set(tag, {
                tag,
                members: [],
                suspects: [],
            });
        }
        const grp = allianceMap.get(tag);
        grp.members.push(c);
        if (c.initialScore >= 30 && c.power <= maxPower && c.killPoints <= maxKp) {
            grp.suspects.push(c);
        }
    });

    // Step 3: Naming Pattern Regularity & Alliance Swarm Multipliers
    const scoredResellers = candidates.map(c => {
        let finalScore = c.initialScore;
        const updatedFlags = [...c.flags];

        const grp = allianceMap.get(c.alliance);
        const totalMembers = grp?.members.length || 1;
        const suspectCount = grp?.suspects.length || 0;
        const botDensity = totalMembers > 0 ? (suspectCount / totalMembers) : 0;

        // Alliance Hive Multiplier
        if (c.alliance !== "None" && suspectCount >= 3) {
            if (botDensity >= 0.50) {
                finalScore += 25;
                updatedFlags.push({
                    code: "CONFIRMED_HIVE_CLUSTER",
                    weight: 25,
                    val: `${suspectCount}/${totalMembers} (${Math.round(botDensity * 100)}%) Bots in [${c.alliance}]`
                });
            } else if (botDensity >= 0.25 || suspectCount >= 6) {
                finalScore += 15;
                updatedFlags.push({
                    code: "SUSPECTED_HIVE_CLUSTER",
                    weight: 15,
                    val: `${suspectCount} Suspects in [${c.alliance}]`
                });
            }
        }

        // Naming Pattern Heuristics within same alliance
        if (grp && grp.members.length > 2) {
            const hasSequentialName = grp.members.some(other => {
                if (other.id === c.id) return false;
                const prefixA = c.name.slice(0, 4).toLowerCase();
                const prefixB = other.name.slice(0, 4).toLowerCase();
                const matchPrefix = prefixA.length >= 4 && prefixA === prefixB;
                const bothHaveDigits = /\d+$/.test(c.name) && /\d+$/.test(other.name);
                return matchPrefix || (bothHaveDigits && c.name.slice(0, 3) === other.name.slice(0, 3));
            });

            if (hasSequentialName) {
                finalScore += 12;
                updatedFlags.push({
                    code: "AUTOMATED_NAME_SEQUENCE",
                    weight: 12,
                    val: "Sequential or scripted naming convention detected"
                });
            }
        }

        // Cap score at 100
        const confidence = Math.min(100, Math.max(0, Math.round(finalScore)));

        let classification = "SUSPECTED_FARM";
        if (confidence >= 80) classification = "CRITICAL_CONFIRMED";
        else if (confidence >= 60) classification = "HIGH_PROBABILITY";

        return {
            ...c,
            confidence,
            classification,
            flags: updatedFlags,
        };
    });

    // Step 4: Filter to qualifying resellers (forensic bot list)
    const filteredResellers = scoredResellers
        .filter(r => (
            r.confidence >= minConfidence &&
            r.power <= maxPower &&
            r.killPoints <= maxKp &&
            r.gathered >= (minGathered * 0.4) // soft floor allows high-confidence bots slightly below strict threshold
        ))
        .sort((a, b) => b.confidence - a.confidence || b.gathered - a.gathered);

    // Step 5: Rank & summarize Alliance Hives
    const allianceHives = [];
    allianceMap.forEach(grp => {
        const bots = filteredResellers.filter(r => r.alliance === grp.tag);
        if (bots.length >= 2 || (bots.length >= 1 && grp.tag !== "None" && bots[0].confidence >= 75)) {
            const totalBotRss = bots.reduce((s, b) => s + b.gathered, 0);
            const totalBotPower = bots.reduce((s, b) => s + b.power, 0);
            const avgFarmingRatio = bots.length > 0 ? (bots.reduce((s, b) => s + b.farmingRatio, 0) / bots.length) : 0;
            const density = grp.members.length > 0 ? (bots.length / grp.members.length) : 0;

            allianceHives.push({
                tag: grp.tag,
                totalMembers: grp.members.length,
                botCount: bots.length,
                botDensity: Number((density * 100).toFixed(1)),
                totalBotRss,
                totalBotPower,
                avgFarmingRatio: Number(avgFarmingRatio.toFixed(1)),
                status: density >= 0.40 && bots.length >= 3 ? "CONFIRMED_HIVE" : (density >= 0.20 || bots.length >= 4 ? "OUTPOST" : "INCIDENTAL"),
                bots,
            });
        }
    });

    allianceHives.sort((a, b) => b.botCount - a.botCount || b.totalBotRss - a.totalBotRss);

    // Step 6: Top Gatherers across the entire Kingdom (Top 100 governors ranked by RSS gathered)
    const topGatherers = [...scoredResellers]
        .sort((a, b) => b.gathered - a.gathered)
        .slice(0, 100)
        .map((g, idx) => ({
            rank: idx + 1,
            id: g.id,
            name: g.name,
            alliance: g.alliance,
            power: g.power,
            killPoints: g.killPoints,
            gathered: g.gathered,
            farmingRatio: Number(g.farmingRatio.toFixed(1)),
            deads: g.deads,
            assistance: g.assistance,
            confidence: g.confidence,
            isSuspectedReseller: g.confidence >= minConfidence && g.power <= maxPower && g.killPoints <= maxKp,
            classification: g.classification,
            flags: g.flags,
        }));

    // Step 7: Alliance Harvest Totals across all alliances
    const allAllianceHarvest = [];
    allianceMap.forEach(grp => {
        const totalGathered = grp.members.reduce((s, m) => s + m.gathered, 0);
        const totalPower = grp.members.reduce((s, m) => s + m.power, 0);
        const avgGathered = grp.members.length > 0 ? Math.round(totalGathered / grp.members.length) : 0;
        const avgRatio = totalPower > 0 ? (totalGathered / totalPower) : 0;
        const botsInAlliance = filteredResellers.filter(r => r.alliance === grp.tag);
        const botCount = botsInAlliance.length;
        const botDensity = grp.members.length > 0 ? (botCount / grp.members.length) : 0;

        allAllianceHarvest.push({
            tag: grp.tag,
            totalMembers: grp.members.length,
            totalGathered,
            avgGathered,
            totalPower,
            avgRatio: Number(avgRatio.toFixed(1)),
            botCount,
            botDensity: Number((botDensity * 100).toFixed(1)),
            status: botDensity >= 0.40 && botCount >= 3 ? "CONFIRMED_HIVE" : (botCount >= 3 ? "OUTPOST" : "STANDARD"),
        });
    });

    allAllianceHarvest.sort((a, b) => b.totalGathered - a.totalGathered);

    // Step 8: Summary Metrics
    const totalSuspected = filteredResellers.length;
    const totalIllicitRss = filteredResellers.reduce((s, r) => s + r.gathered, 0);
    const averagePower = totalSuspected > 0 ? Math.round(filteredResellers.reduce((s, r) => s + r.power, 0) / totalSuspected) : 0;
    const averageFarmingRatio = totalSuspected > 0 ? Number((filteredResellers.reduce((s, r) => s + r.farmingRatio, 0) / totalSuspected).toFixed(1)) : 0;
    const hiveAllianceCount = allianceHives.filter(h => h.status === "CONFIRMED_HIVE").length;
    const totalKingdomGathered = candidates.reduce((s, c) => s + c.gathered, 0);
    const totalFarmers = candidates.filter(c => c.gathered >= 50_000_000).length;

    let syndicateThreatLevel = "CLEAR";
    if (totalSuspected >= 25 || hiveAllianceCount >= 2) syndicateThreatLevel = "CRITICAL";
    else if (totalSuspected >= 8 || hiveAllianceCount >= 1) syndicateThreatLevel = "HIGH";
    else if (totalSuspected > 0) syndicateThreatLevel = "MODERATE";

    return {
        summary: {
            totalScanned: roster.length,
            totalSuspected,
            totalIllicitRss,
            averagePower,
            averageFarmingRatio,
            hiveAllianceCount,
            syndicateThreatLevel,
            totalKingdomGathered,
            totalFarmers,
        },
        allianceHives,
        resellers: filteredResellers,
        allCandidates: scoredResellers,
        topGatherers,
        allAllianceHarvest,
    };
}

/**
 * Generates an organic synthetic benchmark roster (100 accounts) containing
 * a realistic underground reseller bot network [RSS1] (32 bots), a secondary farm shell [MINE] (12 bots),
 * and legitimate fighters and whales. Perfect for offline testing and demonstration.
 */
export function generateSyntheticResellerBenchmark() {
    const roster = [];

    // 1. Core Reseller Syndicate: Alliance [RSS1] — 32 accounts distributed across 4 forensic tiers
    for (let i = 1; i <= 32; i++) {
        let power, gathered, kp, deads, assistance;
        const name = i < 10 ? `rss_harvester_0${i}` : (i < 20 ? `rss_harvester_${i}` : `kd_miner_${i}`);

        if (i <= 10) {
            // Tier 1: Extreme mega harvesters (100% confidence, 3.5B-5.7B RSS, 3M-6M power, ~5k KP)
            power = 3_200_000 + Math.floor(Math.random() * 2_800_000);
            gathered = 3_800_000_000 + Math.floor(Math.random() * 1_900_000_000);
            assistance = 600_000_000 + Math.floor(Math.random() * 1_500_000_000);
            kp = Math.floor(Math.random() * 9_000);
            deads = Math.floor(Math.random() * 250);
        } else if (i <= 20) {
            // Tier 2: Heavy volume harvesters (95-100% confidence, 2.0B-3.4B RSS, 6M-12M power, ~18k KP)
            power = 6_000_000 + Math.floor(Math.random() * 6_000_000);
            gathered = 2_000_000_000 + Math.floor(Math.random() * 1_400_000_000);
            assistance = 300_000_000 + Math.floor(Math.random() * 700_000_000);
            kp = 8_000 + Math.floor(Math.random() * 25_000);
            deads = Math.floor(Math.random() * 500);
        } else if (i <= 28) {
            // Tier 3: Medium farm bots (85-90% confidence, 1.1B-1.9B RSS, 10M-19M power, ~45k KP)
            power = 10_000_000 + Math.floor(Math.random() * 9_000_000);
            gathered = 1_100_000_000 + Math.floor(Math.random() * 800_000_000);
            assistance = 100_000_000 + Math.floor(Math.random() * 400_000_000);
            kp = 20_000 + Math.floor(Math.random() * 50_000);
            deads = Math.floor(Math.random() * 800);
        } else {
            // Tier 4: Starter bot accounts (70-80% confidence, 600M-950M RSS, 18M-28M power, ~120k KP)
            power = 18_000_000 + Math.floor(Math.random() * 10_000_000);
            gathered = 600_000_000 + Math.floor(Math.random() * 350_000_000);
            assistance = Math.random() > 0.5 ? 80_000_000 : 0;
            kp = 50_000 + Math.floor(Math.random() * 150_000);
            deads = Math.floor(Math.random() * 1_500);
        }

        roster.push({
            id: 20000000 + i * 1421,
            name,
            alliance: "RSS1",
            power,
            killPoints: kp,
            gathered,
            assistance,
            deads,
            t4Kills: 0,
            t5Kills: 0,
        });
    }

    // 2. Secondary Bot Outpost: Alliance [MINE] — 12 accounts across 3 tiers
    for (let i = 1; i <= 12; i++) {
        let power, gathered, kp, deads, assistance;
        const name = `supply_carrier_${i}`;

        if (i <= 6) {
            // High supply carriers (85-95% confidence, 1.2B-2.4B RSS, 8M-16M power)
            power = 8_000_000 + Math.floor(Math.random() * 8_000_000);
            gathered = 1_200_000_000 + Math.floor(Math.random() * 1_200_000_000);
            assistance = 200_000_000 + Math.floor(Math.random() * 500_000_000);
            kp = 15_000 + Math.floor(Math.random() * 60_000);
            deads = Math.floor(Math.random() * 800);
        } else if (i <= 10) {
            // Farm outposts (70-80% confidence, 650M-1.1B RSS, 15M-32M power)
            power = 15_000_000 + Math.floor(Math.random() * 17_000_000);
            gathered = 650_000_000 + Math.floor(Math.random() * 450_000_000);
            assistance = 50_000_000 + Math.floor(Math.random() * 150_000_000);
            kp = 50_000 + Math.floor(Math.random() * 180_000);
            deads = Math.floor(Math.random() * 1_200);
        } else {
            // Auxiliary farms (50-65% confidence, 350M-600M RSS, 32M-48M power)
            power = 32_000_000 + Math.floor(Math.random() * 16_000_000);
            gathered = 350_000_000 + Math.floor(Math.random() * 250_000_000);
            assistance = 0;
            kp = 150_000 + Math.floor(Math.random() * 600_000);
            deads = 1_000 + Math.floor(Math.random() * 3_000);
        }

        roster.push({
            id: 21000000 + i * 2911,
            name,
            alliance: "MINE",
            power,
            killPoints: kp,
            gathered,
            assistance,
            deads,
            t4Kills: 0,
            t5Kills: 0,
        });
    }

    // 3. Legitimate Whales & Main Alliance Warriors [WAR] — 40 accounts
    for (let i = 1; i <= 40; i++) {
        const power = 45_000_000 + Math.floor(Math.random() * 55_000_000);
        const kp = 250_000_000 + Math.floor(Math.random() * 1_800_000_000);
        const gathered = 400_000_000 + Math.floor(Math.random() * 1_500_000_000);
        const deads = 800_000 + Math.floor(Math.random() * 6_000_000);
        const t4 = Math.floor(kp * 0.04);
        const t5 = Math.floor(kp * 0.02);

        roster.push({
            id: 10000000 + i * 3829,
            name: i === 1 ? "Warlord_Prime" : (i === 2 ? "Ares_Commander" : `Vanguard_Knight_${i}`),
            alliance: "WAR",
            power,
            killPoints: kp,
            gathered,
            assistance: Math.floor(gathered * 0.1),
            deads,
            t4Kills: t4,
            t5Kills: t5,
        });
    }

    // 4. Normal mid-level active players & slight farm alts [ELITE] — 16 accounts
    for (let i = 1; i <= 16; i++) {
        let power, kp, gathered, deads, assistance;
        const name = `Defender_${i}`;

        if (i <= 4) {
            // Borderline farm accounts (40-55% confidence, 450M-750M RSS, 25M-42M power, 1M-5M KP)
            power = 25_000_000 + Math.floor(Math.random() * 17_000_000);
            kp = 1_200_000 + Math.floor(Math.random() * 4_000_000);
            gathered = 450_000_000 + Math.floor(Math.random() * 300_000_000);
            assistance = 40_000_000;
            deads = 25_000 + Math.floor(Math.random() * 50_000);
        } else {
            // Normal active fighters
            power = 20_000_000 + Math.floor(Math.random() * 25_000_000);
            kp = 20_000_000 + Math.floor(Math.random() * 80_000_000);
            gathered = 150_000_000 + Math.floor(Math.random() * 400_000_000);
            assistance = 20_000_000;
            deads = 150_000 + Math.floor(Math.random() * 800_000);
        }

        roster.push({
            id: 15000000 + i * 4921,
            name,
            alliance: "ELITE",
            power,
            killPoints: kp,
            gathered,
            assistance,
            deads,
            t4Kills: Math.floor(kp * 0.02),
            t5Kills: Math.floor(kp * 0.005),
        });
    }

    return roster;
}
