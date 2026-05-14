"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export type Sprint = {
  id: string;
  name: string;
  goal: string;
  start_date: string | null;
  end_date: string | null;
  status: "planning" | "active" | "completed";
};

type Props = {
  boardId: string;
  currentSprintId?: string | null;
  onSelectSprint: (sprintId: string | null) => void;
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-50 text-blue-600",
  active: "bg-green-50 text-green-600",
  completed: "bg-gray-50 text-gray-500",
};

export const SprintSelector = ({ boardId, currentSprintId, onSelectSprint }: Props) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const fetchSprints = async () => {
    try {
      const data = await apiFetch<{ sprints: Sprint[] }>(`/api/boards/${boardId}/sprints`);
      setSprints(data.sprints || []);
    } catch {
      setSprints([]);
    }
  };

  useEffect(() => {
    if (boardId) fetchSprints();
  }, [boardId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await apiFetch(`/api/boards/${boardId}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), goal: goal.trim(), start_date: startDate || null, end_date: endDate || null }),
      });
      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
      setShowCreate(false);
      fetchSprints();
    } catch {
      // ignore
    }
  };

  const handleStatusChange = async (sprintId: string, status: Sprint["status"]) => {
    try {
      await apiFetch(`/api/sprints/${sprintId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchSprints();
    } catch {
      // ignore
    }
  };

  const activeSprint = sprints.find((s) => s.status === "active");

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:border-[var(--accent-turquoise)] hover:text-[var(--accent-turquoise)]"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v4M7 9v4M1 7h4M9 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        {currentSprintId ? sprints.find((s) => s.id === currentSprintId)?.name || "Sprint" : "Sprints"}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-[var(--stroke)] bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Sprints</p>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-lg p-1 text-[var(--accent-turquoise)] transition hover:bg-[var(--accent-turquoise)]/10"
              aria-label="New sprint"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {showCreate && (
            <div className="mb-3 space-y-2 rounded-xl border border-[var(--stroke)] bg-gray-50 p-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sprint name"
                className="w-full rounded-lg border border-[var(--stroke)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent-turquoise)]"
              />
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Goal (optional)"
                className="w-full rounded-lg border border-[var(--stroke)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent-turquoise)]"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--stroke)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent-turquoise)]"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--stroke)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent-turquoise)]"
                />
              </div>
              <button
                onClick={handleCreate}
                className="w-full rounded-lg bg-[var(--accent-turquoise)] py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                Create Sprint
              </button>
            </div>
          )}

          <button
            onClick={() => { onSelectSprint(null); setIsOpen(false); }}
            className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-gray-50 ${!currentSprintId ? "font-semibold text-[var(--dark-teal)]" : "text-[var(--gray-text)]"}`}
          >
            All Cards
          </button>

          {sprints.length === 0 && !showCreate && (
            <p className="py-4 text-center text-xs text-[var(--gray-text)]">No sprints yet</p>
          )}

          {sprints.map((sprint) => (
            <div key={sprint.id} className="group">
              <div
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition cursor-pointer hover:bg-gray-50 ${currentSprintId === sprint.id ? "bg-[var(--accent-turquoise)]/10 font-semibold text-[var(--dark-teal)]" : "text-[var(--gray-text)]"}`}
                onClick={() => { onSelectSprint(sprint.id); setIsOpen(false); }}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded px-1 py-px text-[9px] font-bold uppercase ${STATUS_COLORS[sprint.status]}`}>
                    {sprint.status}
                  </span>
                  <span className="truncate">{sprint.name}</span>
                </div>
                <select
                  value={sprint.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleStatusChange(sprint.id, e.target.value as Sprint["status"])}
                  className="rounded border border-[var(--stroke)] px-1 py-0.5 text-[9px] outline-none opacity-0 transition group-hover:opacity-100"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          ))}

          {activeSprint && (
            <div className="mt-2 border-t border-[var(--stroke)] pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-text)]">Active Sprint</p>
              <p className="mt-0.5 text-xs font-medium text-[var(--dark-teal)]">{activeSprint.name}</p>
              {activeSprint.goal && <p className="text-[10px] text-[var(--gray-text)]">{activeSprint.goal}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
