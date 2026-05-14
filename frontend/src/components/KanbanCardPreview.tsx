import type { Card } from "@/lib/kanban";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="rounded-xl border border-transparent bg-white px-3 py-3 shadow-[0_18px_32px_rgba(3,33,71,0.16)]">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h4 className="font-display text-sm font-semibold text-[var(--dark-teal)]">
          {card.title}
        </h4>
        <p className="mt-1 text-xs leading-5 text-[var(--gray-text)]">
          {card.details}
        </p>
      </div>
    </div>
  </article>
);
