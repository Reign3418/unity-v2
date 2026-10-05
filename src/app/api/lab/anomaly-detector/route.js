import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdvancedKingdomDeltas } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";
import { analyzeGovernorAnomalies } from "@/lib/anomalyDetector";

export const maxDuration = 300;

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || (!session.user?.isSuperAdmin && !session.user?.isLeader)) {
            return NextResponse.json({ error: "Kingdom Leadership or Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get("kd");
        const timeframeDays = parseInt(searchParams.get("days") || "30");

        if (!kingdomId) return NextResponse.json({ error: "Missing kingdom ID." }, { status: 400 });

        const timeframeHours = timeframeDays * 24;
        const result = await getAdvancedKingdomDeltas(kingdomId, timeframeHours);
        if (!result?.roster) return NextResponse.json({ error: "No data found for kingdom." }, { status: 404 });

        const analysis = analyzeGovernorAnomalies(result.roster);

        logEvent('ANOMALY_DETECTOR_SCAN', {
            kingdomId,
            timeframeDays,
            anomalyCount: analysis.summary.anomalyCount,
            integrityScore: analysis.summary.integrityScore,
        }, {
            userEmail: session?.user?.email || 'anonymous'
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            kingdomId,
            timeframeDays,
            isPrototype: true,
            summary: analysis.summary,
            topAnomalies: analysis.anomalies.slice(0, 100),
            leadershipIntel: result.leadershipIntel,
        });

    } catch (e) {
        console.error("[Lab/AnomalyDetector]", e);
        return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
}
