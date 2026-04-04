import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { updateUserPlaytime } from "@/lib/awsDynamo";

export async function POST(req) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { timezone, playtimeStart, playtimeEnd } = body;

        if (!timezone || !playtimeStart || !playtimeEnd) {
            return NextResponse.json({ error: "Missing req parameters." }, { status: 400 });
        }

        const success = await updateUserPlaytime(session.user.id, timezone, playtimeStart, playtimeEnd);
        
        if (success) {
            return NextResponse.json({ success: true }, { status: 200 });
        }
        
        return NextResponse.json({ error: "Database capture failed." }, { status: 500 });
    } catch (e) {
        console.error("API Settings Failed:", e);
        return NextResponse.json({ error: "Server error." }, { status: 500 });
    }
}
