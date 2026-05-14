"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import type { Card, Comment, Assignee, Checklist, ChecklistItem } from "@/lib/kanban";

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

type CardDetailModalProps = {
  card: Card;
  onSave: (cardId: string, title: string, details: string, priority: string, dueDate: string | null, labels: string[]) => Promise<void>;
  onClose: () => void;
  boardId: string;
  currentUsername: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  none: "bg-gray-100 text-gray-500",
  low: "bg-blue-50 text-blue-600",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-red-50 text-red-600",
};

const PRIORITY_LABELS: Record<string, string> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const CardDetailModal = ({ card, onSave, onClose, boardId: _boardId, currentUsername }: CardDetailModalProps) => {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.due_date || "");
  const [labelsInput, setLabelsInput] = useState(card.labels.join(", "));
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "checklists">("details");

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Assignees state
  const [assignees, setAssignees] = useState<Assignee[]>(card.assignees || []);
  const [assignUsername, setAssignUsername] = useState("");

  // Checklists state
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newItemContents, setNewItemContents] = useState<Record<string, string>>({});

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Fetch comments, assignees, and checklists
  useEffect(() => {
    apiFetch<{ comments: Comment[] }>(`/api/boards/cards/${card.id}/comments`)
      .then((d) => setComments(d.comments))
      .catch(() => {});

    apiFetch<{ assignees: Assignee[] }>(`/api/boards/cards/${card.id}/assignees`)
      .then((d) => setAssignees(d.assignees))
      .catch(() => {});

    apiFetch<{ checklists: Checklist[] }>(`/api/boards/cards/${card.id}/checklists`)
      .then((d) => setChecklists(d.checklists))
      .catch(() => {});
  }, [card.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const parsedLabels = labelsInput.split(",").map((l) => l.trim()).filter(Boolean);
      await onSave(
        card.id,
        title.trim(),
        details.trim(),
        priority,
        dueDate || null,
        parsedLabels
      );
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      const result = await apiFetch<Comment>(`/api/boards/cards/${card.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setComments((prev) => [...prev, result]);
      setNewComment("");
    } catch {
      // Silent fail
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiFetch(`/api/boards/comments/${commentId}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // Silent fail
    }
  };

  const handleAssignUser = async () => {
    if (!assignUsername.trim()) return;
    try {
      await apiFetch(`/api/boards/cards/${card.id}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: assignUsername.trim() }),
      });
      setAssignees((prev) => [...prev, { username: assignUsername.trim() }]);
      setAssignUsername("");
    } catch {
      // Silent fail
    }
  };

  const handleUnassignUser = async (username: string) => {
    try {
      await apiFetch(`/api/boards/cards/${card.id}/assignees/${username}`, { method: "DELETE" });
      setAssignees((prev) => prev.filter((a) => a.username !== username));
    } catch {
      // Silent fail
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      const result = await apiFetch<Checklist>(`/api/boards/cards/${card.id}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChecklistTitle.trim() }),
      });
      setChecklists((prev) => [...prev, { ...result, items: [] }]);
      setNewChecklistTitle("");
    } catch {
      // Silent fail
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      await apiFetch(`/api/boards/checklists/${checklistId}`, { method: "DELETE" });
      setChecklists((prev) => prev.filter((cl) => cl.id !== checklistId));
    } catch {
      // Silent fail
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const content = newItemContents[checklistId]?.trim();
    if (!content) return;
    try {
      const result = await apiFetch<ChecklistItem>(`/api/boards/checklists/${checklistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId ? { ...cl, items: [...cl.items, result] } : cl
        )
      );
      setNewItemContents((prev) => ({ ...prev, [checklistId]: "" }));
    } catch {
      // Silent fail
    }
  };

  const handleToggleChecklistItem = async (itemId: string, checklistId: string, checked: boolean) => {
    try {
      await apiFetch(`/api/boards/checklist-items/${itemId}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId
            ? {
                ...cl,
                items: cl.items.map((item) =>
                  item.id === itemId ? { ...item, checked: checked ? 1 : 0 } : item
                ),
              }
            : cl
        )
      );
    } catch {
      // Silent fail
    }
  };

  const handleDeleteChecklistItem = async (itemId: string, checklistId: string) => {
    try {
      await apiFetch(`/api/boards/checklist-items/${itemId}`, { method: "DELETE" });
      setChecklists((prev) =>
        prev.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: cl.items.filter((item) => item.id !== itemId) }
            : cl
        )
      );
    } catch {
      // Silent fail
    }
  };

  const totalChecklistItems = checklists.reduce((sum, cl) => sum + cl.items.length, 0);
  const checkedItems = checklists.reduce((sum, cl) => sum + cl.items.filter((i) => i.checked).length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-[var(--stroke)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--stroke)] px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-[var(--dark-teal)]">Edit Card</h2>
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

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--stroke)] px-6 pt-2">
          {(["details", "comments", "checklists"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === tab
                  ? "bg-[var(--accent-turquoise)]/10 text-[var(--accent-turquoise)]"
                  : "text-[var(--gray-text)] hover:text-[var(--dark-teal)]"
              }`}
            >
              {tab === "details" ? "Details" : tab === "comments" ? `Comments (${comments.length})` : `Checklists (${checkedItems}/${totalChecklistItems})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "details" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                  Title
                </label>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                  Details
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
                  placeholder="Add details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                    Priority
                  </label>
                  <div className="flex gap-1.5">
                    {(["none", "low", "medium", "high"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          priority === p
                            ? PRIORITY_COLORS[p] + " ring-2 ring-current ring-offset-1"
                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                        }`}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                  Labels
                </label>
                <input
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder="design, frontend, urgent"
                  className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
                />
                <p className="mt-1 text-xs text-[var(--gray-text)]">Comma-separated</p>
              </div>

              {/* Assignees Section */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                  Assignees
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {assignees.map((a) => (
                    <span key={a.username} className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-turquoise)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--accent-turquoise)]">
                      {a.username}
                      <button
                        type="button"
                        onClick={() => handleUnassignUser(a.username)}
                        className="rounded-full p-0.5 hover:bg-[var(--accent-turquoise)]/20"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={assignUsername}
                    onChange={(e) => setAssignUsername(e.target.value)}
                    placeholder="Username to assign"
                    className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAssignUser(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleAssignUser}
                    className="rounded-xl bg-[var(--accent-turquoise)] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-[var(--stroke)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--dark-teal)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="rounded-full bg-[var(--accent-turquoise)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "comments" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || commentLoading}
                  className="rounded-xl bg-[var(--accent-turquoise)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  Send
                </button>
              </div>
              <div className="space-y-3">
                {comments.length === 0 && (
                  <p className="text-sm text-[var(--gray-text)] text-center py-8">No comments yet</p>
                )}
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--accent-turquoise)]">{comment.username}</span>
                      <div className="flex items-center gap-1">
                        {comment.created_at && (
                          <span className="text-[10px] text-[var(--gray-text)]">{comment.created_at.slice(0, 16)}</span>
                        )}
                        {comment.username === currentUsername && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="rounded p-1 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
                            aria-label="Delete comment"
                          >
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                              <path d="M2 2h10M5 2V1h4v1M3 2v9a1 1 0 001 1h6a1 1 0 001-1V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--dark-teal)]">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "checklists" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="New checklist title..."
                  className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklist(); } }}
                />
                <button
                  onClick={handleAddChecklist}
                  disabled={!newChecklistTitle.trim()}
                  className="rounded-xl bg-[var(--accent-turquoise)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
              {checklists.map((checklist) => {
                const clChecked = checklist.items.filter((i) => i.checked).length;
                const clTotal = checklist.items.length;
                const pct = clTotal > 0 ? Math.round((clChecked / clTotal) * 100) : 0;
                return (
                  <div key={checklist.id} className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-[var(--dark-teal)]">{checklist.title}</h4>
                        {clTotal > 0 && <span className="text-xs text-[var(--gray-text)]">{pct}%</span>}
                      </div>
                      <button
                        onClick={() => handleDeleteChecklist(checklist.id)}
                        className="rounded p-1 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
                        aria-label="Delete checklist"
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M2 2h10M5 2V1h4v1M3 2v9a1 1 0 001 1h6a1 1 0 001-1V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    {clTotal > 0 && (
                      <div className="mb-2 h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className="h-1.5 rounded-full bg-[var(--accent-turquoise)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      {checklist.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <input
                            type="checkbox"
                            checked={!!item.checked}
                            onChange={(e) => handleToggleChecklistItem(item.id, checklist.id, e.target.checked)}
                            className="h-4 w-4 rounded border-[var(--stroke)] text-[var(--accent-turquoise)] focus:ring-[var(--accent-turquoise)]"
                          />
                          <span className={`flex-1 text-sm ${item.checked ? "line-through text-[var(--gray-text)]" : "text-[var(--dark-teal)]"}`}>
                            {item.content}
                          </span>
                          <button
                            onClick={() => handleDeleteChecklistItem(item.id, checklist.id)}
                            className="hidden rounded p-0.5 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500 group-hover:block"
                            aria-label="Delete item"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={newItemContents[checklist.id] || ""}
                        onChange={(e) => setNewItemContents((prev) => ({ ...prev, [checklist.id]: e.target.value }))}
                        placeholder="Add item..."
                        className="flex-1 rounded-lg border border-[var(--stroke)] bg-white px-3 py-1.5 text-xs outline-none transition focus:border-[var(--accent-turquoise)]"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklistItem(checklist.id); } }}
                      />
                      <button
                        onClick={() => handleAddChecklistItem(checklist.id)}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-[var(--dark-teal)] transition hover:bg-gray-200"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
              {checklists.length === 0 && (
                <p className="text-sm text-[var(--gray-text)] text-center py-8">No checklists yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
