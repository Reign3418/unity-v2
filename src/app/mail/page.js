"use client";

import { useState } from "react";
import { Mail, Edit3, ShieldAlert, Send, Flame, RefreshCw, Copy, Check, Crosshair, CalendarDays, BellRing } from "lucide-react";

export default function MailGenerator() {
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [mailType, setMailType] = useState("mge");
  const [variables, setVariables] = useState({
    title: "MGE Stage 5 Protocol",
    kingdom: "3155",
    time: "00:00 UTC",
    target: "750,000",
  });
  
  const [scheduleEvent, setScheduleEvent] = useState(false);
  const [pushToDiscord, setPushToDiscord] = useState(true);
  const [scheduleData, setScheduleData] = useState({
    date: "",
    time: "",
    offset: "0"
  });

  const generateMailText = () => {
    switch(mailType) {
      case "mge":
        return `⚠️ KINGDOM ${variables.kingdom} DIRECTIVE ⚠️\n\nMightiest Governor Stage 5 (Kill Event) initiates at ${variables.time}.\n\nRules of Engagement:\n1. The Point Cap is strictly set to ${variables.target} points.\n2. Do NOT hit farms or farmers.\n3. Do NOT hit cities zeroed outside of Zone 1.\n\nViolators will be zeroed. Ensure you abide by all title rotations.\n\n- High Command`;
      case "kvk":
        return `🔥 LIGHT VS DARK PREPARATION 🔥\n\nAttention Kingdom ${variables.kingdom},\n\nMatchmaking protocols lock in soon. All players must ensure hospital capacities are managed and resources are packed.\n\nRuins open exactly at ${variables.time}. Formations must be T4+ Infantry strictly.`;
      case "rogue":
        return `🚨 ROGUE ALERT 🚨\n\nTarget located in Zone 3.\n\nDo not reinforce without high command orders. Rally leaders are preparing at ${variables.time}.\n\nStay out of the AoE.`;
      default:
        return "Drafting new mail template...";
    }
  };

  const handleDeploy = async () => {
    const text = generateMailText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    if (!scheduleEvent && !pushToDiscord) return; // Only copying to clipboard

    setIsDeploying(true);
    try {
        const payload = {
            mailText: text,
            mailType,
            pushToDiscord,
            scheduleData: scheduleEvent ? scheduleData : null
        };
        const res = await fetch('/api/command-center', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) {
            alert("Database Sync Failed: " + data.error);
        }
    } catch (e) {
        console.error("Deploy Error", e);
        alert("Network Payload Failed.");
    } finally {
        setIsDeploying(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10 w-full mb-2">
          <Crosshair className="text-rose-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Unified Command Center</h1>
            <p className="text-rose-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Mail, Event Mapping, and Discord Dispatch Matrix</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Form Editor */}
        <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg border-t-2 border-t-rose-500 relative">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
              <Edit3 className="text-rose-500" size={20} />
              <h2 className="text-white font-bold">Mail Parameters</h2>
            </div>
            
            <div className="p-6 space-y-5">
               {/* Template Selector */}
               <div className="flex gap-2 bg-[#0a0c0f] p-1.5 rounded-lg border border-[#1e222b]">
                  <button 
                    onClick={() => setMailType('mge')} 
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${mailType === 'mge' ? 'bg-rose-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >MGE Rules</button>
                  <button 
                    onClick={() => setMailType('kvk')} 
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${mailType === 'kvk' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >KvK Push</button>
                  <button 
                    onClick={() => setMailType('rogue')} 
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors ${mailType === 'rogue' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >Rogue Alert</button>
               </div>

               <div>
                 <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Kingdom Target</label>
                 <input 
                   type="text" 
                   value={variables.kingdom}
                   onChange={e => setVariables({...variables, kingdom: e.target.value})}
                   className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg font-mono text-sm outline-none focus:border-rose-500 transition-colors"
                 />
               </div>

               <div>
                 <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Execution Time (UTC)</label>
                 <input 
                   type="text" 
                   value={variables.time}
                   onChange={e => setVariables({...variables, time: e.target.value})}
                   className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg font-mono text-sm outline-none focus:border-rose-500 transition-colors"
                 />
               </div>

               {mailType === 'mge' && (
                 <div>
                   <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Point Limit Target</label>
                   <input 
                     type="text" 
                     value={variables.target}
                     onChange={e => setVariables({...variables, target: e.target.value})}
                     className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg font-mono text-sm outline-none focus:border-rose-500 transition-colors"
                   />
                 </div>
               )}

               <div className="border-t border-[#1e222b] pt-5 mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <BellRing className="text-amber-500" size={18} />
                        <div>
                           <p className="text-white font-bold text-sm tracking-widest uppercase">Discord Webhook</p>
                           <p className="text-[10px] text-gray-500 font-medium">Broadcast mail natively to external Server Channels</p>
                        </div>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={pushToDiscord} onChange={() => setPushToDiscord(!pushToDiscord)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-[#1e222b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                     </label>
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <CalendarDays className="text-violet-500" size={18} />
                        <div>
                           <p className="text-white font-bold text-sm tracking-widest uppercase">Chronological Sync</p>
                           <p className="text-[10px] text-gray-500 font-medium">Map this event to the Global Trajectory Timeline DB</p>
                        </div>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={scheduleEvent} onChange={() => setScheduleEvent(!scheduleEvent)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-[#1e222b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
                     </label>
                  </div>
               </div>

               {scheduleEvent && (
                  <div className="bg-[#1e222b]/50 border border-[#1e222b] p-4 rounded-xl space-y-4 animate-in fade-in duration-200">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Local Date</label>
                           <input type="date" value={scheduleData.date} onChange={e => setScheduleData({...scheduleData, date: e.target.value})} className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white p-3 rounded-lg text-sm outline-none focus:border-violet-500" />
                        </div>
                        <div>
                           <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Local Time</label>
                           <input type="time" value={scheduleData.time} onChange={e => setScheduleData({...scheduleData, time: e.target.value})} className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white p-3 rounded-lg text-sm outline-none focus:border-violet-500" />
                        </div>
                     </div>
                     <div>
                        <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Timezone Offset (vs UTC)</label>
                        <input type="number" value={scheduleData.offset} placeholder="-4" onChange={e => setScheduleData({...scheduleData, offset: e.target.value})} className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white p-3 rounded-lg text-sm outline-none focus:border-violet-500" />
                     </div>
                  </div>
               )}

            </div>
        </div>

        {/* Right Column: Output Preview */}
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl flex flex-col h-full">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
              <div className="flex flex-row items-center gap-2">
                <Send className="text-cyan-500" size={18} />
                <span className="text-white font-bold text-sm tracking-widest uppercase">Draft Preview</span>
              </div>
              <button 
                onClick={handleDeploy}
                disabled={isDeploying || (scheduleEvent && (!scheduleData.date || !scheduleData.time))}
                className={`flex items-center gap-2 px-6 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                  copied 
                  ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(243,24,70,0.5)]' 
                  : 'bg-white text-black hover:bg-gray-200 shadow-xl'
                } disabled:opacity-50`}
              >
                {isDeploying ? <RefreshCw size={14} className="animate-spin" /> : (copied ? <Check size={14} /> : <Send size={14} />)} 
                {isDeploying ? 'Deploying...' : (copied ? 'Deployed!' : 'Execute Vector')}
              </button>
            </div>
            
            <div className="p-6 flex-1 bg-[#13161c]">
               <textarea 
                 readOnly
                 value={generateMailText()}
                 className="w-full h-full min-h-[300px] bg-transparent text-gray-300 font-mono text-sm leading-relaxed outline-none resize-none selection:bg-rose-500/30"
               ></textarea>
            </div>
        </div>

      </div>

    </div>
  );
}
