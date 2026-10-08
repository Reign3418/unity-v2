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
        maxPower = 35_000_000,
        minGathered = 250_000_000,
        maxKp = 3_000_000,
        minConfidence = 55,
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
            },
            allianceHives: [],
            resellers: [],
        };
    }

    // Step 1: Pre-process each governor & calculate baseline individual indicators
    const candidates = roster.map((g, idx) => {
        const id = String(g.id || g.governorId || g['Governor ID'] || `gov_${idx}`);
        const name = String(g.name || g.governorName || g['Governor Name'] || 'Unknown');
        const alliance = String(g.alliance || g['Alliance Tag'] || 'None').trim();
        const power = Number(g.power || g.Power) || 0;
        const kp = Number(g.killPoints || g.killpoints || g.KillPoints || g.kp || g.KP) || 0;
        const gathered = Number(g.gathered ?? g.resourcesGathered ?? g['Resources Gathered']) || 0;
        const assistance = Number(g.assistance ?? g.rssAssisted ?? g['Assistance']) || 0;
        const deads = Number(g.deads ?? g.dead ?? g.Deads ?? g.Dead ?? g.deadTroops) || 0;
        const t4 = Number(g.t4Kills || g.t4 || g['T4 Kills']) || 0;
        const t5 = Number(g.t5Kills || g.t5 || g['T5 Kills']) || 0;
        const warKills = t4 + t5;

        const farmingRatio = power > 0 ? (gathered / power) : 0;
        const kpToPower = power > 0 ? (kp / power) : 0;

        const flags = [];
        let score = 0;

        // Vector 1: Farming Overdrive (Gathered to Power Ratio)
        if (farmingRatio >= 200) {
            score += 35;
            flags.push({ code: "FARMING_OVERDRIVE", weight: 35, val: `${Math.round(farmingRatio)}x power` });
        } else if (farmingRatio >= 80) {
            score += 25;
            flags.push({ code: "HIGH_FARM_OUTPUT", weight: 25, val: `${Math.round(farmingRatio)}x power` });
        } else if (farmingRatio >= 35) {
            score += 15;
            flags.push({ code: "ELEVATED_FARMING", weight: 15, val: `${Math.round(farmingRatio)}x power` });
        }

        // Vector 2: Pure Gathering Volume
        if (gathered >= 3_000_000_000) {
            score += 20;
            flags.push({ code: "GIGANTIC_STOCKPILE", weight: 20, val: `${(gathered / 1e9).toFixed(1)}B RSS` });
        } else if (gathered >= 1_000_000_000) {
            score += 15;
            flags.push({ code: "BILLION_GATHERED", weight: 15, val: `${(gathered / 1e9).toFixed(1)}B RSS` });
        } else if (gathered >= minGathered) {
            score += 10;
            flags.push({ code: "HIGH_GATHERED", weight: 10, val: `${(gathered / 1e6).toFixed(0)}M RSS` });
        }

        // Vector 3: Combat Pacifism (Zero War Footprint)
        if (kp < 50_000 && warKills === 0 && deads < 1_000) {
            score += 30;
            flags.push({ code: "ZERO_WAR_FOOTPRINT", weight: 30, val: "0 War Kills, <1k Deads" });
        } else if (kpToPower < 0.05 && warKills < 20_000) {
            score += 20;
            flags.push({ code: "PACIFIST_COMBAT_RATIO", weight: 20, val: `${(kpToPower).toFixed(2)}x KP/Power` });
        } else if (kpToPower < 0.15) {
            score += 10;
            flags.push({ code: "LOW_WAR_ACTIVITY", weight: 10, val: `${(kpToPower).toFixed(2)}x KP/Power` });
        }

        // Vector 4: Power Sweet Spot (CH17 - CH24 Farm Bracket)
        if (power >= 1_500_000 && power <= 22_000_000) {
            score += 15;
            flags.push({ code: "FARM_POWER_TIER", weight: 15, val: `${(power / 1e6).toFixed(1)}M Power` });
        } else if (power > 22_000_000 && power <= maxPower) {
            score += 8;
            flags.push({ code: "SENIOR_FARM_TIER", weight: 8, val: `${(power / 1e6).toFixed(1)}M Power` });
        }

        // Vector 5: Heavy Resource Export Velocity (Caravan Assistance)
        if (assistance >= 1_000_000_000) {
            score += 25;
            flags.push({ code: "MASSIVE_RSS_EXPORTER", weight: 25, val: `${(assistance / 1e9).toFixed(1)}B Assisted` });
        } else if (assistance >= 300_000_000) {
            score += 15;
            flags.push({ code: "HIGH_RSS_ASSIST", weight: 15, val: `${(assistance / 1e6).toFixed(0)}M Assisted` });
        }

        // Negative Penalties (Combatants / High Power / Legitimate accounts)
        if (power > 50_000_000) score -= 35;
        if (warKills > 200_000) score -= 40;
        if (kpToPower > 1.0) score -= 30;
        if (deads > 50_000) score -= 25;

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
        if (c.initialScore >= 35 && c.power <= maxPower && c.killPoints <= maxKp) {
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
        if (c.alliance !== "None" && suspectCount >= 4) {
            if (botDensity >= 0.60) {
                finalScore += 25;
                updatedFlags.push({
                    code: "CONFIRMED_HIVE_CLUSTER",
                    weight: 25,
                    val: `${suspectCount}/${totalMembers} (${Math.round(botDensity * 100)}%) Bots in [${c.alliance}]`
                });
            } else if (botDensity >= 0.30 || suspectCount >= 8) {
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
                // Check common prefix of 4+ characters or trailing digits
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
        if (confidence >= 85) classification = "CRITICAL_CONFIRMED";
        else if (confidence >= 70) classification = "HIGH_PROBABILITY";

        return {
            ...c,
            confidence,
            classification,
            flags: updatedFlags,
        };
    });

    // Step 4: Filter to qualifying resellers
    const filteredResellers = scoredResellers
        .filter(r => (
            r.confidence >= minConfidence &&
            r.power <= maxPower &&
            r.killPoints <= maxKp &&
            r.gathered >= (minGathered * 0.5) // allow accounts close to threshold if confidence is high
        ))
        .sort((a, b) => b.confidence - a.confidence || b.gathered - a.gathered);

    // Step 5: Rank & summarize Alliance Hives
    const allianceHives = [];
    allianceMap.forEach(grp => {
        if (grp.tag === "None" && grp.members.length > 20) {
            // Group unallied bots as a special category
        }
        const bots = filteredResellers.filter(r => r.alliance === grp.tag);
        if (bots.length >= 2 || (bots.length >= 1 && grp.tag !== "None" && bots[0].confidence >= 85)) {
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
                status: density >= 0.50 && bots.length >= 4 ? "CONFIRMED_HIVE" : (density >= 0.25 || bots.length >= 5 ? "OUTPOST" : "INCIDENTAL"),
                bots,
            });
        }
    });

    allianceHives.sort((a, b) => b.botCount - a.botCount || b.totalBotRss - a.totalBotRss);

    // Step 6: Summary Metrics
    const totalSuspected = filteredResellers.length;
    const totalIllicitRss = filteredResellers.reduce((s, r) => s + r.gathered, 0);
    const averagePower = totalSuspected > 0 ? Math.round(filteredResellers.reduce((s, r) => s + r.power, 0) / totalSuspected) : 0;
    const averageFarmingRatio = totalSuspected > 0 ? Number((filteredResellers.reduce((s, r) => s + r.farmingRatio, 0) / totalSuspected).toFixed(1)) : 0;
    const hiveAllianceCount = allianceHives.filter(h => h.status === "CONFIRMED_HIVE").length;

    let syndicateThreatLevel = "CLEAR";
    if (totalSuspected >= 30 || hiveAllianceCount >= 2) syndicateThreatLevel = "CRITICAL";
    else if (totalSuspected >= 10 || hiveAllianceCount >= 1) syndicateThreatLevel = "HIGH";
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
        },
        allianceHives,
        resellers: filteredResellers,
    };
}

