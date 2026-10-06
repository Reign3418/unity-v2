/**
 * RoK Battle Wiki & Combat Causality Engine
 * Ground-truth mechanics for Rise of Kingdoms:
 * 1. T5 Push Radar floors & velocity tracking
 * 2. Combat Causality Matcher ("Who Attacked Who")
 * 3. Zeroing vs Feeding vs Strategic Migration Power-Cutting
 * 4. Ground-Truth System Wiki prompt injection for Gemini
 */

export const ROK_CONSTANTS = {
    T5_TECH_FLOOR: 22300000,
    T5_BUILDING_FLOOR: 14780832,
    CH25_MIN_LEVEL: 25,
    POWER_PER_DEAD_T4: 4,
    POWER_PER_DEAD_T5: 10,
    KP_PER_KILL_T4: 10,
    KP_PER_KILL_T5: 20,
    PASSPORT_MIGRATION_MIN_AGE_DAYS: 10,
    MIGRATION_CAP_STANDARD: 25000000
};

/**
 * 1. Evaluates T5 Push Radar status for high-growth spenders & whales
 */
export function analyzeT5Progress(roster = [], serverAgeDays = null, windowDays = 1) {
    const days = Math.max(1, windowDays || 1);
    const candidates = [];

    for (const gov of roster) {
        const power = gov.powerEnd || 0;
        const techEnd = gov.techEnd || 0;
        const buildEnd = gov.buildEnd || 0;
        const techDelta = typeof gov.techDelta === 'number' ? gov.techDelta : 0;
        const buildDelta = typeof gov.buildDelta === 'number' ? gov.buildDelta : 0;
        const troopDelta = typeof gov.troopDelta === 'number' ? gov.troopDelta : 0;
        const powerDelta = typeof gov.powerDelta === 'number' ? gov.powerDelta : 0;

        // Only evaluate governors who have reached significant power or active tech progression
        if (power < 10000000 && techEnd < 8000000 && buildEnd < 6000000 && powerDelta < 2000000) {
            continue;
        }

        const isT5Eligible = techEnd >= ROK_CONSTANTS.T5_TECH_FLOOR && buildEnd >= ROK_CONSTANTS.T5_BUILDING_FLOOR;
        const techPct = Math.min(100, Math.round((techEnd / ROK_CONSTANTS.T5_TECH_FLOOR) * 100));
        const buildPct = Math.min(100, Math.round((buildEnd / ROK_CONSTANTS.T5_BUILDING_FLOOR) * 100));

        const isPushing = !isT5Eligible && (techDelta > (250000 * days) || buildDelta > (200000 * days));
        const isTroopPrinter = troopDelta > (1500000 * days) && techDelta < (300000 * days);

        // Velocity & Horizon calculations
        const techRemaining = Math.max(0, ROK_CONSTANTS.T5_TECH_FLOOR - techEnd);
        const buildRemaining = Math.max(0, ROK_CONSTANTS.T5_BUILDING_FLOOR - buildEnd);
        const dailyTechPace = Math.round(techDelta / days);
        const dailyBuildPace = Math.round(buildDelta / days);

        const estDaysToT5Tech = (techRemaining > 0 && dailyTechPace > 150000) 
            ? Math.ceil(techRemaining / dailyTechPace) 
            : null;
        const estDaysToT5Build = (buildRemaining > 0 && dailyBuildPace > 100000) 
            ? Math.ceil(buildRemaining / dailyBuildPace) 
            : null;

        let status = 'ORGANIC';
        if (isT5Eligible) status = 'T5_UNLOCKED';
        else if (isPushing) status = 'T5_PUSHING';
        else if (isTroopPrinter) status = 'TROOP_PRINTER';

        candidates.push({
            id: gov.id,
            name: gov.name,
            alliance: gov.alliance || 'No Tag',
            power,
            powerDelta,
            techEnd,
            buildEnd,
            techDelta,
            buildDelta,
            troopDelta,
            isT5Eligible,
            techPct,
            buildPct,
            isPushing,
            isTroopPrinter,
            status,
            dailyTechPace,
            dailyBuildPace,
            estDaysToT5Tech,
            estDaysToT5Build,
            pushScore: techDelta + buildDelta
        });
    }

    // Sort by T5 readiness and push score
    candidates.sort((a, b) => {
        if (a.isT5Eligible && !b.isT5Eligible) return -1;
        if (!a.isT5Eligible && b.isT5Eligible) return 1;
        return (b.techPct + b.buildPct) - (a.techPct + a.buildPct);
    });

    const unlocked = candidates.filter(c => c.isT5Eligible);
    const pushing = candidates.filter(c => c.isPushing);
    const printers = candidates.filter(c => c.isTroopPrinter);

    return {
        allCandidates: candidates,
        unlockedCount: unlocked.length,
        pushingCount: pushing.length,
        printerCount: printers.length,
        topPushers: pushing.slice(0, 10),
        topUnlocked: unlocked.slice(0, 10),
        topPrinters: printers.slice(0, 10)
    };
}

