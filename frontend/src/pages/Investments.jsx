import React, { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Plus, X } from "lucide-react";
import Header from "../components/Header";
import { useFinance } from "../context/FinanceContext"; // <-- Import global state
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell,
} from "recharts";
import { cn } from "../lib/utils";

// ─── STATIC MOCK DATA (For Charts) ───────────────────────────────────────────
// Note: These would eventually be calculated dynamically from your transaction history
const portfolioData = [
  { month: "Jul", value: 125000 },
  { month: "Aug", value: 132000 },
  { month: "Sep", value: 128000 },
  { month: "Oct", value: 145000 },
  { month: "Nov", value: 152000 },
  { month: "Dec", value: 168000 },
  { month: "Jan", value: 175420 },
];

const allocationData = [
  { name: "Dividend ETFs", value: 24.2, color: "#10b981" }, 
  { name: "Tech Stocks", value: 34.2, color: "#3b82f6" },   
  { name: "Financials", value: 15.4, color: "#8b5cf6" },    
  { name: "Crypto", value: 25.7, color: "#f59e0b" },        
  { name: "Cash", value: 0.5, color: "#6b7280" },           
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const getLiquidityTag = (assetType) => {
  switch (assetType) {
    case "stock":
    case "etf":
      return { label: "Liquid", className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
    case "crypto":
      return { label: "Semi-liquid", className: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
    case "bond":
    case "real-estate":
      return { label: "Locked", className: "bg-rose-500/10 text-rose-400 border border-rose-500/20" };
    default:
      return { label: "Liquid", className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" };
  }
};

// ─── ADD INVESTMENT MODAL ─────────────────────────────────────────────────────

function AddInvestmentModal({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [assetType, setAssetType] = useState("stock");

  const handleSubmit = (e) => {
    e.preventDefault();
    const s = parseFloat(shares);
    const p = parseFloat(price);
    if (symbol && s > 0 && p > 0) {
      onAdd({
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        shares: s,
        price: p,
        change: 0,
        value: Math.round(s * p),
        allocation: 0,
        assetType,
      });
      setOpen(false);
      setSymbol(""); setName(""); setShares(""); setPrice(""); setAssetType("stock");
    }
  };

  const inputCls = "flex h-10 w-full rounded-md border border-gray-700 bg-[#0B0E14] px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-4 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm font-medium transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Investment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl shadow-2xl w-full max-w-md">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h2 className="text-base font-semibold text-white">Add Investment</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add a new holding to your portfolio.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Asset Type</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className={inputCls}
                  >
                    <option value="stock">Stock</option>
                    <option value="crypto">Crypto</option>
                    <option value="etf">ETF</option>
                    <option value="bond">Bond</option>
                    <option value="real-estate">Real Estate</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Symbol / Ticker</label>
                    <input
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      placeholder="AAPL"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Apple Inc."
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Shares / Units</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      placeholder="10"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Price per Unit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="150.00"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 bg-[#0B0E14]/40 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                >
                  Add Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Investments({ toggleSidebar }) {
  // Pull live holdings and the add function from Context
  const { holdings, addHolding } = useFinance();

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalGain = 23420;
  const totalGainPercent = 15.4;
  const liquidTypes = ["stock", "etf"];
  const liquidValue = holdings
    .filter((h) => liquidTypes.includes(h.assetType))
    .reduce((s, h) => s + h.value, 0);
  const illiquidValue = totalValue - liquidValue;
  const liquidPct = totalValue > 0 ? ((liquidValue / totalValue) * 100).toFixed(1) : "0";
  const illiquidPct = totalValue > 0 ? ((illiquidValue / totalValue) * 100).toFixed(1) : "0";

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14]">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0B0E14]">
        <Header title="Investments" toggleSidebar={toggleSidebar}>
          {/* We pass the global addHolding function to the modal */}
          <AddInvestmentModal onAdd={addHolding} />
        </Header>
      </div>
          
      {/* Main Content */}
      <div className="p-8 space-y-6">

        {/* ── ROW 1: KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-emerald-500">
              <DollarSign className="h-4 w-4" />
              <p className="text-sm font-medium text-gray-400">Portfolio Value</p>
            </div>
            <p className="text-3xl font-semibold text-white">${totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Included in Net Worth</p>
          </div>

          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <p className="text-sm font-medium text-gray-400">Total Gain</p>
            </div>
            <p className="text-3xl font-semibold text-emerald-400">+${totalGain.toLocaleString()}</p>
          </div>

          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <BarChart3 className="h-4 w-4" />
              <p className="text-sm font-medium text-gray-400">Return Rate</p>
            </div>
            <p className="text-3xl font-semibold text-emerald-400">+{totalGainPercent}%</p>
          </div>

          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <PieChart className="h-4 w-4" />
              <p className="text-sm font-medium text-gray-400">Holdings</p>
            </div>
            <p className="text-3xl font-semibold text-white">{holdings.length} Assets</p>
          </div>
        </div>

        {/* ── ROW 2: Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Portfolio Performance Chart */}
          <div className="lg:col-span-2 bg-[#11141B] border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-200 mb-8">Portfolio Performance</h2>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.4} vertical={false} />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#11141B", border: "1px solid #1F2937", borderRadius: "8px", color: "#F3F4F6" }}
                    itemStyle={{ color: "#10b981" }}
                    formatter={(value) => [`$${value.toLocaleString()}`, "Value"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#portfolioGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset Allocation Chart */}
          <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 flex flex-col justify-between">
            <h2 className="text-sm font-medium text-gray-200 mb-4">Asset Allocation</h2>
            <div className="h-[180px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={allocationData}
                    cx="50%" cy="50%"
                    innerRadius={65} outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#11141B", border: "1px solid #1F2937", borderRadius: "8px", color: "#F3F4F6" }}
                    formatter={(value) => [`${value}%`, "Allocation"]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-2.5 mb-6">
              {allocationData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-400">{item.name}</span>
                  </div>
                  <span className="text-gray-300 font-medium">{item.value}%</span>
                </div>
              ))}
            </div>

            {/* Liquid / Illiquid */}
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2.5 rounded-md bg-[#0F1E19] border border-[#163326] text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Liquid</p>
                <p className="text-xs font-medium text-emerald-400">
                  ${liquidValue.toLocaleString()} ({liquidPct}%)
                </p>
              </div>
              <div className="flex-1 px-3 py-2.5 rounded-md bg-[#2A1C0F] border border-[#3D2816] text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Illiquid</p>
                <p className="text-xs font-medium text-amber-500">
                  ${illiquidValue.toLocaleString()} ({illiquidPct}%)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Holdings Table ── */}
        <div className="bg-[#11141B] border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-800/50">
            <h2 className="text-sm font-medium text-gray-200">Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-[#0B0E14]/50 text-gray-500 border-b border-gray-800/50">
                  <th className="px-6 py-4 font-normal text-xs uppercase tracking-wide">Asset</th>
                  <th className="px-6 py-4 font-normal text-xs uppercase tracking-wide">Shares</th>
                  <th className="px-6 py-4 font-normal text-xs uppercase tracking-wide">Price</th>
                  <th className="px-6 py-4 font-normal text-xs uppercase tracking-wide">24h Change</th>
                  <th className="px-6 py-4 font-normal text-xs uppercase tracking-wide">Liquidity</th>
                  <th className="px-6 py-4 font-normal text-xs uppercase tracking-wide text-right">Value</th>
                  <th className="px-6 py-4 font-normal text-xs uppercase tracking-wide text-right">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {holdings.map((holding) => {
                  const liquidity = getLiquidityTag(holding.assetType);
                  return (
                    <tr
                      key={holding.symbol}
                      className="hover:bg-[#1A1F26]/40 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-200">{holding.symbol}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{holding.name}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">{holding.shares}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">${holding.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1.5 ${holding.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {holding.change >= 0
                            ? <TrendingUp className="h-3.5 w-3.5" />
                            : <TrendingDown className="h-3.5 w-3.5" />}
                          <span className="font-mono text-xs">{holding.change >= 0 ? "+" : ""}{holding.change}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium border", liquidity.className)}>
                          {liquidity.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-gray-300">
                        ${holding.value.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#1A1F26] border border-gray-700/50 text-gray-400">
                          {holding.allocation}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}