import React, { useState, useRef } from "react";
import { Plus, X, HelpCircle } from "lucide-react";
import Header from "../components/Header";
import { useFinance } from "../context/FinanceContext";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const formatCurrency = (value) => {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const calculateTotal = (values) => values.reduce((a, b) => a + b, 0);

const performanceTooltips = {
  Income: "Total money earned from all sources",
  Expenses: "Total money spent across all expense categories",
  Savings: "Total money saved or invested",
};

function EditableCell({ value, colorClass, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef(null);

  const commit = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <td className="px-1 py-1 min-w-[100px]">
        <input
          ref={inputRef} autoFocus type="number" min="0" step="1" value={draft}
          onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          className="w-full bg-[#1A1F26] border border-emerald-500/40 rounded px-2 py-1.5 text-right text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </td>
    );
  }

  return (
    <td
      className={cn("px-4 py-2.5 text-right cursor-pointer hover:bg-white/5 rounded transition-colors whitespace-nowrap", colorClass)}
      onClick={() => { setDraft(String(value)); setEditing(true); }}
    >
      {formatCurrency(value)}
    </td>
  );
}

function PerformanceBar({ label, planned, actual, type }) {
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 150) : 0;
  const displayPct = planned > 0 ? (actual / planned) * 100 : 0;
  const diff = actual - planned;

  let barColor = "bg-emerald-500";
  let statusText = "";
  let statusColor = "text-gray-400";

  if (type === "expense") {
    if (actual > planned) {
      barColor = "bg-rose-500"; statusText = `Excess: ${formatCurrency(diff)}`; statusColor = "text-rose-400";
    } else {
      barColor = "bg-emerald-500"; statusText = `Under budget: ${formatCurrency(Math.abs(diff))}`; statusColor = "text-emerald-400";
    }
  } else if (type === "income") {
    if (actual > planned) {
      barColor = "bg-emerald-500"; statusText = `Surplus: ${formatCurrency(diff)}`; statusColor = "text-emerald-400";
    } else {
      barColor = "bg-yellow-400"; statusText = `Shortfall: ${formatCurrency(Math.abs(diff))}`; statusColor = "text-yellow-400";
    }
  } else {
    if (actual >= planned) {
      barColor = "bg-emerald-500"; statusText = `On track: +${formatCurrency(diff)}`; statusColor = "text-emerald-400";
    } else {
      barColor = "bg-yellow-400"; statusText = `Behind: ${formatCurrency(Math.abs(diff))}`; statusColor = "text-yellow-400";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-300 flex items-center gap-1.5" title={performanceTooltips[label]}>
          {label} <HelpCircle className="h-3.5 w-3.5 text-gray-500 cursor-help" />
        </span>
        <div className="flex items-center gap-3">
          <span className={cn("text-xs font-medium", statusColor)}>{statusText}</span>
          <span className="text-gray-500 text-xs">{displayPct.toFixed(0)}% {type === "expense" ? "Spent" : "Achieved"}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-[#1A1F26] overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className="text-xs text-gray-500 w-32 text-right">{formatCurrency(actual)} / {formatCurrency(planned)}</span>
      </div>
    </div>
  );
}

function InlineAddCategory({ onAdd }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) { onAdd(trimmed); setName(""); setIsAdding(false); }
  };

  if (!isAdding) {
    return (
      <tr>
        <td colSpan={14} className="px-4 py-2">
          <button
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3.5 w-3.5" /> New Category
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={14} className="px-4 py-2 bg-[#1A1F26]/30">
        <div className="flex items-center gap-2 max-w-xs">
          <input
            autoFocus placeholder="Category name…" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") { setIsAdding(false); setName(""); } }}
            className="h-8 px-2 text-xs bg-[#11141B] border border-gray-700 rounded text-white focus:outline-none focus:border-emerald-500"
          />
          <button className="h-8 px-3 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600" onClick={handleSubmit}>Add</button>
          <button className="h-8 px-2 text-xs text-gray-400 hover:text-white" onClick={() => { setIsAdding(false); setName(""); }}>
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// --- MAIN PLANNER COMPONENT ---
export default function BudgetPlanner({ toggleSidebar }) {
  const { plannerData, updatePlannerData } = useFinance();
  const [viewMode, setViewMode] = useState("actual");

  // Read Global State
  const incomeCategories = plannerData.actualIncome;
  const expenseCategories = plannerData.actualExpenses;
  const savingsCategories = plannerData.actualSavings;
  const budgetIncomeCategories = plannerData.budgetIncome;
  const budgetExpenseCategories = plannerData.budgetExpenses;
  const budgetSavingsCategories = plannerData.budgetSavings;

  // Write to Global State
  const setIncomeCategories = (updater) => updatePlannerData("actualIncome", updater);
  const setExpenseCategories = (updater) => updatePlannerData("actualExpenses", updater);
  const setSavingsCategories = (updater) => updatePlannerData("actualSavings", updater);

  // Math Helpers
  const incomeTotal = incomeCategories.reduce((acc, cat) => acc.map((val, i) => val + cat.values[i]), new Array(12).fill(0));
  const expenseTotal = expenseCategories.reduce((acc, cat) => acc.map((val, i) => val + cat.values[i]), new Array(12).fill(0));
  const savingsTotal = savingsCategories.reduce((acc, cat) => acc.map((val, i) => val + cat.values[i]), new Array(12).fill(0));

  const budgetIncomeTotal = budgetIncomeCategories.reduce((acc, cat) => acc.map((val, i) => val + cat.values[i]), new Array(12).fill(0));
  const budgetExpenseTotal = budgetExpenseCategories.reduce((acc, cat) => acc.map((val, i) => val + cat.values[i]), new Array(12).fill(0));

  const netSavings = incomeTotal.map((income, i) => income - expenseTotal[i]);

  const plannedIncome = calculateTotal(budgetIncomeTotal);
  const plannedExpenses = calculateTotal(budgetExpenseTotal);
  const plannedSavings = budgetSavingsCategories.reduce((sum, cat) => sum + calculateTotal(cat.values), 0);

  const actualIncomeTotal = incomeCategories.reduce((sum, cat) => sum + calculateTotal(cat.values), 0);
  const actualExpenseTotal = expenseCategories.reduce((sum, cat) => sum + calculateTotal(cat.values), 0);
  const actualSavingsTotal = savingsCategories.reduce((sum, cat) => sum + calculateTotal(cat.values), 0);

  // Actions
  const addCategory = (setter, name) => {
    setter((prev) => [...prev, { name, icon: "💰", fixed: false, values: new Array(12).fill(0) }]);
  };

  const removeCategory = (setter, catIdx) => {
    setter((prev) => prev.filter((_, i) => i !== catIdx));
  };

  const updateCellValue = (setter, catIdx, monthIdx, value) => {
    setter((prev) =>
      prev.map((cat, i) =>
        i === catIdx ? { ...cat, values: cat.values.map((v, j) => (j === monthIdx ? value : v)) } : cat
      )
    );
  };

  const getCellValue = (actual, budget) => {
    if (viewMode === "budget") return budget;
    if (viewMode === "delta") return actual - budget;
    return actual;
  };

  const getDeltaColor = (delta, isExpense) => {
    if (viewMode !== "delta") return "";
    if (isExpense) return delta > 0 ? "text-rose-400" : "text-emerald-400";
    return delta >= 0 ? "text-emerald-400" : "text-rose-400";
  };

  const renderCategoryRows = (categories, budgetCategories, setter, colorClass, isExpense = false) => {
    return categories.map((category, catIdx) => {
      const budgetCat = budgetCategories.find(b => b.name === category.name);
      const budgetValues = budgetCat?.values || new Array(12).fill(0);

      return (
        <tr key={category.name} className="group border-b border-gray-800/50 hover:bg-[#1A1F26]/30 transition-colors">
          <td className="sticky left-0 bg-[#11141B] group-hover:bg-[#151821] px-4 py-2.5 font-medium text-gray-200 z-10 border-r border-gray-800/50">
            <span className="flex items-center gap-1">
              {category.name}
              <button 
                onClick={() => removeCategory(setter, catIdx)} 
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-rose-400 ml-1" 
                title="Remove category"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </td>
          {category.values.map((value, i) => {
            const cellVal = getCellValue(value, budgetValues[i]);
            const deltaColor = viewMode === "delta" ? getDeltaColor(value - budgetValues[i], isExpense) : "";

            if (viewMode === "actual") {
              return (
                <EditableCell
                  key={i} value={value} colorClass={colorClass}
                  onChange={(v) => updateCellValue(setter, catIdx, i, v)}
                />
              );
            }

            return (
              <td key={i} className={cn("px-4 py-2.5 text-right whitespace-nowrap", viewMode === "delta" ? deltaColor : colorClass)}>
                {viewMode === "delta" && cellVal > 0 ? "+" : ""}{formatCurrency(cellVal)}
              </td>
            );
          })}
          <td className={cn("px-4 py-2.5 text-right font-medium bg-[#1A1F26]/30 whitespace-nowrap", viewMode === "delta" ? getDeltaColor(calculateTotal(category.values) - calculateTotal(budgetValues), isExpense) : colorClass)}>
            {viewMode === "delta" && getCellValue(calculateTotal(category.values), calculateTotal(budgetValues)) > 0 ? "+" : ""}
            {formatCurrency(getCellValue(calculateTotal(category.values), calculateTotal(budgetValues)))}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] text-white">
      
      <div className="sticky top-0 z-20 bg-[#0B0E14]">
        <Header title="Budget Planner" toggleSidebar={toggleSidebar} />
      </div>

      <div className="p-8 space-y-6">
        
        <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-medium mb-6">Performance Summary</h3>
          <div className="space-y-5">
            <PerformanceBar label="Income" planned={plannedIncome} actual={actualIncomeTotal} type="income" />
            <PerformanceBar label="Expenses" planned={plannedExpenses} actual={actualExpenseTotal} type="expense" />
            <PerformanceBar label="Savings" planned={plannedSavings} actual={actualSavingsTotal} type="savings" />
          </div>
        </div>

        <div className="bg-[#11141B] border border-gray-800 rounded-xl overflow-hidden">
          
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-medium">2024 Budget Overview</h3>
            <div className="flex bg-[#0B0E14] border border-gray-800 rounded-lg p-0.5">
              {["actual", "budget", "delta"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
                    viewMode === mode ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-400 bg-[#1A1F26]">
                <tr>
                  <th className="sticky left-0 z-20 bg-[#1A1F26] px-4 py-3 font-medium min-w-[160px] border-r border-gray-800 border-b">Category</th>
                  {months.map((month) => (
                    <th key={month} className="px-4 py-3 font-medium text-right min-w-[100px] border-b border-gray-800">{month}</th>
                  ))}
                  <th className="px-4 py-3 font-medium text-right min-w-[120px] bg-[#222831] border-b border-gray-800">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                
                {/* --- INCOME --- */}
                <tr className="bg-emerald-500/10">
                  <td colSpan={14} className="px-4 py-3 font-semibold text-emerald-400 sticky left-0 bg-[#0c1a15] border-r border-gray-800/50">Income</td>
                </tr>
                {renderCategoryRows(incomeCategories, budgetIncomeCategories, setIncomeCategories, "text-emerald-400")}
                {viewMode === "actual" && <InlineAddCategory onAdd={(name) => addCategory(setIncomeCategories, name)} />}
                
                <tr className="bg-[#1A1F26] border-y border-gray-700">
                  <td className="sticky left-0 bg-[#1A1F26] px-4 py-3 font-bold text-white border-r border-gray-700">Total Income</td>
                  {(viewMode === "budget" ? budgetIncomeTotal : viewMode === "delta" ? incomeTotal.map((v, i) => v - budgetIncomeTotal[i]) : incomeTotal).map((value, i) => (
                    <td key={i} className={cn("px-4 py-3 text-right font-bold whitespace-nowrap", viewMode === "delta" ? (value >= 0 ? "text-emerald-400" : "text-rose-400") : "text-emerald-400")}>
                      {viewMode === "delta" && value > 0 ? "+" : ""}{formatCurrency(value)}
                    </td>
                  ))}
                  <td className={cn("px-4 py-3 text-right font-bold bg-[#222831] whitespace-nowrap", viewMode === "delta" ? (calculateTotal(incomeTotal) - calculateTotal(budgetIncomeTotal) >= 0 ? "text-emerald-400" : "text-rose-400") : "text-emerald-400")}>
                    {viewMode === "delta" && (calculateTotal(incomeTotal) - calculateTotal(budgetIncomeTotal)) > 0 ? "+" : ""}
                    {formatCurrency(viewMode === "budget" ? calculateTotal(budgetIncomeTotal) : viewMode === "delta" ? calculateTotal(incomeTotal) - calculateTotal(budgetIncomeTotal) : calculateTotal(incomeTotal))}
                  </td>
                </tr>

                {/* --- EXPENSES --- */}
                <tr className="bg-rose-500/10">
                  <td colSpan={14} className="px-4 py-3 font-semibold text-rose-400 sticky left-0 bg-[#1a0f12] border-r border-gray-800/50">Expenses</td>
                </tr>
                {renderCategoryRows(expenseCategories, budgetExpenseCategories, setExpenseCategories, "text-rose-400", true)}
                {viewMode === "actual" && <InlineAddCategory onAdd={(name) => addCategory(setExpenseCategories, name)} />}
                
                <tr className="bg-[#1A1F26] border-y border-gray-700">
                  <td className="sticky left-0 bg-[#1A1F26] px-4 py-3 font-bold text-white border-r border-gray-700">Total Expenses</td>
                  {(viewMode === "budget" ? budgetExpenseTotal : viewMode === "delta" ? expenseTotal.map((v, i) => v - budgetExpenseTotal[i]) : expenseTotal).map((value, i) => (
                    <td key={i} className={cn("px-4 py-3 text-right font-bold whitespace-nowrap", viewMode === "delta" ? (value > 0 ? "text-rose-400" : "text-emerald-400") : "text-rose-400")}>
                      {viewMode === "delta" && value > 0 ? "+" : ""}{formatCurrency(value)}
                    </td>
                  ))}
                  <td className={cn("px-4 py-3 text-right font-bold bg-[#222831] whitespace-nowrap", viewMode === "delta" ? (calculateTotal(expenseTotal) - calculateTotal(budgetExpenseTotal) > 0 ? "text-rose-400" : "text-emerald-400") : "text-rose-400")}>
                    {viewMode === "delta" && (calculateTotal(expenseTotal) - calculateTotal(budgetExpenseTotal)) > 0 ? "+" : ""}
                    {formatCurrency(viewMode === "budget" ? calculateTotal(budgetExpenseTotal) : viewMode === "delta" ? calculateTotal(expenseTotal) - calculateTotal(budgetExpenseTotal) : calculateTotal(expenseTotal))}
                  </td>
                </tr>

                {/* --- SAVINGS --- */}
                <tr className="bg-blue-500/10">
                  <td colSpan={14} className="px-4 py-3 font-semibold text-blue-400 sticky left-0 bg-[#0e1624] border-r border-gray-800/50">Savings</td>
                </tr>
                {renderCategoryRows(savingsCategories, budgetSavingsCategories, setSavingsCategories, "text-blue-400")}
                {viewMode === "actual" && <InlineAddCategory onAdd={(name) => addCategory(setSavingsCategories, name)} />}

                {/* --- NET SAVINGS --- */}
                <tr className="bg-emerald-500/20">
                  <td className="sticky left-0 bg-[#122820] px-4 py-4 font-bold text-emerald-400 border-r border-gray-700">Net Savings</td>
                  {netSavings.map((value, i) => (
                    <td key={i} className={cn("px-4 py-4 text-right font-bold whitespace-nowrap", value >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatCurrency(value)}
                    </td>
                  ))}
                  <td className="px-4 py-4 text-right font-bold text-emerald-400 bg-[#153026] whitespace-nowrap">
                    {formatCurrency(calculateTotal(netSavings))}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}