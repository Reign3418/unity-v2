'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ShieldAlert, Wifi, Globe, MapPin, Activity, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a local HH:MM time string in a given IANA timezone to UTC HH:MM.
 * Uses the current date to correctly handle DST.
 */
function localTimeToUTC(timeStr, ianaTimezone) {
    if (!timeStr || !ianaTimezone) return null;
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const now = new Date();

        // Get current local vs UTC offset for this timezone
        const localFmt = new Intl.DateTimeFormat('en-US', {
            timeZone: ianaTimezone,
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const utcFmt = new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            hour: '2-digit', minute: '2-digit', hour12: false
        });

        const localParts = localFmt.format(now).split(':').map(Number);
        const utcParts   = utcFmt.format(now).split(':').map(Number);

        const offsetMins = (utcParts[0] * 60 + utcParts[1]) - (localParts[0] * 60 + localParts[1]);
        const totalMins  = ((hours * 60 + minutes + offsetMins) % 1440 + 1440) % 1440;

        const utcH = Math.floor(totalMins / 60);
        const utcM = totalMins % 60;
        return `${String(utcH).padStart(2, '0')}:${String(utcM).padStart(2, '0')}`;
    } catch {
        return null;
    }
}

/**
 * Converts a HH:MM UTC string to total minutes from midnight.
 */
