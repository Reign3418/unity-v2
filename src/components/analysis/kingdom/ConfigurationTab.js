"use client";

import { useState, useEffect } from "react";
import { Cpu, Save, RefreshCw, Settings, ShieldAlert } from "lucide-react";

export default function ConfigurationTab() {
    // 1. Core State
    const [config, setConfig] = useState({
        dkpSystem: "advanced",
        // Basic System
        basicT4Points: 10,
        basicT5Points: 20,
        basicDeadsPoints: 30,
        // Advanced System
        deadsMultiplier: 0.02,
        deadsWeight: 50,
        kpPowerDivisor: 3,
        t5MixRatio: 0.7,
        kpMultiplier: 1.25,
        advT4Points: 10,
        advT5Points: 20,
        farmDeadsBaseline: 500000,
        farmKpBaseline: 5000000
    });
    
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 2. Hydrate from Storage
    useEffect(() => {
        const saved = localStorage.getItem("unity_dkp_config_v2");
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load DKP config", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // 3. Save Function
    const saveConfig = () => {
        setIsSaving(true);
        localStorage.setItem("unity_dkp_config_v2", JSON.stringify(config));
        
        // Simulate network save latency for UX
        setTimeout(() => {
            setIsSaving(false);
            alert("✅ DKP Multiplier Matrix Cached Successfully!");
        }, 600);
    };

    // 4. Input Handler
    const updateField = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (!isLoaded) return null;

    return (
        <div className="animate-fade-in w-full max-w-5xl mx-auto pb-12">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#1e222b]">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <Cpu className="text-purple-400 w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-widest text-white">Algorithm Matrix</h2>
                        <p className="text-gray-500 text-sm">Configure global constraints and multipliers for the Master DKP processor.</p>
                    </div>
                </div>
                
                <button 
                    onClick={saveConfig}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] disabled:opacity-50"
                >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? "Locking..." : "Lock Parameters"}
                </button>
            </div>

            {/* Matrix Form */}
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden group">
                <h3 className="flex items-center gap-2 text-white font-bold uppercase tracking-widest mb-6">
                    <Settings className="w-5 h-5 text-purple-400" /> Operational Mode
                </h3>
                
                <div className="mb-6">
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">DKP Calculation Engine</label>
                    <select 
                        value={config.dkpSystem}
                        onChange={(e) => updateField('dkpSystem', e.target.value)}
                        className="w-full bg-[#0a0c0f] border border-[#1e222b] rounded-lg py-3 px-4 text-white font-bold outline-none focus:border-purple-500 transition-colors cursor-pointer"
                    >
                        <option value="advanced">Advanced DKP System (Target & Percentages)</option>
                        <option value="basic">Basic DKP System (Flat Multipliers)</option>
                    </select>
                </div>

                {config.dkpSystem === "basic" ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">T4 Points Multiplier</label>
                            <input type="number" value={config.basicT4Points} onChange={(e) => updateField('basicT4Points', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                        </div>
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">T5 Points Multiplier</label>
                            <input type="number" value={config.basicT5Points} onChange={(e) => updateField('basicT5Points', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                        </div>
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">Deads Points Multiplier</label>
                            <input type="number" value={config.basicDeadsPoints} onChange={(e) => updateField('basicDeadsPoints', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">Deads Multiplier</label>
                            <input type="number" value={config.deadsMultiplier} onChange={(e) => updateField('deadsMultiplier', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="0.01" />
                        </div>
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">Deads Weight</label>
                            <input type="number" value={config.deadsWeight} onChange={(e) => updateField('deadsWeight', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                        </div>
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">KP Power Divisor</label>
                            <input type="number" value={config.kpPowerDivisor} onChange={(e) => updateField('kpPowerDivisor', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="0.1" />
                        </div>
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">T5 Mix Ratio</label>
                            <input type="number" value={config.t5MixRatio} onChange={(e) => updateField('t5MixRatio', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="0.01" />
                        </div>
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">KP Multiplier</label>
                            <input type="number" value={config.kpMultiplier} onChange={(e) => updateField('kpMultiplier', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="0.05" />
                        </div>
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">T4 Points</label>
                            <input type="number" value={config.advT4Points} onChange={(e) => updateField('advT4Points', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                        </div>
                        <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                            <label className="block text-sm font-semibold text-secondary mb-2">T5 Points</label>
                            <input type="number" value={config.advT5Points} onChange={(e) => updateField('advT5Points', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                        </div>
                        <div className="bg-purple-900/10 p-5 rounded-xl border border-purple-500/20">
                            <label className="block text-sm font-semibold text-purple-400 mb-2">Farm Deads Baseline</label>
                            <input type="number" value={config.farmDeadsBaseline} onChange={(e) => updateField('farmDeadsBaseline', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="50000" />
                        </div>
                        <div className="bg-purple-900/10 p-5 rounded-xl border border-purple-500/20">
                            <label className="block text-sm font-semibold text-purple-400 mb-2">Farm KP Baseline</label>
                            <input type="number" value={config.farmKpBaseline} onChange={(e) => updateField('farmKpBaseline', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="500000" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
