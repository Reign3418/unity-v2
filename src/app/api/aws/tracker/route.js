import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMigrationMatrix } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    // 1. Authenticate the Request
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    // 2. Extract Kingdom ID and Timeline Parameters
    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');
    const startIso = searchParams.get('start');
    const endIso = searchParams.get('end');

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing 'kd' (Kingdom ID) parameter." }, { status: 400 });
    }

    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kingdomId)) {
        return NextResponse.json({ error: "Access Denied. Cross-Kingdom requests are strictly prohibited by your clearance level." }, { status: 403 });
    }

    // 3. Execute DynamoDB Advanced Historical Engine
    const deltaData = await getMigrationMatrix(kingdomId, startIso, endIso);

    return NextResponse.json({ roster: deltaData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Tracker] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling AWS Activity Tracker." }, { status: 500 });
  }
}
