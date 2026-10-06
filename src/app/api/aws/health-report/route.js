import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOverviewDeltas, getMigrationMatrix, getGlobalConfig, getKingdomTrends, getKingdomMetadata, parseScanDate } from '@/lib/awsDynamo';
import { logEvent } from '@/lib/eventLogger';
import { analyzeKingdomPolygraphAnomalies } from '@/lib/anomalyDetector';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Behavioral Signature Matrix — pure computation over the already-fetched roster.
 * No extra DynamoDB queries. Identifies influence by BEHAVIOR, not by power rank.
 *
 * Signatures:
 *   Operators  — high KP delta, near-zero power delta → coordinating/fighting, not farming
 *   Veterans   — massive accumulated power, low activity this window → long-tenured, may be organizing
 *   Anchors    — active all window, same alliance, not a migrant → core stable member
 *   Gravity Centers — computed from followSignals (passed in)
 */
/**
 * Behavioral Proxies for Leadership / Influence
 * Age-calibrated across RoK life stages:
 *   Operators       — high KP delta (age-scaled), non-spike power delta → frontline combat coordinators / rally commanders
 *   Veterans        — high accumulated power (age-scaled), stable this window → strategic pillars / tenured command
 *   Anchors         — active all window, same alliance, not a migrant → core stable member
 *   Gravity Centers — alliances attracting migrants (or absorbing internal switchers in young/nascent kingdoms)
 */
