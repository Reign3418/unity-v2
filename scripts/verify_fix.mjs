// Verify the DATE# fix works
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

const dateResult = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: `DATES#${KD}` } }
}));

const parseScanDate = (s) => new Date(s.replace(' UTC', 'Z').replace(' ', 'T'));
const entries = dateResult.Items
    .map(i => ({
        dateKey: i.SK?.S?.replace('DATE#', '') || '',   // Strip DATE# (not SCAN#!)
        scanDate: i.attributes?.M?.scanDate?.S || ''
    }))
    .filter(d => d.dateKey && d.scanDate)
    .sort((a, b) => parseScanDate(a.scanDate) - parseScanDate(b.scanDate));

console.log(`\nKD ${KD}: ${entries.length} date entries`);
console.log(`First: dateKey="${entries[0]?.dateKey}"`);
console.log(`Last:  dateKey="${entries[entries.length-1]?.dateKey}"`);

const startPK = `SCAN#${KD}#${entries[0].dateKey}`;
const endPK = `SCAN#${KD}#${entries[entries.length-1].dateKey}`;

console.log(`\nQuerying start: PK="${startPK}"`);
const startRes = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: startPK } },
    Limit: 3
}));
console.log(`  → ${startRes.Items?.length || 0} governors found`);

console.log(`Querying end:   PK="${endPK}"`);
const endRes = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: endPK } },
    Limit: 3
}));
console.log(`  → ${endRes.Items?.length || 0} governors found`);

if ((startRes.Items?.length || 0) > 0 && (endRes.Items?.length || 0) > 0) {
    console.log(`\n✅ BOTH SNAPSHOTS HAVE DATA — PCA ENGINE WILL COMPILE!`);
} else {
    console.log(`\n❌ One or both snapshots empty.`);
}
