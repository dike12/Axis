import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

import GlassCard from '../ui/GlassCard';

export default function SavingsCard() {
  const [mode, setMode] = useState('active');
  const rate = mode === 'active' ? 34.2 : 12.5;
  const change = mode === 'active' ? 2.1 : -0.5;
  const isPositive = change > 0;

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-400 font-medium text-sm">Savings Rate</h3>
        {/* Toggle Pill */}
        <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
          {['active', 'passive'].map((m) => (
            <button 
              key={m}
              onClick={() => setMode(m)}
              className={`text-[10px] px-3 py-1 rounded-md font-medium capitalize transition-all ${
                mode === m ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="text-3xl font-bold text-white mb-2 tracking-tight">{rate}%</div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{change}%</span>
        </div>
        <span className="text-gray-500 text-xs">This month</span>
      </div>
    </GlassCard>
  );
}