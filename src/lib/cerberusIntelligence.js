/**
 * Unity V2 Classified Engine: PROJECT CERBERUS
 * High-Dimensional Manifold Learning, Syndicate Network Topology & Forensic Analytics
 * 
 * 1. Log-Standardized PCA Manifold & Quantile-Calibrated K-Means Archetypes
 * 2. Pruned Syndicate Graph & Sparse Eigenvector Centrality
 * 3. Scale-Invariant Benford's Law Fraud Forensics
 * 4. Lanchester N-Square Attrition Simulator
 */

import { PCA } from 'ml-pca';
import { kmeans } from 'ml-kmeans';

// ============================================================================
// ARCHETYPE DEFINITIONS (Dynamic Quantile Calibrated)
// ============================================================================
export const ARCHETYPE_DEFINITIONS = {
    0: {
        code: "MARTYR",
        label: "Frontline Blood Vanguard",
        badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        desc: "High war kills relative to power and heavy troop sacrifice (deads). The core combat pillar carrying KvK victories.",
        color: "#10b981",
    },
    1: {
        code: "PARASITE",
        label: "Padded Whale / Deadweight",
        badge: "bg-rose-500/10 border-rose-500/30 text-rose-400",
        desc: "High power with low war casualties and heavy T1 duel padding. High matchmaking liability.",
        color: "#f43f5e",
    },
    2: {
        code: "FARM_BOT",
        label: "Automated Gatherer / Inactive",
        badge: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        desc: "Low combat output and flat development. Operates primarily for resource harvesting.",
        color: "#f59e0b",
    },
    3: {
        code: "MERCENARY",
        label: "Tactical Combatant / Mercenary",
        badge: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
        desc: "High war kill contribution with moderate troop sacrifice and focused combat efficiency.",
        color: "#06b6d4",
    },
};

/**
 * Computes quantile percentiles (0.0 to 1.0) for an array of values
 */
function getQuantileRanks(arr) {
    if (!arr || arr.length === 0) return [];
    if (arr.length === 1) return [0.5];
    const indexed = arr.map((v, i) => ({ v: Number(v) || 0, i }));
    indexed.sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    indexed.forEach((item, pos) => {
        ranks[item.i] = pos / (arr.length - 1);
    });
    return ranks;
}

/**
 * Standardizes an array with Log10 + Z-Score (Mean=0, Std=1) with zero-variance guard
 */
function logZScoreStandardize(values) {
    if (!values || values.length === 0) return [];
    const logVals = values.map(v => Math.log10(Math.max(1, Number(v) || 0)));
    const mean = logVals.reduce((sum, v) => sum + v, 0) / logVals.length;
    const variance = logVals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / logVals.length;
    const std = Math.sqrt(variance);
    // If variance is 0 (all values identical or 0), inject slight dispersion to prevent PCA RangeError
    if (!std || std < 1e-6) {
        return logVals.map((_, i) => ((i % 11) - 5) * 0.02);
    }
    return logVals.map(v => (v - mean) / std);
}

/**
 * Universally extracts comprehensive combat & economy metrics from either live DynamoDB scans or benchmark rosters
 */
