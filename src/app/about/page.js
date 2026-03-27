import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Un.ty | About Us',
  description: 'Our mission and vision for Kingdom vs Kingdom performance analytics.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border-x-4 border-l-cyan-500 border-r-cyan-500 border-y border-y-[#1e222b] rounded-xl p-8 shadow-[0_10px_40px_rgba(6,182,212,0.1)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10">
          <ShieldAlert className="text-cyan-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">About Us</h1>
            <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Our Vision & Architecture</p>
          </div>
        </div>
      </div>

      {/* Content Block */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 relative overflow-hidden shadow-xl">
        <div className="prose prose-invert max-w-none text-gray-300">
          <p className="text-lg leading-relaxed mb-8">
            Welcome to the <strong className="text-white">Unity Dashboard</strong>. We are a specialized analytics platform built specifically for the Rise of Kingdoms community. Our mission is to provide kingdoms, alliances, and individual governors with the data pipelines and actionable insights they need to optimize their performance in Kingdom vs Kingdom (KvK) combat.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-8 uppercase tracking-wider border-b border-[#1e222b] pb-2">Our Vision</h2>
          <p className="leading-relaxed mb-6">
            In the highly competitive environment of Rise of Kingdoms, data is power. We realized that tracking kill points, dead troops, resources, and overall contributions across massive rosters of players during a grueling 50-day KvK was a logistical nightmare for leadership.
          </p>
          <p className="leading-relaxed mb-6">
            Unity was built to replace complicated spreadsheets and manual tracking with an automated, sleek, and high-performance pipeline. We want to give back time to kingdom leadership so they can focus on strategy and diplomacy instead of math.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-10 uppercase tracking-wider border-b border-[#1e222b] pb-2">What We Do</h2>
          <p className="leading-relaxed mb-6">
            We process raw kingdom scan data and transform it into dynamic leaderboards, race charts, DKP analysis, and automated mail generation systems. We believe in complete transparency, allowing every governor to see exactly where they stand in their kingdom's ranks.
          </p>

          <h2 className="text-2xl font-bold text-cyan-400 mb-4 mt-10 uppercase tracking-wider border-b border-[#1e222b] pb-2">Data Scraping vs. BYOD SaaS</h2>
          <p className="leading-relaxed mb-6">
            The vast majority of third-party companion tools in the strategy gaming landscape rely on automated "data scraping" bots. These bots log into accounts, extract coordinate data, and index intellectual property on centralized servers, often without player consent or awareness.
          </p>
          <p className="text-rose-400 font-black tracking-widest uppercase mb-6 text-xl">
            Unity fundamentally rejects this approach.
          </p>
          <p className="leading-relaxed mb-6">
            We operate strictly as a <strong className="text-cyan-400">Bring Your Own Data (BYOD) Software-as-a-Service (SaaS)</strong> platform. We do not extract, scrape, sell, or aggregate any game data. Instead, kingdom leadership teams independently export their own raw in-game spreadsheets and <i className="text-white">choose</i> to securely upload them into our calculation engine.
          </p>
          <p className="leading-relaxed">
            All sensitive algorithms, complex mathematics, and player timelines are strictly isolated. For advanced alliances, your data is securely stored within your own dedicated, encrypted AWS Cloud Workspace—ensuring Zero Data Liability and guaranteeing that your kingdom's competitive intelligence never falls into the wrong hands.
          </p>
        </div>
      </div>

    </div>
  );
}
