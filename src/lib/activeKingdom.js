export const BASTION_FLEET_KINGDOMS = [
    "4197",
    "4194",
    "4021",
    "4193",
    "4195",
    "4196",
    "4198",
    "4044",
    "4202",
    "3418",
    "3155",
    "3218",
    "3477",
    "3707",
];

const KD_STORAGE_EPOCH_KEY = "valheon_kd_epoch_v2";
const CURRENT_KD_EPOCH = "2026-10-23-kd4197";

/**
 * Returns a deduplicated list of all available kingdoms with #4197 and #4194 prioritized first.
 */
export function getMergedKingdomList(session = null) {
    const fromSession = Array.isArray(session?.user?.allowedKingdoms)
        ? session.user.allowedKingdoms.map(String)
        : [];
    const fromTenant = Array.isArray(session?.user?.tenant?.allowedKingdoms)
        ? session.user.tenant.allowedKingdoms.map(String)
        : [];
    return Array.from(
        new Set([...BASTION_FLEET_KINGDOMS, ...fromSession, ...fromTenant])
    ).filter((k) => k && k !== "GLOBAL");
}

/**
 * Persists the active Target Kingdom across all localStorage keys used by Unity & Valheon.
 */
export function setActiveTargetKingdom(kd) {
    if (typeof window === "undefined" || !kd) return;
    const clean = String(kd).trim();
    localStorage.setItem("valheon_active_kd", clean);
    localStorage.setItem("unty_active_kd", clean);
    localStorage.setItem("unty_default_kd", clean);
    localStorage.setItem(KD_STORAGE_EPOCH_KEY, CURRENT_KD_EPOCH);
    try {
        const rawPrefs = localStorage.getItem("unity_prefs") || localStorage.getItem("unty_prefs");
        const parsed = rawPrefs ? JSON.parse(rawPrefs) : {};
        parsed.defaultKingdom = clean;
        localStorage.setItem("unity_prefs", JSON.stringify(parsed));
        localStorage.setItem("unty_prefs", JSON.stringify(parsed));
    } catch {}
}

/**
 * Resolves the active Target Kingdom selected in the top Navbar or session.
 * Automatically clears stale pre-migration '3155' mobile cache once so mobile devices
 * sync immediately to #4197.
 */
export function getActiveTargetKingdom(session = null, fallback = "4197") {
    if (typeof window !== "undefined") {
        const epoch = localStorage.getItem(KD_STORAGE_EPOCH_KEY);
        const valheonActive = localStorage.getItem("valheon_active_kd");
        const active = localStorage.getItem("unty_active_kd");
        const def = localStorage.getItem("unty_default_kd");

        // One-time migration for mobile browsers stuck on legacy 3155/3418 default
        if (epoch !== CURRENT_KD_EPOCH) {
            const currentStored = valheonActive || active || def;
            if (!currentStored || currentStored === "3155" || currentStored === "3418") {
                setActiveTargetKingdom("4197");
                return "4197";
            }
            localStorage.setItem(KD_STORAGE_EPOCH_KEY, CURRENT_KD_EPOCH);
        }

        if (valheonActive && valheonActive !== "GLOBAL" && valheonActive.trim()) {
            return valheonActive.trim();
        }
        if (active && active !== "GLOBAL" && active.trim()) {
            return active.trim();
        }
        if (def && def !== "GLOBAL" && def.trim()) {
            return def.trim();
        }
    }

    if (session?.user) {
        const allowed = session.user.allowedKingdoms;
        if (Array.isArray(allowed) && allowed.length > 0 && allowed[0] !== "GLOBAL") {
            const first = String(allowed[0]).trim();
            return first === "3155" ? "4197" : first;
        }
        const tenantKd = session.user.tenant?.kingdomId;
        if (tenantKd && tenantKd !== "GLOBAL" && String(tenantKd).trim()) {
            const tkd = String(tenantKd).trim();
            return tkd === "3155" ? "4197" : tkd;
        }
    }

    return fallback;
}
