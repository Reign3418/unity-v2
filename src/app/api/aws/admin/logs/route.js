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

        const now = new Date();
        const allEvents = [];

        // Query the last 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            
            const result = await dbClient.send(new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: "PK = :pk",
                ExpressionAttributeValues: {
                    ":pk": { S: `EVENTS#${dateStr}` }
                }
            }));

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
        }

        // Sort descending by timestamp
        allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return NextResponse.json({ success: true, events: allEvents });

    } catch (error) {
        console.error("Fetch Logs Fault:", error);
        return NextResponse.json({ error: "Internal Server Fault" }, { status: 500 });
    }
}
