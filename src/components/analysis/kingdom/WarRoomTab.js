"use client";

import { useState, useEffect, useRef } from "react";
import { PenTool, Target, Eraser, Download, Map, Crosshair, Brush, Image as ImageIcon, Pipette, MapPin } from "lucide-react";
import io from 'socket.io-client';

const RAILWAY_WS = 'https://unity-app-production.up.railway.app';

export default function WarRoomTab({ targetKd }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#EF4444');
  const [brushSize, setBrushSize] = useState(3);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [pins, setPins] = useState([]);
  const [pinX, setPinX] = useState('');
  const [pinY, setPinY] = useState('');
  const [pinLabel, setPinLabel] = useState('');
  const [imageBounds, setImageBounds] = useState(null);
  
  const bgImageRef = useRef(null);
  const currentPath = useRef([]);

  // Isolate by Kingdom ID securely so plans don't bleed over
  const WAR_ROOM_ID = `kingdom-${targetKd || 'global'}`;

  const drawBackgroundLocally = (base64) => {
      bgImageRef.current = base64;
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;
      
      const img = new window.Image();
      img.onload = () => {
          const rect = canvas.getBoundingClientRect();
          ctx.fillStyle = '#0f1115';
          ctx.fillRect(0, 0, rect.width, rect.height);
          
          const scale = Math.min(rect.width / img.width, rect.height / img.height);
          const x = (rect.width / 2) - (img.width / 2) * scale;
          const y = (rect.height / 2) - (img.height / 2) * scale;
          const w = img.width * scale;
          const h = img.height * scale;
          
          setImageBounds({ x, y, w, h });
          
          ctx.drawImage(img, x, y, w, h);
      };
      img.src = base64;
  };

  const clearCanvasLocally = () => {
      if (!contextRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      contextRef.current.fillStyle = '#0f1115';
      contextRef.current.fillRect(0, 0, rect.width, rect.height);
      setPins([]);
      setImageBounds(null);
      
      if (bgImageRef.current) {
          drawBackgroundLocally(bgImageRef.current);
      }
  };

  useEffect(() => {
    const socketIo = io(RAILWAY_WS, {
        withCredentials: true,
        transports: ['websocket', 'polling']
    });

    socketIo.on('connect', () => {
        setIsConnected(true);
        socketIo.emit('join_room', WAR_ROOM_ID);
    });

    socketIo.on('disconnect', () => {
        setIsConnected(false);
    });

    socketIo.on('peer_stroke', (strokeRaw) => {
        try {
            const parsed = typeof strokeRaw === 'string' ? JSON.parse(strokeRaw) : strokeRaw;
            drawStrokeLocally(parsed);
        } catch(e) {}
    });

    socketIo.on('peer_background', (base64) => {
        drawBackgroundLocally(base64);
    });

    socketIo.on('peer_pin', (pin) => {
        setPins(prev => {
            if (prev.find(p => p.id === pin.id)) return prev;
            return [...prev, pin];
        });
    });

    socketIo.on('peer_remove_pin', (pinId) => {
        setPins(prev => prev.filter(p => p.id !== pinId));
    });

    socketIo.on('peer_clear', () => {
        clearCanvasLocally();
    });

    setSocket(socketIo);

    const canvas = canvasRef.current;
    if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        contextRef.current = ctx;
        
        ctx.fillStyle = '#0f1115';
        ctx.fillRect(0, 0, rect.width, rect.height);
    }

    return () => {
        socketIo.disconnect();
    };
  }, [WAR_ROOM_ID]);

  useEffect(() => {
      if (contextRef.current) {
          contextRef.current.strokeStyle = color;
          contextRef.current.lineWidth = brushSize;
      }
  }, [color, brushSize]);

  const processImageFile = (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
              // High performance WebP compression matrix to fit under 10MB bounds
              const maxDim = 1920; 
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                  if (w > h) { h = Math.round((h * maxDim)/w); w = maxDim; }
                  else { w = Math.round((w * maxDim)/h); h = maxDim; }
              }
              const offScreen = document.createElement('canvas');
              offScreen.width = w; offScreen.height = h;
              offScreen.getContext('2d').drawImage(img, 0, 0, w, h);
              const base64 = offScreen.toDataURL('image/jpeg', 0.85);
              
              drawBackgroundLocally(base64);
              if (socket) {
                  socket.emit('set_background', { roomId: WAR_ROOM_ID, bgBase64: base64 });
              }
          };
          img.src = e.target.result;
      };
      reader.readAsDataURL(file);
  };

  useEffect(() => {
      const handlePaste = (e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf('image') !== -1) {
                  const file = items[i].getAsFile();
                  processImageFile(file);
                  break;
              }
          }
      };
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
  }, [socket, WAR_ROOM_ID]);

  const handleFileUpload = (e) => {
      if (e.target.files && e.target.files[0]) {
          processImageFile(e.target.files[0]);
      }
  };

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    const rect = canvasRef.current.getBoundingClientRect();
    const nx = offsetX / rect.width;
    const ny = offsetY / rect.height;

    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    currentPath.current = [{ nx, ny }];
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    const rect = canvasRef.current.getBoundingClientRect();
    currentPath.current.push({ nx: offsetX / rect.width, ny: offsetY / rect.height });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);

    if (socket && currentPath.current.length > 0) {
        socket.emit('draw_stroke', {
            roomId: WAR_ROOM_ID,
            stroke: { color, size: brushSize, points: currentPath.current }
        });
    }
    currentPath.current = [];
  };

  const drawStrokeLocally = (stroke) => {
      if (!contextRef.current || !canvasRef.current || !stroke.points || stroke.points.length === 0) return;
      const ctx = contextRef.current;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const p = stroke.points;
      
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.moveTo(p[0].nx * rect.width, p[0].ny * rect.height);
      for(let i = 1; i < p.length; i++) {
          ctx.lineTo(p[i].nx * rect.width, p[i].ny * rect.height);
      }
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
  };

  const broadcastClear = () => {
      bgImageRef.current = null; // Full wipe clears bg too
      clearCanvasLocally();
      if (socket) socket.emit('clear_board', WAR_ROOM_ID);
  };

  const handleDropPin = () => {
      const x = parseInt(pinX); 
      const y = parseInt(pinY);
      if (isNaN(x) || isNaN(y) || x < 0 || x > 1200 || y < 0 || y > 1200) return;
      
      const newPin = { id: Date.now().toString(), x, y, label: pinLabel || `Target (${x},${y})`, color };
      setPins(prev => [...prev, newPin]);
      if (socket) socket.emit('add_pin', { roomId: WAR_ROOM_ID, pin: newPin });
      setPinX(''); setPinY(''); setPinLabel('');
  };

  return (
    <div className="w-full mx-auto space-y-6 animate-fade-in pb-12 mt-4">
      {/* Header Panel */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="flex items-center gap-4 relative z-10">
            <Map className="text-emerald-500" size={32} />
            <div>
                <h1 className="text-3xl font-black text-white tracking-widest uppercase">Tactical War Room</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-emerald-400 font-bold text-xs uppercase tracking-[0.2em]">{targetKd ? `Kingdom ${targetKd} Secure Matrix` : 'Global Synchronized Matrix'}</span>
                    {isConnected ? (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/50 uppercase tracking-widest font-black">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> Online
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/50 uppercase tracking-widest font-black">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> Reconnecting...
                        </span>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Main Canvas Engine */}
      <div className="bg-[#0f1115] border border-[#1e222b] rounded-xl overflow-hidden shadow-xl flex flex-col h-[75vh]">
          {/* Toolbar */}
          <div className="bg-[#0a0c0f] px-6 py-4 flex flex-wrap items-center justify-between border-b border-[#1e222b] gap-4">
                
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 font-bold text-white text-sm tracking-widest uppercase border-r border-[#1e222b] pr-4">
                       <Crosshair className="text-emerald-500" size={16} /> Ops Board
                   </div>
                   
                   {/* Brushes */}
                   <div className="flex items-center gap-1.5 p-1 bg-[#13161c] rounded-lg border border-[#1e222b]">
                      <button onClick={() => setColor('#EF4444')} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${color === '#EF4444' ? 'bg-red-500 text-white scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-red-500/20 border border-red-500/50 hover:bg-red-500/40'}`} title="Enemy Vectors"></button>
                      <button onClick={() => setColor('#10B981')} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${color === '#10B981' ? 'bg-emerald-500 text-white scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40'}`} title="Ally Vectors"></button>
                      <button onClick={() => setColor('#06B6D4')} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${color === '#06B6D4' ? 'bg-cyan-500 text-white scale-110 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/40'}`} title="Rally Paths"></button>
                      <button onClick={() => setColor('#F59E0B')} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${color === '#F59E0B' ? 'bg-amber-500 text-white scale-110 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/40'}`} title="Objectives"></button>
                      
                      {/* Color Picker / Eyedropper */}
                      <div className="w-px h-6 bg-[#1e222b] mx-1"></div>
                      <button 
                         onClick={async () => {
                             if ('EyeDropper' in window) {
                                 try { const ed = new window.EyeDropper(); const res = await ed.open(); setColor(res.sRGBHex); } catch(e){}
                             } else {
                                 document.getElementById('native-color').click();
                             }
                         }} 
                         className="w-6 h-6 rounded flex items-center justify-center transition-all bg-[#0f1115] border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500 hover:text-white" 
                         title="Pick from Screen"
                      >
                         <Pipette size={12} />
                      </button>
                      <label className="w-6 h-6 rounded flex items-center justify-center transition-all cursor-pointer overflow-hidden border border-[#2d3342] hover:border-gray-300 relative group" title="Custom Hex">
                         <div className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                         <input id="native-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="opacity-0 absolute inset-0 w-10 h-10 cursor-pointer" />
                      </label>

                      <div className="w-px h-6 bg-[#1e222b] mx-1"></div>
                      <button onClick={() => setColor('#0f1115')} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${color === '#0f1115' ? 'bg-gray-300 text-black scale-110' : 'bg-[#0f1115] border border-gray-500 text-gray-500 hover:text-white'}`} title="Eraser">
                         <Eraser size={12} />
                      </button>
                   </div>

                   <div className="flex items-center gap-1.5 p-1 bg-[#13161c] rounded-lg border border-[#1e222b]">
                       <button onClick={() => setBrushSize(2)} className={`w-8 h-8 rounded flex items-center justify-center transition-all ${brushSize === 2 ? 'bg-white text-black font-black' : 'text-gray-400 hover:text-white'}`}><div className="w-1 h-1 bg-current rounded-full"></div></button>
                       <button onClick={() => setBrushSize(5)} className={`w-8 h-8 rounded flex items-center justify-center transition-all ${brushSize === 5 ? 'bg-white text-black font-black' : 'text-gray-400 hover:text-white'}`}><div className="w-2.5 h-2.5 bg-current rounded-full"></div></button>
                       <button onClick={() => setBrushSize(12)} className={`w-8 h-8 rounded flex items-center justify-center transition-all ${brushSize === 12 ? 'bg-white text-black font-black' : 'text-gray-400 hover:text-white'}`}><div className="w-4 h-4 bg-current rounded-full"></div></button>
                   </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Add Map Pin Tool */}
                    <div className="flex items-center bg-[#13161c] border border-[#1e222b] rounded-lg overflow-hidden hidden xl:flex">
                        <div className="px-2 py-1.5 flex items-center gap-1.5 bg-[#0f1115] border-r border-[#1e222b]">
                           <MapPin size={12} className="text-cyan-500" />
                        </div>
                        <input type="text" placeholder="X" value={pinX} onChange={e => setPinX(e.target.value)} className="w-12 bg-transparent text-white text-xs font-mono text-center outline-none border-r border-[#1e222b] py-1" />
                        <input type="text" placeholder="Y" value={pinY} onChange={e => setPinY(e.target.value)} className="w-12 bg-transparent text-white text-xs font-mono text-center outline-none border-r border-[#1e222b] py-1" />
                        <input type="text" placeholder="Label" value={pinLabel} onChange={e => setPinLabel(e.target.value)} className="w-24 bg-transparent text-white text-xs px-2 outline-none border-r border-[#1e222b] py-1" />
                        <button onClick={handleDropPin} className="px-3 py-1 bg-[#1e222b] hover:bg-cyan-500 hover:text-white text-xs font-bold transition-colors">SET</button>
                    </div>

                    <label className="flex items-center gap-2 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all bg-[#1e222b] text-gray-300 hover:bg-emerald-500 hover:text-white cursor-pointer group">
                       <ImageIcon size={14} className="text-gray-400 group-hover:text-white" /> 
                       Upload Map 
                       <span className="hidden md:inline font-mono opacity-50 ml-1 truncate max-w-[80px]">(or Ctrl+V)</span>
                       <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <div className="w-px h-6 bg-[#1e222b] mx-1"></div>
                    <button onClick={broadcastClear} className="flex items-center gap-2 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all bg-rose-500/10 text-rose-500 border border-rose-500/50 hover:bg-rose-500 hover:text-white">
                       <Eraser size={14} /> Wipe Board
                    </button>
                </div>
          </div>
          
          <div className="flex-1 bg-[#0a0c0f] relative overflow-hidden cursor-crosshair">
             <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"></div>
             
             <canvas
                ref={canvasRef}
                className="w-full h-full block touch-none z-10 relative"
                style={{ width: '100%', height: '100%' }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerOut={stopDrawing}
             />
             
             {imageBounds && pins.map(pin => {
                 const px = imageBounds.x + (pin.x / 1200) * imageBounds.w;
                 const py = imageBounds.y + imageBounds.h - ((pin.y / 1200) * imageBounds.h);
                 return (
                    <div key={pin.id} 
                         className="absolute w-4 h-4 rounded-full border-2 border-white cursor-help group shadow-[0_0_10px_rgba(0,0,0,0.5)] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all hover:scale-150 z-20"
                         style={{ left: `${px}px`, top: `${py}px`, backgroundColor: pin.color || '#EF4444' }}
                         onDoubleClick={() => {
                             if (socket) socket.emit('remove_pin', { roomId: WAR_ROOM_ID, pinId: pin.id });
                             setPins(prev => prev.filter(p => p.id !== pin.id));
                         }}
                    >
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest whitespace-nowrap rounded border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                            {pin.label}
                        </div>
                    </div>
                 )
             })}
          </div>
      </div>

    </div>
  );
}
