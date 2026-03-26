import { DynamoDBClient, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const TableName = process.env.AWS_TABLE_NAME;

async function purge() {
    console.log("Igniting Global Scan to seek and destroy BULK_V1 nodes...");
    
    let lastKey = null;
    let totalDeleted = 0;
    
    do {
        const result = await dbClient.send(new ScanCommand({
            TableName,
            FilterExpression: "attributes.importTag = :tag",
            ExpressionAttributeValues: { ":tag": { S: "BULK_V1" } },
            ExclusiveStartKey: lastKey
        }));
        
        if (result.Items && result.Items.length > 0) {
            for (const item of result.Items) {
                await dbClient.send(new DeleteItemCommand({
                    TableName,
                    Key: { PK: item.PK, SK: item.SK }
                }));
                totalDeleted++;
                process.stdout.write(`\rSuccessfully eradicated node ID ${totalDeleted}...`);
            }
        }
        
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    
    console.log(`\nPurge sequence fully complete. ${totalDeleted} nodes annihilated.`);
}

purge();
