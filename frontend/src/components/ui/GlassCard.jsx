import React from 'react';

export default function GlassCard({ children, className = "" }) {
  return (
    <div 
      className={`
        bg-[#11141B]/80       /* Dark semi-transparent background */
        backdrop-blur-xl      /* The premium frosted glass effect */
        border-white/5 /* Subtle, high-end border */
        rounded-2xl           /* Smooth corners */
        shadow-sm             /* Subtle depth */
        hover:bg-[#1A1F26]/80 /* Slight lighten on hover */
        transition-all duration-300
        ${className}          /* Allow extra classes like padding or height */
      `}
    >
      {children}
    </div>
  );
}