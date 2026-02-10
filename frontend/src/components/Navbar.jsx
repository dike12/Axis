import { LayoutDashboard, Wallet, ArrowUpDown, TrendingUp, Settings, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom'

export default function Navbar({ isOpen }) {
    const navItems = [
    { path: "/", label: "Overview", icon: LayoutDashboard },
    { path: "/budget", label: "Budget Planner", icon: Wallet },
    { path: "/transactions", label: "Transactions", icon: ArrowUpDown },
    { path: "/investments", label: "Investments", icon: TrendingUp },
  ];

  // Helper function to handle the active/inactive styling logic
  const getLinkClass = ({ isActive }) => {
    const baseClass = "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium";
    const activeClass = "bg-[#1A1F26] text-white"; // Active state (lighter bg)
    const inactiveClass = "text-gray-400 hover:bg-[#11141B] hover:text-white"; // Inactive state
    
    return `${baseClass} ${isActive ? activeClass : inactiveClass}`;
  };

  return (
    <aside 
      className={`
        fixed left-0 top-0 h-screen bg-[#0B0E14] border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out z-50
        ${isOpen ? 'w-64' : 'w-20'}
      `}
    >
      
      {/* --- LOGO SECTION --- */}
      <div className={`flex items-center gap-3 p-6 ${!isOpen && 'justify-center p-4'}`}>
        {/* Logo stays constant or grows slightly */}
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <span className={`text-white text-xl font-bold tracking-wide transition-opacity duration-300 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
          Axis
        </span>
      </div>

      {/* --- MAIN NAVIGATION --- */}
      <nav className="flex flex-col gap-2 px-4 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center transition-all duration-300 font-medium rounded-lg
              ${isOpen ? "gap-3 px-3 py-3" : "justify-center p-3"} // Square shape when closed
              ${isActive ? "bg-[#1A1F26] text-white" : "text-gray-400 hover:bg-[#11141B] hover:text-white"}
            `}
          >
            {/* DYNAMIC ICON SIZE: 20px when open, 24px when closed */}
            <item.icon 
              size={isOpen ? 20 : 24} 
              strokeWidth={2} 
              className="transition-all duration-300"
            />
            
            <span className={`whitespace-nowrap transition-all duration-300 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* --- BOTTOM SECTION --- */}
      <div className="mt-auto p-4 border-t border-gray-800 flex flex-col gap-2">
        <NavLink to="/settings" className={({ isActive }) => `
            flex items-center transition-all duration-300 font-medium rounded-lg
            ${isOpen ? "gap-3 px-3 py-3" : "justify-center p-3"}
            ${isActive ? "bg-[#1A1F26] text-white" : "text-gray-400 hover:bg-[#11141B] hover:text-white"}
        `}>
          <Settings size={isOpen ? 20 : 24} />
          <span className={`whitespace-nowrap transition-all duration-300 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            Settings
          </span>
        </NavLink>

        <button className={`
            flex items-center transition-all duration-300 font-medium rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/10 w-full text-left
            ${isOpen ? "gap-3 px-3 py-3" : "justify-center p-3"}
        `}>
          <LogOut size={isOpen ? 20 : 24} />
          <span className={`whitespace-nowrap transition-all duration-300 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            Log Out
          </span>
        </button>
      </div>
    </aside>
  );
}