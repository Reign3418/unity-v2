import { NextResponse } from 'next/server';
export const maxDuration = 300;

import { getSystemNotifications } from '@/lib/awsDynamo';

import { auth } from '@/lib/auth';


export async function GET(req) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr) : 10;

        const notifications = await getSystemNotifications(limit);

        return NextResponse.json({ success: true, notifications }, { status: 200 });
    } catch (e) {
        console.error('[Notifications API] Error:', e);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
