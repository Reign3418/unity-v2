'use client';

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Shield, Zap, TrendingUp, UploadCloud } from "lucide-react";
import WorldClock from "@/components/WorldClock";

export default function Home() {
  const { data: session } = useSession();

  // UNAUTHENTICATED GHOST SHIP LOGIN
  if (!session) {
    return (
      <div className="flex flex-col bg-[#0f1115] min-h-screen items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] mb-8">
            <span className="text-white text-3xl font-black">U</span>
          </div>
          
          <h1 className="text-5xl font-black text-white tracking-widest mb-4 drop-shadow-md">
            UNITY <span className="text-emerald-500">2.0</span>
          </h1>
          <p className="text-gray-400 mb-12 font-medium tracking-wide">
            The Ghost Ship is online. Awaiting Commander authorization.
          </p>

          <button 
            onClick={() => signIn("discord")}
            className="flex items-center gap-3 px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-[#5865F2]/25"
          >
            <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="currentColor">
               <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.67,77.67,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.1,46,96,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            Authenticate with Discord
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <h2 className="text-3xl font-bold text-white mb-4">Welcome to Unity</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-lg">
          We analyze scans, generate reports, track DKP, evaluate recruits, parse MGE layouts, and handle your mail generation entirely from the cloud.
        </p>
        <Link 
          href="/upload" 
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
        >
          <UploadCloud size={20} />
          Start by Uploading a Scan
        </Link>
      </div>

      {/* SaaS Philosophy Cards */}
      <div className="rounded-2xl border-t-2 border-emerald-500 bg-gradient-to-b from-[#13161c] to-[#0a0c0f] p-10 border border-[#1e222b] shadow-2xl relative overflow-hidden">
        
        <div className="text-center mb-12 relative z-10">
          <h2 className="text-2xl font-bold text-emerald-400 mb-3">Intelligent Analytics, Zero Liability.</h2>
          <p className="text-gray-400 max-w-3xl mx-auto text-sm leading-relaxed">
            Unity is a premium Data Visualization and Calculation Engine (SaaS) built exclusively for elite Kingdom Leadership, operating on a strict <span className="text-white font-bold">Bring Your Own Data (BYOD)</span> architecture.
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
          <div className="bg-[#0f1115] p-8 rounded-xl border border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-center relative transform -translate-y-2">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]"></div>
            <div className="w-14 h-14 mx-auto bg-[#0a0c0f] rounded-full border border-emerald-500/50 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Zap className="text-emerald-400" size={24} fill="currentColor" fillOpacity={0.2} />
            </div>
            <h3 className="text-emerald-400 font-bold mb-3">Secure SaaS Engine</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Upload your raw exported game spreadsheets directly into the dashboard. Unity processes millions of rows in milliseconds securely in your browser.
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

      {/* Global Master Clock */}
      <WorldClock />

    </div>
  );
}
