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
import { LayoutDashboard, User, Sparkles, Send } from "lucide-react";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";
import { fetchBoard, saveBoard, sendChatMessage, type ChatMessage } from "@/lib/api";

const COLUMN_ACCENTS = ["#209dd7", "#ecad0a", "#753991", "#0d9488", "#e06c54"];

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsById = useMemo(() => (board ? board.cards : {}), [board]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    let mounted = true;
    const loadBoard = async () => {
      try {
        const fetchedBoard = await fetchBoard(username);
        const nextBoard = fetchedBoard.columns.length > 0 ? fetchedBoard : initialData;
        if (fetchedBoard.columns.length === 0) {
          await saveBoard(username, nextBoard);
        }
        if (mounted) setBoard(nextBoard);
      } catch (error) {
        console.error(error);
        if (mounted) {
          setError("Unable to load your board. Using default data.");
          setBoard(initialData);
        }
      } finally {
        if (mounted) setLoading(false);
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

  const updateBoard = (
    updater: (prev: BoardData) => BoardData,
    { debounce = false }: { debounce?: boolean } = {}
  ) => {
    setBoard((prev) => {
      if (!prev) return prev;
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
    if (!over || active.id === over.id) return;
    updateBoard((prev) => ({
      ...prev,
      columns: moveCard(prev.columns, active.id as string, over.id as string),
    }));
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    updateBoard(
      (prev) => ({
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, title } : col
        ),
      }),
      { debounce: true }
    );
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    updateBoard((prev) => ({
      ...prev,
      cards: { ...prev.cards, [id]: { id, title, details } },
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, cardIds: [...col.cardIds, id] } : col
      ),
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    updateBoard((prev) => ({
      ...prev,
      cards: Object.fromEntries(
        Object.entries(prev.cards).filter(([id]) => id !== cardId)
      ),
      columns: prev.columns.map((col) =>
        col.id === columnId
          ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
          : col
      ),
    }));
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  const handleChatSubmit = async () => {
    if (!board || chatLoading) return;
    const nextMessage = chatInput.trim();
    if (!nextMessage) return;

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
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.message, id: createId("msg") },
      ]);
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
        <div className="rounded-3xl border border-[var(--stroke)] bg-white p-10 text-center shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-[var(--navy-dark)]">Loading your board…</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
        <div className="rounded-3xl border border-[var(--stroke)] bg-white p-10 text-center shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-[var(--navy-dark)]">Unable to load the board.</p>
        </div>
      </div>
    );
  }

  const totalCards = Object.keys(board.cards).length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--surface)]">
      <div className="pointer-events-none fixed left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.18)_0%,_rgba(32,157,215,0.04)_55%,_transparent_70%)]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.12)_0%,_rgba(117,57,145,0.04)_55%,_transparent_75%)]" />

      <header className="relative z-10 shrink-0 border-b border-[var(--stroke)] bg-white/80 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--navy-dark)]">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]">
                Workspace
              </p>
              <h1 className="font-display text-base font-semibold leading-tight text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {error && (
              <span className="rounded-full border border-[var(--secondary-purple)] px-3 py-1 text-xs font-semibold text-[var(--secondary-purple)]">
                {error}
              </span>
            )}
            <div className="text-xs text-[var(--gray-text)]">
              <span className="font-semibold text-[var(--navy-dark)]">{totalCards}</span>
              {" "}card{totalCards !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--stroke)] bg-[var(--surface)] px-3 py-1.5">
              <User size={12} className="text-[var(--gray-text)]" />
              <span className="text-xs font-semibold text-[var(--navy-dark)]">{username}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-[1500px] gap-5 px-6 py-5">

          <div className="min-h-0 min-w-0 flex-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex h-full gap-4 overflow-x-auto pb-1">
                {board.columns.map((column, index) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    cards={column.cardIds.map((id) => board.cards[id]).filter(Boolean)}
                    colorAccent={COLUMN_ACCENTS[index % COLUMN_ACCENTS.length]}
                    onRename={handleRenameColumn}
                    onAddCard={handleAddCard}
                    onDeleteCard={handleDeleteCard}
                  />
                ))}
              </div>
              <DragOverlay adjustScale={false} className={undefined} style={undefined} transition={undefined}>
                {activeCard ? (
                  <div className="w-[200px]">
                    <KanbanCardPreview card={activeCard} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          <aside className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--stroke)] bg-white/90 shadow-[var(--shadow)] backdrop-blur">
            <div className="shrink-0 flex items-center gap-3 border-b border-[var(--stroke)] px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary-purple)]">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  AI Assistant
                </p>
                <h2 className="font-display text-sm font-semibold leading-tight text-[var(--navy-dark)]">
                  Board Copilot
                </h2>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              {chatMessages.length === 0 && (
                <p className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3 text-xs text-[var(--gray-text)]">
                  Ask for card edits or moves, for example: move all review tasks to done.
                </p>
              )}
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "max-w-[85%] self-end rounded-2xl bg-[var(--primary-blue)] px-3 py-2 text-xs text-white"
                      : "max-w-[85%] self-start rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--navy-dark)]"
                  }
                >
                  {message.content}
                </div>
              ))}
              {chatLoading && (
                <div className="self-start rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2.5">
                  <div className="flex gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)]"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)]"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)]"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {chatError && (
              <p className="mx-4 mb-2 shrink-0 rounded-xl bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--secondary-purple)]">
                {chatError}
              </p>
            )}

            <div className="shrink-0 flex gap-2 border-t border-[var(--stroke)] p-3">
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
                className="min-w-0 flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-xs outline-none transition focus:border-[var(--primary-blue)]"
              />
              <button
                type="button"
                onClick={() => void handleChatSubmit()}
                disabled={chatLoading}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary-purple)] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Send size={14} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
