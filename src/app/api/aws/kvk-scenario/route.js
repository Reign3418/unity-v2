import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { getGlobalConfig, getAdvancedKingdomDeltas, T5_TECH_FLOOR, T5_BUILDING_FLOOR } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";


// ─────────────────────────────────────────────────────────────────────────────
// Aggregate a side's kingdom data into a combined combat profile
// ─────────────────────────────────────────────────────────────────────────────
function buildSideProfile(label, kingdoms, rosterResults) {
    let totalBasePower       = 0;
    let totalTroopPower      = 0;
    let totalCommanderPower  = 0;
    let totalTechPower       = 0;
    let totalBuildingPower   = 0;
    let totalKP              = 0;
    let totalSleepingPower   = 0;
    let totalMigrantIn       = 0;
    let totalMigrantOut      = 0;
    let t5EligibleTotal      = 0;
    let t5InWindowTotal      = 0;
    let governorsCounted     = 0;

    const kingdomBreakdowns = [];

    for (let i = 0; i < kingdoms.length; i++) {
        const kd = kingdoms[i];
        const { roster = [], leadershipIntel = null, t5Depth = null } = rosterResults[i] || {};
        if (!roster || roster.length === 0) continue;

        const coreRoster = roster
            .sort((a, b) => (b.power || b.missingBasePower || 0) - (a.power || a.missingBasePower || 0))
            .slice(0, 300);

        let kdPower = 0, kdTroop = 0, kdCmd = 0, kdTech = 0, kdBuilding = 0;
        let kdKP = 0, kdSleeping = 0, kdMigIn = 0, kdMigOut = 0;

        for (const gov of coreRoster) {
            if (gov.powerDelta !== 'MISSING') {
                kdPower    += (gov.power           || 0);
                kdTroop    += (gov.troopPower      || 0);
                kdCmd      += (gov.commanderPower  || 0);
                kdTech     += (gov.techPower       || 0);
                kdBuilding += (gov.buildingPower   || 0);
                kdKP       += (gov.killPoints      || 0);
                governorsCounted++;
            }
            if (gov.powerDelta === 'NEW')     kdMigIn  += gov.power;
            else if (gov.powerDelta === 'MISSING') kdMigOut += (gov.missingBasePower || 0);
            else {
                const pd = Number(gov.powerDelta) || 0;
                const kd_ = Number(gov.kpDelta)   || 0;
                if (pd === 0 && kd_ === 0) kdSleeping += gov.power;
            }
        }

        totalBasePower      += kdPower;
        totalTroopPower     += kdTroop;
        totalCommanderPower += kdCmd;
        totalTechPower      += kdTech;
        totalBuildingPower  += kdBuilding;
        totalKP             += kdKP;
        totalSleepingPower  += kdSleeping;
        totalMigrantIn      += kdMigIn;
        totalMigrantOut     += kdMigOut;
        t5EligibleTotal     += (t5Depth?.eligible  || 0);
        t5InWindowTotal     += (t5Depth?.inWindow  || 0);

        kingdomBreakdowns.push({
            kingdomId:          kd,
            rosterSize:         coreRoster.length,
            power:              kdPower,
            troopPower:         kdTroop,
            commanderPower:     kdCmd,
            combatInvestmentRatio: kdPower > 0 ? Math.round((kdTroop / kdPower) * 100) : 0,
            migrantsIn:         kdMigIn,
            migrantsOut:        kdMigOut,
            sleepingDeadWeight: kdSleeping,
            leadershipIntel:    leadershipIntel,
            t5Depth:            t5Depth,
        });
    }

    return {
        label,
        kingdoms,
        kingdomBreakdowns,
        combinedPower:          totalBasePower,
        combinedTroopPower:     totalTroopPower,
        combinedCommanderPower: totalCommanderPower,
        combinedTechPower:      totalTechPower,
        combinedBuildingPower:  totalBuildingPower,
        combatInvestmentRatio:  totalBasePower > 0
            ? Math.round((totalTroopPower / totalBasePower) * 100) : 0,
        totalMigrantsIn:        totalMigrantIn,
        totalMigrantsOut:       totalMigrantOut,
        totalSleepingDeadWeight: totalSleepingPower,
        t5EligibleDepth:        t5EligibleTotal,   // Top 300 governors across all kingdoms meeting T5 prereqs
        t5InWindowDepth:        t5InWindowTotal,   // Subset: eligible + actively growing troops
        t5Thresholds:           { techFloor: T5_TECH_FLOOR, buildingFloor: T5_BUILDING_FLOOR },
        governorsCounted,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// KvK War Assessment Prompt
// ─────────────────────────────────────────────────────────────────────────────
function buildKvKPrompt(alliance, enemy) {
    return `You are a Rise of Kingdoms military campaign strategist preparing a pre-KvK war assessment.

You have been given unified combat profiles for two sides of an upcoming KvK:
  ALLIANCE: ${alliance.kingdoms.join(', ')} (${alliance.kingdoms.length} kingdoms)
  ENEMY:    ${enemy.kingdoms.join(', ')} (${enemy.kingdoms.length} kingdoms)

CRITICAL KNOWLEDGE ABOUT THIS DATA:
1. T5 TROOP STATUS CANNOT BE VERIFIED FROM SCAN DATA. Do NOT claim any kingdom "has T5" or "doesn't have T5." Instead, reason from the T5 ELIGIBLE DEPTH metric — the count of governors who have structurally met the prerequisites (City Hall 25 + specific tech/building thresholds confirmed by a live calibration anchor). Eligible = CAN have T5. They may or may not have trained T5 troops.
2. Combat Investment Ratio = troopPower / totalPower × 100. High ratio = player's power is concentrated in troops (fighter's build). Low ratio = power in buildings/tech (builder/tech build). This does NOT indicate T5 status.
3. KP (Kill Points) may be inflated by MGE dueling events (2x/month) where troops go to hospital, not as deads. Do not treat KP as a clean kill metric.
4. Dead troops reflect city attacks only — not duels. Low deads ≠ no fighter.
5. Leaders with high sleepingDeadWeight are absent/inactive and represent organizational risk.
6. Structure your response as valid RAW JSON (NO MARKDOWN CODE BLOCKS).

YOUR ASSESSMENT MUST ADDRESS:
1. Overall power balance and which side has the structural advantage going into KvK
2. T5 Eligible Depth comparison — which side has more governors who CAN field T5?
3. Combat Investment Ratio comparison — who is built to fight vs built to tech/build?
4. Commander Power comparison — who has the spending depth in gem investment?
5. Sleeping dead weight analysis — what % of each side's power is inactive?
6. Migration stability — recent migrant in/out patterns suggesting leadership health
7. Recommended KvK strategy for the ALLIANCE (not the enemy)
8. Key risk flags — what could go wrong for the alliance?

JSON SCHEMA:
{
  "overallVerdict": "2-3 sentence opening summary of the matchup balance",
  "powerBalance": {
    "allianceAdvantage": true,
    "ratioNote": "e.g. Alliance holds 2.3x combined power advantage"
  },
  "t5Analysis": {
    "allianceEligible": ${alliance.t5EligibleDepth},
    "enemyEligible": ${enemy.t5EligibleDepth},
    "assessment": "1-2 sentence honest assessment using ELIGIBLE depth only, not claiming confirmed T5 status"
  },
  "combatInvestmentAnalysis": "1-2 sentences comparing who is built to fight",
  "commanderDepthAnalysis": "1-2 sentences on gem spending / commander power proxy",
  "sleepingDeadWeightRisk": "1-2 sentences on inactive power risk per side",
  "migrationStabilityRisk": "1 sentence on recent migration patterns",
  "allianceStrategy": "3-4 sentences of actual tactical recommendations for the alliance going into KvK",
  "allianceRiskFlags": ["risk 1", "risk 2", "risk 3"],
  "confidenceNote": "1 sentence acknowledging data limitations (T5 uncertainty, KP noise, etc.)"
}

COMBAT PROFILES:
${JSON.stringify({ ALLIANCE: alliance, ENEMY: enemy }, null, 2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.isSuperAdmin) {
            return NextResponse.json(
                { error: "Access Denied. KvK Scenario requires Creator Studio clearance." },
                { status: 403 }
            );
        }

        const { alliance = [], enemy = [], timeframeDays = 7 } = await req.json();

        if (!alliance.length || !enemy.length) {
            return NextResponse.json(
                { error: "Invalid payload. Provide alliance[] and enemy[] kingdom arrays." },
                { status: 400 }
            );
        }

        const allKingdoms = [...alliance, ...enemy].slice(0, 8);
        const timeframeHours = Number(timeframeDays) * 24;

        const apiKey = req.headers.get('x-gemini-key')
            || process.env.GEMINI_API_KEY
            || await getGlobalConfig('GEMINI_API_KEY');

        if (!apiKey) {
            return NextResponse.json({ error: "Server Configuration Error: Vision Key Missing." }, { status: 500 });
        }

        // Fetch all kingdoms in one parallel batch
        const allResults = await Promise.all(
            allKingdoms.map(kd =>
                getAdvancedKingdomDeltas(kd, timeframeHours)
                    .catch(() => ({ roster: [], leadershipIntel: null, highActivityDays: [], t5Depth: null }))
            )
        );

        const allianceResults = allResults.slice(0, alliance.length);
        const enemyResults    = allResults.slice(alliance.length);

        const allianceProfile = buildSideProfile('ALLIANCE', alliance, allianceResults);
        const enemyProfile    = buildSideProfile('ENEMY',    enemy,    enemyResults);

        if (allianceProfile.combinedPower === 0 && enemyProfile.combinedPower === 0) {
            return NextResponse.json(
                { error: "No scan data found for the requested kingdoms." },
                { status: 404 }
            );
        }

        const customModel = req.headers.get('x-gemini-model');
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        logEvent('KVK_SCENARIO_SCAN', {
            alliance, enemy, timeframeDays, model: apiModel
        }, {
            userEmail:  session?.user?.username || session?.user?.email || 'anonymous',
            userAgent:  req.headers.get('user-agent') || '',
        });

        // Build AI prompt
        const prompt = buildKvKPrompt(allianceProfile, enemyProfile);

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`;
        const geminiResponse = await fetch(`${apiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
            })
        });

        if (!geminiResponse.ok) {
            return NextResponse.json({ error: "AI Engine refused the KvK payload." }, { status: 502 });
        }

        const result  = await geminiResponse.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const f = cleaned.indexOf('{'), l = cleaned.lastIndexOf('}');
        if (f !== -1 && l !== -1 && l >= f) cleaned = cleaned.substring(f, l + 1);
        else return NextResponse.json({ error: "AI Core failed to structure the KvK response." }, { status: 400 });

        const warAssessment = JSON.parse(cleaned);

        return NextResponse.json({
            success:      true,
            warAssessment,
            allianceProfile,
            enemyProfile,
            timeframeDays,
        });

    } catch (error) {
        console.error("[KvK Scenario API] Error:", error);
        return NextResponse.json({
            error: "Internal Server Fault during KvK Scenario routine.",
            debug: error?.message || String(error)
        }, { status: 500 });
    }
}
