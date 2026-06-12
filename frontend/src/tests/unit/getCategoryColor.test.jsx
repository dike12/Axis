// src/tests/unit/getCategoryColor.test.jsx
/**
 * getCategoryColor — Deterministic Hash Color Tests
 * ==================================================
 * getCategoryColor hashes a category name string into one of N Tailwind color
 * slots. Tests are written through Transactions component rendering because the
 * function is not exported.
 *
 * Key invariants:
 *   1. Every category badge gets a real Tailwind color class (no empty/gray fallback).
 *   2. The function is deterministic: identical names always produce identical classes.
 *   3. Different names CAN produce different colors (distribution check).
 *   4. The hash is case-sensitive (by design — "Food" ≠ "food").
 */

import { render, screen, within } from '@testing-library/react';

vi.mock('@/context/FinanceContext',          () => ({ useFinance: vi.fn() }));
vi.mock('@/components/Header',               () => ({ default: () => <div /> }));
vi.mock('@/components/transactions/AddTransactionModal', () => ({ default: () => null }));
vi.mock('@/components/transactions/CSVImportModal',      () => ({ default: () => null }));

import Transactions from '@/pages/Transactions';
import { useFinance } from '@/context/FinanceContext';

// ── Minimal context required by Transactions ──────────────────────────────────
function makeContext(transactions = []) {
  return {
    transactions,
    loading:          false,
    analysisInsights: [],
    budgetCategories: [],
    summary:          { total_income: 0, total_expenses: 0, net_flow: 0 },
    deleteTransaction: vi.fn(),
    editTransaction:   vi.fn(),
    selectedMonth:     5,
    setSelectedMonth:  vi.fn(),
    selectedYear:      2025,
    setSelectedYear:   vi.fn(),
    settings:          { income_cutoff_day: 20, shift_late_income: true },
  };
}

function makeTx(id, category, type = 'debit') {
  return { id, date: '2025-05-10', category, details: `${category} purchase`, amount: 100, type };
}

function renderWithTxns(transactions) {
  vi.mocked(useFinance).mockReturnValue(makeContext(transactions));
  render(<Transactions toggleSidebar={vi.fn()} />);
}

// ── Helper: find the category badge span for a given category name ─────────────
function getBadge(categoryName) {
  // The badge is a rounded-full span whose text content is the category name.
  const allSpans = document.querySelectorAll('span');
  return Array.from(allSpans).find(
    el => el.textContent.trim() === categoryName && el.className.includes('rounded-full'),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('getCategoryColor — badge rendering', () => {
  it('renders a color badge for each transaction row', () => {
    renderWithTxns([
      makeTx('1', 'Food'),
      makeTx('2', 'Rent'),
    ]);

    expect(getBadge('Food')).toBeTruthy();
    expect(getBadge('Rent')).toBeTruthy();
  });

  it('badge class contains a Tailwind text-color utility (not empty or gray fallback)', () => {
    renderWithTxns([makeTx('1', 'Food')]);
    const badge = getBadge('Food');
    expect(badge).toBeTruthy();
    // Must include a color class — the fix replaced placeholder strings with real classes
    expect(badge.className).toMatch(/text-[a-z]+-\d{3}/);
    // Must NOT fall back to the gray placeholder used before the fix
    expect(badge.className).not.toContain('text-gray-300');
  });

  it('badge class contains a background color utility', () => {
    renderWithTxns([makeTx('1', 'Food')]);
    const badge = getBadge('Food');
    expect(badge.className).toMatch(/bg-[a-z]+-\d{3}/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('getCategoryColor — determinism', () => {
  it('same category name always produces the same badge class (single render)', () => {
    renderWithTxns([
      makeTx('1', 'Food'),
      makeTx('2', 'Food'),  // second transaction, same category
    ]);

    const allSpans = document.querySelectorAll('span');
    const foodBadges = Array.from(allSpans).filter(
      el => el.textContent.trim() === 'Food' && el.className.includes('rounded-full'),
    );

    expect(foodBadges.length).toBeGreaterThanOrEqual(2);
    // Every badge for "Food" must have the same className
    const classes = foodBadges.map(b => b.className);
    expect(new Set(classes).size).toBe(1);
  });

  it('re-renders with the same data produce the same badge classes', () => {
    const txns = [makeTx('1', 'Salary', 'credit')];

    renderWithTxns(txns);
    const firstClass = getBadge('Salary')?.className;

    // Unmount and re-render
    document.body.innerHTML = '';
    renderWithTxns(txns);
    const secondClass = getBadge('Salary')?.className;

    expect(firstClass).toBeTruthy();
    expect(firstClass).toBe(secondClass);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('getCategoryColor — distribution', () => {
  it('different category names CAN produce different colors', () => {
    // Pick names known to hash differently (checked manually via charCode sums)
    renderWithTxns([
      makeTx('1', 'Food'),    // charCode sum 392 → slot 2
      makeTx('2', 'Rent'),    // charCode sum 409 → slot 1
    ]);

    const foodClass = getBadge('Food')?.className;
    const rentClass = getBadge('Rent')?.className;

    expect(foodClass).toBeTruthy();
    expect(rentClass).toBeTruthy();
    // These two should hash to different slots
    expect(foodClass).not.toBe(rentClass);
  });

  it('no transaction badge is left without a color class', () => {
    const categories = ['Food', 'Rent', 'Salary', 'Transport', 'Utilities', 'Coffee'];
    renderWithTxns(categories.map((cat, i) => makeTx(String(i), cat)));

    categories.forEach(cat => {
      const badge = getBadge(cat);
      expect(badge, `Badge for "${cat}" should exist`).toBeTruthy();
      expect(badge.className, `Badge for "${cat}" should have a color class`).toMatch(/text-[a-z]+-\d{3}/);
    });
  });
});
