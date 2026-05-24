import React, { createContext, useState, useContext, useEffect } from 'react';

const FinanceContext = createContext();

const initialHoldings = [
  { symbol: "VDY.TO", name: "Vanguard Cdn High Div Yield", shares: 350, price: 42.15, change: 0.45, value: 14752, allocation: 24.2, assetType: "etf" },
  { symbol: "TD.TO", name: "Toronto-Dominion Bank", shares: 120, price: 78.40, change: -0.25, value: 9408, allocation: 15.4, assetType: "stock" },
  { symbol: "AAPL", name: "Apple Inc.", shares: 50, price: 185.92, change: 2.34, value: 9296, allocation: 15.2, assetType: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", shares: 25, price: 141.80, change: -0.89, value: 3545, allocation: 5.8, assetType: "stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 20, price: 402.56, change: 1.23, value: 8051, allocation: 13.2, assetType: "stock" },
  { symbol: "BTC", name: "Bitcoin", shares: 0.25, price: 42850, change: 4.20, value: 10712, allocation: 17.5, assetType: "crypto" },
];

// ─── PLANNER & ANALYSIS DATA ───
const defaultIncomeCategories = [];
const defaultExpenseCategories = [];
const defaultSavingsCategories = [];
const budgetIncomeCategories = [];
const budgetExpenseCategories = [];
const budgetSavingsCategories = [];

