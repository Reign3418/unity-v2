import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "BastionControl";

/**
 * Complete Lilith In-Game Alliance Record Log Templates (rt: 101..308)
 */
export const ALLIANCE_LOG_TEMPLATES = {
  101: "{p1} raised {p2} to Rank {p3}.",
  102: "{p1} transferred alliance leadership to {p2}.",
  103: "Alliance gift level raised to {p1}.",
  104: "{p1} used an alliance skill.",
  105: "{p1} built an Alliance Flag {locP2}.",
  106: "{p1} dismantled an Alliance Flag {locP2}.",
  107: "{p1} built a Center Fortress {locP2}.",
  108: "{p1} dismantled a Center Fortress {locP2}.",
  109: "{p1} built an Alliance Fortress {locP2}.",
  110: "{p1} dismantled an Alliance Fortress {locP2}.",
  111: "{p1} appointed {p2} to {post}.",
  112: "{p1} formed a union with {p2}.",
  113: "{p1} dissolved the union with {p2}.",
  114: "{p1} dissolved their union with our coalition {p2}.",
  115: "{p1} repaired an Alliance Flag {locP2}.",
  116: "{p1} repaired an Alliance Fortress {locP2}.",
  117: "{p1} repaired a Center Fortress {locP2}.",
  118: "{p1} upgraded an Alliance Flag {locP2} into an Alliance Outpost.",
  119: "{p1} downgraded an Alliance Outpost {locP2} into an Alliance Flag.",
  120: "{p1} activated a shield for an Alliance Flag {locP2}.",
  121: "{p1} disabled a shield for an Alliance Flag {locP2}.",
  122: "You formed a union with the {p1} Pact.",
  123: "Your union with the {p1} Pact was dissolved.",
  124: "{p1} built a Horse Fort {locP2}.",
  125: "{p1} dismantled a Horse Fort {locP2}.",
  126: "{p1} repaired a Horse Fort {locP2}.",
  127: "{p1} edited {p2}'s member note.",
  201: "{p1} joined the alliance at {p2}'s request.",
  202: "{p1} removed {p2} from the alliance.",
  203: "{p1} accepted {p2}'s request to join the alliance.",
  204: "{p1} left the alliance.",
  205: "{p1} changed {p2}'s rank from {p3} to {p4}.",
  206: "{p1} joined the alliance.",
  207: "{p1} entered the battlefield.",
  208: "{p1} left the battlefield.",
  301: "{p2} attacked our Alliance Flag {locP1}.",
  302: "{p2} attacked our Center Fortress {locP1}.",
  303: "{p2} attacked our Alliance Fortress {locP1}.",
  304: "We started attacking a stronghold {locP2}.",
  305: "We occupied a stronghold {locP2} (final blow: {p3}).",
  306: "{p3} attacked our stronghold {locP2}.",
  307: "Our stronghold {locP2} has been lost (final blow: {p3}).",
  308: "{p2} attacked our Horse Fort {locP1}.",
};

export const ALLIANCE_OFFICER_POSTS = {
  1: "Counselor",
  2: "Warlord",
  3: "Envoy",
  4: "Saint",
  5: "Ironclad General",
  6: "Watchful General",
  7: "Ranger General",
  8: "Heroic General",
  9: "Expedition General",
  10: "Flame General",
  11: "Thunderous General",
  12: "Vanguard General",
};

