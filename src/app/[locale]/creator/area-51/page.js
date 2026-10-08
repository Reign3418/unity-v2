"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { 
    Atom, ShieldAlert, Terminal, Lock, Sparkles, RefreshCw, 
    Layers, Cpu, Activity, Skull, Zap, ChevronRight, Eye, 
    AlertTriangle, CheckCircle2, TrendingDown, Users, Flame,
    Network, Compass
} from "lucide-react";
import { 
    computeCombatDnaManifold, 
    computeSyndicateGraph, 
    testBenfordsLaw, 
    simulateLanchesterBattle,
    BENFORD_THEORETICAL
} from "@/lib/area51Intelligence";

// ============================================================================
// SYNTHETIC BENCHMARK POPULATION GENERATOR (100 GOVERNORS)
// ============================================================================
function generateBenchmarkRoster() {
    const roster = [];

    // 1. 25 Frontline Blood Martyrs (The True Warriors)
    for (let i = 1; i <= 25; i++) {
        const power = 65_000_000 + Math.floor(Math.random() * 20_000_000);
        const t4 = 15_000_000 + Math.floor(Math.random() * 10_000_000);
        const t5 = 20_000_000 + Math.floor(Math.random() * 25_000_000);
        const t1 = 200_000 + Math.floor(Math.random() * 500_000);
        const deads = 3_500_000 + Math.floor(Math.random() * 3_000_000);
        const kp = (t4 * 10) + (t5 * 20);
        roster.push({
            id: 10000000 + i * 1420,
            name: `Vanguard_${i}`,
            alliance: i % 2 === 0 ? "3418_WAR" : "3418_VET",
            power,
            t1Kills: t1,
            t4Kills: t4,
            t5Kills: t5,
            deads,
            killPoints: kp,
            rssAssisted: 800_000_000 + Math.floor(Math.random() * 600_000_000),
            helps: 15_000 + Math.floor(Math.random() * 10_000),
        });
    }

    // 2. 25 Parasitic Whales (Inflated T1 farm duelers)
    for (let i = 1; i <= 25; i++) {
        const power = 85_000_000 + Math.floor(Math.random() * 25_000_000);
        const t1 = 60_000_000 + Math.floor(Math.random() * 40_000_000); // 80%+ T1
        const t4 = 1_000_000 + Math.floor(Math.random() * 2_000_000);
        const t5 = 500_000 + Math.floor(Math.random() * 1_000_000);
        const deads = 15_000 + Math.floor(Math.random() * 35_000); // Near zero deads
        const kp = (t1 * 1) + (t4 * 10) + (t5 * 20);
        roster.push({
            id: 30000000 + i * 2110,
            name: `PaddedWhale_${i}`,
            alliance: "3418_PAR",
            power,
            t1Kills: t1,
            t4Kills: t4,
            t5Kills: t5,
            deads,
            killPoints: kp,
            rssAssisted: 5_000_000 + Math.floor(Math.random() * 10_000_000), // Greedy
            helps: 1_200 + Math.floor(Math.random() * 800),
        });
    }

    // 3. 25 Scripted Farm Bots (Automated gathering accounts)
    for (let i = 1; i <= 25; i++) {
        const power = 18_000_000 + Math.floor(Math.random() * 12_000_000);
        const t1 = 5_000 + Math.floor(Math.random() * 10_000);
        const t4 = 0;
        const t5 = 0;
        const deads = 100 + Math.floor(Math.random() * 300);
        const kp = t1;
        roster.push({
            id: 90000000 + i * 3333,
            name: `HarvestBot_${i}`,
            alliance: "FARM_BOTS",
            power,
            t1Kills: t1,
            t4Kills: 0,
            t5Kills: 0,
            deads,
            killPoints: kp,
            rssAssisted: 100_000 + Math.floor(Math.random() * 500_000),
            helps: 300 + Math.floor(Math.random() * 200),
        });
    }

    // 4. 25 Tactical Mercenaries (High combat burst, low kingdom loyalty)
    for (let i = 1; i <= 25; i++) {
        const power = 70_000_000 + Math.floor(Math.random() * 15_000_000);
        const t4 = 18_000_000 + Math.floor(Math.random() * 8_000_000);
        const t5 = 30_000_000 + Math.floor(Math.random() * 15_000_000);
        const t1 = 300_000 + Math.floor(Math.random() * 400_000);
        const deads = 850_000 + Math.floor(Math.random() * 500_000);
        const kp = (t4 * 10) + (t5 * 20);
        roster.push({
            id: 150000000 + i * 999,
            name: `Mercenary_${i}`,
            alliance: "MERC_ELITE",
            power,
            t1Kills: t1,
            t4Kills: t4,
            t5Kills: t5,
            deads,
            killPoints: kp,
            rssAssisted: 50_000_000 + Math.floor(Math.random() * 50_000_000),
            helps: 4_500 + Math.floor(Math.random() * 2_000),
        });
    }

    // Syndicate Cartel Anchor (6 accounts tightly linked, 1 Puppetmaster)
    roster[0].name = "Syndicate_Alpha"; // Puppetmaster
    roster[0].rssAssisted = 5_500_000_000;
    roster[1].alliance = "3418_WAR";
    roster[2].alliance = "3418_WAR";
    roster[3].alliance = "3418_WAR";
    roster[4].alliance = "3418_WAR";
    roster[5].alliance = "3418_WAR";

    // 2 Infiltrators / Spies (High power, zero alliance ties)
    roster.push({
        id: 172901112,
        name: "Shadow_Operative_1",
        alliance: "None",
        power: 82_000_000,
        t1Kills: 200_000,
        t4Kills: 12_000_000,
        t5Kills: 14_000_000,
        deads: 90_000,
        killPoints: 400_000_000,
        rssAssisted: 0,
        helps: 40,
    });
    roster.push({
        id: 184501239,
        name: "Ghost_Recon_2",
        alliance: "None",
        power: 76_000_000,
        t1Kills: 150_000,
        t4Kills: 9_000_000,
        t5Kills: 11_000_000,
        deads: 45_000,
        killPoints: 310_000_000,
        rssAssisted: 0,
        helps: 20,
    });

    return roster;
}

