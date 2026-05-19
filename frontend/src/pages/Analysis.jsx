import React, { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Check, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import Header from "../components/Header";
import { useFinance } from "../context/FinanceContext";
import { cn } from "../lib/utils";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getBarColor = (actual, budget, isSavings) => {
  if (budget === 0) return isSavings ? "#10b981" : "#f43f5e";
  const ratio = actual / budget;
  
  if (isSavings) {
    // For savings: meeting/exceeding is green, halfway is yellow, missing is red
    if (ratio >= 1) return "#10b981"; // emerald-500
    if (ratio >= 0.5) return "#fbbf24"; // amber-400
    return "#f43f5e"; // rose-500
  } else {
    // For expenses: exceeding is red, near limit is yellow, under is green
    if (ratio > 1) return "#f43f5e"; // rose-500
    if (ratio > 0.9) return "#fbbf24"; // amber-400
    return "#10b981"; // emerald-500
  }
};


const getTrendStyle = (tag) => {
  if (tag === "Stable") return { label: "Stable →", color: "text-amber-400 border-amber-500/30", icon: Minus, hex: "#fbbf24" };
  if (tag === "Rising") return { label: "Rising ↑", color: "text-rose-400 border-rose-500/30", icon: TrendingUp, hex: "#fb7185" };
  return { label: "Reduced ↓", color: "text-emerald-400 border-emerald-500/30", icon: TrendingDown, hex: "#34d399" };
};

const formatCurrency = (v) => `$${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthLabels = ["6mo ago", "5mo ago", "4mo ago", "3mo ago", "2mo ago", "Now"];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Analysis({ toggleSidebar }) {
  const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const { 
    analysisSnapshot, 
    analysisBreakdown, 
    analysisTrends, 
    analysisInsights,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    budgetCategories
  } = useFinance();
  const [acknowledged, setAcknowledged] = useState(new Set());

  const fixedCategories = analysisBreakdown.filter(c => c.is_fixed);
  const variableCategories = analysisBreakdown.filter(c => !c.is_fixed);

  const totalFixedSpend = fixedCategories.reduce((sum, c) => sum + c.actual, 0);

  // Map variable data rows directly into Recharts parameters
  const chartData = variableCategories.map(c => ({
    name: c.name, 
    actual: c.actual, 
    budget: c.budget,
  }));

  const toggleAck = (name) => {
    setAcknowledged(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex flex-col w-full min-w-0 min-h-screen bg-[#0B0E14] text-white">
      
      {/* Header Workspace */}
      <div className="sticky top-0 z-20 bg-[#0B0E14] flex flex-col md:flex-row md:items-center justify-between pr-8 border-b border-gray-800/50">
        <Header title="Spending Analysis" toggleSidebar={toggleSidebar} />

        <div className="flex items-center gap-3 p-4 md:p-0 self-end md:self-auto">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-[#11141B] border border-gray-800 text-sm rounded-lg p-2 font-medium focus:outline-none focus:border-gray-700 text-gray-200 cursor-pointer"
          >
            {monthsNames.map((name, index) => (
              <option key={name} value={index + 1}>{name} {selectedYear}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 w-full min-w-0 max-w-full p-8 space-y-6 overflow-hidden">
        
        {/* --- Top Metrics Cards (Sourced from analysisSnapshot) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400">Total Spent This Month</p>
            <p className="text-2xl font-bold mt-2">{formatCurrency(analysisSnapshot.total_spent)}</p>
            <p className={cn("text-xs mt-1 font-medium", analysisSnapshot.mom_change_percentage > 0
                  ? "text-rose-400"
                  : analysisSnapshot.mom_change_percentage < 0
                    ? "text-emerald-400"
                    : "text-gray-400"  // zero → neutral
              )}>
              {analysisSnapshot.mom_change_percentage > 0 ? "↑" : analysisSnapshot.mom_change_percentage < 0 ? "↓" : "→"} {Math.abs(analysisSnapshot.mom_change_percentage).toFixed(1)}% vs last month
            </p>
          </div>
          
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400">Biggest Category</p>
            <p className="text-2xl font-bold mt-2">
              {analysisSnapshot.biggest_category.icon} {analysisSnapshot.biggest_category.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(analysisSnapshot.biggest_category.amount)} spent</p>
          </div>

          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400">Most Improved</p>
            <p className="text-2xl font-bold mt-2 text-emerald-400">
              {analysisSnapshot.most_improved_category.icon} {analysisSnapshot.most_improved_category.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {analysisSnapshot.most_improved_category.amount_improved > 0
                ? `-${formatCurrency(analysisSnapshot.most_improved_category.amount_improved)} vs last month`
                : "No delta variance"}
            </p>
          </div>
        </div>

        {/* --- Charts Layout Segment --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full min-w-0">
          
          {/* Category Breakdown Workspace */}
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 lg:col-span-3 min-w-0 overflow-hidden">
            <h3 className="text-lg font-semibold mb-6">Category Breakdown</h3>
            
            <div className="space-y-6">
              {/* Fixed Costs Chips */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Fixed Monthly Costs</p>
                <div className="flex flex-wrap gap-3">
                  {fixedCategories.map(cat => (
                    <div key={cat.name} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A1F26] border border-gray-800">
                      <span>{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span className="text-sm font-semibold text-gray-400">{formatCurrency(cat.actual)}/mo</span>
                    </div>
                  ))}
                  <div className="flex items-center px-4 py-2.5 rounded-lg border border-gray-800/50">
                    <span className="text-xs text-gray-400">
                      Total Fixed: <span className="font-semibold text-white ml-1">{formatCurrency(totalFixedSpend)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Variable Expenses Chart Grid */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Variable Expenses</p>
                {chartData.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6">No variable entries recorded for this period.</p>
                ) : (
                  <div className="h-[320px] w-full overflow-hidden">
                    <ResponsiveContainer width="99%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                        <XAxis type="number" stroke="#6B7280" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={12} width={100} />
                        <Tooltip
                          cursor={{ fill: '#1A1F26' }}
                          contentStyle={{ backgroundColor: "#11141B", borderColor: "#1F2937", borderRadius: "8px", color: "#F3F4F6" }}
                          formatter={(value, name) => [formatCurrency(value), name === "actual" ? "Actual" : "Budget"]}
                        />
                        <Bar dataKey="actual" radius={[0, 4, 4, 0]} barSize={20}>
                          {chartData.map((entry, i) => {
                            // Check if this category is a savings type
                            const isSavings = budgetCategories.find(c => c.name === entry.name)?.type === "savings";
                            return <Cell key={i} fill={getBarColor(entry.actual, entry.budget, isSavings)} />;
                          })}
                        </Bar>
                        <Bar dataKey="budget" fill="none" stroke="#6B7280" strokeDasharray="4 4" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {variableCategories.map(cat => {
                    const pct = Math.round(cat.percent_used);
                    const isSavings = budgetCategories.find(c => c.name === cat.name)?.type === "savings";
                    
                    // Reverse the color logic if it is a savings category
                    const pctColor = isSavings 
                      ? (pct >= 100 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400")
                      : (pct > 100 ? "text-rose-400" : pct > 90 ? "text-amber-400" : "text-emerald-400");

                    return (
                      <div key={cat.name} className="flex items-center justify-between text-xs px-2">
                        <span className="text-gray-400">{cat.icon} {cat.name}</span>
                        <span className={cn("font-medium", pctColor)}>
                          {pct}% of budget
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Historical Trends Sparklines (Sourced from analysisTrends) */}
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 lg:col-span-2 min-w-0 overflow-hidden">
            <h3 className="text-lg font-semibold mb-6">Trends (6-Month Windows)</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {analysisTrends.map((cat) => {
                const style = getTrendStyle(cat.trend_tag);
                const sparkData = cat.history.map((v, i) => ({ v, month: monthLabels[i] }));

                return (
                  <div key={cat.name} className="p-4 rounded-xl bg-[#1A1F26] border border-gray-800/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-white">{cat.icon} {cat.name}</span>
                      <span className={cn("text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border", style.color)}>
                        {style.label}
                      </span>
                    </div>
                    <div className="h-[50px] w-full overflow-hidden">
                      <ResponsiveContainer width="99%" height="100%">
                        <LineChart data={sparkData}>
                          <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                          <Line 
                            type="monotone" 
                            dataKey="v" 
                            stroke={style.hex} 
                            strokeWidth={2} 
                            dot={{ r: 2, fill: style.hex, strokeWidth: 0 }} 
                            activeDot={{ r: 4 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>This month: <span className="text-gray-300">{formatCurrency(cat.history[cat.history.length - 1])}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- Review Insight Sheets --- */}
        <div className="grid grid-cols-1 bg-[#11141B] border border-gray-800 rounded-xl p-6 w-full min-w-0">
          <h3 className="text-lg font-semibold mb-6">Monthly Review</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar w-full">
            {analysisBreakdown.map((cat) => {
              const delta = cat.actual - cat.budget;
              const isOver = delta > 0;
              const isAck = acknowledged.has(cat.name);

              // Find out if it is a savings category
              const isSavings = budgetCategories.find(c => c.name === cat.name)?.type === "savings";

              // If savings: Over is GOOD. If expense: Over is BAD.
              const isGoodStatus = isSavings ? (isOver || delta === 0) : !isOver;

              // Cross-reference current row with backend string triggers
              const specificInsight = analysisInsights.find(
                i => i.category === cat.name
              );
              const insightMessage = specificInsight 
                ? specificInsight.text 
                : `${cat.name} is running smoothly on target bounds.`;

              return (
                <div
                  key={cat.name}
                  className={cn(
                    "min-w-[280px] p-5 rounded-xl border bg-[#1A1F26] space-y-4 shrink-0 transition-all duration-200",
                    isAck ? "border-emerald-500/30 opacity-50 bg-[#0B0E14]" : "border-gray-800 hover:border-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-semibold text-white">{cat.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-[#0B0E14] p-3 rounded-lg border border-gray-800/50">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Spent</p>
                      <p className="font-medium text-white">{formatCurrency(cat.actual)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Budget</p>
                      <p className="font-medium text-white">{formatCurrency(cat.budget)}</p>
                    </div>
                  </div>

                  <div className={cn("text-sm font-medium", isGoodStatus ? "text-emerald-400" : "text-rose-400")}>
                    {isOver ? "+" : ""}{formatCurrency(delta)} {isOver ? "over" : "under"} budget
                  </div>
                  
                  <p className="text-xs text-gray-400 leading-relaxed min-h-[48px]">{insightMessage}</p>
                  
                  <button
                    onClick={() => toggleAck(cat.name)}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isAck ? "bg-[#0B0E14] text-emerald-500 border border-emerald-500/20" : "bg-gray-800 text-white hover:bg-gray-700"
                    )}
                  >
                    {isAck && <Check className="h-4 w-4" />}
                    {isAck ? "Reviewed" : "Acknowledge"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}