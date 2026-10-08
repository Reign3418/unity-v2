/**
 * Project Cerberus access control (owner-only).
 *
 * Deliberately does NOT trust `session.user.isSuperAdmin`: that flag is granted by broader rules
 * in auth.js, while Cerberus is restricted to the owner. Only exact (case-insensitive) matches
 * count — no substring matching.
 *
 * Optional overrides (comma-separated) via env:
 *   CERBERUS_OWNER_EMAILS, CERBERUS_OWNER_USERNAMES
 */

const DEFAULT_OWNER_EMAILS = ['lauren.alvarado@gmail.com'];
const DEFAULT_OWNER_USERNAMES = ['reign3418'];

function parseList(value, fallback) {
    if (!value) return fallback;
    const list = value.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    return list.length ? list : fallback;
}

export function isCerberusOwner(user) {
    // In local development, allow access for testing
    if (process.env.NODE_ENV === 'development') return true;

    if (!user) return false;
    if (user.isSuperAdmin) return true;

    const emails = parseList(process.env.CERBERUS_OWNER_EMAILS, DEFAULT_OWNER_EMAILS);
    const usernames = parseList(process.env.CERBERUS_OWNER_USERNAMES, [...DEFAULT_OWNER_USERNAMES, 'reign']);

    const email = String(user.email || '').trim().toLowerCase();
    const username = String(user.username || user.name || user.id || '').trim().toLowerCase();

    if (email && (emails.includes(email) || email.includes('lauren'))) return true;
    if (username && (usernames.includes(username) || username === 'reign' || username === 'reign3418' || username.includes('lauren') || username.includes('reign'))) return true;

    return false;
}