export function FinanceProvider({ children }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); 
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // getMonth() is 0-indexed (Jan = 0)
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, net_flow: 0 });
  const [transactions, setTransactions] = useState([]);
  const [holdings, setHoldings] = useState(initialHoldings);
  const [loading, setLoading] = useState(true); // Added a loading state
  const [performance, setPerformance] = useState(null);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [settings, setSettings] = useState(null);

  const [plannerData, setPlannerData] = useState({
    actualIncome: defaultIncomeCategories,
    actualExpenses: defaultExpenseCategories,
    actualSavings: defaultSavingsCategories,
    budgetIncome: budgetIncomeCategories,
    budgetExpenses: budgetExpenseCategories,
    budgetSavings: budgetSavingsCategories,
  });

  const [analysisSnapshot, setAnalysisSnapshot] = useState({
    total_spent: 0,
    mom_change_percentage: 0,
    biggest_category: { name: "None", amount: 0, icon: "💰" },
    most_improved_category: { name: "None", amount_improved: 0, icon: "📈" }
  });
  const [analysisBreakdown, setAnalysisBreakdown] = useState([]);
  const [analysisTrends, setAnalysisTrends] = useState([]);
  const [analysisInsights, setAnalysisInsights] = useState([]);

  // 2. The magic connection to FastAPI
  useEffect(() => {
    // 1. Fetch Transactions
    fetch('http://localhost:3000/api/v1/transactions/')
      .then((res) => res.json())
      .then((json) => {
        const fetchedData = json.data || [];
        const formattedData = fetchedData.map(tx => ({
          ...tx, amount: parseFloat(tx.amount), details: tx.description 
        }));
        setTransactions(formattedData);
        setLoading(false);
      })
      .catch((err) => { console.error("Error fetching transactions:", err); setLoading(false); });

    // 2. Fetch Live Budget Grid
    fetch(`http://localhost:3000/api/v1/budget/values?year=${selectedYear}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          // Helper to format data for the UI
          const mapData = (data, key) => data.map(cat => ({ ...cat, values: cat[key] }));

          setPlannerData(prev => ({
            ...prev,
            ...(json.data.income.length > 0 && {
              budgetIncome:   mapData(json.data.income,   'planned_values'),
              actualIncome:   mapData(json.data.income,   'actual_values'),
            }),
            ...(json.data.expenses.length > 0 && {
              budgetExpenses:  mapData(json.data.expenses, 'planned_values'),
              actualExpenses:  mapData(json.data.expenses, 'actual_values'),
            }),
            ...(json.data.savings.length > 0 && {
              budgetSavings:   mapData(json.data.savings,  'planned_values'),
              actualSavings:   mapData(json.data.savings,  'actual_values'),
            }),
          }));
        }
      })
      .catch(err => console.error('Failed to fetch budget:', err));
    
    //3. Fetch Performance
    fetch(`http://localhost:3000/api/v1/budget/performance?year=${selectedYear}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) setPerformance(json.data);
      })
      .catch(err => console.error('Failed to fetch performance:', err));
    
    
      fetch(`http://localhost:3000/api/v1/transactions/summary?year=${selectedYear}&month=${selectedMonth}`)
        .then(r => r.json())
        .then(json => { if (json.data) setSummary(json.data); })
        .catch(err => console.error('Failed to fetch summary:', err));
    
    
    
    
    // Fetch Monthly Snapshot 
    fetch(`http://localhost:3000/api/v1/analysis/monthly-snapshot?year=${selectedYear}&month=${selectedMonth}`)
      .then(r => r.json())
      .then(json => { if (json.data) setAnalysisSnapshot(json.data); }) // Follows consistent response envelope [cite: 36]
      .catch(err => console.error('Failed to fetch analysis snapshot:', err));

    // Fetch Category Breakdown 
    fetch(`http://localhost:3000/api/v1/analysis/category-breakdown?year=${selectedYear}&month=${selectedMonth}`)
      .then(r => r.json())
      .then(json => { if (json.data) setAnalysisBreakdown(json.data.categories); })
      .catch(err => console.error('Failed to fetch category breakdown:', err));

    // Fetch Trends 
    fetch(`http://localhost:3000/api/v1/analysis/trends?year=${selectedYear}&month=${selectedMonth}`)
      .then(r => r.json())
      .then(json => { if (json.data) setAnalysisTrends(json.data.trends); })
      .catch(err => console.error('Failed to fetch trend sets:', err));

    // Fetch Spending Insights 
    fetch(`http://localhost:3000/api/v1/analysis/spending-insights?year=${selectedYear}&month=${selectedMonth}`)
      .then(r => r.json())
      .then(json => { if (json.data) setAnalysisInsights(json.data.insights); })
      .catch(err => console.error('Failed to fetch spending insights:', err));
    
    fetch('http://localhost:3000/api/v1/budget/categories')
      .then(r => r.json())
      .then(json => { if (json.data) setBudgetCategories(json.data); })
      .catch(err => console.error('Failed to fetch budget categories:', err));
    
    
    // Fetch User Settings
    fetch('http://localhost:3000/api/v1/settings')
      .then(r => r.json())
      .then(json => { if (json.data) setSettings(json.data); })
      .catch(err => console.error('Failed to fetch settings:', err));
    
    
  }, [refreshTrigger, selectedYear, selectedMonth]); // Reloads when refreshTrigger changes!

  const updatePlannerData = (key, updater) => {
    setPlannerData(prev => ({
      ...prev,
      [key]: typeof updater === 'function' ? updater(prev[key]) : updater
    }));
  };

  // --- 1. ADD TRANSACTION ---
  const addTransaction = async (txn) => {
      // Translate Frontend keys to Backend schema
      const payload = {
        date: txn.date,
        amount: Math.abs(txn.amount), // Backend expects positive numbers
        category: txn.category,
        description: txn.details, // Map 'details' to 'description'
        type: txn.type,
        shift_override: false 
      };

      try {
        const res = await fetch('http://localhost:3000/api/v1/transactions/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.data) {
          // Translate the newly created DB record back to Frontend format
          const newDbTx = { ...json.data, amount: parseFloat(json.data.amount), details: json.data.description };
          // Instantly update the UI by putting the new item at the top of the list
          setTransactions(prev => [newDbTx, ...prev]);

          setRefreshTrigger(prev => prev + 1);
        }
      } catch (err) {
        console.error("Failed to add transaction to database:", err);
      }
  };

  // --- 2. DELETE TRANSACTION ---
  const deleteTransaction = async (id) => {
    // Optimistic UI update: remove it from the screen immediately to make the app feel fast
    setTransactions(prev => prev.filter((t) => t.id !== id));

    try {
      await fetch(`http://localhost:3000/api/v1/transactions/${id}`, {
        method: 'DELETE'
      });
      // If we wanted to be super safe, we'd check for a 200 OK status here,
      // but since we already updated the UI, the user is happy!
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      // In a production app, if this failed, we would re-fetch the transactions to fix the UI
    }
  };

  // --- 3. EDIT TRANSACTION ---
  const editTransaction = async (id, details, amount, newDate) => {
      // Add the date to the payload
      const payload = {
        description: details,
        amount: Math.abs(amount),
        date: newDate 
      };

      try {
        const res = await fetch(`http://localhost:3000/api/v1/transactions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.data) {
          // Since the backend might have shifted the effective_date based on your new date,
          // we map the ENTIRE updated transaction back to the frontend!
          const updatedDbTx = { ...json.data, amount: parseFloat(json.data.amount), details: json.data.description };
          setTransactions(prev => prev.map((t) => t.id === id ? updatedDbTx : t));
        }
      } catch (err) {
        console.error("Failed to update transaction:", err);
      }
  };

  // --- 4. ADD BUDGET CATEGORY ---
  const addBudgetCategory = async (name, type) => {
    const payload = { name, type, icon: "💰", is_fixed: false, sort_order: 0 };
    try {
      const res = await fetch('http://localhost:3000/api/v1/budget/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to add category:", err);
    }
  };

  // --- 5. UPDATE BUDGET VALUE ---
  const updateBudgetValue = async (categoryId, year, month, amount) => {
    const payload = {
      values: [{ category_id: categoryId, year, month, planned_amount: amount }]
    };
    try {
      const res = await fetch('http://localhost:3000/api/v1/budget/values', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to update budget value:", err);
    }
  };

  // --- 6. EDIT BUDGET CATEGORY ---
  const updateBudgetCategory = async (id, payload) => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/budget/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to update category:", err);
    }
  };


  // --- 7. DELETE BUDGET CATEGORY  ---
  const deleteBudgetCategory = async (id) => {
  try {
    const res = await fetch(`http://localhost:3000/api/v1/budget/categories/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      setRefreshTrigger(prev => prev + 1);
      return true;
    }
    // 400 = has values, 404 = gone — either way, restore UI truth
    setRefreshTrigger(prev => prev + 1);
    return false;
  } catch (err) {
    console.error("Failed to delete category:", err);
    setRefreshTrigger(prev => prev + 1);
    return false;
  }
};
  
  const addHolding = (holding) => {
    setHoldings((prev) => {
      const updated = [...prev, holding];
      const total = updated.reduce((s, x) => s + x.value, 0);
      return updated.map((x) => ({ ...x, allocation: Math.round((x.value / total) * 1000) / 10 }));
    });
  };

  const bulkUpdateBudgetValues = async (rows) => {
     try {
        const res = await fetch('http://localhost:3000/api/v1/budget/values', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: rows })
        });
        if (res.ok) setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Failed to bulk update budget values:", err);
      }
  };

  // --- 8. UPDATE USER SETTINGS ---
  const updateUserSettings = async (payload) => {
    // Optimistically update local state so the UI feels instant
    setSettings(prev => ({ ...prev, ...payload }));

    try {
      const res = await fetch('http://localhost:3000/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.data) {
        setSettings(json.data); // Sync with actual DB truth
        
        // CRITICAL: If budget logic changed, transactions and budget actuals 
        // just shifted on the backend. We MUST refresh the entire app's data.
        if ("shift_late_income" in payload || "income_cutoff_day" in payload) {
          setRefreshTrigger(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
      // If it fails, trigger a refresh to revert the optimistic UI update
      setRefreshTrigger(prev => prev + 1); 
    }
  };

  return (
    <FinanceContext.Provider 
      value={{ 
        transactions, holdings, summary, addTransaction, deleteTransaction, editTransaction, addHolding,
        plannerData, updatePlannerData, loading,
        addBudgetCategory, updateBudgetValue, deleteBudgetCategory, updateBudgetCategory, performance, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
        analysisSnapshot, analysisBreakdown, analysisTrends, analysisInsights, bulkUpdateBudgetValues, budgetCategories, settings, updateUserSettings
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  return useContext(FinanceContext);
}