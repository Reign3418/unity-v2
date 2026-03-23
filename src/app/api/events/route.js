import { getKingdomEvents, getUserConfig } from "@/lib/awsDynamo";
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
