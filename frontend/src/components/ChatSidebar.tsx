"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  boardUpdated?: boolean;
};

type ChatSidebarProps = {
  onBoardUpdate?: () => void;
};

export const ChatSidebar = ({ onBoardUpdate }: ChatSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    const userMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: text }]);
    setSending(true);

    try {
      const data = await apiFetch<{ message: string; board_updated: boolean }>("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: data.message,
          boardUpdated: data.board_updated,
        },
      ]);

      if (data.board_updated && onBoardUpdate) {
        onBoardUpdate();
      }
    } catch {
      const errMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: errMsgId, role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-6 bottom-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#00CCA2] text-white shadow-lg transition hover:brightness-110"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M17 10H3M3 10l5-5M3 10l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Sidebar panel */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-96 flex-col border-l border-[var(--stroke)] bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--stroke)] px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-[var(--dark-teal)]">AI Assistant</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 text-[var(--gray-text)] transition hover:text-[var(--dark-teal)]"
            aria-label="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-[var(--gray-text)]">
              Ask me to add cards, move tasks, or reorganize your board.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`break-words overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "ml-8 bg-[#00CCA2]/10 text-[var(--dark-teal)]"
                  : "mr-8 bg-[var(--surface)] text-[var(--dark-teal)]"
              }`}
            >
              {msg.boardUpdated && (
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#00CCA2]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 4" stroke="#00CCA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Board updated
                </div>
              )}
              {msg.content}
            </div>
          ))}
          {sending && (
            <div className="mr-8 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--gray-text)]">
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-[var(--stroke)] px-5 py-4">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI..."
              aria-label="Chat message"
              className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm text-[var(--dark-teal)] outline-none transition focus:border-[#00CCA2]"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-full bg-[#00CCA2] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </form>
      </aside>
    </>
  );
};
