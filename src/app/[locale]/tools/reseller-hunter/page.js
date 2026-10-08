"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { 
    Bot, RefreshCw, Search, ShieldAlert, AlertTriangle, 
    Download, Copy, Check, Filter, Layers, Zap, 
    ExternalLink, X, TrendingUp, Skull, Sparkles, Building2,
    Database, Crosshair, Wheat, Award
} from "lucide-react";
import { downloadExcelFile } from "@/lib/excelHelper";
import { fmtCompact } from "@/lib/cerberusIntelligence";
import { detectResellers, generateSyntheticResellerBenchmark } from "@/lib/resellerDetector";

export default function ResellerHunterPage() {
    const t = useTranslations("ResellerHunter");

    const [kd, setKd] = useState("4194");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [isDemo, setIsDemo] = useState(false);
    const [activeTab, setActiveTab] = useState("bots"); // 'bots' | 'gatherers' | 'alliances'

    // Forensic Filter Tuners
    const [searchQuery, setSearchQuery] = useState("");
    const [maxPower, setMaxPower] = useState(75_000_000);
    const [minGathered, setMinGathered] = useState(50_000_000);
    const [maxKp, setMaxKp] = useState(25_000_000);
    const [minConfidence, setMinConfidence] = useState(35);
    const [selectedAlliance, setSelectedAlliance] = useState(null);
    const [sortBy, setSortBy] = useState("confidence"); // 'confidence' | 'gathered' | 'ratio' | 'power' | 'kp'
    const [copiedId, setCopiedId] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    // Initial load: trigger synthetic benchmark demo so user sees instant value
    useEffect(() => {
        runScan(true);
    }, []);

    const showToast = useCallback((msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    }, []);

    const runScan = async (useDemo = false) => {
        setLoading(true);
        setError(null);
        setSelectedAlliance(null);

        try {
            if (useDemo || kd.toUpperCase() === "DEMO") {
                // Client-side instant zero-cost demo
                const demoRoster = generateSyntheticResellerBenchmark();
                const analysis = detectResellers(demoRoster, { maxPower, minGathered, maxKp, minConfidence });
                setData({
                    kingdomId: "DEMO-SYNDICATE",
                    isDemo: true,
                    summary: analysis.summary,
                    allianceHives: analysis.allianceHives,
                    resellers: analysis.resellers,
                    allCandidates: analysis.allCandidates,
                    topGatherers: analysis.topGatherers,
                    allAllianceHarvest: analysis.allAllianceHarvest,
                    rawRoster: demoRoster,
                });
                setIsDemo(true);
            } else {
                if (!kd.trim()) return;
                const effectivePower = maxPower >= 150_000_000 ? 999_999_999 : maxPower;
                const effectiveKp = maxKp >= 100_000_000 ? 999_999_999 : maxKp;
                const res = await fetch(`/api/lab/reseller-hunter?kd=${encodeURIComponent(kd)}&maxPower=${effectivePower}&minGathered=${minGathered}&maxKp=${effectiveKp}&minConfidence=${minConfidence}`);
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.error || "Failed to scan kingdom for reseller syndicates.");
                }
                setData(json);
                setIsDemo(false);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Client-side dynamic recalculation: re-analyzes candidates instantly when sliders shift
    const dynamicAnalysis = useMemo(() => {
        const pool = data?.allCandidates || data?.rawRoster;
        if (!pool || pool.length === 0) {
            return {
                resellers: data?.resellers || [],
                allianceHives: data?.allianceHives || [],
                topGatherers: data?.topGatherers || [],
                allAllianceHarvest: data?.allAllianceHarvest || [],
                summary: data?.summary || null,
            };
        }
        return detectResellers(pool, {
            maxPower: maxPower >= 150_000_000 ? 999_999_999_999 : maxPower,
            minGathered,
            maxKp: maxKp >= 100_000_000 ? 999_999_999_999 : maxKp,
            minConfidence,
        });
    }, [data, maxPower, minGathered, maxKp, minConfidence]);

    // Filtered Resellers (Bot list)
    const filteredResellers = useMemo(() => {
        const list = [...(dynamicAnalysis.resellers || [])];
        const q = searchQuery.trim().toLowerCase();

        return list.filter(r => {
            if (selectedAlliance && r.alliance !== selectedAlliance) return false;
            if (q) {
                const nameMatch = r.name.toLowerCase().includes(q);
                const idMatch = String(r.id).includes(q);
                const tagMatch = r.alliance.toLowerCase().includes(q);
                if (!nameMatch && !idMatch && !tagMatch) return false;
            }
            return true;
        }).sort((a, b) => {
            if (sortBy === "confidence") return b.confidence - a.confidence || b.gathered - a.gathered;
            if (sortBy === "gathered") return b.gathered - a.gathered;
            if (sortBy === "ratio") return b.farmingRatio - a.farmingRatio;
            if (sortBy === "power") return b.power - a.power;
            if (sortBy === "kp") return a.killPoints - b.killPoints;
            return 0;
        });
    }, [dynamicAnalysis.resellers, selectedAlliance, searchQuery, sortBy]);

    // Filtered Top Gatherers
    const filteredTopGatherers = useMemo(() => {
        const list = [...(dynamicAnalysis.topGatherers || data?.topGatherers || [])];
        const q = searchQuery.trim().toLowerCase();

        return list.filter(g => {
            if (selectedAlliance && g.alliance !== selectedAlliance) return false;
            if (q) {
                const nameMatch = g.name.toLowerCase().includes(q);
                const idMatch = String(g.id).includes(q);
                const tagMatch = g.alliance.toLowerCase().includes(q);
                if (!nameMatch && !idMatch && !tagMatch) return false;
            }
            return true;
        }).sort((a, b) => {
            if (sortBy === "confidence") return b.confidence - a.confidence;
            if (sortBy === "ratio") return b.farmingRatio - a.farmingRatio;
            if (sortBy === "power") return b.power - a.power;
            if (sortBy === "kp") return a.killPoints - b.killPoints;
            return b.gathered - a.gathered;
        });
    }, [dynamicAnalysis.topGatherers, data?.topGatherers, selectedAlliance, searchQuery, sortBy]);

    // Filtered Alliance Harvest
    const filteredAllianceHarvest = useMemo(() => {
        const list = [...(dynamicAnalysis.allAllianceHarvest || data?.allAllianceHarvest || [])];
        const q = searchQuery.trim().toLowerCase();

        return list.filter(a => {
            if (q && !a.tag.toLowerCase().includes(q)) return false;
            return true;
        }).sort((a, b) => b.totalGathered - a.totalGathered);
    }, [dynamicAnalysis.allAllianceHarvest, data?.allAllianceHarvest, searchQuery]);

    // Copy Governor ID
    const handleCopyId = (id) => {
        navigator.clipboard.writeText(String(id));
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Excel Export
    const handleExportExcel = () => {
        const kdName = data?.kingdomId || kd;
        const dateStr = new Date().toISOString().split("T")[0];

        if (activeTab === "gatherers") {
            if (!filteredTopGatherers.length) return;
            const exportData = filteredTopGatherers.map((g, idx) => ({
                "Rank": idx + 1,
                "Governor ID": g.id,
                "Governor Name": g.name,
                "Alliance": g.alliance,
                "Power": g.power,
                "Power Formatted": fmtCompact(g.power),
                "Resources Gathered": g.gathered,
                "Gathered Formatted": fmtCompact(g.gathered),
                "Farming Ratio": `${Math.round(g.farmingRatio)}x`,
                "Kill Points": g.killPoints,
                "Deads": g.deads,
                "Is Suspected Bot": g.isSuspectedReseller ? "YES" : "NO",
                "Bot Confidence": `${g.confidence}%`,
            }));
            downloadExcelFile(exportData, `KD${kdName}_Top_Gatherers_${dateStr}.xlsx`, "Top_Gatherers");
            showToast(t("toast_copied"));
            return;
        }

        if (activeTab === "alliances") {
            if (!filteredAllianceHarvest.length) return;
            const exportData = filteredAllianceHarvest.map((a, idx) => ({
                "Rank": idx + 1,
                "Alliance Tag": a.tag,
                "Total Resources Gathered": a.totalGathered,
                "Gathered Formatted": fmtCompact(a.totalGathered),
                "Avg RSS / Member": fmtCompact(a.avgGathered),
                "Total Power": a.totalPower,
                "Scanned Members": a.totalMembers,
                "Bot Count": a.botCount,
                "Bot Density": `${a.botDensity}%`,
                "Hive Status": a.status,
            }));
            downloadExcelFile(exportData, `KD${kdName}_Alliance_Harvest_${dateStr}.xlsx`, "Alliance_Harvest");
            showToast(t("toast_copied"));
            return;
        }

        // Default: Reseller Audit
        if (!filteredResellers.length) return;
        const exportData = filteredResellers.map((r, idx) => ({
            "Rank": idx + 1,
            "Confidence": `${r.confidence}%`,
            "Classification": r.classification,
            "Governor ID": r.id,
            "Governor Name": r.name,
            "Alliance": r.alliance,
            "Power": r.power,
            "Power Formatted": fmtCompact(r.power),
            "Resources Gathered": r.gathered,
            "Gathered Formatted": fmtCompact(r.gathered),
            "Farming Overdrive Ratio": `${Math.round(r.farmingRatio)}x`,
            "Kill Points": r.killPoints,
            "Deads": r.deads,
            "Assistance": r.assistance,
            "Forensic Flags": (r.flags || []).map(f => f.val || f.code).join(" | "),
        }));

        downloadExcelFile(exportData, `KD${kdName}_Reseller_Syndicate_Audit_${dateStr}.xlsx`, "Reseller_Audit");
        showToast(t("toast_copied"));
    };

    // Discord Hitlist Formatter
    const handleCopyHitlist = () => {
        const targetList = activeTab === "gatherers" ? filteredTopGatherers : filteredResellers;
        if (!targetList.length) return;

        const header = t("hitlist_header", { kd: data?.kingdomId || kd });
        const summary = t("hitlist_summary", { 
            count: targetList.length, 
            rss: fmtCompact(targetList.reduce((s, r) => s + r.gathered, 0)) 
        });

        const lines = targetList.slice(0, 35).map((r, i) => {
            return t("hitlist_item", {
                index: i + 1,
                name: r.name,
                id: r.id,
                power: fmtCompact(r.power),
                rss: fmtCompact(r.gathered),
                kp: fmtCompact(r.killPoints),
                alliance: r.alliance,
            });
        });

        const fullText = `${header}\n${summary}\n\n` + lines.join("\n") + (targetList.length > 35 ? `\n...and ${targetList.length - 35} more accounts.` : "");
        navigator.clipboard.writeText(fullText);
        showToast(t("toast_copied"));
    };

    // In-Game Mail Formatter
    const handleCopyMail = () => {
        const hives = dynamicAnalysis.allianceHives || [];
        const topAlliances = hives.slice(0, 3).map(h => `[${h.tag}]`).join(", ") || "[FARM]";
        const mail = `${t("mail_template_subject")}\n\n${t("mail_template_body", { alliances: topAlliances })}`;
        navigator.clipboard.writeText(mail);
        showToast(t("toast_copied"));
    };

    const s = dynamicAnalysis.summary || data?.summary;
    const hives = dynamicAnalysis.allianceHives || [];

    const getThreatBadge = (level) => {
        if (level === "CRITICAL") return "bg-rose-500/10 border-rose-500/30 text-rose-400";
        if (level === "HIGH") return "bg-amber-500/10 border-amber-500/30 text-amber-400";
        if (level === "MODERATE") return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    };

    const getFlagLabel = (code) => {
        switch (code) {
            case "FARMING_OVERDRIVE": return t("flag_farming_overdrive");
            case "HIGH_FARM_OUTPUT": return t("flag_high_farm_output");
            case "ELEVATED_FARMING": return t("flag_elevated_farming");
            case "GIGANTIC_STOCKPILE": return t("flag_gigantic_stockpile");
            case "BILLION_GATHERED": return t("flag_billion_gathered");
            case "HIGH_GATHERED": return t("flag_high_gathered");
            case "ZERO_WAR_FOOTPRINT": return t("flag_zero_war_footprint");
            case "PACIFIST_COMBAT_RATIO": return t("flag_pacifist_combat_ratio");
            case "LOW_WAR_ACTIVITY": return t("flag_low_war_activity");
            case "FARM_POWER_TIER": return t("flag_farm_power_tier");
            case "SENIOR_FARM_TIER": return t("flag_senior_farm_tier");
            case "HIGH_POWER_FARM": return t("flag_high_power_farm");
            case "MASSIVE_RSS_EXPORTER": return t("flag_massive_rss_exporter");
            case "HIGH_RSS_ASSIST": return t("flag_high_rss_assist");
            case "CONFIRMED_HIVE_CLUSTER": return t("flag_confirmed_hive_cluster");
            case "SUSPECTED_HIVE_CLUSTER": return t("flag_suspected_hive_cluster");
            case "AUTOMATED_NAME_SEQUENCE": return t("flag_automated_name_sequence");
            default: return code;
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
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                                <Bot size={24} className="text-rose-400" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
                                {t("page_title")}
                            </h1>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 rounded">
                                {t("badge_syndicate")}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 rounded">
                                {t("badge_zero_cost")}
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs md:text-sm max-w-3xl leading-relaxed">
                            {t("page_subtitle")}
                        </p>
                    </div>

                    {/* Scan Action Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <input
                                value={kd}
                                onChange={e => setKd(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && runScan(false)}
                                placeholder={t("input_kd_placeholder")}
                                className="bg-[#090d12] border border-[#1a2332] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50 w-36 font-mono"
                                dir="ltr"
                            />
                        </div>

                        <button
                            onClick={() => runScan(false)}
                            disabled={loading || !kd.trim()}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] cursor-pointer flex items-center gap-1.5"
                        >
                            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                            <span>{loading ? t("btn_scanning") : t("btn_scan")}</span>
                        </button>

                        <button
                            onClick={() => runScan(true)}
                            disabled={loading}
                            className="px-3.5 py-2 bg-[#10161f] border border-[#1a2332] hover:border-cyan-500/40 text-cyan-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
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

                {/* Loading Radar Animation */}
                {loading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="relative w-20 h-20 rounded-full border-2 border-rose-500/30 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                            <Crosshair size={32} className="text-rose-400 animate-spin" />
                            <div className="absolute inset-0 rounded-full border border-rose-400/40 animate-ping" />
                        </div>
                        <span className="text-xs uppercase tracking-widest text-rose-400 font-mono font-bold animate-pulse">
                            {t("btn_scanning")}
                        </span>
                    </div>
                )}

                {/* Main Content Area */}
                {!loading && data && (
                    <>
                        {/* Executive KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" dir="ltr">
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_suspected_bots")}
                                </span>
                                <div className="text-2xl md:text-3xl font-black text-rose-400 font-mono">
                                    {s?.totalSuspected || 0}
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1">
                                    / {s?.totalScanned || 0} scanned
                                </span>
                            </div>

                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_illicit_rss")}
                                </span>
                                <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono">
                                    {fmtCompact(s?.totalIllicitRss || 0)}
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1">
                                    Suspected Bot Hoard
                                </span>
                            </div>

                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_total_kingdom_rss")}
                                </span>
                                <div className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">
                                    {fmtCompact(s?.totalKingdomGathered || 0)}
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1">
                                    {s?.totalFarmers || 0} active gatherers
                                </span>
                            </div>

                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_active_hives")}
                                </span>
                                <div className="text-2xl md:text-3xl font-black text-purple-400 font-mono">
                                    {s?.hiveAllianceCount || 0}
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1">
                                    Shell Farm Clusters
                                </span>
                            </div>

                            <div className="col-span-2 md:col-span-1 bg-[#090d12] border border-[#1a2332] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)] flex flex-col justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    {t("stat_threat_level")}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-lg border font-black text-xs uppercase tracking-widest ${getThreatBadge(s?.syndicateThreatLevel)}`}>
                                        {s?.syndicateThreatLevel || "CLEAR"}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-500 block mt-1">
                                    {isDemo ? "Synthetic Benchmark" : `Kingdom ${data?.kingdomId}`}
                                </span>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-2 border-b border-[#1a2332] pb-3 flex-wrap">
                            <button
                                onClick={() => setActiveTab("bots")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === "bots"
                                        ? "bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                                        : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                }`}
                            >
                                <Bot size={15} />
                                <span>{t("tab_reseller_bots")}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-400">
                                    {filteredResellers.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab("gatherers")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === "gatherers"
                                        ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                                        : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                }`}
                            >
                                <Wheat size={15} />
                                <span>{t("tab_top_gatherers")}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400">
                                    {filteredTopGatherers.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab("alliances")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === "alliances"
                                        ? "bg-purple-500/20 border border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                                        : "bg-[#090d12] border border-[#1a2332] text-gray-400 hover:text-white"
                                }`}
                            >
                                <Building2 size={15} />
                                <span>{t("tab_alliance_harvest")}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-400">
                                    {filteredAllianceHarvest.length}
                                </span>
                            </button>
                        </div>

                        {/* Tuner Sliders & Global Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-[#090d12] border border-[#1a2332] rounded-2xl text-xs font-mono">
                            <div className="relative col-span-1 sm:col-span-2 lg:col-span-2">
                                <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={t("filter_search_placeholder")}
                                    className="w-full bg-[#0c1017] border border-[#1a2332] rounded-lg pl-9 pr-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/50"
                                />
                            </div>

                            <div className="flex flex-col gap-1" dir="ltr">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>{t("filter_max_power")}</span>
                                    <span className="font-bold text-white">
                                        {maxPower >= 150_000_000 ? t("label_no_limit") : fmtCompact(maxPower)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={5_000_000}
                                    max={150_000_000}
                                    step={5_000_000}
                                    value={maxPower}
                                    onChange={e => setMaxPower(Number(e.target.value))}
                                    className="accent-rose-500 h-1 bg-[#1a2332] rounded cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-col gap-1" dir="ltr">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>{t("filter_min_rss")}</span>
                                    <span className="font-bold text-amber-400">{fmtCompact(minGathered)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={10_000_000}
                                    max={1_000_000_000}
                                    step={25_000_000}
                                    value={minGathered}
                                    onChange={e => setMinGathered(Number(e.target.value))}
                                    className="accent-amber-400 h-1 bg-[#1a2332] rounded cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-col gap-1" dir="ltr">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>{t("filter_max_kp")}</span>
                                    <span className="font-bold text-cyan-400">
                                        {maxKp >= 100_000_000 ? t("label_no_limit") : fmtCompact(maxKp)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={1_000_000}
                                    max={100_000_000}
                                    step={5_000_000}
                                    value={maxKp}
                                    onChange={e => setMaxKp(Number(e.target.value))}
                                    className="accent-cyan-400 h-1 bg-[#1a2332] rounded cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-col gap-1" dir="ltr">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>{t("filter_confidence")}</span>
                                    <span className="font-bold text-purple-400">{minConfidence}%+</span>
                                </div>
                                <input
                                    type="range"
                                    min={20}
                                    max={90}
                                    step={5}
                                    value={minConfidence}
                                    onChange={e => setMinConfidence(Number(e.target.value))}
                                    className="accent-purple-400 h-1 bg-[#1a2332] rounded cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Active Alliance Filter Indicator */}
                        {selectedAlliance && (
                            <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs text-purple-300">
                                <span>{t("label_active_filter_hive", { alliance: selectedAlliance })}</span>
                                <button
                                    onClick={() => setSelectedAlliance(null)}
                                    className="p-1 hover:text-white cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* TAB 1: RESELLER & FARM BOTS */}
                        {activeTab === "bots" && (
                            <div className="space-y-6">
                                {/* Alliance Hives Section */}
                                {hives.length > 0 && (
                                    <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between gap-4 flex-wrap">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={16} className="text-purple-400" />
                                                    <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                                        {t("section_hives_title")}
                                                    </h2>
                                                </div>
                                                <p className="text-gray-400 text-xs mt-0.5">
                                                    {t("section_hives_desc")}
                                                </p>
                                            </div>

                                            {selectedAlliance && (
                                                <button
                                                    onClick={() => setSelectedAlliance(null)}
                                                    className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <X size={12} />
                                                    <span>{t("btn_clear_filter")}</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {hives.map(h => {
                                                const isSelected = selectedAlliance === h.tag;
                                                const isConfirmed = h.status === "CONFIRMED_HIVE";
                                                return (
                                                    <div
                                                        key={h.tag}
                                                        className={`p-4 rounded-xl border transition-all ${
                                                            isSelected
                                                                ? "bg-purple-950/30 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                                                                : isConfirmed
                                                                ? "bg-[#0c1017] border-rose-500/40 hover:border-rose-400/80"
                                                                : "bg-[#0c1017] border-[#1a2332] hover:border-gray-500"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-base font-black text-white">
                                                                    [{h.tag}]
                                                                </span>
                                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                                    isConfirmed 
                                                                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                                                                        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                                                }`}>
                                                                    {isConfirmed ? t("badge_confirmed_hive") : t("badge_outpost")}
                                                                </span>
                                                            </div>

                                                            <button
                                                                onClick={() => setSelectedAlliance(isSelected ? null : h.tag)}
                                                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                                                    isSelected
                                                                        ? "bg-purple-500 text-black border-purple-400"
                                                                        : "bg-[#10161f] text-gray-300 border-[#1a2332] hover:border-purple-400/50 hover:text-white"
                                                                }`}
                                                            >
                                                                {isSelected ? t("btn_clear_filter") : t("btn_filter_hive")}
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-center mb-3" dir="ltr">
                                                            <div className="bg-[#090d12] border border-[#1a2332] rounded-lg p-1.5">
                                                                <span className="text-gray-500 block uppercase text-[8px]">{t("label_density")}</span>
                                                                <span className="font-bold text-rose-400">{h.botCount} ({h.botDensity}%)</span>
                                                            </div>
                                                            <div className="bg-[#090d12] border border-[#1a2332] rounded-lg p-1.5">
                                                                <span className="text-gray-500 block uppercase text-[8px]">{t("label_total_rss")}</span>
                                                                <span className="font-bold text-amber-400">{fmtCompact(h.totalBotRss)}</span>
                                                            </div>
                                                            <div className="bg-[#090d12] border border-[#1a2332] rounded-lg p-1.5">
                                                                <span className="text-gray-500 block uppercase text-[8px]">{t("label_avg_ratio")}</span>
                                                                <span className="font-bold text-cyan-400">{h.avgFarmingRatio}x</span>
                                                            </div>
                                                        </div>

                                                        {/* Sample Bot Accounts Pill Preview */}
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {h.bots.slice(0, 3).map(b => (
                                                                <span key={b.id} className="text-[9px] bg-[#10161f] border border-[#1a2332] px-2 py-0.5 rounded text-gray-400 font-mono truncate max-w-[120px]">
                                                                    {b.name}
                                                                </span>
                                                            ))}
                                                            {h.bots.length > 3 && (
                                                                <span className="text-[9px] text-gray-500 font-mono">
                                                                    +{h.bots.length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Suspected Accounts Table Area */}
                                <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                    {/* Table Toolbar */}
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert size={16} className="text-rose-400" />
                                                <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                                    {t("section_roster_title")}
                                                </h2>
                                                <span className="text-xs text-gray-500 font-mono" dir="ltr">
                                                    ({t("label_showing_results", { count: filteredResellers.length, total: dynamicAnalysis.resellers?.length || 0 })})
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-xs mt-0.5">
                                                {t("section_roster_desc")}
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={handleExportExcel}
                                                disabled={!filteredResellers.length}
                                                className="px-3 py-1.5 bg-[#10161f] border border-[#1a2332] hover:border-emerald-500/50 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <Download size={13} />
                                                <span>{t("btn_export_excel")}</span>
                                            </button>

                                            <button
                                                onClick={handleCopyHitlist}
                                                disabled={!filteredResellers.length}
                                                className="px-3 py-1.5 bg-[#10161f] border border-[#1a2332] hover:border-cyan-500/50 text-cyan-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            >
                                                <Copy size={13} />
                                                <span>{t("btn_copy_hitlist")}</span>
                                            </button>

                                            <button
                                                onClick={handleCopyMail}
                                                className="px-3 py-1.5 bg-[#10161f] border border-[#1a2332] hover:border-purple-500/50 text-purple-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Sparkles size={13} />
                                                <span>{t("btn_copy_mail")}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Resellers Table */}
                                    {filteredResellers.length === 0 ? (
                                        <div className="py-16 text-center text-gray-500 font-mono text-xs">
                                            <p className="font-bold text-gray-400 mb-1">{t("empty_state_title")}</p>
                                            <p>{t("empty_state_desc")}</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border border-[#1a2332]">
                                            <table className="w-full text-left text-xs font-mono">
                                                <thead className="bg-[#0c1017] text-gray-400 uppercase text-[9px] tracking-wider border-b border-[#1a2332]">
                                                    <tr>
                                                        <th className="py-3 px-4">{t("col_confidence")}</th>
                                                        <th className="py-3 px-4">{t("col_governor")}</th>
                                                        <th className="py-3 px-4">{t("col_alliance")}</th>
                                                        <th className="py-3 px-4 text-right">{t("col_power")}</th>
                                                        <th className="py-3 px-4 text-right">{t("col_gathered")}</th>
                                                        <th className="py-3 px-4 text-right">{t("col_ratio")}</th>
                                                        <th className="py-3 px-4 text-right">{t("col_combat")}</th>
                                                        <th className="py-3 px-4">{t("col_flags")}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#141a24] bg-[#090d12]">
                                                    {filteredResellers.map(r => {
                                                        const isCopied = copiedId === r.id;
                                                        const isCritical = r.confidence >= 80;
                                                        return (
                                                            <tr key={r.id} className="hover:bg-[#0e141e] transition-colors">
                                                                <td className="py-3 px-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                                                            isCritical
                                                                                ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                                                                                : "bg-amber-500/20 border-amber-500/50 text-amber-400"
                                                                        }`}>
                                                                            {r.confidence}%
                                                                        </span>
                                                                        <span className="text-[9px] text-gray-500 hidden sm:inline uppercase">
                                                                            {isCritical ? t("classification_critical") : t("classification_high")}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                <td className="py-3 px-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-white text-xs truncate max-w-[150px]">
                                                                            {r.name}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => handleCopyId(r.id)}
                                                                            className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                                                            title="Copy Governor ID"
                                                                        >
                                                                            {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                                                        </button>
                                                                        <span className="text-[10px] text-gray-600 font-mono" dir="ltr">
                                                                            [{r.id}]
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                <td className="py-3 px-4 whitespace-nowrap">
                                                                    <button
                                                                        onClick={() => setSelectedAlliance(r.alliance)}
                                                                        className="px-2 py-0.5 rounded bg-[#10161f] border border-[#1a2332] text-gray-300 hover:border-purple-400/50 hover:text-white text-[10px] font-bold cursor-pointer"
                                                                    >
                                                                        [{r.alliance}]
                                                                    </button>
                                                                </td>

                                                                <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-white" dir="ltr">
                                                                    {fmtCompact(r.power)}
                                                                </td>

                                                                <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-amber-400" dir="ltr">
                                                                    {fmtCompact(r.gathered)}
                                                                </td>

                                                                <td className="py-3 px-4 text-right whitespace-nowrap" dir="ltr">
                                                                    <span className="font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                                                        {Math.round(r.farmingRatio)}x
                                                                    </span>
                                                                </td>

                                                                <td className="py-3 px-4 text-right whitespace-nowrap text-gray-400" dir="ltr">
                                                                    <div className="text-[11px] font-bold text-cyan-400">
                                                                        {fmtCompact(r.killPoints)} KP
                                                                    </div>
                                                                    <div className="text-[9px] text-gray-500">
                                                                        {r.deads.toLocaleString()} deads
                                                                    </div>
                                                                </td>

                                                                <td className="py-3 px-4">
                                                                    <div className="flex items-center gap-1 flex-wrap">
                                                                        {r.flags.slice(0, 3).map((f, i) => (
                                                                            <span
                                                                                key={i}
                                                                                className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-300"
                                                                                title={f.val}
                                                                            >
                                                                                {getFlagLabel(f.code)}
                                                                            </span>
                                                                        ))}
                                                                        {r.flags.length > 3 && (
                                                                            <span className="text-[8px] text-gray-500">
                                                                                +{r.flags.length - 3}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: KINGDOM TOP GATHERERS */}
                        {activeTab === "gatherers" && (
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Wheat size={16} className="text-emerald-400" />
                                            <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                                {t("section_gatherers_title")}
                                            </h2>
                                            <span className="text-xs text-gray-500 font-mono" dir="ltr">
                                                ({filteredTopGatherers.length} {t("badge_gatherer")})
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-0.5">
                                            {t("section_gatherers_desc")}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={handleExportExcel}
                                            disabled={!filteredTopGatherers.length}
                                            className="px-3 py-1.5 bg-[#10161f] border border-[#1a2332] hover:border-emerald-500/50 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            <Download size={13} />
                                            <span>{t("btn_export_excel")}</span>
                                        </button>
                                        <button
                                            onClick={handleCopyHitlist}
                                            disabled={!filteredTopGatherers.length}
                                            className="px-3 py-1.5 bg-[#10161f] border border-[#1a2332] hover:border-cyan-500/50 text-cyan-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            <Copy size={13} />
                                            <span>{t("btn_copy_hitlist")}</span>
                                        </button>
                                    </div>
                                </div>

                                {filteredTopGatherers.length === 0 ? (
                                    <div className="py-16 text-center text-gray-500 font-mono text-xs">
                                        <p className="font-bold text-gray-400 mb-1">{t("empty_gatherers_title")}</p>
                                        <p>{t("empty_gatherers_desc")}</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-[#1a2332]">
                                        <table className="w-full text-left text-xs font-mono">
                                            <thead className="bg-[#0c1017] text-gray-400 uppercase text-[9px] tracking-wider border-b border-[#1a2332]">
                                                <tr>
                                                    <th className="py-3 px-4 w-12 text-center">{t("col_rank")}</th>
                                                    <th className="py-3 px-4">{t("col_governor")}</th>
                                                    <th className="py-3 px-4">{t("col_alliance")}</th>
                                                    <th className="py-3 px-4 text-right">{t("col_gathered")}</th>
                                                    <th className="py-3 px-4 text-right">{t("col_power")}</th>
                                                    <th className="py-3 px-4 text-right">{t("col_ratio")}</th>
                                                    <th className="py-3 px-4 text-right">{t("col_combat")}</th>
                                                    <th className="py-3 px-4">{t("col_confidence")}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#141a24] bg-[#090d12]">
                                                {filteredTopGatherers.map((g, idx) => {
                                                    const isCopied = copiedId === g.id;
                                                    const isSuspect = g.isSuspectedReseller;
                                                    return (
                                                        <tr key={g.id} className="hover:bg-[#0e141e] transition-colors">
                                                            <td className="py-3 px-4 text-center font-bold text-gray-400 whitespace-nowrap" dir="ltr">
                                                                #{idx + 1}
                                                            </td>

                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-white text-xs truncate max-w-[160px]">
                                                                        {g.name}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleCopyId(g.id)}
                                                                        className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
                                                                        title="Copy Governor ID"
                                                                    >
                                                                        {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                                                    </button>
                                                                    <span className="text-[10px] text-gray-600 font-mono" dir="ltr">
                                                                        [{g.id}]
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            <td className="py-3 px-4 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => setSelectedAlliance(g.alliance)}
                                                                    className="px-2 py-0.5 rounded bg-[#10161f] border border-[#1a2332] text-gray-300 hover:border-purple-400/50 hover:text-white text-[10px] font-bold cursor-pointer"
                                                                >
                                                                    [{g.alliance}]
                                                                </button>
                                                            </td>

                                                            <td className="py-3 px-4 text-right whitespace-nowrap font-black text-amber-400 text-sm" dir="ltr">
                                                                {fmtCompact(g.gathered)}
                                                            </td>

                                                            <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-white" dir="ltr">
                                                                {fmtCompact(g.power)}
                                                            </td>

                                                            <td className="py-3 px-4 text-right whitespace-nowrap" dir="ltr">
                                                                <span className="font-black text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                                                    {Math.round(g.farmingRatio)}x
                                                                </span>
                                                            </td>

                                                            <td className="py-3 px-4 text-right whitespace-nowrap text-gray-400" dir="ltr">
                                                                <div className="text-[11px] font-bold text-gray-300">
                                                                    {fmtCompact(g.killPoints)} KP
                                                                </div>
                                                                <div className="text-[9px] text-gray-500">
                                                                    {g.deads.toLocaleString()} deads
                                                                </div>
                                                            </td>

                                                            <td className="py-3 px-4 whitespace-nowrap">
                                                                {isSuspect ? (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black border bg-rose-500/20 border-rose-500/50 text-rose-400">
                                                                        {t("badge_bot_suspect")} ({g.confidence}%)
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                                                                        {t("badge_gatherer")}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: ALLIANCE HARVEST TOTALS */}
                        {activeTab === "alliances" && (
                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-5 space-y-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Building2 size={16} className="text-purple-400" />
                                            <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                                {t("section_alliance_harvest_title")}
                                            </h2>
                                            <span className="text-xs text-gray-500 font-mono" dir="ltr">
                                                ({filteredAllianceHarvest.length} Alliances)
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-0.5">
                                            {t("section_alliance_harvest_desc")}
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleExportExcel}
                                        disabled={!filteredAllianceHarvest.length}
                                        className="px-3 py-1.5 bg-[#10161f] border border-[#1a2332] hover:border-emerald-500/50 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <Download size={13} />
                                        <span>{t("btn_export_excel")}</span>
                                    </button>
                                </div>

                                {filteredAllianceHarvest.length === 0 ? (
                                    <div className="py-16 text-center text-gray-500 font-mono text-xs">
                                        <p className="font-bold text-gray-400 mb-1">{t("empty_state_title")}</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-[#1a2332]">
                                        <table className="w-full text-left text-xs font-mono">
                                            <thead className="bg-[#0c1017] text-gray-400 uppercase text-[9px] tracking-wider border-b border-[#1a2332]">
                                                <tr>
                                                    <th className="py-3 px-4 w-12 text-center">{t("col_rank")}</th>
                                                    <th className="py-3 px-4">{t("col_alliance")}</th>
                                                    <th className="py-3 px-4 text-right">{t("label_total_rss")}</th>
                                                    <th className="py-3 px-4 text-right">{t("col_avg_gathered")}</th>
                                                    <th className="py-3 px-4 text-right">{t("col_power")}</th>
                                                    <th className="py-3 px-4 text-center">{t("col_members")}</th>
                                                    <th className="py-3 px-4 text-right">{t("col_bot_density")}</th>
                                                    <th className="py-3 px-4 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#141a24] bg-[#090d12]">
                                                {filteredAllianceHarvest.map((a, idx) => {
                                                    const isHive = a.status === "CONFIRMED_HIVE";
                                                    const isOutpost = a.status === "OUTPOST";
                                                    return (
                                                        <tr key={a.tag} className="hover:bg-[#0e141e] transition-colors">
                                                            <td className="py-3 px-4 text-center font-bold text-gray-500 whitespace-nowrap" dir="ltr">
                                                                #{idx + 1}
                                                            </td>

                                                            <td className="py-3 px-4 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedAlliance(a.tag);
                                                                        setActiveTab("gatherers");
                                                                    }}
                                                                    className="px-2.5 py-1 rounded bg-[#10161f] border border-[#1a2332] text-white hover:border-purple-400/50 text-xs font-bold cursor-pointer"
                                                                >
                                                                    [{a.tag}]
                                                                </button>
                                                            </td>

                                                            <td className="py-3 px-4 text-right whitespace-nowrap font-black text-amber-400 text-sm" dir="ltr">
                                                                {fmtCompact(a.totalGathered)}
                                                            </td>

                                                            <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-emerald-400" dir="ltr">
                                                                {fmtCompact(a.avgGathered)}
                                                            </td>

                                                            <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-white" dir="ltr">
                                                                {fmtCompact(a.totalPower)}
                                                            </td>

                                                            <td className="py-3 px-4 text-center whitespace-nowrap text-gray-400" dir="ltr">
                                                                {a.totalMembers}
                                                            </td>

                                                            <td className="py-3 px-4 text-right whitespace-nowrap" dir="ltr">
                                                                <span className={`font-bold ${a.botCount > 0 ? "text-rose-400" : "text-gray-500"}`}>
                                                                    {a.botCount} ({a.botDensity}%)
                                                                </span>
                                                            </td>

                                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                    isHive
                                                                        ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                                                                        : isOutpost
                                                                        ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                                                                        : "bg-white/5 border-white/10 text-gray-400"
                                                                }`}>
                                                                    {isHive ? t("badge_confirmed_hive") : isOutpost ? t("badge_outpost") : t("badge_standard_alliance")}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Initial Empty State before scan */}
                {!loading && !data && (
                    <div className="py-24 text-center space-y-3 font-mono">
                        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 mb-4 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                            <Bot size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                            {t("initial_state_title")}
                        </h3>
                        <p className="text-gray-500 text-xs max-w-md mx-auto">
                            {t("initial_state_desc")}
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}
