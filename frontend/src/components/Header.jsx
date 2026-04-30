import React from 'react';
import { PanelLeft } from 'lucide-react';

export default function Header({ title, children, toggleSidebar }) {
  return (
    <header className="h-16 border-b border-gray-800 bg-[#0B0E14]/80 backdrop-blur-xl flex items-center justify-between px-6 transition-all duration-300">
      
      {/* Left Side: Sidebar Toggle & Title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar} 
          className="text-gray-400 hover:text-white transition-colors"
        >
          <PanelLeft size={20} />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-medium tracking-wide">{title}</span>
        </div>
      </div>

      {/* Right Side: Dynamic Actions */}
      <div className="flex items-center gap-3">
        {/* Only render exactly what the specific page passes in */}
        {children}
      </div>
      
    </header>
  );
}