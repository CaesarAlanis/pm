"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

type LoginPageProps = {
  onSwitchToRegister?: () => void;
};

export const LoginPage = ({ onSwitchToRegister }: LoginPageProps) => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
    } catch {
      setError("Invalid username or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]"
      >
        <h1 className="font-display text-2xl font-semibold text-[var(--dark-teal)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-text)]">
          Enter your credentials to access the board.
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-username" className="sr-only">Username</label>
            <input
              id="login-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm font-medium text-[var(--dark-teal)] outline-none transition focus:border-[#00CCA2]"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="sr-only">Password</label>
            <input
              id="login-password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm font-medium text-[var(--dark-teal)] outline-none transition focus:border-[#00CCA2]"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-full bg-[#00CCA2] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        {onSwitchToRegister && (
          <p className="mt-4 text-center text-sm text-[var(--gray-text)]">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-semibold text-[var(--accent-turquoise)] hover:underline"
            >
              Create one
            </button>
          </p>
        )}
      </form>
    </div>
  );
};
