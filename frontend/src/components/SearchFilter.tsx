"use client";

import { useState } from "react";
import type { Card, Column } from "@/lib/kanban";

type SearchFilterProps = {
  columns: Column[];
  cards: Record<string, Card>;
  onFilter: (filteredCardIds: Set<string>) => void;
};

export const SearchFilter = ({ columns, cards, onFilter }: SearchFilterProps) => {
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [cardTypeFilter, setCardTypeFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);

  const allCardIds = columns.flatMap((col) => col.cardIds);

  const applyFilter = (searchQuery: string, priority: string, cardType: string) => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = new Set<string>();

    for (const cardId of allCardIds) {
      const card = cards[cardId];
      if (!card) continue;

      const matchesQuery = !q || (
        card.title.toLowerCase().includes(q) ||
        card.details.toLowerCase().includes(q) ||
        card.labels.some((l) => l.toLowerCase().includes(q))
      );

      const matchesPriority = priority === "all" || card.priority === priority;
      const matchesCardType = cardType === "all" || (card.card_type || "task") === cardType;

      if (matchesQuery && matchesPriority && matchesCardType) {
        filtered.add(cardId);
      }
    }

    onFilter(filtered);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    applyFilter(value, priorityFilter, cardTypeFilter);
  };

  const handlePriorityChange = (value: string) => {
    setPriorityFilter(value);
    applyFilter(query, value, cardTypeFilter);
  };

  const handleCardTypeChange = (value: string) => {
    setCardTypeFilter(value);
    applyFilter(query, priorityFilter, value);
  };

  const handleClear = () => {
    setQuery("");
    setPriorityFilter("all");
    setCardTypeFilter("all");
    onFilter(new Set(allCardIds));
  };

  const hasActiveFilter = query || priorityFilter !== "all" || cardTypeFilter !== "all";

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="var(--gray-text)" strokeWidth="1.5"/>
            <path d="M9.5 9.5L13 13" stroke="var(--gray-text)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search cards..."
            className="w-48 rounded-full border border-[var(--stroke)] bg-white py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-[var(--accent-turquoise)] focus:w-64"
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
            hasActiveFilter
              ? "border-[var(--accent-turquoise)] bg-[var(--accent-turquoise)]/10 text-[var(--accent-turquoise)]"
              : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-[var(--accent-turquoise)]"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 3h9M3 6h6M4.5 9h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Filter
        </button>
        {hasActiveFilter && (
          <button
            onClick={handleClear}
            className="rounded-full p-1 text-[var(--gray-text)] transition hover:bg-gray-100 hover:text-[var(--dark-teal)]"
            aria-label="Clear filters"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[var(--stroke)] bg-white p-3 shadow-lg z-30">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Priority</p>
          <div className="space-y-1">
            {[
              { value: "all", label: "All Priorities" },
              { value: "high", label: "High", color: "bg-red-400" },
              { value: "medium", label: "Medium", color: "bg-amber-400" },
              { value: "low", label: "Low", color: "bg-blue-400" },
              { value: "none", label: "No Priority", color: "bg-gray-300" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePriorityChange(opt.value)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-gray-50 ${
                  priorityFilter === opt.value ? "font-semibold text-[var(--dark-teal)]" : "text-[var(--gray-text)]"
                }`}
              >
                {opt.color && <span className={`inline-flex h-2 w-2 rounded-full ${opt.color}`} />}
                {opt.label}
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-[var(--stroke)] pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">Card Type</p>
            <div className="space-y-1">
              {[
                { value: "all", label: "All Types" },
                { value: "task", label: "Task", color: "bg-blue-400" },
                { value: "bug", label: "Bug", color: "bg-red-400" },
                { value: "story", label: "Story", color: "bg-green-400" },
                { value: "epic", label: "Epic", color: "bg-purple-400" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleCardTypeChange(opt.value)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-gray-50 ${
                    cardTypeFilter === opt.value ? "font-semibold text-[var(--dark-teal)]" : "text-[var(--gray-text)]"
                  }`}
                >
                  {opt.color && <span className={`inline-flex h-2 w-2 rounded-full ${opt.color}`} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
