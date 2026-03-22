import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGovernorStats } from "@/lib/awsDynamo";

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

    return NextResponse.json({ result: hunterData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Hunter] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Global Governor Identity." }, { status: 500 });
  }
}