export default function Area51ClassifiedPage() {
    const t = useTranslations("Area51");
    const { data: session, status } = useSession();

    const [activeTab, setActiveTab] = useState("manifold"); // 'manifold' | 'syndicate' | 'benford' | 'lanchester'
    const [rosterData, setRosterData] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [dataSource, setDataSource] = useState("synthetic"); // 'synthetic' | 'live'
    const [liveKd, setLiveKd] = useState("3418");
    const [isLoadingLive, setIsLoadingLive] = useState(false);

    // Lanchester battle simulation inputs
    const [kdAPool, setKdAPool] = useState(12_000_000);
    const [kdB_Pool, setKdB_Pool] = useState(10_000_000);
    const [kdABuff, setKdABuff] = useState(1.15);
    const [kdB_Buff, setKdB_Buff] = useState(1.00);

    // Initial load of benchmark population
    useEffect(() => {
        setRosterData(generateBenchmarkRoster());
    }, []);

    // Access control evaluation
    const isAuthorized = useMemo(() => {
        if (!session?.user) return false;
        const u = session.user;
        const safeUser = (u.username || u.name || '').toLowerCase();
        const safeEmail = (u.email || '').toLowerCase();
        
        return u.isSuperAdmin === true ||
               safeEmail === 'lauren.alvarado@gmail.com' ||
               safeUser === 'reign' ||
               safeUser === 'reign3418' ||
               safeUser.includes('lauren');
    }, [session]);

    // Fetch live roster
    const handleLoadLiveRoster = async () => {
        setIsLoadingLive(true);
        try {
            const res = await fetch(`/api/aws/roster?kd=${liveKd}`);
            const data = await res.json();
            if (data?.roster && data.roster.length > 0) {
                setRosterData(data.roster);
                setDataSource("live");
            } else {
                alert("No live scan data found for this kingdom. Keeping synthetic benchmark data.");
            }
        } catch {
            alert("Error fetching live roster.");
        } finally {
            setIsLoadingLive(false);
        }
    };

    // 1. Manifold Computation (PCA + K-Means)
    const manifold = useMemo(() => {
        return computeCombatDnaManifold(rosterData);
    }, [rosterData]);

    // 2. Syndicate Network Graph
    const syndicate = useMemo(() => {
        return computeSyndicateGraph(rosterData);
    }, [rosterData]);

    // 3. Benford's Law Fraud Forensics
    const benford = useMemo(() => {
        const numbers = rosterData.flatMap(g => [
            g.power,
            g.killPoints || g.killpoints,
            g.deads || g.deadTroops,
            g.rssAssisted || g.assisted
        ]).filter(Boolean);
        return testBenfordsLaw(numbers);
    }, [rosterData]);

    // 4. Lanchester Battle Simulation
    const lanchester = useMemo(() => {
        return simulateLanchesterBattle({
            kdAT5Pool: kdAPool,
            kdB_T5Pool: kdB_Pool,
            kdABuffPct: kdABuff,
            kdBBuffPct: kdB_Buff,
            durationMinutes: 360,
        });
    }, [kdAPool, kdB_Pool, kdABuff, kdB_Buff]);

    // Security Clearance Gate Screen
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#040608] flex items-center justify-center font-mono text-emerald-500 animate-pulse text-sm">
                Authenticating Biometric Cryptography...
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#040608] p-8 flex flex-col items-center justify-center text-center font-mono">
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                    <ShieldAlert size={64} className="text-rose-500 animate-pulse" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 border border-rose-500/30 bg-rose-500/10 px-3 py-1 rounded mb-4">
                    {t("clearance_badge")}
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest mb-2">
                    {t("clearance_denied_title")}
                </h1>
                <p className="text-gray-400 text-xs md:text-sm max-w-md leading-relaxed mb-8">
                    {t("clearance_denied_desc")}
                </p>
                <Link 
                    href="/" 
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                >
                    {t("btn_return_dashboard")}
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#040608] p-4 md:p-8 text-white font-sans selection:bg-emerald-500 selection:text-black">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Top Secret Classified Banner */}
                <div className="bg-[#090d12] border border-emerald-500/40 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                                    <Atom size={24} />
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase font-mono">
                                    {t("page_title")}
                                </h1>
                                <span className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                    <Zap size={10} className="text-emerald-400" />
                                    {t("clearance_badge")}
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs md:text-sm max-w-3xl leading-relaxed font-mono">
                                {t("page_subtitle")}
                            </p>
                        </div>

                        {/* Data Source Controls */}
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <button
                                onClick={() => {
                                    setRosterData(generateBenchmarkRoster());
                                    setDataSource("synthetic");
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                                    dataSource === "synthetic"
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                        : "bg-[#10161f] text-gray-400 border-[#1a2332] hover:text-white"
                                }`}
                            >
                                {t("load_sample_data")}
                            </button>

                            <div className="flex items-center gap-1.5 bg-[#10161f] border border-[#1a2332] rounded-xl p-1">
                                <input
                                    type="text"
                                    value={liveKd}
                                    onChange={e => setLiveKd(e.target.value)}
                                    placeholder="KD #"
                                    className="w-16 bg-transparent px-2 py-1 text-xs font-mono text-white focus:outline-none"
                                />
                                <button
                                    onClick={handleLoadLiveRoster}
                                    disabled={isLoadingLive}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black text-[11px] font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer"
                                >
                                    {isLoadingLive ? "Loading..." : "Load Live"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Operational Tabs */}
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#1a2332] overflow-x-auto pb-1">
                        {[
                            { id: "manifold", label: t("tab_manifold"), icon: Layers },
                            { id: "syndicate", label: t("tab_syndicate"), icon: Network },
                            { id: "benford", label: t("tab_benford"), icon: Activity },
                            { id: "lanchester", label: t("tab_lanchester"), icon: Flame },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                    activeTab === tab.id
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                            >
                                <tab.icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── MODULE 1: COMBAT DNA MANIFOLD (PCA + K-MEANS) ──────────────── */}
                {activeTab === "manifold" && manifold && (
                    <div className="space-y-6">
                        {/* Summary Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-[#090d12] border border-emerald-500/30 rounded-2xl p-4">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block mb-1">
                                    {t("archetype_martyr")}
                                </span>
                                <span className="text-2xl font-mono font-black text-white">
                                    {manifold.archetypeSummary.martyrs}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 block mt-1">
                                    {((manifold.archetypeSummary.martyrs / manifold.totalGovernors) * 100).toFixed(1)}% of Roster
                                </span>
                            </div>

                            <div className="bg-[#090d12] border border-rose-500/30 rounded-2xl p-4">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 block mb-1">
                                    {t("archetype_parasite")}
                                </span>
                                <span className="text-2xl font-mono font-black text-white">
                                    {manifold.archetypeSummary.parasites}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 block mt-1">
                                    {((manifold.archetypeSummary.parasites / manifold.totalGovernors) * 100).toFixed(1)}% of Roster
                                </span>
                            </div>

                            <div className="bg-[#090d12] border border-amber-500/30 rounded-2xl p-4">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block mb-1">
                                    {t("archetype_farmbot")}
                                </span>
                                <span className="text-2xl font-mono font-black text-white">
                                    {manifold.archetypeSummary.farmBots}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 block mt-1">
                                    {((manifold.archetypeSummary.farmBots / manifold.totalGovernors) * 100).toFixed(1)}% of Roster
                                </span>
                            </div>

                            <div className="bg-[#090d12] border border-cyan-500/30 rounded-2xl p-4">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block mb-1">
                                    {t("archetype_mercenary")}
                                </span>
                                <span className="text-2xl font-mono font-black text-white">
                                    {manifold.archetypeSummary.mercenaries}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 block mt-1">
                                    {((manifold.archetypeSummary.mercenaries / manifold.totalGovernors) * 100).toFixed(1)}% of Roster
                                </span>
                            </div>
                        </div>

                        {/* Interactive 2D PCA Scatter Grid */}
                        <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white">
                                        {t("manifold_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs font-mono mt-1">
                                        {t("manifold_desc")}
                                    </p>
                                </div>
                                <span className="text-[10px] font-mono text-gray-500">
                                    PC1: War & Sacrifice vs T1 • PC2: Power vs RSS Giving
                                </span>
                            </div>

                            {/* SVG Coordinate Manifold Canvas */}
                            <div className="relative w-full h-96 bg-[#040608] border border-[#1a2332] rounded-xl overflow-hidden flex items-center justify-center p-4">
                                {/* Axis Grid Lines */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-full h-px bg-white/10" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="h-full w-px bg-white/10" />
                                </div>

                                <svg className="w-full h-full" viewBox="-4 -4 8 8">
                                    {manifold.nodes.map(n => (
                                        <circle
                                            key={n.id}
                                            cx={n.pc1}
                                            cy={-n.pc2} // Flip Y for Cartesian
                                            r={selectedNode?.id === n.id ? 0.35 : 0.18}
                                            fill={n.archetype.color}
                                            fillOpacity={0.8}
                                            stroke={selectedNode?.id === n.id ? "#ffffff" : n.archetype.color}
                                            strokeWidth={selectedNode?.id === n.id ? 0.08 : 0.03}
                                            className="cursor-pointer transition-all duration-200 hover:scale-125"
                                            onClick={() => setSelectedNode(n)}
                                        />
                                    ))}
                                </svg>
                            </div>

                            {/* Selected Node Details Card */}
                            {selectedNode ? (
                                <div className="bg-[#10161f] border border-emerald-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-white">
                                                {selectedNode.name}
                                            </span>
                                            <span className="text-gray-500">
                                                [ID: {selectedNode.id}]
                                            </span>
                                            <span className={`px-2 py-0.5 rounded border text-[9px] ${selectedNode.archetype.badge}`}>
                                                {selectedNode.archetype.label}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-[11px]">
                                            {selectedNode.archetype.desc}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 flex-wrap text-right">
                                        <div>
                                            <span className="text-gray-500 text-[9px] block">POWER</span>
                                            <span className="text-white font-bold">{(selectedNode.power / 1e6).toFixed(1)}M</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-[9px] block">KILL POINTS</span>
                                            <span className="text-cyan-400 font-bold">{(selectedNode.killPoints / 1e6).toFixed(1)}M</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-[9px] block">T1 PADDING %</span>
                                            <span className={`font-bold ${selectedNode.t1Ratio > 60 ? "text-rose-400" : "text-emerald-400"}`}>
                                                {selectedNode.t1Ratio}%
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-[9px] block">DEATHS</span>
                                            <span className="text-amber-400 font-bold">{selectedNode.deads.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-[9px] block">EIGENVECTORS</span>
                                            <span className="text-gray-300">({selectedNode.pc1}, {selectedNode.pc2})</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center font-mono text-xs text-gray-500 p-2">
                                    Click any node on the manifold canvas to inspect their 7D combat tensor.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── MODULE 2: SYNDICATE NETWORK GRAPH ─────────────────────────── */}
                {activeTab === "syndicate" && syndicate && (
                    <div className="space-y-6">
                        {/* Syndicate High-Command Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                            <div className="bg-[#090d12] border border-cyan-500/30 rounded-2xl p-4">
                                <span className="text-[10px] uppercase tracking-widest text-cyan-400 block mb-1">
                                    {t("puppetmaster_label")}
                                </span>
                                <span className="text-xl font-black text-white">
                                    {syndicate.topPuppetmaster?.name}
                                </span>
                                <span className="text-[10px] text-gray-400 block mt-1">
                                    Eigenvector Centrality: {syndicate.topPuppetmaster?.centralityScore} / 100
                                </span>
                            </div>

                            <div className="bg-[#090d12] border border-rose-500/30 rounded-2xl p-4">
                                <span className="text-[10px] uppercase tracking-widest text-rose-400 block mb-1">
                                    {t("infiltrator_label")}
                                </span>
                                <span className="text-xl font-black text-rose-400">
                                    {syndicate.infiltratorCount} Isolated Nodes
                                </span>
                                <span className="text-[10px] text-gray-400 block mt-1">
                                    High Power with Zero Internal Alliance Ties (Spy Risk)
                                </span>
                            </div>

                            <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-4">
                                <span className="text-[10px] uppercase tracking-widest text-gray-400 block mb-1">
                                    Graph Topological Density
                                </span>
                                <span className="text-xl font-black text-emerald-400">
                                    {syndicate.edgeCount} Affinity Edges
                                </span>
                                <span className="text-[10px] text-gray-400 block mt-1">
                                    Across {syndicate.nodeCount} Total Governors
                                </span>
                            </div>
                        </div>

                        {/* Interactive Graph Canvas */}
                        <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white">
                                    {t("syndicate_title")}
                                </h2>
                                <span className="text-[10px] font-mono text-gray-500">
                                    Louvain Cluster Modularity & Co-Migration Bond Vectors
                                </span>
                            </div>

                            <div className="w-full h-96 bg-[#040608] border border-[#1a2332] rounded-xl relative overflow-hidden flex items-center justify-center p-4">
                                <svg className="w-full h-full" viewBox="0 0 800 500">
                                    {/* Draw Edges */}
                                    {syndicate.edges.slice(0, 80).map((e, idx) => {
                                        const sourceNode = syndicate.nodes.find(n => n.id === e.source);
                                        const targetNode = syndicate.nodes.find(n => n.id === e.target);
                                        if (!sourceNode || !targetNode) return null;
                                        
                                        // Compute visual coordinate in circle layout
                                        const i1 = syndicate.nodes.indexOf(sourceNode);
                                        const i2 = syndicate.nodes.indexOf(targetNode);
                                        const angle1 = (i1 / syndicate.nodes.length) * 2 * Math.PI;
                                        const angle2 = (i2 / syndicate.nodes.length) * 2 * Math.PI;
                                        
                                        const x1 = 400 + 220 * Math.cos(angle1);
                                        const y1 = 250 + 190 * Math.sin(angle1);
                                        const x2 = 400 + 220 * Math.cos(angle2);
                                        const y2 = 250 + 190 * Math.sin(angle2);

                                        return (
                                            <line
                                                key={idx}
                                                x1={x1}
                                                y1={y1}
                                                x2={x2}
                                                y2={y2}
                                                stroke="#06b6d4"
                                                strokeOpacity={0.25}
                                                strokeWidth={e.weight}
                                            />
                                        );
                                    })}

                                    {/* Draw Nodes */}
                                    {syndicate.nodes.map((n, idx) => {
                                        const angle = (idx / syndicate.nodes.length) * 2 * Math.PI;
                                        const cx = 400 + 220 * Math.cos(angle);
                                        const cy = 250 + 190 * Math.sin(angle);
                                        const isPuppet = n.id === syndicate.topPuppetmaster?.id;

                                        return (
                                            <g key={n.id} className="cursor-pointer" onClick={() => setSelectedNode(n)}>
                                                <circle
                                                    cx={cx}
                                                    cy={cy}
                                                    r={isPuppet ? 10 : (n.isInfiltratorRisk ? 7 : 4)}
                                                    fill={isPuppet ? "#10b981" : (n.isInfiltratorRisk ? "#f43f5e" : "#06b6d4")}
                                                    stroke="#ffffff"
                                                    strokeWidth={isPuppet ? 2 : 0.5}
                                                    className="transition-all hover:scale-150"
                                                />
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODULE 3: BENFORD'S LAW FRAUD DETECTOR ─────────────────────── */}
                {activeTab === "benford" && benford && (
                    <div className="space-y-6">
                        <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-6 space-y-4 font-mono">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                        {t("benford_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {t("benford_desc")}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-500 block">CHI-SQUARE STATISTIC</span>
                                    <span className={`text-xl font-black ${benford.isAnomalous ? "text-rose-400" : "text-emerald-400"}`}>
                                        χ² = {benford.chiSquare}
                                    </span>
                                </div>
                            </div>

                            {/* Verdict Alert */}
                            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                                benford.isAnomalous
                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            }`}>
                                <AlertTriangle size={18} />
                                <span className="text-xs font-bold uppercase">
                                    {benford.verdict}
                                </span>
                            </div>

                            {/* Side-by-Side Distribution Chart */}
                            <div className="space-y-2 pt-4">
                                <div className="text-[10px] uppercase text-gray-500 flex justify-between">
                                    <span>First Digit (1 to 9)</span>
                                    <span>Observed % (Cyan) vs Benford Theoretical % (Gray)</span>
                                </div>

                                <div className="space-y-2.5">
                                    {benford.distribution.map(d => (
                                        <div key={d.digit} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="font-bold text-white">Digit {d.digit}</span>
                                                <span className="text-gray-400">
                                                    Obs: <strong className="text-cyan-400">{d.observed}%</strong> | Exp: {d.expected}%
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-[#10161f] rounded-full overflow-hidden flex">
                                                <div 
                                                    className="h-full bg-cyan-400 rounded-full"
                                                    style={{ width: `${Math.min(100, d.observed * 2.5)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODULE 4: LANCHESTER COMBAT ATTRITION SIMULATOR ─────────────── */}
                {activeTab === "lanchester" && lanchester && (
                    <div className="space-y-6">
                        {/* Control Knobs Card */}
                        <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-6 space-y-4 font-mono">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold uppercase tracking-wider text-white">
                                        {t("lanchester_title")}
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {t("lanchester_desc")}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-500 block uppercase">
                                        {t("exhaustion_label")}
                                    </span>
                                    <span className="text-2xl font-black text-rose-400">
                                        {lanchester.exhaustionTimeHours} Hours
                                    </span>
                                </div>
                            </div>

                            {/* Sliders Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#1a2332]">
                                <div className="space-y-3">
                                    <span className="text-xs font-bold text-cyan-400 uppercase block">
                                        Kingdom A (Defenders / Pass Garrison)
                                    </span>
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>T5 Reserves Pool</span>
                                            <span className="text-white font-bold">{(kdAPool / 1e6).toFixed(1)}M</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="2000000"
                                            max="30000000"
                                            step="500000"
                                            value={kdAPool}
                                            onChange={e => setKdAPool(Number(e.target.value))}
                                            className="w-full accent-cyan-400 cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>Tech & Gear Multiplier</span>
                                            <span className="text-white font-bold">{kdABuff}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.80"
                                            max="1.50"
                                            step="0.05"
                                            value={kdABuff}
                                            onChange={e => setKdABuff(Number(e.target.value))}
                                            className="w-full accent-cyan-400 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <span className="text-xs font-bold text-rose-400 uppercase block">
                                        Kingdom B (Attackers / Swarm Rallies)
                                    </span>
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>T5 Reserves Pool</span>
                                            <span className="text-white font-bold">{(kdB_Pool / 1e6).toFixed(1)}M</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="2000000"
                                            max="30000000"
                                            step="500000"
                                            value={kdB_Pool}
                                            onChange={e => setKdB_Pool(Number(e.target.value))}
                                            className="w-full accent-rose-400 cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>Tech & Gear Multiplier</span>
                                            <span className="text-white font-bold">{kdB_Buff}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.80"
                                            max="1.50"
                                            step="0.05"
                                            value={kdB_Buff}
                                            onChange={e => setKdB_Buff(Number(e.target.value))}
                                            className="w-full accent-rose-400 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Simulation Results Display */}
                            <div className="bg-[#040608] border border-[#1a2332] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div>
                                    <span className="text-[10px] uppercase text-gray-500 block">SIMULATED WINNER</span>
                                    <span className="text-lg font-black text-emerald-400">
                                        {lanchester.winner}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-gray-500 block">EXCHANGE KILL RATIO</span>
                                    <span className="text-lg font-black text-cyan-400">
                                        {lanchester.exchangeRatio} : 1.00
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-gray-500 block">DEFEAT TIMESTAMP</span>
                                    <span className="text-lg font-black text-rose-400">
                                        {lanchester.exhaustionTimeHours} Hours
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
