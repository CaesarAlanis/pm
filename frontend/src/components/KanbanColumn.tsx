import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  colorAccent: string;
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  colorAccent,
  onRename,
  onAddCard,
  onDeleteCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex h-full min-w-[200px] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--stroke)] bg-[var(--surface-strong)] shadow-[var(--shadow)] transition-shadow",
        isOver && "ring-2 ring-[var(--accent-yellow)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="h-1 shrink-0" style={{ backgroundColor: colorAccent }} />

      <div className="shrink-0 px-4 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: colorAccent }}
          >
            {cards.length}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            cards
          </span>
        </div>
        <input
          value={column.title}
          onChange={(event) => onRename(column.id, event.target.value)}
          className="mt-2 w-full bg-transparent font-display text-sm font-semibold text-[var(--navy-dark)] outline-none"
          aria-label="Column title"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2.5 pb-2">
            {cards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              />
            ))}
          </div>
        </SortableContext>
        {cards.length === 0 && (
          <div className="my-2 flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--stroke)] px-3 py-6 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Drop here
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pb-3 pt-1">
        <NewCardForm onAdd={(title, details) => onAddCard(column.id, title, details)} />
      </div>
    </section>
  );
};
