// src/tests/integration/addTransactionModal.test.jsx
/**
 * AddTransactionModal — Integration Tests
 * =========================================
 * Covers:
 *   A  Open / close lifecycle
 *   B  Income shift preview (isShifted + effectiveBudgetMonth memos)
 *   C  Form submission payload mapping
 *   D  Category list population from budgetCategories context
 *
 * The shift preview logic is the most critical path here:
 *   isShifted = SHIFT_LATE_INCOME && type === "income" && date.day >= CUTOFF_DAY
 *   effectiveBudgetMonth = date shifted forward by 1 month when isShifted
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/context/FinanceContext', () => ({ useFinance: vi.fn() }));

import AddTransactionModal from '@/components/transactions/AddTransactionModal';
import { useFinance } from '@/context/FinanceContext';

// ── Default context ───────────────────────────────────────────────────────────
const mockAddTransaction = vi.fn();

function setupContext(overrides = {}) {
  vi.mocked(useFinance).mockReturnValue({
    addTransaction: mockAddTransaction,
    budgetCategories: [
      { id: 'c1', name: 'Salary',   type: 'income'  },
      { id: 'c2', name: 'Food',     type: 'expense' },
      { id: 'c3', name: 'Savings',  type: 'savings' },
    ],
    settings: {
      income_cutoff_day:  20,
      shift_late_income:  true,
    },
    ...overrides,
  });
}

// ── Helper: open the modal ─────────────────────────────────────────────────────
async function openModal(user) {
  await user.click(screen.getByText('Add Transaction'));
}

// ── Helper: set the hidden date input value via fireEvent ──────────────────────
function setDate(value) {
  const dateInput = screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/);
  fireEvent.change(dateInput, { target: { value } });
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('AddTransactionModal — open / close', () => {
  it('is closed by default', () => {
    setupContext();
    render(<AddTransactionModal />);
    expect(screen.queryByText('Add Transaction', { selector: 'h2' })).not.toBeInTheDocument();
  });

  it('opens when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);

    await openModal(user);

    expect(screen.getByRole('heading', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('closes when the × button is clicked', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);

    await openModal(user);
    await user.click(screen.getByRole('button', { name: '' }));  // × icon button

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /add transaction/i })).not.toBeInTheDocument(),
    );
  });

  it('closes when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);

    await openModal(user);
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /add transaction/i })).not.toBeInTheDocument(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('AddTransactionModal — income shift preview', () => {
  it('shows the Shifted badge when income falls on or after cutoff day', async () => {
    const user = userEvent.setup();
    setupContext();  // cutoff = 20, shift_late_income = true
    render(<AddTransactionModal />);
    await openModal(user);

    // Switch to income type
    await user.click(screen.getByRole('button', { name: /income/i }));

    // Set a date where day (22) >= cutoff (20)
    setDate('2025-05-22');

    expect(screen.getByText('➔ Shifted')).toBeInTheDocument();
  });

  it('does NOT show the Shifted badge when income is before the cutoff day', async () => {
    const user = userEvent.setup();
    setupContext();  // cutoff = 20
    render(<AddTransactionModal />);
    await openModal(user);

    await user.click(screen.getByRole('button', { name: /income/i }));

    // Day 10 < cutoff 20 → no shift
    setDate('2025-05-10');

    expect(screen.queryByText('➔ Shifted')).not.toBeInTheDocument();
  });

  it('shows the shifted effective month (next month) in the preview', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    await user.click(screen.getByRole('button', { name: /income/i }));
    setDate('2025-05-22');  // May 22 → shifts to June

    // "June 2025" appears in the badge span AND the helper paragraph — use getAllByText
    expect(screen.getAllByText(/june 2025/i).length).toBeGreaterThan(0);
  });

  it('handles December → January year rollover in effective month preview', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    await user.click(screen.getByRole('button', { name: /income/i }));
    setDate('2025-12-25');  // Dec 25 → shifts to Jan 2026

    // "January 2026" appears in both the badge span and helper paragraph
    expect(screen.getAllByText(/january 2026/i).length).toBeGreaterThan(0);
  });

  it('does NOT show the shift preview when shift_late_income is disabled', async () => {
    const user = userEvent.setup();
    setupContext({ settings: { income_cutoff_day: 20, shift_late_income: false } });
    render(<AddTransactionModal />);
    await openModal(user);

    await user.click(screen.getByRole('button', { name: /income/i }));
    setDate('2025-05-22');  // Would shift if enabled, but shift is OFF

    expect(screen.queryByText('➔ Shifted')).not.toBeInTheDocument();
  });

  it('does NOT show the shift preview for debit (expense) type', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    // Default type is 'expense' — no shift section should render
    setDate('2025-05-22');

    expect(screen.queryByText('➔ Shifted')).not.toBeInTheDocument();
    expect(screen.queryByText(/effective budget month/i)).not.toBeInTheDocument();
  });
});

// ── Helper: get the submit button inside the open modal ───────────────────────
// After openModal(), there are TWO buttons named "Add Transaction":
//   [0] the trigger div button (outside the modal)
//   [1] the form submit button (inside the modal)
// .at(-1) always targets the submit button regardless of how many triggers exist.
function getSubmitButton() {
  return screen.getAllByRole('button', { name: /^add transaction$/i }).at(-1);
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('AddTransactionModal — form submission', () => {
  it('calls addTransaction with the correct payload on submit', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    // Default type is "expense" — pick a category from the expense list
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Food');

    await user.clear(screen.getByPlaceholderText('0.00'));
    await user.type(screen.getByPlaceholderText('0.00'), '75');

    await user.clear(screen.getByPlaceholderText(/transaction description/i));
    await user.type(screen.getByPlaceholderText(/transaction description/i), 'Weekly shop');

    await user.click(getSubmitButton());

    expect(mockAddTransaction).toHaveBeenCalledOnce();
    const payload = mockAddTransaction.mock.calls[0][0];
    expect(payload.category).toBe('Food');
    expect(payload.details).toBe('Weekly shop');
    expect(payload.type).toBe('debit');
    expect(Math.abs(payload.amount)).toBe(75);
  });

  it('maps income type to credit in the payload', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    await user.click(screen.getByRole('button', { name: /income/i }));
    setDate('2025-05-10');  // Early date, no shift

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Salary');

    await user.clear(screen.getByPlaceholderText('0.00'));
    await user.type(screen.getByPlaceholderText('0.00'), '3000');

    await user.clear(screen.getByPlaceholderText(/transaction description/i));
    await user.type(screen.getByPlaceholderText(/transaction description/i), 'Paycheque');

    await user.click(getSubmitButton());

    const payload = mockAddTransaction.mock.calls[0][0];
    expect(payload.type).toBe('credit');
  });

  it('does not call addTransaction when required fields are missing', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    // Submit without filling category or amount — handleSubmit guards: if (date && type && category && amount)
    await user.click(getSubmitButton());

    expect(mockAddTransaction).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('AddTransactionModal — category list', () => {
  it('shows income categories when income type is selected', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    await user.click(screen.getByRole('button', { name: /income/i }));

    const select = screen.getByRole('combobox');
    const options = Array.from(select.options).map(o => o.text);
    expect(options).toContain('Salary');
    expect(options).not.toContain('Food');
  });

  it('shows expense categories when expense type is selected', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    // Default is 'expense'
    const select = screen.getByRole('combobox');
    const options = Array.from(select.options).map(o => o.text);
    expect(options).toContain('Food');
    expect(options).not.toContain('Salary');
  });

  it('resets category selection when the type changes', async () => {
    const user = userEvent.setup();
    setupContext();
    render(<AddTransactionModal />);
    await openModal(user);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Food');

    // Switch to income — Food no longer exists in income category list
    await user.click(screen.getByRole('button', { name: /income/i }));

    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});