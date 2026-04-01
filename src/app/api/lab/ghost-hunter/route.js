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

        const timeframeHours = timeframeDays * 24;
        const result = await getAdvancedKingdomDeltas(kingdomId, timeframeHours);
        if (!result?.roster) return NextResponse.json({ error: "No data found for kingdom." }, { status: 404 });

        const { roster, leadershipIntel } = result;
        const total = roster.length;

        // Ghost = zero power delta AND zero kill points delta
        const ghosts = roster.filter(p => (p.powerDelta || 0) === 0 && (p.killPointsDelta || 0) === 0);
        const dimGhosts = roster.filter(p => (p.powerDelta || 0) === 0 && (p.killPointsDelta || 0) > 0); // KP but no power
        const active = roster.filter(p => (p.powerDelta || 0) > 0);

        // Sort ghosts by their current power (they're dead weight at this power level)
        ghosts.sort((a, b) => (b.power || 0) - (a.power || 0));

        const ghostPower = ghosts.reduce((sum, p) => sum + (p.power || 0), 0);
        const totalPower = roster.reduce((sum, p) => sum + (p.power || 0), 0);
        const vitalityScore = Math.round((active.length / total) * 100);

        // Grade
        const grade = vitalityScore >= 85 ? 'A' : vitalityScore >= 70 ? 'B' : vitalityScore >= 55 ? 'C' : vitalityScore >= 40 ? 'D' : 'F';

        return NextResponse.json({
            success: true,
            kingdomId,
            timeframeDays,
            summary: {
                total,
                activeCount: active.length,
                ghostCount: ghosts.length,
                dimGhostCount: dimGhosts.length,
                ghostPower,
                totalPower,
                ghostPowerPct: totalPower > 0 ? Math.round((ghostPower / totalPower) * 100) : 0,
                vitalityScore,
                grade,
            },
            topGhosts: ghosts.slice(0, 50).map(p => ({
                name: p.name,
                id: p.id,
                power: p.power || 0,
                rank: p.rank,
                powerDelta: p.powerDelta || 0,
                killPointsDelta: p.killPointsDelta || 0,
            })),
            leadershipIntel,
        });

    } catch (e) {
        console.error("[Lab/GhostHunter]", e);
        return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
}
