"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Timer, Wheat, Zap, Crown, BookOpen, Clock, AlertCircle, Trash2, Shield, Upload, X, Check, Loader2, ShieldAlert, Crosshair, Map, RefreshCw, UploadCloud, Target, BrainCircuit, Activity, Eye, Users, CheckCircle2, Image as ImageIcon, FileText, Sparkles, Filter, Play } from "lucide-react";

export default function CalculatorsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("speedups");

  // State hooks for all calculators
  const [speedupData, setSpeedupData] = useState({ 
    building: 0, research: 0, training: 0, healing: 0, universal: 0 
  });
  const [isSpeedupScanning, setIsSpeedupScanning] = useState(false);
  const [speedupStatus, setSpeedupStatus] = useState("");
  const speedupInputRef = useRef(null);
  
  const [resources, setResources] = useState({
    food: { "1K": 0, "10K": 0, "50K": 0, "150K": 0, "500K": 0, "1.5M": 0, "5M": 0 },
    wood: { "1K": 0, "10K": 0, "50K": 0, "150K": 0, "500K": 0, "1.5M": 0, "5M": 0 },
    stone: { "750": 0, "7.5K": 0, "37.5K": 0, "112.5K": 0, "375K": 0, "1.125M": 0, "3.75M": 0 },
    gold: { "500": 0, "5K": 0, "15K": 0, "50K": 0, "200K": 0, "600K": 0, "2M": 0 }
  });

  const [apData, setApData] = useState({ "50": 0, "100": 0, "500": 0, "1000": 0 });
  const [isApScanning, setIsApScanning] = useState(false);
  const [apStatus, setApStatus] = useState("");
  const apInputRef = useRef(null);

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

  // === Deadeye Engine States ===
  const [deadeyeQueue, setDeadeyeQueue] = useState([]);
  const [deadeyeExtractedNames, setDeadeyeExtractedNames] = useState([]);
  const [isDeadeyeProcessing, setIsDeadeyeProcessing] = useState(false);
  const [deadeyeFilterMode, setDeadeyeFilterMode] = useState('exact');
  const deadeyeInputRef = useRef(null);
  const [deadeyeCopied, setDeadeyeCopied] = useState(false);

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

  // === Deadeye Engine Math ===
  const handleDeadeyeDrop = (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          addDeadeyeFiles(Array.from(e.dataTransfer.files));
      }
  };

  const handleDeadeyeFileSelect = (e) => {
      if(e.target.files && e.target.files.length > 0) { 
          addDeadeyeFiles(Array.from(e.target.files));
      }
  };

  const addDeadeyeFiles = (files) => {
      const newFiles = files.filter(f => f.type.startsWith('image/')).map(file => ({
          id: 'img_' + Math.random().toString(36).substr(2, 9),
          file,
          status: 'pending'
      }));
      setDeadeyeQueue(prev => [...prev, ...newFiles]);
  };

  const clearDeadeyeSession = () => {
    if (confirm("Clear all scanned names and the current queue?")) {
        setDeadeyeQueue([]);
        setDeadeyeExtractedNames([]);
        if (deadeyeInputRef.current) deadeyeInputRef.current.value = '';
    }
  };

  const calculateSimilarity = (s1, s2) => {
        let longer = s1.toLowerCase();
        let shorter = s2.toLowerCase();
        if (longer.length < shorter.length) {
            longer = s2.toLowerCase();
            shorter = s1.toLowerCase();
        }
        let longerLength = longer.length;
        if (longerLength === 0) return 1.0;

        let costs = new Array();
        for (let i = 0; i <= longer.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= shorter.length; j++) {
                if (i === 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (longer.charAt(i - 1) !== shorter.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[shorter.length] = lastValue;
        }

        return (longerLength - costs[shorter.length]) / parseFloat(longerLength);
    };

    const processDeadeyeQueue = async () => {
        if (isDeadeyeProcessing) return;
        const pendingItems = deadeyeQueue.filter(i => i.status === 'pending');
        if (pendingItems.length === 0) return;

        let customGeminiKey = "";
        try {
            const prefs = JSON.parse(localStorage.getItem('unty_prefs') || "{}");
            customGeminiKey = prefs.geminiKey || "";
        } catch (e) {}

        setIsDeadeyeProcessing(true);
        let currentExtracted = new Set(deadeyeExtractedNames);

        try {
            for (let i = 0; i < deadeyeQueue.length; i++) {
                if (deadeyeQueue[i].status !== 'pending') continue;

                setDeadeyeQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing' } : item));

                try {
                    const base64Data = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = e => resolve(e.target.result.split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(deadeyeQueue[i].file);
                    });

                    const res = await fetch("/api/aws/admin/vision/deadeye", {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json',
                            ...(customGeminiKey ? { 'x-gemini-key': customGeminiKey } : {})
                        },
                        body: JSON.stringify({ base64: base64Data, mimeType: deadeyeQueue[i].file.type || 'image/jpeg' })
                    });

                    if (!res.ok) {
                        if (res.status === 429) throw new Error("429 Quota Exceeded");
                        const err = await res.json();
                        throw new Error(err.error || "Vision API Failed");
                    }

                    const data = await res.json();
                    if (data.names && data.names.length > 0) {
                        data.names.forEach(n => currentExtracted.add(n));
                        setDeadeyeExtractedNames(Array.from(currentExtracted));
                    }

                    setDeadeyeQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'complete' } : item));
                } catch (err) {
                    console.error(`Error processing ${deadeyeQueue[i].file.name}:`, err);
                    setDeadeyeQueue(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item));
                    if (err.message.includes('429')) {
                        alert("Quota Exceeded (429). Server limits restricted. Stopping queue calculation.");
                        break;
                    }
                }

                await new Promise(r => setTimeout(r, 1500));
            }
        } catch (globalErr) {
            alert("A fatal error occurred while scanning: " + globalErr.message);
        } finally {
            setIsDeadeyeProcessing(false);
        }
    };

    const getProcessedDeadeyeNames = () => {
        let nameArray = [...deadeyeExtractedNames];

        if (deadeyeFilterMode === 'similarity') {
            const filteredArray = [];
            for (const name of nameArray) {
                let isDuplicate = false;
                for (const existing of filteredArray) {
                    const n1 = name.toLowerCase();
                    const n2 = existing.toLowerCase();

                    if (n1.includes(n2) || n2.includes(n1)) {
                        isDuplicate = true;
                        break;
                    }

                    const sim = calculateSimilarity(n1, n2);
                    if (sim >= 0.70) {
                        isDuplicate = true;
                        break;
                    }
                }
                if (!isDuplicate) {
                    filteredArray.push(name);
                }
            }
            nameArray = filteredArray;
        }

        return nameArray.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    };

    // === Speedups OCR Engine ===
    const handleSpeedupChange = (type, val) => {
        setSpeedupData(prev => ({ ...prev, [type]: parseInt(val) || 0 }));
    };

    const processSpeedupFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setSpeedupStatus("Error: Invalid file format (PNG/JPEG).");
            return;
        }
        
        try {
            setIsSpeedupScanning(true);
            setSpeedupStatus("Scanning screenshot with Gemini Vision...");

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1];
                
                let customGeminiKey = "";
                try {
                    const prefs = JSON.parse(localStorage.getItem('unty_prefs') || "{}");
                    customGeminiKey = prefs.geminiKey || "";
                } catch (e) {}

                const res = await fetch('/api/aws/admin/vision/speedup', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...(customGeminiKey ? { 'x-gemini-key': customGeminiKey } : {})
                    },
                    body: JSON.stringify({ base64, mimeType: file.type })
                });

                if (!res.ok) {
                    const errJson = await res.json();
                    throw new Error(errJson.error || "Vision OCR Server Error");
                }

                const parsed = await res.json();
                
                setSpeedupData(prev => ({
                    building: parsed.building || prev.building,
                    research: parsed.research || prev.research,
                    training: parsed.training || prev.training,
                    healing: parsed.healing || prev.healing,
                    universal: parsed.universal || prev.universal
                }));
                
                setSpeedupStatus("Synthesis Payload Applied Successfully!");
                setTimeout(() => setSpeedupStatus(""), 5000);
            };
        } catch (e) {
            console.error("OCR Exception", e);
            setSpeedupStatus("OCR Failure: " + (e.message || "Could not read matrix."));
        } finally {
            setIsSpeedupScanning(false);
        }
    };

    const handleSpeedupDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processSpeedupFile(e.dataTransfer.files[0]);
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
    totalMinutes += speedupData.building || 0;
    totalMinutes += speedupData.research || 0;
    totalMinutes += speedupData.training || 0;
    totalMinutes += speedupData.healing || 0;
    totalMinutes += speedupData.universal || 0;
    
    const days = Math.floor(totalMinutes / 1440);
    const remainderHours = Math.floor((totalMinutes % 1440) / 60);
    const remainderMins = totalMinutes % 60;
    return { 
      total: totalMinutes,
      formatted: `${days}d ${remainderHours}h ${remainderMins}m`
    };
  };

  const speedupTotals = calculateTotalSpeedups();

  const handleApChange = (tier, val) => {
    setApData(prev => ({ ...prev, [tier]: parseInt(val) || 0 }));
  };

  const processApFile = async (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          setApStatus("Error: Invalid file format (PNG/JPEG).");
          return;
      }
      
      try {
          setIsApScanning(true);
          setApStatus("Scanning screenshot with Gemini Vision...");

          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              const base64 = reader.result.split(',')[1];
              
              let customGeminiKey = "";
              try {
                  const prefs = JSON.parse(localStorage.getItem('unty_prefs') || "{}");
                  customGeminiKey = prefs.geminiKey || "";
              } catch (e) {}

              const res = await fetch('/api/aws/admin/vision/ap', {
                  method: 'POST',
                  headers: { 
                      'Content-Type': 'application/json',
                      ...(customGeminiKey ? { 'x-gemini-key': customGeminiKey } : {})
                  },
                  body: JSON.stringify({ base64, mimeType: file.type })
              });

              if (!res.ok) {
                  const errJson = await res.json();
                  throw new Error(errJson.error || "Vision OCR Server Error");
              }

              const parsed = await res.json();
              
              setApData(prev => ({
                  "50": parsed.ap50 ?? prev["50"],
                  "100": parsed.ap100 ?? prev["100"],
                  "500": parsed.ap500 ?? prev["500"],
                  "1000": parsed.ap1000 ?? prev["1000"],
              }));
              
              setApStatus("Synthesis Payload Applied Successfully!");
              setTimeout(() => setApStatus(""), 5000);
          };
      } catch (e) {
          console.error("OCR Exception", e);
          setApStatus("OCR Failure: " + (e.message || "Could not read matrix."));
      } finally {
          setIsApScanning(false);
      }
  };

  const handleApDrop = (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processApFile(e.dataTransfer.files[0]);
      }
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
            
            let customGeminiKey = "";
            try {
                const prefs = JSON.parse(localStorage.getItem('unty_prefs') || "{}");
                customGeminiKey = prefs.geminiKey || "";
            } catch (e) {}

            const res = await fetch('/api/aws/admin/vision/forge', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(customGeminiKey ? { 'x-gemini-key': customGeminiKey } : {})
                },
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
        <TabButton id="deadeye" icon={Eye} label="Deadeye" color="fuchsia" />
      </div>

      {/* Content Area */}
      {activeTab === "speedups" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl flex flex-col shadow-xl relative overflow-hidden h-full">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
                <div className="flex items-center gap-3">
                  <Timer className="text-indigo-500" size={20} />
                  <h2 className="text-white font-bold mb-0 uppercase tracking-widest text-sm">Speedup OCR Scanner</h2>
                </div>
            </div>
            <div className="p-6 flex flex-col">
                <p className="text-gray-500 text-xs mb-6 leading-relaxed font-bold uppercase tracking-widest">
                    Drop a screenshot of your <span className="text-indigo-400 border border-indigo-400/30 bg-indigo-500/10 px-1 rounded">Speedups</span> tab to automatically calculate your total speedup pools using AI.
                </p>

                <div 
                    onDragOver={(e) => e.preventDefault()} 
                    onDrop={handleSpeedupDrop}
                    onClick={() => speedupInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2d323e] hover:border-indigo-500/50 bg-[#0f1115] rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer mb-8"
                >
                    {isSpeedupScanning ? (
                        <>
                           <RefreshCw size={32} className="text-indigo-500 animate-spin mb-3" />
                           <h3 className="text-indigo-400 font-black tracking-widest uppercase text-xs mb-1">Scanning Image...</h3>
                           <p className="text-indigo-500/50 text-[10px] uppercase font-bold tracking-wider">{speedupStatus}</p>
                        </>
                    ) : (
                        <>
                           <ImageIcon size={32} className="text-gray-600 mb-3" />
                           <h3 className="text-white font-black tracking-widest uppercase text-xs mb-1">Drag Speedup Screenshot</h3>
                           <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">or click to browse</p>
                           {speedupStatus && <p className="text-indigo-400 text-[10px] uppercase font-bold tracking-wider">{speedupStatus}</p>}
                        </>
                    )}
                    <input type="file" ref={speedupInputRef} accept="image/*" onChange={(e) => { if (e.target.files?.length) processSpeedupFile(e.target.files[0]); }} hidden />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pb-6">
                    {Object.entries({ building: 'Building', research: 'Research', training: 'Training', healing: 'Healing', universal: 'Universal' }).map(([key, label]) => (
                        <div key={key} className="bg-[#0a0c0f] border border-[#1e222b] p-4 rounded-lg flex flex-col items-center gap-2 group hover:border-indigo-500/40 transition-colors">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                {label} (Mins) {key === 'universal' && <Sparkles size={12} className="text-amber-500" />}
                            </div>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={speedupData[key] || ""}
                                onChange={(e) => handleSpeedupChange(key, e.target.value)}
                                className="w-full text-center bg-[#13161c] border border-[#1e222b] text-white font-mono rounded py-2 text-xl focus:border-indigo-500 outline-none"
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-auto">
                    <button 
                      onClick={() => setSpeedupData({ building: 0, research: 0, training: 0, healing: 0, universal: 0 })}
                      className="w-full py-3 bg-[#1e222b] hover:bg-gray-800 text-rose-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Clear Form Math
                    </button>
                </div>
            </div>
          </div>

          <div className="bg-[#13161c] border-x border-b border-t-2 border-t-indigo-500 rounded-xl p-6 shadow-xl sticky top-6 self-start">
            <h2 className="text-indigo-400 font-black text-xl mb-6 uppercase tracking-widest text-center">Total Time Yield</h2>
            <div className="space-y-4">
              <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-5 text-center shadow-[inset_0_0_20px_rgba(99,102,241,0.05)] border-l-4 border-l-indigo-500">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Standard Display</div>
                <div className="text-2xl font-black text-white font-mono">
                  {speedupTotals.formatted}
                </div>
              </div>
              <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Hours</div>
                <div className="text-xl font-bold text-gray-300 font-mono">
                  {(speedupTotals.total / 60).toLocaleString(undefined, {maximumFractionDigits: 1})} hrs
                </div>
              </div>
               <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-4 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Minutes</div>
                <div className="text-xl font-bold text-gray-300 font-mono">
                  {speedupTotals.total.toLocaleString()} m
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
          <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl flex flex-col shadow-xl relative overflow-hidden h-full">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
                <div className="flex items-center gap-3">
                  <Zap className="text-cyan-500" size={20} />
                  <h2 className="text-white font-bold mb-0 uppercase tracking-widest text-sm">Action Points OCR Scanner</h2>
                </div>
            </div>
            <div className="p-6 flex flex-col">
                <p className="text-gray-500 text-xs mb-6 leading-relaxed font-bold uppercase tracking-widest">
                    Drop a screenshot of your <span className="text-cyan-400 border border-cyan-400/30 bg-cyan-500/10 px-1 rounded">Action Points</span> inventory to automatically sum your reserves using AI.
                </p>

                <div 
                    onDragOver={(e) => e.preventDefault()} 
                    onDrop={handleApDrop}
                    onClick={() => apInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2d323e] hover:border-cyan-500/50 bg-[#0f1115] rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer mb-8"
                >
                    {isApScanning ? (
                        <>
                           <RefreshCw size={32} className="text-cyan-500 animate-spin mb-3" />
                           <h3 className="text-cyan-400 font-black tracking-widest uppercase text-xs mb-1">Scanning Image...</h3>
                           <p className="text-cyan-500/50 text-[10px] uppercase font-bold tracking-wider">{apStatus}</p>
                        </>
                    ) : (
                        <>
                           <ImageIcon size={32} className="text-gray-600 mb-3" />
                           <h3 className="text-white font-black tracking-widest uppercase text-xs mb-1">Drag Action Points Screenshot</h3>
                           <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">or click to browse</p>
                           {apStatus && <p className="text-cyan-400 text-[10px] uppercase font-bold tracking-wider">{apStatus}</p>}
                        </>
                    )}
                    <input type="file" ref={apInputRef} accept="image/*" onChange={(e) => { if (e.target.files?.length) processApFile(e.target.files[0]); }} hidden />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-6">
                  {['50', '100', '500', '1000'].map(tier => (
                    <div key={tier} className="bg-[#0a0c0f] border border-[#1e222b] p-4 rounded-lg flex flex-col items-center gap-2 group hover:border-cyan-500/40 transition-colors">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{tier} AP Vials</div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={apData[tier] || ""}
                        onChange={(e) => handleApChange(tier, e.target.value)}
                        className="w-full text-center bg-[#13161c] border border-[#1e222b] text-white font-mono rounded py-2 text-xl focus:border-cyan-500 outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                    <button 
                      onClick={() => setApData({ "50": 0, "100": 0, "500": 0, "1000": 0 })}
                      className="w-full py-3 bg-[#1e222b] hover:bg-gray-800 text-rose-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Clear Form Math
                    </button>
                </div>
            </div>
          </div>
          <div className="bg-[#13161c] border-x border-b border-t-2 border-t-cyan-500 rounded-xl p-6 shadow-xl sticky top-6 self-start">
            <h2 className="text-cyan-400 font-black text-xl mb-6 uppercase tracking-widest text-center">Total Reserves</h2>
            <div className="bg-[#0a0c0f] border border-[#1e222b] rounded-lg p-6 text-center shadow-[inset_0_0_30px_rgba(6,182,212,0.05)] border-l-4 border-l-cyan-500 mb-6">
              <div className="text-4xl font-black text-white font-mono">
                {((apData['50']||0)*50 + (apData['100']||0)*100 + (apData['500']||0)*500 + (apData['1000']||0)*1000).toLocaleString()} <span className="text-cyan-500 text-2xl">AP</span>
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

      {/* DEADEYE SCANNER */}
      {activeTab === "deadeye" && (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Upload & Queue */}
          <div className="bg-[#13161c] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg flex flex-col h-[800px]">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center gap-3 border-b border-[#1e222b]">
              <Eye className="text-fuchsia-500" size={20} />
              <h2 className="text-white font-bold uppercase tracking-widest text-sm">Deadeye Intelligence</h2>
            </div>
            
            <div className="p-6 flex flex-col flex-1 overflow-hidden">
                <p className="text-gray-500 text-xs mb-6 leading-relaxed font-bold uppercase tracking-widest">
                    Upload multiple battle report screenshots. The AI will extract and merge all visible names automatically.
                </p>

                <div 
                    onDragOver={(e) => e.preventDefault()} 
                    onDrop={handleDeadeyeDrop}
                    onClick={() => deadeyeInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2d323e] hover:border-fuchsia-500/50 bg-[#0f1115] rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer mb-6"
                >
                    <ImageIcon size={32} className="text-gray-600 mb-3" />
                    <h3 className="text-white font-black tracking-widest uppercase text-xs mb-1">Drag Images Here</h3>
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">or click to browse</p>
                    <input type="file" ref={deadeyeInputRef} multiple accept="image/*" onChange={handleDeadeyeFileSelect} hidden />
                </div>

                <div className="flex-1 flex flex-col border border-[#1e222b] bg-[#0a0c0f] rounded-lg overflow-hidden mb-6">
                    <div className="px-4 py-2 border-b border-[#1e222b] bg-[#13161c]">
                        <h4 className="text-[10px] text-fuchsia-500 font-bold uppercase tracking-widest">Capture Queue</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {deadeyeQueue.length === 0 ? (
                            <div className="text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest italic mt-8">
                                No images buffered.
                            </div>
                        ) : (
                            deadeyeQueue.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-2 rounded bg-[#0f1115] border border-[#1e222b]">
                                    <span className="text-xs text-gray-300 truncate w-3/4">{item.file.name}</span>
                                    {item.status === 'pending' && <Clock size={14} className="text-gray-500" />}
                                    {item.status === 'processing' && <RefreshCw size={14} className="text-fuchsia-500 animate-spin" />}
                                    {item.status === 'complete' && <CheckCircle2 size={14} className="text-green-500" />}
                                    {item.status === 'error' && <AlertCircle size={14} className="text-rose-500" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <button 
                  onClick={processDeadeyeQueue} 
                  disabled={isDeadeyeProcessing || deadeyeQueue.filter(i => i.status === 'pending').length === 0}
                  className="w-full py-3 mb-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(192,38,211,0.2)] transition-all flex items-center justify-center gap-2"
                >
                  {isDeadeyeProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                  {isDeadeyeProcessing ? "Synthesizing..." : "Scan Queue with AI"}
                </button>

                <button 
                  onClick={clearDeadeyeSession}
                  className="w-full py-3 bg-[#1e222b] hover:bg-gray-800 text-rose-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Clear Cache
                </button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-2 bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-lg flex flex-col h-[800px]">
            <div className="bg-[#0a0c0f] px-6 py-4 flex items-center justify-between border-b border-[#1e222b]">
              <div className="flex items-center gap-3">
                  <Users className="text-fuchsia-500" size={20} />
                  <h2 className="text-white font-bold uppercase tracking-widest text-sm">Extracted Roster</h2>
                  <span className="bg-[#1e222b] text-fuchsia-400 font-mono text-xs px-2 py-0.5 rounded ml-2">
                      {getProcessedDeadeyeNames().length}
                  </span>
              </div>
              <div className="flex items-center gap-3">
                  <div className="flex bg-[#13161c] p-1 rounded-lg border border-[#1e222b]">
                      <button 
                         onClick={() => setDeadeyeFilterMode('exact')}
                         className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded ${deadeyeFilterMode === 'exact' ? 'bg-fuchsia-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                          Exact Dedupe
                      </button>
                      <button 
                         onClick={() => setDeadeyeFilterMode('similarity')}
                         className={`px-3 py-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest rounded ${deadeyeFilterMode === 'similarity' ? 'bg-fuchsia-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                          <Sparkles size={10} /> Smart Filter
                      </button>
                  </div>
                  <button 
                     onClick={() => {
                         const txt = getProcessedDeadeyeNames().join('\\n');
                         if(txt) {
                             navigator.clipboard.writeText(txt);
                             setDeadeyeCopied(true);
                             setTimeout(() => setDeadeyeCopied(false), 2000);
                         }
                     }}
                     className="bg-[#1e222b] hover:bg-gray-700 text-gray-300 px-4 py-[6px] rounded flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                      {deadeyeCopied ? <Check size={14} className="text-green-500" /> : <FileText size={14} />}
                      {deadeyeCopied ? "Copied" : "Copy"}
                  </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex">
                <textarea 
                   readOnly 
                   value={getProcessedDeadeyeNames().join('\n')}
                   placeholder="Scanned intelligence will parse here..."
                   className="w-full flex-1 bg-[#13161c] border border-[#1e222b] rounded-lg p-6 text-gray-300 font-mono text-sm leading-relaxed focus:outline-none focus:border-fuchsia-500/50 resize-none"
                />
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
