import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { getGovernorStats } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";

export async function GET(req) {
  try {
    // 1. Authenticate the Request
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    // 2. Extract Query Parameter
    const { searchParams } = new URL(req.url);
    const queryParam = searchParams.get('q');

    if (!queryParam) {
      return NextResponse.json({ error: "Missing 'q' (Query Search String) parameter." }, { status: 400 });
    }

    // 3. Execute DynamoDB Global Search
    const hunterData = await getGovernorStats(queryParam);

    // Fire-and-forget event log
    logEvent('HUNTER_SEARCH', { query: queryParam, resultsCount: hunterData?.length || 0 }, {
        userEmail: session?.user?.username || session?.user?.email || 'anonymous',
        userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({ result: hunterData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Hunter] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Global Governor Identity." }, { status: 500 });
  }
}
