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
- If an open modal/window is visible (e.g. "Alliance Stone Pit", "Alliance Flag", "BUILD"), extract that exact title as 'eventName'.
- Header Reinforcement Capacity: e.g. "Reinforcement Capacity: 799,646 / 1,500,000", "Progress: 58% Time Left: 01:02:18".
- Each governor row displays:
  * Player Avatar and Governor Name (e.g. 'WhySoRude', 'Shiro', 'RemusSB')
  * Alliance Tag: in brackets like [TAG] or prefix symbol like '么', '★', 'ᴳˣ', '亗', 'KD' before the name (e.g. '么 WhySoRude' -> allianceTag: '么', governorName: 'WhySoRude')
  * Primary and secondary commander (e.g. 'Lvl 19 Joan of Arc / Lvl 23 Gaius Marius')
  * Building or march time (e.g. 'Time: 02:19:27', 'Time: 01:40:48')
  * Building credits reward next to silver coin icon (e.g. 8,367, 6,048)
  * Total troops (e.g. 'Troops: 72,500', 'Troops: 21,750', 'Troops: 16,438')
  * Arrival Status (e.g. 'Arrived', 'Marching')

ROK TROOP & TIER CARDS ANATOMY (UNDER EACH GOVERNOR ROW):
Each governor row has a horizontal row of 1 to 5 troop cards.
Every single card has THREE components:
1. Rectangular Portrait Card:
   - Border & background color indicates Tier:
     * GREY = T1
     * GREEN = T2
     * BLUE = T3
     * PURPLE = T4
     * GLOWING ORANGE/GOLD = T5
   - Round bronze medallion at the bottom center with Roman Numeral:
     * 'I' = Tier 1 (T1)
     * 'II' = Tier 2 (T2)
     * 'III' = Tier 3 (T3)
     * 'IV' = Tier 4 (T4)
     * 'V' = Tier 5 (T5)
2. Monochrome Silhouette Icon right beside the troop number:
   - Horse head silhouette = Cavalry (🐎)
   - Crossed bow and arrow silhouette = Archer (🏹)
   - Shield or helmet silhouette = Infantry (🛡️)
   - Wheeled cart / ballista / battering ram silhouette = Siege (🚜)
3. Troop Count Number right next to the icon (e.g. 4,205, 18,305, 12,400, 37,590, 21,750).

CRITICAL AGGREGATION RULES FOR CARDS:
Every card contributes to BOTH a tier count ('t1'..'t5') AND a class count ('infantry', 'cavalry', 'archer', 'siege')!
- 't1': sum of numbers for all cards with medallion 'I' (or null if none)
- 't2': sum of numbers for all cards with medallion 'II' (or null if none)
- 't3': sum of numbers for all cards with medallion 'III' (or null if none)
- 't4': sum of numbers for all cards with medallion 'IV' (or null if none)
- 't5': sum of numbers for all cards with medallion 'V' (or null if none)
- 'infantry': sum of numbers for cards with shield/helmet icon (or null if none)
- 'cavalry': sum of numbers for cards with horse head icon (or null if none)
- 'archer': sum of numbers for cards with bow & arrow icon (or null if none)
- 'siege': sum of numbers for cards with wheeled siege icon (or null if none)

Note: A governor can send MULTIPLE cards of the same class! (e.g. T2 Ballista 12,400 + T1 Battering Ram 37,590 = 49,990 total Siege!).
The sum of all cards equals the total 'troops' count!

CONCRETE EXAMPLE:
Governor row: '么 WhySoRude', 'Time: 02:19:27', silver coin '8,367', 'Troops: 72,500', 'Arrived'
Cards underneath:
1. Medallion II (green), Horse head icon, 4,205 -> T2 Cavalry
2. Medallion II (green), Bow/Arrow icon, 18,305 -> T2 Archer
3. Medallion II (green), Wheeled siege icon, 12,400 -> T2 Siege
4. Medallion I (grey), Wheeled siege icon, 37,590 -> T1 Siege
Extraction for this row:
{
  "rank": 1,
  "governorName": "WhySoRude",
  "allianceTag": "么",
  "commander": "Lvl 19 Joan of Arc / Lvl 23 Gaius Marius",
  "time": "02:19:27",
  "credits": 8367,
  "troops": 72500,
  "infantry": null,
  "cavalry": 4205,
  "archer": 18305,
  "siege": 49990,
  "t1": 37590,
  "t2": 34910,
  "t3": null,
  "t4": null,
  "t5": null,
  "status": "Arrived",
  "score": 72500,
  "rawScore": "72500"
}

