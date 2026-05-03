import React, { useState } from "react";
import { Search, Filter, Download, Upload, Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import Header from "../components/Header";
import AddTransactionModal from "../components/transactions/AddTransactionModal";
import CSVImportModal from "../components/transactions/CSVImportModal";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

const CATEGORY_COLORS = {
  Income:        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  Shopping:      "bg-purple-500/20  text-purple-400  border border-purple-500/30",
  Food:          "bg-orange-500/20  text-orange-400  border border-orange-500/30",
  Investment:    "bg-blue-500/20    text-blue-400    border border-blue-500/30",
  Utilities:     "bg-yellow-500/20  text-yellow-400  border border-yellow-500/30",
  Entertainment: "bg-pink-500/20    text-pink-400    border border-pink-500/30",
  Transport:     "bg-cyan-500/20    text-cyan-400    border border-cyan-500/30",
  Health:        "bg-red-500/20     text-red-400     border border-red-500/30",
};

const SPENDING_INSIGHTS = [
  { emoji: "🍔", text: "Food up 42% vs last month",          status: "warning"  },
  { emoji: "🎬", text: "Entertainment within budget",         status: "positive" },
  { emoji: "🛒", text: "Shopping highest month in 3 months", status: "negative" },
  { emoji: "⚡", text: "Utilities down 12%",                 status: "positive" },
  { emoji: "🚗", text: "Transport near budget limit",         status: "warning"  },
];

const INSIGHT_STYLES = {
  positive: "text-emerald-400 border-emerald-500/20",
  warning:  "text-amber-400  border-amber-500/20",
  negative: "text-rose-400   border-rose-500/20",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (str) =>
  new Date(str).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/** Reusable overlay backdrop + centered card */
function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#11141B] border border-gray-800 rounded-xl shadow-2xl w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

/** Edit Transaction Modal */
function EditModal({ transaction, onSave, onClose }) {
  const [details, setDetails] = useState(transaction.details);
  const [amount, setAmount] = useState(String(Math.abs(transaction.amount)));
  const [date, setDate] = useState(transaction.date);

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    onSave(transaction.id, details, amt, date);
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-white">Edit Transaction</h2>
          <p className="text-xs text-gray-400 mt-0.5">Update the transaction details.</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-gray-700 bg-[#0B0E14] text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Details</label>
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-gray-700 bg-[#0B0E14] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-gray-700 bg-[#0B0E14] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 bg-[#0B0E14]/40 rounded-b-xl">
        <button onClick={onClose} className="px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Cancel</button>
        <button onClick={handleSave} className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">Save Changes</button>
      </div>
    </Modal>
  );
}

/** Delete Confirmation Modal */
function DeleteModal({ onConfirm, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center">
          <Trash2 className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Delete Transaction?</h2>
          <p className="text-sm text-gray-400 mt-1">
            This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-md text-sm text-gray-300 border border-gray-700 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-md text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Transactions({ toggleSidebar }) {
  // Pull transactions and mutators from global context
  const { transactions, addTransaction, editTransaction, deleteTransaction, loading } = useFinance();  
  
  const [page,         setPage]         = useState(0);
  const [search,       setSearch]       = useState("");
  const [filterCat,    setFilterCat]    = useState("all");
  const [filterType,   setFilterType]   = useState("all");

  // Modal state
  const [editingTxn,  setEditingTxn]  = useState(null);
  const [deletingId,  setDeletingId]  = useState(null);

  // ── Derived data ──
  const filtered = transactions.filter((t) => {
    const matchSearch = t.details.toLowerCase().includes(search.toLowerCase()) ||
                        t.category.toLowerCase().includes(search.toLowerCase());
    const matchCat    = filterCat  === "all" || t.category.toLowerCase() === filterCat;
    const matchType   = filterType === "all" || t.type === filterType;
    return matchSearch && matchCat && matchType;
  });

  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showingFrom  = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo    = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  const totalIncome   = transactions.filter(t => t.type === "credit").reduce((s, t) =>  s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "debit" ).reduce((s, t) =>  s + Math.abs(t.amount), 0);
  const netFlow       = totalIncome - totalExpenses;

  // ── Handlers ──
  const handleEditSave = (id, details, amt, newDate) => { // Added newDate
      editTransaction(id, details, amt, newDate); // Pass it to Context
      setEditingTxn(null);
  };
  
  const handleDelete = (id) => {
    deleteTransaction(id); // Using global function
    setDeletingId(null);
  };

  // Reset to page 0 when filters change
  const handleSearch   = (v) => { setSearch(v);    setPage(0); };
  const handleCatFilter  = (v) => { setFilterCat(v);  setPage(0); };
  const handleTypeFilter = (v) => { setFilterType(v); setPage(0); };

  // ── Shared input/select style ──
  const inputCls = "h-10 px-3 rounded-md border border-gray-700 bg-[#11141B] text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none";

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] text-white">

      {/* ── Page Header ── */}
      <div className="sticky top-0 z-20 bg-[#0B0E14]">
        <Header title="Transactions" toggleSidebar={toggleSidebar}>
          {/* This injects the fully functional modal into the right side of the Header */}
          <AddTransactionModal />
        </Header>
      
      </div>

      <div className="p-8 space-y-6">

        {/* ── ROW 1: Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Income",   value: `+$${fmt(totalIncome)}`,   color: "text-emerald-400" },
            { label: "Total Expenses", value: `-$${fmt(totalExpenses)}`,  color: "text-rose-400"    },
            { label: "Net Flow",       value: `${netFlow >= 0 ? "+" : "-"}$${fmt(netFlow)}`, color: netFlow >= 0 ? "text-emerald-400" : "text-rose-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#11141B] border border-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-400 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-2 font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── ROW 2: Spending Insights Banner ── */}
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {SPENDING_INSIGHTS.map((ins, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-4 py-2 rounded-full bg-[#11141B] border whitespace-nowrap text-sm shrink-0 ${INSIGHT_STYLES[ins.status]}`}
            >
              <span>{ins.emoji}</span>
              <span className="font-medium text-white">{ins.text}</span>
            </div>
          ))}
        </div>

        {/* ── ROW 3: Toolbar ── */}
        <div className="bg-[#11141B] border border-gray-800 rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-center">

            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              <input
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className={`${inputCls} w-full pl-9`}
              />
            </div>

            {/* Category filter */}
            <select
              value={filterCat}
              onChange={(e) => handleCatFilter(e.target.value)}
              className={`${inputCls} w-full md:w-[180px]`}
            >
              <option value="all">All Categories</option>
              <option value="income">Income</option>
              <option value="shopping">Shopping</option>
              <option value="food">Food</option>
              <option value="investment">Investment</option>
              <option value="utilities">Utilities</option>
              <option value="entertainment">Entertainment</option>
              <option value="transport">Transport</option>
              <option value="health">Health</option>
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => handleTypeFilter(e.target.value)}
              className={`${inputCls} w-full md:w-[150px]`}
            >
              <option value="all">All Types</option>
              <option value="credit">Income</option>
              <option value="debit">Expense</option>
            </select>

            {/* More Filters */}
            <button className="flex items-center gap-2 h-10 px-4 rounded-md border border-gray-700 bg-[#11141B] text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
              <Filter className="h-4 w-4" />
              More Filters
            </button>

            {/* Import */}
            <CSVImportModal
              existingTransactions={transactions}
              onImport={(txns) => txns.forEach(t => addTransaction(t))}
            />

            {/* Export */}
            <button className="flex items-center gap-2 h-10 px-4 rounded-md border border-gray-700 bg-[#11141B] text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
              <Download className="h-4 w-4" />
              Export
            </button>

          </div>
        </div>

        {/* ── ROW 4: Table ── */}
        <div className="bg-[#11141B] border border-gray-800 rounded-xl overflow-hidden">

          {/* Table header */}
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-base font-semibold text-white">All Transactions</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16 text-gray-400 text-sm">
              Loading transactions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-gray-400 text-sm">No transactions found.</p>
              <AddTransactionModal /> 
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-800 bg-[#0F1218]">
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">Category</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">Details</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-right whitespace-nowrap">Amount</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-right w-[90px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((txn, i) => (
                      <tr
                        key={txn.id}
                        className={`group border-b border-gray-800/50 hover:bg-[#1A1F26]/60 transition-colors ${i === paginated.length - 1 ? "border-b-0" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                          {fmtDate(txn.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[txn.category] || "bg-gray-800 text-gray-300 border border-gray-700"}`}>
                            {txn.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white font-medium max-w-[220px] truncate">
                          {txn.details}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono font-semibold whitespace-nowrap ${txn.type === "credit" ? "text-emerald-400" : "text-rose-400"}`}>
                          {txn.type === "credit" ? "+" : "-"}${fmt(txn.amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingTxn(txn)}
                              className="p-1.5 rounded-md text-gray-600 hover:text-white hover:bg-gray-800 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(txn.id)}
                              className="p-1.5 rounded-md text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-[#0F1218]">
                <p className="text-sm text-gray-400">
                  Showing{" "}
                  <span className="text-white font-medium">{showingFrom}</span>
                  {" – "}
                  <span className="text-white font-medium">{showingTo}</span>
                  {" of "}
                  <span className="text-white font-medium">{filtered.length}</span>
                  {" transactions"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="flex items-center gap-1 h-8 px-3 rounded-md border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-1 h-8 px-3 rounded-md border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── MODALS ── */}
      {editingTxn && (
        <EditModal
          transaction={editingTxn}
          onSave={handleEditSave}
          onClose={() => setEditingTxn(null)}
        />
      )}

      {deletingId && (
        <DeleteModal
          onConfirm={() => handleDelete(deletingId)}
          onClose={() => setDeletingId(null)}
        />
      )}

    </div>
  );
}