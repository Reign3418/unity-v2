"use client";

import { useState } from "react";
import { Search, Download, RefreshCw, AlertTriangle, ShieldAlert, Zap, UserMinus, UserPlus } from "lucide-react";

export default function ActivityTracker() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  // Stub data mimicking the exact output of the legacy UIActivityTracker.js algorithm
  const dummyResults = [
    {
      id: "135042283",
      name: "Reign",
      reason: "Low Activity",
      note: "Minimal gains since Mar 12",
      latestPower: "42,150,000",
      troopDelta: "+12,000",
      troopBase: "15.8M",
      troopLatest: "15.8M",
      cmdBase: "C: 4.6M | G: 1.2B",
      cmdLatest: "C: 4.6M | G: 1.25B"
    },
    {
      id: "193857211",
      name: "GhostRider",
      reason: "Zero Growth",
      note: "Asleep since Feb 28",
      latestPower: "85,400,000",
      troopDelta: "0",
      troopBase: "45.1M",
      troopLatest: "45.1M",
      cmdBase: "C: 12.1M | G: 3.4B",
      cmdLatest: "C: 12.1M | G: 3.4B"
    },
    {
      id: "205993881",
      name: "UnknownLeader",
      reason: "Missing",
      note: "Migrated to KD 3156",
      latestPower: "102,500,000",
      troopDelta: "-",
      troopBase: "-",
      troopLatest: "-",
      cmdBase: "",
      cmdLatest: ""
    },
    {
      id: "219485773",
      name: "NewBlood",
      reason: "New",
      note: "Migrated from KD 2999",
      latestPower: "65,200,000",
      troopDelta: "-",
      troopBase: "-",
      troopLatest: "-",
      cmdBase: "",
      cmdLatest: ""
    }
  ];

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setHasResults(false);
    // Simulate AWS DynamoDB crunching 50,000 rows
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasResults(true);
    }, 1500);
  };

  const StatusBadge = ({ reason }) => {
    switch (reason) {
      case "Low Activity":
        return <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><AlertTriangle size={12}/> Low Activity</span>;
      case "Zero Growth":
        return <span className="flex items-center gap-1 text-gray-400 bg-gray-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><ShieldAlert size={12}/> Asleep</span>;
      case "Missing":
        return <span className="flex items-center gap-1 text-rose-500 bg-rose-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><UserMinus size={12}/> Missing (Migrated)</span>;
      case "New":
        return <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider"><UserPlus size={12}/> New Arrival</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <Zap className="text-indigo-500" />
          Activity & Migration Engine
        </h1>
        <p className="text-gray-400 text-sm max-w-3xl mb-8">
          The engine analyzes millions of historical rows spanning weeks of AWS Scans to automatically isolate governors who have ceased growth, abandoned the kingdom, or newly migrated in.
        </p>

        {/* Control Desk */}
        <div className="flex flex-col sm:flex-row items-end gap-4 bg-[#13161c] p-4 rounded-xl border border-[#1e222b]">
          <div className="flex-1 w-full">
            <label className="block text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-2">Target Kingdom</label>
            <select className="w-full bg-[#0a0c0f] border border-[#1e222b] text-white px-4 py-3 rounded-lg appearance-none font-bold focus:border-indigo-500 transition-colors cursor-pointer outline-none">
              <option value="3155">Kingdom 3155 (Springs)</option>
              <option value="3156">Kingdom 3156</option>
            </select>
          </div>
          
          <button 
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              isAnalyzing 
                ? 'bg-indigo-500/50 text-white/50 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]'
            }`}
          >
            {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
            {isAnalyzing ? 'Crunching AWS Data...' : 'Run Diagnostics'}
          </button>

          {hasResults && (
            <button className="w-full sm:w-auto px-6 py-3 bg-[#1e222b] hover:bg-[#2d323e] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-[#2d323e]">
              <Download size={18} />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Results Table View */}
      {hasResults && (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#13161c] border-b border-[#1e222b]">
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Governor</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Classification</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Latest Power</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Troop Trajectory</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Commander / Gather</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]">
                {dummyResults.map((gov) => (
                  <tr key={gov.id} className="hover:bg-[#13161c]/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-sm">{gov.name}</div>
                      <div className="font-mono text-gray-500 text-[10px]">#{gov.id}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="mb-1"><StatusBadge reason={gov.reason} /></div>
                      <div className="text-gray-500 text-xs">{gov.note}</div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-white">
                      {gov.latestPower}
                    </td>
                    <td className="py-4 px-6">
                      {gov.reason === "Missing" || gov.reason === "New" ? (
                        <div className="text-gray-600">-</div>
                      ) : (
                        <div>
                          <div className={`font-mono text-sm font-bold ${gov.troopDelta === '0' ? 'text-gray-500' : 'text-emerald-400'}`}>
                            {gov.troopDelta}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1 flex flex-col gap-0.5">
                            <span>Base: {gov.troopBase}</span>
                            <span>Latest: {gov.troopLatest}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {gov.reason === "Missing" || gov.reason === "New" ? (
                        <div className="text-gray-600">-</div>
                      ) : (
                        <div>
                          <div className="font-mono text-[10px] text-gray-400 mt-1 flex flex-col gap-0.5">
                            <span className="text-gray-500">Base {gov.cmdBase}</span>
                            <span className="text-white">Late {gov.cmdLatest}</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-[#0a0c0f] border-t border-[#1e222b] text-center text-xs text-gray-500 flex items-center justify-between px-6">
            <span>Showing {dummyResults.length} anomalies detected across 4 historical snapshots.</span>
            <span className="text-indigo-500 font-bold">AWS Synchronization Active</span>
          </div>
        </div>
      )}

    </div>
  );
}
