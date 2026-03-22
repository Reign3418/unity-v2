'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Bell, Search, Globe, ShieldCheck, Cpu, TerminalSquare, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pingData, setPingData] = useState({ vercel: 14, aws: 28 });

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
      <header className="h-16 bg-[#0a0c0f]/80 backdrop-blur-md border-b border-[#1e222b] flex items-center justify-between px-8 sticky top-0 z-10 transition-all">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-wide">
            {getPageTitle()}
          </h1>
          {session?.user?.isLeader && (
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
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

          {/* Action Icons */}
          <div className="flex items-center gap-3 text-gray-400">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-all"
            >
              <Search size={18} />
            </button>
            <button className="p-2 hover:text-white hover:bg-white/5 rounded-full transition-all relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0c0f]"></span>
            </button>
          </div>

          {/* User Profile */}
          {session?.user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-[#1e222b]">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-white leading-tight">{session.user.username}</span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                  Kingdom {session.user.tenant?.kingdomId || 'N/A'}
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
