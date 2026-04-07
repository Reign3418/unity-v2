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

        const prompt = `You are an expert, highly motivating performance and life coach for the mobile game Rise of Kingdoms. 
A governor named "${stats.name}" has reached out to you for help on how they are doing and how they can improve.

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
- AI Grade: ${stats.grade} (Score: ${parseFloat(stats.finalScore).toFixed(1)}/100)

${stats.peerAvg ? `For context, I have averaged out the performance of ${stats.peerAvg.count} other governors who are currently around the exact same overall power level (+/- 20%):
- Peer Average Power Growth: ${stats.peerAvg.powerDiff}
- Peer Average KP Gained: ${stats.peerAvg.kpDiff}
- Peer Average Deads: ${stats.peerAvg.deadsDiff}
- Peer Average Tech Growth: ${stats.peerAvg.techPowerDiff}
- Peer Average Gathered: ${stats.peerAvg.gatheredDiff}` : ''}

Provide a highly actionable and motivating coaching response.
RULES:
1. Speak to them conversationally, like a mentor sitting down with them for a quick 1-on-1 review. DO NOT use rigid bullet points. Be human.
2. Be an encouraging life coach. You want them to succeed. Use a supportive but expert tone. DO NOT be a drill sergeant.
3. ${stats.peerAvg ? `Compare them to their peers! If they gathered way less than their peers, tell them they are falling behind economically. If their tech is higher, praise them for outpacing the pack.` : `Focus on their raw numbers and how they can optimize their specific bottleneck.`}
4. **IF AT WAR:** Call them out if they have high Troop Power growth but zero Kill Points or Deads (they are training troops but not fighting).
5. **IF AT PEACE:** DO NOT penalize them or mention lack of Kill Points or Dead Troops. Focus entirely on their economic growth (Tech, Building, Troops, Gathering).
6. **BE EXTREMELY BRIEF.** Maximum 2 short sentences per thought. Get straight to the point. Keep the entire response under 75 words.
7. **CRUCIAL: YOU MUST TRANSLATE YOUR ENTIRE RESPONSE AND REPLY ONLY IN THE LANGUAGE OF THIS ISO-639-1 LOCALE CODE: '${stats.locale || 'en'}'. Do NOT reply in English unless the code is 'en'.**
`;

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
