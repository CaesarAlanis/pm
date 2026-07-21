"use client";

import { useState } from "react";
import { type BoardData } from "@/lib/kanban";

type Message = {
  id: string;
  sender: "user" | "ai";
  text: string;
};

type AIChatSidebarProps = {
  onBoardUpdate: (newBoard: BoardData) => void;
};

export const AIChatSidebar = ({ onBoardUpdate }: AIChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      sender: "ai",
      text: "Hello! I am your AI Project Manager. Ask me to add, edit, move, or delete cards on your Kanban board.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userMessageText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageText,
          chat_history: historyPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: data.response_text || "Action completed.",
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (data.board && data.board.columns && data.board.cards) {
          onBoardUpdate({
            columns: data.board.columns,
            cards: data.board.cards,
          });
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            sender: "ai",
            text: "Sorry, I could not process that request.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "Connection error. Make sure the backend server is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-[var(--purple-secondary)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-xl hover:opacity-90"
      >
        Open AI Assistant
      </button>
    );
  }

  return (
    <aside className="flex h-[calc(100vh-160px)] w-full flex-col rounded-3xl border border-[var(--stroke)] bg-white/95 p-6 shadow-xl backdrop-blur lg:w-[380px]">
      <div className="flex items-center justify-between border-b border-[var(--stroke)] pb-4">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full bg-[var(--accent-yellow)]" />
          <h3 className="font-display text-lg font-bold text-[var(--navy-dark)]">
            AI Assistant
          </h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1 text-xs font-semibold uppercase text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
        >
          Hide
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-text)] mb-1">
              {msg.sender === "user" ? "You" : "AI Manager"}
            </span>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[var(--primary-blue)] text-white"
                  : "bg-[var(--surface)] border border-[var(--stroke)] text-[var(--navy-dark)]"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-text)] mb-1">
              AI Manager
            </span>
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-xs font-medium text-[var(--gray-text)]">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-2 flex gap-2 border-t border-[var(--stroke)] pt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI to move or add cards..."
          className="flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-2.5 text-xs text-[var(--navy-dark)] placeholder-[var(--gray-text)] focus:border-[var(--primary-blue)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-[var(--purple-secondary)] px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  );
};
