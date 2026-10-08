import { NextResponse } from 'next/server';
import { getGlobalConfig } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";

export const maxDuration = 300;

export async function POST(req) {
    try {
        const body = await req.json();
        // Support either base64/mimeType or legacy image payload
        let base64 = body.base64 || body.image;
        let mimeType = body.mimeType || 'image/webp';

        if (!base64) {
            return NextResponse.json({ error: "Missing screenshot image payload." }, { status: 400 });
        }

        // Clean out data URL prefix if provided
        if (base64.includes('base64,')) {
            const parts = base64.split('base64,');
            const prefix = parts[0];
            base64 = parts[1];
            if (prefix.includes('data:') && prefix.includes(';')) {
                mimeType = prefix.split('data:')[1].split(';')[0];
            }
        }

        const customKey = req.headers.get('x-gemini-key');
        const apiKey = customKey || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ 
                error: "Gemini AI Vision key is not configured on the server. Please supply an API key in preferences or server configuration." 
            }, { status: 500 });
        }

        const customModel = req.headers.get('x-gemini-model');
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

        const targetMetric = (body.targetMetric || body.metricLabel || '').trim();
        const eventNameHint = (body.eventName || '').trim();

        const prompt = `You are a specialized OCR parser for the mobile strategy game Rise of Kingdoms (RoK).
Analyze this screenshot. The screen can be ONE OF TWO MAIN TYPES:

TYPE 1: EVENT RANKINGS / LEADERBOARD (e.g. Master Builder, Zenith of Power, Mightiest Governor, Karuak, Pre-KvK, Alliance Tech Contribution, Resource Assistance).
- Contains explicit ranks (#1, #2, #3, medals 🥇, 🥈, 🥉), player name, alliance tag, score/points.

TYPE 2: ALLIANCE STRUCTURE / BUILDING / GARRISON / REINFORCEMENTS (e.g. Alliance Flag, Alliance Fortress, Alliance Stone Pit, Alliance Wood/Crop/Gold, Pass, Garrison list, Reinforcement Capacity list).
- Contains list cards of reinforcing/building players with NO explicit rank numbers!
- If an open modal/window is visible (e.g. "Alliance Stone Pit", "Alliance Flag", "BUILD"), extract that exact title as 'eventName' (do NOT use generic background text like 'City View'!).
- Look for header Reinforcement Capacity: e.g. "Reinforcement Capacity: 110,688 / 1,500,000", "Progress: 29% Time Left: 01:28:40".
- Each card shows:
  * Player Avatar and Governor Name (e.g. 'WhySoRude', 'Shiro', 'RemusSB', '幺Khan')
  * Primary Commander name and level (e.g. 'Lvl 19 Joan of Arc / Lvl 23 Gaius Marius')
  * Building / March Time (e.g. 'Time: 01:58:13', 'Time: 01:11:34')
  * Building Credits Reward next to a Silver Coin icon (e.g. 6,613, 4,294)
  * Troops Count (e.g. 'Troops: 72,500', 'Troops: 21,750', 'Troops: 16,438')
  * Troop Type Breakdown if displayed underneath the commander or player row:
    - Infantry count next to blue shield icon (e.g. 4,138)
    - Cavalry count next to green horse icon (e.g. 18,138)
    - Archer count next to yellow bow icon (e.g. 12,414)
    - Siege count next to orange catapult icon (e.g. 37,810)
  * Arrival Status (e.g. 'Arrived', 'Marching')

TARGET METRIC REQUESTED BY USER: "${targetMetric || 'Auto-detect'}"
EVENT TITLE HINT: "${eventNameHint || 'Auto-detect'}"

CRITICAL RULE FOR MAPPING TO 'score':
- Do NOT confuse Building Credits (silver coin e.g. 6,613) with Troops count (e.g. 72,500)!
- If the user specified target metric 'Troops' (or contains 'troop'), 'score' MUST be the total troop count number (e.g. 72500), NOT the credits!
- If the user specified target metric 'Credits' (or contains 'credit' or 'coin'), 'score' MUST be the building credits number (e.g. 6613)!
- If the user specified target metric 'Time' (or 'building time'), 'score' MUST be the time duration or seconds!
- In ALL cases, populate the discrete fields: 'troops', 'infantry', 'cavalry', 'archer', 'siege', 'credits', 'time', 'commander', 'status'!

Extract the following data in strict JSON format:
{
  "screenType": "FLAG_BUILDING" | "LEADERBOARD" | "REINFORCEMENTS" | "DONATION" | "GENERIC",
  "hasExplicitRanks": false (set to true ONLY if the screen actually shows explicit #1, #2 rank numbers or medals; set to false if it is an unranked queue or building list),
  "eventName": "Event or screen title displayed at header (e.g. 'Alliance Stone Pit', 'Alliance Flag', 'Master Builder', etc.)",
  "metricLabel": "Primary metric label (e.g. 'Troops', 'Building Credits', 'Score', etc.)",
  "detectedColumns": ["rank", "governorName", "commander", "time", "credits", "troops", "infantry", "cavalry", "archer", "siege", "status"],
  "structureCapacity": {
    "current": integer current reinforcing troops if visible (e.g. 110688), or null,
    "max": integer maximum capacity if visible (e.g. 1500000), or null,
    "progress": "progress string if visible (e.g. '29%'), or null",
    "timeLeft": "time left string if visible (e.g. '01:28:40'), or null"
  },
  "selfRankBanner": {
    "rank": numeric rank or null,
    "governorName": "viewer governor name or null",
    "score": numeric score or null
  },
  "rankings": [
    {
      "rank": integer (explicit rank number if on screen; otherwise sequential 1, 2, 3 in order of appearance),
      "governorName": "exact player name including special font characters and symbols (e.g. 'WhySoRude', 'Shiro')",
      "allianceTag": "alliance tag if visible without brackets, or null",
      "commander": "commander name and level if visible (e.g. 'Lvl 19 Joan of Arc / Lvl 23 Gaius Marius'), or null",
      "time": "time duration string if visible (e.g. '01:58:13'), or null",
      "credits": integer building credit rewards if visible (e.g. 6613), or null,
      "troops": integer total troop count if visible (e.g. 72500), or null,
      "infantry": integer infantry troops if visible under card (e.g. 4138), or null,
      "cavalry": integer cavalry troops if visible under card (e.g. 18138), or null,
      "archer": integer archer troops if visible under card (e.g. 12414), or null,
      "siege": integer siege troops if visible under card (e.g. 37810), or null,
      "status": "status string if visible (e.g. 'Arrived', 'Marching'), or null",
      "score": integer (the primary score value corresponding to the requested target metric),
      "rawScore": "verbatim string of the primary score value"
    }
  ]
}

STRICT PARSING RULES:
1. Extract ALL visible rows in the card list or table.
2. If the screen is an Alliance Structure / Stone Pit / Flag screen, 'hasExplicitRanks' MUST be false.
3. Keep governor names verbatim (preserve special prefixes like '幺', 'ᴳˣ', '★', etc.).
4. Parse numeric credits and troops as integers (clean commas, e.g. '72,500' -> 72500, '6,613' -> 6613).
5. Return ONLY valid JSON with no markdown formatting.`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType, data: base64 } }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) {
                return NextResponse.json({ error: "Gemini Vision rate limit reached. Please wait a few seconds and try again." }, { status: 429 });
            }
            throw new Error(`Gemini API Error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        let parsed;
        try {
            parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch {
            const a = rawText.indexOf('{');
            const b = rawText.lastIndexOf('}');
            if (a !== -1 && b !== -1) {
                try {
                    parsed = JSON.parse(rawText.substring(a, b + 1));
                } catch (e) {
                    return NextResponse.json({ error: "Could not parse JSON from Gemini response." }, { status: 422 });
                }
            } else {
                return NextResponse.json({ error: "Invalid OCR output format." }, { status: 422 });
            }
        }

        // Clean and normalize rankings array
        const rawRankings = Array.isArray(parsed.rankings) ? parsed.rankings : [];
        const cleanRankings = rawRankings.map((r, idx) => {
            const cleanRank = typeof r.rank === 'number' 
                ? r.rank 
                : parseInt(String(r.rank || '').replace(/\D/g, ''), 10) || (idx + 1);

            const cleanCredits = typeof r.credits === 'number'
                ? r.credits
                : (r.credits ? parseInt(String(r.credits).replace(/\D/g, ''), 10) || null : null);

            const cleanInfantry = typeof r.infantry === 'number'
                ? r.infantry
                : (r.infantry ? parseInt(String(r.infantry).replace(/\D/g, ''), 10) || null : null);

            const cleanCavalry = typeof r.cavalry === 'number'
                ? r.cavalry
                : (r.cavalry ? parseInt(String(r.cavalry).replace(/\D/g, ''), 10) || null : null);

            const cleanArcher = typeof r.archer === 'number'
                ? r.archer
                : (r.archer ? parseInt(String(r.archer).replace(/\D/g, ''), 10) || null : null);

            const cleanSiege = typeof r.siege === 'number'
                ? r.siege
                : (r.siege ? parseInt(String(r.siege).replace(/\D/g, ''), 10) || null : null);

            let cleanTroops = typeof r.troops === 'number'
                ? r.troops
                : (r.troops ? parseInt(String(r.troops).replace(/\D/g, ''), 10) || null : null);

            // If troops count was omitted or obscured but breakdown was visible, auto-sum
            if (cleanTroops === null && (cleanInfantry !== null || cleanCavalry !== null || cleanArcher !== null || cleanSiege !== null)) {
                cleanTroops = (cleanInfantry || 0) + (cleanCavalry || 0) + (cleanArcher || 0) + (cleanSiege || 0);
            }

            let cleanScore = typeof r.score === 'number' 
                ? r.score 
                : parseInt(String(r.rawScore || r.score || '0').replace(/\D/g, ''), 10) || 0;

            // Target metric remapping override safeguard
            const tmLower = targetMetric.toLowerCase();
            if (tmLower.includes('troop') && cleanTroops !== null) {
                cleanScore = cleanTroops;
            } else if ((tmLower.includes('credit') || tmLower.includes('coin')) && cleanCredits !== null) {
                cleanScore = cleanCredits;
            }

            return {
                rank: cleanRank,
                governorName: String(r.governorName || 'Unknown').trim(),
                allianceTag: r.allianceTag ? String(r.allianceTag).trim() : null,
                commander: r.commander ? String(r.commander).trim() : null,
                time: r.time ? String(r.time).trim() : null,
                credits: cleanCredits,
                troops: cleanTroops,
                infantry: cleanInfantry,
                cavalry: cleanCavalry,
                archer: cleanArcher,
                siege: cleanSiege,
                status: r.status ? String(r.status).trim() : null,
                score: cleanScore,
                rawScore: String(r.rawScore || cleanScore)
            };
        }).filter(r => r.governorName && r.governorName !== 'null');

        // Clean structure capacity header if present
        let structureCapacity = null;
        if (parsed.structureCapacity && (parsed.structureCapacity.current || parsed.structureCapacity.max || parsed.structureCapacity.progress)) {
            structureCapacity = {
                current: typeof parsed.structureCapacity.current === 'number'
                    ? parsed.structureCapacity.current
                    : parseInt(String(parsed.structureCapacity.current || '').replace(/\D/g, ''), 10) || null,
                max: typeof parsed.structureCapacity.max === 'number'
                    ? parsed.structureCapacity.max
                    : parseInt(String(parsed.structureCapacity.max || '').replace(/\D/g, ''), 10) || null,
                progress: parsed.structureCapacity.progress ? String(parsed.structureCapacity.progress).trim() : null,
                timeLeft: parsed.structureCapacity.timeLeft ? String(parsed.structureCapacity.timeLeft).trim() : null
            };
        }

        logEvent('VISION_RANKING_SCAN', {
            model: apiModel,
            rowsExtracted: cleanRankings.length,
            eventName: parsed.eventName || 'unknown',
            screenType: parsed.screenType || 'GENERIC'
        }, {
            userAgent: req.headers.get('user-agent') || ''
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            screenType: parsed.screenType || "GENERIC",
            hasExplicitRanks: Boolean(parsed.hasExplicitRanks),
            detectedColumns: Array.isArray(parsed.detectedColumns) ? parsed.detectedColumns : [],
            eventName: parsed.eventName || null,
            metricLabel: targetMetric || parsed.metricLabel || "Score",
            structureCapacity: structureCapacity,
            selfRankBanner: parsed.selfRankBanner || null,
            rankings: cleanRankings,
            data: cleanRankings // backward-compatibility
        });

    } catch (err) {
        console.error("Screen Grabber Vision Error:", err);
        return NextResponse.json({ 
            error: err.message || "Failed to process screenshot." 
        }, { status: 500 });
    }
}
