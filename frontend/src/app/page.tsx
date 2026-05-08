"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginScreen } from "@/components/LoginScreen";

const AUTH_STORAGE_KEY = "pm-authenticated";
const AUTH_USER_KEY = "pm-username";
const DEFAULT_USERNAME = "user";

export default function Home() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const storedUser = window.localStorage.getItem(AUTH_USER_KEY);
    queueMicrotask(() => {
      setSignedIn(storedValue === "true");
      setUsername(storedUser || null);
    });
  }, []);

  const handleLogin = () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
    window.localStorage.setItem(AUTH_USER_KEY, DEFAULT_USERNAME);
    setSignedIn(true);
    setUsername(DEFAULT_USERNAME);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    setSignedIn(false);
    setUsername(null);
  };

  if (signedIn === null) {
    return null;
  }

  if (!signedIn || !username) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="flex justify-end px-6 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)]"
        >
          Log out
        </button>
      </div>
      <KanbanBoard username={username} />
    </div>
  );
}
