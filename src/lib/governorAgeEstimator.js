/**
 * Unity V2 Intelligence Engine: Governor Age & Epoch Estimator
 * 
 * Provides client-side and serverless algorithmic estimation of RoK account
 * creation dates, lifetime age, generational epochs, and migration history
 * based on monotonically sequential Governor IDs and Kingdom launch cadence.
 */

export const HISTORICAL_MILESTONES = [
    { id: 100_000, date: '2018-05-01', desc: 'Pre-launch Alpha / Soft-Launch', kd: 1000 },
    { id: 1_000_000, date: '2018-09-21', desc: 'Global Launch (KD 1001)', kd: 1001 },
    { id: 10_000_000, date: '2019-06-01', desc: 'Pre-Covid Classic Era', kd: 1150 },
    { id: 25_000_000, date: '2020-03-01', desc: 'Start of Covid Pandemic Surge', kd: 1450 },
    { id: 50_000_000, date: '2021-01-01', desc: 'Peak Lockdown Growth', kd: 1950 },
    { id: 80_000_000, date: '2022-01-01', desc: 'Mid-Stage Maturation', kd: 2450 },
    { id: 100_000_000, date: '2022-12-01', desc: '100M Player Milestone', kd: 2850 },
    { id: 140_000_000, date: '2024-01-01', desc: 'Modern Season of Conquest', kd: 3250 },
    { id: 175_000_000, date: '2025-01-01', desc: '2025 Generation', kd: 3600 },
    { id: 210_000_000, date: '2026-01-01', desc: 'Early 2026 Batch', kd: 3950 },
    { id: 218_877_479, date: '2026-04-15', desc: 'Live Telemetry Anchor (KD 4021)', kd: 4021 },
    { id: 245_000_000, date: '2026-12-31', desc: 'Late 2026 Projected Ceiling', kd: 4250 },
];

// Reference date for "now" in Unity V2 engine
const CURRENT_EPOCH = new Date('2026-10-07T00:00:00Z');

/**
 * Calculates estimated birth date and details for a Governor ID
 * 
 * @param {number|string} rawId - The Governor ID to evaluate
 * @param {number|string} [targetKingdom] - Optional current/observed kingdom
 * @returns {object|null}
 */
