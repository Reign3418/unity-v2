import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, Wifi, Globe, MapPin, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PresenceRadarTab({ targetKd }) {
    const [presenceData, setPresenceData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPresence = async () => {
            if (!targetKd) return;
            setIsLoading(true);
            try {
                const res = await fetch(`/api/user/presence?kd=${targetKd}`);
                const json = await res.json();
                if (json.success && json.presenceData) {
                    setPresenceData(json.presenceData);
                }
            } catch (err) {
                console.error("Failed to fetch presence matrix");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPresence();
    }, [targetKd]);

    const calculateStatus = (lastActiveIso) => {
        if (!lastActiveIso) return { color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Offline' };
        
        const lastActive = new Date(lastActiveIso);
        const now = new Date();
        const diffHours = (now - lastActive) / (1000 * 60 * 60);

        if (diffHours < 1) return { color: 'text-green-400', bg: 'bg-green-400/20', label: 'Online' };
        if (diffHours < 6) return { color: 'text-amber-400', bg: 'bg-amber-400/20', label: 'Away' };
        return { color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Offline' };
    };

    return (
        <div className="space-y-6">
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
                <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="text-cyan-400" size={18} />
                        <h2 className="text-white font-bold uppercase tracking-widest text-sm">Alliance Presence Radar</h2>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        This matrix aggregates physical timezone declarations and passive telemetry to help Kingdom Leadership accurately coordinate shifts, rallies, and timezone handoffs.
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
                                    <tr className="border-b border-[#1e222b] !text-gray-400 font-mono text-[10px] uppercase tracking-widest">
                                        <th className="px-4 py-3">Discord Entity</th>
                                        <th className="px-4 py-3">In-Game Profiles</th>
                                        <th className="px-4 py-3">Local Timezone</th>
                                        <th className="px-4 py-3">Declared Uptime</th>
                                        <th className="px-4 py-3">Live Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {presenceData.map((user, idx) => {
                                        const status = calculateStatus(user.lastActiveTimestamp);
                                        return (
                                            <tr key={idx} className="border-b border-[#1e222b]/50 hover:bg-[#15181e] transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-[#1e222b] flex items-center justify-center border border-[#2d323e]">
                                                            <Globe className="text-indigo-400 w-4 h-4" />
                                                        </div>
                                                        <span className="text-white font-bold font-mono text-xs">{user.discordId}</span>
                                                    </div>
                                                </td>
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
                                                <td className="px-4 py-3">
                                                    {user.timezone ? (
                                                        <div className="flex items-center gap-1.5 text-cyan-400 text-xs">
                                                            <MapPin size={12} />
                                                            <span>{user.timezone}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-600 text-xs italic">Unknown</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {user.playtimeStart && user.playtimeEnd ? (
                                                        <span className="text-fuchsia-400 font-bold tracking-wider font-mono text-xs">
                                                            {user.playtimeStart} - {user.playtimeEnd}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-600 text-xs italic text-center block">-</span>
                                                    )}
                                                </td>
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
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {presenceData.length === 0 && (
                                <div className="text-center p-8 text-gray-500 flex items-center justify-center gap-2">
                                    <ShieldAlert size={16} />
                                    <span>No active profiles detected in the tracking matrix.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
