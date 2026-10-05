"use client";

import { useState } from "react";
import { 
    AlertOctagon, RefreshCw, Search, ShieldCheck, 
    Bot, Skull, UserX, Download, Zap, AlertTriangle 
} from "lucide-react";
import { downloadExcelFile } from "@/lib/excelHelper";

const CLASSIFICATION_BADGES = {
    STAT_PADDER: {
        label: "Stat Padder",
        bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
        icon: UserX
    },
    FARM_BOT: {
        label: "Farm Bot",
        bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        icon: Bot
    },
    DEAD_WEIGHT_WHALE: {
        label: "Deadweight Whale",
        bg: "bg-purple-500/10 border-purple-500/30 text-purple-400",
        icon: Skull
    },
    ACCOUNT_BUYER_RISK: {
        label: "Account Buyer",
        bg: "bg-orange-500/10 border-orange-500/30 text-orange-400",
        icon: AlertTriangle
    }
};

export default function AnomalyDetectorPage() {
    const [kd, setKd] = useState("");
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async () => {
        if (!kd.trim()) return;
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const res = await fetch(`/api/lab/anomaly-detector?kd=${kd}&days=${days}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to analyze kingdom.");
            setData(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data?.topAnomalies?.length) return;
        const exportData = data.topAnomalies.map(p => ({
            "Governor ID": p.id,
            "Governor Name": p.name,
            "Power": p.power,
            "Kill Points": p.killPoints || p.killpoints || 0,
            "Classification": p.classification,
            "Risk Score": p.riskScore,
            "T1 Kill %": p.t1Ratio,
            "T4+T5 War Kill %": p.warKillRatio,
            "KP to Power": p.kpToPower,
            "Flags": p.flags?.map(f => f.desc).join(" | "),
        }));
        downloadExcelFile(exportData, `KD${data.kingdomId}_Anomaly_Audit_${new Date().toISOString().split('T')[0]}.xlsx`, "Outliers");
    };

    const s = data?.summary;

    return (
        <div className="min-h-screen bg-[#06080a] p-6 text-white font-sans">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                <AlertOctagon size={24} className="text-rose-400" />
                            </div>
                            <h1 className="text-2xl font-black tracking-tight">Governor Anomaly & Fraud Engine</h1>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 rounded flex items-center gap-1">
                                <Zap size={10} />
                                <span>Lab Prototype ($0.00 Serverless)</span>
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm max-w-2xl">
                            Algorithmic fraud detection identifying stat-padders (T1 duelers), automated farm bots, deadweight whales, and account buyer liabilities before KvK matchmaking locks.
                        </p>
                    </div>

                    {data?.topAnomalies?.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="self-start md:self-auto flex items-center gap-2 bg-[#13161c] hover:bg-[#1a1f29] border border-[#1e222b] hover:border-indigo-500/40 text-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                        >
                            <Download size={14} className="text-indigo-400" />
                            <span>Export Audit (.xlsx)</span>
                        </button>
                    )}
                </div>

                {/* Controls */}
                <div className="flex gap-3 flex-wrap">
                    <input
                        value={kd}
                        onChange={e => setKd(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && run()}
                        placeholder="Kingdom ID (e.g. 3155)"
                        className="bg-[#0f1115] border border-[#1e222b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50 w-52 font-mono"
                    />
                    {[7, 14, 30, 60].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                                days === d 
                                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300" 
                                    : "bg-[#0f1115] border-[#1e222b] text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                    <button
                        onClick={run}
                        disabled={loading || !kd.trim()}
                        className="px-6 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-950/40"
                    >
                        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                        <span>Audit Kingdom</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-400 text-sm">
                        {error}
                    </div>
                )}

                {s && (
                    <>
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-4">
                                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                                    <ShieldCheck size={12} className="text-emerald-400" />
                                    <span>Integrity Score</span>
                                </div>
                                <div className="text-3xl font-black text-emerald-400">{s.integrityScore}%</div>
                                <div className="text-gray-600 text-xs mt-1">{s.anomalyCount} anomalies found</div>
                            </div>

                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-4">
                                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                                    <UserX size={12} className="text-rose-400" />
                                    <span>Stat Padders</span>
                                </div>
                                <div className="text-3xl font-black text-rose-400">{s.statPadders}</div>
                                <div className="text-gray-600 text-xs mt-1">&ge;70% T1 farm trades</div>
                            </div>

                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-4">
                                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                                    <Bot size={12} className="text-amber-400" />
                                    <span>Farm Bots</span>
                                </div>
                                <div className="text-3xl font-black text-amber-400">{s.farmBots}</div>
                                <div className="text-gray-600 text-xs mt-1">Scripted zero-war</div>
                            </div>

                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-4">
                                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                                    <Skull size={12} className="text-purple-400" />
                                    <span>Deadweight</span>
                                </div>
                                <div className="text-3xl font-black text-purple-400">{s.deadWeightWhales}</div>
                                <div className="text-gray-600 text-xs mt-1">&ge;65M with low KP</div>
                            </div>

                            <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-4">
                                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                                    <AlertTriangle size={12} className="text-orange-400" />
                                    <span>Account Buyers</span>
                                </div>
                                <div className="text-3xl font-black text-orange-400">{s.accountBuyerRisks}</div>
                                <div className="text-gray-600 text-xs mt-1">Zero delta whales</div>
                            </div>
                        </div>

                        {/* Anomaly Table */}
                        <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertOctagon size={16} className="text-rose-400" />
                                    <h3 className="text-gray-300 text-xs font-bold uppercase tracking-wider">
                                        Flagged Outliers ({data.topAnomalies.length})
                                    </h3>
                                </div>
                                <span className="text-xs text-gray-500 font-mono">Sorted by Anomaly Risk Score</span>
                            </div>

                            {data.topAnomalies.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 font-mono text-sm">
                                    No statistical anomalies detected in this kingdom's tracked roster.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[#1e222b] text-gray-600 text-xs uppercase">
                                                <th className="px-5 py-3 text-left">Governor</th>
                                                <th className="px-5 py-3 text-left">Classification</th>
                                                <th className="px-5 py-3 text-right">Power</th>
                                                <th className="px-5 py-3 text-right">Kill Points</th>
                                                <th className="px-5 py-3 text-right">T1 Ratio</th>
                                                <th className="px-5 py-3 text-left">Primary Diagnostic</th>
                                                <th className="px-5 py-3 text-right">Risk Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1e222b]">
                                            {data.topAnomalies.map((p) => {
                                                const badge = CLASSIFICATION_BADGES[p.classification] || {
                                                    label: p.classification,
                                                    bg: "bg-gray-800 text-gray-400 border-gray-700",
                                                    icon: AlertTriangle
                                                };
                                                const Icon = badge.icon;

                                                return (
                                                    <tr key={p.id} className="hover:bg-[#0f1115] transition-colors">
                                                        <td className="px-5 py-3">
                                                            <div className="text-white font-bold text-sm">{p.name}</div>
                                                            <div className="text-gray-600 text-xs font-mono">{p.id}</div>
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.bg}`}>
                                                                <Icon size={10} />
                                                                <span>{badge.label}</span>
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-right font-mono text-gray-300">
                                                            {((p.power || 0) / 1e6).toFixed(1)}M
                                                        </td>
                                                        <td className="px-5 py-3 text-right font-mono text-gray-300">
                                                            {((p.killPoints || p.killpoints || 0) / 1e6).toFixed(1)}M
                                                        </td>
                                                        <td className="px-5 py-3 text-right font-mono">
                                                            <span className={p.t1Ratio >= 70 ? "text-rose-400 font-bold" : "text-gray-400"}>
                                                                {p.t1Ratio}%
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-xs text-gray-400">
                                                            {p.flags?.[0]?.desc || "Statistical anomaly"}
                                                        </td>
                                                        <td className="px-5 py-3 text-right">
                                                            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-rose-400">
                                                                <span>{p.riskScore}</span>
                                                                <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-rose-500 rounded-full" 
                                                                        style={{ width: `${p.riskScore}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
