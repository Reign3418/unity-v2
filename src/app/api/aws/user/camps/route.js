import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const maxDuration = 300;
import { getUserCamps, saveUserCamps } from "@/lib/awsDynamo";

export async function GET(req) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const camps = await getUserCamps(session.user.id);
        return NextResponse.json({ camps }, { status: 200 });
    } catch (e) {
        console.error("[API/User/Camps] GET Error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const body = await req.json();
        const { camps } = body;

        if (!Array.isArray(camps)) {
            return NextResponse.json({ error: "Invalid payload format. Expected array of camps." }, { status: 400 });
        }

        const success = await saveUserCamps(session.user.id, camps);
        
        if (success) {
            return NextResponse.json({ message: "Saved successfully" }, { status: 200 });
        } else {
            return NextResponse.json({ error: "Database write failed." }, { status: 500 });
        }
    } catch (e) {
        console.error("[API/User/Camps] POST Error:", e);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
