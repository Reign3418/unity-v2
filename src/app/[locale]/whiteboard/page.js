"use client";

import { useState, useEffect, useRef } from "react";
import { PenTool, Target, Eraser, Download, Map, Crosshair, Brush } from "lucide-react";
import io from 'socket.io-client';

const RAILWAY_WS = 'https://unity-app-production.up.railway.app';

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#EF4444');
  const [brushSize, setBrushSize] = useState(3);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const WAR_ROOM_ID = 'kingdom-global'; // For Phase 1 we use a global room

  useEffect(() => {
    // Connect to Railway Socket Engine natively bypassing DB
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

    // Inbound peer stroke parsing
    socketIo.on('peer_stroke', (strokeRaw) => {
        try {
            const parsed = typeof strokeRaw === 'string' ? JSON.parse(strokeRaw) : strokeRaw;
            drawStrokeLocally(parsed);
        } catch(e) {}
    });

    // Clear board payload
    socketIo.on('peer_clear', () => {
        clearCanvasLocally();
    });

    setSocket(socketIo);

    // Initial Canvas Context Setup
    const canvas = canvasRef.current;
    if (canvas) {
        // High DPI Support for Retina
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        contextRef.current = ctx;
        
        // Setup default background
        ctx.fillStyle = '#0f1115';
        ctx.fillRect(0, 0, rect.width, rect.height);
    }

    return () => {
        socketIo.disconnect();
    };
  }, []);

  // Sync stroke config
  useEffect(() => {
      if (contextRef.current) {
          contextRef.current.strokeStyle = color;
          contextRef.current.lineWidth = brushSize;
      }
  }, [color, brushSize]);

  const currentPath = useRef([]);

  const startDrawing = (e) => {
    // Normalize Event for React Pointer Events
    const { offsetX, offsetY } = e.nativeEvent;
    
    // Normalize coordinates relative to actual container layout dimensions
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
    
    // Local UI rendering
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();

    const rect = canvasRef.current.getBoundingClientRect();
    currentPath.current.push({ nx: offsetX / rect.width, ny: offsetY / rect.height });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);

    // Broadcast the full stroke path asynchronously
    if (socket && currentPath.current.length > 0) {
        socket.emit('draw_stroke', {
            roomId: WAR_ROOM_ID,
            stroke: {
                color,
                size: brushSize,
                points: currentPath.current
            }
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

  const clearCanvasLocally = () => {
      if (!contextRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      contextRef.current.fillStyle = '#0f1115';
      contextRef.current.fillRect(0, 0, rect.width, rect.height);
  };

  const broadcastClear = () => {
      clearCanvasLocally();
      if (socket) {
          socket.emit('clear_board', WAR_ROOM_ID);
      }
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
                    <span className="text-emerald-400 font-bold text-xs uppercase tracking-[0.2em]">Synchronized Matrix</span>
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
                    <button onClick={broadcastClear} className="flex items-center gap-2 px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all bg-rose-500/10 text-rose-500 border border-rose-500/50 hover:bg-rose-500 hover:text-white">
                       <Eraser size={14} /> Wipe Board
                    </button>
                </div>
          </div>
          
          <div className="flex-1 bg-[#0a0c0f] relative overflow-hidden cursor-crosshair">
             <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"></div>
             
             <canvas
                ref={canvasRef}
                className="w-full h-full block touch-none"
                style={{ width: '100%', height: '100%' }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerOut={stopDrawing}
             />
          </div>
      </div>

    </div>
  );
}
