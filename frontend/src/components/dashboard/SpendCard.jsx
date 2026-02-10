import { TrendingDown } from 'lucide-react';

import GlassCard from '../ui/GlassCard';

export default function SpendCard() {
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-400 font-medium text-sm">Monthly Spend</h3>
      </div>
      <div className="text-3xl font-bold text-white mb-2 tracking-tight">$4,285</div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium">
          <TrendingDown size={14} />
          <span>-8.3%</span>
        </div>
        <span className="text-gray-500 text-xs">vs last month</span>
      </div>
    </GlassCard>
  );
}