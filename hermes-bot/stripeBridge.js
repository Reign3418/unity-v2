/**
 * ============================================================================
 * VALHEON HERMES — DIRECT STRIPE CHECKOUT & AUTO-LICENSE BRIDGE (stripeBridge.js)
 * ============================================================================
 * Zero-dependency (native Node 22 fetch) Stripe Checkout & Payment Link bridge
 * that works 100% standalone inside Discord BEFORE valheon.com goes live!
 *
 * How it works without needing a public website webhook:
 *   1. Uses STRIPE_SECRET_KEY (sk_live_... or sk_test_...) in .env.local to call
 *      POST https://api.stripe.com/v1/checkout/sessions directly from HERMES,
 *      OR uses static Stripe Payment Links (https://buy.stripe.com/...) with
 *      ?client_reference_id=<userId>_<planKey>.
 *   2. Embeds { discord_user_id, discord_username, plan_key, guild_id } directly
 *      inside the Stripe Checkout Session metadata.
 *   3. Polls/verifies GET https://api.stripe.com/v1/checkout/sessions/{id} when
 *      the buyer clicks [✅ Verify Stripe Payment & Auto-Deploy], automatically:
 *        - Licensing their Server ID in guild_tiers.json
 *        - Granting their @🏰 Crowned Sovereign role in Valheon HQ
 *        - Launching the 1-Click Server Architect modal
 *        - Relaying a verified Payment Receipt to #📡-central-support-and-relaunch-hub!
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATHS = [
  path.resolve(__dirname, './.env.railway'),
  path.resolve(__dirname, '../.env.local'),
];

function readEnvVars() {
  const vars = { ...process.env };
  for (const envPath of ENV_PATHS) {
    try {
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
          if (m && !vars[m[1]]) vars[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
        }
      }
    } catch {}
  }
  return vars;
}

export const STRIPE_CATALOG = {
  KINGDOM_39: {
    key: 'KINGDOM_39',
    name: '🏰 1-Click Home Kingdom War Server + Common Hermes',
    description:
      '21 Roles, 30+ Channels, Alliance Sectors, R4 Ticket Desk, 30v30 AoO Roster, War Timers & Lifetime Free Repair Guarantee.',
    amountCents: 3900,
    priceDisplay: '$39.00 USD',
    blueprintType: 'KINGDOM_WAR_SERVER',
    tierGranted: 'COMMON',
    launchModalCustomId: 'hermes_launch_kd_modal',
    envLinkKey: 'STRIPE_LINK_KINGDOM_39',
  },
  KINGDOM_LEGENDARY_54: {
    key: 'KINGDOM_LEGENDARY_54',
    name: '🟠 1-Click Home Kingdom Server + Legendary Hermes (24h Bundle)',
    description:
      'Full 1-Click Home Kingdom Server ($39) + 24-Hour "Writer of History" Legendary Hermes Unlock (+$15) — Zero-Grid Title Queue, 17-Lang Flag Translator, Peerless Scholar 10/10 Midterm Packet, Local OCR & 24h UTC Uptime Matrix ($0/mo recurring).',
    amountCents: 5400,
    priceDisplay: '$54.00 USD (Save $10)',
    blueprintType: 'KINGDOM_WAR_SERVER',
    tierGranted: 'LEGENDARY',
    launchModalCustomId: 'hermes_launch_kd_modal',
    envLinkKey: 'STRIPE_LINK_KINGDOM_54',
  },
  LEGENDARY_UPGRADE_15: {
    key: 'LEGENDARY_UPGRADE_15',
    name: '🟠 Legendary Hermes Bot Upgrade (24-Hour Launch Offer)',
    description:
      'One-time upgrade from Common Hermes to Legendary Hermes within 24 hours of deployment ($0/mo recurring).',
    amountCents: 1500,
    priceDisplay: '$15.00 USD (24h Offer)',
    blueprintType: 'UPGRADE_ONLY',
    tierGranted: 'LEGENDARY',
    launchModalCustomId: 'hermes_launch_kd_modal',
    envLinkKey: 'STRIPE_LINK_LEGENDARY_15',
  },
  LEGENDARY_UPGRADE_25: {
    key: 'LEGENDARY_UPGRADE_25',
    name: '🟠 Legendary Hermes Bot Upgrade (Standard One-Time)',
    description:
      'Standard one-time upgrade from Common Hermes to Legendary Hermes ($0/mo recurring).',
    amountCents: 2500,
    priceDisplay: '$25.00 USD',
    blueprintType: 'UPGRADE_ONLY',
    tierGranted: 'LEGENDARY',
    launchModalCustomId: 'hermes_launch_kd_modal',
    envLinkKey: 'STRIPE_LINK_LEGENDARY_25',
  },
  KVK_DIPLO_9: {
    key: 'KVK_DIPLO_9',
    name: '🕊️ 1-Click KvK Diplomacy Summit Server (8–16 Kingdoms)',
    description:
      'Turnkey Lost Kingdom Diplomacy Server: Crowned King & Diplomat Conclave, Dynamic @KD #1-8 Roles, 1v1 Bilateral Embassy Maker, 17-Lang Translator & Free Repair Guarantee.',
    amountCents: 900,
    priceDisplay: '$9.00 USD',
    blueprintType: 'KVK_DIPLO_SERVER',
    tierGranted: 'LEGENDARY',
    launchModalCustomId: 'hermes_launch_diplo_modal',
    envLinkKey: 'STRIPE_LINK_DIPLO_9',
  },
  KVK_COALITION_9: {
    key: 'KVK_COALITION_9',
    name: '⚔️ 1-Click Allied Coalition War Server (Spy-Proof Camp OS)',
    description:
      'Turnkey Allied Camp War Server: Joint Multi-Kingdom Rally & Garrison Calls, 17-Lang Canonical Glossary Bridge, UTC Pass Timers, Voice Rollcall & 24h UTC Shift-Handoff Uptime.',
    amountCents: 900,
    priceDisplay: '$9.00 USD',
    blueprintType: 'KVK_COALITION_SERVER',
    tierGranted: 'LEGENDARY',
    launchModalCustomId: 'hermes_launch_coalition_modal',
    envLinkKey: 'STRIPE_LINK_COALITION_9',
  },
  KVK_BUNDLE_15: {
    key: 'KVK_BUNDLE_15',
    name: '🔥 72-Hour KvK Diplo + Allied Coalition Bundle (Both Servers)',
    description:
      'Includes BOTH the 1-Click KvK Diplomacy Summit Server ($9) AND your private 1-Click Allied Coalition War Server ($9) for $15 total within 72 hours (Save $3!).',
    amountCents: 1500,
    priceDisplay: '$15.00 USD (Save $3)',
    blueprintType: 'KVK_BUNDLE_BOTH',
    tierGranted: 'LEGENDARY',
    launchModalCustomId: 'hermes_launch_diplo_modal',
    envLinkKey: 'STRIPE_LINK_BUNDLE_15',
  },
};

// In-memory store of created Stripe Checkout Sessions by userId
const PENDING_SESSIONS = new Map();

/**
 * Creates a real Stripe-hosted Checkout Session (if STRIPE_SECRET_KEY is set),
 * OR returns a configured Stripe Payment Link (if STRIPE_LINK_* is set),
 * OR returns a staging/sandbox checkout preview URL.
 */
