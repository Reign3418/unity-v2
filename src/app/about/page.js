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
          <p className="text-xl font-medium text-white italic border-l-4 border-cyan-500 pl-6 mb-10">
            "Gamer at heart, Nerd the rest of the time!"
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-wider border-b border-[#1e222b] pb-2">The Journey</h2>
          <p className="leading-relaxed mb-6 text-lg">
            This endeavor was years in the making. Learning the intricate DKP systems and mastering all the tools involved in scanning and compiling data has been an absolute adventure. 
          </p>
          <p className="leading-relaxed mb-6">
            After spending COUNTLESS hours grinding through reports, I noticed a lot of kingdoms facing the exact same dilemma: <strong className="text-rose-400">Pay up, or learn how to spreadsheet.</strong>
          </p>
          <p className="leading-relaxed mb-6">
            I built this tool to take my master spreadsheet and do all the heavy math for you. <strong className="text-cyan-400">You provide the data, it handles the rest.</strong> I truly hope it helps leadership teams reclaim their time.
          </p>

          <h2 className="text-2xl font-bold text-white mb-4 mt-10 uppercase tracking-wider border-b border-[#1e222b] pb-2">A Twist of AI</h2>
          <p className="leading-relaxed mb-6">
            I've recently started learning how to integrate next-generation artificial intelligence directly into the calculation engines. I'm going to continue learning and developing these automated processes so we can all get back to doing what we actually enjoy: <strong className="text-white">playing the game.</strong>
          </p>

          <h2 className="text-2xl font-bold text-cyan-400 mb-4 mt-10 uppercase tracking-wider border-b border-[#1e222b] pb-2">To the Community</h2>
          <p className="leading-relaxed mb-6 text-lg">
            I've met a lot of incredible people along this journey. I definitely can't name them all, but I want to give a massive shoutout to the friends who helped make this possible:
          </p>
          
          <div className="flex flex-wrap gap-4 mb-8">
            <span className="px-5 py-2 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20 tracking-widest uppercase shadow-[0_4px_14px_rgba(6,182,212,0.15)]">Freya</span>
            <span className="px-5 py-2 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20 tracking-widest uppercase shadow-[0_4px_14px_rgba(6,182,212,0.15)]">Em</span>
            <span className="px-5 py-2 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20 tracking-widest uppercase shadow-[0_4px_14px_rgba(6,182,212,0.15)]">Coca</span>
            <span className="px-5 py-2 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20 tracking-widest uppercase shadow-[0_4px_14px_rgba(6,182,212,0.15)]">DarkC</span>
          </div>

          <p className="leading-relaxed text-xl font-bold text-white text-center mt-12 bg-[#0a0c10] border border-[#1e222b] rounded-xl p-8 shadow-inner">
            Let's play some games and enjoy each other's friendship, good times, and epic laughter! 🎮
          </p>
        </div>
      </div>

    </div>
  );
}
