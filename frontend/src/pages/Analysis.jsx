import React, { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Check } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import Header from "../components/Header";
import { useFinance } from "../context/FinanceContext";
import { cn } from "../lib/utils";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getBarColor = (actual, budget) => {
  if (budget === 0) return "#f43f5e";
  const ratio = actual / budget;
  if (ratio > 1) return "#f43f5e"; // rose-500
  if (ratio > 0.9) return "#fbbf24"; // amber-400
  return "#10b981"; // emerald-500
};

const getTrendTag = (history) => {
  if (history.length < 2) return { label: "Stable →", color: "text-amber-400 border-amber-500/30", icon: Minus };
  const recent = history[history.length - 1];
  const prev = history[history.length - 2];
  const diff = prev > 0 ? ((recent - prev) / prev) * 100 : 0;
  if (Math.abs(diff) < 5) return { label: "Stable →", color: "text-amber-400 border-amber-500/30", icon: Minus };
  if (diff > 0) return { label: "Rising ↑", color: "text-rose-400 border-rose-500/30", icon: TrendingUp };
  return { label: "Reduced ↓", color: "text-emerald-400 border-emerald-500/30", icon: TrendingDown };
};

const getSparklineColor = (history) => {
  const trend = getTrendTag(history);
  if (trend.color.includes("text-rose-400")) return "#fb7185"; // rose-400
  if (trend.color.includes("text-emerald-400")) return "#34d399"; // emerald-400
  return "#fbbf24"; // amber-400
};

const getInsight = (cat) => {
  const delta = cat.actual - cat.budget;
  const momDelta = cat.lastMonth > 0 ? ((cat.actual - cat.lastMonth) / cat.lastMonth * 100).toFixed(0) : null;

  if (delta > 0) {
    if (momDelta) return `You spent ${Math.abs(Number(momDelta))}% ${Number(momDelta) > 0 ? "more" : "less"} on ${cat.name} than last month.`;
    return `${cat.name} is $${delta} over budget.`;
  }
  if (delta < 0) return `${cat.name} came in $${Math.abs(delta)} under budget. Good.`;
  return `${cat.name} is exactly on budget.`;
};

