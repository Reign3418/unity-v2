"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { 
    Atom, ShieldAlert, Terminal, Lock, Sparkles, RefreshCw, 
    Layers, Cpu, Activity, Skull, Zap, ChevronRight, Eye, 
    AlertTriangle, CheckCircle2, TrendingDown, Users, Flame,
    Network, Compass, Filter, Info, Orbit
} from "lucide-react";
import { 
    computeCombatDnaManifold, 
    computeSyndicateGraph, 
    testBenfordsLaw, 
    simulateLanchesterBattle,
    compute5DGalacticManifold,
    extractGovernorMetrics,
    BENFORD_THEORETICAL
} from "@/lib/cerberusIntelligence";
import CerberusGalaxyCanvas from "@/components/cerberus/CerberusGalaxyCanvas";

// ============================================================================
// REALISTIC ORGANIC BENCHMARK GENERATOR (100 NODES, NO DIGIT/SCALE BIAS)
// ============================================================================
function generateBalancedBenchmarkRoster() {
    const roster = [];
    const alliances = ["3418_WAR", "3418_ELITE", "3418_VET", "FARM_CLAN"];

    for (let i = 1; i <= 100; i++) {
        // Natural power distribution (25M to 95M)
        const powerBase = 25_000_000 + Math.floor(Math.pow(Math.random(), 1.5) * 70_000_000);
        const alliance = i <= 6 ? "3418_WAR" : alliances[i % alliances.length];

        let t1 = 0, t4 = 0, t5 = 0, deads = 0, kp = 0, rssAssisted = 0, helps = 0;

        if (i <= 20) {
            // Frontline Blood Martyrs (High war kills, high deads, high assists)
            t4 = Math.floor(powerBase * (0.20 + Math.random() * 0.15));
            t5 = Math.floor(powerBase * (0.25 + Math.random() * 0.20));
            t1 = Math.floor(powerBase * (0.01 + Math.random() * 0.03));
            deads = Math.floor(powerBase * (0.035 + Math.random() * 0.03));
            rssAssisted = Math.floor(powerBase * (10 + Math.random() * 15));
            helps = 10_000 + Math.floor(Math.random() * 15_000);
        } else if (i <= 40) {
            // Parasitic Whales (High power, 70%+ T1 duels, low deads, greedy assists)
            t1 = Math.floor(powerBase * (0.70 + Math.random() * 0.30));
            t4 = Math.floor(powerBase * (0.02 + Math.random() * 0.03));
            t5 = Math.floor(powerBase * (0.01 + Math.random() * 0.02));
            deads = Math.floor(powerBase * (0.001 + Math.random() * 0.003)); // Near zero deads
            rssAssisted = Math.floor(powerBase * (0.05 + Math.random() * 0.1));
            helps = 1_000 + Math.floor(Math.random() * 1_500);
        } else if (i <= 65) {
            // Automated Gatherers / Inactive Farms (Low kills, minimal deads)
            t1 = Math.floor(10_000 + Math.random() * 50_000);
            t4 = 0;
            t5 = 0;
            deads = Math.floor(200 + Math.random() * 1_000);
            rssAssisted = Math.floor(500_000 + Math.random() * 2_000_000);
            helps = 300 + Math.floor(Math.random() * 500);
        } else {
            // Tactical Mercenaries (High KvK T5 kills, moderate deads)
            t4 = Math.floor(powerBase * (0.15 + Math.random() * 0.10));
            t5 = Math.floor(powerBase * (0.30 + Math.random() * 0.25));
            t1 = Math.floor(powerBase * (0.02 + Math.random() * 0.04));
            deads = Math.floor(powerBase * (0.012 + Math.random() * 0.015));
            rssAssisted = Math.floor(powerBase * (1.0 + Math.random() * 2.0));
            helps = 4_000 + Math.floor(Math.random() * 3_000);
        }

        kp = (t1 * 1) + (t4 * 10) + (t5 * 20);

        roster.push({
            id: 10000000 + i * 18741,
            name: i === 1 ? "Syndicate_Alpha" : (i <= 20 ? `Vanguard_${i}` : (i <= 40 ? `PaddedWhale_${i}` : `Governor_${i}`)),
            alliance,
            power: powerBase,
            t1Kills: t1,
            t4Kills: t4,
            t5Kills: t5,
            deads,
            killPoints: kp,
            rssAssisted,
            helps,
        });
    }

    // Two isolated high-power nodes (Spy/Infiltrator profiles)
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

export default function ProjectCerberusPage() {
    const t = useTranslations("ProjectCerberus");
    const { data: session, status } = useSession();

    const [activeTab, setActiveTab] = useState("galaxy"); // 'galaxy' | 'manifold' | 'syndicate' | 'benford' | 'lanchester'
    const [rosterData, setRosterData] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [dataSource, setDataSource] = useState("synthetic"); // 'synthetic' | 'live'
    const [liveKd, setLiveKd] = useState("3155");
    const [isLoadingLive, setIsLoadingLive] = useState(false);
    const [benfordMetric, setBenfordMetric] = useState("combat"); // 'combat' | 'all'

    // Lanchester battle simulation inputs
    const [kdAPool, setKdAPool] = useState(12_000_000);
    const [kdB_Pool, setKdB_Pool] = useState(10_000_000);
    const [kdABuff, setKdABuff] = useState(1.15);
    const [kdB_Buff, setKdB_Buff] = useState(1.00);

    // Initial load
    useEffect(() => {
        setRosterData(generateBalancedBenchmarkRoster());
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
        if (!liveKd.trim()) return;
        setIsLoadingLive(true);
        try {
            const res = await fetch(`/api/aws/roster?kd=${liveKd.trim()}`);
            const data = await res.json();
            if (data?.roster && data.roster.length > 0) {
                setRosterData(data.roster);
                setDataSource("live");
            } else {
                alert(`No live scan data found for Kingdom ${liveKd}. Keeping current roster.`);
            }
        } catch {
            alert("Error fetching live roster.");
        } finally {
            setIsLoadingLive(false);
        }
    };

    // 0. 5D Astrodynamic Galaxy Manifold
    const galaxy = useMemo(() => {
        return compute5DGalacticManifold(rosterData);
    }, [rosterData]);

    // 1. Manifold Computation (PCA + K-Means)
    const manifold = useMemo(() => {
        return computeCombatDnaManifold(rosterData);
    }, [rosterData]);

    // Dynamic SVG bounds for Manifold scatter
    const manifoldBounds = useMemo(() => {
        if (!manifold?.nodes?.length) return { minX: -3, maxX: 3, minY: -3, maxY: 3 };
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        manifold.nodes.forEach(n => {
            if (n.pc1 < minX) minX = n.pc1;
            if (n.pc1 > maxX) maxX = n.pc1;
            if (n.pc2 < minY) minY = n.pc2;
            if (n.pc2 > maxY) maxY = n.pc2;
        });
        const padX = Math.max(0.5, (maxX - minX) * 0.15);
        const padY = Math.max(0.5, (maxY - minY) * 0.15);
        return {
            minX: minX - padX,
            maxX: maxX + padX,
            minY: minY - padY,
            maxY: maxY + padY,
        };
    }, [manifold]);

    // 2. Syndicate Network Graph
    const syndicate = useMemo(() => {
        return computeSyndicateGraph(rosterData);
    }, [rosterData]);

    // 3. Scale-Invariant Benford's Law Fraud Forensics
    const benford = useMemo(() => {
        if (!rosterData || rosterData.length === 0) return null;
        const parsed = rosterData.map((g, i) => extractGovernorMetrics(g, i + 1));
        let numbers = [];
        if (benfordMetric === "combat") {
            // Granular combat casualties (Scale-invariant, true natural distribution)
            numbers = parsed.flatMap(p => [
                p.t1Kills,
                p.t4Kills,
                p.t5Kills,
                p.deads,
                p.killPoints,
                p.rssAssisted,
                p.gathered,
                p.helps,
            ]).filter(n => n && n > 0);
        } else {
            // Complete transactional field tensor
            numbers = parsed.flatMap(p => [
                p.power,
                p.t1Kills,
                p.t4Kills,
                p.t5Kills,
                p.deads,
                p.killPoints,
                p.rssAssisted,
                p.gathered,
                p.helps,
            ]).filter(n => n && n > 0);
        }
        return testBenfordsLaw(numbers);
    }, [rosterData, benfordMetric]);

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

                {/* Project Cerberus Classified Banner */}
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
                                    setRosterData(generateBalancedBenchmarkRoster());
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
                            { id: "galaxy", label: t("tab_galaxy"), icon: Orbit },
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

                {/* ── MODULE 0: 5D ASTRODYNAMIC GALAXY MANIFOLD ──────────────── */}
                {activeTab === "galaxy" && galaxy && (
                    <div className="space-y-6">
                        <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-6 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                        <Orbit size={18} className="text-cyan-400" />
                                        <span>{t("galaxy_title")}</span>
                                    </h2>
                                    <p className="text-gray-400 text-xs font-mono mt-1 max-w-4xl leading-relaxed">
                                        {t("galaxy_desc")}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] font-mono text-gray-500 block uppercase">
                                        DIMENSIONAL TENSOR
                                    </span>
                                    <span className="text-sm font-mono font-black text-cyan-400">
                                        5D ASTRODYNAMICS
                                    </span>
                                </div>
                            </div>
                        </div>

                        <CerberusGalaxyCanvas 
                            key={dataSource + '_' + (dataSource === 'live' ? liveKd : 'syn')} 
                            galaxyData={galaxy} 
                        />
                    </div>
                )}

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
                                    {((manifold.archetypeSummary.martyrs / manifold.totalGovernors) * 100).toFixed(1)}% of Roster ({manifold.totalGovernors} total)
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
                                    Active Dataset: {dataSource === "live" ? `Live Kingdom ${liveKd}` : "100-Node Benchmark"} • Scale: Log10 Z-Score
                                </span>
                            </div>

                            {/* Dynamic SVG Coordinate Manifold Canvas */}
                            <div className="relative w-full h-[420px] bg-[#040608] border border-[#1a2332] rounded-xl overflow-hidden flex items-center justify-center p-4">
                                <svg 
                                    className="w-full h-full" 
                                    viewBox={`${manifoldBounds.minX} ${-manifoldBounds.maxY} ${manifoldBounds.maxX - manifoldBounds.minX} ${manifoldBounds.maxY - manifoldBounds.minY}`}
                                >
                                    {/* Axis Grid Lines */}
                                    <line 
                                        x1={manifoldBounds.minX} y1="0" x2={manifoldBounds.maxX} y2="0" 
                                        stroke="rgba(255,255,255,0.08)" strokeWidth="0.03" strokeDasharray="0.1 0.1" 
                                    />
                                    <line 
                                        x1="0" y1={-manifoldBounds.maxY} x2="0" y2={-manifoldBounds.minY} 
                                        stroke="rgba(255,255,255,0.08)" strokeWidth="0.03" strokeDasharray="0.1 0.1" 
                                    />

                                    {/* Plotted Nodes */}
                                    {manifold.nodes.map(n => {
                                        const isSelected = selectedNode?.id === n.id;
                                        return (
                                            <g key={n.id} className="cursor-pointer" onClick={() => setSelectedNode(n)}>
                                                <circle
                                                    cx={n.pc1}
                                                    cy={-n.pc2} // Invert Y for Cartesian
                                                    r={isSelected ? 0.22 : 0.11}
                                                    fill={n.archetype.color}
                                                    fillOpacity={0.85}
                                                    stroke={isSelected ? "#ffffff" : n.archetype.color}
                                                    strokeWidth={isSelected ? 0.05 : 0.015}
                                                    className="transition-all hover:scale-125"
                                                />
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>

                            {/* Selected Node Details Card */}
                            {selectedNode ? (
                                <div className="bg-[#10161f] border border-emerald-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-sm font-bold text-white">
                                                {selectedNode.name}
                                            </span>
                                            <span className="text-gray-500">
                                                [ID: {selectedNode.id}]
                                            </span>
                                            <span className="text-gray-400">
                                                Alliance: {selectedNode.alliance || "None"}
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
                                    Evaluated Core: Top {syndicate.nodeCount} Leaders & Anchors
                                </span>
                            </div>
                        </div>

                        {/* Interactive Graph Canvas (Pruned, High-Affinity) */}
                        <div className="bg-[#090d12] border border-[#1a2332] rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white">
                                    {t("syndicate_title")}
                                </h2>
                                <span className="text-[10px] font-mono text-gray-500">
                                    Pruned Significant Affinity Links (No 26,000-edge Hairball)
                                </span>
                            </div>

                            <div className="w-full h-[420px] bg-[#040608] border border-[#1a2332] rounded-xl relative overflow-hidden flex items-center justify-center p-4">
                                <svg className="w-full h-full" viewBox="0 0 800 500">
                                    {/* Draw Edges */}
                                    {syndicate.edges.map((e, idx) => {
                                        const sourceNode = syndicate.nodes.find(n => n.id === e.source);
                                        const targetNode = syndicate.nodes.find(n => n.id === e.target);
                                        if (!sourceNode || !targetNode) return null;
                                        
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
                                                strokeOpacity={0.35}
                                                strokeWidth={1.5}
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
                                                    r={isPuppet ? 9 : (n.isInfiltratorRisk ? 7 : 4.5)}
                                                    fill={isPuppet ? "#10b981" : (n.isInfiltratorRisk ? "#f43f5e" : "#06b6d4")}
                                                    stroke="#ffffff"
                                                    strokeWidth={isPuppet ? 2 : (n.isInfiltratorRisk ? 1.5 : 0.5)}
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
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 bg-[#10161f] border border-[#1a2332] rounded-lg p-1 text-[11px]">
                                        <button
                                            onClick={() => setBenfordMetric("combat")}
                                            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                                                benfordMetric === "combat" ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            Combat Casualties (Scale-Invariant)
                                        </button>
                                        <button
                                            onClick={() => setBenfordMetric("all")}
                                            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                                                benfordMetric === "all" ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            All Metrics (Includes Power)
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-500 block">CHI-SQUARE</span>
                                        <span className={`text-xl font-black ${benford.isAnomalous ? "text-rose-400" : "text-emerald-400"}`}>
                                            χ² = {benford.chiSquare}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Truncation explanation note */}
                            {benfordMetric === "all" && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
                                    <Info size={16} className="shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Scale Note:</strong> Raw governor power in top-1000 rosters is bounded between 20M and 99M, artificially inflating boundary digits (like 9 and 1). Switching to <em>Combat Casualties</em> tests pure transactional volume across multiple orders of magnitude.
                                    </span>
                                </div>
                            )}

                            {/* Verdict Alert */}
                            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                                benford.isAnomalous
                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            }`}>
                                <AlertTriangle size={18} />
                                <span className="text-xs font-bold uppercase">
                                    {benford.verdict} (Sample: {benford.sampleSize} data points)
                                </span>
                            </div>

                            {/* Side-by-Side Distribution Chart */}
                            <div className="space-y-2 pt-4">
                                <div className="text-[10px] uppercase text-gray-500 flex justify-between">
                                    <span>First Digit (1 to 9)</span>
                                    <span>Observed % (Cyan) vs Benford Theoretical % (Gray Outline)</span>
                                </div>

                                <div className="space-y-3">
                                    {benford.distribution.map(d => (
                                        <div key={d.digit} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="font-bold text-white">Digit {d.digit}</span>
                                                <span className="text-gray-400">
                                                    Obs: <strong className="text-cyan-400">{d.observed}%</strong> | Exp: {d.expected}% | Var: {d.variance > 0 ? `+${d.variance}%` : `${d.variance}%`}
                                                </span>
                                            </div>
                                            <div className="w-full h-3.5 bg-[#10161f] rounded-full overflow-hidden flex relative">
                                                {/* Theoretical target marker */}
                                                <div 
                                                    className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                                                    style={{ left: `${Math.min(100, d.expected * 2.5)}%` }}
                                                />
                                                {/* Observed fill */}
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        Math.abs(d.variance) > 5 ? "bg-rose-400" : "bg-cyan-400"
                                                    }`}
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
