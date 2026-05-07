import { NextResponse } from 'next/server';
export const maxDuration = 300;

import { getGlobalConfig } from "@/lib/awsDynamo";


// Default camp definitions per map format — used when client doesn't send campNames
const DEFAULT_CAMPS = {
    "Siege of Orleans": [
        { name: "Brittany",  hint: "Light Blue crest with triangle/tree"    },
        { name: "Bourbon",   hint: "Light Green crest with shells/flowers"   },
        { name: "La Marche", hint: "Cyan crest with walking lion"            },
        { name: "Picardy",   hint: "Purple crest with rampant lion"          },
        { name: "Auvergne",  hint: "Yellow crest with eagle/bird"            },
        { name: "Poitou",    hint: "Red crest with castle"                   },
    ],
    "Tides of War": [
        { name: "Fire",  hint: "Red / Fire elemental crest"    },
        { name: "Earth", hint: "Brown or Gold / Earth crest"   },
        { name: "Water", hint: "Blue / Water elemental crest"  },
        { name: "Wind",  hint: "Purple / Wind elemental crest" },
    ],
};

export async function POST(req) {
    try {
        const body = await req.json();
        const { base64, mimeType, campNames, mapName } = body;

        if (!base64 || !mimeType) {
            return NextResponse.json({ error: "Missing image data payload." }, { status: 400 });
        }

        const customKey = req.headers.get('x-gemini-key');
        const apiKey    = customKey || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini server API Key is missing from V2 env variables." }, { status: 500 });
        }

        // Build the camp list for the prompt ─────────────────────────────────
        // Priority: explicit campNames from client → mapName lookup → SoO default
        let campList;
        if (campNames && campNames.length > 0) {
            // Client sent us the active camps — use them directly (format-agnostic)
            const hintMap = {};
            Object.values(DEFAULT_CAMPS).flat().forEach(c => { hintMap[c.name] = c.hint; });
            campList = campNames.map((name, i) => ({
                name,
                hint: hintMap[name] || `Camp ${i + 1} crest`,
            }));
        } else if (mapName && DEFAULT_CAMPS[mapName]) {
            campList = DEFAULT_CAMPS[mapName];
        } else {
            campList = DEFAULT_CAMPS["Siege of Orleans"];
        }

        // Dynamic prompt ──────────────────────────────────────────────────────
        const campInstructions = campList
            .map((c, i) => `${i + 1}. "${c.name}" — ${c.hint}`)
            .join('\n');

        const exampleOutput = JSON.stringify(
            Object.fromEntries(campList.map(c => [c.name, "#1234, #5678"]))
        );

        const prompt = `You are a data extractor for a Rise of Kingdoms KvK Matchmaking screenshot.
Analyze the screenshot and extract the kingdom numbers assigned to each coalition camp.

Return ONLY a pure JSON object with no markdown, no code fences, no explanation.

Match each visual crest or element to these camp names:
${campInstructions}

For each camp key, provide a comma-separated string of kingdom numbers including the hash symbol (e.g. "#1224, #2294, #3492").
If a camp has no kingdoms visible, leave it as an empty string.

Example output format:
${exampleOutput}`;

        const apiModel = 'gemini-2.5-flash';
        const apiUrl   = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

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
                generationConfig: { temperature: 0, maxOutputTokens: 2048 }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) {
                return NextResponse.json({ error: "AI Vision Quota Exceeded (429)." }, { status: 429 });
            }
            throw new Error(`Gemini API Error ${response.status}: ${errText}`);
        }

        const result  = await response.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        // Strip any markdown fences Gemini might add
        const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedCamps = {};
        try {
            parsedCamps = JSON.parse(clean);
        } catch(e) {
            console.error("Gemini non-JSON response:", rawText);
        }

        return NextResponse.json({ success: true, camps: parsedCamps });

    } catch (error) {
        console.error("V2 OCR SOC Camps Fault:", error);
        return NextResponse.json({ error: error.message || "Failed to parse API Vision Payload." }, { status: 500 });
    }
}
