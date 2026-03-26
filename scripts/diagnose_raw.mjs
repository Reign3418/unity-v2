// Raw scan to find what PK patterns actually exist in DDB
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

const result = await client.send(new ScanCommand({
    TableName: process.env.AWS_TABLE_NAME,
    Limit: 50
}));

const pkSamples = new Set();
for (const item of result.Items || []) {
    const pk = item.PK?.S?.substring(0, 60);
    const sk = item.SK?.S?.substring(0, 60);
    pkSamples.add(`PK="${pk}" | SK="${sk}"`);
}

console.log(`\nRaw DynamoDB sample (50 items):`);
for (const s of [...pkSamples].sort()) {
    console.log(`  ${s}`);
}
