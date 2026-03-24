import { NextResponse } from "next/server";
import { DynamoDBClient, ScanCommand, QueryCommand, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { auth } from "@/lib/auth";

export async function GET(req) {
    try {
        const session = await auth();
        // Since this is a massive DB migration, restrict to Super Admin
        if (!session || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized. Super Admin Required." }, { status: 401 });
        }

        const dbClient = new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });
        const tableName = process.env.AWS_TABLE_NAME;

        console.log("[Migration] Firing targeted O(1) Queries into DATES objects...");
        
        // Use a targeted array to avoid the 1MB Scan Pagination limits of DynamoDB on massive legacy tables.
        // We include 1302 explicitly to rescue it from orphanage.
        const targetKingdoms = ['3155', '3701', '4025', '1302', '3738', '2338', '2934', '1000'];
        const kingdoms = [];

        // Verify which targeted kingdoms actually have DATES pointers
        for (const kd of targetKingdoms) {
            const check = await dbClient.send(new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: { ':pk': { S: `DATES#${kd}` } }
            }));
            if (check.Items && check.Items.length > 0) {
                kingdoms.push(kd);
            }
        }
        
        if (kingdoms.length === 0) {
            return NextResponse.json({ error: "No Scans found in Database." }, { status: 404 });
        }
        
        console.log(`[Migration] Found ${kingdoms.length} Active Kingdoms to process:`, kingdoms.join(', '));
        
        // Ensure ALL of these discovered kingdoms exist in TRACKED_KINGDOMS
        try {
            await dbClient.send(new UpdateItemCommand({
                TableName: tableName,
                Key: { 'PK': { S: 'SYSTEM#CONFIG' }, 'SK': { S: 'TRACKED_KINGDOMS' } },
                UpdateExpression: "ADD kingdoms :kdSS",
                ExpressionAttributeValues: { ":kdSS": { SS: kingdoms.map(String) } }
            }));
            console.log("[Migration] Global Registry forced sync complete.");
        } catch (e) {
             console.log("[Migration] Global Registry write failed:", e.message);
        }

        let processedDates = 0;
        let skippedDates = 0;
        
        for (const kd of kingdoms) {
            console.log(`\n--- Inspecting Kingdom ${kd} ---`);
            
            // Re-fetch all date pointers specifically for this kingdom (cleaner chronological sort)
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
                    
                    // Sort descending natively
                    roster.sort((a, b) => b.power - a.power);
                    
                    // Initialize Top Slices Container
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
                    
                    // Push back into DynamoDB permanently caching the new algorithm
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
                    
                    processedDates++;
                    console.log(`   [✓] Wrote ${roster.length} elements mapped -> Top Slices sealed.`);
                } else {
                    skippedDates++;
                    console.log(`   [Skip] ${dateKey} already has Top Slices intact.`);
                }
            }
        }
        
        return NextResponse.json({ 
            success: true, 
            message: "Retroactive Scan Complete.",
            foundKingdoms: kingdoms,
            processedDates,
            skippedDates
        }, { status: 200 });

    } catch (e) {
        console.error("[Migration Error]", e);
        return NextResponse.json({ error: "Server Error during migration.", details: e.message }, { status: 500 });
    }
}
