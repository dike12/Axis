// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration
 * ==============================
 * Base URL: http://localhost:3000 (Docker / nginx proxy)
 *
 * Prerequisites before running:
 *   1. docker compose up  (full stack must be running)
 *   2. npx playwright install  (one-time browser download)
 *
 * Run:
 *   npm run test:e2e            → headless Chromium
 *   npm run test:e2e:headed     → visible browser (useful for debugging)
 *   npm run test:e2e:ui         → Playwright interactive UI
 */

export default defineConfig({
  testDir:       './e2e',
  fullyParallel: false,   // sequential — tests share auth state + DB
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 2 : 0,
  reporter:      [['html', { open: 'never' }], ['line']],

  use: {
    baseURL:    'http://localhost:5173',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
    // ← remove storageState from here
  },

  projects: [
    {
      name:      'setup',
      testMatch: /.*\.setup\.js/,
      // no storageState — this project CREATES the file
    },
    {
      name:         'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/.auth.json',  // ← only here
      },
      dependencies: ['setup'],
    },
  ],
});