export async function createStripeCheckoutForDiscord({
  planKey = 'KINGDOM_39',
  userId,
  username,
  guildId,
}) {
  const env = readEnvVars();
  const item = STRIPE_CATALOG[planKey] || STRIPE_CATALOG.KINGDOM_39;
  const stripeSecret = env.STRIPE_SECRET_KEY || '';
  const staticLink = env[item.envLinkKey] || env.STRIPE_PAYMENT_LINK || '';

  // 1. If STRIPE_SECRET_KEY is configured, dynamically generate a Stripe-hosted Checkout Session!
  if (stripeSecret && stripeSecret.startsWith('sk_')) {
    try {
      const form = new URLSearchParams();
      form.append('mode', 'payment');
      form.append('success_url', 'https://discord.com/channels/1563618222895407166');
      form.append('cancel_url', 'https://discord.com/channels/1563618222895407166');
      form.append('client_reference_id', `${userId}_${planKey}`);
      form.append('line_items[0][price_data][currency]', 'usd');
      form.append('line_items[0][price_data][unit_amount]', String(item.amountCents));
      form.append('line_items[0][price_data][product_data][name]', item.name);
      form.append('line_items[0][price_data][product_data][description]', item.description);
      form.append('line_items[0][quantity]', '1');
      form.append('metadata[discord_user_id]', String(userId));
      form.append('metadata[discord_username]', String(username || 'Governor'));
      form.append('metadata[plan_key]', item.key);
      form.append('metadata[source_guild_id]', String(guildId || ''));

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        PENDING_SESSIONS.set(`${userId}_${planKey}`, {
          sessionId: data.id,
          planKey: item.key,
          userId,
          username,
          createdAt: Date.now(),
        });
        return {
          mode: 'LIVE_STRIPE_SESSION',
          checkoutUrl: data.url,
          sessionId: data.id,
          item,
        };
      }
    } catch (err) {
      console.error('[HERMES Stripe Session Error]:', err.message);
    }
  }

  // 2. If a static Stripe Payment Link (https://buy.stripe.com/...) is in .env.local
  if (staticLink && staticLink.startsWith('http')) {
    const sep = staticLink.includes('?') ? '&' : '?';
    const taggedUrl = `${staticLink}${sep}client_reference_id=${encodeURIComponent(`${userId}_${planKey}`)}`;
    return {
      mode: 'STATIC_PAYMENT_LINK',
      checkoutUrl: taggedUrl,
      sessionId: `link_${userId}_${planKey}`,
      item,
    };
  }

  // 3. Fallback when STRIPE_SECRET_KEY / STRIPE_LINK_* hasn't been pasted into .env.local yet
  return {
    mode: 'SANDBOX_STAGED',
    checkoutUrl: `https://dashboard.stripe.com/payment-links`,
    sessionId: `sandbox_${userId}_${planKey}`,
    item,
  };
}

