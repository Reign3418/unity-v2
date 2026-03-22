import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportAllRss } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    if (!session.user.isLeader && session.user.role !== "Admin") {
       return NextResponse.json({ error: "High Command Clearance Required to access Kingdom Vault trajectories." }, { status: 403 });
    }

    // Pull entire Kingdom RSS aggregation dynamically via AWS DynamoDB Scan
    const globalRssLogs = await exportAllRss();

    // Summarize the economy matrix
    const totals = { food: 0, wood: 0, stone: 0, gold: 0, overall: 0 };
    
    globalRssLogs.forEach(log => {
        totals.food += log.rawParsed?.Food || 0;
        totals.wood += log.rawParsed?.Wood || 0;
        totals.stone += log.rawParsed?.Stone || 0;
        totals.gold += log.rawParsed?.Gold || 0;
        totals.overall += log.totalRSS || 0;
    });

    return NextResponse.json({ logs: globalRssLogs, totals }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/RSS] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling AWS Kingdom Vault RSS Matrix." }, { status: 500 });
  }
}
