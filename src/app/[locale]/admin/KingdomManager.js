"use client";

import { useState, useEffect } from "react";
import { Save, Calendar, Loader2 } from "lucide-react";

export default function KingdomManager() {
    const [kingdomsData, setKingdomsData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

    useEffect(() => {
        fetchKingdoms();
    }, []);

    const fetchKingdoms = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/aws/admin/kingdoms/metadata");
            const data = await res.json();
            if (data.kingdoms) {
                // Sort by kingdom ID ascending
                const sorted = data.kingdoms.sort((a, b) => parseInt(a.kingdomId) - parseInt(b.kingdomId));
                setKingdomsData(sorted);
            }
        } catch (error) {
            console.error("Failed to fetch kingdoms", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (kingdomId, newDate) => {
        setSavingId(kingdomId);
        try {
            const res = await fetch("/api/aws/admin/kingdoms/metadata", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kingdomId, foundedDate: newDate })
            });
            if (res.ok) {
                // Flash success (simple state update)
                setKingdomsData(prev => prev.map(k => k.kingdomId === kingdomId ? { ...k, metadata: { ...k.metadata, foundedDate: newDate } } : k));
            } else {
                const err = await res.json();
                alert("Error saving: " + err.error);
            }
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setSavingId(null);
        }
    };

    const [searchTerm, setSearchTerm] = useState("");

    const filtered = kingdomsData.filter(k => 
        String(k.kingdomId).includes(searchTerm)
    );

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="bg-[#0a0c10] border border-[#1e222b] rounded-xl p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Calendar className="text-indigo-400" size={24} />
                            <h2 className="text-xl font-bold text-white">Kingdom Foundation Dates ({kingdomsData.length})</h2>
                        </div>
                        <p className="text-xs text-gray-400">
                            Set the exact launch date (birthday) for each kingdom to enable Time-Adjusted Velocity metrics.
                        </p>
                    </div>

                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Filter Kingdom #..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-[#111318] border border-[#1e222b] rounded-lg px-4 py-2 text-xs text-white outline-none focus:border-indigo-500 w-full md:w-56 font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((k) => (
                        <KingdomCard key={k.kingdomId} kingdom={k} onSave={handleSave} savingId={savingId} />
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 text-xs font-mono">
                            No kingdoms found matching "#{searchTerm}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function KingdomCard({ kingdom, onSave, savingId }) {
    const [date, setDate] = useState(kingdom.metadata?.foundedDate || "");
    const isSaving = savingId === kingdom.kingdomId;
    const isChanged = date !== (kingdom.metadata?.foundedDate || "");

    return (
        <div className="bg-[#11141a] border border-[#232833] rounded-lg p-4 flex flex-col justify-between">
            <div>
                <div className="text-xl font-black text-white mb-1 drop-shadow-md">
                    {kingdom.kingdomId}
                </div>
                <div className="text-xs text-gray-500 font-mono mb-3 uppercase tracking-wide">
                    {kingdom.metadata?.foundedDate ? "Age Anchored" : "Date Missing"}
                </div>
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-[#232833] rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                />
            </div>
            
            <button 
                onClick={() => onSave(kingdom.kingdomId, date)}
                disabled={!isChanged || isSaving}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all ${isChanged ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-[#1a1f29] text-gray-500 cursor-not-allowed'}`}
            >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? "Saving..." : "Save Date"}
            </button>
        </div>
    );
}
