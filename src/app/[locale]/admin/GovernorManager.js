"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, ShieldAlert, Save, Loader2, Trash2, Swords, Trophy, Calendar, Lock, Unlock, AlertTriangle } from "lucide-react";
import { GOVERNOR_ROLES, normalizeGovernorRole, isElevatedGovernorRole } from "@/lib/governorRoles";

const ROLE_LABEL_KEYS = {
    "User": "role_user",
    "Data Analyst": "role_analyst",
    "Leader": "role_leader",
    "Admin": "role_admin"
};

const ROLE_BADGE_STYLES = {
    "Data Analyst": "bg-sky-500/10 text-sky-300 border-sky-500/30",
    "Leader": "bg-amber-500/10 text-amber-300 border-amber-500/30",
    "Admin": "bg-rose-500/10 text-rose-300 border-rose-500/40"
};

export default function GovernorManager({ governors = [] }) {
    const t = useTranslations("AdminGovernors");
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all"); // "all" | "elevated" | "locked"
    const [localGovs, setLocalGovs] = useState(governors);
    const [savingId, setSavingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [unlockingId, setUnlockingId] = useState(null);

    // Keep local list in sync when parent finishes async fetch
    useEffect(() => {
        setLocalGovs(governors || []);
    }, [governors]);

    const elevatedCount = useMemo(() => localGovs.filter(g => isElevatedGovernorRole(g.role)).length, [localGovs]);
    const lockedCount = useMemo(() => localGovs.filter(g => g.lockedAt).length, [localGovs]);

    // Security-relevant accounts first: locked, then elevated, then everyone else.
    const filtered = useMemo(() => {
        const q = searchTerm.toLowerCase();
        const rank = g => (g.lockedAt ? 0 : isElevatedGovernorRole(g.role) ? 1 : 2);
        return localGovs
            .filter(g => filter !== "elevated" || isElevatedGovernorRole(g.role))
            .filter(g => filter !== "locked" || g.lockedAt)
            .filter(g =>
                (g.governorName || "").toLowerCase().includes(q) ||
                String(g.governorId || "").includes(searchTerm) ||
                String(g.kingdomId || "").includes(searchTerm)
            )
            .map((g, i) => ({ g, i }))
            .sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i)
            .map(({ g }) => g);
    }, [localGovs, filter, searchTerm]);

    const handleSave = async (gov, newKingdom, newRole) => {
        const govId = gov.governorId;
        const name = gov.governorName || govId;
        if (newRole === "Admin" && normalizeGovernorRole(gov.role) !== "Admin" && !confirm(t("confirm_admin", { name }))) {
            return;
        }

        setSavingId(govId);
        try {
            const res = await fetch("/api/aws/admin/governors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ governorId: govId, kingdomId: newKingdom, role: newRole })
            });

            if (res.ok) {
                setLocalGovs(prev => prev.map(g => g.governorId === govId ? { ...g, kingdomId: newKingdom, role: newRole } : g));
            } else {
                const data = await res.json().catch(() => ({}));
                alert(t("err_update", { error: data.error || "?" }));
            }
        } catch (e) {
            alert(t("err_generic", { error: e.message }));
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (govId, govName) => {
        if (!confirm(t("confirm_delete", { name: govName || govId, id: govId }))) {
            return;
        }

        setDeletingId(govId);
        try {
            const res = await fetch(`/api/aws/admin/governors?governorId=${encodeURIComponent(govId)}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setLocalGovs(prev => prev.filter(g => g.governorId !== govId));
            } else {
                const data = await res.json().catch(() => ({}));
                alert(t("err_delete", { error: data.error || "?" }));
            }
        } catch (e) {
            alert(t("err_generic", { error: e.message }));
        } finally {
            setDeletingId(null);
        }
    };

    const handleUnlock = async (govId, govName) => {
        if (!confirm(t("confirm_unlock", { name: govName || govId, id: govId }))) {
            return;
        }

        setUnlockingId(govId);
        try {
            const res = await fetch("/api/aws/admin/governors", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ governorId: govId, action: "unlock" })
            });

            if (res.ok) {
                setLocalGovs(prev => prev.map(g => g.governorId === govId ? { ...g, lockedAt: null, failedAttempts: 0 } : g));
            } else {
                const data = await res.json().catch(() => ({}));
                alert(t("err_unlock", { error: data.error || "?" }));
            }
        } catch (e) {
            alert(t("err_generic", { error: e.message }));
        } finally {
            setUnlockingId(null);
        }
    };

    const filterButton = (key, label, activeClass) => (
        <button
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                filter === key ? activeClass : "border-[#232833] text-gray-400 hover:text-white"
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest border-b border-[#1e222b] pb-4 mb-6 relative">
                {t("title")}
                <div className="absolute bottom-[-1px] left-0 w-24 h-[2px] bg-emerald-500"></div>
            </h2>

            {/* Security review banners */}
            {elevatedCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <div className="font-bold uppercase tracking-wider text-amber-300">{t("audit_title")}</div>
                        <p className="leading-relaxed">{t("audit_desc", { count: elevatedCount })}</p>
                        <p className="text-amber-400/80">{t("audit_admin_warning")}</p>
                        {filter !== "elevated" && (
                            <button
                                type="button"
                                onClick={() => setFilter("elevated")}
                                className="font-bold text-amber-300 hover:underline"
                            >
                                {t("audit_review_btn")}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {lockedCount > 0 && (
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-3">
                    <Lock size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{t("locked_banner", { count: lockedCount })}</p>
                </div>
            )}

            <div className="bg-[#0a0c10] border border-[#1e222b] rounded-xl p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                    <div>
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest">
                            {t("list_heading", { count: localGovs.length })}
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5">
                            {t("list_desc")}
                        </p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input
                            type="text"
                            placeholder={t("search_placeholder")}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-[#111318] border border-[#1e222b] rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full md:w-64"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {filterButton("all", t("filter_all", { count: localGovs.length }), "border-emerald-500/50 text-emerald-300 bg-emerald-500/10")}
                    {filterButton("elevated", t("filter_elevated", { count: elevatedCount }), "border-amber-500/50 text-amber-300 bg-amber-500/10")}
                    {filterButton("locked", t("filter_locked", { count: lockedCount }), "border-rose-500/50 text-rose-300 bg-rose-500/10")}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                    {filtered.map(gov => (
                        <GovCard
                            key={gov.governorId}
                            gov={gov}
                            t={t}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onUnlock={handleUnlock}
                            savingId={savingId}
                            deletingId={deletingId}
                            unlockingId={unlockingId}
                        />
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 text-xs font-mono">
                            {localGovs.length === 0
                                ? t("empty_none")
                                : t("empty_search", { query: searchTerm })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GovCard({ gov, t, onSave, onDelete, onUnlock, savingId, deletingId, unlockingId }) {
    const storedRole = normalizeGovernorRole(gov.role);
    const [kingdom, setKingdom] = useState(gov.kingdomId || "3418");
    const [role, setRole] = useState(storedRole);

    // Sync card if parent state changes
    useEffect(() => {
        setKingdom(gov.kingdomId || "3418");
        setRole(normalizeGovernorRole(gov.role));
    }, [gov.kingdomId, gov.role]);

    const isSaving = savingId === gov.governorId;
    const isDeleting = deletingId === gov.governorId;
    const isUnlocking = unlockingId === gov.governorId;
    const isBusy = isSaving || isDeleting || isUnlocking;
    const isChanged = kingdom !== (gov.kingdomId || "3418") || role !== storedRole;
    const isElevated = isElevatedGovernorRole(gov.role);

    const formatNumber = (num) => {
        if (!num) return "0";
        if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
        if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
        if (num >= 1e3) return (num / 1e3).toFixed(0) + "k";
        return num.toLocaleString();
    };

    const borderClass = gov.lockedAt
        ? "border-rose-500/50"
        : isElevated ? "border-amber-500/30" : "border-[#232833]";

    return (
        <div className={`bg-[#11141a] border ${borderClass} rounded-xl p-4 flex flex-col justify-between gap-3 relative group hover:border-emerald-500/40 transition-colors`}>
            {/* Top Row: Name, ID, Alliance */}
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <div className="text-white font-bold text-sm tracking-wide flex flex-wrap items-center gap-2">
                        <span>{gov.governorName}</span>
                        {gov.allianceTag && (
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                [{gov.allianceTag}]
                            </span>
                        )}
                        {isElevated && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${ROLE_BADGE_STYLES[storedRole] || ROLE_BADGE_STYLES.Admin}`}>
                                {t(ROLE_LABEL_KEYS[storedRole] || "role_user")}
                            </span>
                        )}
                        {gov.lockedAt && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-500/15 text-rose-300 border-rose-500/40 flex items-center gap-1">
                                <Lock size={10} /> {t("badge_locked")}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-cyan-400 font-mono font-bold mt-0.5" dir="ltr">
                        ID: {gov.governorId}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {gov.lockedAt && (
                        <button
                            onClick={() => onUnlock(gov.governorId, gov.governorName)}
                            disabled={isBusy}
                            className="px-2 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"
                            title={t("btn_unlock")}
                        >
                            {isUnlocking ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
                            <span>{t("btn_unlock")}</span>
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(gov.governorId, gov.governorName)}
                        disabled={isBusy}
                        className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all text-xs disabled:opacity-50"
                        title={t("title_delete")}
                    >
                        {isDeleting ? <Loader2 size={13} className="animate-spin text-rose-400" /> : <Trash2 size={13} />}
                    </button>
                </div>
            </div>

            {/* Wrong-PIN warning (not yet locked/cleared) */}
            {!gov.lockedAt && gov.failedAttempts > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-1.5">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>{t("badge_attempts", { count: gov.failedAttempts })}</span>
                </div>
            )}

            {/* Middle Row: Quick Stats */}
            {(gov.power > 0 || gov.killPoints > 0) && (
                <div className="flex items-center gap-4 text-[11px] font-mono bg-[#0c0f14] border border-[#1b202c] rounded-lg px-3 py-1.5">
                    <span className="flex items-center gap-1 text-slate-400">
                        <Trophy size={12} className="text-amber-400" />
                        <span>{t("label_power")}</span>
                        <strong className="text-white" dir="ltr">{formatNumber(gov.power)}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                        <Swords size={12} className="text-rose-400" />
                        <span>{t("label_kp")}</span>
                        <strong className="text-white" dir="ltr">{formatNumber(gov.killPoints)}</strong>
                    </span>
                </div>
            )}

            {/* Bottom Row: Editable Kingdom & Role + Save */}
            <div className="flex items-end gap-3 border-t border-[#1e222b] pt-3">
                <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
                        {t("label_kingdom")}
                    </label>
                    <div className="flex items-center bg-[#0a0c10] border border-[#232833] rounded px-2 focus-within:border-emerald-500 transition-colors" dir="ltr">
                        <span className="text-xs text-gray-500 font-bold mr-1">#</span>
                        <input
                            type="text"
                            value={kingdom}
                            onChange={(e) => setKingdom(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-transparent py-1.5 text-xs text-cyan-400 font-bold focus:outline-none"
                            placeholder="3418"
                        />
                    </div>
                </div>

                <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
                        {t("label_role")}
                    </label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-[#0a0c10] border border-[#232833] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                        {GOVERNOR_ROLES.map(r => (
                            <option key={r} value={r}>{t(ROLE_LABEL_KEYS[r])}</option>
                        ))}
                    </select>
                </div>

                <button
                    disabled={!isChanged || isBusy}
                    onClick={() => onSave(gov, kingdom, role)}
                    className={`h-[34px] px-3.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isChanged
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                            : 'bg-[#1a1f29] text-gray-500 cursor-not-allowed opacity-60'
                    }`}
                    title={t("title_save")}
                >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{t("btn_save")}</span>
                </button>
            </div>

            {/* Registration / lock timestamps */}
            {(gov.registeredAt || gov.lockedAt) && (
                <div className="text-[9px] text-gray-600 font-mono flex flex-wrap items-center gap-3">
                    {gov.registeredAt && (
                        <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{t("registered_on", { date: new Date(gov.registeredAt).toLocaleDateString() })}</span>
                        </span>
                    )}
                    {gov.lockedAt && (
                        <span className="flex items-center gap-1 text-rose-400/80">
                            <Lock size={10} />
                            <span>{t("locked_on", { date: new Date(gov.lockedAt).toLocaleString() })}</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