/**
 * 2. Combat Causality Matcher ("Who Attacked Who")
 * Correlates Deads taken, Power dropped, and KP harvested across alliances.
 */
export function analyzeCombatCausality(roster = [], allianceMap = {}, serverAgeDays = null, windowDays = 1) {
    const days = Math.max(1, windowDays || 1);
    const activeGovs = roster.filter(g => g.status !== 'Missing' && g.powerDelta !== 'MISSING');

    // ── Thresholds calibrated by kingdom stage ──
    const isYoung = serverAgeDays !== null && serverAgeDays < 90;
    const minZeroedDeads = isYoung ? 25000 : 80000;
    const minZeroedPowerDrop = isYoung ? -1000000 : -2500000;
    const minStrikerKP = isYoung ? (300000 * days) : (1000000 * days);

    // 1. Identify Casualty Victims (Zeroed or heavy battle losses)
    const casualties = [];
    const powerCutCandidates = [];

    // 2. Identify Strikers (High KP gainers who inflicted damage)
    const strikers = [];

    // Kingdom wide aggregate combat activity
    let totalKingdomKP = 0;
    let totalKingdomDeads = 0;
    let totalKingdomPowerDrop = 0;

    for (const gov of activeGovs) {
        const pDelta = typeof gov.powerDelta === 'number' ? gov.powerDelta : 0;
        const kpDelta = gov.kpDelta || 0;
        const deadsDelta = gov.deadDelta || 0;
        const power = gov.powerEnd || 0;
        const powerStart = gov.powerStart || 0;

        if (kpDelta > 0) totalKingdomKP += kpDelta;
        if (deadsDelta > 0) totalKingdomDeads += deadsDelta;
        if (pDelta < 0) totalKingdomPowerDrop += Math.abs(pDelta);

        // Casualty candidate: took heavy deads or shed large power with deads
        if (deadsDelta >= minZeroedDeads || (pDelta <= minZeroedPowerDrop && deadsDelta >= 15000)) {
            // Check if this matches a Migration Power Cut (only relevant for mature servers >=90d):
            const canMigrate = serverAgeDays === null || serverAgeDays >= 90;
            const droppedBelowMigrationCap = canMigrate && powerStart >= 24000000 && power <= 25500000;
            const pureSuicideRatio = kpDelta < (deadsDelta * 2); // almost no KP return

            if (canMigrate && (droppedBelowMigrationCap || pDelta <= -5000000) && pureSuicideRatio) {
                powerCutCandidates.push({
                    id: gov.id,
                    name: gov.name,
                    alliance: gov.alliance || 'No Tag',
                    power,
                    powerStart,
                    powerDelta: pDelta,
                    deadsDelta,
                    kpDelta,
                    reason: `Shed ${(Math.abs(pDelta)/1e6).toFixed(1)}M power with +${(deadsDelta/1e3).toFixed(0)}k deads and zero combat resistance (Pre-Migration Power Trimming)`
                });
            } else {
                casualties.push({
                    id: gov.id,
                    name: gov.name,
                    alliance: gov.alliance || 'No Tag',
                    power,
                    powerDelta: pDelta,
                    deadsDelta,
                    kpDelta,
                    severity: Math.abs(pDelta) + (deadsDelta * 4)
                });
            }
        }

        // Striker candidate: high KP gain with stable/positive or mild power delta
        if (kpDelta >= minStrikerKP && pDelta >= -1500000) {
            strikers.push({
                id: gov.id,
                name: gov.name,
                alliance: gov.alliance || 'No Tag',
                power,
                kpDelta,
                deadsDelta,
                powerDelta: pDelta
            });
        }
    }

    // Sort casualties by severity and strikers by KP
    casualties.sort((a, b) => b.severity - a.severity);
    strikers.sort((a, b) => b.kpDelta - a.kpDelta);

    // ── 3. Build Alliance Combat Balance Sheet ──
    const allianceCombat = {};
    for (const gov of activeGovs) {
        const tag = gov.alliance && gov.alliance !== 'None' ? gov.alliance : 'No Tag';
        if (!allianceCombat[tag]) {
            allianceCombat[tag] = {
                tag,
                kpGained: 0,
                deadsTaken: 0,
                powerLost: 0,
                casualties: [],
                strikers: []
            };
        }
        const kp = gov.kpDelta || 0;
        const deads = gov.deadDelta || 0;
        const pd = typeof gov.powerDelta === 'number' ? gov.powerDelta : 0;

        if (kp > 0) allianceCombat[tag].kpGained += kp;
        if (deads > 0) allianceCombat[tag].deadsTaken += deads;
        if (pd < 0) allianceCombat[tag].powerLost += Math.abs(pd);
    }

    for (const c of casualties) {
        if (allianceCombat[c.alliance]) allianceCombat[c.alliance].casualties.push(c);
    }
    for (const s of strikers) {
        if (allianceCombat[s.alliance]) allianceCombat[s.alliance].strikers.push(s);
    }

    // ── 4. Pair Aggressor Alliances with Victim Alliances ──
    const incidents = [];
    const combatAlliances = Object.values(allianceCombat).filter(a => a.tag !== 'No Tag' && (a.kpGained > 500000 || a.deadsTaken > 20000));

    // Sort alliances by deads taken (potential victims) and KP gained (potential aggressors)
    const victimAlliances = combatAlliances.filter(a => a.deadsTaken >= 30000 && a.powerLost >= 1000000)
        .sort((a, b) => b.deadsTaken - a.deadsTaken);
    const aggressorAlliances = combatAlliances.filter(a => a.kpGained >= minStrikerKP)
        .sort((a, b) => b.kpGained - a.kpGained);

    // Detect PVE Holy Site / Guardian Contest vs Civil War:
    // If multiple top alliances sustained deads but total kingdom KP gained is very low:
    const isPVEHolySiteExpedition = totalKingdomDeads > 100000 && totalKingdomKP < (totalKingdomDeads * 2) && (serverAgeDays !== null && serverAgeDays < 60);

    if (isPVEHolySiteExpedition) {
        incidents.push({
            type: 'PVE_HOLY_SITE_CONTEST',
            title: 'Holy Site / Pass Opening Campaign',
            severity: 'NOMINAL',
            description: `Kingdom-wide casualties (+${(totalKingdomDeads/1e3).toFixed(0)}k deads) sustained with minimal PVP Kill Points. Correlates with initial Holy Site, Sanctum, or Pass 1/2 Guardian contest expeditions.`,
            victimTag: 'Kingdom Expeditionary Forces',
            aggressorTag: 'PVE Holy Sites / Guardians',
            deadsCount: totalKingdomDeads,
            kpCount: totalKingdomKP,
            victims: casualties.slice(0, 5),
            strikers: []
        });
    } else {
        // Evaluate inter-alliance clashes
        for (const victim of victimAlliances) {
            // Find corresponding aggressor with matching timeframe & high KP
            const bestAggressor = aggressorAlliances.find(a => a.tag !== victim.tag && a.kpGained >= (victim.deadsTaken * 3));

            if (bestAggressor) {
                incidents.push({
                    type: 'INTER_ALLIANCE_WAR',
                    title: `Civil Clash: [${bestAggressor.tag}] vs [${victim.tag}]`,
                    severity: victim.deadsTaken >= 300000 ? 'CRITICAL' : 'ELEVATED',
                    description: `[${bestAggressor.tag}] launched military strikes against [${victim.tag}]. [${victim.tag}] suffered ${(victim.deadsTaken/1e3).toFixed(0)}k dead troops and -${(victim.powerLost/1e6).toFixed(1)}M power, while [${bestAggressor.tag}] harvested +${(bestAggressor.kpGained/1e6).toFixed(1)}M Kill Points.`,
                    aggressorTag: bestAggressor.tag,
                    victimTag: victim.tag,
                    deadsCount: victim.deadsTaken,
                    powerLost: victim.powerLost,
                    kpCount: bestAggressor.kpGained,
                    victims: victim.casualties.slice(0, 5),
                    strikers: bestAggressor.strikers.slice(0, 5)
                });
            } else if (victim.casualties.length > 0 && victim.strikers.length > 0 && victim.kpGained >= (victim.deadsTaken * 3)) {
                // Internal alliance mutiny / purge
                incidents.push({
                    type: 'INTERNAL_PURGE',
                    title: `Internal Purge inside [${victim.tag}]`,
                    severity: 'ELEVATED',
                    description: `Internal conflict or disciplinary zeroing detected inside [${victim.tag}]. Casualties and combat KP gains were both concentrated within the same alliance tag.`,
                    aggressorTag: victim.tag,
                    victimTag: victim.tag,
                    deadsCount: victim.deadsTaken,
                    powerLost: victim.powerLost,
                    kpCount: victim.kpGained,
                    victims: victim.casualties.slice(0, 5),
                    strikers: victim.strikers.slice(0, 5)
                });
            }
        }
    }

    return {
        incidents,
        zeroedGovernors: casualties.slice(0, 15),
        strikeLeaders: strikers.slice(0, 15),
        powerCutMigrants: powerCutCandidates.slice(0, 10),
        totalKingdomKP,
        totalKingdomDeads,
        totalKingdomPowerDrop,
        hasConfirmedClash: incidents.some(i => i.type === 'INTER_ALLIANCE_WAR'),
        hasInternalPurge: incidents.some(i => i.type === 'INTERNAL_PURGE'),
        hasPowerCut: powerCutCandidates.length > 0
    };
}

