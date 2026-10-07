'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import { 
  LayoutDashboard, User, UploadCloud, Building2, BarChart2, 
  TrendingUp, Trophy, Medal, FileText, Smartphone, Timer, 
  Crosshair, BookOpen, Shield, MessageSquare, CalendarDays, 
  Mail, Settings, Lock, LogOut, CheckSquare, Map as MapIcon, Database, Coffee, Heart, FlaskConical, Target, Activity, Sparkles, Ghost, Eye, Clock
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { effectiveIsSuperAdmin, effectiveIsLeader, previewRole } = useRolePreview();
  const t = useTranslations('Sidebar');

  const isLeader = effectiveIsLeader;

  const NavItem = ({ href, icon: Icon, label, hidden, isAi }) => {
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
        <span className="text-sm font-medium flex items-center gap-1.5">
          {label}
          {isAi && <Sparkles size={12} className="text-fuchsia-400 fill-fuchsia-400/20 shrink-0" />}
        </span>
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
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <img src="/logo-smooth-dark.png" alt="Unity Logo" className="w-9 h-9 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
            <span className="text-xl font-bold tracking-widest text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">UN.TY</span>
          </div>
          {previewRole && (
            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono uppercase font-black tracking-widest">
              {previewRole}
            </span>
          )}
        </div>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-3 py-4 space-y-1">
          <NavItem href="/" icon={LayoutDashboard} label={t('nav_dashboard')} />
          <NavItem href="/stats" icon={User} label={t('nav_stats')} />
          <NavItem href="/upload" icon={UploadCloud} label={t('nav_load')} hidden={!effectiveIsLeader && !effectiveIsSuperAdmin} />

          <SectionTitle>{t('sec_analysis')}</SectionTitle>
          <NavItem href="/analysis/kingdom" icon={BarChart2} label={t('nav_kingdom_analysis')} />
          <NavItem href="/analysis/kvk" icon={Target} label={t('nav_kvk_hub')} isAi={true} />
          <NavItem href="/analysis/global" icon={TrendingUp} label={t('nav_global_analysis')} isAi={true} />
          <NavItem href="/rankings/pre-kvk" icon={Trophy} label={t('nav_pre_kvk')} />
          <NavItem href="/results/dkp" icon={Medal} label={t('nav_dkp')} />
          <NavItem href="/tools/tracker" icon={Timer} label={t('nav_activity_tracker')} />
          <NavItem href="/tools/hunter" icon={Crosshair} label={t('nav_player_hunter')} />
          <NavItem href="/tools/polygraph" icon={Activity} label={t('nav_ek_polygraph')} isAi={true} />

          <SectionTitle>{t('sec_community')}</SectionTitle>
          <NavItem href="/guide" icon={FileText} label={t('nav_user_guide')} />
          <NavItem href="/changelog" icon={BookOpen} label={t('nav_changelog')} />
          <NavItem href="/community" icon={MessageSquare} label={t('nav_community_hub')} />

          <SectionTitle>{t('sec_tools')}</SectionTitle>
          <NavItem href="/calculators" icon={CheckSquare} label={t('nav_calculators')} isAi={true} />
          <NavItem href="/tools/ghost-hunter" icon={Ghost} label={t('nav_ghost_hunter')} isAi={true} hidden={!effectiveIsLeader && !effectiveIsSuperAdmin} />
          <NavItem href="/tools/recruitment-hitlist" icon={Target} label={t('nav_recruit_hitlist')} hidden={!effectiveIsLeader && !effectiveIsSuperAdmin} />
          <NavItem href="/tools/map-planner" icon={MapIcon} label={t('nav_map_planner')} isAi={true} />
          <NavItem href="/tools/account-age" icon={Clock} label={t('nav_account_age')} isAi={true} />
          <NavItem href="/mail" icon={Mail} label={t('nav_mail')} />
          <NavItem href="/translator" icon={MessageSquare} label={t('nav_chat_translator')} isAi={true} />

          {effectiveIsSuperAdmin && (
              <>
                  <SectionTitle>{t('sec_creator')}</SectionTitle>
                  <NavItem href="/creator/sandbox" icon={Database} label={t('nav_sandbox')} />
                  <NavItem href="/creator/lab" icon={FlaskConical} label={t('nav_lab')} />
                  <NavItem href="/creator/matchmaker" icon={Target} label={t('nav_matchmaker')} />
                  <NavItem href="/creator/usage" icon={Activity} label={t('nav_usage')} />
              </>
          )}

          <SectionTitle>{t('sec_system')}</SectionTitle>
          <NavItem href="/settings" icon={Settings} label={t('nav_settings')} />
          <NavItem href="/admin" icon={Lock} label={t('nav_admin')} hidden={!effectiveIsSuperAdmin} />
        </div>
      </div>

      {/* Footer Profile / Logout Area */}
      <div className="w-full mt-auto p-4 bg-[#0a0c0f] border-t border-[#1e222b] flex flex-col gap-5">
        
        {/* Support Engine */}
        <div className="flex flex-col gap-4">
          <a href="https://ko-fi.com/ReignsPlace" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 px-4 py-3 rounded-lg transition-all duration-300 font-bold text-xs tracking-widest uppercase shadow-[0_0_15px_rgba(16,185,129,0.1)] group">
            <Coffee size={16} className="group-hover:-rotate-12 group-hover:scale-110 transition-transform duration-300" />
            <span>{t('btn_support_kofi')}</span>
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
