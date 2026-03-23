import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGlobalConfig } from "@/lib/awsDynamo";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized access to AI Cartography Engine." }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('map_screenshot');

        if (!file) {
            return NextResponse.json({ error: "No satellite telemetry detected." }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type;

        if (!mimeType.startsWith('image/')) {
            return NextResponse.json({ error: "Payload rejected. Only graphical vectors (images) are supported." }, { status: 400 });
        }

        const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ error: "Server Configuration Error: GEMINI_API_KEY is completely isolated from Vercel Edge, LocalStorage, and the Master AWS Database." }, { status: 500 });
        }

        const prompt = `This is an overhead satellite screenshot of a Kingdom Map from Rise of Kingdoms. 
Analyze the alliance territory bounded by the colored graphical lines (e.g. blue/pink borders) and the player 'Castles' (the 3D city models) scattered around.

CRITICAL RISE OF KINGDOMS MECHANICS:
1. Deep-Territory Castles: Castles situated deep inside the middle of the colored territory are actively impeding the respawn of future resource nodes. Nodes cannot spawn under cities. These players must be forcefully flagged to relocate to the physical edges.
2. Far Off-Territory Castles: Castles disconnected from the main territory (far away from the borders) are detrimental. The alliance only receives a 1% cut of gathered resources if farming occurs inside territory. Castles far outside territory are entirely disconnected and useless to the alliance.
3. Optimal Positioning: Castles resting directly on the colored border edge, or 1 to 2 castle-widths away from the border, are acceptable as long as they can physically farm inside the borders.

We need exact 2D coordinates of the most problematic castle clusters based on these rules. Provide 'troubleSpots' as an array of objects with 'x' and 'y' (which are percentage-based coordinates from 0-100, where x=0 is left, y=0 is top) pointing exactly to the centers of extreme overcrowding, deep-territory obstruction, or completely disconnected off-territory clusters.
Also provide a 'fineDetails' object with 'economic' (array of 2-3 specific detailed impact points based on the mechanics above) and 'tactical' (array of 2-3 specific actionable relocation steps).

Return ONLY a valid JSON object matching this exact mathematical structure. Do NOT include markdown code brackets around the JSON:
{
  "castleCount": 15,
  "densityLevel": "Critical", 
  "economicImpact": "Severe reduction in RSS spawn nodes due to mid-territory parking.",
  "tacticalAdvice": "Instruct 5 Castles in the deep center to teleport to the outer perimeter.",
  "fineDetails": {
     "economic": [
        "Multiple Castles in the northeast are too far off territory to contribute to the 1% alliance gathering tax.",
        "Deep placement in the central corridor is suffocating Gold and Food node spawn rates."
     ],
     "tactical": [
        "Relocate the 4 disconnected Castles at coordinate 85, 15 to the main border edge.",
        "Clear out the core territory by shifting 6 internal Castles out to the physical borderline."
     ]
  },
  "troubleSpots": [
     { "x": 85, "y": 15, "reason": "Disconnected from territory; 0% gathering contribution." },
     { "x": 45, "y": 60, "reason": "Parked deep inside territory, blocking internal node respawns." }
  ]
}`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

        const geminiResponse = await fetch(`${apiUrl}?key=${apiKey}`, {
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

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error("Gemini Failure Payload:", errText);
            return NextResponse.json({ error: "AI Cartography Engine failed to process the geographical footprint." }, { status: 502 });
        }

        const result = await geminiResponse.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const firstBracket = cleaned.indexOf('{');
        const lastBracket = cleaned.lastIndexOf('}');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        } else {
            return NextResponse.json({ error: "The AI Core could not identify the geometric structures." }, { status: 400 });
        }
        
        const cartographyData = JSON.parse(cleaned);

        return NextResponse.json({ success: true, data: cartographyData, message: "Satellite Map successfully processed." });

    } catch (error) {
        console.error("[AWS Realestate API] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Fault during Cartography sequence." }, { status: 500 });
    }
}
