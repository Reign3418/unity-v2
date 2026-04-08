"use client";

import { useState, useMemo } from "react";
import { Users, ShieldCheck, ChevronUp, ChevronDown, Search } from "lucide-react";

const fmt = (n) => {
    if (!n && n !== 0) return "-";
    if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
    if (Math.abs(n) >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
    if (Math.abs(n) >= 1_000)         return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
};

// ─── Governor Profiles Sub-Tab ────────────────────────────────────────────────
function GovernorProfiles({ rosterData }) {
    const [search, setSearch]     = useState("");
    const [sortKey, setSortKey]   = useState("power");
    const [sortDir, setSortDir]   = useState("desc");
    const [allianceFilter, setAllianceFilter] = useState("ALL");

    const alliances = useMemo(() => {
        const tags = [...new Set(rosterData.map(g => g.alliance || "None"))].sort();
        return ["ALL", ...tags];
    }, [rosterData]);

    const sorted = useMemo(() => {
        let rows = [...rosterData];

        if (search) {
            const q = search.toLowerCase();
            rows = rows.filter(g =>
                (g.name || "").toLowerCase().includes(q) ||
                String(g.id).includes(q) ||
                (g.alliance || "").toLowerCase().includes(q)
            );
        }

        if (allianceFilter !== "ALL") {
            rows = rows.filter(g => (g.alliance || "None") === allianceFilter);
        }

        rows.sort((a, b) => {
            const av = a[sortKey] ?? 0;
            const bv = b[sortKey] ?? 0;
            return sortDir === "desc" ? bv - av : av - bv;
        });

        return rows;
    }, [rosterData, search, sortKey, sortDir, allianceFilter]);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    const SortIcon = ({ col }) => (
        sortKey === col
            ? sortDir === "desc"
                ? <ChevronDown size={12} className="text-cyan-400" />
                : <ChevronUp size={12} className="text-cyan-400" />
            : <ChevronDown size={12} className="text-gray-700" />
    );

    const COLS = [
        { key: "power",      label: "Power" },
        { key: "dead",       label: "Deads" },
        { key: "t4Kills",    label: "T4 Kills" },
        { key: "t5Kills",    label: "T5 Kills" },
        { key: "killPoints", label: "Kill Points" },
    ];

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name, ID or alliance…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-cyan-500 text-white text-sm pl-9 pr-4 py-2 rounded-lg outline-none transition-colors"
                    />
                </div>
                <select
                    value={allianceFilter}
                    onChange={e => setAllianceFilter(e.target.value)}
                    className="bg-[#0a0c0f] border border-[#1e222b] text-white text-sm px-4 py-2 rounded-lg outline-none cursor-pointer focus:border-cyan-500 transition-colors"
                >
                    {alliances.map(a => <option key={a} value={a}>{a === "ALL" ? "All Alliances" : a}</option>)}
                </select>
                <span className="text-gray-500 text-xs self-center whitespace-nowrap">{sorted.length} governors</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#1e222b]">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-[#0a0c0f] border-b border-[#1e222b]">
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-8">#</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Governor</th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Alliance</th>
                            {COLS.map(c => (
                                <th
                                    key={c.key}
                                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right cursor-pointer hover:text-cyan-400 transition-colors select-none"
                                    onClick={() => toggleSort(c.key)}
                                >
                                    <span className="flex items-center justify-end gap-1">
                                        {c.label} <SortIcon col={c.key} />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">
                                    No governors found.
                                </td>
                            </tr>
                        )}
                        {sorted.map((gov, idx) => (
                            <tr
                                key={gov.id}
                                className={`border-b border-[#1e222b]/50 hover:bg-[#15181e] transition-colors ${idx < 3 ? 'bg-[#12151b]' : ''}`}
                            >
                                <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{idx + 1}</td>
                                <td className="px-4 py-2.5">
                                    <div className="font-bold text-white text-xs leading-tight">{gov.name}</div>
                                    <div className="text-gray-600 font-mono text-[10px]">{gov.id}</div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <span className="text-cyan-400 font-bold text-xs">
                                        {gov.alliance && gov.alliance !== "None" ? gov.alliance : <span className="text-gray-600 italic">No Tag</span>}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-white font-bold text-xs">{fmt(gov.power)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-rose-400 text-xs">{fmt(gov.dead)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-amber-400 text-xs">{fmt(gov.t4Kills)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-fuchsia-400 text-xs">{fmt(gov.t5Kills)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-emerald-400 text-xs">{fmt(gov.killPoints)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Alliance Analysis Sub-Tab ─────────────────────────────────────────────────
function AllianceAnalysis({ rosterData }) {
    const [sortKey, setSortKey] = useState("power");
    const [sortDir, setSortDir] = useState("desc");

    const allianceRows = useMemo(() => {
        const map = {};
        for (const gov of rosterData) {
            const tag = gov.alliance && gov.alliance !== "None" ? gov.alliance : "No Tag";
            if (!map[tag]) map[tag] = { alliance: tag, count: 0, power: 0, dead: 0, t4Kills: 0, t5Kills: 0, killPoints: 0, troopPower: 0, commanderPower: 0 };
            map[tag].count          += 1;
            map[tag].power          += gov.power          || 0;
            map[tag].dead           += gov.dead           || 0;
            map[tag].t4Kills        += gov.t4Kills        || 0;
            map[tag].t5Kills        += gov.t5Kills        || 0;
            map[tag].killPoints     += gov.killPoints     || 0;
            map[tag].troopPower     += gov.troopPower     || 0;
            map[tag].commanderPower += gov.commanderPower || 0;
        }
        return Object.values(map).map(row => ({
            ...row,
            avgTroopPower:     row.count > 0 ? Math.round(row.troopPower     / row.count) : 0,
            avgCommanderPower: row.count > 0 ? Math.round(row.commanderPower / row.count) : 0,
        })).sort((a, b) =>
            sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
        );
    }, [rosterData, sortKey, sortDir]);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    const SortIcon = ({ col }) => (
        sortKey === col
            ? sortDir === "desc"
                ? <ChevronDown size={12} className="text-cyan-400" />
                : <ChevronUp size={12} className="text-cyan-400" />
            : <ChevronDown size={12} className="text-gray-700" />
    );

    const COLS = [
        { key: "count",             label: "Members" },
        { key: "power",             label: "Total Power" },
        { key: "dead",              label: "Total Deads" },
        { key: "t4Kills",           label: "T4 Kills" },
        { key: "t5Kills",           label: "T5 Kills" },
        { key: "killPoints",        label: "Kill Points" },
        { key: "avgTroopPower",     label: "Avg Troop Pwr" },
        { key: "avgCommanderPower", label: "Avg Cmdr Pwr" },
    ];

    return (
        <div className="overflow-x-auto rounded-xl border border-[#1e222b]">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="bg-[#0a0c0f] border-b border-[#1e222b]">
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Alliance</th>
                        {COLS.map(c => (
                            <th
                                key={c.key}
                                className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right cursor-pointer hover:text-cyan-400 transition-colors select-none"
                                onClick={() => toggleSort(c.key)}
                            >
                                <span className="flex items-center justify-end gap-1">
                                    {c.label} <SortIcon col={c.key} />
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {allianceRows.map((row, idx) => (
                        <tr key={row.alliance} className={`border-b border-[#1e222b]/50 hover:bg-[#15181e] transition-colors ${idx === 0 ? 'bg-[#12151b]' : ''}`}>
                            <td className="px-4 py-2.5 font-bold text-cyan-400 text-xs">
                                {row.alliance === "No Tag"
                                    ? <span className="text-gray-500 italic">No Tag</span>
                                    : row.alliance
                                }
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-gray-300 text-xs">{row.count}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-white font-bold text-xs">{fmt(row.power)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-rose-400 text-xs">{fmt(row.dead)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-amber-400 text-xs">{fmt(row.t4Kills)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-fuchsia-400 text-xs">{fmt(row.t5Kills)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-400 text-xs">{fmt(row.killPoints)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-sky-400 text-xs">{fmt(row.avgTroopPower)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-violet-400 text-xs">{fmt(row.avgCommanderPower)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function RosterViewTab({ rosterData = [], isLoading }) {
    const [view, setView] = useState("governors");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-16 text-cyan-500 font-mono text-sm tracking-widest uppercase">
                <svg className="animate-spin w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading Roster…
            </div>
        );
    }

    if (!rosterData || rosterData.length === 0) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 text-center text-gray-500">
                No roster data available for this kingdom. Trigger a scan first.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Sub-Tab Switcher */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="flex rounded-lg overflow-hidden border border-[#1e222b]">
                        <button
                            onClick={() => setView("governors")}
                            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                                view === "governors"
                                    ? "bg-cyan-500/20 text-cyan-400 border-r border-[#1e222b]"
                                    : "bg-[#0a0c0f] text-gray-500 hover:text-gray-300 border-r border-[#1e222b]"
                            }`}
                        >
                            <Users size={14} /> Governor Profiles
                        </button>
                        <button
                            onClick={() => setView("alliances")}
                            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                                view === "alliances"
                                    ? "bg-cyan-500/20 text-cyan-400"
                                    : "bg-[#0a0c0f] text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            <ShieldCheck size={14} /> Alliance Analysis
                        </button>
                    </div>
                </div>
                <span className="text-gray-600 text-xs font-mono">
                    Latest scan · {rosterData.length} governors
                </span>
            </div>

            {/* Content */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4">
                {view === "governors"
                    ? <GovernorProfiles rosterData={rosterData} />
                    : <AllianceAnalysis rosterData={rosterData} />
                }
            </div>
        </div>
    );
}
