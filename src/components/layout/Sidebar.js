'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  LayoutDashboard, User, UploadCloud, Building2, BarChart2, 
  TrendingUp, Trophy, Medal, FileText, Smartphone, Timer, 
  Crosshair, BookOpen, Shield, MessageSquare, CalendarDays, 
  Mail, Settings, Lock, LogOut, CheckSquare, Map as MapIcon, Database, Coffee, Heart
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isLeader = session?.user?.isLeader;

  const NavItem = ({ href, icon: Icon, label, hidden }) => {
    if (hidden) return null;
    const isActive = pathname === href;
    
    return (
      <Link 
        href={href} 
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative
          ${isActive 
            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[inset_4px_0_0_0_rgba(6,182,212,1)]' 
            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}
        `}
      >
        <Icon size={18} className={isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-cyan-400 transition-colors'} />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    );
  };

  const SectionTitle = ({ children }) => (
    <div className="px-4 py-2 mt-4 text-[10px] font-bold tracking-[0.2em] text-gray-600 uppercase">
      {children}
    </div>
  );

  return (
    <aside className="w-64 h-screen bg-[#0f1115] border-r border-[#1e222b] flex flex-col flex-shrink-0 relative z-20 overflow-hidden shadow-2xl">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#1e222b] bg-[#0a0c0f]">
        <div className="flex items-center gap-3">
          <img src="/logo-smooth-dark.png" alt="Unity Logo" className="w-9 h-9 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
          <span className="text-xl font-bold tracking-widest text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">UN.TY</span>
        </div>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-3 py-4 space-y-1">
          <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/stats" icon={User} label="My Stats" />
          <NavItem href="/upload" icon={UploadCloud} label="Load Data" />

          <SectionTitle>Analysis</SectionTitle>
          <NavItem href="/vault" icon={Building2} label="Kingdom Vault" hidden={!isLeader} />
          <NavItem href="/analysis/kingdom" icon={BarChart2} label="Kingdom Analysis" />
          <NavItem href="/analysis/global" icon={TrendingUp} label="All Kingdom Stats" />
          <NavItem href="/rankings/pre-kvk" icon={Trophy} label="Pre-KvK Ranking" />
          <NavItem href="/results/dkp" icon={Medal} label="DKP Results" />
          <NavItem href="/reports/kvk" icon={FileText} label="KvK Report" />
          <NavItem href="/tools/tracker" icon={Timer} label="Activity Tracker" />
          <NavItem href="/tools/hunter" icon={Crosshair} label="Player Hunter" />

          <SectionTitle>Community</SectionTitle>
          <NavItem href="/changelog" icon={BookOpen} label="Changelog" />
          <NavItem href="/alliance" icon={Shield} label="My Alliance" />
          <NavItem href="/community" icon={MessageSquare} label="Community Hub" />

          <SectionTitle>Tools</SectionTitle>
          <NavItem href="/events" icon={CalendarDays} label="Events Schedule" />
          <NavItem href="/mail" icon={Mail} label="Mail Generator" />
          <NavItem href="/calculators" icon={CheckSquare} label="Calculators" />
          <NavItem href="/tools/sandbox" icon={Database} label="Data Sandbox" hidden={!session?.user?.isSuperAdmin} />

          <SectionTitle>System</SectionTitle>
          <NavItem href="/settings" icon={Settings} label="Settings" />
          <NavItem href="/admin" icon={Lock} label="Admin Controls" hidden={!session?.user?.isSuperAdmin} />
        </div>
      </div>

      {/* Footer Profile / Logout Area */}
      <div className="w-full mt-auto p-4 bg-[#0a0c0f] border-t border-[#1e222b] flex flex-col gap-5">
        
        {/* Support Engine */}
        <div className="flex flex-col gap-4">
          <a 
            href="https://buymeacoffee.com/reign3418" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center w-full h-11 rounded-lg overflow-hidden group hover:-translate-y-0.5 transition-transform shadow-[0_4px_14px_rgba(255,221,0,0.15)] cursor-pointer"
          >
            <div className="flex items-center justify-center gap-2.5 bg-[#FFDD00] text-black font-black flex-1 h-full px-2 text-sm tracking-wide">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>
              <span>Buy me a coffee</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-[#E5C700] text-white w-12 h-full font-bold text-xs">
              <Heart size={15} fill="currentColor" strokeWidth={0} className="mb-0.5" />
              <span>1</span>
            </div>
          </a>

          {session ? (
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-all font-bold text-sm tracking-widest uppercase"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          ) : null}
        </div>

        {/* Branding Disclaimers */}
        <div className="text-center space-y-2.5 mt-1 pt-4 border-t border-[#1e222b]/50">
          <p className="text-[#6b7280] text-xs font-medium tracking-wide">© 2026 Unity Dashboard.</p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#4b5563] font-bold tracking-widest uppercase">
            <Link href="/about" className="hover:text-cyan-500 transition-colors">About</Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-cyan-500 transition-colors">Contact</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-cyan-500 transition-colors">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-cyan-500 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
