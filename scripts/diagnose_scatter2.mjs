// Quick scan to find what PK format the gov snapshot data uses
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

// Sample scan limited to 20 items to see what PK formats exist
const result = await client.send(new ScanCommand({
    TableName: process.env.AWS_TABLE_NAME,
    FilterExpression: 'contains(PK, :kd)',
    ExpressionAttributeValues: { ':kd': { S: KD } },
    Limit: 100
}));

const pkSamples = new Set();
for (const item of result.Items || []) {
    pkSamples.add(item.PK?.S?.substring(0, 50));
}

console.log(`\nAll PK patterns containing "${KD}":`);
for (const pk of [...pkSamples].sort()) {
    console.log(`  "${pk}"`);
}
