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

    // 2. Extract Query Parameters
    const { searchParams } = new URL(req.url);
    const kingdomsParam = searchParams.get('kingdoms');
    const minPower = parseInt(searchParams.get('minPower')) || 0;
    const maxPower = parseInt(searchParams.get('maxPower')) || Infinity;
    const allianceTag = searchParams.get('allianceTag') || '';

    if (!kingdomsParam) {
      return NextResponse.json({ error: "Missing 'kingdoms' array." }, { status: 400 });
    }

    // Clean and split the "4023, 4024" comma-separated string
    const kingdoms = kingdomsParam.split(',').map(k => k.trim()).filter(k => /^\d{3,5}$/.test(k));
    
    if (kingdoms.length === 0) {
        return NextResponse.json({ error: "No valid 4-digit numeric kingdoms provided." }, { status: 400 });
    }

    if (kingdoms.length > 30) {
        return NextResponse.json({ error: "Too many target kingdoms. Please limit to 30 globally to prevent AWS throttling." }, { status: 400 });
    }

    // 3. Threaded Extraction
    // Fire all target kingdom scans in precise parallel
    const pullRequests = kingdoms.map(async (kd) => {
        try {
            const roster = await getKingdomRoster(kd);
            return roster.map(gov => ({ ...gov, kingdom: kd })); // Stamp origin kingdom
        } catch (e) {
            console.error(`[AWS/Hunter/Talent] Failed pulling ${kd}:`, e);
            return [];
        }
    });
    
    const combinedMatrices = await Promise.all(pullRequests);
    const flatRoster = combinedMatrices.flat();
    
    // 4. Mathematical Power & Alliance Filtration
    const filteredRoster = flatRoster.filter(gov => {
       const meetsPower = gov.power >= minPower && gov.power <= maxPower;
       const meetsAlliance = allianceTag ? (gov.alliance && gov.alliance.toLowerCase().includes(allianceTag.toLowerCase())) : true;
       return meetsPower && meetsAlliance;
    });
    
    // 5. Global Power Descending Sort (Highest targets at the top)
    filteredRoster.sort((a, b) => b.power - a.power);

    return NextResponse.json({ result: filteredRoster, totalExtracted: filteredRoster.length }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Hunter/Talent] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Talent Database." }, { status: 500 });
  }
}
