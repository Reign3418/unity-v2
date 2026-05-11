import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOverviewDeltas, getGlobalConfig } from '@/lib/awsDynamo';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get('kd');
        const start = searchParams.get('start'); 
        const end = searchParams.get('end');
        const depth = parseInt(searchParams.get('depth') || '300', 10);

        if (!kingdomId) {
            return NextResponse.json({ error: "Missing 'kd' parameter." }, { status: 400 });
        }

        if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kingdomId)) {
            return NextResponse.json({ error: "Access Denied." }, { status: 403 });
        }

        const rosterData = await getOverviewDeltas(kingdomId, start, end);
        
        if (!rosterData || rosterData.length === 0) {
             return NextResponse.json({ error: "No data available for this kingdom in the given range." }, { status: 404 });
        }

        // Apply depth sorting by latest power and slice
        const sortedRoster = rosterData.sort((a, b) => b.powerEnd - a.powerEnd).slice(0, depth);

        // Aggregate Alliance metrics
        const allianceMap = {};
        let totalPowerGained = 0;
        let totalDeadsGained = 0;
        let totalKPGained = 0;
        let totalTroopPowerGained = 0;
        let totalCmdPowerGained = 0;
        
        const whaleThreshold = 2000000; // +2M power in the window
        const whales = [];
        const allianceSwitchers = [];

        for (const gov of sortedRoster) {
            const pDelta = gov.powerDelta === 'NEW' ? gov.powerEnd : gov.powerDelta;
            const troopDelta = gov.troopDelta || 0;
            const cmdDelta = gov.cmdDelta || 0;
            const kpDelta = gov.kpDelta || 0;
            const deadsDelta = gov.deadsDelta || 0;

            totalPowerGained += pDelta;
            totalTroopPowerGained += troopDelta;
            totalCmdPowerGained += cmdDelta;
            totalKPGained += kpDelta;
            totalDeadsGained += deadsDelta;

            if (pDelta >= whaleThreshold) {
                whales.push({ id: gov.id, name: gov.name, alliance: gov.alliance, powerDelta: pDelta });
            }

            if (gov.allianceStart && gov.alliance !== gov.allianceStart) {
                allianceSwitchers.push({ 
                    id: gov.id, 
                    name: gov.name, 
                    from: gov.allianceStart, 
                    to: gov.alliance,
                    power: gov.powerEnd
                });
            }

            const activeTag = gov.alliance && gov.alliance !== 'None' ? gov.alliance : 'No Tag';
            if (!allianceMap[activeTag]) {
                allianceMap[activeTag] = { 
                    tag: activeTag, 
                    govCount: 0, 
                    totalPowerStart: 0, 
                    totalPowerEnd: 0,
                    powerDelta: 0,
                    deadsDelta: 0
                };
            }
            allianceMap[activeTag].govCount += 1;
            allianceMap[activeTag].totalPowerStart += (gov.powerStart || 0);
            allianceMap[activeTag].totalPowerEnd += gov.powerEnd;
            allianceMap[activeTag].powerDelta += pDelta;
            allianceMap[activeTag].deadsDelta += deadsDelta;
        }

        const topAlliances = Object.values(allianceMap)
            .filter(a => a.tag !== 'No Tag')
            .sort((a, b) => b.totalPowerEnd - a.totalPowerEnd)
            .slice(0, 5);

        // Format data for AI
        const aiPrompt = `You are an intelligence analyst evaluating the early-game stability of Kingdom ${kingdomId}.
Your goal is to perform an "Early Kingdom Polygraph Test" across a tight date range.
Analyze the following metrics to determine if the kingdom is peacefully building for KvK, actively skirmishing, or engaged in a toxic civil war.

METRICS (Top ${depth} Governors):
- Total Power Gained: ${totalPowerGained.toLocaleString()}
- Total Troop Power Gained: ${totalTroopPowerGained.toLocaleString()}
- Total Commander Power Gained: ${totalCmdPowerGained.toLocaleString()}
- Total Kill Points Gained: ${totalKPGained.toLocaleString()}
- Total Dead Troops: ${totalDeadsGained.toLocaleString()}

ALLIANCE DYNAMICS (Top 5):
${topAlliances.map(a => `- [${a.tag}] Govs: ${a.govCount} | Power Delta: ${a.powerDelta.toLocaleString()} | Deads: ${a.deadsDelta.toLocaleString()}`).join('\n')}

MIGRATION / ALLIANCE CHURN:
- Total Alliance Switchers (Top ${depth}): ${allianceSwitchers.length}
- Notable Whales (>2M power growth): ${whales.length}

Return ONLY a raw JSON object. No markdown. No code fences. No explanation. Just the JSON.

{
  "grade": "A|B|C|D|F",
  "civilWarProbability": "0-100%",
  "posture": "Peaceful Farming / Active Skirmishing / Total Civil War / Whale Surges",
  "assessment": "2-3 sentences explaining your grade and diagnosis based on the power vs deads ratio and alliance growth.",
  "stabilityIndex": "1 sentence on roster churn and alliance switching.",
  "economicIntel": "1 sentence analyzing troop power vs commander power growth."
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
                            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
                        })
                    }
                );
                
                if (geminiRes.ok) {
                    const geminiData = await geminiRes.json();
                    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                    let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
                    const fi = cleaned.indexOf('{');
                    const li = cleaned.lastIndexOf('}');
                    if (fi !== -1 && li >= fi) cleaned = cleaned.substring(fi, li + 1);
                    aiBrief = JSON.parse(cleaned);
                }
            } catch (aiErr) {
                console.error("[Kingdom Health API] Gemini Parse Error:", aiErr);
            }
        }

        return NextResponse.json({ 
            success: true, 
            rosterSize: sortedRoster.length,
            metrics: {
                totalPowerGained,
                totalTroopPowerGained,
                totalCmdPowerGained,
                totalKPGained,
                totalDeadsGained,
                whalesCount: whales.length,
                switchersCount: allianceSwitchers.length
            },
            topAlliances,
            switchers: allianceSwitchers.slice(0, 10), // top 10 examples
            whales: whales.sort((a,b) => b.powerDelta - a.powerDelta).slice(0, 10),
            ai: aiBrief
        }, { status: 200 });

    } catch (error) {
        console.error("[API/AWS/Health-Report] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error compiling Health Report." }, { status: 500 });
    }
}
