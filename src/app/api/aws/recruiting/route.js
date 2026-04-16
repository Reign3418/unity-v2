import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdvancedKingdomDeltas, getT5Thresholds } from "@/lib/awsDynamo";

export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// VECTOR ENGINE — All computation on existing roster data, zero new DB writes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a value into [0.0, 1.0] using min-max scaling.
 * Returns 0.5 if all values are identical (no variance).
 */
function normalizeMinMax(value, min, max) {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Compute a raw (un-normalized) 8-dimensional player persona vector from
 * existing getAdvancedKingdomDeltas roster data.
 * Returns null if the player lacks enough data to be useful.
 */
function computeRawVector(gov, t5Floors) {
    const { power, killPoints, troopPower, techPower, commanderPower, buildingPower, powerDelta, kpDelta } = gov;

    // Skip players with no meaningful data
    if (!power || power < 1000000) return null;
    if (powerDelta === 'MISSING') return null;

    const pDelta = typeof powerDelta === 'number' ? powerDelta : 0;
    const kpD    = typeof kpDelta === 'number' ? Math.max(0, kpDelta) : 0;

    // 1. Power growth rate — raw delta (will be normalized across pool)
    const powerGrowthRate = pDelta;

    // 2. KP output rate — raw delta
    const kpGrowthRate = kpD;

    // 3. Dead ratio proxy — KP relative to power (fighters burn KP harder)
    //    Higher = more combat-invested relative to their size
    const combatDensity = killPoints / (power || 1);

    // 4. T5 eligibility score — 0.0 to 1.0 based on structural prerequisite floors
    const techPct     = Math.min(1, techPower     / (t5Floors.techFloor     || 22_467_131));
    const buildingPct = Math.min(1, buildingPower  / (t5Floors.buildingFloor || 14_780_832));
    const t5Score     = (techPct + buildingPct) / 2;

    // 5. Activity signal — growth rate relative to total power (avoids whale bias)
    const activitySignal = Math.abs(pDelta) / (power || 1);

    // 6. Troop composition — how much of their power is actually fielded troops
    const troopRatio = troopPower / (power || 1);

    // 7. Infrastructure investment — tech + building as share of total power
    const infraRatio = (techPower + buildingPower) / (power || 1);

    // 8. Commander depth — commanders signal active player spending on heroes
    const commanderRatio = commanderPower / (power || 1);

    return [
        powerGrowthRate,   // dim 0
        kpGrowthRate,      // dim 1
        combatDensity,     // dim 2
        t5Score,           // dim 3
        activitySignal,    // dim 4
        troopRatio,        // dim 5
        infraRatio,        // dim 6
        commanderRatio,    // dim 7
    ];
}

/**
 * Normalize a full population of raw vectors using per-dimension min-max.
 */
function normalizePopulation(rawVectors) {
    const dims = rawVectors[0].length;
    const mins = new Array(dims).fill(Infinity);
    const maxs = new Array(dims).fill(-Infinity);

    for (const v of rawVectors) {
        for (let d = 0; d < dims; d++) {
            if (v[d] < mins[d]) mins[d] = v[d];
            if (v[d] > maxs[d]) maxs[d] = v[d];
        }
    }

    return rawVectors.map(v =>
        v.map((val, d) => normalizeMinMax(val, mins[d], maxs[d]))
    );
}

/**
 * Cosine similarity between two equal-length vectors.
 */
function cosineSim(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot  += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Compute the centroid (mean) of a set of normalized vectors.
 */
function computeCentroid(normalizedVectors) {
    if (normalizedVectors.length === 0) return null;
    const dims = normalizedVectors[0].length;
    const centroid = new Array(dims).fill(0);
    for (const v of normalizedVectors) {
        for (let d = 0; d < dims; d++) centroid[d] += v[d];
    }
    return centroid.map(v => v / normalizedVectors.length);
}

/**
 * PCA Archetype classification — consistent with ScatterPlotTab.js logic.
 */
function classifyArchetype(gov) {
    const kp    = gov.killPoints || 0;
    const power = gov.power      || 1;
    const ratio = kp / power;

    if (ratio > 0.05) return 'HERO';
    if (ratio > 0.02) return 'WARRIOR';
    if ((gov.troopPower || 0) / power > 0.5) return 'FEEDER';
    if ((gov.techPower  || 0) / power > 0.4) return 'FARMER';
    return 'SLACKER';
}

const ARCHETYPE_COLORS = {
    HERO:    '#22c55e',
    WARRIOR: '#eab308',
    FEEDER:  '#8b5cf6',
    FARMER:  '#06b6d4',
    SLACKER: '#6b7280',
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.isMember) {
            return NextResponse.json({ error: "Access Denied." }, { status: 403 });
        }

        const {
            sourceKingdoms = [],   // kingdoms that define "ideal" profile
            targetKingdoms = [],   // kingdoms to search for candidates
            dkpThreshold   = 30,   // top X% of players by power as "elite" anchor
            windowDays     = 7,    // lookback window for delta computation
            minPower       = 0,    // optional power floor filter on candidates
        } = await req.json();

        if (sourceKingdoms.length === 0 || targetKingdoms.length === 0) {
            return NextResponse.json({ error: "Provide at least one source and one target kingdom." }, { status: 400 });
        }

        const allKingdoms = [...new Set([...sourceKingdoms, ...targetKingdoms])].slice(0, 10);
        const timeframeHours = windowDays * 24;

        // ── Fetch T5 anchor thresholds ────────────────────────────────────
        const t5Floors = await getT5Thresholds();

        // ── Fetch all kingdom rosters in parallel ─────────────────────────
        const results = await Promise.all(
            allKingdoms.map(kd =>
                getAdvancedKingdomDeltas(kd, timeframeHours)
                    .catch(() => ({ roster: [] }))
            )
        );

        // ── Build per-kingdom governor maps ───────────────────────────────
        const kingdomData = {};
        for (let i = 0; i < allKingdoms.length; i++) {
            const kd = allKingdoms[i];
            const roster = results[i]?.roster || [];
            kingdomData[kd] = roster.filter(g => g.powerDelta !== 'MISSING' && (g.power || 0) >= Math.max(minPower, 1_000_000));
        }

        // ── Compute raw vectors for the entire combined population ────────
        // Normalization MUST happen across the full pool so the coordinate space is consistent
        const allGovs = [];
        for (const [kd, roster] of Object.entries(kingdomData)) {
            for (const gov of roster) {
                const raw = computeRawVector(gov, t5Floors);
                if (raw) allGovs.push({ gov, kd, raw });
            }
        }

        if (allGovs.length === 0) {
            return NextResponse.json({ error: "No valid player data found for the selected kingdoms and window." }, { status: 404 });
        }

        const rawVectors     = allGovs.map(g => g.raw);
        const normalized     = normalizePopulation(rawVectors);
        // Attach normalized vectors back to each governor entry
        for (let i = 0; i < allGovs.length; i++) {
            allGovs[i].vector = normalized[i];
        }

        // ── Build SOURCE ideal vector (top dkpThreshold% by power from source KDs) ──
        const sourceGovs = allGovs.filter(g => sourceKingdoms.includes(g.kd));
        sourceGovs.sort((a, b) => (b.gov.power || 0) - (a.gov.power || 0));
        const eliteCount   = Math.max(1, Math.floor(sourceGovs.length * (dkpThreshold / 100)));
        const eliteGovs    = sourceGovs.slice(0, eliteCount);
        const idealVector  = computeCentroid(eliteGovs.map(g => g.vector));

        if (!idealVector) {
            return NextResponse.json({ error: "Insufficient source kingdom data to derive ideal profile." }, { status: 404 });
        }

        // ── Score all TARGET kingdom players against the ideal vector ─────
        const targetGovs = allGovs.filter(g => targetKingdoms.includes(g.kd));
        const candidates = targetGovs
            .map(g => ({
                id:             g.gov.id,
                name:           g.gov.name,
                alliance:       g.gov.alliance || 'N/A',
                kingdomId:      g.kd,
                power:          g.gov.power,
                killPoints:     g.gov.killPoints,
                powerDelta:     typeof g.gov.powerDelta === 'number' ? g.gov.powerDelta : 0,
                kpDelta:        typeof g.gov.kpDelta    === 'number' ? g.gov.kpDelta    : 0,
                troopPower:     g.gov.troopPower    || 0,
                techPower:      g.gov.techPower     || 0,
                commanderPower: g.gov.commanderPower || 0,
                buildingPower:  g.gov.buildingPower  || 0,
                archetype:      classifyArchetype(g.gov),
                archetypeColor: ARCHETYPE_COLORS[classifyArchetype(g.gov)],
                similarityScore: parseFloat((cosineSim(idealVector, g.vector) * 100).toFixed(1)),
                vector:         g.vector,
            }))
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .slice(0, 100); // Top 100 candidates

        // ── Compute current source pool centroid (for gap radar) ──────────
        const sourcePoolCentroid = computeCentroid(sourceGovs.map(g => g.vector));

        // ── Archetype breakdown stats ─────────────────────────────────────
        const archetypeStats = { HERO: 0, WARRIOR: 0, FEEDER: 0, FARMER: 0, SLACKER: 0 };
        for (const c of candidates) archetypeStats[c.archetype] = (archetypeStats[c.archetype] || 0) + 1;

        return NextResponse.json({
            success: true,
            candidates,
            idealVector,
            sourcePoolCentroid,
            archetypeStats,
            totalCandidatesScored: targetGovs.length,
            eliteBaselineSize: eliteCount,
            meta: {
                sourceKingdoms,
                targetKingdoms,
                windowDays,
                dkpThreshold,
                t5Floors,
            }
        });

    } catch (error) {
        console.error("[Recruiting API] Error:", error);
        return NextResponse.json({
            error: "Internal fault in Recruiting Engine.",
            debug: error?.message || String(error)
        }, { status: 500 });
    }
}
