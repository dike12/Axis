import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import BudgetPlanner from './pages/Planner';
import Transactions from './pages/Transactions';
import Analysis from './pages/Analysis';
import Investments from './pages/Investments';
import Strategist from './pages/Strategist';
import Settings from './pages/Settings';
import Auth from './pages/Auth';  

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  // --- AUTH STATE ---
  const [session, setSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for an existing HTTP-Only cookie on load
  useEffect(() => {
    fetch("http://localhost:3000/api/v1/auth/me", {
      method: "GET",
      credentials: "include" 
    })
      .then(res => {
        if (!res.ok) throw new Error("No session");
        return res.json();
      })
      .then(json => {
        if (json.data) setSession(json.data);
      })
      .catch(() => setSession(null))
      .finally(() => setIsCheckingSession(false));
  }, []);

  // Show a blank/loading screen while checking auth to prevent layout flash
  if (isCheckingSession) {
    return <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center">Loading secure session...</div>;
  }

  return (
    <Routes>
      {/* ── Public Route ── */}
      {/* Pass setSession so the Auth page can log us in without a hard refresh */}
      <Route path="/auth" element={
        session ? <Navigate to="/" replace /> : <Auth setSession={setSession} />
      } />

      {/* ── Protected Routes ── */}
      <Route path="*" element={
        session ? (
          <div className="flex bg-[#0B0E14] min-h-screen text-white font-sans">
            <Navbar isOpen={isSidebarOpen} />
            <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
              <Routes>
                <Route path="/"             element={<Home        toggleSidebar={toggleSidebar} />} />
                <Route path="/budget"       element={<BudgetPlanner toggleSidebar={toggleSidebar} />} />
                <Route path="/transactions" element={<Transactions  toggleSidebar={toggleSidebar} />} />
                <Route path="/investments"  element={<Investments   toggleSidebar={toggleSidebar} />} />
                <Route path="/settings"     element={<Settings      toggleSidebar={toggleSidebar} />} />
                <Route path="/analysis"     element={<Analysis      toggleSidebar={toggleSidebar} />} />
                <Route path="/strategist"   element={<Strategist    toggleSidebar={toggleSidebar} />} />
              </Routes>
            </main>
          </div>
        ) : (
          <Navigate to="/auth" replace />
        )
      } />
    </Routes>
  );
}