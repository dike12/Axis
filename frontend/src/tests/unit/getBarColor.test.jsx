// src/tests/unit/getBarColor.test.jsx
/**
 * getBarColor / pctColor — Behavioral Engine
 * ============================================
 * getBarColor drives Recharts Bar fill; pctColor drives the visible percentage
 * text badge. Both encode identical threshold logic, so testing pctColor through
 * the DOM exercises all getBarColor branches without needing the function exported.
 *
 * Branches under test (6 total):
 *   Expense  pct > 100       → text-rose-400   (over budget)
 *   Expense  pct 91–100      → text-amber-400  (near limit)
 *   Expense  pct ≤ 90        → text-emerald-400 (healthy)
 *   Savings  pct ≥ 100       → text-emerald-400 (goal met)
 *   Savings  pct 50–99       → text-amber-400  (halfway)
 *   Savings  pct < 50        → text-rose-400   (behind)
 */

import { render, screen } from '@testing-library/react';

// ── Mock ALL heavy/browser-only dependencies before importing the component ───
vi.mock('@/context/FinanceContext', () => ({ useFinance: vi.fn() }));
vi.mock('@/components/Header', () => ({ default: () => <div data-testid="mock-header" /> }));
vi.mock('recharts', () => ({
  BarChart:          ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar:               ({ children }) => <div>{children}</div>,
  Cell:              ({ fill })     => <span data-fill={fill} />,
  XAxis:             ()             => null,
  YAxis:             ()             => null,
  CartesianGrid:     ()             => null,
  Tooltip:           ()             => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart:         ({ children }) => <div>{children}</div>,
  Line:              ()             => null,
}));

import Analysis from '@/pages/Analysis';
import { useFinance } from '@/context/FinanceContext';

// ── Shared context defaults ───────────────────────────────────────────────────
const baseContext = {
  analysisSnapshot: {
    total_spent: 0,
    mom_change_percentage: 0,
    biggest_category:        { name: 'None', amount: 0,          icon: '💰' },
    most_improved_category:  { name: 'None', amount_improved: 0, icon: '📈' },
  },
  analysisTrends:   [],
  analysisInsights: [],
  selectedMonth:    5,
  setSelectedMonth: vi.fn(),
  selectedYear:     2025,
};

function setup(breakdown, budgetCategories) {
  vi.mocked(useFinance).mockReturnValue({
    ...baseContext,
    analysisBreakdown: breakdown,
    budgetCategories,
  });
  render(<Analysis toggleSidebar={vi.fn()} />);
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('getBarColor — expense categories', () => {
  const expenseCategories = [
    { name: 'Groceries', type: 'expense' },
    { name: 'Transport', type: 'expense' },
    { name: 'Coffee',    type: 'expense' },
  ];

  beforeEach(() => {
    setup(
      [
        // Over budget: 450/400 = 112.5% → rose
        { name: 'Groceries', icon: '🛒', actual: 450, budget: 400, percent_used: 112.5, is_fixed: false },
        // Near limit: 190/200 = 95% → amber
        { name: 'Transport', icon: '🚗', actual: 190, budget: 200, percent_used: 95,    is_fixed: false },
        // Healthy: 40/100 = 40% → emerald
        { name: 'Coffee',    icon: '☕', actual: 40,  budget: 100, percent_used: 40,    is_fixed: false },
      ],
      expenseCategories,
    );
  });

  it('marks an over-budget expense with rose text (pct > 100)', () => {
    // Math.round(112.5) = 113
    expect(screen.getByText('113% of budget')).toHaveClass('text-rose-400');
  });

  it('marks a near-limit expense with amber text (90 < pct ≤ 100)', () => {
    expect(screen.getByText('95% of budget')).toHaveClass('text-amber-400');
  });

  it('marks a healthy expense with emerald text (pct ≤ 90)', () => {
    expect(screen.getByText('40% of budget')).toHaveClass('text-emerald-400');
  });

  it('shows the correct category name alongside its badge', () => {
    // getAllByText avoids throwing when the name appears in multiple elements
    // (e.g. the category label span AND a helper paragraph in Analysis.jsx)
    expect(screen.getAllByText(/Groceries/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Transport/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Coffee/).length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('getBarColor — savings categories', () => {
  const savingsCategories = [
    { name: 'Emergency', type: 'savings' },
    { name: 'Vacation',  type: 'savings' },
    { name: 'Education', type: 'savings' },
  ];

  beforeEach(() => {
    setup(
      [
        // Goal met: 500/500 = 100% → emerald (savings logic: pct >= 100)
        { name: 'Emergency', icon: '🏦', actual: 500, budget: 500, percent_used: 100, is_fixed: false },
        // Halfway: 200/400 = 50% → amber  (savings: pct >= 50)
        { name: 'Vacation',  icon: '✈️', actual: 200, budget: 400, percent_used: 50,  is_fixed: false },
        // Behind: 20/400 = 5% → rose   (savings: pct < 50)
        { name: 'Education', icon: '📚', actual: 20,  budget: 400, percent_used: 5,   is_fixed: false },
      ],
      savingsCategories,
    );
  });

  it('marks a fully-met savings goal with emerald text (pct ≥ 100)', () => {
    expect(screen.getByText('100% of budget')).toHaveClass('text-emerald-400');
  });

  it('marks a halfway-met savings goal with amber text (50 ≤ pct < 100)', () => {
    expect(screen.getByText('50% of budget')).toHaveClass('text-amber-400');
  });

  it('marks a behind savings goal with rose text (pct < 50)', () => {
    expect(screen.getByText('5% of budget')).toHaveClass('text-rose-400');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('getBarColor — edge cases', () => {
  it('hides fixed categories from the indicator list', () => {
    setup(
      [
        { name: 'FixedRent', icon: '🏠', actual: 1500, budget: 1500, percent_used: 100, is_fixed: true },
      ],
      [{ name: 'FixedRent', type: 'expense' }],
    );
    // is_fixed: true → filtered out by variableCategories
    expect(screen.queryByText(/100% of budget/)).not.toBeInTheDocument();
  });

  it('renders no breakdown rows when analysisBreakdown is empty', () => {
    setup([], []);
    expect(screen.queryByText(/% of budget/)).not.toBeInTheDocument();
  });

  it('at exactly 100% expense uses amber (boundary: pct = 100, rule: pct > 100 → rose)', () => {
    setup(
      [{ name: 'Exactly', icon: '📌', actual: 400, budget: 400, percent_used: 100, is_fixed: false }],
      [{ name: 'Exactly', type: 'expense' }],
    );
    // pct = 100, rule is `pct > 100` for rose → 100 is NOT > 100 → falls through to amber check
    // pct > 90 (100 > 90 = true) → amber
    expect(screen.getByText('100% of budget')).toHaveClass('text-amber-400');
  });

  it('expense at exactly 91% is amber, not emerald (boundary at 90)', () => {
    setup(
      [{ name: 'NearEdge', icon: '⚠️', actual: 91, budget: 100, percent_used: 91, is_fixed: false }],
      [{ name: 'NearEdge', type: 'expense' }],
    );
    expect(screen.getByText('91% of budget')).toHaveClass('text-amber-400');
  });
});