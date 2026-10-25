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
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { syncCouponLedgerToAws, hydrateCouponLedgerFromAws } from './hermesAwsSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATHS = [
  path.resolve(__dirname, './.env.railway'),
  path.resolve(__dirname, '../.env.local'),
];
const COUPON_LEDGER_PATH = path.resolve(__dirname, './coupon_audit_ledger.jsonl');

// Auto-hydrate coupon ledger from AWS DynamoDB on startup if local file is missing
hydrateCouponLedgerFromAws(COUPON_LEDGER_PATH).catch(() => {});

// Strict Principal-Only Lock (Lauren Alvarado — Reign3418)
export const VALHEON_PRINCIPAL_DISCORD_ID = '184977944433786880';

/**
 * Appends a tamper-evident, SHA-256 hash-chained audit record (Who, What, Where, When, Why)
 * to coupon_audit_ledger.jsonl AND mirrors it to AWS DynamoDB (`Unity2AWSRoster`).
 */
export function appendCouponAuditLog(record) {
  try {
    let prevHash = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    let seq = 1;
    if (fs.existsSync(COUPON_LEDGER_PATH)) {
      const lines = fs
        .readFileSync(COUPON_LEDGER_PATH, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean);
      seq = lines.length + 1;
      if (lines.length > 0) {
        try {
          const lastObj = JSON.parse(lines[lines.length - 1]);
          if (lastObj.entry_hash) prevHash = lastObj.entry_hash;
        } catch {}
      }
    }

    const timestampUtc = new Date().toISOString();
    const payload = {
      seq,
      when_utc: timestampUtc,
      ...record,
      prev_hash: prevHash,
    };
    const canonical = JSON.stringify(payload);
    const entryHash = crypto.createHash('sha256').update(canonical).digest('hex');
    const finalEntry = { ...payload, entry_hash: entryHash };

    fs.appendFileSync(COUPON_LEDGER_PATH, JSON.stringify(finalEntry) + '\n', 'utf8');

    // Dual-write to AWS DynamoDB (Unity2AWSRoster -> PK = VALHEON#COUPON_LEDGER)
    const fullText = fs.readFileSync(COUPON_LEDGER_PATH, 'utf8');
    syncCouponLedgerToAws(finalEntry, fullText).catch(() => {});

    return finalEntry;
  } catch (err) {
    console.error('[HERMES Coupon Audit Ledger Error]:', err.message);
    return null;
  }
}

/**
 * Reads and cryptographically verifies the SHA-256 hash chain of coupon_audit_ledger.jsonl.
 * Strictly gated to VALHEON_PRINCIPAL_DISCORD_ID.
 */
export function getCouponAuditLedgerSummary(requestingUserId) {
  if (String(requestingUserId) !== VALHEON_PRINCIPAL_DISCORD_ID) {
    appendCouponAuditLog({
      event_type: 'UNAUTHORIZED_LEDGER_ACCESS_ATTEMPT',
      who_actor_id: String(requestingUserId),
      why_reason: 'Blocked non-principal attempt to read coupon audit ledger',
    });
    return { allowed: false, error: '⛔ Strict Principal-Only Lock (`184977944433786880`).' };
  }

  if (!fs.existsSync(COUPON_LEDGER_PATH)) {
    return {
      allowed: true,
      integrityVerified: true,
      totalEntries: 0,
      entries: [],
    };
  }

  const lines = fs
    .readFileSync(COUPON_LEDGER_PATH, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const entries = [];
  let expectedPrev = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
  let integrityVerified = true;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const { entry_hash, ...rest } = obj;
      const recomputed = crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
      if (obj.prev_hash !== expectedPrev || recomputed !== entry_hash) {
        integrityVerified = false;
      }
      expectedPrev = entry_hash;
      entries.push(obj);
    } catch {
      integrityVerified = false;
    }
  }

  return {
    allowed: true,
    integrityVerified,
    totalEntries: entries.length,
    entries: entries.slice(-15).reverse(),
  };
}

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
      form.append('allow_promotion_codes', 'true');
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
 * Principal-Only (`184977944433786880`) Stripe Promo / Giveaway Code Generator
 * with mandatory SHA-256 non-repudiation audit logging (Who, What, Where, When, Why).
 */
