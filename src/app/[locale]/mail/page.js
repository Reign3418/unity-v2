"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Edit3, ShieldAlert, Send, Flame, RefreshCw, Copy, Check, Crosshair, CalendarDays, BellRing, Database, Save, FolderOpen, Bold, Italic, Type, Palette, Eye } from "lucide-react";

export default function MailGenerator() {
  const [copied, setCopied] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  
  const [scheduleEvent, setScheduleEvent] = useState(false);
  const [pushToDiscord, setPushToDiscord] = useState(true);
  const [scheduleData, setScheduleData] = useState({
    date: "",
    time: "",
    offset: "0"
  });

  const [customText, setCustomText] = useState("");
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const textareaRef = useRef(null);

  useEffect(() => {
     const matrixRoster = localStorage.getItem('unty_mail_roster') || localStorage.getItem('unity_mail_roster');
     if (matrixRoster) {
         try {
             const parsed = JSON.parse(matrixRoster);
             
             if (Array.isArray(parsed)) {
                 const reportObj = parsed[0];
                 setCustomText(reportObj.customText || JSON.stringify(parsed, null, 2));
             } else {
                 let formattedText = `[${parsed.reportName || 'TARGET ROSTER ACQUIRED'}]\n\n`;
                 if (parsed.summary) formattedText += `SUMMARY: ${parsed.summary}\n────────────────────\n\n`;
                 
                 if (Array.isArray(parsed.data)) {
                     formattedText += parsed.data.join('\n');
                 } else {
                     formattedText += parsed.data || "";
                 }
                 setCustomText(formattedText + `\n\n[End Transmission]`);
             }
         } catch (e) {
             setCustomText(`[TARGET ROSTER ACQUIRED]\n\n${matrixRoster}\n\n`);
         }
         localStorage.removeItem('unty_mail_roster');
         localStorage.removeItem('unity_mail_roster');
     }

     const fetchTemplates = async () => {
         setLoadingTemplates(true);
         try {
             const res = await fetch("/api/aws/mail/load");
             const data = await res.json();
             if (data.success) {
                 setSavedTemplates(data.templates || []);
             }
         } catch (e) {
             console.error("Failed to load templates", e);
         } finally {
             setLoadingTemplates(false);
         }
     };
     fetchTemplates();
  }, []);

  const executeSaveTemplate = async () => {
      if (!templateNameInput || !customText) return alert("You must provide a Template Title and Body Text.");
      if (customText.length > 2000) return alert("Template body exceeds 2,000 characters limit.");
      setSavingTemplate(true);
      try {
          const res = await fetch("/api/aws/mail/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ templateName: templateNameInput, templateText: customText })
          });
          const data = await res.json();
          if (data.success) {
              setSavedTemplates([data.data, ...savedTemplates]);
              setTemplateNameInput("");
              alert("Template Cached to the Kingdom Vault!");
          } else {
              alert(data.error);
          }
      } catch (e) {
          alert("Network Payload Failed.");
      } finally {
          setSavingTemplate(false);
      }
  };

  const handleCopy = () => {
    if (!customText) return;
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeploy = async () => {
    if (!scheduleEvent && !pushToDiscord) return;

    // Pull the active kingdom from localStorage as a client-side fallback
    const activeKingdomId = typeof window !== 'undefined' ? localStorage.getItem('unty_active_kd') : null;

    setIsDeploying(true);
    try {
        const payload = {
            mailText: customText,
            mailType: "custom",
            pushToDiscord,
            scheduleData: scheduleEvent ? scheduleData : null,
            kingdomId: activeKingdomId || null
        };
        const res = await fetch('/api/command-center', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) {
            alert("Deploy Failed: " + (data.error || "Unknown error"));
        }
    } catch (e) {
        console.error("Deploy Error", e);
        alert("Network Payload Failed.");
    } finally {
        setIsDeploying(false);
    }
  };

  const applyFormatting = (tagOpen, tagClose) => {
      if (!textareaRef.current) return;
      
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      
      const before = customText.substring(0, start);
      const selected = customText.substring(start, end) || "TEXT";
      const after = customText.substring(end);
      
      const newText = before + tagOpen + selected + tagClose + after;
      setCustomText(newText);
      
      setTimeout(() => {
          if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
          }
      }, 0);
  };

  const parseBBCodeToHTML = (text) => {
      if (!text) return "";
      let html = text
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br/>");
          
      // Parse nested tags safely
      for(let i=0; i<4; i++) {
          html = html
              .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gis, "<b>$1</b>")
              .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gis, "<i>$1</i>")
              .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gis, "<u>$1</u>")
              .replace(/&lt;s&gt;(.*?)&lt;\/s&gt;/gis, "<s>$1</s>")
              .replace(/&lt;size=(\d+)&gt;(.*?)&lt;\/size&gt;/gis, "<span style='font-size: $1px'>$2</span>")
              .replace(/&lt;color=(#?\w+)&gt;(.*?)&lt;\/color&gt;/gis, "<span style='color: $1'>$2</span>");
      }
      return html;
  };

  return (
    <div className="w-full mx-auto space-y-8 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center justify-between relative z-10 w-full mb-2">
            <div className="flex items-center gap-4">
                <Crosshair className="text-cyan-500" size={32} />
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase">Mail Generator</h1>
                    <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Rich Text Broadcasting & Cloud Matrix</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 {/* Always-available clipboard copy */}
                 <button 
                   onClick={handleCopy}
                   disabled={!customText}
                   className={`flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                     copied 
                     ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105' 
                     : 'bg-white text-black hover:bg-gray-200 shadow-xl'
                   } disabled:opacity-30 disabled:cursor-not-allowed`}
                 >
                   {copied ? <Check size={16} /> : <Copy size={16} />}
                   {copied ? 'Copied!' : 'Copy to Clipboard'}
                 </button>

                 {/* Deploy button — only shown when Discord or Cron toggle is on */}
                 {(pushToDiscord || scheduleEvent) && (
                   <button 
                     onClick={handleDeploy}
                     disabled={isDeploying || !customText || (scheduleEvent && (!scheduleData.date || !scheduleData.time))}
                     className={`flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                       isDeploying
                       ? 'bg-amber-500/20 text-amber-400 cursor-wait border border-amber-500/30'
                       : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                     } disabled:opacity-50 disabled:cursor-not-allowed`}
                   >
                     {isDeploying ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                     {isDeploying ? 'Deploying...' : (pushToDiscord && scheduleEvent ? 'Deploy Discord + Schedule' : pushToDiscord ? 'Send to Discord' : 'Schedule Event')}
                   </button>
                 )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Editor Engine */}
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl flex flex-col h-[600px]">
            <div className="bg-[#0a0c0f] px-6 py-4 flex flex-wrap items-center justify-between border-b border-[#1e222b] gap-4">
              
              <div className="flex items-center gap-2 font-bold text-white text-sm tracking-widest uppercase">
                  <Edit3 className="text-rose-500" size={16} /> Editor
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#13161c] rounded-lg border border-[#1e222b]">
                 <button onClick={() => applyFormatting('<b>', '</b>')} className="p-2 hover:bg-[#1e222b] text-gray-400 hover:text-white rounded transition-colors tooltip-btn" title="Bold">
                     <Bold size={16} />
                 </button>
                 <button onClick={() => applyFormatting('<i>', '</i>')} className="p-2 hover:bg-[#1e222b] text-gray-400 hover:text-white rounded transition-colors" title="Italic">
                     <Italic size={16} />
                 </button>
                 
                 <div className="w-px h-6 bg-[#1e222b] mx-1"></div>
                 
                 <button onClick={() => applyFormatting('<size=28>', '</size>')} className="p-2 hover:bg-[#1e222b] text-gray-400 hover:text-white rounded transition-colors flex gap-1 items-center" title="Large Title">
                     <Type size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Big</span>
                 </button>
                 
                 <div className="w-px h-6 bg-[#1e222b] mx-1"></div>
                 
                 {/* Color Swatches */}
                 <div className="flex gap-1.5 items-center px-2">
                    <button onClick={() => applyFormatting('<color=#EF4444>', '</color>')} className="w-4 h-4 rounded-full bg-red-500 hover:scale-125 transition-transform border border-red-400/50" title="Red"></button>
                    <button onClick={() => applyFormatting('<color=#F59E0B>', '</color>')} className="w-4 h-4 rounded-full bg-amber-500 hover:scale-125 transition-transform border border-amber-400/50" title="Gold"></button>
                    <button onClick={() => applyFormatting('<color=#10B981>', '</color>')} className="w-4 h-4 rounded-full bg-emerald-500 hover:scale-125 transition-transform border border-emerald-400/50" title="Green"></button>
                    <button onClick={() => applyFormatting('<color=#06B6D4>', '</color>')} className="w-4 h-4 rounded-full bg-cyan-500 hover:scale-125 transition-transform border border-cyan-400/50" title="Cyan"></button>
                    <button onClick={() => applyFormatting('<color=#8B5CF6>', '</color>')} className="w-4 h-4 rounded-full bg-violet-500 hover:scale-125 transition-transform border border-violet-400/50" title="Purple"></button>
                 </div>
              </div>

            </div>
            
            <div className="p-0 flex-1 bg-[#13161c] flex flex-col relative w-full h-full">
               <textarea 
                 ref={textareaRef}
                 maxLength={2000}
                 value={customText}
                 onChange={(e) => setCustomText(e.target.value)}
                 className="w-full h-full bg-transparent text-gray-300 font-mono text-sm leading-relaxed outline-none resize-none selection:bg-cyan-500/30 p-6 scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent focus:ring-1 focus:ring-cyan-500/50"
                 placeholder="Type your mail outline here. Highlight text and click the buttons above to format using native game tags..."
               ></textarea>
               
               <div className="absolute bottom-4 right-4 bg-[#0f1115]/80 backdrop-blur border border-[#1e222b] px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase pointer-events-none">
                   <span className={customText.length >= 2000 ? 'text-rose-500' : 'text-gray-500'}>Limit: {customText.length}/2000</span>
               </div>
            </div>
        </div>

        {/* Live WYSIWYG Preview */}
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl flex flex-col h-[600px] relative">
            <div className="bg-[#0a0c0f] px-6 py-4 flex flex-wrap items-center justify-between border-b border-[#1e222b] gap-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm tracking-widest uppercase">
                  <Eye className="text-cyan-500" size={16} /> Live In-Game Preview
              </div>
            </div>
            
            <div className="p-6 flex-1 bg-[#0f1115] relative overflow-y-auto scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
               
               <div className="max-w-[450px] mx-auto bg-[#1a1714] border-2 border-[#3b2d1e] rounded-md shadow-[0_0_30px_rgba(0,0,0,0.8)] mt-4">
                   {/* Fake In-Game Mail Header */}
                   <div className="bg-gradient-to-b from-[#2e2115] to-[#1c120a] border-b border-[#3b2d1e] p-3 flex justify-between items-center relative">
                       <div className="text-[#a58661] text-xs font-serif font-bold uppercase tracking-wider">Kingdom Alliance</div>
                       <div className="w-6 h-6 rounded-sm bg-[#5c4a36] flex items-center justify-center text-[#ffea6c] shadow-inner text-xs border border-[#7f6c56]">X</div>
                   </div>
                   
                   {/* Avatar/Sender Row */}
                   <div className="p-4 flex gap-3 border-b border-[#251b11]">
                       <div className="w-12 h-12 bg-[#33261a] rounded-sm border border-[#524131] shadow-[0_0_10px_black] relative overflow-hidden flex items-center justify-center">
                           <ShieldAlert className="text-[#a58661] w-6 h-6" />
                       </div>
                       <div>
                           <div className="text-[#ffdf99] font-bold text-sm tracking-wide shadow-black drop-shadow-md">[ALLY] High Command</div>
                           <div className="text-[#8e7256] text-[10px] mt-0.5">To: All Members</div>
                       </div>
                   </div>

                   {/* Rendered Body */}
                   <div className="p-5 text-[#d8cab7] text-sm leading-relaxed font-sans min-h-[300px] break-words">
                       {customText ? (
                           <div dangerouslySetInnerHTML={{ __html: parseBBCodeToHTML(customText) }}></div>
                       ) : (
                           <div className="text-[#8e7256] italic text-center mt-10 opacity-50">Draft a mail on the left to see it rendered in-game here...</div>
                       )}
                   </div>
               </div>
            </div>
        </div>

      </div>

      {/* Utilities Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            
            <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg border-t-2 border-t-cyan-500">
               <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
                 <FolderOpen className="text-cyan-500" size={20} />
                 <h2 className="text-white font-bold uppercase tracking-widest text-sm">Cloud Templates</h2>
               </div>
               
               <div className="p-6">
                   {loadingTemplates ? (
                       <div className="flex items-center justify-center py-6"><RefreshCw className="animate-spin text-cyan-500" size={18} /></div>
                   ) : (
                       <div className="space-y-2 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-transparent pr-2">
                           {savedTemplates.length === 0 ? (
                               <p className="text-xs text-gray-500 italic text-center py-4 font-mono">No templates stored in Cloud Matrix.</p>
                           ) : savedTemplates.map(t => (
                               <div key={t.id} onClick={() => setCustomText(t.body)} className="bg-[#0f1115] border border-[#2d323e] p-3 rounded-lg cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-colors group">
                                   <p className="text-cyan-400 font-bold text-[11px] uppercase tracking-widest">{t.name}</p>
                                   <p className="text-gray-500 text-xs truncate mt-2 font-mono group-hover:text-gray-300">{t.body.substring(0, 45)}...</p>
                               </div>
                           ))}
                       </div>
                   )}

                   <div className="w-full flex md:flex-row flex-col gap-3 mt-6 border-t border-[#1e222b] pt-6">
                       <input 
                           type="text" 
                           placeholder="Template Title..." 
                           value={templateNameInput}
                           onChange={e => setTemplateNameInput(e.target.value)}
                           className="bg-[#0a0c0f] border border-[#2d323e] text-white px-4 py-3 rounded-lg text-xs font-mono outline-none focus:border-cyan-500 flex-1"
                       />
                       <button 
                           onClick={executeSaveTemplate}
                           disabled={savingTemplate}
                           className="bg-[#1e222b] hover:bg-cyan-500 hover:text-[#0f1115] text-white border border-[#2d323e] px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 max-w-xs"
                       >
                           {savingTemplate ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
                           {savingTemplate ? "Caching..." : "Save Template"}
                       </button>
                   </div>
               </div>
            </div>

            <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg p-6 space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <BellRing className="text-amber-500" size={18} />
                     <div>
                        <p className="text-white font-bold text-sm tracking-widest uppercase">Discord Webhook</p>
                        <p className="text-[10px] text-gray-500 font-medium">Broadcast mail to Server Channels</p>
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
                        <p className="text-white font-bold text-sm tracking-widest uppercase">Cron Sync</p>
                        <p className="text-[10px] text-gray-500 font-medium">Map to Global Trajectory Events</p>
                     </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" checked={scheduleEvent} onChange={() => setScheduleEvent(!scheduleEvent)} className="sr-only peer" />
                     <div className="w-11 h-6 bg-[#1e222b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
                  </label>
               </div>

               {scheduleEvent && (
                  <div className="bg-[#1e222b]/50 border border-[#1e222b] p-4 rounded-xl space-y-4 animate-in fade-in duration-200">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Local Date</label>
                           <input type="date" value={scheduleData.date} onChange={e => setScheduleData({...scheduleData, date: e.target.value})} className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white p-3 rounded-lg text-[10px] outline-none focus:border-violet-500 cursor-pointer" />
                        </div>
                        <div>
                           <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Local Time</label>
                           <input type="time" value={scheduleData.time} onChange={e => setScheduleData({...scheduleData, time: e.target.value})} className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white p-3 rounded-lg text-[10px] outline-none focus:border-violet-500 cursor-pointer" />
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

    </div>
  );
}
