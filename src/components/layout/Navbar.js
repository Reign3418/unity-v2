'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Bell, Search, Globe, ShieldCheck, Cpu, TerminalSquare, X, Menu, AlertCircle, ShieldAlert, CheckCircle2, ChevronRight, ActivitySquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function Navbar({ onMenuClick }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pingData, setPingData] = useState({ vercel: 14, aws: 28 });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const notificationRef = useRef(null);

  // Simulate slight ping variations for realism when hovering
  useEffect(() => {
    const interval = setInterval(() => {
      setPingData({
        vercel: Math.floor(Math.random() * 5) + 12, // 12-16ms
        aws: Math.floor(Math.random() * 10) + 25    // 25-34ms
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Live Notifications Engine
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/aws/notifications?limit=6');
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications);
                if (data.notifications.length > 0) {
                    const latestId = data.notifications[0].id;
                    const lastRead = localStorage.getItem('unty_last_notification_id');
                    if (latestId !== lastRead) {
                        setHasUnread(true);
                    }
                }
            }
        }
      } catch (e) {
          console.error("Notifications poller failed", e);
      }
    };
    
    if (session) {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }
  }, [session]);

  // Handle Out-side click logic
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (notificationRef.current && !notificationRef.current.contains(event.target)) {
              setIsNotificationsOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenNotifications = () => {
      setIsNotificationsOpen(!isNotificationsOpen);
      setIsSearchOpen(false);
      if (!isNotificationsOpen && notifications.length > 0) {
          setHasUnread(false);
          localStorage.setItem('unty_last_notification_id', notifications[0].id);
      }
  };

  // Simple route name formatter
  const getPageTitle = () => {
    if (pathname === '/') return 'Command Center';
    const parts = pathname.split('/').filter(Boolean);
    if (!parts.length) return 'Dashboard';
    const title = parts[parts.length - 1].replace(/-/g, ' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  return (
    <>
      <header className="h-16 bg-[#0a0c0f]/80 backdrop-blur-md border-b border-[#1e222b] flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 transition-all">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={onMenuClick} className="md:hidden p-2 text-cyan-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
             <Menu size={20} />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-white tracking-wide truncate max-w-[150px] md:max-w-none">
            {getPageTitle()}
          </h1>
          {session?.user?.isLeader && (
            <span className="hidden sm:flex bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full items-center gap-1">
              <ShieldCheck size={12} />
              Command
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Global Connection Status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e222b]/50 border border-[#2d323e] relative group cursor-help transition-colors hover:border-cyan-500/50">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider group-hover:text-cyan-400 transition-colors">Secure Uplink</span>
            <Globe size={14} className="text-gray-500 ml-1 group-hover:text-cyan-500 transition-colors" />
            
            {/* Hover Tooltip Ping Data */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-[#0f1115] border border-cyan-500/30 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-3">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0f1115] border-t border-l border-cyan-500/30 rotate-45"></div>
              <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2 border-b border-[#1e222b] pb-1">Live Telemetry</div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-400 text-xs">Vercel Edge:</span>
                <span className="text-green-400 text-xs font-mono">{pingData.vercel}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">AWS DynamoDB:</span>
                <span className="text-green-400 text-xs font-mono">{pingData.aws}ms</span>
              </div>
            </div>
          </div>

          {/* Global Kingdom Autoloader */}
          {session?.user?.allowedKingdoms?.length > 0 && (
             <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 border-r border-[#1e222b]">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target KD:</span>
                <select 
                  className="bg-transparent text-cyan-400 font-mono font-bold text-sm outline-none cursor-pointer hover:text-cyan-300 transition-colors"
                  defaultValue={
                      typeof window !== 'undefined' && localStorage.getItem('unty_active_kd') 
                          ? localStorage.getItem('unty_active_kd') 
                          : (session.user.allowedKingdoms[0] || "3155")
                  }
                  onChange={(e) => {
                      localStorage.setItem('unty_active_kd', e.target.value);
                      window.location.reload();
                  }}
                >
                  {session.user.allowedKingdoms.map(kd => (
                    <option key={kd} value={kd} className="bg-[#0f1115] text-white">[{kd}]</option>
                  ))}
                  {session.user.allowedKingdoms.length > 1 && (
                     <option value="GLOBAL" className="bg-[#0f1115] text-amber-400">[ALL KINGDOMS]</option>
                  )}
                </select>
             </div>
          )}

          {/* Core App Language Switcher */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 border-r border-[#1e222b] group">
            <Globe size={14} className="text-gray-500 group-hover:text-cyan-500 transition-colors" />
            <select
              className="bg-transparent text-gray-400 font-bold text-xs uppercase tracking-widest outline-none cursor-pointer hover:text-cyan-400 transition-colors"
              value={pathname.split('/')[1] || 'en'}
              onChange={(e) => {
                const newLocale = e.target.value;
                const segments = pathname.split('/');
                if (segments.length >= 2 && ['en', 'vi', 'ar', 'ru', 'zh', 'es', 'id', 'ko', 'tr', 'fr', 'de', 'pt'].includes(segments[1])) {
                    segments[1] = newLocale; 
                    window.location.href = segments.join('/');
                } else {
                    window.location.href = `/${newLocale}${pathname}`;
                }
              }}
            >
              <option value="en" className="bg-[#0f1115] text-white">English 🇺🇸</option>
              <option value="zh" className="bg-[#0f1115] text-white">中文 🇨🇳</option>
              <option value="es" className="bg-[#0f1115] text-white">Español 🇪🇸</option>
              <option value="fr" className="bg-[#0f1115] text-white">Français 🇫🇷</option>
              <option value="de" className="bg-[#0f1115] text-white">Deutsch 🇩🇪</option>
              <option value="ru" className="bg-[#0f1115] text-white">Русский 🇷🇺</option>
              <option value="ko" className="bg-[#0f1115] text-white">한국어 🇰🇷</option>
              <option value="vi" className="bg-[#0f1115] text-white">Tiếng Việt 🇻🇳</option>
              <option value="tr" className="bg-[#0f1115] text-white">Türkçe 🇹🇷</option>
              <option value="pt" className="bg-[#0f1115] text-white">Português 🇧🇷</option>
              <option value="id" className="bg-[#0f1115] text-white">Bahasa 🇮🇩</option>
              <option value="ar" className="bg-[#0f1115] text-white">العربية 🇸🇦</option>
            </select>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-3 text-gray-400">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-all"
            >
              <Search size={18} />
            </button>
            
            <div className="relative" ref={notificationRef}>
                <button 
                  onClick={handleOpenNotifications}
                  className="p-2 hover:text-white hover:bg-white/5 rounded-full transition-all relative"
                >
                  <Bell size={18} className={hasUnread ? 'text-white' : ''}/>
                  {hasUnread && (
                      <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0c0f]"></span>
                  )}
                </button>
                
                {/* Notifications Dropdown Tray */}
                {isNotificationsOpen && (
                    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-[#0a0c0f]/95 backdrop-blur-xl border border-[#1e222b] shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden z-50 animate-fade-in origin-top-right">
                        <div className="flex items-center justify-between p-4 border-b border-[#1e222b] bg-[#0f1115]">
                            <h3 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
                                <ActivitySquare size={16} className="text-cyan-500"/> System Telemetry
                            </h3>
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-md font-mono">{notifications.length} Nodes</span>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
                                    <Bell size={24} className="mb-2 opacity-50" />
                                    <p className="text-xs uppercase tracking-widest font-mono">No active broadcasts</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {notifications.map((note) => (
                                        <div key={note.id} className="p-4 border-b border-[#1e222b] hover:bg-[#13161c] transition-colors group flex gap-3 relative overflow-hidden">
                                            {/* Type indicator bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                note.type === 'success' ? 'bg-green-500' :
                                                note.type === 'warning' ? 'bg-amber-500' :
                                                note.type === 'error' ? 'bg-red-500' : 'bg-cyan-500'
                                            }`}></div>
                                            
                                            <div className="mt-1">
                                                {note.type === 'success' ? <CheckCircle2 size={16} className="text-green-500"/> :
                                                 note.type === 'warning' ? <ShieldAlert size={16} className="text-amber-500"/> :
                                                 note.type === 'error' ? <AlertCircle size={16} className="text-red-500"/> : 
                                                 <TerminalSquare size={16} className="text-cyan-500"/>}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-xs font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">{note.title}</h4>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-2">{note.message}</p>
                                                <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">
                                                    {new Date(note.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-2 border-t border-[#1e222b] bg-[#0f1115]">
                            <button 
                                onClick={() => setIsNotificationsOpen(false)}
                                className="w-full py-2 text-xs text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                            >
                                Close Uplink <ChevronRight size={14}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* User Profile */}
          {session?.user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-[#1e222b]">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-white leading-tight">{session.user.username}</span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                  Architecture Node
                </span>
              </div>
              {session.user.avatar ? (
                <img 
                  src={`https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png`} 
                  alt="Profile" 
                  className="w-9 h-9 rounded-full border-2 border-[#1e222b] hover:border-cyan-500 transition-colors cursor-pointer object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#1e222b] text-gray-400 flex items-center justify-center font-bold border-2 border-[#2d323e]">
                  {session.user.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </header>

      {/* AI Search Command Palette Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsSearchOpen(false)}>
          <div 
            className="w-full max-w-2xl bg-[#0a0c0f] border border-[#1e222b] shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-600"></div>
            
            <div className="p-4 border-b border-[#1e222b] flex items-center gap-3 bg-[#0f1115]">
              <Cpu className="text-cyan-500 animate-pulse" size={24} />
              <input 
                type="text" 
                placeholder="Initialize UN.TY AI Query... (e.g. 'Show me rally leads in K3155')"
                className="w-full bg-transparent border-none outline-none text-xl text-white placeholder:text-gray-600 font-mono"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-gray-500 hover:text-red-400 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-[#0a0c0f] min-h-[200px]">
              {searchQuery ? (
                <div className="flex flex-col items-center justify-center h-full pt-10 text-gray-500">
                  <TerminalSquare size={32} className="mb-3 text-cyan-800 animate-pulse" />
                  <p className="font-mono text-sm tracking-widest uppercase">Processing NLP Vector Query...</p>
                  <p className="text-xs text-gray-600 mt-2 italic">Awaiting UN.TY LLM Backend Pipeline</p>
                </div>
              ) : (
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Suggested Vectors</div>
                  <div className="space-y-2">
                    {['Generate a mass mail for KVK layout', 'Who has the highest DKP?', 'Analyze Top 10 Garrison stats'].map((suggestion, i) => (
                      <button 
                        key={i}
                        onClick={() => setSearchQuery(suggestion)}
                        className="w-full text-left px-4 py-3 rounded-lg border border-[#1e222b] hover:border-cyan-500/50 hover:bg-cyan-500/5 text-gray-300 font-mono text-sm transition-all group flex items-center justify-between"
                      >
                        {suggestion}
                        <span className="text-[10px] text-cyan-700 opacity-0 group-hover:opacity-100 uppercase tracking-widest font-bold">Inject Keyword</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-[#13161c] px-4 py-2 text-xs text-gray-600 font-mono border-t border-[#1e222b] flex justify-between">
              <span>UN.TY AI Model v2.0 - Offline Mode</span>
              <span>Press ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
