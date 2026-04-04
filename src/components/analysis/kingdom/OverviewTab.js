"use client";

import { useState, useMemo, useEffect } from "react";
import { Download, Search, Filter, ShieldAlert, LayoutTemplate, Activity } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function OverviewTab({ targetKd, trends }) {
    const t = useTranslations('OverviewTab');
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAlliance, setSelectedAlliance] = useState("ALL");
    
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    
    const [rosterData, setRosterData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize Dates
    useEffect(() => {
        if (trends && trends.length > 0) {
            // Default End = Latest, Start = Previous
            if (!endDate) setEndDate(trends[trends.length - 1].scanDate.split('T')[0]);
            if (!startDate) {
                if (trends.length >= 2) setStartDate(trends[trends.length - 2].scanDate.split('T')[0]);
                else setStartDate(trends[0].scanDate.split('T')[0]);
            }
        }
    }, [trends, endDate, startDate]);

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

    // Extract unique alliances
    const uniqueAlliances = useMemo(() => {
        const alliances = new Set();
        rosterData.forEach(gov => {
            if (gov.alliance) alliances.add(gov.alliance);
        });
        return Array.from(alliances).sort();
    }, [rosterData]);

    // Filter Logic
    const filteredData = useMemo(() => {
        return rosterData.filter(gov => {
            const matchesSearch = 
                (gov.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (gov.id?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesAlliance = selectedAlliance === "ALL" || (gov.alliance || 'NONE') === selectedAlliance;
            return matchesSearch && matchesAlliance;
        });
    }, [rosterData, searchTerm, selectedAlliance]);

    const handleExportCSV = () => {
        if (filteredData.length === 0) return;

        const headers = [
            "Rank", "Governor ID", "Governor Name", "Alliance Tag", "Town Hall", "Status",
            "Power (Start)", "Power (End)", "Power (Δ)",
            "Troop Power (Start)", "Troop Power (End)", "Troop Power (Δ)",
            "Commander Power (Start)", "Commander Power (End)", "Commander Power (Δ)",
            "Tech Power (Start)", "Tech Power (End)", "Tech Power (Δ)",
            "Building Power (Start)", "Building Power (End)", "Building Power (Δ)",
            "Resources Gathered (Start)", "Resources Gathered (End)", "Resources Gathered (Δ)",
            "Kill Points (Start)", "Kill Points (End)", "Kill Points (Δ)",
            "Deads (Start)", "Deads (End)", "Deads (Δ)"
        ];

        const rows = filteredData.map((gov, idx) => [
            idx + 1,
            gov.id,
            `"${(gov.name || '').replace(/"/g, '""')}"`,
            gov.alliance || 'NONE',
            gov.townHall,
            gov.status,
            gov.powerStart, gov.powerEnd, gov.powerDelta,
            gov.troopStart, gov.troopEnd, gov.troopDelta,
            gov.cmdStart, gov.cmdEnd, gov.cmdDelta,
            gov.techStart, gov.techEnd, gov.techDelta,
            gov.buildStart, gov.buildEnd, gov.buildDelta,
            gov.gatheredStart, gov.gatheredEnd, gov.gatheredDelta,
            gov.kpStart, gov.kpEnd, gov.kpDelta,
            gov.deadStart, gov.deadEnd, gov.deadDelta
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Unity_Kingdom_${targetKd}_Overview.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderDelta = (delta) => {
        if (delta === 'NEW') return <span className="text-cyan-400 font-bold">{t('delta_new')}</span>;
        if (delta === 'MISSING') return <span className="text-rose-500 font-bold tracking-widest">{t('delta_missing')}</span>;
        
        const num = Number(delta);
        if (num > 0) return <span className="text-emerald-400">+{num.toLocaleString()}</span>;
        if (num < 0) return <span className="text-rose-400">{num.toLocaleString()}</span>;
        return <span className="text-gray-600">-</span>;
    };

    if (!trends || trends.length === 0) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center shadow-xl text-gray-500">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{t('no_temporal_title')}</h3>
                <p className="text-sm">{t('no_temporal_desc')}</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden flex flex-col p-6 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
                            <LayoutTemplate className="text-cyan-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase">{t('title')}</h2>
                            <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">{t('subtitle')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExportCSV}
                            disabled={filteredData.length === 0}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                        >
                            <Download size={16} />
                            {t('btn_export')}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-center gap-4 w-full bg-[#13161c] border border-[#1e222b] p-4 rounded-xl relative z-10 shadow-inner">
                    
                    {/* Date Pickers */}
                    <div className="flex items-center gap-3 bg-[#0a0c0f] border border-[#1e222b] rounded-lg px-4 py-2 border-l-4 border-l-cyan-500 shrink-0">
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('label_start')}</span>
                             <input 
                                 type="date" 
                                 value={startDate} 
                                 onChange={e => setStartDate(e.target.value)}
                                 className="bg-transparent text-white text-xs outline-none font-mono cursor-pointer"
                                 style={{ colorScheme: 'dark' }}
                             />
                        </div>
                        <span className="text-gray-600 text-lg mx-1">/</span>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('label_end')}</span>
                             <input 
                                 type="date" 
                                 value={endDate} 
                                 onChange={e => setEndDate(e.target.value)}
                                 min={startDate}
                                 className="bg-transparent text-white text-xs outline-none font-mono cursor-pointer"
                                 style={{ colorScheme: 'dark' }}
                             />
                        </div>
                    </div>

                    <div className="h-8 w-px bg-[#1e222b] hidden lg:block mx-1"></div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 flex-1 w-full bg-[#0a0c0f] border border-[#1e222b] focus-within:border-cyan-500 transition-colors rounded-lg px-4 py-2.5">
                        <Search className="text-gray-500" size={18} />
                        <input 
                            type="text" 
                            placeholder={t('search_placeholder')} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-white text-sm w-full font-medium placeholder-gray-600"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto bg-[#0a0c0f] border border-[#1e222b] focus-within:border-cyan-500 transition-colors rounded-lg px-4 py-2.5">
                        <Filter className="text-gray-500" size={18} />
                        <select 
                            value={selectedAlliance}
                            onChange={(e) => setSelectedAlliance(e.target.value)}
                            className="bg-transparent border-none outline-none text-white text-sm w-full font-bold cursor-pointer uppercase tracking-wider placeholder-gray-600 [&>option]:bg-[#0f1115] [&>option]:text-white"
                        >
                            <option value="ALL" className="bg-[#0f1115] text-white">{t('filter_all')}</option>
                            <option value="NONE" className="bg-[#0f1115] text-white">{t('filter_none')}</option>
                            {uniqueAlliances.map(a => (
                                <option key={a} value={a} className="bg-[#0f1115] text-white">{a}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Datatable */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden flex flex-col relative w-full pt-1">
                {isLoading ? (
                    <div className="py-32 flex flex-col items-center justify-center text-gray-500">
                        <Activity className="w-12 h-12 mb-4 animate-[spin_3s_linear_infinite] text-cyan-500" />
                        <h3 className="text-lg font-black text-white mb-1 uppercase tracking-widest animate-pulse">{t('loading_title')}</h3>
                        <p className="text-xs font-mono">{t('loading_desc')}</p>
                    </div>
                ) : rosterData.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-gray-500">
                        <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-cyan-500" />
                        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{t('empty_title')}</h3>
                        <p className="text-sm">{t('empty_desc')}</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-gray-500">
                        <Search className="w-12 h-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">{t('no_match_title')}</h3>
                        <p className="text-sm">{t('no_match_desc')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent max-h-[800px]">
                        <table className="w-full text-left border-collapse min-w-[2800px] text-[11px] font-mono">
                            <thead className="sticky top-0 bg-[#0a0c0f] z-20 shadow-md border-b border-[#1e222b]">
                                <tr>
                                    <th className="py-3 px-4 font-bold text-gray-500 tracking-widest uppercase">{t('col_rank')}</th>
                                    <th className="py-3 px-4 font-bold text-gray-500 tracking-widest uppercase">{t('col_id')}</th>
                                    <th className="py-3 px-4 font-bold text-gray-500 tracking-widest uppercase font-sans">{t('col_name')}</th>
                                    <th className="py-3 px-4 font-bold text-gray-500 tracking-widest uppercase">{t('col_alliance')}</th>
                                    <th className="py-3 px-4 font-bold text-gray-500 tracking-widest uppercase text-center">{t('col_th')}</th>
                                    <th className="py-3 px-4 font-bold text-gray-500 tracking-widest uppercase text-center border-r border-[#1e222b]">{t('col_status')}</th>
                                    
                                    <th className="py-3 px-4 font-bold text-cyan-500/50 tracking-widest uppercase text-right">{t('col_power_start')}</th>
                                    <th className="py-3 px-4 font-bold text-cyan-500/50 tracking-widest uppercase text-right">{t('col_power_end')}</th>
                                    <th className="py-3 px-4 font-black text-white tracking-widest uppercase text-right border-r border-[#1e222b]">{t('col_power_delta')}</th>
                                    
                                    <th className="py-3 px-4 font-bold text-teal-500/50 tracking-widest uppercase text-right">{t('col_troops_start')}</th>
                                    <th className="py-3 px-4 font-bold text-teal-500/50 tracking-widest uppercase text-right">{t('col_troops_end')}</th>
                                    <th className="py-3 px-4 font-black text-white tracking-widest uppercase text-right border-r border-[#1e222b]">{t('col_troops_delta')}</th>

                                    <th className="py-3 px-4 font-bold text-indigo-500/50 tracking-widest uppercase text-right">{t('col_cmd_start')}</th>
                                    <th className="py-3 px-4 font-bold text-indigo-500/50 tracking-widest uppercase text-right">{t('col_cmd_end')}</th>
                                    <th className="py-3 px-4 font-black text-white tracking-widest uppercase text-right border-r border-[#1e222b]">{t('col_cmd_delta')}</th>
                                    
                                    <th className="py-3 px-4 font-bold text-purple-500/50 tracking-widest uppercase text-right">{t('col_tech_start')}</th>
                                    <th className="py-3 px-4 font-bold text-purple-500/50 tracking-widest uppercase text-right">{t('col_tech_end')}</th>
                                    <th className="py-3 px-4 font-black text-white tracking-widest uppercase text-right border-r border-[#1e222b]">{t('col_tech_delta')}</th>
                                    
                                    <th className="py-3 px-4 font-bold text-amber-500/50 tracking-widest uppercase text-right">{t('col_bldgs_start')}</th>
                                    <th className="py-3 px-4 font-bold text-amber-500/50 tracking-widest uppercase text-right">{t('col_bldgs_end')}</th>
                                    <th className="py-3 px-4 font-black text-white tracking-widest uppercase text-right border-r border-[#1e222b]">{t('col_bldgs_delta')}</th>

                                    <th className="py-3 px-4 font-bold text-rose-500/50 tracking-widest uppercase text-right">{t('col_kp_start')}</th>
                                    <th className="py-3 px-4 font-bold text-rose-500/50 tracking-widest uppercase text-right">{t('col_kp_end')}</th>
                                    <th className="py-3 px-4 font-black text-white tracking-widest uppercase text-right border-r border-[#1e222b]">{t('col_kp_delta')}</th>
                                    
                                    <th className="py-3 px-4 font-bold text-red-600/50 tracking-widest uppercase text-right">{t('col_deads_start')}</th>
                                    <th className="py-3 px-4 font-bold text-red-600/50 tracking-widest uppercase text-right">{t('col_deads_end')}</th>
                                    <th className="py-3 px-4 font-black text-white tracking-widest uppercase text-right border-r border-[#1e222b]">{t('col_deads_delta')}</th>
                                    
                                    <th className="py-3 px-4 font-bold text-gray-500 tracking-widest uppercase text-right">{t('col_rss_start')}</th>
                                    <th className="py-3 px-4 font-bold text-gray-500 tracking-widest uppercase text-right">{t('col_rss_end')}</th>
                                    <th className="py-3 px-4 font-black text-white tracking-widest uppercase text-right">{t('col_rss_delta')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]/50">
                                {filteredData.map((gov, idx) => (
                                    <tr key={idx} className="hover:bg-cyan-500/10 transition-colors group h-[40px]">
                                        <td className="py-2 px-4 text-gray-500 border-l-[3px] border-transparent group-hover:border-cyan-500">#{idx + 1}</td>
                                        <td className="py-2 px-4 text-gray-400">{gov.id}</td>
                                        <td className="py-2 px-4 text-sm text-white font-bold font-sans tracking-wide max-w-[200px] truncate" title={gov.name}>{gov.name}</td>
                                        <td className="py-2 px-4">
                                            <span className="bg-[#1e222b] text-cyan-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest">{gov.alliance || 'NONE'}</span>
                                        </td>
                                        <td className="py-2 px-4 text-center text-gray-400">{gov.townHall}</td>
                                        <td className="py-2 px-4 text-center border-r border-[#1e222b]/50">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${
                                                gov.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                gov.status === 'Missing' ? 'bg-rose-500/20 text-rose-400' : 
                                                'bg-cyan-500/20 text-cyan-400'
                                            }`}>{gov.status}</span>
                                        </td>

                                        {/* Power */}
                                        <td className="py-2 px-4 text-right text-gray-400">{Number(gov.powerStart).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right text-gray-200">{Number(gov.powerEnd).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right border-r border-[#1e222b]/50">{renderDelta(gov.powerDelta)}</td>

                                        {/* Troops */}
                                        <td className="py-2 px-4 text-right text-gray-400">{Number(gov.troopStart).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right text-gray-200">{Number(gov.troopEnd).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right border-r border-[#1e222b]/50">{renderDelta(gov.troopDelta)}</td>

                                        {/* Cmd */}
                                        <td className="py-2 px-4 text-right text-gray-400">{Number(gov.cmdStart).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right text-gray-200">{Number(gov.cmdEnd).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right border-r border-[#1e222b]/50">{renderDelta(gov.cmdDelta)}</td>

                                        {/* Tech */}
                                        <td className="py-2 px-4 text-right text-gray-400">{Number(gov.techStart).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right text-gray-200">{Number(gov.techEnd).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right border-r border-[#1e222b]/50">{renderDelta(gov.techDelta)}</td>

                                        {/* Bldgs */}
                                        <td className="py-2 px-4 text-right text-gray-400">{Number(gov.buildStart).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right text-gray-200">{Number(gov.buildEnd).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right border-r border-[#1e222b]/50">{renderDelta(gov.buildDelta)}</td>

                                        {/* KP */}
                                        <td className="py-2 px-4 text-right text-rose-500/60">{Number(gov.kpStart).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right text-rose-400">{Number(gov.kpEnd).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right border-r border-[#1e222b]/50">{renderDelta(gov.kpDelta)}</td>

                                        {/* Deads */}
                                        <td className="py-2 px-4 text-right text-red-600/60">{Number(gov.deadStart).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right text-red-500">{Number(gov.deadEnd).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right border-r border-[#1e222b]/50">{renderDelta(gov.deadDelta)}</td>

                                        {/* RSS */}
                                        <td className="py-2 px-4 text-right text-gray-500">{Number(gov.gatheredStart).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right text-gray-300">{Number(gov.gatheredEnd).toLocaleString()}</td>
                                        <td className="py-2 px-4 text-right">{renderDelta(gov.gatheredDelta)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
