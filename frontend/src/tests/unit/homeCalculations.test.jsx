// src/tests/unit/homeCalculations.test.jsx
/**
 * Home.jsx — KPI Calculation Tests
 * ==================================
 * The three KPI cards derive their values from inline expressions:
 *
 *   totalHoldings = holdings.reduce((sum, h) => sum + h.value, 0)
 *   totalIncome   = transactions.filter(type=credit).reduce(sum + amount, 0)
 *   totalExpenses = transactions.filter(type=debit).reduce(sum + |amount|, 0)
 *
 *   Net Worth    = totalHoldings + (totalIncome − totalExpenses)
 *   Savings Rate = (totalIncome > 0) ? ((totalIncome − totalExpenses) / totalIncome * 100).toFixed(1) : 0
 *   Monthly Spend = totalExpenses
 *
 * All sub-components are mocked so the tests exclusively exercise the formulas.
 */

import { render, screen } from '@testing-library/react';

vi.mock('@/context/FinanceContext', () => ({ useFinance: vi.fn() }));
vi.mock('@/components/Header',     () => ({ default: () => <div data-testid="header" /> }));

// Mock all dashboard sub-components — tests only care about KPICard values
vi.mock('@/components/dashboard/KPICard', () => ({
  default: ({ title, value, children }) => (
    <div data-testid="kpi-card" data-title={title}>
      <span data-testid="kpi-value">{value}</span>
      {children}
    </div>
  ),
}));
vi.mock('@/components/dashboard/SavingsRateToggle',   () => ({ default: () => null }));
vi.mock('@/components/dashboard/SurvivalFreedomRow',  () => ({ default: () => null }));
vi.mock('@/components/dashboard/NetWorthChart',       () => ({ default: () => null }));
vi.mock('@/components/dashboard/AssetAllocationChart',() => ({ default: () => null }));
vi.mock('@/components/dashboard/TransactionTable',    () => ({ default: () => null }));

import Home from '@/pages/Home';
import { useFinance } from '@/context/FinanceContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function setupContext({ transactions = [], holdings = [] } = {}) {
  vi.mocked(useFinance).mockReturnValue({ transactions, holdings, loading: false });
  render(<Home toggleSidebar={vi.fn()} />);
}

function getKpiValue(title) {
  const cards = screen.getAllByTestId('kpi-card');
  const card  = cards.find(c => c.dataset.title === title);
  if (!card) throw new Error(`KPI card "${title}" not found`);
  return card.querySelector('[data-testid="kpi-value"]').textContent;
}

// ── Canonical test fixtures ───────────────────────────────────────────────────
//   Income:   $5,000   (one credit transaction)
//   Expenses: $1,200 + $800 = $2,000   (two debit transactions)
//   Holdings: $10,000  (one holding)
//
//   Net Worth    = 10,000 + (5,000 − 2,000) = $13,000
//   Savings Rate = (5,000 − 2,000) / 5,000 × 100 = 60.0%
//   Monthly Spend = $2,000

const STANDARD_TRANSACTIONS = [
  { id: '1', type: 'credit', amount: 5000 },
  { id: '2', type: 'debit',  amount: 1200 },
  { id: '3', type: 'debit',  amount:  800 },
];
const STANDARD_HOLDINGS = [{ value: 10_000 }];

// ═══════════════════════════════════════════════════════════════════════════════
describe('Net Worth KPI', () => {
  it('calculates Net Worth = totalHoldings + (totalIncome − totalExpenses)', () => {
    setupContext({ transactions: STANDARD_TRANSACTIONS, holdings: STANDARD_HOLDINGS });
    expect(getKpiValue('Net Worth')).toBe('$13,000');
  });

  it('equals totalHoldings when there are no transactions', () => {
    setupContext({ holdings: [{ value: 50_000 }] });
    expect(getKpiValue('Net Worth')).toBe('$50,000');
  });

  it('is negative when expenses exceed income + holdings', () => {
    setupContext({
      transactions: [
        { id: '1', type: 'debit', amount: 5000 },
      ],
      holdings: [{ value: 1000 }],
    });
    // Net Worth = 1000 + (0 − 5000) = −4000
    expect(getKpiValue('Net Worth')).toContain('-');
  });

  it('counts ALL holdings in the total, not just the first one', () => {
    setupContext({ holdings: [{ value: 3000 }, { value: 7000 }] });
    // 3000 + 7000 = 10000, no transactions
    expect(getKpiValue('Net Worth')).toBe('$10,000');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Savings Rate KPI', () => {
  it('calculates Savings Rate = (income − expenses) / income × 100', () => {
    setupContext({ transactions: STANDARD_TRANSACTIONS, holdings: STANDARD_HOLDINGS });
    expect(getKpiValue('Savings Rate')).toBe('60.0%');
  });

  it('returns 0 when there is no income (guards against division-by-zero)', () => {
    setupContext({
      transactions: [{ id: '1', type: 'debit', amount: 500 }],
    });
    expect(getKpiValue('Savings Rate')).toBe('0%');
  });

  it('returns 100.0% when income equals zero expenses', () => {
    setupContext({
      transactions: [{ id: '1', type: 'credit', amount: 1000 }],
    });
    expect(getKpiValue('Savings Rate')).toBe('100.0%');
  });

  it('returns 0% when expenses match income exactly', () => {
    setupContext({
      transactions: [
        { id: '1', type: 'credit', amount: 1000 },
        { id: '2', type: 'debit',  amount: 1000 },
      ],
    });
    expect(getKpiValue('Savings Rate')).toBe('0.0%');
  });

  it('includes one decimal place even for whole-number results', () => {
    setupContext({
      transactions: [
        { id: '1', type: 'credit', amount: 1000 },
        { id: '2', type: 'debit',  amount:  500 },
      ],
    });
    // (500/1000)*100 = 50.0
    expect(getKpiValue('Savings Rate')).toBe('50.0%');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Monthly Spend KPI', () => {
  it('sums only debit transactions', () => {
    setupContext({ transactions: STANDARD_TRANSACTIONS, holdings: STANDARD_HOLDINGS });
    expect(getKpiValue('Monthly Spend')).toBe('$2,000');
  });

  it('ignores credit transactions entirely', () => {
    setupContext({
      transactions: [{ id: '1', type: 'credit', amount: 9999 }],
    });
    expect(getKpiValue('Monthly Spend')).toBe('$0');
  });

  it('uses Math.abs so negative-amount debits are counted correctly', () => {
    setupContext({
      transactions: [
        { id: '1', type: 'debit', amount: -300 },  // stored as negative in some flows
        { id: '2', type: 'debit', amount:  200 },
      ],
    });
    // Math.abs(-300) + 200 = 500
    expect(getKpiValue('Monthly Spend')).toBe('$500');
  });

  it('is $0 with an empty transactions list', () => {
    setupContext();
    expect(getKpiValue('Monthly Spend')).toBe('$0');
  });
});
