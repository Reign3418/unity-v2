import { NextResponse } from 'next/server';
import { getGlobalConfig } from "@/lib/awsDynamo";

export async function POST(req) {
    try {
        const body = await req.json();
        const { base64, mimeType } = body;
        if (!base64 || !mimeType) return NextResponse.json({ error: "Missing image data." }, { status: 400 });

        const customKey = req.headers.get('x-gemini-key');
        const apiKey = customKey || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) return NextResponse.json({ error: "Gemini API Key missing." }, { status: 500 });

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `This is a screenshot of a Rise of Kingdoms chat window.

Extract EVERY visible chat message. For each message:
1. Extract the player name (if visible, otherwise use null)
2. Identify the source language (e.g. "Arabic", "Russian", "Chinese", "Turkish", "English", etc.)
3. Translate the message to English
4. If the message is already in English, still include it with translation equal to the original text

Only extract actual player chat messages. Ignore UI buttons, icons, and navigation elements.
If no chat messages are visible, return an empty messages array.

Return ONLY valid JSON:
{
  "messages": [
    { "player": "PlayerName or null", "language": "Arabic", "original": "original text", "translation": "English translation" }
  ]
}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
                generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
            })
        });

        if (!response.ok) {
            if (response.status === 429) return NextResponse.json({ error: "Rate limit hit — slow the capture interval." }, { status: 429 });
            const t = await response.text();
            throw new Error(`Gemini ${response.status}: ${t}`);
        }

        const result = await response.json();
        const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{"messages":[]}';
        let cleaned = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const a = cleaned.indexOf('{'), b = cleaned.lastIndexOf('}');
        if (a !== -1 && b !== -1) cleaned = cleaned.substring(a, b + 1);

        return NextResponse.json(JSON.parse(cleaned));
    } catch (err) {
        console.error("Translate OCR Error:", err);
        return NextResponse.json({ error: err.message || "Translation failed." }, { status: 500 });
    }
}
