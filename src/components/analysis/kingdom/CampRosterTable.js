"use client";

import { useState, useMemo } from "react";
import { Download } from "lucide-react";

export default function CampRosterTable({ governors, globalConfig, campName }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "powerStart", direction: "desc" });
    const [topLimit, setTopLimit] = useState(300);

    const requestSort = (key) => {
        let direction = "desc";
        if (sortConfig.key === key && sortConfig.direction === "desc") {
            direction = "asc";
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return null;
        return <span className="ml-1 text-[10px] text-purple-400">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
    };

    const filteredData = useMemo(() => {
        if (!governors) return [];
        let filtered = [...governors];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(g => 
                (g.name && g.name.toLowerCase().includes(q)) || 
                (g.id && g.id.toString().includes(q))
            );
        }

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key] || 0;
                let bVal = b[sortConfig.key] || 0;
                
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [governors, searchQuery, sortConfig]);

    const exportCSV = () => {
        const headers = ["Kingdom", "Governor ID", "Governor Name", "Status", "Starting Power", "Power +/-", "T4 Kills", "T5 Kills", "T4*T5 Combined", "KvK Deads", "KvK KP", "Target DKP", "KP % Complete", "Target Deads", "Dead % Complete", globalConfig.dkpSystem === "basic" ? "Total DKP" : "Total DKP %"];
        let csvContent = headers.join(",") + "\n";
        
        filteredData.forEach((row) => {
            const dataRow = [
                row.kd,
                row.id,
                `"${(row.name || "").replace(/"/g, '""')}"`,
                row.status,
                row.powerStart || 0,
                row.powerDiff || 0,
                row.t4Diff || 0,
                row.t5Diff || 0,
                row.t4t5Combined || 0,
                row.deadsDiff || 0,
                Math.round(row.kvkKP) || 0,
                Math.round(row.targetDkp) || 0,
                row.kpPercent || 0,
                Math.round(row.targetDeads) || 0,
                row.deadPercent || 0,
                globalConfig.dkpSystem === "basic" ? Math.round(row.finalDkp) || 0 : row.quotaPct || 0
            ];
            csvContent += dataRow.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Camp_${campName}_Roster.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-2xl relative overflow-hidden mt-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-black text-white tracking-widest uppercase flex items-center gap-2">
                        {campName} <span className="text-gray-500 font-normal">| Roster Detail</span>
                    </h3>
                    <p className="text-[11px] font-mono text-gray-500 mt-1 uppercase tracking-widest">
                        Evaluating {governors ? governors.length : 0} detected targets across the coalition
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <input 
                        type="text" 
                        placeholder="Search Gov ID or Name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#0a0c0f] border border-[#1e222b] text-white font-mono text-xs px-3 py-1.5 rounded outline-none placeholder:text-gray-600 focus:border-cyan-500/50"
                    />
                    <select 
                        value={topLimit}
                        onChange={(e) => setTopLimit(parseInt(e.target.value))}
                        className="bg-[#0a0c0f] border border-[#1e222b] text-white font-mono text-xs px-3 py-1.5 rounded outline-none cursor-pointer focus:border-cyan-500/50"
                    >
                        <option value={100}>Top 100</option>
                        <option value={300}>Top 300</option>
                        <option value={500}>Top 500</option>
                        <option value={1000}>Top 1000</option>
                        <option value={10000}>All Players</option>
                    </select>
                    <button 
                        onClick={exportCSV}
                        className="px-3 py-1.5 bg-[#0a0c0f] hover:bg-[#1e222b] border border-[#1e222b] text-white text-xs font-bold uppercase tracking-widest rounded flex items-center gap-2 transition-colors shadow-xl"
                    >
                        <Download size={12} className="text-emerald-500" /> CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[600px] border border-[#2d323e] rounded-lg custom-scrollbar bg-[#0a0c0f]">
                <table className="w-full text-left border-collapse min-w-[1500px] text-[11px]">
                    <thead className="sticky top-0 z-20 shadow-md">
                        <tr className="bg-[#1a1d24] border-b border-[#2d323e]">
                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("kd")}>KD <SortIcon columnKey="kd"/></th>
                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("id")}>Governor ID <SortIcon columnKey="id"/></th>
                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("name")}>Governor Name <SortIcon columnKey="name"/></th>
                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("status")}>Status <SortIcon columnKey="status"/></th>
                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("powerStart")}>Starting Power <SortIcon columnKey="powerStart"/></th>
                            <th className="p-3 font-bold text-blue-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("powerDiff")}>Power +/- <SortIcon columnKey="powerDiff"/></th>
                            <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("t4Diff")}>T4 Kills <SortIcon columnKey="t4Diff"/></th>
                            <th className="p-3 font-bold text-amber-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("t5Diff")}>T5 Kills <SortIcon columnKey="t5Diff"/></th>
                            <th className="p-3 font-bold text-rose-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("deadsDiff")}>KvK Deads <SortIcon columnKey="deadsDiff"/></th>
                            <th className="p-3 font-bold text-cyan-400/80 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("kvkKP")}>KvK KP <SortIcon columnKey="kvkKP"/></th>
                            
                            {globalConfig.dkpSystem !== 'basic' && globalConfig.dkpSystem !== 'hoh' && (
                                <>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("targetDkp")}>Target DKP <SortIcon columnKey="targetDkp"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("kpPercent")}>KP % Complete <SortIcon columnKey="kpPercent"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("targetDeads")}>Target Deads <SortIcon columnKey="targetDeads"/></th>
                                    <th className="p-3 font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort("deadPercent")}>Dead % Complete <SortIcon columnKey="deadPercent"/></th>
                                </>
                            )}
                            <th className="p-3 font-black text-emerald-400 uppercase tracking-widest text-right whitespace-nowrap cursor-pointer hover:bg-[#252a33]" onClick={() => requestSort((globalConfig.dkpSystem === 'basic' || globalConfig.dkpSystem === 'hoh') ? "finalDkp" : "quotaPct")}>
                                {(globalConfig.dkpSystem === 'basic' || globalConfig.dkpSystem === 'hoh') ? 'Total DKP' : 'Total DKP %'} <SortIcon columnKey={(globalConfig.dkpSystem === 'basic' || globalConfig.dkpSystem === 'hoh') ? "finalDkp" : "quotaPct"}/>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222b]">
                        {filteredData.slice(0, topLimit).map((gov) => {
                            const statusColors = {
                                'Fighter': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                                'Farmer': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                                'Grower': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                                'Dropped': 'text-rose-400 bg-rose-400/10 border-rose-400/20',
                                'Sleeper': 'text-gray-400 bg-gray-400/10 border-gray-400/20'
                            };
                            
                            return (
                                <tr key={`${gov.kd}-${gov.id}`} className="hover:bg-[#1a1d24] transition-colors group">
                                    <td className="p-3 text-slate-500 font-mono text-xs">{gov.kd}</td>
                                    <td className="p-3 text-gray-400 font-mono">{gov.id}</td>
                                    <td className="p-3 text-white font-bold whitespace-nowrap">{gov.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest ${statusColors[gov.status] || statusColors['Sleeper']}`}>
                                            {gov.status || "Sleeper"}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right text-gray-300 font-mono">{(gov.powerStart || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right font-mono transition-colors">
                                        <span className={gov.powerDiff > 0 ? "text-emerald-500" : gov.powerDiff < 0 ? "text-rose-500" : "text-gray-500"}>
                                            {gov.powerDiff > 0 ? "+" : ""}{(gov.powerDiff || 0).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-gray-300">{(gov.t4Diff || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right font-mono text-amber-500/90">{(gov.t5Diff || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right font-mono text-rose-500">{(gov.deadsDiff || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right font-mono text-cyan-400">{(Math.round(gov.kvkKP) || 0).toLocaleString()}</td>
                                    
                                    {globalConfig.dkpSystem !== 'basic' && globalConfig.dkpSystem !== 'hoh' && (
                                        <>
                                            <td className="p-3 text-right font-mono text-gray-400">{(Math.round(gov.targetDkp) || 0).toLocaleString()}</td>
                                            <td className="p-3 text-right font-mono">
                                                <span className={gov.kpPercent >= 100 ? "text-emerald-500 font-bold" : "text-rose-400"}>{gov.kpPercent}%</span>
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-400">{(Math.round(gov.targetDeads) || 0).toLocaleString()}</td>
                                            <td className="p-3 text-right font-mono">
                                                <span className={gov.deadPercent >= 100 ? "text-emerald-500 font-bold" : "text-rose-400"}>{gov.deadPercent}%</span>
                                            </td>
                                        </>
                                    )}

                                    <td className="p-3 text-right font-mono">
                                        {(globalConfig.dkpSystem === 'basic' || globalConfig.dkpSystem === 'hoh') ? (
                                            <span className="text-sm font-black text-emerald-400">{(Math.round(gov.finalDkp) || 0).toLocaleString()}</span>
                                        ) : (
                                            <span className={`text-sm font-black ${gov.quotaPct >= 100 ? "text-emerald-500 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]" : "text-amber-500"}`}>{gov.quotaPct}%</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredData.length === 0 && (
                     <div className="p-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                          No governors match your current filters.
                     </div>
                )}
            </div>
        </div>
    );
}
