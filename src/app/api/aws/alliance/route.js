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
    const kdParam = searchParams.get('kd') || "3155";
    const tagParam = searchParams.get('tag');

    if (!tagParam) {
      return NextResponse.json({ error: "Missing Target Alliance Tag." }, { status: 400 });
    }

    const tag = tagParam.toUpperCase();

    // Pull Chronological differential array
    const roster = await getKingdomDeltas(kdParam);
    
    // Filter out pure Alliance target
    const allianceMembers = roster.filter(gov => gov.alliance?.toUpperCase() === tag || gov.alliance === tag);

    if (allianceMembers.length === 0) {
       return NextResponse.json({ roster: [], stats: null }, { status: 200 });
    }

    // Mathematical reductions
    const totalPower = allianceMembers.reduce((sum, gov) => sum + gov.power, 0);
    const activeMembers = allianceMembers.filter(gov => gov.power > 0).length;
    const totalKP = allianceMembers.reduce((sum, gov) => sum + gov.killPoints, 0);
    const topPlayer = [...allianceMembers].sort((a,b) => b.power - a.power)[0];

    const stats = {
        totalPower,
        activeMembers,
        totalKP,
        topName: topPlayer?.name || "N/A",
        topPower: topPlayer?.power || 0
    };

    return NextResponse.json({ roster: allianceMembers, stats }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Alliance] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error parsing Alliance Telemetry." }, { status: 500 });
  }
}
