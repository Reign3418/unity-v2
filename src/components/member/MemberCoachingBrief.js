'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, RefreshCw, RotateCcw, Link2, Settings, ChevronRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

// ─────────────────────────────────────────────────────────────────────────────
// Grading engine (identical to GrowthAnalysisTab — shared math, consistent grades)
// ─────────────────────────────────────────────────────────────────────────────
function computeGrowthData(behavioralRoster, kingdomState = 'Peace') {
    if (!behavioralRoster || behavioralRoster.length === 0) return [];
    const valid = behavioralRoster.filter(g => g.powerEnd > 0);
    const pct = (arr, fn, p = 0.95) => {
        const vals = arr.map(fn).sort((a, b) => a - b);
        if (!vals.length) return 1;
        return vals[Math.floor(vals.length * p)] || vals[vals.length - 1] || 1;
    };
    const maxKP    = Math.max(1, pct(valid, g => g.kpDiff));
    const maxDeads = Math.max(1, pct(valid, g => g.deadsDiff));
    const maxTech  = Math.max(1, pct(valid, g => g.techPowerDiff));
    const maxBld   = Math.max(1, pct(valid, g => g.bldPowerDiff));
    const maxTroop = Math.max(1, pct(valid, g => g.troopPowerDiff));
    const maxFarm  = Math.max(1, pct(valid, g => g.gatheredDiff));
    const W = kingdomState === 'Peace'
        ? { TECH: 32, BLD: 30, TROOP: 28, KP: 0, DEADS: 0, FARM: 10 }
        : { TECH: 25, BLD: 25, TROOP: 25, KP: 12, DEADS: 8, FARM: 5 };
    const CAP = 1.25;
    const grade = s => s >= 80 ? 'S' : s >= 60 ? 'A' : s >= 40 ? 'B' : s >= 20 ? 'C' : 'D';
    const arch  = (p, mxKP, mxD, mxF) => {
        if (p.kpDiff > mxKP * 0.4 && p.deadsDiff > mxD * 0.4) return 'Warrior';
        if (p.kpDiff > mxKP * 0.4)    return 'Brawler';
        if (p.deadsDiff > mxD * 0.4)  return 'Meatshield';
        if (p.gatheredDiff > mxF * 0.5) return 'Harvester';
        if (p.powerDiff > 0)           return 'Grower';
        return 'Casual';
    };
    return valid.map(p => {
        const s = Math.max(0, Math.min(100,
            Math.min(CAP, Math.max(0, p.techPowerDiff) / maxTech) * W.TECH +
            Math.min(CAP, Math.max(0, p.bldPowerDiff) / maxBld) * W.BLD +
            Math.min(CAP, Math.max(0, p.troopPowerDiff) / maxTroop) * W.TROOP +
            Math.min(CAP, Math.max(0, p.kpDiff) / maxKP) * W.KP +
            Math.min(CAP, Math.max(0, p.deadsDiff) / maxDeads) * W.DEADS +
            Math.min(CAP, Math.max(0, p.gatheredDiff) / maxFarm) * W.FARM
        ));
        return { ...p, finalScore: s, grade: grade(s), archetype: arch(p, maxKP * 1.5, maxDeads * 1.5, maxFarm * 1.5) };
    }).sort((a, b) => b.finalScore - a.finalScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const GRADE = {
    S: { color: 'text-amber-400',   border: 'border-amber-400/40',   bg: 'bg-amber-400/5',   glow: 'shadow-[0_0_40px_rgba(251,191,36,0.15)]',   label: 'S-Tier — Gods' },
    A: { color: 'text-emerald-400', border: 'border-emerald-400/40', bg: 'bg-emerald-400/5', glow: 'shadow-[0_0_40px_rgba(52,211,153,0.15)]',    label: 'A-Tier — Elite' },
    B: { color: 'text-blue-400',    border: 'border-blue-400/40',    bg: 'bg-blue-400/5',    glow: '',                                            label: 'B-Tier — Vanguard' },
    C: { color: 'text-orange-400',  border: 'border-orange-400/40',  bg: 'bg-orange-400/5',  glow: '',                                            label: 'C-Tier — Reserve' },
    D: { color: 'text-red-500',     border: 'border-red-500/40',     bg: 'bg-red-500/5',     glow: '',                                            label: 'D-Tier — Review' },
};
const ARCH = {
    Warrior:    { icon: '⚔️', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    Brawler:    { icon: '🥊', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    Meatshield: { icon: '🛡️', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
    Harvester:  { icon: '🌾', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
    Grower:     { icon: '📈', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    Casual:     { icon: '😴', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
};

const fmtNum = (n) => {
    if (!n && n !== 0) return '0';
    const abs = Math.abs(n), sign = n >= 0 ? '+' : '-';
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`;
    return `${sign}${abs}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function MemberCoachingBrief({ govId, kingdomId, session }) {
    const locale = useLocale();
    const router = useRouter();

    // phase: idle | fetching | coaching | streaming | done | error | no-gov | no-data
    const [phase, setPhase]           = useState('idle');
    const [myEntry, setMyEntry]       = useState(null);
    const [peerAvg, setPeerAvg]       = useState(null);
    const [kingdomRank, setKingdomRank] = useState(null);
    const [kingdomTotal, setKingdomTotal] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [showCursor, setShowCursor] = useState(false);
    const [dateRange, setDateRange]   = useState('');
    const [errorText, setErrorText]   = useState('');
    const streamRef                   = useRef(null);
    const fullTextRef                 = useRef('');

    const extractDate = d => d ? d.split('T')[0].split(' ')[0].split('_')[0] : '';

    // ── Typewriter reveal ────────────────────────────────────────────────────
    const startStream = (text) => {
        fullTextRef.current = text;
        setDisplayText('');
        setShowCursor(true);
        let i = 0;
        if (streamRef.current) clearInterval(streamRef.current);
        streamRef.current = setInterval(() => {
            i += 5; // 5 chars per tick
            if (i < text.length) {
                setDisplayText(text.substring(0, i));
            } else {
                clearInterval(streamRef.current);
                setDisplayText(text);
                setShowCursor(false);
                setPhase('done');
            }
        }, 10); // 10ms tick = ~500 chars/sec — snappy burst feel
    };

    useEffect(() => () => { if (streamRef.current) clearInterval(streamRef.current); }, []);

    // ── Main data + coaching pipeline ────────────────────────────────────────
    const run = async () => {
        if (!govId || !kingdomId) { setPhase('no-gov'); return; }
        setPhase('fetching');
        setMyEntry(null);
        setPeerAvg(null);
        setDisplayText('');

        try {
            // 1. Trends → date range
            const tRes = await fetch(`/api/aws/trends?kd=${kingdomId}`);
            const tData = tRes.ok ? await tRes.json() : null;
            const trends = tData?.trends || [];
            if (trends.length < 2) { setPhase('no-data'); return; }

            // ── Rolling 5-scan window ────────────────────────────────
            // Using all-time history drops members who weren't in the
            // very first kingdom scan. Last 5 scans guarantees recent
            // coverage and matches what Growth Analysis actually shows.
            const recentScans = trends.slice(-5); // last 5 scans (or fewer if not enough data)
            const sDate = extractDate(recentScans[0].scanDate);
            const eDate = extractDate(trends[trends.length - 1].scanDate);
            setDateRange(`${sDate} → ${eDate}`);

            // 2. Behavior roster
            const bRes = await fetch(`/api/aws/behavior?kd=${kingdomId}&start=${sDate}&end=${eDate}&_t=${Date.now()}`);
            const bData = bRes.ok ? await bRes.json() : null;
            const roster = bData?.roster || [];
            if (!roster.length) { setPhase('no-data'); return; }

            // 3. Grade everyone
            const graded = computeGrowthData(roster, 'Peace');
            setKingdomTotal(graded.length);

            // 4. Find member — try ID match first, then fall back to display name
            //    (governorConfig.governorId can be stored as string or number,
            //     and the scan may use a different ID format than what Settings saved)
            const sessionName = session?.user?.username || session?.user?.name || '';
            let found = graded.find(g => String(g.id) === String(govId));
            if (!found && sessionName) {
                // Try partial name match — scan names often include kingdom tag, player may have set
                // their linked name slightly differently. Case-insensitive includes in both directions.
                const nameLower = sessionName.toLowerCase();
                found = graded.find(g =>
                    g.name?.toLowerCase().includes(nameLower) ||
                    nameLower.includes(g.name?.toLowerCase())
                );
            }
            if (!found) { setPhase('no-data'); return; }

            const rank = graded.findIndex(g => String(g.id) === String(found.id)) + 1;
            setMyEntry(found);
            setKingdomRank(rank);

            // 5. Peer average (±20% power band)
            const band  = (found.powerEnd || 0) * 0.20;
            const peers = graded.filter(g =>
                g.id !== found.id &&
                g.powerEnd >= (found.powerEnd || 0) - band &&
                g.powerEnd <= (found.powerEnd || 0) + band
            );
            const avg = peers.length > 0 ? {
                count:          peers.length,
                powerDiff:      Math.round(peers.reduce((a, c) => a + (c.powerDiff || 0), 0) / peers.length),
                kpDiff:         Math.round(peers.reduce((a, c) => a + (c.kpDiff || 0), 0) / peers.length),
                deadsDiff:      Math.round(peers.reduce((a, c) => a + (c.deadsDiff || 0), 0) / peers.length),
                techPowerDiff:  Math.round(peers.reduce((a, c) => a + (c.techPowerDiff || 0), 0) / peers.length),
                cmdPowerDiff:   Math.round(peers.reduce((a, c) => a + (c.cmdPowerDiff || 0), 0) / peers.length),
                bldPowerDiff:   Math.round(peers.reduce((a, c) => a + (c.bldPowerDiff || 0), 0) / peers.length),
                troopPowerDiff: Math.round(peers.reduce((a, c) => a + (c.troopPowerDiff || 0), 0) / peers.length),
                gatheredDiff:   Math.round(peers.reduce((a, c) => a + (c.gatheredDiff || 0), 0) / peers.length),
            } : null;
            setPeerAvg(avg);

            // 6. Call J.A.R.V.I.S.
            setPhase('coaching');
            setErrorText('');
            const prefs = JSON.parse(localStorage.getItem('unty_prefs') || localStorage.getItem('unity_prefs') || '{}');
            const headers = { 'Content-Type': 'application/json' };
            if (prefs.geminiKey) headers['x-gemini-key'] = prefs.geminiKey;

            const cRes = await fetch('/api/aws/coach', {
                method: 'POST',
                headers,
                body: JSON.stringify({ ...found, kingdomState: 'Peace', startDate: sDate, endDate: eDate, peerAvg: avg, locale, geminiModel: prefs.geminiModel }),
            });
            const cData = await cRes.json();
            if (!cData.success || !cData.advice) {
                setErrorText(cData.error || 'AI core failed to respond.');
                setPhase('error');
                return;
            }

            // 7. Stream reveal
            setPhase('streaming');
            startStream(cData.advice);

        } catch (err) {
            console.error('[MemberCoachingBrief]', err);
            setErrorText('Network error reaching AI Coach.');
            setPhase('error');
        }
    };

    // Auto-fire on mount
    useEffect(() => { run(); }, [govId, kingdomId]);

    // ─────────────────────────────────────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────────────────────────────────────
    const renderBold = (text, showFullWhenDone = false) => {
        const src = (phase === 'done' || showFullWhenDone) ? text : text;
        const parsed = src.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-bold">$1</span>');
        return <span dangerouslySetInnerHTML={{ __html: parsed }} />;
    };

    const gcfg = myEntry ? GRADE[myEntry.grade] : null;
    const acfg = myEntry ? ARCH[myEntry.archetype]  : null;

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE: no governor linked
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'no-gov') {
        return (
            <div className="bg-[#0f1115] border border-dashed border-[#2d323e] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4">
                <div className="p-3 bg-[#1e222b] rounded-xl border border-[#2d323e]">
                    <Link2 size={20} className="text-gray-500" />
                </div>
                <div>
                    <p className="text-sm font-bold text-white mb-1">Link Your Card to Unlock J.A.R.V.I.S. Coaching</p>
                    <p className="text-xs text-gray-500">Connect your Governor ID in Settings so J.A.R.V.I.S. can locate you in kingdom scan data and deliver your personal brief.</p>
                </div>
                <button
                    onClick={() => router.push(`/${locale}/settings`)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-500/20 transition-colors"
                >
                    <Settings size={13} />
                    Go to Settings
                </button>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE: loading data / calling coach
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'fetching' || phase === 'coaching' || phase === 'idle') {
        return (
            <div className="bg-[#0f1115] border border-indigo-500/20 rounded-xl p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/3 to-transparent pointer-events-none" />
                <div className="flex flex-col items-center justify-center gap-4 relative z-10">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-full border-2 border-indigo-500/30 flex items-center justify-center bg-indigo-500/5">
                            <Bot size={24} className="text-indigo-400" />
                        </div>
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/50 animate-ping" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-white uppercase tracking-[0.2em] animate-pulse">
                            {phase === 'fetching' ? 'Locating Your Data...' : 'J.A.R.V.I.S. Is Analyzing...'}
                        </p>
                        <p className="text-[10px] text-gray-600 font-mono mt-1 uppercase tracking-wider">
                            {phase === 'fetching' ? 'Scanning kingdom data layers' : 'Consulting tactical intelligence database'}
                        </p>
                    </div>
                    {/* Animated dots */}
                    <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE: error states
    // ─────────────────────────────────────────────────────────────────────────
    if (phase === 'error' || phase === 'no-data') {
        return (
            <div className="bg-[#0f1115] border border-dashed border-[#2d323e] rounded-xl p-6 flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-gray-400 mb-1">
                        {phase === 'no-data' ? 'Not Found in Latest Scan' : 'J.A.R.V.I.S. Offline'}
                    </p>
                    <p className="text-xs text-gray-600 font-mono">
                        {phase === 'no-data'
                            ? 'Your Governor ID wasn\'t detected in the most recent kingdom scan. Ensure your card is linked correctly in Settings.'
                            : errorText || 'Unable to reach the AI coaching engine. Try again in a moment.'}
                    </p>
                </div>
                <button
                    onClick={run}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-[#1e222b] border border-[#2d323e] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#2d323e] transition-colors"
                >
                    <RotateCcw size={13} />
                    Retry
                </button>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE: streaming | done — the main coaching brief
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={`bg-[#0f1115] border rounded-xl overflow-hidden relative transition-all duration-500 ${gcfg?.border || 'border-[#1e222b]'} ${gcfg?.glow || ''}`}>

            {/* ── Header: Grade + Identity + Rank ────────────────────────── */}
            <div className={`p-5 border-b border-[#1e222b] ${gcfg?.bg || ''} relative`}>
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2 opacity-20"
                    style={{ background: gcfg?.color ? 'currentcolor' : 'transparent' }}
                />
                <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex items-start gap-4">
                        {/* Grade badge */}
                        <div className={`shrink-0 w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center ${gcfg?.border} ${gcfg?.bg}`}>
                            <span className={`text-3xl font-black leading-none ${gcfg?.color}`}>{myEntry?.grade}</span>
                            <span className="text-[8px] font-black text-gray-600 uppercase tracking-wider mt-0.5">Grade</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-0.5 flex items-center gap-1.5">
                                J.A.R.V.I.S. Intel Brief
                                <Sparkles size={11} className="text-fuchsia-400 fill-fuchsia-400/20 shrink-0" />
                            </p>
                            <p className="text-base font-bold text-white leading-tight">{myEntry?.name}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {/* Archetype badge */}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${acfg?.color}`}>
                                    {acfg?.icon} {myEntry?.archetype}
                                </span>
                                {/* Score */}
                                <span className="text-[10px] font-mono text-gray-600">{myEntry?.finalScore?.toFixed(1)} pts</span>
                                {/* Rank */}
                                {kingdomRank && (
                                    <span className="text-[10px] font-bold text-gray-500">
                                        Rank #{kingdomRank} <span className="text-gray-700">of {kingdomTotal}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Streaming indicator / done / retry */}
                    <div className="shrink-0">
                        {phase === 'streaming' ? (
                            <div className="flex items-center gap-1.5 text-indigo-400">
                                <RefreshCw size={12} className="animate-spin" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Analyzing</span>
                            </div>
                        ) : phase === 'done' ? (
                            <div className="flex items-center gap-1.5 text-emerald-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Complete</span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Date range */}
                {dateRange && (
                    <p className="text-[9px] font-mono text-gray-700 mt-2 relative z-10">Analysis period: {dateRange}</p>
                )}
            </div>

            {/* ── Peer Comparison Bar (quick context before coaching text) ── */}
            {peerAvg && myEntry && (
                <div className="px-5 py-3 bg-[#0a0c0f] border-b border-[#1e222b]">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2">
                        vs. {peerAvg.count} peers at similar power
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Power',    mine: myEntry.powerDiff,    avg: peerAvg.powerDiff    },
                            { label: 'KP',       mine: myEntry.kpDiff,       avg: peerAvg.kpDiff       },
                            { label: 'Tech',     mine: myEntry.techPowerDiff,avg: peerAvg.techPowerDiff },
                            { label: 'Gathered', mine: myEntry.gatheredDiff, avg: peerAvg.gatheredDiff },
                        ].map(({ label, mine, avg }) => {
                            const isAbove = mine >= avg;
                            return (
                                <div key={label} className="flex flex-col gap-0.5">
                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{label}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[11px] font-black font-mono ${isAbove ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {fmtNum(mine)}
                                        </span>
                                        <span className="text-[9px] text-gray-700">vs</span>
                                        <span className="text-[11px] font-mono text-gray-600">{fmtNum(avg)}</span>
                                        <span className={`text-[8px] font-black ${isAbove ? 'text-emerald-600' : 'text-red-700'}`}>
                                            {isAbove ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── J.A.R.V.I.S. Coaching Output (streaming text) ──────────── */}
            <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5">
                        <Bot size={13} className="text-indigo-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">J.A.R.V.I.S. Assessment</span>
                </div>

                <div className="text-gray-300 text-sm leading-relaxed min-h-[80px] font-sans">
                    {renderBold(displayText)}
                    {showCursor && (
                        <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                    )}
                </div>

                {phase === 'done' && (
                    <button
                        onClick={run}
                        className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-gray-600 hover:text-gray-400 uppercase tracking-wider transition-colors"
                    >
                        <RotateCcw size={11} />
                        Refresh Analysis
                    </button>
                )}
            </div>
        </div>
    );
}
