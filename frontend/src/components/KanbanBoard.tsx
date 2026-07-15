"use client";

import { useState } from "react";
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
import { ChatPanel } from "@/components/ChatPanel";
import { LogOutIcon } from "@/components/icons";
import {
  addCard,
  initialData,
  moveCard,
  removeCard,
  renameColumn,
  type BoardData,
} from "@/lib/kanban";

export const KanbanBoard = () => {
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = board.cards;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setBoard((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) => ({
      ...prev,
      columns: renameColumn(prev.columns, columnId, title),
    }));
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    setBoard((prev) => addCard(prev, columnId, title, details));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    setBoard((prev) => removeCard(prev, columnId, cardId));
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  const handleSignIn = (event: React.FormEvent) => {
    event.preventDefault();
    if (username === "user" && password === "password") {
      setIsSignedIn(true);
      setLoginError("");
      return;
    }
    setLoginError("Use user / password to continue.");
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setUsername("");
    setPassword("");
    setLoginError("");
  };

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6 py-12">
        <form
          onSubmit={handleSignIn}
          className="w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
            Sign in
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--navy-dark)]">
            Welcome back
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
            Use the demo credentials to view the board.
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-[var(--navy-dark)]">
              Username
              <input
                aria-label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--stroke)] px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--navy-dark)]">
              Password
              <input
                aria-label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--stroke)] px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>
          {loginError ? (
            <p className="mt-4 text-sm text-red-600">{loginError}</p>
          ) : null}
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1920px] flex-col gap-8 px-6 pb-16 pt-12">
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
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  Focus
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                  One board. Five columns. Zero clutter.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
              >
                <LogOutIcon className="h-4 w-4" />
                Log out
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

        <div className="flex flex-1 flex-col gap-6 xl:flex-row xl:items-start">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section className="flex min-w-0 flex-1 gap-5 overflow-x-auto pb-2">
              {board.columns.map((column) => (
                <div key={column.id} className="w-[280px] shrink-0 grow">
                  <KanbanColumn
                    column={column}
                    cards={column.cardIds.map((cardId) => board.cards[cardId])}
                    onRename={handleRenameColumn}
                    onAddCard={handleAddCard}
                    onDeleteCard={handleDeleteCard}
                  />
                </div>
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
          <div className="xl:sticky xl:top-6 xl:w-[360px] xl:shrink-0">
            <ChatPanel board={board} onBoardUpdate={setBoard} />
          </div>
        </div>
      </main>
    </div>
  );
};
