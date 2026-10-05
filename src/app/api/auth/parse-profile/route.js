import { NextResponse } from 'next/server';
export const maxDuration = 300;

import { getGlobalConfig, getGovernorStats, getGovernorAuth } from "@/lib/awsDynamo";
import { notifyAdmin } from "@/lib/notifyAdmin";
import { logEvent } from "@/lib/eventLogger";

export async function POST(req) {
    try {
        const body = await req.json();
        const { base64, mimeType } = body;

        if (!base64 || !mimeType) {
            return NextResponse.json({ error: "Missing screenshot image payload." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini AI Vision key is not configured on the server." }, { status: 500 });
        }

        const apiModel = process.env.GEMINI_MODEL || await getGlobalConfig('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

        const prompt = `You are a specialized OCR reader for the mobile game Rise of Kingdoms (RoK).
Analyze this Governor Profile screenshot and extract the following fields in strict JSON format:
{
  "governorId": "numeric ID string (e.g. '12345678')",
  "governorName": "in-game governor name string",
  "kingdomNumber": "numeric kingdom number string without # or prefix (e.g. '3418')",
  "allianceTag": "alliance tag without brackets (e.g. 'UN' if shown as '[UN]')",
  "power": numeric power number (e.g. 52400000),
  "killPoints": numeric kill points number (e.g. 154000000)
}
Guidelines:
- The Governor ID is typically an 8 or 9 digit number shown beneath or beside the player name.
- Kingdom is often displayed like '#3418' or 'Kingdom 3418'. Return only the digits (e.g. '3418').
- Alliance is often enclosed in brackets like '[UN]' or '[ABC]'. Return only the tag letters.
- Power and Kill Points are large numeric values on the profile card. Clean out any commas or spaces.
- If a field is not visible or cannot be determined, set it to null.
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
            return NextResponse.json({ error: "Failed to parse profile data from image. Please ensure your Governor Profile is centered and clear." }, { status: 422 });
        }

        if (!parsed.governorId) {
            notifyAdmin({
                type: "FAILED_REGISTRATION",
                title: "⚠️ Profile Scan Failed: Missing ID",
                message: "A player uploaded a screenshot, but Gemini Vision could not locate a Governor ID.",
                details: { reason: "Missing Governor ID in screenshot", rawOCR: rawText.slice(0, 300) }
            }).catch(() => {});

            return NextResponse.json({ 
                error: "Could not find a valid Governor ID in the screenshot. Please upload the main Governor Profile screen (tap your top-left avatar in Rise of Kingdoms)." 
            }, { status: 422 });
        }

        const cleanId = String(parsed.governorId).replace(/\D/g, '');
        if (!cleanId || cleanId.length < 6) {
            notifyAdmin({
                type: "FAILED_REGISTRATION",
                title: "⚠️ Profile Scan Failed: Invalid ID Format",
                message: `Parsed ID was '${parsed.governorId}', which does not meet the 6+ digit requirement.`,
                details: { governorId: parsed.governorId, reason: "Invalid ID length" }
            }).catch(() => {});

            return NextResponse.json({ 
                error: "Detected an invalid Governor ID format. Please ensure your ID is fully legible." 
            }, { status: 422 });
        }

        // Cross-reference against Kingdom Roster & existing auth records
        const [rosterRecord, existingAuth] = await Promise.all([
            getGovernorStats(cleanId).catch(() => null),
            getGovernorAuth(cleanId).catch(() => null)
        ]);

        const targetKingdom = "3418";
        const isKingdomMatch = String(parsed.kingdomNumber || '').trim() === targetKingdom;
        const isAllianceMatch = String(parsed.allianceTag || '').toUpperCase().includes('UN');
        const isRosterMatch = !!rosterRecord;
        const eligible = isKingdomMatch || isAllianceMatch || isRosterMatch;

        if (!eligible) {
            notifyAdmin({
                type: "FAILED_REGISTRATION",
                title: `⚠️ Ineligible Governor Registration: KD #${parsed.kingdomNumber || 'Unknown'}`,
                message: `Governor ${parsed.governorName || cleanId} (ID: ${cleanId}) attempted registration, but belongs to Kingdom #${parsed.kingdomNumber} and Alliance [${parsed.allianceTag}].`,
                details: {
                    governorId: cleanId,
                    governorName: parsed.governorName,
                    kingdomNumber: parsed.kingdomNumber,
                    allianceTag: parsed.allianceTag,
                    reason: "Not on Kingdom 3418 roster or UN alliance"
                }
            }).catch(() => {});
        }

        logEvent('AUTH_PARSE_PROFILE', {
            governorId: cleanId,
            governorName: parsed.governorName || cleanId,
            kingdomNumber: parsed.kingdomNumber || targetKingdom,
            allianceTag: parsed.allianceTag || '',
            eligible
        }, {
            userEmail: parsed.governorName || cleanId
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            profile: {
                governorId: cleanId,
                governorName: parsed.governorName || rosterRecord?.name || `Governor ${cleanId}`,
                kingdomNumber: parsed.kingdomNumber || targetKingdom,
                allianceTag: parsed.allianceTag || '',
                power: parsed.power || 0,
                killPoints: parsed.killPoints || 0
            },
            verification: {
                isKingdomMatch,
                isAllianceMatch,
                isRosterMatch,
                eligible,
                isAlreadyRegistered: !!existingAuth
            }
        });

    } catch (err) {
        console.error("[ParseProfile Error]:", err);
        notifyAdmin({
            type: "FAILED_REGISTRATION",
            title: "🚨 Registration OCR Exception",
            message: err.message || "Unknown error during OCR profile parse",
            details: { reason: err.message }
        }).catch(() => {});
        return NextResponse.json({ error: err.message || "Internal profile parsing error." }, { status: 500 });
    }
}