TARGET METRIC REQUESTED BY USER: "${targetMetric || 'Auto-detect'}"
EVENT TITLE HINT: "${eventNameHint || 'Auto-detect'}"

CRITICAL RULE FOR MAPPING TO 'score':
- If target metric is 'Troops' (or contains 'troop'), 'score' MUST be the total troop count number (e.g. 72500)!
- If target metric is 'Credits' (or contains 'credit' or 'coin'), 'score' MUST be the building credits number (e.g. 8367)!
- If target metric is 'Time' (or 'building time'), 'score' MUST be the time duration or seconds!
- In ALL cases, populate all discrete fields: 'troops', 'infantry', 'cavalry', 'archer', 'siege', 't1', 't2', 't3', 't4', 't5', 'credits', 'time', 'commander', 'status'!

Extract the following data in strict JSON format:
{
  "screenType": "FLAG_BUILDING" | "LEADERBOARD" | "REINFORCEMENTS" | "DONATION" | "GENERIC",
  "hasExplicitRanks": false,
  "eventName": "Event or screen title displayed at header (e.g. 'Alliance Stone Pit', 'Alliance Flag', 'Master Builder', etc.)",
  "metricLabel": "Primary metric label (e.g. 'Troops', 'Building Credits', 'Score', etc.)",
  "structureCapacity": {
    "current": integer current reinforcing troops if visible (e.g. 799646), or null,
    "max": integer maximum capacity if visible (e.g. 1500000), or null,
    "progress": "progress string if visible (e.g. '58%'), or null",
    "timeLeft": "time left string if visible (e.g. '01:02:18'), or null"
  },
  "selfRankBanner": {
    "rank": numeric rank or null,
    "governorName": "viewer governor name or null",
    "score": numeric score or null
  },
  "rankings": [
    {
      "rank": integer,
      "governorName": "exact player name without alliance prefix (e.g. 'WhySoRude', 'Shiro')",
      "allianceTag": "alliance tag or prefix symbol (e.g. '么', 'WAR', 'KD'), or null",
      "commander": "commander name and level if visible (e.g. 'Lvl 19 Joan of Arc / Lvl 23 Gaius Marius'), or null",
      "time": "time duration string if visible (e.g. '02:19:27'), or null",
      "credits": integer building credit rewards if visible (e.g. 8367), or null,
      "troops": integer total troop count if visible (e.g. 72500), or null,
      "infantry": integer total infantry troops if visible, or null,
      "cavalry": integer total cavalry troops if visible, or null,
      "archer": integer total archer troops if visible, or null,
      "siege": integer total siege troops if visible, or null,
      "t1": integer total T1 troops if visible, or null,
      "t2": integer total T2 troops if visible, or null,
      "t3": integer total T3 troops if visible, or null,
      "t4": integer total T4 troops if visible, or null,
      "t5": integer total T5 troops if visible, or null,
      "status": "status string if visible (e.g. 'Arrived', 'Marching'), or null",
      "score": integer,
      "rawScore": "verbatim string of score"
    }
  ]
}

