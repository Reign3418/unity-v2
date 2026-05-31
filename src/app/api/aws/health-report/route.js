import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOverviewDeltas, getMigrationMatrix, getGlobalConfig } from '@/lib/awsDynamo';
import { logEvent } from '@/lib/eventLogger';

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
function computeBehavioralSignatures(roster, followSignals) {
    const active = roster.filter(g => g.status !== 'Missing' && g.powerDelta !== 'MISSING');

    // ── Operators: high KP delta + near-zero or negative power delta ──
    // These governors are fighting and coordinating, not spending gems on power.
    const KP_OPERATOR_THRESHOLD = 50000;
    const operators = active
        .filter(g => {
            const kp = g.kpDelta || 0;
            const pd = typeof g.powerDelta === 'number' ? g.powerDelta : (g.powerDelta === 'NEW' ? 999999 : 0);
            return kp >= KP_OPERATOR_THRESHOLD && pd < 2000000; // High KP, modest or no power grind
        })
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

    // ── Veterans: top accumulated power, low power delta this window ──
    // High total power shows long tenure; low recent delta suggests they're organizing not farming.
    const veterans = active
        .filter(g => {
            const pd = typeof g.powerDelta === 'number' ? g.powerDelta : 999999;
            return g.powerEnd >= 20000000 && pd < 3000000 && g.powerDelta !== 'NEW';
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

    // ── Anchors: stable, non-migrating, same alliance the whole window ──
    // Necessary condition for leadership; alone is not sufficient.
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

    // ── Gravity Centers: alliances pulling in migrants (from followSignals) ──
    const gravityCenters = followSignals || [];

    return { operators, veterans, anchors, gravityCenters };
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

        if (!kdsParam) {
            return NextResponse.json({ error: "Missing 'kds' parameter." }, { status: 400 });
        }

        // Single kingdom mode — only process the first kingdom
        const kd = kdsParam.split(',')[0].trim();

        // ── Run all three engines concurrently for the single kingdom ──
        const [rosterData, migrationData] = await Promise.all([
            getOverviewDeltas(kd, start, end),
            getMigrationMatrix(kd, start, end),
        ]);

        if (!rosterData || rosterData.length === 0) {
            return NextResponse.json({ error: "No data available for the requested kingdom." }, { status: 404 });
        }

        const sortedRoster = rosterData.sort((a, b) => b.powerEnd - a.powerEnd).slice(0, depth);

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
                allianceMap[activeTag] = { tag: activeTag, govCount: 0, powerStart: 0, powerEnd: 0, powerDelta: 0, troopDelta: 0, cmdDelta: 0, techDelta: 0, buildDelta: 0, kpDelta: 0, deadsDelta: 0 };
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

        // ── Compute Behavioral Signatures ──
        const behavioralSigs = computeBehavioralSignatures(sortedRoster, followSignals);
        const { operators, veterans, anchors } = behavioralSigs;

        // ── Build AI Prompt ──
        const allianceList = Object.values(allianceMap).filter(a => a.tag !== 'No Tag')
            .sort((a,b) => b.powerDelta - a.powerDelta);

        const kingdomSummary = `
KINGDOM ${kd} (Top ${depth} Govs | Depth: ${sortedRoster.length}):
- Total Power Gained: ${totalPowerGained.toLocaleString()}
- Troop Power Gained: ${totalTroopPowerGained.toLocaleString()}
- Cmdr Power Gained: ${totalCmdPowerGained.toLocaleString()}
- KP Gained: ${totalKPGained.toLocaleString()}
- Dead Troops Delta: ${totalDeadsGained.toLocaleString()}
- New Arrivals: ${newArrivals.length}
- Departed: ${departed.length}
- Alliance Switchers: ${allianceSwitchers.length}
- High-Velocity Spenders (>500k): ${whales.length}

BEHAVIORAL SIGNATURES (computed from roster activity — NOT raw power rank):
- Operators (high KP, low power grind — likely coordinating): ${operators.length} detected
${operators.slice(0,5).map(g=>`  [${g.alliance}] ${g.name} | KP+${(g.kpDelta/1000).toFixed(0)}k | Power:${g.powerDelta>=0?'+':''}${(g.powerDelta/1000000).toFixed(1)}M`).join('\n')}
- Veterans (high accumulated power, low activity this window): ${veterans.length} detected
${veterans.slice(0,5).map(g=>`  [${g.alliance}] ${g.name} | Total:${(g.powerEnd/1000000).toFixed(1)}M | Delta:${(g.powerDelta/1000000).toFixed(1)}M`).join('\n')}
- Alliance Gravity Centers (attracting new arrivals):
${followSignals.slice(0,5).map(f=>`  [${f.leaderAlliance}] ${f.followerCount} new arrival(s) — existing membership: ${f.existingMemberCount}`).join('\n')||'  None detected.'}

ALLIANCE MATRIX (sorted by power growth):
${allianceList.slice(0, 15).map(a => `[${a.tag}] Govs:${a.govCount} | Power:${a.powerDelta > 0 ? '+' : ''}${(a.powerDelta/1000000).toFixed(2)}M | Troops:${a.troopDelta > 0 ? '+' : ''}${(a.troopDelta/1000000).toFixed(2)}M | KP:${a.kpDelta > 0 ? '+' : ''}${(a.kpDelta/1000).toFixed(0)}k | Deads:${a.deadsDelta}`).join('\n')}

FOLLOW SIGNALS (migrants who joined near top-power governors):
${followSignals.length > 0 ? followSignals.map(f => `${f.followerCount} player(s) joined [${f.leaderAlliance}] near ${f.leader} (${(f.leaderPower/1000000).toFixed(1)}M power)`).join('\n') : 'None detected.'}

ALLIANCE CHURN (top switchers):
${allianceSwitchers.slice(0, 8).map(s => `${s.name}: [${s.from}] → [${s.to}] | Power: ${(s.power/1000000).toFixed(1)}M`).join('\n')}
`;

        const aiPrompt = `You are J.A.R.V.I.S., a Rise of Kingdoms intelligence analyst. Perform an Early Kingdom Polygraph Test on Kingdom ${kd}.

${kingdomSummary}

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
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

        let aiBrief = null;
        if (apiKey) {
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
            rosterSize: sortedRoster.length,
            metrics: { totalPowerGained, totalTroopPowerGained, totalCmdPowerGained, totalTechPowerGained, totalBuildPowerGained, totalKPGained, totalDeadsGained, whalesCount: whales.length, switchersCount: allianceSwitchers.length },
            alliances: allianceList,
            switchers: allianceSwitchers.slice(0, 20),
            whales: whales.sort((a, b) => b.powerDelta - a.powerDelta).slice(0, 20),
            migration: { newArrivals, departed },
            behavioralSigs,
            followSignals,
        };

        return NextResponse.json({ success: true, kingdom: kdResult, ai: aiBrief }, { status: 200 });

    } catch (error) {
        console.error("[API/AWS/Health-Report] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error compiling Health Report." }, { status: 500 });
    }
}
