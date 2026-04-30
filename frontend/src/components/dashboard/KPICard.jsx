import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function KPICard({ title, value, trend, subtitle, children }) {
  return (
    <div className="bg-[#11141B] border border-gray-800 rounded-xl p-6 flex flex-col justify-between hover:bg-[#151921] transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400 font-medium">{title}</p>
        {children} {/* This allows us to pass in the Savings Toggle button */}
      </div>
      
      <div className="mt-4 flex items-end gap-3">
        <p className="text-3xl font-semibold text-white tracking-tight">{value}</p>
        
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm font-medium pb-1 ${
              trend.isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {trend.value}
          </div>
        )}
      </div>
      
      {subtitle && (
        <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
      )}
    </div>
  );
}