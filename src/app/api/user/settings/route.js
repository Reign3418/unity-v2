import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getUserConfig, updateUserPlaytime, getGovernorStats } from "@/lib/awsDynamo";

export const maxDuration = 300;

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const config = (await getUserConfig(session.user.id)) || {};
        let resolvedKd = config.activeKingdom || config.kingdomId || null;

        // If user has linked Profile Cards but no saved activeKingdom yet, resolve from their Main card's lastSeenKingdom
        if (!resolvedKd && Array.isArray(config.governorIds) && config.governorIds.length > 0) {
            const mainId =
                Object.entries(config.profiles || {}).find(([, role]) => role === "Main")?.[0] ||
                config.governorIds[0];
            if (mainId) {
                const stats = await getGovernorStats(mainId).catch(() => null);
                if (stats?.lastSeenKingdom && stats.lastSeenKingdom !== "Unknown") {
                    resolvedKd = String(stats.lastSeenKingdom);
                }
            }
        }

        return NextResponse.json(
            {
                success: true,
                activeKingdom: resolvedKd,
                timezone: config.timezone || null,
                playtimeStart: config.playtimeStart || null,
                playtimeEnd: config.playtimeEnd || null,
                governorIds: config.governorIds || [],
                allowedKingdoms: config.allowedKingdoms || [],
            },
            { status: 200 }
        );
    } catch (e) {
        console.error("API GET Settings Failed:", e);
        return NextResponse.json({ error: "Server error." }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { timezone, playtimeStart, playtimeEnd, activeKingdom, defaultKingdom } = body;
        const targetKd = activeKingdom || defaultKingdom || null;

        if (!targetKd && (!timezone || !playtimeStart || !playtimeEnd)) {
            return NextResponse.json({ error: "Missing settings parameters." }, { status: 400 });
        }

        const success = await updateUserPlaytime(
            session.user.id,
            timezone || null,
            playtimeStart || null,
            playtimeEnd || null,
            targetKd
        );

        if (success) {
            return NextResponse.json({ success: true, activeKingdom: targetKd }, { status: 200 });
        }

        return NextResponse.json({ error: "Database capture failed." }, { status: 500 });
    } catch (e) {
        console.error("API Settings Failed:", e);
        return NextResponse.json({ error: "Server error." }, { status: 500 });
    }
}
