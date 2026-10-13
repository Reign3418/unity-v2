import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
export const maxDuration = 300;


export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user || (session.user.role !== 'Admin' && !session.user.isLeader)) {
            return NextResponse.json({ error: 'Unauthorized broadcast access.' }, { status: 401 });
        }
        
        const { message, targetKingdom } = await req.json();

        if (!message || message.trim() === '') {
            return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
        }

        // Construct the webhook fetch out to the Railway Bot Instance
        const railwayUrl = 'https://unity-app-production.up.railway.app/api/system/broadcast';
        
        const response = await fetch(railwayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.UNITY_INTERNAL_SECRET}`
            },
            body: JSON.stringify({ message, targetKingdom: targetKingdom || 'ALL' })
        });

        if (!response.ok) {
            console.error('[Vercel Webhook] Railway response err:', response.status);
            return NextResponse.json({ error: 'Railway Rejected the Webhook.' }, { status: 500 });
        }

        const data = await response.json();
        return NextResponse.json({ success: true, targetsReached: data.targetsReached });

    } catch (e) {
        console.error('[Vercel Webhook] Internal Route Error:', e);
        return NextResponse.json({ error: 'Failed to initiate the broadcast pipe.' }, { status: 500 });
    }
}