/**
 * Generates an organic synthetic benchmark roster (100 accounts) containing
 * a realistic underground reseller bot network [RSS1] (35 bots), a secondary farm shell [MINE] (12 bots),
 * and legitimate fighters and whales. Perfect for offline testing and demonstration.
 */
export function generateSyntheticResellerBenchmark() {
    const roster = [];

    // 1. Core Reseller Syndicate: Alliance [RSS1] — 32 accounts, 4M to 14M power, massive RSS, zero combat
    for (let i = 1; i <= 32; i++) {
        const power = 3_500_000 + Math.floor(Math.random() * 9_000_000);
        const gathered = 1_500_000_000 + Math.floor(Math.random() * 4_200_000_000); // 1.5B to 5.7B RSS!
        const assistance = Math.random() > 0.4 ? (300_000_000 + Math.floor(Math.random() * 1_200_000_000)) : 0;
        const kp = Math.floor(Math.random() * 25_000); // minimal kp
        const deads = Math.floor(Math.random() * 500);

        roster.push({
            id: 20000000 + i * 1421,
            name: i < 10 ? `rss_harvester_0${i}` : (i < 20 ? `rss_harvester_${i}` : `kd_miner_${i}`),
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

    // 2. Secondary Bot Outpost: Alliance [MINE] — 12 accounts, 8M to 18M power, 800M to 2.5B gathered
    for (let i = 1; i <= 12; i++) {
        const power = 6_000_000 + Math.floor(Math.random() * 12_000_000);
        const gathered = 850_000_000 + Math.floor(Math.random() * 1_800_000_000);
        const assistance = 100_000_000 + Math.floor(Math.random() * 600_000_000);
        const kp = Math.floor(Math.random() * 80_000);
        const deads = Math.floor(Math.random() * 1_200);

        roster.push({
            id: 21000000 + i * 2911,
            name: `supply_carrier_${i}`,
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

    // 4. Normal mid-level active players [ELITE] — 16 accounts
    for (let i = 1; i <= 16; i++) {
        const power = 20_000_000 + Math.floor(Math.random() * 25_000_000);
        const kp = 20_000_000 + Math.floor(Math.random() * 80_000_000);
        const gathered = 300_000_000 + Math.floor(Math.random() * 600_000_000);
        const deads = 150_000 + Math.floor(Math.random() * 800_000);

        roster.push({
            id: 15000000 + i * 4921,
            name: `Defender_${i}`,
            alliance: "ELITE",
            power,
            killPoints: kp,
            gathered,
            assistance: 50_000_000,
            deads,
            t4Kills: Math.floor(kp * 0.02),
            t5Kills: Math.floor(kp * 0.005),
        });
    }

    return roster;
}
