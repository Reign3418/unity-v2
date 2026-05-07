import { NextResponse } from 'next/server';
export const maxDuration = 300;

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

        const prompt = `This is a screenshot of the Equipment Material Inventory in Rise of Kingdoms. Ignore all UI text. Identify the 4 distinct material types: Leather (rolled hide/scroll), Ebony (stacked wood logs), Iron (gray rocks/ore), and Animal Bone (white tusk). For each material type, identify the quantities for the 5 rarities based on their background colors: Legendary (Gold), Epic (Purple), Elite (Blue), Advanced (Green), and Normal (Gray). Extract the exact numeric quantity shown in the bottom-right corner of each material tile. If a tile type does not exist, use "0". Return ONLY a valid JSON object matching this structure identically:
{
  "leather": { "legendary": 0, "epic": 0, "elite": 0, "advanced": 0, "normal": 0 },
  "ebony": { "legendary": 0, "epic": 0, "elite": 0, "advanced": 0, "normal": 0 },
  "iron": { "legendary": 0, "epic": 0, "elite": 0, "advanced": 0, "normal": 0 },
  "bone": { "legendary": 0, "epic": 0, "elite": 0, "advanced": 0, "normal": 0 }
}`;

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
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) {
                return NextResponse.json({ error: "AI OCR Quota Exceeded (429 HTTP). Server limits restricted." }, { status: 429 });
            }
            throw new Error(`External API Error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(cleaned);

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("V2 OCR Forge Extractor Fault:", error);
        return NextResponse.json({ error: error.message || "Failed to parse API Vision Payload." }, { status: 500 });
    }
}
