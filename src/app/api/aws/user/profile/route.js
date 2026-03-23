import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unlinkGovernorAccount, linkGovernorAccount, getGovernorStats, getGovernorHistory, getUserConfig } from "@/lib/awsDynamo";

export async function GET(req) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Retrieve config natively from AWS DynamoDB to prevent stale JWT session tokens from swallowing Presence updates
        const config = await getUserConfig(session.user.id) || {};
        const govIds = config.governorIds || [];
        const userProfilesMap = config.profiles || {};
        const presence = config.presence || { status: "Active", note: "", requiresPing: false };

        if (govIds.length === 0) {
            return NextResponse.json({ profiles: [], presence }, { status: 200 });
        }

        const profiles = [];
        
        for (const gid of govIds) {
            const profileTag = userProfilesMap[gid] || "Unknown";

            // Ensure we know what KD they are actually in natively to pull full stats
            const basic = await getGovernorStats(gid);
            if (!basic || !basic.lastSeenKingdom) {
                // Return a Ghost Card so they can at least see it and unlink it
                profiles.push({
                    id: String(gid),
                    kingdom: "???",
                    name: "Awaiting Scan",
                    tag: profileTag,
                    power: 0, killPoints: 0, dead: 0, 
                    troopPower: 0, commanderPower: 0, techPower: 0, highestPower: 0, tier: profileTag
                 });
                continue;
            }

            const kd = basic.lastSeenKingdom;
            const history = await getGovernorHistory(kd, gid, 1);
            
            if (history && history.length > 0) {
                const latest = history[history.length - 1]; // reverse returns oldest to newest usually, wait getGovernorHistory returns history.reverse()
                profiles.push({
                    id: String(gid),
                    kingdom: kd,
                    name: basic.name,
                    tag: profileTag,
                    power: latest.power || 0,
                    killPoints: latest.killPoints || 0,
                    dead: latest.deads || 0,
                    troopPower: latest.power - (latest.commanderPower + latest.techPower + latest.buildingPower), // Approximate
                    commanderPower: latest.commanderPower || 0,
                    techPower: latest.techPower || 0,
                    highestPower: 0, // Mock for now unless tracked specifically
                    tier: profileTag, 
                });
            } else {
                 profiles.push({
                    id: String(gid),
                    kingdom: kd,
                    name: basic.name,
                    tag: profileTag,
                    power: 0, killPoints: 0, dead: 0, 
                    troopPower: 0, commanderPower: 0, techPower: 0, highestPower: 0, tier: profileTag
                 });
            }
        }

        return NextResponse.json({ profiles, presence }, { status: 200 });

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
            } else {
                return NextResponse.json({ error: "Failed to severe DynamoDB link" }, { status: 500 });
            }
        }

        if (action === "link") {
            const { profileType } = body;
            if (!governorId) return NextResponse.json({ error: "Missing Target Scanner ID" }, { status: 400 });

            // Clean input (remove commas or spaces)
            const cleanId = String(governorId).replace(/\D/g, ''); 
            
            const success = await linkGovernorAccount(session.user.id, cleanId, profileType || "Main");
            if (success) {
                return NextResponse.json({ success: true, message: `Profile ${cleanId} successfully bound.` });
            } else {
                return NextResponse.json({ error: "AWS DynamoDB Binding Failed." }, { status: 500 });
            }
        }

        return NextResponse.json({ error: "Unknown Directive" }, { status: 400 });

    } catch (e) {
         console.error("[API] Governor Card Failure:", e);
         return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
