import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
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

    if (!session.user.isSuperAdmin && kingdomId !== 'GLOBAL' && !session.user.allowedKingdoms?.includes(kingdomId)) {
        return NextResponse.json({ error: "Access Denied. Cross-Kingdom requests are strictly prohibited by your clearance level." }, { status: 403 });
    }

    let rosterData = [];

    if (kingdomId === 'GLOBAL') {
        const allowed = session.user.allowedKingdoms || [];
        for (const kd of allowed) {
            const kdRoster = await getKingdomRoster(kd);
            const taggedRoster = kdRoster.map(r => ({
                ...r,
                alliance: r.alliance === 'None' ? `[${kd}] Unallied` : `[${kd}] ${r.alliance}`,
                name: `[${kd}] ${r.name}`
            }));
            rosterData.push(...taggedRoster);
        }
    } else {
        // 3. Execute DynamoDB Roster Fetch
        rosterData = await getKingdomRoster(kingdomId);
    }

    return NextResponse.json({ roster: rosterData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Roster] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving AWS Roster." }, { status: 500 });
  }
}
