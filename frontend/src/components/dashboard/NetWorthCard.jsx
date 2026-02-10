import { TrendingUp, TrendingDown } from 'lucide-react';

import GlassCard from '../ui/GlassCard';

export default function NetWorthCard() {
  const netWorthData = { value: 412847, change: 12.4, trend: 'up' };
  const isPositive = netWorthData.trend === 'up';

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-400 font-medium text-sm">Net Worth</h3>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-white tracking-tight">
          ${netWorthData.value.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{netWorthData.change}%</span>
        </div>
        <span className="text-gray-500 text-xs">vs last month</span>
      </div>
    </GlassCard>
  );
}