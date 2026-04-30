import React from "react";
import { Plus } from 'lucide-react';
import { useFinance } from "../context/FinanceContext"; // <-- Import global state

import Header from '../components/Header';
import KPICard from '../components/dashboard/KPICard';
import SavingsRateToggle from '../components/dashboard/SavingsRateToggle';
import SurvivalFreedomRow from '../components/dashboard/SurvivalFreedomRow';
import NetWorthChart from '../components/dashboard/NetWorthChart';
import AssetAllocationChart from '../components/dashboard/AssetAllocationChart';
import TransactionTable from "../components/dashboard/TransactionTable";

export default function Home({ toggleSidebar }) {
  // Pull live data from global context
  const { transactions, holdings } = useFinance();

  // --- DYNAMIC CALCULATIONS ---
  // 1. Calculate Holdings Total
  const totalHoldings = holdings.reduce((sum, h) => sum + h.value, 0);

  // 2. Calculate Transaction Totals
  const totalIncome = transactions
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === "debit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // 3. Derived KPIs
  // Net worth = Investment Value + Liquid Cash (Income - Expenses)
  const currentNetWorth = totalHoldings + (totalIncome - totalExpenses);
  
  // Savings Rate = (Income - Expenses) / Income
  const savingsRate = totalIncome > 0 
    ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) 
    : 0;

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14]"> 
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0B0E14]">
        <Header title="Overview" toggleSidebar={toggleSidebar} />
      </div>

      {/* Main Content */}
      <div className="p-8">
      
        {/* ROW 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <KPICard
            title="Net Worth"
            value={`$${currentNetWorth.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            trend={{ value: "+12.4%", isPositive: true }} // Keeping trend static until historical data is tracked
            subtitle="vs last month"
          />
          <KPICard
            title="Savings Rate"
            value={`${savingsRate}%`}
            trend={{ value: "+2.1%", isPositive: true }}
            subtitle="This month"
          >
            <SavingsRateToggle />
          </KPICard>
          <KPICard
            title="Monthly Spend"
            value={`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            trend={{ value: "-8.3%", isPositive: false }}
            subtitle="vs last month"
          />
        </div>

        {/* ROW 2: Survival & Freedom */}
        <SurvivalFreedomRow />

        {/* ROW 3: Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <NetWorthChart />
          </div>
          <div className="h-full">
            <AssetAllocationChart />
          </div>
        </div>

        {/* ROW 4: Recent Transactions */}
        <div className="w-full">
          {/* Note: Depending on how your TransactionTable component is built, 
              you may need to pass the transactions array to it via a prop: 
              data={transactions.slice(0, 5)} */}
          <TransactionTable limit={5} title="Recent Transactions" />
        </div>
      </div>
    </div>
  );
}