import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateGovernorAuth, deleteGovernorAuth, unlockGovernorAuth, getGovernorAuth } from "@/lib/awsDynamo";
import { logEvent } from "@/lib/eventLogger";
import { GOVERNOR_ROLES } from "@/lib/governorRoles";

/** Super-admin gate shared by every governor management action. */
async function requireSuperAdmin() {
    const session = await auth();
    if (!session?.user?.isSuperAdmin) return null;
    return session;
}

function cleanGovernorId(value) {
    const id = String(value || "").replace(/\D/g, "");
    return id.length >= 6 && id.length <= 20 ? id : null;
}

/** Audit trail: who did what to which governor, and the before/after values. */
function auditContext(session, req) {
    return {
        userEmail: session.user?.username || session.user?.id || "admin",
        userAgent: req.headers.get("user-agent") || ""
    };
}

export async function POST(req) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized. SuperAdmin only." }, { status: 403 });
        }

        const body = await req.json();
        const governorId = cleanGovernorId(body.governorId);
        const kingdomId = String(body.kingdomId || "").replace(/\D/g, "");
        const role = String(body.role || "");

        if (!governorId || !kingdomId || !role) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }
        // Only canonical roles: anything else would be stored but silently grant nothing.
        if (!GOVERNOR_ROLES.includes(role)) {
            return NextResponse.json({ error: "Invalid role." }, { status: 400 });
        }

        const before = await getGovernorAuth(governorId);
        if (!before) {
            return NextResponse.json({ error: "Governor not found." }, { status: 404 });
        }

        const success = await updateGovernorAuth(governorId, kingdomId, role);
        if (!success) {
            return NextResponse.json({ error: "Failed to update Governor Authentication in database." }, { status: 500 });
        }

        logEvent("ADMIN_GOVERNOR_UPDATED", {
            governorId,
            governorName: before.governorName,
            roleBefore: before.role,
            roleAfter: role,
            kingdomBefore: before.kingdomId,
            kingdomAfter: kingdomId
        }, auditContext(session, req)).catch(() => {});

        return NextResponse.json({ message: "Governor updated successfully", governorId, kingdomId, role });

    } catch (e) {
        console.error("API POST /api/aws/admin/governors Error", e);
        return NextResponse.json({ error: "Failed to update governor." }, { status: 500 });
    }
}

/** Account actions. Currently: { action: "unlock", governorId } — clears lock + failed PIN counter. */
export async function PATCH(req) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized. SuperAdmin only." }, { status: 403 });
        }

        const body = await req.json();
        const governorId = cleanGovernorId(body.governorId);
        if (!governorId) {
            return NextResponse.json({ error: "Governor ID is required." }, { status: 400 });
        }
        if (body.action !== "unlock") {
            return NextResponse.json({ error: "Unknown action." }, { status: 400 });
        }

        const before = await getGovernorAuth(governorId);
        if (!before) {
            return NextResponse.json({ error: "Governor not found." }, { status: 404 });
        }

        const success = await unlockGovernorAuth(governorId);
        if (!success) {
            return NextResponse.json({ error: "Failed to unlock governor." }, { status: 500 });
        }

        logEvent("ADMIN_GOVERNOR_UNLOCKED", {
            governorId,
            governorName: before.governorName,
            role: before.role,
            wasLockedAt: before.lockedAt,
            failedAttemptsBefore: before.failedAttempts
        }, auditContext(session, req)).catch(() => {});

        return NextResponse.json({ message: "Governor unlocked", governorId });

    } catch (e) {
        console.error("API PATCH /api/aws/admin/governors Error", e);
        return NextResponse.json({ error: "Failed to unlock governor." }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized. SuperAdmin only." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const governorId = cleanGovernorId(searchParams.get("governorId"));

        if (!governorId) {
            return NextResponse.json({ error: "Governor ID is required." }, { status: 400 });
        }

        const before = await getGovernorAuth(governorId);

        const success = await deleteGovernorAuth(governorId);
        if (!success) {
            return NextResponse.json({ error: "Failed to delete Governor Authentication from database." }, { status: 500 });
        }

        logEvent("ADMIN_GOVERNOR_DELETED", {
            governorId,
            governorName: before?.governorName,
            role: before?.role,
            kingdomId: before?.kingdomId
        }, auditContext(session, req)).catch(() => {});

        return NextResponse.json({ message: "Governor registration removed successfully", governorId });

    } catch (e) {
        console.error("API DELETE /api/aws/admin/governors Error", e);
        return NextResponse.json({ error: "Failed to delete governor." }, { status: 500 });
    }
}
