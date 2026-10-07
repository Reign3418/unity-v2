/**
 * Canonical governor (Governor ID + PIN) roles.
 *
 * Historically the admin panel saved "LEADER" / "DATA ANALYST" while auth checked "Leader" /
 * "Data Analyst", so those assignments silently granted nothing. Everything now goes through
 * normalizeGovernorRole() so storage, auth and UI agree. Safe to import on client and server.
 */
export const GOVERNOR_ROLES = ['User', 'Data Analyst', 'Leader', 'Admin'];

export function normalizeGovernorRole(role) {
  const r = String(role || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
  if (r === 'admin') return 'Admin';
  if (r === 'leader') return 'Leader';
  if (r === 'data analyst' || r === 'analyst') return 'Data Analyst';
  return 'User';
}

/** Session capability flags for a governor role. */
export function governorRoleFlags(role) {
  const canonical = normalizeGovernorRole(role);
  return {
    role: canonical,
    isAnalyst: canonical !== 'User',
    isLeader: canonical === 'Leader' || canonical === 'Admin',
    isSuperAdmin: canonical === 'Admin'
  };
}

/** True for any stored role other than plain User (raw check: unknown roles count as elevated). */
export function isElevatedGovernorRole(role) {
  return String(role || 'User').trim().toLowerCase() !== 'user';
}