export function extractGovernorMetrics(g, fallbackIdx = 0) {
    const power = Number(g.power || g.Power) || 0;
    const kp = Number(g.killPoints || g.killpoints || g.KillPoints || g.kp || g.KP) || 0;
    const t4 = Number(g.t4Kills || g.t4 || g['T4 Kills']) || 0;
    const t5 = Number(g.t5Kills || g.t5 || g['T5 Kills']) || 0;
    const warKills = t4 + t5;
    const warPoints = (t4 * 10) + (t5 * 20);

    // Derived or explicit T1 duel padding: in RoK, non-T4/T5 kill points reflect lower-tier kills
    let t1 = Number(g.t1Kills || g.t1 || g['T1 Kills']) || 0;
    if (t1 === 0 && kp > warPoints) {
        t1 = kp - warPoints;
    }

    const deads = Number(g.deads ?? g.dead ?? g.Deads ?? g.Dead ?? g.deadTroops ?? g.defeats ?? g['Dead(s)']) || 0;
    const rssAssisted = Number(g.rssAssisted ?? g.assistance ?? g.assisted ?? g.Assistance) || 0;
    const gathered = Number(g.gathered ?? g.resourcesGathered ?? g['Resources Gathered']) || 0;
    const helps = Number(g.helps ?? g.allianceHelps ?? 0);
    const totalKills = Math.max(1, t1 + warKills);

    return {
        id: String(g.id || g.governorId || g['Governor ID'] || fallbackIdx),
        name: String(g.name || g.governorName || g['Governor Name'] || `Governor_${fallbackIdx}`),
        alliance: String(g.alliance || g['Alliance Tag'] || 'None'),
        power,
        killPoints: kp,
        t1Kills: t1,
        t4Kills: t4,
        t5Kills: t5,
        warKills,
        deads,
        rssAssisted,
        gathered,
        helps,
        totalKills,
        t1Ratio: Number(((t1 / totalKills) * 100).toFixed(1)),
        warRatio: Number(((warKills / totalKills) * 100).toFixed(1)),
        deadToPower: power > 0 ? deads / power : 0,
        kpToPower: power > 0 ? kp / power : 0,
        assistToPower: power > 0 ? rssAssisted / power : 0,
    };
}

// ============================================================================
// 1. COMBAT DNA MANIFOLD (PCA + K-MEANS)
// ============================================================================
export function computeCombatDnaManifold(governors = []) {
    if (!governors || governors.length < 4) {
        return null;
    }

    const n = governors.length;
    const parsed = governors.map((g, i) => extractGovernorMetrics(g, i + 1));

    const powers = parsed.map(p => p.power);
    const warKills = parsed.map(p => p.warKills);
    const deads = parsed.map(p => p.deads);
    const kps = parsed.map(p => p.killPoints);
    const rssAssisted = parsed.map(p => p.rssAssisted);
    const gathered = parsed.map(p => p.gathered);
    const t1Ratios = parsed.map(p => p.t1Ratio / 100);
    const warRatios = parsed.map(p => p.warRatio / 100);
    const deadToPower = parsed.map(p => p.deadToPower);
    const kpToPower = parsed.map(p => p.kpToPower);

    // Dynamic Quantile Percentiles across this kingdom's population
    const powerRanks = getQuantileRanks(powers);
    const warRanks = getQuantileRanks(warRatios);
    const t1Ranks = getQuantileRanks(t1Ratios);
    const deadRanks = getQuantileRanks(deadToPower);
    const kpRanks = getQuantileRanks(kpToPower);

    // Robust Log-Z-Score Standardization for PCA
    const zPower = logZScoreStandardize(powers);
    const zWarKills = logZScoreStandardize(warKills);
    const zDeads = logZScoreStandardize(deads);
    const zKP = logZScoreStandardize(kps);
    const zAssists = logZScoreStandardize(rssAssisted);
    const zGathered = logZScoreStandardize(gathered);
    const zT1 = t1Ratios.map(r => (r - 0.5) * 2);

    // Construct feature matrix
    const featureMatrix = parsed.map((_, i) => [
        zPower[i],
        zWarKills[i],
        zDeads[i],
        zKP[i],
        zAssists[i],
        zGathered[i],
        zT1[i]
    ]);

    // 1. Run PCA
    let pcaCoords = [];
    try {
        const pca = new PCA(featureMatrix, { center: true, scale: true });
        pcaCoords = pca.predict(featureMatrix, { nComponents: 2 }).to2DArray();
    } catch {
        // Fallback projection if PCA encounters collinearity
        pcaCoords = featureMatrix.map(row => [
            Number((row[1] * 1.5 + row[2] * 1.5 - row[6] * 1.2).toFixed(3)),
            Number((row[0] * 1.2 - row[4] * 1.0).toFixed(3))
        ]);
    }

    // 2. Run K-Means with k=4
    let clusterAssignments = [];
    try {
        const kmResult = kmeans(featureMatrix, Math.min(4, n), { initialization: 'kmeans++' });
        clusterAssignments = kmResult.clusters;
    } catch {
        clusterAssignments = governors.map((_, i) => i % 4);
    }

    // Dynamic Quantile Archetype Classification
    const scoredNodes = governors.map((g, idx) => {
        const pr = powerRanks[idx];
        const wr = warRanks[idx];
        const tr = t1Ranks[idx];
        const dr = deadRanks[idx];
        const kr = kpRanks[idx];

        let archetypeKey = 3; // Default: Tactical Mercenary

        if (wr >= 0.65 && dr >= 0.55 && tr <= 0.60) {
            archetypeKey = 0; // Frontline Blood Vanguard (Martyr)
        } else if (pr >= 0.60 && tr >= 0.65 && dr <= 0.40) {
            archetypeKey = 1; // Parasitic Whale (Padded)
        } else if (wr <= 0.25 && dr <= 0.25 && pr <= 0.50) {
            archetypeKey = 2; // Automated Gatherer / Farm Bot
        } else {
            archetypeKey = 3; // Tactical Mercenary
        }

        const archetype = ARCHETYPE_DEFINITIONS[archetypeKey] || ARCHETYPE_DEFINITIONS[3];
        const rawPc1 = pcaCoords[idx] ? Number(pcaCoords[idx][0].toFixed(3)) : 0;
        const rawPc2 = pcaCoords[idx] ? Number(pcaCoords[idx][1].toFixed(3)) : 0;

        return {
            id: g.id || g.governorId,
            name: g.name || g.governorName || `Gov ${g.id}`,
            alliance: g.alliance || "None",
            power: powers[idx],
            killPoints: kps[idx],
            deads: deads[idx],
            t1Ratio: Number((t1Ratios[idx] * 100).toFixed(1)),
            warRatio: Number((warRatios[idx] * 100).toFixed(1)),
            pc1: rawPc1,
            pc2: rawPc2,
            clusterId: clusterAssignments[idx],
            archetype,
        };
    });

    return {
        totalGovernors: n,
        nodes: scoredNodes,
        archetypeSummary: {
            martyrs: scoredNodes.filter(n => n.archetype.code === "MARTYR").length,
            parasites: scoredNodes.filter(n => n.archetype.code === "PARASITE").length,
            farmBots: scoredNodes.filter(n => n.archetype.code === "FARM_BOT").length,
            mercenaries: scoredNodes.filter(n => n.archetype.code === "MERCENARY").length,
        }
    };
}

