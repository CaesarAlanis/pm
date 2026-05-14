import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onEditCard: (cardId: string) => void;
  onDeleteColumn: () => void;
};

export const KanbanColumn = ({
  column,
  cards,
  onRename,
  onAddCard,
  onDeleteCard,
  onEditCard,
  onDeleteColumn,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [showMenu, setShowMenu] = useState(false);

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[520px] flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow)] transition",
        isOver && "ring-2 ring-[var(--accent-turquoise)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-8 rounded-full bg-[var(--accent-turquoise)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              {cards.length} cards
            </span>
          </div>
          <input
            value={column.title}
            onChange={(event) => onRename(column.id, event.target.value)}
            className="mt-2 w-full bg-transparent font-display text-base font-semibold text-[var(--dark-teal)] outline-none"
            aria-label="Column title"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-1.5 text-[var(--gray-text)] opacity-0 transition hover:bg-gray-100 hover:text-[var(--dark-teal)] group-hover:opacity-100"
            style={{ opacity: showMenu ? 1 : undefined }}
            aria-label="Column menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-[var(--stroke)] bg-white p-1 shadow-lg">
                <button
                  onClick={() => { onDeleteColumn(); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2h10M5 2V1h4v1M3 2v9a1 1 0 001 1h6a1 1 0 001-1V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Delete column
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              onEdit={onEditCard}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--stroke)] px-3 py-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Drop a card here
          </div>
        )}
      </div>
      <NewCardForm
        onAdd={(title, details) => onAddCard(column.id, title, details)}
      />
    </section>
  );
};
