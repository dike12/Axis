import * as React from 'react';
import { Routes, Route} from 'react-router-dom'
import { useState } from 'react';

import Navbar from './components/Navbar';
import Header from './components/Header';

import Home from './pages/Home';
import BudgetPlanner from './pages/Planner'
import Transactions from './pages/Transactions';
import Analysis from './pages/Analysis';
import Investments from './pages/Investments';
import Strategist from './pages/Strategist'
import Settings from './pages/Settings'


export default function App() {
  // 1. Define the State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 2. Define the Toggle Function
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex bg-[#0B0E14] min-h-screen text-white font-sans">
      
      {/* 3. Pass state to Navbar so it knows when to shrink */}
      <Navbar isOpen={isSidebarOpen} />

      {/* 4. Adjust margin dynamically based on state */}
      <main 
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-20' // ml-20 leaves space for the mini-sidebar
        }`}
      >
        <Routes>
          {/* 5. Pass toggle function to Home (so it can give it to Header) */}
          <Route path="/" element={<Home toggleSidebar={toggleSidebar} />} />
          
          <Route path="/budget" element={<BudgetPlanner toggleSidebar={toggleSidebar} />} />
          <Route path="/transactions" element={<Transactions toggleSidebar={ toggleSidebar} />} />
          <Route path="/investments" element={<Investments toggleSidebar={ toggleSidebar} />} />
          <Route path="/settings" element={<Settings toggleSidebar={ toggleSidebar} />} />
          <Route path="/analysis" element={<Analysis toggleSidebar={toggleSidebar}/>} />
          <Route path="/strategist" element={<Strategist toggleSidebar={toggleSidebar}/>} /> 
        </Routes>
      </main>
    </div>
  )
}


