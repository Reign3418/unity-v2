import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { updateUserPresence, getUserConfig, queuePresencePing } from "@/lib/awsDynamo";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { status, note, requiresPing, profilesMap } = body;

        if (!status || !profilesMap) {
            return NextResponse.json({ error: "Missing required presence payloads" }, { status: 400 });
        }

        const discordId = session.user.id;
        
        // Fetch existing config to merge profile mappings natively
        const userConfig = await getUserConfig(discordId);
        if (!userConfig) {
            return NextResponse.json({ error: "User configuration missing." }, { status: 404 });
        }

        // Merge incoming profile Map overrides with existing maps
        const mergedProfilesMap = { ...(userConfig.profiles || {}), ...profilesMap };

        const success = await updateUserPresence(discordId, {
            status, note, requiresPing
        }, mergedProfilesMap);

        if (success) {
            // Push ping payload if requested natively.
            if (requiresPing && status !== "Active") {
                await queuePresencePing(discordId, userConfig.kingdomId || "Global", status, note);
            }
            return NextResponse.json({ success: true, message: "Global Presence Sync Complete." });
        } else {
            return NextResponse.json({ error: "AWS DynamoDB Presence Mutator Failed." }, { status: 500 });
        }

    } catch (e) {
         console.error("[API] Governor Presence Sync Failure:", e);
         return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