export async function createAuditedStripePromoCode({
  actorUserId,
  actorUsername,
  guildId,
  channelId,
  planKey = 'KINGDOM_39',
  percentOff = 100,
  maxRedemptions = 1,
  customCode = '',
  reasonWhy = 'Event Giveaway',
}) {
  // 1. Strict Principal-Only Cryptographic Gate
  if (String(actorUserId) !== VALHEON_PRINCIPAL_DISCORD_ID) {
    appendCouponAuditLog({
      event_type: 'UNAUTHORIZED_MINT_ATTEMPT',
      who_actor_id: String(actorUserId),
      who_actor_username: String(actorUsername || 'unknown'),
      what_package: planKey,
      where_guild_id: String(guildId || ''),
      where_channel_id: String(channelId || ''),
      why_reason: 'Blocked non-principal attempt to mint promo code',
    });
    return {
      ok: false,
      error: '⛔ **Strict Principal-Only Lock:** Only Lauren (`184977944433786880`) can mint promo or giveaway codes.',
    };
  }

  const env = readEnvVars();
  const stripeSecret = env.STRIPE_SECRET_KEY || '';
  if (!stripeSecret || !stripeSecret.startsWith('sk_')) {
    return {
      ok: false,
      error: '⚠️ `STRIPE_SECRET_KEY` is not configured in `.env.local`.',
    };
  }

  const cleanPct = Math.min(100, Math.max(1, Number(percentOff) || 100));
  const cleanMax = Math.min(500, Math.max(1, Number(maxRedemptions) || 1));
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const finalCode = (customCode || `VALHEON-${randomSuffix}`)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');

  try {
    // Step A: Create the underlying Stripe Coupon with full non-repudiation metadata
    const couponForm = new URLSearchParams();
    couponForm.append('percent_off', String(cleanPct));
    couponForm.append('duration', 'once');
    couponForm.append('name', `${finalCode} (${cleanPct}% OFF - ${reasonWhy.slice(0, 22)})`);
    couponForm.append('metadata[who_issued_by_id]', String(actorUserId));
    couponForm.append('metadata[who_issued_by_name]', String(actorUsername || 'Principal'));
    couponForm.append('metadata[what_target_plan]', String(planKey));
    couponForm.append('metadata[where_guild_id]', String(guildId || ''));
    couponForm.append('metadata[why_reason]', String(reasonWhy));

    const couponRes = await fetch('https://api.stripe.com/v1/coupons', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: couponForm.toString(),
    });
    const couponData = await couponRes.json();
    if (!couponRes.ok || !couponData.id) {
      return {
        ok: false,
        error: `⚠️ Stripe Coupon API error: ${couponData?.error?.message || 'Unknown error'}`,
      };
    }

    // Step B: Create the customer-facing Stripe Promotion Code (with max_redemptions cap)
    const promoForm = new URLSearchParams();
    promoForm.append('coupon', couponData.id);
    promoForm.append('code', finalCode);
    promoForm.append('max_redemptions', String(cleanMax));
    promoForm.append('metadata[who_issued_by_id]', String(actorUserId));
    promoForm.append('metadata[what_code]', finalCode);
    promoForm.append('metadata[what_target_plan]', String(planKey));
    promoForm.append('metadata[where_guild_id]', String(guildId || ''));
    promoForm.append('metadata[why_reason]', String(reasonWhy));

    const promoRes = await fetch('https://api.stripe.com/v1/promotion_codes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: promoForm.toString(),
    });
    const promoData = await promoRes.json();
    if (!promoRes.ok || !promoData.id) {
      return {
        ok: false,
        error: `⚠️ Stripe Promotion Code API error: ${promoData?.error?.message || 'Code may already exist'}`,
      };
    }

    // Step C: Append tamper-evident SHA-256 hash-chained audit entry
    const auditEntry = appendCouponAuditLog({
      event_type: 'CODE_MINTED',
      who_actor_id: String(actorUserId),
      who_actor_username: String(actorUsername || 'Principal'),
      what_code: finalCode,
      what_percent_off: cleanPct,
      what_max_redemptions: cleanMax,
      what_target_plan: planKey,
      what_stripe_coupon_id: couponData.id,
      what_stripe_promo_id: promoData.id,
      where_guild_id: String(guildId || ''),
      where_channel_id: String(channelId || ''),
      why_reason: String(reasonWhy),
    });

    return {
      ok: true,
      code: finalCode,
      percentOff: cleanPct,
      maxRedemptions: cleanMax,
      couponId: couponData.id,
      promoId: promoData.id,
      reasonWhy,
      auditEntry,
    };
  } catch (err) {
    return {
      ok: false,
      error: `⚠️ Exception creating promo code: ${err.message}`,
    };
  }
}

// Track already-logged session IDs so repeated clicks don't duplicate ledger rows
const LOGGED_REDEEMED_SESSIONS = new Set();

// Track locally consumed session slots (sessionId_slot -> guildId) in addition to Stripe Session metadata
const CONSUMED_SESSION_SLOTS = new Map();

