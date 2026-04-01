import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { getKingdomRoster } from "@/lib/awsDynamo";

export const maxDuration = 45;

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || !session.user?.isSuperAdmin) {
            return NextResponse.json({ error: "Super Admin clearance required." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get("kd");
        const mode = searchParams.get("mode") || "dates"; // 'dates' = just return date list, 'snapshot' = full roster for a date

        if (!kingdomId) return NextResponse.json({ error: "Missing kingdom ID." }, { status: 400 });

        const tableName = process.env.AWS_TABLE_NAME;
        if (!tableName) return NextResponse.json({ error: "Table not configured." }, { status: 500 });

        // Fetch all scan dates for this kingdom
        const dateResult = await dbClient.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: { ":pk": { S: `DATES#${kingdomId}` } },
        }));

        if (!dateResult.Items?.length) {
            return NextResponse.json({ error: "No scan history found for this kingdom." }, { status: 404 });
        }

        const dates = dateResult.Items.map(i => ({
            dateKey: i.SK?.S?.replace("DATE#", "").replace("SCAN#", "") || "",
            scanDate: i.attributes?.M?.scanDate?.S || "",
            rowCount: parseInt(i.attributes?.M?.rowCount?.N || "0"),
            importTag: i.attributes?.M?.importTag?.S || "",
        }))
            .filter(d => d.dateKey && d.scanDate)
            .sort((a, b) => new Date(a.scanDate) - new Date(b.scanDate));

        if (mode === "dates") {
            return NextResponse.json({ success: true, kingdomId, dates });
        }

        // Snapshot mode: return full roster for a specific date key
        const dateKey = searchParams.get("dateKey");
        if (!dateKey) return NextResponse.json({ error: "Missing dateKey for snapshot mode." }, { status: 400 });

        // Normalize date key
        const normalizedKey = dateKey.replace(/[.#$\/\[\]\s\-:T]/g, "_").substring(0, 19);

        const snapshotResult = await dbClient.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: { ":pk": { S: `SCAN#${kingdomId}#${normalizedKey}` } },
            Limit: 300,
        }));

        const roster = (snapshotResult.Items || []).map((item, idx) => {
            const attrs = item.attributes?.M || {};
            const govId = item.SK?.S?.replace("GOV#", "") || "";
            return {
                rank: idx + 1,
                id: govId,
                name: attrs["Governor Name"]?.S || attrs["name"]?.S || `Governor ${govId}`,
                power: parseInt(attrs["Power"]?.N || attrs["power"]?.N) || 0,
                killPoints: parseInt(attrs["Kill Points"]?.N || attrs["killPoints"]?.N) || 0,
                deads: parseInt(attrs["Deads"]?.N || attrs["dead"]?.N) || 0,
                techPower: parseInt(attrs["Tech Power"]?.N || attrs["techPower"]?.N) || 0,
                troopPower: parseInt(attrs["Troop Power"]?.N || attrs["troopPower"]?.N) || 0,
                commanderPower: parseInt(attrs["Commander Power"]?.N || attrs["commanderPower"]?.N) || 0,
            };
        }).sort((a, b) => b.power - a.power).map((p, i) => ({ ...p, rank: i + 1 }));

        return NextResponse.json({ success: true, kingdomId, dateKey, snapshotDate: dates.find(d => d.dateKey.includes(dateKey.slice(0, 10)))?.scanDate || dateKey, roster });

    } catch (e) {
        console.error("[Lab/TimelineReplay]", e);
        return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
}
