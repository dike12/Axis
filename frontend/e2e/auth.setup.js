// e2e/auth.setup.js
/**
 * Auth Setup — runs ONCE before the full E2E suite.
 * Logs in with TEST_EMAIL/TEST_PASSWORD and saves the axis_session cookie
 * to .playwright/.auth.json so every test starts already authenticated.
 *
 * The credentials are read from environment variables (same as the backend
 * TEST_EMAIL / TEST_PASSWORD values in your .env file).
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(import.meta.dirname, '../.playwright/.auth.json');

const EMAIL    = process.env.TEST_EMAIL    ?? 'test@email.com';
const PASSWORD = process.env.TEST_PASSWORD ?? '123456789';

// e2e/auth.setup.js
setup('authenticate', async ({ page }) => {
  // Navigate to root — nginx serves index.html → React loads →
  // App.jsx checks session → redirects unauthenticated users to /auth
  await page.goto('/');
  await page.waitForURL('**/auth', { timeout: 15_000 });

  await page.getByPlaceholder(/you@example.com/i).fill(EMAIL);
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('/', { timeout: 15_000 });
  await expect(page.getByRole('main').getByText('Overview')).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