/**
 * 3. Builds the Running RoK Battle Wiki System Prompt Ground Truth for Gemini
 */
export function buildRoKBattleWikiPromptContext({ kd, serverAgeDays, era, causality, t5, windowDays }) {
    const age = serverAgeDays !== null && serverAgeDays !== undefined ? serverAgeDays : 'Uncalibrated';
    const days = Math.max(1, windowDays || 1);

    const isYoung = serverAgeDays !== null && serverAgeDays < 90;

    // Age-specific wiki rules
    let eraRule = '';
    if (isYoung) {
        eraRule = 'IMMUTABLE RULE: Nascent foundation kingdom (<90d). Focus analysis strictly on domestic power growth, alliance building, and internal stability. Do NOT mention cross-kingdom migration.';
    } else if (serverAgeDays !== null && serverAgeDays < 180) {
        eraRule = 'IMMUTABLE RULE: KvK 1 Era. High command focuses on kingdom unification. Civil war threatens KvK qualification and Seed seeding.';
    } else {
        eraRule = 'IMMUTABLE RULE: Established / SoC Era. High Dead counts and high KP are typical of pass fighting and crystal-tech marches.';
    }

    // T5 Radar summary
    let t5Wiki = 'None detected in top depth.';
    if (t5) {
        const topPusherNames = (t5.topPushers || []).slice(0, 3).map(p => `${p.name} [${p.alliance}] (Tech: ${p.techPct}%, +${(p.techDelta/1e6).toFixed(1)}M/d)`).join(', ');
        t5Wiki = `Unlocked: ${t5.unlockedCount} | Actively Pushing: ${t5.pushingCount} | Troop Printers: ${t5.printerCount}. ${topPusherNames ? `Leading pushers: ${topPusherNames}.` : ''}`;
    }

    // Combat causality summary
    let combatWiki = 'No significant combat casualties or inter-alliance skirmishes detected.';
    if (causality?.incidents?.length > 0) {
        combatWiki = causality.incidents.map(inc => {
            const victimNames = (inc.victims || []).slice(0, 3).map(v => `${v.name} (-${(Math.abs(v.powerDelta)/1e6).toFixed(1)}M, +${(v.deadsDelta/1e3).toFixed(0)}k deads)`).join(', ');
            const strikerNames = (inc.strikers || []).slice(0, 3).map(s => `${s.name} (+${(s.kpDelta/1e6).toFixed(1)}M KP)`).join(', ');
            return `• INCIDENT [${inc.type}]: ${inc.title}
  - Casualties: [${inc.victimTag}] suffered ${(inc.deadsCount/1e3).toFixed(0)}k deads${victimNames ? ` (Zeroed: ${victimNames})` : ''}
  - Aggressors: [${inc.aggressorTag}] harvested +${(inc.kpCount/1e6).toFixed(1)}M KP${strikerNames ? ` (Strikers: ${strikerNames})` : ''}`;
        }).join('\n');
    }

    // Power-cut migration summary (only for mature kingdoms)
    let powerCutWiki = '';
    if (!isYoung && causality?.powerCutMigrants?.length > 0) {
        powerCutWiki = `\n- PRE-MIGRATION POWER TRIMMING (STRATEGIC SELF-ZERO):\n${causality.powerCutMigrants.map(p => `${p.name} [${p.alliance}]: ${p.reason}`).join('\n')}`;
    }

    return `
=== ROK BATTLE WIKI & CAUSALITY TRUTH MATRIX ===
- KINGDOM AGE: ${age} Days (${era}) over a ${days}-day observation window.
- DOMAIN ERA RULE: ${eraRule}
- T5 PUSH RADAR: ${t5Wiki}
- CAUSAL COMBAT MATRIX ("WHO ATTACKED WHO"):
${combatWiki}${powerCutWiki}
================================================
`;
}
