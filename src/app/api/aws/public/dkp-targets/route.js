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
        const sanitizedBaseline = String(baseline).replace(/[.#$\/\[\]\s\-:T]/g, "_").substring(0, 19);

        const params = {
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': { S: `SCAN#${kingdomId}#${sanitizedBaseline}` }
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
            const powerStart = gov.power || 0;
            
            let targetDkp = 0;
            let targetDeads = 0;

            if (dkpSystem === "basic") {
                targetDkp = 0;
                targetDeads = 0;
            } 
            else if (dkpSystem === "bracketed") {
                const pM = powerStart / 1000000;
                let mult = config.b6Mult || 5.0;
                
                if (pM <= (config.b1Max || 24)) mult = (config.b1Mult || 1.5);
                else if (pM <= (config.b2Max || 35)) mult = (config.b2Mult || 2.0);
                else if (pM <= (config.b3Max || 45)) mult = (config.b3Mult || 2.5);
                else if (pM <= (config.b4Max || 55)) mult = (config.b4Mult || 3.0);
                else if (pM <= (config.b5Max || 70)) mult = (config.b5Mult || 4.0);

                targetDkp = powerStart * mult;
                targetDeads = powerStart * (config.bracketDeadsMultiplier || 0.02);
            } 
            else if (dkpSystem === "advanced") {
                const t5MixRatio = parseFloat(config.t5MixRatio) || 0.7;
                const advT5Points = parseFloat(config.advT5Points) || 20;
                const advT4Points = parseFloat(config.advT4Points) || 10;
                const kpMultiplier = parseFloat(config.kpMultiplier) || 1.25;
                const kpPowerDivisor = parseFloat(config.kpPowerDivisor) || 3;
                const deadsMultiplier = parseFloat(config.deadsMultiplier) || 0.02;

                const t4MixRatio = 1 - t5MixRatio;
                const kpTargetMultiplier = (((t5MixRatio * advT5Points) + (t4MixRatio * advT4Points)) * kpMultiplier) / kpPowerDivisor;
                
                targetDkp = powerStart * kpTargetMultiplier;
                targetDeads = powerStart * deadsMultiplier;
            }

            return {
                id: gov.id,
                name: gov.name,
                alliance: gov.alliance || '',
                powerStart: powerStart,
                targetDkp: Math.round(targetDkp),
                targetDeads: Math.round(targetDeads)
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
