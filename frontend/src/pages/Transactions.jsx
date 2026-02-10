import { useState } from 'react';

import Header from '../components/Header';
import TransactionTable from '../components/TransactionTable';
import TransactionToolbar from '../components/transactions/TransactionToolbar';
import AddTransactionModal from '../components/transactions/AddTransactionModal';
import TotalIncomeCard from '../components/transactions/TotalIncomeCard';
import TotalExpensesCard from '../components/transactions/TotalExpensesCard';
import NetFlowCard from '../components/transactions/NetFlowCard';

export default function Transactions({ toggleSidebar }) {
const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="flex flex-col w-full min-h-screen bg-[#0B0E14]">
            
            {/* Header - Sticky at top, no padding */}
            <div className="sticky top-0 z-10 bg-[#0B0E14]">
                <Header title="Transactions" toggleSidebar={toggleSidebar} />
            </div>

            {/* Main Content with padding on all sides */}
            <div className="p-8">

                {/* 2. Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <TotalIncomeCard />
                    <TotalExpensesCard />
                    <NetFlowCard />
                </div>

                {/* 3. The Toolbar (Search + Add Button) */}
                <div className="mb-6">
                    <TransactionToolbar onAddClick={() => setIsModalOpen(true)} />
                </div>

                {/* 4. The Data Table */}
                <div className="w-full">
                    <TransactionTable showFilters={false} title="All Transactions" />
                </div>

            </div>

            {/* 5. The Pop-up Modal */}
            <AddTransactionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />

        </div>
    );
}