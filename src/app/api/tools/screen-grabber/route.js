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

TYPE 2: ALLIANCE STRUCTURE / BUILDING / GARRISON / REINFORCEMENTS (e.g. Alliance Flag, Alliance Fortress, Pass, Garrison list, Reinforcement Capacity list).
- Contains list cards of reinforcing/building players with NO explicit rank numbers!
- Each card shows:
  * Player Avatar and Governor Name (e.g. '幺Khan', '幺Shiro', '幺Kerrapi', 'BLACK', 'MAKER', 'Lìght', 'Zippo')
  * Primary Commander name and level (e.g. 'Lvl 1 Baibars', 'Lvl 20 Dragon Lancer', 'Lvl 1 Eulji Mundeok', 'Lvl 16 Tomoe Gozen', 'Lvl 22 Cao Cao')
  * Building / March Time (e.g. 'Time: 03:15:38', 'Time: 02:21:57', 'Time: 03:10:11')
  * Building Credits Reward next to a Silver Coin icon (e.g. 11,738, 8,517, 11,398, 11,411, 11,686, 11,749, 11,443)
  * Troops Count (e.g. 'Troops: 1' -> 1, or 'Troops: 200,000' -> 200000)
  * Arrival Status (e.g. 'Arrived', 'Marching')

TARGET METRIC REQUESTED BY USER: "${targetMetric || 'Auto-detect'}"
EVENT TITLE HINT: "${eventNameHint || 'Auto-detect'}"

CRITICAL RULE FOR MAPPING TO 'score':
- Do NOT confuse Building Credits (silver coin e.g. 11,738) with Troops count (e.g. 1)!
- If the user specified target metric 'Troops' (or contains 'troop'), 'score' MUST be the troop count number (e.g. 1), NOT the credits!
- If the user specified target metric 'Credits' (or contains 'credit' or 'coin'), 'score' MUST be the building credits number (e.g. 11738)!
- If the user specified target metric 'Time' (or 'building time'), 'score' MUST be the time duration or seconds!
- If no target metric is specified, for Type 2 Building screens default 'score' to the credits or troops as appropriate.
- In ALL cases, populate the dedicated discrete fields so NO data is lost: 'troops', 'credits', 'time', 'commander', 'status'!

Extract the following data in strict JSON format:
{
  "screenType": "FLAG_BUILDING" | "LEADERBOARD" | "REINFORCEMENTS" | "DONATION" | "GENERIC",
  "hasExplicitRanks": false (set to true ONLY if the screen actually shows explicit #1, #2 rank numbers or medals; set to false if it is an unranked queue or building list),
  "eventName": "Event or screen title displayed at header (e.g. 'Alliance Flag', 'Master Builder Rankings', etc.)",
  "metricLabel": "Primary metric label (e.g. 'Troops', 'Building Credits', 'Building Time', 'Score', etc.)",
  "detectedColumns": ["rank", "governorName", "commander", "time", "credits", "troops", "status"],
  "selfRankBanner": {
    "rank": numeric rank or null,
    "governorName": "viewer governor name or null",
    "score": numeric score or null
  },
  "rankings": [
    {
      "rank": integer (explicit rank number if on screen; otherwise sequential 1, 2, 3 in order of appearance),
      "governorName": "exact player name including special font characters and symbols (e.g. '幺Khan', '幺 Shiro')",
      "allianceTag": "alliance tag if visible without brackets, or null",
      "commander": "commander name and level if visible (e.g. 'Lvl 1 Baibars'), or null",
      "time": "time duration string if visible (e.g. '03:15:38'), or null",
      "credits": integer building credit rewards if visible (e.g. 11738), or null,
      "troops": integer troop count if visible (e.g. 1), or null,
      "status": "status string if visible (e.g. 'Arrived', 'Marching'), or null",
      "score": integer (the primary score value corresponding to the requested target metric),
      "rawScore": "verbatim string of the primary score value"
    }
  ]
}

STRICT PARSING RULES:
1. Extract ALL visible rows in the card list or table.
2. If the screen is an Alliance Flag / Fortress screen, 'hasExplicitRanks' MUST be false.
3. Keep governor names verbatim (preserve special prefixes like '幺', 'ᴳˣ', '★', etc.).
4. Parse numeric credits and troops as integers (clean commas, e.g. '11,738' -> 11738, 'Troops: 1' -> 1).
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

            const cleanTroops = typeof r.troops === 'number'
                ? r.troops
                : (r.troops ? parseInt(String(r.troops).replace(/\D/g, ''), 10) || null : null);

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
                status: r.status ? String(r.status).trim() : null,
                score: cleanScore,
                rawScore: String(r.rawScore || cleanScore)
            };
        }).filter(r => r.governorName && r.governorName !== 'null');

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
