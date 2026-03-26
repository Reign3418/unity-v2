import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomTrends } from "@/lib/awsDynamo";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing 'kd' (Kingdom ID) parameter." }, { status: 400 });
    }

    if (!session.user.isSuperAdmin && kingdomId !== 'GLOBAL' && !session.user.allowedKingdoms?.includes(kingdomId)) {
        return NextResponse.json({ error: "Access Denied. You cannot synthesize data for Kingdoms outside your active perimeter." }, { status: 403 });
    }

    let trendsData = [];

    if (kingdomId === 'GLOBAL') {
        const allowed = session.user.allowedKingdoms || [];
        const allTrendsMap = {};
        
        for (const kd of allowed) {
            const kdTrends = await getKingdomTrends(kd);
            kdTrends.forEach(t => {
                let dayKey = t.scanDate;
                if (t.scanDate && t.scanDate.includes('_')) {
                    dayKey = t.scanDate.split('_')[0]; 
                }
                
                if (!allTrendsMap[dayKey]) {
                    allTrendsMap[dayKey] = {
                        scanDate: t.scanDate, 
                        rowCount: 0,
                        summary: { totalPower: 0, activeGovernors: 0, totalKP: 0, alliances: {} }
                    };
                }
                
                allTrendsMap[dayKey].rowCount += t.rowCount;
                if (t.summary) {
                    allTrendsMap[dayKey].summary.totalPower += (t.summary.totalPower || 0);
                    allTrendsMap[dayKey].summary.activeGovernors += (t.summary.activeGovernors || 0);
                    allTrendsMap[dayKey].summary.totalKP += (t.summary.totalKP || 0);
                    
                    if (t.summary.alliances) {
                        for (const [tag, power] of Object.entries(t.summary.alliances)) {
                            const globalTag = tag === 'None' ? `[${kd}] Unallied` : `[${kd}] ${tag}`;
                            allTrendsMap[dayKey].summary.alliances[globalTag] = 
                                (allTrendsMap[dayKey].summary.alliances[globalTag] || 0) + power;
                        }
                    }
                }
            });
        }
        trendsData = Object.values(allTrendsMap).sort((a, b) => {
            const dateA = new Date((a.scanDate || "").split('T')[0].split('_')[0]);
            const dateB = new Date((b.scanDate || "").split('T')[0].split('_')[0]);
            return dateA - dateB;
        });
    } else {
        // Retrieve entire chronological footprint natively via DATES pointer
        trendsData = await getKingdomTrends(kingdomId);
    }

    return NextResponse.json({ trends: trendsData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Trends] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling AWS Kingdom Trends." }, { status: 500 });
  }
}
