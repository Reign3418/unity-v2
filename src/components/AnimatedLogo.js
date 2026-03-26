import React from 'react';

export default function AnimatedLogo({ className = "", onMouseEnter, onMouseLeave }) {
  return (
    <div 
      className={`relative flex items-center justify-center ${className} group cursor-pointer`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] bg-cyan-500/20 rounded-full blur-[50px] animate-pulse pointer-events-none opacity-0 group-hover:opacity-100 transition-duration-1000"></div>
      
      <img 
        src="/unity-logo-dark-1.png" 
        alt="Unity Target Architecture Logo" 
        className="w-[120%] h-[120%] object-contain relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:drop-shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-700 group-hover:scale-[1.05]"
        onError={(e) => { e.target.onerror = null; e.target.src = "/unity-logo-dark-0.png"; }}
      />
    </div>
  );
}
