import type { Card } from "@/lib/kanban";

export const KanbanCardContent = ({ card }: { card: Card }) => (
  <div className="min-w-0">
    <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
      {card.title}
    </h4>
    <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
      {card.details}
    </p>
  </div>
);
