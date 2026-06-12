// src/tests/integration/auth.test.jsx
/**
 * Auth — Integration Tests
 * =========================
 * Tests the full Auth component lifecycle: form state, fetch calls,
 * success/error toasts, loading state, and the session handoff to App.
 *
 * fetch is stubbed globally in vitest.setup.js; each test configures
 * its own response via mockResolvedValueOnce.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from '@/pages/Auth';

// Auth.jsx has no context or router dependencies — render directly.

// ── Factory: build a mock fetch response ─────────────────────────────────────
function mockFetch(ok, body) {
  global.fetch.mockResolvedValueOnce({
    ok,
    json: async () => body,
  });
}

const SUCCESS_BODY = {
  data:  { id: 'u1', email: 'test@axis.dev', name: 'Test' },
  error: null,
};
const ERROR_BODY = {
  data:  null,
  error: { message: 'Invalid email or password' },
};

// ═══════════════════════════════════════════════════════════════════════════════
describe('Auth — initial render', () => {
  it('starts in login mode', () => {
    render(<Auth setSession={vi.fn()} />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders email and password inputs', () => {
    render(<Auth setSession={vi.fn()} />);
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('renders the Google OAuth button', () => {
    render(<Auth setSession={vi.fn()} />);
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Auth — mode toggle', () => {
  it('switches to sign-up mode when the toggle link is clicked', async () => {
    const user = userEvent.setup();
    render(<Auth setSession={vi.fn()} />);

    await user.click(screen.getByText(/sign up/i));

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign up$/i })).toBeInTheDocument();
  });

  it('clears the email and password fields when switching mode', async () => {
    const user = userEvent.setup();
    render(<Auth setSession={vi.fn()} />);

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    await user.type(emailInput, 'someone@example.com');

    await user.click(screen.getByText(/sign up/i));

    expect(screen.getByPlaceholderText(/you@example.com/i)).toHaveValue('');
  });

  it('toggles back to login mode from sign-up', async () => {
    const user = userEvent.setup();
    render(<Auth setSession={vi.fn()} />);

    await user.click(screen.getByText(/sign up/i));
    await user.click(screen.getByText(/sign in/i));

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Auth — login submission', () => {
  it('calls POST /auth/login with email and password', async () => {
    const user = userEvent.setup();
    mockFetch(true, SUCCESS_BODY);
    render(<Auth setSession={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'test@axis.dev');
    await user.type(screen.getByPlaceholderText(/password/i),         'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body:   JSON.stringify({ email: 'test@axis.dev', password: 'password123' }),
      }),
    );
  });

  it('calls setSession with user data on success', async () => {
    const user       = userEvent.setup();
    const setSession = vi.fn();
    mockFetch(true, SUCCESS_BODY);
    render(<Auth setSession={setSession} />);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'test@axis.dev');
    await user.type(screen.getByPlaceholderText(/password/i),         'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(setSession).toHaveBeenCalledWith(SUCCESS_BODY.data));
  });

  it('shows an error toast when the backend returns a non-ok response', async () => {
    const user = userEvent.setup();
    mockFetch(false, ERROR_BODY);
    render(<Auth setSession={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'bad@axis.dev');
    await user.type(screen.getByPlaceholderText(/password/i),         'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument(),
    );
  });

  it('disables the submit button while loading', async () => {
    const user = userEvent.setup();
    // Never-resolving promise simulates a slow network
    global.fetch.mockReturnValueOnce(new Promise(() => {}));
    render(<Auth setSession={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'test@axis.dev');
    await user.type(screen.getByPlaceholderText(/password/i),         'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/please wait/i).closest('button')).toBeDisabled();
  });

  it('sends credentials: include so the server sets the HttpOnly cookie', async () => {
    const user = userEvent.setup();
    mockFetch(true, SUCCESS_BODY);
    render(<Auth setSession={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'test@axis.dev');
    await user.type(screen.getByPlaceholderText(/password/i),         'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('Auth — register submission', () => {
  async function switchToSignup(user) {
    await user.click(screen.getByText(/sign up/i));
  }

  it('calls POST /auth/register with email, password, and a generated name', async () => {
    const user = userEvent.setup();
    mockFetch(true, SUCCESS_BODY);
    render(<Auth setSession={vi.fn()} />);
    await switchToSignup(user);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'alice@axis.dev');
    await user.type(screen.getByPlaceholderText(/password/i),         'mypassword');
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({
        method: 'POST',
        body:   JSON.stringify({ email: 'alice@axis.dev', password: 'mypassword', name: 'alice' }),
      }),
    );
  });

  it('derives the name from the email prefix (before @)', async () => {
    const user = userEvent.setup();
    mockFetch(true, SUCCESS_BODY);
    render(<Auth setSession={vi.fn()} />);
    await switchToSignup(user);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'johndoe@company.com');
    await user.type(screen.getByPlaceholderText(/password/i),         'pass123');
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.name).toBe('johndoe');
  });

  it('shows success toast text after successful registration', async () => {
    const user = userEvent.setup();
    mockFetch(true, SUCCESS_BODY);
    render(<Auth setSession={vi.fn()} />);
    await switchToSignup(user);

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'new@axis.dev');
    await user.type(screen.getByPlaceholderText(/password/i),         'pass123');
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));

    await waitFor(() =>
      expect(screen.getByText('Account created!')).toBeInTheDocument(),
    );
  });
});
