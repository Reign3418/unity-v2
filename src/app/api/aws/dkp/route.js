import { NextResponse } from "next/server";
import { getKingdomDeltas, getKingdomHoh } from "@/lib/awsDynamo";
import { auth } from "@/lib/auth";

export const maxDuration = 300;


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
    const mode = searchParams.get('mode') || "basic";

    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kdParam)) {
        return NextResponse.json({ error: "Access Denied. Cross-Kingdom analytical requests are strictly prohibited by your clearance level." }, { status: 403 });
    }

    // Extract chronological differential tracking from the DB using Exact Constraints
    const roster = await getKingdomDeltas(kdParam, startScan, endScan);
    const kingdomHoh = await getKingdomHoh(kdParam, endScan);

    if (roster.length === 0) {
       return NextResponse.json({ rankings: [], kingdomHoh: null }, { status: 200 });
    }

    // If the user picked the same snapshot for both start and end, deltas are
    // physically zero — guard against pre-stored scan-time deltas bleeding through
    // from the getKingdomRoster fallback path.
    const sameWindow = !!(startScan && endScan && startScan === endScan);

    // Mathematical Formatting for DKP Scoring Engine
    const rankings = roster.map(gov => {
        let pDelta = sameWindow ? 0 : (typeof gov.powerDelta === 'number' ? gov.powerDelta : 0);
        let kDelta = sameWindow ? 0 : (typeof gov.kpDelta    === 'number' ? gov.kpDelta    : 0);
        let dDelta = sameWindow ? 0 : (typeof gov.deadsDelta === 'number' ? gov.deadsDelta : 0);
        let t4Delta = sameWindow ? 0 : (typeof gov.t4Delta   === 'number' ? gov.t4Delta    : 0);
        let t5Delta = sameWindow ? 0 : (typeof gov.t5Delta   === 'number' ? gov.t5Delta    : 0);
        
        if (kDelta < 0) kDelta = 0;
        if (dDelta < 0) dDelta = 0;
        if (t4Delta < 0) t4Delta = 0;
        if (t5Delta < 0) t5Delta = 0;

        // Base Points logic handling logic. If constraints exist, we override standard flat mapping.
        let dkpScore = 0;
        let estT4Deads = 0, estT5Deads = 0;
        if (mode === "hoh") {
            if (gov.hohT4Deads !== undefined && gov.hohT5Deads !== undefined) {
                estT4Deads = gov.hohT4Deads;
                estT5Deads = gov.hohT5Deads;
            } else {
                const totalKills = t4Delta + t5Delta;
                const t4Ratio = totalKills > 0 ? (t4Delta / totalKills) : 1;
                estT4Deads = Math.floor(dDelta * t4Ratio);
                estT5Deads = Math.floor(dDelta * (1 - t4Ratio));
            }
            dkpScore = Math.floor((t4Delta * t4Pts) + (t5Delta * t5Pts) + (estT4Deads * 15) + (estT5Deads * 30));
        } else if (t4Pts === 0 && t5Pts === 0 && dPts === 0) {
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
            estT4Deads,
            estT5Deads,
            dkpScore: isNaN(dkpScore) ? 0 : dkpScore,
            tier
        };
    }).sort((a, b) => b.dkpScore - a.dkpScore);

    return NextResponse.json({ rankings, kingdomHoh }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/DKP] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling DKP leaderboards." }, { status: 500 });
  }
}
