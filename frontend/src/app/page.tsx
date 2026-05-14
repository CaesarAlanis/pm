"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginPage } from "@/components/LoginPage";
import { RegisterPage } from "@/components/RegisterPage";

const AppContent = () => {
  const { username, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--gray-text)]">Loading...</p>
      </div>
    );
  }

  if (!username) {
    if (showRegister) {
      return <RegisterPage onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <LoginPage onSwitchToRegister={() => setShowRegister(true)} />;
  }

  return <KanbanBoard />;
};

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
