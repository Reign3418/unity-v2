import { Settings, ShieldAlert } from "lucide-react";

export default function AlgorithmMatrixEditor({ config, updateField }) {
    if (!config) return null;

    return (
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
                    <option value="bracketed">Bracketed Targets (Dynamic Multipliers)</option>
                    <option value="hoh">HOH DKP System (KvK Event Agreement)</option>
                </select>
            </div>

            {config.dkpSystem === "hoh" ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-[#151921] p-5 rounded-xl border border-purple-500/20">
                        <label className="block text-sm font-semibold text-purple-400 mb-2">T4 Kill Points</label>
                        <input type="number" value={config.hohT4Kill || 1} readOnly
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-gray-500 rounded-lg p-3 outline-none cursor-not-allowed" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-purple-500/20">
                        <label className="block text-sm font-semibold text-purple-400 mb-2">T5 Kill Points</label>
                        <input type="number" value={config.hohT5Kill || 5} readOnly
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-gray-500 rounded-lg p-3 outline-none cursor-not-allowed" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-emerald-500/20">
                        <label className="block text-sm font-semibold text-emerald-400 mb-2">T4 Death Points</label>
                        <input type="number" value={config.hohT4Dead || 15} readOnly
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-gray-500 rounded-lg p-3 outline-none cursor-not-allowed" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-emerald-500/20">
                        <label className="block text-sm font-semibold text-emerald-400 mb-2">T5 Death Points</label>
                        <input type="number" value={config.hohT5Dead || 30} readOnly
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-gray-500 rounded-lg p-3 outline-none cursor-not-allowed" />
                    </div>
                    <div className="col-span-full mt-2">
                        <p className="text-sm text-gray-500 font-mono"><ShieldAlert className="inline w-4 h-4 mb-1" /> Notice: HOH parameters are locked by kingdom agreement and cannot be dynamically modified.</p>
                    </div>
                </div>
            ) : config.dkpSystem === "basic" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">T4 Points Multiplier</label>
                        <input type="number" value={config.basicT4Points || 0} onChange={(e) => updateField('basicT4Points', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">T5 Points Multiplier</label>
                        <input type="number" value={config.basicT5Points || 0} onChange={(e) => updateField('basicT5Points', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">Deads Points Multiplier</label>
                        <input type="number" value={config.basicDeadsPoints || 0} onChange={(e) => updateField('basicDeadsPoints', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                    </div>
                </div>
            ) : config.dkpSystem === "bracketed" ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#151921] p-5 rounded-xl border border-rose-900/40">
                            <label className="block text-sm font-semibold text-rose-400 mb-2">Base Deads Multiplier</label>
                            <input type="number" value={config.bracketDeadsMultiplier || 0} onChange={(e) => updateField('bracketDeadsMultiplier', Number(e.target.value))}
                                className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-rose-500" step="0.01" />
                        </div>
                    </div>
                    
                    <div className="border border-[#1e222b] rounded-xl overflow-hidden">
                        <div className="bg-[#1a1df2]/10 p-3 border-b border-[#1e222b]">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest text-center">Power Bracket Multipliers</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0 bg-[#0a0c0f]">
                            {/* Bracket 1 */}
                            <div className="p-4 border-r border-b border-[#1e222b] flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-1 h-6 whitespace-nowrap">
                                    <span className="text-xs font-bold text-gray-500">&lt;=</span>
                                    <input type="number" value={config.b1Max || 0} onChange={(e) => updateField('b1Max', Number(e.target.value))} className="w-10 bg-transparent text-white font-bold border-b border-gray-700 outline-none focus:border-indigo-500 text-center text-sm px-1" />
                                    <span className="text-xs text-gray-500">M</span>
                                </div>
                                <div className="flex items-center gap-2 bg-[#151921] p-2 rounded-lg border border-[#2a2f3a]">
                                    <input type="number" value={config.b1Mult || 0} onChange={(e) => updateField('b1Mult', Number(e.target.value))} step="0.1" className="w-full bg-transparent text-indigo-400 font-bold outline-none text-center" />
                                    <span className="text-xs text-gray-400 font-bold">x</span>
                                </div>
                            </div>
                            {/* Bracket 2 */}
                            <div className="p-4 border-r border-b border-[#1e222b] flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-1 h-6 whitespace-nowrap">
                                    <span className="text-xs text-gray-500">{(config.b1Max || 0) + 1} -</span>
                                    <input type="number" value={config.b2Max || 0} onChange={(e) => updateField('b2Max', Number(e.target.value))} className="w-10 bg-transparent text-white font-bold border-b border-gray-700 outline-none focus:border-indigo-500 text-center text-sm px-1" />
                                    <span className="text-xs text-gray-500">M</span>
                                </div>
                                <div className="flex items-center gap-2 bg-[#151921] p-2 rounded-lg border border-[#2a2f3a]">
                                    <input type="number" value={config.b2Mult || 0} onChange={(e) => updateField('b2Mult', Number(e.target.value))} step="0.1" className="w-full bg-transparent text-indigo-400 font-bold outline-none text-center" />
                                    <span className="text-xs text-gray-400 font-bold">x</span>
                                </div>
                            </div>
                            {/* Bracket 3 */}
                            <div className="p-4 border-r border-b border-[#1e222b] flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-1 h-6 whitespace-nowrap">
                                    <span className="text-xs text-gray-500">{(config.b2Max || 0) + 1} -</span>
                                    <input type="number" value={config.b3Max || 0} onChange={(e) => updateField('b3Max', Number(e.target.value))} className="w-10 bg-transparent text-white font-bold border-b border-gray-700 outline-none focus:border-indigo-500 text-center text-sm px-1" />
                                    <span className="text-xs text-gray-500">M</span>
                                </div>
                                <div className="flex items-center gap-2 bg-[#151921] p-2 rounded-lg border border-[#2a2f3a]">
                                    <input type="number" value={config.b3Mult || 0} onChange={(e) => updateField('b3Mult', Number(e.target.value))} step="0.1" className="w-full bg-transparent text-indigo-400 font-bold outline-none text-center" />
                                    <span className="text-xs text-gray-400 font-bold">x</span>
                                </div>
                            </div>
                            {/* Bracket 4 */}
                            <div className="p-4 border-r lg:border-b-0 border-b border-[#1e222b] flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-1 h-6 whitespace-nowrap">
                                    <span className="text-xs text-gray-500">{(config.b3Max || 0) + 1} -</span>
                                    <input type="number" value={config.b4Max || 0} onChange={(e) => updateField('b4Max', Number(e.target.value))} className="w-10 bg-transparent text-white font-bold border-b border-gray-700 outline-none focus:border-indigo-500 text-center text-sm px-1" />
                                    <span className="text-xs text-gray-500">M</span>
                                </div>
                                <div className="flex items-center gap-2 bg-[#151921] p-2 rounded-lg border border-[#2a2f3a]">
                                    <input type="number" value={config.b4Mult || 0} onChange={(e) => updateField('b4Mult', Number(e.target.value))} step="0.1" className="w-full bg-transparent text-indigo-400 font-bold outline-none text-center" />
                                    <span className="text-xs text-gray-400 font-bold">x</span>
                                </div>
                            </div>
                            {/* Bracket 5 */}
                            <div className="p-4 border-r lg:border-b-0 border-b border-[#1e222b] flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-1 h-6 whitespace-nowrap">
                                    <span className="text-xs text-gray-500">{(config.b4Max || 0) + 1} -</span>
                                    <input type="number" value={config.b5Max || 0} onChange={(e) => updateField('b5Max', Number(e.target.value))} className="w-10 bg-transparent text-white font-bold border-b border-gray-700 outline-none focus:border-indigo-500 text-center text-sm px-1" />
                                    <span className="text-xs text-gray-500">M</span>
                                </div>
                                <div className="flex items-center gap-2 bg-[#151921] p-2 rounded-lg border border-[#2a2f3a]">
                                    <input type="number" value={config.b5Mult || 0} onChange={(e) => updateField('b5Mult', Number(e.target.value))} step="0.1" className="w-full bg-transparent text-indigo-400 font-bold outline-none text-center" />
                                    <span className="text-xs text-gray-400 font-bold">x</span>
                                </div>
                            </div>
                            {/* Bracket 6 (Max) */}
                            <div className="p-4 flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-1 h-6 whitespace-nowrap">
                                    <span className="text-xs text-gray-500 font-bold">{(config.b5Max || 0) + 1}+ M</span>
                                </div>
                                <div className="flex items-center gap-2 bg-[#151921] p-2 rounded-lg border border-[#2a2f3a]">
                                    <input type="number" value={config.b6Mult || 0} onChange={(e) => updateField('b6Mult', Number(e.target.value))} step="0.1" className="w-full bg-transparent text-indigo-400 font-bold outline-none text-center" />
                                    <span className="text-xs text-gray-400 font-bold">x</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10">
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">Deads Multiplier</label>
                        <input type="number" value={config.deadsMultiplier || 0} onChange={(e) => updateField('deadsMultiplier', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="0.01" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">Deads Weight</label>
                        <input type="number" value={config.deadsWeight || 0} onChange={(e) => updateField('deadsWeight', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">KP Power Divisor</label>
                        <input type="number" value={config.kpPowerDivisor || 0} onChange={(e) => updateField('kpPowerDivisor', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="0.1" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">T5 Mix Ratio</label>
                        <input type="number" value={config.t5MixRatio || 0} onChange={(e) => updateField('t5MixRatio', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="0.01" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">KP Multiplier</label>
                        <input type="number" value={config.kpMultiplier || 0} onChange={(e) => updateField('kpMultiplier', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="0.05" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">T4 Points</label>
                        <input type="number" value={config.advT4Points || 0} onChange={(e) => updateField('advT4Points', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                    </div>
                    <div className="bg-[#151921] p-5 rounded-xl border border-[#1e222b]">
                        <label className="block text-sm font-semibold text-secondary mb-2">T5 Points</label>
                        <input type="number" value={config.advT5Points || 0} onChange={(e) => updateField('advT5Points', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="1" />
                    </div>
                    <div className="bg-purple-900/10 p-5 rounded-xl border border-purple-500/20">
                        <label className="block text-sm font-semibold text-purple-400 mb-2">Farm Deads Baseline</label>
                        <input type="number" value={config.farmDeadsBaseline || 0} onChange={(e) => updateField('farmDeadsBaseline', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="50000" />
                    </div>
                    <div className="bg-purple-900/10 p-5 rounded-xl border border-purple-500/20">
                        <label className="block text-sm font-semibold text-purple-400 mb-2">Farm KP Baseline</label>
                        <input type="number" value={config.farmKpBaseline || 0} onChange={(e) => updateField('farmKpBaseline', Number(e.target.value))}
                            className="w-full bg-[#0a0c0f] border border-[#2a2f3a] text-white rounded-lg p-3 outline-none focus:border-purple-500" step="500000" />
                    </div>
                </div>
            )}
        </div>
    );
}
