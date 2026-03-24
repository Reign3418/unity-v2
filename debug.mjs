import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import fs from 'fs';

const v = fs.readFileSync('.env.local', 'utf8');
v.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) process.env[match[1]] = match[2].trim().replace(/(^['"]|['"]$)/g, '');
});

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

async function run() {
    const res = await dbClient.send(new ScanCommand({
        TableName: process.env.AWS_TABLE_NAME,
        Limit: 10
    }));
    console.log("Found:", res.Items ? res.Items.map(i => i.PK.S) : 'None');
}
run();
