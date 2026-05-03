import React, { useState, useRef, useCallback } from "react";
import { Upload, FileUp, AlertTriangle, X } from "lucide-react";
import { cn } from "../../lib/utils";

const SUPPORTED_BANKS = ["TD Bank", "RBC", "Scotiabank", "CIBC", "BMO", "Chase", "Generic CSV"];

const CATEGORY_KEYWORDS = {
  "Food": ["walmart", "whole foods", "loblaws", "grocery", "food", "restaurant", "dinner", "lunch", "coffee", "trader joe"],
  "Subscriptions": ["netflix", "spotify", "disney", "hulu", "apple.com/bill", "streaming"],
  "Transport": ["shell", "esso", "gas", "uber", "lyft", "transit", "parking"],
  "Utilities": ["hydro", "electric", "internet", "water", "gas bill", "phone"],
  "Income": ["salary", "payroll", "direct deposit", "dividend", "freelance", "bonus"],
  "Shopping": ["amazon", "apple.com", "target", "best buy", "electronics"],
  "Entertainment": ["movie", "concert", "ticket", "game"],
  "Health": ["pharmacy", "doctor", "gym", "health"],
};

function autoCategory(description) {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return "Uncategorized";
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  return lines.map(line => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += char;
    }
    result.push(current.trim());
    return result;
  });
}

const ALL_CATEGORIES = ["Food", "Shopping", "Transport", "Utilities", "Entertainment", "Health", "Subscriptions", "Income", "Investment", "Uncategorized"];

