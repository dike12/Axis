import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useFinance } from "../../context/FinanceContext";

export default function AssetAllocationChart() {
  const { holdings, transactions } = useFinance();

  // Dynamically group holdings and calculate cash
  const data = useMemo(() => {
    const grouped = holdings.reduce((acc, h) => {
      const type = h.assetType === 'etf' ? 'ETFs' : h.assetType === 'stock' ? 'Stocks' : h.assetType === 'crypto' ? 'Crypto' : 'Other';
      acc[type] = (acc[type] || 0) + h.value;
      return acc;
    }, {});

    // Calculate Cash from transactions
    const netCash = transactions.reduce((sum, t) => sum + t.amount, 0);
    if (netCash > 0) grouped['Cash'] = netCash;

    const colors = { Stocks: "#3b82f6", ETFs: "#10b981", Crypto: "#f59e0b", Cash: "#6b7280", Other: "#8b5cf6" };
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value, color: colors[name] || "#9ca3af" }))
      .filter(d => d.value > 0);
  }, [holdings, transactions]);

  return (
    <div className="bg-[#11141B] border border-gray-800 rounded-xl hover:bg-[#151921] transition-all duration-300 h-full flex flex-col">
      <div className="p-6 pb-2">
        <h3 className="text-lg font-medium text-white">Asset Allocation</h3>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#11141B", border: "1px solid #1f2937", borderRadius: "8px", color: "#f3f4f6" }}
                formatter={(value) => [`$${value.toLocaleString()}`, ""]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (<span style={{ color: "#9ca3af" }}>{value}</span>)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}