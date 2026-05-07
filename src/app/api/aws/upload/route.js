import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { uploadKingdomRoster } from "@/lib/awsDynamo";
import { randomUUID } from "crypto";

export async function POST(req) {
  try {
    // 1. Authenticate the Request
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Admin credentials required." }, { status: 401 });
    }

    // 2. Extract Data Boundaries
    const body = await req.json();
    const { kingdomId, rosterArray, scanDateOverride, sourceFile } = body;

    if (!kingdomId || !rosterArray || !Array.isArray(rosterArray) || rosterArray.length === 0) {
      return NextResponse.json({ error: "Corrupted Payload. Missing target Kingdom or Array structures." }, { status: 400 });
    }
    
    console.log("[DEBUG] First uploaded row:", JSON.stringify(rosterArray[0]));

    // Security Check: Only Leaders can upload data
    if (!session.user.isLeader && !session.user.isSuperAdmin) {
       return NextResponse.json({ error: "Clearance Denied. Admin Role Required to ignite AWS Uploads." }, { status: 403 });
    }

    // Cross-tenant Check
    if (!session.user.isSuperAdmin && !session.user.allowedKingdoms?.includes(kingdomId)) {
        return NextResponse.json({ error: "Access Denied. You cannot upload data to a Kingdom outside your jurisdiction." }, { status: 403 });
    }

    // 3. Ignite DynamoDB BatchWriter
    console.log(`[API/AWS/Upload] Initiating ingestion sequence: ${rosterArray.length} items for Kingdom ${kingdomId}...`);
    
    const uploaderData = {
        discordId: session.user.id,
        username: session.user.username,
        sourceFile: sourceFile || 'Unknown_File_Data',
        importTag: `UP_${randomUUID().split('-')[0].toUpperCase()}`
    };
    
    const dateKey = await uploadKingdomRoster(kingdomId, rosterArray, uploaderData, scanDateOverride);

    return NextResponse.json({ 
        success: true, 
        message: `AWS Upload Successful. ${rosterArray.length} rows written.`,
        dateKey, 
        rowCount: rosterArray.length 
    }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Upload] Ignition Failure:", error);
    return NextResponse.json({ error: "Total Structural Failure during AWS execution." }, { status: 500 });
  }
}