/**
 * Verifies whether a user's Stripe Checkout Session has been paid (via Stripe REST API)
 */
export async function verifyStripePaymentStatus({ userId, planKey }) {
  const env = readEnvVars();
  const stripeSecret = env.STRIPE_SECRET_KEY || '';
  const pending = PENDING_SESSIONS.get(`${userId}_${planKey}`);

  if (stripeSecret && stripeSecret.startsWith('sk_')) {
    try {
      if (pending?.sessionId && pending.sessionId.startsWith('cs_')) {
        const res = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${pending.sessionId}`,
          {
            headers: { Authorization: `Bearer ${stripeSecret}` },
          }
        );
        const session = await res.json();
        if (res.ok && session.payment_status === 'paid') {
          return {
            paid: true,
            mode: 'LIVE_VERIFIED',
            sessionId: session.id,
            amountUsd: (session.amount_total || 0) / 100,
            customerEmail: session.customer_details?.email || 'Verified Stripe Buyer',
          };
        }
      }

      // Also scan last 10 checkout sessions in case they paid via a static Payment Link!
      const listRes = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=10', {
        headers: { Authorization: `Bearer ${stripeSecret}` },
      });
      const listData = await listRes.json();
      const matched = (listData?.data || []).find(
        (s) =>
          s.payment_status === 'paid' &&
          (s.client_reference_id === `${userId}_${planKey}` ||
            s.client_reference_id === String(userId) ||
            s.metadata?.discord_user_id === String(userId))
      );
      if (matched) {
        return {
          paid: true,
          mode: 'LIVE_VERIFIED',
          sessionId: matched.id,
          amountUsd: (matched.amount_total || 0) / 100,
          customerEmail: matched.customer_details?.email || 'Verified Stripe Buyer',
        };
      }

      return {
        paid: false,
        mode: 'LIVE_PENDING',
        message:
          '⏳ Stripe Checkout is still awaiting payment completion. Complete checkout in your browser, then click **[✅ Verify Stripe Payment & Auto-Deploy]** again!',
      };
    } catch (err) {
      return {
        paid: false,
        mode: 'ERROR',
        message: `⚠️ Stripe verification error: ${err.message}`,
      };
    }
  }

  // If in Sandbox / Pre-Key mode, allow instant sandbox verification for Moderator Training!
  return {
    paid: true,
    mode: 'SANDBOX_BYPASS',
    sessionId: `sandbox_verified_${Date.now()}`,
    amountUsd: (STRIPE_CATALOG[planKey]?.amountCents || 3900) / 100,
    customerEmail: 'Sandbox Moderator Test ($0.00)',
  };
}
