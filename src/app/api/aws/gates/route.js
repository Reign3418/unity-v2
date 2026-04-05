import { NextResponse } from "next/server";
import { getFeatureGates } from "@/lib/awsDynamo";

// Store a tiny memory cache so DashboardLayout mounting globally across active active sessions
// doesn't DDoS the DynamoDB read limitations.
let memoryCache = { data: [], timestamp: 0 };
const CACHE_TTL_MS = 60000; // 60 seconds

export async function GET() {
    try {
        const now = Date.now();
        if (memoryCache.data.length > 0 && (now - memoryCache.timestamp) < CACHE_TTL_MS) {
            return NextResponse.json({ success: true, gates: memoryCache.data }, { status: 200 });
        }

        const gates = await getFeatureGates();
        
        memoryCache = {
            data: gates,
            timestamp: now
        };

        return NextResponse.json({ success: true, gates }, { status: 200 });
    } catch (e) {
        console.error("[API/AWS/Gates] Fetch Error:", e);
        // Fallback to cache ignoring TTL if DB drops
        if (memoryCache.data.length > 0) {
            return NextResponse.json({ success: true, gates: memoryCache.data }, { status: 200 });
        }
        return NextResponse.json({ success: false, gates: [] }, { status: 500 });
    }
}
