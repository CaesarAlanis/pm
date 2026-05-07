"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";
import { fetchBoard, saveBoard, sendChatMessage, type ChatMessage } from "@/lib/api";

type LocalChatMessage = ChatMessage & { id: string };

type KanbanBoardProps = {
  username: string;
};

export const KanbanBoard = ({ username }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<LocalChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardsById = useMemo(() => (board ? board.cards : {}), [board]);

  useEffect(() => {
    let mounted = true;

    const loadBoard = async () => {
      try {
        const fetchedBoard = await fetchBoard(username);
        const nextBoard = fetchedBoard.columns.length > 0 ? fetchedBoard : initialData;
        if (fetchedBoard.columns.length === 0) {
          await saveBoard(username, nextBoard);
        }
        if (mounted) {
          setBoard(nextBoard);
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setError("Unable to load your board. Using default data.");
          setBoard(initialData);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBoard();

    return () => {
      mounted = false;
    };
  }, [username]);

  const saveCurrentBoard = async (nextBoard: BoardData) => {
    try {
      await saveBoard(username, nextBoard);
    } catch (error) {
      console.error(error);
    }
  };

  const updateBoard = (updater: (prev: BoardData) => BoardData, { debounce = false }: { debounce?: boolean } = {}) => {
    setBoard((prev) => {
      if (!prev) {
        return prev;
      }
      const nextBoard = updater(prev);
      if (debounce) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => void saveCurrentBoard(nextBoard), 400);
      } else {
        void saveCurrentBoard(nextBoard);
      }
      return nextBoard;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    updateBoard((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    updateBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }), { debounce: true });
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, details },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    updateBoard((prev) => ({
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
    }));
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  const handleChatSubmit = async () => {
    if (!board || chatLoading) {
      return;
    }
    const nextMessage = chatInput.trim();
    if (!nextMessage) {
      return;
    }

    const nextConversation: LocalChatMessage[] = [
      ...chatMessages,
      { role: "user" as const, content: nextMessage, id: createId("msg") },
    ];
    setChatMessages(nextConversation);
    setChatInput("");
    setChatError(null);
    setChatLoading(true);

    try {
      const response = await sendChatMessage(board, chatMessages, nextMessage);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response.message, id: createId("msg") }]);
      if (response.boardUpdate) {
        setBoard(response.boardUpdate);
        await saveCurrentBoard(response.boardUpdate);
      }
    } catch (chatRequestError) {
      console.error(chatRequestError);
      setChatError(
        chatRequestError instanceof Error
          ? chatRequestError.message
          : "AI is unavailable right now. Try again."
      );
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6 py-12">
        <div className="rounded-3xl border border-[var(--stroke)] bg-white p-10 text-center shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-[var(--navy-dark)]">Loading your board…</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6 py-12">
        <div className="rounded-3xl border border-[var(--stroke)] bg-white p-10 text-center shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-[var(--navy-dark)]">Unable to load the board.</p>
        </div>
      </div>
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
            </div>
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                Focus
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                One board. Five columns. Zero clutter.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {error ? (
              <div className="rounded-2xl border border-[var(--secondary-purple)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--secondary-purple)]">
                {error}
              </div>
            ) : null}
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

        <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
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
                  cards={column.cardIds.map((cardId) => board.cards[cardId]).filter(Boolean)}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </section>
            <DragOverlay
              adjustScale={false}
              className={undefined}
              style={undefined}
              transition={undefined}
            >
              {activeCard ? (
                <div className="w-[260px]">
                  <KanbanCardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <aside className="flex h-fit max-h-[80vh] flex-col rounded-[28px] border border-[var(--stroke)] bg-white/90 p-5 shadow-[var(--shadow)] backdrop-blur">
            <div className="border-b border-[var(--stroke)] pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                AI Assistant
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--navy-dark)]">
                Board Copilot
              </h2>
            </div>

            <div className="mt-4 flex min-h-[240px] flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <p className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3 text-sm text-[var(--gray-text)]">
                  Ask for card edits or moves, for example: move all review tasks to done.
                </p>
              ) : null}
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "self-end rounded-2xl bg-[var(--primary-blue)] px-4 py-3 text-sm text-white"
                      : "self-start rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)]"
                  }
                >
                  {message.content}
                </div>
              ))}
              {chatLoading ? (
                <p className="self-start rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm italic text-[var(--gray-text)]">
                  Thinking...
                </p>
              ) : null}
            </div>

            {chatError ? (
              <p className="mt-3 rounded-xl bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--secondary-purple)]">
                {chatError}
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleChatSubmit();
                  }
                }}
                placeholder="Tell the AI what to change"
                className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--primary-blue)]"
              />
              <button
                type="button"
                onClick={() => void handleChatSubmit()}
                disabled={chatLoading}
                className="rounded-xl bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {chatLoading ? "..." : "Send"}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
