"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  BookOpen, FileText, Check, Upload, Timer, Wheat, Zap, Shield, 
  Map, Eye, Activity, Target, Sparkles, BrainCircuit, Swords, 
  Bot, ChevronRight, MessageSquare, AlertTriangle, AlertCircle, Info, HelpCircle
} from "lucide-react";

export default function UserGuidePage() {
  const [activeTab, setActiveTab] = useState("getting-started");

  // ELI8 custom layout guide tabs
  const TabButton = ({ id, label, icon: Icon, color }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2.5 px-5 py-3.5 border-b-2 font-black tracking-wider uppercase text-xs transition-all duration-200 whitespace-nowrap ${
        activeTab === id 
        ? `border-${color}-500 text-${color}-400 bg-${color}-500/5 shadow-[inset_0_-2px_0_0_rgba(244,63,94,0)]` 
        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-16 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10 w-full">
          <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
            <BookOpen className="text-cyan-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-2">
              Unity Magic Guide Book
              <Sparkles className="text-fuchsia-400 fill-fuchsia-400/20 shrink-0" size={24} />
            </h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">
              Let's learn how to use all the super-cool features of Unity 2.0! 🎮✨
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-[#0a0c0f] border border-[#1e222b] rounded-xl overflow-x-auto px-2 no-scrollbar">
        <TabButton id="getting-started" label="🚀 Feeding Unity" icon={Upload} color="indigo" />
        <TabButton id="calculators" label="🔮 Magic Scanners" icon={Sparkles} color="fuchsia" />
        <TabButton id="analytics" label="📊 Playground Charts" icon={Activity} color="cyan" />
        <TabButton id="scouting" label="🌍 Scout Binoculars" icon={Target} color="amber" />
        <TabButton id="jarvis" label="🤖 Robot Helpers" icon={Bot} color="emerald" />
      </div>

      {/* Tab Contents */}
      
      {/* TAB 1: GETTING STARTED / IMPORTING DATA */}
      {activeTab === "getting-started" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <Upload className="text-indigo-400" size={20} />
              Feeding Unity Its Snacks (How to Import Data)
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Unity is a super-smart robot, but it gets hungry for data! To help it show you cool charts and battle plans, you need to feed it information from your game. Here are the four ways to do it:
            </p>

            {/* Warning Box */}
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4 flex gap-3 text-xs text-amber-300">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="font-black uppercase tracking-wider block mb-1">Kid-Friendly Rule:</strong>
                Always upload scans from the exact same day if you are comparing players, otherwise it's like comparing a baby giraffe's height on Monday to a big daddy giraffe's height on Friday!
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Card 1: Bulk Ingest */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg font-mono font-black text-sm">01</div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">The Lego Block Folder (Bulk Upload)</h3>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Go to the <strong>Upload</strong> tab. Here, you can drop big folders of pre-saved kingdom data logs. It's like pouring your whole box of Lego blocks onto the rug so Unity can count them and organize them by color!
                </p>
              </div>

              {/* Card 2: Python Harvester */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg font-mono font-black text-sm">02</div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">The Auto-Farmer Buggy (Python Scraper)</h3>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  For advanced users, we have little python-driven farmer buggies running in the background. They log into the game automatically, flip through the leaderboard pages, snap pictures, and send them directly to Unity. 
                </p>
              </div>

              {/* Card 3: In-Browser OCR */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg font-mono font-black text-sm">03</div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">The Magic Camera (AI Vision Applet)</h3>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Open the <strong>AI Vision OCR Applet</strong>. Snap a screenshot of a player card in the game, drop it here, and the magic scanner will read all the numbers (like Power and Kill Points) automatically!
                </p>
              </div>

              {/* Card 4: Hall of Heroes Overrides */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg font-mono font-black text-sm">04</div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">The graveyard tally (Hall of Heroes)</h3>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  R4/R5 leaders can upload screenshots of the in-game Hall of Heroes graveyard. Unity reads who lost the most troops, verifying that the numbers matches the DKP sheets exactly!
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GEMINI VISION CALCULATORS */}
      {activeTab === "calculators" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
                <Sparkles className="text-fuchsia-400 fill-fuchsia-400/20" size={20} />
                Magic Scanners (Calculators with AI Vision)
              </h2>
              <span className="text-[10px] font-mono bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 px-2 py-0.5 rounded uppercase tracking-widest font-bold">Gemini Powered</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Calculators are like super-powered magnifying glasses! Instead of typing all the boring numbers yourself, you can take a picture of your phone screen, drop it in, and let our robot eye (Google Gemini) do the math for you.
            </p>

            <div className="space-y-4">
              
              {/* Speedups & Resources */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Timer className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Hourglasses & Loot Bags (Speedups & Resources)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Drop a picture of your speedups or resource items. The AI count engine scans all your Hourglasses and Resource Boxes (Food, Wood, Stone, Gold) and tells you exactly how many hours or total resources you have locked up!
                  </p>
                </div>
              </div>

              {/* AP Strategy */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Zap className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">The Energy Juice Bottle Planner (Action Points)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    AP is like energy juice for your troops to fight monsters! Drop a picture of your AP inventory. Use sliders to choose your strategy (e.g. 20% Marauders, 15% Forts, 65% Barbarians), and the planner does a greedy calculation to tell you exactly which bottles to drink first in plain numbered steps!
                  </p>
                </div>
              </div>

              {/* Alliance Flag */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Shield className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">The Lego Castle Builder (Alliance Flag Calculator)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Flags let your alliance expand your kingdom. Scan your Storehouse screen. The calculator logs all stockpiles (Credits, Food, Wood, Stone, Gold, and crystal requirements for SoC), projects exactly when you will run out, and builds a copyable announcement template with colored text tags to share in the game!
                  </p>
                </div>
              </div>

              {/* Equipment Forge */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Swords className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">The Blacksmith Helper (Equipment Forge Scanner)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Drop a picture of your material items (Leather, Ebony wood, Iron rocks, and Animal bones). The scanner counts all of your material colors (Legendary Gold, Epic Purple, Elite Blue, etc.) and calculates if you have enough items to forge a shiny new weapon!
                  </p>
                </div>
              </div>

              {/* Real Estate & Deadeye */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Map className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Spyglass Cartography (Real Estate & Deadeye Scanners)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    The <strong>Real Estate</strong> tab scans a satellite map photo to locate territory coordinates, while <strong>Deadeye</strong> scans battle reports to compile lists of player names automatically so you can see who was active in battle!
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLAYGROUND CHARTS (ANALYTICS) */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <Activity className="text-cyan-400" size={20} />
              Playground Charts & Roster Tools (Analytics)
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Once you've fed Unity its data snacks, you can look at the playground! The playground has cool interactive charts and lists that group players by how they play the game.
            </p>

            {/* Note Box */}
            <div className="border border-cyan-500/20 bg-cyan-500/5 rounded-lg p-4 flex gap-3 text-xs text-cyan-300">
              <Info size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="font-black uppercase tracking-wider block mb-1">Friendly Tip:</strong>
                All lists are sortable! Tap on any header (like "Power Growth" or "Kills") to sort governors from highest to lowest. It's like lining up players by height!
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Card 1: Overview & Compare */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-cyan-500/30 transition-all">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText size={16} className="text-cyan-400" />
                  Stat Sheets (Overview & Compare)
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  The <strong>Overview</strong> is a massive directory of everyone in the kingdom. Want to see how your friends are doing side-by-side? Go to the <strong>Compare</strong> tab and pick up to 5 governors to draw comparative bars!
                </p>
              </div>

              {/* Card 2: Scatter Plot (Clustering) */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-cyan-500/30 transition-all">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Target size={16} className="text-cyan-400" />
                  Playground Grouping (Scatter Plot)
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  This chart groups players into 4 playground teams:
                  <br />🏆 <strong>Heroes</strong>: High kills and high power.
                  <br />⚔️ <strong>Warriors</strong>: High kills, but keep their power low and efficient.
                  <br />🩹 <strong>Feeders</strong>: Lose a lot of troops (get booboos) for the team.
                  <br />😴 <strong>Slackers</strong>: Take napping time and don't fight much.
                </p>
              </div>

              {/* Card 3: Growth Analysis */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-cyan-500/30 transition-all">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  The Growth Hill (Growth Analysis)
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  This page draws squiggly trendlines. It shows you who is climbing the power hill the fastest, who is walking, and who has stopped growing entirely.
                </p>
              </div>

              {/* Card 4: T5 Push Radar */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-cyan-500/30 transition-all">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-fuchsia-400 shrink-0" />
                  The Level 5 Race (T5 Push Radar)
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Level 5 troops are the strongest soldiers in the game! This radar tracks City Hall 25 players to see how close they are to hitting the 22.3M tech hurdle and building floors, tagging them as <strong>Eligible</strong>, <strong>Pushing</strong>, or <strong>Stagnant</strong>.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SCOUT BINOCULARS (GLOBAL TOOLS) */}
      {activeTab === "scouting" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <Target className="text-amber-400" size={20} />
              Scout Binoculars (Global Cross-Kingdom Tools)
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Want to peek over the fence at other kingdoms or find new players for your team? Peer through the scout binoculars to run recruitment similarity math and wargaming simulations!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              
              {/* Card 1: Recruiting Center */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-amber-500/30 transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Sparkles size={14} className="text-fuchsia-400" />
                    Magnet Matcher
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Uses math vector magnets to score target kingdom players based on how closely they match the behavior of your elite members. It ranks candidates by cosine percentage similarity!
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black">Recruiting Center</div>
              </div>

              {/* Card 2: AIMatchmaker */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-amber-500/30 transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Timer size={14} className="text-amber-400" />
                    Speed Trajectory
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Compares a player's 7-day power growth with their 5-day growth. It tags them as <strong>Accelerating</strong> (speeding up!), <strong>Stable</strong> (running steady), or <strong>Decelerating</strong> (slowing down).
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black">AI Matchmaker</div>
              </div>

              {/* Card 3: KvK Scenario Builder */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-amber-500/30 transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Swords size={14} className="text-amber-400" />
                    Pretend Wargame
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Put your coalition kingdoms against the enemy camp. Unity sums up everyone's soldiers and tech, then hands the numbers to Gemini to predict who will win and warn you about hidden danger flags!
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black">Scenario Builder</div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ROBOT HELPERS (AI & DISCORD BOT) */}
      {activeTab === "jarvis" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <Bot className="text-emerald-400" size={20} />
              Robot Helpers (J.A.R.V.I.S. AI & Discord Bot)
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              J.A.R.V.I.S. is our friendly mechanical butler! He lives on the dashboard and inside your Discord chat to give you tips, check logs, and run diagnostic sitreps.
            </p>

            <div className="space-y-4">
              
              {/* Member Coaching Brief */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-emerald-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shrink-0">
                  <BrainCircuit className="text-emerald-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Your Personal Robot Teacher (Member Coaching Brief)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    When members log into the dashboard, J.A.R.V.I.S. automatically reviews their last 5 scans. He writes a friendly coaching letter, gives you a letter grade (like A+ or B), assigns you a player archetype, and compares your stats to peers in your power bracket. He will even crack a friendly joke (65% roast tone) to keep things fun!
                  </p>
                </div>
              </div>

              {/* Discord Sitrep command */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-emerald-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shrink-0">
                  <MessageSquare className="text-emerald-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">The Chat Radar Command (Discord `/sitrep`)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Type <code>/sitrep</code> in your Discord chat. J.A.R.V.I.S. instantly runs a multi-scan sweep of the theater. Using our "Hospital Rebound" tracking math, he checks if target kingdoms have permanently lost soldiers (deads) or if they are dumping healing speedups to rebuild their army. It groups enemy postures into labels like <strong>Mobilized</strong>, <strong>Recovering</strong>, or <strong>Taking Fire</strong>!
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
