import { DynamoDBClient, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Make sure users input the tag securely
const targetTag = process.argv[2];
if (!targetTag || !targetTag.startsWith('UP_')) {
    console.error("❌ Usage: node revert_transaction.mjs UP_XXXXXX");
    console.error("Please provide the exact Transaction Tag from your Admin Dashboard.");
    process.exit(1);
}

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const TableName = process.env.AWS_TABLE_NAME;

async function revert() {
    console.log(`\n🚨 IGNITING TARGETED REVERSAL PROTOCOL 🚨`);
    console.log(`Targeting Transaction Ticket: ${targetTag}`);
    console.log(`Scanning universal AWS Table [${TableName}]...\n`);
    
    let lastKey = null;
    let totalDeleted = 0;
    
    // Scan exclusively for nodes that inherit our target Tag
    do {
        const result = await dbClient.send(new ScanCommand({
            TableName,
            FilterExpression: "attributes.importTag = :tag",
            ExpressionAttributeValues: { ":tag": { S: targetTag } },
            ExclusiveStartKey: lastKey
        }));
        
        if (result.Items && result.Items.length > 0) {
            for (const item of result.Items) {
                // Delete both the DATES Master Pointer and GOV metric nodes unconditionally
                await dbClient.send(new DeleteItemCommand({
                    TableName,
                    Key: { PK: item.PK, SK: item.SK }
                }));
                totalDeleted++;
                process.stdout.write(`\r✅ Eradicated node matrix component ${totalDeleted}...`);
            }
        }
        
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    
    if (totalDeleted === 0) {
        console.log(`\n❌ Reversal completely failed. No nodes found matching tag [${targetTag}].`);
        console.log(`Please double check the tag against the Admin Dashboard.`);
    } else {
        console.log(`\n\n🎉 Reversal completely successful! Perfect Timeline Restoration Achieved.`);
        console.log(`Annihilated exactly ${totalDeleted} corrupted items.`);
    }
}

revert();
