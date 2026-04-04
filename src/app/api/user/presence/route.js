import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getAllUsersInKingdom } from "@/lib/awsDynamo";

export async function GET(req) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kd = searchParams.get("kd");

    if (!kd) {
        return NextResponse.json({ error: "Missing kingdom parameter." }, { status: 400 });
    }

    try {
        const users = await getAllUsersInKingdom(kd);
        return NextResponse.json({ success: true, presenceData: users }, { status: 200 });
    } catch (e) {
        console.error("API Presence Failed:", e);
        return NextResponse.json({ error: "Server error." }, { status: 500 });
    }
}
