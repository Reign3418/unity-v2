'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCcw, Download, Copy, AlertTriangle, ChevronRight, X } from 'lucide-react';

export default function ExperimentalApplet() {
    const [image, setImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [scannedData, setScannedData] = useState([]);
    const [error, setError] = useState(null);

    const canvasRef = useRef(null);

    // Global Paste Listener for the Desktop Applet
    useEffect(() => {
        const handlePaste = (e) => {
            if (!e.clipboardData.items || isLoading) return;
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
                    const blob = e.clipboardData.items[i].getAsFile();
                    processAndCompressImage(blob);
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isLoading]);

    const processAndCompressImage = (fileBlob) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');

                // Intelligent Scaling (Cap massive screenshots to save Gemini API Latency/Tokens)
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1920; 

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // High Efficiency WebP Compression (0.8 quality handles text perfectly while reducing size 90%)
                const webPBase64 = canvas.toDataURL('image/webp', 0.8);
                setImage(webPBase64);
                transmitToAiEngine(webPBase64);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(fileBlob);
    };

    const transmitToAiEngine = async (encodedImage) => {
        setIsLoading(true);
        setError(null);
        setScannedData([]);

        try {
            // Ping the Unity backend specifically assigned to the isolated Experimental Lab route
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://unity-app-production.up.railway.app'}/api/experimental/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('unity_session_token') || 'local_test'}`
                    // Note: session architecture handles auth naturally, but we fallback gracefully
                },
                body: JSON.stringify({ image: encodedImage })
            });

            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setScannedData(json.data);
            } else {
                setError(json.error || "The AI failed to format the matrix. Please try a cleaner screenshot.");
            }
        } catch (err) {
            console.error("Scanner Error", err);
            setError("Critical uplink failure to Railway Server Pipeline.");
        }
        setIsLoading(false);
    };

    const exportToCSV = () => {
        if (scannedData.length === 0) return;
        
        const headers = Object.keys(scannedData[0]);
        const csvContent = [
            headers.join(','),
            ...scannedData.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Unity_Sandbox_Export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const copyToClipboard = () => {
        if (scannedData.length === 0) return;
        const textArray = scannedData.map(row => Object.values(row).join('\t'));
        navigator.clipboard.writeText(textArray.join('\n'));
        alert("Matrix copied to Clipboard. You can now paste directly into Excel/Sheets!");
    };

    // Update specific cell dynamically
    const updateCell = (rowIndex, key, value) => {
        const newData = [...scannedData];
        newData[rowIndex][key] = value;
        setScannedData(newData);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-[#0a0c0f] text-slate-300 font-sans p-4 space-y-4">
            
            {/* Hidden canvas for image scaling */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Applet Header */}
            <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-3">
                <div className="flex items-center gap-2 text-fuchsia-400 font-bold tracking-widest text-sm uppercase">
                    <Camera size={18} />
                    <span>AI Vision Scanner</span>
                </div>
                {scannedData.length > 0 && (
                    <button 
                        onClick={() => { setImage(null); setScannedData([]); setError(null); }}
                        className="text-xs font-mono bg-slate-800 hover:bg-red-500/20 hover:text-red-400 px-3 py-1 rounded transition-colors"
                    >
                        Reset Applet
                    </button>
                )}
            </div>

            {/* The primary logical container */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                
                {/* State 1: Awaiting Image */}
                {!image && !isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-900/20 text-center p-6 transition-colors hover:border-slate-500/50 hover:bg-slate-800/30">
                        <Camera size={48} className="text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Scanner Offline</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Press <kbd className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 mx-1 font-mono text-cyan-400">Ctrl + V</kbd> to paste an image instantly, <br/>
                            OR capture a window natively:
                        </p>
                        <button 
                            onClick={async () => {
                                try {
                                    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                                    const video = document.createElement('video');
                                    video.srcObject = stream;
                                    video.play();

                                    video.onloadedmetadata = () => {
                                        const canvas = canvasRef.current;
                                        // Smart Scaling to 1920 cap to save bandwidth
                                        let width = video.videoWidth;
                                        let height = video.videoHeight;
                                        const MAX_WIDTH = 1920; 
                        
                                        if (width > MAX_WIDTH) {
                                            height = Math.round((height * MAX_WIDTH) / width);
                                            width = MAX_WIDTH;
                                        }

                                        canvas.width = width;
                                        canvas.height = height;
                                        const ctx = canvas.getContext('2d');
                                        
                                        // Snap the exact frame
                                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                        
                                        // Instantly kill the web stream
                                        stream.getTracks().forEach(track => track.stop());
                                        
                                        // Process it
                                        const webPBase64 = canvas.toDataURL('image/webp', 0.8);
                                        setImage(webPBase64);
                                        transmitToAiEngine(webPBase64);
                                    };
                                } catch (err) {
                                    console.error("Screen Share Capture Failed:", err);
                                }
                            }}
                            className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-mono text-[10px] uppercase tracking-widest px-6 py-3 rounded-lg shadow-[0_0_15px_rgba(192,38,211,0.4)] transition-all flex items-center gap-2"
                        >
                            <Camera size={16} />
                            <span>Take Picture of Window</span>
                        </button>
                    </div>
                )}

                {/* State 2: Processing AI */}
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 rounded-xl backdrop-blur-sm z-10">
                        <RefreshCcw size={48} className="text-fuchsia-500 animate-spin mb-4" />
                        <h3 className="text-lg font-bold text-white tracking-widest uppercase animate-pulse">Running Gemini Vision Matrix...</h3>
                        <p className="text-xs text-slate-400 font-mono mt-2">Processing pixels into interactive data objects...</p>
                    </div>
                )}

                {/* State 3: Error */}
                {error && !isLoading && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="text-red-400 shrink-0" />
                        <div className="flex-1">
                            <h4 className="text-red-400 font-bold mb-1">Extraction Failure</h4>
                            <p className="text-sm text-red-300/80">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16} /></button>
                    </div>
                )}

                {/* State 4: Interactive Validation Result */}
                {scannedData.length > 0 && !isLoading && (
                    <div className="flex flex-col h-full absolute inset-0">
                        {/* Sandboxed Warning */}
                        <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-t-lg text-[10px] uppercase tracking-widest text-amber-500 flex items-center justify-between shadow-lg">
                            <span>Experimental Sandbox Mode Active</span>
                            <span>Data Not Saved via Native Database</span>
                        </div>
                        
                        {/* Interactive Table Container */}
                        <div className="flex-1 overflow-auto bg-[#0f1115] border-x border-slate-800 scrollbar-thin scrollbar-thumb-slate-700">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-[#15181e] sticky top-0 z-10 shadow-sm">
                                        {Object.keys(scannedData[0]).map((key) => (
                                            <th key={key} className="px-4 py-2 font-mono text-[10px] uppercase text-cyan-500/70 tracking-widest bg-[#15181e]">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {scannedData.map((row, rowIndex) => (
                                        <tr key={rowIndex} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            {Object.keys(row).map((key) => (
                                                <td key={key} className="px-2 py-1">
                                                    <input 
                                                        type="text" 
                                                        value={row[key] || ''}
                                                        onChange={(e) => updateCell(rowIndex, key, e.target.value)}
                                                        className="w-full bg-transparent outline-none border border-transparent focus:border-fuchsia-500/50 focus:bg-fuchsia-500/5 px-2 py-1 rounded text-slate-300 font-mono text-xs transition-all"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Export Toolbar */}
                        <div className="bg-[#15181e] border border-t-0 border-slate-800 rounded-b-lg p-3 flex items-center justify-end gap-2 shrink-0">
                            <button onClick={copyToClipboard} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded transition-colors group">
                                <Copy size={14} className="text-slate-400 group-hover:text-white" />
                                <span>Copy Text</span>
                            </button>
                            <button onClick={exportToCSV} className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded shadow-lg shadow-fuchsia-500/20 transition-colors">
                                <Download size={14} />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
        </div>
    );
}
