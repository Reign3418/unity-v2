"use client";

import { useState } from "react";
import { Link2, Plus, Settings, RotateCcw } from "lucide-react";
import { useSession } from "next-auth/react";

export default function MyStats() {
  const { data: session } = useSession();

  // Placeholder Governor Stats Data (This will eventually load from DynamoDB)
  const governorCards = [
    {
      id: "218768480",
      power: "115.2M",
      kp: "2.4B",
      dead: "15.2M",
      kingdom: "3155",
      faction: "Springs",
      tier: "T5",
      // Back of card stats
      troopPower: "58.1M",
      commanderPower: "11.2M",
      techPower: "35.4M",
      highestPower: "116.5M"
    },
    {
      id: "135042283",
      power: "42.1M",
      kp: "185M",
      dead: "2.1M",
      kingdom: "3155",
      faction: "Springs",
      tier: "T4",
      // Back of card stats
      troopPower: "15.8M",
      commanderPower: "4.6M",
      techPower: "18.2M",
      highestPower: "42.8M"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Discord Identity Header */}
      {session?.user && (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
          
          <img 
            src={`https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png`} 
            alt="Discord Avatar" 
            className="w-24 h-24 rounded-full border-4 border-[#1e222b] shadow-lg object-cover"
          />
          <div className="text-center sm:text-left flex-1">
            <div className="text-cyan-500 text-[10px] font-black tracking-[0.2em] uppercase mb-1">
              Connected Unity Identity
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{session.user.username}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <span className="bg-[#1e222b] text-gray-400 text-xs px-3 py-1 rounded-full border border-[#2d323e]">ID: {session.user.id}</span>
              {session.user.isLeader && (
                <span className="bg-amber-500/10 text-amber-500 text-xs px-3 py-1 rounded-full border border-amber-500/20 font-bold">R4/R5 Architecture</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Governor Profiles Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Governor Profiles</h2>
          <button className="hidden sm:flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-lg font-bold transition-all text-sm">
            <Plus size={16} /> Link Governor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {governorCards.map((gov) => (
            <GovernorCard key={gov.id} gov={gov} />
          ))}

          {/* Add New Profile Stub */}
          <button className="bg-[#0f1115] border-2 border-dashed border-[#1e222b] hover:border-cyan-500/50 hover:bg-cyan-500/5 rounded-2xl flex flex-col items-center justify-center p-8 text-gray-500 hover:text-cyan-400 transition-all group min-h-[340px]">
            <div className="w-16 h-16 rounded-full bg-[#1e222b] group-hover:bg-cyan-500/20 flex flex-col items-center justify-center mb-4 transition-colors">
              <Plus size={32} />
            </div>
            <span className="font-bold tracking-widest uppercase mb-2">Link Scanner Output</span>
            <span className="text-[10px] text-gray-600">Sync with AWS DynamoDB</span>
          </button>
        </div>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------------
// Sub-Component: 3D Flippable Governor Baseball Card
// ---------------------------------------------------------------------------------
function GovernorCard({ gov }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="relative group cursor-pointer w-full"
      style={{ perspective: "1000px", minHeight: "340px" }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className="w-full h-full absolute top-0 left-0 transition-all duration-700 shadow-xl"
        style={{ 
          transformStyle: "preserve-3d", 
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" 
        }}
      >
        
        {/* ======================================================== */}
        {/* FRONT OF CARD (Main Metrics)                             */}
        {/* ======================================================== */}
        <div 
          className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#13161c] to-[#0a0c0f] border border-[#1e222b] rounded-2xl flex flex-col hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Header */}
          <div className="bg-[#1e222b]/40 px-6 py-4 flex justify-between items-center border-b border-[#1e222b]">
            <div className="font-mono text-cyan-400 font-bold">#{gov.id}</div>
            <div className="flex items-center gap-2">
              <span className="bg-[#0f1115] text-gray-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-[#1e222b]">KD {gov.kingdom}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 flex-1 flex flex-col justify-center space-y-4">
            <div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">Total Power</div>
              <div className="text-4xl font-black text-white tracking-tight">{gov.power}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1e222b]">
              <div>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">Kill Points</div>
                <div className="text-lg font-bold text-cyan-400">{gov.kp}</div>
              </div>
              <div>
                <div className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">Dead Troops</div>
                <div className="text-lg font-bold text-rose-400">{gov.dead}</div>
              </div>
            </div>
          </div>

          {/* Flip Indicator */}
          <div className="text-center pb-4 text-gray-600 text-[10px] uppercase tracking-[0.2em] font-bold group-hover:text-cyan-500 transition-colors flex items-center justify-center gap-1">
            <RotateCcw size={10} /> Click to Flip
          </div>
        </div>

        {/* ======================================================== */}
        {/* BACK OF CARD (Deep Analytics)                            */}
        {/* ======================================================== */}
        <div 
          className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-[#13161c] to-[#0f1115] border border-cyan-500/30 rounded-2xl flex flex-col shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]"
          style={{ 
            backfaceVisibility: "hidden", 
            transform: "rotateY(180deg)" 
          }}
        >
          {/* Header (Back) */}
          <div className="bg-cyan-500/10 px-6 py-4 flex justify-between items-center border-b border-cyan-500/20">
            <div className="font-bold text-white text-sm">Target Analytics</div>
            <div className="bg-cyan-500/20 text-cyan-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-cyan-500/30">
              {gov.tier} Architecture
            </div>
          </div>

          {/* Deep Stats Grid */}
          <div className="p-6 flex-1 space-y-4">
            <div className="flex justify-between items-end border-b border-[#1e222b] pb-2">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Highest Power</span>
              <span className="text-white font-mono font-bold">{gov.highestPower}</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1e222b] pb-2">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Troop Power</span>
              <span className="text-cyan-400 font-mono font-bold">{gov.troopPower}</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1e222b] pb-2">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tech Power</span>
              <span className="text-indigo-400 font-mono font-bold">{gov.techPower}</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#1e222b] pb-2">
              <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Commander Power</span>
              <span className="text-amber-400 font-mono font-bold">{gov.commanderPower}</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-6 py-3 bg-[#0a0c0f]/50 border-t border-[#1e222b] flex justify-between z-10" onClick={(e) => e.stopPropagation()}>
            <button className="text-gray-500 hover:text-white transition-colors" title="Settings">
              <Settings size={18} />
            </button>
            <button className="text-rose-500/70 hover:text-rose-500 transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Link2 size={14} className="rotate-45" /> Unlink Profile
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
