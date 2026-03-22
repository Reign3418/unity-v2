import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGovernorHistory } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    // 1. Authenticate the Request
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    // 2. Extract Parameters
    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');
    const governorId = searchParams.get('id');
    const days = parseInt(searchParams.get('days') || '5', 10);

    if (!kingdomId || !governorId) {
      return NextResponse.json({ error: "Missing Target 'kd' or 'id' parameters." }, { status: 400 });
    }

    // 3. Execute Historical Chronology Extractor
    const historyData = await getGovernorHistory(kingdomId, governorId, days);

    return NextResponse.json({ timeline: historyData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/History] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Governor Growth Timeline." }, { status: 500 });
  }
}
