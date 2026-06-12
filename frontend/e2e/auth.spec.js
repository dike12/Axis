// e2e/auth.spec.js
/**
 * Auth — E2E Tests
 * =================
 * These tests run WITHOUT the saved storageState (we test the unauthenticated
 * and authentication paths themselves).
 *
 * Requires the full Docker stack running at http://localhost:3000.
 */

import { test, expect } from '@playwright/test';

// Override the project-level storageState for all tests in this file
// so we start unauthenticated.
test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL    = process.env.TEST_EMAIL    ?? 'test@email.com';
const PASSWORD = process.env.TEST_PASSWORD ?? '123456789';

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function fillLoginForm(page, email = EMAIL, password = PASSWORD) {
  await page.getByPlaceholder(/you@example.com/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
}

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Unauthenticated routing', () => {
  test('visiting / redirects to /auth when not logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/auth');
  });

  test('/auth page shows the login form', async ({ page }) => {
    await page.goto('/auth',  { waitUntil: 'networkidle' });
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByPlaceholder(/you@example.com/i)).toBeVisible();
  });

  test('already-authenticated user visiting /auth is redirected to /', async ({ page }) => {
    // First log in
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await fillLoginForm(page);
    await page.waitForURL('/');

    // Now try to visit /auth again
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
  });

  test('valid credentials log the user in and redirect to dashboard', async ({ page }) => {
    await fillLoginForm(page);
    await page.waitForURL('/');
    await expect(page.getByRole('main').getByText('Overview')).toBeVisible();
  });

  test('dashboard is accessible after login (app fully loads)', async ({ page }) => {
    await fillLoginForm(page);
    await page.waitForURL('/');

    // FinanceContext kicks off all fetches on mount — wait for content to settle
    await expect(page.getByRole('main').getByText('Net Worth', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('main').getByText('Savings Rate', { exact: true })).toBeVisible();
  });

  test('wrong password shows an error toast (not a crash)', async ({ page }) => {
    await fillLoginForm(page, EMAIL, 'definitely-wrong-password');

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({
      timeout: 5_000,
    });
    // Must remain on /auth
    await expect(page).toHaveURL('/auth');
  });

  test('non-existent email returns the same 401 error (enumeration prevention)', async ({ page }) => {
    await fillLoginForm(page, 'ghost@nobody.com', 'anypassword');

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('submit button is disabled while the request is in-flight', async ({ page }) => {
    // Slow down the network to observe the loading state
    await page.route('**/auth/login', route =>
      new Promise(resolve => setTimeout(() => resolve(route.continue()), 1500)),
    );

    await page.getByPlaceholder(/you@example.com/i).fill(EMAIL);
    await page.getByPlaceholder(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page.getByText(/please wait/i)).toBeVisible();
    await expect(page.getByText(/please wait/i).locator('..')).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Sign-up mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'networkidle' });
  });

  test('clicking "Sign up" toggles to registration mode', async ({ page }) => {
    await page.getByText(/sign up/i).click();
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign up$/i })).toBeVisible();
  });

  test('switching back to login restores the sign-in button', async ({ page }) => {
    await page.getByText(/sign up/i).click();
    await page.getByText(/sign in/i).click();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Logout flow', () => {
  test('logging out redirects back to /auth', async ({ page }) => {
    // Log in first
    await page.goto('/auth', { waitUntil: 'networkidle' });
    await fillLoginForm(page);
    await page.waitForURL('/');

    // Navigate to settings and find the logout button
    await page.goto('/settings');
    const logoutBtn = page.getByRole('button', { name: /log out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL('/auth');
    } else {
      // Logout may be in a different location — verify /auth/logout endpoint clears session
      await page.request.post('http://localhost:3000/api/v1/auth/logout');
      await page.goto('/');
      await expect(page).toHaveURL('/auth');
    }
  });
});
