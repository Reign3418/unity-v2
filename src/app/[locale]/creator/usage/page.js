"use client";
import { useState, useEffect } from 'react';

export default function AIUsageDashboard() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/aws/admin/logs')
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setEvents(data.events || []);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-10 text-white font-mono">Loading usage logs...</div>;
    if (error) return <div className="p-10 text-red-500 font-mono">Error: {error}</div>;

    // Filter to only show AI/Vision/Gemini related events
    const aiEvents = events.filter(e => e.eventType.startsWith('VISION_') || e.eventType === 'MATCHMAKER_SCAN' || e.eventType === 'KVK_SCENARIO_SCAN');

    // Aggregate by User
    const usageByUser = aiEvents.reduce((acc, curr) => {
        acc[curr.userEmail] = (acc[curr.userEmail] || 0) + 1;
        return acc;
    }, {});

    const sortedUsers = Object.entries(usageByUser).sort((a, b) => b[1] - a[1]);

    return (
        <div className="min-h-screen bg-[#0a0c0f] text-gray-200 p-8">
            <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">AI Usage Dashboard</h1>
            <p className="text-gray-400 mb-8 text-sm max-w-2xl">
                Monitors all Gemini API interactions across the platform over the last 7 days.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Aggregation Panel */}
                <div className="md:col-span-1 bg-[#13161c] border border-[#1e222b] rounded-xl p-6 h-fit">
                    <h2 className="text-lg font-bold text-rose-500 mb-4 uppercase tracking-wider">Top Consumers</h2>
                    <div className="space-y-3">
                        {sortedUsers.map(([email, count]) => (
                            <div key={email} className="flex justify-between items-center bg-[#1a1e27] p-3 rounded-lg border border-[#252a36]">
                                <span className="font-mono text-xs text-gray-300 truncate mr-2">{email}</span>
                                <span className="bg-rose-500/20 text-rose-400 font-black text-sm px-2 py-1 rounded">
                                    {count}
                                </span>
                            </div>
                        ))}
                        {sortedUsers.length === 0 && <div className="text-gray-500 text-sm">No usage recorded.</div>}
                    </div>
                </div>

                {/* Raw Events Table */}
                <div className="md:col-span-2 bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[#1e222b] bg-[#1a1e27]">
                        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Raw Event Log (Last 7 Days)</h2>
                    </div>
                    <div className="overflow-x-auto max-h-[700px]">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#0a0c0f] text-gray-500 sticky top-0 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Timestamp</th>
                                    <th className="px-4 py-3 font-medium">User</th>
                                    <th className="px-4 py-3 font-medium">Event / Tool</th>
                                    <th className="px-4 py-3 font-medium">Device Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]">
                                {aiEvents.map((evt, i) => (
                                    <tr key={i} className="hover:bg-[#1a1e27]/50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">
                                            {new Date(evt.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-gray-300">
                                            {evt.userEmail}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-amber-500">
                                            {evt.eventType}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={evt.userAgent}>
                                            {evt.userAgent}
                                        </td>
                                    </tr>
                                ))}
                                {aiEvents.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No events found in the last 7 days.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
