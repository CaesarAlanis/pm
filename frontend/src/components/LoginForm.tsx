"use client";

import { useState, type FormEvent } from "react";

type LoginFormProps = {
  onSuccess: () => void;
};

const credentials = { username: "user", password: "password" };

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username === credentials.username && password === credentials.password) {
      setError("");
      onSuccess();
      return;
    }
    setError("Invalid credentials. Use user / password.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-white/90 p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Welcome back
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
          Sign in to Kanban Studio
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
          Use the demo credentials to access your board.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              placeholder="user"
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              type="password"
              placeholder="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:brightness-110"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
};
