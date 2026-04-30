import * as React from "react";

const Button = React.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref) => {
  // Base styles applied to all buttons
  const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50";

  // Variant styles (matching your dark theme)
  const variants = {
    default: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20",
    destructive: "bg-rose-500 text-white hover:bg-rose-600",
    outline: "border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
    secondary: "bg-[#1A1F26] text-white hover:bg-[#222831]",
    ghost: "text-gray-400 hover:text-white hover:bg-[#1A1F26]",
    link: "text-emerald-500 underline-offset-4 hover:underline",
  };

  // Size styles
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  // Combine classes based on props
  const combinedClasses = `${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`;

  return (
    <button ref={ref} className={combinedClasses} {...props} />
  );
});

Button.displayName = "Button";

export { Button };