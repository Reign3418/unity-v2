import { NextResponse } from 'next/server';
import { getGlobalConfig, setKingdomHoh } from "@/lib/awsDynamo";
import { auth } from "@/lib/auth";
import { logEvent } from "@/lib/eventLogger";

export const maxDuration = 300;

export async function POST(req) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { base64, mimeType, kd, endScan } = body;

        if (!base64 || !mimeType || !kd || !endScan) {
            return NextResponse.json({ error: "Missing required payload (image, kd, endScan)." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API Key missing." }, { status: 500 });
        }

        const customModel = req.headers.get('x-gemini-model');
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

        const prompt = `You are parsing a "Hall of Heroes" screenshot from Rise of Kingdoms showing unit deaths. 
There are multiple rows and columns of units.
Some units have a GOLD 'V' icon on their portrait (Tier 5).
Some units have a PURPLE 'IV' icon on their portrait (Tier 4).

You MUST do the following:
1. Find ALL numbers next to portraits that have the GOLD 'V' (Tier 5) icon and SUM them together to get the total T5 Troops Dead.
2. Find ALL numbers next to portraits that have the PURPLE 'IV' (Tier 4) icon and SUM them together to get the total T4 Troops Dead.

Return ONLY a JSON object with two keys: "t4Deads" and "t5Deads" representing those total sums.
Example: {"t4Deads": 1500000, "t5Deads": 500000}

IMPORTANT: Do not return any other text, no markdown formatting, no backticks. Only the raw JSON object.`;

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
                    response_mime_type: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`External API Error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        const parsed = JSON.parse(rawText);
        
        if (parsed.t4Deads !== undefined && parsed.t5Deads !== undefined) {
            // Save to DB
            await setKingdomHoh(kd, endScan, parsed.t4Deads, parsed.t5Deads);
            
        logEvent('VISION_HOH_SCAN', { model: apiModel }, {
            userEmail: session?.user?.username || session?.user?.email || 'anonymous',
            userAgent: req.headers.get('user-agent') || ''
        });

        return NextResponse.json({ success: true, t4Deads: parsed.t4Deads, t5Deads: parsed.t5Deads });
        } else {
            return NextResponse.json({ error: "Failed to locate T4/T5 deads in the image." }, { status: 400 });
        }

    } catch (error) {
        console.error("V2 Kingdom HOH Extractor Fault:", error);
        return NextResponse.json({ error: error.message || "Failed to parse API Vision Payload." }, { status: 500 });
    }
}
