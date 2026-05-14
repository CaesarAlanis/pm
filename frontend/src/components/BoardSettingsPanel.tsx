"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Props = {
  boardId: string;
  onClose: () => void;
  onUpdated?: () => void;
};

export const BoardSettingsPanel = ({ boardId, onClose, onUpdated }: Props) => {
  const [wipLimit, setWipLimit] = useState<number | "">("");
  const [defaultCardType, setDefaultCardType] = useState("task");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ wip_limit: number | null; default_card_type: string | null; description: string }>(`/api/boards/${boardId}`)
      .then((data) => {
        setWipLimit(data.wip_limit ?? "");
        setDefaultCardType(data.default_card_type || "task");
        setDescription(data.description || "");
      })
      .catch(() => {});
  }, [boardId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/api/boards/${boardId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wip_limit: wipLimit === "" ? null : wipLimit,
          default_card_type: defaultCardType,
          description,
        }),
      });
      setMessage("Settings saved");
      onUpdated?.();
    } catch {
      setMessage("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-[420px] rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[var(--dark-teal)]">Board Settings</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--gray-text)] transition hover:bg-gray-100" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">WIP Limit (0 = no limit)</label>
            <input
              type="number"
              min={0}
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
              placeholder="No limit"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Default Card Type</label>
            <select
              value={defaultCardType}
              onChange={(e) => setDefaultCardType(e.target.value)}
              className="w-full rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
            >
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="story">Story</option>
              <option value="epic">Epic</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--stroke)] px-3 py-2 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
              placeholder="Board description..."
            />
          </div>

          {message && (
            <p className={`text-xs font-medium ${message.includes("Failed") ? "text-red-500" : "text-green-600"}`}>{message}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-[var(--accent-turquoise)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};
