import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unlinkGovernorAccount, linkGovernorAccount, getGovernorStats, getGovernorHistory, getUserConfig } from "@/lib/awsDynamo";
import { readLiveTelemetryCache } from "@/app/api/ingest/kingdom-scan/route";

export const maxDuration = 300;

export async function GET() {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const config = await getUserConfig(session.user.id) || {};
        const govIds = config.governorIds || [];
        const userProfilesMap = config.profiles || {};
        const presence = config.presence || { status: "Active", note: "", requiresPing: false };

        if (govIds.length === 0) {
            return NextResponse.json({ profiles: [], presence, activeKingdom: config.activeKingdom || null }, { status: 200 });
        }

        const liveCache = readLiveTelemetryCache();
        const profiles = [];

        for (const gid of govIds) {
            const cleanGid = String(gid).replace(/\D/g, "");
            const profileTag = userProfilesMap[gid] || userProfilesMap[cleanGid] || "Main";

            // 1. Check live 45-field telemetry cache first for instant O(1) resolution on freshly scanned kingdoms (#4197, #4194)
            const liveGov = liveCache?.governorsById?.[cleanGid] || null;
            const basic = await getGovernorStats(cleanGid).catch(() => null);
            const kd = liveGov?.kingdom || (basic?.lastSeenKingdom && basic.lastSeenKingdom !== "Unknown" ? String(basic.lastSeenKingdom) : null);

            if (!kd) {
                profiles.push({
                    id: cleanGid,
                    kingdom: "???",
                    name: basic?.name || "Awaiting Scan",
                    tag: profileTag,
                    power: 0, killPoints: 0, dead: 0,
                    troopPower: 0, commanderPower: 0, techPower: 0, highestPower: 0, tier: profileTag
                });
                continue;
            }

            if (liveGov) {
                profiles.push({
                    id: cleanGid,
                    kingdom: String(kd),
                    name: liveGov.name || basic?.name || `Governor ${cleanGid}`,
                    tag: profileTag,
                    power: Number(liveGov.power || 0),
                    killPoints: Number(liveGov.killPoints || liveGov.killpoints || 0),
                    dead: Number(liveGov.dead || liveGov.deads || 0),
                    troopPower: Number(liveGov.troopPower || 0),
                    commanderPower: Number(liveGov.commanderPower || 0),
                    techPower: Number(liveGov.techPower || 0),
                    highestPower: Number(liveGov.highestPower || liveGov.power || 0),
                    tier: profileTag,
                });
                continue;
            }

            const history = await getGovernorHistory(kd, cleanGid, 1).catch(() => []);
            if (history && history.length > 0) {
                const latest = history[history.length - 1];
                profiles.push({
                    id: cleanGid,
                    kingdom: String(kd),
                    name: basic?.name || `Governor ${cleanGid}`,
                    tag: profileTag,
                    power: latest.power || 0,
                    killPoints: latest.killPoints || 0,
                    dead: latest.deads || 0,
                    troopPower: Math.max(0, (latest.power || 0) - ((latest.commanderPower || 0) + (latest.techPower || 0) + (latest.buildingPower || 0))),
                    commanderPower: latest.commanderPower || 0,
                    techPower: latest.techPower || 0,
                    highestPower: latest.highestPower || latest.power || 0,
                    tier: profileTag,
                });
            } else {
                profiles.push({
                    id: cleanGid,
                    kingdom: String(kd),
                    name: basic?.name || `Governor ${cleanGid}`,
                    tag: profileTag,
                    power: 0, killPoints: 0, dead: 0,
                    troopPower: 0, commanderPower: 0, techPower: 0, highestPower: 0, tier: profileTag
                });
            }
        }

        return NextResponse.json({ profiles, presence, activeKingdom: config.activeKingdom || null }, { status: 200 });
    } catch (e) {
        console.error("[API] Governor Profile Extraction Failure:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { action, governorId } = body;

        if (action === "unlink") {
            if (!governorId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
            const success = await unlinkGovernorAccount(session.user.id, governorId);
            if (success) {
                return NextResponse.json({ success: true, message: `Profile ${governorId} unlinked gracefully.` });
            }
            return NextResponse.json({ error: "Failed to sever DynamoDB link" }, { status: 500 });
        }

        if (action === "link") {
            const { profileType } = body;
            if (!governorId) return NextResponse.json({ error: "Missing Target Scanner ID" }, { status: 400 });

            const cleanId = String(governorId).replace(/\D/g, '');
            const result = await linkGovernorAccount(session.user.id, cleanId, profileType || "Main");
            if (result) {
                const liveCache = readLiveTelemetryCache();
                const liveGov = liveCache?.governorsById?.[cleanId];
                const detectedKingdom = (typeof result === "object" && result.detectedKingdom) || liveGov?.kingdom || null;
                return NextResponse.json({
                    success: true,
                    detectedKingdom: detectedKingdom ? String(detectedKingdom) : null,
                    message: `Profile ${cleanId} successfully bound${detectedKingdom ? ` (Kingdom #${detectedKingdom})` : ''}.`
                });
            }
            return NextResponse.json({ error: "AWS DynamoDB Binding Failed." }, { status: 500 });
        }

        return NextResponse.json({ error: "Unknown Directive" }, { status: 400 });
    } catch (e) {
        console.error("[API] Governor Card Failure:", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
