import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Server Configuration Error: GEMINI_API_KEY is isolated from Vercel Edge." }, { status: 500 });
        }

        const prompt = `This is an overhead satellite screenshot of a Kingdom Map from Rise of Kingdoms. 
Analyze the alliance territory bounded by the colored graphical lines (e.g. blue/pink borders). 
Count the exact number of player 'Castles' (the 3D city models) situated inside the bounded territory space.
Determine if the Castles are too tightly packed (high density) or well spread out (low density). Note that Resource Nodes cannot spawn underneath Castles, so extreme crowding harms the Alliance's economy.
Return ONLY a valid JSON object matching this exact mathematical structure. Do NOT include markdown code brackets around the JSON:
{
  "castleCount": 15,
  "densityLevel": "Critical", 
  "economicImpact": "Severe reduction in RSS spawn nodes.",
  "tacticalAdvice": "Instruct 5 Castles in the densest cluster to teleport to the outer perimeter."
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
