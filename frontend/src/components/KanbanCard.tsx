import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

const PRIORITY_INDICATOR: Record<string, string> = {
  none: "",
  low: "bg-blue-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
};

const CARD_TYPE_BADGE: Record<string, string> = {
  task: "bg-blue-50 text-blue-600",
  bug: "bg-red-50 text-red-600",
  story: "bg-green-50 text-green-600",
  epic: "bg-purple-50 text-purple-600",
};

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string) => void;
};

export const KanbanCard = ({ card, onDelete, onEdit }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = card.due_date && new Date(card.due_date) < new Date();
  const wasDragging = useRef(false);

  const handleClick = () => {
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    onEdit(card.id);
  };

  const isDraggingRef = useRef(false);
  // Track drag state via listeners
  const patchedListeners = listeners
    ? {
        ...listeners,
        onPointerDown: (e: React.PointerEvent) => {
          isDraggingRef.current = false;
          listeners.onPointerDown(e as unknown as React.PointerEvent<Element>);
        },
        onPointerMove: (e: React.PointerEvent) => {
          isDraggingRef.current = true;
          wasDragging.current = true;
          listeners.onPointerMove?.(e as unknown as React.PointerEvent<Element>);
        },
        onPointerUp: () => {
          // If we didn't actually move, it wasn't a drag — allow click
          if (!isDraggingRef.current) {
            wasDragging.current = false;
          }
          listeners.onPointerUp?.({} as unknown as React.PointerEvent<Element>);
        },
      }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group rounded-xl border border-transparent bg-white px-3 py-3 shadow-[0_8px_20px_rgba(3,33,71,0.06)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...attributes}
      {...patchedListeners}
      data-testid={`card-${card.id}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            {card.card_type && card.card_type !== "task" && (
              <span className={`inline-flex rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider ${CARD_TYPE_BADGE[card.card_type] || ""}`}>
                {card.card_type}
              </span>
            )}
            {card.priority !== "none" && (
              <span className={`inline-flex h-2 w-2 rounded-full ${PRIORITY_INDICATOR[card.priority]}`} />
            )}
            <h4 className="font-display text-sm font-semibold text-[var(--dark-teal)]">
              {card.title}
            </h4>
          </div>
          <p className="text-xs leading-5 text-[var(--gray-text)] line-clamp-2">
            {card.details}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {card.labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="inline-block rounded-md bg-[var(--accent-turquoise)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-turquoise)]"
              >
                {label}
              </span>
            ))}
            {card.labels.length > 3 && (
              <span className="text-[10px] text-[var(--gray-text)]">+{card.labels.length - 3}</span>
            )}
            {card.due_date && (
              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${isOverdue ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"}`}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1"/>
                  <path d="M1 4h8M3 1v2M7 1v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                {card.due_date}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 rounded-lg p-1.5 text-[var(--gray-text)] opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          aria-label={`Delete ${card.title}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2h10M5 2V1h4v1M3 2v9a1 1 0 001 1h6a1 1 0 001-1V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </article>
  );
};
