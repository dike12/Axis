import React, { useState } from "react";

export default function SavingsRateToggle({ onChange }) {
  const [mode, setMode] = useState("active");

  const handleToggle = (newMode) => {
    setMode(newMode);
    if (onChange) onChange(newMode);
  };

  return (
    <div className="flex bg-[#0B0E14] border border-gray-800 rounded-lg p-0.5">
      <button
        onClick={() => handleToggle("active")}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          mode === "active"
            ? "bg-emerald-500 text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Active
      </button>
      <button
        onClick={() => handleToggle("passive")}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          mode === "passive"
            ? "bg-emerald-500 text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Passive
      </button>
    </div>
  );
}