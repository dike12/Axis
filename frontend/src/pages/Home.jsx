import React from "react";
import { Plus } from 'lucide-react';

import Header from '../components/Header';
import NetWorthCard from '../components/dashboard/NetWorthCard';
import SavingsCard from '../components/dashboard/SavingsCard';
import SpendCard from '../components/dashboard/SpendCard';
import RunwayCard from '../components/dashboard/RunwayCard';
import FIProgressCard from '../components/dashboard/FIProgressCard';
import DebtLoadCard from '../components/dashboard/DebtLoadCard';
import NetWorthChart from '../components/dashboard/NetWorthChart';
import AssetAllocationChart from '../components/dashboard/AssetAllocationChart';
import TransactionTable from '../components/TransactionTable';

export default function Home({ toggleSidebar }) {
    return (
        <div className="flex flex-col w-full min-h-screen bg-[#0B0E14]"> 
        
            {/* Header - Sticky at top, no padding */}
            <div className="sticky top-0 z-10 bg-[#0B0E14]">
                <Header title="Overview" toggleSidebar={toggleSidebar}>
                    <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
                    <Plus size={20} />
                    Add Transaction
                    </button>
                </Header>
            </div>

            {/* Main Content with padding on all sides */}
            <div className="p-8">
            
                {/* ROW 1: Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <NetWorthCard />
                    <SavingsCard />
                    <SpendCard />
                </div>

                {/* ROW 2: Financial Health Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <RunwayCard />
                    <FIProgressCard />
                    <DebtLoadCard />
                </div>

                {/* ROW 3: Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    
                    {/* Left: Net Worth History (Takes up 2 columns) */}
                    <div className="lg:col-span-2">
                    <NetWorthChart />
                    </div>

                    {/* Right: Asset Allocation (Takes up 1 column) */}
                    <div className="h-full">
                    <AssetAllocationChart />
                    </div>

                </div>

                {/* ROW 4: Recent Transactions (Full Width) */}
                <div className="w-full">
                    <TransactionTable limit={5} title="Recent Transactions" />
                </div>
            </div>
        </div>
    );
}