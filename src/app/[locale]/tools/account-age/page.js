"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { 
    Clock, Calendar, Sparkles, ShieldAlert, CheckCircle2, 
    AlertTriangle, Download, RefreshCw, Info, HelpCircle, 
    Layers, Compass, ArrowRight, Check, FileSpreadsheet, Shield
} from "lucide-react";
import { 
    estimateGovernorAge, 
    estimateKingdomLaunchDate, 
    compareWithActualDate, 
    HISTORICAL_MILESTONES 
} from "@/lib/governorAgeEstimator";
import { downloadExcelFile } from "@/lib/excelHelper";

const BENCHMARK_SAMPLES = [
    { label: "sample_og", id: 2481902, kd: 1001 },
    { label: "sample_covid", id: 38450119, kd: 1650 },
    { label: "sample_soc", id: 104892100, kd: 3000 },
    { label: "sample_jumper", id: 165000000, kd: 3418 },
    { label: "sample_anchor", id: 218877479, kd: 4021 }
];

export default function AccountAgeAuditPage() {
    const t = useTranslations("AccountAgeAudit");

    const [activeTab, setActiveTab] = useState("single"); // 'single' | 'batch' | 'verify' | 'milestones'
    
    // Single mode states
    const [singleId, setSingleId] = useState("165000000");
    const [singleKd, setSingleKd] = useState("3418");

    // Verification mode states
    const [verifyId, setVerifyId] = useState("218877479");
    const [verifyDate, setVerifyDate] = useState("2026-04-15");

    // Batch mode states
    const [batchText, setBatchText] = useState(
        "2481902\n38450119\n62810404\n104892100\n142805120\n165000000\n188450122\n218877479"
    );
    const [batchKd, setBatchKd] = useState("3418");
    const [batchResults, setBatchResults] = useState(null);

    // Single evaluation result (memoized)
    const singleResult = useMemo(() => {
        return estimateGovernorAge(singleId, singleKd);
    }, [singleId, singleKd]);

    // Verification evaluation result
    const verifyComparison = useMemo(() => {
        const est = estimateGovernorAge(verifyId);
        if (!est || !verifyDate) return null;
        const comp = compareWithActualDate(est.estimatedDate, verifyDate);
        return { est, comp };
    }, [verifyId, verifyDate]);

    // Batch run
    const handleRunBatch = () => {
        if (!batchText.trim()) return;
        const rawIds = batchText
            .split(/[\n,;\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const audited = [];
        for (const raw of rawIds) {
            const res = estimateGovernorAge(raw, batchKd || null);
            if (res) audited.push(res);
        }
        setBatchResults(audited);
    };

    // Export batch to Excel
    const handleExportBatch = () => {
        if (!batchResults || batchResults.length === 0) return;
        const exportData = batchResults.map(p => ({
            "Governor ID": p.governorId,
            "Digits": p.digits,
            "Estimated Creation Date": p.estimatedDate,
            "Estimated Month/Year": p.estimatedMonthYear,
            "Confidence Window": `${p.confidenceWindow.start} to ${p.confidenceWindow.end}`,
            "Account Age": p.ageFormatted,
            "Account Age (Days)": p.ageDays,
            "Generation": p.generation.label,
            "Era Details": p.generation.era,
            "Estimated Starting Horizon": `KD ~${p.spawnHorizon?.estimatedKd || "N/A"} (${p.spawnHorizon?.bracketDisplay || ""})`,
            "Spawn Continent": p.spawnHorizon?.continentNumber ? `Continent #${p.spawnHorizon.continentNumber} (${p.spawnHorizon.continentRange})` : "N/A",
            "Observed Kingdom": p.migrationAnalysis?.targetKingdom || "N/A",
            "Kingdom Estimated Launch": p.migrationAnalysis?.kdEstimatedLaunchDate || "N/A",
            "Migration Verdict": p.migrationAnalysis?.statusLabel || "N/A",
            "Migration Explanation": p.migrationAnalysis?.explanation || "N/A",
        }));
        downloadExcelFile(exportData, `RoK_Governor_Age_Audit_${new Date().toISOString().split('T')[0]}.xlsx`, "AccountAgeAudit");
    };

    // Calculate timeline position percentage (2018-05-01 to 2026-12-31)
    const getTimelinePercent = (timestamp) => {
        const start = new Date("2018-05-01").getTime();
        const end = new Date("2026-12-31").getTime();
        const pct = Math.max(0, Math.min(100, ((timestamp - start) / (end - start)) * 100));
        return pct;
    };

    // Batch summary stats
    const batchSummary = useMemo(() => {
        if (!batchResults || batchResults.length === 0) return null;
        let oldest = batchResults[0];
        let newest = batchResults[0];
        let migrants = 0;
        let natives = 0;

        for (const r of batchResults) {
            if (r.ageDays > oldest.ageDays) oldest = r;
            if (r.ageDays < newest.ageDays) newest = r;
            if (r.migrationAnalysis?.status === "CONFIRMED_BACKWARD_MIGRANT") migrants++;
            if (r.migrationAnalysis?.status === "NATIVE_OR_JUMPER") natives++;
        }

        return {
            total: batchResults.length,
            oldest,
            newest,
            migrants,
            natives,
        };
    }, [batchResults]);

    return (
        <div className="min-h-screen bg-[#06080a] p-4 md:p-8 text-white font-sans">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="bg-[#0f1115] border border-cyan-500/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                                    <Clock size={24} />
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
                                    {t("page_title")}
                                </h1>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 rounded flex items-center gap-1.5">
                                    <Sparkles size={11} className="text-cyan-400" />
                                    {t("badge_lab")}
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs md:text-sm max-w-3xl leading-relaxed">
                                {t("page_subtitle")}
                            </p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#1e222b] overflow-x-auto pb-1">
                        {[
                            { id: "single", label: t("tab_single"), icon: Compass },
                            { id: "verify", label: t("tab_verify"), icon: Shield },
                            { id: "batch", label: t("tab_batch"), icon: Layers },
                            { id: "milestones", label: t("tab_milestones"), icon: Calendar },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                    activeTab === tab.id
                                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                            >
                                <tab.icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── TAB 1: SINGLE AUDIT ────────────────────────────────────────── */}
                {activeTab === "single" && (
                    <div className="space-y-6">
                        
                        {/* Control & Input Card */}
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 space-y-5">
                            <div className="flex flex-col md:flex-row md:items-end gap-4">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                                        <span>{t("label_governor_id")}</span>
                                        {singleId && (
                                            <span className="text-[10px] text-cyan-400 font-mono font-normal">
                                                {String(singleId).replace(/\D/g, '').length} Digits
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        value={singleId}
                                        onChange={e => setSingleId(e.target.value)}
                                        placeholder={t("placeholder_governor_id")}
                                        className="w-full bg-[#13161c] border border-[#1e222b] rounded-xl px-4 py-3 text-white font-mono text-base focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    />
                                </div>

                                <div className="w-full md:w-56 space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        {t("label_kingdom")}
                                    </label>
                                    <input
                                        type="text"
                                        value={singleKd}
                                        onChange={e => setSingleKd(e.target.value)}
                                        placeholder={t("placeholder_kingdom")}
                                        className="w-full bg-[#13161c] border border-[#1e222b] rounded-xl px-4 py-3 text-white font-mono text-base focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    />
                                </div>

                                <button
                                    onClick={() => { setSingleId(""); setSingleKd(""); }}
                                    className="px-4 py-3 bg-[#13161c] hover:bg-white/5 border border-[#1e222b] text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    {t("btn_clear")}
                                </button>
                            </div>

                            {/* Benchmark Samples Selector */}
                            <div className="pt-3 border-t border-[#1e222b]">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">
                                    {t("btn_load_samples")}:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {BENCHMARK_SAMPLES.map(sample => (
                                        <button
                                            key={sample.id}
                                            onClick={() => {
                                                setSingleId(String(sample.id));
                                                setSingleKd(String(sample.kd));
                                            }}
                                            className="px-3 py-1.5 bg-[#13161c] hover:bg-cyan-500/10 border border-[#1e222b] hover:border-cyan-500/30 rounded-lg text-xs font-mono text-gray-300 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5"
                                        >
                                            <span className="text-[10px] text-gray-500">[{sample.id}]</span>
                                            <span>{t(sample.label)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Audit Result Display */}
                        {singleResult ? (
                            <div className="space-y-6">
                                {/* 4 Core Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Estimated Birth */}
                                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5 relative overflow-hidden">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                                            <Calendar size={13} className="text-cyan-400" />
                                            <span>{t("card_est_birth")}</span>
                                        </div>
                                        <div className="text-2xl font-black text-cyan-400 font-mono tracking-tight">
                                            {singleResult.estimatedMonthYear}
                                        </div>
                                        <div className="text-[11px] text-gray-500 font-mono mt-1">
                                            {singleResult.confidenceWindow.start} → {singleResult.confidenceWindow.end}
                                        </div>
                                        <span className="inline-block mt-2 text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                            {t("confidence_tag")}
                                        </span>
                                    </div>

                                    {/* Account Age */}
                                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5 relative overflow-hidden">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                                            <Clock size={13} className="text-emerald-400" />
                                            <span>{t("card_account_age")}</span>
                                        </div>
                                        <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                                            {singleResult.ageFormatted}
                                        </div>
                                        <div className="text-[11px] text-gray-500 font-mono mt-1">
                                            ~{singleResult.ageDays.toLocaleString()} Days Active
                                        </div>
                                        <span className="inline-block mt-2 text-[9px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                            {singleResult.ageYears} Years Total
                                        </span>
                                    </div>

                                    {/* Generation */}
                                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5 relative overflow-hidden">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                                            <Layers size={13} className="text-indigo-400" />
                                            <span>{t("card_generation")}</span>
                                        </div>
                                        <div className="text-base font-black text-gray-200 tracking-tight line-clamp-1">
                                            {singleResult.generation.label}
                                        </div>
                                        <div className="text-[11px] text-gray-400 font-mono mt-1 leading-snug">
                                            {singleResult.generation.era}
                                        </div>
                                        <span className={`inline-block mt-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${singleResult.generation.badgeColor}`}>
                                            {singleResult.digits} Digits
                                        </span>
                                    </div>

                                    {/* Migration Verdict */}
                                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5 relative overflow-hidden">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5">
                                            <Compass size={13} className="text-amber-400" />
                                            <span>{t("card_migration")}</span>
                                        </div>
                                        {singleResult.migrationAnalysis ? (
                                            <>
                                                <div className="text-xs font-bold tracking-tight mb-1">
                                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${singleResult.migrationAnalysis.statusBadge}`}>
                                                        {singleResult.migrationAnalysis.statusLabel}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                                                    {singleResult.migrationAnalysis.explanation}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-xs text-gray-500 font-mono mt-2">
                                                Enter Kingdom # to evaluate migration status.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Starting Kingdom Horizon */}
                                {singleResult.spawnHorizon && (
                                    <div className="bg-[#0f1115] border border-cyan-500/20 rounded-2xl p-5 relative overflow-hidden">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                                                    <Compass size={13} />
                                                    <span>{t("card_spawn_kd")}</span>
                                                </div>
                                                <div className="text-xl md:text-2xl font-black text-white font-mono flex items-center gap-3 flex-wrap">
                                                    <span>KD ~{singleResult.spawnHorizon.estimatedKd}</span>
                                                    <span className="text-xs text-gray-400 font-normal font-sans bg-white/5 border border-white/5 px-2.5 py-0.5 rounded">
                                                        Bracket: {singleResult.spawnHorizon.bracketDisplay}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed max-w-2xl pt-1">
                                                    {t("card_spawn_kd_desc")}.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl px-4 py-2.5 text-left md:text-right font-mono">
                                                    <span className="text-[9px] uppercase tracking-widest text-gray-500 block">
                                                        {t("label_continent")}
                                                    </span>
                                                    <span className="text-sm font-bold text-cyan-400">
                                                        #{singleResult.spawnHorizon.continentNumber} ({singleResult.spawnHorizon.continentRange})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Historical Timeline Track */}
                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                                        <span>{t("label_timeline")}</span>
                                        <span className="font-mono text-cyan-400">
                                            Governor {singleResult.governorId.toLocaleString()} • {singleResult.estimatedDate}
                                        </span>
                                    </div>

                                    {/* Visual Bar */}
                                    <div className="relative pt-6 pb-2">
                                        {/* Background Track */}
                                        <div className="w-full h-3 bg-[#13161c] border border-[#1e222b] rounded-full relative overflow-visible">
                                            {/* Fill up to this ID */}
                                            <div 
                                                className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500 rounded-full opacity-60"
                                                style={{ width: `${getTimelinePercent(singleResult.estimatedTimestamp)}%` }}
                                            />

                                            {/* Pin Indicator */}
                                            <div 
                                                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-cyan-400 border-2 border-white rounded-full shadow-[0_0_15px_rgba(6,182,212,0.9)] -translate-x-1/2 transition-all duration-300"
                                                style={{ left: `${getTimelinePercent(singleResult.estimatedTimestamp)}%` }}
                                            />
                                        </div>

                                        {/* Epoch labels */}
                                        <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-3">
                                            <span>2018 (Beta)</span>
                                            <span>2020 (Covid)</span>
                                            <span>2022 (100M)</span>
                                            <span>2024 (SoC)</span>
                                            <span>2026 (K4000+)</span>
                                        </div>
                                    </div>

                                    {/* Milestone Bracket Info */}
                                    {singleResult.bracket && (
                                        <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-gray-400">
                                            <span className="text-gray-500 uppercase text-[10px] tracking-widest">
                                                {t("label_bracket")}:
                                            </span>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-gray-300">
                                                    {singleResult.bracket.lower.desc} ({singleResult.bracket.lower.id.toLocaleString()})
                                                </span>
                                                <ArrowRight size={12} className="text-gray-600" />
                                                <span className="text-gray-300">
                                                    {singleResult.bracket.upper.desc} ({singleResult.bracket.upper.id.toLocaleString()})
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#0f1115] border border-dashed border-[#1e222b] rounded-2xl p-12 text-center text-gray-500 font-mono text-sm">
                                Enter a valid Governor ID above to analyze account epoch.
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 2: VERIFY IN-GAME (MARKSWOMAN) ────────────────────────── */}
                {activeTab === "verify" && (
                    <div className="space-y-6">
                        {/* Guide Card */}
                        <div className="bg-[#0f1115] border border-indigo-500/30 rounded-2xl p-6 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-wider text-white">
                                        {t("verify_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs md:text-sm mt-1 leading-relaxed">
                                        {t("verify_desc")}
                                    </p>
                                </div>
                            </div>

                            {/* Steps Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4 text-xs text-gray-300 leading-relaxed font-sans">
                                    {t("verify_step_1")}
                                </div>
                                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4 text-xs text-gray-300 leading-relaxed font-sans">
                                    {t("verify_step_2")}
                                </div>
                                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4 text-xs text-gray-300 leading-relaxed font-sans">
                                    {t("verify_step_3")}
                                </div>
                                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4 text-xs text-emerald-300 leading-relaxed font-sans font-medium">
                                    {t("verify_step_4")}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Tester Card */}
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 space-y-5">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-200 flex items-center gap-2">
                                <Sparkles size={16} className="text-cyan-400" />
                                <span>{t("verify_test_label")}</span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        {t("label_governor_id")}
                                    </label>
                                    <input
                                        type="text"
                                        value={verifyId}
                                        onChange={e => setVerifyId(e.target.value)}
                                        placeholder="e.g. 218877479"
                                        className="w-full bg-[#13161c] border border-[#1e222b] rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        {t("verify_input_label")}
                                    </label>
                                    <input
                                        type="date"
                                        value={verifyDate}
                                        onChange={e => setVerifyDate(e.target.value)}
                                        className="w-full bg-[#13161c] border border-[#1e222b] rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                            </div>

                            {/* Comparison Result */}
                            {verifyComparison && verifyComparison.comp && (
                                <div className="mt-4 pt-4 border-t border-[#1e222b] grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                                            Model Estimated Date
                                        </span>
                                        <span className="text-lg font-mono font-black text-cyan-400">
                                            {verifyComparison.est.estimatedDate}
                                        </span>
                                    </div>

                                    <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                                            {t("verify_result_label")}
                                        </span>
                                        <span className={`text-lg font-mono font-black ${
                                            verifyComparison.comp.absDiffDays <= 30 ? "text-emerald-400" :
                                            verifyComparison.comp.absDiffDays <= 75 ? "text-amber-400" : "text-rose-400"
                                        }`}>
                                            {verifyComparison.comp.absDiffDays} Days
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                                            {verifyComparison.comp.diffDays > 0 ? "Model predicts slightly later" : "Model predicts slightly earlier"}
                                        </span>
                                    </div>

                                    <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                                            {t("verify_accuracy_label")}
                                        </span>
                                        <span className="text-lg font-mono font-black text-emerald-400">
                                            {verifyComparison.comp.accuracyPct}%
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                                            {verifyComparison.comp.verdict === "PINPOINT_EXACT" ? t("verify_verdict_exact") :
                                             verifyComparison.comp.verdict === "HIGH_CONFIDENCE" ? t("verify_verdict_high") : t("verify_verdict_variance")}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB 3: BATCH ROSTER AUDIT ─────────────────────────────────── */}
                {activeTab === "batch" && (
                    <div className="space-y-6">
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-black uppercase tracking-wider text-white">
                                        {t("batch_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {t("batch_desc")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={batchKd}
                                        onChange={e => setBatchKd(e.target.value)}
                                        placeholder="Kingdom # (e.g. 3418)"
                                        className="bg-[#13161c] border border-[#1e222b] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 w-36"
                                    />
                                    <button
                                        onClick={handleRunBatch}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer"
                                    >
                                        {t("btn_analyze_batch")}
                                    </button>
                                </div>
                            </div>

                            <textarea
                                value={batchText}
                                onChange={e => setBatchText(e.target.value)}
                                rows={6}
                                placeholder={t("batch_placeholder")}
                                className="w-full bg-[#13161c] border border-[#1e222b] rounded-xl p-4 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 leading-relaxed"
                            />
                        </div>

                        {/* Batch Summary Metric Chips */}
                        {batchSummary && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                                        {t("metric_total")}
                                    </span>
                                    <span className="text-xl font-mono font-black text-cyan-400">
                                        {batchSummary.total}
                                    </span>
                                </div>

                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                                        {t("metric_oldest")}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-amber-400 truncate block mt-1">
                                        ID {batchSummary.oldest.governorId}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                        {batchSummary.oldest.ageFormatted}
                                    </span>
                                </div>

                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                                        {t("metric_youngest")}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-rose-400 truncate block mt-1">
                                        ID {batchSummary.newest.governorId}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                        {batchSummary.newest.ageFormatted}
                                    </span>
                                </div>

                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                                        {t("metric_migrants")}
                                    </span>
                                    <span className="text-xl font-mono font-black text-amber-400">
                                        {batchSummary.migrants}
                                    </span>
                                </div>

                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">
                                        {t("metric_natives")}
                                    </span>
                                    <span className="text-xl font-mono font-black text-emerald-400">
                                        {batchSummary.natives}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Batch Results Table */}
                        {batchResults && batchResults.length > 0 && (
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl overflow-hidden space-y-4 p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                        {batchResults.length} Governors Evaluated
                                    </span>
                                    <button
                                        onClick={handleExportBatch}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13161c] hover:bg-emerald-500/10 border border-[#1e222b] hover:border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                    >
                                        <FileSpreadsheet size={14} />
                                        <span>{t("btn_export_excel")}</span>
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-mono">
                                        <thead>
                                            <tr className="border-b border-[#1e222b] text-gray-500 uppercase tracking-widest text-[10px]">
                                                <th className="pb-3">{t("table_id")}</th>
                                                <th className="pb-3">{t("table_est_date")}</th>
                                                <th className="pb-3">{t("table_age")}</th>
                                                <th className="pb-3">{t("table_generation")}</th>
                                                <th className="pb-3">{t("table_verdict")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1e222b]/50">
                                            {batchResults.map(p => (
                                                <tr key={p.governorId} className="hover:bg-white/[0.02]">
                                                    <td className="py-2.5 text-cyan-400 font-bold">
                                                        {p.governorId.toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 text-gray-300">
                                                        {p.estimatedMonthYear}
                                                    </td>
                                                    <td className="py-2.5 text-emerald-400">
                                                        {p.ageFormatted}
                                                    </td>
                                                    <td className="py-2.5 text-gray-400">
                                                        {p.generation.label}
                                                    </td>
                                                    <td className="py-2.5">
                                                        {p.migrationAnalysis ? (
                                                            <span className={`px-2 py-0.5 rounded border text-[9px] uppercase ${p.migrationAnalysis.statusBadge}`}>
                                                                {p.migrationAnalysis.statusLabel}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-600">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 4: EPOCH ANCHORS REFERENCE ─────────────────────────────── */}
                {activeTab === "milestones" && (
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar size={18} className="text-cyan-400" />
                            <h2 className="text-base font-black uppercase tracking-wider text-white">
                                {t("milestones_title")}
                            </h2>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed max-w-3xl">
                            {t("milestones_desc")}
                        </p>

                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-left text-xs font-mono">
                                <thead>
                                    <tr className="border-b border-[#1e222b] text-gray-500 uppercase tracking-widest text-[10px]">
                                        <th className="pb-3">Anchor Milestone ID</th>
                                        <th className="pb-3">Calendar Date</th>
                                        <th className="pb-3">KD Horizon</th>
                                        <th className="pb-3">Historical Era Context</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1e222b]/50">
                                    {HISTORICAL_MILESTONES.map(m => (
                                        <tr key={m.id} className="hover:bg-white/[0.02]">
                                            <td className="py-3 text-cyan-400 font-bold">
                                                {m.id.toLocaleString()}
                                            </td>
                                            <td className="py-3 text-emerald-400">
                                                {m.date}
                                            </td>
                                            <td className="py-3 text-gray-400">
                                                KD ~{m.kd}
                                            </td>
                                            <td className="py-3 text-gray-300">
                                                {m.desc}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
