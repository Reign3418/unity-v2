"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Target, Map as MapIcon, Swords } from "lucide-react";
import SoCTab from "@/components/analysis/kingdom/SoCTab";
import KvkStoryAtlasPanel from "@/components/analysis/kingdom/KvkStoryAtlasPanel";

export default function KvkHub() {
    const { data: session } = useSession();
    const [activeView, setActiveView] = useState("SOC_COMMAND"); // "SOC_COMMAND" | "STORY_ATLAS"
    
    // --- Kingdom Synchronization ---
    const [targetKd, setTargetKd] = useState("4197");
    
    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem("valheon_active_kd") || localStorage.getItem("unty_active_kd") || "4197";
        const resolved = stored === "3155" ? "4197" : stored;
        if (resolved && resolved !== targetKd) {
            setTargetKd(resolved);
        }
    }, [session]);

    const handleKdUpdate = (newKd) => {
        setTargetKd(newKd);
        localStorage.setItem("unty_active_kd", newKd);
    };

    return (
        <div className="flex-1 lg:h-screen lg:overflow-y-auto w-full custom-scrollbar pt-16 md:pt-0">
            <div className="p-4 md:p-8 max-w-[1920px] mx-auto min-h-full pb-24">
                
                {/* Header Module with View Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center bg-[#0a0c0f] p-1.5 rounded-xl border border-[#1e222b]">
                        <button
                            onClick={() => setActiveView("SOC_COMMAND")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeView === "SOC_COMMAND"
                                    ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.45)]"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <Swords size={15} />
                            <span>⚔️ SoC Live War Command &amp; DKP</span>
                        </button>
                        <button
                            onClick={() => setActiveView("STORY_ATLAS")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeView === "STORY_ATLAS"
                                    ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.45)]"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            <MapIcon size={15} />
                            <span>🗺️ 13-Story SoC KvK Camp &amp; Opcode Atlas (S4–S21)</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 bg-[#0a0c0f] p-2 rounded-xl border border-[#1e222b] self-end sm:self-auto">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#6b7280] px-2 border-r border-[#1e222b]">
                            Target KD
                        </span>
                        <input
                            type="text"
                            value={targetKd}
                            onChange={(e) => handleKdUpdate(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            placeholder="e.g. 4197"
                            className="bg-transparent w-20 px-2 font-mono font-bold text-white text-sm outline-none shadow-none placeholder-[#4b5563]"
                            maxLength={4}
                        />
                    </div>
                </div>

                {/* Main Engine Render */}
                {activeView === "STORY_ATLAS" ? (
                    <KvkStoryAtlasPanel />
                ) : targetKd ? (
                    <SoCTab targetKd={targetKd} />
                ) : (
                    <div className="py-24 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                        <Target className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-bold text-slate-300">Awaiting Target Parameters</h4>
                        <p className="text-slate-500 text-sm mt-1">Designate an active Subject Kingdom above to initialize operational feeds.</p>
                    </div>
                )}
                
            </div>
        </div>
    );
}
