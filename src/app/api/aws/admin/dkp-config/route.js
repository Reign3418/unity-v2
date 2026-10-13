import { getKingdomDkpMatrix, setKingdomDkpMatrix } from '@/lib/awsDynamo';
import { auth } from '@/lib/auth';
export const maxDuration = 300;

import { NextResponse } from 'next/server';


export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const kd = searchParams.get('kd');
    
    if (!kd) {
        return NextResponse.json({ error: "Missing Kingdom ID" }, { status: 400 });
    }

    try {
        const matrix = await getKingdomDkpMatrix(kd);
        return NextResponse.json({ config: matrix || null }, { status: 200 });
    } catch(e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch Kingdom Matrix" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { kd, configData } = body;
        
        if (!kd || !configData) {
            return NextResponse.json({ error: "Missing Parameters" }, { status: 400 });
        }

        const isAdmin = session.user.role === 'Admin';
        const isAuthorizedLeader = session.user.isLeader && (
            String(session.user.tenant?.kingdomId) === String(kd) ||
            (Array.isArray(session.user.allowedKingdoms) && session.user.allowedKingdoms.map(String).includes(String(kd)))
        );
        if (!isAdmin && !isAuthorizedLeader) {
            return NextResponse.json({ error: "Insufficient clearance for this kingdom" }, { status: 403 });
        }
        
        const success = await setKingdomDkpMatrix(kd, configData);
        if (success) {
            return NextResponse.json({ success: true }, { status: 200 });
        } else {
            return NextResponse.json({ error: "DynamoDB Write Failed" }, { status: 500 });
        }
    } catch(e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to process Matrix Update payload" }, { status: 500 });
    }
}
