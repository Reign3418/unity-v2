import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomTrends } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kdsParam = searchParams.get('kds');
    
    // Dynamic Role-Based Access: Default to all allowed Kingdoms for the connected Persona
    const kingdoms = kdsParam 
        ? kdsParam.split(',').map(k => k.trim()) 
        : session.user.allowedKingdoms || [];

    // Cross-tenant Check
    const unauthorized = kingdoms.filter(k => !session.user.allowedKingdoms?.includes(k));
    if (!session.user.isSuperAdmin && unauthorized.length > 0) {
        return NextResponse.json({ error: "Access Denied. You cannot synthesize Global data for Kingdoms outside your jurisdiction." }, { status: 403 });
    }

    if (kingdoms.length === 0) {
      return NextResponse.json({ error: "Missing Target Kingdoms or No Assigned Permissions." }, { status: 400 });
    }

    const fetchPromises = kingdoms.map(async (kd) => {
        try {
            const trends = await getKingdomTrends(kd);
            if (trends.length > 0) {
                // Get the latest snapshot to represent the current state of the kingdom
                return { kd, latest: trends[trends.length - 1] };
            }
            return { kd, latest: null };
        } catch (e) {
            return { kd, latest: null };
        }
    });

    const globalResults = await Promise.all(fetchPromises);

    // Format for Recharts consumption
    const chartData = globalResults.filter(r => r.latest).map(r => {
       const sum = r.latest.summary || { totalPower: 0, totalKP: 0, activeGovernors: 0 };
       return {
           kingdom: `KD ${r.kd}`,
           totalPower: sum.totalPower,
           totalKP: sum.totalKP,
           activeGovernors: sum.activeGovernors,
           displayPower: (sum.totalPower / 1000000000).toFixed(2) + 'B'
       };
    });

    return NextResponse.json({ globalStats: chartData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Global] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error mapping Global Analytics." }, { status: 500 });
  }
}
