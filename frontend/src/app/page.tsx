"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { KanbanBoard } from "@/components/KanbanBoard";
import { DashboardPage } from "@/components/DashboardPage";
import { LoginPage } from "@/components/LoginPage";
import { RegisterPage } from "@/components/RegisterPage";

type View = "dashboard" | "board";

const AppContent = () => {
  const { username, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

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

  if (view === "dashboard" && !activeBoardId) {
    return (
      <DashboardPage
        onSelectBoard={(boardId) => {
          setActiveBoardId(boardId);
          setView("board");
        }}
        onCreateBoard={() => {
          setActiveBoardId(null);
          setView("board");
        }}
      />
    );
  }

  return (
    <KanbanBoard
      initialBoardId={activeBoardId}
      onGoHome={() => {
        setActiveBoardId(null);
        setView("dashboard");
      }}
    />
  );
};

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