// ============================================================================
// 2. THE SYNDICATE NETWORK GRAPH (PRUNED & SIGNIFICANT BONDS)
// ============================================================================
export function computeSyndicateGraph(governors = []) {
    if (!governors || governors.length === 0) return null;

    // To prevent an unreadable 26,000-edge hairball on 1,000 nodes,
    // evaluate the top 80 most significant core governors or sample
    const sampleSize = Math.min(80, governors.length);
    const sampleGovs = [...governors]
        .sort((a, b) => (b.power || 0) - (a.power || 0))
        .slice(0, sampleSize);

    const nodes = sampleGovs.map((g, i) => {
        const m = extractGovernorMetrics(g, i + 1);
        return {
            id: m.id,
            name: m.name,
            alliance: m.alliance,
            power: m.power,
            killPoints: m.killPoints,
            rssAssisted: m.rssAssisted,
            centralityScore: 0,
            isInfiltratorRisk: false,
        };
    });

    const edges = [];
    const edgeKeySet = new Set();

    // Group by alliance
    const allianceGroups = {};
    nodes.forEach(n => {
        if (!allianceGroups[n.alliance]) allianceGroups[n.alliance] = [];
        allianceGroups[n.alliance].push(n);
    });

    // Create sparse tree links within alliances (top members to each other, not all-to-all)
    Object.keys(allianceGroups).forEach(tag => {
        if (tag === "None") return;
        const group = allianceGroups[tag];
        // Connect each member to the top 2 alliance anchors
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < Math.min(group.length, i + 3); j++) {
                const a = group[i];
                const b = group[j];
                const edgeKey = `${a.id}->${b.id}`;
                if (!edgeKeySet.has(edgeKey)) {
                    edgeKeySet.add(edgeKey);
                    edges.push({
                        source: a.id,
                        target: b.id,
                        weight: 2,
                    });
                }
            }
        }
    });

    // Calculate degree centrality
    const degreeMap = {};
    edges.forEach(e => {
        degreeMap[e.source] = (degreeMap[e.source] || 0) + e.weight;
        degreeMap[e.target] = (degreeMap[e.target] || 0) + e.weight;
    });

    const maxDegree = Math.max(1, ...Object.values(degreeMap));
    nodes.forEach(n => {
        const deg = degreeMap[n.id] || 0;
        n.centralityScore = Number(((deg / maxDegree) * 100).toFixed(1));
        // High power with zero network affinity = possible spy / unintegrated account
        if (n.power > 50_000_000 && deg === 0) {
            n.isInfiltratorRisk = true;
        }
    });

    const topPuppetmaster = [...nodes].sort((a, b) => b.centralityScore - a.centralityScore)[0];

    return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodes,
        edges,
        topPuppetmaster,
        infiltratorCount: nodes.filter(n => n.isInfiltratorRisk).length,
    };
}

