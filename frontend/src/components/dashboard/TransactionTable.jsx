import React from "react";
import { Search } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";

const CATEGORY_COLORS = {
  Income:        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  Shopping:      "bg-purple-500/20  text-purple-400  border border-purple-500/30",
  Food:          "bg-orange-500/20  text-orange-400  border border-orange-500/30",
  Investment:    "bg-blue-500/20    text-blue-400    border border-blue-500/30",
  Utilities:     "bg-yellow-500/20  text-yellow-400  border border-yellow-500/30",
  Entertainment: "bg-pink-500/20    text-pink-400    border border-pink-500/30",
  Transport:     "bg-cyan-500/20    text-cyan-400    border border-cyan-500/30",
  Health:        "bg-red-500/20     text-red-400     border border-red-500/30",
};

const fmtDate = (str) =>
  new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function TransactionTable({ limit, showFilters = false, title = "Recent Transactions" }) {
  // Pull live transactions from global state
  const { transactions } = useFinance();
  
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  return (
    <div className="bg-[#11141B] border border-gray-800 rounded-xl overflow-hidden">
      
      {/* Table Header area */}
      <div className="p-6 border-b border-gray-800 flex flex-row items-center justify-between space-y-0 bg-[#11141B]">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        
        {/* Optional Search Filter */}
        {showFilters && (
           <div className="flex items-center gap-2">
             <div className="relative">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
               <input 
                 type="text" 
                 placeholder="Search..." 
                 className="h-9 w-[200px] pl-9 pr-3 rounded-md border border-gray-800 bg-[#1A1F26] text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
               />
             </div>
           </div>
        )}
      </div>
      
      {/* Scrollable Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-400 border-b border-gray-800 bg-[#1A1F26]">
            <tr>
              <th className="px-6 py-3 font-medium whitespace-nowrap">Date</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap">Category</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap">Details</th>
              <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50 bg-[#11141B]">
            {displayTransactions.map((tx) => (
              <tr 
                key={tx.id} 
                className="hover:bg-[#1A1F26]/50 transition-colors cursor-pointer text-gray-300"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {fmtDate(tx.date)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[tx.category] || "bg-gray-800 text-gray-300 border border-gray-700"}`}>
                    {tx.category}
                  </span>
                </td>
                <td className="px-6 py-4">{tx.details}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${tx.type === "credit" ? "text-emerald-400" : "text-white"}`}>
                  {tx.type === "credit" ? "+" : "-"}
                  ${Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}