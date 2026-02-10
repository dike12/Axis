import GlassCard from '../ui/GlassCard';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AssetAllocationChart() {
  const data = [
    { name: "Stocks", value: 185000, color: "hsl(160, 84%, 39%)" },
    { name: "Cash", value: 95000, color: "hsl(217, 91%, 60%)" },
    { name: "Crypto", value: 72000, color: "hsl(280, 65%, 60%)" },
    { name: "Bonds", value: 60000, color: "hsl(38, 92%, 50%)" },
  ];

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white">Asset Allocation</h3>
      </div>

      <div className="flex-1 min-h-75 w-full relative">
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
               contentStyle={{
                backgroundColor: "hsl(222, 47%, 8%)",
                border: "1px solid hsl(217, 33%, 17%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 98%)",
              }}
              formatter={(value) => [`$${value.toLocaleString()}`, '']}
            />
            
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value) => (
                 <span style={{ color: "hsl(215, 20%, 65%)" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}