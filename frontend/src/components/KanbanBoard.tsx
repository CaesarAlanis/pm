"use client";

import { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { LoginForm } from "@/components/LoginForm";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";

const customCollisionDetection: CollisionDetection = (args) => {
  // First priority: pointerWithin for empty containers or exact pointer drops
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // Second priority: rectIntersection for container bounds
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) {
    return rectCollisions;
  }

  // Fallback to closestCorners
  return closestCorners(args);
};

export const KanbanBoard = () => {
  const [user, setUser] = useState<string | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("pm_user");
    if (savedUser) {
      setUser(savedUser);
    }
    setIsAuthLoaded(true);

    // Fetch initial board state from backend
    fetch("/api/board")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch board");
      })
      .then((data: BoardData) => {
        if (data && data.columns && data.cards) {
          setBoard(data);
        }
      })
      .catch((err) => {
        console.warn("Using fallback local initialData:", err);
      });
  }, []);

  const syncBoardToBackend = (nextBoard: BoardData) => {
    fetch("/api/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextBoard),
    }).catch((err) => {
      console.error("Error syncing board to backend:", err);
    });
  };

  const handleLoginSuccess = (username: string) => {
    localStorage.setItem("pm_user", username);
    setUser(username);
  };

  const handleLogout = () => {
    fetch("/api/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("pm_user");
    setUser(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setBoard((prev) => {
      const nextColumns = moveCard(prev.columns, active.id as string, over.id as string);
      const nextBoard = { ...prev, columns: nextColumns };
      syncBoardToBackend(nextBoard);
      return nextBoard;
    });
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) => {
      const nextBoard = {
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === columnId ? { ...column, title } : column
        ),
      };
      syncBoardToBackend(nextBoard);
      return nextBoard;
    });
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    setBoard((prev) => {
      const nextBoard = {
        ...prev,
        cards: {
          ...prev.cards,
          [id]: { id, title, details: details || "No details yet." },
        },
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? { ...column, cardIds: [...column.cardIds, id] }
            : column
        ),
      };
      syncBoardToBackend(nextBoard);
      return nextBoard;
    });
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    setBoard((prev) => {
      const nextBoard = {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== cardId),
              }
            : column
        ),
      };
      syncBoardToBackend(nextBoard);
      return nextBoard;
    });
  };

  const handleAIBoardUpdate = (newBoard: BoardData) => {
    setBoard(newBoard);
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (!isAuthLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--navy-dark)]">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--gray-text)]">
          Loading...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-8 px-6 pb-16 pt-10">
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
                and leverage the embedded AI Assistant to automate board updates.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-3.5 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                    Signed in as
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold text-[var(--primary-blue)]">
                    {user}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-2xl bg-[#753991] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#032147] hover:shadow-lg active:scale-95 cursor-pointer"
                aria-label="Logout"
              >
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-white font-bold">Logout</span>
              </button>
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
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-6 lg:flex-row items-start">
            <section className="grid flex-1 gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 w-full">
              {board.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds
                    .map((cardId) => cardsById[cardId])
                    .filter((card): card is NonNullable<typeof card> => Boolean(card))}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </section>

            <AIChatSidebar
              onBoardUpdate={handleAIBoardUpdate}
            />
          </div>

          <DragOverlay>
            {activeCard ? <KanbanCardPreview card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
