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

        const prompt = `You are an elite Rise of Kingdoms coach. A governor named "${stats.name}" is asking for advice based on their recent growth metrics over the last scan period.
        
Here are their growth deltas (how much they increased/decreased):
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

Provide a VERY PUNCHY, highly actionable 3 bullet-point recommendation plan.
RULES:
1. DO NOT exceed 3 bullet points.
2. Be conversational but authoritative, like a military commander talking to a soldier.
3. Reference their specific numbers (e.g., "You trained ZERO troops", "Your 5M tech power is great but...").
4. If they have high Troop Power but zero KP/Deads, yell at them for being a farmer/training troops without fighting.
5. If they have high Gathering but bad tech, tell them to spend RSS on research.
6. Return ONLY the text, format the bullet points with bold keywords, and end with a short encouraging (or threatening) sign-off.
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
