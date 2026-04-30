import React, { useMemo } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useFinance } from "../../context/FinanceContext";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const current = payload[0].value;
  return (
    <div className="rounded-lg border border-gray-800 bg-[#11141B] p-3 shadow-md">
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-sm text-emerald-400 font-semibold">
        ${current.toLocaleString()}
      </p>
    </div>
  );
};

export default function NetWorthChart() {
  const { holdings, transactions } = useFinance();

  // Generate historical shape, but cap it with the LIVE Net Worth calculation
  const chartData = useMemo(() => {
    const baseData = [
      { month: "Jan", value: 245000 }, { month: "Feb", value: 258000 },
      { month: "Mar", value: 242000 }, { month: "Apr", value: 275000 },
      { month: "May", value: 289000 }, { month: "Jun", value: 312000 },
      { month: "Jul", value: 298000 }, { month: "Aug", value: 325000 },
      { month: "Sep", value: 342000 }, { month: "Oct", value: 358000 },
      { month: "Nov", value: 375000 }
    ];

    // Live Net Worth
    const totalHoldings = holdings.reduce((s, h) => s + h.value, 0);
    const netCash = transactions.reduce((s, t) => s + t.amount, 0);
    const currentNetWorth = totalHoldings + netCash;

    // Append the real-time value to the end of the chart
    return [...baseData, { month: "Dec (Now)", value: currentNetWorth }];
  }, [holdings, transactions]);

  return (
    <div className="bg-[#11141B] border border-gray-800 rounded-xl hover:bg-[#151921] transition-all duration-300">
      <div className="p-6 pb-2">
        <h3 className="text-lg font-medium text-white">Net Worth History</h3>
      </div>
      <div className="p-6">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorValue)"
                dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#11141B" }}
                activeDot={{ r: 6, fill: "#10b981", stroke: "#0B0E14", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}