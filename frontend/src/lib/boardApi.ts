import { getStoredToken } from "@/lib/auth";
import type { BoardData } from "@/lib/kanban";

type JsonLike = Record<string, unknown>;

const parseErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as JsonLike;
    if (typeof body.detail === "string" && body.detail.length > 0) {
      return body.detail;
    }
  } catch {
    // Ignore parse failures and use a generic fallback message.
  }
  return `Request failed with status ${response.status}`;
};

const authHeaders = (token: string, initHeaders?: HeadersInit) => {
  const headers = new Headers(initHeaders ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  return headers;
};

const resolveToken = (token?: string) => {
  const resolved = token ?? getStoredToken();
  if (!resolved) {
    throw new Error("You are not authenticated. Please sign in again.");
  }
  return resolved;
};

const requestBoard = async (
  path: string,
  init: RequestInit,
  token?: string
): Promise<BoardData> => {
  const authToken = resolveToken(token);
  const response = await fetch(path, {
    ...init,
    headers: authHeaders(authToken, init.headers),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as BoardData;
};

export const fetchBoard = (token?: string) =>
  requestBoard("/api/board", { method: "GET" }, token);

export const renameColumn = (columnId: string, title: string, token?: string) =>
  requestBoard(
    "/api/board/columns/rename",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: columnId, title }),
    },
    token
  );

export const createCard = (
  columnId: string,
  title: string,
  details: string,
  token?: string
) =>
  requestBoard(
    "/api/board/cards",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ column_id: columnId, title, details }),
    },
    token
  );

export const deleteCard = (cardId: string, token?: string) =>
  requestBoard(
    "/api/board/cards",
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId }),
    },
    token
  );

export const moveCard = (
  cardId: string,
  targetColumnId: string,
  targetIndex: number,
  token?: string
) =>
  requestBoard(
    "/api/board/cards/move",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: cardId,
        target_column_id: targetColumnId,
        target_index: targetIndex,
      }),
    },
    token
  );
