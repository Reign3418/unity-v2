import { NextResponse } from "next/server";
import { getKingdomDeltas } from "@/lib/awsDynamo";
import { auth } from "@/lib/auth";

export const maxDuration = 300;

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
       return NextResponse.json({ report: null }, { status: 200 });
    }

    // 1. Calculate Kingdom Macro Aggregates
    let totalKpGained = 0;
    let totalDeadsLost = 0;
    let totalPowerDelta = 0;
    
    // 2. Map Alliances Output
    const allianceMap = {};
    
    roster.forEach(gov => {
        const kDelta = typeof gov.kpDelta === 'number' && gov.kpDelta > 0 ? gov.kpDelta : 0;
        const dDelta = typeof gov.deadsDelta === 'number' && gov.deadsDelta > 0 ? gov.deadsDelta : 0;
        const pDelta = typeof gov.powerDelta === 'number' ? gov.powerDelta : 0;
        
        totalKpGained += kDelta;
        totalDeadsLost += dDelta;
        totalPowerDelta += pDelta;
        
        const tag = gov.alliance || "None";
        if (!allianceMap[tag]) {
           allianceMap[tag] = { tag, kpGained: 0, deadsLost: 0, activeMembers: 0 };
        }
        
        allianceMap[tag].kpGained += kDelta;
        allianceMap[tag].deadsLost += dDelta;
        if (gov.power > 0) allianceMap[tag].activeMembers++;
    });

    // 3. Sort Alliances
    const topAlliances = Object.values(allianceMap)
        .sort((a,b) => b.kpGained - a.kpGained)
        .slice(0, 5); // top 5 combat alliances

    // 4. Sort Top 10 Warriors (by pure KP generated)
    const topWarriors = roster
        .map(g => ({ 
            id: g.id, 
            name: g.name, 
            alliance: g.alliance, 
            kpGained: typeof g.kpDelta === 'number' ? g.kpDelta : 0,
            deadsLost: typeof g.deadsDelta === 'number' ? g.deadsDelta : 0
        }))
        .filter(g => g.kpGained > 0)
        .sort((a,b) => b.kpGained - a.kpGained)
        .slice(0, 10);

    const report = {
        kingdom: kdParam,
        totals: {
            kpGained: totalKpGained,
            deadsLost: totalDeadsLost,
            powerDelta: totalPowerDelta
        },
        topAlliances,
        topWarriors
    };

    return NextResponse.json({ report }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/KvK-Report] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling Post-KvK report." }, { status: 500 });
  }
}
