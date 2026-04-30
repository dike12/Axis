import React, { createContext, useState, useContext } from 'react';

const FinanceContext = createContext();

// ─── TRANSACTIONS & HOLDINGS (Keep your existing mock data here) ───
const initialTransactions = [
  { id: 1,  date: "2024-01-15", category: "Income",        details: "Salary Deposit",         amount: 8500,    type: "credit" },
  { id: 2,  date: "2024-01-14", category: "Shopping",      details: "Amazon Purchase",        amount: -156.99, type: "debit"  },
  { id: 3,  date: "2024-01-13", category: "Food",          details: "Whole Foods",            amount: -89.50,  type: "debit"  },
  { id: 4,  date: "2024-01-12", category: "Investment",    details: "Stock Purchase - AAPL",  amount: -2500,   type: "debit"  },
  { id: 5,  date: "2024-01-11", category: "Utilities",     details: "Electric Bill",          amount: -145.00, type: "debit"  },
  { id: 6,  date: "2024-01-10", category: "Income",        details: "Dividend Payment",       amount: 125.50,  type: "credit" },
];

const initialHoldings = [
  { symbol: "VDY.TO", name: "Vanguard Cdn High Div Yield", shares: 350, price: 42.15, change: 0.45, value: 14752, allocation: 24.2, assetType: "etf" },
  { symbol: "TD.TO", name: "Toronto-Dominion Bank", shares: 120, price: 78.40, change: -0.25, value: 9408, allocation: 15.4, assetType: "stock" },
  { symbol: "AAPL", name: "Apple Inc.", shares: 50, price: 185.92, change: 2.34, value: 9296, allocation: 15.2, assetType: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", shares: 25, price: 141.80, change: -0.89, value: 3545, allocation: 5.8, assetType: "stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 20, price: 402.56, change: 1.23, value: 8051, allocation: 13.2, assetType: "stock" },
  { symbol: "BTC", name: "Bitcoin", shares: 0.25, price: 42850, change: 4.20, value: 10712, allocation: 17.5, assetType: "crypto" },
];

// ─── PLANNER & ANALYSIS DATA ───
const defaultIncomeCategories = [
  { name: "Salary", icon: "💼", fixed: true, values: [8500, 8500, 8500, 8500, 8500, 8500, 9000, 9000, 9000, 9000, 9000, 9000] },
  { name: "Freelance", icon: "💻", fixed: false, values: [1200, 800, 1500, 600, 1800, 2200, 900, 1100, 1600, 2000, 1400, 1800] },
  { name: "Dividends", icon: "📈", fixed: false, values: [0, 0, 450, 0, 0, 480, 0, 0, 510, 0, 0, 540] },
];

const defaultExpenseCategories = [
  { name: "Housing", icon: "🏠", fixed: true, values: [2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200] },
  { name: "Food", icon: "🍔", fixed: false, values: [750, 528, 650, 590, 520, 480, 680, 590, 710, 660, 620, 750] },
  { name: "Utilities", icon: "⚡", fixed: false, values: [165, 195, 142, 165, 195, 180, 168, 185, 150, 142, 158, 175] },
  { name: "Transportation", icon: "🚗", fixed: false, values: [320, 290, 320, 290, 310, 280, 300, 275, 320, 295, 330, 360] },
  { name: "Entertainment", icon: "🎬", fixed: false, values: [200, 180, 190, 200, 180, 150, 180, 240, 200, 260, 190, 280] },
  { name: "Insurance", icon: "🛡️", fixed: true, values: [450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450] },
  { name: "Shopping", icon: "🛒", fixed: false, values: [235, 157, 180, 150, 200, 120, 250, 180, 210, 160, 190, 280] },
  { name: "Subscriptions", icon: "📱", fixed: true, values: [85, 85, 85, 95, 85, 85, 95, 85, 85, 85, 95, 85] },
  { name: "Health", icon: "💊", fixed: false, values: [45, 0, 0, 45, 60, 0, 45, 50, 0, 80, 0, 45] },
];

const defaultSavingsCategories = [
  { name: "401k", icon: "🏦", fixed: true, values: [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500] },
  { name: "Emergency Fund", icon: "🚑", fixed: false, values: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500] },
];

const budgetIncomeCategories = [
  { name: "Salary", values: [8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500] },
  { name: "Freelance", values: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000] },
  { name: "Dividends", values: [0, 0, 400, 0, 0, 400, 0, 0, 400, 0, 0, 400] },
];

const budgetExpenseCategories = [
  { name: "Housing", values: [2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200] },
  { name: "Food", values: [600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600] },
  { name: "Utilities", values: [175, 175, 175, 175, 175, 175, 175, 175, 175, 175, 175, 175] },
  { name: "Transportation", values: [300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300] },
  { name: "Entertainment", values: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200] },
  { name: "Insurance", values: [450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450, 450] },
  { name: "Shopping", values: [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150] },
  { name: "Subscriptions", values: [85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85] },
  { name: "Health", values: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] },
];

const budgetSavingsCategories = [
  { name: "401k", values: [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500] },
  { name: "Emergency Fund", values: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500] },
];

export function FinanceProvider({ children }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [holdings, setHoldings] = useState(initialHoldings);

  // New Global Planner State
  const [plannerData, setPlannerData] = useState({
    actualIncome: defaultIncomeCategories,
    actualExpenses: defaultExpenseCategories,
    actualSavings: defaultSavingsCategories,
    budgetIncome: budgetIncomeCategories,
    budgetExpenses: budgetExpenseCategories,
    budgetSavings: budgetSavingsCategories,
  });

  // Action to update planner grid data safely
  const updatePlannerData = (key, updater) => {
    setPlannerData(prev => ({
      ...prev,
      [key]: typeof updater === 'function' ? updater(prev[key]) : updater
    }));
  };

  const addTransaction = (txn) => { setTransactions([{ ...txn, id: Date.now() }, ...transactions]); };
  const deleteTransaction = (id) => { setTransactions(transactions.filter((t) => t.id !== id)); };
  const editTransaction = (id, details, amount) => {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, details, amount: t.type === "credit" ? amount : -Math.abs(amount) } : t));
  };
  const addHolding = (holding) => {
    setHoldings((prev) => {
      const updated = [...prev, holding];
      const total = updated.reduce((s, x) => s + x.value, 0);
      return updated.map((x) => ({ ...x, allocation: Math.round((x.value / total) * 1000) / 10 }));
    });
  };

  return (
    <FinanceContext.Provider 
      value={{ 
        transactions, holdings, addTransaction, deleteTransaction, editTransaction, addHolding,
        plannerData, updatePlannerData // Exported for Planner & Analysis
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  return useContext(FinanceContext);
}