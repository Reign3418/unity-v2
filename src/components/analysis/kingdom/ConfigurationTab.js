"use client";

import { useState, useEffect } from "react";
import { Cpu, Save, RefreshCw, Settings, ShieldAlert } from "lucide-react";
import AlgorithmMatrixEditor from "./AlgorithmMatrixEditor";

export default function ConfigurationTab({ targetKd }) {
    const BASELINE_CONFIG = {
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
        farmKpBaseline: 5000000,
        // Bracketed System
        b1Max: 24, b1Mult: 1.5,
        b2Max: 35, b2Mult: 2.0,
        b3Max: 45, b3Mult: 2.5,
        b4Max: 55, b4Mult: 3.0,
        b5Max: 70, b5Mult: 4.0,
        b6Mult: 5.0, // 71+
        bracketDeadsMultiplier: 0.02,
        // HOH System
        hohT4Kill: 1,
        hohT5Kill: 5,
        hohT4Dead: 15,
        hohT5Dead: 30
    };

    // 1. Core State
    const [config, setConfig] = useState(BASELINE_CONFIG);
    
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 2. Hydrate from Storage & Network
    useEffect(() => {
        let defaultConf = { ...BASELINE_CONFIG };
        const saved = localStorage.getItem("unity_dkp_config_v2");
        if (saved) {
            try {
                defaultConf = { ...BASELINE_CONFIG, ...JSON.parse(saved) };
                setConfig(defaultConf);
            } catch (e) {}
        }
        
        if (targetKd) {
            fetch(`/api/aws/admin/dkp-config?kd=${targetKd}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.config && Object.keys(data.config).length > 0) {
                        const mergedConfig = { ...BASELINE_CONFIG, ...data.config };
                        setConfig(mergedConfig);
                        localStorage.setItem("unity_dkp_config_v2", JSON.stringify(mergedConfig));
                    }
                })
                .catch(err => console.error("Failed to load DKP config from DB", err))
                .finally(() => setIsLoaded(true));
        } else {
            setIsLoaded(true);
        }
    }, [targetKd]);

    // 3. Save Function
    const saveConfig = async () => {
        setIsSaving(true);
        localStorage.setItem("unity_dkp_config_v2", JSON.stringify(config));
        
        if (targetKd) {
            try {
                await fetch(`/api/aws/admin/dkp-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kd: targetKd, configData: config })
                });
            } catch(e) {
                console.error("Failed to sync matrix to cloud", e);
            }
        }
        
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

            <AlgorithmMatrixEditor config={config} updateField={updateField} />
        </div>
    );
}
