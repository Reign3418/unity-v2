'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, ShieldAlert, Eye, Camera, Crown, Sparkles, BookOpen, Shield, Atom, Swords, Users } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const { 
    previewRole, 
    resetPreview, 
    setPreviewRole, 
    osMode,
    setOsMode,
    isRealValheonFounder,
    isRealSuperAdmin, 
    effectiveIsValheonFounder,
    effectiveIsSuperAdmin, 
    effectiveIsLeader, 
    effectiveIsMember, 
    effectiveIsSupporter, 
    effectiveSession 
  } = useRolePreview();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [gatesCache, setGatesCache] = useState(null);
  const pathname = usePathname();
  const [isAppletParam, setIsAppletParam] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      setIsAppletParam(sp.get('applet') === 'true' || sp.get('applet') === '1');
    }
  }, [pathname]);

  useEffect(() => {
    if (session) {
      fetch('/api/aws/gates')
        .then(res => res.json())
        .then(data => {
            if(data.success) setGatesCache(data.gates || []);
            else setGatesCache([]);
        }).catch(e => {
            console.error(e);
            setGatesCache([]);
        });
    }
  }, [session]);

  const isExperimentalApplet = isAppletParam;

  // Show a full-screen loading state while NextAuth bootstraps the session from the backend
  // Or while we are resolving the initial topography matrix
  if (status === "loading" || (session && gatesCache === null)) {
    return (
      <div className="flex bg-[#0a0c0f] min-h-screen items-center justify-center">
        <div className="text-cyan-500 text-sm animate-pulse font-mono tracking-widest flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          ESTABLISHING SECURE UPLINK...
        </div>
      </div>
    );
  }

  // Strip all shell rendering if we are in an isolated desktop applet popout
  if (isExperimentalApplet) {
      if (session && session.accessToken === "FREE_MODE" && (pathname?.includes('/experimental/ocr') || pathname?.includes('/tools/ranking-scanner'))) {
         return (
             <div className="flex flex-col bg-[#0a0c0f] min-h-screen text-slate-300 items-center justify-center font-sans p-6 text-center">
                 <ShieldAlert className="text-red-500 w-12 h-12 mb-4" />
                 <div className="text-red-500 font-bold uppercase tracking-widest text-lg">Freemode Restriction</div>
                 <div className="text-gray-500 text-sm mt-2 max-w-sm">Experimental API modules consume high computational resources and cannot be executed in Freemode.</div>
             </div>
         );
      }
      return (
        <div className="flex bg-[#0a0c0f] min-h-screen text-slate-300 overflow-x-hidden font-sans w-full">
            {children}
        </div>
      );
  }

  // Hide the shell entirely if the user is unauthenticated
  if (!session) {
    return <>{children}</>;
  }

  // Evaluate Network Gate Clearance
  let isBlocked = false;
  let blockPrimaryReason = "";
  let blockSubText = "";

  const activeSession = effectiveSession || session;

  if (activeSession && activeSession.accessToken === "FREE_MODE") {
      // Hard block Freemode from all modules except the root dashboard splash
      if (!pathname.endsWith('/dashboard')) {
          isBlocked = true;
          blockPrimaryReason = "FREEMODE_RESTRICTION";
          blockSubText = "This matrix is locked in Freemode. Please authenticate via Discord or request a Guest Passcode to execute analytical scans.";
      }
  } else if (activeSession && !effectiveIsSuperAdmin && gatesCache && !pathname.includes('/admin')) {
      // Find if the current route has a registered lock
      const activeGate = gatesCache.find(g => pathname === g.path || pathname.startsWith(g.path + '/'));
      
      if (activeGate) {
          // Evaluate Support Requirements First
          if (activeGate.requiresSupporter && !effectiveIsSupporter) {
              isBlocked = true;
              blockPrimaryReason = "SUPPORTER_REQUIRED";
              blockSubText = `Your Kingdom is not an Active Supporter. This module requires elevated network parameters to process.`;
          }
          
          // Evaluate Role Requirements Second
          if (!isBlocked && activeGate.minimumRole) {
               if (activeGate.minimumRole === "Admin" && !effectiveIsSuperAdmin) {
                   isBlocked = true;
                   blockPrimaryReason = "UNAUTHORIZED_CLEARANCE";
                   blockSubText = "This system requires Master Creator overrides. Access strictly denied.";
               } else if ((activeGate.minimumRole === "Leader" || activeGate.minimumRole === "Data Analyst") && !effectiveIsLeader) {
                   isBlocked = true;
                   blockPrimaryReason = "UNAUTHORIZED_CLEARANCE";
                   blockSubText = "This system requires Leadership or Analyst clearance to access computational resources.";
               } else if (activeGate.minimumRole === "User" && !effectiveIsMember) {
                   isBlocked = true;
                   blockPrimaryReason = "UNAUTHORIZED_CLEARANCE";
                   blockSubText = "Identity Matrix unregistered. You are not mapped to an accepted Tenant.";
               }
          }
      }
  }

  // Hard-gate Stealth Valheon Command Suites to Founder tier only
  const isValheonSuiteRoute = ['/aegis', '/nexus', '/theater', '/vanguard', '/optics'].some(
    (suite) => pathname === suite || pathname?.endsWith(suite) || pathname?.includes(`${suite}/`)
  );
  if (isValheonSuiteRoute && !effectiveIsValheonFounder) {
    isBlocked = true;
    blockPrimaryReason = "FOUNDER_CLEARANCE_REQUIRED";
    blockSubText = "This Sovereign Command Suite is restricted to the Principal Systems Architect.";
  }

  // Render the App Shell (Valheon Sovereign Citadel when effectiveIsValheonFounder is true, otherwise 100% pure Classic UN.TY)
  return (
    <div
      data-os-theme={effectiveIsValheonFounder ? 'valheon' : 'unity'}
      className={`flex h-screen w-full overflow-hidden ${
        effectiveIsValheonFounder ? 'bg-[#07040e]' : 'bg-[#0a0c0f]'
      }`}
    >
      {/* Persistent Left Navigation Panel (Collapses on Mobile) */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Pane */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden relative">
        {/* Valheon Sovereign Top Command Ribbon (ONLY rendered in Valheon Mode) */}
        {effectiveIsValheonFounder && (
          <div className="bg-gradient-to-r from-[#130826] via-[#1c0c36] to-[#130826] border-b border-amber-500/35 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between text-amber-200 z-50 shadow-[0_4px_20px_rgba(234,179,8,0.12)]">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-black uppercase tracking-widest text-amber-300 shrink-0">
                <Crown size={11} className="text-amber-400" />
                VALHEON CITADEL OS
              </span>
              <div className="hidden lg:flex items-center gap-1.5 ml-1">
                <Link
                  href="/aegis"
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-400 text-[10px] font-mono text-amber-100 flex items-center gap-1 transition-all"
                >
                  <Shield size={10} className="text-amber-400" /> 01 Aegis
                </Link>
                <Link
                  href="/nexus"
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-400 text-[10px] font-mono text-amber-100 flex items-center gap-1 transition-all"
                >
                  <Atom size={10} className="text-purple-400" /> 02 Nexus
                </Link>
                <Link
                  href="/theater"
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-400 text-[10px] font-mono text-amber-100 flex items-center gap-1 transition-all"
                >
                  <Swords size={10} className="text-rose-400" /> 03 Theater
                </Link>
                <Link
                  href="/vanguard"
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-400 text-[10px] font-mono text-amber-100 flex items-center gap-1 transition-all"
                >
                  <Users size={10} className="text-emerald-400" /> 04 Vanguard
                </Link>
                <Link
                  href="/optics"
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-400 text-[10px] font-mono text-amber-100 flex items-center gap-1 transition-all"
                >
                  <Sparkles size={10} className="text-fuchsia-400" /> 05 Optics
                </Link>
                <Link
                  href="/guide?tab=valheon-vault"
                  className="px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[10px] font-mono font-bold text-amber-200 flex items-center gap-1 transition-all"
                >
                  <BookOpen size={10} className="text-amber-300" /> 95 RoK Guides
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setOsMode('unity')}
                title="Switch to 100% pure Classic UN.TY with zero Valheon UI for safe screenshots (Shortcut: Alt+V)"
                className="bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-200 px-2.5 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Camera size={11} className="text-amber-300" />
                <span>Switch to Classic UN.TY (Screenshot Mode — Alt+V)</span>
              </button>
            </div>
          </div>
        )}

        {/* Sticky Role Preview Mode Indicator (Only when previewing lower roles like Leader/Member/Guest) */}
        {previewRole && (
          <div className="bg-gradient-to-r from-amber-950/90 via-[#1e150a] to-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between text-amber-200 z-50 shadow-md">
            <div className="flex items-center gap-2 font-mono">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[11px] uppercase tracking-wider text-amber-300">
                <strong>ROLE PREVIEW MODE:</strong> Viewing as <span className="underline font-black text-amber-100">{previewRole.toUpperCase()}</span>. Navigation, tools, and permissions reflect this tier.
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <button
                onClick={resetPreview}
                className="bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-0.5 rounded font-black text-[10px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                Exit Role Preview
              </button>
            </div>
          </div>
        )}

        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        
        {/* Dynamic Page Router injected here */}
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden p-6 relative scrollbar-thin ${
            effectiveIsValheonFounder
              ? 'bg-transparent scrollbar-thumb-amber-500/30'
              : 'bg-[#0a0c0f] scrollbar-thumb-[#1e222b]'
          }`}
        >
          {effectiveIsValheonFounder ? (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(234,179,8,0.07),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.07),transparent_55%)] pointer-events-none" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
          )}
          <div className="w-full max-w-[1920px] 2xl:max-w-screen-3xl md:px-2 lg:px-8 mx-auto relative z-10 animate-fade-in">
            {isBlocked ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg mx-auto animate-fade-in">
                    <div className="w-24 h-24 bg-[#111318] border border-[#1e222b] rounded-full flex items-center justify-center mb-8 relative shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                        <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping"></div>
                        {blockPrimaryReason === 'SUPPORTER_REQUIRED' ? <Lock className="text-emerald-500 w-10 h-10" /> : <ShieldAlert className="text-red-500 w-10 h-10" />}
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-3">Gateway Locked</h2>
                    <p className="text-gray-400 font-mono text-sm leading-relaxed mb-8">{blockSubText}</p>
                    <div className="bg-[#111318] border border-[#1e222b] rounded px-6 py-3 font-mono text-xs text-gray-500">
                        ERR_CODE: <span className="text-red-400">{blockPrimaryReason}</span>
                    </div>
                </div>
            ) : children}
          </div>
        </main>
      </div>
    </div>
  );
}
