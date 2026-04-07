import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getUserConfig, createKingdomEvent, queuePresencePing } from "@/lib/awsDynamo";

export async function POST(req) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { mailText, mailType, scheduleData, pushToDiscord, kingdomId: bodyKingdomId } = body;

        const userConfig = await getUserConfig(session.user.id);
        // Use kingdom from request body as fallback (set from localStorage on the client)
        const kingdomId = userConfig?.kingdomId || bodyKingdomId;
        if (!kingdomId) {
            return NextResponse.json({ error: "Kingdom Not Found — select a kingdom in the header first." }, { status: 400 });
        }

        // 1. If scheduling is enabled, deploy the EVENT to DynamoDB
        if (scheduleData && scheduleData.date && scheduleData.time) {
            const { date, time, offset } = scheduleData;
            const tzOffset = offset ? parseInt(offset) : 0;
            const testDate = new Date(`${date}T${time}:00.000Z`);
            
            if (isNaN(testDate.getTime())) {
                return NextResponse.json({ error: "Invalid DateTime format." }, { status: 400 });
            }

            testDate.setHours(testDate.getHours() - tzOffset);
            await createKingdomEvent(kingdomId, {
                name: `[${mailType.toUpperCase()}] Kingdom Directive`,
                type: mailType === 'kvk' ? 'KvK' : 'Competitive',
                desc: mailText,
                eventTime: testDate.toISOString()
            });
        }

        // 2. If Discord Webhook is enabled, drop a PENDING_PING
        if (pushToDiscord) {
            // The Discord Bot sweeper will pick this up in < 60 seconds
            await queuePresencePing(
                session.user.id, 
                kingdomId, 
                "🚨 KINGDOM BROADCAST DISPATCHED", 
                mailText
            );
        }

        return NextResponse.json({ success: true, message: "Command Center Array Deployed Successfully." });
    } catch (e) {
        console.error("[Command Center] API Deployment Error", e);
        return NextResponse.json({ error: "Failed to deploy ecosystem payload." }, { status: 500 });
    }
}
