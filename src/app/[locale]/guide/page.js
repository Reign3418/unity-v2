"use client";

import { useState } from "react";
import { 
  BookOpen, FileText, Check, Upload, Timer, Wheat, Zap, Shield, 
  Map, Eye, Activity, Target, Sparkles, BrainCircuit, Swords, 
  Bot, ChevronRight, MessageSquare, AlertTriangle, AlertCircle, Info, HelpCircle, Download
} from "lucide-react";

export default function UserGuidePage() {
  const [activeTab, setActiveTab] = useState("getting-started");

  // Custom navigation tabs
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
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-2">
              Unity Platform Guide
              <Sparkles className="text-fuchsia-400 fill-fuchsia-400/20 shrink-0" size={24} />
            </h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">
              Step-by-step walkthrough of all features and modules in Unity 2.0!
            </p>
          </div>
          <a 
            href="/docs/Unity_V2_System_Architecture_Guide.pdf" 
            download="Unity_V2_System_Architecture_Guide.pdf"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 shrink-0 border border-indigo-400/30 hover:scale-105"
          >
            <Download size={15} />
            <span className="hidden md:inline font-bold">Executive PDF Blueprint</span>
            <span className="md:hidden font-bold">PDF Guide</span>
          </a>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-[#0a0c0f] border border-[#1e222b] rounded-xl overflow-x-auto px-2 no-scrollbar">
        <TabButton id="getting-started" label="🚀 Ingesting Data" icon={Upload} color="indigo" />
        <TabButton id="calculators" label="🔮 AI Calculators" icon={Sparkles} color="fuchsia" />
        <TabButton id="analytics" label="📊 Charts & Analytics" icon={Activity} color="cyan" />
        <TabButton id="scouting" label="🌍 Global Scouting" icon={Target} color="amber" />
        <TabButton id="jarvis" label="🤖 AI & Discord Bot" icon={Bot} color="emerald" />
      </div>

      {/* Tab Contents */}
      
      {/* TAB 1: GETTING STARTED / IMPORTING DATA */}
      {activeTab === "getting-started" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <Upload className="text-indigo-400" size={20} />
              Ingesting Data (How to Import Scans)
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Unity relies on historical in-game scans to compute DKP scores, graph player growth curves, and wargame coalition matchups. Here are the primary ways to import scan logs:
            </p>

            {/* Warning Box */}
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4 flex gap-3 text-xs text-amber-300">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="font-black uppercase tracking-wider block mb-1">Important Guideline:</strong>
                Always upload scans recorded at identical intervals when running comparisons. Comparing scans with different time offsets will lead to skewed power and troop kill calculations.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              
              {/* Card 1: Bulk Ingest */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg font-mono font-black text-sm">01</div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Roster Archive (Bulk Upload)</h3>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Go to the <strong>Upload</strong> tab. From here, you can drop zip files or folders of pre-saved kingdom scan files. This populates database entries for all historical periods.
                </p>
              </div>

              {/* Card 2: In-Browser OCR */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg font-mono font-black text-sm">02</div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Instant Scanner (AI Vision Applet)</h3>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Open the <strong>AI Vision OCR Applet</strong>. Take a screenshot of any player card in-game, drop it here, and the AI scanner will automatically extract metrics like Power and Kill Points.
                </p>
              </div>

              {/* Card 3: Hall of Heroes Overrides */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg font-mono font-black text-sm">03</div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Exact Deaths (Hall of Heroes)</h3>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Commanders can upload Hall of Heroes screenshots showing permanent dead troop logs. The AI extracts exact troop death data to override estimated scan figures, ensuring DKP scores are verified.
                </p>
              </div>

            </div>

            {/* The Golden Rule: Start vs. End Scans (The "Monkey Guide") */}
            <div className="bg-[#10141d] border border-indigo-500/30 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e222b] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🐒</span>
                    <h3 className="text-white font-black text-base uppercase tracking-wider">
                      How Scans Work: The "Monkey Guide" to Start & End Dynamics
                    </h3>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Why Current Power is a lie, and why <strong className="text-indigo-400">Delta (&Delta; = End &minus; Start)</strong> is the only metric High Command cares about.
                  </p>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-lg uppercase tracking-wider">
                  The Gold Standard
                </span>
              </div>

              {/* 3 Step Visual Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#151922] border border-[#232a3b] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Step 01 • The Baseline</span>
                    <span className="text-xl">📸</span>
                  </div>
                  <div className="text-white font-bold text-sm">Start Scan (Day 1)</div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    The kingdom "weigh-in" right before KvK opens. We record every governor's exact Power, Kill Points, T1-T5 Kills, and Dead Troops.
                  </p>
                </div>

                <div className="bg-[#151922] border border-[#232a3b] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest">Step 02 • The Final Bell</span>
                    <span className="text-xl">🏁</span>
                  </div>
                  <div className="text-white font-bold text-sm">End Scan (Day 30)</div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    The final snapshot taken right as KvK closes. Every player's updated metrics are locked in.
                  </p>
                </div>

                <div className="bg-[#151922] border border-indigo-500/40 bg-indigo-500/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">Step 03 • The Truth</span>
                    <span className="text-xl">⚖️</span>
                  </div>
                  <div className="text-white font-bold text-sm">The Delta (&Delta; = End &minus; Start)</div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Unity subtracts Start from End. It ignores what you had before and isolates <strong className="text-indigo-300">ONLY what you accomplished during the war</strong>.
                  </p>
                </div>
              </div>

              {/* Real World Comparison Archetypes */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">
                  What Unity Sees: 3 Real Governor Archetypes
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Archetype 1 */}
                  <div className="bg-[#131720] border border-emerald-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span>⚔️</span> The War Hero
                      </span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        PROMOTED
                      </span>
                    </div>
                    <div className="font-mono text-xs space-y-1 bg-[#0a0d13] p-2.5 rounded-lg border border-[#1e2533]">
                      <div className="flex justify-between text-gray-400"><span>Start Power:</span> <span>75M</span></div>
                      <div className="flex justify-between text-gray-400"><span>End Power:</span> <span>68M</span></div>
                      <div className="flex justify-between text-amber-400 font-bold border-t border-[#1e2533] pt-1">
                        <span>Power Delta:</span> <span>-7M (Lost)</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>KP Delta:</span> <span>+170M (War!)</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Deads Delta:</span> <span>+2.4M (Rally)</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      A noob thinks: <em>"Their power went down, they are weak!"</em> Unity knows: <strong>They bled 2.4M troops on the pass rally</strong> and racked up 170M kill points. True warrior.
                    </p>
                  </div>

                  {/* Archetype 2 */}
                  <div className="bg-[#131720] border border-rose-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <span>🐋</span> The Deadweight Whale
                      </span>
                      <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        LIABILITY
                      </span>
                    </div>
                    <div className="font-mono text-xs space-y-1 bg-[#0a0d13] p-2.5 rounded-lg border border-[#1e2533]">
                      <div className="flex justify-between text-gray-400"><span>Start Power:</span> <span>85M</span></div>
                      <div className="flex justify-between text-gray-400"><span>End Power:</span> <span>85M</span></div>
                      <div className="flex justify-between text-gray-500 font-bold border-t border-[#1e2533] pt-1">
                        <span>Power Delta:</span> <span>0M (Flat)</span>
                      </div>
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>KP Delta:</span> <span>0 (Zero Fights)</span>
                      </div>
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>Deads Delta:</span> <span>0 (Zero Deads)</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Sitting at 85M power before & after KvK. Their power inflated your kingdom's matchmaking seed, making your enemies harder, while they stayed in bubble. <strong>Evict or zero.</strong>
                    </p>
                  </div>

                  {/* Archetype 3 */}
                  <div className="bg-[#131720] border border-amber-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <span>🌾</span> The Farm Sponger
                      </span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        LEECH
                      </span>
                    </div>
                    <div className="font-mono text-xs space-y-1 bg-[#0a0d13] p-2.5 rounded-lg border border-[#1e2533]">
                      <div className="flex justify-between text-gray-400"><span>Start Power:</span> <span>45M</span></div>
                      <div className="flex justify-between text-gray-400"><span>End Power:</span> <span>58M</span></div>
                      <div className="flex justify-between text-cyan-400 font-bold border-t border-[#1e2533] pt-1">
                        <span>Power Delta:</span> <span>+13M (Growth)</span>
                      </div>
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>KP Delta:</span> <span>0 (Zero Fights)</span>
                      </div>
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>Deads Delta:</span> <span>0 (Zero Deads)</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      Grew by +13M power during KvK! But zero combat output. They gathered in safe zones and leeched crusade rewards while the frontline died.
                    </p>
                  </div>
                </div>
              </div>

              {/* The Anchor Secret: Why Governor ID Matters */}
              <div className="bg-[#0b0e14] border border-[#1e2432] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="text-indigo-400 font-mono">🔑</span>
                    <span>The Anchor Secret: Why Player Names Don't Matter</span>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Governors change their in-game names constantly. But their <strong>8-digit Numeric Governor ID (e.g. 88410294)</strong> never changes. Unity maps every Start and End row by Governor ID, so nobody can hide behind a name change.
                  </p>
                </div>
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
                AI Calculators (Vision-Enabled Utility Tools)
              </h2>
              <span className="text-[10px] font-mono bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 px-2 py-0.5 rounded uppercase tracking-widest font-bold">Gemini Powered</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Unity features utility calculators to save manual transcription time. Simply drop game screenshots into any drop zone, and Google Gemini extracts items, resource values, or layouts dynamically.
            </p>

            <div className="space-y-4">
              
              {/* Speedups & Resources */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Timer className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Inventory Audits (Speedups & Resources)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Upload a screenshot of your speedup or resource inventories. The AI counts all your speedup hours (Building, Research, Training, Healing, Universal) and resource boxes (Food, Wood, Stone, Gold) automatically.
                  </p>
                </div>
              </div>

              {/* AP Strategy */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Zap className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Vial Optimization (Action Points)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Drop a screenshot of your AP items. Adjust sliders to target percentage allocations (e.g., 20% Marauders, 15% Forts, 65% Barbarians), and the greedy allocation engine outputs a checklist specifying which AP vials (Giant, Large, Medium, Small) to consume first.
                  </p>
                </div>
              </div>

              {/* Alliance Flag */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Shield className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Flag Resource Projections (Alliance Flags)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Drop a screenshot of your Alliance Storehouse. The engine parses stockpiles, logs crystal (SoC) progress, projects flag resource deficits, and formats a copyable announcement template with colored text tags to share in alliance mail.
                  </p>
                </div>
              </div>

              {/* Equipment Forge */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Swords className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Material Valuation (Equipment Forge)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Upload your Material Inventory screen. The AI counts Leather, Ebony, Iron, and Bone counts across all rarities (Legendary, Epic, Elite, etc.) and projects craft feasibility.
                  </p>
                </div>
              </div>

              {/* Real Estate & Deadeye */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-fuchsia-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-fuchsia-500/10 p-3 rounded-xl border border-fuchsia-500/20 shrink-0">
                  <Map className="text-fuchsia-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Cartography & Battle Report Sweeps (Real Estate & Deadeye)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    The <strong>Real Estate</strong> tab reads territory coordinate grids from map screenshots, and <strong>Deadeye</strong> parses lists of combat log screenshots to extract and merge active player names.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHARTS & ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <Activity className="text-cyan-400" size={20} />
              Charts & Roster Tools (Analytics)
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Once scans are loaded, you can analyze member distributions, compare growth metrics, and track active progression.
            </p>

            {/* Note Box */}
            <div className="border border-cyan-500/20 bg-cyan-500/5 rounded-lg p-4 flex gap-3 text-xs text-cyan-300">
              <Info size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="font-black uppercase tracking-wider block mb-1">Navigation Tip:</strong>
                All data table columns are sortable. Click any column header (e.g. 'Power Growth' or 'Kills') to instantly sort players from highest to lowest.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Card 1: Overview & Compare */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-cyan-500/30 transition-all">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText size={16} className="text-cyan-400" />
                  Roster Overview & Comparison
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  The <strong>Overview</strong> lists all tracked governors. Select up to 5 governors in the <strong>Compare</strong> tab to plot side-by-side growth bar charts, combat diagnostics, and highlight category leaders.
                </p>
              </div>

              {/* Card 2: Scatter Plot (Clustering) */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-cyan-500/30 transition-all">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Target size={16} className="text-cyan-400" />
                  Behavioral Clustering (Scatter Plot)
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Plots Kill Points against Power using statistical clustering to group players into:
                  <br />🏆 <strong>Heroes</strong>: High combat score and high power.
                  <br />⚔️ <strong>Warriors</strong>: High combat score, optimized power.
                  <br />🩹 <strong>Feeders</strong>: High troop loss deltas relative to kills.
                  <br />😴 <strong>Slackers</strong>: High power, low combat contributions.
                </p>
              </div>

              {/* Card 3: Growth Analysis */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-cyan-500/30 transition-all">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  Trajectory curves (Growth Analysis)
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Renders longitudinal curves showing who is growing power/KP, who is stagnant, and general kingdom performance indicators.
                </p>
              </div>

              {/* Card 4: T5 Push Radar */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-cyan-500/30 transition-all">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-fuchsia-400 shrink-0" />
                  T5 Push Tracker
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Tracks City Hall 25 governors as they push tech/building power toward the 22.3M tech floor, classifying them as Eligible, Pushing (deltas &gt; 0), or Stagnant.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GLOBAL SCOUTING */}
      {activeTab === "scouting" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <Target className="text-amber-400" size={20} />
              Global Scouting & Recruitment Tools
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Evaluate external kingdoms, wargame KvK scenarios, and run recruitment similarity matching.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              
              {/* Card 1: Recruiting Center */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-amber-500/30 transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Sparkles size={14} className="text-fuchsia-400" />
                    Vector Matchmaker
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Computes an 8-dimension player persona vector in-memory from target kingdom histories, comparing them to your elite member centroids to find ideal recruitment matches ranked by cosine similarity.
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black">Recruiting Center</div>
              </div>

              {/* Card 2: AIMatchmaker */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-amber-500/30 transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Timer size={14} className="text-amber-400" />
                    Trajectory Predictor
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Compares 7d and 5d deltas using canonical 00:00 UTC scans to classify players as Accelerating, Stable, or Decelerating.
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black">AI Matchmaker</div>
              </div>

              {/* Card 3: KvK Scenario Builder */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-amber-500/30 transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Swords size={14} className="text-amber-400" />
                    Wargame Simulator
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Select coalition kingdoms versus enemy camps. Unity aggregates coalition military metrics and invokes Gemini to output strategic recommendations and danger flags.
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black">Scenario Builder</div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI & DISCORD BOT */}
      {activeTab === "jarvis" && (
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-[#1e222b] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <Bot className="text-emerald-400" size={20} />
              J.A.R.V.I.S. AI & Discord Bot Operations
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Leverage natural language reports, personal coaching briefs, and real-time theater sitreps.
            </p>

            <div className="space-y-4">
              
              {/* Member Coaching Brief */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-emerald-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shrink-0">
                  <BrainCircuit className="text-emerald-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Individual AI Coaching (Member Coaching Brief)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    When members log into the dashboard, J.A.R.V.I.S. automatically reviews their last 5 scans. He writes a coaching brief, assigns a grade, tags their archetype, and compares their performance against power-band peers. Note: AI key preferences are respected.
                  </p>
                </div>
              </div>

              {/* Discord Sitrep command */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-lg p-5 hover:border-emerald-500/30 transition-all flex flex-col md:flex-row gap-4 items-start">
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shrink-0">
                  <MessageSquare className="text-emerald-400" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">Theater Sitrep Command (Discord `/sitrep`)</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Type <code>/sitrep</code> in your Discord chat. J.A.R.V.I.S. runs a multi-scan sweep of the KvK theater using a "Hospital Rebound" tracking algorithm that parses permanent dead troop intersections (migration-proof) and healing rates to classify enemy postures (e.g. Mobilized, Recovering, Taking Fire).
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
