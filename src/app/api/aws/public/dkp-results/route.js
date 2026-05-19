import { NextResponse } from "next/server";
import { getBehavioralMatrix } from "@/lib/awsDynamo";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get('kd');
        const startIso = searchParams.get('start');
        const endIso = searchParams.get('end');

        if (!kingdomId || !startIso || !endIso) {
            return NextResponse.json({ error: "Missing required parameters (kd, start, end)." }, { status: 400 });
        }

        // 1. Fetch Behavioral Data
        const roster = await getBehavioralMatrix(kingdomId, startIso, endIso);

        // 2. Fetch Family Links
        let links = {};
        try {
            const params = {
                TableName: process.env.AWS_TABLE_NAME,
                Key: {
                    'PK': { S: `ROSTER_LINKS#${kingdomId}` },
                    'SK': { S: 'CURRENT' }
                }
            };
            const result = await dbClient.send(new GetItemCommand(params));
            if (result.Item && result.Item.data && result.Item.data.S) {
                links = JSON.parse(result.Item.data.S);
            }
        } catch (e) {
            console.error("[AWS Roster Links] Public Fetch Error:", e);
        }

        return NextResponse.json({ roster, links }, { status: 200 });

    } catch (error) {
        console.error("Public DKP Results Route API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
