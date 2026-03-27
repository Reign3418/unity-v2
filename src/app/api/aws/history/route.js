import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGovernorHistory, getAllTrackedKingdoms } from "@/lib/awsDynamo";

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

    // 3. Global Scatter-Gather Protocol
    if (kingdomId === 'GLOBAL') {
        const allKds = await getAllTrackedKingdoms();
        // Fire parallel asynchronous timeline extractions across all known AWS database partitions
        const fetchPromises = allKds.map(kd => getGovernorHistory(kd, governorId, days));
        const resolved = await Promise.all(fetchPromises);
        
        // Flatten the multi-dimensional mapping arrays and sort by timestamp (Oldest to Newest, matching the legacy history format)
        const flattened = resolved.flat().sort((a,b) => {
             const dateA = new Date(a.scanDate.replace(/_/g, " "));
             const dateB = new Date(b.scanDate.replace(/_/g, " "));
             return dateA - dateB; // Oldest first
        });
        
        return NextResponse.json({ timeline: flattened }, { status: 200 });
    }

    // 4. Execute Historical Chronology Extractor (Legacy Fallback)
    const historyData = await getGovernorHistory(kingdomId, governorId, days);

    return NextResponse.json({ timeline: historyData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/History] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Governor Growth Timeline." }, { status: 500 });
  }
}
