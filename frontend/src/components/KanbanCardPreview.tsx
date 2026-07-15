import type { Card } from "@/lib/kanban";
import { KanbanCardContent } from "@/components/KanbanCardContent";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_18px_32px_rgba(3,33,71,0.16)]">
    <KanbanCardContent card={card} />
  </article>
);
