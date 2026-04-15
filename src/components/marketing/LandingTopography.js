'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const Plot = dynamic(() => import('../analysis/kingdom/PlotlyWrapper'), { ssr: false });

export default function LandingTopography() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full flex items-center justify-center text-purple-500 animate-pulse font-mono text-xs">Initializing 3D Render Engine...</div>;

  // Generate some realistic-looking mock cluster data for the marketing visual
  const N = 100;
  const trace1 = {
    x: Array.from({length: N}, () => Math.random() * 50 + 20),
    y: Array.from({length: N}, () => Math.random() * 50 + 20),
    z: Array.from({length: N}, () => Math.random() * 20),
    mode: 'markers',
    marker: {
      size: 4,
      color: '#0ea5e9', // Sky 500
      opacity: 0.8,
    },
    type: 'scatter3d',
    name: 'Warriors'
  };

  const trace2 = {
    x: Array.from({length: N/2}, () => Math.random() * 30 + 60),
    y: Array.from({length: N/2}, () => Math.random() * 30 + 10),
    z: Array.from({length: N/2}, () => Math.random() * 50 + 30),
    mode: 'markers',
    marker: {
      size: 5,
      color: '#ec4899', // Pink 500
      opacity: 0.9,
    },
    type: 'scatter3d',
    name: 'Heroes'
  };

  const trace3 = {
    x: Array.from({length: N*1.5}, () => Math.random() * 20 + 5),
    y: Array.from({length: N*1.5}, () => Math.random() * 40 + 50),
    z: Array.from({length: N*1.5}, () => Math.random() * 10 + 5),
    mode: 'markers',
    marker: {
      size: 3,
      color: '#10b981', // Emerald 500
      opacity: 0.5,
    },
    type: 'scatter3d',
    name: 'Farmers'
  };

  return (
    <div className="w-full h-full relative cursor-move">
      <Plot
        data={[trace1, trace2, trace3]}
        layout={{
          autosize: true,
          margin: { l: 0, r: 0, b: 0, t: 0, pad: 0 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          scene: {
            xaxis: { visible: false, showgrid: false, zeroline: false },
            yaxis: { visible: false, showgrid: false, zeroline: false },
            zaxis: { visible: false, showgrid: false, zeroline: false },
            camera: {
              eye: { x: 1.5, y: 1.5, z: 0.5 }
            }
          },
          showlegend: false,
          hovermode: false
        }}
        config={{
          displayModeBar: false,
          responsive: true
        }}
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute top-4 right-4 pointer-events-none">
        <span className="font-mono text-[10px] text-purple-400 tracking-widest uppercase border border-purple-500/30 px-2 py-1 rounded bg-[#0a0c10]/80 backdrop-blur-sm">
           Interactive: Drag to Rotate
        </span>
      </div>
    </div>
  );
}
