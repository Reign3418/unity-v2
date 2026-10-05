import { NextResponse } from 'next/server';
import { logEvent } from "@/lib/eventLogger";
import { auth } from "@/lib/auth";

export async function POST(req) {
    try {
        const body = await req.json();
        const { eventType, metadata = {} } = body;

        if (!eventType || typeof eventType !== 'string') {
            return NextResponse.json({ error: "Missing or invalid eventType" }, { status: 400 });
        }

        // Optional authenticated user context
        let userEmail = 'anonymous';
        try {
            const session = await auth();
            if (session?.user?.email) {
                userEmail = session.user.email;
            } else if (session?.user?.name) {
                userEmail = session.user.name;
            }
        } catch {
            // Unauthenticated client
        }

        const userAgent = req.headers.get('user-agent') || '';

        // Fire-and-forget logEvent to DynamoDB
        await logEvent(eventType.toUpperCase(), metadata, {
            userEmail,
            userAgent: userAgent.slice(0, 200)
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.warn("[Telemetry API] Logging failed:", e.message);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
