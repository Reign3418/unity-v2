"use client";

import { useState, useMemo } from "react";
import { Users, ShieldCheck, ChevronUp, ChevronDown, Search, ShieldAlert, MapPin, Download, Table, Swords } from "lucide-react";
import { useSession } from "next-auth/react";
import GovernorNotesModal from "./GovernorNotesModal";

const fmt = (n) => {
    if (n === null || n === undefined || n === "") return "-";
    const num = Number(n);
    if (Number.isNaN(num)) return String(n);
    if (Math.abs(num) >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
    if (Math.abs(num) >= 1_000_000)     return (num / 1_000_000).toFixed(2) + "M";
    if (Math.abs(num) >= 1_000)         return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString();
};

const COMPACT_COLS = [
    { key: "rank",           label: "Rank",        color: "text-cyan-400" },
    { key: "ch",             label: "CH",          color: "text-amber-300" },
    { key: "mapTileX",       label: "Map (X, Y)",  color: "text-emerald-400", isCoord: true },
    { key: "power",          label: "Power",       color: "text-white font-bold" },
    { key: "troopPower",     label: "Troop Pwr",   color: "text-sky-400" },
    { key: "commanderPower", label: "Cmdr Pwr",    color: "text-violet-400" },
    { key: "killPoints",     label: "Kill Points", color: "text-emerald-400" },
    { key: "dead",           label: "Deads",       color: "text-rose-400" },
    { key: "t4Kills",        label: "T4 Kills",    color: "text-amber-400" },
    { key: "t5Kills",        label: "T5 Kills",    color: "text-fuchsia-400" },
    { key: "rssGathered",    label: "Gathered",    color: "text-teal-400" },
    { key: "allianceHelps",  label: "Helps",       color: "text-indigo-400" },
];

const FULL_45_COLS = [
    { key: "rank",               label: "Rank",          color: "text-cyan-400" },
    { key: "prevRank",           label: "Prev Rank",     color: "text-gray-400" },
    { key: "ch",                 label: "CH",            color: "text-amber-300" },
    { key: "vip",                label: "VIP",           color: "text-yellow-400" },
    { key: "mapTileX",           label: "Map (X, Y)",    color: "text-emerald-400", isCoord: true },
    { key: "power",              label: "Power",         color: "text-white font-bold" },
    { key: "highestPower",       label: "Max Power",     color: "text-gray-300" },
    { key: "troopPower",         label: "Troop Pwr",     color: "text-sky-400" },
    { key: "techPower",          label: "Tech Pwr",      color: "text-cyan-300" },
    { key: "buildingPower",      label: "Bldg Pwr",      color: "text-amber-200" },
    { key: "commanderPower",     label: "Cmdr Pwr",      color: "text-violet-400" },
    { key: "killPoints",         label: "Kill Points",   color: "text-emerald-400" },
    { key: "dead",               label: "Deads",         color: "text-rose-400" },
    { key: "healedTroops",       label: "Healed",        color: "text-pink-300" },
    { key: "t1Kills",            label: "T1 Kills",      color: "text-gray-400" },
    { key: "t2Kills",            label: "T2 Kills",      color: "text-gray-300" },
    { key: "t3Kills",            label: "T3 Kills",      color: "text-blue-300" },
    { key: "t4Kills",            label: "T4 Kills",      color: "text-amber-400" },
    { key: "t5Kills",            label: "T5 Kills",      color: "text-fuchsia-400" },
    { key: "t4t5Kills",          label: "T4+T5 Kills",   color: "text-orange-400" },
    { key: "totalKills",         label: "Total Kills",   color: "text-red-300" },
    { key: "t1Kp",               label: "T1 KP",         color: "text-gray-500" },
    { key: "t2Kp",               label: "T2 KP",         color: "text-gray-400" },
    { key: "t3Kp",               label: "T3 KP",         color: "text-blue-400" },
    { key: "t4Kp",               label: "T4 KP",         color: "text-amber-500" },
    { key: "t5Kp",               label: "T5 KP",         color: "text-fuchsia-500" },
    { key: "rangedPoints",       label: "Ranged Pts",    color: "text-lime-400" },
    { key: "rssGathered",        label: "Gathered",      color: "text-teal-400" },
    { key: "rssAssistance",      label: "Rss Assist",    color: "text-teal-300" },
    { key: "allianceHelps",      label: "Helps",         color: "text-indigo-400" },
    { key: "scoutTimes",         label: "Scouts",        color: "text-sky-300" },
    { key: "acclaim",            label: "Acclaim",       color: "text-yellow-300" },
    { key: "Conqueror",          label: "Victories",     color: "text-emerald-300" },
    { key: "FailTimes",          label: "Defeats",       color: "text-rose-300" },
    { key: "rallyTotalCount",    label: "Rallies",       color: "text-orange-300" },
    { key: "primaryCommanderStr",label: "Commanders",    color: "text-purple-300", isText: true },
];

function exportRosterCsv(rows) {
    const headers = [
        "rank","prevRank","id","name","alliance","allianceName","ch","vip",
        "mapTileX","mapTileY","worldX","worldY",
        "power","highestPower","troopPower","techPower","buildingPower","commanderPower",
        "killPoints","dead","healedTroops",
        "t1Kills","t2Kills","t3Kills","t4Kills","t5Kills","t4t5Kills","totalKills",
        "t1Kp","t2Kp","t3Kp","t4Kp","t5Kp","rangedPoints",
        "rssGathered","rssAssistance","allianceHelps","scoutTimes","acclaim",
        "Conqueror","FailTimes","DeadSoldiers","WatchTower",
        "rallyLaunchedCount","rallyJoinedCount","rallyTotalCount",
        "primaryCommanderStr","secondaryCommanderStr","udid"
    ];
    const esc = (v) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const lines = [
        headers.join(","),
        ...rows.map(r => headers.map(h => esc(r[h])).join(","))
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Kingdom_4194_Top${rows.length}_45Fields.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Governor Profiles Sub-Tab ────────────────────────────────────────────────
function GovernorProfiles({ rosterData, isFounder = false }) {
    const { data: session } = useSession();
    const isR4 = session?.user?.isLeader || session?.user?.isSuperAdmin;
    const [notesModalGov, setNotesModalGov] = useState(null);

    const [search, setSearch]                 = useState("");
    const [sortKey, setSortKey]               = useState("rank");
    const [sortDir, setSortDir]               = useState("asc");
    const [allianceFilter, setAllianceFilter] = useState("ALL");
    const [onlyMappedCoords, setOnlyMappedCoords] = useState(false);
    const [full45Mode, setFull45Mode]         = useState(true);

    const alliances = useMemo(() => {
        const tags = [...new Set(rosterData.map(g => g.alliance || "None"))].sort();
        return ["ALL", ...tags];
    }, [rosterData]);

    const sorted = useMemo(() => {
        let rows = [...rosterData];

        if (search) {
            const q = search.trim().toLowerCase();
            rows = rows.filter(g =>
                (g.name || "").toLowerCase().includes(q) ||
                String(g.id).includes(q) ||
                (g.alliance || "").toLowerCase().includes(q) ||
                (g.locationStr || "").toLowerCase().includes(q)
            );
        }

        if (allianceFilter !== "ALL") {
            rows = rows.filter(g => (g.alliance || "None") === allianceFilter);
        }

        if (onlyMappedCoords) {
            rows = rows.filter(g => g.mapTileX !== null && g.mapTileX !== undefined);
        }

        rows.sort((a, b) => {
            const av = a[sortKey] ?? (sortDir === "asc" ? Number.MAX_SAFE_INTEGER : -1);
            const bv = b[sortKey] ?? (sortDir === "asc" ? Number.MAX_SAFE_INTEGER : -1);
            if (typeof av === "string" || typeof bv === "string") {
                return sortDir === "desc"
                    ? String(bv).localeCompare(String(av))
                    : String(av).localeCompare(String(bv));
            }
            return sortDir === "desc" ? bv - av : av - bv;
        });

        return rows;
    }, [rosterData, search, sortKey, sortDir, allianceFilter, onlyMappedCoords]);

    // Highlighted Governor card when searching by exact ID or when 1-5 results match
    const spotlightGovernor = useMemo(() => {
        const q = search.trim();
        if (!q) return null;
        const exact = rosterData.find(
            g => String(g.id) === q || (g.name || "").toLowerCase() === q.toLowerCase()
        );
        if (exact) return exact;
        if (sorted.length >= 1 && sorted.length <= 5) return sorted[0];
        return null;
    }, [rosterData, search, sorted]);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
        else { setSortKey(key); setSortDir(key === "rank" ? "asc" : "desc"); }
    };

    const SortIcon = ({ col }) => (
        sortKey === col
            ? sortDir === "desc"
                ? <ChevronDown size={12} className="text-cyan-400" />
                : <ChevronUp size={12} className="text-cyan-400" />
            : <ChevronDown size={12} className="text-gray-700" />
    );

    const activeCols = full45Mode ? FULL_45_COLS : COMPACT_COLS;

    return (
        <div className="space-y-4">
            {/* Controls & Instant Governor Location Finder */}
            <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                    <input
                        type="text"
                        placeholder="Instant Governor Finder: Type Gov ID (e.g. 235693760), Name, or Alliance for Map Location & 45-Field Dossier…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-[#0a0c0f] border border-[#1e222b] focus:border-cyan-500 text-white text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none transition-colors"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={allianceFilter}
                        onChange={e => setAllianceFilter(e.target.value)}
                        className="bg-[#0a0c0f] border border-[#1e222b] text-white text-xs px-3 py-2.5 rounded-lg outline-none cursor-pointer focus:border-cyan-500 transition-colors"
                    >
                        {alliances.map(a => <option key={a} value={a}>{a === "ALL" ? "All Alliances" : `[${a}]`}</option>)}
                    </select>
                    <button
                        onClick={() => setOnlyMappedCoords(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                            onlyMappedCoords
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                                : "bg-[#0a0c0f] border-[#1e222b] text-gray-400 hover:text-white"
                        }`}
                    >
                        <MapPin size={13} /> Mapped Coords
                    </button>
                    <button
                        onClick={() => setFull45Mode(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                            full45Mode
                                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                                : "bg-[#0a0c0f] border-[#1e222b] text-gray-400 hover:text-white"
                        }`}
                    >
                        <Table size={13} /> {full45Mode ? "Full 45-Field View" : "Compact View"}
                    </button>
                    <button
                        onClick={() => exportRosterCsv(sorted)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 transition-all"
                    >
                        <Download size={13} /> Export CSV ({sorted.length})
                    </button>
                </div>
            </div>

            {/* Instant Governor Location & Telemetry Spotlight Card */}
            {spotlightGovernor && (
                <div className="bg-gradient-to-r from-[#0d1520] via-[#111824] to-[#0d1520] border border-cyan-500/40 rounded-xl p-4 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">
                                    Rank #{spotlightGovernor.rank || "-"}
                                </span>
                                <span className="text-white font-bold text-base">
                                    {spotlightGovernor.name}
                                </span>
                                <span className="text-gray-400 font-mono text-xs">
                                    ID: {spotlightGovernor.id}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                                    [{spotlightGovernor.alliance || "No Tag"}] {spotlightGovernor.allianceName || ""}
                                </span>
                                {spotlightGovernor.ch > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                                        CH {spotlightGovernor.ch}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap pt-1">
                                <span>Power: <strong className="text-white font-mono">{fmt(spotlightGovernor.power)}</strong></span>
                                <span>Troop Pwr: <strong className="text-sky-400 font-mono">{fmt(spotlightGovernor.troopPower)}</strong></span>
                                <span>Tech Pwr: <strong className="text-cyan-300 font-mono">{fmt(spotlightGovernor.techPower)}</strong></span>
                                <span>Bldg Pwr: <strong className="text-amber-200 font-mono">{fmt(spotlightGovernor.buildingPower)}</strong></span>
                                <span>Cmdr Pwr: <strong className="text-violet-400 font-mono">{fmt(spotlightGovernor.commanderPower)}</strong></span>
                                <span>Kill Points: <strong className="text-emerald-400 font-mono">{fmt(spotlightGovernor.killPoints)}</strong></span>
                                <span>Deads: <strong className="text-rose-400 font-mono">{fmt(spotlightGovernor.dead)}</strong></span>
                            </div>
                        </div>

                        {/* Map Coordinates Box */}
                        <div className="flex items-center gap-3 bg-[#080b10] border border-emerald-500/40 rounded-lg px-4 py-2.5">
                            <MapPin className="text-emerald-400 shrink-0" size={20} />
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                    Kingdom Map Tile Location
                                </div>
                                {spotlightGovernor.mapTileX !== null && spotlightGovernor.mapTileX !== undefined ? (
                                    <div>
                                        <div className="text-emerald-400 font-mono font-bold text-sm">
                                            Tile X: {spotlightGovernor.mapTileX} , Y: {spotlightGovernor.mapTileY}
                                        </div>
                                        <div className="text-gray-500 font-mono text-[10px]">
                                            World Pos: ({spotlightGovernor.worldX}, {spotlightGovernor.worldY})
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-amber-400/90 font-mono text-xs">
                                        Outside [LW=A] Mailcache · Add Alliance CH8 or Map Sweep
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {(spotlightGovernor.primaryCommanderStr || spotlightGovernor.rallyTotalCount > 0) && (
                        <div className="mt-3 pt-2.5 border-t border-[#1e222b] flex items-center gap-4 text-xs text-gray-300 flex-wrap">
                            <span className="flex items-center gap-1.5 text-purple-300 font-mono">
                                <Swords size={13} /> Active Pair: <strong>{spotlightGovernor.primaryCommanderStr || "None"}</strong>
                                {spotlightGovernor.secondaryCommanderStr ? ` + ${spotlightGovernor.secondaryCommanderStr}` : ""}
                            </span>
                            <span className="font-mono text-orange-300">
                                Rallies: <strong>{spotlightGovernor.rallyTotalCount || 0}</strong> ({spotlightGovernor.rallyLaunchedCount || 0} launched / {spotlightGovernor.rallyJoinedCount || 0} joined)
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#1e222b]">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-[#0a0c0f] border-b border-[#1e222b]">
                            {isR4 && <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-500 w-8 text-center"><ShieldAlert size={14}/></th>}
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 sticky left-0 bg-[#0a0c0f] z-10">Governor</th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Alliance</th>
                            {activeCols.map(c => (
                                <th
                                    key={c.key}
                                    className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right cursor-pointer hover:text-cyan-400 transition-colors select-none whitespace-nowrap"
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
                                <td colSpan={activeCols.length + 3} className="px-4 py-12 text-center text-gray-600 text-sm">
                                    No governors found matching filter.
                                </td>
                            </tr>
                        )}
                        {sorted.map((gov, idx) => (
                            <tr
                                key={gov.id}
                                className={`border-b border-[#1e222b]/50 hover:bg-[#15181e] transition-colors ${idx < 3 ? 'bg-[#12151b]' : ''}`}
                            >
                                {isR4 && (
                                    <td className="px-2 py-2.5 text-center">
                                        <button 
                                            onClick={() => setNotesModalGov({ id: gov.id, name: gov.name })}
                                            className="text-gray-600 hover:text-rose-400 transition-colors"
                                            title="Open Governor Dossier"
                                        >
                                            <ShieldAlert size={14} />
                                        </button>
                                    </td>
                                )}
                                <td className="px-4 py-2.5 sticky left-0 bg-[#0f1115] z-10 border-r border-[#1e222b]/40">
                                    <div className="font-bold text-white text-xs leading-tight whitespace-nowrap">{gov.name}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-gray-500 font-mono text-[10px]">{gov.id}</span>
                                        {isFounder && gov.sourceBadge && (
                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                                                gov.sourceBadge.includes("ARCHIVE")
                                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                                    : gov.sourceBadge.includes("MIGRANT")
                                                    ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                            }`}>
                                                {gov.sourceBadge}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="text-cyan-400 font-bold text-xs">
                                        {gov.alliance && gov.alliance !== "None" ? gov.alliance : <span className="text-gray-600 italic">No Tag</span>}
                                    </span>
                                </td>
                                {activeCols.map(c => {
                                    if (c.isCoord) {
                                        return (
                                            <td key={c.key} className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                                                {gov.mapTileX !== null && gov.mapTileX !== undefined ? (
                                                    <span className="text-emerald-400 font-bold" title={`World: (${gov.worldX}, ${gov.worldY})`}>
                                                        X:{gov.mapTileX} Y:{gov.mapTileY}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-700">-</span>
                                                )}
                                            </td>
                                        );
                                    }
                                    if (c.isText) {
                                        return (
                                            <td key={c.key} className={`px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap ${c.color}`}>
                                                {gov.primaryCommanderStr
                                                    ? `${gov.primaryCommanderStr}${gov.secondaryCommanderStr ? ` / ${gov.secondaryCommanderStr}` : ""}`
                                                    : "-"}
                                            </td>
                                        );
                                    }
                                    return (
                                        <td key={c.key} className={`px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap ${c.color}`}>
                                            {c.key === "rank" || c.key === "prevRank" || c.key === "ch" || c.key === "vip"
                                                ? (gov[c.key] ? gov[c.key] : "-")
                                                : fmt(gov[c.key])}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <GovernorNotesModal 
                isOpen={!!notesModalGov} 
                onClose={() => setNotesModalGov(null)} 
                govId={notesModalGov?.id} 
                govName={notesModalGov?.name} 
            />
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
            if (!map[tag]) {
                map[tag] = {
                    alliance: tag,
                    count: 0,
                    mappedCoords: 0,
                    power: 0,
                    dead: 0,
                    t4Kills: 0,
                    t5Kills: 0,
                    killPoints: 0,
                    troopPower: 0,
                    techPower: 0,
                    buildingPower: 0,
                    commanderPower: 0,
                    rssGathered: 0,
                    allianceHelps: 0,
                    rallies: 0,
                };
            }
            map[tag].count          += 1;
            if (gov.mapTileX !== null && gov.mapTileX !== undefined) map[tag].mappedCoords += 1;
            map[tag].power          += gov.power          || 0;
            map[tag].dead           += gov.dead           || 0;
            map[tag].t4Kills        += gov.t4Kills        || 0;
            map[tag].t5Kills        += gov.t5Kills        || 0;
            map[tag].killPoints     += gov.killPoints     || 0;
            map[tag].troopPower     += gov.troopPower     || 0;
            map[tag].techPower      += gov.techPower      || 0;
            map[tag].buildingPower  += gov.buildingPower  || 0;
            map[tag].commanderPower += gov.commanderPower || 0;
            map[tag].rssGathered    += gov.rssGathered    || 0;
            map[tag].allianceHelps  += gov.allianceHelps  || 0;
            map[tag].rallies        += gov.rallyTotalCount || 0;
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
        { key: "count",             label: "Top 1K Govs" },
        { key: "mappedCoords",      label: "Mapped Coords" },
        { key: "power",             label: "Total Power" },
        { key: "killPoints",        label: "Kill Points" },
        { key: "dead",              label: "Total Deads" },
        { key: "t4Kills",           label: "T4 Kills" },
        { key: "t5Kills",           label: "T5 Kills" },
        { key: "avgTroopPower",     label: "Avg Troop Pwr" },
        { key: "avgCommanderPower", label: "Avg Cmdr Pwr" },
        { key: "rssGathered",       label: "Total Gathered" },
        { key: "allianceHelps",     label: "Total Helps" },
        { key: "rallies",           label: "Rallies" },
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
                                className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right cursor-pointer hover:text-cyan-400 transition-colors select-none whitespace-nowrap"
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
                            <td className="px-4 py-2.5 font-bold text-cyan-400 text-xs whitespace-nowrap">
                                {row.alliance === "No Tag"
                                    ? <span className="text-gray-500 italic">No Tag</span>
                                    : `[${row.alliance}]`
                                }
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-gray-300 text-xs">{row.count}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-emerald-400 text-xs">{row.mappedCoords || "-"}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-white font-bold text-xs">{fmt(row.power)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-emerald-400 text-xs">{fmt(row.killPoints)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-rose-400 text-xs">{fmt(row.dead)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-amber-400 text-xs">{fmt(row.t4Kills)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-fuchsia-400 text-xs">{fmt(row.t5Kills)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-sky-400 text-xs">{fmt(row.avgTroopPower)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-violet-400 text-xs">{fmt(row.avgCommanderPower)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-teal-400 text-xs">{fmt(row.rssGathered)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-indigo-400 text-xs">{fmt(row.allianceHelps)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-orange-300 text-xs">{row.rallies || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function RosterViewTab({
    rosterData = [],
    isLoading,
    targetKd = "4194",
    provenance = null,
    sourceMode = "bot_sovereign",
    isFounder = false,
    onToggleSourceMode = null,
}) {
    const [view, setView] = useState("governors");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-16 text-cyan-500 font-mono text-sm tracking-widest uppercase">
                <svg className="animate-spin w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading 1,000-Governor 45-Field Roster…
            </div>
        );
    }

    if (!rosterData || rosterData.length === 0) {
        return (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 text-center text-gray-500 space-y-3">
                <div>No roster data available for Kingdom #{targetKd} in {sourceMode === "archive" ? "Historical Archive" : "Bot-Sovereign"} mode.</div>
                {isFounder && onToggleSourceMode && (
                    <button
                        onClick={() => onToggleSourceMode(sourceMode === "archive" ? "bot_sovereign" : "archive")}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold"
                    >
                        Switch to {sourceMode === "archive" ? "🤖 Active Bot-Sovereign (Epoch 0)" : "🏛️ Historical Archive (View-Only)"}
                    </button>
                )}
            </div>
        );
    }

    const isArchiveView = sourceMode === "archive";
    const isBotSovereign = provenance?.epochMeta?.status === "BOT_SOVEREIGN";

    return (
        <div className="space-y-4">
            {/* DOZER Provenance & Epoch 0 Archival Cutover Banner (Founder Only) */}
            {isFounder && (
                <div className={`rounded-xl p-3.5 border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isArchiveView
                        ? "bg-amber-950/20 border-amber-500/40"
                        : isBotSovereign
                        ? "bg-emerald-950/20 border-emerald-500/40"
                        : "bg-[#0f1115] border-[#1e222b]"
                }`}>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                            isArchiveView
                                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                                : isBotSovereign
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                                : "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        }`}>
                            {isArchiveView
                                ? "🏛️ HISTORICAL ARCHIVE (VIEW-ONLY · DELTAS ZEROED)"
                                : isBotSovereign
                                ? `🤖 BASTION BOT SOVEREIGN · EPOCH 0 (${provenance?.epochMeta?.scanDepthPreset || 650}+ PRESET)`
                                : "📊 SPREADSHEET LEDGER"}
                        </span>
                        <span className="text-xs text-gray-300 font-mono">
                            {isArchiveView
                                ? "Viewing legacy pre-Bot sheets for historical reference. Zeroed out from active KvK delta math."
                                : "DOZER Monotonic Lifetime KP/Deads Guard Active · Non-Destructive Deep Field Carry-Forward Enabled"}
                        </span>
                    </div>
                    {onToggleSourceMode && (
                        <button
                            onClick={() => onToggleSourceMode(isArchiveView ? "bot_sovereign" : "archive")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all shrink-0 ${
                                isArchiveView
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                                    : "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                            }`}
                        >
                            {isArchiveView ? "Return to 🤖 Active Bot Epoch 0" : "Inspect 🏛️ Historical Archive (View-Only)"}
                        </button>
                    )}
                </div>
            )}

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
                            <Users size={14} /> Governor Profiles (45 Fields)
                        </button>
                        <button
                            onClick={() => setView("alliances")}
                            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                                view === "alliances"
                                    ? "bg-cyan-500/20 text-cyan-400"
                                    : "bg-[#0a0c0f] text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            <ShieldCheck size={14} /> Alliance Analysis ({new Set(rosterData.map(g => g.alliance || "None")).size} Alliances)
                        </button>
                    </div>
                </div>
                <span className="text-cyan-400/80 text-xs font-mono">
                    Kingdom #{targetKd} Unified Ingestion · {rosterData.length} Governors · 45 Fields Active
                </span>
            </div>

            {/* Content */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-4">
                {view === "governors"
                    ? <GovernorProfiles rosterData={rosterData} isFounder={isFounder} />
                    : <AllianceAnalysis rosterData={rosterData} />
                }
            </div>
        </div>
    );
}
