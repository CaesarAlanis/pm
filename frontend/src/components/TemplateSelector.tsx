"use client";

import { useState, useEffect } from "react";
import type { BoardTemplate } from "@/lib/kanban";
import { apiFetch } from "@/lib/api";

type TemplateSelectorProps = {
  onSelect: (templateId: string | null, title: string) => void;
  onClose: () => void;
};

const TEMPLATE_ICONS: Record<string, string> = {
  "tmpl-kanban": "M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z",
  "tmpl-scrum": "M3 3h10v2H3zM3 7h7v2H3zM3 11h4v2H3z",
  "tmpl-bug": "M8 2a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1h3zM4 10l-2 2M6 10v4M8 10l2 2",
};

export const TemplateSelector = ({ onSelect, onClose }: TemplateSelectorProps) => {
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [customTitle, setCustomTitle] = useState("");

  useEffect(() => {
    apiFetch<{ templates: BoardTemplate[] }>("/api/templates")
      .then((d) => setTemplates(d.templates))
      .catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[var(--stroke)] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-semibold text-[var(--dark-teal)]">Create Board</h2>
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

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
            Board Title (optional)
          </label>
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="My Board"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--accent-turquoise)]"
          />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Choose a Template</p>

        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id, customTitle || template.name)}
              className="flex w-full items-start gap-3 rounded-xl border border-[var(--stroke)] bg-white p-4 text-left transition hover:border-[var(--accent-turquoise)] hover:bg-[var(--accent-turquoise)]/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-turquoise)]/10">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d={TEMPLATE_ICONS[template.id] || "M3 3h10v10H3z"} stroke="var(--accent-turquoise)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold text-[var(--dark-teal)]">{template.name}</p>
                <p className="text-xs text-[var(--gray-text)]">{template.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {template.columns.map((col) => (
                    <span key={col} className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--gray-text)]">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}

          <button
            onClick={() => onSelect(null, customTitle || "New Board")}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-[var(--stroke)] p-4 text-left transition hover:border-[var(--accent-turquoise)] hover:bg-[var(--accent-turquoise)]/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="var(--gray-text)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-[var(--gray-text)]">Blank Board</p>
              <p className="text-xs text-[var(--gray-text)]">Start with default columns</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
