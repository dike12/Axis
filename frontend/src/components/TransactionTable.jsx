import { ArrowRight, Search } from 'lucide-react';
import GlassCard from './ui/GlassCard';

export default function TransactionTable({ limit, showFilters = false, title = "Recent Transactions" }) {
  
  // Mock Data
  const transactions = [
    { id: 1, date: "Dec 28, 2024", monthTag: "Jan", category: "Income", details: "Monthly Salary - Acme Corp", amount: 8500.00, type: "income" },
    { id: 2, date: "Dec 26, 2024", monthTag: null, category: "Food", details: "Whole Foods Market", amount: -156.42, type: "expense" },
    { id: 3, date: "Jan 25, 2025", monthTag: "Feb", category: "Income", details: "Freelance Payment", amount: 2500.00, type: "income" },
    { id: 4, date: "Dec 22, 2024", monthTag: null, category: "Shopping", details: "Amazon - Electronics", amount: -349.99, type: "expense" },
    { id: 5, date: "Dec 20, 2024", monthTag: null, category: "Utilities", details: "Electric Bill - ConEd", amount: -142.30, type: "expense" },
    { id: 6, date: "Dec 18, 2024", monthTag: null, category: "Transport", details: "Uber Ride", amount: -45.00, type: "expense" },
    { id: 7, date: "Dec 15, 2024", monthTag: null, category: "Entertainment", details: "Netflix Subscription", amount: -15.99, type: "expense" },
  ];

  const displayedTransactions = limit ? transactions.slice(0, limit) : transactions;

  // Updated category styles to match the design
  const getCategoryStyles = (cat) => {
    switch (cat.toLowerCase()) {
      case 'income': return 'bg-emerald-500/20 text-emerald-400';
      case 'food': return 'bg-orange-500/20 text-orange-400';
      case 'shopping': return 'bg-purple-500/20 text-purple-400';
      case 'utilities': return 'bg-rose-500/20 text-rose-400';
      case 'transport': return 'bg-cyan-500/20 text-cyan-400';
      case 'entertainment': return 'bg-pink-500/20 text-pink-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <GlassCard className="flex flex-col h-full overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-white">{title}</h3>
      </div>

      {/* TABLE SECTION */}
      <div className="relative w-full overflow-auto">
        <table className="w-full text-sm text-left">
            
            {/* Table Head */}
            <thead>
                <tr className="border-b border-white/5">
                    <th className="h-12 px-6 text-left align-middle font-normal text-gray-500 text-sm">Date</th>
                    <th className="h-12 px-6 text-left align-middle font-normal text-gray-500 text-sm">Category</th>
                    <th className="h-12 px-6 text-left align-middle font-normal text-gray-500 text-sm">Details</th>
                    <th className="h-12 px-6 align-middle font-normal text-gray-500 text-sm text-right">Amount</th>
                </tr>
            </thead>

            {/* Table Body */}
            <tbody>
                {displayedTransactions.map((tx, index) => (
                    <tr 
                        key={tx.id} 
                        className={`border-b border-white/5 transition-colors hover:bg-white/2 ${
                            index === displayedTransactions.length - 1 ? 'border-b-0' : ''
                        }`}
                    >
                        
                        {/* Date Column */}
                        <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">{tx.date}</span>
                                {tx.monthTag && (
                                    <span className="flex items-center text-[10px] font-semibold bg-indigo-950/60 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/50">
                                        <ArrowRight size={10} className="mr-0.5" /> {tx.monthTag}
                                    </span>
                                )}
                            </div>
                        </td>

                        {/* Category Column */}
                        <td className="px-6 py-4 align-middle">
                            <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${getCategoryStyles(tx.category)}`}>
                                {tx.category}
                            </span>
                        </td>

                        {/* Details Column */}
                        <td className="px-6 py-4 align-middle text-gray-300 text-sm">
                            {tx.details}
                        </td>

                        {/* Amount Column */}
                        <td className={`px-6 py-4 align-middle text-right font-medium text-sm ${
                            tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                            {tx.type === 'income' ? '+' : '-'}
                            ${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </GlassCard>
  );
}