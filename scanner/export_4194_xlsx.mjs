import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";

const TELEMETRY_PATH = "E:\\Unity\\src\\data\\live_kingdom_telemetry.json";

function fmtCmdr(c) {
  if (!c) return "";
  if (typeof c === "string") {
    try {
      c = JSON.parse(c);
    } catch {
      return c === "{}" ? "" : c;
    }
  }
  if (typeof c !== "object") return String(c);
  const id = c.id || "";
  const lv = c.level ? `Lv${c.level}` : "";
  const st = c.star ? `★${c.star}` : "";
  const sk = c.skills ? ` (${c.skills})` : "";
  return id ? `#${id} ${lv} ${st}${sk}`.replace(/\s+/g, " ").trim() : "";
}

function fmtPos(p) {
  if (!p) return "";
  if (typeof p === "string") {
    try {
      p = JSON.parse(p);
    } catch {
      return p === "{}" ? "" : p;
    }
  }
  if (typeof p !== "object") return String(p);
  if (p.X !== undefined && p.Y !== undefined) return `X:${p.X} Y:${p.Y}`;
  return "";
}

function fmtJson(g) {
  if (!g) return "";
  if (typeof g === "string") return g === "{}" || g === "[]" ? "" : g;
  if (Array.isArray(g)) return g.length === 0 ? "" : JSON.stringify(g);
  if (typeof g === "object") return Object.keys(g).length === 0 ? "" : JSON.stringify(g);
  return String(g);
}