export function estimateGovernorAge(rawId, targetKingdom = null) {
    if (!rawId) return null;
    const cleanId = parseInt(String(rawId).replace(/\D/g, ''), 10);
    if (!cleanId || isNaN(cleanId) || cleanId < 10_000) {
        return null;
    }

    const digits = String(cleanId).length;

    // Boundary clamping
    const sorted = [...HISTORICAL_MILESTONES].sort((a, b) => a.id - b.id);
    let estimatedTimestamp;
    let bracket = null;

    if (cleanId <= sorted[0].id) {
        estimatedTimestamp = new Date(sorted[0].date).getTime();
        bracket = { lower: sorted[0], upper: sorted[0], ratio: 0 };
    } else if (cleanId >= sorted[sorted.length - 1].id) {
        const last = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        const ratePerId = (new Date(last.date).getTime() - new Date(prev.date).getTime()) / (last.id - prev.id);
        estimatedTimestamp = new Date(last.date).getTime() + (cleanId - last.id) * ratePerId;
        bracket = { lower: last, upper: last, ratio: 1 };
    } else {
        // Linear interpolation between the two surrounding milestones
        for (let i = 0; i < sorted.length - 1; i++) {
            const lower = sorted[i];
            const upper = sorted[i + 1];
            if (cleanId >= lower.id && cleanId <= upper.id) {
                const lowerTime = new Date(lower.date).getTime();
                const upperTime = new Date(upper.date).getTime();
                const ratio = (cleanId - lower.id) / (upper.id - lower.id);
                estimatedTimestamp = lowerTime + ratio * (upperTime - lowerTime);
                bracket = { lower, upper, ratio };
                break;
            }
        }
    }

    const estimatedDate = new Date(estimatedTimestamp);
    const ageMs = Math.max(0, CURRENT_EPOCH.getTime() - estimatedTimestamp);
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageYears = Number((ageDays / 365.25).toFixed(1));
    const ageMonths = Math.floor(ageDays / 30.4375);

    // Human-readable format
    let ageFormatted = '';
    const yearsPart = Math.floor(ageDays / 365.25);
    const monthsPart = Math.floor((ageDays % 365.25) / 30.4375);
    if (yearsPart > 0) {
        ageFormatted = `${yearsPart}y ${monthsPart}m`;
    } else {
        ageFormatted = `${monthsPart}m (${ageDays}d)`;
    }

    // Generational Classification
    let generation = {
        code: 'GEN_UNKNOWN',
        label: 'Unknown Epoch',
        badgeColor: 'border-gray-500/30 text-gray-400 bg-gray-500/10',
        era: 'Unknown',
    };

    if (digits <= 6) {
        generation = {
            code: 'GEN_0_ALPHA',
            label: 'Alpha / Soft-Launch',
            badgeColor: 'border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10',
            era: '2018 Early Beta (< K100)',
        };
    } else if (digits === 7) {
        generation = {
            code: 'GEN_1_OG',
            label: 'Gen 1: Global Launch OG',
            badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
            era: 'Late 2018 – Mid 2019 (K1001–K1150)',
        };
    } else if (digits === 8) {
        if (cleanId < 30_000_000) {
            generation = {
                code: 'GEN_2_CLASSIC',
                label: 'Gen 2: Classic Pre-Covid',
                badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
                era: 'Late 2019 – Early 2020 (K1150–K1500)',
            };
        } else if (cleanId < 60_000_000) {
            generation = {
                code: 'GEN_3_COVID_BOOM',
                label: 'Gen 3: Pandemic Surge',
                badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
                era: '2020 Lockdown Wave (K1500–K2000)',
            };
        } else {
            generation = {
                code: 'GEN_4_EXPANSION',
                label: 'Gen 4: Global Maturation',
                badgeColor: 'border-teal-500/30 text-teal-400 bg-teal-500/10',
                era: '2021 – Early 2022 (K2000–K2500)',
            };
        }
    } else if (digits >= 9) {
        if (cleanId < 140_000_000) {
            generation = {
                code: 'GEN_5_CENTURION',
                label: 'Gen 5: 100M Player Milestone',
                badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
                era: 'Mid 2022 – 2023 (K2500–K3200)',
            };
        } else if (cleanId < 180_000_000) {
            generation = {
                code: 'GEN_6_MODERN_SOC',
                label: 'Gen 6: Modern SoC Era',
                badgeColor: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
                era: '2024 (K3200–K3600)',
            };
        } else if (cleanId < 210_000_000) {
            generation = {
                code: 'GEN_7_RECENT',
                label: 'Gen 7: Late Generation',
                badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
                era: '2025 (K3600–K3950)',
            };
        } else {
            generation = {
                code: 'GEN_8_CURRENT',
                label: 'Gen 8: Modern Era / K4000+',
                badgeColor: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
                era: '2026 Active Spawns (K3950+)',
            };
        }
    }

    // Kingdom cross-referencing (Migration Detection)
    let migrationAnalysis = null;
    const cleanKd = targetKingdom ? parseInt(String(targetKingdom).replace(/\D/g, ''), 10) : null;

    if (cleanKd && cleanKd >= 1001) {
        const kdLaunchDate = estimateKingdomLaunchDate(cleanKd);
        const deltaMs = estimatedTimestamp - kdLaunchDate.getTime();
        const deltaDays = Math.floor(deltaMs / (1000 * 60 * 60 * 24));
        const deltaYears = Number((Math.abs(deltaDays) / 365.25).toFixed(1));

        let status = 'UNKNOWN';
        let statusLabel = 'Uncertain Alignment';
        let statusBadge = 'border-gray-500/30 text-gray-400 bg-gray-500/10';
        let explanation = '';

        if (deltaDays < -60) {
            // Created more than 2 months BEFORE the kingdom existed!
            status = 'CONFIRMED_BACKWARD_MIGRANT';
            statusLabel = 'Confirmed Backward Migrant';
            statusBadge = 'border-amber-500/30 text-amber-400 bg-amber-500/10';
            explanation = `Account was created ~${deltaYears > 1 ? `${deltaYears} years` : `${Math.abs(Math.round(deltaDays / 30))} months`} before Kingdom ${cleanKd} opened. This player 100% migrated from an older kingdom.`;
        } else if (Math.abs(deltaDays) <= 60) {
            // Created within ±60 days of kingdom launch
            status = 'NATIVE_OR_JUMPER';
            statusLabel = 'Native / Jumper Cohort';
            statusBadge = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
            explanation = `Account creation closely coincides with Kingdom ${cleanKd}'s founding window (within ±${Math.abs(deltaDays)} days). High probability of native account or Day-1 jumper project.`;
        } else {
            // Created after kingdom existed
            status = 'LATE_STARTER_OR_FORWARD';
            statusLabel = 'Created After Kingdom Founded';
            statusBadge = 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10';
            explanation = `Account was created ~${deltaYears > 1 ? `${deltaYears} years` : `${Math.round(deltaDays / 30)} months`} after Kingdom ${cleanKd} was founded. Either a late character created on an established server or cross-migrated from a younger kingdom.`;
        }

        migrationAnalysis = {
            targetKingdom: cleanKd,
            kdEstimatedLaunchDate: kdLaunchDate.toISOString().split('T')[0],
            kdAgeDays: Math.floor(Math.max(0, CURRENT_EPOCH.getTime() - kdLaunchDate.getTime()) / (1000 * 60 * 60 * 24)),
            deltaDays,
            deltaYears,
            status,
            statusLabel,
            statusBadge,
            explanation,
        };
    }

    // Starting Kingdom Spawn Horizon Estimation
    const K1001_TIME = new Date('2018-09-21T00:00:00Z').getTime();
    const daysSinceK1001 = (estimatedTimestamp - K1001_TIME) / (1000 * 60 * 60 * 24);
    const rawStartingKd = Math.round(1001 + (daysSinceK1001 / 0.9149));
    const estimatedStartingKd = Math.max(1001, rawStartingKd);
    const bracketMin = Math.max(1001, estimatedStartingKd - 15);
    const bracketMax = estimatedStartingKd + 15;
    const continentNumber = Math.max(1, Math.floor((estimatedStartingKd - 1001) / 8) + 1);
    const continentStart = 1001 + (continentNumber - 1) * 8;
    const continentEnd = continentStart + 7;

    const spawnHorizon = {
        estimatedKd: estimatedStartingKd,
        bracketMin,
        bracketMax,
        bracketDisplay: `KD ${bracketMin} – ${bracketMax}`,
        continentNumber,
        continentRange: `KD ${continentStart} – ${continentEnd}`,
    };

    const windowStart = new Date(estimatedTimestamp - 45 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(estimatedTimestamp + 45 * 24 * 60 * 60 * 1000);

    return {
        governorId: cleanId,
        digits,
        estimatedTimestamp,
        estimatedDate: estimatedDate.toISOString().split('T')[0],
        estimatedMonthYear: estimatedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        confidenceWindow: {
            start: windowStart.toISOString().split('T')[0],
            end: windowEnd.toISOString().split('T')[0],
            marginDays: 45,
        },
        ageDays,
        ageYears,
        ageMonths,
        ageFormatted,
        generation,
        bracket,
        spawnHorizon,
        migrationAnalysis,
    };
}

/**
 * Estimates the foundation date of a Kingdom (e.g. KD 1001, KD 3418, KD 4021)
 * Based on launch cadence: ~0.915 days per kingdom from 2018-09-21 (KD 1001) to 2026-04-15 (KD 4021).
 * 
 * @param {number|string} kingdomNumber 
 * @returns {Date}
 */
export function estimateKingdomLaunchDate(kingdomNumber) {
    const kd = parseInt(String(kingdomNumber).replace(/\D/g, ''), 10);
    if (!kd || kd < 1001) return new Date('2018-09-21T00:00:00Z');

    const K1001_DATE = new Date('2018-09-21T00:00:00Z').getTime();
    const DAYS_PER_KD = 0.9149; // calibrated across 3,020 servers over 2,763 days

    const offsetDays = (kd - 1001) * DAYS_PER_KD;
    const launchTimestamp = K1001_DATE + offsetDays * 24 * 60 * 60 * 1000;
    return new Date(launchTimestamp);
}

/**
 * Compares an estimated date against a user-supplied Markswoman recruited date
 * 
 * @param {string|Date} estimatedDate 
 * @param {string} actualDateString - 'YYYY-MM-DD'
 * @returns {object|null}
 */
export function compareWithActualDate(estimatedDate, actualDateString) {
    if (!estimatedDate || !actualDateString) return null;
    const actualTime = new Date(actualDateString).getTime();
    const estTime = new Date(estimatedDate).getTime();
    if (isNaN(actualTime) || isNaN(estTime)) return null;

    const diffMs = estTime - actualTime;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const absDiffDays = Math.abs(diffDays);

    const totalDays = Math.max(1, Math.floor((CURRENT_EPOCH.getTime() - actualTime) / (1000 * 60 * 60 * 24)));
    const accuracyPct = Math.max(0, Number((100 - (absDiffDays / totalDays) * 100).toFixed(1)));

    return {
        diffDays,
        absDiffDays,
        accuracyPct,
        verdict: absDiffDays <= 30 ? 'PINPOINT_EXACT' : absDiffDays <= 75 ? 'HIGH_CONFIDENCE' : 'MODERATE_VARIANCE',
    };
}
