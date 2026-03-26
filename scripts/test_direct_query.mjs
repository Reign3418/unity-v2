// Direct query test against the SCAN#KD#DATE PK
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
});

const TABLE = process.env.AWS_TABLE_NAME;
const KD = process.argv[2] || '3155';

// Step 1: Get DATES# and their actual SK values
const dateResult = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: `DATES#${KD}` } }
}));

console.log(`\nDATES#${KD} records (showing SK and scanDate):`);
const entries = [];
for (const item of dateResult.Items || []) {
    const sk = item.SK?.S;        // e.g. "SCAN#2026-01-02_16:18_UTC" or "DATE#..."
    const scanDate = item.attributes?.M?.scanDate?.S;
    console.log(`  SK="${sk}" | scanDate="${scanDate}"`);
    entries.push({ sk, scanDate });
}

if (entries.length === 0) { console.log('No entries found.'); process.exit(1); }

// Step 2: Try querying with the actual SK stripped of "SCAN#" (what the new code does)
const first = entries[0];
const dateKeyFromSK = first.sk?.replace('SCAN#', '') || 'UNKNOWN';
const queryPK = `SCAN#${KD}#${dateKeyFromSK}`;

console.log(`\nQuerying PK="${queryPK}"...`);
const snapResult = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: queryPK } },
    Limit: 3
}));

if (snapResult.Items?.length > 0) {
    console.log(`✅ SUCCESS! Found ${snapResult.ScannedCount} items at correct PK.`);
    const sample = snapResult.Items[0];
    console.log(`Sample SK: "${sample.SK?.S}"`);
    console.log(`Attrs keys: ${Object.keys(sample.attributes?.M || {}).join(', ')}`);
} else {
    console.log(`❌ FAIL — 0 items at PK "${queryPK}"`);
    
    // Try last entry
    const last = entries[entries.length - 1];
    const lastDateKey = last.sk?.replace('SCAN#', '') || '';
    const lastQueryPK = `SCAN#${KD}#${lastDateKey}`;
    console.log(`\nTrying last entry PK="${lastQueryPK}"...`);
    const lastRes = await client.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': { S: lastQueryPK } },
        Limit: 3
    }));
    if (lastRes.Items?.length > 0) {
        console.log(`✅ LAST ENTRY WORKS: ${lastRes.ScannedCount} items`);
        console.log(`Sample SK: "${lastRes.Items[0].SK?.S}"`);
    } else {
        console.log(`❌ ALSO FAILED`);
        console.log(`\nNOTE: DATES# SK prefix may not be "SCAN#" — check the raw SK values above.`);
    }
}