function getSlotKeyForBlueprint(blueprintType, planKey) {
  if (blueprintType === 'KINGDOM_WAR_SERVER' || planKey?.startsWith('KINGDOM_')) {
    return 'consumed_kingdom_guild_id';
  }
  if (blueprintType === 'KVK_DIPLO_SERVER' || planKey === 'KVK_DIPLO_9') {
    return 'consumed_diplo_guild_id';
  }
  if (blueprintType === 'KVK_COALITION_SERVER' || planKey === 'KVK_COALITION_9') {
    return 'consumed_coalition_guild_id';
  }
  return 'consumed_upgrade_guild_id';
}

function isSessionUnconsumedForPlan(session, planKey) {
  const meta = session?.metadata || {};
  if (planKey === 'KVK_BUNDLE_15') {
    const dUsed = meta.consumed_diplo_guild_id || CONSUMED_SESSION_SLOTS.get(`${session.id}_consumed_diplo_guild_id`);
    const cUsed = meta.consumed_coalition_guild_id || CONSUMED_SESSION_SLOTS.get(`${session.id}_consumed_coalition_guild_id`);
    return !dUsed || !cUsed;
  }
  const slotKey = getSlotKeyForBlueprint(null, planKey);
  const usedBy = meta[slotKey] || CONSUMED_SESSION_SLOTS.get(`${session.id}_${slotKey}`);
  return !usedBy;
}

/**
 * Helper to inspect a paid Stripe Checkout Session, extract any redeemed promotion code,
 * and record a non-repudiation CODE_REDEEMED / CHECKOUT_PAID entry in coupon_audit_ledger.jsonl.
 */
async function buildVerifiedPaymentResult(session, stripeSecret, { userId, username, planKey, guildId, channelId }) {
  const subtotalCents = session.amount_subtotal ?? session.amount_total ?? 0;
  const totalCents = session.amount_total ?? 0;
  const discountCents = session.total_details?.amount_discount ?? Math.max(0, subtotalCents - totalCents);

  let promoCodeUsed = null;
  let couponIdUsed = null;
  let whyIssuedMemo = null;

  try {
    const breakdownDiscounts = session.total_details?.breakdown?.discounts || [];
    if (breakdownDiscounts.length > 0) {
      const dObj = breakdownDiscounts[0]?.discount;
      couponIdUsed = dObj?.coupon?.id || dObj?.coupon?.name || null;
      whyIssuedMemo = dObj?.coupon?.metadata?.why_reason || null;
      if (dObj?.promotion_code) {
        if (typeof dObj.promotion_code === 'object' && dObj.promotion_code.code) {
          promoCodeUsed = dObj.promotion_code.code;
          whyIssuedMemo = dObj.promotion_code.metadata?.why_reason || whyIssuedMemo;
        } else if (typeof dObj.promotion_code === 'string') {
          const pRes = await fetch(`https://api.stripe.com/v1/promotion_codes/${dObj.promotion_code}`, {
            headers: { Authorization: `Bearer ${stripeSecret}` },
          });
          const pData = await pRes.json();
          if (pRes.ok && pData.code) {
            promoCodeUsed = pData.code;
            whyIssuedMemo = pData.metadata?.why_reason || whyIssuedMemo;
          }
        }
      }
    }
  } catch {}

  let auditEntry = null;
  if (!LOGGED_REDEEMED_SESSIONS.has(session.id)) {
    LOGGED_REDEEMED_SESSIONS.add(session.id);
    auditEntry = appendCouponAuditLog({
      event_type: discountCents > 0 ? 'CODE_REDEEMED' : 'CHECKOUT_PAID',
      who_redeemer_id: String(userId),
      who_redeemer_username: String(username || session.metadata?.discord_username || 'Governor'),
      who_redeemer_email: session.customer_details?.email || 'Verified Stripe Buyer',
      what_package: planKey,
      what_code_redeemed: promoCodeUsed || (discountCents > 0 ? couponIdUsed || 'PROMO_APPLIED' : 'NONE (FULL_PRICE)'),
      what_subtotal_usd: subtotalCents / 100,
      what_discount_usd: discountCents / 100,
      what_paid_usd: totalCents / 100,
      where_session_id: session.id,
      where_guild_id: String(guildId || session.metadata?.source_guild_id || ''),
      where_channel_id: String(channelId || ''),
      why_reason: whyIssuedMemo || (discountCents > 0 ? 'Promo Code Redeemed at Checkout' : 'Direct Stripe Purchase'),
    });
  }

  return {
    paid: true,
    mode: discountCents > 0 ? 'LIVE_PROMO_REDEEMED' : 'LIVE_VERIFIED',
    sessionId: session.id,
    planKey: session.metadata?.plan_key || planKey,
    subtotalUsd: subtotalCents / 100,
    discountUsd: discountCents / 100,
    amountUsd: totalCents / 100,
    promoCodeUsed,
    whyIssuedMemo,
    auditHash: auditEntry?.entry_hash || null,
    customerEmail: session.customer_details?.email || 'Verified Stripe Buyer',
  };
}