const formatCurrency = (v) => `$${v.toLocaleString()}`;
const monthLabels = ["6mo", "5mo", "4mo", "3mo", "2mo", "Now"];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Analysis({ toggleSidebar }) {
  const { plannerData } = useFinance();
  const [acknowledged, setAcknowledged] = useState(new Set());

  // Derive Analysis Categories from Planner Global Context
  // Assuming index 0 (January) is our current active month for the dashboard
  const currentMonth = 0; 

  const categories = plannerData.actualExpenses.map(exp => {
    const budgetCat = plannerData.budgetExpenses.find(b => b.name === exp.name);
    const budget = budgetCat ? budgetCat.values[currentMonth] : 0;
    const actual = exp.values[currentMonth];
    
    // Using index 1 (Feb) as 'last month' for mockup comparison purposes
    const lastMonth = exp.values[1]; 
    
    // Calculate simple 3 month avg (Months 0, 1, 2)
    const avg3mo = Math.round((exp.values[0] + exp.values[1] + exp.values[2]) / 3);
    
    // 6 months of historical data for the sparklines
    const history = exp.values.slice(0, 6).reverse(); 

    return {
      name: exp.name,
      actual,
      budget,
      lastMonth,
      avg3mo,
      history,
      icon: exp.icon || "💰",
      fixed: exp.fixed || false
    };
  });

  const fixedCategories = categories.filter(c => c.fixed);
  const variableCategories = categories.filter(c => !c.fixed);

  const monthlySpend = categories.reduce((s, c) => s + c.actual, 0);
  const lastMonthSpend = categories.reduce((s, c) => s + c.lastMonth, 0);
  const momChange = lastMonthSpend > 0 ? ((monthlySpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

  const biggestCategory = categories.length > 0 
    ? categories.reduce((a, b) => a.actual > b.actual ? a : b) 
    : { name: "None", actual: 0, icon: "" };

  const mostImproved = categories.length > 0 
    ? categories.reduce((a, b) => (a.lastMonth - a.actual) > (b.lastMonth - b.actual) ? a : b)
    : { name: "None", actual: 0, lastMonth: 0, icon: "" };

  const chartData = variableCategories.map(c => ({
    name: c.name, actual: c.actual, budget: c.budget,
  }));

  const toggleAck = (name) => {
    setAcknowledged(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] text-white">
      
      <div className="sticky top-0 z-20 bg-[#0B0E14]">
        <Header title="Spending Analysis" toggleSidebar={toggleSidebar} />
      </div>

      <div className="p-8 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400">Total Spent This Month</p>
            <p className="text-2xl font-bold mt-2">{formatCurrency(monthlySpend)}</p>
            <p className={cn("text-xs mt-1 font-medium", momChange > 0 ? "text-rose-400" : "text-emerald-400")}>
              {momChange > 0 ? "↑" : "↓"} {Math.abs(momChange).toFixed(1)}% vs last month
            </p>
          </div>
          
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400">Biggest Category</p>
            <p className="text-2xl font-bold mt-2">{biggestCategory.icon} {biggestCategory.name}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(biggestCategory.actual)} spent</p>
          </div>

          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400">Most Improved</p>
            <p className="text-2xl font-bold mt-2 text-emerald-400">{mostImproved.icon} {mostImproved.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              -{formatCurrency(mostImproved.lastMonth - mostImproved.actual)} vs last month
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 lg:col-span-3">
            <h3 className="text-lg font-semibold mb-6">Category Breakdown</h3>
            
            <div className="space-y-6">
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
                      Total Fixed: <span className="font-semibold text-white ml-1">{formatCurrency(fixedCategories.reduce((s, c) => s + c.actual, 0))}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Variable Expenses</p>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
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
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={getBarColor(entry.actual, entry.budget)} />
                        ))}
                      </Bar>
                      <Bar dataKey="budget" fill="none" stroke="#6B7280" strokeDasharray="4 4" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2">
                  {variableCategories.map(cat => {
                    const pct = cat.budget > 0 ? Math.round((cat.actual / cat.budget) * 100) : 0;
                    return (
                      <div key={cat.name} className="flex items-center justify-between text-xs px-2">
                        <span className="text-gray-400">{cat.icon} {cat.name}</span>
                        <span className={cn("font-medium", pct > 100 ? "text-rose-400" : pct > 90 ? "text-amber-400" : "text-emerald-400")}>
                          {pct}% of budget
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-6">Trends</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {variableCategories.map((cat) => {
                const trend = getTrendTag(cat.history);
                const sparkData = cat.history.map((v, i) => ({ v, month: monthLabels[i] }));
                const sparkColor = getSparklineColor(cat.history);

                return (
                  <div key={cat.name} className="p-4 rounded-xl bg-[#1A1F26] border border-gray-800/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-white">{cat.icon} {cat.name}</span>
                      <span className={cn("text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border", trend.color)}>
                        {trend.label}
                      </span>
                    </div>
                    <div className="h-[50px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                          <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                          <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={2} dot={{ r: 3, fill: sparkColor, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>This month: <span className="text-gray-300">{formatCurrency(cat.actual)}</span></span>
                      <span>3-mo avg: <span className="text-gray-300">{formatCurrency(cat.avg3mo)}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6">Monthly Review</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {categories.map((cat) => {
              const delta = cat.actual - cat.budget;
              const isOver = delta > 0;
              const isAck = acknowledged.has(cat.name);

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

                  <div className={cn("text-sm font-medium", isOver ? "text-rose-400" : "text-emerald-400")}>
                    {isOver ? "+" : ""}{formatCurrency(delta)} {isOver ? "over" : "under"} budget
                  </div>
                  
                  <p className="text-xs text-gray-400 leading-relaxed min-h-[32px]">{getInsight(cat)}</p>
                  
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