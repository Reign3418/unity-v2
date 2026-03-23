import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomRoster } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    // 1. Authenticate the Request
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    // 2. Extract Kingdom ID Parameter
    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing 'kd' (Kingdom ID) parameter." }, { status: 400 });
    }

    if (!session.user.isSuperAdmin && !session.user.tenant?.allowedKingdoms?.includes(kingdomId)) {
        return NextResponse.json({ error: "Access Denied. Cross-Kingdom requests are strictly prohibited by your clearance level." }, { status: 403 });
    }

    // 3. Execute DynamoDB Roster Fetch
    const rosterData = await getKingdomRoster(kingdomId);

    return NextResponse.json({ roster: rosterData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Roster] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving AWS Roster." }, { status: 500 });
  }
}
