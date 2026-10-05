import { NextResponse } from 'next/server';
import { notifyAdmin } from "@/lib/notifyAdmin";

export async function POST(req) {
    try {
        const body = await req.json();
        const { 
            governorId, 
            governorName, 
            contact, 
            message, 
            kingdomNumber, 
            allianceTag 
        } = body;

        if (!message || message.trim().length === 0) {
            return NextResponse.json({ error: "Please enter your message or question." }, { status: 400 });
        }

        if (!contact || contact.trim().length === 0) {
            return NextResponse.json({ error: "Please provide a way to contact you (In-game Name, Discord, or WhatsApp/Email)." }, { status: 400 });
        }

        await notifyAdmin({
            type: "GOVERNOR_SUPPORT_REQUEST",
            title: `💬 Support Ping: ${governorName || governorId || 'Governor'}`,
            message: message.trim(),
            contact: contact.trim(),
            details: {
                governorId: governorId || 'Unknown',
                governorName: governorName || 'Unknown',
                kingdomNumber: kingdomNumber || '3418',
                allianceTag: allianceTag || 'N/A',
                userMessage: message.trim()
            }
        });

        return NextResponse.json({
            success: true,
            message: "SOS Ping dispatched! Kingdom 3418 leadership has been notified and will reach out to you."
        });

    } catch (err) {
        console.error("[Support Ping Error]:", err);
        return NextResponse.json({ error: "Failed to dispatch support ping. Please try again." }, { status: 500 });
    }
}
