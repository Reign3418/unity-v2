/**
 * VALHEON NEXUS — 60fps WebWorker DKP Recalculation Engine
 *
 * Offloads multi-hundred governor DKP weight recalculation, goal percentage
 * computation, and leaderboard sorting to a background browser WebWorker thread
 * so leadership can drag formula sliders at 60fps with zero UI frame drops.
 */

const WORKER_SCRIPT = `
self.onmessage = function(e) {
  const { roster, weights, requestId } = e.data;
  const startTime = performance.now();

  const t4Weight = Number(weights?.t4Weight ?? 4);
  const t5Weight = Number(weights?.t5Weight ?? 10);
  const deadWeight = Number(weights?.deadWeight ?? 30);
  const honorWeight = Number(weights?.honorWeight ?? 5);
  const goalMultiplier = Number(weights?.goalMultiplier ?? 12);

  const computed = (roster || []).map((g, idx) => {
    const power = Number(g.power ?? g.Power ?? 0) || 0;
    const kp = Number(g.killPoints ?? g.kp ?? 0) || 0;
    const deads = Number(g.deads ?? g.deadTroops ?? 0) || 0;
    const t4 = Number(g.t4Kills ?? g.t4 ?? 0) || Math.round((kp * 0.35) / 10);
    const t5 = Number(g.t5Kills ?? g.t5 ?? 0) || Math.round((kp * 0.55) / 20);
    const honor = Number(g.honor ?? g.honorPoints ?? 0) || Math.round(power * 0.0025);

    const t4Pts = t4 * t4Weight;
    const t5Pts = t5 * t5Weight;
    const deadPts = deads * deadWeight;
    const honorPts = honor * honorWeight;
    const totalDkp = Math.round(t4Pts + t5Pts + deadPts + honorPts);

    const dkpGoal = Math.max(5000000, Math.round(power * goalMultiplier));
    const goalPct = dkpGoal > 0 ? Number(((totalDkp / dkpGoal) * 100).toFixed(1)) : 0;

    return {
      ...g,
      power,
      t4,
      t5,
      deads,
      honor,
      t4Pts: Math.round(t4Pts),
      t5Pts: Math.round(t5Pts),
      deadPts: Math.round(deadPts),
      honorPts: Math.round(honorPts),
      totalDkp,
      dkpGoal,
      goalPct,
      powerRank: idx + 1
    };
  });

  computed.sort((a, b) => b.totalDkp - a.totalDkp);

  let totalKingdomDkp = 0;
  let metGoalCount = 0;

  const ranked = computed.map((g, idx) => {
    const dkpRank = idx + 1;
    const rankDelta = (g.powerRank || dkpRank) - dkpRank;
    totalKingdomDkp += g.totalDkp;
    if (g.goalPct >= 100) metGoalCount++;
    return {
      ...g,
      dkpRank,
      rankDelta
    };
  });

  const elapsedMs = Number((performance.now() - startTime).toFixed(2));

  self.postMessage({
    requestId,
    ranked,
    summary: {
      totalGovernors: ranked.length,
      totalKingdomDkp,
      metGoalCount,
      compliancePct: ranked.length > 0 ? Math.round((metGoalCount / ranked.length) * 100) : 0,
      elapsedMs
    }
  });
};
`;

/**
 * Synchronous fallback calculation (for SSR or browsers with strict CSP blocking Blob Workers)
 */
export function calculateDkpSync(roster = [], weights = {}) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : 0;
  const t4Weight = Number(weights?.t4Weight ?? 4);
  const t5Weight = Number(weights?.t5Weight ?? 10);
  const deadWeight = Number(weights?.deadWeight ?? 30);
  const honorWeight = Number(weights?.honorWeight ?? 5);
  const goalMultiplier = Number(weights?.goalMultiplier ?? 12);

  const sortedByPower = [...(roster || [])].sort(
    (a, b) => (Number(b.power ?? 0) || 0) - (Number(a.power ?? 0) || 0)
  );

  const computed = sortedByPower.map((g, idx) => {
    const power = Number(g.power ?? g.Power ?? 0) || 0;
    const kp = Number(g.killPoints ?? g.kp ?? 0) || 0;
    const deads = Number(g.deads ?? g.deadTroops ?? 0) || 0;
    const t4 = Number(g.t4Kills ?? g.t4 ?? 0) || Math.round((kp * 0.35) / 10);
    const t5 = Number(g.t5Kills ?? g.t5 ?? 0) || Math.round((kp * 0.55) / 20);
    const honor = Number(g.honor ?? g.honorPoints ?? 0) || Math.round(power * 0.0025);

    const t4Pts = t4 * t4Weight;
    const t5Pts = t5 * t5Weight;
    const deadPts = deads * deadWeight;
    const honorPts = honor * honorWeight;
    const totalDkp = Math.round(t4Pts + t5Pts + deadPts + honorPts);

    const dkpGoal = Math.max(5_000_000, Math.round(power * goalMultiplier));
    const goalPct = dkpGoal > 0 ? Number(((totalDkp / dkpGoal) * 100).toFixed(1)) : 0;

    return {
      ...g,
      power,
      t4,
      t5,
      deads,
      honor,
      t4Pts: Math.round(t4Pts),
      t5Pts: Math.round(t5Pts),
      deadPts: Math.round(deadPts),
      honorPts: Math.round(honorPts),
      totalDkp,
      dkpGoal,
      goalPct,
      powerRank: idx + 1,
    };
  });

  computed.sort((a, b) => b.totalDkp - a.totalDkp);

  let totalKingdomDkp = 0;
  let metGoalCount = 0;

  const ranked = computed.map((g, idx) => {
    const dkpRank = idx + 1;
    const rankDelta = (g.powerRank || dkpRank) - dkpRank;
    totalKingdomDkp += g.totalDkp;
    if (g.goalPct >= 100) metGoalCount++;
    return {
      ...g,
      dkpRank,
      rankDelta,
    };
  });

  const elapsedMs =
    typeof performance !== 'undefined'
      ? Number((performance.now() - startTime).toFixed(2))
      : 0.1;

  return {
    ranked,
    summary: {
      totalGovernors: ranked.length,
      totalKingdomDkp,
      metGoalCount,
      compliancePct:
        ranked.length > 0 ? Math.round((metGoalCount / ranked.length) * 100) : 0,
      elapsedMs,
    },
  };
}

/**
 * Creates a live browser WebWorker instance for 60fps DKP recalculation.
 */
export function createDkpWorker() {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  try {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    return {
      worker,
      terminate: () => {
        worker.terminate();
        URL.revokeObjectURL(url);
      },
    };
  } catch {
    return null;
  }
}
