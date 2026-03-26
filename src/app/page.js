'use client';

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Zap, TrendingUp, UploadCloud } from "lucide-react";
import WorldClock from "@/components/WorldClock";
import AnimatedLogo from "@/components/AnimatedLogo";

export default function Home() {
  const { data: session } = useSession();
  const [isExploding, setIsExploding] = useState(false);
  const [fireworks, setFireworks] = useState([]);

  useEffect(() => {
    if (isExploding) {
      // Generate 50 random fullscreen fireworks
      const newFireworks = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: 50 + (Math.random() - 0.5) * 40 + '%', // Cluster slightly around center
        top: 40 + (Math.random() - 0.5) * 40 + '%',
        size: Math.random() * 8 + 4 + 'px',
        color: ['#06b6d4', '#38bdf8', '#2dd4bf', '#818cf8', '#a5f3fc'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.4 + 's',
        duration: Math.random() * 0.8 + 0.6 + 's',
        tx: (Math.random() - 0.5) * 600 + 'px',
        ty: (Math.random() - 0.5) * 600 + 'px',
      }));
      setFireworks(newFireworks);
    } else {
      setFireworks([]);
    }
  }, [isExploding]);

  // UNAUTHENTICATED GHOST SHIP LOGIN
  if (!session) {
    return (
      <div className="flex flex-col bg-[#05070a] min-h-screen items-center justify-center relative overflow-hidden font-sans">
        
        {/* Fullscreen Fireworks Engine */}
        {fireworks.map((fw) => (
          <div
            key={fw.id}
            className="absolute rounded-full pointer-events-none z-0"
            style={{
              left: fw.left,
              top: fw.top,
              width: fw.size,
              height: fw.size,
              backgroundColor: fw.color,
              boxShadow: `0 0 15px ${fw.color}`,
              animation: `page-explode ${fw.duration} cubic-bezier(0.1, 0.8, 0.3, 1) ${fw.delay} forwards`,
              '--tx': fw.tx,
              '--ty': fw.ty,
            }}
          />
        ))}

        <style>
          {`
            @keyframes page-explode {
              0% { transform: translate(0, 0) scale(0); opacity: 1; }
              40% { opacity: 0.9; }
              100% { transform: translate(var(--tx), var(--ty)) scale(2.5); opacity: 0; }
            }
          `}
        </style>

        {/* Deep Atmospheric Blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }}></div>

        {/* Ethereal Grid Floor */}
        <div className="absolute bottom-0 w-full h-1/2 bg-[linear-gradient(to_top,rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_top,black,transparent)] pointer-events-none"></div>

        {/* Central Glassmorphic Card */}
        <div className="relative z-10 flex flex-col items-center bg-[#0a0c10]/40 backdrop-blur-2xl border border-white/5 p-12 lg:p-14 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.6)] transform hover:scale-[1.01] transition-all duration-700 w-full max-w-sm sm:max-w-md">
          
          <div 
            className="mb-6 w-36 h-36 sm:w-40 sm:h-40 relative group"
            onMouseEnter={() => setIsExploding(true)}
            onMouseLeave={() => setIsExploding(false)}
          >
            {/* The Orb casting light behind the logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-700"></div>
            <AnimatedLogo className="w-full h-full" />
          </div>
          
          <div className="text-center group mb-12 flex flex-col items-center">
            
            <div className="font-black text-5xl tracking-[0.25em] mb-4 drop-shadow-sm transition-all duration-700 group-hover:tracking-[0.3em] flex flex-col items-center gap-1.5 cursor-default mt-2">
               
               <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 w-[280px]">
                 <div className="text-right text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">UN</div>
                 <div className="text-center text-sky-400 font-bold -translate-y-[1px]">.</div>
                 <div className="text-left text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">TY</div>
               </div>

               <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 w-[280px] text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] text-[3.5rem] tracking-[0.2em] transform -translate-x-[2px]">
                 <div className="text-right">2</div>
                 <div className="text-center font-bold text-gray-200 -translate-y-[2px]">.</div>
                 <div className="text-left">0</div>
               </div>

            </div>

            <p className="text-sky-500/60 font-medium tracking-[0.15em] text-[10px] sm:text-xs uppercase drop-shadow-[0_0_5px_rgba(14,165,233,0.3)] font-mono mt-1">
              Because there is no <span className="text-cyan-400 font-bold lowercase text-sm">i</span> in team.
            </p>
          </div>

          <button 
            onClick={() => signIn("discord")}
            className="group relative flex items-center justify-center gap-4 w-full px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(88,101,242,0.6)] hover:shadow-[0_15px_40px_-5px_rgba(88,101,242,0.8)] overflow-hidden"
          >
            {/* Glossy Button Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-150%] skew-x-[-15deg] transition-transform duration-700 ease-in-out group-hover:translate-x-[150%]"></div>
            <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="currentColor" className="transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
               <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.67,77.67,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.1,46,96,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span className="tracking-widest uppercase text-sm drop-shadow-md">Auth Discord</span>
          </button>
        </div>
      </div>
    );
  }

  // AUTHENTICATED DASHBOARD (Replaces the raw JSON dump)
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f1115] border border-[#1e222b] p-10 text-center shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <h2 className="text-3xl font-bold text-white mb-4">Welcome to Un.ty</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-lg">
          We analyze scans, generate reports, track DKP, evaluate recruits, parse MGE layouts, and handle your mail generation entirely from the cloud.
        </p>
        <Link 
          href="/upload" 
          className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
        >
          <UploadCloud size={20} />
          Start by Uploading a Scan
        </Link>
      </div>

      {/* Global Master Clock */}
      <WorldClock />

      {/* SaaS Philosophy Cards */}
      <div className="rounded-2xl border-t-2 border-cyan-500 bg-gradient-to-b from-[#13161c] to-[#0a0c0f] p-10 border border-[#1e222b] shadow-2xl relative overflow-hidden">
        
        <div className="text-center mb-12 relative z-10">
          <h2 className="text-2xl font-bold text-cyan-400 mb-3">Intelligent Analytics, Zero Liability.</h2>
          <p className="text-gray-400 max-w-3xl mx-auto text-sm leading-relaxed">
            Un.ty is a premium Data Visualization and Calculation Engine (SaaS) built exclusively for elite Kingdom Leadership, operating on a strict <span className="text-white font-bold">Bring Your Own Data (BYOD)</span> architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          
          {/* Card 1 */}
          <div className="bg-[#0f1115] p-8 rounded-xl border border-[#1e222b] hover:border-indigo-500/50 transition-colors text-center group">
            <div className="w-14 h-14 mx-auto bg-[#0a0c0f] rounded-full border border-[#1e222b] flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(99,102,241,0.1)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.2)] transition-shadow">
              <Shield className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-3">100% Private Tenants</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              We do not scrape, sell, or aggregate your intellectual property. Your kingdom's data is strictly isolated within its own dedicated, encrypted AWS workspace.
            </p>
          </div>

          {/* Card 2 (Highlight) */}
          <div className="bg-[#0f1115] p-8 rounded-xl border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-center relative transform -translate-y-2">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)]"></div>
            <div className="w-14 h-14 mx-auto bg-[#0a0c0f] rounded-full border border-cyan-500/50 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Zap className="text-cyan-400" size={24} fill="currentColor" fillOpacity={0.2} />
            </div>
            <h3 className="text-cyan-400 font-bold mb-3">Secure SaaS Engine</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Upload your raw exported game spreadsheets directly into the dashboard. Un.ty processes millions of rows in milliseconds securely in your browser.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0f1115] p-8 rounded-xl border border-[#1e222b] hover:border-green-500/50 transition-colors text-center group">
            <div className="w-14 h-14 mx-auto bg-[#0a0c0f] rounded-full border border-[#1e222b] flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(34,197,94,0.1)] group-hover:shadow-[0_0_25px_rgba(34,197,94,0.2)] transition-shadow">
              <TrendingUp className="text-green-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-3">Actionable Insights</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Transform raw numbers into dynamic leaderboards, interactive graphs, KvK recovery trackers, and beautifully structured player reports.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
