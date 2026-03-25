"use client";

import { useState, useMemo } from "react";
import { Download, Search, Filter, ShieldAlert, LayoutTemplate } from "lucide-react";

export default function OverviewTab({ rosterData = [], isLoadingRoster }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAlliance, setSelectedAlliance] = useState("ALL");

    // Extract unique alliances for the filter dropdown
    const uniqueAlliances = useMemo(() => {
        const alliances = new Set();
        rosterData.forEach(gov => {
            if (gov.alliance) alliances.add(gov.alliance);
        });
        return Array.from(alliances).sort();
    }, [rosterData]);

    // Apply Search & Alliance Filters
    const filteredData = useMemo(() => {
        return rosterData.filter(gov => {
            const matchesSearch = gov.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAlliance = selectedAlliance === "ALL" || (gov.alliance || 'NONE') === selectedAlliance;
            return matchesSearch && matchesAlliance;
        });
    }, [rosterData, searchTerm, selectedAlliance]);

    const handleExportCSV = () => {
        if (filteredData.length === 0) return;

        const headers = ["Rank", "Governor Name", "Alliance", "Power", "Kill Points", "Deads"];
        const rows = filteredData.map((gov, idx) => [
            idx + 1,
            `"${(gov.name || '').replace(/"/g, '""')}"`, // Escape quotes
            gov.alliance || 'NONE',
            gov.power || 0,
            gov.killPoints || 0,
            gov.dead || 0
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(e => e.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Unity_Kingdom_Scan_Export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoadingRoster) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center shadow-xl">
                <Search className="animate-pulse text-cyan-500 w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden flex flex-col items-center justify-center p-8 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full relative z-10 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#1e222b] p-2.5 rounded-lg border border-[#2d323e]">
                            <LayoutTemplate className="text-cyan-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-widest uppercase">Overview Explorer</h2>
                            <p className="text-cyan-400 font-bold text-[10px] uppercase tracking-[0.2em]">Live Database Spreadsheet</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleExportCSV}
                            disabled={filteredData.length === 0}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Filters Strip */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full bg-[#13161c] border border-[#1e222b] p-4 rounded-xl relative z-10 relative">
                    <div className="flex items-center gap-3 flex-1 w-full bg-[#0a0c0f] border border-[#1e222b] focus-within:border-cyan-500 transition-colors rounded-lg px-4 py-2.5">
                        <Search className="text-gray-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by Gov Name..." 
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
                            <option value="ALL" className="bg-[#0f1115] text-white">All Alliances ({rosterData.length})</option>
                            <option value="NONE" className="bg-[#0f1115] text-white">Unallied (NONE)</option>
                            {uniqueAlliances.map(a => (
                                <option key={a} value={a} className="bg-[#0f1115] text-white">{a}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Datatable */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden flex flex-col relative w-full">
                {rosterData.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-500">
                        <ShieldAlert className="w-12 h-12 mb-4 opacity-50 text-cyan-500" />
                        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Cloud Data</h3>
                        <p className="text-sm">Cannot formulate grids without scanned entity blocks.</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-500">
                        <Search className="w-12 h-12 mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">No Matches Found</h3>
                        <p className="text-sm">No governors align with your strict filter query.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent max-h-[700px]">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="sticky top-0 bg-[#0a0c0f] z-20 shadow-md border-b border-[#1e222b]">
                                <tr>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider">RANK</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider">GOVERNOR NAME</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider">ALLIANCE</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider text-right">TOTAL POWER</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider text-right">KILL POINTS</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider text-right">DEADS / SEVERELY P.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]">
                                {filteredData.map((gov, idx) => (
                                    <tr key={idx} className="hover:bg-cyan-500/5 transition-colors group">
                                        <td className="py-4 px-6 text-sm font-mono text-gray-500 border-l-[3px] border-transparent group-hover:border-cyan-500 transition-colors">#{idx + 1}</td>
                                        <td className="py-4 px-6 text-sm text-white font-bold">{gov.name}</td>
                                        <td className="py-4 px-6">
                                            <span className="bg-[#1e222b] border border-[#2d323e] text-gray-300 px-3 py-1 rounded text-xs font-bold font-mono tracking-widest">{gov.alliance || 'NONE'}</span>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-mono text-cyan-400 text-right">{Number(gov.power || 0).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-sm font-mono text-rose-400 text-right">{Number(gov.killPoints || 0).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-sm font-mono text-amber-500 text-right">{Number(gov.dead || 0).toLocaleString()}</td>
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
