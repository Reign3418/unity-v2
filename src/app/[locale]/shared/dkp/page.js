'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShieldAlert, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function PublicDkpTargets() {
    const searchParams = useSearchParams();
    const kd = searchParams.get('kd');
    const baseline = searchParams.get('baseline');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [targets, setTargets] = useState([]);
    const [dkpSystem, setDkpSystem] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [sortConfig, setSortConfig] = useState({ key: 'powerStart', direction: 'desc' });

    useEffect(() => {
        if (!kd || !baseline) {
            setError("Invalid Link: Missing Kingdom ID or Baseline Scan.");
            setIsLoading(false);
            return;
        }

        const fetchTargets = async () => {
            try {
                const res = await fetch(`/api/aws/public/dkp-targets?kd=${kd}&baseline=${baseline}`);
                const data = await res.json();
                
                if (data.error) {
                    setError(data.error);
                } else {
                    setTargets(data.targets || []);
                    setDkpSystem(data.dkpSystem || 'advanced');
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch DKP Targets. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTargets();
    }, [kd, baseline]);

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTargets = useMemo(() => {
        let sortableItems = [...targets];
        
        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            sortableItems = sortableItems.filter(t => 
                (t.name && t.name.toLowerCase().includes(q)) ||
                (t.id && t.id.toString().includes(q)) ||
                (t.alliance && t.alliance.toLowerCase().includes(q))
            );
        }

        // Sorting
        sortableItems.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            
            if (typeof aValue === 'string') aValue = aValue.toLowerCase();
            if (typeof bValue === 'string') bValue = bValue.toLowerCase();

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        return sortableItems;
    }, [targets, searchQuery, sortConfig]);

    const formatNum = (num) => Number(num).toLocaleString();

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <span className="opacity-0 group-hover:opacity-50 ml-1">↕</span>;
        return <span className="text-cyan-400 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6 text-slate-400 font-mono">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-cyan-500" />
                <p className="uppercase tracking-widest text-xs font-bold">Connecting to Unity Network...</p>
                <p className="text-[10px] mt-2 opacity-50">Retrieving KvK Baseline Matrix</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
                <h1 className="text-2xl font-black text-rose-400 uppercase tracking-widest mb-2">Access Denied</h1>
                <p className="text-slate-400 font-mono max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060810] text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500/30">
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-[#0f1115] p-6 rounded-2xl border border-[#1e222b] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent left-0" />
                    
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldAlert className="w-6 h-6 text-cyan-400" />
                            <h1 className="text-2xl font-black italic uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                Target Acquisition
                            </h1>
                        </div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Kingdom <span className="text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{kd}</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-2 font-mono">Baseline Scan: {baseline}</p>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Active Ruleset</span>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-wider">
                                {dkpSystem === 'advanced' ? 'Proportional (Advanced)' : dkpSystem === 'bracketed' ? 'Tiered (Bracketed)' : 'Basic (Raw Kills)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="SEARCH BY GOVERNOR NAME OR ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0a0c0f] border-2 border-[#1e222b] focus:border-cyan-500/50 text-slate-200 placeholder-slate-600 rounded-xl py-4 pl-12 pr-4 font-mono font-bold uppercase tracking-wider outline-none transition-all shadow-inner"
                    />
                </div>

                {/* Data List */}
                <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-2xl overflow-hidden">
                    {dkpSystem === 'basic' && (
                        <div className="p-6 bg-amber-500/10 border-b border-amber-500/20 text-amber-400/90 text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5" />
                            Basic ruleset is active. Specific individual DKP targets are disabled.
                        </div>
                    )}

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <table className="w-full whitespace-nowrap text-left border-collapse">
                            <thead className="bg-[#0f1115] sticky top-0 z-10 shadow-md">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-[#1e222b] cursor-pointer hover:bg-white/[0.02] transition-colors group" onClick={() => requestSort('name')}>
                                        Governor <SortIcon columnKey="name" />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-[#1e222b] cursor-pointer hover:bg-white/[0.02] transition-colors group" onClick={() => requestSort('powerStart')}>
                                        Starting Power <SortIcon columnKey="powerStart" />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-[#1e222b] text-right cursor-pointer hover:bg-white/[0.02] transition-colors group" onClick={() => requestSort('targetDeads')}>
                                        <div className="flex justify-end items-center text-rose-500/70">Target Deads <SortIcon columnKey="targetDeads" /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-[#1e222b] text-right cursor-pointer hover:bg-white/[0.02] transition-colors group" onClick={() => requestSort('targetDkp')}>
                                        <div className="flex justify-end items-center">Target DKP <SortIcon columnKey="targetDkp" /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]">
                                {sortedTargets.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-600 font-mono uppercase tracking-widest">
                                            {searchQuery ? "No matching governors found." : "Roster is empty."}
                                        </td>
                                    </tr>
                                ) : (
                                    sortedTargets.map((gov) => (
                                        <tr key={gov.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-200 text-sm">{gov.name || 'Unknown'}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-mono text-slate-500">{gov.id}</span>
                                                        {gov.alliance && (
                                                            <span className="text-[9px] font-black uppercase tracking-widest bg-[#1e222b] text-slate-400 px-1.5 py-0.5 rounded">
                                                                {gov.alliance}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-400 text-sm">
                                                {formatNum(gov.powerStart)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-mono font-black text-sm text-rose-400/80">
                                                    {formatNum(gov.targetDeads)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-mono font-black text-lg text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                                                    {formatNum(gov.targetDkp)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                    POWERED BY UNITY COMBAT INTELLIGENCE
                </div>
            </div>
        </div>
    );
}