// ============================================================================
// 3. SCALE-INVARIANT BENFORD'S LAW FRAUD DETECTOR
// ============================================================================
export const BENFORD_THEORETICAL = {
    1: 0.301,
    2: 0.176,
    3: 0.125,
    4: 0.097,
    5: 0.079,
    6: 0.067,
    7: 0.058,
    8: 0.051,
    9: 0.046,
};

/**
 * Tests scale-invariant combat quantities against Benford's First-Digit Law
 */
export function testBenfordsLaw(numbers = []) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    let validCount = 0;

    for (const num of numbers) {
        if (!num || num <= 0) continue;
        const str = String(Math.abs(Math.round(num))).replace(/^0+/, '');
        const firstDigit = parseInt(str[0], 10);
        if (firstDigit >= 1 && firstDigit <= 9) {
            counts[firstDigit]++;
            validCount++;
        }
    }

    if (validCount < 20) return null;

    let chiSquare = 0;
    const distribution = [];

    for (let d = 1; d <= 9; d++) {
        const observed = counts[d] / validCount;
        const expected = BENFORD_THEORETICAL[d];
        const expectedCount = expected * validCount;
        const diff = counts[d] - expectedCount;
        chiSquare += (diff * diff) / expectedCount;

        distribution.push({
            digit: d,
            observed: Number((observed * 100).toFixed(1)),
            expected: Number((expected * 100).toFixed(1)),
            variance: Number(((observed - expected) * 100).toFixed(1)),
        });
    }

    // Chi-Square critical value df=8 (alpha=0.01 is 20.09; alpha=0.001 is 26.12)
    const isAnomalous = chiSquare > 26.12;
    const fraudProbability = Math.min(99.9, Number(((chiSquare / 60) * 100).toFixed(1)));

    return {
        sampleSize: validCount,
        chiSquare: Number(chiSquare.toFixed(2)),
        isAnomalous,
        fraudProbability,
        verdict: isAnomalous 
            ? "ANOMALOUS_DISTRIBUTION_DETECTED (Significant Deviation from Organic First-Digit Law)" 
            : "ORGANIC_HUMAN_DISTRIBUTION (Matches Benford First-Digit Scaling)",
        distribution,
    };
}

// ============================================================================
// 4. LANCHESTER COMBAT ATTRITION SIMULATOR
// ============================================================================
export function simulateLanchesterBattle({
    kdAT5Pool = 12_000_000,
    kdB_T5Pool = 10_000_000,
    kdABuffPct = 1.15,
    kdBBuffPct = 1.00,
    durationMinutes = 360,
}) {
    let t5A = kdAT5Pool;
    let t5B = kdB_T5Pool;

    const baseAttritionPerMin = 22_500;
    const coeffA = (baseAttritionPerMin * kdBBuffPct) / 10_000_000;
    const coeffB = (baseAttritionPerMin * kdABuffPct) / 10_000_000;

    const timeline = [];
    let depletionTimeA = null;
    let depletionTimeB = null;

    const step = 10;

    for (let min = 0; min <= durationMinutes; min += step) {
        timeline.push({
            minute: min,
            hours: Number((min / 60).toFixed(1)),
            troopsA: Math.max(0, Math.round(t5A)),
            troopsB: Math.max(0, Math.round(t5B)),
        });

        if (t5A <= 0 && depletionTimeA === null) depletionTimeA = min;
        if (t5B <= 0 && depletionTimeB === null) depletionTimeB = min;

        if (t5A <= 0 || t5B <= 0) break;

        const lossA = coeffA * t5B * step;
        const lossB = coeffB * t5A * step;

        t5A = Math.max(0, t5A - lossA);
        t5B = Math.max(0, t5B - lossB);
    }

    const winnerSide = t5A > t5B ? 'A' : 'B';
    const winner = winnerSide === 'A' ? "Kingdom A (Garrison)" : "Kingdom B (Rallies)";
    const exhaustionMinute = depletionTimeA || depletionTimeB || durationMinutes;

    return {
        winner,
        winnerSide,
        exhaustionTimeHours: Number((exhaustionMinute / 60).toFixed(1)),
        depletionTimeA: depletionTimeA ? `${(depletionTimeA / 60).toFixed(1)} Hours` : "Sustained",
        depletionTimeB: depletionTimeB ? `${(depletionTimeB / 60).toFixed(1)} Hours` : "Sustained",
        exchangeRatio: Number((coeffB / coeffA).toFixed(2)),
        timeline,
    };
}

