"use client";

import { useState } from "react";
import { Smartphone, Search, RefreshCw, FileText, Download, Fingerprint, MapPin } from "lucide-react";

export default function NewPhoneWhoDis() {
  const [inputText, setInputText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const [results, setResults] = useState([]);

  const handleScan = async () => {
    if (!inputText.trim()) return;
    setIsScanning(true);
    setHasResults(false);

    try {
      const names = inputText.split("\n").map(n => n.trim()).filter(n => n !== "");
      
      const promises = names.map(async (name) => {
        try {
          const res = await fetch(`/api/aws/hunter?q=${encodeURIComponent(name)}`);
          if (!res.ok) throw new Error("API Error");
          const data = await res.json();
          
          if (data.result) {
            return {
              queriedName: name,
              matchType: name.toLowerCase() === data.result.name.toLowerCase() ? "Exact" : "Historical",
              matchedId: data.result.id,
              currentAlias: data.result.name,
              kingdom: data.result.lastSeenKingdom,
              power: "Extracted" 
            };
          }
          throw new Error("Not Found");
        } catch (e) {
          return {
            queriedName: name,
            matchType: "Not Found",
            matchedId: "---",
            currentAlias: "---",
            kingdom: "---",
            power: "---"
          };
        }
      });

      const finalResults = await Promise.all(promises);
      setResults(finalResults);
      setHasResults(true);

    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12">
      
      {/* Header & Input Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8">
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
              <Smartphone className="text-fuchsia-400" size={28} />
              New Phone, Who Dis?
            </h1>
            <p className="text-gray-400 text-sm mb-6">
              Paste a raw list of Governor names (one per line). The engine will cross-reference the AWS Global Timeline to identify their permanent Game IDs based on historical alias changes.
            </p>
            
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Reign&#10;DarkRiderX&#10;UnknownGamer"
              className="w-full h-48 bg-[#0a0c0f] border-2 border-[#1e222b] focus:border-fuchsia-500 text-white p-4 rounded-xl font-mono text-sm transition-all outline-none resize-none shadow-inner leading-relaxed"
            />
          </div>

          <div className="w-full md:w-[300px] flex flex-col justify-end space-y-4">
            <div className="bg-[#13161c] border border-[#1e222b] p-4 rounded-xl">
              <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">Analysis Scope</div>
              <div className="flex items-center justify-between text-white text-sm">
                <span>Total Inputs Detected:</span>
                <span className="font-mono text-fuchsia-400">{inputText.split("\n").filter(n => n.trim() !== "").length}</span>
              </div>
            </div>

            <button 
              onClick={handleScan}
              disabled={isScanning || !inputText.trim()}
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                isScanning || !inputText.trim()
                  ? 'bg-fuchsia-500/20 text-fuchsia-500/50 cursor-not-allowed border border-fuchsia-500/30'
                  : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)]'
              }`}
            >
              {isScanning ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
              {isScanning ? 'Interrogating AWS...' : 'Initiate Scan'}
            </button>
          </div>
          
        </div>
      </div>

      {/* Identity Resolution Table */}
      {hasResults && (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl shadow-xl overflow-hidden animate-fade-in border-t-2 border-t-fuchsia-500">
          <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
            <div className="flex items-center gap-3">
              <FileText className="text-fuchsia-400" size={20} />
              <h2 className="text-white font-bold">Identity Disambiguation Log</h2>
            </div>
            <button className="text-gray-400 hover:text-white transition-colors bg-[#1e222b] px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#13161c] border-b border-[#1e222b]">
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Queried Name</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Match Quality</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Resolved ID</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-wider text-gray-500 font-bold">Latest Global Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]">
                {results.map((res, i) => (
                  <tr key={i} className="hover:bg-[#13161c]/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white text-sm">{res.queriedName}</div>
                    </td>
                    <td className="py-4 px-6">
                      {res.matchType === "Exact" && <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold">Exact Match</span>}
                      {res.matchType === "Historical" && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold">Historical Alias</span>}
                      {res.matchType === "Not Found" && <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] px-2 py-1 rounded uppercase tracking-wider font-bold">Not Found</span>}
                    </td>
                    <td className="py-4 px-6">
                       {res.matchType !== "Not Found" ? (
                         <div className="flex items-center gap-2 font-mono text-fuchsia-400 font-bold">
                           <Fingerprint size={14} /> #{res.matchedId}
                         </div>
                       ) : (
                         <div className="text-gray-600 font-mono">---</div>
                       )}
                    </td>
                    <td className="py-4 px-6">
                      {res.matchType !== "Not Found" ? (
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-gray-500 uppercase tracking-wider text-[9px] block mb-0.5">Known As</span>
                            <span className="text-white font-bold">{res.currentAlias}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 uppercase tracking-wider text-[9px] block mb-0.5">Location</span>
                            <span className="text-white font-bold flex items-center gap-1"><MapPin size={10} className="text-gray-400" /> KD {res.kingdom}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 uppercase tracking-wider text-[9px] block mb-0.5">Power</span>
                            <span className="text-gray-300 font-mono">{res.power}</span>
                          </div>
                        </div>
                      ) : (
                         <div className="text-gray-600 font-mono">---</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#0a0c0f] border-t border-[#1e222b] text-center text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            {results.filter(r => r.matchType !== "Not Found").length} Matches Found • {results.filter(r => r.matchType === "Not Found").length} Unknown Identities
          </div>
        </div>
      )}

    </div>
  );
}
