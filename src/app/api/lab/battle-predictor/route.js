import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdvancedKingdomDeltas, getGlobalConfig } from "@/lib/awsDynamo";

export const maxDuration = 60;

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

        const [r1, r2] = await Promise.all([
            getAdvancedKingdomDeltas(kd1, timeframeDays * 24),
            getAdvancedKingdomDeltas(kd2, timeframeDays * 24),
        ]);

        if (!r1?.roster || !r2?.roster) {
            return NextResponse.json({ error: "Could not load data for one or both kingdoms." }, { status: 404 });
        }

        // T5 unlocks around 40-45M power — use as eligibility threshold
        const T5_POWER_THRESHOLD = 40_000_000;

        // Combat scoring function
        // FIX: Use LIFETIME kill points (p.killPoints) not windowed deltas.
        // Windowed delta = 0 for any kingdom not currently in KvK — causes false TIEs.
        // FIX: Replace T5 kills with T5-eligible player count (>40M power).
        // T5 kill data only populates during active KvK; eligibility is always available.
        const score = (roster, intel) => {
            const total = roster.length || 1;

            // Lifetime fighters — anyone with any career KP
            const lifetimeFighters = roster.filter(p => (p.killPoints || 0) > 0);

            // Currently growing in this window
            const activeGrowers = roster.filter(p => (p.powerDelta || 0) > 0);

            // T5 eligible by power tier
            const t5Eligible = roster.filter(p => (p.power || 0) >= T5_POWER_THRESHOLD);

            const totalPower = roster.reduce((s, p) => s + (p.power || 0), 0);
            const totalTroopPower = roster.reduce((s, p) => s + (p.troopPower || p.troopPowerDelta || 0), 0);
            const totalLifetimeKP = roster.reduce((s, p) => s + (p.killPoints || 0), 0);

            // Troop density % (high = fighter-built kingdom)
            const troopDensityPct = Math.round((totalTroopPower / Math.max(totalPower, 1)) * 100);

            // Weights (sum=1.0): activity 30%, lifetime fight rate 25%, troop density 20%, T5 eligibility 15%, leadership 10%
            const activityScore = Math.min((activeGrowers.length / total) * 100, 100) * 0.30;
            const fightScore    = Math.min((lifetimeFighters.length / total) * 100, 100) * 0.25;
            const troopScore    = Math.min(troopDensityPct * 2, 100) * 0.20;
            const t5Score       = Math.min((t5Eligible.length / total) * 100, 100) * 0.15;
            const leaderScore   = ((intel?.stabilityScore || 0) * 0.5 + (intel?.activityRate || 0) * 0.5) * 0.10;

            return {
                totalPower,
                totalTroopPower,
                totalLifetimeKP,
                troopDensityPct,
                t5EligibleCount: t5Eligible.length,
                t5EligiblePct: Math.round((t5Eligible.length / total) * 100),
                activeCount: activeGrowers.length,
                lifetimeFighterCount: lifetimeFighters.length,
                totalRoster: total,
                combatScore: Math.round(activityScore + fightScore + troopScore + t5Score + leaderScore),
                activityRate: Math.round((activeGrowers.length / total) * 100),
                lifetimeFightRate: Math.round((lifetimeFighters.length / total) * 100),
                stabilityScore: intel?.stabilityScore || 0,
                leadershipActivityRate: intel?.activityRate || 0,
            };
        };

        const s1 = score(r1.roster, r1.leadershipIntel);
        const s2 = score(r2.roster, r2.leadershipIntel);

        const metrics = [
            { key: "totalPower",        label: "Total Power",          format: "number", note: null },
            { key: "totalTroopPower",   label: "Troop Power",          format: "number", note: null },
            { key: "totalLifetimeKP",   label: "All-Time Kill Points", format: "number", note: "career total" },
            { key: "t5EligibleCount",   label: "T5-Eligible Players",  format: "count",  note: ">40M power" },
            { key: "lifetimeFightRate", label: "Lifetime Fight Rate",  format: "pct",    note: "ever in KvK" },
            { key: "activityRate",      label: "Current Activity",     format: "pct",    note: `${timeframeDays}d window` },
            { key: "stabilityScore",    label: "Leadership Stability", format: "pct",    note: null },
            { key: "combatScore",       label: "Combat Score",         format: "score",  note: null },
        ];

        const metricResults = metrics.map(m => ({
            ...m,
            kd1Value: s1[m.key],
            kd2Value: s2[m.key],
            winner: s1[m.key] > s2[m.key] ? kd1 : s2[m.key] > s1[m.key] ? kd2 : "TIE",
        }));

        // AI verdict
        let verdict = null;
        try {
            const prompt = `You are a Rise of Kingdoms military analyst. Two kingdoms are about to go to war. Give a 2-sentence odds assessment. Be direct and specific.\n\nKingdom ${kd1}: Combat Score ${s1.combatScore}/100, ${s1.lifetimeFighterCount}/${s1.totalRoster} lifetime fighters (${s1.lifetimeFightRate}%), ${s1.t5EligibleCount} T5-eligible (>40M power), ${s1.activityRate}% currently active, Leadership stability ${s1.stabilityScore}%\nKingdom ${kd2}: Combat Score ${s2.combatScore}/100, ${s2.lifetimeFighterCount}/${s2.totalRoster} lifetime fighters (${s2.lifetimeFightRate}%), ${s2.t5EligibleCount} T5-eligible (>40M power), ${s2.activityRate}% currently active, Leadership stability ${s2.stabilityScore}%\n\nSentence 1: State odds (e.g. "KD ${kd1} wins this 60-40") and the single biggest factor.\nSentence 2: Name the one thing most likely to flip the result.\nPlain text only. No markdown. Under 350 characters.`;

            const apiKey = process.env.GEMINI_API_KEY || await getGlobalConfig('GEMINI_API_KEY');
            if (apiKey) {
                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7 },
                    }),
                });
                if (geminiRes.ok) {
                    const geminiData = await geminiRes.json();
                    verdict = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
                }
            }
        } catch {}

        return NextResponse.json({
            success: true,
            kd1,
            kd2,
            timeframeDays,
            t5Threshold: T5_POWER_THRESHOLD,
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
