"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { UserListItem } from "@/lib/kanban";

type UserManagementPanelProps = {
  onClose: () => void;
};

export const UserManagementPanel = ({ onClose }: UserManagementPanelProps) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ users: UserListItem[]; total: number }>("/api/auth/users")
      .then((data) => setUsers(data.users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()))
    : users;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-[var(--stroke)] bg-white shadow-[var(--shadow)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--stroke)] px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-[var(--dark-teal)]">Users</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[var(--gray-text)] transition hover:text-[var(--dark-teal)]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
          />
        </div>

        <div className="max-h-80 overflow-y-auto px-6 pb-6">
          {loading ? (
            <p className="py-4 text-center text-sm text-[var(--gray-text)]">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--gray-text)]">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--stroke)] text-left text-xs font-semibold uppercase tracking-[0.1em] text-[var(--gray-text)]">
                  <th className="pb-2">Username</th>
                  <th className="pb-2">Boards</th>
                  <th className="pb-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--stroke)] last:border-0">
                    <td className="py-3 font-medium text-[var(--dark-teal)]">{user.username}</td>
                    <td className="py-3 text-[var(--gray-text)]">{user.board_count}</td>
                    <td className="py-3 text-[var(--gray-text)]">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
