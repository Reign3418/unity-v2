import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomDeltas } from "@/lib/awsDynamo";

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

    // 3. Execute DynamoDB Advanced Differencing Engine
    const deltaData = await getKingdomDeltas(kingdomId);

    return NextResponse.json({ roster: deltaData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Tracker] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling AWS Activity Tracker." }, { status: 500 });
  }
}
