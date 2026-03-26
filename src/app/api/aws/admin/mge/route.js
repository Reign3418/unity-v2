import { DynamoDBClient, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const dbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

/**
 * GET: Fetches the active MGE Plan layout for a requested Kingdom.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const kingdomId = searchParams.get('kd');

        if (!kingdomId) {
            return new Response(JSON.stringify({ error: "Missing Kingdom ID" }), { status: 400 });
        }

        const params = {
            TableName: process.env.AWS_TABLE_NAME,
            Key: {
                'PK': { S: `MGE_PLAN#${kingdomId}` },
                'SK': { S: 'CURRENT' }
            }
        };

        const result = await dbClient.send(new GetItemCommand(params));
        
        if (result.Item && result.Item.data && result.Item.data.S) {
            return new Response(result.Item.data.S, { status: 200 });
        } else {
            // Return empty MGE framework if none exists
            return new Response(JSON.stringify({ targets: [], sources: [] }), { status: 200 });
        }

    } catch (e) {
        console.error("[AWS MGE] Fetch Error:", e);
        return new Response(JSON.stringify({ error: "Internal Database Sync Error" }), { status: 500 });
    }
}

/**
 * POST: Overwrites the active MGE Plan layout for a requested Kingdom.
 * Requires Authentication since it's a structural command array.
 */
export async function POST(request) {
    try {
        const session = await auth();
        
        // Ensure user is authenticated to push command structures
        if (!session) {
            return new Response(JSON.stringify({ error: "Unauthorized Command Console Access" }), { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const kingdomId = searchParams.get('kd');
        
        if (!kingdomId) {
            return new Response(JSON.stringify({ error: "Missing Kingdom Target Designation" }), { status: 400 });
        }

        const body = await request.json(); // { targets, sources }

        const putParams = {
            TableName: process.env.AWS_TABLE_NAME,
            Item: {
                'PK': { S: `MGE_PLAN#${kingdomId}` },
                'SK': { S: 'CURRENT' },
                'data': { S: JSON.stringify(body) },
                'lastEditor': { S: session.user?.name || 'Unknown Officer' },
                'lastEditedAt': { S: new Date().toISOString() }
            }
        };

        await dbClient.send(new PutItemCommand(putParams));
        
        return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), { status: 200 });
        
    } catch (e) {
        console.error("[AWS MGE] Dispatch Error:", e);
        return new Response(JSON.stringify({ error: "Internal Database Write Failure" }), { status: 500 });
    }
}