function computeBehavioralSignatures(roster, followSignals = [], serverAgeDays = null, era = 'Uncalibrated', windowDays = 1, allianceSwitchers = []) {
    const active = roster.filter(g => g.status !== 'Missing' && g.powerDelta !== 'MISSING');
    const days = Math.max(1, windowDays || 1);
    const topGov = roster[0] || {};
    const topPower = topGov.powerEnd || 50000000;

    // ── Age-Calibrated Operator Thresholds ──
    let kpOperatorThreshold = 50000 * days;
    let maxOperatorPowerDelta = 2000000;

    if (serverAgeDays !== null && serverAgeDays !== undefined) {
        if (serverAgeDays <= 7) {
            // Week 1 (Day 1-7): Barbarians, Lo-Har, early shrine/altar skirmishes
            kpOperatorThreshold = Math.max(1000, Math.round(1500 * days));
            maxOperatorPowerDelta = Math.max(4000000, Math.round(topPower * 0.5));
        } else if (serverAgeDays < 30) {
            // Month 1 (Day 8-29): Pass 1 opening, Holy Sites
            kpOperatorThreshold = Math.max(2500, Math.round(5000 * days));
            maxOperatorPowerDelta = Math.max(3500000, Math.round(topPower * 0.4));
        } else if (serverAgeDays < 90) {
            // Nascent Era (Day 30-89): Pass 2, Sanctums, King crowning
            kpOperatorThreshold = Math.max(5000, Math.round(12000 * days));
            maxOperatorPowerDelta = Math.max(3000000, Math.round(topPower * 0.35));
        } else if (serverAgeDays < 180) {
            // KvK 1: First War
            kpOperatorThreshold = Math.max(12000, Math.round(25000 * days));
            maxOperatorPowerDelta = 2500000;
        } else if (serverAgeDays < 365) {
            // Season 2 & Season 3
            kpOperatorThreshold = Math.max(20000, Math.round(35000 * days));
            maxOperatorPowerDelta = 2000000;
        } else {
            // Season of Conquest (SoC)
            kpOperatorThreshold = Math.max(25000, Math.round(50000 * days));
            maxOperatorPowerDelta = 2000000;
        }
    } else {
        // Uncalibrated fallback: scale dynamically from roster topPower
        if (topPower < 15000000) {
            kpOperatorThreshold = Math.max(2000, Math.round(4000 * days));
            maxOperatorPowerDelta = 4000000;
        } else if (topPower < 40000000) {
            kpOperatorThreshold = Math.max(10000, Math.round(20000 * days));
            maxOperatorPowerDelta = 2500000;
        } else {
            kpOperatorThreshold = Math.max(25000, Math.round(50000 * days));
            maxOperatorPowerDelta = 2000000;
        }
    }

    // ── Age-Calibrated Veteran Thresholds ──
    let minVeteranPower = 20000000;
    let maxVeteranPowerDelta = 3000000;

    if (serverAgeDays !== null && serverAgeDays !== undefined) {
        if (serverAgeDays <= 7) {
            // Week 1: High command is typically 1.5M - 8M power
            minVeteranPower = Math.max(1000000, Math.min(Math.round(topPower * 0.35), 6000000));
            maxVeteranPowerDelta = Math.max(1500000, Math.round(minVeteranPower * 0.4));
        } else if (serverAgeDays < 30) {
            // Month 1: 3M - 15M power
            minVeteranPower = Math.max(2500000, Math.min(Math.round(topPower * 0.35), 10000000));
            maxVeteranPowerDelta = Math.max(2000000, Math.round(minVeteranPower * 0.3));
        } else if (serverAgeDays < 90) {
            // Pre-KvK 1: 6M - 25M power
            minVeteranPower = Math.max(6000000, Math.min(Math.round(topPower * 0.35), 18000000));
            maxVeteranPowerDelta = 3000000;
        } else if (serverAgeDays < 180) {
            // KvK 1: 12M - 35M power
            minVeteranPower = Math.max(12000000, Math.min(Math.round(topPower * 0.35), 25000000));
            maxVeteranPowerDelta = 3000000;
        } else if (serverAgeDays < 365) {
            // Season 2 & 3: 20M - 45M power
            minVeteranPower = Math.max(20000000, Math.min(Math.round(topPower * 0.35), 35000000));
            maxVeteranPowerDelta = 3500000;
        } else {
            // Season of Conquest (SoC): 30M - 60M power
            minVeteranPower = Math.max(30000000, Math.min(Math.round(topPower * 0.35), 50000000));
            maxVeteranPowerDelta = 4000000;
        }
    } else {
        minVeteranPower = Math.max(2500000, Math.min(Math.round(topPower * 0.35), 30000000));
        maxVeteranPowerDelta = Math.max(1000000, Math.round(minVeteranPower * 0.25));
    }

    // ── 1. Operators: high KP delta + combat-focused power profile ──
    let candidateOperators = active.filter(g => {
        const kp = g.kpDelta || 0;
        const pd = typeof g.powerDelta === 'number' ? g.powerDelta : (g.powerDelta === 'NEW' ? 9999999 : 0);
        return kp >= kpOperatorThreshold && pd < maxOperatorPowerDelta;
    });

    // If fewer than 4 meet the threshold, expand to notable combatants in window
    if (candidateOperators.length < 4) {
        const secondaryThreshold = Math.max(500 * days, Math.round(kpOperatorThreshold * 0.4));
        candidateOperators = active.filter(g => {
            const kp = g.kpDelta || 0;
            const pd = typeof g.powerDelta === 'number' ? g.powerDelta : (g.powerDelta === 'NEW' ? 9999999 : 0);
            return kp >= secondaryThreshold && pd < maxOperatorPowerDelta;
        });
    }

    const operators = candidateOperators
        .sort((a, b) => (b.kpDelta || 0) - (a.kpDelta || 0))
        .slice(0, 12)
        .map(g => ({
            id: g.id,
            name: g.name,
            alliance: g.alliance,
            kpDelta: g.kpDelta || 0,
            powerDelta: typeof g.powerDelta === 'number' ? g.powerDelta : 0,
            powerEnd: g.powerEnd || 0,
        }));

    // ── 2. Veterans: top accumulated power, stable power delta this window ──
    const veterans = active
        .filter(g => {
            const pd = typeof g.powerDelta === 'number' ? g.powerDelta : 9999999;
            return g.powerEnd >= minVeteranPower && pd < maxVeteranPowerDelta && g.powerDelta !== 'NEW';
        })
        .sort((a, b) => b.powerEnd - a.powerEnd)
        .slice(0, 12)
        .map(g => ({
            id: g.id,
            name: g.name,
            alliance: g.alliance,
            powerEnd: g.powerEnd || 0,
            powerDelta: typeof g.powerDelta === 'number' ? g.powerDelta : 0,
            kpDelta: g.kpDelta || 0,
        }));

    // ── 3. Anchors: stable, non-migrating, same alliance the whole window ──
    const anchors = active
        .filter(g => {
            const sameAlliance = !g.allianceStart || g.allianceStart === 'None' || g.allianceStart === g.alliance;
            return g.powerDelta !== 'NEW' && sameAlliance;
        })
        .sort((a, b) => b.powerEnd - a.powerEnd)
        .slice(0, 15)
        .map(g => ({
            id: g.id,
            name: g.name,
            alliance: g.alliance,
            powerEnd: g.powerEnd || 0,
            kpDelta: g.kpDelta || 0,
            powerDelta: typeof g.powerDelta === 'number' ? g.powerDelta : 0,
        }));

    // ── 4. Gravity Centers: Cross-kingdom migration or Internal Alliance Consolidation ──
    let gravityCenters = [];
    let gravityCenterType = 'migration';

    if (followSignals && followSignals.length > 0) {
        gravityCenters = followSignals.map(f => ({
            ...f,
            type: 'MIGRATION_HUB',
            signalType: 'migration',
            label: `${f.followerCount} arrival${f.followerCount !== 1 ? 's' : ''}`
        }));
    } else if (allianceSwitchers && allianceSwitchers.length > 0) {
        // When migration is locked (<90d) or zero arrivals, identify internal consolidation hubs
        gravityCenterType = 'consolidation';
        const switcherDestinations = {};
        for (const s of allianceSwitchers) {
            if (!s.to || s.to === 'None' || s.to === 'No Tag') continue;
            if (!switcherDestinations[s.to]) {
                switcherDestinations[s.to] = {
                    leaderAlliance: s.to,
                    type: 'CONSOLIDATION_HUB',
                    signalType: 'consolidation',
                    followerCount: 0,
                    followers: [],
                    totalPowerGained: 0
                };
            }
            switcherDestinations[s.to].followerCount += 1;
            switcherDestinations[s.to].followers.push(s.name);
            switcherDestinations[s.to].totalPowerGained += (s.power || 0);
        }

        gravityCenters = Object.values(switcherDestinations)
            .sort((a, b) => b.followerCount - a.followerCount || b.totalPowerGained - a.totalPowerGained)
            .slice(0, 5)
            .map(h => ({
                leaderAlliance: h.leaderAlliance,
                type: 'CONSOLIDATION_HUB',
                signalType: 'consolidation',
                followerCount: h.followerCount,
                followers: h.followers.slice(0, 5),
                powerTransferred: h.totalPowerGained,
                label: `${h.followerCount} switcher${h.followerCount !== 1 ? 's' : ''}`
            }));
    }

    const calibration = {
        serverAgeDays,
        era,
        windowDays,
        kpOperatorThreshold,
        minVeteranPower,
        maxOperatorPowerDelta,
        gravityCenterType
    };

    return { operators, veterans, anchors, gravityCenters, calibration };
}

