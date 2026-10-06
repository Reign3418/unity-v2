"use client";

import { useState, useEffect } from "react";
import { Search, ShieldAlert, Save, Loader2, Trash2, Swords, Trophy, Calendar } from "lucide-react";

export default function GovernorManager({ governors = [] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [localGovs, setLocalGovs] = useState(governors);
    const [savingId, setSavingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Keep local list in sync when parent finishes async fetch
    useEffect(() => {
        setLocalGovs(governors || []);
    }, [governors]);

    const filtered = localGovs.filter(g => 
        (g.governorName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        String(g.governorId || "").includes(searchTerm) ||
        String(g.kingdomId || "").includes(searchTerm)
    );

    const handleSave = async (govId, newKingdom, newRole) => {
        setSavingId(govId);
        try {
            const res = await fetch("/api/aws/admin/governors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ governorId: govId, kingdomId: newKingdom, role: newRole })
            });

            if (res.ok) {
                setLocalGovs(prev => prev.map(g => g.governorId === govId ? { ...g, kingdomId: newKingdom, role: newRole } : g));
            } else {
                const data = await res.json();
                alert("Failed to update governor: " + (data.error || "Unknown error"));
            }
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (govId, govName) => {
        if (!confirm(`Are you sure you want to delete registration credentials for ${govName || govId} (ID: ${govId})? They will have to self-register again.`)) {
            return;
        }

        setDeletingId(govId);
        try {
            const res = await fetch(`/api/aws/admin/governors?governorId=${govId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setLocalGovs(prev => prev.filter(g => g.governorId !== govId));
            } else {
                const data = await res.json();
                alert("Failed to delete governor: " + (data.error || "Unknown error"));
            }
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest border-b border-[#1e222b] pb-4 mb-6 relative">
                In-Game Governor Registrations
                <div className="absolute bottom-[-1px] left-0 w-24 h-[2px] bg-emerald-500"></div>
            </h2>

            <div className="bg-[#0a0c10] border border-[#1e222b] rounded-xl p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <div>
                        <h3 className="text-white font-bold text-sm uppercase tracking-widest">
                            Registered In-Game Accounts ({localGovs.length})
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5">
                            Players authenticated via profile screenshot OCR &amp; numeric 4-digit PIN.
                        </p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search Name, ID, or Kingdom..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-[#111318] border border-[#1e222b] rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full md:w-64"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                    {filtered.map(gov => (
                        <GovCard 
                            key={gov.governorId} 
                            gov={gov} 
                            onSave={handleSave} 
                            onDelete={handleDelete}
                            savingId={savingId}
                            deletingId={deletingId}
                        />
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 text-xs font-mono">
                            {localGovs.length === 0 
                                ? "No in-game PIN registered governors found in database." 
                                : `No governors found matching "${searchTerm}"`}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GovCard({ gov, onSave, onDelete, savingId, deletingId }) {
    const [kingdom, setKingdom] = useState(gov.kingdomId || "3418");
    const [role, setRole] = useState(gov.role || "User");

    // Sync card if parent state changes
    useEffect(() => {
        setKingdom(gov.kingdomId || "3418");
        setRole(gov.role || "User");
    }, [gov.kingdomId, gov.role]);

    const isSaving = savingId === gov.governorId;
    const isDeleting = deletingId === gov.governorId;
    const isChanged = kingdom !== (gov.kingdomId || "3418") || role !== (gov.role || "User");

    const formatNumber = (num) => {
        if (!num) return "0";
        if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
        if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
        if (num >= 1e3) return (num / 1e3).toFixed(0) + "k";
        return num.toLocaleString();
    };

    return (
        <div className="bg-[#11141a] border border-[#232833] rounded-xl p-4 flex flex-col justify-between gap-3 relative group hover:border-emerald-500/40 transition-colors">
            {/* Top Row: Name, ID, Alliance */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
                        <span>{gov.governorName}</span>
                        {gov.allianceTag && (
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                [{gov.allianceTag}]
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-cyan-400 font-mono font-bold mt-0.5">
                        ID: {gov.governorId}
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onDelete(gov.governorId, gov.governorName)}
                        disabled={isDeleting || isSaving}
                        className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all text-xs disabled:opacity-50"
                        title="Delete Governor Registration"
                    >
                        {isDeleting ? <Loader2 size={13} className="animate-spin text-rose-400" /> : <Trash2 size={13} />}
                    </button>
                </div>
            </div>

            {/* Middle Row: Quick Stats */}
            {(gov.power > 0 || gov.killPoints > 0) && (
                <div className="flex items-center gap-4 text-[11px] font-mono bg-[#0c0f14] border border-[#1b202c] rounded-lg px-3 py-1.5">
                    <span className="flex items-center gap-1 text-slate-400">
                        <Trophy size={12} className="text-amber-400" />
                        <span>Power:</span>
                        <strong className="text-white">{formatNumber(gov.power)}</strong>
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                        <Swords size={12} className="text-rose-400" />
                        <span>KP:</span>
                        <strong className="text-white">{formatNumber(gov.killPoints)}</strong>
                    </span>
                </div>
            )}
            
            {/* Bottom Row: Editable Kingdom & Role + Save */}
            <div className="flex items-end gap-3 border-t border-[#1e222b] pt-3">
                <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
                        Kingdom
                    </label>
                    <div className="flex items-center bg-[#0a0c10] border border-[#232833] rounded px-2 focus-within:border-emerald-500 transition-colors">
                        <span className="text-xs text-gray-500 font-bold mr-1">#</span>
                        <input 
                            type="text" 
                            value={kingdom} 
                            onChange={(e) => setKingdom(e.target.value.replace(/\D/g, ''))} 
                            className="w-full bg-transparent py-1.5 text-xs text-cyan-400 font-bold focus:outline-none" 
                            placeholder="3418"
                        />
                    </div>
                </div>

                <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
                        Access Role
                    </label>
                    <select 
                        value={role} 
                        onChange={(e) => setRole(e.target.value)} 
                        className="w-full bg-[#0a0c10] border border-[#232833] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                        <option value="User">User</option>
                        <option value="DATA ANALYST">Data Analyst</option>
                        <option value="LEADER">Leader</option>
                        <option value="Admin">Admin</option>
                    </select>
                </div>

                <button 
                    disabled={!isChanged || isSaving || isDeleting}
                    onClick={() => onSave(gov.governorId, kingdom, role)}
                    className={`h-[34px] px-3.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isChanged 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                            : 'bg-[#1a1f29] text-gray-500 cursor-not-allowed opacity-60'
                    }`}
                    title="Save Changes"
                >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save</span>
                </button>
            </div>

            {/* Registration Timestamp */}
            {gov.registeredAt && (
                <div className="text-[9px] text-gray-600 font-mono flex items-center gap-1">
                    <Calendar size={10} />
                    <span>Registered: {new Date(gov.registeredAt).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    );
}
