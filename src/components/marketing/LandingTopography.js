'use client';
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-gl';

export default function LandingTopography() {
  const [mounted, setMounted] = useState(false);
  const [chartOptions, setChartOptions] = useState({});
  
  useEffect(() => {
    // Generate organic-looking clusters purely for the marketing visual
    const generateCluster = (numPoints, centerX, centerY, centerZ, spread, color) => {
      const points = [];
      for (let i = 0; i < numPoints; i++) {
        // Simple normal distribution approximation
        const rx = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
        const ry = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
        const rz = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
        
        points.push({
          value: [centerX + rx, centerY + ry, Math.max(0, centerZ + rz)],
          itemStyle: { 
            color: color,
            shadowBlur: 15,
            shadowColor: color,
            opacity: 0.8
          }
        });
      }
      return points;
    };

    const heroes = generateCluster(60, 80, 20, 80, 20, '#ec4899'); // Pink
    const warriors = generateCluster(100, 45, 45, 30, 25, '#0ea5e9'); // Sky 
    const farmers = generateCluster(150, 15, 80, 10, 30, '#10b981'); // Emerald

    const option = {
      backgroundColor: 'transparent',
      grid3D: {
        viewControl: {
          autoRotate: true,
          autoRotateSpeed: 10, // Visually pleasing slow spin
          autoRotateAfterStill: 2, // Resume rotation 2 seconds after user stops dragging
          distance: 250,
          alpha: 20,
          beta: 40
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisPointer: { show: false },
        environment: 'transparent', // No dark box
      },
      xAxis3D: { type: 'value', min: 0, max: 100, splitLine: { show: false }, axisLabel: { show: false }, axisTick: { show: false } },
      yAxis3D: { type: 'value', min: 0, max: 100, splitLine: { show: false }, axisLabel: { show: false }, axisTick: { show: false } },
      zAxis3D: { type: 'value', min: 0, max: 100, splitLine: { show: false }, axisLabel: { show: false }, axisTick: { show: false } },
      series: [
        { type: 'scatter3D', symbolSize: 6, data: heroes, name: 'Heroes' },
        { type: 'scatter3D', symbolSize: 5, data: warriors, name: 'Warriors' },
        { type: 'scatter3D', symbolSize: 3, data: farmers, name: 'Farmers' }
      ]
    };

    setChartOptions(option);
    setMounted(true);
  }, []);

  if (!mounted) {
     return <div className="w-full h-full flex items-center justify-center text-purple-500 animate-pulse font-mono text-xs">Initializing Apache ECharts WebGL Engine...</div>;
  }

  return (
    <div className="w-full h-full relative cursor-move">
      <ReactECharts
        option={chartOptions}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }} // ECharts 3D only supports canvas renderer
      />
      <div className="absolute top-4 right-4 pointer-events-none">
        <span className="font-mono text-[10px] text-purple-400 tracking-widest uppercase border border-purple-500/30 px-2 py-1 rounded bg-[#0a0c10]/80 backdrop-blur-sm shadow-[0_0_15px_rgba(168,85,247,0.2)]">
           Auto-Rotating Canvas
        </span>
      </div>
    </div>
  );
}
