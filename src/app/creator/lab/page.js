"use client";

import { useSession } from "next-auth/react";
import { FlaskConical, AlertTriangle, Crosshair, Ghost, Target, Dna, Trophy, Swords, Clock } from "lucide-react";
import Link from "next/link";

const TOOLS = [
    {
        href: "/creator/lab/radar",
        icon: Crosshair,
        color: "text-indigo-400",
        bg: "from-indigo-500/5",
        border: "group-hover:border-indigo-500/50",
        label: "Bounty Radar",
        desc: "Query the autonomous computer vision bot's grid sweeps to locate governor coordinates on the world map.",
        badge: null,
    },
    {
        href: "/creator/lab/ghost-hunter",
        icon: Ghost,
        color: "text-violet-400",
        bg: "from-violet-500/5",
        border: "group-hover:border-violet-500/50",
        label: "Ghost Hunter",
        desc: "Detect inactive governors with zero power & KP delta. Get a kingdom vitality grade and ranked dead weight list.",
        badge: "NEW",
    },
    {
        href: "/creator/lab/recruitment-hitlist",
        icon: Target,
        color: "text-amber-400",
        bg: "from-amber-500/5",
        border: "group-hover:border-amber-500/50",
        label: "Recruitment Hit List",
        desc: "Players who left your kingdom and are now growing fast elsewhere — ranked by growth rate with priority tiers.",
        badge: "NEW",
    },
    {
        href: "/creator/lab/spending-signature",
        icon: Dna,
        color: "text-indigo-400",
        bg: "from-indigo-500/5",
        border: "group-hover:border-indigo-500/50",
        label: "Spending Signature",
        desc: "Decode a kingdom's army DNA — classify every active governor by their dominant growth vector (tech/troop/cmdr/build).",
        badge: "NEW",
    },
    {
        href: "/creator/lab/hall-of-legends",
        icon: Trophy,
        color: "text-yellow-400",
        bg: "from-yellow-500/5",
        border: "group-hover:border-yellow-500/50",
        label: "Hall of Legends",
        desc: "The greatest governors across every tracked kingdom — cross-kingdom leaderboard ranked by power growth, kills, or deaths.",
        badge: "NEW",
    },
    {
        href: "/creator/lab/battle-predictor",
        icon: Swords,
        color: "text-rose-400",
        bg: "from-rose-500/5",
        border: "group-hover:border-rose-500/50",
        label: "Battle Predictor",
        desc: "Head-to-head combat strength comparison with radar chart, per-metric winner breakdown, and AI odds assessment.",
        badge: "NEW",
    },
    {
        href: "/creator/lab/timeline-replay",
        icon: Clock,
        color: "text-teal-400",
        bg: "from-teal-500/5",
        border: "group-hover:border-teal-500/50",
        label: "Timeline Replay",
        desc: "Scrub through every historical scan snapshot. Watch the roster evolve with rank change indicators in real-time.",
        badge: "NEW",
    },
];

export default function ExperimentalLab() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div className="min-h-screen bg-[#06080a] flex items-center justify-center text-indigo-500 font-mono animate-pulse">Initializing Lab Physics...</div>;
    }

    if (!session?.user?.isSuperAdmin) {
        return (
            <div className="min-h-screen bg-[#06080a] p-8 flex flex-col items-center justify-center">
                <AlertTriangle size={64} className="text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">Clearance Denied</h1>
                <p className="text-gray-400 font-mono text-sm max-w-md text-center">
                    The Creator Studio is a restricted namespace strictly reserved for Super Admins.
                </p>
                <Link href="/" className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-sm transition-colors">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#06080a] p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="bg-[#0f1115] border border-indigo-500/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
                                <FlaskConical size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-wider uppercase">Experimental Lab</h1>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 rounded">{TOOLS.length} Tools</span>
                        </div>
                        <p className="text-gray-400 text-sm max-w-2xl font-medium tracking-wide">
                            Isolated, unlinked research modules for building and testing new intelligence pipelines before deploying to the global Unity ecosystem.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-lg bg-[#13161c] border border-[#1e222b] flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Lab Online</span>
                        </div>
                    </div>
                </div>

                {/* Tools Grid */}
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                        {TOOLS.map(tool => (
                            <Link key={tool.href} href={tool.href} className="group">
                                <div className={`h-full bg-[#13161c] border border-[#1e222b] ${tool.border} rounded-xl p-6 transition-all duration-300 relative overflow-hidden`}>
                                    <div className={`absolute inset-0 bg-gradient-to-b ${tool.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                    <div className="flex items-start justify-between mb-4">
                                        <tool.icon size={32} className={`${tool.color} group-hover:scale-110 transition-transform`} />
                                        {tool.badge && (
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                tool.badge === "NEW" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-gray-500 border-gray-700 bg-gray-800"
                                            }`}>{tool.badge}</span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-200 uppercase tracking-widest mb-2">{tool.label}</h3>
                                    <p className="text-xs text-gray-500 font-mono leading-relaxed">{tool.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
