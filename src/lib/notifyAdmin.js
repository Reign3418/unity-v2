import { createSystemNotification, queuePresencePing, getGlobalConfig } from "./awsDynamo.js";

/**
 * Universal Admin Alert & Ping Dispatcher
 * Dispatches alerts across Discord Webhook, Railway Bot, DynamoDB PENDING_PINGS, and SYSTEM_NOTIFICATIONS.
 */
export async function notifyAdmin({ type = "SUPPORT", title, message, details = {}, contact = null }) {
    const timestamp = new Date().toISOString();
    const alertTitle = title || (type === "FAILED_REGISTRATION" ? "🚨 Registration Failed" : "📩 Governor Help Request");
    
    // 1. Build Formatted Discord Embed
    const isError = type === "FAILED_REGISTRATION" || type === "ERROR";
    const embedColor = isError ? 0xEF4444 : 0xF59E0B; // Red for errors, Amber for support/questions

    const fields = [];
    if (details.governorId) fields.push({ name: "Governor ID", value: String(details.governorId), inline: true });
    if (details.governorName) fields.push({ name: "Governor Name", value: String(details.governorName), inline: true });
    if (details.kingdomNumber) fields.push({ name: "Kingdom", value: `#${details.kingdomNumber}`, inline: true });
    if (details.allianceTag) fields.push({ name: "Alliance", value: `[${details.allianceTag}]`, inline: true });
    if (contact) fields.push({ name: "Contact Info", value: String(contact), inline: false });
    if (details.reason) fields.push({ name: "Issue / Reason", value: String(details.reason), inline: false });
    if (details.userMessage) fields.push({ name: "Message / Question", value: String(details.userMessage), inline: false });

    const discordPayload = {
        username: "Unity Gatekeeper",
        avatar_url: "https://unity-v2-azure.vercel.app/logo-smooth-dark.png",
        content: isError ? "⚠️ **[Unity Alert] Registration Exception Detected**" : "🔔 **[Unity Alert] Governor Support Request**",
        embeds: [{
            title: alertTitle,
            description: message || "An automated alert was triggered in the Unity Auth Gateway.",
            color: embedColor,
            fields: fields,
            footer: { text: "Kingdom 3418 High Command • Unity V2" },
            timestamp: timestamp
        }]
    };

    // 2. Transmit to Discord Webhook (if URL configured in env or DynamoDB)
    try {
        const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK || 
                           process.env.DISCORD_WEBHOOK_URL || 
                           await getGlobalConfig('ADMIN_ALERT_WEBHOOK') ||
                           await getGlobalConfig('DISCORD_WEBHOOK_URL');

        if (webhookUrl && webhookUrl.startsWith("http")) {
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(discordPayload)
            });
            console.log("[NotifyAdmin] Direct Discord webhook transmitted successfully.");
        }
    } catch (webhookErr) {
        console.warn("[NotifyAdmin] Direct webhook dispatch failed:", webhookErr.message);
    }

    // 3. Transmit to Railway Discord Bot Instance (if configured)
    try {
        const railwayUrl = process.env.RAILWAY_BOT_URL || 'https://unity-app-production.up.railway.app/api/system/broadcast';
        const secret = process.env.UNITY_INTERNAL_SECRET;
        if (secret) {
            await fetch(railwayUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${secret}`
                },
                body: JSON.stringify({
                    message: `**[${alertTitle}]** ${message || ''} ${contact ? `(Contact: ${contact})` : ''}`,
                    targetKingdom: details.kingdomNumber || '3418'
                })
            });
        }
    } catch (railwayErr) {
        // Soft fail if bot instance is sleeping
    }

    // 4. Queue Presence Ping in DynamoDB (for background Discord Bot sweepers)
    try {
        const pingSummary = `${alertTitle}: ${message || ''} ${details.reason || details.userMessage || ''}`;
        await queuePresencePing('ADMIN', details.kingdomNumber || '3418', alertTitle, pingSummary.slice(0, 500));
    } catch (pingErr) {
        console.warn("[NotifyAdmin] queuePresencePing failed:", pingErr.message);
    }

    // 5. Store in SYSTEM_NOTIFICATIONS (visible inside Admin Dashboard Console)
    try {
        await createSystemNotification(
            alertTitle,
            `${message || ''} | Details: ${JSON.stringify(details)} | Contact: ${contact || 'N/A'}`,
            isError ? 'ALERT' : 'INFO'
        );
    } catch (notifErr) {
        console.warn("[NotifyAdmin] createSystemNotification failed:", notifErr.message);
    }

    return true;
}
