"use client";

import { useState, useMemo, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Search, X, Activity, ShieldAlert, Crown, Scale, Swords, TrendingUp, Trash2, Users, Check } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CompareTab({ targetKd, trends, startDate, endDate }) {
    const t = useTranslations("CompareTab");
    
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGovs, setSelectedGovs] = useState([]);
    const [rosterData, setRosterData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Fetch Overview Deltas
    useEffect(() => {
        if (!targetKd || !startDate || !endDate) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/aws/overview?kd=${targetKd}&start=${startDate}&end=${endDate}`);
                const data = await res.json();
                if (res.ok && data.roster) {
                    setRosterData(data.roster);
                } else {
                    setRosterData([]);
                }
            } catch (e) {
                console.error(e);
                setRosterData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [targetKd, startDate, endDate]);

    // Autocomplete list
    const filteredRoster = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const q = searchTerm.toLowerCase();
        return rosterData.filter(gov => 
            (gov.name?.toLowerCase().includes(q) || gov.id?.toLowerCase().includes(q)) &&
            !selectedGovs.some(s => s.id === gov.id)
        ).slice(0, 10);
    }, [rosterData, searchTerm, selectedGovs]);

    const handleSelectGov = (gov) => {
        if (selectedGovs.length >= 5) return;
        setSelectedGovs([...selectedGovs, gov]);
        setSearchTerm("");
        setShowDropdown(false);
    };

    const handleRemoveGov = (govId) => {
        setSelectedGovs(selectedGovs.filter(s => s.id !== govId));
    };

    const handleClearAll = () => {
        setSelectedGovs([]);
    };

    // Helper functions for parsing and formatting metrics
    const getNumericVal = (val) => {
        if (val === "NEW" || val === "MISSING" || val === null || val === undefined) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    const formatCurrentVal = (num) => {
        if (num === null || num === undefined) return "-";
        const absNum = Math.abs(num);
        if (absNum >= 1e9) return (num / 1e9).toFixed(2) + "B";
        if (absNum >= 1e6) return (num / 1e6).toFixed(1) + "M";
        if (absNum >= 1e3) return (num / 1e3).toFixed(0) + "K";
        return num.toLocaleString();
    };

    const formatDeltaVal = (val) => {
        if (val === "NEW") return <span className="text-cyan-400 font-bold">NEW</span>;
        if (val === "MISSING") return <span className="text-rose-500 font-bold tracking-widest">MISSING</span>;
        
        const num = Number(val);
        if (isNaN(num)) return <span className="text-gray-600">-</span>;
        if (num > 0) {
            const formatted = formatCurrentVal(num);
            return <span className="text-emerald-400">+{formatted}</span>;
        }
        if (num < 0) {
            const formatted = formatCurrentVal(num);
            return <span className="text-rose-400">{formatted}</span>;
        }
        return <span className="text-gray-600">-</span>;
    };

    // Leader calculations
    const findLeader = (key, isDelta = false) => {
        if (selectedGovs.length === 0) return null;
        let bestVal = -Infinity;
        let leaderId = null;
        let allSame = true;
        let firstVal = null;

        selectedGovs.forEach((gov, idx) => {
            const val = isDelta ? getNumericVal(gov[key]) : Number(gov[key] || 0);
            if (idx === 0) firstVal = val;
            else if (val !== firstVal) allSame = false;

            if (val > bestVal) {
                bestVal = val;
                leaderId = gov.id;
            }
        });

        if (allSame && bestVal === 0) return null;
        return leaderId;
    };

    // Calculate leaders memo object
    const leaders = useMemo(() => {
        return {
            powerEnd: findLeader("powerEnd", false),
            powerDelta: findLeader("powerDelta", true),
            troopEnd: findLeader("troopEnd", false),
            troopDelta: findLeader("troopDelta", true),
            cmdEnd: findLeader("cmdEnd", false),
            cmdDelta: findLeader("cmdDelta", true),
            techEnd: findLeader("techEnd", false),
            techDelta: findLeader("techDelta", true),
            buildEnd: findLeader("buildEnd", false),
            buildDelta: findLeader("buildDelta", true),
            kpEnd: findLeader("kpEnd", false),
            kpDelta: findLeader("kpDelta", true),
            deadEnd: findLeader("deadEnd", false),
            deadDelta: findLeader("deadDelta", true),
            gatheredEnd: findLeader("gatheredEnd", false),
            gatheredDelta: findLeader("gatheredDelta", true)
        };
    }, [selectedGovs]);

    // Build Chart Options for visual comparisons
    const chartOptions = useMemo(() => {
        if (selectedGovs.length === 0) return null;

        const names = selectedGovs.map(g => g.name);
        const barWidth = selectedGovs.length > 3 ? "20%" : "30%";

        const makeGroupedBarOption = (title, categories, dataGetters) => {
            const series = selectedGovs.map((gov) => {
                const dataValues = dataGetters.map(getter => getNumericVal(gov[getter]));
                return {
                    name: gov.name,
                    type: "bar",
                    barWidth: barWidth,
                    data: dataValues,
                    label: {
                        show: true,
                        position: "top",
                        formatter: (params) => {
                            const val = params.value;
                            if (val === 0) return "";
                            return formatCurrentVal(val).replace("+", "");
                        },
                        textStyle: { color: "#9ca3af", fontFamily: "monospace", fontSize: 9 }
                    }
                };
            });

            return {
                backgroundColor: "transparent",
                title: {
                    text: title,
                    textStyle: { color: "#ffffff", fontFamily: "monospace", fontSize: 12, fontWeight: "bold" },
                    left: "center",
                    top: 5
                },
                tooltip: {
                    trigger: "axis",
                    backgroundColor: "rgba(15,17,21,0.95)",
                    borderColor: "#2d323e",
                    textStyle: { color: "#9ca3af", fontFamily: "monospace", fontSize: 11 },
                    formatter: function (params) {
                        let res = `<div className="font-bold border-b border-[#1e222b] pb-1 mb-1 text-white">${params[0].name}</div>`;
                        params.forEach(p => {
                            res += `<div className="flex justify-between items-center gap-6"><span style="color:${p.color}">●</span> <span>${p.seriesName}:</span> <span className="font-bold text-white">${p.value.toLocaleString()}</span></div>`;
                        });
                        return res;
                    }
                },
                legend: {
                    show: true,
                    bottom: 0,
                    textStyle: { color: "#9ca3af", fontFamily: "monospace", fontSize: 9 }
                },
                grid: {
                    top: 45,
                    bottom: 55,
                    left: "3%",
                    right: "3%",
                    containLabel: true
                },
                xAxis: {
                    type: "category",
                    data: categories,
                    axisLine: { lineStyle: { color: "#1e222b" } },
                    axisLabel: { color: "#6b7280", fontFamily: "monospace", fontSize: 10 }
                },
                yAxis: {
                    type: "value",
                    axisLine: { show: false },
                    splitLine: { lineStyle: { color: "#13161c" } },
                    axisLabel: { color: "#6b7280", fontFamily: "monospace", fontSize: 9 }
                },
                series: series
            };
        };

        return {
            powerTroop: makeGroupedBarOption(
                t("chart_power_troops"),
                [t("power"), t("troop_power")],
                ["powerDelta", "troopDelta"]
            ),
            combat: makeGroupedBarOption(
                t("chart_combat"),
                [t("kill_points"), t("dead_troops")],
                ["kpDelta", "deadDelta"]
            ),
            infrastructure: makeGroupedBarOption(
                t("chart_infrastructure"),
                [t("tech_power"), t("building_power")],
                ["techDelta", "buildDelta"]
            )
        };
    }, [selectedGovs, t]);

    // Single comparison row rendering helper
    const MetricRow = ({ label, metricKey, isDelta = false }) => {
        return (
            <div className="grid grid-cols-5 border-b border-[#1e222b]/40 py-2.5 px-4 items-center hover:bg-white/[0.01] transition-colors">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider col-span-5 md:col-span-1 py-1 md:py-0">
                    {label}
                </div>
                <div className="col-span-5 md:col-span-4 grid grid-cols-5 gap-3 text-right">
                    {selectedGovs.map(gov => {
                        const rawVal = gov[metricKey];
                        const numericVal = getNumericVal(rawVal);
                        const isLeader = leaders[metricKey] === gov.id;
                        
                        return (
                            <div key={gov.id} className="flex items-center justify-end gap-1 px-1">
                                {isLeader && (
                                    <Crown size={11} className="text-yellow-500 shrink-0" title={t("category_leader")} />
                                )}
                                <span className={`text-[11px] font-mono leading-none ${isLeader ? "font-black text-yellow-400" : "text-gray-300"}`}>
                                    {isDelta ? formatDeltaVal(rawVal) : formatCurrentVal(numericVal)}
                                </span>
                            </div>
                        );
                    })}
                    {/* Fill empty slots in grid if < 5 selected */}
                    {Array.from({ length: 5 - selectedGovs.length }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="text-gray-700 text-xs font-mono">-</div>
                    ))}
                </div>
            </div>
        );
    };

    if (!trends || trends.length === 0) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center shadow-xl text-gray-500">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{t("no_temporal_title")}</h3>
                <p className="text-sm">{t("no_temporal_desc")}</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            
            {/* Control & Search Bar */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                    
                    {/* Header Info */}
                    <div className="flex items-center gap-4">
                        <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                            <Users className="text-cyan-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase">{t("title")}</h2>
                            <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">{t("subtitle")}</p>
                        </div>
                    </div>

                    {/* Autocomplete Selector */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl w-full relative">
                        <div className="flex items-center gap-2 flex-1 bg-[#0a0c0f] border border-[#1e222b] focus-within:border-cyan-500 transition-colors rounded-lg px-4 py-2.5 relative">
                            <Search className="text-gray-500" size={18} />
                            <input 
                                type="text" 
                                placeholder={selectedGovs.length >= 5 ? t("max_selected") : t("search_placeholder")} 
                                value={searchTerm}
                                disabled={selectedGovs.length >= 5 || isLoading}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                className="bg-transparent border-none outline-none text-white text-sm w-full font-medium placeholder-gray-600 disabled:opacity-50"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => {
                                        setSearchTerm("");
                                        setShowDropdown(false);
                                    }} 
                                    className="text-gray-600 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            
                            {/* Autocomplete Dropdown */}
                            {showDropdown && filteredRoster.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1115] border border-[#2d323e] rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-[#1e222b]/50">
                                    {filteredRoster.map(gov => (
                                        <button
                                            key={gov.id}
                                            onClick={() => handleSelectGov(gov)}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1c212c] transition-colors text-left"
                                        >
                                            <div>
                                                <div className="text-white text-xs font-bold font-mono">{gov.name}</div>
                                                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                                                    ID: {gov.id} <span className="mx-1">·</span> {gov.alliance || "NONE"}
                                                </div>
                                            </div>
                                            <div className="bg-[#1a1e27] border border-[#2d323e] text-cyan-400 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded">
                                                Add Player
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedGovs.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="flex items-center justify-center gap-2 bg-[#1a0f12] hover:bg-[#2c1319] text-rose-400 border border-rose-500/20 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors shadow-lg"
                            >
                                <Trash2 size={15} />
                                {t("clear_all")}
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* Empty State */}
            {selectedGovs.length === 0 ? (
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl py-32 px-6 flex flex-col items-center justify-center shadow-xl text-center max-w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#13161c_1px,transparent_1px),linear-gradient(to_bottom,#13161c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>
                    <Users className="w-16 h-16 text-cyan-500/30 mb-5 relative z-10" />
                    <h3 className="text-lg font-black text-white mb-2 uppercase tracking-widest relative z-10">{t("no_governors")}</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed relative z-10">{t("select_hint")}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    
                    {/* Multi-Column Identity Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="hidden md:block bg-[#07090c]/50 p-4 border border-dashed border-[#1e222b] rounded-xl flex flex-col justify-center text-center">
                            <Scale size={28} className="mx-auto text-gray-600 mb-2" />
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Governor Slots</span>
                            <span className="text-xs text-cyan-400 font-black font-mono mt-1">{selectedGovs.length} / 5</span>
                        </div>
                        
                        {/* Governor Cards */}
                        {selectedGovs.map(gov => (
                            <div key={gov.id} className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 shadow-xl relative overflow-hidden flex flex-col justify-between group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[50px] pointer-events-none translate-x-1/2 -translate-y-1/2 group-hover:bg-cyan-500/10 transition-all"></div>
                                
                                <button
                                    onClick={() => handleRemoveGov(gov.id)}
                                    className="absolute top-3 right-3 p-1 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-[#1a0f12]/50 border border-transparent hover:border-rose-500/20 transition-colors z-20"
                                    title="Remove from comparison"
                                >
                                    <X size={14} />
                                </button>
                                
                                <div className="relative z-10">
                                    <div className="text-xs font-bold text-white uppercase tracking-wider truncate pr-6 font-mono" title={gov.name}>
                                        {gov.name}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {gov.id}</div>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-[#1e222b]/50 relative z-10 flex flex-wrap gap-2 items-center">
                                    <span className="bg-[#1e222b] text-cyan-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-[#2d323e]">
                                        {gov.alliance || "NONE"}
                                    </span>
                                    <span className="bg-[#0c0f13] text-gray-400 px-2 py-0.5 rounded text-[9px] font-bold font-mono border border-[#1e222b]">
                                        TH {gov.townHall}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                        gov.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                                        gov.status === "Missing" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : 
                                        "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                    }`}>
                                        {gov.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        
                        {/* Empty cards placeholders if < 5 selected */}
                        {Array.from({ length: 5 - selectedGovs.length - (selectedGovs.length === 0 ? 0 : 1) }).map((_, idx) => (
                            <div key={`placeholder-${idx}`} className="hidden md:flex border border-dashed border-[#1e222b]/50 rounded-xl p-4 flex-col items-center justify-center text-center text-gray-600 bg-white/[0.005]">
                                <Users size={18} className="opacity-20 mb-2" />
                                <span className="text-[9px] uppercase tracking-widest font-bold opacity-30">Slot Empty</span>
                            </div>
                        ))}
                    </div>

                    {/* Comparison Sheets Ledger */}
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden flex flex-col">
                        
                        {/* Header Column Titles */}
                        <div className="grid grid-cols-5 bg-[#0a0c0f] border-b border-[#1e222b] py-3.5 px-4 font-bold text-gray-500 text-[10px] tracking-widest uppercase">
                            <div className="col-span-5 md:col-span-1">{t("col_metric")}</div>
                            <div className="col-span-5 md:col-span-4 grid grid-cols-5 gap-3 text-right">
                                {selectedGovs.map(gov => (
                                    <div key={gov.id} className="truncate font-sans font-black text-white text-[10px]" title={gov.name}>
                                        {gov.name}
                                    </div>
                                ))}
                                {Array.from({ length: 5 - selectedGovs.length }).map((_, idx) => (
                                    <div key={`header-empty-${idx}`} className="opacity-20">-</div>
                                ))}
                            </div>
                        </div>

                        {/* Roster Metric Divisions */}
                        
                        {/* Section: Identity */}
                        <div className="bg-[#13161c]/40 border-b border-[#1e222b] py-1.5 px-4 text-[9px] font-black uppercase tracking-wider text-cyan-400">
                            {t("section_identity")}
                        </div>
                        <MetricRow label={t("alliance")} metricKey="alliance" />
                        <MetricRow label={t("town_hall")} metricKey="townHall" />
                        <MetricRow label={t("status")} metricKey="status" />

                        {/* Section: Growth */}
                        <div className="bg-[#13161c]/40 border-b border-[#1e222b] py-1.5 px-4 text-[9px] font-black uppercase tracking-wider text-purple-400">
                            {t("section_growth")}
                        </div>
                        <MetricRow label={`${t("power")} (${t("col_current")})`} metricKey="powerEnd" />
                        <MetricRow label={`${t("power")} (${t("col_delta")})`} metricKey="powerDelta" isDelta={true} />
                        
                        <MetricRow label={`${t("troop_power")} (${t("col_current")})`} metricKey="troopEnd" />
                        <MetricRow label={`${t("troop_power")} (${t("col_delta")})`} metricKey="troopDelta" isDelta={true} />
                        
                        <MetricRow label={`${t("commander_power")} (${t("col_current")})`} metricKey="cmdEnd" />
                        <MetricRow label={`${t("commander_power")} (${t("col_delta")})`} metricKey="cmdDelta" isDelta={true} />

                        <MetricRow label={`${t("tech_power")} (${t("col_current")})`} metricKey="techEnd" />
                        <MetricRow label={`${t("tech_power")} (${t("col_delta")})`} metricKey="techDelta" isDelta={true} />
                        
                        <MetricRow label={`${t("building_power")} (${t("col_current")})`} metricKey="buildEnd" />
                        <MetricRow label={`${t("building_power")} (${t("col_delta")})`} metricKey="buildDelta" isDelta={true} />

                        {/* Section: Combat */}
                        <div className="bg-[#13161c]/40 border-b border-[#1e222b] py-1.5 px-4 text-[9px] font-black uppercase tracking-wider text-rose-500">
                            {t("section_combat")}
                        </div>
                        <MetricRow label={`${t("kill_points")} (${t("col_current")})`} metricKey="kpEnd" />
                        <MetricRow label={`${t("kill_points")} (${t("col_delta")})`} metricKey="kpDelta" isDelta={true} />

                        <MetricRow label={`${t("dead_troops")} (${t("col_current")})`} metricKey="deadEnd" />
                        <MetricRow label={`${t("dead_troops")} (${t("col_delta")})`} metricKey="deadDelta" isDelta={true} />

                        <MetricRow label={`${t("rss_gathered")} (${t("col_current")})`} metricKey="gatheredEnd" />
                        <MetricRow label={`${t("rss_gathered")} (${t("col_delta")})`} metricKey="gatheredDelta" isDelta={true} />

                    </div>

                    {/* Section: ECharts Visual Charts */}
                    {chartOptions && (
                        <div className="space-y-6 relative">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="text-cyan-400" size={18} />
                                <h3 className="text-white text-xs font-black uppercase tracking-widest">{t("section_charts")}</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 shadow-xl min-h-[350px]">
                                    <ReactECharts
                                        option={chartOptions.powerTroop}
                                        style={{ width: "100%", height: "300px" }}
                                        opts={{ renderer: "canvas" }}
                                    />
                                </div>
                                
                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 shadow-xl min-h-[350px]">
                                    <ReactECharts
                                        option={chartOptions.combat}
                                        style={{ width: "100%", height: "300px" }}
                                        opts={{ renderer: "canvas" }}
                                    />
                                </div>
                                
                                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 shadow-xl min-h-[350px]">
                                    <ReactECharts
                                        option={chartOptions.infrastructure}
                                        style={{ width: "100%", height: "300px" }}
                                        opts={{ renderer: "canvas" }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
