'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import { useValheonCommand } from '@/components/command/ValheonCommandProvider';
import {
  LayoutDashboard,
  User,
  UploadCloud,
  BarChart2,
  TrendingUp,
  Trophy,
  Medal,
  FileText,
  Timer,
  Crosshair,
  BookOpen,
  Shield,
  MessageSquare,
  Mail,
  Settings,
  Lock,
  LogOut,
  CheckSquare,
  Map as MapIcon,
  Database,
  Coffee,
  FlaskConical,
  Target,
  Activity,
  Sparkles,
  Ghost,
  Clock,
  Atom,
  Bot,
  Zap,
  Camera,
  ExternalLink,
  Swords,
  Users,
  Search,
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    effectiveIsValheonFounder,
    effectiveIsSuperAdmin,
    effectiveIsLeader,
    previewRole,
    setOsMode,
  } = useRolePreview();
  const { setIsOmniOpen, setIsForensicsOpen } = useValheonCommand();
  const t = useTranslations('Sidebar');
  const tValheon = useTranslations('Valheon');

  const NavItem = ({
    href,
    icon: Icon,
    label,
    badge,
    badgeColor,
    hidden,
    isAi,
    appletHref,
  }) => {
    if (hidden) return null;
    const isActive =
      pathname === href ||
      pathname === `/en${href}` ||
      (href !== '/' && pathname.includes(href));

    const activeClasses = effectiveIsValheonFounder
      ? 'bg-gradient-to-r from-amber-500/20 via-purple-500/10 to-transparent text-amber-200 border border-amber-400/40 shadow-[inset_3px_0_0_0_#eab308]'
      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-[inset_3px_0_0_0_rgba(6,182,212,1)]';

    const inactiveClasses = effectiveIsValheonFounder
      ? 'text-slate-300/80 hover:text-amber-200 hover:bg-amber-500/10 border border-transparent'
      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent';

    const iconClasses = effectiveIsValheonFounder
      ? isActive
        ? 'text-amber-400 shrink-0'
        : 'text-purple-300/60 group-hover:text-amber-300 transition-colors shrink-0'
      : isActive
      ? 'text-cyan-400 shrink-0'
      : 'text-gray-500 group-hover:text-cyan-400 transition-colors shrink-0';

    return (
      <div className="relative group flex items-center">
        <Link
          href={href}
          onClick={() => setIsOpen && setIsOpen(false)}
          className={`flex-1 flex items-center justify-between px-3.5 py-2 rounded-lg transition-all duration-200 ${
            isActive ? activeClasses : inactiveClasses
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon size={17} className={iconClasses} />
            <span className="text-xs font-semibold flex items-center gap-1.5 truncate">
              {label}
              {isAi && (
                <Sparkles
                  size={11}
                  className={
                    effectiveIsValheonFounder
                      ? 'text-amber-400 fill-amber-400/20 shrink-0'
                      : 'text-fuchsia-400 fill-fuchsia-400/20 shrink-0'
                  }
                />
              )}
            </span>
          </div>
          {badge && (
            <span
              className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0 ${
                badgeColor ||
                (effectiveIsValheonFounder
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30')
              }`}
            >
              {badge}
            </span>
          )}
        </Link>
        {appletHref && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(
                appletHref,
                'Valheon Optics Applet',
                'width=620,height=900,toolbar=0,menubar=0,location=0,resizable=1'
              );
            }}
            title="Launch Valheon Optics Applet"
            className="absolute right-2.5 opacity-0 group-hover:opacity-100 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/30 transition-all flex items-center gap-1 shrink-0 z-10"
          >
            <span>Applet</span>
            <ExternalLink size={9} />
          </button>
        )}
      </div>
    );
  };

  const SectionTitle = ({ children }) => (
    <div
      className={`px-3.5 py-1.5 mt-3.5 text-[10px] font-black tracking-[0.2em] uppercase ${
        effectiveIsValheonFounder
          ? 'text-amber-400/80 font-cinzel border-b border-amber-500/15 mb-1'
          : 'text-slate-500'
      }`}
    >
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
      <aside
        className={`fixed inset-y-0 left-0 w-64 flex flex-col flex-shrink-0 z-50 overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.8)] md:shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:relative md:translate-x-0 ${
          effectiveIsValheonFounder
            ? 'bg-gradient-to-b from-[#110822] via-[#090414] to-[#0d061c] border-r border-amber-500/30'
            : 'bg-[#0f1115] border-r border-[#1e222b]'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand Header (Strangler Fig: VALHEON SOVEREIGN CITADEL for Founder, Classic UN.TY for everyone else) */}
        <div
          className={`h-16 flex items-center px-5 border-b ${
            effectiveIsValheonFounder
              ? 'border-amber-500/30 bg-gradient-to-r from-[#170a2e] via-[#110722] to-[#170a2e]'
              : 'border-[#1e222b] bg-[#0a0c0f]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            {effectiveIsValheonFounder ? (
              <Link href="/" className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/25 to-purple-600/25 border border-amber-400/50 shadow-[0_0_15px_rgba(234,179,8,0.35)]">
                  <img
                    src="/logo-valheon-dark.png"
                    alt="Valheon Crest"
                    className="w-7 h-7 object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]"
                  />
                </div>
                <div dir="ltr" className="flex flex-col">
                  <span className="text-lg font-black font-cinzel tracking-[0.2em] gold-gradient-text leading-none">
                    VALHEON
                  </span>
                  <span className="text-[9px] font-mono tracking-[0.18em] text-amber-300/80 uppercase mt-0.5">
                    SOVEREIGN CITADEL
                  </span>
                </div>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-3">
                <img
                  src="/logo-smooth-dark.png"
                  alt="Unity Logo"
                  className="w-9 h-9 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                />
                <span className="text-xl font-bold tracking-widest text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                  UN.TY
                </span>
              </Link>
            )}
            {previewRole && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono uppercase font-black tracking-widest">
                {previewRole}
              </span>
            )}
          </div>
        </div>

        {/* Quick Omni-Bar, Forensics & Screenshot Mode Strip (Exclusive Valheon Founder Only) */}
        {effectiveIsValheonFounder && (
          <div className="px-3 pt-3 pb-1.5 space-y-1.5 border-b border-amber-500/20 bg-[#0c0517]/60">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setIsOmniOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#150a2a] border border-amber-500/35 hover:border-amber-400 text-[11px] font-mono text-amber-200 flex items-center justify-between transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  <Search size={12} className="text-amber-400" />
                  <span>Omni</span>
                </span>
                <kbd className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">^K</kbd>
              </button>
              <button
                type="button"
                onClick={() => setIsForensicsOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#150a2a] border border-purple-500/35 hover:border-purple-400 text-[11px] font-mono text-purple-200 flex items-center justify-between transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  <Shield size={12} className="text-purple-400" />
                  <span>Aegis</span>
                </span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 rounded">5D</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOsMode('unity')}
              className="w-full px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-[10px] font-mono font-bold text-amber-200 flex items-center justify-between transition-all cursor-pointer"
              title="Switch to 100% pure Classic UN.TY for screenshots (Shortcut: Alt+V)"
            >
              <span className="flex items-center gap-1.5">
                <Camera size={12} className="text-amber-400" />
                <span>📸 Classic UN.TY Mode</span>
              </span>
              <kbd className="text-[9px] bg-black/40 border border-amber-500/30 px-1 rounded text-amber-300">
                Alt+V
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#1e222b]">
          <div className="px-3 py-2 space-y-0.5">
            <NavItem
              href="/"
              icon={LayoutDashboard}
              label={effectiveIsValheonFounder ? '🏛️ Citadel Bridge' : t('nav_dashboard')}
            />
            <NavItem href="/stats" icon={User} label={t('nav_stats')} />
            <NavItem
              href="/upload"
              icon={UploadCloud}
              label={t('nav_load')}
              hidden={!effectiveIsLeader && !effectiveIsSuperAdmin}
            />

            {/* THE 5 UNIFIED VALHEON COMMAND SUITES (Exclusive Founder Stealth Evolution) */}
            {effectiveIsValheonFounder && (
              <>
                <SectionTitle>{tValheon('sidebar_suites_header')}</SectionTitle>
                <NavItem
                  href="/aegis"
                  icon={Shield}
                  label={tValheon('suite_aegis_nav')}
                  badge="01"
                  badgeColor="bg-amber-500/20 text-amber-300 border-amber-500/40"
                  isAi={true}
                />
                <NavItem
                  href="/nexus"
                  icon={Atom}
                  label={tValheon('suite_nexus_nav')}
                  badge="02"
                  badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/40"
                  isAi={true}
                />
                <NavItem
                  href="/theater"
                  icon={Swords}
                  label={tValheon('suite_theater_nav')}
                  badge="03"
                  badgeColor="bg-rose-500/20 text-rose-300 border-rose-500/40"
                  isAi={true}
                />
                <NavItem
                  href="/vanguard"
                  icon={Users}
                  label={tValheon('suite_vanguard_nav')}
                  badge="04"
                  badgeColor="bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  isAi={true}
                />
                <NavItem
                  href="/optics"
                  icon={Camera}
                  label={tValheon('suite_optics_nav')}
                  badge="05"
                  badgeColor="bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40"
                  isAi={true}
                />
                <NavItem
                  href="/guide?tab=valheon-vault"
                  icon={BookOpen}
                  label="👑 95 RoK Field Guides"
                  badge="95"
                  badgeColor="bg-amber-500/25 text-amber-200 border-amber-400/50"
                  isAi={true}
                />
              </>
            )}

            <SectionTitle>{t('sec_analysis')}</SectionTitle>
            <NavItem
              href="/analysis/kingdom"
              icon={BarChart2}
              label={t('nav_kingdom_analysis')}
            />
            <NavItem
              href="/analysis/kvk"
              icon={Target}
              label={t('nav_kvk_hub')}
              isAi={true}
            />
            <NavItem
              href="/analysis/global"
              icon={TrendingUp}
              label={t('nav_global_analysis')}
              isAi={true}
            />
            <NavItem
              href="/rankings/pre-kvk"
              icon={Trophy}
              label={t('nav_pre_kvk')}
            />
            <NavItem href="/results/dkp" icon={Medal} label={t('nav_dkp')} />
            <NavItem
              href="/tools/tracker"
              icon={Timer}
              label={t('nav_activity_tracker')}
            />
            <NavItem
              href="/tools/hunter"
              icon={Crosshair}
              label={t('nav_player_hunter')}
            />
            <NavItem
              href="/tools/polygraph"
              icon={Activity}
              label={t('nav_ek_polygraph')}
              isAi={true}
            />

            <SectionTitle>{t('sec_tools')}</SectionTitle>
            <NavItem
              href="/calculators"
              icon={CheckSquare}
              label={t('nav_calculators')}
              isAi={true}
            />
            <NavItem
              href="/tools/ranking-scanner"
              icon={Camera}
              label={t('nav_ranking_scanner')}
              isAi={true}
              appletHref="/en/tools/ranking-scanner?applet=true"
            />
            <NavItem
              href="/tools/kingdom-rollup"
              icon={Zap}
              label={t('nav_kingdom_rollup')}
              isAi={true}
              hidden={!effectiveIsLeader && !effectiveIsSuperAdmin}
            />
            <NavItem
              href="/tools/reseller-hunter"
              icon={Bot}
              label={t('nav_reseller_hunter')}
              isAi={true}
              hidden={!effectiveIsLeader && !effectiveIsSuperAdmin}
            />
            <NavItem
              href="/tools/ghost-hunter"
              icon={Ghost}
              label={t('nav_ghost_hunter')}
              isAi={true}
              hidden={!effectiveIsLeader && !effectiveIsSuperAdmin}
            />
            <NavItem
              href="/tools/recruitment-hitlist"
              icon={Target}
              label={t('nav_recruit_hitlist')}
              hidden={!effectiveIsLeader && !effectiveIsSuperAdmin}
            />
            <NavItem
              href="/tools/map-planner"
              icon={MapIcon}
              label={t('nav_map_planner')}
              isAi={true}
            />
            <NavItem
              href="/tools/account-age"
              icon={Clock}
              label={t('nav_account_age')}
              isAi={true}
            />
            <NavItem href="/mail" icon={Mail} label={t('nav_mail')} />
            <NavItem
              href="/translator"
              icon={MessageSquare}
              label={t('nav_chat_translator')}
              isAi={true}
            />

            <SectionTitle>{t('sec_community')}</SectionTitle>
            <NavItem href="/guide" icon={FileText} label={t('nav_user_guide')} />
            <NavItem
              href="/changelog"
              icon={BookOpen}
              label={t('nav_changelog')}
            />
            <NavItem
              href="/community"
              icon={MessageSquare}
              label={t('nav_community_hub')}
            />

            {effectiveIsSuperAdmin && (
              <>
                <SectionTitle>{t('sec_creator')}</SectionTitle>
                <NavItem
                  href="/creator/sandbox"
                  icon={Database}
                  label={t('nav_sandbox')}
                />
                <NavItem
                  href="/creator/lab"
                  icon={FlaskConical}
                  label={t('nav_lab')}
                />
                <NavItem
                  href="/creator/matchmaker"
                  icon={Target}
                  label={t('nav_matchmaker')}
                />
                <NavItem
                  href="/creator/usage"
                  icon={Activity}
                  label={t('nav_usage')}
                />
                <NavItem
                  href="/creator/project-cerberus"
                  icon={Atom}
                  label={t('nav_project_cerberus')}
                  isAi={true}
                />
              </>
            )}

            <SectionTitle>{t('sec_system')}</SectionTitle>
            <NavItem
              href="/settings"
              icon={Settings}
              label={t('nav_settings')}
            />
            <NavItem
              href="/admin"
              icon={Lock}
              label={t('nav_admin')}
              hidden={!effectiveIsSuperAdmin}
            />
          </div>
        </div>

        {/* Footer Profile / Logout Area */}
        <div
          className={`w-full mt-auto p-4 border-t flex flex-col gap-4 ${
            effectiveIsValheonFounder
              ? 'bg-[#090414] border-amber-500/25'
              : 'bg-[#0a0c0f] border-[#1e222b]'
          }`}
        >
          <div className="flex flex-col gap-2.5">
            <a
              href="https://ko-fi.com/ReignsPlace"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 px-4 py-2.5 rounded-lg transition-all duration-300 font-bold text-xs tracking-widest uppercase shadow-[0_0_15px_rgba(16,185,129,0.1)] group"
            >
              <Coffee
                size={15}
                className="group-hover:-rotate-12 group-hover:scale-110 transition-transform duration-300"
              />
              <span>{t('btn_support_kofi')}</span>
            </a>

            {session ? (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-all font-bold text-xs tracking-widest uppercase"
              >
                <LogOut size={15} />
                <span>{t('btn_logout')}</span>
              </button>
            ) : null}
          </div>

          {/* Branding Disclaimers */}
          <div className="text-center space-y-2 pt-2.5 border-t border-[#1e222b]/50">
            <p className="text-[#6b7280] text-[11px] font-medium tracking-wide">
              {effectiveIsValheonFounder
                ? '© 2026 Valheon Solutions LLC. All Rights Reserved.'
                : '© 2026 Unity Dashboard.'}
            </p>
            <div className="flex items-center justify-center gap-2 text-[10px] text-[#4b5563] font-bold tracking-widest uppercase">
              <Link
                href="/about"
                className="hover:text-cyan-500 transition-colors"
              >
                {t('footer_about')}
              </Link>
              <span>•</span>
              <Link
                href="/contact"
                className="hover:text-cyan-500 transition-colors"
              >
                {t('footer_contact')}
              </Link>
              <span>•</span>
              <Link
                href="/privacy"
                className="hover:text-cyan-500 transition-colors"
              >
                {t('footer_privacy')}
              </Link>
              <span>•</span>
              <Link
                href="/terms"
                className="hover:text-cyan-500 transition-colors"
              >
                {t('footer_terms')}
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
