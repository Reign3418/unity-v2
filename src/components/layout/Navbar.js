'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Bell, Search, Globe, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Simple route name formatter
  const getPageTitle = () => {
    if (pathname === '/') return 'Command Center';
    const parts = pathname.split('/').filter(Boolean);
    if (!parts.length) return 'Dashboard';
    const title = parts[parts.length - 1].replace(/-/g, ' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  return (
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
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e222b]/50 border border-[#2d323e]">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Secure Uplink</span>
          <Globe size={14} className="text-gray-500 ml-1" />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-3 text-gray-400">
          <button className="p-2 hover:text-white hover:bg-white/5 rounded-full transition-all">
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
  );
}
