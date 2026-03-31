import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGlobalConfig, getAdvancedKingdomDeltas } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";

export const maxDuration = 60; // Vercel: extend function timeout to 60s for multi-kingdom AWS queries

export async function POST(req) {
    try {
        const session = await auth();
        // Super Admin access check
        if (!session || !session.user || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Access Denied. AI Matchmaker requires Creator Studio clearance." }, { status: 403 });
        }

        const { kingdoms, timeframeDays = 30 } = await req.json();

        if (!kingdoms || !Array.isArray(kingdoms) || kingdoms.length === 0) {
            return NextResponse.json({ error: "Invalid payload. Provide an array of target kingdoms." }, { status: 400 });
        }

        const timeframeHours = Number(timeframeDays) * 24;

        const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ 
                error: "Server Configuration Error: Vision Key Missing.",
                debug: `header=${!!req.headers.get('x-gemini-key')}, env=${!!process.env.GEMINI_API_KEY}`
            }, { status: 500 });
        }

        // Aggregate statistics per kingdom
        const kdDataArr = [];

        const MAX_KINGDOMS = 8;
        const limitedKingdoms = kingdoms.slice(0, MAX_KINGDOMS);

        // Run ALL kingdom lookups in PARALLEL — turns 4x sequential 3s waits into one 3s batch
        const rosterResults = await Promise.all(
            limitedKingdoms.map(kd => getAdvancedKingdomDeltas(kd, timeframeHours).catch(() => ({ roster: [], leadershipIntel: null })))
        );

        for (let i = 0; i < limitedKingdoms.length; i++) {
            const kd = limitedKingdoms[i];
            const { roster, leadershipIntel } = rosterResults[i] || { roster: [], leadershipIntel: null };
            if (!roster || roster.length === 0) continue;

            // Slice top 300 to represent the core fighting/spending force context
            const coreRoster = roster.sort((a,b) => (b.power || b.missingBasePower || 0) - (a.power || a.missingBasePower || 0)).slice(0, 300);

            let totalPowerDelta = 0;
            let totalTechPower = 0;
            let totalBuildingPower = 0;
            let totalCommanderPower = 0;
            let totalTroopPower = 0;
            let sumBasePower = 0;

            let migrantInPower = 0;
            let migrantOutPower = 0;
            let sleepingPower = 0;

            for (const gov of coreRoster) {
                // Tracking total macro trends for non-missing
                if (gov.powerDelta !== 'MISSING') {
                    totalTechPower += (gov.techPower || 0);
                    totalBuildingPower += (gov.buildingPower || 0);
                    totalCommanderPower += (gov.commanderPower || 0);
                    totalTroopPower += (gov.troopPower || 0);
                    sumBasePower += gov.power;
                }

                // Temporal State Categorization
                if (gov.powerDelta === 'NEW') {
                    migrantInPower += gov.power;
                    totalPowerDelta += gov.power;
                } else if (gov.powerDelta === 'MISSING') {
                    migrantOutPower += (gov.missingBasePower || 0);
                    totalPowerDelta -= (gov.missingBasePower || 0);
                } else {
                    const powerD = Number(gov.powerDelta) || 0;
                    totalPowerDelta += powerD;
                    const kpD = Number(gov.kpDelta) || 0;
                    if (powerD === 0 && kpD === 0) {
                        sleepingPower += gov.power;
                    }
                }
            }

            kdDataArr.push({
                kingdomId: kd,
                rosterSizeAnalyzed: coreRoster.length,
                totalBasePower: sumBasePower,
                growthMetrics: {
                    timeframeDaysScanned: timeframeDays,
                    powerDeltaOverall: totalPowerDelta,
                    totalTechPower: totalTechPower,
                    totalBuildingPower: totalBuildingPower,
                    totalCommanderPower: totalCommanderPower,
                    totalTroopPower: totalTroopPower,
                },
                behavioralMatrix: {
                    migrantsInRecruitedPower: migrantInPower,
                    migrantsOutExodusPower: migrantOutPower,
                    sleepingDeadWeightPower: sleepingPower
                },
                leadershipIntel: leadershipIntel || null
            });
        }


        if (kdDataArr.length === 0) {
            return NextResponse.json({ error: "Failed to locate actionable historical data for the requested kingdoms." }, { status: 404 });
        }

        // Fire-and-forget event log — never awaited so it adds zero latency
        logEvent('MATCHMAKER_SCAN', {
            kingdoms: limitedKingdoms,
            timeframeDays,
            kingdomCount: kdDataArr.length,
        }, {
            userEmail: session?.user?.email || 'anonymous',
            userAgent: req.headers.get('user-agent') || '',
        });

        const prompt = `You are a military migration analyst for Rise of Kingdoms.
Review the following aggregated economic and growth data for multiple kingdoms. Your goal is to single out the ONE BEST kingdom for migration based strictly on signs of high economic activity and heavy player spending.

CRITICAL INSTRUCTIONS:
1. EXAMINE THE 'behavioralMatrix'. Large 'migrantsOutExodusPower' over the timeframe strongly indicates a leadership failure, coup, or mass exodus. Punish this severely.
2. Large 'migrantsInRecruitedPower' indicates highly successful recruitment engines. Reward this.
3. High 'sleepingDeadWeightPower' means many of their top 300 players have literally 0 activity over the timeframe. Heavily penalize kingdoms floating dead weight.
4. PLACE HIGH VALUE on 'powerDeltaOverall'. High 'totalTechPower', 'totalCommanderPower', and 'totalTroopPower' confirm systemic strength — troop power is VERY expensive and is a strong spending signal.
5. ANALYZE 'leadershipIntel' with extreme scrutiny:
   - 'stabilityScore' (0-100%): How many of the OLD Top 20 are still in the current Top 20. Low score = coup d'état or mass defection at the top. Below 60% is a RED FLAG.
   - 'activityRate' (0-100%): What % of current Top 20 leaders are actually growing. Below 70% means leadership is checked out — a catastrophic signal for migration.
   - 'powerConcentration' (0-100%): % of the top 300 power held by the top 10. Very high (>40%) = whale-dependent; moderate (15-30%) = distributed healthy kingdom.
   - 'sleepingLeaderPower': Raw power of inactive top-20 leaders. Massive sleeping leader power = dead leadership class.
   - 'top10Snapshot': Named list of leaders. Look for 'isNew: true' entries — new faces in top leadership = instability signal.
6. IGNORE raw Kill Points. We only care about economic health and leadership accountability.
7. Structure your response as a valid RAW JSON object (NO MARKDOWN CODE BLOCKS).

JSON SCHEMA TO RETURN:
{
  "winner": "4025",
  "confidenceScore": "95%",
  "verdictSummary": "A punchy 2-sentence executive summary declaring the winner and specifically citing their leadership metrics.",
  "leadershipVerdicts": [
    { "kd": "4025", "stabilityGrade": "A", "activityGrade": "B+", "leadershipAssessment": "1-2 sentence qualitative judgment on leadership health." },
    { "kd": "4026", "stabilityGrade": "D", "activityGrade": "F", "leadershipAssessment": "1-2 sentence explanation of why leadership is failing." }
  ],
  "competitiveAnalysis": [
     { "kd": "4025", "assessment": "Brief technical analysis of growth trends and leadership accountability." },
     { "kd": "4026", "assessment": "Brief critique including specific leadership failure points." }
  ],
  "spendingSignature": "Point out which sub-metric proved the presence of high spending or activity."
}

DATA PAYLOAD:
${JSON.stringify(kdDataArr, null, 2)}`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        
        const geminiResponse = await fetch(`${apiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
            })
        });

        if (!geminiResponse.ok) {
            console.error("Gemini Matchmaker Error");
            return NextResponse.json({ error: "AI Engine refused the payload." }, { status: 502 });
        }
        
        const result = await geminiResponse.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const firstBracket = cleaned.indexOf('{');
        const lastBracket = cleaned.lastIndexOf('}');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        } else {
            return NextResponse.json({ error: "The AI Core failed to structure the matchmaker response." }, { status: 400 });
        }
        
        const matchData = JSON.parse(cleaned);

        return NextResponse.json({ 
            success: true, 
            aiReport: matchData, 
            rawStats: kdDataArr 
        });

    } catch (error) {
        console.error("[Matchmaker API] Error:", error);
        return NextResponse.json({ 
            error: "Internal Server Fault during Matchmaker routine.",
            debug: error?.message || String(error)
        }, { status: 500 });
    }
}
