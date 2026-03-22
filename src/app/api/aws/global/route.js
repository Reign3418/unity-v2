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
    const kdsParam = searchParams.get('kds') || "3155,3156";
    const kingdoms = kdsParam.split(',').map(k => k.trim());

    if (kingdoms.length === 0) {
      return NextResponse.json({ error: "Missing Target Kingdoms." }, { status: 400 });
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
