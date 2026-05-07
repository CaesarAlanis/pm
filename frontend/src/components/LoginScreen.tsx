"use client";

import { useState, type FormEvent } from "react";

type LoginScreenProps = {
  onLogin: () => void;
};

const validUsername = "user";
const validPassword = "password";

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (normalizedUsername === validUsername && normalizedPassword === validPassword) {
      setError("");
      onLogin();
      return;
    }
    setError("Invalid credentials. Use user / password.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6 py-12">
      <div className="max-w-md rounded-3xl border border-[var(--stroke)] bg-white p-10 shadow-[var(--shadow)]">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Kanban Studio
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--navy-dark)]">
            Sign in to continue
          </h1>
          <p className="mt-3 text-sm text-[var(--gray-text)]">
            Use the dummy credentials to open your board.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-[var(--navy-dark)]">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="user"
              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary-blue)]"
              autoComplete="username"
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--navy-dark)]">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="password"
              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary-blue)]"
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <p className="text-sm font-medium text-[var(--secondary-purple)]">{error}</p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:brightness-110"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
};
