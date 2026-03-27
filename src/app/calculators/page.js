"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Timer, Wheat, Zap, Crown, BookOpen, Clock, AlertCircle, Trash2, Shield, Upload, X, Check, Loader2, ShieldAlert, Crosshair, Map, RefreshCw, UploadCloud, Target, BrainCircuit, Activity } from "lucide-react";

export default function CalculatorsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("speedups");

  // State hooks for all calculators
  const [speedups, setSpeedups] = useState({ 
    "1m": 0, "5m": 0, "10m": 0, "15m": 0, 
    "30m": 0, "60m": 0, "3h": 0, "8h": 0, 
    "15h": 0, "24h": 0, "3d": 0, "7d": 0, "30d": 0 
  });
  
  const [resources, setResources] = useState({
    food: { "1K": 0, "10K": 0, "50K": 0, "150K": 0, "500K": 0, "1.5M": 0, "5M": 0 },
    wood: { "1K": 0, "10K": 0, "50K": 0, "150K": 0, "500K": 0, "1.5M": 0, "5M": 0 },
    stone: { "750": 0, "7.5K": 0, "37.5K": 0, "112.5K": 0, "375K": 0, "1.125M": 0, "3.75M": 0 },
    gold: { "500": 0, "5K": 0, "15K": 0, "50K": 0, "200K": 0, "600K": 0, "2M": 0 }
  });

  const [ap, setAp] = useState({ "50": 0, "100": 0, "500": 0, "1000": 0 });

  // === Equipment Forge States ===
  const [forgeTargetQuality, setForgeTargetQuality] = useState("legendary");
  const [forgeData, setForgeData] = useState({
    leather: { legendary: 0, epic: 0, elite: 0, advanced: 0, normal: 0 },
    ebony: { legendary: 0, epic: 0, elite: 0, advanced: 0, normal: 0 },
    iron: { legendary: 0, epic: 0, elite: 0, advanced: 0, normal: 0 },
    bone: { legendary: 0, epic: 0, elite: 0, advanced: 0, normal: 0 }
  });
  const [isOCRScanning, setIsOCRScanning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const fileInputRef = useRef(null);

  // === Real Estate Predictor States ===
  const [rsFile, setRsFile] = useState(null);
  const [rsAnalyzing, setRsAnalyzing] = useState(false);
  const [rsResult, setRsResult] = useState(null);
  const [rsPreviewUrl, setRsPreviewUrl] = useState(null);
  const rsImgRef = useRef(null);
  const [rsMouseCoords, setRsMouseCoords] = useState(null);
  const [rsDraggingIdx, setRsDraggingIdx] = useState(null);

  // === Real Estate Engine Math ===
  const handleRsMouseMove = (e) => {
    if (!rsImgRef.current) return;
    const rect = rsImgRef.current.getBoundingClientRect();
    let x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    let y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setRsMouseCoords({ x, y });

    if (rsDraggingIdx !== null && rsResult?.troubleSpots) {
      const newSpots = [...rsResult.troubleSpots];
      newSpots[rsDraggingIdx] = { ...newSpots[rsDraggingIdx], x, y };
      setRsResult({ ...rsResult, troubleSpots: newSpots });
    }
  };

  const handleRsMouseUp = () => setRsDraggingIdx(null);
  const handleRsMouseLeave = () => {
    setRsMouseCoords(null);
    setRsDraggingIdx(null);
  };

  const handleRsFileDrop = (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const droppedFile = e.dataTransfer.files[0];
          setRsFile(droppedFile);
          setRsPreviewUrl(URL.createObjectURL(droppedFile));
          setRsResult(null);
      }
  };

  const handleRsFileSelect = (e) => {
      if(e.target.files && e.target.files[0]) { 
          const selectedFile = e.target.files[0];
          setRsFile(selectedFile); 
          setRsPreviewUrl(URL.createObjectURL(selectedFile));
          setRsResult(null);
      }
  };

  const executeRsAnalysis = async () => {
      if (!rsFile) return;
      setRsAnalyzing(true);
      
      const formData = new FormData();
      formData.append("map_screenshot", rsFile);

      let customGeminiKey = "";
      try {
          const prefs = JSON.parse(localStorage.getItem('unty_prefs') || "{}");
          customGeminiKey = prefs.geminiKey || "";
      } catch (e) {}

      try {
          const res = await fetch("/api/aws/realestate", { 
              method: "POST", 
              headers: {
                  ...(customGeminiKey ? { 'x-gemini-key': customGeminiKey } : {})
              },
              body: formData 
          });
          const data = await res.json();
          if (data.success) {
              setRsResult(data.data);
          } else {
              alert("Cartography Engine Error: " + data.error);
          }
      } catch (err) {
          alert("Network Timeout connecting to Vision API.");
      } finally {
          setRsAnalyzing(false);
      }
  };

  const DensityBadge = ({ level }) => {
      const p = level?.toLowerCase();
      if (p === 'optimal' || p === 'low') return <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded font-bold uppercase tracking-widest text-xs">Optimal Spread</span>;
      if (p === 'high') return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded font-bold uppercase tracking-widest text-xs">High Density</span>;
      return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded font-bold uppercase tracking-widest text-xs">Critical Overcrowding</span>;
  };

  // Math engines
  const calculateTotalSpeedups = () => {
    let totalMinutes = 0;
    totalMinutes += (speedups["1m"] || 0) * 1;
    totalMinutes += (speedups["5m"] || 0) * 5;
    totalMinutes += (speedups["10m"] || 0) * 10;
    totalMinutes += (speedups["15m"] || 0) * 15;
    totalMinutes += (speedups["30m"] || 0) * 30;
    totalMinutes += (speedups["60m"] || 0) * 60;
    totalMinutes += (speedups["3h"] || 0) * 180;
    totalMinutes += (speedups["8h"] || 0) * 480;
    totalMinutes += (speedups["15h"] || 0) * 900;
    totalMinutes += (speedups["24h"] || 0) * 1440;
    totalMinutes += (speedups["3d"] || 0) * 4320;
    totalMinutes += (speedups["7d"] || 0) * 10080;
    totalMinutes += (speedups["30d"] || 0) * 43200;
    
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    
    return { days, hours, minutes, totalMinutes };
  };

  const speedupTotals = calculateTotalSpeedups();

  const handleSpeedupChange = (tier, val) => {
    setSpeedups(prev => ({ ...prev, [tier]: parseInt(val) || 0 }));
  };

  const handleApChange = (tier, val) => {
    setAp(prev => ({ ...prev, [tier]: parseInt(val) || 0 }));
  };

  const handleResourceChange = (type, tier, val) => {
    setResources(prev => ({
      ...prev,
      [type]: { ...prev[type], [tier]: parseInt(val) || 0 }
    }));
  };

  const calculateTotalRes = (type) => {
    let total = 0;
    const tierMap = {
      food: { "1K": 1000, "10K": 10000, "50K": 50000, "150K": 150000, "500K": 500000, "1.5M": 1500000, "5M": 5000000 },
      wood: { "1K": 1000, "10K": 10000, "50K": 50000, "150K": 150000, "500K": 500000, "1.5M": 1500000, "5M": 5000000 },
      stone: { "750": 750, "7.5K": 7500, "37.5K": 37500, "112.5K": 112500, "375K": 375000, "1.125M": 1125000, "3.75M": 3750000 },
      gold: { "500": 500, "5K": 5000, "15K": 15000, "50K": 50000, "200K": 200000, "600K": 600000, "2M": 2000000 }
    };

    for (const [tier, multiplier] of Object.entries(tierMap[type])) {
      total += (resources[type][tier] || 0) * multiplier;
    }
    return total;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  // === Forge Engine Math ===
  const handleForgeChange = (type, rarity, val) => {
    setForgeData(prev => ({
      ...prev,
      [type]: { ...prev[type], [rarity]: parseInt(val) || 0 }
    }));
  };

  const calculateForgeYield = (type) => {
    const data = forgeData[type];
    const leg = data.legendary || 0;
    const epic = data.epic || 0;
    const elite = data.elite || 0;
    const adv = data.advanced || 0;
    const norm = data.normal || 0;

    let finalLeg = 0, finalEpic = 0, finalElite = 0, finalAdv = 0, finalNorm = 0;
    let remainder = 0;

    if (forgeTargetQuality === 'legendary') {
        remainder = (leg * 256) + (epic * 64) + (elite * 16) + (adv * 4) + norm;
        finalLeg = Math.floor(remainder / 256); remainder %= 256;
        finalEpic = Math.floor(remainder / 64); remainder %= 64;
        finalElite = Math.floor(remainder / 16); remainder %= 16;
        finalAdv = Math.floor(remainder / 4); remainder %= 4;
        finalNorm = remainder;
    } else if (forgeTargetQuality === 'epic') {
        finalLeg = leg;
        remainder = (epic * 64) + (elite * 16) + (adv * 4) + norm;
        finalEpic = Math.floor(remainder / 64); remainder %= 64;
        finalElite = Math.floor(remainder / 16); remainder %= 16;
        finalAdv = Math.floor(remainder / 4); remainder %= 4;
        finalNorm = remainder;
    } else if (forgeTargetQuality === 'elite') {
        finalLeg = leg; finalEpic = epic;
        remainder = (elite * 16) + (adv * 4) + norm;
        finalElite = Math.floor(remainder / 16); remainder %= 16;
        finalAdv = Math.floor(remainder / 4); remainder %= 4;
        finalNorm = remainder;
    } else if (forgeTargetQuality === 'advanced') {
        finalLeg = leg; finalEpic = epic; finalElite = elite;
        remainder = (adv * 4) + norm;
        finalAdv = Math.floor(remainder / 4); remainder %= 4;
        finalNorm = remainder;
    } else {
        finalLeg = leg; finalEpic = epic; finalElite = elite; finalAdv = adv;
        finalNorm = norm;
    }

    return { legendary: finalLeg, epic: finalEpic, elite: finalElite, advanced: finalAdv, normal: finalNorm };
  };

  const processOCRFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        setOcrStatus("Error: Invalid file format. Please upload an image PNG/JPEG.");
        return;
    }

    try {
        setIsOCRScanning(true);
        setOcrStatus("Parsing raw inventory via Gemini Vision Model...");

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            
            const res = await fetch('/api/aws/admin/vision/forge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64, mimeType: file.type })
            });

            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.error || "Vision OCR Server Error");
            }

            const parsed = await res.json();
            
            // Apply JSON Payload to State
            const updatedForge = { ...forgeData };
            ['leather', 'ebony', 'iron', 'bone'].forEach(type => {
                if (parsed[type]) {
                    updatedForge[type] = {
                        legendary: parseCleanInt(parsed[type].legendary),
                        epic: parseCleanInt(parsed[type].epic),
                        elite: parseCleanInt(parsed[type].elite),
                        advanced: parseCleanInt(parsed[type].advanced),
                        normal: parseCleanInt(parsed[type].normal)
                    };
                }
            });

            setForgeData(updatedForge);
            setOcrStatus("Synthesis Payload Applied Successfully!");
            setTimeout(() => setOcrStatus(""), 5000);
        };
    } catch (e) {
        console.error("OCR Exception", e);
        setOcrStatus("OCR Failure: " + (e.message || "Could not read matrix."));
    } finally {
        setIsOCRScanning(false);
    }
  };

  const handleForgeDrop = (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processOCRFile(e.dataTransfer.files[0]);
      }
  };

  const parseCleanInt = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
          if (val.includes('+')) {
              return val.split('+').reduce((acc, curr) => acc + (parseInt(curr.replace(/[^0-9]/g, '')) || 0), 0);
          }
          return parseInt(val.replace(/[^0-9]/g, '')) || 0;
      }
      return 0;
  };

  // UI Components
  const TabButton = ({ id, icon: Icon, label, color }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold transition-all duration-200 whitespace-nowrap ${
        activeTab === id 
        ? `border-${color}-500 text-${color}-400 bg-${color}-500/5` 
        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center gap-4 relative z-10 w-full mb-2">
          <BookOpen className="text-indigo-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Unified Calculators</h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Inventory Projection Systems</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0c0f] border border-[#1e222b] rounded-xl overflow-x-auto px-2 no-scrollbar">
        <TabButton id="speedups" icon={Timer} label="Speedups" color="indigo" />
        <TabButton id="resources" icon={Wheat} label="Resources" color="amber" />
        <TabButton id="ap" icon={Zap} label="Action Points" color="cyan" />
        <TabButton id="forge" icon={Shield} label="Equipment Forge" color="blue" />
        <TabButton id="realestate" icon={Map} label="Realestate Predictor" color="teal" />
      </div>

      {/* Content Area */}
      {activeTab === "speedups" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-[#1e222b] pb-4">
              <Timer className="text-indigo-500" size={20} /> Speedup Inventory Matrix
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Object.keys(speedups).map((tier) => (
                <div key={tier} className="bg-[#0a0c0f] border border-[#1e222b] p-3 rounded-lg flex flex-col items-center gap-2 group hover:border-indigo-500/40 transition-colors">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{tier} Items</div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={speedups[tier] || ""}
                    onChange={(e) => handleSpeedupChange(tier, e.target.value)}
                    className="w-full text-center bg-[#13161c] border border-[#1e222b] text-white font-mono rounded py-2 text-lg focus:border-indigo-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={() => setSpeedups({ "1m": 0, "5m": 0, "10m": 0, "15m": 0, "30m": 0, "60m": 0, "3h": 0, "8h": 0, "15h": 0, "24h": 0, "3d": 0, "7d": 0, "30d": 0 })}
              className="mt-6 text-xs text-rose-500 hover:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear Form
            </button>
          </div>

          <div className="bg-[#13161c] border-x border-b border-t-2 border-t-indigo-500 rounded-xl p-6 shadow-xl sticky top-6">
            <h2 className="text-indigo-400 font-black text-xl mb-6 uppercase tracking-widest text-center">Total Time Yield</h2>
            <div className="space-y-4">
              <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-5 text-center shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] border-l-4 border-l-indigo-500">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Standard Display</div>
                <div className="text-2xl font-black text-white font-mono">
                  {speedupTotals.days}d {speedupTotals.hours}h {speedupTotals.minutes}m
                </div>
              </div>
              <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Hours</div>
                <div className="text-xl font-bold text-gray-300 font-mono">
                  {(speedupTotals.totalMinutes / 60).toLocaleString(undefined, {maximumFractionDigits: 1})} hrs
                </div>
              </div>
               <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Minutes</div>
                <div className="text-xl font-bold text-gray-300 font-mono">
                  {speedupTotals.totalMinutes.toLocaleString()} m
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "resources" && (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-8">
              {['food', 'wood', 'stone', 'gold'].map(type => (
                <div key={type} className="border border-[#1e222b] bg-[#0a0c0f] rounded-xl p-5 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    type === 'food' ? 'bg-amber-500' : type === 'wood' ? 'bg-cyan-600' : type === 'stone' ? 'bg-gray-400' : 'bg-yellow-400'
                  }`}></div>
                  
                  <div className="flex justify-between items-center mb-4 pl-4 border-b border-[#1e222b] pb-3">
                    <h3 className="text-white font-bold uppercase tracking-widest flex items-center gap-2">
                       <Wheat size={16} className={
                         type === 'food' ? 'text-amber-500' : type === 'wood' ? 'text-cyan-600' : type === 'stone' ? 'text-gray-400' : 'text-yellow-400'
                       } /> 
                       {type}
                    </h3>
                    <div className="bg-[#1e222b] px-4 py-1.5 rounded-full font-mono font-black text-sm text-white shadow-lg">
                      {formatNumber(calculateTotalRes(type))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 pl-4">
                    {Object.keys(resources[type]).map(tier => (
                      <div key={tier} className="flex flex-col items-center gap-1 group">
                        <label className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{tier}</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={resources[type][tier] || ""}
                          onChange={(e) => handleResourceChange(type, tier, e.target.value)}
                          className="w-full text-center bg-[#13161c] border border-[#1e222b] group-hover:border-amber-500/30 text-white font-mono rounded py-1.5 text-sm focus:border-amber-500 outline-none transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ap" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-[#1e222b] pb-4">
              <Zap className="text-cyan-500" size={20} /> Action Point Reserve Math
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['50', '100', '500', '1000'].map(tier => (
                <div key={tier} className="bg-[#0a0c0f] border border-[#1e222b] p-4 rounded-lg flex flex-col items-center gap-2 group hover:border-cyan-500/40 transition-colors">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{tier} AP Vials</div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={ap[tier] || ""}
                    onChange={(e) => handleApChange(tier, e.target.value)}
                    className="w-full text-center bg-[#13161c] border border-[#1e222b] text-white font-mono rounded py-2 text-xl focus:border-cyan-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#13161c] border-x border-b border-t-2 border-t-cyan-500 rounded-xl p-6 shadow-xl sticky top-6">
            <h2 className="text-cyan-400 font-black text-xl mb-6 uppercase tracking-widest text-center">Total Reserves</h2>
            <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-6 text-center shadow-[inset_0_0_30px_rgba(6,182,212,0.05)] border-l-4 border-l-cyan-500 mb-6">
              <div className="text-4xl font-black text-white font-mono">
                {((ap['50']||0)*50 + (ap['100']||0)*100 + (ap['500']||0)*500 + (ap['1000']||0)*1000).toLocaleString()} <span className="text-cyan-500 text-2xl">AP</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPMENT FORGE */}
      {activeTab === "forge" && (
        <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-6 shadow-xl relative overflow-hidden animate-fade-in">
          <div className="flex border-b border-[#1e222b] pb-4 mb-6 items-center justify-between">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Shield className="text-blue-500" size={20} /> Equipment Forge Synthesis Math
            </h2>
            <div className="flex items-center gap-2 bg-[#13161c] border border-[#1e222b] rounded-full px-4 py-1 text-sm font-bold">
               <span className="text-gray-400">Target Synthetics:</span>
               <select 
                 className="bg-transparent text-blue-400 font-bold outline-none cursor-pointer"
                 value={forgeTargetQuality}
                 onChange={(e) => setForgeTargetQuality(e.target.value)}
               >
                  <option value="legendary">Legendary (Gold)</option>
                  <option value="epic">Epic (Purple)</option>
                  <option value="elite">Elite (Blue)</option>
                  <option value="advanced">Advanced (Green)</option>
               </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${isOCRScanning ? 'border-blue-500 bg-blue-500/10' : 'border-[#2a2e38] hover:border-blue-500 hover:bg-white/5'}`}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={handleForgeDrop}
                  onClick={() => fileInputRef.current?.click()}
              >
                  <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => processOCRFile(e.target.files[0])} accept="image/*" />
                  
                  {isOCRScanning ? (
                      <div className="flex flex-col items-center text-blue-400 animate-pulse">
                          <Loader2 size={32} className="animate-spin mb-3" />
                          <div className="font-bold text-lg">Synthesizing Vision Extractor...</div>
                          <div className="text-xs text-blue-500/70 mt-1">{ocrStatus}</div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center">
                          <Upload size={32} className="text-gray-500 mb-3" />
                          <div className="font-bold text-gray-300 text-lg">Drop Material Inventory Screenshot Here</div>
                          <div className="text-xs text-blue-400/80 mt-1 uppercase tracking-widest font-bold">Powered natively by Gemini Core</div>
                          {ocrStatus && <div className="mt-3 text-xs font-bold text-success-color text-emerald-400">{ocrStatus}</div>}
                      </div>
                  )}
              </div>

              <div className="space-y-4">
                  {['leather', 'ebony', 'iron', 'bone'].map(type => (
                      <div key={type} className="border border-[#1e222b] bg-[#0a0c0f] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center relative overflow-hidden">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent to-blue-500/50`}></div>
                          
                          <div className="w-24 text-center md:text-left pl-2">
                             <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Stockpile</div>
                             <div className="font-black text-white capitalize">{type}</div>
                          </div>

                          <div className="grid grid-cols-5 gap-2 flex-1">
                              {['legendary', 'epic', 'elite', 'advanced', 'normal'].map(rarity => (
                                  <div key={rarity} className="flex flex-col gap-1">
                                      <div className={`text-[10px] font-bold uppercase tracking-wider text-center ${
                                          rarity === 'legendary' ? 'text-amber-400' : 
                                          rarity === 'epic' ? 'text-purple-400' : 
                                          rarity === 'elite' ? 'text-blue-400' : 
                                          rarity === 'advanced' ? 'text-green-400' : 'text-gray-400'
                                      }`}>
                                          {rarity}
                                      </div>
                                      <input
                                          type="number" min="0" placeholder="0"
                                          value={forgeData[type][rarity] || ""}
                                          onChange={(e) => handleForgeChange(type, rarity, e.target.value)}
                                          className="w-full text-center bg-[#13161c] border border-[#1e222b] text-white font-mono rounded py-1.5 focus:border-blue-500 outline-none"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
            </div>

            <div className="bg-[#13161c] border-x border-b border-t-2 border-t-blue-500 rounded-xl p-6 shadow-xl sticky top-6">
                <h2 className="text-blue-400 font-black text-xl mb-6 uppercase tracking-widest text-center">Synthesized Math</h2>
                
                <div className="space-y-4">
                    {['leather', 'ebony', 'iron', 'bone'].map(type => {
                        const yields = calculateForgeYield(type);
                        return (
                            <div key={type} className="bg-[#0a0c0f] border border-[#1e222b] rounded-xl p-4 text-center group">
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 capitalize">{type} Yield</div>
                                
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {forgeTargetQuality === 'legendary' && (
                                      <div className="flex justify-between px-2 bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20 rounded py-1">
                                          <span>Legendary</span><span>{yields.legendary}</span>
                                      </div>
                                    )}
                                    {['legendary', 'epic'].includes(forgeTargetQuality) && (
                                      <div className="flex justify-between px-2 bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20 rounded py-1">
                                          <span>Epic</span><span>{yields.epic}</span>
                                      </div>
                                    )}
                                    {['legendary', 'epic', 'elite'].includes(forgeTargetQuality) && (
                                      <div className="flex justify-between px-2 bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 rounded py-1 text-xs">
                                          <span>Elite</span><span>{yields.elite}</span>
                                      </div>
                                    )}
                                    {['legendary', 'epic', 'elite', 'advanced'].includes(forgeTargetQuality) && (
                                      <div className="flex justify-between px-2 bg-green-500/10 text-green-400 font-bold border border-green-500/20 rounded py-1 text-[10px]">
                                          <span>Adv</span><span>{yields.advanced}</span>
                                      </div>
                                    )}
                                </div>

                                <div className="mt-2 text-center text-[10px] text-gray-600 font-mono flex items-center justify-center gap-1 group-hover:text-gray-400 transition-colors">
                                    Remnants: {yields.normal} Norm.
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

          </div>
        </div>
      )}

      {/* REAL ESTATE PREDICTOR */}
      {activeTab === "realestate" && (
        <div className="animate-fade-in">
          {(!session?.user?.isLeader && session?.user?.role !== "Admin") ? (
            <div className="w-full mx-auto flex flex-col items-center justify-center p-24 text-center bg-[#0f1115] border border-[#1e222b] rounded-xl">
                <ShieldAlert className="w-16 h-16 text-rose-500 mb-6 opacity-80" />
                <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">High Command Only</h1>
                <p className="text-rose-400 font-bold uppercase tracking-widest text-sm">Clearance Level Insufficient to access AI Cartography models.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Column */}
              <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg border-t-2 border-t-teal-500">
                   <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
                     <Target className="text-teal-500" size={20} />
                     <h2 className="text-white font-bold uppercase tracking-widest text-sm">Zone Target</h2>
                   </div>
                   
                   <div className="p-6">
                       {rsPreviewUrl ? (
                           <div className="space-y-4">
                               <div className="relative rounded-lg overflow-hidden border border-[#2d323e] flex items-center justify-center bg-[#0a0c0f]">
                                   <div 
                                     className="relative w-full"
                                     onMouseMove={handleRsMouseMove}
                                     onMouseUp={handleRsMouseUp}
                                     onMouseLeave={handleRsMouseLeave}
                                   >
                                     <img 
                                       ref={rsImgRef}
                                       src={rsPreviewUrl} 
                                       alt="Map Preview" 
                                       className="w-full h-auto max-h-[500px] object-contain object-center opacity-80 block select-none pointer-events-none" 
                                     />
                                     
                                     {rsMouseCoords && !rsAnalyzing && (
                                       <div 
                                         className="absolute pointer-events-none z-50 bg-black/80 border border-teal-500/50 text-teal-400 font-mono text-[10px] px-2 py-1 rounded shadow-lg backdrop-blur-sm transform -translate-x-1/2 -translate-y-[150%]"
                                         style={{ top: `${rsMouseCoords.y}%`, left: `${rsMouseCoords.x}%` }}
                                       >
                                         X: {rsMouseCoords.x} | Y: {rsMouseCoords.y}
                                       </div>
                                     )}
                                     
                                     {rsResult?.troubleSpots && rsResult.troubleSpots.map((spot, idx) => (
                                       <div key={`ping-${idx}`}>
                                           {rsDraggingIdx !== idx && (
                                               <div 
                                                    className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-rose-500 rounded-full animate-ping z-20 pointer-events-none"
                                                    style={{ top: `${spot.y}%`, left: `${spot.x}%` }}
                                               />
                                           )}
                                           <div 
                                                onMouseDown={(e) => { e.preventDefault(); setRsDraggingIdx(idx); }}
                                                className={`absolute w-8 h-8 -ml-4 -mt-4 border ${rsDraggingIdx === idx ? 'border-teal-400 bg-teal-500/40' : 'border-rose-400 bg-rose-500/20'} backdrop-blur-sm rounded-full flex items-center justify-center z-30 cursor-grab hover:scale-125 transition-transform ${rsDraggingIdx === idx ? 'cursor-grabbing scale-125' : ''}`}
                                                style={{ top: `${spot.y}%`, left: `${spot.x}%` }}
                                           >
                                              <Target className={`w-4 h-4 ${rsDraggingIdx === idx ? 'text-teal-300' : 'text-rose-300'}`} />
                                              
                                              {rsDraggingIdx !== idx && (
                                                  <div className="absolute hidden group-hover:block bottom-full mb-2 w-48 p-2 bg-rose-950/90 border border-rose-500/50 text-rose-200 text-[10px] rounded shadow-xl z-40 font-medium select-none pointer-events-none">
                                                    {spot.reason}
                                                  </div>
                                              )}
                                           </div>
                                       </div>
                                     ))}

                                     {rsAnalyzing && (
                                         <div className="absolute inset-0 bg-[#0f1115]/80 flex flex-col items-center justify-center backdrop-blur-sm z-40">
                                             <Crosshair className="text-teal-500 animate-spin w-12 h-12 mb-4" />
                                             <span className="text-teal-400 font-bold uppercase tracking-widest text-xs animate-pulse">Running Geometrics...</span>
                                         </div>
                                     )}
                                   </div>
                               </div>
                               <div className="flex gap-4">
                                   <button onClick={() => { setRsFile(null); setRsPreviewUrl(null); setRsResult(null); }} className="flex-1 py-3 bg-[#1e222b] hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">Clear Target</button>
                                   <button onClick={executeRsAnalysis} disabled={rsAnalyzing} className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-[#0f1115] rounded-lg text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all flex items-center justify-center gap-2">
                                       {rsAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                                       {rsAnalyzing ? "Computing..." : "Execute Scan"}
                                   </button>
                               </div>
                               
                               {rsResult && (
                                   <p className="text-gray-500 text-center text-[10px] mt-2 font-bold uppercase tracking-widest px-4 leading-relaxed">
                                       System Notice: Target Coordinates (X/Y) reflect isolated 2D Cartesian boundaries upon the provided snapshot.<br/>
                                       <span className="text-teal-500">They do not correspond to native in-game server coordinates.</span> They are for reference in this predictor only.
                                   </p>
                               )}
                           </div>
                       ) : (
                           <div 
                              onDragOver={(e) => e.preventDefault()} 
                              onDrop={handleRsFileDrop}
                              className="border-2 border-dashed border-[#2d323e] hover:border-teal-500/50 bg-[#0f1115] rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer h-[300px]"
                              onClick={() => document.getElementById('mapUpload').click()}
                           >
                              <UploadCloud size={48} className="text-gray-600 mb-4" />
                              <h3 className="text-white font-black tracking-widest uppercase text-lg mb-2">Upload Sector Topology</h3>
                              <p className="text-gray-500 text-sm font-medium mb-6">Drag & drop a screenshot of the Alliance Flag territory.</p>
                              <input type="file" id="mapUpload" hidden accept="image/*" onChange={handleRsFileSelect}/>
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
                       {!rsResult ? (
                           <div className="text-center text-gray-500">
                               <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-20" />
                               <p className="font-bold uppercase tracking-widest text-xs">Awaiting geographical telemetry data.</p>
                           </div>
                       ) : (
                           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                               
                               <div className="flex items-center justify-between border-b border-[#1e222b] pb-6">
                                   <div>
                                       <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Entity Footprint</p>
                                       <h3 className="text-4xl font-black text-white font-mono">{rsResult.castleCount} <span className="text-sm font-bold text-gray-500 uppercase tracking-widest font-sans">Castles</span></h3>
                                   </div>
                                   <div className="text-right">
                                       <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Calculated Density</p>
                                       <DensityBadge level={rsResult.densityLevel} />
                                   </div>
                               </div>

                               <div>
                                   <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Economic Impact Analysis</p>
                                   <div className="bg-[#13161c] border border-rose-500/30 p-4 rounded-lg">
                                       <p className="text-gray-300 text-sm leading-relaxed mb-3">{rsResult.economicImpact}</p>
                                       
                                       {rsResult.fineDetails?.economic && (
                                           <ul className="space-y-1.5 border-t border-[#1e222b] pt-3">
                                               {rsResult.fineDetails.economic.map((point, i) => (
                                                   <li key={i} className="flex gap-2 items-start text-xs text-rose-200/80">
                                                       <span className="text-rose-500 mt-0.5">•</span>
                                                       <span>{point}</span>
                                                   </li>
                                               ))}
                                           </ul>
                                       )}
                                   </div>
                               </div>

                               <div>
                                   <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">AI Tactical Directive</p>
                                   <div className="bg-teal-500/10 border border-teal-500/30 p-4 rounded-lg">
                                       <div className="flex gap-3 mb-3">
                                           <Crosshair className="text-teal-400 shrink-0 mt-0.5" size={18} />
                                           <p className="text-teal-100 text-sm font-medium leading-relaxed">{rsResult.tacticalAdvice}</p>
                                       </div>

                                       {rsResult.fineDetails?.tactical && (
                                           <ul className="space-y-1.5 border-t border-teal-500/20 pt-3">
                                               {rsResult.fineDetails.tactical.map((point, i) => (
                                                   <li key={i} className="flex gap-2 items-start text-xs text-teal-200/80">
                                                       <span className="text-teal-500 mt-0.5">•</span>
                                                       <span>{point}</span>
                                                   </li>
                                               ))}
                                           </ul>
                                       )}
                                   </div>
                               </div>
                           </div>
                       )}
                   </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
