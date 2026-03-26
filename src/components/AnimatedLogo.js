import React from 'react';

export default function AnimatedLogo({ className = "" }) {
  return (
    <div className={`relative flex items-center justify-center ${className} group cursor-pointer`}>
      {/* Background Pulse / Ethereal Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] w-[160%] h-[160%] bg-cyan-500/20 rounded-full blur-[40px] animate-pulse pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 delay-100"></div>

      <svg 
        viewBox="0 0 200 220" 
        className="w-full h-full drop-shadow-[0_0_20px_rgba(6,182,212,0.3)] group-hover:drop-shadow-[0_0_35px_rgba(6,182,212,0.6)] transition-all duration-700 relative z-10"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shieldGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" /> {/* sky-500 */}
            <stop offset="60%" stopColor="#0284c7" /> {/* sky-600 */}
            <stop offset="100%" stopColor="#1e3a8a" /> {/* blue-900 */}
          </linearGradient>
          <linearGradient id="shieldGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" /> {/* teal-400 */}
            <stop offset="50%" stopColor="#06b6d4" /> {/* cyan-500 */}
            <stop offset="100%" stopColor="#1e40af" /> {/* blue-800 */}
          </linearGradient>
          <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#cffafe" stopOpacity="1" />
            <stop offset="40%" stopColor="#22d3ee" stopOpacity="1" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Central Core (The Orb) */}
        <circle cx="100" cy="120" r="30" fill="url(#orbGlow)" className="animate-pulse" style={{ animationDuration: '3.5s' }} />

        {/* Left Guardian / Shield Half */}
        <g className="transition-transform duration-700 ease-in-out group-hover:-translate-x-1 group-hover:-translate-y-1">
            {/* Guardian Head */}
            <circle cx="55" cy="52" r="16" fill="#0284c7" className="drop-shadow-[0_0_10px_rgba(2,132,199,0.5)]" />
            {/* Guardian Body forming the Shield curve */}
            <path 
              d="M 95 10 
                 C 80 35, 45 55, 15 45
                 C 25 70, 45 85, 40 100
                 C 30 130, 20 150, 40 170
                 C 60 200, 90 215, 100 220
                 l -15 -25
                 C 65 170, 50 145, 65 115
                 C 80 90, 85 85, 95 85 Z"
              fill="url(#shieldGradLeft)"
            />
        </g>

        {/* Right Guardian / Shield Half */}
        <g className="transition-transform duration-700 ease-in-out group-hover:translate-x-1 group-hover:-translate-y-1">
            {/* Guardian Head */}
            <circle cx="145" cy="52" r="16" fill="#0891b2" className="drop-shadow-[0_0_10px_rgba(8,145,178,0.5)]" />
            {/* Guardian Body forming the Shield curve */}
            <path 
               d="M 105 10 
                 C 120 35, 155 55, 185 45
                 C 175 70, 155 85, 160 100
                 C 170 130, 180 150, 160 170
                 C 140 200, 110 215, 100 220
                 l 15 -25
                 C 135 170, 150 145, 135 115
                 C 120 90, 115 85, 105 85 Z"
              fill="url(#shieldGradRight)"
            />
        </g>
        
        {/* Inner V Geometry connecting the base */}
        <g className="transition-transform duration-700 ease-in-out group-hover:translate-y-2">
            <path 
              d="M 72 155 L 100 185 L 128 155 L 100 195 Z"
              fill="#38bdf8"
              className="animate-pulse opacity-80"
              style={{ animationDuration: '4s' }}
            />
            <path 
              d="M 82 170 L 100 190 L 118 170 L 100 195 Z"
              fill="#22d3ee"
              className="animate-pulse opacity-50"
              style={{ animationDuration: '2s' }}
            />
        </g>
      </svg>
    </div>
  );
}
