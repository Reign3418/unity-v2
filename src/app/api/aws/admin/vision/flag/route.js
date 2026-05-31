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
            return NextResponse.json({ error: "Gemini API Key is missing from server environment." }, { status: 500 });
        }

        const customModel = req.headers.get('x-gemini-model');
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

        const prompt = `This is a screenshot of the Alliance Storehouse screen in Rise of Kingdoms.

Your task is to extract four types of data:

1. CURRENT STOCK for each alliance resource (the FIRST number shown in the "X/Y" pair — e.g. "2.8M" in "2.8M/5.5M").
2. CAPACITY (maximum) for each alliance resource — the SECOND number in the "X/Y" pair (e.g. "5.5M" in "2.8M/5.5M"). If a resource shows a single value with no "/" separator, return 0 for its capacity.
3. HOURLY INCOME for each resource (shown as "+X,XXX/h" or "+X.XM/h" etc.).
4. FLAG COST from the activity log at the bottom — look for an entry that says a player "built Alliance Flag" and extract the resource costs. These appear as NEGATIVE numbers in the log (like -141,000) but you must return them as POSITIVE integers (absolute values). If no flag activity entry is visible, return 0 for all flag costs.
CRITICAL DISTINCTION: In the activity log, the yellow coin icon with the small blue shield in the bottom right corner is ALLIANCE GOLD. Do NOT mistake it for Alliance Credits. Alliance Credits is a star coin with no blue shield. Flags typically cost Food, Wood, Stone, Gold, and Crystal. If you see the gold coin with a blue shield, put that value into "gold", not "credits".

Resources to extract: Alliance Credits, Alliance Food, Alliance Wood, Alliance Stone, Alliance Gold, Alliance Crystal.

Numbers may be shown in shorthand like "4.1M" (= 4100000), "95.3K" (= 95300), "1.01M" (= 1010000). Convert all to raw integers.

IMPORTANT: All values in your response must be positive integers. Never return negative numbers.

Return ONLY a valid JSON object with this exact structure:
{
  "stock": {
    "credits": 0,
    "food": 0,
    "wood": 0,
    "stone": 0,
    "gold": 0,
    "crystal": 0
  },
  "capacity": {
    "credits": 0,
    "food": 0,
    "wood": 0,
    "stone": 0,
    "gold": 0,
    "crystal": 0
  },
  "income": {
    "credits": 0,
    "food": 0,
    "wood": 0,
    "stone": 0,
    "gold": 0,
    "crystal": 0
  },
  "flagCost": {
    "credits": 0,
    "food": 0,
    "wood": 0,
    "stone": 0,
    "gold": 0,
    "crystal": 0
  }
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
                return NextResponse.json({ error: "AI OCR Quota Exceeded (429). Try again shortly." }, { status: 429 });
            }
            throw new Error(`Gemini API Error ${response.status}: ${errText}`);
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
        logEvent('VISION_FLAG_SCAN', { model: apiModel }, {
            userEmail: session?.user?.username || session?.user?.email || 'anonymous',
            userAgent: req.headers.get('user-agent') || ''
        });

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("Alliance Flag Vision OCR Fault:", error);
        return NextResponse.json({ error: error.message || "Failed to parse Vision API response." }, { status: 500 });
    }
}