function toMins(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Checks if a given UTC minute-of-day falls within a user's UTC window.
 * Handles overnight windows (e.g., 22:00–06:00 UTC).
 */
function isInWindow(currentUtcMins, utcStartMins, utcEndMins) {
    if (utcStartMins === null || utcEndMins === null) return false;
    if (utcEndMins >= utcStartMins) {
        return currentUtcMins >= utcStartMins && currentUtcMins <= utcEndMins;
    }
    // Overnight window wraps midnight
    return currentUtcMins >= utcStartMins || currentUtcMins <= utcEndMins;
}

/**
 * Builds a 48-bucket (30-min each) heatmap of alliance coverage.
 * Returns bucket counts and the peak coverage count.
 */
function computePeakWindow(users) {
    const buckets = new Array(48).fill(0);

    for (const user of users) {
        const startMins = toMins(user.utcStart);
        const endMins   = toMins(user.utcEnd);
        if (startMins === null || endMins === null) continue;

        const startBucket = Math.floor(startMins / 30);
        let   endBucket   = Math.floor(endMins / 30);

        // Handle overnight (end wraps past midnight)
        const span = endBucket <= startBucket ? endBucket + 48 - startBucket : endBucket - startBucket;

        for (let i = 0; i < span; i++) {
            buckets[(startBucket + i) % 48]++;
        }
    }

    const maxCount = Math.max(...buckets);
    return { buckets, maxCount };
}

/**
 * Formats a bucket index (0–47) as a UTC time label.
 */
function bucketToLabel(idx) {
    const h = Math.floor((idx * 30) / 60) % 24;
    const m = (idx * 30) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Returns the current-time live status from lastActiveTimestamp.
 */
function calcLiveStatus(lastActiveIso) {
    if (!lastActiveIso) return { color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Offline', diffHours: Infinity };
    const diffHours = (Date.now() - new Date(lastActiveIso)) / 3_600_000;
    if (diffHours < 1)  return { color: 'text-green-400',  bg: 'bg-green-400/20',  label: 'Online',  diffHours };
    if (diffHours < 6)  return { color: 'text-amber-400',  bg: 'bg-amber-400/20',  label: 'Away',    diffHours };
    return                      { color: 'text-gray-500',   bg: 'bg-gray-500/10',   label: 'Offline', diffHours };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PresenceRadarTab({ targetKd }) {
    const [presenceData, setPresenceData] = useState([]);
    const [isLoading, setIsLoading]       = useState(true);

    useEffect(() => {
        const fetchPresence = async () => {
            if (!targetKd) return;
            setIsLoading(true);
            try {
                const res  = await fetch(`/api/user/presence?kd=${targetKd}`);
                const json = await res.json();
                if (json.success && json.presenceData) {
                    setPresenceData(json.presenceData);
                }
            } catch {
                console.error('Failed to fetch presence matrix');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPresence();
    }, [targetKd]);

    // Enrich each user row with UTC-converted windows
    const enrichedUsers = useMemo(() => {
        return presenceData.map(user => ({
            ...user,
            utcStart: localTimeToUTC(user.playtimeStart, user.timezone),
            utcEnd:   localTimeToUTC(user.playtimeEnd,   user.timezone),
        }));
    }, [presenceData]);

    // Alliance Peak Window heatmap
    const { buckets, maxCount } = useMemo(() => computePeakWindow(enrichedUsers), [enrichedUsers]);

    // Current UTC minute-of-day for live triangulation
    const nowUtcMins = useMemo(() => {
        const now = new Date();
        return now.getUTCHours() * 60 + now.getUTCMinutes();
    }, []);

    // Find peak bucket label for the summary callout
    const peakBucketIdx = buckets.indexOf(maxCount);
    const peakLabel = maxCount > 0
        ? `${bucketToLabel(peakBucketIdx)} – ${bucketToLabel((peakBucketIdx + 1) % 48)} UTC`
        : null;

    const usersWithUptime = enrichedUsers.filter(u => u.utcStart && u.utcEnd).length;

    return (
        <div className="space-y-6">

            {/* ── MAIN TABLE ─────────────────────────────────────────────── */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
                <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="text-cyan-400" size={18} />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">Alliance Presence Radar</h2>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                        <Globe size={12} className="text-cyan-500" />
                        All times displayed in UTC
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        Declared playtime is automatically converted to UTC — the universal clock used by Rise of Kingdoms for all events.
                        Live status is triangulated from the last recorded bot interaction, cross-referenced against declared UTC windows.
                    </p>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <Activity className="w-8 h-8 text-cyan-500 animate-spin" />
                            <p className="text-cyan-500 font-mono text-sm tracking-widest uppercase">Sweeping Radar Frequencies...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-[#1e222b] text-gray-400 font-mono text-[10px] uppercase tracking-widest">
                                        <th className="px-4 py-3">Player</th>
                                        <th className="px-4 py-3">In-Game Profiles</th>
                                        <th className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Globe size={10} className="text-cyan-500" />
                                                Uptime Window (UTC)
                                            </div>
                                        </th>
                                        <th className="px-4 py-3">Live Status</th>
                                        <th className="px-4 py-3">Triangulation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrichedUsers.map((user, idx) => {
                                        const status      = calcLiveStatus(user.lastActiveTimestamp);
                                        const startMins   = toMins(user.utcStart);
                                        const endMins     = toMins(user.utcEnd);
                                        const inWindow    = isInWindow(nowUtcMins, startMins, endMins);
                                        const hasUptime   = user.utcStart && user.utcEnd;

                                        // Triangulation logic
                                        let triLabel = '—';
                                        let triColor = 'text-gray-600';
                                        let triIcon  = null;

                                        if (!hasUptime) {
                                            triLabel = 'No uptime declared';
                                            triColor = 'text-gray-600';
                                        } else if (status.label === 'Online' && inWindow) {
                                            triLabel = 'Active · In window ✓';
                                            triColor = 'text-green-400';
                                            triIcon  = <Zap size={10} className="text-green-400" />;
                                        } else if (status.label === 'Online' && !inWindow) {
                                            triLabel = 'Active · Outside window';
                                            triColor = 'text-amber-400';
                                            triIcon  = <AlertTriangle size={10} className="text-amber-400" />;
                                        } else if (status.label === 'Away' && inWindow) {
                                            triLabel = 'In window · Quiet';
                                            triColor = 'text-cyan-500';
                                        } else if (inWindow) {
                                            triLabel = 'In window · Offline';
                                            triColor = 'text-gray-400';
                                        } else {
                                            triLabel = 'Outside window';
                                            triColor = 'text-gray-600';
                                        }

                                        return (
                                            <tr key={idx} className="border-b border-[#1e222b]/50 hover:bg-[#15181e] transition-colors">

                                                {/* Player */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-[#1e222b] flex items-center justify-center border border-[#2d323e]">
                                                            <Globe className="text-indigo-400 w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold text-xs">
                                                                {user.discordDisplayName || user.discordUsername || `ID: ${user.discordId}`}
                                                            </span>
                                                            {(user.discordDisplayName || user.discordUsername) && (
                                                                <span className="text-gray-600 font-mono text-[9px]">{user.discordId}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Governor IDs */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        {user.governorIds && user.governorIds.length > 0 ? (
                                                            user.governorIds.map(govId => (
                                                                <span key={govId} className="text-gray-300 font-mono text-[10px] bg-slate-800/50 px-2 py-0.5 rounded w-fit">
                                                                    ID: {govId}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-600 text-[10px] italic">Unbound</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* UTC Uptime Window */}
                                                <td className="px-4 py-3">
                                                    {hasUptime ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-cyan-400 font-mono font-bold text-xs tracking-wider">
                                                                {user.utcStart} – {user.utcEnd} UTC
                                                            </span>
                                                            {user.playtimeStart && user.timezone && (
                                                                <span className="text-gray-600 font-mono text-[9px]">
                                                                    {user.playtimeStart}–{user.playtimeEnd} local ({user.timezone?.split('/').pop()?.replace('_', ' ')})
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-600 text-xs italic">Not declared</span>
                                                    )}
                                                </td>

                                                {/* Live Status */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1 w-fit">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${status.bg} ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                        {user.lastActiveTimestamp && (
                                                            <span className="text-[9px] text-gray-500 font-mono text-center">
                                                                {formatDistanceToNow(new Date(user.lastActiveTimestamp))} ago
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Triangulation */}
                                                <td className="px-4 py-3">
                                                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${triColor}`}>
                                                        {triIcon}
                                                        {triLabel}
                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {enrichedUsers.length === 0 && (
                                <div className="text-center p-8 text-gray-500 flex items-center justify-center gap-2">
                                    <ShieldAlert size={16} />
                                    <span>No active profiles detected in the tracking matrix.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── ALLIANCE PEAK WINDOW HEATMAP ───────────────────────────── */}
            {!isLoading && usersWithUptime > 0 && (
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
                    <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-fuchsia-400" size={18} />
                            <h2 className="text-white font-bold uppercase tracking-widest text-sm">Alliance Golden Hours</h2>
                        </div>
                        {peakLabel && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
                                <Zap size={10} />
                                Peak: {peakLabel} · {maxCount} members
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                            Based on declared uptime windows converted to UTC. Taller bars = more alliance members online. Use the peak window to schedule in-game events for maximum participation.
                        </p>

                        {/* 24-hour bar chart — 48 buckets × 30min */}
                        <div className="flex items-end gap-px h-16 w-full mb-2">
                            {buckets.map((count, i) => {
                                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                const isPeak  = count === maxCount && maxCount > 0;
                                const isNow   = Math.floor(nowUtcMins / 30) === i;

                                return (
                                    <div
                                        key={i}
                                        title={`${bucketToLabel(i)} UTC — ${count} member${count !== 1 ? 's' : ''}`}
                                        className="flex-1 rounded-t-sm transition-all cursor-pointer relative group"
                                        style={{
                                            height: `${Math.max(height, count > 0 ? 8 : 2)}%`,
                                            backgroundColor: isPeak
                                                ? '#d946ef'   // fuchsia peak
                                                : isNow
                                                ? '#06b6d4'   // cyan = now
                                                : count > 0
                                                ? '#4f46e5'   // indigo = coverage
                                                : '#1e222b'   // no coverage
                                        }}
                                    >
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-10">
                                            <div className="bg-[#0a0c0f] border border-[#2d323e] rounded px-2 py-1 text-[9px] font-mono text-white whitespace-nowrap shadow-xl">
                                                {bucketToLabel(i)} UTC · {count}👤
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* X-axis labels — every 4 hours */}
                        <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-1 px-px">
                            {Array.from({ length: 13 }, (_, i) => (
                                <span key={i}>{String(i * 2).padStart(2, '0')}:00</span>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500 font-mono">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-fuchsia-500" /> Peak coverage</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500" /> Alliance coverage</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-cyan-500" /> Current UTC time</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#1e222b]" /> No coverage</div>
                        </div>

                        <p className="text-[10px] text-gray-600 font-mono mt-3">
                            {usersWithUptime} of {enrichedUsers.length} registered members have declared uptime. Encourage the rest to run /uptime in Discord or set it in Settings → Presence & Uptime.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}
