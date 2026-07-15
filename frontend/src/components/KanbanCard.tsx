import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";
import { TrashIcon } from "@/components/icons";
import { KanbanCardContent } from "@/components/KanbanCardContent";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
};

export const KanbanCard = ({ card, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <KanbanCardContent card={card} />
        <button
          type="button"
          onClick={() => onDelete(card.id)}
          className="shrink-0 rounded-full border border-transparent p-1.5 text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:bg-red-50 hover:text-red-600"
          aria-label={`Delete ${card.title}`}
          title="Delete card"
        >
          <TrashIcon />
        </button>
      </div>
    </article>
  );
};