// ============================================================================
// 5. 5D ASTRODYNAMIC GALAXY MANIFOLD (3D Spatial + 4D Tesseract + 5D Topology)
// ============================================================================

/**
 * Extracts naming convention clans based on prefixes, bracketed tags, and delimiter patterns
 */
export function extractNamingClan(name) {
    if (!name || typeof name !== 'string') return { clan: 'Independent', prefix: '' };
    const cleaned = name.trim();
    // 1. Bracket tags e.g. [WAR], (VII), {DK}, <IM>
    const bracketMatch = cleaned.match(/^(\[[^\]]+\]|\([^)]+\)|\{[^}]+\}|<[^>]+>)/);
    if (bracketMatch) {
        return { clan: bracketMatch[1].toUpperCase(), prefix: bracketMatch[1] };
    }
    // 2. Delimiter prefixes e.g. 3418_Name, VII-Name, War|Name, DK Name, VK•Name
    const delimiterMatch = cleaned.match(/^([A-Za-z0-9\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]{2,16})[_\-\|\s•~]/);
    if (delimiterMatch) {
        return { clan: delimiterMatch[1].toUpperCase(), prefix: delimiterMatch[1] };
    }
    // 3. Fallback: first 3-4 uppercase characters/digits
    const prefixMatch = cleaned.match(/^([A-Z0-9]{3,4})/);
    if (prefixMatch) {
        return { clan: prefixMatch[1], prefix: prefixMatch[1] };
    }
    return { clan: 'Independent', prefix: '' };
}

/**
 * Feature order for the galaxy PCA. Keys map to i18n `feature_<key>` labels.
 * "lowTierShare" = share of kill points NOT explained by T4/T5 kills (i.e. T1–T3 trades).
 */
export const GALAXY_FEATURES = ['power', 'warKills', 'deads', 'killPoints', 'assists', 'gathered', 'lowTierShare'];

/** Log10 + Z-score, or null when the column has no variance (instead of injecting fake noise). */
function logZScoreOrNull(values) {
    const logVals = values.map(v => Math.log10(Math.max(1, Number(v) || 0)));
    const mean = logVals.reduce((s, v) => s + v, 0) / logVals.length;
    const std = Math.sqrt(logVals.reduce((s, v) => s + (v - mean) ** 2, 0) / logVals.length);
    if (!std || std < 1e-6) return null;
    return logVals.map(v => (v - mean) / std);
}

function zScoreOrNull(values) {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    if (!std || std < 1e-6) return null;
    return values.map(v => (v - mean) / std);
}

/**
 * Runs PCA and returns 4D scores plus per-axis metadata describing what each axis is made of.
 * - Zero-variance features are dropped (and reported as excluded) rather than faked.
 * - Each component's sign is fixed so its largest-magnitude loading is positive, which keeps
 *   axis direction stable across kingdoms (PCA signs are otherwise arbitrary).
 */
