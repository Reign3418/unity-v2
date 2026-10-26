import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

function sanitizePublicMergeGovernor(g) {
    return {
        id: String(g.id || ''),
        name: g.name || 'Unknown',
        alliance: g.alliance || 'None',
        cityHall: Number(g.cityHall || 25),
        power: Number(g.power || 0),
        killPoints: Number(g.killPoints || 0),
        dead: Number(g.dead || 0),
        t4Kills: Number(g.t4Kills || 0),
        t5Kills: Number(g.t5Kills || 0),
    };
}

export async function GET(req) {
    try {
        const session = await auth().catch(() => null);
        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get('kd');
        const secondaryKd = searchParams.get('secondary');

        if (!kingdomId) {
            return NextResponse.json({ error: "Missing Kingdom ID." }, { status: 400 });
        }

        // 1. Fetch Alliance Merge State first
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

        // Block unauthenticated bulk scraping if no active Alliance Merge plan exists for this kingdom
        const hasActiveMergePlan = targets.length > 0 || sourceAlliances.length > 0;
        if (!session?.user && !hasActiveMergePlan) {
            return NextResponse.json(
                { error: "No active shared Alliance Merge workspace exists for this Kingdom." },
                { status: 401 }
            );
        }

        // 2. Fetch Primary Roster and project ONLY the 9 public merge fields
        let roster = [];
        try {
            const rawRoster = await getKingdomRoster(kingdomId, { includeSovereignInternal: false });
            roster = rawRoster.map(sanitizePublicMergeGovernor);
        } catch (e) {
            console.error("[AWS Roster] Public Fetch Error:", e);
        }

        // 3. Fetch Secondary Roster if provided
        let secondaryRoster = [];
        if (secondaryKd) {
            try {
                const rawSecondary = await getKingdomRoster(secondaryKd, { includeSovereignInternal: false });
                secondaryRoster = rawSecondary.map(sanitizePublicMergeGovernor);
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
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
