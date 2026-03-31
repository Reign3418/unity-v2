import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized. Master Creator Clearance Required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const days = Math.min(parseInt(searchParams.get('days') || '7'), 30);
        const filterFeature = searchParams.get('feature') || null; // e.g. 'MATCHMAKER_SCAN'

        const tableName = process.env.AWS_TABLE_NAME;
        if (!tableName) return NextResponse.json({ error: "Table not configured." }, { status: 500 });

        // Build list of date partition keys to query
        const dateKeys = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dateKeys.push(`EVENTS#${d.toISOString().slice(0, 10)}`);
        }

        // Query all date partitions in parallel
        const allEvents = [];
        const results = await Promise.all(
            dateKeys.map(pk => dbClient.send(new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: "PK = :pk",
                ExpressionAttributeValues: { ":pk": { S: pk } },
                ScanIndexForward: false, // newest first
                Limit: 500,
            })).catch(() => ({ Items: [] })))
        );

        for (const result of results) {
            for (const item of (result.Items || [])) {
                const eventType = item.eventType?.S || 'UNKNOWN';
                if (filterFeature && eventType !== filterFeature) continue;

                let metadata = {};
                try { metadata = JSON.parse(item.metadata?.S || '{}'); } catch {}

                allEvents.push({
                    eventType,
                    metadata,
                    userEmail: item.userEmail?.S || 'anonymous',
                    timestamp: item.timestamp?.S || '',
                    sk: item.SK?.S || '',
                });
            }
        }

        // Sort newest first across all partitions
        allEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // Compute summary stats
        const stats = {
            total: allEvents.length,
            byFeature: {},
            topKingdoms: {},
            topUsers: {},
            byDay: {},
        };

        for (const e of allEvents) {
            // By feature
            stats.byFeature[e.eventType] = (stats.byFeature[e.eventType] || 0) + 1;

            // Top kingdoms (from matchmaker/tracker)
            const kingdoms = e.metadata?.kingdoms || (e.metadata?.kingdomId ? [e.metadata.kingdomId] : []);
            for (const kd of kingdoms) {
                stats.topKingdoms[kd] = (stats.topKingdoms[kd] || 0) + 1;
            }

            // Top users
            if (e.userEmail && e.userEmail !== 'anonymous') {
                stats.topUsers[e.userEmail] = (stats.topUsers[e.userEmail] || 0) + 1;
            }

            // By day
            const day = e.timestamp.slice(0, 10);
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        }

        // Sort topKingdoms to array
        stats.topKingdomsArr = Object.entries(stats.topKingdoms)
            .sort((a, b) => b[1] - a[1]).slice(0, 10)
            .map(([kd, count]) => ({ kd, count }));

        stats.topUsersArr = Object.entries(stats.topUsers)
            .sort((a, b) => b[1] - a[1]).slice(0, 10)
            .map(([email, count]) => ({ email, count }));

        return NextResponse.json({ success: true, events: allEvents.slice(0, 200), stats, queriedDays: days });

    } catch (e) {
        console.error('[Admin/Events] Error:', e);
        return NextResponse.json({ error: "Internal error fetching events." }, { status: 500 });
    }
}
