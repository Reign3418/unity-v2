import { NextResponse } from "next/server";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { auth } from "@/lib/auth";

export const maxDuration = 300;

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
    const kdParam = searchParams.get('kd');

    if (!kdParam) {
        return NextResponse.json({ error: "Missing kd parameter" }, { status: 400 });
    }

    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kdParam)) {
        return NextResponse.json({ error: "Access Denied." }, { status: 403 });
    }

    const tableName = process.env.AWS_TABLE_NAME;
    const dateParams = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': { S: `DATES#${kdParam}` } }
    };

    const dateResult = await dbClient.send(new QueryCommand(dateParams));

    if (!dateResult.Items || dateResult.Items.length === 0) {
        return NextResponse.json({ dates: [] }, { status: 200 });
    }

    const dates = dateResult.Items.map(i => {
       const attrs = i.attributes?.M || {};
       return attrs.scanDate?.S;
    }).filter(d => !!d).sort((a, b) => new Date(a) - new Date(b));

    return NextResponse.json({ dates }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/DKP/DATES] Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error compiling available chronologs." }, { status: 500 });
  }
}
