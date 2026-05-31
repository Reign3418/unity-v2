"use client";
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export default function AIUsageDashboard() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [timeRange, setTimeRange] = useState('weekly'); // 'daily' | 'weekly' | 'monthly'

    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const nextReset = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + 1,
                0, 0, 0, 0
            ));
            const diff = nextReset - now;
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeLeft({ hours, minutes, seconds });
        };
        
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch('/api/aws/admin/logs?days=30')
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

    // Filter to only show AI/Vision/Gemini related events
    const aiEvents = useMemo(() => {
        return events.filter(e => 
            e.eventType.startsWith('VISION_') || 
            e.eventType === 'MATCHMAKER_SCAN' || 
            e.eventType === 'KVK_SCENARIO_SCAN' ||
            e.eventType === 'AI_COACH_BRIEF'
        );
    }, [events]);

    const now = new Date();
    
    // Daily range: Since 00:00 UTC today
    const startOfUtcDay = useMemo(() => {
        return new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
        ));
    }, []);

    const startOfWeekly = useMemo(() => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), []);
    const startOfMonthly = useMemo(() => new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), []);

    // Today's calls (always shown for free tier daily quota)
    const todayCalls = useMemo(() => {
        return aiEvents.filter(e => new Date(e.timestamp) >= startOfUtcDay).length;
    }, [aiEvents, startOfUtcDay]);

    const quotaPct = Math.min(100, (todayCalls / 1500) * 100);

    // Filtered events based on user range selection
    const filteredEvents = useMemo(() => {
        return aiEvents.filter(e => {
            const evtDate = new Date(e.timestamp);
            if (timeRange === 'daily') {
                return evtDate >= startOfUtcDay;
            } else if (timeRange === 'weekly') {
                return evtDate >= startOfWeekly;
            } else {
                return evtDate >= startOfMonthly;
            }
        });
    }, [aiEvents, timeRange, startOfUtcDay, startOfWeekly, startOfMonthly]);

    // Aggregate by User for the active range selection
    const usageByUser = useMemo(() => {
        return filteredEvents.reduce((acc, curr) => {
            acc[curr.userEmail] = (acc[curr.userEmail] || 0) + 1;
            return acc;
        }, {});
    }, [filteredEvents]);

    const sortedUsers = useMemo(() => {
        return Object.entries(usageByUser).sort((a, b) => b[1] - a[1]);
    }, [usageByUser]);

    // Generate Chart Data
    const chartData = useMemo(() => {
        const groups = {};
        if (timeRange === 'daily') {
            // Group by hour of the day (UTC)
            for (let i = 0; i < 24; i++) {
                groups[i] = 0;
            }
            filteredEvents.forEach(e => {
                const date = new Date(e.timestamp);
                const hour = date.getUTCHours();
                groups[hour] = (groups[hour] || 0) + 1;
            });
            const categories = Object.keys(groups).map(h => `${h}:00 UTC`);
            const values = Object.values(groups);
            return { categories, values };
        } else if (timeRange === 'weekly') {
            // Group by calendar day for last 7 days
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().slice(5, 10); // MM-DD
                days.push(dateStr);
                groups[dateStr] = 0;
            }
            filteredEvents.forEach(e => {
                const dateStr = new Date(e.timestamp).toISOString().slice(5, 10);
                if (groups[dateStr] !== undefined) {
                    groups[dateStr]++;
                }
            });
            return { categories: days, values: days.map(d => groups[d]) };
        } else {
            // Group by calendar day for last 30 days
            const days = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().slice(5, 10); // MM-DD
                days.push(dateStr);
                groups[dateStr] = 0;
            }
            filteredEvents.forEach(e => {
                const dateStr = new Date(e.timestamp).toISOString().slice(5, 10);
                if (groups[dateStr] !== undefined) {
                    groups[dateStr]++;
                }
            });
            return { categories: days, values: days.map(d => groups[d]) };
        }
    }, [filteredEvents, timeRange]);

    // ECharts Configuration
    const chartOption = useMemo(() => {
        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(19, 22, 28, 0.95)',
                borderColor: '#1e222b',
                borderWidth: 1,
                textStyle: { color: '#e2e8f0', fontFamily: 'monospace' },
                axisPointer: {
                    type: 'line',
                    lineStyle: { color: '#06b6d4', width: 1, type: 'dashed' }
                }
            },
            grid: {
                top: '10%',
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: chartData.categories,
                axisLine: { lineStyle: { color: '#1e222b' } },
                axisLabel: { color: '#9ca3af', fontFamily: 'monospace', fontSize: 10 },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                axisLine: { show: false },
                axisLabel: { color: '#9ca3af', fontFamily: 'monospace', fontSize: 10 },
                splitLine: { lineStyle: { color: '#1e222b' } }
            },
            series: [
                {
                    name: 'API Calls',
                    type: 'line',
                    smooth: true,
                    showSymbol: chartRangeSymbol(timeRange),
                    symbolSize: 6,
                    data: chartData.values,
                    lineStyle: {
                        width: 2.5,
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 1,
                            y2: 0,
                            colorStops: [
                                { offset: 0, color: '#06b6d4' },
                                { offset: 1, color: '#6366f1' }
                            ]
                        }
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(6, 182, 212, 0.25)' },
                                { offset: 1, color: 'rgba(99, 102, 241, 0)' }
                            ]
                        }
                    },
                    itemStyle: { color: '#06b6d4' }
                }
            ]
        };
    }, [chartData, timeRange]);

    function chartRangeSymbol(range) {
        return range === 'daily' || range === 'weekly';
    }

    if (loading) return <div className="p-10 text-white font-mono bg-[#0a0c0f] min-h-screen">Loading usage logs...</div>;
    if (error) return <div className="p-10 text-red-500 font-mono bg-[#0a0c0f] min-h-screen">Error: {error}</div>;

    return (
        <div className="min-h-screen bg-[#0a0c0f] text-gray-200 p-8">
            {/* Header with Segmented Range Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">AI Usage Dashboard</h1>
                    <p className="text-gray-400 text-sm max-w-2xl">
                        Monitors all Gemini API interactions across the platform over the last 30 days.
                    </p>
                </div>
                
                {/* Time Range Selector */}
                <div className="flex bg-[#13161c] p-1 rounded-lg border border-[#1e222b] w-fit h-fit select-none">
                    <button 
                        onClick={() => setTimeRange('daily')}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                            timeRange === 'daily' 
                                ? 'bg-cyan-500 text-[#090b0e] shadow-lg shadow-cyan-500/20' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Daily / Today
                    </button>
                    <button 
                        onClick={() => setTimeRange('weekly')}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                            timeRange === 'weekly' 
                                ? 'bg-cyan-500 text-[#090b0e] shadow-lg shadow-cyan-500/20' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Weekly / 7d
                    </button>
                    <button 
                        onClick={() => setTimeRange('monthly')}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
                            timeRange === 'monthly' 
                                ? 'bg-cyan-500 text-[#090b0e] shadow-lg shadow-cyan-500/20' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Monthly / 30d
                    </button>
                </div>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Daily Quota Card */}
                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Google Free Tier Quota</span>
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold">1,500 Max</span>
                        </div>
                        <h3 className="text-2xl font-black text-white leading-tight font-mono">{todayCalls} <span className="text-gray-500 text-sm font-normal font-sans">calls today</span></h3>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-1">
                            <span>Usage Percent</span>
                            <span>{quotaPct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-[#1e222b] h-2 rounded-full overflow-hidden border border-[#252a36]">
                            <div 
                                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${quotaPct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Quota Reset Countdown Card */}
                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-5 flex flex-col justify-between min-h-[120px]">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Quota Reset Countdown</span>
                        <h3 className="text-2xl font-black text-white leading-tight font-mono mt-1">
                            {String(timeLeft.hours).padStart(2, '0')}h{' '}
                            {String(timeLeft.minutes).padStart(2, '0')}m{' '}
                            {String(timeLeft.seconds).padStart(2, '0')}s
                        </h3>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-auto flex items-center gap-1.5 pt-4">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Daily Quota resets at 00:00 UTC
                    </p>
                </div>

                {/* Cumulative Card for selected period */}
                <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-5 flex flex-col justify-between min-h-[120px] sm:col-span-2 lg:col-span-1">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                            {timeRange === 'daily' ? "Today's Call Volume" : timeRange === 'weekly' ? "7-Day Cumulative Volume" : "30-Day Cumulative Volume"}
                        </span>
                        <h3 className="text-2xl font-black text-white leading-tight font-mono mt-1">
                            {filteredEvents.length} <span className="text-gray-500 text-sm font-normal font-sans">total calls</span>
                        </h3>
                    </div>
                    <div className="text-[10px] text-gray-400 leading-normal mt-auto pt-4 flex items-center justify-between border-t border-[#1e222b] mt-3">
                        <span className="font-bold text-gray-500 uppercase">
                            {timeRange === 'daily' ? "Tracking Window:" : "Daily Average:"}
                        </span>
                        <span className="font-mono font-bold text-rose-400">
                            {timeRange === 'daily' 
                                ? "Since 00:00 UTC" 
                                : timeRange === 'weekly'
                                    ? `${(filteredEvents.length / 7).toFixed(1)} / day`
                                    : `${(filteredEvents.length / 30).toFixed(1)} / day`
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Area Chart Panel */}
            <div className="bg-[#13161c] border border-[#1e222b] rounded-xl p-6 mb-8">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4">
                    Call Volume Trend ({timeRange === 'daily' ? 'Today / Hourly' : timeRange === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'})
                </h2>
                <div className="w-full h-[220px]">
                    <ReactECharts
                        option={chartOption}
                        style={{ width: '100%', height: '100%' }}
                        opts={{ renderer: 'canvas' }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Aggregation Panel */}
                <div className="md:col-span-1 bg-[#13161c] border border-[#1e222b] rounded-xl p-6 h-fit">
                    <h2 className="text-lg font-bold text-rose-500 mb-4 uppercase tracking-wider">
                        Top Consumers ({timeRange === 'daily' ? 'Today' : timeRange === 'weekly' ? '7d' : '30d'})
                    </h2>
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
                        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                            Raw Event Log ({timeRange === 'daily' ? 'Today' : timeRange === 'weekly' ? '7d' : '30d'})
                        </h2>
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
                                {filteredEvents.map((evt, i) => (
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
                                {filteredEvents.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No events found in this period.</td>
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
