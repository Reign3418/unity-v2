import { NextResponse } from 'next/server';
import { saveGovernorAuth, getGovernorAuth, hashGovernorPin } from "@/lib/awsDynamo";

export async function POST(req) {
    try {
        const body = await req.json();
        const { 
            governorId, 
            governorName, 
            kingdomNumber, 
            allianceTag, 
            power, 
            killPoints, 
            pin, 
            isAgeConfirmed 
        } = body;

        // Validation
        if (!governorId) {
            return NextResponse.json({ error: "Governor ID is required." }, { status: 400 });
        }

        const cleanId = String(governorId).replace(/\D/g, '');
        if (!cleanId || cleanId.length < 6) {
            return NextResponse.json({ error: "Invalid Governor ID." }, { status: 400 });
        }

        if (!pin || !/^\d{4,8}$/.test(String(pin).trim())) {
            return NextResponse.json({ error: "PIN must be between 4 and 8 digits (numbers only)." }, { status: 400 });
        }

        if (isAgeConfirmed === false) {
            return NextResponse.json({ error: "You must confirm you are at least 13 years of age to register." }, { status: 400 });
        }

        // Check if governor already registered
        const existingAuth = await getGovernorAuth(cleanId);
        if (existingAuth) {
            // If already registered, update their PIN if verified
            const pinHash = hashGovernorPin(pin);
            await saveGovernorAuth({
                governorId: cleanId,
                governorName: governorName || existingAuth.governorName,
                kingdomId: kingdomNumber || existingAuth.kingdomId || "3418",
                allianceTag: allianceTag || existingAuth.allianceTag || "",
                pinHash,
                power: power || existingAuth.power || 0,
                killPoints: killPoints || existingAuth.killPoints || 0,
                role: existingAuth.role || "User"
            });

            return NextResponse.json({
                success: true,
                message: "Governor credentials updated successfully! You can now log in.",
                governorId: cleanId
            });
        }

        // New Governor Registration
        const pinHash = hashGovernorPin(pin);
        const targetKingdom = String(kingdomNumber || "3418").replace(/\D/g, '') || "3418";

        const saved = await saveGovernorAuth({
            governorId: cleanId,
            governorName: governorName || `Governor ${cleanId}`,
            kingdomId: targetKingdom,
            allianceTag: String(allianceTag || '').trim(),
            pinHash,
            power: Number(power) || 0,
            killPoints: Number(killPoints) || 0,
            role: "User"
        });

        if (!saved) {
            return NextResponse.json({ error: "Database write error. Please try again." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Self-registration complete! You can now log in with your Governor ID & PIN.",
            governorId: cleanId,
            governorName: governorName || `Governor ${cleanId}`,
            kingdomId: targetKingdom
        });

    } catch (err) {
        console.error("[SelfRegister Error]:", err);
        return NextResponse.json({ error: err.message || "Failed to complete self-registration." }, { status: 500 });
    }
}