STRICT PARSING RULES:
1. Extract ALL visible rows in the card list or table.
2. If the screen is an Alliance Structure / Stone Pit / Flag screen, 'hasExplicitRanks' MUST be false.
3. Parse numeric credits and troops as integers (clean commas, e.g. '72,500' -> 72500, '8,367' -> 8367).
4. Return ONLY valid JSON with no markdown formatting.`;

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

            const cleanT1 = typeof r.t1 === 'number'
                ? r.t1
                : (r.t1 ? parseInt(String(r.t1).replace(/\D/g, ''), 10) || null : null);

            const cleanT2 = typeof r.t2 === 'number'
                ? r.t2
                : (r.t2 ? parseInt(String(r.t2).replace(/\D/g, ''), 10) || null : null);

            const cleanT3 = typeof r.t3 === 'number'
                ? r.t3
                : (r.t3 ? parseInt(String(r.t3).replace(/\D/g, ''), 10) || null : null);

            const cleanT4 = typeof r.t4 === 'number'
                ? r.t4
                : (r.t4 ? parseInt(String(r.t4).replace(/\D/g, ''), 10) || null : null);

            const cleanT5 = typeof r.t5 === 'number'
                ? r.t5
                : (r.t5 ? parseInt(String(r.t5).replace(/\D/g, ''), 10) || null : null);

            let cleanTroops = typeof r.troops === 'number'
                ? r.troops
                : (r.troops ? parseInt(String(r.troops).replace(/\D/g, ''), 10) || null : null);

            // If troops count was omitted or obscured but breakdown was visible, auto-sum
            if (cleanTroops === null) {
                if (cleanInfantry !== null || cleanCavalry !== null || cleanArcher !== null || cleanSiege !== null) {
                    cleanTroops = (cleanInfantry || 0) + (cleanCavalry || 0) + (cleanArcher || 0) + (cleanSiege || 0);
                } else if (cleanT1 !== null || cleanT2 !== null || cleanT3 !== null || cleanT4 !== null || cleanT5 !== null) {
                    cleanTroops = (cleanT1 || 0) + (cleanT2 || 0) + (cleanT3 || 0) + (cleanT4 || 0) + (cleanT5 || 0);
                }
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

            const lowTierCount = (cleanT1 || 0) + (cleanT2 || 0) + (cleanT3 || 0);
            const hasLowTierWarning = lowTierCount > 0;

            let rawGovName = String(r.governorName || 'Unknown').trim();
            let rawAllianceTag = r.allianceTag ? String(r.allianceTag).trim() : null;

            // Auto-extract alliance tag if embedded in governor name (e.g. "[ABC] Player" or "么 Player")
            if (rawGovName && (!rawAllianceTag || rawAllianceTag === 'null')) {
                const bracketMatch = rawGovName.match(/^\[([^\]]+)\]\s*(.*)$/);
                if (bracketMatch) {
                    rawAllianceTag = bracketMatch[1].trim();
                    rawGovName = bracketMatch[2].trim();
                } else {
                    const symbolMatch = rawGovName.match(/^([么★亗ᴳˣ™◈◆◇▲▼][A-Za-z0-9_]*)\s+(.+)$/);
                    if (symbolMatch) {
                        rawAllianceTag = symbolMatch[1].trim();
                        rawGovName = symbolMatch[2].trim();
                    }
                }
            }

            return {
                rank: cleanRank,
                governorName: rawGovName,
                allianceTag: rawAllianceTag,
                commander: r.commander ? String(r.commander).trim() : null,
                time: r.time ? String(r.time).trim() : null,
                credits: cleanCredits,
                troops: cleanTroops,
                infantry: cleanInfantry,
                cavalry: cleanCavalry,
                archer: cleanArcher,
                siege: cleanSiege,
                t1: cleanT1,
                t2: cleanT2,
                t3: cleanT3,
                t4: cleanT4,
                t5: cleanT5,
                hasLowTierWarning,
                lowTierCount,
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

        // Deterministically compute detected columns based on actual non-zero data
        const detectedColumnsSet = new Set(['rank', 'governorName']);
        if (cleanRankings.some(r => r.allianceTag)) detectedColumnsSet.add('allianceTag');
        if (cleanRankings.some(r => r.commander)) detectedColumnsSet.add('commander');
        if (cleanRankings.some(r => r.time)) detectedColumnsSet.add('time');
        if (cleanRankings.some(r => r.credits !== null && r.credits !== undefined)) detectedColumnsSet.add('credits');
        if (cleanRankings.some(r => r.troops !== null && r.troops !== undefined)) detectedColumnsSet.add('troops');
        if (cleanRankings.some(r => r.infantry !== null && r.infantry > 0)) detectedColumnsSet.add('infantry');
        if (cleanRankings.some(r => r.cavalry !== null && r.cavalry > 0)) detectedColumnsSet.add('cavalry');
        if (cleanRankings.some(r => r.archer !== null && r.archer > 0)) detectedColumnsSet.add('archer');
        if (cleanRankings.some(r => r.siege !== null && r.siege > 0)) detectedColumnsSet.add('siege');
        if (cleanRankings.some(r => r.t1 !== null && r.t1 > 0)) detectedColumnsSet.add('t1');
        if (cleanRankings.some(r => r.t2 !== null && r.t2 > 0)) detectedColumnsSet.add('t2');
        if (cleanRankings.some(r => r.t3 !== null && r.t3 > 0)) detectedColumnsSet.add('t3');
        if (cleanRankings.some(r => r.t4 !== null && r.t4 > 0)) detectedColumnsSet.add('t4');
        if (cleanRankings.some(r => r.t5 !== null && r.t5 > 0)) detectedColumnsSet.add('t5');
        if (cleanRankings.some(r => r.status)) detectedColumnsSet.add('status');

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
            detectedColumns: Array.from(detectedColumnsSet),
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
