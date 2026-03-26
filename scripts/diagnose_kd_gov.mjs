// Check what scan dates GOV_HISTORY actually has for KD 3155
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
const prefix = `SCAN#${KD}#`;

console.log(`\nLooking for GOV_HISTORY records with SK starting with "${prefix}"...\n`);

const result = await client.send(new ScanCommand({
    TableName: process.env.AWS_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :govprefix) AND begins_with(SK, :scanprefix)',
    ExpressionAttributeValues: {
        ':govprefix': { S: 'GOV_HISTORY#' },
        ':scanprefix': { S: prefix }
    },
    Limit: 20
}));

const skSet = new Set();
for (const item of result.Items || []) {
    skSet.add(item.SK?.S);
}

if (skSet.size === 0) {
    console.log(`❌ NO GOV_HISTORY records found with SK starting "${prefix}"`);
    console.log(`\nThis means KD ${KD} data was NEVER stored in GOV_HISTORY format.`);
    console.log(`Check if KD ${KD} data was uploaded using the bulk uploader (which may use a different schema).`);
} else {
    console.log(`✅ Found ${skSet.size} unique SK values:`);
    [...skSet].sort().forEach(sk => console.log(`  "${sk}"`));
}
