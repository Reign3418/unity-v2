import { getKingdomEvents, getUserConfig, createKingdomEvent } from "@/lib/awsDynamo";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userConfig = await getUserConfig(session.user.id);
        if (!userConfig || !userConfig.kingdomId) {
            return NextResponse.json({ error: "Kingdom Not Found" }, { status: 400 });
        }

        const events = await getKingdomEvents(userConfig.kingdomId);
        
        // Filter out past events
        const upcoming = events.filter(e => new Date(e.eventTime).getTime() > Date.now());

        return NextResponse.json({ events: upcoming });
    } catch (e) {
        console.error("[Events] API Fetch Error", e);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userConfig = await getUserConfig(session.user.id);
        if (!userConfig || !userConfig.kingdomId) {
            return NextResponse.json({ error: "Kingdom Not Found" }, { status: 400 });
        }

        const body = await req.json();
        const { name, type, date, time, desc, offset } = body;

        if (!name || !type || !date || !time) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const tzOffset = offset ? parseInt(offset) : 0;
        
        // Combine and parse local Date
        const localDateString = `${date}T${time}:00.000Z`;
        const testDate = new Date(localDateString);
        
        if (isNaN(testDate.getTime())) {
            return NextResponse.json({ error: "Invalid DateTime format." }, { status: 400 });
        }

        // Apply chronological offset mathematically
        testDate.setHours(testDate.getHours() - tzOffset);
        const isoString = testDate.toISOString();

        const evt = await createKingdomEvent(userConfig.kingdomId, {
            name, type, desc: desc || '', eventTime: isoString
        });

        return NextResponse.json({ success: true, event: evt });
    } catch (e) {
        console.error("[Events] POST Creation Error", e);
        return NextResponse.json({ error: "Failed to schedule event" }, { status: 500 });
    }
}
