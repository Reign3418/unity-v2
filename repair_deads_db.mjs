import fs from 'fs';
import { DynamoDBClient, GetItemCommand, QueryCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Unity V2 usually uses .env.local

// --- 1. Fix awsDynamo.js to include "deads" moving forward ---
const path = 'src/lib/awsDynamo.js';
let content = fs.readFileSync(path, 'utf8');

// The slices init string might have varying whitespace based on CRLF/LF.
// So we use Regex.
content = content.replace(/'100':\s*\{\s*power:\s*0,\s*kp:\s*0,\s*elements:\s*0\s*\}/g, "'100': { power: 0, kp: 0, deads: 0, elements: 0 }")
                 .replace(/'300':\s*\{\s*power:\s*0,\s*kp:\s*0,\s*elements:\s*0\s*\}/g, "'300': { power: 0, kp: 0, deads: 0, elements: 0 }")
                 .replace(/'400':\s*\{\s*power:\s*0,\s*kp:\s*0,\s*elements:\s*0\s*\}/g, "'400': { power: 0, kp: 0, deads: 0, elements: 0 }")
                 .replace(/'650':\s*\{\s*power:\s*0,\s*kp:\s*0,\s*elements:\s*0\s*\}/g, "'650': { power: 0, kp: 0, deads: 0, elements: 0 }")
                 .replace(/'1000':\s*\{\s*power:\s*0,\s*kp:\s*0,\s*elements:\s*0\s*\}/g, "'1000': { power: 0, kp: 0, deads: 0, elements: 0 }");

// And the logic that aggregates `elements += 1` -> We add `deads += deads` right before it.
content = content.replace(/summaryData\.topSlices\[String\(limit\)\]\.kp \+= kp;\s*if\s*\(power > 0\)/g, "summaryData.topSlices[String(limit)].kp += kp;\n                summaryData.topSlices[String(limit)].deads += deads;\n                if (power > 0)");

fs.writeFileSync(path, content, 'utf8');
console.log("awsDynamo.js patched successfully.");

// --- 2. Fix the DB via Mass Retroactive Scan Map Patching ---
const tableName = process.env.AWS_TABLE_NAME;
const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function runRepair() {
    console.log("=== UNITY V2 MASS DB REPAIR: Deads for Top Slices ===");

    // Add more if needed, basically the core KDs
    const targetKds = [4025, 4026, 4027, 4028, 4030];

    for (const kd of targetKds) {
        let lastDateKey = null;
        do {
            const dateParams = {
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :scan)',
                ExpressionAttributeValues: { 
                    ':pk': { S: `DATES#${kd}` },
                    ':scan': { S: 'SCAN#' }
                }
            };
            if (lastDateKey) dateParams.ExclusiveStartKey = lastDateKey;

            const dateResult = await dbClient.send(new QueryCommand(dateParams));
            
            if (dateResult.Items) {
                for (const dateItem of dateResult.Items) {
                    const dateStr = dateItem.SK.S;
                    const attrs = dateItem.attributes?.M || {};
                    let summary = {};
                    try { summary = JSON.parse(attrs.summary.S); } catch(e){}
                    
                    if (!summary.totalPower || summary.totalPower === 0) {
                        continue;
                    }

                    console.log(`Analyzing [KD ${kd}] -> ${dateStr}...`);

                    let roster = [];
                    let lastKey = null;
                    do {
                        const pkString = `SCAN#${kd}#${dateStr.replace('SCAN#','')}`;
                        const params = {
                            TableName: tableName,
                            KeyConditionExpression: 'PK = :pk',
                            ExpressionAttributeValues: { ':pk': { S: pkString } }
                        };
                        if (lastKey) params.ExclusiveStartKey = lastKey;

                        const dbRes = await dbClient.send(new QueryCommand(params));
                        if (dbRes.Items) {
                            for (const i of dbRes.Items) {
                                const a = i.attributes.M;
                                roster.push({
                                    power: parseInt(a['Power']?.N || a.power?.N) || 0,
                                    kp: parseInt(a['Kill Points']?.N || a.killPoints?.N || a.KillPoints?.N || a['killPoints']?.N) || 0,
                                    deads: parseInt(a['Deads']?.N || a.dead?.N || a.deads?.N || a.Deads?.N || a.Dead?.N || a.DEAD?.N || a.DEADS?.N || a.Defeat?.N || a.DEFEAT?.N || a.defeats?.N || a['Dead(s)']?.N) || 0,
                                    alliance: a['Alliance Tag']?.S || a.alliance?.S || 'None'
                                });
                            }
                        }
                        lastKey = dbRes.LastEvaluatedKey;
                    } while (lastKey);

                    if (roster.length === 0) continue;

                    roster.sort((a,b) => b.power - a.power);

                    const newSummary = {
                        scanType: roster.length < 100 ? 'Limited' : 'Full',
                        totalPower: 0,
                        totalKP: 0,
                        totalDeads: 0,
                        activeGovernors: 0,
                        alliances: {},
                        topSlices: {
                            '100': { power: 0, kp: 0, deads: 0, elements: 0 },
                            '300': { power: 0, kp: 0, deads: 0, elements: 0 },
                            '400': { power: 0, kp: 0, deads: 0, elements: 0 },
                            '650': { power: 0, kp: 0, deads: 0, elements: 0 },
                            '1000': { power: 0, kp: 0, deads: 0, elements: 0 }
                        }
                    };

                    roster.forEach((p, idx) => {
                        newSummary.totalPower += p.power;
                        newSummary.totalKP += p.kp;
                        newSummary.totalDeads += p.deads;
                        if (p.power > 0) newSummary.activeGovernors += 1;
                        
                        if (!newSummary.alliances[p.alliance]) newSummary.alliances[p.alliance] = 0;
                        newSummary.alliances[p.alliance] += p.power;

                        [100, 300, 400, 650, 1000].forEach(limit => {
                            if (idx < limit) {
                                newSummary.topSlices[String(limit)].power += p.power;
                                newSummary.topSlices[String(limit)].kp += p.kp;
                                newSummary.topSlices[String(limit)].deads += p.deads;
                                if (p.power > 0) newSummary.topSlices[String(limit)].elements += 1;
                            }
                        });
                    });

                    // Write back overwriting the summary entirely with correct .deads across slices
                    const updateParams = {
                        TableName: tableName,
                        Item: {
                            'PK': { S: dateItem.PK.S },
                            'SK': { S: dateItem.SK.S },
                            'attributes': {
                                M: {
                                    ...attrs,
                                    'summary': { S: JSON.stringify(newSummary) }
                                }
                            }
                        }
                    };
                    await dbClient.send(new PutItemCommand(updateParams));
                    console.log(`   -> SAVED Overwrite (Total Deads: ${newSummary.totalDeads})!`);
                }
            }
            lastDateKey = dateResult.LastEvaluatedKey;
            
        } while (lastDateKey);
    }
    console.log("=== COMPLETE ===");
}

runRepair();
