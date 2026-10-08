/**
 * Unity V2 Kingdom Executive Rollup Engine
 * 
 * Multivariate longitudinal differential intelligence engine.
 * Computes 24-hour and 48-hour macro-level kingdom telemetry:
 * Net Power Flow, War KP Generation, Troop Casualties, Resource Harvesting,
 * Alliance Momentum, and Top Movers.
 * 
 * 100% Free / Algorithmic Client & Server Math ($0.00 Serverless Cost)
 */

import { fmtCompact } from "@/lib/cerberusIntelligence";

/**
 * Computes complete executive kingdom rollup from a differential roster.
 * 
 * @param {Array} roster - Array of governors with delta metrics from getOverviewDeltas
 * @param {Object} meta - Metadata including kingdomId, startDate, endDate, hoursDiff
 */
export function computeKingdomRollup(roster = [], meta = {}) {
    const {
        kingdomId = "UNKNOWN",
        startDate = "",
        endDate = "",
        hoursDiff = 24,
    } = meta;

    if (!roster || roster.length === 0) {
        return {
            meta: {
                kingdomId,
                startDate,
                endDate,
                hoursDiff,
            },
            summary: {
                totalTracked: 0,
                netPowerDelta: 0,
                organicPowerDelta: 0,
                migratedInPower: 0,
                migratedOutPower: 0,
                totalKpDelta: 0,
                totalDeadsDelta: 0,
                totalGatheredDelta: 0,
                activeGrowersCount: 0,
                sleepingAccountsCount: 0,
                activeWarriorsCount: 0,
                newArrivalsCount: 0,
                departuresCount: 0,
                kingdomPace: "STABLE",
            },
            alliances: [],
            topPowerGainers: [],
            topPowerDroppers: [],
            topKpGainers: [],
            topCasualties: [],
            topGatherers: [],
            newArrivals: [],
            departures: [],
        };
    }

    let netPowerDelta = 0;
    let organicPowerDelta = 0;
    let migratedInPower = 0;
    let migratedOutPower = 0;
    let totalKpDelta = 0;
    let totalDeadsDelta = 0;
    let totalGatheredDelta = 0;
    let activeGrowersCount = 0;
    let sleepingAccountsCount = 0;
    let activeWarriorsCount = 0;
    let newArrivalsCount = 0;
    let departuresCount = 0;

    const allianceMap = new Map();

    const normalizedRoster = roster.map((g, idx) => {
        const id = String(g.id || `gov_${idx}`);
        const name = String(g.name || "Unknown");
        const alliance = String(g.alliance || g.allianceStart || "None").trim();
        const allianceStart = String(g.allianceStart || alliance || "None").trim();
        const status = String(g.status || (g.powerDelta === "NEW" ? "New" : (g.powerDelta === "MISSING" ? "Missing" : "Active")));

        const powerEnd = Number(g.powerEnd ?? g.power) || 0;
        const powerStart = Number(g.powerStart) || 0;

        let numPowerDelta = 0;
        if (status === "New" || g.powerDelta === "NEW") {
            numPowerDelta = powerEnd;
            migratedInPower += powerEnd;
            newArrivalsCount++;
        } else if (status === "Missing" || g.powerDelta === "MISSING") {
            numPowerDelta = -powerStart;
            migratedOutPower += powerStart;
            departuresCount++;
        } else {
            numPowerDelta = Number(g.powerDelta) || (powerEnd - powerStart);
            organicPowerDelta += numPowerDelta;
            if (numPowerDelta > 50_000) activeGrowersCount++;
        }

        netPowerDelta += numPowerDelta;

        const kpDelta = Math.max(0, Number(g.kpDelta) || 0);
        const deadDelta = Math.max(0, Number(g.deadDelta ?? g.deadsDelta) || 0);
        const gatheredDelta = Math.max(0, Number(g.gatheredDelta) || 0);
        const troopDelta = Number(g.troopDelta) || 0;
        const techDelta = Number(g.techDelta) || 0;

        totalKpDelta += kpDelta;
        totalDeadsDelta += deadDelta;
        totalGatheredDelta += gatheredDelta;

        if (kpDelta > 5_000) activeWarriorsCount++;

        // Sleeping detection: strictly 0 growth across all vectors
        if (status === "Active" && Math.abs(numPowerDelta) < 10_000 && kpDelta === 0 && deadDelta === 0 && gatheredDelta === 0) {
            sleepingAccountsCount++;
        }

        // Alliance tracking
        const effectiveTag = alliance !== "None" ? alliance : (allianceStart !== "None" ? allianceStart : "None");
        if (!allianceMap.has(effectiveTag)) {
            allianceMap.set(effectiveTag, {
                tag: effectiveTag,
                members: [],
                netPowerDelta: 0,
                kpDelta: 0,
                deadDelta: 0,
                gatheredDelta: 0,
                growers: 0,
                sleepers: 0,
                newMembers: 0,
                departedMembers: 0,
            });
        }
        const aGrp = allianceMap.get(effectiveTag);
        aGrp.members.push(id);
        aGrp.netPowerDelta += numPowerDelta;
        aGrp.kpDelta += kpDelta;
        aGrp.deadDelta += deadDelta;
        aGrp.gatheredDelta += gatheredDelta;
        if (numPowerDelta > 50_000) aGrp.growers++;
        if (status === "New") aGrp.newMembers++;
        if (status === "Missing") aGrp.departedMembers++;

        return {
            id,
            name,
            alliance: effectiveTag,
            allianceStart,
            status,
            powerStart,
            powerEnd,
            powerDelta: numPowerDelta,
            kpDelta,
            deadDelta,
            gatheredDelta,
            troopDelta,
            techDelta,
            kpEnd: Number(g.kpEnd ?? g.killPoints) || 0,
            deadEnd: Number(g.deadEnd ?? g.dead) || 0,
            gatheredEnd: Number(g.gatheredEnd ?? g.gathered) || 0,
        };
    });

    // Alliance Momentum summary
    const alliances = Array.from(allianceMap.values()).map(a => {
        let momentum = "STABLE";
        if (a.netPowerDelta > 50_000_000 || a.kpDelta > 30_000_000) momentum = "SURGING";
        else if (a.netPowerDelta > 15_000_000 || a.kpDelta > 10_000_000) momentum = "EXPANDING";
        else if (a.netPowerDelta < -30_000_000) momentum = "ATROPHY";

        return {
            tag: a.tag,
            totalMembers: a.members.length,
            netPowerDelta: a.netPowerDelta,
            kpDelta: a.kpDelta,
            deadDelta: a.deadDelta,
            gatheredDelta: a.gatheredDelta,
            growers: a.growers,
            newMembers: a.newMembers,
            departedMembers: a.departedMembers,
            momentum,
        };
    }).sort((a, b) => b.netPowerDelta - a.netPowerDelta || b.kpDelta - a.kpDelta);

    // Kingdom Pace classification
    let kingdomPace = "STEADY_GROWTH";
    if (totalDeadsDelta > 2_500_000 || totalKpDelta > 250_000_000) {
        kingdomPace = "WAR_MOBILIZATION";
    } else if (totalDeadsDelta > 600_000 && totalKpDelta < 50_000_000) {
        kingdomPace = "CIVIL_SKIRMISH";
    } else if (netPowerDelta > 300_000_000) {
        kingdomPace = "PRE_KVK_PUSH";
    } else if (netPowerDelta < -50_000_000) {
        kingdomPace = "ATROPHY";
    }

    // Top Lists
    const activeCohort = normalizedRoster.filter(g => g.status === "Active");
    const topPowerGainers = [...activeCohort].filter(g => g.powerDelta > 0).sort((a, b) => b.powerDelta - a.powerDelta).slice(0, 10);
    const topPowerDroppers = [...activeCohort].filter(g => g.powerDelta < 0).sort((a, b) => a.powerDelta - b.powerDelta).slice(0, 10);
    const topKpGainers = [...normalizedRoster].filter(g => g.kpDelta > 0).sort((a, b) => b.kpDelta - a.kpDelta).slice(0, 10);
    const topCasualties = [...normalizedRoster].filter(g => g.deadDelta > 0).sort((a, b) => b.deadDelta - a.deadDelta).slice(0, 10);
    const topGatherers = [...normalizedRoster].filter(g => g.gatheredDelta > 0).sort((a, b) => b.gatheredDelta - a.gatheredDelta).slice(0, 10);
    const newArrivals = normalizedRoster.filter(g => g.status === "New").sort((a, b) => b.powerEnd - a.powerEnd);
    const departures = normalizedRoster.filter(g => g.status === "Missing").sort((a, b) => b.powerStart - a.powerStart);

    return {
        meta: {
            kingdomId,
            startDate,
            endDate,
            hoursDiff,
        },
        summary: {
            totalTracked: normalizedRoster.length,
            netPowerDelta,
            organicPowerDelta,
            migratedInPower,
            migratedOutPower,
            totalKpDelta,
            totalDeadsDelta,
            totalGatheredDelta,
            activeGrowersCount,
            sleepingAccountsCount,
            activeWarriorsCount,
            newArrivalsCount,
            departuresCount,
            kingdomPace,
        },
        alliances,
        topPowerGainers,
        topPowerDroppers,
        topKpGainers,
        topCasualties,
        topGatherers,
        newArrivals,
        departures,
        rawRoster: normalizedRoster,
    };
}

