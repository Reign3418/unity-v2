import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOverviewDeltas, getMigrationMatrix, getGlobalConfig } from '@/lib/awsDynamo';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const localClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Lightweight leadership snapshot — reads start + end snapshots only.
 * Avoids the full multi-interval scan of getBehavioralMatrix to save resources.
 */
async function getLeadershipSnapshot(kingdomId, startKey, endKey) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return null;

    const fetchSnapshot = async (dateKey) => {
        const snap = {};
        let lastKey = null;
        do {
            const params = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': { S: `SCAN#${kingdomId}#${dateKey}` } }
            };
            if (lastKey) params.ExclusiveStartKey = lastKey;
            const res = await localClient.send(new QueryCommand(params));
            for (const item of (res.Items || [])) {
                const attrs = item.attributes?.M || {};
                const id = attrs['Governor ID']?.S || item.SK?.S?.replace('GOV#', '') || '';
                if (!id) continue;
                snap[id] = {
                    id,
                    name: attrs['Governor Name']?.S || 'Unknown',
                    alliance: attrs['Alliance Tag']?.S || 'None',
                    power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                    killPoints: parseInt(attrs['Kill Points']?.N || attrs['killPoints']?.N) || 0,
                };
            }
            lastKey = res.LastEvaluatedKey;
        } while (lastKey);
        return snap;
    };

    try {
        const [prevSnap, latestSnap] = await Promise.all([fetchSnapshot(startKey), fetchSnapshot(endKey)]);

        const latestByPower = Object.entries(latestSnap).sort((a, b) => b[1].power - a[1].power);
        const prevByPower = Object.entries(prevSnap).sort((a, b) => b[1].power - a[1].power);

        const latestTop20Ids = new Set(latestByPower.slice(0, 20).map(([id]) => id));
        const prevTop20Ids = new Set(prevByPower.slice(0, 20).map(([id]) => id));

        let survivingLeaders = 0;
        for (const id of prevTop20Ids) { if (latestTop20Ids.has(id)) survivingLeaders++; }
        const stabilityScore = prevTop20Ids.size > 0 ? Math.round((survivingLeaders / prevTop20Ids.size) * 100) : 0;

        let activeLeaders = 0;
        for (const [id, d] of latestByPower.slice(0, 20)) {
            const prev = prevSnap[id];
            if (!prev || d.power > prev.power || d.killPoints > prev.killPoints) activeLeaders++;
        }
        const activityRate = Math.round((activeLeaders / 20) * 100);

        const top10Power = latestByPower.slice(0, 10).reduce((s, [, d]) => s + d.power, 0);
        const top300Power = latestByPower.slice(0, 300).reduce((s, [, d]) => s + d.power, 0);
        const powerConcentration = top300Power > 0 ? Math.round((top10Power / top300Power) * 100) : 0;

        const top10Snapshot = latestByPower.slice(0, 10).map(([id, d]) => ({
            id,
            name: d.name,
            alliance: d.alliance,
            power: d.power,
            killPoints: d.killPoints,
            isNew: !prevTop20Ids.has(id),
            powerDelta: prevSnap[id] ? (d.power - prevSnap[id].power) : d.power,
        }));

        return { stabilityScore, activityRate, powerConcentration, top10Snapshot, survivingLeaders };
    } catch (e) {
        console.error('[Leadership Snapshot Error]', e);
        return null;
    }
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

        // ── Identify start/end date keys from the roster for leadership snapshot ──
        // We derive them from rosterData metadata — use the approach of looking at the dates API
        // The roster already has powerStart/powerEnd derived from start+end scans.
        // Build the leadership snapshot by re-deriving date keys from the AWS DATES# record
        const tableName = process.env.AWS_TABLE_NAME;
        let leadershipIntel = null;
        try {
            const dateResult = await localClient.send(new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': { S: `DATES#${kd}` } }
            }));
            if (dateResult.Items && dateResult.Items.length >= 2) {
                const parseScanDate = (s) => new Date(s.replace(' UTC', 'Z').replace(' ', 'T'));
                let dates = dateResult.Items
                    .map(i => ({ dateKey: i.SK?.S?.replace('DATE#', '').replace('SCAN#', '') || '', scanDate: i.attributes?.M?.scanDate?.S || '' }))
                    .filter(d => d.dateKey && d.scanDate)
                    .sort((a, b) => parseScanDate(a.scanDate) - parseScanDate(b.scanDate));
                if (start) dates = dates.filter(d => parseScanDate(d.scanDate) >= new Date(start));
                if (end) {
                    const parsedEnd = new Date(end + 'T23:59:59Z');
                    dates = dates.filter(d => parseScanDate(d.scanDate) <= parsedEnd);
                }
                if (dates.length < 2) dates = [dates[0] || dates[dates.length-1], dates[dates.length - 1] || dates[0]];
                if (dates.length >= 2) {
                    leadershipIntel = await getLeadershipSnapshot(kd, dates[0].dateKey, dates[dates.length - 1].dateKey);
                }
            }
        } catch(e) { console.error('[Leadership Date Resolve Error]', e); }

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

        // ── Follow Analysis — cross-reference high-power new arrivals vs top10 ──
        const followSignals = [];
        if (leadershipIntel && newArrivals.length > 0) {
            for (const leader of leadershipIntel.top10Snapshot) {
                const followers = newArrivals.filter(a => a.alliance === leader.alliance && a.id !== leader.id);
                if (followers.length > 0) {
                    followSignals.push({ leader: leader.name, leaderAlliance: leader.alliance, leaderPower: leader.power, followerCount: followers.length, followers: followers.slice(0, 5).map(f => f.name) });
                }
            }
        }

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
- Leadership Stability: ${leadershipIntel?.stabilityScore ?? 'N/A'}%
- Leadership Activity Rate: ${leadershipIntel?.activityRate ?? 'N/A'}%
- Power Concentration (Top10/Top300): ${leadershipIntel?.powerConcentration ?? 'N/A'}%

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
  "civilWarProbability": 0-100,
  "posture": "Peaceful Farming | Active Skirmishing | Civil War | Whale Surge | Rapid Expansion",
  "diagnosis": "2-3 sentences on overall kingdom health based on power vs deads ratio and growth pattern.",
  "stabilityIndex": "1 sentence on roster churn, migration volume, and alliance switching.",
  "economicIntel": "1 sentence analyzing the balance of troop power vs commander vs tech growth.",
  "conflictTheories": ["Deduce which alliances are fighting based on deads + troop drops. Be specific with alliance tags.", "Second theory if applicable."],
  "followAnalysis": "1-2 sentences: Are people following a powerful governor or alliance? Call out any notable gravity signals from the migration data.",
  "leadershipAssessment": "1-2 sentences on whether the top 10 leaders are stable, active, and retaining their position or being replaced.",
  "migrantIntel": "1 sentence on what the arrivals and departures signal about this kingdom's reputation and trajectory.",
  "recommendation": "One clear action sentence: is this kingdom worth migrating to, attacking, or avoiding?"
}`;

        const customKey = req.headers.get('x-gemini-key');
        const apiKey = customKey || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');

        let aiBrief = null;
        if (apiKey) {
            try {
                const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
            followSignals,
            leadershipIntel,
        };

        return NextResponse.json({ success: true, kingdom: kdResult, ai: aiBrief }, { status: 200 });

    } catch (error) {
        console.error("[API/AWS/Health-Report] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error compiling Health Report." }, { status: 500 });
    }
}
