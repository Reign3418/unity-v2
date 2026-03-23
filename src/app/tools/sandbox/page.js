"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Upload, AlertTriangle, CheckCircle2, Cloud, Database, Trash2, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";

export default function SandboxPage() {
  const { data: session } = useSession();
  const [parsedTabs, setParsedTabs] = useState([]);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [scanDateOverride, setScanDateOverride] = useState(null);

  const fileInputRef = useRef(null);

  if (!session?.user?.isSuperAdmin) {
    return (
      <div className="flex bg-[#0f1115] min-h-screen items-center justify-center relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
           <AlertTriangle size={64} className="text-rose-500 mb-6 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]" />
           <h1 className="text-3xl font-black text-white tracking-widest mb-4">RESTRICTED ACCESS</h1>
           <p className="text-gray-400 font-mono tracking-wide">Data Sandbox Diagnostics requires Super Admin privileges.</p>
        </div>
      </div>
    );
  }

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Extract DTG from Summary F2 if it exists
        let extractedDtg = null;
        if (workbook.Sheets['Summary']) {
           const summarySheet = workbook.Sheets['Summary'];
           if (summarySheet['F2']) {
               extractedDtg = summarySheet['F2'].w || summarySheet['F2'].v;
               setScanDateOverride(extractedDtg);
           }
        }

        const primaryKdMatch = workbook.SheetNames.find(s => s.match(/\d{3,}/))?.match(/\d{3,}/);
        const primaryKd = primaryKdMatch ? primaryKdMatch[0] : "UNKNOWN";

        const tempTabs = [];

        for (const sheetName of workbook.SheetNames) {
          // EXCLUDE EXTRANEOUS TABS (HeroScrolls / RokBoard Metadata)
          const lowerName = sheetName.toLowerCase();
          if (lowerName.includes('summary') || lowerName.includes('top') || lowerName.includes('rolled up')) {
              continue;
          }

          const worksheet = workbook.Sheets[sheetName];

          const extractedKdMatch = sheetName.match(/\d{3,}/);
          const computedKd = extractedKdMatch ? extractedKdMatch[0] : primaryKd;

          const jsonPayload = XLSX.utils.sheet_to_json(worksheet, { defval: 0 });
          if (!jsonPayload || jsonPayload.length === 0) continue;

          // Process rows, identifying errors
          const processedRows = jsonPayload.map((p, idx) => {
            const id = p.id || p.Id || p.ID || p['Governor ID'] || p["Governor ID "] || p[" ID "];
            const name = p.name || p.Name || p.NAME || p['Governor Name'];
            
            return {
              _originalIndex: idx + 2, // Excel rows are 1-indexed, +1 for header
              _isGhost: !id || !name, // Flag as ghost if missing critical identifiers
              id: id || "MISSING",
              name: name || "MISSING",
              kingdomCol: p.Kingdom || p.kingdom || p.KINGDOM || "Unlisted",
              alliance: p['Alliance Tag'] || p['Alliance Name'] || p['alliance Tag'] || p.alliance || p.Alliance || p.ALLIANCE || "None",
              power: parseInt(p.power || p.Power || p.POWER) || 0,
              kp: parseInt(p.killpoints || p.killPoints || p.KillPoints || p['Kill Points']) || 0,
              dead: parseInt(p.deads || p.Deads || p.Dead || p.DEAD || p.DEADS) || 0,
              t4: parseInt(p.t4Kills || p.T4Kills || p['T4 Kills']) || 0,
              t5: parseInt(p.t5Kills || p.T5Kills || p['T5 Kills']) || 0,
              gathered: parseInt(p.gathered || p.Gathered || p.ResourcesGathered || p['Resources Gathered']) || 0,
              assistance: parseInt(p.assistance || p.Assistance || p.ASSISTANCE) || 0,
              tech: parseInt(p.techPower || p.TechPower || p['Tech Power']) || 0,
              com: parseInt(p.commanderPower || p.CommanderPower || p['Commander Power']) || 0,
              build: parseInt(p.buildingPower || p.BuildingPower || p['Building Power']) || 0,
            };
          });

          tempTabs.push({
            sheetName,
            computedKd,
            rows: processedRows,
            totalCount: processedRows.length,
            errorCount: processedRows.filter(r => r._isGhost).length
          });
        }

        setParsedTabs(tempTabs);
        setActiveTabIdx(0);
        setUploadStatus("idle");

      } catch (err) {
        console.error("Sandbox Read Error:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCommit = async () => {
    if (parsedTabs.length === 0) return;
    setIsUploading(true);
    setUploadStatus("idle");

    let successCount = 0;

    for (const tab of parsedTabs) {
      if (tab.computedKd === "UNKNOWN" || tab.rows.length === 0) continue;

      // Strip internal markers before sending to API
      const safeArray = tab.rows
        .filter(r => !r._isGhost)
        .map(r => ({
          id: r.id,
          name: r.name,
          alliance: r.alliance,
          power: r.power,
          killpoints: r.kp,
          deads: r.dead,
          t4Kills: r.t4,
          t5Kills: r.t5,
          gathered: r.gathered,
          assistance: r.assistance,
          techPower: r.tech,
          commanderPower: r.com,
          buildingPower: r.build
        }));

      if (safeArray.length === 0) continue;

      try {
        const res = await fetch('/api/aws/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kingdomId: tab.computedKd,
            rosterArray: safeArray,
            scanDateOverride: scanDateOverride
          })
        });

        if (res.ok) successCount++;
      } catch (e) {
        console.error("Commit failed for tab:", tab.sheetName, e);
      }
    }

    setIsUploading(false);
    setUploadStatus(successCount > 0 ? "success" : "error");
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      
      {/* Header */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-[#1e222b] p-4 rounded-xl border border-[#2d323e]">
            <Database className="text-amber-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-wider">Data Sandbox</h1>
            <p className="text-gray-400 mt-2 max-w-2xl text-sm">
              Visually audit how the Unity Engine parses external Excel spreadsheets. Drop your master file below to simulate an injection array without committing it to the live database.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Col: Upload & Tabs */}
        <div className="lg:col-span-1 space-y-6">
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()} 
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              if (!isUploading) processFile(e.dataTransfer.files?.[0]);
            }}
            className={`bg-[#13161c] border-2 border-dashed border-[#1e222b] hover:border-amber-500/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${parsedTabs.length > 0 ? 'py-6' : 'py-24'}`}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={(e) => processFile(e.target.files?.[0])} />
            <Upload size={32} className="text-amber-400 mb-3" />
            <span className="font-bold text-gray-300">Drop Master Scan</span>
            <span className="text-xs text-gray-500 mt-1">Accepts raw .xlsx or CSV</span>
          </div>

          {parsedTabs.length > 0 && (
            <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[#1e222b] bg-[#0a0c0f]">
                <h3 className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Simulated Database Hooks</h3>
              </div>
              <div className="p-2 space-y-1">
                {parsedTabs.map((tab, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveTabIdx(idx)}
                    className={`w-full text-left p-3 rounded-lg border flex justify-between items-center transition-all ${activeTabIdx === idx ? 'bg-amber-500/10 border-amber-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                  >
                    <div>
                      <div className={`font-bold text-sm ${activeTabIdx === idx ? 'text-amber-400' : 'text-gray-300'}`}>{tab.sheetName}</div>
                      <div className="text-[10px] text-gray-500 mt-1 font-mono flex items-center gap-2">
                        <span>Route: KD {tab.computedKd}</span>
                      </div>
                    </div>
                    {tab.errorCount > 0 && <AlertTriangle size={14} className="text-rose-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {parsedTabs.length > 0 && (
            <button
               onClick={handleCommit}
               disabled={isUploading || uploadStatus === 'success'}
               className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all shadow-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
            >
               {isUploading ? <Loader2 className="animate-spin" size={20} /> : uploadStatus === 'success' ? <CheckCircle2 size={20} /> : <Cloud size={20} />}
               {uploadStatus === 'success' ? 'Ignition Locked' : 'Commit to Unit Cloud'}
            </button>
          )}

          {parsedTabs.length > 0 && uploadStatus === 'success' && (
             <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-green-400 text-xs font-mono text-center">
                Data was successfully committed to DynamoDB. The live tracking arrays now possess this configuration.
             </div>
          )}
        </div>

        {/* Right Col: Grid Engine */}
        <div className="lg:col-span-3 bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-2xl flex flex-col h-[800px]">
          {parsedTabs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
               <Database size={64} className="mb-4 opacity-20" />
               <h3 className="text-xl font-bold">Awaiting Data Drop</h3>
               <p className="text-sm mt-2 max-w-sm text-center">Drag a master Excel file containing multiple tabs into the dropzone to review the native JSON layout.</p>
            </div>
          ) : (
             <div className="flex flex-col h-full relative">
                <div className="p-5 border-b border-[#1e222b] bg-[#0a0c0f] flex justify-between items-center">
                   <div>
                       <h2 className="text-white font-bold text-lg">{parsedTabs[activeTabIdx].sheetName}</h2>
                       <div className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-4">
                           <span>Target Node: <strong className="text-cyan-400">{parsedTabs[activeTabIdx].computedKd}</strong></span>
                           <span>Total Records: <strong>{parsedTabs[activeTabIdx].totalCount}</strong></span>
                           {parsedTabs[activeTabIdx].errorCount > 0 && (
                              <span className="text-rose-400 flex items-center gap-1"><AlertTriangle size={12} /> {parsedTabs[activeTabIdx].errorCount} Corrupted Rows Dropped</span>
                           )}
                           {scanDateOverride && (
                              <span className="text-amber-400 font-mono tracking-widest pl-2">DTG: {scanDateOverride}</span>
                           )}
                       </div>
                   </div>
                   <button onClick={() => setParsedTabs([])} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                      <Trash2 size={18} />
                   </button>
                </div>

                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-[#1e222b] scrollbar-track-transparent">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 bg-[#0a0c0f] shadow-md z-10 border-b border-[#1e222b]">
                            <tr>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Excel Row</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Governor ID</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Name</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Kingdom</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider">Alliance</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Power</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Kill Points</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Deads</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Gathered</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Assistance</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Tech Pwr</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Cmdr Pwr</th>
                                <th className="py-4 px-4 font-bold text-gray-400 text-xs uppercase tracking-wider text-right">Bldg Pwr</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e222b]/50">
                            {parsedTabs[activeTabIdx].rows.map((row, i) => (
                                <tr key={i} className={`group hover:bg-white/5 transition-colors ${row._isGhost ? 'bg-rose-500/5' : ''}`}>
                                    <td className="py-3 px-4 font-mono text-gray-600 text-xs">#{row._originalIndex}</td>
                                    <td className={`py-3 px-4 font-mono ${row.id === 'MISSING' ? 'text-rose-500 font-bold' : 'text-cyan-400'}`}>{row.id}</td>
                                    <td className={`py-3 px-4 whitespace-nowrap ${row.name === 'MISSING' ? 'text-rose-500 font-bold' : 'text-gray-300 font-medium'}`}>{row.name}</td>
                                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">{row.kingdomCol}</td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <span className="px-2 py-1 rounded bg-[#1e222b] text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                                            {row.alliance}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-400 font-mono">{row.power.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-gray-400 font-mono">{row.kp.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-rose-400/80 font-mono">{row.dead.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-amber-400/80 font-mono whitespace-nowrap">{row.gathered.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-emerald-400/80 font-mono whitespace-nowrap">{row.assistance.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-cyan-400/80 font-mono whitespace-nowrap">{row.tech.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-violet-400/80 font-mono whitespace-nowrap">{row.com.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-indigo-400/80 font-mono whitespace-nowrap">{row.build.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
