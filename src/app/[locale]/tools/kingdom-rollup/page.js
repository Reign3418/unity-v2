"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { 
    Zap, RefreshCw, Copy, Download, Check, AlertTriangle, 
    TrendingUp, Swords, Skull, Wheat, Users, Building2, 
    ArrowUpRight, ArrowDownRight, Clock, ShieldAlert, Sparkles,
    Database, ArrowUp, ArrowDown, UserPlus, UserMinus
} from "lucide-react";
import { downloadExcelFile } from "@/lib/excelHelper";
import { fmtCompact } from "@/lib/cerberusIntelligence";
import { formatDiscordRollupBrief, generateSyntheticRollupBenchmark } from "@/lib/kingdomRollupEngine";

export default function KingdomRollupPage() {
    const t = useTranslations("KingdomRollup");

    const [kd, setKd] = useState("4194");
    const [hours, setHours] = useState(24);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("alliances"); // 'alliances' | 'power' | 'kp' | 'deads' | 'harvest' | 'drift'
    const [copiedId, setCopiedId] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    // Initial load: trigger instant synthetic benchmark demo so user immediately sees UI
    useEffect(() => {
        runRollup(true, 24);
    }, []);

    const showToast = useCallback((msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    }, []);

    const runRollup = async (useDemo = false, targetHours = hours) => {
        setLoading(true);
        setError(null);
        setHours(targetHours);

        try {
            if (useDemo || kd.toUpperCase() === "DEMO") {
                const benchmark = generateSyntheticRollupBenchmark(targetHours);
                setData({
                    success: true,
                    kingdomId: "4194-DEMO",
                    isDemo: true,
                    meta: benchmark.meta,
                    summary: benchmark.summary,
                    alliances: benchmark.alliances,
                    topPowerGainers: benchmark.topPowerGainers,
                    topPowerDroppers: benchmark.topPowerDroppers,
                    topKpGainers: benchmark.topKpGainers,
                    topCasualties: benchmark.topCasualties,
                    topGatherers: benchmark.topGatherers,
                    newArrivals: benchmark.newArrivals,
                    departures: benchmark.departures,
                    rawRoster: benchmark.rawRoster,
                });
            } else {
                if (!kd.trim()) return;
                const res = await fetch(`/api/lab/kingdom-rollup?kd=${encodeURIComponent(kd)}&hours=${targetHours}`);
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.error || "Failed to compile Kingdom Rollup.");
                }
                setData(json);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyId = (id) => {
        navigator.clipboard.writeText(String(id));
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyBrief = () => {
        if (!data) return;
        const text = formatDiscordRollupBrief(data);
        navigator.clipboard.writeText(text);
        showToast(t("toast_copied"));
    };

    const handleExportExcel = () => {
        if (!data || !data.summary) return;
        const kdName = data.kingdomId || kd;
        const dateStr = new Date().toISOString().split("T")[0];

        // Flatten full differential data
        const exportData = (data.rawRoster || []).map((g, idx) => ({
            "Rank": idx + 1,
            "Governor ID": g.id,
            "Governor Name": g.name,
            "Alliance (Current)": g.alliance,
            "Alliance (Start)": g.allianceStart,
            "Status": g.status,
            "Power (Current)": g.powerEnd,
            "Power Formatted": fmtCompact(g.powerEnd),
            "Power (Start)": g.powerStart,
            "Power Delta": g.powerDelta,
            "KP Delta": g.kpDelta,
            "KP Delta Formatted": fmtCompact(g.kpDelta),
            "Deads Delta": g.deadDelta,
            "Gathered Delta": g.gatheredDelta,
            "Gathered Delta Formatted": fmtCompact(g.gatheredDelta),
            "Troop Delta": g.troopDelta,
            "Tech Delta": g.techDelta,
        }));

        downloadExcelFile(exportData, `KD${kdName}_${hours}H_Executive_Rollup_${dateStr}.xlsx`, "Executive_Rollup");
        showToast(t("toast_copied"));
    };

    const s = data?.summary;
    const m = data?.meta;

    const getPaceBadge = (pace) => {
        switch (pace) {
            case "WAR_MOBILIZATION":
                return "bg-rose-500/10 border-rose-500/30 text-rose-400";
            case "CIVIL_SKIRMISH":
                return "bg-purple-500/10 border-purple-500/30 text-purple-400";
            case "PRE_KVK_PUSH":
                return "bg-amber-500/10 border-amber-500/30 text-amber-400";
            case "STEADY_GROWTH":
                return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
            case "ATROPHY":
                return "bg-red-500/10 border-red-500/30 text-red-400";
            default:
                return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
        }
    };

    const getPaceLabel = (pace) => {
        switch (pace) {
            case "WAR_MOBILIZATION": return t("pace_war_mobilization");
            case "CIVIL_SKIRMISH": return t("pace_civil_skirmish");
            case "PRE_KVK_PUSH": return t("pace_pre_kvk_push");
            case "STEADY_GROWTH": return t("pace_steady_growth");
            case "ATROPHY": return t("pace_atrophy");
            default: return t("pace_stable");
        }
    };

    const getMomentumBadge = (momentum) => {
        switch (momentum) {
            case "SURGING":
                return "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
            case "EXPANDING":
                return "bg-cyan-500/20 border-cyan-500/50 text-cyan-300";
            case "ATROPHY":
                return "bg-rose-500/20 border-rose-500/50 text-rose-300";
            default:
                return "bg-white/5 border-white/10 text-gray-400";
        }
    };

    return (
        <div className="min-h-screen bg-[#040608] text-white p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Toast Notification */}
                {toastMessage && (
                    <div className="fixed top-6 right-6 z-50 bg-emerald-500/90 text-black font-bold px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2 text-xs">
                        <Check size={16} />
                        <span>{toastMessage}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141a24] pb-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                                <Zap size={24} className="text-cyan-400" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
                                {t("page_title")}
                            </h1>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 rounded">
                                {t("badge_executive")}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 rounded">
                                {t("badge_zero_cost")}
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs md:text-sm max-w-3xl leading-relaxed">
                            {t("page_subtitle")}
                        </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            value={kd}
                            onChange={e => setKd(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && runRollup(false, hours)}
                            placeholder={t("input_kd_placeholder")}
                            className="bg-[#090d12] border border-[#1a2332] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 w-36 font-mono"
                            dir="ltr"
                        />

                        {/* Quick Presets */}
                        <div className="flex bg-[#090d12] border border-[#1a2332] rounded-xl p-1 text-xs font-mono">
                            {[24, 48, 72].map(h => (
                                <button
                                    key={h}
                                    onClick={() => runRollup(false, h)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                        hours === h 
                                            ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]" 
                                            : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    {h}h
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => runRollup(false, hours)}
                            disabled={loading || !kd.trim()}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                            <span>{loading ? t("btn_compiling") : t("btn_run_rollup")}</span>
                        </button>

                        <button
                            onClick={() => runRollup(true, hours)}
                            disabled={loading}
                            className="px-3.5 py-2 bg-[#10161f] border border-[#1a2332] hover:border-emerald-500/40 text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <Database size={13} />
                            <span>{t("btn_demo")}</span>
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Main Content Area */}
                {!loading && data && (
                    <>
                        {/* Executive Macro KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" dir="ltr">
                            {/* Card 1: Net Power */}
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_net_power")} ({m?.hoursDiff}h)
                                </span>
                                <div className={`text-2xl md:text-3xl font-black font-mono flex items-center gap-1.5 ${
                                    (s?.netPowerDelta || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}>
                                    {(s?.netPowerDelta || 0) >= 0 ? "+" : ""}{fmtCompact(s?.netPowerDelta || 0)}
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1 truncate" title={t("sub_organic_flow", {
                                    organic: `${(s?.organicPowerDelta || 0) >= 0 ? "+" : ""}${fmtCompact(s?.organicPowerDelta || 0)}`,
                                    migrants: fmtCompact(s?.migratedInPower || 0),
                                    departures: fmtCompact(s?.migratedOutPower || 0)
                                })}>
                                    {t("sub_organic_flow", {
                                        organic: `${(s?.organicPowerDelta || 0) >= 0 ? "+" : ""}${fmtCompact(s?.organicPowerDelta || 0)}`,
                                        migrants: fmtCompact(s?.migratedInPower || 0),
                                        departures: fmtCompact(s?.migratedOutPower || 0)
                                    })}
                                </span>
                            </div>

                            {/* Card 2: War KP */}
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_war_kp")}
                                </span>
                                <div className="text-2xl md:text-3xl font-black text-cyan-400 font-mono">
                                    +{fmtCompact(s?.totalKpDelta || 0)}
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1">
                                    {t("sub_active_warriors", { count: s?.activeWarriorsCount || 0 })}
                                </span>
                            </div>

                            {/* Card 3: Casualties (Deads) */}
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_casualties")}
                                </span>
                                <div className="text-2xl md:text-3xl font-black text-rose-400 font-mono">
                                    -{fmtCompact(s?.totalDeadsDelta || 0)}
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1">
                                    {t("sub_frontline_losses")}
                                </span>
                            </div>

                            {/* Card 4: Harvest (RSS) */}
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_harvest")}
                                </span>
                                <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono">
                                    +{fmtCompact(s?.totalGatheredDelta || 0)}
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1">
                                    {t("sub_economic_harvest")}
                                </span>
                            </div>

                            {/* Card 5: Posture & Turnover */}
                            <div className="col-span-2 lg:col-span-1 bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)] flex flex-col justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_turnover")}
                                </span>
                                <div>
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getPaceBadge(s?.kingdomPace)}`}>
                                        {getPaceLabel(s?.kingdomPace)}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1 truncate">
                                    {t("sub_turnover_breakdown", {
                                        migrants: s?.newArrivalsCount || 0,
                                        departures: s?.departuresCount || 0,
                                        sleepers: s?.sleepingAccountsCount || 0
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Navigation Sub-Tabs & Actions */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1a2332] pb-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    onClick={() => setActiveTab("alliances")}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeTab === "alliances"
                                            ? "bg-cyan-500 text-black font-black shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                            : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                    }`}
                                >
                                    <Building2 size={14} />
                                    <span>{t("tab_alliances")}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/20">
                                        {data.alliances?.length || 0}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("power")}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeTab === "power"
                                            ? "bg-emerald-500 text-black font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                            : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                    }`}
                                >
                                    <TrendingUp size={14} />
                                    <span>{t("tab_power")}</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("kp")}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeTab === "kp"
                                            ? "bg-rose-500 text-black font-black shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                                            : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                    }`}
                                >
                                    <Swords size={14} />
                                    <span>{t("tab_kp")}</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("deads")}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeTab === "deads"
                                            ? "bg-purple-500 text-black font-black shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                            : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                    }`}
                                >
                                    <Skull size={14} />
                                    <span>{t("tab_deads")}</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("harvest")}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeTab === "harvest"
                                            ? "bg-amber-500 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                            : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                    }`}
                                >
                                    <Wheat size={14} />
                                    <span>{t("tab_harvest")}</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("drift")}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeTab === "drift"
                                            ? "bg-indigo-500 text-white font-black shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                            : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                    }`}
                                >
                                    <Users size={14} />
                                    <span>{t("tab_drift")}</span>
                                </button>
                            </div>

                            {/* Toolbar Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportExcel}
                                    className="px-3 py-1.5 bg-[#10161f] border border-[#1a2332] hover:border-emerald-500/50 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Download size={13} />
                                    <span>{t("btn_export_excel")}</span>
                                </button>

                                <button
                                    onClick={handleCopyBrief}
                                    className="px-3 py-1.5 bg-[#10161f] border border-[#1a2332] hover:border-cyan-500/50 text-cyan-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                                >
                                    <Sparkles size={13} />
                                    <span>{t("btn_copy_brief")}</span>
                                </button>
                            </div>
                        </div>

                        {/* TAB 1: ALLIANCE MOMENTUM */}
                        {activeTab === "alliances" && (
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                <div>
                                    <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                        {t("section_alliances_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                        {t("section_alliances_desc")}
                                    </p>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-[#1a2332]">
                                    <table className="w-full text-left text-xs font-mono">
                                        <thead className="bg-[#0c1017] text-gray-400 uppercase text-[9px] tracking-wider border-b border-[#1a2332]">
                                            <tr>
                                                <th className="py-3 px-4 w-12 text-center">{t("col_rank")}</th>
                                                <th className="py-3 px-4">{t("col_alliance")}</th>
                                                <th className="py-3 px-4 text-right">{t("col_power_delta")}</th>
                                                <th className="py-3 px-4 text-right">{t("col_kp_delta")}</th>
                                                <th className="py-3 px-4 text-right">{t("col_dead_delta")}</th>
                                                <th className="py-3 px-4 text-right">{t("col_gathered_delta")}</th>
                                                <th className="py-3 px-4 text-center">{t("col_members")}</th>
                                                <th className="py-3 px-4 text-center">{t("col_momentum")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#141a24] bg-[#090d12]">
                                            {data.alliances.map((a, idx) => {
                                                const pSign = a.netPowerDelta >= 0 ? "+" : "";
                                                return (
                                                    <tr key={a.tag} className="hover:bg-[#0e141e] transition-colors">
                                                        <td className="py-3 px-4 text-center font-bold text-gray-500 whitespace-nowrap" dir="ltr">
                                                            #{idx + 1}
                                                        </td>

                                                        <td className="py-3 px-4 whitespace-nowrap font-black text-white text-sm">
                                                            [{a.tag}]
                                                        </td>

                                                        <td className={`py-3 px-4 text-right whitespace-nowrap font-bold ${
                                                            a.netPowerDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                                                        }`} dir="ltr">
                                                            {pSign}{fmtCompact(a.netPowerDelta)}
                                                        </td>

                                                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-cyan-400" dir="ltr">
                                                            +{fmtCompact(a.kpDelta)}
                                                        </td>

                                                        <td className="py-3 px-4 text-right whitespace-nowrap text-rose-400" dir="ltr">
                                                            -{fmtCompact(a.deadDelta)}
                                                        </td>

                                                        <td className="py-3 px-4 text-right whitespace-nowrap text-amber-400" dir="ltr">
                                                            +{fmtCompact(a.gatheredDelta)}
                                                        </td>

                                                        <td className="py-3 px-4 text-center whitespace-nowrap text-gray-400" dir="ltr">
                                                            {a.totalMembers}
                                                        </td>

                                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMomentumBadge(a.momentum)}`}>
                                                                {a.momentum === "SURGING" ? t("badge_surging") : (a.momentum === "EXPANDING" ? t("badge_expanding") : (a.momentum === "ATROPHY" ? t("badge_atrophy") : t("badge_stable")))}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: POWER MOVERS (Gainers & Droppers) */}
                        {activeTab === "power" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Top Power Gainers */}
                                <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={16} className="text-emerald-400" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                                            {t("title_gainers")}
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {data.topPowerGainers.map((g, i) => (
                                            <div key={g.id} className="p-3 bg-[#0c1017] border border-[#1a2332] rounded-xl flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-gray-500 font-bold text-xs font-mono">#{i + 1}</span>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-white text-xs">{g.name}</span>
                                                            <span className="text-[10px] text-gray-500 font-mono">[{g.alliance}]</span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
                                                            ID: {g.id} • Now: {fmtCompact(g.powerEnd)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right font-mono" dir="ltr">
                                                    <span className="font-black text-emerald-400 text-sm block">
                                                        +{fmtCompact(g.powerDelta)}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500">
                                                        +{fmtCompact(g.troopDelta)} troop
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Power Droppers */}
                                <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Skull size={16} className="text-rose-400" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400">
                                            {t("title_droppers")}
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {data.topPowerDroppers.map((g, i) => (
                                            <div key={g.id} className="p-3 bg-[#0c1017] border border-[#1a2332] rounded-xl flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-gray-500 font-bold text-xs font-mono">#{i + 1}</span>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-white text-xs">{g.name}</span>
                                                            <span className="text-[10px] text-gray-500 font-mono">[{g.alliance}]</span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
                                                            ID: {g.id} • Now: {fmtCompact(g.powerEnd)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right font-mono" dir="ltr">
                                                    <span className="font-black text-rose-400 text-sm block">
                                                        {fmtCompact(g.powerDelta)}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500">
                                                        {g.deadDelta > 0 ? `-${fmtCompact(g.deadDelta)} deads` : "troop trim"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: WAR COMBATANTS (KP Scorers) */}
                        {activeTab === "kp" && (
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                <div>
                                    <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                        {t("section_kp_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                        {t("section_kp_desc")}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {data.topKpGainers.map((g, i) => (
                                        <div key={g.id} className="p-3.5 bg-[#0c1017] border border-[#1a2332] rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-cyan-400 font-mono font-bold text-sm">#{i + 1}</span>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white text-sm">{g.name}</span>
                                                        <span className="text-[10px] bg-[#10161f] border border-[#1a2332] px-1.5 py-0.2 rounded font-mono">[{g.alliance}]</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
                                                        Total KP: {fmtCompact(g.kpEnd)} • Power: {fmtCompact(g.powerEnd)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right font-mono" dir="ltr">
                                                <span className="font-black text-cyan-400 text-base block">
                                                    +{fmtCompact(g.kpDelta)} KP
                                                </span>
                                                <span className="text-[9px] text-gray-500">
                                                    {g.deadDelta > 0 ? `-${fmtCompact(g.deadDelta)} deads` : "0 losses"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: CASUALTIES (Deads) */}
                        {activeTab === "deads" && (
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                <div>
                                    <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                        {t("section_casualties_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                        {t("section_casualties_desc")}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {data.topCasualties.map((g, i) => (
                                        <div key={g.id} className="p-3.5 bg-[#0c1017] border border-[#1a2332] rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-rose-400 font-mono font-bold text-sm">#{i + 1}</span>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white text-sm">{g.name}</span>
                                                        <span className="text-[10px] bg-[#10161f] border border-[#1a2332] px-1.5 py-0.2 rounded font-mono">[{g.alliance}]</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
                                                        Lifetime Deads: {fmtCompact(g.deadEnd)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right font-mono" dir="ltr">
                                                <span className="font-black text-rose-400 text-base block">
                                                    -{g.deadDelta.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-gray-500">
                                                    +{fmtCompact(g.kpDelta)} KP
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 5: TOP HARVESTERS (RSS Gathered) */}
                        {activeTab === "harvest" && (
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                <div>
                                    <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                        {t("section_harvest_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                        {t("section_harvest_desc")}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {data.topGatherers.map((g, i) => (
                                        <div key={g.id} className="p-3.5 bg-[#0c1017] border border-[#1a2332] rounded-xl flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-amber-400 font-mono font-bold text-sm">#{i + 1}</span>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white text-sm">{g.name}</span>
                                                        <span className="text-[10px] bg-[#10161f] border border-[#1a2332] px-1.5 py-0.2 rounded font-mono">[{g.alliance}]</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
                                                        Power: {fmtCompact(g.powerEnd)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right font-mono" dir="ltr">
                                                <span className="font-black text-amber-400 text-base block">
                                                    +{fmtCompact(g.gatheredDelta)}
                                                </span>
                                                <span className="text-[9px] text-gray-500">
                                                    +{fmtCompact(g.powerDelta)} power
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 6: MIGRATION DRIFT (New vs Departed) */}
                        {activeTab === "drift" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* New Arrivals */}
                                <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserPlus size={16} className="text-cyan-400" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                                                {t("badge_new_migrant")} ({data.newArrivals.length})
                                            </h3>
                                        </div>
                                        <span className="text-xs font-mono text-cyan-400 font-bold" dir="ltr">
                                            +{fmtCompact(s?.migratedInPower || 0)}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {data.newArrivals.length === 0 ? (
                                            <p className="text-gray-500 text-xs py-4 text-center font-mono">0 New Arrivals in window</p>
                                        ) : data.newArrivals.map((g, i) => (
                                            <div key={g.id} className="p-3 bg-[#0c1017] border border-[#1a2332] rounded-xl flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white text-xs">{g.name}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono">[{g.alliance}]</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-mono" dir="ltr">ID: {g.id}</span>
                                                </div>
                                                <div className="text-right font-mono" dir="ltr">
                                                    <span className="font-black text-cyan-400 text-sm block">
                                                        +{fmtCompact(g.powerEnd)}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500">
                                                        {fmtCompact(g.kpEnd)} KP
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Departures / Missing */}
                                <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserMinus size={16} className="text-rose-400" />
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400">
                                                {t("badge_departed")} ({data.departures.length})
                                            </h3>
                                        </div>
                                        <span className="text-xs font-mono text-rose-400 font-bold" dir="ltr">
                                            -{fmtCompact(s?.migratedOutPower || 0)}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {data.departures.length === 0 ? (
                                            <p className="text-gray-500 text-xs py-4 text-center font-mono">0 Departures in window</p>
                                        ) : data.departures.map((g, i) => (
                                            <div key={g.id} className="p-3 bg-[#0c1017] border border-[#1a2332] rounded-xl flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white text-xs">{g.name}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono">[{g.allianceStart}]</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-mono" dir="ltr">ID: {g.id}</span>
                                                </div>
                                                <div className="text-right font-mono" dir="ltr">
                                                    <span className="font-black text-rose-400 text-sm block">
                                                        -{fmtCompact(g.powerStart)}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500">
                                                        Left top roster / zeroed
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Initial Empty State before scan */}
                {!loading && !data && (
                    <div className="py-24 text-center space-y-3 font-mono">
                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <Zap size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                            {t("initial_title")}
                        </h3>
                        <p className="text-gray-500 text-xs max-w-md mx-auto">
                            {t("initial_desc")}
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
