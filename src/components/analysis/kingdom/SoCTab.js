import React, { useState, useEffect } from 'react';
import { MAP_TIMELINES } from '../../../constants/soc_timelines';
import { Calendar, Crosshairs, Sword, Map, Settings, Save, MapPin } from 'lucide-react';
import { addDays, format, isValid, parseISO } from 'date-fns';

export default function SoCTab({ targetKd }) {
    const [selectedMap, setSelectedMap] = useState("Siege of Orleans");
    const [regDate, setRegDate] = useState("");
    const [stratagems, setStratagems] = useState(() => {
        // Hydrate from localStorage
        const saved = typeof window !== "undefined" ? localStorage.getItem(`unity_soc_stratagems_${targetKd}`) : null;
        return saved ? JSON.parse(saved) : [
            { id: 1, title: 'Early Expansion', content: 'Secure Tier 1 passes immediately upon opening.' },
            { id: 2, title: 'Ruin Control', content: 'Rotate garrisons every 4 hours during Ancient Ruins.' }
        ];
    });

    // Save Stratagems to LocalStorage when updated
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(`unity_soc_stratagems_${targetKd}`, JSON.stringify(stratagems));
        }
    }, [stratagems, targetKd]);

    const handleStratagemChange = (id, field, value) => {
        setStratagems(stratagems.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const addStratagem = () => {
        setStratagems([...stratagems, { id: Date.now(), title: 'New Stratagem', content: '' }]);
    };
    
    const removeStratagem = (id) => {
        setStratagems(stratagems.filter(s => s.id !== id));
    };

    const timelineData = MAP_TIMELINES[selectedMap] || [];
    const baseDate = parseISO(regDate);
    const hasValidDate = isValid(baseDate);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                <div>
                    <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600 uppercase tracking-tight">
                        SOC Hub
                    </h2>
                    <p className="text-slate-400 mt-1 max-w-xl text-sm">
                        Season of Conquest interactive timeline and Stratagem planner. Based on your Registration Start Date, Unity autonomously predicts exactly when Twilight Chapters and map assets will unlatch.
                    </p>
                </div>

                <div className="flex gap-4 items-center bg-[#0f1115] p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 px-3">
                        <Map className="w-5 h-5 text-fuchsia-400" />
                        <select 
                            className="bg-transparent text-white border-0 focus:ring-0 text-sm font-bold cursor-pointer"
                            value={selectedMap}
                            onChange={(e) => setSelectedMap(e.target.value)}
                        >
                            <option value="Siege of Orleans">Siege of Orleans</option>
                            <option value="King of the Nile" disabled>King of the Nile (Coming Soon)</option>
                            <option value="March of the Ages" disabled>March of the Ages (Coming Soon)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Tactical Timeline Explorer */}
                <div className="xl:col-span-7 space-y-4">
                    <div className="bg-[#0f1115] border border-slate-800 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-400" />
                                Interactive Timeline
                            </h3>
                            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Date</span>
                                <input 
                                    type="date"
                                    value={regDate}
                                    onChange={(e) => setRegDate(e.target.value)}
                                    className="bg-transparent text-white text-sm focus:outline-none [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {!hasValidDate ? (
                            <div className="py-24 text-center border-2 border-dashed border-slate-800 rounded-xl">
                                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                                <h4 className="text-lg font-bold text-slate-300">Awaiting Calibration</h4>
                                <p className="text-slate-500 text-sm mt-1">Select your KvK Registration Start Date to build the chronological timeline.</p>
                            </div>
                        ) : (
                            <div className="relative border-l border-slate-800 ml-4 space-y-8 py-4">
                                {timelineData.map((ev, idx) => {
                                    const eventDate = addDays(baseDate, ev.offsetDays);
                                    const isPast = eventDate < new Date();
                                    
                                    return (
                                        <div key={idx} className="relative pl-8 group">
                                            {/* Node Marker */}
                                            <div className={`absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full transition-all duration-300 ${isPast ? 'bg-slate-600' : 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]'}`} />
                                            
                                            <div className={`transition-all duration-300 ${isPast ? 'opacity-40 hover:opacity-80' : 'opacity-100'}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                                    <h4 className="text-md font-bold text-slate-100">
                                                        {ev.title}
                                                    </h4>
                                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                                        {format(eventDate, "MMMM do, yyyy")}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400">{ev.description}</p>
                                                {ev.durationDays > 0 && (
                                                    <div className="flex gap-4 mt-2">
                                                        <span className="text-xs text-fuchsia-400/80 font-medium">
                                                            Phase Duration: {ev.durationDays < 1 ? Math.round(ev.durationDays * 24) + " Hours" : ev.durationDays + " Days"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stratagems Panel */}
                <div className="xl:col-span-5 space-y-4">
                    <div className="bg-[#0f1115] border border-slate-800 rounded-2xl p-6 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Sword className="w-5 h-5 text-rose-500" />
                                Stratagems Board
                            </h3>
                            <button 
                                onClick={addStratagem}
                                className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wider"
                            >
                                + Add Order
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {stratagems.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-8">No Stratagems recorded. Create your first tactical order above.</p>
                            ) : (
                                stratagems.map((strat) => (
                                    <div key={strat.id} className="group relative bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden transition-all focus-within:border-rose-500/50">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/30 group-focus-within:bg-rose-500 transition-colors" />
                                        
                                        <div className="flex justify-between items-start mb-2">
                                            <input 
                                                type="text"
                                                value={strat.title}
                                                onChange={(e) => handleStratagemChange(strat.id, 'title', e.target.value)}
                                                className="bg-transparent text-slate-200 font-bold outline-none w-full"
                                                placeholder="Phase Title..."
                                            />
                                            <button 
                                                onClick={() => removeStratagem(strat.id)}
                                                className="text-slate-600 hover:text-rose-500 transition-colors px-2"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        
                                        <textarea 
                                            value={strat.content}
                                            onChange={(e) => handleStratagemChange(strat.id, 'content', e.target.value)}
                                            className="w-full bg-transparent text-sm text-slate-400 outline-none resize-none min-h-[60px]"
                                            placeholder="Specify tactical directives, marching routes, and garrison rotation sequences here..."
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
