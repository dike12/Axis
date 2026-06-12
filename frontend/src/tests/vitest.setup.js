// src/tests/vitest.setup.js
import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// ── Recharts needs ResizeObserver — jsdom doesn't provide one ─────────────────
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe:    vi.fn(),
  unobserve:  vi.fn(),
  disconnect: vi.fn(),
}));

// ── Radix UI / Tailwind rely on matchMedia ────────────────────────────────────
global.matchMedia = global.matchMedia ?? vi.fn().mockImplementation(query => ({
  matches:             false,
  media:               query,
  onchange:            null,
  addListener:         vi.fn(),
  removeListener:      vi.fn(),
  addEventListener:    vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent:       vi.fn(),
}));

// ── Global fetch stub: each test configures its own responses via mockResolvedValue
global.fetch = vi.fn();

// ── Clear call history and return values between every test ───────────────────
// Does NOT reset implementations (global stubs above stay intact).
afterEach(() => {
  vi.clearAllMocks();
});
