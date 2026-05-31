import { NextResponse } from 'next/server';
export const maxDuration = 300;

import { getGlobalConfig } from "@/lib/awsDynamo";
import { auth } from "@/lib/auth";
import { logEvent } from "@/lib/eventLogger";export async function POST(req) {
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

        const prompt = `Extract all visible player names from this game screenshot.
Ignore numbers, UI text, coordinate numbers, alliance tags like [ABCD], and the words like 'Center Fortress' or 'Rally'. 
If a name has weird symbols or emojis, just try to get the closest English alphanumeric equivalent or omit the symbol.
Return ONLY a comma-separated list of the actual governor names you see. Do not write any other sentences or introductions.`;

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
                return NextResponse.json({ error: "AI OCR Quota Exceeded (429 HTTP). Server limits restricted." }, { status: 429 });
            }
            throw new Error(`External API Error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        const session = await auth();
        logEvent('VISION_DEADEYE_SCAN', {}, {
            userEmail: session?.user?.username || session?.user?.email || 'anonymous',
            userAgent: req.headers.get('user-agent') || ''
        });

        // Clean up quotes or whitespace
        const names = rawText.split(',').map(n => n.trim().replace(/^['"\s]+|['"\s]+$/g, '')).filter(n => n.length > 0);

        return NextResponse.json({ success: true, names });

    } catch (error) {
        console.error("V2 OCR Deadeye Extractor Fault:", error);
        return NextResponse.json({ error: error.message || "Failed to parse API Vision Payload." }, { status: 500 });
    }
}