/**
 * Verifies whether a user's Stripe Checkout Session has been paid FOR THAT EXACT PLAN KEY
 * and has not already been consumed on another server!
 */
export async function verifyStripePaymentStatus({ userId, username, planKey, guildId, channelId }) {
  const env = readEnvVars();
  const stripeSecret = env.STRIPE_SECRET_KEY || '';
  const pending = PENDING_SESSIONS.get(`${userId}_${planKey}`);

  if (stripeSecret && stripeSecret.startsWith('sk_')) {
    try {
      if (pending?.sessionId && pending.sessionId.startsWith('cs_')) {
        const res = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${pending.sessionId}?expand[]=total_details.breakdown`,
          {
            headers: { Authorization: `Bearer ${stripeSecret}` },
          }
        );
        const session = await res.json();
        if (
          res.ok &&
          session.payment_status === 'paid' &&
          (session.metadata?.plan_key === planKey || session.client_reference_id === `${userId}_${planKey}`) &&
          isSessionUnconsumedForPlan(session, planKey)
        ) {
          return await buildVerifiedPaymentResult(session, stripeSecret, {
            userId,
            username,
            planKey,
            guildId,
            channelId,
          });
        }
      }

      // Scan recent checkout sessions, strictly enforcing exact plan_key match + unconsumed check!
      const listRes = await fetch(
        'https://api.stripe.com/v1/checkout/sessions?limit=20&expand[]=data.total_details.breakdown',
        {
          headers: { Authorization: `Bearer ${stripeSecret}` },
        }
      );
      const listData = await listRes.json();
      const matched = (listData?.data || []).find(
        (s) =>
          s.payment_status === 'paid' &&
          (s.client_reference_id === `${userId}_${planKey}` ||
            (s.metadata?.discord_user_id === String(userId) && s.metadata?.plan_key === planKey)) &&
          isSessionUnconsumedForPlan(s, planKey)
      );
      if (matched) {
        return await buildVerifiedPaymentResult(matched, stripeSecret, {
          userId,
          username,
          planKey,
          guildId,
          channelId,
        });
      }

      return {
        paid: false,
        mode: 'LIVE_PENDING',
        message:
          `⏳ **No unconsumed Stripe payment found for \`${planKey}\` under <@${userId}>.**\n` +
          `Complete Step 1 Checkout in your browser first, then click **[✅ Step 3: Verify Payment & Launch 1-Click Builder]** again! *(Note: Each 1-Click license is strictly bound to 1 Discord Server ID and cannot be reused across multiple servers).*`,
      };
    } catch (err) {
      return {
        paid: false,
        mode: 'ERROR',
        message: `⚠️ Stripe verification error: ${err.message}`,
      };
    }
  }

  // Only allow Sandbox Bypass if the caller is the Valheon Principal Architect (184977944433786880)!
  if (String(userId) === VALHEON_PRINCIPAL_DISCORD_ID) {
    return {
      paid: true,
      mode: 'PRINCIPAL_SANDBOX_BYPASS',
      sessionId: `principal_${Date.now()}`,
      amountUsd: 0,
      discountUsd: (STRIPE_CATALOG[planKey]?.amountCents || 3900) / 100,
      promoCodeUsed: 'PRINCIPAL_OVERRIDE',
      customerEmail: 'Principal Architect (Reign3418)',
    };
  }

  return {
    paid: false,
    mode: 'STRIPE_KEY_REQUIRED',
    message: '⚠️ Stripe Checkout verification is required before launching a 1-Click Server.',
  };
}

/**
 * Verifies that a user has a paid, UNCONSUMED Stripe Checkout entitlement for the requested
 * blueprintType (`KINGDOM_WAR_SERVER`, `KVK_DIPLO_SERVER`, `KVK_COALITION_SERVER`), and
 * permanently binds/consumes that session slot to `targetGuildId` in Stripe metadata + SHA-256 ledger!
 * Prevents 1 payment from being used to build multiple servers or a $9 Diplo payment from building a $39 Kingdom!
 */
