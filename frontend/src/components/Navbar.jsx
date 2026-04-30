import { LayoutDashboard, Wallet, ArrowLeftRight, BarChart2, TrendingUp, Brain, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Navbar({ isOpen }) {
  const navItems = [
    { path: "/", label: "Overview", icon: LayoutDashboard },
    { path: "/budget", label: "Budget Planner", icon: Wallet },
    { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    { path: "/analysis", label: "Analysis", icon: BarChart2 },
    { path: "/investments", label: "Investments", icon: TrendingUp },
    { path: "/strategist", label: "Strategist", icon: Brain },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside 
      className={`
        fixed left-0 top-0 h-screen bg-[#0B0E14] border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out z-50
        ${isOpen ? 'w-64' : 'w-20'}
      `}
    >
      
      {/* --- LOGO SECTION --- */}
      <div className={`flex items-center gap-3 p-6 ${!isOpen && 'justify-center p-4'}`}>
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        <span className={`text-white text-lg font-semibold tracking-tight transition-opacity duration-300 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
          Wealth
        </span>
      </div>

      {/* --- MAIN NAVIGATION --- */}
      <nav className="flex flex-col gap-1 px-3 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            // `end` ensures exact matching for the root ("/") path so it doesn't stay highlighted on other pages
            end={item.path === "/"} 
            className={({ isActive }) => `
              flex items-center transition-all duration-200 rounded-lg
              ${isOpen ? "gap-3 px-3 py-2.5" : "justify-center p-3 mb-1"}
              ${isActive 
                ? "bg-[#1A1F26] text-emerald-400" 
                : "text-gray-400 hover:bg-[#11141B] hover:text-gray-200"}
            `}
          >
            <item.icon 
              size={isOpen ? 20 : 24} 
              strokeWidth={2} 
              className="shrink-0 transition-all duration-300"
            />
            
            <span className={`whitespace-nowrap font-medium transition-all duration-300 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}