function fmtBool(v) {
  if (v === true || v === "true" || v === "TRUE") return "TRUE";
  if (v === false || v === "false" || v === "FALSE") return "FALSE";
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
  const scanStartedIso = prog.startedAt || "2026-10-23T04:15:23Z";
  const scanUpdatedIso = prog.completedAt || prog.updatedAt || new Date().toISOString();
  const scanStartedUtc = toUtcDtg(scanStartedIso);
  const scanCompletedUtc = toUtcDtg(scanUpdatedIso);

  const govList = Object.values(kdObj.governors)
    .map((g) => ({
      ...g,
      id: String(g.id || g.govId || ""),
      govId: Number(g.govId || g.id || 0),
      allianceNumericId: Number(g.allianceNumericId || 0),
      power: Number(g.power || 0),
      highestPower: Number(g.highestPower || 0),
      matchmakingPower: Number(g.matchmakingPower || 0),
      killPoints: Number(g.killPoints || 0),
      totalUnitsKilled: Number(g.totalUnitsKilled || 0),
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
      t1Kp: Number(g.t1Kp || 0),
      t2Kp: Number(g.t2Kp || 0),
      t3Kp: Number(g.t3Kp || 0),
      t4Kp: Number(g.t4Kp || 0),
      t5Kp: Number(g.t5Kp || 0),
      rangedPoints: Number(g.rangedPoints || 0),
      acclaim: Number(g.acclaim || 0),
      victories: Number(g.victories || 0),
      defeats: Number(g.defeats || 0),
      scoutTimes: Number(g.scoutTimes || 0),
      gathered: Number(g.gathered || 0),
      assistance: Number(g.assistance || 0),
      helps: Number(g.helps || 0),
      cityHall: Number(g.cityHall || 0),
      vipLevel: Number(g.vipLevel || 0),
      civId: Number(g.civId || 0),
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
      aooKillStocks: Number(g.aooKillStocks || 0),
      aooHighestScore: Number(g.aooHighestScore || 0),
      kvkMorale: Number(g.kvkMorale || 0),
      mapCityEntityId: Number(g.mapCityEntityId || 0),
      lilithAccountUid: Number(g.lilithAccountUid || 0),
      avatarFrameId: Number(g.avatarFrameId || 0),
      internalServerId: Number(g.internalServerId || 0),
      originServerId: Number(g.originServerId || 0),
      mapServerId: Number(g.mapServerId || 0),
    }))
    .sort((a, b) => b.power - a.power || (b.ralliesLed + b.ralliesJoined) - (a.ralliesLed + a.ralliesJoined));

  govList.forEach((g, idx) => {
    g.rank = idx + 1;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Valheon / Unity Raw Telemetry Engine";
  workbook.created = new Date(scanUpdatedIso);

  // SINGLE SHEET ONLY: "ALL" — strictly raw Lilith telemetry data (no custom derived ratios)
  const wsAll = workbook.addWorksheet("ALL", {
    views: [{ state: "frozen", xSplit: 6, ySplit: 1 }],
  });

  wsAll.columns = [
    { header: "Rank", key: "rank", width: 7 },
    { header: "Scan DTG (UTC)", key: "rowDtgUtc", width: 22 },
    { header: "Scan DTG (Local EDT)", key: "rowDtgEdt", width: 24 },
    { header: "Governor ID", key: "govId", width: 14 },
    { header: "Governor Name", key: "name", width: 24 },
    { header: "Alliance Tag", key: "alliance", width: 13 },
    { header: "Alliance Full Name", key: "allianceName", width: 24 },
    { header: "Alliance Numeric ID", key: "allianceNumericId", width: 18 },
    { header: "Power", key: "power", width: 15 },
    { header: "Highest Power", key: "highestPower", width: 15 },
    { header: "Matchmaking Power (0xcfc63861)", key: "matchmakingPower", width: 26 },
    { header: "Kill Points", key: "killPoints", width: 15 },
    { header: "Dead Troops", key: "dead", width: 14 },
    { header: "Healed Troops", key: "healedTroops", width: 15 },
    { header: "City Hall", key: "cityHall", width: 10 },
    { header: "VIP Level", key: "vipLevel", width: 10 },
    { header: "Civilization", key: "civilization", width: 14 },
    { header: "Civ ID", key: "civId", width: 8 },
    { header: "Troop Power", key: "troopPower", width: 15 },
    { header: "Tech Power", key: "techPower", width: 15 },
    { header: "Building Power", key: "buildingPower", width: 15 },
    { header: "Commander Power", key: "commanderPower", width: 17 },
    { header: "T1 Kills", key: "t1Kills", width: 14 },
    { header: "T2 Kills", key: "t2Kills", width: 14 },
    { header: "T3 Kills", key: "t3Kills", width: 14 },
    { header: "T4 Kills", key: "t4Kills", width: 14 },
    { header: "T5 Kills", key: "t5Kills", width: 14 },
    { header: "T1 KP", key: "t1Kp", width: 14 },
    { header: "T2 KP", key: "t2Kp", width: 14 },
    { header: "T3 KP", key: "t3Kp", width: 14 },
    { header: "T4 KP", key: "t4Kp", width: 15 },
    { header: "T5 KP", key: "t5Kp", width: 15 },
    { header: "Total Units Killed", key: "totalUnitsKilled", width: 17 },
    { header: "Ranged Points", key: "rangedPoints", width: 14 },
    { header: "Acclaim", key: "acclaim", width: 12 },
    { header: "Victories", key: "victories", width: 12 },
    { header: "Defeats", key: "defeats", width: 12 },
    { header: "Scout Times", key: "scoutTimes", width: 13 },
    { header: "Resources Gathered", key: "gathered", width: 18 },
    { header: "Alliance Assistance", key: "assistance", width: 18 },
    { header: "Alliance Helps", key: "helps", width: 14 },
    { header: "KvK Count", key: "kvkCount", width: 11 },
    { header: "KvK Highest KP", key: "kvkHighestKp", width: 16 },
    { header: "KvK Most Kills", key: "kvkMostKills", width: 15 },
    { header: "KvK Most Healed", key: "kvkMostHealed", width: 16 },
    { header: "KvK Most Dead", key: "kvkMostDead", width: 15 },
    { header: "AoO Wins", key: "aooWins", width: 11 },
    { header: "AoO Losses", key: "aooLosses", width: 11 },
    { header: "AoO Leaves", key: "aooLeaves", width: 11 },
    { header: "AoO Kill Stocks", key: "aooKillStocks", width: 15 },
    { header: "AoO Best Score", key: "aooHighestScore", width: 15 },
    { header: "Rallies Led", key: "ralliesLed", width: 12 },
    { header: "Rallies Joined", key: "ralliesJoined", width: 14 },
    { header: "Primary Commander", key: "primaryCmdrStr", width: 22 },
    { header: "Primary Cmdr Awakened", key: "primaryAwakenedStr", width: 20 },
    { header: "Secondary Commander", key: "secondaryCmdrStr", width: 22 },
    { header: "Secondary Cmdr Awakened", key: "secondaryAwakenedStr", width: 22 },
    { header: "Equipped Gear (JSON)", key: "equippedGearStr", width: 24 },
    { header: "Commander Armaments", key: "armamentsStr", width: 24 },
    { header: "KvK Morale", key: "kvkMorale", width: 12 },
    { header: "Titan Legion", key: "titanLegionStr", width: 22 },
    { header: "Castle Pos (Raw Engine X,Y)", key: "castlePosStr", width: 24 },
    { header: "Map City Entity ID", key: "mapCityEntityId", width: 17 },
    { header: "Device UDID", key: "udid", width: 36 },
    { header: "Lilith Account UID", key: "lilithAccountUid", width: 18 },
    { header: "Master Account CId", key: "masterAccountCId", width: 20 },
    { header: "App UID", key: "appUid", width: 16 },
    { header: "Client Platform", key: "clientPlatform", width: 22 },
    { header: "Avatar Upload Date", key: "avatarUploadDate", width: 20 },
    { header: "Avatar Image MD5", key: "avatarImageMd5", width: 34 },
    { header: "Avatar Frame ID", key: "avatarFrameId", width: 15 },
    { header: "Badge Showcase Vector", key: "badgeShowcaseVector", width: 22 },
    { header: "Active Hours (UTC)", key: "activeHoursUtc", width: 22 },
    { header: "Internal Server ID", key: "internalServerId", width: 16 },
    { header: "Origin Server ID", key: "originServerId", width: 16 },
    { header: "Map Server ID", key: "mapServerId", width: 15 },
    { header: "Telemetry Source", key: "telemetrySource", width: 32 },
    { header: "Scan Started (UTC)", key: "scanStartedUtc", width: 22 },
  ];

  for (const g of govList) {
    const gIso = g.scannedAtUtc || scanUpdatedIso;
    wsAll.addRow({
      ...g,
      rowDtgUtc: toUtcDtg(gIso),
      rowDtgEdt: toEdtDtg(gIso),
      scanStartedUtc,
      primaryCmdrStr: fmtCmdr(g.primaryCommander),
      primaryAwakenedStr: fmtBool(g.primaryCmdrAwakened),
      secondaryCmdrStr: fmtCmdr(g.secondaryCommander),
      secondaryAwakenedStr: fmtBool(g.secondaryCmdrAwakened),
      equippedGearStr: fmtJson(g.equippedGear),
      armamentsStr: fmtJson(g.commanderArmaments),
      titanLegionStr: fmtJson(g.titanLegion),
      castlePosStr: fmtPos(g.castlePos),
      udid: g.udid || "",
      masterAccountCId: g.masterAccountCId || "",
      appUid: g.appUid || "",
      clientPlatform: g.clientPlatform || "",
      avatarUploadDate: g.avatarUploadDate || "",
      avatarImageMd5: g.avatarImageMd5 || "",
      badgeShowcaseVector: g.badgeShowcaseVector || "",
      activeHoursUtc: g.activeHoursUtc || "",
    });
  }

  const hdr = wsAll.getRow(1);
  hdr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hdr.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" },
  };
  wsAll.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: govList.length + 1, column: wsAll.columns.length },
  };

  const dtgSlug = scanCompletedUtc.replace(/[:\s]/g, "_").replace("_UTC", "");
  const outPaths = [
    "E:\\Unity\\Kingdom_4194_Live_Telemetry.xlsx",
    "C:\\Users\\laure\\Desktop\\Kingdom_4194_Live_Telemetry.xlsx",
    `C:\\Users\\laure\\Desktop\\Kingdom_4194_Scan_${dtgSlug}_UTC.xlsx`,
  ];

  try {
    const deskDir = "C:\\Users\\laure\\Desktop";
    for (const fn of fs.readdirSync(deskDir)) {
      if (
        fn.startsWith("Kingdom_4194_Scan_") &&
        fn.endsWith("_UTC.xlsx") &&
        fn !== `Kingdom_4194_Scan_${dtgSlug}_UTC.xlsx`
      ) {
        try {
          fs.unlinkSync(path.join(deskDir, fn));
        } catch {}
      }
    }
  } catch {}

  for (const p of outPaths) {
    try {
      await workbook.xlsx.writeFile(p);
      const st = fs.statSync(p);
      console.log(
        `Wrote single-sheet ALL (${govList.length} rows, ${wsAll.columns.length} raw cols) -> ${p} (${st.size} bytes)`
      );
    } catch (err) {
      console.warn(`Could not write ${p}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
