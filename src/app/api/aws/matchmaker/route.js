import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { getGlobalConfig, getAdvancedKingdomDeltas } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";


// ─────────────────────────────────────────────────────────────────────────────
// Aggregate raw roster deltas into the stat block the AI receives
// ─────────────────────────────────────────────────────────────────────────────
function buildKdStats(kd, rosterResult, timeframeDays) {
    const { roster = [], leadershipIntel = null, highActivityDays = [] } = rosterResult;
    if (!roster || roster.length === 0) return null;

    const coreRoster = roster
        .sort((a, b) => (b.power || b.missingBasePower || 0) - (a.power || a.missingBasePower || 0))
        .slice(0, 400);

    let totalPowerDelta = 0, totalTechPower = 0, totalBuildingPower = 0;
    let totalCommanderPower = 0, totalTroopPower = 0, sumBasePower = 0;
    let migrantInPower = 0, migrantOutPower = 0, sleepingPower = 0;

    for (const gov of coreRoster) {
        if (gov.powerDelta !== 'MISSING') {
            totalTechPower      += (gov.techPower      || 0);
            totalBuildingPower  += (gov.buildingPower  || 0);
            totalCommanderPower += (gov.commanderPower || 0);
            totalTroopPower     += (gov.troopPower     || 0);
            sumBasePower        += gov.power;
        }
        if (gov.powerDelta === 'NEW') {
            migrantInPower   += gov.power;
            totalPowerDelta  += gov.power;
        } else if (gov.powerDelta === 'MISSING') {
            migrantOutPower  += (gov.missingBasePower || 0);
            totalPowerDelta  -= (gov.missingBasePower || 0);
        } else {
            const powerD = Number(gov.powerDelta) || 0;
            const kpD    = Number(gov.kpDelta)    || 0;
            totalPowerDelta += powerD;
            if (powerD === 0 && kpD === 0) sleepingPower += gov.power;
        }
    }

    return {
        kingdomId: kd,
        rosterSizeAnalyzed: coreRoster.length,
        totalBasePower: sumBasePower,
        growthMetrics: {
            timeframeDaysScanned: timeframeDays,
            powerDeltaOverall:    totalPowerDelta,
            totalTechPower,
            totalBuildingPower,
            totalCommanderPower,
            totalTroopPower,
        },
        behavioralMatrix: {
            migrantsInRecruitedPower: migrantInPower,
            migrantsOutExodusPower:   migrantOutPower,
            sleepingDeadWeightPower:  sleepingPower,
        },
        leadershipIntel:  leadershipIntel || null,
        highActivityDays: highActivityDays,  // days with >1 scan (surveillance signal)
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-window AI prompt (standard mode)
// ─────────────────────────────────────────────────────────────────────────────
function buildSinglePrompt(kdDataArr, timeframeDays) {
    const is24h = Number(timeframeDays) <= 1;
    const contextNote = is24h
        ? `NOTE: This is a 24-HOUR SNAPSHOT. During active migration or event days, migration metrics (migrantsIn/Out) are highly volatile and should NOT be used as primary decision signals. Focus on tech/troop power composition and leadership stability instead.`
        : `NOTE: Any kingdom showing highActivityDays entries was under active surveillance on those dates — likely a migration event or leadership crisis. This is an observation signal, not a negative mark.`;

    return `You are a military migration analyst for Rise of Kingdoms.
Review the following aggregated economic and growth data for multiple kingdoms. Your goal is to single out the ONE BEST kingdom for migration based strictly on signs of high economic activity and heavy player spending.

${contextNote}

CRITICAL INSTRUCTIONS:
1. EXAMINE THE 'behavioralMatrix'. Large 'migrantsOutExodusPower' over the timeframe strongly indicates a leadership failure, coup, or mass exodus. Punish this severely.
2. Large 'migrantsInRecruitedPower' indicates highly successful recruitment engines. Reward this.
3. High 'sleepingDeadWeightPower' means many of their top 400 players have literally 0 activity over the timeframe. Heavily penalize kingdoms floating dead weight.
4. PLACE HIGH VALUE on 'powerDeltaOverall'. High 'totalTechPower', 'totalCommanderPower', and 'totalTroopPower' confirm systemic strength — troop power is VERY expensive and is a strong spending signal.
5. ANALYZE 'leadershipIntel' with extreme scrutiny:
   - 'stabilityScore' (0-100%): How many of the OLD Top 20 are still in the current Top 20. Low score = coup d'état or mass defection at the top. Below 60% is a RED FLAG.
   - 'activityRate' (0-100%): What % of current Top 20 leaders are actually growing. Below 70% means leadership is checked out — a catastrophic signal for migration.
   - 'powerConcentration' (0-100%): % of the top 400 power held by the top 10. Very high (>40%) = whale-dependent; moderate (15-30%) = distributed healthy kingdom.
   - 'sleepingLeaderPower': Raw power of inactive top-20 leaders. Massive sleeping leader power = dead leadership class.
   - 'top10Snapshot': Named list of leaders. Look for 'isNew: true' entries — new faces in top leadership = instability signal.
6. If 'highActivityDays' is non-empty, those dates had multiple scans recorded — indicating active event monitoring. Do NOT penalize migration metrics that spike on these dates; treat them as expected event-day volatility.
7. IGNORE raw Kill Points. We only care about economic health and leadership accountability.
8. Structure your response as a valid RAW JSON object (NO MARKDOWN CODE BLOCKS).

JSON SCHEMA TO RETURN:
{
  "winner": "4025",
  "confidenceScore": "95%",
  "verdictSummary": "A punchy 2-sentence executive summary declaring the winner and specifically citing their leadership metrics.",
  "leadershipVerdicts": [
    { "kd": "4025", "stabilityGrade": "A", "activityGrade": "B+", "leadershipAssessment": "1-2 sentence qualitative judgment on leadership health." },
    { "kd": "4026", "stabilityGrade": "D",  "activityGrade": "F",  "leadershipAssessment": "1-2 sentence explanation of why leadership is failing." }
  ],
  "competitiveAnalysis": [
     { "kd": "4025", "assessment": "Brief technical analysis of growth trends and leadership accountability." },
     { "kd": "4026", "assessment": "Brief critique including specific leadership failure points." }
  ],
  "spendingSignature": "Point out which sub-metric proved the presence of high spending or activity."
}

DATA PAYLOAD:
${JSON.stringify(kdDataArr, null, 2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dual-window AI prompt (7-day + 5-day trajectory analysis)
// ─────────────────────────────────────────────────────────────────────────────
function buildDualPrompt(kdData7, kdData5) {
    return `You are a military migration analyst for Rise of Kingdoms with access to TWO temporal windows per kingdom.

WINDOW DEFINITIONS:
- "sevenDay": Full weekly cycle data (7 days). Captures complete RoK event rhythm — Ark of Osiris, weekend spending, weekly leadership accountability.
- "fiveDay": Recent momentum data (5 days). Captures current trajectory — what is happening RIGHT NOW vs the full week.

TRAJECTORY RULE — CRITICAL:
For each kingdom, compare powerDeltaOverall between windows:
  expected5DayDelta = sevenDay.powerDeltaOverall × (5/7)
  If fiveDay.powerDeltaOverall >> expected → ACCELERATING (recent surge)
  If fiveDay.powerDeltaOverall << expected → DECELERATING (recent decline)
  If fiveDay.powerDeltaOverall ≈ expected  → STABLE (consistent week)
This trajectory verdict is the MOST IMPORTANT new signal. A kingdom can look great at 7 days but be in freefall at 5 days — that is a migration trap.

STANDARD INSTRUCTIONS:
1. Large 'migrantsOutExodusPower' = leadership failure. Punish it.
2. Large 'migrantsInRecruitedPower' = healthy recruitment engine. Reward it.
3. High 'sleepingDeadWeightPower' = inactive dead weight. Penalize.
4. High troop/commander power = real spending signal.
5. 'leadershipIntel.stabilityScore' < 60% = RED FLAG. Below 70% activityRate = leadership checked out.
6. 'highActivityDays' entries = event surveillance days. Do NOT penalize migration metrics on those dates.
7. IGNORE raw Kill Points.
8. Structure your response as a valid RAW JSON object (NO MARKDOWN CODE BLOCKS).

JSON SCHEMA TO RETURN:
{
  "winner": "4025",
  "confidenceScore": "95%",
  "verdictSummary": "2-sentence executive summary citing the winner's 7-day foundation AND 5-day trajectory.",
  "momentumVerdict": "ACCELERATING | STABLE | DECELERATING — one word verdict for the overall field trend.",
  "trajectoryAnalysis": [
    {
      "kd": "4025",
      "trajectory": "ACCELERATING",
      "trajectoryNote": "1-sentence explanation of what the 5-day vs 7-day divergence reveals about this kingdom's current direction."
    }
  ],
  "leadershipVerdicts": [
    { "kd": "4025", "stabilityGrade": "A", "activityGrade": "B+", "leadershipAssessment": "1-2 sentence qualitative judgment." },
    { "kd": "4026", "stabilityGrade": "D", "activityGrade": "F",  "leadershipAssessment": "1-2 sentence explanation of failure." }
  ],
  "competitiveAnalysis": [
    { "kd": "4025", "assessment": "Technical analysis citing BOTH windows and what the trajectory confirms." },
    { "kd": "4026", "assessment": "Critique citing specific failure points visible across both windows." }
  ],
  "spendingSignature": "Which sub-metric across either window most strongly confirmed spending or activity."
}

DUAL WINDOW DATA PAYLOAD:
${JSON.stringify({ sevenDay: kdData7, fiveDay: kdData5 }, null, 2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Access Denied. AI Matchmaker requires Creator Studio clearance." }, { status: 403 });
        }

        const { kingdoms, timeframeDays = 7, dualAnalysis = false } = await req.json();

        if (!kingdoms || !Array.isArray(kingdoms) || kingdoms.length === 0) {
            return NextResponse.json({ error: "Invalid payload. Provide an array of target kingdoms." }, { status: 400 });
        }

        const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({
                error: "Server Configuration Error: Vision Key Missing.",
                debug: `header=${!!req.headers.get('x-gemini-key')}, env=${!!process.env.GEMINI_API_KEY}`
            }, { status: 500 });
        }

        const MAX_KINGDOMS = 8;
        const limitedKingdoms = kingdoms.slice(0, MAX_KINGDOMS);
        const timeframeHours  = Number(timeframeDays) * 24;

        // ── Fetch data ────────────────────────────────────────────────────────
        let kdDataArr7 = [], kdDataArr5 = [];

        if (dualAnalysis) {
            // Run 7-day AND 5-day lookups for every kingdom in parallel
            const [results7, results5] = await Promise.all([
                Promise.all(limitedKingdoms.map(kd => getAdvancedKingdomDeltas(kd, 7 * 24).catch(() => ({ roster: [], leadershipIntel: null, highActivityDays: [] })))),
                Promise.all(limitedKingdoms.map(kd => getAdvancedKingdomDeltas(kd, 5 * 24).catch(() => ({ roster: [], leadershipIntel: null, highActivityDays: [] }))))
            ]);

            for (let i = 0; i < limitedKingdoms.length; i++) {
                const stats7 = buildKdStats(limitedKingdoms[i], results7[i], 7);
                const stats5 = buildKdStats(limitedKingdoms[i], results5[i], 5);
                if (stats7) kdDataArr7.push(stats7);
                if (stats5) kdDataArr5.push(stats5);
            }
        } else {
            // Standard single-window mode
            const results = await Promise.all(
                limitedKingdoms.map(kd => getAdvancedKingdomDeltas(kd, timeframeHours).catch(() => ({ roster: [], leadershipIntel: null, highActivityDays: [] })))
            );
            for (let i = 0; i < limitedKingdoms.length; i++) {
                const stats = buildKdStats(limitedKingdoms[i], results[i], timeframeDays);
                if (stats) kdDataArr7.push(stats);
            }
        }

        if (kdDataArr7.length === 0) {
            return NextResponse.json({ error: "Failed to locate actionable historical data for the requested kingdoms." }, { status: 404 });
        }

        // Fire-and-forget event log
        logEvent('MATCHMAKER_SCAN', {
            kingdoms: limitedKingdoms,
            timeframeDays,
            dualAnalysis,
            kingdomCount: kdDataArr7.length,
        }, {
            userEmail: session?.user?.email || 'anonymous',
            userAgent: req.headers.get('user-agent') || '',
        });

        // ── Build AI prompt ───────────────────────────────────────────────────
        const prompt = dualAnalysis
            ? buildDualPrompt(kdDataArr7, kdDataArr5)
            : buildSinglePrompt(kdDataArr7, timeframeDays);

        // ── Call Gemini ───────────────────────────────────────────────────────
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

        const result  = await geminiResponse.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const firstBracket = cleaned.indexOf('{');
        const lastBracket  = cleaned.lastIndexOf('}');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        } else {
            return NextResponse.json({ error: "The AI Core failed to structure the matchmaker response." }, { status: 400 });
        }

        const matchData = JSON.parse(cleaned);

        return NextResponse.json({
            success: true,
            aiReport:    matchData,
            rawStats:    kdDataArr7,        // 7-day stats always returned for UI cards
            rawStats5:   dualAnalysis ? kdDataArr5 : null,
            dualAnalysis,
        });

    } catch (error) {
        console.error("[Matchmaker API] Error:", error);
        return NextResponse.json({
            error: "Internal Server Fault during Matchmaker routine.",
            debug: error?.message || String(error)
        }, { status: 500 });
    }
}
