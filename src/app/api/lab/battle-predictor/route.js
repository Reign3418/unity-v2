import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdvancedKingdomDeltas } from "@/lib/awsDynamo";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || !session.user?.isSuperAdmin) {
            return NextResponse.json({ error: "Super Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const kd1 = searchParams.get("kd1");
        const kd2 = searchParams.get("kd2");
        const timeframeDays = parseInt(searchParams.get("days") || "30");

        if (!kd1 || !kd2) return NextResponse.json({ error: "Two kingdom IDs required (kd1 & kd2)." }, { status: 400 });

        // Fetch both kingdoms in parallel
        const [r1, r2] = await Promise.all([
            getAdvancedKingdomDeltas(kd1, timeframeDays * 24),
            getAdvancedKingdomDeltas(kd2, timeframeDays * 24),
        ]);

        if (!r1?.roster || !r2?.roster) {
            return NextResponse.json({ error: "Could not load data for one or both kingdoms." }, { status: 404 });
        }

        // Combat scoring function
        const score = (roster, intel) => {
            const active = roster.filter(p => (p.powerDelta || 0) > 0);
            const fighters = roster.filter(p => (p.killPointsDelta || 0) > 0 || (p.deadsDelta || 0) > 0);
            const totalPower = roster.reduce((s, p) => s + (p.power || 0), 0);
            const totalTroopPower = roster.reduce((s, p) => s + (p.troopPower || p.troopPowerDelta || 0), 0);
            const totalKills = roster.reduce((s, p) => s + (p.killPointsDelta || 0), 0);
            const totalDeads = roster.reduce((s, p) => s + (p.deadsDelta || 0), 0);
            const t5Kills = roster.reduce((s, p) => s + (p.t5KillsDelta || 0), 0);

            // Weighted combat score (0-100)
            const activityScore = Math.min((fighters.length / roster.length) * 100, 100) * 0.25;
            const troopScore = Math.min((totalTroopPower / Math.max(totalPower, 1)) * 200, 100) * 0.20;
            const killScore = Math.min(totalKills / 5000000, 100) * 0.25;
            const t5Score = Math.min(t5Kills / 100000, 100) * 0.15;
            const leaderScore = (
                (intel?.stabilityScore || 0) * 0.5 +
                (intel?.activityRate || 0) * 0.5
            ) * 0.15;

            return {
                totalPower,
                totalTroopPower,
                totalKills,
                totalDeads,
                t5Kills,
                activeMembers: active.length,
                fighters: fighters.length,
                roster: roster.length,
                combatScore: Math.round(activityScore + troopScore + killScore + t5Score + leaderScore),
                activityRate: Math.round((active.length / roster.length) * 100),
                fightRate: Math.round((fighters.length / roster.length) * 100),
                stabilityScore: intel?.stabilityScore || 0,
                leadershipActivityRate: intel?.activityRate || 0,
            };
        };

        const s1 = score(r1.roster, r1.leadershipIntel);
        const s2 = score(r2.roster, r2.leadershipIntel);

        // Metric-level winner comparison
        const metrics = [
            { key: "totalPower", label: "Total Power", format: "number" },
            { key: "totalTroopPower", label: "Troop Power", format: "number" },
            { key: "totalKills", label: "Kill Points", format: "number" },
            { key: "t5Kills", label: "T5 Kills", format: "number" },
            { key: "fightRate", label: "Fight Rate %", format: "pct" },
            { key: "activityRate", label: "Activity Rate %", format: "pct" },
            { key: "stabilityScore", label: "Leadership Stability", format: "pct" },
            { key: "combatScore", label: "Combat Score", format: "score" },
        ];

        const metricResults = metrics.map(m => ({
            ...m,
            kd1Value: s1[m.key],
            kd2Value: s2[m.key],
            winner: s1[m.key] > s2[m.key] ? kd1 : s2[m.key] > s1[m.key] ? kd2 : "TIE",
        }));

        // AI odds
        let verdict = null;
        try {
            const prompt = `You are a Rise of Kingdoms military analyst. Two kingdoms are about to go to war. Based on this combat data, give a 2-sentence odds assessment. Be direct and numerical.

Kingdom ${kd1}: Combat Score ${s1.combatScore}/100, ${s1.fighters} active fighters, ${s1.t5Kills.toLocaleString()} T5 kills, ${s1.fightRate}% fight rate, Leadership stability ${s1.stabilityScore}%
Kingdom ${kd2}: Combat Score ${s2.combatScore}/100, ${s2.fighters} active fighters, ${s2.t5Kills.toLocaleString()} T5 kills, ${s2.fightRate}% fight rate, Leadership stability ${s2.stabilityScore}%

Sentence 1: State the odds (e.g. "KD ${kd1} wins this 65-35") and the single biggest reason.
Sentence 2: Name the one thing that could flip the result.
No markdown. Under 300 characters.`;

            const res = await ai.models.generateContent({
                model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
                contents: [{ text: prompt }],
                config: { temperature: 0.7 },
            });
            verdict = res.text || null;
        } catch {}

        return NextResponse.json({
            success: true,
            kd1,
            kd2,
            timeframeDays,
            kd1Stats: s1,
            kd2Stats: s2,
            metricResults,
            verdict,
            winner: s1.combatScore > s2.combatScore ? kd1 : s2.combatScore > s1.combatScore ? kd2 : "TIE",
            margin: Math.abs(s1.combatScore - s2.combatScore),
        });

    } catch (e) {
        console.error("[Lab/BattlePredictor]", e);
        return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
}
