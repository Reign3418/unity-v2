import { DynamoDBClient, ScanCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            process.env[match[1]] = match[2].trim().replace(/(^['"]|['"]$)/g, '');
        }
    });
}

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

const tableName = process.env.AWS_TABLE_NAME;

async function backfill() {
    console.log("Starting Retroactive Top N Base Injection...");
    
    // 1. Scan DynamoDB explicitly for ALL past DATES blocks to sweep the entire history regardless of the new Global Registry
    const scanResult = await dbClient.send(new ScanCommand({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: { ':prefix': { S: 'DATES#' } }
    }));
    
    if (!scanResult.Items || scanResult.Items.length === 0) {
        console.log("No Scans found in Database. Exiting.");
        return;
    }
    
    // Extract unique kingdoms from DATES# PKs
    const uniqueKds = new Set(scanResult.Items.map(item => item.PK.S.replace('DATES#', '')));
    const kingdoms = Array.from(uniqueKds);
    console.log(`Found ${kingdoms.length} Active Kingdoms to process:`, kingdoms.join(', '));
    
    for (const kd of kingdoms) {
        console.log(`\n--- Inspecting Kingdom ${kd} ---`);
        
        // Get Dates Pointers
        const dateResult = await dbClient.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': { S: `DATES#${kd}` } }
        }));
        
        if (!dateResult.Items || dateResult.Items.length === 0) continue;
        
        for (const dateItem of dateResult.Items) {
            const dateKey = dateItem.SK.S; // "SCAN#2026_03_23_..." 
            const attrs = dateItem.attributes?.M || {};
            let summary = {};
            if (attrs.summary?.S) {
                try { summary = JSON.parse(attrs.summary.S); } catch(e){}
            }
            
            // Re-calculate if topSlices is completely missing OR if they're completely 0
            if (!summary.topSlices || summary.topSlices['100']?.elements === 0) {
                console.log(`>> Backfilling Cache for ${kd} | ${dateKey}...`);
                
                // Fetch Roster 
                const params = {
                    TableName: tableName,
                    KeyConditionExpression: 'PK = :pk',
                    ExpressionAttributeValues: { ':pk': { S: dateKey } }
                };
                
                let roster = [];
                let lastEvaluatedKey = null;
                
                do {
                    if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
                    const result = await dbClient.send(new QueryCommand(params));
                    
                    if (result.Items) {
                        for (const item of result.Items) {
                            const pAttrs = item.attributes?.M || {};
                            roster.push({
                                power: parseInt(pAttrs['Power']?.N || pAttrs['power']?.N || 0),
                                kp: parseInt(pAttrs['Kill Points']?.N || pAttrs['killPoints']?.N || 0)
                            });
                        }
                    }
                    lastEvaluatedKey = result.LastEvaluatedKey;
                } while(lastEvaluatedKey);
                
                // Sort
                roster.sort((a, b) => b.power - a.power);
                
                // Top Slices Logic
                summary.topSlices = {
                    '100': { power: 0, kp: 0, elements: 0 },
                    '300': { power: 0, kp: 0, elements: 0 },
                    '400': { power: 0, kp: 0, elements: 0 },
                    '650': { power: 0, kp: 0, elements: 0 },
                    '1000': { power: 0, kp: 0, elements: 0 }
                };
                
                roster.forEach((p, index) => {
                    [100, 300, 400, 650, 1000].forEach(limit => {
                        if (index < limit) {
                            summary.topSlices[String(limit)].power += p.power || 0;
                            summary.topSlices[String(limit)].kp += p.kp || 0;
                            if (p.power > 0) summary.topSlices[String(limit)].elements += 1;
                        }
                    });
                });
                
                // Push back into DynamoDB
                await dbClient.send(new UpdateItemCommand({
                    TableName: tableName,
                    Key: { 'PK': { S: `DATES#${kd}` }, 'SK': { S: dateKey } },
                    UpdateExpression: 'SET #attr.#sum = :newSum',
                    ExpressionAttributeNames: {
                        '#attr': 'attributes',
                        '#sum': 'summary'
                    },
                    ExpressionAttributeValues: {
                        ':newSum': { S: JSON.stringify(summary) }
                    }
                }));
                
                console.log(`   [✓] Wrote ${roster.length} elements mapped -> Top Slices sealed.`);
            } else {
                console.log(`   [Skip] ${dateKey} already has Top Slices.`);
            }
        }
    }
    
    console.log("\nFinished Retroactive Backfill.");
}

backfill();
