import { NextResponse } from "next/server";
import { getKingdomRoster } from "@/lib/awsDynamo";
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
        const secondaryKd = searchParams.get('secondary');

        if (!kingdomId) {
            return NextResponse.json({ error: "Missing Kingdom ID." }, { status: 400 });
        }

        // 1. Fetch Alliance Merge State
        let targets = [];
        let sourceAlliances = [];
        try {
            const params = {
                TableName: process.env.AWS_TABLE_NAME,
                Key: {
                    'PK': { S: `ALLIANCE_MERGE#${kingdomId}` },
                    'SK': { S: 'STATE' }
                }
            };
            const result = await dbClient.send(new GetItemCommand(params));
            if (result.Item && result.Item.payload && result.Item.payload.S) {
                const payload = JSON.parse(result.Item.payload.S);
                targets = payload.targets || [];
                sourceAlliances = payload.sourceAlliances || [];
            }
        } catch (e) {
            console.error("[AWS Merge State] Public Fetch Error:", e);
        }

        // 2. Fetch Primary Roster
        let roster = [];
        try {
            roster = await getKingdomRoster(kingdomId);
        } catch (e) {
            console.error("[AWS Roster] Public Fetch Error:", e);
        }

        // 3. Fetch Secondary Roster if provided
        let secondaryRoster = [];
        if (secondaryKd) {
            try {
                secondaryRoster = await getKingdomRoster(secondaryKd);
            } catch (e) {
                console.error("[AWS Secondary Roster] Public Fetch Error:", e);
            }
        }

        return NextResponse.json({
            success: true,
            targets,
            sourceAlliances,
            roster,
            secondaryRoster
        }, { status: 200 });

    } catch (error) {
        console.error("Public Alliance Merge API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
