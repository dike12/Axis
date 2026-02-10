import * as React from 'react';
import { Routes, Route} from 'react-router-dom'
import { useState } from 'react';

import Navbar from './components/Navbar';
import Header from './components/Header';

import Home from './pages/Home';
import Transactions from './pages/Transactions';



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
          
          <Route path="/budget" element={<h1 className="p-8">Budget Page Coming Soon</h1>} />
          <Route path="/transactions" element={<Transactions toggleSidebar={ toggleSidebar} />} />
          <Route path="/investments" element={<h1 className="p-8">Investments Page Coming Soon</h1>} />
          <Route path="/settings" element={<h1 className="p-8">Settings Page Coming Soon</h1>} />
        </Routes>
      </main>
    </div>
  )
}


