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
    const kingdomId = searchParams.get('kd');

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing 'kd' (Kingdom ID) parameter." }, { status: 400 });
    }

    // Retrieve entire chronological footprint natively via DATES pointer
    const trendsData = await getKingdomTrends(kingdomId);

    return NextResponse.json({ trends: trendsData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Trends] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling AWS Kingdom Trends." }, { status: 500 });
  }
}
