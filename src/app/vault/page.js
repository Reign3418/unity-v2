"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
    Building2, RefreshCw, Box, Layers, Pickaxe, Coins, 
    TrendingUp, ShieldAlert, ArrowUpRight, UploadCloud, CheckCircle2, X
} from "lucide-react";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function KingdomVault() {
  const { data: session } = useSession();
  
  const [logs, setLogs] = useState([]);
  const [totals, setTotals] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Upload State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProfile, setUploadProfile] = useState("Main");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fetchVault = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/aws/rss`);
      const data = await res.json();
      
      if (res.ok) {
          setLogs(data.logs || []);
          setTotals(data.totals);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchVault();
    }
  }, [session]);

  const formatBillion = (num) => num ? (Number(num) / 1000000000).toFixed(2) + 'B' : "0";
  const formatMillion = (num) => num ? (Number(num) / 1000000).toFixed(1) + 'M' : "0";

  const COLORS = ['#ef4444', '#f59e0b', '#84cc16', '#eab308'];
  const pieData = totals ? [
      { name: 'Food', value: totals.food },
      { name: 'Wood', value: totals.wood },
      { name: 'Stone', value: totals.stone },
      { name: 'Gold', value: totals.gold }
  ] : [];

  const handleFileDrop = (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          setFile(e.dataTransfer.files[0]);
          setUploadSuccess(false);
      }
  };

  const executeScan = async () => {
      if (!file) return;
      setUploading(true);
      
      const formData = new FormData();
      formData.append("screenshot", file);
      formData.append("profile", uploadProfile);

      try {
          const res = await fetch("/api/aws/vault/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (data.success) {
              setUploadSuccess(true);
              setFile(null);
              if (session?.user?.isLeader || session?.user?.role === "Admin") fetchVault();
          } else {
              alert("OCR Engine Error: " + data.error);
          }
      } catch (err) {
          alert("Network Timeout connecting to Vision API.");
      } finally {
          setUploading(false);
      }
  };

  const isHighCommand = session?.user?.isLeader || session?.user?.role === "Admin";

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
          <div className="flex items-center gap-4">
             <div className="bg-[#1e222b] p-3 rounded-xl border border-[#2d323e]">
               <Building2 className="text-amber-500" size={32} />
             </div>
             <div>
               <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                 Kingdom Vault
               </h1>
               <p className="text-amber-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Pre-KvK Economic Reserves matrix</p>
             </div>
          </div>
          
          {isHighCommand && (
              <button 
                  onClick={fetchVault}
                  disabled={isLoading}
                  className="p-2.5 bg-[#13161c] hover:bg-[#1e222b] text-white border border-[#1e222b] rounded-lg transition-colors shadow-lg flex items-center gap-2"
              >
                  <RefreshCw size={18} className={isLoading ? "animate-spin text-amber-500" : ""} />
                  <span className="text-xs font-bold uppercase">Sync AWS</span>
              </button>
          )}
        </div>
      </div>

      {/* Secret OCR Dropzone Module */}
      <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl">
         <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
            <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-cyan-500" />
                <h2 className="text-white font-bold uppercase tracking-widest">Secret Asset Verification Override</h2>
            </div>
            <select 
                value={uploadProfile} 
                onChange={(e) => setUploadProfile(e.target.value)}
                className="bg-[#1e222b] border border-[#2d323e] text-white p-2 rounded text-xs font-bold uppercase tracking-widest outline-none"
            >
                <option value="Main">Main Account</option>
                <option value="Alt">Alt Account</option>
                <option value="Farm">Farm Account</option>
            </select>
         </div>
         
         <div className="p-8">
            <div 
               onDragOver={(e) => e.preventDefault()} 
               onDrop={handleFileDrop}
               className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all ${
                   uploadSuccess ? "border-green-500/50 bg-green-500/5" : "border-[#2d323e] hover:border-cyan-500/50 bg-[#0f1115]"
               }`}
            >
               {uploadSuccess ? (
                   <>
                       <CheckCircle2 size={48} className="text-green-500 mb-4 animate-bounce" />
                       <h3 className="text-green-400 font-black tracking-widest uppercase text-xl mb-1">Payload Verified</h3>
                       <p className="text-gray-400 text-sm font-medium">Your resources have been secretly compiled into the Kingdom Vault.</p>
                       <button onClick={() => setUploadSuccess(false)} className="mt-6 text-xs text-gray-500 hover:text-white uppercase font-bold tracking-widest underline">Scan Another Target</button>
                   </>
               ) : (
                   <>
                       <UploadCloud size={48} className="text-gray-600 mb-4" />
                       <h3 className="text-white font-black tracking-widest uppercase text-lg mb-2">Drag & Drop Database Screenshot</h3>
                       <p className="text-gray-500 text-sm font-medium max-w-md mx-auto mb-6">Our Google Gemini AI Engine will securely read your Food, Wood, Stone, and Gold inventory tokens instantly without logging IP endpoints.</p>
                       
                       <input 
                          type="file" 
                          id="fileUpload" 
                          hidden 
                          accept="image/*" 
                          onChange={(e) => { if(e.target.files[0]) { setFile(e.target.files[0]); setUploadSuccess(false); } }}
                       />
                       
                       <div className="flex gap-4">
                           <label htmlFor="fileUpload" className="px-6 py-3 bg-[#1e222b] hover:bg-gray-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest cursor-pointer transition-colors border border-[#2d323e]">
                               Locate File
                           </label>
                           
                           {file && (
                               <button 
                                   onClick={executeScan}
                                   disabled={uploading}
                                   className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-[#0f1115] rounded-lg font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
                               >
                                   {uploading ? <RefreshCw className="animate-spin" size={16} /> : <ArrowUpRight size={16} />}
                                   {uploading ? "Analyzing Topology..." : "Trigger AI Override"}
                               </button>
                           )}
                       </div>
                       
                       {file && !uploading && (
                           <p className="text-cyan-400 text-xs font-bold mt-4 tracking-widest bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">{file.name}</p>
                       )}
                   </>
               )}
            </div>
         </div>
      </div>

      {/* Leadership-Only Vault Data */}
      {!isHighCommand ? (
          <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <ShieldAlert size={32} className="text-rose-500 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Security Matrix Locked. Kingdom Aggregated totals require High Command access.</p>
          </div>
      ) : isLoading ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex items-center justify-center">
            <RefreshCw className="animate-spin text-amber-500 w-8 h-8" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-12 flex flex-col items-center justify-center text-gray-500">
            <Box className="w-12 h-12 mb-4 opacity-50 text-amber-500" />
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-widest">Vault Empty</h3>
            <p className="text-sm">No Discord OCR RSS Logs have been uploaded into DynamoDB.</p>
        </div>
      ) : (
        <>
            {/* Top Stat Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 bg-[#13161c] border border-[#1e222b] rounded-xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-center border-l-4 border-l-amber-500">
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                         <TrendingUp size={14} className="text-amber-500"/> Total Tracked Gross
                     </h3>
                     <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                         {logs.length} Sub-Nodes
                     </span>
                  </div>
                  <div className="text-4xl font-black text-white font-mono">{formatBillion(totals.overall)}</div>
              </div>

              {[
                  { label: "Food", val: formatBillion(totals.food), icon: Box, color: "text-rose-500", bg: "bg-rose-500" },
                  { label: "Wood", val: formatBillion(totals.wood), icon: Layers, color: "text-amber-500", bg: "bg-amber-500" },
                  { label: "Stone", val: formatBillion(totals.stone), icon: Pickaxe, color: "text-lime-500", bg: "bg-lime-500" }
              ].map((m, i) => (
                  <div key={i} className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-5 shadow-lg flex flex-col justify-center items-center text-center">
                      <m.icon size={20} className={`${m.color} mb-2`} />
                      <h3 className="text-white font-black font-mono text-xl">{m.val}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">{m.label}</p>
                  </div>
              ))}
            </div>

            {/* Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Pie Chart Analysis */}
                <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl shadow-xl p-6 flex flex-col">
                    <h2 className="text-white font-bold uppercase tracking-widest text-sm mb-4">Economic Weight Model</h2>
                    <div className="flex-1 min-h-[300px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value) => [(value / 1000000000).toFixed(2) + 'B', 'Stored']}
                                    contentStyle={{ backgroundColor: '#0f1115', borderColor: '#1e222b', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hoarder Grid */}
                <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl flex flex-col">
                    <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center justify-between">
                        <h2 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                        <ArrowUpRight size={18} className="text-cyan-500" />
                        Top Logistics Governors (Aggregated Assets)
                        </h2>
                    </div>
                    <div className="overflow-auto flex-1 h-[400px]">
                        <table className="w-full whitespace-nowrap">
                            <thead className="bg-[#13161c] sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 w-16 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">#</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Governor / Profile</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Total Net Worth</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Food</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Wood</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Stone</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#1e222b]">Gold</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e222b]">
                            {logs.sort((a,b) => b.totalRSS - a.totalRSS).map((log, index) => (
                                <tr key={index} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-4 py-3 text-center text-xs text-gray-600 font-bold">{index + 1}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {log.alias !== 'Unknown' ? log.alias : `Discord: ${log.discordId}`}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${log.profile === 'Main' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700/50 text-gray-400'}`}>
                                                {log.profile}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-bold text-cyan-400 font-mono">{formatBillion(log.totalRSS)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs">{formatMillion(log.rawParsed?.Food)}</td>
                                    <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs">{formatMillion(log.rawParsed?.Wood)}</td>
                                    <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs">{formatMillion(log.rawParsed?.Stone)}</td>
                                    <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs">{formatMillion(log.rawParsed?.Gold)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
      )}

    </div>
  );
}
