"use client";

import { FormEvent, useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import {
  clearToken,
  getStoredToken,
  login,
  storeToken,
  verifySession,
} from "@/lib/auth";

export const AuthShell = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkExistingSession = async () => {
      const token = getStoredToken();
      if (!token) {
        setIsChecking(false);
        return;
      }

      const valid = await verifySession(token);
      if (!valid) {
        clearToken();
        setIsChecking(false);
        return;
      }

      setAccessToken(token);
      setIsAuthenticated(true);
      setIsChecking(false);
    };

    void checkExistingSession();
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      const result = await login(username, password);
      storeToken(result.access_token);
      setAccessToken(result.access_token);
      setIsAuthenticated(true);
    } catch {
      setError("Invalid username or password.");
    }
  };

  const handleLogout = () => {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  if (isChecking) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] items-center px-6">
        <p className="text-sm text-[var(--gray-text)]">Checking session...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] items-center px-6">
        <section className="w-full rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
            Sign In Required
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
            Kanban Studio Login
          </h1>
          <p className="mt-3 text-sm text-[var(--gray-text)]">
            Use the MVP credentials to continue.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-[var(--navy-dark)]">
              Username
              <input
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--navy-dark)]">
              Password
              <input
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white"
            >
              Sign In
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="fixed right-6 top-6 z-50">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] shadow-[var(--shadow)]"
        >
          Log Out
        </button>
      </div>
      {accessToken ? <KanbanBoard accessToken={accessToken} /> : null}
    </>
  );
};