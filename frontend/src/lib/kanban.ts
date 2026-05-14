export type Card = {
  id: string;
  title: string;
  details: string;
  priority: "none" | "low" | "medium" | "high";
  due_date: string | null;
  labels: string[];
  assignees?: Assignee[];
  story_points?: number | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  card_type?: "task" | "bug" | "story" | "epic";
  sprint_id?: string | null;
};

export type Comment = {
  id: string;
  card_id: string;
  username: string;
  content: string;
  created_at?: string;
  updated_at?: string | null;
};

export type Assignee = {
  username: string;
  assigned_at?: string;
};

export type Checklist = {
  id: string;
  card_id: string;
  title: string;
  position: number;
  items: ChecklistItem[];
};

export type ChecklistItem = {
  id: string;
  checklist_id: string;
  content: string;
  checked: number;
  position: number;
};

export type Attachment = {
  id: string;
  filename: string;
  file_size: number;
  content_type: string;
  uploaded_by: string;
  created_at: string;
};

export type CardLink = {
  id: string;
  source_card_id: string;
  target_card_id: string;
  link_type: "blocked_by" | "relates_to";
  target_title?: string;
  source_title?: string;
  direction?: "outgoing" | "incoming";
  created_at: string;
};

export type TimeLog = {
  id: string;
  user_id: string;
  username?: string;
  hours: number;
  note: string;
  logged_at: string;
};

export type Notification = {
  id: string;
  board_id: string;
  board_title: string;
  action: string;
  details: string;
  read: number;
  created_at: string;
};

export type BoardTemplate = {
  id: string;
  name: string;
  description: string;
  columns: string[];
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardSummary = {
  id: string;
  title: string;
  created_at: string;
};

export type BoardData = {
  id: string;
  title: string;
  columns: Column[];
  cards: Record<string, Card>;
};

export type DashboardData = {
  total_boards: number;
  total_cards: number;
  cards_assigned_to_me: number;
  overdue_cards: OverdueCard[];
  recently_active_boards: RecentlyActiveBoard[];
};

export type OverdueCard = {
  id: string;
  title: string;
  due_date: string;
  board_id: string;
  board_title: string;
};

export type RecentlyActiveBoard = {
  id: string;
  title: string;
  updated_at: string | null;
};

export type UserListItem = {
  id: string;
  username: string;
  created_at: string;
  board_count: number;
};

export const initialData: BoardData = {
  id: "",
  title: "",
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    {
      id: "col-progress",
      title: "In Progress",
      cardIds: ["card-4", "card-5"],
    },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": {
      id: "card-1",
      title: "Align roadmap themes",
      details: "Draft quarterly themes with impact statements and metrics.",
      priority: "high",
      due_date: null,
      labels: ["strategy", "roadmap"],
    },
    "card-2": {
      id: "card-2",
      title: "Gather customer signals",
      details: "Review support tags, sales notes, and churn feedback.",
      priority: "medium",
      due_date: null,
      labels: ["research"],
    },
    "card-3": {
      id: "card-3",
      title: "Prototype analytics view",
      details: "Sketch initial dashboard layout and key drill-downs.",
      priority: "medium",
      due_date: null,
      labels: ["design", "analytics"],
    },
    "card-4": {
      id: "card-4",
      title: "Refine status language",
      details: "Standardize column labels and tone across the board.",
      priority: "low",
      due_date: null,
      labels: ["ux"],
    },
    "card-5": {
      id: "card-5",
      title: "Design card layout",
      details: "Add hierarchy and spacing for scanning dense lists.",
      priority: "high",
      due_date: null,
      labels: ["design"],
    },
    "card-6": {
      id: "card-6",
      title: "QA micro-interactions",
      details: "Verify hover, focus, and loading states.",
      priority: "medium",
      due_date: null,
      labels: ["qa"],
    },
    "card-7": {
      id: "card-7",
      title: "Ship marketing page",
      details: "Final copy approved and asset pack delivered.",
      priority: "none",
      due_date: null,
      labels: ["marketing"],
    },
    "card-8": {
      id: "card-8",
      title: "Close onboarding sprint",
      details: "Document release notes and share internally.",
      priority: "none",
      due_date: null,
      labels: [],
    },
  },
};

