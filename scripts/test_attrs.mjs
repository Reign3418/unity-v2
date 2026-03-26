// Inspect exact DynamoDB attributes for a snapshot to see why power is 0
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

async function run() {
    const res = await client.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': { S: 'SCAN#3155#2026-03-21_20:29_UTC' } },
        Limit: 1
    }));
    
    if (res.Items && res.Items.length > 0) {
        const attrs = res.Items[0].attributes?.M || {};
        console.log("Found attributes keys:");
        for (const [k, v] of Object.entries(attrs)) {
            console.log(`  "${k}": ${JSON.stringify(v)}`);
        }
    } else {
        console.log("No items found.");
    }
}
run();
