"use client";
import { useState, useEffect } from "react";
import { Clock, RefreshCw, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

export default function TimelineReplay() {
    const [kd, setKd] = useState("");
    const [dates, setDates] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [roster, setRoster] = useState([]);
    const [prevRoster, setPrevRoster] = useState({});
    const [loadingDates, setLoadingDates] = useState(false);
    const [loadingSnap, setLoadingSnap] = useState(false);
    const [error, setError] = useState(null);
    const [playing, setPlaying] = useState(false);

    // Load date index for kingdom
    const loadDates = async () => {
        if (!kd.trim()) return;
        setLoadingDates(true); setError(null); setDates([]); setRoster([]); setPrevRoster({});
        try {
            const res = await fetch(`/api/lab/timeline-replay?kd=${kd}&mode=dates`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setDates(json.dates || []);
            setCurrentIdx(0);
        } catch (e) { setError(e.message); }
        finally { setLoadingDates(false); }
    };

    // Load a specific snapshot
    const loadSnapshot = async (idx) => {
        const d = dates[idx];
        if (!d) return;
        setLoadingSnap(true);
        // Save previous for rank change tracking
        const prevMap = {};
        roster.forEach(p => { prevMap[p.id] = p.rank; });
        setPrevRoster(prevMap);
        try {
            const res = await fetch(`/api/lab/timeline-replay?kd=${kd}&mode=snapshot&dateKey=${encodeURIComponent(d.dateKey)}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setRoster(json.roster || []);
        } catch (e) { setError(e.message); }
        finally { setLoadingSnap(false); }
    };

    useEffect(() => {
        if (dates.length && currentIdx >= 0) loadSnapshot(currentIdx);
    }, [currentIdx, dates]);

    // Auto-play
    useEffect(() => {
        if (!playing) return;
        const iv = setInterval(() => {
            setCurrentIdx(i => {
                if (i >= dates.length - 1) { setPlaying(false); return i; }
                return i + 1;
            });
        }, 1500);
        return () => clearInterval(iv);
    }, [playing, dates.length]);

    const currentDate = dates[currentIdx];

    return (
        <div className="min-h-screen bg-[#06080a] p-6 text-white font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-xl"><Clock size={22} className="text-teal-400"/></div>
                    <h1 className="text-2xl font-black tracking-tight">Kingdom Timeline Replay</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 rounded">Lab</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Scrub through every historical scan. Watch the roster evolve, ranks shift, and governors rise and fall.</p>

                {/* Kingdom Input */}
                <div className="flex gap-3 mb-6">
                    <input value={kd} onChange={e => setKd(e.target.value)} onKeyDown={e => e.key === "Enter" && loadDates()} placeholder="Kingdom ID" className="bg-[#0f1115] border border-[#1e222b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 w-52"/>
                    <button onClick={loadDates} disabled={loadingDates || !kd} className="px-5 py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded-xl text-sm font-black flex items-center gap-2 transition-all">
                        {loadingDates ? <RefreshCw size={14} className="animate-spin"/> : <Clock size={14}/>} Load History
                    </button>
                </div>

                {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm mb-6">{error}</div>}

                {dates.length > 0 && (
                    <>
                        {/* Timeline Scrubber */}
                        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-teal-400 font-bold">{currentDate?.scanDate || "..."}</div>
                                    <div className="text-gray-500 text-xs">{dates.length} scans · Snapshot {currentIdx + 1} of {dates.length}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0 || loadingSnap} className="p-2 bg-[#1e222b] hover:bg-[#2a2f3a] rounded-lg transition-colors disabled:opacity-30"><ChevronLeft size={16}/></button>
                                    <button onClick={() => setPlaying(p => !p)} disabled={loadingSnap} className={`p-2 rounded-lg transition-colors ${playing ? "bg-rose-500/20 text-rose-400" : "bg-teal-500/20 text-teal-400"}`}>
                                        {playing ? <Pause size={16}/> : <Play size={16}/>}
                                    </button>
                                    <button onClick={() => setCurrentIdx(i => Math.min(dates.length - 1, i + 1))} disabled={currentIdx === dates.length - 1 || loadingSnap} className="p-2 bg-[#1e222b] hover:bg-[#2a2f3a] rounded-lg transition-colors disabled:opacity-30"><ChevronRight size={16}/></button>
                                </div>
                            </div>
                            {/* Scrubber Bar */}
                            <input type="range" min={0} max={dates.length - 1} value={currentIdx} onChange={e => setCurrentIdx(Number(e.target.value))}
                                className="w-full accent-teal-500" style={{ height: 6 }}/>
                            {/* Date tick marks */}
                            <div className="flex justify-between mt-1 text-[9px] text-gray-700 font-mono">
                                <span>{dates[0]?.scanDate?.slice(0, 10)}</span>
                                <span>{dates[Math.floor(dates.length / 2)]?.scanDate?.slice(0, 10)}</span>
                                <span>{dates[dates.length - 1]?.scanDate?.slice(0, 10)}</span>
                            </div>
                        </div>

                        {/* Roster Table */}
                        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Kingdom Roster — {currentDate?.scanDate}</h3>
                                {loadingSnap && <RefreshCw size={14} className="animate-spin text-teal-400"/>}
                                <span className="text-gray-600 text-xs">{roster.length} governors</span>
                            </div>
                            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-[#0a0c0f]"><tr className="border-b border-[#1e222b] text-gray-600 text-xs uppercase">
                                        <th className="px-4 py-3 text-left">Rank</th>
                                        <th className="px-4 py-3 text-left">Governor</th>
                                        <th className="px-4 py-3 text-right">Power</th>
                                        <th className="px-4 py-3 text-right">Kill Points</th>
                                        <th className="px-4 py-3 text-right">Deads</th>
                                        <th className="px-4 py-3 text-right">Δ Rank</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-[#1e222b]">
                                        {roster.slice(0, 100).map((p) => {
                                            const prevRank = prevRoster[p.id];
                                            const delta = prevRank ? prevRank - p.rank : null;
                                            return (
                                                <tr key={p.id} className="hover:bg-[#0f1115] transition-colors">
                                                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">#{p.rank}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="text-white font-bold text-sm">{p.name}</div>
                                                        <div className="text-gray-600 text-xs font-mono">{p.id}</div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-gray-300 font-mono text-xs">{(p.power / 1e9).toFixed(2)}B</td>
                                                    <td className="px-4 py-2.5 text-right text-amber-400 font-mono text-xs">{(p.killPoints / 1e6).toFixed(0)}M</td>
                                                    <td className="px-4 py-2.5 text-right text-rose-400 font-mono text-xs">{(p.deads / 1e3).toFixed(0)}K</td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-xs">
                                                        {delta === null ? <span className="text-gray-600">NEW</span> :
                                                            delta > 0 ? <span className="text-emerald-400">▲{delta}</span> :
                                                            delta < 0 ? <span className="text-rose-400">▼{Math.abs(delta)}</span> :
                                                            <span className="text-gray-600">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