export async function verifyAndConsumeBlueprintCredit({
  userId,
  username,
  blueprintType,
  targetGuildId,
}) {
  // 1. Valheon Principal Architect (184977944433786880) always has unlimited direct deployment authority
  if (String(userId) === VALHEON_PRINCIPAL_DISCORD_ID) {
    return {
      allowed: true,
      sessionId: `principal_direct_${Date.now()}`,
      tierGranted: 'LEGENDARY',
      planKey: 'PRINCIPAL_OVERRIDE',
    };
  }

  const env = readEnvVars();
  const stripeSecret = env.STRIPE_SECRET_KEY || '';
  if (!stripeSecret || !stripeSecret.startsWith('sk_')) {
    return {
      allowed: false,
      error: '🛡️ **Payment Verification Required:** Please complete Step 1 Stripe Checkout before launching the 1-Click Server Builder.',
    };
  }

  const validPlansByBlueprint = {
    KINGDOM_WAR_SERVER: ['KINGDOM_LEGENDARY_54', 'KINGDOM_39'],
    KVK_DIPLO_SERVER: ['KVK_DIPLO_9', 'KVK_BUNDLE_15'],
    KVK_COALITION_SERVER: ['KVK_COALITION_9', 'KVK_BUNDLE_15'],
  };
  const validPlans = validPlansByBlueprint[blueprintType] || ['KINGDOM_39'];
  const slotKey = getSlotKeyForBlueprint(blueprintType, null);

  try {
    const listRes = await fetch(
      'https://api.stripe.com/v1/checkout/sessions?limit=25',
      {
        headers: { Authorization: `Bearer ${stripeSecret}` },
      }
    );
    const listData = await listRes.json();
    const sessions = listData?.data || [];

    const validSession = sessions.find((s) => {
      if (s.payment_status !== 'paid') return false;
      const metaUser = s.metadata?.discord_user_id;
      const metaPlan = s.metadata?.plan_key;
      const ref = s.client_reference_id || '';
      const isUserMatch =
        metaUser === String(userId) || validPlans.some((pk) => ref === `${userId}_${pk}`);
      const isPlanMatch =
        validPlans.includes(metaPlan) || validPlans.some((pk) => ref === `${userId}_${pk}`);
      if (!isUserMatch || !isPlanMatch) return false;

      const alreadyBoundGuild =
        s.metadata?.[slotKey] || CONSUMED_SESSION_SLOTS.get(`${s.id}_${slotKey}`);
      // Allow if unconsumed OR if already bound to this exact same targetGuildId
      return !alreadyBoundGuild || String(alreadyBoundGuild) === String(targetGuildId);
    });

    if (!validSession) {
      return {
        allowed: false,
        error:
          `🛡️ **Unlicensed Deployment Blocked (\`1 License = 1 Discord Server ID\`):**\n` +
          `No unconsumed Stripe payment for **\`${blueprintType}\`** was found under <@${userId}>.\n` +
          `• If you haven't purchased this package yet, click the **Step 1 Stripe Checkout** button first.\n` +
          `• If you already used your purchase on another Server ID, each license is permanently bound to **1 Discord Server ID** (use \`#🛟-valheon-support-and-relaunch\` inside your licensed server for free repairs!).`,
      };
    }

    // Bind/Consume this session slot to targetGuildId in memory, in Stripe Session metadata, and in SHA-256 Ledger!
    CONSUMED_SESSION_SLOTS.set(`${validSession.id}_${slotKey}`, String(targetGuildId));

    const updateForm = new URLSearchParams();
    updateForm.append(`metadata[${slotKey}]`, String(targetGuildId));
    updateForm.append('metadata[consumed_at_utc]', new Date().toISOString());
    await fetch(`https://api.stripe.com/v1/checkout/sessions/${validSession.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: updateForm.toString(),
    }).catch(() => {});

    const resolvedPlan = validSession.metadata?.plan_key || validPlans[0];
    const tierGranted =
      resolvedPlan === 'KINGDOM_39' ? 'COMMON' : 'LEGENDARY';

    appendCouponAuditLog({
      event_type: 'LICENSE_BOUND_TO_GUILD',
      who_redeemer_id: String(userId),
      who_redeemer_username: String(username || 'Governor'),
      what_package: resolvedPlan,
      what_blueprint: blueprintType,
      where_session_id: validSession.id,
      where_guild_id: String(targetGuildId),
      why_reason: `Single-use license bound to Guild ID ${targetGuildId}`,
    });

    return {
      allowed: true,
      sessionId: validSession.id,
      tierGranted,
      planKey: resolvedPlan,
    };
  } catch (err) {
    return {
      allowed: false,
      error: `⚠️ Could not verify license entitlement with Stripe: ${err.message}`,
    };
  }
}
