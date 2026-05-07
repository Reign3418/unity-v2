import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { getBehavioralMatrix } from "@/lib/awsDynamo";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');
    const startIso = searchParams.get('start');
    const endIso = searchParams.get('end');

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing 'kd' parameter." }, { status: 400 });
    }

    if (!session.user.isSuperAdmin && kingdomId !== 'GLOBAL' && !session.user.allowedKingdoms?.includes(kingdomId)) {
        console.warn(`[Behavior API] Access Denied for User: ${session.user.name} on KD: ${kingdomId}`);
        return NextResponse.json({ error: "Access Denied." }, { status: 403 });
    }

    console.log(`[Behavior API] Triggering Matrix Compilation for KD: ${kingdomId} | ${startIso} -> ${endIso}`);
    const roster = await getBehavioralMatrix(kingdomId, startIso, endIso);
    console.log(`[Behavior API] Compilation Finished. Roster Length: ${roster ? roster.length : 'Falsy'}`);

    return NextResponse.json({ roster });
  } catch (error) {
    console.error("Behavior Route API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
