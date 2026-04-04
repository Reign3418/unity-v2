"use client";

import { useState, useEffect } from "react";
import { Activity, Users, Search, Crosshair, Trophy, RefreshCw, Shield, TrendingUp, Clock, BarChart2, Eye } from "lucide-react";

const FEATURE_META = {
    MATCHMAKER_SCAN: { label: "Matchmaker", icon: Trophy,    color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20" },
    TRACKER_SCAN:    { label: "Tracker",    icon: Activity,  color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
    HUNTER_SEARCH:   { label: "Hunter",    icon: Search,    color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
};

const TimeAgo = ({ ts }) => {
    if (!ts) return null;
    const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (seconds < 60) return <span>{seconds}s ago</span>;
    if (seconds < 3600) return <span>{Math.floor(seconds / 60)}m ago</span>;
    if (seconds < 86400) return <span>{Math.floor(seconds / 3600)}h ago</span>;
    return <span>{Math.floor(seconds / 86400)}d ago</span>;
};

export default function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(7);
    const [filterFeature, setFilterFeature] = useState('');
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ days });
            if (filterFeature) params.set('feature', filterFeature);
            const res = await fetch(`/api/admin/events?${params}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to load events');
            setData(json);
            setLastRefresh(new Date());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEvents(); }, [days, filterFeature]);

    const stats = data?.stats;

    return (
        <div className="min-h-screen bg-[#080a0e] text-white font-sans p-6 lg:p-10">

            {/* Header */}
            <div className="flex items-start justify-between mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl">
                            <Eye size={20} className="text-fuchsia-400" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Usage Intelligence</h1>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400 border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 rounded ml-2">Admin Only</span>
                    </div>
                    <p className="text-gray-500 text-sm">Real-time site event feed — locked to Super Admin clearance.</p>
                </div>
                <div className="flex items-center gap-3">
                    {lastRefresh && (
                        <span className="text-gray-600 text-xs flex items-center gap-1">
                            <Clock size={10}/> Updated <TimeAgo ts={lastRefresh}/>
                        </span>
                    )}
                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className="flex items-center gap-2 bg-[#13161c] border border-[#1e222b] hover:border-fuchsia-500/40 text-gray-300 px-4 py-2 rounded-xl text-sm transition-all"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-fuchsia-400' : ''}/>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-8">
                <span className="text-gray-600 text-xs uppercase tracking-wider">Timeframe</span>
                {[1, 3, 7, 14, 30].map(d => (
                    <button
                        key={d}
                        onClick={() => setDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-all border ${
                            days === d
                                ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
                                : 'bg-[#13161c] border-[#1e222b] text-gray-500 hover:text-gray-300'
                        }`}
                    >{d}d</button>
                ))}
                <div className="w-px h-5 bg-[#1e222b] mx-2" />
                <span className="text-gray-600 text-xs uppercase tracking-wider">Feature</span>
                {['', 'MATCHMAKER_SCAN', 'TRACKER_SCAN', 'HUNTER_SEARCH'].map(f => (
                    <button
                        key={f || 'all'}
                        onClick={() => setFilterFeature(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                            filterFeature === f
                                ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
                                : 'bg-[#13161c] border-[#1e222b] text-gray-500 hover:text-gray-300'
                        }`}
                    >{f ? (FEATURE_META[f]?.label || f) : 'All'}</button>
                ))}
            </div>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 mb-8 text-rose-400 text-sm flex items-center gap-3">
                    <Shield size={16}/> {error}
                </div>
            )}

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Total Events */}
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart2 size={14} className="text-fuchsia-400"/>
                            <span className="text-gray-500 text-[10px] uppercase tracking-widest">Total Events</span>
                        </div>
                        <div className="text-4xl font-black text-white font-mono">{stats.total.toLocaleString()}</div>
                        <div className="text-gray-600 text-xs mt-1">last {days} day{days !== 1 ? 's' : ''}</div>
                    </div>

                    {/* Feature Breakdown */}
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity size={14} className="text-cyan-400"/>
                            <span className="text-gray-500 text-[10px] uppercase tracking-widest">By Feature</span>
                        </div>
                        <div className="space-y-1.5">
                            {Object.entries(FEATURE_META).map(([key, meta]) => (
                                <div key={key} className="flex justify-between items-center">
                                    <span className={`text-xs ${meta.color}`}>{meta.label}</span>
                                    <span className="text-white font-mono font-bold text-sm">{(stats.byFeature[key] || 0).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Kingdoms */}
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Crosshair size={14} className="text-amber-400"/>
                            <span className="text-gray-500 text-[10px] uppercase tracking-widest">Top Kingdoms</span>
                        </div>
                        <div className="space-y-1.5">
                            {(stats.topKingdomsArr || []).slice(0, 5).map(({ kd, count }) => (
                                <div key={kd} className="flex justify-between items-center">
                                    <span className="text-gray-400 font-mono text-xs">KD {kd}</span>
                                    <span className="text-amber-400 font-mono font-bold text-sm">{count}</span>
                                </div>
                            ))}
                            {(stats.topKingdomsArr || []).length === 0 && <span className="text-gray-600 text-xs">No data yet</span>}
                        </div>
                    </div>

                    {/* Top Users */}
                    <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={14} className="text-indigo-400"/>
                            <span className="text-gray-500 text-[10px] uppercase tracking-widest">Active Users</span>
                        </div>
                        <div className="space-y-1.5">
                            {(stats.topUsersArr || []).slice(0, 5).map(({ email, count }) => (
                                <div key={email} className="flex justify-between items-center gap-2">
                                    <span className="text-gray-400 text-xs truncate">{email}</span>
                                    <span className="text-indigo-400 font-mono font-bold text-sm shrink-0">{count}</span>
                                </div>
                            ))}
                            {(stats.topUsersArr || []).length === 0 && <span className="text-gray-600 text-xs">No named users yet</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Activity Bar Chart */}
            {stats?.byDay && Object.keys(stats.byDay).length > 0 && (
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp size={14} className="text-fuchsia-400"/>
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Daily Activity</h3>
                    </div>
                    <div className="flex items-end gap-2 h-24">
                        {Object.entries(stats.byDay).sort((a,b) => a[0].localeCompare(b[0])).map(([day, count]) => {
                            const maxVal = Math.max(...Object.values(stats.byDay));
                            const pct = maxVal > 0 ? (count / maxVal) * 100 : 0;
                            return (
                                <div key={day} className="flex-1 flex flex-col items-center gap-1 group/bar">
                                    <span className="text-[9px] text-gray-600 opacity-0 group-hover/bar:opacity-100 transition-opacity">{count}</span>
                                    <div
                                        className="w-full bg-fuchsia-500/30 hover:bg-fuchsia-500/50 rounded-t transition-all"
                                        style={{ height: `${Math.max(pct, 4)}%` }}
                                    />
                                    <span className="text-[8px] text-gray-700 font-mono">{day.slice(5)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Event Feed */}
            <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-fuchsia-400"/>
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Live Event Feed</h3>
                    </div>
                    <span className="text-gray-600 text-xs font-mono">{data?.events?.length || 0} events</span>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw size={24} className="animate-spin text-fuchsia-400 mx-auto mb-3"/>
                        <p className="text-gray-600 text-sm">Loading events...</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#1e222b]">
                        {(data?.events || []).length === 0 ? (
                            <div className="p-12 text-center text-gray-600 text-sm">No events found for this timeframe.</div>
                        ) : (data?.events || []).map((ev, idx) => {
                            const meta = FEATURE_META[ev.eventType];
                            const Icon = meta?.icon || Activity;
                            return (
                                <div key={idx} className="px-6 py-4 flex items-start gap-4 hover:bg-[#0f1115] transition-colors">
                                    <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${meta?.bg || 'bg-gray-500/10'} ${meta?.border || 'border-gray-500/20'}`}>
                                        <Icon size={12} className={meta?.color || 'text-gray-400'}/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold ${meta?.color || 'text-gray-400'}`}>{meta?.label || ev.eventType}</span>
                                            <span className="text-gray-700">·</span>
                                            <span className="text-gray-500 text-xs">{ev.userEmail}</span>
                                        </div>
                                        <div className="text-gray-600 text-xs font-mono">
                                            {ev.eventType === 'MATCHMAKER_SCAN' && (
                                                <span>KDs: [{ev.metadata?.kingdoms?.join(', ')}] · {ev.metadata?.timeframeDays}d window</span>
                                            )}
                                            {ev.eventType === 'TRACKER_SCAN' && (
                                                <span>KD {ev.metadata?.kingdomId} · {ev.metadata?.resultsCount} rows</span>
                                            )}
                                            {ev.eventType === 'HUNTER_SEARCH' && (
                                                <span>Query: "{ev.metadata?.query}" · {ev.metadata?.resultsCount} results</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-gray-700 text-xs shrink-0 font-mono">
                                        <TimeAgo ts={ev.timestamp}/>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
