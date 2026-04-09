"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Target } from "lucide-react";
import SoCTab from "@/components/analysis/kingdom/SoCTab";

export default function KvkHub() {
    const { data: session } = useSession();
    
    // --- Kingdom Synchronization ---
    const [targetKd, setTargetKd] = useState("");
    
    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem("unty_active_kd");
        if (stored && stored !== targetKd) {
            setTargetKd(stored);
        }
    }, [session]);

    const handleKdUpdate = (newKd) => {
        setTargetKd(newKd);
        localStorage.setItem("unty_active_kd", newKd);
    };

    return (
        <div className="flex-1 lg:h-screen lg:overflow-y-auto w-full custom-scrollbar pt-16 md:pt-0">
            <div className="p-4 md:p-8 max-w-[1920px] mx-auto min-h-full pb-24">
                
                {/* Header Module */}
                <div className="flex justify-end mb-6">
                    <div className="flex items-center gap-3 bg-[#0a0c0f] p-2 rounded-xl border border-[#1e222b]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#6b7280] px-2 border-r border-[#1e222b]">
                            Target KD
                        </span>
                        <input
                            type="text"
                            value={targetKd}
                            onChange={(e) => handleKdUpdate(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            placeholder="e.g. 3155"
                            className="bg-transparent w-20 px-2 font-mono font-bold text-white text-sm outline-none shadow-none placeholder-[#4b5563]"
                            maxLength={4}
                        />
                    </div>
                </div>

                {/* Main Engine Render */}
                {targetKd ? (
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
