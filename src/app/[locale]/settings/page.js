"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Settings, User, Bell, Shield, Palette, Save, Check, Cpu } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    emailNotifications: false,
    discordPings: true,
    showAllianceTag: true,
    defaultKingdom: "3155",
    theme: "dark",
    geminiKey: "",
    geminiModel: "gemini-3.5-flash",
    timezone: "",
    playtimeStart: "",
    playtimeEnd: ""
  });

  // Hydrate preferences from local storage and session database state
  useEffect(() => {
    let basePrefs = { ...prefs };
    
    const savedPrefs = localStorage.getItem("unity_prefs") || localStorage.getItem("unty_prefs");
    if (savedPrefs) {
      try {
        basePrefs = { ...basePrefs, ...JSON.parse(savedPrefs) };
      } catch (e) {
        console.error("Failed to parse local preferences", e);
      }
    }

    if (session?.user?.governorConfig) {
      const dbConf = session.user.governorConfig;
      if (dbConf.timezone) basePrefs.timezone = dbConf.timezone;
      if (dbConf.playtimeStart) basePrefs.playtimeStart = dbConf.playtimeStart;
      if (dbConf.playtimeEnd) basePrefs.playtimeEnd = dbConf.playtimeEnd;
    }

    setPrefs(basePrefs);
  }, [session]);

  const handleSave = async () => {
    // Preferences stored locally for typical client prefs
    localStorage.setItem("unity_prefs", JSON.stringify(prefs));
    localStorage.setItem("unty_prefs", JSON.stringify(prefs));
    
    // Sync Presence Settings to AWS DynamoDB via Discord Backend
    if (prefs.timezone && prefs.playtimeStart && prefs.playtimeEnd) {
      try {
        const res = await fetch('/api/user/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            timezone: prefs.timezone,
            playtimeStart: prefs.playtimeStart,
            playtimeEnd: prefs.playtimeEnd
          })
        });
        if (!res.ok) throw new Error('Network Error');
      } catch (e) {
        console.error("Failed to sync backend user settings", e);
        alert("Failed to save settings: " + e.message);
        return; // Don't show "saved" if it failed
      }
    }

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
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">{t('title')}</h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Account Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center gap-2">
          <User size={16} className="text-indigo-400" />
          <h2 className="text-white font-bold uppercase tracking-widest text-sm">{t('section_account')}</h2>
        </div>
        <div className="p-6 flex items-center gap-4">
          {session?.user?.image && (
            <img src={session.user.image} alt="avatar" className="w-14 h-14 rounded-full border-2 border-indigo-500/30 shadow-lg" />
          )}
          <div>
            <p className="text-white font-bold text-lg">{session?.user?.name || t('not_signed_in')}</p>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{session?.user?.id ? t('discord_id', { id: session.user.id }) : t('auth_desc')}</p>
          </div>
          {session?.user?.isLeader && (
            <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-1">
              <Shield size={10} /> {t('high_command')}
            </span>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center gap-2">
          <Bell size={16} className="text-indigo-400" />
          <h2 className="text-white font-bold uppercase tracking-widest text-sm">{t('section_notifications')}</h2>
        </div>
        <div className="px-6 py-2">
          <Toggle label={t('discord_pings')} desc={t('discord_pings_desc')} value={prefs.discordPings} onChange={() => toggle("discordPings")} />
          <Toggle label={t('email_notifs')} desc={t('email_notifs_desc')} value={prefs.emailNotifications} onChange={() => toggle("emailNotifications")} />
        </div>
      </div>

      {/* Dashboard Preferences */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center gap-2">
          <Palette size={16} className="text-indigo-400" />
          <h2 className="text-white font-bold uppercase tracking-widest text-sm">{t('section_dashboard')}</h2>
        </div>
        <div className="px-6 py-2">
          <Toggle label={t('show_alliance_tag')} desc={t('show_alliance_tag_desc')} value={prefs.showAllianceTag} onChange={() => toggle("showAllianceTag")} />
          <div className="flex items-center justify-between py-4 border-b border-[#1e222b]">
            <div>
              <p className="text-white font-semibold text-sm">{t('default_kingdom')}</p>
              <p className="text-gray-500 text-xs mt-0.5">{t('default_kingdom_desc')}</p>
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
              <div className="text-gray-500 text-xs italic">{t('no_arch_keys')}</div>
            )}
            
          </div>
        </div>
      </div>

      {/* Presence & Uptime Preferences */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-cyan-400" />
            <h2 className="text-white font-bold uppercase tracking-widest text-sm">Presence & Uptime</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Report your native timezone and daily playtime so Kingdom Leadership can accurately determine your availability across global boundaries.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Native Timezone</label>
              <input 
                type="text"
                placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone}
                value={prefs.timezone || ''}
                onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value }))}
                className="w-full bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-3 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                title="Example: America/New_York or Europe/London"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Typical Start ({prefs.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone})</label>
                <input 
                  type="time"
                  value={prefs.playtimeStart || ''}
                  onChange={e => setPrefs(p => ({ ...p, playtimeStart: e.target.value }))}
                  className="w-full bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Typical End</label>
                <input 
                  type="time"
                  value={prefs.playtimeEnd || ''}
                  onChange={e => setPrefs(p => ({ ...p, playtimeEnd: e.target.value }))}
                  className="w-full bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl overflow-hidden">
        <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-indigo-400" />
            <h2 className="text-white font-bold uppercase tracking-widest text-sm">{t('section_api')}</h2>
          </div>
          <span className="text-[10px] text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-bold tracking-widest">{t('hybrid_mode')}</span>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            {t('api_desc')}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">{t('gemini_key')}</label>
              
              {/* How-to panel */}
              <div className="mb-4 bg-[#0a0c0f] border border-emerald-500/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">🔑 Get Your Free AI Key</p>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Free Tier Available</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Unity uses Google Gemini AI for OCR, translation, and analysis. Adding your own key uses your personal free quota instead of the shared server key — saving costs for everyone.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-black text-white bg-emerald-500/20 border border-emerald-500/30 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-gray-300">Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-cyan-400 font-bold hover:text-cyan-300 underline underline-offset-2">aistudio.google.com/apikey</a> — sign in with any Google account</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-black text-white bg-emerald-500/20 border border-emerald-500/30 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-gray-300">Click <span className="text-white font-bold">"Create API Key"</span> → copy the key that starts with <span className="font-mono text-emerald-400">AIzaSy...</span></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-black text-white bg-emerald-500/20 border border-emerald-500/30 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-gray-300">Paste it in the field below and click <span className="text-white font-bold">Save Changes</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-[#1e222b] mt-3">
                  <span className="text-[10px] text-amber-400 font-bold">💡 Free tier:</span>
                  <span className="text-[10px] text-gray-400">1,500 requests/day — covers ~25 min of Chat Translator or ~50 OCR scans at no cost.</span>
                </div>
              </div>

              <input 
                type="password"
                placeholder="AIzaSy..."
                value={prefs.geminiKey}
                onChange={e => setPrefs(p => ({ ...p, geminiKey: e.target.value }))}
                className="w-full bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-3 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">{t('gemini_model')}</label>
              <select 
                value={prefs.geminiModel}
                onChange={e => setPrefs(p => ({ ...p, geminiModel: e.target.value }))}
                className="w-full bg-[#13161c] border border-[#1e222b] rounded-lg px-4 py-3 text-white font-mono text-sm cursor-pointer focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="gemini-3.5-flash">{t('gemini_3_5_flash_rec')}</option>
                <option value="gemini-2.5-flash">{t('gemini_flash_rec')}</option>
                <option value="gemini-2.5-pro">{t('gemini_pro')}</option>
                <option value="gemini-1.5-flash">{t('gemini_legacy')}</option>
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
        {saved ? <><Check size={16} /> {t('btn_saved')}</> : <><Save size={16} /> {t('btn_save')}</>}
      </button>
    </div>
  );
}
