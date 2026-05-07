import { NextResponse } from 'next/server';
export const maxDuration = 300;

import { setKingdomSupporterStatus, createSystemNotification } from '@/lib/awsDynamo';


export async function POST(req) {
    try {
        // Ko-fi sends data as x-www-form-urlencoded
        const formData = await req.formData();
        const dataString = formData.get('data');
        
        if (!dataString) {
            return NextResponse.json({ error: 'Missing payload data' }, { status: 400 });
        }

        const payload = JSON.parse(dataString);
        
        // 1. Verify Authentication
        const expectedToken = process.env.KOFI_WEBHOOK_TOKEN;
        if (!expectedToken) {
            console.error('[Ko-Fi Webhook] Endpoint triggered but KOFI_WEBHOOK_TOKEN is missing in .env');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        
        if (payload.verification_token !== expectedToken) {
            console.warn(`[Ko-Fi Webhook] Authentication failed. Token mismatch.`);
            return NextResponse.json({ error: 'Unauthorized payload origin' }, { status: 403 });
        }

        console.log(`[Ko-Fi Webhook] Processing legitimate payload ID: ${payload.message_id} (${payload.type})`);

        // 2. Parse Kingdom specific syntax out of the message
        // Detects patterns like: KD 3418, KD3418, Kingdom 3418, K3418, k3418
        const message = payload.message || '';
        const kdRegex = /(?:KD|KINGDOM|K)\s*#?\s*(\d{4})/i;
        const match = message.match(kdRegex);

        const supporterName = payload.is_public ? (payload.from_name || 'A Supporter') : 'Anonymous';

        if (match && match[1]) {
            const kingdomId = match[1];
            console.log(`[Ko-Fi Webhook] Extracted Kingdom ID: ${kingdomId}. Initiating Database Elevation.`);
            
            // 3. Elevate the Kingdom via AWS DynamoDB
            const success = await setKingdomSupporterStatus(kingdomId, true);
            
            if (success) {
                // 4. Trigger the Global Notification Bell alert
                const alertMessage = `${supporterName} unlocked Unified Analytical clearance for Kingdom ${kingdomId}!`;
                await createSystemNotification('Supporter Network Activated', alertMessage, 'success');
                
                return NextResponse.json({ 
                    success: true, 
                    message: `Supporter status granted for KD ${kingdomId} and notification broadcasted.` 
                }, { status: 200 });
            } else {
                return NextResponse.json({ error: 'Database transaction failed.' }, { status: 500 });
            }
        } else {
             // Supporter donated, but didn't specify a kingdom correctly
             console.log(`[Ko-Fi Webhook] No valid Kingdom identified in message: "${message}". Registering global ping anyway.`);
             await createSystemNotification(
                 'Anonymous Contribution Received', 
                 'A new Supporter has contributed! If a Kingdom identifier wasn\'t detected, contact an Administrator to map the unlock.', 
                 'info'
             );
             return NextResponse.json({ success: true, message: 'Processed donation without Kingdom specification.' }, { status: 200 });
        }

    } catch (e) {
        console.error('[Ko-Fi Webhook] Exception:', e);
        return NextResponse.json({ error: 'Webhook processing exception', details: e.message }, { status: 500 });
    }
}
