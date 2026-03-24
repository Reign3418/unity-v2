import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportAllRss } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kdParam = searchParams.get('kd') || "3155";

    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kdParam)) {
        return NextResponse.json({ error: "Access Denied. Cross-Kingdom Vault access is strictly prohibited." }, { status: 403 });
    }

    // Leadership checks whether the entire grid is rendered, or just the isolated user's personal footprint
    const isLeadershipClearance = session.user.isSuperAdmin || session.user.isLeader;
    const requestedIsolation = searchParams.get('isolated') === 'true';
    const requireIsolation = !isLeadershipClearance || requestedIsolation;

    // Pull entire Kingdom RSS aggregation dynamically via AWS DynamoDB Scan, filtered by target kingdom
    // Passes requireIsolation and callerDiscordId down the pipeline to isolate Member grids.
    const globalRssLogs = await exportAllRss(kdParam, requireIsolation, session.user.id);

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
