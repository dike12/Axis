import GlassCard from '../ui/GlassCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', value: 245000 }, { month: 'Feb', value: 252000 }, { month: 'Mar', value: 248000 },
  { month: 'Apr', value: 265000 }, { month: 'May', value: 278000 }, { month: 'Jun', value: 290000 },
  { month: 'Jul', value: 285000 }, { month: 'Aug', value: 310000 }, { month: 'Sep', value: 325000 },
  { month: 'Oct', value: 340000 }, { month: 'Nov', value: 360000 }, { month: 'Dec', value: 412847 },
];

export default function NetWorthChart() {
  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white">Net Worth History</h3>
      </div>
      <div className="flex-1 min-h-75 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0B0E14", borderColor: "#1F2937", borderRadius: "8px", color: "#fff" }}
              itemStyle={{ color: "#10B981" }}
              formatter={(value) => [`$${value.toLocaleString()}`, "Net Worth"]}
            />
            <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}