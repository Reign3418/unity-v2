import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomRoster } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";
import { detectResellers, generateSyntheticResellerBenchmark } from "@/lib/resellerDetector";

export const maxDuration = 300;

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || (!session.user?.isSuperAdmin && !session.user?.isLeader)) {
            return NextResponse.json({ error: "Kingdom Leadership or Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get("kd");
        const isDemo = searchParams.get("demo") === "true";

        const maxPower = parseInt(searchParams.get("maxPower") || "75000000");
        const minGathered = parseInt(searchParams.get("minGathered") || "50000000");
        const maxKp = parseInt(searchParams.get("maxKp") || "25000000");
        const minConfidence = parseInt(searchParams.get("minConfidence") || "35");

        if (isDemo || kingdomId === "DEMO") {
            const demoRoster = generateSyntheticResellerBenchmark();
            const analysis = detectResellers(demoRoster, { maxPower, minGathered, maxKp, minConfidence });
            return NextResponse.json({
                success: true,
                kingdomId: "DEMO-SYNDICATE",
                isDemo: true,
                summary: analysis.summary,
                allianceHives: analysis.allianceHives,
                resellers: analysis.resellers,
                allCandidates: analysis.allCandidates,
                topGatherers: analysis.topGatherers,
                allAllianceHarvest: analysis.allAllianceHarvest,
            });
        }

        if (!kingdomId) {
            return NextResponse.json({ error: "Missing kingdom ID." }, { status: 400 });
        }

        const roster = await getKingdomRoster(kingdomId);
        if (!roster || roster.length === 0) {
            return NextResponse.json({ error: `No scan data found for Kingdom ${kingdomId}.` }, { status: 404 });
        }

        const analysis = detectResellers(roster, { maxPower, minGathered, maxKp, minConfidence });

        logEvent("RESELLER_HUNTER_SCAN", {
            kingdomId,
            suspectedCount: analysis.summary.totalSuspected,
            totalIllicitRss: analysis.summary.totalIllicitRss,
            hiveAllianceCount: analysis.summary.hiveAllianceCount,
            threatLevel: analysis.summary.syndicateThreatLevel,
            totalGathered: analysis.summary.totalKingdomGathered,
        }, {
            userEmail: session?.user?.email || "anonymous"
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            kingdomId,
            isDemo: false,
            summary: analysis.summary,
            allianceHives: analysis.allianceHives,
            resellers: analysis.resellers,
            allCandidates: analysis.allCandidates,
            topGatherers: analysis.topGatherers,
            allAllianceHarvest: analysis.allAllianceHarvest,
        });

    } catch (e) {
        console.error("[Lab/ResellerHunter]", e);
        return NextResponse.json({ error: "Internal server error analyzing reseller syndicates." }, { status: 500 });
    }
}
