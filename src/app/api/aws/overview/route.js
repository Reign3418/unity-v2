import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOverviewDeltas } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');
    const start = searchParams.get('start'); // ISO timestamp or YYYY-MM-DD
    const end = searchParams.get('end');

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing 'kd' parameter." }, { status: 400 });
    }

    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kingdomId)) {
        return NextResponse.json({ error: "Access Denied." }, { status: 403 });
    }

    const data = await getOverviewDeltas(kingdomId, start, end);
    return NextResponse.json({ roster: data }, { status: 200 });
  } catch (error) {
    console.error("[API/AWS/Overview] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling AWS Overview." }, { status: 500 });
  }
}
