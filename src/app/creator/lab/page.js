"use client";

import { useSession } from "next-auth/react";
import { FlaskConical, AlertTriangle, Code, Cpu, Crosshair } from "lucide-react";
import Link from "next/link";

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
                        </div>
                        <p className="text-gray-400 text-sm max-w-2xl font-medium tracking-wide">
                            Welcome to the Creator Studio. This is an isolated, unlinked route specifically designed to build and test new React components, UI layouts, and AWS pipelines before deploying them to the global Unity ecosystem.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-lg bg-[#13161c] border border-[#1e222b] flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Lab Online</span>
                        </div>
                    </div>
                </div>

                {/* Main Workspace Frame */}
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 min-h-[500px] flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                    
                    <div className="text-center z-10 flex flex-col items-center">
                    <div className="z-10 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {/* BOUNTY RADAR MODULE */}
                            <Link href="/creator/lab/radar" className="group">
                                <div className="h-full bg-[#13161c] border border-[#1e222b] hover:border-indigo-500/50 rounded-xl p-6 transition-all duration-300 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <Crosshair size={32} className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-lg font-bold text-gray-200 uppercase tracking-widest mb-2">Bounty Radar</h3>
                                    <p className="text-xs text-gray-500 font-mono">
                                        Query the autonomous computer vision bot's grid sweeps to locate governor coordinates on the world map.
                                    </p>
                                </div>
                            </Link>

                        </div>
                    </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
