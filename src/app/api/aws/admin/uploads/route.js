import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

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

        const params = {
            TableName: tableName,
            FilterExpression: "begins_with(PK, :datesPrefix) AND begins_with(SK, :scanPrefix)",
            ExpressionAttributeValues: {
                ":datesPrefix": { S: "DATES#" },
                ":scanPrefix": { S: "SCAN#" }
            }
        };

        const result = await dbClient.send(new ScanCommand(params));
        
        const uploads = [];
        if (result.Items) {
            for (const item of result.Items) {
                const attrs = item.attributes?.M || {};
                uploads.push({
                    kingdomId: item.PK.S.replace("DATES#", ""),
                    scanDate: attrs.scanDate?.S || "",
                    rowCount: parseInt(attrs.rowCount?.N || "0"),
                    uploaderId: attrs.uploaderId?.S || "Unknown Pipeline",
                    uploaderName: attrs.uploaderName?.S || "Legacy System Action",
                    sourceFile: attrs.sourceFile?.S || "Legacy Upload File"
                });
            }
        }

        // Sort dynamically: Chronological (Newest First)
        uploads.sort((a,b) => new Date(b.scanDate) - new Date(a.scanDate));

        return NextResponse.json({ uploads }, { status: 200 });

    } catch (error) {
        console.error("[AWS/Admin/Uploads] Execution Refusal:", error);
        return NextResponse.json({ error: "Structural logic flaw executing Table Scan." }, { status: 500 });
    }
}
