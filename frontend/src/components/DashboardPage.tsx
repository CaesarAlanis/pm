"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { DashboardData, OverdueCard, RecentlyActiveBoard } from "@/lib/kanban";

type DashboardPageProps = {
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
};

const StatCard = ({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) => (
  <div className="rounded-2xl border border-[var(--stroke)] bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">{label}</p>
    <p className={`mt-1 font-display text-3xl font-bold ${accent ? "text-[var(--accent-turquoise)]" : "text-[var(--dark-teal)]"}`}>
      {value}
    </p>
  </div>
);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
};

export const DashboardPage = ({ onSelectBoard, onCreateBoard }: DashboardPageProps) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardData>("/api/analytics/dashboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--gray-text)]">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--gray-text)]">Failed to load dashboard.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1200px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-[28px] border border-[var(--stroke)] bg-white/80 px-8 py-5 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-turquoise)]/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="13" rx="2" stroke="var(--accent-turquoise)" strokeWidth="1.5"/>
                <path d="M2 8h16" stroke="var(--accent-turquoise)" strokeWidth="1.5"/>
                <path d="M6 2v4M14 2v4" stroke="var(--accent-turquoise)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="font-display text-2xl font-semibold text-[var(--dark-teal)]">Kanban Studio</h1>
          </div>
          <button
            onClick={onCreateBoard}
            className="flex items-center gap-2 rounded-full bg-[var(--accent-turquoise)] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Board
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Boards" value={data.total_boards} />
          <StatCard label="Total Cards" value={data.total_cards} />
          <StatCard label="Assigned to Me" value={data.cards_assigned_to_me} accent />
          <StatCard label="Overdue" value={data.overdue_cards.length} accent={data.overdue_cards.length > 0} />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--stroke)] bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display text-lg font-semibold text-[var(--dark-teal)]">Recently Active Boards</h2>
            {data.recently_active_boards.length === 0 ? (
              <p className="text-sm text-[var(--gray-text)]">No boards yet. Create your first board to get started.</p>
            ) : (
              <div className="space-y-2">
                {data.recently_active_boards.map((board: RecentlyActiveBoard) => (
                  <button
                    key={board.id}
                    onClick={() => onSelectBoard(board.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[var(--accent-turquoise)] hover:bg-[var(--accent-turquoise)]/5"
                  >
                    <span className="text-sm font-medium text-[var(--dark-teal)]">{board.title}</span>
                    {board.updated_at && (
                      <span className="text-xs text-[var(--gray-text)]">{formatDate(board.updated_at)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--stroke)] bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display text-lg font-semibold text-[var(--dark-teal)]">Overdue Cards</h2>
            {data.overdue_cards.length === 0 ? (
              <p className="text-sm text-[var(--gray-text)]">No overdue cards. You&apos;re on track!</p>
            ) : (
              <div className="space-y-2">
                {data.overdue_cards.map((card: OverdueCard) => (
                  <button
                    key={card.id}
                    onClick={() => onSelectBoard(card.board_id)}
                    className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left transition hover:bg-red-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-red-900">{card.title}</p>
                      <p className="text-xs text-red-600">{card.board_title}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-red-600">{formatDate(card.due_date)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
