import GlassCard from '../ui/GlassCard';

export default function NetFlowCard() {
  // Mock Data
  const data = {
    label: "Net Flow",
    value: 6088.79,
  };

  const isPositive = data.value >= 0;

  return (
    <GlassCard className="p-6">
      <h3 className="text-gray-400 font-medium text-sm mb-1">{data.label}</h3>
      <span className={`text-3xl font-bold tracking-tight ${
        isPositive ? "text-emerald-400" : "text-rose-400"
      }`}>
        {isPositive ? "+" : ""}${data.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    </GlassCard>
  );
}