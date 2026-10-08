'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Lock, ShieldAlert, Eye } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useRolePreview } from '@/components/providers/RolePreviewProvider';

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const { 
    previewRole, 
    resetPreview, 
    setPreviewRole, 
    isRealSuperAdmin, 
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

  const isExperimentalApplet = pathname?.includes('/experimental/ocr') || isAppletParam;

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

  // Strip all shell rendering if we are in an isolated desktop applet
  if (isExperimentalApplet) {
      if (session && session.accessToken === "FREE_MODE" && pathname?.includes('/experimental/ocr')) {
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

  // Render the fully authenticated Ghost Ship App Shell
  return (
    <div className="flex h-screen w-full bg-[#0a0c0f] overflow-hidden">
      {/* Persistent Left Navigation Panel (Collapses on Mobile) */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Pane */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden relative">
        {/* Sticky Role Preview Mode Indicator */}
        {previewRole && (
          <div className="bg-gradient-to-r from-amber-950/90 via-[#1e150a] to-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between text-amber-200 z-50 shadow-md">
            <div className="flex items-center gap-2 font-mono">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[11px] uppercase tracking-wider text-amber-300">
                <strong>ROLE PREVIEW MODE:</strong> Viewing Unity as <span className="underline font-black text-amber-100">{previewRole.toUpperCase()}</span>. Navigation, tools, and permissions reflect this tier.
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <button
                onClick={resetPreview}
                className="bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-0.5 rounded font-black text-[10px] uppercase tracking-wider transition-colors shadow-sm"
              >
                Exit Preview (👑 SuperAdmin)
              </button>
            </div>
          </div>
        )}

        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        
        {/* Dynamic Page Router injected here */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-[#0a0c0f] relative scrollbar-thin scrollbar-thumb-[#1e222b]">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
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
