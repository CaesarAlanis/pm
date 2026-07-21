"use client";

import { useState } from "react";

type LoginFormProps = {
  onLoginSuccess: (username: string) => void;
};

export const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Attempt API login call
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        onLoginSuccess(username);
      } else {
        // Fallback validation for static export preview if API server isn't running
        if (username === "user" && password === "password") {
          onLoginSuccess(username);
        } else {
          setError("Invalid username or password");
        }
      }
    } catch {
      // Client-side fallback if server fetch fails in static preview
      if (username === "user" && password === "password") {
        onLoginSuccess(username);
      } else {
        setError("Invalid username or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--navy-dark)] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-lg">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-yellow)]">
            Single Board Kanban
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white">Sign In</h2>
          <p className="mt-2 text-sm text-[var(--gray-text)]">
            Enter credentials to access your Kanban workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-center text-xs font-medium text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--gray-text)]">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[var(--primary-blue)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--gray-text)]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[var(--primary-blue)] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--purple-secondary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-white/5 bg-white/5 p-3 text-center text-xs text-[var(--gray-text)]">
          Demo Credentials: <span className="font-semibold text-white">user</span> /{" "}
          <span className="font-semibold text-white">password</span>
        </div>
      </div>
    </div>
  );
};
