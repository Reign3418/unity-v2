import { auth } from "@/lib/auth";
export const maxDuration = 300;

import { NextResponse } from "next/server";

import { getAllUsersInKingdom } from "@/lib/awsDynamo";

import { unstable_cache } from "next/cache";


const getCachedKingdomUsers = async (kd) => {
    return unstable_cache(
        async () => getAllUsersInKingdom(kd),
        ['kingdom-presence-data', String(kd)], // Dynamically hash the Kingdom to prevent stale lock!
        { revalidate: 45, tags: ['presence'] } // Refresh every 45s for accurate "Active" radar sweeping
    )();
};

export const dynamic = 'force-dynamic';

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
        const users = await getCachedKingdomUsers(kd);
        return NextResponse.json({ success: true, presenceData: users }, { status: 200 });
    } catch (e) {
        console.error("API Presence Failed:", e);
        return NextResponse.json({ error: "Server error." }, { status: 500 });
    }
}
