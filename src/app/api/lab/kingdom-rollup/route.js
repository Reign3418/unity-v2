import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomTrends, getOverviewDeltas } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";
import { computeKingdomRollup, generateSyntheticRollupBenchmark } from "@/lib/kingdomRollupEngine";

export const maxDuration = 300;

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || (!session.user?.isSuperAdmin && !session.user?.isLeader)) {
            return NextResponse.json({ error: "Kingdom Leadership or Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get("kd");
        const hours = parseInt(searchParams.get("hours") || "24", 10);
        const isDemo = searchParams.get("demo") === "true";

        if (isDemo || kingdomId === "DEMO") {
            const benchmark = generateSyntheticRollupBenchmark(hours);
            return NextResponse.json({
                success: true,
                kingdomId: "DEMO-KINGDOM",
                isDemo: true,
                meta: benchmark.meta,
                summary: benchmark.summary,
                alliances: benchmark.alliances,
                topPowerGainers: benchmark.topPowerGainers,
                topPowerDroppers: benchmark.topPowerDroppers,
                topKpGainers: benchmark.topKpGainers,
                topCasualties: benchmark.topCasualties,
                topGatherers: benchmark.topGatherers,
                newArrivals: benchmark.newArrivals,
                departures: benchmark.departures,
                rawRoster: benchmark.rawRoster,
            });
        }

        if (!kingdomId) {
            return NextResponse.json({ error: "Missing kingdom ID." }, { status: 400 });
        }

        // Fetch chronological scan dates for this Kingdom
        const history = await getKingdomTrends(kingdomId);
        if (!history || history.length < 2) {
            return NextResponse.json({ 
                error: `At least 2 scan snapshots are required to compile a ${hours}h rollup for Kingdom ${kingdomId}. Found: ${history?.length || 0}.` 
            }, { status: 404 });
        }

        // History is chronological (oldest to newest)
        const reversed = [...history].reverse(); // newest first
        const latestScan = reversed[0];
        const latestTime = new Date(latestScan.scanDate.split("T")[0] || latestScan.scanDate).getTime();
        const targetPastTime = latestTime - (hours * 3600 * 1000);

        // Find scan closest to targetPastTime
        let closestScan = reversed[1];
        let smallestDiff = Infinity;

        for (let i = 1; i < reversed.length; i++) {
            const scanTime = new Date(reversed[i].scanDate.split("T")[0] || reversed[i].scanDate).getTime();
            const diff = Math.abs(scanTime - targetPastTime);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestScan = reversed[i];
            }
        }

        const startIso = closestScan.scanDate.split("T")[0];
        const endIso = latestScan.scanDate.split("T")[0];

        const rosterDeltas = await getOverviewDeltas(kingdomId, startIso, endIso);
        if (!rosterDeltas || rosterDeltas.length === 0) {
            return NextResponse.json({ error: `Failed to compile differential data for Kingdom ${kingdomId}.` }, { status: 500 });
        }

        const actualHoursDiff = Math.max(1, Math.round(Math.abs(latestTime - new Date(closestScan.scanDate.split("T")[0]).getTime()) / 3600000));

        const rollup = computeKingdomRollup(rosterDeltas, {
            kingdomId,
            startDate: closestScan.scanDate,
            endDate: latestScan.scanDate,
            hoursDiff: actualHoursDiff || hours,
        });

        logEvent("KINGDOM_ROLLUP_ACCESSED", {
            kingdomId,
            hoursRequested: hours,
            actualHours: actualHoursDiff,
            netPowerDelta: rollup.summary.netPowerDelta,
            totalKpDelta: rollup.summary.totalKpDelta,
            totalDeads: rollup.summary.totalDeadsDelta,
            kingdomPace: rollup.summary.kingdomPace,
        }, {
            userEmail: session?.user?.email || "anonymous"
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            kingdomId,
            isDemo: false,
            meta: rollup.meta,
            summary: rollup.summary,
            alliances: rollup.alliances,
            topPowerGainers: rollup.topPowerGainers,
            topPowerDroppers: rollup.topPowerDroppers,
            topKpGainers: rollup.topKpGainers,
            topCasualties: rollup.topCasualties,
            topGatherers: rollup.topGatherers,
            newArrivals: rollup.newArrivals,
            departures: rollup.departures,
            rawRoster: rollup.rawRoster,
            availableScans: reversed.slice(0, 10).map(s => s.scanDate),
        });

    } catch (e) {
        console.error("[Lab/KingdomRollup]", e);
        return NextResponse.json({ error: "Internal server error synthesizing Kingdom Rollup." }, { status: 500 });
    }
}
