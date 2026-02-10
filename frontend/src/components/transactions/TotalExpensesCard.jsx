import GlassCard from '../ui/GlassCard';

export default function TotalExpensesCard() {
  // Mock Data
  const data = {
    label: "Total Expenses",
    value: 4036.71,
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-gray-400 font-medium text-sm mb-1">{data.label}</h3>
      <span className="text-3xl font-bold text-rose-400 tracking-tight">
        -${data.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    </GlassCard>
  );
}