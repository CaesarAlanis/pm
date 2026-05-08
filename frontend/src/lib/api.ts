import type { BoardData } from "./kanban";

export type BoardResponse = {
  user: string;
  board: BoardData;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  message: string;
  boardUpdate: BoardData | null;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const errorMessageFrom = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : fallback;
  } catch {
    return fallback;
  }
};

export const fetchBoard = async (username: string): Promise<BoardData> => {
  const response = await fetch(`${apiBase}/board/${encodeURIComponent(username)}`);
  if (!response.ok) {
    throw new Error("Unable to load board");
  }
  const data = (await response.json()) as BoardResponse;
  return data.board;
};

export const saveBoard = async (username: string, board: BoardData): Promise<void> => {
  const response = await fetch(`${apiBase}/board/${encodeURIComponent(username)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ board }),
  });
  if (!response.ok) {
    throw new Error("Unable to save board");
  }
};

export const sendChatMessage = async (
  board: BoardData,
  conversation: ChatMessage[],
  message: string
): Promise<ChatResponse> => {
  const response = await fetch(`${apiBase}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board,
      conversation,
      message,
    }),
  });
  if (!response.ok) {
    const message = await errorMessageFrom(response, "Unable to send chat message");
    throw new Error(message);
  }
  return (await response.json()) as ChatResponse;
};