export const LILITH_PROTOCOL_ERRORS = {
  AsArmoryTaskSetNoPermission:
    "The bot's in-game account needs the COUNSELOR title to post bounties. Ask your R5 to assign Counselor.",
  AsArmoryTaskTypeCountLimit:
    "The alliance already has the maximum active bounties of this type.",
  AsArmoryTaskResCountLimit:
    "Not enough of the reward resource in the alliance armory to post this bounty.",
  AsArmoryTaskSetRewardErr:
    "The reward for this bounty isn't valid. Adjust the amount or type and try again.",
  AsArmoryTaskSetRewardCntErr:
    "The reward per claim is above the game's limit for this objective.",
  AsArmoryTaskSetDateErr:
    "The bounty duration wasn't accepted by the game.",
  AsArmoryTaskInProgress:
    "The game won't cancel this bounty while it's still active.",
  AsArmoryDonateCondErr: "Alliance donation failed.",
  AsArmoryTaskParamErr:
    "The bounty setup was rejected by the game (Max claims must be <= 200).",
  AsArmoryTaskSetLimit:
    "Your alliance has already posted the maximum of 10 bounties today.",
  AsArmoryTaskSetCurrentLimit:
    "Your alliance already has the maximum of 4 bounties running at once.",
  AsArmoryResNotEnough:
    "Not enough of that resource in the alliance armory to fund this bounty.",
  AsAsArmoryNotExists:
    "The bounty no longer exists in the game (already claimed or removed).",
  AsArmoryNotOpen:
    "The Alliance Armory isn't unlocked yet.",
  AsGradeTooLower:
    "The bot's alliance rank is too low or lacks the Counselor title required to promote to R4.",
  AsNumLimit:
    "R4 seats are full and every R4 is currently online.",
  GsRouteErr:
    "Your alliance doesn't have access to the zone where the bot is sitting. Teleport the bot to that zone first.",
};

/**
 * Converts raw Lilith 1/6th sub-tile coordinates ("serverId,rawX,rawY") into Kingdom Map (X, Y)
 */
export function parseSubTileLocation(rawParam) {
  const parts = String(rawParam || "").split(",");
  if (parts.length < 3) return String(rawParam || "").trim();
  const rawX = Number(parts[1]);
  const rawY = Number(parts[2]);
  if (Number.isNaN(rawX) || Number.isNaN(rawY)) return String(rawParam || "").trim();
  const x = Math.floor(rawX / 6 + 0.5);
  const y = Math.floor(rawY / 6 + 0.5);
  return `(X:${x} Y:${y})`;
}

export function classifyAllianceLogCategory(rt) {
  const code = Number(rt);
  if ([206, 201, 203].includes(code)) return "Joined";
  if (code === 204) return "Left";
  if (code === 202) return "Kicked";
  if ([205, 101].includes(code)) return "Rank";
  if (code === 111) return "Title";
  if (code === 102) return "Leadership";
  if ([207, 208].includes(code)) return "Battlefield";
  if (code === 127) return "Note";
  if (code >= 301 && code <= 308) return "War";
  if ((code >= 105 && code <= 126) || code === 103) return "Structure";
  if ([112, 113, 114, 122, 123].includes(code)) return "Union";
  return "Event";
}

export function formatAllianceLogRecord(rec) {
  const rt = Number(rec.rt);
  const template = ALLIANCE_LOG_TEMPLATES[rt];
  const category = classifyAllianceLogCategory(rt);
  const resolveToken = (token) => {
    switch (token) {
      case "p1":
        return rec.p1 || "";
      case "p2":
        return rec.p2 || "";
      case "p3":
        return rec.p3 || "";
      case "p4":
        return rec.p4 || "";
      case "post":
        return ALLIANCE_OFFICER_POSTS[Number(rec.p3)] || rec.p3 || "";
      case "locP1":
        return parseSubTileLocation(rec.p1);
      case "locP2":
        return parseSubTileLocation(rec.p2);
      default:
        return "";
    }
  };

  const formattedText = template
    ? template.replace(/\{([a-zA-Z0-9]+)\}/g, (_, key) => resolveToken(key))
    : [rec.p1, rec.p2, rec.p3, rec.p4].filter(Boolean).join(" · ") || `Alliance event (${rt})`;

  return {
    record_id: rec.record_id || `${rec.ti || Date.now()}-${rt}`,
    timestamp: rec.ti || Math.floor(Date.now() / 1000),
    rt,
    category,
    text: formattedText,
    raw: { p1: rec.p1, p2: rec.p2, p3: rec.p3, p4: rec.p4 },
  };
}

