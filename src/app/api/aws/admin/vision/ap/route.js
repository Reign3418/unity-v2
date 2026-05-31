import { NextResponse } from 'next/server';
export const maxDuration = 300;

import { getGlobalConfig } from "@/lib/awsDynamo";
import { auth } from "@/lib/auth";
import { logEvent } from "@/lib/eventLogger";


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

        const customModel = req.headers.get('x-gemini-model');
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

        // Gemini extraction prompt restricted to the 4 specific action point potions.
        const prompt = `This is a screenshot of the Action Points items inventory in Rise of Kingdoms.
Extract the quantity of each specific Action Point Recovery item. The types are 50, 100, 500, and 1000.
Look at the numeric quantity usually in the bottom-right corner of each item tile.
Return ONLY a valid JSON object matching this exact structure using the raw numbers you see extracted as pure integers. If any category is missing or zero, use "0".
{
  "ap50": 0,
  "ap100": 0,
  "ap500": 0,
  "ap1000": 0
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
                    temperature: 0,
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

        
        const session = await auth();
        logEvent('VISION_AP_SCAN', { model: apiModel }, {
            userEmail: session?.user?.username || session?.user?.email || 'anonymous',
            userAgent: req.headers.get('user-agent') || ''
        });

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("V2 OCR Action Points Extractor Fault:", error);
        return NextResponse.json({ error: error.message || "Failed to parse API Vision Payload." }, { status: 500 });
    }
}
