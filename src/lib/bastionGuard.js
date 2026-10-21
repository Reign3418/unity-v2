import crypto from 'crypto';
import { auth } from '@/lib/auth';

/**
 * Bastion API access guard + input validators.
 *
 * Two kinds of callers are allowed:
 *  1. A signed-in Super Admin (Bastion Command Center / BlackOps UI) -> operator actions + GET.
 *  2. The SIDEKICK machine agents (cloud agent, provisioner, multi-queue) -> agent actions only,
 *     authenticated with `Authorization: Bearer <BASTION_AGENT_SECRET>`.
 * Everything else is rejected. If BASTION_AGENT_SECRET is missing or short, agent calls fail closed.
 */

export const AGENT_ACTIONS = new Set(['SIDEKICK_CLOUD_HEARTBEAT', 'REGISTER_PROVISIONED_BOT']);

export class BastionInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BastionInputError';
  }
}

export function isAgentRequest(request) {
  const secret = process.env.BASTION_AGENT_SECRET || '';
  if (secret.length < 32) return false;
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function isSuperAdminSession() {
  try {
    const session = await auth();
    return Boolean(session?.user?.isSuperAdmin);
  } catch {
    return false;
  }
}

const KINGDOM_RE = /^\d{1,5}$/;
const INSTANCE_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const ADB_SERIAL_RE = /^(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}$/;

/** Kingdom IDs are 1-5 digit numbers. Throws BastionInputError otherwise. */
export function cleanKingdom(value, { allowAll = false } = {}) {
  const s = String(value ?? '').trim();
  if (allowAll && s === 'ALL') return s;
  if (!KINGDOM_RE.test(s)) throw new BastionInputError(`Invalid kingdom "${s.slice(0, 20)}"`);
  return s;
}

export function cleanInstanceId(value) {
  const s = String(value ?? '').trim();
  if (!INSTANCE_RE.test(s)) throw new BastionInputError(`Invalid instanceId "${s.slice(0, 40)}"`);
  return s;
}

/** ADB serials must look like 127.0.0.1:16384. Anything else is rejected before it reaches a shell. */
export function cleanAdbSerial(value) {
  const s = String(value ?? '').trim().split(' ')[0];
  if (!ADB_SERIAL_RE.test(s)) throw new BastionInputError(`Invalid ADB serial "${s.slice(0, 30)}"`);
  return s;
}

export function cleanRankCount(value, fallback = 650) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 1000);
}

export function cleanText(value, maxLen = 64) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLen);
}
