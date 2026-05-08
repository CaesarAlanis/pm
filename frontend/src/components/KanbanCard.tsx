import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { GripVertical, X } from "lucide-react";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
};

export const KanbanCard = ({ card, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, resizeObserverConfig: undefined });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group rounded-xl border border-transparent bg-white px-3 py-3 shadow-[0_2px_8px_rgba(3,33,71,0.07)]",
        "transition-all duration-150",
        isDragging && "opacity-50 shadow-[0_8px_24px_rgba(3,33,71,0.14)]"
      )}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab text-[var(--stroke)] transition hover:text-[var(--gray-text)] active:cursor-grabbing group-hover:text-[var(--gray-text)]"
          aria-label={`Drag ${card.title}`}
        >
          <GripVertical size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-sm font-semibold text-[var(--navy-dark)]">
            {card.title}
          </h4>
          {card.details && (
            <p className="mt-1 text-xs leading-5 text-[var(--gray-text)]">{card.details}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(card.id)}
          className="mt-0.5 shrink-0 rounded-full p-0.5 text-transparent transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)] group-hover:text-[var(--gray-text)]"
          aria-label={`Delete ${card.title}`}
        >
          <X size={12} />
        </button>
      </div>
    </article>
  );
};
