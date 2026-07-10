"use client";

import { useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AIAssistantSidebarProps = {
  username: string;
  onBoardUpdated?: (board: { columns: Array<{ id: string; title: string; cardIds: string[] }>; cards: Record<string, { id: string; title: string; details: string }> }) => void;
};

export const AIAssistantSidebar = ({ username, onBoardUpdated }: AIAssistantSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ask me to update the board, create tasks, or summarize the workflow.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setIsSending(true);

    try {
      const response = await fetch(`/api/ai/board-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          question: trimmed,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed");
      }

      const payload = await response.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: payload.reply || "I couldn't process that request.",
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (payload.applied && payload.board) {
        onBoardUpdated?.(payload.board);
      }
    } catch {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I couldn't reach the assistant right now. Please try again in a moment.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside className="flex h-[560px] flex-col rounded-[28px] border border-[var(--stroke)] bg-white/90 p-5 shadow-[var(--shadow)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]">
            AI assistant
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[var(--navy-dark)]">
            Ask the board
          </h2>
        </div>
        <div className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-blue)]">
          Live
        </div>
      </div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === "assistant" ? "bg-white text-[var(--navy-dark)]" : "bg-[var(--purple-secondary)]/10 text-[var(--navy-dark)]"}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
              {message.role === "assistant" ? "Assistant" : "You"}
            </p>
            <p className="mt-1">{message.content}</p>
          </div>
        ))}
        {isSending ? <p className="text-sm text-[var(--gray-text)]">Thinking…</p> : null}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask the AI assistant"
          rows={3}
          className="w-full resize-none rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--navy-dark)] outline-none"
        />
        <button
          type="submit"
          disabled={isSending}
          className="w-full rounded-2xl bg-[var(--purple-secondary)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </aside>
  );
};