const isColumnId = (columns: Column[], id: string) =>
  columns.some((column) => column.id === id);

const findColumnId = (columns: Column[], id: string) => {
  if (isColumnId(columns, id)) {
    return id;
  }
  return columns.find((column) => column.cardIds.includes(id))?.id;
};

export const moveCard = (
  columns: Column[],
  activeId: string,
  overId: string
): Column[] => {
  const activeColumnId = findColumnId(columns, activeId);
  const overColumnId = findColumnId(columns, overId);

  if (!activeColumnId || !overColumnId) {
    return columns;
  }

  const activeColumn = columns.find((column) => column.id === activeColumnId);
  const overColumn = columns.find((column) => column.id === overColumnId);

  if (!activeColumn || !overColumn) {
    return columns;
  }

  const isOverColumn = isColumnId(columns, overId);

  if (activeColumnId === overColumnId) {
    if (isOverColumn) {
      const nextCardIds = activeColumn.cardIds.filter(
        (cardId) => cardId !== activeId
      );
      nextCardIds.push(activeId);
      return columns.map((column) =>
        column.id === activeColumnId
          ? { ...column, cardIds: nextCardIds }
          : column
      );
    }

    const oldIndex = activeColumn.cardIds.indexOf(activeId);
    const newIndex = activeColumn.cardIds.indexOf(overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return columns;
    }

    const nextCardIds = [...activeColumn.cardIds];
    nextCardIds.splice(oldIndex, 1);
    nextCardIds.splice(newIndex, 0, activeId);

    return columns.map((column) =>
      column.id === activeColumnId
        ? { ...column, cardIds: nextCardIds }
        : column
    );
  }

  const activeIndex = activeColumn.cardIds.indexOf(activeId);
  if (activeIndex === -1) {
    return columns;
  }

  const nextActiveCardIds = [...activeColumn.cardIds];
  nextActiveCardIds.splice(activeIndex, 1);

  const nextOverCardIds = [...overColumn.cardIds];
  if (isOverColumn) {
    nextOverCardIds.push(activeId);
  } else {
    const overIndex = overColumn.cardIds.indexOf(overId);
    const insertIndex = overIndex === -1 ? nextOverCardIds.length : overIndex;
    nextOverCardIds.splice(insertIndex, 0, activeId);
  }

  return columns.map((column) => {
    if (column.id === activeColumnId) {
      return { ...column, cardIds: nextActiveCardIds };
    }
    if (column.id === overColumnId) {
      return { ...column, cardIds: nextOverCardIds };
    }
    return column;
  });
};

export const createId = (prefix: string) => {
  return `${prefix}-${crypto.randomUUID()}`;
};

type ApiColumn = {
  id: string;
  title: string;
  position: number;
  cards: { id: string; title: string; details: string; position: number; priority: string; due_date: string | null; labels: string; card_type?: string }[];
};

type ApiBoard = {
  id: string;
  title: string;
  columns: ApiColumn[];
};

export const apiToBoardData = (api: ApiBoard): BoardData => {
  const cards: Record<string, Card> = {};
  const columns: Column[] = api.columns
    .sort((a, b) => a.position - b.position)
    .map((col) => ({
      id: col.id,
      title: col.title,
      cardIds: col.cards
        .sort((a, b) => a.position - b.position)
        .map((card) => {
          cards[card.id] = {
            id: card.id,
            title: card.title,
            details: card.details,
            priority: (card.priority as Card["priority"]) || "none",
            due_date: card.due_date || null,
            labels: card.labels ? card.labels.split(",").filter(Boolean) : [],
            card_type: (card.card_type as Card["card_type"]) || "task",
          };
          return card.id;
        }),
    }));
  return { id: api.id, title: api.title, columns, cards };
};