const DEFAULT_R4_AUTOMATION_STATE = {
  flagBuildingAutoKick: {
    enabled: true,
    creditCap: 20000,
    maxBuildMinutes: 0,
    description: "Automatically sends builders home once they hit 20,000 daily build credits so other members can enter.",
  },
  resourcePitAutoBuilder: {
    enabled: true,
    mode: "rotation", // "single" | "rotation"
    singleType: "food",
    rotation: ["food", "wood", "stone", "gold"],
    seedSpot: { x: 612, y: 584 },
    maxTroopsWhileBuilding: 0,
    postAllianceMarker: true,
    markerIconId: 5, // 1=Attack, 2=Defense, 3=Sun, 4=Moon, 5=Star, 6=Diamond, 7=Triangle, 8=Clover, 9=Paw, 10=Cross
    markerText: "Alliance Granary — Gather Now",
  },
  fortRallyEnforcer: {
    enabled: true,
    maxMembers: 4, // 2, 3, or 4 to maximize alliance gift chests
    enforceTroopType: true,
    scope: "coalition", // "alliance" | "coalition"
    minTroops: 100000,
    maxArrivalMinutes: 5,
    formula: { launched: 4, joined: 1 },
  },
  allianceDoorPasslist: {
    gatekeeperEnabled: true,
    autoAssignPresetRank: true,
    allowR4MeCommand: true,
    downgradeUnauthorizedRankTo: "r1",
  },
  armoryBountyScheduler: {
    enabled: true,
    dailyMaxBounties: 10,
    concurrentMaxBounties: 4,
    maxClaimsPerTask: 200,
  },
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kd = searchParams.get("kd") || "3649";

    let savedState = null;
    try {
      const res = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { pk: `ALLIANCE_OPS_${kd}`, sk: "CONFIG" },
        })
      );
      savedState = res.Item || null;
    } catch {
      // Fallback to default state if DynamoDB is unreachable locally
    }

    return NextResponse.json({
      ok: true,
      kd,
      automation: savedState?.automation || DEFAULT_R4_AUTOMATION_STATE,
      recentLogs: savedState?.recentLogs || [
        formatAllianceLogRecord({
          record_id: "1001",
          ti: Math.floor(Date.now() / 1000) - 180,
          rt: 105,
          p1: "Valheon R4 Bot",
          p2: "3649,3672,3504",
        }),
        formatAllianceLogRecord({
          record_id: "1002",
          ti: Math.floor(Date.now() / 1000) - 90,
          rt: 111,
          p1: "Reign3418",
          p2: "Valheon R4 Bot",
          p3: "1",
        }),
        formatAllianceLogRecord({
          record_id: "1003",
          ti: Math.floor(Date.now() / 1000) - 30,
          rt: 301,
          p1: "10001,4320,4110",
          p2: "Enemy March",
        }),
      ],
      protocolCatalog: {
        recordTypesCount: Object.keys(ALLIANCE_LOG_TEMPLATES).length,
        officerPosts: ALLIANCE_OFFICER_POSTS,
        errorTranslations: LILITH_PROTOCOL_ERRORS,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load Alliance Ops" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const kd = String(body.kd || "3649");
    const action = String(body.action || "update_automation");

    if (action === "parse_logs" && Array.isArray(body.records)) {
      const parsed = body.records.map(formatAllianceLogRecord);
      return NextResponse.json({
        ok: true,
        kd,
        count: parsed.length,
        records: parsed,
      });
    }

    if (action === "update_automation") {
      const updatedAutomation = {
        ...DEFAULT_R4_AUTOMATION_STATE,
        ...(body.automation || {}),
      };
      try {
        await docClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              pk: `ALLIANCE_OPS_${kd}`,
              sk: "CONFIG",
              kd,
              automation: updatedAutomation,
              updatedAt: new Date().toISOString(),
            },
          })
        );
      } catch {
        // Non-fatal in local offline mode
      }
      return NextResponse.json({
        ok: true,
        kd,
        automation: updatedAutomation,
      });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process Alliance Ops request" },
      { status: 500 }
    );
  }
}
