"use client";

import { useState } from "react";
import { SendIcon, SparkleIcon } from "@/components/icons";
import type { BoardData } from "@/lib/kanban";

type ChatPanelProps = {
  board: BoardData;
  onBoardUpdate?: (updatedBoard: BoardData) => void;
};

export const ChatPanel = ({ board, onBoardUpdate }: ChatPanelProps) => {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("Ask for a simple change to the board.");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    setLoading(true);
    setReply("Thinking...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, board }),
      });
      const data = await response.json();
      setReply(data.reply || "No reply received.");
      if (data.updated_board && onBoardUpdate) {
        onBoardUpdate(data.updated_board);
      }
    } catch {
      setReply("Chat service is unavailable right now.");
    } finally {
      setLoading(false);
      setMessage("");
    }
  };

  return (
    <aside className="flex h-full flex-col rounded-[24px] border border-[var(--stroke)] bg-white/80 p-6 shadow-[var(--shadow)] backdrop-blur">
      <div className="flex items-center gap-2">
        <SparkleIcon className="h-5 w-5 text-[var(--secondary-purple)]" />
        <h2 className="text-lg font-semibold text-[var(--navy-dark)]">Simple AI chat</h2>
      </div>
      <p className="mt-2 text-sm text-[var(--gray-text)]">
        Send a short request and the backend will respond with a simple reply.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Try: add a card for review"
          className="min-h-[96px] w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm outline-none ring-0"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          <SendIcon className="h-4 w-4" />
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4 text-sm text-[var(--navy-dark)]">
        {reply}
      </div>
    </aside>
  );
};
