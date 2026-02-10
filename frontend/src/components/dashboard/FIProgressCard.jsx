import { Target } from 'lucide-react';

import GlassCard from '../ui/GlassCard';

export default function FIProgressCard() {
  const percentage = 32.1;
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-400 font-medium text-sm">FI Progress</h3>
        <Target size={18} className="text-gray-500" />
      </div>
      <div className="text-3xl font-bold text-emerald-400 mb-2 tracking-tight">{percentage}% Funded</div>
      <p className="text-gray-500 text-xs mb-4">Progress towards 4% rule target</p>
      
      {/* Progress Bar with Glow */}
      <div className="w-full bg-gray-700/30 rounded-full h-1.5 overflow-hidden">
        <div 
          className="bg-emerald-500 h-1.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </GlassCard>
  );
}