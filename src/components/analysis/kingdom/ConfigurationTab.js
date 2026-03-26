"use client";

import { useState, useEffect } from "react";
import { Cpu, Save, RefreshCw, Settings, ShieldAlert, AlertTriangle, Fingerprint } from "lucide-react";

export default function ConfigurationTab() {
    // 1. Core State
    const [config, setConfig] = useState({
        dkpSystem: "basic",
        baseQuota: 30000000,
        t4KillWeight: 1.0,
        t5KillWeight: 1.0,
        basicDeadWeight: 3.0,
        advT4DeadWeight: 10.0,
        advT5DeadWeight: 15.0
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Global Operation Mode */}
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                    
                    <h3 className="flex items-center gap-2 text-white font-bold uppercase tracking-widest mb-6">
                        <Settings className="w-5 h-5 text-purple-400" /> Operational Mode
                    </h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">DKP Calculation Engine</label>
                            <select 
                                value={config.dkpSystem}
                                onChange={(e) => updateField('dkpSystem', e.target.value)}
                                className="w-full bg-[#0a0c0f] border border-[#1e222b] rounded-lg py-3 px-4 text-white font-bold outline-none focus:border-purple-500 transition-colors cursor-pointer"
                            >
                                <option value="basic">Standard DKP Array</option>
                                <option value="advanced">Advanced Hall of Heroes Resolution</option>
                            </select>
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-2">
                                {config.dkpSystem === 'basic' ? 'Aggregates all Tier deaths into a single unified multiplier matrix.' : 'Scans T4 and T5 death logs independently strictly parsing Hall of Heroes datasets.'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Base Minimum Quota</label>
                            <div className="relative">
                                <TargetIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input 
                                    type="number"
                                    value={config.baseQuota}
                                    onChange={(e) => updateField('baseQuota', Number(e.target.value))}
                                    className="w-full bg-[#0a0c0f] border border-[#1e222b] rounded-lg py-3 pl-10 pr-4 text-white font-mono font-bold outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tactical Kill Weights */}
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 -translate-x-1/2"></div>
                    
                    <h3 className="flex items-center gap-2 text-white font-bold uppercase tracking-widest mb-6">
                        <CrosshairIcon className="w-5 h-5 text-cyan-400" /> Tactical Kill Multipliers
                    </h3>
                    
                    <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-[#1e222b] pb-4">
                            <div>
                                <span className="block text-white font-bold tracking-widest">T4 Kills Coefficient</span>
                                <span className="block text-[10px] text-gray-500 uppercase">Ratio per individual T4 kill</span>
                            </div>
                            <input 
                                type="number" step="0.1"
                                value={config.t4KillWeight}
                                onChange={(e) => updateField('t4KillWeight', Number(e.target.value))}
                                className="w-24 bg-[#0a0c0f] border border-[#1e222b] rounded text-white font-mono text-center py-2 focus:border-cyan-500 outline-none transition-colors"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div>
                                <span className="block text-amber-400 font-bold tracking-widest">T5 Kills Coefficient</span>
                                <span className="block text-[10px] text-gray-500 uppercase">Ratio per individual T5 kill</span>
                            </div>
                            <input 
                                type="number" step="0.1"
                                value={config.t5KillWeight}
                                onChange={(e) => updateField('t5KillWeight', Number(e.target.value))}
                                className="w-24 bg-[#0a0c0f] border border-amber-500/30 rounded text-white font-mono text-center py-2 focus:border-amber-500 outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Dead Weights */}
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-rose-500/30 transition-colors md:col-span-2">
                    <div className="absolute bottom-0 right-1/2 w-64 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/2"></div>
                    
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="flex items-center gap-2 text-white font-bold uppercase tracking-widest">
                            <ShieldAlert className="w-5 h-5 text-rose-500" /> Hospital/Death Multipliers
                        </h3>
                        {config.dkpSystem === 'advanced' && <span className="bg-rose-500/10 text-rose-500 text-[10px] uppercase tracking-widest px-2 py-1 rounded font-bold border border-rose-500/20">Advanced Resolution Linked</span>}
                        {config.dkpSystem === 'basic' && <span className="bg-gray-800 text-gray-400 text-[10px] uppercase tracking-widest px-2 py-1 rounded font-bold border border-gray-700">Standard Resolution Linked</span>}
                    </div>
                    
                    {config.dkpSystem === "basic" ? (
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-5 flex items-center justify-between">
                            <div>
                                <span className="block text-white font-bold tracking-widest">Unified Death Coefficient</span>
                                <span className="block text-xs text-rose-400/80 uppercase tracking-widest mt-1">Multiplier applied universally to all detected combat deaths.</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 font-bold">×</span>
                                <input 
                                    type="number" step="0.1"
                                    value={config.basicDeadWeight}
                                    onChange={(e) => updateField('basicDeadWeight', Number(e.target.value))}
                                    className="w-32 bg-[#0a0c0f] border border-rose-500/30 rounded text-rose-400 font-black text-xl text-center py-3 focus:border-rose-500 shadow-[inset_0_0_10px_rgba(244,63,94,0.1)] outline-none transition-colors"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-5 flex items-center justify-between">
                                 <div>
                                     <span className="block text-gray-300 font-bold tracking-widest">T4 HoH Resolution</span>
                                     <span className="block text-[10px] text-gray-500 uppercase tracking-widest mt-1">Multiplier for verified T4 deaths.</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className="text-gray-500 font-bold">×</span>
                                     <input 
                                         type="number" step="0.1"
                                         value={config.advT4DeadWeight}
                                         onChange={(e) => updateField('advT4DeadWeight', Number(e.target.value))}
                                         className="w-24 bg-[#0a0c0f] border border-purple-500/30 rounded text-white font-mono text-center py-2 focus:border-purple-500 outline-none transition-colors"
                                     />
                                 </div>
                             </div>

                             <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5 flex items-center justify-between">
                                 <div>
                                     <span className="block text-amber-500 font-bold tracking-widest">T5 HoH Resolution</span>
                                     <span className="block text-[10px] text-gray-500 uppercase tracking-widest mt-1">Multiplier for verified T5 deaths.</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className="text-gray-500 font-bold">×</span>
                                     <input 
                                         type="number" step="0.1"
                                         value={config.advT5DeadWeight}
                                         onChange={(e) => updateField('advT5DeadWeight', Number(e.target.value))}
                                         className="w-24 bg-[#0a0c0f] border border-amber-500/30 rounded text-white font-mono text-center py-2 focus:border-amber-500 outline-none transition-colors"
                                     />
                                 </div>
                             </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// Icon Helpers missing from direct import context
function TargetIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
        </svg>
    );
}
function CrosshairIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>
        </svg>
    );
}
