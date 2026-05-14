"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";
import { apiFetch } from "@/lib/api";

type BoardStats = {
  total_cards: number;
  cards_by_column: { id: string; title: string; card_count: number }[];
  cards_by_priority: Record<string, number>;
  completion_rate: number;
  overdue_count: number;
  total_story_points: number;
  completed_story_points: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  cards_created_this_week: number;
};

type VelocityPoint = {
  week: string;
  cards_completed: number;
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#3b82f6",
  none: "#9ca3af",
};

type Props = {
  boardId: string;
  onClose: () => void;
};

export const BoardAnalyticsPanel = ({ boardId, onClose }: Props) => {
  const [stats, setStats] = useState<BoardStats | null>(null);
  const [velocity, setVelocity] = useState<VelocityPoint[]>([]);
  const [tab, setTab] = useState<"overview" | "velocity">("overview");

  useEffect(() => {
    apiFetch<BoardStats>(`/api/analytics/board/${boardId}`).then(setStats).catch(() => {});
    apiFetch<{ velocity: VelocityPoint[] }>(`/api/analytics/board/${boardId}/velocity`).then((d) => setVelocity(d.velocity)).catch(() => {});
  }, [boardId]);

  if (!stats) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
        <div className="rounded-2xl bg-white p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-[var(--gray-text)]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const priorityData = Object.entries(stats.cards_by_priority).map(([name, value]) => ({ name, value }));
  const completionPct = Math.round(stats.completion_rate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="max-h-[90vh] w-[780px] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[var(--dark-teal)]">Board Analytics</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--gray-text)] transition hover:bg-gray-100" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button onClick={() => setTab("overview")} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${tab === "overview" ? "bg-[var(--accent-turquoise)] text-white" : "bg-gray-100 text-[var(--gray-text)]"}`}>Overview</button>
          <button onClick={() => setTab("velocity")} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${tab === "velocity" ? "bg-[var(--accent-turquoise)] text-white" : "bg-gray-100 text-[var(--gray-text)]"}`}>Velocity</button>
        </div>

        {tab === "overview" && (
          <>
            <div className="mb-6 grid grid-cols-4 gap-3">
              {[
                { label: "Total Cards", value: stats.total_cards },
                { label: "Completed", value: `${completionPct}%` },
                { label: "Overdue", value: stats.overdue_count },
                { label: "This Week", value: stats.cards_created_this_week },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3 text-center">
                  <p className="text-xl font-bold text-[var(--dark-teal)]">{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-text)]">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-6">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Cards by Column</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.cards_by_column}>
                    <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="card_count" fill="var(--accent-turquoise)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">By Priority</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                      {priorityData.map((entry) => (
                        <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || "#9ca3af"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--stroke)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-text)]">Story Points</p>
                <p className="mt-1 text-lg font-bold text-[var(--dark-teal)]">{stats.completed_story_points} / {stats.total_story_points}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-[var(--accent-turquoise)] transition-all" style={{ width: `${stats.total_story_points ? Math.round(stats.completed_story_points / stats.total_story_points * 100) : 0}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-[var(--stroke)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-text)]">Hours (Est / Actual)</p>
                <p className="mt-1 text-lg font-bold text-[var(--dark-teal)]">{stats.total_estimated_hours}h / {stats.total_actual_hours}h</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${stats.total_estimated_hours ? Math.min(100, Math.round(stats.total_actual_hours / stats.total_estimated_hours * 100)) : 0}%` }} />
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "velocity" && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Cards Completed per Week</h3>
            {velocity.length === 0 ? (
              <p className="py-12 text-center text-sm text-[var(--gray-text)]">No velocity data yet. Complete cards to see trends.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={velocity}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cards_completed" stroke="var(--accent-turquoise)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