/**
 * Generates an organic synthetic benchmark roster (200 governors) demonstrating a 24h or 48h
 * kingdom surge scenario with realistic combat, power pushes, migrations, and harvest.
 */
export function generateSyntheticRollupBenchmark(hours = 24) {
    const scale = hours / 24;
    const roster = [];

    // Alliances: [WAR], [ELITE], [MINE], [FARM]
    // 1. Top War Fighters (Alliance WAR, 30 players pushing KP and suffering deads)
    for (let i = 1; i <= 30; i++) {
        const basePower = 55_000_000 + Math.floor(Math.random() * 40_000_000);
        const pDelta = Math.floor((-500_000 + Math.random() * 3_500_000) * scale);
        const kpDelta = Math.floor((1_500_000 + Math.random() * 12_000_000) * scale);
        const deadDelta = Math.floor((30_000 + Math.random() * 180_000) * scale);
        const gatheredDelta = Math.floor((20_000_000 + Math.random() * 80_000_000) * scale);

        roster.push({
            id: 10000000 + i * 2911,
            name: i === 1 ? "Warlord_Vanguard" : (i === 2 ? "Ares_Commander" : `Knight_War_${i}`),
            alliance: "WAR",
            allianceStart: "WAR",
            status: "Active",
            powerStart: basePower,
            powerEnd: basePower + pDelta,
            powerDelta: pDelta,
            kpDelta,
            deadDelta,
            gatheredDelta,
            troopDelta: Math.floor(pDelta * 0.7),
            techDelta: Math.floor(pDelta * 0.2),
            kpEnd: 350_000_000 + kpDelta,
            deadEnd: 1_200_000 + deadDelta,
            gatheredEnd: 1_500_000_000 + gatheredDelta,
        });
    }

    // 2. Big Power Pushers (Alliance ELITE, 40 players pushing tech & training)
    for (let i = 1; i <= 40; i++) {
        const basePower = 40_000_000 + Math.floor(Math.random() * 35_000_000);
        const pDelta = Math.floor((1_200_000 + Math.random() * 7_500_000) * scale); // big pushes!
        const kpDelta = Math.floor((50_000 + Math.random() * 600_000) * scale);
        const deadDelta = Math.floor(Math.random() * 5_000 * scale);
        const gatheredDelta = Math.floor((40_000_000 + Math.random() * 120_000_000) * scale);

        roster.push({
            id: 20000000 + i * 3141,
            name: `Elite_Striker_${i}`,
            alliance: "ELITE",
            allianceStart: "ELITE",
            status: "Active",
            powerStart: basePower,
            powerEnd: basePower + pDelta,
            powerDelta: pDelta,
            kpDelta,
            deadDelta,
            gatheredDelta,
            troopDelta: Math.floor(pDelta * 0.8),
            techDelta: Math.floor(pDelta * 0.15),
            kpEnd: 120_000_000 + kpDelta,
            deadEnd: 450_000 + deadDelta,
            gatheredEnd: 950_000_000 + gatheredDelta,
        });
    }

    // 3. New Arrivals (Migrated In, 6 players)
    for (let i = 1; i <= 6; i++) {
        const power = 65_000_000 + Math.floor(Math.random() * 30_000_000);
        roster.push({
            id: 30000000 + i * 4921,
            name: `Migrant_Titan_${i}`,
            alliance: i % 2 === 0 ? "WAR" : "ELITE",
            allianceStart: "None",
            status: "New",
            powerStart: 0,
            powerEnd: power,
            powerDelta: "NEW",
            kpDelta: 0,
            deadDelta: 0,
            gatheredDelta: 0,
            troopDelta: 0,
            techDelta: 0,
            kpEnd: 420_000_000,
            deadEnd: 2_100_000,
            gatheredEnd: 2_400_000_000,
        });
    }

    // 4. Departures (Migrated Out / Missing, 4 players)
    for (let i = 1; i <= 4; i++) {
        const power = 50_000_000 + Math.floor(Math.random() * 25_000_000);
        roster.push({
            id: 40000000 + i * 1823,
            name: `Exiled_Warrior_${i}`,
            alliance: "None",
            allianceStart: "WAR",
            status: "Missing",
            powerStart: power,
            powerEnd: 0,
            powerDelta: "MISSING",
            kpDelta: 0,
            deadDelta: 0,
            gatheredDelta: 0,
            troopDelta: 0,
            techDelta: 0,
            kpEnd: 0,
            deadEnd: 0,
            gatheredEnd: 0,
        });
    }

    // 5. Heavy Gatherers / Farm Shells (Alliance FARM & MINE, 70 players)
    for (let i = 1; i <= 70; i++) {
        const basePower = 15_000_000 + Math.floor(Math.random() * 20_000_000);
        const pDelta = Math.floor((50_000 + Math.random() * 400_000) * scale);
        const gatheredDelta = Math.floor((150_000_000 + Math.random() * 650_000_000) * scale); // heavy farming!
        const kpDelta = Math.floor(Math.random() * 5_000);
        const deadDelta = 0;

        roster.push({
            id: 50000000 + i * 9123,
            name: i < 35 ? `harvester_shell_${i}` : `supply_wagon_${i}`,
            alliance: i < 35 ? "FARM" : "MINE",
            allianceStart: i < 35 ? "FARM" : "MINE",
            status: "Active",
            powerStart: basePower,
            powerEnd: basePower + pDelta,
            powerDelta: pDelta,
            kpDelta,
            deadDelta,
            gatheredDelta,
            troopDelta: 0,
            techDelta: 0,
            kpEnd: 150_000,
            deadEnd: 500,
            gatheredEnd: 2_500_000_000 + gatheredDelta,
        });
    }

    // 6. Sleeping / Inactive Accounts (50 players)
    for (let i = 1; i <= 50; i++) {
        const basePower = 25_000_000 + Math.floor(Math.random() * 15_000_000);
        roster.push({
            id: 60000000 + i * 6127,
            name: `Sleeping_Lord_${i}`,
            alliance: i % 2 === 0 ? "ELITE" : "FARM",
            allianceStart: i % 2 === 0 ? "ELITE" : "FARM",
            status: "Active",
            powerStart: basePower,
            powerEnd: basePower,
            powerDelta: 0,
            kpDelta: 0,
            deadDelta: 0,
            gatheredDelta: 0,
            troopDelta: 0,
            techDelta: 0,
            kpEnd: 12_000_000,
            deadEnd: 85_000,
            gatheredEnd: 420_000_000,
        });
    }

    const now = new Date();
    const past = new Date(now.getTime() - hours * 3600 * 1000);

    return computeKingdomRollup(roster, {
        kingdomId: "4194-BENCHMARK",
        startDate: past.toISOString().replace("T", " ").substring(0, 16) + " UTC",
        endDate: now.toISOString().replace("T", " ").substring(0, 16) + " UTC",
        hoursDiff: hours,
    });
}

