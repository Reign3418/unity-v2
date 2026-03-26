import React from 'react';

export default function AnimatedLogo({ className = "" }) {
  // Generate 16 firework particles
  const particles = Array.from({ length: 16 }).map((_, i) => {
    const angle = (i * 22.5) * (Math.PI / 180);
    const destX = Math.cos(angle) * 120; // Explosion radius
    const destY = Math.sin(angle) * 120;
    return (
      <circle
        key={i}
        cx="100"
        cy="120"
        r={i % 2 === 0 ? "3" : "1.5"}
        fill={i % 3 === 0 ? "#38bdf8" : "#2dd4bf"}
        className="firework-particle"
        style={{
          '--dest-x': `${destX}px`,
          '--dest-y': `${destY}px`,
        }}
      />
    );
  });

  return (
    <div className={`relative flex items-center justify-center ${className} group cursor-pointer`}>
      <style>
        {`
          .firework-particle {
            opacity: 0;
            transform-origin: 100px 120px;
          }
          .group:hover .firework-particle {
            animation: explode 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
          }
          @keyframes explode {
            0% { transform: translate(0, 0) scale(0); opacity: 1; }
            50% { opacity: 0.8; }
            100% { transform: translate(var(--dest-x), var(--dest-y)) scale(1.5); opacity: 0; }
          }
        `}
      </style>

      {/* Background Pulse / Ethereal Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] w-[160%] h-[160%] bg-cyan-500/10 rounded-full blur-[40px] animate-pulse pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 delay-100"></div>

      <svg 
        viewBox="0 0 200 220" 
        className="w-full h-full drop-shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:drop-shadow-[0_0_40px_rgba(6,182,212,0.8)] transition-all duration-700 relative z-10"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shieldGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" /> {/* sky-500 */}
            <stop offset="100%" stopColor="#0f172a" /> {/* slate-900 */}
          </linearGradient>
          <linearGradient id="shieldGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" /> {/* teal-400 */}
            <stop offset="100%" stopColor="#0f172a" /> {/* slate-900 */}
          </linearGradient>
          <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%" stopColor="#a5f3fc" stopOpacity="1" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Firework Particles layer (behind orb) */}
        <g>{particles}</g>

        {/* Central Core (The Orb) */}
        <circle cx="100" cy="110" r="22" fill="url(#orbGlow)" className="animate-pulse" style={{ animationDuration: '2s' }} />

        {/* Left Tribal Guardian */}
        <g className="transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:-translate-x-3 group-hover:-translate-y-3">
            {/* The Head / Notch */}
            <circle cx="68" cy="48" r="14" fill="#0284c7" className="drop-shadow-[0_0_8px_rgba(2,132,199,0.8)]" />
            {/* The Blade / Shield Body */}
            <path 
              d="M 30 40 
                 L 68 50 
                 L 68 62
                 A 14 14 0 0 1 68 90
                 L 68 110
                 L 98 140
                 C 98 160, 95 180, 100 200
                 L 50 160
                 C 30 130, 20 90, 30 40 Z"
              fill="url(#shieldGradLeft)"
            />
        </g>

        {/* Right Tribal Guardian */}
        <g className="transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:translate-x-3 group-hover:-translate-y-3">
            {/* The Head / Notch */}
            <circle cx="132" cy="48" r="14" fill="#0d9488" className="drop-shadow-[0_0_8px_rgba(13,148,136,0.8)]" />
            {/* The Blade / Shield Body */}
            <path 
               d="M 170 40 
                 L 132 50 
                 L 132 62
                 A 14 14 0 0 0 132 90
                 L 132 110
                 L 102 140
                 C 102 160, 105 180, 100 200
                 L 150 160
                 C 170 130, 180 90, 170 40 Z"
              fill="url(#shieldGradRight)"
            />
        </g>
        
        {/* Inner Chevron Geometry */}
        <g className="transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:translate-y-4 group-hover:scale-[1.05] origin-center">
            <path 
              d="M 72 150 L 100 180 L 128 150 L 100 190 Z"
              fill="#22d3ee"
              className="opacity-90"
            />
            <path 
              d="M 85 162 L 100 178 L 115 162 L 100 185 Z"
              fill="#a5f3fc"
              className="animate-pulse opacity-100"
              style={{ animationDuration: '1.5s' }}
            />
        </g>
      </svg>
    </div>
  );
}