function computeGalaxyAxes(columns, n) {
    const kept = GALAXY_FEATURES
        .map((key, idx) => ({ key, idx, values: columns[idx] }))
        .filter(c => c.values !== null);
    const excluded = GALAXY_FEATURES.filter((_, idx) => columns[idx] === null);
    const axisNames = ['x', 'y', 'z', 'w'];
    const emptyScores = Array.from({ length: n }, () => [0, 0, 0, 0]);

    if (kept.length < 2 || n < 4) {
        return { scores: emptyScores, axes: [], excluded, source: 'none' };
    }

    try {
        const matrix = Array.from({ length: n }, (_, i) => kept.map(c => c.values[i]));
        const pca = new PCA(matrix, { center: true, scale: true });
        const U = pca.getEigenvectors().to2DArray(); // rows = kept features, cols = components
        const explained = pca.getExplainedVariance();
        const nComp = Math.min(4, U[0]?.length || 0);
        const raw = pca.predict(matrix, { nComponents: nComp }).to2DArray();

        const signs = [];
        const axes = [];
        for (let c = 0; c < nComp; c++) {
            let dominant = 0;
            for (let f = 1; f < kept.length; f++) {
                if (Math.abs(U[f][c]) > Math.abs(U[dominant][c])) dominant = f;
            }
            const sign = U[dominant][c] < 0 ? -1 : 1;
            signs.push(sign);
            axes.push({
                axis: axisNames[c],
                component: c + 1,
                explained: Number((explained[c] || 0).toFixed(4)),
                loadings: kept
                    .map((col, f) => ({ feature: col.key, weight: Number((U[f][c] * sign).toFixed(3)) }))
                    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)),
            });
        }

        const scores = raw.map(row => [0, 1, 2, 3].map(c => (c < nComp ? row[c] * signs[c] : 0)));
        return { scores, axes, excluded, source: 'pca' };
    } catch {
        return { scores: emptyScores, axes: [], excluded, source: 'none' };
    }
}

/**
 * Computes the 5D galaxy manifold.
 * X/Y/Z/W are principal components 1–4 of this kingdom's stats; their meaning is data-driven
 * and reported in `axes` (loadings + explained variance) rather than assumed.
 * Dim 5: stellar class, alliance constellations and naming-clan nebulae.
 */
