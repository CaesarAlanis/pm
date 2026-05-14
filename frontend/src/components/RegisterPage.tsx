"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

type RegisterPageProps = {
  onSwitchToLogin?: () => void;
};

export const RegisterPage = ({ onSwitchToLogin }: RegisterPageProps) => {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await register(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <h1 className="font-display text-2xl font-semibold text-[var(--dark-teal)]">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-[var(--gray-text)]">
            Sign up to start managing your projects.
          </p>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reg-username" className="sr-only">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                required
                minLength={3}
                className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm font-medium text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="sr-only">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (6+ characters)"
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm font-medium text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
              />
            </div>
            <div>
              <label htmlFor="reg-confirm" className="sr-only">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm font-medium text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[var(--accent-turquoise)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>
          {onSwitchToLogin && (
            <p className="mt-4 text-center text-sm text-[var(--gray-text)]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold text-[var(--accent-turquoise)] hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
