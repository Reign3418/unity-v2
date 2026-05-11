import { NextResponse } from "next/server";
import { getKingdomDkpMatrix } from "@/lib/awsDynamo";
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get('kd');
        const baseline = searchParams.get('baseline');

        if (!kingdomId || !baseline) {
            return NextResponse.json({ error: "Missing 'kd' or 'baseline' parameter." }, { status: 400 });
        }

        // 1. Fetch Global DKP Configuration
        const config = await getKingdomDkpMatrix(kingdomId);
        if (!config) {
            return NextResponse.json({ error: "No DKP Configuration found for this kingdom." }, { status: 404 });
        }

        const dkpSystem = config.dkpSystem || "advanced"; // 'basic', 'bracketed', 'advanced'
        const globalMultipliers = config.multipliers || {};
        const globalBrackets = config.brackets || [];

        // 2. Fetch the Baseline Roster
        const tableName = process.env.AWS_TABLE_NAME;
        const params = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': { S: `SCAN#${kingdomId}#${baseline}` }
            }
        };

        const roster = [];
        let lastEvaluatedKey = null;

        do {
            if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
            
            const result = await dbClient.send(new QueryCommand(params));
            
            if (result.Items) {
                for (const item of result.Items) {
                    const attrs = item.attributes?.M || {};
                    roster.push({
                        id: attrs['Governor ID']?.S || attrs['id']?.S || item.SK.S.replace('GOV#', ''),
                        name: attrs['Governor Name']?.S || attrs['name']?.S || 'Unknown',
                        alliance: attrs['Alliance Tag']?.S || 'None',
                        power: parseInt(attrs['Power']?.N || attrs['power']?.N) || 0,
                    });
                }
            }
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        if (!roster || roster.length === 0) {
            return NextResponse.json({ error: "No baseline roster found for this date." }, { status: 404 });
        }

        // 3. Compute Target DKP per Governor
        const targets = roster.map(gov => {
            const powerStart = gov.power || 0; // In getOverviewDeltas, gov.power is the power at the end date, which is baseline
            
            let targetDkp = 0;

            if (dkpSystem === "basic") {
                targetDkp = 0; // Basic system usually implies no targets, just raw scoring.
            } 
            else if (dkpSystem === "bracketed") {
                let mult = 0;
                for (const b of globalBrackets) {
                    if (powerStart >= b.min && powerStart <= b.max) {
                        mult = b.multiplier;
                        break;
                    }
                }
                targetDkp = powerStart * mult;
            } 
            else if (dkpSystem === "advanced") {
                const t4MixRatio = (1 - (config.t5MixRatio || 0));
                const kpTargetMultiplier = ((((config.t5MixRatio || 0) * (config.advT5Points || 0)) + (t4MixRatio * (config.advT4Points || 0))) * (config.kpMultiplier || 0)) / (config.kpPowerDivisor || 1);
                targetDkp = powerStart * kpTargetMultiplier;
            }

            return {
                id: gov.id,
                name: gov.name,
                alliance: gov.alliance || '',
                powerStart: powerStart,
                targetDkp: Math.round(targetDkp)
            };
        });

        // Sort by power descending
        targets.sort((a, b) => b.powerStart - a.powerStart);

        return NextResponse.json({ 
            success: true, 
            dkpSystem,
            targets 
        }, { status: 200 });

    } catch (error) {
        console.error("[API/AWS/Public/DKP] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error compiling Public DKP Targets." }, { status: 500 });
    }
}
