import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllUsers, getAllTenants, purgeKingdomDatabase } from "@/lib/awsDynamo";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session || (!session.user.isLeader && session.user.role !== "Admin")) {
      return NextResponse.json({ error: "Unauthorized. Level 5 Clearance Required." }, { status: 403 });
    }

    // Run both DynamoDB scans continuously over parallel threads
    const [users, tenants] = await Promise.all([
      getAllUsers(),
      getAllTenants()
    ]);

    // Attach current Environment Gateway strings so the Admin knows which DB is active
    return NextResponse.json({
      success: true,
      env: {
        region: process.env.AWS_REGION || "Unknown",
        tableName: process.env.AWS_TABLE_NAME || "Not Mapped"
      },
      users,
      tenants
    }, { status: 200 });

  } catch (error) {
    console.error("[API/AWS/Admin] Matrix Core Failure:", error);
    return NextResponse.json({ error: "Internal Server Error retrieving Admin Matrix arrays." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session || (!session.user.isLeader && session.user.role !== "Admin")) {
      return NextResponse.json({ error: "Unauthorized. Level 5 Clearance Required." }, { status: 403 });
    }

    const body = await req.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action directive." }, { status: 400 });
    }

    // Danger Zone: Mass Purge
    if (action === "PURGE_KINGDOM") {
      const { kingdomId } = payload;
      if (!kingdomId) return NextResponse.json({ error: "Missing Kingdom ID for Purge." }, { status: 400 });
      
      const deletedCount = await purgeKingdomDatabase(kingdomId);
      return NextResponse.json({ 
        success: true, 
        message: `Database Purge Complete. ${deletedCount} nodes eradicated.` 
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Unknown Admin Directive." }, { status: 400 });

  } catch (error) {
    console.error("[API/AWS/Admin] Danger Zone Failure:", error);
    return NextResponse.json({ error: "Internal Server Error executing Admin Action." }, { status: 500 });
  }
}
