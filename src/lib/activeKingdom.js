export const BASTION_FLEET_KINGDOMS = [
    "3155",
    "3218",
    "3418",
    "3477",
    "3707",
    "4021",
    "4044",
    "4193",
    "4194",
    "4195",
    "4196",
    "4197",
    "4198",
    "4202",
];

/**
 * Kingdoms with active live Bastion Bot telemetry (shown WITHOUT an asterisk).
 * All historical/legacy spreadsheet kingdoms are marked with '*' (Archived).
 */
export const ACTIVE_LIVE_KINGDOMS = new Set([
    "4021",
    "4044",
    "4193",
    "4194",
    "4195",
    "4196",
    "4197",
    "4198",
    "4202",
]);

export function isArchivedKingdom(kd) {
    if (!kd || kd === "GLOBAL") return false;
    return !ACTIVE_LIVE_KINGDOMS.has(String(kd).trim());
}

/**
 * Formats a kingdom ID for <select> dropdowns, appending '*' to archived kingdoms.
 * style: 'bracket' -> '[3155*]' / '[4197]'
 *        'full'    -> 'Kingdom #3155*' / 'Kingdom #4197'
 *        'short'   -> 'KD #3155*' / 'KD #4197'
 */
export function formatKingdomOption(kd, style = "bracket") {
    const clean = String(kd || "").trim();
    const star = isArchivedKingdom(clean) ? "*" : "";
    if (style === "full") return `Kingdom #${clean}${star}`;
    if (style === "short") return `KD #${clean}${star}`;
    return `[${clean}${star}]`;
}

const KD_STORAGE_EPOCH_KEY = "valheon_kd_epoch_v3";
const CURRENT_KD_EPOCH = "2026-10-23-role-scoped";

export function isGlobalKingdomOperator(session = null) {
    const u = session?.user;
    if (!u) return false;
    return Boolean(u.isValheonFounder || u.isSuperAdmin || u.isAnalyst);
}

/**
 * Returns the deduplicated list of kingdoms in strict ascending numerical order
 * (e.g. 3155* ... 4023* -> 4044 -> 4193 -> 4194 -> 4195 -> 4196 -> 4197 -> 4198 -> 4202)
 * so scrolling numerically always finds 4197 in its exact expected position.
 */
export function getMergedKingdomList(session = null, currentActiveKd = null) {
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
    const explicitActive = currentActiveKd && currentActiveKd !== "GLOBAL"
        ? [String(currentActiveKd)]
        : [];

    const sortNumerically = (arr) =>
        arr
            .filter((k) => k && k !== "GLOBAL")
            .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));

    if (!session || isGlobalKingdomOperator(session)) {
        return sortNumerically(
            Array.from(
                new Set([
                    ...BASTION_FLEET_KINGDOMS,
                    ...explicitActive,
                    ...activeFromUser,
                    ...fromSession,
                    ...fromTenant,
                    ...fromGovConfig,
                ])
            )
        );
    }

    const scoped = sortNumerically(
        Array.from(
            new Set([
                ...explicitActive,
                ...activeFromUser,
                ...fromGovConfig,
                ...fromSession,
                ...fromTenant,
                ...tenantKd,
            ])
        )
    );

    return scoped.length > 0 ? scoped : ["4197"];
}

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

    try {
        window.dispatchEvent(new CustomEvent("valheon:kd-changed", { detail: { kd: clean } }));
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
            if (!currentLocal || currentLocal === "3155" || currentLocal === "3418") {
                setActiveTargetKingdom(serverKd, { syncServer: false });
                return serverKd;
            }
        }
    } catch {}
    return null;
}

export function getActiveTargetKingdom(session = null, fallback = "4197") {
    const isGlobal = !session || isGlobalKingdomOperator(session);
    const serverSavedKd =
        session?.user?.activeKingdom ||
        session?.user?.governorConfig?.activeKingdom ||
        null;

    if (typeof window !== "undefined") {
        const epoch = localStorage.getItem(KD_STORAGE_EPOCH_KEY);
        const valheonActive = localStorage.getItem("valheon_active_kd");
        const active = localStorage.getItem("unty_active_kd");
        const def = localStorage.getItem("unty_default_kd");

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
            const allowedList = getMergedKingdomList(session, candidate);
            if (!isGlobal && allowedList.length > 0 && !allowedList.includes(candidate)) {
                const validKd = serverSavedKd && allowedList.includes(String(serverSavedKd))
                    ? String(serverSavedKd)
                    : allowedList[allowedList.length - 1];
                setActiveTargetKingdom(validKd, { syncServer: false });
                return validKd;
            }
            return candidate;
        }
    }

    if (serverSavedKd && serverSavedKd !== "GLOBAL") {
        return String(serverSavedKd).trim();
    }

    if (isGlobal) {
        return "4197";
    }

    const allowedList = getMergedKingdomList(session);
    if (allowedList.length > 0) {
        return String(allowedList[0]).trim();
    }

    return fallback;
}
