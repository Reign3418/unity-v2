/**
 * Resolves the active Target Kingdom selected in the top Navbar or session.
 * 
 * Hierarchy:
 * 1. localStorage 'unty_active_kd' (set directly by the Navbar Target KD selector)
 * 2. localStorage 'unty_default_kd'
 * 3. session.user.allowedKingdoms[0]
 * 4. session.user.tenant.kingdomId
 * 5. Fallback kingdom (default '3418')
 * 
 * @param {object} [session] NextAuth session
 * @param {string} [fallback='3418'] Fallback kingdom if none is resolved
 * @returns {string} Target kingdom ID
 */
export function getActiveTargetKingdom(session = null, fallback = "3418") {
    if (typeof window !== "undefined") {
        const active = localStorage.getItem("unty_active_kd");
        if (active && active !== "GLOBAL" && active.trim()) {
            return active.trim();
        }
        const def = localStorage.getItem("unty_default_kd");
        if (def && def !== "GLOBAL" && def.trim()) {
            return def.trim();
        }
    }

    if (session?.user) {
        const allowed = session.user.allowedKingdoms;
        if (Array.isArray(allowed) && allowed.length > 0 && allowed[0] !== "GLOBAL") {
            return String(allowed[0]).trim();
        }
        const tenantKd = session.user.tenant?.kingdomId;
        if (tenantKd && tenantKd !== "GLOBAL" && String(tenantKd).trim()) {
            return String(tenantKd).trim();
        }
    }

    return fallback;
}
