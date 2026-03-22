"use client";

import { useState } from "react";
import { Mail, Edit3, ShieldAlert, Send, Flame, RefreshCw, Copy, Check } from "lucide-react";

export default function MailGenerator() {
  const [copied, setCopied] = useState(false);
  const [mailType, setMailType] = useState("mge");
  const [variables, setVariables] = useState({
    title: "MGE Stage 5 Protocol",
    kingdom: "3155",
    time: "00:00 UTC",
    target: "750,000",
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

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMailText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10 w-full mb-2">
          <Mail className="text-rose-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">System Mail Generator</h1>
            <p className="text-rose-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Automated Diplomatic and Strategic Broadcasting</p>
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
            </div>
        </div>

        {/* Right Column: Output Preview */}
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl flex flex-col h-full">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
              <div className="flex flex-row items-center gap-2">
                <Send className="text-emerald-500" size={18} />
                <span className="text-white font-bold text-sm tracking-widest uppercase">Draft Preview</span>
              </div>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  copied 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-[#1e222b] text-gray-400 hover:text-white border border-transparent hover:border-gray-600'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} 
                {copied ? 'Copied' : 'Copy'}
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
