import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMailTemplates } from "@/lib/awsDynamo";

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || (!session.user.isLeader && session.user.role !== "Admin")) {
            return NextResponse.json({ error: "High Command clearance required to pull isolated Kingdom Templates." }, { status: 403 });
        }

        const kingdomId = session.user.kingdomId || "Global";
        const templates = await getMailTemplates(kingdomId);

        return NextResponse.json({ success: true, templates }, { status: 200 });

    } catch (error) {
        console.error("[API/AWS/MAIL/LOAD] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error querying Kingdom Template array." }, { status: 500 });
    }
}
