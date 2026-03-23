"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ShieldAlert, Crosshair, Map, RefreshCw, UploadCloud, Target, BrainCircuit, Activity } from "lucide-react";

export default function RealestatePredictor() {
  const { data: session } = useSession();
  
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  if (!session?.user?.isLeader && session?.user?.role !== "Admin") {
      return (
        <div className="w-full mx-auto flex flex-col items-center justify-center p-24 text-center">
            <ShieldAlert className="w-16 h-16 text-rose-500 mb-6 opacity-80" />
            <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">High Command Only</h1>
            <p className="text-rose-400 font-bold uppercase tracking-widest text-sm">Clearance Level Insufficient to access AI Cartography models.</p>
        </div>
      );
  }

  const handleFileDrop = (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const droppedFile = e.dataTransfer.files[0];
          setFile(droppedFile);
          setPreviewUrl(URL.createObjectURL(droppedFile));
          setResult(null);
      }
  };

  const handleFileSelect = (e) => {
      if(e.target.files && e.target.files[0]) { 
          const selectedFile = e.target.files[0];
          setFile(selectedFile); 
          setPreviewUrl(URL.createObjectURL(selectedFile));
          setResult(null);
      }
  }

  const executeAnalysis = async () => {
      if (!file) return;
      setAnalyzing(true);
      
      const formData = new FormData();
      formData.append("map_screenshot", file);

      try {
          const res = await fetch("/api/aws/realestate", { method: "POST", body: formData });
          const data = await res.json();
          if (data.success) {
              setResult(data.data);
          } else {
              alert("Cartography Engine Error: " + data.error);
          }
      } catch (err) {
          alert("Network Timeout connecting to Vision API.");
      } finally {
          setAnalyzing(false);
      }
  };

  const DensityBadge = ({ level }) => {
      const p = level?.toLowerCase();
      if (p === 'optimal' || p === 'low') return <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded font-bold uppercase tracking-widest text-xs">Optimal Spread</span>;
      if (p === 'high') return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded font-bold uppercase tracking-widest text-xs">High Density</span>;
      return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded font-bold uppercase tracking-widest text-xs">Critical Overcrowding</span>;
  }

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10 w-full mb-2">
          <Map className="text-cyan-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Realestate Predictor</h1>
            <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">AI cartography & economic node density analysis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload Column */}
        <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg border-t-2 border-t-cyan-500">
             <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
               <Target className="text-cyan-500" size={20} />
               <h2 className="text-white font-bold uppercase tracking-widest text-sm">Zone Target</h2>
             </div>
             
             <div className="p-6">
                 {previewUrl ? (
                     <div className="space-y-4">
                         <div className="relative rounded-lg overflow-hidden border border-[#2d323e]">
                             <img src={previewUrl} alt="Map Preview" className="w-full h-auto max-h-[300px] object-cover opacity-80" />
                             {analyzing && (
                                 <div className="absolute inset-0 bg-[#0f1115]/80 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                                     <Crosshair className="text-cyan-500 animate-spin w-12 h-12 mb-4" />
                                     <span className="text-cyan-400 font-bold uppercase tracking-widest text-xs animate-pulse">Running Geometrics...</span>
                                 </div>
                             )}
                         </div>
                         <div className="flex gap-4">
                             <button onClick={() => { setFile(null); setPreviewUrl(null); setResult(null); }} className="flex-1 py-3 bg-[#1e222b] hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">Clear Target</button>
                             <button onClick={executeAnalysis} disabled={analyzing} className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-[#0f1115] rounded-lg text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2">
                                 {analyzing ? <RefreshCw size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                                 {analyzing ? "Computing..." : "Execute Scan"}
                             </button>
                         </div>
                     </div>
                 ) : (
                     <div 
                        onDragOver={(e) => e.preventDefault()} 
                        onDrop={handleFileDrop}
                        className="border-2 border-dashed border-[#2d323e] hover:border-cyan-500/50 bg-[#0f1115] rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer h-[300px]"
                        onClick={() => document.getElementById('mapUpload').click()}
                     >
                        <UploadCloud size={48} className="text-gray-600 mb-4" />
                        <h3 className="text-white font-black tracking-widest uppercase text-lg mb-2">Upload Sector Topology</h3>
                        <p className="text-gray-500 text-sm font-medium mb-6">Drag & drop a screenshot of the Alliance Flag territory.</p>
                        <input type="file" id="mapUpload" hidden accept="image/*" onChange={handleFileSelect}/>
                        <div className="px-6 py-3 bg-[#1e222b] text-white rounded-lg font-bold text-xs uppercase tracking-widest border border-[#2d323e]">Browse Files</div>
                     </div>
                 )}
             </div>
        </div>

        {/* Results Analysis Column */}
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl flex flex-col">
             <div className="bg-[#0a0c0f] px-6 py-4 border-b border-[#1e222b] flex items-center gap-3">
               <Activity className="text-rose-500" size={20} />
               <h2 className="text-white font-bold uppercase tracking-widest text-sm">Strategic Output</h2>
             </div>
             
             <div className="p-8 flex-1 flex flex-col justify-center">
                 {!result ? (
                     <div className="text-center text-gray-500">
                         <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
                         <p className="font-bold uppercase tracking-widest text-xs">Awaiting geographical telemetry data.</p>
                     </div>
                 ) : (
                     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         
                         <div className="flex items-center justify-between border-b border-[#1e222b] pb-6">
                             <div>
                                 <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Entity Footprint</p>
                                 <h3 className="text-4xl font-black text-white font-mono">{result.castleCount} <span className="text-sm font-bold text-gray-500 uppercase tracking-widest font-sans">Castles</span></h3>
                             </div>
                             <div className="text-right">
                                 <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Calculated Density</p>
                                 <DensityBadge level={result.densityLevel} />
                             </div>
                         </div>

                         <div>
                             <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Economic Impact Analysis</p>
                             <div className="bg-[#13161c] border border-rose-500/30 p-4 rounded-lg">
                                 <p className="text-gray-300 text-sm leading-relaxed">{result.economicImpact}</p>
                             </div>
                         </div>

                         <div>
                             <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">AI Tactical Directive</p>
                             <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg flex gap-3">
                                 <Crosshair className="text-cyan-400 shrink-0 mt-0.5" size={18} />
                                 <p className="text-cyan-100 text-sm font-medium leading-relaxed">{result.tacticalAdvice}</p>
                             </div>
                         </div>

                     </div>
                 )}
             </div>
        </div>

      </div>
    </div>
  );
}
