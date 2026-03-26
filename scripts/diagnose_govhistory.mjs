// Find actual GOV_HISTORY SK structure for a kingdom
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
});

const KD = process.argv[2] || '3155';

// Get a sample of all GOV_HISTORY records - show unique SK patterns
const result = await client.send(new ScanCommand({
    TableName: process.env.AWS_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix)',
    ExpressionAttributeValues: { ':prefix': { S: 'GOV_HISTORY#' } },
    Limit: 20
}));

const seen = new Set();
console.log(`\nAll unique GOV_HISTORY SK patterns (first 20 scan result):`);
for (const item of result.Items || []) {
    const sk = item.SK?.S;
    if (!seen.has(sk)) {
        seen.add(sk);
        const attrs = item.attributes?.M || {};
        const kdInAttrs = attrs['Kingdom']?.S || attrs['kingdom']?.N || attrs['kingdomId']?.S || '?';
        console.log(`  SK="${sk}" | attrs keys: ${Object.keys(attrs).join(', ')}`);
    }
}