export default function CSVImportModal({ existingTransactions = [], onImport }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  
  const [dateCol, setDateCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [amountCol, setAmountCol] = useState("");
  const [typeCol, setTypeCol] = useState("auto");
  
  const [flipSigns, setFlipSigns] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setStep(1); setCsvData([]); setHeaders([]); setDateCol(""); setDescCol(""); 
    setAmountCol(""); setTypeCol("auto"); setFlipSigns(false); setSkipDuplicates(true); setParsedTransactions([]);
  };

  const handleClose = () => { setOpen(false); reset(); };

  const handleFile = useCallback((file) => {
    if (!file.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      const rows = parseCSV(text);
      if (rows.length < 2) return;
      
      setHeaders(rows[0]);
      setCsvData(rows.slice(1));
      
      const h = rows[0].map(c => c.toLowerCase());
      setDateCol(rows[0][h.findIndex(c => c.includes("date"))] || "");
      setDescCol(rows[0][h.findIndex(c => c.includes("desc") || c.includes("memo") || c.includes("narr"))] || "");
      setAmountCol(rows[0][h.findIndex(c => c.includes("amount") || c.includes("sum"))] || "");
      const typeIdx = h.findIndex(c => c.includes("type") || c.includes("dr/cr"));
      setTypeCol(typeIdx >= 0 ? rows[0][typeIdx] : "auto");
      
      setStep(2);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const processTransactions = () => {
    const dateIdx = headers.indexOf(dateCol);
    const descIdx = headers.indexOf(descCol);
    const amountIdx = headers.indexOf(amountCol);

    const txns = csvData
      .filter(row => row.length > Math.max(dateIdx, descIdx, amountIdx))
      .map(row => {
        let amt = parseFloat(row[amountIdx]?.replace(/[^0-9.\-]/g, "") || "0");
        if (flipSigns) amt = -amt;
        const isCredit = amt > 0;
        const desc = row[descIdx] || "";
        const cat = autoCategory(desc);

        const txn = {
          date: normalizeDate(row[dateIdx] || ""),  
          details: desc,                             
          amount: Math.abs(amt),
          type: isCredit ? "credit" : "debit",
          category: cat === "Income" || isCredit ? "Income" : cat,
        };

        txn.isDuplicate = existingTransactions.some(
          ex.details.toLowerCase() === txn.details.toLowerCase()
        );
        return txn;
      }).filter(t => t.amount > 0);

    setParsedTransactions(txns);
    setStep(3);
  };

  const handleImport = () => {
    const toImport = skipDuplicates ? parsedTransactions.filter(t => !t.isDuplicate) : parsedTransactions;
    if (onImport) onImport(toImport);
    alert(`Success: ${toImport.length} transactions imported successfully!`);
    handleClose();
  };

  const incomeCount = parsedTransactions.filter(t => t.type === "credit").length;
  const expenseCount = parsedTransactions.filter(t => t.type === "debit").length;
  const uncatCount = parsedTransactions.filter(t => t.category === "Uncategorized").length;
  const dupCount = parsedTransactions.filter(t => t.isDuplicate).length;
  const importCount = skipDuplicates ? parsedTransactions.filter(t => !t.isDuplicate).length : parsedTransactions.length;

  const selectCls = "w-full h-9 px-3 rounded-md border border-gray-700 bg-[#1A1F26] text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none";

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-10 px-4 rounded-md border border-gray-700 bg-[#11141B] text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
      >
        <FileUp className="h-4 w-4" />
        Import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#11141B] border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">Import Transactions from CSV</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {step === 1 && "Upload your bank statement CSV file"}
                  {step === 2 && "Map the columns from your CSV"}
                  {step === 3 && "Review and confirm import"}
                </p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map(s => (
                  <div key={s} className={cn("flex-1 h-1.5 rounded-full transition-colors", s <= step ? "bg-emerald-500" : "bg-[#1A1F26]")} />
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-6">
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
                      dragOver ? "border-emerald-500 bg-emerald-500/10" : "border-gray-700 bg-[#1A1F26]/50 hover:bg-[#1A1F26]"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-200">Drop your bank statement CSV here or click to browse</p>
                    <p className="text-xs text-gray-500 mt-1">.csv files only</p>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-medium">Supported Banks</p>
                    <div className="flex flex-wrap gap-2">
                      {SUPPORTED_BANKS.map(bank => (
                        <span key={bank} className="px-2 py-1 text-xs rounded-md border border-gray-700 text-gray-300">{bank}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date Column</label>
                      <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className={selectCls}>
                        <option value="" disabled>Select column</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Description Column</label>
                      <select value={descCol} onChange={(e) => setDescCol(e.target.value)} className={selectCls}>
                        <option value="" disabled>Select column</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Amount Column</label>
                      <select value={amountCol} onChange={(e) => setAmountCol(e.target.value)} className={selectCls}>
                        <option value="" disabled>Select column</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Type Column (optional)</label>
                      <select value={typeCol} onChange={(e) => setTypeCol(e.target.value)} className={selectCls}>
                        <option value="auto">Auto-detect</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="bg-[#1A1F26] p-4 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 mb-3">
                      For most banks, amounts are negative for expenses and positive for income. Toggle below if your bank uses the opposite convention.
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={flipSigns} onChange={(e) => setFlipSigns(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${flipSigns ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${flipSigns ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="text-sm text-white">Flip amount signs</span>
                    </label>
                  </div>

                  <div className="rounded-lg border border-gray-800 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#1A1F26] text-gray-400">
                        <tr>{headers.map(h => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i}>{row.map((cell, j) => <td key={j} className="px-4 py-2 text-gray-300 whitespace-nowrap">{cell}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                    <button onClick={() => setStep(1)} className="px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Back</button>
                    <button disabled={!dateCol || !descCol || !amountCol} onClick={processTransactions} className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors">Continue</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-2.5 py-1 rounded-md border border-gray-700 text-gray-300 bg-[#1A1F26]">{parsedTransactions.length} found</span>
                    <span className="px-2.5 py-1 rounded-md border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">{incomeCount} income</span>
                    <span className="px-2.5 py-1 rounded-md border border-rose-500/30 text-rose-400 bg-rose-500/10">{expenseCount} expenses</span>
                    {uncatCount > 0 && <span className="px-2.5 py-1 rounded-md border border-amber-500/30 text-amber-400 bg-amber-500/10">{uncatCount} uncategorized</span>}
                    {dupCount > 0 && <span className="px-2.5 py-1 rounded-md border border-amber-500/30 text-amber-400 bg-amber-500/10 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{dupCount} duplicates</span>}
                  </div>

                  {dupCount > 0 && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${skipDuplicates ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${skipDuplicates ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                      <span className="text-sm text-white">Skip duplicates</span>
                    </label>
                  )}

                  <div className="rounded-lg border border-gray-800 overflow-x-auto max-h-[300px] custom-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#1A1F26] text-gray-400 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 font-medium">Description</th>
                          <th className="px-4 py-2 font-medium">Category</th>
                          <th className="px-4 py-2 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {parsedTransactions.map((txn, i) => (
                          <tr key={i} className={cn(txn.isDuplicate && "opacity-50", txn.category === "Uncategorized" && "border-l-2 border-l-amber-400")}>
                            <td className="px-4 py-2 whitespace-nowrap text-gray-300">{txn.date}</td>
                            <td className="px-4 py-2 max-w-[200px] truncate text-gray-300" title={txn.description}>{txn.description}</td>
                            <td className="px-4 py-1.5">
                              <select
                                value={txn.category}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParsedTransactions(prev => prev.map((t, idx) => idx === i ? { ...t, category: val } : t));
                                }}
                                className="w-full h-8 px-2 rounded bg-[#1A1F26] border border-gray-700 text-xs text-gray-300 focus:border-emerald-500 outline-none"
                              >
                                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className={cn("px-4 py-2 text-right font-mono whitespace-nowrap", txn.type === "credit" ? "text-emerald-400" : "text-rose-400")}>
                              {txn.type === "credit" ? "+" : "-"}${txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              {txn.isDuplicate && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10">DUP</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                    <button onClick={() => setStep(2)} className="px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Back</button>
                    <button onClick={handleClose} className="px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Cancel</button>
                    <button onClick={handleImport} className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                      Import {importCount} Transactions
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}