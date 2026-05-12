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
        const kdsParam = searchParams.get('kds');
        const start = searchParams.get('start'); 
        const end = searchParams.get('end');
        const depth = parseInt(searchParams.get('depth') || '300', 10);

        if (!kdsParam) {
            return NextResponse.json({ error: "Missing 'kds' parameter." }, { status: 400 });
        }

        const kingdoms = kdsParam.split(',').map(k => k.trim()).filter(Boolean);

        // Fetch all kingdom deltas concurrently
        const results = await Promise.all(kingdoms.map(async (kd) => {
            const rosterData = await getOverviewDeltas(kd, start, end);
            if (!rosterData || rosterData.length === 0) return { kd, error: "No data available" };
            
            const sortedRoster = rosterData.sort((a, b) => b.powerEnd - a.powerEnd).slice(0, depth);
            
            const allianceMap = {};
            let totalPowerGained = 0;
            let totalDeadsGained = 0;
            let totalKPGained = 0;
            let totalTroopPowerGained = 0;
            let totalCmdPowerGained = 0;
            let totalTechPowerGained = 0;
            let totalBuildPowerGained = 0;
            
            const whaleThreshold = 500000;
            const whales = [];
            const allianceSwitchers = [];

            for (const gov of sortedRoster) {
                const isMigrant = gov.powerDelta === 'NEW' || gov.status === 'New';
                const pDelta = isMigrant ? gov.powerEnd : gov.powerDelta;
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
                        powerStart: 0, 
                        powerEnd: 0,
                        powerDelta: 0,
                        troopDelta: 0,
                        cmdDelta: 0,
                        techDelta: 0,
                        buildDelta: 0,
                        kpDelta: 0,
                        deadsDelta: 0
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
            }

            return {
                kd,
                rosterSize: sortedRoster.length,
                metrics: {
                    totalPowerGained,
                    totalTroopPowerGained,
                    totalCmdPowerGained,
                    totalTechPowerGained,
                    totalBuildPowerGained,
                    totalKPGained,
                    totalDeadsGained,
                    whalesCount: whales.length,
                    switchersCount: allianceSwitchers.length
                },
                alliances: Object.values(allianceMap).filter(a => a.tag !== 'No Tag'),
                switchers: allianceSwitchers.slice(0, 15),
                whales: whales.sort((a,b) => b.powerDelta - a.powerDelta).slice(0, 15)
            };
        }));

        const successfulKds = results.filter(r => !r.error);
        if (successfulKds.length === 0) {
            return NextResponse.json({ error: "No data available for the requested kingdoms." }, { status: 404 });
        }

        // Build AI Prompt for multi-kingdom comparison
        const kingdomSummaries = successfulKds.map(k => `
KINGDOM ${k.kd} (Top ${depth} Govs):
- Power Gained: ${k.metrics.totalPowerGained.toLocaleString()}
- Troop Power Gained: ${k.metrics.totalTroopPowerGained.toLocaleString()}
- Cmdr Power Gained: ${k.metrics.totalCmdPowerGained.toLocaleString()}
- Kill Points Gained: ${k.metrics.totalKPGained.toLocaleString()}
- Dead Troops: ${k.metrics.totalDeadsGained.toLocaleString()}
- Alliance Switchers: ${k.metrics.switchersCount}
- Whales Surging (>500k): ${k.metrics.whalesCount}

ALLIANCE MATRIX:
${k.alliances.map(a => `[${a.tag}] Power: ${a.powerDelta > 0 ? '+' : ''}${(a.powerDelta/1000000).toFixed(2)}M | Troops: ${a.troopDelta > 0 ? '+' : ''}${(a.troopDelta/1000000).toFixed(2)}M | Cmdr: ${a.cmdDelta > 0 ? '+' : ''}${(a.cmdDelta/1000000).toFixed(2)}M | Deads: ${a.deadsDelta}`).join('\n')}
        `).join('\n');

        const aiPrompt = `You are J.A.R.V.I.S., an intelligence analyst. Perform an "Early Kingdom Polygraph Test" on the following kingdoms across a tight date range.
Analyze the metrics to determine if each kingdom is peacefully building for KvK, actively skirmishing, or engaged in a toxic civil war. Look for correlations between high deads, alliance switching (churn), and massive troop power drops among specific alliances in the Alliance Matrix.

${kingdomSummaries}

Provide a comparative assessment, then give each kingdom a specific grade. Return ONLY raw JSON matching this schema:
{
  "comparativeAssessment": "1-2 paragraphs comparing the trajectories and stability of these kingdoms.",
  "kingdoms": [
    {
      "kd": "1234",
      "grade": "A|B|C|D|F",
      "civilWarProbability": 0-100,
      "posture": "Peaceful Farming | Active Skirmishing | Total Civil War | Whale Surges",
      "diagnosis": "2-3 sentences explaining the grade based on power vs deads ratio.",
      "stabilityIndex": "1 sentence on roster churn and migration.",
      "economicIntel": "1 sentence analyzing troop power vs commander power growth.",
      "conflictTheories": ["1 sentence deducing which alliances are fighting each other based on high deads and troop drops in the Alliance Matrix.", "Another theory if applicable."]
    }
  ]
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
                            generationConfig: { 
                                temperature: 0.1, 
                                maxOutputTokens: 2048,
                                responseMimeType: "application/json"
                            }
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

        return NextResponse.json({ 
            success: true, 
            kingdoms: successfulKds,
            ai: aiBrief
        }, { status: 200 });

    } catch (error) {
        console.error("[API/AWS/Health-Report] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error compiling Health Report." }, { status: 500 });
    }
}
