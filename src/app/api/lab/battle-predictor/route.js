import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdvancedKingdomDeltas, getGlobalConfig } from "@/lib/awsDynamo";

export const maxDuration = 60;

const T5_POWER_THRESHOLD = 40_000_000;

// Score a single kingdom's (already-sliced) roster
function scoreRoster(roster, intel) {
    const total = roster.length || 1;

    const lifetimeFighters  = roster.filter(p => (p.killPoints || 0) > 0);
    const activeGrowers     = roster.filter(p => (p.powerDelta || 0) > 0);
    const t5Eligible        = roster.filter(p => (p.power || 0) >= T5_POWER_THRESHOLD);

    const totalPower        = roster.reduce((s, p) => s + (p.power || 0), 0);
    const totalTroopPower   = roster.reduce((s, p) => s + (p.troopPower || p.troopPowerDelta || 0), 0);
    const totalLifetimeKP   = roster.reduce((s, p) => s + (p.killPoints || 0), 0);
    const troopDensityPct   = Math.round((totalTroopPower / Math.max(totalPower, 1)) * 100);

    // Weights: activity 30%, lifetime fight rate 25%, troop density 20%, T5 eligibility 15%, leadership 10%
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
        totalScoredRoster: total,
        combatScore: Math.round(activityScore + fightScore + troopScore + t5Score + leaderScore),
        activityRate: Math.round((activeGrowers.length / total) * 100),
        lifetimeFightRate: Math.round((lifetimeFighters.length / total) * 100),
        stabilityScore: intel?.stabilityScore || 0,
        leadershipActivityRate: intel?.activityRate || 0,
    };
}

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || !session.user?.isSuperAdmin) {
            return NextResponse.json({ error: "Super Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);

        // Up to 4 kingdoms
        const kdParams = ["kd1", "kd2", "kd3", "kd4"]
            .map(k => searchParams.get(k))
            .filter(Boolean);

        if (kdParams.length < 2) {
            return NextResponse.json({ error: "At least 2 kingdom IDs required." }, { status: 400 });
        }

        const timeframeDays = parseInt(searchParams.get("days") || "30");

        // Roster depth: only score the top N players by power to avoid low-level account skew
        const topN = parseInt(searchParams.get("top") || "300");
        const validTopN = [300, 400, 650, 1000].includes(topN) ? topN : 300;

        // Fetch all kingdoms in parallel
        const rawResults = await Promise.allSettled(
            kdParams.map(kd => getAdvancedKingdomDeltas(kd, timeframeDays * 24))
        );

        const kingdoms = [];
        for (let i = 0; i < kdParams.length; i++) {
            const res = rawResults[i];
            if (res.status !== "fulfilled" || !res.value?.roster) {
                return NextResponse.json({ error: `No data found for KD ${kdParams[i]}.` }, { status: 404 });
            }

            // Sort by power descending, then slice to top N
            const fullRoster = res.value.roster.sort((a, b) => (b.power || 0) - (a.power || 0));
            const slicedRoster = fullRoster.slice(0, validTopN);

            const stats = scoreRoster(slicedRoster, res.value.leadershipIntel);
            kingdoms.push({
                kdId: kdParams[i],
                stats,
                fullRosterSize: fullRoster.length,
            });
        }

        // Sort by combat score descending (1st place = best)
        kingdoms.sort((a, b) => b.stats.combatScore - a.stats.combatScore);

        // Per-metric breakdown (kingdoms as columns)
        const metrics = [
            { key: "totalPower",          label: "Total Power",          format: "number", note: null },
            { key: "totalTroopPower",     label: "Troop Power",          format: "number", note: null },
            { key: "totalLifetimeKP",     label: "All-Time Kill Points", format: "number", note: "career total" },
            { key: "t5EligibleCount",     label: "T5-Eligible Players",  format: "count",  note: ">40M power" },
            { key: "lifetimeFightRate",   label: "Lifetime Fight Rate",  format: "pct",    note: "ever in KvK" },
            { key: "activityRate",        label: "Current Activity",     format: "pct",    note: `${timeframeDays}d window` },
            { key: "stabilityScore",      label: "Leadership Stability", format: "pct",    note: null },
            { key: "combatScore",         label: "Combat Score",         format: "score",  note: null },
        ];

        const metricResults = metrics.map(m => {
            const values = kingdoms.map(kd => ({ kdId: kd.kdId, value: kd.stats[m.key] }));
            const maxVal = Math.max(...values.map(v => v.value));
            return {
                ...m,
                values,
                winner: maxVal > 0 ? values.filter(v => v.value === maxVal).map(v => v.kdId) : [],
            };
        });

        // AI per-kingdom narrative verdict — harsh, specific, no sugar coating
        let verdict = null;
        try {
            const kdSummaries = kingdoms.map((kd, i) => {
                const s = kd.stats;
                const lines2 = [
                    `KD ${kd.kdId} [Rank #${i + 1} — Combat Score ${s.combatScore}/100]`,
                    `  Lifetime fighters: ${s.lifetimeFighterCount}/${s.totalScoredRoster} (${s.lifetimeFightRate}% have ever fought in KvK)`,
                    `  T5-eligible (>40M power): ${s.t5EligibleCount} players (${s.t5EligiblePct}% of scored roster)`,
                    `  Currently active/growing this window: ${s.activityRate}%`,
                    `  Troop power density: ${s.troopDensityPct}% (fighter-built = high, economic = low)`,
                    `  Leadership stability: ${s.stabilityScore}% | Leadership activity: ${s.leadershipActivityRate}%`,
                    `  All-time kill points: ${s.totalLifetimeKP.toLocaleString()}`,
                ];
                return lines2.join("\n");
            }).join("\n\n");

            const prompt = [
                `You are a savage, no-nonsense Rise of Kingdoms KvK military analyst. You do not sugarcoat. You do not encourage. You call it exactly as the data shows. You have ${kingdoms.length} kingdoms to dissect.`,
                "",
                kdSummaries,
                "",
                "Write one brutal, honest paragraph for EACH kingdom. Label each with its KD number. Rules:",
                "- WINNER: Name what specifically makes them dangerous. Cite the numbers. Tell them what advantage they must press in KvK and warn them if there is any crack in their armor.",
                "- MID-TIER: Be direct about what is wrong. Do not say they have potential. Tell them exactly which metric is their weakness and how far behind they are from being competitive.",
                "- LOSERS: Do not be kind. Tell them clearly they will lose, and why the data guarantees it. Name the exact stat that condemns them. If they have any shot at all, name the ONE drastic change they would need to make — and make it clear it would take significant effort. If they have no realistic shot, say so.",
                "End with one hard final sentence: name the winner, give the margin of confidence, and state exactly what the runner-up would need to flip it.",
                "No headers. No bullets. No markdown. No flattery. Plain paragraphs separated by blank lines. Numbers from the data only. Be ruthless."
            ].join("\n");

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
            timeframeDays,
            topN: validTopN,
            t5Threshold: T5_POWER_THRESHOLD,
            kingdoms,       // sorted 1st place first
            metricResults,
            verdict,
        });

    } catch (e) {
        console.error("[Lab/BattlePredictor]", e);
        return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
}
