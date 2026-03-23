import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveMailTemplate } from "@/lib/awsDynamo";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || (!session.user.isLeader && session.user.role !== "Admin")) {
            return NextResponse.json({ error: "High Command clearance required to alter Mail Template databases." }, { status: 403 });
        }

        const body = await req.json();
        const { templateName, templateText } = body;

        if (!templateName || !templateText) {
            return NextResponse.json({ error: "Invalid Template Data. Ensure a Title and Body are provided." }, { status: 400 });
        }

        if (templateText.length > 2000) {
            return NextResponse.json({ error: "Template body exceeds the 2,000 character hard limit imposed by game engine logic." }, { status: 400 });
        }

        const kingdomId = session.user.kingdomId || "Global";
        const result = await saveMailTemplate(kingdomId, session.user.id, templateName, templateText);

        return NextResponse.json({ success: true, data: result, message: "Template securely compiled." });

    } catch (error) {
        console.error("[API/AWS/MAIL/SAVE] Fatal Error:", error);
        return NextResponse.json({ error: "Internal Server Error compiling Mail Template matrix." }, { status: 500 });
    }
}
