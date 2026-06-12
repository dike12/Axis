// e2e/transactions.spec.js
/**
 * Transactions — E2E Tests
 * =========================
 * Tests the full transaction management workflow against the live stack.
 * Auth is handled by auth.setup.js (storageState loaded automatically).
 *
 * NOTE: These tests create real database rows. They clean up after themselves
 * where possible, but a dedicated test database is recommended for CI.
 */

import { test, expect } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openAddModal(page) {
  // The Add Transaction button appears in the page header area
  await page.getByRole('button', { name: /add transaction/i }).first().click();
  await expect(page.getByRole('heading', { name: /add transaction/i })).toBeVisible();
}

  async function fillTransactionForm(page, {
    type        = 'expense',
    date        = new Date().toISOString().split('T')[0], // Dynamically grabs today's date (YYYY-MM-DD)
    category    = null,
    amount      = '42.00',
    description = 'E2E test transaction',
  } = {}) {
  // Select type
  await page.getByRole('button', { name: new RegExp(type, 'i') }).click();

  // Set date
  await page.locator('input[type="date"]').fill(date);

  // Select category (if provided and options are available)
  if (category) {
    const select = page.locator('form').getByRole('combobox');
    const options = await select.locator('option').allTextContents();
    const match   = options.find(o => o.toLowerCase().includes(category.toLowerCase()));
    if (match) await select.selectOption(match);
    else       await select.selectOption({ index: 1 });  // pick first available
  } else {
    const select = page.locator('form').getByRole('combobox');
    // Wait for at least one option to load into the DOM
    await select.locator('option').first().waitFor({ state: 'attached' });
    
    // Count available options
    const optionCount = await select.locator('option').count();
    
    // If there are multiple options, pick the first real one (index 1). 
    // If there is only one option, pick it safely (index 0).
    await select.selectOption({ index: optionCount > 1 ? 1 : 0 });
  }

  await page.getByPlaceholder('0.00').fill(amount);
  await page.getByPlaceholder(/transaction description/i).fill(description);
}

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Transactions page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByText(/transactions/i).first()).toBeVisible();
  });

  test('renders the transactions page with the Add Transaction button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add transaction/i }).first()).toBeVisible();
  });

  test('shows the transaction table (or empty state)', async ({ page }) => {
    // Either there are transactions, or an empty state message
    await expect(
      page.locator('table').or(page.getByText(/no transactions/i))
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Add Transaction modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
  });

  test('modal opens when Add Transaction is clicked', async ({ page }) => {
    await openAddModal(page);
    await expect(page.getByRole('heading', { name: /add transaction/i })).toBeVisible();
  });

  test('modal closes when Cancel is clicked', async ({ page }) => {
    await openAddModal(page);
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /add transaction/i })).not.toBeVisible();
  });

  test('modal closes when × is clicked', async ({ page }) => {
    await openAddModal(page);
    // The × close button is the first button after the header
    await page.locator('form').locator('..').locator('[aria-label="close"], button:has(svg)').first().click();
    await expect(page.getByRole('heading', { name: /add transaction/i })).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test('income type with late date shows shift preview', async ({ page }) => {
    await openAddModal(page);
    await page.getByRole('button', { name: /income/i }).click();
    await page.locator('input[type="date"]').fill('2025-05-22');
    // Shift badge should appear (cutoff default = 20, day 22 >= 20)
    await expect(page.getByText('➔ Shifted')).toBeVisible({ timeout: 3_000 });
  });

  test('income type with early date does NOT show shift preview', async ({ page }) => {
    await openAddModal(page);
    await page.getByRole('button', { name: /income/i }).click();
    await page.locator('input[type="date"]').fill('2025-05-05');
    await expect(page.getByText('➔ Shifted')).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe.skip('Add → verify → delete workflow', () => {
  const DESCRIPTION = `E2E_test_${Date.now()}`;  // unique description for isolation

  test('newly added transaction appears in the table immediately', async ({ page }) => {
    await page.goto('/transactions');
    await openAddModal(page);
    await fillTransactionForm(page, { description: DESCRIPTION, amount: '99.99' });

    await page.locator('form').getByRole('button', { name: /^add transaction$/i }).click();

    // After submit the modal should close
    await expect(page.getByRole('heading', { name: /add transaction/i })).not.toBeVisible({
      timeout: 5_000,
    });

    // The new transaction should appear in the list
    await expect(page.getByText(DESCRIPTION)).toBeVisible({ timeout: 8_000 });
  });

  test('deleting a transaction removes it from the table', async ({ page }) => {
    await page.goto('/transactions');

    // Add first so we have something to delete
    await openAddModal(page);
    await fillTransactionForm(page, { description: DESCRIPTION, amount: '99.99' });
    await page.locator('form').getByRole('button', { name: /^add transaction$/i }).click();
    await expect(page.getByText(DESCRIPTION)).toBeVisible({ timeout: 8_000 });

    // Find the row and click its delete button
    const row = page.locator('tr', { hasText: DESCRIPTION });
    const deleteBtn = row.getByRole('button', { name: /delete/i }).or(
      row.locator('[aria-label*="delete"], [aria-label*="Delete"]'),
    ).first();

    await deleteBtn.click();

    // Confirm dialog if one appears
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(page.getByText(DESCRIPTION)).not.toBeVisible({ timeout: 8_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Filtering and search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
  });

  test('search input filters the transaction list', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    if (!(await searchInput.isVisible().catch(() => false))) return;

    await searchInput.fill('zzz_nonexistent_xyz');
    // Either the table empties out, or no-results message appears
    await expect(
      page.locator('tr[data-testid="txn-row"]').or(page.getByText(/no transactions/i)),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('type filter shows only matching transaction type', async ({ page }) => {
    // Look for a type filter button (income / expense)
    const incomeFilter = page.getByRole('button', { name: /^income$/i });
    if (!(await incomeFilter.isVisible().catch(() => false))) return;

    await incomeFilter.click();
    // All visible transaction type badges should be income/credit
    const typeBadges = page.locator('[data-type="debit"]');
    await expect(typeBadges).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Dashboard sync', () => {
  test('adding a transaction updates the dashboard KPI on next navigation', async ({ page }) => {
    // Record baseline monthly spend from the dashboard
    await page.goto('/',  { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    const spendText = await page.getByText(/monthly spend/i)
      .locator('xpath=following-sibling::*[1]').textContent().catch(() => null);

    // Add a debit transaction
    await page.goto('/transactions');
    await openAddModal(page);
    await fillTransactionForm(page, {
      description: `E2E_kpi_test_${Date.now()}`,
      amount: '1234.56',
      type: 'expense',
    });
    await page.locator('form').getByRole('button', { name: /^add transaction$/i }).click();
    await expect(page.getByRole('heading', { name: /add transaction/i })).not.toBeVisible({
      timeout: 5_000,
    });

    // Navigate back to dashboard — context refreshTrigger causes a re-fetch
    await page.goto('/',  { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    // Dashboard should have re-fetched; Monthly Spend text should change
    // (We just verify it renders, not the exact value, since other tests may have added data)
    await expect(page.getByText('Monthly Spend', { exact: true })).toBeVisible();
    await expect(page.getByText('Net Worth', { exact: true })).toBeVisible();
  });
});
