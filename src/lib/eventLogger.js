import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });

/**
 * Logs a site event to DynamoDB. Non-blocking — fire and forget.
 * PK: EVENTS#YYYY-MM-DD  SK: <timestamp-ms>#<random>
 * TTL: 90 days auto-expiry
 *
 * @param {string} eventType  e.g. 'MATCHMAKER_SCAN', 'TRACKER_SCAN', 'HUNTER_SEARCH'
 * @param {object} metadata   Any serializable context (kingdoms, timeframe, query, etc.)
 * @param {object} context    { userEmail, userAgent, sessionId }
 */
export async function logEvent(eventType, metadata = {}, context = {}) {
    const tableName = process.env.AWS_TABLE_NAME;
    if (!tableName) return; // Silently skip if not configured

    try {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const ts = now.getTime();
        const rand = Math.random().toString(36).slice(2, 8);
        const ttl = Math.floor(ts / 1000) + 90 * 24 * 60 * 60; // 90 day expiry

        await dbClient.send(new PutItemCommand({
            TableName: tableName,
            Item: {
                PK: { S: `EVENTS#${dateStr}` },
                SK: { S: `${ts}#${rand}` },
                eventType: { S: eventType },
                metadata: { S: JSON.stringify(metadata) },
                userEmail: { S: context.userEmail || 'anonymous' },
                userAgent: { S: (context.userAgent || '').slice(0, 200) },
                timestamp: { S: now.toISOString() },
                ttl: { N: String(ttl) },
            }
        }));
    } catch (e) {
        // Never throw — logging must never break the primary request
        console.warn('[EventLogger] Failed to log event:', e?.message);
    }
}
