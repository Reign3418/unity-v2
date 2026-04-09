import { NextResponse } from 'next/server';
import { getGlobalConfig } from "@/lib/awsDynamo";

export async function POST(req) {
    try {
        const body = await req.json();
        const { base64, mimeType } = body;

        if (!base64 || !mimeType) {
            return NextResponse.json({ error: "Missing image data payload." }, { status: 400 });
        }

        const customKey = req.headers.get('x-gemini-key');
        const apiKey = customKey || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini server API Key is missing from V2 env variables." }, { status: 500 });
        }

        const apiModel = 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

        const prompt = `You are a data extractor for a gaming timeline. Analyze this Matchmaking screenshot and extract the kingdom numbers next to the specific crests.
Return the data as a pure JSON object. Do not include markdown \`\`\`json or \`\`\` blocks, just the pure JSON payload.

Match the visual crest to these precise JSON keys:
1. "Brittany" (Matches the Light Blue crest with the triangle/tree)
2. "Bourbon" (Matches the Light Green crest with the shells/flowers)
3. "La Marche" (Matches the Cyan crest with the walking lion)
4. "Picardy" (Matches the Purple crest with the rampant lion)
5. "Auvergne" (Matches the Yellow crest with the eagle/bird)
6. "Poitou" (Matches the Red crest with the castle)

For each key, provide a comma-separated string of the kingdom numbers containing the hash symbol (e.g. "#1224, #2294, #3492"). If a camp is missing, leave it as an empty string. Example output:
{"Brittany": "#2296, #2756, #3348, #3496", "Bourbon": "#2260, #3142, #3239, #3663", "La Marche": "#1224, #2294, #3492, #3701", "Picardy": "#1330, #1457, #2305, #3209", "Auvergne": "#1364, #1799, #1960, #3230", "Poitou": "#1836, #1855, #1942, #3298"}`;

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
                    temperature: 0,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) {
                return NextResponse.json({ error: "AI Vision Quota Exceeded (429 HTTP)." }, { status: 429 });
            }
            throw new Error(`External API Error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        // Sanitize the potential markdown brackets from Gemini Flash
        const cleanJsonConfig = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let parsedCamps = {};
        try {
            parsedCamps = JSON.parse(cleanJsonConfig);
        } catch(e) {
            console.error("Gemini failed to output JSON format:", rawText);
        }

        return NextResponse.json({ success: true, camps: parsedCamps });

    } catch (error) {
        console.error("V2 OCR SOC Camps Fault:", error);
        return NextResponse.json({ error: error.message || "Failed to parse API Vision Payload." }, { status: 500 });
    }
}
