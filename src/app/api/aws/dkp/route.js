import { NextResponse } from "next/server";
import { getKingdomDeltas } from "@/lib/awsDynamo";
import { auth } from "@/lib/auth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kdParam = searchParams.get('kd') || "3155";
    const startScan = searchParams.get('start') || null;
    const endScan = searchParams.get('end') || null;
    
    // Algorithmic Constraints
    const t4Pts = parseFloat(searchParams.get('t4') || "0");
    const t5Pts = parseFloat(searchParams.get('t5') || "0");
    const dPts = parseFloat(searchParams.get('deads') || "0");

    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kdParam)) {
        return NextResponse.json({ error: "Access Denied. Cross-Kingdom analytical requests are strictly prohibited by your clearance level." }, { status: 403 });
    }

    // Extract chronological differential tracking from the DB using Exact Constraints
    const roster = await getKingdomDeltas(kdParam, startScan, endScan);

    if (roster.length === 0) {
       return NextResponse.json({ rankings: [] }, { status: 200 });
    }

    // Mathematical Formatting for DKP Scoring Engine
    const rankings = roster.map(gov => {
        let pDelta = typeof gov.powerDelta === 'number' ? gov.powerDelta : 0;
        let kDelta = typeof gov.kpDelta === 'number' ? gov.kpDelta : 0;
        let dDelta = typeof gov.deadsDelta === 'number' ? gov.deadsDelta : 0;
        let t4Delta = typeof gov.t4Delta === 'number' ? gov.t4Delta : 0;
        let t5Delta = typeof gov.t5Delta === 'number' ? gov.t5Delta : 0;
        
        if (kDelta < 0) kDelta = 0;
        if (dDelta < 0) dDelta = 0;
        if (t4Delta < 0) t4Delta = 0;
        if (t5Delta < 0) t5Delta = 0;

        // Base Points logic handling logic. If constraints exist, we override standard flat mapping.
        let dkpScore = 0;
        if (t4Pts === 0 && t5Pts === 0 && dPts === 0) {
            dkpScore = Math.floor((kDelta * 0.05) + (dDelta * 0.20)); // Legacy Fallback
        } else {
            dkpScore = Math.floor((t4Delta * t4Pts) + (t5Delta * t5Pts) + (dDelta * dPts));
        }
        
        // Tiering System based on output
        let tier = "F";
        if (dkpScore >= 200000) tier = "S+";
        else if (dkpScore >= 100000) tier = "S";
        else if (dkpScore >= 50000) tier = "A";
        else if (dkpScore >= 15000) tier = "B";
        else if (dkpScore >= 5000) tier = "C";

        return {
            ...gov,
            pDelta,
            kDelta,
            dDelta,
            t4Delta,
            t5Delta,
            dkpScore: isNaN(dkpScore) ? 0 : dkpScore,
            tier
        };
    }).sort((a, b) => b.dkpScore - a.dkpScore);

    return NextResponse.json({ rankings }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/DKP] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling DKP leaderboards." }, { status: 500 });
  }
}
