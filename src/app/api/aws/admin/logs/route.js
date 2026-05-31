import { NextResponse } from 'next/server';
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { auth } from "@/lib/auth";

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });

export async function GET(req) {
    try {
        const session = await auth();
        // Allow Super Admin only
        if (!session || !session.user || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Access Denied" }, { status: 403 });
        }

        const tableName = process.env.AWS_TABLE_NAME;
        if (!tableName) {
            return NextResponse.json({ error: "Table name not configured" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const daysParam = searchParams.get('days');
        const days = Math.min(30, Math.max(1, parseInt(daysParam || '30', 10)));

        const now = new Date();
        const promises = [];

        // Query the dates in parallel
        for (let i = 0; i < days; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            
            promises.push(
                dbClient.send(new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: "PK = :pk",
                    ExpressionAttributeValues: {
                        ":pk": { S: `EVENTS#${dateStr}` }
                    }
                })).catch(err => {
                    console.error(`Error querying EVENTS for ${dateStr}:`, err);
                    return { Items: [] };
                })
            );
        }

        const results = await Promise.all(promises);
        const allEvents = [];

        results.forEach(result => {
            if (result.Items) {
                result.Items.forEach(item => {
                    allEvents.push({
                        timestamp: item.timestamp?.S || '',
                        eventType: item.eventType?.S || '',
                        userEmail: item.userEmail?.S || 'anonymous',
                        userAgent: item.userAgent?.S || '',
                        metadata: item.metadata?.S ? JSON.parse(item.metadata.S) : {}
                    });
                });
            }
        });

        // Sort descending by timestamp
        allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return NextResponse.json({ success: true, events: allEvents });

    } catch (error) {
        console.error("Fetch Logs Fault:", error);
        return NextResponse.json({ error: "Internal Server Fault" }, { status: 500 });
    }
}
