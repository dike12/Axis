import * as React from "react";

function Badge({ className = "", variant = "default", ...props }) {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0B0E14]";

  const variants = {
    default: "border-transparent bg-emerald-500 text-white hover:bg-emerald-600",
    secondary: "border-transparent bg-[#1A1F26] text-gray-200 hover:bg-[#222831]",
    destructive: "border-transparent bg-rose-500 text-white hover:bg-rose-600",
    outline: "border-gray-700 text-gray-300",
  };

  const combinedClasses = `${baseStyles} ${variants[variant] || variants.default} ${className}`;

  return <div className={combinedClasses} {...props} />;
}

export { Badge };