/**
 * Formats a clean, high-impact Discord briefing text for kingdom leadership.
 */
export function formatDiscordRollupBrief(rollup) {
    if (!rollup || !rollup.summary) return "";

    const s = rollup.summary;
    const m = rollup.meta;
    const sign = s.netPowerDelta >= 0 ? "+" : "";

    const lines = [
        `📊 **[UN.TY 2.0] KINGDOM ${m.kingdomId} — ${m.hoursDiff}H EXECUTIVE ROLLUP BRIEFING**`,
        `🕒 *Window: ${m.startDate || "N/A"} → ${m.endDate || "N/A"} (${m.hoursDiff}h)*`,
        ``,
        `⚡ **NET KINGDOM TELEMETRY:**`,
        `• **Net Power Δ:** \`${sign}${fmtCompact(s.netPowerDelta)}\` (Organic: \`${s.organicPowerDelta >= 0 ? "+" : ""}${fmtCompact(s.organicPowerDelta)}\` | Migrants: \`+${fmtCompact(s.migratedInPower)}\` | Departures: \`-${fmtCompact(s.migratedOutPower)}\`)`,
        `• **War KP Generated:** \`+${fmtCompact(s.totalKpDelta)} KP\` (${s.activeWarriorsCount} Combatants active)`,
        `• **Troop Casualties:** \`-${fmtCompact(s.totalDeadsDelta)} deads\``,
        `• **Resources Harvested:** \`+${fmtCompact(s.totalGatheredDelta)} RSS\``,
        `• **Kingdom Posture:** \`[${s.kingdomPace.replace(/_/g, " ")}]\``,
        ``,
        `👥 **ROSTER TURNOVER:**`,
        `• Active Growers: **${s.activeGrowersCount}** | Sleeping Inactive: **${s.sleepingAccountsCount}**`,
        `• In-Migrants: **+${s.newArrivalsCount}** | Departures/Zeroed: **-${s.departuresCount}**`,
        ``,
        `🏰 **TOP ALLIANCE MOVEMENTS:**`
    ];

    (rollup.alliances || []).slice(0, 5).forEach((a, i) => {
        const aSign = a.netPowerDelta >= 0 ? "+" : "";
        lines.push(`${i + 1}. **[${a.tag}]** \`${aSign}${fmtCompact(a.netPowerDelta)} Power\` | \`+${fmtCompact(a.kpDelta)} KP\` | \`${a.momentum}\``);
    });

    if (rollup.topPowerGainers && rollup.topPowerGainers.length > 0) {
        lines.push(``);
        lines.push(`🏆 **TOP POWER GAINERS:**`);
        rollup.topPowerGainers.slice(0, 3).forEach((g, i) => {
            lines.push(`${i + 1}. **${g.name}** [${g.alliance}]: \`+${fmtCompact(g.powerDelta)}\` (Now: \`${fmtCompact(g.powerEnd)}\`)`);
        });
    }

    if (rollup.topKpGainers && rollup.topKpGainers.length > 0) {
        lines.push(``);
        lines.push(`⚔️ **TOP KP SCORERS:**`);
        rollup.topKpGainers.slice(0, 3).forEach((g, i) => {
            lines.push(`${i + 1}. **${g.name}** [${g.alliance}]: \`+${fmtCompact(g.kpDelta)} KP\``);
        });
    }

    lines.push(``);
    lines.push(`*Generated via Unity 2.0 Autonomous Rollup Engine.*`);

    return lines.join("\n");
}
