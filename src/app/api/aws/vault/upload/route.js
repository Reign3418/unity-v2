import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUserRss, getGlobalConfig } from "@/lib/awsDynamo";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized access to Vault Scanners." }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('screenshot');
        const profile = formData.get('profile') || 'Main';

        if (!file) {
            return NextResponse.json({ error: "No visual payload detected." }, { status: 400 });
        }

        // Convert the FormData file stream into a Base64 string for the AI Engine
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type;

        if (!mimeType.startsWith('image/')) {
            return NextResponse.json({ error: "Payload rejected. Only graphical telemetry vectors (images) are supported." }, { status: 400 });
        }

        const apiKey = req.headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ error: "Server Configuration Error: GEMINI_API_KEY is completely isolated from Vercel Edge, LocalStorage, and the Master AWS Database." }, { status: 500 });
        }

        const prompt = `This is a screenshot of the Resource inventory bags in Rise of Kingdoms. 
Extract the nominal value (number at the top left) and the quantity (number at the bottom right) for all resource items. Ignore chests, boxes, action points, and random items. 
Classify each item type exactly as "Food", "Wood", "Stone", or "Gold" based strictly on the icon:
- Corn / Green background = "Food"
- Log / Brown/Purple background = "Wood"
- Grey Blocks / Blue background = "Stone"
- Gold Coins / Yellow/Green background = "Gold"

Return ONLY a valid JSON array of objects. Example format:
[
  {"type": "Food", "value": 1000, "quantity": 19458},
  {"type": "Wood", "value": 1500000, "quantity": 1},
  {"type": "Stone", "value": 37500, "quantity": 11},
  {"type": "Gold", "value": 50000, "quantity": 778}
]`;

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
                    temperature: 0,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error("Gemini Failure Payload:", errText);
            return NextResponse.json({ error: "AI OCR Parsing Engine failed to process the image footprint." }, { status: 502 });
        }

        const result = await geminiResponse.json();
        const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        
        let cleaned = rawText.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        } else {
            return NextResponse.json({ error: "The AI Core could not identify any mathematical resource tokens in the screenshot." }, { status: 400 });
        }
        
        const parsedArray = JSON.parse(cleaned);
        
        let food = 0, wood = 0, stone = 0, gold = 0;
        
        parsedArray.forEach(item => {
            const val = parseInt(String(item.value).replace(/[^0-9]/g, '')) || 0;
            const qty = parseInt(String(item.quantity).replace(/[^0-9]/g, '')) || 0;
            const sum = val * qty;
            
            const type = String(item.type).toLowerCase();
            if (type === 'food') food += sum;
            else if (type === 'wood') wood += sum;
            else if (type === 'stone') stone += sum;
            else if (type === 'gold') gold += sum;
        });

        const totalRSS = food + wood + stone + gold;

        if (totalRSS === 0) {
            return NextResponse.json({ error: "The AI Core detected standard resource tokens, but mathematically evaluated them to ZERO." }, { status: 400 });
        }

        const rawParsedRss = { food, wood, stone, gold };
        await saveUserRss(session.user.id, totalRSS, rawParsedRss, profile);

        return NextResponse.json({ success: true, totalRSS, rawParsedRss, message: "Vault Footprint Secretly Compiled." });

    } catch (error) {
        console.error("[AWS Vault API] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Fault during Upload sequence." }, { status: 500 });
    }
}
