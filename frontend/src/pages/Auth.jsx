import React, { useState } from "react";

// ─── Inline UI Primitives (matching your existing design system) ───────────────

const Card = React.forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-xl border border-gray-800 bg-[#11141B] text-white shadow-sm ${className}`}
    {...props}
  />
));

const Input = React.forwardRef(({ className = "", type, ...props }, ref) => (
  <input
    type={type}
    className={`flex h-10 w-full rounded-md border border-gray-700 bg-[#11141B] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    ref={ref}
    {...props}
  />
));

const Button = React.forwardRef(({ className = "", variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20",
    outline: "border border-gray-700 text-gray-300 hover:bg-[#1A1F26] hover:text-white",
  };
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  );
});

// ─── Google Icon ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}

// ─── Toast (lightweight, no dependency) ──────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };
  return { toasts, success: (m) => show(m, "success"), error: (m) => show(m, "error") };
}

function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg border text-sm font-medium shadow-xl animate-fade-in backdrop-blur-sm
            ${t.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Main Auth Component ──────────────────────────────────────────────────────

export default function Auth({ setSession }) {
  const [mode, setMode] = useState("login"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Determine endpoint and payload based on mode
    const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
    
    // Auto-generate a name from the email for registration
    const payload = mode === "signup" 
      ? { email, password, name: email.split('@')[0] } 
      : { email, password };

    try {
      const res = await fetch(`http://localhost:3000/api/v1${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include" 
      });

      const json = await res.json();
      
      // Handle backend validation errors (like "Email already registered")
      if (!res.ok) {
        throw new Error(json.error?.message || "Authentication failed");
      }

      toast.success(mode === "signup" ? "Account created!" : "Welcome back!");
      
      // Update global App state to immediately log the user in
      if (setSession) setSession(json.data);

    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    toast.success("Google OAuth integration coming soon!");
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] p-6">

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.25s ease forwards; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.35s ease forwards; }
      `}</style>

      <ToastContainer toasts={toast.toasts} />

      <Card className="w-full max-w-[380px] p-8 animate-slide-up">

        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-base">W</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLogin ? "Sign in to continue" : "Get started in seconds"}
          </p>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleEmail} className="space-y-3">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isLogin ? "current-password" : "new-password"}
            disabled={loading}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Please wait...
              </span>
            ) : (
              isLogin ? "Sign in" : "Sign up"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-800" />
          <span className="text-xs text-gray-600 uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-gray-800" />
        </div>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        {/* Toggle Mode */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(isLogin ? "signup" : "login"); setEmail(""); setPassword(""); }}
            className="text-emerald-400 hover:text-emerald-300 hover:underline font-medium transition-colors"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

      </Card>
    </div>
  );
}
