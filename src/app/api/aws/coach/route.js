import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGlobalConfig } from "@/lib/awsDynamo";

export const maxDuration = 30; // Max execution time

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const stats = await req.json();

        if (!stats || !stats.name) {
            return NextResponse.json({ error: "Missing governor stats." }, { status: 400 });
        }

        const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ error: "Server Configuration Error: Vision Key Missing." }, { status: 500 });
        }

        const prompt = `You are an expert, highly motivating performance coach for the mobile game Rise of Kingdoms. 
A governor named "${stats.name}" has reached out to you for advice on how to improve.

They are currently playing in a Kingdom that is **${stats.kingdomState === 'War' ? 'AT WAR' : 'AT PEACE'}**.
These metrics cover the snapshot period from **${stats.startDate} to ${stats.endDate}**.
        
Here is their actual growth over this specific time period (deltas):
- Overall Power: ${stats.powerDiff}
- Tech Power: ${stats.techPowerDiff}
- Commander Power: ${stats.cmdPowerDiff}
- Building Power: ${stats.bldPowerDiff}
- Troop Power: ${stats.troopPowerDiff}
- Kill Points: ${stats.kpDiff}
- Dead Troops: ${stats.deadsDiff}
- Resources Gathered: ${stats.gatheredDiff}
- Assists: ${stats.assistDiff}
- Assigned Archetype: ${stats.archetype}
- AI Grade: ${stats.grade} (Score: ${parseFloat(stats.finalScore).toFixed(1)}/100)

Provide a highly actionable, motivating 3 bullet-point coaching plan.
RULES:
1. DO NOT exceed 3 bullet points.
2. Be an encouraging life coach. You want them to succeed. Use a supportive but expert tone. DO NOT be a drill sergeant.
3. Reference their specific numbers (e.g., "I see you pushed 5M tech power, awesome job! Now let's focus on...").
4. **IF AT WAR:** Call them out if they have high Troop Power growth but zero Kill Points or Deads (they are training troops but not fighting).
5. **IF AT PEACE:** DO NOT penalize them or mention lack of Kill Points or Dead Troops. Focus entirely on their economic growth (Tech, Building, Troops, Gathering). Praise strong power growth or tell them to increase gathering/tech if it's low.
6. Return ONLY the text. Format the bullet points with bold keywords, and end with a short encouraging sign-off.
7. Be concise. Max 100-150 words total.`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
        
        const geminiResponse = await fetch(`${apiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 }
            })
        });

        if (!geminiResponse.ok) {
            console.error("Gemini Coach Error", await geminiResponse.text());
            return NextResponse.json({ error: "AI Engine refused the payload." }, { status: 502 });
        }
        
        const result = await geminiResponse.json();
        const advice = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No advice generated.';

        return NextResponse.json({ success: true, advice });

    } catch (error) {
        console.error("[Coach API] Error:", error);
        return NextResponse.json({ error: "Internal Server Fault during AIS Coach routine." }, { status: 500 });
    }
}
