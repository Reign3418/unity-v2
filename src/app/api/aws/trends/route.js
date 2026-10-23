import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomTrends, getKingdomMetadata, getGlobalConfig } from "@/lib/awsDynamo";
import { readLiveTelemetryCache } from "@/app/api/ingest/kingdom-scan/route";

export const dynamic = "force-dynamic";

function buildTrendFromLocalCache(kdObj, fallbackUpdatedAt) {
  const govs = Object.values(kdObj.governors || {}).sort(
    (a, b) => (Number(b.power) || 0) - (Number(a.power) || 0)
  );
  const summaryData = {
    scanType: "Full",
    totalPower: 0,
    totalKP: 0,
    totalDeads: 0,
    activeGovernors: 0,
    alliances: {},
    topSlices: {
      "100": { power: 0, kp: 0, deads: 0, elements: 0 },
      "300": { power: 0, kp: 0, deads: 0, elements: 0 },
      "400": { power: 0, kp: 0, deads: 0, elements: 0 },
      "650": { power: 0, kp: 0, deads: 0, elements: 0 },
      "1000": { power: 0, kp: 0, deads: 0, elements: 0 },
    },
  };

  govs.forEach((p, index) => {
    const power = Number(p.power) || 0;
    const kp = Number(p.killPoints) || 0;
    const deads = Number(p.dead) || 0;
    const tag = p.alliance || "None";

    summaryData.totalPower += power;
    summaryData.totalKP += kp;
    summaryData.totalDeads += deads;
    if (power > 0) summaryData.activeGovernors += 1;

    summaryData.alliances[tag] = (summaryData.alliances[tag] || 0) + power;

    [100, 300, 400, 650, 1000].forEach((limit) => {
      if (index < limit) {
        summaryData.topSlices[String(limit)].power += power;
        summaryData.topSlices[String(limit)].kp += kp;
        summaryData.topSlices[String(limit)].deads += deads;
        if (power > 0) summaryData.topSlices[String(limit)].elements += 1;
      }
    });
  });

  const isoDate = kdObj.progress?.updatedAt || fallbackUpdatedAt || new Date().toISOString();
  return {
    scanDate: isoDate,
    rowCount: govs.length,
    summary: summaryData,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get("kd");

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing 'kd' (Kingdom ID) parameter." }, { status: 400 });
    }

    const cache = readLiveTelemetryCache();
    const localKd = cache?.kingdoms?.[String(kingdomId)];
    const mergedGovs = { ...(localKd?.governors || {}) };
    if (kingdomId !== 'GLOBAL') {
      try {
        const rawOverlay = await getGlobalConfig(LIVE_TELEMETRY_OVERLAY_).catch(() => null);
        if (rawOverlay) {
          const parsedOverlay = JSON.parse(rawOverlay);
          for (const [gid, g] of Object.entries(parsedOverlay)) {
            if (g && typeof g === 'object') {
              const al = String(g.alliance || '');
              if (String(kingdomId) === '4197' && /94|Lova|TDF_|VALH|GoD|LW=A|tcHo/.test(al)) continue;
              mergedGovs[gid] = { ...(mergedGovs[gid] || {}), ...g };
            }
          }
        }
      } catch {}
    }
    if (Object.keys(mergedGovs).length > 0) {
      let trendsData = [];
      let metadata = null;
      try {
        trendsData = await getKingdomTrends(kingdomId);
        metadata = await getKingdomMetadata(kingdomId);
      } catch {}
      const liveTrend = buildTrendFromLocalCache({ ...(localKd || {}), governors: mergedGovs }, cache.updatedAt);
      if (!trendsData || trendsData.length === 0) {
        trendsData = [liveTrend];
      } else {
        trendsData = [...trendsData, liveTrend];
      }
      return NextResponse.json({ trends: trendsData, metadata }, { status: 200 });
    }

    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    if (!session.user.isSuperAdmin && kingdomId !== "GLOBAL" && !session.user.allowedKingdoms?.includes(kingdomId)) {
      return NextResponse.json(
        { error: "Access Denied. You cannot synthesize data for Kingdoms outside your active perimeter." },
        { status: 403 }
      );
    }

    let trendsData = [];
    let metadata = null;

    if (kingdomId === "GLOBAL") {
      const allowed = session.user.allowedKingdoms || [];
      const allTrendsMap = {};

      for (const kd of allowed) {
        const kdTrends = await getKingdomTrends(kd);
        kdTrends.forEach((t) => {
          let dayKey = t.scanDate;
          if (t.scanDate && t.scanDate.includes("_")) {
            dayKey = t.scanDate.split("_")[0];
          }

          if (!allTrendsMap[dayKey]) {
            allTrendsMap[dayKey] = {
              scanDate: t.scanDate,
              rowCount: 0,
              summary: { totalPower: 0, activeGovernors: 0, totalKP: 0, alliances: {} },
            };
          }

          allTrendsMap[dayKey].rowCount += t.rowCount;
          if (t.summary) {
            allTrendsMap[dayKey].summary.totalPower += t.summary.totalPower || 0;
            allTrendsMap[dayKey].summary.activeGovernors += t.summary.activeGovernors || 0;
            allTrendsMap[dayKey].summary.totalKP += t.summary.totalKP || 0;

            if (t.summary.alliances) {
              for (const [tag, power] of Object.entries(t.summary.alliances)) {
                const globalTag = tag === "None" ? `[${kd}] Unallied` : `[${kd}] ${tag}`;
                allTrendsMap[dayKey].summary.alliances[globalTag] =
                  (allTrendsMap[dayKey].summary.alliances[globalTag] || 0) + power;
              }
            }
          }
        });
      }
      trendsData = Object.values(allTrendsMap).sort((a, b) => {
        const dateA = new Date((a.scanDate || "").split("T")[0].split("_")[0]);
        const dateB = new Date((b.scanDate || "").split("T")[0].split("_")[0]);
        return dateA - dateB;
      });
    } else {
      trendsData = await getKingdomTrends(kingdomId);
      metadata = await getKingdomMetadata(kingdomId);
    }

    return NextResponse.json({ trends: trendsData, metadata }, { status: 200 });
  } catch (error) {
    console.error("[API/AWS/Trends] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling AWS Kingdom Trends." }, { status: 500 });
  }
}
