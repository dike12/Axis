import { ShieldCheck } from 'lucide-react';

import GlassCard from '../ui/GlassCard';

export default function RunwayCard() {
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-400 font-medium text-sm">Runway</h3>
        <ShieldCheck size={18} className="text-gray-500" />
      </div>
      <div className="text-3xl font-bold text-emerald-400 mb-1 tracking-tight">7.6 Months</div>
      <p className="text-gray-500 text-xs">Total Cash / Avg Monthly Spend</p>
    </GlassCard>
  );
}