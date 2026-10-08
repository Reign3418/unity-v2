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

        const prompt = `You are a specialized OCR parser for the mobile strategy game Rise of Kingdoms (RoK).
Analyze this screenshot of an in-game Event Ranking or Leaderboard screen (e.g. Master Builder Rankings, Alliance Resource Assistance, Zenith of Power, Mightiest Governor, Alliance Tech Contribution, Karuak, etc.).

Extract the following data in strict JSON format:
{
  "eventName": "Event title displayed at the top header (e.g. 'Master Builder Rankings', 'Resource Assistance', or null)",
  "metricLabel": "The metric or column header title (e.g. 'Building Time (Seconds)', 'Score', 'Points', 'Power', 'Donations' or 'Score')",
  "selfRankBanner": {
    "rank": numeric rank number or null (from the golden/ribbon banner at the top showing the viewer's own rank, if visible),
    "governorName": "viewer governor name string or null",
    "score": numeric score number or null
  },
  "rankings": [
    {
      "rank": integer rank number (1, 2, 3, etc. NOTE: Medals with wreath 1st = 1, 2nd = 2, 3rd = 3),
      "governorName": "exact player name including special font characters, symbols (like 么, ᴳˣ, clan tags) and accents",
      "allianceTag": "alliance tag if visible without brackets, or null",
      "score": integer (clean all commas, 's' suffixes, spaces, or words; e.g. '80,000' -> 80000),
      "rawScore": "verbatim score string as displayed in the row (e.g. '80,000')"
    }
  ]
}

STRICT PARSING RULES:
1. Extract ALL visible leaderboard rows in the scrollable list.
2. The top 3 ranks often display Gold (#1), Silver (#2), and Bronze (#3) laurel wreath medals instead of plain numbers. Recognize these as rank 1, 2, 3.
3. Preserve non-English and special Unicode characters in governor names verbatim (e.g., '么WhySoRude', '么skye', '么LUFFY', '么Kerrapi', '么Cflx', '么BankBCAA', '么Lâm07', '么Damz', '么REDLER', '么SKIPMe', '么Valthyr', '么Pªin').
4. The golden ribbon banner across the top showing the viewing player (e.g. '29 Shiro Building Time: 20,000') is the 'selfRankBanner'. Do NOT insert it as a duplicate in the 'rankings' list unless it naturally appears in the sequential list order.
5. If the bottom row is cut off or only half visible, still extract it if the rank and name/score are identifiable; otherwise omit incomplete cutoffs.
6. Clean numeric scores of commas, periods, or time units (e.g., '80,000' -> 80000).
7. Return ONLY valid JSON matching the schema, with no markdown backticks, no code fence, and no extra prose.`;

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
            const cleanScore = typeof r.score === 'number' 
                ? r.score 
                : parseInt(String(r.rawScore || r.score || '0').replace(/\D/g, ''), 10) || 0;
            const cleanRank = typeof r.rank === 'number' 
                ? r.rank 
                : parseInt(String(r.rank || '').replace(/\D/g, ''), 10) || (idx + 1);

            return {
                rank: cleanRank,
                governorName: String(r.governorName || 'Unknown').trim(),
                allianceTag: r.allianceTag ? String(r.allianceTag).trim() : null,
                score: cleanScore,
                rawScore: String(r.rawScore || r.score || cleanScore)
            };
        }).filter(r => r.governorName && r.governorName !== 'null');

        logEvent('VISION_RANKING_SCAN', {
            model: apiModel,
            rowsExtracted: cleanRankings.length,
            eventName: parsed.eventName || 'unknown'
        }, {
            userAgent: req.headers.get('user-agent') || ''
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            eventName: parsed.eventName || null,
            metricLabel: parsed.metricLabel || "Score",
            selfRankBanner: parsed.selfRankBanner || null,
            rankings: cleanRankings,
            data: cleanRankings // backward-compatibility for legacy experimental scan consumers
        });

    } catch (err) {
        console.error("Screen Grabber Vision Error:", err);
        return NextResponse.json({ 
            error: err.message || "Failed to process screenshot." 
        }, { status: 500 });
    }
}
