import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { getKingdomDeltas } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kdParam = searchParams.get('kd');

    if (!kdParam) {
      return NextResponse.json({ error: "Missing Target Kingdom parameter." }, { status: 400 });
    }

    // Pull Chronological differential array (The entire raw kingdom scan)
    const roster = await getKingdomDeltas(kdParam);
    
    // Sort by descending power as a generic output format
    roster.sort((a,b) => b.power - a.power);

    return NextResponse.json({ roster }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Download] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error during Extraction." }, { status: 500 });
  }
}
