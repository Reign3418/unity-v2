"use client";

import { useState, useEffect, useMemo } from "react";
import { Link2, Trash2, Search, Users, AlertCircle, Save, RefreshCw } from "lucide-react";

export default function AccountLinkerTab({ rosterData, targetKd }) {
    const [links, setLinks] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form State
    const [selectedFarm, setSelectedFarm] = useState("");
    const [selectedMain, setSelectedMain] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // 1. Fetch Existing Links
    useEffect(() => {
        const fetchLinks = async () => {
            if (!targetKd) return;
            setIsLoading(true);
            try {
                const res = await fetch(`/api/aws/admin/links?kd=${targetKd}`);
                if (res.ok) {
                    const data = await res.json();
                    setLinks(data || {});
                }
            } catch (err) {
                console.error("Failed to load links:", err);
            }
            setIsLoading(false);
        };
        fetchLinks();
    }, [targetKd]);

    // 2. Save Links to DynamoDB
    const saveLinksToCloud = async (newLinksMap) => {
        setIsSaving(true);
        try {
            await fetch(`/api/aws/admin/links?kd=${targetKd}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newLinksMap)
            });
            setLinks(newLinksMap);
        } catch (err) {
            console.error("Failed to save links:", err);
            alert("Database error: Could not sync Roster Links.");
        }
        setIsSaving(false);
    };

    // 3. Handlers
    const handleLinkAccount = () => {
        if (!selectedFarm || !selectedMain) return;
        if (selectedFarm === selectedMain) return alert("A farm cannot be its own main.");
        
        const updated = { ...links, [selectedFarm]: selectedMain };
        saveLinksToCloud(updated);
        
        setSelectedFarm(""); // Reset
    };

    const handleRemoveLink = (farmIdToRemove) => {
        const updated = { ...links };
        delete updated[farmIdToRemove];
        saveLinksToCloud(updated);
    };

    // 4. Data Derivations
    // Group links by Main ID to build "Family Trees"
    const familyTrees = useMemo(() => {
        const trees = {};
        Object.entries(links).forEach(([farmId, mainId]) => {
            if (!trees[mainId]) trees[mainId] = [];
            trees[mainId].push(farmId);
        });
        return trees;
    }, [links]);

    // Quick lookup for Governor Names
    const govDictionary = useMemo(() => {
        const dict = {};
        if (rosterData && rosterData.length > 0) {
            rosterData.forEach(g => {
                dict[g.id] = g.name;
            });
        }
        return dict;
    }, [rosterData]);

    const getGovName = (id) => govDictionary[id] || "Unknown Governor";

    // Filtering out unlinked vs linked options for dropdowns
    const availableFarms = useMemo(() => {
        if (!rosterData) return [];
        return rosterData.filter(g => !links[g.id] && g.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [rosterData, links, searchQuery]);

    const availableMains = useMemo(() => {
        if (!rosterData) return [];
        // A main cannot be someone who is already mapped as a farm to someone else
        return rosterData; 
    }, [rosterData]);

    if (isLoading) {
        return <div className="p-8 text-center text-emerald-400 font-mono animate-pulse">Synchronizing Family Trees...</div>;
    }

    return (
        <div className="w-full space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                    <Link2 className="text-emerald-500" /> Account Linker
                    <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-1 rounded border border-purple-500/20">ADMIN OVERRIDE</span>
                </h2>
                <p className="text-gray-400 mt-2 text-sm font-mono max-w-2xl">
                    Permanently link Farm accounts to their Main Governor. Once linked, the mathematical engine will automatically siphon Overflow DKP metrics into the overarching Main's performance record.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Panel 1: Registration Form */}
                <div className="lg:col-span-1 border border-[#2d323e] bg-[#0f1115] rounded-xl p-6 shadow-2xl relative h-fit">
                    <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                        Register New Bind
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Target Farm</label>
                            
                            <div className="bg-[#1a1d24] border border-[#2d323e] rounded flex items-center p-2 mb-2">
                                <Search size={14} className="text-gray-500 mr-2" />
                                <input 
                                    type="text" 
                                    placeholder="Filter available..." 
                                    className="bg-transparent outline-none text-xs text-white placeholder:text-gray-600 w-full font-mono"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <select 
                                value={selectedFarm}
                                onChange={e => setSelectedFarm(e.target.value)}
                                className="w-full bg-[#1a1d24] border border-[#2d323e] text-white p-3 rounded font-mono text-sm outline-none cursor-pointer focus:border-emerald-500/50"
                            >
                                <option value="">-- SELECT UNLINKED FARM --</option>
                                {availableFarms.map(g => (
                                    <option key={`f-${g.id}`} value={g.id}>
                                        {g.name} ({g.id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex justify-center p-2">
                            <div className="h-8 w-px bg-[#2d323e] relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f1115] p-1">
                                    <Link2 size={16} className="text-gray-500" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Assign To Main</label>
                            <select 
                                value={selectedMain}
                                onChange={e => setSelectedMain(e.target.value)}
                                className="w-full bg-[#1a1d24] border border-[#2d323e] text-amber-100 p-3 rounded font-mono text-sm outline-none cursor-pointer focus:border-amber-500/50"
                            >
                                <option value="">-- SELECT BENEFICIARY MAIN --</option>
                                {availableMains.map(g => (
                                    <option key={`m-${g.id}`} value={g.id}>
                                        {g.name} ({g.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button 
                            onClick={handleLinkAccount}
                            disabled={!selectedFarm || !selectedMain || isSaving}
                            className={`w-full mt-6 p-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${
                                !selectedFarm || !selectedMain || isSaving 
                                ? 'bg-[#1a1d24] text-gray-600 border border-[#2d323e] cursor-not-allowed' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                            }`}
                        >
                            {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                            {isSaving ? 'Synchronizing...' : 'Siphon Overlay'}
                        </button>
                    </div>
                </div>

                {/* Panel 2: Registry Database */}
                <div className="lg:col-span-2 border border-[#2d323e] bg-[#0f1115] rounded-xl p-6 shadow-2xl">
                     <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                        <Users className="text-emerald-500" /> Kingdom Family Trees
                     </h3>
                     
                     {Object.keys(familyTrees).length === 0 ? (
                         <div className="border border-dashed border-[#2d323e] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
                             <AlertCircle size={48} className="mb-4 opacity-50" />
                             <p className="font-mono text-sm">No Siphon bindings established in this Kingdom.</p>
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {Object.entries(familyTrees).map(([mainId, farms]) => (
                                 <div key={mainId} className="bg-[#1a1d24] border border-[#2d323e] rounded-lg p-4 transition-all hover:border-amber-500/30">
                                     {/* Main Gov Header */}
                                     <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#2d323e] border-dashed">
                                         <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                                             <Users size={14} className="text-amber-400" />
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <div className="text-amber-100 font-bold truncate">{getGovName(mainId)}</div>
                                             <div className="text-xs text-amber-500/70 font-mono tracking-widest">{mainId}</div>
                                         </div>
                                         <div className="bg-[#0f1115] px-2 py-1 rounded text-[10px] font-black tracking-widest text-gray-500 uppercase border border-[#2d323e]">
                                             Beneficiary
                                         </div>
                                     </div>

                                     {/* Farm Links */}
                                     <div className="space-y-2 pl-4 border-l-2 border-[#2d323e] ml-4">
                                         {farms.map(farmId => (
                                             <div key={farmId} className="flex items-center justify-between group">
                                                 <div className="flex flex-col">
                                                     <span className="text-gray-300 text-sm truncate">{getGovName(farmId)}</span>
                                                     <span className="text-[10px] text-gray-600 font-mono tracking-widest">{farmId}</span>
                                                 </div>
                                                 <button 
                                                    onClick={() => handleRemoveLink(farmId)}
                                                    className="p-2 border border-rose-500/30 text-rose-500/80 bg-rose-500/10 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                                                    title="Sever Overlink"
                                                 >
                                                     <Trash2 size={12} />
                                                     Unlink
                                                 </button>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
}
