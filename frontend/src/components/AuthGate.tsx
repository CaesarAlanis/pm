"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";

const VALID_USERNAME = "user";
const VALID_PASSWORD = "password";

type SignInState = {
  username: string;
  password: string;
  error: string | null;
  isAuthenticated: boolean;
};

export const AuthGate = () => {
  const [state, setState] = useState<SignInState>({
    username: "",
    password: "",
    error: null,
    isAuthenticated: false,
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (state.username === VALID_USERNAME && state.password === VALID_PASSWORD) {
      setState((prev) => ({ ...prev, error: null, isAuthenticated: true }));
      return;
    }

    setState((prev) => ({
      ...prev,
      error: "Invalid credentials. Please try again.",
      isAuthenticated: false,
    }));
  };

  if (state.isAuthenticated) {
    return (
      <div>
        <div className="flex justify-end px-6 pt-6">
          <button
            type="button"
            onClick={() =>
              setState({ username: "", password: "", error: null, isAuthenticated: false })
            }
            className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] shadow-[var(--shadow)]"
          >
            Log out
          </button>
        </div>
        <KanbanBoard username={state.username} />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6 py-12">
      <div className="w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Project workspace
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
          Sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
          Use the demo credentials to access the dashboard.
        </p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-semibold text-[var(--navy-dark)]">
              Username
            </label>
            <input
              id="username"
              name="username"
              value={state.username}
              onChange={(event) =>
                setState((prev) => ({ ...prev, username: event.target.value }))
              }
              className="w-full rounded-2xl border border-[var(--stroke)] px-4 py-3 outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[var(--navy-dark)]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={state.password}
              onChange={(event) =>
                setState((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-2xl border border-[var(--stroke)] px-4 py-3 outline-none"
            />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-[var(--purple-secondary)] px-4 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
};
