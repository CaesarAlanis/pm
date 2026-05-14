"use client";

import { useState, useEffect, useCallback } from "react";

const CSRF_HEADER = { "X-Requested-With": "fetch" };

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...CSRF_HEADER,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || `API error: ${res.status}`);
  }
  return res.json();
}

type Member = {
  username: string;
  role: string;
  joined_at: string;
};

type Activity = {
  id: string;
  username: string;
  action: string;
  details: string;
  created_at: string;
};

type CollaborationPanelProps = {
  boardId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export const CollaborationPanel = ({ boardId, isOpen, onClose }: CollaborationPanelProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [activeSection, setActiveSection] = useState<"members" | "activity">("members");
  const [error, setError] = useState<string | null>(null);

  const refreshMembers = useCallback(async () => {
    if (!boardId) return;
    try {
      const data = await apiFetch<{ members: Member[] }>(`/api/boards/${boardId}/members`);
      setMembers(data.members);
    } catch {
      // Silent fail
    }
  }, [boardId]);

  useEffect(() => {
    if (!isOpen || !boardId) return;

    let cancelled = false;

    async function load() {
      try {
        const data = await apiFetch<{ members: Member[] }>(`/api/boards/${boardId}/members`);
        if (!cancelled) setMembers(data.members);
      } catch { /* ignore */ }
      try {
        const data = await apiFetch<{ activity: Activity[] }>(`/api/boards/${boardId}/activity`);
        if (!cancelled) setActivity(data.activity);
      } catch { /* ignore */ }
    }

    load();
    return () => { cancelled = true; };
  }, [isOpen, boardId]);

  const handleInvite = async () => {
    if (!boardId || !inviteUsername.trim()) return;
    setError(null);
    try {
      await apiFetch(`/api/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: boardId, username: inviteUsername.trim(), role: inviteRole }),
      });
      setInviteUsername("");
      await refreshMembers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to invite member");
    }
  };

  const handleRemoveMember = async (username: string) => {
    if (!boardId) return;
    try {
      await apiFetch(`/api/boards/${boardId}/members/${username}`, { method: "DELETE" });
      await refreshMembers();
    } catch {
      // Silent fail
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative flex h-full w-full max-w-sm flex-col border-l border-[var(--stroke)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--stroke)] px-5 py-4">
          <h3 className="font-display text-base font-semibold text-[var(--dark-teal)]">Collaboration</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--gray-text)] transition hover:bg-gray-100 hover:text-[var(--dark-teal)]"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-[var(--stroke)] px-5 pt-2">
          <button
            onClick={() => setActiveSection("members")}
            className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              activeSection === "members"
                ? "bg-[var(--accent-turquoise)]/10 text-[var(--accent-turquoise)]"
                : "text-[var(--gray-text)] hover:text-[var(--dark-teal)]"
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveSection("activity")}
            className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              activeSection === "activity"
                ? "bg-[var(--accent-turquoise)]/10 text-[var(--accent-turquoise)]"
                : "text-[var(--gray-text)] hover:text-[var(--dark-teal)]"
            }`}
          >
            Activity
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeSection === "members" && (
            <div className="space-y-4">
              {/* Invite form */}
              <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Invite Member</p>
                {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
                <div className="flex gap-2 mb-2">
                  <input
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="Username"
                    className="flex-1 rounded-lg border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInvite(); } }}
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                    className="rounded-lg border border-[var(--stroke)] bg-white px-2 py-2 text-sm outline-none"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button
                  onClick={handleInvite}
                  disabled={!inviteUsername.trim()}
                  className="w-full rounded-lg bg-[var(--accent-turquoise)] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  Invite
                </button>
              </div>

              {/* Members list */}
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member.username} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-turquoise)]/10 text-xs font-bold text-[var(--accent-turquoise)]">
                        {member.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--dark-teal)]">{member.username}</p>
                        <p className="text-[10px] uppercase tracking-wide text-[var(--gray-text)]">{member.role}</p>
                      </div>
                    </div>
                    {member.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(member.username)}
                        className="rounded p-1 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
                        aria-label={`Remove ${member.username}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M2 2h10M5 2V1h4v1M3 2v9a1 1 0 001 1h6a1 1 0 001-1V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "activity" && (
            <div className="space-y-3">
              {activity.length === 0 && (
                <p className="text-sm text-[var(--gray-text)] text-center py-8">No activity yet</p>
              )}
              {activity.map((act) => (
                <div key={act.id} className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-turquoise)]/10 text-[10px] font-bold text-[var(--accent-turquoise)]">
                      {act.username[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-[var(--dark-teal)]">{act.username}</span>
                    <span className="text-[10px] text-[var(--gray-text)]">{act.created_at.slice(0, 16)}</span>
                  </div>
                  <p className="text-sm text-[var(--dark-teal)]">
                    <span className="font-medium">{act.action}</span>
                    {act.details && <span className="text-[var(--gray-text)]"> — {act.details}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
