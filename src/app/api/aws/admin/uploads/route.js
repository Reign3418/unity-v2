import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const session = await auth();
        // Force authentication and verify the user has Admin rights
        if (!session || (session.user.role !== "Admin" && !session.user.isLeader)) {
            return NextResponse.json({ error: "High Command Clearance Required." }, { status: 403 });
        }

        const tableName = process.env.AWS_TABLE_NAME;
        if (!tableName) throw new Error("AWS_TABLE_NAME is missing.");

        const dbClient = new DynamoDBClient({
            region: process.env.AWS_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        const [tenants, users] = await Promise.all([
            import("@/lib/awsDynamo").then(m => m.getAllTenants()),
            import("@/lib/awsDynamo").then(m => m.getAllUsers())
        ]);

        const kingdoms = new Set();
        tenants.forEach(t => {
            if (t.kingdomId) kingdoms.add(t.kingdomId);
            if (t.allowedKingdoms && Array.isArray(t.allowedKingdoms)) {
                t.allowedKingdoms.forEach(k => kingdoms.add(k));
            }
        });
        users.forEach(u => {
            if (u.attributes?.targetKingdom?.S) kingdoms.add(u.attributes.targetKingdom.S);
            if (u.attributes?.kingdomId?.S) kingdoms.add(u.attributes.kingdomId.S);
        });
        
        // Add hardcoded backups for common tracked kingdoms just in case
        ["3155", "3418", "3690", "3582", "3598", "1302", "2338", "4025", "3701"].forEach(k => kingdoms.add(k));

        try {
            const { GetItemCommand } = await import("@aws-sdk/client-dynamodb");
            const configResult = await dbClient.send(new GetItemCommand({
                TableName: tableName,
                Key: { 'PK': { S: 'SYSTEM#CONFIG' }, 'SK': { S: 'TRACKED_KINGDOMS' } }
            }));
            if (configResult.Item && configResult.Item.kingdoms && configResult.Item.kingdoms.SS) {
                configResult.Item.kingdoms.SS.forEach(k => kingdoms.add(k));
            }
        } catch(e) { console.error("Global config tracking absent:", e.message); }

        const { QueryCommand } = await import("@aws-sdk/client-dynamodb");
        const uploads = [];

        await Promise.all(Array.from(kingdoms).map(async (kd) => {
            try {
                const res = await dbClient.send(new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: "PK = :pk",
                    ExpressionAttributeValues: {
                        ":pk": { S: `DATES#${kd}` }
                    }
                }));
                
                if (res.Items) {
                    for (const item of res.Items) {
                        const attrs = item.attributes?.M || {};
                        uploads.push({
                            kingdomId: kd,
                            scanDate: attrs.scanDate?.S || "",
                            rowCount: parseInt(attrs.rowCount?.N || "0"),
                            uploaderId: (attrs.uploaderId?.S && attrs.uploaderId.S.trim() !== "System" && attrs.uploaderId.S.trim() !== "") ? attrs.uploaderId.S : "Unknown Pipeline",
                            uploaderName: (attrs.uploaderName?.S && attrs.uploaderName.S.trim() !== "") ? attrs.uploaderName.S : "Legacy System Action",
                            sourceFile: (attrs.sourceFile?.S && attrs.sourceFile.S.trim() !== "") ? attrs.sourceFile.S : "Legacy Upload File"
                        });
                    }
                }
            } catch (e) {
                console.error(`Query Failed for Kingdom ${kd}:`, e.message);
            }
        }));

        // Sort dynamically: Chronological (Newest First)
        uploads.sort((a,b) => {
            const dateA = new Date((a.scanDate || "").split('T')[0].split('_')[0]);
            const dateB = new Date((b.scanDate || "").split('T')[0].split('_')[0]);
            return dateB - dateA;
        });

        return NextResponse.json({ uploads: uploads.slice(0, 100) }, { status: 200 });

    } catch (error) {
        console.error("[AWS/Admin/Uploads] Execution Refusal:", error);
        return NextResponse.json({ error: "Structural logic flaw executing Table Scan." }, { status: 500 });
    }
}
