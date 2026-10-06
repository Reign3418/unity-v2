"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { 
    Save, 
    Calendar, 
    Loader2, 
    UploadCloud, 
    Sparkles, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Shield, 
    Search,
    Crown
} from "lucide-react";

export default function KingdomManager() {
    const t = useTranslations("KingdomManager");

    const [kingdomsData, setKingdomsData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [savedSuccessId, setSavedSuccessId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'anchored' | 'missing'

    // Vision Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchKingdoms();
    }, []);

    // Global Paste Listener for RoK Screenshots
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith("image/")) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        processScreenshot(file);
                        break;
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [kingdomsData]);

    const fetchKingdoms = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/aws/admin/kingdoms/metadata");
            const data = await res.json();
            if (data.kingdoms) {
                const sorted = data.kingdoms.sort((a, b) => parseInt(a.kingdomId) - parseInt(b.kingdomId));
                setKingdomsData(sorted);
            }
        } catch (error) {
            console.error("Failed to fetch kingdoms", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (kingdomId, payload) => {
        setSavingId(kingdomId);
        try {
            const res = await fetch("/api/aws/admin/kingdoms/metadata", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kingdomId,
                    foundedDate: payload.foundedDate,
                    kingdomName: payload.kingdomName || null,
                    theKing: payload.theKing || null,
                    kingdomProgress: payload.kingdomProgress || null
                })
            });

            if (res.ok) {
                setKingdomsData(prev => prev.map(k => 
                    k.kingdomId === kingdomId 
                        ? { 
                            ...k, 
                            metadata: { 
                                ...k.metadata, 
                                foundedDate: payload.foundedDate,
                                kingdomName: payload.kingdomName ?? k.metadata?.kingdomName,
                                theKing: payload.theKing ?? k.metadata?.theKing,
                                kingdomProgress: payload.kingdomProgress ?? k.metadata?.kingdomProgress
                            } 
                        } 
                        : k
                ));
                setSavedSuccessId(kingdomId);
                setTimeout(() => setSavedSuccessId(null), 3000);
                if (scanResult && scanResult.kingdomNumber === String(kingdomId)) {
                    setScanResult(null);
                }
            } else {
                const err = await res.json();
                alert(t("error_saving") + ": " + (err.error || "Unknown error"));
            }
        } catch (error) {
            alert(t("error_saving") + ": " + error.message);
        } finally {
            setSavingId(null);
        }
    };

    const processScreenshot = async (file) => {
        if (!file) return;
        setIsScanning(true);
        setScanError(null);
        setScanResult(null);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64Data = reader.result.split(",")[1];
                const res = await fetch("/api/aws/admin/vision/kingdom-info", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        base64: base64Data,
                        mimeType: file.type || "image/png"
                    })
                });

                const data = await res.json();
                if (!res.ok || data.error) {
                    setScanError(data.error || t("scan_error"));
                    return;
                }

                setScanResult(data);
                // If kingdom exists in search, auto-populate search filter to quickly jump to it
                if (data.kingdomNumber) {
                    setSearchTerm(data.kingdomNumber);
                }
            };
        } catch (err) {
            setScanError(err.message || t("scan_error"));
        } finally {
            setIsScanning(false);
        }
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith("image/")) {
            processScreenshot(file);
        }
    };

    // Filter calculations
    const filtered = kingdomsData.filter(k => {
        const matchesSearch = 
            String(k.kingdomId).includes(searchTerm) ||
            (k.metadata?.kingdomName && k.metadata.kingdomName.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (!matchesSearch) return false;

        const isAnchored = !!k.metadata?.foundedDate;
        if (statusFilter === "anchored") return isAnchored;
        if (statusFilter === "missing") return !isAnchored;
        return true;
    });

    const totalCount = kingdomsData.length;
    const anchoredCount = kingdomsData.filter(k => !!k.metadata?.foundedDate).length;
    const missingCount = totalCount - anchoredCount;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-cyan-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* Header & Vision Scanner Card */}
            <div className="bg-[#0a0c10] border border-[#1e222b] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                <Clock size={20} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-cinzel">
                                {t("title")}
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-mono">
                            {t("subtitle")}
                        </p>
                    </div>

                    {/* Filter Tabs & Quick Search */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="inline-flex rounded-xl bg-[#11141a] p-1 border border-[#232833]">
                            <button
                                onClick={() => setStatusFilter("all")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === "all" ? "bg-cyan-500 text-black shadow-md" : "text-slate-400 hover:text-white"}`}
                            >
                                {t("all_filter")} ({totalCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter("anchored")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === "anchored" ? "bg-emerald-500 text-black shadow-md" : "text-slate-400 hover:text-white"}`}
                            >
                                {t("anchored_filter")} ({anchoredCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter("missing")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === "missing" ? "bg-amber-500 text-black shadow-md" : "text-slate-400 hover:text-white"}`}
                            >
                                {t("missing_filter")} ({missingCount})
                            </button>
                        </div>

                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder={t("filter_placeholder")}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-[#111318] border border-[#232833] focus:border-cyan-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none w-full sm:w-48 font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* AI Vision Screenshot Dropzone */}
                <div 
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#232833] hover:border-cyan-500/50 bg-[#11141a]/60 hover:bg-[#151922] transition-all rounded-2xl p-6 text-center cursor-pointer relative group"
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={e => processScreenshot(e.target.files?.[0])}
                        accept="image/*" 
                        className="hidden" 
                    />

                    {isScanning ? (
                        <div className="flex flex-col items-center justify-center py-4 space-y-3">
                            <Loader2 size={32} className="animate-spin text-cyan-400" />
                            <span className="text-xs font-mono text-cyan-300 font-bold tracking-wider animate-pulse">
                                {t("ai_dropzone_scanning")}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                                <Sparkles size={22} />
                            </div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{t("ai_dropzone_title")}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black">
                                    GEMINI VISION
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 max-w-lg font-mono">
                                {t("ai_dropzone_desc")}
                            </p>
                        </div>
                    )}
                </div>

                {/* Scan Error Message */}
                {scanError && (
                    <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-3">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{scanError}</span>
                    </div>
                )}

                {/* Detected Scan Confirmation Banner */}
                {scanResult && (
                    <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-[#11141a] to-cyan-500/15 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in zoom-in-95">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-widest font-mono">
                                <CheckCircle2 size={16} />
                                <span>
                                    {t("ai_scan_detected", {
                                        kingdomNumber: scanResult.kingdomNumber || "Unknown",
                                        kingdomName: scanResult.kingdomName || "",
                                        days: scanResult.serverAgeDays ?? "?"
                                    })}
                                </span>
                            </div>
                            <div className="text-xs text-slate-300 font-mono flex flex-wrap gap-x-4 gap-y-1 pt-1">
                                {scanResult.theKing && (
                                    <span className="flex items-center gap-1 text-amber-300">
                                        <Crown size={12} /> {scanResult.theKing}
                                    </span>
                                )}
                                {scanResult.kingdomProgress && (
                                    <span className="text-cyan-400">
                                        {scanResult.kingdomProgress}
                                    </span>
                                )}
                                <span className="text-slate-400">
                                    {t("label_founded_date")}: <strong className="text-white font-mono">{scanResult.calculatedFoundedDate}</strong>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => handleSave(scanResult.kingdomNumber, {
                                    foundedDate: scanResult.calculatedFoundedDate,
                                    kingdomName: scanResult.kingdomName,
                                    theKing: scanResult.theKing,
                                    kingdomProgress: scanResult.kingdomProgress
                                })}
                                disabled={savingId === scanResult.kingdomNumber}
                                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {savingId === scanResult.kingdomNumber ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                <span>{t("btn_auto_save")}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Kingdom Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((k) => (
                    <KingdomCard 
                        key={k.kingdomId} 
                        kingdom={k} 
                        onSave={handleSave} 
                        savingId={savingId}
                        savedSuccessId={savedSuccessId}
                        t={t}
                        highlighted={scanResult && scanResult.kingdomNumber === String(k.kingdomId)}
                    />
                ))}

                {filtered.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-500 text-xs font-mono bg-[#0a0c10] border border-[#1e222b] rounded-2xl">
                        {t("no_kingdoms_found", { query: searchTerm })}
                    </div>
                )}
            </div>

        </div>
    );
}

// Helpers for Bi-Directional Conversion
function daysToDate(days) {
    if (days === "" || days === null || days === undefined) return "";
    const d = parseInt(days, 10);
    if (isNaN(d) || d < 0) return "";
    const target = new Date();
    target.setUTCDate(target.getUTCDate() - d);
    return target.toISOString().split("T")[0];
}

function dateToDays(dateStr) {
    if (!dateStr) return "";
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return "";
    const today = new Date();
    const diffTime = today.setUTCHours(0, 0, 0, 0) - target.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
}

function extractDaysFromInput(rawInput) {
    if (!rawInput && rawInput !== 0) return "";
    const str = String(rawInput).trim();
    const match = str.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : "";
}

function KingdomCard({ kingdom, onSave, savingId, savedSuccessId, t, highlighted }) {
    const initialDate = kingdom.metadata?.foundedDate || "";
    const initialDays = initialDate ? dateToDays(initialDate) : "";

    const [date, setDate] = useState(initialDate);
    const [daysInput, setDaysInput] = useState(initialDays !== "" ? String(initialDays) : "");
    const [kingdomName, setKingdomName] = useState(kingdom.metadata?.kingdomName || "");

    useEffect(() => {
        const curDate = kingdom.metadata?.foundedDate || "";
        setDate(curDate);
        setDaysInput(curDate ? String(dateToDays(curDate)) : "");
        setKingdomName(kingdom.metadata?.kingdomName || "");
    }, [kingdom]);

    const isSaving = savingId === kingdom.kingdomId;
    const isSavedSuccess = savedSuccessId === kingdom.kingdomId;
    const isChanged = date !== initialDate || kingdomName !== (kingdom.metadata?.kingdomName || "");

    // Live Server Age Badge Calculation
    const liveDays = date ? dateToDays(date) : null;

    // Handle user typing/pasting into Server Age input
    const handleDaysChange = (raw) => {
        setDaysInput(raw);
        const parsed = extractDaysFromInput(raw);
        if (parsed !== "") {
            const calculatedDate = daysToDate(parsed);
            setDate(calculatedDate);
        } else if (raw.trim() === "") {
            setDate("");
        }
    };

    // Handle user picking date on calendar
    const handleDateChange = (newDate) => {
        setDate(newDate);
        if (newDate) {
            const calculatedDays = dateToDays(newDate);
            setDaysInput(String(calculatedDays));
        } else {
            setDaysInput("");
        }
    };

    return (
        <div className={`bg-[#11141a] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 ${
            highlighted 
                ? "border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400" 
                : "border-[#232833] hover:border-[#384254]"
        }`}>
            <div>
                {/* Header: Kingdom # & Live Age Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                        <div dir="ltr" className="text-2xl font-black text-white font-mono tracking-tight drop-shadow">
                            #{kingdom.kingdomId}
                        </div>
                        {kingdomName ? (
                            <div className="text-xs text-slate-300 font-semibold truncate max-w-[180px]">
                                {kingdomName}
                            </div>
                        ) : (
                            <div className="text-[11px] text-slate-500 font-mono">
                                Kingdom {kingdom.kingdomId}
                            </div>
                        )}
                    </div>

                    <div>
                        {liveDays !== null ? (
                            <span dir="ltr" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                                <Clock size={11} />
                                {t("live_age_badge", { days: liveDays })}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {t("status_missing")}
                            </span>
                        )}
                    </div>
                </div>

                {/* Additional Info Tags if stored */}
                {(kingdom.metadata?.theKing || kingdom.metadata?.kingdomProgress) && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-[#1e2430] text-[10px] font-mono">
                        {kingdom.metadata?.theKing && (
                            <span className="text-amber-300 flex items-center gap-1">
                                <Crown size={10} /> {kingdom.metadata.theKing}
                            </span>
                        )}
                        {kingdom.metadata?.kingdomProgress && (
                            <span className="text-cyan-400">
                                {kingdom.metadata.kingdomProgress}
                            </span>
                        )}
                    </div>
                )}

                {/* Dual Inputs: Server Age (Days) & Launch Birthday */}
                <div className="space-y-3.5 mt-2">
                    
                    {/* Primary Input: In-Game Server Age */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>{t("label_server_age")}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-normal">
                                {t("server_age_helper")}
                            </span>
                        </label>
                        <div className="relative">
                            <input 
                                dir="ltr"
                                type="text"
                                value={daysInput}
                                onChange={(e) => handleDaysChange(e.target.value)}
                                placeholder={t("server_age_placeholder")}
                                className="w-full bg-[#0a0c10] border border-[#232833] focus:border-cyan-400 rounded-xl px-3 py-2 text-sm font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none transition-colors"
                            />
                            {daysInput !== "" && (
                                <span dir="ltr" className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-500 pointer-events-none">
                                    DAYS
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Secondary Input: Calculated Launch Birthday */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {t("label_founded_date")}
                        </label>
                        <div className="relative">
                            <input 
                                dir="ltr"
                                type="date" 
                                value={date}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="w-full bg-[#0a0c10] border border-[#232833] focus:border-indigo-400 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Save Button */}
            <button 
                onClick={() => onSave(kingdom.kingdomId, {
                    foundedDate: date,
                    kingdomName: kingdomName || null,
                    theKing: kingdom.metadata?.theKing || null,
                    kingdomProgress: kingdom.metadata?.kingdomProgress || null
                })}
                disabled={!isChanged || isSaving}
                className={`mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSavedSuccess
                        ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        : isChanged 
                            ? "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]" 
                            : "bg-[#181d26] text-slate-500 cursor-not-allowed opacity-60"
                }`}
            >
                {isSaving ? (
                    <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{t("btn_saving")}</span>
                    </>
                ) : isSavedSuccess ? (
                    <>
                        <CheckCircle2 size={14} />
                        <span>{t("btn_saved")}</span>
                    </>
                ) : (
                    <>
                        <Save size={14} />
                        <span>{t("btn_save")}</span>
                    </>
                )}
            </button>
        </div>
    );
}
