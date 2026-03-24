import { NextResponse } from "next/server";
import { getKingdomDeltas } from "@/lib/awsDynamo";
import { auth } from "@/lib/auth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kdParam = searchParams.get('kd') || "3155";

    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kdParam)) {
        return NextResponse.json({ error: "Access Denied. Cross-Kingdom analytical requests are strictly prohibited by your clearance level." }, { status: 403 });
    }

    // Extract chronological differential
    const roster = await getKingdomDeltas(kdParam);

    if (roster.length === 0) {
       return NextResponse.json({ rankings: [] }, { status: 200 });
    }

    // Mathematical Formatting for Pre-KvK Score Algorithm
    // Score Formula: (PowerDelta / 1000) + (KPDelta / 1000) + (DeadsDelta / 100) + (GatheredDelta / 1000000)
    // This rewards highly active accounts over old inactive whales
    const rankings = roster.map(gov => {
        let pDelta = typeof gov.powerDelta === 'number' ? gov.powerDelta : 0;
        let kDelta = typeof gov.kpDelta === 'number' ? gov.kpDelta : 0;
        let dDelta = typeof gov.deadsDelta === 'number' ? gov.deadsDelta : 0;
        let gDelta = typeof gov.gatheredDelta === 'number' ? gov.gatheredDelta : 0;
        
        // Prevent negative deltas from dropping score below 0 for activity rendering
        if (pDelta < 0) pDelta = 0;
        if (kDelta < 0) kDelta = 0;
        if (dDelta < 0) dDelta = 0;
        if (gDelta < 0) gDelta = 0;

        const kvkScore = Math.floor((pDelta / 1000) + (kDelta / 500) + (dDelta / 100) + (gDelta / 1000000));

        return {
            ...gov,
            pDelta,
            kDelta,
            dDelta,
            gDelta,
            kvkScore: isNaN(kvkScore) ? 0 : kvkScore
        };
    }).sort((a, b) => b.kvkScore - a.kvkScore); // Top Prepared First

    return NextResponse.json({ rankings }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Pre-KvK] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling Pre-KvK leaderboards." }, { status: 500 });
  }
}
