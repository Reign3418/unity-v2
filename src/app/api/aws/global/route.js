import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { getKingdomTrends } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kdsParam = searchParams.get('kds');
    const mode = searchParams.get('mode');
    
    let kingdoms = [];

    // If specific kingdoms requested via ?kds=, use them. Otherwise, pull every tracked kingdom globally.
    if (kdsParam) {
        kingdoms = kdsParam.split(',').map(k => k.trim());
    } else {
        try {
            const { DynamoDBClient, GetItemCommand } = await import('@aws-sdk/client-dynamodb');
            const dbClient = new DynamoDBClient({
                region: process.env.AWS_REGION || "us-east-1",
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            });
            const configResult = await dbClient.send(new GetItemCommand({
                TableName: process.env.AWS_TABLE_NAME,
                Key: { 'PK': { S: 'SYSTEM#CONFIG' }, 'SK': { S: 'TRACKED_KINGDOMS' } }
            }));
            if (configResult.Item && configResult.Item.kingdoms && configResult.Item.kingdoms.SS) {
                kingdoms = configResult.Item.kingdoms.SS;
            }
        } catch(e) {
            console.error("Global config tracking absent in /global:", e.message);
        }
        
        // Fallback to allowed kingdoms if global tracking fails
        if (kingdoms.length === 0) {
            kingdoms = session.user.allowedKingdoms || [];
        }
    }

    // Global View allows cross-tenant visibility

    if (kingdoms.length === 0) {
      return NextResponse.json({ error: "Missing Target Kingdoms or No Assigned Permissions." }, { status: 400 });
    }

    const fetchPromises = kingdoms.map(async (kd) => {
        try {
            const trends = await getKingdomTrends(kd);
            if (trends.length > 0) {
                if (mode === 'history') {
                    return { kd, history: trends };
                }
                // Get the latest snapshot to represent the current state of the kingdom
                return { kd, latest: trends[trends.length - 1] };
            }
            return { kd, latest: null, history: [] };
        } catch (e) {
            return { kd, latest: null, history: [] };
        }
    });

    const globalResults = await Promise.all(fetchPromises);

    if (mode === 'history') {
        // Return full chronological trace for the Delta Tool
        const historyData = globalResults.filter(r => r.history && r.history.length > 0).map(r => ({
            kingdom: `KD ${r.kd}`,
            history: r.history
        }));
        return NextResponse.json({ globalStats: historyData }, { status: 200 });
    }

    // Format for Recharts consumption / Camp Builder View
    const chartData = globalResults.filter(r => r.latest).map(r => {
       const sum = r.latest.summary || { totalPower: 0, totalKP: 0, activeGovernors: 0 };
       return {
           kingdom: `KD ${r.kd}`,
           basePower: sum.totalPower,
           baseKP: sum.totalKP,
           baseActive: sum.activeGovernors,
           topSlices: sum.topSlices || null
       };
    });

    return NextResponse.json({ globalStats: chartData }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Global] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error mapping Global Analytics." }, { status: 500 });
  }
}
