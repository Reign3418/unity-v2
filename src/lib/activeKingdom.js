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

const KD_STORAGE_EPOCH_KEY = "valheon_kd_epoch_v3";
const CURRENT_KD_EPOCH = "2026-10-23-role-scoped";

/**
 * Checks whether the current session belongs to an elevated global operator
 * (Valheon Founder, SuperAdmin, or Data Analyst) who should see the full
 * Bastion Fleet + all tracked kingdoms.
 * Standard governors and single-kingdom R4/R5 leaders only see the kingdoms
 * provisioned for their account (Profile Cards, Governor Auth, or Discord Tenant).
 */
export function isGlobalKingdomOperator(session = null) {
    const u = session?.user;
    if (!u) return false;
    return Boolean(u.isValheonFounder || u.isSuperAdmin || u.isAnalyst);
}

/**
 * Returns the deduplicated list of kingdoms the current user is authorized to view.
 * - Elevated operators (Founder / SuperAdmin / Analyst): BASTION_FLEET_KINGDOMS + session allowedKingdoms
 * - Standard members / single-kingdom Leaders: strictly their provisioned kingdoms
 *   (from linked Profile Cards in /stats, Governor PIN auth, or Discord guild tenant).
 */
export function getMergedKingdomList(session = null) {
    const fromSession = Array.isArray(session?.user?.allowedKingdoms)
        ? session.user.allowedKingdoms.map(String)
        : [];
    const fromTenant = Array.isArray(session?.user?.tenant?.allowedKingdoms)
        ? session.user.tenant.allowedKingdoms.map(String)
        : [];
    const fromGovConfig = Array.isArray(session?.user?.governorConfig?.allowedKingdoms)
        ? session.user.governorConfig.allowedKingdoms.map(String)
        : [];
    const activeFromUser = session?.user?.activeKingdom
        ? [String(session.user.activeKingdom)]
        : [];
    const tenantKd = session?.user?.tenant?.kingdomId
        ? [String(session.user.tenant.kingdomId)]
        : [];

    if (isGlobalKingdomOperator(session)) {
        return Array.from(
            new Set([
                ...BASTION_FLEET_KINGDOMS,
                ...activeFromUser,
                ...fromSession,
                ...fromTenant,
                ...fromGovConfig,
            ])
        ).filter((k) => k && k !== "GLOBAL");
    }

    const scoped = Array.from(
        new Set([
            ...activeFromUser,
            ...fromGovConfig,
            ...fromSession,
            ...fromTenant,
            ...tenantKd,
        ])
    ).filter((k) => k && k !== "GLOBAL");

    return scoped.length > 0 ? scoped : ["4197"];
}

/**
 * Persists the active Target Kingdom across localStorage AND syncs it to
 * the user's DynamoDB profile (USER#<id>) so PC and Mobile stay in sync.
 */
export function setActiveTargetKingdom(kd, options = {}) {
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

    if (options.syncServer !== false && clean !== "GLOBAL") {
        fetch("/api/user/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activeKingdom: clean }),
            keepalive: true,
        }).catch(() => {});
    }
}

/**
 * Pulls the user's server-saved activeKingdom (or linked Profile Card kingdom)
 * from DynamoDB so switching kingdoms on PC or linking a Profile Card immediately
 * reflects on Mobile without needing to clear browser storage.
 */
export async function syncActiveKingdomFromServer() {
    if (typeof window === "undefined") return null;
    try {
        const res = await fetch("/api/user/settings", { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        const serverKd = data?.activeKingdom ? String(data.activeKingdom).trim() : null;
        if (serverKd && serverKd !== "GLOBAL") {
            const currentLocal =
                localStorage.getItem("valheon_active_kd") ||
                localStorage.getItem("unty_active_kd");
            if (currentLocal !== serverKd) {
                setActiveTargetKingdom(serverKd, { syncServer: false });
                return serverKd;
            }
        }
    } catch {}
    return null;
}

/**
 * Resolves the active Target Kingdom selected in the top Navbar, DynamoDB profile, or session.
 */
export function getActiveTargetKingdom(session = null, fallback = "4197") {
    const isGlobal = isGlobalKingdomOperator(session);
    const allowedList = getMergedKingdomList(session);
    const serverSavedKd =
        session?.user?.activeKingdom ||
        session?.user?.governorConfig?.activeKingdom ||
        null;

    if (typeof window !== "undefined") {
        const epoch = localStorage.getItem(KD_STORAGE_EPOCH_KEY);
        const valheonActive = localStorage.getItem("valheon_active_kd");
        const active = localStorage.getItem("unty_active_kd");
        const def = localStorage.getItem("unty_default_kd");

        // One-time migration for Founder/SuperAdmin mobile browsers stuck on legacy 3155/3418 default
        if (isGlobal && epoch !== CURRENT_KD_EPOCH) {
            const currentStored = valheonActive || active || def;
            if (!currentStored || currentStored === "3155" || currentStored === "3418") {
                const target = serverSavedKd && serverSavedKd !== "3155" ? String(serverSavedKd) : "4197";
                setActiveTargetKingdom(target, { syncServer: false });
                return target;
            }
            localStorage.setItem(KD_STORAGE_EPOCH_KEY, CURRENT_KD_EPOCH);
        }

        const candidate = (valheonActive || active || def || "").trim();
        if (candidate && candidate !== "GLOBAL") {
            // For regular non-global users, ensure localStorage isn't pointing at an unauthorized kingdom
            if (!isGlobal && allowedList.length > 0 && !allowedList.includes(candidate)) {
                const validKd = serverSavedKd && allowedList.includes(String(serverSavedKd))
                    ? String(serverSavedKd)
                    : allowedList[0];
                setActiveTargetKingdom(validKd, { syncServer: false });
                return validKd;
            }
            return candidate;
        }
    }

    if (serverSavedKd && serverSavedKd !== "GLOBAL") {
        return String(serverSavedKd).trim();
    }

    if (allowedList.length > 0) {
        return String(allowedList[0]).trim();
    }

    return fallback;
}
