import { Search, Filter, Download, Plus, ChevronDown } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

export default function TransactionToolbar({ onAddClick }) {
  return (
    // Changed the outer <div> to GlassCard
    <GlassCard className="p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
      
      {/* Search Bar */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        {/* Note the bg-black/40 to deepen the input against the glass card */}
        <input 
          type="text" 
          placeholder="Search transactions..." 
          className="w-full bg-black/40 border border-white/5 text-gray-300 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
        <button className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-lg text-gray-400 text-sm hover:text-white transition-colors">
          All Categories <ChevronDown size={14} />
        </button>
        {/* ... other buttons with same style ... */}
         <button 
          onClick={onAddClick}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20 whitespace-nowrap"
        >
          <Plus size={18} />
          Add Transaction
        </button>
      </div>
    </GlassCard>
  );
}