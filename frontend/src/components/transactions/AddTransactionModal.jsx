import React, { useState, useMemo } from "react";
import { Plus, X } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import { cn } from "../../lib/utils";

const CUTOFF_DAY = 20;
const SHIFT_LATE_INCOME = true;

const typeColors = {
  income: "border-emerald-500/50 focus-within:border-emerald-500",
  expense: "border-rose-500/50 focus-within:border-rose-500",
  investment: "border-blue-500/50 focus-within:border-blue-500",
  saving: "border-amber-500/50 focus-within:border-amber-500",
};

const typeTextColors = {
  income: "text-emerald-400",
  expense: "text-rose-400",
  investment: "text-blue-400",
  saving: "text-amber-400",
};

export default function AddTransactionModal({ trigger, onAdd }) {
  const { addTransaction } = useFinance(); // Global State
  const [open, setOpen] = useState(false);
  
  const [date, setDate] = useState(""); 
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");

  const effectiveBudgetMonth = useMemo(() => {
    if (!date || type !== "income") return null;
    const dateObj = new Date(date);
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
    const day = dateObj.getDate();
    if (SHIFT_LATE_INCOME && day >= CUTOFF_DAY) {
      dateObj.setMonth(dateObj.getMonth() + 1);
    }
    return dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [date, type]);

  const isShifted = useMemo(() => {
    if (!date || type !== "income") return false;
    const day = parseInt(date.split("-")[2], 10);
    return SHIFT_LATE_INCOME && day >= CUTOFF_DAY;
  }, [date, type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (date && type && category && amount) {
      const parsedAmount = parseFloat(amount);
      
      // Format transaction for Global Context
      const newTxn = {
        date,
        category,
        details,
        amount: type === "income" ? Math.abs(parsedAmount) : -Math.abs(parsedAmount),
        type: type === "income" ? "credit" : "debit"
      };

      addTransaction(newTxn);
      if (onAdd) onAdd(newTxn);
      
      setOpen(false);
      setDate(""); setType(""); setCategory(""); setAmount(""); setDetails("");
    }
  };

  const inputCls = "w-full h-10 px-3 rounded-md border border-gray-700 bg-[#11141B] text-sm text-white placeholder-gray-500 focus:outline-none transition-colors appearance-none";

  return (
    <>
      {/* Trigger Button */}
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </button>
        )}
      </div>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-white">Add Transaction</h2>
                <p className="text-sm text-gray-400 mt-1">Enter the details for your new transaction.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Type</label>
                <div className="grid grid-cols-4 gap-1 bg-[#0B0E14] border border-gray-800 rounded-lg p-1">
                  {["income", "expense", "investment", "saving"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setType(t); setCategory(""); }}
                      className={cn(
                        "px-2 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                        type === t ? cn("bg-[#1A1F26] shadow-sm", typeTextColors[t]) : "text-gray-400 hover:text-white"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={cn(inputCls, "[color-scheme:dark]")} />
              </div>

              {type === "income" && date && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Effective Budget Month</label>
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-md border bg-[#1A1F26]", isShifted ? "border-blue-500/50 bg-blue-500/10" : "border-gray-800")}>
                    <span className={cn("font-medium text-sm", isShifted ? "text-blue-400" : "text-white")}>{effectiveBudgetMonth}</span>
                    {isShifted && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">➔ Shifted</span>}
                  </div>
                  {isShifted && <p className="text-xs text-gray-500">This income will count towards {effectiveBudgetMonth}'s budget (received on or after day {CUTOFF_DAY})</p>}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Category</label>
                <select required value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="" disabled>Select category</option>
                  {type === "income" && <><option value="Salary">Salary</option><option value="Freelance">Freelance</option><option value="Dividends">Dividends</option></>}
                  {type === "investment" && <><option value="Stocks">Stocks</option><option value="Bonds">Bonds</option><option value="Crypto">Crypto</option></>}
                  {type === "saving" && <><option value="401k">401k</option><option value="Emergency Fund">Emergency Fund</option></>}
                  {(!type || type === "expense") && <><option value="Food">Food</option><option value="Shopping">Shopping</option><option value="Utilities">Utilities</option><option value="Transport">Transport</option><option value="Entertainment">Entertainment</option></>}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</label>
                <input required type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={cn(inputCls, type && typeColors[type])} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Details</label>
                <input required placeholder="Transaction description" value={details} onChange={(e) => setDetails(e.target.value)} className={inputCls} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800 mt-6">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}