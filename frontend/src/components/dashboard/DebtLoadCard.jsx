import { CreditCard } from 'lucide-react';

import GlassCard from '../ui/GlassCard';

export default function DebtLoadCard() {
  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-400 font-medium text-sm">Debt Load</h3>
        <CreditCard size={18} className="text-gray-500" />
      </div>
      <div className="text-3xl font-bold text-yellow-400 mb-1 tracking-tight">33%</div>
      <p className="text-gray-500 text-xs">Debt-to-Income ratio</p>
    </GlassCard>
  );
}