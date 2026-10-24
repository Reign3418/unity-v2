'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';
import { useValheonCommand } from '@/components/command/ValheonCommandProvider';
import { getActiveTargetKingdom, setActiveTargetKingdom, getMergedKingdomList } from '@/lib/activeKingdom';
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
  Users,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    effectiveIsValheonFounder,
    effectiveIsSuperAdmin,
    effectiveIsLeader,
    isRealSuperAdmin,
    previewRole,
    setPreviewRole,
    effectiveSession,
  } = useRolePreview();
  const [sidebarKd, setSidebarKd] = useState('4197');
  const sidebarKdList = getMergedKingdomList(effectiveSession || session, sidebarKd);

  useEffect(() => {
    setSidebarKd(getActiveTargetKingdom(effectiveSession || session, '4197'));
    const onKdChanged = (e) => {
      if (e?.detail?.kd) setSidebarKd(String(e.detail.kd));
    };
    window.addEventListener('valheon:kd-changed', onKdChanged);
    return () => window.removeEventListener('valheon:kd-changed', onKdChanged);
  }, [effectiveSession, session]);
  const { setIsOmniOpen } = useValheonCommand();
  const t = useTranslations('Sidebar');

  // Collapsible folder state: Analytics open by default, others collapsed unless active route matches
  const [openGroups, setOpenGroups] = useState({
    analytics: true,
    tools: false,
    community: false,
    admin: false,
  });

  // Automatically expand whichever folder contains the active page
  useEffect(() => {
    if (!pathname) return;
    if (
      pathname.includes('/analysis/') ||
      pathname.includes('/rankings/') ||
      pathname.includes('/results/') ||
      pathname.includes('/tools/tracker')
    ) {
      setOpenGroups((prev) => ({ ...prev, analytics: true }));
    } else if (
      pathname.includes('/tools/') ||
      pathname.includes('/calculators') ||
      pathname.includes('/mail') ||
      pathname.includes('/translator')
    ) {
      setOpenGroups((prev) => ({ ...prev, tools: true }));
    } else if (
      pathname.includes('/guide') ||
      pathname.includes('/changelog') ||
      pathname.includes('/community')
    ) {
      setOpenGroups((prev) => ({ ...prev, community: true }));
    } else if (
      pathname.includes('/bastion') ||
      pathname.includes('/black-ops') ||
      pathname.includes('/creator/') ||
      pathname.includes('/admin')
    ) {
      setOpenGroups((prev) => ({ ...prev, admin: true }));
    }
  }, [pathname]);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

    const activeClasses =
      'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-[inset_3px_0_0_0_rgba(6,182,212,1)]';
    const inactiveClasses =
      'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent';
    const iconClasses = isActive
      ? 'text-cyan-400 shrink-0'
      : 'text-gray-500 group-hover:text-cyan-400 transition-colors shrink-0';

    return (
      <div className="relative group flex items-center">
        <Link
          href={href}
          onClick={() => setIsOpen && setIsOpen(false)}
          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
            isActive ? activeClasses : inactiveClasses
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon size={16} className={iconClasses} />
            <span className="text-xs font-medium flex items-center gap-1.5 truncate">
              {label}
              {isAi && (
                <Sparkles
                  size={10}
                  className="text-cyan-400/80 shrink-0"
                />
              )}
            </span>
          </div>
          {badge && (
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                badgeColor || 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
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
            title="Launch Floating Scanner Applet"
            className="absolute right-2.5 opacity-0 group-hover:opacity-100 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center gap-1 shrink-0 z-10"
          >
            <span>Applet</span>
            <ExternalLink size={9} />
          </button>
        )}
      </div>
    );
  };

  const CollapsibleSection = ({ groupKey, title, count, children }) => {
    const isExpanded = !!openGroups[groupKey];
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={() => toggleGroup(groupKey)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-[0.16em] uppercase text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            {isExpanded ? (
              <ChevronDown size={13} className="text-cyan-400" />
            ) : (
              <ChevronRight size={13} className="text-slate-500" />
            )}
            <span>{title}</span>
          </span>
          {count !== undefined && (
            <span className="text-[9px] font-mono text-slate-500 bg-[#161a22] px-1.5 py-0.5 rounded border border-[#1e222b]">
              {count}
            </span>
          )}
        </button>
        {isExpanded && (
          <div className="mt-1 pl-2 space-y-0.5 border-l border-[#1e222b] ml-3">
            {children}
          </div>
        )}
      </div>
    );
  };

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
        className={`fixed inset-y-0 left-0 w-64 flex flex-col flex-shrink-0 z-50 overflow-hidden shadow-[20px_0_40px_rgba(0,0,0,0.8)] md:shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:relative md:translate-x-0 bg-[#0f1115] border-r border-[#1e222b] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Clean Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-[#1e222b] bg-[#0a0c0f]">
          <div className="flex items-center justify-between w-full">
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
            {previewRole && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono uppercase font-black tracking-widest">
                {previewRole}
              </span>
            )}
          </div>
        </div>

        {/* Compact Quick Search + Mobile Target Kingdom Switcher Strip */}
        <div className="px-3 pt-3 pb-2.5 border-b border-[#1e222b] bg-[#0b0d12] space-y-2">
          <div className="md:hidden flex items-center justify-between px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
              <Target size={13} className="text-cyan-400" />
              Target KD:
            </span>
            <select
              aria-label="Sidebar Target Kingdom"
              value={sidebarKd}
              onChange={(e) => {
                const nextKd = e.target.value;
                setSidebarKd(nextKd);
                setActiveTargetKingdom(nextKd);
                window.location.reload();
              }}
              className="bg-[#0f1115] text-cyan-300 font-mono font-bold text-xs px-2 py-1 rounded border border-cyan-500/30 outline-none cursor-pointer"
            >
              {sidebarKdList.map((kd) => (
                <option key={kd} value={kd} className="bg-[#0f1115] text-white">
                  Kingdom #{kd}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setIsOmniOpen(true)}
            className="w-full px-3 py-2 rounded-lg bg-[#141821] hover:bg-[#1a202c] border border-[#242936] hover:border-cyan-500/40 text-xs text-gray-300 flex items-center justify-between transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search size={13} className="text-cyan-400" />
              <span>Quick Search...</span>
            </span>
            <kbd className="text-[9px] font-mono bg-black/40 text-gray-400 px-1.5 py-0.5 rounded border border-white/10">
              ^K
            </kbd>
          </button>
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#1e222b]">
          <div className="px-3 py-2.5 space-y-0.5">
            {/* Pinned Core Navigation */}
            <NavItem
              href="/"
              icon={LayoutDashboard}
              label={t('nav_dashboard')}
            />
            <NavItem href="/stats" icon={User} label={t('nav_stats')} />
            <NavItem
              href="/upload"
              icon={UploadCloud}
              label={t('nav_load')}
              hidden={!effectiveIsLeader && !effectiveIsSuperAdmin}
            />

            {/* Group 1: Analytics & KvK */}
            <CollapsibleSection groupKey="analytics" title={t('sec_analysis')} count={6}>
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
                href="/results/dkp"
                icon={Medal}
                label={t('nav_dkp')}
              />
              <NavItem
                href="/rankings/pre-kvk"
                icon={Trophy}
                label={t('nav_pre_kvk')}
              />
              <NavItem
                href="/analysis/global"
                icon={TrendingUp}
                label={t('nav_global_analysis')}
                isAi={true}
              />
              <NavItem
                href="/tools/tracker"
                icon={Timer}
                label={t('nav_activity_tracker')}
              />
            </CollapsibleSection>

            {/* Group 2: Tools & Inspection */}
            <CollapsibleSection groupKey="tools" title={t('sec_tools')} count={13}>
              <NavItem
                href="/tools/hunter"
                icon={Crosshair}
                label={t('nav_player_hunter')}
              />
              <NavItem
                href="/tools/governor-telemetry"
                icon={Users}
                label="35-Field Telemetry"
                badge="BETA"
                badgeColor="bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              />
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
                href="/tools/polygraph"
                icon={Activity}
                label={t('nav_ek_polygraph')}
                isAi={true}
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
              <NavItem
                href="/tools/recruitment-hitlist"
                icon={Target}
                label={t('nav_recruit_hitlist')}
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
                href="/tools/reseller-hunter"
                icon={Bot}
                label={t('nav_reseller_hunter')}
                isAi={true}
                hidden={!effectiveIsLeader && !effectiveIsSuperAdmin}
              />
              <NavItem
                href="/tools/kingdom-rollup"
                icon={Zap}
                label={t('nav_kingdom_rollup')}
                isAi={true}
                hidden={!effectiveIsLeader && !effectiveIsSuperAdmin}
              />
              <NavItem href="/mail" icon={Mail} label={t('nav_mail')} />
              <NavItem
                href="/translator"
                icon={MessageSquare}
                label={t('nav_chat_translator')}
                isAi={true}
              />
            </CollapsibleSection>

            {/* Group 3: Community & Guides */}
            <CollapsibleSection groupKey="community" title={t('sec_community')} count={3}>
              <NavItem
                href="/guide"
                icon={FileText}
                label={t('nav_user_guide')}
              />
              <NavItem
                href="/community"
                icon={MessageSquare}
                label={t('nav_community_hub')}
              />
              <NavItem
                href="/changelog"
                icon={BookOpen}
                label={t('nav_changelog')}
              />
            </CollapsibleSection>

            {/* Group 4: Admin, Creator & Bastion (SuperAdmin Only) */}
            {effectiveIsSuperAdmin && (
              <CollapsibleSection groupKey="admin" title="Admin & Bastion" count={8}>
                <NavItem
                  href="/black-ops"
                  icon={Crosshair}
                  label="🎯 Black Ops Radar"
                  badge="TOP SECRET"
                  badgeColor="bg-rose-500/25 text-rose-200 border-rose-400/50"
                />
                <NavItem
                  href="/bastion"
                  icon={Bot}
                  label="🏰 Bastion MoE Ring"
                  badge="LIVE"
                  badgeColor="bg-cyan-500/25 text-cyan-200 border-cyan-400/50"
                  isAi={true}
                />
                <NavItem
                  href="/admin"
                  icon={Lock}
                  label={t('nav_admin')}
                />
                <NavItem
                  href="/creator/project-cerberus"
                  icon={Atom}
                  label={t('nav_project_cerberus')}
                  isAi={true}
                />
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
              </CollapsibleSection>
            )}

            {/* Settings at bottom of nav */}
            <div className="pt-2 border-t border-[#1e222b]/60 mt-2">
              <NavItem
                href="/settings"
                icon={Settings}
                label={t('nav_settings')}
              />
            </div>
          </div>
        </div>

        {/* Footer Profile / Logout Area */}
        <div className="w-full mt-auto p-4 border-t bg-[#0a0c0f] border-[#1e222b] flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <a
              href="https://ko-fi.com/ReignsPlace"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 px-4 py-2 rounded-lg transition-all duration-300 font-bold text-xs tracking-widest uppercase group"
            >
              <Coffee
                size={14}
                className="group-hover:-rotate-12 group-hover:scale-110 transition-transform duration-300"
              />
              <span>{t('btn_support_kofi')}</span>
            </a>

            {session ? (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/20 transition-all font-bold text-xs tracking-widest uppercase"
              >
                <LogOut size={14} />
                <span>{t('btn_logout')}</span>
              </button>
            ) : null}
          </div>

          {/* Branding Disclaimers */}
          <div className="text-center space-y-1.5 pt-2 border-t border-[#1e222b]/50">
            <p className="text-[#6b7280] text-[10px] font-medium tracking-wide">
              © 2026 Valheon Solutions LLC.
            </p>
            <div className="flex items-center justify-center gap-2 text-[9px] text-[#4b5563] font-bold tracking-widest uppercase">
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
