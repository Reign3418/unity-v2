import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllTrackedKingdoms, getAdvancedKingdomDeltas } from "@/lib/awsDynamo";

export const maxDuration = 300;

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || !session.user?.isSuperAdmin) {
            return NextResponse.json({ error: "Super Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const metric = searchParams.get("metric") || "powerDelta"; // powerDelta | killPointsDelta | deadsDelta
        const timeframeDays = parseInt(searchParams.get("days") || "30");

        // Get all tracked kingdoms
        const kingdoms = await getAllTrackedKingdoms();
        if (!kingdoms?.length) return NextResponse.json({ error: "No kingdoms tracked yet." }, { status: 404 });

        // Query all kingdoms in parallel (cap at 8 to avoid timeout)
        const capped = kingdoms.slice(0, 8);
        const results = await Promise.allSettled(
            capped.map(kd => getAdvancedKingdomDeltas(String(kd), timeframeDays * 24).catch(() => null))
        );

        const allGovernors = [];

        results.forEach((res, i) => {
            if (res.status !== "fulfilled" || !res.value?.roster) return;
            const kdId = capped[i];
            res.value.roster.forEach(p => {
                const val = p[metric] || 0;
                if (val <= 0) return;
                allGovernors.push({
                    name: p.name,
                    id: p.id,
                    kingdomId: kdId,
                    power: p.power || 0,
                    powerDelta: p.powerDelta || 0,
                    killPointsDelta: p.killPointsDelta || 0,
                    deadsDelta: p.deadsDelta || 0,
                    metricValue: val,
                });
            });
        });

        // Sort by chosen metric
        allGovernors.sort((a, b) => b.metricValue - a.metricValue);

        const legends = allGovernors.slice(0, 50);

        return NextResponse.json({
            success: true,
            metric,
            timeframeDays,
            totalGovernors: allGovernors.length,
            kingdomsScanned: capped.length,
            legends,
        });

    } catch (e) {
        console.error("[Lab/HallOfLegends]", e);
        return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
}
