import { NextResponse } from "next/server";
import { getKingdomDeltas } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kdParam = searchParams.get('kd') || "3155";

    // Extract chronological differential tracking from the DB
    const roster = await getKingdomDeltas(kdParam);

    if (roster.length === 0) {
       return NextResponse.json({ rankings: [] }, { status: 200 });
    }

    // Mathematical Formatting for DKP Scoring Engine (Post-KvK Evaluation)
    // Formula: (KP Delta * 0.05) + (Deads Delta * 0.20)
    // Positive scores only, negative deltas capped at 0.
    const rankings = roster.map(gov => {
        let pDelta = typeof gov.powerDelta === 'number' ? gov.powerDelta : 0;
        let kDelta = typeof gov.kpDelta === 'number' ? gov.kpDelta : 0;
        let dDelta = typeof gov.deadsDelta === 'number' ? gov.deadsDelta : 0;
        
        if (kDelta < 0) kDelta = 0;
        if (dDelta < 0) dDelta = 0;

        const dkpScore = Math.floor((kDelta * 0.05) + (dDelta * 0.20));
        
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
