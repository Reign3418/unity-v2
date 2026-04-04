'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { 
  LayoutDashboard, User, UploadCloud, Building2, BarChart2, 
  TrendingUp, Trophy, Medal, FileText, Smartphone, Timer, 
  Crosshair, BookOpen, Shield, MessageSquare, CalendarDays, 
  Mail, Settings, Lock, LogOut, CheckSquare, Map as MapIcon, Database, Coffee, Heart, FlaskConical, Target
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations('Sidebar');

  const isLeader = session?.user?.isLeader;

  const NavItem = ({ href, icon: Icon, label, hidden }) => {
    if (hidden) return null;
    const isActive = pathname === href || pathname === `/en${href}` || pathname.includes(`${href}`); // fuzzy match over locale
    
    return (
      <Link 
        href={href} 
        onClick={() => setIsOpen && setIsOpen(false)}
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
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Container */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#0f1115] border-r border-[#1e222b] flex flex-col flex-shrink-0 z-50 overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.8)] md:shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:relative md:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
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
          <NavItem href="/" icon={LayoutDashboard} label={t('nav_dashboard')} />
          <NavItem href="/stats" icon={User} label={t('nav_stats')} />
          <NavItem href="/upload" icon={UploadCloud} label={t('nav_load')} />

          <SectionTitle>{t('sec_analysis')}</SectionTitle>
          <NavItem href="/vault" icon={Building2} label={t('nav_vault')} hidden={!isLeader} />
          <NavItem href="/analysis/kingdom" icon={BarChart2} label={t('nav_kingdom_analysis')} />
          <NavItem href="/analysis/global" icon={TrendingUp} label={t('nav_global_analysis')} />
          <NavItem href="/rankings/pre-kvk" icon={Trophy} label={t('nav_pre_kvk')} />
          <NavItem href="/results/dkp" icon={Medal} label={t('nav_dkp')} />
          <NavItem href="/tools/tracker" icon={Timer} label={t('nav_activity_tracker')} />
          <NavItem href="/tools/hunter" icon={Crosshair} label={t('nav_player_hunter')} />

          <SectionTitle>{t('sec_community')}</SectionTitle>
          <NavItem href="/changelog" icon={BookOpen} label={t('nav_changelog')} />
          <NavItem href="/community" icon={MessageSquare} label={t('nav_community_hub')} />

          <SectionTitle>{t('sec_tools')}</SectionTitle>
          <NavItem href="/events" icon={CalendarDays} label={t('nav_events')} />
          <NavItem href="/mail" icon={Mail} label={t('nav_mail')} />
          <NavItem href="/calculators" icon={CheckSquare} label={t('nav_calculators')} />

          {session?.user?.isSuperAdmin && (
              <>
                  <SectionTitle>{t('sec_creator')}</SectionTitle>
                  <NavItem href="/creator/sandbox" icon={Database} label={t('nav_sandbox')} />
                  <NavItem href="/creator/lab" icon={FlaskConical} label={t('nav_lab')} />
                  <NavItem href="/creator/matchmaker" icon={Target} label={t('nav_matchmaker')} />
              </>
          )}

          <SectionTitle>{t('sec_system')}</SectionTitle>
          <NavItem href="/settings" icon={Settings} label={t('nav_settings')} />
          <NavItem href="/admin" icon={Lock} label={t('nav_admin')} hidden={!session?.user?.isSuperAdmin} />

          {/* AI Experimental OCR Desktop Applet Injection */}
          <SectionTitle>Experimental Lab</SectionTitle>
          <button 
            onClick={() => window.open('/en/experimental/ocr', 'Unity Applet', 'width=550,height=850,toolbar=0,menubar=0,location=0')}
            className={`w-[calc(100%-2rem)] mx-4 flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 group relative border border-fuchsia-500/20 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/40 text-fuchsia-300 mt-2`}
          >
              <div className="flex items-center gap-3">
                  <FlaskConical size={18} className="text-fuchsia-400 group-hover:animate-pulse" />
                  <span className="text-sm font-medium">AI Vision OCR</span>
              </div>
              <span className="text-[10px] font-mono bg-fuchsia-500/20 px-2 py-0.5 rounded text-fuchsia-200 uppercase tracking-widest border border-fuchsia-500/30">Applet</span>
          </button>
        </div>
      </div>

      {/* Footer Profile / Logout Area */}
      <div className="w-full mt-auto p-4 bg-[#0a0c0f] border-t border-[#1e222b] flex flex-col gap-5">
        
        {/* Support Engine */}
        <div className="flex flex-col gap-4">
          <a href="https://www.buymeacoffee.com/ReignsPlace" target="_blank" rel="noreferrer" className="flex justify-center hover:-translate-y-0.5 transition-transform drop-shadow-[0_4px_14px_rgba(54,194,196,0.15)]">
            <img 
              src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=ReignsPlace&button_colour=36c2c4&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00" 
              alt="Buy me a coffee" 
              className="h-[42px] object-contain rounded-[5px]" 
            />
          </a>

          {session ? (
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-all font-bold text-sm tracking-widest uppercase"
            >
              <LogOut size={16} />
              <span>{t('btn_logout')}</span>
            </button>
          ) : null}
        </div>

        {/* Branding Disclaimers */}
        <div className="text-center space-y-2.5 mt-1 pt-4 border-t border-[#1e222b]/50">
          <p className="text-[#6b7280] text-xs font-medium tracking-wide">© 2026 Unity Dashboard.</p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#4b5563] font-bold tracking-widest uppercase">
            <Link href="/about" className="hover:text-cyan-500 transition-colors">{t('footer_about')}</Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-cyan-500 transition-colors">{t('footer_contact')}</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-cyan-500 transition-colors">{t('footer_privacy')}</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-cyan-500 transition-colors">{t('footer_terms')}</Link>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
