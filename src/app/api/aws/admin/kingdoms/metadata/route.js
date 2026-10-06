import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKingdomMetadata, setKingdomMetadata, getAllTrackedKingdoms } from "@/lib/awsDynamo";

export async function GET(req) {
    try {
        const session = await auth();
        if (!session || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized. SuperAdmin only." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const kingdomId = searchParams.get("kingdomId");
        
        // If no specific kingdom provided, fetch all tracked kingdoms and their metadata
        if (!kingdomId) {
            const kingdoms = await getAllTrackedKingdoms();
            const metadataPromises = kingdoms.map(async (kd) => {
                const meta = await getKingdomMetadata(kd);
                return { kingdomId: kd, metadata: meta };
            });
            const results = await Promise.all(metadataPromises);
            return NextResponse.json({ kingdoms: results });
        }

        const metadata = await getKingdomMetadata(kingdomId);
        return NextResponse.json({ kingdomId, metadata });

    } catch (e) {
        console.error("API GET /api/aws/admin/kingdoms/metadata Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await auth();
        if (!session || !session.user.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized. SuperAdmin only." }, { status: 403 });
        }

        const body = await req.json();
        const { kingdomId, foundedDate, kingdomName, theKing, kingdomProgress } = body;

        if (!kingdomId) {
            return NextResponse.json({ error: "kingdomId is required." }, { status: 400 });
        }

        const success = await setKingdomMetadata(kingdomId, { foundedDate, kingdomName, theKing, kingdomProgress });
        if (!success) {
            return NextResponse.json({ error: "Failed to update Kingdom Metadata in AWS." }, { status: 500 });
        }

        return NextResponse.json({ 
            message: "Kingdom Metadata Updated Successfully.", 
            kingdomId, 
            foundedDate,
            kingdomName: kingdomName || null,
            theKing: theKing || null,
            kingdomProgress: kingdomProgress || null
        });

    } catch (e) {
        console.error("API POST /api/aws/admin/kingdoms/metadata Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
