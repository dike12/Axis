import { PanelLeft, Plus, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button"; 

export default function Header({ title, children, toggleSidebar }) {
  return (
    // GLASS EFFECT HEADER - No padding, border extends edge to edge
    <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-xl flex items-center justify-between px-8 transition-all duration-300">
      
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar} 
          className="text-gray-400 hover:text-white transition-colors"
        >
          <PanelLeft size={18} />
        </button>

        {/* Name of page */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-medium">{title}</span>
        </div>
      </div>

      {/* The Lovable "Add Transaction" Button Style */}
      {/* If specific children are passed (like on Home), render them, otherwise default to the Add button */}
      {children ? children : (
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      )}
      
    </header>
  )
}