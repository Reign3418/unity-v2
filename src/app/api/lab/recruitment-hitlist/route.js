import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBehavioralMatrix } from "@/lib/awsDynamo";

export const maxDuration = 300;

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || !session.user?.isSuperAdmin) {
            return NextResponse.json({ error: "Super Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get("kd");
        const days = parseInt(searchParams.get("days") || "30");

        if (!kingdomId) return NextResponse.json({ error: "Missing kingdom ID." }, { status: 400 });

        const now = new Date();
        const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const startIso = start.toISOString();
        const endIso = now.toISOString();

        const matrix = await getBehavioralMatrix(kingdomId, startIso, endIso);
        if (!matrix) return NextResponse.json({ error: "No behavioral data found." }, { status: 404 });

        // migrants OUT are the recruitment targets — they left this kingdom
        const migrants = matrix.migrantsOut || [];

        // Enrich with growth metrics
        const hits = migrants
            .filter(m => (m.powerDelta || 0) > 0) // Only those who are actively growing
            .sort((a, b) => (b.powerDelta || 0) - (a.powerDelta || 0))
            .slice(0, 100)
            .map(m => ({
                name: m.name,
                id: m.id,
                lastSeenInKingdom: kingdomId,
                powerAtDeparture: m.powerStart || m.power || 0,
                powerNow: m.powerEnd || m.power || 0,
                powerGrowthSinceDeparture: m.powerDelta || 0,
                killPointsDelta: m.killPointsDelta || 0,
                currentKingdom: m.currentKingdom || null,
                departureDate: m.firstSeen || null,
            }));

        return NextResponse.json({
            success: true,
            kingdomId,
            days,
            totalMigrantsOut: migrants.length,
            activeTargets: hits.length,
            hits,
        });

    } catch (e) {
        console.error("[Lab/RecruitmentHitList]", e);
        return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
}