export async function GET(req) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const kdsParam = searchParams.get('kds');
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const depth = parseInt(searchParams.get('depth') || '300', 10);
        const locale = searchParams.get('locale') || 'en';
        const aiParam = searchParams.get('ai') !== 'false';

        if (!kdsParam) {
            return NextResponse.json({ error: "Missing 'kds' parameter." }, { status: 400 });
        }

        // Single kingdom mode — only process the first kingdom
        const kd = kdsParam.split(',')[0].trim();

        // ── Run all engines concurrently for the single kingdom (including Kingdom Metadata) ──
        const [rosterData, migrationData, trendsData, kingdomMeta] = await Promise.all([
            getOverviewDeltas(kd, start, end),
            getMigrationMatrix(kd, start, end),
            getKingdomTrends(kd).catch(() => []),
            getKingdomMetadata(kd).catch(() => null)
        ]);

        if (!rosterData || rosterData.length === 0) {
            return NextResponse.json({ error: "No data available for the requested kingdom." }, { status: 404 });
        }

        let resolvedStartDate = start;
        let resolvedEndDate = end;

        if (trendsData && trendsData.length >= 2) {
            let filtered = [...trendsData];
            if (start) filtered = filtered.filter(d => parseScanDate(d.scanDate) >= new Date(start + 'T00:00:00'));
            if (end) filtered = filtered.filter(d => parseScanDate(d.scanDate) <= new Date(end + 'T23:59:59'));
            if (filtered.length < 2) {
                resolvedStartDate = trendsData[0].scanDate;
                resolvedEndDate = trendsData[trendsData.length - 1].scanDate;
            } else {
                resolvedStartDate = filtered[0].scanDate;
                resolvedEndDate = filtered[filtered.length - 1].scanDate;
            }
        }

        // ── Compute Kingdom Age & Game Era ──
        let serverAgeDays = null;
        let era = kingdomMeta?.kingdomProgress || 'Uncalibrated';
        let eraKey = 'unknown';

        if (kingdomMeta?.foundedDate) {
            const refDate = resolvedEndDate ? new Date(resolvedEndDate) : new Date();
            const birthDate = new Date(kingdomMeta.foundedDate);
            const diffMs = refDate.getTime() - birthDate.getTime();
            serverAgeDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

            if (!kingdomMeta?.kingdomProgress) {
                if (serverAgeDays < 90) {
                    era = 'Pre-KvK 1 (Nascent)';
                    eraKey = 'pre_kvk1';
                } else if (serverAgeDays < 180) {
                    era = 'KvK 1 (First War)';
                    eraKey = 'kvk1';
                } else if (serverAgeDays < 270) {
                    era = 'Season 2';
                    eraKey = 'season2';
                } else if (serverAgeDays < 365) {
                    era = 'Season 3';
                    eraKey = 'season3';
                } else {
                    era = 'Season of Conquest';
                    eraKey = 'soc';
                }
            }
        }

        const sortedRoster = rosterData.sort((a, b) => b.powerEnd - a.powerEnd).slice(0, depth);
        const totalEndPower = sortedRoster.reduce((sum, g) => sum + (g.powerEnd || 0), 0);

        // ── Aggregate metrics ──
        const allianceMap = {};
        let totalPowerGained = 0, totalDeadsGained = 0, totalKPGained = 0;
        let totalTroopPowerGained = 0, totalCmdPowerGained = 0, totalTechPowerGained = 0, totalBuildPowerGained = 0;
        const whaleThreshold = 500000;
        const whales = [];
        const allianceSwitchers = [];

        for (const gov of sortedRoster) {
            const isMigrant = gov.powerDelta === 'NEW' || gov.status === 'New';
            const pDelta = isMigrant ? gov.powerEnd : (typeof gov.powerDelta === 'number' ? gov.powerDelta : 0);
            const troopDelta = gov.troopDelta || 0;
            const cmdDelta = gov.cmdDelta || 0;
            const techDelta = gov.techDelta || 0;
            const buildDelta = gov.buildDelta || 0;
            const kpDelta = gov.kpDelta || 0;
            const deadsDelta = gov.deadDelta || 0;

            totalPowerGained += pDelta;
            totalTroopPowerGained += troopDelta;
            totalCmdPowerGained += cmdDelta;
            totalTechPowerGained += techDelta;
            totalBuildPowerGained += buildDelta;
            totalKPGained += kpDelta;
            totalDeadsGained += deadsDelta;

            if (pDelta >= whaleThreshold) {
                whales.push({ id: gov.id, name: gov.name, alliance: gov.alliance, powerDelta: pDelta, isMigrant });
            }

            if (gov.allianceStart && gov.alliance !== gov.allianceStart && gov.allianceStart !== 'None') {
                allianceSwitchers.push({ id: gov.id, name: gov.name, from: gov.allianceStart, to: gov.alliance, power: gov.powerEnd });
            }

            const activeTag = gov.alliance && gov.alliance !== 'None' ? gov.alliance : 'No Tag';
            if (!allianceMap[activeTag]) {
                allianceMap[activeTag] = { 
                    tag: activeTag, 
                    govCount: 0, 
                    powerStart: 0, 
                    powerEnd: 0, 
                    powerDelta: 0, 
                    troopDelta: 0, 
                    cmdDelta: 0, 
                    techDelta: 0, 
                    buildDelta: 0, 
                    kpDelta: 0, 
                    deadsDelta: 0,
                    governors: []
                };
            }
            allianceMap[activeTag].govCount += 1;
            allianceMap[activeTag].powerStart += (gov.powerStart || 0);
            allianceMap[activeTag].powerEnd += gov.powerEnd;
            allianceMap[activeTag].powerDelta += pDelta;
            allianceMap[activeTag].troopDelta += troopDelta;
            allianceMap[activeTag].cmdDelta += cmdDelta;
            allianceMap[activeTag].techDelta += techDelta;
            allianceMap[activeTag].buildDelta += buildDelta;
            allianceMap[activeTag].kpDelta += kpDelta;
            allianceMap[activeTag].deadsDelta += deadsDelta;
            allianceMap[activeTag].governors.push({
                id: gov.id,
                name: gov.name,
                powerEnd: gov.powerEnd,
                powerStart: gov.powerStart || 0,
                powerDelta: pDelta,
                troopDelta,
                cmdDelta,
                techDelta,
                kpDelta,
                deadsDelta,
                isMigrant,
                isWhale: pDelta >= whaleThreshold || (gov.powerEnd || 0) >= 65000000
            });
        }

        // ── Migration processing ──
        const newArrivals = (migrationData || [])
            .filter(g => g.status === 'New' || g.type === 'NEW' || g.powerDelta === 'NEW')
            .map(g => ({ id: g.id, name: g.name, alliance: g.alliance, power: g.powerEnd || g.latestPower || 0, isWhale: (g.powerEnd || 0) >= whaleThreshold }))
            .sort((a, b) => b.power - a.power)
            .slice(0, 30);

        const departed = (migrationData || [])
            .filter(g => g.status === 'Missing' || g.type === 'MIGRATED_OUT' || g.powerDelta === 'MISSING')
            .map(g => ({ id: g.id, name: g.name, alliance: g.alliance || g.allianceStart, power: g.powerStart || g.latestPower || 0, destination: g.note || 'Unknown' }))
            .sort((a, b) => b.power - a.power)
            .slice(0, 30);

        // ── Follow Analysis — cross-reference high-power new arrivals vs top alliances ──
        const followSignals = [];
        if (newArrivals.length > 0) {
            // Group new arrivals by alliance and flag which have a large existing membership
            const allianceCounts = {};
            for (const g of sortedRoster) {
                if (g.powerDelta !== 'NEW' && g.alliance && g.alliance !== 'None') {
                    allianceCounts[g.alliance] = (allianceCounts[g.alliance] || 0) + 1;
                }
            }
            const arrivalsByAlliance = {};
            for (const a of newArrivals) {
                if (!a.alliance || a.alliance === 'None') continue;
                if (!arrivalsByAlliance[a.alliance]) arrivalsByAlliance[a.alliance] = [];
                arrivalsByAlliance[a.alliance].push(a);
            }
            for (const [tag, arrivals] of Object.entries(arrivalsByAlliance)) {
                if (arrivals.length > 0) {
                    const existingCount = allianceCounts[tag] || 0;
                    followSignals.push({
                        leaderAlliance: tag,
                        leader: null, // no longer pinned to power rank
                        existingMemberCount: existingCount,
                        followerCount: arrivals.length,
                        followers: arrivals.slice(0, 5).map(f => f.name),
                    });
                }
            }
            followSignals.sort((a, b) => b.followerCount - a.followerCount);
        }

        // ── Time-Adjusted Velocity Metrics ──
        let windowDays = 1;
        if (resolvedStartDate && resolvedEndDate) {
            const sTime = new Date(resolvedStartDate).getTime();
            const eTime = new Date(resolvedEndDate).getTime();
            windowDays = Math.max(1, Math.round(Math.abs(eTime - sTime) / (1000 * 60 * 60 * 24)));
        }
        const windowPowerVelocity = Math.round(totalPowerGained / windowDays);
        const lifetimePowerVelocity = (serverAgeDays && serverAgeDays > 0) 
            ? Math.round(totalEndPower / serverAgeDays) 
            : null;
        const velocityRatio = (lifetimePowerVelocity && lifetimePowerVelocity > 0)
            ? Math.round((windowPowerVelocity / lifetimePowerVelocity) * 100)
            : null;
        const momentumStatus = velocityRatio === null ? 'UNKNOWN' : velocityRatio >= 130 ? 'SURGE' : velocityRatio >= 85 ? 'NOMINAL' : velocityRatio > 0 ? 'SLOW' : 'NEGATIVE';

        // ── Compute Behavioral Signatures (Age & Window Calibrated) ──
        const behavioralSigs = computeBehavioralSignatures(sortedRoster, followSignals, serverAgeDays, era, windowDays, allianceSwitchers);
        const { operators, veterans, anchors, gravityCenters, calibration } = behavioralSigs;

        // Populate followSignals with internal consolidation hubs if no cross-kingdom migration exists
        const effectiveFollowSignals = (followSignals && followSignals.length > 0) ? followSignals : (gravityCenters || []);

        // ── Compute Deception & Fraud Detection Matrix ──
        const anomalies = analyzeKingdomPolygraphAnomalies(sortedRoster, serverAgeDays, era);

        // ── Build AI Prompt ──
        const allianceList = Object.values(allianceMap).filter(a => a.tag !== 'No Tag')
            .map(a => ({
                ...a,
                governors: (a.governors || []).sort((x, y) => (y.powerEnd || 0) - (x.powerEnd || 0))
            }))
            .sort((a,b) => b.powerDelta - a.powerDelta);

        const kingdomSummary = `
KINGDOM ${kd} ${kingdomMeta?.kingdomName ? `(${kingdomMeta.kingdomName})` : ''} (Top ${depth} Govs | Depth: ${sortedRoster.length}):
- Server Age: ${serverAgeDays !== null ? `${serverAgeDays} Days Old` : 'Uncalibrated'} | Era: ${era} | Founded: ${kingdomMeta?.foundedDate || 'Unknown'}
- The King: ${kingdomMeta?.theKing || 'Unknown'}
- Tracked Kingdom Power: ${(totalEndPower / 1e6).toFixed(1)}M
- Window Velocity: ${windowPowerVelocity >= 0 ? '+' : ''}${(windowPowerVelocity / 1e6).toFixed(2)}M/day (over ${windowDays} days)
${lifetimePowerVelocity ? `- Lifetime Daily Pace: +${(lifetimePowerVelocity / 1e6).toFixed(2)}M/day (Velocity Momentum: ${velocityRatio}%, Status: ${momentumStatus})` : ''}
- Total Power Gained: ${totalPowerGained.toLocaleString()}
- Troop Power Gained: ${totalTroopPowerGained.toLocaleString()}
- Cmdr Power Gained: ${totalCmdPowerGained.toLocaleString()}
- KP Gained: ${totalKPGained.toLocaleString()}
- Dead Troops Delta: ${totalDeadsGained.toLocaleString()}
- New Arrivals: ${newArrivals.length}
- Departed: ${departed.length}
- Alliance Switchers: ${allianceSwitchers.length}
- High-Velocity Spenders (>500k): ${whales.length}

ANOMALY & DECEPTION MATRIX (Polygraph Fraud Signals):
- Kingdom Integrity Score: ${anomalies.integrityScore}/100 (${anomalies.integrityRating})
- Predicted KvK Seed: ${anomalies.seedProjection} (Top 50 Power: ${(anomalies.top50Power/1e9).toFixed(2)}B, Peer Maturity: ${anomalies.peerBenchmark.maturityRating})
- Stat-Padding Suspects (T1 Farm Duelers): ${anomalies.statPadders.length} detected
${anomalies.statPadders.slice(0, 3).map(s => `  ${s.name} [${s.alliance}]: ${s.reason}`).join('\n')}
- Seed Sandbagging Suspects (Power Dumping): ${anomalies.sandbaggers.length} detected
${anomalies.sandbaggers.slice(0, 3).map(s => `  ${s.name} [${s.alliance}]: ${s.reason}`).join('\n')}
- Deadweight Whales: ${anomalies.deadweightWhales.length} detected (${(anomalies.deadweightPowerTotal/1e6).toFixed(1)}M power, ${anomalies.deadweightPowerPercentage}% of Top 50 power)
- Frontline Hyper-Combatants: ${anomalies.hyperCombatants.length} detected

BEHAVIORAL SIGNATURES (Age-Calibrated for ${era}, Age: ${serverAgeDays ?? 'Uncalibrated'}d, Window: ${windowDays}d):
- Operators (high KP ≥ ${calibration.kpOperatorThreshold.toLocaleString()}, low power grind — combat leaders/coordinators): ${operators.length} detected
${operators.slice(0, 6).map(g => `  [${g.alliance}] ${g.name} | KP+${(g.kpDelta/1000).toFixed(1)}k | Power:${g.powerDelta>=0?'+':''}${(g.powerDelta/1000000).toFixed(2)}M`).join('\n') || '  None detected'}
- Veterans (power ≥ ${(calibration.minVeteranPower/1000000).toFixed(1)}M, low power delta — tenured command/pillars): ${veterans.length} detected
${veterans.slice(0, 6).map(g => `  [${g.alliance}] ${g.name} | Total:${(g.powerEnd/1000000).toFixed(1)}M | Delta:${(g.powerDelta/1000000).toFixed(2)}M`).join('\n') || '  None detected'}
- Gravity Centers (${calibration.gravityCenterType === 'consolidation' ? 'Internal Alliance Consolidation' : 'Migrant Influx'}):
${effectiveFollowSignals.slice(0, 5).map(f => `  [${f.leaderAlliance}] ${f.followerCount} ${f.signalType === 'consolidation' ? 'switchers absorbed' : 'new arrivals'}${f.followers?.length ? ` (${f.followers.join(', ')})` : ''}`).join('\n') || '  None detected.'}

ALLIANCE MATRIX (sorted by power growth):
${allianceList.slice(0, 15).map(a => `[${a.tag}] Govs:${a.govCount} | Power:${a.powerDelta > 0 ? '+' : ''}${(a.powerDelta/1000000).toFixed(2)}M | Troops:${a.troopDelta > 0 ? '+' : ''}${(a.troopDelta/1000000).toFixed(2)}M | KP:${a.kpDelta > 0 ? '+' : ''}${(a.kpDelta/1000).toFixed(0)}k | Deads:${a.deadsDelta}`).join('\n')}

FOLLOW SIGNALS (migrants who joined near top-power governors):
${followSignals.length > 0 ? followSignals.map(f => `${f.followerCount} player(s) joined [${f.leaderAlliance}] near ${f.leader} (${(f.leaderPower/1000000).toFixed(1)}M power)`).join('\n') : 'None detected.'}

ALLIANCE CHURN (top switchers):
${allianceSwitchers.slice(0, 8).map(s => `${s.name}: [${s.from}] → [${s.to}] | Power: ${(s.power/1000000).toFixed(1)}M`).join('\n')}
`;

        const aiPrompt = `You are J.A.R.V.I.S., a Rise of Kingdoms intelligence analyst. Perform an Early Kingdom Polygraph Test on Kingdom ${kd}.

${kingdomSummary}

CRITICAL KINGDOM AGE & ERA CONTEXT:
This kingdom is ${serverAgeDays !== null ? `${serverAgeDays} days old in ${era}` : 'of uncalibrated age'}.
- Evaluate their stability and growth specifically through the lens of this age and game stage. A young kingdom (<150 days) naturally grows rapidly from building/tech development; an older kingdom (>300 days) grows primarily through troop training and KvK pass wars.
- Consider whether their velocity (${velocityRatio ? `${velocityRatio}% of historical daily pace` : 'standard'}) represents a mobilization surge, healthy peacetime growth, or stagnation.

Assess stability, conflict patterns, and migration signals. Return ONLY raw JSON matching this exact schema:

CRITICAL LANGUAGE INSTRUCTION: You MUST write your analysis entirely in the language code: '${locale}' (e.g. if 'es' use Spanish, if 'ko' use Korean, if 'zh' use Chinese). Maintain the exact JSON keys in English, but translate ALL of the JSON string values into ${locale}.

{
  "grade": "A|B|C|D|F",
  "gradeRationale": "1-2 sentences. Specifically explain what data points (power growth, deads, switchers, KP, posture) drove this letter grade. Be direct.",
  "civilWarProbability": 0-100,
  "civilWarRationale": "1-2 sentences. Specifically explain what signals drove this civil war %. Reference alliance switching counts, deads delta, specific alliance KP/dead imbalances, or internal fractures observed.",
  "posture": "Peaceful Farming | Active Skirmishing | Civil War | Whale Surge | Rapid Expansion",
  "diagnosis": "2-3 sentences on overall kingdom health based on power vs deads ratio and growth pattern.",
  "stabilityIndex": "1 sentence on roster churn, migration volume, and alliance switching.",
  "economicIntel": "1 sentence analyzing the balance of troop power vs commander vs tech growth.",
  "conflictTheories": ["Deduce which alliances are fighting based on deads + troop drops. Be specific with alliance tags.", "Second theory if applicable."],
  "followAnalysis": "1-2 sentences: Which alliances are attracting new migrants? Is there a gravitational center forming? Call out specific tags.",
  "leadershipAssessment": "1-2 sentences assessing influence structure based on BEHAVIORAL signals (operators, veterans, gravity centers). Do NOT assume power rank = leadership. Note if combat-active governors suggest an organized command structure vs a fragmented leaderless state.",
  "migrantIntel": "1 sentence on what the arrivals and departures signal about this kingdom's reputation and trajectory.",
  "recommendation": "One clear action sentence: is this kingdom worth migrating to, attacking, or avoiding?"
}`;

        const customKey = req.headers.get('x-gemini-key');
        const apiKey = customKey || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        const customModel = req.headers.get('x-gemini-model');
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

        let aiBrief = null;
        if (apiKey && aiParam) {
            logEvent('VISION_POLYGRAPH_SCAN', {
                kd,
                start,
                end,
                depth,
                model: apiModel
            }, {
                userEmail: session?.user?.username || session?.user?.email || 'anonymous',
                userAgent: req.headers.get('user-agent') || '',
            });

            try {
                const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: aiPrompt }] }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: "application/json" }
                        })
                    }
                );
                if (geminiRes.ok) {
                    const geminiData = await geminiRes.json();
                    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                    aiBrief = JSON.parse(rawText);
                } else {
                    console.error("[Health Report API] Gemini Fetch Failed:", await geminiRes.text());
                }
            } catch (aiErr) {
                console.error("[Health Report API] Gemini Parse Error:", aiErr);
            }
        }

        const kdResult = {
            kd,
            kingdomName: kingdomMeta?.kingdomName || null,
            theKing: kingdomMeta?.theKing || null,
            kingdomProgress: era,
            foundedDate: kingdomMeta?.foundedDate || null,
            serverAgeDays,
            era,
            eraKey,
            velocityMetrics: {
                windowDays,
                windowPowerVelocity,
                lifetimePowerVelocity,
                velocityRatio,
                momentumStatus
            },
            rosterSize: sortedRoster.length,
            startDate: resolvedStartDate,
            endDate: resolvedEndDate,
            metrics: { totalPowerGained, totalTroopPowerGained, totalCmdPowerGained, totalTechPowerGained, totalBuildPowerGained, totalKPGained, totalDeadsGained, whalesCount: whales.length, switchersCount: allianceSwitchers.length },
            alliances: allianceList,
            switchers: allianceSwitchers.slice(0, 20),
            whales: whales.sort((a, b) => b.powerDelta - a.powerDelta).slice(0, 20),
            migration: { newArrivals, departed },
            behavioralSigs,
            followSignals: effectiveFollowSignals,
            anomalies,
        };

        return NextResponse.json({ success: true, kingdom: kdResult, ai: aiBrief }, { status: 200 });

    } catch (error) {
        console.error("[API/AWS/Health-Report] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error compiling Health Report." }, { status: 500 });
    }
}
