'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [gatesCache, setGatesCache] = useState(null);

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

  // Hide the shell entirely if the user is unauthenticated
  if (!session) {
    return <>{children}</>;
  }

  const pathname = usePathname();
  const isExperimentalApplet = pathname?.includes('/experimental/ocr');

  // Strip all shell rendering if we are in an isolated desktop applet
  if (isExperimentalApplet) {
      return (
        <div className="flex bg-[#0a0c0f] min-h-screen text-slate-300 overflow-hidden font-sans">
            {children}
        </div>
      );
  }

  // Evaluate Network Gate Clearance
  let isBlocked = false;
  let blockPrimaryReason = "";
  let blockSubText = "";

  if (session && session.user?.accessToken === "FREE_MODE") {
      // Hard block Freemode from all modules except the root dashboard splash
      if (!pathname.endsWith('/dashboard')) {
          isBlocked = true;
          blockPrimaryReason = "FREEMODE_RESTRICTION";
          blockSubText = "This matrix is locked in Freemode. Please authenticate via Discord or request a Guest Passcode to execute analytical scans.";
      }
  } else if (session && !session.user.isSuperAdmin && gatesCache && !pathname.includes('/admin')) {
      // Find if the current route has a registered lock
      const activeGate = gatesCache.find(g => pathname === g.path || pathname.startsWith(g.path + '/'));
      
      if (activeGate) {
          // Evaluate Support Requirements First
          if (activeGate.requiresSupporter && !session.user.isSupporter) {
              isBlocked = true;
              blockPrimaryReason = "SUPPORTER_REQUIRED";
              blockSubText = `Your Kingdom is not an Active Supporter. This module requires elevated network parameters to process.`;
          }
          
          // Evaluate Role Requirements Second
          if (!isBlocked && activeGate.minimumRole) {
               if (activeGate.minimumRole === "Admin" && !session.user.isSuperAdmin) {
                   isBlocked = true;
                   blockPrimaryReason = "UNAUTHORIZED_CLEARANCE";
                   blockSubText = "This system requires Master Creator overrides. Access strictly denied.";
               } else if ((activeGate.minimumRole === "Leader" || activeGate.minimumRole === "Data Analyst") && !session.user.isLeader) {
                   isBlocked = true;
                   blockPrimaryReason = "UNAUTHORIZED_CLEARANCE";
                   blockSubText = "This system requires Leadership or Analyst clearance to access computational resources.";
               } else if (activeGate.minimumRole === "User" && !session.user.isMember) {
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
