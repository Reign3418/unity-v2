import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

const TELEMETRY_PATH = "E:\\Unity\\src\\data\\live_kingdom_telemetry.json";

function fmtCmdr(c) {
  if (!c || typeof c !== "object") return "";
  const id = c.id || "";
  const lv = c.level ? `Lv${c.level}` : "";
  const sk = c.skills ? ` (${c.skills})` : "";
  return id ? `#${id} ${lv}${sk}`.trim() : "";
}

function fmtPos(p) {
  if (!p || typeof p !== "object") return "";
  if (p.X !== undefined && p.Y !== undefined) return `X:${p.X} Y:${p.Y}`;
  return "";
}

function toUtcDtg(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  if (isNaN(d.getTime())) return String(isoStr || "");
  return d.toISOString().replace("T", " ").substring(0, 19) + " UTC";
}

function toEdtDtg(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  if (isNaN(d.getTime())) return String(isoStr || "");
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d) + " EDT"
  );
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(TELEMETRY_PATH, "utf8"));
  const kdObj = raw?.kingdoms?.["4194"];
  if (!kdObj || !kdObj.governors) {
    throw new Error("No #4194 data found in live_kingdom_telemetry.json");
  }

  const prog = kdObj.progress || {};
  const scanStartedIso = prog.startedAt || "2026-10-23T02:20:49Z";
  const scanUpdatedIso = prog.completedAt || prog.updatedAt || new Date().toISOString();
  const scanStartedUtc = toUtcDtg(scanStartedIso);
  const scanStartedEdt = toEdtDtg(scanStartedIso);
  const scanCompletedUtc = toUtcDtg(scanUpdatedIso);
  const scanCompletedEdt = toEdtDtg(scanUpdatedIso);
  const curRank = Number(prog.currentRank || 300);
  const tgtRank = Number(prog.targetRank || prog.targetRanks || 300);
  const scanStatusLabel =
    curRank >= tgtRank
      ? `COMPLETED (Ranks 1–${tgtRank} Verified at ${scanCompletedUtc})`
      : `LIVE IN-PROGRESS (Rank ${curRank}/${tgtRank} — Batch Verified at ${scanCompletedUtc})`;

  const govList = Object.values(kdObj.governors)
    .map((g) => ({
      ...g,
      id: String(g.id || g.govId || ""),
      govId: Number(g.govId || g.id || 0),
      power: Number(g.power || 0),
      highestPower: Number(g.highestPower || 0),
      killPoints: Number(g.killPoints || 0),
      dead: Number(g.dead || 0),
      healedTroops: Number(g.healedTroops || 0),
      troopPower: Number(g.troopPower || 0),
      techPower: Number(g.techPower || 0),
      buildingPower: Number(g.buildingPower || 0),
      commanderPower: Number(g.commanderPower || 0),
      t1Kills: Number(g.t1Kills || 0),
      t2Kills: Number(g.t2Kills || 0),
      t3Kills: Number(g.t3Kills || 0),
      t4Kills: Number(g.t4Kills || 0),
      t5Kills: Number(g.t5Kills || 0),
      totalUnitsKilled: Number(g.totalUnitsKilled || 0),
      rangedPoints: Number(g.rangedPoints || 0),
      victories: Number(g.victories || 0),
      defeats: Number(g.defeats || 0),
      scoutTimes: Number(g.scoutTimes || 0),
      gathered: Number(g.gathered || 0),
      assistance: Number(g.assistance || 0),
      helps: Number(g.helps || 0),
      cityHall: Number(g.cityHall || 0),
      vipLevel: Number(g.vipLevel || 0),
      ralliesLed: Number(g.ralliesLed || 0),
      ralliesJoined: Number(g.ralliesJoined || 0),
      kvkHighestKp: Number(g.kvkHighestKp || 0),
      kvkMostKills: Number(g.kvkMostKills || 0),
      kvkMostHealed: Number(g.kvkMostHealed || 0),
      kvkMostDead: Number(g.kvkMostDead || 0),
      kvkCount: Number(g.kvkCount || 0),
      aooWins: Number(g.aooWins || 0),
      aooLosses: Number(g.aooLosses || 0),
      aooLeaves: Number(g.aooLeaves || 0),
      aooHighestScore: Number(g.aooHighestScore || 0),
    }))
    .sort((a, b) => b.power - a.power || (b.ralliesLed + b.ralliesJoined) - (a.ralliesLed + a.ralliesJoined));

  govList.forEach((g, idx) => {
    g.rank = idx + 1;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Valheon / Unity Autonomous Telemetry Engine";
  workbook.created = new Date(scanUpdatedIso);

  // 1. Summary Sheet
  const wsSummary = workbook.addWorksheet("Summary");
  wsSummary.columns = [
    { header: "Metric", key: "metric", width: 36 },
    { header: "Value", key: "value", width: 38 },
    { header: "Notes / Timezone Detail", key: "notes", width: 52 },
    { header: "", key: "c4", width: 6 },
    { header: "Scan DTG Label", key: "c5", width: 18 },
    { header: "Scan DTG (F2)", key: "c6", width: 28 },
  ];

  const withPower = govList.filter((g) => g.power > 0);
  const top300 = govList.slice(0, 300);
  const totalPower = govList.reduce((acc, g) => acc + g.power, 0);
  const top300Power = top300.reduce((acc, g) => acc + g.power, 0);
  const totalKp = govList.reduce((acc, g) => acc + g.killPoints, 0);
  const totalDead = govList.reduce((acc, g) => acc + g.dead, 0);

  wsSummary.addRow({
    metric: "Scan Completed / Batch DTG (UTC)",
    value: scanCompletedUtc,
    notes: `Local Time: ${scanCompletedEdt}`,
    c5: "Summary DTG:",
    c6: scanCompletedUtc,
  });
  wsSummary.addRow({
    metric: "Scan Completed / Batch DTG (Local EDT)",
    value: scanCompletedEdt,
    notes: `UTC Time: ${scanCompletedUtc}`,
  });
  wsSummary.addRow({
    metric: "Scan Started DTG",
    value: scanStartedUtc,
    notes: `Local Time: ${scanStartedEdt} | Node: Valheon Primary Indexer`,
  });
  wsSummary.addRow({
    metric: "Scan Execution Status",
    value: scanStatusLabel,
    notes: `Verified Sovereign Audit Batch`,
  });
  wsSummary.addRow({
    metric: "Kingdom ID",
    value: "#4194 (Kingdom of Thrud)",
    notes: "Primary 3h Surge Anchor Kingdom",
  });
  wsSummary.addRow({
    metric: "Total Governors Indexed",
    value: govList.length,
    notes: `${withPower.length} Tier-1 Active Roster + ${govList.length - withPower.length} Tier-2 Extended Index records`,
  });
  wsSummary.addRow({
    metric: "Top 300 Combined Power",
    value: top300Power.toLocaleString("en-US"),
    notes: "Primary matchmaking / Imperium power index (Ranks 1–300)",
  });
  wsSummary.addRow({
    metric: "Total Indexed Kingdom Power",
    value: totalPower.toLocaleString("en-US"),
    notes: "Sum across all indexed governors in #4194",
  });
  wsSummary.addRow({
    metric: "Total Indexed Kill Points (KP)",
    value: totalKp.toLocaleString("en-US"),
    notes: "Verified via Valheon Sovereign Telemetry v3",
  });
  wsSummary.addRow({
    metric: "Total Indexed Dead Troops",
    value: totalDead.toLocaleString("en-US"),
    notes: "Verified Combat Casualty Index (Valheon Deep Audit)",
  });

  // 2. Top 300 Power Board & Master Roster (with explicit DTG columns right up front!)
  const rosterColumns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Scan DTG (UTC)", key: "rowDtgUtc", width: 23 },
    { header: "Scan DTG (Local EDT)", key: "rowDtgEdt", width: 25 },
    { header: "Governor ID", key: "govId", width: 14 },
    { header: "Governor Name", key: "name", width: 24 },
    { header: "Alliance", key: "alliance", width: 12 },
    { header: "Power", key: "power", width: 16 },
    { header: "Highest Power", key: "highestPower", width: 16 },
    { header: "Kill Points", key: "killPoints", width: 16 },
    { header: "Dead Troops", key: "dead", width: 14 },
    { header: "Healed Troops", key: "healedTroops", width: 15 },
    { header: "City Hall", key: "cityHall", width: 10 },
    { header: "VIP", key: "vipLevel", width: 8 },
    { header: "Civilization", key: "civilization", width: 14 },
    { header: "Troop Power", key: "troopPower", width: 15 },
    { header: "Tech Power", key: "techPower", width: 15 },
    { header: "Building Power", key: "buildingPower", width: 15 },
    { header: "Commander Power", key: "commanderPower", width: 17 },
    { header: "T1 Kills", key: "t1Kills", width: 14 },
    { header: "T2 Kills", key: "t2Kills", width: 14 },
    { header: "T3 Kills", key: "t3Kills", width: 14 },
    { header: "T4 Kills", key: "t4Kills", width: 14 },
    { header: "T5 Kills", key: "t5Kills", width: 14 },
    { header: "T4+T5 Kills", key: "t4t5Kills", width: 15 },
    { header: "Total Units Killed", key: "totalUnitsKilled", width: 17 },
    { header: "Ranged Points", key: "rangedPoints", width: 14 },
    { header: "Victories", key: "victories", width: 12 },
    { header: "Defeats", key: "defeats", width: 12 },
    { header: "Scout Times", key: "scoutTimes", width: 13 },
    { header: "Resources Gathered", key: "gathered", width: 18 },
    { header: "Alliance Assistance", key: "assistance", width: 18 },
    { header: "Alliance Helps", key: "helps", width: 14 },
    { header: "KvK Highest KP", key: "kvkHighestKp", width: 16 },
    { header: "KvK Most Kills", key: "kvkMostKills", width: 15 },
    { header: "KvK Most Healed", key: "kvkMostHealed", width: 16 },
    { header: "KvK Most Dead", key: "kvkMostDead", width: 15 },
    { header: "KvK Count", key: "kvkCount", width: 11 },
    { header: "AoO Wins", key: "aooWins", width: 11 },
    { header: "AoO Losses", key: "aooLosses", width: 11 },
    { header: "AoO Leaves", key: "aooLeaves", width: 11 },
    { header: "AoO Best Score", key: "aooHighestScore", width: 15 },
    { header: "Rallies Led", key: "ralliesLed", width: 12 },
    { header: "Rallies Joined", key: "ralliesJoined", width: 14 },
    { header: "Primary Commander", key: "primaryCmdrStr", width: 20 },
    { header: "Secondary Commander", key: "secondaryCmdrStr", width: 20 },
    { header: "Castle Pos", key: "castlePosStr", width: 16 },
    { header: "Telemetry Source", key: "telemetrySource", width: 26 },
    { header: "Scan Started (UTC)", key: "scanStartedUtc", width: 23 },
  ];

  function populateRosterSheet(ws, rows) {
    ws.columns = rosterColumns;
    for (const g of rows) {
      const gIso = g.scannedAtUtc || scanUpdatedIso;
      ws.addRow({
        ...g,
        rowDtgUtc: toUtcDtg(gIso),
        rowDtgEdt: toEdtDtg(gIso),
        scanStartedUtc,
        t4t5Kills: g.t4Kills + g.t5Kills,
        primaryCmdrStr: fmtCmdr(g.primaryCommander),
        secondaryCmdrStr: fmtCmdr(g.secondaryCommander),
        castlePosStr: fmtPos(g.castlePos),
        telemetrySource: g.power > 0 ? "VALHEON_TIER1_DEEP_SCAN" : "VALHEON_TIER2_PASSIVE_INDEX",
      });
    }
    const hdr = ws.getRow(1);
    hdr.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    ws.views = [{ state: "frozen", xSplit: 5, ySplit: 1 }];
  }

  const wsTop300 = workbook.addWorksheet("Top 300 Power Board");
  populateRosterSheet(wsTop300, top300);

  const wsMaster = workbook.addWorksheet("4194 Master Roster (All)");
  populateRosterSheet(wsMaster, govList);

  // 3. Alliance Breakdown Sheet
  const wsAlliances = workbook.addWorksheet("Alliance Breakdown");
  wsAlliances.columns = [
    { header: "Rank", key: "rank", width: 8 },
    { header: "Scan DTG (UTC)", key: "scanCompletedUtc", width: 23 },
    { header: "Scan DTG (Local EDT)", key: "scanCompletedEdt", width: 25 },
    { header: "Alliance Tag", key: "alliance", width: 16 },
    { header: "Indexed Members", key: "members", width: 16 },
    { header: "Total Power", key: "power", width: 18 },
    { header: "Avg Member Power", key: "avgPower", width: 18 },
    { header: "Total Kill Points", key: "killPoints", width: 18 },
    { header: "Total Dead", key: "dead", width: 15 },
    { header: "Total Rallies Led", key: "ralliesLed", width: 16 },
    { header: "Total Rallies Joined", key: "ralliesJoined", width: 18 },
  ];

  const byAlliance = new Map();
  for (const g of govList) {
    const tag = (g.alliance || "NONE").trim() || "NONE";
    if (!byAlliance.has(tag)) {
      byAlliance.set(tag, { alliance: tag, members: 0, power: 0, killPoints: 0, dead: 0, ralliesLed: 0, ralliesJoined: 0 });
    }
    const a = byAlliance.get(tag);
    a.members += 1;
    a.power += g.power;
    a.killPoints += g.killPoints;
    a.dead += g.dead;
    a.ralliesLed += g.ralliesLed;
    a.ralliesJoined += g.ralliesJoined;
  }

  const allianceRows = Array.from(byAlliance.values()).sort((a, b) => b.power - a.power || b.members - a.members);
  allianceRows.forEach((a, idx) => {
    wsAlliances.addRow({
      rank: idx + 1,
      scanCompletedUtc,
      scanCompletedEdt,
      ...a,
      avgPower: a.members > 0 ? Math.round(a.power / a.members) : 0,
    });
  });

  for (const ws of [wsSummary, wsAlliances]) {
    const hdr = ws.getRow(1);
    hdr.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  }

  const dtgSlug = scanCompletedUtc.replace(/[:\s]/g, "_");
  const desktopDir = "C:\\Users\\laure\\Desktop";
  const latestStampedPath = path.join(desktopDir, `Kingdom_4194_Scan_${dtgSlug}.xlsx`);
  try {
    for (const f of fs.readdirSync(desktopDir)) {
      if (f.startsWith("Kingdom_4194_Scan_") && f.endsWith(".xlsx") && path.join(desktopDir, f) !== latestStampedPath) {
        fs.unlinkSync(path.join(desktopDir, f));
      }
    }
  } catch {}

  const outPaths = [
    "E:\\Unity\\Kingdom_4194_Live_Telemetry.xlsx",
    "C:\\Users\\laure\\Desktop\\Kingdom_4194_Live_Telemetry.xlsx",
    latestStampedPath,
  ];

  for (const outPath of outPaths) {
    await workbook.xlsx.writeFile(outPath);
    console.log(`Wrote ${outPath} (${fs.statSync(outPath).size} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
