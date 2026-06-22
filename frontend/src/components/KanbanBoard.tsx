"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  createCard,
  deleteCard,
  fetchBoard,
  moveCard as moveCardApi,
  renameColumn,
} from "@/lib/boardApi";
import type { BoardData } from "@/lib/kanban";

type KanbanBoardProps = {
  accessToken: string;
};

const findColumnForCard = (board: BoardData, cardId: string) =>
  board.columns.find((column) => column.cardIds.includes(cardId));

export const KanbanBoard = ({ accessToken }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    let cancelled = false;

    const loadBoard = async () => {
      setIsLoading(true);
      setError("");
      try {
        const nextBoard = await fetchBoard(accessToken);
        if (!cancelled) {
          setBoard(nextBoard);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load board.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadBoard();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const cardsById = useMemo(() => board?.cards ?? {}, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!board || !over || active.id === over.id) {
      return;
    }

    const activeCardId = active.id as string;
    const overId = over.id as string;
    const targetColumn = board.columns.find((column) => column.id === overId) ??
      findColumnForCard(board, overId);
    if (!targetColumn) {
      return;
    }

    const isOverColumn = targetColumn.id === overId;
    const targetIndex = isOverColumn
      ? targetColumn.cardIds.length
      : Math.max(0, targetColumn.cardIds.indexOf(overId));

    setIsSaving(true);
    setError("");
    void moveCardApi(activeCardId, targetColumn.id, targetIndex, accessToken)
      .then((nextBoard) => {
        setBoard(nextBoard);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to move card.");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleRenameColumn = async (columnId: string, title: string) => {
    if (!board) {
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const nextBoard = await renameColumn(columnId, title, accessToken);
      setBoard(nextBoard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to rename column.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCard = async (columnId: string, title: string, details: string) => {
    setIsSaving(true);
    setError("");
    try {
      const nextBoard = await createCard(columnId, title, details, accessToken);
      setBoard(nextBoard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add card.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    setIsSaving(true);
    setError("");
    try {
      const nextBoard = await deleteCard(cardId, accessToken);
      setBoard(nextBoard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove card.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] items-center px-6">
        <p className="text-sm text-[var(--gray-text)]">Loading board...</p>
      </main>
    );
  }

  if (!board) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[640px] items-center px-6">
        <section className="w-full rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]">
          <h2 className="font-display text-2xl font-semibold text-[var(--navy-dark)]">
            Could not load your board
          </h2>
          <p className="mt-3 text-sm text-[var(--gray-text)]">
            {error || "Please refresh and try again."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
              {error ? (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                Focus
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                One board. Five columns. Zero clutter.
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gray-text)]">
                {isSaving ? "Saving..." : "Synced"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section className="grid gap-6 lg:grid-cols-5">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={column.cardIds.map((cardId) => board.cards[cardId])}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
