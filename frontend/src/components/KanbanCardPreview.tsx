import type { Card } from "@/lib/kanban";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="relative overflow-hidden rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_18px_32px_rgba(3,33,71,0.16)]">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1 pr-1">
        <h4 className="font-display text-base font-semibold leading-snug text-[var(--navy-dark)] break-words">
          {card.title}
        </h4>
        <p className="mt-2 text-sm leading-6 text-[var(--gray-text)] break-words">
          {card.details}
        </p>
      </div>
    </div>
  </article>
);
