import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGovernorHistory, getAllTrackedKingdoms } from "@/lib/awsDynamo";

export const dynamic = 'force-dynamic';

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
        console.log(`[AWS History] Triggering GLOBAL scatter-gather for GOV ${governorId}...`);
        const allKds = await getAllTrackedKingdoms();
        console.log(`[AWS History] Target AWS Partitions: ${allKds.length}`);
        
        // Fire timeline extractions in chunked batches to prevent Vercel Serverless socket exhaustion/ETIMEDOUT
        const CHUNK_SIZE = 15;
        const resolved = [];
        
        for (let i = 0; i < allKds.length; i += CHUNK_SIZE) {
            const chunk = allKds.slice(i, i + CHUNK_SIZE);
            const chunkPromises = chunk.map(kd => getGovernorHistory(kd, governorId, days));
            const chunkResults = await Promise.all(chunkPromises);
            resolved.push(...chunkResults);
        }

        const flattened = resolved.flat().sort((a,b) => {
             const dateA = new Date(a.scanDate.replace(/_/g, " "));
             const dateB = new Date(b.scanDate.replace(/_/g, " "));
             return dateA - dateB; // Oldest first
        });
        console.log(`[AWS History] Final Timeline length: ${flattened.length}`);
        
        return NextResponse.json({ 
            timeline: flattened,
            debug_info: {
                table: process.env.AWS_TABLE_NAME || 'Missing Table',
                kdsFound: allKds || [],
                concurrencyLaunched: allKds.length,
                totalResults: flattened.length
            }
        }, { status: 200 });
    }

    // 4. Execute Historical Chronology Extractor (Legacy Fallback)
    const historyData = await getGovernorHistory(kingdomId, governorId, days);

    return NextResponse.json({ timeline: historyData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/History] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Governor Growth Timeline." }, { status: 500 });
  }
}
