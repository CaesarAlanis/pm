"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export type Milestone = {
  id: string;
  name: string;
  description: string;
  due_date: string | null;
  status: "upcoming" | "in_progress" | "completed";
};

type Props = {
  boardId: string;
  onClose: () => void;
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-600",
  in_progress: "bg-amber-50 text-amber-600",
  completed: "bg-green-50 text-green-600",
};

export const MilestoneTracker = ({ boardId, onClose }: Props) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const fetchMilestones = async () => {
    try {
      const data = await apiFetch<{ milestones: Milestone[] }>(`/api/boards/${boardId}/milestones`);
      setMilestones(data.milestones || []);
    } catch {
      setMilestones([]);
    }
  };

  useEffect(() => {
    if (boardId) fetchMilestones();
  }, [boardId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await apiFetch(`/api/boards/${boardId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), due_date: dueDate || null }),
      });
      setName("");
      setDescription("");
      setDueDate("");
      setShowCreate(false);
      fetchMilestones();
    } catch {
      // ignore
    }
  };

  const handleStatusChange = async (milestoneId: string, status: Milestone["status"]) => {
    try {
      await apiFetch(`/api/milestones/${milestoneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchMilestones();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (milestoneId: string) => {
    try {
      await apiFetch(`/api/milestones/${milestoneId}`, { method: "DELETE" });
      fetchMilestones();
    } catch {
      // ignore
    }
  };

  const isOverdue = (m: Milestone) => m.due_date && new Date(m.due_date) < new Date() && m.status !== "completed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="max-h-[80vh] w-[520px] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[var(--dark-teal)]">Milestones</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--gray-text)] transition hover:bg-gray-100" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--stroke)] py-2 text-xs font-semibold uppercase tracking-wide text-[var(--accent-turquoise)] transition hover:border-[var(--accent-turquoise)] hover:bg-[var(--accent-turquoise)]/5"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          New Milestone
        </button>

        {showCreate && (
          <div className="mb-4 space-y-2 rounded-xl border border-[var(--stroke)] bg-gray-50 p-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Milestone name"
              className="w-full rounded-lg border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent-turquoise)]"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded-lg border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent-turquoise)]"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent-turquoise)]"
            />
            <button
              onClick={handleCreate}
              className="w-full rounded-lg bg-[var(--accent-turquoise)] py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Create
            </button>
          </div>
        )}

        {milestones.length === 0 && !showCreate && (
          <p className="py-8 text-center text-sm text-[var(--gray-text)]">No milestones yet. Add one to track progress.</p>
        )}

        <div className="space-y-2">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="group rounded-xl border border-[var(--stroke)] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded px-1 py-px text-[9px] font-bold uppercase ${STATUS_COLORS[milestone.status]}`}>
                      {milestone.status.replace("_", " ")}
                    </span>
                    <h3 className="text-sm font-semibold text-[var(--dark-teal)]">{milestone.name}</h3>
                  </div>
                  {milestone.description && (
                    <p className="mt-1 text-xs text-[var(--gray-text)]">{milestone.description}</p>
                  )}
                  {milestone.due_date && (
                    <p className={`mt-1 text-[10px] font-semibold ${isOverdue(milestone) ? "text-red-500" : "text-[var(--gray-text)]"}`}>
                      Due: {milestone.due_date}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <select
                    value={milestone.status}
                    onChange={(e) => handleStatusChange(milestone.id, e.target.value as Milestone["status"])}
                    className="rounded border border-[var(--stroke)] px-1 py-0.5 text-[10px] outline-none"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    onClick={() => handleDelete(milestone.id)}
                    className="rounded p-1 text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
                    aria-label={`Delete ${milestone.name}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2h8M4.5 2V1h3v1M3 2v8.5a.5.5 0 00.5.5h5a.5.5 0 00.5-.5V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
