"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import type { Card, Comment, Assignee, Checklist, ChecklistItem, Attachment, CardLink, TimeLog } from "@/lib/kanban";
import { apiFetch } from "@/lib/api";

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

const CARD_TYPE_COLORS: Record<string, string> = {
  task: "bg-blue-50 text-blue-600",
  bug: "bg-red-50 text-red-600",
  story: "bg-green-50 text-green-600",
  epic: "bg-purple-50 text-purple-600",
};

export const CardDetailModal = ({ card, onSave, onClose, boardId: _boardId, currentUsername }: CardDetailModalProps) => {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.due_date || "");
  const [labelsInput, setLabelsInput] = useState(card.labels.join(", "));
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "checklists" | "attachments" | "links" | "time">("details");

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

  // Details extras
  const [storyPoints, setStoryPoints] = useState(card.story_points ?? null);
  const [estimatedHours, setEstimatedHours] = useState(card.estimated_hours ?? null);
  const [cardType, setCardType] = useState(card.card_type || "task");

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Links state
  const [cardLinks, setCardLinks] = useState<CardLink[]>([]);
  const [newLinkCardTitle, setNewLinkCardTitle] = useState("");
  const [newLinkType, setNewLinkType] = useState<"blocked_by" | "relates_to">("relates_to");

  // Time tracking state
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [logHours, setLogHours] = useState("");
  const [logNote, setLogNote] = useState("");

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

    apiFetch<{ attachments: Attachment[] }>(`/api/boards/cards/${card.id}/attachments`)
      .then((d) => setAttachments(d.attachments))
      .catch(() => {});

    apiFetch<{ links: CardLink[] }>(`/api/boards/cards/${card.id}/links`)
      .then((d) => setCardLinks(d.links))
      .catch(() => {});

    apiFetch<{ logs: TimeLog[] }>(`/api/boards/cards/${card.id}/time`)
      .then((d) => setTimeLogs(d.logs))
      .catch(() => {});
  }, [card.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const parsedLabels = labelsInput.split(",").map((l) => l.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        title: title.trim(),
        details: details.trim(),
        priority,
        due_date: dueDate || null,
        labels: parsedLabels.join(","),
        story_points: storyPoints,
        estimated_hours: estimatedHours,
        card_type: cardType,
      };
      await apiFetch(`/api/boards/cards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--stroke)] px-6 pt-2">
          {(["details", "comments", "checklists", "attachments", "links", "time"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === tab
                  ? "bg-[var(--accent-turquoise)]/10 text-[var(--accent-turquoise)]"
                  : "text-[var(--gray-text)] hover:text-[var(--dark-teal)]"
              }`}
            >
              {tab === "details" ? "Details" : tab === "comments" ? `Comments (${comments.length})` : tab === "checklists" ? `Checklists (${checkedItems}/${totalChecklistItems})` : tab === "attachments" ? `Files (${attachments.length})` : tab === "links" ? `Links (${cardLinks.length})` : `Time (${timeLogs.reduce((s, t) => s + t.hours, 0).toFixed(1)}h)`}
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
                    Card Type
                  </label>
                  <div className="flex gap-1.5">
                    {(["task", "bug", "story", "epic"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCardType(t)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition ${
                          cardType === t
                            ? CARD_TYPE_COLORS[t] + " ring-2 ring-current ring-offset-1"
                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                    Story Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={storyPoints ?? ""}
                    onChange={(e) => setStoryPoints(e.target.value ? Number(e.target.value) : null)}
                    placeholder="--"
                    className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimatedHours ?? ""}
                    onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : null)}
                    placeholder="--"
                    className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm text-[var(--dark-teal)] outline-none transition focus:border-[var(--accent-turquoise)]"
                  />
                </div>
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

          {activeTab === "attachments" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                  Upload File
                </label>
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const result = await apiFetch<Attachment>(`/api/boards/cards/${card.id}/attachments`, {
                        method: "POST",
                        body: formData,
                      });
                      setAttachments((prev) => [...prev, result]);
                      e.target.value = "";
                    } catch { /* silent */ }
                  }}
                  className="text-sm text-[var(--gray-text)] file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--accent-turquoise)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:brightness-110"
                />
              </div>
              {attachments.length === 0 && (
                <p className="text-sm text-[var(--gray-text)] text-center py-8">No attachments yet</p>
              )}
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--dark-teal)]">{att.filename}</p>
                      <p className="text-xs text-[var(--gray-text)]">{(att.file_size / 1024).toFixed(1)} KB &middot; {att.uploaded_by}</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/boards/cards/${card.id}/attachments/${att.id}`, { method: "DELETE" });
                          setAttachments((prev) => prev.filter((a) => a.id !== att.id));
                        } catch { /* silent */ }
                      }}
                      className="shrink-0 rounded p-1 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Delete attachment"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2h10M5 2V1h4v1M3 2v9a1 1 0 001 1h6a1 1 0 001-1V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "links" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={newLinkCardTitle}
                  onChange={(e) => setNewLinkCardTitle(e.target.value)}
                  placeholder="Card ID to link..."
                  className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
                />
                <select
                  value={newLinkType}
                  onChange={(e) => setNewLinkType(e.target.value as "blocked_by" | "relates_to")}
                  className="rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="relates_to">Relates to</option>
                  <option value="blocked_by">Blocked by</option>
                </select>
                <button
                  onClick={async () => {
                    if (!newLinkCardTitle.trim()) return;
                    try {
                      const result = await apiFetch<CardLink>(`/api/boards/cards/${card.id}/links`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ target_card_id: newLinkCardTitle.trim(), link_type: newLinkType }),
                      });
                      setCardLinks((prev) => [...prev, result]);
                      setNewLinkCardTitle("");
                    } catch { /* silent */ }
                  }}
                  className="rounded-xl bg-[var(--accent-turquoise)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Link
                </button>
              </div>
              {cardLinks.length === 0 && (
                <p className="text-sm text-[var(--gray-text)] text-center py-8">No links yet</p>
              )}
              <div className="space-y-2">
                {cardLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${link.link_type === "blocked_by" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                        {link.link_type === "blocked_by" ? "Blocked by" : "Relates to"}
                      </span>
                      <span className="text-sm text-[var(--dark-teal)]">
                        {link.target_title || link.source_title || link.target_card_id.slice(0, 12)}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/boards/cards/${card.id}/links/${link.id}`, { method: "DELETE" });
                          setCardLinks((prev) => prev.filter((l) => l.id !== link.id));
                        } catch { /* silent */ }
                      }}
                      className="rounded p-1 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove link"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2h10M5 2V1h4v1M3 2v9a1 1 0 001 1h6a1 1 0 001-1V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "time" && (
            <div className="space-y-4">
              {(estimatedHours != null || timeLogs.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Estimated</p>
                    <p className="font-display text-xl font-bold text-[var(--dark-teal)]">{estimatedHours ?? "--"}h</p>
                  </div>
                  <div className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Logged</p>
                    <p className="font-display text-xl font-bold text-[var(--accent-turquoise)]">{timeLogs.reduce((s, t) => s + t.hours, 0).toFixed(1)}h</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  placeholder="Hours"
                  className="w-24 rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
                />
                <input
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
                />
                <button
                  onClick={async () => {
                    const hours = parseFloat(logHours);
                    if (!hours || hours <= 0) return;
                    try {
                      const result = await apiFetch<TimeLog>(`/api/boards/cards/${card.id}/time`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ hours, note: logNote.trim() }),
                      });
                      setTimeLogs((prev) => [...prev, result]);
                      setLogHours("");
                      setLogNote("");
                    } catch { /* silent */ }
                  }}
                  className="rounded-xl bg-[var(--accent-turquoise)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Log
                </button>
              </div>
              {timeLogs.length === 0 && (
                <p className="text-sm text-[var(--gray-text)] text-center py-8">No time logged yet</p>
              )}
              <div className="space-y-2">
                {timeLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--dark-teal)]">{log.hours}h &middot; {log.username || log.user_id.slice(0, 8)}</p>
                      {log.note && <p className="text-xs text-[var(--gray-text)]">{log.note}</p>}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/boards/cards/${card.id}/time/${log.id}`, { method: "DELETE" });
                          setTimeLogs((prev) => prev.filter((t) => t.id !== log.id));
                        } catch { /* silent */ }
                      }}
                      className="rounded p-1 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Delete time log"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2h10M5 2V1h4v1M3 2v9a1 1 0 001 1h6a1 1 0 001-1V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
