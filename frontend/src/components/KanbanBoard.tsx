"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { ChatSidebar } from "@/components/ChatSidebar";
import { BoardList, type BoardSummary } from "@/components/BoardList";
import { CardDetailModal } from "@/components/CardDetailModal";
import { CollaborationPanel } from "@/components/CollaborationPanel";
import { NotificationBell } from "@/components/NotificationBell";
import { UserProfile } from "@/components/UserProfile";
import { TemplateSelector } from "@/components/TemplateSelector";
import { SearchFilter } from "@/components/SearchFilter";
import { createId, initialData, moveCard, apiToBoardData, type BoardData, type Card, type Column } from "@/lib/kanban";
import { useAuth } from "@/lib/auth";

const CSRF_HEADER = { "X-Requested-With": "fetch" };

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...CSRF_HEADER,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export const KanbanBoard = () => {
  const [board, setBoard] = useState<BoardData>(() => ({ ...initialData, id: "" }));
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [filteredCardIds, setFilteredCardIds] = useState<Set<string> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const { username } = useAuth();
  const renameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBoards = useCallback(async () => {
    try {
      const data = await apiFetch<{ boards: BoardSummary[] }>("/api/boards");
      setBoards(data.boards);
      return data.boards;
    } catch {
      return [];
    }
  }, []);

  const fetchBoard = useCallback(async (boardId: string | null) => {
    try {
      if (boardId) {
        const data = await apiFetch<Parameters<typeof apiToBoardData>[0]>(`/api/boards/${boardId}`);
        setBoard(apiToBoardData(data));
      } else {
        const listData = await apiFetch<{ boards: BoardSummary[] }>("/api/boards");
        if (listData.boards.length > 0) {
          const first = listData.boards[0];
          setActiveBoardId(first.id);
          const data = await apiFetch<Parameters<typeof apiToBoardData>[0]>(`/api/boards/${first.id}`);
          setBoard(apiToBoardData(data));
        }
      }
    } catch {
      // Fall back to initial data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards().then((b) => {
      if (b && b.length > 0 && !activeBoardId) {
        setActiveBoardId(b[0].id);
        fetchBoard(b[0].id);
      } else if (!b || b.length === 0) {
        setLoading(false);
      }
    });
  }, [fetchBoards, fetchBoard, activeBoardId]);

  const handleSelectBoard = useCallback(async (boardId: string) => {
    setActiveBoardId(boardId);
    setLoading(true);
    await fetchBoard(boardId);
  }, [fetchBoard]);

  const handleCreateBoard = useCallback(async (templateId: string | null = null, title: string = "New Board") => {
    try {
      const body: Record<string, unknown> = { title };
      if (templateId) body.template_id = templateId;
      const newBoard = await apiFetch<{ id: string; title: string }>("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await fetchBoards();
      if (newBoard.id) {
        setActiveBoardId(newBoard.id);
        await fetchBoard(newBoard.id);
      }
    } catch {
      setError("Failed to create board.");
    }
  }, [fetchBoards, fetchBoard]);

  const handleRenameBoard = useCallback(async (boardId: string, title: string) => {
    try {
      await apiFetch(`/api/boards/${boardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      await fetchBoards();
      if (boardId === activeBoardId) {
        setBoard((prev) => ({ ...prev, title }));
      }
    } catch {
      setError("Failed to rename board.");
    }
  }, [fetchBoards, activeBoardId]);

  const handleDeleteBoard = useCallback(async (boardId: string) => {
    try {
      await apiFetch(`/api/boards/${boardId}`, { method: "DELETE" });
      const updatedBoards = await fetchBoards();
      if (boardId === activeBoardId) {
        if (updatedBoards.length > 0) {
          setActiveBoardId(updatedBoards[0].id);
          await fetchBoard(updatedBoards[0].id);
        } else {
          setBoard({ ...initialData, id: "" });
          setActiveBoardId(null);
        }
      }
    } catch {
      setError("Failed to delete board.");
    }
  }, [fetchBoards, fetchBoard, activeBoardId]);

  const handleAddColumn = useCallback(async () => {
    if (!activeBoardId) return;
    try {
      const col = await apiFetch<{ id: string; title: string; position: number }>("/api/boards/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: activeBoardId, title: "New Column" }),
      });
      setBoard((prev) => ({
        ...prev,
        columns: [...prev.columns, { id: col.id, title: col.title, cardIds: [] }],
      }));
    } catch {
      setError("Failed to add column.");
    }
  }, [activeBoardId]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    let prevBoard = board;
    setBoard((prev) => {
      prevBoard = prev;
      return {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(
            ([id]) => !prev.columns.find((c) => c.id === columnId)?.cardIds.includes(id)
          )
        ),
        columns: prev.columns.filter((c) => c.id !== columnId),
      };
    });
    try {
      await apiFetch(`/api/boards/columns/${columnId}`, { method: "DELETE" });
    } catch {
      setBoard(prevBoard);
      setError("Failed to delete column.");
    }
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) return;

    const cardId = active.id as string;
    const overId = over.id as string;

    let prevColumns: Column[] = [];
    let targetCol: Column | undefined;
    let targetPosition: number = -1;

    setBoard((prev) => {
      prevColumns = prev.columns;
      const newColumns = moveCard(prev.columns, cardId, overId);
      targetCol = newColumns.find((col) => col.cardIds.includes(cardId));
      if (targetCol) {
        targetPosition = targetCol.cardIds.indexOf(cardId);
      }
      return { ...prev, columns: newColumns };
    });

    if (!targetCol || targetPosition === -1) return;

    try {
      await apiFetch(`/api/boards/cards/${cardId}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_id: targetCol.id, position: targetPosition }),
      });
    } catch {
      setBoard((prev) => ({ ...prev, columns: prevColumns }));
      setError("Failed to move card. Please try again.");
    }
  };

  const handleRenameColumn = useCallback((columnId: string, title: string) => {
    let prevColumns: Column[] = [];
    setBoard((prev) => {
      prevColumns = prev.columns;
      return {
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === columnId ? { ...column, title } : column
        ),
      };
    });

    if (renameTimerRef.current) clearTimeout(renameTimerRef.current);
    renameTimerRef.current = setTimeout(async () => {
      try {
        await apiFetch(`/api/boards/columns/${columnId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      } catch {
        setBoard((prev) => ({ ...prev, columns: prevColumns }));
        setError("Failed to rename column.");
      }
    }, 400);
  }, []);

  const handleAddCard = async (columnId: string, title: string, details: string) => {
    const id = createId("card");
    const cardDetails = details || "No details yet.";
    let prevBoard = board;
    setBoard((prev) => {
      prevBoard = prev;
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [id]: { id, title, details: cardDetails, priority: "none" as const, due_date: null, labels: [] },
        },
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? { ...column, cardIds: [...column.cardIds, id] }
            : column
        ),
      };
    });

    try {
      await apiFetch("/api/boards/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_id: columnId, id, title, details: cardDetails }),
      });
    } catch {
      setBoard(prevBoard);
      setError("Failed to add card.");
    }
  };

  const handleDeleteCard = async (columnId: string, cardId: string) => {
    let prevBoard = board;
    setBoard((prev) => {
      prevBoard = prev;
      return {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) }
            : column
        ),
      };
    });

    try {
      await apiFetch(`/api/boards/cards/${cardId}`, { method: "DELETE" });
    } catch {
      setBoard(prevBoard);
      setError("Failed to delete card.");
    }
  };

  const handleEditCard = useCallback(async (cardId: string, title: string, details: string, priority?: string, dueDate?: string | null, labels?: string[]) => {
    let prevBoard = board;
    setBoard((prev) => {
      prevBoard = prev;
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...prev.cards[cardId],
            title,
            details,
            ...(priority !== undefined ? { priority: priority as Card["priority"] } : {}),
            ...(dueDate !== undefined ? { due_date: dueDate } : {}),
            ...(labels !== undefined ? { labels } : {}),
          },
        },
      };
    });

    try {
      const body: Record<string, unknown> = { title, details };
      if (priority !== undefined) body.priority = priority;
      if (dueDate !== undefined) body.due_date = dueDate;
      if (labels !== undefined) body.labels = labels.join(",");
      await apiFetch(`/api/boards/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setBoard(prevBoard);
      setError("Failed to update card.");
    }
  }, [board]);

  const handleRefreshBoard = useCallback(async () => {
    if (activeBoardId) await fetchBoard(activeBoardId);
  }, [activeBoardId, fetchBoard]);

  const handleFilter = useCallback((filteredIds: Set<string>) => {
    setFilteredCardIds(filteredIds.size < Object.keys(board.cards).length ? filteredIds : null);
  }, [board.cards]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--gray-text)]">Loading board...</p>
      </div>
    );
  }

  const activeCard = activeCardId ? board.cards[activeCardId] : null;
  const editingCard = editingCardId ? board.cards[editingCardId] : null;

  const totalCards = board.columns.reduce((sum, col) => sum + col.cardIds.length, 0);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-[var(--stroke)] bg-white/80 px-6 py-5 shadow-[var(--shadow)] backdrop-blur sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-turquoise)]/10">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="4" width="16" height="13" rx="2" stroke="var(--accent-turquoise)" strokeWidth="1.5"/>
                  <path d="M2 8h16" stroke="var(--accent-turquoise)" strokeWidth="1.5"/>
                  <path d="M6 2v4M14 2v4" stroke="var(--accent-turquoise)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold text-[var(--dark-teal)]">
                  Kanban Studio
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SearchFilter columns={board.columns} cards={board.cards} onFilter={handleFilter} />
              <BoardList
                boards={boards}
                activeBoardId={activeBoardId}
                onSelect={handleSelectBoard}
                onCreate={() => setShowTemplateSelector(true)}
                onRename={handleRenameBoard}
                onDelete={handleDeleteBoard}
              />
              <button
                onClick={() => setShowCollaboration(true)}
                className="flex items-center gap-1.5 rounded-full border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:border-[var(--accent-turquoise)] hover:text-[var(--accent-turquoise)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                  <circle cx="9.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M9 12c0-1.7 1-3 2.5-3s2.5 1.3 2.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Team
              </button>
              <NotificationBell />
              <span className="hidden text-sm font-medium text-[var(--accent-turquoise)] sm:block">
                {board.columns.length} columns &middot; {totalCards} cards
              </span>
              <button
                onClick={() => setShowProfile(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-turquoise)]/10 text-xs font-bold text-[var(--accent-turquoise)] transition hover:bg-[var(--accent-turquoise)]/20"
                aria-label="User profile"
              >
                {username?.[0]?.toUpperCase() || "?"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--dark-teal)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-turquoise)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 rounded-lg p-1 transition hover:bg-red-100 hover:text-red-900" aria-label="Dismiss error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section className="grid gap-4 lg:grid-cols-5 xl:grid-cols-auto-fill" style={{ gridTemplateColumns: `repeat(${Math.max(board.columns.length, 1)}, minmax(250px, 1fr))` }}>
            {board.columns.map((column) => {
              const columnCards = column.cardIds
                .map((cardId) => board.cards[cardId])
                .filter(Boolean)
                .filter((card) => !filteredCardIds || filteredCardIds.has(card.id));
              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={columnCards}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={(_columnId, cardId) => handleDeleteCard(column.id, cardId)}
                  onEditCard={(cardId) => setEditingCardId(cardId)}
                  onDeleteColumn={() => handleDeleteColumn(column.id)}
                />
              );
            })}
            <button
              onClick={handleAddColumn}
              className="flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--stroke)] text-sm font-semibold uppercase tracking-wide text-[var(--accent-turquoise)] transition hover:border-[var(--accent-turquoise)] hover:bg-[var(--accent-turquoise)]/5"
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Add Column
              </span>
            </button>
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[220px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {editingCard && (
        <CardDetailModal
          card={editingCard}
          onSave={async (cardId, title, details, priority, dueDate, labels) => {
            await handleEditCard(cardId, title, details, priority, dueDate, labels);
          }}
          onClose={() => setEditingCardId(null)}
          boardId={activeBoardId || ""}
          currentUsername={username || ""}
        />
      )}

      <ChatSidebar onBoardUpdate={handleRefreshBoard} />
      <CollaborationPanel
        boardId={activeBoardId}
        isOpen={showCollaboration}
        onClose={() => setShowCollaboration(false)}
      />
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
      {showTemplateSelector && (
        <TemplateSelector
          onSelect={(templateId, title) => {
            setShowTemplateSelector(false);
            handleCreateBoard(templateId, title);
          }}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
};
