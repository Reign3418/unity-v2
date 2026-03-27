import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');

    if (!kingdomId) {
      return NextResponse.json({ error: "Missing Kingdom ID." }, { status: 400 });
    }

    const { DynamoDBClient, GetItemCommand } = await import('@aws-sdk/client-dynamodb');
    const dbClient = new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        }
    });

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
        return NextResponse.json({ success: true, targets: payload.targets || [], sourceAlliances: payload.sourceAlliances || [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, targets: [], sourceAlliances: [] }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Merge] Retrieval Error:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Merge State." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session || (!session.user.isLeader && !session.user.isSuperAdmin)) {
      return NextResponse.json({ error: "Unauthorized. R4 Status Required for State Manipulation." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kingdomId = searchParams.get('kd');
    
    if (!kingdomId) {
      return NextResponse.json({ error: "Missing Kingdom ID." }, { status: 400 });
    }

    const body = await req.json();
    const { targets, sourceAlliances } = body;

    const { DynamoDBClient, PutItemCommand } = await import('@aws-sdk/client-dynamodb');
    const dbClient = new DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        }
    });

    const payloadString = JSON.stringify({ targets: targets || [], sourceAlliances: sourceAlliances || [] });

    const params = {
        TableName: process.env.AWS_TABLE_NAME,
        Item: {
            'PK': { S: `ALLIANCE_MERGE#${kingdomId}` },
            'SK': { S: 'STATE' },
            'payload': { S: payloadString },
            'updatedBy': { S: session.user.id },
            'updatedAt': { S: new Date().toISOString() }
        }
    };

    await dbClient.send(new PutItemCommand(params));
    
    return NextResponse.json({ success: true, message: "Alliance Merge State Synced" }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Merge] Sync Error:", error);
    return NextResponse.json({ error: "Internal Server Error syncing Merge State." }, { status: 500 });
  }
}
