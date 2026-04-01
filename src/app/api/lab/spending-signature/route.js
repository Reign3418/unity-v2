import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdvancedKingdomDeltas } from "@/lib/awsDynamo";

export const maxDuration = 45;

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || !session.user?.isSuperAdmin) {
            return NextResponse.json({ error: "Super Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get("kd");
        const timeframeDays = parseInt(searchParams.get("days") || "30");

        if (!kingdomId) return NextResponse.json({ error: "Missing kingdom ID." }, { status: 400 });

        const result = await getAdvancedKingdomDeltas(kingdomId, timeframeDays * 24);
        if (!result?.roster) return NextResponse.json({ error: "No data found." }, { status: 404 });

        const roster = result.roster.filter(p => (p.powerDelta || 0) > 0);

        // Classify each governor by their dominant growth vector
        const classified = roster.map(p => {
            const tech = p.techPowerDelta || 0;
            const troop = p.troopPowerDelta || 0;
            const cmdr = p.commanderPowerDelta || 0;
            const build = p.buildingPowerDelta || 0;
            const total = tech + troop + cmdr + build || 1;

            const techPct = tech / total;
            const troopPct = troop / total;
            const cmdrPct = cmdr / total;
            const buildPct = build / total;

            let archetype = "Balanced";
            const max = Math.max(techPct, troopPct, cmdrPct, buildPct);
            if (max < 0.4) archetype = "Balanced";
            else if (max === techPct) archetype = "Researcher";
            else if (max === troopPct) archetype = "Fighter";
            else if (max === cmdrPct) archetype = "Gem Spender";
            else if (max === buildPct) archetype = "Builder";

            // Whale detection: top 10% of power growth in the roster
            const isWhale = false; // calculated after sort

            return {
                name: p.name,
                id: p.id,
                power: p.power || 0,
                powerDelta: p.powerDelta || 0,
                techPct: Math.round(techPct * 100),
                troopPct: Math.round(troopPct * 100),
                cmdrPct: Math.round(cmdrPct * 100),
                buildPct: Math.round(buildPct * 100),
                archetype,
            };
        });

        // Mark top 10% power growers as whales
        const sorted = [...classified].sort((a, b) => b.powerDelta - a.powerDelta);
        const whaleThreshold = sorted[Math.floor(sorted.length * 0.1)]?.powerDelta || 0;
        classified.forEach(p => { p.isWhale = p.powerDelta >= whaleThreshold && whaleThreshold > 0; });

        // Aggregate composition
        const archetypeCounts = { Researcher: 0, Fighter: 0, "Gem Spender": 0, Builder: 0, Balanced: 0 };
        const archetypePower = { Researcher: 0, Fighter: 0, "Gem Spender": 0, Builder: 0, Balanced: 0 };
        classified.forEach(p => {
            archetypeCounts[p.archetype] = (archetypeCounts[p.archetype] || 0) + 1;
            archetypePower[p.archetype] = (archetypePower[p.archetype] || 0) + p.powerDelta;
        });

        const total = classified.length || 1;
        const composition = Object.entries(archetypeCounts).map(([archetype, count]) => ({
            archetype,
            count,
            pct: Math.round((count / total) * 100),
            powerShare: archetypePower[archetype] || 0,
        })).sort((a, b) => b.count - a.count);

        // Kingdom DNA label
        const dominant = composition[0]?.archetype || "Unknown";
        const second = composition[1]?.archetype || "";
        const whaleCount = classified.filter(p => p.isWhale).length;

        let dnaLabel = `${dominant}-Dominant Kingdom`;
        if (composition[0]?.pct < 35) dnaLabel = "Hyper-Balanced Mixed Kingdom";
        if (whaleCount >= 5) dnaLabel = `Whale-Cluster ${dominant} Kingdom`;

        return NextResponse.json({
            success: true,
            kingdomId,
            timeframeDays,
            dnaLabel,
            composition,
            whaleCount,
            totalActive: classified.length,
            governors: sorted.slice(0, 100),
        });

    } catch (e) {
        console.error("[Lab/SpendingSignature]", e);
        return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
}
