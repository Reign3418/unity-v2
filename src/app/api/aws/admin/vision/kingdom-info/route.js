import { NextResponse } from 'next/server';
export const maxDuration = 300;

import { auth } from "@/lib/auth";
import { getGlobalConfig } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.user?.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized. SuperAdmin only." }, { status: 403 });
        }

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
        const apiModel = customModel || await getGlobalConfig('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

        const prompt = `You are a specialized OCR reader for the mobile game Rise of Kingdoms (RoK).
Analyze this in-game "Kingdom Info" screenshot and extract the following fields in strict JSON format:
{
  "kingdomNumber": "numeric string of kingdom number (e.g. '4044' from '#4044 Kingdom of Kaismann')",
  "kingdomName": "full kingdom name without the number (e.g. 'Kingdom of Kaismann')",
  "serverAgeDays": integer number of days (e.g. 223 from '223 d 03:13:12' or '223 d'),
  "serverAgeRaw": "exact string shown for server age (e.g. '223 d 03:13:12')",
  "theKing": "governor name or tag of the King (e.g. '[VG44]VG BK')",
  "kingdomProgress": "kingdom season/progress (e.g. 'Season 2' or 'Season of Conquest')"
}
Guidelines:
- Return ONLY numeric digits for kingdomNumber (e.g. '4044', strip out any '#').
- Extract serverAgeDays as an integer number of days (e.g. 223).
- If any field is not visible or cannot be determined, set it to null.
- Return ONLY valid raw JSON with no markdown backticks, no code fence, and no extra prose.`;

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
                return NextResponse.json({ error: "AI scanner quota reached. Please try again in 30 seconds." }, { status: 429 });
            }
            throw new Error(`Gemini API Error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let parsed;
        try {
            parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch {
            return NextResponse.json({ error: "Failed to parse Kingdom Info data from image. Please ensure the Kingdom Info panel is clearly visible." }, { status: 422 });
        }

        if (!parsed.kingdomNumber && !parsed.serverAgeDays) {
            return NextResponse.json({ 
                error: "Could not locate Kingdom Number or Server Age in the screenshot. Please upload the 'Kingdom Info' popup panel." 
            }, { status: 422 });
        }

        // Auto-calculate founded date based on extracted serverAgeDays
        let calculatedFoundedDate = null;
        if (typeof parsed.serverAgeDays === 'number' && !isNaN(parsed.serverAgeDays) && parsed.serverAgeDays >= 0) {
            const targetDate = new Date();
            targetDate.setUTCDate(targetDate.getUTCDate() - parsed.serverAgeDays);
            calculatedFoundedDate = targetDate.toISOString().split('T')[0];
        }

        logEvent('KINGDOM_INFO_VISION_OCR', {
            kingdomNumber: parsed.kingdomNumber,
            serverAgeDays: parsed.serverAgeDays,
            calculatedFoundedDate
        }, { user: session.user.id });

        return NextResponse.json({
            success: true,
            kingdomNumber: parsed.kingdomNumber ? String(parsed.kingdomNumber).replace(/\D/g, '') : null,
            kingdomName: parsed.kingdomName || null,
            serverAgeDays: typeof parsed.serverAgeDays === 'number' ? parsed.serverAgeDays : null,
            serverAgeRaw: parsed.serverAgeRaw || null,
            theKing: parsed.theKing || null,
            kingdomProgress: parsed.kingdomProgress || null,
            calculatedFoundedDate
        });

    } catch (error) {
        console.error("API POST /api/aws/admin/vision/kingdom-info Error", error);
        return NextResponse.json({ error: error.message || "Failed to process screenshot." }, { status: 500 });
    }
}
