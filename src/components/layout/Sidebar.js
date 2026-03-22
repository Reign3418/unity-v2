'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  LayoutDashboard, User, UploadCloud, Building2, BarChart2, 
  TrendingUp, Trophy, Medal, FileText, Smartphone, Timer, 
  Crosshair, BookOpen, Shield, MessageSquare, CalendarDays, 
  Mail, Settings, Lock, LogOut, CheckSquare
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
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[inset_4px_0_0_0_rgba(16,185,129,1)]' 
            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}
        `}
      >
        <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-gray-500 group-hover:text-emerald-400 transition-colors'} />
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <span className="text-white font-black tracking-tighter">U</span>
          </div>
          <span className="text-xl font-bold tracking-widest text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">UNITY</span>
        </div>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent pb-24">
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
          <NavItem href="/tools/new-phone" icon={Smartphone} label="New Phone Who Dis" />
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

          <SectionTitle>System</SectionTitle>
          <NavItem href="/settings" icon={Settings} label="Settings" />
          <NavItem href="/admin" icon={Lock} label="Admin Controls" hidden={!isLeader} />
        </div>
      </div>

      {/* Footer Profile / Logout Area */}
      <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-[#0a0c0f] via-[#0f1115] border-t border-[#1e222b]">
        {session ? (
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all font-semibold"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
