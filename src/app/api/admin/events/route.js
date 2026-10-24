import { NextResponse } from "next/server";
export const maxDuration = 300;

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
        const days = Math.min(parseInt(searchParams.get('days') || '90'), 120);
        const filterFeature = searchParams.get('feature') || null;

        const tableName = process.env.AWS_TABLE_NAME || 'Unity2AWSRoster';

        // Build list of date partition keys to query
        const dateKeys = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dateKeys.push(`EVENTS#${d.toISOString().slice(0, 10)}`);
        }

        // Query in batches of 20 to avoid connection spikes
        const allEvents = [];
        for (let i = 0; i < dateKeys.length; i += 20) {
            const batch = dateKeys.slice(i, i + 20);
            const results = await Promise.all(
                batch.map(pk => dbClient.send(new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: "PK = :pk",
                    ExpressionAttributeValues: { ":pk": { S: pk } },
                    ScanIndexForward: false,
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
        }

        // Sort newest first across all partitions
        allEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // Compute summary stats + per-surface telemetry
        const stats = {
            total: allEvents.length,
            byFeature: {},
            featureLastSeen: {},
            byRoute: {},
            byKingdomTab: {},
            byCalcTab: {},
            topKingdoms: {},
            topUsers: {},
            byDay: {},
        };

        for (const e of allEvents) {
            // 1. By feature
            stats.byFeature[e.eventType] = (stats.byFeature[e.eventType] || 0) + 1;
            if (!stats.featureLastSeen[e.eventType] || e.timestamp > stats.featureLastSeen[e.eventType]) {
                stats.featureLastSeen[e.eventType] = e.timestamp;
            }

            // 2. By PAGE_VIEW route
            if (e.eventType === 'PAGE_VIEW' && e.metadata?.route) {
                const r = e.metadata.route;
                if (!stats.byRoute[r]) stats.byRoute[r] = { count: 0, lastSeen: '' };
                stats.byRoute[r].count++;
                if (e.timestamp > stats.byRoute[r].lastSeen) stats.byRoute[r].lastSeen = e.timestamp;
            }

            // 3. By KINGDOM_TAB_VIEW
            if (e.eventType === 'KINGDOM_TAB_VIEW' && e.metadata?.tab) {
                const t = e.metadata.tab;
                if (!stats.byKingdomTab[t]) stats.byKingdomTab[t] = { count: 0, lastSeen: '' };
                stats.byKingdomTab[t].count++;
                if (e.timestamp > stats.byKingdomTab[t].lastSeen) stats.byKingdomTab[t].lastSeen = e.timestamp;
            }

            // 4. By CALCULATOR_TAB_VIEW
            if (e.eventType === 'CALCULATOR_TAB_VIEW' && e.metadata?.tab) {
                const ct = e.metadata.tab;
                if (!stats.byCalcTab[ct]) stats.byCalcTab[ct] = { count: 0, lastSeen: '' };
                stats.byCalcTab[ct].count++;
                if (e.timestamp > stats.byCalcTab[ct].lastSeen) stats.byCalcTab[ct].lastSeen = e.timestamp;
            }

            // 5. Top kingdoms
            const kingdoms = e.metadata?.kingdoms || (e.metadata?.kingdomId ? [e.metadata.kingdomId] : (e.metadata?.kd ? [e.metadata.kd] : []));
            for (const kd of kingdoms) {
                stats.topKingdoms[kd] = (stats.topKingdoms[kd] || 0) + 1;
            }

            // 6. Top users
            if (e.userEmail && e.userEmail !== 'anonymous') {
                stats.topUsers[e.userEmail] = (stats.topUsers[e.userEmail] || 0) + 1;
            }

            // 7. By day
            const day = e.timestamp.slice(0, 10);
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        }

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
