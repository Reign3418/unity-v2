'use client';

import { useSession } from 'next-auth/react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();

  // Show a full-screen loading state while NextAuth bootstraps the session from the backend
  if (status === "loading") {
    return (
      <div className="flex bg-[#0f1115] min-h-screen items-center justify-center">
        <div className="text-cyan-500 text-xl animate-pulse font-mono tracking-widest">
          ESTABLISHING SECURE UPLINK...
        </div>
      </div>
    );
  }

  // Hide the shell entirely if the user is unauthenticated
  if (!session) {
    return <>{children}</>;
  }

  // Render the fully authenticated Ghost Ship App Shell
  return (
    <div className="flex h-screen w-full bg-[#0a0c0f] overflow-hidden">
      {/* Persistent Left Navigation Panel */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden relative">
        <Navbar />
        
        {/* Dynamic Page Router injected here */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-[#0a0c0f] relative scrollbar-thin scrollbar-thumb-[#1e222b]">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto relative z-10 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
