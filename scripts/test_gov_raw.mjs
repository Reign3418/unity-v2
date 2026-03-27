import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });

const dbClient = new DynamoDBClient({ 
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function check() {
    console.log("Looking up profile GOV_PROFILE#219048573");
    let res = await dbClient.send(new QueryCommand({
        TableName: process.env.AWS_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': { S: 'GOV_PROFILE#219048573' } }
    }));
    console.log("PROFILE:", JSON.stringify(res.Items, null, 2));

    console.log("Scanning table for SK = GOV#219048573 (across all KDs)");
    res = await dbClient.send(new ScanCommand({
        TableName: process.env.AWS_TABLE_NAME,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': { S: 'GOV#219048573' } }
    }));
    console.log("SCANS:", JSON.stringify(res.Items.map(i => ({ PK: i.PK.S, SK: i.SK.S, name: i.attributes?.M?.name?.S, power: i.attributes?.M?.power?.N })), null, 2));
}
check();
