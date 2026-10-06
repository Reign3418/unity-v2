import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateGovernorAuth, deleteGovernorAuth } from "@/lib/awsDynamo";

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized. SuperAdmin only." }, { status: 403 });
        }

        const body = await req.json();
        const { governorId, kingdomId, role } = body;

        if (!governorId || !kingdomId || !role) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const success = await updateGovernorAuth(governorId, kingdomId, role);
        
        if (!success) {
            return NextResponse.json({ error: "Failed to update Governor Authentication in database." }, { status: 500 });
        }

        return NextResponse.json({ message: "Governor updated successfully", governorId, kingdomId, role });

    } catch (e) {
        console.error("API POST /api/aws/admin/governors Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const session = await auth();
        if (!session || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized. SuperAdmin only." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const governorId = searchParams.get("governorId");

        if (!governorId) {
            return NextResponse.json({ error: "Governor ID is required." }, { status: 400 });
        }

        const success = await deleteGovernorAuth(governorId);
        if (!success) {
            return NextResponse.json({ error: "Failed to delete Governor Authentication from database." }, { status: 500 });
        }

        return NextResponse.json({ message: "Governor registration removed successfully", governorId });

    } catch (e) {
        console.error("API DELETE /api/aws/admin/governors Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
