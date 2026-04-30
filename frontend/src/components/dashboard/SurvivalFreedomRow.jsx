import React, { useMemo } from "react";
import { Shield, Target, CreditCard } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";

export default function SurvivalFreedomRow() {
  const { holdings, transactions, plannerData } = useFinance();

  const metrics = useMemo(() => {
    // 1. Calculate Total Cash from transactions
    const totalCash = transactions.reduce((s, t) => s + t.amount, 0);

    // 2. Derive Monthly Spend & Income from Planner Data (using month index 0)
    const avgMonthlySpend = plannerData.actualExpenses.reduce((s, c) => s + c.values[0], 0) || 4285; // Fallback to avoid div by zero
    const grossMonthlyIncome = plannerData.actualIncome.reduce((s, c) => s + c.values[0], 0) || 9700;
    const monthlySavings = grossMonthlyIncome - avgMonthlySpend;

    // 3. Current Net Worth
    const totalHoldings = holdings.reduce((s, h) => s + h.value, 0);
    const currentNetWorth = totalHoldings + totalCash;

    // 4. Financial Independence Target (4% Rule)
    const fiTarget = (avgMonthlySpend * 12) / 0.04; 

    // Find top burners from expenses
    const topBurners = [...plannerData.actualExpenses]
      .sort((a, b) => b.values[0] - a.values[0])
      .slice(0, 2)
      .map(cat => ({ name: cat.name, monthlyAmount: cat.values[0] }));

    return { totalCash, avgMonthlySpend, currentNetWorth, fiTarget, grossMonthlyIncome, monthlySavings, topBurners, totalDebt: 3200 }; // Fixed debt for now
  }, [holdings, transactions, plannerData]);

  // Logic Derivations
  const runwayMonths = Math.max(metrics.totalCash / metrics.avgMonthlySpend, 0);
  const runwayColor = runwayMonths < 3 ? "text-rose-400" : runwayMonths <= 6 ? "text-amber-400" : "text-emerald-400";

  const fiPercent = Math.min((metrics.currentNetWorth / metrics.fiTarget) * 100, 100);
  const remaining = metrics.fiTarget - metrics.currentNetWorth;
  const yearsToFI = remaining > 0 && metrics.monthlySavings > 0 ? remaining / (metrics.monthlySavings * 12) : 0;
  const projectedFIYear = new Date().getFullYear() + Math.ceil(yearsToFI);

  const dtiRatio = (metrics.totalDebt / metrics.grossMonthlyIncome) * 100;
  const dtiColor = dtiRatio < 20 ? "text-emerald-400" : dtiRatio > 35 ? "text-rose-400" : "text-amber-400";
  const dtiLabel = dtiRatio < 20 ? "Healthy" : dtiRatio <= 35 ? "Moderate" : "High Risk";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      
      {/* Runway Card */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 hover:bg-[#151921] transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 font-medium">Runway</p>
          <Shield className="h-4 w-4 text-gray-500" />
        </div>
        <div className="mt-4">
          <p className={`text-3xl font-semibold tracking-tight ${runwayColor}`}>
            {runwayMonths.toFixed(1)} Months
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-2">Liquid Cash / Avg Monthly Spend</p>
        <p className="text-xs text-gray-500 mt-1">
          {metrics.topBurners.map((b, i) => {
            const burnMonths = ((b.monthlyAmount * 12) / (metrics.avgMonthlySpend * 12)) * runwayMonths;
            return (
              <span key={b.name}>
                {b.name} burns {burnMonths.toFixed(1)} mo/yr
                {i < metrics.topBurners.length - 1 ? " · " : ""}
              </span>
            );
          })}
        </p>
      </div>

      {/* FI Progress Card */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 hover:bg-[#151921] transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 font-medium">FI Progress</p>
          <Target className="h-4 w-4 text-gray-500" />
        </div>
        <div className="mt-4">
          <p className="text-3xl font-semibold tracking-tight text-emerald-400">
            {fiPercent.toFixed(1)}% Funded
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          toward ${metrics.fiTarget.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          At current savings rate → Est. {projectedFIYear}
        </p>
        <div className="h-1.5 w-full bg-gray-800 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fiPercent}%` }} />
        </div>
      </div>

      {/* Debt Load Card */}
      <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 hover:bg-[#151921] transition-colors">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 font-medium">Debt Load</p>
          <CreditCard className="h-4 w-4 text-gray-500" />
        </div>
        <div className="mt-4">
          <p className="text-3xl font-semibold tracking-tight text-amber-400">
            {dtiRatio.toFixed(0)}%
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-2">Debt-to-Income ratio</p>
        <p className={`text-xs font-medium mt-1 ${dtiColor}`}>
          {dtiLabel}
        </p>
      </div>

    </div>
  );
}