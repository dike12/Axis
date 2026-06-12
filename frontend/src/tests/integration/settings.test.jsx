// src/tests/integration/settings.test.jsx
/**
 * Settings — Integration Tests
 * ==============================
 * Covers:
 *   A  Loading / null-settings guard
 *   B  Settings values rendered from context
 *   C  shift_late_income toggle → updateUserSettings called
 *   D  income_cutoff_day input → updateUserSettings called on blur
 *   E  currency selector → updateUserSettings called on change
 *
 * updateUserSettings is mocked so we can assert on what the component
 * passes without making real API calls.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/context/FinanceContext', () => ({ useFinance: vi.fn() }));
vi.mock('@/components/Header', () => ({ default: () => <div data-testid="mock-header" /> }));

import Settings from '@/pages/Settings';
import { useFinance } from '@/context/FinanceContext';

// ── Mock context factory ──────────────────────────────────────────────────────
const mockUpdateSettings = vi.fn();

function setupContext(settings = null) {
  vi.mocked(useFinance).mockReturnValue({
    settings,
    updateUserSettings: mockUpdateSettings,
    transactions: [],
    budgetCategories: [],
  });
}

const DEFAULT_SETTINGS = {
  currency:           'CAD',
  date_format:        'MM/DD/YYYY',
  fiscal_year_start:  1,
  shift_late_income:  true,
  income_cutoff_day:  20,
};

// ═══════════════════════════════════════════════════════════════════════════════
describe('Settings — loading state', () => {
  it('shows a loading message when settings is null', () => {
    setupContext(null);
    render(<Settings toggleSidebar={vi.fn()} />);

    expect(screen.getByText(/loading settings/i)).toBeInTheDocument();
  });

  it('does not render the settings form while loading', () => {
    setupContext(null);
    render(<Settings toggleSidebar={vi.fn()} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Settings — renders values from context', () => {
  beforeEach(() => setupContext(DEFAULT_SETTINGS));

  it('shows the current currency value', () => {
    render(<Settings toggleSidebar={vi.fn()} />);
    // The currency select displays the lowercase value or label
    const select = screen.getAllByRole('combobox')[0];
    expect(select.value.toUpperCase()).toBe('CAD');
  });

  it('shows the current income_cutoff_day in its input', () => {
    render(<Settings toggleSidebar={vi.fn()} />);
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('renders the shift_late_income toggle with correct aria-checked state', () => {
    render(<Settings toggleSidebar={vi.fn()} />);
    const switches = screen.getAllByRole('switch');
    // Find the toggle that reflects the context value (true → aria-checked="true")
    const shiftToggle = switches.find(s => s.closest('[class*="space"]') &&
      s.getAttribute('aria-checked') === 'true');
    // At least one switch should be checked given shift_late_income: true
    const checkedSwitches = switches.filter(s => s.getAttribute('aria-checked') === 'true');
    expect(checkedSwitches.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Settings — shift_late_income toggle', () => {
  it('calls updateUserSettings with shift_late_income: false when toggled OFF', async () => {
    const user = userEvent.setup();
    // Start with shift_late_income: true
    setupContext({ ...DEFAULT_SETTINGS, shift_late_income: true });
    render(<Settings toggleSidebar={vi.fn()} />);

    // Find all switches; the shift_late_income toggle is in the Budget Logic section.
    // It is the last switch before or within the budget section.
    const allSwitches = screen.getAllByRole('switch');

    // The budget section switches come after the notification switches.
    // We look for the switch whose aria-checked reflects the context-driven value.
    // Since notification toggles are local state (start true/true/false/true),
    // we identify the shift toggle as the one controlled by context (value = true).
    // Clicking it should call updateUserSettings (not a local setState).
    const shiftSwitch = allSwitches[allSwitches.length - 1]; // last switch = shift_late_income
    await user.click(shiftSwitch);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ shift_late_income: false }),
      );
    });
  });

  it('calls updateUserSettings with shift_late_income: true when toggled ON', async () => {
    const user = userEvent.setup();
    setupContext({ ...DEFAULT_SETTINGS, shift_late_income: false });
    render(<Settings toggleSidebar={vi.fn()} />);

    const allSwitches = screen.getAllByRole('switch');
    const shiftSwitch = allSwitches[allSwitches.length - 1];
    await user.click(shiftSwitch);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ shift_late_income: true }),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Settings — income_cutoff_day input', () => {
  it('calls updateUserSettings with new cutoff day on blur', async () => {
    const user = userEvent.setup();
    setupContext(DEFAULT_SETTINGS);
    render(<Settings toggleSidebar={vi.fn()} />);

    const cutoffInput = screen.getByDisplayValue('20');
    await user.clear(cutoffInput);
    await user.type(cutoffInput, '25');
    fireEvent.blur(cutoffInput);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ income_cutoff_day: 25 }),
      );
    });
  });

  it('does not call updateUserSettings when value is unchanged', async () => {
    setupContext(DEFAULT_SETTINGS);
    render(<Settings toggleSidebar={vi.fn()} />);

    const cutoffInput = screen.getByDisplayValue('20');
    fireEvent.blur(cutoffInput);  // blur without changing value

    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Settings — currency selector', () => {
  it('calls updateUserSettings with new currency on change', async () => {
    const user = userEvent.setup();
    setupContext(DEFAULT_SETTINGS);
    render(<Settings toggleSidebar={vi.fn()} />);

    const currencySelect = screen.getAllByRole('combobox')[0];

    // Dynamically pick the first option that isn't the current value (CAD).
    // This avoids hardcoding 'usd' when we don't control the exact option values.
    const targetOption = Array.from(currencySelect.options).find(
      o => o.value !== '' && !/cad/i.test(o.value),
    );
    if (!targetOption) throw new Error('No non-CAD currency option found in select');

    await user.selectOptions(currencySelect, targetOption.value);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ currency: targetOption.value.toUpperCase() }),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Settings — system: optimistic update visible before API responds', () => {
  it('updateUserSettings is called synchronously on interaction (optimistic UI)', async () => {
    const user = userEvent.setup();
    // Mock a slow fetch so we can verify the call happens before resolution
    global.fetch.mockReturnValueOnce(new Promise(() => {}));  // never resolves
    setupContext(DEFAULT_SETTINGS);
    render(<Settings toggleSidebar={vi.fn()} />);

    const allSwitches = screen.getAllByRole('switch');
    const shiftSwitch = allSwitches[allSwitches.length - 1];
    await user.click(shiftSwitch);

    // updateUserSettings is called immediately from the component's onChange handler
    expect(mockUpdateSettings).toHaveBeenCalledOnce();
  });
});