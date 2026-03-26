// Direct server-side test of getBehavioralMatrix
import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
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
const START = process.argv[3] || '2026-01-01';
const END = process.argv[4] || '2026-03-25';

console.log(`\n=== LIVE getBehavioralMatrix TEST ===`);
console.log(`KD: ${KD} | Range: ${START} → ${END}\n`);

// Step 1: Get DATES
const dateResult = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: `DATES#${KD}` } }
}));

console.log(`[1] DATES#${KD}: ${dateResult.Items?.length || 0} records`);
if (!dateResult.Items?.length) { console.log('FAIL: No dates found'); process.exit(1); }

// Step 2: Parse + filter dates
const parseScanDate = (s) => new Date(s.replace(' UTC', 'Z').replace(' ', 'T'));

let dates = dateResult.Items
    .map(i => i.attributes?.M?.scanDate?.S || '')
    .filter(s => s !== '')
    .sort((a, b) => parseScanDate(a) - parseScanDate(b));

console.log(`[2] All dates available in DATES#${KD}:`);
dates.forEach(d => console.log(`   "${d}" → Date: ${parseScanDate(d).toISOString()}`));

let filtered = dates.filter(d => parseScanDate(d) >= new Date(START));
filtered = filtered.filter(d => parseScanDate(d) <= new Date(END + 'T23:59:59Z'));
console.log(`\n[3] After filtering [${START} → ${END}]: ${filtered.length} dates`);
if (filtered.length < 2) { console.log('FAIL: < 2 dates in range — try expanding range'); process.exit(1); }

console.log(`   Start date: "${filtered[0]}"`);
console.log(`   End date:   "${filtered[filtered.length - 1]}"`);

// Step 3: Build SK keys 
const toSK = (scanDate) => `SCAN#${KD}#${scanDate.replace(' ', '_').replace(/ /g, '_')}`;
const startSK = toSK(filtered[0]);
const endSK = toSK(filtered[filtered.length - 1]);

console.log(`\n[4] SK keys to query:`);
console.log(`   Start SK: "${startSK}"`);
console.log(`   End SK:   "${endSK}"`);

// Step 4: Query GOV_HISTORY for start snapshot
console.log(`\n[5] Scanning GOV_HISTORY for start snapshot...`);
const startParams = {
    TableName: TABLE,
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: { ':prefix': { S: 'GOV_HISTORY#' }, ':sk': { S: startSK } }
};
const startRes = await client.send(new ScanCommand(startParams));
console.log(`   Found ${startRes.Items?.length || 0} governors in start snapshot`);

console.log(`\n[6] Scanning GOV_HISTORY for end snapshot...`);
const endParams = {
    TableName: TABLE,
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: { ':prefix': { S: 'GOV_HISTORY#' }, ':sk': { S: endSK } }
};
const endRes = await client.send(new ScanCommand(endParams));
console.log(`   Found ${endRes.Items?.length || 0} governors in end snapshot`);

if ((startRes.Items?.length || 0) === 0 || (endRes.Items?.length || 0) === 0) {
    console.log(`\nFAIL: One or both snapshots returned 0 governors.`);
    // Show what SK values actually exist for KD_HISTORY
    console.log(`\n[7] Sample GOV_HISTORY SK values for KD ${KD} (first 5 records):`);
    const sampleRes = await client.send(new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'begins_with(PK, :prefix) AND contains(SK, :kd)',
        ExpressionAttributeValues: { ':prefix': { S: 'GOV_HISTORY#' }, ':kd': { S: `#${KD}#` } },
        Limit: 10
    }));
    sampleRes.Items?.slice(0, 5).forEach(i => console.log(`   PK="${i.PK?.S}" SK="${i.SK?.S}"`));
} else {
    console.log(`\n✅ SUCCESS! Both snapshots have data. Matrix should compile.`);
}
