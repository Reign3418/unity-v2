"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Crosshair, Map as MapIcon, ShieldAlert, Activity, Navigation } from "lucide-react";

export default function BountyRadar() {
    const { data: session } = useSession();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [offline, setOffline] = useState(false);

    // Initial load checks if DB is present
    useEffect(() => {
        fetch("/api/aws/radar")
            .then(r => r.json())
            .then(data => {
                if (!data.success) {
                    setOffline(true);
                }
            })
            .catch(() => setOffline(true));
    }, []);

    const executePing = async (e) => {
        e?.preventDefault();
        if (!query) return;

        setIsScanning(true);
        try {
            const res = await fetch(`/api/aws/radar?q=${encodeURIComponent(query)}`);
            const json = await res.json();
            if (json.success) {
                setResults(json.data);
                setOffline(false);
            } else {
                setResults([]);
                setOffline(true);
            }
        } catch (e) {
            console.error(e);
            setOffline(true);
        } finally {
            setIsScanning(false);
        }
    };

    if (!session?.user?.isSuperAdmin) return null;

    return (
        <div className="min-h-screen bg-[#06080a] p-8 pb-32 font-mono">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                
                {/* HUD Header */}
                <div className="bg-[#0f1115] border border-cyan-500/30 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(6,182,212,0.1)_0%,transparent_50%)] pointer-events-none"></div>
                    
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="bg-cyan-500/20 p-3 rounded-lg text-cyan-400">
                            <Crosshair size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase">Bounty Radar</h1>
                            <p className="text-cyan-500/70 text-sm tracking-widest uppercase">Target Acquisition & Coordinate Matrix</p>
                        </div>
                    </div>
                </div>

                {offline && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
                        <ShieldAlert size={20} />
                        <span>The Autonomous Computer Vision system is currently offline. Launch the <code>radar.py</code> script.</span>
                    </div>
                )}

                {/* Search Console */}
                <form onSubmit={executePing} className="relative group">
                    <input 
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ENTER GOVERNOR ALIAS OR ALLIANCE TAG..."
                        className="w-full bg-[#0a0c0f] border-2 border-[#1e222b] focus:border-cyan-500/80 text-white p-6 rounded-xl font-mono text-xl tracking-widest transition-all outline-none placeholder:text-gray-700 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] uppercase"
                    />
                    <button 
                        type="submit"
                        disabled={isScanning || !query}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white px-8 py-3 rounded-lg font-bold tracking-widest uppercase transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isScanning ? <Activity className="animate-pulse" size={18} /> : <MapIcon size={18} />}
                        {isScanning ? 'PINGING...' : 'PING MAP'}
                    </button>
                </form>

                {/* Results Matrix */}
                {results.length > 0 && (
                    <div className="space-y-4">
                        <div className="text-xs font-bold text-gray-500 tracking-widest mb-4">
                            [{results.length}] TRACKING SIGNATURES DETECTED
                        </div>

                        {results.map((target, i) => (
                            <div key={i} className="bg-[#13161c] border border-[#1e222b] hover:border-cyan-500/50 rounded-xl p-6 transition-colors shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                    <Crosshair size={64} className="text-cyan-500 rotate-45" />
                                </div>
                                
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-cyan-500/10 rounded-full border border-cyan-500/30 flex items-center justify-center">
                                            <Navigation size={20} className="text-cyan-400 rotate-45" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-white tracking-wider">
                                                <span className="text-cyan-500 mr-2">[{target.alliance}]</span>
                                                {target.name}
                                            </div>
                                            <div className="text-xs text-gray-500 tracking-widest mt-1">
                                                TARGET CLASSIFICATION 1-A
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#0a0c0f] border border-[#1e222b] px-8 py-4 rounded-lg flex flex-col items-center">
                                        <div className="text-xs text-gray-500 font-bold tracking-[0.2em] mb-1">LAST SEEN IN GRID</div>
                                        <div className="text-3xl font-black text-white font-mono tracking-widest text-shadow-glow">
                                            {target.radar_quadrant.replace('SEC_', 'SEC: ')}
                                        </div>
                                        <div className="text-[10px] text-gray-600 tracking-widest uppercase mt-2">
                                            {new Date(target.timestamp * 1000).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {query && results.length === 0 && !isScanning && !offline && (
                    <div className="text-center py-12 text-gray-500 tracking-widest uppercase">
                        ZERO TRACKING SIGNATURES FOUND FOR "{query}"
                    </div>
                )}
            </div>
        </div>
    );
}