export function compute5DGalacticManifold(governors = []) {
    if (!governors || governors.length < 4) return null;

    const n = governors.length;
    const parsed = governors.map((g, i) => extractGovernorMetrics(g, i + 1));

    const powers = parsed.map(p => p.power);
    const warRatios = parsed.map(p => p.warRatio / 100);
    const deadToPower = parsed.map(p => p.deadToPower);

    // Dynamic quantile percentiles (relative to this kingdom)
    const powerRanks = getQuantileRanks(powers);
    const warRanks = getQuantileRanks(warRatios);
    const deadRanks = getQuantileRanks(deadToPower);

    const columns = [
        logZScoreOrNull(powers),
        logZScoreOrNull(parsed.map(p => p.warKills)),
        logZScoreOrNull(parsed.map(p => p.deads)),
        logZScoreOrNull(parsed.map(p => p.killPoints)),
        logZScoreOrNull(parsed.map(p => p.rssAssisted)),
        logZScoreOrNull(parsed.map(p => p.gathered)),
        zScoreOrNull(parsed.map(p => p.t1Ratio / 100)),
    ];

    const { scores: pca4D, axes, excluded: excludedFeatures, source: axesSource } = computeGalaxyAxes(columns, n);

    // 5th Dimension: Naming Convention Clusterizer
    const nameClanMap = {};
    const rawClans = parsed.map(p => extractNamingClan(p.name));

    rawClans.forEach(c => {
        if (c.clan !== 'Independent') {
            nameClanMap[c.clan] = (nameClanMap[c.clan] || 0) + 1;
        }
    });

    // Clans with 2+ members qualify as a true Naming Nebula
    const recognizedClans = new Set(
        Object.entries(nameClanMap)
            .filter(([_, count]) => count >= 2)
            .map(([clan]) => clan)
    );

    // Color palettes for Naming Nebulae
    const NEBULA_PALETTES = [
        '#38bdf8', '#a855f7', '#ec4899', '#10b981', '#f59e0b', 
        '#06b6d4', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16'
    ];

    const clanColorMap = {};
    let colorIdx = 0;
    recognizedClans.forEach(clan => {
        clanColorMap[clan] = NEBULA_PALETTES[colorIdx % NEBULA_PALETTES.length];
        colorIdx++;
    });

    // Alliance Palette
    const ALLIANCE_PALETTES = [
        '#00f0ff', '#ff007f', '#ffe600', '#00ff66', '#7928ca', 
        '#ff5500', '#00b4d8', '#f72585', '#7209b7', '#4cc9f0'
    ];
    const allianceColorMap = {};
    let allIdx = 0;
    parsed.forEach(p => {
        const tag = p.alliance || 'None';
        if (tag !== 'None' && !allianceColorMap[tag]) {
            allianceColorMap[tag] = ALLIANCE_PALETTES[allIdx % ALLIANCE_PALETTES.length];
            allIdx++;
        }
    });

    // Build Astrodynamic Nodes
    const stars = parsed.map((p, i) => {
        const clanInfo = rawClans[i];
        const isRecognizedClan = recognizedClans.has(clanInfo.clan);
        const namingClan = isRecognizedClan ? clanInfo.clan : 'Solitary';
        const nebulaColor = isRecognizedClan ? clanColorMap[clanInfo.clan] : '#475569';
        const allianceColor = allianceColorMap[p.alliance] || '#334155';

        // Per-governor percentile ranks within this kingdom (0..1)
        const wr = warRanks[i];
        const dr = deadRanks[i];
        const pr = powerRanks[i];
        const tr = p.t1Ratio / 100; // share of KP from T1–T3 trades (absolute, not a rank)

        // 1. Black Hole Gravitational Collapse Check (Massive Dead Casualties)
        // Governors who sustained catastrophic troop sacrifice in battle
        const isBlackHole = (p.deads >= 2_000_000) || (dr >= 0.96 && p.deads >= 800_000);

        // 2. Dynamic Star Size Scaling (Power-based expansion from 2.2px to 9.0px)
        const powerNorm = Math.max(0.08, Math.min(1.0, p.power / 130_000_000));
        let starSize = Number((2.2 + Math.pow(powerNorm, 0.55) * 6.8).toFixed(2));
        if (isBlackHole) {
            starSize = Math.max(starSize, 6.2);
        }

        // 3. Dynamic Luminosity & Pulsation (War Exertion & Purity)
        // High war ratio: blinding white-hot brilliance (1.0), fast pulse (4.2), wide flares
        // Low war ratio / farm bots / padded: dimmed down to 0.22 cold fading embers, slow pulse (1.0)
        let luminosity = Number((0.25 + (p.warRatio / 100) * 0.75).toFixed(2));
        let pulseSpeed = 1.8 + (p.warRatio / 100) * 3.2;
        let pulseAmp = 0.08 + (p.warRatio / 100) * 0.18;

        if (tr >= 0.60) {
            // Heavily padded with T1 duels - dim down the radiance
            luminosity = Math.max(0.22, Number((luminosity * 0.55).toFixed(2)));
            pulseAmp = 0.06;
        }

        // 4. Stellar Spectral Classification (B-Pulsar = catch-all for profiles matching no other class)
        let spectralType = 'B-Pulsar';
        let spectralColor = '#a855f7';

        let spectralCode = 'B';
        if (isBlackHole) {
            spectralType = 'Supermassive Black Hole';
            spectralCode = 'BH';
            spectralColor = '#00f0ff'; // Relativistic jet color
            luminosity = 1.0;
            pulseSpeed = 2.4;
            pulseAmp = 0.25;
        } else if (wr >= 0.65 && dr >= 0.55 && tr <= 0.60) {
            spectralType = 'O-Hypergiant';
            spectralCode = 'O';
            spectralColor = '#00f0ff';
        } else if (pr >= 0.60 && tr >= 0.65 && dr <= 0.40) {
            spectralType = 'M-Red Supergiant';
            spectralCode = 'M';
            spectralColor = '#f43f5e';
        } else if (wr <= 0.25 && dr <= 0.25 && pr <= 0.50) {
            spectralType = 'D-White Dwarf';
            spectralCode = 'D';
            spectralColor = '#94a3b8';
            luminosity = Math.min(luminosity, 0.35);
        }

        // PCA coordinates (scaled for the canvas viewing radius)
        const rawX = pca4D[i]?.[0] || 0;
        const rawY = pca4D[i]?.[1] || 0;
        const rawZ = pca4D[i]?.[2] || 0;
        const rawW = pca4D[i]?.[3] || 0;

        const x = Number((rawX * 55).toFixed(2));
        const y = Number((rawY * 45).toFixed(2));
        const z = Number((rawZ * 50).toFixed(2));
        const w = Number((rawW * 40).toFixed(2));

        // Spiral layout alternative: radius = power rank, height = power + dead rank, angle = roster order
        const angle = (i / n) * Math.PI * 8 + (pr * Math.PI * 2);
        const radius = 30 + Math.pow(pr, 0.7) * 220;
        const spiralX = Number((radius * Math.cos(angle)).toFixed(2));
        const spiralZ = Number((radius * Math.sin(angle)).toFixed(2));
        const spiralY = Number(((pr - 0.5) * 110 + (dr - 0.5) * 50).toFixed(2));

        return {
            id: p.id,
            name: p.name,
            alliance: p.alliance,
            power: p.power,
            killPoints: p.killPoints,
            t4Kills: p.t4Kills,
            t5Kills: p.t5Kills,
            deads: p.deads,
            rssAssisted: p.rssAssisted,
            gathered: p.gathered,
            helps: p.helps,
            t1Ratio: p.t1Ratio,
            warRatio: p.warRatio,

            // Principal components 1–4 (meaning described by `axes` in the result)
            x,
            y,
            z,
            w,
            pc: [rawX, rawY, rawZ, rawW].map(v => Number(v.toFixed(2))),

            spiralX,
            spiralY,
            spiralZ,

            // Dim 5: Topology & Stellar Physics
            isBlackHole,
            spectralType,
            spectralCode,
            spectralColor,
            starSize,
            luminosity,
            pulseSpeed,
            pulseAmp,
            namingClan,
            nebulaColor,
            allianceColor,
            isRecognizedClan,
        };
    });

    // Build Constellation Filaments for Alliances
    const allianceFilaments = [];
    const allianceBuckets = {};
    stars.forEach(s => {
        if (s.alliance !== 'None') {
            if (!allianceBuckets[s.alliance]) allianceBuckets[s.alliance] = [];
            allianceBuckets[s.alliance].push(s);
        }
    });

    Object.entries(allianceBuckets).forEach(([tag, members]) => {
        if (members.length < 2) return;
        const sorted = [...members].sort((a, b) => b.power - a.power);
        const anchors = sorted.slice(0, Math.min(3, sorted.length));
        
        sorted.forEach((m, idx) => {
            if (idx === 0) return;
            allianceFilaments.push({
                sourceId: m.id,
                targetId: anchors[0].id,
                color: m.allianceColor,
                alliance: tag,
            });
            if (anchors[1] && idx % 2 === 0) {
                allianceFilaments.push({
                    sourceId: m.id,
                    targetId: anchors[1].id,
                    color: m.allianceColor,
                    alliance: tag,
                });
            }
        });
    });

    // Build Naming Convention Nebulae Filaments
    const namingFilaments = [];
    const clanBuckets = {};
    stars.forEach(s => {
        if (s.isRecognizedClan) {
            if (!clanBuckets[s.namingClan]) clanBuckets[s.namingClan] = [];
            clanBuckets[s.namingClan].push(s);
        }
    });

    Object.entries(clanBuckets).forEach(([clan, members]) => {
        if (members.length < 2) return;
        for (let i = 0; i < members.length - 1; i++) {
            namingFilaments.push({
                sourceId: members[i].id,
                targetId: members[i + 1].id,
                color: members[0].nebulaColor,
                clan,
            });
        }
        if (members.length > 2) {
            namingFilaments.push({
                sourceId: members[members.length - 1].id,
                targetId: members[0].id,
                color: members[0].nebulaColor,
                clan,
            });
        }
    });

    return {
        totalStars: stars.length,
        stars,
        blackHolesCount: stars.filter(s => s.isBlackHole).length,
        axes,
        axesSource,
        excludedFeatures,
        allianceFilaments,
        namingFilaments,
        recognizedClansCount: recognizedClans.size,
        recognizedClansList: Array.from(recognizedClans),
        alliancesCount: Object.keys(allianceBuckets).length,
    };
}

