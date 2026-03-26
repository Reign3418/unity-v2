import React from 'react';

export default function AnimatedLogo({ className = "", onMouseEnter, onMouseLeave }) {
  return (
    <div 
      className={`relative flex items-center justify-center ${className} group cursor-pointer`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Local Ethereal Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] bg-cyan-500/20 rounded-full blur-[50px] animate-pulse pointer-events-none opacity-0 group-hover:opacity-100 transition-duration-1000"></div>

      <svg 
        viewBox="0 0 200 220" 
        className="w-full h-full drop-shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:drop-shadow-[0_0_40px_rgba(6,182,212,0.8)] transition-all duration-700 relative z-10"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shieldGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" /> {/* sky-500 */}
            <stop offset="100%" stopColor="#0284c7" /> {/* sky-600 */}
          </linearGradient>
          <linearGradient id="shieldGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" /> {/* teal-400 */}
            <stop offset="100%" stopColor="#0891b2" /> {/* cyan-600 */}
          </linearGradient>
          <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%" stopColor="#a5f3fc" stopOpacity="1" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Central Glowing Orb */}
        <circle 
          cx="100" cy="115" r="26" 
          fill="url(#orbGlow)" 
          className="animate-pulse" 
          style={{ animationDuration: '3s' }} 
        />

        {/* --- LEFT PERSON (Waving Arm) --- */}
        <g className="transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:-translate-x-4 group-hover:-translate-y-2">
            {/* Distinct Separated Head */}
            <circle cx="62" cy="45" r="16" fill="#0284c7" />
            {/* Body and Raised Arm */}
            <path 
              d="M 94 185 
                 C 50 150, 40 100, 35 65
                 L 20 30
                 L 58 52
                 C 55 70, 65 85, 75 95
                 C 82 120, 88 150, 94 165
                 Z"
              fill="url(#shieldGradLeft)"
            />
        </g>

        {/* --- RIGHT PERSON (Waving Arm) --- */}
        <g className="transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:translate-x-4 group-hover:-translate-y-2">
            {/* Distinct Separated Head */}
            <circle cx="138" cy="45" r="16" fill="#0891b2" />
            {/* Body and Raised Arm */}
            <path 
               d="M 106 185 
                 C 150 150, 160 100, 165 65
                 L 180 30
                 L 142 52
                 C 145 70, 135 85, 125 95
                 C 118 120, 112 150, 106 165
                 Z"
              fill="url(#shieldGradRight)"
            />
        </g>

        {/* --- BOTTOM CHEVRONS (Shield Base) --- */}
        <g className="transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:translate-y-6">
            <path 
              d="M 100 220 L 50 170 L 62 158 L 100 196 L 138 158 L 150 170 Z"
              fill="#0284c7"
            />
            <path 
              d="M 100 190 L 70 160 L 80 150 L 100 170 L 120 150 L 130 160 Z"
              fill="#22d3ee"
              className="animate-pulse opacity-80"
              style={{ animationDuration: '2s' }}
            />
        </g>

      </svg>
    </div>
  );
}
