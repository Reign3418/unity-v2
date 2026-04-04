"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Settings, User, Bell, Shield, Palette, Save, Check, Cpu } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    emailNotifications: false,
    discordPings: true,
    showAllianceTag: true,
    defaultKingdom: "3155",
    theme: "dark",
    geminiKey: "",
    geminiModel: "gemini-2.5-flash",
  });

  // Hydrate preferences from local storage
  useEffect(() => {
    const savedPrefs = localStorage.getItem("unity_prefs");
    if (savedPrefs) {
      try {
        setPrefs(p => ({ ...p, ...JSON.parse(savedPrefs) }));
      } catch (e) {
        console.error("Failed to parse local preferences", e);
      }
    }
  }, []);

  const handleSave = () => {
    // Preferences stored locally for now (no backend needed for client prefs)
    localStorage.setItem("unity_prefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const Toggle = ({ label, desc, value, onChange }) => (
    <div className="flex items-center justify-between py-4 border-b border-[#1e222b] last:border-0">
      <div>
        <p className="text-white font-semibold text-sm">{label}</p>
        <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-cyan-500" : "bg-[#1e222b]"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12 mt-4">

      {/* Header */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
            <Settings className="text-indigo-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Settings</h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">User Preferences & Account Configuration</p>
          </div>
        </div>
      </div>

      {/* Account Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center gap-2">
          <User size={16} className="text-indigo-400" />
          <h2 className="text-white font-bold uppercase tracking-widest text-sm">Linked Account</h2>
        </div>
        <div className="p-6 flex items-center gap-4">
          {session?.user?.image && (
            <img src={session.user.image} alt="avatar" className="w-14 h-14 rounded-full border-2 border-indigo-500/30 shadow-lg" />
          )}
          <div>
            <p className="text-white font-bold text-lg">{session?.user?.name || "Not signed in"}</p>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{session?.user?.id ? `Discord ID: ${session.user.id}` : "Authenticate via Discord to link your account."}</p>
          </div>
          {session?.user?.isLeader && (
            <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-1">
              <Shield size={10} /> High Command
            </span>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center gap-2">
          <Bell size={16} className="text-indigo-400" />
          <h2 className="text-white font-bold uppercase tracking-widest text-sm">Notification Preferences</h2>
        </div>
        <div className="px-6 py-2">
          <Toggle label="Discord Pings" desc="Receive pings for KvK alerts and server events" value={prefs.discordPings} onChange={() => toggle("discordPings")} />
          <Toggle label="Email Notifications" desc="Receive Unity system emails (coming soon)" value={prefs.emailNotifications} onChange={() => toggle("emailNotifications")} />
        </div>
      </div>

      {/* Dashboard Preferences */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center gap-2">
          <Palette size={16} className="text-indigo-400" />
          <h2 className="text-white font-bold uppercase tracking-widest text-sm">Dashboard Preferences</h2>
        </div>
        <div className="px-6 py-2">
          <Toggle label="Show Alliance Tag on Cards" desc="Display [TAG] badges on governor profile cards" value={prefs.showAllianceTag} onChange={() => toggle("showAllianceTag")} />
          <div className="flex items-center justify-between py-4 border-b border-[#1e222b]">
            <div>
              <p className="text-white font-semibold text-sm">Default Kingdom</p>
              <p className="text-gray-500 text-xs mt-0.5">Kingdom pre-selected in analysis dropdowns</p>
            </div>
            
            {session?.user?.tenant?.allowedKingdoms?.length > 0 ? (
              <select
                value={prefs.defaultKingdom}
                onChange={e => setPrefs(p => ({ ...p, defaultKingdom: e.target.value }))}
                className="bg-[#13161c] border border-[#1e222b] text-white px-3 py-1.5 rounded-lg font-mono font-bold outline-none cursor-pointer text-sm"
              >
                {session.user.tenant.allowedKingdoms.map(kd => (
                  <option key={kd} value={kd}>KD {kd}</option>
                ))}
              </select>
            ) : (
              <div className="text-gray-500 text-xs italic">No Architecture Keys found</div>
            )}
            
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-indigo-400" />
            <h2 className="text-white font-bold uppercase tracking-widest text-sm">Global Architecture Override</h2>
          </div>
          <span className="text-[10px] text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Hybrid LLM Mode</span>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Unity runs OCR Screenshot reading through a central Master Database key. 
            If you wish to use your own secure Google Cloud Project API key to prevent hitting the Alliance global quota, you may link your personal key here. Your key is stored locally in your browser and never leaves your machine.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Gemini API Key</label>
              <input 
                type="password"
                placeholder="AIzaSy..."
                value={prefs.geminiKey}
                onChange={e => setPrefs(p => ({ ...p, geminiKey: e.target.value }))}
                className="w-full bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-3 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Gemini LLM Model</label>
              <select 
                value={prefs.geminiModel}
                onChange={e => setPrefs(p => ({ ...p, geminiModel: e.target.value }))}
                className="w-full bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-3 text-white font-mono text-sm cursor-pointer focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Slower, High Precision)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
          saved
            ? "bg-cyan-500 text-white border border-cyan-400"
            : "bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-400/30"
        }`}
      >
        {saved ? <><Check size={16} /> Preferences Saved</> : <><Save size={16} /> Save Preferences</>}
      </button>
    </div>
  );
}
