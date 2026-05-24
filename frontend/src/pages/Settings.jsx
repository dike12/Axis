import React, { useState } from "react";
import { User, Bell, Shield, Palette, CreditCard, Download, Calculator } from "lucide-react";
import Header from "../components/Header";
import { cn } from "../lib/utils";
import { useFinance } from "../context/FinanceContext";


// --- CUSTOM TOGGLE SWITCH ---
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none",
        checked ? "bg-emerald-500" : "bg-gray-700"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// --- MAIN COMPONENT ---
export default function Settings({ toggleSidebar }) {
  const { settings, updateUserSettings } = useFinance();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [investUpdates, setInvestUpdates] = useState(false);
  const [txnAlerts, setTxnAlerts] = useState(true);
  
  // Common input styling
  const inputCls = "flex h-10 w-full rounded-md border border-gray-700 bg-[#0B0E14] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors";
  const selectCls = "flex h-10 w-full rounded-md border border-gray-700 bg-[#0B0E14] px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none";
  const btnOutlineCls = "h-9 px-4 rounded-md border border-gray-700 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors";

  if (!settings) {
    return (
      <div className="flex flex-col w-full min-h-screen bg-[#0B0E14]">
        <Header title="Settings" toggleSidebar={toggleSidebar} />
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] font-sans">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0B0E14]">
        <Header title="Settings" toggleSidebar={toggleSidebar} />
      </div>

      {/* Main Content */}
      <div className="p-8 overflow-y-auto">
        <div className="max-w-4xl space-y-6">
          
          {/* --- PROFILE SETTINGS --- */}
          <div className="bg-[#11141B] border border-gray-800/80 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <User className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Profile</h2>
                <p className="text-sm text-gray-400">Manage your personal information</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">First Name</label>
                  <input defaultValue="John" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Last Name</label>
                  <input defaultValue="Doe" className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Email</label>
                <input type="email" defaultValue="john.doe@example.com" className={inputCls} />
              </div>
              <button className="h-9 px-4 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">
                Save Changes
              </button>
            </div>
          </div>

          {/* --- NOTIFICATIONS --- */}
          <div className="bg-[#11141B] border border-gray-800/80 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <Bell className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Notifications</h2>
                <p className="text-sm text-gray-400">Configure how you receive updates</p>
              </div>
            </div>
            <div className="p-6 space-y-0 divide-y divide-gray-800/50">
              <div className="flex items-center justify-between pb-5">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Email Notifications</p>
                  <p className="text-xs text-gray-500 mt-0.5">Receive weekly summaries and alerts</p>
                </div>
                <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
              </div>
              <div className="flex items-center justify-between py-5">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Budget Alerts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Get notified when you exceed budget limits</p>
                </div>
                <Toggle checked={budgetAlerts} onChange={setBudgetAlerts} />
              </div>
              <div className="flex items-center justify-between py-5">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Investment Updates</p>
                  <p className="text-xs text-gray-500 mt-0.5">Daily portfolio performance reports</p>
                </div>
                <Toggle checked={investUpdates} onChange={setInvestUpdates} />
              </div>
              <div className="flex items-center justify-between pt-5">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Transaction Alerts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Instant notifications for large transactions</p>
                </div>
                <Toggle checked={txnAlerts} onChange={setTxnAlerts} />
              </div>
            </div>
          </div>

          {/* --- BUDGET LOGIC --- */}
          <div className="bg-[#11141B] border border-gray-800/80 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-indigo-500/10">
                <Calculator className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Budget Logic</h2>
                <p className="text-sm text-gray-400">Configure how income is allocated to budget periods</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-800/50 pb-6">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Shift Late Income</p>
                  <p className="text-xs text-gray-500 mt-0.5">Automatically count late-month income towards the next budget period</p>
                </div>
                <Toggle 
                  checked={settings.shift_late_income} 
                  onChange={(val) => updateUserSettings({ shift_late_income: val })} 
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-200">Cutoff Day</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min={1} max={28} 
                    defaultValue={settings.income_cutoff_day} 
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (val !== settings.income_cutoff_day && val >= 1 && val <= 28) {
                        updateUserSettings({ income_cutoff_day: val });
                      }
                    }}
                    className={cn(inputCls, "w-20 text-center")} 
                  />
                  <span className="text-sm text-gray-500">of each month</span>
                </div>
                <p className="text-xs text-gray-500">Income received on or after this day will automatically count towards the next month's budget. (Saves automatically on blur)</p>
              </div>
            </div>
          </div>

          {/* --- SECURITY --- */}
          <div className="bg-[#11141B] border border-gray-800/80 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Security</h2>
                <p className="text-sm text-gray-400">Protect your account</p>
              </div>
            </div>
            <div className="p-6 space-y-0 divide-y divide-gray-800/50">
              <div className="flex items-center justify-between pb-5">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-500 mt-0.5">Add an extra layer of security</p>
                </div>
                <button className={btnOutlineCls}>Enable</button>
              </div>
              <div className="flex items-center justify-between py-5">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Change Password</p>
                  <p className="text-xs text-gray-500 mt-0.5">Update your account password</p>
                </div>
                <button className={btnOutlineCls}>Update</button>
              </div>
              <div className="flex items-center justify-between pt-5">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Active Sessions</p>
                  <p className="text-xs text-gray-500 mt-0.5">Manage devices logged into your account</p>
                </div>
                <button className={btnOutlineCls}>View All</button>
              </div>
            </div>
          </div>

          {/* --- PREFERENCES --- */}
          <div className="bg-[#11141B] border border-gray-800/80 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-purple-500/10">
                <Palette className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Preferences</h2>
                <p className="text-sm text-gray-400">Customize your experience</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Currency</label>
                  <select 
                    value={settings.currency.toLowerCase()} 
                    onChange={(e) => updateUserSettings({ currency: e.target.value.toUpperCase() })}
                    className={selectCls}
                  >
                    <option value="usd">USD ($)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="cad">CAD ($)</option>
                    <option value="gbp">GBP (£)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400">Date Format</label>
                  <select 
                    value={settings.date_format}
                    onChange={(e) => updateUserSettings({ date_format: e.target.value })}
                    className={selectCls}
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Fiscal Year Start</label>
                <select 
                  value={settings.fiscal_year_start}
                  onChange={(e) => updateUserSettings({ fiscal_year_start: parseInt(e.target.value) })}
                  className={selectCls}
                >
                  <option value={1}>January</option>
                  <option value={4}>April</option>
                  <option value={7}>July</option>
                  <option value={10}>October</option>
                </select>
              </div>
            </div>
          </div>

          {/* --- CONNECTED ACCOUNTS --- */}
          <div className="bg-[#11141B] border border-gray-800/80 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-orange-500/10">
                <CreditCard className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Connected Accounts</h2>
                <p className="text-sm text-gray-400">Link your financial accounts</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#1A1F26]/40 border border-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#117ACA] flex items-center justify-center text-white font-bold text-lg">
                    C
                  </div>
                  <div>
                    <p className="font-medium text-gray-200 text-sm">Chase Bank</p>
                    <p className="text-xs text-gray-500 mt-0.5">****4521 • Connected</p>
                  </div>
                </div>
                <button className="text-sm text-gray-500 hover:text-gray-300 font-medium transition-colors">
                  Disconnect
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-[#1A1F26]/40 border border-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#429C52] flex items-center justify-center text-white font-bold text-lg">
                    F
                  </div>
                  <div>
                    <p className="font-medium text-gray-200 text-sm">Fidelity</p>
                    <p className="text-xs text-gray-500 mt-0.5">Investment Account • Connected</p>
                  </div>
                </div>
                <button className="text-sm text-gray-500 hover:text-gray-300 font-medium transition-colors">
                  Disconnect
                </button>
              </div>

              <button className="w-full h-10 rounded-md border border-dashed border-gray-700 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1A1F26]/50 hover:border-gray-600 transition-colors">
                + Connect New Account
              </button>
            </div>
          </div>

          {/* --- DATA & PRIVACY --- */}
          <div className="bg-[#11141B] border border-gray-800/80 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800/50 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-gray-500/10">
                <Download className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Data & Privacy</h2>
                <p className="text-sm text-gray-400">Manage your data</p>
              </div>
            </div>
            <div className="p-6 space-y-0 divide-y divide-gray-800/50">
              <div className="flex items-center justify-between pb-5">
                <div>
                  <p className="font-medium text-gray-200 text-sm">Export Data</p>
                  <p className="text-xs text-gray-500 mt-0.5">Download all your financial data as CSV</p>
                </div>
                <button className={btnOutlineCls}>Export</button>
              </div>
              <div className="flex items-center justify-between pt-5">
                <div>
                  <p className="font-medium text-rose-400 text-sm">Delete Account</p>
                  <p className="text-xs text-gray-500 mt-0.5">Permanently delete your account and data</p>
                </div>
                <button className="h-9 px-4 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-sm font-medium transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}